# Day 10 Plan - Production Cutover + RDS Decommission

**Date:** 2026-04-29 (Wednesday)
**Companion runbook:** `docs/DAY_10_WEDNESDAY_RUNBOOK.md`
**Reference:** `docs/ARCHITECTURE_V2_MIGRATION.md` Day 6 (cutover spec) + Day 10 (decommission spec), combined here because the Day 6 cutover was deferred to consolidate with decommission.

---

## 1. Objective

Flip production traffic from RDS PostgreSQL (`tailrd-production-postgres`, db.t3.medium) to Aurora Serverless v2 (`tailrd-production-aurora`, 0.5-4 ACU, PG 15.14), then decommission the predecessor RDS infrastructure once Aurora has soaked under live load for 24h.

This is the load-bearing migration step. After this, Aurora is authoritative and RDS is a snapshot record.

---

## 2. Current state (entering Day 10)

| Component | State |
|---|---|
| `tailrd-production-postgres` (RDS) | LIVE, taking 100% of production traffic. DATABASE_URL points here. |
| `tailrd-production-aurora` (Aurora Serverless v2) | available, parity with RDS via DMS CDC, 0% of live traffic. Wave 2 sustained-validation showed 0 drift across 91 row deltas. |
| DMS replication task `YFGGBH5LXRHDBHYD76DVX5MQRA` | running, full load 100%, 22 tables loaded, 0 errors, sub-2-min CDC lag observed. |
| CDC slot on RDS | active, plugin `test_decoding`. |
| Lambda rollback function | armed, points at the live DMS task per Day 4 setup. |
| Wave 2 close-out PR | #188 MERGED (`3efe423`). |
| Staging environment | operational, Synthea seed in progress (independent track). |

---

## 3. Pre-flight investigation

Run these BEFORE starting cutover. Failure of any one is a hard STOP.

### 3.1 CDC lag and parity
- DMS task `running` with 0 errors
- `aws dms describe-table-statistics` shows `FullLoadEndTime` populated for all 22 tables and 0 `ValidationFailedRecords`
- Spot-check row count parity on the 5 highest-write tables (Patient, Observation, Encounter, AuditLog, LoginSession) - within 5 rows or 0.1%, whichever is larger

### 3.2 Aurora capacity
- ACU has been > 0.5 (warm) over the prior 24h, otherwise first-write latency spike
- Aurora writer endpoint reachable from production VPC (test from a Fargate one-off)
- `pg_stat_database` on Aurora shows < 50% of `max_connections` in use

### 3.3 Application readiness
- Production backend healthy, uptime > 1h (recently-bounced services have warmer Prisma client caches)
- ECS service desired count == running count, deployment COMPLETED
- No active deploy in flight

### 3.4 Operator readiness
- This is a P0 high-risk operation. Operator must be at the keyboard for the entire cutover window. No multitasking.
- Slack/email available for the rollback-page recipient
- Maintenance window scheduled (or zero-downtime path validated, see section 4.2)

---

## 4. Sub-tasks in execution order

### 4.1 Cutover preparation (T-30 min)

| Step | Action | Risk |
|---|---|---|
| 4.1.1 | Confirm 3.1-3.4 pre-flight all green | low |
| 4.1.2 | Take a manual snapshot of `tailrd-production-postgres` named `tailrd-production-postgres-pre-cutover-2026-04-29`. Wait for `available`. | low (10-15 min) |
| 4.1.3 | Take a manual snapshot of Aurora cluster named `tailrd-production-aurora-pre-cutover-2026-04-29` | low (5-10 min) |
| 4.1.4 | Pre-warm Aurora ACU: run a SELECT-heavy workload from a Fargate one-off for ~5 min so ACU climbs to 1.0+ before live writes hit | low |
| 4.1.5 | Fetch Aurora master password, construct `postgresql://tailrd_admin:...@tailrd-production-aurora.cluster-...:5432/tailrd?sslmode=require`. Stage but DO NOT commit to Secrets Manager yet. | low (handles in operator shell only) |
| 4.1.6 | Scale ECS service to desiredCount=2 for the rolling deploy | low |

