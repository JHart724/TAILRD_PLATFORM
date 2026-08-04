/**
 * TRIALS PR 3: the as-of / staleness indicator, rendered.
 *
 * WHY A RENDER TEST AND NOT A SOURCE GREP. The backend proves the flags are COMPUTED correctly; this
 * proves they REACH a clinician's screen. Those are different failures, and the second is the one that
 * matters here: the pivot replaced a visible sample banner with a precomputed number, and a precomputed
 * number that fails to say it is six weeks old looks exactly as confident as one computed six minutes
 * ago. If this component silently renders nothing on a stale payload, the pivot has made the product
 * less honest than the sample banner it retired.
 *
 * Convention: react-dom/client + act, NO React Testing Library - RTL is intentionally absent from this
 * project (see design-system/__tests__/audit303.labels.test.tsx).
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { TrialAsOfIndicator } from '../components/TrialAsOfIndicator';
import type { TrialAsOf } from '../../../services/api';

const EVALUATED = '2026-08-04T01:06:30.115Z';
const RUN_DONE = '2026-08-04T01:06:40.867Z';

const asOf = (over: Partial<TrialAsOf> = {}): TrialAsOf => ({
  evaluatedAt: EVALUATED,
  lastRunFinishedAt: RUN_DONE,
  runBuildSha: 'edac1aee6b22e50078e5d8a5b34fb005167859f1',
  liveBuildSha: 'edac1aee6b22e50078e5d8a5b34fb005167859f1',
  stale: false,
  staleReasons: [],
  ...over,
});

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactElement): HTMLElement {
  act(() => { root.render(node); });
  return container;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
});

describe('as-of indicator: the FRESH state', () => {
  it('states when eligibility was computed and does not cry stale', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf()} />);
    const node = el.querySelector('[data-testid="trial-asof"]')!;
    expect(node).not.toBeNull();
    expect(node.getAttribute('data-stale')).toBe('false');
    expect(node.textContent).toContain('Eligibility as of');
    expect(node.textContent).toContain(new Date(EVALUATED).toLocaleString());
    expect(node.textContent).not.toMatch(/out of date|not yet computed/i);
  });

  it('never renders the retired sample language on a population-true payload', () => {
    // The whole point of the pivot: these are not a sample any more. If "sample" reappears on a
    // fresh, complete payload, something has regressed to the pre-PR-3 framing.
    const el = render(<TrialAsOfIndicator asOf={asOf()} />);
    expect(el.textContent!.toLowerCase()).not.toContain('sample');
    expect(el.textContent!.toLowerCase()).not.toContain('indicative');
  });
});

describe('as-of indicator: the STALE states, one per axis', () => {
  it('BUILD divergence: says the verdicts came from a different build, and still shows the as-of', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({
      stale: true, staleReasons: ['build'], runBuildSha: 'old', liveBuildSha: 'new',
    })} />);
    const node = el.querySelector('[data-testid="trial-asof"]')!;
    expect(node.getAttribute('data-stale')).toBe('true');
    expect(node.textContent).toContain('may be out of date');
    expect(node.textContent).toContain('different build');
    // R2: mark stale, NAME the last run, do NOT hide the figures.
    expect(node.textContent).toContain(new Date(EVALUATED).toLocaleString());
    expect(node.textContent).toContain(new Date(RUN_DONE).toLocaleString());
  });

  it('AGE breach: names the 36-hour bound as an operational signal', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({ stale: true, staleReasons: ['age'] })} />);
    const t = el.querySelector('[data-testid="trial-asof"]')!.textContent!;
    expect(t).toContain('36 hours');
    expect(t).toContain('refresh may not be running');
  });

  it('CRITERIA change: says the criteria moved after the verdicts were computed', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({ stale: true, staleReasons: ['criteria'] })} />);
    expect(el.querySelector('[data-testid="trial-asof"]')!.textContent).toContain('trial criteria changed');
  });

  it('renders EVERY reason when several fire, rather than only the first', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({
      stale: true, staleReasons: ['age', 'build', 'criteria'],
    })} />);
    const t = el.querySelector('[data-testid="trial-asof"]')!.textContent!;
    expect(t).toContain('36 hours');
    expect(t).toContain('different build');
    expect(t).toContain('trial criteria changed');
  });

  it('states plainly that nothing refreshes automatically (ruling R3)', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({ stale: true, staleReasons: ['build'] })} />);
    expect(el.querySelector('[data-testid="trial-asof"]')!.textContent)
      .toContain('not refreshed automatically');
  });
});

describe('as-of indicator: NEVER-RUN is unknown, not zero', () => {
  it('says not-yet-computed and explicitly refuses to let the figures read as zero', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({
      evaluatedAt: null, lastRunFinishedAt: null, runBuildSha: null,
      stale: true, staleReasons: ['never-run'],
    })} />);
    const node = el.querySelector('[data-testid="trial-asof"]')!;
    expect(node.getAttribute('data-stale')).toBe('true');
    expect(node.textContent).toContain('Not yet computed');
    expect(node.textContent).toContain('unknown rather than zero');
    // It must NOT fall through to the ordinary stale wording, which would imply a run happened.
    expect(node.textContent).not.toContain('may be out of date');
  });

  it('never prints an Invalid Date when the timestamps are absent', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({
      evaluatedAt: null, lastRunFinishedAt: null, stale: true, staleReasons: ['never-run'],
    })} />);
    expect(el.textContent).not.toContain('Invalid Date');
  });

  it('degrades to "unknown" rather than Invalid Date on an unparseable timestamp', () => {
    const el = render(<TrialAsOfIndicator asOf={asOf({
      evaluatedAt: 'not-a-date', stale: true, staleReasons: ['age'],
    })} />);
    const t = el.querySelector('[data-testid="trial-asof"]')!.textContent!;
    expect(t).toContain('unknown');
    expect(t).not.toContain('Invalid Date');
  });
});

describe('as-of indicator: it is announced, not decorative', () => {
  it('carries role=status in all three states so it is not a silent visual-only cue', () => {
    for (const a of [
      asOf(),
      asOf({ stale: true, staleReasons: ['build'] }),
      asOf({ evaluatedAt: null, stale: true, staleReasons: ['never-run'] }),
    ]) {
      const el = render(<TrialAsOfIndicator asOf={a} />);
      expect(el.querySelector('[role="status"]')).not.toBeNull();
    }
  });
});
