import React from 'react';
import { useAdminHospitals } from '../../../hooks/useAdminData';
import {
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  Target,
  CheckCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface HospitalMetrics {
  id: string;
  name: string;
  abbr: string;
  gapClosureRate: number;
  gapClosureTrend: number[];
  avgTimeToAction: string;
  physicianEngagement: number;
  totalPhysicians: number;
  revenueRecovered: number;
}

const HOSPITAL_METRICS: HospitalMetrics[] = [
  {
    id: 'hs-001',
    name: 'Baylor Scott & White',
    abbr: 'BSW',
    gapClosureRate: 42,
    gapClosureTrend: [28, 30, 33, 35, 37, 38, 40, 39, 41, 42, 42, 42],
    avgTimeToAction: '2.3 days',
    physicianEngagement: 3,
    totalPhysicians: 4,
    revenueRecovered: 22400000,
  },
  {
    id: 'hs-002',
    name: 'Regional Medical Center',
    abbr: 'MSH',
    gapClosureRate: 34,
    gapClosureTrend: [18, 20, 22, 24, 26, 28, 30, 31, 32, 33, 33, 34],
    avgTimeToAction: '3.1 days',
    physicianEngagement: 4,
    totalPhysicians: 5,
    revenueRecovered: 18200000,
  },
  {
    id: 'hs-003',
    name: 'Mercy Health System',
    abbr: 'MH',
    gapClosureRate: 18,
    gapClosureTrend: [5, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    avgTimeToAction: '5.7 days',
    physicianEngagement: 2,
    totalPhysicians: 3,
    revenueRecovered: 6600000,
  },
];

// Build chart data
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const GAP_CLOSURE_CHART = MONTHS.map((month, i) => ({
  month,
  BSW: HOSPITAL_METRICS[0].gapClosureTrend[i],
  MSH: HOSPITAL_METRICS[1].gapClosureTrend[i],
  MH: HOSPITAL_METRICS[2].gapClosureTrend[i],
}));

const PLATFORM_SUMMARY = {
  totalGapsIdentified: 10660,
  totalGapsActioned: 3624,
  actionRate: 34,
  estimatedRevenueRecovered: 47200000,
};

// ─── Component ───────────────────────────────────────────────────────────────

const CustomerSuccess: React.FC = () => {
  const { data: hospitals } = useAdminHospitals();
  const liveCount = hospitals ? hospitals.length : null;

  return (
    <div className="space-y-6">
      {liveCount !== null && <div className="text-xs text-emerald-600 font-medium">Live data: {liveCount} health systems from backend API</div>}
      {/* Platform-Wide Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-red-600" />
            <span className="text-xs text-gray-500 uppercase font-semibold">Gaps Identified</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {PLATFORM_SUMMARY.totalGapsIdentified.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-teal-700" />
            <span className="text-xs text-gray-500 uppercase font-semibold">Gaps Actioned</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {PLATFORM_SUMMARY.totalGapsActioned.toLocaleString()}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({PLATFORM_SUMMARY.actionRate}%)
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-teal-700" />
            <span className="text-xs text-gray-500 uppercase font-semibold">Revenue Recovered</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">$47.2M</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase font-semibold">Active Physicians</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {HOSPITAL_METRICS.reduce((sum, h) => sum + h.physicianEngagement, 0)}
            <span className="text-sm font-normal text-gray-500 ml-2">
              / {HOSPITAL_METRICS.reduce((sum, h) => sum + h.totalPhysicians, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Gap Closure Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-red-600" />
          Gap Closure Rate Trend (12 Months)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={GAP_CLOSURE_CHART}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="BSW" stroke="#7A1A2E" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="MSH" stroke="#2C4A60" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="MH" stroke="#2C4A60" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Hospital Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {HOSPITAL_METRICS.map((h) => (
          <div key={h.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">{h.name}</h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {h.abbr}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Gap Closure Rate
                </div>
                <div className="text-xl font-bold text-gray-900">{h.gapClosureRate}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Avg Time to Action
                </div>
                <div className="text-xl font-bold text-gray-900">{h.avgTimeToAction}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Physician Engagement
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {h.physicianEngagement}/{h.totalPhysicians}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Revenue Recovered
                </div>
                <div className="text-xl font-bold text-gray-900">
                  ${(h.revenueRecovered / 1_000_000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerSuccess;
