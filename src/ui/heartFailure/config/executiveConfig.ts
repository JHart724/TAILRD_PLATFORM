import { ExecutiveViewConfig } from '../../../components/shared/BaseExecutiveView';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';
import { PLATFORM_TOTALS, formatDollars, formatPatients } from '../../../data/platformTotals';
// ProSummaryCard is used via ExecutiveViewConfig.proSummary

// DRG opportunities are patient-level and must come from the backend — never
// hardcoded. The Executive view populates this array from the HF dashboard
// response at runtime; config exports an empty default so static imports work.
const hfDRGOpportunities: DRGOpportunity[] = [];

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