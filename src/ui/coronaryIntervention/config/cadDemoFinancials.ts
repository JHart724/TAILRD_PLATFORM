/**
 * Single-source DEMO financial model for the CAD (Coronary Intervention) Executive tier.
 *
 * CAD Exec convergence (AUDIT-304 replication of the HF/EP/SH exemplar): the tier
 * previously rendered THREE-plus disagreeing revenue totals - two coexisting ROI
 * waterfalls ($70.9M SharedROIWaterfall vs $50.9M CADFinancialWaterfall), a $11.2M
 * predictive figure, a $6.6M pipeline, and ~$95M-annualized monthly data. Per the
 * operator ruling the tier's thesis is GAP-CLOSURE OPPORTUNITY, so it anchors on the
 * $11.2M identified-opportunity figure (the CAD analog of EP $8.9M / SH $10.9M); the
 * $70.9M / $50.9M / $52.2M program-revenue numbers are a DIFFERENT quantity (total
 * coronary program revenue) and are removed from this tier. No backend revenue source
 * exists (the CAD dashboard endpoint emits gap/patient counts only), so per AUDIT-141
 * these stay DEMO numbers - but they must be ONE internally-consistent model, every
 * card a stated decomposition of the same $11.2M total.
 *
 * Invariants (enforced by cadexec.convergence.test.tsx):
 *   - waterfall components sum to ANNUAL_OPPORTUNITY
 *   - roiCategories sum to ANNUAL_OPPORTUNITY (derived from the waterfall)
 *   - ytdCaptured === waterfall.realized
 *   - pipeline quarters sum === pipeline total === annual - realized
 *   - atRisk.immediate + atRisk.deferral === atRisk.cumulative12Month <= remaining
 *   - predictive.totalIdentifiedRevenue === annual ; quarterlyActionable === pipeline Q1
 *   - pvr.totalRealized === waterfall.realized ; pvr.gap === atRisk.immediate ; projected = realized + gap
 *
 * Do NOT wire any of this to an API field that does not exist (DRIFT-50).
 */

// The single annual gap-closure-opportunity total (demo), in $M - the ruled anchor
// (= the old predictive totalIdentified), NOT the 70.9M/50.9M program-revenue figures.
export const CAD_DEMO_ANNUAL_OPPORTUNITY_M = 11.2;

// Decomposition by intervention category (drives the single SharedROIWaterfall).
export const CAD_DEMO_WATERFALL = {
  complexPCI_revenue: 4.0,
  stemi_revenue: 3.0,
  ffr_revenue: 2.0,
  cathLab_revenue: 1.4,
  stent_revenue: 0.8,
  total_revenue: CAD_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: 4.1,
};

// The single ROI-waterfall category array (dollars), derived from the waterfall model
// so it can never drift from the $11.2M total. Replaces the removed 70.9M roiCategories.
export const CAD_DEMO_ROI_CATEGORIES = [
  { label: 'Complex PCI', value: CAD_DEMO_WATERFALL.complexPCI_revenue * 1_000_000, color: 'bg-porsche-500' },
  { label: 'STEMI Protocol', value: CAD_DEMO_WATERFALL.stemi_revenue * 1_000_000, color: 'bg-crimson-500' },
  { label: 'FFR/iFR Guidance', value: CAD_DEMO_WATERFALL.ffr_revenue * 1_000_000, color: 'bg-arterial-500' },
  { label: 'Cath Lab Efficiency', value: CAD_DEMO_WATERFALL.cathLab_revenue * 1_000_000, color: 'bg-teal-500' },
  { label: 'Stent Optimization', value: CAD_DEMO_WATERFALL.stent_revenue * 1_000_000, color: 'bg-[#64748b]' },
];

// Category detail for a waterfall drill-down (same decomposition, $ + patients).
export const CAD_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  'Complex PCI': { revenue: 4000000, patientCount: 180 },
  'STEMI Protocol': { revenue: 3000000, patientCount: 95 },
  'FFR/iFR Guidance': { revenue: 2000000, patientCount: 145 },
  'Cath Lab Efficiency': { revenue: 1400000, patientCount: 210 },
  'Stent Optimization': { revenue: 800000, patientCount: 340 },
};

// YTD captured value = the realized slice of the same model.
export const CAD_DEMO_YTD_CAPTURED_M = CAD_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized).
export const CAD_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 2600000, procedures: 32, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 2000000, procedures: 24, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 1500000, procedures: 18, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 1000000, procedures: 14, confidence: 'low' as const },
  ],
  totalProjected12Month: 7100000, // = (11.2 - 4.1) * 1e6
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
// Fixes the prior $3.4M+$2.2M=$5.6M != $7.8M cumulative break.
export const CAD_DEMO_AT_RISK = {
  immediatePatients: 156,
  immediateRevenue: 3400000,
  deferralRevenue: 2200000,
  cumulativeRisk12Month: 5600000, // = immediate + deferral
  deferralCostPerMonth: 466667, // = round(cumulative / 12)
};

// Predictive banner dollars, reconciled to the same model.
export const CAD_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 11200000, // = annual opportunity
  quarterlyActionableRevenue: 2600000, // = Q1 pipeline
  projectedRevenueCurrentRate: 4100000, // = realized run-rate
  projectedRevenueSystematic: 10000000, // ~90% capture under systematic outreach
};

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($4.1M)
//   gap             = the immediate at-risk slice ($3.4M), tying the amber Gap card
//                     to the at-risk decomposition above
//   total projected = realized + gap ($7.5M), derived - never hand-typed
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

const pvrTotalRealized = CAD_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = CAD_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const CAD_DEMO_PVR = {
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
// headline reads the LIVE totalOpenGaps + real totalPatients (see CoronaryExecutiveView);
// this composition detail is demo-badged, not a population figure.
export const CAD_DEMO_CATEGORIES = [
  { name: 'Therapy', patients: 900, color: '#2C4A60' },
  { name: 'Safety', patients: 340, color: '#9B2438' },
  { name: 'Growth', patients: 280, color: '#4A6880' },
  { name: 'Quality', patients: 620, color: '#C8D4DC' },
  { name: 'Deprescribing', patients: 190, color: '#64748b' },
];
export const CAD_DEMO_CATEGORY_PATIENT_SUM = CAD_DEMO_CATEGORIES.reduce((s, c) => s + c.patients, 0);

// Top gaps by illustrative $ opportunity (DEMO; per-gap estimates, not a decomposition
// of the annual model).
export const CAD_DEMO_TOPGAPS = [
  { name: 'Heart Team Review', patients: 180, opportunity: '$3.4M' },
  { name: 'Complete Revasc', patients: 145, opportunity: '$2.8M' },
  { name: 'PCSK9i Post-ACS', patients: 210, opportunity: '$2.2M' },
  { name: 'CTO Referral', patients: 95, opportunity: '$1.9M' },
  { name: 'Statin Intensity', patients: 340, opportunity: '$1.6M' },
];

// Safety-alert summary (DEMO).
export const CAD_DEMO_SAFETY_ALERT = 'CRITICAL: 156 patients / HIGH: 184 patients';

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
