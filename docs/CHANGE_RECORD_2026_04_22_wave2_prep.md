# Change Record: Wave 2 preparation (DMS CDC + probe rewrite + rollback hardening)

**Change ID:** CR-2026-04-22-001
**Owner:** Jonathan Hart
**Status:** IN PROGRESS
**Created:** 2026-04-21
**Target system:** production + staging `tailrd-*-postgres`, Lambda `tailrd-dms-rollback`, new DMS task `tailrd-migration-wave2`
**Change type:** multi-phase preparation ship (no Wave 2 DMS task will be *started* — creation + validation only)
**Blast radius:**
- Phase 7A: none on production (probe rewrite + staging-only simulated failover test)
- Phase 7B: live DMS chaos test against a small harmless table on RDS → Aurora (discussed + authorized separately)
- Phase 7C-7F: Wave 2 DMS task creation (not started), Lambda env var update, shadow validator scheduling, data-integrity pre-flight — no production traffic impact

---

## 1. Purpose

Prepare everything needed to start Wave 2 DMS CDC (`patients` + `encounters`) on Day 8 without drama:

1. Fix tech debt #20 — the `rdsRebootHealthCheck.js` probe that hung across Day 6 Multi-AZ failover. Rewrite with raw `pg` + aggressive timeouts, prove on staging.
2. Run a **live** DMS rollback chaos test (Day 4 chaos test ran with `DMS_TASK_ARN=TBD`). Prove the rollback Lambda actually stops a real running CDC task + drops the slot on source + truncates targets.
3. Create (not start) the Wave 2 DMS task with `full-load-and-cdc` migration type, `dms_wave2_slot` slot name, and the Wave 2 table mapping (`patients`, `encounters`).
4. Update Lambda env vars to point at the new Wave 2 task + new truncate list + new slot name.
5. Wire the shadow read validator as a disabled EventBridge schedule — ready to enable at Wave 2 cutover.
6. Pre-flight composite-unique duplicate check on `patients` + `encounters` source data to catch any row that will fail the Aurora `UNIQUE(hospitalId, fhirPatientId)` / `UNIQUE(hospitalId, fhirEncounterId)` constraints before DMS starts.

## 2. Prerequisites

- [x] Day 6 merged (PR #171 at 2026-04-21T13:50:32Z) — logical replication live on prod
- [x] System state checkpoint `docs/SYSTEM_STATE_2026_04_22_pre_day7.md` → GO verdict
- [x] Tech debt #19 RESOLVED; tech debt #20 tracked (this ship resolves it)
- [x] Rollback Lambda deployed and IAM-permitted (from Day 4)
- [x] Aurora cluster healthy, 3 members, ACU 0.5-16

## 3. Phases (executed with explicit stop-gates)

| Phase | Summary | Blast radius | Stop gate |
|---|---|---|---|
| 7A | Change record, Go/No-Go, probe rewrite + staging reboot test | Staging only (a 72s reboot of staging) | — (safe auto-continue) |
| 7B | Live DMS rollback chaos test with real running CDC task on a harmless source table | Small — a tmp slot is created + dropped, a tmp target table is truncated | **STOP — requires explicit authorization before proceeding** |
| 7C | Create Wave 2 DMS task (NOT started) | None — creation only | **STOP — requires explicit authorization** |
| 7D | Update rollback Lambda env vars for Wave 2 | None — env var change only | — |
| 7E | Shadow validator EventBridge schedule (disabled) | None | — |
| 7F | Composite-unique duplicate pre-flight on `patients` + `encounters` | Read-only query against prod RDS | **STOP IF DUPLICATES FOUND** — investigate before any fix |

## 4. Go/No-Go checklist

Executed at start of Phase 7A. All 5 must pass:

1. No active ECS deployments on `tailrd-production-backend`
2. No CloudWatch alarms in ALARM state
3. Production RDS `available`, logical repl still active (re-verified via SHOW)
4. Backend `/health` 200, uptime stable
5. No recent deploys within 30 min (or last deploy was the Day 6 CI auto-redeploy that ran cleanly)

## 5. Success criteria

- [ ] Probe v2 emits fail samples (not missing data) through a staging force-failover window; recovers automatically afterward. Zero hangs.
- [ ] Live DMS chaos test: synthetic CDC task stops under alarm trigger, slot on source is dropped, target table is truncated, SNS notification published. End-to-end within 90s of alarm breach.
- [ ] Wave 2 DMS task exists in `stopped` state (created, never started) with correct table mapping + migration type + slot name.
- [ ] Lambda env vars updated and verified (`aws lambda get-function-configuration` round-trip confirms new values).
- [ ] Shadow validator EventBridge rule created but DISABLED — ready to enable at Wave 2 cutover.
- [ ] Zero duplicates on `patients (hospitalId, fhirPatientId)` and `encounters (hospitalId, fhirEncounterId)` pairs. If duplicates found, documented and fix-plan proposed before any DMS action.

## 6. Rollback plan (per phase)

- **7A probe change:** none needed — rewriting a probe is code-only, deployed via S3 + ECS run-task command updates. Revertible with `git revert`.
- **7A staging reboot:** staging is not customer-facing; if it doesn't come back cleanly, restore from automated backup (retention 1 day, RPO < 24h).
- **7B live chaos test:** target is a temporary table `chaos_test_source_day7` created specifically for this test. Rollback = the rollback itself (that's the whole point).
- **7C task creation:** `aws dms delete-replication-task`.
- **7D Lambda env:** prior env vars captured in `docs/SYSTEM_STATE_2026_04_22_pre_day7.md §2.6`; restore via `aws lambda update-function-configuration`.
- **7E EventBridge:** `aws events delete-rule`.
- **7F duplicate check:** read-only; no rollback needed.

## 7. Execution log

*(appended live during execution)*

## 8. Tech debt

- Resolves: **#20** (`rdsRebootHealthCheck.js` probe hangs across Multi-AZ failover)
- Prepares: work leading to Wave 2 cutover on Day 8

## 9. Post-change actions

- [ ] Update `docs/TECH_DEBT_REGISTER.md` #20 → RESOLVED on probe validation success
- [ ] Update `docs/DMS_MIGRATION_LOG.md` with Day 7 entry
- [ ] Update `docs/DMS_CHAOS_TEST_LOG.md` with live chaos test evidence (Phase 7B)
- [ ] Schedule Day 8 Wave 2 execution with fresh CR
