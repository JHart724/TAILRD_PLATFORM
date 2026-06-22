/**
 * applyOverrides.ts — apply manual classification overrides to a crosswalk.
 *
 * Overrides are encoded inline as a per-module dictionary {specGapId → override}.
 * Each override carries explicit auditNote citing the source (addendum section,
 * clinical reasoning, etc.) so the override is transparent in every consumer.
 *
 * Usage:
 *   npx tsx backend/scripts/auditCanonical/applyOverrides.ts --module VHD          # default: writes canonical
 *   npx tsx backend/scripts/auditCanonical/applyOverrides.ts --all
 *   npx tsx backend/scripts/auditCanonical/applyOverrides.ts --all --candidate     # opts in to legacy verifyDraft baseline workflow
 *
 * Default reads:  docs/audit/canonical/<MODULE>.crosswalk.json (canonical)
 * Default writes: docs/audit/canonical/<MODULE>.crosswalk.json (in place)
 *
 * --candidate flag (legacy): reads + writes <MODULE>.crosswalk.candidate.json,
 *   used during initial verifyDraft baseline cycle. AUDIT-041 (2026-05-06):
 *   defaults inverted from candidate to canonical because 4 prior recurrences
 *   (PRs #238 partial, #240, #241, #243) showed 100% miss rate on the candidate
 *   default for source-change PRs (Tier S series + Cat A corrections). Canonical
 *   is now the common path; candidate is an explicit opt-in for the rare baseline
 *   cycle.
 *
 * Idempotency: re-running on already-applied state produces byte-identical output
 * via stableStringify. No double-patching risk.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleCode, CodeExtract, SpecExtract } from './lib/types';
import { Crosswalk, Classification, RuleBodyCite, InferredSafetyTag } from './crosswalkSchema';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';
import { stableStringify } from './lib/utils';

interface Override {
  readonly classification: Classification;
  /** Registry id of the satisfying evaluator. Used to look up registryLine + evaluatorBlock. */
  readonly registryId?: string;
  /** Module owning the evaluator (default = row's module). Used for cross-module cases. */
  readonly evaluatorModule?: ModuleCode;
  /** Inline auditNote — required for every override. */
  readonly auditNote: string;
  readonly inferredSafetyTag?: InferredSafetyTag;
  readonly inferredSafetyRationale?: string;
}

