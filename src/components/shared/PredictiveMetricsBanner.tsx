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

          <div className="bg-chrome-50/70 border border-titanium-300 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-teal-700" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">This Quarter</span>
            </div>
            <div className="text-2xl font-bold text-teal-700">${(data.quarterlyActionableRevenue / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs text-teal-700 mt-0.5">actionable revenue (of ${(data.totalIdentifiedRevenue / 1_000_000).toFixed(1)}M total)</div>
          </div>

          <div className="bg-red-50/70 border border-[#F5D0D6] rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Rapid Deterioration</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{data.rapidDeteriorationCount}</div>
            <div className="text-xs text-red-500 mt-0.5">patients — immediate action indicated</div>
          </div>

          {/* Avg Time to Event → Steel Teal (efficiency/LOS-style metric) */}
          <div className="border rounded-xl p-4" style={{ background: '#EEF8FA', borderColor: '#A8D8E4' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5" style={{ color: '#1A6878' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1A6878' }}>Avg Time to Event</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#1A6878' }}>{data.avgTimeToEvent} mo</div>
            <div className="text-xs mt-0.5" style={{ color: '#1A6878' }}>if current gaps remain unaddressed</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current Rate Projection → Chrome Blue mid */}
          <div className="border rounded-xl p-4" style={{ background: '#F0F5FA', borderColor: '#C8D4DC' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5" style={{ color: '#4A6880' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A6880' }}>Current Rate Projection</span>
            </div>
            <div className="text-xl font-bold" style={{ color: '#4A6880' }}>${(data.projectedRevenueCurrentRate / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs" style={{ color: '#4A6880' }}>projected 12-month revenue at current closure rate</div>
          </div>

          {/* Systematic Closure → Chrome Blue (revenue opportunity) */}
          <div className="border rounded-xl p-4" style={{ background: '#EFF4F8', borderColor: '#B8C9D9' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5" style={{ color: '#2C4A60' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2C4A60' }}>Systematic Closure</span>
            </div>
            <div className="text-xl font-bold" style={{ color: '#2C4A60' }}>${(data.projectedRevenueSystematic / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs" style={{ color: '#2C4A60' }}>projected with TAILRD systematic gap closure</div>
          </div>

          {/* Acceleration Potential → Metallic Gold (revenue opportunity / financial target) */}
          <div className="border rounded-xl p-4" style={{ background: '#FAF6E8', borderColor: '#D4B85C' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#8B6914' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B6914' }}>Acceleration Potential</span>
            </div>
            <div className="text-xl font-bold" style={{ color: '#8B6914' }}>${(accelerationPotential / 1_000_000).toFixed(1)}M</div>
            <div className="text-xs" style={{ color: '#8B6914' }}>additional revenue with systematic closure</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveMetricsBanner;
