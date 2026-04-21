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

### Phase 7B — live DMS rollback chaos test on staging (2026-04-21T14:36-15:04Z)

Per user direction: executed against staging (not production) to avoid prod schema pollution. Same exercise value.

**Setup chain:** added temporary DMS-SG → staging-RDS-SG ingress (rule `sgr-09bd57fc151ce43d3`), created `chaos_test_day7` table on staging (2 rows), created DMS source endpoint `tailrd-staging-source-chaos`, created DMS task `tailrd-dms-chaos-live-test` (`full-load-and-cdc`, chaos_test_day7 only), started task (full-load done in 1.9s, CDC active with slot `xgavhney3rcztdwg_00016401_9a4d6293_8534_4d50_a069_549a129627a8`), created temporary alarm `TailrdDMS-CHAOS-TEST-TASK-FAILED`, updated Lambda env vars for chaos.

**Trigger + rollback (T0 = alarm-fire time 2026-04-21T14:57:16Z):**

| Step | Δ from T0 | Result |
|---|---:|---|
| Alarm fires (2 breached datapoints) | 0s | ALARM |
| Lambda invoked by CloudWatch | +12s | RequestId `a74095ab...` |
| Lambda completes | +13s | 1.18s execution time |
| DMS task → `stopping` | ~+13s | stopTask step succeeded |
| DMS task → `stopped` | +66s | fully stopped |

**Lambda step results:**
- ✅ `stopTask`: `stopped: true, priorStatus: running`
- ❌ `dropSlot`: IAM error — role lacks `secretsmanager:GetSecretValue` on the staging secret ARN. **Test-config artifact, not a rollback-logic bug.** For real Wave 2 (prod source secret), the role already has access. Flagged as Day 8 verify-before-cutover item.
- ✅ `truncate`: `TRUNCATE "chaos_test_day7" CASCADE` on Aurora — success
- ✅ `sns`: published

**Datapoint-count learning:** first single `put-metric-data` publish didn't fire the alarm — alarm needs 2 consecutive 60s periods of breach, and with `TreatMissingData: notBreaching` a single datapoint is only 1 period. Fixed by publishing 3 times 30s apart. For Wave 2 real traffic this is not a concern — DMS continuously publishes `dms.task_healthy`.

**Manual dropSlot cleanup:** one-shot ECS task `pg_terminate_backend(active_pid)` → `pg_drop_replication_slot(...)` → `DROP TABLE chaos_test_day7`. Post-cleanup: 0 slots on staging.

**Full teardown:** chaos alarm deleted, chaos DMS task deleted, staging source endpoint deleted, SG rule revoked, Lambda env vars restored to Wave 1 config (verified via `get-function-configuration` — matches pre-chaos snapshot).

**Verdict:** live rollback chain PROVEN end-to-end. Combined with Day 4 Test 1 (Lambda isolation) + Test 2 (alarm→Lambda wiring), all three legs of the rollback system have evidence. Wave 2 CDC is safe to start on Day 8, conditional on pre-cutover verification that the Lambda role has `GetSecretValue` on the prod source secret ARN (which it already should — prod secrets were the original config).

Full test evidence: `docs/DMS_CHAOS_TEST_LOG.md` Test 3 section.

### Phase 7B.5 — IAM verification for production `dropSlot` (2026-04-21T15:08Z)

**Gap found:** `DMSRollbackPolicy` had `secretsmanager:GetSecretValue` on both prod secret ARN prefixes but NO `kms:Decrypt` statement. The prod DATABASE_URL secret is encrypted with customer CMK `46f6551f-84e6-434f-9316-05055317a1e7`; decrypting it requires explicit `kms:Decrypt` in the caller role's IAM policy (CMK's key policy delegates via `RootAccountAccess`). The Aurora secret uses AWS-default `aws/secretsmanager` key — no grant needed.

**Fix:** added `kms:Decrypt` on the CMK with `kms:ViaService: secretsmanager.us-east-1.amazonaws.com` condition (defense-in-depth — role can only use the key when request routes through Secrets Manager).

**Simulate verification:**
- `secretsmanager:GetSecretValue` on prod DATABASE_URL secret → `allowed` ✅
- `kms:Decrypt` on CMK (with ViaService context) → `allowed` ✅ (matched `role_dms-rollback-role_DMSRollbackPolicy`)

