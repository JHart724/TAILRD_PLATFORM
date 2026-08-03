-- TrialMatch identity + persistence design: constraint correction, provenance, supersede axis.
--
-- WHAT THIS DOES
--   1. DROPS the TOTAL unique (patientId, trialId, hospitalId) on trial_matches.
--   2. ADDS the PARTIAL unique on the CURRENT row only (WHERE "supersededAt" IS NULL).
--   3. ADDS provenance (buildSha, criteriaVersion) and lifecycle (lastConfirmedAt, supersededAt,
--      supersededBy, supersessionReason) columns.
--   4. CREATES trial_match_runs, the AUDIT-224-equivalent durable run record.
--
-- WHY PARTIAL, NOT TOTAL. A TOTAL unique permits exactly one row per (patient, trial, tenant)
-- FOREVER, which forces overwrite-in-place: each re-evaluation destroys the prior verdict, and a
-- clinician who saw ELIGIBLE yesterday and INDETERMINATE today cannot be told why. This is the same
-- defect AUDIT-223 corrected on therapy_gaps. The partial unique scopes uniqueness to the CURRENT
-- verdict, so superseded history coexists beside it.
--
-- DRIFT-58 SAFETY: SAFE BY CONSTRUCTION, and this is the reason to do it NOW.
-- DRIFT-58 exists because a partial-unique migration was once shipped against a table holding 185
-- duplicate open pairs: it would have raised 23505, and because the container CMD is
-- `prisma migrate deploy && node dist/server.js`, a failed migration does not merely fail the
-- migration - it blocks server start and WEDGES THE ROLLOUT. That hazard cannot arise here:
--
--   trial_matches holds ZERO rows. No writer exists anywhere in backend/src (verified by grep for
--   trialMatch.(create|upsert|update|createMany|deleteMany) - no hits). Evaluation is purely
--   on-demand via GET /trials/:trialId/eligible-patients, which computes and returns without storing.
--
-- A unique index over an empty table cannot raise a uniqueness violation. There is no data to
-- deduplicate, no ordering to enforce between a runner and a constraint, and no snapshot needed.
-- The zero-row precondition is re-verified live immediately before merge (the AUDIT-223 pre-flight
-- discipline: verified, not assumed) and the result is recorded in the PR.
--
-- This migration MUST land BEFORE any writer exists. Deferred past the first bulk write, the same
-- change becomes a dedupe-then-constrain sequence with a snapshot and a gated execute - the entire
-- AUDIT-223 arc re-run for no reason.
--
-- Not CONCURRENTLY: Prisma wraps each migration in a transaction and CREATE INDEX CONCURRENTLY cannot
-- run inside one. The table is empty; the lock is instantaneous.

-- 1 + 2: constraint swap.
DROP INDEX IF EXISTS "trial_matches_patientId_trialId_hospitalId_key";

-- 3: provenance + lifecycle columns. All nullable/defaulted, so this rewrites no rows.
ALTER TABLE "trial_matches"
    ADD COLUMN "buildSha"           TEXT,
    ADD COLUMN "criteriaVersion"    TEXT,
    ADD COLUMN "lastConfirmedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "supersededAt"       TIMESTAMP(3),
    ADD COLUMN "supersededBy"       TEXT,
    ADD COLUMN "supersessionReason" TEXT;

CREATE UNIQUE INDEX "trial_matches_patient_trial_current_uniq"
    ON "trial_matches" ("patientId", "trialId", "hospitalId")
    WHERE "supersededAt" IS NULL;

CREATE INDEX "trial_matches_hospitalId_trialId_supersededAt_idx"
    ON "trial_matches" ("hospitalId", "trialId", "supersededAt");

-- 4: the durable per-run record (AUDIT-224 equivalent).
CREATE TABLE "trial_match_runs" (
    "id"                   TEXT NOT NULL,
    "hospitalId"           TEXT NOT NULL,
    "buildSha"             TEXT NOT NULL,
    "startedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"           TIMESTAMP(3),
    "trialsEvaluated"      INTEGER NOT NULL DEFAULT 0,
    "patientsEvaluated"    INTEGER NOT NULL DEFAULT 0,
    "matchesCreated"       INTEGER NOT NULL DEFAULT 0,
    "matchesSuperseded"    INTEGER NOT NULL DEFAULT 0,
    "matchesConfirmed"     INTEGER NOT NULL DEFAULT 0,
    "completenessFraction" DOUBLE PRECISION,
    "outcome"              TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes"                TEXT,

    CONSTRAINT "trial_match_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trial_match_runs_hospitalId_startedAt_idx"
    ON "trial_match_runs" ("hospitalId", "startedAt");

ALTER TABLE "trial_match_runs"
    ADD CONSTRAINT "trial_match_runs_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
