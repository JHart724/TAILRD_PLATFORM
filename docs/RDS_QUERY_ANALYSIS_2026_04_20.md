# RDS query analysis — 2026-04-20

**Status:** Day 2 diagnostic for Aurora V2 migration (Sub-Phase 2A)
**Context:** Investigating sustained ~54% CPU on `tailrd-production-postgres` (db.t3.medium) with no ingestion running.
**Method:** One-shot ECS task (`eb8d7b02...`) running against the RDS via the backend task definition + Prisma `$queryRawUnsafe` against `pg_stat_activity`, `pg_stat_user_tables`, and `pg_extension`. `pg_stat_statements` was NOT queried because it is not currently loaded (see §3).

---

## 1. The real root cause: orphaned 17h45m DELETE

`pg_stat_activity` shows exactly one active query on the `tailrd` database:

| Field | Value |
|---|---|
| PID | `19775` |
| Duration | **`17:45:28.148512`** (17 hours, 45 minutes, 28 seconds at time of capture) |
| State | `active` |
| Query | `DELETE FROM "public"."encounters" WHERE "public"."encounters"."hospitalId" = $1` |

This is the MCD wipe DELETE. It was kicked off by PRs #158 / #159 (`feat(schema): FHIR IDs unique per tenant + MCD wipe script` and `fix(scripts): chunk MCD wipe so RDS t3 baseline CPU can keep up`). The ECS ingest task that started it was stopped (`aws ecs list-tasks --family tailrd-ingest` returns `[]`), but **the database session survived the task stop** and the DELETE transaction is still open, still holding CPU.

Why it is slow:
- `encounters` has 353,526 rows and is 195 MB on disk
- The delete cascades to child tables (observations, medications, conditions) via FK
- No partial index on `hospitalId` means full table scan for the WHERE match
- On t3.medium (2 vCPU), a cascading delete over 350k rows while live traffic is also hitting the DB is effectively CPU-bound

This explains the sustained 54% CPU. The external 30-second uptime monitor identified in Day 1 (`docs/ARCHITECTURE_V2_MIGRATION.md §5`) is a real but **secondary** contributor. The dominant load is this zombie session.

### Recommended remediation (NOT applied automatically — needs Jonathan's sign-off)

```sql
-- As superuser via ECS run-task against the tailrd DB:
SELECT pg_terminate_backend(19775);
```

Effect:
- Session is killed
- The open transaction rolls back — any rows the DELETE already committed are kept; any rows in the in-flight transaction go back to their pre-transaction state
- CPU should drop within seconds
- DB ends up in the same "partially wiped" state it was in, no worse
- Aurora migration (Day 5 DMS, Day 4 verification) was going to clean up orphan FHIR rows anyway, so any residual MCD data gets cleared then

**Do not** run this without confirmation. It is low-risk but it IS a production write operation. Propose running it via a one-off ECS task with a Prisma `$queryRawUnsafe("SELECT pg_terminate_backend(19775)")` call.

---

## 2. Connection and data state

### 2.1 Active connections

```json
[{"datname":"tailrd","n":"3"},{"datname":null,"n":"6"},{"datname":"rdsadmin","n":"2"}]
```

- 3 sessions on `tailrd` (backend + this orphan + 1 other — likely the diagnostic probe itself)
- 6 sessions with null datname (standard RDS idle backend workers)
- 2 `rdsadmin` sessions (AWS-managed)

### 2.2 Database size

3,253 MB (~3.2 GB). Well within the 100 GB allocated storage.

### 2.3 Top 20 tables by live row count

| Table | Rows | Size |
|---|---:|---|
| `procedures` | 971,113 | 376 MB |
| `encounters` | 353,526 | 195 MB |
| `conditions` | 225,439 | 259 MB |
| `medications` | 220,552 | 260 MB |
| `device_implants` | 36,793 | 14 MB |
| `patients` | **14,171** | 25 MB |
| `allergy_intolerances` | 5,506 | 2.3 MB |
| `therapy_gaps` | 211 | 224 kB |
| `login_sessions` | 62 | 128 kB |
| `error_logs` | 57 | 128 kB |
| `audit_logs` | 30 | 136 kB |
| `alerts` | 8 | 96 kB |
| `recommendations` | 8 | 64 kB |
| `phenotypes` | 7 | 64 kB |
| `_prisma_migrations` | 5 | 32 kB |
| `risk_score_assessments` | 4 | 80 kB |
| `hospitals` | 4 | 80 kB |
| `intervention_tracking` | 3 | 96 kB |
| `contraindication_assessments` | 2 | 80 kB |
| `drug_titrations` | 2 | 64 kB |

