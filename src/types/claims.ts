// Claims Data Models for TAILRD Platform
// UB04, DRG, ICD-10, CPT Integration

export interface ICD10Code {
  code: string;
  description: string;
  category: string;
  severity?: 'minor' | 'moderate' | 'major' | 'severe';
  chronic?: boolean;
  comorbidity?: boolean;
  hccCategory?: string;
  riskWeight?: number;
}

export interface ICD10ProcedureCode {
  code: string;
  description: string;
  category: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface CPTCode {
  code: string;
  description: string;
  category: string;
  rbrvs?: number;
  facilityFee?: number;
  professionalFee?: number;
  totalRVU?: number;
  complexity?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
}

export interface DRGData {
  msdrg: string;
  description: string;
  mdc: string; // Major Diagnostic Category
  type: 'medical' | 'surgical';
  aprdrg?: string;
  severity: number; // 1-4 (SOI - Severity of Illness)
  mortality: number; // 1-4 (ROM - Risk of Mortality)
  expectedLOS: number;
  geometricMeanLOS: number;
  arithmeticMeanLOS: number;
  nationalPayment: number;
  localPayment: number;
  cmi: number; // Case Mix Index
}

export interface UB04Data {
  // UB04 Form Fields
  facilityInfo: {
    providerNumber: string;
    facilityName: string;
    address: string;
    taxId: string;
    npi: string;
  };
  
  patientInfo: {
    mrn: string;
    accountNumber: string;
    patientName: string;
    dateOfBirth: string;
    gender: 'M' | 'F' | 'U';
    address: string;
    admissionDate: string;
    dischargeDate: string;
    lengthOfStay: number;
    admissionType: string; // Emergency, Urgent, Elective, etc.
    admissionSource: string;
    patientStatus: string; // Discharge disposition
  };
  
  payerInfo: {
    primaryPayer: string;
    secondaryPayer?: string;
    membershipNumber: string;
    groupNumber?: string;
    planName: string;
    eligibilityVerified: boolean;
    authorizationNumber?: string;
  };
  
  chargeDetails: ChargeLineItem[];
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  netRevenue: number;
}

export interface ChargeLineItem {
  serviceDate: string;
  revenueCode: string;
  description: string;
  hcpcsCode?: string;
  cptCode?: string;
  modifier?: string;
  units: number;
  unitPrice: number;
  totalCharge: number;
  department: string;
  provider: string;
}

export interface ClaimsDataModel {
  claimId: string;
  encounterId: string;
  ub04: UB04Data;
  
  // Diagnosis and Procedure Coding
  primaryDiagnosis: ICD10Code;
  secondaryDiagnoses: ICD10Code[];
  procedures: {
    icdProcedures: ICD10ProcedureCode[];
    cptCodes: CPTCode[];
  };
  
  // DRG Assignment
  drg: DRGData;
  
  // Financial Performance
  financials: {
    expectedReimbursement: number;
    actualReimbursement: number;
    costOfCare: number;
    margin: number;
    marginPercentage: number;
    daysToPayment: number;
    denialStatus: 'approved' | 'denied' | 'pending' | 'appealed';
    denialReason?: string;
  };
  
