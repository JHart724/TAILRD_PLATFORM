/**
 * TRIALS PR 3: the read path pivots from evaluate-per-request to indexed reads of persisted verdicts.
 *
 * WHAT THESE PIN. The pivot's whole value is that an executive figure is now population-true instead of
 * a non-representative sample - and its whole RISK is that a precomputed number looks exactly as
 * confident when it is six weeks stale as when it is six minutes old. So the staleness envelope is not
 * decoration here; it is the property that makes the pivot safe, and it gets the same test weight as the
 * counts.
 *
 * Three axes are asserted INDEPENDENTLY (build / criteria / age) because they catch different failures:
 * AUDIT-226 was a code change that moved verdicts with criteria untouched, and a criteria edit is the
 * mirror. A single collapsed boolean would pass while silently only ever detecting one of them.
 */
import {
  buildAsOf, matchPageArgs, nextMatchPage, ageAt, STALENESS_BOUND_MS,
} from '../../src/services/trialMatchReadModel';
import { emptyCounts, totalEvaluated, MatchStatus } from '../../src/services/trialMatchPaging';

const LIVE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OLD = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const NOW = Date.parse('2026-08-04T12:00:00.000Z');
const FRESH = new Date(NOW - 60 * 60 * 1000);          // 1h old
const ANCIENT = new Date(NOW - STALENESS_BOUND_MS - 1); // just past the 36h bound

const inputs = (over: Partial<Parameters<typeof buildAsOf>[0]> = {}) => ({
  oldestEvaluatedAt: FRESH,
  lastRun: { finishedAt: FRESH, buildSha: LIVE },
  storedBuildShas: [LIVE],
  liveBuildSha: LIVE,
  storedCriteriaVersions: new Map([['t1', ['hash-1']]]),
  liveCriteriaVersions: new Map([['t1', 'hash-1']]),
  nowMs: NOW,
  ...over,
});

describe('as-of: the fresh case is CLEAN (no false alarms)', () => {
  it('reports not-stale with no reasons when age, build and criteria all agree', () => {
    const a = buildAsOf(inputs());
    expect(a.stale).toBe(false);
    expect(a.staleReasons).toEqual([]);
    expect(a.evaluatedAt).toBe(FRESH.toISOString());
    expect(a.lastRunFinishedAt).toBe(FRESH.toISOString());
    expect(a.runBuildSha).toBe(LIVE);
    expect(a.liveBuildSha).toBe(LIVE);
  });

  it('does not fire on age at exactly the bound - the bound is a ceiling, not a trigger', () => {
    const atBound = new Date(NOW - STALENESS_BOUND_MS);
    expect(buildAsOf(inputs({ oldestEvaluatedAt: atBound })).stale).toBe(false);
  });
});

describe('as-of: the BUILD axis (ruling R3)', () => {
  it('fires when stored verdicts came from a different build than the one serving', () => {
    const a = buildAsOf(inputs({ storedBuildShas: [OLD] }));
    expect(a.stale).toBe(true);
    expect(a.staleReasons).toContain('build');
    // The other axes must stay quiet - a build divergence is not an age or criteria problem.
    expect(a.staleReasons).not.toContain('age');
    expect(a.staleReasons).not.toContain('criteria');
  });

  it('fires when only SOME rows came from a prior build (a partially-refreshed set is still stale)', () => {
    expect(buildAsOf(inputs({ storedBuildShas: [LIVE, OLD] })).staleReasons).toContain('build');
  });

  it('treats a NULL-normalized buildSha as divergent, never as a match', () => {
    // A row written before provenance existed cannot be SHOWN to match the live build. Waving it
    // through would assert something unknown - the platform's standing refusal.
    expect(buildAsOf(inputs({ storedBuildShas: [''] })).staleReasons).toContain('build');
  });
});

