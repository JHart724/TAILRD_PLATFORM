/**
 * reconcile.ts — pair registry entries to evaluator blocks per AUDIT_METHODOLOGY.md §2.1.D.
 *
 * Inputs:  docs/audit/canonical/<MODULE>.spec.json + <MODULE>.code.json
 * Output:  docs/audit/canonical/<MODULE>.reconciliation.json
 *
 * Algorithm:
 *   1. Pre-tokenize every registry id (suffix after `gap-{prefix}-`) and every evaluator
 *      block name (e.g., "VD-1", "EP-LAAC", "EP-017").
 *   2. Compute similarity score for every (registry, evaluator) pair, combining exact-token
 *      Jaccard with substring containment to handle abbreviations.
 *   3. Greedy bidirectional best-match assignment: highest-scoring unassigned pair locks first.
 *   4. Pairs with score below SCORE_FLOOR (0.05) considered unmatched.
 *   5. Surface orphans + naming mismatches + count divergences with explanations.
 *
 * Special-case handling:
 *   - "Expected multi-push" flag set when gapsPushCount exceeds evaluatorBlock count by
 *     a known compound-comment offset (e.g., EP's `// Gap EP-RC + EP-017:` parent comment
 *     covers two `gaps.push` calls — one for EP-RC, one for EP-017).
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/reconcile.ts --module VHD
 *   npx tsx backend/scripts/auditCanonical/reconcile.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleCode,
  RegistryEntry,
  EvaluatorBlock,
  CodeExtract,
  SpecExtract,
} from './lib/types';
import {
  MODULE_CONFIGS,
  CANONICAL_OUTPUT_DIR,
  EXTRACTOR_VERSION,
  getModuleConfig,
} from './lib/modules';
import { stableStringify } from './lib/utils';

const SCRIPT_RELPATH = 'backend/scripts/auditCanonical/reconcile.ts';

// =============================================================================
// Reconciliation schema (per §2.1.D)
// =============================================================================

export type MatchMethod = 'explicit' | 'similarity' | 'manual';
export type ReconciliationStatus = 'CLEAN' | 'DIVERGENT';

export interface MatchEntry {
  readonly registryId: string;
  readonly registryLine: number;
  readonly evaluatorBlockName: string;
  readonly evaluatorCommentLine: number;
  readonly matchConfidence: number;
  readonly matchMethod: MatchMethod;
}

export interface RegistryOrphan {
  readonly registryId: string;
  readonly registryLine: number;
  readonly evaluatorBlockName: null;
  readonly reason: string;
}

export interface EvaluatorOrphan {
  readonly evaluatorBlockName: string;
  readonly commentLine: number;
  readonly registryId: null;
  readonly reason: string;
}

export interface NamingMismatch {
  readonly registryId: string;
  readonly registryLine: number;
  readonly expectedPrefix: string;
  readonly actualPrefix: string;
}

export interface CountDivergenceNote {
  readonly kind: 'GAPS_PUSH_VS_EVALUATOR' | 'REGISTRY_VS_EVALUATOR';
  readonly observed: { readonly gapsPushCount: number; readonly evaluatorCount: number; readonly registryCount: number };
  readonly delta: number;
  readonly explanation: string;
}

export interface ReconciliationResult {
  readonly module: ModuleCode;
  readonly specGapCount: number;
  readonly registryCount: number;
  readonly evaluatorBlockCount: number;
  readonly gapsPushCount: number;
  readonly status: ReconciliationStatus;
  readonly matches: readonly MatchEntry[];
  readonly registryOrphans: readonly RegistryOrphan[];
  readonly evaluatorOrphans: readonly EvaluatorOrphan[];
  readonly namingMismatches: readonly NamingMismatch[];
  readonly countDivergences: readonly CountDivergenceNote[];
}

// =============================================================================
// Tokenization + similarity
// =============================================================================

const STOP_TOKENS = new Set([
  'gap', 'the', 'and', 'in', 'of', 'a', 'on', 'with', 'for', 'an', 'is', 'at',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[-_:\s]+/)
    .filter((t) => t.length > 1 && !STOP_TOKENS.has(t));
}

/**
 * Combined similarity:
 *   exactJaccard       = |A ∩ B| / max(|A|, |B|)
 *   substringContain   = (count of A-tokens that are substrings of B-tokens, or vice versa) / max(|A|, |B|)
 *   final              = exactJaccard + 0.5 * substringContain
 */