**Conclusion:** Wave 2 `dropSlot` will succeed in production. Full details + policy diff in `docs/DMS_CHAOS_TEST_LOG.md` Phase 7B.5 section.

### Phase 7C — Wave 2 DMS task creation (2026-04-21T15:13Z)

**Source endpoint modification:** `tailrd-rds-source` (ARN `XG3PQTZG5BB4RNX3RWT3G3KICQ`) — added `ExtraConnectionAttributes: "slotName=dms_wave2_slot"` (was `null`). This tells DMS to use a specifically-named logical replication slot at Wave 2 start, so the slot name is predictable and referenceable by the rollback Lambda env var (Phase 7D).

**Task created:**
- **ID:** `tailrd-migration-wave2`
- **ARN:** `arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24`
- **Status:** `ready` (DMS terminology for "created, never started" — equivalent to "stopped" in our intent)
- **Migration type:** `full-load-and-cdc`
- **Source:** `tailrd-rds-source` (prod RDS)
- **Target:** `tailrd-aurora-target`
- **Replication instance:** `tailrd-dms-replication` (t3.medium)

**Table mappings:**
- `public.patients` (include)
- `public.encounters` (include)

**Task settings:**
| Setting | Value | Rationale |
|---|---|---|
| `FullLoadSettings.TargetTablePrepMode` | `TRUNCATE_BEFORE_LOAD` | Defensive — wipes Aurora patients+encounters before load. No-op if already empty. Guarantees clean full-load start state. |
| `FullLoadSettings.CommitRate` | 10000 | Batch commit for throughput |
| `FullLoadSettings.MaxFullLoadSubTasks` | 8 | Parallel loading (within DMS recommendation bounds for t3.medium) |
| `ValidationSettings.EnableValidation` | true | Row-level validation enabled during load + CDC |
| `ValidationSettings.ValidationMode` | ROW_LEVEL | Compares every row between source and target |
| `ValidationSettings.ThreadCount` | 5 | Parallel validation workers |
| `ValidationSettings.FailureMaxCount` | 10000 | Permissive — log failures; DMS suspends tables at the threshold |
| `Logging.EnableLogging` | true | SOURCE_CAPTURE, TARGET_APPLY, SOURCE_UNLOAD, TARGET_LOAD all at DEFAULT severity |
| `ErrorBehavior.FailOnNoTablesCaptured` | true (default) | Defensive — fail if source produces no tables |
| `ErrorBehavior.ApplyErrorEscalationPolicy` | LOG_ERROR (default) | Don't fail the task on single-row apply errors; log them |

**What happens when the task is later started (Day 8):**
1. DMS connects to source using endpoint creds + extra attr `slotName=dms_wave2_slot`
2. DMS creates logical replication slot `dms_wave2_slot` on production RDS (requires `rds.logical_replication=on`, confirmed)
3. Full load: DMS truncates Aurora `patients` + `encounters`, then copies rows from RDS (parallel 8 sub-tasks)
4. CDC: once full load completes, DMS streams WAL changes from the slot continuously
5. Validation runs continuously at row-level, comparing source and target

**State confirmation:** task in `ready` status. Has never been started. Will remain in this state until Day 8 explicit start. All prior Wave 1 state (stopped task `tailrd-migration-wave1`) still retained.

**No production data moved yet.**

### Phase 7D — Rollback Lambda env vars updated for Wave 2 (2026-04-21T15:22Z)

**Env vars diff vs pre-change (Wave 1) snapshot:**

| Variable | Pre-change (Wave 1) | Post-change (Wave 2) | Rationale |
|---|---|---|---|
| `DMS_TASK_ARN` | `...:task:IMG4NEHABJCQTHVRK7GNJYTPXI` (Wave 1) | `...:task:X4L644C5LNEN3PPYNNWDDLTB24` (Wave 2) | Point rollback at the new task |
| `TARGET_TRUNCATE_TABLES` | `hospitals,users` | `patients,encounters` | Wipe Wave 2's targets on rollback |
| `REPLICATION_SLOT_NAME` | *(absent — Wave 1 was full-load-only)* | `dms_wave2_slot` | CDC slot created by Wave 2 |
| `SOURCE_HOST` | prod RDS | prod RDS | unchanged ✅ |
| `AURORA_*` | all prod | all prod | unchanged ✅ |
| `SOURCE_SECRET_ARN` | prod DB URL secret | prod DB URL secret | unchanged ✅ |
| `SNS_TOPIC_ARN` | `tailrd-migration-alerts` | same | unchanged ✅ |

