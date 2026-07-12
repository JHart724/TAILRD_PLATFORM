/**
 * Single-source DEMO financial model for the SH (Structural Heart) Executive tier.
 *
 * SH Exec convergence (AUDIT-304 replication of the HF/EP exemplar): the tier
 * previously rendered mutually-contradictory revenue figures (a $10.3M waterfall
 * total vs a $10.9M pipeline/predictive total, plus a $3.2M+$1.8M=$5.0M at-risk
 * split mislabeled $6.2M cumulative, plus bespoke inline literals per card). No
 * backend revenue source exists (the SH dashboard endpoint emits gap/patient
 * counts only), so per AUDIT-141 these stay DEMO numbers - but they must be ONE
 * internally-consistent model, every card a stated decomposition of the same total.
 *
 * Invariants (enforced by shexec.convergence.test.tsx):
 *   - waterfall components sum to ANNUAL_OPPORTUNITY
 *   - ytdCaptured === waterfall.realized
 *   - pipeline quarters sum === pipeline total === annual - realized
 *   - atRisk.immediate + atRisk.deferral === atRisk.cumulative12Month <= remaining
 *   - predictive.totalIdentifiedRevenue === annual ; quarterlyActionable === pipeline Q1
 *   - facilities sum to ANNUAL_OPPORTUNITY
 *   - pvr.totalRealized === waterfall.realized ; pvr.gap === atRisk.immediate ; projected = realized + gap
 *
 * Do NOT wire any of this to an API field that does not exist (DRIFT-50).
 */

// The single annual revenue-opportunity total (demo), in $M - matches the prior
// pipeline/predictive headline (the $10.3M waterfall was the outlier), so this
// RECONCILES the tier rather than re-numbering it.
export const SH_DEMO_ANNUAL_OPPORTUNITY_M = 10.9;

// Decomposition by intervention category (drives SHROIWaterfall + category modal).
export const SH_DEMO_WATERFALL = {
  valveTherapy_revenue: 4.5, // TAVR
  procedures_revenue: 3.4, // MitraClip / TEER
  phenotypes_revenue: 1.9,
  _340b_revenue: 1.1,
  total_revenue: SH_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: 3.6,
};

// Category detail for the waterfall drill-down modal (same decomposition, $ + patients).
export const SH_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  ValveTherapy: { revenue: 4500000, patientCount: 124 },
  Procedures: { revenue: 3400000, patientCount: 89 },
  Phenotypes: { revenue: 1900000, patientCount: 45 },
  '340B': { revenue: 1100000, patientCount: 67 },
};

// YTD captured value = the realized slice of the same model.
export const SH_DEMO_YTD_CAPTURED_M = SH_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized).
export const SH_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 2600000, procedures: 18, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 2100000, procedures: 13, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 1600000, procedures: 10, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 1000000, procedures: 7, confidence: 'low' as const },
  ],
  totalProjected12Month: 7300000, // = (10.9 - 3.6) * 1e6
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
// Fixes the prior $3.2M+$1.8M=$5.0M != $6.2M cumulative break.
export const SH_DEMO_AT_RISK = {
  immediatePatients: 28,
  immediateRevenue: 3200000,
  deferralRevenue: 1800000,
  cumulativeRisk12Month: 5000000, // = immediate + deferral
  deferralCostPerMonth: 416667, // = round(cumulative / 12)
};

// Predictive banner dollars, reconciled to the same model.
export const SH_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 10900000, // = annual opportunity
  quarterlyActionableRevenue: 2600000, // = Q1 pipeline
  projectedRevenueCurrentRate: 3600000, // = realized run-rate
  projectedRevenueSystematic: 9800000, // ~90% capture under systematic outreach
};

// Facility decomposition of the same annual total.
export const SH_DEMO_FACILITIES = [
  { site_id: 'Main Campus - Structural Heart', opp_revenue: 4000000, rank: 1 },
  { site_id: 'West Campus - Valve Center', opp_revenue: 3400000, rank: 2 },
  { site_id: 'North Campus - TAVR Program', opp_revenue: 2400000, rank: 3 },
  { site_id: 'Community Medical Center - SH Unit', opp_revenue: 1100000, rank: 4 },
];

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($3.6M)
//   gap             = the immediate at-risk slice ($3.2M), tying the amber Gap card
//                     to the at-risk decomposition above
//   total projected = realized + gap ($6.8M), derived - never hand-typed
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

const pvrTotalRealized = SH_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = SH_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const SH_DEMO_PVR = {
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
// headline reads the LIVE totalOpenGaps + real totalPatients (see StructuralExecutiveView);
// this composition detail is demo-badged, not a population figure.
export const SH_DEMO_CATEGORIES = [
  { name: 'Therapy', patients: 180, color: '#2C4A60' },
  { name: 'Safety', patients: 90, color: '#9B2438' },
  { name: 'Growth', patients: 220, color: '#4A6880' },
  { name: 'Quality', patients: 340, color: '#C8D4DC' },
];
export const SH_DEMO_CATEGORY_PATIENT_SUM = SH_DEMO_CATEGORIES.reduce((s, c) => s + c.patients, 0);

// Top gaps by illustrative $ opportunity (DEMO; per-gap estimates, not a decomposition
// of the annual model).
export const SH_DEMO_TOPGAPS = [
  { name: 'Severe AS Heart Team', patients: 124, opportunity: '$3.2M' },
  { name: 'Moderate AS Surveillance', patients: 134, opportunity: '$1.8M' },
  { name: 'Post-TAVR Echo', patients: 156, opportunity: '$1.4M' },
  { name: 'BAV Aortopathy', patients: 56, opportunity: '$1.2M' },
  { name: 'ATTR+AS Co-Detection', patients: 45, opportunity: '$980K' },
];

// Safety-alert summary (DEMO).
export const SH_DEMO_SAFETY_ALERT = 'CRITICAL: 28 patients / HIGH: 62 patients';

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
