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

  // Realization rate: green only if ≥80% (beating target), chrome blue 60-79%, carmona red <60%
  const rateColor = realizationRate >= 80 ? '#2D6147' : realizationRate >= 60 ? '#2C4A60' : '#7A1A2E';

  return (
 <div className={`bg-white rounded-xl shadow-metal-2 border border-titanium-200 p-6 ${className}`}>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900">{title}</h3>
 <p className="text-sm text-titanium-500 mt-1">{subtitle}</p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-500">Realization Rate</div>
 <div className="text-2xl font-bold" style={{ color: rateColor }}>{realizationRate}%</div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="p-4 rounded-lg" style={{ background: '#F0F5FA', border: '1px solid #C8D4DC' }}>
 <div className="text-xs font-medium mb-1" style={{ color: '#4A7FA5' }}>Total Projected</div>
 <div className="text-xl font-bold" style={{ color: '#4A7FA5' }}>{formatMoney(totalProjected)}</div>
 </div>
 <div className="p-4 rounded-lg" style={{ background: '#EFF4F8', border: '1px solid #C8D4DC' }}>
 <div className="text-xs font-medium mb-1" style={{ color: '#2C4A60' }}>Total Realized</div>
 <div className="text-xl font-bold" style={{ color: '#2C4A60' }}>{formatMoney(totalRealized)}</div>
 </div>
 <div className="p-4 rounded-lg" style={{ background: '#FDF2F3', border: '1px solid #F5C0C8' }}>
 <div className="text-xs font-medium mb-1" style={{ color: '#9B2438' }}>Gap</div>
 <div className="text-xl font-bold" style={{ color: '#9B2438' }}>{formatMoney(gap)}</div>
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
 <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#F0F5FA' }}>
 <div className="h-full rounded-lg transition-all" style={{ width: `${projectedWidth}%`, backgroundColor: '#4A7FA5' }} />
 </div>
 <div className="absolute inset-0 h-8 overflow-hidden">
 <div className="h-full rounded-lg transition-all" style={{ width: `${realizedWidth}%`, backgroundColor: '#2C4A60' }} />
 </div>
 </div>
 <div className="w-32 text-right">
 <div className="text-xs font-medium" style={{ color: '#2C4A60' }}>{formatMoney(data.realized)}</div>
 <div className="text-xs" style={{ color: '#4A7FA5' }}>/ {formatMoney(data.projected)}</div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="flex items-center gap-6 mt-6 pt-4 border-t border-titanium-200">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 rounded" style={{ background: '#4A7FA5' }} />
 <span className="text-sm text-titanium-700">Projected Opportunity</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 rounded" style={{ background: '#2C4A60' }} />
 <span className="text-sm text-titanium-700">Realized Revenue</span>
 </div>
 </div>
 </div>
  );
};

export default SharedProjectedVsRealized;
