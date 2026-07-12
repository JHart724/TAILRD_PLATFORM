import React, { useState } from 'react';
import { Users, DollarSign, Zap, TrendingUp, TrendingDown, AlertCircle, Activity, Stethoscope, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  CAD_DEMO_ANNUAL_OPPORTUNITY_M,
  CAD_DEMO_YTD_CAPTURED_M,
} from '../config/cadDemoFinancials';

/**
 * CAD dashboard contract (mirrors SH/EP/HFDashboardData typing). The endpoint
 * GET /coronary-intervention/dashboard emits gap/patient counts only. Typed here so
 * CoronaryExecutiveView can drop `data: any`.
 */
export interface CADDashboardData {
  summary: {
    totalPatients: number;
    totalOpenGaps: number;
    gapsByType: Record<string, number>;
    deviceCandidates: number;
  };
  recentAlerts?: unknown[];
  source?: string;
}

/**
 * CAD Executive summary KPI row (AUDIT-304 CAD convergence; mirrors SHExecutiveSummary).
 *
 * Extracts the inline KPI block the tier used to render. The Patient-Population tile
 * already read live totalPatients; this adds the two live cards that were never shown
 * (open gaps / device candidates) and DROPS the config.kpiData fallbacks (a fabricated
 * number behind a live field is the AUDIT-099 core defect). Built fresh - NOT the
 * unrendered AUDIT-152 CADExecutiveKPICard copy. DEMO cards (revenue / at-risk /
 * captured) come from the single cadDemoFinancials model and each carry a Demo pill.
 * No fabricated trend on live cards (no trend-history endpoint exists).
 */
interface KPICardDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  live: boolean;
  trend?: number;
  trendData?: Array<{ month: string; value: number }>;
  demoValue?: string;
  demoSubtext?: string;
}

const KPI_DEFS: KPICardDef[] = [
  { id: 'total-patients', label: 'Total CAD Patients', icon: Users, color: 'blue', live: true },
  { id: 'open-gaps', label: 'Open Therapy Gaps', icon: AlertCircle, color: 'red', live: true },
  { id: 'device-candidates', label: 'Device Therapy Candidates', icon: Activity, color: 'orange', live: true },
  {
    id: 'revenue-opportunity',
    label: 'Total Revenue Opportunity',
    icon: DollarSign,
    color: 'green',
    live: false,
    demoValue: `$${CAD_DEMO_ANNUAL_OPPORTUNITY_M.toFixed(1)}M`,
    demoSubtext: 'Annual addressable (demo model)',
    trend: 14,
    trendData: [
      { month: 'Jun', value: 9.8 },
      { month: 'Jul', value: 10.2 },
      { month: 'Aug', value: 10.5 },
      { month: 'Sep', value: 10.8 },
      { month: 'Oct', value: 11.0 },
      { month: 'Nov', value: CAD_DEMO_ANNUAL_OPPORTUNITY_M },
    ],
  },
  {
    id: 'at-risk',
    label: 'At-Risk Population',
    icon: AlertCircle,
    color: 'red',
    live: false,
    demoValue: '900',
    demoSubtext: 'Flagged with trajectory data (demo model)',
    trend: -5,
    trendData: [
      { month: 'Jun', value: 980 },
      { month: 'Jul', value: 962 },
      { month: 'Aug', value: 948 },
      { month: 'Sep', value: 930 },
      { month: 'Oct', value: 915 },
      { month: 'Nov', value: 900 },
    ],
  },
  {
    id: 'captured-value',
    label: 'YTD Captured Value',
    icon: TrendingUp,
    color: 'copper',
    live: false,
    demoValue: `$${CAD_DEMO_YTD_CAPTURED_M.toFixed(1)}M`,
    demoSubtext: '37% of opportunity (demo model)',
    trend: 11,
    trendData: [
      { month: 'Jun', value: 2.9 },
      { month: 'Jul', value: 3.2 },
      { month: 'Aug', value: 3.5 },
      { month: 'Sep', value: 3.8 },
      { month: 'Oct', value: 4.0 },
      { month: 'Nov', value: CAD_DEMO_YTD_CAPTURED_M },
    ],
  },
];

interface CADExecutiveSummaryProps {
  dashboard: CADDashboardData | null;
  loading?: boolean;
  error?: string | null;
}

