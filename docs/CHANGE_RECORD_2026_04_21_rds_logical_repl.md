# Change Record: Production RDS reboot to enable logical replication

**Change ID:** CR-2026-04-21-001
**Owner:** Jonathan Hart
**Status:** DRAFT (pre-execution)
**Created:** 2026-04-21
**Target system:** `tailrd-production-postgres` (db.t3.medium, Multi-AZ, PG 15.14)
**Change type:** Static parameter change requiring instance reboot with force-failover
**Blast radius:** Backend connection pool for ~72s (Multi-AZ ENI swap); zero customer-facing impact expected based on staging rehearsal

---

## 1. Purpose

Flip `rds.logical_replication` from `0` to `1` on production RDS. This is the prerequisite that unblocks DMS CDC for Waves 2-4 of the Aurora V2 migration. Without logical replication enabled, DMS cannot create the logical replication slot it needs for change data capture, and we cannot perform zero-downtime cutover of the patients / encounters / observations tables.

Closes tech debt item **#19** (`rds.logical_replication` OFF on production — deferred from Day 4 to Day 6).

## 2. Date/time window

- **T0 (reboot API call):** [to be filled at Phase 6A execution]
- **Expected completion:** T0 + 45 minutes (72s reboot + ~44min observation/verification)
- **Change window booked:** 2026-04-21, internal-admin-only traffic window

## 3. Prerequisites (all satisfied)

