/**
 * AUDIT-200 - curated-seed dx calibration (Synthea-coarse-coding accommodation).
 *
 * The SNOMED->ICD-10 crosswalk emits ONLY unspecified codes (I50.9 HF / I25.9 ischemic), and the matcher
 * prefix-matches (dx.startsWith(code)), so the specific seed codes (I50.2 / I25.10) matched 0 Synthea
 * patients -> 0 ELIGIBLE. Calibration broadens trial 1/2 dx to the prefixes 'I50' / 'I25'. This is
 * clinically sound: the threaded LVEF<=40 (HFrEF) and LDL>=70 + on-statin gates do the real discrimination,
 * so the specific dx code is redundant with them. Trials 3-4 (I27.0 PH / E85.82 ATTR) are UNCHANGED - they
 * stay the intentional INDETERMINATE demos (pasp/bnp UNEVALUABLE regardless of dx).
 *
 * THE HOLLOW GUARD (the load-bearing assertion): after calibration, ELIGIBLE must be a REAL DISCRIMINATING
 * subset - value-present AND threshold-met AND med-condition - NOT ~100% of the dx cohort. A dx-only cohort
 * that all resolves ELIGIBLE would be the hollow signature this test exists to prevent.
 */
import { evaluateTrialMatch } from '../../src/services/trialMatchService';
import type { PatientEvalContext } from '../../src/ingestion/buildPatientEvalContext';
import { CURATED_TRIALS } from '../../src/services/trialSeed';

const ctx = (over: Partial<PatientEvalContext>): PatientEvalContext => ({
  dxCodes: [], labValues: {}, medCodes: [], meds: [], age: 60, gender: 'MALE', race: undefined, procedureCodes: [], ...over,
});

// Resolve the curated trials by their calibrated dx criterion (robust to array order).
const HFREF = { id: 'hfref', criteria: CURATED_TRIALS.find(t => t.criteria.some(c => c.criterionId === 'hf-dx'))!.criteria };
const CADLIPID = { id: 'cad', criteria: CURATED_TRIALS.find(t => t.criteria.some(c => c.criterionId === 'cad-dx'))!.criteria };
const PH = { id: 'ph', criteria: CURATED_TRIALS.find(t => t.criteria.some(c => c.criterionId === 'ph-dx'))!.criteria };
const ATTR = { id: 'attr', criteria: CURATED_TRIALS.find(t => t.criteria.some(c => c.criterionId === 'attr-dx'))!.criteria };

const RX_DAPA = '1488564'; // dapagliflozin (SGLT2i)
const RX_ATORVA = '83367'; // atorvastatin (statin)

describe('AUDIT-200 calibration: the prefix now matches Synthea unspecified codes', () => {
  it('trial 1 dx criterion is the broad I50 prefix (not the specific I50.2)', () => {
    const dx = HFREF.criteria.find(c => c.criterionId === 'hf-dx')!;
    expect(dx.codes).toEqual(['I50']);
  });
  it('trial 2 dx criterion is the broad I25 prefix (not the specific I25.10)', () => {
    const dx = CADLIPID.criteria.find(c => c.criterionId === 'cad-dx')!;
    expect(dx.codes).toEqual(['I25']);
  });
});