### 4.2 Cutover execution (T0, target 5 min, hard ceiling 15 min)

Two paths:

**Path A: Maintenance window (safer, ~5 min downtime)**

| Step | Action |
|---|---|
| 4.2.1 | Flip the read-only feature flag at the middleware layer (rejects non-GET with 503 + Retry-After header). Existing Day 6 plan documents this. |
| 4.2.2 | Wait 30s for in-flight writes to drain. Check `pg_stat_activity` on RDS for active connections doing writes. |
| 4.2.3 | Stop DMS replication task: `aws dms stop-replication-task`. Confirm `Stopped` status. |
| 4.2.4 | Update Secrets Manager `tailrd-production/app/database-url` with the Aurora writer URL. |
| 4.2.5 | Force-new-deployment on ECS: tasks pull the new secret value at start. |
| 4.2.6 | Wait `services-stable` (typically 2-4 min for rolling deploy with 100% min healthy). |
| 4.2.7 | Smoke test: `/health`, `/api/auth/login`, `/api/heart-failure/dashboard` (the only fully-wired module). All must return 200 with matching data shapes vs pre-cutover. |
| 4.2.8 | Flip read-only flag off. |

**Path B: Zero-downtime (riskier, ~0 sec apparent downtime if it works, ~minutes of split-brain risk if it doesn't)**

Skip Path A's 4.2.1 read-only flip. Update DATABASE_URL secret + force-new-deployment. New tasks pull Aurora endpoint, old tasks keep writing to RDS until they drain. CDC continues until DMS is stopped. There's a window where some writes go to RDS and some to Aurora, with CDC continuously syncing RDS → Aurora.

**Risk:** if a write hits RDS but the user's next read goes to a new task on Aurora before CDC catches up, the user sees stale data. CDC was sub-2-min in Wave 2 validation, but production write volume may differ.

**Path A is the recommended path.** Path B is documented for the case where a maintenance window cannot be scheduled.

### 4.3 Post-cutover validation (T+5min to T+30min)

| Check | Expected | If fails |
|---|---|---|
| ECS service stable on new task def | runningCount==desiredCount, deployment COMPLETED | rollback (4.5) |
| `/health` 200 healthy | within 30s | rollback (4.5) |
| Login + HF dashboard 200 with real data | data shape matches pre-cutover | rollback (4.5) |
| Aurora `pg_stat_database` `numbackends` ramps up from 0 | within 60s of redeploy | indicates app didn't actually switch endpoints; rollback |
| RDS `pg_stat_database` `numbackends` drops to ~0 | within 5 min | indicates app still partially on RDS; investigate |
| CloudWatch error rate on `/ecs/tailrd-production-backend` | no 5xx spike | rollback if > baseline |
| Aurora ACU range | 0.5-2 (1-2 expected during ramp) | scale up if > 3.5 saturation |

### 4.4 RDS decommission preparation (T+24h, NOT same day)

**Wait 24h with Aurora as authoritative before any RDS decommission action.**

This is a soak period. Anything that wakes up at midnight UTC, hourly cron jobs, weekly digest emails, etc. - they all need a chance to fail loudly if they're configured against the old endpoint.

After 24h of clean operation:

| Step | Action |
|---|---|
| 4.4.1 | Take final manual snapshot: `tailrd-production-postgres-final-2026-04-30` with retention period 365 days for HIPAA audit |
| 4.4.2 | Disable RDS deletion protection: `aws rds modify-db-instance --db-instance-identifier tailrd-production-postgres --no-deletion-protection` |
| 4.4.3 | Delete the RDS instance: `aws rds delete-db-instance --db-instance-identifier tailrd-production-postgres --skip-final-snapshot` (final snapshot already taken in 4.4.1) |
| 4.4.4 | Delete DMS replication task: `aws dms delete-replication-task` |
| 4.4.5 | Delete DMS replication instance: `aws dms delete-replication-instance` |
| 4.4.6 | Delete the CDC replication slot on RDS - already gone with the instance, but verify there's no lingering reference |
| 4.4.7 | Detach migration-only IAM policies: any temporary policies attached to the ECS task role for DMS observability |
| 4.4.8 | Delete the Lambda rollback function: it's pointed at a now-defunct DMS task |

### 4.5 Rollback (within 5 min of detected failure)

If 4.3 surfaces a problem:

| Step | Action |
|---|---|
| 4.5.1 | Update Secrets Manager `tailrd-production/app/database-url` BACK to the RDS endpoint (the original value, captured before cutover) |
| 4.5.2 | Force-new-deployment on ECS |
| 4.5.3 | Wait `services-stable` |
| 4.5.4 | Restart DMS replication task (CDC resumes from where it stopped at 4.2.3) |
| 4.5.5 | Smoke test against RDS endpoint |
| 4.5.6 | Disable rollback automation, surface incident, do NOT retry cutover the same day |

The Lambda rollback function from Day 4 automates 4.5.1-4.5.4. Document the manual procedure for cases where Lambda itself is unhealthy.

### 4.6 Post-cutover monitoring (T+24h to T+7 days)

- Daily `aws rds describe-db-clusters` health check
- Daily Aurora ACU peak / median / min from CloudWatch
- Weekly cost report: confirm AWS bill drops by the t3.medium RDS line
- After 7 days clean: declare migration complete, archive `docs/DMS_*.md` + Wave 2 docs

---

## 5. Pause points

- After 3.1-3.4: report pre-flight state. Pause for go/no-go on cutover window
- After 4.1.5: pause to confirm Aurora URL is staged correctly before any secret update
- After 4.2.7 smoke test: pause for go/no-go on flipping read-only flag back off
- After 4.3 30-min validation: pause for go on closing the cutover, leaving 24h soak running
- 4.4 prep: explicitly 24h delay, requires fresh authorization on Day 11

---

## 6. Safety stops

- Pre-flight 3.1-3.4 fails: STOP, do not initiate cutover, surface to operator
- Aurora unreachable from VPC during 3.2: STOP, network/SG investigation
- DMS task fails to stop cleanly in 4.2.3: STOP, do NOT proceed (RDS may still receive writes that never reach Aurora)
- Smoke test 4.2.7 returns 5xx: trigger 4.5 rollback immediately
- Aurora ACU saturates at 4.0 in 4.3: not necessarily a failure (Serverless v2 max), but surface to operator. Burst write workload may need temporary scale-up
- 4.4 delete steps cannot be undone: explicit 24h soak gate; require fresh authorization

---

## 7. Acceptance criteria

- [ ] Production `/health` returns 200 healthy with environment=production
- [ ] DATABASE_URL in Secrets Manager points at Aurora writer
- [ ] ECS task running on the post-cutover task definition
- [ ] Aurora `pg_stat_database` shows live connection count > 0
- [ ] RDS `pg_stat_database` shows ~0 connections after 5 min
- [ ] Login flow succeeds against Aurora-backed backend
- [ ] HF dashboard loads with real Prisma data (the only fully-wired module)
- [ ] No 5xx spike in CloudWatch for 30 min post-cutover
- [ ] Final RDS snapshot retained for 365 days (Day 11 only)
- [ ] DMS task + instance deleted (Day 11 only)
- [ ] CLAUDE.md "Last known working task definition" updated (Day 11 only)
- [ ] AWS bill reflects RDS removal (verified via Cost Explorer the following Monday)

---

## 8. Estimated time

| Phase | Estimate |
|---|---|
| 4.1 Pre-flight | 30-45 min |
| 4.2 Cutover execution (Path A) | 5-15 min |
| 4.3 Post-cutover validation | 30 min active observation |
| 4.4 24h soak | 24 hours (no operator action until Day 11) |
| 4.4 Decommission (Day 11) | 30-60 min |

Day 10 active operator time: ~2-3 hours. Day 11 active operator time: ~1 hour.

---

## 9. Out of scope (deferred)

- Frontend deployment to Netlify/Vercel (Sprint B-2)
- DNS for `app.tailrd-heart.com` (Sprint B-2)
- Staging CI/CD pipeline (Day 12+)
- Predecessor t4g RDS decommission (tracked as tech debt #34, post-Sinai)
- AWS Support case 177716470300327 SES production access (independent, flip `USE_SES_EMAIL=true` whenever it lands)
