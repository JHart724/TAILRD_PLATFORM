-- Group B Clinical Intelligence Migration
-- Expands enums for coronary, valvular, and peripheral modules
-- Adds new models: RiskScoreAssessment, InterventionTracking, ContraindicationAssessment
-- Generalizes DrugTitration for cross-module use

-- ============================================
-- Expand existing enums with Group B values
-- ============================================

-- PhenotypeType: Add coronary phenotypes
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CMD';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'SCAD';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CORONARY_ECTASIA';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'VASOSPASTIC_ANGINA';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'IN_STENT_RESTENOSIS';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'THROMBOTIC_CAD';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CALCIFIC_CAD';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'LEFT_MAIN_DISEASE';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'MYOCARDIAL_BRIDGING';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CORONARY_FISTULA';

-- PhenotypeType: Add valvular phenotypes
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'LFLG_AORTIC_STENOSIS';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'BPV_DEGENERATION';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'INFECTIVE_ENDOCARDITIS';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'RHEUMATIC_VALVE';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'MARFAN_VALVE';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'PARAVALVULAR_LEAK';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'RADIATION_VALVE';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CARCINOID_VALVE';

-- PhenotypeType: Add peripheral phenotypes
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'CLTI';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'DIABETIC_FOOT';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'BLUE_TOE_SYNDROME';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'POPLITEAL_ENTRAPMENT';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'FMD';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'BUERGER_DISEASE';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'ADVENTITIAL_CYSTIC';
ALTER TYPE "PhenotypeType" ADD VALUE IF NOT EXISTS 'MALS';

-- DeviceType: Add coronary devices
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'DES';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'BMS';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'IVUS_CATHETER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'OCT_CATHETER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'FFR_WIRE';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'IVL_CATHETER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'IMPELLA';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'ROTABLATOR';

-- DeviceType: Add valvular devices
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'TAVR_VALVE';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'SAVR_PROSTHESIS';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'TEER_DEVICE';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'TMVR_DEVICE';

-- DeviceType: Add peripheral devices
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'PERIPHERAL_STENT';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'DCB';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'ATHERECTOMY_DEVICE';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'BYPASS_GRAFT';

-- ============================================
-- Create new enums
-- ============================================

CREATE TYPE "DrugClassType" AS ENUM (
  'ANTIPLATELET',
  'P2Y12_INHIBITOR',
  'ANTICOAGULANT_CORONARY',
  'STATIN',
  'NITRATE',
  'CCB_ANTIANGINAL',
  'RANOLAZINE',
  'ANTICOAGULANT_VALVE',
  'ANTIHYPERTENSIVE_VALVE',
  'DIURETIC_VALVE',
  'CILOSTAZOL',
  'ANTIPLATELET_PAD',
  'STATIN_PAD',
  'PENTOXIFYLLINE',
  'PROSTANOID',
  'ACE_ARB_ARNI_GENERAL',
  'BETA_BLOCKER_GENERAL',
  'MRA_GENERAL',
  'SGLT2I_GENERAL'
);

CREATE TYPE "RiskScoreType" AS ENUM (
  'MAGGIC',
  'SHFM',
  'CHA2DS2_VASC',
  'HAS_BLED',
  'STS_SCORE',
  'EUROSCORE_II',
  'GRACE',
  'SYNTAX',
  'TIMI',
  'HEART_SCORE',
  'DUKE_JEOPARDY',
  'ABI_ASSESSMENT',
  'FONTAINE',
  'RUTHERFORD',
  'WIFI',
  'STS_PROM',
  'EUROSCORE_LOG'
);

CREATE TYPE "InterventionCategory" AS ENUM (
  'PERCUTANEOUS',
  'SURGICAL',
  'DIAGNOSTIC',
  'IMAGING',
  'THERAPEUTIC',
  'PHARMACOLOGIC',
  'DEVICE_IMPLANT',
  'MONITORING'
);

CREATE TYPE "InterventionStatus" AS ENUM (
  'ELIGIBLE',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DEFERRED',
  'CONTRAINDICATED'
);

CREATE TYPE "ContraindicationLevel" AS ENUM (
  'SAFE',
  'MONITOR',
  'CAUTION',
  'RELATIVE',
  'ABSOLUTE'
);

-- ============================================
-- Modify DrugTitration for cross-module support
-- ============================================

-- Make drugClass optional (was required for HF-only)
ALTER TABLE "drug_titrations" ALTER COLUMN "drugClass" DROP NOT NULL;

