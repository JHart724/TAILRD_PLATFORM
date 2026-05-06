# AUDIT-022 — Legacy JSON PHI Backfill Production Runbook

**Status:** Operator-ready
**Owner:** Security / Compliance lead
**Last reviewed:** 2026-05-07
**Cross-references:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-022), `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md`, HIPAA §164.312(a)(2)(iv) addressable encryption/decryption implementation specification

---

## 1. Purpose + Scope

AUDIT-022 finds pre-encryption-rollout JSON values (objects, arrays, unencrypted strings) sitting in PHI-marked JSON columns. Per `backend/src/middleware/phiEncryption.ts` PHI_JSON_FIELDS, these columns must hold AES-256-GCM-encrypted envelopes (`enc:<iv>:<authTag>:<ciphertext>` after JSON-stringification) to satisfy HIPAA §164.312(a)(2)(iv).

This script reads each legacy row, hands the value back to Prisma `update`, and lets the existing `applyPHIEncryption` middleware encrypt-on-write. Detection SQL excludes any row whose JSON text already starts with `"enc:`, so re-runs are idempotent.

**Coverage:** 28 (table, column) pairs across 15 models (drift-corrected from 30 — see §17.1 reframing in PR body. The 2 stale entries `RiskScoreAssessment.inputs` and `InterventionTracking.outcomes` were removed from PHI_JSON_FIELDS in this PR).

**Envelope version:** V0 (legacy `enc:iv:authTag:ciphertext`). AUDIT-016 PR 3 will re-encrypt to V1 (KMS-wrapped DEK) once the rotation pipeline ships. V0 → V1 migration is independent of AUDIT-022.

**Concurrent-write safety:** the script does NOT take row-level locks. Operator must schedule execution in an off-hours window with no concurrent writers to PHI_JSON_FIELDS columns. Idempotent re-run handles partial-failure recovery.

---

## 2. Pre-flight Checklist

Run each step in order. Stop if any step fails; do not proceed with `--execute` until all pre-flight items are clean.

### 2.1 Take a fresh RDS snapshot of production Aurora

```bash
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier tailrd-production-aurora \
  --db-cluster-snapshot-identifier "tailrd-production-aurora-pre-audit-022-$(date -u +%Y%m%dT%H%M%SZ)" \
  --tags Key=Purpose,Value=AUDIT-022-pre-execute Key=HIPAA,Value=6yr-retention
```

Record snapshot ARN + timestamp in your run log. Recovery RTO from snapshot is ~15-30 min on Aurora.

### 2.2 Verify production env vars

Confirm `PHI_ENCRYPTION_KEY` and `DATABASE_URL` are set in the production task definition / Secrets Manager:

```bash
aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text | head -c 30
aws secretsmanager get-secret-value --secret-id tailrd-production/app/phi-encryption-key --query SecretString --output text | wc -c
```

Expected: `phi-encryption-key` length is 65 (64 hex chars + newline). If different length, the script's pre-flight will warn — do not proceed without spot-checking with `--target` first.

### 2.3 Run `--dry-run` and capture per-target counts

```bash
npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts --dry-run \
  > audit-022-dryrun-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Inspect the JSON envelope at the bottom of the log:

- Confirm `targetsScanned` = 28 (post-cleanup) and `targetsSkipped` = 0
- Capture `totalLegacyBefore` — the operator should know this number before proceeding
- Confirm `cleanForCloseout` = false (always false in dry-run; this is expected)

### 2.4 Confirm dry-run counts are reasonable

Compare `totalLegacyBefore` to historical evidence. The 2026-04-30 snapshot in the AUDIT-022 register entry showed 243 rows. Drift over time is expected — but if the count differs by >2x without explanation, pause and investigate before proceeding.

### 2.5 Schedule execution during a low-traffic window

Recommended: 02:00-04:00 UTC weekday or weekend. The migration takes ~1 row/second per default `--pause-ms 100`; 243 rows ≈ 4 min wall clock plus per-batch overhead.

---

## 3. Execution

### 3.1 Run with confirmation gate set

```bash
AUDIT_022_EXECUTE_CONFIRMED=yes \
  npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts \
    --execute --batch 50 --pause-ms 100 \
    > audit-022-execute-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Without `AUDIT_022_EXECUTE_CONFIRMED=yes` the script exits 1 immediately with a pointer to this runbook.

### 3.2 Expected output

```
PREFLIGHT_WARN: ...   (if PHI_ENCRYPTION_KEY length != 64)
═══════════════════════════════════════════════════════════════════
  WARNING: AUDIT-022 --execute modifies PHI data in-place.
  ...
═══════════════════════════════════════════════════════════════════

DONE   webhook_events.rawPayload: legacy 0→0 encrypted N→N attempted=0 succeeded=0 failed=0
LEGACY alerts.triggerData: legacy 12→0 encrypted 47→59 attempted=12 succeeded=12 failed=0
...
SUMMARY_ARTIFACT: backend/var/audit-022-execute-2026-05-NNTHH-MM-SS-NNNZ.json
---AUDIT_022_LEGACY_JSON_BACKFILL---
{
  ...
  "summary": {
    "targetsScanned": 28,
    "targetsSkipped": 0,
    "totalLegacyBefore": 243,
    "totalRowsAttempted": 243,
    "totalRowsSucceeded": 243,
    "totalRowsFailed": 0,
    "cleanForCloseout": true
  }
}
---END---
```

### 3.3 Per-row pacing

The script sleeps `--pause-ms` between batches and between targets. Default 100ms. Increase to 500-1000ms if production observes elevated latency during the run.

---

## 4. Monitoring During the Run

### 4.1 CloudWatch Logs filter

