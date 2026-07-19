/**
 * VHD (Valvular Disease) Executive convergence to the HF/EP/SH/CAD exemplar (AUDIT-304 VHD).
 *
 * Verifies: the new VHDExecutiveSummary reads the live VHD dashboard contract
 * (patients / open gaps / device candidates) with honest offline states; the
 * GapIntelligenceCard headline reads live totalOpenGaps + real totalPatients
 * (killing the 372 category-sum-as-population mislabel) while its composition stays
 * demo-badged; the single vhdDemoFinancials model is internally consistent at $5.3M
 * with the waterfall total === its category sum (fixing the 51.7M-vs-50.2M mismatch);
 * the ~50M program-revenue literals are gone (incl. the CSV); the consolidated
 * VHDForwardOutlookPanel renders three figure sets; the IA is reordered to the 7-panel
 * exec narrative (no facility slot) with Export folded into the header; the 5 detail
 * modals are demo-badged and the DRG modal's console.log export is dropped; and the
 * Gap Response / Trajectory cards are relocated to the Service Line.
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

import VHDExecutiveSummary, { VHDDashboardData } from '../../ui/valvularDisease/components/VHDExecutiveSummary';
import VHDForwardOutlookPanel from '../../ui/valvularDisease/components/VHDForwardOutlookPanel';
import GapIntelligenceCard from '../../components/shared/GapIntelligenceCard';
import BaseDetailModal from '../../components/shared/BaseDetailModal';
import {
  VHD_DEMO_ANNUAL_OPPORTUNITY_M,
  VHD_DEMO_WATERFALL,
  VHD_DEMO_ROI_CATEGORIES,
  VHD_DEMO_CATEGORY_DETAIL,
  VHD_DEMO_YTD_CAPTURED_M,
  VHD_DEMO_PIPELINE,
  VHD_DEMO_AT_RISK,
  VHD_DEMO_PREDICTIVE,
  VHD_DEMO_PVR,
  VHD_DEMO_CATEGORIES,
  VHD_DEMO_TOPGAPS,
  VHD_DEMO_SAFETY_ALERT,
} from '../../ui/valvularDisease/config/vhdDemoFinancials';

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

const VIEW = '../../ui/valvularDisease/views/ValvularExecutiveView.tsx';

// totalPatients (4321) / totalOpenGaps (342) deliberately distinguishable from the
// demo category-sum (372) so the wired-vs-demo tests can tell them apart.
const FAKE_DASHBOARD: VHDDashboardData = {
  summary: {
    totalPatients: 4321,
    totalOpenGaps: 342,
    gapsByType: { VALVE_INTERVENTION: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- VHDExecutiveSummary wired to the live contract -------------------
describe('VHD Exec convergence - VHDExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total as the live population figure', () => {
    const html = render(<VHDExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('4,321'); // summary.totalPatients (live)
    expect(html).toContain('Active valve panel (database)'); // live subtext present
  });
  it('renders the live open-gap count and device-candidate count', () => {
    const html = render(<VHDExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342');
    expect(html).toContain('77');
    expect(html).toContain('Open Therapy Gaps');
    expect(html).toContain('Device Therapy Candidates');
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<VHDExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo');
    expect(html).toContain(`$${VHD_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`); // $5.3M
    expect(html).toContain(`$${VHD_DEMO_YTD_CAPTURED_M.toFixed(1)}M`); // $1.9M realized slice
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<VHDExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('4,321');
  });
  it('shows a loading placeholder while live data is in flight (no fabricated count)', () => {
    const html = render(<VHDExecutiveSummary dashboard={null} loading />);
    expect(html).toContain('Loading live data');
  });
  it('the live reads are guarded (partial summary renders dashes, never crashes)', () => {
    const partial = { summary: { totalOpenGaps: 5 } } as any;
    let html = '';
    expect(() => { html = render(<VHDExecutiveSummary dashboard={partial} />); }).not.toThrow();
    expect(html).toContain('5'); // the present field renders
  });
});

// ------------------- Single patient-total on the tier -------------------
describe('VHD Exec convergence - single patient-total label', () => {
  it('VHDExecutiveSummary carries exactly one "Total VHD Patients" label', () => {
    const s = src('../../ui/valvularDisease/components/VHDExecutiveSummary.tsx');
    expect(s.split('Total VHD Patients').length - 1).toBe(1);
  });
  it('the view owns no duplicate patient tile + drops the config.kpiData fallback behind the live field', () => {
    const view = src(VIEW);
    expect(view).not.toContain('Total VHD Patients');
    expect(view).not.toContain('const kpiCards');
    expect(view).not.toContain('config.kpiData.totalPatients ??'); // old live-with-config-fallback gone
  });
});

// ------------------- GapIntelligenceCard headline: live count + real population -------------------
describe('VHD Exec convergence - GapIntelligenceCard headline reads live, composition stays demo', () => {
  it('headline reads the live open-gap count across the real patient total (not 372)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 342, categories: VHD_DEMO_CATEGORIES, topGaps: VHD_DEMO_TOPGAPS, safetyAlert: VHD_DEMO_SAFETY_ALERT }}
        totalPatients={4321}
        compositionDemo
      />
    );
    expect(html).toContain('342 auto-detected gaps across 4,321 patients');
    expect(html).not.toContain('across 372 patients'); // category-sum mislabel killed
    expect(html).toContain('Demo composition');
  });
  it('the shared component is byte-unchanged for the other modules (no override, no badge)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 10, categories: VHD_DEMO_CATEGORIES, topGaps: VHD_DEMO_TOPGAPS, safetyAlert: 'x' }}
      />
    );
    expect(html).toContain('across 372 patients'); // falls back to the category sum
    expect(html).not.toContain('Demo composition');
  });
  it('the view feeds the card live totalOpenGaps + real totalPatients + demo composition', () => {
    const view = src(VIEW);
    expect(view).toContain('totalGaps: dashboard?.summary?.totalOpenGaps ?? 0');
    expect(view).toContain('totalPatients={dashboard?.summary?.totalPatients ?? 0}');
    expect(view).toContain('compositionDemo');
    expect(view).toContain('categories: VHD_DEMO_CATEGORIES');
    expect(view).toContain('safetyAlert: VHD_DEMO_SAFETY_ALERT');
    // the old inline literals + the ?? 6 default are gone
    expect(view).not.toContain('?? 6');
    expect(view).not.toContain("patients: 313");
  });
});

// ------------------- Demo financial model - internal consistency (anchored at $5.3M) -------------------
describe('VHD Exec convergence - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total (5.3)', () => {
    const sum = VHD_DEMO_WATERFALL.surgicalInterventional_revenue + VHD_DEMO_WATERFALL.valveSeverity_revenue
      + VHD_DEMO_WATERFALL.echoIntegration_revenue + VHD_DEMO_WATERFALL.guidelineImplementation_revenue
      + VHD_DEMO_WATERFALL.followUpProtocol_revenue;
    expect(sum).toBeCloseTo(VHD_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(VHD_DEMO_WATERFALL.total_revenue).toBeCloseTo(VHD_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('the ROI-waterfall category array total === the category sum (fixes the 51.7M-vs-50.2M mismatch)', () => {
    const sum = VHD_DEMO_ROI_CATEGORIES.reduce((s, c) => s + c.value, 0);
    expect(sum).toBeCloseTo(VHD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(VHD_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBeCloseTo(VHD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
  });
  it('YTD captured equals the realized slice', () => {
    expect(VHD_DEMO_YTD_CAPTURED_M).toBeCloseTo(VHD_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized (3.4M)', () => {
    const qSum = VHD_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(VHD_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((VHD_DEMO_ANNUAL_OPPORTUNITY_M - VHD_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity (fixes 2.4 vs 2.8)', () => {
    expect(VHD_DEMO_AT_RISK.immediateRevenue + VHD_DEMO_AT_RISK.deferralRevenue).toBe(VHD_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(VHD_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(VHD_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (VHD_DEMO_ANNUAL_OPPORTUNITY_M - VHD_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(VHD_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive dollars are decompositions of the same total', () => {
    expect(VHD_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBeCloseTo(VHD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000, 0);
    expect(VHD_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(VHD_DEMO_PIPELINE.quarters[0].revenue);
    expect(VHD_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBeCloseTo(VHD_DEMO_WATERFALL.realized_revenue * 1_000_000, 0);
    expect(VHD_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(VHD_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('VHD Exec convergence - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = VHD_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = VHD_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(VHD_DEMO_PVR.totalProjected);
    expect(rSum).toBe(VHD_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(VHD_DEMO_PVR.totalRealized).toBe(VHD_DEMO_WATERFALL.realized_revenue * 1_000_000); // $1.9M
    expect(VHD_DEMO_PVR.gap).toBe(VHD_DEMO_AT_RISK.immediateRevenue); // $1.8M
    expect(VHD_DEMO_PVR.totalProjected).toBe(VHD_DEMO_PVR.totalRealized + VHD_DEMO_PVR.gap); // $3.7M
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    VHD_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the view feeds the P-v-R chart the model months; the ~55M monthlyData array is gone', () => {
    const view = src(VIEW);
    expect(view).toContain('monthlyData={VHD_DEMO_PVR.months}');
    expect(view).not.toContain('const valvularMonthlyData');
  });
});

// ------------------- Consolidated VHDForwardOutlookPanel -------------------
describe('VHD Exec convergence - consolidated VHDForwardOutlookPanel', () => {
  it('renders all three figure-sets from the single demo model', () => {
    const html = render(<VHDForwardOutlookPanel />);
    expect(html).toContain('$3.4M projected over 12 months');
    expect(html).toContain('Q1 2026');
    expect(html).toContain('$1.8M'); // immediate at-risk
    expect(html).toContain('$2.4M'); // 12-month cumulative
    expect(html).toContain('= the YTD projected-realized gap');
    expect(html).toContain('$4.7M'); // systematic closure
    expect(html).toContain('$2.8M'); // acceleration = 4.7 - 1.9
    expect(html).toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Waterfall re-scope + banned program-revenue literals gone -------------------
describe('VHD Exec convergence - the single waterfall is re-scoped to the gap opportunity', () => {
  const view = src(VIEW);
  it('the single ROI waterfall reads the model (5.3M), not the removed 50.2M categories', () => {
    expect(view).toContain('categories={VHD_DEMO_ROI_CATEGORIES}');
    expect(view).toContain('VHD_DEMO_WATERFALL.total_revenue * 1000000');
    expect(view).not.toContain('const valvularWaterfallCategories');
  });
  it('the program-revenue literals (51.7M / 38.2M / 50.2M-categories / $58M) do not appear anywhere on the tier', () => {
    expect(view).not.toContain('51700000');
    expect(view).not.toContain('38200000');
    expect(view).not.toContain('18400000'); // first program-revenue category value
    expect(view).not.toContain("'$58M'");
  });
});

// ------------------- Demo badges: panels + the 5 detail modals -------------------
describe('VHD Exec convergence - demo badges on data-dependency surfaces', () => {
  const view = src(VIEW);
  it('the view marks the mock-fed financial panels (waterfall / DRG / P-v-R / benchmarks)', () => {
    const badgeUses = view.split('<DemoDataBadge').length - 1;
    expect(badgeUses).toBeGreaterThanOrEqual(4);
    expect(src('../../ui/valvularDisease/components/VHDForwardOutlookPanel.tsx')).toContain('<DemoDataBadge');
  });
  it('all 5 detail modals pass the BaseDetailModal demoBadge prop', () => {
    // drg, month, benchmark, category, zip
    expect(view.split('demoBadge').length - 1).toBeGreaterThanOrEqual(5);
  });
  it('BaseDetailModal renders the badge header only when demoBadge is set (default off)', () => {
    const metric = [{ label: 'Annual Opportunity', value: '1.9M', colorScheme: 'porsche' as const }];
    const withBadge = render(<BaseDetailModal title="Surgical vs Interventional" subtitle="x" demoBadge summaryMetrics={metric} onClose={() => {}} />);
    expect(withBadge).toContain('Demo data - EHR integration pending');
    const noBadge = render(<BaseDetailModal title="Surgical vs Interventional" subtitle="x" summaryMetrics={metric} onClose={() => {}} />);
    expect(noBadge).not.toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Controls: DRG modal export stub dropped -------------------
describe('VHD Exec convergence - dead control removed', () => {
  it('the DRG modal no longer renders a console.log Export button (onExport dropped)', () => {
    const view = src(VIEW);
    expect(view).not.toContain("console.log('Exporting DRG detail')");
    expect(view).not.toContain('onExport');
  });
});

// ------------------- IA restructure: ruled render order + Export in header -------------------
describe('VHD Exec convergence - ruled render order (7 panels, no facility slot)', () => {
  const view = src(VIEW);
  it('sections render in the exec-narrative order (summary -> gaps -> waterfall -> DRG -> P-v-R -> forward -> ZIP)', () => {
    const order = [
      '<VHDExecutiveSummary',
      '<GapIntelligenceCard',
      '3. Revenue Opportunity Waterfall',
      '4. DRG Performance cards',
      '5. Projected vs Realized',
      '<VHDForwardOutlookPanel />',
      '7. Geographic Heat Map',
    ];
    let prev = -1;
    order.forEach((marker) => {
      const idx = view.indexOf(marker);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    });
  });
  it('Export folded into the tier header (no standalone export row; AUDIT-161 VHD inversion closed)', () => {
    expect(view).not.toContain('flex justify-end mb-6');
    expect(view).toContain('Valvular Disease Executive Dashboard');
    expect(view.indexOf('<ExportButton')).toBeLessThan(view.indexOf('<VHDExecutiveSummary'));
    expect(view.indexOf('Valvular Disease Executive Dashboard')).toBeLessThan(view.indexOf('<ExportButton'));
  });
});

describe('VHD Exec convergence - relocations + consolidation absences on the exec tier', () => {
  const view = src(VIEW);
  it('the forward trio + banner are gone from the view (consolidated into VHDForwardOutlookPanel)', () => {
    expect(view).not.toContain('RevenuePipelineCard');
    expect(view).not.toContain('RevenueAtRiskCard');
    expect(view).not.toContain('TrajectoryTrendsCard');
    expect(view).not.toContain('PredictiveMetricsBanner');
  });
  it('Gap Response Rate no longer renders on the exec tier', () => {
    expect(view).not.toContain('GapResponseRateCard');
  });
});

describe('VHD Exec convergence - Service Line carries the relocated content', () => {
  const sl = src('../../ui/valvularDisease/views/ValvularServiceLineView.tsx');
  it('gap-detection tab renders the relocated GapResponseRateCard', () => {
    expect(sl).toContain('GapResponseRateCard');
  });
  it('risk-heatmap tab renders the relocated TrajectoryTrendsCard', () => {
    expect(sl).toContain('TrajectoryTrendsCard');
  });
});
