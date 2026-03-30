// Centralized type definitions to eliminate duplication

export interface KPIData {
  totalOpportunity: string;
  totalOpportunitySub: string;
  totalPatients: string;
  totalPatientsSub: string;
  gdmtOptimization?: string;
  gdmtOptimizationSub?: string;
  valveTherapyOptimization?: string;
  valveTherapyOptimizationSub?: string;
  avgRoi: string;
  avgRoiSub: string;
}

export interface PatientData {
  patientName: string;
  mrn: string;
  age?: number;
  gender?: 'M' | 'F';
  admissionDate?: string;
  dischargeDate?: string;
}

export interface DRGMetrics {
  currentCMI: string;
  monthlyOpportunity: string;
  documentationRate: string;
  avgLOS: string;
  losBenchmark: string;
}

export interface TrendData {
  direction: 'up' | 'down';
  value: string;
  label: string;
}

export interface StatusType {
  status: 'optimal' | 'warning' | 'critical';
}

// Module-specific configurations
export interface ModuleConfig {
  name: string;
  displayName: string;
  description: string;
  drgRanges: string[];
  primaryColor: string;
  secondaryColor: string;
}

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  heartFailure: {
 name: 'heartFailure',
 displayName: 'Heart Failure',
 description: '• GDMT Optimization • HFrEF/HFpEF Analytics',
 drgRanges: ['291-293'],
 primaryColor: 'porsche',
 secondaryColor: 'chrome-blue'
  },
  electrophysiology: {
 name: 'electrophysiology',
 displayName: 'Electrophysiology',
 description: '• Device Management • LAA Closure Analytics',
 drgRanges: ['241-244'],
 primaryColor: 'medical-arterial',
 secondaryColor: 'porsche'
  },
  // Add other modules...
};

// Financial constants that are scattered across files
export const FINANCIAL_CONSTANTS = {
  MEDICARE_RATES: {
 DRG_291: 89750,
 DRG_292: 64280,
 DRG_293: 42180,
  },
  QUALITY_THRESHOLDS: {
 GDMT_TARGET: 0.8,
 CMI_BENCHMARK: 2.2,
 LOS_TARGET: 3.5,
  },
  REVENUE_MULTIPLIERS: {
 QUARTERLY_FACTOR: 0.25,
 ANNUAL_FACTOR: 1.0,
  }
};

// Clinical constants
export const CLINICAL_CONSTANTS = {
  HEART_FAILURE: {
 NYHA_CLASSES: ['I', 'II', 'III', 'IV'],
 EJECTION_FRACTION_THRESHOLDS: {
 HFrEF: 40,
 HFmrEF: 50,
 HFpEF: 50
 },
 GDMT_PILLARS: ['ACE/ARB/ARNI', 'Beta-blocker', 'MRA', 'SGLT2i'],
  },
  GENERAL: {
 PRIORITY_LEVELS: ['low', 'medium', 'high', 'critical'] as const,
 CONFIDENCE_THRESHOLDS: {
 LOW: 70,
 MEDIUM: 80,
 HIGH: 90
 }
  }
};

export type PriorityLevel = typeof CLINICAL_CONSTANTS.GENERAL.PRIORITY_LEVELS[number];

/**
 * Unified patient clinical context for auto-populating calculators and clinical tools.
 * All fields optional — each calculator uses the subset it needs.
 * When PatientContext is passed, calculators pre-fill from it with manual override.
 */
export interface PatientContext {
  // Demographics
  patientId?: string;
  age?: number;
  gender?: 'male' | 'female';
  weight?: number;
  height?: number;
  bmi?: number;
  race?: string;

  // Vitals
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;

  // Labs
  creatinine?: number;
  eGFR?: number;
  potassium?: number;
  hemoglobin?: number;
  ferritin?: number;
  transferrinSaturation?: number;
  platelets?: number;
  inr?: number;
  hsCRP?: number;
  bnp?: number;
  ntProBNP?: number;
  troponin?: number;
  ldl?: number;
  hba1c?: number;
  lipoproteinA?: number;
  esr?: number;
  wbc?: number;

  // Echo
  lvef?: number;
  lvedd?: number;
  lvesd?: number;
  aorticValveArea?: number;
  aorticMeanGradient?: number;
  aorticPeakVelocity?: number;
  mitralValveArea?: number;
  eroa?: number;
  regurgitantVolume?: number;
  venaContracta?: number;
  paSystolicPressure?: number;
  strokeVolumeIndex?: number;

