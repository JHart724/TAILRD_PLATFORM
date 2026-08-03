/**
 * AUDIT-228: the TrialMatch refresh write phase must chunk every id-list write below PostgreSQL's
 * 32,767 bind-variable limit.
 *
 * WHAT FAILED IN PRODUCTION, AND WHY NO TEST CAUGHT IT. The runner batched every confirmation into a
 * single `updateMany({ where: { id: { in: toConfirm } } })` whose list ACCUMULATED across all patient
 * batches. At tenant scale that was 102,284 ids -> 102,287 bind variables:
 *
 *   Assertion violation on the database: `too many bind variables in prepared statement,
 *   expected maximum of 32767, received 102287`
 *
 * `trialMatchLifecycle.test.ts` already proved the DECISIONS were right - including the idempotency
 * property that a no-change pass returns `confirm` for every pair. What had no test was the write
 * phase that turns those decisions into database calls. These tests sit exactly on that seam.
 *
 * WHY THESE FAIL ON THE PRE-FIX CODE, mechanically:
 *   - `splits ... never exceeding the limit` asserts the maximum ids handed to any single write. The
 *     unchunked runner made ONE call with the whole list, so the observed maximum was the list length
 *     (102,284 > 32,767) and the assertion fails. This is the defect stated as a property, not as a
 *     reproduction of one error string.
 *   - `applies EVERY id` asserts the union of ids across all writes equals the input set, so a
 *     chunker that silently dropped or duplicated a chunk fails even though nothing threw. Not
 *     throwing is not the property; applying every id is.
 *   - `tally ... sums applied counts` fails against any implementation that reports `toConfirm.length`
 *     rather than summing what the writes actually matched.
 *   - `idempotency above the limit` is the production scenario at production scale: 40,000 pairs, all
 *     unchanged. Pre-fix this is precisely the run that died.
 */
import {
  applyWritePhase, evaluateCompleteness, MatchPayload, TrialMatchWriter, WritePlan,
} from '../../src/services/trialMatchLifecycle';
import { chunk, applyInChunks, ID_CHUNK_SIZE, PG_MAX_BIND_VARIABLES } from '../../src/lib/dbChunk';

/** Records what each write was actually handed, so the assertions can be about ids, not call counts. */
function recordingWriter(overrides: Partial<TrialMatchWriter> = {}) {
  const confirmCalls: string[][] = [];
  const created: MatchPayload[] = [];
  const superseded: Array<{ rowId: string; supersededBy: string; reason: string }> = [];
  let nextId = 0;

  const writer: TrialMatchWriter = {
    async create(payload) {
      created.push(payload);
      return { id: `new-${++nextId}` };
    },
    async confirm(ids) {
      confirmCalls.push([...ids]);
      return ids.length;
    },
    async supersede(rowId, supersededBy, reason) {
      superseded.push({ rowId, supersededBy, reason });
      return 1;
    },
    ...overrides,
  };
  return { writer, confirmCalls, created, superseded };
}

const payload = (patientId: string, trialId = 't1'): MatchPayload => ({
  patientId,
  trialId,
  status: 'ELIGIBLE',
  criteriaResults: [],
  indeterminateSignals: [],
});

const plan = (over: Partial<WritePlan> = {}): WritePlan => ({
  toCreate: [],
  toConfirm: [],
  toSupersede: [],
  ...over,
});

const COMPLETE = evaluateCompleteness(100, 100);
const ids = (n: number, prefix = 'row'): string[] =>
  Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

