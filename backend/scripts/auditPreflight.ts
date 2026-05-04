/**
 * @deprecated  Superseded by `backend/scripts/auditCanonical/` (PR landing 2026-05-04).
 * The canonical infrastructure supplies the same checks plus structured data model
 * (spec.json + code.json + crosswalk.json + reconciliation.json) and CI gates.
 *
 * Kept temporarily for transition (escape-hatch debugging tool). New audit work
 * should use:
 *   - npx tsx backend/scripts/auditCanonical/extractSpec.ts
 *   - npx tsx backend/scripts/auditCanonical/extractCode.ts
 *   - npx tsx backend/scripts/auditCanonical/reconcile.ts
 *   - npx tsx backend/scripts/auditCanonical/renderAddendum.ts
 *
 * See `docs/audit/AUDIT_METHODOLOGY.md` for the canonical contract.
 *
 * Audit Pre-Flight Script — AUDIT-029 / AUDIT-030 / AUDIT-030.D mechanical checks
 *
 * Codifies the audit-methodology rules surfaced during Phase 0B audit re-audit work:
 *   - AUDIT-029: name-match audits overestimate DET_OK; rule-body verification required
 *   - AUDIT-030: per-gap classifications must cite spec line + literal tier marker
 *   - AUDIT-030.D: evaluator inventory completeness check across ALL comment patterns
 *
 * For each clinical module, generates:
 *   1. <MODULE>.preflight.json — mechanically derived inventory (registry, evaluator,
 *      reconciliation, spec gaps with citations, candidate evaluator-block matching with
 *      confidence scores, SAFETY-tag enumeration). Regenerable on every run.
 *   2. <MODULE>.preflight.meta.json — provenance sidecar (generatedAt, scriptVersion,
 *      generatedBy). Separated to keep main preflight content-addressable.
 *   3. <MODULE>.drift.json — only generated when an existing <MODULE>.crosswalk.json
 *      exists and the source files have changed since the crosswalk was authored.
 *
 * Crosswalk files (<MODULE>.crosswalk.json) are agent-authored audit deliverables and
 * are NOT touched by this script.
 *
 * Run:
 *   npx tsx backend/scripts/auditPreflight.ts                 # all modules
 *   npx tsx backend/scripts/auditPreflight.ts --module VHD    # single module
 *   npx tsx backend/scripts/auditPreflight.ts --output <dir>  # custom output (default docs/audit/preflight/)
 *   npx tsx backend/scripts/auditPreflight.ts --verify        # exit 1 if any module has divergence
 *
 * Exit codes:
 *   0 — all selected modules reconciled clean (or --verify not set)
 *   1 — at least one module has registry/evaluator divergence (only with --verify)
 *   2 — script error (file read failure, parse error, malformed module config)
 *
 * Zero new dependencies; uses only node fs + crypto + regex.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

interface ModuleConfig {
  /** Short name used in audit docs (e.g., "VHD") */
  readonly name: string;
  /** Prisma ModuleType enum value */
  readonly enumName: string;
  /** Spec section identifier (e.g., "6.5") */
  readonly specSection: string;
  /** Inclusive line range in CK v4.0 spec file */
  readonly specLineRange: readonly [number, number];
  /** Registry/evaluator code prefix (e.g., "vd" for VHD's gap-vd-* rules) */
  readonly codePrefix: string;
  /** Spec gap ID prefix (e.g., "VHD" — note VHD has different code vs spec prefix) */
  readonly specCodePrefix: string;
  /** Comment patterns to enumerate evaluator blocks (regex source strings, no flags) */
  readonly evaluatorCommentPatterns: readonly string[];
}

interface RegistryRule {
  readonly id: string;
  readonly lineNumber: number;
}

interface EvaluatorBlock {
  readonly name: string;
  readonly comment: string;
  readonly commentLine: number;
  readonly matchedPattern: string;
}

interface ReconciliationResult {
  readonly registryCount: number;
  readonly evaluatorCount: number;
  readonly gapsPushCount: number;
  readonly clean: boolean;
  readonly registryOrphans: readonly string[];
  readonly evaluatorOrphans: readonly string[];
  readonly notes: readonly string[];
}

type SafetyTag =
  | 'CRITICAL_SAFETY'
  | 'CRITICAL'
  | 'SAFETY'
  | null;

interface SpecGap {
  readonly id: string;
  readonly lineNumber: number;
  readonly tier: 'T1' | 'T2' | 'T3';
  readonly tierMarkerLiteral: string;
  readonly subcategory: string;
  readonly specGapText: string;
  readonly domains: readonly string[];
  readonly safetyTag: SafetyTag;
  readonly safetyTagLiteral: string | null;
}

