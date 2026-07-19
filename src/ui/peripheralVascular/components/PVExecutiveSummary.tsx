import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, DollarSign, Zap, TrendingUp, TrendingDown, AlertCircle, Activity, Stethoscope, X, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { peripheralVascularConfig } from '../config/executiveConfig';
import {
  PV_DEMO_YTD_CAPTURED_M,
} from '../config/pvDemoFinancials';

/**
 * PV dashboard contract (mirrors VHD/CAD/SH/EP/HFDashboardData typing). The endpoint
 * GET /peripheral-vascular/dashboard emits gap/patient counts only. Typed here so
 * PeripheralExecutiveView can drop `data: any`.
 */
export interface PVDashboardData {
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
 * PV Executive summary KPI row (AUDIT-304 PV convergence, the FINAL module; mirrors
 * VHDExecutiveSummary).
 *
 * Extracts the inline KPI block the tier used to render. The Patient tile already read
 * live totalPatients; this adds the two live cards that were never shown (open gaps /
 * device candidates) and DROPS the config.kpiData fallback (a fabricated number behind a
 * live field is the AUDIT-099 core defect). Built fresh - NOT the unrendered AUDIT-152
 * PADExecutiveKPICard copy.
 *
 * PV's special case (operator ruling A): the Revenue Opportunity card keeps its REGISTRY
 * grounding - config.kpiData.totalOpportunity is the summed PV_CLINICAL_GAPS dollar
 * opportunity ($8.1M), NOT a demo-model literal - so it carries a distinct "Registry" pill
 * and an honest sublabel, set apart from the demo-model cards (at-risk / captured, which
 * come from pvDemoFinancials and carry a Demo pill). Live reads are guarded (?./?? '-') so
 * a partial summary renders honest dashes, never crashes.
 */
interface KPICardDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  live: boolean;
  registryDerived?: boolean;
  trend?: number;
  trendData?: Array<{ month: string; value: number }>;
  demoValue?: string;
  demoSubtext?: string;
}

const KPI_DEFS: KPICardDef[] = [
  { id: 'total-patients', label: 'Total PV Patients', icon: Users, color: 'blue', live: true },
  { id: 'open-gaps', label: 'Open Therapy Gaps', icon: AlertCircle, color: 'red', live: true },
  { id: 'device-candidates', label: 'Device Therapy Candidates', icon: Activity, color: 'orange', live: true },
  {
    id: 'revenue-opportunity',
    label: 'Revenue Opportunity',
    icon: DollarSign,
    color: 'green',
    live: false,
    registryDerived: true,
    demoValue: peripheralVascularConfig.kpiData.totalOpportunity,
    demoSubtext: 'Registry-derived: summed PV clinical-gap opportunity',
  },
  {
    id: 'at-risk',
    label: 'At-Risk Population',
    icon: AlertCircle,
    color: 'red',
    live: false,
    demoValue: '48',
    demoSubtext: 'Immediate time horizon (demo model)',
    trend: -6,
    trendData: [
      { month: 'Jun', value: 64 },
      { month: 'Jul', value: 60 },
      { month: 'Aug', value: 56 },
      { month: 'Sep', value: 53 },
      { month: 'Oct', value: 50 },
      { month: 'Nov', value: 48 },
    ],
  },
  {
    id: 'captured-value',
    label: 'YTD Captured Value',
    icon: TrendingUp,
    color: 'copper',
    live: false,
    demoValue: `$${PV_DEMO_YTD_CAPTURED_M.toFixed(1)}M`,
    demoSubtext: '41% of opportunity (demo model)',
    trend: 8,
    trendData: [
      { month: 'Jun', value: 2.6 },
      { month: 'Jul', value: 2.8 },
      { month: 'Aug', value: 2.9 },
      { month: 'Sep', value: 3.1 },
      { month: 'Oct', value: 3.2 },
      { month: 'Nov', value: PV_DEMO_YTD_CAPTURED_M },
    ],
  },
];

interface PVExecutiveSummaryProps {
  dashboard: PVDashboardData | null;
  loading?: boolean;
  error?: string | null;
}

export const PVExecutiveSummary: React.FC<PVExecutiveSummaryProps> = ({ dashboard, loading = false, error = null }) => {
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

  // Live values from the PV dashboard contract; '-' while unavailable, never a
  // fabricated placeholder number (closes the PV-side AUDIT-099 dead-error defect).
  const liveValues = (id: string): { value: string; subtext: string } => {
    if (loading) return { value: '...', subtext: 'Loading live data' };
    if (error || !dashboard) return { value: '-', subtext: 'Live data unavailable' };
    const s = dashboard.summary;
    switch (id) {
      case 'total-patients':
        return { value: s.totalPatients?.toLocaleString() ?? '-', subtext: 'Active PAD care panel (database)' };
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
          Peripheral Vascular Executive Summary
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
                  {kpi.live ? null : kpi.registryDerived ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700">
                      <Database className="w-3 h-3" />
                      Registry
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700">
                      <Zap className="w-3 h-3" />
                      Demo
                    </span>
                  )}
                </div>
                {!kpi.live && !kpi.registryDerived && kpi.trend !== undefined && (
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

      {selectedKPI && createPortal(
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
            ) : selectedKPI.registryDerived ? (
              <div className="h-32 flex flex-col items-center justify-center text-center bg-teal-50 rounded-lg">
                <Database className="w-6 h-6 text-teal-500 mb-2" />
                <p className="text-sm text-teal-700 font-medium">Registry-derived figure</p>
                <p className="text-xs text-teal-600 mt-1 max-w-sm">
                  Summed PV clinical-gap dollar opportunity from the gap registry - not a demo-model number and
                  not measured program revenue. Trend history pending.
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
                    Illustrative demo trend from the PV demo financial model - not derived from
                    patient data. Replaced by measured history once the revenue source is wired.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      , document.body)}
    </>
  );
};

export default PVExecutiveSummary;
