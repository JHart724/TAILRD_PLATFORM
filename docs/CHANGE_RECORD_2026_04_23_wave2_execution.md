<!-- PROVENANCE BANNER added 2026-08-18 on landing. The record BELOW is preserved VERBATIM as
     authored 2026-04-22..23 (typography normalized to ASCII per DRIFT-44; no wording changed). -->

> **Historical record, landed 2026-08-18.** This change record was authored on 2026-04-22/23 and sat on an
> unmerged local branch (`feat/aurora-v2-day8-wave2-execution`) until it was recovered during the AUDIT-321
> stale-branch sweep. It is landed for institutional memory, not as a live change.
>
> **Read its `Status: IN PROGRESS` line as of 2026-04-22, not today.** What happened next: the Day 8
> rehearsal was HALTED on three DMS failures (the verdict section below), and the RDS-to-Aurora cutover
> subsequently COMPLETED on 2026-04-29 (see CLAUDE.md section 9). The value of this document is the record
> of the failed rehearsal that preceded the successful cutover.

---

# Change Record: Aurora V2 Wave 2 execution with staging rehearsal

**Change ID:** CR-2026-04-23-001
**Owner:** Jonathan Hart
**Status:** IN PROGRESS
**Created:** 2026-04-22 (Day 8 of 10-day Aurora V2 migration)
**Target systems:** production RDS -> Aurora writer (Wave 2 tables: `patients` + `encounters`). Staging rehearsal uses isolated `tailrd-staging-wave2-rehearsal` RDS + `tailrd_rehearsal` Aurora database.
**Change type:** first live full-load-and-CDC DMS task to production Aurora. Real data replication plus continuous WAL streaming.
**Blast radius:**
- Staging rehearsal phase: none on production (separate RDS + separate Aurora database)
- Production phase: creates logical replication slot on prod RDS; inserts 6,147 patient rows + 353,512 encounter rows into Aurora `tailrd` database. Backend traffic unaffected (no schema changes, no app deploy).

---

## 1. Purpose

Execute Wave 2 of the Aurora V2 migration - replicate `patients` (6,147 rows post-dedup) and `encounters` (353,512 rows) from production RDS to production Aurora with `full-load-and-cdc`. Rehearse the exact flow on staging first to measure real timings and catch any surprises before touching production resources.

## 2. Prerequisites (all satisfied per pre-Day-8 checkpoint 2026-04-22T22:33Z)

- [x] Day 7 PR #172 merged; zero drift confirmed
- [x] Production RDS `rds.logical_replication=on`, `wal_level=logical`
- [x] Wave 2 task `tailrd-migration-wave2` in `ready` state with `slotName=dms_wave2_slot` on source endpoint
- [x] Rollback Lambda env wired to Wave 2 ARN + verified end-to-end via Phase 7D smoke test
- [x] Source clean: 0 duplicate patient keys, 0 orphan encounters
- [x] Snapshots retained for rollback (pre-consolidation, pre-logical-repl, pre-mcd-wipe)

## 3. Go/No-Go (executed at start of Phase 8-PRE)

All 5 checks PASS at 2026-04-22T22:48Z:

1. No active ECS deployments - COMPLETED, task def 93, 1/1 running
2. Zero CloudWatch alarms in ALARM state
3. Production RDS available, param status in-sync, no pending mods
4. Backend `/health` 200, uptime 20,677s (~5.7h stable on task def 93)
5. Last deploy ~5.7h ago (well beyond 30-min cooldown)

## 4. Rollback triggers

Any of the following triggers the automated rollback Lambda:

- DMS task errors > 100 in 15 min
- CDC lag > 120s for 5 min
- Row count divergence > 0.1% after full-load
- Any Tailrd* CloudWatch alarm fires
- Backend `/health` degrades to non-200 for > 60s continuous
- RDS CPU > 80% sustained for 5 min
- Full checksum mismatch on patients
- 10,000-encounter sample checksum mismatch