export const OVERRIDES: Record<ModuleCode, Record<string, Override>> = {
  HF: {
    // (GAP-HF-073 + GAP-HF-151 prior MANUAL OVERRIDE SPEC_ONLY entries removed 2026-06-15: both now have
    //  authored evaluators in the v3.0 HF full buildout batch -> DET_OK entries below.)
    // v3.0 HF buildout calibration sample (2026-06-15): 8 new evaluators authored + firing
    // (backend/tests/gapRules/hfCalibrationBuildout.test.ts), operator clinical sign-off 2026-06-15.
    // Explicit DET_OK flip (reconcile is fuzzy name-match per AUDIT-106; overrides are deterministic).
    'GAP-HF-017': {
      classification: 'DET_OK',
      registryId: 'gap-hf-017-finerenone-mref',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-FINERENONE-MREF evaluator - LVEF>=40 + K<5.0 + eGFR>=25 + not-on-finerenone. COR 2a, FINEARTS-HF (NEJM 2024). Proof: hfCalibrationBuildout.test.ts. SPEC_ONLY -> DET_OK.',
    },
    'GAP-HF-077': {
      classification: 'DET_OK',
      registryId: 'gap-hf-077-amyloid-af-oac',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-AMYLOID-AF-OAC evaluator - E85.82/E85.1 + AF + not-on-OAC. COR 2a, 2023 ACC Consensus. Operator ruling: E85.4 dropped. Proof: hfCalibrationBuildout.test.ts. SPEC_ONLY -> DET_OK.',
    },
    'GAP-HF-081': {
      classification: 'DET_OK',
      registryId: 'gap-hf-081-dm-hba1c',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-DM-HBA1C evaluator - HF + DM (E10/E11) + HbA1c>8. COR 1. Operator ruling Path B: intensification-status data element not ingestible, documented over-fire note. Proof: hfCalibrationBuildout.test.ts. SPEC_ONLY -> DET_OK.',
    },
    'GAP-HF-008': {
      classification: 'DET_OK',
      registryId: 'gap-hf-008-mra-contra',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-MRA-CONTRA SAFETY evaluator - on MRA + (K>=5.5 or eGFR<30). COR 3 (Harm). Operator ruling: eGFR threshold <30 (protective). Proof: hfCalibrationBuildout.test.ts. PARTIAL -> DET_OK.',
    },
    'GAP-HF-033': {
      classification: 'DET_OK',
      registryId: 'gap-hf-033-iron-def-iv',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-IRON-DEF-IV evaluator - HF + ferritin<100 + not-on-IV-iron. COR 2a, AFFIRM-AHF/IRONMAN. Scoped to absolute iron deficiency (functional = GAP-HF-034). Proof: hfCalibrationBuildout.test.ts. PARTIAL -> DET_OK.',
    },
    'GAP-HF-143': {
      classification: 'DET_OK',
      registryId: 'gap-hf-143-pericarditis-colch',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-PERICARDITIS-COLCH evaluator - I30 or I31.9 + not-on-colchicine. COR 1, 2015 ESC. Operator ruling: I30+I31.9 only (drop effusion/hemopericardium/tamponade I31.2/.3/.4). Proof: hfCalibrationBuildout.test.ts. SPEC_ONLY -> DET_OK.',
    },
    'GAP-HF-054': {
      classification: 'DET_OK',
      registryId: 'gap-hf-054-attr-dmt',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-ATTR-DMT evaluator - E85.82/E85.1 + not-on-DMT. COR 1, ATTR-ACT. Operator ruling: DMT set = tafamidis/acoramidis/vutrisiran (patisiran dropped - polyneuropathy). Proof: hfCalibrationBuildout.test.ts. PARTIAL -> DET_OK.',
    },
    'GAP-HF-002': {
      classification: 'DET_OK',
      registryId: 'gap-hf-002-bb-non-ebm',
      auditNote: 'BUILT 2026-06-15 (v3.0 HF calibration): HF-BB-NON-EBM evaluator - HFrEF (LVEF<=40) + on atenolol. COR 1. Operator ruling: nebivolol dropped (SENIORS). Data-limit: metoprolol-tartrate not IN-distinguishable from succinate. Proof: hfCalibrationBuildout.test.ts. PARTIAL -> DET_OK.',
    },
    // v3.0 HF FULL buildout batch (2026-06-15, feat/hf-buildable-gap-batch): 34 new evaluators across 5
    // chunks, clinically reviewed in paced chunks (operator sign-off 2026-06-15). Patterns A/B/C.
    // Proof: backend/tests/ingestion/hfBuildoutBatch.test.ts. Explicit DET_OK flips (reconcile is fuzzy).
    'GAP-HF-003': { classification: 'DET_OK', registryId: 'gap-hf-003-bb-target-dose', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-BB-TARGET-DOSE - HFrEF + BB doseValue<target + HR>=60 + SBP>=100. COR 1. PARTIAL -> DET_OK.' },
    'GAP-HF-011': { classification: 'DET_OK', registryId: 'gap-hf-011-sglt2i-egfr-floor', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-SGLT2I-EGFR-FLOOR - HF + eGFR<20 + no SGLT2i (awareness/documentation). COR 1. PARTIAL -> DET_OK.' },
    'GAP-HF-015': { classification: 'DET_OK', registryId: 'gap-hf-015-digoxin-high-elderly', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-DIGOXIN-HIGH-ELDERLY SAFETY - HF + age>75 + eGFR<50 + digoxin>0.125. COR 3 (Harm). SPEC_ONLY -> DET_OK.' },
    'GAP-HF-024': { classification: 'DET_OK', registryId: 'gap-hf-024-icd-primary-ischemic', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-PRIMARY-ISCHEMIC - LVEF<=35 + ischemic + BB+RAASi + GDMT>=3mo + no ICD. COR 1. Pattern C duration gate. PARTIAL -> DET_OK.' },
    'GAP-HF-025': { classification: 'DET_OK', registryId: 'gap-hf-025-icd-primary-nicm', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-PRIMARY-NICM - LVEF<=35 + NICM(I42.0/.9) + BB+RAASi + no ICD. COR 1. Operator: +I42.9. PARTIAL -> DET_OK.' },
    'GAP-HF-026': { classification: 'DET_OK', registryId: 'gap-hf-026-icd-secondary', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-ICD-SECONDARY - VT(I47.2)/VF(I49.01/.02)/arrest(I46) + no ICD. COR 1. Specific subcodes (Pattern A). PARTIAL -> DET_OK.' },
    'GAP-HF-031': { classification: 'DET_OK', registryId: 'gap-hf-031-lead-extraction', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-LEAD-EXTRACTION - CIED + device infection/complication (T82.6/.7/.1). COR 1. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-126': { classification: 'DET_OK', registryId: 'gap-hf-126-ccm-candidate', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-CCM-CANDIDATE - LVEF 25-45 + NYHA III + QRS<130 + GDMT. COR 2b. Path-B nyha/qrs keys. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-127': { classification: 'DET_OK', registryId: 'gap-hf-127-wcd-bridge', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-WCD-BRIDGE - recent MI + LVEF<=35 + no ICD. COR 2b. Path-B: post-MI window not timed. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-061': { classification: 'DET_OK', registryId: 'gap-hf-061-fabry-ert', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-FABRY-ERT - Fabry (E75.21) + no agalsidase/migalastat. COR 1. RXNORM_FABRY_DMT RxNav-verified. PARTIAL -> DET_OK.' },
    'GAP-HF-062': { classification: 'DET_OK', registryId: 'gap-hf-062-sarcoid-avblock', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-SARCOID-AVBLOCK - age<60 + AV block (I44.1/.2) + no D86. COR 2a. PARTIAL -> DET_OK.' },
    'GAP-HF-063': { classification: 'DET_OK', registryId: 'gap-hf-063-sarcoid-immunosupp', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-SARCOID-IMMUNOSUPP - cardiac sarcoid (D86.85) + no corticosteroid/steroid-sparing. COR 2a. PARTIAL -> DET_OK.' },
    'GAP-HF-065': { classification: 'DET_OK', registryId: 'gap-hf-065-tachy-cm', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-TACHY-CM - HF + LVEF<50 + HR>100 + no rate/rhythm control. COR 2a. Path-B: PVC-burden arm dropped. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-072': { classification: 'DET_OK', registryId: 'gap-hf-072-takotsubo-echo', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-TAKOTSUBO-ECHO - Takotsubo (I51.81) + no recovery echo (echo_months>=2). COR 2a. PARTIAL -> DET_OK.' },
    'GAP-HF-073': { classification: 'DET_OK', registryId: 'gap-hf-073-radiation-surv', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-RADIATION-SURV - radiation (Z92.3) + structural cardiac dx + echo_months>=12. COR 2a. Pattern A narrowing. SPEC_ONLY -> DET_OK (supersedes prior MANUAL OVERRIDE).' },
    'GAP-HF-074': { classification: 'DET_OK', registryId: 'gap-hf-074-arvc-icd', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-ARVC-ICD - I42.8 + sustained VT (I47.2) + no ICD. COR 1. Operator: I42.8+VT pairing (Pattern A, no specific ARVC code). SPEC_ONLY -> DET_OK.' },
    'GAP-HF-032': { classification: 'DET_OK', registryId: 'gap-hf-032-iron-screen', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-IRON-SCREEN - anemic HF (Hgb<12) + ferritin absent. COR 1. Path-B narrowing to anemic (operator). PARTIAL -> DET_OK.' },
    'GAP-HF-034': { classification: 'DET_OK', registryId: 'gap-hf-034-iron-functional', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-IRON-FUNCTIONAL - HF + ferritin 100-299 + TSAT<20 + no IV iron. COR 2a. Complements HF-033. PARTIAL -> DET_OK.' },
    'GAP-HF-036': { classification: 'DET_OK', registryId: 'gap-hf-036-gdmt-incomplete', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-GDMT-INCOMPLETE - HFrEF + <=2 of 4 pillars. COR 1. Pattern B: reframed to current meds. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-076': { classification: 'DET_OK', registryId: 'gap-hf-076-stage-b', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-STAGE-B - no HF dx + LVEF<40 + MI/CAD + no ACEi-ARB/BB. COR 1. Operator: LVEF<40 tighten. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-078': { classification: 'DET_OK', registryId: 'gap-hf-078-af-rate', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-AF-RATE - HF + chronic AF (I48.2/.1x) + HR>110 + no rate control. COR 1. PARTIAL -> DET_OK.' },
    'GAP-HF-080': { classification: 'DET_OK', registryId: 'gap-hf-080-thyroid', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-THYROID - HF + overt thyroid (TSH>10/<0.1) + untreated. COR 1. Operator: overt-only. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-082': { classification: 'DET_OK', registryId: 'gap-hf-082-metformin-renal', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-METFORMIN-RENAL SAFETY - HF + CKD + metformin + eGFR<45. COR 3 (Harm) at <30. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-086': { classification: 'DET_OK', registryId: 'gap-hf-086-preg-teratogen', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-PREG-TERATOGEN SAFETY - HF + pregnancy (O/Z33/Z34) + teratogenic GDMT. COR 3 (Harm). SPEC_ONLY -> DET_OK.' },
    'GAP-HF-047': { classification: 'DET_OK', registryId: 'gap-hf-047-inotrope-dependence', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-INOTROPE-DEPENDENCE - HF + on milrinone/dobutamine. COR 1 (advanced HF referral). SPEC_ONLY -> DET_OK.' },
    'GAP-HF-132': { classification: 'DET_OK', registryId: 'gap-hf-132-tolvaptan-hyponatremia', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-TOLVAPTAN-HYPONATREMIA - HF + Na<125 + no tolvaptan (mgmt eval). COR 2b. Soft framing. PARTIAL -> DET_OK.' },
    'GAP-HF-133': { classification: 'DET_OK', registryId: 'gap-hf-133-cs-mcs-escalation', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-CS-MCS-ESCALATION - HF + shock (R57.0) + inotrope + no MCS (CPT). COR 2a. Inotrope-refractory proxy. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-139': { classification: 'DET_OK', registryId: 'gap-hf-139-crs4-screen', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-CRS4-SCREEN - no HF + eGFR<30 + no NP. COR 2a. Path-B NP-absence proxy. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-144': { classification: 'DET_OK', registryId: 'gap-hf-144-pericarditis-il1', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-PERICARDITIS-IL1 - pericarditis (I30) + corticosteroid + no IL-1 inhibitor. COR 2a. RHAPSODY. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-027': { classification: 'DET_OK', registryId: 'gap-hf-027-cardiomems', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-CARDIOMEMS - HF + NYHA III + elevated NP (GUIDE-HF arm) + no CardioMEMS. COR 2b. NP-arm substitution. PARTIAL -> DET_OK.' },
    'GAP-HF-147': { classification: 'DET_OK', registryId: 'gap-hf-147-lvad-inr', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-LVAD-INR SAFETY - LVAD (Z95.811) + INR outside 2.0-3.0. COR 1. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-148': { classification: 'DET_OK', registryId: 'gap-hf-148-lvad-gib', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-LVAD-GIB - LVAD + GI hemorrhage (K92.0/.1/.2) + no octreotide. COR 2b. SPEC_ONLY -> DET_OK.' },
    'GAP-HF-151': { classification: 'DET_OK', registryId: 'gap-hf-151-transplant-cav', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-TRANSPLANT-CAV - transplant (Z94.1) + coronary_cta_months>=12. COR 1. SPEC_ONLY -> DET_OK (supersedes prior MANUAL OVERRIDE).' },
    'GAP-HF-152': { classification: 'DET_OK', registryId: 'gap-hf-152-transplant-biopsy', auditNote: 'BUILT 2026-06-15 (v3.0 HF batch): HF-TRANSPLANT-BIOPSY - transplant (Z94.1) + no EMB (CPT 93505). COR 1. Presence proxy. SPEC_ONLY -> DET_OK.' },
  },
  EP: {
    // EP audit 2026-06-08 (operator-approved): 13 DET_OK -> PARTIAL_DETECTION flips. 12 are the
    // AUDIT-118 / §16.5 medication-match modifier (exact-RxCUI membership, no ingredient->descendant
    // expansion against product-coded data); 1 is AUDIT-120 (Z88 over-broad). Each retains its evaluator
    // (registryId) so the rule-body cite is preserved; the cap is PARTIAL until AUDIT-117/118/120 remediate.
    'GAP-EP-001': {
      classification: 'DET_OK',
      registryId: 'gap-ep-oac-afib',
      auditNote:
        'UN-CAP + verify 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-118 remediated (medCodes ingredient-expanded), so EP-OAC IN-level OAC membership now detects product-coded meds. The mechanical-valve subgroup recommendation was corrected the same pass (operator ruling): mech valve (Z95.2/Z95.4) -> warfarin recommendation, else DOAC - the detection was already correct, the harmful DOAC-for-mech-valve recommendation is now subgroup-aware. CHA2DS2-VASc M>=2/F>=3, Class 1/A. Test: backend/tests/ingestion/epChunk1.test.ts (mech-valve fires warfarin not DOAC).',
    },
    'GAP-EP-006': {
      classification: 'DET_OK',
      registryId: 'gap-ep-006-dabigatran-renal-safety',
      auditNote:
        'UN-CAP + verify 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-118 remediated (dabigatran IN 1037042, ingredient-expanded). Re-reviewed clean: correct IN code, eGFR<30 matches the FDA Pradaxa CrCl<30 contraindication, Class 3 (Harm), fail-loud eGFR-undefined DATA branch. Test: backend/tests/ingestion/epChunk1.test.ts (dabigatran + eGFR 25 fires; eGFR 50 gates).',
    },
    'GAP-EP-007': {
      classification: 'DET_OK',
      registryId: 'gap-vd-6-doac-mechanical-valve',
      evaluatorModule: 'VHD',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033; expandToIngredients ingredient-normalization at the runner construction points). VHD VD-6 (DOAC + mechanical valve, Class 3 Harm) now detects product-coded (SCD/SBD) DOAC meds - a mechanical-valve patient on an apixaban SCD fires the contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118 (exact-RxCUI membership, no expansion).',
    },
    'GAP-EP-013': {
      classification: 'DET_OK',
      registryId: 'gap-ep-early-rhythm',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-EARLY-RHYTHM is an AAD-ABSENCE rule (fires when AF + not-on-rhythm-control); the cap was an OVER-detection (raw SCD-AAD read as not-on-AAD -> false-fired). Now the AAD is detected, so an AF patient on an SCD-coded AAD correctly SUPPRESSES the early-rhythm-control gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw false-fires -> expanded suppresses). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-017': {
      classification: 'DET_OK',
      registryId: 'gap-ep-017-hfref-non-dhp-ccb',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The Class-3-Harm HFrEF + non-DHP-CCB SAFETY rule now detects SCD-coded diltiazem/verapamil (INs 3443/11170 in the ingredient map), so an HFrEF + AF patient on an SCD-coded non-DHP CCB fires the contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Prior 2026-05-05 AUDIT-033 logic closure stands. Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-024': {
      classification: 'DET_OK',
      registryId: 'gap-ep-lqts-bb',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-LQTS-BB is a beta-blocker-ABSENCE rule; the cap was an OVER-detection (raw SCD-BB read as not-on-BB -> false-fired "BB not prescribed"). Now the BB is detected (BB_CODES_LQTS INs in the ingredient map), so a LQTS patient on an SCD-coded beta-blocker correctly SUPPRESSES the gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw false-fires -> expanded suppresses). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-026': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-lqts-bb',
      auditNote:
        'MANUAL OVERRIDE per EP addendum line 131: GAP-EP-026 (Congenital LQTS QT-drug avoidance) covered by overlapping rules EP-LQTS-BB (line 6906+) and EP-TORSADES (line 7121+). PARTIAL because broad coverage of LQTS+QT-drug scenarios but not specifically the congenital subtype with QT-drug avoidance protocol.',
    },
    'GAP-EP-043': {
      classification: 'DET_OK',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-AMIODARONE-MONITOR (TSH) now detects SCD-coded amiodarone - amiodarone IN 703 is in the ingredient map and an amiodarone SCD expands to it, so the TSH-monitoring gap fires. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-044': {
      classification: 'DET_OK',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-AMIODARONE-MONITOR (LFT) now detects SCD-coded amiodarone (IN 703 in the ingredient map). Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-045': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'MANUAL OVERRIDE per EP addendum line 179: GAP-EP-045 (Amiodarone baseline PFT/CXR) covered partially by EP-AMIODARONE-MONITOR evaluator. PARTIAL per §3.2.1: combined rule covers TSH/LFT but not PFT/CXR baseline screening that spec specifies.',
    },
    'GAP-EP-046': {
      classification: 'DET_OK',
      registryId: 'gap-ep-dronedarone',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-DRONEDARONE (SAFETY) now detects SCD-coded dronedarone (IN 233698 in the ingredient map), so the NYHA III/IV contraindication fires for an SCD-coded dronedarone patient with severe HF. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-048': {
      classification: 'DET_OK',
      registryId: 'gap-ep-dofetilide-rems',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-DOFETILIDE-REMS now detects SCD-coded dofetilide (IN 49247 in the ingredient map), so the REMS-monitoring gap fires for an SCD-coded dofetilide patient. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-070': {
      classification: 'DET_OK',
      registryId: 'gap-ep-pfa',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). EP-PFA (AAD-PRESENCE proxy for failed rhythm control) now detects SCD-coded AADs (AAD_CODES INs in the ingredient map), so an AF patient on an SCD-coded AAD fires the PFA-candidacy gap. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-079': {
      classification: 'DET_OK',
      registryId: 'gap-ep-079-wpw-af-avn-blocker',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033). The CRITICAL WPW+AF AVN-blocker rule now detects SCD-coded beta-blockers and non-DHP CCBs (the previously ingredient-only arms of AVN_BLOCKER_CODES_EP079; the digoxin arm was simplified to the IN in the same fix). A WPW+AF patient on an SCD-coded metoprolol fires the fatal-VF contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Prior 2026-05-05 AUDIT-031 logic closure stands. Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118.',
    },
    'GAP-EP-011': {
      classification: 'DET_OK',
      registryId: 'gap-ep-laac',
      auditNote:
        'RESOLVED 2026-06-16 (v3.0 EP close) PARTIAL -> DET_OK: AUDIT-120 fixed. The bare Z88 (allergy-status to ANY drug) was dropped from the OAC-contraindication gate; it is now bleeding/hemorrhage-history only (D68.3/K92.2/I60-I62) plus operator-ruling GU major-bleed (R31.0 gross hematuria, N02). Regression test: backend/tests/ingestion/epChunk1.test.ts (Z88.0-only gates; bleed fires).',
    },
    // v3.0 EP buildout 2026-06-16: 21 new evaluators authored across 4 chunks (AF anticoag/dosing, AF rhythm/
    // ablation, VT/CIED, brady/syncope/LAAC), all clinically reviewed + tested. SPEC_ONLY/PARTIAL -> DET_OK.
    'GAP-EP-003': { classification: 'DET_OK', registryId: 'gap-ep-003-rivaroxaban-renal-dose', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): rivaroxaban (IN 1114195) renal dose vs eGFR proxy; >=20mg at eGFR 15-50 or any dose <15. FDA Xarelto PI, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-004': { classification: 'DET_OK', registryId: 'gap-ep-004-apixaban-underdose-criteria', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): apixaban should-be-reduced (age>=80 AND Cr>=1.5, on >=5mg). Path-B weight arm (not ingested). FDA Eliquis PI, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-005': { classification: 'DET_OK', registryId: 'gap-ep-005-apixaban-inappropriate-underdose', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): apixaban inappropriately reduced (age<80 AND Cr<1.5, on <=2.5mg; <2 criteria certain). FDA Eliquis PI, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-008': { classification: 'DET_OK', registryId: 'gap-ep-008-doac-mitral-stenosis', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): DOAC + moderate-severe MS (I05.0/I34.2). 2020 VHD / INVICTUS, Class 3 (Harm). SPEC_ONLY -> DET_OK.' },
    'GAP-EP-009': { classification: 'DET_OK', registryId: 'gap-ep-009-edoxaban-high-crcl', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): edoxaban (1599538) + eGFR>95 (boxed warning, reduced efficacy). FDA Savaysa, Class 3 (Harm). SPEC_ONLY -> DET_OK.' },
    'GAP-EP-012': { classification: 'DET_OK', registryId: 'gap-ep-012-laac-high-risk-bleed', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 1): distinct LAAC evaluator (CHA2DS2-VASc>=3 + prior major bleed incl R31.0/N02 + no CPT 33340). 2023 AFib, Class 2a. Was reconciled to gap-ep-laac (PARTIAL); now own evaluator. -> DET_OK.' },
    'GAP-EP-014': { classification: 'DET_OK', registryId: 'gap-ep-014-af-ablation-hfref', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 2): AF (non-flutter) + LVEF<=35 + no CPT 93656. CASTLE-AF, Class 2a. First procedureCodes consumer (PR #396). PARTIAL -> DET_OK.' },
    'GAP-EP-071': { classification: 'DET_OK', registryId: 'gap-ep-071-post-ablation-oac', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 2): post-PVI (CPT 93656) + CHA2DS2-VASc qualifying + no OAC. Path-B timing. 2023 AFib, Class 1. PARTIAL -> DET_OK.' },
    'GAP-EP-072': { classification: 'DET_OK', registryId: 'gap-ep-072-redo-af-ablation', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 2, tightened): post-PVI (93656) + AF coded + on-AAD (recurrence proxy). Path-B blanking/symptom. 2023 AFib, Class 2a. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-074': { classification: 'DET_OK', registryId: 'gap-ep-074-flutter-cti-ablation', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 2): typical flutter (I48.3) + no CPT 93653. 2023 AFib, Class 1. PARTIAL -> DET_OK.' },
    'GAP-EP-076': { classification: 'DET_OK', registryId: 'gap-ep-076-svt-ablation', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 2): SVT (I47.1) + on-AAD + no CPT 93653. Covers AVNRT/AVRT/AT collectively (I47.1 lumps them). 2023 SVT, Class 1. PARTIAL -> DET_OK.' },
    'GAP-EP-020': { classification: 'DET_OK', registryId: 'gap-ep-020-ischemic-vt-ablation', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3): VT (I47.2) + ischemic (I25) + on-AAD + no CPT 93654. 2017 VA, Class 2a. PARTIAL -> DET_OK.' },
    'GAP-EP-021': { classification: 'DET_OK', registryId: 'gap-ep-021-nicm-vt-substrate', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3): VT + NICM (I42.0/.8/.9) + not-ischemic + no CPT 93654. 2017 VA, Class 2a. PARTIAL -> DET_OK.' },
    'GAP-EP-022': { classification: 'DET_OK', registryId: 'gap-ep-022-vt-ablation-vanish', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3): ischemic VT + ICD (33249/33270) + amiodarone + no CPT 93654. Path-B (shock log not ingested). VANISH, Class 2a. PARTIAL -> DET_OK.' },
    'GAP-EP-029': { classification: 'DET_OK', registryId: 'gap-ep-029-pacemaker-class1', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3, corrected): complete AV block (I44.2) or SSS (I49.5) + no CIED. I44.1 dropped (asymptomatic-Mobitz Path-B). 2018 Bradycardia, Class 1. PARTIAL -> DET_OK.' },
    'GAP-EP-034': { classification: 'DET_OK', registryId: 'gap-ep-034-cied-infection-extraction', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3): CIED present + infection (T82.7) + no extraction CPT. Covers EP-090. 2017 HRS CIED Infection, Class 1. PARTIAL -> DET_OK.' },
    'GAP-EP-092': { classification: 'DET_OK', registryId: 'gap-ep-092-sicd-candidate', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 3): LVEF<=35 + age<50 + no pacing dx + no defib + QRS<150 (standing subgroup check excludes CRT). 2017 VA, Class 2a. PARTIAL -> DET_OK.' },
    'GAP-EP-030': { classification: 'DET_OK', registryId: 'gap-ep-030-brady-avn-blocker-reduce', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 4): HR<50 + AV-nodal blocker + not-I44.2 (standing subgroup check) + no pacemaker. 2018 Bradycardia, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-033': { classification: 'DET_OK', registryId: 'gap-ep-033-af-slow-rate-pacing', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 4): AF + HR<40 + rate-control + no pacemaker. Path-B awake pattern. 2023 AFib + 2018 Brady, Class 2a. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-097': { classification: 'DET_OK', registryId: 'gap-ep-097-orthostatic-hypotension-med-review', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 4): orthostatic hypotension (I95.1) + BP-lowering agent (incl RxNav-verified RXNORM_ALPHA_BLOCKERS). 2017 Syncope, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-067': { classification: 'DET_OK', registryId: 'gap-ep-067-post-laac-antithrombotic', auditNote: 'BUILT 2026-06-16 (v3.0 EP chunk 4): LAAC (CPT 33340) + no antithrombotic (OAC/P2Y12/aspirin). Standing subgroup check: antiplatelet-based, bleed-aware rec. 2023 AFib + IFU, Class 2a. SPEC_ONLY -> DET_OK.' },
    // --- T0 net-new batch (2026-06-19): 2 EP gaps, dx+med only, codes RxNav/NLM-verified ---
    'GAP-EP-010': { classification: 'DET_OK', registryId: 'gap-ep-010-rivaroxaban-food', auditNote: 'BUILT 2026-06-19 (T0 net-new): rivaroxaban (1114195) -> take-with-food counseling (>=15mg absorption). Path-B dose. FDA Xarelto PI, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-EP-049': { classification: 'DET_OK', registryId: 'gap-ep-049-class-ic-structural', auditNote: 'BUILT 2026-06-19 (T0 net-new): SAFETY - class IC (flecainide 4441 / propafenone 8754) + structural HD (I25/I21/I22/I42/I50). CAST contraindication (SAFETY_ALERT). 2017 VA Guideline, Class 3 (Harm). SPEC_ONLY -> DET_OK.' },
  },
  SH: {
    // SH audit 2026-06-08 (operator-approved, Batches 1-5 + Batch-5 STEP-0 re-verification): 10
    // classification flips. 8 DET_OK -> PARTIAL_DETECTION (16.6(i)/(ii)/(iii) + 16.5 detection-quality
    // defects; each retains its evaluator/registryId, capped PARTIAL until AUDIT-121..128 remediate).
    // 2 -> SPEC_ONLY: GAP-SH-104 (DET_OK, AUDIT-126) + GAP-SH-028 (PARTIAL, AUDIT-129) where the mapped
    // rule is FULLY DISJOINT from the gap target, so registryId is dropped per the 16.6(ii) overlap rule
    // (partial overlap -> PARTIAL; disjoint -> SPEC_ONLY). Drivers: AUDIT-121..129.
    'GAP-SH-008': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-bicuspid-surveillance',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 1): DET_OK -> PARTIAL per AUDIT_METHODOLOGY.md 16.6(ii) / AUDIT-121. SH-BICUSPID gates dxCodes.startsWith(Q23.1) (congenital aortic insufficiency) for "bicuspid aortic valve", but bicuspid is Q23.81; the rule misses true bicuspid patients and false-fires on congenital AI. Partial overlap -> PARTIAL not SPEC_ONLY. Evaluator retained; PARTIAL until AUDIT-121 remediated (Q23.1 -> Q23.81).',
    },
    'GAP-SH-013': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-13-paravalvular-leak',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(ii) / AUDIT-122. SH-13 matches I35.1 OR I34.0 as "new regurgitation", but the gap is aortic-prosthesis PVL-specific: I35.1 (aortic insufficiency) is correct while I34.0 (mitral insufficiency) over-fires on unrelated post-prosthetic mitral regurg with no PVL. Partial overlap -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-122 remediated (drop I34.0, keep I35.1).',
    },
    'GAP-SH-061': {
      classification: 'DET_OK',
      registryId: 'gap-sh-valve-in-valve',
      auditNote:
        'RESOLVED 2026-06-17 (v3.0 SH close): PARTIAL -> DET_OK. AUDIT-123 fixed - ViV (SH-VALVE-IN-VALVE) is now Z95.3-ONLY (xenogenic/bioprosthetic, the definitive code), never false-firing on a mechanical valve. Guarded by audit123Bioprosthetic.test.ts (Z95.3 fires ViV; Z95.2-mechanical does not). Path-B residual: a bioprosthetic miscoded as generic Z95.2 is the accepted ICD-10 ambiguity (no mechanical-specific code).',
    },
    'GAP-SH-011': {
      classification: 'DET_OK',
      registryId: 'gap-sh-6-post-tavr-followup',
      auditNote:
        'RESOLVED 2026-06-17 (v3.0 SH close): PARTIAL -> DET_OK. AUDIT-123 fixed - SH-6 post-TAVR follow-up now gates Z95.2 OR Z95.3 (TAVR tissue valves may be coded either way), so it no longer misses Z95.3-coded bioprosthetic patients. Guarded by audit123Bioprosthetic.test.ts (Z95.3 + AS history fires post-TAVR).',
    },
    'GAP-SH-064': {
      classification: 'DET_OK',
      registryId: 'gap-sh-11-tmvr',
      auditNote:
        'RESOLVED 2026-06-17 (v3.0 SH close): PARTIAL -> DET_OK. AUDIT-125 fixed (v3.0 SH chunk 2) - TMVR (SH-11) now gates on the threaded MR severity (mitral_eroa>=0.40 / mitral_regurg_grade>=4 / valve_severity>=5) in addition to age, so it no longer over-detects sub-threshold MR. Guarded by shChunk2.test.ts (AUDIT-125 gate: sub-threshold EROA does not fire).',
    },
    'GAP-SH-022': {
      classification: 'DET_OK',
      registryId: 'gap-sh-022-tricuspid-assessment',
      auditNote:
        'RESOLVED 2026-06-17 (v3.0 SH close; registryId migrated 2026-06-17 v3.0 VHD close, AUDIT-171): PARTIAL -> DET_OK. AUDIT-125 fixed (v3.0 SH chunk 3) - severe-TR transcatheter-eval (SH-022, tightening the old SH-4) now gates on threaded TR severity (tr_regurg_grade>=4 OR valve_severity>=5) + congestion, no longer over-detecting mild TR. The legacy un-gated SH-12 was retired (AUDIT-167). AUDIT-171: the SH close renamed the evaluator SH-4 -> SH-022 but left the registry id gap-sh-4-tricuspid-assessment, so the cite could not pair (regOrphan -> applyOverrides demotion). Registry id migrated to gap-sh-022-tricuspid-assessment to match the evaluator + spec GAP-SH-022. Guarded by shChunk3.test.ts (AUDIT-125 regression: no severity -> does not fire).',
    },
    'GAP-SH-026': {
      classification: 'DET_OK',
      registryId: 'gap-sh-026-pfo-cryptogenic-closure',
      auditNote:
        'RESOLVED 2026-06-17 (v3.0 SH close): PARTIAL -> DET_OK. AUDIT-127 fully closed - SH-026 gates PFO (Q21.12 specific) + cryptogenic stroke (I63.x) + age<60 + EXCLUDES AF (I48.x, the cardioembolic source the over-detection named), and the legacy un-gated gap-sh-9-pfo-closure was RETIRED this close (superseded-not-delete). RoPE-score components are a Path-B refinement, not a detection defect. shChunk5.test.ts + the AUDIT-127 retirement note.',
    },
    'GAP-SH-027': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-asd-closure',
      auditNote:
        'v3.0 SH close: AUDIT-128 over-detection closed (the legacy late-RV-failure-proxy gap-sh-asd-closure was RETIRED; the lineage registry id is retained and now maps to the chunk-5 SH-027 evaluator). SH-027 gates significant ASD (Q21.1x not PFO) on threaded PASP>=40 + EXCLUDES Eisenmenger. Held PARTIAL: RV size + Qp:Qs (2 of the 3 significance signals) are not threaded (echo-morphology) - only PASP is. shChunk5.test.ts.',
    },
    'GAP-SH-104': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-126. SH-15 detects PRE-procedure ASA candidacy (I42.1 obstructive HCM + obstruction symptoms), but GAP-SH-104 targets POST-ASA conduction surveillance; the two are fully disjoint (zero true-positive overlap), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage); SH-15 correctly serves the sibling GAP-SH-105. Remediation = a post-ASA procedure-history gate for GAP-SH-104 (AUDIT-126).',
    },
    'GAP-SH-028': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 5): PARTIAL -> SPEC_ONLY per 16.6(ii) wrong-target / AUDIT-129. SH-7 detects endocarditis PROPHYLAXIS candidates (prosthetic valve Z95.2/3/4 + high-risk procedure Z01.2/Z96), but GAP-SH-028 targets SUSPECTED-IE Duke-criteria diagnostic workup; prevention vs diagnosis share zero true positives (fully disjoint), so PARTIAL would overclaim. Per the 16.6(ii) overlap rule, disjoint -> SPEC_ONLY. registryId dropped (no genuine coverage). Remediation = a suspected-IE detection rule for GAP-SH-028 (AUDIT-129).',
    },
    // v3.0 SH buildout (chunks 1-7, 2026-06-17) - classifications for the newly-authored evaluators.
    // DET_OK = detects via threaded dx/labs/meds/procedureCodes; PARTIAL = a material Path-B arm remains.
    'GAP-SH-002': {
      classification: 'DET_OK', registryId: 'gap-sh-2-tavr-eval',
      auditNote: 'v3.0 SH chunk 1 (AUDIT-125 tightened): severe symptomatic AS -> AVR now gates on concordant severe AS via threaded echo (mean gradient>=40 / vmax>=4.0 / valve_severity>=5) + symptomatic + no prosthetic AV; subgroup-aware SAVR-vs-TAVR. LFLG routes to SH-003/004. shChunk1.test.ts.',
    },
    'GAP-SH-010': {
      classification: 'DET_OK', registryId: 'gap-sh-10-mitraclip',
      auditNote: 'v3.0 SH chunk 2 (AUDIT-166 fix): secondary-MR TEER (COAPT) now GDMT-first - branches on BB+RAASi proxy (GDMT-naive -> optimize GDMT first; GDMT-optimized -> TEER candidacy) + the AUDIT-125 severity gate. Deterministic override (reconcile greedy-matched gap-sh-10-mitraclip to a sibling mitral eval). shChunk2.test.ts.',
    },
    'GAP-SH-069': {
      classification: 'PARTIAL_DETECTION', registryId: 'gap-sh-069-evoque-ttvr',
      auditNote: 'v3.0 SH chunk 3: severe TR (threaded) + no CIED lead -> Evoque TTVR (TRISCEND) candidacy. PARTIAL: coaptation-gap morphology / T-TEER eligibility is echo-morphology (DUA-deferred), not threaded. shChunk3.test.ts.',
    },
    'GAP-SH-023': {
      classification: 'PARTIAL_DETECTION', registryId: 'gap-sh-023-tr-device-lead',
      auditNote: 'v3.0 SH chunk 3: severe TR + CIED lead (Z95.0/Z95.810) -> lead-status + device-selection. PARTIAL: coaptation-gap morphology not threaded (echo-morphology, DUA-deferred); lead presence IS threaded. shChunk3.test.ts.',
    },
    'GAP-SH-052': {
      classification: 'DET_OK', registryId: 'gap-sh-052-marfan-bb-arb',
      auditNote: 'v3.0 SH chunk 4: Marfan (Q87.40/41x) + aortic dilation (Q87.410 / I71.2x / ascending_aorta>=4.0) not on BB or ARB -> aortic-growth prophylaxis. shChunk4.test.ts.',
    },
    'GAP-SH-074': {
      classification: 'DET_OK', registryId: 'gap-sh-074-typeb-omt',
      auditNote: 'v3.0 SH chunk 4: uncomplicated type-B dissection (I71.012/I71.03, no malperfusion) not on full OMT (BB+statin proxy) -> optimal medical therapy. shChunk4.test.ts.',
    },
    'GAP-SH-075': {
      classification: 'PARTIAL_DETECTION', registryId: 'gap-sh-075-typeb-tevar',
      auditNote: 'v3.0 SH chunk 4: complicated type-B dissection (malperfusion proxy K55.0x/N17/I74.3-5) -> urgent TEVAR eval. PARTIAL: malperfusion is a proxy + rapid-aortic-expansion is not coded (Path-B). TEVAR named as text (no CPT). shChunk4.test.ts.',
    },
    'GAP-SH-054': {
      classification: 'DET_OK', registryId: 'gap-sh-054-turner-surveillance',
      auditNote: 'v3.0 SH chunk 4: Turner (Q96) without echo data on file -> cardiac + aortic surveillance. shChunk4.test.ts.',
    },
    'GAP-SH-055': {
      classification: 'DET_OK', registryId: 'gap-sh-055-veds-celiprolol',
      auditNote: 'v3.0 SH chunk 4: vascular EDS (Q79.63, section-16-verified - not Q79.61 classical) not on celiprolol (RxCUI 20498) -> celiprolol + vascular surveillance. shChunk4.test.ts.',
    },
    'GAP-SH-029': {
      classification: 'DET_OK', registryId: 'gap-sh-029-ie-early-surgery',
      auditNote: 'v3.0 SH chunk 5: IE (I33.0) + early-surgery indication (HF I50 / embolic I74-I63 / uncontrolled infection A41-R65.2) -> surgery eval. shChunk5.test.ts.',
    },
    'GAP-SH-091': {
      classification: 'DET_OK', registryId: 'gap-sh-091-massive-pe-reperfusion',
      auditNote: 'v3.0 SH chunk 5: massive PE (I26.0x) + cardiogenic shock (R57.0) -> reperfusion (lysis/embolectomy/ECMO). Subgroup: submassive excluded. shChunk5.test.ts.',
    },
    'GAP-SH-101': {
      classification: 'DET_OK', registryId: 'gap-sh-101-eisenmenger-pah',
      auditNote: 'v3.0 SH chunk 5: Eisenmenger (I27.83) -> PAH-specific therapy evaluation. shChunk5.test.ts.',
    },
    'GAP-SH-099': {
      classification: 'DET_OK', registryId: 'gap-sh-099-ebstein-arrhythmia',
      auditNote: 'v3.0 SH chunk 5: Ebstein anomaly (Q22.5) -> arrhythmia surveillance. Path-B: monitoring dates not tracked (surveillance-due proxy). shChunk5.test.ts.',
    },
    'GAP-SH-059': {
      classification: 'DET_OK', registryId: 'gap-sh-059-postavr-antithrombotic',
      auditNote: 'v3.0 SH chunk 6: post-AVR (Z95.2/Z95.3 + AS hx) on DAPT -> antithrombotic de-escalation. Subgroup-aware: AF -> OAC; else single antiplatelet (POPular-TAVI). Path-B: time-since-implant not coded. shChunk6.test.ts.',
    },
    'GAP-SH-057': {
      classification: 'DET_OK', registryId: 'gap-sh-057-postavr-lbbb',
      auditNote: 'v3.0 SH chunk 6: post-AVR + new LBBB (I44.7) -> ambulatory rhythm monitoring. shChunk6.test.ts.',
    },
    'GAP-SH-060': {
      classification: 'DET_OK', registryId: 'gap-sh-060-postavr-pacing',
      auditNote: 'v3.0 SH chunk 6: post-AVR + high-grade/complete AV block (I44.1/I44.2) -> permanent pacing decision. Subgroup-separated from SH-057 (LBBB->monitor). shChunk6.test.ts.',
    },
    'GAP-SH-092': {
      classification: 'DET_OK', registryId: 'gap-sh-092-cteph-surveillance',
      auditNote: 'v3.0 SH chunk 6: PE history (I26.x/Z86.711) + persistent dyspnea -> CTEPH workup. Path-B: 3-6mo window not coded. shChunk6.test.ts.',
    },
    'GAP-SH-095': {
      classification: 'DET_OK', registryId: 'gap-sh-095-coarctation-surveillance',
      auditNote: 'v3.0 SH chunk 6: coarctation (Q25.1) -> serial imaging surveillance. Path-B: repair status not coded (fires native + repaired). shChunk6.test.ts.',
    },
    'GAP-SH-097': {
      classification: 'DET_OK', registryId: 'gap-sh-097-systemic-rv',
      auditNote: 'v3.0 SH chunk 6: systemic RV (ccTGA Q20.5 / d-TGA Q20.3) -> ACHD-center surveillance. shChunk6.test.ts.',
    },
    'GAP-SH-082': {
      classification: 'DET_OK', registryId: 'gap-sh-082-postclosure-antithrombotic',
      auditNote: 'v3.0 SH chunk 7: post-septal-closure (CPT 93580 ASD/PFO or 93581 VSD, manufacturer-confirmed) + no antithrombotic -> antithrombotic regimen. Subgroup-aware: AF -> OAC; else antiplatelet. CPT-gated via the procedureCodes param. shChunk7.test.ts.',
    },
    'GAP-SH-083': {
      classification: 'PARTIAL_DETECTION', registryId: 'gap-sh-083-postclosure-surveillance',
      auditNote: 'v3.0 SH chunk 7: post-closure (CPT 93580/93581) + echo-overdue -> residual-shunt surveillance echo. PARTIAL: residual-shunt magnitude is not quantified in structured data (the surveillance echo is the detection vehicle). shChunk7.test.ts.',
    },
    'GAP-SH-065': {
      classification: 'DET_OK', registryId: 'gap-sh-065-postteer-echo',
      auditNote: 'v3.0 SH chunk 7: mitral TEER (CPT 33418/33419, Abbott MitraClip-confirmed) + echo-overdue -> annual surveillance echo. CPT-gated via the procedureCodes param. shChunk7.test.ts.',
    },
    'GAP-SH-066': {
      classification: 'PARTIAL_DETECTION', registryId: 'gap-sh-066-recurrent-mr-teer',
      auditNote: 'v3.0 SH chunk 7: mitral TEER + recurrent significant MR (EROA>=0.30 / grade>=3 / valve_severity>=4) -> redo-TEER-vs-surgery reassessment. PARTIAL: the serial pre/post-TEER MR-grade trend is not threaded (current severity is the recurrence proxy). shChunk7.test.ts.',
    },
    // v3.0 SH close (2026-06-17): chunk-1/2 AS+MR gaps that gained clean evaluator blocks after the comment
    // normalization, each given a dedicated registry + deterministic override (reconcile is fuzzy).
    'GAP-SH-003': {
      classification: 'DET_OK', registryId: 'gap-sh-003-lflg-classical',
      auditNote: 'v3.0 SH chunk 1: classical low-flow low-gradient AS (LVEF<50 + AVA<1.0 + mean gradient<40) -> dobutamine stress echo. shChunk1.test.ts.',
    },
    'GAP-SH-004': {
      classification: 'DET_OK', registryId: 'gap-sh-004-lflg-paradoxical',
      auditNote: 'v3.0 SH chunk 1: paradoxical low-flow low-gradient AS (preserved EF + AVA<1.0 + low gradient). shChunk1.test.ts.',
    },
    'GAP-SH-006': {
      classification: 'DET_OK', registryId: 'gap-sh-006-asymptomatic-as',
      auditNote: 'v3.0 SH chunk 1: asymptomatic severe AS + LVEF<55 -> AVR evaluation (Class IIa; LVEF<50 Class 1). Concordant severe gate + LFLG partition routes to SH-003/004. shChunk1.test.ts.',
    },
    'GAP-SH-050': {
      classification: 'DET_OK', registryId: 'gap-sh-050-moderate-as-grading',
      auditNote: 'v3.0 SH chunk 1: moderate AS (AVA 1.0-1.5) -> severity-grading surveillance. Path-B: CT-annular measures not ingested. shChunk1.test.ts.',
    },
    'GAP-SH-014': {
      classification: 'DET_OK', registryId: 'gap-sh-3-mitral-intervention',
      auditNote: 'v3.0 SH chunk 2 (AUDIT-125 tightened): severe PRIMARY MR (EROA>=0.40 / grade>=4 / valve_severity>=5) + symptomatic -> surgical REPAIR (subgroup-aware, excludes secondary MR). shChunk2.test.ts.',
    },
    'GAP-SH-016': {
      classification: 'DET_OK', registryId: 'gap-sh-016-primary-mr-af',
      auditNote: 'v3.0 SH chunk 2: severe primary MR + new AF (Class IIa). shChunk2.test.ts.',
    },
    'GAP-SH-017': {
      classification: 'DET_OK', registryId: 'gap-sh-017-primary-mr-pasp',
      auditNote: 'v3.0 SH chunk 2: severe primary MR + PASP>50 (Class IIa). shChunk2.test.ts.',
    },
    'GAP-SH-103': {
      classification: 'DET_OK', registryId: 'gap-sh-103-atrial-myxoma',
      auditNote: 'v3.0 SH chunk 5: benign cardiac neoplasm / atrial myxoma (D15.1) -> surgical referral. shChunk5.test.ts.',
    },
    // Spec gaps with no distinct evaluator (the old single-block split / data-blocked) -> SPEC_ONLY, cite cleared.
    'GAP-SH-001': {
      classification: 'SPEC_ONLY',
      auditNote: 'v3.0 SH close: GAP-SH-001 (asymptomatic very-severe AS, EARLY-TAVR heart-team) has no distinct evaluator - the chunk-1 AS build covers symptomatic AVR (GAP-SH-002) + LVEF<55 (GAP-SH-006) + the LFLG partition (GAP-SH-003/004), not a dedicated early-TAVR-very-severe gate. The stale SH-2 cite (from the pre-chunk-1 single AS block) is cleared. SPEC_ONLY until a dedicated very-severe-asymptomatic gate is built.',
    },
    'GAP-SH-015': {
      classification: 'SPEC_ONLY',
      auditNote: 'v3.0 SH close: GAP-SH-015 has no distinct evaluator after the MR block split (the chunk-2 MR build covers GAP-SH-014/016/017). The stale SH-3 cite is cleared. SPEC_ONLY.',
    },
    'GAP-SH-024': {
      classification: 'DET_OK',
      registryId: 'gap-sh-024-tr-rv-dysfunction',
      auditNote: 'BUILT 2026-06-22 (T1-broader PART 2): SPEC_ONLY (data-blocked) -> DET_OK. The TAPSE/FAC data-block is lifted - tapse/fac are now CSV-threaded (echo-morphology, no clean LOINC, no-guess). Purpose-built gap-sh-024-tr-rv-dysfunction (severe TR I36.1 + RV systolic dysfunction TAPSE < 17 mm or FAC < 35%, pre-symptomatic) -> heart-team intervention-timing eval. 2020 ACC/AHA VHD severe-TR intervention Class 2a (LOE C-LD); TAPSE < 17 = ASE RV-dysfunction cut (section-16). Partitions from SH-022 (severe symptomatic TR) on !congestion - no double-fire. Guarded by t1BroaderPart2.test.ts.',
    },
    'GAP-SH-080': {
      classification: 'SPEC_ONLY',
      auditNote: 'v3.0 SH close: GAP-SH-080 (PFO-closure candidacy: RoPE score documented) is process/data-blocked - the RoPE-score components (cortical infarct on imaging, absent vascular risk factors) are not threaded. The PFO-closure DETECTION is now SH-026 (GAP-SH-026); this RoPE-score-documentation gap has no evaluator. Its cite to the retired legacy SH-9 PFO block is cleared. SPEC_ONLY / Tranche-3 process-doc.',
    },
  },
  CAD: {
    'GAP-CAD-016': {
      classification: 'DET_OK',
      registryId: 'gap-cad-016-prasugrel-stroke-safety',
      auditNote:
        'MANUAL OVERRIDE: AUDIT-034 RESOLVED 2026-05-05 — new SAFETY evaluator block added (this PR) covering prasugrel + stroke/TIA contraindication per FDA black-box + 2023 ACC/AHA CCD Class 3 (Harm). Closes Tier S queue item. Override pin preserved for stability against auto-classifier matching the broader gap-cad-prasugrel recommendation rule (which fires for opposite scenario: should-be-on-prasugrel without stroke).',
    },
    'GAP-CAD-027': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-pv-rivaroxaban',
      evaluatorModule: 'PV',
      auditNote:
        'MANUAL OVERRIDE per CAD addendum line 232: cross-module satisfaction. GAP-CAD-027 (Polyvascular COMPASS dual pathway) is satisfied by PV module rule gap-pv-rivaroxaban. Note: this rule is registered under CAD module enum (module: ModuleType.CORONARY_INTERVENTION) despite gap-pv-* naming — naming convention inconsistency tracked at AUDIT-027.',
    },
    // --- CAD chunk 0 tightenings (2026-06-18, AUDIT-173/174/177) ---
    'GAP-CAD-029': {
      classification: 'DET_OK',
      registryId: 'gap-cad-rehab-cabg',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-173 RESOLVED): RE-CITED from the over-detecting CAD-REHAB (fired on hasCAD alone) to the purpose-built gap-cad-rehab-cabg evaluator (post-CABG Z95.1 + rehab-engagement guard CPT 93797/93798). Now genuinely gated on the post-CABG population the spec targets; DET_OK.',
    },
    'GAP-CAD-046': {
      classification: 'DET_OK',
      registryId: 'gap-cad-rehab-mi',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-173 RESOLVED): RE-CITED from the over-detecting CAD-REHAB to the purpose-built gap-cad-rehab-mi evaluator (post-MI I21/I22/I25.2 + rehab-engagement guard). Now genuinely gated on the post-MI population; DET_OK.',
    },
    'GAP-CAD-061': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-174): DAPT de-escalation (TWILIGHT/TICO = drop aspirin while ON a P2Y12) was miscited to Gap-50, which detects P2Y12-ABSENCE (the opposite scenario; zero true-positive overlap). No genuine de-escalation evaluator exists (it needs on-DAPT + months-since-PCI, partly un-threaded). Per §16.6(ii) disjoint-target -> SPEC_ONLY; registryId dropped.',
    },
    'GAP-CAD-007': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-cad-lipid-panel-fu',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-177): DET_OK -> PARTIAL. CAD-LIPID-PANEL-FU fires on ldl===undefined && total_cholesterol===undefined - an existence-proxy, not the spec "not measured in 12 months" interval (no lipid-panel date/months is threaded, so the >12-month logic cannot be computed). Held at PARTIAL per §16 underclaim-governs (the VD-5 / AUDIT-134 existence-proxy class).',
    },
    'GAP-CAD-068': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-cad-ffr',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-177): DET_OK -> PARTIAL. CAD-FFR fires on stress_test===undefined for any CAD-without-recent-MI, with NO borderline-lesion (40-70% stenosis) signal - the spec target. Borderline-stenosis severity is not codable/threaded, so the existence-proxy cannot reach the spec target. Held at PARTIAL.',
    },
    'GAP-CAD-018': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-cad-dapt-duration',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 0, AUDIT-177): DET_OK -> PARTIAL. CAD-DAPT-DURATION status says "assess continued need beyond 12 months" but the trigger only checks aspirin+P2Y12 co-presence - no months-since-PCI/DAPT-start date is threaded, so the duration logic cannot be computed (fires at month 1). Held at PARTIAL (narrative-vs-logic).',
    },
    // --- CAD chunk 1 close (2026-06-18): 6 newly DET_OK + the AUDIT-182 CAD-IVUS reclassification ---
    'GAP-CAD-009': {
      classification: 'DET_OK',
      registryId: 'gap-cad-009-apob',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1, AUDIT-181): newly DET_OK. Purpose-built gap-cad-009-apob (CAD + on-statin + labValues[\'apob\'] >= 90 -> residual atherogenic risk). ApoB LOINC 1884-6 threaded both paths (AUDIT-181 slug-thread), converting CAD-009 from Path-B to a genuine gateable DET_OK.',
    },
    'GAP-CAD-083': {
      classification: 'DET_OK',
      registryId: 'gap-cad-083-radiation-cad',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1): newly DET_OK. Purpose-built gap-cad-083-radiation-cad (Z92.3 prior irradiation + CAD -> aggressive risk-factor modification + surveillance). Z92.3 NLM-verified.',
    },
    'GAP-CAD-084': {
      classification: 'DET_OK',
      registryId: 'gap-cad-084-vasculitis-cad',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1): newly DET_OK. Purpose-built gap-cad-084-vasculitis-cad (M30.x/M31.x systemic vasculitis + CAD -> coordinated immunosuppression-aware management, distinct from atherosclerotic). M30/M31 NLM-verified.',
    },
    'GAP-CAD-085': {
      classification: 'DET_OK',
      registryId: 'gap-cad-085-stimulant-cad',
      inferredSafetyTag: 'STRUCTURAL_SAFETY',
      inferredSafetyRationale: 'Cocaine/methamphetamine-associated coronary ischemia: the beta-blocker unopposed-alpha caution is a safety-recommendation nuance; the gap fires a SAFETY_ALERT framing CCB/benzo/nitrate preferred acutely and BB cautioned.',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1): newly DET_OK. Purpose-built gap-cad-085-stimulant-cad (F14.x cocaine / F15.x stimulant + CAD/angina -> SAFETY_ALERT: substance cessation + beta-blocker caution, NOT blanket BB). F14/F15 NLM-verified; 2008 AHA cocaine-chest-pain statement.',
    },
    'GAP-CAD-022': {
      classification: 'DET_OK',
      registryId: 'gap-cad-022-post-mi-icd',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1): newly DET_OK. Purpose-built gap-cad-022-post-mi-icd (MI I21/I22/I25.2 + LVEF <= 35 -> primary-prevention ICD evaluation). Path-B: the >=40-day post-MI / >=90-day post-revasc waiting period is not threaded (documented in the gap note); the LVEF<=35 post-MI detection is genuine.',
    },
    'GAP-CAD-026': {
      classification: 'DET_OK',
      registryId: 'gap-cad-026-polyvascular',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1): newly DET_OK. Purpose-built gap-cad-026-polyvascular (CAD + PAD I70.2/I73.9 + cerebrovascular I63/I65/Z86.73 = 3-territory -> comprehensive intensified secondary prevention). Reconciled with CAD-027 (the COMPASS rivaroxaban drug-specific axis) as complementary, not redundant.',
    },
    'GAP-CAD-069': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1 close, AUDIT-182): PARTIAL -> SPEC_ONLY. The prior cite CAD-IVUS was retired (it gated hasLeftMain = I25.110, but I25.110 = ASHD + unstable angina, NOT left main - a wrong-code over-detector). Complex-PCI IVUS guidance needs an angiographic/procedure signal not threaded. registryId dropped.',
    },
    'GAP-CAD-070': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1 close, AUDIT-182): PARTIAL -> SPEC_ONLY. Same as CAD-069 - the cited CAD-IVUS rule was retired (I25.110 wrong-code). Stent-sizing IVUS underexpansion detection needs an IVUS/angiographic data element not threaded. registryId dropped.',
    },
    'GAP-CAD-071': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (CAD chunk 1, AUDIT-182): holds SPEC_ONLY. Left-main heart-team review has NO ICD-10 trigger - I25.110 (the CAD-IVUS proxy) = unstable angina not left main, and the only left-main code is I21.01 (acute STEMI). Chronic left-main disease is an angiographic finding, not threaded. Path-B pending an angiographic signal.',
    },
  },
  VHD: {
    // VHD audit 2026-06-10 (operator-confirmed, Batches 1-5 + two re-derivations): supersedes the stale
    // 2026-05-04 baseline (5 DET_OK / 16 PARTIAL / 84 SPEC_ONLY -> 0 / 11 / 94). All 4 baseline DET_OK
    // overrides failed under §16.5/§16.6 + clinical-code re-review (underclaim governs): VHD-010/080/103
    // -> SPEC_ONLY, VHD-063 -> PARTIAL. VHD-005 DET_OK -> PARTIAL (AUDIT-123 Z95.x inversion + AUDIT-117
    // dabigatran SCD; VD-6 CRITICAL SAFETY). 7 PARTIAL -> SPEC_ONLY downgrades (AUDIT-133, D-B5-2, D-B5-3,
    // D-B5-4, AUDIT-136). 9 holds at PARTIAL (one re-cited: VHD-016 -> VD-ANTIPLATELET-BIOPROSTHETIC).
    // VHD-099 is a structurally-inferred Tier-S SAFETY item (ESCALATE-AT-DUA). PARTIAL entries retain
    // registryId; SPEC_ONLY entries drop it per the §16.6(ii) overlap rule.
    //
    // v3.0 VHD BUILD CLOSE 2026-06-17 (supersedes the 2026-06-10 0/11/94 read-only baseline above): chunks 1-5
    // authored 17 purpose-built gap-vhd-* evaluators (test-guarded). Reclassified here against their genuine
    // detection: 12 DET_OK (001/006/057/064/079/083/091/092/098/102/104/105) + 5 PARTIAL (011/059/068/099/103,
    // each held by §16 underclaim-governs where a spec sub-arm needs un-threaded data: serial-gradient-delta,
    // LVESD, warfarin-dose/trimester, or the on-abx-vs-on-anticoag axis). AUDIT-133/134/135 RESOLVED;
    // AUDIT-169/170 filed in chunk 3. The pre-build broad-VD-* cites (VD-3/5/10/11/PANNUS/TRICUSPID) are
    // re-cited to the purpose-built evaluators; legacy VD-5 retained as a regOrphan for lineage.

    // --- DET_OK -> PARTIAL (1) ---
    'GAP-VHD-005': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-6-doac-mechanical-valve',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> PARTIAL per §16.6(i) concept-match / AUDIT-123 + §16.5 / AUDIT-117. VD-6 (DOAC + mechanical valve; spec CRITICAL SAFETY; RE-ALIGN Class 3 Harm) is capped by two data-coupling defects: the AUDIT-123 Z95.2/Z95.3 valve-type inversion (cross-module class inherited from SH) and the AUDIT-117/§16.5 exact-RxCUI DOAC match with no ingredient->descendant expansion. Evaluator retained; PARTIAL until AUDIT-123 + AUDIT-117 remediated.',
    },
    // --- DET_OK -> PARTIAL (baseline override failed; downgraded not dropped) ---
    'GAP-VHD-063': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-14-dental-prophylaxis',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> PARTIAL. The 2026-05-04 baseline DET_OK override (VD-14 dental IE prophylaxis) over-credited fidelity; under §16.6 over-detection / §3.2.1 broad-rule review VD-14 partially covers the VHD-063 target but lacks the gap-specific discrimination the spec wants. Evaluator retained; PARTIAL.',
    },
    // --- holds at PARTIAL ---
    'GAP-VHD-011': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vhd-011-bio-svd-gradient',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 2 close): RE-CITED from the broad VD-11 to the purpose-built gap-vhd-011-bio-svd-gradient evaluator (bioprosthetic Z95.3 + elevated mean gradient -> SVD/ViV-vs-redo). Holds at PARTIAL per §16 underclaim-governs: the spec wants serial gradient rise >=10 mmHg from baseline OR new PVL; baseline-delta and PVL are not threaded, so the evaluator detects elevated absolute gradient as a proxy. Evaluator retained.',
    },
    'GAP-VHD-016': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-antiplatelet-bioprosthetic',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5): PARTIAL hold, RE-CITED from VD-11 (gap-vd-11-bioprosthetic-degeneration) to VD-ANTIPLATELET-BIOPROSTHETIC (gap-vd-antiplatelet-bioprosthetic). The prior VD-11 consolidation cite was imprecise; the antiplatelet-after-bioprosthetic rule is the more precise partial-coverage evaluator. PARTIAL per §3.2.1. Evaluator retained.',
    },
    'GAP-VHD-024': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-2-tavr-eval',
      evaluatorModule: 'SH',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold, cross-module. gap-sh-2-tavr-eval (SH module, SH-2) provides partial coverage of VHD-024 (severe AS AVR-vs-TAVR). PARTIAL per §3.2.1. Evaluator retained.',
    },
    'GAP-VHD-039': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-tricuspid-secondary',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-TRICUSPID-SECONDARY (gap-vd-tricuspid-secondary) partially covers VHD-039; PARTIAL per §3.2.1 (broad rule lacks gap-specific discrimination). Evaluator retained.',
    },
    'GAP-VHD-068': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vhd-068-mech-pvt-gradient',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 2 close): RE-CITED from the broad VD-PANNUS to the purpose-built gap-vhd-068-mech-pvt-gradient evaluator (mechanical Z95.2/Z95.4 + elevated mean gradient -> PVT workup). Holds at PARTIAL per §16 underclaim-governs: the spec wants gradient rise >=50% from baseline specifically; baseline-delta is not threaded, so the evaluator detects elevated absolute gradient as a proxy. T1. Evaluator retained.',
    },
    'GAP-VHD-077': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-12-af-valve-anticoag',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-12 (gap-vd-12-af-valve-anticoag) covers AF + valve-disease anticoagulation; partial coverage of VHD-077 (spec wants discrimination the broad rule lacks). PARTIAL per §3.2.1. Evaluator retained.',
    },
    'GAP-VHD-095': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-radiation-valve',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-RADIATION (gap-vd-radiation-valve) is a broad radiation-valve consolidation rule covering VHD-095 + VHD-096; PARTIAL per §3.2.1 (broad rule lacks gap-specific discrimination). Evaluator retained.',
    },
    'GAP-VHD-096': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-radiation-valve',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-RADIATION (gap-vd-radiation-valve) broad radiation-valve consolidation rule (also covers VHD-095); PARTIAL per §3.2.1. Evaluator retained.',
    },
    'GAP-VHD-098': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-098-mech-valve-preconception',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): PARTIAL -> DET_OK. RE-CITED from the broad VD-10 to the purpose-built gap-vhd-098-mech-valve-preconception evaluator (mechanical Z95.2/Z95.4 + reproductive-age female + not-pregnant -> pre-conception anticoagulation-strategy counseling). Genuinely detects the spec target (pre-conception female + mechanical valve without counseling). VD-10 remains the broader valve-disease pre-conception rule; this is the mechanical-valve-specific layer.',
    },
    // --- PARTIAL -> SPEC_ONLY downgrades (registryId dropped per §16.6(ii)) ---
    'GAP-VHD-001': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-001-subtherapeutic-inr',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 3 close, AUDIT-133 RESOLVED): SPEC_ONLY -> DET_OK. The 2026-06-10 disjoint-target finding (VD-3 fires on no-INR-data; the anticoag rule on no-warfarin) is resolved by the purpose-built gap-vhd-001-subtherapeutic-inr evaluator: mechanical valve (Z95.2/Z95.4) + warfarin + inr < 2.0, reading the AUDIT-170 INR slug-fix (LOINC 34714-6 -> inr). Genuinely detects the spec target. Position-specific INR target is a documented Path-B refinement, not a detection gap.',
    },
    'GAP-VHD-017': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-2): PARTIAL -> SPEC_ONLY. The prior VD-11 (gap-vd-11-bioprosthetic-degeneration) consolidation cite does not genuinely detect the VHD-017 spec target (underclaim governs; coverage incidental, not the spec target). registryId dropped.',
    },
    'GAP-VHD-079': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-079-rheumatic-prophylaxis',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): SPEC_ONLY -> DET_OK. The prior VD-TRICUSPID-SECONDARY miscite is replaced by the purpose-built gap-vhd-079-rheumatic-prophylaxis evaluator: rheumatic heart disease (I05-I09) + no benzathine penicillin (RxNorm 7982) -> secondary prophylaxis. Exact match to the spec target. Prophylaxis duration (age/risk-dependent) is a documented Path-B refinement.',
    },
    'GAP-VHD-088': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-4): PARTIAL -> SPEC_ONLY. The prior VD-PULMONARY-HTN (gap-vd-pulmonary-htn) cite is a miscite - the rule does not detect the VHD-088 spec target. Per §16.6(ii) / §1, miscite with no genuine overlap -> SPEC_ONLY; registryId dropped.',
    },
    'GAP-VHD-099': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vhd-099-mech-valve-pregnancy-anticoag',
      inferredSafetyTag: 'STRUCTURAL_SAFETY',
      inferredSafetyRationale:
        'Mechanical valve + pregnancy 1st trimester: warfarin >5mg/day is teratogenic (warfarin embryopathy) without the spec LMWH-transition protocol; uncovered T1 maternal-fetal safety gap. Structurally-inferred SAFETY (spec carries no SAFETY tag); operator-decided Tier-S ESCALATE-AT-DUA.',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): SPEC_ONLY -> PARTIAL. RE-CITED to the purpose-built gap-vhd-099-mech-valve-pregnancy-anticoag SAFETY_ALERT evaluator (mechanical Z95.2/Z95.4 + pregnancy O99.4x/O09/Z34/Z33.1/Z3A -> heart-team + MFM anticoagulation SAFETY, warfarin-branch teratogenicity tradeoff, do-NOT-discontinue guardrail). Holds at PARTIAL per §16 underclaim-governs: the spec wants warfarin >5mg/day dose-specificity + 1st-trimester-specific LMWH dose-transition (VHD-100 anti-Xa, VHD-101 delivery plan); warfarin dose and gestational-week precision are not threaded, so the evaluator fires the broader SAFETY referral across trimesters. Tier-S structural-safety (ESCALATE-AT-DUA) retained.',
    },
    'GAP-VHD-100': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-100-mech-valve-pregnancy-antixa',
      auditNote:
        'BUILT 2026-06-22 (T1-broader PART 2): SPEC_ONLY (data-blocked AUDIT-136) -> DET_OK. The anti-Xa data-block is lifted - anti_xa is now threaded BOTH-paths (LOINC 31159-7, NLM exact-verified). Purpose-built gap-vhd-100-mech-valve-pregnancy-antixa (mechanical valve Z95.2/Z95.4 + pregnancy + on LMWH enoxaparin 67108/dalteparin 67109/tinzaparin 69646 + anti-Xa outside 0.8-1.2 U/mL) -> dose adjustment. Class 1 (LOE B-NR); anti-Xa peak range 0.8-1.2 U/mL section-16-verified. Intentional non-redundant overlap with VHD-099 (which-anticoagulant strategy review) - VHD-100 is the distinct on-LMWH dose-titration action. Guarded by t1BroaderPart2.test.ts.',
    },
    'GAP-VHD-101': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit, AUDIT-136): PARTIAL -> SPEC_ONLY. VD-10 (gap-vd-10-pregnancy-risk) does not carry the VHD-101 near-term LMWH-restart + delivery-plan protocol; no genuine detection of the spec target. registryId dropped.',
    },
    // --- DET_OK -> SPEC_ONLY (baseline overrides failed) ---
    'GAP-VHD-010': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> SPEC_ONLY. The 2026-05-04 baseline DET_OK override (VD-2 gap-vd-2-bioprosthetic-echo) failed re-review under §16.6/§16.5 + clinical-code verification: VD-2 does not genuinely detect the VHD-010 spec target (underclaim governs). registryId dropped.',
    },
    'GAP-VHD-080': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> SPEC_ONLY. The 2026-05-04 baseline DET_OK override (VD-8 gap-vd-8-rheumatic-screen) failed re-review under §16.6/§16.5 + clinical-code verification: VD-8 does not genuinely detect the VHD-080 spec target (underclaim governs). registryId dropped.',
    },
    'GAP-VHD-103': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-103-severe-ar-surgical',
      auditNote:
        'UPDATED 2026-06-22 (T1-broader LVESD batch): PARTIAL -> DET_OK. The LVESD arm that held this at PARTIAL (per AUDIT-134) is now built. gap-vhd-103-severe-ar-surgical covers the LVEF <= 55% Class-1 arm; the companion gap-vhd-103b-severe-ar-lvesd-dilation (severe asymptomatic AR + preserved LVEF > 55 + LVESD > 50 -> AVR, Class 2a - the COR-correct fork, NOT folded into the Class-1 push) covers the LVESD > 50 mm arm. Both spec surgical triggers (LVESD >= 50 OR LVEF <= 55%) are now detected. gap-vhd-103b is retained as a regOrphan-for-lineage (no separate spec id; serves the GAP-VHD-103 LVESD arm). LVESD CSV-threaded (no clean LOINC, no-guess). Guarded by t1BroaderLvesd.test.ts.',
    },
    'GAP-VHD-060': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-060-ie-large-vegetation',
      auditNote:
        'BUILT 2026-06-22 (T1-broader PART 2): SPEC_ONLY -> DET_OK. Purpose-built gap-vhd-060-ie-large-vegetation (IE I33.0 + isolated mobile vegetation > 10 mm + no embolic event) -> early-surgery consideration. Class 2b (2020 ACC/AHA VHD / 2014 AHA IE): an isolated > 10 mm vegetation WITHOUT an embolic event is "surgery may be considered" (section-16); partitions from VHD-059 (recurrent-embolism-on-therapy, Class 2a) on !embolic - no double-fire. vegetation_size CSV-threaded (TEE, no clean LOINC). Guarded by t1BroaderPart2.test.ts.',
    },
    // --- v3.0 VHD build: newly DET_OK / PARTIAL (purpose-built evaluators, chunks 1-5, 2026-06-17) ---
    'GAP-VHD-006': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-006-mech-asa-adjunct',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 3 close): newly DET_OK. Purpose-built gap-vhd-006-mech-asa-adjunct (mechanical Z95.2/Z95.4 + warfarin + atherosclerotic disease I25/I70 + no ASA -> low-dose ASA adjunct). Genuinely detects the spec target (mechanical valve without ASA adjunct when indicated; "when indicated" = atherosclerotic disease).',
    },
    'GAP-VHD-057': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-057-ie-hf-surgery',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-057-ie-hf-surgery (acute IE I33.0 + heart failure I50 -> urgent surgery indication). Genuinely detects the dx-codable spec target (IE + new/worsening HF). Overlaps the SH-module SH-029 (lumped IE-surgery) - surfaced for operator reconciliation at the close.',
    },
    'GAP-VHD-059': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vhd-059-ie-embolic-surgery',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly PARTIAL. Purpose-built gap-vhd-059-ie-embolic-surgery (IE I33.0 + embolic event I74/I63 + on anticoagulation -> surgery consideration). Holds at PARTIAL per §16 underclaim-governs: the spec axis is "recurrent embolic event on abx" (antibiotic therapy for the IE); the evaluator gates on anticoagulation presence (a narrower/different therapy axis), so an IE+embolic patient not on anticoagulation is not detected. Overlaps SH-029 - surfaced for reconciliation.',
    },
    'GAP-VHD-064': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-064-prior-ie-dental-prophylaxis',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-064-prior-ie-dental-prophylaxis (prior IE I33.0/Z86.79 + dental encounter Z01.2x + no prophylaxis antibiotic -> highest-risk dental prophylaxis). Genuinely detects the spec target. Distinct from VHD-063/VD-14 (general prosthetic-valve dental prophylaxis): VHD-064 is the prior-IE-specific highest-risk condition.',
    },
    'GAP-VHD-083': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-083-rheumatic-af-warfarin',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 4 close): newly DET_OK. Purpose-built gap-vhd-083-rheumatic-af-warfarin (rheumatic I05-I09 + AF I48 + not on warfarin -> warfarin; DOAC-contraindicated SAFETY subgroup, switch-vs-start branch, INVICTUS). Genuinely detects the spec target. Overlaps VD-12 (GAP-VHD-077, general AF+valve OAC) + EP-008 (rheumatic-MS DOAC) - surfaced for operator reconciliation.',
    },
    'GAP-VHD-091': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-091-dopamine-agonist-valve-surveillance',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): newly DET_OK. Purpose-built gap-vhd-091-dopamine-agonist-valve-surveillance (cabergoline RxNorm 47579 / pergolide 8047 -> surveillance echo). Genuinely detects the at-risk-drug spec target. Surveillance interval (exposure-duration-dependent) is a documented Path-B refinement.',
    },
    'GAP-VHD-092': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-092-ergot-alkaloid-valve-surveillance',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 5 close): newly DET_OK. Purpose-built gap-vhd-092-ergot-alkaloid-valve-surveillance (ergotamine RxNorm 4025 / methysergide 6911 -> surveillance echo). Genuinely detects the at-risk-drug spec target. Surveillance interval (exposure-duration-dependent) is a documented Path-B refinement.',
    },
    'GAP-VHD-102': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-102-ar-surveillance',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-102-ar-surveillance (aortic regurgitation I35.1/I35.2 + no quantitative echo value on file -> surveillance imaging). Genuinely detects the spec target (AR without annual echo quantification).',
    },
    'GAP-VHD-104': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-104-mixed-valve-staging',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-104-mixed-valve-staging (>=2 of AS I35.0 / MS I34.0... / AR-MR valve lesions -> integrated multi-valve staging). Genuinely detects the spec target (combined/mixed valve disease without integrated staging).',
    },
    'GAP-VHD-105': {
      classification: 'DET_OK',
      registryId: 'gap-vhd-105-mr-quant-triangulation',
      auditNote:
        'MANUAL OVERRIDE 2026-06-17 (v3.0 VHD chunk 1 close): newly DET_OK. Purpose-built gap-vhd-105-mr-quant-triangulation (mitral I34.0 + regurg grade 2-3 + no EROA/vena-contracta on file -> quantitative triangulation). Genuinely detects the spec target (moderate MR by color/grade only without EROA + VC triangulation).',
    },
  },
  PV: {
    // --- PV chunk 0 (2026-06-18, feat/pv-chunk0-tightenings): AUDIT-178/179/180 ---
    // GAP-PV-003 DET_OK activated at the PV close (the chunk-0 forward-ref to gap-pv-003-abnormal-abi now resolves
    // because extractCode re-ran in this pipeline).
    'GAP-PV-003': {
      classification: 'DET_OK',
      registryId: 'gap-pv-003-abnormal-abi',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-179 RESOLVED): foundational build + re-cite. GAP-PV-003 ("Abnormal ABI <=0.90 without coded PAD") was MIScited by fuzzy name-match to gap-pv-3-antiplatelet (a different concept); no rule read an ABI VALUE threshold. Built gap-pv-003-abnormal-abi (abi_left/abi_right <= 0.90 + !hasPAD; ABI threaded both paths). The >1.40 non-compressible case is routed to PV-004 (not conflated). PARTIAL -> DET_OK.',
    },
    'GAP-PV-015': {
      classification: 'DET_OK',
      registryId: 'gap-pv-6-diabetes-control',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-6 previously fired on hba1c===undefined (existence-proxy, always-fire). Tightened to a real threshold (hba1c !== undefined && hba1c >= 7.0%, the standard ADA/ACC glycemic target) so only above-target patients fire. Holds DET_OK, now genuinely gated.',
    },
    'GAP-PV-033': {
      classification: 'DET_OK',
      registryId: 'gap-pv-12-renal-artery',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-12 (resistant HTN -> renal-artery workup) previously fired without confirming resistant HTN. Tightened to require >= 3 concurrent antihypertensive classes (RAAS + beta-blocker + CCB + diuretic), the operational resistant-HTN definition. Holds DET_OK, now genuinely gated.',
    },
    'GAP-PV-071': {
      classification: 'DET_OK',
      registryId: 'gap-pv-varicose',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED over-credit tightening): PV-VARICOSE (spec = CEAP 3+ symptomatic) previously fired on bare I83 (incl asymptomatic I83.9). Tightened to the complicated/symptomatic subcodes I83.0/I83.1/I83.2/I83.8 (ulcer / inflammation / pain), excluding I83.9. Holds DET_OK.',
    },
    'GAP-PV-076': {
      classification: 'DET_OK',
      registryId: 'gap-pv-anticoag-vte',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-179 RESOLVED code-mismatch fix): PV-ANTICOAG-VTE (spec = post-PE anticoagulation duration) fired ONLY on I82 (DVT), MISSING the PE population (I26) entirely. Added I26 (PE) so the gap detects its spec population; I82 retained (VTE duration review applies to both). Holds DET_OK.',
    },
    'GAP-PV-098': {
      classification: 'DET_OK',
      registryId: 'gap-pv-graft-surveillance',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-178 RESOLVED interval build): PV-GRAFT-SURVEILLANCE previously fired on graft_duplex_months===undefined (existence-proxy). Added a genuine interval comparison (overdue when > 12 months OR never documented); graft_duplex_months IS threaded so a recently-surveilled patient (<= 12 mo) now gates out. Holds DET_OK.',
    },
    // --- PV-BYPASS-EVAL over-match reconcile (AUDIT-180): one generic bypass-eval rule was cited for 3 distinct
    //     CLTI / iliac decision gaps. Keep PV-017 (BEST-CLI heart-team, the closest match); demote the 2 over-matches. ---
    'GAP-PV-018': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-180): PARTIAL -> SPEC_ONLY. GAP-PV-018 ("CLTI endovascular vs surgical decision, BEST-CLI") was over-matched to the generic gap-pv-bypass-eval rule, which does not encode the endovascular-vs-surgical decision logic (needs anatomic / conduit data not threaded). Cite dropped; PV-017 retains the bypass-eval cite.',
    },
    'GAP-PV-024': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 0, AUDIT-180): PARTIAL -> SPEC_ONLY. GAP-PV-024 ("TASC II C/D iliac: endovascular vs surgical bypass") was over-matched to the generic gap-pv-bypass-eval rule, which has no TASC II lesion-class or iliac-specific signal (anatomic data not threaded). Cite dropped; PV-017 retains the bypass-eval cite.',
    },
    // --- PV chunk 1 (2026-06-18): 7 buildable SPEC_ONLY -> built. 4 DET_OK + 3 PARTIAL (honest underclaim where a
    //     central spec qualifier is not codable/threaded). ---
    'GAP-PV-004': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-pv-004-noncompressible-abi',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-004-noncompressible-abi (ABI >1.40 either leg -> non-compressible -> toe-brachial index). Completes the PV-003/004 ABI pair (disjoint ranges, no double-fire). PARTIAL not DET_OK: the spec qualifier "without TBI" is not threaded (TBI is not an ingested observation), so the rule fires on the non-compressible ABI alone and cannot confirm a TBI was not already done.',
    },
    'GAP-PV-034': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-pv-034-fmd-screening',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-034-fmd-screening (HTN + age<35 + female + !I77.3). The population gate is fully threaded, but the spec qualifier "without FMD imaging screening" is proxied by diagnosis-absence (!I77.3) - a patient screened-and-negative (no I77.3 coded) would still fire - so PARTIAL not DET_OK. I77.3 NLM-verified.',
    },
    'GAP-PV-038': {
      classification: 'DET_OK',
      registryId: 'gap-pv-038-takayasu-immunosuppression',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-038-takayasu-immunosuppression (M31.4 + NOT on glucocorticoid or steroid-sparing, canonical RXNORM_CORTICOSTEROIDS/STEROID_SPARING). Dx + med gate both threaded; the "active" disease-activity qualifier is a documented Path-B refinement (ESR/CRP/imaging not threaded), per the CAD-022 DET_OK-with-Path-B precedent. M31.4 NLM-verified.',
    },
    'GAP-PV-040': {
      classification: 'DET_OK',
      registryId: 'gap-pv-040-gca-steroid',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-040-gca-steroid (M31.5/M31.6 + NOT on a glucocorticoid). Dx + med gate both threaded; vision-symptom acuity is a Path-B refinement. Distinct from PV-038 (Takayasu M31.4 - no code overlap). M31.5/M31.6 NLM-verified; tocilizumab (GiACTA) named in the recommendation.',
    },
    'GAP-PV-041': {
      classification: 'DET_OK',
      registryId: 'gap-pv-041-buerger-cessation',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-041-buerger-cessation (I73.1 + active tobacco use F17.*/Z72.0). Both signals threaded - clean gate. Subgroup: cessation-is-treatment (disease-modifying in Buerger), distinct from generic PAD cessation (PV-4). I73.1 NLM-verified.',
    },
    'GAP-PV-058': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-pv-058-symptomatic-carotid-revasc',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> PARTIAL. Built gap-pv-058-symptomatic-carotid-revasc (I65.2x + recent I63/G45). The SYMPTOMATIC gate (I63/G45) is threaded and precise (asymptomatic gates out - the standing subgroup-check), but the spec target severity ">=70%" is NOT codable from ICD-10 (I65.2x carries no percentage) and the 2-week timing is not threaded, so the rule fires on symptomatic stenosis of any severity -> PARTIAL. I65.21/22/23/29, I63, G45 NLM-verified.',
    },
    'GAP-PV-062': {
      classification: 'DET_OK',
      registryId: 'gap-pv-062-intracranial-stenosis-medical',
      auditNote:
        'MANUAL OVERRIDE 2026-06-18 (PV chunk 1): SPEC_ONLY -> DET_OK. Built gap-pv-062-intracranial-stenosis-medical (I67.2 + recent I63/G45 + NOT on antiplatelet OR NOT on statin). Dx + event + antithrombotic/statin absence all threaded (coarse but genuine gate); dual-vs-single antiplatelet and statin intensity are documented Path-B refinements. Subgroup: aggressive MEDICAL therapy, NOT stenting (SAMMPRIS). I67.2 NLM-verified.',
    },
    // --- PV chunk 1 Path-B (blocked-pile): 3 of the banked audit "~10 buildable" over-assumed threading; held
    //     SPEC_ONLY (NOT built) - the always-fire-proxy avoidance, same class as the CAD-chunk-1 ApoB catch. ---
    'GAP-PV-021': {
      classification: 'SPEC_ONLY',
      auditNote:
        'PATH-B (PV chunk 1, blocked-pile): NOT built. WIfI staging needs wifi_score, which exists ONLY as a type:string column in csvSchema.ts and is NOT wired to labValues (Record<string,number>, populated from the patientWriter labFields allowlist) - so labValues[\'wifi_score\'] is always undefined and a rule on it would always-fire (the AUDIT-177 over-credit anti-pattern). Unblock: a threading PR (AUDIT-070 class) that maps WIfI to a numeric/staged observation.',
    },
    'GAP-PV-037': {
      classification: 'SPEC_ONLY',
      auditNote:
        'PATH-B (PV chunk 1, blocked-pile): NOT built. Takayasu serial ESR/CRP monitoring needs ESR/CRP values, but NEITHER is threaded (no observationService FHIR LOINC->slug mapping and not in the CSV labFields allowlist) - labValues[\'crp\']/[\'esr\'] are always undefined, so a value-gated rule cannot work and an existence-proxy would always-fire. Unblock: a threading PR (AUDIT-070 class) mapping ESR + CRP LOINCs both paths.',
    },
    'GAP-PV-060': {
      classification: 'SPEC_ONLY',
      auditNote:
        'PATH-B (PV chunk 1, blocked-pile): NOT built. Post-CEA/CAS secondary prevention needs to identify post-carotid-revascularization patients, but there is NO clean post-carotid-revasc ICD-10 code (Z95.820 = peripheral angioplasty status, not carotid; CEA leaves no implant code). Unblock: a procedure/CPT signal (CPT 35301 CEA / 37215-37216 CAS) once procedure threading lands (code-floor), OR a Z-code convention.',
    },
    // --- T0 net-new batch (2026-06-19): 4 PV pharmacotherapy gaps, dx+med only, all codes NLM/RxNav-verified ---
    'GAP-PV-042': { classification: 'DET_OK', registryId: 'gap-pv-042-behcet-vascular', auditNote: 'BUILT 2026-06-19 (T0 net-new): Behcet (M35.2) + vascular thrombosis (I82/I80) + no immunosuppression -> disease control (immunosuppression primary, not anticoag alone). EULAR 2018, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-PV-081': { classification: 'DET_OK', registryId: 'gap-pv-081-cteph-riociguat', auditNote: 'BUILT 2026-06-19 (T0 net-new): CTEPH (I27.24 - NLM exact-code-verified, the spec original; an earlier mis-correction to I27.22=left-heart-PH was caught) + no riociguat (1439816). Path-B operability. CHEST-1, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-PV-084': { classification: 'DET_OK', registryId: 'gap-pv-084-pah-combination', auditNote: 'BUILT 2026-06-19 (T0 net-new): Group-1 PAH (I27.0/I27.21) + not on ERA(358274/75207/1442132)+PDE5i(136411/358263) combination. AMBITION, Class 1. SPEC_ONLY -> DET_OK.' },
    'GAP-PV-085': { classification: 'DET_OK', registryId: 'gap-pv-085-pah-sotatercept', auditNote: 'BUILT 2026-06-19 (T0 net-new): Group-1 PAH on background ERA+PDE5i + no sotatercept (2678930). No double-fire with PV-084 (mutually exclusive). STELLAR, Class 2a. SPEC_ONLY -> DET_OK.' },
  },
};

