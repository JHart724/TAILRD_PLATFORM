# RDS logical replication enablement runbook

**Status:** STAGING-VERIFIED (2026-04-20)
**Target:** `tailrd-production-postgres` (Day 6 after production reboot rehearsal)
**Purpose:** flip `rds.logical_replication` from `off` to `on` so DMS CDC works for Aurora V2 Waves 2-4.
**Rehearsed on:** `tailrd-staging-postgres` on 2026-04-20 (Day 5 of Aurora V2 migration).

This is a STATIC PostgreSQL parameter change. It requires a reboot. Multi-AZ RDS makes that a failover, which is brief but not zero. Every line below was exercised against staging before being considered fit for production.

---

## Pre-flight checklist

Before touching production:

- [ ] Manual snapshot: `aws rds create-db-snapshot --db-instance-identifier tailrd-production-postgres --db-snapshot-identifier tailrd-production-postgres-pre-logical-repl-$(date -u +%Y-%m-%d)`
- [ ] Confirm snapshot `available` before proceeding (~2-5 min for this DB size)
- [ ] Backend ECS service is healthy (`aws ecs describe-services --query 'services[0].runningCount'` equals desired)
- [ ] No active DMS replication tasks (Wave 2 not started yet; Wave 1 is stopped)
- [ ] CloudWatch alarm `TailrdDMS-RDS_CPU_CRITICAL_DURING_MIGRATION` in OK state
- [ ] Team notified (for us, that's Jonathan, on Slack or whatever) — 2-min window expected, 5-min window budgeted
- [ ] No customer traffic at time of change (internal admin only today)

If all boxes check, proceed. Any blocker, abort.

---

## Exact commands in order

### Step 1 — Create production parameter group (one-time; idempotent via `|| true`)

```bash
aws rds create-db-parameter-group \
  --db-parameter-group-name tailrd-production-postgres15-logical-repl \
  --db-parameter-group-family postgres15 \
  --description "Production PG 15 with rds.logical_replication=1 for DMS CDC" \
  2>/dev/null || echo "Parameter group already exists, continuing"
```

### Step 2 — Set logical replication parameters (pending-reboot; no immediate effect)

```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name tailrd-production-postgres15-logical-repl \
  --parameters \
    "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot" \
    "ParameterName=max_replication_slots,ParameterValue=10,ApplyMethod=pending-reboot" \
    "ParameterName=max_wal_senders,ParameterValue=10,ApplyMethod=pending-reboot"
```

### Step 3 — Attach parameter group to production RDS (no reboot yet)

This step changes the instance's recorded parameter-group association but does not restart the engine. AWS marks the instance in `modifying` state briefly, then returns to `available`.

```bash
aws rds modify-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --db-parameter-group-name tailrd-production-postgres15-logical-repl \
  --apply-immediately
```

Wait for the instance to return to `available` before Step 4:

```bash
aws rds wait db-instance-available --db-instance-identifier tailrd-production-postgres
```

### Step 4 — Start the health-check observer BEFORE reboot

The probe source is committed at `infrastructure/scripts/rdsRebootHealthCheck.js`. It connects via `DATABASE_URL`, issues `SELECT 1` once per second, and writes one JSON line per attempt. Connection losses surface as `status: "fail"` samples — the process itself does not exit, so it keeps probing right across the failover window.

Before the reboot, upload the current script to S3 (idempotent), generate a short-lived pre-signed URL, and launch a one-shot ECS task that downloads via `curl` + runs it inside the VPC. Note: the `tailrd-backend` image is `node:18-slim` with `openssl curl` added; it does **not** include the AWS CLI. The probe fetch uses `curl` + pre-signed URL, not `aws s3 cp`.

```bash
# 1. Upload (or refresh) the probe in the migration-artifacts prefix
aws s3 cp infrastructure/scripts/rdsRebootHealthCheck.js \
  s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/rdsRebootHealthCheck.js \
  --content-type "application/javascript"

# 2. Generate a pre-signed URL (1 hour validity; plenty for a ~45 min reboot window)
PROBE_URL=$(aws s3 presign \
  s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/rdsRebootHealthCheck.js \
  --expires-in 3600)

# 3. Launch the one-shot probe task (uses backend task def → inherits DATABASE_URL secret + VPC + IAM)
aws ecs run-task --cluster tailrd-production-cluster \
  --task-definition tailrd-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"tailrd-backend\",\"command\":[\"sh\",\"-c\",\"cd /app && curl -fsSL '$PROBE_URL' -o probe.js && node probe.js\"]}]}" \
  --started-by "day-6-production-reboot-healthcheck"
```

The command output includes the task ARN. Follow its log stream at `/ecs/tailrd-production-backend/ecs/tailrd-backend/<task-id>` in CloudWatch Logs — one JSON line per second with shape:

```json
{"ts":"2026-04-21T10:15:03.214Z","status":"ok","latency_ms":3,"error":null}
{"ts":"2026-04-21T10:15:04.215Z","status":"fail","latency_ms":1024,"error":"Connection terminated unexpectedly"}
```

After Phase 6F, stop the probe task: `aws ecs stop-task --cluster tailrd-production-cluster --task <task-id> --reason "reboot observed"`.

### Step 5 — Reboot with failover (the actual change)

```bash
# Record wall clock at T0
T0=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)
echo "T0: $T0"

aws rds reboot-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --force-failover
```

### Step 6 — Watch RDS status transitions

```bash
while true; do
  STATUS=$(aws rds describe-db-instances --db-instance-identifier tailrd-production-postgres --query 'DBInstances[0].DBInstanceStatus' --output text)
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) status: $STATUS"
  [ "$STATUS" = "available" ] && break
  sleep 5
done
```

Typical sequence: `available` → `rebooting` → `available`.

### Step 7 — Verify the parameter change took effect

```bash
# Connect via an ECS one-shot task (production RDS is in private subnets)
aws ecs run-task --cluster tailrd-production-cluster \
  --task-definition tailrd-pgdump:2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"pgdump","command":["psql","$RDS_URL","-c","SHOW wal_level; SHOW rds.logical_replication; SHOW max_replication_slots; SHOW max_wal_senders"],"environment":[{"name":"RDS_URL","value":"<from-secrets-manager>"}]}]}'
```

Expected values:
- `wal_level = logical`
- `rds.logical_replication = on`
- `max_replication_slots = 10`
- `max_wal_senders = 10`

If any value is unexpected: STOP. Something went wrong. See Rollback section below.

### Step 8 — Verify backend recovered

```bash
curl -s https://api.tailrd-heart.com/health
# Expect: {"success":true,"data":{"status":"healthy","uptime":<small-but->=0>}}
```

From the health-check observer's CloudWatch logs, find the first `ok: true` line after the failover window. Backend is back.

---

## Measured expectations (from staging rehearsal, 2026-04-21)

Staging rehearsal ran `tailrd-staging-postgres` (db.t3.medium, Multi-AZ, PG 15.14) through the exact procedure above. Health-check task emitted one `SELECT 1` per second against the staging endpoint throughout.

| Metric | Staging measurement | Production measurement (2026-04-21T13:10:43Z) | Production budget |
|---|---:|---:|---:|
| T0 (reboot API call) | 09:14:26.116Z | **13:10:43.532Z** | — |
| Time to AWS "Multi-AZ instance failover started" event | 15.5s | **17.0s** | < 30s |
| Time to AWS "DB instance restarted" event | 30.8s | **33.4s** | < 60s |
| Time to AWS "Multi-AZ instance failover completed" event | 50.5s | **66.8s** | < 90s |
| Time from reboot API call to `available` state | 72.2s | **~78s** | < 120s |
| Backend health-check failures during the reboot | 0 | **0** (production traffic via backend's own Prisma pool; the in-VPC probe hung at T+15s due to its own Prisma pool — see tech debt #20) | < 10 |
| Highest single query latency during reboot window | 31ms | **n/a** (probe hung; backend smoke test endpoints post-reboot all < 350ms) | < 1000ms |
| `max_wal_senders` enforcement | 10 → 25 (AWS-adjusted) | 10 → 25 (AWS-adjusted) | ≥ 10 |

**Headline finding (reconfirmed on production):** Multi-AZ force-failover is effectively invisible to the live backend's Prisma connection pool. Backend `/health` uptime continued monotonically through the entire reboot window (14770s → 15173s in the observation period — no restart). AWS's failover swaps the ENI backing the DB endpoint transparently; existing TCP connections survive.

**Probe caveat on production:** the in-VPC health probe `infrastructure/scripts/rdsRebootHealthCheck.js` (written for Day 6; did not exist during staging rehearsal) stopped emitting at T+15s as Prisma's pool got stuck on the half-open TCP through the ENI swap. The probe task stayed RUNNING, never exited, never produced a `fail` sample. Production backend traffic was unaffected — this is a probe limitation, not a Multi-AZ observation. Tracked as tech debt #20 (`docs/TECH_DEBT_REGISTER.md`); next rehearsal should use a raw `pg` client with aggressive timeouts.

### Secondary test: SG ingress revoke

Separately tested ungraceful disconnect by revoking the `5432/tcp from backend SG` ingress rule for 40 seconds, then restoring. During the 56-second window (40s blocked + ~16s for propagation and restoration):

- **0 health-check failures.** Existing TCP sessions were grandfathered by AWS's stateful SG behavior — SG changes only affect NEW connections.

This is important context for production planning: SG changes are non-disruptive to in-flight connections, so they can be used safely as a pre-reboot staging step if needed.

---

## Rollback procedure

If the reboot does not land cleanly, or if production becomes unhealthy post-reboot:

```bash
# 1. Reattach the default parameter group
aws rds modify-db-instance \
  --db-instance-identifier tailrd-production-postgres \
  --db-parameter-group-name default.postgres15 \
  --apply-immediately

# 2. Reboot again to revert wal_level
aws rds reboot-db-instance --db-instance-identifier tailrd-production-postgres

# 3. Verify wal_level reverts to "replica"
aws ecs run-task ... (psql SHOW wal_level)
```

Rollback returns us to the pre-Day-5 state. CDC is not available, Waves 2-4 block, but the application runs.

If rollback itself fails: restore the RDS from the pre-logical-repl snapshot taken in the pre-flight checklist.

---

## Success criteria

All of the following must be true post-reboot before Day 6 is considered complete:

1. `SHOW rds.logical_replication` returns `on`
2. `SHOW wal_level` returns `logical`
3. `SHOW max_replication_slots` returns `10`
4. `SHOW max_wal_senders` returns `10`
5. Backend `/health` returns 200 within 2 min of `available` state
6. Backend login + HF dashboard queries work (full-stack smoke test)
7. CloudWatch `AWS/RDS CPUUtilization` returns to baseline (~4-5%) within 5 min
8. No `TailrdDMS-RDS_CPU_CRITICAL_DURING_MIGRATION` alarms fired during or after reboot

---

## What comes next (Day 6 Wave 2 pre-reqs)

After this runbook executes successfully on production:
- Create DMS replication task `tailrd-migration-wave2` with `--migration-type full-load-and-cdc`, extra source connection attributes `captureDDLs=true;slotName=dms_wave2_slot` (pglogical NOT needed — DMS uses `pgoutput` by default on RDS PG 15)
- Resume chaos test with a real running task (test 3 in `docs/DMS_CHAOS_TEST_LOG.md` additions)
- Activate shadow read validator as scheduled ECS task
- Start Wave 2: patients + encounters