**Smoke-test invocation:** manual invoke with test event `{alarmName: "MANUAL_PHASE7D_SMOKE_TEST", reason: "..."}`. For the test only, `TARGET_TRUNCATE_TABLES` was temporarily set to empty string so the Lambda would skip the truncate step (belt-and-suspenders — Aurora patients+encounters are empty, but avoiding any TRUNCATE side-effect was cleaner). Restored to `patients,encounters` after the test.

Lambda response (StatusCode 200, 1062ms execution):

```json
{
  "alarm": {"alarmName": "MANUAL_PHASE7D_SMOKE_TEST"},
  "config": { "dmsTaskArn": "...X4L644C5LNEN3PPYNNWDDLTB24", "slotName": "dms_wave2_slot", "truncateTables": [] },
  "steps": {
    "stopTask": { "error": "Replication Task ...X4L644... is currently not running." },
    "dropSlot": { "error": "slot drop failed: replication slot \"dms_wave2_slot\" does not exist" },
    "truncate": { "skipped": "no TARGET_TRUNCATE_TABLES configured" },
    "sns":      { "published": true }
  }
}
```

**What this proves:**
- ✅ Lambda reaches DMS API with the new Wave 2 ARN (`stopTask` error is "task not running" — the task is in `ready` state, never started). Expected.
- ✅ **Lambda successfully authenticated against prod RDS and executed SQL.** The `dropSlot` error is "slot does not exist" — the Lambda got past `GetSecretValue` + `kms:Decrypt` + the pg connection + executed `pg_drop_replication_slot` and only then got a "not found" error. **This is end-to-end validation of the Phase 7B.5 IAM + KMS fix in production.**
- ✅ SNS published successfully.
- ✅ `truncate` correctly short-circuited when `TARGET_TRUNCATE_TABLES` was empty.

**Final Lambda env verified:** all 9 variables at Wave 2 config post-test. Ready for Wave 2 CDC start.

### Phase 7E — Shadow validator preparation (2026-04-21T15:30Z)

**Part 1: Test run against current state.** Executed `backend/scripts/shadowReadValidation.ts` as ECS one-shot (`eb6cbd52a5334a40bd6fb5a5949a075c`, exit 0) against the live prod RDS + Aurora endpoints.

Result: **6 queries, 6 divergences** — as expected. Key findings:

| Query | RDS rows | Aurora rows | Notes |
|---|---:|---:|---|
| `hospitals.all` | 4 | 0 | **Aurora was wiped by Day 4 Test 2's chaos TRUNCATE** (which truncated the very data Wave 1 had just loaded). Means Wave 1's full-load result is currently lost from Aurora. |
| `hospitals.count` | 1 | 1 | Different hash — Aurora has 0 hospitals but query returns 1 row (the COUNT aggregate row) |
| `users.by_hospital` | 1 | 0 | Same as hospitals — wiped by Test 2 |
| `users.role_distribution` | 1 | 0 | Same as hospitals — wiped by Test 2 |
| `patients.count_per_hospital` | 3 | 0 | Expected — Wave 2 hasn't run |
| `encounters.by_type` | 4 | 0 | Expected — Wave 2 hasn't run |

**Important Day 8 implication:** Aurora currently has **zero** data in `hospitals` and `users` — Wave 1's full-load was functionally erased by Day 4 chaos Test 2's rollback TRUNCATE. Before Wave 2 starts, either:
- Re-run Wave 1 full-load to repopulate hospitals + users, OR
- Accept that Aurora cutover will require backfilling hospitals + users separately, OR
- Accept that Waves 3-N will themselves truncate/reload their own tables and hospitals + users can wait for a dedicated re-load later

User decision needed at Day 8 start. This is a finding from today, not a drift — but it changes Day 8 planning.

**Part 2: Disabled EventBridge rule created.**

