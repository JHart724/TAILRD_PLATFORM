-- Migration: audit_071_073_cds_hooks_tenant_isolation
--
-- AUDIT-071 (HIGH P1) + AUDIT-073 (MEDIUM P2) production-readiness gate items.
-- See docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md.
--
-- Adds:
--   1. HospitalEhrIssuer model — maps EHR JWT `iss` claim → hospitalId for
--      CDS Hooks tenant resolution. 1:N from Hospital. Globally unique
--      issuerUrl (one URL maps to exactly one hospital).
--   2. @@unique([hospitalId, fhirPatientId]) on Patient — closes the per-tenant
--      uniqueness gap exploited by AUDIT-071's cross-tenant lookup pattern.
--   3. @@unique([hospitalId, fhirOrderId]) on Order — sister AUDIT-073 finding.
--   4. @@unique([hospitalId, fhirCarePlanId]) + @@index([fhirCarePlanId]) on
--      CarePlan — sister AUDIT-073 finding (was missing both unique AND index).
--
-- AUDIT-024 awareness: no CONCURRENTLY keyword used. Pilot-stage row counts +
-- pre-DUA pre-data-flow state mean SHARE lock during index build is sub-second.
--
-- Pre-flight duplicate check confirmed (Phase A of AUDIT-071 mitigation, dev DB):
--   (hospitalId, fhirPatientId) duplicates: 0
--   (hospitalId, fhirOrderId) duplicates: 0
--   (hospitalId, fhirCarePlanId) duplicates: 0
--
-- Postgres NULL semantics: multi-column unique constraints permit multiple
-- rows where one of the columns is NULL. fhir*Id are all `String?`, so
-- existing rows with NULL FHIR identifiers remain valid post-migration.

-- AUDIT-071: HospitalEhrIssuer model
CREATE TABLE "hospital_ehr_issuers" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "issuerUrl" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hospital_ehr_issuers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hospital_ehr_issuers_issuerUrl_key" ON "hospital_ehr_issuers"("issuerUrl");
CREATE INDEX "hospital_ehr_issuers_hospitalId_isActive_idx" ON "hospital_ehr_issuers"("hospitalId", "isActive");

ALTER TABLE "hospital_ehr_issuers"
    ADD CONSTRAINT "hospital_ehr_issuers_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AUDIT-071: Patient.fhirPatientId per-tenant uniqueness
CREATE UNIQUE INDEX "patients_hospitalId_fhirPatientId_key"
    ON "patients"("hospitalId", "fhirPatientId");

-- AUDIT-073: Order.fhirOrderId per-tenant uniqueness
CREATE UNIQUE INDEX "orders_hospitalId_fhirOrderId_key"
    ON "orders"("hospitalId", "fhirOrderId");

-- AUDIT-073: CarePlan.fhirCarePlanId per-tenant uniqueness + missing index
CREATE UNIQUE INDEX "care_plans_hospitalId_fhirCarePlanId_key"
    ON "care_plans"("hospitalId", "fhirCarePlanId");
CREATE INDEX "care_plans_fhirCarePlanId_idx"
    ON "care_plans"("fhirCarePlanId");
