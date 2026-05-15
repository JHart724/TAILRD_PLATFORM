# AUDIT-016 PR 3 - V0/V1 → V2 Envelope Migration Production Runbook

**Status:** Operator-ready
**Owner:** Security / Compliance lead
**Last reviewed:** 2026-05-07
**Cross-references:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-016), `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md`, `docs/architecture/AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md`, `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (sister precedent), HIPAA §164.312(a)(2)(iv) addressable encryption/decryption implementation specification

---

## 1. Purpose + Scope

AUDIT-016 PR 3 finds PHI columns containing V0 (`enc:<iv>:<authTag>:<ciphertext>`) or V1 (`enc:v1:<iv>:<authTag>:<ciphertext>`) ciphertext (single-key local AES-256-GCM with `PHI_ENCRYPTION_KEY`) and re-encrypts each row's value as V2 (`enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>`) using AWS KMS-wrapped per-record DEKs via `kmsService.envelopeEncrypt` (per AUDIT-016 PR 2 wiring).

This script reads each V0/V1 row, calls `keyRotation.migrateRecord` (decrypt single-key → encrypt KMS-wrapped DEK), and writes the V2 envelope back via raw SQL UPDATE bypassing `applyPHIEncryption` middleware (which would otherwise double-encrypt the V2 envelope). Detection SQL excludes any row already V2, so re-runs are idempotent.

**Coverage:** ~66 (table, column) pairs spanning 14 string-PHI models (PHI_FIELD_MAP) + 15 JSON-PHI models (PHI_JSON_FIELDS). Superset of AUDIT-022 (which covered 28 JSON columns); PR 3 covers BOTH string AND JSON columns.

**Envelope version transition:** V0 / V1 → V2.

- V0 = legacy untagged production envelope (pre-AUDIT-016).
- V1 = single-key versioned (PR 1 emission default).
- V2 = KMS-wrapped DEK + per-record EncryptionContext (PR 2 emission when `PHI_ENVELOPE_VERSION=v2` AND `AWS_KMS_PHI_KEY_ALIAS` set).

After PR 3 execution: every V0 + V1 record is re-encrypted as V2; V2 records are unchanged; plaintext rows (no `enc:` prefix) are out of scope (AUDIT-022 owns plaintext → V0 backfill).

**Concurrent-write safety:** the script does NOT take row-level locks. Operator must schedule execution in an off-hours window with no concurrent writers to PHI columns. Race protection inside `migrateRecord` catches V2 records that appear between SQL fetch and write (skip-and-log; no DB write per D3).

---

## 2. Pre-flight Checklist

Run each step in order. Stop if any step fails; do not proceed with `--execute` until all pre-flight items are clean.

### 2.1 Take a fresh Aurora cluster snapshot

```bash
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier tailrd-production-aurora \
  --db-cluster-snapshot-identifier "tailrd-production-aurora-pre-audit-016-pr3-$(date -u +%Y%m%dT%H%M%SZ)" \
  --tags Key=Purpose,Value=AUDIT-016-PR3-pre-execute Key=HIPAA,Value=6yr-retention
```

Record snapshot ARN + timestamp in your run log. Recovery RTO from snapshot is ~15-30 min on Aurora.

### 2.2 Verify production env vars

PR 3 requires FOUR env vars set before --execute:

```bash
aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text | head -c 30
aws secretsmanager get-secret-value --secret-id tailrd-production/app/phi-encryption-key --query SecretString --output text | wc -c
echo "PHI_ENVELOPE_VERSION expected = v2"
aws ssm get-parameter --name /tailrd/production/PHI_ENVELOPE_VERSION --query Parameter.Value --output text
echo "AWS_KMS_PHI_KEY_ALIAS expected = alias/tailrd-production-phi"
aws ssm get-parameter --name /tailrd/production/AWS_KMS_PHI_KEY_ALIAS --query Parameter.Value --output text
```

Expected:
- `phi-encryption-key` length = 65 (64 hex chars + newline) - AUDIT-017 validates at module init.
- `PHI_ENVELOPE_VERSION` = `v2`. **Without v2, `encryptWithCurrent` emits V1 instead of V2 - defeats the migration.** PR 3 pre-flight + `migrateRecord` defense-in-depth re-parse will reject a non-V2 emit, but flip the flag first.
- `AWS_KMS_PHI_KEY_ALIAS` matches the deployed config (alias OR ARN both accepted by AWS SDK natively).

### 2.3 Verify PR 2 deploy is in production

PR 3 depends on PR 2's `kmsService.envelopeEncrypt` being live. Confirm:

```bash
aws ecs describe-tasks --cluster tailrd-production-cluster \
  --tasks $(aws ecs list-tasks --cluster tailrd-production-cluster \
  --service-name tailrd-production-backend --query 'taskArns[0]' --output text) \
  --query 'tasks[0].containers[0].image' --output text
