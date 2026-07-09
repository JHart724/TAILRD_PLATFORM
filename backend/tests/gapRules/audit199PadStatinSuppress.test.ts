/**
 * AUDIT-199 - PV-1 PAD high-intensity statin: dose-unknown over-fire suppression
 * ================================================================================
 * PV-1 (gap-pv-1-pad-statin, gapRuleEngine.ts:7225) is the un-propagated section-20
 * SIBLING of the AUDIT-184 CAD-EXT dose-unknown suppression. AUDIT-184 gated the
 * dose-unknown branch out of the CAD-STATIN gate (gapRuleEngine.ts:6829) but never
 * applied the identical change to this PAD rule (HF-38 / CAD-INFLUENZA "fix the
 * instance, not the class" redux). On a dose-less feed (Synthea, and any source
 * without structured dose) EVERY statin-present PAD patient resolves to
 * agent_dose_unknown, so the qualified branch fired for ~100% of PAD patients with
 * zero discriminating signal - the same hollow over-fire AUDIT-184 fixed for CAD.
 *
 * The fix (option 2a): the PV-1 gate now excludes agent_dose_unknown, mirroring
 * CAD-STATIN exactly. This suite proves:
 *   (1) the ~100% dose-unknown over-fire is GONE (was a QUALIFIED fire, now nothing);
 *   (2) the genuine not_high_intensity gap is PRESERVED (no-statin / sub-threshold-
 *       dose / non-high-intensity-agent PAD patient still fires - a real Class 1 gap);
 *   (3) CAD and PAD now behave IDENTICALLY (symmetry restored);
 *   (4) the PV-1 neighbors keep their own gaps.push (section-5.4 swallow guard held);
 *   (5) PV-2 (ABI) is untouched.
 *
 * Guideline: 2024 ACC/AHA/Multisociety Lower Extremity PAD Guideline (Gornik 2024),
 * Class 1, LOE A - high-intensity tier = the 2018 AHA/ACC Cholesterol tier
 * (atorvastatin 40-80mg / rosuvastatin 20-40mg). No agent/dose fixture needs §16
 * re-verification beyond the AUDIT-101 set (83367 / 301542 / 36567 / 42463 verified
 * 2026-06-04). Durable dose-parse threading is tracked as AUDIT-199-B (NOT built here).
 *
 * jest only (no synthetic fixtures / golden cohorts), mirroring audit101StatinIntensity.
 */

import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';

// --- §16-verified codes (AUDIT-101 set) -----------------------------------------
const RX_ATORVA = '83367';   // atorvastatin (IN)
const RX_ROSUVA = '301542';  // rosuvastatin (IN)
const RX_SIMVA = '36567';    // simvastatin (IN) - never high-intensity

// --- dx codes -------------------------------------------------------------------
const PAD = 'I73.9';         // peripheral vascular disease (hasPAD)
const PAD_ATH = 'I70.201';   // atherosclerosis of native arteries w/ claudication (hasPAD)
const CAD = 'I25.10';        // ASCVD (hasCAD) - for the symmetry check
const MECH_VALVE = 'Z95.2';  // prosthetic (mechanical) heart valve - PV-1 upstream neighbor
const CLAUDICATION = 'R26.89'; // abnormal gait - PV-2 trigger (no PAD)
const HOSPICE = 'Z51.5';

// --- status strings (lockstep with the rule bodies) -----------------------------
const PAD_DEFINITE = 'High-intensity statin not prescribed in PAD';
const PAD_QUALIFIED = 'Statin present; high-intensity dosing not documented in PAD - confirm or intensify';
const CAD_DEFINITE = 'High-intensity statin not prescribed in CAD';
const CAD_QUALIFIED = 'Statin present; high-intensity dosing not documented in CAD - confirm or intensify';
const WARFARIN_GAP = 'Warfarin not active with mechanical valve';
const ABI_GAP = 'ABI screening not performed';

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

function run(dx: string[], meds: MedFixture[]) {
  const medCodes = meds.map((m) => m.rxNormCode).filter(Boolean) as string[];
  return evaluateGapRules(dx, {}, medCodes, 65, undefined, undefined, meds);
}

const padDefinite = (g: any[]) => g.find((x) => x.status === PAD_DEFINITE);
const padQualified = (g: any[]) => g.find((x) => x.status === PAD_QUALIFIED);
const anyPadStatin = (g: any[]) => padDefinite(g) || padQualified(g);
const cadDefinite = (g: any[]) => g.find((x) => x.status === CAD_DEFINITE);
const cadQualified = (g: any[]) => g.find((x) => x.status === CAD_QUALIFIED);
const anyCadStatin = (g: any[]) => cadDefinite(g) || cadQualified(g);

