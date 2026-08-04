/**
 * AUDIT-227: the eligible-patients endpoint must never load the tenant patient set unbounded.
 *
 * The defect, restated so the tests read against it: the handler ran
 *   patient.findMany({ where: { hospitalId, isActive: true }, include: {conditions, medications,
 *                      observations, procedures} })
 * with no take/skip/cursor, then mapped the matcher over the whole array. A 3,000-patient probe with
 * those four relations died exit 137 (OOM) at production task size; the tenant holds 25,571.
 *
 * Two test layers here:
 *   (1) a SOURCE guard proving the handler no longer issues an unbounded patient read and that no
 *       future edit can reintroduce one (the fixture-scale proof of the pattern - a unit test cannot
 *       allocate 25,571 patient graphs, but it CAN prove the query shape that caused it is gone);
 *   (2) unit tests over the pure paging primitives (cap enforcement, cursor stability, count parity).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, SUMMARY_BATCH_SIZE, SUMMARY_TIME_BUDGET_MS,
  resolvePageSize, resolveCursor, pageArgs, nextPage, budgetExhausted,
  emptyCounts, tally, totalEvaluated, MatchStatus,
} from '../../src/services/trialMatchPaging';

const ROUTE = fs.readFileSync(path.join(__dirname, '../../src/routes/trials.ts'), 'utf8');

describe('AUDIT-227 (1) source guard: no unbounded patient read remains on the trials route', () => {
  it('every patient.findMany in the route is BOUNDED (a literal take, or a pageArgs spread)', () => {
    // TRIALS PR 3 STRENGTHENED this rather than relaxing it. The aggregate paths no longer read
    // patients AT ALL - they read persisted verdicts - so `prisma.patient.findMany` may legitimately
    // be absent from this route now. The invariant was never "there is a bounded call", it is "there
    // is no UNBOUNDED call": vacuous at zero calls, asserted for each if any return.
    const calls = ROUTE.split('prisma.patient.findMany(').slice(1);
    for (const c of calls) {
      expect(c.slice(0, 600)).toMatch(/take:|\.\.\.pageArgs\(|\.\.\.matchPageArgs\(/);
    }
  });

  it('the match read is bounded too - the pivot MOVED the read, it did not unbound it', () => {
    const calls = ROUTE.split('prisma.trialMatch.findMany(').slice(1);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      // matchPageArgs always emits a `take` (unit-proven in trialsPr3PersistedRead.test.ts). The
      // `distinct` id query is bounded by the tenant's patient count by construction and loads no
      // relations - the shape that OOM'd - so it is exempted EXPLICITLY here, never silently.
      expect(c.slice(0, 400)).toMatch(/take:|\.\.\.matchPageArgs\(|distinct:/);
    }
  });

  it('the paged read uses the shared primitives, not a hand-rolled literal (one shape, one place)', () => {
    expect(ROUTE).toMatch(/trialMatchPaging/);
    expect(ROUTE).toMatch(/matchPageArgs\(/); // PR 3: keyset over persisted rows, still a shared primitive
    expect(ROUTE).toMatch(/resolvePageSize\(/);
  });

  it('the page size is CLAMPED from the query string - a caller cannot request an unbounded page', () => {
    expect(ROUTE).toMatch(/resolvePageSize\(req\.query\./);
  });

  it('the summary is an indexed READ of current rows and never returns patient rows', () => {
    // TRIALS PR 3 RETIRED the batched evaluation walk this used to assert. The batch walk was never a
    // virtue in itself - it was the least-bad way to bound an in-request evaluation costing 451s. The
    // counts are now a groupBy over persisted verdicts, so asserting SUMMARY_BATCH_SIZE would pin
    // scaffolding the fix removed. What must survive is the property the walk was protecting: counts
    // only, scoped to CURRENT rows, no patient identity anywhere on the payload.
    const summary = ROUTE.slice(ROUTE.indexOf("router.get('/summary'"));
    expect(summary).toMatch(/prisma\.trialMatch\.groupBy/);
    expect(summary).toMatch(/supersededAt: null/);
    const payloadRegion = summary.slice(0, summary.indexOf('res.json'));
    expect(payloadRegion).not.toMatch(/firstName|lastName|\bmrn\b/);
  });

  it('still tenant-scopes every patient read from the verified JWT (unchanged invariant)', () => {
    const calls = ROUTE.split('prisma.patient.findMany(').slice(1);
    for (const c of calls) {
      expect(c.slice(0, 300)).toMatch(/where:\s*\{\s*hospitalId/);
    }
  });
});

describe('AUDIT-227 (2a) page-size cap: the actual defense, not the default', () => {
  it('defaults when absent, blank, or unparseable', () => {
    expect(resolvePageSize(undefined)).toBe(PAGE_SIZE_DEFAULT);
    expect(resolvePageSize(null)).toBe(PAGE_SIZE_DEFAULT);
    expect(resolvePageSize('')).toBe(PAGE_SIZE_DEFAULT);
    expect(resolvePageSize('abc')).toBe(PAGE_SIZE_DEFAULT);
    expect(resolvePageSize(NaN)).toBe(PAGE_SIZE_DEFAULT);
  });

  it('CAPS an oversized request - the caller cannot opt back into the unbounded read', () => {
    expect(resolvePageSize(25571)).toBe(PAGE_SIZE_MAX);
    expect(resolvePageSize('999999')).toBe(PAGE_SIZE_MAX);
    expect(resolvePageSize(Infinity)).toBe(PAGE_SIZE_DEFAULT); // not finite -> default, still bounded
  });

  it('floors at 1 and truncates fractions (never 0, never negative, never fractional take)', () => {
    expect(resolvePageSize(0)).toBe(1);
    expect(resolvePageSize(-50)).toBe(1);
    expect(resolvePageSize(10.9)).toBe(10);
  });

  it('honors a sane explicit request', () => {
    expect(resolvePageSize(50)).toBe(50);
    expect(resolvePageSize('250')).toBe(250);
  });

  it('the cap is materially smaller than the tenant (the OOM cannot recur through this path)', () => {
    expect(PAGE_SIZE_MAX).toBeLessThan(3000); // the size that already died
    expect(SUMMARY_BATCH_SIZE).toBeLessThan(3000);
  });
});

describe('AUDIT-227 (2b) cursor stability: a page never repeats or drops a row', () => {
  const rows = (ids: string[]) => ids.map(id => ({ id }));

  it('the first page takes no cursor; subsequent pages skip PAST the cursor row', () => {
    expect(pageArgs(100)).toEqual({ take: 100, orderBy: { id: 'asc' } });
    expect(pageArgs(100, 'p-042')).toEqual({ take: 100, skip: 1, cursor: { id: 'p-042' }, orderBy: { id: 'asc' } });
  });

  it('a FULL page reports hasMore with the last id as the next cursor', () => {
    expect(nextPage(rows(['a', 'b', 'c']), 3)).toEqual({ nextCursor: 'c', hasMore: true });
  });

  it('a SHORT page ends the walk (no next cursor)', () => {
    expect(nextPage(rows(['a', 'b']), 3)).toEqual({ nextCursor: null, hasMore: false });
  });

  it('an EMPTY page ends the walk - the full-final-page case costs one empty request, never a dropped row', () => {
    expect(nextPage(rows([]), 3)).toEqual({ nextCursor: null, hasMore: false });
  });

  it('walking a fixture set page-by-page visits every id exactly once, in order', () => {
    // The fixture-scale proof of the pattern the 25,571-patient tenant needs.
    const all = Array.from({ length: 25 }, (_, i) => ({ id: `p-${String(i).padStart(3, '0')}` }));
    const pageSize = 4;
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 100; guard++) {
      const args = pageArgs(pageSize, cursor) as { take: number; skip?: number; cursor?: { id: string } };
      const startIdx = args.cursor ? all.findIndex(r => r.id === args.cursor!.id) + 1 : 0;
      const page = all.slice(startIdx, startIdx + args.take);
      seen.push(...page.map(r => r.id));
      const { nextCursor, hasMore } = nextPage(page, pageSize);
      if (!hasMore) break;
      cursor = nextCursor!;
    }
    expect(seen).toEqual(all.map(r => r.id));            // every row, in order
    expect(new Set(seen).size).toBe(all.length);          // none repeated
  });
});

describe('AUDIT-227 (2c) summary count parity: batched tallies equal a whole-set tally', () => {
  it('tally accumulates each state independently', () => {
    const c = emptyCounts();
    tally(c, 'ELIGIBLE'); tally(c, 'ELIGIBLE'); tally(c, 'INDETERMINATE');
    expect(c).toEqual({ ELIGIBLE: 2, INELIGIBLE: 0, INDETERMINATE: 1 });
  });

  it('PARITY: summing in batches equals summing the whole set (the property /summary rests on)', () => {
    // Uses the measured live distribution for the HFrEF trial as the fixture shape.
    const verdicts: MatchStatus[] = [
      ...Array<MatchStatus>(68).fill('ELIGIBLE'),
      ...Array<MatchStatus>(24319).fill('INELIGIBLE'),
      ...Array<MatchStatus>(1184).fill('INDETERMINATE'),
    ];
    const whole = verdicts.reduce((a, v) => tally(a, v), emptyCounts());

    const batched = emptyCounts();
    for (let i = 0; i < verdicts.length; i += SUMMARY_BATCH_SIZE) {
      for (const v of verdicts.slice(i, i + SUMMARY_BATCH_SIZE)) tally(batched, v);
    }
    expect(batched).toEqual(whole);
    expect(whole).toEqual({ ELIGIBLE: 68, INELIGIBLE: 24319, INDETERMINATE: 1184 });
    expect(totalEvaluated(whole)).toBe(25571); // the tenant's active-patient count
  });

  it('the Residual Lipid Risk distribution totals the same denominator (post-AUDIT-226 numbers)', () => {
    const c = { ELIGIBLE: 218, INELIGIBLE: 24798, INDETERMINATE: 555 };
    expect(totalEvaluated(c)).toBe(25571);
  });
});

describe('AUDIT-227 (2e) summary time budget: a partial is reported, never presented as a total', () => {
  it('does not stop before the budget is spent', () => {
    expect(budgetExhausted(1_000, 1_000)).toBe(false);
    expect(budgetExhausted(1_000, 1_000 + SUMMARY_TIME_BUDGET_MS - 1)).toBe(false);
  });

  it('stops at or past the budget', () => {
    expect(budgetExhausted(1_000, 1_000 + SUMMARY_TIME_BUDGET_MS)).toBe(true);
    expect(budgetExhausted(1_000, 1_000 + SUMMARY_TIME_BUDGET_MS + 5_000)).toBe(true);
  });

  it('the budget is well inside a normal HTTP timeout, and far below the measured full walk', () => {
    // Measured on the live tenant: a COMPLETE 4-trial walk of 25,571 patients took 451,143 ms.
    // An ALB idles out at 60s by default, so insisting on completeness would 504 - the AUDIT-227
    // failure mode in a different costume.
    expect(SUMMARY_TIME_BUDGET_MS).toBeLessThan(60_000);
    expect(SUMMARY_TIME_BUDGET_MS).toBeLessThan(451_143);
  });

  it('SUPERSEDED by TRIALS PR 3: the summary no longer budgets, because it no longer evaluates', () => {
    // This block used to assert `budgetExhausted(` and `complete = false` on the route. Both are GONE
    // deliberately - they existed only because the endpoint evaluated the tenant inside the request.
    // The assertion is INVERTED rather than deleted, so neither can creep back: a budget on an indexed
    // read would be cargo-cult, and `complete: false` on a population-true count would be a lie in the
    // honest-sounding direction, which is still a lie.
    //
    // The constants themselves stay exported and unit-tested above - they are the AUDIT-227 record of
    // what the measured 451s walk forced, and deleting that record would erase why this pivot happened.
    const summary = ROUTE.slice(
      ROUTE.indexOf("router.get('/summary'"),
      ROUTE.indexOf("router.get('/:trialId/referrals'"),
    );
    expect(summary).not.toMatch(/budgetExhausted/);
    expect(summary).not.toMatch(/complete:/);
    expect(summary).not.toMatch(/SUMMARY_BATCH_SIZE/);
    // What replaces it: population-true counts need a WHEN, not a how-much-of-it.
    expect(summary).toMatch(/asOf/);
    // patientsEvaluated survives as the screened DENOMINATOR (now population-true, not a partial).
    expect(summary).toMatch(/patientsEvaluated/);
  });
});

describe('AUDIT-227 (2d) cursor parsing', () => {
  it('treats absent/blank/non-string as "start from the beginning"', () => {
    expect(resolveCursor(undefined)).toBeUndefined();
    expect(resolveCursor('')).toBeUndefined();
    expect(resolveCursor('   ')).toBeUndefined();
    expect(resolveCursor(42)).toBeUndefined();
  });

  it('passes a real cursor through, trimmed', () => {
    expect(resolveCursor(' clx123 ')).toBe('clx123');
  });
});