  // Quality Metrics
  quality: {
    complicationPresent: boolean;
    hospitalAcquiredCondition: boolean;
    presentOnAdmission: Record<string, boolean>;
    qualityIndicators: string[];
    riskAdjustedExpectedOutcome: {
      mortality: number;
      readmission: number;
      lengthOfStay: number;
    };
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

// Service Line Specific Interfaces

export interface HFClaimsAnalytics {
  drgPerformance: {
    primaryDRGs: string[]; // ['291', '292', '293']
    averageLOS: number;
    cmi: number;
    readmissionRates: Record<string, number>;
    mortalityRates: Record<string, number>;
    costVariance: Record<string, number>;
  };
  
  icdTrends: {
    primaryDiagnoses: ICD10Code[];
    comorbidityBurden: number;
    hccRiskScores: number[];
    chronicConditions: string[];
  };
  
  cptUtilization: {
    procedures: CPTCode[];
    frequencyAnalysis: Record<string, number>;
    costPerProcedure: Record<string, number>;
    reimbursementAnalysis: Record<string, number>;
  };
  
  gdmtDocumentation: {
    aceInhibitorDocumented: boolean;
    betaBlockerDocumented: boolean;
    mraDocumented: boolean;
    sglt2DocumentedIfDiabetic: boolean;
    documentationScore: number;
  };
}

export interface CoronaryClaimsAnalytics {
  pciAnalytics: {
    drgCodes: string[]; // ['246', '247', '248', '249', '250', '251']
    procedureCodes: string[]; // CPT 92920-92944
    stentTypes: Record<string, number>;
    complexityScores: number[];
    outcomesByComplexity: Record<string, number>;
  };
  
  cabgAnalytics: {
    drgCodes: string[]; // ['231', '232', '233', '234', '235', '236']
    graftTypes: Record<string, number>;
    arterialGraftRate: number;
    bimaUsage: number;
    onPumpVsOffPump: Record<string, number>;
    qualityMetrics: {
      strokeRate: number;
      readmissionRate: number;
      mortalityRate: number;
      lengthOfStay: number;
    };
  };
  
  syntaxIntegration: {
    syntaxScores: number[];
    recommendedTreatment: ('PCI' | 'CABG' | 'Medical')[];
    actualTreatment: ('PCI' | 'CABG' | 'Medical')[];
    concordanceRate: number;
  };
}

export interface EPClaimsAnalytics {
  deviceImplantation: {
    drgCodes: string[]; // ['242', '243', '244', '245']
    deviceTypes: Record<string, number>;
    manufacturers: Record<string, number>;
    complicationRates: Record<string, number>;
    reimbursementByDevice: Record<string, number>;
  };
  
  ablationProcedures: {
    cptCodes: string[]; // ['93656', '93657', '93658']
    afibTypes: Record<string, number>;
    successRates: Record<string, number>;
    reablationRates: Record<string, number>;
    costEffectiveness: Record<string, number>;
  };
  
  laacAnalytics: {
    deviceSuccess: number;
    complicationRates: number;
    strokeReduction: number;
    costComparison: Record<string, number>;
  };
}

// Revenue Cycle Analytics
export interface RevenueCycleMetrics {
  drgOptimization: {
    potentialUpcoding: DRGOpportunity[];
    documentationGaps: CDIAlert[];
    denyProbability: Record<string, number>;
    cmiOpportunities: number;
  };
  
  pricingAnalysis: {
    competitivePositioning: MarketComparison[];
    contractPerformance: PayerAnalysis[];
    bundledPaymentTracking: BundleMetrics[];
    priceTransparency: Record<string, number>;
  };
  
  cptProductivity: {
    providerEfficiency: ProviderMetrics[];
    procedureVolumeForecasting: VolumeProjection[];
    capacityOptimization: ResourceAnalysis[];
    rbuAnalysis: Record<string, number>;
  };
}

export interface DRGOpportunity {
  currentDRG: string;
  potentialDRG: string;
  revenueImpact: number;
  documentationNeeded: string[];
  confidence: number;
  timeframe: string;
}

export interface CDIAlert {
  patientId: string;
  currentDiagnoses: string[];
  suggestedAdditions: string[];
  impactAnalysis: {
    severityChange: number;
    mortalityChange: number;
    reimbursementImpact: number;
    cmiImpact: number;
  };
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

export interface MarketComparison {
  serviceCategory: string;
  ourPrice: number;
  marketMedian: number;
  percentile: number;
  competitorPrices: Record<string, number>;
  recommendation: string;
}

export interface PayerAnalysis {
  payerName: string;
  contractedRates: Record<string, number>;
  actualPayments: Record<string, number>;
  denialRates: Record<string, number>;
  avgDaysToPayment: number;
  totalVolume: number;
  totalRevenue: number;
}

export interface BundleMetrics {
  bundleName: string;
  targetPrice: number;
  actualCost: number;
  margin: number;
  volumeTargets: Record<string, number>;
  qualityBonuses: Record<string, number>;
  riskSharing: boolean;
}

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  specialty: string;
  totalRVUs: number;
  avgRVUPerProcedure: number;
  procedureVolume: Record<string, number>;
  qualityScores: Record<string, number>;
  patientSatisfaction: number;
  efficiency: number;
}

export interface VolumeProjection {
  serviceCategory: string;
  historicalVolume: number[];
  projectedVolume: number[];
  seasonalFactors: Record<string, number>;
  confidenceInterval: [number, number];
  assumptions: string[];
}

export interface ResourceAnalysis {
  department: string;
  currentCapacity: number;
  utilizedCapacity: number;
  projectedDemand: number;
  staffingNeeds: Record<string, number>;
  equipmentNeeds: string[];
  costImplications: number;
}