  // Conditions
  diabetes?: boolean;
  hypertension?: boolean;
  atrialFibrillation?: boolean;
  chf?: boolean;
  copd?: boolean;
  asthma?: boolean;
  ckd?: boolean;
  dialysis?: boolean;
  cad?: boolean;
  pvd?: boolean;
  priorStroke?: boolean;
  priorTIA?: boolean;
  priorMI?: boolean;
  priorCardiacSurgery?: boolean;
  activeEndocarditis?: boolean;
  liverDisease?: boolean;
  activeBleeding?: boolean;
  bleedingHistory?: boolean;
  mechanicalValve?: boolean;

  // Functional
  nyhaClass?: 1 | 2 | 3 | 4;
  symptomatic?: boolean;

  // Medications
  medications?: string[];
  onAnticoagulant?: boolean;
  onAntiplatelet?: boolean;
  onBetaBlocker?: boolean;
  onACEiARB?: boolean;
  onARNi?: boolean;
  onSGLT2i?: boolean;
  onMRA?: boolean;
  onStatin?: boolean;

  // Peripheral Vascular
  abi?: number;
  toePressure?: number;
  claudicationDistance?: number;
  restPain?: boolean;
  tissueLoss?: boolean;

  // EP
  rhythmType?: string;
  chadsVascScore?: number;
  hasbledScore?: number;

  // Surgical Risk
  stsScore?: number;
  euroScore?: number;
  frailtyIndex?: number;
}

/**
 * Mock patient context for demo auto-fill.
 * Represents a typical HF patient with multiple comorbidities.
 */
/**
 * Demo patient roster — realistic patients that appear across gap detection and clinical tools.
 * Selecting a patient in Clinical Intelligence auto-populates their data into calculators.
 */
