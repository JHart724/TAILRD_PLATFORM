import React from 'react';
import { TrendingUp, TrendingDown, Target, Minus } from 'lucide-react';
import { toFixed } from '../../utils/formatters';

export interface QualityMeasureWidgetProps {
  title: string;
  measureId: string;
  numerator: number;
  denominator: number;
  target: number;
  unit?: string;
  trendData?: Array<{
 period: string;
 value: number;
  }>;
  status?: 'exceeding' | 'meeting' | 'below' | 'critical';
  className?: string;
}

const QualityMeasureWidget: React.FC<QualityMeasureWidgetProps> = ({
  title,
  measureId,
  numerator,
  denominator,
  target,
  unit = '%',
  trendData = [],
  status,
  className = '',
}) => {
  // Calculate current performance
  const currentPerformance = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const performanceDisplay = unit === '%' ? currentPerformance : (numerator / denominator);
  const targetDisplay = unit === '%' ? target : target / 100;

  // Auto-determine status if not provided
  const actualStatus = status || (() => {
 const ratio = currentPerformance / target;
 if (ratio >= 1.1) return 'exceeding';
 if (ratio >= 0.95) return 'meeting';
 if (ratio >= 0.8) return 'below';
 return 'critical';
  })();

  // Calculate trend
  const trend = trendData.length >= 2 ? (() => {
 const recent = trendData[trendData.length - 1];
 const previous = trendData[trendData.length - 2];
 const change = recent.value - previous.value;
 const changePercent = previous.value !== 0 ? (change / previous.value) * 100 : 0;
 
 return {
 direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat',
 change: Math.abs(change),
 changePercent: Math.abs(changePercent),
 };
  })() : null;

  // Status configurations
  const getStatusConfig = () => {
 switch (actualStatus) {
 case 'exceeding':
 return {
 color: 'text-medical-green-600',
 bgColor: 'bg-medical-green-50',
 borderColor: 'border-medical-green-200',
 gaugeColor: 'stroke-medical-green-500',
 textColor: 'text-medical-green-700'
 };
 case 'meeting':
 return {
 color: 'text-porsche-600',
 bgColor: 'bg-porsche-50',
 borderColor: 'border-porsche-200',
 gaugeColor: 'stroke-porsche-500',
 textColor: 'text-porsche-700'
 };
 case 'below':
 return {
 color: 'text-medical-amber-600',
 bgColor: 'bg-medical-amber-50',
 borderColor: 'border-medical-amber-200',
 gaugeColor: 'stroke-medical-amber-500',
 textColor: 'text-medical-amber-700'
 };
 case 'critical':
 return {
 color: 'text-medical-red-600',
 bgColor: 'bg-medical-red-50',
 borderColor: 'border-medical-red-200',
 gaugeColor: 'stroke-medical-red-500',
 textColor: 'text-medical-red-700'
 };
 default:
 return {
 color: 'text-titanium-600',
 bgColor: 'bg-titanium-50',
 borderColor: 'border-titanium-200',
 gaugeColor: 'stroke-titanium-500',
 textColor: 'text-titanium-700'
 };
 }
  };

  const config = getStatusConfig();

  // Calculate gauge parameters
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (currentPerformance / 100) * circumference;
  const targetPosition = (target / 100) * circumference;

  // Generate sparkline path
  const generateSparklinePath = () => {
 if (trendData.length < 2) return '';
 
 const width = 80;
 const height = 20;
 const maxValue = Math.max(...trendData.map(d => d.value));
 const minValue = Math.min(...trendData.map(d => d.value));
 const range = maxValue - minValue || 1;
 
 const points = trendData.map((d, i) => {
 const x = (i / (trendData.length - 1)) * width;
 const y = height - ((d.value - minValue) / range) * height;
 return `${x},${y}`;
 });
 
 return `M ${points.join(' L ')}`;
  };

  const sparklinePath = generateSparklinePath();

  return (
 <div className={`metal-card p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-semibold text-sm text-titanium-800 mb-1 leading-tight">
 {title}
 </h3>
 <div className="text-xs text-titanium-500 font-medium">
 {measureId}
 </div>
 </div>
 
 {/* Status Icon */}
 <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
 <Target className={`w-4 h-4 ${config.color}`} />
 </div>
 </div>

 {/* Gauge Chart */}
 <div className="flex items-center justify-center mb-3">
 <div className="relative">
 <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
 {/* Background Circle */}
 <circle
 cx="50"
 cy="50"
 r={radius}
 fill="none"
 stroke="currentColor"
 strokeWidth="8"
 className="text-titanium-200"
 />
 
 {/* Target Line */}
 <circle
 cx="50"
 cy="50"
 r={radius}
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeDasharray="2 4"
 strokeDashoffset={circumference - targetPosition}
 className="text-titanium-400"
 />
 
 {/* Performance Arc */}
 <circle
 cx="50"
 cy="50"
 r={radius}
 fill="none"
 strokeWidth="8"
 strokeLinecap="round"
 strokeDasharray={strokeDasharray}
 strokeDashoffset={strokeDashoffset}
 className={config.gaugeColor}
 style={{
 transition: 'stroke-dashoffset 1s ease-out'
 }}
 />
 </svg>
 
 {/* Center Value */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center">
 <div className={`text-lg font-bold ${config.color}`}>
 {unit === '%' 
 ? `${toFixed(currentPerformance, 1)}${unit}`
 : toFixed(performanceDisplay, 2)
 }
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Performance Stats */}
 <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
 <div className="text-center p-2 bg-white rounded-lg border border-titanium-200">
 <div className="text-titanium-600">Target</div>
 <div className="font-semibold text-titanium-800">
 {unit === '%' ? `${target}${unit}` : toFixed(targetDisplay, 2)}
 </div>
 </div>
 
 <div className="text-center p-2 bg-white rounded-lg border border-titanium-200">
 <div className="text-titanium-600">N/D</div>
 <div className="font-semibold text-titanium-800">
 {numerator}/{denominator}
 </div>
 </div>
 </div>

 {/* Trend Sparkline */}
 {trendData.length >= 2 && (
 <div className="flex items-center gap-2">
 <div className="flex-1">
 <svg className="w-full h-5" viewBox="0 0 80 20">
 <path
 d={sparklinePath}
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 className={config.gaugeColor}
 />
 {/* Data points */}
 {trendData.map((_, index) => {
 const x = (index / (trendData.length - 1)) * 80;
 const maxValue = Math.max(...trendData.map(d => d.value));
 const minValue = Math.min(...trendData.map(d => d.value));
 const range = maxValue - minValue || 1;
 const y = 20 - ((trendData[index].value - minValue) / range) * 20;
 
 return (
 <circle
 key={trendData[index].period}
 cx={x}
 cy={y}
 r="1.5"
 fill="currentColor"
 className={config.gaugeColor}
 />
 );
 })}
 </svg>
 </div>
 
 {/* Trend Indicator */}
 {trend && (
 <div className="flex items-center gap-1 text-xs">
 {trend.direction === 'up' && (
 <TrendingUp className="w-3 h-3 text-medical-green-600" />
 )}
 {trend.direction === 'down' && (
 <TrendingDown className="w-3 h-3 text-medical-red-600" />
 )}
 {trend.direction === 'flat' && (
 <Minus className="w-3 h-3 text-titanium-500" />
 )}
 <span className={`font-medium ${
 trend.direction === 'up' ? 'text-medical-green-600' :
 trend.direction === 'down' ? 'text-medical-red-600' :
 'text-titanium-500'
 }`}>
 {toFixed(trend.changePercent, 1)}%
 </span>
 </div>
 )}
 </div>
 )}
 </div>
  );
};

export default QualityMeasureWidget;