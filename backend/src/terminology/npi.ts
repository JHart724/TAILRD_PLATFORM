/**
 * TAILRD Platform — NPI Taxonomy Codes
 *
 * Provider specialty identification for gap assignment routing.
 */

import { NPITaxonomy } from './types';

export const NPI_TAXONOMIES: Record<string, NPITaxonomy> = {
  // Cardiology
  '207RC0000X': { code: '207RC0000X', specialty: 'Cardiovascular Disease', category: 'Cardiology' },
  '207RI0011X': { code: '207RI0011X', specialty: 'Interventional Cardiology', category: 'Cardiology' },
  '207RE0101X': { code: '207RE0101X', specialty: 'Clinical Cardiac Electrophysiology', category: 'Cardiology' },
  '207RA0001X': { code: '207RA0001X', specialty: 'Advanced Heart Failure & Transplant', category: 'Cardiology' },

  // Cardiac Surgery
  '208G00000X': { code: '208G00000X', specialty: 'Thoracic Surgery', category: 'Cardiac Surgery' },

  // Vascular Surgery
  '208VP0014X': { code: '208VP0014X', specialty: 'Vascular Surgery', category: 'Vascular Surgery' },

  // Internal Medicine
  '207R00000X': { code: '207R00000X', specialty: 'Internal Medicine', category: 'Internal Medicine' },

  // Emergency Medicine
  '207P00000X': { code: '207P00000X', specialty: 'Emergency Medicine', category: 'Emergency' },

  // Hospitalist
  '208M00000X': { code: '208M00000X', specialty: 'Hospitalist', category: 'Hospital Medicine' },

  // Primary Care
  '208D00000X': { code: '208D00000X', specialty: 'General Practice', category: 'Primary Care' },
  '207Q00000X': { code: '207Q00000X', specialty: 'Family Medicine', category: 'Primary Care' },

  // Nursing
  '363L00000X': { code: '363L00000X', specialty: 'Nurse Practitioner', category: 'Advanced Practice' },
  '363LF0000X': { code: '363LF0000X', specialty: 'Family NP', category: 'Advanced Practice' },
  '363LA2200X': { code: '363LA2200X', specialty: 'Adult-Gerontology Acute Care NP', category: 'Advanced Practice' },

  // Physician Assistant
  '363A00000X': { code: '363A00000X', specialty: 'Physician Assistant', category: 'Advanced Practice' },

  // Pharmacy
  '183500000X': { code: '183500000X', specialty: 'Pharmacist', category: 'Pharmacy' },

  // Radiology (imaging)
  '2085R0001X': { code: '2085R0001X', specialty: 'Interventional Radiology', category: 'Radiology' },

  // Neurology (stroke/cryptogenic)
  '2084N0400X': { code: '2084N0400X', specialty: 'Neurology', category: 'Neurology' },

  // Endocrinology
  '207RE0201X': { code: '207RE0201X', specialty: 'Endocrinology', category: 'Endocrinology' },

  // Nephrology
  '207RN0300X': { code: '207RN0300X', specialty: 'Nephrology', category: 'Nephrology' },

  // Hematology
  '207RH0000X': { code: '207RH0000X', specialty: 'Hematology', category: 'Hematology' },

  // Pulmonology
  '207RP1001X': { code: '207RP1001X', specialty: 'Pulmonary Disease', category: 'Pulmonology' },
};

/**
 * Look up a taxonomy by code.
 */
export function getTaxonomy(code: string): NPITaxonomy | undefined {
  return NPI_TAXONOMIES[code];
}

/**
 * Get all taxonomies in a given category (e.g. 'Cardiology').
 */
export function getTaxonomiesByCategory(category: string): NPITaxonomy[] {
  return Object.values(NPI_TAXONOMIES).filter(t => t.category === category);
}

/**
 * Check whether a taxonomy code belongs to a cardiology specialty.
 */
export function isCardiologyProvider(taxonomyCode: string): boolean {
  const t = NPI_TAXONOMIES[taxonomyCode];
  return t !== undefined && (t.category === 'Cardiology' || t.category === 'Cardiac Surgery');
}

/**
 * Get all taxonomy codes (string[]).
 */
export function getAllTaxonomyCodes(): string[] {
  return Object.keys(NPI_TAXONOMIES);
}
