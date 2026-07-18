/**
 * AUDIT-305 regression guard - fixed-position modals must not sit inside a transformed
 * ancestor (the CSS containing-block bug).
 *
 * THE DEFECT: `ModuleLayout.tsx:110` wraps every module view in `animate-fade-up`. The
 * `fade-up` keyframe ended at `transform: translateY(0)` and the animation carried a
 * `forwards` fill, so the wrapper RETAINED an identity transform at rest. Per the CSS
 * Transforms spec, ANY non-`none` transform - identity included - makes the element a
 * containing block for its `position:fixed` descendants. Every detail modal's
 * `fixed inset-0` backdrop therefore positioned against the wrapper (the full scrollable
 * page) instead of the viewport, opening ~1000-2800px down the document; the click looked
 * like it did nothing.
 *
 * WHY THIS GUARD IS STRUCTURAL, NOT VISUAL: jsdom has no layout engine, so the existing
 * click-path tests (e.g. ValvularExecutiveView.benchmark-click.test.tsx) passed all the
 * way through the bug shipping - they proved the modal MOUNTS, never that it is on-screen.
 * A rendering assertion cannot catch this class; the config invariant can.
 *
 * THE INVARIANT (class-level, not instance-level): no animation may retain a non-`none`
 * transform at rest. That is enforced below for EVERY animation in the config, so a future
 * animation reintroducing a `forwards` fill over an identity final frame fails here rather
 * than silently re-breaking every fixed-position descendant.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import BaseDetailModal from '../../components/shared/BaseDetailModal';

// The tailwind config is CommonJS at the repo root; require() it so the invariant below
// asserts the REAL parsed config rather than regex-matching its source text.
const tailwindConfig = require('../../../tailwind.config.js');

const keyframes: Record<string, Record<string, Record<string, string>>> =
  tailwindConfig.theme.extend.keyframes;
const animation: Record<string, string> = tailwindConfig.theme.extend.animation;

// The final frame of a keyframe: the key that includes 100% ('100%' or '0%, 100%').
function finalFrame(kf: Record<string, Record<string, string>>): Record<string, string> | undefined {
  const key = Object.keys(kf).find((k) => k.replace(/\s/g, '').split(',').includes('100%'));
  return key ? kf[key] : undefined;
}

// The keyframe name an animation shorthand drives (its first token).
function keyframeNameOf(shorthand: string): string {
  return shorthand.trim().split(/\s+/)[0];
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

// ---- The class invariant: no retained non-none transform at rest ----
describe('AUDIT-305 - no animation retains a transform at rest (class invariant)', () => {
  it('every forwards-filled animation ends at transform:none (an identity transform still breaks fixed)', () => {
    const offenders: string[] = [];
    Object.entries(animation).forEach(([name, shorthand]) => {
      if (!/\bforwards\b/.test(shorthand)) return; // no fill -> nothing retained at rest
      const kf = keyframes[keyframeNameOf(shorthand)];
      const last = kf ? finalFrame(kf) : undefined;
      const t = last?.transform;
      if (t !== undefined && t !== 'none') {
        offenders.push(`${name}: forwards fill retains transform '${t}'`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('the entry animations carry no forwards fill (their final frames equal the natural rest state)', () => {
    ['fade-up', 'count-up', 'slide-in-left'].forEach((name) => {
      expect(animation[name]).toBeDefined();
      expect(animation[name]).not.toContain('forwards');
    });
  });
});

// ---- The specific wrapper that broke the modals ----
describe('AUDIT-305 - the animate-fade-up page wrapper rests with no transform', () => {
  it('fade-up ends at transform:none, so the wrapper is not a containing block for fixed descendants', () => {
    expect(finalFrame(keyframes['fade-up'])?.transform).toBe('none');
  });
  it('fade-up still animates in from an offset (the entry animation is unchanged)', () => {
    expect(keyframes['fade-up']['0%'].transform).toBe('translateY(8px)');
    expect(keyframes['fade-up']['0%'].opacity).toBe('0');
    expect(finalFrame(keyframes['fade-up'])?.opacity).toBe('1');
  });
  it('ModuleLayout still renders the animate-fade-up wrapper (the animation is fixed, not removed)', () => {
    expect(src('../../components/shared/ModuleLayout.tsx')).toContain('animate-fade-up');
  });
});

// ---- The swept siblings (same class, previously unused) ----
describe('AUDIT-305 - class sweep: the sibling entry animations are fixed too', () => {
  it('count-up + slide-in-left end at transform:none', () => {
    expect(finalFrame(keyframes['count-up'])?.transform).toBe('none');
    expect(finalFrame(keyframes['slide-in-left'])?.transform).toBe('none');
  });
  it('their entry offsets are preserved (animations unchanged)', () => {
    expect(keyframes['count-up']['0%'].transform).toBe('translateY(4px)');
    expect(keyframes['slide-in-left']['0%'].transform).toBe('translateX(-100%)');
  });
});

// ---- The deliberate non-target (counter-discipline: do not over-correct) ----
describe('AUDIT-305 - float is a different class and is intentionally untouched', () => {
  it('float keeps its animating transform (the transform IS the effect; it is infinite, not a retained rest state)', () => {
    expect(animation['float']).toContain('infinite');
    expect(animation['float']).not.toContain('forwards');
    expect(keyframes['float']['50%'].transform).toBe('translateY(-4px)');
  });
});

// ================= THE STACKING HALF (portal escape) =================
// The containing-block fix above put the modals back in the viewport; that made a SECOND
// symptom visible. Each module view's `relative z-10` container establishes a stacking
// context, so an overlay declared inside it has its z-50 scoped to that context and never
// competes at the root: the sidebar (z-40) painted over the modal, and Leaflet's map panes
// (z-400..z-700, in the same wrapper) painted over the ZIP modal. Portaling to document.body
// escapes the wrapper so the existing z-50 applies at the root and wins over both.
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

describe('AUDIT-305 - BaseDetailModal escapes the wrapper stacking context via a portal', () => {
  it('renders into document.body, NOT into the component-tree container', () => {
    act(() => {
      root.render(<BaseDetailModal title="Portal Probe" subtitle="stacking escape" onClose={() => {}} />);
    });
    // The mount point stays empty - the overlay left the tree it was declared in.
    expect(container.innerHTML).toBe('');
    // ...and landed on document.body, outside any page-wrapper stacking context.
    expect(document.body.innerHTML).toContain('Portal Probe');
  });

  it('the portaled overlay keeps the app overlay z-index convention (z-50, above the sidebar z-40)', () => {
    act(() => {
      root.render(<BaseDetailModal title="Z Probe" subtitle="x" onClose={() => {}} />);
    });
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    expect(overlay!.className).toContain('z-50');
  });

  it('portaling preserves content, so the existing click-path tests still assert real behaviour', () => {
    act(() => {
      root.render(
        <BaseDetailModal
          title="Content Probe"
          subtitle="sub"
          demoBadge
          summaryMetrics={[{ label: 'Annual Opportunity', value: '1.9M', colorScheme: 'porsche' }]}
          onClose={() => {}}
        />
      );
    });
    expect(document.body.innerHTML).toContain('Content Probe');
    expect(document.body.innerHTML).toContain('Annual Opportunity');
    expect(document.body.innerHTML).toContain('Demo data - EHR integration pending');
  });
});

// ---- The bespoke exec-arc modals that do NOT route through BaseDetailModal ----
// CAD/VHD/PV route every detail modal through BaseDetailModal, but HF/EP/SH keep bespoke
// detail modals, and ALL SIX modules have a bespoke ExecutiveSummary KPI drill-down. Each
// declares its own `fixed inset-0 ... z-50` inside the wrapper, so each needs the same
// portal escape - asserted at source (these mount leaflet/recharts trees that are
// impractical to render standalone, per the established fallback).
describe('AUDIT-305 - every bespoke exec-arc overlay portals out of the wrapper', () => {
  const BESPOKE = [
    // the 6 ExecutiveSummary KPI drill-downs
    '../../components/heartFailure/HFExecutiveSummary.tsx',
    '../../ui/electrophysiology/components/EPExecutiveSummary.tsx',
    '../../ui/structuralHeart/components/SHExecutiveSummary.tsx',
    '../../ui/coronaryIntervention/components/CADExecutiveSummary.tsx',
    '../../ui/valvularDisease/components/VHDExecutiveSummary.tsx',
    '../../ui/peripheralVascular/components/PVExecutiveSummary.tsx',
    // HF/EP/SH bespoke exec detail modals
    '../../components/heartFailure/HFRevenueWaterfallModal.tsx',
    '../../components/heartFailure/HFMonthDetailModal.tsx',
    '../../components/heartFailure/HFBenchmarkDetailModal.tsx',
    '../../components/heartFailure/HFRevenueOpportunityModal.tsx',
    '../../ui/electrophysiology/components/EPRevenueWaterfallModal.tsx',
    '../../ui/electrophysiology/components/EPMonthDetailModal.tsx',
    '../../components/electrophysiology/EPBenchmarkDetailModal.tsx',
    '../../ui/electrophysiology/components/EPFacilityDetailModal.tsx',
    '../../ui/electrophysiology/components/EPRevenueOpportunityModal.tsx',
    '../../ui/electrophysiology/components/EPDRGDetailModal.tsx',
    '../../ui/structuralHeart/components/SHRevenueWaterfallModal.tsx',
    '../../ui/structuralHeart/components/SHMonthDetailModal.tsx',
    '../../ui/structuralHeart/components/SHBenchmarkDetailModal.tsx',
    '../../ui/structuralHeart/components/SHFacilityDetailModal.tsx',
    '../../ui/structuralHeart/components/SHRevenueOpportunityModal.tsx',
    '../../ui/structuralHeart/components/SHDRGDetailModal.tsx',
  ];
  BESPOKE.forEach((rel) => {
    const name = rel.split('/').pop();
    it(`${name}: its fixed overlay is portaled to document.body`, () => {
      const s = src(rel);
      expect(s).toContain("import { createPortal } from 'react-dom'");
      expect(s).toContain('createPortal(');
      expect(s).toContain('document.body');
    });
  });
});

// ---- The two incidental badge call-sites (Chrome-found alongside the stacking bug) ----
describe('AUDIT-305 incidental - demo figures carry a Demo badge at the two flagged call sites', () => {
  it('HF GDMT waterfall category modal is demo-badged at its call site', () => {
    expect(src('../../ui/heartFailure/views/ExecutiveView.tsx')).toMatch(/<HFRevenueWaterfallModal[\s\S]{0,300}?demoBadge/);
  });
  it('HFRevenueWaterfallModal supports the opt-in badge (default off, so other usages are unchanged)', () => {
    const s = src('../../components/heartFailure/HFRevenueWaterfallModal.tsx');
    expect(s).toContain('demoBadge?: boolean');
    expect(s).toContain('demoBadge = false');
    expect(s).toContain('{demoBadge && <DemoDataBadge />}');
  });
  it('CAD benchmark (Door-to-Balloon et al) modal is demo-badged at its call site', () => {
    expect(src('../../ui/coronaryIntervention/views/CoronaryExecutiveView.tsx'))
      .toMatch(/subtitle="National Benchmark Comparison"[\s\S]{0,200}?demoBadge/);
  });
});
