import React from 'react';
import {
  Users,
  Activity,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Clock,
} from 'lucide-react';
import CountUp from 'react-countup';
import Badge from '../../../design-system/Badge';
import { KPIItem } from '../types';

interface KPIStripProps {
  hasUploadedFiles: boolean;
  kpis: KPIItem[];
}

const iconMap: Record<string, React.ElementType> = {
  Users,
  Activity,
  DollarSign,
  Target,
  TrendingDown,
  Clock,
};

/**
 * Determines whether a trend direction is "good" (green) or "bad" (arterial/red)
 * based on the metric label context.
 *   - For readmission/length metrics, down is good, up is bad.
 *   - For all other metrics, up is good, down is bad.
 */
function isTrendPositive(direction: 'up' | 'down', label: string): boolean {
  const lowerLabel = label.toLowerCase();
  const invertedMetric =
    lowerLabel.includes('readmission') || lowerLabel.includes('length');

  if (invertedMetric) {
    return direction === 'down';
  }
  return direction === 'up';
}

/**
 * Resolves CountUp props (end, decimals, prefix, suffix) from value + unit.
 */
function getCountUpProps(value: number, unit: KPIItem['unit']) {
  if (unit === 'currency') {
    if (value >= 1_000_000) {
      return { end: value / 1_000_000, decimals: 1, prefix: '$', suffix: 'M' };
    }
    return { end: value / 1_000, decimals: 0, prefix: '$', suffix: 'K' };
  }

  if (unit === 'percent') {
    return { end: value, decimals: 1, prefix: '', suffix: '%' };
  }

  // unit === 'number'
  return { end: value, decimals: 0, prefix: '', suffix: '' };
}

const KPIStrip: React.FC<KPIStripProps> = ({ hasUploadedFiles, kpis }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => {
        const IconComponent = iconMap[kpi.icon] ?? Activity;
        const displayValue = hasUploadedFiles
          ? kpi.stateBValue
          : kpi.stateAValue;
        const { end, decimals, prefix, suffix } = getCountUpProps(
          displayValue,
          kpi.unit
        );
        const positive = isTrendPositive(kpi.trend.direction, kpi.label);
        const trendColor = positive ? 'text-emerald-600' : 'text-arterial-600';
        const TrendIcon =
          kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;

        return (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-chrome-200 shadow-chrome-card p-4 hover:shadow-chrome-card-hover transition-shadow duration-200"
          >
            {/* Top row: icon + badge */}
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-chrome-50">
                <IconComponent className="w-4 h-4 text-chrome-600" />
              </div>
              <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
            </div>

            {/* Value */}
            <div className="mt-3 font-data text-2xl font-bold text-titanium-800">
              <CountUp
                end={end}
                duration={1.5}
                separator=","
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
                preserveValue
              />
            </div>

            {/* Label */}
            <div className="text-sm font-body text-titanium-500 mt-1">
              {kpi.label}
            </div>

            {/* Trend row */}
            <div className="mt-2 flex items-center gap-1">
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
              <span
                className={`text-xs font-body font-medium ${trendColor}`}
              >
                {kpi.trend.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPIStrip;
