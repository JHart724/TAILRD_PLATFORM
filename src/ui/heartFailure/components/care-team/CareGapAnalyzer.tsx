import React, { useEffect, useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, Users, Activity, Heart } from 'lucide-react';
import { getHeartFailureDashboard, getHeartFailureWorklist, type HFDashboardData, type HFWorklistPatient } from '../../../../services/api';

interface GapCategory {
  type: string;
  label: string;
  count: number;
  impact: 'high' | 'medium' | 'low';
}

const CareGapAnalyzer: React.FC = () => {
  const [dashboard, setDashboard] = useState<HFDashboardData | null>(null);
  const [patients, setPatients] = useState<HFWorklistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGapType, setSelectedGapType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getHeartFailureDashboard(), getHeartFailureWorklist()])
      .then(([dash, pts]) => {
        if (!cancelled) {
          setDashboard(dash);
          setPatients(pts);
        }
      })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const gapCategories: GapCategory[] = dashboard
    ? Object.entries(dashboard.summary.gapsByType)
        .map(([type, count]) => ({
          type,
          label: type.replace(/_/g, ' '),
          count,
          impact: count >= 20 ? 'high' : count >= 10 ? 'medium' : 'low',
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const totalGaps = dashboard?.summary?.totalOpenGaps ?? 0;
  const totalPatients = dashboard?.summary?.totalPatients ?? 0;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-amber-200 bg-amber-50';
      default: return 'border-titanium-200 bg-titanium-50';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      default: return 'bg-titanium-100 text-titanium-600';
    }
  };

  const patientsForGap = selectedGapType
    ? patients.filter(p => p.careGaps.some(g => g.toLowerCase().includes(selectedGapType.toLowerCase().replace(/_/g, ' ').slice(0, 10))))
    : [];

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-titanium-900">Care Gap Analyzer</h3>
              <p className="text-sm text-titanium-500">Therapy gap breakdown and patient impact</p>
            </div>
          </div>
          {totalGaps > 0 && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              {totalGaps} open gaps
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
            Failed to load gap analysis: {error}
          </div>
        ) : gapCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Heart className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">No Open Care Gaps</div>
            <div className="text-xs mt-1">All therapy gaps have been resolved</div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-900">{gapCategories.length}</div>
                <div className="text-xs text-titanium-500 mt-1">Gap Types</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-600">
                  {gapCategories.filter(g => g.impact === 'high').length}
                </div>
                <div className="text-xs text-red-500 mt-1">High Impact</div>
              </div>
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-900">{totalGaps}</div>
                <div className="text-xs text-titanium-500 mt-1">Total Gaps</div>
              </div>
              <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-titanium-900">{totalPatients}</div>
                <div className="text-xs text-titanium-500 mt-1">HF Patients</div>
              </div>
            </div>

            {/* Gap category cards */}
            <div className="space-y-3">
              {gapCategories.map(gap => (
                <div
                  key={gap.type}
                  onClick={() => setSelectedGapType(selectedGapType === gap.type ? null : gap.type)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${getImpactColor(gap.impact)} ${
                    selectedGapType === gap.type ? 'ring-2 ring-porsche-400 ring-offset-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${gap.impact === 'high' ? 'text-red-500' : gap.impact === 'medium' ? 'text-amber-500' : 'text-titanium-400'}`} />
                      <div>
                        <div className="font-semibold text-titanium-900">{gap.label}</div>
                        <div className="text-sm text-titanium-500">{gap.count} gap{gap.count !== 1 ? 's' : ''} detected</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getImpactBadge(gap.impact)}`}>
                        {gap.impact}
                      </span>
                      <span className="text-2xl font-bold text-titanium-900">{gap.count}</span>
                    </div>
                  </div>

                  {selectedGapType === gap.type && (
                    <div className="mt-4 pt-4 border-t border-titanium-200">
                      {patientsForGap.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-titanium-700 mb-2">
                            Affected patients ({patientsForGap.length}):
                          </div>
                          {patientsForGap.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-titanium-100">
                              <span className="text-sm text-titanium-800">{p.lastName}, {p.firstName}</span>
                              <span className="text-xs text-titanium-500">MRN: {p.mrn} · {p.gapCount} gaps</span>
                            </div>
                          ))}
                          {patientsForGap.length > 5 && (
                            <div className="text-xs text-titanium-500 text-center mt-1">
                              + {patientsForGap.length - 5} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-titanium-500 text-center py-2">
                          Patient-level detail requires gap-to-patient mapping (use Clinical Gaps tab for full drill-down)
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-center py-3 bg-titanium-50 rounded-lg text-gray-400">
                        <Activity className="w-4 h-4 mr-2" />
                        <span className="text-xs">EHR data pending integration — cost savings, closure time, compliance rate</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CareGapAnalyzer;
