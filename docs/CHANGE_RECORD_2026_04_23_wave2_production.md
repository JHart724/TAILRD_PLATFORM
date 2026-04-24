# Change Record: Wave 2 production migration (RDS → Aurora)

**Change ID:** CR-2026-04-23-002
**Owner:** Jonathan Hart
**Status:** IN PROGRESS
**Created:** 2026-04-23 (Day 9 of Aurora V2 migration plan)
**Operator:** Jonathan Hart (fresh Day 9 session)
**Target systems:** Production RDS `tailrd-production-postgres` (source, read), Production Aurora `tailrd-production-aurora` writer (target, write), DMS replication task `tailrd-migration-wave2`.

---

## 1. Scope

Migrate the current `patients` and `encounters` tables from production RDS to production Aurora via DMS `full-load-and-cdc` task `X4L644C5LNEN3PPYNNWDDLTB24`. Aurora target is empty (`TargetTablePrepMode: DO_NOTHING` precondition). After full-load completes, CDC remains active continuously until Day 13 cutover.

**Data volume migrated:**
- patients: 6,147 (current production state — MCD Synthea demo + 15 demo-hospital seeds)
- encounters: 353,512 (1:1 with the 6,147 patients via `patientId` FK)

**Data character:** Synthea-generated synthetic clinical data plus 15 manually-seeded demo records. No real PHI. Production has never held real-EHR PHI; first real-PHI ingestion is gated on Redox connect (separate workstream). See `docs/DATA_INVESTIGATION_2026_04_23.md` for the full audit trail establishing this state.

**Why Wave 2 still matters with demo-only data:** the migration validates the full RDS → Aurora cutover path on production infrastructure (real network, real IAM, real Multi-AZ Aurora cluster, real CDC) so future real-PHI ingestion events at pilot scale can rely on a proven mechanism. The migration's value is the proof, not the volume.

## 2. Prerequisites confirmed (Phase 9-PRE)

All gates green. Full evidence in `docs/SYSTEM_STATE_2026_04_23_pre_day9.md`.

- Git: PRs #173-177 merged on main, working tree clean
- DMS task config: `Status: ready`, `TargetTablePrepMode: DO_NOTHING`, `MigrationType: full-load-and-cdc`, validation enabled (`ROW_LEVEL`), patients + encounters mapped
- Endpoints: source `tailrd-rds-source` (no slotName extra-attr), target `tailrd-aurora-target` (Aurora writer), both test-connection successful
- Source RDS: available, Multi-AZ, postgres 15.14, params in-sync; logical replication enabled (Day 6)
- Aurora cluster: available, 3-node (1 writer + 2 readers), HttpEndpointEnabled false
- DB-layer (verified via Fargate one-off `6ad655f2c49c44b9bba878dbce70ec04` at 22:49Z):
  - Source patients = 6,147; encounters = 353,512
  - Source `pg_replication_slots` = 0 (no orphans)
  - tailrd_admin ∈ rds_superuser
  - Aurora patients = 0, encounters = 0 (DO_NOTHING precondition met)
  - Aurora has no rehearsal% databases
- Data integrity baseline (recorded by same Fargate task):
  - Source patients md5 (ordered by id): `021d42bbf952e12e492ff7daaa3e379b`
  - 10k random encounter sample + sample rowset checksum (md5 of `id|patientId|startDateTime|encounterType` ordered by id): `d71dc1e18a07ccd98d253561b7f0be36`
  - Saved to `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-production/encounter-sample-2026-04-23T22-49-28-292Z.json` (timestamped) and `encounter-sample-latest.json` (latest pointer); 280,280 bytes; ETag `1153e9c5af08788a420ee957ba6e5cc5`
- Safety infrastructure: 20/20 CloudWatch alarms OK, rollback Lambda armed with Wave 2 ARN, SNS subscription jhart@hartconnltd.com confirmed, snapshot `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` (100 GB, available) retained as ultimate rollback
- IAM: temp Phase2D-TempSecretsAccess attached briefly during pre-flight Fargate task, detached cleanly; ECS task role back to 2 original inline policies

