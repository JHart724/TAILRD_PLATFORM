-- AUDIT-215: synthetic-data tenant classification for the Layer 3 BAA-execution guard
-- (backend/src/lib/prismaBaaGuard.ts). Under BAA_GUARD_MODE=strict the guard permits PHI flow
-- for a tenant when Hospital.isSyntheticData = true OR Hospital.baaExecuted = true, so strict
-- mode can run in production without denying the synthetic/demo tenants (which have no real BAA).
--
-- isSyntheticData is a directly-writable classification, distinct from baaExecuted (a derived
-- cache of CoveredEntity.baaExecutedAt that must NOT be written directly). This keeps baaExecuted
-- honestly false for synthetic data instead of faking a real BAA. Default false = fail-closed for
-- any real tenant that has not been classified and has no executed BAA.
ALTER TABLE "hospitals" ADD COLUMN "isSyntheticData" BOOLEAN NOT NULL DEFAULT false;
