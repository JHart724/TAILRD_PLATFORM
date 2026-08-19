/**
 * AUDIT-324: GDMT pillar rates must be CODE-derived, with an explicit evaluable denominator.
 *
 * The HF dashboard endpoint had ZERO backend coverage when a wrong number (beta blocker 100.0%,
 * missingCount 0, against a true 71.5% cohort-wide) reached a customer-facing surface. These tests
 * are the deliverable, not a formality.
 *
 * Every test here is RED against the pre-AUDIT-324 shape (tests/services/oldGdmtShim.ts, a faithful
 * reproduction of the gap-row + regex logic behind the same signature) except the two that assert
 * properties both implementations share. RED output is recorded in the PR.
 *
 * All RxCUIs are taken from the codebase's own verified assets - RXNORM_GDMT (RxNav-verified) and
 * rxnormIngredientMap - never from memory, per AUDIT-315 and the section 16 verification standard.
 */

import {
  GDMT_PILLARS,
  PILLAR_KEYS,
  emptyScan,
  scanGdmtBatch,
  toGdmtDenominator,
  toGdmtMetrics,
  type GdmtPatientRow,
  type GdmtScan,
} from '../../src/services/gdmtMetrics';
import { RXNORM_GDMT, RXNORM_NON_EBM_BB_HF } from '../../src/terminology/cardiovascularValuesets';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 19); // fixed clock - no Date.now() in tests
const FRESH = new Date(NOW - 30 * DAY);
const STALE = new Date(NOW - 400 * DAY); // beyond ECHO_CUTOFF_MS (365d)

// Product-level (SCD) codes, each verified present in rxnormIngredientMap mapping to its ingredient.
const CARVEDILOL_SCD = '200031'; // -> 20352
const SPIRONOLACTONE_SCD = '104230'; // -> 9997
const DAPAGLIFLOZIN_SCD = '1486975'; // -> 1488564
const SACUBITRIL_VALSARTAN_SCD = '1656334'; // -> 1656339
const FINERENONE = '2562811'; // RXNORM_FINERENONE.FINERENONE (AUDIT-053-corrected)
const ATENOLOL = RXNORM_NON_EBM_BB_HF.ATENOLOL; // '1202'

/** Test rows may carry gap rows; the production scan must IGNORE them. The shim consumes them. */
type Row = GdmtPatientRow & { gaps?: Array<{ medication: string | null }> };

function row(meds: string[], lvef?: number, when: Date | null = FRESH, gaps?: Row['gaps']): Row {
  return {
    medications: meds.map((rxNormCode) => ({ rxNormCode })),
    observations: lvef === undefined ? [] : [{ valueNumeric: lvef, observedDateTime: when }],
    ...(gaps ? { gaps } : {}),
  };
}

function scan(rows: Row[]): GdmtScan {
  const acc = emptyScan();
  scanGdmtBatch(rows as GdmtPatientRow[], NOW, acc);
  return acc;
}

