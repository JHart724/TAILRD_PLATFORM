/**
 * v3.0 EP buildout chunk 2 (2026-06-16) - AF rhythm + ablation - evaluator tests.
 * FIRST EP consumer of the threaded procedureCodes param (PR #396) + the new EP_ABLATION_CPT set.
 * Per gap: positive (fires on CPT presence/absence) + negative (gates). Ablation CPT verified via
 * AMA CPT Assistant / AAPC / ACC per AUDIT_METHODOLOGY.md section 16.
 *
 * Built: EP-014/071/072/074/076. Deferred (data-limited, not built): EP-075 (focal AT - I47.1 lumps
 * it with AVNRT, no mechanism code) and EP-077 (concealed AVRT - needs EP study).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const AF = 'I48.0';          // paroxysmal AF (non-flutter)
const FLUTTER = 'I48.3';     // typical atrial flutter
const SVT = 'I47.1';         // supraventricular tachycardia
const AF_PVI = '93656';      // CPT: AF ablation by PVI
const SVT_ABL = '93653';     // CPT: SVT/CTI ablation
const FLECAINIDE = '4441';   // AAD
const APIXABAN = '1364430';  // OAC

// ---- EP-014: AF ablation in HFrEF (CASTLE-AF) ----
describe('EP-014 AF ablation in HFrEF', () => {
  it('fires: AF + LVEF 30 + no prior PVI', () => {
    const g = evaluateGapRules([AF], { lvef: 30 }, [], 60, 'MALE', undefined, [], []);
    expect(find(g, 'AF ablation not referred in HFrEF (CASTLE-AF)')).toBeTruthy();
  });
  it('gates: LVEF 40 (>35, not HFrEF range)', () => {
    const g = evaluateGapRules([AF], { lvef: 40 }, [], 60, 'MALE', undefined, [], []);
    expect(find(g, 'AF ablation not referred in HFrEF (CASTLE-AF)')).toBeFalsy();
  });
  it('gates: prior AF ablation present (CPT 93656)', () => {
    const g = evaluateGapRules([AF], { lvef: 30 }, [], 60, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'AF ablation not referred in HFrEF (CASTLE-AF)')).toBeFalsy();
  });
  it('gates: typical flutter (I48.3) is not AF-non-flutter', () => {
    const g = evaluateGapRules([FLUTTER], { lvef: 30 }, [], 60, 'MALE', undefined, [], []);
    expect(find(g, 'AF ablation not referred in HFrEF (CASTLE-AF)')).toBeFalsy();
  });
});

// ---- EP-071: Anticoagulation not continued after AF ablation ----
describe('EP-071 post-ablation OAC continuation', () => {
  it('fires: prior PVI + age 76 male (CHA2DS2-VASc 2) + no OAC', () => {
    const g = evaluateGapRules([AF], {}, [], 76, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Anticoagulation not continued after AF ablation')).toBeTruthy();
  });
  it('gates: on apixaban (OAC present)', () => {
    const g = evaluateGapRules([AF], {}, [APIXABAN], 76, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Anticoagulation not continued after AF ablation')).toBeFalsy();
  });
  it('gates: no prior ablation', () => {
    const g = evaluateGapRules([AF], {}, [], 76, 'MALE', undefined, [], []);
    expect(find(g, 'Anticoagulation not continued after AF ablation')).toBeFalsy();
  });
  it('gates: CHA2DS2-VASc not qualifying (age 50 male, no risk factors)', () => {
    const g = evaluateGapRules([AF], {}, [], 50, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Anticoagulation not continued after AF ablation')).toBeFalsy();
  });
});

// ---- EP-072: Redo AF ablation after recurrence (tightened: on-AAD recurrence proxy) ----
describe('EP-072 redo AF ablation', () => {
  it('fires: prior PVI + AF still coded + on AAD (genuine recurrence proxy)', () => {
    const g = evaluateGapRules([AF], {}, [FLECAINIDE], 60, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Redo AF ablation evaluation after recurrence')).toBeTruthy();
  });
  it('gates (noise suppressed): prior PVI + AF code but NOT on AAD (lingering problem-list code)', () => {
    const g = evaluateGapRules([AF], {}, [], 60, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Redo AF ablation evaluation after recurrence')).toBeFalsy();
  });
  it('gates: no prior ablation', () => {
    const g = evaluateGapRules([AF], {}, [FLECAINIDE], 60, 'MALE', undefined, [], []);
    expect(find(g, 'Redo AF ablation evaluation after recurrence')).toBeFalsy();
  });
  it('gates: prior ablation + on AAD but AF no longer coded', () => {
    const g = evaluateGapRules(['I10'], {}, [FLECAINIDE], 60, 'MALE', undefined, [], [AF_PVI]);
    expect(find(g, 'Redo AF ablation evaluation after recurrence')).toBeFalsy();
  });
});

// ---- EP-074: CTI ablation for typical atrial flutter ----
describe('EP-074 typical flutter CTI ablation', () => {
  it('fires: typical flutter (I48.3) + no prior SVT ablation', () => {
    const g = evaluateGapRules([FLUTTER], {}, [], 65, 'MALE', undefined, [], []);
    expect(find(g, 'CTI ablation not offered for typical atrial flutter')).toBeTruthy();
  });
  it('gates: prior SVT/CTI ablation present (CPT 93653)', () => {
    const g = evaluateGapRules([FLUTTER], {}, [], 65, 'MALE', undefined, [], [SVT_ABL]);
    expect(find(g, 'CTI ablation not offered for typical atrial flutter')).toBeFalsy();
  });
  it('gates: AF (not typical flutter)', () => {
    const g = evaluateGapRules([AF], {}, [], 65, 'MALE', undefined, [], []);
    expect(find(g, 'CTI ablation not offered for typical atrial flutter')).toBeFalsy();
  });
});

// ---- EP-076: SVT ablation for recurrent SVT on antiarrhythmic ----
describe('EP-076 SVT ablation on AAD', () => {
  it('fires: SVT (I47.1) + on flecainide (AAD) + no prior SVT ablation', () => {
    const g = evaluateGapRules([SVT], {}, [FLECAINIDE], 55, 'FEMALE', undefined, [], []);
    expect(find(g, 'SVT ablation not offered for recurrent SVT on antiarrhythmic')).toBeTruthy();
  });
  it('gates: SVT but not on any AAD', () => {
    const g = evaluateGapRules([SVT], {}, [], 55, 'FEMALE', undefined, [], []);
    expect(find(g, 'SVT ablation not offered for recurrent SVT on antiarrhythmic')).toBeFalsy();
  });
  it('gates: prior SVT ablation present (CPT 93653)', () => {
    const g = evaluateGapRules([SVT], {}, [FLECAINIDE], 55, 'FEMALE', undefined, [], [SVT_ABL]);
    expect(find(g, 'SVT ablation not offered for recurrent SVT on antiarrhythmic')).toBeFalsy();
  });
  it('gates: no SVT diagnosis', () => {
    const g = evaluateGapRules([AF], {}, [FLECAINIDE], 55, 'FEMALE', undefined, [], []);
    expect(find(g, 'SVT ablation not offered for recurrent SVT on antiarrhythmic')).toBeFalsy();
  });
});