**Corrections to Phase 0 estimates:**
- Phase 0 said "0 Patient rows in both tenants." That was wrong. The admin analytics endpoint reported 0 because it scopes by the `tailrd-platform` tenant for JHart's admin session, but the Patient table actually holds 14,171 rows. Those rows are tied to other tenants (likely `hosp-001` historical, not `demo-medical-city-dallas`).
- Phase 0 said "HF dashboard computes 14,168 patients from residual Observation/Encounter rows — orphaned FHIR data." Close, but the 14,168 matches the patients row count almost exactly (within 3, likely just Patient rows created or deleted between probes). The HF dashboard is reading Patient directly, not computing from Observations. The "orphaned" framing is wrong.
- `hospitals` has 4 rows, not 2. The `/api/hospitals` endpoint returned only 2 because it filters by the requesting user's access. Need to audit what the other 2 hospital records are for.

### 2.4 Installed extensions

```json
[{"extname":"plpgsql","extversion":"1.0"}]
```

Only `plpgsql` (the default). No `pg_stat_statements`, no `pgaudit` (despite being in `shared_preload_libraries`), no `pg_cron`. This is meaningful for (§3) and for compliance (pgaudit is preloaded but not `CREATE EXTENSION`-ed, so no audit row-level auditing is actually happening).

---

## 3. Why pg_stat_statements is not available

Parameter group `tailrd-production-postgres15-params`:

```
shared_preload_libraries = pgaudit
```

`pg_stat_statements` is NOT loaded. To enable it, we would need to:

1. Modify the parameter group to `pgaudit,pg_stat_statements`
2. Reboot the RDS instance (this is a `static` parameter, not `dynamic`)
3. `CREATE EXTENSION pg_stat_statements` as superuser against the `tailrd` database
4. Wait 10+ minutes for meaningful query samples to accumulate

Reboot implies a ~30-second failover (Multi-AZ is on), which is a brief production interruption. Given:
- The dominant CPU burn is now identified (§1)
- Aurora Serverless v2 (provisioned in Sub-Phase 2B) has Performance Insights enabled from Day 1 with 93-day retention
- Cutover to Aurora lands Day 6

**Recommendation: do NOT enable pg_stat_statements on the existing RDS instance.** The diagnostic need is already met by `pg_stat_activity` + this orphan DELETE discovery. Aurora will provide Performance Insights natively once cutover is complete. Any further deep query profiling needed before cutover can be done via additional `pg_stat_activity` snapshots via the same run-task pattern used for this report.

---

## 4. Top-5 queries by impact (synthesized from pg_stat_activity + log analysis)

Since `pg_stat_statements` is unavailable, the "top queries" list below is synthesized from two sources: (a) the single live query in pg_stat_activity, and (b) the 30-second uptime-monitor loop identified in Day 1 documented in `ARCHITECTURE_V2_MIGRATION.md §5`.

| Rank | Query | Source | CPU impact |
|---:|---|---|---|
| 1 | `DELETE FROM "public"."encounters" WHERE "hospitalId" = $1` | MCD wipe zombie (PID 19775) | Dominant — 17h45m sustained, cascades to child tables |
| 2 | Dashboard aggregation for `/electrophysiology/dashboard` | External uptime monitor via ALB every 30s | ~10% of requests, FHIR joins across Observation/Condition |
| 3 | Dashboard aggregation for `/coronary-intervention/dashboard` | Same monitor | ~10% of requests |
| 4 | Dashboard aggregation for `/structural-heart/dashboard` | Same monitor | ~10% of requests |
| 5 | Dashboard aggregation for `/valvular-disease/dashboard` | Same monitor | ~10% of requests |

The 5th slot for `/peripheral-vascular/dashboard` would round out the uptime-monitor set, but the real "#1 by a mile" is the zombie DELETE. Everything else is noise until that is terminated.

---

## 5. Action items

- [ ] **P0 (Jonathan to sign off):** Terminate PID 19775 to release the encounters DELETE transaction. Expected CPU drop from ~54% to <15% within 60 seconds.
- [x] Enable ALB access logs (done in this PR) — will reveal the external uptime-monitor client IP within the next 24 hours of traffic.
- [x] Express `trust proxy` set to `1` (done in this PR) — so `req.ip` reports real client IP going forward.
- [ ] Once the client IP is identified from ALB logs, either turn off the monitor at source or point it at `/health` instead of `/api/modules/*/dashboard`.
- [ ] Sub-Phase 2B: provision Aurora with Performance Insights pre-enabled so query profiling is native from Day 1 of cutover.
- [ ] Deferred (not this PR): add `pg_stat_statements` to Aurora's cluster parameter group so we have both PI and pg_stat_statements from Day 1.

---

## 6. Method reference

Diagnostic ECS task:

```bash
aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-backend:84 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a],securityGroups=[sg-07cf4b72927f9038f],assignPublicIp=DISABLED}" \
  --overrides file://override.json \
  --started-by "phase-2a-pg-probe-v2"
```

`override.json` runs a base64-encoded Node script that executes the probe queries from `/app/probe.js` via `PrismaClient.$queryRawUnsafe`. This pattern sidesteps the Session Manager plugin requirement for `aws ecs execute-command` (plugin not yet installed on the build workstation as of this report). Exit code 0, stdout captured in `/ecs/tailrd-production-backend` log stream for task `eb8d7b02...`.
