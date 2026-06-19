/**
 * AUDIT-184 hollow-DET_OK repair - rule regression (2026-06-19, feat/t1-slug-thread-and-hollow-repair).
 *
 * The 22 hollow DET_OK rules read slugs threaded in NEITHER path. Threading (PART 1) is the fix; the rule logic
 * was always correct. These tests prove, with the slug value passed directly, that:
 *   - the 8 OVER-FIRE rules now GATE OUT a patient whose value is present/normal (the live-prod safety fix - a
 *     value-present patient no longer gets the spurious gap), and still FIRE for the genuine gap (value absent).
 *   - the operator-flagged SILENT rules (PV-015, HF-081) FIRE on a qualifying value and GATE on a non-qualifying
 *     one (they were 0%-sensitivity before threading; now the threaded value drives them).
 * Combined with hollowDetokThreading.test.ts (the slug now reaches labValues), this is end-to-end repair proof.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find((g) => typeof g.status === 'string' && g.status.includes(frag));

const CAD = 'I25.10';
const ATORVASTATIN = '83367';
const AMIODARONE = '703';
const DOFETILIDE = '49247';

// =====================================================================================================
// 8 OVER-FIRE rules - prove each is now CLOSED (gates when the value is present), still fires when absent.
// Before the AUDIT-184 thread these fired for EVERY patient in the cohort (the value was never threaded).
// =====================================================================================================
describe('AUDIT-184 over-fire CLOSED - CAD-008 Lp(a) screening', () => {
  const FRAG = 'Lipoprotein(a) screening in premature ASCVD';
  it('fires: premature-ASCVD CAD patient with no Lp(a) measured', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 50, 'MALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: same patient WITH lpa present no longer over-fires', () => {
    expect(find(evaluateGapRules([CAD], { lpa: 75 }, [], 50, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - CAD-010 hs-CRP residual-risk', () => {
  const FRAG = 'hs-CRP measurement for residual inflammatory risk';
  it('fires: CAD on statin with no CRP measured', () => {
    expect(find(evaluateGapRules([CAD], {}, [ATORVASTATIN], 60, 'MALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: CAD on statin WITH crp present no longer over-fires', () => {
    expect(find(evaluateGapRules([CAD], { crp: 1.0 }, [ATORVASTATIN], 60, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - CAD-047 CCTA stable chest pain', () => {
  const FRAG = 'CCTA for evaluation of stable chest pain';
  it('fires: stable chest pain (I20.9), no CAD, no CCTA done', () => {
    expect(find(evaluateGapRules(['I20.9'], {}, [], 55, 'FEMALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: same patient WITH ccta present no longer over-fires', () => {
    expect(find(evaluateGapRules(['I20.9'], { ccta: 1 }, [], 55, 'FEMALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - CAD-059 coronary calcium scoring', () => {
  const FRAG = 'coronary artery calcium scoring';
  it('fires: intermediate-risk (diabetes, age 50), no CAD, no CAC score', () => {
    expect(find(evaluateGapRules(['E11.9'], {}, [], 50, 'MALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: same patient WITH cac_score present no longer over-fires', () => {
    expect(find(evaluateGapRules(['E11.9'], { cac_score: 80 }, [], 50, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - EP-043/044 amiodarone toxicity monitoring', () => {
  const FRAG = 'Amiodarone toxicity monitoring';
  it('fires: on amiodarone with no TSH/LFT measured', () => {
    expect(find(evaluateGapRules([], {}, [AMIODARONE], 70, 'MALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: on amiodarone WITH tsh + alt present no longer over-fires', () => {
    expect(find(evaluateGapRules([], { tsh: 2.0, alt: 30 }, [AMIODARONE], 70, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - EP-048 dofetilide REMS monitoring', () => {
  const FRAG = 'Dofetilide REMS monitoring';
  it('fires: on dofetilide with no QTc/creatinine measured', () => {
    expect(find(evaluateGapRules([], {}, [DOFETILIDE], 68, 'FEMALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: on dofetilide WITH qtc_interval + creatinine present no longer over-fires', () => {
    expect(find(evaluateGapRules([], { qtc_interval: 440, creatinine: 1.0 }, [DOFETILIDE], 68, 'FEMALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 over-fire CLOSED - PV-098 graft duplex surveillance', () => {
  const FRAG = 'interval duplex surveillance for peripheral bypass graft';
  const GRAFT = 'Z95.820';
  const PAD = 'I70.211';
  it('fires: graft + PAD with no recent duplex (overdue / never)', () => {
    expect(find(evaluateGapRules([GRAFT, PAD], {}, [], 70, 'MALE'), FRAG)).toBeTruthy();
  });
  it('CLOSED: graft + PAD WITH a recent duplex (6 months) no longer over-fires', () => {
    expect(find(evaluateGapRules([GRAFT, PAD], { graft_duplex_months: 6 }, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// Operator-flagged SILENT rules - now fire on a qualifying value (0% sensitivity before threading).
// =====================================================================================================
describe('AUDIT-184 silent repaired - PV-015 HbA1c glycemic optimization', () => {
  const FRAG = 'glycemic optimization gap';
  const PAD = 'I70.211';
  it('fires: PAD + diabetes + HbA1c 8.0 (>=7.0 target)', () => {
    expect(find(evaluateGapRules([PAD, 'E11.9'], { hba1c: 8.0 }, [], 60, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: at-target HbA1c 6.5 does NOT fire', () => {
    expect(find(evaluateGapRules([PAD, 'E11.9'], { hba1c: 6.5 }, [], 60, 'MALE'), FRAG)).toBeFalsy();
  });
  it('hollow-before: with NO hba1c threaded it could never fire (now repaired by threading)', () => {
    expect(find(evaluateGapRules([PAD, 'E11.9'], {}, [], 60, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-081 HbA1c in heart failure', () => {
  const FRAG = 'Diabetes above glycemic target in heart failure';
  it('fires: HF + diabetes + HbA1c 9.0 (>8)', () => {
    expect(find(evaluateGapRules(['I50.22', 'E11.9'], { hba1c: 9.0 }, [], 65, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: HbA1c 7.5 (<=8) does NOT fire', () => {
    expect(find(evaluateGapRules(['I50.22', 'E11.9'], { hba1c: 7.5 }, [], 65, 'MALE'), FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// The remaining 12 SILENT rules - now fire on a qualifying (threaded) value + gate on a non-qualifying one.
// Each was 0%-sensitivity before AUDIT-184 (the gate-slug was never threaded).
// =====================================================================================================
const HF = 'I50.9';
const HFREF = 'I50.22';
const CARVEDILOL = '20352';
const DILTIAZEM = '3443';       // AV-nodal blocker (rate control)
const APIXABAN = '1364430';

describe('AUDIT-184 silent repaired - HF-003 beta-blocker below target (heart_rate + systolic_bp)', () => {
  const FRAG = 'HFrEF beta-blocker below target dose';
  const meds = [{ rxNormCode: CARVEDILOL, doseValue: 12.5 }]; // carvedilol below target 50
  it('fires: HFrEF on below-target BB + HR 70 + SBP 120', () => {
    expect(find(evaluateGapRules([HFREF], { lvef: 35, heart_rate: 70, systolic_bp: 120 }, [CARVEDILOL], 65, 'MALE', undefined, meds), FRAG)).toBeTruthy();
  });
  it('gate: HR 55 (<60, no uptitration headroom) does NOT fire', () => {
    expect(find(evaluateGapRules([HFREF], { lvef: 35, heart_rate: 55, systolic_bp: 120 }, [CARVEDILOL], 65, 'MALE', undefined, meds), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-032 iron studies in anemic HF (hemoglobin)', () => {
  const FRAG = 'Iron studies overdue in anemic heart failure';
  it('fires: HF + hemoglobin 10 (<12) + ferritin not measured', () => {
    expect(find(evaluateGapRules([HF], { hemoglobin: 10 }, [], 70, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: hemoglobin 13 (>=12) does NOT fire', () => {
    expect(find(evaluateGapRules([HF], { hemoglobin: 13 }, [], 70, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-065 tachycardia-mediated CM (heart_rate)', () => {
  const FRAG = 'tachycardia-mediated cardiomyopathy';
  it('fires: HF + LVEF 40 + HR 120 + no rate/rhythm control', () => {
    expect(find(evaluateGapRules([HF], { lvef: 40, heart_rate: 120 }, [], 60, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: HR 80 (<=100) does NOT fire', () => {
    expect(find(evaluateGapRules([HF], { lvef: 40, heart_rate: 80 }, [], 60, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-078 chronic AF uncontrolled rate (heart_rate)', () => {
  const FRAG = 'HF + chronic AF with uncontrolled ventricular rate';
  it('fires: HF + chronic AF (I48.20) + HR 120 + no rate control', () => {
    expect(find(evaluateGapRules([HF, 'I48.20'], { heart_rate: 120 }, [], 72, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: HR 90 (<=110) does NOT fire', () => {
    expect(find(evaluateGapRules([HF, 'I48.20'], { heart_rate: 90 }, [], 72, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-079 anemia workup (hemoglobin)', () => {
  const FRAG = 'anemia workup for HF patient';
  it('fires: HF + male hemoglobin 11 (<13 male threshold)', () => {
    expect(find(evaluateGapRules([HF], { hemoglobin: 11 }, [], 65, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: hemoglobin 14 does NOT fire', () => {
    expect(find(evaluateGapRules([HF], { hemoglobin: 14 }, [], 65, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - HF-080 untreated thyroid dysfunction (tsh)', () => {
  const FRAG = 'untreated thyroid dysfunction';
  it('fires: HF + TSH 12 (>10 overt hypothyroid, untreated)', () => {
    expect(find(evaluateGapRules([HF], { tsh: 12 }, [], 60, 'FEMALE'), FRAG)).toBeTruthy();
  });
  it('gate: TSH 2.0 (euthyroid) does NOT fire', () => {
    expect(find(evaluateGapRules([HF], { tsh: 2.0 }, [], 60, 'FEMALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - EP-004 apixaban dose-reduction criteria met (creatinine)', () => {
  const FRAG = 'Apixaban dose reduction criteria met but on full dose';
  const fullDose = [{ rxNormCode: APIXABAN, doseValue: 5 }];
  it('fires: apixaban full dose + age 82 + creatinine 1.8 (>=2 reduction criteria)', () => {
    expect(find(evaluateGapRules([], { creatinine: 1.8 }, [APIXABAN], 82, 'MALE', undefined, fullDose), FRAG)).toBeTruthy();
  });
  it('gate: creatinine 1.0 (<1.5, criterion not met) does NOT fire', () => {
    expect(find(evaluateGapRules([], { creatinine: 1.0 }, [APIXABAN], 82, 'MALE', undefined, fullDose), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - EP-005 apixaban inappropriately reduced (creatinine)', () => {
  const FRAG = 'Apixaban inappropriately reduced without criteria';
  const lowDose = [{ rxNormCode: APIXABAN, doseValue: 2.5 }];
  it('fires: apixaban 2.5 + age 60 + creatinine 1.0 (no reduction criteria)', () => {
    expect(find(evaluateGapRules([], { creatinine: 1.0 }, [APIXABAN], 60, 'MALE', undefined, lowDose), FRAG)).toBeTruthy();
  });
  it('gate: creatinine 1.7 (>=1.5, a criterion present) does NOT fire', () => {
    expect(find(evaluateGapRules([], { creatinine: 1.7 }, [APIXABAN], 60, 'MALE', undefined, lowDose), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - EP-030 bradycardia on AV-nodal blocker (heart_rate)', () => {
  const FRAG = 'Bradycardia on AV-nodal blocker';
  it('fires: HR 45 (<50) on diltiazem, no pacemaker', () => {
    expect(find(evaluateGapRules([], { heart_rate: 45 }, [DILTIAZEM], 70, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: HR 60 (>=50) does NOT fire', () => {
    expect(find(evaluateGapRules([], { heart_rate: 60 }, [DILTIAZEM], 70, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - EP-033 chronic AF HR<40 on rate control (heart_rate)', () => {
  const FRAG = 'Chronic AF with HR<40 on rate control';
  it('fires: AF (I48.20) + HR 35 (<40) on diltiazem, no pacemaker', () => {
    expect(find(evaluateGapRules(['I48.20'], { heart_rate: 35 }, [DILTIAZEM], 72, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: HR 50 (>=40) does NOT fire', () => {
    expect(find(evaluateGapRules(['I48.20'], { heart_rate: 50 }, [DILTIAZEM], 72, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - CAD-023 colchicine residual inflammation (crp)', () => {
  const FRAG = 'low-dose colchicine for residual inflammatory risk';
  it('fires: CAD + CRP 5 (>2), not on colchicine', () => {
    expect(find(evaluateGapRules([CAD], { crp: 5 }, [], 62, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: CRP 1 (<=2) does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], { crp: 1 }, [], 62, 'MALE'), FRAG)).toBeFalsy();
  });
});

describe('AUDIT-184 silent repaired - CAD-031 ischemia-guided therapy (stress_test_months)', () => {
  const FRAG = 'ischemia-guided therapy review';
  it('fires: stable angina (I25.110) + stress test documented (stress_test_months present)', () => {
    expect(find(evaluateGapRules(['I25.110'], { stress_test_months: 3 }, [], 60, 'MALE'), FRAG)).toBeTruthy();
  });
  it('gate: no stress test threaded (the silent-before state) does NOT fire', () => {
    expect(find(evaluateGapRules(['I25.110'], {}, [], 60, 'MALE'), FRAG)).toBeFalsy();
  });
});
