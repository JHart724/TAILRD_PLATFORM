/**
 * Electrophysiology Gap Rule Tests — EP-XX-7 mitigation (rate-control HFrEF gating)
 *
 * Exercises evaluateGapRules() directly with minimal input shape:
 *   evaluateGapRules(dxCodes, labValues, medCodes, age, gender?, race?)
 *
 * Covers the EP-RC + EP-017 SAFETY scenarios surfaced during EP Phase 0B audit:
 *   - Happy path: AF without rate control, no HF → existing rate-control gap fires (BB or non-DHP CCB)
 *   - HFrEF + AF without rate control: rate-control gap fires WITHOUT non-DHP CCB recommendation
 *   - HFrEF + AF + on diltiazem: SAFETY gap fires (EP-017)
 *   - HF dx + AF + LVEF undefined: structured data gap fires (LVEF measurement required)
 *   - Feature flag off: HFrEF + AF + on diltiazem → no SAFETY gap (regression-safe rollback path)
 *
 * Methodology departure: prior gap rule tests (e.g., heartFailure.test.ts) only validate test
 * patient construction without exercising rules. These tests EXERCISE evaluateGapRules and
 * assert on output structure. Pattern is reusable for future rule-coverage tests.
 */

import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const AFIB_DX = 'I48.0';                    // AF
const HF_DX = 'I50.20';                     // HFrEF
const RXNORM_METOPROLOL = '6918';
const RXNORM_CARVEDILOL = '20352';
const RXNORM_DILTIAZEM = '3443';            // non-DHP CCB
const RXNORM_VERAPAMIL = '11170';           // non-DHP CCB

/**
 * Filter helper: find a gap by status string substring.
 */
function findGapByStatus(gaps: any[], statusSubstring: string) {
  return gaps.find((g) => g.status && g.status.includes(statusSubstring));
}

