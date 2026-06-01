/**
 * Tests for CoronaryExecutiveView - AUDIT-098 (silent-mock double-unwrap collapse).
 *
 * Representative wired-value test for the 5 non-HF Executive views. The heavy
 * presentational children are stubbed and GapIntelligenceCard is replaced with a
 * prop-capturing stub so we can assert that the collapsed single-unwrap
 * (dashboard?.summary?.totalOpenGaps) surfaces the REAL backend value when present,
 * and still falls back to the inline literal when the dashboard is empty.
 *
 * The other 4 Executive sites (EP / Structural / Valvular / Peripheral) are
 * byte-identical collapses (grep-verified, identical diff hunk) - their full-render
 * tests are DEFERRED to the AUDIT-099 testability surface, documented in the PR.
 * RTL is intentionally absent; this uses react-dom/client + act with no new deps.
 */

jest.mock('../../../hooks/useModuleDashboard');

// Capture GapIntelligenceCard's data prop (mock-prefixed so jest allows the ref).
const mockCaptured: { gapData?: any } = {};
jest.mock('../../../components/shared/GapIntelligenceCard', () => ({
  __esModule: true,
  default: (props: any) => {
    mockCaptured.gapData = props.data;
    return null;
  },
}));

// Stub the remaining heavy children to keep the render shallow and deterministic.
const stub = { __esModule: true, default: () => null };
jest.mock('../../../components/shared/BaseExecutiveView', () => stub);
jest.mock('../../../components/shared/ExportButton', () => stub);
jest.mock('../../../components/shared/ZipHeatMap', () => stub);
jest.mock('../../../components/shared/SharedROIWaterfall', () => stub);
jest.mock('../../../components/shared/SharedBenchmarksPanel', () => stub);
jest.mock('../../../components/shared/SharedProjectedVsRealized', () => stub);
jest.mock('../../../components/shared/BaseDetailModal', () => stub);
jest.mock('../../../components/shared/GapResponseRateCard', () => stub);
jest.mock('../../../components/shared/PredictiveMetricsBanner', () => stub);
jest.mock('../components/executive/CADFinancialWaterfall', () => stub);
jest.mock('../../../components/shared/ForwardLookingCards', () => ({
  __esModule: true,
  RevenuePipelineCard: () => null,
  RevenueAtRiskCard: () => null,
  TrajectoryTrendsCard: () => null,
}));

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useModuleDashboard } from '../../../hooks/useModuleDashboard';
import CoronaryExecutiveView from './CoronaryExecutiveView';

const mockUseModuleDashboard = useModuleDashboard as jest.Mock;

let container: HTMLDivElement;
let root: Root;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockCaptured.gapData = undefined;
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
    root.render(<CoronaryExecutiveView />);
  });
};

describe('CoronaryExecutiveView - wired totalOpenGaps (AUDIT-098)', () => {
  test('renders the real totalOpenGaps from dashboard?.summary when present', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: { summary: { totalOpenGaps: 99, totalPatients: 4321 } },
      loading: false,
      error: null,
    });

    await render();

    // The collapse must surface the backend value, not the inline fallback of 26.
    expect(mockCaptured.gapData).toBeDefined();
    expect(mockCaptured.gapData.totalGaps).toBe(99);
    // Wired patient population also renders from dashboard?.summary.
    expect(container.textContent || '').toContain('4,321');
  });

  test('falls back to the inline literal when the dashboard has no summary', async () => {
    mockUseModuleDashboard.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });

    await render();

    // ?? fallback still works post-collapse: no real data -> inline 26.
    expect(mockCaptured.gapData).toBeDefined();
    expect(mockCaptured.gapData.totalGaps).toBe(26);
  });
});
