# Day 10 Wednesday Execution Runbook

**Date:** 2026-04-29 (Wednesday)
**Operator:** Jonathan Hart
**Companion plan:** `docs/DAY_10_PLAN.md`
**Window target:** Cutover at ~10:00 AM CT (lowest production load), 5-15 min

---

## Why this doc exists

`docs/DAY_10_PLAN.md` is the strategic plan: decisions, phases, risks. This runbook is the executable Wednesday-morning checklist with every command pre-filled against today's verified AWS state.

**Total runtime budget:** 2-3 hours active operator time on Day 10 (cutover + 30-min observation). 24-hour soak. ~1 hour on Day 11 for decommission.

## Pre-cutover production baselines (captured 2026-04-28 evening)

These numbers feed `BASELINE_P95_MS` and `BASELINE_ERROR_RATE` env vars on `postCutoverValidation.js`. Wednesday's post-cutover run compares against these.

| Metric | Value | Source |
|---|---|---|
| ALB p95 latency (last 30 min, 2026-04-28 21:30 UTC) | **400 ms** (max observed 389 ms, rounded up to 400) | CloudWatch `AWS/ApplicationELB.TargetResponseTime` p95 against `app/tailrd-production-alb/12cc0d46828a90ae` |
| Production ERROR/5xx count (last 30 min) | **5** (actual measured 0; floor of 5 to allow noise tolerance) | CloudWatch Logs Insights filter against `/ecs/tailrd-production-backend` |
| Patient count | 6,147 | RDS = Aurora, drift 0 (CDC) |
| Encounter count | 353,512 | RDS = Aurora, drift 0 |
| Observation count | 60 | RDS = Aurora, drift 0 |
| Audit log count | 90 | RDS = Aurora, drift 0 (volatile, ±100 tolerance Wednesday) |
| Login session count | 102 | RDS = Aurora, drift 0 (volatile, ±100 tolerance Wednesday) |

Pass these into the post-cutover env vars on Wednesday:
```bash
export BASELINE_P95_MS=400
export BASELINE_ERROR_RATE=5
```

## Post-cutover validation (~5 min)

After Step 4 cutover deploy completes and READ_ONLY is set back to false:

### Pre-step P0: attach Phase2D-PostCutoverValidation IAM policy

```bash
aws iam put-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-PostCutoverValidation \
  --policy-document file://infrastructure/scripts/phase-2d/phase2d-post-cutover-validation-policy.json

aws iam list-role-policies --role-name tailrd-production-ecs-task
# Expected: Phase2D-PostCutoverValidation appears alongside the baseline policies
```

### Run the validation Fargate one-off

```bash
# Build overrides JSON with baselines + smoke creds
python -c "
import json, os
overrides = {
  'containerOverrides': [{
    'name': 'tailrd-backend',
    'environment': [
      {'name': 'BASELINE_P95_MS', 'value': '400'},
      {'name': 'BASELINE_ERROR_RATE', 'value': '5'},
      {'name': 'SMOKE_TEST_EMAIL', 'value': os.environ['SMOKE_TEST_EMAIL']},
      {'name': 'SMOKE_TEST_PASSWORD', 'value': os.environ['SMOKE_TEST_PASSWORD']},
    ],
    'command': ['sh', '-c', 'cd /app && npm install --no-save --silent pg @aws-sdk/client-database-migration-service @aws-sdk/client-rds @aws-sdk/client-ecs @aws-sdk/client-cloudwatch @aws-sdk/client-cloudwatch-logs @aws-sdk/client-secrets-manager >/tmp/npm.log 2>&1 && node -e \\'const{S3Client,GetObjectCommand}=require(\"@aws-sdk/client-s3\");const fs=require(\"fs\");(async()=>{const c=new S3Client({region:\"us-east-1\"});const r=await c.send(new GetObjectCommand({Bucket:\"tailrd-cardiovascular-datasets-863518424332\",Key:\"migration-artifacts/phase-2d/postCutoverValidation.js\"}));fs.writeFileSync(\"/tmp/v.js\",await r.Body.transformToString())})().catch(e=>{console.error(e.message);process.exit(1)})\\' && NODE_PATH=/app/node_modules node /tmp/v.js']
  }]
}
print(json.dumps(overrides))
" > /tmp/postcut-overrides.json

TASK=$(aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<prod-subnets>],securityGroups=[<prod-sg>],assignPublicIp=DISABLED}" \
  --overrides file:///tmp/postcut-overrides.json \
  --query 'tasks[0].taskArn' --output text)
TASK_ID="${TASK##*/}"
aws ecs wait tasks-stopped --cluster tailrd-production-cluster --tasks "$TASK_ID"

MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-production-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" --since 10m \
  | sed -n '/---POST_CUTOVER_VALIDATION---/,/---END---/p'
```

