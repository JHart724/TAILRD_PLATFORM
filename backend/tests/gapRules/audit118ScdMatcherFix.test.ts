/**
 * AUDIT-118 matcher-fix acceptance tests - product-coded (SCD) meds must match
 * the ingredient-level (TTY=IN) value sets once routed through
 * expandToIngredients(), the way the gap runners build medCodes.
 *
 * Fixtures use REAL RxNorm SCD codes (the granularity a patient record carries),
 * RxNav-verified 2026-06-14:
 *   866411 = metoprolol tartrate 100 MG        -> IN 6918  (beta-blocker)
 *   830794 = diltiazem hydrochloride 360 MG    -> IN 3443  (non-DHP CCB)
 *   1037179 = dabigatran etexilate 75 MG cap   -> IN 1037042 (the renal dose; AUDIT-117)
 *
 * Each safety scenario is asserted twice: RAW SCD (pre-fix behavior) MISSES, and
 * expandToIngredients(SCD) (the shipped path) FIRES - quantifying the realized
 * under-detection the fix closes.
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';

const AFIB_DX = 'I48.0';
const HF_DX = 'I50.20';
const WPW_DX = 'I45.6';

const METOPROLOL_SCD = '866411';   // -> 6918
const DILTIAZEM_SCD = '830794';    // -> 3443
const DABIGATRAN_75_SCD = '1037179'; // -> 1037042

const hasGap = (gaps: any[], statusFragment: string) =>
  gaps.some((g) => g.status && g.status.includes(statusFragment));

describe('AUDIT-118 (a): an SCD-coded med fires its ingredient-level rule', () => {
  it('metoprolol tartrate SCD 866411 is detected as a beta-blocker (EP-079 CRITICAL on WPW+AF)', () => {
    const dx = [WPW_DX, AFIB_DX];
    const expanded = expandToIngredients([METOPROLOL_SCD]);
    const gaps = evaluateGapRules(dx, {}, expanded, 70);
    expect(hasGap(gaps, 'pre-excited')).toBe(true);
  });
});

describe('AUDIT-118 (b): the three safety negatives fire with SCD-coded meds', () => {
  it('GAP-EP-079 (fatal-VF): WPW + AF + metoprolol SCD - RAW misses, EXPANDED fires', () => {
    const dx = [WPW_DX, AFIB_DX];
    expect(hasGap(evaluateGapRules(dx, {}, [METOPROLOL_SCD], 70), 'pre-excited')).toBe(false); // pre-fix
    expect(hasGap(evaluateGapRules(dx, {}, expandToIngredients([METOPROLOL_SCD]), 70), 'pre-excited')).toBe(true); // shipped
  });

  it('GAP-EP-017 (Class-3 non-DHP-CCB in HFrEF): HFrEF + AF + diltiazem SCD - RAW misses, EXPANDED fires', () => {
    const dx = [HF_DX, AFIB_DX];
    const labs = { lvef: 30 };
    expect(hasGap(evaluateGapRules(dx, labs, [DILTIAZEM_SCD], 65), 'SAFETY')).toBe(false); // pre-fix
    expect(hasGap(evaluateGapRules(dx, labs, expandToIngredients([DILTIAZEM_SCD]), 65), 'SAFETY')).toBe(true); // shipped
  });

  it('GAP-EP-006 (Class-3 dabigatran-renal): AF + dabigatran 75mg SCD + eGFR=25 - RAW misses, EXPANDED fires', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 25 };
    const frag = 'SAFETY: Dabigatran contraindicated in severe renal impairment';
    expect(hasGap(evaluateGapRules(dx, labs, [DABIGATRAN_75_SCD], 75), frag)).toBe(false); // pre-fix
    expect(hasGap(evaluateGapRules(dx, labs, expandToIngredients([DABIGATRAN_75_SCD]), 75), frag)).toBe(true); // shipped
  });
});

describe('AUDIT-118 (c): AUDIT-117 renal-dose case closed', () => {
  it('dabigatran 75 MG SCD 1037179 expands to ingredient IN 1037042 (was the 150mg-only false-negative)', () => {
    expect(expandToIngredients([DABIGATRAN_75_SCD])).toContain('1037042');
  });

  it('a dabigatran 75mg-SCD patient with eGFR<30 fires the SAFETY gap', () => {
    const gaps = evaluateGapRules([AFIB_DX], { egfr: 28 }, expandToIngredients([DABIGATRAN_75_SCD]), 72);
    expect(hasGap(gaps, 'SAFETY: Dabigatran contraindicated in severe renal impairment')).toBe(true);
  });
});

describe('AUDIT-118 before/after: realized under-detection on the SCD fixture set', () => {
  // The honest metric is TARGET-gap detection, not total gap count: expansion both
  // ADDS the missed safety gap AND correctly SUPPRESSES the false "missing-therapy"
  // gap (a detected dabigatran patient is no longer flagged "not on anticoagulation"),
  // so total count is not monotonic. Count the specific safety gaps that SHOULD fire.
  it('counts the target safety gaps missed by raw SCD vs detected after expansion', () => {
    const scenarios: Array<{
      name: string; dx: string[]; labs: Record<string, number>; meds: string[]; age: number; target: string;
    }> = [
      { name: 'EP-079 WPW+AF+metoprololSCD', dx: [WPW_DX, AFIB_DX], labs: {}, meds: [METOPROLOL_SCD], age: 70, target: 'pre-excited' },
      { name: 'EP-017 HFrEF+AF+diltiazemSCD', dx: [HF_DX, AFIB_DX], labs: { lvef: 30 }, meds: [DILTIAZEM_SCD], age: 65, target: 'SAFETY' },
      { name: 'EP-006 AF+dabigatran75SCD+eGFR25', dx: [AFIB_DX], labs: { egfr: 25 }, meds: [DABIGATRAN_75_SCD], age: 75, target: 'SAFETY: Dabigatran contraindicated in severe renal impairment' },
    ];
    let rawDetected = 0;
    let expandedDetected = 0;
    for (const s of scenarios) {
      const raw = hasGap(evaluateGapRules(s.dx, s.labs, s.meds, s.age), s.target);
      const exp = hasGap(evaluateGapRules(s.dx, s.labs, expandToIngredients(s.meds), s.age), s.target);
      if (raw) rawDetected += 1;
      if (exp) expandedDetected += 1;
      // eslint-disable-next-line no-console
      console.log(`[AUDIT-118] ${s.name}: target fired raw=${raw} -> expanded=${exp}`);
    }
    // eslint-disable-next-line no-console
    console.log(`[AUDIT-118] target safety gaps: raw detected ${rawDetected}/3 -> expanded ${expandedDetected}/3 (realized under-detection = ${expandedDetected - rawDetected} previously silent)`);
    expect(rawDetected).toBe(0);
    expect(expandedDetected).toBe(3);
  });
});
