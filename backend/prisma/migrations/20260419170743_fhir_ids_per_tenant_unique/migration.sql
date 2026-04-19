-- Migration: FHIR IDs uniqueness scoped per tenant (hospitalId, fhirXxxId)
--
-- Context: Previously encounters/observations/procedures/device_implants/allergy_intolerances
-- had a GLOBAL unique index on their fhir*Id column. That blocks ingesting the same source
-- FHIR bundle into multiple tenants, and silently makes createMany({ skipDuplicates: true })
-- skip every cross-tenant duplicate. See docs/SCALE_REQUIREMENTS.md and /investigate report
-- (Q3, Q5) in the 2026-04-17 investigation.
--
-- This migration:
--   1. Pre-dedups (hospitalId, fhirConditionId) and (hospitalId, fhirMedicationId) rows,
--      which previously had NO unique constraint so duplicates may exist within a tenant.
--      Keeps the MOST RECENT row per group (highest updatedAt, tiebreak by id).
--   2. Drops the 5 old global @unique indexes.
--   3. Creates 7 new @@unique([hospitalId, fhir*Id]) composite indexes.
--
-- Migration is transactional (Prisma wraps each migration in BEGIN/COMMIT). If any step
-- fails the whole thing rolls back.

-- ─── Step 1: dedup ─────────────────────────────────────────────────────────────
-- Only needed for conditions + medications where the composite unique is NET NEW.
-- Encounters/observations/procedures/devices/allergies had a GLOBAL unique so intra-
-- tenant duplicates cannot exist by construction.

DELETE FROM "conditions"
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "hospitalId", "fhirConditionId"
      ORDER BY "updatedAt" DESC, id DESC
    ) AS rn
    FROM "conditions"
    WHERE "fhirConditionId" IS NOT NULL
  ) t
  WHERE t.rn > 1
);

DELETE FROM "medications"
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "hospitalId", "fhirMedicationId"
      ORDER BY "updatedAt" DESC, id DESC
    ) AS rn
    FROM "medications"
    WHERE "fhirMedicationId" IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- ─── Step 2: drop old global unique indexes ────────────────────────────────────

DROP INDEX "encounters_fhirEncounterId_key";
DROP INDEX "observations_fhirObservationId_key";
DROP INDEX "procedures_fhirProcedureId_key";
DROP INDEX "device_implants_fhirDeviceId_key";
DROP INDEX "allergy_intolerances_fhirAllergyId_key";

-- ─── Step 3: create new per-tenant composite unique indexes ────────────────────

CREATE UNIQUE INDEX "encounters_hospitalId_fhirEncounterId_key"
  ON "encounters"("hospitalId", "fhirEncounterId");

CREATE UNIQUE INDEX "observations_hospitalId_fhirObservationId_key"
  ON "observations"("hospitalId", "fhirObservationId");

CREATE UNIQUE INDEX "medications_hospitalId_fhirMedicationId_key"
  ON "medications"("hospitalId", "fhirMedicationId");

CREATE UNIQUE INDEX "conditions_hospitalId_fhirConditionId_key"
  ON "conditions"("hospitalId", "fhirConditionId");

CREATE UNIQUE INDEX "procedures_hospitalId_fhirProcedureId_key"
  ON "procedures"("hospitalId", "fhirProcedureId");

CREATE UNIQUE INDEX "device_implants_hospitalId_fhirDeviceId_key"
  ON "device_implants"("hospitalId", "fhirDeviceId");

CREATE UNIQUE INDEX "allergy_intolerances_hospitalId_fhirAllergyId_key"
  ON "allergy_intolerances"("hospitalId", "fhirAllergyId");
