# Change Record: Day 11 RDS Decommission

**Date:** 2026-05-02 (Day 11 of Aurora migration arc, 24h+ post-cutover)
**Operator:** Jonathan Hart
**Related:** `docs/DAY_11_THURSDAY_RUNBOOK.md`, `docs/DAY_11_PLAN.md`, `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md`

---

## 1. Outcome summary

`tailrd-production-postgres` (RDS db.t3.medium PostgreSQL 15.14, 100GB encrypted) deleted at **2026-05-02T20:18:33Z** after a 24h+ post-cutover soak window. Production has been Aurora-served continuously since the Day 10 cutover at `2026-04-29T00:51:55Z`; RDS sat at sustained-zero connections for 19+ hours prior to deletion. Final HIPAA-tagged snapshot retained for 6 years per HIPAA Security Rule audit requirements.

All migration scaffolding (Wave 1 + Wave 2 DMS tasks, source + target endpoints, replication instance, and the Wave 2 logical replication slot) was cleaned ahead of the RDS deletion. Production health continuous throughout: `/health` returned `200 healthy` for the full deletion window with no errors in CloudWatch.

The migration arc that began on Day 4 (April 20, 2026) Wave 1 full-load is now concluded: production is Aurora-only.

## 2. Pre-decom state

| Resource | Identifier | Pre-decom state |
|---|---|---|
| RDS instance | `tailrd-production-postgres` | db.t3.medium, PG 15.14, 100GB encrypted, status=available, deletion-protected |
| Aurora cluster (live production) | `tailrd-production-aurora` | ServerlessV2 0.5-4 ACU, PG 15.14, encrypted with prod KMS |
| Final HIPAA snapshot | `tailrd-production-postgres-final-pre-decom-20260429` | available, encrypted (KMS `109cd89c-bb71-4258-a205-369f6816c14f`), 100GB, created 2026-04-29T01:58:45Z, RetainUntil=2032-04-30 |
| DMS Wave 2 task (CDC, ongoing through cutover) | `task:YFGGBH5LXRHDBHYD76DVX5MQRA` | stopped post-cutover |
| DMS Wave 1 task (full-load bootstrap, dormant 12 days) | `task:IMG4NEHABJCQTHVRK7GNJYTPXI` | stopped, FULL_LOAD_ONLY_FINISHED |
| DMS source endpoint | `endpoint:XG3PQTZG5BB4RNX3RWT3G3KICQ` (`tailrd-rds-source`) | active |
| DMS target endpoint | `endpoint:CLT4CXLHTJFM3B5IEVDWYKNUFQ` (`tailrd-aurora-target`) | active |
| DMS replication instance | `rep:JGQBSRDUTNH3HO6PKL3BEESYS4` (`tailrd-dms-replication`) | active, dms.t3.medium |
| RDS logical replication slot | `yfggbh5lxrhdbhyd_00016413_2e76088d_c85c_4516_a807_ef3e6876b3ba` | logical, plugin=test_decoding, active=false |

Production task definition: `tailrd-backend:140` (Aurora-served, `READ_ONLY=false`). Auto-deployed from PR #216 merge during Phase 95.1 sequencing.

## 3. Validator improvement (PR #216)

The Day 11 decommission validator's `aurora_active_traffic` check originally used a 24-hour CloudWatch DatabaseConnections **Average** with threshold `>= 1`. In low-traffic pilot environments where Aurora ServerlessV2 ramps down to baseline ACU and idle connection-pool members briefly drop, the 24h Average dipped to `0.42` despite production actively serving from Aurora. The validator false-negatived and blocked the gate.

**Diagnosis:** Average over 24h is the wrong statistic. A point-in-time pg_stat_activity probe found 3 active connections from the production ECS task security group (10.0.10.139) at the moment the validator reported "no Aurora traffic."

