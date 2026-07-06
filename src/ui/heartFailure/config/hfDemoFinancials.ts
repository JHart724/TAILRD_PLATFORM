/**
 * Single-source DEMO financial model for the HF Executive tier.
 *
 * HF Exec batch 1 (data reconciliation): the tier previously rendered six
 * mutually-contradictory revenue figures ($5.2M / $6.2M / $7.7M / $9.1M /
 * $14M / $127,240), each a bespoke inline literal. No backend revenue source
 * exists (HFDashboardData emits none), so per AUDIT-141 these stay DEMO
 * numbers - but they must be ONE internally-consistent model, and every card
 * must render a stated decomposition of the same total.
 *
 * Invariants (enforced by hfexec.reconciliation.test.tsx):
 *   - waterfall components sum to ANNUAL_OPPORTUNITY
 *   - ytdCaptured === waterfall.realized
 *   - pipeline quarters sum === pipeline total === annual - realized
 *   - atRisk.immediate + atRisk.deferral === atRisk.cumulative12Month <= remaining
 *   - predictive.totalIdentifiedRevenue === annual
 *   - facilities sum to ANNUAL_OPPORTUNITY
 *   - doc-pipeline sub-buckets (High/Medium/Low) sum to the headline count + dollars
 *
 * Do NOT wire any of this to an API field that does not exist (DRIFT-50).
 * When a real revenue source lands, replace THIS module, not card literals.
 */

// The single annual revenue-opportunity total (demo), in $M.
export const HF_DEMO_ANNUAL_OPPORTUNITY_M = 6.2;

// Decomposition by intervention category (drives ROIWaterfall + category modal).
export const HF_DEMO_WATERFALL = {
  gdmt_revenue: 2.4,
  devices_revenue: 1.8,
  phenotypes_revenue: 1.2,
  _340b_revenue: 0.8,
  total_revenue: HF_DEMO_ANNUAL_OPPORTUNITY_M,
  realized_revenue: 3.1,
};

// Category detail for the waterfall drill-down modal (same decomposition, $ + patients).
export const HF_DEMO_CATEGORY_DETAIL: Record<string, { revenue: number; patientCount: number }> = {
  GDMT: { revenue: 2400000, patientCount: 1050 },
  Devices: { revenue: 1800000, patientCount: 80 },
  Phenotypes: { revenue: 1200000, patientCount: 105 },
  '340B': { revenue: 800000, patientCount: 460 },
};

// YTD captured value = the realized slice of the same model.
export const HF_DEMO_YTD_CAPTURED_M = HF_DEMO_WATERFALL.realized_revenue;

// Forward pipeline = capturing the REMAINING opportunity (annual - realized) over 4 quarters.
export const HF_DEMO_PIPELINE = {
  quarters: [
    { quarter: 'Q1 2026', revenue: 1100000, procedures: 23, confidence: 'high' as const },
    { quarter: 'Q2 2026', revenue: 900000, procedures: 18, confidence: 'moderate' as const },
    { quarter: 'Q3 2026', revenue: 700000, procedures: 14, confidence: 'moderate' as const },
    { quarter: 'Q4 2026', revenue: 400000, procedures: 10, confidence: 'low' as const },
  ],
  totalProjected12Month: 3100000, // = (6.2 - 3.1) * 1e6
};

// Revenue at risk = the subset of the remaining opportunity exposed to deferral.
export const HF_DEMO_AT_RISK = {
  immediatePatients: 89,
  immediateRevenue: 1400000,
  deferralRevenue: 700000,
  cumulativeRisk12Month: 2100000, // = immediate + deferral
  deferralCostPerMonth: 175000, // = cumulative / 12
};

// Predictive banner dollars, reconciled to the same model.
export const HF_DEMO_PREDICTIVE = {
  totalIdentifiedRevenue: 6200000, // = annual opportunity
  quarterlyActionableRevenue: 1100000, // = Q1 pipeline
  projectedRevenueCurrentRate: 3100000, // current capture pace (= realized run-rate)
  projectedRevenueSystematic: 5600000, // ~90% capture under systematic outreach
};

// Facility decomposition of the same annual total.
export const HF_DEMO_FACILITIES = [
  { site_id: 'Main Campus - HF Clinic', opp_revenue: 2100000, rank: 1 },
  { site_id: 'West Campus - HF Center', opp_revenue: 1800000, rank: 2 },
  { site_id: 'North Campus - HF Clinic', opp_revenue: 1600000, rank: 3 },
  { site_id: 'Community Medical Center - HF Unit', opp_revenue: 700000, rank: 4 },
];

// Projected-vs-Realized monthly view - a stated slice of the same model:
//   total realized  = the realized slice of the annual model ($3.1M)
//   gap             = the immediate at-risk slice ($1.4M): the capture shortfall to plan,
//                     tying the amber Gap card to the at-risk decomposition above
//   total projected = realized + gap ($4.5M), derived - never hand-typed
// Months are distributed by fixed basis-point weights; the final month absorbs the
// rounding remainder so the series sums EXACTLY to the stated totals.
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

