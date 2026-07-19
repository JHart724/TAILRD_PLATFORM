/**
 * Honesty hotfix regression guards (2026-07-19), pre-SL/CT-arc.
 *
 * Covers the defect sets the 2026-07-18 state audit found live on origin/main:
 *
 * (1) AUDIT-098 RECURRENCE - four clone-and-diverge gap dashboards read
 *     `moduleDashboard?.data?.summary?.totalPatients`, but `apiFetch` already unwraps the
 *     { success, data } envelope (api.ts), so the extra `.data` made `realTotalPatients`
 *     PERMANENTLY undefined and the mock total rendered under a "Live Data" pill. AUDIT-098
 *     had been closed at "0 remaining double-unwrap sites"; these four recurred afterwards on
 *     files the original sweep did not cover.
 *
 * (2) EP/SH SUMMARY GUARDS - EPExecutiveSummary and SHExecutiveSummary read the live summary
 *     unguarded, so a partial payload threw a TypeError and took out the whole KPI card.
 *     CAD/VHD/PV already carried `?.` + `?? '-'`.
 *
 * Convention: react-dom/client + act, source assertions via fs for the dashboards (they mount
 * enormous recharts/leaflet trees that are impractical standalone - the established fallback).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import EPExecutiveSummary from '../../ui/electrophysiology/components/EPExecutiveSummary';
import SHExecutiveSummary from '../../ui/structuralHeart/components/SHExecutiveSummary';

let container: HTMLDivElement;
let root: Root;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

// ---------------- (1) AUDIT-098 recurrence: single unwrap on all four dashboards ----------------
const GAP_DASHBOARDS: Array<[string, string]> = [
  ['CAD', '../../ui/coronaryIntervention/components/clinical/CADClinicalGapDetectionDashboard.tsx'],
  ['PV', '../../ui/peripheralVascular/components/clinical/PVClinicalGapDetectionDashboard.tsx'],
  ['SH', '../../ui/structuralHeart/components/clinical/SHClinicalGapDetectionDashboard.tsx'],
  ['VD', '../../ui/valvularDisease/components/clinical/VDClinicalGapDetectionDashboard.tsx'],
];

describe('AUDIT-098 recurrence - gap dashboards read the live total through ONE unwrap', () => {
  GAP_DASHBOARDS.forEach(([name, rel]) => {
    it(`${name}: reads moduleDashboard?.summary (not the double-unwrapped .data.summary)`, () => {
      const s = src(rel);
      expect(s).toContain('moduleDashboard?.summary?.totalPatients');
      expect(s).not.toContain('moduleDashboard?.data?.summary');
    });
  });

  it('no double-unwrap survives anywhere under src (class invariant, not just these four)', () => {
    // The original AUDIT-098 fix was verified by a repo-wide grep returning zero; it then
    // recurred on files added later. Asserting the class here means a future clone-and-diverge
    // reintroduction fails in CI instead of silently rendering mock data under a Live pill.
    const root = path.resolve(__dirname, '../..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        if (/__tests__|\.test\.tsx?$/.test(p)) continue; // this file names the pattern
        if (fs.readFileSync(p, 'utf8').includes('?.data?.summary')) {
          offenders.push(path.relative(root, p));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

// ---------------- (2) EP/SH summary guards: partial payload renders dashes, never throws ----------------
const SUMMARIES: Array<[string, React.ComponentType<any>]> = [
  ['EPExecutiveSummary', EPExecutiveSummary],
  ['SHExecutiveSummary', SHExecutiveSummary],
];

describe('EP/SH ExecutiveSummary - guarded live reads (CAD/VHD/PV parity)', () => {
  SUMMARIES.forEach(([name, Comp]) => {
    it(`${name}: a PARTIAL summary renders a dash and does not throw`, () => {
      // Only totalOpenGaps present - the other two fields are absent. Pre-fix this threw
      // "Cannot read properties of undefined (reading 'toLocaleString')".
      const partial = { summary: { totalOpenGaps: 7 } } as any;
      let html = '';
      expect(() => {
        act(() => { root.render(<Comp dashboard={partial} />); });
        html = container.innerHTML;
      }).not.toThrow();
      expect(html).toContain('7'); // the present field still renders
      expect(html).toContain('-'); // the absent fields render an honest dash
    });

    it(`${name}: an EMPTY summary object renders dashes, not a crash`, () => {
      const empty = { summary: {} } as any;
      expect(() => {
        act(() => { root.render(<Comp dashboard={empty} />); });
      }).not.toThrow();
    });
  });

  it('EP/SH carry the same ?. + ?? guard form as the CAD reference', () => {
    const ep = src('../../ui/electrophysiology/components/EPExecutiveSummary.tsx');
    const sh = src('../../ui/structuralHeart/components/SHExecutiveSummary.tsx');
    [ep, sh].forEach((s) => {
      expect(s).toContain("s.totalPatients?.toLocaleString() ?? '-'");
      expect(s).toContain("s.totalOpenGaps?.toLocaleString() ?? '-'");
      expect(s).toContain("s.deviceCandidates?.toLocaleString() ?? '-'");
    });
  });
});
