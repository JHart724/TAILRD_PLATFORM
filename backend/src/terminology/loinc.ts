/**
 * TAILRD Platform — LOINC Code Lookup Service
 *
 * Clinically relevant LOINC codes for lab results, echo parameters,
 * ECG measurements, and patient-reported outcome instruments.
 */

import { LOINCCode } from './types';

// ---------------------------------------------------------------------------
// Master LOINC Registry
// ---------------------------------------------------------------------------
export const LOINC_CODES: Record<string, LOINCCode & { unit: string }> = {
  // =========================================================================
  // CARDIAC BIOMARKERS
  // =========================================================================
  '33762-6': { loincNum: '33762-6', component: 'NT-proBNP', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'pg/mL' },
  '42757-5': { loincNum: '42757-5', component: 'BNP', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'pg/mL' },
  '6598-7': { loincNum: '6598-7', component: 'Troponin T', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ng/mL' },
  '67151-1': { loincNum: '67151-1', component: 'Troponin T, high sensitivity', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ng/L' },
  '49563-0': { loincNum: '49563-0', component: 'Troponin I, high sensitivity', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ng/L' },

  // =========================================================================
  // IRON STUDIES
  // =========================================================================
  '14647-2': { loincNum: '14647-2', component: 'Ferritin', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ng/mL' },
  '2502-3': { loincNum: '2502-3', component: 'Iron saturation (TSAT)', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: '%' },
  '14800-7': { loincNum: '14800-7', component: 'Serum iron', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ug/dL' },

  // =========================================================================
  // LIPIDS
  // =========================================================================
  '2089-1': { loincNum: '2089-1', component: 'LDL Cholesterol', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },
  '2571-8': { loincNum: '2571-8', component: 'Triglycerides', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },
  '43583-4': { loincNum: '43583-4', component: 'Lipoprotein(a)', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'nmol/L' },
  '2085-9': { loincNum: '2085-9', component: 'HDL Cholesterol', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },
  '2093-3': { loincNum: '2093-3', component: 'Total Cholesterol', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },

  // =========================================================================
  // RENAL
  // =========================================================================
  '33914-3': { loincNum: '33914-3', component: 'eGFR (CKD-EPI)', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mL/min/1.73m2' },
  '14682-9': { loincNum: '14682-9', component: 'Creatinine', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },
  '14959-1': { loincNum: '14959-1', component: 'Microalbumin/Creatinine ratio (UACR)', system: 'Urine', scaleType: 'Qn', className: 'CHEM', unit: 'mg/g' },

  // =========================================================================
  // ELECTROLYTES
  // =========================================================================
  '6298-4': { loincNum: '6298-4', component: 'Potassium', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mEq/L' },
  '2601-3': { loincNum: '2601-3', component: 'Magnesium', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },
  '2951-2': { loincNum: '2951-2', component: 'Sodium', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mEq/L' },

  // =========================================================================
  // METABOLIC
  // =========================================================================
  '4548-4': { loincNum: '4548-4', component: 'Hemoglobin A1c', system: 'Blood', scaleType: 'Qn', className: 'CHEM', unit: '%' },
  '2345-7': { loincNum: '2345-7', component: 'Glucose', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mg/dL' },

  // =========================================================================
  // HEMATOLOGY
  // =========================================================================
  '718-7': { loincNum: '718-7', component: 'Hemoglobin', system: 'Blood', scaleType: 'Qn', className: 'HEM', unit: 'g/dL' },
  '4544-3': { loincNum: '4544-3', component: 'Hematocrit', system: 'Blood', scaleType: 'Qn', className: 'HEM', unit: '%' },

  // =========================================================================
  // THYROID (amiodarone monitoring)
  // =========================================================================
  '3016-3': { loincNum: '3016-3', component: 'TSH', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'mIU/L' },
  '3026-2': { loincNum: '3026-2', component: 'Free T4', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'ng/dL' },

  // =========================================================================
  // LIVER (amiodarone/statin monitoring)
  // =========================================================================
  '1742-6': { loincNum: '1742-6', component: 'ALT', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'U/L' },
  '1920-8': { loincNum: '1920-8', component: 'AST', system: 'Serum/Plasma', scaleType: 'Qn', className: 'CHEM', unit: 'U/L' },

  // =========================================================================
  // COAGULATION
  // =========================================================================
  '6301-6': { loincNum: '6301-6', component: 'INR', system: 'Blood', scaleType: 'Qn', className: 'HEM', unit: '' },
  '3173-2': { loincNum: '3173-2', component: 'aPTT', system: 'Blood', scaleType: 'Qn', className: 'HEM', unit: 'sec' },

  // =========================================================================
  // ECHO PARAMETERS
  // =========================================================================
  '18010-0': { loincNum: '18010-0', component: 'LVEF by Echo', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: '%' },
  '79993-0': { loincNum: '79993-0', component: 'LV end-systolic diameter', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'cm' },
  '18148-8': { loincNum: '18148-8', component: 'Aortic valve mean gradient', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'mmHg' },
  '77912-1': { loincNum: '77912-1', component: 'Aortic valve area', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'cm2' },
  '8867-4': { loincNum: '8867-4', component: 'Heart rate', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'bpm' },
  '59408-5': { loincNum: '59408-5', component: 'Oxygen saturation (SpO2)', system: 'Blood', scaleType: 'Qn', className: 'CARD', unit: '%' },

  // =========================================================================
  // ECG
  // =========================================================================
  '8601-7': { loincNum: '8601-7', component: 'QTc interval', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'ms' },
  '10230-1': { loincNum: '10230-1', component: 'QRS duration', system: 'Heart', scaleType: 'Qn', className: 'CARD', unit: 'ms' },

  // =========================================================================
  // PRO INSTRUMENTS
  // =========================================================================
  '86923-0': { loincNum: '86923-0', component: 'KCCQ-12 Overall Summary Score', system: 'Patient', scaleType: 'Qn', className: 'SURVEY', unit: 'score' },
  '71940-2': { loincNum: '71940-2', component: 'SAQ-7 Summary Score', system: 'Patient', scaleType: 'Qn', className: 'SURVEY', unit: 'score' },
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Validate LOINC format: digits-digits with dash.
 */
export function validateLOINC(code: string): boolean {
  return /^\d{1,5}-\d$/.test(code);
}

/**
 * Get the human-readable description for a LOINC code.
 */
export function getLabDescription(code: string): string {
  return LOINC_CODES[code]?.component ?? 'Unknown';
}

/**
 * Get the standard unit for a LOINC code.
 */
export function getLabUnit(code: string): string {
  return LOINC_CODES[code]?.unit ?? '';
}

/**
 * Check whether a code exists in the registry.
 */
export function isLabCode(code: string): boolean {
  return code in LOINC_CODES;
}

/**
 * Get a LOINC code object by code string.
 */
export function getCode(code: string): (LOINCCode & { unit: string }) | undefined {
  return LOINC_CODES[code];
}

/**
 * Get all LOINC codes in a given className (e.g. 'CARD', 'CHEM', 'SURVEY').
 */
export function getCodesByClass(className: string): (LOINCCode & { unit: string })[] {
  return Object.values(LOINC_CODES).filter(c => c.className === className);
}