## 5. Rollback procedure (automated)

1. Alarm fires -> CloudWatch invokes `tailrd-dms-rollback` Lambda
2. Lambda stops DMS task (Wave 2 ARN `X4L644C5LNEN3PPYNNWDDLTB24`)
3. Lambda drops `dms_wave2_slot` on production RDS
4. Lambda truncates `patients` + `encounters` on Aurora (CASCADE)
5. Lambda publishes SNS alert

Manual rollback fallback: restore prod RDS from `tailrd-production-postgres-day8-rehearsal-2026-04-23` snapshot.

## 6. Success criteria

### Staging rehearsal
- Wave 2 full-load completes without errors
- Row counts match exactly between staging RDS and Aurora rehearsal database
- Full patient checksum matches
- 10,000-row encounter sample checksum matches
- Zero orphan encounters on Aurora rehearsal
- CDC activates within 60s of full-load complete
- 15-minute CDC observation: lag < 30s throughout
- Timings documented for production sizing

### Production execution
- Same criteria as rehearsal
- Production timings within 50% of rehearsal predictions
- Zero backend `/health` degradation (probe v2 samples show it)
- 30-minute post-full-load observation: CDC lag stable, zero alarms
- Shadow validator runs every 5 min: zero divergence after full-load complete

## 7. Execution log

### Phase 8-PRE - 2026-04-22T22:47-22:49Z

Go/No-Go: all 5 checks PASS. Branch `feat/aurora-v2-day8-wave2-execution` created. Change record committed.

### Phase 8-REHEARSE-A - infra built 2026-04-22T22:50-23:08Z

- Snapshot `tailrd-production-postgres-day8-rehearsal-2026-04-23` created (available at 22:53Z, ~3 min)
- Rehearsal RDS `tailrd-staging-wave2-rehearsal` restored from snapshot with param group `tailrd-production-postgres15-logical-repl` -> available at 23:03Z (~12 min). Verified: 6,147 patients + 353,512 encounters, 54 tables.
- Aurora `tailrd_rehearsal` database created + consolidated baseline migration applied -> 54 tables, empty (22:58Z)
- DMS endpoints created + connection-tested: `tailrd-rehearsal-source` (extra attr `slotName=dms_rehearsal_slot`) and `tailrd-rehearsal-target` -> both `successful` at 23:07Z
- Temporary SG rule `sgr-03ac36cae8d5904eb` added (DMS SG -> staging RDS SG port 5432)
- Rehearsal Wave 2 task `tailrd-migration-wave2-rehearsal` (ARN `A4STHXDKPZARPBCCP6F3DW6BUY`) created at 23:08Z - full-load-and-cdc, patients + encounters, TRUNCATE_BEFORE_LOAD, row-level validation

### Phase 8-REHEARSE-B - three failure modes surfaced

**Attempt 1 (T0 23:08:38Z):** task started, reached `running` for a few seconds, then `failed`. Error: `"Last Error Slot does not exist Stop Reason FATAL_ERROR"`. Root cause: when `slotName=dms_rehearsal_slot` is set on the source endpoint, DMS expects the slot to pre-exist and does NOT auto-create it (contradicts common documentation). Fix attempted: pre-create the slot on rehearsal RDS.

**Attempt 2 (T0 23:24:45Z, slot pre-created with `pgoutput` plugin):** task started, reached `running`, failed again. Error: `"Last Error Specified plugin does not exist, or is not supported"`. Root cause: DMS defaults to `test_decoding` for PostgreSQL logical decoding and refuses to use a slot created with `pgoutput`. Fix attempted: drop + recreate slot with `test_decoding`.

**Attempt 3 (T0 23:31:28Z, slot with `test_decoding`):** task started, reached `running`, failed after ~2 min. Error: `"Last Error Stream Component Fatal error. Stop Reason FATAL_ERROR"` - no further diagnostic detail. `describe-events --source-type replication-task` returned empty. CloudWatch log group `dms-tasks-*` was never created (task never wrote logs). Tried modifying source endpoint to remove `slotName` and fell back to DMS-managed slot - but teardown happened before re-attempt.

