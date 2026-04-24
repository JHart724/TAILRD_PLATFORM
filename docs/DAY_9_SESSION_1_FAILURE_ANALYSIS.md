# Day 9 Session 1 — Failure analysis and close-out

**Date:** 2026-04-23 → 2026-04-24 (session crossed UTC midnight)
**Duration:** ~5 hours active time
**Outcome:** Wave 2 not executed. Three failure modes diagnosed. Production environment cleaned. Ready for a fresh session to execute Attempt 3 with the fix in place.
**Operator:** Jonathan Hart

---

## 1. Summary

Wave 2 production migration (RDS → Aurora) was attempted twice and failed both times. Each attempt exposed a distinct failure mode:

| Attempt | T0 | Duration to fail | Root cause (as of post-mortem) |
|---|---|---|---|
| 1 | 2026-04-23T23:17:02Z | ~22 sec | Leftover `awsdms_*` control tables on Aurora target caused VALIDATOR_TARGET init to fail with PostgreSQL `42P07 duplicate_table`. That failure cascaded into a TARGET_LOAD `csv_target` subprocess crash (error 1020403). |
| 2 | 2026-04-24T05:35:32Z | ~12 sec | `SupportLobs: false` in task settings caused DMS to drop every TEXT column from the CSV unload. Target Aurora COPY was then positionally misaligned: boolean `isActive` values landed in the `Gender` enum slot, datetime values landed in `EncounterType`. Aurora rejected the rows with enum type errors. |

The second failure was **latent in the task config** from Day 8 rehearsal. The rehearsal itself failed earlier in the pipeline (at the TRUNCATE FK step), so the LOB misalignment never surfaced. Wave 2 production was the first time a DMS task config with `SupportLobs: false` reached the data-load stage against this Prisma-generated schema.

Production environment is clean at session close.

---

## 2. Attempt 1 failure (2026-04-23T23:17:02Z → 23:17:24Z)

### What happened

Task `X4L644C5LNEN3PPYNNWDDLTB24` (the task created in Day 8 rehearsal prep, modified to `TargetTablePrepMode: DO_NOTHING` then left idle) was started with `start-replication` (virgin task, this start-type was valid).

Within 22 seconds the VALIDATOR_TARGET subsystem failed:

```
[VALIDATOR_TARGE]E: RetCode: SQL_ERROR  SqlState: 42P07 NativeError: 1
Message: ERROR: relation "awsdms_validation_failures_v2_idx_awsdms_validation_failures_v2" already exists
[VALIDATOR_TARGE]E: Failed creating index for table .awsdms_validation_failures_v2. [1022517]
```

PostgreSQL error class `42P07` is `duplicate_table`. Two DMS-managed control tables were already present on Aurora `tailrd` database from an earlier DMS task generation (most likely the Day 7 Phase 7B CDC chaos test or an earlier pre-production verification task):

- `awsdms_apply_exceptions`
- `awsdms_validation_failures_v2`

DMS's validator subsystem tries to create its own control tables + indexes at task start. With the tables already present, the CREATE INDEX failed with 42P07, which crashed the validator, which cascaded into a subprocess failure in the `csv_target` module:

```
[TARGET_LOAD]E: Failed execute unload command [1020403]  (csv_target.c:1181)
[TARGET_LOAD]E: Failed to wait for previous run [1020403]  (csv_target.c:2153)
[TARGET_LOAD]E: Failed to load data from csv file. [1020403]  (odbc_endpoint_imp.c:6737)
```

### Aurora state post-failure

Per re-verification: patients=0 (transactional rollback completed cleanly for the small table), encounters=0 (load did not commit despite `FullLoadRows: 350000` showing in task statistics — that counter tracks staged rows, not committed rows). All other clinical tables unchanged.

### Fix applied (recovery cleanup run 1)

Re-attached `Phase2D-TempSecretsAccess` IAM policy, ran a Fargate one-off Node script (`wave2RecoveryCleanup.js`) in a single Postgres transaction:

1. `DROP TABLE IF EXISTS public."awsdms_apply_exceptions" CASCADE`
2. `DROP TABLE IF EXISTS public."awsdms_validation_failures_v2" CASCADE`
3. `TRUNCATE TABLE public.patients, public.encounters CASCADE`
4. `COMMIT`

Aurora back to DO_NOTHING precondition: 0/0, no awsdms_*. Policy detached immediately after task exit.

---

