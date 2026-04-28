# Change Record: Wave 2 combined-scope production migration (RDS → Aurora)

**Change ID:** CR-2026-04-27-001
**Owner:** Jonathan Hart
**Status:** IN PROGRESS (recording up to pre-mapping pause)
**Created:** 2026-04-27
**Operator:** Jonathan Hart
**Target systems:** Production RDS `tailrd-production-postgres` (source, read), Production Aurora cluster `tailrd-production-aurora` writer (target, write), DMS replication instance `tailrd-dms-replication`.

---

## 1. Scope

Migrate **all 21 NEEDS_MIGRATION tables (~2.1M rows)** from production RDS to production Aurora in a single combined-scope DMS task. Replaces the original Wave 2 + Wave 3 segmented design after that segmentation's underlying assumptions were invalidated by accumulated state drift.

**Tables included** (from `inventoryRdsAurora.js` output, alpha-sorted):
`alerts`, `allergy_intolerances`, `audit_logs`, `conditions`, `contraindication_assessments`, `device_implants`, `drug_titrations`, `encounters`, `error_logs`, `hospitals`, `intervention_tracking`, `login_sessions`, `medications`, `observations`, `patients`, `phenotypes`, `procedures`, `recommendations`, `risk_score_assessments`, `therapy_gaps`, `users`.

**Largest tables:** `procedures` (971,135 rows), `encounters` (353,512), `conditions` (225,439), `medications` (220,552), `device_implants` (36,793).

**Excluded from this Wave (intentional EMPTY_BOTH_OK):** 32 tables that are empty on both databases - terminology tables (`term_*`), feature toggles, breach incidents, etc. DMS skips them via mapping exclusion.

## 2. History - three failed attempts before today's combined approach

| Attempt | T0 | Outcome | Failure mode |
|---|---|---|---|
| 1 | 2026-04-23T23:17:02Z | Failed in 22 sec | Leftover `awsdms_validation_failures_v2` control table on Aurora caused VALIDATOR_TARGET to fail with PostgreSQL `42P07 duplicate_table` error |
| 2 | 2026-04-24T05:35:32Z | Failed in 12 sec | `SupportLobs: false` caused DMS to drop every TEXT column from CSV unload; positional COPY to Aurora misaligned (`Gender` slot received boolean values, `EncounterType` slot received datetime values) |
| 3 | 2026-04-27T17:32:45Z | Failed in 11 sec | FK violations: `patients_hospitalId_fkey` rejected because Aurora's `hospitals` table was empty (Day 7 chaos test on 2026-04-21 TRUNCATE'd it; Wave 2's original Wave 1-loaded-first assumption was invalidated). `SupportLobs: true` fix proven working - DMS unloaded 180k encounter rows successfully before hitting the FK at insert time. |

Each failure surfaced a distinct gap in the migration methodology. See §5 for what each fix added to pre-flight.

## 3. Rationale for combined Wave 2 + Wave 3 + 4 → single task