-- Add generalDrugClass for non-HF modules
ALTER TABLE "drug_titrations" ADD COLUMN "generalDrugClass" "DrugClassType";

-- Add module column with default for backward compatibility
ALTER TABLE "drug_titrations" ADD COLUMN "module" "ModuleType" NOT NULL DEFAULT 'HEART_FAILURE';

-- ============================================
-- Create new tables
-- ============================================

-- Risk Score Assessments
CREATE TABLE "risk_score_assessments" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "scoreType" "RiskScoreType" NOT NULL,
  "module" "ModuleType" NOT NULL,
  "totalScore" DOUBLE PRECISION NOT NULL,
  "riskCategory" "RiskCategory" NOT NULL,
  "components" JSONB NOT NULL,
  "inputData" JSONB NOT NULL,
  "interpretation" TEXT NOT NULL,
  "recommendation" TEXT,
  "mortality" DOUBLE PRECISION,
  "eventRisk" DOUBLE PRECISION,
  "calculatedBy" TEXT,
  "clinicalContext" TEXT,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "risk_score_assessments_pkey" PRIMARY KEY ("id")
);

-- Intervention Tracking
CREATE TABLE "intervention_tracking" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "interventionName" TEXT NOT NULL,
  "category" "InterventionCategory" NOT NULL,
  "module" "ModuleType" NOT NULL,
  "status" "InterventionStatus" NOT NULL,
  "cptCode" TEXT,
  "icd10Code" TEXT,
  "reimbursementCode" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "performedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "performingProvider" TEXT,
  "referringProvider" TEXT,
  "facility" TEXT,
  "indication" TEXT,
  "technique" TEXT,
  "findings" JSONB,
  "complications" JSONB,
  "outcome" TEXT,
  "followUpPlan" TEXT,
  "nextAssessment" TIMESTAMP(3),
  "estimatedReimbursement" DOUBLE PRECISION,
  "actualReimbursement" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "intervention_tracking_pkey" PRIMARY KEY ("id")
);

-- Contraindication Assessments
CREATE TABLE "contraindication_assessments" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "module" "ModuleType" NOT NULL,
  "therapyName" TEXT NOT NULL,
  "therapyType" TEXT NOT NULL,
  "level" "ContraindicationLevel" NOT NULL,
  "reasons" JSONB NOT NULL,
  "alternatives" JSONB,
  "monitoring" JSONB,
  "dosing" JSONB,
  "assessedBy" TEXT,
  "overriddenBy" TEXT,
  "overrideReason" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "supersededBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contraindication_assessments_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Foreign keys
-- ============================================

ALTER TABLE "risk_score_assessments" ADD CONSTRAINT "risk_score_assessments_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "risk_score_assessments" ADD CONSTRAINT "risk_score_assessments_hospitalId_fkey"
  FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intervention_tracking" ADD CONSTRAINT "intervention_tracking_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intervention_tracking" ADD CONSTRAINT "intervention_tracking_hospitalId_fkey"
  FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contraindication_assessments" ADD CONSTRAINT "contraindication_assessments_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contraindication_assessments" ADD CONSTRAINT "contraindication_assessments_hospitalId_fkey"
  FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX "risk_score_assessments_patientId_scoreType_idx" ON "risk_score_assessments"("patientId", "scoreType");
CREATE INDEX "risk_score_assessments_scoreType_module_idx" ON "risk_score_assessments"("scoreType", "module");
CREATE INDEX "risk_score_assessments_hospitalId_calculatedAt_idx" ON "risk_score_assessments"("hospitalId", "calculatedAt");

CREATE INDEX "intervention_tracking_patientId_module_idx" ON "intervention_tracking"("patientId", "module");
CREATE INDEX "intervention_tracking_module_category_idx" ON "intervention_tracking"("module", "category");
CREATE INDEX "intervention_tracking_hospitalId_performedAt_idx" ON "intervention_tracking"("hospitalId", "performedAt");
CREATE INDEX "intervention_tracking_status_module_idx" ON "intervention_tracking"("status", "module");

CREATE INDEX "contraindication_assessments_patientId_module_idx" ON "contraindication_assessments"("patientId", "module");
CREATE INDEX "contraindication_assessments_therapyName_level_idx" ON "contraindication_assessments"("therapyName", "level");
CREATE INDEX "contraindication_assessments_hospitalId_assessedAt_idx" ON "contraindication_assessments"("hospitalId", "assessedAt");
