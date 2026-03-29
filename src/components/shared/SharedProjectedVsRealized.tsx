import React from 'react';
import { toFixed } from '../../utils/formatters';

export interface MonthData {
  month: string;
  projected: number;
  realized: number;
}

export interface SharedProjectedVsRealizedProps {
  title?: string;
  subtitle?: string;
  monthlyData: MonthData[];
  onMonthClick?: (monthData: MonthData) => void;
  className?: string;
}

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${toFixed(amount / 1000000, 1)}M`;
  if (amount >= 1000) return `$${toFixed(amount / 1000, 0)}K`;
  return `$${amount.toLocaleString()}`;
};

const SharedProjectedVsRealized: React.FC<SharedProjectedVsRealizedProps> = ({
  title = 'Projected vs Realized Revenue', subtitle = 'Year-to-Date Performance',
  monthlyData, onMonthClick, className = '',
}) => {
  const maxValue = Math.max(...monthlyData.map(d => d.projected));
  const totalProjected = monthlyData.reduce((sum, d) => sum + d.projected, 0);
  const totalRealized  = monthlyData.reduce((sum, d) => sum + d.realized, 0);
  const realizationRate = Math.round((totalRealized / totalProjected) * 100);
  const gap = totalProjected - totalRealized;

  return (
 <div className={`bg-white rounded-xl shadow-metal-2 border border-titanium-200 p-6 ${className}`}>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900">{title}</h3>
 <p className="text-sm text-titanium-500 mt-1">{subtitle}</p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-500">Realization Rate</div>
 <div className="text-2xl font-bold text-porsche-600">{realizationRate}%</div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="p-4 bg-porsche-50 rounded-lg border border-porsche-200">
 <div className="text-xs text-porsche-700 font-medium mb-1">Total Projected</div>
 <div className="text-xl font-bold text-porsche-900">{formatMoney(totalProjected)}</div>
 </div>
 <div className="p-4 bg-[#C8D4DC] rounded-lg border border-[#2C4A60]">
 <div className="text-xs text-[#2C4A60] font-medium mb-1">Total Realized</div>
 <div className="text-xl font-bold text-[#2C4A60]">{formatMoney(totalRealized)}</div>
 </div>
 <div className="p-4 bg-[#F0F5FA] rounded-lg border border-[#C8D4DC]">
 <div className="text-xs text-[#6B7280] font-medium mb-1">Gap</div>
 <div className="text-xl font-bold text-[#6B7280]">{formatMoney(gap)}</div>
 </div>
 </div>

 <div className="space-y-3">
 {monthlyData.map((data) => {
 const projectedWidth = maxValue > 0 ? (data.projected / maxValue) * 100 : 0;
 const realizedWidth  = maxValue > 0 ? (data.realized / maxValue) * 100 : 0;
 return (
 <div key={data.month}
 className={`flex items-center gap-3 ${onMonthClick ? 'cursor-pointer hover:bg-titanium-50 rounded-lg p-2 -m-2' : ''}`}
 onClick={() => onMonthClick?.(data)}
 >
 <div className="w-12 text-xs font-medium text-titanium-700">{data.month}</div>
 <div className="flex-1 relative">
 <div className="h-8 bg-titanium-100 rounded-lg overflow-hidden">
 <div className="h-full bg-porsche-200 rounded-lg transition-all" style={{ width: `${projectedWidth}%` }} />
 </div>
 <div className="absolute inset-0 h-8 overflow-hidden">
 <div className="h-full bg-porsche-500 rounded-lg transition-all" style={{ width: `${realizedWidth}%` }} />
 </div>
 </div>
 <div className="w-32 text-right">
 <div className="text-xs font-medium text-titanium-800">{formatMoney(data.realized)}</div>
 <div className="text-xs text-titanium-500">/ {formatMoney(data.projected)}</div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="flex items-center gap-6 mt-6 pt-4 border-t border-titanium-200">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-porsche-200 rounded" />
 <span className="text-sm text-titanium-700">Projected Opportunity</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-porsche-500 rounded" />
 <span className="text-sm text-titanium-700">Realized Revenue</span>
 </div>
 </div>
 </div>
  );
};

export default SharedProjectedVsRealized;
