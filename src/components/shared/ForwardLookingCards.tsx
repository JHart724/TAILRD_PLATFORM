import React from 'react';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign, Activity, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

// ---------------------------------------------------------------------------
// Revenue Pipeline Card — Forward Projection
// ---------------------------------------------------------------------------

export interface QuarterForecast {
  quarter: string;
  revenue: number;
  procedures: number;
  confidence: 'high' | 'moderate' | 'low';
}

export interface RevenuePipelineData {
  quarters: QuarterForecast[];
  totalProjected12Month: number;
}

interface RevenuePipelineCardProps {
  data: RevenuePipelineData;
}

export const RevenuePipelineCard: React.FC<RevenuePipelineCardProps> = ({ data }) => {
  const confidenceColors: Record<string, string> = {
    high: '#2C4A60',
    moderate: '#4A6880',
    low: '#C8D4DC',
  };

  const chartData = data.quarters.map((q) => ({
    name: q.quarter,
    revenue: q.revenue,
    procedures: q.procedures,
    fill: confidenceColors[q.confidence],
  }));

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Revenue Pipeline — Forward Projection</h3>
            <p className="text-sm text-titanium-600">
              12-month projected: <span className="font-bold text-[#2C4A60]">${(data.totalProjected12Month / 1_000_000).toFixed(1)}M</span> based on patient trajectory
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 font-medium">Trajectory-based</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(value: any) => [`$${(Number(value) / 1_000_000).toFixed(2)}M`, 'Projected Revenue']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quarter Details */}
          <div className="space-y-3">
            {data.quarters.map((q) => (
              <div key={q.quarter} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-titanium-50/50">
                <div>
                  <div className="text-sm font-semibold text-titanium-800">{q.quarter}</div>
                  <div className="text-xs text-titanium-500">{q.procedures} projected procedures</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2C4A60]">
                    ${q.revenue >= 1_000_000 ? `${(q.revenue / 1_000_000).toFixed(1)}M` : `${(q.revenue / 1_000).toFixed(0)}K`}
                  </div>
                  <div className={`text-xs font-medium ${
                    q.confidence === 'high' ? 'text-[#2C4A60]' : q.confidence === 'moderate' ? 'text-[#4A6880]' : 'text-[#64748b]'
                  }`}>
                    {q.confidence === 'high' ? 'High' : q.confidence === 'moderate' ? 'Moderate' : 'Low'} confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Revenue at Risk Card — Deferral Impact
// ---------------------------------------------------------------------------

export interface RevenueAtRiskData {
  immediatePatients: number;
  immediateRevenue: number;
  deferralRevenue: number;
  cumulativeRisk12Month: number;
  deferralCostPerMonth: number;
}

interface RevenueAtRiskCardProps {
  data: RevenueAtRiskData;
}

export const RevenueAtRiskCard: React.FC<RevenueAtRiskCardProps> = ({ data }) => {
  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Revenue at Risk — Deferral Impact</h3>
            <p className="text-sm text-titanium-600">Financial impact if current gaps are not addressed</p>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium">Action Required</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">This Quarter</span>
            </div>
            <div className="text-2xl font-bold text-red-800">
              ${(data.immediateRevenue / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-xs text-red-600 mt-1">
              {data.immediatePatients} patients in immediate time horizon
            </div>
          </div>

          <div className="bg-[#fdf0f2] border border-[#f5c6cf] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[#7A1A2E]" />
              <span className="text-xs font-semibold text-[#7A1A2E] uppercase tracking-wide">If Deferred Past Q2</span>
            </div>
            <div className="text-2xl font-bold text-[#5C1022]">
              +${(data.deferralRevenue / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-xs text-[#7A1A2E] mt-1">
              additional moves to at-risk category
            </div>
          </div>

          <div className="bg-titanium-50 border border-titanium-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-titanium-500" />
              <span className="text-xs font-semibold text-titanium-700 uppercase tracking-wide">12-Month Cumulative</span>
            </div>
            <div className="text-2xl font-bold text-titanium-800">
              ${(data.cumulativeRisk12Month / 1_000_000).toFixed(1)}M
            </div>
            <div className="text-xs text-titanium-500 mt-1">
              at-risk if gaps remain unaddressed
            </div>
          </div>
        </div>

        <div className="mt-4 px-4 py-3 bg-titanium-50/50 rounded-lg">
          <p className="text-xs text-titanium-600">
            <span className="font-semibold">Deferral cost:</span> Approximately ${(data.deferralCostPerMonth / 1_000).toFixed(0)}K per month in lost opportunity.
            Each month of inaction increases clinical risk for {data.immediatePatients} patients and reduces conversion probability for growth opportunities.
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trajectory Trends Card — Population Health
// ---------------------------------------------------------------------------

export interface TrajectoryTrendsData {
  worseningRapidPct: number;
  worseningRapidCount: number;
  meanDeclineRate: string;
  declineMetric: string;
  thresholdIn30Days: number;
  totalFlaggedPatients: number;
  keyInsights: string[];
}

interface TrajectoryTrendsCardProps {
  data: TrajectoryTrendsData;
}

export const TrajectoryTrendsCard: React.FC<TrajectoryTrendsCardProps> = ({ data }) => {
  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Patient Trajectory — Population Health</h3>
            <p className="text-sm text-titanium-600">{data.totalFlaggedPatients.toLocaleString()} flagged patients with trajectory data</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-700 font-medium">Trajectory-aware</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-red-700">{data.worseningRapidPct}%</div>
            <div className="text-xs text-red-600 mt-1">
              of flagged patients worsening rapidly ({data.worseningRapidCount} patients)
            </div>
          </div>
          <div className="bg-[#fdf0f2] border border-[#f5c6cf] rounded-xl p-4">
            <div className="text-lg font-bold text-[#7A1A2E]">{data.meanDeclineRate}</div>
            <div className="text-xs text-[#7A1A2E] mt-1">
              mean decline across {data.declineMetric} gap population
            </div>
          </div>
          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
            <div className="text-3xl font-bold text-slate-700">{data.thresholdIn30Days}</div>
            <div className="text-xs text-slate-600 mt-1">
              patients projected to reach clinical threshold in next 30 days
            </div>
          </div>
        </div>

        {data.keyInsights.length > 0 && (
          <div className="space-y-2">
            {data.keyInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-titanium-700">
                <Zap className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
