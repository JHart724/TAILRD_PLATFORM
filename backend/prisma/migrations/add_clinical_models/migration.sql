-- Clinical Decision Support Migration
-- Adds new models for CQL rules, phenotypes, therapy gaps, cross-referrals, drug titration, quality measures, and device eligibility

-- Create new enums for clinical models
CREATE TYPE "TherapyGapType" AS ENUM (
  'MEDICATION_MISSING',
  'MEDICATION_UNDERDOSED',
  'MEDICATION_CONTRAINDICATED',
  'DEVICE_ELIGIBLE',
  'DEVICE_UPGRADE_DUE',
  'MONITORING_OVERDUE',
  'FOLLOWUP_OVERDUE'
);

CREATE TYPE "PhenotypeType" AS ENUM (
  'CARDIAC_AMYLOIDOSIS',
  'CARDIAC_SARCOIDOSIS',
  'HCM',
  'ARVC',
  'LVNC',
  'FABRY_DISEASE',
  'IRON_DEFICIENCY_HF',
  'PERIPARTUM_CARDIOMYOPATHY',
  'CHEMOTHERAPY_CARDIOMYOPATHY',
  'CHAGAS_CARDIOMYOPATHY',
  'TACHYCARDIA_CARDIOMYOPATHY',
  'AUTOIMMUNE_MYOCARDITIS'
);

CREATE TYPE "PhenotypeStatus" AS ENUM (
  'DETECTED',
  'SUSPECTED',
  'RULED_OUT',
  'CONFIRMED',
  'MONITORING'
);

CREATE TYPE "ReferralUrgency" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE "ReferralStatus" AS ENUM (
  'TRIGGERED',
  'REVIEWED',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'EXPIRED'
);

CREATE TYPE "HFPillarType" AS ENUM (
  'ACE_ARB_ARNI',
  'BETA_BLOCKER',
  'MRA',
  'SGLT2_INHIBITOR'
);

CREATE TYPE "DeviceType" AS ENUM (
  'ICD',
  'CRT_P',
  'CRT_D',
  'PACEMAKER',
  'WATCHMAN',
  'MITRACLIP',
  'LVAD',
  'HEART_MATE'
);

-- Create CQL Rules table
CREATE TABLE "cql_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "module" "ModuleType" NOT NULL,
  "category" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastExecuted" TIMESTAMP(3),
  "executionCount" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "authoredBy" TEXT,
  "evidenceLevel" TEXT,
  "guidelineSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cql_rules_pkey" PRIMARY KEY ("id")
);

-- Create CQL Results table
CREATE TABLE "cql_results" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "recommendation" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cql_results_pkey" PRIMARY KEY ("id")
);

-- Create Therapy Gaps table
CREATE TABLE "therapy_gaps" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "gapType" "TherapyGapType" NOT NULL,
  "module" "ModuleType" NOT NULL,
  "medication" TEXT,
  "device" TEXT,
  "currentStatus" TEXT NOT NULL,
  "targetStatus" TEXT NOT NULL,
  "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "barriers" JSONB,
  "recommendations" JSONB,

  CONSTRAINT "therapy_gaps_pkey" PRIMARY KEY ("id")
);

-- Create Phenotypes table
CREATE TABLE "phenotypes" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "phenotypeName" "PhenotypeType" NOT NULL,
  "status" "PhenotypeStatus" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "evidence" JSONB NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "confirmedBy" TEXT,
  "riskScore" DOUBLE PRECISION,
  "riskFactors" JSONB,

  CONSTRAINT "phenotypes_pkey" PRIMARY KEY ("id")
);

-- Create Cross Referrals table
CREATE TABLE "cross_referrals" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "fromModule" "ModuleType" NOT NULL,
  "toModule" "ModuleType" NOT NULL,
  "reason" TEXT NOT NULL,
  "urgency" "ReferralUrgency" NOT NULL,
  "status" "ReferralStatus" NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "acceptedBy" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "triggerData" JSONB,
  "notes" TEXT,

  CONSTRAINT "cross_referrals_pkey" PRIMARY KEY ("id")
);

