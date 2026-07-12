/**
 * SH (Structural Heart) Executive convergence to the HF/EP exemplar (AUDIT-304 SH).
 *
 * Verifies: the new SHExecutiveSummary reads the live SH dashboard contract
 * (patients / open gaps / device candidates) with honest offline states; the
 * GapIntelligenceCard headline reads live totalOpenGaps + real totalPatients
 * (killing the 830 category-sum-as-population mislabel) while its composition stays
 * demo-badged; the single shDemoFinancials model is internally consistent by
 * construction; the consolidated SHForwardOutlookPanel renders three figure sets;
 * the IA is reordered to the 8-panel exec narrative with Export folded into the
 * header; the relocated cards live on the Service Line; and the DRG drill-down no
 * longer crashes ("cases is not iterable").
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing
 * Library (matches epexec.convergence / hfexec.reconciliation suites).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import SHExecutiveSummary, { SHDashboardData } from '../../ui/structuralHeart/components/SHExecutiveSummary';
import SHForwardOutlookPanel from '../../ui/structuralHeart/components/SHForwardOutlookPanel';
import SHDRGDetailModal from '../../ui/structuralHeart/components/SHDRGDetailModal';
import SHFacilityDetailModal from '../../ui/structuralHeart/components/SHFacilityDetailModal';
import GapIntelligenceCard from '../../components/shared/GapIntelligenceCard';
import {
  SH_DEMO_ANNUAL_OPPORTUNITY_M,
  SH_DEMO_WATERFALL,
  SH_DEMO_CATEGORY_DETAIL,
  SH_DEMO_YTD_CAPTURED_M,
  SH_DEMO_PIPELINE,
  SH_DEMO_AT_RISK,
  SH_DEMO_PREDICTIVE,
  SH_DEMO_FACILITIES,
  SH_DEMO_PVR,
  SH_DEMO_CATEGORIES,
  SH_DEMO_TOPGAPS,
  SH_DEMO_SAFETY_ALERT,
} from '../../ui/structuralHeart/config/shDemoFinancials';

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

const VIEW = '../../ui/structuralHeart/views/StructuralExecutiveView.tsx';

// totalPatients (4321) / totalOpenGaps (342) deliberately distinguishable from the
// demo category-sum (830) so the wired-vs-demo tests can tell them apart.
const FAKE_DASHBOARD: SHDashboardData = {
  summary: {
    totalPatients: 4321,
    totalOpenGaps: 342,
    gapsByType: { VALVE_INTERVENTION: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- SHExecutiveSummary wired to the live contract -------------------
describe('SH Exec convergence - SHExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total as the live population figure', () => {
    const html = render(<SHExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('4,321'); // summary.totalPatients (live)
    // The 830 category-sum-as-population mislabel is killed on the GapIntelligenceCard
    // headline (asserted below), not here - the at-risk DEMO card legitimately shows 830.
    expect(html).toContain('Active SH panel (database)'); // live subtext present
  });
  it('renders the live open-gap count and device-candidate count', () => {
    const html = render(<SHExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342');
    expect(html).toContain('77');
    expect(html).toContain('Open Therapy Gaps');
    expect(html).toContain('Device Therapy Candidates');
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<SHExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo');
    expect(html).toContain(`$${SH_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`); // $10.9M
    expect(html).toContain(`$${SH_DEMO_YTD_CAPTURED_M.toFixed(1)}M`); // $3.6M realized slice
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<SHExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('4,321');
  });
  it('shows a loading placeholder while live data is in flight (no fabricated count)', () => {
    const html = render(<SHExecutiveSummary dashboard={null} loading />);
    expect(html).toContain('Loading live data');
  });
});

// ------------------- Single patient-total on the tier -------------------
describe('SH Exec convergence - single patient-total label', () => {
  it('SHExecutiveSummary carries exactly one "Total SH Patients" label', () => {
    const s = src('../../ui/structuralHeart/components/SHExecutiveSummary.tsx');
    expect(s.split('Total SH Patients').length - 1).toBe(1);
  });
  it('the view owns no duplicate patient tile (the summary owns it)', () => {
    expect(src(VIEW)).not.toContain('Total SH Patients');
  });
});

// ------------------- GapIntelligenceCard headline: live count + real population -------------------
describe('SH Exec convergence - GapIntelligenceCard headline reads live, composition stays demo', () => {
  it('headline reads the live open-gap count across the real patient total (not 830)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 342, categories: SH_DEMO_CATEGORIES, topGaps: SH_DEMO_TOPGAPS, safetyAlert: SH_DEMO_SAFETY_ALERT }}
        totalPatients={4321}
        compositionDemo
      />
    );
    expect(html).toContain('342 auto-detected gaps across 4,321 patients');
    expect(html).not.toContain('across 830 patients'); // category-sum mislabel killed
    expect(html).toContain('Demo composition');
  });
  it('the shared component is byte-unchanged for the other modules (no override, no badge)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 10, categories: SH_DEMO_CATEGORIES, topGaps: SH_DEMO_TOPGAPS, safetyAlert: 'x' }}
      />
    );
    expect(html).toContain('across 830 patients'); // falls back to the category sum
    expect(html).not.toContain('Demo composition');
  });
  it('the view feeds the card live totalOpenGaps + real totalPatients + demo composition', () => {
    const view = src(VIEW);
    expect(view).toContain('totalGaps: dashboard?.summary?.totalOpenGaps ?? 0');
    expect(view).toContain('totalPatients={dashboard?.summary?.totalPatients ?? 0}');
    expect(view).toContain('compositionDemo');
    expect(view).toContain('categories: SH_DEMO_CATEGORIES');
    expect(view).toContain('safetyAlert: SH_DEMO_SAFETY_ALERT');
    // the old inline literals (category-sum donut + hardcoded safety line) are gone
    expect(view).not.toContain('patients: 180');
    expect(view).not.toContain('CRITICAL: 28 patients');
  });
});

// ------------------- Demo financial model - internal consistency -------------------
describe('SH Exec convergence - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total', () => {
    const sum = SH_DEMO_WATERFALL.valveTherapy_revenue + SH_DEMO_WATERFALL.procedures_revenue
      + SH_DEMO_WATERFALL.phenotypes_revenue + SH_DEMO_WATERFALL._340b_revenue;
    expect(sum).toBeCloseTo(SH_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(SH_DEMO_WATERFALL.total_revenue).toBeCloseTo(SH_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(SH_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBe(SH_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('YTD captured equals the realized slice', () => {
    expect(SH_DEMO_YTD_CAPTURED_M).toBeCloseTo(SH_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized', () => {
    const qSum = SH_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(SH_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((SH_DEMO_ANNUAL_OPPORTUNITY_M - SH_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity (fixes 5.0 vs 6.2)', () => {
    expect(SH_DEMO_AT_RISK.immediateRevenue + SH_DEMO_AT_RISK.deferralRevenue).toBe(SH_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(SH_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(SH_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (SH_DEMO_ANNUAL_OPPORTUNITY_M - SH_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(SH_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive dollars are decompositions of the same total', () => {
    expect(SH_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBe(SH_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
    expect(SH_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(SH_DEMO_PIPELINE.quarters[0].revenue);
    expect(SH_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBe(SH_DEMO_WATERFALL.realized_revenue * 1_000_000);
    expect(SH_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(SH_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
  it('facility decomposition sums to the same total', () => {
    const fSum = SH_DEMO_FACILITIES.reduce((s, f) => s + f.opp_revenue, 0);
    expect(fSum).toBe(SH_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('SH Exec convergence - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = SH_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = SH_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(SH_DEMO_PVR.totalProjected);
    expect(rSum).toBe(SH_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(SH_DEMO_PVR.totalRealized).toBe(SH_DEMO_WATERFALL.realized_revenue * 1_000_000); // $3.6M
    expect(SH_DEMO_PVR.gap).toBe(SH_DEMO_AT_RISK.immediateRevenue); // $3.2M
    expect(SH_DEMO_PVR.totalProjected).toBe(SH_DEMO_PVR.totalRealized + SH_DEMO_PVR.gap); // $6.8M
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    SH_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the chart reads the model; the hand-typed 10-month array is gone', () => {
    const s = src('../../ui/structuralHeart/components/SHProjectedVsRealizedChart.tsx');
    expect(s).toContain('SH_DEMO_PVR.months');
    expect(s).not.toContain('850000'); // first literal of the old shMonthlyData array
    expect(s).not.toContain('shMonthlyData');
  });
});

// ------------------- Consolidated SHForwardOutlookPanel -------------------
describe('SH Exec convergence - consolidated SHForwardOutlookPanel', () => {
  it('renders all three figure-sets from the single demo model', () => {
    const html = render(<SHForwardOutlookPanel />);
    expect(html).toContain('$7.3M projected over 12 months');
    expect(html).toContain('Q1 2026');
    expect(html).toContain('$3.2M'); // immediate at-risk
    expect(html).toContain('$5.0M'); // 12-month cumulative
    expect(html).toContain('= the YTD projected-realized gap');
    expect(html).toContain('$9.8M'); // systematic closure
    expect(html).toContain('$6.2M'); // acceleration = 9.8 - 3.6
    expect(html).toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Demo badges on DATA-DEPENDENCY surfaces -------------------
describe('SH Exec convergence - demo badges present where no backend source exists', () => {
  it('the view marks every mock-fed financial surface (badge usages)', () => {
    const view = src(VIEW);
    const badgeUses = view.split('<DemoDataBadge').length - 1;
    // Waterfall, DRG/CMI, Projected-vs-Realized, Benchmarks, Facility, pipeline-detail
    expect(badgeUses).toBeGreaterThanOrEqual(6);
    expect(src('../../ui/structuralHeart/components/SHForwardOutlookPanel.tsx')).toContain('<DemoDataBadge');
  });
  it('the fabricated facility drill-down modal content is demo-badged', () => {
    expect(src('../../ui/structuralHeart/components/SHFacilityDetailModal.tsx')).toContain('<DemoDataBadge');
  });
});

// ------------------- Controls: preserved facility affordance + explicit pipeline handler -------------------
describe('SH Exec convergence - control affordances', () => {
  const view = src(VIEW);
  it('the facility click affordance is PRESERVED (opens the demo-badged modal, not removed)', () => {
    expect(view).toContain('handleFacilityClick');
    expect(view).toContain('cursor-pointer');
  });
  it('View Pipeline Details button has an explicit handler (no bubble-only reliance)', () => {
    const openers = view.split('onClick={() => setShowOpportunityModal(true)}').length - 1;
    expect(openers).toBeGreaterThanOrEqual(2);
    expect(view).toContain('View Pipeline Details');
  });
});

// ------------------- IA restructure: ruled render order + Export in header -------------------
describe('SH Exec convergence - ruled render order', () => {
  const view = src(VIEW);
  it('sections render in the exec-narrative order (summary -> gaps -> waterfall -> DRG -> P-v-R -> forward -> facility -> ZIP)', () => {
    const order = [
      '<SHExecutiveSummary',
      '<GapIntelligenceCard',
      '3. Revenue Opportunity Waterfall',
      'Structural Heart DRG Performance',
      '5. Projected vs Realized',
      '<SHForwardOutlookPanel />',
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
  it('Export folded into the tier header (no standalone export section; AUDIT-161 SH inversion closed)', () => {
    expect(view).not.toContain('Export Button - Clean Integration');
    expect(view).toContain('Structural Heart Executive Dashboard');
    expect(view.indexOf('<ExportButton')).toBeLessThan(view.indexOf('<SHExecutiveSummary'));
    expect(view.indexOf('Structural Heart Executive Dashboard')).toBeLessThan(view.indexOf('<ExportButton'));
  });
});

describe('SH Exec convergence - relocations + consolidation absences on the exec tier', () => {
  const view = src(VIEW);
  it('the forward trio + banner are gone from the view (consolidated into SHForwardOutlookPanel)', () => {
    expect(view).not.toContain('RevenuePipelineCard');
    expect(view).not.toContain('RevenueAtRiskCard');
    expect(view).not.toContain('TrajectoryTrendsCard');
    expect(view).not.toContain('PredictiveMetricsBanner');
  });
  it('Gap Response Rate no longer renders on the exec tier', () => {
    expect(view).not.toContain('GapResponseRateCard');
  });
});

describe('SH Exec convergence - Service Line carries the relocated content', () => {
  const sl = src('../../ui/structuralHeart/views/StructuralServiceLineView.tsx');
  it('gap-detection tab renders the relocated GapResponseRateCard', () => {
    expect(sl).toContain('GapResponseRateCard');
  });
  it('risk-heatmap tab renders the relocated TrajectoryTrendsCard', () => {
    expect(sl).toContain('TrajectoryTrendsCard');
  });
});

// ------------------- DRG drill-down crash fix (the cross-module watch-item) -------------------
// The SH DRG card passed cases={selectedDRG.cases} where cases is the numeric COUNT
// (45); SHDRGDetailModal did [...(cases || [])].sort(...), and 45 || [] is 45, so the
// guard was false safety and [...45] threw "cases is not iterable". This block
// exercises the crash path directly.
const baseDrgProps = {
  drgCode: '266',
  description: 'TAVR w MCC',
  volume: 45,
  avgReimbursement: 54320,
  totalRevenue: 54320 * 45,
  avgLos: 3.2,
  avgCost: 28900,
  margin: 46.8,
  targetLos: 3.0,
  hospitalAvgLos: 3.2,
  nationalBenchmarkLos: 3.5,
  onClose: () => {},
};
const wellFormedCases = [
  { caseId: 'SH-266-01', ageRange: '65-74', los: 2.6, cost: 26600, revenue: 57000, margin: 30400, marginPercent: 53.3 },
  { caseId: 'SH-266-02', ageRange: '75-84', los: 3.2, cost: 28900, revenue: 54320, margin: 25420, marginPercent: 46.8 },
];

describe('SH Exec convergence - DRG drill-down crash fix (regression)', () => {
  it('(a) renders demo case-level content without throwing when fed a well-formed cases array', () => {
    let html = '';
    expect(() => { html = render(<SHDRGDetailModal {...baseDrgProps} cases={wellFormedCases} />); }).not.toThrow();
    expect(html).toContain('DRG 266');
    expect(html).toContain('SH-266-01'); // a de-identified case row rendered
    expect(html).toContain('Demo data - DRG billing source pending'); // modal demo-badged
  });
  it('(b) does NOT crash when cases is the numeric case COUNT (the shipped latent bug); renders the honest empty state', () => {
    let html = '';
    // cases={45} is exactly what the un-mapped DRG card object passed (structuralData.drgs[].cases)
    expect(() => { html = render(<SHDRGDetailModal {...baseDrgProps} cases={45 as any} />); }).not.toThrow();
    expect(html).toContain('No case-level detail - demo DRG data');
    expect(html).toContain('DRG 266');
  });
  it('(b2) does NOT crash when cases is undefined; honest empty state', () => {
    let html = '';
    expect(() => { html = render(<SHDRGDetailModal {...baseDrgProps} cases={undefined as any} />); }).not.toThrow();
    expect(html).toContain('No case-level detail - demo DRG data');
  });
  it('the view feeds the DRG modal via the well-formed detail builder, not the raw card object', () => {
    const view = src(VIEW);
    expect(view).toContain('getSHDRGDetailData(drgCode)');
    expect(view).toContain('const getSHDRGDetailData');
    expect(view).not.toContain('const drgData = getDRGData(drgCode)'); // old crashing feed gone
  });
});

// ------------------- Facility modal empty-value fix (Chrome-found) -------------------
// The facility drill-down rendered a bare "%" (Valve Therapy Optimization Rate) and a
// fabricated "$0" (provider Revenue Impact). Root cause was hybrid: a prop-name mismatch
// (call site emitted gdmtRate; modal reads valveTherapyRate) + genuinely-absent provider
// fields (structural-data providers carry only name/specialty/procedures). Fix: rename at
// the call site (real rate renders) + honest '-' for genuinely-absent provider fields.
describe('SH Exec convergence - facility modal honest empty values', () => {
  it('renders the real rate but an honest "-" for a genuinely-absent provider revenueImpact (never a fabricated $0)', () => {
    const html = render(
      <SHFacilityDetailModal
        facilityName="Main Campus"
        location="1000 Medical Center Dr"
        totalRevenue={4500000}
        patientCount={412}
        valveTherapyRate={88}
        captureRate={94}
        breakdown={[{ category: 'TAVR', revenue: 2600000 }]}
        providers={[{ name: 'Dr. Jennifer Adams', patients: undefined as any, valveTherapyRate: undefined as any, revenueImpact: undefined as any }]}
        onClose={() => {}}
      />
    );
    expect(html).toContain('88%'); // top-level rate renders (the mismatch is corrected upstream)
    expect(html).not.toContain('$0'); // absent provider revenueImpact -> honest '-', not a false $0
  });
  it('the view maps the facility rate to valveTherapyRate (not gdmtRate) and normalizes providers', () => {
    const view = src(VIEW);
    expect(view).toContain('valveTherapyRate: facilityData.gdmtRate'); // rename at the source
    expect(view).toContain('normalizeProviders'); // provider normalization boundary
    expect(view).not.toContain('gdmtRate: facilityData.gdmtRate'); // the mismatched wiring is gone
  });
});
