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
    'GAP-HF-073': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE: auto-classifier matched HF-073 (radiation cardiomyopathy) to VD-RADIATION cross-module evaluator. FALSE POSITIVE — VD-RADIATION covers radiation valve disease, different clinical scenario. HF-073 has no in-module or cross-module evaluator coverage. SPEC_ONLY.',
    },
    'GAP-HF-151': {
      classification: 'SPEC_ONLY',
      auditNote:
        'MANUAL OVERRIDE: auto-classifier matched HF-151 (post-cardiac-transplant HF) to CAD-CARDIAC-TRANSPLANT-CAD cross-module evaluator. FALSE POSITIVE — CAD evaluator covers cardiac allograft vasculopathy (CAV; post-transplant CAD), distinct from HF graft dysfunction. HF-151 has no specific evaluator coverage. SPEC_ONLY.',
    },
  },
  EP: {
    // EP audit 2026-06-08 (operator-approved): 13 DET_OK -> PARTIAL_DETECTION flips. 12 are the
    // AUDIT-118 / §16.5 medication-match modifier (exact-RxCUI membership, no ingredient->descendant
    // expansion against product-coded data); 1 is AUDIT-120 (Z88 over-broad). Each retains its evaluator
    // (registryId) so the rule-body cite is preserved; the cap is PARTIAL until AUDIT-117/118/120 remediate.
    'GAP-EP-001': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-oac-afib',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per AUDIT_METHODOLOGY.md §16.5 / AUDIT-118. EP-OAC tests OAC presence by exact-RxCUI membership (OAC_CODES) with no ingredient->descendant expansion, so SCD/product-coded patient meds under-detect; the DABIGATRAN code (1037045) is also a single 150mg SCD not the ingredient (AUDIT-117). Evaluator retained; PARTIAL until AUDIT-117/118 remediated.',
    },
    'GAP-EP-006': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-006-dabigatran-renal-safety',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per §16.5 / AUDIT-117 + AUDIT-118. The Class-3-Harm dabigatran renal-safety rule triggers on medCodes.includes(1037045) = dabigatran 150mg SCD (not the ingredient, AUDIT-117) and matches with no ingredient->descendant expansion, so dabigatran 75mg (renal-impairment dose) + eGFR<30 - the precise contraindication - is a false-negative. Evaluator retained; PARTIAL until AUDIT-117/118 remediated. (Prior 2026-05-05 AUDIT-032 logic closure stands; trustworthiness capped by the matching defect.)',
    },
    'GAP-EP-007': {
      classification: 'DET_OK',
      registryId: 'gap-vd-6-doac-mechanical-valve',
      evaluatorModule: 'VHD',
      auditNote:
        'UN-CAP 2026-06-14 PARTIAL -> DET_OK: AUDIT-118 remediated (fix 125f033; expandToIngredients ingredient-normalization at the runner construction points). VHD VD-6 (DOAC + mechanical valve, Class 3 Harm) now detects product-coded (SCD/SBD) DOAC meds - a mechanical-valve patient on an apixaban SCD fires the contraindication. Proof: backend/tests/gapRules/audit118CascadeFlip.test.ts (raw SCD misses -> expanded fires). Was: MANUAL OVERRIDE 2026-06-08 DET_OK -> PARTIAL per §16.5 / AUDIT-118 (exact-RxCUI membership, no expansion).',
    },
    'GAP-EP-013': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-early-rhythm',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 2): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-EARLY-RHYTHM tests rhythm-control (AAD) presence by exact-RxCUI membership (RHYTHM_CONTROL_CODES_ER) with no expansion, so SCD-coded AAD meds read as not-on-rhythm-control. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
    },
    'GAP-EP-017': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-017-hfref-non-dhp-ccb',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 2): DET_OK -> PARTIAL per §16.5 / AUDIT-118. The Class-3-Harm HFrEF + non-DHP-CCB SAFETY rule matches diltiazem/verapamil ingredient-exact (NON_DHP_CCB_CODES) with no expansion, so SCD-coded CCB meds under-detect. Evaluator retained; PARTIAL until AUDIT-118 remediated. (Prior 2026-05-05 AUDIT-033 logic closure stands.)',
    },
    'GAP-EP-024': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-lqts-bb',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 3): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-LQTS-BB tests beta-blocker presence (BB_CODES_LQTS) ingredient-exact with no expansion, so a LQTS patient on an SCD-coded beta-blocker false-fires "BB not prescribed." Evaluator retained; PARTIAL until AUDIT-118 remediated.',
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
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-pfa',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 2): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-PFA tests AAD presence (AAD_CODES) ingredient-exact with no expansion. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
    },
    'GAP-EP-079': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-079-wpw-af-avn-blocker',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 2): DET_OK -> PARTIAL per §16.5 / AUDIT-118. The CRITICAL WPW+AF AVN-blocker rule matches medCodes via AVN_BLOCKER_CODES_EP079, a MIXED set: digoxin is descendant-enumerated (exempt) but the 8 beta-blockers + 2 non-DHP CCBs are ingredient-only, so a WPW+AF patient on an SCD-coded BB/CCB under-detects the fatal-VF contraindication. Evaluator retained; PARTIAL until AUDIT-118 remediated. (Prior 2026-05-05 AUDIT-031 logic closure stands; all 14 codes RxNav-verified.)',
    },
    'GAP-EP-011': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-laac',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 5): DET_OK -> PARTIAL per AUDIT-120 (over-detection, distinct from §16.5). EP-LAAC uses dxCodes.startsWith(Z88) as an OAC-contraindication, but ICD-10 Z88 is "Allergy status" to any drug class, so the LAAC gap over-fires on any AF + age>=65 patient with any drug allergy (e.g. penicillin). Evaluator retained; PARTIAL until AUDIT-120 remediated (narrow or drop Z88).',
    },
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
