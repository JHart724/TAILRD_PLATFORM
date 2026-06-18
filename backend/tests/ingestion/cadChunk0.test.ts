/**
 * CAD chunk 0 - audit-surfaced TIGHTENINGS (2026-06-18, feat/cad-chunk0-tightenings).
 * Each tightening has a regression test (proves the over-fire / false-fire is closed) AND a no-over-narrowing
 * test (proves the genuine case still fires). Corrections to live production behavior per AUDIT-173..177.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const find = (gaps: any[], frag: string) =>
  gaps.find(g => typeof g.status === 'string' && g.status.includes(frag));

const CAD = 'I25.10';        // atherosclerotic heart disease (chronic, stable)
const CABG = 'Z95.1';        // presence of aortocoronary bypass graft
const PCI = 'Z95.5';         // presence of coronary angioplasty implant and graft
const MI_ACUTE = 'I21.4';    // acute NSTEMI
const MI_OLD = 'I25.2';      // old myocardial infarction
const PRASUGREL = '613391', TICAGRELOR = '1116632', CLOPIDOGREL = '32968';

// ---- Tightening 1 (AUDIT-173): CAD-REHAB split (post-CABG / post-MI), no longer all-CAD ----
describe('AUDIT-173 CAD-REHAB over-detector split', () => {
  it('regression: stable CAD with NO CABG and NO MI fires NEITHER rehab gap', () => {
    const g = evaluateGapRules([CAD], {}, [], 65, 'MALE');
    expect(find(g, 'Post-CABG cardiac rehabilitation referral')).toBeFalsy();
    expect(find(g, 'Post-MI cardiac rehabilitation referral')).toBeFalsy();
  });
  it('no-over-narrowing: post-CABG (Z95.1) fires the post-CABG rehab gap', () => {
    expect(find(evaluateGapRules([CAD, CABG], {}, [], 65, 'MALE'), 'Post-CABG cardiac rehabilitation referral')).toBeTruthy();
  });
  it('no-over-narrowing: post-MI (acute I21) fires the post-MI rehab gap', () => {
    expect(find(evaluateGapRules([CAD, MI_ACUTE], {}, [], 65, 'MALE'), 'Post-MI cardiac rehabilitation referral')).toBeTruthy();
  });
  it('no-over-narrowing: old MI (I25.2) also fires the post-MI rehab gap', () => {
    expect(find(evaluateGapRules([MI_OLD], {}, [], 65, 'MALE'), 'Post-MI cardiac rehabilitation referral')).toBeTruthy();
  });
  // Rehab-engagement guard DROPPED 2026-06-18 (proxy investigation, AUDIT-173): no reliable pre-DUA
  // rehab-participation signal (ICD has no code; CPT 93797/93798 inert; Synthea codes SNOMED not CPT). The
  // CABG/MI gate is the load-bearing over-detection fix; the already-enrolled guard is deferred to post-DUA.
});

// ---- Tightening 2 (AUDIT-174): Gap-50 tightened to the DAPT-indicated window ----
describe('AUDIT-174 Gap-50 over-fire on stable CAD', () => {
  it('regression: stable CAD (no recent ACS, no PCI) + no P2Y12 does NOT fire', () => {
    expect(find(evaluateGapRules([CAD], {}, [], 65, 'MALE'), 'P2Y12 inhibitor not active')).toBeFalsy();
  });
  it('no-over-narrowing: post-ACS (I21) + no P2Y12 fires', () => {
    expect(find(evaluateGapRules([MI_ACUTE], {}, [], 65, 'MALE'), 'P2Y12 inhibitor not active')).toBeTruthy();
  });
  it('no-over-narrowing: post-PCI (Z95.5) + no P2Y12 fires', () => {
    expect(find(evaluateGapRules([CAD, PCI], {}, [], 65, 'MALE'), 'P2Y12 inhibitor not active')).toBeTruthy();
  });
});

// ---- Tightening 3 (AUDIT-176): CAD-015 potent-P2Y12 subgroup ----
describe('AUDIT-176 CAD-015 ticagrelor-blanket false-fire on prasugrel', () => {
  it('regression: post-MI already on PRASUGREL does NOT fire (potent-P2Y12 need met)', () => {
    const g = evaluateGapRules([MI_ACUTE], {}, [PRASUGREL], 60, 'MALE');
    expect(find(g, 'potent P2Y12 inhibitor (ticagrelor or prasugrel) for ACS')).toBeFalsy();
  });
  it('gate: post-MI on ticagrelor does NOT fire', () => {
    expect(find(evaluateGapRules([MI_ACUTE], {}, [TICAGRELOR], 60, 'MALE'), 'potent P2Y12 inhibitor (ticagrelor or prasugrel) for ACS')).toBeFalsy();
  });
  it('no-over-narrowing: post-MI on CLOPIDOGREL (not potent) still fires', () => {
    expect(find(evaluateGapRules([MI_ACUTE], {}, [CLOPIDOGREL], 60, 'MALE'), 'potent P2Y12 inhibitor (ticagrelor or prasugrel) for ACS')).toBeTruthy();
  });
  it('no-over-narrowing: post-MI on no P2Y12 still fires', () => {
    expect(find(evaluateGapRules([MI_ACUTE], {}, [], 60, 'MALE'), 'potent P2Y12 inhibitor (ticagrelor or prasugrel) for ACS')).toBeTruthy();
  });
});

// ---- Tightening 5 (AUDIT-175): nicorandil + trimetazidine retired ----
describe('AUDIT-175 dead-drug retirement (nicorandil / trimetazidine)', () => {
  it('nicorandil gap no longer fires (angina + max antianginal BB/CCB)', () => {
    const g = evaluateGapRules([CAD, 'I20.9'], {}, ['6918', '17767'], 65, 'MALE');
    expect(find(g, 'nicorandil')).toBeFalsy();
  });
  it('trimetazidine gap no longer fires (angina + metabolic comorbidity)', () => {
    const g = evaluateGapRules([CAD, 'I20.9', 'E11.9'], {}, [], 65, 'MALE');
    expect(find(g, 'trimetazidine')).toBeFalsy();
  });
});
