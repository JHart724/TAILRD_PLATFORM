# AUDIT-016 — PHI Key Rotation Design

**Status:** DESIGN PHASE COMPLETE — implementation pending in 3 follow-up PRs
**Authored:** 2026-05-07
**Catalyst:** AUDIT-016 (HIGH P1) — see `docs/audit/AUDIT_FINDINGS_REGISTER.md`
**Methodology:** §17 (clinical-code PR acceptance) — design-phase-only fix per §17.3 scope discipline; full implementation = 24-40h multi-session arc

---

## 1. Summary

PHI encryption at TAILRD currently uses a single env-var-resident AES-256-GCM key with no version tag in ciphertext. Rotating that key today would render all existing ciphertext undecryptable. This document specifies the architectural pattern that enables rotation: ciphertext envelope versioning, KMS-backed envelope encryption (wiring the existing fully-implemented `kmsService.ts`), and an access-fallback + background-job migration plan.

**Chosen architecture: Option B — KMS envelope encryption** (operator decision 2026-05-07).

**Layered rotation cadence:**
- **AWS-layer KEK (key-encryption-key):** 365-day rotation, AWS-managed via CloudFormation (already configured)
- **App-layer DEK (data-encryption-key) discipline:** 180-day cadence per NIST SP 800-57 cryptoperiod guidance

**Migration approach:** background re-encryption job + access-fallback for legacy untagged ciphertext; 30-day target completion window post-deploy.

---

## 2. HIPAA §164.312(a)(2)(iv) compliance mapping

HIPAA Security Rule §164.312(a)(2)(iv) — Encryption and Decryption — is an **addressable** implementation specification. Covered entities must "implement a mechanism to encrypt and decrypt electronic protected health information" or document why an alternative is reasonable and appropriate.

This design satisfies §164.312(a)(2)(iv) by:

| Requirement | Satisfied by |
|---|---|
| Mechanism to encrypt PHI | AES-256-GCM via envelope encryption (NIST FIPS 197 + 800-38D approved) |
| Mechanism to decrypt PHI | KMS-managed DEK unwrapping + local AES-256-GCM decrypt |
| Key management discipline | KMS HSM-backed KEK + DEK lifecycle; least-privilege IAM; EncryptionContext audit trail |
| Periodic key rotation | 365-day KEK rotation (AWS) + 180-day DEK rotation discipline (app-layer) |
| Audit trail | KMS API calls logged per CloudTrail; EncryptionContext narrows access scope |

§164.312(a)(2)(iv) does not mandate a specific cadence; the 180-day app-layer + 365-day AWS-layer pattern aligns with NIST SP 800-57 Part 1 Rev 5 cryptoperiod guidance for high-volume PHI handling.

---

## 3. §17.1 consumer audit — framing correction

The original AUDIT-016 register entry described `kmsService.ts` as "scaffolded but unwired." A §17.1 consumer audit during this design phase corrected the framing:

- **Original framing:** kmsService scaffolded; full KMS service implementation required → estimated 28-40h
- **Audit finding:** kmsService is fully implemented (305 LOC) with AWS KMS client integration, full envelope encryption, EncryptionContext, GenerateDataKey + Decrypt + DescribeKey + local-fallback. **Zero callers in `backend/src/`** — implementation exists but is not wired into the phiEncryption middleware.
- **Reframed scope:** the work is L3 wiring (middleware → kmsService) + L4 envelope format with version tag + migration handler → estimated 14-22h

