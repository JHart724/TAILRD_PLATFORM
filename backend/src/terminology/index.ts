/**
 * TAILRD Platform — Terminology Module Entry Point
 *
 * Re-exports all terminology services from a single location.
 */

// Types
export * from './types';

// Code systems
export * as ICD10 from './icd10';
// AUDIT-105 (2026-06-02): rxnorm.ts + loinc.ts deleted (verified-dead + systematically corrupted;
// canonical drug/lab codes live in cardiovascularValuesets.ts). Re-exports removed.
export * as CPT from './cpt';
export * as MSDRG from './msdrg';
export * as NPI from './npi';

// ValueSets
export * from './valueSets/allGapValueSets';
