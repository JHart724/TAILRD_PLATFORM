/**
 * AUDIT-101 - High-Intensity Statin dose-aware detection (CAD + PAD)
 * ================================================================================
 * Exercises evaluateGapRules() directly, asserting that the high-intensity statin
 * gates (gap-cad-statin / gap-pv-1-pad-statin) test STRENGTH (agent identity +
 * mg dose threshold) rather than ingredient presence.
 *
 * Root defect (now corrected): the prior ingredient set
 *   ['83367'(atorvastatin), '301542'(rosuvastatin), '36567'(simvastatin), '42463'(pravastatin)]
 * (a) wrongly included simvastatin/pravastatin (never high-intensity), and
 * (b) could not encode dose (an IN RxCUI maps to the ingredient, not the strength),
 * so the gap silently suppressed for patients NOT on high-intensity therapy.
 *
 * High-intensity tier (2018 AHA/ACC Blood Cholesterol Guideline, Grundy 2019;
 * 2024 ACC/AHA PAD Guideline for the PAD gate): LDL-C reduction >=50% =
 *   atorvastatin 40-80mg OR rosuvastatin 20-40mg. No other agent/dose qualifies.
 *
 * §16 (RxNav properties.json, TTY=IN, verified 2026-06-04):
 *   atorvastatin 83367; rosuvastatin 301542; simvastatin 36567; pravastatin 42463.
 *   SCD fixtures: atorvastatin 40mg 617311; rosuvastatin 20mg 859751.
 *
 * Decisions encoded (operator-locked):
 *   Q1 ONE high-intensity gap (no any-statin split; that is a tracked follow-on).
 *   Q2 Approach A: agent + doseValue threshold, dose threaded into evaluateGapRules.
 *   Q3 dose-unknown -> QUALIFIED fire within the same node (fail-loud, not silent-suppress).
 *   Q4 PAD sibling included, §16-cited to the 2024 ACC/AHA PAD Guideline.
 *
 * Pattern reuses backend/tests/gapRules/coronaryIntervention.test.ts (exercise rules,
 * assert on output shape). No synthetic fixtures / golden cohorts (jest only).
 */

import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

// --- §16-verified codes ---------------------------------------------------------
const RX_ATORVA = '83367';      // atorvastatin (IN)
const RX_ROSUVA = '301542';     // rosuvastatin (IN)
const RX_SIMVA = '36567';       // simvastatin (IN) - NEVER high-intensity
const RX_PRAVA = '42463';       // pravastatin (IN) - NEVER high-intensity
const RX_ATORVA40_SCD = '617311'; // atorvastatin 40 MG Oral Tablet (SCD)

// --- dx codes -------------------------------------------------------------------
const CAD = 'I25.10';           // ASCVD (hasCAD)
const PAD = 'I73.9';            // peripheral vascular disease (hasPAD)
const PAD_ATH = 'I70.201';      // atherosclerosis of native arteries w/ claudication (hasPAD)
const NO_CV = 'I10';            // essential hypertension - neither CAD nor PAD
const HOSPICE = 'Z51.5';        // encounter for palliative care (enforced exclusion)

// --- status strings (must stay in lockstep with the rule bodies) ----------------
const CAD_DEFINITE = 'High-intensity statin not prescribed in CAD';
const CAD_QUALIFIED = 'Statin present; high-intensity dosing not documented in CAD - confirm or intensify';
const PAD_DEFINITE = 'High-intensity statin not prescribed in PAD';
const PAD_QUALIFIED = 'Statin present; high-intensity dosing not documented in PAD - confirm or intensify';

interface MedFixture {
  rxNormCode: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  genericName?: string | null;
  medicationName?: string | null;
}

function med(
  rxNormCode: string | null,
  doseValue: number | null = null,
  doseUnit: string | null = 'mg',
  genericName: string | null = null,
): MedFixture {
  return { rxNormCode, doseValue, doseUnit, genericName, medicationName: null };
}

/** Run the engine with dose-bearing meds threaded; medCodes derived for consistency. */
function run(dx: string[], meds: MedFixture[]) {
  const medCodes = meds.map((m) => m.rxNormCode).filter(Boolean) as string[];
  return evaluateGapRules(dx, {}, medCodes, 65, undefined, undefined, meds);
}

