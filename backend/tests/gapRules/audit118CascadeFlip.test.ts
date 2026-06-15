/**
 * AUDIT-118 cascade-flip evidence (the bound definition-of-done).
 *
 * The five EP gaps GAP-EP-007/043/044/046/048 were capped DET_OK -> PARTIAL on
 * 2026-06-08 under the section-16.5 under-detection rule, each note ending
 * "PARTIAL until AUDIT-118 remediated". AUDIT-118 is now remediated (fix 125f033;
 * expandToIngredients at the runner construction points). This test proves, on
 * RUNNING behavior with real SCD-coded meds, that each rule now genuinely detects
 * its target (RAW SCD misses; the shipped expanded path fires) - the evidence for
 * the PARTIAL -> DET_OK three-surface re-record.
 *
 * Real SCD codes (RxNav-verified 2026-06-14):
 *   833527 = amiodarone HCl 200 MG tablet     -> IN 703     (EP-043/044)
 *   284404 = dofetilide 125 MCG capsule       -> IN 49247   (EP-048)
 *   854854 = dronedarone 400 MG tablet        -> IN 233698  (EP-046)
 *   1364431 = apixaban 2.5 MG tablet          -> IN 1364430 (EP-007 / VD-6 DOAC)
 */
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';

const AFIB_DX = 'I48.0';
const HF_DX = 'I50.20';
const MECH_VALVE_DX = 'Z95.2';

const AMIODARONE_SCD = '833527';
const DOFETILIDE_SCD = '284404';
const DRONEDARONE_SCD = '854854';
const APIXABAN_SCD = '1364431';

const fired = (gaps: any[], frag: string) => gaps.some((g) => g.status && g.status.includes(frag));

describe('AUDIT-118 cascade-flip: PARTIAL -> DET_OK confirmed on running fixed-matcher behavior', () => {
  it('GAP-EP-043/044 (EP-AMIODARONE-MONITOR): amiodarone SCD - RAW misses, EXPANDED fires', () => {
    const dx = [AFIB_DX];
    const frag = 'Amiodarone toxicity monitoring recommended for review';
    expect(fired(evaluateGapRules(dx, {}, [AMIODARONE_SCD], 70), frag)).toBe(false);
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([AMIODARONE_SCD]), 70), frag)).toBe(true);
  });

  it('GAP-EP-048 (EP-DOFETILIDE-REMS): dofetilide SCD - RAW misses, EXPANDED fires', () => {
    const dx = [AFIB_DX];
    const frag = 'Dofetilide REMS monitoring recommended for review';
    expect(fired(evaluateGapRules(dx, {}, [DOFETILIDE_SCD], 70), frag)).toBe(false);
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([DOFETILIDE_SCD]), 70), frag)).toBe(true);
  });

  it('GAP-EP-046 (EP-DRONEDARONE SAFETY): dronedarone SCD + AF + HF + LVEF<35 - RAW misses, EXPANDED fires', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 30 };
    const frag = 'Dronedarone contraindicated in advanced heart failure';
    expect(fired(evaluateGapRules(dx, labs, [DRONEDARONE_SCD], 70), frag)).toBe(false);
    expect(fired(evaluateGapRules(dx, labs, expandToIngredients([DRONEDARONE_SCD]), 70), frag)).toBe(true);
  });

  it('GAP-EP-007 (VD-6 DOAC + mechanical valve, Class 3 Harm): apixaban SCD - RAW misses, EXPANDED fires', () => {
    const dx = [MECH_VALVE_DX];
    const frag = 'DOAC detected in mechanical valve patient';
    expect(fired(evaluateGapRules(dx, {}, [APIXABAN_SCD], 70), frag)).toBe(false);
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([APIXABAN_SCD]), 70), frag)).toBe(true);
  });

  it('summary: all five cascade-flip targets detect their target after expansion', () => {
    const cases = [
      { gap: 'EP-043/044', dx: [AFIB_DX], labs: {} as Record<string, number>, scd: AMIODARONE_SCD, frag: 'Amiodarone toxicity monitoring recommended for review' },
      { gap: 'EP-048', dx: [AFIB_DX], labs: {} as Record<string, number>, scd: DOFETILIDE_SCD, frag: 'Dofetilide REMS monitoring recommended for review' },
      { gap: 'EP-046', dx: [AFIB_DX, HF_DX], labs: { lvef: 30 }, scd: DRONEDARONE_SCD, frag: 'Dronedarone contraindicated in advanced heart failure' },
      { gap: 'EP-007', dx: [MECH_VALVE_DX], labs: {} as Record<string, number>, scd: APIXABAN_SCD, frag: 'DOAC detected in mechanical valve patient' },
    ];
    let rawHits = 0;
    let expHits = 0;
    for (const c of cases) {
      const raw = fired(evaluateGapRules(c.dx, c.labs, [c.scd], 70), c.frag);
      const exp = fired(evaluateGapRules(c.dx, c.labs, expandToIngredients([c.scd]), 70), c.frag);
      if (raw) rawHits += 1;
      if (exp) expHits += 1;
      // eslint-disable-next-line no-console
      console.log(`[AUDIT-118 cascade] ${c.gap}: raw=${raw} -> expanded=${exp}`);
    }
    // eslint-disable-next-line no-console
    console.log(`[AUDIT-118 cascade] target detection: raw ${rawHits}/4 -> expanded ${expHits}/4 (un-cap evidence)`);
    expect(rawHits).toBe(0);
    expect(expHits).toBe(4);
  });
});

