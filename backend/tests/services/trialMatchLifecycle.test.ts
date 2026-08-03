/**
 * TrialMatch version-and-supersede lifecycle + three-way discriminator.
 *
 * These pin the properties the design doc argues for, so a future edit that "simplifies" any of them
 * fails here rather than in production:
 *   - an unchanged verdict CONFIRMS and writes no row (the property that keeps a nightly refresh from
 *     adding ~102K rows every night regardless of whether anything moved);
 *   - a changed verdict SUPERSEDES with a reason, never overwrites;
 *   - criteria is checked FIRST and does not consult the clock probe;
 *   - a truncated run supersedes NOTHING.
 */
import {
  REFRESH_ACTOR, COMPLETENESS_MIN_FRACTION,
  decideAction, classifySupersession, evaluateCompleteness, emptyTallies, assertFullScan,
  StoredMatch, TrialMatchStatus,
} from '../../src/services/trialMatchLifecycle';
import { SYSTEM_ACTOR_PREFIX } from '../../src/services/gapResolutionActor';

const HASH_A = 'aaaa1111bbbb2222';
const HASH_B = 'cccc3333dddd4444';

const stored = (over: Partial<StoredMatch> = {}): StoredMatch => ({
  id: 'row-1',
  patientId: 'p1',
  trialId: 't1',
  status: 'INELIGIBLE',
  criteriaVersion: HASH_A,
  evaluatedAt: new Date('2026-08-01T00:00:00Z'),
  ...over,
});

describe('decideAction: create / confirm / supersede', () => {
  it('CREATE when no verdict is stored for this (patient, trial)', () => {
    expect(decideAction(undefined, 'ELIGIBLE', HASH_A, false)).toEqual({ kind: 'create' });
  });

  it('CONFIRM when the verdict is unchanged - no new row is written', () => {
    const a = decideAction(stored({ status: 'INELIGIBLE' }), 'INELIGIBLE', HASH_A, false);
    expect(a).toEqual({ kind: 'confirm', rowId: 'row-1' });
    expect(a.kind).not.toBe('create'); // the anti-row-explosion property, stated explicitly
  });

  it('CONFIRM even when the criteria hash changed, so long as the VERDICT did not', () => {
    // A criteria edit that does not move this patient's verdict is not a supersession event - there
    // is nothing to explain, and writing a row would be noise.
    expect(decideAction(stored(), 'INELIGIBLE', HASH_B, false)).toEqual({ kind: 'confirm', rowId: 'row-1' });
  });

  it('SUPERSEDE when the verdict differs, carrying a reason', () => {
    const a = decideAction(stored({ status: 'INELIGIBLE' }), 'ELIGIBLE', HASH_A, true);
    expect(a).toEqual({ kind: 'supersede', rowId: 'row-1', reason: 'clock' });
  });

  it('every status transition supersedes (no verdict pair is silently skipped)', () => {
    const all: TrialMatchStatus[] = ['ELIGIBLE', 'INELIGIBLE', 'INDETERMINATE'];
    for (const from of all) {
      for (const to of all) {
        const a = decideAction(stored({ status: from }), to, HASH_A, false);
        expect(a.kind).toBe(from === to ? 'confirm' : 'supersede');
      }
    }
  });
});

