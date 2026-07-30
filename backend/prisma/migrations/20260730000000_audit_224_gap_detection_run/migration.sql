-- Migration: audit_224_gap_detection_run
--
-- AUDIT-224 (folded into the AUDIT-223 PR-B per operator ruling): a durable record per gap-detection run.
-- Resolve semantics make runs consequential - a run that closes clinical rows must leave evidence of what it
-- did. Before this, the 2026-07-29 re-detection's forensics (1,292 created / 61,815 updated) depended
-- entirely on ad-hoc identifiedAt-window queries plus an externally-saved pre-run snapshot.
--
-- New table only. No data is written by this migration; no existing row is touched.

CREATE TABLE "gap_detection_runs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "buildSha" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "patientsEvaluated" INTEGER NOT NULL DEFAULT 0,
    "gapsCreated" INTEGER NOT NULL DEFAULT 0,
    "gapsUpdated" INTEGER NOT NULL DEFAULT 0,
    "gapsResolved" INTEGER NOT NULL DEFAULT 0,
    "completenessFraction" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    CONSTRAINT "gap_detection_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gap_detection_runs_hospitalId_startedAt_idx" ON "gap_detection_runs"("hospitalId", "startedAt");

ALTER TABLE "gap_detection_runs" ADD CONSTRAINT "gap_detection_runs_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
