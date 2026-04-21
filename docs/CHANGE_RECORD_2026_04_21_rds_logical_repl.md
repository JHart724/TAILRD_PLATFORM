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

_(filled at execution time)_

| Check | Timestamp (UTC) | Result | Notes |
|---|---|---|---|
| 1. No active ECS deployments | | | |
| 2. No alarms in ALARM | | | |
| 3. RDS baseline clean | | | |
| 4. Backend baseline clean | | | |
| 5. No recent deploys | | | |

**Decision:** [GO / NO-GO]
**Decision timestamp:** [UTC]
**Decided by:** Jonathan Hart

## 9. Execution log

_(filled at execution time — T0, phase transitions, observed timings, success criteria validation)_

## 10. Post-change actions

- Update `docs/TECH_DEBT_REGISTER.md` item #19 → RESOLVED
- Update `docs/DMS_MIGRATION_LOG.md` with Day 6 entry (snapshot ID, T0, observed timings, success criteria)
- Update `CLAUDE.md` § 9 "Last known working task definition" if backend redeployed
- Schedule Wave 2 (`patients` + `encounters`) for Day 7
