/**
 * AUDIT-227: cursor paging + counts-only summarization for the trials request path.
 *
 * THE DEFECT THIS EXISTS TO CLOSE. `GET /trials/:trialId/eligible-patients` loaded the ENTIRE tenant
 * patient set - `patient.findMany({ where: { hospitalId, isActive: true }, include: { conditions,
 * medications, observations, procedures } })` with no take/skip/cursor - then mapped the matcher over the
 * whole array in memory. Measured: a 3,000-patient probe with exactly those four relations was killed
 * exit 137 (OOM) at the production task size; the tenant holds 25,571 active patients. The CareTeam
 * research view calls that endpoint, so a shipped clinician-facing path deterministically failed.
 *
 * THE SHAPE. `gapDetectionRunner` already walks the same relation set safely over the same 25,571
 * patients using a 100-row id-cursor batch. This module carries that proven shape as pure, testable
 * primitives so the route is a thin consumer and the invariants can be unit-tested without a database.
 *
 * WHY AN ID CURSOR AND NOT OFFSET. Offset pagination re-scans and can skip or duplicate rows when the
 * underlying set shifts between pages. An id cursor with a stable `orderBy: { id: 'asc' }` is
 * shift-stable for the rows already walked - the same property the AUDIT-225 paginator needed after the
 * backfill skipped 125 rows by paging over a column it was writing. Nothing here writes patient rows, but
 * the stability argument is the same and the cost is identical.
 */

/** Default rows per page when the caller does not ask. Matches gapDetectionRunner's BATCH_SIZE. */
export const PAGE_SIZE_DEFAULT = 100;

/**
 * Hard ceiling on rows per page. A caller cannot opt back into the unbounded behavior by asking for a
 * huge page - the cap is the actual defense, not the default.
 */
export const PAGE_SIZE_MAX = 250;

/** Internal batch size for the counts-only summary walk. Never returned to a caller. */
export const SUMMARY_BATCH_SIZE = 200;

/**
 * Wall-clock budget for the synchronous summary walk.
 *
 * MEASURED, not guessed: the full 4-trial summary over this tenant's 25,571 active patients takes
 * **451 seconds** (17.64 ms/patient, 128 batches of 200) on the production task size. That is far past
 * any sane HTTP timeout - an ALB idles out at 60s by default - so a synchronous endpoint that insists on
 * completeness would hang and then 504, which is the AUDIT-227 failure mode wearing a different hat.
 *
 * So the walk is BUDGETED: it stops at the budget and reports what it actually covered. The honesty
 * property is that a partial result is never presented as a total - the response carries `complete` and
 * `patientsEvaluated`, and the UI labels a partial as a sample. Under-claiming beats hanging, and beats
 * a number that silently means something other than it says.
 *
 * The durable fix is not a bigger budget: it is precomputation (a scheduled summary refresh, or the
 * persisted TrialMatch rows the AUDIT-148 identity design will settle). Both are out of scope here by
 * ruling - this budget makes the endpoint honest and non-hanging in the meantime.
 */
export const SUMMARY_TIME_BUDGET_MS = 20_000;

/** True when the walk has spent its budget and must stop, reporting a partial result. */
export function budgetExhausted(startedAtMs: number, nowMs: number, budgetMs = SUMMARY_TIME_BUDGET_MS): boolean {
  return nowMs - startedAtMs >= budgetMs;
}

/**
 * Clamp a caller-supplied page size into [1, PAGE_SIZE_MAX], defaulting when absent or unparseable.
 * Deliberately total: no input produces a throw, and no input produces an unbounded read.
 */
export function resolvePageSize(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return PAGE_SIZE_DEFAULT;
  const n = typeof raw === 'number' ? raw : Number(String(raw));
  if (!Number.isFinite(n)) return PAGE_SIZE_DEFAULT;
  const floored = Math.floor(n);
  if (floored < 1) return 1;
  if (floored > PAGE_SIZE_MAX) return PAGE_SIZE_MAX;
  return floored;
}

/** A cursor is an opaque patient id; absent/blank means "start from the beginning". */
export function resolveCursor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * The Prisma pagination clause for an id-cursor walk. `skip: 1` steps PAST the cursor row so a page
 * never repeats the last row of the previous page.
 */
export function pageArgs(pageSize: number, cursor?: string): Record<string, unknown> {
  return {
    take: pageSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' as const },
  };
}

/**
 * Next-cursor / has-more from a page of rows. `hasMore` is inferred from a FULL page rather than from a
 * total count: a short page is the end of the walk, and this avoids a second COUNT query per request.
 * A full final page costs one extra empty request - the honest trade, and it never drops a row.
 */
export function nextPage<T extends { id: string }>(
  rows: readonly T[],
  pageSize: number,
): { nextCursor: string | null; hasMore: boolean } {
  if (rows.length === 0) return { nextCursor: null, hasMore: false };
  const hasMore = rows.length === pageSize;
  return { nextCursor: hasMore ? rows[rows.length - 1].id : null, hasMore };
}

export type MatchStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INDETERMINATE';

export interface MatchCounts {
  ELIGIBLE: number;
  INELIGIBLE: number;
  INDETERMINATE: number;
}

export function emptyCounts(): MatchCounts {
  return { ELIGIBLE: 0, INELIGIBLE: 0, INDETERMINATE: 0 };
}

/** Accumulate one verdict. Mutates and returns the accumulator (hot path, one object per trial). */
export function tally(counts: MatchCounts, status: MatchStatus): MatchCounts {
  counts[status] += 1;
  return counts;
}

/** Total evaluated across all three states - the denominator the Executive view shows. */
export function totalEvaluated(counts: MatchCounts): number {
  return counts.ELIGIBLE + counts.INELIGIBLE + counts.INDETERMINATE;
}
