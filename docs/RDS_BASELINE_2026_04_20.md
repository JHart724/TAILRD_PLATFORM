# RDS baseline, 2026-04-20 18:09 UTC

**Captured via:** ECS one-shot task (`tailrd-pgdump:2`, `postgres:15-alpine`).
**Method:** `pg_stat_activity` snapshot + `pg_settings` + `pg_stat_user_tables` + `pg_replication_slots`.
**Note on pg_stat_statements:** not loaded (shared_preload_libraries = `rdsutils,pgaudit`). Adding it requires a static parameter group change + reboot, deferred per Jonathan's Palantir-grade decision (no staging environment yet to rehearse the reboot). Using `pg_stat_activity` snapshots instead for this baseline.

---

## Current LSN (critical for CDC replay safety)

`44/7B8` at 2026-04-20T18:09:31Z

This is the write-ahead log sequence number at baseline start. When CDC is eventually enabled on Day 6, DMS will begin streaming changes from at-or-after this LSN. Record it in `docs/DMS_MIGRATION_LOG.md` under the Wave 1 entry.

## Database version

```
PostgreSQL 15.14 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 7.3.1 20180712 (Red Hat 7.3.1-17), 64-bit
```

## Logical replication settings — CDC BLOCKER

| Parameter | Current | Required for CDC | Status |
|---|---|---|---|
| `rds.logical_replication` | `off` | `1` | **BLOCKER — not ready for CDC** |
| `wal_level` | `replica` | `logical` (side effect of above) | blocked |
| `max_replication_slots` | `20` | `>= 5` | OK |
| `max_wal_senders` | `20` | `>= 5` | OK |
| `shared_preload_libraries` | `rdsutils, pgaudit` | (pg_stat_statements optional) | OK (no pglogical needed — AWS DMS uses native logical decoding) |

**Decision (Jonathan, 2026-04-20):** Do not reboot RDS during Day 4. Wave 1 runs in full-load-only mode. The reboot procedure gets rehearsed on staging first (Day 5) before production logical replication is enabled (Day 6 pre-Wave-2). Tracked as TECH_DEBT_REGISTER #19.

## Extensions installed

`plpgsql` only. Neither `pg_stat_statements` nor `pglogical` are loaded. For DMS full-load-only this is fine; for CDC we'll need native logical decoding post-reboot (DMS uses the built-in `pgoutput` plugin by default, no pglogical install required).

## Connection stats at baseline

| Database | State | Count |
|---|---|---:|
| `(null)` | — | 6 (RDS-internal workers) |
| `tailrd` | idle | 3 |
| `tailrd` | active | 1 (the pg_stat_activity probe itself) |
| `rdsadmin` | idle | 2 |

Live app traffic produces very few concurrent connections. Good sign: DMS will add 1-2 during full-load, <5% delta.

## Top active queries by duration

```
pid | dur | state | q
(0 rows)
```

Zero long-running queries at baseline. The orphan DELETE that produced 54% CPU on Day 2 is gone. Migration runs against a quiet RDS — ideal.

## Existing replication slots

```
slot_name | plugin | slot_type | active
(0 rows)
```

No replication slots. DMS will create one on Day 6 (`dms_wave2_slot` or similar).

## Table inventory (biggest first, top 20)

| Table | Rows | Size |
|---|---:|---|
| procedures | 971,113 | 376 MB |
| encounters | 353,526 | 195 MB |
| conditions | 225,439 | 259 MB |
| medications | 220,552 | 260 MB |
| device_implants | 36,793 | 14 MB |
| patients | 14,171 | 25 MB |
| allergy_intolerances | 5,506 | 2.3 MB |
| therapy_gaps | 211 | 224 kB |
| login_sessions | 63 | 128 kB |
| error_logs | 57 | 128 kB |
| audit_logs | 30 | 136 kB |
| recommendations | 8 | 64 kB |
| alerts | 8 | 96 kB |
| phenotypes | 7 | 64 kB |
| risk_score_assessments | 4 | 80 kB |
| **hospitals** (Wave 1) | **4** | **80 kB** |
| intervention_tracking | 3 | 96 kB |
| drug_titrations | 2 | 64 kB |
| contraindication_assessments | 2 | 80 kB |
| _prisma_migrations | 1 | 32 kB |

Wave 1 actual scope: **hospitals (4 rows) + users (not in top 20, <100 rows)**. "modules" is not a separate table — module access lives as boolean columns on Hospital + User (see `moduleHeartFailure` etc. in schema.prisma).

## CPU + connections baseline (from CloudWatch, for post-migration comparison)

Captured over the 10 minutes preceding Wave 1 start:

- **Average CPU:** will be resolved from CloudWatch `AWS/RDS CPUUtilization` at Wave 1 start time. Target for validation gate: Wave 1 RDS CPU delta < +20 pts vs this baseline.
- **Average DB connections:** CloudWatch `AWS/RDS DatabaseConnections`, same window.

Full CloudWatch API query:
```bash
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=tailrd-production-postgres \
  --start-time <wave1_start - 10m> --end-time <wave1_start> \
  --period 60 --statistics Average
```

These are captured at the moment Wave 1 starts, not fixed now, because CPU drifts hour-to-hour and we want a fresh 10-min window.

## Implications for Day 4

1. **CDC deferred** until Day 6. Wave 1 runs `full-load` only (not `full-load-and-cdc`).
2. **Shadow read validator** still gets deployed per the infra build-out, but its alarms stay at INSUFFICIENT_DATA until Day 6 when CDC starts producing lag metrics.
3. **Gates 4 + 5 (CDC active, shadow reads divergence = 0)** are not evaluated on Wave 1.
4. **Observation period:** 4 hours of static row-count + checksum stability (validateMigration.ts every 15 min), not CDC lag observation.

## Implications for Day 5

Stand up a staging RDS with the production parameter group. Apply the logical-replication enablement:

```
rds.logical_replication = 1
```

then reboot, time the failover, confirm backend reconnection behavior, and document in `docs/RDS_LOGICAL_REPL_ENABLEMENT_RUNBOOK.md`.

## Implications for Day 6

Pre-Wave-2: run the rehearsed runbook against production. Budgeted outage window 2 min, realistic <60s. Then CDC is available for Waves 2-4.
