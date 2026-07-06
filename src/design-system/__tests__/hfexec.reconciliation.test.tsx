/**
 * HF Executive batch 1 - data reconciliation + honesty labels.
 *
 * Verifies: the wired KPI cards read the dashboard contract (not the old
 * hardcoded 2,847 / 65%); the tier renders a single "Total HF Patients";
 * the demo financial model is internally consistent by construction (every
 * card is a stated decomposition of one total); the CMI variance matches its
 * stated target; the false "Live tracking" pill is gone; demo badges mark the
 * DATA-DEPENDENCY cards.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing
 * Library (matches primitives.regression / audit303 / audit304 suites).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { HFExecutiveSummary } from '../../components/heartFailure/HFExecutiveSummary';
import GapResponseRateCard from '../../components/shared/GapResponseRateCard';
import GapIntelligenceSection from '../../ui/heartFailure/components/executive/GapIntelligenceSection';
import ProjectedVsRealizedChart from '../../ui/heartFailure/components/ProjectedVsRealizedChart';
import { RevenuePipelineCard, RevenueAtRiskCard } from '../../components/shared/ForwardLookingCards';
import type { HFDashboardData } from '../../services/api';
import {
  HF_DEMO_ANNUAL_OPPORTUNITY_M,
  HF_DEMO_WATERFALL,
  HF_DEMO_CATEGORY_DETAIL,
  HF_DEMO_YTD_CAPTURED_M,
  HF_DEMO_PIPELINE,
  HF_DEMO_AT_RISK,
  HF_DEMO_PREDICTIVE,
  HF_DEMO_FACILITIES,
  HF_DEMO_DOC_OPPORTUNITIES,
  HF_DEMO_DOC_PIPELINE_SUMMARY,
  HF_DEMO_PVR,
} from '../../ui/heartFailure/config/hfDemoFinancials';

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

const FAKE_DASHBOARD: HFDashboardData = {
  summary: {
    totalPatients: 4321,
    // totalOpenGaps (342) deliberately distinguishable from the gapsByType key-count (2)
    // so the GapIntelligenceCard feed test can tell them apart.
    totalOpenGaps: 342,
    gapsByType: { MEDICATION_MISSING: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
    gdmtOptimized: 1234,
  },
  gdmtMetrics: {
    aceArb: { current: 80, target: 95, status: 'amber', missingCount: 10 },
    betaBlocker: { current: 85, target: 95, status: 'amber', missingCount: 8 },
    mra: { current: 60, target: 85, status: 'red', missingCount: 20 },
    sglt2i: { current: 55, target: 75, status: 'red', missingCount: 25 },
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- Wired KPI cards read the contract -------------------
describe('HF Exec batch 1 - HFExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total, not the old hardcoded 2,847', () => {
    const html = render(<HFExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('4,321'); // summary.totalPatients
    expect(html).not.toContain('2,847'); // old hardcode gone
  });
  it('renders the derived GDMT-optimized rate + honest eligibility-aware label', () => {
    const html = render(<HFExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    const rate = Math.round((1234 / 4321) * 100); // 29
    expect(html).toContain(`${rate}%`);
    expect(html).not.toContain('65%'); // old hardcode gone
    expect(html).toContain('no unresolved GDMT medication gaps');
    expect(html).toContain('GDMT Optimized (no open med gaps)');
  });
  it('renders the API device-candidate count', () => {
    const html = render(<HFExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('77');
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<HFExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo'); // per-card pill on non-wired cards
    expect(html).toContain(`$${HF_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`); // $6.2M
    expect(html).not.toContain('$5.2M'); // old contradictory total gone
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<HFExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('2,847');
  });
});

// ------------------- Single "Total HF Patients" on the tier -------------------
describe('HF Exec batch 1 - single patient-total label', () => {
  it('HFExecutiveSummary carries exactly one "Total HF Patients" label', () => {
    const s = src('../../components/heartFailure/HFExecutiveSummary.tsx');
    expect(s.split('Total HF Patients').length - 1).toBe(1);
  });
  it('ExecutiveView no longer renders a duplicate "Total HF Patients" tile', () => {
    const s = src('../../ui/heartFailure/views/ExecutiveView.tsx');
    expect(s).not.toContain('Total HF Patients');
  });
  it('dead HFModule patientCount config removed', () => {
    expect(src('../../ui/heartFailure/HFModule.tsx')).not.toContain('patientCount');
  });
});

// ------------------- Demo financial model - internal consistency -------------------
describe('HF Exec batch 1 - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total', () => {
    const sum = HF_DEMO_WATERFALL.gdmt_revenue + HF_DEMO_WATERFALL.devices_revenue
      + HF_DEMO_WATERFALL.phenotypes_revenue + HF_DEMO_WATERFALL._340b_revenue;
    expect(sum).toBeCloseTo(HF_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(HF_DEMO_WATERFALL.total_revenue).toBeCloseTo(HF_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(HF_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBe(HF_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('YTD captured equals the realized slice', () => {
    expect(HF_DEMO_YTD_CAPTURED_M).toBeCloseTo(HF_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized', () => {
    const qSum = HF_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(HF_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((HF_DEMO_ANNUAL_OPPORTUNITY_M - HF_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity', () => {
    expect(HF_DEMO_AT_RISK.immediateRevenue + HF_DEMO_AT_RISK.deferralRevenue).toBe(HF_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(HF_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(HF_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (HF_DEMO_ANNUAL_OPPORTUNITY_M - HF_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(HF_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive banner dollars are decompositions of the same total', () => {
    expect(HF_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBe(HF_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
    expect(HF_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(HF_DEMO_PIPELINE.quarters[0].revenue);
    expect(HF_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBe(HF_DEMO_WATERFALL.realized_revenue * 1_000_000);
    expect(HF_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(HF_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
  it('facility decomposition sums to the same total', () => {
    const fSum = HF_DEMO_FACILITIES.reduce((s, f) => s + f.opp_revenue, 0);
    expect(fSum).toBe(HF_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('doc-pipeline headline is derived from its own rows (23; buckets sum exactly)', () => {
    const { count, totalDollars, high, medium, low } = HF_DEMO_DOC_PIPELINE_SUMMARY;
    expect(count).toBe(HF_DEMO_DOC_OPPORTUNITIES.length);
    expect(count).toBe(23);
    expect(high.count + medium.count + low.count).toBe(count);
    expect(high.dollars + medium.dollars + low.dollars).toBe(totalDollars);
    expect(totalDollars).toBe(HF_DEMO_DOC_OPPORTUNITIES.reduce((s, o) => s + o.revenueImpact, 0));
  });
  it('the old contradictory literals are gone from the view', () => {
    const s = src('../../ui/heartFailure/views/ExecutiveView.tsx');
    expect(s).not.toContain('$127,240');
    expect(s).not.toContain('7700000');
    expect(s).not.toContain('9100000');
    expect(s).not.toContain('14000000');
  });
});

// ------------------- CMI arithmetic -------------------
describe('HF Exec batch 1 - CMI variance agrees with its stated target', () => {
  const s = src('../../ui/heartFailure/views/ExecutiveView.tsx');
  it('renders -0.02 vs the 2.30 target (2.28 current)', () => {
    expect(s).toContain('-0.02 vs 2.30 target');
    expect(s).not.toContain('+0.28 vs target');
  });
  it('export row states the same target/variance', () => {
    expect(s).toContain("'2.30', '-0.02'");
  });
  it('monthly opportunity aligned to the doc pipeline (no stray +$387K)', () => {
    const cfg = src('../../ui/heartFailure/config/executiveConfig.ts');
    expect(cfg).toContain('+$126K');
    expect(cfg).not.toContain('+$387K');
  });
});

// ------------------- False "Live tracking" pill -------------------
describe('HF Exec batch 1 - GapResponseRateCard honesty', () => {
  it('the hardcoded "Live tracking" pill is gone from the component', () => {
    expect(src('../../components/shared/GapResponseRateCard.tsx')).not.toContain('Live tracking');
  });
  it('renders the honest pending empty state when fed no data', () => {
    const html = render(<GapResponseRateCard rates={[]} overallRate={0} timeRange="30d" />);
    expect(html).toContain('No response data yet - EHR integration pending');
    expect(html).toContain('EHR integration pending');
    expect(html).not.toContain('Live tracking');
  });
});

// ------------------- Gap Intelligence - open-gap count + honest offline frame -------------------
describe('HF Exec batch 1 addendum - GapIntelligenceSection', () => {
  it('the section feeds summary.totalOpenGaps, not the gapsByType key-count', () => {
    const s = src('../../ui/heartFailure/components/executive/GapIntelligenceSection.tsx');
    expect(s).toContain('totalGaps: s.totalOpenGaps');
    expect(s).not.toContain('Object.keys');
  });
  it('with data: renders the open-gap count (342), never the type count (2)', () => {
    const html = render(<GapIntelligenceSection dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342 auto-detected gaps');
    expect(html).not.toContain('>2 auto-detected gaps');
  });
  it('offline/error: the frame renders with an honest placeholder, no fabricated count', () => {
    const html = render(<GapIntelligenceSection dashboard={null} error="down" />);
    expect(html).toContain('Clinical Gap Intelligence'); // frame + title still present
    expect(html).toContain('Live gap data unavailable - requires database connection');
    expect(html).not.toContain('auto-detected gaps'); // no numeric count anywhere
  });
  it('loading: the frame renders a pulse, no fabricated count', () => {
    const html = render(<GapIntelligenceSection dashboard={null} loading />);
    expect(html).toContain('Clinical Gap Intelligence');
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('auto-detected gaps');
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('HF Exec batch 1 addendum 2 - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = HF_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = HF_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(HF_DEMO_PVR.totalProjected);
    expect(rSum).toBe(HF_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices of the one model: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(HF_DEMO_PVR.totalRealized).toBe(HF_DEMO_WATERFALL.realized_revenue * 1_000_000); // $3.1M
    expect(HF_DEMO_PVR.gap).toBe(HF_DEMO_AT_RISK.immediateRevenue); // $1.4M
    expect(HF_DEMO_PVR.totalProjected).toBe(HF_DEMO_PVR.totalRealized + HF_DEMO_PVR.gap); // $4.5M
    expect(HF_DEMO_PVR.totalProjected).not.toBe(11300000); // the old contradictory family is gone
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    HF_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the chart reads the model; the hand-typed 10-month array is gone', () => {
    const s = src('../../ui/heartFailure/components/ProjectedVsRealizedChart.tsx');
    expect(s).toContain('HF_DEMO_PVR.months');
    expect(s).not.toContain('850000'); // first literal of the old array
    expect(s).not.toContain('hfMonthlyData');
  });
  it('Gap card carries a sublabel tying it to the at-risk decomposition', () => {
    const chart = src('../../ui/heartFailure/components/ProjectedVsRealizedChart.tsx');
    expect(chart).toContain('gapSublabel="Immediate at-risk slice (this quarter) - see Revenue at Risk"');
    // And the shared panel actually renders it under the Gap total.
    const html = render(
      <ProjectedVsRealizedChart />
    );
    expect(html).toContain('Immediate at-risk slice (this quarter) - see Revenue at Risk');
  });
  it('Revenue-at-Risk This-Quarter sublabel cross-references the P-v-R gap', () => {
    const html = render(
      <RevenueAtRiskCard data={HF_DEMO_AT_RISK} immediateNote="= the YTD projected-realized gap" />
    );
    expect(html).toContain('89 patients in immediate time horizon = the YTD projected-realized gap');
  });
});

// ------------------- Demo badges on DATA-DEPENDENCY cards -------------------
describe('HF Exec batch 1 - demo badges present where no backend source exists', () => {
  it('shared revenue cards render the badge when demoData is set', () => {
    const html = render(<RevenuePipelineCard data={HF_DEMO_PIPELINE} demoData />);
    expect(html).toContain('Demo data - EHR integration pending');
  });
  it('shared revenue cards stay unchanged for other modules (no badge without the prop)', () => {
    const html = render(<RevenueAtRiskCard data={HF_DEMO_AT_RISK} />);
    expect(html).not.toContain('Demo data - EHR integration pending');
  });
  it('ExecutiveView marks every mock-fed financial surface (badge usages + demoData props)', () => {
    const s = src('../../ui/heartFailure/views/ExecutiveView.tsx');
    const badgeUses = s.split('<DemoDataBadge').length - 1;
    const demoProps = s.split('demoData').length - 1;
    // ROIWaterfall, Projected-vs-Realized, Benchmarks, Facility, doc-pipeline, DRG/CMI headers
    expect(badgeUses).toBeGreaterThanOrEqual(6);
    // RevenuePipeline, RevenueAtRisk, Trajectory, PredictiveMetricsBanner
    expect(demoProps).toBeGreaterThanOrEqual(4);
  });
});
