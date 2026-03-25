import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';
import { PLATFORM_TOTALS, formatDollars, formatPatients } from '../../../data/platformTotals';
// ProSummaryCard is used via ExecutiveViewConfig.proSummary

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
 totalOpportunity: formatDollars(PLATFORM_TOTALS.modules.hf.opportunity),
 totalOpportunitySub: 'Annual revenue potential (+$4.6M from 87-gap initiative: adds Hyponatremia, NP Monitoring, Cardiac MRI New CM, Stage D Palliative Care, Diuretic Resistance, Predischarge NT-proBNP to existing HF gaps)',
 totalPatients: formatPatients(PLATFORM_TOTALS.modules.hf.patients),
 totalPatientsSub: 'Active HF care panel — includes 2,946 newly identified gap patients across 23 HF gaps (2,354 original + 592 new: Hyponatremia 89, NP Monitoring 234, Cardiac MRI 67, Stage D Palliative 34, Diuretic Resistance 56, Predischarge NP 112)',
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
  ],
  proSummary: {
 title: 'Patient-Reported Outcomes (KCCQ)',
 metrics: [
 { label: 'Population Mean KCCQ', value: '47.3', isPositive: true },
 { label: 'Patients Below Threshold (<60)', value: '312', isPositive: false },
 { label: 'Mean Improvement — Actioned', value: '+14.2 pts', isPositive: true },
 { label: 'Trend vs Prior Quarter', value: '\u2191 Improving', isPositive: true },
 ],
  }
};