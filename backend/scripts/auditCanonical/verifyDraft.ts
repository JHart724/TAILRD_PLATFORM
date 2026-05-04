/**
 * verifyDraft.ts — auto-classify crosswalk draft rows against extracts per §3.2.
 *
 * For each spec gap, finds candidate evaluator block(s) by:
 *   1. ICD/RxNorm code overlap between spec.detectionLogic and evaluator body
 *   2. Token similarity between spec.name and evaluator commentLiteral
 *   3. Subcategory match
 *
 * Produces candidate classifications + cites. Each row gets a verifyConfidence
 * 0.0-1.0 indicating how mechanical the classification is. Rows with low confidence
 * surface for manual operator review.
 *
 * Output: <MODULE>.crosswalk.candidate.json (intermediate; operator promotes to
 * .crosswalk.json after spot-check).
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/verifyDraft.ts --module VHD
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleCode,
  Tier,
  SpecExtract,
  CodeExtract,
  EvaluatorBlock,
  SpecGap,
} from './lib/types';
import {
  Crosswalk,
  CrosswalkRow,
  Classification,
  RuleBodyCite,
} from './crosswalkSchema';
import {
  MODULE_CONFIGS,
  REPO_ROOT,
  EVALUATOR_PATH,
  CANONICAL_OUTPUT_DIR,
  getModuleConfig,
} from './lib/modules';
import { readLines, stableStringify } from './lib/utils';

// =============================================================================
// Candidate matching
// =============================================================================

interface CandidateMatch {
  readonly evaluatorBlock: EvaluatorBlock;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly bodyText: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'not', 'without', 'from', 'this', 'that',
  'have', 'has', 'been', 'were', 'are', 'was', 'will', 'would', 'should',
  'could', 'may', 'all', 'any', 'each', 'when', 'than', 'then', 'over',
  'into', 'onto', 'upon', 'about', 'after', 'before', 'during', 'while',
  'gap', 'rule', 'detection', 'logic', 'patient', 'patients',
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t)),
  );
}

function extractCodes(s: string): Set<string> {
  // ICD-10: A-Z then 2 digits, optional .digits
  // RxNorm: 4-7 digit numbers
  const codes = new Set<string>();
  const re = /\b([A-Z]\d{2}(?:\.\d+)?|\d{4,7})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) codes.add(m[1]);
  return codes;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.max(a.size, b.size);
}

function findCandidates(
  spec: SpecGap,
  blocks: readonly EvaluatorBlock[],
  evaluatorLines: readonly string[],
): CandidateMatch[] {
  const specText = `${spec.name} ${spec.detectionLogic} ${spec.structuredDataElements}`;
  const specTokens = tokenize(specText);
  const specCodes = extractCodes(spec.detectionLogic + ' ' + spec.structuredDataElements);

  const candidates: CandidateMatch[] = [];

  for (const blk of blocks) {
    const bodyStart = Math.max(0, blk.bodyStartLine - 1);
    const bodyEnd = Math.min(evaluatorLines.length, blk.bodyEndLine);
    const bodyText = evaluatorLines.slice(bodyStart, bodyEnd).join('\n');

    const blockText = `${blk.name} ${blk.commentLiteral} ${bodyText}`;
    const blockTokens = tokenize(blockText);
    const blockCodes = extractCodes(bodyText);

    let score = 0;
    const reasons: string[] = [];

    const tokenSim = jaccard(specTokens, blockTokens);
    if (tokenSim > 0.05) {
      score += Math.min(0.4, tokenSim * 1.5);
      reasons.push(`tokenJaccard=${tokenSim.toFixed(2)}`);
    }

    const codeOverlap: string[] = [];
    for (const c of specCodes) if (blockCodes.has(c)) codeOverlap.push(c);
    if (codeOverlap.length > 0) {
      score += Math.min(0.5, codeOverlap.length * 0.15);
      reasons.push(`codeOverlap=[${codeOverlap.join(',')}]`);
    }

    // Name-keyword direct overlap (high signal)
    const specNameTokens = tokenize(spec.name);
    const blockNameTokens = tokenize(blk.name);
    let nameOverlap = 0;
    for (const t of specNameTokens) if (blockNameTokens.has(t)) nameOverlap++;
    if (nameOverlap > 0) {
      score += Math.min(0.3, nameOverlap * 0.15);
      reasons.push(`nameOverlap=${nameOverlap}`);
    }

    if (score > 0) {
      candidates.push({ evaluatorBlock: blk, score: Math.round(score * 1000) / 1000, reasons, bodyText });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3);
}

// =============================================================================
// Per-row classification
// =============================================================================

interface VerifiedRow extends CrosswalkRow {
  readonly verifyConfidence: number;
  readonly verifyReasons: readonly string[];
  readonly candidates: readonly { name: string; score: number; reasons: readonly string[] }[];
}

const HIGH_MATCH_THRESHOLD = 0.55;
const PARTIAL_MATCH_THRESHOLD = 0.25;

function classifyFromCandidates(
  spec: SpecGap,
  candidates: readonly CandidateMatch[],
  module: ModuleCode,
): { classification: Classification; ruleBodyCite: RuleBodyCite | null; verifyConfidence: number; reasons: string[] } {
  if (candidates.length === 0 || candidates[0].score < PARTIAL_MATCH_THRESHOLD) {
    return {
      classification: 'SPEC_ONLY',
      ruleBodyCite: null,
      verifyConfidence: 0.85,
      reasons: ['No candidate evaluator block above PARTIAL_MATCH_THRESHOLD'],
    };
  }

  const top = candidates[0];
  const cite: RuleBodyCite = {
    registryId: '', // filled later if we can find it
    registryLine: 0,
    evaluatorBlockName: top.evaluatorBlock.name,
    evaluatorBodyLineRange: [top.evaluatorBlock.bodyStartLine, top.evaluatorBlock.bodyEndLine],
    evaluatorModule: module,
  };

  if (top.score >= HIGH_MATCH_THRESHOLD) {
    return {
      classification: 'DET_OK',
      ruleBodyCite: cite,
      verifyConfidence: 0.8,
      reasons: [`Top candidate score=${top.score} >= HIGH_MATCH (${HIGH_MATCH_THRESHOLD})`, ...top.reasons],
    };
  }

  return {
    classification: 'PARTIAL_DETECTION',
    ruleBodyCite: cite,
    verifyConfidence: 0.6,
    reasons: [`Top candidate score=${top.score} between PARTIAL (${PARTIAL_MATCH_THRESHOLD}) and HIGH (${HIGH_MATCH_THRESHOLD})`, ...top.reasons],
  };
}

function fillRegistryCite(
  cite: RuleBodyCite | null,
  evaluatorBlockName: string,
  matches: readonly { registryId: string; registryLine: number; evaluatorBlockName: string }[],
  registry: readonly { id: string; registryLine: number }[],
): RuleBodyCite | null {
  if (!cite) return null;
  const m = matches.find((m) => m.evaluatorBlockName === evaluatorBlockName);
  if (m) {
    return { ...cite, registryId: m.registryId, registryLine: m.registryLine };
  }
  // Fallback: evaluator block has no registry match (e.g., EP-017). Leave registryId empty
  // to surface for manual fill during operator review.
  return cite;
}

// =============================================================================
// Verify entire draft
// =============================================================================

interface VerifyContext {
  readonly module: ModuleCode;
  readonly spec: SpecExtract;
  readonly code: CodeExtract;
  readonly draft: Crosswalk;
  readonly reconciliation: { matches: readonly { registryId: string; registryLine: number; evaluatorBlockName: string }[] };
  readonly evaluatorLines: readonly string[];
  /** All-modules code extracts for cross-module satisfaction detection. Optional. */
  readonly allCodeExtracts?: ReadonlyMap<ModuleCode, CodeExtract>;
  /** All-modules reconciliations for cross-module ruleBodyCite registry lookups. Optional. */
  readonly allReconciliations?: ReadonlyMap<ModuleCode, { matches: readonly { registryId: string; registryLine: number; evaluatorBlockName: string }[] }>;
}

