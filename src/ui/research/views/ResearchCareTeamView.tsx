import React, { useState, useMemo } from 'react';
import { FileText, Beaker, AlertTriangle, Clock, CheckCircle, Filter, Users } from 'lucide-react';

// ── Registry Abstraction Queue Data ─────────────────────────────────────────

const registryCases = [
  { name: 'Williams, James', registry: 'CathPCI', date: '2026-03-13', completeness: 56, flags: 6, deadline: 3, assignee: 'J. Park', status: 'Needs Review' },
  { name: 'Wilson, Thomas', registry: 'CathPCI', date: '2026-03-10', completeness: 43, flags: 8, deadline: 1, assignee: 'J. Park', status: 'Needs Review' },
  { name: 'Brown, Michael', registry: 'CathPCI', date: '2026-03-12', completeness: 67, flags: 4, deadline: 5, assignee: 'S. Kim', status: 'In Review' },
  { name: 'Chen, William', registry: 'CathPCI', date: '2026-03-14', completeness: 74, flags: 3, deadline: 7, assignee: 'S. Kim', status: 'In Review' },
  { name: 'Harper, Daniel', registry: 'TVT', date: '2026-03-11', completeness: 62, flags: 5, deadline: 2, assignee: 'M. Chen', status: 'Needs Review' },
  { name: 'Foster, Grace', registry: 'TVT', date: '2026-03-09', completeness: 78, flags: 2, deadline: 4, assignee: 'M. Chen', status: 'In Review' },
  { name: 'Rivera, Carlos', registry: 'TVT', date: '2026-03-08', completeness: 51, flags: 7, deadline: 1, assignee: 'M. Chen', status: 'Needs Review' },
  { name: 'Patel, Anish', registry: 'ICD', date: '2026-03-12', completeness: 83, flags: 1, deadline: 8, assignee: 'R. Torres', status: 'Ready' },
  { name: "O'Brien, Sean", registry: 'ICD', date: '2026-03-10', completeness: 71, flags: 3, deadline: 5, assignee: 'R. Torres', status: 'In Review' },
  { name: 'Nakamura, Yuki', registry: 'ICD', date: '2026-03-09', completeness: 45, flags: 6, deadline: 2, assignee: 'R. Torres', status: 'Needs Review' },
  { name: 'Adams, Sharon', registry: 'GWTG-HF', date: '2026-03-14', completeness: 87, flags: 1, deadline: 10, assignee: 'L. Wang', status: 'Ready' },
  { name: 'Morris, David', registry: 'GWTG-HF', date: '2026-03-13', completeness: 92, flags: 0, deadline: 9, assignee: 'L. Wang', status: 'Approved' },
  { name: 'Clark, Jennifer', registry: 'GWTG-HF', date: '2026-03-12', completeness: 58, flags: 5, deadline: 3, assignee: 'L. Wang', status: 'Needs Review' },
  { name: 'Turner, Robert', registry: 'GWTG-HF', date: '2026-03-11', completeness: 76, flags: 2, deadline: 6, assignee: 'L. Wang', status: 'In Review' },
  { name: 'Scott, Amanda', registry: 'GWTG-HF', date: '2026-03-10', completeness: 81, flags: 2, deadline: 4, assignee: 'L. Wang', status: 'In Review' },
];

type RegistryFilter = 'All' | 'Needs Review' | 'Ready to Submit' | 'Submitted';

// ── Trial Eligibility Queue Data ────────────────────────────────────────────

type TrialStatus = 'New' | 'In Review' | 'Referred' | 'Enrolled' | 'Screen Failed';
type SponsorType = 'industry' | 'nih' | 'investigator';
type ConfidenceLevel = 'High' | 'Moderate' | 'Review';

interface TrialRow {
  name: string;
  trial: string;
  sponsorType: SponsorType;
  confidence: ConfidenceLevel;
  criteria: string;
  status: TrialStatus;
}

