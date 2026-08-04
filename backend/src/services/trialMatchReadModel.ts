/**
 * TrialMatch READ PATH (identity design section 3.5(e) + 3.6(f), operator rulings R2/R3).
 *
 * WHAT PIVOTS AND WHY. `GET /trials/summary` used to EVALUATE the tenant inside the request under a 20s
 * wall-clock budget, because a full pass measured 451 seconds. It therefore returned a truncated,
 * id-ordered sample and said so (`complete: false`). That was honest but not useful: measured, a
 * 1,200-patient prefix reads HFrEF 5/52/1143 where the population reads 68/24,319/1,184. The sample was
 * not merely incomplete, it was NOT REPRESENTATIVE. Now that verdicts are persisted, the aggregate is a
 * `groupBy` over current rows - population-true and effectively instant - so the budget, the sample, and
 * the `complete` flag all retire.
 *
 * THE HONESTY THAT REPLACES THE SAMPLE BANNER. A precomputed number is only honest if it says WHEN it
 * was computed and UNDER WHAT. This module builds that as-of envelope. It is pure over its inputs so the
 * staleness rules are unit-testable without a database - the same reason `trialMatchLifecycle.ts` exists.
 *
 * THREE INDEPENDENT STALENESS AXES, none substituting for another:
 *   age      - the verdicts are older than the R2 bound (36h). The refresh is not running.
 *   build    - the code that produced them differs from the deployed build (R3). A matcher change like
 *              AUDIT-226 moves verdicts with criteria untouched, so this is the axis that catches it.
 *   criteria - the trial's criteria hash differs from what the stored rows were evaluated against (R1).
 *              A criteria edit moves verdicts with code untouched - the mirror case.
 * A verdict is only fully explained by all three, which is why all three are reported separately rather
 * than collapsed into one boolean. `stale` is the disjunction, for a caller that only wants the flag.
 *
 * DETECT, NEVER AUTO-REFRESH (R3). Divergence is surfaced, not acted on. A read request must never
 * trigger a 451-second write pass - the refresh stays operator-gated. A stale-by-build figure that says
 * so is usable; a silently auto-refreshing one is neither gated nor visible.
 */

/** R2: past this, figures are marked stale and the last successful run is named. NOT hidden. */
export const STALENESS_BOUND_MS = 36 * 60 * 60 * 1000;

export type StaleReason = 'never-run' | 'age' | 'build' | 'criteria';

export interface AsOf {
  /**
   * The OLDEST `evaluatedAt` among the rows this response covers (design 3.6). The oldest, not the
   * newest: an as-of is a promise about the whole set, and the newest would overstate it.
   * Null when nothing is persisted yet.
   */
  evaluatedAt: string | null;
  /** When the last run that produced these verdicts finished. Null if no run has completed. */
  lastRunFinishedAt: string | null;
  /** The build that produced the stored verdicts (from the run record). */
  runBuildSha: string | null;
  /** The build currently serving this request. */
  liveBuildSha: string;
  stale: boolean;
  /** Every axis that fired, so a caller can say WHY rather than just THAT. Empty when fresh. */
  staleReasons: StaleReason[];
}

export interface AsOfInputs {
  /** Oldest evaluatedAt across the covered current rows; null when there are none. */
  oldestEvaluatedAt: Date | null;
  /** The most recent COMPLETED run record, if any. */
  lastRun: { finishedAt: Date | null; buildSha: string } | null;
  /** Distinct buildShas present on the covered current rows. */
  storedBuildShas: readonly string[];
  liveBuildSha: string;
  /** trialId -> criteriaVersion stored on that trial's current rows (one entry per distinct value). */
  storedCriteriaVersions: ReadonlyMap<string, readonly (string | null)[]>;
  /** trialId -> freshly computed hash of the trial's LIVE criteria. */
  liveCriteriaVersions: ReadonlyMap<string, string>;
  nowMs: number;
}

