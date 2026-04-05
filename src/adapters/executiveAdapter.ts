/**
 * Executive Adapter — transforms backend executive dashboard data
 * to the frontend config format used by BaseExecutiveView.
 */

import type { ExecutiveData } from '../services/api';

// Frontend executive metric (matches StandardExecutiveMetric minus the icon,
// which must be supplied by the module config layer)
export interface FrontendExecutiveMetric {
  label: string;
  value: string;
  subvalue?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    label: string;
  };
  status?: 'optimal' | 'warning' | 'critical';
}

export interface FrontendExecutiveDashboard {
  metrics: FrontendExecutiveMetric[];
  charts: Array<Record<string, unknown>>;
  kpis: Record<string, unknown>;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

type TrendDirection = 'up' | 'down';
type MetricStatus = 'optimal' | 'warning' | 'critical';

const VALID_DIRECTIONS: Set<string> = new Set(['up', 'down']);
const VALID_STATUSES: Set<string> = new Set(['optimal', 'warning', 'critical']);

function mapDirection(raw: string | undefined): TrendDirection {
  return raw && VALID_DIRECTIONS.has(raw) ? (raw as TrendDirection) : 'up';
}

function mapStatus(raw: string | undefined): MetricStatus | undefined {
  if (!raw) return undefined;
  return VALID_STATUSES.has(raw) ? (raw as MetricStatus) : undefined;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function adaptExecutiveMetric(
  m: ExecutiveData['metrics'][number]
): FrontendExecutiveMetric {
  return {
    label: m.label,
    value: m.value,
    subvalue: m.subvalue,
    trend: m.trend
      ? {
          direction: mapDirection(m.trend.direction),
          value: m.trend.value,
          label: m.trend.label,
        }
      : undefined,
    status: mapStatus(m.status),
  };
}

export function adaptExecutiveDashboard(
  data: ExecutiveData
): FrontendExecutiveDashboard {
  return {
    metrics: (data.metrics || []).map(adaptExecutiveMetric),
    charts: data.charts || [],
    kpis: data.kpis || {},
  };
}
