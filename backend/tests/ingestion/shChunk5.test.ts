/**
 * v3.0 SH buildout chunk 5 (2026-06-17) - PFO/ASD, IE, PE, ACHD, cardiac masses (recommend-only / dx gaps).
 * All ICD-10-CM section-16-verified vs NLM Clinical Tables: PFO Q21.12 (distinct from ASD Q21.1x), TOF Q21.3,
 * Ebstein Q22.5, Eisenmenger I27.83, IE I33.0, massive PE I26.0x, cardiogenic shock R57.0, benign cardiac
 * neoplasm D15.1. CPT-dependent post-closure gaps (SH-082/083) are PARKED, not built here.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const PFO = 'Q21.12', ASD = 'Q21.11', STROKE = 'I63.9', AF = 'I48.0';
const EISENMENGER = 'I27.83', IE = 'I33.0', HF = 'I50.20', SADDLE_PE = 'I26.02', SHOCK = 'R57.0';
const TOF = 'Q21.3', EBSTEIN = 'Q22.5', MYXOMA = 'D15.1';

// ---- SH-026: PFO + cryptogenic stroke -> closure eval (subgroup: excludes AF) ----
describe('SH-026 PFO + cryptogenic stroke -> closure eval', () => {
  it('fires: PFO + stroke + age<60, no AF', () => {
    const g = evaluateGapRules([PFO, STROKE], {}, [], 45, 'MALE');
    expect(find(g, 'PFO + cryptogenic stroke (age<60): closure evaluation gap')).toBeTruthy();
  });
  it('subgroup gate: AF present -> cardioembolic, does NOT fire (treat the AF)', () => {
    const g = evaluateGapRules([PFO, STROKE, AF], {}, [], 45, 'MALE');
    expect(find(g, 'PFO + cryptogenic stroke')).toBeFalsy();
  });
  it('gate: age 65 (>=60)', () => {
    const g = evaluateGapRules([PFO, STROKE], {}, [], 65, 'MALE');
    expect(find(g, 'PFO + cryptogenic stroke')).toBeFalsy();
  });
  it('gate: no stroke', () => {
    const g = evaluateGapRules([PFO], {}, [], 45, 'MALE');
    expect(find(g, 'PFO + cryptogenic stroke')).toBeFalsy();
  });
});

// ---- SH-027: significant ASD -> closure eval (subgroup: excludes Eisenmenger; PFO does not fire) ----
describe('SH-027 significant ASD -> closure eval', () => {
  it('fires: ASD + elevated PASP, not Eisenmenger', () => {
    const g = evaluateGapRules([ASD], { pasp: 50 }, [], 40, 'FEMALE');
    expect(find(g, 'Hemodynamically significant ASD: closure evaluation gap')).toBeTruthy();
  });
  it('subgroup gate: Eisenmenger physiology -> closure contraindicated, does NOT fire', () => {
    const g = evaluateGapRules([ASD, EISENMENGER], { pasp: 90 }, [], 40, 'FEMALE');
    expect(find(g, 'Hemodynamically significant ASD: closure evaluation gap')).toBeFalsy();
  });
  it('Path-B gate: ASD but no PASP significance signal', () => {
    const g = evaluateGapRules([ASD], {}, [], 40, 'FEMALE');
    expect(find(g, 'Hemodynamically significant ASD: closure evaluation gap')).toBeFalsy();
  });
  it('routing: PFO (Q21.12) does NOT fire the ASD rule', () => {
    const g = evaluateGapRules([PFO], { pasp: 50 }, [], 40, 'FEMALE');
    expect(find(g, 'Hemodynamically significant ASD: closure evaluation gap')).toBeFalsy();
  });
});

// ---- SH-029: IE embolic / uncontrolled-infection surgery indication (AUDIT-172 scope-narrowed: HF arm -> VHD-057) ----
const SEPSIS = 'A41.9'; // uncontrolled-infection proxy (retained in SH-029)
describe('SH-029 IE embolic / uncontrolled-infection surgery indication (HF arm reconciled to VHD-057)', () => {
  it('AUDIT-172 reconciliation: IE + HF no longer fires SH-029 (VHD-057 owns it) - single fire via VHD-057', () => {
    const g = evaluateGapRules([IE, HF], {}, [], 55, 'MALE');
    expect(find(g, 'embolic / uncontrolled-infection surgery indication')).toBeFalsy();
    expect(find(g, 'urgent surgery indication gap')).toBeTruthy(); // VHD-057 fires instead
  });
  it('fires: IE + embolic stroke (embolic arm retained - broader than VHD-059)', () => {
    expect(find(evaluateGapRules([IE, STROKE], {}, [], 55, 'MALE'), 'embolic / uncontrolled-infection surgery indication')).toBeTruthy();
  });
  it('fires: IE + uncontrolled infection (A41, unique to SH-029)', () => {
    expect(find(evaluateGapRules([IE, SEPSIS], {}, [], 55, 'MALE'), 'embolic / uncontrolled-infection surgery indication')).toBeTruthy();
  });
  it('gate: IE alone (no embolic / uncontrolled-infection indication)', () => {
    expect(find(evaluateGapRules([IE], {}, [], 55, 'MALE'), 'embolic / uncontrolled-infection surgery indication')).toBeFalsy();
  });
});

// ---- SH-091: massive PE + shock (subgroup: submassive excluded) ----
describe('SH-091 massive PE -> reperfusion', () => {
  it('fires: saddle PE + cardiogenic shock', () => {
    expect(find(evaluateGapRules([SADDLE_PE, SHOCK], {}, [], 60, 'MALE'), 'Massive (high-risk) PE with instability')).toBeTruthy();
  });
  it('subgroup gate: PE without shock (submassive) -> NOT in scope', () => {
    expect(find(evaluateGapRules([SADDLE_PE], {}, [], 60, 'MALE'), 'Massive (high-risk) PE with instability')).toBeFalsy();
  });
});

// ---- SH-101 / SH-096 / SH-099 / SH-103: ACHD + masses ----
describe('SH-101/096/099/103 ACHD + cardiac masses', () => {
  it('SH-101: Eisenmenger -> PAH therapy eval', () => {
    expect(find(evaluateGapRules([EISENMENGER], {}, [], 35, 'FEMALE'), 'Eisenmenger physiology without PAH-specific therapy')).toBeTruthy();
  });
  it('SH-096: adult TOF -> PVR eval; child TOF does not fire', () => {
    expect(find(evaluateGapRules([TOF], {}, [], 30, 'MALE'), 'Adult Tetralogy of Fallot')).toBeTruthy();
    expect(find(evaluateGapRules([TOF], {}, [], 8, 'MALE'), 'Adult Tetralogy of Fallot')).toBeFalsy();
  });
  it('SH-099: Ebstein -> arrhythmia surveillance', () => {
    expect(find(evaluateGapRules([EBSTEIN], {}, [], 28, 'FEMALE'), 'Ebstein anomaly without arrhythmia surveillance')).toBeTruthy();
  });
  it('SH-103: cardiac myxoma -> surgical referral', () => {
    expect(find(evaluateGapRules([MYXOMA], {}, [], 50, 'FEMALE'), 'Benign cardiac neoplasm (atrial myxoma): surgical referral')).toBeTruthy();
  });
  it('hospice gates the dx-driven ACHD gaps', () => {
    expect(find(evaluateGapRules([EISENMENGER, 'Z51.5'], {}, [], 35, 'FEMALE'), 'Eisenmenger physiology without PAH-specific therapy')).toBeFalsy();
  });
});
