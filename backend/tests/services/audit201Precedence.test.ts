/**
 * AUDIT-201 - INDETERMINATE-precedence refinement + the procedure UNEVALUABLE guard.
 *
 * Precedence change: a definite VIOLATION (inclusion FAILED / exclusion MET) short-circuits to INELIGIBLE
 * even when another criterion is UNEVALUABLE - a FAILED is a definite NEGATIVE on data we DO have, so
 * reporting it is more truthful than hiding it behind an unknown. INDETERMINATE only when NO violation and
 * >=1 unevaluable. ELIGIBLE unchanged (still requires anyUnevaluable === false).
 *
 * Because the swap promotes FAILED to load-bearing, every FAILED path had to rest on present/threaded data
 * first (section-20 close-the-class). The one unsafe path - procedure FAILED on an empty procedureCodes -
 * is now guarded: an empty procedure list is UNEVALUABLE (cannot distinguish "genuinely none" from "not
 * threaded"), never a false definite negative. A NON-EMPTY list keeps a real no-match as FAILED.
 */
import { evaluateTrialMatch, evaluateCriterion, TrialCriterion } from '../../src/services/trialMatchService';
import type { PatientEvalContext } from '../../src/ingestion/buildPatientEvalContext';

const ctx = (over: Partial<PatientEvalContext>): PatientEvalContext => ({
  dxCodes: [], labValues: {}, medCodes: [], meds: [], age: 60, gender: 'MALE', race: undefined, procedureCodes: [], ...over,
});
const trial = (criteria: TrialCriterion[]) => ({ id: 't', criteria });

const RX_DAPA = '1488564'; // dapagliflozin

describe('AUDIT-201 (a) inclusion-FAILED + co-occurring UNEVALUABLE -> INELIGIBLE (was INDETERMINATE)', () => {
  it('dx inclusion FAILED (patient lacks I50) while lvef is UNEVALUABLE -> INELIGIBLE', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
    ]);
    // patient has I25 (not I50) -> dx FAILED; no lvef value -> lvef UNEVALUABLE.
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I25.9'], labValues: {} }));
    expect(r.status).toBe('INELIGIBLE');
    expect(r.criteriaResults.find(c => c.criterionId === 'hf')?.verdict).toBe('FAILED');
    expect(r.criteriaResults.find(c => c.criterionId === 'lvef')?.verdict).toBe('UNEVALUABLE');
  });
});

describe('AUDIT-201 (b) exclusion-VIOLATED + co-occurring UNEVALUABLE -> INELIGIBLE', () => {
  it('exclusion med violated (on the excluded drug) while lvef is UNEVALUABLE -> INELIGIBLE', () => {
    const t = trial([
      { criterionId: 'sglt2i', polarity: 'exclusion', type: 'med', codes: [RX_DAPA] },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
    ]);
    const r = evaluateTrialMatch(t, ctx({ medCodes: [RX_DAPA], labValues: {} }));
    expect(r.status).toBe('INELIGIBLE');
    expect(r.criteriaResults.find(c => c.criterionId === 'sglt2i')?.verdict).toBe('MET'); // MET exclusion = violated
  });
});

describe('AUDIT-201 (c) exclusion-UNEVALUABLE, no violation -> still INDETERMINATE (never ELIGIBLE)', () => {
  it('an unevaluable EXCLUSION does NOT slide to ELIGIBLE - it resolves INDETERMINATE', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },        // MET
      { criterionId: 'excl-pasp', polarity: 'exclusion', type: 'lab', slug: 'pasp', op: '>=', value: 50 }, // unthreaded -> UNEVALUABLE
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.9'] }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.status).not.toBe('ELIGIBLE');
    expect(r.indeterminateSignals).toContain('pasp');
  });
});

describe('AUDIT-201 (d) ELIGIBLE unchanged (all criteria threaded AND met)', () => {
  it('dx MET + lvef<=40 MET + not-on-SGLT2i -> ELIGIBLE (the fix creates no new path to ELIGIBLE)', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
      { criterionId: 'sglt2i', polarity: 'exclusion', type: 'med', codes: [RX_DAPA] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.9'], labValues: { lvef: 30 } }));
    expect(r.status).toBe('ELIGIBLE');
    expect(r.indeterminateSignals).toEqual([]);
  });
});

describe('AUDIT-201 (e) procedure with UNTHREADED procedures -> UNEVALUABLE, not a false FAILED/INELIGIBLE', () => {
  it('empty procedureCodes -> the procedure criterion is UNEVALUABLE (not FAILED)', () => {
    const c: TrialCriterion = { criterionId: 'cabg', polarity: 'inclusion', type: 'procedure', codes: ['33533'] };
    const r = evaluateCriterion(c, ctx({ procedureCodes: [] }));
    expect(r.verdict).toBe('UNEVALUABLE');
    expect(r.missingSignal).toBe('procedure');
  });
  it('under the new precedence, procedure-UNEVALUABLE + no other violation -> INDETERMINATE, NOT a false INELIGIBLE', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50'] },          // MET
      { criterionId: 'cabg', polarity: 'inclusion', type: 'procedure', codes: ['33533'] }, // UNEVALUABLE (empty procs)
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.9'], procedureCodes: [] }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.status).not.toBe('INELIGIBLE'); // the guard prevents a false definite negative
    expect(r.indeterminateSignals).toContain('procedure');
  });
});

describe('AUDIT-201 (f) procedure with THREADED procedures + genuine no-match -> FAILED (guard does not over-suppress)', () => {
  it('non-empty procedureCodes lacking the target code -> FAILED (a real negative)', () => {
    const c: TrialCriterion = { criterionId: 'cabg', polarity: 'inclusion', type: 'procedure', codes: ['33533'] };
    const r = evaluateCriterion(c, ctx({ procedureCodes: ['99999', '12345'] }));
    expect(r.verdict).toBe('FAILED');
  });
  it('and that genuine procedure-FAILED (inclusion) short-circuits to INELIGIBLE under the new precedence', () => {
    const t = trial([
      { criterionId: 'cabg', polarity: 'inclusion', type: 'procedure', codes: ['33533'] }, // FAILED (real no-match)
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 }, // UNEVALUABLE
    ]);
    const r = evaluateTrialMatch(t, ctx({ procedureCodes: ['99999'], labValues: {} }));
    expect(r.status).toBe('INELIGIBLE');
  });
  it('procedure MET (target code present) -> MET', () => {
    const c: TrialCriterion = { criterionId: 'cabg', polarity: 'inclusion', type: 'procedure', codes: ['33533'] };
    expect(evaluateCriterion(c, ctx({ procedureCodes: ['33533'] })).verdict).toBe('MET');
  });
});
