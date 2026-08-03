/**
 * TrialMatch version-and-supersede lifecycle: the pure decision logic.
 *
 * Extracted from the runner so every invariant is unit-testable without a database, the same way
 * `gapResolvePass.ts` carries AUDIT-223's decisions. The runner is the I/O shell; the rules live here.
 *
 * See docs/audit/TRIALMATCH_IDENTITY_DESIGN.md sections 3.2 (lifecycle) and 3.3 (discriminator).
 */

/** Actor recorded on supersessions. Reserved `system:` prefix (gapResolutionActor.ts convention). */
export const REFRESH_ACTOR = 'system:trialmatch-refresh' as const;

/**
 * AUDIT-193 class, mirroring gapResolvePass. Below this fraction of the tenant's patients evaluated,
 * NOTHING is superseded: a truncated run must never mass-supersede on partial evidence. Creates and
 * confirmations still apply - only the destructive-ish half is withheld.
 */
export const COMPLETENESS_MIN_FRACTION = 0.9;

export type TrialMatchStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INDETERMINATE';

/**
 * Three-way supersession discriminator, extending AUDIT-223's two-way (`clock` | `state`).
 *
 *   criteria - the trial's criteria changed. Decidable by comparing criteriaVersion hashes, WITHOUT
 *              re-evaluating anything, and it explains the flip completely. Checked FIRST for both
 *              reasons.
 *   clock    - same criteria, same patient data, but a staleness window elapsed. Measured twice in
 *              production: verdicts moved with nothing but the clock (design doc section 1.3).
 *   state    - the patient's data actually changed.
 */
export type SupersessionReason = 'criteria' | 'clock' | 'state';

export interface StoredMatch {
  id: string;
  patientId: string;
  trialId: string;
  status: TrialMatchStatus;
  criteriaVersion: string | null;
  evaluatedAt: Date;
}

export type MatchAction =
  | { kind: 'create' }
  | { kind: 'confirm'; rowId: string }
  | { kind: 'supersede'; rowId: string; reason: SupersessionReason };

/**
 * Decide what a freshly-computed verdict means for the stored row.
 *
 *   no stored row            -> create
 *   same verdict             -> confirm (advance lastConfirmedAt; NO new row)
 *   different verdict        -> supersede + create
 *
 * The confirm branch is what keeps the table proportional to verdict CHANGES rather than to
 * evaluation RUNS: a nightly refresh over ~102K pairs would otherwise add ~102K rows every night
 * whether or not anything moved.
 *
 * `firedSameAtOldClock` is the AUDIT-223 two-clock probe, supplied by the caller (it requires
 * re-evaluating the patient's rows at the stored row's evaluatedAt, which is I/O the caller owns).
 * It is IGNORED when the criteria hash differs, because a criteria change already explains the flip
 * and the probe would be answering a question nobody asked.
 */
export function decideAction(
  stored: StoredMatch | undefined,
  freshStatus: TrialMatchStatus,
  freshCriteriaVersion: string,
  firedSameAtOldClock: boolean,
): MatchAction {
  if (!stored) return { kind: 'create' };
  if (stored.status === freshStatus) return { kind: 'confirm', rowId: stored.id };
  return {
    kind: 'supersede',
    rowId: stored.id,
    reason: classifySupersession(stored.criteriaVersion, freshCriteriaVersion, firedSameAtOldClock),
  };
}

/**
 * Which of the three causes moved this verdict.
 *
 * criteria wins whenever the hashes differ - including when the stored hash is NULL (a row written
 * before provenance existed cannot be shown to have had the same criteria, so claiming `clock` or
 * `state` would be asserting on absent data, the very thing this platform refuses to do).
 */
export function classifySupersession(
  storedCriteriaVersion: string | null,
  freshCriteriaVersion: string,
  firedSameAtOldClock: boolean,
): SupersessionReason {
  if (storedCriteriaVersion !== freshCriteriaVersion) return 'criteria';
  return firedSameAtOldClock ? 'clock' : 'state';
}

export interface CompletenessVerdict {
  fraction: number;
  ok: boolean;
  message?: string;
}

/** Gate the supersede half of the run on evaluation completeness. Returns a verdict, never throws. */
export function evaluateCompleteness(evaluated: number, storedPatients: number): CompletenessVerdict {
  if (storedPatients === 0) return { fraction: 1, ok: true };
  const fraction = evaluated / storedPatients;
  if (fraction < COMPLETENESS_MIN_FRACTION) {
    return {
      fraction,
      ok: false,
      message:
        `TrialMatchCompletenessError: evaluated ${evaluated} of ${storedPatients} stored patients ` +
        `(${(fraction * 100).toFixed(1)}%), below ${COMPLETENESS_MIN_FRACTION * 100}%. Supersession ` +
        `WITHHELD to avoid mass false-supersession on a truncated run; creates and confirmations still applied.`,
    };
  }
  return { fraction, ok: true };
}

export interface RunTallies {
  trialsEvaluated: number;
  patientsEvaluated: number;
  matchesCreated: number;
  matchesSuperseded: number;
  matchesConfirmed: number;
}

export function emptyTallies(): RunTallies {
  return {
    trialsEvaluated: 0,
    patientsEvaluated: 0,
    matchesCreated: 0,
    matchesSuperseded: 0,
    matchesConfirmed: 0,
  };
}

/**
 * AUDIT-225 completeness invariant: never report success on a short walk. Execute-only, so a dry-run
 * over a subset stays useful.
 */
export function assertFullScan(scanned: number, expectedTotal: number, execute: boolean): void {
  if (!execute) return;
  if (scanned < expectedTotal) {
    throw new Error(
      `[trialmatch-refresh] ABORT: scanned ${scanned} of ${expectedTotal} tenant patients - the ` +
        `paginator skipped ${expectedTotal - scanned}. Refusing to report success on a short scan (AUDIT-225).`,
    );
  }
}
