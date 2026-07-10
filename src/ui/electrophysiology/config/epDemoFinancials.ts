/**
 * Single-source DEMO financial model for the EP Executive tier.
 *
 * EP Exec convergence (AUDIT-304 replication of the HF exemplar): the tier
 * previously rendered mutually-contradictory revenue figures ($8.9M pipeline
 * vs a $4.1M+$2.6M=$6.7M at-risk split labeled $8.4M cumulative, plus bespoke
 * inline literals per card). No backend revenue source exists (the EP dashboard
 * endpoint emits gap/patient counts only), so per AUDIT-141 these stay DEMO
 * numbers - but they must be ONE internally-consistent model, every card a
 * stated decomposition of the same total.
 *
 * Invariants (enforced by epexec.convergence.test.tsx):
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
// pipeline headline so this RECONCILES the tier rather than re-numbering it.
export const EP_DEMO_ANNUAL_OPPORTUNITY_M = 8.9;

// Decomposition by intervention category (drives EPROIWaterfall + category modal).
export const EP_DEMO_WATERFALL = {
  ablation_revenue: 4.0,
  devices_revenue: 2.4, // LAAC / device therapy
  phenotypes_revenue: 1.7,
  _340b_revenue: 0.8,
  total_revenue: EP_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: 4.5,
};

// Category detail for the waterfall drill-down modal (same decomposition, $ + patients).
export const EP_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  Ablation: { revenue: 4000000, patientCount: 124 },
  Devices: { revenue: 2400000, patientCount: 89 },
  Phenotypes: { revenue: 1700000, patientCount: 45 },
  '340B': { revenue: 800000, patientCount: 67 },
};

// YTD captured value = the realized slice of the same model.
export const EP_DEMO_YTD_CAPTURED_M = EP_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized).
export const EP_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 1500000, procedures: 28, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 1200000, procedures: 21, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 1000000, procedures: 16, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 700000, procedures: 12, confidence: 'low' as const },
  ],
  totalProjected12Month: 4400000, // = (8.9 - 4.5) * 1e6
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
// Fixes the prior $4.1M+$2.6M=$6.7M != $8.4M cumulative break.
export const EP_DEMO_AT_RISK = {
  immediatePatients: 134,
  immediateRevenue: 2000000,
  deferralRevenue: 1000000,
  cumulativeRisk12Month: 3000000, // = immediate + deferral
  deferralCostPerMonth: 250000, // = cumulative / 12
};

// Predictive banner dollars, reconciled to the same model.
export const EP_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 8900000, // = annual opportunity
  quarterlyActionableRevenue: 1500000, // = Q1 pipeline
  projectedRevenueCurrentRate: 4500000, // = realized run-rate
  projectedRevenueSystematic: 8000000, // ~90% capture under systematic outreach
};

// Facility decomposition of the same annual total.
export const EP_DEMO_FACILITIES = [
  { site_id: 'Main Campus - EP Lab', opp_revenue: 3000000, rank: 1 },
  { site_id: 'West Campus - Arrhythmia Center', opp_revenue: 2600000, rank: 2 },
  { site_id: 'North Campus - Device Clinic', opp_revenue: 2300000, rank: 3 },
  { site_id: 'Community Medical Center - EP Unit', opp_revenue: 1000000, rank: 4 },
];

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($4.5M)
//   gap             = the immediate at-risk slice ($2.0M), tying the amber Gap card
//                     to the at-risk decomposition above
//   total projected = realized + gap ($6.5M), derived - never hand-typed
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

const pvrTotalRealized = EP_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = EP_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const EP_DEMO_PVR = {
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
// headline reads the LIVE totalOpenGaps + real totalPatients (see EPExecutiveView);
// this composition detail is demo-badged, not a population figure.
export const EP_DEMO_CATEGORIES = [
  { name: 'Therapy', patients: 680, color: '#2C4A60' },
  { name: 'Safety', patients: 290, color: '#9B2438' },
  { name: 'Growth', patients: 350, color: '#4A6880' },
  { name: 'Quality', patients: 410, color: '#C8D4DC' },
];
export const EP_DEMO_CATEGORY_PATIENT_SUM = EP_DEMO_CATEGORIES.reduce((s, c) => s + c.patients, 0);

// Top gaps by illustrative $ opportunity (DEMO; per-gap estimates, not a decomposition
// of the annual model).
export const EP_DEMO_TOPGAPS = [
  { name: 'LAAC Candidates', patients: 185, opportunity: '$4.1M' },
  { name: 'CSP/CRT Upgrade', patients: 120, opportunity: '$2.6M' },
  { name: 'Dofetilide REMS', patients: 95, opportunity: '$2.1M' },
  { name: 'PFA Re-ablation', patients: 78, opportunity: '$1.8M' },
  { name: 'Device Battery', patients: 62, opportunity: '$1.4M' },
];

// Safety-alert summary (DEMO).
export const EP_DEMO_SAFETY_ALERT = 'CRITICAL: 134 patients / HIGH: 156 patients';

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
