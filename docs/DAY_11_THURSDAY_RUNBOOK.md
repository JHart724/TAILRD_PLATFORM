# Day 11 Thursday Execution Runbook

**Date:** 2026-04-30 (Thursday, ~24h after Day 10 cutover)
**Operator:** Jonathan Hart
**Companion plan:** `docs/DAY_11_PLAN.md`
**Window target:** Decommission start at ~10:00 AM CT, ~1.5-2 hours active

---

## Why this doc exists

`docs/DAY_11_PLAN.md` is the strategic plan. This runbook is the Thursday-morning checklist with every command pre-filled against verified 2026-04-28 evening AWS state. By Thursday, Aurora has been serving production for 24+ hours; this is the irreversible cleanup phase.

**Total runtime budget:** ~1.5-2 hours active operator time. Most of it is waiting on the RDS deletion wait (~30-45 min). Day 11 active work is shorter than Day 10.

## Pre-captured baselines (2026-04-28 evening)

| Resource | Value |
|---|---|
| RDS instance | `tailrd-production-postgres` (db.t3.medium, PG 15.14, deletion-protected, master `tailrd_admin`) |
| Aurora cluster | `tailrd-production-aurora` |
| DMS task ARN | `arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA` |
| DMS replication instance | `arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4` (`tailrd-dms-replication`, dms.t3.medium) |
| DMS source endpoint | `arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ` (`tailrd-rds-source`) |
| DMS target endpoint | `arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ` (`tailrd-aurora-target`) |
| Migration IAM roles | `dms-cloudwatch-logs-role`, `dms-rollback-role`, `dms-vpc-role` |
| Final snapshot id (PRE-STAGED 2026-04-29) | `tailrd-production-postgres-final-pre-decom-20260429` (status: available, encrypted, tagged HIPAA + RetainUntil=2032-04-30) |
| Production task definition (post-cutover) | `tailrd-backend:123` (Aurora-served, READ_ONLY=false) |

The replication slot name on RDS is captured at runtime (Step 3.1) since it's slot-config-derived; not stored in CloudFormation.

**Day 10 → Day 11 carryover:**
- The final HIPAA snapshot was created during Day 10 close-out (Phase 81). Step 2 below is now a verify-only step.
- Phase 80 already exercised `decommissionValidation.js` with the Phase2D-Decommission IAM policy attached + detached. Step 1 below is the second run, expected to clear the two pending blockers (`rds_no_recent_traffic` clears at T+24h soak, `final_snapshot_exists` already satisfied).
- Soak monitor diagnostic at `docs/audit/SOAK_MONITOR_DIAGNOSTIC_2026_04_29.md` documents 3 ALERT entries as workstation-environmental (not production-relevant). The monitor's natural-end exit code may show `SOAK_DEGRADED` or `SOAK_FAILED` based on the FAILURES counter; operator-override is justified per the diagnostic. Decommission decision rests on independent evidence (Aurora steady connections, RDS sustained-zero connections, /health continuous, decommissionValidation.js verdict).

---

## Pre-step P0: attach Phase2D-Decommission IAM policy

```bash
aws iam put-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-Decommission \
  --policy-document file://infrastructure/scripts/phase-2d/phase2d-decommission-policy.json

aws iam list-role-policies --role-name tailrd-production-ecs-task
# Expected: Phase2D-Decommission appears alongside baseline policies
```

---

## Step 1 - Pre-decommission validation (5 min)

Upload script to S3 (one-time, or after script update):

```bash
aws s3 cp infrastructure/scripts/phase-2d/decommissionValidation.js \
  s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/phase-2d/decommissionValidation.js
```

Run validation Fargate one-off:

```bash
python -c "
import json
overrides = {
  'containerOverrides': [{
    'name': 'tailrd-backend',
    'environment': [
      {'name': 'BASELINE_ERROR_RATE', 'value': '5'},
      {'name': 'FINAL_SNAPSHOT_PREFIX', 'value': 'tailrd-production-postgres-final-pre-decom-'},
    ],
    'command': ['sh', '-c', 'cd /app && npm install --no-save --silent @aws-sdk/client-rds @aws-sdk/client-database-migration-service @aws-sdk/client-ecs @aws-sdk/client-cloudwatch @aws-sdk/client-cloudwatch-logs @aws-sdk/client-secrets-manager pg >/tmp/npm.log 2>&1 && node -e \\'const{S3Client,GetObjectCommand}=require(\"@aws-sdk/client-s3\");const fs=require(\"fs\");(async()=>{const c=new S3Client({region:\"us-east-1\"});const r=await c.send(new GetObjectCommand({Bucket:\"tailrd-cardiovascular-datasets-863518424332\",Key:\"migration-artifacts/phase-2d/decommissionValidation.js\"}));fs.writeFileSync(\"/tmp/v.js\",await r.Body.transformToString())})().catch(e=>{console.error(e.message);process.exit(1)})\\' && NODE_PATH=/app/node_modules node /tmp/v.js']
  }]
}
print(json.dumps(overrides))
" > /tmp/decom-overrides.json

# IMPORTANT: pin to the post-cutover task def revision that's known-good
TASK=$(MSYS_NO_PATHCONV=1 aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-backend:123 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides "file://C:/Users/JHart/AppData/Local/Temp/decom-overrides.json" \
  --query 'tasks[0].taskArn' --output text)
TASK_ID="${TASK##*/}"
aws ecs wait tasks-stopped --cluster tailrd-production-cluster --tasks "$TASK_ID"

MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-production-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" --since 10m \
  | sed -n '/---DECOMMISSION_VALIDATION---/,/---END---/p'
```

**Path note:** under git-bash on Windows, `file:///tmp/...` does not resolve through to AWS CLI. Use the full Windows path with `MSYS_NO_PATHCONV=1` as shown. (This was the Phase 80 dry-run lesson.)

**Pass condition:** `"ready_for_decommission": true`. All 7 checks ok:true.

By the time this runs on Day 11 morning:
- `rds_no_recent_traffic` should now PASS (24h soak window has elapsed since cutover at 2026-04-29T00:51:55Z, so the 24h CloudWatch window should be clean).
- `final_snapshot_exists` should already PASS (snapshot pre-staged 2026-04-29).

If `rds_no_recent_traffic` still fails: STOP — something is still hitting RDS. Investigate (check ECS task connections, smoke test pods, leftover DMS tasks).
If checks 1, 3, 4, 6, 7 fail: STOP and investigate. Production may not actually be on Aurora, or operational drift since Day 10.

---

## Step 2 - Final RDS snapshot for HIPAA audit (verify only)

The final snapshot was **pre-staged during Day 10 close-out (Phase 81)**:
- ID: `tailrd-production-postgres-final-pre-decom-20260429`
- Tags: HIPAA=true, RetainUntil=2032-04-30 (6-year HIPAA minimum per 45 CFR 164.530(j)(2)), CreatedBy=jhart, CutoverDate=2026-04-29
- Captures the final state of RDS at the moment writes ceased (2026-04-29T00:51:55Z)

Verify it is still available before proceeding:

```bash
aws rds describe-db-snapshots \
  --db-snapshot-identifier tailrd-production-postgres-final-pre-decom-20260429 \
  --query 'DBSnapshots[0].{Status:Status,Created:SnapshotCreateTime,Size:AllocatedStorage,Encrypted:Encrypted,KmsKeyId:KmsKeyId,Tags:TagList}' \
  --output json

# Expected: Status=available, Encrypted=true, KmsKeyId=<production KMS>, Tags include HIPAA=true and RetainUntil=2032-04-30
```

If snapshot is missing or in `failed` status, STOP. Take a fresh snapshot using the Phase 81 procedure before proceeding to Step 4 (RDS deletion).

Re-run validation script (Step 1) to confirm `final_snapshot_exists: true`. If it was already true on the first run, skip the re-run.

---

## Step 2.5 - DMS task enumeration (BEFORE deletion)

Before starting Step 3, enumerate ALL DMS replication tasks pointing at the source RDS instance — not just the named Wave 2 task in this runbook. The May 2 (Day 11) execution discovered an undocumented Wave 1 full-load task (`tailrd-migration-wave1`, `task:IMG4NEHABJCQTHVRK7GNJYTPXI`) that had run on April 20, completed normally, and sat dormant for 12 days. It still held references to the source/target endpoints and blocked endpoint deletion via `InvalidResourceStateFault` until it was identified and deleted.

```bash
echo "=== All DMS tasks in account (look for any pointing at our endpoints/instance) ==="
aws dms describe-replication-tasks \
  --query 'ReplicationTasks[].{taskId:ReplicationTaskIdentifier,arn:ReplicationTaskArn,status:Status,sourceEndpoint:SourceEndpointArn,targetEndpoint:TargetEndpointArn}' \
  --output json
```

Expected output (post-Day 11 baseline going forward): empty or only the named Wave 2 task. If ANY task references the source endpoint (`endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ`), target endpoint (`endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ`), or replication instance (`rep:JGQBSRDUTNH3HO6PKL3BEESYS4`), it must be deleted in Step 3 before the endpoints/instance can be deleted.

