# DMS Migration Plan — RDS to Aurora

**Status:** Day 3 (2026-04-20), Phase 3A. Design phase. No DMS resources created yet.
**Owner:** Jonathan Hart
**Companion docs:** `docs/ARCHITECTURE_V2_MIGRATION.md`, `docs/RDS_QUERY_ANALYSIS_2026_04_20.md`, `docs/TECH_DEBT_REGISTER.md`
**Target execution window:** Day 3 (Wave 1) through Day 5 (Wave 4), cutover on Day 6.

---

## 1. Scope and non-goals

### In scope
- Copying live data from `tailrd-production-postgres` (RDS t3.medium, PG 15.14) to `tailrd-production-aurora` (Aurora Serverless v2, PG 15.14) via AWS Database Migration Service
- Ongoing CDC (change data capture) replication from RDS to Aurora for the duration of the migration window, so Aurora stays current while both are running
- Validation tooling (`backend/scripts/validateMigration.ts`) that proves data parity continuously
- CloudWatch alarms + SNS alerting for replication lag, row divergence, checksum mismatches
- Wave-based rollout with hard gates between waves
- Rollback procedures for every stage

### Out of scope
- **Schema changes.** Prisma is the sole source of truth for schema. `schema.prisma` + `npx prisma migrate deploy` own table shapes, indexes, constraints, foreign keys. DMS does **not** recreate or alter schema. It copies rows.
- **Application cutover.** Swapping `DATABASE_URL` in Secrets Manager and pointing the backend at Aurora happens on Day 6. This doc stops at the end of data migration.
- **Decommissioning the old RDS instance.** RDS stays online as a rollback target through Day 10.
- **DMS for schema migration tools (SCT).** Not used. Prisma already runs on both engines.
- **Traffic routing changes.** ALB, CloudFront, DNS are untouched during Days 3-5.
- **Data transformation / cleanup.** If source data has issues (orphan rows, violated composite uniques, etc.), we either fix at source before Wave start, or pause and document. Never silently drop or mutate data during migration.

---

## 2. Table migration waves

Wave design driven by two constraints: (a) topological order of foreign-key dependencies so referenced rows land first, (b) row-count-based risk tiering so we validate small before large.

Row counts below are from the 2026-04-20 `pg_stat_user_tables` probe (captured in `docs/RDS_QUERY_ANALYSIS_2026_04_20.md`) and will be re-measured via `SELECT COUNT(*)` immediately before each wave starts — a pg_stat count can lag reality.

### Wave 1 — Reference data (<100k rows each, ~30 min full load)

| Prisma model | Physical table | ~Row count (2026-04-20) | FK anchors |
|---|---|---:|---|
| `Hospital` | `hospitals` | 4 | — (root) |
| `User` | `users` | small | `hospitalId` → `hospitals.id` |
| `InviteToken` | `invite_tokens` | small | `hospitalId` → `hospitals.id` |
| `UserMFA` | `user_mfa` | small | `userId` → `users.id` |
| `UserSession` | `user_sessions` | small | `userId` → `users.id` |
| `IPAllowlist` | `ip_allowlists` | small | `hospitalId` → `hospitals.id` |
| `LoginSession` | `login_sessions` | 62 | `userId` → `users.id` |
| `TermICD10` | `term_icd10s` | ~70k (static reference) | — |
| `TermRxNorm` | `term_rx_norms` | ~50k (static reference) | — |
| `TermLOINC` | `term_loincs` | ~10k (static reference) | — |
| `TermCPT` | `term_cp_ts` | ~20k (static reference) | — |
| `TermMSDRG` | `term_msdr_gs` | small | — |
| `TermGapValueSet` | `term_gap_value_sets` | small | — |

**Goal of Wave 1:** prove the DMS → Aurora pipeline end-to-end on low-risk data. No clinical PHI, no high-volume tables. The authentication spine (`hospitals` + `users`) is the gate for every other table.

**Validation criteria (Wave 1 gate):**
- Row-count parity 100% on every Wave 1 table (RDS count = Aurora count)
- Checksum parity on all Wave 1 tables (they are small enough to hash every row)
- Foreign-key integrity spot-check: every `users.hospitalId` must resolve to a `hospitals.id` on Aurora
- DMS task status `running`, zero errors in last 10 min
- No `ERROR` entries in the DMS CloudWatch log for this task