**Additional diagnostics collected:**
- `tailrd_admin` role on rehearsal RDS: NOT rolsuper, NOT rolreplication, but IS a member of `rds_superuser` (which grants `rds_replication` transitively). `pg_has_role('tailrd_admin', 'rds_replication', 'MEMBER') = true`. Role permissions are NOT the issue.
- Connection tests from DMS replication instance to both source and target endpoints: `successful`.
- No DMS replication-instance-level events during the failure windows.

### Teardown (2026-04-22T23:43-23:45Z)

- Rehearsal DMS task deleted
- Rehearsal source + target endpoints deleted
- SG ingress rule revoked
- Rehearsal RDS instance deletion initiated (`--skip-final-snapshot`)
- `tailrd_rehearsal` Aurora database dropped (only `tailrd` remains)
- All temp scripts removed from S3 and local

**Retained:** `tailrd-production-postgres-day8-rehearsal-2026-04-23` snapshot - usable as rehearsal source and/or prod rollback asset.

### Verdict - Day 8 HALTED

Production Wave 2 task `tailrd-migration-wave2` has identical source endpoint extra-attr config (`slotName=dms_wave2_slot`). Starting it will fail the SAME way as rehearsal. **Do NOT start production Wave 2 until the "Stream Component Fatal error" root cause is understood.**

## 8. Root-cause hypotheses for the Stream Component Fatal error (for next-session debugging)

1. **DMS task-level CloudWatch logging config.** Task settings say `EnableLogging: true` but `dms-tasks-*` log group never materialized. DMS may need `CloudWatchLogGroup` and `CloudWatchLogStream` explicitly set in task settings, or a separate configuration at the replication-instance level. Without task logs, we're debugging blind.
2. **Validation config interaction.** `ValidationSettings.EnableValidation: true` may fail if the table's primary key/unique identifier structure doesn't match DMS's validation requirements. Try disabling validation first to isolate.
3. **Replica identity on tables.** Patients + encounters have PRIMARY KEY so `REPLICA IDENTITY DEFAULT` should suffice, but DMS CDC sometimes requires `FULL`. Worth verifying and testing.
4. **Version mismatch.** DMS 3.6.1 + RDS PG 15.14. Some DMS 3.x releases had bugs with PG 15 logical decoding. Upgrading DMS replication instance to a newer engine version may resolve.
5. **Reload-target semantics.** `start-replication-task --start-replication-task-type reload-target` on a `failed` task may not reset state properly. Next attempt should delete the task and recreate fresh.

### Next-session action plan

1. Restore rehearsal RDS from snapshot `tailrd-production-postgres-day8-rehearsal-2026-04-23`
2. **Add DMS task logging configuration explicitly** at task creation time (CloudWatchLogGroup/Stream)
3. **Disable ValidationSettings** for the first rehearsal attempt to narrow down the failure
4. Try without `slotName` extra-attr first (mimic Phase 7B chaos test pattern which worked)
5. Once working, re-add `slotName` with proper pre-creation ordering
6. If still failing: upgrade DMS replication-instance engine version or switch to `pglogical` plugin
7. Only then start production Wave 2

## 9. What did NOT happen on production

- No Wave 1 re-run
- No Wave 2 task started
- No EventBridge target wired (shadow validator still disabled)
- No production data changes - prod RDS + prod Aurora in identical state to pre-Day-8 checkpoint
- No probe v2 launched against production
- Rollback Lambda config unchanged from Day 7

## 8. Post-change actions

- Update `docs/DMS_MIGRATION_LOG.md` with Day 8 entry (rehearsal + production timings)
- Create `docs/WAVE2_REHEARSAL_2026_04_23.md` with full rehearsal observations
- PR + merge
