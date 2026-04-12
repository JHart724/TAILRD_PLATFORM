import React, { useEffect, useState } from 'react';
import { Heart, Zap, Activity, AlertTriangle, Users } from 'lucide-react';
import { getHeartFailureDashboard, getHeartFailureWorklist, type HFDashboardData, type HFWorklistPatient } from '../../../../services/api';

const DevicePathwayFunnel: React.FC = () => {
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [patients, setPatients] = useState<HFWorklistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPatients, setShowPatients] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getHeartFailureDashboard(), getHeartFailureWorklist()])
      .then(([dash, pts]) => {
        if (!cancelled) { setDashboard(dash); setPatients(pts); }
      })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const deviceCandidates = dashboard?.summary?.deviceCandidates ?? 0;
  const deviceEligibleGaps = dashboard?.summary?.gapsByType?.['DEVICE_ELIGIBLE'] ?? 0;
  const devicePatients = patients.filter(p =>
    p.careGaps.some(g => /device|crt|icd|cardiomems|lvad|implant/i.test(g))
  );

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-titanium-900">Device Pathway Funnel</h3>
              <p className="text-sm text-titanium-500">CRT-D, CRT-P, ICD, CardioMEMS device analytics</p>
            </div>
          </div>
          {deviceCandidates > 0 && (
            <span className="px-2.5 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
              {deviceCandidates} candidates
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-titanium-100 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Failed to load device analytics: {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards from available data */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-teal-700">{deviceCandidates}</div>
                <div className="text-xs text-teal-600 mt-1">Device Candidates</div>
              </div>
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-900">{deviceEligibleGaps}</div>
                <div className="text-xs text-titanium-500 mt-1">Device-Eligible Gaps</div>
              </div>
              <div
                className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowPatients(!showPatients)}
              >
                <div className="text-2xl font-bold text-titanium-900">{devicePatients.length}</div>
                <div className="text-xs text-titanium-500 mt-1">
                  {showPatients ? 'Hide patients ▲' : 'Patients with device gaps ▼'}
                </div>
              </div>
            </div>

            {/* Patient drill-down from worklist */}
            {showPatients && devicePatients.length > 0 && (
              <div className="bg-white border border-titanium-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-titanium-700 mb-3">Patients with Device-Related Gaps</h4>
                <div className="space-y-2">
                  {devicePatients.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-titanium-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-titanium-800">{p.lastName}, {p.firstName}</span>
                        <span className="text-xs text-titanium-500 ml-2">MRN: {p.mrn} · {p.age}y</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.careGaps.filter(g => /device|crt|icd|cardiomems|lvad|implant/i.test(g)).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">{g}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {devicePatients.length > 10 && (
                    <div className="text-xs text-titanium-500 text-center">+ {devicePatients.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {showPatients && devicePatients.length === 0 && (
              <div className="p-4 bg-titanium-50 rounded-xl text-titanium-500 text-sm text-center">
                No patients with device-related gap keywords in current worklist
              </div>
            )}

            {/* Device funnel visualization — EHR placeholder */}
            <div>
              <h4 className="text-sm font-semibold text-titanium-700 uppercase tracking-wider mb-3">Device Funnel Stages</h4>
              <div className="grid grid-cols-2 gap-4">
                {['CRT-D', 'CRT-P', 'ICD', 'CardioMEMS'].map(device => (
                  <div key={device} className="flex flex-col items-center justify-center h-36 text-gray-400 bg-titanium-50 rounded-xl border border-titanium-200">
                    <Heart className="w-6 h-6 mb-2 text-titanium-300" />
                    <div className="text-sm font-medium">{device}</div>
                    <div className="text-xs mt-1 text-center px-4">
                      EHR Integration Required — screening → evaluation → decision → implant funnel
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-patient clinical detail — EHR placeholder */}
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 bg-titanium-50 rounded-xl border border-titanium-200">
              <Activity className="w-6 h-6 mb-2 text-titanium-300" />
              <div className="text-xs text-center max-w-sm">
                Per-patient EF, QRS duration, device type classification, and funnel conversion rates
                require FHIR Observation and Procedure data via Redox integration
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevicePathwayFunnel;
