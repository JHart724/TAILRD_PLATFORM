/**
 * Coronary Intervention Gap Rule Tests — AUDIT-034 mitigation (CAD-016 prasugrel + stroke/TIA SAFETY)
 *
 * Exercises evaluateGapRules() directly, asserting on output structure for the
 * CAD-016 SAFETY discriminator added 2026-05-05 per FDA Effient (prasugrel)
 * Black-Box Warning + 2023 ACC/AHA Chronic Coronary Disease Guideline Class 3 (Harm).
 *
 * Pattern reuses backend/tests/gapRules/electrophysiology.test.ts structure
 * (exercise rules, assert on output shape).
 *
 * Coverage:
 *   1. Positive: prasugrel + I63.5 acute ischemic stroke + ACS → SAFETY fires
 *   2. Edge: prasugrel + G45.9 TIA only + ACS → SAFETY fires
 *   3. Edge: prasugrel + Z86.73 distant history + ACS → SAFETY fires
 *   4. Negative: prasugrel + ACS without stroke history → SAFETY does NOT fire
 *   5. Edge: prasugrel + I63.5 + Z51.5 hospice → SAFETY does NOT fire (hospice exclusion)
 */

import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

const ACS_DX = 'I21.4';                      // Non-ST elevation MI (ACS)
const STROKE_ACUTE = 'I63.5';                // Cerebral infarction due to occlusion of arteries
const TIA = 'G45.9';                         // Transient cerebral ischemic attack, unspecified
const STROKE_HISTORY = 'Z86.73';             // Personal history of TIA / cerebral infarction without residual deficits
const HOSPICE = 'Z51.5';                     // Encounter for palliative care
const RXNORM_PRASUGREL = '613391';
const RXNORM_TICAGRELOR = '1116632';

function findSafetyGap(gaps: any[]) {
  return gaps.find(
    (g) =>
      g.status &&
      g.status.includes('SAFETY: Prasugrel contraindicated in patient with prior stroke/TIA'),
  );
}

describe('CAD-016 SAFETY: prasugrel + prior stroke/TIA (AUDIT-034)', () => {
  it('Positive: prasugrel + I63.5 acute ischemic stroke + ACS → fires SAFETY (Class 3 Harm)', () => {
    const dx = [ACS_DX, STROKE_ACUTE];
    const labs = {};
    const meds = [RXNORM_PRASUGREL];
    const gaps = evaluateGapRules(dx, labs, meds, 60);

    const safetyGap = findSafetyGap(gaps);
    expect(safetyGap).toBeDefined();
    expect(safetyGap.evidence.classOfRecommendation).toBe('3 (Harm)');
    expect(safetyGap.evidence.safetyClass).toBe('SAFETY');
    expect(safetyGap.target).toContain('ticagrelor or clopidogrel');
    expect(safetyGap.evidence.guidelineSource).toContain('FDA Effient');
    expect(safetyGap.evidence.guidelineSource).toContain('2023 ACC/AHA Chronic Coronary Disease');
  });

  it('Edge: prasugrel + G45.9 TIA-only + ACS → fires SAFETY (TIA history qualifies)', () => {
    const dx = [ACS_DX, TIA];
    const labs = {};
    const meds = [RXNORM_PRASUGREL];
    const gaps = evaluateGapRules(dx, labs, meds, 65);

    const safetyGap = findSafetyGap(gaps);
    expect(safetyGap).toBeDefined();
    expect(safetyGap.evidence.triggerCriteria.some((c: string) => c.includes('G45.x TIA'))).toBe(true);
  });

  it('Edge: prasugrel + Z86.73 distant stroke history + ACS → fires SAFETY (history without deficit qualifies)', () => {
    const dx = [ACS_DX, STROKE_HISTORY];
    const labs = {};
    const meds = [RXNORM_PRASUGREL];
    const gaps = evaluateGapRules(dx, labs, meds, 70);

    const safetyGap = findSafetyGap(gaps);
    expect(safetyGap).toBeDefined();
  });

  it('Negative: prasugrel + ACS without stroke/TIA → SAFETY does NOT fire (DAPT continues normally)', () => {
    const dx = [ACS_DX];
    const labs = {};
    const meds = [RXNORM_PRASUGREL];
    const gaps = evaluateGapRules(dx, labs, meds, 60);

    expect(findSafetyGap(gaps)).toBeUndefined();
  });

  it('Negative: stroke history + ACS but on ticagrelor (not prasugrel) → SAFETY does NOT fire', () => {
    const dx = [ACS_DX, STROKE_ACUTE];
    const labs = {};
    const meds = [RXNORM_TICAGRELOR];
    const gaps = evaluateGapRules(dx, labs, meds, 60);

    expect(findSafetyGap(gaps)).toBeUndefined();
  });

  it('Edge: prasugrel + I63.5 + Z51.5 hospice → SAFETY does NOT fire (hospice exclusion preserved)', () => {
    const dx = [ACS_DX, STROKE_ACUTE, HOSPICE];
    const labs = {};
    const meds = [RXNORM_PRASUGREL];
    const gaps = evaluateGapRules(dx, labs, meds, 75);

    expect(findSafetyGap(gaps)).toBeUndefined();
  });
});