describe('AUDIT-200 trial 1 (HFrEF): I50.9 Synthea patients now reach the LVEF gate', () => {
  it('I50.9 + LVEF 30 + not-on-SGLT2i -> ELIGIBLE (the coverage gain: was 0 pre-calibration)', () => {
    const r = evaluateTrialMatch(HFREF, ctx({ dxCodes: ['I50.9'], age: 68, labValues: { lvef: 30 } }));
    expect(r.status).toBe('ELIGIBLE');
  });
  it('I50.9 + LVEF 55 (HFpEF) -> INELIGIBLE (the LVEF gate discriminates, not the dx)', () => {
    const r = evaluateTrialMatch(HFREF, ctx({ dxCodes: ['I50.9'], labValues: { lvef: 55 } }));
    expect(r.status).toBe('INELIGIBLE');
  });
  it('I50.9 + NO LVEF value -> INDETERMINATE (never assert ELIGIBLE on absent data)', () => {
    const r = evaluateTrialMatch(HFREF, ctx({ dxCodes: ['I50.9'], labValues: {} }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toContain('lvef');
  });
  it('I50.9 + LVEF 30 + ON SGLT2i -> INELIGIBLE (exclusion violated)', () => {
    const r = evaluateTrialMatch(HFREF, ctx({ dxCodes: ['I50.9'], labValues: { lvef: 30 }, medCodes: [RX_DAPA] }));
    expect(r.status).toBe('INELIGIBLE');
  });
});

describe('AUDIT-200 trial 2 (CAD lipid): I25.9 Synthea patients reach the LDL + statin gates', () => {
  it('I25.9 + age 55 + LDL 90 + on-statin -> ELIGIBLE', () => {
    const r = evaluateTrialMatch(CADLIPID, ctx({ dxCodes: ['I25.9'], age: 55, labValues: { ldl: 90 }, medCodes: [RX_ATORVA] }));
    expect(r.status).toBe('ELIGIBLE');
  });
  it('I25.9 + LDL 50 (at goal) + on-statin -> INELIGIBLE (LDL gate discriminates)', () => {
    const r = evaluateTrialMatch(CADLIPID, ctx({ dxCodes: ['I25.9'], age: 55, labValues: { ldl: 50 }, medCodes: [RX_ATORVA] }));
    expect(r.status).toBe('INELIGIBLE');
  });
  it('I25.9 + LDL 90 + NOT on a statin -> INELIGIBLE (on-statin inclusion fails)', () => {
    const r = evaluateTrialMatch(CADLIPID, ctx({ dxCodes: ['I25.9'], age: 55, labValues: { ldl: 90 }, medCodes: [] }));
    expect(r.status).toBe('INELIGIBLE');
  });
});

describe('AUDIT-200 HOLLOW GUARD: ELIGIBLE is a real subset of the dx cohort, NOT ~100%', () => {
  it('a mixed I50.9 cohort resolves to a discriminating split, not all-ELIGIBLE', () => {
    // Every patient carries the dx (I50.9) - so if the dx were the only gate this would be 100% ELIGIBLE.
    const cohort: PatientEvalContext[] = [
      ctx({ dxCodes: ['I50.9'], labValues: { lvef: 30 } }),                 // ELIGIBLE
      ctx({ dxCodes: ['I50.9'], labValues: { lvef: 25 } }),                 // ELIGIBLE
      ctx({ dxCodes: ['I50.9'], labValues: { lvef: 55 } }),                 // INELIGIBLE (HFpEF)
      ctx({ dxCodes: ['I50.9'], labValues: { lvef: 30 }, medCodes: [RX_DAPA] }), // INELIGIBLE (on SGLT2i)
      ctx({ dxCodes: ['I50.9'], labValues: {} }),                          // INDETERMINATE (no LVEF)
    ];
    const statuses = cohort.map(c => evaluateTrialMatch(HFREF, c).status);
    const eligible = statuses.filter(s => s === 'ELIGIBLE').length;
    expect(eligible).toBe(2);                    // a real subset
    expect(eligible).toBeLessThan(cohort.length); // NOT ~100% of the dx cohort - the hollow guard
    expect(statuses).toContain('INELIGIBLE');
    expect(statuses).toContain('INDETERMINATE');
  });
});

describe('AUDIT-200 trials 3-4 UNCHANGED: still the honest INDETERMINATE demos', () => {
  it('PH trial -> INDETERMINATE with pasp named (pasp UNEVALUABLE regardless of dx)', () => {
    const r = evaluateTrialMatch(PH, ctx({ dxCodes: ['I27.0'], labValues: {} }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toContain('pasp');
  });
  it('ATTR trial -> INDETERMINATE with bnp named (BNP dark though NT-proBNP threaded)', () => {
    const r = evaluateTrialMatch(ATTR, ctx({ dxCodes: ['E85.82'], labValues: {} }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toContain('bnp');
  });
});
