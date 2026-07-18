/**
 * CAD (Coronary Intervention) Executive convergence to the HF/EP/SH exemplar (AUDIT-304 CAD).
 *
 * Verifies: the new CADExecutiveSummary reads the live CAD dashboard contract
 * (patients / open gaps / device candidates) with honest offline states; the
 * GapIntelligenceCard headline reads live totalOpenGaps + real totalPatients
 * (killing the 2,330 category-sum-as-population mislabel) while its composition stays
 * demo-badged; the single cadDemoFinancials model is internally consistent at $11.2M;
 * the TWO ROI waterfalls are consolidated into ONE (the 70.9M/50.9M/52.2M program-
 * revenue literals are gone); the consolidated CADForwardOutlookPanel renders three
 * figure sets; the IA is reordered to the 7-panel exec narrative (no facility slot)
 * with Export folded into the header; and the SAQ / Gap Response / Trajectory cards
 * are relocated to the Service Line.
 *
 * CAD-specific: NO DRG-modal crash (SharedDRGPerformance is display-only, the DRG
 * BaseDetailModal is dead code) and NO facility modal - so those regression blocks
 * from the SH suite are intentionally absent.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing Library.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import CADExecutiveSummary, { CADDashboardData } from '../../ui/coronaryIntervention/components/CADExecutiveSummary';
import CADForwardOutlookPanel from '../../ui/coronaryIntervention/components/CADForwardOutlookPanel';
import GapIntelligenceCard from '../../components/shared/GapIntelligenceCard';
import BaseDetailModal from '../../components/shared/BaseDetailModal';
import {
  CAD_DEMO_ANNUAL_OPPORTUNITY_M,
  CAD_DEMO_WATERFALL,
  CAD_DEMO_ROI_CATEGORIES,
  CAD_DEMO_CATEGORY_DETAIL,
  CAD_DEMO_YTD_CAPTURED_M,
  CAD_DEMO_PIPELINE,
  CAD_DEMO_AT_RISK,
  CAD_DEMO_PREDICTIVE,
  CAD_DEMO_PVR,
  CAD_DEMO_CATEGORIES,
  CAD_DEMO_TOPGAPS,
  CAD_DEMO_SAFETY_ALERT,
} from '../../ui/coronaryIntervention/config/cadDemoFinancials';

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

const VIEW = '../../ui/coronaryIntervention/views/CoronaryExecutiveView.tsx';

// totalPatients (4321) / totalOpenGaps (342) deliberately distinguishable from the
// demo category-sum (2330) so the wired-vs-demo tests can tell them apart.
const FAKE_DASHBOARD: CADDashboardData = {
  summary: {
    totalPatients: 4321,
    totalOpenGaps: 342,
    gapsByType: { PCI_ELIGIBLE: 300, SAFETY_ALERT: 42 },
    deviceCandidates: 77,
  },
  recentAlerts: [],
  source: 'database',
};

// ------------------- CADExecutiveSummary wired to the live contract -------------------
describe('CAD Exec convergence - CADExecutiveSummary wired to the dashboard contract', () => {
  it('renders the API patient total as the live population figure', () => {
    const html = render(<CADExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('4,321'); // summary.totalPatients (live)
    expect(html).toContain('Active intervention panel (database)'); // live subtext present
  });
  it('renders the live open-gap count and device-candidate count', () => {
    const html = render(<CADExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('342');
    expect(html).toContain('77');
    expect(html).toContain('Open Therapy Gaps');
    expect(html).toContain('Device Therapy Candidates');
  });
  it('demo cards carry a Demo pill and read the single demo model', () => {
    const html = render(<CADExecutiveSummary dashboard={FAKE_DASHBOARD} />);
    expect(html).toContain('Demo');
    expect(html).toContain(`$${CAD_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`); // $11.2M
    expect(html).toContain(`$${CAD_DEMO_YTD_CAPTURED_M.toFixed(1)}M`); // $4.1M realized slice
  });
  it('shows honest placeholders when the dashboard is unavailable (never a fabricated number)', () => {
    const html = render(<CADExecutiveSummary dashboard={null} error="down" />);
    expect(html).toContain('Live data unavailable');
    expect(html).not.toContain('4,321');
  });
  it('shows a loading placeholder while live data is in flight (no fabricated count)', () => {
    const html = render(<CADExecutiveSummary dashboard={null} loading />);
    expect(html).toContain('Loading live data');
  });
});

// ------------------- Single patient-total on the tier -------------------
describe('CAD Exec convergence - single patient-total label', () => {
  it('CADExecutiveSummary carries exactly one "Total CAD Patients" label', () => {
    const s = src('../../ui/coronaryIntervention/components/CADExecutiveSummary.tsx');
    expect(s.split('Total CAD Patients').length - 1).toBe(1);
  });
  it('the view owns no duplicate patient tile + drops the config.kpiData fallback behind the live field', () => {
    const view = src(VIEW);
    expect(view).not.toContain('Total CAD Patients');
    expect(view).not.toContain('kpiData.totalPatients }'); // the old live-with-config-fallback tile is gone
  });
});

// ------------------- GapIntelligenceCard headline: live count + real population -------------------
describe('CAD Exec convergence - GapIntelligenceCard headline reads live, composition stays demo', () => {
  it('headline reads the live open-gap count across the real patient total (not 2,330)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 342, categories: CAD_DEMO_CATEGORIES, topGaps: CAD_DEMO_TOPGAPS, safetyAlert: CAD_DEMO_SAFETY_ALERT }}
        totalPatients={4321}
        compositionDemo
      />
    );
    expect(html).toContain('342 auto-detected gaps across 4,321 patients');
    expect(html).not.toContain('across 2,330 patients'); // category-sum mislabel killed
    expect(html).toContain('Demo composition');
  });
  it('the shared component is byte-unchanged for the other modules (no override, no badge)', () => {
    const html = render(
      <GapIntelligenceCard
        data={{ totalGaps: 10, categories: CAD_DEMO_CATEGORIES, topGaps: CAD_DEMO_TOPGAPS, safetyAlert: 'x' }}
      />
    );
    expect(html).toContain('across 2,330 patients'); // falls back to the category sum
    expect(html).not.toContain('Demo composition');
  });
  it('the view feeds the card live totalOpenGaps + real totalPatients + demo composition', () => {
    const view = src(VIEW);
    expect(view).toContain('totalGaps: dashboard?.summary?.totalOpenGaps ?? 0');
    expect(view).toContain('totalPatients={dashboard?.summary?.totalPatients ?? 0}');
    expect(view).toContain('compositionDemo');
    expect(view).toContain('categories: CAD_DEMO_CATEGORIES');
    expect(view).toContain('safetyAlert: CAD_DEMO_SAFETY_ALERT');
    // the old inline literals (category-sum donut + hardcoded safety line + ?? 26) are gone
    expect(view).not.toContain('patients: 900');
    expect(view).not.toContain('?? 26');
    expect(view).not.toContain('CRITICAL: 156 patients');
  });
});

// ------------------- Demo financial model - internal consistency (anchored at $11.2M) -------------------
describe('CAD Exec convergence - one internally-consistent demo revenue model', () => {
  it('waterfall categories sum to the single annual total (11.2)', () => {
    const sum = CAD_DEMO_WATERFALL.complexPCI_revenue + CAD_DEMO_WATERFALL.stemi_revenue
      + CAD_DEMO_WATERFALL.ffr_revenue + CAD_DEMO_WATERFALL.cathLab_revenue + CAD_DEMO_WATERFALL.stent_revenue;
    expect(sum).toBeCloseTo(CAD_DEMO_ANNUAL_OPPORTUNITY_M, 6);
    expect(CAD_DEMO_WATERFALL.total_revenue).toBeCloseTo(CAD_DEMO_ANNUAL_OPPORTUNITY_M, 6);
  });
  it('the single ROI-waterfall category array sums to the annual total (derived, not hand-typed)', () => {
    const sum = CAD_DEMO_ROI_CATEGORIES.reduce((s, c) => s + c.value, 0);
    expect(sum).toBe(CAD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('category drill-down detail matches the waterfall decomposition', () => {
    const detailSum = Object.values(CAD_DEMO_CATEGORY_DETAIL).reduce((s, c) => s + c.revenue, 0);
    expect(detailSum).toBe(CAD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
  });
  it('YTD captured equals the realized slice', () => {
    expect(CAD_DEMO_YTD_CAPTURED_M).toBeCloseTo(CAD_DEMO_WATERFALL.realized_revenue, 6);
  });
  it('pipeline quarters sum to the pipeline total = annual - realized (7.1M)', () => {
    const qSum = CAD_DEMO_PIPELINE.quarters.reduce((s, q) => s + q.revenue, 0);
    expect(qSum).toBe(CAD_DEMO_PIPELINE.totalProjected12Month);
    expect(qSum).toBeCloseTo((CAD_DEMO_ANNUAL_OPPORTUNITY_M - CAD_DEMO_WATERFALL.realized_revenue) * 1_000_000, 0);
  });
  it('at-risk decomposes cleanly and stays within the remaining opportunity (fixes 5.6 vs 7.8)', () => {
    expect(CAD_DEMO_AT_RISK.immediateRevenue + CAD_DEMO_AT_RISK.deferralRevenue).toBe(CAD_DEMO_AT_RISK.cumulativeRisk12Month);
    expect(CAD_DEMO_AT_RISK.cumulativeRisk12Month / 12).toBeCloseTo(CAD_DEMO_AT_RISK.deferralCostPerMonth, 0);
    const remaining = (CAD_DEMO_ANNUAL_OPPORTUNITY_M - CAD_DEMO_WATERFALL.realized_revenue) * 1_000_000;
    expect(CAD_DEMO_AT_RISK.cumulativeRisk12Month).toBeLessThanOrEqual(remaining);
  });
  it('predictive dollars are decompositions of the same total', () => {
    expect(CAD_DEMO_PREDICTIVE.totalIdentifiedRevenue).toBe(CAD_DEMO_ANNUAL_OPPORTUNITY_M * 1_000_000);
    expect(CAD_DEMO_PREDICTIVE.quarterlyActionableRevenue).toBe(CAD_DEMO_PIPELINE.quarters[0].revenue);
    expect(CAD_DEMO_PREDICTIVE.projectedRevenueCurrentRate).toBeCloseTo(CAD_DEMO_WATERFALL.realized_revenue * 1_000_000, 0); // 4.1*1e6 has float imprecision
    expect(CAD_DEMO_PREDICTIVE.projectedRevenueSystematic).toBeLessThanOrEqual(CAD_DEMO_PREDICTIVE.totalIdentifiedRevenue);
  });
});

// ------------------- Projected-vs-Realized - a stated slice of the one model -------------------
describe('CAD Exec convergence - Projected-vs-Realized reconciled into the model', () => {
  it('monthly series sums EXACTLY to the stated totals (derived, not hand-typed)', () => {
    const pSum = CAD_DEMO_PVR.months.reduce((s, m) => s + m.projected, 0);
    const rSum = CAD_DEMO_PVR.months.reduce((s, m) => s + m.realized, 0);
    expect(pSum).toBe(CAD_DEMO_PVR.totalProjected);
    expect(rSum).toBe(CAD_DEMO_PVR.totalRealized);
  });
  it('totals are stated slices: realized = realized slice; gap = immediate at-risk; projected = realized + gap', () => {
    expect(CAD_DEMO_PVR.totalRealized).toBe(CAD_DEMO_WATERFALL.realized_revenue * 1_000_000); // $4.1M
    expect(CAD_DEMO_PVR.gap).toBe(CAD_DEMO_AT_RISK.immediateRevenue); // $3.4M
    expect(CAD_DEMO_PVR.totalProjected).toBe(CAD_DEMO_PVR.totalRealized + CAD_DEMO_PVR.gap); // $7.5M
  });
  it('every month realizes less than projected (the gap is monotone, never negative)', () => {
    CAD_DEMO_PVR.months.forEach((m) => {
      expect(m.realized).toBeLessThan(m.projected);
      expect(m.realized).toBeGreaterThan(0);
    });
  });
  it('the view feeds the P-v-R chart the model months; the ~95M monthlyData array is gone', () => {
    const view = src(VIEW);
    expect(view).toContain('monthlyData={CAD_DEMO_PVR.months}');
    expect(view).not.toContain('const monthlyData');
  });
});

// ------------------- Consolidated CADForwardOutlookPanel -------------------
describe('CAD Exec convergence - consolidated CADForwardOutlookPanel', () => {
  it('renders all three figure-sets from the single demo model', () => {
    const html = render(<CADForwardOutlookPanel />);
    expect(html).toContain('$7.1M projected over 12 months');
    expect(html).toContain('Q1 2026');
    expect(html).toContain('$3.4M'); // immediate at-risk
    expect(html).toContain('$5.6M'); // 12-month cumulative
    expect(html).toContain('= the YTD projected-realized gap');
    expect(html).toContain('$10.0M'); // systematic closure
    expect(html).toContain('$5.9M'); // acceleration = 10.0 - 4.1
    expect(html).toContain('Demo data - EHR integration pending');
  });
});

// ------------------- Waterfall consolidation + banned program-revenue literals gone -------------------
describe('CAD Exec convergence - the two waterfalls are consolidated into one', () => {
  const view = src(VIEW);
  it('the redundant CADFinancialWaterfall is no longer rendered', () => {
    expect(view).not.toContain('CADFinancialWaterfall');
  });
  it('the single ROI waterfall reads the model (11.2M), not the removed 70.9M roiCategories', () => {
    expect(view).toContain('categories={CAD_DEMO_ROI_CATEGORIES}');
    expect(view).toContain('CAD_DEMO_WATERFALL.total_revenue * 1000000');
    expect(view).not.toContain('const roiCategories');
  });
  it('the program-revenue literals (70.9M / 52.2M / 50.9M) do not appear anywhere on the tier', () => {
    expect(view).not.toContain('70900000');
    expect(view).not.toContain('52200000');
    expect(view).not.toContain('50900000');
    expect(view).not.toContain("'$95M'");
  });
});

// ------------------- Demo badges on DATA-DEPENDENCY surfaces -------------------
describe('CAD Exec convergence - demo badges present where no backend source exists', () => {
  it('the view marks the mock-fed financial surfaces (waterfall / P-v-R / benchmarks)', () => {
    const view = src(VIEW);
    const badgeUses = view.split('<DemoDataBadge').length - 1;
    expect(badgeUses).toBeGreaterThanOrEqual(3);
    // DRG/CMI badge is the opt-in demoBadge prop on SharedDRGPerformance
    expect(view).toContain('demoBadge');
    expect(src('../../ui/coronaryIntervention/components/CADForwardOutlookPanel.tsx')).toContain('<DemoDataBadge');
  });
});

// ------------------- IA restructure: ruled render order + Export in header -------------------
describe('CAD Exec convergence - ruled render order (7 panels, no facility slot)', () => {
  const view = src(VIEW);
  it('sections render in the exec-narrative order (summary -> gaps -> waterfall -> DRG -> P-v-R -> forward -> ZIP)', () => {
    const order = [
      '<CADExecutiveSummary',
      '<GapIntelligenceCard',
      '3. Revenue Opportunity Waterfall',
      '4. DRG / CMI performance',
      '5. Projected vs Realized',
      '<CADForwardOutlookPanel />',
      '7. Geographic Heat Map',
    ];
    let prev = -1;
    order.forEach((marker) => {
      const idx = view.indexOf(marker);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    });
  });
  it('Export folded into the tier header (no standalone export section; AUDIT-161 CAD inversion closed)', () => {
    expect(view).toContain('Coronary Intervention Executive Dashboard');
    expect(view.indexOf('<ExportButton')).toBeLessThan(view.indexOf('<CADExecutiveSummary'));
    expect(view.indexOf('Coronary Intervention Executive Dashboard')).toBeLessThan(view.indexOf('<ExportButton'));
  });
});

describe('CAD Exec convergence - relocations + consolidation absences on the exec tier', () => {
  const view = src(VIEW);
  it('the forward trio + banner are gone from the view (consolidated into CADForwardOutlookPanel)', () => {
    expect(view).not.toContain('RevenuePipelineCard');
    expect(view).not.toContain('RevenueAtRiskCard');
    expect(view).not.toContain('TrajectoryTrendsCard');
    expect(view).not.toContain('PredictiveMetricsBanner');
  });
  it('Gap Response Rate no longer renders on the exec tier', () => {
    expect(view).not.toContain('GapResponseRateCard');
  });
  it('the SAQ PRO card is dissolved off the exec tier (its SL home owns the PRO framing)', () => {
    expect(view).not.toContain('Patient-Reported Outcomes (SAQ)');
    expect(view).not.toContain('Mean SAQ Angina Frequency');
  });
});

// ------------------- Category-detail modal demo badge (Chrome-found) -------------------
// The ROI-waterfall category-detail modal renders model-derived demo figures; it had no
// Demo badge. BaseDetailModal gained an opt-in demoBadge prop (default off), and the CAD
// category modal passes it - mirroring the SH/EP detail-modal treatment.
describe('CAD Exec convergence - category-detail modal is demo-badged', () => {
  it('BaseDetailModal renders a DemoDataBadge header only when demoBadge is set (default off)', () => {
    const metric = [{ label: 'Annual Opportunity', value: '4.0M', colorScheme: 'porsche' as const }];
    const withBadge = render(<BaseDetailModal title="Complex PCI" subtitle="Category Detail" demoBadge summaryMetrics={metric} onClose={() => {}} />);
    expect(withBadge).toContain('Demo data - EHR integration pending');
    const noBadge = render(<BaseDetailModal title="Complex PCI" subtitle="Category Detail" summaryMetrics={metric} onClose={() => {}} />);
    expect(noBadge).not.toContain('Demo data - EHR integration pending');
  });
  it('the view passes demoBadge to the waterfall category-detail modal', () => {
    const view = src(VIEW);
    expect(view).toContain('subtitle="Revenue Opportunity Category Detail"');
    // demoBadge appears on the category-detail BaseDetailModal (and on SharedDRGPerformance)
    expect(view.split('demoBadge').length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('CAD Exec convergence - Service Line carries the relocated content', () => {
  const sl = src('../../ui/coronaryIntervention/views/CoronaryServiceLineView.tsx');
  it('gap-detection tab renders the relocated GapResponseRateCard', () => {
    expect(sl).toContain('GapResponseRateCard');
  });
  it('risk-heatmap tab renders the relocated TrajectoryTrendsCard', () => {
    expect(sl).toContain('TrajectoryTrendsCard');
  });
  it('the saq-outcomes tab still renders the SAQOutcomesPanel (PRO framing preserved)', () => {
    expect(sl).toContain('SAQOutcomesPanel');
  });
});
