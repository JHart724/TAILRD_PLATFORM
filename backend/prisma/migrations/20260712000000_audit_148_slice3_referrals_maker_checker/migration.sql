-- Migration: audit_148_slice3_referrals_maker_checker
--
-- AUDIT-148 Slice 3: the first WRITE of a clinical decision in the trials module.
--   (1) TrialReferral - a durable human clinical decision (a coordinator referred a patient to a trial),
--       a SEPARATE EVENT model (not a field on the re-evaluated TrialMatch); hospitalId-scoped; patient +
--       hospital + trial FKs onDelete RESTRICT (wiped before patient, added to wipePreReseed). NOT gated on
--       matchStatus; matchStatusAtReferral records the honest verdict at referral time for the audit trail.
--   (2) RegistryCase.createdBy / updatedBy - maker-checker fields. Slice 3 enforces ROLE-level separation;
--       PERSON-level (approver != createdBy) can be enabled later with no further migration.
-- Fresh table + nullable column adds, no data; plain in-transaction DDL (no CONCURRENTLY - AUDIT-024 lesson).
-- TrialMatchStatus enum already exists (Slice 1); reused for matchStatusAtReferral.

-- CreateEnum
CREATE TYPE "TrialReferralStatus" AS ENUM ('PENDING', 'CONTACTED', 'ENROLLED', 'DECLINED');

-- AlterTable (RegistryCase maker-checker fields)
ALTER TABLE "registry_cases" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "registry_cases" ADD COLUMN "updatedBy" TEXT;

-- CreateTable
CREATE TABLE "trial_referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "referredBy" TEXT NOT NULL,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TrialReferralStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "matchStatusAtReferral" "TrialMatchStatus" NOT NULL,

    CONSTRAINT "trial_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trial_referrals_hospitalId_trialId_status_idx" ON "trial_referrals"("hospitalId", "trialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trial_referrals_patientId_trialId_hospitalId_key" ON "trial_referrals"("patientId", "trialId", "hospitalId");

-- AddForeignKey
ALTER TABLE "trial_referrals" ADD CONSTRAINT "trial_referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_referrals" ADD CONSTRAINT "trial_referrals_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_referrals" ADD CONSTRAINT "trial_referrals_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "clinical_trials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
