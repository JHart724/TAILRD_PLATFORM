/**
 * Single-source DEMO financial model for the PV (Peripheral Vascular) Executive tier.
 *
 * PV Exec convergence (AUDIT-304 replication of the HF/EP/SH/CAD/VHD exemplar; the FINAL
 * module of the 6-view arc). PV conflated PROGRAM REVENUE (a $42.3M SharedROIWaterfall
 * whose own total disagreed with its $40.8M category sum, $29.8M realized, ~$44M-annualized
 * monthly data, a '$50M' / '-$7.7M' / '2,000' export CSV) with GAP-CLOSURE OPPORTUNITY.
 *
 * PV's special case (operator ruling A): the gap-closure anchor is REGISTRY-GROUNDED, not
 * invented - config.kpiData.totalOpportunity = formatDollars(PLATFORM_TOTALS.modules.pv
 * .opportunity) = the summed PV_CLINICAL_GAPS dollarOpportunity ($8,053,942 -> "$8.1M"),
 * corroborated by the top-gaps opportunity cluster (~$8.39M) and the predictive
 * totalIdentified ($8.2M). So the tier already carried the right number on ONE card; the
 * ~$42M program-revenue figures are a DIFFERENT quantity and are removed from this tier.
 * This model anchors the demo decompositions on that same $8.1M (the PV analog of HF 6.2 /
 * EP 8.9 / SH 10.9 / CAD 11.2 / VHD 5.3). No backend revenue source exists (the PV dashboard
 * endpoint emits gap/patient counts only), so per AUDIT-141 these stay DEMO numbers - but
 * ONE internally-consistent model, every card a stated slice of the same $8.1M, and the
 * waterfall total is the category sum BY CONSTRUCTION.
 *
 * Invariants (enforced by pvexec.convergence.test.tsx):
 *   - waterfall components sum to ANNUAL_OPPORTUNITY ; roiCategories sum === total === 8.1
 *   - realized === annual - pipeline (the remaining opportunity is the pipeline)
 *   - ytdCaptured === waterfall.realized
 *   - pipeline quarters sum === pipeline total === annual - realized (kept at 4.8)
 *   - atRisk.immediate + atRisk.deferral === atRisk.cumulative12Month <= remaining
 *   - predictive.totalIdentifiedRevenue === annual ; quarterlyActionable === pipeline Q1
 *   - pvr.totalRealized === waterfall.realized ; pvr.gap === atRisk.immediate ; projected = realized + gap
 *
 * Do NOT wire any of this to an API field that does not exist (DRIFT-50).
 */

// The single annual gap-closure-opportunity total (demo), in $M - the ruled anchor,
// equal to the registry figure config.kpiData.totalOpportunity renders ("$8.1M"),
// NOT the ~$42M program-revenue figures. (Registry exact = $8.05M; displayed $8.1M.)
export const PV_DEMO_ANNUAL_OPPORTUNITY_M = 8.1;

// The pipeline (remaining opportunity) is kept at the already-consistent $4.8M; the
// realized slice is therefore the derived remainder (annual - pipeline).
export const PV_DEMO_PIPELINE_TOTAL_M = 4.8;
export const PV_DEMO_REALIZED_M = PV_DEMO_ANNUAL_OPPORTUNITY_M - PV_DEMO_PIPELINE_TOTAL_M; // 3.3

// Decomposition by intervention category (drives the single SharedROIWaterfall). Re-scoped
// from the removed $40.8M program-revenue categories to sum to the $8.1M gap opportunity.
export const PV_DEMO_WATERFALL = {
  limbSalvage_revenue: 2.4,
  endovascular_revenue: 1.9,
  padScreening_revenue: 1.7,
  woundCare_revenue: 1.3,
  wifiClassification_revenue: 0.8,
  total_revenue: PV_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: PV_DEMO_REALIZED_M,
};

