/**
 * Tests for ServiceLineKPIBanner - AUDIT-098 (silent-mock double-unwrap collapse).
 *
 * RTL is intentionally absent from this project (no @testing-library/react).
 * These tests use react-dom/client + react-dom/test-utils act with no new deps,
 * matching the locked PAUSE-A scope for AUDIT-098.
 *
 * The load-bearing assertion is the empty/error path: when no live data is
 * available the banner must show a VISIBLE "Demo Data" badge rather than
 * silently presenting mock numbers as if they were live. The post-collapse
 * single-unwrap (dashboard?.summary) is what lets real values surface at all.
 */

// Mock the data hook and the roster fetch so no real network calls run.
jest.mock('../../hooks/useModuleDashboard');
jest.mock('../../services/api');

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useModuleDashboard } from '../../hooks/useModuleDashboard';
import { apiFetch } from '../../services/api';
import ServiceLineKPIBanner from './ServiceLineKPIBanner';

const mockUseModuleDashboard = useModuleDashboard as jest.Mock;
const mockApiFetch = apiFetch as jest.Mock;

let container: HTMLDivElement;
let root: Root;

// React 18 act warns unless this global flag is set.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  jest.clearAllMocks();
});

// Flush pending microtasks (the dashboard + roster promises and their .finally).
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const render = async () => {
  await act(async () => {
    root.render(
      <ServiceLineKPIBanner moduleSlug="coronary-intervention" moduleLabel="Coronary" />,
    );
  });
};

describe('ServiceLineKPIBanner - 4-state render (AUDIT-098)', () => {
  test('real data: shows Live Data badge and the wired summary values', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: { totalPatients: 1234, totalOpenGaps: 56 } },
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValue({ count: 789 });

    await render();
    await flush();

    const text = container.textContent || '';
    expect(text).toContain('Live Data');
    expect(text).not.toContain('Demo Data');
    expect(text).toContain('1,234'); // totalPatients via dashboard?.summary
    expect(text).toContain('56'); // totalOpenGaps via dashboard?.summary
    expect(text).toContain('789'); // roster count from apiFetch
  });

  test('loading: shows the Loading badge while fetches are pending', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });
    // Never-resolving roster promise keeps rosterLoading true.
    mockApiFetch.mockReturnValue(new Promise(() => {}));

    await render();
    // Intentionally do NOT flush - we want the in-flight state.

    const text = container.textContent || '';
    expect(text).toContain('Loading...');
    expect(text).not.toContain('Live Data');
  });

  test('error: roster fetch rejects and no dashboard data -> visible Demo Data', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to load',
    });
    mockApiFetch.mockRejectedValue(new Error('network'));

    await render();
    await flush();

    const text = container.textContent || '';
    expect(text).toContain('Demo Data');
    expect(text).not.toContain('Live Data');
    // em-dash (U+2014) placeholder for missing values; kept ASCII in source per DRIFT-44
    expect(text).toContain(String.fromCharCode(0x2014));
  });

  test('empty: summary present but no values -> visible Demo Data (load-bearing)', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: {} },
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValue({}); // no count, no data array

    await render();
    await flush();

    const text = container.textContent || '';
    // The honesty contract: an empty load must visibly disclose Demo Data,
    // never silently show mock numbers styled as live.
    expect(text).toContain('Demo Data');
    expect(text).not.toContain('Live Data');
  });
});

// ---------------- The roster count against apiFetch's REAL return shape (2026-07-19) ----------------
// The suite above mocked apiFetch as `{ count: 789 }` - the raw envelope. That is NOT what
// apiFetch returns: it unwraps `json.data` (api.ts), and for /modules/:slug/patients `data` is
// the patient ARRAY, so the backend's sibling `count` is discarded by the unwrap. The component
// tested `resp?.count` then `resp?.data`, and an array has neither - so every Service Line
// banner rendered "Patient Roster -" permanently while this suite stayed green against the
// wrong shape. These cases pin the real contract.
describe('ServiceLineKPIBanner - roster count vs apiFetch real (unwrapped) shape', () => {
  test('unwrapped ARRAY (what apiFetch actually returns) yields the roster count', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: { totalPatients: 1234, totalOpenGaps: 56 } },
      loading: false,
      error: null,
    });
    // apiFetch strips { success, data, count } down to `data` - here a 3-patient array.
    mockApiFetch.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);

    await render();
    await flush();

    const text = container.textContent || '';
    expect(text).toContain('3'); // roster count derived from the array length
    expect(text).not.toMatch(/Patient Roster\s*-\s*$/); // never the permanent dash
  });

  test('empty roster array renders 0, not a dash (an honest zero is a real answer)', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: { totalPatients: 10, totalOpenGaps: 2 } },
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValue([]);

    await render();
    await flush();

    expect(container.textContent || '').toContain('0');
  });

  test('envelope shapes still work (defensive fallbacks kept if apiFetch stops unwrapping)', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: { totalPatients: 10, totalOpenGaps: 2 } },
      loading: false,
      error: null,
    });
    mockApiFetch.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }] });

    await render();
    await flush();

    expect(container.textContent || '').toContain('2');
  });
});
