/**
 * AUDIT-226: the med criterion must not assert a definite verdict on an unrepresentable drug class.
 *
 * The defect: `evaluateCriterion`'s med branch was single-stage - a no-match returned FAILED, never
 * UNEVALUABLE. Combined with AUDIT-201 precedence (a definite violation short-circuits to INELIGIBLE
 * ahead of INDETERMINATE), an inclusion criterion on a drug class the tenant cannot represent returned
 * a definite INELIGIBLE for EVERY patient - the mirror of the false-ELIGIBLE the matcher exists to
 * prevent. Measured live on demo-synthea-threaded (25,571 patients / 203,602 medication rows):
 * aspirin 0 patients, P2Y12 0, warfarin 0, DOAC 0 - by RxNorm AND by name, at any status.
 *
 * The fix mirrors the AUDIT-201 procedure guard: an EMPTY medCodes list is ambiguous (genuinely
 * unmedicated vs drug class not represented), so it is UNEVALUABLE with the class named. A NON-EMPTY
 * list is a populated signal in which a no-match is a genuine FAILED - which preserves the precedence
 * rule: a patient who IS on a contraindicated med still short-circuits to INELIGIBLE.
 */
import { evaluateTrialMatch, evaluateCriterion, TrialCriterion } from '../../src/services/trialMatchService';
import type { PatientEvalContext } from '../../src/ingestion/buildPatientEvalContext';

const ctx = (over: Partial<PatientEvalContext>): PatientEvalContext => ({
  dxCodes: [], labValues: {}, medCodes: [], meds: [], age: 60, gender: 'MALE', race: undefined, procedureCodes: [], ...over,
});
const trial = (criteria: TrialCriterion[]) => ({ id: 't', criteria });

// The classes the substrate cannot represent (measured 0 patients tenant-wide).
const ASPIRIN = ['1191', '243670', '198467'];
const P2Y12 = ['32968', '613391', '1116632'];
const WARFARIN = ['11289'];