For each unexpected task: investigate before deleting. Check:
- `MigrationType` (full-load is dormant bootstrap; cdc / full-load-and-cdc are ongoing replication)
- `Status` (must be stopped or failed; never delete a running task)
- `ReplicationTaskCreationDate` + `StopDate` (recency)
- `TableMappings` (which tables it copied)
- `LastFailureMessage` (clean stop expected)

Apply the same Wave 2 deletion pattern (delete-replication-task + wait replication-task-deleted) to each.

---

## Step 3 - DMS task + replication slot cleanup (5 min)

### 3.1 Capture replication slot name from RDS

```bash
# Run a Fargate one-off to query pg_replication_slots on RDS.
# Use the rollback URL secret if it was captured during cutover; else build from master password.
#
# Note: tailrd-production/rds/master-password is stored as a JSON object
# with keys {dbname, host, password, port, username, engine}, NOT as a
# plain-string password. The earlier (May 2 Day 11) attempt assumed plain string
# and failed with "password authentication failed" until JSON parsing was added.
# Both formats are now handled below: JSON.password if parseable, else raw string.
RDS_URL=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url-rds-rollback --query SecretString --output text 2>/dev/null \
  || (
    SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id tailrd-production/rds/master-password --query SecretString --output text)
    # Try JSON-shaped secret first (current production format)
    PW=$(echo "$SECRET_JSON" | python -c "import sys,json
try:
  print(json.load(sys.stdin)['password'])
except Exception:
  print(sys.stdin.read().strip(), file=sys.stderr); sys.exit(1)" 2>/dev/null)
    if [ -z "$PW" ]; then
      # Fallback: plain-string format
      PW="$SECRET_JSON"
    fi
    USER_RDS=$(echo "$SECRET_JSON" | python -c "import sys,json
try: print(json.load(sys.stdin)['username'])
except Exception: print('tailrd_admin')")
    HOST_RDS=$(echo "$SECRET_JSON" | python -c "import sys,json
try: print(json.load(sys.stdin)['host'])
except Exception: print('tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com')")
    DB_RDS=$(echo "$SECRET_JSON" | python -c "import sys,json
try: print(json.load(sys.stdin)['dbname'])
except Exception: print('tailrd')")
    PORT_RDS=$(echo "$SECRET_JSON" | python -c "import sys,json
try: print(json.load(sys.stdin)['port'])
except Exception: print('5432')")
    ENC_PW=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$PW")
    echo "postgresql://${USER_RDS}:${ENC_PW}@${HOST_RDS}:${PORT_RDS}/${DB_RDS}?sslmode=require"
  ))

# Build slot-query overrides
python -c "
import json, os
o = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'RDS_URL','value':os.environ['RDS_URL']}],'command':['sh','-c','cd /app && node -e \"const{Client}=require(\\'pg\\');(async()=>{const u=new URL(process.env.RDS_URL);const c=new Client({host:u.hostname,port:5432,user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace(/^\\\\//,\\'\\').split(\\'?\\')[0]||\\'tailrd\\',ssl:{rejectUnauthorized:false}});await c.connect();const r=await c.query(\\`SELECT slot_name,slot_type,active FROM pg_replication_slots\\`);console.log(\\'SLOTS\\',JSON.stringify(r.rows));await c.end()})().catch(e=>{console.error(e.message);process.exit(1)})\"']}]}
print(json.dumps(o))
" > /tmp/slot-query-overrides.json

# Launch + wait (use full Windows path for git-bash AWS CLI)
TASK=$(MSYS_NO_PATHCONV=1 aws ecs run-task --cluster tailrd-production-cluster --task-definition tailrd-backend:123 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides "file://C:/Users/JHart/AppData/Local/Temp/slot-query-overrides.json" \
  --query 'tasks[0].taskArn' --output text)
TASK_ID="${TASK##*/}"
aws ecs wait tasks-stopped --cluster tailrd-production-cluster --tasks "$TASK_ID"
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-production-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" --since 5m \
  | grep "SLOTS" | tail -1

# Capture the slot_name (likely starts with "awsdms_" or matches DMS task identifier)
SLOT_NAME="<paste-slot-name-from-output>"
echo "$SLOT_NAME" > ~/tailrd-slot-name.txt
```

### 3.2 Delete DMS task

```bash
aws dms delete-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA

# Wait for status transition (delete is fast for stopped tasks)
sleep 30
aws dms describe-replication-tasks --filters Name=replication-task-arn,Values=arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA \
  --query 'ReplicationTasks[0].Status' --output text 2>&1 || echo "task deleted (not found)"
```