const pvrTotalRealized = HF_DEMO_WATERFALL.realized_revenue * 1_000_000;
const pvrGap = HF_DEMO_AT_RISK.immediateRevenue;
const pvrTotalProjected = pvrTotalRealized + pvrGap;
const pvrProjectedByMonth = distributeByWeights(pvrTotalProjected);
const pvrRealizedByMonth = distributeByWeights(pvrTotalRealized);

export const HF_DEMO_PVR = {
  totalProjected: pvrTotalProjected,
  totalRealized: pvrTotalRealized,
  gap: pvrGap,
  months: PVR_MONTH_LABELS.map((month, i) => ({
    month,
    projected: pvrProjectedByMonth[i],
    realized: pvrRealizedByMonth[i],
  })),
};

// DRG documentation pipeline (near-term open items; a subset, not the annual model).
// The card headline + sub-cards are DERIVED from these rows so the arithmetic can
// never diverge again (was: headline $127,240 / 23 vs sub-cards $118,840 / 28).
export interface HFDemoDocOpportunity {
  priority: 'High' | 'Medium' | 'Low';
  revenueImpact: number;
  drgUpgrade: string;
  dueDate: string;
}

export const HF_DEMO_DOC_OPPORTUNITIES: HFDemoDocOpportunity[] = [
  { priority: 'High', revenueImpact: 8420, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-11-15' },
  { priority: 'High', revenueImpact: 6180, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-11-14' },
  { priority: 'High', revenueImpact: 7350, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-11-13' },
  { priority: 'Medium', revenueImpact: 4750, drgUpgrade: 'DRG 293 -> 292', dueDate: '2025-11-16' },
  { priority: 'Medium', revenueImpact: 3920, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-11-17' },
  { priority: 'Medium', revenueImpact: 5280, drgUpgrade: 'DRG 293 -> 292', dueDate: '2025-11-18' },
  { priority: 'High', revenueImpact: 9150, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-11-19' },
  { priority: 'Medium', revenueImpact: 4410, drgUpgrade: 'DRG 294 -> 292', dueDate: '2025-11-20' },
  { priority: 'Low', revenueImpact: 2890, drgUpgrade: 'DRG 294 -> 293', dueDate: '2025-11-21' },
  { priority: 'High', revenueImpact: 6740, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-11-22' },
  { priority: 'Medium', revenueImpact: 3560, drgUpgrade: 'DRG 293 -> 292', dueDate: '2025-11-23' },
  { priority: 'Low', revenueImpact: 2150, drgUpgrade: 'DRG 294 -> 293', dueDate: '2025-11-24' },
  { priority: 'High', revenueImpact: 8890, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-11-25' },
  { priority: 'Medium', revenueImpact: 4980, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-11-26' },
  { priority: 'Low', revenueImpact: 3210, drgUpgrade: 'DRG 294 -> 293', dueDate: '2025-11-27' },
  { priority: 'High', revenueImpact: 7620, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-11-28' },
  { priority: 'Medium', revenueImpact: 4100, drgUpgrade: 'DRG 294 -> 292', dueDate: '2025-11-29' },
  { priority: 'Low', revenueImpact: 2750, drgUpgrade: 'DRG 294 -> 293', dueDate: '2025-11-30' },
  { priority: 'High', revenueImpact: 8320, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-12-01' },
  { priority: 'Medium', revenueImpact: 3840, drgUpgrade: 'DRG 293 -> 292', dueDate: '2025-12-02' },
  { priority: 'Low', revenueImpact: 2980, drgUpgrade: 'DRG 294 -> 293', dueDate: '2025-12-03' },
  { priority: 'High', revenueImpact: 9480, drgUpgrade: 'DRG 293 -> 291', dueDate: '2025-12-04' },
  { priority: 'Medium', revenueImpact: 4650, drgUpgrade: 'DRG 292 -> 291', dueDate: '2025-12-05' },
];

function bucket(priority: HFDemoDocOpportunity['priority']) {
  const rows = HF_DEMO_DOC_OPPORTUNITIES.filter(o => o.priority === priority);
  return {
    count: rows.length,
    dollars: rows.reduce((s, o) => s + o.revenueImpact, 0),
  };
}

// Derived summary - by construction the buckets always sum to the headline.
export const HF_DEMO_DOC_PIPELINE_SUMMARY = {
  count: HF_DEMO_DOC_OPPORTUNITIES.length,
  totalDollars: HF_DEMO_DOC_OPPORTUNITIES.reduce((s, o) => s + o.revenueImpact, 0),
  high: bucket('High'),
  medium: bucket('Medium'),
  low: bucket('Low'),
};

export function formatDemoDollars(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
