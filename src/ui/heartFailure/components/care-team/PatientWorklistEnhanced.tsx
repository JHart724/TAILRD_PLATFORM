import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Filter, Heart, Search, Activity, User } from 'lucide-react';
import { getHeartFailureWorklist, type HFWorklistPatient } from '../../../../services/api';

const PatientWorklistEnhanced: React.FC = () => {
  const [patients, setPatients] = useState<HFWorklistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterGapsOnly, setFilterGapsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'gapCount' | 'riskScore' | 'age'>('gapCount');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHeartFailureWorklist()
      .then(data => { if (!cancelled) setPatients(data); })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Failed to load worklist'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = patients.filter(p => {
    if (filterRisk !== 'all' && (p.riskCategory ?? '').toLowerCase() !== filterRisk) return false;
    if (filterGapsOnly && p.gapCount === 0) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const searchable = [p.firstName, p.lastName, p.mrn, p.riskCategory ?? '', ...p.careGaps].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'gapCount') return b.gapCount - a.gapCount;
    if (sortBy === 'riskScore') return (b.riskScore ?? 0) - (a.riskScore ?? 0);
    if (sortBy === 'age') return b.age - a.age;
    return 0;
  });

  const getRiskColor = (cat: string | null) => {
    if (!cat) return 'bg-titanium-100 text-titanium-600';
    switch (cat.toUpperCase()) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-amber-600 bg-amber-100';
      case 'LOW': return 'bg-green-50 text-green-600';
      default: return 'bg-titanium-100 text-titanium-600';
    }
  };

  return (
    <div className="metal-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-titanium-900 mb-2">Patient Care Worklist</h2>
          <p className="text-titanium-600">Prioritized patient list with therapy gap summary</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-titanium-600 mb-1">Total Patients</div>
          <div className="text-3xl font-bold text-porsche-600">{patients.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 p-4 bg-titanium-50 rounded-xl border border-titanium-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-titanium-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search patients..."
              className="pl-9 pr-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-porsche-500 w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-titanium-600" />
            <span className="text-sm font-medium text-titanium-700">Filters:</span>
          </div>
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-porsche-500"
          >
            <option value="all">All Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-titanium-300 rounded-lg cursor-pointer hover:bg-titanium-50">
            <input type="checkbox" checked={filterGapsOnly} onChange={e => setFilterGapsOnly(e.target.checked)} className="rounded" />
            <span className="text-sm text-titanium-800">Gaps Only</span>
          </label>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-porsche-500"
        >
          <option value="gapCount">Sort by Gap Count</option>
          <option value="riskScore">Sort by Risk Score</option>
          <option value="age">Sort by Age</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-titanium-100 animate-pulse rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          Failed to load worklist: {error}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Heart className="w-8 h-8 mb-2 text-titanium-300" />
          <div className="text-sm font-medium">
            {patients.length === 0 ? 'No Heart Failure Patients' : 'No patients match filters'}
          </div>
          <div className="text-xs mt-1">
            {patients.length === 0 ? 'No patients with HF therapy gaps in this hospital' : 'Try adjusting your search or filter criteria'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(patient => (
            <div
              key={patient.id}
              className={`p-4 rounded-xl border border-l-4 transition-all hover:shadow-md ${
                (patient.riskCategory ?? '').toUpperCase() === 'HIGH'
                  ? 'border-l-red-400 bg-red-50/50'
                  : (patient.riskCategory ?? '').toUpperCase() === 'MEDIUM'
                  ? 'border-l-amber-400 bg-amber-50/30'
                  : 'border-l-green-400 bg-green-50/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-titanium-200">
                    <User className="w-5 h-5 text-titanium-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-titanium-900">
                      {patient.lastName}, {patient.firstName}
                    </div>
                    <div className="text-sm text-titanium-500">
                      MRN: {patient.mrn} · {patient.age}y · {patient.gender}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {patient.riskCategory && (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRiskColor(patient.riskCategory)}`}>
                      {patient.riskCategory}
                    </span>
                  )}
                  {patient.riskScore != null && (
                    <span className="text-sm font-medium text-titanium-600">
                      Score: {patient.riskScore.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Gap badges */}
              {patient.careGaps.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {patient.careGaps.map((gap, i) => (
                    <span key={i} className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {gap}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary metrics */}
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="p-2 bg-white rounded-lg border border-titanium-200 text-center">
                  <div className="text-xs text-titanium-500">Open Gaps</div>
                  <div className={`text-lg font-bold ${patient.gapCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {patient.gapCount}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-titanium-200 text-center">
                  <div className="text-xs text-titanium-500">Last Assessment</div>
                  <div className="text-sm font-medium text-titanium-700">
                    {patient.lastAssessment ? new Date(patient.lastAssessment).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-titanium-200 text-center">
                  <div className="text-xs text-titanium-500">LVEF / NYHA</div>
                  <div className="text-sm font-medium text-titanium-400">EHR data pending</div>
                </div>
              </div>

              {/* Clinical detail EHR placeholder */}
              <div className="mt-3 flex items-center justify-center py-3 bg-titanium-50 rounded-lg text-gray-400">
                <Activity className="w-4 h-4 mr-2" />
                <span className="text-xs">EHR data pending integration — vitals, labs, medications, GDMT pillar detail</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientWorklistEnhanced;
