import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';

// Structural Heart DRG Optimization Opportunities
const structuralHeartDRGOpportunities: DRGOpportunity[] = [
  {
    currentDRG: '266',
    currentDRGDescription: 'Endovascular Cardiac Valve Replacement w/o MCC',
    potentialDRG: '265',
    potentialDRGDescription: 'Endovascular Cardiac Valve Replacement w MCC',
    revenueImpact: 12420,
    documentationNeeded: ['Chronic kidney disease stage', 'Heart failure severity', 'Respiratory complications'],
    confidence: 89,
    timeframe: '2 days',
    priority: 'high',
    patientName: 'Thompson, Elizabeth',
    mrn: 'MRN-SH-19234'
  },
  {
    currentDRG: '267',
    currentDRGDescription: 'Endovascular Cardiac Valve Replacement w/o CC/MCC',
    potentialDRG: '266',
    potentialDRGDescription: 'Endovascular Cardiac Valve Replacement w/o MCC',
    revenueImpact: 8750,
    documentationNeeded: ['Diabetes complications', 'Peripheral vascular disease', 'Hypertension with target organ damage'],
    confidence: 84,
    timeframe: '3 days',
    priority: 'high',
    patientName: 'Martinez, Carlos',
    mrn: 'MRN-SH-19187'
  },
  {
    currentDRG: '268',
    currentDRGDescription: 'Aortic and Heart Assist Procedures w/o MCC',
    potentialDRG: '266',
    potentialDRGDescription: 'Endovascular Cardiac Valve Replacement w/o MCC',
    revenueImpact: 6890,
    documentationNeeded: ['Procedure complexity documentation', 'Comorbidity severity', 'Post-procedural complications'],
    confidence: 91,
    timeframe: '1 day',
    priority: 'medium',
    patientName: 'Wilson, Margaret',
    mrn: 'MRN-SH-19156'
  }
];

export const structuralHeartConfig: ExecutiveViewConfig = {
  moduleName: 'Structural Heart',
  description: '• TAVR/SAVR Analytics • Mitral Interventions • Aortic Procedures',
  kpiData: {
    totalOpportunity: '$67.8M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '475',
    totalPatientsSub: 'Active procedure pipeline (annual structural cases)',
    gdmtOptimization: '92%',
    gdmtOptimizationSub: 'Procedural success rate',
    avgRoi: '$142,737',
    avgRoiSub: 'Per procedure',
  },
  drgTitle: 'Structural Heart DRG Financial Performance',
  drgDescription: 'DRG 265-268 valve replacement and cardiac assist revenue analysis',
  drgOpportunities: structuralHeartDRGOpportunities,
  drgMetrics: {
    currentCMI: '4.84',
    monthlyOpportunity: '+$687K',
    documentationRate: '96.3%',
    avgLOS: '4.7 days',
    losBenchmark: '-1.2 days vs benchmark'
  },
  drgPerformanceCards: [
    {
      title: 'DRG 265 (TAVR w MCC)',
      value: '$189,340',
      caseCount: 'Average reimbursement • 87 cases YTD',
      variance: '+$28.7K above national average',
      isPositive: true
    },
    {
      title: 'DRG 266 (TAVR w/o MCC)',
      value: '$142,680',
      caseCount: 'Average reimbursement • 163 cases YTD',
      variance: '+$19.4K above national average',
      isPositive: true
    },
    {
      title: 'DRG 268 (Aortic Assist w/o MCC)',
      value: '$98,420',
      caseCount: 'Average reimbursement • 225 cases YTD',
      variance: '-$4.8K below national average',
      isPositive: false
    }
  ]
};