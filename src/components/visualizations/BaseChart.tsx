import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Info, Download } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  target?: number;
  category?: string;
}

export interface BaseChartProps {
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'comparison' | 'progress' | 'donut';
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  showValues?: boolean;
  className?: string;
  colors?: string[];
  yAxisLabel?: string;
  xAxisLabel?: string;
  target?: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    period: string;
  };
  exportable?: boolean;
}

const BaseChart: React.FC<BaseChartProps> = ({
  data,
  type,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  showGrid = true,
  showValues = false,
  className = '',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  yAxisLabel,
  xAxisLabel,
  target,
  unit = '',
  prefix = '',
  suffix = '',
  trend,
  exportable = false
}) => {
  
  const maxValue = useMemo(() => {
    const dataMax = Math.max(...data.map(d => Math.max(d.value, d.target || 0)));
    return target ? Math.max(dataMax, target) : dataMax;
  }, [data, target]);

  const formatValue = (value: number): string => {
    return `${prefix}${value.toLocaleString()}${unit}${suffix}`;
  };

  const getBarHeight = (value: number): number => {
    return (value / maxValue) * 100;
  };

  const renderBarChart = () => (
    <div className="flex items-end justify-between gap-2 px-4" style={{ height: height - 80 }}>
      {data.map((item, index) => {
        const barHeight = getBarHeight(item.value);
        const targetHeight = item.target ? getBarHeight(item.target) : 0;
        const color = item.color || colors[index % colors.length];
        
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center">
            <div className="relative w-full max-w-12 flex flex-col justify-end" style={{ height: height - 120 }}>
              {/* Target line */}
              {item.target && (
                <div 
                  className="absolute w-full border-t-2 border-dashed border-steel-400"
                  style={{ bottom: `${targetHeight}%` }}
                />
              )}
              
              {/* Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-500 hover:opacity-80 cursor-pointer"
                style={{ 
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  minHeight: '4px'
                }}
              />
              
              {/* Value label */}
              {showValues && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-steel-700">
                  {formatValue(item.value)}
                </div>
              )}
            </div>
            
            {/* X-axis label */}
            <div className="mt-2 text-xs text-steel-600 text-center max-w-16 break-words">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - getBarHeight(item.value);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative px-4" style={{ height: height - 80 }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {showGrid && (
            <g stroke="#E5E7EB" strokeWidth="0.2">
              {[20, 40, 60, 80].map(y => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} />
              ))}
            </g>
          )}
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={colors[0]}
            strokeWidth="2"
            points={points}
            className="drop-shadow-sm"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - getBarHeight(item.value);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={colors[0]}
                className="drop-shadow cursor-pointer hover:r-4 transition-all"
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {data.map(item => (
            <div key={item.label} className="text-xs text-steel-600">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComparisonChart = () => (
    <div className="space-y-4 px-4">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const targetPercentage = item.target ? (item.target / maxValue) * 100 : 0;
        const color = item.color || colors[index % colors.length];
        
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-steel-700">{item.label}</span>
              <span className="text-sm text-steel-600">{formatValue(item.value)}</span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-steel-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
              
              {/* Target indicator */}
              {item.target && (
                <div 
                  className="absolute top-0 w-1 h-3 bg-steel-400"
                  style={{ left: `${targetPercentage}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderProgressChart = () => {
    const mainItem = data[0];
    if (!mainItem) return null;
    
    const percentage = mainItem.target ? (mainItem.value / mainItem.target) * 100 : 0;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <div className="flex items-center justify-center" style={{ height: height - 80 }}>
        <div className="relative">
          <svg width="160" height="160" className="transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#E5E7EB"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={colors[0]}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-steel-900">
              {percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-steel-600">{mainItem.label}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'comparison':
        return renderComparisonChart();
      case 'progress':
        return renderProgressChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className={`bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 overflow-hidden ${className}`}>
      {/* Header */}
      {(title || subtitle || trend || exportable) && (
        <div className="p-6 bg-white/30 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-start justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-steel-900">{title}</h3>}
              {subtitle && <p className="text-sm text-steel-600 mt-1">{subtitle}</p>}
            </div>
            
            <div className="flex items-center gap-3">
              {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {trend.direction === 'up' ? 
                    <TrendingUp className="w-4 h-4" /> : 
                    <TrendingDown className="w-4 h-4" />
                  }
                  <span>{trend.value}</span>
                  <span className="text-steel-500 font-normal">vs {trend.period}</span>
                </div>
              )}
              
              {exportable && (
                <button 
                  className="p-2 bg-white/50 border border-white/30 rounded-lg hover:bg-white/70 transition-colors"
                  onClick={() => {
                    console.log('Exporting chart data');
                    // TODO: Implement chart export functionality
                    alert('Chart Export - Data will be exported as CSV/PNG');
                  }}
                >
                  <Download className="w-4 h-4 text-steel-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {renderChart()}
      </div>

      {/* Legend */}
      {showLegend && type !== 'progress' && data.length > 1 && (
        <div className="p-4 bg-white/20 backdrop-blur-sm border-t border-white/20">
          <div className="flex flex-wrap gap-4">
            {data.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || colors[index % colors.length] }}
                />
                <span className="text-sm text-steel-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseChart;