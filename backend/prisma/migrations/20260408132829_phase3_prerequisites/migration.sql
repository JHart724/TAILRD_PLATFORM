-- Phase 3 Schema Prerequisites
-- Patient merge fields
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mergedAt" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "isMerged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patients" ADD CONSTRAINT "patients_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User SSO fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "samlNameId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "samlSessionIndex" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ssoProvider" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSsoLogin" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Alert indexes
CREATE INDEX IF NOT EXISTS "alerts_hospitalId_moduleType_idx" ON "alerts"("hospitalId", "moduleType");
CREATE INDEX IF NOT EXISTS "alerts_hospitalId_severity_createdAt_idx" ON "alerts"("hospitalId", "severity", "createdAt");

-- CDS Hooks sessions
CREATE TABLE IF NOT EXISTS "cds_hooks_sessions" (
  "id" TEXT NOT NULL,
  "hookId" TEXT NOT NULL,
  "fhirContext" JSONB NOT NULL,
  "patientId" TEXT,
  "hospitalId" TEXT NOT NULL,
  "cards" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cds_hooks_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cds_hooks_sessions_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "cds_hooks_sessions_hospitalId_idx" ON "cds_hooks_sessions"("hospitalId");
CREATE INDEX IF NOT EXISTS "cds_hooks_sessions_patientId_idx" ON "cds_hooks_sessions"("patientId");
CREATE INDEX IF NOT EXISTS "cds_hooks_sessions_createdAt_idx" ON "cds_hooks_sessions"("createdAt");

-- BPCI-A Episodes
CREATE TABLE IF NOT EXISTS "bpci_episodes" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "episodeType" TEXT NOT NULL,
  "anchorAdmission" TIMESTAMP(3) NOT NULL,
  "episodeEnd" TIMESTAMP(3),
  "targetPrice" DOUBLE PRECISION,
  "actualSpend" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bpci_episodes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bpci_episodes_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bpci_episodes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "bpci_episodes_hospitalId_status_idx" ON "bpci_episodes"("hospitalId", "status");
CREATE INDEX IF NOT EXISTS "bpci_episodes_patientId_idx" ON "bpci_episodes"("patientId");

-- Drug Interaction Alerts
CREATE TABLE IF NOT EXISTS "drug_interaction_alerts" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "drug1RxNorm" TEXT NOT NULL,
  "drug1Name" TEXT NOT NULL,
  "drug2RxNorm" TEXT NOT NULL,
  "drug2Name" TEXT NOT NULL,
  "interactionType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_interaction_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drug_interaction_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "drug_interaction_alerts_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "drug_interaction_alerts_patientId_status_idx" ON "drug_interaction_alerts"("patientId", "status");
CREATE INDEX IF NOT EXISTS "drug_interaction_alerts_hospitalId_severity_idx" ON "drug_interaction_alerts"("hospitalId", "severity");
