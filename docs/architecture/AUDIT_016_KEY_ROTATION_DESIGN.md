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

### V0 (legacy — current production)

```
enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>
```

- 4 colon-delimited segments
- All current PHI rows in production use this format
- Single key sourced from `process.env.PHI_ENCRYPTION_KEY`
- No version tag; no wrapped DEK

### V1 (target — post-rotation deploy)

```
enc:v1:<wrappedDEK-base64>:<iv-base64>:<authTag-base64>:<ciphertext-base64>
```

- 6 colon-delimited segments (includes `v1` version marker after `enc:` prefix)
- DEK is generated per encrypt call via KMS `GenerateDataKey`
- DEK is encrypted-at-rest via KMS (the `wrappedDEK` segment)
- Plaintext DEK is short-lived (single encrypt operation) and never persisted
- Decryption requires KMS `Decrypt` call to unwrap DEK + local AES-256-GCM

### Future versions

Reserved version slots:
- `v2`: per-tenant DEK wrapping (multi-tenant isolation; future v2.0 PATH_TO_ROBUST scope)
- `v3`: post-quantum hybrid (per NIST PQC migration; ~2030 horizon)

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

### Implementation PR 1 — Envelope format + version tag (~5-7h)

**Scope:**
- Update `phiEncryption.ts` decryption path to detect V0 vs V1 envelope (regex on prefix)
- Add `decryptV0` (current legacy logic, unchanged) + `decryptV1` (parses wrappedDEK + calls kmsService.envelopeDecrypt)
- Update encryption path to ALWAYS emit V1 for new writes
- Add `wrappedDEK` field type to envelope schema
- Tests: V0 + V1 round-trip; mixed result sets; legacy backward-compat

**Does NOT include:** wiring kmsService for actual envelope; uses placeholder DEK derived from existing PHI_ENCRYPTION_KEY for v1-format-correctness testing.

### Implementation PR 2 — phiEncryption ↔ kmsService wiring (~5-8h)

**Scope:**
- Replace placeholder DEK in `encryptWithCurrent` with real `kmsService.envelopeEncrypt` call
- Replace V1 decryption stub with real `kmsService.envelopeDecrypt` call
- EncryptionContext propagation per-record (model + field name)
- Production-mode + demo-mode parity (kmsService local-fallback covers demo)
- Tests: integration with kmsService mocks; EncryptionContext narrowing; KMS failure handling
- Production deploy ready after PR 2 merges

**Risk:** KMS API cost calibration — measured during integration tests. Default 4KB envelope size + N writes per minute = bounded cost.

### Implementation PR 3 — Migration handler + background job (~4-7h)

**Scope:**
- `migrateRecord(recordId, table)` real implementation
- Background re-encryption job (Fargate task or Lambda)
- Idempotency via envelope detection
- Audit logging per batch
- Operator-runbook for invocation + completion verification
- Tests: idempotency, partial-failure handling, counts verification

**Risk:** background-job ops surface — first scheduled task at TAILRD; runbook quality matters.

### Total implementation effort

- Sum: 14-22h across 3 PRs
- Original register estimate: 24-40h
- Reduction rationale: kmsService already implemented (saves 8-15h that would otherwise be KMS service authoring)

---

## 11. Cross-references

- **AUDIT-016** (this work) — `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- **AUDIT-017** (LOW P3) — PHI_ENCRYPTION_KEY length not validated at startup; bundled-eligible with implementation PR 1
- **AUDIT-022** (MEDIUM P2) — Legacy JSON PHI not encrypted at rest; benefits from rotation pattern in eventual re-encryption work; PR 3 of today's session-arc plan
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
