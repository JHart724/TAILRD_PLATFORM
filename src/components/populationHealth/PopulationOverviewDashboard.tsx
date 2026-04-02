import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Award,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Heart,
  Activity
} from 'lucide-react';
import { toFixed } from '../../utils/formatters';

// Mock data - in real implementation, this would come from API
const mockPatientTrendData = [
  { month: 'Jan', heartFailure: 1240, structural: 890, ep: 654, vascular: 432, valvular: 321, coronary: 876 },
  { month: 'Feb', heartFailure: 1356, structural: 934, ep: 723, vascular: 467, valvular: 289, coronary: 923 },
  { month: 'Mar', heartFailure: 1489, structural: 1023, ep: 812, vascular: 534, valvular: 356, coronary: 1012 },
  { month: 'Apr', heartFailure: 1523, structural: 1156, ep: 867, vascular: 598, valvular: 423, coronary: 1098 },
  { month: 'May', heartFailure: 1634, structural: 1234, ep: 934, vascular: 612, valvular: 456, coronary: 1156 },
  { month: 'Jun', heartFailure: 1702, structural: 1298, ep: 1001, vascular: 645, valvular: 489, coronary: 1223 }
];

const mockGapData = [
  { module: 'Heart Failure', gdmtOptimization: 234, medicationAdheren: 156, deviceTherapy: 89, lifestyle: 123 },
  { module: 'Structural', gdmtOptimization: 123, medicationAdheren: 234, deviceTherapy: 167, lifestyle: 98 },
  { module: 'EP', gdmtOptimization: 89, medicationAdheren: 134, deviceTherapy: 245, lifestyle: 76 },
  { module: 'Vascular', gdmtOptimization: 156, medicationAdheren: 98, deviceTherapy: 67, lifestyle: 134 },
  { module: 'Valvular', gdmtOptimization: 78, medicationAdheren: 123, deviceTherapy: 45, lifestyle: 89 },
  { module: 'Coronary', gdmtOptimization: 167, medicationAdheren: 145, deviceTherapy: 123, lifestyle: 156 }
];

const mockQualityMeasures = [
  { id: 'CMS144', name: 'HF Beta-Blocker Therapy', current: 87.3, target: 85, benchmark: 82.1 },
  { id: 'CMS145', name: 'CAD Lipid Therapy', current: 92.1, target: 90, benchmark: 88.7 },
  { id: 'CMS135', name: 'HF ACE/ARB Therapy', current: 79.8, target: 80, benchmark: 76.4 },
  { id: 'CMS347', name: 'Statin After Discharge', current: 94.2, target: 92, benchmark: 89.3 },
  { id: 'CMS236', name: 'Device Therapy HFrEF', current: 73.1, target: 75, benchmark: 71.8 }
];

const mockRevenueData = [
  { category: 'GDMT Optimization', amount: 2840000, patients: 1456, avgPerPatient: 1950 },
  { category: 'Device Therapy', amount: 4320000, patients: 892, avgPerPatient: 4843 },
  { category: 'Procedure Optimization', amount: 1890000, patients: 634, avgPerPatient: 2982 },
  { category: 'Length of Stay', amount: 3670000, patients: 2134, avgPerPatient: 1720 }
];

const mockProviderPerformance = [
  { name: 'Dr. Sarah Chen', gdmtScore: 94.2, deviceUtilization: 89.3, totalPatients: 234, revenue: 1240000 },
  { name: 'Dr. Michael Rodriguez', gdmtScore: 91.7, deviceUtilization: 92.1, totalPatients: 198, revenue: 1156000 },
  { name: 'Dr. Jennifer Kim', gdmtScore: 88.9, deviceUtilization: 85.6, totalPatients: 267, revenue: 1089000 },
  { name: 'Dr. David Thompson', gdmtScore: 85.3, deviceUtilization: 78.9, totalPatients: 189, revenue: 892000 },
  { name: 'Dr. Lisa Wang', gdmtScore: 82.1, deviceUtilization: 81.4, totalPatients: 156, revenue: 743000 }
];

interface PopulationOverviewDashboardProps {
  className?: string;
}

