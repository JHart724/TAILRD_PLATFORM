/**
 * GOD View - Cross-Module System Overview
 * 
 * Provides SUPER_ADMIN users with a unified dashboard showing:
 * - All module health and status
 * - Cross-module analytics
 * - Global search capabilities
 * - System-wide metrics and alerts
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  DollarSign,
  Shield,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';
import { useTheme } from '../../../theme';
import { toFixed } from '../../../utils/formatters';
import { ModuleCard } from './ModuleCard';
import { CrossModuleAnalytics } from './CrossModuleAnalytics';
import { GlobalSearch } from './GlobalSearch';
import { SystemHealthPanel } from './SystemHealthPanel';

interface GodViewData {
  modules: Array<{
 module: string;
 health: 'healthy' | 'warning' | 'critical' | 'unknown';
 metrics: {
 patients: number;
 revenueOpportunity: number;
 gapsIdentified: number;
 };
 alerts: number;
 lastUpdated: string;
  }>;
  analytics: {
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
  timestamp: string;
}

export const GodView: React.FC = () => {
  const { colors, semantic, spacing } = useTheme();
  const [data, setData] = useState<GodViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000); // 30 seconds

  useEffect(() => {
 fetchGodViewData();
 
 // Set up auto-refresh
 if (refreshInterval) {
 const interval = setInterval(fetchGodViewData, refreshInterval);
 return () => clearInterval(interval);
 }
  }, [refreshInterval, selectedTimeRange]);

  const fetchGodViewData = async () => {
 try {
 const [overviewRes, analyticsRes] = await Promise.all([
 fetch('/api/admin/god/overview', {
 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
 }),
 fetch('/api/admin/god/cross-module-analytics', {
 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
 })
 ]);

 if (!overviewRes.ok || !analyticsRes.ok) {
 throw new Error('Failed to fetch GOD view data');
 }

 const overview = await overviewRes.json();
 const analytics = await analyticsRes.json();

 setData({
 modules: overview.modules,
 analytics,
 timestamp: overview.timestamp
 });
 
 setError(null);
 } catch (err) {
 console.error('GOD View data fetch error:', err);
 setError(err instanceof Error ? err.message : 'Failed to load data');
 } finally {
 setIsLoading(false);
 }
  };

  if (isLoading) return <GodViewSkeleton />;
  
  if (error) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: semantic['surface.secondary'] }}>
 <div className="text-center">
 <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: semantic['status.danger'] }} />
 <h1 className="text-xl font-semibold mb-2" style={{ color: semantic['text.primary'] }}>
 GOD View Error
 </h1>
 <p className="mb-4" style={{ color: semantic['text.secondary'] }}>{error}</p>
 <button 
 onClick={fetchGodViewData}
 className="px-4 py-2 rounded-lg transition-colors"
 style={{ 
 backgroundColor: semantic['chart.primary'],
 color: semantic['text.inverse']
 }}
 >
 Retry
 </button>
 </div>
 </div>
 );
  }

  if (!data) return null;

  const totalPatients = data.analytics.patientCoverage.totalPatients;
  const totalRevenue = data.analytics.totalRevenueOpportunity;
  const totalAlerts = data.modules.reduce((sum, mod) => sum + mod.alerts, 0);
  const healthyModules = data.modules.filter(mod => mod.health === 'healthy').length;

  return (
 <div className="min-h-screen" style={{ backgroundColor: semantic['surface.secondary'] }}>
 {/* Header */}
 <header 
 className="border-b"
 style={{ 
 backgroundColor: semantic['surface.elevated'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="px-8 py-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div 
 className="p-3 rounded-xl"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 >
 <Shield className="w-8 h-8" style={{ color: semantic['chart.primary'] }} />
 </div>
 <div>
 <h1 className="text-3xl font-bold" style={{ color: semantic['text.primary'] }}>
 TAILRD Command Center
 </h1>
 <p className="mt-1" style={{ color: semantic['text.secondary'] }}>
 Cross-module oversight and system health monitoring
 </p>
 </div>
 </div>
 
 <div className="flex items-center gap-4">
 {/* Time Range Selector */}
 <div className="flex bg-gray-100 rounded-lg p-1">
 {(['24h', '7d', '30d'] as const).map((range) => (
 <button
 key={range}
 onClick={() => setSelectedTimeRange(range)}
 className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
 selectedTimeRange === range 
 ? 'bg-white shadow-sm' 
 : 'hover:bg-gray-50'
 }`}
 style={{
 color: selectedTimeRange === range 
 ? semantic['text.primary'] 
 : semantic['text.muted']
 }}
 >
 {range}
 </button>
 ))}
 </div>
 
 {/* Refresh Control */}
 <button 
 onClick={fetchGodViewData}
 className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
 style={{ 
 borderColor: semantic['border.default'],
 color: semantic['text.secondary']
 }}
 >
 <Clock className="w-4 h-4" />
 Refresh
 </button>
 
 <GlobalSearch />
 </div>
 </div>
 </div>
 </header>
 
 <div className="p-8">
 {/* System Overview KPIs */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <div 
 className="p-6 rounded-xl border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center gap-3 mb-4">
 <div 
 className="p-2 rounded-lg"
 style={{ backgroundColor: '#f0f4f8' }}
 >
 <Users className="w-5 h-5" style={{ color: semantic['chart.primary'] }} />
 </div>
 <h3 className="font-medium" style={{ color: semantic['text.primary'] }}>
 Total Patients
 </h3>
 </div>
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {totalPatients.toLocaleString()}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 {toFixed(data.analytics.patientCoverage.coverage * 100, 1)}% actively managed
 </div>
 </div>
 
 <div 
 className="p-6 rounded-xl border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center gap-3 mb-4">
 <div 
 className="p-2 rounded-lg"
 style={{ backgroundColor: '#f0fdf4' }}
 >
 <DollarSign className="w-5 h-5" style={{ color: semantic['status.success'] }} />
 </div>
 <h3 className="font-medium" style={{ color: semantic['text.primary'] }}>
 Revenue Opportunity
 </h3>
 </div>
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 ${toFixed(totalRevenue / 1000000, 1)}M
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Across all modules
 </div>
 </div>
 
 <div 
 className="p-6 rounded-xl border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center gap-3 mb-4">
 <div 
 className="p-2 rounded-lg"
 style={{ backgroundColor: '#FAF6E8' }}
 >
 <AlertTriangle className="w-5 h-5" style={{ color: semantic['status.warning'] }} />
 </div>
 <h3 className="font-medium" style={{ color: semantic['text.primary'] }}>
 Active Alerts
 </h3>
 </div>
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {totalAlerts}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Requiring attention
 </div>
 </div>
 
 <div 
 className="p-6 rounded-xl border"
 style={{ 
 backgroundColor: semantic['surface.primary'],
 borderColor: semantic['border.default']
 }}
 >
 <div className="flex items-center gap-3 mb-4">
 <div 
 className="p-2 rounded-lg"
 style={{ backgroundColor: '#f0fdf4' }}
 >
 <Activity className="w-5 h-5" style={{ color: semantic['status.success'] }} />
 </div>
 <h3 className="font-medium" style={{ color: semantic['text.primary'] }}>
 Module Health
 </h3>
 </div>
 <div className="text-2xl font-bold mb-1" style={{ color: semantic['text.primary'] }}>
 {healthyModules}/{data.modules.length}
 </div>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Modules healthy
 </div>
 </div>
 </div>
 
 {/* Cross-Module Analytics */}
 <div className="mb-8">
 <CrossModuleAnalytics data={data.analytics} />
 </div>
 
 {/* System Health Panel */}
 <div className="mb-8">
 <SystemHealthPanel 
 qualityMetrics={data.analytics.qualityMetrics}
 systemWideGaps={data.analytics.systemWideGaps}
 />
 </div>
 
 {/* Module Grid */}
 <section>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold" style={{ color: semantic['text.primary'] }}>
 Module Overview
 </h2>
 <div className="text-sm" style={{ color: semantic['text.muted'] }}>
 Last updated: {new Date(data.timestamp).toLocaleString()}
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 {data.modules.map((moduleData) => (
 <ModuleCard key={moduleData.module} data={moduleData} />
 ))}
 </div>
 </section>
 </div>
 </div>
  );
};

// Loading skeleton component
const GodViewSkeleton: React.FC = () => {
  const { semantic } = useTheme();
  
  return (
 <div className="min-h-screen" style={{ backgroundColor: semantic['surface.secondary'] }}>
 <div className="p-8">
 <div className="animate-pulse">
 {/* Header skeleton */}
 <div 
 className="h-24 rounded-xl mb-8"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 />
 
 {/* KPI cards skeleton */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 {[...Array(4)].map((_, i) => (
 <div
 key={`skeleton-kpi-${i}`}
 className="h-32 rounded-xl"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 />
 ))}
 </div>
 
 {/* Analytics skeleton */}
 <div 
 className="h-64 rounded-xl mb-8"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 />
 
 {/* Module cards skeleton */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 {[...Array(8)].map((_, i) => (
 <div
 key={`skeleton-module-${i}`}
 className="h-48 rounded-xl"
 style={{ backgroundColor: semantic['surface.tertiary'] }}
 />
 ))}
 </div>
 </div>
 </div>
 </div>
  );
};

export default GodView;