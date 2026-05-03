-- Migration: audit_011_tenant_scoped_unique_keys
--
-- Adds composite unique indexes (id, hospitalId) on Patient and TherapyGap
-- to enable Prisma's id_hospitalId composite key in update.where for
-- AUDIT-011 Layer 3 readiness (defense-in-depth tenant isolation).
-- See docs/audit/AUDIT_011_DESIGN.md §11 for the broader context.
--
-- The id column is already the primary key (unique on its own), so this
-- composite index is technically redundant for uniqueness — but Prisma
-- requires the @@unique declaration to expose the id_hospitalId composite
-- in the generated WhereUniqueInput type, which is what update.where needs.
--
-- HISTORICAL NOTE: PR #220's first deploy attempt used CREATE UNIQUE INDEX
-- CONCURRENTLY here. Prisma 5.22's migrate runner wraps every migration in
-- a transaction; Postgres rejected with error 25001 ("CREATE INDEX
-- CONCURRENTLY cannot run inside a transaction block"). Production deploy
-- crashlooped on :144 until rollback to :143. See AUDIT-024 (register).
-- Removed CONCURRENTLY here; at pilot-stage row counts (Patient ~thousands,
-- TherapyGap moderate) the SHARE lock during index build is sub-second.
-- For future migrations on larger tables, use the multi-step deploy pattern
-- documented under AUDIT-024 remediation.

CREATE UNIQUE INDEX "patients_id_hospitalId_key"
  ON "patients"("id", "hospitalId");

CREATE UNIQUE INDEX "therapy_gaps_id_hospitalId_key"
  ON "therapy_gaps"("id", "hospitalId");
