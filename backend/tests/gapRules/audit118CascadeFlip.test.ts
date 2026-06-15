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