**Fix (PR #216, merged 2026-05-02T18:23:54Z):** Replaced with two-part direct evidence (both must pass):

- **Part 1 — Point-in-time:** Connect to Aurora via DATABASE_URL secret. Query `pg_stat_activity` for client backends with `state IS NOT NULL AND pid != pg_backend_pid()`. Threshold: `>= 1`.
- **Part 2 — 24h soak:** CloudWatch DatabaseConnections **Maximum** over the last 24h. Threshold: `>= 1`. Maximum captures presence even during ACU scale-down windows that would have masked an Average-based check.

**Verification:** Final pre-decom validator run at 18:25:34Z (Fargate task `f6dc2c7fad6d4c9cb5275551f1c73ca0`) produced `ready_for_decommission: true`, all 7 checks PASS:
- pointInTime.productionConnections: 3 (matched the prior probe)
- soakWindow.maxConnections24h: 3
- All other checks unchanged

## 4. Execution sequence

| Step | Action | Timestamp (UTC) |
|---|---|---|
| 95.1c-finish | PR #216 merged into main | 2026-05-02T18:23:54Z |
| 95.1c-finish | Local main fast-forwarded | 2026-05-02T18:24:00Z |
| 95.1d | Phase2D-Decommission IAM attached | 2026-05-02T18:24:11Z |
| 95.1d | Validator script uploaded to S3 | 2026-05-02T18:24:21Z |
| 95.1d | Validator Fargate task launched (`f6dc2c7fad6d4c9cb5275551f1c73ca0`) | 2026-05-02T18:24:32Z |
| 95.1d | Validator returned 7/7 PASS | 2026-05-02T18:25:34Z |
| 95.1d | IAM detached (clean state between steps) | 2026-05-02T18:26:27Z |
| 95.1e | Investigated `errorCount24h=1` — false-positive on `503ms` substring in audit timestamp; CASE A benign | 2026-05-02T~18:30Z |
| 95.2 | Phase2D-Decommission IAM re-attached | 2026-05-02T18:33:52Z |
| 95.2 | RDS slot enumerated (1 logical slot, active=false) | 2026-05-02T18:38:39Z |
| 95.2 | Replication slot dropped | **2026-05-02T18:40:15Z** |
| 95.3a | Wave 2 task delete-replication-task initiated | 2026-05-02T18:46:18Z |
| 95.3a | Wave 2 task deletion completed | **2026-05-02T18:47:15Z** |
| 95.3c-attempt-1 | Source endpoint delete attempted, returned `InvalidResourceStateFault` (Wave 1 task still referenced endpoint) | 2026-05-02T19:08:23Z |
| 95.3-investigate | Wave 1 task investigation: full-load bootstrap, completed 2026-04-20, 2 tables, 0 errors, dormant 12 days. CASE A authorized | 2026-05-02T19:25Z |
| 95.3-w1 | Wave 1 task delete-replication-task initiated | 2026-05-02T19:26:09Z |
| 95.3-w1 | Wave 1 task deletion completed | **2026-05-02T19:26:29Z** |
| 95.3c | Source endpoint delete-endpoint initiated | 2026-05-02T19:26:53Z |
| 95.3c | Source endpoint absent (eventual consistency, ~10 min) | **2026-05-02T19:36:35Z** |
| 95.3d | Target endpoint delete-endpoint initiated | 2026-05-02T19:36:49Z |
| 95.3d | Target endpoint absent (~134s) | **2026-05-02T19:39:03Z** |
| 95.3e | Replication instance delete-replication-instance initiated | 2026-05-02T19:39:14Z |
| 95.3e | Replication instance deleted (~7 min wait) | **2026-05-02T19:46:05Z** |
| 95.4 | RDS modify-db-instance --no-deletion-protection | 2026-05-02T19:46:27Z |
| 95.4 | Deletion protection confirmed false, status=available | **2026-05-02T19:46:32Z** |
| 95.5 | Pre-gate verification (snapshot, /health, ECS) | 2026-05-02T19:46:51Z |
| 95.5 | Authorization block surfaced; operator typed "yes proceed with RDS deletion" | 2026-05-02T~19:57Z |
| 95.6 | RDS delete-db-instance --skip-final-snapshot initiated | **2026-05-02T19:57:51Z** |
| 95.6 | RDS event "DB instance shutdown" | 2026-05-02T19:58:54Z |
| 95.7 | RDS event "DB instance deleted" | **2026-05-02T20:18:33Z** |
| 95.7-verify | DBInstanceNotFound confirmed via independent describe | 2026-05-02T22:22Z |
| 95.7-verify | Snapshot still AVAILABLE + encrypted; production /health 200 healthy; CloudWatch errors empty | 2026-05-02T22:23Z |
| 95.8 | Phase2D-Decommission IAM detached | **2026-05-02T22:24:22Z** |

**Total RDS deletion duration:** 19:57:51Z → 20:18:33Z = **20 min 42 sec**.

**Workstation-side network artifact:** During the RDS deletion poll loop, a workstation-side network blip caused curl + AWS CLI commands to time out for ~14 minutes (similar pattern to `docs/audit/SOAK_MONITOR_DIAGNOSTIC_2026_04_29.md`). The poll loop exited prematurely with a TIMEOUT message because cumulative wall time exceeded `MAX_POLL_SECONDS=1200`, even though `ELAPSED` showed only 583 seconds at the last successful probe. Independent verification via fresh AWS CLI calls and the RDS event log captured the precise deletion completion timestamp. **No production impact.** Production /health was healthy across the full deletion window from independent server-side telemetry (ALB target health, ECS service state, CloudWatch logs).

## 5. Post-deletion state

| Resource | State |
|---|---|
| RDS `tailrd-production-postgres` | **DELETED** (`DBInstanceNotFound`) |
| Aurora cluster `tailrd-production-aurora` | live, serving production |
| Final HIPAA snapshot | AVAILABLE, encrypted (KMS `109cd89c...`), 100GB, retained until 2032-04-30 |
| DMS replication instance | DELETED |
| DMS source endpoint | DELETED |
| DMS target endpoint | DELETED |
| DMS Wave 1 task | DELETED |
| DMS Wave 2 task | DELETED |
| RDS logical replication slot | DROPPED |
| Production `/health` | 200 healthy, continuous through deletion window |
| ECS service | `tailrd-backend:140`, 1/1 running, rolloutState=COMPLETED |
| ALB target | healthy |
| CloudWatch errors (deletion window) | none |
| Phase2D-Decommission IAM | detached (clean baseline) |

## 6. Cost impact

- db.t3.medium production instance: **~$70/mo savings** (no longer billing).
- 100GB encrypted snapshot retained 6 years: ~$10/mo ongoing storage cost.
- **Net savings: ~$60/mo.**

## 7. Rollback procedure (theoretical)

If catastrophic discovery within HIPAA retention window forces restore:

1. `aws rds restore-db-instance-from-db-snapshot --db-instance-identifier <new-id> --db-snapshot-identifier tailrd-production-postgres-final-pre-decom-20260429`
2. Wait ~30-60 min for the new instance to come up.
3. Manually rotate any application secrets / configs that point at the original RDS endpoint (the new restore endpoint will differ).
4. Aurora and a restored RDS cannot run as parallel writeable sources without re-establishing CDC.

The snapshot is independent of the source instance lifecycle (`SourceDBInstanceArn: null` post-deletion is the normal post-source-deleted state). The snapshot's `KmsKeyId` is intact.

## 8. Operational learnings (for runbook hardening)

1. **RDS master password secret format.** `tailrd-production/rds/master-password` is a JSON object `{dbname, host, password, port, username, engine}`, not a plain-string password. The runbook's fallback Bash chain in Step 3.1 assumes plain string, which silently constructs a malformed connection URL and fails with `password authentication failed`. Runbook must parse JSON or document both formats explicitly.

2. **Wave 1 task missing from runbook scope.** The Day 11 runbook listed only the Wave 2 DMS task ARN. Wave 1 (`task:IMG4NEHABJCQTHVRK7GNJYTPXI`) was the Day 4 (April 20) full-load bootstrap that copied 2 tables (`hospitals`, `users`) in 2.9 seconds and stopped normally. It sat dormant for 12 days but still held references to the source/target endpoints, blocking endpoint deletion via `InvalidResourceStateFault`. Future decommission runbooks must include "enumerate ALL DMS tasks pointing at source RDS, not just the named one in the runbook."

3. **DMS endpoint deletion is async with eventual consistency.** Endpoint deletion takes 60-150 seconds typically, sometimes longer. The original 25-second poll budget (5 probes × 5s sleep) was wrong. Use 12+ probes × 10s sleep (~120s+ budget) for endpoint deletion.

4. **DMS replication instance deletion takes ~5-10 min.** Use `aws dms wait replication-instance-deleted` (which the runbook does correctly).

5. **Validator filter-pattern false-positive.** The validator's `error_rate_within_baseline` check uses CloudWatch filter pattern `?ERROR ?5xx ?500 ?502 ?503 ?504`. Audit-event log lines with timestamps ending in `.500ms`, `.502ms`, `.503ms`, or `.504ms` match as 5xx error tokens. Threshold floor of 100/24h absorbs the noise at low traffic, but the filter pattern should ignore numeric tokens inside quoted timestamps. Track for runbook improvement.

6. **Workstation-network blips are reproducible.** Same pattern documented in `docs/audit/SOAK_MONITOR_DIAGNOSTIC_2026_04_29.md` recurred during the deletion poll loop. Mitigation: independent verification via AWS describe APIs (which use a different routing path than the application's HTTP /health endpoint) and authoritative event-log timestamps when local poll loops fail.

## 9. Cross-references

- Day 11 runbook: `docs/DAY_11_THURSDAY_RUNBOOK.md`
- Day 11 plan: `docs/DAY_11_PLAN.md`
- Day 10 cutover record: `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md`
- Validator fix PR: [#216](https://github.com/JHart724/TAILRD_PLATFORM/pull/216)
- Tier S remediation arc: `docs/CHANGE_RECORD_2026_04_29_audit_015_remediation.md`
- Soak monitor diagnostic (workstation-network artifact pattern): `docs/audit/SOAK_MONITOR_DIAGNOSTIC_2026_04_29.md`

## 10. Open follow-ups (post-Phase-95)

- AUDIT-011 batch 2 (tenant isolation): pending, Tier B/post-decom work
- AUDIT-022 (243 legacy JSON PHI rows): pending, JSON-aware backfill script needed
- Runbook hardening based on Section 8 learnings
- Validator filter-pattern fix (low-priority)
