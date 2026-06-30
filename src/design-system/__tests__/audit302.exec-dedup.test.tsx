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
import { valvularDiseaseConfig } from '../../ui/valvularDisease/config/executiveConfig';
import { peripheralVascularConfig } from '../../ui/peripheralVascular/config/executiveConfig';

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

// ==== PR 2: VHD + PV replicate the CAD de-dup ====

// the shared component renders the DRG/CMI block for the VHD + PV configs too, still without the
// BaseExecutiveView page wrapper or KPI row (the de-dup invariant is config-agnostic)
describe('AUDIT-302 PR2 - SharedDRGPerformance per VHD/PV config (no page wrapper / KPI row)', () => {
  (
    [
      ['valvularDisease', valvularDiseaseConfig],
      ['peripheralVascular', peripheralVascularConfig],
    ] as const
  ).forEach(([name, cfg]) => {
    it(`${name}: DRG/CMI content present, no min-h-screen / KPI row`, () => {
      const html = render(<SharedDRGPerformance config={cfg} />);
      expect(html).toContain('Case Mix Index (CMI) Analysis');
      expect(html).toContain(cfg.drgTitle);
      expect(html).not.toContain('min-h-screen');
      expect(html).not.toContain('Clinical Quality Optimization');
    });
  });
});

// VHD + PV views: BaseExecutiveView duplicate render removed, SharedDRGPerformance in its place,
// bespoke wired KPI row preserved (asserted-at-source - same leaflet/recharts/hook standalone-mount block)
describe('AUDIT-302 PR2 - VHD/PV ExecutiveView de-dup (asserted-at-source)', () => {
  (
    [
      ['ValvularExecutiveView', '../../ui/valvularDisease/views/ValvularExecutiveView.tsx'],
      ['PeripheralExecutiveView', '../../ui/peripheralVascular/views/PeripheralExecutiveView.tsx'],
    ] as const
  ).forEach(([name, rel]) => {
    const s = src(rel);
    it(`${name}: no BaseExecutiveView import/render (duplicate KPI row + page wrapper removed)`, () => {
      expect(s).not.toContain('import BaseExecutiveView');
      expect(s).not.toContain('<BaseExecutiveView');
    });
    it(`${name}: renders the focused SharedDRGPerformance in alertOnly (cards + CMI come from the bespoke block)`, () => {
      expect(s).toContain('<SharedDRGPerformance config={config} variant="alertOnly" />');
    });
    it(`${name}: retains its bespoke clickable DRG cards + CMI grid + drg modal handler (NOT duplicated by Shared)`, () => {
      expect(s).toContain('config.drgPerformanceCards.map');   // bespoke clickable cards
      expect(s).toContain('DRG Summary Metrics');              // bespoke CMI grid
      expect(s).toContain("activeModal?.startsWith('drg-')");  // bespoke drg modal handler
    });
    it(`${name}: preserves the bespoke wired KPI row (dashboard live hook intact)`, () => {
      expect(s).toContain('dashboard?.summary?.totalPatients');
      expect(s).toContain('?? config.kpiData.totalPatients');
    });
  });
});

// ==== PR 2 fix: the variant prop (closes the view-level duplicate blind spot at the component level) ====
// The prior source-asserts could not catch a duplicate spanning the bespoke section + the shared render
// (the full view cannot mount - leaflet/recharts/hook). These assert the INVARIANT directly on the shared
// component: alertOnly can NEVER emit DRG cards or CMI, so a VHD/PV view using alertOnly cannot double them.
describe('AUDIT-302 PR2 - SharedDRGPerformance variant prop', () => {
  it("variant='full' (default) renders alert + DRG cards + CMI", () => {
    const html = render(<SharedDRGPerformance config={coronaryInterventionConfig} variant="full" />);
    expect(html).toContain('Immediate Revenue Opportunities');         // DRGOptimizationAlert
    expect(html).toContain(coronaryInterventionConfig.drgTitle);       // DRG Financial Performance (cards section)
    expect(html).toContain('Case Mix Index (CMI) Analysis');           // CMI section
  });
  it("variant='alertOnly' renders ONLY the alert - DRG cards + CMI ABSENT", () => {
    const html = render(<SharedDRGPerformance config={coronaryInterventionConfig} variant="alertOnly" />);
    expect(html).toContain('Immediate Revenue Opportunities');         // alert PRESENT
    expect(html).not.toContain('Case Mix Index (CMI) Analysis');       // CMI section ABSENT
    expect(html).not.toContain('Documentation Rate');                  // a CMI metric label - ABSENT
    expect(html).not.toContain(coronaryInterventionConfig.drgTitle);   // DRG cards section title - ABSENT
  });
});
