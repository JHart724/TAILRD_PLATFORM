/**
 * AUDIT-222 consolidation-orphan retirement: targeting precision, suffix fidelity, idempotency,
 * and the throughput-metric exclusion this change's blast radius required.
 *
 * The retirement is a production mutation over 4,129 rows sitting beside 61,122 correctly-attributed ones.
 * Targeting precision is therefore the whole safety story: a predicate that is one condition too loose
 * would resolve live clinical gaps.
 */
import {
  isRetirementTarget,
  retiredStatus,
  assertFullScan,
  assertRetirementProgress,
  resolveBuildSha,
  RETIRED_STATUSES,
  SUPERSEDED_BY,
  DEFAULT_TENANT,
  RetirementCounts,
} from '../../src/scripts/retireConsolidationOrphans';
import {
  clinicianResolvedWhere,
  isSystemActor,
  SYSTEM_ACTOR_PREFIX,
  RETIREMENT_ACTOR,
  RETIREMENT_MARKER,
} from '../../src/services/gapResolutionActor';

const EZE = 'Consider ezetimibe add-on for LDL not at goal on statin';
const PCSK9 = 'Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin';

describe('AUDIT-222 retirement targeting precision', () => {
  it('targets a NULL-ruleId, unresolved row carrying an exact retired status', () => {
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: EZE })).toBe(true);
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: PCSK9 })).toBe(true);
  });

  it('NEVER targets an ATTRIBUTED row - those are live rule identities (61,122 of them)', () => {
    expect(isRetirementTarget({ ruleId: 'gap-cad-statin', resolvedAt: null, currentStatus: EZE })).toBe(false);
    expect(isRetirementTarget({ ruleId: 'slug:anything', resolvedAt: null, currentStatus: PCSK9 })).toBe(false);
  });

  it('NEVER targets an already-resolved row (clinician closure or a prior retirement)', () => {
    expect(isRetirementTarget({ ruleId: null, resolvedAt: new Date(), currentStatus: EZE })).toBe(false);
  });

  it('NEVER targets any other status, however similar', () => {
    // The consolidated SUCCESSOR must never be retired - that would delete the live recommendation.
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: SUPERSEDED_BY })).toBe(false);
    // Exact match only: no prefix/substring matching.
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: EZE + ' extra' })).toBe(false);
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: EZE.slice(0, -5) })).toBe(false);
    expect(
      isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: 'High-intensity statin not prescribed in CAD' }),
    ).toBe(false);
  });

  it('targets exactly the two AUDIT-195/196 statuses and no others', () => {
    expect(RETIRED_STATUSES).toHaveLength(2);
    expect([...RETIRED_STATUSES].sort()).toEqual([EZE, PCSK9].sort());
  });

  it('scopes to the Synthea demo tenant literal (DRIFT-51)', () => {
    expect(DEFAULT_TENANT).toBe('demo-synthea-threaded');
  });
});

describe('AUDIT-222 retirement suffix (supersede-not-overwrite)', () => {
  it('PRESERVES the original status text verbatim as a prefix', () => {
    const out = retiredStatus(EZE, '2026-07-29');
    expect(out.startsWith(EZE)).toBe(true);
  });

  it('carries the machine-recognizable marker, the date, and the superseding rule', () => {
    const out = retiredStatus(EZE, '2026-07-29');
    expect(out).toContain(RETIREMENT_MARKER);
    expect(out).toContain('2026-07-29');
    expect(out).toContain('AUDIT-195/196');
    expect(out).toContain(SUPERSEDED_BY);
  });

  it('is shape-idempotent: an already-suffixed status is never re-suffixed', () => {
    const once = retiredStatus(EZE, '2026-07-29');
    expect(retiredStatus(once, '2026-08-01')).toBe(once);
  });

  it('a retired status no longer matches the target predicate (run-level idempotency)', () => {
    const suffixed = retiredStatus(EZE, '2026-07-29');
    expect(isRetirementTarget({ ruleId: null, resolvedAt: null, currentStatus: suffixed })).toBe(false);
    // and with resolvedAt set, as the runner leaves it:
    expect(isRetirementTarget({ ruleId: null, resolvedAt: new Date(), currentStatus: suffixed })).toBe(false);
  });
});