/**
 * Build the as-of envelope.
 *
 * THE ZERO-ROWS CASE IS NOT "EVERYTHING IS ZERO". A tenant whose refresh has never run has no verdicts,
 * and rendering that as `0 eligible` would assert a clinical fact the platform has not computed - the
 * exact never-fire-on-absence defect AUDIT-194 exists to prevent, in aggregate form. It reports
 * `never-run` so the UI can say "not yet computed" instead of a confident zero.
 */
export function buildAsOf(i: AsOfInputs): AsOf {
  const reasons: StaleReason[] = [];

  if (i.oldestEvaluatedAt === null) {
    reasons.push('never-run');
  } else if (i.nowMs - i.oldestEvaluatedAt.getTime() > STALENESS_BOUND_MS) {
    reasons.push('age');
  }

  // Any stored row produced by a build other than the live one. Rows with no recorded buildSha predate
  // provenance and cannot be shown to match, so they count as divergent rather than being waved through.
  if (i.storedBuildShas.some(sha => sha !== i.liveBuildSha)) {
    reasons.push('build');
  }

  for (const [trialId, live] of i.liveCriteriaVersions) {
    const stored = i.storedCriteriaVersions.get(trialId);
    if (!stored || stored.length === 0) continue; // no rows for this trial - covered by never-run/counts
    if (stored.some(v => v !== live)) {
      reasons.push('criteria');
      break;
    }
  }

  return {
    evaluatedAt: i.oldestEvaluatedAt ? i.oldestEvaluatedAt.toISOString() : null,
    lastRunFinishedAt: i.lastRun?.finishedAt ? i.lastRun.finishedAt.toISOString() : null,
    runBuildSha: i.lastRun?.buildSha ?? null,
    liveBuildSha: i.liveBuildSha,
    stale: reasons.length > 0,
    staleReasons: reasons,
  };
}

/* --------------------------------------------------------------------------------------------------
 * KEYSET PAGING OVER PERSISTED MATCHES
 *
 * WHY NOT REUSE `pageArgs` FROM trialMatchPaging. That helper pages on the row's own `id` via Prisma's
 * `cursor:`, which requires a field Prisma KNOWS is unique. The uniqueness that matters here -
 * (patientId, trialId, hospitalId) among current rows - lives in a PARTIAL unique index that Prisma's
 * DSL cannot express, so `cursor:` cannot be pointed at it.
 *
 * Paging on `patientId` with `gt` is the right mechanism rather than a workaround, and it buys the
 * property that matters: the previous endpoint ordered by patient id, so ordering is PRESERVED across
 * the pivot and AUDIT-227's live-proven property (300 ids walked, strictly ascending, zero duplicates
 * across page boundaries) remains literally true of the new implementation. The cursor stays opaque to
 * the client, so the CareTeam view needs no change to keep paging.
 * ------------------------------------------------------------------------------------------------ */

/** Prisma clause for one keyset page of current matches for a trial, ordered by patient id. */
export function matchPageArgs(pageSize: number, cursor?: string): Record<string, unknown> {
  return {
    take: pageSize,
    ...(cursor ? { where: { patientId: { gt: cursor } } } : {}),
    orderBy: { patientId: 'asc' as const },
  };
}

/**
 * Next-cursor / has-more for a page of matches. Mirrors `nextPage` but keys on `patientId`, because
 * that is what the caller pages by. `hasMore` is inferred from a FULL page rather than a COUNT query -
 * a full final page costs one extra empty request and never drops a row.
 */
export function nextMatchPage<T extends { patientId: string }>(
  rows: readonly T[],
  pageSize: number,
): { nextCursor: string | null; hasMore: boolean } {
  if (rows.length === 0) return { nextCursor: null, hasMore: false };
  const hasMore = rows.length === pageSize;
  return { nextCursor: hasMore ? rows[rows.length - 1].patientId : null, hasMore };
}

/** Age in whole years at a given clock. Mirrors buildPatientEvalContext's derivation exactly. */
export function ageAt(dateOfBirth: Date | string, nowMs: number): number {
  return Math.floor((nowMs - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
