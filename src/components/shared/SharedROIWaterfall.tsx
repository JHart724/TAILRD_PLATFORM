import React from 'react';
import { toFixed } from '../../utils/formatters';
import ChartEmptyState from './ChartEmptyState';

export interface WaterfallCategory {
  label: string;
  value: number;
  color: string;
}

export interface SharedROIWaterfallProps {
  categories: WaterfallCategory[];
  totalRevenue: number;
  realizedRevenue: number;
  onCategoryClick?: (label: string) => void;
  className?: string;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const SharedROIWaterfall: React.FC<SharedROIWaterfallProps> = ({
  categories, totalRevenue, realizedRevenue, onCategoryClick, className = '',
}) => {
  if (!totalRevenue) return (
    <div className={`bg-white rounded-2xl border border-titanium-200 shadow-metal-2 p-8 ${className}`}>
      <ChartEmptyState message="No revenue opportunity data available for the selected period" />
    </div>
  );
  const realizationRate = toFixed((realizedRevenue / totalRevenue) * 100, 1);

  return (
 <div className={`bg-white rounded-2xl border border-titanium-200 shadow-metal-2 p-8 ${className}`}>
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="text-sm text-titanium-500 mb-1">Total Opportunity</div>
 <div className="text-3xl font-bold text-titanium-900" style={{ color: '#2C4A60' }}>{formatMoney(totalRevenue)}</div>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-500 mb-1">Realized Revenue</div>
 <div className="text-3xl font-bold" style={{ color: '#2C4A60' }}>{formatMoney(realizedRevenue)}</div>
 <div className="text-xs text-titanium-400 mt-1" style={{ color: '#2C4A60' }}>{realizationRate}% capture rate</div>
 </div>
 </div>
 <div className="space-y-4">
 {categories.map((cat) => {
 const percentage = totalRevenue > 0 ? (cat.value / totalRevenue) * 100 : 0;
 return (
 <div key={cat.label} className={onCategoryClick ? 'cursor-pointer group' : ''} onClick={() => onCategoryClick?.(cat.label)} style={{ borderLeft: '3px solid ' + cat.color, paddingLeft: '8px' }}>
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-semibold text-titanium-700">{cat.label}</span>
 <span className="text-sm font-bold" style={{ color: cat.color }}>{formatMoney(cat.value)}</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-3 overflow-hidden">
 <div className={`h-full rounded-full transition-all duration-500 ${onCategoryClick ? 'group-hover:opacity-80' : ''}`} style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
 </div>
 <div className="text-xs mt-1" style={{ color: cat.color }}>{toFixed(percentage, 1)}% of total</div>
 </div>
 );
 })}
 </div>
 </div>
  );
};

export default SharedROIWaterfall;