interface SpecSubcategory {
  readonly name: string;
  readonly headerLine: number;
  readonly expectedCount: number;
}

interface CandidateMatch {
  readonly blockName: string;
  readonly commentLine: number;
  readonly confidence: number;
  readonly matchReasons: readonly string[];
}

interface CrossWalkTemplateRow {
  readonly gapId: string;
  readonly specLineNumber: number;
  readonly specTier: string;
  readonly specGapTextExcerpt: string;
  readonly candidateEvaluatorBlocks: readonly CandidateMatch[];
  readonly unclearMatch: boolean;
  readonly classification: null;
  readonly ruleBodyCitation: null;
  readonly auditNotes: null;
}

interface ModulePreflight {
  readonly schemaVersion: string;
  readonly module: string;
  readonly moduleEnumName: string;
  readonly specSection: string;
  readonly sources: {
    readonly spec: string;
    readonly evaluator: string;
    readonly specRange: readonly [number, number];
    readonly specSha256: string;
    readonly evaluatorSha256: string;
  };
  readonly registry: {
    readonly count: number;
    readonly rules: readonly RegistryRule[];
  };
  readonly evaluator: {
    readonly count: number;
    readonly patternCounts: Readonly<Record<string, number>>;
    readonly blocks: readonly EvaluatorBlock[];
  };
  readonly reconciliation: ReconciliationResult;
  readonly specGaps: {
    readonly count: number;
    readonly tierDistribution: { readonly T1: number; readonly T2: number; readonly T3: number };
    readonly subcategories: readonly SpecSubcategory[];
    readonly gaps: readonly SpecGap[];
  };
  readonly crossWalkTemplate: {
    readonly description: string;
    readonly rows: readonly CrossWalkTemplateRow[];
  };
  readonly safetyEnumeration: {
    readonly specExplicitCriticalSafety: readonly { gapId: string; lineNumber: number; tier: string; literal: string }[];
    readonly specExplicitCritical: readonly { gapId: string; lineNumber: number; tier: string; literal: string }[];
    readonly specExplicitSafety: readonly { gapId: string; lineNumber: number; tier: string; literal: string }[];
    readonly counts: {
      readonly specExplicitCritical: number;
      readonly specExplicitSafety: number;
      readonly specExplicitCriticalSafety: number;
      readonly totalSpecExplicit: number;
    };
  };
}

interface PreflightMeta {
  readonly module: string;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly scriptVersion: string;
  readonly preflightSha256: string;
}

interface DriftReport {
  readonly module: string;
  readonly crosswalkSpecSha256: string;
  readonly currentSpecSha256: string;
  readonly crosswalkEvaluatorSha256: string;
  readonly currentEvaluatorSha256: string;
  readonly specChanged: boolean;
  readonly evaluatorChanged: boolean;
  readonly classificationsRequiringReview: readonly string[];
}

// =============================================================================
// Module configuration
// =============================================================================

const SCRIPT_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SPEC_PATH = path.join(REPO_ROOT, 'docs', 'clinical', 'CLINICAL_KNOWLEDGE_BASE_v4.0.md');
const EVALUATOR_PATH = path.join(REPO_ROOT, 'backend', 'src', 'ingestion', 'gaps', 'gapRuleEngine.ts');
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'preflight');

const MODULE_CONFIGS: readonly ModuleConfig[] = [
  {
    name: 'HF',
    enumName: 'HEART_FAILURE',
    specSection: '6.1',
    specLineRange: [120, 306],
    codePrefix: 'hf',
    specCodePrefix: 'HF',
    evaluatorCommentPatterns: ['// Gap HF-', '// HF-', '// Gap [0-9]+-hf', '// Gap NN'],
  },
  {
    name: 'EP',
    enumName: 'ELECTROPHYSIOLOGY',
    specSection: '6.2',
    specLineRange: [307, 440],
    codePrefix: 'ep',
    specCodePrefix: 'EP',
    evaluatorCommentPatterns: ['// Gap EP-', '// EP-', '// Gap 39:'],
  },
  {
    name: 'SH',
    enumName: 'STRUCTURAL_HEART',
    specSection: '6.3',
    specLineRange: [441, 585],
    codePrefix: 'sh',
    specCodePrefix: 'SH',
    evaluatorCommentPatterns: ['// Gap SH-', '// SH-'],
  },
  {
    name: 'CAD',
    enumName: 'CORONARY_INTERVENTION',
    specSection: '6.4',
    specLineRange: [586, 748],
    codePrefix: 'cad',
    specCodePrefix: 'CAD',
    evaluatorCommentPatterns: ['// Gap CAD-', '// CAD-', '// Gap 50:'],
  },
  {
    name: 'VHD',
    enumName: 'VALVULAR_DISEASE',
    specSection: '6.5',
    specLineRange: [749, 926],
    codePrefix: 'vd',
    specCodePrefix: 'VHD',
    evaluatorCommentPatterns: ['// Gap VD-', '// VD-'],
  },
  {
    name: 'PV',
    enumName: 'PERIPHERAL_VASCULAR',
    specSection: '6.6',
    specLineRange: [927, 1112],
    codePrefix: 'pv',
    specCodePrefix: 'PV',
    evaluatorCommentPatterns: ['// Gap PV-', '// PV-'],
  },
];

