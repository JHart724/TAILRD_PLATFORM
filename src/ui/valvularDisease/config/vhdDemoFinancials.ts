/**
 * Single-source DEMO financial model for the VHD (Valvular Disease) Executive tier.
 *
 * VHD Exec convergence (AUDIT-304 replication of the HF/EP/SH/CAD exemplar): the tier
 * conflated PROGRAM REVENUE (a $51.7M SharedROIWaterfall whose own total disagreed with
 * its $50.2M category sum, $38.2M realized, ~$55M-annualized monthly data, a $58M CSV
 * target) with GAP-CLOSURE OPPORTUNITY (a ~$5.3M predictive / $3.1M pipeline / $2.8M
 * at-risk cluster with a $1.8M+$0.6M=$2.4M != $2.8M break). Per the operator ruling
 * (CAD precedent) the tier's thesis is gap-closure opportunity, so it anchors on the
 * $5.3M identified-opportunity figure (the VHD analog of HF 6.2 / EP 8.9 / SH 10.9 /
 * CAD 11.2); the ~$50M program-revenue numbers are a DIFFERENT quantity and are removed
 * from this tier. No backend revenue source exists (the VHD dashboard endpoint emits
 * gap/patient counts only), so per AUDIT-141 these stay DEMO numbers - but they must be
 * ONE internally-consistent model, every card a stated decomposition of the same $5.3M
 * total, and the waterfall total is the category sum BY CONSTRUCTION.
 *
 * Invariants (enforced by vhdexec.convergence.test.tsx):
 *   - waterfall components sum to ANNUAL_OPPORTUNITY ; roiCategories sum === total
 *   - ytdCaptured === waterfall.realized
 *   - pipeline quarters sum === pipeline total === annual - realized
 *   - atRisk.immediate + atRisk.deferral === atRisk.cumulative12Month <= remaining
 *   - predictive.totalIdentifiedRevenue === annual ; quarterlyActionable === pipeline Q1
 *   - pvr.totalRealized === waterfall.realized ; pvr.gap === atRisk.immediate ; projected = realized + gap
 *
 * Do NOT wire any of this to an API field that does not exist (DRIFT-50).
 */

// The single annual gap-closure-opportunity total (demo), in $M - the ruled anchor
// (= the old predictive totalIdentified), NOT the ~$50M program-revenue figures.
export const VHD_DEMO_ANNUAL_OPPORTUNITY_M = 5.3;

// Decomposition by intervention category (drives the single SharedROIWaterfall). Re-scoped
// from the removed $50.2M program-revenue categories to sum to the $5.3M gap opportunity.
export const VHD_DEMO_WATERFALL = {
  surgicalInterventional_revenue: 1.9,
  valveSeverity_revenue: 1.3,
  echoIntegration_revenue: 0.9,
  guidelineImplementation_revenue: 0.7,
  followUpProtocol_revenue: 0.5,
  total_revenue: VHD_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: 1.9,
};

// The single ROI-waterfall category array (dollars), derived from the waterfall model so
// the waterfall total can never again diverge from the sum of its bars ($51.7M vs $50.2M).
export const VHD_DEMO_ROI_CATEGORIES = [
  { label: 'Surgical vs Interventional', value: VHD_DEMO_WATERFALL.surgicalInterventional_revenue * 1_000_000, color: '#8B6914' },
  { label: 'Valve Severity Assessment', value: VHD_DEMO_WATERFALL.valveSeverity_revenue * 1_000_000, color: '#1E3347' },
  { label: 'Echo Integration', value: VHD_DEMO_WATERFALL.echoIntegration_revenue * 1_000_000, color: '#2C4A60' },
  { label: 'Guideline Implementation', value: VHD_DEMO_WATERFALL.guidelineImplementation_revenue * 1_000_000, color: '#3E6275' },
  { label: 'Follow-up Protocol', value: VHD_DEMO_WATERFALL.followUpProtocol_revenue * 1_000_000, color: '#4A6880' },
];