const cadDefinite = (gaps: any[]) => gaps.find((g) => g.status === CAD_DEFINITE);
const cadQualified = (gaps: any[]) => gaps.find((g) => g.status === CAD_QUALIFIED);
const padDefinite = (gaps: any[]) => gaps.find((g) => g.status === PAD_DEFINITE);
const padQualified = (gaps: any[]) => gaps.find((g) => g.status === PAD_QUALIFIED);
const anyCadStatin = (gaps: any[]) => cadDefinite(gaps) || cadQualified(gaps);
const anyPadStatin = (gaps: any[]) => padDefinite(gaps) || padQualified(gaps);

describe('AUDIT-101 CAD high-intensity statin: must FIRE (true positives, previously silently suppressed)', () => {
  it('TP1: CAD + simvastatin 40mg -> definite fire (simvastatin is never high-intensity)', () => {
    expect(cadDefinite(run([CAD], [med(RX_SIMVA, 40, 'mg', 'simvastatin')]))).toBeDefined();
  });

  it('TP2: CAD + pravastatin 80mg -> definite fire (pravastatin is never high-intensity)', () => {
    expect(cadDefinite(run([CAD], [med(RX_PRAVA, 80, 'mg', 'pravastatin')]))).toBeDefined();
  });

  it('TP3: CAD + atorvastatin 20mg (sub-threshold) -> definite fire', () => {
    expect(cadDefinite(run([CAD], [med(RX_ATORVA, 20, 'mg', 'atorvastatin')]))).toBeDefined();
  });

  it('TP4: CAD + rosuvastatin 10mg (sub-threshold) -> definite fire', () => {
    expect(cadDefinite(run([CAD], [med(RX_ROSUVA, 10, 'mg', 'rosuvastatin')]))).toBeDefined();
  });

  it('TP5: CAD + no statin at all -> definite fire (the only case the old rule caught)', () => {
    const gap = cadDefinite(run([CAD], []));
    expect(gap).toBeDefined();
    // Evidence object preserved for FDA CDS transparency.
    expect(gap.evidence.classOfRecommendation).toBe('1');
    expect(gap.evidence.levelOfEvidence).toBe('A');
    expect(gap.evidence.guidelineSource).toContain('2018 ACC/AHA Cholesterol');
  });
});

describe('AUDIT-101 CAD high-intensity statin: must NOT fire (true negatives)', () => {
  it('TN1: CAD + atorvastatin 40mg AND 80mg -> no fire', () => {
    expect(anyCadStatin(run([CAD], [med(RX_ATORVA, 40, 'mg', 'atorvastatin')]))).toBeUndefined();
    expect(anyCadStatin(run([CAD], [med(RX_ATORVA, 80, 'mg', 'atorvastatin')]))).toBeUndefined();
  });

  it('TN2: CAD + rosuvastatin 20mg AND 40mg -> no fire', () => {
    expect(anyCadStatin(run([CAD], [med(RX_ROSUVA, 20, 'mg', 'rosuvastatin')]))).toBeUndefined();
    expect(anyCadStatin(run([CAD], [med(RX_ROSUVA, 40, 'mg', 'rosuvastatin')]))).toBeUndefined();
  });

  it('TN3: NO CAD (and no PAD) -> gate never entered, no statin gap regardless of dose', () => {
    const gaps = run([NO_CV], [med(RX_ATORVA, 20, 'mg', 'atorvastatin')]);
    expect(anyCadStatin(gaps)).toBeUndefined();
    expect(anyPadStatin(gaps)).toBeUndefined();
  });
});

describe('AUDIT-101 CAD high-intensity statin: exclusions (only hospice is gate-enforced)', () => {
  it('EX1: CAD + no statin + hospice (Z51.5) -> suppressed', () => {
    expect(anyCadStatin(run([CAD, HOSPICE], []))).toBeUndefined();
  });

  it('EX2: CAD + simvastatin (otherwise a true positive) + hospice -> suppressed', () => {
    expect(anyCadStatin(run([CAD, HOSPICE], [med(RX_SIMVA, 40, 'mg', 'simvastatin')]))).toBeUndefined();
  });

  it('EX3: PAD + no statin + hospice -> suppressed (PAD gate honors the same exclusion)', () => {
    expect(anyPadStatin(run([PAD, HOSPICE], []))).toBeUndefined();
  });
});