function applyOverrides(module: ModuleCode, targetPath: string, codePath: string, allCodes: Map<ModuleCode, CodeExtract>): { applied: number; demoted: number } {
  const xw = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as Crosswalk;
  const overrides = OVERRIDES[module];
  if (!overrides || Object.keys(overrides).length === 0) {
    return { applied: 0, demoted: 0 };
  }

  let applied = 0;
  let demoted = 0;

  // Build registry lookup including cross-module
  const registryByModule = new Map<ModuleCode, Map<string, { line: number }>>();
  for (const [mod, code] of allCodes) {
    const m = new Map<string, { line: number }>();
    for (const r of code.registry) m.set(r.id, { line: r.registryLine });
    registryByModule.set(mod, m);
  }

  // Build evaluator lookup including cross-module
  const evalByModuleAndRegistry = new Map<string, { name: string; bodyStartLine: number; bodyEndLine: number }>();
  for (const [mod, code] of allCodes) {
    // Need reconciliation matches to map registry→evaluator. Load reconciliation here.
    const reconPath = path.join(path.dirname(targetPath), `${mod}.reconciliation.json`);
    if (!fs.existsSync(reconPath)) continue;
    const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
    const blockByName = new Map<string, { name: string; bodyStartLine: number; bodyEndLine: number }>();
    for (const b of code.evaluatorBlocks) {
      blockByName.set(b.name, { name: b.name, bodyStartLine: b.bodyStartLine, bodyEndLine: b.bodyEndLine });
    }
    for (const m of recon.matches) {
      const ev = blockByName.get(m.evaluatorBlockName);
      if (ev) evalByModuleAndRegistry.set(`${mod}::${m.registryId}`, ev);
    }
    // Also map registry-orphan-but-evaluator-present (e.g., VD-PANNUS has evaluator in module but
    // similarity matching may not have paired; we include direct name match for overrides)
    for (const ev of blockByName.values()) {
      // Allow override to reference by evaluator name directly via a synthetic key
      evalByModuleAndRegistry.set(`${mod}::block::${ev.name}`, ev);
    }
  }

  const newRows = xw.rows.map((row) => {
    const ovr = overrides[row.specGapId];
    if (!ovr) return row;

    applied++;
    const evalMod = ovr.evaluatorModule ?? module;

    let ruleBodyCite: RuleBodyCite | null = null;
    if (ovr.classification !== 'SPEC_ONLY' && ovr.registryId) {
      const reg = registryByModule.get(evalMod)?.get(ovr.registryId);
      const ev = evalByModuleAndRegistry.get(`${evalMod}::${ovr.registryId}`);
      if (reg && ev) {
        ruleBodyCite = {
          registryId: ovr.registryId,
          registryLine: reg.line,
          evaluatorBlockName: ev.name,
          evaluatorBodyLineRange: [ev.bodyStartLine, ev.bodyEndLine],
          evaluatorModule: evalMod,
        };
      } else if (reg) {
        // Registry exists but no evaluator match in reconciliation; try direct evaluator-name lookup if registry id ends with the evaluator name pattern
        const code = allCodes.get(evalMod);
        if (code) {
          // Heuristic: find evaluator block whose name is a suffix of the registryId (e.g., gap-vd-prosthetic-pannus → VD-PANNUS)
          const candidate = code.evaluatorBlocks.find((b) =>
            ovr.registryId!.toLowerCase().includes(b.name.toLowerCase().replace(/-/g, '-')),
          );
          if (candidate) {
            ruleBodyCite = {
              registryId: ovr.registryId,
              registryLine: reg.line,
              evaluatorBlockName: candidate.name,
              evaluatorBodyLineRange: [candidate.bodyStartLine, candidate.bodyEndLine],
              evaluatorModule: evalMod,
            };
          }
        }
      }
    }

    if (ovr.classification !== 'SPEC_ONLY' && !ruleBodyCite) {
      // Cite couldn't be reconstructed from override metadata — demote to SPEC_ONLY rather than emit invalid row
      demoted++;
      return {
        ...row,
        classification: 'SPEC_ONLY' as Classification,
        ruleBodyCite: null,
        auditNotes: `${ovr.auditNote} | DEMOTE TO SPEC_ONLY: registryId "${ovr.registryId}" found but evaluator block could not be paired; cite would be invalid. Investigate.`,
      };
    }

    return {
      ...row,
      classification: ovr.classification,
      ruleBodyCite,
      auditNotes: ovr.auditNote,
      inferredSafetyTag: ovr.inferredSafetyTag ?? row.inferredSafetyTag,
      inferredSafetyRationale: ovr.inferredSafetyRationale ?? row.inferredSafetyRationale,
    };
  });

  const updated: Crosswalk = { ...xw, rows: newRows };
  fs.writeFileSync(targetPath, stableStringify(updated));

  return { applied, demoted };
}