describe('EP-RC + EP-017 (rate-control HFrEF gating, EP-XX-7 mitigation)', () => {
  // Ensure feature flag is at default (true) at the start of each test
  // unless a specific test overrides it.
  beforeEach(() => {
    delete process.env.EP_RATE_CONTROL_HFREF_GATING_ENABLED;
  });

  it('Happy path: AF without rate control, no HF → fires rate-control gap with full med options', () => {
    const dx = [AFIB_DX];                   // AF only, no HF
    const labs = {};                         // no LVEF needed
    const meds: string[] = [];               // not on rate control
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    const rateControlGap = findGapByStatus(gaps, 'Rate control agent not prescribed in AFib');
    expect(rateControlGap).toBeDefined();
    expect(rateControlGap.medication).toBe('Metoprolol, Carvedilol, Diltiazem, or Verapamil');
    expect(rateControlGap.target).toBe('Beta-blocker or non-dihydropyridine CCB initiated');
    // Should NOT have HFrEF status marker
    expect(rateControlGap.status).not.toContain('HFrEF');

    // Should NOT fire SAFETY gap (no HF)
    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeUndefined();
  });

  it('HFrEF + AF without rate control → fires rate-control gap WITH BB-only recommendation', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 30 };               // HFrEF (LVEF <=40%)
    const meds: string[] = [];               // not on rate control
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    const rateControlGap = findGapByStatus(gaps, 'Rate control agent not prescribed in AFib (HFrEF');
    expect(rateControlGap).toBeDefined();
    expect(rateControlGap.medication).toContain('Metoprolol or Carvedilol');
    expect(rateControlGap.medication).not.toContain('Diltiazem');
    expect(rateControlGap.medication).not.toContain('Verapamil');
    expect(rateControlGap.target).toContain('avoid non-DHP CCB');
    expect(rateControlGap.evidence.triggerCriteria).toContain('HFrEF detected (HF dx + LVEF <=40%)');

    // Should NOT fire SAFETY gap (patient is not on non-DHP CCB)
    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeUndefined();
  });

  it('HFrEF + AF + on diltiazem → fires SAFETY gap (EP-017)', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 30 };               // HFrEF
    const meds = [RXNORM_DILTIAZEM];         // currently on diltiazem (non-DHP CCB)
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB (diltiazem/verapamil) is contraindicated in HFrEF');
    expect(safetyGap).toBeDefined();
    expect(safetyGap.evidence.classOfRecommendation).toBe('3 (Harm)');
    expect(safetyGap.evidence.safetyClass).toBe('SAFETY');
    expect(safetyGap.evidence.triggerCriteria).toContain('AFib (I48.x)');
    expect(safetyGap.evidence.triggerCriteria).toContain('HFrEF detected (HF dx + LVEF <=40%)');
    expect(safetyGap.target).toContain('metoprolol succinate, carvedilol, or bisoprolol');

    // Should NOT fire rate-control-missing gap (patient IS on rate control via diltiazem)
    const rateControlGap = findGapByStatus(gaps, 'Rate control agent not prescribed');
    expect(rateControlGap).toBeUndefined();
  });

  it('HFrEF + AF + on verapamil → fires SAFETY gap (EP-017, verapamil variant)', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 25 };               // HFrEF
    const meds = [RXNORM_VERAPAMIL];         // currently on verapamil
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeDefined();
    expect(safetyGap.evidence.safetyClass).toBe('SAFETY');
  });

  it('HF dx + AF + LVEF undefined → fires structured data gap (not silent default)', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = {};                         // LVEF intentionally missing
    const meds: string[] = [];
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    const dataGap = findGapByStatus(gaps, 'LVEF measurement required to safely guide AF rate-control');
    expect(dataGap).toBeDefined();
    expect(dataGap.evidence.triggerCriteria).toContain('No LVEF value in lab observations');
    expect(dataGap.target).toContain('echocardiogram');

    // Crucially: rate-control gap should still fire (using non-HFrEF default since LVEF unknown)
    // BUT the data gap surfaces the LVEF-measurement need so clinician knows the rate-control
    // recommendation may need refinement after LVEF is measured.
    const rateControlGap = findGapByStatus(gaps, 'Rate control agent not prescribed');
    expect(rateControlGap).toBeDefined();
  });

  it('Feature flag OFF → HFrEF + AF + on diltiazem produces NO SAFETY gap (regression-safe rollback)', () => {
    process.env.EP_RATE_CONTROL_HFREF_GATING_ENABLED = 'false';

    // Flag is read at module load, so we need to re-import with isolated module registry.
    // Jest's resetModules + require() pattern allows the flag change to take effect.
    jest.resetModules();
    const { evaluateGapRules: evaluateGapRulesIsolated } = require('../../src/ingestion/gaps/gapRuleEngine');

    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 30 };
    const meds = [RXNORM_DILTIAZEM];
    const gaps = evaluateGapRulesIsolated(dx, labs, meds, 65);

    // SAFETY gap should NOT fire when flag is off
    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeUndefined();

    // Data gap should NOT fire when flag is off (gating logic disabled entirely)
    const dataGap = findGapByStatus(gaps, 'LVEF measurement required');
    expect(dataGap).toBeUndefined();

    // Rate-control gap also should NOT fire (patient is on diltiazem, has rate control)
    const rateControlGap = findGapByStatus(gaps, 'Rate control agent not prescribed');
    expect(rateControlGap).toBeUndefined();
  });

  it('Edge: HFrEF + AF + on diltiazem AND metoprolol → still fires SAFETY gap (combo on dangerous drug)', () => {
    const dx = [AFIB_DX, HF_DX];
    const labs = { lvef: 30 };
    const meds = [RXNORM_DILTIAZEM, RXNORM_METOPROLOL]; // both
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    // SAFETY gap fires regardless of whether other rate-control agents are on board.
    // The safety scenario is exposure to non-DHP CCB in HFrEF, not absence of rate control.
    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeDefined();
  });

  it('LVEF >40 (preserved) + AF + on diltiazem → does NOT fire SAFETY (not HFrEF)', () => {
    const dx = [AFIB_DX, HF_DX];               // HF dx but preserved EF
    const labs = { lvef: 55 };                 // HFpEF (preserved EF)
    const meds = [RXNORM_DILTIAZEM];
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    // HFpEF: non-DHP CCB is acceptable (the SAFETY rule only applies to HFrEF LVEF<=40)
    const safetyGap = findGapByStatus(gaps, 'SAFETY: Non-DHP CCB');
    expect(safetyGap).toBeUndefined();
  });
});

