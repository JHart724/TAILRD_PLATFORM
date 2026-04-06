import React, { useState } from 'react';
import { Users, DollarSign, Activity, TrendingUp, TrendingDown, Zap, Heart, Stethoscope, AlertCircle, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toFixed } from '../../utils/formatters';

interface KPIData {
  id: string;
  label: string;
  value: string;
  subtext: string;
  trend: number;
  icon: any;
  color: string;
  trendData: Array<{ month: string; value: number }>;
}

const kpiData: KPIData[] = [
  {
 id: 'total-patients',
 label: 'Total EP Patients',
 value: '1,247',
 subtext: '85% eligible for procedures',
 trend: 8,
 icon: Users,
 color: 'blue',
 trendData: [
 { month: 'Jun', value: 1156 },
 { month: 'Jul', value: 1178 },
 { month: 'Aug', value: 1201 },
 { month: 'Sep', value: 1223 },
 { month: 'Oct', value: 1235 },
 { month: 'Nov', value: 1247 }
 ]
  },
  {
 id: 'revenue-opportunity',
 label: 'Total Revenue Opportunity',
 value: '$53.4M',
 subtext: 'Annual addressable',
 trend: 12,
 icon: DollarSign,
 color: 'green',
 trendData: [
 { month: 'Jun', value: 47.8 },
 { month: 'Jul', value: 49.2 },
 { month: 'Aug', value: 50.1 },
 { month: 'Sep', value: 51.7 },
 { month: 'Oct', value: 52.3 },
 { month: 'Nov', value: 53.4 }
 ]
  },
  {
 id: 'af-success-rate',
 label: 'AF Ablation Success',
 value: '82%',
 subtext: '12-month arrhythmia-free',
 trend: 3,
 icon: Zap,
 color: 'carmona',
 trendData: [
 { month: 'Jun', value: 79 },
 { month: 'Jul', value: 80 },
 { month: 'Aug', value: 81 },
 { month: 'Sep', value: 81 },
 { month: 'Oct', value: 82 },
 { month: 'Nov', value: 82 }
 ]
  },
  {
 id: 'device-infections',
 label: 'Device Infection Rate',
 value: '0.8%',
 subtext: 'Below national 1.2% average',
 trend: -2,
 icon: AlertCircle,
 color: 'red',
 trendData: [
 { month: 'Jun', value: 1.0 },
 { month: 'Jul', value: 0.9 },
 { month: 'Aug', value: 0.8 },
 { month: 'Sep', value: 0.8 },
 { month: 'Oct', value: 0.8 },
 { month: 'Nov', value: 0.8 }
 ]
  }
];