### 3.3 Drop the replication slot from RDS

```bash
# Use the same RDS_URL from 3.1 + slot name captured
python -c "
import json, os
slot = os.environ['SLOT_NAME']
script = f'''const{{Client}}=require('pg');(async()=>{{const u=new URL(process.env.RDS_URL);const c=new Client({{host:u.hostname,port:5432,user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace(/^\\\\//,'').split('?')[0]||'tailrd',ssl:{{rejectUnauthorized:false}}}});await c.connect();const r=await c.query(\"SELECT pg_drop_replication_slot('{slot}')\");console.log('SLOT_DROPPED');await c.end()}})().catch(e=>{{console.error(e.message);process.exit(1)}})'''
o = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'RDS_URL','value':os.environ['RDS_URL']}],'command':['sh','-c',f'cd /app && node -e \"{script}\"']}]}
print(json.dumps(o))
" > /tmp/slot-drop-overrides.json

# Run
aws ecs run-task --cluster tailrd-production-cluster ... --overrides file:///tmp/slot-drop-overrides.json
# Wait + verify SLOT_DROPPED in logs
```

**STOP if drop fails** (slot in use, etc.). A held slot will prevent RDS deletion.

---

## Step 4 - RDS instance retirement (30-45 min)

```bash
# Disable deletion protection (final-snapshot was taken in Step 2)
aws rds modify-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --no-deletion-protection \
  --apply-immediately

# Wait 30s for the modification to apply
sleep 30

# Delete the instance (skip-final-snapshot since we already have one)
aws rds delete-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --skip-final-snapshot

# Poll for deletion (no built-in waiter)
echo "Waiting for RDS deletion (~30-45 min)..."
START=$(date +%s)
while true; do
  STATUS=$(aws rds describe-db-instances --db-instance-identifier tailrd-production-postgres --query 'DBInstances[0].DBInstanceStatus' --output text 2>&1)
  ELAPSED=$(( $(date +%s) - START ))
  if echo "$STATUS" | grep -q "DBInstanceNotFound"; then
    echo "RDS_DELETED after ${ELAPSED}s"
    break
  fi
  echo "T+${ELAPSED}s status=$STATUS"
  if [ $ELAPSED -gt 3600 ]; then
    echo "TIMEOUT 60min - check console manually"
    break
  fi
  sleep 60
done
```

---

## Step 5 - DMS infrastructure cleanup (8-15 min)

DMS deletion timing observed during May 2 execution:

| Resource | Initiate → Absent (observed) | Poll budget |
|---|---|---|
| DMS replication task | ~30-60s | `aws dms wait replication-task-deleted` (built-in) |
| DMS endpoint | 60-150s (one observed at 134s, another at ~10min after eventual consistency caught up) | Poll loop: 12 probes × 10s = 2 min budget; extend to 15+ probes if needed |
| DMS replication instance | 5-10 min (one observed at 6 min 51s) | `aws dms wait replication-instance-deleted` (built-in) |

ORDER MATTERS: task → endpoints → instance. AWS rejects endpoint deletion while any task references the endpoint (`InvalidResourceStateFault`), and rejects instance deletion while any endpoint exists.

```bash
# 5.1 Delete DMS endpoints (60-150s typical; eventual-consistency means describe-endpoints
# may return 'deleting' for a while after delete-endpoint accepts the request)
echo "DELETING DMS endpoints at $(date -u +%H:%M:%SZ)"
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ

# Poll-verify each (DMS doesn't have aws dms wait endpoint-deleted)
for arn in \
  arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ \
  arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ; do
  echo "--- Polling $arn ---"
  for i in $(seq 1 15); do
    RESULT=$(aws dms describe-endpoints --filters "Name=endpoint-arn,Values=$arn" --query 'length(Endpoints)' --output text 2>/dev/null || echo "0")
    if [ "$RESULT" = "0" ] || [ -z "$RESULT" ]; then
      echo "Endpoint deleted at $(date -u +%H:%M:%SZ) (probe $i)"
      break
    fi
    echo "Probe $i: still present, sleep 10..."
    sleep 10
  done
done

# 5.2 Delete DMS replication instance (5-10 min wait)
echo "DELETING DMS replication instance at $(date -u +%H:%M:%SZ)"
aws dms delete-replication-instance \
  --replication-instance-arn arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4
aws dms wait replication-instance-deleted \
  --filters "Name=replication-instance-arn,Values=arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4"
echo "Replication instance deleted at $(date -u +%H:%M:%SZ)"

# Delete DMS-specific IAM roles (none of which are referenced post-decommission)
for role in dms-cloudwatch-logs-role dms-rollback-role dms-vpc-role; do
  aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyArn' --output text | xargs -n1 -r aws iam detach-role-policy --role-name "$role" --policy-arn 2>/dev/null
  aws iam list-role-policies --role-name "$role" --query 'PolicyNames[]' --output text | xargs -n1 -r aws iam delete-role-policy --role-name "$role" --policy-name 2>/dev/null
  aws iam delete-role --role-name "$role" 2>&1 || echo "$role: already deleted or has remaining attachments"
done

# Delete Lambda rollback function (DMS-task-pinned, now defunct)
aws lambda delete-function --function-name tailrd-production-aurora-rollback 2>&1 \
  || echo "lambda already absent, skipping"
```