- Rule: `tailrd-shadow-validator-schedule`
- ARN: `arn:aws:events:us-east-1:863518424332:rule/tailrd-shadow-validator-schedule`
- Schedule: `rate(5 minutes)`
- State: **DISABLED** ✅
- IAM role created: `tailrd-eventbridge-ecs-role` with:
  - Trust policy: `events.amazonaws.com`
  - Inline `EventBridgeECSRunTaskPolicy`: `ecs:RunTask` on `tailrd-backend` task-def-family (scoped to `tailrd-production-cluster` via `ArnEquals ecs:cluster` condition) + `iam:PassRole` on the backend task+execution roles (scoped to `ecs-tasks.amazonaws.com`)

**Target NOT YET wired** — deferred to Day 8 Wave 2 start ship. The ECS RunTask target configuration requires inline `SOURCE_DATABASE_URL` + `TARGET_DATABASE_URL` environment overrides. Rather than hardcode production credentials into the EventBridge rule (visible via `describe-rule` + CloudTrail), target wiring happens at cutover against the live task def revision + freshly-fetched Aurora credentials. The rule schedule being present + disabled is the "ready to enable" state the user asked for; enabling + target wiring + initial run are one atomic operation at Day 8 start.

**Known constraint for Day 8 Day-of:**
- Target needs env: `SOURCE_DATABASE_URL` (from `tailrd-production/app/database-url` secret), `TARGET_DATABASE_URL` (constructed from `tailrd-production/app/aurora-db-password` + Aurora writer endpoint), `SHADOW_SCOPE=all`, `SHADOW_WAVE=2`.
- Task role `tailrd-production-ecs-task` needs `GetSecretValue` on Aurora secret if we wire via bootstrap-script pattern (not yet granted). Alternative: inline URLs in target — faster but secrets-in-describe-rule concern.

### Phase 7F — Composite-unique duplicate pre-flight (2026-04-21T15:40Z)

**Result: DUPLICATES FOUND. Wave 2 BLOCKED.**

Ran `infrastructure/scripts/wave2DataIntegrityPreflight.js` + follow-up scope query against production RDS.

**Patients (FAIL):**
- 14,170 total · 14,155 with `fhirPatientId` · 15 without
- **5,053 distinct `(hospitalId, fhirPatientId)` keys with duplicates**
- 13,076 rows involved · **8,023 excess rows** to eliminate for uniqueness
- Dupe-count histogram: 3103 × 2, 950 × 3, 990 × 4, 10 × 6
- 100% on `demo-medical-city-dallas`; `hosp-001` (10 patients) and `hosp-002` (5 patients) are clean
- Smoking gun: same `fhirPatientId` across 4 different seed runs (Apr 14, 15, 16, 17), different CUIDs, different `firstName` per row — classic "seedFromSynthea re-run without tenant wipe" pattern. Ties to tech debt #2 (MCD partial wipe state).

**Encounters (PASS):**
- 353,512 total · 353,479 with `fhirEncounterId` · 33 without
- **0 duplicates on `(hospitalId, fhirEncounterId)`** ✅
- Distribution per patient: p50 = 31, p95 = 171, p99 = 576, max = 864 encounters/patient
- 6,150 patients have at least one encounter

**Dependent-data impact of deleting dupe patients:**
- **290,064 encounters** reference the duplicate patient CUIDs (82% of all encounters)
- 0 observations, 0 therapy_gaps (those tables are empty)

**Full analysis + remediation options:** `docs/DATA_DEDUPLICATION_PLAN.md` (written).

**Recommendation (summarized from the plan):** Option A — complete the MCD wipe (closes tech debt #2), re-seed cleanly. Fallback: Option B — in-place dedup with encounter FK reassignment against a throwaway clone first.

**Day 8 start BLOCKED pending remediation decision.**

## 8. Tech debt

- Resolves: **#20** (`rdsRebootHealthCheck.js` probe hangs across Multi-AZ failover)
- Prepares: work leading to Wave 2 cutover on Day 8

## 9. Post-change actions

- [ ] Update `docs/TECH_DEBT_REGISTER.md` #20 → RESOLVED on probe validation success
- [ ] Update `docs/DMS_MIGRATION_LOG.md` with Day 7 entry
- [ ] Update `docs/DMS_CHAOS_TEST_LOG.md` with live chaos test evidence (Phase 7B)
- [ ] Schedule Day 8 Wave 2 execution with fresh CR
