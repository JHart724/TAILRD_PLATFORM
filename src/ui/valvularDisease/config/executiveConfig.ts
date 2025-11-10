import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';

// Valvular Disease DRG Optimization Opportunities
const valvularDiseaseDRGOpportunities: DRGOpportunity[] = [
  {
    currentDRG: '267',
    currentDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w/o CC/MCC',
    potentialDRG: '266',
    potentialDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w CC',
    revenueImpact: 12840,
    documentationNeeded: ['Diabetes complications', 'Chronic kidney disease', 'COPD severity'],
    confidence: 93,
    timeframe: '2 days',
    priority: 'high',
    patientName: 'Anderson, Patricia',
    mrn: 'MRN-VD-21456'
  },
  {
    currentDRG: '268',
    currentDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w/o CC/MCC',
    potentialDRG: '265',
    potentialDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w MCC',
    revenueImpact: 18920,
    documentationNeeded: ['Heart failure severity', 'Pulmonary hypertension documentation', 'Renal dysfunction'],
    confidence: 89,
    timeframe: '1 day',
    priority: 'high',
    patientName: 'Mitchell, James',
    mrn: 'MRN-VD-21378'
  },
  {
    currentDRG: '267',
    currentDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w/o CC/MCC',
    potentialDRG: '265',
    potentialDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w MCC',
    revenueImpact: 15670,
    documentationNeeded: ['Atrial fibrillation complexity', 'Anticoagulation complications', 'Bleeding risk factors'],
    confidence: 86,
    timeframe: '3 days',
    priority: 'high',
    patientName: 'Taylor, Margaret',
    mrn: 'MRN-VD-21289'
  },
  {
    currentDRG: '268',
    currentDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w/o CC/MCC',
    potentialDRG: '267',
    potentialDRGDescription: 'Cardiac Valve & Oth Major Cardiothoracic Proc w/o Card Cath w CC',
    revenueImpact: 8450,
    documentationNeeded: ['Hypertension complexity', 'CAD documentation', 'Medication management'],
    confidence: 79,
    timeframe: '4 days',
    priority: 'medium',
    patientName: 'Brown, William',
    mrn: 'MRN-VD-21234'
  }
];

export const valvularDiseaseConfig: ExecutiveViewConfig = {
  moduleName: 'Valvular Disease',
  description: '• SAVR • Mitral Interventions • Aortic Valve Procedures',
  kpiData: {
    totalOpportunity: '$78.1M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '1,875',
    totalPatientsSub: 'Active valvular care panel (15% of severe valvular patients)',
    gdmtOptimization: '71%',
    gdmtOptimizationSub: 'Optimal therapy rate',
    avgRoi: '$6,248',
    avgRoiSub: 'Per patient annually',
  },
  drgTitle: 'Valvular Disease DRG Financial Performance',
  drgDescription: 'DRG 265-268 revenue analysis and case mix optimization',
  drgOpportunities: valvularDiseaseDRGOpportunities,
  drgMetrics: {
    currentCMI: '2.12',
    monthlyOpportunity: '+$312K',
    documentationRate: '91.4%',
    avgLOS: '6.8 days',
    losBenchmark: '-1.2 days vs benchmark'
  },
  drgPerformanceCards: [
    {
      title: 'DRG 265 (w MCC)',
      value: '$89,750',
      caseCount: 'Average reimbursement • 156 cases YTD',
      variance: '+$12.4K above national average',
      isPositive: true
    },
    {
      title: 'DRG 266 (w CC)',
      value: '$64,280',
      caseCount: 'Average reimbursement • 287 cases YTD',
      variance: '+$7.8K above national average',
      isPositive: true
    },
    {
      title: 'DRG 267 (w/o CC/MCC)',
      value: '$42,180',
      caseCount: 'Average reimbursement • 198 cases YTD',
      variance: '-$3.2K below national average',
      isPositive: false
    }
  ]
};