function main(): void {
  let mod: ModuleCode | undefined;
  let all = false;
  let useCandidate = false; // AUDIT-041: default is canonical; --candidate opts in to legacy verifyDraft workflow
  let inputDir = CANONICAL_OUTPUT_DIR;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--module' && process.argv[i + 1]) {
      mod = process.argv[i + 1].toUpperCase() as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--candidate') {
      useCandidate = true;
    } else if (a === '--input' && process.argv[i + 1]) {
      inputDir = path.resolve(process.argv[i + 1]);
      i++;
    }
  }
  if (!mod && !all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  // Load all code extracts for cross-module override support
  const allCodes = new Map<ModuleCode, CodeExtract>();
  for (const cfg of MODULE_CONFIGS) {
    const cp = path.join(inputDir, `${cfg.code}.code.json`);
    if (fs.existsSync(cp)) allCodes.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
  }

  const targets = all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === mod);
  const targetSuffix = useCandidate ? 'crosswalk.candidate.json' : 'crosswalk.json';
  console.log(`=== applyOverrides.ts (${useCandidate ? 'candidate' : 'canonical'}) ===`);
  for (const cfg of targets) {
    const targetPath = path.join(inputDir, `${cfg.code}.${targetSuffix}`);
    const codePath = path.join(inputDir, `${cfg.code}.code.json`);
    if (!fs.existsSync(targetPath)) {
      console.error(`  ${cfg.code}: SKIPPED — no ${useCandidate ? 'candidate' : 'canonical'} file at ${targetPath}`);
      continue;
    }
    const { applied, demoted } = applyOverrides(cfg.code, targetPath, codePath, allCodes);
    console.log(`  ${cfg.code}: applied=${applied} demoted=${demoted} (out of ${Object.keys(OVERRIDES[cfg.code] ?? {}).length} configured)`);
  }
}

if (require.main === module) {
  main();
}
