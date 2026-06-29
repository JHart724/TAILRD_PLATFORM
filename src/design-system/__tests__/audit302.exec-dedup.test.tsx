/**
 * AUDIT-302 Layer 2 PR 1 - CAD Executive de-dup regression test.
 *
 * (a) SharedDRGPerformance renders the DRG/CMI block WITHOUT BaseExecutiveView's full-page min-h-screen
 *     wrapper or the (duplicate) KPI row.
 * (b) CoronaryExecutiveView no longer renders BaseExecutiveView (the duplicate KPI row is gone) and
 *     instead renders SharedDRGPerformance, with the single bespoke wired KPI row preserved.
 *
 * CoronaryExecutiveView itself is impractical to mount standalone (leaflet ZipHeatMap + recharts charts
 * + the useModuleDashboard data hook), so its de-dup is asserted-at-source per the established fallback.
 *
 * Convention: react-dom/client + react-dom/test-utils act (RTL is intentionally absent from this project;
 * matches primitives.regression.test.tsx).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import SharedDRGPerformance from '../../components/shared/SharedDRGPerformance';
import { coronaryInterventionConfig } from '../../ui/coronaryIntervention/config/executiveConfig';

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
  act(() => { root.render(el); });
  return container.innerHTML;
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

// ---- (a) the extracted DRG/CMI block renders, without the page wrapper or KPI row ----
describe('AUDIT-302 PR1 - SharedDRGPerformance (extracted DRG/CMI block)', () => {
  it('renders the DRG/CMI content', () => {
    const html = render(<SharedDRGPerformance config={coronaryInterventionConfig} />);
    expect(html).toContain('Immediate Revenue Opportunities');   // DRGOptimizationAlert header
    expect(html).toContain('Case Mix Index (CMI) Analysis');     // CMI block
    expect(html).toContain('Current CMI');
    expect(html).toContain(coronaryInterventionConfig.drgTitle); // DRG Financial Performance title (config-driven)
  });
  it('does NOT carry BaseExecutiveView page wrapper or the KPI row (de-dup invariant)', () => {
    const html = render(<SharedDRGPerformance config={coronaryInterventionConfig} />);
    expect(html).not.toContain('min-h-screen');                  // full-page wrapper dropped
    expect(html).not.toContain('Clinical Quality Optimization'); // a BaseExecutiveView KPICard label - NOT in the DRG block
    expect(html).not.toContain('Revenue per Patient');           // ditto - the KPI row is not dragged along
  });
});

// ---- (b) CoronaryExecutiveView no longer double-renders (asserted-at-source) ----
describe('AUDIT-302 PR1 - CoronaryExecutiveView de-dup (asserted-at-source)', () => {
  const s = src('../../ui/coronaryIntervention/views/CoronaryExecutiveView.tsx');
  it('no longer imports or renders BaseExecutiveView (duplicate KPI row + page wrapper removed)', () => {
    expect(s).not.toContain('import BaseExecutiveView');
    expect(s).not.toContain('<BaseExecutiveView');
  });
  it('renders the focused SharedDRGPerformance instead', () => {
    expect(s).toContain('<SharedDRGPerformance config={coronaryInterventionConfig} />');
  });
  it('preserves the single bespoke wired KPI row (dashboard live hook intact)', () => {
    expect(s).toContain('dashboard?.summary?.totalPatients');
    expect(s).toContain('?? coronaryInterventionConfig.kpiData.totalPatients');
  });
});
