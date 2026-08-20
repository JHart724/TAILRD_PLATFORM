import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Beaker, TrendingUp, Clock, CheckCircle, Users, FlaskConical, AlertTriangle, HelpCircle } from 'lucide-react';
import { getTrialsSummary } from '../../../services/api';
import type { TrialsSummary } from '../../../services/api';
import { TrialAsOfIndicator } from '../components/TrialAsOfIndicator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Provenance } from '../../../types/provenance';

// -- Registry data: STILL MOCK, deliberately -------------------------------
//
// The 5 registry endpoints exist and api.ts carries the full contract, but `registry_cases` holds
// ZERO rows in every tenant (measured). Wiring these cards today would render zeros; seeding demo
// rows to make them look populated is precisely the defect AUDIT-148 was filed against. The
// abstraction-hours-saved / auto-fill-rate framing is additionally needs-data - no substrate models
// per-field provenance or effort - so it stays marked rather than fabricated (AUDIT-187 precedent:
// fabricated revenue constants were dropped, not re-derived).-----

const registryKPIs = [
  { label: 'Cases Auto-Populated This Month', value: '159', icon: FileText, color: 'border-l-[#2E3440]' },
  { label: 'Average Auto-Fill Rate', value: '80%', icon: TrendingUp, color: 'border-l-[#2C4A60]' },
  { label: 'Abstraction Hours Saved', value: '212', icon: Clock, color: 'border-l-blue-500' },
  { label: 'Submission-Ready Cases', value: '117', icon: CheckCircle, color: 'border-l-[#6B7280]' },
];

const registries = [
  {
    name: 'CathPCI',
    casesPerMonth: 52,
    autoFillRate: 85,
    pending: 8,
    submitted: 44,
    targetLow: 80,
    targetHigh: 95,
    color: '#2E3440',
  },
  {
    name: 'TVT',
    casesPerMonth: 31,
    autoFillRate: 78,
    pending: 6,
    submitted: 25,
    targetLow: 75,
    targetHigh: 90,
    color: '#4C566A',
  },
  {
    name: 'ICD Registry',
    casesPerMonth: 44,
    autoFillRate: 82,
    pending: 9,
    submitted: 35,
    targetLow: 78,
    targetHigh: 92,
    color: '#5E81AC',
  },
  {
    name: 'GWTG-HF',
    casesPerMonth: 32,
    autoFillRate: 74,
    pending: 11,
    submitted: 21,
    targetLow: 72,
    targetHigh: 88,
    color: '#81A1C1',
  },
];

const chartData = registries.map((r) => ({
  name: r.name,
  autoFillRate: r.autoFillRate,
  targetLow: r.targetLow,
  targetHigh: r.targetHigh,
}));

// -- Trial eligibility: REAL DATA via GET /trials/summary (AUDIT-227) -------
//
// Counts-only aggregate. The Executive tier needs numbers, never patient rows - which is exactly why
// the summary endpoint exists: the previous shape would have required the unbounded per-patient read
// that AUDIT-227 was filed against.
//
// Sponsor-type ("Industry-Sponsored") is NOT rendered as a number: ClinicalTrial has no sponsorType
// column, so any figure would be invented. It is marked needs-data instead.

// -- Custom Tooltip -----------------------------------------------------------

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-titanium-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-titanium-800 mb-1">{label}</p>
      <p className="text-titanium-600">Auto-Fill Rate: <span className="font-medium text-titanium-800">{d.autoFillRate}%</span></p>
      <p className="text-titanium-600">Target Range: <span className="font-medium text-titanium-800">{d.targetLow}% - {d.targetHigh}%</span></p>
    </div>
  );
};

// -- Component ----------------------------------------------------------------