// Category detail for the waterfall drill-down modal (same decomposition, $ + patients).
export const VHD_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  'Surgical vs Interventional': { revenue: 1900000, patientCount: 134 },
  'Valve Severity Assessment': { revenue: 1300000, patientCount: 56 },
  'Echo Integration': { revenue: 900000, patientCount: 34 },
  'Guideline Implementation': { revenue: 700000, patientCount: 31 },
  'Follow-up Protocol': { revenue: 500000, patientCount: 28 },
};

// YTD captured value = the realized slice of the same model.
export const VHD_DEMO_YTD_CAPTURED_M = VHD_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized).
export const VHD_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 1300000, procedures: 12, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 900000, procedures: 9, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 700000, procedures: 6, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 500000, procedures: 4, confidence: 'low' as const },
  ],
  totalProjected12Month: 3400000, // = (5.3 - 1.9) * 1e6
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
// Fixes the prior $1.8M+$0.6M=$2.4M != $2.8M cumulative break.
export const VHD_DEMO_AT_RISK = {
  immediatePatients: 31,
  immediateRevenue: 1800000,
  deferralRevenue: 600000,
  cumulativeRisk12Month: 2400000, // = immediate + deferral
  deferralCostPerMonth: 200000, // = cumulative / 12
};

// Predictive banner dollars, reconciled to the same model.
export const VHD_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 5300000, // = annual opportunity
  quarterlyActionableRevenue: 1300000, // = Q1 pipeline
  projectedRevenueCurrentRate: 1900000, // = realized run-rate
  projectedRevenueSystematic: 4700000, // ~90% capture under systematic outreach
};

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($1.9M)
//   gap             = the immediate at-risk slice ($1.8M), tying the amber Gap card
//                     to the at-risk decomposition above
//   total projected = realized + gap ($3.7M), derived - never hand-typed
const PVR_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const PVR_WEIGHTS_BP = [750, 800, 900, 950, 1000, 1050, 1050, 1100, 1150, 1250]; // sums to 10000

function distributeByWeights(total: number): number[] {
  const out: number[] = [];
  let allocated = 0;
  for (let i = 0; i < PVR_WEIGHTS_BP.length; i++) {
    if (i === PVR_WEIGHTS_BP.length - 1) {
      out.push(total - allocated); // absorb rounding: exact sum by construction
    } else {
      const v = Math.round((total * PVR_WEIGHTS_BP[i]) / 10000);
      out.push(v);
      allocated += v;
    }
  }
  return out;
}

const pvrTotalRealized = VHD_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = VHD_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const VHD_DEMO_PVR = {
  totalProjected: pvrTotalProjected,
  totalRealized: pvrTotalRealized,
  gap: pvrGap,
  months: PVR_MONTH_LABELS.map((month, i) => ({
    month,
    projected: pvrProjectedByMonth[i],
    realized: pvrRealizedByMonth[i],
  })),
};

// Gap-composition donut (DEMO): illustrative category split. The GapIntelligenceCard
// headline reads the LIVE totalOpenGaps + real totalPatients (see ValvularExecutiveView);
// this composition detail is demo-badged, not a population figure.
export const VHD_DEMO_CATEGORIES = [
  { name: 'Quality', patients: 313, color: '#C8D4DC' },
  { name: 'Safety', patients: 59, color: '#9B2438' },
];
export const VHD_DEMO_CATEGORY_PATIENT_SUM = VHD_DEMO_CATEGORIES.reduce((s, c) => s + c.patients, 0);

// Top gaps by illustrative $ opportunity (DEMO; per-gap estimates, not a decomposition
// of the annual model).
export const VHD_DEMO_TOPGAPS = [
  { name: 'Moderate AS Surveillance', patients: 134, opportunity: '$1.8M' },
  { name: 'BAV Aortopathy', patients: 56, opportunity: '$1.2M' },
  { name: 'HALT Screening', patients: 31, opportunity: '$620K' },
  { name: 'Post-TAVR Echo', patients: 34, opportunity: '$420K' },
  { name: 'Rheumatic MS', patients: 28, opportunity: '$340K' },
];

// Safety-alert summary (DEMO).
export const VHD_DEMO_SAFETY_ALERT = 'CRITICAL: 31 patients / HIGH: 28 patients';

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