describe('AUDIT-101 CAD high-intensity statin: edge cases', () => {
  it('ED1 (dose-unknown qualified-fire): CAD + atorvastatin with NO doseValue -> QUALIFIED fire, not definite', () => {
    const gaps = run([CAD], [med(RX_ATORVA, null, 'mg', 'atorvastatin')]);
    expect(cadQualified(gaps)).toBeDefined();
    expect(cadDefinite(gaps)).toBeUndefined();
    // Fail-loud, not a definite therapy-gap assertion: confirm-or-intensify language.
    expect(cadQualified(gaps).recommendations.action).toMatch(/confirm current dose or intensify/i);
  });

  it('ED2: CAD + atorvastatin "40" but doseUnit not mg (e.g. "g") -> treated as unknown -> QUALIFIED fire', () => {
    const gaps = run([CAD], [med(RX_ATORVA, 40, 'g', 'atorvastatin')]);
    expect(cadQualified(gaps)).toBeDefined();
    expect(cadDefinite(gaps)).toBeUndefined();
  });
});

describe('AUDIT-101 regression: simvastatin / pravastatin no longer suppress the high-intensity gap', () => {
  it('simvastatin presence (any dose) NO LONGER suppresses -> CAD gap fires', () => {
    expect(anyCadStatin(run([CAD], [med(RX_SIMVA, 20, 'mg', 'simvastatin')]))).toBeDefined();
    expect(anyCadStatin(run([CAD], [med(RX_SIMVA, 80, 'mg', 'simvastatin')]))).toBeDefined();
  });

  it('pravastatin presence (any dose) NO LONGER suppresses -> CAD gap fires', () => {
    expect(anyCadStatin(run([CAD], [med(RX_PRAVA, 40, 'mg', 'pravastatin')]))).toBeDefined();
  });

  it('low-dose atorvastatin 10mg NO LONGER suppresses -> CAD gap fires (ingredient set could not encode this)', () => {
    expect(anyCadStatin(run([CAD], [med(RX_ATORVA, 10, 'mg', 'atorvastatin')]))).toBeDefined();
  });
});

describe('AUDIT-101 PAD high-intensity statin (Q4 sibling, 2024 ACC/AHA PAD Guideline)', () => {
  it('PAD + simvastatin -> definite fire', () => {
    expect(padDefinite(run([PAD], [med(RX_SIMVA, 40, 'mg', 'simvastatin')]))).toBeDefined();
  });

  it('PAD (I70.2*) + atorvastatin 40mg -> no fire', () => {
    expect(anyPadStatin(run([PAD_ATH], [med(RX_ATORVA, 40, 'mg', 'atorvastatin')]))).toBeUndefined();
  });

  it('PAD + atorvastatin dose-unknown -> QUALIFIED fire', () => {
    const gaps = run([PAD], [med(RX_ATORVA, null, 'mg', 'atorvastatin')]);
    expect(padQualified(gaps)).toBeDefined();
    expect(padDefinite(gaps)).toBeUndefined();
  });

  it('PAD gap evidence cites the 2024 ACC/AHA PAD Guideline, COR 1 / LOE A', () => {
    const gap = padDefinite(run([PAD], []));
    expect(gap).toBeDefined();
    expect(gap.evidence.guidelineSource).toContain('Peripheral Artery Disease');
    expect(gap.evidence.classOfRecommendation).toBe('1');
    expect(gap.evidence.levelOfEvidence).toBe('A');
  });
});

describe('AUDIT-101 agent identity is robust to RxNorm representation level', () => {
  it('atorvastatin coded at SCD level (617311) with mg dose resolves via name fallback -> no fire at 40mg', () => {
    expect(
      anyCadStatin(run([CAD], [med(RX_ATORVA40_SCD, 40, 'mg', 'atorvastatin')])),
    ).toBeUndefined();
  });

  it('atorvastatin coded at SCD level (617311) with sub-threshold mg dose -> definite fire', () => {
    expect(cadDefinite(run([CAD], [med(RX_ATORVA40_SCD, 10, 'mg', 'atorvastatin')]))).toBeDefined();
  });
});