describe('AUDIT-199 PV-1: the ~100% dose-unknown over-fire is SUPPRESSED', () => {
  it('PAD + atorvastatin, NO doseValue (the dose-less Synthea case) -> NO PAD statin gap (was a QUALIFIED fire)', () => {
    const gaps = run([PAD], [med(RX_ATORVA, null, 'mg', 'atorvastatin')]);
    expect(padQualified(gaps)).toBeUndefined();
    expect(padDefinite(gaps)).toBeUndefined();
  });

  it('PAD + rosuvastatin, NO doseValue -> NO PAD statin gap (agent present, dose structurally absent -> gated out)', () => {
    const gaps = run([PAD_ATH], [med(RX_ROSUVA, null, 'mg', 'rosuvastatin')]);
    expect(anyPadStatin(gaps)).toBeUndefined();
  });

  it('PAD + atorvastatin dose in non-mg unit -> treated as unknown -> NO fire (mirrors CAD ED2)', () => {
    const gaps = run([PAD], [med(RX_ATORVA, 40, 'g', 'atorvastatin')]);
    expect(anyPadStatin(gaps)).toBeUndefined();
  });
});

describe('AUDIT-199 PV-1: the GENUINE not_high_intensity gap is PRESERVED (not over-corrected)', () => {
  it('PAD + NO statin at all -> definite fire (real Class 1 care gap, must stay)', () => {
    const gap = padDefinite(run([PAD], []));
    expect(gap).toBeDefined();
    expect(gap.evidence.classOfRecommendation).toBe('1');
    expect(gap.evidence.levelOfEvidence).toBe('A');
    expect(gap.evidence.guidelineSource).toContain('Peripheral Artery Disease');
  });

  it('PAD + simvastatin (non-high-intensity agent, no atorva/rosuva) -> definite fire (real gap)', () => {
    expect(padDefinite(run([PAD], [med(RX_SIMVA, 40, 'mg', 'simvastatin')]))).toBeDefined();
  });

  it('PAD + atorvastatin 20mg DOCUMENTED (sub-threshold, real feed) -> definite fire (dose-aware still works)', () => {
    expect(padDefinite(run([PAD_ATH], [med(RX_ATORVA, 20, 'mg', 'atorvastatin')]))).toBeDefined();
  });

  it('PAD + atorvastatin 40mg DOCUMENTED (high-intensity, real feed) -> NO fire (correct suppression)', () => {
    expect(anyPadStatin(run([PAD_ATH], [med(RX_ATORVA, 40, 'mg', 'atorvastatin')]))).toBeUndefined();
  });
});

describe('AUDIT-199 PV-1: CAD/PAD symmetry restored (identical dose-unknown handling)', () => {
  it('dose-unknown atorvastatin: neither CAD nor PAD fires (both gate out agent_dose_unknown)', () => {
    expect(anyCadStatin(run([CAD], [med(RX_ATORVA, null, 'mg', 'atorvastatin')]))).toBeUndefined();
    expect(anyPadStatin(run([PAD], [med(RX_ATORVA, null, 'mg', 'atorvastatin')]))).toBeUndefined();
  });

  it('no statin: both CAD and PAD fire the definite genuine gap', () => {
    expect(cadDefinite(run([CAD], []))).toBeDefined();
    expect(padDefinite(run([PAD], []))).toBeDefined();
  });
});

describe('AUDIT-199 PV-1: neighbors keep their gaps.push (section-5.4 swallow guard held)', () => {
  it('upstream neighbor VD mechanical-valve-warfarin still fires (Z95.2 + no warfarin)', () => {
    const gaps = run([MECH_VALVE], []);
    expect(gaps.find((g) => g.status === WARFARIN_GAP)).toBeDefined();
  });

  it('downstream neighbor PV-2 ABI screening still fires (claudication, no PAD, no ABI) and is UNTOUCHED', () => {
    const gaps = run([CLAUDICATION], []);
    expect(gaps.find((g) => g.status === ABI_GAP)).toBeDefined();
    // PV-2 is a SCREENING_DUE prompt, not a statin gap - the AUDIT-199 edit does not affect it.
    expect(anyPadStatin(gaps)).toBeUndefined();
  });
});

describe('AUDIT-199 PV-1: hospice exclusion still honored after the fix', () => {
  it('PAD + no statin + hospice -> suppressed', () => {
    expect(anyPadStatin(run([PAD, HOSPICE], []))).toBeUndefined();
  });
});