export function similarity(aTokens: readonly string[], bTokens: readonly string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  const exactOverlap = [...setA].filter((t) => setB.has(t)).length;

  let substringOverlap = 0;
  for (const a of setA) {
    if (setB.has(a)) continue;
    for (const b of setB) {
      if ((a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b))) {
        substringOverlap++;
        break;
      }
    }
  }

  const totalOverlap = exactOverlap + 0.5 * substringOverlap;
  const denominator = Math.max(setA.size, setB.size);
  return denominator > 0 ? totalOverlap / denominator : 0;
}

const SCORE_FLOOR = 0.05;

// =============================================================================
// Pairing (bidirectional greedy best-match)
// =============================================================================

interface PairCandidate {
  readonly regIdx: number;
  readonly evalIdx: number;
  readonly score: number;
}

export function pairRegistryToEvaluators(
  registry: readonly RegistryEntry[],
  evaluator: readonly EvaluatorBlock[],
  codePrefix: string,
): { matches: MatchEntry[]; assignedReg: Set<number>; assignedEval: Set<number> } {
  const prefix = `gap-${codePrefix}-`;

  const regTokens: string[][] = registry.map((r) => {
    const stripped = r.id.startsWith(prefix) ? r.id.slice(prefix.length) : r.id;
    return tokenize(stripped + ' ' + (r.name ?? ''));
  });
  const evalTokens: string[][] = evaluator.map((e) => tokenize(e.name + ' ' + e.commentLiteral));

  const candidates: PairCandidate[] = [];
  for (let i = 0; i < registry.length; i++) {
    for (let j = 0; j < evaluator.length; j++) {
      const score = similarity(regTokens[i], evalTokens[j]);
      if (score >= SCORE_FLOOR) candidates.push({ regIdx: i, evalIdx: j, score });
    }
  }
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.regIdx !== b.regIdx) return a.regIdx - b.regIdx;
    return a.evalIdx - b.evalIdx;
  });

  const assignedReg = new Set<number>();
  const assignedEval = new Set<number>();
  const matches: MatchEntry[] = [];

  for (const p of candidates) {
    if (assignedReg.has(p.regIdx) || assignedEval.has(p.evalIdx)) continue;
    assignedReg.add(p.regIdx);
    assignedEval.add(p.evalIdx);
    const r = registry[p.regIdx];
    const e = evaluator[p.evalIdx];
    matches.push({
      registryId: r.id,
      registryLine: r.registryLine,
      evaluatorBlockName: e.name,
      evaluatorCommentLine: e.commentLine,
      matchConfidence: Math.round(p.score * 1000) / 1000,
      matchMethod: p.score >= 0.95 ? 'explicit' : 'similarity',
    });
  }

  // Sort matches by registryLine ascending for determinism
  matches.sort((a, b) => a.registryLine - b.registryLine);
  return { matches, assignedReg, assignedEval };
}

// =============================================================================
// Naming mismatch detection
// =============================================================================

export function detectNamingMismatches(
  registry: readonly RegistryEntry[],
  codePrefix: string,
): NamingMismatch[] {
  const expectedPrefix = `gap-${codePrefix}-`;
  const mismatches: NamingMismatch[] = [];
  for (const r of registry) {
    if (!r.id.startsWith(expectedPrefix)) {
      const dashIdx = r.id.indexOf('-', 4); // skip "gap-" then find next dash
      const actual = dashIdx > 0 ? r.id.slice(0, dashIdx + 1) : r.id;
      mismatches.push({
        registryId: r.id,
        registryLine: r.registryLine,
        expectedPrefix,
        actualPrefix: actual,
      });
    }
  }
  return mismatches;
}