-- Create Drug Titrations table
CREATE TABLE "drug_titrations" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "drugClass" "HFPillarType" NOT NULL,
  "drugName" TEXT NOT NULL,
  "currentDose" DOUBLE PRECISION NOT NULL,
  "currentDoseUnit" TEXT NOT NULL,
  "targetDose" DOUBLE PRECISION NOT NULL,
  "targetDoseUnit" TEXT NOT NULL,
  "nextStepDate" TIMESTAMP(3),
  "nextStepDose" DOUBLE PRECISION,
  "titrationStep" INTEGER NOT NULL DEFAULT 1,
  "barriers" JSONB,
  "monitoringPlan" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "pausedReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "drug_titrations_pkey" PRIMARY KEY ("id")
);

-- Create Quality Measures table
CREATE TABLE "quality_measures" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "measureCode" TEXT NOT NULL,
  "measureName" TEXT NOT NULL,
  "measureDescription" TEXT,
  "numerator" INTEGER NOT NULL,
  "denominator" INTEGER NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "reportingPeriod" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "nationalBenchmark" DOUBLE PRECISION,
  "target" DOUBLE PRECISION,
  "previousRate" DOUBLE PRECISION,
  "exclusions" INTEGER,
  "exclusionReasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quality_measures_pkey" PRIMARY KEY ("id")
);

-- Create Device Eligibility table
CREATE TABLE "device_eligibility" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "deviceType" "DeviceType" NOT NULL,
  "deviceModel" TEXT,
  "eligible" BOOLEAN NOT NULL,
  "eligibilityScore" DOUBLE PRECISION,
  "criteria" JSONB NOT NULL,
  "barriers" JSONB,
  "indication" TEXT,
  "contraindications" JSONB,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "implanted" BOOLEAN NOT NULL DEFAULT false,
  "implantedAt" TIMESTAMP(3),
  "declinedReason" TEXT,

  CONSTRAINT "device_eligibility_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "cql_rules_name_version_key" ON "cql_rules"("name", "version");
CREATE UNIQUE INDEX "quality_measures_hospitalId_measureCode_reportingPeriod_key" ON "quality_measures"("hospitalId", "measureCode", "reportingPeriod");

-- Create indexes for performance
CREATE INDEX "cql_results_patientId_createdAt_idx" ON "cql_results"("patientId", "createdAt");
CREATE INDEX "cql_results_ruleId_createdAt_idx" ON "cql_results"("ruleId", "createdAt");
CREATE INDEX "therapy_gaps_patientId_identifiedAt_idx" ON "therapy_gaps"("patientId", "identifiedAt");
CREATE INDEX "therapy_gaps_module_gapType_idx" ON "therapy_gaps"("module", "gapType");
CREATE INDEX "phenotypes_patientId_phenotypeName_idx" ON "phenotypes"("patientId", "phenotypeName");
CREATE INDEX "phenotypes_phenotypeName_status_idx" ON "phenotypes"("phenotypeName", "status");
CREATE INDEX "cross_referrals_patientId_status_idx" ON "cross_referrals"("patientId", "status");
CREATE INDEX "cross_referrals_fromModule_toModule_idx" ON "cross_referrals"("fromModule", "toModule");
CREATE INDEX "drug_titrations_patientId_drugClass_idx" ON "drug_titrations"("patientId", "drugClass");
CREATE INDEX "drug_titrations_nextStepDate_idx" ON "drug_titrations"("nextStepDate");
CREATE INDEX "quality_measures_measureCode_periodStart_idx" ON "quality_measures"("measureCode", "periodStart");
CREATE INDEX "device_eligibility_patientId_deviceType_idx" ON "device_eligibility"("patientId", "deviceType");
CREATE INDEX "device_eligibility_evaluatedAt_idx" ON "device_eligibility"("evaluatedAt");

-- Add foreign key constraints
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cql_results" ADD CONSTRAINT "cql_results_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "cql_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "therapy_gaps" ADD CONSTRAINT "therapy_gaps_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "therapy_gaps" ADD CONSTRAINT "therapy_gaps_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "phenotypes" ADD CONSTRAINT "phenotypes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phenotypes" ADD CONSTRAINT "phenotypes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cross_referrals" ADD CONSTRAINT "cross_referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cross_referrals" ADD CONSTRAINT "cross_referrals_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drug_titrations" ADD CONSTRAINT "drug_titrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drug_titrations" ADD CONSTRAINT "drug_titrations_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quality_measures" ADD CONSTRAINT "quality_measures_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_eligibility" ADD CONSTRAINT "device_eligibility_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_eligibility" ADD CONSTRAINT "device_eligibility_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;