export const CADExecutiveSummary: React.FC<CADExecutiveSummaryProps> = ({ dashboard, loading = false, error = null }) => {
  const [selectedKPI, setSelectedKPI] = useState<KPICardDef | null>(null);

  // White-card treatment (Gap-Intelligence reference): white surface + titanium border;
  // the metric's semantic color survives only as the solid icon/value accent.
  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: { icon: 'text-teal-700', stroke: '#2C4A60' },
      green: { icon: 'text-amber-600', stroke: '#C4982A' },
      red: { icon: 'text-red-500', stroke: '#9B2438' },
      orange: { icon: 'text-[#1A6878]', stroke: '#1A6878' },
      copper: { icon: 'text-[#8B5A2B]', stroke: '#8B5A2B' },
    };
    return colors[color] || colors.blue;
  };

  // Live values from the CAD dashboard contract; '-' while unavailable, never a
  // fabricated placeholder number (closes the CAD-side AUDIT-099 dead-error defect).
  const liveValues = (id: string): { value: string; subtext: string } => {
    if (loading) return { value: '...', subtext: 'Loading live data' };
    if (error || !dashboard) return { value: '-', subtext: 'Live data unavailable' };
    const s = dashboard.summary;
    switch (id) {
      case 'total-patients':
        return { value: s.totalPatients?.toLocaleString() ?? '-', subtext: 'Active intervention panel (database)' };
      case 'open-gaps':
        return { value: s.totalOpenGaps?.toLocaleString() ?? '-', subtext: 'Recommended for review (database)' };
      case 'device-candidates':
        return { value: s.deviceCandidates?.toLocaleString() ?? '-', subtext: 'Eligible, not yet treated (database)' };
      default:
        return { value: '-', subtext: '' };
    }
  };

  return (
    <>
      <div className="metal-card border-2 border-titanium-200 p-6 mb-6">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Stethoscope className="w-6 h-6 mr-2 text-chrome-600" />
          Coronary Intervention Executive Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPI_DEFS.map((kpi) => {
            const Icon = kpi.icon;
            const colors = getColorClasses(kpi.color);
            const resolved = kpi.live ? liveValues(kpi.id) : { value: kpi.demoValue || '-', subtext: kpi.demoSubtext || '' };
            const TrendIcon = (kpi.trend ?? 0) >= 0 ? TrendingUp : TrendingDown;

            return (
              <button
                key={kpi.id}
                onClick={() => setSelectedKPI(kpi)}
                className="bg-white border-titanium-200 border-2 rounded-lg p-5 text-left hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`${colors.icon} w-8 h-8`} />
                  {kpi.live ? null : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700">
                      <Zap className="w-3 h-3" />
                      Demo
                    </span>
                  )}
                </div>
                {!kpi.live && kpi.trend !== undefined && (
                  <div className={`flex items-center text-sm font-semibold mb-1 ${kpi.trend >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                    <TrendIcon className="w-4 h-4 mr-1" />
                    {Math.abs(kpi.trend)}%
                  </div>
                )}
                <div className="text-3xl font-bold mb-1" style={{ color: colors.stroke }}>{resolved.value}</div>
                <div className="text-sm font-semibold mb-1" style={{ color: colors.stroke }}>{kpi.label}</div>
                <div className="text-xs text-gray-500">{resolved.subtext}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedKPI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedKPI.label}</h2>
                <p className="text-gray-600">
                  {selectedKPI.live ? liveValues(selectedKPI.id).subtext : selectedKPI.demoSubtext}
                </p>
              </div>
              <button onClick={() => setSelectedKPI(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-4xl font-bold mb-2">
                {selectedKPI.live ? liveValues(selectedKPI.id).value : selectedKPI.demoValue}
              </div>
            </div>

            {selectedKPI.live ? (
              <div className="h-32 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg">
                <Activity className="w-6 h-6 text-titanium-300 mb-2" />
                <p className="text-sm text-titanium-500 font-medium">Trend history pending</p>
                <p className="text-xs text-titanium-400 mt-1 max-w-sm">
                  Historical trends accumulate as ingestion snapshots build. Current value is live from the database.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 w-fit mb-3">
                  <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-700 font-medium">Demo data - EHR integration pending</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedKPI.trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#6B7280" />
                      <XAxis dataKey="month" stroke="#4B5563" />
                      <YAxis stroke="#4B5563" />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={getColorClasses(selectedKPI.color).stroke}
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        name={selectedKPI.label}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Illustrative demo trend from the CAD demo financial model - not derived from
                    patient data. Replaced by measured history once the revenue source is wired.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CADExecutiveSummary;
