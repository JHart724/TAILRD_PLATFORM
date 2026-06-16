/**
 * Chart - the ONE canonical chart wrapper (UI_CANON section 3.4 / section 6).
 * All charts render through it; it supplies the ChartTheme and enforces the section 6 rules:
 * labeled axes with units, the one canonical gridline + branded tooltip, the zero-baseline rule,
 * and the canonical series ramp. Charts do NOT hand-roll contentStyle / axis / grid.
 *
 * v2.0 UI foundation (gate-zero). The per-chart migration (9 measured defects) is the next track,
 * NOT this PR (section 17.3); this builds the target wrapper.
 */
import React from 'react';
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartTheme, ChartSeries } from './ChartTheme';
import { LoadingState } from './Spinner';
import { EmptyState } from './EmptyState';

export interface ChartProps {
  /** Row data. */
  data: Array<Record<string, unknown>>;
  /** The series to plot (line/bar/area). */
  series: ChartSeries[];
  /** Category-axis data key. */
  xKey: string;
  /** REQUIRED axis labels with units (a bare-number axis is non-conformant, section 6). */
  xLabel: string;
  yLabel: string;
  /** Optional unit formatter for the value axis ticks. */
  yUnit?: (v: number) => string;
  /** Loading branch (every async surface must have one, section 7.1). */
  loading?: boolean;
  /** Empty-state copy when data is empty. */
  emptyTitle?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

function renderSeries(s: ChartSeries, i: number) {
  const color = s.color ?? ChartTheme.series[i % ChartTheme.series.length];
  const common = { key: s.dataKey, dataKey: s.dataKey, name: s.name ?? s.dataKey };
  switch (s.type ?? 'line') {
    case 'bar':
      return <Bar {...common} fill={color} radius={[4, 4, 0, 0]} />;
    case 'area':
      return <Area {...common} stroke={color} fill={color} fillOpacity={0.15} />;
    case 'line':
    default:
      return <Line {...common} stroke={color} strokeWidth={2} dot={false} />;
  }
}

export const Chart: React.FC<ChartProps> = ({
  data,
  series,
  xKey,
  xLabel,
  yLabel,
  yUnit,
  loading = false,
  emptyTitle = 'No data available',
  height = 280,
  showLegend = false,
  className = '',
}) => {
  if (loading) return <div style={{ height }}><LoadingState message="Loading chart" /></div>;
  if (!data || data.length === 0) return <div style={{ height }}><EmptyState title={emptyTitle} /></div>;

  return (
    <div className={`ds-chart ${className}`} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid
            stroke={ChartTheme.grid.stroke}
            strokeWidth={ChartTheme.grid.strokeWidth}
            strokeDasharray={ChartTheme.grid.strokeDasharray}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: ChartTheme.axis.tickColor, fontSize: ChartTheme.axis.tickFontSize }}
            label={{ value: xLabel, position: 'insideBottom', offset: -12, fill: ChartTheme.axis.labelColor, fontSize: ChartTheme.axis.labelFontSize }}
            tickLine={false}
            axisLine={{ stroke: ChartTheme.grid.stroke }}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fill: ChartTheme.axis.tickColor, fontSize: ChartTheme.axis.tickFontSize }}
            tickFormatter={yUnit ? (v: number) => yUnit(v) : undefined}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: ChartTheme.axis.labelColor, fontSize: ChartTheme.axis.labelFontSize }}
            tickLine={false}
            axisLine={{ stroke: ChartTheme.grid.stroke }}
          />
          <Tooltip contentStyle={ChartTheme.tooltip} cursor={{ stroke: ChartTheme.grid.stroke }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12, color: ChartTheme.axis.labelColor }} /> : null}
          {series.map((s, i) => renderSeries(s, i))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;
