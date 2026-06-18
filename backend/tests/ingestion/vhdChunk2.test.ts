/**
 * v3.0 VHD buildout chunk 2 (2026-06-17) - prosthetic-valve dysfunction (PVT vs SVD partition) - evaluator tests.
 * Reads the threaded prosthetic gradients (aortic_valve_mean_gradient / mitral_valve_mean_gradient) + the
 * AUDIT-123-corrected Z95.x semantics: mechanical = Z95.2 (generic, treated-as-mech) / Z95.4; bioprosthetic = Z95.3.
 * Elevated = aortic >=20 OR mitral >=10 mmHg. Serial-delta + new-PVL arms are Path-B (not threaded).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

const MECH = 'Z95.2';   // prosthetic valve, generic -> treated as mechanical
const BIO = 'Z95.3';    // xenogenic -> bioprosthetic (definitive)

// ---- VHD-068: mechanical prosthetic valve thrombosis (PVT) workup ----
describe('VHD-068 mechanical prosthetic valve PVT', () => {
  it('fires: mechanical valve + elevated aortic gradient (25)', () => {
    const g = evaluateGapRules([MECH], { aortic_valve_mean_gradient: 25 }, [], 70, 'MALE');
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeTruthy();
  });
  it('fires via elevated mitral prosthetic gradient (12)', () => {
    const g = evaluateGapRules([MECH], { mitral_valve_mean_gradient: 12 }, [], 70, 'MALE');
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeTruthy();
  });
  it('gate: normal aortic gradient (12)', () => {
    const g = evaluateGapRules([MECH], { aortic_valve_mean_gradient: 12 }, [], 70, 'MALE');
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeFalsy();
  });
  it('null Path-B: no gradient on file -> does not fire', () => {
    const g = evaluateGapRules([MECH], {}, [], 70, 'MALE');
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeFalsy();
  });
});

// ---- VHD-011: bioprosthetic structural valve deterioration (SVD) ----
describe('VHD-011 bioprosthetic SVD', () => {
  it('fires: bioprosthetic (Z95.3) + elevated aortic gradient (25)', () => {
    const g = evaluateGapRules([BIO], { aortic_valve_mean_gradient: 25 }, [], 75, 'MALE');
    expect(find(g, 'structural deterioration (SVD) evaluation gap')).toBeTruthy();
  });
  it('subgroup-aware: recommends ViV-TAVR vs redo surgery', () => {
    const gap = find(evaluateGapRules([BIO], { aortic_valve_mean_gradient: 25 }, [], 75, 'MALE'), 'structural deterioration (SVD) evaluation gap');
    expect(gap.recommendations.action).toContain('valve-in-valve');
    expect(gap.recommendations.action).toContain('redo');
  });
  it('gate: normal gradient', () => {
    const g = evaluateGapRules([BIO], { aortic_valve_mean_gradient: 14 }, [], 75, 'MALE');
    expect(find(g, 'structural deterioration (SVD) evaluation gap')).toBeFalsy();
  });
});

// ---- PVT-vs-SVD subgroup partition (valve type drives the pathway) ----
describe('PVT-vs-SVD partition by valve type', () => {
  it('mechanical (Z95.2) + elevated -> PVT only, NOT SVD', () => {
    const g = evaluateGapRules([MECH], { aortic_valve_mean_gradient: 25 }, [], 70, 'MALE');
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeTruthy();
    expect(find(g, 'structural deterioration (SVD) evaluation gap')).toBeFalsy();
  });
  it('bioprosthetic (Z95.3) + elevated -> SVD only, NOT PVT', () => {
    const g = evaluateGapRules([BIO], { aortic_valve_mean_gradient: 25 }, [], 70, 'MALE');
    expect(find(g, 'structural deterioration (SVD) evaluation gap')).toBeTruthy();
    expect(find(g, 'thrombosis (PVT) workup gap')).toBeFalsy();
  });
});