**Go/no-go gate:** **Jonathan approves** before Wave 2 starts. Record approval in `docs/DMS_MIGRATION_LOG.md` with timestamp and wave number.

**Estimated full-load duration:** 10-30 min (dominated by the static terminology tables; dozens of MB total).

### Wave 2 — Core clinical (≤1M rows each, ~2 hr full load)

| Prisma model | Physical table | ~Row count | FK anchors |
|---|---|---:|---|
| `Patient` | `patients` | 14,171 | `hospitalId` → `hospitals.id` |
| `Encounter` | `encounters` | 353,526 | `patientId`, `hospitalId` |

**Why these two together:** they are the anchors for every downstream clinical record. Running them as their own wave means any FK-cascade weirdness from PR #158's composite uniques shows up now, not buried under 2M+ observation rows.

**Validation criteria (Wave 2 gate):** same four checks as Wave 1, plus:
- Composite unique constraint verification: `Encounter` has `@@unique([hospitalId, fhirEncounterId])` per PR #158. Confirm no row violates it on Aurora.
- FK sweep: every `encounters.patientId` resolves to a `patients.id`, every `patients.hospitalId` resolves to a `hospitals.id`.

**Go/no-go gate:** Jonathan approves.

**Estimated full-load duration:** 1-2 hr.

### Wave 3 — High volume clinical (1M+ rows, ~6-8 hr full load)

| Prisma model | Physical table | ~Row count | FK anchors |
|---|---|---:|---|
| `Procedure` | `procedures` | 971,113 | `patientId`, `encounterId`, `hospitalId` |
| `Observation` | `observations` | (not captured in probe, likely >500k) | `patientId`, `encounterId`, `hospitalId` |
| `Condition` | `conditions` | 225,439 | `patientId`, `encounterId`, `hospitalId` |
| `Medication` | `medications` | 220,552 | `patientId`, `encounterId`, `hospitalId` |
| `DeviceImplant` | `device_implants` | 36,793 | `patientId`, `encounterId`, `hospitalId` |
| `AllergyIntolerance` | `allergy_intolerances` | 5,506 | `patientId`, `hospitalId` |

**Why these together:** all depend on `patients` + `encounters` from Wave 2. All carry the composite-unique constraints from PR #158 (`[hospitalId, fhirXId]`). Running them as one wave rather than six reduces DMS task overhead.

**Validation criteria (Wave 3 gate):** same four checks, plus:
- Composite unique constraint verification on all six tables
- FK sweep: every row's `patientId` and `encounterId` resolve
- **Sampled checksum** (not full): md5(string_agg(id ORDER BY id)) on 10,000-row samples per table, because full checksums on 1M+ rows are expensive

**Go/no-go gate:** Jonathan approves. This is the highest-risk wave.

**Estimated full-load duration:** 6-8 hr depending on Aurora ACU scaling.

### Wave 4 — Audit, operational, ancillary (~1 hr full load)

| Prisma model | Physical table | ~Row count |
|---|---|---:|
| `AuditLog` | `audit_logs` | 30 (low currently, grows over time) |
| `UserActivity` | `user_activities` | — |
| `FeatureUsage` | `feature_usages` | — |
| `PerformanceMetric` | `performance_metrics` | — |
| `BusinessMetric` | `business_metrics` | — |
| `WebhookEvent` | `webhook_events` | — |
| `FailedFhirBundle` | `failed_fhir_bundles` | — |
| `ErrorLog` | `error_logs` | 57 |
| `Alert` | `alerts` | 8 |
| `TherapyGap` | `therapy_gaps` | 211 |
| `Recommendation` | `recommendations` | 8 |
| `Order` | `orders` | — |
| `UploadJob` | `upload_jobs` | — |
| `Onboarding` | `onboardings` | — |
| `CarePlan` | `care_plans` | — |
| `CQLRule` | `cql_rules` | — |
| `CQLResult` | `cql_results` | — |
| `Phenotype` | `phenotypes` | 7 |
| `CrossReferral` | `cross_referrals` | — |
| `DrugTitration` | `drug_titrations` | 2 |
| `QualityMeasure` | `quality_measures` | — |
| `DeviceEligibility` | `device_eligibilities` | — |
| `RiskScoreAssessment` | `risk_score_assessments` | 4 |
| `InterventionTracking` | `intervention_trackings` | 3 |
| `ContraindicationAssessment` | `contraindication_assessments` | 2 |
| `InternalNote` | `internal_notes` | — |
| `BreachIncident` | `breach_incidents` | — |
| `PatientDataRequest` | `patient_data_requests` | — |
| `CdsHooksSession` | `cds_hooks_sessions` | — |
| `BpciEpisode` | `bpci_episodes` | — |
| `DrugInteractionAlert` | `drug_interaction_alerts` | — |
| `ReportGeneration` | `report_generations` | — |

