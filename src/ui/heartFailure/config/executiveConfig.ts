import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';

// Heart Failure DRG 291-293 Optimization Opportunities
const hfDRGOpportunities: DRGOpportunity[] = [
  {
    currentDRG: '293',
    currentDRGDescription: 'Heart Failure & Shock w/o CC/MCC',
    potentialDRG: '291',
    potentialDRGDescription: 'Heart Failure & Shock w MCC',
    revenueImpact: 8420,
    documentationNeeded: ['Acute kidney injury documentation', 'Malnutrition severity', 'Respiratory failure'],
    confidence: 92,
    timeframe: '3 days',
    priority: 'high',
    patientName: 'Johnson, Mary',
    mrn: 'MRN-HF-15892'
  },
  {
    currentDRG: '292',
    currentDRGDescription: 'Heart Failure & Shock w CC',
    potentialDRG: '291',
    potentialDRGDescription: 'Heart Failure & Shock w MCC',
    revenueImpact: 6180,
    documentationNeeded: ['Chronic kidney disease stage', 'Diabetes complications', 'COPD exacerbation'],
    confidence: 85,
    timeframe: '2 days',
    priority: 'high',
    patientName: 'Davis, Robert',
    mrn: 'MRN-HF-15734'
  },
  {
    currentDRG: '293',
    currentDRGDescription: 'Heart Failure & Shock w/o CC/MCC',
    potentialDRG: '292',
    potentialDRGDescription: 'Heart Failure & Shock w CC',
    revenueImpact: 4750,
    documentationNeeded: ['Hypertension with complications', 'Atrial fibrillation type', 'Sleep apnea documentation'],
    confidence: 88,
    timeframe: '4 days',
    priority: 'medium',
    patientName: 'Wilson, Patricia',
    mrn: 'MRN-HF-15698'
  },
  {
    currentDRG: '292',
    currentDRGDescription: 'Heart Failure & Shock w CC',
    potentialDRG: '291',
    potentialDRGDescription: 'Heart Failure & Shock w MCC',
    revenueImpact: 7890,
    documentationNeeded: ['Acute on chronic heart failure', 'Cardiorenal syndrome', 'Medication intolerance'],
    confidence: 79,
    timeframe: '5 days',
    priority: 'medium',
    patientName: 'Brown, James',
    mrn: 'MRN-HF-15612'
  }
];

export const heartFailureConfig: ExecutiveViewConfig = {
  moduleName: 'Heart Failure',
  description: '• GDMT Optimization • HFrEF/HFpEF Analytics',
  kpiData: {
    totalOpportunity: '$42.8M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '7,700',
    totalPatientsSub: 'Active HF care panel (70% of diagnosed HF patients)',
    gdmtOptimization: '38%',
    gdmtOptimizationSub: 'At quadruple therapy (4,180 eligible)',
    avgRoi: '$3,891',
    avgRoiSub: 'Per patient annually',
  },
  drgTitle: 'Heart Failure DRG Financial Performance',
  drgDescription: 'DRG 291-293 revenue analysis and case mix optimization',
  drgOpportunities: hfDRGOpportunities,
  drgMetrics: {
    currentCMI: '2.28',
    monthlyOpportunity: '+$387K',
    documentationRate: '91.2%',
    avgLOS: '3.2 days',
    losBenchmark: '-0.8 days vs benchmark'
  },
  drgPerformanceCards: [
    {
      title: 'DRG 291 (w MCC)',
      value: '$78,940',
      caseCount: 'Average reimbursement • 456 cases YTD',
      variance: '+$14.2K above national average',
      isPositive: true
    },
    {
      title: 'DRG 292 (w CC)',
      value: '$52,680',
      caseCount: 'Average reimbursement • 823 cases YTD',
      variance: '+$8.4K above national average',
      isPositive: true
    },
    {
      title: 'DRG 293 (w/o CC/MCC)',
      value: '$38,420',
      caseCount: 'Average reimbursement • 612 cases YTD',
      variance: '-$2.1K below national average',
      isPositive: false
    }
  ]
};