/**
 * v3.0 SH buildout chunk 1 (2026-06-17) - Aortic stenosis severity - evaluator tests.
 * Reads the now-threaded echo severity (echo-severity threading unlock PR #404): aortic_valve_mean_gradient /
 * aortic_valve_area / aortic_valve_vmax / valve_severity (0-5). SH-002 is the AUDIT-125 tightening (severity gate
 * added to the prior I35.0+LVEF-present over-detector). SH-005 (serial Vmax progression) is deferred - serial
 * trend data is not threaded.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const AS = 'I35.0';       // aortic (valve) stenosis
const HF = 'I50.20';      // heart failure (symptom)

// ---- SH-002: severe symptomatic AS -> AVR not referred (AUDIT-125 tightened) ----
describe('SH-002 severe symptomatic AS -> AVR', () => {
  it('fires: severe AS (gradient 48) + symptomatic (HF)', () => {
    const g = evaluateGapRules([AS, HF], { aortic_valve_mean_gradient: 48 }, [], 75, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic aortic stenosis')).toBeTruthy();
  });
  it('fires: concordant severe via Vmax>=4.0 or valve_severity>=5', () => {
    expect(find(evaluateGapRules([AS, HF], { aortic_valve_vmax: 4.5 }, [], 70, 'MALE'), 'AVR not referred for severe symptomatic')).toBeTruthy();
    expect(find(evaluateGapRules([AS, HF], { valve_severity: 5 }, [], 70, 'MALE'), 'AVR not referred for severe symptomatic')).toBeTruthy();
  });
  it('LFLG partition: symptomatic AVA<1.0 + low gradient + no severe grade -> NOT SH-002 (routes to SH-003 for confirmation)', () => {
    const g = evaluateGapRules([AS, HF], { aortic_valve_area: 0.8, aortic_valve_mean_gradient: 30, lvef: 40 }, [], 70, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic')).toBeFalsy();
    expect(find(g, 'Low-flow low-gradient AS: dobutamine stress echo')).toBeTruthy();
  });
  it('subgroup-aware recommendation: AVR by SAVR-vs-TAVR (not blanket TAVR)', () => {
    const gap = find(evaluateGapRules([AS, HF], { aortic_valve_mean_gradient: 48 }, [], 75, 'MALE'), 'AVR not referred for severe symptomatic');
    expect(gap.recommendations.action).toContain('SAVR');
    expect(gap.recommendations.action).toContain('TAVR');
  });
  it('AUDIT-125 regression: I35.0 + LVEF present but NO severity measure -> does NOT fire (old over-detector did)', () => {
    const g = evaluateGapRules([AS, HF], { lvef: 55 }, [], 75, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic')).toBeFalsy();
  });
  it('gates: sub-threshold gradient 25 (not severe)', () => {
    const g = evaluateGapRules([AS, HF], { aortic_valve_mean_gradient: 25 }, [], 75, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic')).toBeFalsy();
  });
  it('gates: asymptomatic (no symptom dx)', () => {
    const g = evaluateGapRules([AS], { aortic_valve_mean_gradient: 48 }, [], 75, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic')).toBeFalsy();
  });
  it('gates: prosthetic AV already present (Z95.2)', () => {
    const g = evaluateGapRules([AS, HF, 'Z95.2'], { aortic_valve_mean_gradient: 48 }, [], 75, 'MALE');
    expect(find(g, 'AVR not referred for severe symptomatic')).toBeFalsy();
  });
});

// ---- SH-006: asymptomatic severe AS + LVEF<55 (Class IIa) ----
describe('SH-006 asymptomatic severe AS + LV dysfunction', () => {
  it('fires: concordant severe AS (gradient 48) + LVEF 50 + asymptomatic', () => {
    const g = evaluateGapRules([AS], { aortic_valve_mean_gradient: 48, lvef: 50 }, [], 70, 'MALE');
    expect(find(g, 'asymptomatic severe AS with LV dysfunction')).toBeTruthy();
  });
  it('gates: symptomatic (routes to SH-002)', () => {
    const g = evaluateGapRules([AS, HF], { aortic_valve_mean_gradient: 48, lvef: 50 }, [], 70, 'MALE');
    expect(find(g, 'asymptomatic severe AS with LV dysfunction')).toBeFalsy();
  });
  it('gates: LVEF 60 (no LV dysfunction)', () => {
    const g = evaluateGapRules([AS], { aortic_valve_mean_gradient: 48, lvef: 60 }, [], 70, 'MALE');
    expect(find(g, 'asymptomatic severe AS with LV dysfunction')).toBeFalsy();
  });
});

// ---- SH-003: classical LFLG (low EF) -> DSE ----
describe('SH-003 low-flow low-gradient AS (low EF)', () => {
  it('fires: LVEF 40 + AVA 0.8 + gradient 30', () => {
    const g = evaluateGapRules([AS], { lvef: 40, aortic_valve_area: 0.8, aortic_valve_mean_gradient: 30 }, [], 72, 'MALE');
    expect(find(g, 'Low-flow low-gradient AS: dobutamine stress echo')).toBeTruthy();
  });
  it('gates: LVEF 55 (preserved -> paradoxical SH-004, not classical)', () => {
    const g = evaluateGapRules([AS], { lvef: 55, aortic_valve_area: 0.8, aortic_valve_mean_gradient: 30 }, [], 72, 'MALE');
    expect(find(g, 'Low-flow low-gradient AS: dobutamine stress echo')).toBeFalsy();
  });
  it('gates: gradient 45 (not low-gradient)', () => {
    const g = evaluateGapRules([AS], { lvef: 40, aortic_valve_area: 0.8, aortic_valve_mean_gradient: 45 }, [], 72, 'MALE');
    expect(find(g, 'Low-flow low-gradient AS: dobutamine stress echo')).toBeFalsy();
  });
});

// ---- SH-004: paradoxical LFLG (preserved EF) ----
describe('SH-004 paradoxical low-flow low-gradient AS', () => {
  it('fires: LVEF 55 + AVA 0.8 + gradient 30 (preserved EF discordant)', () => {
    const g = evaluateGapRules([AS], { lvef: 55, aortic_valve_area: 0.8, aortic_valve_mean_gradient: 30 }, [], 72, 'FEMALE');
    expect(find(g, 'Paradoxical low-flow low-gradient AS')).toBeTruthy();
  });
  it('gates: LVEF 45 (low EF -> classical SH-003)', () => {
    const g = evaluateGapRules([AS], { lvef: 45, aortic_valve_area: 0.8, aortic_valve_mean_gradient: 30 }, [], 72, 'FEMALE');
    expect(find(g, 'Paradoxical low-flow low-gradient AS')).toBeFalsy();
  });
});

// ---- SH-050: moderate AS grading/surveillance ----
describe('SH-050 moderate AS severity-grading surveillance', () => {
  it('fires: AVA 1.2 (moderate range)', () => {
    const g = evaluateGapRules([AS], { aortic_valve_area: 1.2 }, [], 68, 'MALE');
    expect(find(g, 'Moderate AS: severity-grading surveillance')).toBeTruthy();
  });
  it('gates: AVA 0.8 (severe, not moderate)', () => {
    const g = evaluateGapRules([AS], { aortic_valve_area: 0.8 }, [], 68, 'MALE');
    expect(find(g, 'Moderate AS: severity-grading surveillance')).toBeFalsy();
  });
  it('gates: AVA 1.8 (mild, above moderate range)', () => {
    const g = evaluateGapRules([AS], { aortic_valve_area: 1.8 }, [], 68, 'MALE');
    expect(find(g, 'Moderate AS: severity-grading surveillance')).toBeFalsy();
  });
});
