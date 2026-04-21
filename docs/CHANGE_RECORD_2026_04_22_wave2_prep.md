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

### Phase 7A — probe rewrite + staging failover test (2026-04-21T14:08-14:26Z)

**Go/No-Go:** 4 of 5 clean. Check 5 (deploy cooldown) was at 26 min (slightly under 30 min threshold) because CI auto-redeployed backend on Day 6 merge. Cooldown will naturally elapse before Phase 7C/7D (which are the phases that actually touch production). Phase 7A is staging-only, so the partial check was accepted.

**Probe v2 rewrite:**
- `infrastructure/scripts/rdsRebootHealthCheck.js` rewritten on raw `pg` Client with layered timeouts:
  - `connectionTimeoutMillis: 2000` (initial TCP connect)
  - `query_timeout: 2000` + `statement_timeout: 2000` (pg internal)
  - `Promise.race` wall-clock timeout fallback (belt-and-suspenders)
- `infrastructure/scripts/probe-package.json` — ephemeral dep pin (`pg: ^8.13.0`); installed via `npm install` at ECS task start (~20-30s cold start)
- New env var `PROBE_DATABASE_URL` for staging-override without touching backend task def secrets config
- First deploy hit SSL verification error (newer pg-connection-string interprets `?sslmode=require` as `verify-full`, overriding our client-level `rejectUnauthorized: false`). Patched to parse the URL manually and pass discrete Client params. Re-uploaded, worked cleanly.

**Staging test (T0 = 2026-04-21T14:23:29.209Z, `aws rds reboot-db-instance --force-failover`):**

| Event | Δ from T0 |
|---|---:|
| Reboot API call (T0) | 0s |
| First probe `fail` sample | **+11.0s** (error: `"Query read timeout"`, latency 2002ms) |
| Last probe `fail` sample | +23.0s (error: `"timeout expired"`, latency 2003ms) |
| **First probe `ok` sample after failure** | **+25.0s** (latency 63ms — reconnect cost) |
| Staging `DBInstanceStatus: available` | +75s |
| Probe stopped manually | +122s |

**Probe v2 verdict: PASS.** 166 total samples across a 2m52s window. 7 fails, 159 ok. **Largest inter-sample gap: 2005ms** — the single 2-second timeout fallback. No hang. Probe never stopped emitting; recovered automatically without intervention.

**Compared to v1 on Day 6 production reboot:** v1 stopped emitting at T+15s and produced zero fail samples across the entire 78s window. v2 emitted 12 distinct fail samples during a 12-second observable outage window with explicit, actionable error messages.

**Tech debt #20 → RESOLVED.**

**Note:** the probe-visible DB unavailability window (12s) is far shorter than the AWS "available" state transition (75s). Multi-AZ cutover completes at the ENI layer around T+25s; the remaining 50s of `rebooting` status is AWS bookkeeping that doesn't affect client connectivity. This means for Wave 2 CDC observation, **probe-visible outage is what matters for application impact**, not AWS's instance-state transitions.

## 8. Tech debt

- Resolves: **#20** (`rdsRebootHealthCheck.js` probe hangs across Multi-AZ failover)
- Prepares: work leading to Wave 2 cutover on Day 8

## 9. Post-change actions

- [ ] Update `docs/TECH_DEBT_REGISTER.md` #20 → RESOLVED on probe validation success
- [ ] Update `docs/DMS_MIGRATION_LOG.md` with Day 7 entry
- [ ] Update `docs/DMS_CHAOS_TEST_LOG.md` with live chaos test evidence (Phase 7B)
- [ ] Schedule Day 8 Wave 2 execution with fresh CR