export const EPExecutiveSummary: React.FC = () => {
  const [selectedKPI, setSelectedKPI] = useState<KPIData | null>(null);

  const getColorMap = (color: string) => {
 const colors: Record<string, { bg: string; border: string; text: string; icon: string; stroke: string }> = {
 // Chrome Blue — patient volume / counts
 blue:    { bg: 'bg-[#EFF4F8]', border: 'border-[#B8C9D9]', text: 'text-teal-700', icon: 'text-teal-700', stroke: '#2C4A60' },
 // Metallic Gold — revenue / financial opportunity
 green:   { bg: 'bg-amber-50', border: 'border-[#D4B85C]', text: 'text-amber-600', icon: 'text-amber-600', stroke: '#8B6914' },
 // Racing Green — clinical quality / ablation success
 carmona: { bg: 'bg-[#EEF6F2]', border: 'border-[#A8D0BC]', text: 'text-green-600', icon: 'text-green-600', stroke: '#2D6147' },
 // Carmona Red — risk / device infection alerts
 red:     { bg: 'bg-red-50', border: 'border-[#F5C0C8]', text: 'text-red-500', icon: 'text-red-500', stroke: '#9B2438' },
 };
 return colors[color] || colors.blue;
  };

  const getColorClasses = (color: string) => {
 const c = getColorMap(color);
 return `${c.bg} ${c.text} ${c.border}`;
  };

  const getTrendColorClasses = (trend: number) => {
 return trend >= 0 ? 'text-teal-700' : 'text-red-600';
  };

  const formatValue = (value: number, id: string) => {
 if (id === 'revenue-opportunity') return `$${toFixed(value, 1)}M`;
 if (id === 'af-success-rate' || id === 'device-infections') return `${value}%`;
 return value.toString();
  };

  return (
 <>
 <div className="retina-card relative z-10 mb-6">
 <div className="px-6 py-4 border-b border-titanium-200 bg-gradient-to-r from-white to-chrome-50">
 <h3 className="text-xl font-bold text-titanium-900 mb-1">Electrophysiology Executive Summary</h3>
 <p className="text-sm text-titanium-600">Key performance indicators and metrics overview</p>
 </div>
 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
 {kpiData.map((kpi) => {
 const Icon = kpi.icon;
 return (
 <div
 key={kpi.id}
 onClick={() => setSelectedKPI(kpi)}
 className="group relative bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 ease-out overflow-hidden cursor-pointer"
 >
 <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 <div className="relative z-10">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <h4 className="text-sm font-semibold text-titanium-600 uppercase tracking-wider mb-2">
 {kpi.label}
 </h4>
 <div className="text-3xl font-bold mb-1 font-sf" style={{ color: getColorMap(kpi.color).stroke }}>
 {kpi.value}
 </div>
 <div className="text-sm text-titanium-600">{kpi.subtext}</div>
 </div>
 <div className={`ml-4 p-3 rounded-xl border ${getColorMap(kpi.color).bg} ${getColorMap(kpi.color).border} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
 <Icon className="w-5 h-5" style={{ color: getColorMap(kpi.color).stroke }} />
 </div>
 </div>
 <div className={`flex items-center gap-2 text-sm font-semibold ${getTrendColorClasses(kpi.trend)}`}>
 {kpi.trend >= 0 ? (
 <TrendingUp className="w-4 h-4" />
 ) : (
 <TrendingDown className="w-4 h-4" />
 )}
 <span>{Math.abs(kpi.trend)}%</span>
 <span className="text-titanium-400 font-normal ml-1">vs last month</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* KPI Detail Modal */}
 {selectedKPI && (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-titanium-200">
 <div className="flex items-start justify-between mb-6">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900 mb-2">{selectedKPI.label}</h3>
 <p className="text-titanium-600">{selectedKPI.subtext}</p>
 </div>
 <button
 onClick={() => setSelectedKPI(null)}
 className="p-2 hover:bg-titanium-100 rounded-xl transition-colors"
 >
 <X className="w-6 h-6 text-titanium-600" />
 </button>
 </div>

 <div className="mb-6">
 <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${getColorMap(selectedKPI.color).bg} ${getColorMap(selectedKPI.color).border} mb-4`}>
 <selectedKPI.icon className="w-5 h-5" style={{ color: getColorMap(selectedKPI.color).stroke }} />
 <span className="font-semibold" style={{ color: getColorMap(selectedKPI.color).stroke }}>Current Value: {selectedKPI.value}</span>
 </div>
 
 <div className="text-sm text-titanium-600 mb-4">
 <strong>Trend:</strong> {selectedKPI.trend >= 0 ? 'Increasing' : 'Decreasing'} by {Math.abs(selectedKPI.trend)}% compared to last month
 </div>
 </div>

 <div className="bg-titanium-50 rounded-2xl p-6">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">6-Month Trend</h4>
 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={selectedKPI.trendData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
 <XAxis dataKey="month" stroke="#64748b" />
 <YAxis stroke="#64748b" tickFormatter={(value) => formatValue(value, selectedKPI.id)} />
 <Tooltip 
 formatter={(value: any) => [formatValue(value, selectedKPI.id), selectedKPI.label]}
 labelStyle={{ color: '#1e293b' }}
 contentStyle={{ 
 backgroundColor: 'rgba(255, 255, 255, 0.95)', 
 border: '1px solid rgba(148, 163, 184, 0.2)',
 borderRadius: '12px',
 backdropFilter: 'blur(12px)'
 }}
 />
 <Line 
 type="monotone" 
 dataKey="value" 
 stroke={selectedKPI.color === 'blue' ? '#2C4A60' : selectedKPI.color === 'green' ? '#2C4A60' : selectedKPI.color === 'carmona' ? '#9B2438' : '#9B2438'}
 strokeWidth={3}
 dot={{ fill: selectedKPI.color === 'blue' ? '#2C4A60' : selectedKPI.color === 'green' ? '#2C4A60' : selectedKPI.color === 'carmona' ? '#9B2438' : '#9B2438', strokeWidth: 2, r: 5 }}
 activeDot={{ r: 7 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 )}
 </>
  );
};