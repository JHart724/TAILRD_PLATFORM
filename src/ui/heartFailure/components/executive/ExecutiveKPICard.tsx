import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ExecutiveKPICardProps {
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

const ExecutiveKPICard: React.FC<ExecutiveKPICardProps> = ({
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
        return 'border-l-medical-green-400 bg-medical-green-50/50';
      case 'warning':
        return 'border-l-medical-amber-400 bg-medical-amber-50/50';
      case 'critical':
        return 'border-l-medical-red-400 bg-medical-red-50/50';
      default:
        return 'border-l-medical-blue-400 bg-medical-blue-50/50';
    }
  };

  const getTrendColor = () => {
    if (trend?.direction === 'up') return 'text-medical-green-600';
    return 'text-medical-red-600';
  };

  return (
    <div className={`retina-card p-6 border-l-4 ${getStatusClasses()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
            {label}
          </div>
          <div className="text-4xl font-bold text-steel-900 mb-1 font-sf">
            {value}
          </div>
          {subvalue && (
            <div className="text-sm text-steel-600">{subvalue}</div>
          )}
        </div>
        {Icon && (
          <div className="ml-4 p-3 rounded-xl bg-white/70">
            <Icon className="w-6 h-6 text-medical-blue-500" />
          </div>
        )}
      </div>

      {trend && (
        <div className={`flex items-center gap-2 text-sm font-semibold ${getTrendColor()}`}>
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{trend.value}</span>
          <span className="text-steel-500 font-normal ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default ExecutiveKPICard;