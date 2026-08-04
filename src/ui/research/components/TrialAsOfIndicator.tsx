import React from 'react';
import { Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import type { TrialAsOf, TrialStaleReason } from '../../../services/api';

/**
 * The as-of indicator for trial eligibility figures (TrialMatch identity design 3.6, rulings R2/R3).
 *
 * WHAT THIS REPLACES. The Executive view used to carry a sample banner, because the summary evaluated
 * the tenant inside the request under a 20s budget and could only cover a prefix. Those counts are now
 * population-true reads of persisted verdicts, so the sample banner and every "(sample)" label retire.
 * What does NOT retire is the honesty obligation: a precomputed number must say when it was computed.
 * This component is that statement, given the same prominence the sample banner had.
 *
 * IT NEVER HIDES THE NUMBERS. Per R2, past the staleness bound the figures are MARKED stale and the last
 * successful run is named - they are not withheld. A stale honest number beats no number, provided it
 * says it is stale. The one exception is `never-run`, where there is no number to show: counts of zero
 * would assert a clinical fact nothing has computed, so the caller renders "not yet computed" instead.
 */

const REASON_TEXT: Record<TrialStaleReason, string> = {
  'never-run': 'no eligibility run has completed for this tenant yet',
  age: 'the last run is more than 36 hours old, so the refresh may not be running',
  build: 'these verdicts were computed under a different build than the one serving this page',
  criteria: 'the trial criteria changed after these verdicts were computed',
};

function fmt(iso: string | null): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString();
}

export function TrialAsOfIndicator({ asOf, className = '' }: { asOf: TrialAsOf; className?: string }) {
  const neverRun = asOf.staleReasons.includes('never-run');

  if (neverRun) {
    return (
      <div
        role="status"
        data-testid="trial-asof"
        data-stale="true"
        className={`flex items-start gap-2 text-xs text-titanium-600 bg-amber-50 border border-amber-200 rounded-xl p-3 ${className}`}
      >
        <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <span>
          <strong>Not yet computed.</strong> No eligibility run has completed for this tenant, so these
          figures are unknown rather than zero.
        </span>
      </div>
    );
  }

  if (asOf.stale) {
    return (
      <div
        role="status"
        data-testid="trial-asof"
        data-stale="true"
        className={`flex items-start gap-2 text-xs text-titanium-600 bg-amber-50 border border-amber-200 rounded-xl p-3 ${className}`}
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <span>
          <strong>Eligibility as of {fmt(asOf.evaluatedAt)} - may be out of date.</strong>{' '}
          {asOf.staleReasons.map(r => REASON_TEXT[r]).join('; ')}. Last completed run{' '}
          {fmt(asOf.lastRunFinishedAt)}. The figures below are shown as computed; they are not refreshed
          automatically.
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      data-testid="trial-asof"
      data-stale="false"
      className={`flex items-start gap-2 text-xs text-titanium-500 ${className}`}
    >
      <Clock className="w-4 h-4 text-titanium-400 mt-0.5 shrink-0" />
      <span>Eligibility as of {fmt(asOf.evaluatedAt)}.</span>
    </div>
  );
}

export default TrialAsOfIndicator;
