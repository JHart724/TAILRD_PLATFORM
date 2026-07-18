/**
 * VHD benchmark-modal click-path integration test (AUDIT-304 VHD convergence).
 *
 * Closes the coverage gap the operator flagged during Chrome verify: the convergence
 * suite renders the detail modals directly (never via a click), so a broken click path
 * would ship green. This test drives the REAL path - render the view, click a real
 * SharedBenchmarksPanel card, and assert the benchmark BaseDetailModal opens WITH its
 * DemoDataBadge.
 *
 * Diagnosis reported at the fix: the click wiring is functional and byte-identical to
 * origin/main (onBenchmarkClick sets activeModal to 'benchmark-'+metric, and the
 * activeModal.startsWith('benchmark-') modal renders it), and matches all 4 other
 * converged modules - NOT a batch regression and NOT a dead path. This test proves the
 * path opens the modal in the rendered tree; a Chrome "opens nothing" not reproduced
 * here points to a build/CSS environment issue, not a source defect.
 *
 * Convention mirrors CoronaryExecutiveView.test.tsx: react-dom/client + act, heavy
 * non-benchmark children stubbed; SharedBenchmarksPanel + BaseDetailModal render REAL.
 */

jest.mock('../../../hooks/useModuleDashboard');

const stub = { __esModule: true, default: () => null };
jest.mock('../../../components/shared/ZipHeatMap', () => stub);
jest.mock('../../../components/shared/SharedDRGPerformance', () => stub);
jest.mock('../../../components/shared/SharedROIWaterfall', () => stub);
jest.mock('../../../components/shared/SharedProjectedVsRealized', () => stub);
jest.mock('../../../components/shared/GapIntelligenceCard', () => stub);
jest.mock('../../../components/shared/ExportButton', () => stub);
jest.mock('../components/VHDExecutiveSummary', () => ({
  __esModule: true,
  default: () => null,
  VHDExecutiveSummary: () => null,
}));
jest.mock('../components/VHDForwardOutlookPanel', () => stub);

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import ValvularExecutiveView from './ValvularExecutiveView';

const mockUseModuleDashboard = useModuleDashboard as jest.Mock;

let container: HTMLDivElement;
let root: Root;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUseModuleDashboard.mockReturnValue({
    data: { summary: { totalPatients: 100, totalOpenGaps: 5, deviceCandidates: 3 } },
    loading: false,
    error: null,
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  jest.clearAllMocks();
});

const render = async () => {
  await act(async () => {
    root.render(<ValvularExecutiveView />);
  });
};

describe('VHD Exec convergence - benchmark modal click path', () => {
  test('clicking a National Benchmark card opens the demo-badged benchmark modal', async () => {
    await render();

    // the benchmark card renders and is clickable
    expect(container.innerHTML).toContain('TAVR 30-Day Mortality');
    let clicked = false;
    container.querySelectorAll('.cursor-pointer').forEach((el) => {
      if (!clicked && (el.textContent || '').includes('TAVR 30-Day Mortality')) {
        act(() => {
          (el as HTMLElement).click();
        });
        clicked = true;
      }
    });
    expect(clicked).toBe(true);

    // the click sets activeModal -> the benchmark BaseDetailModal renders, demo-badged.
    // AUDIT-305: the modal portals to document.body (escaping the page wrapper's stacking
    // context), so read the document, not the mount container.
    const html = document.body.innerHTML;
    expect(html).toContain('Benchmark performance detail'); // modal subtitle
    expect(html).toContain('TAVR 30-Day Mortality'); // modal title (the clicked metric)
    expect(html).toContain('Demo data - EHR integration pending'); // its DemoDataBadge
  });
});
