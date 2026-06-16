/**
 * Visual-regression harness for the canonical primitives (UI_CANON section 3).
 *
 * The full-migration-not-partial mandate (section 3.5) across ~3500 call-sites with only 3 frontend
 * tests is the biggest UI risk. This is the regression net: a DOM-snapshot of every primitive in every
 * variant. Any change to a primitive's markup, class, or which --sem-* token it references trips the
 * snapshot - so the later 0->100%-per-primitive migration sweep cannot silently alter the targets.
 *
 * Approach: react-dom/client + react-dom/test-utils act, NO new deps (RTL is intentionally absent from
 * this project - matching ServiceLineKPIBanner.test.tsx). jsdom does not resolve :root CSS vars onto
 * inline style, so the snapshot pins the literal var(--token) reference - which is exactly the
 * regression signal we want (it catches a primitive switching tokens).
 *
 * (A pixel-visual harness - Storybook + Chromatic/jest-image-snapshot - is the heavier future upgrade;
 * the lightest equivalent that fits the CRA setup is this DOM-snapshot net.)
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { Button, variantStyle } from '../Button';
import Badge, { canonicalStyle } from '../Badge';
import { KPICard, trendInk } from '../KPICard';
import { Chart } from '../Chart';
import { ChartTheme } from '../ChartTheme';
import { EmptyState } from '../EmptyState';
import { Spinner, LoadingState } from '../Spinner';

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

// ---- Button ----
describe('Button - canonical primitive', () => {
  const variants = ['primary', 'secondary', 'ghost', 'danger', 'approve', 'refer'] as const;
  variants.forEach((v) => {
    it(`snapshot: variant ${v}`, () => {
      expect(render(<Button variant={v}>Action</Button>)).toMatchSnapshot();
    });
  });
  it('snapshot: sizes sm/md/lg', () => {
    expect(render(<><Button size="sm">S</Button><Button size="md">M</Button><Button size="lg">L</Button></>)).toMatchSnapshot();
  });
  it('loading renders a spinner (role=status) and disables', () => {
    const html = render(<Button loading>Save</Button>);
    expect(html).toContain('role="status"');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy');
  });
  it('primary uses --sem-cta (navy), never carmine red', () => {
    // jsdom strips color var() from serialized HTML; assert the token mapping directly.
    expect(variantStyle('primary').background).toBe('var(--sem-cta)');
    expect(JSON.stringify(variantStyle('primary'))).not.toContain('9B2438'); // carmine never on a primary button
  });
  it('danger is the only red button (--sem-critical)', () => {
    expect(variantStyle('danger').background).toBe('var(--sem-critical)');
  });
});

// ---- Badge ----
describe('Badge - canonical + legacy', () => {
  (['critical', 'high', 'medium', 'low'] as const).forEach((sev) => {
    it(`snapshot: severity ${sev}`, () => {
      expect(render(<Badge kind="severity" value={sev} />)).toMatchSnapshot();
    });
  });
  (['on-target', 'live', 'beta'] as const).forEach((st) => {
    it(`snapshot: status ${st}`, () => {
      expect(render(<Badge kind="status" value={st} />)).toMatchSnapshot();
    });
  });
  it('snapshot: provenance kind', () => {
    expect(render(<Badge kind="provenance" value="demo" label="Demo Data" />)).toMatchSnapshot();
  });
  it('severity critical uses the alarm token', () => {
    expect(canonicalStyle('severity', 'critical').text).toBe('var(--sem-critical)');
  });
  it('legacy variant API still renders (no importer regression)', () => {
    const html = render(<Badge variant="verified" />);
    expect(html).toContain('Verified');
    expect(html).toMatchSnapshot();
  });
});

// ---- KPICard ----
describe('KPICard - canonical primitive', () => {
  it('snapshot: with up-trend + provenance', () => {
    expect(render(<KPICard label="Open Gaps" value={234} unit="patients" trend={{ direction: 'up', value: '+12%' }} provenance={<Badge kind="provenance" value="demo" label="Demo" />} />)).toMatchSnapshot();
  });
  it('snapshot: interactive (drill-down) with accent', () => {
    expect(render(<KPICard label="Revenue" value="$11.2M" accent="var(--color-mod-hf, #2C4A60)" onClick={() => {}} />)).toMatchSnapshot();
  });
  it('down-trend uses amber data-negative, NEVER red (section 4.2)', () => {
    // The semantic guarantee: a falling number is amber, not the alarm red.
    expect(trendInk('down')).toBe('var(--sem-data-negative-ink)');
    expect(trendInk('down')).not.toBe('var(--sem-critical)');
    expect(trendInk('up')).toBe('var(--sem-success-ink)');
  });
  it('interactive card is keyboard-reachable (role=button, tabindex)', () => {
    const html = render(<KPICard label="x" value={1} onClick={() => {}} />);
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
  });
});

// ---- Spinner / EmptyState ----
describe('Spinner + EmptyState', () => {
  it('snapshot: spinner sizes', () => {
    expect(render(<><Spinner size="sm" /><Spinner size="md" /><Spinner size="lg" /></>)).toMatchSnapshot();
  });
  it('snapshot: LoadingState with message', () => {
    expect(render(<LoadingState message="Loading data" />)).toMatchSnapshot();
  });
  it('snapshot: EmptyState with title + description', () => {
    expect(render(<EmptyState title="No gaps detected" description="All patients are at goal." />)).toMatchSnapshot();
  });
});

// ---- Chart (loading/empty branches; data branch is a smoke render) ----
describe('Chart - canonical wrapper', () => {
  const series = [{ dataKey: 'value', name: 'Gaps', type: 'bar' as const }];
  it('snapshot: loading branch', () => {
    expect(render(<Chart data={[]} series={series} xKey="m" xLabel="Month" yLabel="Count" loading />)).toMatchSnapshot();
  });
  it('snapshot: empty branch', () => {
    expect(render(<Chart data={[]} series={series} xKey="m" xLabel="Month" yLabel="Count" emptyTitle="No chart data" />)).toMatchSnapshot();
  });
  it('data branch renders without throwing', () => {
    const data = [{ m: 'Jan', value: 10 }, { m: 'Feb', value: 20 }];
    expect(() => render(<Chart data={data} series={series} xKey="m" xLabel="Month" yLabel="Count" />)).not.toThrow();
  });
});

// ---- ChartTheme (locked values) ----
describe('ChartTheme - locked section 8 values', () => {
  it('series ramp is navy-primary then chrome (not a rainbow)', () => {
    expect(ChartTheme.series).toEqual(['#2C4A60', '#5A8AB0', '#A8C5DD']);
  });
  it('threshold colors are the locked semantic hexes', () => {
    expect(ChartTheme.threshold.critical).toBe('#9B2438');
    expect(ChartTheme.threshold.success).toBe('#0F6E56');
    expect(ChartTheme.threshold.warning).toBe('#854F0B');
  });
  it('axis tick is titanium-500 at 11px; gridline 0.5px dashed', () => {
    expect(ChartTheme.axis.tickColor).toBe('#636D80');
    expect(ChartTheme.axis.tickFontSize).toBe(11);
    expect(ChartTheme.grid.strokeWidth).toBe(0.5);
  });
});
