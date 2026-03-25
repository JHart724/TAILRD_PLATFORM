import React from 'react';
import { Zap, TrendingUp, AlertTriangle, Clock, DollarSign, Target } from 'lucide-react';

export interface PredictiveMetricsData {
  thresholdIn90Days: number;
  quarterlyActionableRevenue: number;
  totalIdentifiedRevenue: number;
  rapidDeteriorationCount: number;
  avgTimeToEvent: number;
  projectedRevenueCurrentRate: number;
  projectedRevenueSystematic: number;
}

interface PredictiveMetricsBannerProps {
  data: PredictiveMetricsData;
}

const PredictiveMetricsBanner: React.FC<PredictiveMetricsBannerProps> = ({ data }) => {
  const accelerationPotential = data.projectedRevenueSystematic - data.projectedRevenueCurrentRate;

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Predictive Intelligence — Platform Metrics</h3>
            <p className="text-sm text-titanium-600">Forward-looking metrics uniquely derived from trajectory analysis</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 font-medium">TAILRD Predictive</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">90-Day Threshold</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{data.thresholdIn90Days}</div>
            <div className="text-xs text-red-500 mt-0.5">patients projected to reach clinical threshold</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">This Quarter</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">${(data.quarterlyActionableRevenue / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs text-emerald-500 mt-0.5">actionable revenue (of ${(data.totalIdentifiedRevenue / 1_000_000).toFixed(1)}M total)</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Rapid Deterioration</span>
            </div>
            <div className="text-2xl font-bold text-amber-700">{data.rapidDeteriorationCount}</div>
            <div className="text-xs text-amber-500 mt-0.5">patients — immediate action indicated</div>
          </div>

          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Avg Time to Event</span>
            </div>
            <div className="text-2xl font-bold text-slate-700">{data.avgTimeToEvent} mo</div>
            <div className="text-xs text-slate-500 mt-0.5">if current gaps remain unaddressed</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-titanium-50/70 border border-titanium-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-titanium-500" />
              <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">Current Rate Projection</span>
            </div>
            <div className="text-xl font-bold text-titanium-700">${(data.projectedRevenueCurrentRate / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs text-titanium-500">projected 12-month revenue at current closure rate</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Systematic Closure</span>
            </div>
            <div className="text-xl font-bold text-emerald-700">${(data.projectedRevenueSystematic / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs text-emerald-500">projected with TAILRD systematic gap closure</div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Acceleration Potential</span>
            </div>
            <div className="text-xl font-bold text-blue-700">${(accelerationPotential / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs text-blue-500">additional revenue with systematic closure</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveMetricsBanner;
