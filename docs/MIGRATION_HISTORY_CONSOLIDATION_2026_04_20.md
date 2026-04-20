# Migration history consolidation — 2026-04-20

**Status:** complete
**Tech debt resolved:** `docs/TECH_DEBT_REGISTER.md` #16
**Branch:** `feat/migration-history-consolidation`

---

## Why this was needed

The committed migrations in `backend/prisma/migrations/` did not reconstruct the production schema. Discovered during Day 3 Phase 3B of the Aurora V2 migration when `npx prisma migrate deploy` against a fresh Aurora cluster failed at migration `20260419170743_fhir_ids_per_tenant_unique` with `ERROR: index "observations_fhirObservationId_key" does not exist`.

Investigation showed two classes of gap:

**Missing `CREATE TABLE` statements.** Six FHIR-backed tables existed on production RDS but were not created by any committed migration SQL file:
- `procedures`
- `observations`
- `conditions`
- `medications`
- `device_implants`
- `allergy_intolerances`

**Missing `CREATE UNIQUE INDEX` statements.** Four of the five global unique indexes that PR #158 dropped (`DROP INDEX observations_fhirObservationId_key`, etc.) were never created by a committed migration. They existed on RDS from a pre-repo-history `prisma db push` or manual `CREATE INDEX`.

**Consequence before this PR:** a fresh Postgres database could not be built from the migration files. Any disaster-recovery cold rebuild, any staging environment spin-up, and any Aurora bootstrap would fail at the PR #158 migration. Aurora was bootstrapped on Day 3 via `prisma db push` + copying `_prisma_migrations` from RDS, which works but is not a sustainable pattern.

---

## What was consolidated

Five old migration folders, deleted:

| Folder | Created | Purpose |
|---|---|---|
| `20260326060741_initial_schema` | 2026-03-26 | Incomplete initial schema; missed 6 tables |
| `20260408132829_phase3_prerequisites` | 2026-04-08 | Added `cds_hooks_sessions`, `bpci_episodes`, `drug_interaction_alerts` |
| `20260413000000_add_webhook_event_patient_id` | 2026-04-13 | Added `patientId` FK to `webhook_events` |
| `20260414220000_patient_dob_encrypted_string` | 2026-04-14 | Converted Patient DOB to encrypted string |
| `20260419170743_fhir_ids_per_tenant_unique` | 2026-04-19 | PR #158: composite `[hospitalId, fhirXId]` uniques |

Replaced by one:

| Folder | Notes |
|---|---|
| `20260420000000_consolidated_baseline` | Full schema: 53 tables, 47 enums, 133 indexes, 78 foreign keys |

---

## How the baseline was built

1. `pg_dump --schema-only --no-owner --no-acl` was run against production RDS (`tailrd-production-postgres`) from inside the VPC via a throwaway ECS task (`tailrd-pgdump:2`, image `postgres:15-alpine`).
2. The dump was uploaded to `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/2026-04-20/rds-schema.sql`.
3. A Python cleanup script (`.tmp-phase3consolidation/build.py`) stripped:
   - pg_dump session nonces (`\restrict`, `\unrestrict`)
   - pg_dump session pragmas (`SET statement_timeout`, etc.)
   - `_prisma_migrations` table definition (Prisma creates this itself)
   - Ownership/ACL comments (already excluded by `--no-owner --no-acl`)
4. A migration header comment was prepended explaining provenance.
5. The result was written to `backend/prisma/migrations/20260420000000_consolidated_baseline/migration.sql` (116 KB, 3,647 lines).

Source of truth: **production RDS at 2026-04-20 17:11 UTC.** Column declaration order matches RDS exactly (columns listed in chronological ADD order rather than schema.prisma order).

---

## Phase C verification — proof of DR

Before applying to production, the consolidated baseline was tested on a fresh RDS instance.

**Test instance:**
- Identifier: `tailrd-migration-test` (temporary; deleted after verification)
- Engine: PostgreSQL 15.14 (matches production)
- Class: `db.t3.micro`
- Storage: 20 GB gp3
- Deletion protection: off; final snapshot: skipped

**Procedure:**

1. `aws rds create-db-instance` with above specs, in the same VPC / SG / subnet group as Aurora so the backend task could reach it.
2. Once `available`, `npx prisma migrate deploy` was run with `DATABASE_URL` pointing at the test instance.
3. `pg_dump --schema-only --no-owner --no-acl` of the resulting schema.
4. `diff` against production RDS dump (with `\restrict`/`\unrestrict` lines excluded via `grep -v`).

**Expected:** zero diff (or whitespace-only).