## 3. Attempt 2 blocker — DMS state machine (2026-04-24T05:28Z → 05:35Z)

### Blocker

`aws dms start-replication-task --start-replication-task-type start-replication` returned:

```
InvalidParameterCombinationException: Start Type : START_REPLICATION,
valid only for tasks running for the first time
```

After attempt 1, DMS marks the task non-virgin permanently. Available retry start-types:

| Start type | Behavior | Viable? |
|---|---|---|
| `resume-processing` | Resume from last checkpoint (CDC only). After attempt 1, `RecoveryCheckpoint` was set to a CDC LSN; `FullLoadProgressPercent=100`. Would skip full-load entirely. | No — would migrate zero data. |
| `reload-target` | Full reload with unconditional TRUNCATE. | No — Day 8 proved TRUNCATE fails on FK constraints (`alerts→patients`, `observations→encounters`) even with `DO_NOTHING` setting. |
| Delete + recreate task | Capture config JSON → delete → recreate with same settings + new ARN → virgin state. | Yes. |

### Delete + recreate executed

1. Full task config captured to `/tmp/wave2-recovery/*.json` and uploaded to `s3://...migration-artifacts/wave2-recovery/` for durability.
2. Critical settings verified against required Wave 2 values — all passed.
3. `aws dms delete-replication-task` on the original ARN. Polled until `ResourceNotFoundFault` (~6 min).
4. Stripped `CloudWatchLogGroup` + `CloudWatchLogStream` from settings (DMS rejects these on create — auto-populated). Saved as `wave2_settings_for_create.json`.
5. `aws dms create-replication-task` with identical settings + mappings. New task ARN: `Y2R2KWWLCFENFE4LXOHAILFFRE`. Status reached `ready` in ~20 seconds, `RecoveryCheckpoint: null` (truly virgin).
6. Config diff (original vs recreated): 1 diff total, 1 acceptable (CloudWatchLogStream suffix matches new task ARN), 0 unacceptable. Mappings diff: 0 differences.
7. Lambda env `DMS_TASK_ARN` updated to new ARN via `update-function-configuration` (all 9 other env vars preserved verbatim).

### What the recreation did NOT fix

It preserved `SupportLobs: false` exactly as in the original config. This became the next failure mode.

---

## 4. Attempt 2 failure (2026-04-24T05:35:32Z → 05:35:44Z)

### What happened

New task `Y2R2KWWLCFENFE4LXOHAILFFRE` started cleanly. VALIDATOR_TARGET initialized without error (confirming the awsdms_* cleanup was effective). Full-load reached 100% `FullLoadProgressPercent` in 7 seconds. Then both tables moved to `Table error` state.

CloudWatch logs (`dms-tasks-tailrd-dms-replication`) showed the same generic `csv_target` error pattern as attempt 1:

```
[TARGET_LOAD]E: Failed execute unload command [1020403]
[TARGET_LOAD]E: Failed to wait for previous run [1020403]
[TARGET_LOAD]E: Failed to load data from csv file. [1020403]
```

The true root cause was visible only in Aurora's server-side PostgreSQL log at `/aws/rds/cluster/tailrd-production-aurora/postgresql`:

```
2026-04-24 05:35:44 UTC ... ERROR:  invalid input value for enum "Gender": "true"
2026-04-24 05:35:46 UTC ... ERROR:  invalid input value for enum "EncounterType": "2026-04-15 00:12:23.462"
```

### Why column-type values were wrong

DMS task settings contained a self-contradictory LOB configuration:

```json
"TargetMetadata": {
  "SupportLobs": false,
  "LimitedSizeLobMode": true,
  "LobMaxSize": 32,
  "FullLobMode": false
}
```

With `SupportLobs: false`, DMS drops every column that it classifies as a LOB — for PostgreSQL `psqlodbcw` driver, this includes TEXT, VARCHAR (of any size), JSONB, and any PostgreSQL-enum bytes. The CloudWatch task log showed this explicitly:

```
[SOURCE_UNLOAD]I: Column 'id' is unsupported in table def 'public.patients'
  since the LOB support is disabled
[SOURCE_UNLOAD]I: Column 'hospitalId' is unsupported ... LOB support is disabled
[SOURCE_UNLOAD]I: Column 'mrn' is unsupported ... LOB support is disabled
... (16 columns total for patients, 12 for encounters)
```

