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
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-valve-in-valve',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(i) concept-match / AUDIT-123. SH-VALVE-IN-VALVE gates on Z95.2 treated as bioprosthetic, but per NLM Z95.2 = prosthetic/mechanical and Z95.3 = xenogenic/bioprosthetic (inverted codebase-wide), so the ViV rule misses real bioprosthetic (Z95.3) and false-fires on mechanical. Data-coupled defect flips to PARTIAL per the AUDIT-118 precedent. Evaluator retained; PARTIAL until AUDIT-123 remediated (correct Z95.2/Z95.3 semantics).',
    },
    'GAP-SH-011': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-6-post-tavr-followup',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 2): DET_OK -> PARTIAL per 16.6(i) concept-match / AUDIT-123. SH-6 post-TAVR surveillance rests on the same inverted Z95.2/Z95.3 valve-type semantics (Z95.2 mechanical mislabeled bioprosthetic), so it misses real bioprosthetic (Z95.3) and false-fires on mechanical. Data-coupled defect -> PARTIAL per the AUDIT-118 precedent. Evaluator retained; PARTIAL until AUDIT-123 remediated.',
    },
    'GAP-SH-064': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-11-tmvr',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 3): DET_OK -> PARTIAL per 16.6(iii) severity-encoding / AUDIT-125. SH-11 (TMVR) gates I34.0 + age>80 with no echo-severity threshold (EROA / regurgitant volume), but the gap targets severe MR, so it over-detects sub-threshold (mild) mitral regurg. Severity IS echo-encoded in labValues and the rule ignores it -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-125 remediated (add the lesion-appropriate echo-severity gate).',
    },
    'GAP-SH-022': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-4-tricuspid-assessment',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 3): DET_OK -> PARTIAL per 16.6(iii) severity-encoding / AUDIT-125. SH-4 gates I36.1 + right-heart symptoms with no TR-severity threshold, but the gap targets severe/torrential TR, so it over-detects sub-threshold lesions; the transcatheter-tricuspid recommendation is also under-anchored. -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-125 remediated (add severity gate + re-anchor).',
    },
    'GAP-SH-026': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-9-pfo-closure',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> PARTIAL per 16.6(ii) over-detection / AUDIT-127. SH-9 fires on I63.9 + age<60 + Q21.1 with no coded stroke-etiology exclusion; the rule own evidence object names "alternative stroke etiology" as an exclusion but the match logic never checks it, so it over-fires on non-cryptogenic (e.g. AF-cardioembolic) strokes. Partial overlap (true cryptogenic still caught) -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-127 remediated (add the coded etiology exclusion the evidence already names).',
    },
    'GAP-SH-027': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-asd-closure',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (SH audit Batch 4, STEP-0): DET_OK -> PARTIAL per 16.5 under-detection / AUDIT-128. SH-ASD gates significance on I50.81 (right heart failure), but the gap significance signals are RV size + Qp:Qs + PASP; RV failure is a late proxy, so a significant ASD with RV dilation or PASP elevation but not yet RV failure is missed. Under-detection -> PARTIAL. Evaluator retained; PARTIAL until AUDIT-128 remediated (gate on RV size / Qp:Qs / PASP echo signals).',
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
      registryId: 'gap-vd-11-bioprosthetic-degeneration',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-11 (gap-vd-11-bioprosthetic-degeneration) is a broad bioprosthetic-degeneration rule; PARTIAL per §3.2.1 because the broad rule lacks the gap-specific discrimination the spec wants. Evaluator retained.',
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
      registryId: 'gap-vd-prosthetic-pannus',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold (T1). VD-PANNUS (gap-vd-prosthetic-pannus) covers symptom-driven prosthetic valve dysfunction; spec VHD-068 wants gradient-rise >=50% from baseline specifically, so PARTIAL per §3.2.1. Evaluator retained.',
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
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-10-pregnancy-risk',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): PARTIAL hold. VD-10 (gap-vd-10-pregnancy-risk) is a broad pregnancy + valve-risk rule partially covering VHD-098; PARTIAL per §3.2.1. Siblings VHD-099/100/101 downgraded to SPEC_ONLY (AUDIT-136) because the broad rule does not carry their gap-specific protocols. Evaluator retained.',
    },
    // --- PARTIAL -> SPEC_ONLY downgrades (registryId dropped per §16.6(ii)) ---
    'GAP-VHD-001': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit, AUDIT-133): PARTIAL -> SPEC_ONLY. The prior cite (VD-3 gap-vd-3-inr-monitoring) does not detect the VHD-001 target: VD-3 fires on no-INR-data and the mechanical-valve anticoag rule fires on no-warfarin, so a mechanical-valve patient on warfarin with INR below target fires neither rule (zero true-positive overlap). Per §16.6(ii) disjoint-target -> SPEC_ONLY; registryId dropped.',
    },
    'GAP-VHD-017': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-2): PARTIAL -> SPEC_ONLY. The prior VD-11 (gap-vd-11-bioprosthetic-degeneration) consolidation cite does not genuinely detect the VHD-017 spec target (underclaim governs; coverage incidental, not the spec target). registryId dropped.',
    },
    'GAP-VHD-079': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-3): PARTIAL -> SPEC_ONLY. The prior VD-TRICUSPID-SECONDARY (gap-vd-tricuspid-secondary) cite is a miscite - the rule does not detect the VHD-079 spec target. Per §16.6(ii) / §1 rule-body verification, miscite with no genuine overlap -> SPEC_ONLY; registryId dropped.',
    },
    'GAP-VHD-088': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit Batch 5, D-B5-4): PARTIAL -> SPEC_ONLY. The prior VD-PULMONARY-HTN (gap-vd-pulmonary-htn) cite is a miscite - the rule does not detect the VHD-088 spec target. Per §16.6(ii) / §1, miscite with no genuine overlap -> SPEC_ONLY; registryId dropped.',
    },
    'GAP-VHD-099': {
      classification: 'SPEC_ONLY',
      inferredSafetyTag: 'STRUCTURAL_SAFETY',
      inferredSafetyRationale:
        'Mechanical valve + pregnancy 1st trimester: warfarin >5mg/day is teratogenic (warfarin embryopathy) without the spec LMWH-transition protocol; uncovered T1 maternal-fetal safety gap. Structurally-inferred SAFETY (spec carries no SAFETY tag); operator-decided Tier-S ESCALATE-AT-DUA.',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit, AUDIT-136): PARTIAL -> SPEC_ONLY. VD-10 (gap-vd-10-pregnancy-risk) is a broad pregnancy + valve-risk rule and does not carry the VHD-099 1st-trimester LMWH dose-transition protocol (warfarin >5mg/day); no genuine detection of the spec target. registryId dropped. Tier-S structural-safety (ESCALATE-AT-DUA).',
    },
    'GAP-VHD-100': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit, AUDIT-136): PARTIAL -> SPEC_ONLY. VD-10 (gap-vd-10-pregnancy-risk) does not carry the VHD-100 anti-Xa monitoring protocol (peak anti-Xa 0.8-1.2 on LMWH); no genuine detection of the spec target. registryId dropped.',
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
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE 2026-06-10 (VHD audit): DET_OK -> SPEC_ONLY. The 2026-05-04 baseline DET_OK override (VD-5 gap-vd-5-aortic-regurgitation) failed re-review under §16.6/§16.5 + clinical-code verification: VD-5 does not genuinely detect the VHD-103 spec target (underclaim governs). registryId dropped.',
    },
  },
  PV: {},
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
