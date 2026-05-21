-- 5-BRC-06 BA-to-CE notification workflow (§164.410 primary BA obligation)
-- Q-5BRC-J sister bundle: 5-BRC-02 (4-factor risk), 5-BRC-03 (BA-cooperation), 5-BRC-05 (HHS), 5-BRC-07 (law-enforcement delay), 5-BRC-08 (burden-of-proof retention)

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
-- TAILRD production runs PG 15 (Aurora Serverless v2); this migration is safe.


ALTER TYPE "BreachStatus" ADD VALUE 'CE_NOTIFICATION_QUEUED';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_NOTIFICATION_SENT';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_NOTIFICATION_DELIVERED';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_ACKNOWLEDGED';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_FOLLOWUP_REQUESTED';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_FOLLOWUP_RESPONDED';
ALTER TYPE "BreachStatus" ADD VALUE 'CE_CLOSED';

-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "coveredEntityId" TEXT;

-- AlterTable
ALTER TABLE "breach_incidents" ADD COLUMN     "baActsAsAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "baActsAsAgentRationale" TEXT,
ADD COLUMN     "burdenOfProofRetentionUntil" TIMESTAMP(3),
ADD COLUMN     "ceAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "ceFollowupRequestedAt" TIMESTAMP(3),
ADD COLUMN     "ceFollowupRespondedAt" TIMESTAMP(3),
ADD COLUMN     "ceNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "coveredEntityId" TEXT,
ADD COLUMN     "fourFactorRiskAssessment" JSONB,
ADD COLUMN     "fourFactorRiskCompletedAt" TIMESTAMP(3),
ADD COLUMN     "fourFactorRiskCompletedBy" TEXT,
ADD COLUMN     "lawEnforcementDelayActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lawEnforcementDelayRationale" TEXT,
ADD COLUMN     "lawEnforcementDelayUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "covered_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "tenantId" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "primaryContactAddress" TEXT,
    "escalationContactName" TEXT,
    "escalationContactEmail" TEXT,
    "escalationContactPhone" TEXT,
    "ceType" TEXT,
    "baaExecutedAt" TIMESTAMP(3),
    "baaExpiresAt" TIMESTAMP(3),
    "baaDocumentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "covered_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "covered_entities_tenantId_idx" ON "covered_entities"("tenantId");

-- CreateIndex
CREATE INDEX "covered_entities_ceType_idx" ON "covered_entities"("ceType");

-- CreateIndex
CREATE INDEX "covered_entities_baaExpiresAt_idx" ON "covered_entities"("baaExpiresAt");

-- CreateIndex
CREATE INDEX "breach_incidents_coveredEntityId_idx" ON "breach_incidents"("coveredEntityId");

-- CreateIndex
CREATE INDEX "breach_incidents_ceNotifiedAt_idx" ON "breach_incidents"("ceNotifiedAt");

-- CreateIndex
CREATE INDEX "breach_incidents_lawEnforcementDelayActive_idx" ON "breach_incidents"("lawEnforcementDelayActive");

-- AddForeignKey
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_coveredEntityId_fkey" FOREIGN KEY ("coveredEntityId") REFERENCES "covered_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covered_entities" ADD CONSTRAINT "covered_entities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_incidents" ADD CONSTRAINT "breach_incidents_coveredEntityId_fkey" FOREIGN KEY ("coveredEntityId") REFERENCES "covered_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