This is the second §17.1-architectural-precedent finding (sister to AUDIT-067/068 ABI consumer audit, PR #249). The pattern: a register entry's "scaffolded / unwired / pending" framing rests on assumptions about consumer state that consumer audit invalidates. §17.1 mandates consumer audit before scope estimation.

---

## 4. Layered architecture

```
+---------------------------------------------------------------------------+
| L1: AWS KMS Key Management (already configured per CloudFormation)        |
|   - alias/tailrd-production-phi (customer-managed key)                    |
|   - 365-day automatic rotation (AWS-managed)                              |
|   - Customer-managed key supports manual rotation if needed               |
+---------------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------------+
| L2: kmsService.ts (305 LOC, fully implemented)                            |
|   - envelopeEncrypt(): GenerateDataKey + local AES-256-GCM with DEK       |
|   - envelopeDecrypt(): Decrypt encrypted DEK via KMS + local AES-256-GCM  |
|   - kmsEncrypt/kmsDecrypt: direct KMS for ≤4KB values                     |
|   - getKeyInfo(): DescribeKey for admin dashboard                         |
|   - EncryptionContext: { service: 'tailrd-backend', purpose: 'phi-...' }  |
|   - Local-fallback in dev/demo mode                                       |
|   STATUS: implemented; ZERO callers in src/                               |
+---------------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------------+
| L3: phiEncryption middleware → kmsService wiring (TO BE BUILT)            |
|   - Current state: phiEncryption uses process.env.PHI_ENCRYPTION_KEY      |
|     directly with single-key AES-256-GCM                                  |
|   - Target state: phiEncryption calls kmsService.envelopeEncrypt for new  |
|     writes; kmsService.envelopeDecrypt for new reads                      |
|   - Backward compat: legacy enc:iv:authTag:ciphertext (no DEK envelope,   |
|     no version tag) supported via decryption fallback                     |
+---------------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------------+
| L4: Ciphertext envelope format (TO BE BUILT)                              |
|   - V0 (legacy, today's production): enc:<iv>:<authTag>:<ciphertext>      |
|   - V1 (post-rotation): enc:v1:<wrapped-DEK>:<iv>:<authTag>:<ciphertext>  |
|   - Decryption path tries V1 (parse v<N> tag) → V0 (legacy fallback)      |
|   - Encryption path always emits V1 for new writes                        |
+---------------------------------------------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------------+
| Migration: background job + access-fallback                               |
|   - On read: V0 detected → log, decrypt as legacy, optionally re-write    |
|     as V1 (off by default; toggle via PHI_REENCRYPT_ON_READ env var)      |
|   - Background job: scan PHI_FIELD_MAP + PHI_JSON_FIELDS tables in        |
|     batches; re-encrypt V0 → V1; idempotent via enc-version detection;    |
|     bounded migration window (target 30 days post-deploy)                 |
|   - Completion criteria: zero V0 ciphertext detected by audit query for   |
|     7 consecutive days                                                    |
+---------------------------------------------------------------------------+
```

---

## 5. Ciphertext envelope format

> **2026-05-07 inline revision** — original design collapsed V1 + KMS into a single "v1" envelope carrying a placeholder wrappedDEK during PR 1 + a real KMS-wrapped DEK in PR 2. §17.1 consumer audit during PR 1 implementation flagged signal-shape-honesty problem (a `wrappedDEK` field not actually wrapping anything is signal-shape-lying). Revised to V0/V1/V2 explicit split. See §11 cross-references for the fifth §17.1 architectural-precedent acknowledgment.

### V0 (legacy — current production, decrypt-only)

```
enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>
```

- 4 colon-delimited segments
- All current PHI rows in production use this format
- Single key sourced from `process.env.PHI_ENCRYPTION_KEY`
- No version tag; no wrapped DEK
- **PR 1**: detected on read; decrypted via legacy single-key path
- **PR 3**: migrated to V2 by background job

### V1 (single-key versioned — AUDIT-016 PR 1 emission)

```
enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
```

- 5 colon-delimited segments (`enc` + `v1` + iv + authTag + ciphertext)
- Single key sourced from `process.env.PHI_ENCRYPTION_KEY` (same as V0)
- No wrapped DEK (placeholder is the same env-var key — version tag IS the only signal)
- Emitted by `keyRotation.encryptWithCurrent` for all new writes after PR 1 deploy
- **PR 1**: emitted + decrypted; production write path
- **PR 3**: migrated to V2 by background job (same handler as V0 → V2)

### V2 (KMS-wrapped DEK — AUDIT-016 PR 2 emission)

```
enc:v2:<wrappedDEK-base64>:<iv-base64>:<authTag-base64>:<ciphertext-base64>
```

- 6 colon-delimited segments (includes `v2` version marker + wrappedDEK)
- DEK is generated per encrypt call via KMS `GenerateDataKey`
- DEK is encrypted-at-rest via KMS (the `wrappedDEK` segment)
- Plaintext DEK is short-lived (single encrypt operation) and never persisted
- Decryption requires KMS `Decrypt` call to unwrap DEK + local AES-256-GCM
- **PR 1**: schema reserved + parser routes; decrypt throws `DesignPhaseStubError`
- **PR 2**: emission + decryption wired to kmsService; production write path swaps from V1 to V2

### Production data flow (V0 → V1 → V2)

```
[Today's production]                    (V0 only)
       ↓ AUDIT-016 PR 1 deploys
[Mixed: V0 read + V1 write]             (V0 legacy + V1 new writes)
       ↓ AUDIT-016 PR 2 deploys
[Mixed: V0 + V1 read + V2 write]        (V0 + V1 legacy + V2 new writes)
       ↓ AUDIT-016 PR 3 background job
[V2 only after migration window]        (V0 + V1 → V2; 30-day target)
```

Each stage is observable: a `LIKE 'enc:v%'` SQL filter or `grep -c 'enc:v1:' / 'enc:v2:'` audit gives operator a real-time migration progress view. The original collapsed-V1 schema would have hidden whether ciphertext is "V1 placeholder" or "V1 KMS-wrapped" behind the same prefix.

### Future versions

Reserved version slots:
- `v3`: per-tenant DEK wrapping (multi-tenant isolation; future v2.0 PATH_TO_ROBUST scope)
- `v4`: post-quantum hybrid (per NIST PQC migration; ~2030 horizon)

---

## 6. Rotation cadence (layered)

### AWS layer — KEK rotation (365-day, AWS-managed)

- AWS KMS automatic key rotation enabled via CloudFormation
- KEK rotation is transparent to app code: AWS internally re-wraps DEKs to use the new KEK material
- App layer never sees KEK rotation; envelope format unchanged
- Compliance: HIPAA addressable spec floor; CloudFormation default

### App layer — DEK rotation discipline (180-day)

- DEKs are short-lived per encrypt operation (Option B envelope encryption pattern)
- "Rotation cadence" at the app layer refers to the operational discipline of:
  - Re-running migration job to refresh wrapped DEKs (180-day cadence)
  - Auditing: percentage of ciphertext with wrappedDEK older than 180 days
  - Triggering background re-encryption when threshold exceeded
- Rationale: NIST SP 800-57 Part 1 Rev 5 cryptoperiod for high-volume bulk-data encryption keys
- Operational implementation: scheduled Fargate task or lambda; runs every 30 days; flags + re-encrypts records with DEKs aged > 180 days

### Why two layers

- KEK at 365-day matches AWS default + CloudFormation infrastructure-managed pattern (no app-layer change required for KEK rotation; flexibility for v2.0 to tighten)
- DEK at 180-day aligns with NIST cryptoperiod guidance for the actual data-encrypting key (DEK encrypts the plaintext PHI; KEK only encrypts DEKs)
- Layered model documents the distinction explicitly to prevent operator confusion

---

## 7. Key custody framework

Specific values (IAM principals, EncryptionContext keys, named operators) deferred to operator-side runbook. This document captures the FRAMEWORK:

### Production keys

- Storage: AWS Secrets Manager for any non-KMS-managed key material (e.g., legacy `PHI_ENCRYPTION_KEY` during migration window)
- KMS access: customer-managed KMS key with EncryptionContext narrowing
- EncryptionContext: `{ service: 'tailrd-backend', purpose: 'phi-encryption' }` (already implemented in kmsService.ts)
- IAM policy: least-privilege; only the Fargate task role hosting the backend service can call `kms:GenerateDataKey` + `kms:Decrypt` on the alias

### Staging keys

- Separate KMS alias: `alias/tailrd-staging-phi`
- Separate Secrets Manager namespace
- Production-staging boundary enforced at IAM layer (cross-account or cross-role policies)

### Local / demo mode

- Local-fallback in `kmsService.ts` (already implemented): generates ephemeral keys per process; no real PHI persisted
- Demo mode preserves existing behavior per CLAUDE.md §14 (DEMO_MODE invariants)

### Break-glass procedure

- Named operator authority required for manual KEK rotation outside scheduled cadence
- Re-encryption procedure documented in operator runbook
- Audit log entry written at break-glass initiation (KMS CloudTrail + app-layer audit log)

### Specific values (operator runbook)

The following are **not** in this design doc; operator captures in runbook:
- Specific IAM role ARNs allowed to call kmsService
- Specific EncryptionContext keys beyond `service` + `purpose`
- Named operators with break-glass authority
- Re-encryption procedure step-by-step
- Disaster recovery runbook for KMS region failover

---

## 8. Migration plan

### Phase A — Deploy V1-capable middleware (0-day)

- Deploy phiEncryption middleware that EMITS V1 for new writes
- Decryption path handles BOTH V1 and V0 (legacy)
- All existing V0 ciphertext continues to read correctly
- No data is migrated yet

### Phase B — Background re-encryption job (0-30 days)

- Fargate task or Lambda runs nightly
- Scans `PHI_FIELD_MAP` + `PHI_JSON_FIELDS` tables in batches (e.g., 1000 records per batch, 10 batches per run)
- For each V0 record: read → decrypt with legacy key → re-encrypt as V1 via kmsService → write back
- Idempotent: re-running on V1 record is a no-op (envelope detection skips already-migrated rows)
- Audit log per batch: counts of V0 → V1 conversions, failures (with redacted error messages)

### Phase C — Optional access-fallback re-encryption

- Off by default
- Toggleable via `PHI_REENCRYPT_ON_READ=true` env var
- When on: every read of a V0 record triggers a re-encrypt-on-write back to V1
- Rationale: covers records that aren't reached by the background job (e.g., rare-access tables)

### Completion criteria

Migration complete when:
1. Zero V0 ciphertext detected by daily audit query for 7 consecutive days, AND
2. Background job last run reports 0 V0 records found
3. Operator-acknowledged go-ahead to deprecate V0 decryption path (deferred to follow-up PR)

V0 decryption path is NOT removed at completion — it remains as a safety net. Removal happens in a follow-up PR after operator confirmation + extended observation window.

### Migration window

Target: 30 days post Phase A deploy. Bounded by:
- Volume of PHI rows in production (BSW pilot scale today)
- Background job throughput (1000 records/batch × 10 batches/run × 1 run/night ≈ 10K records/day)
- KMS API quota (default 5500 GenerateDataKey ops/sec — well above migration throughput)

---

## 9. Test plan

### Unit tests (per-function)

- `rotateKey()` — generates new version + updates current marker
- `encryptWithCurrent(plaintext, ctx)` — emits V1 envelope; round-trips via `decryptAny`
- `decryptAny(envelope, ctx)` — handles V0 + V1; throws fail-loud on integrity failure (per AUDIT-015 pattern)
- `migrateRecord(recordId, table)` — reads V0 → writes V1; idempotent on V1 input

### Integration tests

- Live `PrismaClient` query with `applyPHIEncryption` middleware
- Round-trip Patient model with all PHI fields
- Mixed V0 + V1 ciphertext in result set: all decrypt correctly
- Rotation simulation: encrypt with v1 key; rotate to v2; verify v1 ciphertext decrypts via fallback; new writes use v2

### Migration tests

- Idempotency: run migration handler twice; second run produces zero diffs
- Partial-failure handling: simulate KMS failure mid-batch; verify migration audit log + retry-safe
- Counts verification: pre-migration V0 count + post-migration V1 count = pre-migration total

### KMS-specific tests (mocked AWS SDK)

- EncryptionContext mismatch: encrypt with one ctx; attempt decrypt with different ctx; KMS rejects → fail-loud
- KMS API failure: `GenerateDataKey` throws; encryption operation fails fast (no silent fallback to local mode in production)
- Local-fallback: in `DEMO_MODE=true`, no AWS SDK calls made (verified via mock spy)

### Round-trip parity tests

- For every PHI field in `PHI_FIELD_MAP`: encrypt → decrypt → assert equals original
- For every JSON field in `PHI_JSON_FIELDS`: encrypt → decrypt → assert deep-equals original
- Special cases: empty string, very long string (>10KB), unicode, null, undefined

---

## 10. Implementation phase scope breakdown (3 follow-up PRs)

### Implementation PR 1 — V0/V1 envelope schema + V1 emission + AUDIT-017 bundle (~5-7h + ~1h AUDIT-017)

**Status:** SHIPPED 2026-05-07.

**Scope (per 2026-05-07 V0/V1/V2 schema revision):**
- New `backend/src/services/envelopeFormat.ts` — pure parse/build for V0/V1/V2; `parseEnvelope` returns discriminated union; `buildV0`/`V1`/`V2` serialize. EnvelopeFormatError fail-loud sister to AUDIT-015.
- Refactor `backend/src/services/keyRotation.ts` — replace `decryptAny` + `encryptWithCurrent` stubs with real implementations. V0 + V1 single-key paths share AES-256-GCM with `process.env.PHI_ENCRYPTION_KEY`. V2 throws `DesignPhaseStubError` (PR 2 lands).
- Refactor `backend/src/middleware/phiEncryption.ts` — delegate `encrypt` / `decrypt` to keyRotation; preserve `PHI_LEGACY_PLAINTEXT_OK` gate; preserve AUDIT-015 fail-loud invariants. Async-propagate through middleware (`encryptFields` / `decryptRecord` / `encryptJsonField` / `decryptJsonField` / `applyPHIEncryption.$use`).
- AUDIT-017 bundled per operator decision D4 — `validateKeyOrThrow()` runs at module init for `phiEncryption.ts` outside demo mode; throws `KeyValidationError` on missing / wrong-length / non-hex key. Sister to AUDIT-015.
- Tests: 47 net new (23 envelopeFormat parse/build + 26 keyRotation real-behavior + AUDIT-017 + 3 phiEncryption V1 round-trip; minus 2 stub tests removed).

**Does NOT include:** kmsService wiring (PR 2). V2 parsing routes correctly but decrypt throws stub error.

### Implementation PR 2 — V2 envelope emission + kmsService wiring (~5-8h)

**Status:** SHIPPED 2026-05-07 (~7-8h actual; D7 in-scope expansion + bonus `kmsService.test.ts`).

**Scope (as shipped):**
- `keyRotation.ts` — `encryptWithCurrent` dispatches V1/V2 via runtime gate `shouldEmitV2(env)`; V2 path calls `kmsService.envelopeEncrypt(plaintext, context)` and serializes via `buildV2(...)` to `enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>`. `decryptAny` V2 case replaces PR 1 `DesignPhaseStubError` with `kmsService.envelopeDecrypt({ ciphertext, encryptedDataKey: wrappedDEK, iv, authTag }, context)`.
- `kmsService.ts` parameterized — new `KmsEncryptionContext` interface `{ service, purpose, model?, field? }`, `DEFAULT_KMS_CONTEXT` + `DEFAULT_KMS_FIELD_CONTEXT` constants, `toAwsEncryptionContext` projector. `envelopeEncrypt(plaintext, context = DEFAULT_KMS_CONTEXT)` and `envelopeDecrypt(encrypted, context = DEFAULT_KMS_CONTEXT)` accept context arg with backwards-compat default.
- `phiEncryption.ts` middleware — plumbs `model` + `field` through every call path. Renamed `ENCRYPT_CONTEXT` to `BASE_ENCRYPT_CONTEXT`; new `contextFor(model, field)` helper. Modified `encrypt`, `decrypt`, `encryptFields`, `decryptRecord`, `encryptJsonField`, `decryptJsonField` signatures and Prisma `$use` callback paths (create / update / upsert / updateMany / createMany / findUnique-decrypt).
- `validateEnvelopeConfigOrThrow(env)` runs at module init in `phiEncryption.ts` — fails fast if `PHI_ENVELOPE_VERSION=v2` without `AWS_KMS_PHI_KEY_ALIAS`. Sister to AUDIT-017 `validateKeyOrThrow` (PR 1) and AUDIT-013 fail-closed pattern.
- AUDIT-076 partial closure — `KMS_KEY_VALIDATION_FAILURE` + `KMS_ENVELOPE_DECRYPT_FAILURE` promoted to `HIPAA_GRADE_ACTIONS` Set in `auditLogger.ts` (DB write failures throw).
- Tests: 27 net new (10 keyRotation V2 round-trip + flag-flip + decrypt-not-gated + V0/V1/V2 mixed-batch + validateEnvelopeConfigOrThrow + AUDIT-022 SQL filter compat; 16 kmsService — local-fallback / production KMS API path / strict fail-loud T3a-d / ARN vs alias resolution / getKeyInfo; 1 phiEncryption T7 EncryptionContext plumb spy). jest 510/510.
- Design refinement note: `docs/architecture/AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md` (~310 LOC, 10 sections, D1-D7 + future-work deferral).

**Load-bearing properties (verified):**
- **Decrypt-is-not-gated** (T1) — `PHI_ENVELOPE_VERSION=v1` stops V2 emission; existing V2 ciphertext continues to decrypt. Safe rollback.
- **Strict fail-loud** (D4) — KMS unreachable / `KeyNotFoundException` / `AccessDeniedException` / `InvalidCiphertextException` → throw; no V1 fallback.
- **Per-record EncryptionContext** — `{ service: 'tailrd-backend', purpose: 'phi-encryption', model, field }` propagated to KMS as `Record<string, string>`. CloudTrail audit-trail anchor per HIPAA §164.312(b).
- **AUDIT-022 SQL filter compatibility** (T5) — `enc:%` matches all V0/V1/V2 envelopes; legacy backfill tooling unaffected.
- **Dev-vs-prod separation** — dev V2 uses `kmsService` localEncrypt-as-DEK-wrap (intentional; not portable across env crossings). Acceptable because dev DBs are seeded fresh.

**Does NOT include:** legacy V0/V1 record migration to V2 (PR 3). After PR 2 merge: V0 + V1 + V2 all decrypt; V2 emitted for new writes when `PHI_ENVELOPE_VERSION=v2` AND `AWS_KMS_PHI_KEY_ALIAS` set.

**Risk realized:** none; localEncrypt path covers dev + test runs. Production KMS calibration deferred to integration test (gated by `RUN_INTEGRATION_TESTS=1` + AWS credentials).

### Implementation PR 3 — Migration handler + V0/V1 → V2 migration script (~4-7h)

**Status:** SHIPPED 2026-05-07 (~6-8h actual; mid-range of estimate band per design refinement note §11).

**Scope (as shipped):**
- `migrateRecord(recordId, table, column, context, prismaClient, currentValue)` real implementation in `keyRotation.ts` — signature extended additively from PR 1's `(recordId, table)` (zero existing callers; safe extension). `parseEnvelope` dispatch: V2-input → race-skip with NO DB write per D3; V0/V1-input → `decryptAny` (single-key local AES) → `encryptWithCurrent` (V2 emit; KMS-wrapped DEK) → raw SQL UPDATE via `prisma.$executeRawUnsafe` (parameterized recordId + ciphertext; table + column from compile-time hardcoded TARGETS allow-list — zero SQL injection surface). Defense-in-depth re-parse of emitted envelope rejects non-V2 (catches `PHI_ENVELOPE_VERSION` flag-flip mid-run).
- One-shot operator-triggered migration script `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` (~764 LOC actual; ~18-27% over PAUSE 2 design refinement note §11 estimate of ~600-650 LOC; additional pre-flight detail + boilerplate + error handling; not a §17.1, normal scope clarification; sister to AUDIT-022 PR #253 backfill). NEW `TARGETS` array of ~66 (table, column) pairs spanning 14 string-PHI + 15 JSON-PHI models per D2 (decoupled from AUDIT-022 per Inv #7). Three-layer gate per D7: `--dry-run` (default) / `--execute` (gated by `AUDIT_016_PR3_EXECUTE_CONFIRMED=yes` env) / `--target <t>.<col>` (per-target restriction).
- Pre-flight validates DATABASE_URL + PHI_ENCRYPTION_KEY + AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2 + DEMO_MODE not true. Without `PHI_ENVELOPE_VERSION=v2`, encryptWithCurrent emits V1 instead of V2 — pre-flight catches; defense-in-depth re-parse catches mid-run flips.
- Per-row try/catch + safety abort if all rows in batch fail (sister to AUDIT-022 `:416` guard) per D4.
- All audit events best-effort per D5: per-row `PHI_RECORD_MIGRATED` / `PHI_RECORD_SKIPPED_ALREADY_V2` / `PHI_MIGRATION_FAILURE` via `auditLogger.info`/`error`; per-batch `PHI_MIGRATION_BATCH_STARTED` / `_COMPLETED` / `_FAILED` via `prisma.auditLog.create` (with `[TENANT_GUARD_BYPASS]: true`). NONE in `HIPAA_GRADE_ACTIONS` Set (AUDIT-076 partial closure remains separate scope).
- Summary artifact `backend/var/audit-016-pr3-{mode}-{ISO}.json` for HIPAA archival evidence.
- 9-section operator runbook `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` (mirror AUDIT-022 production runbook structure; PR-3-specific content: snapshot pre-flight, KMS rate-limit math, V2-prerequisite verification, post-run validation via dry-run sanity check, AUDIT-075 re-run requirement per §6.2 D8).
- Design refinement note `docs/architecture/AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md` (475 LOC, 12 sections, D1-D9).
- Tests: 39 net new = 8 keyRotation T-MR-1..T-MR-8 round-trip with EncryptionContext-spy verification + 32 script tests sister to AUDIT-022 22-test pattern − 1 PR 1 stub-throw test removed at PR 3 implementation; jest 549/549 (matches 549 − 510 baseline = 39 delta).

**Load-bearing properties (verified):**
- **No-op V2-input write (D3)** — V2 input → log + return `skipped: true` + NO DB UPDATE. Polluting the audit trail with redundant writes + KMS calls is structurally rejected.
- **Raw SQL bypass** — `$executeRawUnsafe` bypasses `applyPHIEncryption` middleware that would otherwise double-encrypt the V2 envelope into corrupted V2-of-V2 layered ciphertext.
- **Pre-flight + defense-in-depth gating** — pre-flight validates `PHI_ENVELOPE_VERSION=v2` AND `AWS_KMS_PHI_KEY_ALIAS`; mid-run, `migrateRecord` re-parses the emitted envelope and refuses to write a non-V2 envelope. Two layers prevent V0/V1 → V1 silent regression.
- **Idempotent re-run** — SQL filter `LIKE 'enc:%' AND NOT LIKE 'enc:v2:%'` excludes V2 from candidate set; second run = 0 rows attempted.
- **Continue-on-error + safety abort** — per-row failure recorded in `report.failures[]`; if every row in a batch fails, target aborts to prevent infinite-loop on systematic error (KMS misconfiguration, tampered ciphertext run).

**Eighth §17.1 architectural-precedent of the arc:** Phase A inventory missed that `migrateRecord` ITSELF would route the WRITE through `phiEncryption` middleware if naively implemented; Phase B design caught the double-encrypt risk and selected raw SQL bypass. Methodology stack working as designed (design phase catches what inventory misses).

**Does NOT include:** `rotateKey()` policy implementation per D9 — stub remains with updated comment clarifying scope distinction (envelope-format upgrade ≠ key rotation policy). Deferred to future PR (possibly AUDIT-016 PR 4 or dedicated AUDIT-XXX) when operator-side rotation cadence + key-version tracking schema operationalize.

**AUDIT-016 register status flips OPEN → RESOLVED at this PR's merge.** Three sub-PRs all SHIPPED: PR 1 (#255 envelope schema + V1 emission + AUDIT-017 bundle) + PR 2 (#258 V2 emission + kmsService wiring + per-record EncryptionContext) + PR 3 (this PR — migrateRecord + migration script + operator runbook).

**Risk realized:** none in test runs. Production --execute timing operator-side per runbook; integration test scaffold (`backend/tests/integration/audit016-pr2-kms-roundtrip.test.ts` from PR 2) covers real-KMS round-trip.

### Total implementation effort

- Sum: 14-22h across 3 PRs
- Original register estimate: 24-40h
- Reduction rationale: kmsService already implemented (saves 8-15h that would otherwise be KMS service authoring)

---

## 11. Cross-references

- **AUDIT-016** (this work) — `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- **AUDIT-017** (LOW P3) — PHI_ENCRYPTION_KEY length not validated at startup; **RESOLVED 2026-05-07** bundled into PR 1 per operator decision D4 (`validateKeyOrThrow` + module-init validation)
- **AUDIT-022** (MEDIUM P2) — Legacy JSON PHI not encrypted at rest; **RESOLVED 2026-05-07** PR #253 (production-grade backfill tooling + operator runbook)
- **HIPAA Security Rule §164.312(a)(2)(iv)** — Encryption and Decryption (addressable implementation specification)
- **NIST SP 800-57 Part 1 Rev 5** — Cryptoperiod guidance (180-day DEK basis)
- **NIST FIPS 197** — AES algorithm (AES-256-GCM)
- **NIST FIPS 140-3** — Cryptographic module standards
- **CloudFormation KMS configuration** — already provisions `alias/tailrd-production-phi` with auto-rotation
- **`backend/src/services/kmsService.ts`** — fully implemented; consumer audit confirmed zero callers; awaiting wiring in implementation PR 2
- **`backend/src/middleware/phiEncryption.ts`** — current single-key middleware; JSDoc updated this PR (no logic changes)
- **`backend/src/services/keyRotation.ts`** — interface stubs created this PR; throws `DesignPhaseStubError`
- **`docs/audit/AUDIT_METHODOLOGY.md`** §17.1 (consumer audit precedent), §17.3 (scope discipline — design-phase-only ships), §18 (status surface — register HIGH P1 verbatim)

---

## 12. Operator decisions captured (2026-05-07)

| Decision | Choice | Rationale |
|---|---|---|
| D1 KMS provider | **Option B — AWS KMS** (wire existing kmsService) | 305 LOC implementation already exists; AWS KMS gold-standard; CloudFormation rotation already configured |
| D2 Rotation cadence | **180-day app-layer DEK + 365-day AWS-layer KEK** | NIST SP 800-57 cryptoperiod for high-volume PHI; CloudFormation default for KEK |
| D3 Key custody | **Framework in design doc; specifics in operator runbook** | Scope discipline; design captures architectural pattern, runbook captures principal-specific details |
| D4 Migration timing | **Background job + access-fallback** | Minimal downtime; bounded 30-day window; access-pattern resilient |

---

*Authored 2026-05-07 during PR 2 of session 3-PR arc. Catalyst: AUDIT-016 (HIGH P1) HIPAA §164.312(a)(2)(iv) gap. §17.1 consumer audit corrected register's "scaffolded but unwired" framing for kmsService.ts (actually implemented but unconsumed) — second §17.1-architectural-precedent finding after AUDIT-067/068 (PR #249).*

---

## Inline revision history

### 2026-05-07 — V0/V1/V2 envelope schema split (fifth §17.1 architectural-precedent)

**Catalyst:** §17.1 consumer audit during PR 1 implementation (~4 hours after this design doc shipped in PR #252) flagged a signal-shape-honesty problem with the original V1 schema. The original design collapsed two distinct production data-flow stages — single-key versioned (PR 1) and KMS-wrapped DEK (PR 2) — into one "V1" envelope carrying a placeholder `wrappedDEK` field. A `wrappedDEK` field that's not actually wrapping anything is signal-shape lying: operators grepping production logs for `enc:v1:` could not distinguish "PR 1 placeholder" from "PR 2 KMS-wrapped" ciphertext.

**Revision:** §5 envelope format split into V0 (legacy, no version tag) / V1 (single-key versioned, no wrappedDEK) / V2 (KMS-wrapped DEK). §10 implementation phase scope updated: PR 1 ships V0/V1 detection + V1 emission (single-key); PR 2 ships V2 emission (KMS); PR 3 migrates V0 + V1 → V2.

**§17.1 architectural-precedent count post-revision: 5 exercises in the arc.**

1. AUDIT-067/068 LOINC reference-only (PR #249) — 3-6h architectural estimate → 50-min right-sized fix
2. AUDIT-069 LVEF — prior codebase fix-from comment was itself a regression; only NLM fallback verification caught
3. AUDIT-016 kmsService reframing (this design doc, original authorship) — register's "scaffolded but unwired" framing → 305 LOC fully implemented but unconsumed; effort 24-40h → 14-22h
4. AUDIT-022 PHI_JSON_FIELDS broader than register snapshot + 2 stale refs cleaned + production-grade quality bar correction (PR #253) — register's 11-column snapshot → middleware 30-column reality + 2 dead references
5. **2026-05-07 V0/V1/V2 schema revision (this revision)** — operator-side derivative drift caught against authoritative design doc within 4 hours of shipping. Methodology working as designed against my own design doc.

**Why this matters operationally:** the methodology stack (§17.1 consumer audit) caught my own design's signal-shape-lying problem during the FIRST implementation PR — before any production write ever emitted a placeholder-wrappedDEK envelope. If we had shipped the original schema, every "V1" log entry across the 30-day migration window would have ambiguous semantics, and PR 2 would have needed to either (a) silently change V1 semantics from "placeholder DEK" to "KMS DEK" (silent breaking change) or (b) introduce V2 anyway. Option (a) trades short-term cleanliness for long-term audit confusion; option (b) means the design always wanted V0/V1/V2 but described it differently. Either way, V0/V1/V2 is the structurally honest design.

**This is the pattern:** when a methodology stack catches a derivative drift within 4 hours of authorship, that's not failure of the original design — that's the methodology paying for itself.
