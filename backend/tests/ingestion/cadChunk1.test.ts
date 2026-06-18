/**
 * CAD chunk 1 - lipid/risk SPEC_ONLY buildout (2026-06-18, feat/cad-chunk1-lipid-risk).
 * CAD-013 (FH cascade): severe LDL >= 190 without an FH diagnosis -> FH evaluation + cascade screening of
 * first-degree relatives + high-intensity lowering. LDL threaded (labValues['ldl']); FH ICD E78.01x NLM-verified.
 * CAD-009 (ApoB) is Path-B this chunk: ApoB is NOT threaded (no LOINC/CSV/slug), so it is not built (an
 * unthreaded existence-proxy would always-fire - the AUDIT-177 over-credit anti-pattern).
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(frag));

const CAD = 'I25.10';
const FH_HET = 'E78.011';     // heterozygous familial hypercholesterolemia
const ATORVASTATIN = '83367';
const FH_FRAG = 'familial hypercholesterolemia evaluation and cascade screening';

// ---- CAD-013: FH cascade screening (severe LDL >= 190 without FH dx) ----
describe('CAD-013 FH cascade screening', () => {
  it('fires: LDL 210 + no FH diagnosis -> FH evaluation/cascade gap', () => {
    expect(find(evaluateGapRules([CAD], { ldl: 210 }, [], 50, 'MALE'), FH_FRAG)).toBeTruthy();
  });
  it('fires at the threshold edge: LDL 190', () => {
    expect(find(evaluateGapRules([CAD], { ldl: 190 }, [], 50, 'MALE'), FH_FRAG)).toBeTruthy();
  });
  it('gate: LDL 150 (< 190) does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], { ldl: 150 }, [], 50, 'MALE'), FH_FRAG)).toBeFalsy();
  });
  it('gate: FH already diagnosed (E78.011) does NOT fire (already evaluated)', () => {
    expect(find(evaluateGapRules([CAD, FH_HET], { ldl: 210 }, [], 50, 'MALE'), FH_FRAG)).toBeFalsy();
  });
  it('null Path-B: no LDL threaded does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 50, 'MALE'), FH_FRAG)).toBeFalsy();
  });
  it('subgroup: the recommendation is cascade screening of relatives (the FH-specific element), not statin alone', () => {
    const gap = find(evaluateGapRules([CAD], { ldl: 210 }, [], 50, 'MALE'), FH_FRAG);
    expect(gap.recommendations.action).toContain('cascade screening of first-degree relatives');
  });
  it('no redundant double-fire (untreated): LDL 210 + NOT on statin -> CAD-013 fires, the on-statin ezetimibe add-on (CAD-003) does NOT', () => {
    const g = evaluateGapRules([CAD], { ldl: 210 }, [], 50, 'MALE');
    expect(find(g, FH_FRAG)).toBeTruthy();
    expect(find(g, 'ezetimibe add-on')).toBeFalsy(); // CAD-EZETIMIBE requires on-statin; clean separation for the untreated FH patient
  });
});

// ---- CAD-009 (ApoB): Path-B guard - confirm NOT built (no always-fire existence-proxy) ----
describe('CAD-009 ApoB is Path-B (not built - ApoB unthreaded)', () => {
  it('no ApoB gap fires for an ASCVD patient (the unthreaded existence-proxy was deliberately not built)', () => {
    const g = evaluateGapRules([CAD], { ldl: 90 }, [ATORVASTATIN], 55, 'MALE');
    expect(g.find((x: any) => typeof x.status === 'string' && /apo.?b|apolipoprotein/i.test(x.status))).toBeFalsy();
  });
});