describe('AUDIT-228 chunk()', () => {
  it('states PostgreSQL limit and keeps real headroom below it', () => {
    expect(PG_MAX_BIND_VARIABLES).toBe(32767);
    expect(ID_CHUNK_SIZE).toBeLessThan(PG_MAX_BIND_VARIABLES);
    // Headroom is the point, not merely being under the ceiling: a `where id in (...)` is never the
    // only bound parameter, so a chunk sized AT the limit re-breaks the moment a predicate is added.
    expect(ID_CHUNK_SIZE).toBeLessThanOrEqual(PG_MAX_BIND_VARIABLES / 4);
  });

  it('partitions exactly - every element once, order preserved, no empty tail', () => {
    const input = ids(25);
    const parts = chunk(input, 10);
    expect(parts.map(p => p.length)).toEqual([10, 10, 5]);
    expect(parts.flat()).toEqual(input);
  });

  it('returns no chunks for an empty list, so callers need no emptiness guard', () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it('refuses a nonsensical size rather than looping forever', () => {
    expect(() => chunk(ids(3), 0)).toThrow(/size must be >= 1/);
  });

  it('applyInChunks sums per-chunk counts rather than assuming the input length', () => {
    // Second chunk reports fewer rows matched than it was handed - a row a concurrent actor moved.
    // The sum must reflect what was applied, not what was planned.
    const seen: number[] = [];
    return applyInChunks(ids(25), 10, async (batch) => {
      seen.push(batch.length);
      return seen.length === 2 ? batch.length - 3 : batch.length;
    }).then(total => {
      expect(seen).toEqual([10, 10, 5]);
      expect(total).toBe(22);
    });
  });
});

describe('AUDIT-228 write phase: confirm is chunked below the bind-variable limit', () => {
  it('splits a list that exceeds the limit, never exceeding it in any single write', async () => {
    const toConfirm = ids(102_284); // the exact production list size that failed
    const { writer, confirmCalls } = recordingWriter();

    await applyWritePhase(writer, plan({ toConfirm }), COMPLETE);

    expect(confirmCalls.length).toBeGreaterThan(1);
    const largest = Math.max(...confirmCalls.map(c => c.length));
    // THE assertion. Pre-fix this was 102,284 in one call.
    expect(largest).toBeLessThan(PG_MAX_BIND_VARIABLES);
    expect(largest).toBeLessThanOrEqual(ID_CHUNK_SIZE);
  });

  it('is split AND fully applied - every id written exactly once, every write under the limit', async () => {
    // Both halves in one assertion because either alone is satisfiable by a broken implementation:
    // one unchunked call applies every id (and dies in postgres); a chunker that dropped a chunk
    // stays under the limit (and silently loses work). The conjunction is the property.
    const toConfirm = ids(102_284);
    const { writer, confirmCalls } = recordingWriter();

    await applyWritePhase(writer, plan({ toConfirm }), COMPLETE);

    const written = confirmCalls.flat();
    expect(written).toHaveLength(toConfirm.length);
    expect(new Set(written).size).toBe(toConfirm.length); // no id written twice
    expect(written).toEqual(toConfirm);                   // none dropped, order preserved
    for (const call of confirmCalls) expect(call.length).toBeLessThan(PG_MAX_BIND_VARIABLES);
  });

  it('makes no write at all when there is nothing to confirm', async () => {
    const { writer, confirmCalls } = recordingWriter();
    await applyWritePhase(writer, plan(), COMPLETE);
    expect(confirmCalls).toEqual([]);
  });

  it('does not chunk a list that already fits, so small runs cost one round trip', async () => {
    const { writer, confirmCalls } = recordingWriter();
    await applyWritePhase(writer, plan({ toConfirm: ids(ID_CHUNK_SIZE) }), COMPLETE);
    expect(confirmCalls).toHaveLength(1);
  });
});

describe('AUDIT-228 tally aggregation across chunks', () => {
  it('sums the confirmed count across every chunk', async () => {
    const toConfirm = ids(102_284);
    const { writer } = recordingWriter();

    const out = await applyWritePhase(writer, plan({ toConfirm }), COMPLETE);

    expect(out.confirmed).toBe(102_284);
  });

  it('reports what was APPLIED, not what was planned, when a chunk matches fewer rows', async () => {
    // One chunk matches 7 fewer rows than it was handed (rows another actor superseded between the
    // walk and the write). A tally derived from `toConfirm.length` would hide that; the run record
    // must show it, because a silent partial success is the thing this finding is about.
    let call = 0;
    const { writer } = recordingWriter({
      async confirm(batch) { return ++call === 2 ? batch.length - 7 : batch.length; },
    });

    const out = await applyWritePhase(writer, plan({ toConfirm: ids(12_000) }), COMPLETE);

    expect(out.confirmed).toBe(12_000 - 7);
  });

  it('counts creates and supersessions independently of the confirm chunking', async () => {
    const { writer, created, superseded } = recordingWriter();
    const out = await applyWritePhase(writer, plan({
      toCreate: [payload('p1'), payload('p2')],
      toConfirm: ids(7_500),
      toSupersede: [{ rowId: 'old-1', reason: 'clock', next: payload('p3') }],
    }), COMPLETE);

    // `created` counts NEW-PAIR creates only. The row inserted as the second half of a
    // supersede-then-insert is counted under `superseded`, not double-counted here - that is the
    // pre-existing tally semantic and this pins it so the refactor did not quietly change it.
    expect(out).toEqual({ created: 2, confirmed: 7_500, superseded: 1, supersessionWithheld: false });
    // 3 inserts actually happen: 2 plain creates + 1 supersede-then-insert, linked to the row it replaced.
    expect(created).toHaveLength(3);
    expect(superseded).toEqual([{ rowId: 'old-1', supersededBy: 'new-3', reason: 'clock' }]);
  });

  it('withholds supersession under the completeness gate while still confirming (AUDIT-193 class)', async () => {
    const { writer, superseded } = recordingWriter();
    const out = await applyWritePhase(writer, plan({
      toConfirm: ids(40_000),
      toSupersede: [{ rowId: 'old-1', reason: 'state', next: payload('p1') }],
    }), evaluateCompleteness(10, 100));

    expect(out.supersessionWithheld).toBe(true);
    expect(out.superseded).toBe(0);
    expect(superseded).toEqual([]);
    expect(out.confirmed).toBe(40_000); // confirmations are NOT withheld
  });
});

describe('AUDIT-228 idempotency above the bind-variable limit', () => {
  it('a no-change pass over a >32,767 id set confirms all and supersedes none', async () => {
    // The production steady state, at production scale: every pair unchanged, so the plan is pure
    // confirmations. This is the exact run that died pre-fix - it is not a synthetic edge case, it is
    // what every refresh after the first one looks like.
    const toConfirm = ids(40_000);
    expect(toConfirm.length).toBeGreaterThan(PG_MAX_BIND_VARIABLES);
    const { writer, confirmCalls, created, superseded } = recordingWriter();

    const out = await applyWritePhase(writer, plan({ toConfirm }), COMPLETE);

    expect(out).toEqual({
      created: 0, confirmed: 40_000, superseded: 0, supersessionWithheld: false,
    });
    expect(created).toEqual([]);
    expect(superseded).toEqual([]);
    expect(confirmCalls.flat()).toEqual(toConfirm);
    expect(Math.max(...confirmCalls.map(c => c.length))).toBeLessThan(PG_MAX_BIND_VARIABLES);
  });

  it('re-running the same no-change pass writes the same ids and creates nothing new', async () => {
    const toConfirm = ids(40_000);
    const first = recordingWriter();
    const second = recordingWriter();

    const a = await applyWritePhase(first.writer, plan({ toConfirm }), COMPLETE);
    const b = await applyWritePhase(second.writer, plan({ toConfirm }), COMPLETE);

    expect(b).toEqual(a);
    expect(second.confirmCalls.flat()).toEqual(first.confirmCalls.flat());
    expect(second.created).toEqual([]);
  });

  it('propagates a failing chunk instead of reporting a partial success', async () => {
    // The caller closes its run record as FAILED on this throw (refreshTrialMatches.closeActiveRunFailed).
    // What must never happen is applyWritePhase swallowing it and returning a count that looks complete.
    let call = 0;
    const { writer } = recordingWriter({
      async confirm(batch) {
        if (++call === 3) throw new Error('too many bind variables in prepared statement');
        return batch.length;
      },
    });

    await expect(applyWritePhase(writer, plan({ toConfirm: ids(40_000) }), COMPLETE))
      .rejects.toThrow(/bind variables/);
    expect(call).toBe(3); // stopped at the failing chunk, did not press on
  });
});