describe('classifySupersession: the THREE-way discriminator, criteria first', () => {
  it('CRITERIA when the hashes differ - and the clock probe is IGNORED', () => {
    // Both probe values must yield 'criteria': a criteria change explains the flip completely, so
    // consulting the clock would be answering a question nobody asked.
    expect(classifySupersession(HASH_A, HASH_B, true)).toBe('criteria');
    expect(classifySupersession(HASH_A, HASH_B, false)).toBe('criteria');
  });

  it('CLOCK when criteria are unchanged and the old clock reproduces the old verdict', () => {
    expect(classifySupersession(HASH_A, HASH_A, true)).toBe('clock');
  });

  it('STATE when criteria are unchanged and the old clock does NOT reproduce it', () => {
    expect(classifySupersession(HASH_A, HASH_A, false)).toBe('state');
  });

  it('a NULL stored hash classifies as CRITERIA, never clock/state', () => {
    // A row written before provenance existed cannot be SHOWN to have had the same criteria, so
    // claiming clock or state would assert on absent data - the thing this platform refuses to do.
    expect(classifySupersession(null, HASH_A, true)).toBe('criteria');
    expect(classifySupersession(null, HASH_A, false)).toBe('criteria');
  });

  it('the three reasons are mutually exclusive and total', () => {
    const cases: Array<[string | null, string, boolean]> = [
      [HASH_A, HASH_B, true], [HASH_A, HASH_B, false],
      [HASH_A, HASH_A, true], [HASH_A, HASH_A, false],
      [null, HASH_A, true], [null, HASH_A, false],
    ];
    for (const [s, f, probe] of cases) {
      expect(['criteria', 'clock', 'state']).toContain(classifySupersession(s, f, probe));
    }
  });
});

describe('IDEMPOTENCY: the property a nightly refresh depends on', () => {
  it('a re-run with every verdict unchanged supersedes NOTHING and creates NOTHING', () => {
    const pairs = Array.from({ length: 250 }, (_, i) => stored({ id: `row-${i}`, patientId: `p${i}` }));
    const actions = pairs.map(s => decideAction(s, s.status, HASH_A, false));
    expect(actions.every(a => a.kind === 'confirm')).toBe(true);
    expect(actions.filter(a => a.kind === 'create')).toHaveLength(0);
    expect(actions.filter(a => a.kind === 'supersede')).toHaveLength(0);
  });

  it('only lastConfirmedAt moves on a no-change run (asserted via the action shape carrying a rowId)', () => {
    const a = decideAction(stored(), 'INELIGIBLE', HASH_A, false);
    expect(a).toHaveProperty('rowId', 'row-1');
    expect(a).not.toHaveProperty('reason');
  });
});

describe('completeness gate (AUDIT-193 class): a truncated run never mass-supersedes', () => {
  it('withholds below the threshold and says what it withheld', () => {
    const v = evaluateCompleteness(1200, 25571);
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/Supersession WITHHELD/);
    expect(v.message).toMatch(/creates and confirmations still applied/);
  });

  it('passes at or above the threshold', () => {
    expect(evaluateCompleteness(25571, 25571)).toEqual({ fraction: 1, ok: true });
    expect(evaluateCompleteness(9000, 10000).ok).toBe(true);   // exactly 0.9
    expect(evaluateCompleteness(8999, 10000).ok).toBe(false);  // just under
  });

  it('mirrors the gap-engine threshold (one number, one meaning across the platform)', () => {
    expect(COMPLETENESS_MIN_FRACTION).toBe(0.9);
  });

  it('an empty tenant is not a failure', () => {
    expect(evaluateCompleteness(0, 0)).toEqual({ fraction: 1, ok: true });
  });
});

describe('AUDIT-225 full-scan invariant', () => {
  it('aborts an EXECUTE that walked short', () => {
    expect(() => assertFullScan(25000, 25571, true)).toThrow(/skipped 571/);
  });
  it('passes a complete walk', () => {
    expect(() => assertFullScan(25571, 25571, true)).not.toThrow();
  });
  it('does not constrain a dry-run', () => {
    expect(() => assertFullScan(100, 25571, false)).not.toThrow();
  });
});

describe('actor convention', () => {
  it('the refresh actor carries the reserved system: prefix', () => {
    expect(REFRESH_ACTOR.startsWith(SYSTEM_ACTOR_PREFIX)).toBe(true);
    expect(REFRESH_ACTOR).toBe('system:trialmatch-refresh');
  });
});

describe('tallies', () => {
  it('start at zero across every counter', () => {
    expect(emptyTallies()).toEqual({
      trialsEvaluated: 0, patientsEvaluated: 0,
      matchesCreated: 0, matchesSuperseded: 0, matchesConfirmed: 0,
    });
  });
});