describe('AUDIT-222 retirement guards', () => {
  const counts = (o: Partial<RetirementCounts> = {}): RetirementCounts => ({
    scanned: 0, targeted: 0, retired: 0,
    skippedAttributed: 0, skippedAlreadyResolved: 0, skippedOtherStatus: 0, ...o,
  });

  it('aborts on a short scan, execute-only (AUDIT-225 invariant)', () => {
    expect(() => assertFullScan(65126, 65251, true)).toThrow(/scanned 65126 of 65251 .* skipped 125/);
    expect(() => assertFullScan(65251, 65251, true)).not.toThrow();
    expect(() => assertFullScan(65126, 65251, false)).not.toThrow();
  });

  it('aborts when targets were found but nothing was written', () => {
    expect(() => assertRetirementProgress(counts({ targeted: 4129, retired: 0 }), true)).toThrow(
      /retired 0 rows despite 4129 targeted/,
    );
  });

  it('a zero-target pass is a clean no-op (the idempotent second run)', () => {
    expect(() => assertRetirementProgress(counts({ scanned: 65251, targeted: 0, retired: 0 }), true)).not.toThrow();
  });

  it('dry-run never trips the write tripwire', () => {
    expect(() => assertRetirementProgress(counts({ targeted: 4129, retired: 0 }), false)).not.toThrow();
  });

  it('emits the baked build SHA, falling back to dev (AUDIT-221)', () => {
    expect(resolveBuildSha({ APP_GIT_SHA: 'abc' } as NodeJS.ProcessEnv)).toBe('abc');
    expect(resolveBuildSha({} as NodeJS.ProcessEnv)).toBe('dev');
  });
});

describe('AUDIT-222 blast radius: throughput metrics exclude system resolutions', () => {
  it('reserves the system: prefix and recognises system actors', () => {
    expect(RETIREMENT_ACTOR.startsWith(SYSTEM_ACTOR_PREFIX)).toBe(true);
    expect(isSystemActor(RETIREMENT_ACTOR)).toBe(true);
    expect(isSystemActor('system:ruleid-backfill')).toBe(true);
    expect(isSystemActor('clu123userid')).toBe(false);
    expect(isSystemActor(null)).toBe(false);
    expect(isSystemActor(undefined)).toBe(false);
  });

  it('excludes system-resolved rows while KEEPING clinician rows and NULL-resolvedBy legacy rows', () => {
    const w = clinicianResolvedWhere({ resolvedAt: { not: null } });
    // The OR is what keeps NULL resolvedBy in scope: a bare `not startsWith` compiles to
    // NOT(col LIKE 'system:%'), which is NULL -> false for NULL columns, silently dropping real closures.
    expect(w.OR).toEqual([
      { resolvedBy: null },
      { resolvedBy: { not: { startsWith: 'system:' } } },
    ]);
    expect(w.resolvedAt).toEqual({ not: null });
  });

  it('preserves the caller base clause (module/tenant/window filters survive)', () => {
    const w = clinicianResolvedWhere({ hospitalId: 'h1', module: 'CORONARY_INTERVENTION', resolvedAt: { gte: new Date(0) } });
    expect(w.hospitalId).toBe('h1');
    expect(w.module).toBe('CORONARY_INTERVENTION');
    expect(w.resolvedAt).toEqual({ gte: new Date(0) });
  });

  it('refuses to silently clobber a base clause that already has a top-level OR', () => {
    expect(() => clinicianResolvedWhere({ OR: [{ hospitalId: 'a' }, { hospitalId: 'b' }] })).toThrow(
      /already has a top-level OR/,
    );
  });
});
