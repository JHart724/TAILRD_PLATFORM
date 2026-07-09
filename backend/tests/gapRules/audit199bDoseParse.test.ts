/**
 * AUDIT-199-B - dose-parse threading (SCOPED ACTIVATION: statins + DOACs)
 * ================================================================================
 * The mg strength lives in the Synthea medications.csv DESCRIPTION ("Atorvastatin 80 MG
 * Oral Tablet") but was dropped at parse (doseValue hardcoded null), so the dose-aware
 * rules degraded to agent_dose_unknown and under-detected the on-moderate-dose cohort.
 *
 * This slice: (1) parseDoseFromDescription extracts the mg (csvParser); (2) the STATIN
 * rules (CAD-STATIN / PV-1) and DOAC rules (EP-003/004/005) become honestly dose-aware;
 * (3) BB-target / digoxin / ARNI are DELIBERATELY kept dose-unknown-suppressed via
 * AUDIT_199B_DOSE_RULE_SUPPRESSED pending their own follow-ons.
 *
 * Proves:
 *   1. parse: single "N MG", "N MCG" (mcg->mg), compound-guard (sacubitril/valsartan -> null),
 *      combo-statin guard (Caduet first-agent amlodipine -> null), no-strength -> null.
 *   2. statin coverage gain: moderate-dose atorva/rosuva now FIRE (were suppressed), on-target
 *      SUPPRESS, no-statin FIRE - and a mixed cohort fires a real SUBSET, NOT ~100%.
 *   3. DOAC activation: EP-003/004/005 fire only on the threaded eGFR/age/creatinine cohort.
 *   4. kept-suppressed: HF-30 ARNI / HF-BB-TARGET / HF-DIGOXIN do NOT fire even with a
 *      fully-qualifying dose-bearing fixture (the flag preserves never-fire).
 *
 * Guidelines: 2018 AHA/ACC Blood Cholesterol (statin high-intensity tier), 2024 ACC/AHA PAD
 * (PV-1), 2023 ACC/AHA/ACCP/HRS AFib + FDA PIs (DOACs). jest only.
 */

import { parseDoseFromDescription } from '../../src/ingestion/csvParser';
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

// --- codes (section-16 verified; AUDIT-101 statin set + existing rule constants) ---
const RX_ATORVA = '83367';
const RX_ROSUVA = '301542';
const RX_SIMVA = '36567';
const RX_RIVA = '1114195';
const RX_APIX = '1364430';
const RX_ARNI = '1656339';        // sacubitril/valsartan
const RX_CARVEDILOL = '20352';
const RX_DIGOXIN = '3407';

const CAD = 'I25.10';
const PAD = 'I73.9';
const HF = 'I50.9';
const AF = 'I48.91';

const CAD_DEFINITE = 'High-intensity statin not prescribed in CAD';
const PAD_DEFINITE = 'High-intensity statin not prescribed in PAD';
const ARNI_STATUS = 'Sacubitril/valsartan dose optimization review recommended';
const BB_STATUS = 'HFrEF beta-blocker below target dose with uptitration headroom';
const DIG_STATUS = 'SAFETY: high-dose digoxin in elderly patient with renal impairment';

interface MedFixture {
  rxNormCode: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  genericName?: string | null;
  medicationName?: string | null;
}
function med(rxNormCode: string | null, doseValue: number | null = null, medicationName: string | null = null): MedFixture {
  return { rxNormCode, doseValue, doseUnit: 'mg', genericName: null, medicationName };
}
function run(dx: string[], meds: MedFixture[], labValues: Record<string, number> = {}, age = 65) {
  const medCodes = meds.map((m) => m.rxNormCode).filter(Boolean) as string[];
  return evaluateGapRules(dx, labValues, medCodes, age, undefined, undefined, meds);
}
const has = (gaps: any[], status: string) => gaps.some((g) => g.status === status);

