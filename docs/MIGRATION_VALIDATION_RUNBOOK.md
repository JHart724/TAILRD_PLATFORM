# Migration validation runbook

**Companion to:** `docs/DMS_MIGRATION_PLAN.md`
**Tool:** `backend/scripts/validateMigration.ts`
**Purpose:** how to run the shadow validator during Waves 1-4, read its output, and act on alarms.

---

## Prerequisites

1. Aurora cluster `tailrd-production-aurora` is `available` (Day 2 complete).
2. Aurora schema applied via `prisma db push` (Phase 3B complete).
3. SNS topic `tailrd-migration-alerts` (`arn:aws:sns:us-east-1:863518424332:tailrd-migration-alerts`) exists with `jhart@hartconnltd.com` subscribed.
4. CloudWatch alarms in namespace `TailrdMigration`:
   - `TailrdMigration-ROW_DIFF_CRITICAL-{table}` for 10 Wave-1-through-Wave-3 tables
   - `TailrdMigration-HASH_MISMATCH_CRITICAL-{table}` for `patients`, `encounters`, `observations`
   - `TailrdMigration-LAG_WARNING` (>30s for 5 min)
   - `TailrdMigration-LAG_CRITICAL` (>60s for 5 min)

Verify with `aws cloudwatch describe-alarms --alarm-name-prefix "TailrdMigration-"`.

---

## Run a single validation cycle

From an ECS one-shot task (recommended, uses backend SG networking):

```bash
# Get the two datasource URLs.
RDS_URL=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text)
AURORA_PW=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/aurora-db-password --query SecretString --output text | jq -r .password)
AURORA_URL="postgresql://tailrd_admin:${AURORA_PW}@tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require"

# Run the validator once.
aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-backend:LATEST \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"tailrd-backend","command":["sh","-c","cd /app && SOURCE_DATABASE_URL='\"$RDS_URL\"' TARGET_DATABASE_URL='\"$AURORA_URL\"' DMS_REPLICATION_TASK_ARN='\"$DMS_TASK_ARN\"' npx tsx /app/scripts/validateMigration.ts"]}]}' \
  --started-by "migration-validate-manual"
```

`DMS_REPLICATION_TASK_ARN` is optional — without it, lag is not measured.

## Run in loop mode (every 5 minutes)

For sustained monitoring during Wave execution, run with `--interval 300`:

```bash
# Same overrides as above but change the command end to:
# ...npx tsx /app/scripts/validateMigration.ts --interval 300
```

The task runs indefinitely; stop with `aws ecs stop-task`.

## Read the output

Each cycle emits one line of structured JSON to stdout (which goes to the `/ecs/tailrd-production-backend` CloudWatch log group):

```json
{
  "event": "migration.validation.cycle",
  "timestamp": "2026-04-20T18:05:00.000Z",
  "tableReports": [
    {"table":"patients","rdsCount":14171,"auroraCount":14171,"rowDiff":0},
    ...
  ],
  "hashReports": [
    {"table":"patients","rdsHash":"abc...","auroraHash":"abc...","hashMatch":true},
    ...
  ],
  "lag": {"dmsTaskArn":"arn:aws:dms:...","replicationLagSeconds":3},
  "metricsPublished": 57
}
```

Human-readable summary on the next line:

```
cycle ok tables=53 row_diff_gt_100=0 hash_mismatches=0 lag_s=3
```

Filter in CloudWatch Logs Insights:

```
fields @timestamp, @message
| filter @message like /"event":"migration.validation.cycle"/
| sort @timestamp desc
| limit 50
```

## What the alarms mean

