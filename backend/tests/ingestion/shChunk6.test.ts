/**
 * v3.0 SH buildout chunk 6 (2026-06-17) - valve-procedure + remaining buildable SH gaps.
 * Built on the RESOLVED AUDIT-123/124 Z95.x semantics (Z95.3 = bioprosthetic). Post-AVR proxy = Z95.2||Z95.3 +
 * AS history. All ICDs section-16-verified vs NLM. CPT-gated gaps (SH-065/066/082/083/104) stay parked.
 * RxCUIs: aspirin 1191, clopidogrel 32968 (P2Y12).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const BIOAV = 'Z95.3';      // xenogenic aortic bioprosthesis
const AS = 'I35.0';         // aortic stenosis history (post-AVR proxy)
const AF = 'I48.0';
const LBBB = 'I44.7', AVB_COMPLETE = 'I44.2';
const PE_HX = 'Z86.711', DYSPNEA = 'R06.0';
const COARCT = 'Q25.1', CCTGA = 'Q20.5';
const ASPIRIN = '1191', CLOPIDOGREL = '32968';

// ---- SH-059: post-AVR antithrombotic de-escalation (subgroup-aware) ----
describe('SH-059 post-AVR antithrombotic regimen review', () => {
  it('fires: post-AVR on DAPT (aspirin + P2Y12), no AF -> de-escalate to single antiplatelet', () => {
    const g = evaluateGapRules([BIOAV, AS], {}, [ASPIRIN, CLOPIDOGREL], 78, 'MALE');
    const gap = find(g, 'antithrombotic regimen reassessment gap');
    expect(gap).toBeTruthy();
    expect(gap.recommendations.action).toContain('de-escalat');
  });
  it('subgroup: post-AVR on DAPT + AF -> recommends oral anticoagulation', () => {
    const gap = find(evaluateGapRules([BIOAV, AS, AF], {}, [ASPIRIN, CLOPIDOGREL], 78, 'MALE'), 'antithrombotic regimen reassessment gap');
    expect(gap.recommendations.action).toContain('anticoagulation');
  });
  it('gate: on aspirin only (not DAPT) -> does not fire', () => {
    expect(find(evaluateGapRules([BIOAV, AS], {}, [ASPIRIN], 78, 'MALE'), 'antithrombotic regimen reassessment gap')).toBeFalsy();
  });
  it('gate: no prosthetic AV -> does not fire', () => {
    expect(find(evaluateGapRules([AS], {}, [ASPIRIN, CLOPIDOGREL], 78, 'MALE'), 'antithrombotic regimen reassessment gap')).toBeFalsy();
  });
});

// ---- SH-057 / SH-060: post-AVR conduction (LBBB->monitor vs high-grade->pace) ----
describe('SH-057 / SH-060 post-AVR conduction subgroup', () => {
  it('SH-057: post-AVR + new LBBB -> ambulatory monitoring', () => {
    expect(find(evaluateGapRules([BIOAV, AS, LBBB], {}, [], 80, 'MALE'), 'new LBBB without ambulatory rhythm monitoring')).toBeTruthy();
  });
  it('SH-060: post-AVR + complete AV block -> pacing decision', () => {
    expect(find(evaluateGapRules([BIOAV, AS, AVB_COMPLETE], {}, [], 80, 'MALE'), 'high-grade AV block: permanent pacing decision')).toBeTruthy();
  });
  it('subgroup separation: LBBB does NOT trigger the pacing-decision gap', () => {
    expect(find(evaluateGapRules([BIOAV, AS, LBBB], {}, [], 80, 'MALE'), 'permanent pacing decision')).toBeFalsy();
  });
  it('gate: conduction disease without prosthetic AV -> neither fires', () => {
    const g = evaluateGapRules([LBBB], {}, [], 80, 'MALE');
    expect(find(g, 'new LBBB without ambulatory')).toBeFalsy();
  });
});

// ---- SH-012: prosthetic valve structural deterioration (elevated gradient) ----
describe('SH-012 prosthetic SVD', () => {
  it('fires: prosthetic valve + elevated mean gradient 25', () => {
    expect(find(evaluateGapRules([BIOAV], { aortic_valve_mean_gradient: 25 }, [], 75, 'MALE'), 'structural deterioration evaluation gap')).toBeTruthy();
  });
  it('gate: gradient 12 (normal for a prosthesis)', () => {
    expect(find(evaluateGapRules([BIOAV], { aortic_valve_mean_gradient: 12 }, [], 75, 'MALE'), 'structural deterioration evaluation gap')).toBeFalsy();
  });
  it('null Path-B: no gradient on file -> does not fire', () => {
    expect(find(evaluateGapRules([BIOAV], {}, [], 75, 'MALE'), 'structural deterioration evaluation gap')).toBeFalsy();
  });
});

// ---- SH-092 / SH-095 / SH-097: remaining buildable surveillance gaps ----
describe('SH-092 / SH-095 / SH-097 surveillance', () => {
  it('SH-092: PE history + persistent dyspnea -> CTEPH workup', () => {
    expect(find(evaluateGapRules([PE_HX, DYSPNEA], {}, [], 60, 'FEMALE'), 'CTEPH surveillance workup gap')).toBeTruthy();
  });
  it('SH-092 gate: PE history without dyspnea', () => {
    expect(find(evaluateGapRules([PE_HX], {}, [], 60, 'FEMALE'), 'CTEPH surveillance workup gap')).toBeFalsy();
  });
  it('SH-095: coarctation -> serial imaging surveillance', () => {
    expect(find(evaluateGapRules([COARCT], {}, [], 30, 'MALE'), 'Coarctation of the aorta without serial imaging')).toBeTruthy();
  });
  it('SH-097: ccTGA (systemic RV) -> ACHD-center surveillance', () => {
    expect(find(evaluateGapRules([CCTGA], {}, [], 35, 'FEMALE'), 'Systemic right ventricle')).toBeTruthy();
  });
  it('hospice gates the surveillance gaps', () => {
    expect(find(evaluateGapRules([COARCT, 'Z51.5'], {}, [], 30, 'MALE'), 'Coarctation of the aorta without serial imaging')).toBeFalsy();
  });
});