// =============================================================================
// Utility helpers
// =============================================================================

function readLines(filepath: string): string[] {
  return fs.readFileSync(filepath, 'utf8').split(/\r?\n/);
}

function sha256(filepath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filepath));
  return hash.digest('hex');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stringify with stable key ordering. Recursively sorts object keys; arrays preserved
 * in caller-supplied order (caller responsible for sorting arrays where appropriate).
 */
function stableStringify(value: unknown, indent = 2): string {
  const seen = new WeakSet();
  function sortKeys(v: unknown): unknown {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(sortKeys);
    if (seen.has(v as object)) {
      throw new Error('stableStringify: circular reference detected');
    }
    seen.add(v as object);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((v as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return JSON.stringify(sortKeys(value), null, indent) + '\n';
}

// =============================================================================
// Extractors
// =============================================================================

/**
 * Extract registry entries (`module: '<ENUM>'`) for the given module.
 * Walks evaluator file looking for `{ id: '...', ... module: '<ENUM>' ... }` blocks
 * within the registry array.
 */
export function extractRegistry(lines: readonly string[], enumName: string): RegistryRule[] {
  const rules: RegistryRule[] = [];
  let inObj = false;
  let pendingId: string | null = null;
  let pendingIdLine: number | null = null;
  let pendingModule: string | null = null;

  const objStartRegex = /^\s*\{\s*$/;
  const objEndRegex = /^\s*\},?\s*$/;
  const idRegex = /id:\s*'([^']+)'/;
  const moduleRegex = /module:\s*'([^']+)'/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inObj && objStartRegex.test(line)) {
      inObj = true;
      pendingId = null;
      pendingIdLine = null;
      pendingModule = null;
      continue;
    }
    if (inObj) {
      const idMatch = line.match(idRegex);
      if (idMatch && pendingId === null) {
        pendingId = idMatch[1];
        pendingIdLine = i + 1; // 1-indexed
      }
      const modMatch = line.match(moduleRegex);
      if (modMatch && pendingModule === null) {
        pendingModule = modMatch[1];
      }
      if (objEndRegex.test(line)) {
        if (pendingId && pendingModule === enumName && pendingIdLine !== null) {
          rules.push({ id: pendingId, lineNumber: pendingIdLine });
        }
        inObj = false;
      }
    }
  }
  return rules;
}

/**
 * Enumerate evaluator blocks across multiple comment patterns.
 * Returns blocks deduplicated by line number, sorted ascending.
 */
export function extractEvaluatorBlocks(
  lines: readonly string[],
  patterns: readonly string[],
): { blocks: EvaluatorBlock[]; patternCounts: Record<string, number> } {
  const seenLines = new Set<number>();
  const blocks: EvaluatorBlock[] = [];
  const patternCounts: Record<string, number> = {};

  for (const pattern of patterns) {
    patternCounts[pattern] = 0;
    const re = new RegExp(escapeRegExp(pattern));
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (re.test(line) && !seenLines.has(i + 1)) {
        // Extract block name from comment
        const nameMatch = line.match(/\/\/\s*(?:Gap\s+)?([A-Za-z0-9-]+)(?::|\s)/);
        const name = nameMatch ? nameMatch[1] : line.trim().slice(2, 60).trim();
        blocks.push({
          name,
          comment: line.trim(),
          commentLine: i + 1,
          matchedPattern: pattern,
        });
        seenLines.add(i + 1);
        patternCounts[pattern]++;
      }
    }
  }

  blocks.sort((a, b) => a.commentLine - b.commentLine);
  return { blocks, patternCounts };
}

