/**
 * PV chunk 0 - tightenings + the foundational ABI build (2026-06-18, feat/pv-chunk0-tightenings).
 *
 * Covers AUDIT-178 (5 over-credit tightenings), AUDIT-179 (PV-003 foundational abnormal-ABI build +
 * PV-ANTICOAG-VTE code-mismatch fix). Each fix gets a regression assertion (the gap STILL fires for the
 * genuine spec population) and a no-over-narrowing / no-over-credit assertion (the now-excluded population
 * no longer fires). PV-018/024 SPEC_ONLY (AUDIT-180) is a canonical-reconcile change, not a runtime change,
 * so it is verified in the canonical pipeline, not here.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(frag));

// --- value sets used across cases ---
const PAD = 'I70.211';        // atherosclerosis of native arteries, right leg, claudication (hasPAD)
const DM = 'E11.9';           // type 2 diabetes (hasDiabetes)
const HTN = 'I10';            // essential hypertension (hasHTN_PV11)
const NADOLOL = '7226';       // beta-blocker class
const DILTIAZEM = '3443';     // CCB class
const SPIRONOLACTONE = '9997';// diuretic class
const WARFARIN = '11289';     // OAC (OAC_CODES_VTE)

const ABI_FRAG = 'undiagnosed peripheral artery disease';
const A1C_FRAG = 'glycemic optimization gap';
const RAS_FRAG = 'Renal artery stenosis screening';
const VARICOSE_FRAG = 'symptomatic varicose veins';
const VTE_FRAG = 'VTE anticoagulation duration';
const GRAFT_FRAG = 'interval duplex surveillance';

// =====================================================================================================
// PV-003 (AUDIT-179): abnormal ABI <=0.90 without coded PAD -> undiagnosed PAD. The module's first
// rule to read an ABI VALUE threshold (previously ABI was a presence flag only).
// =====================================================================================================
describe('PV-003 abnormal ABI without coded PAD (AUDIT-179 foundational build)', () => {
  it('fires: ABI 0.70 (left) in a patient with NO PAD diagnosis', () => {
    expect(find(evaluateGapRules([], { abi_left: 0.70 }, [], 65, 'MALE'), ABI_FRAG)).toBeTruthy();
  });
  it('fires at the diagnostic edge: ABI 0.90', () => {
    expect(find(evaluateGapRules([], { abi_left: 0.90 }, [], 65, 'MALE'), ABI_FRAG)).toBeTruthy();
  });
  it('fires on the right leg alone (either-leg logic)', () => {
    expect(find(evaluateGapRules([], { abi_right: 0.80 }, [], 65, 'MALE'), ABI_FRAG)).toBeTruthy();
  });
  it('gate: normal ABI 1.00 does NOT fire', () => {
    expect(find(evaluateGapRules([], { abi_left: 1.00 }, [], 65, 'MALE'), ABI_FRAG)).toBeFalsy();
  });
  it('subgroup gate: non-compressible ABI >1.40 is routed to PV-004, NOT conflated here', () => {
    expect(find(evaluateGapRules([], { abi_left: 1.50 }, [], 65, 'MALE'), ABI_FRAG)).toBeFalsy();
  });
  it('gate: PAD already coded (I70.211) does NOT fire (already diagnosed, not a documentation gap)', () => {
    expect(find(evaluateGapRules([PAD], { abi_left: 0.70 }, [], 65, 'MALE'), ABI_FRAG)).toBeFalsy();
  });
  it('null Path: no ABI threaded does NOT fire (no existence-proxy over-credit)', () => {
    expect(find(evaluateGapRules([], {}, [], 65, 'MALE'), ABI_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-6 / GAP-PV-015 (AUDIT-178): HbA1c above target in PAD+DM. Tightened from hba1c===undefined
// (existence-proxy) to a real threshold hba1c >= 7.0%.
// =====================================================================================================
describe('PV-6 HbA1c above target in PAD with diabetes (AUDIT-178 tightening)', () => {
  it('fires: PAD + DM + HbA1c 8.0 (above the 7.0% target)', () => {
    expect(find(evaluateGapRules([PAD, DM], { hba1c: 8.0 }, [], 60, 'MALE'), A1C_FRAG)).toBeTruthy();
  });
  it('fires at the threshold edge: HbA1c 7.0', () => {
    expect(find(evaluateGapRules([PAD, DM], { hba1c: 7.0 }, [], 60, 'MALE'), A1C_FRAG)).toBeTruthy();
  });
  it('gate: at-target HbA1c 6.5 (<7.0) does NOT fire', () => {
    expect(find(evaluateGapRules([PAD, DM], { hba1c: 6.5 }, [], 60, 'MALE'), A1C_FRAG)).toBeFalsy();
  });
  it('no over-credit: HbA1c not measured (undefined) does NOT fire (the old existence-proxy is gone)', () => {
    expect(find(evaluateGapRules([PAD, DM], {}, [], 60, 'MALE'), A1C_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-12 / GAP-PV-033 (AUDIT-178): renal artery stenosis screen. Tightened to require an actual
// resistant-HTN signal (>=3 concurrent antihypertensive classes), not bare PAD+HTN+renal.
// =====================================================================================================
describe('PV-12 renal artery stenosis screen - resistant-HTN gate (AUDIT-178 tightening)', () => {
  it('fires: PAD + HTN + 3 antihypertensive classes (BB+CCB+diuretic) + eGFR 45', () => {
    const g = evaluateGapRules([PAD, HTN], { egfr: 45 }, [NADOLOL, DILTIAZEM, SPIRONOLACTONE], 68, 'MALE');
    expect(find(g, RAS_FRAG)).toBeTruthy();
  });
  it('no over-credit: only 2 antihypertensive classes does NOT fire (not resistant HTN)', () => {
    const g = evaluateGapRules([PAD, HTN], { egfr: 45 }, [NADOLOL, DILTIAZEM], 68, 'MALE');
    expect(find(g, RAS_FRAG)).toBeFalsy();
  });
  it('gate: 3 classes but preserved renal function (eGFR 70) does NOT fire', () => {
    const g = evaluateGapRules([PAD, HTN], { egfr: 70 }, [NADOLOL, DILTIAZEM, SPIRONOLACTONE], 68, 'MALE');
    expect(find(g, RAS_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-VARICOSE / GAP-PV-071 (AUDIT-178): symptomatic/complicated varicose veins. Tightened from bare
// I83 (incl asymptomatic I83.9) to the complicated subcodes I83.0/.1/.2/.8.
// =====================================================================================================
describe('PV-VARICOSE symptomatic varicose veins (AUDIT-178 tightening)', () => {
  it('fires: I83.0 (varicose veins with ulcer - CEAP 3+/symptomatic)', () => {
    expect(find(evaluateGapRules(['I83.012'], {}, [], 55, 'FEMALE'), VARICOSE_FRAG)).toBeTruthy();
  });
  it('fires: I83.819 (varicose veins with pain)', () => {
    expect(find(evaluateGapRules(['I83.819'], {}, [], 55, 'FEMALE'), VARICOSE_FRAG)).toBeTruthy();
  });
  it('no over-credit: asymptomatic I83.9 does NOT fire', () => {
    expect(find(evaluateGapRules(['I83.91'], {}, [], 55, 'FEMALE'), VARICOSE_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-ANTICOAG-VTE / GAP-PV-076 (AUDIT-179): post-PE anticoagulation duration. Fixed to detect its spec
// population (PE, I26) which the I82-only trigger had missed entirely; DVT (I82) retained.
// =====================================================================================================
describe('PV-ANTICOAG-VTE duration review - PE population fix (AUDIT-179)', () => {
  it('fires: PE (I26.99) on an OAC - the spec population that the old I82-only rule MISSED', () => {
    expect(find(evaluateGapRules(['I26.99'], {}, [WARFARIN], 62, 'MALE'), VTE_FRAG)).toBeTruthy();
  });
  it('still fires: DVT (I82.401) on an OAC - retained (VTE duration applies to both)', () => {
    expect(find(evaluateGapRules(['I82.401'], {}, [WARFARIN], 62, 'MALE'), VTE_FRAG)).toBeTruthy();
  });
  it('gate: VTE without an anticoagulant on the med list does NOT fire', () => {
    expect(find(evaluateGapRules(['I26.99'], {}, [], 62, 'MALE'), VTE_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-GRAFT-SURVEILLANCE / GAP-PV-098 (AUDIT-178): bypass graft duplex surveillance. Added a genuine
// interval comparison (overdue at >12 months OR never documented); recently-surveilled patients gate out.
// =====================================================================================================
describe('PV-GRAFT-SURVEILLANCE interval comparison (AUDIT-178 tightening)', () => {
  const GRAFT = 'Z95.820'; // presence of peripheral vascular graft (Z95.8*)
  it('fires: graft + PAD with surveillance overdue (18 months)', () => {
    expect(find(evaluateGapRules([GRAFT, PAD], { graft_duplex_months: 18 }, [], 70, 'MALE'), GRAFT_FRAG)).toBeTruthy();
  });
  it('fires: graft + PAD with no surveillance ever documented (undefined)', () => {
    expect(find(evaluateGapRules([GRAFT, PAD], {}, [], 70, 'MALE'), GRAFT_FRAG)).toBeTruthy();
  });
  it('no over-credit: recently surveilled (6 months <= 12) does NOT fire', () => {
    expect(find(evaluateGapRules([GRAFT, PAD], { graft_duplex_months: 6 }, [], 70, 'MALE'), GRAFT_FRAG)).toBeFalsy();
  });
});