---

## Step 6 - CLAUDE.md update + commit

Note: CLAUDE.md was already updated to cutover-complete state during Day 10 Phase 78 (PR #202). Day 11 update should be a smaller delta:
- Replace `DECOMMISSION_PENDING` with `DECOMMISSIONED 2026-04-30`
- Document the final RDS snapshot ARN + 6-year retention (RetainUntil=2032-04-30)
- Note Day 11 decommission completed cleanly (no rollback)
- DMS infrastructure: REMOVED (replication instance, endpoints, IAM roles)
- Migration project: COMPLETE

Open a small docs PR via the same-session pattern. CI should pass instantly (docs only).

---

## Step 7 - Cost verification (next billing day)

Check AWS Cost Explorer 24-48h after deletion:
- RDS line item should drop by ~$50-70/month (db.t3.medium savings)
- DMS replication instance should drop by ~$30-40/month (dms.t3.medium)
- Aurora Serverless v2 ACU costs replace these (variable; expect $50-150/month at current load)

---

## Pre-step P1: detach Phase2D-Decommission IAM policy (MANDATORY)

```bash
aws iam delete-role-policy \
  --role-name tailrd-production-ecs-task \
  --policy-name Phase2D-Decommission

aws iam list-role-policies --role-name tailrd-production-ecs-task
# Phase2D-Decommission should NOT appear above
```

If detach fails, STOP. The role must be clean before any further session work.

---

## Acceptance checklist

- [ ] Pre-step P0: Phase2D-Decommission IAM attached
- [ ] Step 1: validation script returns ready_for_decommission: true (no blockers; final snapshot already exists from Phase 81)
- [ ] Step 2: pre-staged 2026-04-29 snapshot still available, tags intact (HIPAA=true, RetainUntil=2032-04-30)
- [ ] Step 3.1: replication slot name captured
- [ ] Step 3.2: DMS task deleted (DBInstanceNotFound or empty list)
- [ ] Step 3.3: replication slot dropped on RDS
- [ ] Step 4: RDS DBInstanceNotFound via describe-db-instances
- [ ] Step 5: DMS replication instance + endpoints + IAM roles + Lambda deleted
- [ ] Step 6: CLAUDE.md updated, docs PR opened + merged
- [ ] Step 7: AWS bill verified (Day 12+, async)
- [ ] Pre-step P1: Phase2D-Decommission IAM detached
- [ ] Production task role lists ONLY baseline policies

---

## Safety stops

- Validation script returns ready_for_decommission: false (other than final_snapshot_exists pre-Step 2): STOP, investigate
- Aurora not taking traffic: STOP, cutover may have been rolled back
- RDS still has connections > 5/hour: STOP, application or operator may still be reading from RDS
- Final snapshot creation fails: STOP, do NOT proceed to deletion without snapshot
- Replication slot drop fails (slot in use): STOP, investigate. Held slot prevents RDS deletion.
- RDS deletion times out > 60 min: surface, may be modify-db-instance still applying
- IAM detach fails: STOP, must clean role before continuing

---

## Rollback (within minutes of error)

If decommission goes wrong before Step 4 RDS deletion completes:
- DMS task delete is reversible (recreate with same source/target endpoints, resume from CDC position - though CDC slot may be gone)
- Replication slot can be recreated trivially
- RDS still exists; switch DATABASE_URL secret back to RDS endpoint, force-new-deployment

After Step 4 RDS deletion completes:
- Restore from final snapshot: `aws rds restore-db-instance-from-db-snapshot --db-snapshot-identifier <SNAPSHOT_ID> --db-instance-identifier tailrd-production-postgres-restored` (~30-45 min)
- Update DATABASE_URL secret to restored RDS endpoint
- Force-new-deployment on ECS
- This is the high-cost rollback path. Only triggered if Aurora becomes unstable post-decommission.
