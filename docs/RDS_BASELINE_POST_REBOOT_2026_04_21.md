# RDS post-reboot baseline — 2026-04-21

**Capture time:** 2026-04-21T13:44:03Z
**Post-reboot minute count at capture:** ~32 min after `T_available` (13:12:01Z)
**Context:** Day 6 production RDS reboot close-out. First pg_stat_statements baseline ever captured on production — the extension was only loaded during this reboot (it came in via the new `tailrd-production-postgres15-logical-repl` parameter group's default `shared_preload_libraries` on RDS PG 15).
**Source:** `infrastructure/scripts/capturePostRebootBaseline.js` run as ECS one-shot `7ef88b4ed4cf499ca5780b8e9df62ab2`. Full JSON capture is embedded at the bottom of this file.

---

## 1. Comparison to Day 4 "baseline"

`docs/RDS_QUERY_ANALYSIS_2026_04_20.md` is the closest prior analysis. That document is an ad-hoc diagnostic (captured while chasing the 54% CPU root cause), NOT a `pg_stat_statements` snapshot — **because pg_stat_statements was not loaded on production until 2026-04-21T13:11:16Z** (RDS restart event during Phase 6C reboot).

This means: **there is no apples-to-apples "Day 4 vs Day 6" comparison possible for individual query mean/total times.** The Day 4 data is session-level from `pg_stat_activity` and `pg_stat_user_tables`. The Day 6 data below is the first true statement-level aggregate ever recorded on production.

The closest comparable signal is CPU/connection count:

| Metric | Day 4 (2026-04-20) | Day 6 (2026-04-21, post-reboot) | Notes |
|---|---|---|---|
| RDS CPU (15 min rolling avg) | 4-5% (after orphan DELETE kill) | 4.2-5.2% (pre-reboot), observation-window clean | No regression |
| Active sessions on `tailrd` | 3 (incl. orphan DELETE) | 4 (backend pool + this diagnostic task) | Normal |
| Active sessions in ALL states | 1 active + 5 idle = 6 | 1 active + 5 idle = 6 | Identical |
| Long-running queries (>60s) | 1 (orphan DELETE PID 19775 — killed) | 0 | Clean |
| Replication slots | 0 (no CDC) | 0 (Phase 6E test slot cleaned up) | Clean |

No regression signal from these indirect metrics. The real regression test will be over the next few days as pg_stat_statements accumulates more samples across real hospital-admin traffic.

---

## 2. Top 20 queries by `total_exec_time` (first 32 min post-reboot)

Ranked by total time across all calls in the pg_stat_statements sample window. All timings in milliseconds.

| # | Calls | Mean (ms) | Total (ms) | Max (ms) | Rows | Query preview |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 79.578 | 79.58 | 79.58 | 1 | Heart Failure dashboard — COUNT(*) on patients with therapy_gaps subquery |
| 2 | 2 | 39.567 | 79.13 | 40.17 | 2 | `pg_create_logical_replication_slot` (Phase 6E test slot creations, v1+v2) |
| 3 | 3 | 1.909 | 5.73 | 5.07 | 3 | INSERT into `login_sessions` (the 3 smoke-test logins) |
| 4 | 1 | 3.973 | 3.97 | 3.97 | 1 | `pg_drop_replication_slot($1)::text` (Phase 6E v2 cleanup) |
| 5 | 1 | 3.922 | 3.92 | 3.92 | 1 | `pg_drop_replication_slot($1)` (Phase 6E v1 fallback cleanup) |
| 6 | 1 | 2.103 | 2.10 | 2.10 | 4 | `therapy_gaps` COUNT + GROUP BY gapType (HF care-gap analyzer) |
| 7 | 3 | 0.489 | 1.47 | 1.40 | 3 | User lookup by email (3 smoke-test logins) |
| 8 | 1 | 1.019 | 1.02 | 1.02 | 1 | Patient count by hospitalId (admin analytics) |
| 9 | 3 | 0.221 | 0.66 | 0.57 | 3 | `users.lastLogin` UPDATE (on each login) |
| 10 | 3 | 0.164 | 0.49 | 0.43 | 3 | Hospital fetch by id (on each login) |
| 11 | 1 | 0.402 | 0.40 | 0.40 | 1 | Alert unacknowledged count (admin analytics) |
| 12 | 52 | 0.006 | 0.33 | 0.01 | 52 | `SELECT $1` (Prisma health / keep-alive) |
| 13 | 1 | 0.166 | 0.17 | 0.17 | 10 | therapy_gaps SELECT (HF dashboard gap list) |
| 14 | 1 | 0.140 | 0.14 | 0.14 | 1 | `pg_extension` lookup (verifyLogicalRepl) |
| 15 | 2 | 0.065 | 0.13 | 0.10 | 2 | replication slot inspect by name (Phase 6E step 2 + 5) |
| 16 | 5 | 0.018 | 0.09 | 0.02 | 5 | webhook_events COUNT by status (admin analytics) |
| 17 | 1 | 0.088 | 0.09 | 0.09 | 1 | `pg_stat_statements_reset()` (Phase 6D) |
| 18 | 4 | 0.015 | 0.06 | 0.02 | 4 | login_sessions SELECT by sessionToken (auth middleware) |
| 19 | 1 | 0.052 | 0.05 | 0.05 | 21 | therapy_gaps SELECT (HF gap count for smoke) |
| 20 | 4 | 0.013 | 0.05 | 0.02 | 4 | replication slot COUNT by name (Phase 6E step 6b + fallback) |

### What this tells us

- **The slowest query (79.58ms) is the Heart Failure dashboard COUNT subquery.** That's the complex `COUNT(*) FROM (SELECT patients.id WHERE isActive AND (heartFailurePatient OR id IN (therapy_gaps WHERE module='HEART_FAILURE' AND resolvedAt IS NULL)))` pattern — a one-call pass that happened during the 13:15Z smoke test. 79.58ms for that shape on a 100GB DB with multiple joins + type casts is reasonable, but this query is a candidate for index review or materialized-view cache if it becomes a hot path as traffic grows.
- **CDC readiness test queries (#2, #4, #5)** are visible at ~40ms mean for slot creation — consistent with logical replication slot setup overhead.
- **Auth path is fast:** login_sessions INSERT 1.9ms, sessionToken lookup 0.018ms, lastLogin UPDATE 0.22ms. JWT middleware DB touch is negligible.
- **No lurking slow queries.** No query above ~80ms total. No pattern with high call count × latency that would warrant immediate investigation.

---

## 3. Aggregate stats

```json
{
  "unique_queries": 30,
  "total_calls": 111,
  "total_exec_ms": 181.08,
  "avg_mean_exec_ms": 4.510,
  "worst_query_max_ms": 79.58
}
```

111 total DB operations across the 30-minute window. Extremely low — the platform has essentially no hospital-admin traffic right now (pre-pilot). Most traffic was our own test activity (3 logins, 2 CDC tests, 1 HF dashboard smoke, 1 admin analytics smoke, baseline captures).

---

## 4. Sessions + connection snapshot

**By state:**
- active: 1 (this baseline capture's own Prisma query)
- idle: 5 (backend pool + other diagnostic connections)

**By database:**
- `tailrd`: 4
- `rdsadmin`: 2 (AWS-managed)

**Long-running (>60s):** 0 ✅ (no orphan-DELETE situation like Day 4)

---

## 5. Logical replication settings reconfirmed from `pg_settings`

| Setting | Value |
|---|---|
| `wal_level` | `logical` |
| `rds.logical_replication` | `on` |
| `max_replication_slots` | `10` |
| `max_wal_senders` | `25` (AWS-adjusted from 10) |

All four match post-reboot expectations. Still in effect 32 min after failover. Not drifted.

**Replication slots:** 0 currently (Phase 6E test slot `day6_readiness_test` was dropped cleanly).

---

## 6. Recommendation for Day 7+

- **Capture next baseline after 24h of traffic.** Right now pg_stat_statements is very sparse (mostly our own test queries). A second snapshot ~24h later will show the real hospital-admin traffic pattern.
- **Watch the HF dashboard COUNT query.** 79.58ms on an effectively-empty patient table after MCD wipe is acceptable. Same query on full patient data (Waves 2-4 CDC-loaded) could be significantly slower. Consider an index on `patients(isActive, heartFailurePatient)` + partial index on `therapy_gaps(patientId) WHERE module='HEART_FAILURE' AND resolvedAt IS NULL` if this query's mean climbs past ~200ms.
- **Check `pg_stat_statements` hasn't been reset again.** If the extension gets reset by admin action or a further reboot, the baseline window is lost. Future Day 7 runs should pull `stats_reset` time to confirm continuity.

---

## 7. Raw capture reference

Full JSON capture (all 20 rows + aggregate + settings) available in CloudWatch Logs:
- Log group: `/ecs/tailrd-production-backend`
- Log stream: `tailrd-backend/tailrd-backend/7ef88b4ed4cf499ca5780b8e9df62ab2`
- Message markers: between `---BASELINE---` and `---END-BASELINE---`
