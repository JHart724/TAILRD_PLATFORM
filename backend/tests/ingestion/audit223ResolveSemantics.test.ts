/**
 * AUDIT-223 resolve semantics + AUDIT-222 shadow dedupe + AUDIT-224 run record.
 *
 * Resolve ends append-only, which was the previous safety property. These tests pin the properties that
 * replace it: never resolve a clinician-touched row, never resolve on a truncated run, record WHY each
 * resolution happened, and leave a durable run record.
 */
import {
  selectResolveTargets, classifyResolveReason, resolvedStatus, evaluateCompleteness,
  isClinicianTouched, RESOLVE_ACTOR, RESOLVE_MARKER, COMPLETENESS_MIN_FRACTION, StoredOpenRow,
} from '../../src/ingestion/gapResolvePass';
import {
  selectDuplicatesToResolve, dedupedStatus, assertFullScan, DEDUPE_ACTOR, DupRow,
} from '../../src/scripts/dedupeShadowGapRows';
import { clinicianResolvedWhere, SYSTEM_ACTOR_PREFIX } from '../../src/services/gapResolutionActor';

const D = (s: string) => new Date(s);
const row = (o: Partial<StoredOpenRow> & { id: string }): StoredOpenRow => ({
  ruleId: 'gap-x', currentStatus: 'Some recommendation', identifiedAt: D('2026-01-01'), resolvedBy: null, ...o,
});

describe('AUDIT-223 preservation guard: clinician-touched rows are never resolved', () => {
  it('treats a REFERRED/DEFERRED row as touched even though it is still OPEN', () => {
    // routes/gaps.ts sets resolvedBy for ALL FOUR actions but resolvedAt only for INITIATED/CONTRAINDICATED.
    // So resolvedAt is the WRONG guard - a deferred gap is open, and auto-resolving it is the harm to avoid.
    expect(isClinicianTouched('clu_user_123')).toBe(true);
    expect(isClinicianTouched(null)).toBe(false);
    expect(isClinicianTouched(RESOLVE_ACTOR)).toBe(false); // system actors are not clinicians
  });

  it('excludes a clinician-touched row from the resolve set', () => {
    const stored = [
      row({ id: 'deferred', ruleId: 'gap-a', resolvedBy: 'clu_user_123' }),
      row({ id: 'untouched', ruleId: 'gap-b' }),
    ];
    const targets = selectResolveTargets(stored, new Set<string>()); // nothing fires any more
    expect(targets.map(t => t.id)).toEqual(['untouched']);
  });

  it('never resolves a row whose rule still fires', () => {
    const stored = [row({ id: 'still-firing', ruleId: 'gap-a' })];
    expect(selectResolveTargets(stored, new Set(['gap-a']))).toHaveLength(0);
  });

  it('never resolves a NULL-ruleId row (no identity to reason about)', () => {
    const stored = [row({ id: 'orphan', ruleId: null })];
    expect(selectResolveTargets(stored, new Set<string>())).toHaveLength(0);
  });

  it('a system actor from a PRIOR system pass does not block a later resolve', () => {
    // e.g. a row the dedupe touched is still system-owned, not clinician-owned.
    expect(isClinicianTouched(DEDUPE_ACTOR)).toBe(false);
    expect(isClinicianTouched(`${SYSTEM_ACTOR_PREFIX}anything`)).toBe(false);
  });
});

describe('AUDIT-223 completeness gate (AUDIT-193 class)', () => {
  it('withholds resolving when the walk covered too few patients', () => {
    const v = evaluateCompleteness(100, 25571);
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/Resolve pass WITHHELD/);
    expect(v.message).toMatch(/creates and updates still applied/);
  });

  it('passes at or above the threshold and reports the fraction', () => {
    expect(evaluateCompleteness(25571, 25571)).toEqual({ fraction: 1, ok: true });
    expect(evaluateCompleteness(9000, 10000).ok).toBe(true);   // exactly 0.9
    expect(evaluateCompleteness(8999, 10000).ok).toBe(false);  // just under
  });

  it('mirrors the patientWriter threshold', () => {
    expect(COMPLETENESS_MIN_FRACTION).toBe(0.9);
  });

  it('an empty tenant is not a failure', () => {
    expect(evaluateCompleteness(0, 0)).toEqual({ fraction: 1, ok: true });
  });
});