### Pass condition: `"ready_for_soak": true`

All 7 checks must show `"ok": true` and `"blockers": []`. Warnings are acceptable (review them but don't block).

### If `ready_for_soak: false` (one or more blockers)

Per-check response:
- `database_url_points_at_aurora` block: cutover Step 4.3 didn't take. Re-flip the secret or rollback.
- `backend_reading_aurora` block: Aurora unreachable from production VPC. Investigate SG, route, or revert.
- `modules_respond_healthy` block: backend deploy regression. Check task running SHA matches expected merge.
- `data_integrity_drift` block: row counts mismatched beyond tolerance. **Hard rollback recommended** (data loss risk).
- `read_only_off` block: Step 4.6 didn't fire. Re-deploy with READ_ONLY=false.
- Latency / error blocks: review for transient cutover artifacts; consider rollback if sustained.

If rollback chosen, follow Step 6 of this runbook.

### Pre-step P1: detach Phase2D-PostCutoverValidation IAM policy (MANDATORY)

```bash
aws iam delete-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-PostCutoverValidation

aws iam list-role-policies --role-name tailrd-production-ecs-task
# Phase2D-PostCutoverValidation should NOT appear above
```

The soak monitor uses your operator CLI credentials, NOT the production task role, so the role does not need lingering permissions.

## 24-hour soak window

Once `ready_for_soak: true`, launch the soak monitor:

```bash
export BASELINE_P95_MS=400
export BASELINE_ERROR_RATE=5
export SMOKE_TEST_EMAIL=<the email>
export SMOKE_TEST_PASSWORD=<the password>
export ECS_TASK_DEF=tailrd-backend  # latest revision auto-selected
export ECS_SUBNETS=subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a
export ECS_SG=sg-07cf4b72927f9038f

nohup bash infrastructure/scripts/phase-2d/postCutoverSoakMonitor.sh \
  > /tmp/soak-monitor-launcher.log 2>&1 &
```

The monitor runs 76 invocations across 24 hours on a backoff schedule:
- Hours 0-2: every 5 min (24 invocations) - dense early signal
- Hours 2-6: every 15 min (16 invocations)
- Hours 6-24: every 30 min (36 invocations)

Each invocation produces a JSON verdict appended to `/tmp/soak-monitor-{date}.log`. First failure prints to stderr with `ALERT:` prefix; tail the log to monitor.

After 24 hours:
- 0 failures: declare cutover successful, proceed to Day 11 RDS decommission
- 1-2 transient failures: investigate, likely acceptable
- 3+ or sustained failures: rollback to RDS

## Day 11 follow-up: Aurora minor version upgrade

A minor version upgrade (15.14 -> 15.15) is scheduled by AWS for 2026-05-17 10:00 UTC. This will occur 18 days post-cutover during a normal AWS maintenance window. Decision needed: allow it to proceed (default), reschedule, or take it manually post-Sinai. Not blocking Day 10 cutover. Track on the Day 11 punch list.

## Pre-flight dry run (captured 2026-04-28 evening)

`infrastructure/scripts/phase-2d/preCutoverValidation.js` was executed against pre-cutover production state via Fargate one-off, with the temporary `Phase2D-PreCutoverValidation` IAM policy attached and detached cleanly. Run `ead798c3e02a4cb0a8abf97930fceec0` returned `ready: true` with all 6 checks passing.

| Check | Result |
|---|---|
| `dms_task_status` | running, full load 100%, 22 tables, no failure |
| `dms_table_stats` | 22 tables loaded, 0 incomplete, 0 validationFailed |
| `aurora_cluster` | available, engine 15.14 |
| `aurora_pending_maintenance` | 0 blocking; 1 informational (db-upgrade 15.14 to 15.15 scheduled 2026-05-17 - 18 days post-cutover, see Day 11 follow-up below) |
| `cdc_lag` | no datapoints in 10-min window (low-traffic evening; Wednesday morning will populate) |
| `row_parity` | 0 drift across patients (6,147), observations (60), encounters (353,512), audit_logs (88), login_sessions (100) |

**Wednesday morning expectation:** the same script invocation should also return `ready: true`. Significant deviation (e.g., new pending maintenance, drift > 5 rows on any table, DMS task non-running) means STOP and investigate before proceeding to cutover.

## Pre-step 0: attach Phase2D-PreCutoverValidation IAM policy

The production task role (`tailrd-production-ecs-task`) does not carry the IAM permissions needed to run `preCutoverValidation.js` in steady-state operation. Attach the temporary policy at cutover-window start:

```bash
aws iam put-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-PreCutoverValidation \
  --policy-document file://infrastructure/scripts/phase-2d/phase2d-pre-cutover-validation-policy.json
```

The policy grants exactly: `dms:DescribeReplicationTasks` (account-wide) + `dms:DescribeTableStatistics` on the Wave 2 task ARN, `rds:DescribeDBClusters` on the Aurora cluster, `rds:DescribePendingMaintenanceActions` (account-wide), `cloudwatch:GetMetricStatistics` (account-wide), and `secretsmanager:GetSecretValue` on the 3 production database secrets needed for parity check.

**MANDATORY: detach after cutover.** This policy must NOT remain attached during steady-state operation. Detach as soon as the dry run completes:

```bash
aws iam delete-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-PreCutoverValidation

aws iam list-role-policies --role-name tailrd-production-ecs-task
# Phase2D-PreCutoverValidation should NOT appear above
```

If the detach fails, STOP everything and surface immediately. The role must be clean before any further cutover steps.

## Day 11 follow-up: Aurora minor version upgrade

A minor version upgrade (15.14 -> 15.15) is scheduled by AWS for 2026-05-17 10:00 UTC. This will occur 18 days post-cutover during a normal AWS maintenance window. Decision needed: allow it to proceed (default), reschedule, or take it manually post-Sinai. Not blocking Day 10 cutover. Track on the Day 11 punch list.

---

**Pre-verified parameters captured 2026-04-28:**

| Resource | Value |
|---|---|
| RDS endpoint (current production) | `tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com` |
| Aurora writer endpoint | `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` |
| Aurora reader endpoint | `tailrd-production-aurora.cluster-ro-csp0w6g8u5uq.us-east-1.rds.amazonaws.com` |
| Aurora master password secret | (operator pulls at cutover time, do not store in runbook) |
| ECS cluster | `tailrd-production-cluster` |
| ECS service | `tailrd-production-backend` |
| DMS replication task ARN | `arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA` |

---

## Step 1 - Pre-flight (T-30 min, ~15 min runtime)

### 1.1 CDC lag and parity

```bash
# DMS task status
aws dms describe-replication-tasks \
  --filters Name=replication-task-arn,Values=arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA \
  --query 'ReplicationTasks[0].{Status:Status,FullLoadProgress:ReplicationTaskStats.FullLoadProgressPercent,TablesLoaded:ReplicationTaskStats.TablesLoaded,LastFailure:LastFailureMessage}' \
  --output json

# Per-table validation
aws dms describe-table-statistics \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA \
  --query 'TableStatistics[].{Schema:SchemaName,Table:TableName,FullLoadEnd:FullLoadEndTime,Inserts:Inserts,Updates:Updates,Deletes:Deletes,ValidationFailed:ValidationFailedRecords}' \
  --output table | head -30
```

**Pass conditions:**
- Status: `running`
- FullLoadProgress: `100`
- TablesLoaded: `22`
- LastFailure: `null`
- All tables show `FullLoadEnd` populated and `ValidationFailedRecords=0`

### 1.2 Row-count parity spot-check (5 highest-write tables)

Use the same Fargate one-off pattern that `applyAuroraSchemaParity.js` uses. Quick inline version:

```bash
# Pull DATABASE_URL for current production (RDS) and Aurora separately
RDS_URL=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text)
AURORA_PW=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/aurora-db-password --query SecretString --output text | python -c "import sys,json; print(json.load(sys.stdin)['password'])" 2>/dev/null || aws secretsmanager get-secret-value --secret-id tailrd-production/app/aurora-url --query SecretString --output text | sed -E 's|.*//[^:]+:([^@]+)@.*|\1|')
AURORA_URL="postgresql://tailrd_admin:${AURORA_PW}@tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require"

# Launch parity check Fargate task (re-uses production task def, overrides command)
# Build overrides JSON via Python so escaping is sane
python -c "
import json
script = '''const{Client}=require(\"pg\");(async()=>{const tables=[\"Patient\",\"Observation\",\"Encounter\",\"AuditLog\",\"LoginSession\"];const r=new Client({connectionString:process.env.RDS_URL});const a=new Client({connectionString:process.env.AURORA_URL});await r.connect();await a.connect();for(const t of tables){const[rr,ar]=await Promise.all([r.query(\\`SELECT COUNT(*) FROM \\\"\\${t}\\\"\\`),a.query(\\`SELECT COUNT(*) FROM \\\"\\${t}\\\"\\`)]);const rc=parseInt(rr.rows[0].count),ac=parseInt(ar.rows[0].count);const drift=rc-ac;console.log(\\`\\${t}: RDS=\\${rc} AURORA=\\${ac} DRIFT=\\${drift}\\`)}await r.end();await a.end()})().catch(e=>{console.error(\"FAIL\",e.message);process.exit(1)})'''
o = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'RDS_URL','value':'__RDS__'},{'name':'AURORA_URL','value':'__AURORA__'}],'command':['sh','-c',f'cd /app && node -e \"{script}\" && echo PARITY_DONE']}]}
print(json.dumps(o))
" > /tmp/parity-overrides.json