/**
 * Cascade-flip EXTENSION - the 5 additional EP gaps that carry the same
 * "PARTIAL until AUDIT-118 remediated" criterion (013/017/024/070/079).
 * Two rule shapes:
 *   PRESENCE (EP-017/070/079): raw SCD misses -> expanded fires the target.
 *   ABSENCE  (EP-013/024): raw SCD under-detects the drug -> FALSE-FIRES the
 *     "drug not prescribed" gap; expanded detects the drug -> correctly SUPPRESSES.
 * Real SCDs (RxNav-verified 2026-06-14): metoprolol tartrate 866411 -> IN 6918;
 * diltiazem HCl 830794 -> IN 3443; amiodarone HCl 833527 -> IN 703.
 */
const LQTS_DX = 'I45.81';
const WPW_DX = 'I45.6';
const METOPROLOL_SCD = '866411';
const DILTIAZEM_SCD = '830794';
const AMIODARONE_SCD_EXT = '833527';

describe('AUDIT-118 cascade-flip extension: the 5 remaining EP gaps', () => {
  it('GAP-EP-017 (PRESENCE, Class-3 non-DHP-CCB in HFrEF): diltiazem SCD - raw misses, expanded fires', () => {
    const dx = ['I50.20', 'I48.0']; // HFrEF + AF (the EP-017 rule context)
    const labs = { lvef: 30 };
    const f = 'Non-DHP CCB (diltiazem/verapamil) is contraindicated in HFrEF';
    expect(fired(evaluateGapRules(dx, labs, [DILTIAZEM_SCD], 65), f)).toBe(false);
    expect(fired(evaluateGapRules(dx, labs, expandToIngredients([DILTIAZEM_SCD]), 65), f)).toBe(true);
  });

  it('GAP-EP-070 (PRESENCE, PFA candidacy): AF + amiodarone SCD - raw misses, expanded fires', () => {
    const dx = ['I48.0'];
    const f = 'pulsed field ablation candidacy';
    expect(fired(evaluateGapRules(dx, {}, [AMIODARONE_SCD_EXT], 65), f)).toBe(false);
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([AMIODARONE_SCD_EXT]), 65), f)).toBe(true);
  });

  it('GAP-EP-079 (PRESENCE, CRITICAL fatal-VF): WPW+AF + metoprolol SCD - raw misses, expanded fires', () => {
    const dx = [WPW_DX, 'I48.0'];
    const f = 'pre-excited';
    expect(fired(evaluateGapRules(dx, {}, [METOPROLOL_SCD], 65), f)).toBe(false);
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([METOPROLOL_SCD]), 65), f)).toBe(true);
  });

  it('GAP-EP-013 (ABSENCE, early rhythm control): AF + amiodarone SCD - raw FALSE-FIRES, expanded SUPPRESSES', () => {
    const dx = ['I48.0'];
    const f = 'early rhythm control strategy evaluation';
    expect(fired(evaluateGapRules(dx, {}, [AMIODARONE_SCD_EXT], 65), f)).toBe(true); // raw: AAD under-detected -> over-fires
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([AMIODARONE_SCD_EXT]), 65), f)).toBe(false); // expanded: AAD detected -> suppressed
  });

  it('GAP-EP-024 (ABSENCE, LQTS beta-blocker): LQTS + metoprolol SCD - raw FALSE-FIRES, expanded SUPPRESSES', () => {
    const dx = [LQTS_DX];
    const f = 'Beta-blocker not prescribed in Long QT syndrome';
    expect(fired(evaluateGapRules(dx, {}, [METOPROLOL_SCD], 65), f)).toBe(true); // raw: BB under-detected -> false-fires
    expect(fired(evaluateGapRules(dx, {}, expandToIngredients([METOPROLOL_SCD]), 65), f)).toBe(false); // expanded: BB detected -> suppressed
  });

  it('summary: all 5 remaining targets resolve correctly after expansion (presence fires / absence suppresses)', () => {
    // presence: expanded MUST fire; absence: expanded MUST suppress (raw was wrong in both directions)
    const presence = [
      { g: 'EP-017', dx: ['I50.20', 'I48.0'], labs: { lvef: 30 } as Record<string, number>, scd: DILTIAZEM_SCD, f: 'Non-DHP CCB (diltiazem/verapamil) is contraindicated in HFrEF' },
      { g: 'EP-070', dx: ['I48.0'], labs: {} as Record<string, number>, scd: AMIODARONE_SCD_EXT, f: 'pulsed field ablation candidacy' },
      { g: 'EP-079', dx: [WPW_DX, 'I48.0'], labs: {} as Record<string, number>, scd: METOPROLOL_SCD, f: 'pre-excited' },
    ];
    const absence = [
      { g: 'EP-013', dx: ['I48.0'], labs: {} as Record<string, number>, scd: AMIODARONE_SCD_EXT, f: 'early rhythm control strategy evaluation' },
      { g: 'EP-024', dx: [LQTS_DX], labs: {} as Record<string, number>, scd: METOPROLOL_SCD, f: 'Beta-blocker not prescribed in Long QT syndrome' },
    ];
    let resolved = 0;
    for (const c of presence) {
      const raw = fired(evaluateGapRules(c.dx, c.labs, [c.scd], 65), c.f);
      const exp = fired(evaluateGapRules(c.dx, c.labs, expandToIngredients([c.scd]), 65), c.f);
      if (!raw && exp) resolved += 1;
      // eslint-disable-next-line no-console
      console.log(`[AUDIT-118 cascade-ext] ${c.g} PRESENCE: raw=${raw} -> expanded=${exp} (want false->true)`);
    }
    for (const c of absence) {
      const raw = fired(evaluateGapRules(c.dx, c.labs, [c.scd], 65), c.f);
      const exp = fired(evaluateGapRules(c.dx, c.labs, expandToIngredients([c.scd]), 65), c.f);
      if (raw && !exp) resolved += 1;
      // eslint-disable-next-line no-console
      console.log(`[AUDIT-118 cascade-ext] ${c.g} ABSENCE: raw=${raw} -> expanded=${exp} (want true->false)`);
    }
    expect(resolved).toBe(5);
  });
});
