import React from "react";

interface ROIWaterfallProps {
  data: {
    gdmt_revenue: number;
    devices_revenue: number;
    phenotypes_revenue: number;
    _340b_revenue: number;
    total_revenue: number;
    realized_revenue: number;
  } | null;
  onCategoryClick?: (category: 'GDMT' | 'Devices' | 'Phenotypes' | '340B') => void;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const ROIWaterfall: React.FC<ROIWaterfallProps> = ({ data, onCategoryClick }) => {
  if (!data) return null;

  const categories = [
    { label: "GDMT" as const, value: data.gdmt_revenue, color: "bg-teal-600" },
    { label: "Devices" as const, value: data.devices_revenue, color: "bg-purple-500" },
    { label: "Phenotypes" as const, value: data.phenotypes_revenue, color: "bg-blue-500" },
    { label: "340B" as const, value: data._340b_revenue, color: "bg-emerald-500" },
  ];

  const realizationRate = ((data.realized_revenue / data.total_revenue) * 100).toFixed(1);

  return (
    <div className="bg-white/55 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-glass">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-600 mb-1">Total Opportunity</div>
          <div className="text-3xl font-bold text-slate-900">{formatMoney(data.total_revenue)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-600 mb-1">Realized Revenue</div>
          <div className="text-3xl font-bold text-emerald-600">{formatMoney(data.realized_revenue)}</div>
          <div className="text-xs text-slate-500 mt-1">{realizationRate}% capture rate</div>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const percentage = (cat.value / data.total_revenue) * 100;
          return (
            <div key={cat.label} className={onCategoryClick ? "cursor-pointer" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{cat.label}</span>
                <span className="text-sm font-bold text-slate-900">{formatMoney(cat.value)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`${cat.color} h-full rounded-full transition-all duration-500 ${onCategoryClick ? "hover:opacity-80" : ""}`} 
                  style={{ width: `${percentage}%` }}
                  onClick={() => onCategoryClick && onCategoryClick(cat.label)}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of total</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ROIWaterfall;
