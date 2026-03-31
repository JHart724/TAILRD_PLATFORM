import React from "react";
import { toFixed } from '../../../utils/formatters';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface OpportunityHeatmapProps {
  data: Array<{
 site_id: string;
 opp_revenue: number;
 rank: number;
  }> | null;
  onFacilityClick?: (facilityName: string) => void;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const OpportunityHeatmap: React.FC<OpportunityHeatmapProps> = ({ data, onFacilityClick }) => {
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-glass">
      <ChartEmptyState message="No heart failure revenue opportunity data available by facility" />
    </div>
  );

  const maxRevenue = Math.max(...data.map((d) => d.opp_revenue));

  return (
 <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-glass">
 {/* Clear Header */}
 <div className="mb-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-2">Revenue Opportunity by Facility</h3>
 <p className="text-sm text-titanium-600">Heart failure GDMT optimization potential across health system sites</p>
 </div>

 <div className="space-y-4">
 {data.map((site) => {
 const percentage = (site.opp_revenue / maxRevenue) * 100;
 const rankColor = site.rank === 1 ? '#C4982A' : site.rank === 2 ? '#2C4A60' : site.rank === 3 ? '#1A6878' : '#8B5A2B';
 const rankGradient = site.rank === 1
 ? 'linear-gradient(to right, #E8D48A, #C4982A)'
 : site.rank === 2
 ? 'linear-gradient(to right, #8FA8BC, #2C4A60)'
 : site.rank === 3
 ? 'linear-gradient(to right, #A0D8E4, #1A6878)'
 : 'linear-gradient(to right, #ECC89E, #8B5A2B)';

 return (
 <div
 key={site.site_id}
 className={`bg-titanium-50 rounded-lg p-4 transition-all ${
 onFacilityClick ? 'cursor-pointer hover:bg-titanium-50 hover:shadow-md' : ''
 }`}
 style={{ borderLeft: '3px solid ' + rankColor }}
 onClick={() => onFacilityClick && onFacilityClick(site.site_id)}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: rankColor, color: 'white' }}>
 {site.rank}
 </div>
 <div>
 <div className="text-base font-semibold text-titanium-900">Facility {site.site_id}</div>
 <div className="text-xs text-titanium-600">Revenue optimization opportunity</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold" style={{ color: rankColor }}>{formatMoney(site.opp_revenue)}</div>
 <div className="text-xs text-titanium-500">{toFixed(percentage, 0)}% of max</div>
 </div>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-3 overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{ width: `${percentage}%`, background: rankGradient }}
 ></div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="mt-6 pt-6 border-t border-titanium-200">
 <div className="text-center">
 <div className="text-lg font-bold" style={{ color: '#C4982A' }}>
 Total System Opportunity: {formatMoney(data.reduce((sum, s) => sum + s.opp_revenue, 0))}
 </div>
 <div className="text-sm text-titanium-600 mt-1">
 Annual revenue potential from GDMT optimization across all facilities
 </div>
 </div>
 </div>
 </div>
  );
};

export default OpportunityHeatmap;