// =============================================================================
// 1. parseDoseFromDescription
// =============================================================================
describe('AUDIT-199-B parseDoseFromDescription', () => {
  it('single "N MG" -> N mg (statins, DOACs)', () => {
    expect(parseDoseFromDescription('Atorvastatin 80 MG Oral Tablet')).toEqual({ doseValue: 80, doseUnit: 'mg' });
    expect(parseDoseFromDescription('atorvastatin 20 MG Oral Tablet')).toEqual({ doseValue: 20, doseUnit: 'mg' });
    expect(parseDoseFromDescription('Rosuvastatin 40 MG Oral Tablet')).toEqual({ doseValue: 40, doseUnit: 'mg' });
    expect(parseDoseFromDescription('simvastatin 20 MG Oral Tablet')).toEqual({ doseValue: 20, doseUnit: 'mg' });
    expect(parseDoseFromDescription('rivaroxaban 20 MG Oral Tablet')).toEqual({ doseValue: 20, doseUnit: 'mg' });
    expect(parseDoseFromDescription('apixaban 5 MG Oral Tablet')).toEqual({ doseValue: 5, doseUnit: 'mg' });
    expect(parseDoseFromDescription('apixaban 2.5 MG Oral Tablet')).toEqual({ doseValue: 2.5, doseUnit: 'mg' });
  });

  it('"N MCG" normalizes to mg (/1000) - digoxin', () => {
    expect(parseDoseFromDescription('Digoxin 125 MCG Oral Tablet')).toEqual({ doseValue: 0.125, doseUnit: 'mg' });
    expect(parseDoseFromDescription('Digoxin 250 MCG Oral Tablet')).toEqual({ doseValue: 0.25, doseUnit: 'mg' });
    expect(parseDoseFromDescription('Digoxin 0.125 MG Oral Tablet')).toEqual({ doseValue: 0.125, doseUnit: 'mg' });
  });

  it('COMPOUND string -> null unless the first agent is a single-agent statin', () => {
    // sacubitril/valsartan (ARNI): two MG tokens, first agent not a statin -> null (ARNI stays suppressed)
    expect(parseDoseFromDescription('sacubitril 97 MG / valsartan 103 MG Oral Tablet')).toEqual({ doseValue: null, doseUnit: null });
    // Caduet combo: amlodipine listed first -> null (do NOT hand amlodipine 5 mg to the statin check)
    expect(parseDoseFromDescription('Amlodipine 5 MG / Atorvastatin 20 MG Oral Tablet')).toEqual({ doseValue: null, doseUnit: null });
    // a hypothetical statin-first compound is safe to take the first token
    expect(parseDoseFromDescription('Atorvastatin 40 MG / Amlodipine 10 MG Oral Tablet')).toEqual({ doseValue: 40, doseUnit: 'mg' });
  });

  it('no MG/MCG token or empty -> null', () => {
    expect(parseDoseFromDescription('Insulin glargine 100 UNT/ML Injection')).toEqual({ doseValue: null, doseUnit: null });
    expect(parseDoseFromDescription('')).toEqual({ doseValue: null, doseUnit: null });
    expect(parseDoseFromDescription(null)).toEqual({ doseValue: null, doseUnit: null });
  });
});

// =============================================================================
// 2. Statin coverage gain (CAD-STATIN / PV-1 now dose-aware)
// =============================================================================
describe('AUDIT-199-B statin coverage gain (moderate-dose cohort now detectable)', () => {
  it('CAD + atorvastatin 20 mg (moderate, documented) -> FIRES (was suppressed as dose-unknown)', () => {
    expect(has(run([CAD], [med(RX_ATORVA, 20, 'atorvastatin')]), CAD_DEFINITE)).toBe(true);
  });
  it('CAD + rosuvastatin 10 mg (moderate) -> FIRES', () => {
    expect(has(run([CAD], [med(RX_ROSUVA, 10, 'rosuvastatin')]), CAD_DEFINITE)).toBe(true);
  });
  it('CAD + atorvastatin 80 mg (high-intensity) -> does NOT fire', () => {
    expect(has(run([CAD], [med(RX_ATORVA, 80, 'atorvastatin')]), CAD_DEFINITE)).toBe(false);
  });
  it('CAD + rosuvastatin 20 mg (high-intensity) -> does NOT fire', () => {
    expect(has(run([CAD], [med(RX_ROSUVA, 20, 'rosuvastatin')]), CAD_DEFINITE)).toBe(false);
  });
  it('PAD + atorvastatin 20 mg (moderate) -> PV-1 FIRES', () => {
    expect(has(run([PAD], [med(RX_ATORVA, 20, 'atorvastatin')]), PAD_DEFINITE)).toBe(true);
  });

  it('HOLLOW GUARD: a mixed statin cohort fires a real SUBSET, NOT ~100%', () => {
    const cohort: MedFixture[][] = [
      [med(RX_ATORVA, 80, 'atorvastatin')], // high-intensity -> NO fire
      [med(RX_ROSUVA, 40, 'rosuvastatin')], // high-intensity -> NO fire
      [med(RX_ATORVA, 20, 'atorvastatin')], // moderate      -> FIRE
      [med(RX_SIMVA, 40, 'simvastatin')],   // non-hi agent  -> FIRE
      [],                                    // no statin     -> FIRE
    ];
    const fired = cohort.filter((meds) => has(run([CAD], meds), CAD_DEFINITE)).length;
    expect(fired).toBe(3);          // exactly the 3 genuinely-not-high-intensity patients
    expect(fired).toBeLessThan(cohort.length); // NOT ~100% (the hollow-signature guard)
  });
});