```
filter @message like /audit_event/
| filter description like /AUDIT-022/
| stats count() as rows_per_minute by bin(1m)
```

Expected rate: 5-10 rows per minute at default `--pause-ms 100` (limited by per-row Prisma round-trip + middleware encrypt cost). Investigate if rate stalls for >2 minutes.

### 4.2 Database audit log query

```sql
SELECT action, "resourceType", description, "createdAt"
FROM audit_logs
WHERE action IN ('PHI_BACKFILL_BATCH', 'PHI_BACKFILL_ROW_FAILED')
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 100;
```

`PHI_BACKFILL_BATCH` rows arrive ~once per 50 source rows. `PHI_BACKFILL_ROW_FAILED` should be empty; surface immediately if any appear.

### 4.3 Aurora performance metrics

Watch the Aurora writer instance CloudWatch dashboard. ServerlessV2 ACU should remain in 0.5-2 ACU range during the run; if it spikes to ceiling (4 ACU) sustained, raise `--pause-ms` and re-run.

---

## 5. Post-Run Validation

### 5.1 Re-run `--dry-run` — confirm legacy=0 across all targets

```bash
npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts --dry-run \
  > audit-022-postcheck-prod-$(date -u +%Y%m%dT%H%M%SZ).log 2>&1
```

Inspect: every target's `legacy` count must be 0; `totalLegacyBefore` must be 0. If non-zero, capture the exact `(table, column, legacy_count)` tuples and triage.

### 5.2 Spot-check decryption

For 5 random IDs per target with non-zero `encrypted` count, run a Prisma `findUnique` and confirm the JSON value decrypts cleanly (the middleware will throw if integrity check fails per AUDIT-015 fail-loud invariants):

```bash
npx tsx -e "
import prisma from './backend/src/lib/prisma';
const rec = await prisma.alert.findUnique({ where: { id: 'IDXXXX' }, select: { triggerData: true } });
console.log(JSON.stringify(rec, null, 2));
await prisma.\$disconnect();
"
```

The output should be a plain JSON value (not the `enc:...` envelope — middleware decrypts on read).

### 5.3 Archive summary artifact

The script writes `backend/var/audit-022-execute-{ISO-timestamp}.json`. Move that file plus the stdout log into the compliance evidence store:

```bash
aws s3 cp backend/var/audit-022-execute-*.json \
  s3://tailrd-compliance-evidence/AUDIT-022/$(date -u +%Y%m%d)/
aws s3 cp audit-022-execute-prod-*.log \
  s3://tailrd-compliance-evidence/AUDIT-022/$(date -u +%Y%m%d)/
```

These artifacts are part of the §164.312(b) audit-control retention requirement; keep for 6 years minimum.

### 5.4 Update register

Edit `docs/audit/AUDIT_FINDINGS_REGISTER.md`: AUDIT-022 status → RESOLVED, append production execution date, snapshot ID, and counts.

---

## 6. Rollback Procedure

If the script reports any `failed` rows, OR validation step §5.2 fails, OR anomalies surface in CloudWatch:

### 6.1 Restore snapshot (RTO ~30 min on Aurora)

```bash
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier tailrd-production-aurora-restore \
  --snapshot-identifier <snapshot-id-from-§2.1> \
  --engine aurora-postgresql
```

Once the restored cluster is healthy, swap `DATABASE_URL` in Secrets Manager (preserve old VersionId for audit) and force a new ECS task deployment. Reference: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` for the full cutover pattern.

### 6.2 Triage logs

Failed rows are listed in the run's stdout summary `totalsByTarget[].failures` array. Each failure has `{ id, error }`. Cross-reference with CloudWatch `audit_event` entries where `action = 'PHI_BACKFILL_ROW_FAILED'`.

### 6.3 File post-mortem

Capture: snapshot ID used for rollback, failure mode, time-to-detect, time-to-rollback, blast radius (rows touched before rollback). File as a register entry under the failed-migration-pattern category.

---

## 7. Concurrent-Write Safety

This script does NOT take row-level locks. Concurrent writers can race the migration:

| Race | Outcome |
|---|---|
| Concurrent writer updates a legacy row to a new plaintext value before migration reads it | Migration reads new plaintext, encrypts new plaintext, writes back. New value is preserved + encrypted. Safe. |
| Concurrent writer updates a legacy row AFTER migration has read it but BEFORE migration writes it | Migration overwrites concurrent write with the (now stale) legacy value. **DATA LOSS RISK.** |
| Concurrent writer deletes a legacy row between detection and read | Script catches `findUnique` returning null, logs and continues. Safe. |
| Concurrent writer encrypts a row directly (e.g., via existing app code) | Detection SQL excludes encrypted rows on next batch fetch; no double-encryption. Safe. |

Mitigation: run during an off-hours window with the application in maintenance mode OR with no writers on PHI_JSON_FIELDS tables. If maintenance mode is not feasible, accept the data-loss risk as low-probability and execute. Document operator's choice in the run log.

A future enhancement (separate AUDIT) could add `SELECT ... FOR UPDATE` row-level locking, but that adds DB contention and is out of scope for AUDIT-022.

---

## 8. Cross-References

- AUDIT-022 register entry: `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- AUDIT-016 design doc (V0 → V1 envelope migration): `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md`
- AUDIT-015 fail-loud invariants: `backend/src/middleware/phiEncryption.ts`
- AUDIT-013 dual-transport audit logger: `backend/src/middleware/auditLogger.ts`
- HIPAA §164.312(a)(2)(iv) addressable encryption/decryption implementation specification
- HIPAA §164.312(b) audit controls
- Day 10 Aurora cutover precedent: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md`
