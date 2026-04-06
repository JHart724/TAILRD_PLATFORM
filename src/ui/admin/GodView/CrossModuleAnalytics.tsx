/**
 * Cross-Module Analytics Component
 * 
 * Displays aggregated analytics across all modules including:
 * - Revenue opportunity breakdown
 * - Gap distribution
 * - Module comparison metrics
 * - System-wide trends
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, Users, DollarSign, AlertTriangle, Target } from 'lucide-react';
import { useTheme } from '../../../theme';
import { toFixed } from '../../../utils/formatters';

interface CrossModuleAnalyticsProps {
  data: {
 totalRevenueOpportunity: number;
 systemWideGaps: Array<{
 category: string;
 count: number;
 impact: 'high' | 'medium' | 'low';
 }>;
 patientCoverage: {
 totalPatients: number;
 activelyManaged: number;
 coverage: number;
 byModule: Record<string, number>;
 };
 moduleComparison: {
 patientVolume: string;
 revenueOpportunity: string;
 gapIdentification: string;
 efficiency: string;
 };
 qualityMetrics: {
 overallScore: number;
 codeCompliance: number;
 documentationQuality: number;
 careCoordination: number;
 patientSafety: number;
 };
  };
}

export const CrossModuleAnalytics: React.FC<CrossModuleAnalyticsProps> = ({ data }) => {
  const { semantic, getChartColor } = useTheme();
  const [selectedView, setSelectedView] = useState<'revenue' | 'gaps' | 'coverage' | 'quality'>('revenue');

  // Transform data for charts
  // Revenue estimate based on patient count (deterministic, no Math.random)
  const REVENUE_PER_PATIENT_ESTIMATE = 2500;
  const moduleRevenueData = Object.entries(data.patientCoverage.byModule).map(([module, patients], index) => ({
 module: module.replace(/([A-Z])/g, ' $1').trim(),
 patients,
 revenue: patients * REVENUE_PER_PATIENT_ESTIMATE,
 color: getChartColor(index)
  }));

  const gapsByImpact = data.systemWideGaps.reduce((acc, gap) => {
 acc[gap.impact] = (acc[gap.impact] || 0) + gap.count;
 return acc;
  }, {} as Record<string, number>);

  const gapDistributionData = Object.entries(gapsByImpact).map(([impact, count]) => ({
 impact: impact.charAt(0).toUpperCase() + impact.slice(1),
 count,
 color: impact === 'high' ? semantic['risk.high'] : 
 impact === 'medium' ? semantic['risk.moderate'] : semantic['risk.low']
  }));

  const qualityMetricsData = Object.entries(data.qualityMetrics).map(([metric, score]) => ({
 metric: metric.replace(/([A-Z])/g, ' $1').trim(),
 score: Math.round(score * 100),
 target: 90 // Target score
  }));

  const renderCustomTooltip = (props: any) => {
 if (props.active && props.payload && props.payload[0]) {
 const data = props.payload[0].payload;
 return (
 <div 
 className="p-3 rounded-lg shadow-lg border"
 style={{ 
 backgroundColor: semantic['surface.elevated'],
 borderColor: semantic['border.default']
 }}
 >
 <p className="font-medium mb-1" style={{ color: semantic['text.primary'] }}>
 {props.label}
 </p>
 {props.payload.map((entry: any, index: number) => (
 <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
 {entry.name}: {entry.name.includes('revenue') || entry.name.includes('Revenue') 
 ? `$${toFixed(entry.value / 1000000, 1)}M`
 : entry.value.toLocaleString()}
 </p>
 ))}
 </div>
 );
 }
 return null;
  };

  return (
 <div 
 className="rounded-xl p-6 border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold" style={{ color: semantic['text.primary'] }}>
 Cross-Module Analytics
 </h2>
 
 {/* View Selector */}
 <div className="flex bg-gray-100 rounded-lg p-1">
 {[
 { key: 'revenue', label: 'Revenue', icon: DollarSign },
 { key: 'gaps', label: 'Gaps', icon: AlertTriangle },
 { key: 'coverage', label: 'Coverage', icon: Users },
 { key: 'quality', label: 'Quality', icon: Target }
 ].map(({ key, label, icon: Icon }) => (
 <button
 key={key}
 onClick={() => setSelectedView(key as any)}
 className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
 selectedView === key ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
 }`}
 style={{
 color: selectedView === key ? semantic['text.primary'] : semantic['text.muted']
 }}
 >
 <Icon className="w-4 h-4" />
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Analytics Content */}
 <div className="h-80">
 {selectedView === 'revenue' && (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={moduleRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={semantic['border.muted']} />
 <XAxis 
 dataKey="module" 
 stroke={semantic['text.muted']}
 fontSize={12}
 angle={-45}
 textAnchor="end"
 height={80}
 />
 <YAxis 
 stroke={semantic['text.muted']}
 fontSize={12}
 tickFormatter={(value) => `$${toFixed(value / 1000000, 1)}M`}
 />
 <Tooltip content={renderCustomTooltip} />
 <Bar 
 dataKey="revenue" 
 name="Revenue Opportunity"
 radius={[4, 4, 0, 0]}
 fill={semantic['chart.primary']}
 />
 </BarChart>
 </ResponsiveContainer>
 )}

 {selectedView === 'gaps' && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
 {/* Gap Distribution Pie Chart */}
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={gapDistributionData}
 dataKey="count"
 nameKey="impact"
 cx="50%"
 cy="50%"
 outerRadius={80}
 innerRadius={40}
 >
 {gapDistributionData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip content={renderCustomTooltip} />
 </PieChart>
 </ResponsiveContainer>
 
 {/* Gap Details */}
 <div className="space-y-3">
 <h3 className="font-medium" style={{ color: semantic['text.primary'] }}>
 Gap Categories
 </h3>
 {data.systemWideGaps.map((gap, index) => (
 <div key={gap.category} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: semantic['surface.tertiary'] }}>
 <div className="flex items-center gap-3">
 <div 
 className="w-3 h-3 rounded-full"
 style={{ 
 backgroundColor: gap.impact === 'high' ? semantic['risk.high'] : 
 gap.impact === 'medium' ? semantic['risk.moderate'] : semantic['risk.low']
 }}
 />
 <span className="font-medium" style={{ color: semantic['text.primary'] }}>
 {gap.category}
 </span>
 </div>
 <div className="text-right">
 <div className="font-semibold" style={{ color: semantic['text.primary'] }}>
 {gap.count.toLocaleString()}
 </div>
 <div className="text-xs" style={{ color: semantic['text.muted'] }}>
 {gap.impact} impact
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {selectedView === 'coverage' && (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={moduleRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={semantic['border.muted']} />
 <XAxis 
 dataKey="module" 
 stroke={semantic['text.muted']}
 fontSize={12}
 angle={-45}
 textAnchor="end"
 height={80}
 />
 <YAxis 
 stroke={semantic['text.muted']}
 fontSize={12}
 tickFormatter={(value) => value.toLocaleString()}
 />
 <Tooltip content={renderCustomTooltip} />
 <Bar 
 dataKey="patients" 
 name="Patient Count"
 radius={[4, 4, 0, 0]}
 fill={semantic['chart.tertiary']}
 />
 </BarChart>
 </ResponsiveContainer>
 )}

 {selectedView === 'quality' && (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={qualityMetricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={semantic['border.muted']} />
 <XAxis 
 dataKey="metric" 
 stroke={semantic['text.muted']}
 fontSize={12}
 angle={-45}
 textAnchor="end"
 height={80}
 />
 <YAxis 
 stroke={semantic['text.muted']}
 fontSize={12}
 domain={[0, 100]}
 tickFormatter={(value) => `${value}%`}
 />
 <Tooltip content={renderCustomTooltip} />
 <Bar 
 dataKey="score" 
 name="Current Score"
 radius={[4, 4, 0, 0]}
 fill={semantic['status.success']}
 />
 <Bar 
 dataKey="target" 
 name="Target Score"
 radius={[4, 4, 0, 0]}
 fill={semantic['chart.secondary']}
 opacity={0.3}
 />
 </BarChart>
 </ResponsiveContainer>
 )}
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6" style={{ borderTop: `1px solid ${semantic['border.muted']}` }}>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 ${toFixed(data.totalRevenueOpportunity / 1000000, 1)}M
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Total Opportunity
 </div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {data.systemWideGaps.reduce((sum, gap) => sum + gap.count, 0).toLocaleString()}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Total Gaps
 </div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {toFixed(data.patientCoverage.coverage * 100, 1)}%
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Coverage Rate
 </div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {Math.round(data.qualityMetrics.overallScore * 100)}%
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Quality Score
 </div>
 </div>
 </div>
 </div>
  );
};