# Replace placeholders (avoids embedding secrets in the python invocation)
sed -i "s|__RDS__|$RDS_URL|; s|__AURORA__|$AURORA_URL|" /tmp/parity-overrides.json

# Run
aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-production-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<production-private-subnets>],securityGroups=[<production-task-sg>],assignPublicIp=DISABLED}" \
  --overrides file:///tmp/parity-overrides.json
```

**Pass conditions:** DRIFT in [-5, +5] for each of the 5 tables (CDC catch-up tolerance).

**STOP if:** DRIFT > 100 on any table, or task fails.

### 1.3 Aurora capacity check

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=tailrd-production-aurora \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum,Minimum
```

**Pass conditions:** Maximum > 0.5 over the last 24h (cluster has been actively running, not cold-started).

### 1.4 Production health
```bash
curl -s -m 10 https://api.tailrd-heart.com/health | python -m json.tool
```

**Pass conditions:** `status=healthy`, environment=production, uptime > 3600s (no recent restarts in flight).

### 1.5 Operator check

- Slack/PagerDuty in front of you
- This terminal locked to no other shell work
- 2-hour calendar block held

---

## Step 2 - Snapshot pre-cutover state (T-15 min)

```bash
# RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier tailrd-production-postgres \
  --db-snapshot-identifier tailrd-production-postgres-pre-cutover-2026-04-29

# Aurora cluster snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier tailrd-production-aurora \
  --db-cluster-snapshot-identifier tailrd-production-aurora-pre-cutover-2026-04-29

# Wait for both to reach available
aws rds wait db-snapshot-available \
  --db-snapshot-identifier tailrd-production-postgres-pre-cutover-2026-04-29 &
aws rds wait db-cluster-snapshot-available \
  --db-cluster-snapshot-identifier tailrd-production-aurora-pre-cutover-2026-04-29 &
wait
echo "Both snapshots available."
```

