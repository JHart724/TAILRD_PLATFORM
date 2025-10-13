import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BenchmarkMetric {
  metric: string;
  ourValue: number;
  benchmark: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  percentile: number;
}

const BenchmarksPanel: React.FC = () => {
  const benchmarks: BenchmarkMetric[] = [
    {
      metric: 'Quadruple Therapy Rate',
      ourValue: 68,
      benchmark: 52,
      unit: '%',
      trend: 'up',
      percentile: 78
    },
    {
      metric: 'CRT Utilization',
      ourValue: 45,
      benchmark: 38,
      unit: '%',
      trend: 'up',
      percentile: 72
    },
    {
      metric: 'Target Dose BB',
      ourValue: 71,
      benchmark: 65,
      unit: '%',
      trend: 'up',
      percentile: 68
    },
    {
      metric: 'SGLT2i Adoption',
      ourValue: 64,
      benchmark: 48,
      unit: '%',
      trend: 'up',
      percentile: 82
    },
    {
      metric: '30-Day Readmission',
      ourValue: 18,
      benchmark: 23,
      unit: '%',
      trend: 'down',
      percentile: 71
    },
    {
      metric: 'Phenotype Detection Rate',
      ourValue: 12,
      benchmark: 8,
      unit: '%',
      trend: 'up',
      percentile: 85
    }
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-teal-700" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-800" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  const getTrendColor = (trend: string, metric: string) => {
    if (metric.includes('Readmission')) {
      return trend === 'down' ? 'text-teal-700' : 'text-red-800';
    }
    return trend === 'up' ? 'text-teal-700' : trend === 'down' ? 'text-red-800' : 'text-slate-700';
  };

  return (
    <div <div className="bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">National Benchmarks</h3>
        <p className="text-sm text-slate-600 mt-1">Mount Sinai vs National Percentiles (2025 Data)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {benchmarks.map((benchmark) => {
          const delta = benchmark.ourValue - benchmark.benchmark;
          const isGood = benchmark.metric.includes('Readmission') ? delta < 0 : delta > 0;

          return (
            <div key={benchmark.metric} className="p-4 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors bg-slate-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 mb-1">{benchmark.metric}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {benchmark.ourValue}{benchmark.unit}
                    </span>
                    <span className="text-sm text-slate-600">
                      vs {benchmark.benchmark}{benchmark.unit}
                    </span>
                  </div>
                </div>
                {getTrendIcon(benchmark.trend)}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${getTrendColor(benchmark.trend, benchmark.metric)}`}>
                  {delta > 0 ? '+' : ''}{delta}{benchmark.unit} vs benchmark
                </span>
                <span className="text-slate-700 font-medium">
                  {benchmark.percentile}th %ile
                </span>
              </div>

              <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${isGood ? 'bg-teal-600' : 'bg-amber-600'}`}
                  style={{ width: `${benchmark.percentile}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-300">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Data source: Greene et al. 2024, Lala et al. 2025, ACC/AHA Guidelines</span>
          <span>Last updated: October 2025</span>
        </div>
      </div>
    </div>
  );
};

export default BenchmarksPanel;