interface VerifyStats {
  readonly total: number;
  readonly byClassification: Record<string, number>;
  readonly byVerifyConfidence: { high: number; medium: number; low: number };
  readonly preservedFromAddendum: number;
  readonly autoClassifiedFromCandidates: number;
  readonly broadRulePartials: number;
  readonly crossModuleMatches: number;
}

/**
 * For each spec gap, identify the best candidate evaluator block including
 * cross-module candidates. Returns top match per spec gap with module identification.
 */
interface BestMatch {
  readonly specGap: SpecGap;
  readonly topCandidate: CandidateMatch | null;
  /** Module that owns the matched evaluator block. */
  readonly candidateModule: ModuleCode;
}

function findBestCrossModuleMatch(
  spec: SpecGap,
  ownModule: ModuleCode,
  ownBlocks: readonly EvaluatorBlock[],
  evaluatorLines: readonly string[],
  allCodeExtracts?: ReadonlyMap<ModuleCode, CodeExtract>,
): BestMatch {
  // First try own-module candidates (preferred — most matches are in-module)
  const ownCands = findCandidates(spec, ownBlocks, evaluatorLines);
  let best: { cand: CandidateMatch; module: ModuleCode } | null =
    ownCands.length > 0 ? { cand: ownCands[0], module: ownModule } : null;

  // Only consult other modules if own-module match is weak (<HIGH_MATCH_THRESHOLD)
  if (allCodeExtracts && (!best || best.cand.score < HIGH_MATCH_THRESHOLD)) {
    for (const [otherMod, otherCode] of allCodeExtracts) {
      if (otherMod === ownModule) continue;
      const otherCands = findCandidates(spec, otherCode.evaluatorBlocks, evaluatorLines);
      if (otherCands.length === 0) continue;
      // Cross-module match is preferred only if substantially stronger than own-module
      // (avoid false positives where a CAD-statin rule lights up similar tokens for HF)
      const requiredAdvantage = best ? best.cand.score + 0.15 : PARTIAL_MATCH_THRESHOLD;
      if (otherCands[0].score >= requiredAdvantage) {
        best = { cand: otherCands[0], module: otherMod };
      }
    }
  }

  return {
    specGap: spec,
    topCandidate: best?.cand ?? null,
    candidateModule: best?.module ?? ownModule,
  };
}

