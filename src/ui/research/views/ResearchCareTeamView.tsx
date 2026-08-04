import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, Beaker, AlertTriangle, Clock, CheckCircle, Filter, Users, HelpCircle, XCircle, RefreshCw } from 'lucide-react';
import { getTrials, getTrialEligiblePatients } from '../../../services/api';
import { TrialAsOfIndicator } from '../components/TrialAsOfIndicator';
import type { Trial, TrialMatchCandidate, TrialMatchStatus, TrialAsOf } from '../../../services/api';

// -- Registry Abstraction Queue Data -----------------------------------------
//
// STILL MOCK (AUDIT-148 Slice 1 wires the TRIAL section only). The registry backend exists
// (GET /registry/:registryType/cases + the maker-checker write endpoints) and api.ts now carries the
// full contract, but this section is NOT wired and the rows below are illustrative, not real.

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

// -- Trial Eligibility (REAL DATA - AUDIT-148 honest matcher) ----------------
//
// Wired to GET /trials + GET /trials/:trialId/eligible-patients. The endpoint returns ALL THREE match
// states and this view renders all three: filtering INDETERMINATE out of the UI would silently undo the
// matcher's central honesty property. INDETERMINATE means "one signal away", not "no" - it is the
// actionable worklist, so it is shown with the missing signals named per patient.

type TrialFilter = 'All' | TrialMatchStatus;

// -- Helpers -----------------------------------------------------------------

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

/** Match-status chip. INDETERMINATE is styled as a NEUTRAL unknown, never as a soft negative. */
function matchStatusChip(status: TrialMatchStatus): string {
  const map: Record<TrialMatchStatus, string> = {
    ELIGIBLE: 'bg-chrome-50 text-teal-700 border border-titanium-300',
    INDETERMINATE: 'bg-blue-50 text-blue-700 border border-blue-200',
    INELIGIBLE: 'bg-titanium-50 text-titanium-600 border border-titanium-300',
  };
  return map[status];
}

function MatchStatusIcon({ status }: { status: TrialMatchStatus }) {
  if (status === 'ELIGIBLE') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'INDETERMINATE') return <HelpCircle className="w-3.5 h-3.5" />;
  return <XCircle className="w-3.5 h-3.5" />;
}

/** Per-criterion verdict pill. UNEVALUABLE reads as unknown, not as a failure. */
function verdictPill(verdict: 'MET' | 'FAILED' | 'UNEVALUABLE'): string {
  const map = {
    MET: 'bg-chrome-50 text-teal-700 border border-titanium-300',
    FAILED: 'bg-titanium-50 text-titanium-600 border border-titanium-300',
    UNEVALUABLE: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return map[verdict];
}

// -- Component ---------------------------------------------------------------

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

  // -- Trial eligibility: REAL data (AUDIT-148) ------------------------------
  const [trials, setTrials] = useState<Trial[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TrialMatchCandidate[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  // AUDIT-227 paging state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // TRIALS PR 3: the page is a read of PERSISTED verdicts, so it carries an as-of. Captured from the
  // FIRST page only - later pages describe the same run, and re-setting it on each 'Load more' would
  // make the indicator flicker without ever saying anything different.
  const [asOf, setAsOf] = useState<TrialAsOf | null>(null);

  const loadTrials = useCallback(async () => {
    setTrialsLoading(true);
    setTrialError(null);
    try {
      const list = await getTrials();
      setTrials(list);
      setSelectedTrialId(prev => prev ?? (list.length > 0 ? list[0].id : null));
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : 'Could not load trials');
    } finally {
      setTrialsLoading(false);
    }
  }, []);

  useEffect(() => { void loadTrials(); }, [loadTrials]);

  // AUDIT-227: the endpoint is PAGED. The view renders INCREMENTALLY (accumulate + "Load more") rather
  // than auto-walking every page: auto-walking would re-create the unbounded read one request at a time
  // and stall a coordinator behind ~256 round trips on this tenant. A coordinator works the top of a
  // worklist, so first-page-fast with explicit continuation is both cheaper and the honest interaction.
  // Tenant-wide totals come from getTrialsSummary(), never from summing the pages on screen.
  const loadCandidatePage = useCallback(async (trialId: string, cursor: string | null) => {
    const page = await getTrialEligiblePatients(trialId, { cursor });
    setCandidates(prev => (cursor ? [...prev, ...page.patients] : page.patients));
    setNextCursor(page.nextCursor);
    setHasMore(page.hasMore);
  }, []);

  useEffect(() => {
    if (!selectedTrialId) { setCandidates([]); setNextCursor(null); setHasMore(false); setAsOf(null); return; }
    let cancelled = false;
    setCandidatesLoading(true);
    setTrialError(null);
    setCandidates([]);
    getTrialEligiblePatients(selectedTrialId, { cursor: null })
      .then(page => {
        if (cancelled) return;
        setCandidates(page.patients);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setAsOf(page.asOf);
      })
      .catch(e => { if (!cancelled) setTrialError(e instanceof Error ? e.message : 'Could not evaluate eligibility'); })
      .finally(() => { if (!cancelled) setCandidatesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTrialId]);

  const loadMore = useCallback(() => {
    if (!selectedTrialId || !nextCursor) return;
    setLoadingMore(true);
    setTrialError(null);
    loadCandidatePage(selectedTrialId, nextCursor)
      .catch(e => setTrialError(e instanceof Error ? e.message : 'Could not load more patients'))
      .finally(() => setLoadingMore(false));
  }, [selectedTrialId, nextCursor, loadCandidatePage]);

  const filteredTrials = useMemo(
    () => (trialFilter === 'All' ? candidates : candidates.filter(c => c.matchStatus === trialFilter)),
    [candidates, trialFilter],
  );

  // Counts across ALL three states - shown even when a filter is active, so the denominator is never hidden.
  const matchCounts = useMemo(() => candidates.reduce(
    (acc, c) => { acc[c.matchStatus] += 1; return acc; },
    { ELIGIBLE: 0, INDETERMINATE: 0, INELIGIBLE: 0 } as Record<TrialMatchStatus, number>,
  ), [candidates]);

  const registryFilters: RegistryFilter[] = ['All', 'Needs Review', 'Ready to Submit', 'Submitted'];
  const trialFilters: TrialFilter[] = ['All', 'ELIGIBLE', 'INDETERMINATE', 'INELIGIBLE'];
  const selectedTrial = trials.find(t => t.id === selectedTrialId) ?? null;

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

      {/* -- Section 2: Trial Eligibility (REAL DATA - AUDIT-148 honest matcher) -- */}
      <div className="bg-white border border-titanium-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-titanium-100 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Beaker className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-titanium-900">Trial Eligibility</h3>
                <p className="text-sm text-titanium-500">
                  {candidatesLoading
                    ? 'Loading eligibility...'
                    : `${matchCounts.ELIGIBLE} eligible \u00b7 ${matchCounts.INDETERMINATE} indeterminate \u00b7 ${matchCounts.INELIGIBLE} ineligible${hasMore ? ' (loaded so far)' : ''}`}
                </p>
                {!candidatesLoading && asOf && <TrialAsOfIndicator asOf={asOf} className="mt-2" />}
              </div>
            </div>
            <button
              onClick={() => { void loadTrials(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-titanium-50 text-titanium-600 hover:bg-titanium-100 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Trial selector - real trials from GET /trials */}
          {trials.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-titanium-500 mr-1">Trial</span>
              {trials.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTrialId(t.id); setExpandedPatientId(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTrialId === t.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-titanium-50 text-titanium-600 hover:bg-titanium-100'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Match-state filter. INDETERMINATE is a first-class state, never hidden. */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
                {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {(trialsLoading || candidatesLoading) && (
          <div className="px-6 py-12 text-center text-sm text-titanium-500">
            <Clock className="w-5 h-5 mx-auto mb-2 text-titanium-400 animate-pulse" />
            {trialsLoading ? 'Loading trials...' : 'Evaluating patient eligibility...'}
          </div>
        )}

        {/* Error - explicit, never a silent fallback to illustrative rows */}
        {!trialsLoading && !candidatesLoading && trialError && (
          <div className="px-6 py-12 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-titanium-700 font-medium">Could not load trial eligibility</p>
            <p className="text-xs text-titanium-500 mt-1">{trialError}</p>
            <button
              onClick={() => { void loadTrials(); }}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-titanium-50 text-titanium-600 hover:bg-titanium-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!trialsLoading && !candidatesLoading && !trialError && trials.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-titanium-500">
            No active trials are configured for this organization.
          </div>
        )}

        {/* Results */}
        {!trialsLoading && !candidatesLoading && !trialError && trials.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-titanium-50 border-b border-titanium-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">Match</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">Missing signals</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-titanium-600">Criteria</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrials.map(c => (
                  <React.Fragment key={c.id}>
                    <tr className="border-b border-titanium-50 hover:bg-titanium-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-titanium-900">{c.name}</td>
                      <td className="px-6 py-3 text-titanium-600">{c.mrn}</td>
                      <td className="px-6 py-3 text-titanium-600">{c.age}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${matchStatusChip(c.matchStatus)}`}>
                          <MatchStatusIcon status={c.matchStatus} />
                          {c.matchStatus.charAt(0) + c.matchStatus.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {c.indeterminateSignals.length === 0 ? (
                          <span className="text-xs text-titanium-400">--</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {c.indeterminateSignals.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setExpandedPatientId(expandedPatientId === c.id ? null : c.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          {expandedPatientId === c.id ? 'Hide' : `${c.criteriaResults.length} criteria`}
                        </button>
                      </td>
                    </tr>
                    {expandedPatientId === c.id && (
                      <tr className="border-b border-titanium-50 bg-titanium-50/40">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {c.criteriaResults.map(r => (
                              <span
                                key={r.criterionId}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${verdictPill(r.verdict)}`}
                              >
                                <span className="font-mono">{r.criterionId}</span>
                                <span className="opacity-60">({r.polarity})</span>
                                <span className="font-semibold">{r.verdict}</span>
                                {r.missingSignal && <span className="font-mono opacity-75">- {r.missingSignal}</span>}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-xs text-titanium-500">
                            UNEVALUABLE means the platform does not have that signal for this patient - it is not
                            evidence against eligibility. A patient is never reported ELIGIBLE while any criterion is
                            unevaluable.
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredTrials.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-titanium-500">
                      {candidates.length === 0
                        ? `No patients evaluated for ${selectedTrial?.name ?? 'this trial'}.`
                        : 'No patients match the selected filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* AUDIT-227: explicit continuation. The counts above are "loaded so far", not tenant totals -
                saying so is the point; a partial count presented as a total would be the dishonest option. */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-titanium-100 flex items-center justify-between">
                <p className="text-xs text-titanium-500">
                  Showing {candidates.length} patients. Counts above cover the loaded set only.
                </p>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-titanium-50 text-titanium-600 hover:bg-titanium-100 disabled:opacity-50 transition-all"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchCareTeamView;