// =============================================================================
// Count-divergence explanations
// =============================================================================

export function buildCountDivergences(
  registryCount: number,
  evaluatorCount: number,
  gapsPushCount: number,
  evaluatorBlocks: readonly EvaluatorBlock[],
): CountDivergenceNote[] {
  const notes: CountDivergenceNote[] = [];

  if (gapsPushCount !== evaluatorCount) {
    // Compound-comment detection: count evaluator blocks whose comment literal
    // contains `+` (e.g., `// Gap EP-RC + EP-017:`). These typically host multiple gaps.push.
    const compoundBlocks = evaluatorBlocks.filter((b) =>
      b.commentLiteral.includes('+') && b.gapsPushIds.length > 1,
    );
    const expectedCompoundExtra = compoundBlocks.reduce(
      (sum, b) => sum + (b.gapsPushIds.length - 1),
      0,
    );
    const unexplained = gapsPushCount - evaluatorCount - expectedCompoundExtra;
    notes.push({
      kind: 'GAPS_PUSH_VS_EVALUATOR',
      observed: { gapsPushCount, evaluatorCount, registryCount },
      delta: gapsPushCount - evaluatorCount,
      explanation:
        compoundBlocks.length > 0
          ? `${gapsPushCount - evaluatorCount} extra gaps.push call(s) vs evaluator block count. ` +
            `${compoundBlocks.length} compound-comment block(s) account for ${expectedCompoundExtra} extras. ` +
            `${unexplained === 0 ? 'Fully explained.' : `${unexplained} unexplained — investigate.`}`
          : `${gapsPushCount - evaluatorCount} extra gaps.push call(s) without compound-comment block to account for them. ` +
            `Possible: registry-without-evaluator entry firing inline, OR evaluator block emitting multiple gaps.`,
    });
  }

  if (registryCount !== evaluatorCount) {
    notes.push({
      kind: 'REGISTRY_VS_EVALUATOR',
      observed: { gapsPushCount, evaluatorCount, registryCount },
      delta: registryCount - evaluatorCount,
      explanation:
        registryCount > evaluatorCount
          ? `${registryCount - evaluatorCount} more registry entries than evaluator blocks. ` +
            `Suggests detection-without-registry rules OR registry-without-evaluator entries (look at orphan lists).`
          : `${evaluatorCount - registryCount} more evaluator blocks than registry entries. ` +
            `Suggests evaluator-without-registry case (e.g., EP-017 added in PR #229 without registry update).`,
    });
  }

  return notes;
}

// =============================================================================
// Build full reconciliation
// =============================================================================

