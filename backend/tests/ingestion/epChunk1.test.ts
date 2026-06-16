/**
 * v3.0 EP buildout chunk 1 (2026-06-16) - AF anticoagulation + dosing - evaluator tests.
 * Per gap: positive (fires) + negative (gates). Med gaps construct medCodes at ingredient (IN)
 * granularity - the runner ingredient-expands before calling the engine (AUDIT-118). Dose-bearing
 * gates pass the threaded meds[] (AUDIT-101); procedure gates pass procedureCodes (PR #396).
 *
 * Chunk-1 set: EP-003/004/005/008/009/012 (new), EP-011 (EP-LAAC AUDIT-120 upgrade),
 * EP-001/EP-006 (verify already-correct post-AUDIT-118). EP-066 deferred to chunk 2 (needs PCI CPT
 * + DAPT value sets + procedure-timing, not chunk-1 scope).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const AF = 'I48.0'; // paroxysmal atrial fibrillation (hasAF = startsWith I48)
const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

// IN-level RxNorm (ingredient) codes - medCodes is ingredient-expanded upstream
const APIXABAN = '1364430';
const RIVAROXABAN = '1114195';
const EDOXABAN = '1599538';
const DABIGATRAN = '1037042';
const WARFARIN = '11289';

// ---- EP-003: Rivaroxaban renal dose not adjusted for CrCl ----
describe('EP-003 rivaroxaban renal dose', () => {
  it('fires: rivaroxaban 20 mg + eGFR 40 (CrCl 15-50, should be 15)', () => {
    const g = evaluateGapRules([AF], { egfr: 40 }, [RIVAROXABAN], 70, 'MALE', undefined,
      [{ rxNormCode: RIVAROXABAN, doseValue: 20 }]);
    expect(find(g, 'DOAC dose not adjusted for renal function (rivaroxaban)')).toBeTruthy();
  });
  it('fires: rivaroxaban + eGFR 10 (CrCl<15, avoid)', () => {
    const g = evaluateGapRules([AF], { egfr: 10 }, [RIVAROXABAN], 70, 'MALE', undefined,
      [{ rxNormCode: RIVAROXABAN, doseValue: 15 }]);
    expect(find(g, 'DOAC dose not adjusted for renal function (rivaroxaban)')).toBeTruthy();
  });
  it('gates: eGFR 60 (CrCl>50, 20 mg appropriate)', () => {
    const g = evaluateGapRules([AF], { egfr: 60 }, [RIVAROXABAN], 70, 'MALE', undefined,
      [{ rxNormCode: RIVAROXABAN, doseValue: 20 }]);
    expect(find(g, 'DOAC dose not adjusted for renal function (rivaroxaban)')).toBeFalsy();
  });
  it('gates: eGFR 40 already on 15 mg (correctly reduced)', () => {
    const g = evaluateGapRules([AF], { egfr: 40 }, [RIVAROXABAN], 70, 'MALE', undefined,
      [{ rxNormCode: RIVAROXABAN, doseValue: 15 }]);
    expect(find(g, 'DOAC dose not adjusted for renal function (rivaroxaban)')).toBeFalsy();
  });
});

// ---- EP-004: Apixaban dose reduction criteria met but on full dose ----
describe('EP-004 apixaban should be reduced', () => {
  it('fires: age 82 + Cr 1.6 (2 criteria) on 5 mg', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.6 }, [APIXABAN], 82, 'FEMALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 5 }]);
    expect(find(g, 'Apixaban dose reduction criteria met but on full dose')).toBeTruthy();
  });
  it('gates: age 82 + Cr 1.2 (only 1 criterion)', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.2 }, [APIXABAN], 82, 'FEMALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 5 }]);
    expect(find(g, 'Apixaban dose reduction criteria met but on full dose')).toBeFalsy();
  });
  it('gates: age 82 + Cr 1.6 already on 2.5 mg', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.6 }, [APIXABAN], 82, 'FEMALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 2.5 }]);
    expect(find(g, 'Apixaban dose reduction criteria met but on full dose')).toBeFalsy();
  });
});

// ---- EP-005: Apixaban inappropriately reduced without criteria ----
describe('EP-005 apixaban inappropriately under-dosed', () => {
  it('fires: age 60 + Cr 1.0 on 2.5 mg (no criteria possible)', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.0 }, [APIXABAN], 60, 'MALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 2.5 }]);
    expect(find(g, 'Apixaban inappropriately reduced without criteria')).toBeTruthy();
  });
  it('gates: age 82 (age criterion present) on 2.5 mg', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.0 }, [APIXABAN], 82, 'MALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 2.5 }]);
    expect(find(g, 'Apixaban inappropriately reduced without criteria')).toBeFalsy();
  });
  it('gates: Cr 1.6 (renal criterion present) on 2.5 mg', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.6 }, [APIXABAN], 60, 'MALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 2.5 }]);
    expect(find(g, 'Apixaban inappropriately reduced without criteria')).toBeFalsy();
  });
  it('gates: on full 5 mg dose (not reduced)', () => {
    const g = evaluateGapRules([AF], { creatinine: 1.0 }, [APIXABAN], 60, 'MALE', undefined,
      [{ rxNormCode: APIXABAN, doseValue: 5 }]);
    expect(find(g, 'Apixaban inappropriately reduced without criteria')).toBeFalsy();
  });
});

// ---- EP-008: DOAC contraindicated in moderate-severe mitral stenosis ----
describe('EP-008 DOAC in mitral stenosis', () => {
  it('fires: rheumatic MS (I05.0) + apixaban', () => {
    const g = evaluateGapRules([AF, 'I05.0'], {}, [APIXABAN], 70);
    expect(find(g, 'DOAC contraindicated in moderate-severe mitral stenosis')).toBeTruthy();
  });
  it('fires: nonrheumatic MS (I34.2) + rivaroxaban', () => {
    const g = evaluateGapRules(['I34.2'], {}, [RIVAROXABAN], 70);
    expect(find(g, 'DOAC contraindicated in moderate-severe mitral stenosis')).toBeTruthy();
  });
  it('gates: no mitral stenosis', () => {
    const g = evaluateGapRules([AF], {}, [APIXABAN], 70);
    expect(find(g, 'DOAC contraindicated in moderate-severe mitral stenosis')).toBeFalsy();
  });
  it('gates: MS but on warfarin (appropriate)', () => {
    const g = evaluateGapRules([AF, 'I05.0'], {}, [WARFARIN], 70);
    expect(find(g, 'DOAC contraindicated in moderate-severe mitral stenosis')).toBeFalsy();
  });
});

// ---- EP-009: Edoxaban reduced efficacy at high CrCl ----
describe('EP-009 edoxaban high CrCl', () => {
  it('fires: edoxaban + eGFR 100 (>95)', () => {
    const g = evaluateGapRules([AF], { egfr: 100 }, [EDOXABAN], 55);
    expect(find(g, 'Edoxaban reduced efficacy at high CrCl')).toBeTruthy();
  });
  it('gates: edoxaban + eGFR 80 (<=95)', () => {
    const g = evaluateGapRules([AF], { egfr: 80 }, [EDOXABAN], 55);
    expect(find(g, 'Edoxaban reduced efficacy at high CrCl')).toBeFalsy();
  });
  it('gates: apixaban + eGFR 100 (not edoxaban)', () => {
    const g = evaluateGapRules([AF], { egfr: 100 }, [APIXABAN], 55);
    expect(find(g, 'Edoxaban reduced efficacy at high CrCl')).toBeFalsy();
  });
});

// ---- EP-012: LAAC for high stroke risk with prior major bleed ----
describe('EP-012 LAAC high-risk + prior bleed', () => {
  it('fires: AF + age 78 + HTN (CHA2DS2-VASc>=3) + ICH (I61)', () => {
    const g = evaluateGapRules([AF, 'I10', 'I61.9'], {}, [], 78, 'MALE');
    expect(find(g, 'LAAC evaluation for high stroke risk with prior major bleed')).toBeTruthy();
  });
  it('gates: prior LAAC already done (CPT 33340)', () => {
    const g = evaluateGapRules([AF, 'I10', 'I61.9'], {}, [], 78, 'MALE', undefined, [], ['33340']);
    expect(find(g, 'LAAC evaluation for high stroke risk with prior major bleed')).toBeFalsy();
  });
  it('gates: high CHA2DS2-VASc but no major bleed', () => {
    const g = evaluateGapRules([AF, 'I10'], {}, [], 78, 'MALE');
    expect(find(g, 'LAAC evaluation for high stroke risk with prior major bleed')).toBeFalsy();
  });
  it('gates: major bleed but CHA2DS2-VASc<3 (age 60, no risk factors)', () => {
    const g = evaluateGapRules([AF, 'I61.9'], {}, [], 60, 'MALE');
    expect(find(g, 'LAAC evaluation for high stroke risk with prior major bleed')).toBeFalsy();
  });
});

// ---- EP-011: EP-LAAC upgrade (AUDIT-120: drop Z88 any-allergy over-detection) ----
describe('EP-011 LAAC contraindication (AUDIT-120 upgrade)', () => {
  it('fires: AF + age 70 + documented bleed (I61)', () => {
    const g = evaluateGapRules([AF, 'I61.9'], {}, [], 70, 'MALE');
    expect(find(g, 'Consider LAAC device evaluation for AFib with OAC contraindication')).toBeTruthy();
  });
  it('gates (the fix): AF + age 70 + drug allergy Z88.0 only (no bleed)', () => {
    const g = evaluateGapRules([AF, 'Z88.0'], {}, [], 70, 'MALE');
    expect(find(g, 'Consider LAAC device evaluation for AFib with OAC contraindication')).toBeFalsy();
  });
});

// ---- EP-001: EP-OAC verify already-correct post-AUDIT-118 (IN-expanded membership) ----
describe('EP-001 OAC in AFib (verify post-AUDIT-118)', () => {
  it('fires: AF + age 76 male (CHA2DS2-VASc 2), no OAC', () => {
    const g = evaluateGapRules([AF], {}, [], 76, 'MALE');
    expect(find(g, 'Oral anticoagulant not prescribed in AFib')).toBeTruthy();
  });
  it('gates: on apixaban (IN 1364430 matches via expansion)', () => {
    const g = evaluateGapRules([AF], {}, [APIXABAN], 76, 'MALE');
    expect(find(g, 'Oral anticoagulant not prescribed in AFib')).toBeFalsy();
  });
});

// ---- EP-006: dabigatran renal safety verify already-correct post-AUDIT-118 ----
describe('EP-006 dabigatran renal safety (verify post-AUDIT-118)', () => {
  it('fires: dabigatran (IN 1037042) + eGFR 25 (<30)', () => {
    const g = evaluateGapRules([AF], { egfr: 25 }, [DABIGATRAN], 70);
    expect(find(g, 'Dabigatran contraindicated in severe renal impairment')).toBeTruthy();
  });
  it('gates: dabigatran + eGFR 50 (>=30)', () => {
    const g = evaluateGapRules([AF], { egfr: 50 }, [DABIGATRAN], 70);
    expect(find(g, 'Dabigatran contraindicated in severe renal impairment')).toBeFalsy();
  });
});
