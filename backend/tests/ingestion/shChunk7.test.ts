/**
 * v3.0 SH buildout chunk 7 (2026-06-17) - CPT-unblocked post-procedure gaps.
 * Detect a prior procedure via the engine-wide procedureCodes param (8th arg). CPTs cleared the two-key bar
 * (manufacturer reimbursement guide + operator): 93580 = ASD/PFO closure (Abbott Amplatzer), 93581 = VSD,
 * 33418/33419 = mitral TEER (Abbott MitraClip). SH-104 (ASA 93583) stays PARKED (no manufacturer guide).
 * evaluateGapRules signature: (dxCodes, labValues, medCodes, age, gender, race, meds, procedureCodes).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], statusFragment: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(statusFragment));

// helper to place procedureCodes at the 8th arg
const run = (dx: string[], labs: Record<string, number>, meds: string[], procs: string[], age = 70) =>
  evaluateGapRules(dx, labs, meds, age, 'MALE', undefined, [], procs);

const ASD_PFO = '93580', VSD = '93581', MTEER = '33418';
const ASPIRIN = '1191', WARFARIN = '11289', AF = 'I48.0';

// ---- SH-082: post-closure antithrombotic (subgroup-aware) ----
describe('SH-082 post-septal-closure antithrombotic', () => {
  it('fires: 93580 closure + no antithrombotic, no AF -> antiplatelet pathway', () => {
    const gap = find(run([], { lvef: 55 }, [], [ASD_PFO]), 'Post-septal-closure device without an antithrombotic');
    expect(gap).toBeTruthy();
    expect(gap.recommendations.action).toContain('antiplatelet');
  });
  it('subgroup: closure + AF -> oral anticoagulation', () => {
    const gap = find(run([AF], { lvef: 55 }, [], [ASD_PFO]), 'Post-septal-closure device without an antithrombotic');
    expect(gap.recommendations.action).toContain('anticoagulation');
  });
  it('gate: already on an antithrombotic (aspirin) -> does not fire', () => {
    expect(find(run([], { lvef: 55 }, [ASPIRIN], [ASD_PFO]), 'Post-septal-closure device without an antithrombotic')).toBeFalsy();
  });
  it('gate: OAC counts as antithrombotic', () => {
    expect(find(run([AF], { lvef: 55 }, [WARFARIN], [ASD_PFO]), 'Post-septal-closure device without an antithrombotic')).toBeFalsy();
  });
  it('null Path-B: no closure procedure on record -> does not fire (CPT-gated)', () => {
    expect(find(run([], { lvef: 55 }, [], []), 'Post-septal-closure device without an antithrombotic')).toBeFalsy();
  });
  it('VSD closure (93581) also triggers', () => {
    expect(find(run([], { lvef: 55 }, [], [VSD]), 'Post-septal-closure device without an antithrombotic')).toBeTruthy();
  });
});

// ---- SH-083: post-closure residual-shunt surveillance echo ----
describe('SH-083 post-closure surveillance echo', () => {
  it('fires: 93580 + no recent echo (lvef absent)', () => {
    expect(find(run([], {}, [ASPIRIN], [ASD_PFO]), 'Post-septal-closure without surveillance echo')).toBeTruthy();
  });
  it('gate: recent echo present (lvef on file)', () => {
    expect(find(run([], { lvef: 55 }, [ASPIRIN], [ASD_PFO]), 'Post-septal-closure without surveillance echo')).toBeFalsy();
  });
});

// ---- SH-065 / SH-066: post-mitral-TEER surveillance + recurrent MR ----
describe('SH-065 / SH-066 post-mitral-TEER', () => {
  it('SH-065 fires: mitral TEER (33418) + no recent echo', () => {
    expect(find(run([], {}, [], [MTEER]), 'Post-mitral-TEER without annual surveillance echo')).toBeTruthy();
  });
  it('SH-065 gate: no TEER procedure on record', () => {
    expect(find(run([], {}, [], []), 'Post-mitral-TEER without annual surveillance echo')).toBeFalsy();
  });
  it('SH-066 fires: mitral TEER + recurrent significant MR (EROA 0.35)', () => {
    expect(find(run([], { mitral_eroa: 0.35 }, [], [MTEER]), 'Recurrent significant MR after mitral TEER')).toBeTruthy();
  });
  it('SH-066 fires via valve_severity 4 (moderate-severe)', () => {
    expect(find(run([], { valve_severity: 4 }, [], [MTEER]), 'Recurrent significant MR after mitral TEER')).toBeTruthy();
  });
  it('SH-066 gate: TEER present but no significant residual MR', () => {
    expect(find(run([], { mitral_regurg_grade: 1 }, [], [MTEER]), 'Recurrent significant MR after mitral TEER')).toBeFalsy();
  });
});
