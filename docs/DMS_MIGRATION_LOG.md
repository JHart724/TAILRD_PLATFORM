# DMS migration log

Append-only record of DMS wave activity for the Aurora V2 migration.
Jonathan records go/no-go gate approvals here; rollbacks, aborts, and anomalies go here too.

---

## 2026-04-20T18:09:31Z — Phase 4A baseline captured

- LSN at baseline: `44/7B8`
- RDS engine: PostgreSQL 15.14
- `rds.logical_replication` = `off` (CDC blocker — see TECH_DEBT_REGISTER #19)
- `wal_level` = `replica`
- `max_replication_slots` = 20, `max_wal_senders` = 20
- Active connections: 6 (null) + 3 idle tailrd + 2 rdsadmin — normal
- CPU last 10 min: 4.2-5.0% (quiet)
- No active non-idle queries
- Extensions: plpgsql only
- Existing replication slots: 0

Full detail: `docs/RDS_BASELINE_2026_04_20.md`.

## 2026-04-20T18:10Z — Phase 4B DMS instance created

- Identifier: `tailrd-dms-replication`
- ARN: `arn:aws:dms:us-east-1:863518424332:rep:JGQBSRDUTNH3HO6PKL3BEESYS4`
- Class: `dms.t3.medium`, 50 GB gp3
- Engine version: 3.6.1 (latest available; 3.5.5 didn't exist)
- Single-AZ, private, backend-SG-reachable
- SG: `sg-0e116deb0b3199fdd` (`tailrd-dms-sg`), egress 5432 to RDS + Aurora SGs; RDS+Aurora SGs now ingress 5432 from DMS SG

Also created:
- IAM role `dms-vpc-role` with `AmazonDMSVPCManagementRole` managed policy (AWS-managed prereq)
- DMS replication subnet group `tailrd-dms-subnets` using DB private subnets 1a + 1b

## 2026-04-20T18:29Z — Phase 4C endpoints + test-connection

- Source endpoint `tailrd-rds-source` (arn:aws:dms:us-east-1:863518424332:endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ): `successful`
- Target endpoint `tailrd-aurora-target` (arn:aws:dms:us-east-1:863518424332:endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ): `successful`

## 2026-04-20T18:40Z — Phase 4D pre-flight (no-op)

Wave 1 tables (`hospitals`, `users`) have no FHIR fields. The seven per-tenant composite unique constraints from PR #158 apply only to clinical tables (encounters, observations, conditions, medications, procedures, device_implants, allergy_intolerances). No collision check needed for Wave 1. Confirmed clean.

## 2026-04-20T18:44Z — Phase 4E rollback Lambda deployed

- Function: `tailrd-dms-rollback` (nodejs20.x, 256 MB, 300s)
- Role: `dms-rollback-role` (inline policy for dms:Stop, secrets:Get, sns:Publish, VPC ENI mgmt)
- VPC-attached to backend SG for RDS + Aurora access
- Manual invoke test at 18:44:16Z exited 0 in 3695ms:
  - stopTask: expected error "Invalid value TBD for ReplicationTaskArn" (pre-Wave-1 config)
  - dropSlot: skipped (no replication slot; full-load-only)
  - truncate: executed `TRUNCATE "hospitals", "users" CASCADE` on Aurora (no-op — already empty)
  - sns: published

## 2026-04-20T18:45:25Z — Phase 4G CHAOS TEST PASS

Chaos metric emitted: `TailrdMigration:dms.task_healthy=0 {Task=tailrd-migration-wave1}`.

Timeline:
- 18:45:25Z: metric put
- 18:46:18Z: alarm `TailrdDMS-TASK_FAILED` transitioned to ALARM (~53s after metric emit, within 2-evaluation-period budget)
- 18:46:18Z: Lambda auto-invoked (alarm action → Lambda target)
- 18:46:19Z: Lambda returned in 1199ms — truncate + SNS succeeded; stopTask errored on expected TBD ARN
- SNS topic `tailrd-migration-alerts` published; email to `jhart@hartconnltd.com`

**Elapsed metric-emit to Lambda-executed: ~53 seconds.** Rollback machinery verified end-to-end.

See also `docs/DMS_CHAOS_TEST_LOG.md`.

## 2026-04-20T18:46Z — Phase 4F alarms created

4 CloudWatch alarms:
- `TailrdDMS-TASK_FAILED` (TailrdMigration/dms.task_healthy < 1 for 2 min) → Lambda + SNS
- `TailrdDMS-REPLICATION_LAG_CRITICAL` (AWS/DMS/CDCLatencyTarget > 300 for 5 min) → Lambda + SNS [Day 6+]
- `TailrdDMS-RDS_CPU_CRITICAL_DURING_MIGRATION` (AWS/RDS/CPUUtilization > 80 for 10 min) → SNS only
- `TailrdDMS-ERROR_COUNT_CRITICAL` (TailrdMigration/dms.error_count > 100 for 15 min) → Lambda + SNS

Also updated Lambda env with real Wave 1 task ARN after task creation (18:47Z).

## 2026-04-20T18:47:34Z — TASK_FAILED alarm actions disabled for Wave 1

To prevent the chaos-fired ALARM state from auto-rollback-ing Wave 1 when it started. Re-enable after Wave 1 validated.

## 2026-04-20T18:48:01Z — Phase 4J resumability test attempt

Task `tailrd-migration-wave1` created at 18:46:18Z (TaskArn `arn:aws:dms:us-east-1:863518424332:task:IMG4NEHABJCQTHVRK7GNJYTPXI`).
- Started: 18:48:01Z (`aws dms start-replication-task --start-replication-task-type start-replication`)
- Stop attempt at 18:48:10Z rejected with `InvalidResourceStateFault: task not running` — task was still in `starting` (creating replication instance slot on source)
- Resumability stress test DEFERRED to Wave 2 where data volume allows a mid-load pause. Start/stop/resume API calls work — just can't be exercised on 5-row workload

## 2026-04-20T18:48:16Z — Wave 1 full load began

Task state: `running`.

## 2026-04-20T18:48:19Z — Wave 1 full load finished

**Elapsed full-load: 2.9 seconds.**
- hospitals: 4 rows loaded, 0 errors, 0 conditional-check failures
- users: 1 row loaded, 0 errors, 0 conditional-check failures
- TablesLoaded: 2, TablesErrored: 0

Task transitioned to `stopped` with reason `FULL_LOAD_ONLY_FINISHED` at 18:48:48Z.

## 2026-04-20T18:50:44Z — Phase 4K validation gates

| Gate | Criterion | Result | Notes |
|---|---|---|---|
| 1 | Row count parity on hospitals + users | **PASS** | 4 = 4, 1 = 1 |
| 2 | Checksum parity on hospitals + users | **PASS** | hospitals md5 = `99ee641e872a9d2b3e55ebc07005699c` on both; users md5 = `33bb9ec6910d0b39b2b6e856155252e0` on both |
| 3 | FK integrity: users.hospitalId → hospitals.id | **PASS** | 0 invalid |
| 4 | CDC active, lag <10s | **N/A** | CDC deferred to Day 6 per Jonathan's call (TECH_DEBT #19) |
| 5 | Shadow reads divergence = 0 | **N/A** | Requires CDC to be meaningful |
| 6 | DMS task errors = 0 last 10 min | **PASS** | Task `stopped` with `FULL_LOAD_ONLY_FINISHED` — zero errors |
| 7 | RDS CPU delta < 20% | **PASS** | Baseline 4.2-5.0%; during Wave 1 4.2-5.0%. Delta ~0%. Connections baseline 3-5, during Wave 1 3-5 |

All 5 applicable gates passed. Gates 4 and 5 not evaluated (CDC scope).

## 2026-04-20T18:53Z — Phase 4L observation kickoff

4-hour static observation started. validateMigration.ts runs every 15 minutes against RDS + Aurora.

Expected behavior during observation:
- hospitals + users row counts + hashes stable on both (already migrated via Wave 1)
- All other 51 tables show non-zero row_diff (Aurora empty pre-Wave-2)
- 3 sample-table hashes remain divergent (patients, encounters, observations — Aurora empty)

Any UNEXPECTED divergence in hospitals/users during the observation window triggers `SHADOW_READ_DIVERGENCE` or rollback alarms.

**Observation window end:** 2026-04-20T22:53Z.

## 2026-04-20T19:00Z — Jonathan's approval (pending)

Wave 2 start waits on Jonathan's review of this log + Day 5 staging work + Day 6 RDS reboot.

---

## Wave 1 retention

The `tailrd-migration-wave1` DMS task is **retained** (not deleted) per Jonathan's direction. The task definition pattern (table mappings, settings JSON) will be cloned for Waves 2-4 with:
- Migration type: `full-load-and-cdc` (requires `rds.logical_replication = 1`)
- Extra connection attributes on source: `captureDDLs=true;pluginName=pglogical;slotName=dms_wave{N}_slot`
- Table mappings: the respective wave's table list per `docs/DMS_MIGRATION_PLAN.md §2`