After Attempt 3 surfaced the empty-`hospitals` issue, an inventory across both databases (`infrastructure/scripts/phase-2d/inventoryRdsAurora.js`) showed Aurora was empty across **21 tables**, not just `patients` + `encounters`. The original Wave segmentation:
- Wave 1: hospitals + users (loaded April 20, then TRUNCATE'd by Day 7 chaos test)
- Wave 2: patients + encounters
- Wave 3: clinical depth (procedures, conditions, medications, observations, etc.)
- Wave 4: misc

assumed each Wave's parent rows persisted. With Aurora effectively reset by the chaos test, the assumption no longer holds. **Combining Wave 2 + 3 + 4 into a single task** is operationally cleaner:
- One full-load, one CDC start, one validation cycle, one rollback point
- DMS handles parent-before-child ordering during full-load (FK-aware)
- Aurora becomes the canonical post-Day-4-recovery data state via this single migration

## 4. Pre-flight (executed 2026-04-27)

### 4.1 - Tech debt #28 cleared (PR #184 shipped + verified, 2026-04-27T16:19-17:07Z)
Out-of-band but blocking: production analytics had never been collecting (schema/writer mismatch since Initial commit). Resolved before resuming Wave 2 to avoid working in a broken telemetry environment. PR #184 merged, deployed, verified. See `docs/TECH_DEBT_REGISTER.md` #28.

### 4.2 - Inventory (`infrastructure/scripts/phase-2d/inventoryRdsAurora.js`, run 2026-04-27T17:43Z)
Single Fargate one-off, RDS + Aurora connections. Output:
- 21 tables NEEDS_MIGRATION (~2.1M rows)
- 32 tables EMPTY_BOTH_OK
- 1 anomaly: `chaos_test_day7` on Aurora only (Day 7 test artifact, empty)
- 1 anomaly: `performance_request_logs` on RDS only (today's PR #184 - schema drift)

### 4.3 - Schema parity (`applyAuroraSchemaParity.js`, run 2026-04-27T18:07Z)
- Aurora migrations BEFORE: only `20260420000000_consolidated_baseline`
- `prisma migrate deploy` applied 2 missing: `20260425000000_audit_log_hospital_nullable` + `20260427000000_add_performance_request_log` (exit 0, transactional)
- `chaos_test_day7` dropped (existed_before=true → exists_after=false)
- Schema parity: **PASS** (21 tables, 21 matches, 0 mismatches across `data_type` / `udt_name` / `is_nullable` / `column_default`)
- Verdict: CLEAN

Aurora is now in full schema parity with RDS, including today's PR #184 `performance_request_logs` table.

### 4.4 - Pre-start state (verified by parity script + earlier wave2Attempt3PreFlight runs)
- Aurora: all NEEDS_MIGRATION tables empty (0 rows each)
- Aurora: no `awsdms_*` control tables (would cause Attempt-1 redux)
- Aurora: no `chaos_test_day7` (cleaned in §4.3)
- Production RDS: 0 replication slots
- IAM: `Phase2D-TempSecretsAccess` cleanly detached after each Fargate cycle
- Lambda `tailrd-dms-rollback` env var `DMS_TASK_ARN` will be updated post-task-create (was pointing at deleted Attempt-3 task)

## 5. Methodology improvements from the three failures

Codified in `docs/AWS_SERVICE_PREREQUISITES_METHODOLOGY.md` and `docs/DMS_MIGRATION_PLAN.md` §13:

| Failure | Methodology gap closed |
|---|---|
| Attempt 1 (`awsdms_*` leftover) | Pre-flight must scan target for `awsdms_*` tables and DROP CASCADE before starting any DMS task. Pattern lives in `wave2Attempt3PreFlight.js`. |
| Attempt 2 (`SupportLobs: false`) | Task settings must be inspected for `SupportLobs` BEFORE start. PostgreSQL TEXT/JSONB sources require `SupportLobs: true`. Codified in attempt-3 task config + this CR. |
| Attempt 3 (empty parent tables) | Pre-flight must verify parent table population, not just target table emptiness. Codified via `inventoryRdsAurora.js` cross-DB inventory. |
| Attempt 3 (schema drift) | Pre-flight must verify schema parity, not just structural existence. Codified via `applyAuroraSchemaParity.js`. |

## 6. Pause points before continuing

1. **PAUSED - pre-mapping doc updates** (this CR + DMS_MIGRATION_PLAN.md + TECH_DEBT_REGISTER.md + DMS_MIGRATION_LOG.md). Once docs land:
2. Build combined Wave 2 mapping (21 tables in selection rules) - pause for review.
3. Create new task with combined mapping + saved settings - pause to confirm `ready` status.
4. Update Lambda env `DMS_TASK_ARN` to new task.
5. Pre-start verification (Aurora still empty + RDS no slots + capture source counts).
6. Start replication - 15-min observation window.
7. Per-table validation as full-load progresses.
8. CDC validation after full-load completes.
9. (Sections 7-9 to be filled in as execution progresses.)

## 7. Execution log

### 2026-04-27T17:42:25Z - Attempt 3 task `OZS7WJIBZNGZFD5BRKAO6JIAW4` deleted
After Attempt 3 errored (FK violations from empty Aurora `hospitals`), task stopped + deleted cleanly. Total stop+delete cycle: 2m 22s (17:40:03Z stop issued → 17:42:25Z `ResourceNotFoundFault`).

### 2026-04-27T17:43Z - Inventory across both databases
`infrastructure/scripts/phase-2d/inventoryRdsAurora.js` Fargate run. Output: 21 NEEDS_MIGRATION tables (~1.82M rows actual; earlier ~2.1M estimate was rougher), 32 EMPTY_BOTH_OK, 1 RDS_ONLY anomaly (`performance_request_logs` from today's PR #184), 1 AURORA_ONLY anomaly (`chaos_test_day7` Day 7 test artifact).

### 2026-04-27T18:07Z - Aurora schema parity restored
`applyAuroraSchemaParity.js` Fargate run. `prisma migrate deploy` against Aurora applied 2 missing migrations (`20260425000000_audit_log_hospital_nullable`, `20260427000000_add_performance_request_log`). Dropped `chaos_test_day7`. Schema parity: 21/21 tables match, 0 mismatches. Verdict CLEAN.

### 2026-04-27T18:19:24Z - New task `tailrd-migration-wave2-combined` created
ARN `arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA`. Initial 21-table mapping per pre-parity inventory. `ready` state at 18:20:10Z (46 sec).

### 2026-04-27T18:21Z - Lambda env updated
`tailrd-dms-rollback` `DMS_TASK_ARN` updated from `OZS7WJIBZNGZFD5BRKAO6JIAW4` (deleted) to new task. Status `Successful`. All 10 env vars preserved.

### 2026-04-27T18:22Z - Pre-start inventory + slot check
Re-ran `inventoryRdsAurora.js` (extended to also check `pg_replication_slots`). Result: 22 NEEDS_MIGRATION tables (not 21). The schema parity fix at 18:07Z created `performance_request_logs` on Aurora; with that table now present-but-empty on Aurora, the inventory categorization shifted from RDS_ONLY → NEEDS_MIGRATION. RDS slots empty. All other 21 tables still empty on Aurora.

### 2026-04-27T18:30:30Z - Mapping modified in place
`aws dms modify-replication-task` added rule-22 (`performance_request_logs`). Task transitioned `ready` → `modifying` → `ready` in 35 sec. Final scope: **22 tables, ~1.82M total source rows**. Mapping verified: 22 selection rules, `performance_request_logs` at alpha position 16.

| Source row count baseline (validation reference) | |
|---|---:|
| `users` | 1 |
| `contraindication_assessments`, `drug_titrations` | 2 each |
| `intervention_tracking` | 3 |
| `risk_score_assessments`, `hospitals` | 4 each |
| `phenotypes` | 7 |
| `recommendations`, `alerts` | 8 each |
| `performance_request_logs` | 14 |
| `audit_logs`, `observations` | 60 each |
| `error_logs` | 54 |
| `login_sessions` | 83 |
| `therapy_gaps` | 211 |
| `allergy_intolerances` | 5,506 |
| `patients` | 6,147 |
| `device_implants` | 36,793 |
| `medications` | 220,552 |
| `conditions` | 225,439 |
| `encounters` | 353,512 |
| `procedures` | 971,135 |
| **Total** | **1,819,605** |

### 2026-04-27T18:32:17Z - Replication started (T0_REPLICATION)
`aws dms start-replication-task --start-replication-task-type start-replication`. Status `starting` → `running`.

### 2026-04-27T18:33:35Z (T+78s) - Full-load complete with mixed result
- 11 tables `Table completed`: hospitals (4), users (1), patients (6,147), encounters (353,512), procedures (971,135), medications (220,552), observations (60), phenotypes (7), recommendations (8), risk_score_assessments (4), therapy_gaps (211)
- 11 tables `Table error`: alerts, allergy_intolerances, audit_logs, conditions (140k unloaded before fail), contraindication_assessments, device_implants (30k unloaded before fail), drug_titrations, error_logs, intervention_tracking, login_sessions, performance_request_logs
- All 11 errors: FK violations against patients/users/hospitals (Aurora postgresql logs). Cause: DMS parallel-load chose to start child tables before parent table commits. See tech debt #33.

### 2026-04-27T18:38:11Z (T+5m54s) - Reload errored tables (T_RELOAD)
Two `aws dms reload-tables` calls (DMS limits 10 tables per request → split 10+1):
- Batch 1: alerts, allergy_intolerances, audit_logs, conditions, contraindication_assessments, device_implants, drug_titrations, error_logs, intervention_tracking, login_sessions
- Batch 2: performance_request_logs

### 2026-04-27T18:39:11Z (T+6m54s) - All 22 tables in `Table completed`
Reload took ~1 minute. Parents had committed; FKs satisfied; all 11 reloaded cleanly.

## 8. Validation results

### 2026-04-27T18:41:39Z - Independent SQL validation via Fargate
`inventoryRdsAurora.js` cross-database row count check:

| Table | RDS | Aurora | Match |
|---|---:|---:|:---:|
| procedures | 971,135 | 971,135 | ✓ |
| encounters | 353,512 | 353,512 | ✓ |
| conditions | 225,439 | 225,439 | ✓ |
| medications | 220,552 | 220,552 | ✓ |
| device_implants | 36,793 | 36,793 | ✓ |
| patients | 6,147 | 6,147 | ✓ |
| allergy_intolerances | 5,506 | 5,506 | ✓ |
| therapy_gaps | 211 | 211 | ✓ |
| login_sessions | 83 | 83 | ✓ |
| audit_logs | 60 | 60 | ✓ |
| observations | 60 | 60 | ✓ |
| error_logs | 54 | 54 | ✓ |
| performance_request_logs | 14 | 14 | ✓ |
| alerts, recommendations | 8, 8 | 8, 8 | ✓ |
| phenotypes | 7 | 7 | ✓ |
| hospitals, risk_score_assessments | 4, 4 | 4, 4 | ✓ |
| intervention_tracking | 3 | 3 | ✓ |
| contraindication_assessments, drug_titrations | 2, 2 | 2, 2 | ✓ |
| users | 1 | 1 | ✓ |
| **TOTAL** | **1,819,605** | **1,819,605** | **EXACT** |

All 22 tables: `ALREADY_MIGRATED` category. 0 drift, 0 mismatches.

## 9. CDC validation

### 2026-04-27T18:41Z - CDC slot active on RDS
`pg_replication_slots` query (via Fargate inventory script extension):
- Slot name: `yfggbh5lxrhdbhyd_00016413_2e76088d_c85c_4516_a807_ef3e6876b3ba`
- Plugin: `test_decoding`
- Slot type: `logical`
- Active: **true**

DMS-managed slot, named after the task ARN prefix. Plugin `test_decoding` matches the Day 6 default-plugin choice (no `slotName` / `pluginName` extra-attrs on source endpoint per the 2026-04-23 fix).

### 2026-04-27T18:43:24Z - CDC propagation test (live traffic)
Generated 5 authenticated HTTP requests (JHart admin login + 5 admin API calls). Backend's analytics middleware buffers per-request entries to `performance_request_logs` (PR #184 wiring); 30-second flush interval. Expected: RDS gains 5 rows; CDC propagates to Aurora within seconds.

### 2026-04-27T18:45:38Z (T+2m14s post-traffic) - CDC propagation VERIFIED
Independent Fargate inventory ran. Per-table state:

| Table | Pre-test | Post-test (RDS) | Post-test (Aurora) | Drift |
|---|---:|---:|---:|---:|
| `performance_request_logs` | 14 / 14 | **19** | **19** | 0 |
| `audit_logs` | 60 / 60 | **61** | **61** | 0 |

Both new-row counts (5 perf logs from buffer flush + 1 audit_log from JHart login event) propagated to Aurora with zero drift. **CDC is operating end-to-end, sub-2-minute propagation latency observed for live production traffic.**

CDC slot status: **ACTIVE**, slot name `yfggbh5lxrhdbhyd_..._a807_ef3e6876b3ba`, plugin `test_decoding`, slot_type `logical`.

## 10. Final state - Wave 2 Attempt 4 SUCCESS

| Metric | Value |
|---|---|
| Tables migrated | 22 of 22 |
| Total rows migrated (full-load) | 1,819,605 |
| Source-target row count match | EXACT (0 drift) |
| Errors after recovery | 0 |
| Schema parity | PASS (verified pre-load, maintained post-load) |
| FK violations after reload-tables | 0 |
| CDC slot | active=true, plugin=test_decoding |
| CDC propagation latency (live traffic) | <2 min observed (`performance_request_logs` 14→19 in <2m14s window) |
| Methodology gaps closed | DMS-control-tables pre-flight (Attempt 1), SupportLobs (Attempt 2), parent-table population check (Attempt 3a), schema parity check (Attempt 3b), FK-aware load-order recommendation (Attempt 4 → tech debt #33) |

### Total wall-clock from initial start to CDC verified
- T0_REPLICATION: 2026-04-27T18:32:17Z
- T_FULL_LOAD_DONE_FIRST_PASS: 2026-04-27T18:33:35Z (T+1m18s, 11 of 22 errored)
- T_RELOAD: 2026-04-27T18:38:11Z (T+5m54s)
- T_ALL_LOADED: 2026-04-27T18:39:11Z (T+6m54s)
- T_INDEPENDENT_VALIDATION: 2026-04-27T18:41:39Z (T+9m22s)
- T_CDC_PROPAGATION_VERIFIED: 2026-04-27T18:45:38Z (T+13m21s)

**Total: 13 minutes 21 seconds, end-to-end.**

### Methodology improvements committed (encoded for next migration)

1. `infrastructure/scripts/phase-2d/inventoryRdsAurora.js` - RDS-vs-Aurora cross-database table inventory + `pg_replication_slots` check (extended)
2. `infrastructure/scripts/phase-2d/applyAuroraSchemaParity.js` - `prisma migrate deploy` to Aurora + DROP stale artifacts + column parity check
3. `infrastructure/scripts/phase-2d/wave2Attempt3PreFlight.js` - sizing + slots + LOB candidate discovery
4. `docs/DMS_MIGRATION_PLAN.md` §13 - schema parity + load-order requirements during migration window
5. Tech debt #32 (Aurora schema drift) and #33 (DMS parallel-load FK race) - RESOLVED with lessons encoded

## 11. Sustained CDC validation (T+30min)

Run between 2026-04-27T18:54:47Z and 2026-04-27T19:26:39Z. Single 30-minute Monitor with 14 traffic iterations (login + 5 admin API calls every 2 min) plus continuous DMS status checks. Two Fargate inventory checkpoints at T+15 and T+30 for independent verification.

### Per-iteration log

| Iter | Elapsed | Traffic ok | DMS | Aurora | Note |
|---:|---:|:---:|:---:|:---:|---|
| 1 | 0 min | 5/5 | running | available | baseline |
| 2-7 | 2-13 min | 5/5 | running | available | sustained active |
| 8 | 15 min | **0/5** | running | available | backend rate-limit hit |
| 9 | 17 min | 0/5 | running | available | rate-limit holding |
| 10 | 19 min | 5/5 | running | available | rate-limit cleared |
| 11-14 | 21-28 min | 5/5 | running | available | sustained active resumed |

### Inventory checkpoints

| Checkpoint | Total RDS | Total Aurora | Net Δ | New writes propagated since prior |
|---|---:|---:|---:|---:|
| T0 (post-load baseline) | 1,819,605 | 1,819,605 | 0 | - |
| T+15 mid-window | 1,819,661 | 1,819,661 | **0** | +56 (perf_log+35, audit_log+7, login_sessions+8) |
| T+30 final | 1,819,696 | 1,819,696 | **0** | +35 (perf_log+25, audit_log+5, login_sessions+5) |

CDC slot stayed `active=true`, plugin `test_decoding`, throughout. DMS task stayed `running` throughout. Zero drift at any checkpoint.

### Verdict: `CDC_STABLE_FOR_DAY_10`

Three properties demonstrated:
1. **Active-traffic propagation** - 56 rows propagated cleanly during T0–T+15 active-traffic phase
2. **Idle stability** - when traffic stopped between iter 8-9 (rate limit), DMS + slot + Aurora all stayed healthy
3. **Resume after gap** - when traffic resumed at iter 10, CDC continued propagating without re-init or drift

### Methodology learning

**Backend rate limit on `/api/auth/login`.** ~5-7 logins per IP per sliding window triggers HTTP 429 `Too many login attempts`. Observed recovery time ~4 min (peak failure 19:10Z → recovery 19:14Z), faster than the error message's "try again in 15 minutes" copy.

For future sustained-validation tooling: **use login-once + reuse-token pattern, not login-per-iteration.** JWT TTL is 1h, so a single token covers a 30-min validation window comfortably. Documented for follow-up tooling work.

This run inadvertently provided a useful resilience-test side benefit: it showed CDC stays healthy when its source-application authentication system rejects requests (DMS replicates DB-layer changes, not API calls - the rate-limit hit doesn't affect DMS at all).

## 8. Validation results

(To be filled in after full-load completes.)

## 9. CDC validation

(To be filled in after CDC starts.)