const trialQueue: TrialRow[] = [
  { name: 'Harold Simmons', trial: 'HELIOS-B Extension', sponsorType: 'industry', confidence: 'High', criteria: 'ATTR-CM confirmed \u00b7 NYHA II \u00b7 LVEF 55%', status: 'New' as const },
  { name: 'Ruth Caldwell', trial: 'HELIOS-B Extension', sponsorType: 'industry', confidence: 'High', criteria: 'ATTR-CM confirmed \u00b7 NYHA II \u00b7 LVEF 48%', status: 'New' as const },
  { name: 'Margaret Torres', trial: 'STEP-HFpEF Registry', sponsorType: 'industry', confidence: 'Moderate', criteria: 'HFpEF \u00b7 BMI 34 \u00b7 NYHA II', status: 'In Review' as const },
  { name: 'Walter Chen', trial: 'HEART-FID', sponsorType: 'nih', confidence: 'High', criteria: 'HFrEF \u00b7 Ferritin 45 \u00b7 TSAT 15% \u00b7 NYHA III', status: 'Referred' as const },
  { name: 'Patricia Okafor', trial: 'OCEAN(a) -- Olpasiran', sponsorType: 'industry', confidence: 'Moderate', criteria: 'ASCVD \u00b7 Lp(a) 289 \u00b7 On rosuvastatin 40mg', status: 'New' as const },
  { name: 'James Kowalski', trial: 'FINEARTS-HF Extension', sponsorType: 'industry', confidence: 'High', criteria: 'HFpEF \u00b7 LVEF 52% \u00b7 eGFR 48 \u00b7 K+ 4.2', status: 'In Review' as const },
  { name: 'Elena Vasquez', trial: 'GUIDE-HF 2', sponsorType: 'industry', confidence: 'High', criteria: 'NYHA III \u00b7 HF hosp 2mo ago \u00b7 LVEF 28%', status: 'Referred' as const },
  { name: 'Thomas Wright', trial: 'ORION-4 -- Inclisiran', sponsorType: 'industry', confidence: 'Moderate', criteria: 'ASCVD \u00b7 LDL 92 \u00b7 On atorva 80mg \u00b7 Age 62', status: 'New' as const },
  { name: 'David Kim', trial: 'MANIFEST-PF Registry', sponsorType: 'industry', confidence: 'High', criteria: 'Prior ablation 18mo \u00b7 AF recurrence \u00b7 LVEF 45%', status: 'New' as const },
  { name: 'Sandra Oyelaran', trial: 'DECISION-CTO 2', sponsorType: 'investigator', confidence: 'Moderate', criteria: 'CTO LAD \u00b7 CCS II \u00b7 On max meds', status: 'In Review' as const },
];

type TrialFilter = 'All' | 'New' | 'Industry Sponsored' | 'Referred' | 'Enrolled';

// ── Helpers ─────────────────────────────────────────────────────────────────

