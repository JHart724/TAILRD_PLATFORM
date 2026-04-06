import React from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export interface GapResponseRate {
  gapId: string;
  views: number;
  actioned: number;
  responseRate: number;
  breakdown: {
    ordered: number;
    referred: number;
    dismissed: number;
  };
}

interface GapResponseRateCardProps {
  rates: GapResponseRate[];
  overallRate: number;
  timeRange: string;
  isLoading?: boolean;
  gapNameMap?: Record<string, string>;
}

const GapResponseRateCard: React.FC<GapResponseRateCardProps> = ({
  rates,
  overallRate,
  timeRange,
  isLoading = false,
  gapNameMap = {},
}) => {
  const hasData = rates.length > 0;

  // Take top 8 gaps by view count for the chart
  const chartData = rates.slice(0, 8).map(r => ({
    name: gapNameMap[r.gapId] || r.gapId,
    rate: r.responseRate,
    views: r.views,
    ordered: r.breakdown.ordered,
    referred: r.breakdown.referred,
    dismissed: r.breakdown.dismissed,
  }));

  const rateColor = (rate: number) => {
    if (rate >= 70) return '#2D7A4A';
    if (rate >= 40) return '#8B6914';
    return '#7A1A2E';
  };

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Gap Response Rate</h3>
            <p className="text-sm text-titanium-600">
              Care team actions on detected gaps ({timeRange})
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-chrome-50 border border-chrome-100 rounded-lg px-3 py-1.5">
            <Activity className="w-3.5 h-3.5 text-chrome-600 flex-shrink-0" />
            <span className="text-xs text-chrome-700 font-medium">Live tracking</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-titanium-400 text-sm">Loading response data...</div>
          </div>
        ) : !hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <Activity className="w-8 h-8 text-titanium-300 mb-3" />
            <p className="text-sm text-titanium-500 font-medium">No response data yet</p>
            <p className="text-xs text-titanium-400 mt-1 max-w-sm">
              Response rates will appear here as care teams interact with gap detection dashboards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall rate KPI */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs font-semibold text-titanium-500 uppercase tracking-wider mb-2">
                Overall Response Rate
              </div>
              <div className={`text-4xl font-bold`} style={{ color: rateColor(overallRate) }}>
                {overallRate}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#2D7A4A]" />
                <span className="text-xs text-titanium-500">
                  {rates.reduce((s, r) => s + r.views, 0)} views, {rates.reduce((s, r) => s + r.actioned, 0)} actions
                </span>
              </div>
              <div className="mt-4 w-full space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-titanium-500">Ordered</span>
                  <span className="font-semibold text-[#2D7A4A]">
                    {rates.reduce((s, r) => s + r.breakdown.ordered, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-titanium-500">Referred</span>
                  <span className="font-semibold text-chrome-600">
                    {rates.reduce((s, r) => s + r.breakdown.referred, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-titanium-500">Dismissed</span>
                  <span className="font-semibold text-titanium-600">
                    {rates.reduce((s, r) => s + r.breakdown.dismissed, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Response rate bar chart */}
            <div className="lg:col-span-2">
              <h4 className="text-sm font-semibold text-titanium-700 mb-3">Response Rate by Gap</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.length > 20 ? v.slice(0, 18) + '...' : v}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Response Rate']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={rateColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GapResponseRateCard;