**Capture the original RDS DATABASE_URL value** (write it down or save to a local file). This is the rollback target.

```bash
ORIGINAL_DB_URL=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text)
echo "$ORIGINAL_DB_URL" > ~/tailrd-rollback-url.txt
chmod 600 ~/tailrd-rollback-url.txt
```

---

## Step 3 - Pre-warm Aurora ACU (T-10 min, ~5 min)

Run a SELECT-heavy load against Aurora so ACU climbs to 1.0+ before live writes hit. Avoids first-write latency spike.

```bash
python -c "
import json
script = '''const{Client}=require(\"pg\");(async()=>{const c=new Client({connectionString:process.env.AURORA_URL});await c.connect();const start=Date.now();while(Date.now()-start<300000){await c.query(\\`SELECT COUNT(*) FROM \\\"Patient\\\"; SELECT COUNT(*) FROM \\\"Observation\\\";\\`)}await c.end();console.log(\"WARMUP_DONE\")})().catch(e=>{console.error(\"FAIL\",e.message);process.exit(1)})'''
o = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'AURORA_URL','value':'__AURORA__'}],'command':['sh','-c',f'cd /app && node -e \"{script}\"']}]}
print(json.dumps(o))
" > /tmp/warmup-overrides.json
sed -i "s|__AURORA__|$AURORA_URL|" /tmp/warmup-overrides.json

aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-production-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<production-private-subnets>],securityGroups=[<production-task-sg>],assignPublicIp=DISABLED}" \
  --overrides file:///tmp/warmup-overrides.json \
  --query 'tasks[0].taskArn' --output text
```

Watch ACU climb in CloudWatch console for `tailrd-production-aurora` cluster. Proceed when current ACU > 1.0.

---

## Step 4 - Cutover execution (T0)

Path A (maintenance window, recommended).

### 4.1 Flip read-only flag (env var on task def)

The `READ_ONLY` env var is wired through `backend/src/middleware/readOnly.ts`. To flip it on:

```bash
# Pull the current task def
aws ecs describe-task-definition \
  --task-definition tailrd-production-backend \
  --query 'taskDefinition' --output json > /tmp/td-current.json

# Build a new revision with READ_ONLY=true added to environment, stripping
# task def metadata that register-task-definition doesn't accept
python -c "
import json
with open('/tmp/td-current.json') as f: td = json.load(f)
for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']:
    td.pop(k, None)
env = td['containerDefinitions'][0].get('environment') or []
env = [e for e in env if e['name'] != 'READ_ONLY']
env.append({'name':'READ_ONLY','value':'true'})
td['containerDefinitions'][0]['environment'] = env
with open('/tmp/td-readonly.json','w') as f: json.dump(td, f)
"

NEW_REV=$(aws ecs register-task-definition --cli-input-json file:///tmp/td-readonly.json \
  --query 'taskDefinition.taskDefinitionArn' --output text)
echo "Read-only task def: $NEW_REV"

# Update service to the read-only revision
aws ecs update-service \
  --cluster tailrd-production-cluster \
  --service tailrd-production-backend \
  --task-definition "$NEW_REV"

