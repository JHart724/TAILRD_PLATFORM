/**
 * T1-broader PART 2 (2026-06-22, feat/t1-broader-lvesd). 3 genuinely-SPEC_ONLY net-new gaps unblocked by
 * threading 4 echo/lab slugs (tapse/fac/vegetation_size CSV-only; anti_xa both-paths LOINC 31159-7).
 * Each COR section-16-verified BEFORE build (spec.json carries detectionLogic but no COR):
 *   - SH-024  severe TR + RV dysfunction (TAPSE<17 / FAC<35) -> intervention-timing eval, Class 2a (LOE C-LD)
 *   - VHD-060 IE + isolated mobile vegetation >10mm (no embolic event) -> early surgery, Class 2b (LOE B-NR)
 *   - VHD-100 mech valve + pregnancy + LMWH + anti-Xa NOT 0.8-1.2 -> dose adjust, Class 1 (LOE B-NR)
 * Per gap: fire / gate / null / subgroup / no-double-fire (partition from SH-022 / VHD-059) / COR-coherence.
 * The 3 NOT built (HF-052 FLC, HF-134 SPEP, HF-153 tacrolimus) are existence-proxy / temporal Path-B (no test).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find((g) => typeof g.status === 'string' && g.status.includes(frag));

const TR = 'I36.1';        // nonrheumatic tricuspid (valve) insufficiency
const IE = 'I33.0';        // acute and subacute infective endocarditis
const EMBOLIC = 'I74.3';   // embolism/thrombosis of lower-extremity arteries
const MECH = 'Z95.2';      // presence of prosthetic heart valve
const PREG = 'Z33.1';      // pregnant state, incidental
const EDEMA = 'R60.9';     // edema (right-heart congestion proxy)
const ENOXAPARIN = '67108';

const SH024_FRAG = 'RV systolic dysfunction (TAPSE<17 or FAC<35)';
const SH022_FRAG = 'transcatheter tricuspid';
const VHD060_FRAG = 'large mobile vegetation';
const VHD059_FRAG = 'embolic event on therapy';
const VHD100_FRAG = 'anti-Xa out of therapeutic range';
const VHD099_FRAG = 'anticoagulation strategy SAFETY review';

// =============================================================================
// SH-024: severe TR + RV dysfunction (TAPSE<17 / FAC<35), pre-symptomatic - Class 2a
// =============================================================================
describe('SH-024 severe TR + RV systolic dysfunction', () => {
  it('fires via TAPSE<17: severe TR + TAPSE 15, no congestion', () => {
    const g = evaluateGapRules([TR], { tr_regurg_grade: 4, tapse: 15 }, [], 60, 'MALE');
    const gap = find(g, SH024_FRAG);
    expect(gap).toBeTruthy();
    expect(gap.evidence.classOfRecommendation).toBe('2a');
  });
  it('fires via FAC<35: severe TR + FAC 30', () => {
    expect(find(evaluateGapRules([TR], { tr_regurg_grade: 4, fac: 30 }, [], 60, 'MALE'), SH024_FRAG)).toBeTruthy();
  });
  it('severity gate: TAPSE 15 but NOT severe TR does NOT fire', () => {
    expect(find(evaluateGapRules([TR], { tapse: 15 }, [], 60, 'MALE'), SH024_FRAG)).toBeFalsy();
  });
  it('RV-normal gate: severe TR + TAPSE 20 + FAC 40 does NOT fire', () => {
    expect(find(evaluateGapRules([TR], { tr_regurg_grade: 4, tapse: 20, fac: 40 }, [], 60, 'MALE'), SH024_FRAG)).toBeFalsy();
  });
  it('partition / no-double-fire: congestion symptoms route to SH-022, NOT SH-024', () => {
    const g = evaluateGapRules([TR, EDEMA], { tr_regurg_grade: 4, tapse: 15 }, [], 60, 'MALE');
    expect(find(g, SH024_FRAG)).toBeFalsy();   // pre-symptomatic gate excludes
    expect(find(g, SH022_FRAG)).toBeTruthy();  // symptomatic severe TR fires SH-022 instead
  });
  it('null: severe TR but no TAPSE/FAC threaded does NOT fire', () => {
    expect(find(evaluateGapRules([TR], { tr_regurg_grade: 4 }, [], 60, 'MALE'), SH024_FRAG)).toBeFalsy();
  });
});

// =============================================================================
// VHD-060: IE + isolated mobile vegetation >10mm, no embolic event - Class 2b
// =============================================================================
describe('VHD-060 IE large mobile vegetation', () => {
  it('fires: IE + vegetation 12mm + no embolic event -> Class 2b', () => {
    const g = evaluateGapRules([IE], { vegetation_size: 12 }, [], 55, 'MALE');
    const gap = find(g, VHD060_FRAG);
    expect(gap).toBeTruthy();
    expect(gap.evidence.classOfRecommendation).toBe('2b');
  });
  it('size gate: IE + vegetation 8mm (<=10) does NOT fire', () => {
    expect(find(evaluateGapRules([IE], { vegetation_size: 8 }, [], 55, 'MALE'), VHD060_FRAG)).toBeFalsy();
  });
  it('partition: an embolic event routes to VHD-059, gates VHD-060 out (no double-fire)', () => {
    const g = evaluateGapRules([IE, EMBOLIC], { vegetation_size: 12 }, [], 55, 'MALE');
    expect(find(g, VHD060_FRAG)).toBeFalsy();
  });
  it('null: IE but no vegetation_size threaded does NOT fire', () => {
    expect(find(evaluateGapRules([IE], {}, [], 55, 'MALE'), VHD060_FRAG)).toBeFalsy();
  });
});

// =============================================================================
// VHD-100: mech valve + pregnancy + LMWH + anti-Xa not 0.8-1.2 - Class 1
// =============================================================================
describe('VHD-100 mechanical valve pregnancy LMWH anti-Xa monitoring', () => {
  it('fires (subtherapeutic): mech valve + pregnant + enoxaparin + anti-Xa 0.5 -> Class 1', () => {
    const g = evaluateGapRules([MECH, PREG], { anti_xa: 0.5 }, [ENOXAPARIN], 30, 'FEMALE');
    const gap = find(g, VHD100_FRAG);
    expect(gap).toBeTruthy();
    expect(gap.evidence.classOfRecommendation).toBe('1');
  });
  it('fires (supratherapeutic): anti-Xa 1.5 fires', () => {
    expect(find(evaluateGapRules([MECH, PREG], { anti_xa: 1.5 }, [ENOXAPARIN], 30, 'FEMALE'), VHD100_FRAG)).toBeTruthy();
  });
  it('in-range gate: anti-Xa 1.0 (0.8-1.2) does NOT fire', () => {
    expect(find(evaluateGapRules([MECH, PREG], { anti_xa: 1.0 }, [ENOXAPARIN], 30, 'FEMALE'), VHD100_FRAG)).toBeFalsy();
  });
  it('not-on-LMWH gate: anti-Xa 0.5 but no LMWH med does NOT fire', () => {
    expect(find(evaluateGapRules([MECH, PREG], { anti_xa: 0.5 }, [], 30, 'FEMALE'), VHD100_FRAG)).toBeFalsy();
  });
  it('null: on LMWH but no anti-Xa threaded does NOT fire', () => {
    expect(find(evaluateGapRules([MECH, PREG], {}, [ENOXAPARIN], 30, 'FEMALE'), VHD100_FRAG)).toBeFalsy();
  });
  it('intentional overlap: VHD-099 (strategy review) ALSO fires - distinct action, documented non-redundant', () => {
    const g = evaluateGapRules([MECH, PREG], { anti_xa: 0.5 }, [ENOXAPARIN], 30, 'FEMALE');
    expect(find(g, VHD100_FRAG)).toBeTruthy();  // dose-titration action
    expect(find(g, VHD099_FRAG)).toBeTruthy();  // which-anticoagulant strategy review
  });
});
