import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Building2,
  Activity,
  TrendingUp,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  ServerOff,
} from 'lucide-react';
import TailrdLogo from '../../components/TailrdLogo';
import { toFixed } from '../../utils/formatters';

import { DATA_SOURCE } from '../../config/dataSource';
const API_URL = DATA_SOURCE.apiUrl;

interface PlatformAnalytics {
  totalHospitals: number;
  activeUsers: number;
  monthlyGrowth: number;
  platformRevenue: number;
  systemHealth: number;
  criticalAlerts: number;
  apiResponseMs?: number;
}

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [backendConnected, setBackendConnected] = useState(false);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkBackendConnection = useCallback(async (): Promise<boolean> => {
    try {
      const baseUrl = API_URL.replace(/\/api$/, '');
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(4000) });
      const connected = res.ok;
      setBackendConnected(connected);
      return connected;
    } catch {
      setBackendConnected(false);
      return false;
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const connected = await checkBackendConnection();

    if (!connected) {
      setAnalytics(null);
      setLoading(false);
      setLastChecked(new Date());
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('tailrd-session-token') ?? ''}`,
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PlatformAnalytics = await res.json();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, [checkBackendConnection]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-[#F0F5FA]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#C8D4DC]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="hover:opacity-75 transition-opacity">
                <TailrdLogo />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#1A2F4A]">TAILRD Super Admin</h1>
                <p className="text-sm text-[#4A6880]">Platform Management Console</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Last checked timestamp */}
              {lastChecked && (
                <span className="text-xs text-[#6B7280]">
                  Updated {lastChecked.toLocaleTimeString()}
                </span>
              )}

              {/* Manual refresh */}
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-[#4A6880] hover:text-[#2C4A60] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Connection status */}
              <div className="flex items-center gap-2 text-sm">
                {backendConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-[#2C4A60]" />
                    <span className="text-[#2C4A60] font-medium">Backend Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-[#7A1A2E]" />
                    <span className="text-[#7A1A2E] font-medium">Backend Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#1A2F4A] mb-2">Platform Analytics</h2>
          <p className="text-[#4A6880]">Live data from the connected backend</p>
        </div>

        {/* Offline Banner */}
        {!backendConnected && !loading && (
          <div className="mb-8 rounded-xl border border-[#9B2438] bg-[rgba(122,26,46,0.05)] p-5 flex items-start gap-4">
            <ServerOff className="w-6 h-6 text-[#7A1A2E] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#7A1A2E] text-base">Backend Unavailable</p>
              <p className="text-sm text-[#5C1022] mt-1">
                Could not reach <code className="px-1 py-0.5 bg-[rgba(122,26,46,0.08)] rounded text-xs font-mono">{API_URL}/health</code>.
                Platform analytics require an active backend connection.
              </p>
              <p className="text-sm text-[#4A6880] mt-2">
                All clinical modules and demo content remain fully functional. Only live platform metrics are unavailable.
              </p>
              <button
                onClick={fetchAnalytics}
                className="mt-3 text-sm font-medium text-[#7A1A2E] underline underline-offset-2 hover:text-[#5C1022] transition-colors"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-[#C8D4DC] animate-pulse">
                <div className="h-4 bg-[#C8D4DC] rounded w-1/2 mb-3" />
                <div className="h-8 bg-[#E8EEF2] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[#E8EEF2] rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Analytics Cards — only rendered when real data exists */}
        {!loading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              label="Connected Hospitals"
              value={analytics.totalHospitals.toLocaleString()}
              sub="All systems operational"
              icon={<Building2 className="w-10 h-10 text-[#4A6880]" />}
              accent="#2C4A60"
            />
            <MetricCard
              label="Active Users"
              value={analytics.activeUsers.toLocaleString()}
              sub={`+${analytics.monthlyGrowth}% this month`}
              icon={<Users className="w-10 h-10 text-[#4A6880]" />}
              accent="#2C4A60"
            />
            <MetricCard
              label="Platform Revenue"
              value={`$${toFixed(analytics.platformRevenue / 1000000, 1)}M`}
              sub="Cumulative ARR"
              icon={<TrendingUp className="w-10 h-10 text-[#4A6880]" />}
              accent="#2C4A60"
            />
            <MetricCard
              label="System Health"
              value={`${analytics.systemHealth}%`}
              sub="Uptime — rolling 30 days"
              icon={<Activity className="w-10 h-10 text-[#2C4A60]" />}
              accent="#2C4A60"
            />
            <MetricCard
              label="Critical Alerts"
              value={String(analytics.criticalAlerts)}
              sub={analytics.criticalAlerts === 0 ? 'No active alerts' : 'Requires attention'}
              icon={
                <AlertTriangle
                  className={`w-10 h-10 ${analytics.criticalAlerts > 0 ? 'text-[#7A1A2E]' : 'text-[#4A6880]'}`}
                />
              }
              accent={analytics.criticalAlerts > 0 ? '#7A1A2E' : '#2C4A60'}
            />
            {analytics.apiResponseMs !== undefined && (
              <MetricCard
                label="API Response"
                value={`${analytics.apiResponseMs}ms`}
                sub={analytics.apiResponseMs < 200 ? 'Excellent' : analytics.apiResponseMs < 500 ? 'Good' : 'Degraded'}
                icon={<Activity className="w-10 h-10 text-[#4A6880]" />}
                accent="#2C4A60"
              />
            )}
          </div>
        )}

        {/* Quick Navigation */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[#1A2F4A] mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NavCard
              onClick={() => navigate('/hf')}
              icon={<BarChart3 className="w-7 h-7 text-[#4A6880]" />}
              title="Heart Failure"
              description="GDMT analytics and care team dashboards"
            />
            <NavCard
              onClick={() => navigate('/ep')}
              icon={<Activity className="w-7 h-7 text-[#4A6880]" />}
              title="Electrophysiology"
              description="EP device monitoring and clinical support"
            />
            <NavCard
              onClick={() => navigate('/coronary')}
              icon={<TrendingUp className="w-7 h-7 text-[#4A6880]" />}
              title="PCI & Coronary"
              description="Coronary intervention analytics"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, accent }) => (
  <div
    className="bg-white rounded-xl shadow-sm p-6 border-l-4 flex items-center justify-between"
    style={{ borderLeftColor: accent }}
  >
    <div>
      <p className="text-sm font-medium text-[#4A6880]">{label}</p>
      <p className="text-3xl font-bold text-[#1A2F4A] mt-1">{value}</p>
      <p className="text-sm text-[#6B7280] mt-1">{sub}</p>
    </div>
    {icon}
  </div>
);

interface NavCardProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const NavCard: React.FC<NavCardProps> = ({ onClick, icon, title, description }) => (
  <button
    onClick={onClick}
    className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-[#C8D4DC] text-left w-full"
  >
    <div className="mb-3">{icon}</div>
    <h3 className="text-base font-semibold text-[#1A2F4A] mb-1">{title}</h3>
    <p className="text-sm text-[#4A6880]">{description}</p>
  </button>
);

export default SuperAdminDashboard;
