/**
 * v3.0 SH buildout chunk 2 (2026-06-17) - Mitral regurgitation severity - evaluator tests.
 * Reads the threaded MR severity (echo-severity unlock PR #404): mitral_eroa / mitral_regurg_grade (0-4) /
 * valve_severity (0-5) / pasp. SH-014 + SH-064 are AUDIT-125 tightenings (severity gates added to the prior
 * dx-alone over-detectors). PRIMARY (degenerative) vs SECONDARY (functional, HF+low-EF) MR is the key routing.
 * SH-066 (recurrent MR after TEER) deferred - needs TEER CPT + serial MR grade (not threaded).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const MR = 'I34.0';      // nonrheumatic mitral insufficiency
const HF = 'I50.20';     // heart failure (secondary-MR context with low EF)
const AF = 'I48.0';      // atrial fibrillation
const DYSPNEA = 'R06.0'; // symptom

// ---- SH-014: severe PRIMARY MR -> surgical referral (AUDIT-125 tightened) ----
describe('SH-014 severe primary MR -> surgical', () => {
  it('fires: primary severe MR (EROA 0.45) + symptomatic', () => {
    const g = evaluateGapRules([MR, DYSPNEA], { mitral_eroa: 0.45 }, [], 60, 'MALE');
    expect(find(g, 'severe primary mitral regurgitation')).toBeTruthy();
  });
  it('fires: severe via regurg grade 4 or valve_severity 5', () => {
    expect(find(evaluateGapRules([MR, DYSPNEA], { mitral_regurg_grade: 4 }, [], 60, 'MALE'), 'severe primary mitral')).toBeTruthy();
    expect(find(evaluateGapRules([MR, DYSPNEA], { valve_severity: 5 }, [], 60, 'MALE'), 'severe primary mitral')).toBeTruthy();
  });
  it('subgroup-aware: recommends surgical REPAIR (primary), not TEER', () => {
    const gap = find(evaluateGapRules([MR, DYSPNEA], { mitral_eroa: 0.45 }, [], 60, 'MALE'), 'severe primary mitral');
    expect(gap.recommendations.action).toContain('repair');
    expect(gap.recommendations.action).not.toContain('TEER');
  });
  it('primary-vs-secondary routing: secondary MR (HF + LVEF<50) does NOT fire SH-014 (routes to GDMT/TEER)', () => {
    const g = evaluateGapRules([MR, HF], { mitral_eroa: 0.45, lvef: 40 }, [], 60, 'MALE');
    expect(find(g, 'severe primary mitral regurgitation')).toBeFalsy();
  });
  it('AUDIT-125 regression: I34.0 + LVEF 55 but NO MR severity -> does NOT fire (old over-detector did)', () => {
    const g = evaluateGapRules([MR, DYSPNEA], { lvef: 55 }, [], 60, 'MALE');
    expect(find(g, 'severe primary mitral regurgitation')).toBeFalsy();
  });
  it('gates: sub-threshold EROA 0.25', () => {
    const g = evaluateGapRules([MR, DYSPNEA], { mitral_eroa: 0.25 }, [], 60, 'MALE');
    expect(find(g, 'severe primary mitral regurgitation')).toBeFalsy();
  });
});

// ---- SH-016: severe primary MR + new AF (Class IIa) ----
describe('SH-016 severe primary MR + new AF', () => {
  it('fires: severe primary MR (grade 4) + AF', () => {
    const g = evaluateGapRules([MR, AF], { mitral_regurg_grade: 4 }, [], 62, 'MALE');
    expect(find(g, 'severe primary MR with new atrial fibrillation')).toBeTruthy();
  });
  it('gates: no AF', () => {
    const g = evaluateGapRules([MR], { mitral_regurg_grade: 4 }, [], 62, 'MALE');
    expect(find(g, 'severe primary MR with new atrial fibrillation')).toBeFalsy();
  });
  it('gates: secondary MR (HF + low EF) even with AF', () => {
    const g = evaluateGapRules([MR, AF, HF], { mitral_regurg_grade: 4, lvef: 40 }, [], 62, 'MALE');
    expect(find(g, 'severe primary MR with new atrial fibrillation')).toBeFalsy();
  });
});

// ---- SH-017: severe primary MR + pulmonary hypertension (Class IIa) ----
describe('SH-017 severe primary MR + PASP>50', () => {
  it('fires: severe primary MR (valve_severity 5) + PASP 55', () => {
    const g = evaluateGapRules([MR], { valve_severity: 5, pasp: 55 }, [], 62, 'FEMALE');
    expect(find(g, 'severe primary MR with pulmonary hypertension')).toBeTruthy();
  });
  it('gates: PASP 40 (not elevated)', () => {
    const g = evaluateGapRules([MR], { valve_severity: 5, pasp: 40 }, [], 62, 'FEMALE');
    expect(find(g, 'severe primary MR with pulmonary hypertension')).toBeFalsy();
  });
});

// ---- SH-064: TMVR candidacy for severe MR (AUDIT-125 tightened) ----
describe('SH-064 TMVR candidacy for severe MR', () => {
  it('fires: severe MR (EROA 0.45) + age 78', () => {
    const g = evaluateGapRules([MR], { mitral_eroa: 0.45 }, [], 78, 'MALE');
    expect(find(g, 'Transcatheter mitral valve replacement candidacy')).toBeTruthy();
  });
  it('AUDIT-125 gate: sub-threshold EROA 0.25 (not severe) -> does NOT fire', () => {
    const g = evaluateGapRules([MR], { mitral_eroa: 0.25 }, [], 78, 'MALE');
    expect(find(g, 'Transcatheter mitral valve replacement candidacy')).toBeFalsy();
  });
  it('gates: age 70 (not high-risk-proxy >75)', () => {
    const g = evaluateGapRules([MR], { mitral_eroa: 0.45 }, [], 70, 'MALE');
    expect(find(g, 'Transcatheter mitral valve replacement candidacy')).toBeFalsy();
  });
});
