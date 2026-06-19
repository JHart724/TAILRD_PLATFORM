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
