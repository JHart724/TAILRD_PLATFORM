-- CreateEnum
CREATE TYPE "TrialMatchStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'INDETERMINATE');

-- CreateEnum
CREATE TYPE "TrialProvenance" AS ENUM ('CURATED', 'CTGOV_LIVE');

-- CreateTable
CREATE TABLE "clinical_trials" (
    "id" TEXT NOT NULL,
    "nctId" TEXT,
    "name" TEXT NOT NULL,
    "module" "ModuleType",
    "phase" TEXT,
    "status" TEXT,
    "provenance" "TrialProvenance" NOT NULL DEFAULT 'CURATED',
    "criteria" JSONB NOT NULL,
    "enrollmentTarget" INTEGER,
    "currentEnrollment" INTEGER,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_matches" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "status" "TrialMatchStatus" NOT NULL,
    "criteriaResults" JSONB NOT NULL,
    "indeterminateSignals" TEXT[],
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedBy" TEXT,

    CONSTRAINT "trial_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_trials_module_idx" ON "clinical_trials"("module");

-- CreateIndex
CREATE INDEX "clinical_trials_hospitalId_idx" ON "clinical_trials"("hospitalId");

-- CreateIndex
CREATE INDEX "trial_matches_hospitalId_trialId_status_idx" ON "trial_matches"("hospitalId", "trialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trial_matches_patientId_trialId_hospitalId_key" ON "trial_matches"("patientId", "trialId", "hospitalId");

-- AddForeignKey
ALTER TABLE "clinical_trials" ADD CONSTRAINT "clinical_trials_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_matches" ADD CONSTRAINT "trial_matches_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_matches" ADD CONSTRAINT "trial_matches_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_matches" ADD CONSTRAINT "trial_matches_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "clinical_trials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

