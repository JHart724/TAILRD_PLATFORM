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

const OVERRIDES: Record<ModuleCode, Record<string, Override>> = {
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
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-6-doac-mechanical-valve',
      evaluatorModule: 'VHD',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per §16.5 / AUDIT-118. Cross-module satisfaction by VHD VD-6 (DOAC + mechanical valve, Class 3 Harm) is intact, but the DOAC match is exact-RxCUI membership with no ingredient expansion, so product-coded DOAC meds under-detect the contraindication. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
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
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-AMIODARONE-MONITOR (TSH) tests amiodarone presence (703) ingredient-exact with no expansion, so SCD-coded amiodarone under-detects. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
    },
    'GAP-EP-044': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-AMIODARONE-MONITOR (LFT) tests amiodarone presence (703) ingredient-exact with no expansion. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
    },
    'GAP-EP-045': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-amiodarone-monitor',
      auditNote:
        'MANUAL OVERRIDE per EP addendum line 179: GAP-EP-045 (Amiodarone baseline PFT/CXR) covered partially by EP-AMIODARONE-MONITOR evaluator. PARTIAL per §3.2.1: combined rule covers TSH/LFT but not PFT/CXR baseline screening that spec specifies.',
    },
    'GAP-EP-046': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-dronedarone',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 2): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-DRONEDARONE (SAFETY) tests dronedarone presence (233698) ingredient-exact with no expansion, so SCD-coded dronedarone under-detects the NYHA III/IV contraindication. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
    },
    'GAP-EP-048': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-ep-dofetilide-rems',
      auditNote:
        'MANUAL OVERRIDE 2026-06-08 (EP audit Batch 1): DET_OK -> PARTIAL per §16.5 / AUDIT-118. EP-DOFETILIDE-REMS tests dofetilide presence (49247) ingredient-exact with no expansion. Evaluator retained; PARTIAL until AUDIT-118 remediated.',
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
  SH: {},
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
    'GAP-VHD-010': {
      classification: 'DET_OK',
      registryId: 'gap-vd-2-bioprosthetic-echo',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §5 (Bioprosthetic Valve subcategory): bioprosthetic valve annual echo surveillance covered by gap-vd-2-bioprosthetic-echo evaluator at line 4952+. Auto-classifier missed because spec uses "Bioprosthetic Valve Surveillance" and evaluator block name is "VD-2" (numeric pattern) — token-similarity heuristic insufficient.',
    },
    'GAP-VHD-011': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-11-bioprosthetic-degeneration',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation. gap-vd-11-bioprosthetic-degeneration consolidates VHD-011 + VHD-016 + VHD-017. Per §3.2.1 broad-rule rule, each gap classifies as PARTIAL_DETECTION because spec wants gap-specific discrimination the broad rule does not carry. Auto-classifier missed because vocabulary mismatch (spec "structural valve deterioration" vs evaluator "Bioprosthetic Valve Degeneration Watch").',
    },
    'GAP-VHD-016': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-11-bioprosthetic-degeneration',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-11-bioprosthetic-degeneration (also covers VHD-011, VHD-017). PARTIAL per §3.2.1. Auto-classifier vocabulary mismatch.',
    },
    'GAP-VHD-017': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-11-bioprosthetic-degeneration',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-11-bioprosthetic-degeneration (also covers VHD-011, VHD-016). PARTIAL per §3.2.1. Auto-classifier vocabulary mismatch.',
    },
    'GAP-VHD-024': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-sh-2-tavr-eval',
      evaluatorModule: 'SH',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(b): cross-module satisfaction. gap-sh-2-tavr-eval (registered to SH module, line 4923+) provides VHD-024 partial coverage (severe AS AVR vs TAVR). Auto-classifier picked SH-ROSS as cross-module match instead — vocabulary collision on "AS" tokens. Architectural fragility documented at AUDIT-027 expanded scope.',
    },
    'GAP-VHD-063': {
      classification: 'DET_OK',
      registryId: 'gap-vd-14-dental-prophylaxis',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §5 (IE Prophylaxis subcategory): dental prophylaxis covered by gap-vd-14-dental-prophylaxis evaluator at line 6332+. Auto-classifier missed because spec text uses "infective endocarditis prophylaxis dental procedure" and evaluator name is "VD-14" (numeric pattern).',
    },
    'GAP-VHD-068': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-prosthetic-pannus',
      auditNote:
        'MANUAL OVERRIDE: VD-PANNUS evaluator at line 10414+ (pattern ID_NAME) was missed by prior 2026-05-04 single-pattern audit (cited as registry-only) AND by auto-classifier (no token overlap with "gradient rise"). Multi-pattern extraction in Phase 2 surfaced VD-PANNUS evaluator with body covering symptomatic prosthetic valve dysfunction. Spec-VHD-068 wants gradient-rise specifically (>=50% from baseline); evaluator covers symptom-driven detection. PARTIAL per §3.2.1 (broad-rule lacks discrimination). UPGRADES from prior SPEC_ONLY classification — Tier S triage queue inclusion may revise.',
    },
    'GAP-VHD-077': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-12-af-valve-anticoag',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): gap-vd-12-af-valve-anticoag covers AF + valve disease anticoagulation; partial coverage of VHD-077. PARTIAL because broad rule fires for AF+valve combination but spec-VHD-077 wants discrimination.',
    },
    'GAP-VHD-080': {
      classification: 'DET_OK',
      registryId: 'gap-vd-8-rheumatic-screen',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §5 (Rheumatic subcategory): screening covered by gap-vd-8-rheumatic-screen evaluator at line 5371+. Auto-classifier missed (numeric pattern naming).',
    },
    'GAP-VHD-098': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-10-pregnancy-risk',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation. gap-vd-10-pregnancy-risk consolidates VHD-098 + VHD-099 + VHD-100 + VHD-101. PARTIAL per §3.2.1.',
    },
    'GAP-VHD-100': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-10-pregnancy-risk',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-10-pregnancy-risk (also covers VHD-098, VHD-099, VHD-101). PARTIAL per §3.2.1.',
    },
    'GAP-VHD-101': {
      classification: 'PARTIAL_DETECTION',
      registryId: 'gap-vd-10-pregnancy-risk',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §4.6(c): broad-rule consolidation via gap-vd-10-pregnancy-risk (also covers VHD-098, VHD-099, VHD-100). PARTIAL per §3.2.1.',
    },
    'GAP-VHD-103': {
      classification: 'DET_OK',
      registryId: 'gap-vd-5-aortic-regurgitation',
      auditNote:
        'MANUAL OVERRIDE per VHD addendum §5 (Valve Progression / Mixed subcategory): AR surveillance covered by gap-vd-5-aortic-regurgitation evaluator at line 5282+. Auto-classifier missed (numeric naming pattern).',
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
