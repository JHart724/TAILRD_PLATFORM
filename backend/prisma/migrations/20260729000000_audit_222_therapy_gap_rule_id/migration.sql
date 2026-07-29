-- Migration: audit_222_therapy_gap_rule_id
--
-- AUDIT-222: stable per-RULE identity on therapy_gaps.
--
-- The runners matched stored-vs-detected gaps on gapType::module, a key COARSER than a rule: 357 of 368
-- rules (97.0%) share a bucket with a sibling. Measured on demo-synthea-threaded (65,251 rows): 31,108
-- rows (47.7%) were unreachable by the refresh path, sibling statuses overwrote each other, and genuinely
-- firing sibling gaps were never created. ruleId gives the write path a real identity to match on.
--
-- Nullable column add + one index. NO data is written by this migration: every existing row keeps
-- ruleId = NULL until the separately operator-gated AUDIT-222 backfill runs (backfillGapRuleIds.ts,
-- dry-run by default). A NULL ruleId never matches a detected gap, so the pre-backfill runtime behaviour
-- is: existing rows are left alone and detected gaps create fresh, correctly-identified rows.
--
-- Plain in-transaction DDL, no CONCURRENTLY (AUDIT-024 lesson). Adding a nullable column with no default
-- is a metadata-only operation in PostgreSQL - no table rewrite, no blocking scan.

ALTER TABLE "therapy_gaps" ADD COLUMN "ruleId" TEXT;

CREATE INDEX "therapy_gaps_hospitalId_ruleId_idx" ON "therapy_gaps"("hospitalId", "ruleId");
