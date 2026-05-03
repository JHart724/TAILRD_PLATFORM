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
-- CONCURRENTLY: avoids any write-blocking during index build. BSW pilot
-- is live; this is the production-safe default for additive index migrations
-- going forward. Postgres rejects CONCURRENTLY inside a transaction block,
-- so this migration intentionally contains only top-level CREATE INDEX
-- statements with no BEGIN/COMMIT wrapper.

CREATE UNIQUE INDEX CONCURRENTLY "patients_id_hospitalId_key"
  ON "patients"("id", "hospitalId");

CREATE UNIQUE INDEX CONCURRENTLY "therapy_gaps_id_hospitalId_key"
  ON "therapy_gaps"("id", "hospitalId");
