/**
 * AUDIT-228: chunking for id-list database writes.
 *
 * THE DEFECT THIS CLOSES. `refreshTrialMatches.ts` batched every confirmation into one
 * `updateMany({ where: { id: { in: toConfirm } } })`. `toConfirm` accumulates across ALL patient
 * batches, so at tenant scale it held 102,284 ids -> 102,287 bind variables, against PostgreSQL's hard
 * maximum of 32,767:
 *
 *   Assertion violation on the database: `too many bind variables in prepared statement,
 *   expected maximum of 32767, received 102287`
 *
 * The walk was bounded; the WRITE was not. That is the same shape as AUDIT-225 (a paginator that was
 * safe while the thing it fed was not), and the reason this lives in `lib/` rather than inside one
 * runner: the next id-list write should reach for a primitive that is already correct.
 *
 * CHUNK SIZE. PostgreSQL's limit is 32,767 bind variables per prepared statement. `ID_CHUNK_SIZE` is
 * **5,000** - roughly 6.5x of headroom below the ceiling, deliberately NOT set at or near it:
 *   - a `where: { id: { in: [...] } }` is rarely the only bound parameter; tenant scoping, status
 *     filters and `data` fields all consume slots, and that overhead varies per call site;
 *   - sizing to the ceiling means any future added predicate silently re-introduces this bug;
 *   - the cost of more round trips is trivial next to the ~14 minutes a full refresh already takes,
 *     while the cost of being wrong is a runner that cannot complete.
 * Headroom is the point. A chunk size that is "correct" only for today's exact query shape is a
 * convention pretending to be a mechanism.
 */

/** PostgreSQL's hard maximum bind variables per prepared statement. Not configurable; stated for the reader. */
export const PG_MAX_BIND_VARIABLES = 32767;

/** Ids per chunked write. See the header for why this is well below the ceiling rather than near it. */
export const ID_CHUNK_SIZE = 5000;

/**
 * Split a list into fixed-size chunks. Returns an empty array for an empty input, so callers can
 * iterate unconditionally without an emptiness guard.
 */
export function chunk<T>(items: readonly T[], size: number = ID_CHUNK_SIZE): T[][] {
  if (size < 1) throw new Error(`chunk: size must be >= 1, received ${size}`);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Run an async write over each chunk in sequence, summing the per-chunk counts.
 *
 * SEQUENTIAL, not parallel: these are writes against one tenant's rows, and a parallel fan-out would
 * trade a bind-variable limit for a connection-pool one - swapping a loud failure for a subtler
 * exhaustion. The runner is already a batch job; wall-clock is not the binding constraint.
 *
 * A chunk that throws propagates immediately, with the chunks already applied left applied. That is
 * deliberate and the callers must handle it: the writes here are idempotent by construction (setting
 * `lastConfirmedAt` to a fixed stamp, or superseding a row that is checked for `supersededAt: null`),
 * so a re-run converges rather than double-applying. What must NOT happen is a silent partial success,
 * which is why the caller closes its run record as FAILED on a throw (see refreshTrialMatches).
 */
export async function applyInChunks<T>(
  items: readonly T[],
  size: number,
  apply: (batch: T[]) => Promise<number>,
): Promise<number> {
  let total = 0;
  for (const batch of chunk(items, size)) {
    total += await apply(batch);
  }
  return total;
}