**Validation criteria (Wave 4 gate):** same four checks. `audit_logs` gets special attention because tech debt item in `TECH_DEBT_REGISTER.md` notes 162k legacy entries contain the ALB ENI IP rather than the real client IP (pre-Phase-2A fix). Migrate as-is; do not rewrite historical audit data.

**Go/no-go gate:** Jonathan approves. Final gate before CDC-only steady state.

**Estimated full-load duration:** 30-60 min.

### Post-Wave-4: CDC steady state

After Wave 4 full load completes, DMS enters CDC-only mode. The replication task continues running, applying RDS changes to Aurora in near-real-time. Aurora stays current.

This is the state we hold until Day 6 cutover. Target steady-state lag: <10 seconds for 24 hours before we even consider cutover.

---

## 3. Schema strategy

### Prisma owns schema. DMS copies data.

1. **Before any DMS work**, `npx prisma migrate deploy` runs against an empty Aurora writer endpoint. This creates every table, every index, every foreign key, every composite unique. Schema on Aurora is **identical** to what CI would produce on a fresh RDS.
2. DMS replication tasks are configured with `TargetMetadata.TargetTablePrepMode = "DO_NOTHING"`. DMS finds the tables already there, skips creation, and streams rows into them.
3. DMS is also configured with `FullLoadSettings.CreatePkAfterFullLoad = false` — we already have PKs from Prisma, DMS must not try to add them.
4. Indexes are pre-existing. DMS loads into indexed tables. Slower than loading then indexing, but safer: the wave-gate validation can run concurrently and catch constraint violations immediately.

### PR #158 composite uniques

PR #158 added `@@unique([hospitalId, fhirEncounterId])` (and analogous for six other FHIR-backed tables) to enforce tenant-scoped FHIR ID uniqueness. These constraints exist on Aurora the moment Prisma applies the schema.

**Risk:** if source RDS has ANY duplicate `(hospitalId, fhirXId)` pair, Wave 3 will fail when that second row hits Aurora. DMS will log a constraint violation and continue with other rows, leaving Aurora missing data. Phase 3G runs a pre-flight collision check on all seven tables against source RDS **before** Wave 3 starts. If collisions exist, we pause, document in `docs/DATA_DEDUPLICATION_PLAN.md`, and decide deduplicate-at-source vs DMS-transformation-rule before proceeding.

### Sequences

Prisma uses `@default(cuid())` or `@default(uuid())` for most tables, so no sequences to reset. For any integer `@default(autoincrement())` tables, DMS will copy the current max value; we run `SELECT setval(pg_get_serial_sequence('<table>','id'), (SELECT MAX(id) FROM <table>))` on Aurora after each wave. Verify via `SELECT currval(...)` matches the highest-numbered row.

---

## 4. Validation gates between waves

Every wave must pass all four gates before Jonathan approves the next. Gates are enforced by `backend/scripts/validateMigration.ts` (Phase 3C), not by trusting DMS's own "task succeeded" signal. DMS can silently skip rows on constraint violation; only client-side validation catches that.

### Gate A — Row-count parity

For every table in the wave:
- `rds_count = SELECT COUNT(*) FROM public.<table>` (source)
- `aurora_count = SELECT COUNT(*) FROM public.<table>` (target)
- `diff = rds_count - aurora_count`

