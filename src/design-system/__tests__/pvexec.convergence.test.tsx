/**
 * PV (Peripheral Vascular) Executive convergence to the HF/EP/SH/CAD/VHD exemplar
 * (AUDIT-304 PV - the FINAL module of the 6-view arc).
 *
 * Verifies: the new PVExecutiveSummary reads the live PV dashboard contract
 * (patients / open gaps / device candidates) with honest offline states, plus a
 * registry-grounded Revenue Opportunity card (distinct from the demo-model cards);
 * the GapIntelligenceCard headline reads live totalOpenGaps + real totalPatients
 * (killing the 1,150 category-sum-as-population mislabel) while its composition stays
 * demo-badged; the single pvDemoFinancials model is internally consistent at $8.1M with
 * the waterfall total === its category sum (fixing the 42.3M-vs-40.8M mismatch); the
 * ~$42M program-revenue literals are gone (incl. the CSV); the consolidated
 * PVForwardOutlookPanel renders three figure sets; the IA is reordered to the 7-panel
 * exec narrative (no facility slot) with Export folded into the header; the 5 detail
 * modals are demo-badged and the DRG modal's onExport prop is dropped; and the Gap
 * Response / Trajectory cards are relocated to the Service Line.
 *
 * CAD-class dual-axis reconcile; NO DRG-modal crash (drgDetailData is a well-formed
 * array) and NO facility modal - so those regression blocks are intentionally absent.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing Library.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import PVExecutiveSummary, { PVDashboardData } from '../../ui/peripheralVascular/components/PVExecutiveSummary';
import PVForwardOutlookPanel from '../../ui/peripheralVascular/components/PVForwardOutlookPanel';
import GapIntelligenceCard from '../../components/shared/GapIntelligenceCard';
import BaseDetailModal from '../../components/shared/BaseDetailModal';
import {
  PV_DEMO_ANNUAL_OPPORTUNITY_M,
  PV_DEMO_REALIZED_M,
  PV_DEMO_WATERFALL,
  PV_DEMO_ROI_CATEGORIES,
  PV_DEMO_CATEGORY_DETAIL,
  PV_DEMO_YTD_CAPTURED_M,
  PV_DEMO_PIPELINE,
  PV_DEMO_AT_RISK,
  PV_DEMO_PREDICTIVE,
  PV_DEMO_PVR,
  PV_DEMO_CATEGORIES,
  PV_DEMO_TOPGAPS,
  PV_DEMO_SAFETY_ALERT,
} from '../../ui/peripheralVascular/config/pvDemoFinancials';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(el: React.ReactElement): string {
  act(() => {
    root.render(el);
  });
  // AUDIT-305: detail modals portal to document.body to escape the page wrapper's
  // stacking context, so container.innerHTML would miss any portaled overlay. body
  // contains the mount container PLUS any portal, so this covers both cases.
  return document.body.innerHTML;
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

const VIEW = '../../ui/peripheralVascular/views/PeripheralExecutiveView.tsx';

// totalPatients (1847) / totalOpenGaps (342) deliberately distinguishable from the demo
// category-sum (258) and the old 1,150 mislabel so the wired-vs-demo tests can tell apart.
const FAKE_DASHBOARD: PVDashboardData = {
  summary: {
    totalPatients: 1847,
    totalOpenGaps: 342,
    gapsByType: { PAD_INTERVENTION: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- PVExecutiveSummary wired to the live contract -------------------
describe('PV Exec convergence - PVExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total as the live population figure', () => {
    const html = render(<PVExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('1,847'); // summary.totalPatients (live)
    expect(html).toContain('Active PAD care panel (database)'); // live subtext present
  });
  it('renders the live open-gap count and device-candidate count', () => {
    const html = render(<PVExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342');
    expect(html).toContain('77');
    expect(html).toContain('Open Therapy Gaps');
    expect(html).toContain('Device Therapy Candidates');
  });
  it('the Revenue Opportunity card is registry-grounded (Registry pill, config value), distinct from demo cards', () => {
    const html = render(<PVExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Registry'); // the distinct registry pill
    expect(html).toContain('Registry-derived: summed PV clinical-gap opportunity');
    expect(html).toContain('$8.1M'); // config.kpiData.totalOpportunity (registry sum)
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<PVExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo');
    expect(html).toContain(`$${PV_DEMO_YTD_CAPTURED_M.toFixed(1)}M`); // $3.3M realized slice
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<PVExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('1,847');
  });
  it('shows a loading placeholder while live data is in flight (no fabricated count)', () => {
    const html = render(<PVExecutiveSummary dashboard={null} loading />);
    expect(html).toContain('Loading live data');
  });
  it('the live reads are guarded (partial summary renders dashes, never crashes)', () => {
    const partial = { summary: { totalOpenGaps: 5 } } as any;
    let html = '';
    expect(() => { html = render(<PVExecutiveSummary dashboard={partial} />); }).not.toThrow();
    expect(html).toContain('5'); // the present field renders
  });
});

// ------------------- Single patient-total on the tier -------------------
describe('PV Exec convergence - single patient-total label', () => {
  it('PVExecutiveSummary carries exactly one "Total PV Patients" label', () => {
    const s = src('../../ui/peripheralVascular/components/PVExecutiveSummary.tsx');
    expect(s.split('Total PV Patients').length - 1).toBe(1);
  });
  it('the view owns no duplicate patient tile + drops the config.kpiData fallback behind the live field', () => {
    const view = src(VIEW);
    expect(view).not.toContain('Total PV Patients');
    expect(view).not.toContain('const kpiCards');
    expect(view).not.toContain('config.kpiData.totalPatients ??'); // old live-with-config-fallback gone
  });
});

// ------------------- GapIntelligenceCard headline: live count + real population -------------------
describe('PV Exec convergence - GapIntelligenceCard headline reads live, composition stays demo', () => {
  it('headline reads the live open-gap count across the real patient total (not the category sum)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 342, categories: PV_DEMO_CATEGORIES, topGaps: PV_DEMO_TOPGAPS, safetyAlert: PV_DEMO_SAFETY_ALERT }}
        totalPatients={1847}
        compositionDemo
      />
    );
    expect(html).toContain('342 auto-detected gaps across 1,847 patients');
    expect(html).not.toContain('across 258 patients'); // demo category-sum not used as population
    expect(html).not.toContain('across 1,150 patients'); // old mislabel killed
    expect(html).toContain('Demo composition');
  });
  it('the shared component is byte-unchanged for the other modules (no override, no badge)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 10, categories: PV_DEMO_CATEGORIES, topGaps: PV_DEMO_TOPGAPS, safetyAlert: 'x' }}
      />
    );
    expect(html).toContain('across 258 patients'); // falls back to the category sum
    expect(html).not.toContain('Demo composition');
  });
  it('the view feeds the card live totalOpenGaps + real totalPatients + demo composition', () => {
    const view = src(VIEW);
    expect(view).toContain('totalGaps: dashboard?.summary?.totalOpenGaps ?? 0');
    expect(view).toContain('totalPatients={dashboard?.summary?.totalPatients ?? 0}');
    expect(view).toContain('compositionDemo');
    expect(view).toContain('categories: PV_DEMO_CATEGORIES');
    expect(view).toContain('safetyAlert: PV_DEMO_SAFETY_ALERT');
    // the old inline literals + the ?? 12 default are gone
    expect(view).not.toContain('?? 12');
    expect(view).not.toContain("patients: 320");
  });
});

// ------------------- Demo financial model - internal consistency (anchored at $8.1M) -------------------
describe('PV Exec convergence - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total (8.1)', () => {
    const sum = PV_DEMO_WATERFALL.limbSalvage_revenue + PV_DEMO_WATERFALL.endovascular_revenue
      + PV_DEMO_WATERFALL.padScreening_revenue + PV_DEMO_WATERFALL.woundCare_revenue
      + PV_DEMO_WATERFALL.wifiClassification_revenue;
    expect(sum).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(PV_DEMO_WATERFALL.total_revenue).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('realized is the derived remainder (annual - pipeline), not an independent literal', () => {
    expect(PV_DEMO_REALIZED_M).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M - PV_DEMO_PIPELINE.totalProjected12Month / 1_000_000, 6);
    expect(PV_DEMO_WATERFALL.realized_revenue).toBeCloseTo(PV_DEMO_REALIZED_M, 6);
  });
  it('the ROI-waterfall category array total === the category sum (fixes the 42.3M-vs-40.8M mismatch)', () => {
    const sum = PV_DEMO_ROI_CATEGORIES.reduce((s, c) => s + c.value, 0);
    expect(sum).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(PV_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
  });
  it('YTD captured equals the realized slice', () => {
    expect(PV_DEMO_YTD_CAPTURED_M).toBeCloseTo(PV_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized (4.8M)', () => {
    const qSum = PV_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(PV_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((PV_DEMO_ANNUAL_OPPORTUNITY_M - PV_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity (fixes 3.6 vs 4.2)', () => {
    expect(PV_DEMO_AT_RISK.immediateRevenue + PV_DEMO_AT_RISK.deferralRevenue).toBe(PV_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(PV_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(PV_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (PV_DEMO_ANNUAL_OPPORTUNITY_M - PV_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(PV_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive dollars are decompositions of the same total', () => {
    expect(PV_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBeCloseTo(PV_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
    expect(PV_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(PV_DEMO_PIPELINE.quarters[0].revenue);
    expect(PV_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBeCloseTo(PV_DEMO_WATERFALL.realized_revenue * 1_000_000, 0);
    expect(PV_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(PV_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('PV Exec convergence - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = PV_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = PV_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(PV_DEMO_PVR.totalProjected);
    expect(rSum).toBe(PV_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(PV_DEMO_PVR.totalRealized).toBe(PV_DEMO_WATERFALL.realized_revenue * 1_000_000); // $3.3M
    expect(PV_DEMO_PVR.gap).toBe(PV_DEMO_AT_RISK.immediateRevenue); // $2.4M
    expect(PV_DEMO_PVR.totalProjected).toBe(PV_DEMO_PVR.totalRealized + PV_DEMO_PVR.gap); // $5.7M
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    PV_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the view feeds the P-v-R chart the model months; the ~44M monthlyData array is gone', () => {
    const view = src(VIEW);
    expect(view).toContain('monthlyData={PV_DEMO_PVR.months}');
    expect(view).not.toContain('const padMonthlyData');
  });
});

// ------------------- Consolidated PVForwardOutlookPanel -------------------
describe('PV Exec convergence - consolidated PVForwardOutlookPanel', () => {
  it('renders all three figure-sets from the single demo model', () => {
    const html = render(<PVForwardOutlookPanel />);
    expect(html).toContain('$4.8M projected over 12 months');
    expect(html).toContain('Q1 2026');
    expect(html).toContain('$2.4M'); // immediate at-risk
    expect(html).toContain('$3.6M'); // 12-month cumulative
    expect(html).toContain('= the YTD projected-realized gap');
    expect(html).toContain('$7.3M'); // systematic closure
    expect(html).toContain('$4.0M'); // acceleration = 7.3 - 3.3
    expect(html).toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Waterfall re-scope + banned program-revenue literals gone -------------------
describe('PV Exec convergence - the single waterfall is re-scoped to the gap opportunity', () => {
  const view = src(VIEW);
  it('the single ROI waterfall reads the model (8.1M), not the removed 40.8M categories', () => {
    expect(view).toContain('categories={PV_DEMO_ROI_CATEGORIES}');
    expect(view).toContain('PV_DEMO_WATERFALL.total_revenue * 1000000');
    expect(view).not.toContain('const padWaterfallCategories');
  });
  it('the program-revenue literals (42.3M / 29.8M / 12.4M-category / $50M / -$7.7M / 2,000) do not appear on the tier', () => {
    expect(view).not.toContain('42300000');
    expect(view).not.toContain('29800000');
    expect(view).not.toContain('12400000'); // first program-revenue category value
    expect(view).not.toContain("'$50M'");
    expect(view).not.toContain("'-$7.7M'");
    expect(view).not.toContain("'2,000'");
  });
});

// ------------------- Demo badges: panels + the 5 detail modals -------------------
describe('PV Exec convergence - demo badges on data-dependency surfaces', () => {
  const view = src(VIEW);
  it('the view marks the mock-fed financial panels (waterfall / DRG / P-v-R / benchmarks)', () => {
    const badgeUses = view.split('<DemoDataBadge').length - 1;
    expect(badgeUses).toBeGreaterThanOrEqual(4);
    expect(src('../../ui/peripheralVascular/components/PVForwardOutlookPanel.tsx')).toContain('<DemoDataBadge');
  });
  it('all 5 detail modals pass the BaseDetailModal demoBadge prop', () => {
    // drg, month, benchmark, category, zip
    expect(view.split('demoBadge').length - 1).toBeGreaterThanOrEqual(5);
  });
  it('BaseDetailModal renders the badge header only when demoBadge is set (default off)', () => {
    const metric = [{ label: 'Annual Opportunity', value: '2.4M', colorScheme: 'porsche' as const }];
    const withBadge = render(<BaseDetailModal title="Limb Salvage Optimization" subtitle="x" demoBadge summaryMetrics={metric} onClose={() => {}} />);
    expect(withBadge).toContain('Demo data - EHR integration pending');
    const noBadge = render(<BaseDetailModal title="Limb Salvage Optimization" subtitle="x" summaryMetrics={metric} onClose={() => {}} />);
    expect(noBadge).not.toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Controls: DRG modal export stub dropped -------------------
describe('PV Exec convergence - dead control removed', () => {
  it('the DRG modal no longer passes the dead onExport prop (BaseDetailModal renders no Export button)', () => {
    const view = src(VIEW);
    expect(view).not.toContain('onExport');
  });
});

// ------------------- IA restructure: ruled render order + Export in header -------------------
describe('PV Exec convergence - ruled render order (7 panels, no facility slot)', () => {
  const view = src(VIEW);
  it('sections render in the exec-narrative order (summary -> gaps -> waterfall -> DRG -> P-v-R -> forward -> ZIP)', () => {
    const order = [
      '<PVExecutiveSummary',
      '<GapIntelligenceCard',
      '3. Revenue Opportunity Waterfall',
      '4. DRG Performance cards',
      '5. Projected vs Realized',
      '<PVForwardOutlookPanel />',
      '7. Geographic Heat Map',
    ];
    let prev = -1;
    order.forEach((marker) => {
      const idx = view.indexOf(marker);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    });
  });
  it('Export folded into the tier header (no standalone export row; AUDIT-161 PV inversion closed - the last of 6)', () => {
    expect(view).not.toContain('flex justify-end mb-6');
    expect(view).toContain('Peripheral Vascular Executive Dashboard');
    expect(view.indexOf('<ExportButton')).toBeLessThan(view.indexOf('<PVExecutiveSummary'));
    expect(view.indexOf('Peripheral Vascular Executive Dashboard')).toBeLessThan(view.indexOf('<ExportButton'));
  });
});

describe('PV Exec convergence - relocations + consolidation absences on the exec tier', () => {
  const view = src(VIEW);
  it('the forward trio + banner are gone from the view (consolidated into PVForwardOutlookPanel)', () => {
    expect(view).not.toContain('RevenuePipelineCard');
    expect(view).not.toContain('RevenueAtRiskCard');
    expect(view).not.toContain('TrajectoryTrendsCard');
    expect(view).not.toContain('PredictiveMetricsBanner');
  });
  it('Gap Response Rate no longer renders on the exec tier', () => {
    expect(view).not.toContain('GapResponseRateCard');
  });
});

describe('PV Exec convergence - Service Line carries the relocated content', () => {
  const sl = src('../../ui/peripheralVascular/views/PeripheralServiceLineView.tsx');
  it('gap-detection tab renders the relocated GapResponseRateCard', () => {
    expect(sl).toContain('GapResponseRateCard');
  });
  it('heatmap tab renders the relocated TrajectoryTrendsCard', () => {
    expect(sl).toContain('TrajectoryTrendsCard');
  });
});
