/**
 * v3.0 VHD buildout chunk 4 (2026-06-17) - IE-surgical-indication (dx-driven) + rheumatic.
 * The dx-CODABLE IE early-surgery indications (HF from valve dysfunction; embolic event on therapy) are buildable
 * (SH-029 precedent); culture/vegetation indications are Path-B. All ICDs section-16-verified. benzathine PCN 7982.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const IE = 'I33.0', HF = 'I50.20', STROKE = 'I63.9';
const RHEUM = 'I05.0', AF = 'I48.0', PRIOR_IE_HX = 'Z86.79', DENTAL = 'Z01.20';
const WARFARIN = '11289', APIXABAN = '1364430', AMOX = '723', BENZ = '7982';

// ---- VHD-057: IE + HF -> urgent surgery ----
describe('VHD-057 IE + heart failure urgent surgery', () => {
  it('fires: IE + HF', () => {
    expect(find(evaluateGapRules([IE, HF], {}, [], 55, 'MALE'), 'urgent surgery indication gap')).toBeTruthy();
  });
  it('gate: IE without HF', () => {
    expect(find(evaluateGapRules([IE], {}, [], 55, 'MALE'), 'urgent surgery indication gap')).toBeFalsy();
  });
});

// ---- VHD-059: IE + embolic on anticoag -> surgery ----
describe('VHD-059 IE + embolic on therapy surgery', () => {
  it('fires: IE + embolic stroke + on anticoag', () => {
    expect(find(evaluateGapRules([IE, STROKE], {}, [WARFARIN], 60, 'MALE'), 'embolic event on therapy: surgery consideration')).toBeTruthy();
  });
  it('gate (Path-B "on therapy"): IE + embolic but NOT on anticoag -> does not fire', () => {
    expect(find(evaluateGapRules([IE, STROKE], {}, [], 60, 'MALE'), 'embolic event on therapy: surgery consideration')).toBeFalsy();
  });
});

// ---- VHD-064: prior IE + dental -> prophylaxis ----
describe('VHD-064 prior IE dental prophylaxis', () => {
  it('fires: prior IE (Z86.79) + dental + no abx', () => {
    expect(find(evaluateGapRules([PRIOR_IE_HX, DENTAL], {}, [], 62, 'MALE'), 'Prior infective endocarditis: dental antibiotic prophylaxis')).toBeTruthy();
  });
  it('fires via active IE (I33.0) + dental', () => {
    expect(find(evaluateGapRules([IE, DENTAL], {}, [], 62, 'MALE'), 'Prior infective endocarditis: dental antibiotic prophylaxis')).toBeTruthy();
  });
  it('gate: already on amoxicillin', () => {
    expect(find(evaluateGapRules([PRIOR_IE_HX, DENTAL], {}, [AMOX], 62, 'MALE'), 'Prior infective endocarditis: dental antibiotic prophylaxis')).toBeFalsy();
  });
});

// ---- VHD-079: rheumatic + benzathine PCN prophylaxis ----
describe('VHD-079 rheumatic secondary prophylaxis', () => {
  it('fires: rheumatic heart disease + no benzathine PCN', () => {
    expect(find(evaluateGapRules([RHEUM], {}, [], 30, 'FEMALE'), 'without benzathine penicillin secondary prophylaxis')).toBeTruthy();
  });
  it('gate: already on benzathine PCN (7982)', () => {
    expect(find(evaluateGapRules([RHEUM], {}, [BENZ], 30, 'FEMALE'), 'without benzathine penicillin secondary prophylaxis')).toBeFalsy();
  });
});

// ---- VHD-083: rheumatic + AF -> warfarin (DOAC contraindicated, SAFETY subgroup) ----
describe('VHD-083 rheumatic + AF warfarin (DOAC contraindicated)', () => {
  it('fires on DOAC: rheumatic + AF + apixaban -> recommends SWITCH to warfarin', () => {
    const gap = find(evaluateGapRules([RHEUM, AF], {}, [APIXABAN], 65, 'FEMALE'), 'not on warfarin (DOAC contraindicated)');
    expect(gap).toBeTruthy();
    expect(gap.recommendations.action).toContain('switching');
  });
  it('fires on no OAC: rheumatic + AF + nothing -> recommends warfarin', () => {
    const gap = find(evaluateGapRules([RHEUM, AF], {}, [], 65, 'FEMALE'), 'not on warfarin (DOAC contraindicated)');
    expect(gap).toBeTruthy();
    expect(gap.recommendations.action).toContain('warfarin');
  });
  it('gate: already on warfarin', () => {
    expect(find(evaluateGapRules([RHEUM, AF], {}, [WARFARIN], 65, 'FEMALE'), 'not on warfarin (DOAC contraindicated)')).toBeFalsy();
  });
  it('gate: rheumatic without AF', () => {
    expect(find(evaluateGapRules([RHEUM], {}, [], 65, 'FEMALE'), 'not on warfarin (DOAC contraindicated)')).toBeFalsy();
  });
});
