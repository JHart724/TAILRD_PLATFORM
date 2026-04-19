import React, { useEffect, useState } from 'react';
import { Users, AlertTriangle, ClipboardList } from 'lucide-react';
import { useModuleDashboard } from '../../hooks/useModuleDashboard';
import { apiFetch } from '../../services/api';

interface ServiceLineKPIBannerProps {
  moduleSlug: string;
  moduleLabel: string;
}

const ServiceLineKPIBanner: React.FC<ServiceLineKPIBannerProps> = ({
  moduleSlug,
  moduleLabel,
}) => {
  const { data: dashboard, loading: dashboardLoading } = useModuleDashboard(moduleSlug);
  const [rosterCount, setRosterCount] = useState<number | null>(null);
  const [rosterLoading, setRosterLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRosterLoading(true);
    apiFetch(`/modules/${moduleSlug}/patients?limit=500`)
      .then((resp: any) => {
        if (cancelled) return;
        const n =
          typeof resp?.count === 'number'
            ? resp.count
            : Array.isArray(resp?.data)
            ? resp.data.length
            : null;
        setRosterCount(n);
      })
      .catch(() => {
        // Silent fallback — keep rosterCount null, banner shows "Demo Data"
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleSlug]);

  const totalPatients: number | undefined = dashboard?.data?.summary?.totalPatients;
  const totalOpenGaps: number | undefined = dashboard?.data?.summary?.totalOpenGaps;
  const isLoading = dashboardLoading || rosterLoading;
  const hasLiveData =
    typeof totalPatients === 'number' ||
    typeof totalOpenGaps === 'number' ||
    typeof rosterCount === 'number';

  const dash = '—';
  const patientsDisplay =
    typeof totalPatients === 'number' ? totalPatients.toLocaleString() : dash;
  const gapsDisplay =
    typeof totalOpenGaps === 'number' ? totalOpenGaps.toLocaleString() : dash;
  const rosterDisplay =
    typeof rosterCount === 'number' ? rosterCount.toLocaleString() : dash;

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-titanium-600">
          {moduleLabel} — Live Service Line Metrics
        </h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isLoading
              ? 'bg-slate-100 text-slate-600 animate-pulse'
              : hasLiveData
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isLoading ? 'Loading...' : hasLiveData ? 'Live Data' : 'Demo Data'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Total Patients
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{patientsDisplay}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Open Gaps
            </span>
          </div>
          <div className="text-2xl font-bold text-red-800">{gapsDisplay}</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
              Patient Roster
            </span>
          </div>
          <div className="text-2xl font-bold text-teal-700">{rosterDisplay}</div>
        </div>
      </div>
    </div>
  );
};

export default ServiceLineKPIBanner;
