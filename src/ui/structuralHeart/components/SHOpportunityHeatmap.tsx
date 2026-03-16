import React from "react";
import { toFixed } from '../../../utils/formatters';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface SHOpportunityHeatmapProps {
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

const SHOpportunityHeatmap: React.FC<SHOpportunityHeatmapProps> = ({ data, onFacilityClick }) => {
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-glass">
      <ChartEmptyState message="No structural heart revenue opportunity data available by facility" />
    </div>
  );

  const maxRevenue = Math.max(...data.map((d) => d.opp_revenue));

  return (
 <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-glass">
 {/* Clear Header */}
 <div className="mb-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-2">Revenue Opportunity by Facility</h3>
 <p className="text-sm text-titanium-600">Valve disease Valve Therapy optimization potential across health system sites</p>
 </div>

 <div className="space-y-4">
 {data.map((site) => {
 const percentage = (site.opp_revenue / maxRevenue) * 100;

 return (
 <div 
 key={site.site_id} 
 className={`bg-titanium-50 rounded-lg p-4 transition-all ${
 onFacilityClick ? 'cursor-pointer hover:bg-titanium-100 hover:shadow-md' : ''
 }`}
 onClick={() => onFacilityClick && onFacilityClick(site.site_id)}
 >
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-full bg-chrome-600 text-white flex items-center justify-center text-sm font-bold">
 {site.rank}
 </div>
 <div>
 <div className="text-base font-semibold text-titanium-900">Facility {site.site_id}</div>
 <div className="text-xs text-titanium-600">Revenue optimization opportunity</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-chrome-600">{formatMoney(site.opp_revenue)}</div>
 <div className="text-xs text-titanium-500">{toFixed(percentage, 0)}% of max</div>
 </div>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-3 overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-chrome-400 to-chrome-600"
 style={{ width: `${percentage}%` }}
 ></div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="mt-6 pt-6 border-t border-titanium-200">
 <div className="text-center">
 <div className="text-lg font-bold text-titanium-900">
 Total System Opportunity: {formatMoney(data.reduce((sum, s) => sum + s.opp_revenue, 0))}
 </div>
 <div className="text-sm text-titanium-600 mt-1">
 Annual revenue potential from Valve Therapy optimization across all facilities
 </div>
 </div>
 </div>
 </div>
  );
};

export default SHOpportunityHeatmap;