/**
 * Detect broad-rule consolidation: an evaluator block listed as top candidate for
 * multiple spec gaps within the same subcategory. Returns the count of consolidated
 * gaps per (module, evaluatorBlockName) key.
 */
function buildConsolidationMap(
  bestMatches: readonly BestMatch[],
): Map<string, number> {
  const counts = new Map<string, number>();
  // Group by (subcategory, candidateModule, evaluatorBlockName) — broad-rule applies
  // when one evaluator covers ≥2 spec gaps in the SAME subcategory
  const subcatKey = (m: BestMatch) =>
    m.topCandidate ? `${m.specGap.subcategory}::${m.candidateModule}::${m.topCandidate.evaluatorBlock.name}` : null;
  for (const m of bestMatches) {
    const key = subcatKey(m);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function verifyCrosswalkDraft(ctx: VerifyContext): { crosswalk: Crosswalk; stats: VerifyStats } {
  const verifiedRows: CrosswalkRow[] = [];
  let preservedFromAddendum = 0;
  let autoClassifiedFromCandidates = 0;
  let broadRulePartials = 0;
  let crossModuleMatches = 0;
  const byClass: Record<string, number> = {};
  const byConf = { high: 0, medium: 0, low: 0 };

  const specByGapId = new Map(ctx.spec.gaps.map((g) => [g.id, g]));

  // Step 1: compute best match per spec gap (including cross-module candidates)
  const bestMatches: BestMatch[] = [];
  for (const draftRow of ctx.draft.rows) {
    const specGap = specByGapId.get(draftRow.specGapId);
    if (!specGap) continue;
    bestMatches.push(
      findBestCrossModuleMatch(
        specGap,
        ctx.module,
        ctx.code.evaluatorBlocks,
        ctx.evaluatorLines,
        ctx.allCodeExtracts,
      ),
    );
  }

  // Step 2: detect broad-rule consolidation (same evaluator top-matched in same subcategory)
  const consolidationCounts = buildConsolidationMap(bestMatches);

  // Step 3: classify per row using §3.2.1 rules
  const bestByGapId = new Map(bestMatches.map((m) => [m.specGap.id, m]));

  for (const draftRow of ctx.draft.rows) {
    const specGap = specByGapId.get(draftRow.specGapId);
    if (!specGap) continue;

    const isParsedFromAddendum =
      typeof draftRow.parseSource === 'string' && draftRow.parseSource.startsWith('addendum-line-');
    const hasMeaningfulClassification =
      isParsedFromAddendum && draftRow.classification !== 'SPEC_ONLY';

    const best = bestByGapId.get(specGap.id);
    const reasons: string[] = [];

    let classification: Classification;
    let ruleBodyCite: RuleBodyCite | null;
    let verifyConfidence: number;

    if (hasMeaningfulClassification) {
      classification = draftRow.classification;
      if (draftRow.ruleBodyCite) {
        ruleBodyCite = draftRow.ruleBodyCite;
      } else if (best?.topCandidate && best.topCandidate.score >= PARTIAL_MATCH_THRESHOLD) {
        const reconForModule =
          best.candidateModule === ctx.module
            ? ctx.reconciliation
            : ctx.allReconciliations?.get(best.candidateModule);
        const matches = reconForModule?.matches ?? [];
        ruleBodyCite = fillRegistryCite(
          {
            registryId: '',
            registryLine: 0,
            evaluatorBlockName: best.topCandidate.evaluatorBlock.name,
            evaluatorBodyLineRange: [
              best.topCandidate.evaluatorBlock.bodyStartLine,
              best.topCandidate.evaluatorBlock.bodyEndLine,
            ],
            evaluatorModule: best.candidateModule,
          },
          best.topCandidate.evaluatorBlock.name,
          matches,
          ctx.code.registry,
        );
      } else {
        ruleBodyCite = null;
      }
      verifyConfidence = 0.85;
      reasons.push('preserved-from-addendum');
      preservedFromAddendum++;
    } else {
      // Auto-classify from candidates
      if (!best || !best.topCandidate || best.topCandidate.score < PARTIAL_MATCH_THRESHOLD) {
        classification = 'SPEC_ONLY';
        ruleBodyCite = null;
        verifyConfidence = 0.85;
        reasons.push('No candidate evaluator block above PARTIAL_MATCH');
      } else {
        const top = best.topCandidate;
        const subcatKey = `${specGap.subcategory}::${best.candidateModule}::${top.evaluatorBlock.name}`;
        const consolidationCount = consolidationCounts.get(subcatKey) ?? 0;
        const isBroadRule = consolidationCount >= 2;

        if (isBroadRule) {
          // §3.2.1 broad-rule consolidation: default each consolidated gap to PARTIAL_DETECTION.
          // Manual verification on T1+SAFETY subset will refine specific gaps to DET_OK where warranted.
          classification = 'PARTIAL_DETECTION';
          verifyConfidence = 0.7;
          reasons.push(
            `broad-rule consolidation: ${top.evaluatorBlock.name} top-matches ${consolidationCount} spec gaps in subcategory "${specGap.subcategory}"`,
          );
          broadRulePartials++;
        } else if (top.score >= HIGH_MATCH_THRESHOLD) {
          classification = 'DET_OK';
          verifyConfidence = 0.8;
          reasons.push(`Top candidate score=${top.score} >= HIGH_MATCH (${HIGH_MATCH_THRESHOLD})`);
        } else {
          classification = 'PARTIAL_DETECTION';
          verifyConfidence = 0.6;
          reasons.push(`Top candidate score=${top.score} between PARTIAL and HIGH thresholds`);
        }
        reasons.push(...top.reasons);

        const reconForModule =
          best.candidateModule === ctx.module
            ? ctx.reconciliation
            : ctx.allReconciliations?.get(best.candidateModule);
        const matches = reconForModule?.matches ?? [];

        ruleBodyCite = fillRegistryCite(
          {
            registryId: '',
            registryLine: 0,
            evaluatorBlockName: top.evaluatorBlock.name,
            evaluatorBodyLineRange: [top.evaluatorBlock.bodyStartLine, top.evaluatorBlock.bodyEndLine],
            evaluatorModule: best.candidateModule,
          },
          top.evaluatorBlock.name,
          matches,
          ctx.code.registry,
        );

        if (best.candidateModule !== ctx.module) {
          reasons.push(`cross-module match: evaluator owned by ${best.candidateModule}`);
          crossModuleMatches++;
        }
      }
      autoClassifiedFromCandidates++;
    }

    // Build auditNotes
    let auditNotesParts: string[] = [];
    if (draftRow.auditNotes && !draftRow.auditNotes.startsWith('Not classified in source addendum')) {
      auditNotesParts.push(draftRow.auditNotes);
    }
    auditNotesParts.push(`auto-verify: ${reasons.join('; ')}`);

    if (ruleBodyCite && ruleBodyCite.registryId === '') {
      auditNotesParts.push(`evaluator block has no registry match (e.g., orphan); cite dropped, registryId TBD`);
      ruleBodyCite = null;
      // If classification was DET_OK but cite dropped, demote to PARTIAL_DETECTION
      if (classification === 'DET_OK') classification = 'PARTIAL_DETECTION';
    }

    if (classification === 'SPEC_ONLY' && ruleBodyCite) {
      ruleBodyCite = null;
    }

    byClass[classification] = (byClass[classification] || 0) + 1;
    if (verifyConfidence >= 0.8) byConf.high++;
    else if (verifyConfidence >= 0.5) byConf.medium++;
    else byConf.low++;

    const finalRow: CrosswalkRow = {
      specGapId: draftRow.specGapId,
      specLine: specGap.specLine,
      tier: specGap.tier,
      classification,
      ruleBodyCite,
      auditNotes: auditNotesParts.join(' | '),
      inferredSafetyTag: draftRow.inferredSafetyTag,
      inferredSafetyRationale: draftRow.inferredSafetyRationale,
    };
    verifiedRows.push(finalRow);
  }

  verifiedRows.sort((a, b) => a.specLine - b.specLine);

  const crosswalk: Crosswalk = {
    module: ctx.module,
    crosswalkVersion: '1.0',
    auditDate: new Date().toISOString().slice(0, 10),
    auditMethod: 'rule-body-citation-AUDIT-030D',
    rows: verifiedRows,
    extras: ctx.draft.extras,
    strategicPosture: ctx.draft.strategicPosture ?? '',
    sequencingNotes: ctx.draft.sequencingNotes ?? '',
    lessonsLearned: ctx.draft.lessonsLearned ?? '',
  };

  const stats: VerifyStats = {
    total: verifiedRows.length,
    byClassification: byClass,
    byVerifyConfidence: byConf,
    preservedFromAddendum,
    autoClassifiedFromCandidates,
    broadRulePartials,
    crossModuleMatches,
  };

  return { crosswalk, stats };
}

// =============================================================================
// CLI
// =============================================================================

function main(): void {
  let mod: ModuleCode | undefined;
  let all = false;
  let inputDir = CANONICAL_OUTPUT_DIR;
  let outputDir = CANONICAL_OUTPUT_DIR;
  let promote = false; // when set, write to .crosswalk.json (final), not .candidate.json
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--module' && process.argv[i + 1]) {
      mod = process.argv[i + 1].toUpperCase() as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--promote') {
      promote = true;
    } else if (a === '--input' && process.argv[i + 1]) {
      inputDir = path.resolve(process.argv[i + 1]);
      i++;
    } else if (a === '--output' && process.argv[i + 1]) {
      outputDir = path.resolve(process.argv[i + 1]);
      i++;
    }
  }

  if (!mod && !all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const targets = all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === mod);
  const evaluatorLines = readLines(EVALUATOR_PATH);

  // Pre-load all-modules code + reconciliation extracts for cross-module satisfaction detection
  const allCodeExtracts = new Map<ModuleCode, CodeExtract>();
  const allReconciliations = new Map<ModuleCode, { matches: readonly { registryId: string; registryLine: number; evaluatorBlockName: string }[] }>();
  for (const m of MODULE_CONFIGS) {
    const cp = path.join(inputDir, `${m.code}.code.json`);
    const rp = path.join(inputDir, `${m.code}.reconciliation.json`);
    if (fs.existsSync(cp)) allCodeExtracts.set(m.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
    if (fs.existsSync(rp)) allReconciliations.set(m.code, JSON.parse(fs.readFileSync(rp, 'utf8')));
  }

  console.log(`=== verifyDraft.ts (${promote ? 'promote' : 'candidate'}) ===`);
  for (const cfg of targets) {
    const specPath = path.join(inputDir, `${cfg.code}.spec.json`);
    const codePath = path.join(inputDir, `${cfg.code}.code.json`);
    const draftPath = path.join(inputDir, `${cfg.code}.crosswalk.draft.json`);
    const reconPath = path.join(inputDir, `${cfg.code}.reconciliation.json`);
    if (![specPath, codePath, draftPath, reconPath].every(fs.existsSync)) {
      console.error(`  ${cfg.code}: SKIPPED — missing extracts/draft/reconciliation`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as SpecExtract;
    const code = JSON.parse(fs.readFileSync(codePath, 'utf8')) as CodeExtract;
    const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8')) as Crosswalk;
    const reconciliation = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

    const { crosswalk, stats } = verifyCrosswalkDraft({
      module: cfg.code,
      spec,
      code,
      draft,
      reconciliation,
      evaluatorLines,
      allCodeExtracts,
      allReconciliations,
    });

    const outName = promote ? `${cfg.code}.crosswalk.json` : `${cfg.code}.crosswalk.candidate.json`;
    const outPath = path.join(outputDir, outName);
    fs.writeFileSync(outPath, stableStringify(crosswalk));

    const cls = stats.byClassification;
    const conf = stats.byVerifyConfidence;
    console.log(
      `  ${cfg.code}: ${stats.total} rows | ` +
        `DET_OK=${cls.DET_OK ?? 0} PARTIAL=${cls.PARTIAL_DETECTION ?? 0} SPEC_ONLY=${cls.SPEC_ONLY ?? 0} | ` +
        `conf H=${conf.high} M=${conf.medium} L=${conf.low} | ` +
        `preserved=${stats.preservedFromAddendum} auto=${stats.autoClassifiedFromCandidates} ` +
        `broad-rule=${stats.broadRulePartials} cross-module=${stats.crossModuleMatches}`,
    );
  }
  console.log(`Output: ${outputDir}`);
}

if (require.main === module) {
  main();
}
