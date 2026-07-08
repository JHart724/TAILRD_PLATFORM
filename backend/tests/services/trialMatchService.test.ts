/**
 * AUDIT-148 Slice 1 (STEP 3/5): honest trial matcher semantics + curated seed section-16 verification.
 *
 * Load-bearing discipline: NEVER assert ELIGIBLE when any criterion is unevaluable (unthreaded /
 * Synthea-absent signal, or a threaded signal absent for this patient) -> INDETERMINATE, signal named.
 */
import { evaluateTrialMatch, evaluateCriterion, THREADED_LAB_SLUGS, TrialCriterion } from '../../src/services/trialMatchService';
import type { PatientEvalContext } from '../../src/ingestion/buildPatientEvalContext';
import { CURATED_TRIALS } from '../../src/services/trialSeed';

const ctx = (over: Partial<PatientEvalContext>): PatientEvalContext => ({
  dxCodes: [], labValues: {}, medCodes: [], meds: [], age: 60, gender: 'MALE', race: undefined, procedureCodes: [], ...over,
});

const trial = (criteria: TrialCriterion[]) => ({ id: 't', criteria });

describe('AUDIT-148 matcher: ELIGIBLE only when all criteria threaded AND met', () => {
  it('ELIGIBLE - HFrEF adult, LVEF<=40, not on SGLT2i (all threadable, inclusion met + exclusion not violated)', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50.2'] },
      { criterionId: 'age', polarity: 'inclusion', type: 'age', op: '>=', value: 18 },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
      { criterionId: 'sglt2i', polarity: 'exclusion', type: 'med', codes: ['1488564'] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.22'], age: 68, labValues: { lvef: 30 }, medCodes: ['83367'] }));
    expect(r.status).toBe('ELIGIBLE');
    expect(r.indeterminateSignals).toEqual([]);
  });
});

describe('AUDIT-148 matcher: INELIGIBLE when a threaded criterion fails (result names which)', () => {
  it('INELIGIBLE - LVEF 55 fails the <=40 inclusion (all threaded, so a real fail not an unknown)', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50.2'] },
      { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.22'], labValues: { lvef: 55 } }));
    expect(r.status).toBe('INELIGIBLE');
    expect(r.criteriaResults.find(c => c.criterionId === 'lvef')?.verdict).toBe('FAILED');
  });

  it('INELIGIBLE - exclusion violated: patient IS on the excluded SGLT2i', () => {
    const t = trial([
      { criterionId: 'hf', polarity: 'inclusion', type: 'dx', codes: ['I50.2'] },
      { criterionId: 'sglt2i', polarity: 'exclusion', type: 'med', codes: ['1488564'] },
    ]);
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I50.22'], medCodes: ['1488564'] }));
    expect(r.status).toBe('INELIGIBLE');
    expect(r.criteriaResults.find(c => c.criterionId === 'sglt2i')?.verdict).toBe('MET'); // MET exclusion = violated
  });
});

describe('AUDIT-148 matcher: INDETERMINATE, never ELIGIBLE, when any signal is unevaluable', () => {
  it('unthreaded/Synthea-absent signal (pasp) -> INDETERMINATE, missingSignal named, never ELIGIBLE', () => {
    const t = trial([
      { criterionId: 'ph', polarity: 'inclusion', type: 'dx', codes: ['I27.0'] },
      { criterionId: 'pasp', polarity: 'inclusion', type: 'lab', slug: 'pasp', op: '>=', value: 35 },
    ]);
    // Even though the dx MATCHES, the pasp criterion is UNEVALUABLE -> whole match INDETERMINATE.
    const r = evaluateTrialMatch(t, ctx({ dxCodes: ['I27.0'] }));
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toContain('pasp');
    expect(r.criteriaResults.find(c => c.criterionId === 'pasp')?.verdict).toBe('UNEVALUABLE');
  });

  it('BNP is dark even though NT-proBNP is threaded -> INDETERMINATE, missingSignal bnp', () => {
    const t = trial([{ criterionId: 'bnp', polarity: 'inclusion', type: 'lab', slug: 'bnp', op: '>=', value: 200 }]);
    const r = evaluateTrialMatch(t, ctx({ labValues: { nt_probnp: 900 } })); // has NT-proBNP, but BNP is what's asked
    expect(r.status).toBe('INDETERMINATE');
    expect(r.indeterminateSignals).toEqual(['bnp']);
  });

  it('a mapped-but-Synthea-absent echo-morphometric slug (valve_severity) is UNEVALUABLE, not a false MET/FAILED', () => {
    expect(THREADED_LAB_SLUGS.has('valve_severity')).toBe(false);
    const c: TrialCriterion = { criterionId: 'vs', polarity: 'inclusion', type: 'lab', slug: 'valve_severity', op: '>=', value: 4 };
    expect(evaluateCriterion(c, ctx({ labValues: { valve_severity: 5 } as any })).verdict).toBe('UNEVALUABLE');
  });

  it('a THREADED signal absent for THIS patient (no LVEF on record) is UNEVALUABLE, never assert on absent data', () => {
    const c: TrialCriterion = { criterionId: 'lvef', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 };
    expect(evaluateCriterion(c, ctx({})).verdict).toBe('UNEVALUABLE'); // lvef threadable but not present for this patient
  });
});

describe('AUDIT-148 curated seed: exercises all three states + section-16 codes', () => {
  const hfref = CURATED_TRIALS.find(t => t.name.includes('HFrEF'))!;
  const ph = CURATED_TRIALS.find(t => t.name.includes('Pulmonary'))!;

  it('the HFrEF trial is fully threadable -> can reach ELIGIBLE and INELIGIBLE', () => {
    const eligible = evaluateTrialMatch(hfref as any, ctx({ dxCodes: ['I50.22'], age: 68, labValues: { lvef: 30 } }));
    const ineligible = evaluateTrialMatch(hfref as any, ctx({ dxCodes: ['I50.22'], age: 68, labValues: { lvef: 30 }, medCodes: ['1545653'] }));
    expect(eligible.status).toBe('ELIGIBLE');
    expect(ineligible.status).toBe('INELIGIBLE'); // on empagliflozin -> exclusion violated
  });

  it('the PH trial forces INDETERMINATE (pasp Synthea-absent)', () => {
    expect(evaluateTrialMatch(ph as any, ctx({ dxCodes: ['I27.0'], age: 60 })).status).toBe('INDETERMINATE');
  });

  it('every seed criterion uses a threaded lab slug OR is intentionally INDETERMINATE-forcing (pasp/bnp)', () => {
    for (const t of CURATED_TRIALS) {
      for (const c of t.criteria) {
        if (c.type === 'lab') {
          const known = THREADED_LAB_SLUGS.has(c.slug!) || ['pasp', 'bnp'].includes(c.slug!);
          expect(known).toBe(true); // no accidental unknown slug
        }
      }
    }
  });
});
