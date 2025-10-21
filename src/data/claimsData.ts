// Sample Claims Data for TAILRD Platform Demo
import { 
  ClaimsDataModel, 
  HFClaimsAnalytics, 
  CoronaryClaimsAnalytics, 
  EPClaimsAnalytics,
  RevenueCycleMetrics,
  CDIAlert,
  DRGOpportunity
} from '../types/claims';

// Heart Failure DRG Sample Data
export const hfClaimsData: HFClaimsAnalytics = {
  drgPerformance: {
    primaryDRGs: ['291', '292', '293'], // HF w/o MCC, w/ CC, w/ MCC
    averageLOS: 4.2,
    cmi: 1.47,
    readmissionRates: {
      '291': 8.4, // HF w/o MCC
      '292': 12.1, // HF w/ CC  
      '293': 15.8, // HF w/ MCC
    },
    mortalityRates: {
      '291': 1.2,
      '292': 3.4,
      '293': 7.8,
    },
    costVariance: {
      '291': -12.3, // 12.3% under DRG payment
      '292': +8.7,  // 8.7% over DRG payment
      '293': +23.4, // 23.4% over DRG payment
    },
  },
  
  icdTrends: {
    primaryDiagnoses: [
      { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Cardiovascular', severity: 'moderate', chronic: true, hccCategory: 'HCC85', riskWeight: 0.323 },
      { code: 'I50.23', description: 'Acute on chronic systolic heart failure', category: 'Cardiovascular', severity: 'severe', chronic: true, hccCategory: 'HCC85', riskWeight: 0.323 },
      { code: 'I50.43', description: 'Acute on chronic combined systolic and diastolic heart failure', category: 'Cardiovascular', severity: 'severe', chronic: true, hccCategory: 'HCC85', riskWeight: 0.323 },
    ],
    comorbidityBurden: 6.8, // Average number of comorbidities
    hccRiskScores: [1.2, 1.8, 2.4, 1.6, 2.1], // Sample HCC risk scores
    chronicConditions: ['Diabetes', 'CKD', 'COPD', 'Hypertension', 'Atrial Fibrillation'],
  },
  
  cptUtilization: {
    procedures: [
      { code: '93306', description: 'Echocardiography, transthoracic', category: 'Diagnostic', rbrvs: 1.23, facilityFee: 245, professionalFee: 89, totalRVU: 1.23 },
      { code: '93458', description: 'Left heart catheterization', category: 'Diagnostic', rbrvs: 4.67, facilityFee: 1250, professionalFee: 456, totalRVU: 4.67 },
      { code: '99233', description: 'Subsequent hospital care', category: 'E&M', rbrvs: 2.11, facilityFee: 0, professionalFee: 234, totalRVU: 2.11 },
    ],
    frequencyAnalysis: {
      '93306': 89, // Echo performed in 89% of cases
      '93458': 34, // Cath in 34% of cases
      '99233': 95, // Daily visits in 95% of cases
    },
    costPerProcedure: {
      '93306': 334,
      '93458': 1706,
      '99233': 234,
    },
    reimbursementAnalysis: {
      '93306': 298, // Actual reimbursement
      '93458': 1534,
      '99233': 187,
    },
  },
  
  gdmtDocumentation: {
    aceInhibitorDocumented: true,
    betaBlockerDocumented: true,
    mraDocumented: false, // Documentation gap
    sglt2DocumentedIfDiabetic: false, // Documentation gap
    documentationScore: 75, // 3 out of 4 documented
  },
};

// Coronary Intervention Claims Data
export const coronaryClaimsData: CoronaryClaimsAnalytics = {
  pciAnalytics: {
    drgCodes: ['246', '247', '248', '249', '250', '251'],
    procedureCodes: ['92920', '92928', '92933', '92937', '92941', '92943'],
    stentTypes: {
      'Drug-Eluting': 87.3,
      'Bare-Metal': 8.2,
      'Bioabsorbable': 4.5,
    },
    complexityScores: [23, 28, 34, 29, 31], // SYNTAX scores
    outcomesByComplexity: {
      'Low (≤22)': 98.2, // Success rate
      'Intermediate (23-32)': 94.7,
      'High (≥33)': 89.3,
    },
  },
  
  cabgAnalytics: {
    drgCodes: ['231', '232', '233', '234', '235', '236'],
    graftTypes: {
      'LIMA to LAD': 96.8,
      'SVG': 78.4,
      'Radial Artery': 23.1,
      'RIMA': 12.7,
    },
    arterialGraftRate: 94.7,
    bimaUsage: 23.1,
    onPumpVsOffPump: {
      'On-Pump': 76.3,
      'Off-Pump': 23.7,
    },
    qualityMetrics: {
      strokeRate: 1.2,
      readmissionRate: 6.8,
      mortalityRate: 2.1,
      lengthOfStay: 7.3,
    },
  },
  
  syntaxIntegration: {
    syntaxScores: [15, 23, 28, 31, 34, 29, 22, 27],
    recommendedTreatment: ['PCI', 'PCI', 'CABG', 'CABG', 'CABG', 'CABG', 'PCI', 'CABG'],
    actualTreatment: ['PCI', 'PCI', 'CABG', 'PCI', 'CABG', 'CABG', 'PCI', 'CABG'],
    concordanceRate: 87.5, // 7 out of 8 cases followed recommendation
  },
};

// Electrophysiology Claims Data
export const epClaimsData: EPClaimsAnalytics = {
  deviceImplantation: {
    drgCodes: ['242', '243', '244', '245'],
    deviceTypes: {
      'Single-Chamber ICD': 23.4,
      'Dual-Chamber ICD': 45.6,
      'CRT-D': 18.9,
      'CRT-P': 8.7,
      'Single-Chamber PPM': 15.8,
      'Dual-Chamber PPM': 34.2,
    },
    manufacturers: {
      'Medtronic': 42.3,
      'Abbott': 28.7,
      'Boston Scientific': 19.4,
      'Biotronik': 9.6,
    },
    complicationRates: {
      'Lead Dislodgement': 2.3,
      'Infection': 0.8,
      'Pneumothorax': 1.4,
      'Hematoma': 3.2,
    },
    reimbursementByDevice: {
      'CRT-D': 45670,
      'Dual-Chamber ICD': 38420,
      'Single-Chamber ICD': 32150,
      'CRT-P': 28750,
    },
  },
  
  ablationProcedures: {
    cptCodes: ['93656', '93657', '93658'],
    afibTypes: {
      'Paroxysmal': 48.3,
      'Persistent': 34.7,
      'Long-standing Persistent': 17.0,
    },
    successRates: {
      'Paroxysmal': 84.2,
      'Persistent': 72.8,
      'Long-standing Persistent': 58.4,
    },
    reablationRates: {
      'Paroxysmal': 12.3,
      'Persistent': 22.7,
      'Long-standing Persistent': 34.8,
    },
    costEffectiveness: {
      'Paroxysmal': 23450, // Cost per QALY
      'Persistent': 34780,
      'Long-standing Persistent': 48920,
    },
  },
  
  laacAnalytics: {
    deviceSuccess: 96.8,
    complicationRates: 4.2,
    strokeReduction: 73.4,
    costComparison: {
      'LAAC Device': 18750,
      'Lifetime Anticoagulation': 45680,
      'Net Savings': 26930,
    },
  },
};

// Revenue Cycle Metrics
export const revenueCycleData: RevenueCycleMetrics = {
  drgOptimization: {
    potentialUpcoding: [
      {
        currentDRG: '291',
        potentialDRG: '292',
        revenueImpact: 2340,
        documentationNeeded: ['Comorbidity documentation', 'Severity indicators'],
        confidence: 87,
        timeframe: '72 hours',
      },
      {
        currentDRG: '292',
        potentialDRG: '293',
        revenueImpact: 4680,
        documentationNeeded: ['MCC documentation', 'Complication details'],
        confidence: 92,
        timeframe: '48 hours',
      },
    ],
    documentationGaps: [], // Will be populated below
    denyProbability: {
      '291': 8.2,
      '292': 12.4,
      '293': 18.7,
    },
    cmiOpportunities: 0.23, // Potential CMI increase
  },
  
  pricingAnalysis: {
    competitivePositioning: [
      {
        serviceCategory: 'PCI',
        ourPrice: 18750,
        marketMedian: 17890,
        percentile: 65,
        competitorPrices: {
          'Competitor A': 16450,
          'Competitor B': 19230,
          'Competitor C': 17680,
        },
        recommendation: 'Consider 5% price reduction to improve competitiveness',
      },
    ],
    contractPerformance: [
      {
        payerName: 'Medicare',
        contractedRates: { 'DRG246': 18750, 'DRG247': 16420 },
        actualPayments: { 'DRG246': 18750, 'DRG247': 16420 },
        denialRates: { 'DRG246': 3.2, 'DRG247': 5.8 },
        avgDaysToPayment: 28,
        totalVolume: 234,
        totalRevenue: 4230000,
      },
    ],
    bundledPaymentTracking: [
      {
        bundleName: 'Cardiovascular Surgery Bundle',
        targetPrice: 85000,
        actualCost: 78500,
        margin: 6500,
        volumeTargets: { 'CABG': 150, 'Valve': 75 },
        qualityBonuses: { 'Readmission': 2500, 'Infection': 1800 },
        riskSharing: true,
      },
    ],
    priceTransparency: {
      'PCI': 18750,
      'CABG': 45680,
      'Device Implant': 38420,
    },
  },
  
  cptProductivity: {
    providerEfficiency: [
      {
        providerId: 'CARD001',
        providerName: 'Dr. Sarah Chen',
        specialty: 'Interventional Cardiology',
        totalRVUs: 4567,
        avgRVUPerProcedure: 4.2,
        procedureVolume: { 'PCI': 89, 'Diagnostic Cath': 156 },
        qualityScores: { 'Door-to-Balloon': 94, 'Readmission': 6.2 },
        patientSatisfaction: 4.8,
        efficiency: 92,
      },
    ],
    procedureVolumeForecasting: [
      {
        serviceCategory: 'PCI',
        historicalVolume: [89, 92, 87, 94, 91],
        projectedVolume: [96, 98, 94, 101, 97],
        seasonalFactors: { 'Q1': 0.95, 'Q2': 1.02, 'Q3': 0.98, 'Q4': 1.05 },
        confidenceInterval: [88, 104],
        assumptions: ['No major staffing changes', 'Stable referral patterns'],
      },
    ],
    capacityOptimization: [
      {
        department: 'Cardiac Cath Lab',
        currentCapacity: 12, // procedures per day
        utilizedCapacity: 9.8,
        projectedDemand: 11.2,
        staffingNeeds: { 'RN': 2, 'Tech': 1 },
        equipmentNeeds: ['Additional C-arm'],
        costImplications: 145000,
      },
    ],
    rbuAnalysis: {
      'PCI': 4.67,
      'Diagnostic Cath': 2.34,
      'Echo': 1.23,
    },
  },
};

// Clinical Documentation Improvement Alerts
export const cdiAlerts: CDIAlert[] = [
  {
    patientId: 'HF-001',
    currentDiagnoses: ['I50.9 - Heart failure, unspecified'],
    suggestedAdditions: ['I50.23 - Acute on chronic systolic heart failure', 'N18.6 - End stage renal disease'],
    impactAnalysis: {
      severityChange: 2, // Increase severity level
      mortalityChange: 1, // Increase mortality risk
      reimbursementImpact: 4680,
      cmiImpact: 0.34,
    },
    priority: 'high',
    dueDate: '2025-10-22',
  },
  {
    patientId: 'CABG-002',
    currentDiagnoses: ['I25.10 - Atherosclerotic heart disease'],
    suggestedAdditions: ['E11.9 - Type 2 diabetes mellitus', 'I12.9 - Hypertensive chronic kidney disease'],
    impactAnalysis: {
      severityChange: 1,
      mortalityChange: 1,
      reimbursementImpact: 2340,
      cmiImpact: 0.18,
    },
    priority: 'medium',
    dueDate: '2025-10-23',
  },
];

// Sample detailed claims for individual cases
export const sampleClaims: ClaimsDataModel[] = [
  {
    claimId: 'CLM-HF-001',
    encounterId: 'ENC-2025-001234',
    ub04: {
      facilityInfo: {
        providerNumber: '123456',
        facilityName: 'TAILRD Medical Center',
        address: '123 Medical Blvd, Healthcare City, HC 12345',
        taxId: '12-3456789',
        npi: '1234567890',
      },
      patientInfo: {
        mrn: 'MRN-123456',
        accountNumber: 'ACC-789012',
        patientName: 'Johnson, Maria',
        dateOfBirth: '1962-05-15',
        gender: 'F',
        address: '456 Patient St, City, ST 54321',
        admissionDate: '2025-10-15',
        dischargeDate: '2025-10-19',
        lengthOfStay: 4,
        admissionType: 'Emergency',
        admissionSource: 'Emergency Room',
        patientStatus: 'Home',
      },
      payerInfo: {
        primaryPayer: 'Medicare Part A',
        membershipNumber: '1234567890A',
        planName: 'Traditional Medicare',
        eligibilityVerified: true,
      },
      chargeDetails: [
        {
          serviceDate: '2025-10-15',
          revenueCode: '0450',
          description: 'Emergency Room',
          cptCode: '99284',
          units: 1,
          unitPrice: 890,
          totalCharge: 890,
          department: 'Emergency',
          provider: 'Dr. Emergency',
        },
        {
          serviceDate: '2025-10-16',
          revenueCode: '0200',
          description: 'ICU',
          cptCode: '99233',
          units: 1,
          unitPrice: 1250,
          totalCharge: 1250,
          department: 'ICU',
          provider: 'Dr. Intensivist',
        },
      ],
      totalCharges: 18750,
      totalPayments: 16420,
      totalAdjustments: 1890,
      netRevenue: 14530,
    },
    primaryDiagnosis: {
      code: 'I50.23',
      description: 'Acute on chronic systolic heart failure',
      category: 'Cardiovascular',
      severity: 'severe',
      chronic: true,
      hccCategory: 'HCC85',
      riskWeight: 0.323,
    },
    secondaryDiagnoses: [
      {
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine',
        severity: 'moderate',
        chronic: true,
        hccCategory: 'HCC19',
        riskWeight: 0.104,
      },
      {
        code: 'I10',
        description: 'Essential hypertension',
        category: 'Cardiovascular',
        severity: 'minor',
        chronic: true,
      },
    ],
    procedures: {
      icdProcedures: [],
      cptCodes: [
        {
          code: '93306',
          description: 'Echocardiography, transthoracic',
          category: 'Diagnostic',
          rbrvs: 1.23,
          totalRVU: 1.23,
        },
      ],
    },
    drg: {
      msdrg: '293',
      description: 'Heart failure & shock w MCC',
      mdc: '05',
      type: 'medical',
      severity: 3,
      mortality: 2,
      expectedLOS: 5.2,
      geometricMeanLOS: 4.8,
      arithmeticMeanLOS: 6.1,
      nationalPayment: 8450,
      localPayment: 8920,
      cmi: 1.68,
    },
    financials: {
      expectedReimbursement: 8920,
      actualReimbursement: 8920,
      costOfCare: 7250,
      margin: 1670,
      marginPercentage: 18.7,
      daysToPayment: 28,
      denialStatus: 'approved',
    },
    quality: {
      complicationPresent: false,
      hospitalAcquiredCondition: false,
      presentOnAdmission: {
        'I50.23': true,
        'E11.9': true,
        'I10': true,
      },
      qualityIndicators: ['Core Measure HF-1', 'Readmission Risk'],
      riskAdjustedExpectedOutcome: {
        mortality: 3.2,
        readmission: 15.8,
        lengthOfStay: 5.2,
      },
    },
    createdAt: '2025-10-15T08:30:00Z',
    updatedAt: '2025-10-19T16:45:00Z',
    processedAt: '2025-10-20T09:15:00Z',
  },
];

export default {
  hfClaimsData,
  coronaryClaimsData,
  epClaimsData,
  revenueCycleData,
  cdiAlerts,
  sampleClaims,
};