// The single ROI-waterfall category array (dollars), derived from the waterfall model so
// the waterfall total can never again diverge from the sum of its bars ($42.3M vs $40.8M).
export const PV_DEMO_ROI_CATEGORIES = [
  { label: 'Limb Salvage Optimization', value: PV_DEMO_WATERFALL.limbSalvage_revenue * 1_000_000, color: '#3E6275' },
  { label: 'Endovascular Intervention', value: PV_DEMO_WATERFALL.endovascular_revenue * 1_000_000, color: '#2C4A60' },
  { label: 'PAD Screening Program', value: PV_DEMO_WATERFALL.padScreening_revenue * 1_000_000, color: '#1E3347' },
  { label: 'Wound Care Coordination', value: PV_DEMO_WATERFALL.woundCare_revenue * 1_000_000, color: '#4A6880' },
  { label: 'WIfI Classification', value: PV_DEMO_WATERFALL.wifiClassification_revenue * 1_000_000, color: '#7A1A2E' },
];

// Category detail for the waterfall drill-down modal (same decomposition, $ + patients).
export const PV_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  'Limb Salvage Optimization': { revenue: 2400000, patientCount: 168 },
  'Endovascular Intervention': { revenue: 1900000, patientCount: 142 },
  'PAD Screening Program': { revenue: 1700000, patientCount: 280 },
  'Wound Care Coordination': { revenue: 1300000, patientCount: 95 },
  'WIfI Classification': { revenue: 800000, patientCount: 60 },
};

// YTD captured value = the realized slice of the same model.
export const PV_DEMO_YTD_CAPTURED_M = PV_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized = 4.8M);
// the original quarter split was already internally consistent, kept on the gap subset.
export const PV_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 1800000, procedures: 22, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 1300000, procedures: 16, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 1000000, procedures: 12, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 700000, procedures: 9, confidence: 'low' as const },
  ],
  totalProjected12Month: PV_DEMO_PIPELINE_TOTAL_M * 1_000_000, // 4.8M = annual - realized
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
// Fixes the prior $2.4M+$1.2M=$3.6M != $4.2M cumulative break.
export const PV_DEMO_AT_RISK = {
  immediatePatients: 48,
  immediateRevenue: 2400000,
  deferralRevenue: 1200000,
  cumulativeRisk12Month: 3600000, // = immediate + deferral
  deferralCostPerMonth: 300000, // = cumulative / 12
};

// Predictive banner dollars, reconciled to the same model.
export const PV_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 8100000, // = annual opportunity
  quarterlyActionableRevenue: 1800000, // = Q1 pipeline
  projectedRevenueCurrentRate: 3300000, // = realized run-rate
  projectedRevenueSystematic: 7300000, // ~90% capture under systematic outreach (<= total)
};

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($3.3M)
//   gap             = the immediate at-risk slice ($2.4M), tying the amber Gap card
//                     to the at-risk decomposition above
//   total projected = realized + gap ($5.7M), derived - never hand-typed
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

const pvrTotalRealized = PV_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = PV_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const PV_DEMO_PVR = {
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
// headline reads the LIVE totalOpenGaps + real totalPatients (see PeripheralExecutiveView);
// this composition detail is demo-badged, not a population figure (kills the old 1,150
// category-sum-as-population mislabel).
export const PV_DEMO_CATEGORIES = [
  { name: 'Screening & Therapy', patients: 210, color: '#C8D4DC' },
  { name: 'Safety', patients: 48, color: '#9B2438' },
];
export const PV_DEMO_CATEGORY_PATIENT_SUM = PV_DEMO_CATEGORIES.reduce((s, c) => s + c.patients, 0);

// Top gaps by illustrative $ opportunity (DEMO; per-gap estimates on the gap-opportunity
// axis, not a decomposition of the annual model).
export const PV_DEMO_TOPGAPS = [
  { name: 'ABI Screening', patients: 280, opportunity: '$2.4M' },
  { name: 'AAA Screening', patients: 195, opportunity: '$2.1M' },
  { name: 'TCAR/Carotid', patients: 85, opportunity: '$1.8M' },
  { name: 'VTE Extended AC', patients: 120, opportunity: '$1.2M' },
  { name: 'IVC Filter Retrieval', patients: 65, opportunity: '$890K' },
];

// Safety-alert summary (DEMO).
export const PV_DEMO_SAFETY_ALERT = 'CRITICAL: 48 patients / HIGH: 62 patients';

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
