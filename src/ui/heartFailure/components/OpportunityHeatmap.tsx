import React from "react";

interface OpportunityHeatmapProps {
  data: Array<{
    site_id: string;
    opp_revenue: number;
    rank: number;
  }> | null;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const OpportunityHeatmap: React.FC<OpportunityHeatmapProps> = ({ data }) => {
  if (!data) return null;

  const maxRevenue = Math.max(...data.map((d) => d.opp_revenue));

  return (
    <div className="bg-white/55 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-glass">
      <div className="space-y-4">
        {data.map((site) => {
          const percentage = (site.opp_revenue / maxRevenue) * 100;
          const colorIntensity = Math.round((percentage / 100) * 255);

          return (
            <div key={site.site_id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-700 w-6">#{site.rank}</span>
                  <span className="text-sm font-semibold text-slate-700">{site.site_id}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatMoney(site.opp_revenue)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: `rgb(${255 - colorIntensity}, ${100 + colorIntensity / 2}, ${100 + colorIntensity / 2})`,
                  }}
                >
                  <span className="text-xs font-bold text-white">{percentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="text-xs text-slate-500 text-center">
          Total System Opportunity: {formatMoney(data.reduce((sum, s) => sum + s.opp_revenue, 0))}
        </div>
      </div>
    </div>
  );
};

export default OpportunityHeatmap;
