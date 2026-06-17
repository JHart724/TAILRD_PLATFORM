/**
 * v3.0 EP buildout chunk 3 (2026-06-16) - VT/VF ablation + CIED management - evaluator tests.
 * Uses threaded procedureCodes (PR #396) + EP_ABLATION_CPT (93654 VT) + CIED_IMPLANT_CPT / CIED_EXTRACTION_CPT.
 * All CPT verified via AMA/CMS/AAPC per AUDIT_METHODOLOGY.md section 16.
 *
 * Built: EP-020/021/022/029/034(+090)/092. Deferred: EP-035 (AVR CPT, subsumed by EP-029),
 * EP-036 (leadless discussion - process), EP-086 (VT storm count - telemetry-blocked).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const VT = 'I47.2';
const ISCHEMIC = 'I25.10';
const NICM = 'I42.0';
const AVBLOCK = 'I44.2';   // complete AV block
const SSS = 'I49.5';        // sick sinus syndrome
const CIED_INFX = 'T82.7XXA';
const AMIODARONE = '703';
const FLECAINIDE = '4441';
const ICD_CPT = '33249';
const PACEMAKER = '33208';
const VT_ABL = '93654';
const EXTRACTION = '33244';

// ---- EP-020: ischemic VT ablation ----
describe('EP-020 ischemic VT ablation', () => {
  it('fires: VT + ischemic + on AAD + no prior VT ablation', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [FLECAINIDE], 65, 'MALE', undefined, [], []);
    expect(find(g, 'VT catheter ablation not offered for ischemic VT on antiarrhythmic')).toBeTruthy();
  });
  it('gates: not on any AAD', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [], 65, 'MALE', undefined, [], []);
    expect(find(g, 'VT catheter ablation not offered for ischemic VT on antiarrhythmic')).toBeFalsy();
  });
  it('gates: prior VT ablation present (CPT 93654)', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [FLECAINIDE], 65, 'MALE', undefined, [], [VT_ABL]);
    expect(find(g, 'VT catheter ablation not offered for ischemic VT on antiarrhythmic')).toBeFalsy();
  });
  it('gates: no ischemic heart disease', () => {
    const g = evaluateGapRules([VT], {}, [FLECAINIDE], 65, 'MALE', undefined, [], []);
    expect(find(g, 'VT catheter ablation not offered for ischemic VT on antiarrhythmic')).toBeFalsy();
  });
});

// ---- EP-021: NICM VT substrate ----
describe('EP-021 NICM VT substrate', () => {
  it('fires: VT + non-ischemic CM + no ischemic + no prior VT ablation', () => {
    const g = evaluateGapRules([VT, NICM], {}, [], 55, 'MALE', undefined, [], []);
    expect(find(g, 'VT substrate evaluation not pursued in non-ischemic cardiomyopathy')).toBeTruthy();
  });
  it('gates: ischemic disease present (routes to EP-020 path, not NICM)', () => {
    const g = evaluateGapRules([VT, NICM, ISCHEMIC], {}, [], 55, 'MALE', undefined, [], []);
    expect(find(g, 'VT substrate evaluation not pursued in non-ischemic cardiomyopathy')).toBeFalsy();
  });
  it('gates: prior VT ablation present', () => {
    const g = evaluateGapRules([VT, NICM], {}, [], 55, 'MALE', undefined, [], [VT_ABL]);
    expect(find(g, 'VT substrate evaluation not pursued in non-ischemic cardiomyopathy')).toBeFalsy();
  });
});

// ---- EP-022: VANISH (ablation before amiodarone escalation) ----
describe('EP-022 VT ablation before amiodarone escalation (VANISH)', () => {
  it('fires: ischemic VT + ICD present + on amiodarone + no prior VT ablation', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [AMIODARONE], 68, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'VT ablation not considered before amiodarone escalation (VANISH)')).toBeTruthy();
  });
  it('gates: no ICD present', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [AMIODARONE], 68, 'MALE', undefined, [], []);
    expect(find(g, 'VT ablation not considered before amiodarone escalation (VANISH)')).toBeFalsy();
  });
  it('gates: not on amiodarone (on flecainide)', () => {
    const g = evaluateGapRules([VT, ISCHEMIC], {}, [FLECAINIDE], 68, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'VT ablation not considered before amiodarone escalation (VANISH)')).toBeFalsy();
  });
});

// ---- EP-029: pacemaker Class I bradycardia indication ----
describe('EP-029 pacemaker Class I indication', () => {
  it('fires: complete AV block (I44.2) + no CIED', () => {
    const g = evaluateGapRules([AVBLOCK], {}, [], 72, 'MALE', undefined, [], []);
    expect(find(g, 'Pacemaker not implanted for Class I bradycardia indication')).toBeTruthy();
  });
  it('fires: sick sinus syndrome (I49.5) + no CIED', () => {
    const g = evaluateGapRules([SSS], {}, [], 72, 'FEMALE', undefined, [], []);
    expect(find(g, 'Pacemaker not implanted for Class I bradycardia indication')).toBeTruthy();
  });
  it('gates: existing pacemaker (CPT 33208)', () => {
    const g = evaluateGapRules([AVBLOCK], {}, [], 72, 'MALE', undefined, [], [PACEMAKER]);
    expect(find(g, 'Pacemaker not implanted for Class I bradycardia indication')).toBeFalsy();
  });
  it('gates: existing ICD (paces transvenously)', () => {
    const g = evaluateGapRules([AVBLOCK], {}, [], 72, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'Pacemaker not implanted for Class I bradycardia indication')).toBeFalsy();
  });
  it('gates (I44.1 dropped): Mobitz/2nd-degree alone does not fire (symptomatic-only, not ingested)', () => {
    const g = evaluateGapRules(['I44.1'], {}, [], 72, 'MALE', undefined, [], []);
    expect(find(g, 'Pacemaker not implanted for Class I bradycardia indication')).toBeFalsy();
  });
});

// ---- EP-034 (covers EP-090): CIED infection full extraction ----
describe('EP-034 CIED infection extraction', () => {
  it('fires: CIED present + infection (T82.7) + no extraction', () => {
    const g = evaluateGapRules([CIED_INFX], {}, [], 70, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'Full CIED system extraction not performed for device infection')).toBeTruthy();
  });
  it('gates: no infection coded', () => {
    const g = evaluateGapRules([], {}, [], 70, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'Full CIED system extraction not performed for device infection')).toBeFalsy();
  });
  it('gates: extraction already performed (CPT 33244)', () => {
    const g = evaluateGapRules([CIED_INFX], {}, [], 70, 'MALE', undefined, [], [ICD_CPT, EXTRACTION]);
    expect(find(g, 'Full CIED system extraction not performed for device infection')).toBeFalsy();
  });
  it('gates: infection but no CIED on record', () => {
    const g = evaluateGapRules([CIED_INFX], {}, [], 70, 'MALE', undefined, [], []);
    expect(find(g, 'Full CIED system extraction not performed for device infection')).toBeFalsy();
  });
});

// ---- EP-092: S-ICD candidate (standing recommendation-subgroup check) ----
describe('EP-092 S-ICD candidate', () => {
  it('fires: LVEF 30 + age 40 + no pacing need + no CRT need + no defib', () => {
    const g = evaluateGapRules([NICM], { lvef: 30 }, [], 40, 'MALE', undefined, [], []);
    expect(find(g, 'S-ICD not considered for young primary-prevention')).toBeTruthy();
  });
  it('gates (standing check): wide QRS 160 = CRT candidate, S-ICD cannot pace/resync', () => {
    const g = evaluateGapRules([NICM], { lvef: 30, qrs_duration: 160 }, [], 40, 'MALE', undefined, [], []);
    expect(find(g, 'S-ICD not considered for young primary-prevention')).toBeFalsy();
  });
  it('gates: pacing indication present (AV block) - S-ICD cannot pace', () => {
    const g = evaluateGapRules([NICM, AVBLOCK], { lvef: 30 }, [], 40, 'MALE', undefined, [], []);
    expect(find(g, 'S-ICD not considered for young primary-prevention')).toBeFalsy();
  });
  it('gates: existing defibrillator', () => {
    const g = evaluateGapRules([NICM], { lvef: 30 }, [], 40, 'MALE', undefined, [], [ICD_CPT]);
    expect(find(g, 'S-ICD not considered for young primary-prevention')).toBeFalsy();
  });
  it('gates: age 60 (not young)', () => {
    const g = evaluateGapRules([NICM], { lvef: 30 }, [], 60, 'MALE', undefined, [], []);
    expect(find(g, 'S-ICD not considered for young primary-prevention')).toBeFalsy();
  });
});
