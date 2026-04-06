import React, { useState } from 'react';
import { demoAction } from '../../../../utils/demoActions';
import { TrendingUp, TrendingDown, Activity, Heart, Zap, BarChart3, Shield } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface OutcomeData {
  month: string;
  afAblationSuccess: number;
  strokePrevention: number;
  deviceImplants: number;
  patientSatisfaction: number;
  qualityScore: number;
}

interface TrendData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down';
  unit: string;
  target: number;
}

const EPOutcomesTrends: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'ytd'>('12m');

  const monthlyData: OutcomeData[] = [
 { month: 'Jan', afAblationSuccess: 85, strokePrevention: 92, deviceImplants: 15, patientSatisfaction: 88, qualityScore: 89 },
 { month: 'Feb', afAblationSuccess: 87, strokePrevention: 94, deviceImplants: 18, patientSatisfaction: 90, qualityScore: 91 },
 { month: 'Mar', afAblationSuccess: 89, strokePrevention: 93, deviceImplants: 22, patientSatisfaction: 89, qualityScore: 90 },
 { month: 'Apr', afAblationSuccess: 91, strokePrevention: 95, deviceImplants: 19, patientSatisfaction: 91, qualityScore: 92 },
 { month: 'May', afAblationSuccess: 88, strokePrevention: 96, deviceImplants: 25, patientSatisfaction: 92, qualityScore: 93 },
 { month: 'Jun', afAblationSuccess: 92, strokePrevention: 97, deviceImplants: 21, patientSatisfaction: 94, qualityScore: 94 },
 { month: 'Jul', afAblationSuccess: 90, strokePrevention: 95, deviceImplants: 28, patientSatisfaction: 91, qualityScore: 92 },
 { month: 'Aug', afAblationSuccess: 93, strokePrevention: 98, deviceImplants: 24, patientSatisfaction: 93, qualityScore: 95 },
 { month: 'Sep', afAblationSuccess: 94, strokePrevention: 96, deviceImplants: 30, patientSatisfaction: 95, qualityScore: 96 },
 { month: 'Oct', afAblationSuccess: 95, strokePrevention: 97, deviceImplants: 26, patientSatisfaction: 94, qualityScore: 97 },
 { month: 'Nov', afAblationSuccess: 93, strokePrevention: 99, deviceImplants: 32, patientSatisfaction: 96, qualityScore: 95 },
 { month: 'Dec', afAblationSuccess: 96, strokePrevention: 98, deviceImplants: 29, patientSatisfaction: 97, qualityScore: 98 }
  ];

  const trendData: TrendData[] = [
 { metric: 'AF Ablation Success', current: 96, previous: 92, change: 4.3, trend: 'up', unit: '%', target: 95 },
 { metric: 'Stroke Prevention Rate', current: 98, previous: 94, change: 4.2, trend: 'up', unit: '%', target: 95 },
 { metric: 'Device Implant Volume', current: 29, previous: 24, change: 20.8, trend: 'up', unit: 'cases', target: 25 },
 { metric: 'Patient Satisfaction', current: 97, previous: 89, change: 9.0, trend: 'up', unit: '%', target: 90 },
 { metric: 'Overall Quality Score', current: 98, previous: 89, change: 10.1, trend: 'up', unit: '%', target: 92 }
  ];

  const getDisplayData = () => {
 const rangeMap = { '6m': 6, '12m': 12, 'ytd': 12 };
 return monthlyData.slice(-rangeMap[timeRange]);
  };

  const getMetricData = (data: OutcomeData[], metric: string) => {
 switch (metric) {
 case 'afAblation': return data.map(d => ({ month: d.month, value: d.afAblationSuccess }));
 case 'strokePrevention': return data.map(d => ({ month: d.month, value: d.strokePrevention }));
 case 'deviceImplants': return data.map(d => ({ month: d.month, value: d.deviceImplants }));
 case 'satisfaction': return data.map(d => ({ month: d.month, value: d.patientSatisfaction }));
 case 'quality': return data.map(d => ({ month: d.month, value: d.qualityScore }));
 default: return data.map(d => ({ month: d.month, value: (d.afAblationSuccess + d.strokePrevention + d.patientSatisfaction + d.qualityScore) / 4 }));
 }
  };

  const displayData = getDisplayData();
  const chartData = getMetricData(displayData, selectedMetric);
  const maxValue = selectedMetric === 'deviceImplants' ? Math.max(...chartData.map(d => d.value)) : 100;

  const getMetricColor = (metric: string) => {
 const colors = {
 afAblation: 'bg-chrome-600',
 strokePrevention: 'bg-titanium-300', 
 deviceImplants: 'bg-arterial-600',
 satisfaction: 'bg-chrome-50',
 quality: 'bg-chrome-600',
 all: 'bg-titanium-600'
 };
 return colors[metric as keyof typeof colors] || 'bg-titanium-600';
  };

  const getTrendIcon = (trend: string) => {
 return trend === 'up' ? <TrendingUp className="w-4 h-4 text-teal-700" /> : <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTrendColor = (trend: string) => {
 return trend === 'up' ? 'text-teal-700' : 'text-red-600';
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <BarChart3 className="w-5 h-5 text-chrome-600" />
 EP Outcomes Trends
 </h3>
 <p className="text-sm text-titanium-600 mt-1">Clinical performance and quality metrics</p>
 </div>
 <div className="flex items-center gap-2">
 <select
 value={timeRange}
 onChange={(e) => {
 setTimeRange(e.target.value as '6m' | '12m' | 'ytd');
 console.log('Time range changed:', e.target.value);
 }}
 onClick={demoAction()}
 className="px-3 py-1 text-sm border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 >
 <option value="6m">Last 6 Months</option>
 <option value="12m">Last 12 Months</option>
 <option value="ytd">Year to Date</option>
 </select>
 </div>
 </div>

 {/* Key Performance Indicators */}
 <div className="grid grid-cols-5 gap-3 mb-6">
 {trendData.map((trend) => (
 <div 
 key={trend.metric}
 className="p-3 bg-titanium-50 rounded-lg border border-titanium-200 cursor-pointer hover:bg-titanium-100 transition-colors"
 onClick={demoAction()}
 >
 <div className="flex items-center justify-between mb-1">
 <div className="text-xs text-titanium-600 font-medium">{trend.metric}</div>
 {getTrendIcon(trend.trend)}
 </div>
 <div className="text-lg font-bold text-titanium-900 flex items-baseline gap-1">
 {trend.current}
 <span className="text-xs text-titanium-500">{trend.unit}</span>
 </div>
 <div className={`text-xs font-medium ${getTrendColor(trend.trend)}`}>
 {trend.trend === 'up' ? '+' : ''}{toFixed(trend.change, 1)}%
 </div>
 </div>
 ))}
 </div>

 {/* Metric Selection */}
 <div className="flex items-center gap-2 mb-4">
 <span className="text-sm font-medium text-titanium-700">View:</span>
 {[
 { key: 'all', label: 'Overall Score', icon: Activity },
 { key: 'afAblation', label: 'AF Ablation', icon: Zap },
 { key: 'strokePrevention', label: 'Stroke Prevention', icon: Shield },
 { key: 'deviceImplants', label: 'Device Volume', icon: Heart },
 { key: 'satisfaction', label: 'Patient Satisfaction', icon: TrendingUp },
 { key: 'quality', label: 'Quality Score', icon: BarChart3 }
 ].map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => {
 setSelectedMetric(key);
 console.log('Metric filter changed:', key, label);
 }}
 className={`px-3 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
 selectedMetric === key 
 ? 'bg-chrome-600 text-white' 
 : 'bg-titanium-100 text-titanium-600 hover:bg-titanium-200'
 }`}
 >
 <Icon className="w-3 h-3" />
 {label}
 </button>
 ))}
 </div>

 {/* Trends Chart */}
 <div className="space-y-2 mb-6">
 {chartData.map((data, index) => {
 const barWidth = (data.value / maxValue) * 100;
 const isPercentage = selectedMetric !== 'deviceImplants';
 
 return (
 <div 
 key={data.month} 
 className="flex items-center gap-3 cursor-pointer hover:bg-titanium-50 rounded-lg p-2 -m-2 transition-colors"
 onClick={demoAction()}
 >
 <div className="w-12 text-xs font-medium text-titanium-700">{data.month}</div>
 
 <div className="flex-1 relative">
 <div className="h-6 bg-titanium-200 rounded-lg overflow-hidden">
 <div 
 className={`h-full rounded-lg transition-all hover:opacity-80 ${getMetricColor(selectedMetric)}`}
 style={{ width: `${barWidth}%` }}
 />
 </div>
 
 {/* Target line for percentage metrics */}
 {isPercentage && selectedMetric !== 'all' && (
 <div 
 className="absolute top-0 w-0.5 h-6 bg-red-500"
 style={{ left: `${(trendData.find(t => t.metric.toLowerCase().includes(selectedMetric.toLowerCase()))?.target || 90)}%` }}
 />
 )}
 </div>

 <div className="w-20 text-right">
 <div className="text-sm font-medium text-titanium-800">
 {data.value}{isPercentage ? '%' : ''}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div 
 className="p-3 bg-titanium-300 rounded-lg border border-teal-700 cursor-pointer hover:bg-titanium-300 transition-colors"
 onClick={() => console.log('Average performance drill-down:', selectedMetric, toFixed(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length, 1))}
 >
 <div className="text-xs text-teal-700 font-medium mb-1">Average Performance</div>
 <div className="text-lg font-bold text-teal-700">
 {toFixed(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length, 1)}
 {selectedMetric === 'deviceImplants' ? ' cases' : '%'}
 </div>
 </div>
 <div 
 className="p-3 bg-chrome-50 rounded-lg border border-chrome-200 cursor-pointer hover:bg-chrome-100 transition-colors"
 onClick={() => {
 const bestMonth = chartData.reduce((best, current) => current.value > best.value ? current : best);
 console.log('Best month drill-down:', bestMonth.month, selectedMetric, bestMonth.value);
 }}
 >
 <div className="text-xs text-chrome-800 font-medium mb-1">Best Month</div>
 <div className="text-lg font-bold text-chrome-900">
 {chartData.reduce((best, current) => current.value > best.value ? current : best).month}
 </div>
 </div>
 <div 
 className="p-3 bg-arterial-50 rounded-lg border border-arterial-200 cursor-pointer hover:bg-arterial-100 transition-colors"
 onClick={() => console.log('Improvement trend drill-down:', selectedMetric, toFixed((chartData[chartData.length - 1]?.value - chartData[0]?.value) / chartData[0]?.value * 100, 1))}
 >
 <div className="text-xs text-arterial-800 font-medium mb-1">Improvement</div>
 <div className="text-lg font-bold text-arterial-900">
 +{toFixed((chartData[chartData.length - 1]?.value - chartData[0]?.value) / chartData[0]?.value * 100, 1)}%
 </div>
 </div>
 </div>

 {/* Legend */}
 <div className="flex items-center justify-between pt-4 border-t border-titanium-300">
 <div className="flex items-center gap-4 text-sm text-titanium-600">
 <div className="flex items-center gap-2">
 <div className={`w-4 h-4 rounded ${getMetricColor(selectedMetric)}`}></div>
 <span>{selectedMetric === 'all' ? 'Overall Performance' : 
 selectedMetric === 'afAblation' ? 'AF Ablation Success Rate' :
 selectedMetric === 'strokePrevention' ? 'Stroke Prevention Rate' :
 selectedMetric === 'deviceImplants' ? 'Device Implant Volume' :
 selectedMetric === 'satisfaction' ? 'Patient Satisfaction Score' :
 'Quality Score'}</span>
 </div>
 {selectedMetric !== 'deviceImplants' && selectedMetric !== 'all' && (
 <div className="flex items-center gap-2">
 <div className="w-0.5 h-4 bg-red-500"></div>
 <span>Target Threshold</span>
 </div>
 )}
 </div>
 <div className="text-xs text-titanium-500">
 Click bars for detailed analysis
 </div>
 </div>
 </div>
  );
};

export default EPOutcomesTrends;