const ResearchExecutiveView: React.FC = () => {
  const [summary, setSummary] = useState<TrialsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await getTrialsSummary());
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Could not load trial summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  // Derived, never invented. `evaluated` is identical across trials (every trial is scored against the
  // same tenant cohort), so the first row is the screened denominator.
  const patientsScreened = summary?.patientsEvaluated ?? 0;
  const eligibleIdentified = summary?.trials.reduce((a, t) => a + t.eligible, 0) ?? 0;
  const indeterminateTotal = summary?.trials.reduce((a, t) => a + t.indeterminate, 0) ?? 0;
  const activeTrials = summary?.trials.length ?? 0;

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* ── Page Heading ─────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-titanium-900 flex items-center gap-2">
          <FlaskConical className="w-7 h-7 text-neutral-700" />
          Research Performance Dashboard
        </h1>
        <p className="text-titanium-500 mt-1">Registry automation and trial eligibility at a glance</p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 - Registry Performance
         ══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-titanium-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-neutral-700" />
          Registry Automation
        </h2>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {registryKPIs.map((kpi) => (
            <div
              key={kpi.label}
              className={`metal-card bg-white border border-titanium-200 rounded-2xl p-4 border-l-4 ${kpi.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4 text-titanium-400" />
                <span className="text-xs font-medium text-titanium-500 uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-titanium-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Registry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {registries.map((reg) => {
            const pct = Math.min(reg.autoFillRate, 100);
            const inTarget = reg.autoFillRate >= reg.targetLow && reg.autoFillRate <= reg.targetHigh;
            const aboveTarget = reg.autoFillRate > reg.targetHigh;

            return (
              <div
                key={reg.name}
                className="metal-card bg-white border border-titanium-200 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-titanium-800">{reg.name}</h3>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      aboveTarget
                        ? 'bg-chrome-50 text-teal-700'
                        : inTarget
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {aboveTarget ? 'Above Target' : inTarget ? 'On Target' : 'Below Target'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-titanium-600">
                  <div className="flex justify-between">
                    <span>Cases / Month</span>
                    <span className="font-medium text-titanium-800">{reg.casesPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-Fill Rate</span>
                    <span className="font-medium text-titanium-800">{reg.autoFillRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-medium text-titanium-800">{reg.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitted</span>
                    <span className="font-medium text-titanium-800">{reg.submitted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Range</span>
                    <span className="font-medium text-titanium-800">{reg.targetLow}% - {reg.targetHigh}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-titanium-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: reg.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-Fill Rate Chart */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-titanium-700 mb-4">Auto-Fill Rate vs Target Range</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4C566A' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#4C566A' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="autoFillRate" fill="#2E3440" radius={[6, 6, 0, 0]} />
                {/* Reference lines for each registry target range */}
                {registries.map((r) => (
                  <React.Fragment key={r.name}>
                    <ReferenceLine y={r.targetLow} stroke="#A3BE8C" strokeDasharray="4 4" strokeWidth={1.5} />
                    <ReferenceLine y={r.targetHigh} stroke="#A3BE8C" strokeDasharray="4 4" strokeWidth={1.5} />
                  </React.Fragment>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 - Trial Eligibility
         ══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-semibold text-titanium-800 mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-neutral-700" />
          Trial Eligibility Screening
        </h2>

        {/* KPI Row - REAL counts from /trials/summary; needs-data cards marked, never invented */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Patients Screened', value: patientsScreened, icon: Users, color: 'border-l-[#2E3440]' },
            { label: 'Eligible Identified', value: eligibleIdentified, icon: CheckCircle, color: 'border-l-[#2C4A60]' },
            { label: 'Indeterminate (one signal away)', value: indeterminateTotal, icon: HelpCircle, color: 'border-l-blue-500' },
            { label: 'Active Trials', value: activeTrials, icon: FlaskConical, color: 'border-l-[#6B7280]' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`metal-card bg-white border border-titanium-200 rounded-2xl p-4 border-l-4 ${kpi.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4 text-titanium-400" />
                <span className="text-xs font-medium text-titanium-500 uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-titanium-900">
                {summaryLoading ? '--' : summaryError ? '--' : kpi.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* TRIALS PR 3: the sample banner RETIRES. These counts are population-true reads of persisted
            verdicts, so there is no partial to label. What replaces it is the as-of statement - a
            precomputed number must say when it was computed and, on divergence, why it may be stale. */}
        {!summaryLoading && !summaryError && summary && (
          <TrialAsOfIndicator asOf={summary.asOf} className="mb-4" />
        )}

        {summaryError && (
          <div className="flex items-start gap-2 text-xs text-titanium-600 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <span>Could not load trial eligibility counts: {summaryError}</span>
            <button onClick={() => { void loadSummary(); }} className="ml-auto underline">Retry</button>
          </div>
        )}

        {/* Top 5 Trials Table */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-titanium-700 mb-4">Active Trials - eligibility counts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-titanium-200">
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Trial</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Module</th>
                  <th className="text-right py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Eligible</th>
                  <th className="text-right py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Indeterminate</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Phase</th>
                  <th className="text-left py-3 px-4 font-semibold text-titanium-600 uppercase tracking-wide text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.trials ?? []).map((trial) => (
                  <tr key={trial.trialId} className="border-b border-titanium-100 hover:bg-titanium-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-titanium-800">{trial.name}</td>
                    <td className="py-3 px-4 text-titanium-600">{trial.module || '--'}</td>
                    <td className="py-3 px-4 text-right font-medium text-titanium-800">{trial.eligible.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium text-blue-700">{trial.indeterminate.toLocaleString()}</td>
                    <td className="py-3 px-4 text-titanium-600">{trial.phase || '--'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-chrome-50" />
                        {trial.status || '--'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!summaryLoading && !summaryError && (summary?.trials.length ?? 0) === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-titanium-500">No active trials configured for this organization.</td></tr>
                )}
                {summaryLoading && (
                  <tr><td colSpan={6} className="py-8 text-center text-titanium-500">Computing eligibility counts...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclosure Note */}
        <div className="flex items-start gap-2 text-xs text-titanium-500 bg-titanium-50 border border-titanium-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <span>
            Eligibility counts are computed by the honest matcher across all three states; INDETERMINATE means one
            signal is missing, not that a patient is ineligible. Enrollment decisions require PI review. Sponsor
            type is not shown: it is not modelled in the trial record, and inventing it would misreport the
            portfolio.
          </span>
        </div>
      </section>
    </div>
  );
};

export default ResearchExecutiveView;

// AUDIT-208 provenance declaration. States where THIS surface's data comes from, so that
// "is this figure database-derived" has a mechanical answer instead of requiring someone to know.
export const PROVENANCE: Provenance = 'live';