describe('AUDIT-324 (a) the numerator is CODE-derived, not gap-derived', () => {
  it('an SCD-coded patient counts as on therapy even when a gap row says otherwise', () => {
    // THE LOAD-BEARING TEST, and deliberately DISCRIMINATING: the patient IS on carvedilol (as an
    // SCD product code, so it only matches after ingredient expansion) while a stale gap row claims
    // the beta blocker is missing. Code wins over the gap row. The old logic scored this patient
    // MISSING; a fixture without the gap row would not discriminate, because the old logic counted
    // every patient with no gap row as covered whatever they were taking.
    const acc = scan([
      row([CARVEDILOL_SCD], 30, FRESH, [{ medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol' }]),
    ]);
    expect(acc.evaluable).toBe(1);
    expect(acc.onTherapy.betaBlocker).toBe(1);
    expect(toGdmtMetrics(acc).betaBlocker.missingCount).toBe(0);
  });

  it('an evaluable patient on NOTHING is missing every pillar (the 100.0% defect, inverted)', () => {
    const acc = scan([row([], 30)]);
    expect(acc.evaluable).toBe(1);
    for (const k of PILLAR_KEYS) expect(acc.onTherapy[k]).toBe(0);
    expect(toGdmtMetrics(acc).betaBlocker.current).toBe(0);
  });

  it('no string matching: a gap row naming the drug changes nothing (AUDIT-315 class)', () => {
    // Identical patients; one carries a gap row whose text names carvedilol. Code decides, not text.
    const withGap = scan([row([], 30, FRESH, [{ medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol' }])]);
    const withoutGap = scan([row([], 30)]);
    expect(withGap.onTherapy.betaBlocker).toBe(withoutGap.onTherapy.betaBlocker);
    expect(withGap.onTherapy.betaBlocker).toBe(0);
  });

  it('an IV-iron gap row does not make an ACE/ARB patient read as missing (/ARB/i collision)', () => {
    // DISCRIMINATING: the patient IS on sacubitril/valsartan, and carries an IV-iron gap whose text
    // contains "c-ARB-oxymaltose". The old regex matched that substring and scored them as missing
    // ACE/ARB - 64 such gaps, most of the live 94-patient count. Code-derived, they are on therapy.
    const acc = scan([
      row([SACUBITRIL_VALSARTAN_SCD], 30, FRESH, [
        { medication: 'IV iron (ferric carboxymaltose or ferric derisomaltose)' },
      ]),
    ]);
    expect(acc.onTherapy.aceArb).toBe(1);
    expect(toGdmtMetrics(acc).aceArb.missingCount).toBe(0);
  });
});

describe('AUDIT-324 (b) unevaluable patients are excluded, never counted as covered', () => {
  it('a STALE echo makes the patient unevaluable, not covered', () => {
    const acc = scan([row([], 30, STALE)]);
    expect(acc.evaluable).toBe(0);
    expect(acc.unevaluable.echoStale).toBe(1);
    expect(acc.onTherapy.betaBlocker).toBe(0);
    expect(toGdmtMetrics(acc).betaBlocker.current).toBeNull();
  });

  it('NO echo on record is unevaluable and distinguished from stale', () => {
    const acc = scan([row([], undefined)]);
    expect(acc.evaluable).toBe(0);
    expect(acc.unevaluable.echoAbsent).toBe(1);
    expect(acc.unevaluable.echoStale).toBe(0);
  });

  it('LVEF > 40 is a CLINICAL exclusion, counted apart from the echo data gaps', () => {
    const acc = scan([row([], 55)]);
    expect(acc.evaluable).toBe(0);
    expect(acc.unevaluable.lvefAbove40).toBe(1);
    expect(acc.unevaluable.echoStale + acc.unevaluable.echoAbsent).toBe(0);
  });

  it('the denominator reports the three-way split and it sums to the cohort', () => {
    const acc = scan([row([CARVEDILOL_SCD], 30), row([], 55), row([], 30, STALE), row([], undefined)]);
    const d = toGdmtDenominator(acc);
    expect(d.cohortTotal).toBe(4);
    expect(d.evaluable).toBe(1);
    expect(d.unevaluableReasons).toEqual({ lvefAbove40: 1, echoStale: 1, echoAbsent: 1 });
    expect(d.evaluable + d.unevaluable).toBe(d.cohortTotal);
    expect(d.criteria).toContain('LVEF <= 40');
  });
});

describe('AUDIT-324 pillar membership is the canonical set, by operator ruling', () => {
  it('finerenone does NOT satisfy the MRA pillar (ruling 2026-08-19)', () => {
    // This denominator is LVEF <= 40; finerenone's HF evidence (FINEARTS-HF) is LVEF >= 40, so the
    // populations do not overlap. Spironolactone on the same patient DOES satisfy it.
    expect(scan([row([FINERENONE], 30)]).onTherapy.mra).toBe(0);
    expect(scan([row([SPIRONOLACTONE_SCD], 30)]).onTherapy.mra).toBe(1);
  });

  it('atenolol does NOT satisfy the beta-blocker pillar (not evidence-based in HFrEF)', () => {
    expect(scan([row([ATENOLOL], 30)]).onTherapy.betaBlocker).toBe(0);
    expect(scan([row([CARVEDILOL_SCD], 30)]).onTherapy.betaBlocker).toBe(1);
  });

  it('the SGLT2i set is canonical: sotagliflozin in, canagliflozin absent (the regex was wrong)', () => {
    const set = GDMT_PILLARS.sglt2i.codes as readonly string[];
    expect(set).toContain(RXNORM_GDMT.SOTAGLIFLOZIN);
    expect(set).toContain(RXNORM_GDMT.DAPAGLIFLOZIN);
    expect(set).toContain(RXNORM_GDMT.EMPAGLIFLOZIN);
    expect(set).toHaveLength(3); // canagliflozin is not in RXNORM_GDMT at all
    expect(scan([row([DAPAGLIFLOZIN_SCD], 30)]).onTherapy.sglt2i).toBe(1);
  });

  it('every pillar code set comes from RXNORM_GDMT, never an inline literal (AUDIT-052)', () => {
    const canonical = new Set<string>(Object.values(RXNORM_GDMT));
    for (const k of PILLAR_KEYS) {
      for (const c of GDMT_PILLARS[k].codes as readonly string[]) {
        expect(canonical.has(c)).toBe(true);
      }
    }
  });
});

describe('AUDIT-324 (3) gdmtOptimized is evaluable-scoped and code-derived', () => {
  it('counts only evaluable patients on ALL FOUR pillars', () => {
    const allFour = row([CARVEDILOL_SCD, SPIRONOLACTONE_SCD, DAPAGLIFLOZIN_SCD, SACUBITRIL_VALSARTAN_SCD], 30);
    const threeOfFour = row([CARVEDILOL_SCD, SPIRONOLACTONE_SCD, DAPAGLIFLOZIN_SCD], 30);
    const unevaluableOnAllFour = row(
      [CARVEDILOL_SCD, SPIRONOLACTONE_SCD, DAPAGLIFLOZIN_SCD, SACUBITRIL_VALSARTAN_SCD],
      30,
      STALE,
    );
    const acc = scan([allFour, threeOfFour, unevaluableOnAllFour]);
    expect(acc.evaluable).toBe(2);
    expect(acc.onAllFour).toBe(1); // not 2 - the stale-echo patient is not assessable
  });
});

describe('AUDIT-324 batching (AUDIT-227 precedent): accumulation is order-independent', () => {
  it('two batches accumulate to the same scan as one', () => {
    const rows = [row([CARVEDILOL_SCD], 30), row([], 55), row([], 30, STALE)];
    const one = scan(rows);
    const split = emptyScan();
    scanGdmtBatch([rows[0]] as GdmtPatientRow[], NOW, split);
    scanGdmtBatch(rows.slice(1) as GdmtPatientRow[], NOW, split);
    expect(split).toEqual(one);
  });
});
