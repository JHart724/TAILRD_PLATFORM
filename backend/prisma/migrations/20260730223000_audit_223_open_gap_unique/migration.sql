-- AUDIT-223: at most one OPEN row per (patientId, ruleId).
--
-- This is the DB-level backstop for the invariant the runners already enforce in code (the match map is
-- open-rows-only, so a second open row for the same rule is unreachable by the refresh path and silently
-- over-reports the clinician-facing open-gap count).
--
-- WHY PARTIAL, NOT TOTAL. A TOTAL unique on (patientId, ruleId) would be WRONG. A resolved row KEEPS its
-- ruleId, so a genuine new episode - therapy lapsed, a value drifted back out of range - must be able to
-- create a new open row beside the resolved one. The predicate scopes uniqueness to the open set only.
-- `ruleId IS NOT NULL` is belt-and-braces: Postgres already treats NULLs as distinct in a unique index, but
-- stating it keeps the index small and the intent explicit (AUDIT-222 orphan rows carry NULL by design).
--
-- SEQUENCING (DRIFT-58). This migration is deliberately NOT co-shipped with the dedupe runner. The container
-- CMD is `prisma migrate deploy && node dist/server.js`, so a migration that raises 23505 does not merely
-- fail the migration - it blocks server start and wedges the ROLLOUT. Ordering this load-bearing is enforced
-- by PR sequencing, never by a comment. This PR is the follow-up, authored only after the dedupe executed.
--
-- PRE-FLIGHT EVIDENCE (production `demo-synthea-threaded`, task-def :406, snapshot
-- audit-223-dedupe-run-20260730-221536):
--   dry-run   2026-07-30T22:2xZ  scanned 67874 == expectedTotal, duplicatePairs 185, targeted 185, resolved 0
--   execute   2026-07-30T22:2xZ  scanned 67874 == expectedTotal, duplicatePairs 185, targeted 185, resolved 185
--   post      OPEN duplicate (patientId, ruleId) pairs == 0; open attributed 63745 -> 63560 (exactly -185);
--             total rows 67874 unchanged (UPDATE, never DELETE); other tenants unchanged
--             (demo-synthea-proof 57549, hosp-001 211); GAP_SHADOW_DEDUPE audit rows 0 -> 1
--   idempotent re-run  scanned 67874 full walk, duplicatePairs 0, targeted 0, resolved 0
-- So the table satisfies this constraint BEFORE the index is created. Verified, not assumed.
--
-- Not CONCURRENTLY: Prisma wraps each migration in a transaction and CREATE INDEX CONCURRENTLY cannot run
-- inside one. The table is ~68k rows; the brief lock is acceptable at this size.

CREATE UNIQUE INDEX "therapy_gaps_patient_rule_open_uniq"
    ON "therapy_gaps" ("patientId", "ruleId")
    WHERE "resolvedAt" IS NULL AND "ruleId" IS NOT NULL;
