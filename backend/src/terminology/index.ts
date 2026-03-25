/**
 * TAILRD Platform — Terminology Module Entry Point
 *
 * Re-exports all terminology services from a single location.
 */

// Types
export * from './types';

// Code systems
export * as ICD10 from './icd10';
export * as RxNorm from './rxnorm';
export * as LOINC from './loinc';
export * as CPT from './cpt';
export * as MSDRG from './msdrg';
export * as NPI from './npi';

// ValueSets
export * from './valueSets/allGapValueSets';
