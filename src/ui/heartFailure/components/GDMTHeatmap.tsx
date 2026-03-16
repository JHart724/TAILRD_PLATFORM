import React from "react";
import { toFixed } from '../../../utils/formatters';
import ChartEmptyState from '../../../components/shared/ChartEmptyState';

interface GDMTHeatmapProps {
  data: Array<{
 site_id: string;
 score: number;
 pct_quadruple: number;
 opp_revenue: number;
  }> | null;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const GDMTHeatmap: React.FC<GDMTHeatmapProps> = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-lg">
      <ChartEmptyState message="No GDMT optimization data available for the selected period" />
    </div>
  );

  const getHeatColor = (score: number): string => {
 if (score >= 80) return "bg-emerald-500";
 if (score >= 75) return "bg-green-400";
 if (score >= 70) return "bg-yellow-400";
 if (score >= 65) return "bg-amber-400";
 return "bg-red-500";
  };

  return (
 <div className="bg-white rounded-2xl border border-titanium-200 p-8 shadow-lg">
 <div className="space-y-4">
 {data.map((site) => (
 <div key={site.site_id} className="border border-titanium-200 rounded-xl p-4">
 <div className="flex items-center justify-between mb-3">
 <span className="text-sm font-bold text-titanium-900">{site.site_id}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-titanium-500">Opportunity: {formatMoney(site.opp_revenue)}</span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-500 mb-1">Overall Score</div>
 <div className="text-2xl font-bold text-titanium-900">{toFixed(site.score, 1)}%</div>
 </div>
 <div>
 <div className="text-xs text-titanium-500 mb-1">Quadruple Therapy</div>
 <div className="text-2xl font-bold text-titanium-900">{toFixed(site.pct_quadruple, 1)}%</div>
 </div>
 </div>

 <div className="w-full bg-titanium-100 rounded-full h-4 overflow-hidden">
 <div className={`${getHeatColor(site.score)} h-full rounded-full transition-all duration-500`} style={{ width: `${site.score}%` }} />
 </div>
 </div>
 ))}
 </div>

 <div className="mt-6 pt-6 border-t border-titanium-200">
 <div className="flex items-center justify-between text-xs text-titanium-500">
 <span>Performance Key:</span>
 <div className="flex gap-2">
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded bg-emerald-500"></div>
 <span>≥80%</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded bg-yellow-400"></div>
 <span>70-79%</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded bg-red-500"></div>
 <span>&lt;65%</span>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default GDMTHeatmap;