const PopulationOverviewDashboard: React.FC<PopulationOverviewDashboardProps> = ({ className = '' }) => {
  const [equityToggle, setEquityToggle] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6m');
  const [refreshing, setRefreshing] = useState(false);

  // Calculate totals and trends
  const totalPatients = useMemo(() => {
 const latest = mockPatientTrendData[mockPatientTrendData.length - 1];
 return Object.values(latest).reduce<number>((sum, val) => 
 typeof val === 'number' ? sum + val : sum, 0
 );
  }, []);

  const patientGrowth = useMemo(() => {
 if (mockPatientTrendData.length < 2) return 0;
 const current = Object.values(mockPatientTrendData[mockPatientTrendData.length - 1])
 .reduce<number>((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
 const previous = Object.values(mockPatientTrendData[mockPatientTrendData.length - 2])
 .reduce<number>((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
 return ((current - previous) / previous) * 100;
  }, []);

  const totalRevenue = mockRevenueData.reduce((sum, item) => sum + item.amount, 0);

  const handleRefresh = async () => {
 setRefreshing(true);
 // Simulate API call
 await new Promise(resolve => setTimeout(resolve, 1500));
 setRefreshing(false);
  };

  const getQualityStatus = (current: number, target: number) => {
 const ratio = current / target;
 if (ratio >= 1.05) return 'exceeding';
 if (ratio >= 0.98) return 'meeting';
 if (ratio >= 0.9) return 'below';
 return 'critical';
  };

  const getStatusColor = (status: string) => {
 switch (status) {
 case 'exceeding': return 'text-teal-700';
 case 'meeting': return 'text-porsche-600';
 case 'below': return 'text-crimson-600';
 case 'critical': return 'text-medical-red-600';
 default: return 'text-titanium-600';
 }
  };

  return (
 <div className={`space-y-6 ${className}`}>
 {/* Header */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-gradient-to-br from-porsche-500 to-porsche-600 rounded-2xl shadow-lg">
 <BarChart3 className="w-8 h-8 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-titanium-900">Population Health Overview</h1>
 <p className="text-titanium-600">Executive dashboard for cardiovascular service line analytics</p>
 </div>
 </div>
 
 <div className="flex items-center gap-3">
 {/* Equity Toggle */}
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-titanium-700">Equity Analytics</span>
 <button
 onClick={() => setEquityToggle(!equityToggle)}
 className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
 equityToggle ? 'bg-porsche-500' : 'bg-titanium-300'
 }`}
 >
 <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
 equityToggle ? 'translate-x-5' : 'translate-x-0.5'
 }`} />
 </button>
 </div>
 
 {/* Time Range Selector */}
 <select
 value={selectedTimeRange}
 onChange={(e) => setSelectedTimeRange(e.target.value)}
 className="px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm font-medium text-titanium-700"
 >
 <option value="3m">3 Months</option>
 <option value="6m">6 Months</option>
 <option value="1y">1 Year</option>
 </select>
 
 {/* Refresh Button */}
 <button
 onClick={handleRefresh}
 disabled={refreshing}
 className="px-4 py-2 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 </div>
 </div>

 {/* Key Metrics Row */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <Users className="w-5 h-5 text-porsche-600" />
 <span className={`text-sm font-semibold flex items-center gap-1 ${
 patientGrowth >= 0 ? 'text-teal-700' : 'text-medical-red-600'
 }`}>
 {patientGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
 {toFixed(Math.abs(patientGrowth), 1)}%
 </span>
 </div>
 <div className="text-2xl font-bold text-titanium-900">{totalPatients.toLocaleString()}</div>
 <div className="text-sm text-titanium-600">Total Active Patients</div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <DollarSign className="w-5 h-5 text-teal-700" />
 <span className="text-sm font-semibold text-teal-700 flex items-center gap-1">
 <TrendingUp className="w-3 h-3" />
 8.2%
 </span>
 </div>
 <div className="text-2xl font-bold text-titanium-900">${toFixed(totalRevenue / 1000000, 1)}M</div>
 <div className="text-sm text-titanium-600">Revenue Opportunity</div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <Award className="w-5 h-5 text-crimson-600" />
 <span className="text-sm font-semibold text-teal-700">85.2%</span>
 </div>
 <div className="text-2xl font-bold text-titanium-900">4/5</div>
 <div className="text-sm text-titanium-600">Quality Measures</div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <Zap className="w-5 h-5 text-arterial-600" />
 <span className="text-sm font-semibold text-medical-red-600 flex items-center gap-1">
 <TrendingDown className="w-3 h-3" />
 2.1%
 </span>
 </div>
 <div className="text-2xl font-bold text-titanium-900">1,847</div>
 <div className="text-sm text-titanium-600">Active Therapy Gaps</div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 {/* Patient Trends Chart */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Patient Volume by Module</h2>
 <div className="flex items-center gap-2">
 <Heart className="w-5 h-5 text-medical-red-500" />
 <span className="text-sm text-titanium-600">Trending over time</span>
 </div>
 </div>
 
 <ResponsiveContainer width="100%" height={300}>
 <AreaChart data={mockPatientTrendData}>
 <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
 <XAxis 
 dataKey="month" 
 className="text-xs"
 tick={{ fill: '#64748b', fontSize: 12 }}
 />
 <YAxis 
 className="text-xs"
 tick={{ fill: '#64748b', fontSize: 12 }}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.95)',
 border: '1px solid rgba(255, 255, 255, 0.3)',
 borderRadius: '12px',
 backdropFilter: 'blur(20px)'
 }}
 />
 <Area type="monotone" dataKey="heartFailure" stackId="1" stroke="#2C4A60" fill="#2C4A60" fillOpacity={0.6} />
 <Area type="monotone" dataKey="structural" stackId="1" stroke="#7A1A2E" fill="#7A1A2E" fillOpacity={0.6} />
 <Area type="monotone" dataKey="ep" stackId="1" stroke="#6B8EA8" fill="#6B8EA8" fillOpacity={0.6} />
 <Area type="monotone" dataKey="vascular" stackId="1" stroke="#2C4A60" fill="#2C4A60" fillOpacity={0.6} />
 <Area type="monotone" dataKey="valvular" stackId="1" stroke="#C8D4DC" fill="#C8D4DC" fillOpacity={0.6} />
 <Area type="monotone" dataKey="coronary" stackId="1" stroke="#9B2438" fill="#9B2438" fillOpacity={0.6} />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 {/* Quality Measures Gauges */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Quality Measure Performance</h2>
 <Activity className="w-5 h-5 text-teal-700" />
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 {mockQualityMeasures.slice(0, 4).map((measure) => {
 const status = getQualityStatus(measure.current, measure.target);
 return (
 <div key={measure.id} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <div className="text-xs font-medium text-titanium-600">{measure.id}</div>
 <div className={`text-xs font-bold ${getStatusColor(status)}`}>
 {toFixed(measure.current, 1)}%
 </div>
 </div>
 
 <div className="relative">
 <div className="w-full bg-titanium-200 rounded-full h-2 mb-1">
 <div 
 className={`h-2 rounded-full transition-all duration-500 ${
 status === 'exceeding' ? 'bg-teal-700' :
 status === 'meeting' ? 'bg-porsche-500' :
 status === 'below' ? 'bg-crimson-500' :
 'bg-medical-red-500'
 }`}
 style={{ width: `${Math.min(measure.current, 100)}%` }}
 />
 </div>
 
 {/* Target marker */}
 <div 
 className="absolute top-0 w-0.5 h-2 bg-titanium-600"
 style={{ left: `${measure.target}%` }}
 />
 </div>
 
 <div className="text-xs text-titanium-500 mt-1">
 Target: {measure.target}% | Benchmark: {measure.benchmark}%
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Therapy Gap Heatmap */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Therapy Gap Prevalence Heatmap</h2>
 <div className="text-sm text-titanium-600">Darker = Higher Gap Count</div>
 </div>
 
 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={mockGapData}>
 <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
 <XAxis 
 dataKey="module" 
 angle={-45}
 textAnchor="end"
 height={80}
 tick={{ fill: '#64748b', fontSize: 11 }}
 />
 <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.95)',
 border: '1px solid rgba(255, 255, 255, 0.3)',
 borderRadius: '12px',
 backdropFilter: 'blur(20px)'
 }}
 />
 <Bar dataKey="gdmtOptimization" fill="#2C4A60" name="GDMT Optimization" />
 <Bar dataKey="medicationAdheren" fill="#7A1A2E" name="Medication Adherence" />
 <Bar dataKey="deviceTherapy" fill="#2C4A60" name="Device Therapy" />
 <Bar dataKey="lifestyle" fill="#C8D4DC" name="Lifestyle" />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 {/* Revenue Opportunity Summary */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Revenue Opportunities</h2>
 <DollarSign className="w-5 h-5 text-teal-700" />
 </div>
 
 <div className="space-y-4">
 {mockRevenueData.map((item, index) => (
 <div key={item.category} className="p-4 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <div className="font-medium text-titanium-900">{item.category}</div>
 <div className="text-lg font-bold text-teal-700">
 ${toFixed(item.amount / 1000000, 1)}M
 </div>
 </div>
 <div className="flex items-center justify-between text-sm text-titanium-600">
 <span>{item.patients} patients</span>
 <span>Avg: ${item.avgPerPatient.toLocaleString()}</span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-2 mt-2">
 <div 
 className="bg-teal-700 h-2 rounded-full transition-all duration-500"
 style={{ width: `${(item.amount / Math.max(...mockRevenueData.map(r => r.amount))) * 100}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Provider Performance Leaderboard */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Provider Performance</h2>
 <Award className="w-5 h-5 text-crimson-500" />
 </div>
 
 <div className="space-y-3">
 {mockProviderPerformance.map((provider, index) => (
 <div key={provider.name} className="p-4 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
 index === 0 ? 'bg-chrome-50' :
 index === 1 ? 'bg-gray-400' :
 index === 2 ? 'bg-chrome-50' :
 'bg-titanium-500'
 }`}>
 {index + 1}
 </div>
 <div>
 <div className="font-medium text-titanium-900">{provider.name}</div>
 <div className="text-sm text-titanium-600">{provider.totalPatients} patients</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-teal-700">
 ${toFixed(provider.revenue / 1000, 0)}K
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 mt-3">
 <div>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-titanium-600">GDMT Score</span>
 <span className="font-medium">{provider.gdmtScore}%</span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-1.5">
 <div 
 className="bg-porsche-500 h-1.5 rounded-full transition-all duration-500"
 style={{ width: `${provider.gdmtScore}%` }}
 />
 </div>
 </div>
 
 <div>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-titanium-600">Device Util.</span>
 <span className="font-medium">{provider.deviceUtilization}%</span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-1.5">
 <div 
 className="bg-arterial-500 h-1.5 rounded-full transition-all duration-500"
 style={{ width: `${provider.deviceUtilization}%` }}
 />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
  );
};

export default PopulationOverviewDashboard;