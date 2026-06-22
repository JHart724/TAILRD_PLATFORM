/**
 * T1-broader LVESD batch (2026-06-22, feat/t1-broader-lvesd). LVESD (LV end-systolic dimension, mm) threaded
 * CSV-only (no clean LOINC, no-guess -> no FHIR map, like cac_score). The subgroup + built-vs-buildable check
 * found all 3 LVESD-gated gaps already fire on another threaded value (LVEF/EROA/grade), so LVESD adds
 * SENSITIVITY/SPECIFICITY, not DET_OK count - EXCEPT VHD-103b, a genuinely net-new Class-2a gap (the AR COR fork).
 *
 * Per-lesion threshold (section-16, 2020 ACC/AHA VHD):
 *   - primary MR  LVESD >=40 mm -> MV surgery, Class 1 (SH-014 arm, sensitivity)
 *   - AR (preserved EF) LVESD >50 mm -> AVR, Class 2a (VHD-103b NEW, distinct from VHD-103 LVEF<=55 Class 1)
 *   - COAPT secondary-MR TEER LVESD <=70 mm eligibility (SH-018 exclusion, specificity)
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find((g) => typeof g.status === 'string' && g.status.includes(frag));

const MR = 'I34.0';        // nonrheumatic mitral (regurgitation) insufficiency
const AR = 'I35.1';        // nonrheumatic aortic (valve) insufficiency
const HF = 'I50.22';       // chronic systolic HF (secondary-MR context proxy)

const MR_FRAG = 'Surgical referral not documented for severe primary mitral regurgitation';
const TEER_FRAG = 'TEER';
const AR_C1_FRAG = 'AR with LV dysfunction';                 // VHD-103 (Class 1, LVEF<=55)
const AR_C2A_FRAG = 'preserved EF and LV dilation';          // VHD-103b (Class 2a, LVESD>50)

// =============================================================================
// SH-014: primary-MR LVESD>=40 arm (Class 1, sensitivity enhancement - 0 net-new)
// =============================================================================
describe('SH-014 primary MR LVESD>=40 LV-dilation arm', () => {
  it('fires via the LVESD arm: severe primary MR + preserved EF (62) + LVESD 42 (no symptom, LVEF>60)', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4, lvef: 62, lvesd: 42 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeTruthy();
  });
  it('regression: SAME patient WITHOUT lvesd does NOT fire (proves the LVESD arm is the trigger)', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4, lvef: 62 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeFalsy();
  });
  it('existing LVEF<=60 arm unchanged: severe primary MR + LVEF 55 still fires', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4, lvef: 55 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeTruthy();
  });
  it('severity gate: LVESD 42 but NOT severe MR (no grade/eroa/valve_severity) does NOT fire', () => {
    const g = evaluateGapRules([MR], { lvef: 62, lvesd: 42 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeFalsy();
  });
  it('subgroup gate: secondary/functional MR (HF + LVEF<50) excluded even with LVESD 45', () => {
    const g = evaluateGapRules([MR, HF], { mitral_regurg_grade: 4, lvef: 45, lvesd: 45 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeFalsy();
  });
  it('null: LVESD 38 (<40) + preserved EF + no symptom does NOT fire', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4, lvef: 62, lvesd: 38 }, [], 65, 'MALE');
    expect(find(g, MR_FRAG)).toBeFalsy();
  });
});

// =============================================================================
// SH-018: COAPT TEER LVESD<=70 eligibility exclusion (specificity - 0 net-new)
// =============================================================================
describe('SH-018 COAPT TEER LVESD<=70 eligibility exclusion', () => {
  const base = { lvef: 35, mitral_eroa: 0.35 };  // secondary MR, COAPT band, LVEF<50
  it('eligible: COAPT secondary MR + LVESD 65 (<=70) still fires', () => {
    const g = evaluateGapRules([MR], { ...base, lvesd: 65 }, [], 80, 'MALE');
    expect(find(g, TEER_FRAG)).toBeTruthy();
  });
  it('LVESD-absent permissive: no lvesd value still fires (backward compatible)', () => {
    const g = evaluateGapRules([MR], { ...base }, [], 80, 'MALE');
    expect(find(g, TEER_FRAG)).toBeTruthy();
  });
  it('exclusion: LVESD 75 (>70, outside COAPT) no longer gets the TEER recommendation', () => {
    const g = evaluateGapRules([MR], { ...base, lvesd: 75 }, [], 80, 'MALE');
    expect(find(g, TEER_FRAG)).toBeFalsy();
  });
});

// =============================================================================
// VHD-103b: NEW Class-2a AR LVESD>50 dilation gap (the COR fork fix - +1 net-new)
// =============================================================================
describe('VHD-103b AR preserved-EF LVESD>50 (Class 2a, distinct from VHD-103 Class 1)', () => {
  const severeAR = { aortic_vena_contracta: 0.7 };
  it('fires VHD-103b: severe AR + preserved EF (60) + LVESD 55 -> Class 2a', () => {
    const g = evaluateGapRules([AR], { ...severeAR, lvef: 60, lvesd: 55 }, [], 60, 'MALE');
    const gap = find(g, AR_C2A_FRAG);
    expect(gap).toBeTruthy();
    expect(gap.evidence.classOfRecommendation).toBe('2a');
  });
  it('no double-fire: the VHD-103b patient does NOT also fire VHD-103 (LVEF>55 gates out Class 1)', () => {
    const g = evaluateGapRules([AR], { ...severeAR, lvef: 60, lvesd: 55 }, [], 60, 'MALE');
    expect(find(g, AR_C1_FRAG)).toBeFalsy();
  });
  it('VHD-103 Class 1 path: severe AR + LVEF 50 (<=55) fires VHD-103, NOT VHD-103b', () => {
    const g = evaluateGapRules([AR], { ...severeAR, lvef: 50 }, [], 60, 'MALE');
    const c1 = find(g, AR_C1_FRAG);
    expect(c1).toBeTruthy();
    expect(c1.evidence.classOfRecommendation).toBe('1');
    expect(find(g, AR_C2A_FRAG)).toBeFalsy();
  });
  it('LVESD gate: preserved EF + LVESD 48 (<=50) does NOT fire VHD-103b', () => {
    const g = evaluateGapRules([AR], { ...severeAR, lvef: 60, lvesd: 48 }, [], 60, 'MALE');
    expect(find(g, AR_C2A_FRAG)).toBeFalsy();
  });
  it('null: LVESD present but EF absent does NOT fire VHD-103b (preserved-EF subset unprovable)', () => {
    const g = evaluateGapRules([AR], { ...severeAR, lvesd: 55 }, [], 60, 'MALE');
    expect(find(g, AR_C2A_FRAG)).toBeFalsy();
  });
  it('severity gate: preserved EF + LVESD 55 but NOT severe AR does NOT fire', () => {
    const g = evaluateGapRules([AR], { lvef: 60, lvesd: 55 }, [], 60, 'MALE');
    expect(find(g, AR_C2A_FRAG)).toBeFalsy();
  });
});
