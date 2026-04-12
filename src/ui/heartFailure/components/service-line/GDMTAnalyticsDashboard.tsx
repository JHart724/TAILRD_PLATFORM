import React, { useEffect, useState } from 'react';
import { Pill, Target, Heart, TrendingUp, AlertTriangle, Activity, Users } from 'lucide-react';
import { getHeartFailureDashboard, getHeartFailureWorklist, type HFDashboardData, type HFWorklistPatient } from '../../../../services/api';

const GDMTAnalyticsDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [patients, setPatients] = useState<HFWorklistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

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

  const pillars = dashboard ? [
    { key: 'aceArb', label: 'ACE/ARB/ARNI', icon: Pill, metric: dashboard.gdmtMetrics.aceArb },
    { key: 'betaBlocker', label: 'Beta Blocker', icon: Heart, metric: dashboard.gdmtMetrics.betaBlocker },
    { key: 'mra', label: 'MRA', icon: Target, metric: dashboard.gdmtMetrics.mra },
    { key: 'sglt2i', label: 'SGLT2i', icon: TrendingUp, metric: dashboard.gdmtMetrics.sglt2i },
  ] : [];

  const statusColor = (s: string) => {
    if (s === 'green') return 'bg-green-50 border-green-200 text-green-700';
    if (s === 'amber') return 'bg-amber-50 border-amber-200 text-amber-700';
    if (s === 'red') return 'bg-red-50 border-red-200 text-red-700';
    return 'bg-titanium-50 border-titanium-200 text-titanium-600';
  };

  const statusDot = (s: string) => {
    if (s === 'green') return 'bg-green-500';
    if (s === 'amber') return 'bg-amber-500';
    if (s === 'red') return 'bg-red-500';
    return 'bg-titanium-400';
  };

  const patientsWithGap = (pillarKey: string) => {
    const keywords: Record<string, string[]> = {
      aceArb: ['ace', 'arb', 'arni', 'sacubitril', 'valsartan', 'lisinopril', 'enalapril', 'losartan'],
      betaBlocker: ['beta blocker', 'bisoprolol', 'carvedilol', 'metoprolol'],
      mra: ['mra', 'spironolactone', 'eplerenone', 'mineralocorticoid'],
      sglt2i: ['sglt2', 'dapagliflozin', 'empagliflozin', 'canagliflozin'],
    };
    const kws = keywords[pillarKey] ?? [];
    return patients.filter(p =>
      p.careGaps.some(g => kws.some(kw => g.toLowerCase().includes(kw)))
    );
  };

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-porsche-50 rounded-lg">
              <Pill className="w-5 h-5 text-porsche-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-titanium-900">GDMT Analytics Dashboard</h3>
              <p className="text-sm text-titanium-500">4-pillar guideline-directed medical therapy coverage</p>
            </div>
          </div>
          {dashboard && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Live Data
              </span>
              <span className="text-xs text-titanium-400">
                {dashboard.summary.totalPatients} HF patients
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-titanium-100 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Failed to load GDMT analytics: {error}
          </div>
        ) : !dashboard || dashboard.summary.totalPatients === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Pill className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">No Heart Failure Patients</div>
            <div className="text-xs mt-1">GDMT analytics require patients with HF therapy gaps</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-900">{dashboard.summary.totalPatients}</div>
                <div className="text-xs text-titanium-500 mt-1">HF Patients</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-700">{dashboard.summary.gdmtOptimized}</div>
                <div className="text-xs text-green-600 mt-1">GDMT Optimized</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-600">{dashboard.summary.gapsByType['MEDICATION_MISSING'] ?? 0}</div>
                <div className="text-xs text-red-500 mt-1">Medication Gaps</div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-700">{dashboard.summary.deviceCandidates}</div>
                <div className="text-xs text-amber-600 mt-1">Device Candidates</div>
              </div>
            </div>

            {/* 4-Pillar Coverage Cards */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-titanium-700 uppercase tracking-wider">Pillar Coverage</h4>
              {pillars.map(({ key, label, icon: Icon, metric }) => {
                const affected = patientsWithGap(key);
                return (
                  <div key={key}>
                    <div
                      onClick={() => setExpandedPillar(expandedPillar === key ? null : key)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusColor(metric.status)} ${
                        expandedPillar === key ? 'ring-2 ring-porsche-400 ring-offset-1' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusDot(metric.status)}`} />
                          <Icon className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">{label}</div>
                            <div className="text-sm opacity-80">
                              {metric.missingCount} patient{metric.missingCount !== 1 ? 's' : ''} missing · target ≥{metric.target}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">
                            {metric.current !== null ? `${metric.current.toFixed(1)}%` : '—'}
                          </div>
                          <div className="text-xs opacity-70">coverage</div>
                        </div>
                      </div>
                    </div>

                    {expandedPillar === key && (
                      <div className="mt-2 p-4 bg-white border border-titanium-200 rounded-xl">
                        {affected.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-titanium-700 mb-2">
                              Patients missing {label} ({affected.length}):
                            </div>
                            {affected.slice(0, 8).map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 bg-titanium-50 rounded-lg">
                                <span className="text-sm text-titanium-800">{p.lastName}, {p.firstName}</span>
                                <div className="flex items-center gap-3 text-xs text-titanium-500">
                                  <span>MRN: {p.mrn}</span>
                                  <span>{p.age}y</span>
                                  <span className={`px-1.5 py-0.5 rounded-full ${
                                    (p.riskCategory ?? '').toUpperCase() === 'HIGH' ? 'bg-red-100 text-red-700' :
                                    (p.riskCategory ?? '').toUpperCase() === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-50 text-green-600'
                                  }`}>{p.riskCategory ?? '—'}</span>
                                </div>
                              </div>
                            ))}
                            {affected.length > 8 && (
                              <div className="text-xs text-titanium-500 text-center">+ {affected.length - 8} more</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-titanium-500 text-center py-2">
                            No patients with matching gap keywords found in worklist
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-center py-3 bg-titanium-50 rounded-lg text-gray-400">
                          <Activity className="w-4 h-4 mr-2" />
                          <span className="text-xs">EHR data pending integration — per-patient LVEF, NYHA class, dose titration history</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Provider Performance — EHR placeholder */}
            <div>
              <h4 className="text-sm font-semibold text-titanium-700 uppercase tracking-wider mb-3">Provider Performance</h4>
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-titanium-50 rounded-xl border border-titanium-200">
                <Users className="w-8 h-8 mb-2 text-titanium-300" />
                <div className="text-sm font-medium">EHR Integration Required</div>
                <div className="text-xs mt-1">Provider-level GDMT scoring requires treating physician data via Redox integration</div>
              </div>
            </div>

            {/* HF Phenotype Breakdown — EHR placeholder */}
            <div>
              <h4 className="text-sm font-semibold text-titanium-700 uppercase tracking-wider mb-3">HF Phenotype Breakdown (HFrEF / HFpEF / HFmrEF)</h4>
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-titanium-50 rounded-xl border border-titanium-200">
                <Heart className="w-8 h-8 mb-2 text-titanium-300" />
                <div className="text-sm font-medium">EHR Integration Required</div>
                <div className="text-xs mt-1">Phenotype classification by NYHA class requires LVEF and diagnosis data via Redox</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GDMTAnalyticsDashboard;
