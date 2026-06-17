/**
 * v3.0 VHD buildout chunk 1 (2026-06-17) - AR + mixed/integrated valve severity - evaluator tests.
 * Reads the threaded echo severity (echo-severity unlock PR #404 + SH chunk-3 vena-contracta map-add):
 * valve_severity (0-5), aortic_vena_contracta (cm), mitral_eroa, mitral_regurg_grade, mitral_vena_contracta, lvef.
 * VHD-103 is the AUDIT-134 tightening (VD-5 existence-proxy -> real severe-AR + LVEF<=55 gate). LVESD arm is
 * Path-B (unthreaded). Severe AR = valve_severity>=5 OR aortic_vena_contracta>=0.6.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const AR = 'I35.1';       // nonrheumatic aortic insufficiency
const MIXED_AO = 'I35.2'; // nonrheumatic aortic stenosis with insufficiency
const AS = 'I35.0', MR = 'I34.0', HF = 'I50.20';

// ---- VHD-103: severe asymptomatic AR + LVEF<=55 -> surgical (AUDIT-134 tightened) ----
describe('VHD-103 severe asymptomatic AR -> surgical', () => {
  it('fires: severe AR (valve_severity 5) + asymptomatic + LVEF 50', () => {
    const g = evaluateGapRules([AR], { valve_severity: 5, lvef: 50 }, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeTruthy();
  });
  it('fires via aortic vena contracta >=0.6', () => {
    const g = evaluateGapRules([AR], { aortic_vena_contracta: 0.7, lvef: 52 }, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeTruthy();
  });
  it('AUDIT-134 regression: AR + LVEF-absent (existence-proxy) does NOT fire the surgical gap (old VD-5 did)', () => {
    const g = evaluateGapRules([AR], {}, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeFalsy();
  });
  it('gate: symptomatic (HF) -> does not fire', () => {
    const g = evaluateGapRules([AR, HF], { valve_severity: 5, lvef: 50 }, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeFalsy();
  });
  it('gate: LVEF 60 (preserved, >55) -> does not fire', () => {
    const g = evaluateGapRules([AR], { valve_severity: 5, lvef: 60 }, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeFalsy();
  });
  it('gate: moderate AR (valve_severity 3) -> does not fire', () => {
    const g = evaluateGapRules([AR], { valve_severity: 3, lvef: 50 }, [], 60, 'MALE');
    expect(find(g, 'Severe asymptomatic AR with LV dysfunction')).toBeFalsy();
  });
  it('subgroup-aware: recommends repair-vs-replacement, not blanket AVR', () => {
    const gap = find(evaluateGapRules([AR], { valve_severity: 5, lvef: 50 }, [], 60, 'MALE'), 'Severe asymptomatic AR with LV dysfunction');
    expect(gap.recommendations.action).toContain('repair');
    expect(gap.recommendations.action).toContain('replacement');
  });
});

// ---- VHD-102: AR surveillance (existence-proxy legitimate) ----
describe('VHD-102 AR surveillance echo', () => {
  it('fires: AR with no echo value on file', () => {
    const g = evaluateGapRules([AR], {}, [], 60, 'MALE');
    expect(find(g, 'Aortic regurgitation without surveillance echo')).toBeTruthy();
  });
  it('gates: echo value present (severity threads) -> surveillance not due', () => {
    const g = evaluateGapRules([AR], { valve_severity: 5, lvef: 50 }, [], 60, 'MALE');
    expect(find(g, 'Aortic regurgitation without surveillance echo')).toBeFalsy();
  });
});

// ---- VHD-104: mixed / multi-valve integrated staging ----
describe('VHD-104 mixed multi-valve staging', () => {
  it('fires: AS + MR (two valve lesions)', () => {
    const g = evaluateGapRules([AS, MR], {}, [], 70, 'MALE');
    expect(find(g, 'Mixed / multi-valve disease without integrated severity staging')).toBeTruthy();
  });
  it('fires: mixed aortic disease (I35.2)', () => {
    const g = evaluateGapRules([MIXED_AO], {}, [], 70, 'MALE');
    expect(find(g, 'Mixed / multi-valve disease without integrated severity staging')).toBeTruthy();
  });
  it('gates: single valve lesion (AS only)', () => {
    const g = evaluateGapRules([AS], {}, [], 70, 'MALE');
    expect(find(g, 'Mixed / multi-valve disease without integrated severity staging')).toBeFalsy();
  });
});

// ---- VHD-105: moderate MR by color without quantitative triangulation ----
describe('VHD-105 moderate MR quantitative triangulation', () => {
  it('fires: MR + moderate color grade (2) + no EROA/VC', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 2 }, [], 65, 'FEMALE');
    expect(find(g, 'Moderate MR by color Doppler without quantitative')).toBeTruthy();
  });
  it('gates: quantitative measure present (EROA)', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 2, mitral_eroa: 0.25 }, [], 65, 'FEMALE');
    expect(find(g, 'Moderate MR by color Doppler without quantitative')).toBeFalsy();
  });
  it('gates: severe grade (4, not moderate band)', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4 }, [], 65, 'FEMALE');
    expect(find(g, 'Moderate MR by color Doppler without quantitative')).toBeFalsy();
  });
});