aws ecs wait services-stable \
  --cluster tailrd-production-cluster \
  --services tailrd-production-backend
```

After tasks stabilize, all non-GET requests except `/api/auth/login` return 503 + `Retry-After: 60`.

### 4.2 Stop DMS replication task

```bash
aws dms stop-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA

# Wait for Stopped
until [ "$(aws dms describe-replication-tasks --filters Name=replication-task-arn,Values=arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA --query 'ReplicationTasks[0].Status' --output text)" = "stopped" ]; do
  echo "$(date) DMS still stopping..."
  sleep 10
done
echo "DMS stopped."
```

### 4.3 Update Secrets Manager DATABASE_URL

```bash
NEW_URL="postgresql://tailrd_admin:${AURORA_PW}@tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require"

aws secretsmanager update-secret \
  --secret-id tailrd-production/app/database-url \
  --secret-string "$NEW_URL"

# Mask-verify
aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url --query SecretString --output text | sed -E 's|//([^:]+):[^@]+@|//\1:***@|'
```

### 4.4 Force-new-deployment

```bash
aws ecs update-service \
  --cluster tailrd-production-cluster \
  --service tailrd-production-backend \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster tailrd-production-cluster \
  --services tailrd-production-backend
echo "ECS stable on new task def."
```

### 4.5 Smoke test

```bash
# Health
curl -s -m 10 https://api.tailrd-heart.com/health | python -m json.tool

# Login (use a known admin account)
curl -s -m 10 -X POST https://api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"JHart@tailrd-heart.com","password":"<known>"}' | python -m json.tool

# Pull running task SHA to confirm new deploy
TASK=$(aws ecs list-tasks --cluster tailrd-production-cluster --service-name tailrd-production-backend --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster tailrd-production-cluster --tasks "$TASK" \
  --query 'tasks[0].{taskDef:taskDefinitionArn,startedAt:startedAt}' --output json

# HF dashboard probe (only fully-wired module)
curl -s -m 15 -H "Authorization: Bearer <token-from-login>" \
  https://api.tailrd-heart.com/api/heart-failure/dashboard?hospitalId=demo-medical-city-dallas | python -m json.tool | head -30
```

**Pass conditions:** All return 200 with expected JSON shape. Login succeeds.

**STOP if any fails:** trigger rollback (Step 6).

### 4.6 Flip read-only flag off

(If Path A was usable, otherwise N/A.)

---

## Step 5 - Post-cutover validation (T+5 to T+30 min)

```bash
# Aurora connection count climbing
python -c "
import json
script = '''const{Client}=require(\"pg\");(async()=>{const c=new Client({connectionString:process.env.AURORA_URL});await c.connect();const r=await c.query(\\`SELECT numbackends FROM pg_stat_database WHERE datname='tailrd'\\`);console.log(\"AURORA_BACKENDS=\"+r.rows[0].numbackends);await c.end()})()'''
o = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'AURORA_URL','value':'__AURORA__'}],'command':['sh','-c',f'node -e \"{script}\"']}]}
print(json.dumps(o))
" > /tmp/conn-check.json
sed -i "s|__AURORA__|$AURORA_URL|" /tmp/conn-check.json

# Run periodically (every 5 min for 30 min)
for i in 1 2 3 4 5 6; do
  aws ecs run-task --cluster tailrd-production-cluster --task-definition tailrd-production-backend \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[<prod-subnets>],securityGroups=[<prod-sg>],assignPublicIp=DISABLED}" \
    --overrides file:///tmp/conn-check.json --query 'tasks[0].taskArn' --output text
  sleep 300
done

# CloudWatch error count
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-production-backend --since 30m --filter-pattern "ERROR" | wc -l

