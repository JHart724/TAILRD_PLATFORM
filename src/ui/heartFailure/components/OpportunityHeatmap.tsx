import React from "react";

interface OpportunityHeatmapProps {
  data: Array<{
    site_id: string;
    opp_revenue: number;
    rank: number;
  }> | null;
  onFacilityClick?: (facilityName: string) => void;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const OpportunityHeatmap: React.FC<OpportunityHeatmapProps> = ({ data, onFacilityClick }) => {
  if (!data) return null;

  const maxRevenue = Math.max(...data.map((d) => d.opp_revenue));

  return (
    <div className="bg-white/55 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-glass">
      {/* Clear Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Revenue Opportunity by Facility</h3>
        <p className="text-sm text-slate-600">Heart failure GDMT optimization potential across health system sites</p>
      </div>

      <div className="space-y-4">
        {data.map((site) => {
          const percentage = (site.opp_revenue / maxRevenue) * 100;

          return (
            <div 
              key={site.site_id} 
              className={`bg-slate-50/50 rounded-lg p-4 transition-all ${
                onFacilityClick ? 'cursor-pointer hover:bg-slate-100/70 hover:shadow-md' : ''
              }`}
              onClick={() => onFacilityClick && onFacilityClick(site.site_id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                    {site.rank}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">Facility {site.site_id}</div>
                    <div className="text-xs text-slate-600">Revenue optimization opportunity</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{formatMoney(site.opp_revenue)}</div>
                  <div className="text-xs text-slate-500">{percentage.toFixed(0)}% of max</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">
            Total System Opportunity: {formatMoney(data.reduce((sum, s) => sum + s.opp_revenue, 0))}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            Annual revenue potential from GDMT optimization across all facilities
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityHeatmap;