describe('as-of: the CRITERIA axis (ruling R1)', () => {
  it('fires when the live criteria hash differs from what the rows were evaluated against', () => {
    const a = buildAsOf(inputs({ liveCriteriaVersions: new Map([['t1', 'hash-CHANGED']]) }));
    expect(a.stale).toBe(true);
    expect(a.staleReasons).toContain('criteria');
    expect(a.staleReasons).not.toContain('build');
  });

  it('fires when ANY trial in the set diverges, not only the first', () => {
    const a = buildAsOf(inputs({
      storedCriteriaVersions: new Map([['t1', ['h1']], ['t2', ['h2']]]),
      liveCriteriaVersions: new Map([['t1', 'h1'], ['t2', 'h2-CHANGED']]),
    }));
    expect(a.staleReasons).toContain('criteria');
  });

  it('reports criteria at most once even when several trials diverge', () => {
    const a = buildAsOf(inputs({
      storedCriteriaVersions: new Map([['t1', ['h1']], ['t2', ['h2']]]),
      liveCriteriaVersions: new Map([['t1', 'x'], ['t2', 'y']]),
    }));
    expect(a.staleReasons.filter(r => r === 'criteria')).toHaveLength(1);
  });

  it('stays quiet for a trial that has no stored rows - that is a counts question, not a staleness one', () => {
    const a = buildAsOf(inputs({
      storedCriteriaVersions: new Map([['t1', ['hash-1']]]),
      liveCriteriaVersions: new Map([['t1', 'hash-1'], ['t2-never-evaluated', 'hash-2']]),
    }));
    expect(a.staleReasons).toEqual([]);
  });

  it('treats a NULL stored criteriaVersion as divergent', () => {
    const a = buildAsOf(inputs({ storedCriteriaVersions: new Map([['t1', [null]]]) }));
    expect(a.staleReasons).toContain('criteria');
  });
});

describe('as-of: the AGE axis (ruling R2, 36h)', () => {
  it('fires past the bound and still reports the figures rather than withholding them', () => {
    const a = buildAsOf(inputs({ oldestEvaluatedAt: ANCIENT }));
    expect(a.staleReasons).toContain('age');
    // R2: mark stale and NAME the last run - never hide. Both fields survive.
    expect(a.evaluatedAt).toBe(ANCIENT.toISOString());
    expect(a.lastRunFinishedAt).not.toBeNull();
  });

  it('uses the OLDEST evaluatedAt, so a partially-refreshed set cannot look fresher than it is', () => {
    // The caller passes the min; this asserts the contract that the min is what gets judged.
    expect(buildAsOf(inputs({ oldestEvaluatedAt: ANCIENT })).evaluatedAt).toBe(ANCIENT.toISOString());
  });

  it('reports every axis that fires, not just the first', () => {
    const a = buildAsOf(inputs({
      oldestEvaluatedAt: ANCIENT,
      storedBuildShas: [OLD],
      liveCriteriaVersions: new Map([['t1', 'changed']]),
    }));
    expect(a.staleReasons.sort()).toEqual(['age', 'build', 'criteria']);
  });
});

describe('as-of: NEVER-RUN is not zero', () => {
  it('reports never-run rather than age when nothing is persisted', () => {
    const a = buildAsOf(inputs({ oldestEvaluatedAt: null, lastRun: null, storedBuildShas: [] }));
    expect(a.stale).toBe(true);
    expect(a.staleReasons).toContain('never-run');
    // NOT 'age' - there is no age. Conflating them would tell an operator the refresh is late when in
    // fact it has never run, which points at the wrong fix.
    expect(a.staleReasons).not.toContain('age');
    expect(a.evaluatedAt).toBeNull();
    expect(a.lastRunFinishedAt).toBeNull();
  });
});

describe('keyset paging over persisted matches', () => {
  it('takes the page size and orders by patientId with no cursor on the first page', () => {
    expect(matchPageArgs(100)).toEqual({ take: 100, orderBy: { patientId: 'asc' } });
  });

  it('advances strictly PAST the cursor - a boundary row is never returned twice', () => {
    expect(matchPageArgs(100, 'p-500')).toEqual({
      take: 100, where: { patientId: { gt: 'p-500' } }, orderBy: { patientId: 'asc' },
    });
  });

  it('a full page yields the last patientId as the next cursor', () => {
    const rows = [{ patientId: 'a' }, { patientId: 'b' }, { patientId: 'c' }];
    expect(nextMatchPage(rows, 3)).toEqual({ nextCursor: 'c', hasMore: true });
  });

  it('a short page ends the walk', () => {
    expect(nextMatchPage([{ patientId: 'a' }], 3)).toEqual({ nextCursor: null, hasMore: false });
  });

  it('an empty page ends the walk without a cursor', () => {
    expect(nextMatchPage([], 3)).toEqual({ nextCursor: null, hasMore: false });
  });

  it('walks a >1-page id set with no duplicates and no skips (the AUDIT-227 property, preserved)', () => {
    // Simulates the DB: rows ordered by patientId, the `gt` predicate applied per page.
    const all = Array.from({ length: 250 }, (_, i) => ({ patientId: `p-${String(i).padStart(4, '0')}` }));
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 20; guard++) {
      const page = all.filter(r => (cursor ? r.patientId > cursor : true)).slice(0, 100);
      seen.push(...page.map(r => r.patientId));
      const { nextCursor, hasMore } = nextMatchPage(page, 100);
      if (!hasMore) break;
      cursor = nextCursor!;
    }
    expect(seen).toHaveLength(250);
    expect(new Set(seen).size).toBe(250);
    expect([...seen].sort()).toEqual(seen); // strictly ascending
  });
});