```

Image SHA must include AUDIT-016 PR 2 commit (PR #258) or later. If not, deploy PR 2 to production first; this script depends on the V2 emit path.

### 2.4 Run `--dry-run` and capture per-target counts

```bash
PHI_ENVELOPE_VERSION=v2 \
  AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
  npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts --dry-run \
  > audit-016-pr3-dryrun-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Inspect the JSON envelope at the bottom of the log:

- Confirm `targetsScanned` ≈ 66 (post-cleanup if any) and `targetsSkipped` is reasonable (column-not-found drift is expected for any model that hasn't been migrated yet).
- Capture `totalV0V1Before` - the number of rows that will migrate.
- Confirm `cleanForCloseout` = false (always false in dry-run; this is expected).

### 2.5 Confirm dry-run counts are reasonable

Compare `totalV0V1Before` to expectations. Pre-DUA period: should be near zero (or zero) since no production PHI data has flowed yet. Demo / pilot period: rows reflect the seeded population. Drift over time vs. production data load is expected; if the count differs by >2× without explanation, pause and investigate.

### 2.6 Schedule execution during a low-traffic window

Recommended: 02:00-04:00 UTC weekday or weekend. Migration takes ~5-10 records/sec sustained at default `--batch 50 --pause-ms 100`. For a 5M-record migration: ~3-6 hours wall clock.

KMS rate-limit headroom: ~55× at default config (1 KMS GenerateDataKey call per migrated row vs. 5,500 RPS account quota). Tune `--batch` up + `--pause-ms` down if dataset is large; spot-check first.

---

## 3. Execution

### 3.1 Run with confirmation gate set

```bash
AUDIT_016_PR3_EXECUTE_CONFIRMED=yes \
  PHI_ENVELOPE_VERSION=v2 \
  AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
  npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts \
    --execute --batch 50 --pause-ms 100 \
    > audit-016-pr3-execute-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Without `AUDIT_016_PR3_EXECUTE_CONFIRMED=yes` the script exits 1 immediately with a pointer to this runbook.

### 3.2 Expected output

```
═══════════════════════════════════════════════════════════════════
  WARNING: AUDIT-016 PR 3 --execute re-encrypts PHI data in-place.
  ...
═══════════════════════════════════════════════════════════════════

CLEAN  patients.firstName: total=N v2=N v0v1=0 plaintext=0
DONE   alerts.message: v0v1 12→0 v2 47→59 attempted=12 migrated=12 raceSkipped=0 failed=0
...
SUMMARY_ARTIFACT: backend/var/audit-016-pr3-execute-2026-05-NNTHH-MM-SS-NNNZ.json
---AUDIT_016_PR3_V0V1_TO_V2---
{
  ...
  "summary": {
    "targetsScanned": 66,
    "targetsSkipped": 0,
    "totalV0V1Before": 12,
    "totalRowsAttempted": 12,
    "totalRowsMigrated": 12,
    "totalRowsRaceSkipped": 0,
    "totalRowsFailed": 0,
    "cleanForCloseout": true
  }
}
---END---
```

### 3.3 Per-row pacing

The script sleeps `--pause-ms` between batches and between targets. Default 100ms. Increase to 500-1000ms if production observes elevated KMS API throttling or DB latency during the run.

### 3.4 Per-target restriction (spot-check)

```bash
AUDIT_016_PR3_EXECUTE_CONFIRMED=yes \
  PHI_ENVELOPE_VERSION=v2 \
  AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
  npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts \
    --execute --target patients.firstName --batch 10 --pause-ms 200
```

Use this for first-time verification on a single column before sweeping all targets.

---

## 4. Monitoring During the Run

### 4.1 CloudWatch Logs filter

```
filter @message like /audit_event/
| filter description like /AUDIT-016 PR 3/
| stats count() as rows_per_minute by bin(1m)
```

Expected rate: 5-10 rows per minute at default `--pause-ms 100`. Investigate if rate stalls for >2 minutes.

### 4.2 Database audit log query

```sql
SELECT action, "resourceType", description, "createdAt"
FROM audit_logs
WHERE action IN ('PHI_MIGRATION_BATCH_STARTED',
                 'PHI_MIGRATION_BATCH_COMPLETED',
                 'PHI_MIGRATION_BATCH_FAILED')
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 100;
```

`PHI_MIGRATION_BATCH_COMPLETED` rows arrive ~once per 50 source rows. `PHI_MIGRATION_BATCH_FAILED` should be empty; surface immediately if any appear (safety abort triggered for that target).

### 4.3 KMS API metrics

Watch CloudWatch namespace `AWS/KMS` for the production KMS key. Per-record migration calls `GenerateDataKey` once on encrypt. A 5M-row migration emits ~5M GenerateDataKey calls. Account-level shared quota: 5,500 RPS. Sustained throughput at default config: ~50-100 RPS. Headroom: 55×.

If `ThrottlingException` appears, increase `--pause-ms` to 250-500 and re-run from a fresh dry-run baseline (idempotent on re-run).

### 4.4 Aurora performance metrics

Watch the Aurora writer instance CloudWatch dashboard. ServerlessV2 ACU should remain in 0.5-2 ACU range during the run; if it spikes to ceiling sustained, raise `--pause-ms`.

---

## 5. Post-Run Validation

### 5.1 Re-run `--dry-run` - confirm v0v1=0 across all targets

```bash
PHI_ENVELOPE_VERSION=v2 \
  AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
  npx tsx backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts --dry-run \
  > audit-016-pr3-postcheck-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Inspect: every target's `v0v1` count must be 0; `totalV0V1Before` must be 0. If non-zero, capture exact `(table, column, v0v1_count)` tuples and triage.

### 5.2 Spot-check decryption

For 5 random IDs per target with non-zero `v2` count, run a Prisma `findUnique` and confirm the V2 value decrypts cleanly via the middleware (which routes V2 through `keyRotation.decryptAny` → `kmsService.envelopeDecrypt`):

```bash
npx tsx -e "
import prisma from './backend/src/lib/prisma';
const rec = await prisma.patient.findUnique({ where: { id: 'IDXXXX' }, select: { firstName: true, lastName: true } });
console.log(JSON.stringify(rec, null, 2));
await prisma.\$disconnect();
"
```

The output should be plain decrypted strings (not the `enc:v2:...` envelope - middleware decrypts on read).

### 5.3 Archive summary artifact

The script writes `backend/var/audit-016-pr3-execute-{ISO-timestamp}.json`. Move that file plus the stdout log into the compliance evidence store:

```bash
aws s3 cp backend/var/audit-016-pr3-execute-*.json \
  s3://tailrd-compliance-evidence/AUDIT-016-PR-3/$(date -u +%Y%m%d)/
aws s3 cp audit-016-pr3-execute-prod-*.log \
  s3://tailrd-compliance-evidence/AUDIT-016-PR-3/$(date -u +%Y%m%d)/
```

These artifacts are part of the §164.312(b) audit-control retention requirement; keep for 6 years minimum.

### 5.4 Update register

Edit `docs/audit/AUDIT_FINDINGS_REGISTER.md`: AUDIT-016 status → RESOLVED with full implementation arc complete. Append production execution date, snapshot ID, and counts. Confirm AUDIT-016 PR 3 SHIPPED line + register-flip note are in place.

---

## 6. Closeout

### 6.1 Verify all three sub-PRs are SHIPPED

| Sub-PR | Status | PR |
|---|---|---|
| PR 1 - V0/V1/V2 envelope schema + V1 emission + AUDIT-017 bundle | SHIPPED | #255 |
| PR 2 - V2 envelope emission + kmsService wiring + per-record EncryptionContext | SHIPPED | #258 |
| PR 3 - `migrateRecord()` + V0/V1 → V2 migration script (this) | SHIPPED | (this PR) |

AUDIT-016 register status flips OPEN → RESOLVED at PR 3 merge.

### 6.2 AUDIT-075 re-run requirement

When `AUDIT-075` lands and extends `PHI_FIELD_MAP` / `PHI_JSON_FIELDS` with the additional columns (`errorMessage` × 5 tables, `description` × 2, `notes` × 2, `User.email/firstName/lastName`), this migration script MUST be re-run to migrate the newly-covered columns. AUDIT-075 PR's review checklist will include:

1. Extend `TARGETS` array in `audit-016-pr3-v0v1-to-v2.ts` with the new (table, column) pairs.
2. Re-run `--dry-run` to count V0/V1 candidates in newly-covered columns.
3. Re-run `--execute` on those columns specifically (use `--target` filter to avoid re-scanning already-V2 columns).
4. Update register: AUDIT-075 RESOLVED + AUDIT-016 re-run cross-reference.

This re-run requirement is a known follow-up - capture it explicitly so future AUDIT-075 work doesn't drop coverage.

### 6.3 Future work - `rotateKey()` policy implementation

`keyRotation.rotateKey()` remains a `DesignPhaseStubError` after PR 3. PR 3 is **envelope-format upgrade** (V0/V1 → V2); `rotateKey()` is **ongoing key rotation policy** (rotating the AWS KMS KEK or `PHI_ENCRYPTION_KEY` material per NIST SP 800-57 365-day cycle). Different concept; deferred to a future PR (possibly AUDIT-016 PR 4 or a dedicated AUDIT-XXX) once the operator-side rotation cadence + key-version tracking schema land.

### 6.4 File closeout summary

Capture: snapshot ID, run start/end timestamps, total rows migrated, KMS API call count (from CloudWatch), cost breakdown (KMS pricing × calls), any per-row failures + their root cause. Attach to register entry.

---

## 7. Rollback Procedure

If the script reports any `failed` rows, OR validation step §5.2 fails, OR anomalies surface in CloudWatch:

### 7.1 Restore snapshot (RTO ~30 min on Aurora)

```bash
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier tailrd-production-aurora-restore \
  --snapshot-identifier <snapshot-id-from-§2.1> \
  --engine aurora-postgresql
```

Once the restored cluster is healthy, swap `DATABASE_URL` in Secrets Manager (preserve old VersionId for audit) and force a new ECS task deployment. Reference: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` for the full cutover pattern.

### 7.2 Triage logs

Failed rows are listed in the run's stdout summary `totalsByTarget[].failures` array. Each failure has `{ id, error }`. Cross-reference with CloudWatch `audit_event` entries where `action = 'PHI_MIGRATION_FAILURE'`.

Common failure modes:

| Error pattern | Likely cause | Mitigation |
|---|---|---|
| `integrity check failed` | V0/V1 ciphertext tampered or PHI_ENCRYPTION_KEY mismatch | Investigate ciphertext provenance; do NOT re-run on tampered rows |
| `KMS GenerateDataKey ... ThrottlingException` | KMS RPS quota exceeded | Increase `--pause-ms`; re-run (idempotent) |
| `KMS ... AccessDeniedException` | IAM role lacks `kms:GenerateDataKey` on the key | Fix IAM; re-run |
| `KMS ... KeyNotFoundException` | `AWS_KMS_PHI_KEY_ALIAS` wrong | Fix env; re-run |
| `migrateRecord: encryptWithCurrent did not emit V2` | `PHI_ENVELOPE_VERSION` not `v2` mid-run | Set env correctly; re-run |
| `deadlock detected` | Concurrent writer collision | Schedule off-hours; reduce batch size; re-run |

### 7.3 File post-mortem

Capture: snapshot ID used for rollback, failure mode, time-to-detect, time-to-rollback, blast radius (rows touched before rollback). File as a register entry under the failed-migration-pattern category.

---

## 8. Concurrent-Write Safety

This script does NOT take row-level locks. Concurrent writers can race the migration:

| Race | Outcome |
|---|---|
| Concurrent writer updates a V0/V1 row to a new plaintext value before migration reads it | Detection SQL excludes plaintext; row not in candidate set this run. Will not migrate; AUDIT-022 should encrypt new plaintext on its next run. |
| Concurrent writer V2-encrypts a row between SQL fetch and migrateRecord call | `parseEnvelope` returns V2; migrateRecord skip-and-log path engages; no DB write (D3 race protection). Safe. |
| Concurrent writer updates a V0/V1 row AFTER fetch but BEFORE write | Migration overwrites concurrent write with re-encrypted (now stale) value. **DATA LOSS RISK.** |
| Concurrent writer deletes a V0/V1 row between detection and read | `$executeRawUnsafe` UPDATE matches 0 rows; not surfaced as error. Subsequent run-validation SQL count reflects deletion. |

Mitigation: run during an off-hours window with the application in maintenance mode OR with no writers on PHI tables. If maintenance mode is not feasible, accept the data-loss risk as low-probability and execute. Document operator's choice in the run log.

A future enhancement (separate AUDIT) could add `SELECT ... FOR UPDATE` row-level locking, but that adds DB contention and is out of scope for AUDIT-016 PR 3.

---

## 9. Cross-References

- AUDIT-016 register entry: `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- AUDIT-016 design doc (parent): `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md`
- AUDIT-016 PR 1 SHIPPED 2026-05-07 (PR #255): envelope format + V1 emission + AUDIT-017 bundle
- AUDIT-016 PR 2 SHIPPED 2026-05-07 (PR #258): V2 envelope emission + kmsService wiring + per-record EncryptionContext
- AUDIT-016 PR 3 design refinement note: `docs/architecture/AUDIT_016_PR_3_MIGRATION_JOB_NOTES.md`
- AUDIT-022 sister precedent: `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (legacy JSON PHI backfill)
- AUDIT-015 fail-loud invariants: `backend/src/middleware/phiEncryption.ts`
- AUDIT-013 dual-transport audit logger: `backend/src/middleware/auditLogger.ts`
- AUDIT-075 column-extension follow-up: `docs/audit/AUDIT_FINDINGS_REGISTER.md` (re-run requirement per §6.2)
- HIPAA §164.312(a)(2)(iv) addressable encryption/decryption implementation specification
- HIPAA §164.312(b) audit controls
- NIST SP 800-57 Part 1 Rev 5 cryptoperiod guidance
- Day 10 Aurora cutover precedent: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md`

---

## 10. V2 to V2 EncryptionContext.purpose Rekey (STEP 1.7 attempt-3 path)

### 10.1 Scope

This section covers the V2 to V2 EncryptionContext.purpose rekey path executed via `backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts`. Sections 1 through 9 cover the V0/V1 to V2 envelope-format migration; section 10 covers a downstream architectural correction where V2 envelopes written by the STEP 1.5 migration script under a non-canonical `EncryptionContext.purpose` value are re-encrypted under the canonical production purpose value.

Run section 10 only after sections 1 through 6 have completed cleanly, after STEP 1.7 attempt-2 has surfaced `audit_logs.description decryptError=UnknownError 5/5`, and after the operator has confirmed the architectural cause is the dual-purpose mismatch documented in section 10.2.

### 10.2 Why this exists

STEP 1.5 (Day 11 V0/V1 to V2 migration) wrote V2 envelopes under `EncryptionContext.purpose='phi-migration-v0v1-to-v2'` (per `ENCRYPT_CONTEXT_BASE` in `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`). Production `phiEncryption` middleware uses `EncryptionContext.purpose='phi-encryption'` (per `BASE_ENCRYPT_CONTEXT` in `backend/src/middleware/phiEncryption.ts` line 74). AWS KMS authenticates `EncryptionContext` at decrypt time; any mismatch surfaces as `InvalidCiphertextException` and bubbles through `keyRotation.decryptAny` as `UnknownError`.

STEP 1.7 attempt-2 (Day 12) detected this empirically: production spot-check decrypted 20 of 25 PHI targets successfully and failed 5 of 5 on `audit_logs.description`. Robust-Palantir Fix Option 1B (locked Day 13) re-encrypts every STEP-1.5-touched V2 envelope under the canonical `phi-encryption` purpose. End state is single canonical purpose; no multi-purpose tolerance code in the production hot path; no tech debt.

### 10.3 Pre-flight checks

Run each step in order. Stop if any step fails; do not proceed with `--execute` until all four items are clean. These checks are additive to section 2 pre-flight; do not skip section 2 for the V2 to V2 rekey.

#### 10.3.1 HEAD on main is the rekey-script merge

```powershell
git log --oneline -1
```

Expected: `48930aa fix(audit-016-pr3-step-1-7): keyset cursor + all-skip safety abort closes skip-canonical re-iteration loop on already-canonical V2 targets (#276)`.

#### 10.3.2 ECS production task-def is post-PR-#274

```powershell
aws ecs describe-services `
  --cluster tailrd-production-cluster `
  --services tailrd-production-backend `
  --query "services[0].deployments[0].{Status:status,RolloutState:rolloutState,TaskDef:taskDefinition,DesiredCount:desiredCount,RunningCount:runningCount}" `
  --output json
```

Expected: `TaskDef` ends `tailrd-backend:192`, `Status=PRIMARY`, `RolloutState=COMPLETED`, `DesiredCount=1`, `RunningCount=1`.

#### 10.3.3 Pre-execute Aurora snapshot is preserved

```powershell
aws rds describe-db-cluster-snapshots `
  --db-cluster-snapshot-identifier tailrd-pre-audit-016-pr3-step-1-7-2026-05-12 `
  --query "DBClusterSnapshots[0].{Status:Status,Percent:PercentProgress}" `
  --output json
```

Expected: `Status=available`, `Percent=100`. Do not skip this check; section 10.9 rollback restores from this exact snapshot identifier.

#### 10.3.4 Dry-run candidate count baseline

Run the canonical dry-run via ECS RunTask (operator local machine cannot reach VPC-isolated Aurora; see AUDIT-085).

```powershell
aws ecs run-task `
  --cluster tailrd-production-cluster `
  --task-definition tailrd-backend:192 `
  --launch-type FARGATE `
  --platform-version 1.4.0 `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" `
  --overrides file://runtask-override-rekey-dryrun-fixed.json `
  --output json
```

Override file `runtask-override-rekey-dryrun-fixed.json` (in-image-path discipline applied per section 10.4.1):

```json
{
  "containerOverrides": [
    {
      "name": "tailrd-backend",
      "environment": [
        { "name": "PHI_ENVELOPE_VERSION", "value": "v2" }
      ],
      "command": [
        "npx",
        "tsx",
        "scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts",
        "--dry-run"
      ]
    }
  ]
}
```

Expected dry-run baseline (Day 14): approximately 515,000 V2 candidates across 82 targets. Confirm `totalV2Candidates` is within 10 percent of this baseline before authorizing execute. Inspect the CloudWatch log stream (see section 10.6) for the full summary JSON.

### 10.4 Execute command

Production execute runs via ECS RunTask per the AUDIT-085 Option A pattern. Operator local machine cannot reach VPC-isolated Aurora; ECS RunTask is the only sanctioned path.

```powershell
aws ecs run-task `
  --cluster tailrd-production-cluster `
  --task-definition tailrd-backend:192 `
  --launch-type FARGATE `
  --platform-version 1.4.0 `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" `
  --overrides file://runtask-override-rekey-execute.json `
  --output json
```

Override file `runtask-override-rekey-execute.json` (in-image-path discipline applied per section 10.4.1):

```json
{
  "containerOverrides": [
    {
      "name": "tailrd-backend",
      "environment": [
        { "name": "AUDIT_016_PR3_REKEY_CONFIRMED", "value": "yes" },
        { "name": "PHI_ENVELOPE_VERSION", "value": "v2" }
      ],
      "command": [
        "npx",
        "tsx",
        "scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts",
        "--execute",
        "--batch",
        "50",
        "--pause-ms",
        "100"
      ]
    }
  ]
}
```

Without `AUDIT_016_PR3_REKEY_CONFIRMED=yes` the script exits 1 at the confirmation gate with a pointer to section 10. Without `PHI_ENVELOPE_VERSION=v2` the script exits 1 at pre-flight env validation; `encryptWithCurrent` would otherwise emit V1 and the defense-in-depth re-parse rejects any non-V2 emit.

Expected wall-clock: approximately 30 to 60 minutes on 515,000 records at `--batch 50 --pause-ms 100`. KMS rate-limit headroom: approximately 27x at default config (1 KMS Decrypt + 1 KMS Encrypt call per rekeyed row, approximately 100 to 200 RPS sustained vs the 5,500 RPS account quota).

#### 10.4.1 Path-discipline lesson (Day 14 in-image-path catch)

The production Dockerfile uses `backend/` as the build context; image `WORKDIR` is `/app`. Source path `backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts` becomes in-image path `/app/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts`. The ECS RunTask `command` override must use the in-image path; drop the `backend/` prefix.

```
Source path:    backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts
In-image path:  scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts
```

Day 14 first attempt used the source path verbatim and failed at task start with `tsx: cannot find scripts/migrations/...`. Corrected override file `runtask-override-rekey-dryrun-fixed.json` carries the fix. Sister discipline: the V0/V1 to V2 migration command at section 3.1 runs from operator local where source paths are correct; ECS RunTask overrides require in-image paths.

### 10.5 Graceful-skip discipline

The rekey script auto-skips records already encrypted under the canonical purpose. Per-row decrypt-with-old-purpose probe (purpose `phi-migration-v0v1-to-v2`) is wrapped in try/catch; any failure pattern in the allow-list below routes the row to `rowsSkippedCanonical`, NOT `rowsFailed`:

| KMS / decrypt error | Interpretation | Routing |
|---|---|---|
| `InvalidCiphertextException` | Record already canonical purpose; EncryptionContext mismatch on old-purpose probe | rowsSkippedCanonical |
| `AccessDenied` (decrypt phase) | Record already canonical purpose; KMS rejects old context | rowsSkippedCanonical |
| `integrity check failed` | Record already canonical purpose; AES-GCM authTag mismatch on old context | rowsSkippedCanonical |
| `UnknownError` (KMS wrapper) | Record already canonical purpose; wrapper masked the underlying KMS exception | rowsSkippedCanonical |

The rekey is fully idempotent. Re-running on a column whose rows are all canonical produces `rowsSkippedCanonical=N, rowsRekeyed=0, rowsFailed=0` and exits clean. Re-runs after a partial failure are safe; only unprocessed-or-failed rows attempt a rekey on the next run.

### 10.6 Real-time monitoring

#### 10.6.1 Task lifecycle poll

```powershell
$taskArn = "<paste arn from run-task output>"
aws ecs describe-tasks `
  --cluster tailrd-production-cluster `
  --tasks $taskArn `
  --query "tasks[0].{LastStatus:lastStatus,DesiredStatus:desiredStatus,ExitCode:containers[0].exitCode,StoppedReason:stoppedReason}" `
  --output json
```

Poll every 60 to 90 seconds. `LastStatus` transitions PROVISIONING -> PENDING -> RUNNING -> DEACTIVATING -> STOPPING -> STOPPED. Desired final state: `LastStatus=STOPPED, ExitCode=0`.

#### 10.6.2 CloudWatch Logs

Log group `/ecs/tailrd-production-backend`. Log stream `tailrd-backend/tailrd-backend/<taskId>` where `<taskId>` is the last segment of `taskArn`.

```powershell
$taskId = ($taskArn -split "/")[-1]
aws logs get-log-events `
  --log-group-name /ecs/tailrd-production-backend `
  --log-stream-name "tailrd-backend/tailrd-backend/$taskId" `
  --output json
```

Expected per-batch log line: `PHI_REKEY_BATCH_COMPLETED` with structured fields `target`, `batchIndex`, `rowsRekeyed`, `rowsSkippedCanonical`, `rowsFailed`. Final log line carries the `SUMMARY_ARTIFACT` pointer plus the full JSON envelope (see section 10.10).

#### 10.6.3 KMS API metrics

Watch CloudWatch namespace `AWS/KMS` for the production KMS key alias `alias/tailrd-production-phi`. Per-row rekey calls `Decrypt` once + `Encrypt` once, so 2 KMS calls per rekeyed row. A 515,000-row rekey emits approximately 1,030,000 KMS calls. Account-level shared quota: 5,500 RPS. Sustained throughput at default config: approximately 100 to 200 RPS. Headroom: approximately 27x.

If `ThrottlingException` appears, raise `--pause-ms` to 250 or 500 and re-run from a fresh dry-run baseline (idempotent on re-run; see section 10.5).

### 10.7 STEP 1.7 attempt-3 verification

Post-execute verification re-runs the production spot-check decrypt task. The canonical verification target is `audit_logs.description` (the original STEP 1.7 attempt-2 failure target).

```powershell
aws ecs run-task `
  --cluster tailrd-production-cluster `
  --task-definition tailrd-backend:192 `
  --launch-type FARGATE `
  --platform-version 1.4.0 `
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" `
  --overrides file://runtask-override-step-1-7-spotcheck-execute.json `
  --output json
```

Pass criteria: 25 of 25 PHI targets decrypt-success including `audit_logs.description`. Spot-check summary JSON in CloudWatch logs lists each target with `decryptStatus=success` and `samplesPassed=5/5`.

If any target reports decrypt failure: capture `(table, column, sampleId, errorPattern)` tuples; do NOT re-run the rekey script (it is idempotent and any remaining failures are likely outside the canonical-purpose scope); proceed to section 10.9 rollback.

### 10.8 Post-execute Aurora snapshot (STEP 1.8)

After STEP 1.7 attempt-3 verification passes, capture a post-execute Aurora cluster snapshot. This is the canonical end-of-arc artifact.

```powershell
$ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHHmmssZ")
aws rds create-db-cluster-snapshot `
  --db-cluster-identifier tailrd-production-aurora `
  --db-cluster-snapshot-identifier "tailrd-post-audit-016-pr3-step-1-7-$ts" `
  --tags Key=Purpose,Value=AUDIT-016-PR3-STEP-1-7-post-execute Key=HIPAA,Value=6yr-retention
```

Record snapshot ARN + timestamp in the run log. Sister to section 2.1 snapshot cadence; this snapshot is the audit-trail artifact for the rekey-arc closeout.

### 10.9 Rollback procedure

If STEP 1.7 attempt-3 verification (section 10.7) fails, or if the rekey script reports `rowsFailed > 0` outside the section 10.5 allow-list, restore from the pre-execute snapshot.

#### 10.9.1 Stop the ECS service

```powershell
aws ecs update-service `
  --cluster tailrd-production-cluster `
  --service tailrd-production-backend `
  --desired-count 0
```

Wait for `RunningCount=0` before restoring; concurrent writers during restore corrupt the rolled-back state.

#### 10.9.2 Restore from pre-execute snapshot

```powershell
aws rds restore-db-cluster-from-snapshot `
  --db-cluster-identifier tailrd-production-aurora-restore `
  --snapshot-identifier tailrd-pre-audit-016-pr3-step-1-7-2026-05-12 `
  --engine aurora-postgresql
```

Swap `DATABASE_URL` in Secrets Manager once the restored cluster is healthy (preserve old VersionId for audit). Force a new ECS task deployment. Reference `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` for the full cutover pattern.

#### 10.9.3 Re-cut feature branch for forward fix

```powershell
git fetch origin
git checkout main
git pull
git checkout -b feat/audit-016-pr3-step-1-7-attempt-4
```

File a follow-up register entry capturing: pre-execute snapshot ID, failure mode, time-to-detect, time-to-rollback, blast radius (rows touched before rollback), forward-fix scope.

### 10.10 Summary artifact

The rekey script writes the summary artifact to in-image path `/app/var/audit-016-pr3-v2-rekey-execute-<ISO-timestamp>.json`. The Fargate task filesystem is ephemeral; the artifact is NOT recoverable from disk after task stop.

The full JSON envelope is also emitted to stdout as a single log entry tagged `SUMMARY_ARTIFACT`. Capture the artifact via CloudWatch:

```powershell
$taskId = ($taskArn -split "/")[-1]
aws logs filter-log-events `
  --log-group-name /ecs/tailrd-production-backend `
  --log-stream-names "tailrd-backend/tailrd-backend/$taskId" `
  --filter-pattern "SUMMARY_ARTIFACT" `
  --output json `
  > audit-016-pr3-v2-rekey-execute-summary.json
```

Move the captured JSON plus the full task log into the compliance evidence store:

```powershell
$today = (Get-Date).ToUniversalTime().ToString("yyyyMMdd")
aws s3 cp audit-016-pr3-v2-rekey-execute-summary.json `
  s3://tailrd-compliance-evidence/AUDIT-016-PR-3-STEP-1-7/$today/
```

Sister to section 5.3 archive cadence. Capture the artifact for HIPAA section 164.312(b) audit-control retention; keep for 6 years minimum.

### 10.11 Day 15 rekey defect plus Option A plus B fix

This section captures the Day 15 production-halt defect discovered during the STEP 1.7 attempt-3 execute run, the architectural delta vs the sister script `audit-016-pr3-v0v1-to-v2.ts`, and the two-layer fix (Option A keyset cursor plus Option B all-skip safety abort).

#### 10.11.1 Original bug: skip-canonical re-iteration loop

Symptom: on target 1 of 82 (`audit_logs.description`), the execute run elapsed 2h45min while reporting a `rowsSkippedCanonical` count of 274x the table row count and zero `rowsRekeyed`. No forward progress; the same `description` records were re-fetched and re-skipped each loop iteration.

Root cause: the fetch SQL filter `WHERE description LIKE 'enc:v2:%'` cannot discriminate pre-rekey from post-rekey envelopes because both are byte-identical V2 envelopes (rekey only swaps `EncryptionContext.purpose`, not the envelope-format prefix). On a target that is already 100 percent canonical, every fetch returns the same N rows, every row is skipped (decrypt-context-mismatch on the legacy purpose), the offset never advances past N, and the loop never terminates absent an external bound.

Blast radius: production rekey run on target 1 of 82 was halted at 2h45min wall by operator. No data corruption (skip path is read-only); the defect is a non-progressing fetch loop, not an incorrect-write loop.

#### 10.11.2 Architectural delta vs sister script

`backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` (legacy-to-V2 path) does NOT exhibit this defect because the fetch SQL filter `WHERE description LIKE 'enc:v0:%' OR description LIKE 'enc:v1:%'` produces a SHRINKING candidate set: each successful rekey converts a v0/v1 record into a v2 record, which is then excluded from subsequent fetches. The SQL prefix filter IS a valid progress discriminator for v0/v1-to-v2.

`audit-016-pr3-v2-rekey-purpose.ts` (V2-to-V2 path) cannot rely on this discriminator: pre-rekey and post-rekey envelopes both match `LIKE 'enc:v2:%'`. The candidate set does not shrink as the rekey proceeds; the SQL filter cannot distinguish pending rows from completed rows.

The architectural invariant `sister scripts share fetch-loop progress semantics` was violated because `audit-016-pr3-v2-rekey-purpose.ts` adopted the v0v1 fetch-loop shape verbatim without adapting the candidate-set-advance layer to the V2-to-V2 SQL discriminator gap.

#### 10.11.3 Option A keyset cursor

Fix layer 1: `fetchV2Rows` advances by row id, not by SQL filter contraction.

The fetch SQL gains a keyset clause `WHERE id > $lastFetchedId` (parameterized; empty-string sentinel on first iteration via composed SQL prefix omission). After each fetch, the rekey loop records the largest fetched `id` and passes it as `$lastFetchedId` for the next fetch. Forward progress is guaranteed regardless of whether rekey succeeded, skipped, or failed on each row; the cursor advances on every row consumed.

Implementation: `backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts` `fetchV2Rows` accepts a `lastFetchedId` parameter; SQL composition appends the keyset predicate when the parameter is nonempty. Test coverage: GROUP G `T-REKEY-LOOP-2` asserts the second fetch SQL contains `id > 'rec-bbb'` after the first fetch returned a row with id `rec-bbb`.

#### 10.11.4 Option B all-skip safety abort

Fix layer 2: the rekey loop aborts if a fetch iteration returns rows but every row is recorded as `rowsSkippedCanonical`.

This is the sister of the v0v1 all-fail abort at `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts:571-617`, which aborts if every row in a fetch iteration is recorded as `rowsFailed` (interpreted as a systemic failure mode rather than per-row error noise). The V2-to-V2 sister of that invariant is: every row skipped-canonical in a fetch iteration means the candidate set is fully canonical and there is no further work; abort and report.

Implementation: rekey loop tracks per-iteration skip count; if `rowsSkippedCanonicalInIteration === rows.length` and `rows.length > 0`, the loop emits an `ALL_SKIP_ABORT` log entry and returns. Test coverage: GROUP G `T-REKEY-LOOP-1` asserts a 100 percent already-canonical target terminates in exactly 1 fetch with `rowsAttempted=2`, `rowsSkippedCanonical=2`, `rowsRekeyed=0`, `rowsFailed=0`.

#### 10.11.5 Test class gap closure

GROUP G added to `backend/tests/scripts/migrations/audit-016-pr3-v2-rekey-purpose.test.ts`:

- `T-REKEY-LOOP-1`: 100 percent already-canonical target terminates in 1 iteration via all-skip safety abort. Exactly 1 fetch call.
- `T-REKEY-LOOP-2`: mixed legacy plus canonical; cursor advances past skip-canonical rows. 2 fetch calls. First fetch SQL does NOT contain `id > '`. Second fetch SQL contains `id > 'rec-bbb'`.
- `T-REKEY-LOOP-3`: 0 candidate rows terminates on `rows.length===0` before any rekey call.

Pre-Day-15 coverage gap: GROUPS A through F asserted parseArgs, preFlightValidate, checkRekeyConfirmation, countTarget SQL, fetchV2Rows SQL composition, and rekeyTarget graceful-skip semantics. None of those groups asserted fetch-loop termination invariants on a 100 percent already-canonical target. GROUP G closes that gap.

#### 10.11.6 Sister-pattern invariant-preservation discipline (forward link)

`docs/audit/AUDIT_METHODOLOGY.md §17 PR acceptance criteria` will be amended in a follow-up methodology PR to require sister-script invariant-preservation declaration: when a new migration script is forked from a sister, the PR description must enumerate the invariants the sister relies on, and declare which the new script preserves vs which require an adapted implementation. The Day 15 defect was a missed adaptation of the candidate-set-advance invariant; a forward declaration would have caught the gap at PR review.

#### 10.11.7 DRIFT-32 cross-reference

This defect is logged as DRIFT-32 in `docs/audit/AGENT_DRIFT_REGISTRY.md`. Indicator: sister-pattern adoption gap (SQL discriminator vs post-fetch in-memory discriminator at candidate-set-advance layer). Trigger: production halt at 2h45min on target 1 of 82 with skip count 274x expected row count. Mechanism update: AUDIT_METHODOLOGY.md §17 PR acceptance criteria addition (see 10.11.6).