| Alarm | Threshold | Meaning | Action |
|---|---|---|---|
| `ROW_DIFF_CRITICAL-<table>` | `>100 for 10 min` | That table has >100 rows diverged between RDS and Aurora | Pause wave, run Gate C (FK integrity), investigate |
| `HASH_MISMATCH_CRITICAL-<table>` | `=0 for 5 min` | md5(ids) on RDS ≠ md5(ids) on Aurora on `patients`/`encounters`/`observations` | Pause wave, same IDs are not on both sides. Restart wave from full-load |
| `LAG_WARNING` | `>30s for 5 min` | DMS CDC is falling behind | Check Aurora CPU; scale ACU if needed |
| `LAG_CRITICAL` | `>60s for 5 min` | Hard abort condition per `DMS_MIGRATION_PLAN.md §5` | **Pause wave immediately**, investigate before resuming |

All alarms notify the SNS topic `tailrd-migration-alerts`. Email lands at `jhart@hartconnltd.com`.

## Common scenarios

### Pre-migration (Aurora empty, RDS live)
- Every `row_diff` equals the full RDS row count for that table → every `ROW_DIFF_CRITICAL-*` alarm fires within 10 min.
- This is expected. Disable actions on the alarms (keep evaluation) or acknowledge the noise until Wave 1 starts.

```bash
aws cloudwatch disable-alarm-actions --alarm-names $(aws cloudwatch describe-alarms --alarm-name-prefix "TailrdMigration-ROW_DIFF" --query 'MetricAlarms[*].AlarmName' --output text)
```

Re-enable before Wave 1 starts:

```bash
aws cloudwatch enable-alarm-actions --alarm-names $(aws cloudwatch describe-alarms --alarm-name-prefix "TailrdMigration-ROW_DIFF" --query 'MetricAlarms[*].AlarmName' --output text)
```

### Mid-wave (DMS full-loading)
- `row_diff` for tables in the wave shrinks over time.
- Outside-wave tables stay at their RDS count.
- Hash alarms: no-op during full load (Aurora has partial data).

### Post-wave (validation)
- All row_diff values should be 0 (or within noise band for Wave 3-4 tables under CDC).
- All hash_match values should be 1.
- Lag should be <10 seconds sustained.

### Suspected false positive
- Race between a fresh write on RDS and the next validator cycle can produce a tiny row_diff for 1 cycle.
- If `row_diff` returns to 0 within 10 min, alarm is self-correcting and no action needed.
- If it persists > 10 min → real divergence → follow the plan's §5 abort path.

## Verification — alarms can actually fire

Before production use, prove alarm plumbing end-to-end:

1. Emit a synthetic metric value that exceeds the threshold:
   ```bash
   aws cloudwatch put-metric-data \
     --namespace TailrdMigration \
     --metric-data 'MetricName=migration.row_diff.patients,Dimensions=[{Name=Table,Value=patients}],Value=500,Unit=Count'
   ```
2. Wait 10-15 min for the two 5-min evaluation periods to elapse.
3. `aws cloudwatch describe-alarms --alarm-names TailrdMigration-ROW_DIFF_CRITICAL-patients --query 'MetricAlarms[0].StateValue'` should return `ALARM`.
4. Confirm SNS email delivered.
5. Clear the alarm by emitting a normal value:
   ```bash
   aws cloudwatch put-metric-data \
     --namespace TailrdMigration \
     --metric-data 'MetricName=migration.row_diff.patients,Dimensions=[{Name=Table,Value=patients}],Value=0,Unit=Count'
   ```

Do this once before Wave 1 goes live.

## Out of scope

- **Metric history retention:** CloudWatch custom metrics retain at full granularity for 15 days, 1-min rollups for 63 days, 5-min for 455 days. Fine for migration window; no extra config needed.
- **Metric query cost:** SEARCH()-based dashboards on `TailrdMigration` hit 1M metric streams cheaply. Fine for 53 tables × 2 metrics each.
- **Monitoring the validator itself:** if the validator crashes, no metrics emit, and alarms sit INSUFFICIENT_DATA. We rely on staring at the ECS log stream during active migration. Post-Wave-4, add a heartbeat metric if loop mode stays live.
