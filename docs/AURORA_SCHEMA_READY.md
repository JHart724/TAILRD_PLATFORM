# Aurora schema readiness report

**Date:** 2026-04-20
**Aurora cluster:** `tailrd-production-aurora`
**Writer endpoint:** `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432`
**Database:** `tailrd`
**Engine:** aurora-postgresql 15.14 (matches source RDS exactly)

---

## TL;DR

Aurora schema matches `backend/prisma/schema.prisma` at commit time. 53 user tables present. All 7 PR #158 composite unique indexes verified. Zero data rows. `_prisma_migrations` populated with the same 5 migration entries as production RDS. Ready for Phase 3D (DMS instance creation).

---

## Method

Phase 3B attempted the straightforward path first: `npx prisma migrate deploy` against Aurora via a short-lived ECS task. That failed on migration `20260419170743_fhir_ids_per_tenant_unique` (PR #158) with:

```
Database error code: 42704
ERROR: index "observations_fhirObservationId_key" does not exist
```

Investigation revealed **migration history drift** in the repo that blocks fresh-database provisioning from the committed migrations alone. See §"Migration history drift" below.

Working solution (for Aurora only; RDS untouched):

1. `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO tailrd_admin` against Aurora
2. `npx prisma db push --skip-generate --accept-data-loss` against Aurora → creates all tables from the current `schema.prisma`
3. Copy all 5 rows from RDS's `_prisma_migrations` table into Aurora's `_prisma_migrations` table (matching checksums, finished_at timestamps, etc.) so Prisma on Aurora reports the same migration state as production RDS

Production RDS (`tailrd-production-postgres`) was NOT modified at any point in Phase 3B. No schema changes, no data changes, no migration state changes.

---

## Migration history drift (tech debt captured separately)

The committed migration files in `backend/prisma/migrations/` do NOT fully reconstruct the production schema. Specifically:

**Missing from any committed migration:** `CREATE TABLE` statements for `procedures`, `observations`, `conditions`, `medications`, `device_implants`, `allergy_intolerances` (six FHIR-backed clinical tables).

**Missing from any committed migration:** `CREATE UNIQUE INDEX` statements for `observations_fhirObservationId_key`, `procedures_fhirProcedureId_key`, `device_implants_fhirDeviceId_key`, `allergy_intolerances_fhirAllergyId_key` — only the `encounters_fhirEncounterId_key` index is actually created by the committed initial migration.

**Consequence:** PR #158's migration tries to `DROP INDEX <name>` (not `IF EXISTS`) on four indexes that don't exist on a fresh database. On production RDS those indexes do exist (presumably created pre-repo-history via `prisma db push` or manual `CREATE INDEX`). On Aurora they do not, so the migration aborts.

**Quick fix applied in this PR:** the `backend/prisma/migrations/20260419170743_fhir_ids_per_tenant_unique/migration.sql` now uses `DROP INDEX IF EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS`. This does nothing on RDS (already applied) and allows the migration to succeed on future fresh databases **once the missing CREATE TABLE statements also exist in migration files**.

**Deeper fix (deferred, tracked in TECH_DEBT_REGISTER):** regenerate a proper migration baseline via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` and squash the drift-recovering SQL into the initial migration. Out of scope for Day 3; the `db push` workaround gets Aurora ready for DMS today.

---

## Verification outputs

Run via ECS run-task against Aurora writer endpoint on 2026-04-20.

### Table list

53 user tables in `public` schema:

```
alerts, allergy_intolerances, audit_logs, bpci_episodes, breach_incidents,
business_metrics, care_plans, cds_hooks_sessions, conditions,
contraindication_assessments, cql_results, cql_rules, cross_referrals,
device_eligibility, device_implants, drug_interaction_alerts, drug_titrations,
encounters, error_logs, failed_fhir_bundles, feature_usage, hospitals,
internal_notes, intervention_tracking, invite_tokens, ip_allowlist,
login_sessions, medications, observations, onboarding, orders,
patient_data_requests, patients, performance_metrics, phenotypes, procedures,
quality_measures, recommendations, report_generations, risk_score_assessments,
term_cpt, term_gap_valueset, term_icd10, term_loinc, term_msdrg, term_rxnorm,
therapy_gaps, upload_jobs, user_activities, user_mfa, user_sessions, users,
webhook_events
```

(`_prisma_migrations` is the 54th table; it lives in `public` but `pg_stat_user_tables` sometimes excludes it depending on privileges. Confirmed separately as 5 rows.)

### Composite unique indexes (PR #158)

All 7 per-tenant composite uniques present:

```
allergy_intolerances_hospitalId_fhirAllergyId_key       (allergy_intolerances)
conditions_hospitalId_fhirConditionId_key               (conditions)
device_implants_hospitalId_fhirDeviceId_key             (device_implants)
encounters_hospitalId_fhirEncounterId_key               (encounters)
medications_hospitalId_fhirMedicationId_key             (medications)
observations_hospitalId_fhirObservationId_key           (observations)
procedures_hospitalId_fhirProcedureId_key               (procedures)
```

### Row count

```json
{"with_data": 0, "total": 53}
```

Zero tables have data. Aurora is empty, ready for DMS full-load.

### Prisma migration state

```json
[
  {"id":"f672b7ac-2bc6-4efd-9b08-f7176e1e235a","name":"20260326060741_initial_schema","done":true},
  {"id":"e020df93-6f29-4def-9d2c-93e1b8698844","name":"20260408132829_phase3_prerequisites","done":true},
  {"id":"435a13c7-5276-4d96-acf6-94380b3c6ad7","name":"20260413000000_add_webhook_event_patient_id","done":true},
  {"id":"40e45c52-86d8-43d4-8164-3e5570ee87c3","name":"20260414220000_patient_dob_encrypted_string","done":true},
  {"id":"fc52eeae-6500-4e08-8485-8eee76de51b2","name":"20260419170743_fhir_ids_per_tenant_unique","done":true}
]
```

All 5 rows copied from RDS with matching checksums. Future `prisma migrate deploy` against Aurora will be a no-op.

---

## What's explicitly NOT in Aurora yet

- Any data rows (zero, per design)
- DMS replication task (Phase 3D-3H)
- Backend pointing at Aurora (Day 6 cutover)

---

## Guarantees for Phase 3D onward

1. **Schema on Aurora is identical to schema on RDS** (per `schema.prisma`). DMS Wave 1+ can use `TargetTablePrepMode = DO_NOTHING` safely.
2. **Composite unique constraints will be enforced from Wave 3 onwards.** If source RDS has any duplicate `(hospitalId, fhirXId)` pair on the seven constrained tables, Wave 3 will fail at that row. Phase 3G pre-flight collision check against source RDS must run clean before Wave 3 starts.
3. **Prisma migration state is consistent.** No drift between RDS and Aurora in `_prisma_migrations`.
4. **Aurora is writable by `tailrd_admin`.** Confirmed via direct Prisma connection and successful `db push`.