**Pass:** `diff == 0` for every table.
**Warn:** `diff <= 10` — investigate but not necessarily block (possible CDC in-flight rows).
**Fail:** `diff > 10` on any table. Pause wave.

### Gate B — Checksum parity

For the wave's sample tables (every table in Waves 1-2; 10k-row samples per table in Waves 3-4):
- `rds_hash = md5(string_agg(id, ',' ORDER BY id))` (source)
- `aurora_hash = md5(string_agg(id, ',' ORDER BY id))` (target, same WHERE clause)

**Pass:** `rds_hash == aurora_hash` for every sampled table.
**Fail:** any mismatch. Pause wave.

Rationale: row-count parity is necessary but not sufficient. Checksum proves the **same IDs** landed on both sides, not just the same count.

### Gate C — Foreign-key integrity

Wave-specific FK sweep queries, run against Aurora only:
- Wave 1: `SELECT COUNT(*) FROM users WHERE hospitalId NOT IN (SELECT id FROM hospitals)` → must be 0
- Wave 2: `SELECT COUNT(*) FROM encounters WHERE patientId NOT IN (SELECT id FROM patients)` → must be 0, same for `hospitalId`
- Wave 3: same pattern for each of procedures/observations/conditions/medications/device_implants/allergy_intolerances against patients + encounters + hospitals
- Wave 4: table-specific joins as applicable

**Pass:** all FK sweeps return 0.
**Fail:** non-zero. Pause wave. Cause is usually "DMS applied child before parent finished." Solution is to rerun the wave.

### Gate D — DMS task health

- `aws dms describe-replication-tasks` returns Status `running`
- `aws dms describe-table-statistics` shows all tables in wave at `FullLoadEndTime` (full load complete)
- `aws logs filter-log-events` on the DMS log group, last 10 min, filter pattern `ERROR` → must return zero events

**Pass:** all three.
**Fail:** any one. Pause wave.

### Gate approval

After all four gates pass, write the validation output to `docs/DMS_MIGRATION_LOG.md` under the corresponding wave heading. Jonathan reviews the log entry and records approval as:
```
Wave N approved by Jonathan Hart at <ISO 8601 timestamp>
Proceeding to Wave N+1.
```

No other approver. No silent proceed.

---

## 5. Abort conditions

Abort conditions pause the migration. They do **not** trigger automatic rollback — we pause, diagnose, then decide.

| Condition | Threshold | Action |
|---|---|---|
| Replication lag | > 60 seconds for > 5 min | Pause CDC, investigate source write rate vs Aurora apply rate |
| DMS error count | > 100 errors in the task log over any 10-min window | Pause task, read error log, decide if transient or structural |
| Row-count divergence | > 0.1% on any table (or > 10 rows on tables with < 10k rows) | Pause wave, run FK + checksum gates to locate the gap |
| Aurora CPU | > 80% sustained for 5 min | Investigate — usually means ACU too low or a long query; scale up ACU or kill the runaway |
| DMS instance memory | > 85% | Scale up the DMS replication instance class |
| Unexpected schema mismatch | Any DDL drift between RDS and Aurora detected by validateMigration.ts | Halt immediately, this should be impossible given Prisma ownership |
| Prisma migrations drift | `schema.prisma` on main ≠ schema applied to Aurora at Phase 3B | Halt. Re-run `prisma migrate deploy` against Aurora before resuming |

Each abort produces a `docs/DMS_MIGRATION_LOG.md` entry with the condition triggered, the observed values, and the diagnostic plan. **No abort resolves without Jonathan's explicit OK.**

---

## 6. Rollback procedures per stage

Rollback always prefers "pause and investigate" over "discard work." The following are last-resort procedures.

### Stage: Pre-DMS (Phase 3B schema applied, no DMS yet)

**If Aurora schema is wrong:**
1. `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` on Aurora (superuser)
2. `npx prisma migrate deploy` against Aurora writer
3. Verify `\dt public.*` matches RDS table list

**Blast radius:** zero. Aurora has no data.

### Stage: Wave N in progress, pre-validation

**If mid-wave DMS task is stuck or wrong:**
1. `aws dms stop-replication-task --replication-task-arn <arn>`
2. For each table in the failed wave, on Aurora: `TRUNCATE TABLE public.<table> CASCADE`
3. Restart the replication task from full-load for that wave only
4. Revalidate