describe('AUDIT-223 resolve reason: the two-clock discriminator is recorded, not collapsed', () => {
  it('fired at identifiedAt but not now => clock', () => {
    expect(classifyResolveReason(true)).toBe('clock');
  });

  it('fired at neither clock => state', () => {
    expect(classifyResolveReason(false)).toBe('state');
  });

  it('the reason is written into the status and the two read differently', () => {
    const clock = resolvedStatus('Consider X', 'clock', '2026-07-30');
    const state = resolvedStatus('Consider X', 'state', '2026-07-30');
    expect(clock).toContain('staleness window elapsed');
    expect(state).toContain('patient data no longer supports it');
    expect(clock).not.toEqual(state);
  });

  it('preserves the original status text verbatim as a prefix, and is shape-idempotent', () => {
    const once = resolvedStatus('Consider X', 'state', '2026-07-30');
    expect(once.startsWith('Consider X')).toBe(true);
    expect(once).toContain(RESOLVE_MARKER);
    expect(resolvedStatus(once, 'clock', '2026-08-01')).toBe(once);
  });
});

describe('AUDIT-222 shadow dedupe', () => {
  const dup = (o: Partial<DupRow> & { id: string }): DupRow => ({
    patientId: 'p1', ruleId: 'gap-cad-statin', identifiedAt: D('2026-01-01'),
    resolvedAt: null, currentStatus: 'High-intensity statin not prescribed in CAD', ...o,
  });

  it('keeps the MOST RECENT open row per (patient, rule) and targets the rest', () => {
    const rows = [
      dup({ id: 'old', identifiedAt: D('2026-01-01') }),
      dup({ id: 'new', identifiedAt: D('2026-06-01') }),
      dup({ id: 'mid', identifiedAt: D('2026-03-01') }),
    ];
    expect(selectDuplicatesToResolve(rows).map(r => r.id).sort()).toEqual(['mid', 'old']);
  });

  it('leaves singleton pairs alone', () => {
    expect(selectDuplicatesToResolve([dup({ id: 'only' })])).toHaveLength(0);
  });

  it('never crosses patients or rules', () => {
    const rows = [
      dup({ id: 'p1-a', patientId: 'p1', ruleId: 'gap-a' }),
      dup({ id: 'p2-a', patientId: 'p2', ruleId: 'gap-a' }),
      dup({ id: 'p1-b', patientId: 'p1', ruleId: 'gap-b' }),
    ];
    expect(selectDuplicatesToResolve(rows)).toHaveLength(0);
  });

  it('ignores already-resolved and NULL-ruleId rows', () => {
    const rows = [
      dup({ id: 'open' }),
      dup({ id: 'closed', resolvedAt: D('2026-05-01') }),
      dup({ id: 'orphan', ruleId: null }),
    ];
    expect(selectDuplicatesToResolve(rows)).toHaveLength(0); // only ONE open row in the pair
  });

  it('is deterministic on exact identifiedAt ties', () => {
    const rows = [dup({ id: 'aaa' }), dup({ id: 'bbb' })];
    const once = selectDuplicatesToResolve(rows).map(r => r.id);
    const twice = selectDuplicatesToResolve([...rows].reverse()).map(r => r.id);
    expect(once).toEqual(twice);
  });

  it('is idempotent: resolving the targets removes them from the open set', () => {
    const rows = [dup({ id: 'old' }), dup({ id: 'new', identifiedAt: D('2026-06-01') })];
    const targets = selectDuplicatesToResolve(rows);
    for (const t of targets) { const r = rows.find(x => x.id === t.id)!; r.resolvedAt = D('2026-07-30'); }
    expect(selectDuplicatesToResolve(rows)).toHaveLength(0);
  });

  it('preserves original text under the dedupe marker, shape-idempotent', () => {
    const once = dedupedStatus('High-intensity statin not prescribed in CAD', '2026-07-30');
    expect(once.startsWith('High-intensity statin not prescribed in CAD')).toBe(true);
    expect(dedupedStatus(once, '2026-08-01')).toBe(once);
  });

  it('carries the AUDIT-225 full-scan invariant', () => {
    expect(() => assertFullScan(65000, 67874, true)).toThrow(/skipped 2874/);
    expect(() => assertFullScan(67874, 67874, true)).not.toThrow();
    expect(() => assertFullScan(65000, 67874, false)).not.toThrow();
  });
});

describe('AUDIT-223 metric exclusion still holds for the NEW system actors', () => {
  it('all three system resolution actors carry the reserved prefix', () => {
    for (const a of [RESOLVE_ACTOR, DEDUPE_ACTOR, 'system:audit-222-retirement']) {
      expect(a.startsWith(SYSTEM_ACTOR_PREFIX)).toBe(true);
    }
  });

  it('the throughput filter excludes them BY CONSTRUCTION (prefix, not actor enumeration)', () => {
    // This is why no metric call-site changes when PR-B adds a new actor.
    const w = clinicianResolvedWhere({ resolvedAt: { not: null } });
    expect(w.OR).toEqual([
      { resolvedBy: null },
      { resolvedBy: { not: { startsWith: SYSTEM_ACTOR_PREFIX } } },
    ]);
  });
});