// ============================================================
// EP-006 SAFETY: Dabigatran contraindicated in CrCl<30 severe renal impairment
// AUDIT-032 mitigation (2026-05-05, fix/audit-032-ep-006-dabigatran-renal-safety)
// ============================================================
// Guideline: FDA Pradaxa PI + 2023 ACC/AHA/ACCP/HRS AFib Guideline Class 3 (Harm)
// 2-branch compound:
//   - SAFETY: dabigatran + eGFR<30 → switch to apixaban or warfarin (Class 3 Harm)
//   - DATA gap: dabigatran on med list + eGFR undefined → eGFR measurement required
//     (preserves harm vector via fail-loud rather than silent default)
const RXNORM_DABIGATRAN = '1037045';
const RXNORM_APIXABAN = '1364430';
const HOSPICE_DX = 'Z51.5';

function findDabigatranSafetyGap(gaps: any[]) {
  return gaps.find(
    (g) =>
      g.status &&
      g.status.includes('SAFETY: Dabigatran contraindicated in severe renal impairment'),
  );
}

function findEgfrDataGap(gaps: any[]) {
  return gaps.find(
    (g) =>
      g.status &&
      g.status.includes('eGFR measurement required to evaluate dabigatran safety'),
  );
}

describe('EP-006 SAFETY: dabigatran + eGFR<30 (AUDIT-032)', () => {
  it('Positive: dabigatran + eGFR=25 → fires SAFETY (Class 3 Harm)', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 25 };
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 75);

    const safetyGap = findDabigatranSafetyGap(gaps);
    expect(safetyGap).toBeDefined();
    expect(safetyGap.evidence.classOfRecommendation).toBe('3 (Harm)');
    expect(safetyGap.evidence.safetyClass).toBe('SAFETY');
    expect(safetyGap.target).toContain('apixaban');
    expect(safetyGap.target).toContain('warfarin');
    expect(safetyGap.evidence.guidelineSource).toContain('FDA Pradaxa');
    expect(safetyGap.evidence.guidelineSource).toContain('2023 ACC/AHA/ACCP/HRS Atrial Fibrillation');
  });

  it('Edge: dabigatran + eGFR=29 → fires SAFETY (strict <30 threshold)', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 29 };
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    expect(findDabigatranSafetyGap(gaps)).toBeDefined();
  });

  it('Negative: dabigatran + eGFR=30 → does NOT fire SAFETY (boundary, not <30)', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 30 };
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    expect(findDabigatranSafetyGap(gaps)).toBeUndefined();
    expect(findEgfrDataGap(gaps)).toBeUndefined();
  });

  it('Negative: dabigatran + eGFR=60 → does NOT fire SAFETY (normal renal function)', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 60 };
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    expect(findDabigatranSafetyGap(gaps)).toBeUndefined();
    expect(findEgfrDataGap(gaps)).toBeUndefined();
  });

  it('Data gap: dabigatran + eGFR undefined → fires structured DATA gap (fail-loud, no silent default)', () => {
    const dx = [AFIB_DX];
    const labs = {};                            // eGFR intentionally missing
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    const dataGap = findEgfrDataGap(gaps);
    expect(dataGap).toBeDefined();
    expect(dataGap.evidence.triggerCriteria).toContain('No eGFR value in lab observations');
    expect(dataGap.target).toContain('eGFR documented');

    // SAFETY should NOT fire when eGFR undefined (data gap fires instead)
    expect(findDabigatranSafetyGap(gaps)).toBeUndefined();
  });

  it('Negative: apixaban (not dabigatran) + eGFR=25 → does NOT fire dabigatran SAFETY', () => {
    const dx = [AFIB_DX];
    const labs = { egfr: 25 };
    const meds = [RXNORM_APIXABAN];
    const gaps = evaluateGapRules(dx, labs, meds, 75);

    expect(findDabigatranSafetyGap(gaps)).toBeUndefined();
    expect(findEgfrDataGap(gaps)).toBeUndefined();
  });

  it('Edge: dabigatran + eGFR=20 + Z51.5 hospice → SAFETY does NOT fire (hospice exclusion preserved)', () => {
    const dx = [AFIB_DX, HOSPICE_DX];
    const labs = { egfr: 20 };
    const meds = [RXNORM_DABIGATRAN];
    const gaps = evaluateGapRules(dx, labs, meds, 80);

    expect(findDabigatranSafetyGap(gaps)).toBeUndefined();
    expect(findEgfrDataGap(gaps)).toBeUndefined();
  });
});