- [x] Staging rehearsal 2026-04-21: 72.2s reboot, **zero backend health-check failures** across the failover window (see `docs/RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md` § Measured expectations)
- [x] Runbook PR #170 merged to main on 2026-04-21T09:26:50Z
- [x] Day 4 Wave 1 full-load-only DMS migration complete; rollback Lambda proven end-to-end (55s alarm→completion, see `docs/DMS_CHAOS_TEST_LOG.md`)
- [x] Prisma connection pool + Multi-AZ force-failover proven session-preserving on staging
- [x] Consolidated Prisma baseline applied to production (PR #166); schema-history debt cleared
- [x] CloudWatch alarm `TailrdDMS-RDS_CPU_CRITICAL_DURING_MIGRATION` wired and in OK state
- [x] No active DMS replication tasks (Wave 1 stopped; Wave 2 not yet started)

## 4. Go/No-Go checklist (executed at T0-5min)

All five must pass before Phase 6A kickoff. Log timestamp + result for each in § 8.

1. **No active ECS deployments** in progress on `tailrd-production-backend` (`aws ecs describe-services` → `deployments` length == 1, rolloutState COMPLETED)
2. **No CloudWatch alarms** currently in ALARM state across `TailrdDMS-*` and backend alarms
3. **RDS baseline:** CPU < 10%, no long-running queries in `pg_stat_activity` > 60s, no replication lag (N/A — no CDC yet), `available` state
4. **Backend baseline:** `/health` returns 200, all ECS tasks running/healthy, ALB target group healthy count == desired
5. **No recent deploys:** last successful deploy > 30 minutes ago (avoid layering a reboot on a fresh image rollout)

## 5. Execution plan (summary; full commands in runbook)

Following `docs/RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md` verbatim:

- **Phase 6A** — Snapshot `tailrd-production-postgres-pre-logical-repl-2026-04-21`; launch continuous 1s health probe; capture 60s backend latency baseline
- **Phase 6B** — Create parameter group `tailrd-production-postgres15-logical-repl`; set `rds.logical_replication=1`, `max_replication_slots=10`, `max_wal_senders=10` (all pending-reboot); attach to production instance (no restart yet)
- **Phase 6C** — Record T0; `aws rds reboot-db-instance --force-failover`
- **Phase 6D** — Watch status transition `available → rebooting → available`; budget 120s, expect ~72s
- **Phase 6E** — Verify `SHOW wal_level = logical`, `SHOW rds.logical_replication = on`, both slot/sender params = 10
- **Phase 6F** — Smoke test: `/health` 200, full-stack login + HF dashboard query
- **Phase 6-POST** — 30-min observation window

## 6. Rollback triggers

During or after the reboot, any of the following triggers immediate rollback per runbook § Rollback procedure:

- Backend `/health` returns non-200 for > 60 seconds continuous
- Backend P99 query latency > 500ms sustained for > 2 minutes
- > 50 auth failures in any 5-minute window
- `SHOW wal_level` returns anything other than `logical` post-reboot
- `TailrdDMS-RDS_CPU_CRITICAL_DURING_MIGRATION` fires

## 7. Rollback procedure (summary)

1. Reattach `default.postgres15` parameter group (`aws rds modify-db-instance --apply-immediately`)
2. Reboot again (no force-failover this time; the revert is non-urgent)
3. Verify `SHOW wal_level = replica`
4. If rollback fails: restore from pre-logical-repl snapshot taken in Phase 6A

Rollback leaves us in the pre-Day-6 state: CDC unavailable, Waves 2-4 blocked, application fully operational.

## 8. Go/No-Go decision log

Initial run at 2026-04-21T09:44Z found two issues; both remediated and re-run clean at 10:08Z.

| Check | Timestamp (UTC) | Result | Notes |
|---|---|---|---|
| 1. No active ECS deployments | 10:08:12Z | PASS | 1 PRIMARY deployment, COMPLETED, task def `tailrd-backend:91` |
| 2. No alarms in ALARM | 10:08:15Z | PASS | Zero alarms in ALARM globally (after alarm config fix below) |
| 3. RDS baseline clean | 10:08:12Z | PASS | available, Multi-AZ, param-in-sync, no pending mods; CPU 4.2-5.2% across 15 min |
| 4. Backend baseline clean | 10:08:12Z | PASS | /health 200, status healthy, uptime 2348s |
| 5. No recent deploys (>30 min) | 10:08:12Z | PASS | Deploy was 40 min prior (09:28:17Z) |

**Pre-run remediations (for audit trail):**
- Alarm `TailrdDMS-TASK_FAILED` was in ALARM due to missing-datapoint breach logic between Waves. Changed `TreatMissingData: breaching → notBreaching` at 10:07Z (commit `a0ba016`). Alarm auto-transitioned to OK at 10:08:15Z.
- Last deploy at 09:28:17Z was only 16 min before the first Go/No-Go check (09:44Z). Waited out the cooldown; at 10:08Z the window was 40 min.

**Decision:** GO
**Decision timestamp:** 2026-04-21T10:08:15Z
**Decided by:** Jonathan Hart (authorization received after first Go/No-Go re-run report)

## 9. Execution log

### Phase 6A — Snapshot + probe launch + 60s baseline (2026-04-21T10:17-13:01Z)

**Snapshot:**
- ID: `tailrd-production-postgres-pre-logical-repl-2026-04-21`
- ARN: `arn:aws:rds:us-east-1:863518424332:snapshot:tailrd-production-postgres-pre-logical-repl-2026-04-21`
- Status: `available` (reached 100% progress before probe launch)
- Created: 2026-04-21T10:17:16Z
- Size: 100 GB, encrypted (KMS)

**Probe iterations (runbook gap + image reality surfaced here):**
- **v1** task `ae59b99...` (10:17:52Z) — FAILED exit 1. `Cannot find module 'pg'` at `/tmp/probe.js`. Runbook referenced `infrastructure/scripts/rdsRebootHealthCheck.js` that was never committed. Wrote probe, uploaded to S3, committed (`3c84bb6`).
- **v2** task `84dd7344...` (10:26:40Z) — FAILED exit 1. `NODE_PATH=/app/node_modules` didn't help (dash quirk). Commit `ebaa22b`.
- **v3** task `43bfd723...` (12:53:44Z) — FAILED exit 1. Probe at `/app/probe.js` still couldn't resolve `pg` — confirmed `pg` is not a direct backend dependency (Prisma bundles its own engine).
- **v4** task `884fb1c6...` (12:59:10Z) — SUCCESS. Rewrote probe to use `@prisma/client` with `$queryRawUnsafe('SELECT 1')`. Commit `dd984a2`. Probe started 12:59:33.856Z.

**60-second pre-reboot baseline (probe v4, window 12:59:33.857Z - 13:00:32.921Z):**
| Metric | Value |
|---|---:|
| Samples | 60 / 60 (100% success) |
| Fails | 0 |
| Min latency | 1 ms |
| p50 latency | 2 ms |
| p95 latency | 3 ms |
| p99 latency | 86 ms (*first sample only — Prisma cold-start connect*) |
| Max latency | 86 ms |
| Mean latency | 3.17 ms |
| Window span | 59.064 s |

**Anomalies:** none in-window. The 86 ms p99 is attributable entirely to the first probe call, which includes Prisma's lazy connection establishment. Post-warmup every sample is 1-6 ms. Probe continues running through Phase 6C for reboot window capture.

### Phase 6B — Parameter group staged (2026-04-21T13:03-13:06Z)

**Parameter group:**
- Name: `tailrd-production-postgres15-logical-repl`
- ARN: `arn:aws:rds:us-east-1:863518424332:pg:tailrd-production-postgres15-logical-repl`
- Family: `postgres15`

**Parameters set (all `applyType: static`, `applyMethod: pending-reboot`):**

| Parameter | Value |
|---|---|
| `rds.logical_replication` | `1` |
| `max_replication_slots` | `10` |
| `max_wal_senders` | `10` |

**Attach to production RDS:**
- Command: `aws rds modify-db-instance --apply-immediately`
- Transition: `ParameterApplyStatus: applying` (13:05:04Z) → `pending-reboot` (13:06:05Z)
- Total `applying` duration: ~61 seconds
- RDS instance state: `available` throughout (never left)

**Post-attach RDS state (13:06:05Z):**
- `DBInstanceStatus: available`
- `DBParameterGroupName: tailrd-production-postgres15-logical-repl`
- `ParameterApplyStatus: pending-reboot`
- `PendingModifiedValues: {}` (group association itself is live; only the three static params are queued for reboot)

**Probe during Phase 6B:**
- 406 total events at 13:06:18Z
- Last 10 samples all `status: ok`, latency 1-2 ms
- Zero failures across the entire Phase 6B window
- Confirms: attaching a new parameter group with `--apply-immediately` is completely transparent to live traffic. The instance never transitioned out of `available`, and the backend's Prisma pool saw no anomalies.

**What is NOT yet in effect:** `wal_level` is still `replica`, `rds.logical_replication` is still `off` at the engine level. These only change on the next RDS reboot (Phase 6C).

## 10. Post-change actions

- Update `docs/TECH_DEBT_REGISTER.md` item #19 → RESOLVED
- Update `docs/DMS_MIGRATION_LOG.md` with Day 6 entry (snapshot ID, T0, observed timings, success criteria)
- Update `CLAUDE.md` § 9 "Last known working task definition" if backend redeployed
- Schedule Wave 2 (`patients` + `encounters`) for Day 7
