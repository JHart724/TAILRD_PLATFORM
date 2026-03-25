/**
 * TAILRD Platform — Clinical Terminology Type Definitions
 *
 * Core TypeScript interfaces for ICD-10-CM, RxNorm, LOINC, CPT, MS-DRG,
 * and the composite GapValueSet structure that drives gap detection.
 */

export interface ICD10Code {
  code: string;
  description: string;
  category: string;
  isLeaf: boolean;
  parentCode: string | null;
}

export interface RxNormConcept {
  rxcui: string;
  name: string;
  termType: string; // IN, BN, SCD
  drugClasses: string[];
  brandNames: string[];
}

export interface LOINCCode {
  loincNum: string;
  component: string;
  system: string;
  scaleType: string;
  className: string;
}

export interface CPTCode {
  code: string;
  description: string;
  category: string;
}

export interface MSDRGCode {
  drgCode: string;
  description: string;
  mdc: string;
  type: string;
  avgPayment: number;
  relWeight: number;
  fiscalYear: number;
}

export interface LabThreshold {
  loincCode: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  unit: string;
}

export type ModuleCode = 'HF' | 'EP' | 'CAD' | 'SH' | 'VD' | 'PV';

export interface GapValueSet {
  gapId: string;
  gapName: string;
  module: ModuleCode;
  diagnosisCodes: string[];     // ICD-10
  exclusionCodes: string[];     // ICD-10 exclusions
  procedureCodes: string[];     // CPT
  medicationCodes: string[];    // RxNorm RXCUIs
  labCodes: string[];           // LOINC
  labThresholds: LabThreshold[];
  deviceCodes: string[];
  methodologyNote?: string;
}

export interface DrugClassMapping {
  className: string;
  ingredients: { rxcui: string; name: string; brands: string[] }[];
}

export interface NPITaxonomy {
  code: string;
  specialty: string;
  category: string;
}
