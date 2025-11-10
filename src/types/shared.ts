// Centralized type definitions to eliminate duplication

export interface KPIData {
  totalOpportunity: string;
  totalOpportunitySub: string;
  totalPatients: string;
  totalPatientsSub: string;
  gdmtOptimization: string;
  gdmtOptimizationSub: string;
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
    primaryColor: 'medical-blue',
    secondaryColor: 'medical-green'
  },
  electrophysiology: {
    name: 'electrophysiology',
    displayName: 'Electrophysiology',
    description: '• Device Management • LAA Closure Analytics',
    drgRanges: ['241-244'],
    primaryColor: 'medical-purple',
    secondaryColor: 'medical-blue'
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