## 3. Operator readiness investigation pivot

Day 9 pre-flight initially completed at 22:49Z. Decision gate presented, GO authorization given, then immediately revoked by operator: "Jonathan's domain knowledge indicates production should have hundreds of thousands of patients, not 6,147. Gap must be investigated and resolved before any Wave 2 execution."

Read-only investigation executed via Fargate task `c2298bd6cc114ff89be2eb04ec53fc55` (no IAM changes — DATABASE_URL injected via execution role, no Aurora secret needed for source-only audit). Findings documented in `docs/DATA_INVESTIGATION_2026_04_23.md`.

**Conclusion:** No data loss. The 6,147 count exactly matches every documented historical artifact (DATA_DEDUPLICATION_PLAN.md, tech debt #2 RESOLVED, MCD dedup change record). Production has always been demo-scale. Operator confirmed Option 1 (resume Wave 2 with current scope) on basis of investigation. This change record is opened immediately following that authorization.

## 4. Rollback posture

| Level | Trigger | Action | Estimated duration |
|---|---|---|---|
| Automated | DMS task fails, hits error threshold | Lambda `tailrd-dms-rollback` fires (env vars armed for Wave 2: TARGET_TRUNCATE_TABLES=patients,encounters; SNS publishes to `tailrd-migration-alerts`) | ~30 sec |
| Manual L1 | Any validation gate (Phase 9-C) fails | `aws dms stop-replication-task`; FK-aware truncate of Aurora patients + encounters via Fargate one-off; restart with fixed config | ~15-30 min |
| Manual L2 | Aurora data corruption discovered post-CDC | Drop FK → truncate → re-add FK on Aurora side; reset Aurora to DO_NOTHING precondition; restart task | ~30 min |
| Catastrophic | Production RDS itself somehow corrupted (theoretical — Wave 2 is read-only on source) | Restore production RDS from `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` snapshot to a new instance; cutover DNS / DATABASE_URL; full investigation before resuming | ~hours |

The catastrophic path is genuinely theoretical: DMS reads source via the standard PostgreSQL streaming-replication protocol; it never writes to source. Source-side risk = zero by design.

## 5. Expected timeline (from rehearsal actuals)

- patients full-load (6,147 rows): 30 sec - 5 min
- encounters full-load (353,512 rows): 10-45 min
- Full-load → CDC transition: automatic, within 60 sec
- 15-min CDC observation window after transition
- Total active monitoring: 2-3 hours

## 6. Execution log

### Phase 9-A — Change record + T0 + task start

**T0 (Wave 2 production): `2026-04-23T23:17:02.912Z`**

Task start command: `aws dms start-replication-task --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24 --start-replication-task-type start-replication` (NOT `reload-target`)

Immediate response (2026-04-23T23:17:05Z):
- Status: `starting`
- LastFailureMessage: null
- StartDate: 2026-04-23T23:17:05.517Z
- Latency from T0 to API ack: 2.6 sec

### Phase 9-B — Full-load monitoring (attempt 1)

**FAILED at T+22 sec.** Both tables errored. Task auto-stopped after subtask exits.

Timeline:
- T0 = 23:17:02.912Z (task start command issued)
- T+2.6s (23:17:05Z): API ack — `Status: starting`
- T+19s (23:17:21.865Z): task transitioned to `running`, full-load began
- T+22s (23:17:24Z): **VALIDATOR_TARGET failure** — first error
- T+24s (23:17:26Z): patients table errored after CSV stage
- T+27s (23:17:29Z): encounters table errored after CSV stage (350,000 of 353,512 unloaded from source)
- T+~5min (23:22Z): operator stopped task; final state `Status: stopped`, `StopReason: Stop Reason NORMAL`

**Per-table outcome:**
| Table | Source unload | Target CSV staged | Final Aurora state |
|---|---|---|---|
| patients | 6,147 rows sent | 6,147 rows received, CSV file loaded | TableState: `Table error`, FullLoadRows: 0 |
| encounters | 353,512 rows sent | 353,512 rows received, CSV file loaded | TableState: `Table error`, FullLoadRows: 350,000 |

(The "FullLoadRows" column in `describe-table-statistics` reports the *committed* rows, not the staged rows. Patients = 0 means transactional rollback. Encounters = 350,000 likely means partial commit before failure.)

**Root cause (from CloudWatch logs `dms-tasks-tailrd-dms-replication`):**

```
[VALIDATOR_TARGE]E: RetCode: SQL_ERROR  SqlState: 42P07 NativeError: 1
Message: ERROR: relation "awsdms_validation_failures_v2_idx_awsdms_validation_failures_v2" already exists
[VALIDATOR_TARGE]E: Failed creating index for table .awsdms_validation_failures_v2. [1022517]
```

PostgreSQL error class `42P07 = duplicate_table`. DMS attempted to create its own validation control table + index on Aurora `tailrd` database, but the index already exists from a prior DMS task attempt that left these control objects behind (likely from a much earlier Wave 1 or test task).

When the validator subsystem failed to initialize, the TARGET_LOAD CSV-ingest subprocess crashed (`csv_target.c:1181 Failed execute unload command`, error 1020403) — that error is a downstream effect, not the root cause. Without the validator's leftover control tables, the load would have succeeded.

**Recovery plan (attempt 2):**

1. Verify Aurora state: are `patients` + `encounters` empty (transactional rollback) or partially populated (need FK-aware truncate)? Re-attach Phase2D-TempSecretsAccess for Aurora secret access via Fargate one-off.
2. List all `awsdms_*` control tables on Aurora `tailrd` database. Drop them.
3. If Aurora target tables have partial data: drop FKs that reference patients/encounters, TRUNCATE patients + encounters, re-add FKs.
4. Verify Aurora back to `patients=0, encounters=0` (DO_NOTHING precondition).
5. Detach Phase2D-TempSecretsAccess.
6. `aws dms start-replication-task --start-replication-task-type start-replication` (still NOT reload-target).
7. Resume Phase 9-B monitoring.

**Lessons for future iterations:**
- DMS control tables (`awsdms_*`) survive task deletion. They need explicit cleanup between task generations on the same target database.
- Pre-flight should add: "Verify no `awsdms_*` tables exist on Aurora `tailrd` database" as a precondition.
- The Day 8 rehearsal didn't surface this because it used a separate Aurora database (`tailrd_rehearsal_3`) that DMS created its control tables in fresh.

### Phase 9-RECOVERY-A + B — Reset Aurora to DO_NOTHING precondition

Operator authorized cleanup-only (review script first, then pause before restart).

Re-attached `Phase2D-TempSecretsAccess` inline policy on `tailrd-production-ecs-task` at 23:29Z. Ran Fargate one-off task `8c607cff48304885b5534a18343a7819` with `wave2RecoveryCleanup.js` (transactional, safety-gated, defense-in-depth — full source at `infrastructure/scripts/phase-2d/wave2RecoveryCleanup.js` and `s3://.../migration-artifacts/wave2-production/wave2RecoveryCleanup.js`).

**BEFORE state (refuted earlier inference):**
- patients: **0** (transactional rollback worked — earlier `FullLoadRows=0` was correct, `FullLoadRows=350000` for encounters was the staging counter, not committed)
- encounters: **0**
- all other clinical tables: 0
- `awsdms_*` tables found: **`awsdms_apply_exceptions`, `awsdms_validation_failures_v2`** (TWO leftover control tables, not just the one named in the error log)

**Cleanup actions (one transaction):**
- `DROP TABLE IF EXISTS public."awsdms_apply_exceptions" CASCADE` — succeeded
- `DROP TABLE IF EXISTS public."awsdms_validation_failures_v2" CASCADE` — succeeded
- `TRUNCATE TABLE public.patients, public.encounters CASCADE` — succeeded (no-op since both were already 0; executed for thoroughness)
- `COMMIT` — succeeded

**AFTER state (verified):**
- patients: 0 ✓
- encounters: 0 ✓
- awsdms_*: [] ✓ (no leftover control tables)
- all other clinical tables: 0 ✓

**Verdict: CLEAN.** Aurora restored to DO_NOTHING precondition.

Detached `Phase2D-TempSecretsAccess` immediately after task exit. ECS task role back to 2 inline policies (clean steady state).

Total recovery cleanup duration: ~5 min (script start 23:30:08, COMMIT 23:30:09 = sub-second SQL execution; rest was Fargate provisioning + npm install + S3 download).

### Phase 9-RECOVERY-C — Task recreation (DMS state-machine block)

`aws dms start-replication-task --start-replication-task-type start-replication` returned `InvalidParameterCombinationException: Start Type : START_REPLICATION, valid only for tasks running for the first time`. After attempt 1, DMS marks the task non-virgin. Available start-types are `resume-processing` (would skip full-load and CDC-jump to checkpoint LSN with zero data migrated, since DMS thinks `FullLoadProgressPercent: 100` even though it errored) or `reload-target` (Day 8 proved unconditional TRUNCATE which fails on `alerts → patients` and `observations → encounters` FKs even with DO_NOTHING).

**Resolution:** delete + recreate task with identical config + new ARN.

**Step 1 — Capture original config (source of truth):**
- Full task JSON: `/tmp/wave2-recovery/wave2_task_original.json` (6,926 bytes)
- Settings extract: `wave2_settings_original.json` (4,436 bytes)
- Mappings extract: `wave2_mappings_original.json` (333 bytes)
- All three uploaded to `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-recovery/` for durability

**Step 2 — Verify required values (all PASS):**

| Setting | Value | Required |
|---|---|---|
| TargetMetadata.SupportLobs | False | ✓ |
| TargetMetadata.LimitedSizeLobMode | True | ✓ |
| TargetMetadata.LobMaxSize | 32 | ✓ |
| TargetMetadata.BatchApplyEnabled | False | ✓ |
| ValidationSettings.EnableValidation | True | ✓ |
| ValidationSettings.ValidationMode | ROW_LEVEL | ✓ |
| ValidationSettings.HandleCollationDiff | False | ✓ |
| Logging.EnableLogging | True | ✓ |
| Logging.LogComponents (count) | 22 | ✓ all expected |
| Logging.CloudWatchLogGroup | dms-tasks-tailrd-dms-replication | ✓ |
| **FullLoadSettings.TargetTablePrepMode** | **DO_NOTHING** | ✓ Day 8 fix preserved |
| FullLoadSettings.CreatePkAfterFullLoad | False | ✓ |
| FullLoadSettings.MaxFullLoadSubTasks | 8 | ✓ |
| FullLoadSettings.TransactionConsistencyTimeout | 600 | ✓ |
| FullLoadSettings.CommitRate | 10000 | ✓ |
| ChangeProcessingTuning.BatchApplyTimeoutMin/Max | 1/30 | ✓ |
| ChangeProcessingTuning.MemoryLimitTotal | 1024 | ✓ |
| ErrorBehavior.FailOnNoTablesCaptured | True | ✓ |
| ErrorBehavior.TableErrorEscalationPolicy | STOP_TASK | ✓ |
| Mappings: patients (rule 1) + encounters (rule 2), public schema, include | match | ✓ no other tables |

Original task ARN to retire: `arn:aws:dms:us-east-1:863518424332:task:X4L644C5LNEN3PPYNNWDDLTB24`
New task identifier (same name): `tailrd-migration-wave2`

**Step 3 — S3 durability:** All three config files uploaded to `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-recovery/` (wave2_task_original.json, wave2_settings_original.json, wave2_mappings_original.json).

**Step 4 — Delete old task:**
`aws dms delete-replication-task --replication-task-arn ...X4L644C5LNEN3PPYNNWDDLTB24` → `Status: deleting`. Polled until the ARN returned `ResourceNotFoundFault` (task fully gone). Took ~6 min.

**Step 5 — Recreate task:**
- Pre-processing: stripped `CloudWatchLogGroup` and `CloudWatchLogStream` from settings (DMS rejects these on create — they're auto-populated). Preserved to `wave2_settings_for_create.json`.
- `aws dms create-replication-task --replication-task-identifier tailrd-migration-wave2 ... --tags Key=Purpose,Value=wave2-production Key=RecreatedFrom,Value=X4L644C5LNEN3PPYNNWDDLTB24 Key=RecreatedReason,Value=non-virgin-state-attempt-1`
- New task ARN: `arn:aws:dms:us-east-1:863518424332:task:Y2R2KWWLCFENFE4LXOHAILFFRE`
- Initial status: `creating`. Polled to `ready` in ~20 sec.
- RecoveryCheckpoint: `null` ← truly virgin, no state drift from attempt 1.

**Step 6 — Config diff verification (PASS):**
- Settings diff: 1 diff total, 1 acceptable (CloudWatchLogStream suffix = new task ARN), 0 unacceptable
- Mappings diff: 0 differences
- Verdict: CLEAN

**Step 7 — Lambda env update:**
- Old env before: all 10 vars correct, DMS_TASK_ARN pointing at retired task
- Changed: DMS_TASK_ARN → `Y2R2KWWLCFENFE4LXOHAILFFRE` (all 9 other env vars preserved verbatim)
- Post-update: `LastUpdateStatus: Successful`, verification query confirms new ARN

**Step 8 — Pre-execution re-verification (all PASS):**
- Aurora: 0 patients, 0 encounters, 0 awsdms_* (from cleanup script 23:30Z; no subsequent changes possible)
- Source RDS: 0 replication slots (cleanup + no DMS task running since)
- New task: Status `ready`, RecoveryCheckpoint `null`
- Endpoints: last test-connection cached `successful` on both (endpoints unchanged)
- Settings diff: CLEAN (Step 6)
- Lambda env: verified updated (Step 7)

**Step 9 — T0_attempt2 recorded and start:**

**T0_attempt2: `2026-04-24T05:35:32.258Z`** (~18 min after initial T0 `23:17:02.912Z`)

`aws dms start-replication-task --replication-task-arn arn:aws:dms:us-east-1:863518424332:task:Y2R2KWWLCFENFE4LXOHAILFFRE --start-replication-task-type start-replication`
- Response: `Status: starting`, LastFailureMessage: null
- API ack latency: ~2 sec from T0

### Phase 9-B — Full-load monitoring (attempt 2)

**FAILED at T+12 sec.** Same csv_target error pattern in DMS logs, but — critically — no `42P07` this time (awsdms cleanup worked). Aurora server-side PostgreSQL log revealed the actual root cause:

```
2026-04-24 05:35:44 UTC ... ERROR: invalid input value for enum "Gender": "true"
2026-04-24 05:35:46 UTC ... ERROR: invalid input value for enum "EncounterType": "2026-04-15 00:12:23.462"
```

**Root cause: `SupportLobs: false` column misalignment.** DMS with this setting drops every TEXT/VARCHAR/JSONB column (the log flags each as "unsupported since the LOB support is disabled"). The CSV contains only non-LOB columns. Target Aurora does positional COPY into a table that still has all columns — the first non-LOB source value (e.g., `gender` = `'MALE'` or similar) gets positionally mapped to the target's first-declared column (`id`), and so on. For the visible errors, boolean `isActive` values landed in the `Gender` enum slot and datetime values landed in `EncounterType`.

This was **latent in the task config from Day 8 rehearsal prep.** The rehearsal failed earlier in the pipeline (TRUNCATE FK), so the LOB misalignment never surfaced until Wave 2 production attempt 2 made it to the data-load stage.

Table statistics at failure: `FullLoadProgressPercent: 100` (misleading — staging counter), `TablesErrored: 2`, both tables `Table error` state. Aurora rolled back transactionally: 0 patients, 0 encounters (confirmed post-stop).

Task stopped cleanly via `aws dms stop-replication-task`.

### Phase CLOSE-OUT — Session 1 close-out (2026-04-24T15:50Z → 16:00Z)

Decision: close Day 9 Session 1 without Attempt 3. Surface findings to operator. Clean environment. Fresh session will run Attempt 3 with the SupportLobs fix.

**Close-out Fargate task:** `13a5330a1c5d4bb5b2d3986ca6fd5bb7` using `day9SessionCloseOut.js` (combined Aurora + RDS cleanup to amortize IAM attach/detach cost).

**Results:**

*Aurora (via direct psql):*
- before: patients=0, encounters=0, awsdms_tables=[awsdms_apply_exceptions, awsdms_validation_failures_v2] (recreated by attempt 2)
- actions: `DROP TABLE IF EXISTS awsdms_apply_exceptions CASCADE`, `DROP TABLE IF EXISTS awsdms_validation_failures_v2 CASCADE`, `TRUNCATE TABLE patients, encounters CASCADE`, COMMIT
- after: patients=0, encounters=0, awsdms_tables=[]
- verdict: CLEAN

*Production RDS (via DATABASE_URL injection):*
- before: 1 slot `y2r2kwwlcfenfe4l_00016413_93278367_8cf9_456b_8be0_565d354a2cf1` (plugin=test_decoding, active=false, restart_lsn=53/C0000208) — the DMS-managed slot from attempt 2, orphaned when task delete was blocked but create proceeded separately
- action: `SELECT pg_drop_replication_slot(...)` succeeded
- after: 0 slots
- verdict: CLEAN

*IAM:* Phase2D-TempSecretsAccess detached; role back to 2 original inline policies.

*DMS task `Y2R2KWWLCFENFE4LXOHAILFFRE`:* preserved in `stopped` state as evidence. Will be deleted + recreated with `SupportLobs: true` fix at start of Session 2 (Attempt 3).

*Lambda `tailrd-dms-rollback`:* still references `Y2R2KWWLCFENFE4LXOHAILFFRE`. Will be updated during Attempt 3 task recreate.

## 7. Session 1 outcome

- Wave 2 NOT executed.
- Three distinct failure modes diagnosed and documented.
- Production environment: clean.
- Methodology updated with 4 new DMS-specific prerequisites.
- Attempt 3 plan documented in `docs/DAY_9_SESSION_1_FAILURE_ANALYSIS.md §6`.

## 8. Post-change actions

- Update `docs/DMS_MIGRATION_LOG.md` with Day 9 Session 1 entry (Attempt 3 session handles this)
- Session 2 entry point: fresh Claude Code session reading `docs/DAY_9_SESSION_1_FAILURE_ANALYSIS.md §6`
- Pre-Attempt-3 fix: `TargetMetadata.SupportLobs: false → true` (keep `LimitedSizeLobMode: true`, `LobMaxSize: 32`)
- Spot-check before Attempt 3: query source RDS for max JSONB size on encounters `diagnosisCodes` column — if > 32 KB, switch to `FullLobMode: true`
- Session 1 change record + methodology + failure analysis committed and PR'd

### Phase 9-C — Validation gates (post-full-load)

_pending_

### Phase 9-D — CDC end-to-end verification

_pending_

### Phase 9-E — Post-execution observations

_pending_

## 7. Post-execution actions

- Update `docs/DMS_MIGRATION_LOG.md` with Day 9 Wave 2 completion entry
- Verify Lambda rollback was NOT invoked (only documented if it fires)
- Confirm Phase2D-TempSecretsAccess remains detached
- Commit + PR + merge
- Wave 2 task remains running in CDC mode continuously until Day 13 cutover (DO NOT stop the task)
