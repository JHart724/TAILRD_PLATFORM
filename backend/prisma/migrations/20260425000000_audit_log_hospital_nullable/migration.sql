-- AuditLog.hospitalId becomes nullable.
--
-- Pre-2026-04-25 the column was NOT NULL with FK → hospitals(id). The
-- writeAuditLog middleware wrote the literal string 'unknown' for any
-- unauthenticated event (failed login on non-existent email, anonymous
-- webhook traffic, etc.), which violated the FK and caused every such
-- audit insert to fail silently. Failed-login forensics were therefore
-- never persisted to the database — only to the file-based winston log.
--
-- This migration:
--   1. Drops the NOT NULL constraint on audit_logs.hospitalId.
--   2. Updates the FK ON DELETE behavior to remain RESTRICT (no change),
--      now compatible with NULL values per Postgres semantics.
--   3. Backfills existing 'unknown' rows to NULL — there should be zero
--      such rows since the FK rejected those inserts, but the UPDATE is
--      a no-op safety net if any were grandfathered in.
--
-- Companion code change: backend/src/middleware/auditLogger.ts now writes
-- hospitalId: null instead of 'unknown' for anonymous events.

ALTER TABLE "audit_logs" ALTER COLUMN "hospitalId" DROP NOT NULL;

-- Defensive cleanup: any historical 'unknown' string rows (expected: 0).
UPDATE "audit_logs" SET "hospitalId" = NULL WHERE "hospitalId" = 'unknown';
