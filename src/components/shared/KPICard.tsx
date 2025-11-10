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
  const getStatusClasses = () => {
    switch (status) {
      case 'optimal':
        return 'border-l-medical-green-600 bg-white';
      case 'warning':
        return 'border-l-medical-amber-600 bg-white';
      case 'critical':
        return 'border-l-medical-red-600 bg-white';
      default:
        return 'border-l-medical-blue-600 bg-white';
    }
  };

  const getStatusBorderClasses = () => {
    switch (status) {
      case 'optimal':
        return 'border-l-4 border-l-emerald-400/60 shadow-emerald-500/20';
      case 'warning':
        return 'border-l-4 border-l-amber-400/60 shadow-amber-500/20';
      case 'critical':
        return 'border-l-4 border-l-red-400/60 shadow-red-500/20';
      default:
        return 'border-l-4 border-l-blue-400/60 shadow-blue-500/20';
    }
  };

  const getTrendColor = () => {
    if (trend?.direction === 'up') return 'text-medical-green-600';
    return 'text-medical-red-600';
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
      className={`group relative bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 ease-out overflow-hidden ${getStatusBorderClasses()}`}
      role="article"
      aria-labelledby={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
      aria-describedby={`kpi-desc-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 
              id={`kpi-label-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2"
            >
              {label}
            </h3>
            <div 
              className="text-3xl font-bold text-steel-900 mb-1 font-sf"
              aria-label={`${label} value: ${value}`}
            >
              {value}
            </div>
            {subvalue && (
              <div className="text-sm text-steel-600">{subvalue}</div>
            )}
          </div>
          {Icon && (
            <div 
              className="ml-4 p-4 rounded-2xl bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-md border border-white/40 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300"
              aria-hidden="true"
            >
              <Icon className="w-6 h-6 text-steel-700 drop-shadow-md filter group-hover:drop-shadow-lg" />
            </div>
          )}
        </div>

        {trend && (
          <div 
            className={`flex items-center gap-2 text-sm font-semibold ${getTrendColor()}`}
            aria-label={getTrendDescription()}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{trend.value}</span>
            <span className="text-steel-400 font-normal ml-1">{trend.label}</span>
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