// Backend endpoints required for full functionality — see PHASE_4_BACKLOG.md Sprint B PR-C
// Needs: GET /api/patients/:id/observations (vitals, labs), GET /api/patients/:id/alerts
import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Activity, Heart } from 'lucide-react';
import { getHeartFailureDashboard, type HFDashboardData } from '../../../../services/api';

const RealTimeHospitalAlerts: React.FC = () => {
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

  const alertCount = dashboard?.recentAlerts?.length ?? 0;
  const criticalCount = dashboard?.recentAlerts?.filter(a => a.severity === 'high').length ?? 0;

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-titanium-900">Real-Time Hospital Alerts</h3>
              <p className="text-sm text-titanium-500">Heart failure clinical alerts from gap engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {alertCount} active
              </span>
            )}
            {criticalCount > 0 && (
              <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">
                {criticalCount} high
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => <div key={i} className="h-24 bg-titanium-100 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Failed to load alerts: {error}
          </div>
        ) : dashboard && dashboard.recentAlerts.length > 0 ? (
          <div className="space-y-4">
            {dashboard.recentAlerts.map(alert => (
              <div
                key={alert.gapId}
                className={`p-4 rounded-xl border ${
                  alert.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-chrome-50 border-titanium-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className="font-medium text-titanium-900 text-sm">{alert.message}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-titanium-500">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  <span>{new Date(alert.identifiedAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-xs text-titanium-600">
                  {alert.currentStatus} → {alert.targetStatus}
                </div>

                {/* Vitals, labs, medications require EHR integration */}
                <div className="mt-3 flex flex-col items-center justify-center h-20 bg-titanium-50 rounded-lg text-gray-400">
                  <div className="text-sm font-medium">EHR Integration Required</div>
                  <div className="text-xs mt-1">Vitals, labs, and medications require live EHR data via Redox</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Heart className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">No Active Alerts</div>
            <div className="text-xs mt-1">No unresolved Heart Failure therapy gaps detected</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeHospitalAlerts;
