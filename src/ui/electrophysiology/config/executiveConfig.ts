import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';

// Electrophysiology DRG 241-244 Optimization Opportunities
const epDRGOpportunities: DRGOpportunity[] = [
  {
    currentDRG: '242',
    currentDRGDescription: 'Permanent Cardiac Pacemaker Implant w/o CC/MCC',
    potentialDRG: '241',
    potentialDRGDescription: 'Permanent Cardiac Pacemaker Implant w CC',
    revenueImpact: 8420,
    documentationNeeded: ['Heart failure documentation', 'Diabetes complications', 'Chronic kidney disease'],
    confidence: 92,
    timeframe: '2 days',
    priority: 'high',
    patientName: 'Anderson, Mary',
    mrn: 'MRN-EP-18923'
  },
  {
    currentDRG: '243',
    currentDRGDescription: 'Permanent Cardiac Pacemaker Implant w/o CC/MCC',
    potentialDRG: '242',
    potentialDRGDescription: 'Permanent Cardiac Pacemaker Implant w CC',
    revenueImpact: 6180,
    documentationNeeded: ['Atrial fibrillation complexity', 'Bradycardia documentation', 'Device complications'],
    confidence: 85,
    timeframe: '3 days',
    priority: 'high',
    patientName: 'Chen, Robert',
    mrn: 'MRN-EP-18756'
  },
  {
    currentDRG: '244',
    currentDRGDescription: 'Permanent Cardiac Pacemaker Implant w/o CC/MCC',
    potentialDRG: '242',
    potentialDRGDescription: 'Permanent Cardiac Pacemaker Implant w CC',
    revenueImpact: 5750,
    documentationNeeded: ['Syncope complexity', 'Bundle branch block', 'Electrolyte disorders'],
    confidence: 88,
    timeframe: '4 days',
    priority: 'medium',
    patientName: 'Rodriguez, Patricia',
    mrn: 'MRN-EP-18612'
  }
];

export const electrophysiologyConfig: ExecutiveViewConfig = {
  moduleName: 'Electrophysiology',
  description: '• Device Optimization • Ablation Analytics • LAAC Outcomes',
  kpiData: {
    totalOpportunity: '$78.2M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '3,000',
    totalPatientsSub: 'Active EP care panel (20% of AF population)',
    gdmtOptimization: '87%',
    gdmtOptimizationSub: 'Anticoagulation optimization rate',
    avgRoi: '$5,213',
    avgRoiSub: 'Per patient annually',
  },
  drgTitle: 'Electrophysiology DRG Financial Performance',
  drgDescription: 'DRG 241-244 device implant revenue analysis and case mix optimization',
  drgOpportunities: epDRGOpportunities,
  drgMetrics: {
    currentCMI: '3.42',
    monthlyOpportunity: '+$472K',
    documentationRate: '94.7%',
    avgLOS: '2.1 days',
    losBenchmark: '-0.4 days vs benchmark'
  },
  drgPerformanceCards: [
    {
      title: 'DRG 241 (Pacemaker w MCC)',
      value: '$127,340',
      caseCount: 'Average reimbursement • 45 cases YTD',
      variance: '+$18.7K above national average',
      isPositive: true
    },
    {
      title: 'DRG 242 (Pacemaker w CC)',
      value: '$89,760',
      caseCount: 'Average reimbursement • 135 cases YTD',
      variance: '+$12.4K above national average',
      isPositive: true
    },
    {
      title: 'DRG 244 (Pacemaker w/o CC/MCC)',
      value: '$67,420',
      caseCount: 'Average reimbursement • 120 cases YTD',
      variance: '-$3.2K below national average',
      isPositive: false
    }
  ]
};