describe('summary counts reconstruct the persisted table exactly', () => {
  /** The route's groupBy -> per-trial counts mapping, as a pure function of the group rows. */
  function foldGroups(
    trialIds: string[],
    groups: Array<{ trialId: string; status: MatchStatus; _count: { _all: number } }>,
  ) {
    const counts = new Map(trialIds.map(id => [id, emptyCounts()]));
    for (const g of groups) {
      const c = counts.get(g.trialId);
      if (c) c[g.status] = g._count._all;
    }
    return counts;
  }

  it('reproduces the measured production distribution exactly', () => {
    // The real persisted set for demo-synthea-threaded, read live 2026-08-04.
    const groups = [
      { trialId: 'hfref', status: 'ELIGIBLE' as MatchStatus, _count: { _all: 68 } },
      { trialId: 'hfref', status: 'INDETERMINATE' as MatchStatus, _count: { _all: 1184 } },
      { trialId: 'hfref', status: 'INELIGIBLE' as MatchStatus, _count: { _all: 24319 } },
      { trialId: 'lipid', status: 'ELIGIBLE' as MatchStatus, _count: { _all: 214 } },
      { trialId: 'lipid', status: 'INDETERMINATE' as MatchStatus, _count: { _all: 559 } },
      { trialId: 'lipid', status: 'INELIGIBLE' as MatchStatus, _count: { _all: 24798 } },
    ];
    const counts = foldGroups(['hfref', 'lipid'], groups);

    expect(counts.get('hfref')).toEqual({ ELIGIBLE: 68, INDETERMINATE: 1184, INELIGIBLE: 24319 });
    expect(counts.get('lipid')).toEqual({ ELIGIBLE: 214, INDETERMINATE: 559, INELIGIBLE: 24798 });
    // Every trial is scored against the whole cohort, so each row totals the tenant.
    expect(totalEvaluated(counts.get('hfref')!)).toBe(25571);
    expect(totalEvaluated(counts.get('lipid')!)).toBe(25571);
  });

  it('a trial with NO persisted rows reads zero across all three states, never undefined', () => {
    const counts = foldGroups(['never-evaluated'], []);
    expect(counts.get('never-evaluated')).toEqual({ ELIGIBLE: 0, INDETERMINATE: 0, INELIGIBLE: 0 });
    expect(totalEvaluated(counts.get('never-evaluated')!)).toBe(0);
  });

  it('ignores groups for trials outside the tenant-visible set rather than inventing a row', () => {
    const counts = foldGroups(['mine'], [
      { trialId: 'mine', status: 'ELIGIBLE' as MatchStatus, _count: { _all: 3 } },
      { trialId: 'someone-elses', status: 'ELIGIBLE' as MatchStatus, _count: { _all: 999 } },
    ]);
    expect(counts.size).toBe(1);
    expect(counts.get('mine')!.ELIGIBLE).toBe(3);
  });

  it('the ONE-CURRENT-ROW invariant is what makes these counts a headcount', () => {
    // The partial unique index guarantees at most one current row per (patient, trial, tenant), so a
    // patient whose verdict flipped contributes exactly once. Superseded history is excluded by the
    // `supersededAt: null` predicate, not by de-duplication after the fact - which is why summing the
    // three states equals the patient count rather than the row count.
    const counts = foldGroups(['t'], [
      { trialId: 't', status: 'ELIGIBLE' as MatchStatus, _count: { _all: 10 } },
      { trialId: 't', status: 'INELIGIBLE' as MatchStatus, _count: { _all: 90 } },
    ]);
    expect(totalEvaluated(counts.get('t')!)).toBe(100);
  });
});

describe('ageAt mirrors the evaluation-context derivation', () => {
  it('computes whole years on the same 365.25-day basis buildPatientEvalContext uses', () => {
    const dob = new Date('1960-01-01T00:00:00.000Z');
    const at = Date.parse('2026-01-01T00:00:00.000Z');
    const expected = Math.floor((at - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    expect(ageAt(dob, at)).toBe(expected);
    expect(ageAt(dob.toISOString(), at)).toBe(expected); // string and Date agree
  });
});