**Blast radius:** the wave restarts. Previously migrated waves untouched because their tables are not in this wave's table mapping.

### Stage: Full load complete, CDC running, pre-cutover

**If Aurora data looks wrong:**
1. `aws dms stop-replication-task`
2. Diagnose via `validateMigration.ts` + manual spot-checks
3. Either:
   - Fix forward: restart with `--start-replication-task-type reload-target` for affected tables
   - Restart from scratch: `TRUNCATE` all migrated tables, restart full-load
4. Revalidate all waves

**Blast radius:** hours. Safe because RDS is still primary.

### Stage: Post-cutover (Day 6+)

**If Aurora has a data problem after backend flipped:**
1. Flip the feature flag that rejects writes (read-only mode). See `docs/ARCHITECTURE_V2_MIGRATION.md §4 Day 6 cutover`.
2. `aws secretsmanager put-secret-value --secret-id tailrd-production/app/database-url --secret-string <old-RDS-connection-string>`
3. Register new backend task def pointing at RDS again, force-new-deployment
4. Flip feature flag off
5. Run reverse DMS: source=Aurora, target=RDS, to replay post-cutover writes back to RDS

**RTO target:** 15 minutes. Depends on ECS task startup time (~90s) and CDC reverse replay time (depends on minutes-since-cutover).

---

## 7. Success criteria (numerical)

Migration is **complete** and Day 6 cutover is **approved** only when all of these hold simultaneously:

1. **100% row-count parity** across every Prisma-defined table, RDS vs Aurora
2. **100% checksum parity** on every Wave 1-2 table (fully hashed)
3. **100% sampled checksum parity** on Wave 3-4 tables (10k-row samples, repeated 3× with different random seeds)
4. **0 errors** in DMS task log for the last 60 minutes of CDC
5. **Replication lag < 10 seconds sustained for 24 hours**
6. **All CloudWatch alarms in OK state** for the last 24 hours (`ROW_DIFF_CRITICAL`, `HASH_MISMATCH_CRITICAL`, `LAG_WARNING`, `LAG_CRITICAL`)
7. **Aurora p99 query latency ≤ RDS p99 latency + 10%** — verified by running the gap-detection engine against both databases with the same tenant and comparing timings over a 1-hour window
8. **All composite unique constraints enforced on Aurora** — `SELECT conname FROM pg_constraint WHERE conname LIKE '%fhir%'` on Aurora returns the same set as RDS
9. **All foreign keys valid on Aurora** — the FK sweep queries from Gate C return 0 for every FK
10. **Prisma migration state consistent** — `_prisma_migrations` table on Aurora has the same rows as RDS

Any one of these failing means no cutover. Period.

---

## 8. Communication plan

No live customer-facing clients exist today. No customer comms needed.

### Internal logging

Every wave start, validation pass, gate approval, abort condition, and rollback goes in `docs/DMS_MIGRATION_LOG.md` as an append-only log with ISO 8601 timestamps. Format:

```markdown
## 2026-04-20T18:00:00Z — Wave 1 started
Task: tailrd-migration-wave1
Tables: hospitals, users, ...
Start row counts: hospitals=4, users=...
Expected duration: 10-30 min

## 2026-04-20T18:12:00Z — Wave 1 full load complete
...

## 2026-04-20T18:15:00Z — Wave 1 validation
Gate A (row count): PASS
Gate B (checksum): PASS
Gate C (FK integrity): PASS
Gate D (DMS health): PASS

## 2026-04-20T18:20:00Z — Wave 1 approved by Jonathan Hart
Proceeding to Wave 2.
```

### Tech debt register

Any issue deferred during migration (e.g., "Wave 2 had 3 orphan encounter rows in source, migrated as-is, cleanup post-cutover") is recorded in `docs/TECH_DEBT_REGISTER.md` with severity and target remediation date.

### Failure communication

If migration aborts, a summary goes in `docs/DMS_MIGRATION_LOG.md` and, if the pause exceeds 24 hours, a one-line status update is added to `CLAUDE.md §10 Frontend-Backend Wiring Status` so anyone reading project state knows the migration is paused.