export function buildReconciliation(
  spec: SpecExtract,
  code: CodeExtract,
  codePrefix: string,
): ReconciliationResult {
  const { matches, assignedReg, assignedEval } = pairRegistryToEvaluators(
    code.registry,
    code.evaluatorBlocks,
    codePrefix,
  );

  const registryOrphans: RegistryOrphan[] = [];
  for (let i = 0; i < code.registry.length; i++) {
    if (!assignedReg.has(i)) {
      const r = code.registry[i];
      registryOrphans.push({
        registryId: r.id,
        registryLine: r.registryLine,
        evaluatorBlockName: null,
        reason: 'No evaluator body matched via similarity scoring',
      });
    }
  }
  registryOrphans.sort((a, b) => a.registryLine - b.registryLine);

  const evaluatorOrphans: EvaluatorOrphan[] = [];
  for (let j = 0; j < code.evaluatorBlocks.length; j++) {
    if (!assignedEval.has(j)) {
      const e = code.evaluatorBlocks[j];
      evaluatorOrphans.push({
        evaluatorBlockName: e.name,
        commentLine: e.commentLine,
        registryId: null,
        reason: 'No registry entry matched via similarity scoring',
      });
    }
  }
  evaluatorOrphans.sort((a, b) => a.commentLine - b.commentLine);

  const namingMismatches = detectNamingMismatches(code.registry, codePrefix);
  const countDivergences = buildCountDivergences(
    code.registry.length,
    code.evaluatorBlocks.length,
    code.gapsPushCount,
    code.evaluatorBlocks,
  );

  const status: ReconciliationStatus =
    registryOrphans.length === 0 &&
    evaluatorOrphans.length === 0 &&
    namingMismatches.length === 0 &&
    countDivergences.every((n) => n.delta === 0)
      ? 'CLEAN'
      : 'DIVERGENT';

  return {
    module: spec.module,
    specGapCount: spec.totalGaps,
    registryCount: code.registry.length,
    evaluatorBlockCount: code.evaluatorBlocks.length,
    gapsPushCount: code.gapsPushCount,
    status,
    matches,
    registryOrphans,
    evaluatorOrphans,
    namingMismatches,
    countDivergences,
  };
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv: readonly string[]): {
  module?: ModuleCode;
  all: boolean;
  inputDir?: string;
  outputDir?: string;
} {
  let mod: ModuleCode | undefined;
  let all = false;
  let inputDir: string | undefined;
  let outputDir: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      mod = argv[i + 1].toUpperCase() as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--input' && argv[i + 1]) {
      inputDir = argv[i + 1];
      i++;
    } else if (a === '--output' && argv[i + 1]) {
      outputDir = argv[i + 1];
      i++;
    }
  }
  return { module: mod, all, inputDir, outputDir };
}

function main(): void {
  const args = parseArgs(process.argv);
  if (!args.module && !args.all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const inputDir = args.inputDir ? path.resolve(args.inputDir) : CANONICAL_OUTPUT_DIR;
  const outputDir = args.outputDir ? path.resolve(args.outputDir) : CANONICAL_OUTPUT_DIR;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const targets = args.all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === args.module);

  console.log('=== reconcile.ts ===');
  for (const cfg of targets) {
    const specPath = path.join(inputDir, `${cfg.code}.spec.json`);
    const codePath = path.join(inputDir, `${cfg.code}.code.json`);
    if (!fs.existsSync(specPath) || !fs.existsSync(codePath)) {
      console.error(
        `  ${cfg.code}: SKIPPED — missing ${!fs.existsSync(specPath) ? 'spec.json' : 'code.json'}. Run extractSpec/extractCode first.`,
      );
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as SpecExtract;
    const code = JSON.parse(fs.readFileSync(codePath, 'utf8')) as CodeExtract;
    const reconciliation = buildReconciliation(spec, code, cfg.codePrefix);
    const outPath = path.join(outputDir, `${cfg.code}.reconciliation.json`);
    fs.writeFileSync(outPath, stableStringify(reconciliation));

    const r = reconciliation;
    console.log(
      `  ${cfg.code}: ${r.status} | reg=${r.registryCount} eval=${r.evaluatorBlockCount} ` +
        `push=${r.gapsPushCount} spec=${r.specGapCount} | matches=${r.matches.length} ` +
        `regOrphans=${r.registryOrphans.length} evalOrphans=${r.evaluatorOrphans.length} ` +
        `namingMismatches=${r.namingMismatches.length}`,
    );
    if (r.registryOrphans.length > 0) {
      console.log(`    Registry orphans: ${r.registryOrphans.map((o) => o.registryId).join(', ')}`);
    }
    if (r.evaluatorOrphans.length > 0) {
      console.log(`    Evaluator orphans: ${r.evaluatorOrphans.map((o) => `${o.evaluatorBlockName} (line ${o.commentLine})`).join(', ')}`);
    }
    if (r.namingMismatches.length > 0) {
      console.log(`    Naming mismatches: ${r.namingMismatches.map((m) => m.registryId).join(', ')}`);
    }
  }
  console.log(`Output: ${outputDir}`);
}

if (require.main === module) {
  main();
}