export const DEMO_PATIENT_ROSTER: { label: string; context: PatientContext }[] = [
  {
    label: 'Simmons, Harold — Age 74 · HFrEF · AF · CKD',
    context: {
      patientId: 'HF-44201', age: 74, gender: 'male', weight: 92, height: 178, bmi: 29.0,
      systolicBP: 118, diastolicBP: 68, heartRate: 82, creatinine: 1.6, eGFR: 42, potassium: 4.5,
      hemoglobin: 11.8, ferritin: 65, transferrinSaturation: 16, platelets: 178, inr: 2.1,
      bnp: 890, ldl: 78, hba1c: 6.8, lvef: 28, lvedd: 66, lvesd: 52, paSystolicPressure: 48,
      diabetes: true, hypertension: true, atrialFibrillation: true, chf: true, copd: false,
      cad: true, pvd: false, priorStroke: false, priorMI: true, priorCardiacSurgery: false,
      nyhaClass: 3, symptomatic: true,
      onBetaBlocker: true, onACEiARB: false, onARNi: true, onMRA: true, onSGLT2i: false,
      onStatin: true, onAnticoagulant: true,
      chadsVascScore: 5, hasbledScore: 3, stsScore: 4.2, euroScore: 3.8, frailtyIndex: 3,
    },
  },
  {
    label: 'Caldwell, Ruth — Age 78 · HFpEF · DM · Obesity',
    context: {
      patientId: 'HF-44238', age: 78, gender: 'female', weight: 98, height: 162, bmi: 37.3,
      systolicBP: 142, diastolicBP: 78, heartRate: 74, creatinine: 1.2, eGFR: 48, potassium: 4.0,
      hemoglobin: 13.2, ferritin: 120, transferrinSaturation: 24, platelets: 210, inr: 1.0,
      bnp: 520, ldl: 104, hba1c: 7.8, lvef: 55, lvedd: 48, lvesd: 32, paSystolicPressure: 38,
      diabetes: true, hypertension: true, atrialFibrillation: false, chf: true, copd: true,
      cad: false, pvd: false, priorStroke: false, priorMI: false, priorCardiacSurgery: false,
      nyhaClass: 2, symptomatic: true,
      onBetaBlocker: true, onACEiARB: true, onMRA: false, onSGLT2i: false,
      onStatin: true, onAnticoagulant: false,
      stsScore: 2.8, euroScore: 2.1, frailtyIndex: 4,
    },
  },
  {
    label: 'Martinez, Carlos — Age 58 · VT · NICM · ICD',
    context: {
      patientId: 'EP-MRN003', age: 58, gender: 'male', weight: 85, height: 180, bmi: 26.2,
      systolicBP: 112, diastolicBP: 72, heartRate: 68, creatinine: 1.1, eGFR: 78, potassium: 4.3,
      hemoglobin: 14.1, ferritin: 180, transferrinSaturation: 28, platelets: 225, inr: 1.0,
      bnp: 340, ldl: 88, hba1c: 5.6, lvef: 30, lvedd: 64, lvesd: 50, paSystolicPressure: 35,
      diabetes: false, hypertension: false, atrialFibrillation: false, chf: true, copd: false,
      cad: false, pvd: false, priorStroke: false, priorMI: false, priorCardiacSurgery: false,
      nyhaClass: 2, symptomatic: false,
      onBetaBlocker: true, onACEiARB: false, onARNi: true, onMRA: true, onSGLT2i: true,
      onStatin: false, onAnticoagulant: false,
      chadsVascScore: 1, hasbledScore: 0,
      rhythmType: 'VT',
    },
  },
  {
    label: 'Thompson, James — Age 68 · Post-STEMI · 3V CAD',
    context: {
      patientId: 'CAD-MRN007', age: 68, gender: 'male', weight: 95, height: 175, bmi: 31.0,
      systolicBP: 134, diastolicBP: 82, heartRate: 72, creatinine: 1.3, eGFR: 58, potassium: 4.1,
      hemoglobin: 13.5, ferritin: 145, transferrinSaturation: 22, platelets: 198, inr: 1.0,
      bnp: 180, ldl: 112, hba1c: 7.4, lvef: 42, lvedd: 56, lvesd: 40, paSystolicPressure: 32,
      diabetes: true, hypertension: true, atrialFibrillation: false, chf: false, copd: false,
      cad: true, pvd: true, priorStroke: false, priorMI: true, priorCardiacSurgery: false,
      nyhaClass: 1, symptomatic: false,
      onBetaBlocker: true, onACEiARB: true, onMRA: false, onSGLT2i: true,
      onStatin: true, onAnticoagulant: false, onAntiplatelet: true,
      stsScore: 2.1, euroScore: 1.8,
    },
  },
  {
    label: 'Williams, Dorothy — Age 82 · Severe AS · AF',
    context: {
      patientId: 'SH-MRN005', age: 82, gender: 'female', weight: 65, height: 158, bmi: 26.0,
      systolicBP: 148, diastolicBP: 72, heartRate: 78, creatinine: 1.5, eGFR: 38, potassium: 4.6,
      hemoglobin: 11.4, ferritin: 95, transferrinSaturation: 20, platelets: 165, inr: 2.4,
      bnp: 680, ldl: 72, hba1c: 5.9, lvef: 48, lvedd: 50, lvesd: 34, paSystolicPressure: 52,
      diabetes: false, hypertension: true, atrialFibrillation: true, chf: true, copd: true,
      cad: true, pvd: false, priorStroke: true, priorMI: false, priorCardiacSurgery: false,
      nyhaClass: 3, symptomatic: true,
      onBetaBlocker: false, onACEiARB: true, onMRA: false, onSGLT2i: false,
      onStatin: true, onAnticoagulant: true,
      chadsVascScore: 7, hasbledScore: 4, stsScore: 6.8, euroScore: 5.4, frailtyIndex: 5,
    },
  },
];

export const DEMO_PATIENT_CONTEXT: PatientContext = {
  patientId: 'DEMO-001',
  age: 72,
  gender: 'male',
  weight: 88,
  height: 175,
  bmi: 28.7,
  systolicBP: 128,
  diastolicBP: 76,
  heartRate: 78,
  creatinine: 1.4,
  eGFR: 52,
  potassium: 4.2,
  hemoglobin: 12.8,
  ferritin: 85,
  transferrinSaturation: 18,
  platelets: 195,
  inr: 1.0,
  bnp: 450,
  ldl: 92,
  hba1c: 7.1,
  lvef: 35,
  lvedd: 62,
  lvesd: 48,
  paSystolicPressure: 42,
  diabetes: true,
  hypertension: true,
  atrialFibrillation: true,
  chf: true,
  copd: false,
  cad: true,
  pvd: false,
  priorStroke: false,
  priorMI: true,
  priorCardiacSurgery: false,
  nyhaClass: 3,
  symptomatic: true,
  onBetaBlocker: true,
  onACEiARB: true,
  onMRA: true,
  onSGLT2i: false,
  onStatin: true,
  onAnticoagulant: false,
  chadsVascScore: 4,
  hasbledScore: 2,
  stsScore: 3.8,
  euroScore: 3.2,
  frailtyIndex: 3,
};