// =============================================================================
// 3. DOAC activation (fire only on the threaded eGFR/age/creatinine cohort)
// =============================================================================
describe('AUDIT-199-B DOAC activation (honest gated subsets)', () => {
  it('EP-003 rivaroxaban 20 mg + eGFR 40 (CrCl 15-50) -> fires; eGFR 70 -> does NOT', () => {
    expect(run([AF], [med(RX_RIVA, 20, 'rivaroxaban')], { egfr: 40 }).length).toBeGreaterThan(0);
    const gaps = run([AF], [med(RX_RIVA, 20, 'rivaroxaban')], { egfr: 40 });
    expect(gaps.some((g) => g.status.includes('rivaroxaban'))).toBe(true);
    const ok = run([AF], [med(RX_RIVA, 20, 'rivaroxaban')], { egfr: 70 });
    expect(ok.some((g) => g.status.includes('rivaroxaban'))).toBe(false);
  });
  it('EP-004 apixaban 5 mg + age>=80 + Cr>=1.5 -> fires; age 70 -> does NOT', () => {
    expect(run([AF], [med(RX_APIX, 5, 'apixaban')], { creatinine: 1.6 }, 82).some((g) => g.status.includes('dose reduction'))).toBe(true);
    expect(run([AF], [med(RX_APIX, 5, 'apixaban')], { creatinine: 1.6 }, 70).some((g) => g.status.includes('dose reduction'))).toBe(false);
  });
  it('EP-005 apixaban 2.5 mg + age<80 + Cr<1.5 -> fires (inappropriately reduced)', () => {
    expect(run([AF], [med(RX_APIX, 2.5, 'apixaban')], { creatinine: 1.0 }, 70).some((g) => g.status.includes('inappropriately reduced'))).toBe(true);
  });
});

// =============================================================================
// 4. Kept dose-unknown-suppressed (flag preserves never-fire despite present dose)
// =============================================================================
describe('AUDIT-199-B kept-suppressed rules do NOT fire even with qualifying dose', () => {
  it('HF-30 ARNI: HFrEF + sacubitril/valsartan doseValue 24 (<97 target) -> SUPPRESSED (AUDIT-199-B-ARNI)', () => {
    const gaps = run([HF], [med(RX_ARNI, 24, 'sacubitril/valsartan')], { lvef: 30 });
    expect(has(gaps, ARNI_STATUS)).toBe(false);
  });
  it('HF-BB-TARGET: HFrEF + carvedilol doseValue 25 (<50 target) + HR/SBP headroom -> SUPPRESSED (AUDIT-199-B-BB)', () => {
    const gaps = run([HF], [med(RX_CARVEDILOL, 25, 'carvedilol')], { lvef: 30, heart_rate: 70, systolic_bp: 120 });
    expect(has(gaps, BB_STATUS)).toBe(false);
  });
  it('HF-DIGOXIN: HF + age>75 + eGFR<50 + digoxin doseValue 0.25 (>0.125) -> SUPPRESSED (AUDIT-199-B-DIG)', () => {
    const gaps = run([HF], [med(RX_DIGOXIN, 0.25, 'digoxin')], { egfr: 40 }, 80);
    expect(has(gaps, DIG_STATUS)).toBe(false);
  });
});