---

## 9. Responsible parties

| Concern | Owner | Mechanism |
|---|---|---|
| Schema correctness on Aurora | Prisma migrations | CI runs `prisma migrate deploy` on main; Phase 3B applies the current state to Aurora once |
| DMS instance lifecycle | Jonathan Hart | `aws dms *` commands via CLI, AWS Console read-only |
| Replication task config + start/stop | Jonathan Hart | explicit command per wave, never auto-resume |
| Validation tool correctness | Jonathan Hart | `backend/scripts/validateMigration.ts` + its tests, merged through CI |
| CloudWatch alarms + SNS topic | Jonathan Hart, provisioned by Phase 3C | provisioned once, owned by the repo |
| Go/no-go gate approval | **Jonathan Hart** | written approval recorded in `docs/DMS_MIGRATION_LOG.md` with timestamp |
| Abort decisions | **Jonathan Hart** | same |
| Rollback execution | Jonathan Hart | documented procedures from §6 |
| Post-cutover monitoring | Jonathan Hart | CloudWatch + manual spot-check for 48 hours post-Day-6 |

**No automated approvals.** **No unattended wave starts.** Jonathan is on the keyboard for every wave transition.

---

## 10. Out-of-band coordination

### AWS resources that Phase 3D-3H will create

| Resource | Identifier |
|---|---|
| DMS replication instance | `tailrd-dms-replication` (dms.t3.medium, 50GB gp3, single-AZ) |
| DMS security group | `tailrd-dms-sg` (new SG, egress 5432 to RDS SG `sg-09e3b87c3cbc42925` and Aurora SG `sg-0524ba8efe6058f7b`) |
| DMS source endpoint | `tailrd-rds-source` (points at existing RDS, existing secret) |
| DMS target endpoint | `tailrd-aurora-target` (points at Aurora writer endpoint directly, **not** the proxy) |
| DMS Wave 1 task | `tailrd-migration-wave1` |
| SNS topic | `tailrd-migration-alerts` (subscribed: `jonathan@tailrd-heart.com`) |
| CloudWatch alarms | `ROW_DIFF_CRITICAL`, `HASH_MISMATCH_CRITICAL`, `LAG_WARNING`, `LAG_CRITICAL` |

### Proxy note

Day 2 provisioned an RDS Proxy (`tailrd-aurora-proxy`) which is currently stuck in an AWS internal-error state. DMS **does not use the proxy**. DMS targets the Aurora writer endpoint directly. Proxy health is irrelevant to this migration plan. Proxy can be recreated in parallel (Path 1 of this work) or deferred; neither blocks DMS.

---

## 11. Phase dependencies

```
3A (design doc)              ← this file
  ↓
3B (apply Prisma schema)     ← before ANY DMS work
  ↓
3C (validation tool + alarms)← before ANY wave starts
  ↓
3D (DMS instance)
  ↓
3E (DMS endpoints + test-connection both)
  ↓
3F (create Wave 1 task, do NOT start)
  ↓
3G (pre-flight collision check on 7 composite-unique tables)
  ↓  (if clean)
3H (start Wave 1, validate, gate)
  ↓  (Jonathan approves)
Day 4: Wave 2
Day 5: Wave 3, Wave 4
Day 6: cutover (separate doc, `docs/ARCHITECTURE_V2_MIGRATION.md §4 Day 6`)
```

Nothing skips forward. 3G cannot run until 3F created the task. 3H cannot start until 3G cleared.

---

## 12. Review checklist for this doc

Before Phase 3B starts, confirm:

- [ ] Wave membership matches actual Prisma models (no drift from `backend/prisma/schema.prisma`)
- [ ] Row-count estimates are within 2× of reality — rerun `validateMigration.ts --report-only` to refresh
- [ ] Composite unique constraint list matches PR #158 exactly
- [ ] `docs/DMS_MIGRATION_LOG.md` exists and has the Wave 1 pre-start template
- [ ] Jonathan has read the abort conditions in §5 and acknowledges the escalation path

---

## 13. Revision history

| Date | Change | PR |
|---|---|---|
| 2026-04-20 | Initial design doc | (this PR) |
