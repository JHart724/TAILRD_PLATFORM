/**
 * v3.0 VHD buildout chunk 5 (2026-06-17) - pregnancy SAFETY (Tier-S) + drug-induced valve surveillance.
 * VHD-099 is the highest-stakes recommendation-correctness case in VHD: the mechanical-valve pregnant patient on
 * warfarin must get a heart-team + MFM tradeoff, NOT a blanket "stop warfarin". All ICDs/drugs section-16-verified.
 * Pregnancy: O99.4x/O09/Z34/Z33.1/Z3A. Drugs: cabergoline 47579, pergolide 8047, ergotamine 4025, methysergide 6911.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const MECH = 'Z95.2';          // mechanical prosthetic valve
const PREG_CIRC = 'O99.412';   // diseases of circulatory system complicating pregnancy, 2nd trimester
const PREG_SUP = 'Z34.01';     // supervision of normal first pregnancy
const TERMINATION = 'Z33.2';   // elective termination - must NOT count as pregnant
const WARFARIN = '11289', CABERGOLINE = '47579', PERGOLIDE = '8047', ERGOTAMINE = '4025', METHYSERGIDE = '6911';

// ---- VHD-098: mechanical valve + reproductive-age female, NOT pregnant -> pre-conception counseling ----
describe('VHD-098 mechanical valve pre-conception counseling', () => {
  it('fires: mech valve + female 30 + not pregnant', () => {
    expect(find(evaluateGapRules([MECH], {}, [], 30, 'FEMALE'), 'pre-conception anticoagulation counseling gap')).toBeTruthy();
  });
  it('gate: currently pregnant -> VHD-098 does NOT fire (handled by VHD-099)', () => {
    expect(find(evaluateGapRules([MECH, PREG_SUP], {}, [], 30, 'FEMALE'), 'pre-conception anticoagulation counseling gap')).toBeFalsy();
  });
  it('gate: male', () => {
    expect(find(evaluateGapRules([MECH], {}, [], 30, 'MALE'), 'pre-conception anticoagulation counseling gap')).toBeFalsy();
  });
  it('gate: outside reproductive age (60)', () => {
    expect(find(evaluateGapRules([MECH], {}, [], 60, 'FEMALE'), 'pre-conception anticoagulation counseling gap')).toBeFalsy();
  });
});

// ---- VHD-099: mechanical valve + pregnancy -> anticoagulation SAFETY (Tier-S) ----
describe('VHD-099 mechanical valve pregnancy anticoagulation SAFETY (Tier-S)', () => {
  it('fires SAFETY_ALERT: mech valve + pregnancy (circulatory-complicating code)', () => {
    const gap = find(evaluateGapRules([MECH, PREG_CIRC], {}, [], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review');
    expect(gap).toBeTruthy();
    expect(gap.type).toBe('SAFETY_ALERT');
  });
  it('teratogenicity subgroup: on warfarin -> action is the heart-team tradeoff, NOT a blanket stop', () => {
    const gap = find(evaluateGapRules([MECH, PREG_CIRC], {}, [WARFARIN], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review');
    expect(gap.recommendations.action).toContain('embryopathy');
    expect(gap.recommendations.action).toContain('do NOT simply discontinue');
  });
  it('not-on-warfarin subgroup: confirm a guideline protocol (anticoagulation maintained)', () => {
    const gap = find(evaluateGapRules([MECH, PREG_SUP], {}, [], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review');
    expect(gap.recommendations.action).toContain('confirm a guideline');
    expect(gap.recommendations.action).not.toContain('embryopathy');
  });
  it('Path-B note documents anti-Xa (VHD-100) + 36-week delivery (VHD-101) as not-threaded', () => {
    const gap = find(evaluateGapRules([MECH, PREG_CIRC], {}, [WARFARIN], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review');
    expect(gap.recommendations.note).toContain('VHD-100');
    expect(gap.recommendations.note).toContain('VHD-101');
  });
  it('gate: pregnant but no mechanical valve', () => {
    expect(find(evaluateGapRules([PREG_CIRC], {}, [WARFARIN], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review')).toBeFalsy();
  });
  it('gate: mechanical valve but elective termination (Z33.2) is NOT "pregnant"', () => {
    expect(find(evaluateGapRules([MECH, TERMINATION], {}, [], 32, 'FEMALE'), 'anticoagulation strategy SAFETY review')).toBeFalsy();
  });
});

// ---- VHD-091: dopamine agonist -> valve surveillance echo ----
describe('VHD-091 dopamine-agonist valve surveillance', () => {
  it('fires: on cabergoline', () => {
    expect(find(evaluateGapRules([], {}, [CABERGOLINE], 55, 'FEMALE'), 'dopamine agonist therapy: drug-induced valve disease surveillance')).toBeTruthy();
  });
  it('fires: on pergolide', () => {
    expect(find(evaluateGapRules([], {}, [PERGOLIDE], 70, 'MALE'), 'dopamine agonist therapy: drug-induced valve disease surveillance')).toBeTruthy();
  });
  it('gate: not on a dopamine agonist', () => {
    expect(find(evaluateGapRules([], {}, [WARFARIN], 55, 'FEMALE'), 'dopamine agonist therapy: drug-induced valve disease surveillance')).toBeFalsy();
  });
});

// ---- VHD-092: ergot alkaloid -> valve surveillance echo ----
describe('VHD-092 ergot-alkaloid valve surveillance', () => {
  it('fires: on ergotamine', () => {
    expect(find(evaluateGapRules([], {}, [ERGOTAMINE], 48, 'FEMALE'), 'ergot-alkaloid therapy: drug-induced valve disease surveillance')).toBeTruthy();
  });
  it('fires: on methysergide', () => {
    expect(find(evaluateGapRules([], {}, [METHYSERGIDE], 48, 'FEMALE'), 'ergot-alkaloid therapy: drug-induced valve disease surveillance')).toBeTruthy();
  });
  it('gate: not on an ergot alkaloid', () => {
    expect(find(evaluateGapRules([], {}, [], 48, 'FEMALE'), 'ergot-alkaloid therapy: drug-induced valve disease surveillance')).toBeFalsy();
  });
});
