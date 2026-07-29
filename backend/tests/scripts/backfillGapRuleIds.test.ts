/**
 * AUDIT-222 backfill mapper: attribution over the three buckets measured on production
 * (demo-synthea-threaded, 65,251 rows at the 2026-07-29 snapshot):
 *
 *   exact   53,266 (81.6%)  - stored status matches a literal gaps.push status
 *   pattern  7,856 (12.0%)  - ternary/template families whose stored text carries interpolated values
 *   orphan   4,129 ( 6.3%)  - AUDIT-195/196 lipid-consolidation residue; NO current rule emits them
 *
 * Orphans are left ruleId NULL by operator ruling (2026-07-29) and dispositioned in PR-B
 * (retire-with-reason). This suite proves each bucket resolves the way the design note says it does.
 */
import {
  attributeStatus,
  assertBackfillProgress,
  resolveBuildSha,
  DEFAULT_TENANT,
  BackfillCounts,
} from '../../src/scripts/backfillGapRuleIds';
import { RULE_ID_BY_STATUS, PATTERN_ATTRIBUTIONS } from '../../src/ingestion/gaps/ruleIdAttribution';

describe('AUDIT-222 attribution: exact bucket', () => {
  it('maps a literal stored status to its frozen ruleId', () => {
    const status = 'Consider echocardiography for LVEF assessment in CAD';
    expect(RULE_ID_BY_STATUS[status]).toBeDefined();
    expect(attributeStatus(status)).toEqual({ kind: 'exact', ruleId: RULE_ID_BY_STATUS[status] });
  });

  it('covers every literal status the engine can emit', () => {
    // 358 literal gaps.push statuses; each must be attributable or historical rows orphan on re-run.
    expect(Object.keys(RULE_ID_BY_STATUS)).toHaveLength(358);
  });
});

describe('AUDIT-222 attribution: pattern bucket (interpolated / branch-varying statuses)', () => {
  it('attributes an interpolated-threshold anemia status', () => {
    const a = attributeStatus('Consider anemia workup for HF patient with hemoglobin <13 g/dL');
    const b = attributeStatus('Consider anemia workup for HF patient with hemoglobin <12 g/dL');
    expect(a.kind).toBe('pattern');
    expect(b.kind).toBe('pattern');
    expect(a).toEqual(b); // both interpolations resolve to ONE rule identity
  });

  it('attributes an interpolated GDMT-pillar-count status', () => {
    const r = attributeStatus('HFrEF GDMT substantially incomplete (2 of 4 pillars)');
    expect(r.kind).toBe('pattern');
    expect(attributeStatus('HFrEF GDMT substantially incomplete (3 of 4 pillars)')).toEqual(r);
  });

  it('attributes both branches of a ternary status to the same rule', () => {
    const plain = attributeStatus('Rate control agent not prescribed in AFib');
    const qualified = attributeStatus('Rate control agent not prescribed in AFib (HFrEF: avoid non-DHP CCB)');
    expect(plain.kind).toBe('pattern');
    expect(qualified).toEqual(plain);
  });

  it('attributes an interpolated sodium SAFETY_ALERT status', () => {
    expect(attributeStatus('Hyponatremia detected: sodium 129 mEq/L').kind).toBe('pattern');
  });

  it('has one pattern rule per dynamic-status push site', () => {
    expect(PATTERN_ATTRIBUTIONS).toHaveLength(10);
  });
});

describe('AUDIT-222 attribution: orphan bucket (PR-A leaves ruleId NULL)', () => {
  it('does NOT attribute the AUDIT-195/196 consolidation residue', () => {
    // 2,179 + 1,950 = 4,129 production rows. No current rule emits these statuses.
    expect(attributeStatus('Consider ezetimibe add-on for LDL not at goal on statin')).toEqual({ kind: 'orphan' });
    expect(
      attributeStatus('Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin'),
    ).toEqual({ kind: 'orphan' });
  });

  it('treats a null/empty status as an orphan rather than guessing', () => {
    expect(attributeStatus(null)).toEqual({ kind: 'orphan' });
    expect(attributeStatus('')).toEqual({ kind: 'orphan' });
  });

  it('never attributes an unknown status to an arbitrary rule', () => {
    expect(attributeStatus('a status no rule has ever emitted')).toEqual({ kind: 'orphan' });
  });
});

describe('AUDIT-222 backfill guards', () => {
  const counts = (o: Partial<BackfillCounts> = {}): BackfillCounts => ({
    scanned: 0, exact: 0, pattern: 0, orphan: 0, updated: 0, ...o,
  });

  it('an all-orphan pass is NOT a failure (nothing was attributable)', () => {
    expect(() => assertBackfillProgress(counts({ scanned: 10, orphan: 10 }), true)).not.toThrow();
  });

  it('a fully-backfilled tenant (0 scanned) is a clean no-op', () => {
    expect(() => assertBackfillProgress(counts(), true)).not.toThrow();
  });

  it('attributable rows that write nothing is a hard abort', () => {
    expect(() => assertBackfillProgress(counts({ scanned: 10, exact: 10, updated: 0 }), true)).toThrow(
      /updated 0 rows despite 10 attributable/,
    );
  });

  it('dry-run never trips the write tripwire', () => {
    expect(() => assertBackfillProgress(counts({ scanned: 10, exact: 10, updated: 0 }), false)).not.toThrow();
  });
});

describe('AUDIT-222 backfill vehicle + scope', () => {
  it('emits the baked build SHA, falling back to dev (AUDIT-221 self-attestation)', () => {
    expect(resolveBuildSha({ APP_GIT_SHA: 'abc123' } as NodeJS.ProcessEnv)).toBe('abc123');
    expect(resolveBuildSha({} as NodeJS.ProcessEnv)).toBe('dev');
  });

  it('defaults to the Synthea demo tenant literal (DRIFT-51)', () => {
    expect(DEFAULT_TENANT).toBe('demo-synthea-threaded');
  });
});