After dropping those columns, the CSV contained only the non-LOB columns in schema-declaration order — for `patients`, that's roughly: `gender`, `isActive`, `riskScore`, `riskCategory`, `lastAssessment`, 6 module booleans, `isMerged`, `mergedAt`, `lastEHRSync`, `createdAt`, `updatedAt`.

Aurora received the CSV and attempted a positional COPY into a table that still had all its columns in the Prisma-declared order (`id, hospitalId, mrn, firstName, lastName, dateOfBirth, gender, race, ...`). The first CSV value lands in the first column slot. Since the first column slot expected a TEXT `id` but received the first non-LOB source value (`gender` enum, string `'MALE'` or similar), the types were completely misaligned.

The specific errors observed:
- `Gender` slot received `true` (the boolean value from `isActive`) → enum type violation
- `EncounterType` slot received `2026-04-15 00:12:23.462` (a datetime value) → enum type violation

### Aurora state post-failure

Transactionally rolled back to 0/0. Same pattern as attempt 1. No partial commits persisted.

### Why this survived Day 8 rehearsal

Day 8 rehearsal used the same `SupportLobs: false` setting. But the rehearsal task failed at an earlier pipeline stage (`TargetTablePrepMode: TRUNCATE_BEFORE_LOAD` issuing `TRUNCATE encounters` which failed on the `observations → encounters` FK). That failure occurred before the CSV load step ever ran. So the LOB misalignment was not exercised.

**Methodological gap:** staging rehearsals that fail early mask later-stage bugs. A rehearsal that completes only 60% of the pipeline has only validated those 60%. Day 8 validated observability and endpoint config. It did NOT validate the CSV load mechanism.

---

## 5. Prerequisites audit gaps (additions to methodology)

Three gaps in `docs/AWS_SERVICE_PREREQUISITES_METHODOLOGY.md` identified through this session:

1. **DMS target control-table pre-check.** Before any DMS full-load start, the target database must be queried for leftover `awsdms_*` tables. These persist across task generations and cause 42P07 on next task init.
2. **DMS task state-machine awareness.** After any failure, a task cannot be restarted with `start-replication`. Delete + recreate is the only clean-slate path. Capture full config via `describe-replication-tasks --output json` before delete.
3. **PostgreSQL source + SupportLobs interaction.** For PostgreSQL sources with TEXT/VARCHAR columns, `SupportLobs: true` is mandatory; `SupportLobs: false` silently drops these columns.
4. **Rehearsal-through-completion.** A rehearsal must re-run with early failures fixed until the full pipeline completes. Stopping after first error hides downstream bugs.

These are codified in the methodology doc update shipped with this session.

---

## 6. Fresh session plan for Attempt 3

**Precondition at session start** (verified at close-out):
- Aurora `tailrd`: patients=0, encounters=0, no `awsdms_*` tables
- Production RDS: 0 replication slots
- IAM: `Phase2D-TempSecretsAccess` detached from `tailrd-production-ecs-task` role
- Wave 2 task `Y2R2KWWLCFENFE4LXOHAILFFRE`: preserved in `stopped` state as failure evidence
- Lambda env `DMS_TASK_ARN`: still pointing at the failed `Y2R2KWWL...` task (will be updated on recreate)
- Snapshots: `tailrd-production-postgres-day8-rehearsal-3-2026-04-24` retained (100 GB, available)

**Execution plan:**

1. **Phase 9-PRE audit (re-run).** Read `docs/SYSTEM_STATE_2026_04_23_pre_day9.md` as template. Verify git state, DMS task/endpoints, RDS+Aurora state, safety infra (Lambda, SNS, alarms). Update the doc with fresh numbers. Expected outcome: same GO posture as before, now with cleaner stale-state (no leftover awsdms_*, no slots).

2. **Capture current Y2R2KWWL... task config.** Still needed because attempt 3 must use the same settings *minus* the SupportLobs bug.

3. **Review + correct settings for attempt 3.** The specific change: `TargetMetadata.SupportLobs: false → true`. Keep `LimitedSizeLobMode: true` and `LobMaxSize: 32` (these only take effect when SupportLobs is true). All other settings preserve verbatim.

4. **Delete failed Y2R2KWWL... task.** After config capture.

5. **Recreate with corrected settings.** New ARN.

6. **Update Lambda env DMS_TASK_ARN.** Third time this session's branch.

7. **Pre-execution re-verification via Fargate one-off** (combined: Aurora empty + RDS no slots + data integrity baseline capture). Re-attach Phase2D-TempSecretsAccess, run, detach.