describe('AUDIT-226: absent/unrepresentable drug class is UNEVALUABLE, never a definite verdict', () => {
  it('an EMPTY medCodes list yields UNEVALUABLE with the class named, not FAILED', () => {
    const c: TrialCriterion = { criterionId: 'on-dapt', polarity: 'inclusion', type: 'med', codes: P2Y12 };
    const r = evaluateCriterion(c, ctx({ medCodes: [] }));
    expect(r.verdict).toBe('UNEVALUABLE');
    expect(r.missingSignal).toBe('med');
  });

  it('THE REGRESSION: an antiplatelet inclusion criterion no longer returns a tenant-wide definite INELIGIBLE', () => {
    // This is the production shape: the tenant emits zero antiplatelet rows, so medCodes is empty for
    // every patient. Pre-fix this returned INELIGIBLE (definite, wrong). Post-fix: INDETERMINATE.
    const t = trial([
      { criterionId: 'cad', polarity: 'inclusion', type: 'dx', codes: ['I25'] },
      { criterionId: 'on-dapt', polarity: 'inclusion', type: 'med', codes: [...ASPIRIN, ...P2Y12] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I25.10'], medCodes: [] }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toContain('med');
    expect(r.criteriaResults.find(x => x.criterionId === 'on-dapt')!.verdict).toBe('UNEVALUABLE');
  });

  it('an anticoagulant EXCLUSION on an empty list is UNEVALUABLE -> INDETERMINATE, never ELIGIBLE', () => {
    // An unevaluable exclusion must never resolve to ELIGIBLE - the same property AUDIT-201 protects.
    const t = trial([
      { criterionId: 'af', polarity: 'inclusion', type: 'dx', codes: ['I48'] },
      { criterionId: 'no-oac', polarity: 'exclusion', type: 'med', codes: WARFARIN },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I48.0'], medCodes: [] }));
    expect(r.status).toBe('INDETERMINATE');
  });

  it('PRECEDENCE PRESERVED: a genuinely-present contraindicated med still short-circuits to INELIGIBLE', () => {
    // medCodes is NON-EMPTY and contains the excluded drug - a real violation on real data.
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },
      { criterionId: 'sglt2i-naive', polarity: 'exclusion', type: 'med', codes: ['1488564'] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.22'], medCodes: ['1488564', '83367'] }));
    expect(r.status).toBe('INELIGIBLE');
  });

  it('PRECEDENCE PRESERVED: a NON-EMPTY list that lacks the drug is a genuine FAILED, not UNEVALUABLE', () => {
    // The patient demonstrably has a medication list; a no-match there is real evidence of absence.
    const c: TrialCriterion = { criterionId: 'on-statin', polarity: 'inclusion', type: 'med', codes: ['83367'] };
    const r = evaluateCriterion(c, ctx({ medCodes: ['1488564'] }));
    expect(r.verdict).toBe('FAILED');
    expect(r.missingSignal).toBeUndefined();
  });

  it('a NON-EMPTY list that contains the drug is MET (unchanged)', () => {
    const c: TrialCriterion = { criterionId: 'on-statin', polarity: 'inclusion', type: 'med', codes: ['83367'] };
    expect(evaluateCriterion(c, ctx({ medCodes: ['83367'] })).verdict).toBe('MET');
  });

  it('the existing ELIGIBLE path still works when the med signal is populated', () => {
    // Guards against the fix over-reaching into a tenant-wide INDETERMINATE.
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
      { criterionId: 'sglt2i-naive', polarity: 'exclusion', type: 'med', codes: ['1488564'] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.22'], labValues: { lvef: 30 }, medCodes: ['83367'] }));
    expect(r.status).toBe('ELIGIBLE');
    expect(r.indeterminateSignals).toEqual([]);
  });
});

describe('AUDIT-226 companion: Tranche 3 Slice 1 derived signals are usable as trial criteria', () => {
  it('months_since_pci is an evaluable lab slug (was UNEVALUABLE before it joined the allowlist)', () => {
    const c: TrialCriterion = { criterionId: 'recent-pci', polarity: 'inclusion', type: 'lab', slug: 'months_since_pci', op: '<=', value: 3 };
    const r = evaluateCriterion(c, ctx({ labValues: { months_since_pci: 2 } }));
    expect(r.verdict).toBe('MET');
  });

  it('ncs_after_pci_months is an evaluable lab slug', () => {
    const c: TrialCriterion = { criterionId: 'ncs-window', polarity: 'inclusion', type: 'lab', slug: 'ncs_after_pci_months', op: '<', value: 6 };
    expect(evaluateCriterion(c, ctx({ labValues: { ncs_after_pci_months: 2 } })).verdict).toBe('MET');
  });

  it('a threaded slug with NO value for this patient is still UNEVALUABLE (unchanged)', () => {
    const c: TrialCriterion = { criterionId: 'recent-pci', polarity: 'inclusion', type: 'lab', slug: 'months_since_pci', op: '<=', value: 3 };
    const r = evaluateCriterion(c, ctx({ labValues: {} }));
    expect(r.verdict).toBe('UNEVALUABLE');
    expect(r.missingSignal).toBe('months_since_pci');
  });

  it('FAIL-SAFE PRESERVED: an unknown slug is still UNEVALUABLE, never a false MET', () => {
    for (const slug of ['pasp', 'valve_severity', 'sts_score', 'not_a_real_slug']) {
      const c: TrialCriterion = { criterionId: 'x', polarity: 'inclusion', type: 'lab', slug, op: '>=', value: 1 };
      const r = evaluateCriterion(c, ctx({ labValues: { [slug]: 999 } as any }));
      expect(r.verdict).toBe('UNEVALUABLE');
      expect(r.missingSignal).toBe(slug);
    }
  });
});