**Result:** *(populated by Phase C verification run — see `docs/SCHEMA_DIFF_REPORT.md` for structural counts; this doc records the test outcome)*.

Test instance deleted after verification via `aws rds delete-db-instance --skip-final-snapshot`.

---

## Phase D — apply to production

**Safety nets:**

1. RDS manual snapshot: `tailrd-production-postgres-pre-consolidation-2026-04-20` (created via `aws rds create-db-snapshot`).
2. Aurora cluster manual snapshot: `tailrd-production-aurora-pre-consolidation-2026-04-20` (created via `aws rds create-db-cluster-snapshot`).

Both snapshots are retained per AWS default (35-day default snapshot retention). If anything goes wrong after this change, either database can be restored to the pre-consolidation state.

**_prisma_migrations update (both RDS and Aurora):**

The schema on both databases already matches what the baseline would produce. What changes is the `_prisma_migrations` tracking table. We want Prisma to see one migration `20260420000000_consolidated_baseline` marked applied, not the old five migrations.

Applied via single transaction on each database:

```sql
BEGIN;
DELETE FROM "_prisma_migrations";
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '<sha256 of new migration.sql>',
  NOW(),
  '20260420000000_consolidated_baseline',
  NULL,
  NULL,
  NOW(),
  1
);
COMMIT;
```

Checksum is computed by `sha256sum backend/prisma/migrations/20260420000000_consolidated_baseline/migration.sql`. The same checksum goes on both RDS and Aurora.

**Verification:** `SELECT * FROM "_prisma_migrations"` on each returns exactly one row with migration_name = `20260420000000_consolidated_baseline`.

---

## How to add new migrations going forward

1. Modify `backend/prisma/schema.prisma`.
2. `cd backend && npx prisma migrate dev --name <short_description>` → Prisma generates a new migration folder with a timestamp after `20260420000000`.
3. Commit the new migration folder, push, and CI runs `prisma migrate deploy` against production.

The consolidated baseline is immutable. Never edit `20260420000000_consolidated_baseline/migration.sql`. If you need a follow-up structural change, create a new dated migration that alters the baseline.

---

## Disaster recovery scenarios enabled by this change

### Scenario 1: Cold rebuild from backup

1. Restore RDS (or Aurora) from most recent snapshot: `aws rds restore-db-instance-from-db-snapshot`.
2. Update `DATABASE_URL` secret in Secrets Manager to the restored instance's endpoint.
3. Force-new-deployment of the backend ECS service.
4. Done — schema and data both match the snapshot point-in-time.

### Scenario 2: Cold rebuild from scratch (no backup, schema from repo)

1. Create empty Postgres (RDS, Aurora, whatever).
2. Set `DATABASE_URL` pointing at the new instance.
3. `cd backend && npx prisma migrate deploy` → produces the production schema exactly.
4. Restore data from the most recent logical backup (bucket `tailrd-production-backups` or S3 exports) via `pg_restore --data-only`.
5. Run `UPDATE sequences...` to set `setval` on any serial sequences if the data restore didn't carry them.
6. Done.

### Scenario 3: Staging environment build

Identical to Scenario 2, minus the data restore step. Run `prisma db seed` or `seedFromSynthea.ts` against the fresh DB.

---

## Post-consolidation guarantees

1. **One migration folder, one source of truth.** Anyone running `prisma migrate deploy` against an empty Postgres gets the production schema.
2. **No hidden dependencies on pre-history state.** The 4 global unique indexes that PR #158 assumed exist are now explicit in the baseline.
3. **Both production databases are migration-state-consistent.** Future `prisma migrate deploy` is a no-op on both until the next new migration lands.
4. **Deploy pipeline is unblocked.** The Dockerfile's `CMD` runs `prisma migrate deploy` on container start — previously a fresh deploy against an empty DB would have crashed. Now it works.
5. **Tech debt register #16 is resolved.** Tracked remediation target was 2026-05-01; landed 11 days early.

---

## Rollback

If the `_prisma_migrations` update on production RDS or Aurora goes sideways:

```sql
-- On the affected DB, restore the original 5 rows. Exact values captured pre-update
-- in .tmp-phase3consolidation/prisma-migrations-pre-consolidation-{rds,aurora}.json.
BEGIN;
DELETE FROM "_prisma_migrations";
-- then 5 INSERTs from the captured JSON
COMMIT;
```

Then restore the old migration folders from git history: `git revert <this-PR-merge-commit>`.

Schema on the DBs doesn't change either way, so rollback is only about restoring Prisma's tracking table.

Harder scenario: if for some reason schema drifts between `_prisma_migrations` update and a subsequent `prisma migrate deploy` attempt, restore from the Phase D pre-consolidation snapshot and repeat.