8. **Record T0_attempt3 and start.** `start-replication` on the new virgin task.

9. **Phase 9-B monitoring.** This time the TEXT columns should replicate correctly. Expected: patients full-load in seconds, encounters in 10-45 min, then CDC auto-transition.

10. **Phase 9-C/D/E/F/G.** 6 validation gates, CDC tests, 15-min observation, change record finalization, PR + merge.

**Anticipated risks for attempt 3:**
- Hidden assumption: `SupportLobs: true` works against this schema. Prisma schema has TEXT and JSONB columns. DMS with `SupportLobs: true` + `LimitedSizeLobMode: true, LobMaxSize: 32` supports TEXT/VARCHAR up to 32 KB per value. Aurora tailrd's TEXT values should comfortably fit (typical values: 10-200 bytes). JSONB `diagnosisCodes` on encounters may be larger — worth spot-checking source RDS for max JSONB size before start.
- If JSONB exceeds 32 KB, switch to `FullLobMode: true` (streams without size limit).

---

## 7. Environment state at close-out (verified via Fargate one-off task `13a5330a1c5d4bb5b2d3986ca6fd5bb7`)

```
Aurora tailrd cleanup:
  before: patients=0, encounters=0, awsdms_tables=[awsdms_apply_exceptions, awsdms_validation_failures_v2]
  after:  patients=0, encounters=0, awsdms_tables=[]
  actions:
    - DROP TABLE public."awsdms_apply_exceptions" CASCADE
    - DROP TABLE public."awsdms_validation_failures_v2" CASCADE
    - TRUNCATE TABLE public.patients, public.encounters CASCADE
  verdict: CLEAN

Production RDS replication slot cleanup:
  before: 1 slot (y2r2kwwlcfenfe4l_00016413_93278367_8cf9_456b_8be0_565d354a2cf1,
          plugin=test_decoding, active=false, restart_lsn=53/C0000208)
  dropped: 1 (pg_drop_replication_slot succeeded)
  after:  0 slots
  verdict: CLEAN

IAM:
  Phase2D-TempSecretsAccess detached from tailrd-production-ecs-task.
  Role back to 2 original inline policies.

DMS task Y2R2KWWLCFENFE4LXOHAILFFRE:
  Status: stopped (preserved as evidence for Attempt 3 config review)

Lambda tailrd-dms-rollback:
  DMS_TASK_ARN: arn:aws:dms:us-east-1:863518424332:task:Y2R2KWWLCFENFE4LXOHAILFFRE
  (will be updated during Attempt 3 after task recreate)

Snapshots:
  tailrd-production-postgres-day8-rehearsal-3-2026-04-24 retained (100 GB, available)
  as rollback asset for Attempt 3.
```

---

## 8. Artifacts

| Artifact | Location | Purpose |
|---|---|---|
| Pre-flight script | `infrastructure/scripts/phase-2d/wave2Day9Preflight.js` + S3 | DB baseline capture |
| Pre-flight baseline output | `s3://.../migration-artifacts/wave2-production/encounter-sample-2026-04-23T22-49-28-292Z.json` | Gate 2/3 comparison (stale; fresh capture needed in Attempt 3) |
| Data investigation script | `infrastructure/scripts/phase-2d/dataInvestigation.js` + S3 | Confirmed 6,147 patients is correct production state |
| Data investigation report | `docs/DATA_INVESTIGATION_2026_04_23.md` | Response to "where are the hundreds of thousands of patients" |
| Recovery cleanup script | `infrastructure/scripts/phase-2d/wave2RecoveryCleanup.js` + S3 | Drop awsdms_*, truncate patients+encounters |
| Task config captures | `s3://.../migration-artifacts/wave2-recovery/wave2_task_original.json` + settings + mappings | Original X4L644... config preserved |
| Close-out cleanup script | `infrastructure/scripts/phase-2d/day9SessionCloseOut.js` + S3 | Combined Aurora + RDS cleanup this run |
| Change record | `docs/CHANGE_RECORD_2026_04_23_wave2_production.md` | Full execution log of both attempts |
| System state pre-day-9 | `docs/SYSTEM_STATE_2026_04_23_pre_day9.md` | Phase 9-PRE findings |
| This analysis | `docs/DAY_9_SESSION_1_FAILURE_ANALYSIS.md` | Session close-out record |
