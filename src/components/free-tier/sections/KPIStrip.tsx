import React, { useState } from 'react';
import {
  Users,
  Activity,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
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

const KPI_DETAILS: Record<string, { interpretation: string; trend: number[]; nationalAvg: string; topDecile: string }> = {
  'Total CV Patients': {
    interpretation: 'Panel growth is outpacing national average of 2.1% YoY — capacity planning may be warranted.',
    trend: [11200, 11480, 11750, 11900, 12100, 12200, 12350, 12480],
    nationalAvg: '10,800',
    topDecile: '15,200',
  },
  'Annual Procedures': {
    interpretation: 'Procedure volume is growing steadily; benchmark gap to top decile suggests referral capture opportunity.',
    trend: [7400, 7600, 7750, 7900, 8000, 8100, 8250, 8340],
    nationalAvg: '7,200',
    topDecile: '11,400',
  },
  'CV Service Revenue': {
    interpretation: 'Revenue growth trails procedure volume growth — DRG coding review may uncover additional capture.',
    trend: [118, 122, 128, 132, 135, 138, 140, 142],
    nationalAvg: '$128M',
    topDecile: '$198M',
  },
  'Quality Composite': {
    interpretation: 'Above national average; closing the 2.9pt gap to top decile could improve VBP bonuses by ~$1.4M.',
    trend: [88.1, 88.6, 89.2, 89.8, 90.2, 90.7, 91.0, 91.2],
    nationalAvg: '87.4%',
    topDecile: '94.1%',
  },
  '30-Day Readmission': {
    interpretation: 'Below national average — each 1% further reduction toward top decile saves ~$340K in penalties.',
    trend: [16.2, 15.9, 15.5, 15.3, 15.1, 14.9, 14.9, 14.8],
    nationalAvg: '15.5%',
    topDecile: '11.2%',
  },
  'Avg Length of Stay': {
    interpretation: 'LOS is trending down; reaching top decile would free capacity and reduce variable costs by ~$2.1M.',
    trend: [5.8, 5.7, 5.6, 5.5, 5.4, 5.3, 5.2, 5.2],
    nationalAvg: '5.5 days',
    topDecile: '4.1 days',
  },
};

function isTrendPositive(direction: 'up' | 'down', label: string): boolean {
  const lowerLabel = label.toLowerCase();
  const invertedMetric =
    lowerLabel.includes('readmission') || lowerLabel.includes('length');

  if (invertedMetric) {
    return direction === 'down';
  }
  return direction === 'up';
}

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

  return { end: value, decimals: 0, prefix: '', suffix: '' };
}

const MiniSparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#3D6F94"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const KPIStrip: React.FC<KPIStripProps> = ({ hasUploadedFiles, kpis }) => {
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => {
        const IconComponent = iconMap[kpi.icon] ?? Activity;
        const displayValue = hasUploadedFiles
          ? kpi.stateBValue
          : kpi.stateAValue;
        const { end, decimals, prefix, suffix } = getCountUpProps(
          displayValue,
          kpi.unit
        );
        const positive = isTrendPositive(kpi.trend.direction, kpi.label);
        const trendHex = positive ? '#2D6147' : '#7A1A2E';
        const TrendIcon =
          kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;
        const isExpanded = expandedKPI === kpi.label;
        const details = KPI_DETAILS[kpi.label];

        return (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-chrome-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
            style={{
              borderLeft: '3px solid #2C4A60',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
            onClick={() => setExpandedKPI(prev => prev === kpi.label ? null : kpi.label)}
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
              <TrendIcon className="w-3.5 h-3.5" style={{ color: trendHex }} />
              <span className="text-xs font-body font-medium" style={{ color: trendHex }}>
                {kpi.trend.value}
              </span>
            </div>

            {/* Expanded detail panel */}
            {isExpanded && details && (
              <div className="bg-chrome-50 rounded-lg p-3 mt-2 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-titanium-500">
                  <span>National avg: <span className="font-semibold text-titanium-700">{details.nationalAvg}</span></span>
                  <span>Top decile: <span className="font-semibold text-chrome-600">{details.topDecile}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-titanium-400 uppercase tracking-wide">Trend</span>
                  <MiniSparkline data={details.trend} />
                </div>
                <p className="text-titanium-500 leading-snug">{details.interpretation}</p>
              </div>
            )}

            {/* Details toggle button */}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-chrome-600 hover:text-chrome-700 mt-2 pt-2 border-t border-chrome-100 w-full"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedKPI(prev => prev === kpi.label ? null : kpi.label);
              }}
            >
              {isExpanded ? (
                <>Hide <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Details <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default KPIStrip;
