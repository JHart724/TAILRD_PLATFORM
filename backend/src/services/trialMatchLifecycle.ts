/**
 * TrialMatch version-and-supersede lifecycle: the pure decision logic.
 *
 * Extracted from the runner so every invariant is unit-testable without a database, the same way
 * `gapResolvePass.ts` carries AUDIT-223's decisions. The runner is the I/O shell; the rules live here.
 *
 * See docs/audit/TRIALMATCH_IDENTITY_DESIGN.md sections 3.2 (lifecycle) and 3.3 (discriminator).
 */

import { applyInChunks, ID_CHUNK_SIZE } from '../lib/dbChunk';

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

/* ------------------------------------------------------------------------------------------------
 * WRITE PHASE (AUDIT-228)
 *
 * WHY THIS IS HERE AND NOT INLINE IN THE RUNNER. AUDIT-228's real lesson is not the bind-variable
 * number: it is that the pure decision module above was tested exhaustively - including the
 * idempotency property that a no-change pass returns `confirm` for every pair - while the BATCHED I/O
 * SHELL that turns those decisions into writes had no test at all. The decisions were right; the code
 * applying them was wrong; and the seam between them was exactly where no test looked. Moving the
 * write phase behind an injected writer makes that seam addressable: the chunking, the tally
 * aggregation, and the at-scale idempotency property are now assertable without a database.
 * ---------------------------------------------------------------------------------------------- */

export interface MatchPayload {
  patientId: string;
  trialId: string;
  status: TrialMatchStatus;
  criteriaResults: unknown;
  indeterminateSignals: string[];
}

export interface WritePlan {
  toCreate: MatchPayload[];
  toConfirm: string[];
  toSupersede: Array<{ rowId: string; reason: SupersessionReason; next: MatchPayload }>;
}

/**
 * The writes the runner performs, injected so the phase is testable. `confirm` receives an
 * ALREADY-CHUNKED id list and returns the number of rows it matched.
 *
 * AUDIT-230: `supersedeThenInsert` REPLACED a pair of separate `create` + `supersede` calls, and the
 * replacement is the fix, not a tidy-up. The old shape let `applyWritePhase` choose the ORDER of the
 * two writes, and it chose wrong: it inserted the replacement while the row being retired was still
 * current, so two rows momentarily satisfied `supersededAt IS NULL` for the same
 * (patientId, trialId, hospitalId) - exactly what the partial unique index forbids. It failed on the
 * first supersession this table ever saw.
 *
 * Ordering is now the WRITER'S obligation and is unrepresentable-wrong at this layer: there is no way
 * to express "insert first" through this interface. That is deliberate. An ordering constraint that
 * lives in a comment is a convention; one the type system will not let you violate is a mechanism.
 */
export interface TrialMatchWriter {
  create(payload: MatchPayload): Promise<{ id: string }>;
  confirm(ids: string[]): Promise<number>;
  /**
   * ATOMICALLY retire `rowId` and install `next` as the new current row. Returns 1 if the row was
   * retired and replaced, 0 if `rowId` was no longer current (another actor got there first) - in
   * which case NOTHING is inserted, because a replacement for a row that was not retired would be
   * the second current row all over again.
   */
  supersedeThenInsert(rowId: string, reason: SupersessionReason, next: MatchPayload): Promise<number>;
}

export interface WriteOutcome {
  created: number;
  confirmed: number;
  superseded: number;
  /** True when the AUDIT-193 completeness gate withheld the supersede half. */
  supersessionWithheld: boolean;
}

/**
 * Apply a planned changeset.
 *
 * COUNTS ARE APPLIED COUNTS, NOT PLANNED COUNTS. Every number returned is summed from what the writer
 * reported it actually touched - `confirmed` sums the per-chunk match counts rather than assuming
 * `toConfirm.length`. A chunk that matched fewer rows than it was handed (a row superseded by a
 * concurrent actor between the walk and the write, say) therefore shows up as a divergence in the run
 * record instead of being papered over by a length.
 *
 * CHUNKING: the confirm path is the only id-list write here, and it is chunked at `chunkSize`
 * (default `ID_CHUNK_SIZE`, ~6.5x below PostgreSQL's 32,767 bind-variable ceiling - see dbChunk.ts).
 * The supersede path is deliberately NOT chunked: it is one insert plus one id-scoped update per
 * supersession, so its bind-variable count is constant regardless of how many rows supersede.
 *
 * FAILURE: a throw from any writer call propagates immediately, with prior chunks left applied. The
 * caller owns closing its run record as FAILED - see refreshTrialMatches. Re-running converges rather
 * than double-applying, because every write here is idempotent by construction (confirm sets a stamp;
 * supersede is scoped to rows still current).
 */
export async function applyWritePhase(
  writer: TrialMatchWriter,
  plan: WritePlan,
  completeness: CompletenessVerdict,
  chunkSize: number = ID_CHUNK_SIZE,
): Promise<WriteOutcome> {
  let created = 0;
  for (const payload of plan.toCreate) {
    await writer.create(payload);
    created++;
  }

  const confirmed = await applyInChunks(plan.toConfirm, chunkSize, (ids) => writer.confirm(ids));

  if (!completeness.ok) {
    return { created, confirmed, superseded: 0, supersessionWithheld: true };
  }

  let superseded = 0;
  for (const s of plan.toSupersede) {
    // Supersede THEN insert, atomically, inside the writer. The partial unique index permits the old
    // and new rows to coexist only because the old one is no longer current by the time the new one
    // lands - so the order is load-bearing, not stylistic (AUDIT-230).
    superseded += await writer.supersedeThenInsert(s.rowId, s.reason, s.next);
  }
  return { created, confirmed, superseded, supersessionWithheld: false };
}
