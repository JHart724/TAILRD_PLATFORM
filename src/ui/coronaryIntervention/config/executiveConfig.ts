import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';
import { PLATFORM_TOTALS, formatDollars, formatPatients } from '../../../data/platformTotals';

// Coronary Intervention DRG Optimization Opportunities
const coronaryDRGOpportunities: DRGOpportunity[] = [
  {
 currentDRG: '247',
 currentDRGDescription: 'Percutaneous Cardiovascular Procedure w/o Drug-Eluting Stent w/o MCC',
 potentialDRG: '246',
 potentialDRGDescription: 'Percutaneous Cardiovascular Procedure w Drug-Eluting Stent w MCC',
 revenueImpact: 11850,
 documentationNeeded: ['Drug-eluting stent documentation', 'Acute MI complexity', 'Multiple vessel involvement'],
 confidence: 87,
 timeframe: '2 days',
 priority: 'high',
 patientName: 'Anderson, Michael',
 mrn: 'MRN-CI-17892'
  },
  {
 currentDRG: '248',
 currentDRGDescription: 'Percutaneous Cardiovascular Procedure w/o Drug-Eluting Stent w/o MCC',
 potentialDRG: '247',
 potentialDRGDescription: 'Percutaneous Cardiovascular Procedure w Drug-Eluting Stent w/o MCC',
 revenueImpact: 7420,
 documentationNeeded: ['Stent type documentation', 'Lesion complexity', 'Procedural complications'],
 confidence: 92,
 timeframe: '1 day',
 priority: 'high',
 patientName: 'Garcia, Sofia',
 mrn: 'MRN-CI-17834'
  },
  {
 currentDRG: '249',
 currentDRGDescription: 'Percutaneous Cardiovascular Procedure w/o Drug-Eluting Stent w CC',
 potentialDRG: '247',
 potentialDRGDescription: 'Percutaneous Cardiovascular Procedure w Drug-Eluting Stent w/o MCC',
 revenueImpact: 5680,
 documentationNeeded: ['Device specifications', 'Procedure complexity', 'Post-procedural monitoring'],
 confidence: 89,
 timeframe: '3 days',
 priority: 'medium',
 patientName: 'Johnson, David',
 mrn: 'MRN-CI-17756'
  }
];

export const coronaryInterventionConfig: ExecutiveViewConfig = {
  moduleName: 'Coronary Intervention',
  description: '• PCI Analytics • STEMI/NSTEMI Outcomes • Stent Optimization',
  kpiData: {
 totalOpportunity: formatDollars(PLATFORM_TOTALS.modules.cad.opportunity),
 totalOpportunitySub: 'Annual revenue potential (+$20.6M from 87-gap initiative: adds Heart Team Review, Complete Revasc, CTO PCI, Intravascular Imaging, DAPT Safety, FFR/iFR, Post-ACS PCSK9i, OAC Monotherapy, CCTA, Ranolazine Refractory, BB Deprescribing, INOCA, Bempedoic Acid, Icosapent Ethyl, Post-CABG Surveillance, Vasospastic Angina, hs-TnT, Bilateral IMA to existing CAD gaps)',
 totalPatients: formatPatients(PLATFORM_TOTALS.modules.cad.patients),
 totalPatientsSub: 'Active intervention panel — includes 3,495 newly identified gap patients (1,534 original + 1,961 new 87-gap: Heart Team 134, Complete Revasc 89, CTO 47, IV Imaging 112, DAPT 67, FFR/iFR 78, Post-ACS PCSK9i 58, OAC Mono 143, CCTA 167, Ranolazine 89, BB Deprescribing 198, INOCA 78, Bempedoic 67, Icosapent 134, CABG Surveillance 112, Vasospasm 43, hs-TnT 89, BIMA 56)',
 gdmtOptimization: '94%',
 gdmtOptimizationSub: 'Procedural success rate',
 avgRoi: '$5,332',
 avgRoiSub: 'Per patient annually',
  },
  drgTitle: 'Coronary Intervention DRG Financial Performance',
  drgDescription: 'DRG 246-249 percutaneous cardiovascular procedure revenue analysis',
  drgOpportunities: coronaryDRGOpportunities,
  drgMetrics: {
 currentCMI: '2.94',
 monthlyOpportunity: '+$423K',
 documentationRate: '93.8%',
 avgLOS: '2.8 days',
 losBenchmark: '-0.6 days vs benchmark'
  },
  drgPerformanceCards: [
 {
 title: 'DRG 246 (PCI w DES w MCC)',
 value: '$67,890',
 caseCount: 'Average reimbursement • 186 cases YTD',
 variance: '+$11.3K above national average',
 isPositive: true
 },
 {
 title: 'DRG 247 (PCI w DES w/o MCC)',
 value: '$42,680',
 caseCount: 'Average reimbursement • 867 cases YTD',
 variance: '+$6.8K above national average',
 isPositive: true
 },
 {
 title: 'DRG 249 (PCI w/o DES w CC)',
 value: '$28,420',
 caseCount: 'Average reimbursement • 497 cases YTD',
 variance: '-$1.9K below national average',
 isPositive: false
 }
  ]
};