# RDS connection count drops
# (Requires a Fargate one-off similar to Aurora, against RDS this time. Should drop to ~0 within 5 min.)
```

**Acceptance:**
- AURORA_BACKENDS climbs from ~0 to 5-15 within 60s
- RDS BACKENDS drops to ~0 within 5 min
- CloudWatch ERROR count for last 30 min < 5 (baseline noise)

---

## Step 6 - Rollback (only if Step 4-5 fails)

```bash
# 1. Restore the original DATABASE_URL
aws secretsmanager update-secret \
  --secret-id tailrd-production/app/database-url \
  --secret-string "$(cat ~/tailrd-rollback-url.txt)"

# 2. Force-new-deployment back onto RDS
aws ecs update-service \
  --cluster tailrd-production-cluster \
  --service tailrd-production-backend \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster tailrd-production-cluster \
  --services tailrd-production-backend

# 3. Restart DMS
aws dms start-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA \
  --start-replication-task-type resume-processing

# 4. Smoke against RDS
curl -s -m 10 https://api.tailrd-heart.com/health
```

After rollback: do NOT retry cutover the same day. Triage what failed, fix, re-plan for the following Wednesday.

---

## Step 7 - Day 11 RDS decommission (24h after Step 5 acceptance)

**Wait 24h. No exceptions.**

```bash
# Final snapshot for HIPAA retention
aws rds create-db-snapshot \
  --db-instance-identifier tailrd-production-postgres \
  --db-snapshot-identifier tailrd-production-postgres-final-2026-04-30

aws rds wait db-snapshot-available \
  --db-snapshot-identifier tailrd-production-postgres-final-2026-04-30

# Tag for 365-day retention via lifecycle policy or note in CLAUDE.md

# Disable deletion protection
aws rds modify-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --no-deletion-protection \
  --apply-immediately

# Delete RDS instance
aws rds delete-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --skip-final-snapshot
# (we already took the final snapshot in 7.1)

# Delete DMS task
aws dms delete-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA

# Delete DMS replication instance
DMS_INST=$(aws dms describe-replication-instances --query 'ReplicationInstances[?ReplicationInstanceIdentifier==`tailrd-dms`].ReplicationInstanceArn' --output text)
aws dms delete-replication-instance --replication-instance-arn "$DMS_INST"

# Delete Lambda rollback function
aws lambda delete-function --function-name tailrd-production-aurora-rollback

# Update CLAUDE.md "Last known working task definition" with the post-cutover task def
```

---

## Acceptance checklist

### Day 10 (cutover)
- [ ] Pre-flight 1.1-1.5 all green
- [ ] Pre-cutover snapshots `available`
- [ ] Aurora pre-warmed to ACU > 1.0
- [ ] DMS task `stopped`
- [ ] DATABASE_URL points at Aurora writer in Secrets Manager
- [ ] ECS service stable on new task def
- [ ] Health, login, HF dashboard smoke 200
- [ ] Aurora connection count climbing
- [ ] No 5xx spike in 30 min
- [ ] CLAUDE.md updated with new task def number

### Day 11 (decommission, 24h after acceptance)
- [ ] 24h soak clean (no errors, no rollbacks)
- [ ] Final RDS snapshot taken with 365-day retention noted
- [ ] RDS instance deleted
- [ ] DMS task + instance deleted
- [ ] Lambda rollback deleted
- [ ] AWS bill verified to drop next billing day

---

## Open questions resolved (2026-04-28)

1. **Read-only feature flag - RESOLVED**: a production-grade `READ_ONLY` middleware (`backend/src/middleware/readOnly.ts`) was authored and shipped. When `READ_ONLY=true` is set on the task def, all non-GET requests get a 503 + Retry-After. GET, /api/auth/login, HEAD, and OPTIONS bypass. Path A is now viable: pre-cutover, set `READ_ONLY=true` on the task def via a new revision and force-new-deployment; post-cutover, revert to `READ_ONLY=false` and deploy again.

2. **Aurora password secret name - RESOLVED**: the correct secret is `tailrd-production/app/aurora-db-password` (NOT `tailrd-production/rds/aurora-password` as the original draft said). Verified via `aws secretsmanager list-secrets`. Endpoints are also pre-stored: `aurora-writer-endpoint`, `aurora-reader-endpoint`, `aurora-proxy-endpoint`.

3. **Production task def MinimumHealthyPercent**: snapshot of task def 106 saved to `/c/Users/JHart/AppData/Local/Temp/tailrd-backend-106-snapshot.json`. Service deployment configuration must be confirmed at cutover time via `aws ecs describe-services`.

4. **PHI key continuity - CONFIRMED**: production task def 106 references `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/phi-encryption-key-ktvX7y`. The post-cutover task def MUST keep this same secret ARN. Aurora rows migrated by DMS contain bytes encrypted with this exact key; rotating the key during cutover would render every PHI field undecryptable. Pre-cutover safety check (Step 1.6 below) verifies the new task def references the same ARN.

## Step 1.6 - PHI key continuity safety check (NEW, run before Step 4 cutover)

```bash
# Pull current production task def's PHI key ARN
CURRENT_PHI=$(aws ecs describe-task-definition \
  --task-definition tailrd-production-backend \
  --query 'taskDefinition.containerDefinitions[0].secrets[?name==`PHI_ENCRYPTION_KEY`].valueFrom' \
  --output text)
