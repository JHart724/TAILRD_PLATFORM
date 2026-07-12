-- Migration: audit_148_slice2_registry_cases
--
-- AUDIT-148 Slice 2: the RegistryCase model (a curated NCDR/STS/GWTG-style registry submission with a
-- DRAFT -> SUBMITTED -> APPROVED workflow). hospitalId-scoped (tenant isolation), patient + hospital FKs
-- onDelete RESTRICT (so a case must be wiped before its patient/hospital, mirroring TrialMatch - the
-- seed wipe order is updated accordingly). fields is JSONB (flexible registry payload). Fresh table, no
-- existing data; plain in-transaction CREATE INDEX, not a concurrent build (AUDIT-024 lesson).

-- CreateEnum
CREATE TYPE "RegistryCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "registry_cases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "registryType" TEXT NOT NULL,
    "status" "RegistryCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "fields" JSONB NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registry_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registry_cases_hospitalId_registryType_status_idx" ON "registry_cases"("hospitalId", "registryType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registry_cases_patientId_registryType_hospitalId_key" ON "registry_cases"("patientId", "registryType", "hospitalId");

-- AddForeignKey
ALTER TABLE "registry_cases" ADD CONSTRAINT "registry_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_cases" ADD CONSTRAINT "registry_cases_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
