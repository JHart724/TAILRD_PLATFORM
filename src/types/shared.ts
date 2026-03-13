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
 secondaryColor: 'medical-green'
  },
  electrophysiology: {
 name: 'electrophysiology',
 displayName: 'Electrophysiology',
 description: '• Device Management • LAA Closure Analytics',
 drgRanges: ['241-244'],
 primaryColor: 'medical-purple',
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
