// Backend endpoint required: GET /api/analytics/providers?module=heart-failure — see PHASE_4_BACKLOG.md Sprint C
// Blocked on FHIR Practitioner handler (no providerId in Patient/TherapyGap schema yet)
import React, { useEffect, useState } from 'react';
import { User, Award, Users, Activity } from 'lucide-react';
import { getHeartFailureDashboard, type HFDashboardData } from '../../../../services/api';

const ProviderScorecard: React.FC = () => {
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHeartFailureDashboard()
      .then(data => { if (!cancelled) setDashboard(data); })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Award className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Provider Performance Scorecard</h3>
            <p className="text-sm text-titanium-500">GDMT optimization rates by treating physician</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => <div key={i} className="h-20 bg-titanium-100 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Failed to load data: {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary from available data */}
            {dashboard && dashboard.summary.totalPatients > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                  <div className="text-2xl font-bold text-titanium-900">{dashboard.summary.totalPatients}</div>
                  <div className="text-xs text-titanium-500 mt-1">HF Patients</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-700">{dashboard.summary.gdmtOptimized}</div>
                  <div className="text-xs text-green-600 mt-1">GDMT Optimized</div>
                </div>
                <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                  <div className="text-2xl font-bold text-titanium-700">—</div>
                  <div className="text-xs text-titanium-500 mt-1">Providers Tracked</div>
                </div>
              </div>
            )}

            {/* Provider analytics — EHR integration required */}
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Users className="w-8 h-8 mb-2 text-titanium-300" />
              <div className="text-sm font-medium">EHR Integration Required</div>
              <div className="text-xs mt-1 text-center max-w-md">
                Provider-level quality scores, GDMT rates, readmission rates, and LVEF improvement
                tracking require treating physician attribution via FHIR Practitioner resource
              </div>
            </div>

            {/* Per-provider patient drill-down — EHR placeholder */}
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 bg-titanium-50 rounded-xl border border-titanium-200">
              <Activity className="w-6 h-6 mb-2 text-titanium-300" />
              <div className="text-xs text-center max-w-sm">
                Per-provider patient panels with case complexity, specialty focus, and trend analysis
                will be available after Redox EHR integration
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderScorecard;
