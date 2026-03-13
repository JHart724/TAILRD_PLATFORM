import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subvalue?: string;
  trend?: {
 direction: 'up' | 'down';
 value: string;
 label: string;
  };
  status?: 'optimal' | 'warning' | 'critical';
  icon?: React.ElementType;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subvalue,
  trend,
  status = 'optimal',
  icon: Icon,
}) => {
  const getAccentBarColor = () => {
 switch (status) {
 case 'optimal':
 return 'bg-green-500';
 case 'warning':
 return 'bg-amber-500';
 case 'critical':
 return 'bg-arterial-600';
 default:
 return 'bg-chrome-600';
 }
  };

  const getTrendColor = () => {
 if (trend?.direction === 'up') return 'text-green-600';
 return 'text-arterial-600';
  };

  const getStatusDescription = () => {
 switch (status) {
 case 'optimal':
 return 'Optimal performance';
 case 'warning':
 return 'Requires attention';
 case 'critical':
 return 'Critical issue';
 default:
 return 'Normal status';
 }
  };

  const getTrendDescription = () => {
 if (!trend) return '';
 const direction = trend.direction === 'up' ? 'increasing' : 'decreasing';
 return `Trend ${direction} by ${trend.value} ${trend.label}`;
  };

  return (
 <div
 className="group relative bg-white border border-titanium-200 rounded-xl shadow-chrome-card hover:shadow-chrome-card-hover hover:-translate-y-px transition-all duration-300 ease-chrome overflow-hidden"
 role="article"
 aria-labelledby={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
 aria-describedby={`kpi-desc-${label.replace(/\s+/g, '-').toLowerCase()}`}
 >
 {/* Top accent bar */}
 <div className={`h-[3px] w-full rounded-t-xl ${getAccentBarColor()}`} />

 <div className="p-6">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3
 id={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
 className="text-sm font-body font-medium text-titanium-500 uppercase tracking-wider mb-2"
 >
 {label}
 </h3>
 <div
 className="text-3xl font-bold text-titanium-900 mb-1 font-data"
 aria-label={`${label} value: ${value}`}
 >
 {value}
 </div>
 {subvalue && (
 <div className="text-sm font-body text-titanium-500">{subvalue}</div>
 )}
 </div>
 {Icon && (
 <div
 className="ml-4 p-3 rounded-xl bg-chrome-50 border border-titanium-200 group-hover:bg-chrome-100 transition-colors duration-300"
 aria-hidden="true"
 >
 <Icon className="w-6 h-6 text-chrome-600" />
 </div>
 )}
 </div>

 {trend && (
 <div
 className={`flex items-center gap-2 text-sm font-semibold font-body ${getTrendColor()}`}
 aria-label={getTrendDescription()}
 >
 {trend.direction === 'up' ? (
 <TrendingUp className="w-4 h-4" aria-hidden="true" />
 ) : (
 <TrendingDown className="w-4 h-4" aria-hidden="true" />
 )}
 <span>{trend.value}</span>
 <span className="text-titanium-400 font-normal ml-1">{trend.label}</span>
 </div>
 )}

 <div
 id={`kpi-desc-${label.replace(/\s+/g, '-').toLowerCase()}`}
 className="sr-only"
 >
 {getStatusDescription()}. {getTrendDescription()}
 </div>
 </div>
 </div>
  );
};

export default KPICard;