function completenessColor(pct: number): string {
  if (pct >= 85) return 'text-teal-700 bg-chrome-50';
  if (pct >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function registryStatusChip(status: string) {
  const map: Record<string, string> = {
    'Needs Review': 'bg-red-50 text-red-700 border border-red-200',
    'In Review': 'bg-amber-50 text-amber-600 border border-titanium-300',
    'Ready': 'bg-chrome-50 text-teal-700 border border-titanium-300',
    'Approved': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Submitted': 'bg-titanium-100 text-titanium-600 border border-titanium-200',
  };
  return map[status] || 'bg-titanium-50 text-titanium-600';
}

function trialStatusChip(status: TrialStatus): string {
  const map: Record<TrialStatus, string> = {
    'New': 'bg-blue-50 text-blue-700 border border-blue-200',
    'In Review': 'bg-amber-50 text-amber-600 border border-titanium-300',
    'Referred': 'bg-chrome-50 text-teal-700 border border-titanium-300',
    'Enrolled': 'bg-chrome-50 text-teal-700 border border-titanium-300',
    'Screen Failed': 'bg-red-50 text-red-700 border border-red-200',
  };
  return map[status];
}

function confidenceBadge(level: 'High' | 'Moderate' | 'Review'): string {
  const map = {
    High: 'bg-chrome-50 text-teal-700 border border-titanium-300',
    Moderate: 'bg-amber-50 text-amber-600 border border-titanium-300',
    Review: 'bg-red-50 text-red-700 border border-red-200',
  };
  return map[level];
}

// ── Component ───────────────────────────────────────────────────────────────

const ResearchCareTeamView: React.FC = () => {
  const [registryFilter, setRegistryFilter] = useState<RegistryFilter>('All');
  const [trialFilter, setTrialFilter] = useState<TrialFilter>('All');

  // Registry filtering + sorting (flagged first, then deadline ascending)
  const filteredRegistry = useMemo(() => {
    let rows = [...registryCases];

    if (registryFilter === 'Needs Review') rows = rows.filter(r => r.status === 'Needs Review');
    else if (registryFilter === 'Ready to Submit') rows = rows.filter(r => r.status === 'Ready' || r.status === 'Approved');
    else if (registryFilter === 'Submitted') rows = rows.filter(r => r.status === 'Submitted');

    rows.sort((a, b) => {
      // Flagged (flags > 0) first
      if (a.flags > 0 && b.flags === 0) return -1;
      if (a.flags === 0 && b.flags > 0) return 1;
      // Then by deadline ascending
      return a.deadline - b.deadline;
    });
    return rows;
  }, [registryFilter]);

  // Trial filtering
  const filteredTrials = useMemo(() => {
    if (trialFilter === 'All') return trialQueue;
    if (trialFilter === 'New') return trialQueue.filter(t => t.status === 'New');
    if (trialFilter === 'Industry Sponsored') return trialQueue.filter(t => t.sponsorType === 'industry');
    if (trialFilter === 'Referred') return trialQueue.filter(t => t.status === 'Referred');
    if (trialFilter === 'Enrolled') return trialQueue.filter(t => t.status === 'Enrolled');
    return trialQueue;
  }, [trialFilter]);

  const registryFilters: RegistryFilter[] = ['All', 'Needs Review', 'Ready to Submit', 'Submitted'];
  const trialFilters: TrialFilter[] = ['All', 'New', 'Industry Sponsored', 'Referred', 'Enrolled'];

  return (
    <div className="space-y-8">
      {/* ── Section 1: Registry Abstraction Queue ─────────────────────────── */}
      <div className="bg-white border border-titanium-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-titanium-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-titanium-100">
              <FileText className="w-5 h-5 text-titanium-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-titanium-900">Registry Abstraction Queue</h2>
              <p className="text-sm text-titanium-500">{filteredRegistry.length} cases across 4 registries</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-titanium-400 mr-1" />
            {registryFilters.map(f => (
              <button
                key={f}
                onClick={() => setRegistryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  registryFilter === f
                    ? 'bg-titanium-800 text-white shadow-sm'
                    : 'bg-titanium-50 text-titanium-600 hover:bg-titanium-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-titanium-50 text-titanium-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Patient</th>
                <th className="text-left px-4 py-3 font-semibold">Registry</th>
                <th className="text-left px-4 py-3 font-semibold">Procedure Date</th>
                <th className="text-center px-4 py-3 font-semibold">Completeness</th>
                <th className="text-center px-4 py-3 font-semibold">Flags</th>
                <th className="text-center px-4 py-3 font-semibold">Days to Deadline</th>
                <th className="text-left px-4 py-3 font-semibold">Assigned</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium-100">
              {filteredRegistry.map((row, i) => (
                <tr key={`${row.name}-${i}`} className="hover:bg-titanium-25 transition-colors">
                  <td className="px-5 py-3 font-medium text-titanium-900 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-titanium-100 text-titanium-700 text-xs font-medium">
                      {row.registry}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-titanium-600 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${completenessColor(row.completeness)}`}>
                      {row.completeness}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.flags > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {row.flags}
                      </span>
                    ) : (
                      <span className="text-xs text-titanium-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      row.deadline <= 2 ? 'text-red-600' : row.deadline <= 5 ? 'text-gray-500' : 'text-titanium-600'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {row.deadline}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-titanium-700 whitespace-nowrap">{row.assignee}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${registryStatusChip(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRegistry.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-titanium-400 text-sm">
                    No cases match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Trial Eligibility Queue ────────────────────────────── */}
      <div className="bg-white border border-titanium-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-titanium-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Beaker className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-titanium-900">Trial Eligibility -- Pending Review</h2>
              <p className="text-sm text-titanium-500">{filteredTrials.length} patients matched to active trials</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-titanium-400 mr-1" />
            {trialFilters.map(f => (
              <button
                key={f}
                onClick={() => setTrialFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  trialFilter === f
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-titanium-50 text-titanium-600 hover:bg-titanium-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-titanium-50 text-titanium-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Patient</th>
                <th className="text-left px-4 py-3 font-semibold">Trial Name</th>
                <th className="text-center px-4 py-3 font-semibold">Sponsor</th>
                <th className="text-center px-4 py-3 font-semibold">Match Confidence</th>
                <th className="text-left px-4 py-3 font-semibold">Qualifying Criteria</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium-100">
              {filteredTrials.map((row, i) => (
                <tr
                  key={`${row.name}-${i}`}
                  className={`hover:bg-titanium-25 transition-colors ${
                    row.sponsorType === 'industry' ? 'border-l-4 border-l-[#6B7280]' : ''
                  }`}
                >
                  <td className="px-5 py-3 font-medium text-titanium-900 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 text-titanium-800 font-medium">{row.trial}</td>
                  <td className="px-4 py-3 text-center">
                    {row.sponsorType === 'industry' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-titanium-300">
                        Industry
                      </span>
                    ) : row.sponsorType === 'nih' ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                        NIH
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-titanium-50 text-titanium-600 border border-titanium-200">
                        Investigator
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${confidenceBadge(row.confidence)}`}>
                      {row.confidence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-titanium-600 text-xs max-w-xs">
                    <span className="font-mono">{row.criteria}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${trialStatusChip(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTrials.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-titanium-400 text-sm">
                    No patients match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResearchCareTeamView;
