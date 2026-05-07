# AUDIT-016 PR 3 — V0/V1 → V2 Envelope Migration Production Runbook

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
- `phi-encryption-key` length = 65 (64 hex chars + newline) — AUDIT-017 validates at module init.
- `PHI_ENVELOPE_VERSION` = `v2`. **Without v2, `encryptWithCurrent` emits V1 instead of V2 — defeats the migration.** PR 3 pre-flight + `migrateRecord` defense-in-depth re-parse will reject a non-V2 emit, but flip the flag first.
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
- Capture `totalV0V1Before` — the number of rows that will migrate.
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

### 5.1 Re-run `--dry-run` — confirm v0v1=0 across all targets

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

The output should be plain decrypted strings (not the `enc:v2:...` envelope — middleware decrypts on read).

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
| PR 1 — V0/V1/V2 envelope schema + V1 emission + AUDIT-017 bundle | SHIPPED | #255 |
| PR 2 — V2 envelope emission + kmsService wiring + per-record EncryptionContext | SHIPPED | #258 |
| PR 3 — `migrateRecord()` + V0/V1 → V2 migration script (this) | SHIPPED | (this PR) |

AUDIT-016 register status flips OPEN → RESOLVED at PR 3 merge.

### 6.2 AUDIT-075 re-run requirement

When `AUDIT-075` lands and extends `PHI_FIELD_MAP` / `PHI_JSON_FIELDS` with the additional columns (`errorMessage` × 5 tables, `description` × 2, `notes` × 2, `User.email/firstName/lastName`), this migration script MUST be re-run to migrate the newly-covered columns. AUDIT-075 PR's review checklist will include:

1. Extend `TARGETS` array in `audit-016-pr3-v0v1-to-v2.ts` with the new (table, column) pairs.
2. Re-run `--dry-run` to count V0/V1 candidates in newly-covered columns.
3. Re-run `--execute` on those columns specifically (use `--target` filter to avoid re-scanning already-V2 columns).
4. Update register: AUDIT-075 RESOLVED + AUDIT-016 re-run cross-reference.

This re-run requirement is a known follow-up — capture it explicitly so future AUDIT-075 work doesn't drop coverage.

### 6.3 Future work — `rotateKey()` policy implementation

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