/** Count `gaps.push({...module: ModuleType.<ENUM>...})` occurrences. */
export function countGapsPush(lines: readonly string[], enumName: string): number {
  const re = new RegExp(`module:\\s*ModuleType\\.${escapeRegExp(enumName)}\\b`);
  let count = 0;
  for (const line of lines) {
    if (re.test(line)) count++;
  }
  return count;
}

/**
 * Extract all spec gaps for a module from CK v4.0 within the configured line range.
 * Each row format: `| Tn | GAP-<PREFIX>-NNN | <text> | <data> | <domains> | <PHI> |`
 */
export function extractSpecGaps(
  lines: readonly string[],
  range: readonly [number, number],
  specCodePrefix: string,
): SpecGap[] {
  const gaps: SpecGap[] = [];
  const gapPrefix = specCodePrefix.toUpperCase();
  const rowRegex = new RegExp(
    `^\\|\\s*(T[123])\\s*\\|\\s*(GAP-${escapeRegExp(gapPrefix)}-\\d+)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|`,
  );

  // Track current subcategory (last subcategory header seen)
  const subcatRegex = /^([A-Z][a-zA-Z\/' ]+?)\s*\((\d+)\s*gaps?\)\s*$/;
  let currentSubcat = '';

  for (let i = range[0] - 1; i < Math.min(range[1], lines.length); i++) {
    const line = lines[i];
    const subMatch = line.match(subcatRegex);
    if (subMatch) {
      currentSubcat = subMatch[1].trim();
      continue;
    }
    const rowMatch = line.match(rowRegex);
    if (rowMatch) {
      const tier = rowMatch[1] as 'T1' | 'T2' | 'T3';
      const gapId = rowMatch[2];
      const specGapText = rowMatch[3].trim();
      const domainsText = rowMatch[5].trim();
      const domains = domainsText
        .split(/[,\s]+/)
        .filter((s) => /^D\d+$/.test(s));

      // SAFETY tag detection — order matters: longest match first
      let safetyTag: SafetyTag = null;
      let safetyTagLiteral: string | null = null;
      if (/\(CRITICAL\s+SAFETY\)/.test(specGapText)) {
        safetyTag = 'CRITICAL_SAFETY';
        safetyTagLiteral = '(CRITICAL SAFETY)';
      } else if (/\(CRITICAL\)/.test(specGapText)) {
        safetyTag = 'CRITICAL';
        safetyTagLiteral = '(CRITICAL)';
      } else if (/\(SAFETY\)/.test(specGapText)) {
        safetyTag = 'SAFETY';
        safetyTagLiteral = '(SAFETY)';
      }

      const tierMarkerLiteral = `| ${tier} |`;
      gaps.push({
        id: gapId,
        lineNumber: i + 1,
        tier,
        tierMarkerLiteral,
        subcategory: currentSubcat,
        specGapText,
        domains,
        safetyTag,
        safetyTagLiteral,
      });
    }
  }

  return gaps;
}

/** Enumerate subcategory headers within the spec range. */
export function extractSubcategories(
  lines: readonly string[],
  range: readonly [number, number],
): SpecSubcategory[] {
  const subcats: SpecSubcategory[] = [];
  const subcatRegex = /^([A-Z][a-zA-Z\/' ]+?)\s*\((\d+)\s*gaps?\)\s*$/;
  for (let i = range[0] - 1; i < Math.min(range[1], lines.length); i++) {
    const line = lines[i];
    const m = line.match(subcatRegex);
    if (m) {
      subcats.push({
        name: m[1].trim(),
        headerLine: i + 1,
        expectedCount: parseInt(m[2], 10),
      });
    }
  }
  return subcats;
}

// =============================================================================
// Reconciliation
// =============================================================================

/**
 * Tokenize an identifier for fuzzy matching.
 * Splits on hyphens/underscores/whitespace, lowercases, drops 1-char tokens
 * and a small stopword list.
 */
function fuzzyTokens(s: string): string[] {
  const stop = new Set(['gap', 'the', 'and', 'in', 'of', 'a', 'on', 'with', 'for']);
  return s
    .toLowerCase()
    .split(/[-_:\s]+/)
    .filter((t) => t.length > 1 && !stop.has(t));
}

/**
 * Score similarity between two token lists 0..1.
 * Combines exact-token overlap (Jaccard) with prefix/substring containment to
 * handle abbreviations like "endo" ↔ "endocarditis", "pannus" ↔ "pannus".
 */
function similarity(aTokens: readonly string[], bTokens: readonly string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  const exactOverlap = [...setA].filter((t) => setB.has(t)).length;

  // Substring containment: any token in A that is a substring of any token in B (or vice versa)
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

/**
 * Build registry-vs-evaluator pairing via bidirectional greedy best-match.
 *
 * Algorithm:
 *   1. For every (registry, evaluator) pair, compute similarity score.
 *   2. Greedy assignment: highest-scoring unassigned pair locks first; repeat until
 *      either set is exhausted.
 *   3. Pairs with score below floor (0.05) are considered unmatched.
 *   4. Unmatched registry entries → registryOrphans; unmatched evaluator → evaluatorOrphans.
 *
 * When counts match and total best-match score is high, this yields zero orphans.
 * When counts diverge, the surplus side reports orphans regardless of fuzzy match quality.
 */
export function reconcile(
  registry: readonly RegistryRule[],
  evaluator: readonly EvaluatorBlock[],
  gapsPushCount: number,
  codePrefix: string,
): ReconciliationResult {
  const registryCount = registry.length;
  const evaluatorCount = evaluator.length;

  const prefix = `gap-${codePrefix}-`;
  // Pre-tokenize once
  const regTokens = registry.map((r) => {
    const suffix = r.id.startsWith(prefix) ? r.id.slice(prefix.length) : r.id;
    return fuzzyTokens(suffix);
  });
  const evalTokens = evaluator.map((e) => fuzzyTokens(e.name + ' ' + e.comment));

  // Build pairwise scores
  type Pair = { regIdx: number; evalIdx: number; score: number };
  const pairs: Pair[] = [];
  for (let i = 0; i < registry.length; i++) {
    for (let j = 0; j < evaluator.length; j++) {
      const score = similarity(regTokens[i], evalTokens[j]);
      if (score > 0) pairs.push({ regIdx: i, evalIdx: j, score });
    }
  }
  // Greedy: highest-scoring pair locks first
  pairs.sort((a, b) => b.score - a.score);
  const assignedReg = new Set<number>();
  const assignedEval = new Set<number>();
  const SCORE_FLOOR = 0.05;
  for (const p of pairs) {
    if (p.score < SCORE_FLOOR) break;
    if (assignedReg.has(p.regIdx) || assignedEval.has(p.evalIdx)) continue;
    assignedReg.add(p.regIdx);
    assignedEval.add(p.evalIdx);
  }

  const registryOrphans: string[] = [];
  for (let i = 0; i < registry.length; i++) {
    if (!assignedReg.has(i)) registryOrphans.push(registry[i].id);
  }
  const evaluatorOrphans: string[] = [];
  for (let j = 0; j < evaluator.length; j++) {
    if (!assignedEval.has(j)) {
      evaluatorOrphans.push(`${evaluator[j].name} (line ${evaluator[j].commentLine})`);
    }
  }

  const notes: string[] = [];
  if (gapsPushCount !== evaluatorCount) {
    notes.push(
      `gaps.push count (${gapsPushCount}) differs from evaluator block count (${evaluatorCount}); ` +
        `this is expected when a single evaluator block fires multiple gaps (e.g., EP-RC + EP-017 SAFETY) ` +
        `or when an evaluator block exists without a registry entry (detection-without-registry, AUDIT-027).`,
    );
  }

  return {
    registryCount,
    evaluatorCount,
    gapsPushCount,
    clean: registryOrphans.length === 0 && evaluatorOrphans.length === 0,
    registryOrphans,
    evaluatorOrphans,
    notes,
  };
}

// =============================================================================
// Candidate matching with confidence scores
// =============================================================================

/**
 * Compute candidate-match confidence per design:
 *   - Subcategory match: +0.3
 *   - Name token Jaccard similarity: 0..0.4
 *   - ICD/RxNorm code overlap (within ±10 lines of evaluator block): 0..0.3
 */
export function matchCandidates(
  gap: SpecGap,
  evaluatorBlocks: readonly EvaluatorBlock[],
  evaluatorLines: readonly string[],
): CandidateMatch[] {
  const candidates: CandidateMatch[] = [];

  // Tokenize spec gap text (lowercase, split on non-alphanumeric, drop short tokens)
  const stopWords = new Set([
    'the', 'and', 'with', 'for', 'not', 'without', 'from', 'this', 'that',
    'have', 'has', 'been', 'were', 'are', 'was', 'will', 'would', 'should',
    'could', 'may', 'all', 'any', 'each', 'when', 'than', 'then', 'over',
    'into', 'onto', 'upon', 'about', 'after', 'before', 'during', 'while',
  ]);
  const gapTokens = new Set(
    gap.specGapText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !stopWords.has(t)),
  );

  // Extract ICD/RxNorm codes from spec gap text
  const codeRegex = /\b([A-Z]\d{2}(?:\.\d+)?|\d{4,7})\b/g;
  const gapCodes = new Set<string>();
  let codeMatch;
  while ((codeMatch = codeRegex.exec(gap.specGapText)) !== null) {
    gapCodes.add(codeMatch[1]);
  }

  for (const block of evaluatorBlocks) {
    const reasons: string[] = [];
    let confidence = 0;

    // Subcategory match (+0.3)
    const blockTokensForSubcat = block.name.toLowerCase().split(/[-_]/).filter((t) => t.length > 1);
    const subcatTokens = gap.subcategory.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (subcatTokens.some((s) => blockTokensForSubcat.some((b) => b.includes(s) || s.includes(b)))) {
      confidence += 0.3;
      reasons.push(`subcategory match (${gap.subcategory})`);
    }

    // Name-token Jaccard similarity (+0..0.4)
    const blockTokens = new Set(
      block.comment
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !stopWords.has(t)),
    );
    const intersect = [...gapTokens].filter((t) => blockTokens.has(t));
    const union = new Set([...gapTokens, ...blockTokens]);
    const jaccard = union.size > 0 ? intersect.length / union.size : 0;
    const jaccardScore = Math.min(0.4, jaccard * 1.5); // amplify slightly to reach 0.4 at ~0.27 raw jaccard
    if (jaccardScore > 0.05) {
      confidence += jaccardScore;
      reasons.push(`name token Jaccard ${jaccard.toFixed(2)} (+${jaccardScore.toFixed(2)})`);
    }

    // ICD/RxNorm code overlap within ±10 lines of evaluator block (+0..0.3)
    if (gapCodes.size > 0) {
      const blockStart = Math.max(0, block.commentLine - 1);
      const blockEnd = Math.min(evaluatorLines.length, block.commentLine + 30);
      const blockBody = evaluatorLines.slice(blockStart, blockEnd).join('\n');
      const codeOverlap: string[] = [];
      for (const code of gapCodes) {
        // Code must appear as a token, not as a substring of a longer number
        const codeRe = new RegExp(`\\b${escapeRegExp(code)}\\b`);
        if (codeRe.test(blockBody)) {
          codeOverlap.push(code);
        }
      }
      if (codeOverlap.length > 0) {
        const codeScore = Math.min(0.3, codeOverlap.length * 0.15);
        confidence += codeScore;
        reasons.push(`code overlap [${codeOverlap.join(',')}] (+${codeScore.toFixed(2)})`);
      }
    }

    if (confidence > 0) {
      candidates.push({
        blockName: block.name,
        commentLine: block.commentLine,
        confidence: Math.round(confidence * 1000) / 1000, // 3 decimal places, deterministic
        matchReasons: reasons,
      });
    }
  }

  // Sort by confidence descending, then by line number ascending for stable order
  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.commentLine - b.commentLine;
  });

  // Top 5 candidates max
  return candidates.slice(0, 5);
}

// =============================================================================
// Build preflight per module
// =============================================================================

export function buildModulePreflight(
  config: ModuleConfig,
  specLines: readonly string[],
  evaluatorLines: readonly string[],
  specSha: string,
  evaluatorSha: string,
): ModulePreflight {
  const registry = extractRegistry(evaluatorLines, config.enumName);
  const { blocks, patternCounts } = extractEvaluatorBlocks(evaluatorLines, config.evaluatorCommentPatterns);
  const gapsPushCount = countGapsPush(evaluatorLines, config.enumName);
  const reconciliation = reconcile(registry, blocks, gapsPushCount, config.codePrefix);

  const subcategories = extractSubcategories(specLines, config.specLineRange);
  const gaps = extractSpecGaps(specLines, config.specLineRange, config.specCodePrefix);

  const tierDistribution = {
    T1: gaps.filter((g) => g.tier === 'T1').length,
    T2: gaps.filter((g) => g.tier === 'T2').length,
    T3: gaps.filter((g) => g.tier === 'T3').length,
  };

  // Cross-walk template
  const crossWalkRows: CrossWalkTemplateRow[] = gaps.map((gap) => {
    const candidates = matchCandidates(gap, blocks, evaluatorLines);
    const maxConfidence = candidates.length > 0 ? candidates[0].confidence : 0;
    const unclearMatch = maxConfidence < 0.5;
    return {
      gapId: gap.id,
      specLineNumber: gap.lineNumber,
      specTier: gap.tier,
      specGapTextExcerpt: gap.specGapText.length > 120 ? gap.specGapText.slice(0, 117) + '...' : gap.specGapText,
      candidateEvaluatorBlocks: candidates,
      unclearMatch,
      classification: null,
      ruleBodyCitation: null,
      auditNotes: null,
    };
  });

  // SAFETY enumeration
  const specExplicitCriticalSafety: { gapId: string; lineNumber: number; tier: string; literal: string }[] = [];
  const specExplicitCritical: { gapId: string; lineNumber: number; tier: string; literal: string }[] = [];
  const specExplicitSafety: { gapId: string; lineNumber: number; tier: string; literal: string }[] = [];

  for (const gap of gaps) {
    if (!gap.safetyTag || !gap.safetyTagLiteral) continue;
    const entry = { gapId: gap.id, lineNumber: gap.lineNumber, tier: gap.tier, literal: gap.safetyTagLiteral };
    if (gap.safetyTag === 'CRITICAL_SAFETY') specExplicitCriticalSafety.push(entry);
    else if (gap.safetyTag === 'CRITICAL') specExplicitCritical.push(entry);
    else if (gap.safetyTag === 'SAFETY') specExplicitSafety.push(entry);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    module: config.name,
    moduleEnumName: config.enumName,
    specSection: config.specSection,
    sources: {
      spec: path.relative(REPO_ROOT, SPEC_PATH).replace(/\\/g, '/'),
      evaluator: path.relative(REPO_ROOT, EVALUATOR_PATH).replace(/\\/g, '/'),
      specRange: config.specLineRange,
      specSha256: specSha,
      evaluatorSha256: evaluatorSha,
    },
    registry: { count: registry.length, rules: registry },
    evaluator: { count: blocks.length, patternCounts, blocks },
    reconciliation,
    specGaps: { count: gaps.length, tierDistribution, subcategories, gaps },
    crossWalkTemplate: {
      description:
        'Agent fills classification + ruleBodyCitation per row to complete AUDIT-030/030.D-compliant audit. ' +
        'Each row pre-populated with candidate evaluator blocks ranked by confidence. ' +
        'Rows with unclearMatch=true (max candidate confidence <0.5) require manual evaluator search.',
      rows: crossWalkRows,
    },
    safetyEnumeration: {
      specExplicitCriticalSafety,
      specExplicitCritical,
      specExplicitSafety,
      counts: {
        specExplicitCritical: specExplicitCritical.length,
        specExplicitSafety: specExplicitSafety.length,
        specExplicitCriticalSafety: specExplicitCriticalSafety.length,
        totalSpecExplicit:
          specExplicitCritical.length + specExplicitSafety.length + specExplicitCriticalSafety.length,
      },
    },
  };
}

export function buildPreflightMeta(
  module: string,
  preflight: ModulePreflight,
  generatedAt: string,
  preflightJsonString: string,
): PreflightMeta {
  const preflightSha = crypto.createHash('sha256').update(preflightJsonString).digest('hex');
  return {
    module,
    generatedAt,
    generatedBy: 'backend/scripts/auditPreflight.ts',
    scriptVersion: SCRIPT_VERSION,
    preflightSha256: preflightSha,
  };
}

export function buildDriftReport(
  moduleName: string,
  currentSpecSha: string,
  currentEvaluatorSha: string,
  crosswalkPath: string,
): DriftReport | null {
  if (!fs.existsSync(crosswalkPath)) return null;
  let crosswalk: any;
  try {
    crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse existing crosswalk ${crosswalkPath}: ${(e as Error).message}`);
  }
  const xwSpecSha = crosswalk?.sources?.specSha256 ?? '';
  const xwEvaluatorSha = crosswalk?.sources?.evaluatorSha256 ?? '';
  const specChanged = xwSpecSha !== currentSpecSha;
  const evaluatorChanged = xwEvaluatorSha !== currentEvaluatorSha;
  const reviewIds: string[] = [];
  if (specChanged || evaluatorChanged) {
    const rows = crosswalk?.crossWalkTemplate?.rows ?? [];
    for (const row of rows) {
      if (row?.gapId) reviewIds.push(row.gapId);
    }
  }
  return {
    module: moduleName,
    crosswalkSpecSha256: xwSpecSha,
    currentSpecSha256: currentSpecSha,
    crosswalkEvaluatorSha256: xwEvaluatorSha,
    currentEvaluatorSha256: currentEvaluatorSha,
    specChanged,
    evaluatorChanged,
    classificationsRequiringReview: reviewIds,
  };
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv: readonly string[]): { module?: string; output?: string; verify: boolean } {
  let module: string | undefined;
  let output: string | undefined;
  let verify = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      module = argv[i + 1].toUpperCase();
      i++;
    } else if (a === '--output' && argv[i + 1]) {
      output = argv[i + 1];
      i++;
    } else if (a === '--verify') {
      verify = true;
    }
  }
  return { module, output, verify };
}

function main(): void {
  const args = parseArgs(process.argv);
  const outputDir = args.output ? path.resolve(args.output) : DEFAULT_OUTPUT_DIR;

  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`ERROR: spec file not found at ${SPEC_PATH}`);
    process.exit(2);
  }
  if (!fs.existsSync(EVALUATOR_PATH)) {
    console.error(`ERROR: evaluator file not found at ${EVALUATOR_PATH}`);
    process.exit(2);
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const specLines = readLines(SPEC_PATH);
  const evaluatorLines = readLines(EVALUATOR_PATH);
  const specSha = sha256(SPEC_PATH);
  const evaluatorSha = sha256(EVALUATOR_PATH);

  const targetModules = args.module
    ? MODULE_CONFIGS.filter((m) => m.name === args.module)
    : MODULE_CONFIGS;

  if (targetModules.length === 0) {
    console.error(`ERROR: no module matches "${args.module}". Valid: ${MODULE_CONFIGS.map((m) => m.name).join(', ')}`);
    process.exit(2);
  }

  const generatedAt = new Date().toISOString();
  let anyDirty = false;
  const summary: { module: string; reconciliation: ReconciliationResult; specGapCount: number }[] = [];

  for (const config of targetModules) {
    const preflight = buildModulePreflight(config, specLines, evaluatorLines, specSha, evaluatorSha);
    const preflightJson = stableStringify(preflight);
    const meta = buildPreflightMeta(config.name, preflight, generatedAt, preflightJson);
    const metaJson = stableStringify(meta);

    const preflightPath = path.join(outputDir, `${config.name}.preflight.json`);
    const metaPath = path.join(outputDir, `${config.name}.preflight.meta.json`);
    const crosswalkPath = path.join(outputDir, `${config.name}.crosswalk.json`);
    const driftPath = path.join(outputDir, `${config.name}.drift.json`);

    fs.writeFileSync(preflightPath, preflightJson);
    fs.writeFileSync(metaPath, metaJson);

    const drift = buildDriftReport(config.name, specSha, evaluatorSha, crosswalkPath);
    if (drift && (drift.specChanged || drift.evaluatorChanged)) {
      fs.writeFileSync(driftPath, stableStringify(drift));
    } else if (fs.existsSync(driftPath)) {
      // Crosswalk is current; remove stale drift file
      fs.unlinkSync(driftPath);
    }

    if (!preflight.reconciliation.clean) anyDirty = true;
    summary.push({
      module: config.name,
      reconciliation: preflight.reconciliation,
      specGapCount: preflight.specGaps.count,
    });
  }

  console.log('=== Audit Pre-Flight Reconciliation Summary ===');
  for (const s of summary) {
    const r = s.reconciliation;
    const status = r.clean ? 'CLEAN' : 'DIVERGENT';
    console.log(
      `  ${s.module}: ${status} | registry=${r.registryCount} evaluator=${r.evaluatorCount} ` +
        `gapsPush=${r.gapsPushCount} specGaps=${s.specGapCount} ` +
        `regOrphans=${r.registryOrphans.length} evalOrphans=${r.evaluatorOrphans.length}`,
    );
    if (r.registryOrphans.length > 0) {
      console.log(`    Registry orphans: ${r.registryOrphans.join(', ')}`);
    }
    if (r.evaluatorOrphans.length > 0) {
      console.log(`    Evaluator orphans: ${r.evaluatorOrphans.join(', ')}`);
    }
  }
  console.log(`Output: ${outputDir}`);

  if (args.verify && anyDirty) {
    console.error('VERIFY MODE: at least one module has divergence; exiting 1.');
    process.exit(1);
  }
  process.exit(0);
}

// Only run main when executed directly, not when imported by tests
if (require.main === module) {
  main();
}
