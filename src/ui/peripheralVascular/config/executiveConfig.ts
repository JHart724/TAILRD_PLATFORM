import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';
import { PLATFORM_TOTALS, formatDollars, formatPatients } from '../../../data/platformTotals';

// Peripheral Vascular DRG Optimization Opportunities
const peripheralVascularDRGOpportunities: DRGOpportunity[] = [
  {
 currentDRG: '253',
 currentDRGDescription: 'Other Vascular Procedures w/o CC/MCC',
 potentialDRG: '252',
 potentialDRGDescription: 'Other Vascular Procedures w CC',
 revenueImpact: 7240,
 documentationNeeded: ['Diabetes complications', 'Chronic kidney disease', 'CAD documentation'],
 confidence: 89,
 timeframe: '2 days',
 priority: 'high',
 patientName: 'Martinez, Carlos',
 mrn: 'MRN-PV-18923'
  },
  {
 currentDRG: '254',
 currentDRGDescription: 'Other Vascular Procedures w/o CC/MCC',
 potentialDRG: '252',
 potentialDRGDescription: 'Other Vascular Procedures w CC',
 revenueImpact: 6180,
 documentationNeeded: ['PAD severity classification', 'Wound care complexity', 'Comorbidity documentation'],
 confidence: 82,
 timeframe: '3 days',
 priority: 'high',
 patientName: 'Thompson, Sarah',
 mrn: 'MRN-PV-18756'
  },
  {
 currentDRG: '253',
 currentDRGDescription: 'Other Vascular Procedures w/o CC/MCC',
 potentialDRG: '251',
 potentialDRGDescription: 'Other Vascular Procedures w MCC',
 revenueImpact: 9420,
 documentationNeeded: ['Critical limb ischemia severity', 'Tissue loss documentation', 'Infection complexity'],
 confidence: 91,
 timeframe: '1 day',
 priority: 'high',
 patientName: 'Wilson, Michael',
 mrn: 'MRN-PV-18834'
  },
  {
 currentDRG: '254',
 currentDRGDescription: 'Other Vascular Procedures w/o CC/MCC',
 potentialDRG: '253',
 potentialDRGDescription: 'Other Vascular Procedures w CC',
 revenueImpact: 4890,
 documentationNeeded: ['Hypertension complexity', 'Diabetes type specification', 'Renal function status'],
 confidence: 76,
 timeframe: '4 days',
 priority: 'medium',
 patientName: 'Garcia, Elena',
 mrn: 'MRN-PV-18692'
  }
];

export const peripheralVascularConfig: ExecutiveViewConfig = {
  moduleName: 'Peripheral Vascular',
  description: '• PAD • Critical Limb Ischemia • Limb Salvage Analytics',
  kpiData: {
 totalOpportunity: formatDollars(PLATFORM_TOTALS.modules.pv.opportunity),
 totalOpportunitySub: 'Annual revenue potential (+$3.0M from 87-gap initiative: adds Chronic Venous Ulcer, Unprovoked VTE Extended AC, IVC Filter Safety, May-Thurner to existing peripheral vascular gaps)',
 totalPatients: formatPatients(PLATFORM_TOTALS.modules.pv.patients),
 totalPatientsSub: 'Active PAD care panel — includes 961 new gap patients (768 original + 193 new: Venous Ulcer 47, Unprovoked VTE 89, IVC Filter 34, May-Thurner 23); COMPASS polyvascular (112) counted in CAD module',
 gdmtOptimization: '62%',
 gdmtOptimizationSub: 'Optimal therapy rate',
 avgRoi: '$5,000',
 avgRoiSub: 'Per patient annually',
  },
  drgTitle: 'Peripheral Vascular DRG Financial Performance',
  drgDescription: 'DRG 251-254 revenue analysis and case mix optimization',
  drgOpportunities: peripheralVascularDRGOpportunities,
  drgMetrics: {
 currentCMI: '1.74',
 monthlyOpportunity: '+$189K',
 documentationRate: '84.6%',
 avgLOS: '3.8 days',
 losBenchmark: '-0.6 days vs benchmark'
  },
  drgPerformanceCards: [
 {
 title: 'DRG 251 (w MCC)',
 value: '$52,180',
 caseCount: 'Average reimbursement • 184 cases YTD',
 variance: '+$9.1K above national average',
 isPositive: true
 },
 {
 title: 'DRG 252 (w CC)',
 value: '$36,420',
 caseCount: 'Average reimbursement • 423 cases YTD',
 variance: '+$3.8K above national average',
 isPositive: true
 },
 {
 title: 'DRG 253 (w/o CC/MCC)',
 value: '$24,180',
 caseCount: 'Average reimbursement • 298 cases YTD',
 variance: '-$2.1K below national average',
 isPositive: false
 }
  ]
};