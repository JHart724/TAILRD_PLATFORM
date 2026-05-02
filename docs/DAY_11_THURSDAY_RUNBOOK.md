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

## Step 3 - DMS task + replication slot cleanup (5 min)

### 3.1 Capture replication slot name from RDS

```bash
# Run a Fargate one-off to query pg_replication_slots on RDS.
# Use the rollback URL secret if it was captured during cutover; else fetch via master password.
RDS_URL=$(aws secretsmanager get-secret-value --secret-id tailrd-production/app/database-url-rds-rollback --query SecretString --output text 2>/dev/null \
  || (PW=$(aws secretsmanager get-secret-value --secret-id tailrd-production/rds/master-password --query SecretString --output text); echo "postgresql://tailrd_admin:$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$PW")@tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require"))

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

## Step 5 - DMS infrastructure cleanup (5-10 min)

```bash
# Delete DMS replication instance
aws dms delete-replication-instance \
  --replication-instance-arn arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4

# Delete DMS endpoints
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ
aws dms delete-endpoint --endpoint-arn arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ

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