echo "Current PHI key ARN: $CURRENT_PHI"

# When registering the new task def for cutover, the JSON for this entry MUST be identical:
#   { "name": "PHI_ENCRYPTION_KEY", "valueFrom": "$CURRENT_PHI" }
# Save this for the cutover task def diff:
echo "$CURRENT_PHI" > ~/tailrd-phi-key-arn.txt
```

**STOP if** the cutover task def references a different `PHI_ENCRYPTION_KEY` ARN. The DATABASE_URL change is the only secret reference allowed to change.

## Pre-cutover automated validation

Before Step 4 cutover, run the automated validation script:

```bash
# Upload the script to S3 (one-time, or after any update)
aws s3 cp infrastructure/scripts/phase-2d/preCutoverValidation.js \
  s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/phase-2d/preCutoverValidation.js

# Run via Fargate one-off using production task definition (already has DMS, RDS, SM, CW perms)
TASK_ARN=$(aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-production-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<prod-subnets>],securityGroups=[<prod-sg>],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "tailrd-backend",
      "command": ["sh", "-c", "cd /app && npm install --no-save --silent pg @aws-sdk/client-database-migration-service @aws-sdk/client-rds @aws-sdk/client-secrets-manager @aws-sdk/client-cloudwatch >/dev/null && node -e \"const{S3Client,GetObjectCommand}=require('"'"'@aws-sdk/client-s3'"'"');const fs=require('"'"'fs'"'"');(async()=>{const c=new S3Client({region:'"'"'us-east-1'"'"'});const r=await c.send(new GetObjectCommand({Bucket:'"'"'tailrd-cardiovascular-datasets-863518424332'"'"',Key:'"'"'migration-artifacts/phase-2d/preCutoverValidation.js'"'"'}));fs.writeFileSync('"'"'/tmp/v.js'"'"',await r.Body.transformToString())})()\" && NODE_PATH=/app/node_modules node /tmp/v.js"]
    }]
  }' \
  --query 'tasks[0].taskArn' --output text)

# Wait + pull verdict
aws ecs wait tasks-stopped --cluster tailrd-production-cluster --tasks "$TASK_ARN"
TASK_ID="${TASK_ARN##*/}"
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-production-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" \
  --since 10m | sed -n '/---PRE_CUTOVER_VALIDATION---/,/---END---/p'
```

**Pass condition:** Output JSON has `"ready": true` and `"blockers": []`. Anything else: STOP.

The script automates checks documented as 1.1-1.3 above. Step 1.4 (production health) and 1.5 (operator readiness) remain manual.
