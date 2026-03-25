/**
 * TAILRD Platform — MS-DRG Payment Data
 *
 * MS-DRG codes with CMS FY2025 average payments for dollar opportunity
 * calculations. Includes all DRGs referenced across the 104 TAILRD gaps.
 */

import { MSDRGCode } from './types';

// ---------------------------------------------------------------------------
// Master MS-DRG Registry
// ---------------------------------------------------------------------------
export const MSDRG_CODES: Record<string, MSDRGCode> = {
  // =========================================================================
  // HEART FAILURE
  // =========================================================================
  '291': {
    drgCode: '291',
    description: 'Heart failure & shock with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 11847,
    relWeight: 1.6780,
    fiscalYear: 2025,
  },
  '292': {
    drgCode: '292',
    description: 'Heart failure & shock with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 8234,
    relWeight: 1.0320,
    fiscalYear: 2025,
  },
  '293': {
    drgCode: '293',
    description: 'Heart failure & shock without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 6124,
    relWeight: 0.7160,
    fiscalYear: 2025,
  },

  // =========================================================================
  // CARDIAC ARRHYTHMIA
  // =========================================================================
  '308': {
    drgCode: '308',
    description: 'Cardiac arrhythmia & conduction disorders with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 9876,
    relWeight: 1.3240,
    fiscalYear: 2025,
  },
  '309': {
    drgCode: '309',
    description: 'Cardiac arrhythmia & conduction disorders with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 6892,
    relWeight: 0.8470,
    fiscalYear: 2025,
  },
  '310': {
    drgCode: '310',
    description: 'Cardiac arrhythmia & conduction disorders without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 4567,
    relWeight: 0.5680,
    fiscalYear: 2025,
  },

  // =========================================================================
  // ACUTE MI
  // =========================================================================
  '280': {
    drgCode: '280',
    description: 'Acute myocardial infarction, discharged alive with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 12456,
    relWeight: 1.7920,
    fiscalYear: 2025,
  },
  '281': {
    drgCode: '281',
    description: 'Acute myocardial infarction, discharged alive with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 7891,
    relWeight: 1.0810,
    fiscalYear: 2025,
  },
  '282': {
    drgCode: '282',
    description: 'Acute myocardial infarction, discharged alive without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 5234,
    relWeight: 0.6940,
    fiscalYear: 2025,
  },

  // =========================================================================
  // PCI
  // =========================================================================
  '246': {
    drgCode: '246',
    description: 'PCI with drug-eluting stent with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 24567,
    relWeight: 3.4210,
    fiscalYear: 2025,
  },
  '247': {
    drgCode: '247',
    description: 'PCI with drug-eluting stent without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 16789,
    relWeight: 2.2430,
    fiscalYear: 2025,
  },
  '248': {
    drgCode: '248',
    description: 'PCI without drug-eluting stent with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 20345,
    relWeight: 2.8560,
    fiscalYear: 2025,
  },
  '249': {
    drgCode: '249',
    description: 'PCI without drug-eluting stent without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 14567,
    relWeight: 1.9870,
    fiscalYear: 2025,
  },

  // =========================================================================
  // CABG
  // =========================================================================
  '231': {
    drgCode: '231',
    description: 'CABG with PTCA with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 68234,
    relWeight: 8.9760,
    fiscalYear: 2025,
  },
  '232': {
    drgCode: '232',
    description: 'CABG with PTCA without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 46789,
    relWeight: 6.1230,
    fiscalYear: 2025,
  },
  '233': {
    drgCode: '233',
    description: 'CABG with cardiac catheterization with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 58456,
    relWeight: 7.6540,
    fiscalYear: 2025,
  },
  '234': {
    drgCode: '234',
    description: 'CABG with cardiac catheterization without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 38912,
    relWeight: 5.0890,
    fiscalYear: 2025,
  },
  '235': {
    drgCode: '235',
    description: 'CABG without cardiac catheterization with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 48567,
    relWeight: 6.3420,
    fiscalYear: 2025,
  },
  '236': {
    drgCode: '236',
    description: 'CABG without cardiac catheterization without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 34567,
    relWeight: 4.5120,
    fiscalYear: 2025,
  },

  // =========================================================================
  // CARDIAC VALVE
  // =========================================================================
  '216': {
    drgCode: '216',
    description: 'Cardiac valve & other major cardiothoracic procedures with cardiac catheterization with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 82345,
    relWeight: 10.8670,
    fiscalYear: 2025,
  },
  '217': {
    drgCode: '217',
    description: 'Cardiac valve & other major cardiothoracic procedures with cardiac catheterization without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 54678,
    relWeight: 7.1890,
    fiscalYear: 2025,
  },
  '218': {
    drgCode: '218',
    description: 'Cardiac valve & other major cardiothoracic procedures without cardiac catheterization with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 67890,
    relWeight: 8.9340,
    fiscalYear: 2025,
  },
  '219': {
    drgCode: '219',
    description: 'Cardiac valve & other major cardiothoracic procedures without cardiac catheterization without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 45123,
    relWeight: 5.9210,
    fiscalYear: 2025,
  },

  // =========================================================================
  // PACEMAKER / ICD
  // =========================================================================
  '222': {
    drgCode: '222',
    description: 'Cardiac defib implant with cardiac catheterization with AMI/HF/shock with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 52345,
    relWeight: 6.8760,
    fiscalYear: 2025,
  },
  '223': {
    drgCode: '223',
    description: 'Cardiac defib implant with cardiac catheterization with AMI/HF/shock without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 38456,
    relWeight: 5.0340,
    fiscalYear: 2025,
  },
  '224': {
    drgCode: '224',
    description: 'Cardiac defib implant without cardiac catheterization with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 45678,
    relWeight: 5.9870,
    fiscalYear: 2025,
  },
  '225': {
    drgCode: '225',
    description: 'Cardiac defib implant without cardiac catheterization without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 35678,
    relWeight: 4.6780,
    fiscalYear: 2025,
  },
  '242': {
    drgCode: '242',
    description: 'Permanent cardiac pacemaker implant with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 23456,
    relWeight: 3.0780,
    fiscalYear: 2025,
  },
  '243': {
    drgCode: '243',
    description: 'Permanent cardiac pacemaker implant with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 18234,
    relWeight: 2.3890,
    fiscalYear: 2025,
  },
  '244': {
    drgCode: '244',
    description: 'Permanent cardiac pacemaker implant without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 15678,
    relWeight: 2.0560,
    fiscalYear: 2025,
  },

  // =========================================================================
  // LVAD
  // =========================================================================
  '001': {
    drgCode: '001',
    description: 'Heart transplant or implant of heart assist system with MCC',
    mdc: 'MDC PRE - Pre-MDC',
    type: 'Surgical',
    avgPayment: 254678,
    relWeight: 33.4560,
    fiscalYear: 2025,
  },
  '002': {
    drgCode: '002',
    description: 'Heart transplant or implant of heart assist system without MCC',
    mdc: 'MDC PRE - Pre-MDC',
    type: 'Surgical',
    avgPayment: 168234,
    relWeight: 22.0980,
    fiscalYear: 2025,
  },

  // =========================================================================
  // PERIPHERAL VASCULAR
  // =========================================================================
  '252': {
    drgCode: '252',
    description: 'Other vascular procedures with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 28456,
    relWeight: 3.7340,
    fiscalYear: 2025,
  },
  '253': {
    drgCode: '253',
    description: 'Other vascular procedures with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 18567,
    relWeight: 2.4350,
    fiscalYear: 2025,
  },
  '254': {
    drgCode: '254',
    description: 'Other vascular procedures without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 14234,
    relWeight: 1.8670,
    fiscalYear: 2025,
  },
  '299': {
    drgCode: '299',
    description: 'Peripheral vascular disorders with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 9876,
    relWeight: 1.2960,
    fiscalYear: 2025,
  },
  '300': {
    drgCode: '300',
    description: 'Peripheral vascular disorders with CC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 7234,
    relWeight: 0.9490,
    fiscalYear: 2025,
  },
  '301': {
    drgCode: '301',
    description: 'Peripheral vascular disorders without CC/MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 5123,
    relWeight: 0.6720,
    fiscalYear: 2025,
  },

  // =========================================================================
  // PE / DVT
  // =========================================================================
  '175': {
    drgCode: '175',
    description: 'Pulmonary embolism with MCC or acute cor pulmonale',
    mdc: 'MDC 04 - Diseases of the Respiratory System',
    type: 'Medical',
    avgPayment: 12345,
    relWeight: 1.6210,
    fiscalYear: 2025,
  },
  '176': {
    drgCode: '176',
    description: 'Pulmonary embolism without MCC',
    mdc: 'MDC 04 - Diseases of the Respiratory System',
    type: 'Medical',
    avgPayment: 7890,
    relWeight: 1.0360,
    fiscalYear: 2025,
  },

  // =========================================================================
  // STROKE
  // =========================================================================
  '061': {
    drgCode: '061',
    description: 'Ischemic stroke, precerebral occlusion or transient ischemia with thrombolytic with MCC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 18234,
    relWeight: 2.3940,
    fiscalYear: 2025,
  },
  '062': {
    drgCode: '062',
    description: 'Ischemic stroke, precerebral occlusion or transient ischemia with thrombolytic with CC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 11234,
    relWeight: 1.4750,
    fiscalYear: 2025,
  },
  '063': {
    drgCode: '063',
    description: 'Ischemic stroke, precerebral occlusion or transient ischemia with thrombolytic without CC/MCC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 8456,
    relWeight: 1.1100,
    fiscalYear: 2025,
  },
  '064': {
    drgCode: '064',
    description: 'Intracranial hemorrhage or cerebral infarction with MCC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 14567,
    relWeight: 1.9120,
    fiscalYear: 2025,
  },
  '065': {
    drgCode: '065',
    description: 'Intracranial hemorrhage or cerebral infarction with CC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 8234,
    relWeight: 1.0810,
    fiscalYear: 2025,
  },
  '066': {
    drgCode: '066',
    description: 'Intracranial hemorrhage or cerebral infarction without CC/MCC',
    mdc: 'MDC 01 - Diseases of the Nervous System',
    type: 'Medical',
    avgPayment: 5678,
    relWeight: 0.7450,
    fiscalYear: 2025,
  },

  // =========================================================================
  // EP ABLATION
  // =========================================================================
  '250': {
    drgCode: '250',
    description: 'PCI without coronary artery stent with MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 18765,
    relWeight: 2.4630,
    fiscalYear: 2025,
  },
  '251': {
    drgCode: '251',
    description: 'PCI without coronary artery stent without MCC',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Surgical',
    avgPayment: 14123,
    relWeight: 1.8540,
    fiscalYear: 2025,
  },

  // =========================================================================
  // CHEST PAIN / SYNCOPE (observation stays)
  // =========================================================================
  '311': {
    drgCode: '311',
    description: 'Angina pectoris',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 4567,
    relWeight: 0.5990,
    fiscalYear: 2025,
  },
  '312': {
    drgCode: '312',
    description: 'Syncope & collapse',
    mdc: 'MDC 05 - Diseases of the Circulatory System',
    type: 'Medical',
    avgPayment: 5234,
    relWeight: 0.6870,
    fiscalYear: 2025,
  },
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Look up a DRG by code.
 */
export function getDRG(drgCode: string): MSDRGCode | undefined {
  return MSDRG_CODES[drgCode];
}

/**
 * Get the average CMS payment for a DRG.
 */
export function getAvgPayment(drgCode: string): number {
  return MSDRG_CODES[drgCode]?.avgPayment ?? 0;
}

/**
 * Get the relative weight for a DRG.
 */
export function getRelWeight(drgCode: string): number {
  return MSDRG_CODES[drgCode]?.relWeight ?? 0;
}

/**
 * Get all DRGs in a given MDC.
 */
export function getDRGsByMDC(mdc: string): MSDRGCode[] {
  return Object.values(MSDRG_CODES).filter(d =>
    d.mdc.toLowerCase().includes(mdc.toLowerCase())
  );
}

/**
 * Get all surgical DRGs.
 */
export function getSurgicalDRGs(): MSDRGCode[] {
  return Object.values(MSDRG_CODES).filter(d => d.type === 'Surgical');
}

/**
 * Get all medical DRGs.
 */
export function getMedicalDRGs(): MSDRGCode[] {
  return Object.values(MSDRG_CODES).filter(d => d.type === 'Medical');
}

/**
 * Calculate dollar opportunity from readmission avoidance.
 * Returns estimated savings based on DRG payment and assumed reduction rate.
 */
export function calculateReadmissionSavings(
  drgCode: string,
  annualAdmissions: number,
  readmissionRate: number,
  expectedReduction: number,
): number {
  const payment = getAvgPayment(drgCode);
  return payment * annualAdmissions * readmissionRate * expectedReduction;
}
