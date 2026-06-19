/**
 * PV chunk 1 - batched buildable SPEC_ONLY gaps (2026-06-18, feat/pv-chunk0-tightenings).
 *
 * 7 gaps built: PV-004 (non-compressible ABI), PV-034 (FMD screen), PV-038 (Takayasu immunosuppression),
 * PV-040 (GCA steroid), PV-041 (Buerger cessation), PV-058 (symptomatic carotid revasc), PV-062 (ICAS SAMMPRIS).
 * 3 gaps Path-B (NOT built, threading/code-blocked): PV-021 (wifi_score string column not wired to labValues),
 * PV-037 (ESR/CRP not threaded), PV-060 (no clean post-carotid-revasc ICD code).
 *
 * Each built gap: fire + gate + (null/subgroup) + no-double-fire where relevant. §16 codes NLM-verified.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(frag));

// ---- value sets ----
const HTN = 'I10';
const TAKAYASU = 'M31.4';
const GCA_PMR = 'M31.5';
const GCA_OTHER = 'M31.6';
const BUERGER = 'I73.1';
const TOBACCO = 'Z72.0';
const CAROTID_R = 'I65.21';
const STROKE = 'I63.9';        // cerebral infarction, unspecified
const TIA = 'G45.9';
const ICAS = 'I67.2';          // cerebral atherosclerosis (intracranial)
const FMD = 'I77.3';
const PREDNISONE = '8640';
const METHOTREXATE = '6851';
const ASPIRIN = '1191';
const ATORVASTATIN = '83367';

const ABI_NC_FRAG = 'Non-compressible ABI';
const ABI_LOW_FRAG = 'undiagnosed peripheral artery disease'; // PV-003 (for the no-double-fire check)
const FMD_FRAG = 'fibromuscular dysplasia screening';
const TAK_FRAG = 'Takayasu arteritis without immunosuppressive';
const GCA_FRAG = 'Giant cell arteritis without glucocorticoid';
const BUERGER_FRAG = 'Buerger disease with continued tobacco';
const CAROTID_FRAG = 'Symptomatic carotid stenosis';
const ICAS_FRAG = 'intracranial stenosis without aggressive medical';

// =====================================================================================================
// PV-004: non-compressible ABI >1.40 -> TBI. The calcified-vessel companion completing the PV-003/004 pair.
// =====================================================================================================
describe('PV-004 non-compressible ABI (>1.40) -> toe-brachial follow-up', () => {
  it('fires: ABI 1.50 (non-compressible) -> TBI recommendation', () => {
    expect(find(evaluateGapRules([], { abi_left: 1.50 }, [], 70, 'MALE'), ABI_NC_FRAG)).toBeTruthy();
  });
  it('gate: ABI 1.40 (not strictly >1.40) does NOT fire', () => {
    expect(find(evaluateGapRules([], { abi_left: 1.40 }, [], 70, 'MALE'), ABI_NC_FRAG)).toBeFalsy();
  });
  it('gate: low-abnormal ABI 0.70 routes to PV-003, NOT PV-004', () => {
    expect(find(evaluateGapRules([], { abi_left: 0.70 }, [], 70, 'MALE'), ABI_NC_FRAG)).toBeFalsy();
  });
  it('ABI-pair handoff: ABI 1.50 fires PV-004 but NOT PV-003 (disjoint ranges, no double-fire)', () => {
    const g = evaluateGapRules([], { abi_left: 1.50 }, [], 70, 'MALE');
    expect(find(g, ABI_NC_FRAG)).toBeTruthy();
    expect(find(g, ABI_LOW_FRAG)).toBeFalsy();
  });
  it('null Path: no ABI threaded does NOT fire', () => {
    expect(find(evaluateGapRules([], {}, [], 70, 'MALE'), ABI_NC_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-034: FMD screening in young hypertensive women.
// =====================================================================================================
describe('PV-034 FMD screening in young hypertensive women', () => {
  it('fires: HTN + age 30 + female + no FMD dx', () => {
    expect(find(evaluateGapRules([HTN], {}, [], 30, 'FEMALE'), FMD_FRAG)).toBeTruthy();
  });
  it('gate: age 40 (>=35) does NOT fire', () => {
    expect(find(evaluateGapRules([HTN], {}, [], 40, 'FEMALE'), FMD_FRAG)).toBeFalsy();
  });
  it('subgroup gate: male does NOT fire (FMD-screen population is young women)', () => {
    expect(find(evaluateGapRules([HTN], {}, [], 30, 'MALE'), FMD_FRAG)).toBeFalsy();
  });
  it('gate: FMD already diagnosed (I77.3) does NOT fire', () => {
    expect(find(evaluateGapRules([HTN, FMD], {}, [], 30, 'FEMALE'), FMD_FRAG)).toBeFalsy();
  });
  it('gate: no hypertension does NOT fire', () => {
    expect(find(evaluateGapRules([], {}, [], 30, 'FEMALE'), FMD_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-038: Takayasu (M31.4) without immunosuppression.
// =====================================================================================================
describe('PV-038 Takayasu arteritis immunosuppression gap', () => {
  it('fires: Takayasu + no immunosuppression', () => {
    expect(find(evaluateGapRules([TAKAYASU], {}, [], 35, 'FEMALE'), TAK_FRAG)).toBeTruthy();
  });
  it('gate: Takayasu + on prednisone does NOT fire', () => {
    expect(find(evaluateGapRules([TAKAYASU], {}, [PREDNISONE], 35, 'FEMALE'), TAK_FRAG)).toBeFalsy();
  });
  it('gate: Takayasu + on a steroid-sparing agent (methotrexate) does NOT fire', () => {
    expect(find(evaluateGapRules([TAKAYASU], {}, [METHOTREXATE], 35, 'FEMALE'), TAK_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-040: GCA (M31.5/M31.6) without glucocorticoid. Distinct from Takayasu (subgroup separation).
// =====================================================================================================
describe('PV-040 giant cell arteritis urgent glucocorticoid gap', () => {
  it('fires: GCA with PMR (M31.5) + no steroid', () => {
    expect(find(evaluateGapRules([GCA_PMR], {}, [], 72, 'FEMALE'), GCA_FRAG)).toBeTruthy();
  });
  it('fires: other GCA (M31.6) + no steroid', () => {
    expect(find(evaluateGapRules([GCA_OTHER], {}, [], 72, 'FEMALE'), GCA_FRAG)).toBeTruthy();
  });
  it('gate: GCA + on prednisone does NOT fire', () => {
    expect(find(evaluateGapRules([GCA_PMR], {}, [PREDNISONE], 72, 'FEMALE'), GCA_FRAG)).toBeFalsy();
  });
  it('subgroup separation: Takayasu (M31.4) does NOT fire the GCA gap (and vice versa)', () => {
    const tak = evaluateGapRules([TAKAYASU], {}, [], 35, 'FEMALE');
    expect(find(tak, GCA_FRAG)).toBeFalsy();      // Takayasu is not GCA
    expect(find(tak, TAK_FRAG)).toBeTruthy();     // it fires its own PV-038
    const gca = evaluateGapRules([GCA_PMR], {}, [], 72, 'FEMALE');
    expect(find(gca, TAK_FRAG)).toBeFalsy();      // GCA is not Takayasu
  });
});

// =====================================================================================================
// PV-041: Buerger (I73.1) + tobacco -> cessation is disease-modifying.
// =====================================================================================================
describe('PV-041 Buerger disease smoking cessation (disease-modifying)', () => {
  it('fires: Buerger + active tobacco use', () => {
    expect(find(evaluateGapRules([BUERGER, TOBACCO], {}, [], 38, 'MALE'), BUERGER_FRAG)).toBeTruthy();
  });
  it('gate: Buerger without tobacco use does NOT fire', () => {
    expect(find(evaluateGapRules([BUERGER], {}, [], 38, 'MALE'), BUERGER_FRAG)).toBeFalsy();
  });
  it('subgroup framing: the recommendation is cessation-is-treatment (disease-modifying), not generic risk reduction', () => {
    const g = find(evaluateGapRules([BUERGER, TOBACCO], {}, [], 38, 'MALE'), BUERGER_FRAG);
    expect(g.recommendations.note).toContain('cessation IS the treatment');
  });
});

// =====================================================================================================
// PV-058: symptomatic carotid stenosis (recent stroke/TIA + carotid stenosis). Symptomatic-vs-asymptomatic subgroup.
// =====================================================================================================
describe('PV-058 symptomatic carotid stenosis revascularization evaluation', () => {
  it('fires: carotid stenosis (I65.21) + recent stroke (I63)', () => {
    expect(find(evaluateGapRules([CAROTID_R, STROKE], {}, [], 68, 'MALE'), CAROTID_FRAG)).toBeTruthy();
  });
  it('fires: carotid stenosis + TIA (G45)', () => {
    expect(find(evaluateGapRules([CAROTID_R, TIA], {}, [], 68, 'MALE'), CAROTID_FRAG)).toBeTruthy();
  });
  it('subgroup gate: ASYMPTOMATIC carotid stenosis (no stroke/TIA) does NOT fire (different/weaker indication)', () => {
    expect(find(evaluateGapRules([CAROTID_R], {}, [], 68, 'MALE'), CAROTID_FRAG)).toBeFalsy();
  });
  it('gate: stroke without carotid stenosis does NOT fire', () => {
    expect(find(evaluateGapRules([STROKE], {}, [], 68, 'MALE'), CAROTID_FRAG)).toBeFalsy();
  });
});

// =====================================================================================================
// PV-062: symptomatic intracranial stenosis (I67.2 + event) without aggressive medical therapy (SAMMPRIS).
// =====================================================================================================
describe('PV-062 intracranial stenosis aggressive medical therapy (SAMMPRIS)', () => {
  it('fires: ICAS (I67.2) + recent TIA + no antiplatelet/statin', () => {
    expect(find(evaluateGapRules([ICAS, TIA], {}, [], 66, 'MALE'), ICAS_FRAG)).toBeTruthy();
  });
  it('fires: ICAS + event + on statin but NO antiplatelet (either-missing fires)', () => {
    expect(find(evaluateGapRules([ICAS, TIA], {}, [ATORVASTATIN], 66, 'MALE'), ICAS_FRAG)).toBeTruthy();
  });
  it('gate: ICAS + event + on BOTH antiplatelet and statin (therapy adequate) does NOT fire', () => {
    expect(find(evaluateGapRules([ICAS, TIA], {}, [ASPIRIN, ATORVASTATIN], 66, 'MALE'), ICAS_FRAG)).toBeFalsy();
  });
  it('gate: ICAS without a recent cerebral event does NOT fire', () => {
    expect(find(evaluateGapRules([ICAS], {}, [], 66, 'MALE'), ICAS_FRAG)).toBeFalsy();
  });
  it('subgroup framing: the recommendation is aggressive MEDICAL therapy, explicitly NOT stenting', () => {
    const g = find(evaluateGapRules([ICAS, TIA], {}, [], 66, 'MALE'), ICAS_FRAG);
    expect(g.recommendations.note).toContain('NOT intervention');
  });
});
