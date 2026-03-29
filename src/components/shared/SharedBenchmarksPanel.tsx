import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { roundTo, formatDelta as fmtDelta, getOrdinalSuffix, formatPercentile } from '../../utils/formatters';

export interface BenchmarkMetric {
  metric: string;
  ourValue: number;
  benchmark: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  percentile: number;
  lowerIsBetter?: boolean;
}

export interface SharedBenchmarksPanelProps {
  title?: string;
  subtitle?: string;
  benchmarks: BenchmarkMetric[];
  dataSource?: string;
  lastUpdated?: string;
  onBenchmarkClick?: (metric: string) => void;
  className?: string;
}

const SharedBenchmarksPanel: React.FC<SharedBenchmarksPanelProps> = ({
  title = 'National Benchmarks', subtitle, benchmarks, dataSource, lastUpdated, onBenchmarkClick, className = '',
}) => {
  const getTrendIcon = (trend: string) => {
 if (trend === 'up') return <TrendingUp className="w-4 h-4 text-[#2C4A60]" />;
 if (trend === 'down') return <TrendingDown className="w-4 h-4 text-crimson-600" />;
 return <Minus className="w-4 h-4 text-titanium-500" />;
  };

  const isPositiveTrend = (bm: BenchmarkMetric) => {
 const delta = roundTo(bm.ourValue - bm.benchmark);
 return bm.lowerIsBetter ? delta < 0 : delta > 0;
  };

  const formatDeltaValue = (value: number, unit: string): string => {
 return fmtDelta(value, unit);
  };

  return (
 <div className={`bg-white rounded-xl shadow-metal-2 border border-titanium-200 p-6 ${className}`}>
 <div className="mb-6">
 <h3 className="text-lg font-semibold text-titanium-900">{title}</h3>
 {subtitle && <p className="text-sm text-titanium-500 mt-1">{subtitle}</p>}
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {benchmarks.map((bm) => {
 const delta = roundTo(bm.ourValue - bm.benchmark);
 const positive = isPositiveTrend(bm);
 return (
 <div key={bm.metric}
 className={`p-4 border border-titanium-200 rounded-lg bg-titanium-50 transition-colors ${onBenchmarkClick ? 'cursor-pointer hover:border-porsche-300 hover:shadow-md' : ''}`}
 onClick={() => onBenchmarkClick?.(bm.metric)}
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="text-sm font-medium text-titanium-800 mb-1">{bm.metric}</div>
 <div className="flex items-baseline gap-2">
 <span className="text-2xl font-bold text-titanium-900">{bm.ourValue}{bm.unit}</span>
 <span className="text-sm text-titanium-500">vs {bm.benchmark}{bm.unit}</span>
 </div>
 </div>
 {getTrendIcon(bm.trend)}
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className={`font-medium ${positive ? 'text-[#2C4A60]' : 'text-crimson-600'}`}>
 {formatDeltaValue(delta, bm.unit)} vs benchmark
 </span>
 <span className="text-titanium-700 font-medium">{formatPercentile(bm.percentile)}</span>
 </div>
 <div className="mt-3 w-full bg-titanium-200 rounded-full h-2 overflow-hidden">
 <div className={`h-full rounded-full transition-all ${positive ? 'bg-[#C8D4DC]' : 'bg-[#F0F5FA]'}`} style={{ width: `${bm.percentile}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 {(dataSource || lastUpdated) && (
 <div className="mt-6 pt-4 border-t border-titanium-200">
 <div className="flex items-center justify-between text-sm text-titanium-500">
 {dataSource && <span>Data source: {dataSource}</span>}
 {lastUpdated && <span>Last updated: {lastUpdated}</span>}
 </div>
 </div>
 )}
 </div>
  );
};

export default SharedBenchmarksPanel;
