/**
 * EP Executive convergence to the HF exemplar (AUDIT-304 replication).
 *
 * Verifies: the new EPExecutiveSummary reads the live EP dashboard contract
 * (patients / open gaps / device candidates) with honest offline states; the
 * GapIntelligenceCard headline reads live totalOpenGaps + real totalPatients
 * (killing the 1,730 category-sum-as-population mislabel) while its composition
 * stays demo-badged; the single epDemoFinancials model is internally consistent
 * by construction; the consolidated EPForwardOutlookPanel renders three figure
 * sets from that model; the IA is reordered to the 8-panel exec narrative with
 * Export folded into the header; and the relocated cards live on the Service
 * Line, not the exec tier.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing
 * Library (matches hfexec.reconciliation / primitives.regression suites).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import EPExecutiveSummary, { EPDashboardData } from '../../ui/electrophysiology/components/EPExecutiveSummary';
import EPForwardOutlookPanel from '../../ui/electrophysiology/components/EPForwardOutlookPanel';
import EPDRGDetailModal from '../../ui/electrophysiology/components/EPDRGDetailModal';
import GapIntelligenceCard from '../../components/shared/GapIntelligenceCard';
import {
  EP_DEMO_ANNUAL_OPPORTUNITY_M,
  EP_DEMO_WATERFALL,
  EP_DEMO_CATEGORY_DETAIL,
  EP_DEMO_YTD_CAPTURED_M,
  EP_DEMO_PIPELINE,
  EP_DEMO_AT_RISK,
  EP_DEMO_PREDICTIVE,
  EP_DEMO_FACILITIES,
  EP_DEMO_PVR,
  EP_DEMO_CATEGORIES,
  EP_DEMO_TOPGAPS,
  EP_DEMO_SAFETY_ALERT,
} from '../../ui/electrophysiology/config/epDemoFinancials';

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
  return container.innerHTML;
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

const VIEW = '../../ui/electrophysiology/views/EPExecutiveView.tsx';

// totalOpenGaps (342) and totalPatients (4321) are deliberately distinguishable
// from the demo category-sum (1730) so the wired-vs-demo tests can tell them apart.
const FAKE_DASHBOARD: EPDashboardData = {
  summary: {
    totalPatients: 4321,
    totalOpenGaps: 342,
    gapsByType: { LAAC_CANDIDATE: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- EPExecutiveSummary wired to the live contract -------------------
describe('EP Exec convergence - EPExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total (never the 1,730 category-sum mislabel)', () => {
    const html = render(<EPExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('4,321'); // summary.totalPatients
    expect(html).not.toContain('1,730'); // category-sum-as-population is not a live figure
  });
  it('renders the live open-gap count and device-candidate count', () => {
    const html = render(<EPExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342'); // summary.totalOpenGaps
    expect(html).toContain('77');  // summary.deviceCandidates
    expect(html).toContain('Open Therapy Gaps');
    expect(html).toContain('Device Therapy Candidates');
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<EPExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo'); // per-card pill on the non-wired cards
    expect(html).toContain(`$${EP_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`); // $8.9M
    expect(html).toContain(`$${EP_DEMO_YTD_CAPTURED_M.toFixed(1)}M`); // $4.5M realized slice
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<EPExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('4,321');
  });
  it('shows a loading placeholder while live data is in flight (no fabricated count)', () => {
    const html = render(<EPExecutiveSummary dashboard={null} loading />);
    expect(html).toContain('Loading live data');
  });
});

// ------------------- Single patient-total on the tier -------------------
describe('EP Exec convergence - single patient-total label', () => {
  it('EPExecutiveSummary carries exactly one "Total EP Patients" label', () => {
    const s = src('../../ui/electrophysiology/components/EPExecutiveSummary.tsx');
    expect(s.split('Total EP Patients').length - 1).toBe(1);
  });
  it('the view owns no duplicate patient tile (the summary owns it)', () => {
    expect(src(VIEW)).not.toContain('Total EP Patients');
  });
});

// ------------------- GapIntelligenceCard headline: live count + real population -------------------
describe('EP Exec convergence - GapIntelligenceCard headline reads live, composition stays demo', () => {
  it('headline reads the live open-gap count across the real patient total (not 1,730)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 342, categories: EP_DEMO_CATEGORIES, topGaps: EP_DEMO_TOPGAPS, safetyAlert: EP_DEMO_SAFETY_ALERT }}
        totalPatients={4321}
        compositionDemo
      />
    );
    expect(html).toContain('342 auto-detected gaps across 4,321 patients');
    expect(html).not.toContain('across 1,730 patients'); // category-sum mislabel killed
    expect(html).toContain('Demo composition'); // donut/top-gaps flagged as illustrative
  });
  it('the shared component is byte-unchanged for the other modules (no override, no badge)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 10, categories: EP_DEMO_CATEGORIES, topGaps: EP_DEMO_TOPGAPS, safetyAlert: 'x' }}
      />
    );
    expect(html).toContain('across 1,730 patients'); // falls back to the category sum
    expect(html).not.toContain('Demo composition');
  });
  it('the view feeds the card live totalOpenGaps + real totalPatients + demo composition', () => {
    const view = src(VIEW);
    expect(view).toContain('totalGaps: dashboard?.summary?.totalOpenGaps ?? 0');
    expect(view).toContain('totalPatients={dashboard?.summary?.totalPatients ?? 0}');
    expect(view).toContain('compositionDemo');
    expect(view).toContain('categories: EP_DEMO_CATEGORIES');
    expect(view).toContain('safetyAlert: EP_DEMO_SAFETY_ALERT');
    // the old inline literals (category-sum donut + hardcoded safety line) are gone
    expect(view).not.toContain('patients: 680');
    expect(view).not.toContain('CRITICAL: 134 patients');
  });
});

// ------------------- Demo financial model - internal consistency -------------------
describe('EP Exec convergence - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total', () => {
    const sum = EP_DEMO_WATERFALL.ablation_revenue + EP_DEMO_WATERFALL.devices_revenue
      + EP_DEMO_WATERFALL.phenotypes_revenue + EP_DEMO_WATERFALL._340b_revenue;
    expect(sum).toBeCloseTo(EP_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(EP_DEMO_WATERFALL.total_revenue).toBeCloseTo(EP_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(EP_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBe(EP_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('YTD captured equals the realized slice', () => {
    expect(EP_DEMO_YTD_CAPTURED_M).toBeCloseTo(EP_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized', () => {
    const qSum = EP_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(EP_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((EP_DEMO_ANNUAL_OPPORTUNITY_M - EP_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity (fixes 6.7M != 8.4M)', () => {
    expect(EP_DEMO_AT_RISK.immediateRevenue + EP_DEMO_AT_RISK.deferralRevenue).toBe(EP_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(EP_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(EP_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (EP_DEMO_ANNUAL_OPPORTUNITY_M - EP_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(EP_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive dollars are decompositions of the same total', () => {
    expect(EP_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBe(EP_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
    expect(EP_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(EP_DEMO_PIPELINE.quarters[0].revenue);
    expect(EP_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBe(EP_DEMO_WATERFALL.realized_revenue * 1_000_000);
    expect(EP_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(EP_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
  it('facility decomposition sums to the same total', () => {
    const fSum = EP_DEMO_FACILITIES.reduce((s, f) => s + f.opp_revenue, 0);
    expect(fSum).toBe(EP_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('EP Exec convergence - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = EP_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = EP_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(EP_DEMO_PVR.totalProjected);
    expect(rSum).toBe(EP_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(EP_DEMO_PVR.totalRealized).toBe(EP_DEMO_WATERFALL.realized_revenue * 1_000_000); // $4.5M
    expect(EP_DEMO_PVR.gap).toBe(EP_DEMO_AT_RISK.immediateRevenue); // $2.0M
    expect(EP_DEMO_PVR.totalProjected).toBe(EP_DEMO_PVR.totalRealized + EP_DEMO_PVR.gap); // $6.5M
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    EP_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the chart reads the model; the hand-typed 10-month array is gone', () => {
    const s = src('../../ui/electrophysiology/components/EPProjectedVsRealizedChart.tsx');
    expect(s).toContain('EP_DEMO_PVR.months');
    expect(s).not.toContain('850000'); // first literal of the old epMonthlyData array
    expect(s).not.toContain('epMonthlyData');
  });
});

// ------------------- Consolidated EPForwardOutlookPanel -------------------
describe('EP Exec convergence - consolidated EPForwardOutlookPanel', () => {
  it('renders all three figure-sets from the single demo model', () => {
    const html = render(<EPForwardOutlookPanel />);
    // pipeline: total + a quarter
    expect(html).toContain('$4.4M projected over 12 months');
    expect(html).toContain('Q1 2026');
    // at-risk split + cross-reference sublabel
    expect(html).toContain('$2.0M');
    expect(html).toContain('$3.0M');
    expect(html).toContain('= the YTD projected-realized gap');
    // capture-rate composite (current $4.5M vs systematic $8.0M vs acceleration $3.5M)
    expect(html).toContain('$8.0M');
    expect(html).toContain('$3.5M');
    // demo-badged
    expect(html).toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Demo badges on DATA-DEPENDENCY surfaces -------------------
describe('EP Exec convergence - demo badges present where no backend source exists', () => {
  it('the view marks every mock-fed financial surface (badge usages)', () => {
    const view = src(VIEW);
    const badgeUses = view.split('<DemoDataBadge').length - 1;
    // Waterfall, DRG/CMI, Projected-vs-Realized, Benchmarks, Facility, pipeline-detail
    // (the consolidated forward cluster carries its own internal DemoDataBadge).
    expect(badgeUses).toBeGreaterThanOrEqual(6);
    expect(src('../../ui/electrophysiology/components/EPForwardOutlookPanel.tsx')).toContain('<DemoDataBadge');
  });
  it('the fabricated facility drill-down modal content is demo-badged', () => {
    expect(src('../../ui/electrophysiology/components/EPFacilityDetailModal.tsx')).toContain('<DemoDataBadge');
  });
});

// ------------------- Controls: preserved facility affordance + explicit pipeline handler -------------------
describe('EP Exec convergence - control affordances', () => {
  const view = src(VIEW);
  it('the facility click affordance is PRESERVED (opens the demo-badged modal, not removed)', () => {
    expect(view).toContain('handleFacilityClick');
    expect(view).toContain('cursor-pointer');
  });
  it('View Pipeline Details button has an explicit handler (no bubble-only reliance)', () => {
    const openers = view.split('onClick={() => setShowOpportunityModal(true)}').length - 1;
    expect(openers).toBeGreaterThanOrEqual(2); // parent card + explicit button
    expect(view).toContain('View Pipeline Details');
  });
});

// ------------------- IA restructure: ruled render order + Export in header -------------------
describe('EP Exec convergence - ruled render order', () => {
  const view = src(VIEW);
  it('sections render in the exec-narrative order (summary -> gaps -> waterfall -> DRG -> P-v-R -> forward -> facility -> ZIP)', () => {
    const order = [
      '<EPExecutiveSummary',
      '<GapIntelligenceCard',
      '3. Revenue Opportunity Waterfall',
      'Electrophysiology DRG Performance', // DRG/CMI promoted from last position
      '5. Projected vs Realized',          // P-v-R + Benchmarks
      '<EPForwardOutlookPanel />',
      '7. Revenue by Facility',
      '8. Geographic Heat Map',
    ];
    let prev = -1;
    order.forEach((marker) => {
      const idx = view.indexOf(marker);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    });
  });
  it('Export folded into the tier header (no standalone export section; AUDIT-161 EP inversion closed)', () => {
    expect(view).not.toContain('Export Button - Clean Integration');
    expect(view).toContain('Electrophysiology Executive Dashboard'); // the new headline
    expect(view.indexOf('<ExportButton')).toBeLessThan(view.indexOf('<EPExecutiveSummary'));
    expect(view.indexOf('Electrophysiology Executive Dashboard')).toBeLessThan(view.indexOf('<ExportButton'));
  });
});

describe('EP Exec convergence - relocations + consolidation absences on the exec tier', () => {
  const view = src(VIEW);
  it('the forward trio + banner are gone from the view (consolidated into EPForwardOutlookPanel)', () => {
    expect(view).not.toContain('RevenuePipelineCard');
    expect(view).not.toContain('RevenueAtRiskCard');
    expect(view).not.toContain('TrajectoryTrendsCard');
    expect(view).not.toContain('PredictiveMetricsBanner');
  });
  it('Gap Response Rate no longer renders on the exec tier', () => {
    expect(view).not.toContain('GapResponseRateCard');
  });
});

describe('EP Exec convergence - Service Line carries the relocated content', () => {
  const sl = src('../../ui/electrophysiology/views/EPServiceLineView.tsx');
  it('gap-detection tab renders the relocated GapResponseRateCard', () => {
    expect(sl).toContain('GapResponseRateCard');
  });
  it('risk-heatmap tab renders the relocated TrajectoryTrendsCard', () => {
    expect(sl).toContain('TrajectoryTrendsCard');
  });
});

// ------------------- DRG drill-down crash fix (Chrome-found regression) -------------------
// Clicking a DRG card ("Pacemaker w MCC") crashed EPDRGDetailModal with "cases is not
// iterable": the DRG card object carries `cases` as a numeric COUNT, but the modal did
// `[...cases]`. This block is the coverage gap that let it ship - it exercises the
// modal's crash path directly.
const baseDrgProps = {
  drgCode: '241',
  description: 'Pacemaker w MCC',
  volume: 45,
  avgReimbursement: 127340,
  totalRevenue: 127340 * 45,
  avgLos: 2.8,
  avgCost: 60200,
  margin: 52.7,
  targetLos: 3.0,
  hospitalAvgLos: 3.0,
  nationalBenchmarkLos: 3.2,
  onClose: () => {},
};
const wellFormedCases = [
  { caseId: 'EP-241-01', ageRange: '55-64', los: 2.2, cost: 55000, revenue: 133000, margin: 78000, marginPercent: 58.6 },
  { caseId: 'EP-241-02', ageRange: '65-74', los: 2.8, cost: 60200, revenue: 127340, margin: 67140, marginPercent: 52.7 },
];

describe('EP Exec convergence - DRG drill-down crash fix (regression)', () => {
  it('(a) renders demo case-level content without throwing when fed a well-formed cases array', () => {
    let html = '';
    expect(() => { html = render(<EPDRGDetailModal {...baseDrgProps} cases={wellFormedCases} />); }).not.toThrow();
    expect(html).toContain('DRG 241');
    expect(html).toContain('EP-241-01'); // a de-identified case row rendered
    expect(html).toContain('Demo data - DRG billing source pending'); // modal demo-badged
  });
  it('(b) does NOT crash when cases is the numeric case COUNT (the shipped bug); renders the honest empty state', () => {
    let html = '';
    // cases={45} is exactly what the un-mapped DRG card object passed (electrophysiologyData.drgs[].cases)
    expect(() => { html = render(<EPDRGDetailModal {...baseDrgProps} cases={45 as any} />); }).not.toThrow();
    expect(html).toContain('No case-level detail - demo DRG data');
    expect(html).toContain('DRG 241'); // header still renders
  });
  it('(b2) does NOT crash when cases is undefined; honest empty state', () => {
    let html = '';
    expect(() => { html = render(<EPDRGDetailModal {...baseDrgProps} cases={undefined as any} />); }).not.toThrow();
    expect(html).toContain('No case-level detail - demo DRG data');
  });
  it('the view feeds the DRG modal via the well-formed detail builder, not the raw card object', () => {
    const view = src(VIEW);
    expect(view).toContain('getEPDRGDetailData(drgCode)'); // onClick uses the mapper
    expect(view).toContain('const getEPDRGDetailData'); // the mapper exists
    expect(view).not.toContain('const drgData = getDRGData(drgCode)'); // old crashing feed gone
  });
});
