# AUDIT-016 PR 3 — Migration Job Design Refinement Note

**Status:** Phase B design (pre-implementation)
**Authored:** 2026-05-07
**Catalyst:** AUDIT-016 PR 3 — `migrateRecord()` real implementation + V0/V1 → V2 background re-encryption
**Methodology:** §17 (clinical-code PR acceptance) + §17.3 scope discipline; §18 register-literal severity
**Stack base:** `feat/audit-016-pr-2-v2-envelope-kms-wiring` (PR #258); rebases to main when #257 + #258 land
**Cross-reference parent:** `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` §10 PR 3
**Decision context:** PAUSE 1 inventory + D1-D9 captured 2026-05-07

---

## 1. Migration script architecture (D1 — one-shot)

PR 3 ships a one-shot operator-triggered migration script following the AUDIT-022 PR #253 backfill precedent. The script discovers V0 / V1 ciphertext in PHI columns, decrypts each row with the existing single-key path (V0/V1 use local AES-256-GCM with `process.env.PHI_ENCRYPTION_KEY`), re-encrypts the plaintext with the V2 path (`kmsService.envelopeEncrypt` per AUDIT-016 PR 2), and writes the V2 envelope back via Prisma `update` so the existing `applyPHIEncryption` middleware does NOT double-encrypt the value (the script writes the already-encrypted V2 envelope to the column directly using a raw write or via the middleware's read-encrypted write-encrypted contract — see §3 below for the exact mechanism).

**Why one-shot, not scheduled:**

- Design doc §10 PR 3 risk note: "background-job ops surface — first scheduled task at TAILRD; runbook quality matters." A scheduled job would require new ops surface (cron monitoring, alerting, drift detection, recovery procedures) that does not exist at TAILRD today.
- AUDIT-022 PR #253 ran the same scope (PHI column iteration + Prisma updates + audit trail + idempotency + dry-run/execute gating + summary artifact + operator runbook) as a one-shot script. The pattern is proven, tested (22 tests), and operator-deployed.
- PR 3 is a **one-time envelope-format upgrade**, not an ongoing rotation policy. After all V0 / V1 records are migrated to V2, the script's job is done. There is no need for it to run on a schedule.
- The future "ongoing key rotation policy" (rotating the AWS KMS KEK or the local PHI_ENCRYPTION_KEY per NIST SP 800-57 365-day cycle) is a separate concept handled by `rotateKey()` (D9 deferred) — not by this script.

**Sister-architecture mirror points:**

| AUDIT-022 PR #253 element | AUDIT-016 PR 3 sister |
|---|---|
| `audit-022-legacy-json-phi-backfill.ts` | `audit-016-pr3-v0v1-to-v2.ts` |
| `TARGETS` (28 JSON columns, 15 models) | `TARGETS` (~66 (table, column) pairs covering BOTH string + JSON; see §2) |
| `column::text LIKE '"enc:%'` discovery | `column LIKE 'enc:%' AND column NOT LIKE 'enc:v2:%'` discovery (D2) |
| `--dry-run` / `--execute` / `--target` | Same flag triad (D7) |
| `AUDIT_022_EXECUTE_CONFIRMED=yes` gate | `AUDIT_016_PR3_EXECUTE_CONFIRMED=yes` gate |
| `--batch 50 --pause-ms 100` defaults | Same defaults (D6; 11× KMS rate-limit headroom) |
| Per-row try/catch + safety abort (`:416`) | Same continue-on-error + safety abort (D4) |
| Per-row `auditLogger.info('audit_event', ...)` | Same; `PHI_RECORD_MIGRATED` event (D5) |
| Per-batch `prisma.auditLog.create` | Same; `PHI_MIGRATION_BATCH_*` events (D5) |
| All best-effort; none in `HIPAA_GRADE_ACTIONS` | Same (D5; AUDIT-076 partial closure deferred to dedicated PR) |
| Summary artifact `backend/var/audit-022-{mode}-{ISO}.json` | `backend/var/audit-016-pr3-{mode}-{ISO}.json` |
| Operator runbook | `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` |

---

## 2. Discovery filter + TARGETS enumeration (D2)

### 2.1 SQL discovery filter

```sql
SELECT id FROM "<table>"
WHERE "<column>" IS NOT NULL
  AND "<column>" LIKE 'enc:%'
  AND "<column>" NOT LIKE 'enc:v2:%'
ORDER BY id
LIMIT <batch>;
```

The two-prong `LIKE 'enc:%' AND NOT LIKE 'enc:v2:%'` filter:
- **Includes** V0 (`enc:<iv>:<authTag>:<ciphertext>`) and V1 (`enc:v1:<iv>:<authTag>:<ciphertext>`) — both start with `enc:`.
- **Excludes** V2 (`enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>`) — already migrated.
- **Excludes** legacy plaintext (no `enc:` prefix) — out of scope; AUDIT-022 owns that path. PR 3 only converts already-encrypted V0/V1 to V2.
- **Idempotent on re-run:** once migrated, V2 records are excluded from the candidate set.

JSON columns use the same filter without `::text` cast since values are stored as encrypted strings (the JSON wrapping is removed by the existing AUDIT-022 backfill — V0/V1 JSON columns at this point hold encrypted string values, not legacy JSON objects).

### 2.2 TARGETS array — NEW, decoupled from AUDIT-022

PR 3 ships its own `TARGETS` array (NOT imported from AUDIT-022). Per inventory finding #7:

- AUDIT-022 covers 28 JSON columns across 15 models.
- PR 3 covers BOTH string columns (PHI_FIELD_MAP) AND JSON columns (PHI_JSON_FIELDS) — superset.
- AUDIT-022 detection logic (`"enc:%` JSON-string-quoted) differs from PR 3 (`enc:%` raw column — JSON columns at PR 3 time hold encrypted strings, not legacy JSON).
- Cross-script coupling would create maintenance drift; clean decouple is preferred per §17.3.

Initial PR 3 TARGETS array (~66 entries):

**String-column targets (14 models, ~38 fields per `PHI_FIELD_MAP`):**

| Model (Prisma) | Table (`@@map`) | Columns |
|---|---|---|
| Patient | `patients` | firstName, lastName, dateOfBirth, phone, email, mrn, street, city, state, zipCode |
| Encounter | `encounters` | chiefComplaint, primaryDiagnosis, attendingProvider |
| Observation | `observations` | valueText, observationName, orderingProvider |
| Order | `orders` | orderName, indication, instructions, orderingProvider |
| Medication | `medications` | medicationName, genericName, prescribedBy |
| Condition | `conditions` | conditionName, recordedBy |
| Alert | `alerts` | message |
| DrugTitration | `drug_titrations` | drugName |
| CrossReferral | `cross_referrals` | reason, notes |
| CarePlan | `care_plans` | title |
| InterventionTracking | `intervention_tracking` | interventionName, indication, performingProvider, outcome |
| BreachIncident | `breach_incidents` | description |
| PatientDataRequest | `patient_data_requests` | requestedBy, requestorEmail |
| UserMFA | `user_mfa` | secret |

**JSON-column targets (15 models, 28 columns per `PHI_JSON_FIELDS`):** mirror AUDIT-022 TARGETS table-by-table, but with raw `LIKE 'enc:%'` predicates instead of `'"enc:%'` JSON-string-quoted predicates.

**Drift risk + reconciliation:** if AUDIT-075 lands BEFORE PR 3, PR 3 must be re-run after AUDIT-075 to sweep the additional columns. If AUDIT-075 lands AFTER PR 3, AUDIT-075's PR must extend PR 3 TARGETS array AND re-run the migration. Documented in operator runbook §6 closeout (per D8).

### 2.3 Pre-flight column-existence check (mirrors AUDIT-022 §17.1)

PR 3 runs `information_schema.columns` lookup per target before migration; logs `SKIP <table>.<column> (column not found)` for any drift (covers PHI map → schema drift surfaced as §17.1 finding without aborting the run).

---

## 3. `migrateRecord()` implementation (D3)

### 3.1 Signature (committed in PR 1)

```typescript
export async function migrateRecord(
  recordId: string,
  table: string,
  column: string,                   // NEW: PR 3 narrows to per-(record, column) granularity
  context: EncryptionContext,
): Promise<MigrationResult>;
```

PR 1 committed `migrateRecord(recordId, table)` signature with `MigrationResult` return shape. PR 3 EXTENDS the signature with `column` + `context` arguments (additive change; no existing callers per inventory finding #6, so no breakage).

**MigrationResult shape (committed PR 1, `keyRotation.ts:215-223`):**

```typescript
{
  recordId: string;
  table: string;
  fromVersion: KeyVersion;          // 'v0' | 'v1' | 'v2' (v2 = no-op skip)
  toVersion: KeyVersion;             // always 'v2' on successful migration
  fieldsConverted: number;           // 0 or 1 (per-row, per-column granularity)
  skipped: boolean;                  // true if input already V2
  migratedAt: Date;
}
```

### 3.2 Execution flow

```
1. Caller fetches single column value via SQL (already filtered by LIKE 'enc:%' AND NOT LIKE 'enc:v2:%').
2. parseEnvelope(value) → discriminated union { version: 'v0' | 'v1' | 'v2', ...fields }
3. If parsed.version === 'v2':
     log PHI_RECORD_SKIPPED_ALREADY_V2 (race protection — D3 clarification)
     return { ..., skipped: true, fieldsConverted: 0, fromVersion: 'v2', toVersion: 'v2' }
     NO DB WRITE (D3: tightened framing — "no write at all; log only")
4. Else (v0 or v1):
     plaintext = await decryptAny(value, context)         // local AES with PHI_ENCRYPTION_KEY
     v2envelope = await encryptWithCurrent(plaintext, context)   // V2 path; KMS GenerateDataKey
                                                                  // (requires PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS)
     await prisma.$queryRawUnsafe(
       `UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`,
       v2envelope, recordId,
     )
     log PHI_RECORD_MIGRATED
     return { ..., skipped: false, fieldsConverted: 1, fromVersion: parsed.version, toVersion: 'v2' }
```

### 3.3 Why raw SQL UPDATE, not Prisma model client

The `applyPHIEncryption` Prisma middleware would re-encrypt any value passed through `prisma.<model>.update({ data: { <column>: ciphertext } })` — calling encryptWithCurrent on an already-encrypted V2 envelope, producing `enc:v2:<wrappedDEK>:<iv>:<authTag>:enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>` (double-wrapped corruption).

Two viable options:
- **(A) Raw SQL UPDATE** — bypasses `$use` middleware entirely. Sister to AUDIT-022's `prisma.$queryRawUnsafe` approach for detection counts. Operationally cleanest; no middleware coordination. CHOSEN.
- (B) Prisma update with a new middleware-bypass marker — adds new code path through middleware, increases attack surface for future drift bugs.

PR 3 picks (A) raw SQL UPDATE for the write. Sister to AUDIT-022's existing precedent (`$queryRawUnsafe` for detection; AUDIT-022 uses Prisma `update` because it WANTS encryption-on-write — opposite direction; PR 3 wants to write the already-encrypted value as-is).

**This is the eighth §17.1 architectural-precedent across the 3-day arc.** Phase A inventory documented "no hot-path modifications" (true: migrateRecord is not called by middleware) but missed that `migrateRecord` ITSELF, if naively implemented as `prisma.<model>.update`, would route the WRITE through `phiEncryption` middleware and double-encrypt the V2 envelope. Phase B design caught this and selected raw SQL bypass via `prisma.$executeRawUnsafe` (parameterized recordId + ciphertext; table + column from hardcoded TARGETS allow-list, NOT user input — zero SQL injection surface). Methodology stack working as designed: design phase caught what the inventory missed.

### 3.4 Sister-script integration

The migration script's per-row loop calls `migrateRecord(id, table, column, context)` once per (id, column). Multiple columns per row = multiple calls (each column independently encrypted; matches per-record EncryptionContext model).

---

## 4. Idempotency handling (D3 detail)

Three-layer idempotency:

1. **SQL discovery filter** (`LIKE 'enc:%' AND NOT LIKE 'enc:v2:%'`) — V2 records never enter the candidate set on a clean re-run.
2. **Application-layer race protection** — between SQL fetch and per-row UPDATE, a concurrent writer (e.g., BSW pilot during off-hours window) could write a V2 envelope. Per-row `parseEnvelope` re-check catches this; result is `skipped=true` with PHI_RECORD_SKIPPED_ALREADY_V2 audit event. **No DB write occurs** (D3 tightened framing — write would pollute audit trail and waste a KMS call).
3. **MigrationResult skipped flag** — the per-target report counts skipped rows separately so operators can verify the race-protected vs. happy-path split.

**Re-run safety:** running `--execute` twice in a row produces zero writes on the second run because:
- All previously-migrated rows are excluded by SQL filter (now V2).
- Any race-skipped rows from run 1 are also V2 by run 2.
- Operator can re-run after a partial failure (e.g., KMS quota throttle mid-run) without duplicate writes.

---

## 5. Batching + throttling (D6)

Default `--batch 50 --pause-ms 100` (sister to AUDIT-022). Rate-limit math:

- 50 records/batch × 1 KMS call/record (V2 emit) = 50 KMS calls/batch.
- Batch processing time ~5-10s (1 KMS call ≈ 100-200ms p50; some sequential overhead from per-row UPDATE).
- 100ms inter-batch pause keeps DB load bounded.
- Effective: ~5-10 records/sec sustained → ~50-100 KMS RPS peak.
- AWS KMS shared account quota: 5,500 RPS → **55× headroom above default config** (better than 11× initial estimate; sequential per-row processing reduces peak burst below batch size).

**Operator-tunable per dataset:**

| Dataset profile | Recommended config |
|---|---|
| Single-tenant pilot (~500K-1M records) | `--batch 50 --pause-ms 100` (default; ~3-6 hr wall-clock) |
| Multi-tenant production (~5M-10M records) | `--batch 100 --pause-ms 50` (~2-4× faster; still 27× KMS headroom) |
| Spot-check / single-target verification | `--batch 10 --pause-ms 200 --target patients.firstName` (slow + scoped) |

---

## 6. Failure mode + retry behavior (D4)

### 6.1 Per-row try/catch + safety abort

Sister to AUDIT-022 `:416` guard:

```typescript
for (const id of ids) {
  report.rowsAttempted++;
  try {
    await migrateRecord(id, table, column, context);
    report.rowsSucceeded++;
    auditLogger.info('audit_event', { ..., action: 'PHI_RECORD_MIGRATED', ... });
  } catch (err) {
    report.rowsFailed++;
    report.failures.push({ id, error: err.message });
    auditLogger.error('audit_event', { ..., action: 'PHI_MIGRATION_FAILURE', ... });
  }
}

// Safety abort: if all rows in this batch failed, stop the target
if (ids.length > 0 && report.failures.length >= ids.length && report.rowsSucceeded === 0) {
  break;
}
```

**Failure types + handling:**

| Failure type | Per-row handling | Run-level effect |
|---|---|---|
| Decrypt integrity check fails (auth tag mismatch) | Per-row failure logged; continue | Run completes; `report.failures[]` records IDs for forensic review |
| KMS GenerateDataKey rate-limit throttle | Per-row failure; continue | Throttled rows captured in failures; operator can re-run later (idempotent) |
| KMS unreachable (network) | Per-row failure; continue (or abort if all fail) | Safety abort triggers if every row in batch fails |
| DB UPDATE fails (deadlock, lock timeout) | Per-row failure; continue | Re-run picks up via SQL filter |
| Race condition (record disappeared) | Per-row failure; continue | Logged; not actionable |
| `parseEnvelope` malformed | Per-row failure; continue | Surfaces data-integrity bug separate from migration |

### 6.2 No fail-fast / no fail-batch modes

- **Fail-fast** (stop entire run on first failure) considered + rejected: a single transient KMS throttle would halt a 5M-record migration. Operator would have to manually resume.
- **Fail-batch** (rollback the current batch on failure) considered + rejected: each per-row UPDATE is its own commit (no batch transaction). Rollback would require explicit transaction wrapping, which conflicts with continue-on-error semantics.

### 6.3 Re-run as recovery

Failed rows recorded in summary artifact `backend/var/audit-016-pr3-execute-{ISO}.json`. Operator can:
1. Investigate root cause (KMS throttle? decrypt corruption? schema drift?).
2. Fix the root cause (raise KMS quota; restore from snapshot; etc.).
3. Re-run the script — SQL filter automatically excludes already-V2 records; failed rows from run 1 are picked up.

---

## 7. Configuration + env vars

### 7.1 Required env vars (PR 3 execute mode)

| Env var | Purpose | Failure mode if missing/wrong |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Pre-flight error; exit 1 |
| `PHI_ENCRYPTION_KEY` | V0/V1 decrypt path (single-key AES-256-GCM) | Pre-flight error; exit 1 |
| `AWS_KMS_PHI_KEY_ALIAS` | V2 emit path (must match deployed config) | `EnvelopeConfigError` thrown by `keyRotation.encryptWithCurrent` shouldEmitV2 gate |
| `PHI_ENVELOPE_VERSION=v2` | V2 emission gate (PR 2 requires this for V2 emit) | If unset OR `v1`: `encryptWithCurrent` falls back to V1 emit — script fails because it would write V1, not V2 |
| `AUDIT_016_PR3_EXECUTE_CONFIRMED=yes` | --execute confirmation gate (D7) | --execute exits 1 with runbook reference |
| `AWS_REGION` (recommended) | KMS region (defaults to us-east-1 in `kmsService.ts`) | Wrong region → KMS endpoint mismatch |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | KMS credentials (or IAM role on Fargate) | KMS calls return AccessDenied |

**Note on `PHI_ENVELOPE_VERSION`:** decrypt is NOT gated by this flag (per AUDIT-016 PR 2 decrypt-is-not-gated property), so V0/V1 decrypt works regardless. But V2 EMIT requires `PHI_ENVELOPE_VERSION=v2`. Migration MUST set the flag for the duration of the run; production deploy should set it permanently before run starts. Sister to PR 2 deploy gating.

### 7.2 Pre-flight validation (sister to AUDIT-022 `preFlightValidate`)

```typescript
function preFlightValidate(env): { ok, errors[], warnings[] } {
  errors:
    - DATABASE_URL not set
    - PHI_ENCRYPTION_KEY not set
    - AWS_KMS_PHI_KEY_ALIAS not set
    - PHI_ENVELOPE_VERSION !== 'v2'
  warnings:
    - PHI_ENCRYPTION_KEY length !== 64 (AUDIT-017 catches this hard at module init now)
    - DEMO_MODE=true (script declines to run on demo data)
}
```

### 7.3 CLI args

| Flag | Default | Purpose |
|---|---|---|
| `--dry-run` | YES (default) | Counts only; no writes |
| `--execute` | — | Writes; requires confirmation env gate |
| `--batch <N>` | 50 | Batch size |
| `--pause-ms <N>` | 100 | Inter-batch + inter-target pause |
| `--target <table>.<column>` | (all) | Per-target restriction (D7) |

---

## 8. Audit log entries (D5 — all best-effort)

### 8.1 Per-row events (`auditLogger.info` / `error` — file + console transports)

| Action | Trigger | Volume estimate |
|---|---|---|
| `PHI_RECORD_MIGRATED` | Successful V0/V1 → V2 conversion | 1 per migrated record (5M+ on full run) |
| `PHI_RECORD_SKIPPED_ALREADY_V2` | Race-protected skip (D3) | < 1% of migrated count |
| `PHI_MIGRATION_FAILURE` | Per-row exception | 0-N depending on KMS / DB state |

### 8.2 Per-batch events (`prisma.auditLog.create` with `[TENANT_GUARD_BYPASS]: true`)

| Action | Trigger |
|---|---|
| `PHI_MIGRATION_BATCH_STARTED` | Each batch start |
| `PHI_MIGRATION_BATCH_COMPLETED` | Each batch close (succeeded + skipped + failed counts) |
| `PHI_MIGRATION_BATCH_FAILED` | Safety abort triggered (all rows in batch failed) |

### 8.3 None HIPAA-graded

D5: ALL best-effort. AUDIT-022 PHI_BACKFILL_ROW + PHI_BACKFILL_ROW_FAILED + PHI_BACKFILL_BATCH precedent. Per-row volume + storm risk make HIPAA-grade promotion inappropriate without dedicated rate-limiting. AUDIT-076 partial closure remains separate PR scope.

### 8.4 Summary artifact (HIPAA archival evidence)

`backend/var/audit-016-pr3-{mode}-{ISO}.json` — sister to AUDIT-022 envelope shape:

```json
{
  "audit": "AUDIT-016-PR-3",
  "mode": "execute",
  "batchSize": 50,
  "pauseMs": 100,
  "targetFilter": null,
  "startedAt": "2026-XX-XXTXX:XX:XXZ",
  "finishedAt": "2026-XX-XXTXX:XX:XXZ",
  "totalsByTarget": [ /* TargetReport[] */ ],
  "skippedTargets": [ /* column-not-found drift */ ],
  "summary": {
    "targetsScanned": 66,
    "targetsSkipped": 0,
    "totalCandidatesBefore": 5000000,
    "totalRowsAttempted": 5000000,
    "totalRowsSucceeded": 4999987,
    "totalRowsRaceSkipped": 13,
    "totalRowsFailed": 0,
    "cleanForCloseout": true
  },
  "artifactPath": "backend/var/audit-016-pr3-execute-2026XX-XXTXXXXXXZ.json"
}
```

---

## 9. Test plan

### 9.1 `keyRotation.test.ts` additions (~10-12 new tests on `migrateRecord`)

| Test | Scenario | Assertion |
|---|---|---|
| migrate V0 → V2 round-trip | Encrypt plaintext with V0 path; pass envelope to migrateRecord; decrypt result | plaintext recovered; toVersion='v2'; fromVersion='v0'; skipped=false; fieldsConverted=1 |
| migrate V1 → V2 round-trip | Same with V1 source | toVersion='v2'; fromVersion='v1' |
| migrate V2 input → skip | V2 envelope as input | skipped=true; fieldsConverted=0; fromVersion='v2'; toVersion='v2'; NO DB write recorded |
| decrypt failure → throw | Tampered V0 auth tag | Error wrapping integrity check failure |
| KMS encrypt failure → throw | Mock kmsService throw on encryptV2 | Error propagates; no partial write |
| invalid envelope → throw | Malformed input string | EnvelopeFormatError |
| migrate with EncryptionContext mismatch on decrypt | Wrong context | KMS context-mismatch surface (V2-input case only) |
| migrate plaintext (no enc: prefix) → throw | Plaintext input | Throws because parseEnvelope rejects |
| migrateRecord stub-tests removal | Replace existing PR 1 stub-throw tests | Old tests deleted; round-trip tests replace |
| PR 3 V2 emission requires gating | shouldEmitV2 must return true for migrate run | If unset, encryptWithCurrent returns V1 (test catches by asserting toVersion='v2' fails when env=v1) |

### 9.2 Migration script tests (`backend/tests/scripts/migrations/audit-016-pr3-v0v1-to-v2.test.ts`)

Sister to AUDIT-022 22-test pattern. Target ~25-30 tests:

| Category | Tests |
|---|---|
| CLI parsing | parseArgs default, --dry-run, --execute, --batch <N>, --pause-ms <N>, --target <t>.<col>, invalid flag |
| Pre-flight validation | DATABASE_URL missing → error; PHI_ENCRYPTION_KEY missing → error; AWS_KMS_PHI_KEY_ALIAS missing → error; PHI_ENVELOPE_VERSION !== 'v2' → error; warning on key length |
| Confirmation gate | --execute without env=yes → error; with env=yes → proceed |
| Discovery + counts | countTarget V0 + V1 + V2 split correct; column-not-found skip |
| migrateTarget happy path | V0+V1 candidates migrated; V2 race-skip-and-log; report shape correct |
| migrateTarget failure handling | Per-row throw → continue; safety abort if all rows fail |
| Batch iteration | Multiple batches; SQL re-fetch shrinks candidate set |
| Per-target restriction | --target patients.firstName limits scope to single TARGETS entry |
| Idempotency | Re-run on clean target → 0 rows attempted |
| Summary artifact | Envelope shape correct; written to backend/var/ |
| Audit logging | auditLogger.info called per row; auditLog.create per batch |
| Mock contract | All Prisma + auditLogger + fs mocked; no real DB / KMS / disk |

### 9.3 Integration test scaffold (gated)

`backend/tests/integration/audit016-pr3-migration-roundtrip.test.ts` — gated by `RUN_INTEGRATION_TESTS=1` + `AWS_KMS_PHI_KEY_ALIAS` (sister to PR 2 scaffold). 3-4 tests against real KMS sandbox:
- Real V0 → V2 round-trip via migrateRecord (single column)
- Real V1 → V2 round-trip via migrateRecord (single column)
- Idempotent re-run (V2 input → skip + log)
- Strict fail-loud on bogus key alias (no V1 fallback)

### 9.4 Targets for jest count

PR 2 baseline: 510/510. PR 3 net new:
- keyRotation.test.ts: +10-12
- audit-016-pr3-v0v1-to-v2.test.ts (NEW): +25-30
- minus 2 PR 1 stub-throw tests (replaced by round-trip)

**PR 3 jest target: ~543-550 passing.**

---

## 10. Rollback path

### 10.1 Pre-migration safeguard

Operator runbook §2 mandates an Aurora cluster snapshot BEFORE `--execute`:

```bash
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier tailrd-production-aurora \
  --db-cluster-snapshot-identifier "tailrd-production-aurora-pre-audit-016-pr3-$(date -u +%Y%m%dT%H%M%SZ)" \
  --tags Key=Purpose,Value=AUDIT-016-PR3-pre-execute Key=HIPAA,Value=6yr-retention
```

Recovery RTO ~15-30 min on Aurora.

### 10.2 During migration

- Per-row UPDATE is a single-statement commit. Partial completion is safe — no batch transaction to rollback.
- KMS-throttled rows are recorded in summary artifact `failures[]`; not partially written.
- Re-run picks up from SQL filter exclusion of already-V2 records; failed rows are retried.

### 10.3 After migration (failure scenario)

If a wholesale issue is detected post-migration (e.g., V2 records can't be decrypted because KMS key was wrong-aliased):
1. Stop the application immediately (set `PHI_ENVELOPE_VERSION=v1` to prevent further V2 writes; existing V2 records still attempt to decrypt).
2. Restore from pre-migration snapshot (15-30 min RTO).
3. Investigate root cause; re-run after fix.

### 10.4 No schema migration

PR 3 changes ZERO Prisma schema state. The string columns hold encrypted strings either way (V0/V1/V2 all serialize to colon-delimited strings; column type is unchanged). Sister to PR 2 (which also had no schema migration). Down-migration is not applicable.

---

## 11. Effort breakdown

| Component | Estimate |
|---|---|
| `migrateRecord()` real implementation in `keyRotation.ts` | ~1-1.5h (decryptAny + encryptWithCurrent dispatch + parseEnvelope V2 skip + MigrationResult assembly + raw SQL UPDATE bridge) |
| `audit-016-pr3-v0v1-to-v2.ts` migration script | ~2-2.5h (sister to AUDIT-022 575 LOC; ~600-650 LOC due to TARGETS expansion to ~66 entries) |
| `keyRotation.test.ts` additions + stub-test removal | ~1h (~10-12 new tests; 2 deletes) |
| `audit-016-pr3-v0v1-to-v2.test.ts` new test file | ~1.5-2h (sister to AUDIT-022 22-test pattern; target ~25-30 tests) |
| Integration test scaffold (gated; optional) | ~30min |
| Operator runbook | ~30-45min (mirror AUDIT-022 runbook structure) |
| `rotateKey()` comment update (D9) | ~5min |
| This design refinement note + design doc §10 append | ~30-45min (this note already authored; design doc append remaining) |
| Register entry update (AUDIT-016 OPEN → RESOLVED) | ~10min |
| BUILD_STATE ledger updates (§1, §6, §6.1, §6.2, §9) | ~20min |
| **Subtotal** | **~6-8h. Estimate refined to ~6-8h based on Phase B granularity (~66 TARGETS, signature extension, raw SQL bypass, V2-prerequisite pre-flight validation, ~25-30 script tests sister to AUDIT-022). Slight overrun of design doc's 4-7h directional band acceptable; design doc estimate was pre-Phase-B.** |

---

## 12. Cross-references

- **Parent design doc:** `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (PR #252)
- **Sibling PR 1:** AUDIT-016 envelope schema + V0/V1 detection + V1 emission + AUDIT-017 bundled (PR #255 — merged)
- **Sibling PR 2:** AUDIT-016 V2 envelope emission + kmsService wiring + per-record EncryptionContext (PR #258 — this PR's stack base)
- **Sister-architecture precedent:** AUDIT-022 PR #253 — `audit-022-legacy-json-phi-backfill.ts` + `AUDIT_022_PRODUCTION_RUNBOOK.md` (575 LOC script + 22-test sister)
- **Cross-script driver:** AUDIT-013 audit logger pattern (file + console + DB transports; HIPAA-grade subset throws on DB write failure)
- **HIPAA Security Rule §164.312(a)(2)(iv):** addressable encryption/decryption implementation specification
- **NIST SP 800-57 Part 1 Rev 5:** key rotation cryptoperiod guidance (180-day app-layer DEK + 365-day AWS-layer KEK)
- **AUDIT-075 cross-reference:** D8 defer note — when AUDIT-075 PHI map extension lands, run PR 3 script again to migrate the newly-covered columns. Document in operator runbook §6 closeout.
- **AUDIT-076 cross-reference:** D5 keeps PR 3 events best-effort. Dedicated AUDIT-076 PR will revisit the `HIPAA_GRADE_ACTIONS` boundary; PR 3 promotions deferred.
- **AUDIT-016 PR 3 register entry (post-merge):** AUDIT-016 status flips OPEN → RESOLVED; design doc §10 PR 3 status flips PENDING → SHIPPED.
- **D9 deferred work:** `rotateKey()` stub remains; deferred to future PR (key rotation policy implementation; possibly AUDIT-016 PR 4 or dedicated AUDIT-XXX). Stub comment updated to clarify scope distinction (envelope-format upgrade ≠ key rotation policy).

---

*Authored 2026-05-07 during AUDIT-016 PR 3 Phase B design refinement. Catalyst: D1-D9 captured at PAUSE 1; surfaces architecture before implementation per §17.3 scope discipline. Sister to PR 2 design refinement note (`AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md`) — same shape, same rigor, different scope.*
