import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Users,
  DollarSign,
  Calendar,
  Target,
  Activity,
  Heart,
  Stethoscope,
  Search,
  RefreshCw
} from 'lucide-react';
import { toFixed } from '../../utils/formatters';

interface TherapyGap {
  type: 'GDMT' | 'Device' | 'Rehab' | 'Screening';
  subtype: string;
  patientCount: number;
  gapsClosed: number;
  estimatedRevenue: number;
  monthlyTrend: Array<{
 month: string;
 gaps: number;
 closed: number;
 revenue: number;
  }>;
}

interface DrillDownData {
  provider?: string;
  unit?: string;
  payer?: string;
  gaps: number;
  closed: number;
  revenue: number;
  percentage: number;
}

const TherapyGapDashboard: React.FC = () => {
  const [selectedGapType, setSelectedGapType] = useState<string>('all');
  const [drillDownLevel, setDrillDownLevel] = useState<'provider' | 'unit' | 'payer'>('provider');
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data
  const therapyGaps: TherapyGap[] = [
 {
 type: 'GDMT',
 subtype: 'ACEi/ARB/ARNI',
 patientCount: 450,
 gapsClosed: 89,
 estimatedRevenue: 245000,
 monthlyTrend: [
 { month: 'Jan', gaps: 520, closed: 65, revenue: 180000 },
 { month: 'Feb', gaps: 485, closed: 78, revenue: 220000 },
 { month: 'Mar', gaps: 450, closed: 89, revenue: 245000 },
 ]
 },
 {
 type: 'GDMT',
 subtype: 'Beta-blocker',
 patientCount: 380,
 gapsClosed: 95,
 estimatedRevenue: 190000,
 monthlyTrend: [
 { month: 'Jan', gaps: 420, closed: 72, revenue: 165000 },
 { month: 'Feb', gaps: 395, closed: 88, revenue: 178000 },
 { month: 'Mar', gaps: 380, closed: 95, revenue: 190000 },
 ]
 },
 {
 type: 'Device',
 subtype: 'ICD Implant',
 patientCount: 45,
 gapsClosed: 8,
 estimatedRevenue: 480000,
 monthlyTrend: [
 { month: 'Jan', gaps: 52, closed: 4, revenue: 240000 },
 { month: 'Feb', gaps: 48, closed: 6, revenue: 360000 },
 { month: 'Mar', gaps: 45, closed: 8, revenue: 480000 },
 ]
 },
 {
 type: 'Device',
 subtype: 'CRT-D Upgrade',
 patientCount: 28,
 gapsClosed: 5,
 estimatedRevenue: 650000,
 monthlyTrend: [
 { month: 'Jan', gaps: 35, closed: 2, revenue: 260000 },
 { month: 'Feb', gaps: 31, closed: 3, revenue: 390000 },
 { month: 'Mar', gaps: 28, closed: 5, revenue: 650000 },
 ]
 },
 {
 type: 'Rehab',
 subtype: 'Cardiac Rehab',
 patientCount: 125,
 gapsClosed: 34,
 estimatedRevenue: 85000,
 monthlyTrend: [
 { month: 'Jan', gaps: 145, closed: 28, revenue: 70000 },
 { month: 'Feb', gaps: 135, closed: 31, revenue: 77500 },
 { month: 'Mar', gaps: 125, closed: 34, revenue: 85000 },
 ]
 },
 {
 type: 'Screening',
 subtype: 'Echo Surveillance',
 patientCount: 220,
 gapsClosed: 67,
 estimatedRevenue: 134000,
 monthlyTrend: [
 { month: 'Jan', gaps: 265, closed: 45, revenue: 90000 },
 { month: 'Feb', gaps: 242, closed: 56, revenue: 112000 },
 { month: 'Mar', gaps: 220, closed: 67, revenue: 134000 },
 ]
 }
  ];

  const mockDrillDownData: Record<string, DrillDownData[]> = {
 provider: [
 { provider: 'Dr. Sarah Chen', gaps: 145, closed: 32, revenue: 185000, percentage: 18.5 },
 { provider: 'Dr. Michael Torres', gaps: 128, closed: 28, revenue: 165000, percentage: 16.5 },
 { provider: 'Dr. Jennifer Walsh', gaps: 112, closed: 25, revenue: 145000, percentage: 14.5 },
 { provider: 'Dr. David Kim', gaps: 98, closed: 22, revenue: 125000, percentage: 12.5 },
 { provider: 'Dr. Lisa Park', gaps: 87, closed: 19, revenue: 115000, percentage: 11.5 },
 ],
 unit: [
 { unit: 'Heart Failure Clinic', gaps: 285, closed: 78, revenue: 425000, percentage: 35.2 },
 { unit: 'EP Lab', gaps: 156, closed: 34, revenue: 385000, percentage: 25.8 },
 { unit: 'Structural Heart', gaps: 134, closed: 28, revenue: 285000, percentage: 18.9 },
 { unit: 'Preventive Cardiology', gaps: 89, closed: 18, revenue: 145000, percentage: 12.1 },
 { unit: 'General Cardiology', gaps: 67, closed: 12, revenue: 95000, percentage: 8.0 },
 ],
 payer: [
 { payer: 'Medicare', gaps: 345, closed: 89, revenue: 485000, percentage: 42.3 },
 { payer: 'Aetna', gaps: 198, closed: 45, revenue: 285000, percentage: 24.8 },
 { payer: 'Blue Cross', gaps: 167, closed: 38, revenue: 235000, percentage: 20.8 },
 { payer: 'UnitedHealth', gaps: 125, closed: 28, revenue: 165000, percentage: 12.1 },
 ]
  };

  const filteredGaps = useMemo(() => {
 if (selectedGapType === 'all') return therapyGaps;
 return therapyGaps.filter(gap => gap.type === selectedGapType);
  }, [selectedGapType, therapyGaps]);

  const totalMetrics = useMemo(() => {
 const gaps = filteredGaps.reduce((sum, gap) => sum + gap.patientCount, 0);
 const closed = filteredGaps.reduce((sum, gap) => sum + gap.gapsClosed, 0);
 const revenue = filteredGaps.reduce((sum, gap) => sum + gap.estimatedRevenue, 0);
 
 return { gaps, closed, revenue, closureRate: gaps > 0 ? (closed / gaps) * 100 : 0 };
  }, [filteredGaps]);

  const getGapTypeColor = (type: string) => {
 switch (type) {
 case 'GDMT':
 return 'bg-porsche-500';
 case 'Device':
 return 'bg-medical-red-500';
 case 'Rehab':
 return 'bg-[#2C4A60]';
 case 'Screening':
 return 'bg-crimson-500';
 default:
 return 'bg-titanium-500';
 }
  };

  const getGapTypeIcon = (type: string) => {
 switch (type) {
 case 'GDMT':
 return Heart;
 case 'Device':
 return Activity;
 case 'Rehab':
 return Target;
 case 'Screening':
 return Stethoscope;
 default:
 return Users;
 }
  };

  const handleRefresh = async () => {
 setIsRefreshing(true);
 await new Promise(resolve => setTimeout(resolve, 1500));
 setIsRefreshing(false);
  };

  const exportData = () => {
 const csvContent = [
 ['Gap Type', 'Subtype', 'Total Gaps', 'Gaps Closed', 'Closure Rate %', 'Estimated Revenue'].join(','),
 ...filteredGaps.map(gap => [
 gap.type,
 gap.subtype,
 gap.patientCount,
 gap.gapsClosed,
 toFixed((gap.gapsClosed / gap.patientCount) * 100, 1),
 gap.estimatedRevenue
 ].join(','))
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `therapy-gaps-${selectedGapType}-${new Date().toISOString().split('T')[0]}.csv`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
  };

  const renderTreeMap = () => {
 const maxRevenue = Math.max(...filteredGaps.map(gap => gap.estimatedRevenue));
 
 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-64">
 {filteredGaps.map((gap, index) => {
 const size = (gap.estimatedRevenue / maxRevenue) * 100;
 const Icon = getGapTypeIcon(gap.type);
 
 return (
 <div
 key={gap.subtype}
 className={`
 relative rounded-xl p-4 text-white flex flex-col justify-between cursor-pointer
 transition-all duration-300 hover:scale-105 hover:shadow-lg
 ${getGapTypeColor(gap.type)}
 `}
 style={{ 
 minHeight: `${Math.max(size, 20)}%`,
 opacity: 0.8 + (size / 500)
 }}
 >
 <div>
 <Icon className="w-6 h-6 mb-2 opacity-80" />
 <h4 className="font-semibold text-sm mb-1">{gap.subtype}</h4>
 <p className="text-xs opacity-90">{gap.patientCount} gaps</p>
 </div>
 <div className="text-right">
 <p className="text-lg font-bold">${toFixed(gap.estimatedRevenue / 1000, 0)}K</p>
 <p className="text-xs opacity-90">
 {toFixed((gap.gapsClosed / gap.patientCount) * 100, 1)}% closed
 </p>
 </div>
 </div>
 );
 })}
 </div>
 );
  };

  const renderBarChart = () => {
 return (
 <div className="space-y-3">
 {filteredGaps.map((gap, index) => {
 const closureRate = (gap.gapsClosed / gap.patientCount) * 100;
 const Icon = getGapTypeIcon(gap.type);
 
 return (
 <div key={gap.subtype} className="flex items-center gap-4">
 <div className="flex items-center gap-2 w-48 flex-shrink-0">
 <Icon className="w-4 h-4 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-800">{gap.subtype}</span>
 </div>
 
 <div className="flex-1 space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-titanium-600">
 {gap.gapsClosed}/{gap.patientCount} closed ({toFixed(closureRate, 1)}%)
 </span>
 <span className="text-titanium-800 font-medium">
 ${toFixed(gap.estimatedRevenue / 1000, 0)}K
 </span>
 </div>
 
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${getGapTypeColor(gap.type)}`}
 style={{ width: `${closureRate}%` }}
 />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 );
  };

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-titanium-800 mb-2">Therapy Gap Dashboard</h1>
 <p className="text-titanium-600">
 Population-level therapy gap analysis and revenue impact tracking
 </p>
 </div>
 
 <div className="flex items-center gap-2">
 <button
 onClick={handleRefresh}
 disabled={isRefreshing}
 className="flex items-center gap-2 px-4 py-2 bg-titanium-600 text-white rounded-lg hover:bg-titanium-700 transition-colors disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 
 <button
 onClick={exportData}
 className="flex items-center gap-2 px-4 py-2 bg-[#2C4A60] text-white rounded-lg hover:bg-[#2C4A60] transition-colors"
 >
 <Download className="w-4 h-4" />
 Export
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <select
 value={selectedGapType}
 onChange={(e) => setSelectedGapType(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Gap Types</option>
 <option value="GDMT">GDMT</option>
 <option value="Device">Device</option>
 <option value="Rehab">Rehab</option>
 <option value="Screening">Screening</option>
 </select>
 
 <select
 value={drillDownLevel}
 onChange={(e) => setDrillDownLevel(e.target.value as 'provider' | 'unit' | 'payer')}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="provider">By Provider</option>
 <option value="unit">By Unit</option>
 <option value="payer">By Payer</option>
 </select>
 
 <select
 value={timeRange}
 onChange={(e) => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="month">This Month</option>
 <option value="quarter">This Quarter</option>
 <option value="year">This Year</option>
 </select>
 </div>
 </div>

 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="retina-card p-6 border-l-4 border-l-porsche-500">
 <div className="flex items-center justify-between mb-2">
 <Users className="w-6 h-6 text-porsche-500" />
 <TrendingUp className="w-4 h-4 text-[#2C4A60]" />
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 {totalMetrics.gaps.toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Total Gaps</div>
 </div>

 <div className="retina-card p-6 border-l-4 border-l-[#2C4A60]">
 <div className="flex items-center justify-between mb-2">
 <Target className="w-6 h-6 text-[#2C4A60]" />
 <TrendingUp className="w-4 h-4 text-[#2C4A60]" />
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 {totalMetrics.closed.toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Gaps Closed This Month</div>
 </div>

 <div className="retina-card p-6 border-l-4 border-l-crimson-500">
 <div className="flex items-center justify-between mb-2">
 <BarChart3 className="w-6 h-6 text-crimson-500" />
 <span className="text-xs text-titanium-500">{toFixed(totalMetrics.closureRate, 1)}%</span>
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 {toFixed(totalMetrics.closureRate, 1)}%
 </div>
 <div className="text-sm text-titanium-600">Closure Rate</div>
 </div>

 <div className="retina-card p-6 border-l-4 border-l-medical-red-500">
 <div className="flex items-center justify-between mb-2">
 <DollarSign className="w-6 h-6 text-medical-red-500" />
 <TrendingUp className="w-4 h-4 text-[#2C4A60]" />
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 ${toFixed(totalMetrics.revenue / 1000, 0)}K
 </div>
 <div className="text-sm text-titanium-600">Estimated Revenue Recovery</div>
 </div>
 </div>

 {/* Revenue Impact Treemap */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-titanium-800">Revenue Impact Treemap</h2>
 <div className="text-sm text-titanium-600">
 Size = Revenue Impact • Color = Gap Type
 </div>
 </div>
 {renderTreeMap()}
 </div>

 {/* Gap Prevalence Bar Chart */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-titanium-800">Gap Prevalence by Type</h2>
 <div className="text-sm text-titanium-600">
 Progress bars show closure rates
 </div>
 </div>
 {renderBarChart()}
 </div>

 {/* Drill-down Analysis */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-titanium-800">
 Analysis by {drillDownLevel.charAt(0).toUpperCase() + drillDownLevel.slice(1)}
 </h2>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-titanium-50">
 <tr>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">
 {drillDownLevel.charAt(0).toUpperCase() + drillDownLevel.slice(1)}
 </th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Total Gaps</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Closed</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Closure Rate</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Revenue</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">% of Total</th>
 </tr>
 </thead>
 <tbody>
 {mockDrillDownData[drillDownLevel].map((item, index) => (
 <tr
 key={String(item[drillDownLevel as keyof DrillDownData])}
 className={`border-t border-titanium-200 hover:bg-titanium-50 ${
 index % 2 === 0 ? 'bg-white' : 'bg-titanium-25'
 }`}
 >
 <td className="p-3 font-medium text-titanium-800">
 {item[drillDownLevel as keyof DrillDownData]}
 </td>
 <td className="p-3 text-titanium-700">{item.gaps}</td>
 <td className="p-3 text-titanium-700">{item.closed}</td>
 <td className="p-3">
 <div className="flex items-center gap-2">
 <div className="w-16 bg-titanium-200 rounded-full h-2">
 <div
 className="h-2 bg-[#2C4A60] rounded-full transition-all duration-500"
 style={{ width: `${(item.closed / item.gaps) * 100}%` }}
 />
 </div>
 <span className="text-sm text-titanium-700">
 {toFixed((item.closed / item.gaps) * 100, 1)}%
 </span>
 </div>
 </td>
 <td className="p-3 font-medium text-titanium-800">
 ${item.revenue.toLocaleString()}
 </td>
 <td className="p-3 text-titanium-700">{toFixed(item.percentage, 1)}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
  );
};

export default TherapyGapDashboard;