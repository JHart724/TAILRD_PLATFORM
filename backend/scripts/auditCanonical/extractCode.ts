/**
 * extractCode.ts — canonical code extractor per docs/audit/AUDIT_METHODOLOGY.md §2.1.B.
 *
 * Reads backend/src/ingestion/gaps/gapRuleEngine.ts and emits one
 * docs/audit/canonical/<MODULE>.code.json per module, plus its sidecar provenance.
 *
 * Mechanical extraction. No semantic interpretation of rule trigger logic — that
 * is the audit author's job in <MODULE>.crosswalk.json.
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/extractCode.ts --module VHD
 *   npx tsx backend/scripts/auditCanonical/extractCode.ts --all
 *   npx tsx backend/scripts/auditCanonical/extractCode.ts --output <dir>
 *
 * Exit codes:
 *   0 — extraction succeeded for all selected modules
 *   2 — script error (file read failure, parse error, brace-balance error)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleConfig,
  ModuleCode,
  CommentPattern,
  RegistryEntry,
  EvaluatorBlock,
  CodeExtract,
  ExtractMeta,
} from './lib/types';
import {
  MODULE_CONFIGS,
  REPO_ROOT,
  EVALUATOR_PATH,
  CANONICAL_OUTPUT_DIR,
  EXTRACTOR_VERSION,
} from './lib/modules';
import {
  readLines,
  sha256,
  escapeRegExp,
  stableStringify,
  relativePosix,
  findIfBlockBoundaries,
} from './lib/utils';

const SCRIPT_RELPATH = 'backend/scripts/auditCanonical/extractCode.ts';

// =============================================================================
// Registry extraction (object-literal walk)
// =============================================================================

const OBJ_OPEN_REGEX = /^\s*\{\s*$/;
const OBJ_CLOSE_REGEX = /^\s*\},?\s*$/;
const FIELD_REGEXES: Record<string, RegExp> = {
  id: /id:\s*'([^']+)'/,
  name: /name:\s*'((?:[^'\\]|\\.)*)'/,
  module: /module:\s*'([^']+)'/,
  guidelineSource: /guidelineSource:\s*'((?:[^'\\]|\\.)*)'/,
  guidelineVersion: /guidelineVersion:\s*'([^']+)'/,
  classOfRecommendation: /classOfRecommendation:\s*'([^']+)'/,
  levelOfEvidence: /levelOfEvidence:\s*'([^']+)'/,
  lastReviewDate: /lastReviewDate:\s*'([^']+)'/,
  nextReviewDue: /nextReviewDue:\s*'([^']+)'/,
};

interface PendingRegistryObject {
  id?: string;
  idLine?: number;
  module?: string;
  name?: string;
  guidelineSource?: string;
  classOfRecommendation?: string;
  levelOfEvidence?: string;
  lastReviewDate?: string;
  nextReviewDue?: string;
}

/**
 * Extract registry entries (top-level RUNTIME_GAP_REGISTRY array entries) for a module.
 * Walks the registry array looking for `{ id: '...', module: '<ENUM>', ... }` blocks.
 */
export function extractRegistry(
  lines: readonly string[],
  enumName: string,
): RegistryEntry[] {
  const entries: RegistryEntry[] = [];
  let inObj = false;
  let pending: PendingRegistryObject = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inObj && OBJ_OPEN_REGEX.test(line)) {
      inObj = true;
      pending = {};
      continue;
    }
    if (!inObj) continue;

    // Match each field
    for (const [fieldName, regex] of Object.entries(FIELD_REGEXES)) {
      const m = line.match(regex);
      if (!m) continue;
      const v = m[1];
      switch (fieldName) {
        case 'id':
          if (pending.id === undefined) {
            pending.id = v;
            pending.idLine = i + 1;
          }
          break;
        case 'module':
          if (pending.module === undefined) pending.module = v;
          break;
        case 'name':
          if (pending.name === undefined) pending.name = v;
          break;
        case 'guidelineSource':
          if (pending.guidelineSource === undefined) pending.guidelineSource = v;
          break;
        case 'classOfRecommendation':
          if (pending.classOfRecommendation === undefined) pending.classOfRecommendation = v;
          break;
        case 'levelOfEvidence':
          if (pending.levelOfEvidence === undefined) pending.levelOfEvidence = v;
          break;
        case 'lastReviewDate':
          if (pending.lastReviewDate === undefined) pending.lastReviewDate = v;
          break;
        case 'nextReviewDue':
          if (pending.nextReviewDue === undefined) pending.nextReviewDue = v;
          break;
      }
    }

    if (OBJ_CLOSE_REGEX.test(line)) {
      if (pending.id && pending.module === enumName && pending.idLine !== undefined) {
        entries.push({
          id: pending.id,
          registryLine: pending.idLine,
          name: pending.name ?? null,
          guidelineSource: pending.guidelineSource ?? null,
          classOfRecommendation: pending.classOfRecommendation ?? null,
          levelOfEvidence: pending.levelOfEvidence ?? null,
          lastReviewDate: pending.lastReviewDate ?? null,
          nextReviewDue: pending.nextReviewDue ?? null,
        });
      }
      inObj = false;
    }
  }

  // Sort by registryLine ascending (deterministic)
  entries.sort((a, b) => a.registryLine - b.registryLine);
  return entries;
}

// =============================================================================
// Evaluator block extraction (multi-pattern)
// =============================================================================

interface PatternMatch {
  readonly pattern: CommentPattern;
  /** Captured canonical name (e.g., "VD-1", "EP-LAAC", "Gap 39", "EP-017"). */
  readonly name: string;
}

/**
 * Detect which comment pattern (if any) the line matches, and capture the canonical name.
 * Patterns checked in priority order (most-specific first):
 *
 *   1. GAP_MOD_NAME: `// Gap MOD-NAME:` (alpha suffix; `Gap CAD-STATIN:`)
 *   2. GAP_MOD_N:    `// Gap MOD-N(-SUFFIX)?:` (numeric primary suffix; `Gap HF-37-FU:`)
 *   3. GAP_N:        `// Gap N:` (no module prefix; `Gap 1:`)
 *   4. ID_NAME:      `// MOD-NAME:` (alpha suffix; `CAD-ACEI:`)
 *   5. ID_N:         `// MOD-N` (numeric suffix; `EP-017`)
 */
export function detectCommentPattern(line: string): PatternMatch | null {
  const stripped = line.replace(/^\s*\/\/\s*/, '');

  // Compound: `Gap EP-RC + EP-017:` — match as GAP_MOD_NAME on first segment
  const compoundMatch = stripped.match(/^Gap\s+([A-Z]+)-([A-Z][A-Z0-9_-]*?)\s+\+/);
  if (compoundMatch) {
    return { pattern: 'GAP_MOD_NAME', name: `${compoundMatch[1]}-${compoundMatch[2]}` };
  }

  // 1. GAP_MOD_NAME — `Gap MOD-NAME:` where NAME starts with alpha (after MOD- prefix)
  const gapModNameMatch = stripped.match(/^Gap\s+([A-Z]+)-([A-Z][A-Z0-9_-]*?):/);
  if (gapModNameMatch) {
    return { pattern: 'GAP_MOD_NAME', name: `${gapModNameMatch[1]}-${gapModNameMatch[2]}` };
  }

  // 2. GAP_MOD_N — `Gap MOD-N(-SUFFIX)?:`
  const gapModNMatch = stripped.match(/^Gap\s+([A-Z]+)-(\d+(?:-[A-Z]+)?):/);
  if (gapModNMatch) {
    return { pattern: 'GAP_MOD_N', name: `${gapModNMatch[1]}-${gapModNMatch[2]}` };
  }

  // 3. GAP_N — `Gap N:` (no module prefix)
  const gapNMatch = stripped.match(/^Gap\s+(\d+):/);
  if (gapNMatch) {
    return { pattern: 'GAP_N', name: `Gap-${gapNMatch[1]}` };
  }

  // 4. ID_NAME — `MOD-NAME:` (alpha suffix, no `Gap ` prefix)
  const idNameMatch = stripped.match(/^([A-Z]+)-([A-Z][A-Z0-9_-]*?):/);
  if (idNameMatch) {
    return { pattern: 'ID_NAME', name: `${idNameMatch[1]}-${idNameMatch[2]}` };
  }

  // 5. ID_N — `MOD-N(-SUFFIX)?` (numeric suffix, no `Gap ` prefix; trailing colon optional)
  const idNMatch = stripped.match(/^([A-Z]+)-(\d+(?:-[A-Z]+)?)(?::|\s|$)/);
  if (idNMatch) {
    return { pattern: 'ID_N', name: `${idNMatch[1]}-${idNMatch[2]}` };
  }

  return null;
}

/**
 * Determine the module of an evaluator block from its canonical name or surrounding
 * code prefix. Returns the module code prefix in lowercase ("vd", "hf", etc.) or null
 * if the block can't be assigned to a module by name alone (e.g., GAP_N pattern).
 */
function moduleHintFromBlockName(name: string): string | null {
  // Names follow {MOD}-{rest} where MOD is 2-3 uppercase letters
  const m = name.match(/^([A-Z]{2,4})-/);
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  // Map prefix to module code-prefix (note: VHD evaluators use "VD" prefix in code)
  const map: Record<string, string> = {
    hf: 'hf',
    ep: 'ep',
    sh: 'sh',
    cad: 'cad',
    vd: 'vd',
    pv: 'pv',
  };
  return map[prefix] ?? null;
}

/**
 * Determine the module of an evaluator block by inspecting the body for
 * `module: ModuleType.<ENUM>` tags. This is the authoritative module assignment
 * for blocks whose comment names don't carry a module prefix (e.g., `// Gap 1:` for HF).
 */
function moduleEnumFromBody(
  lines: readonly string[],
  bodyStart: number,
  bodyEnd: number,
): string | null {
  const re = /module:\s*ModuleType\.([A-Z_]+)\b/;
  for (let i = bodyStart - 1; i < Math.min(bodyEnd, lines.length); i++) {
    const m = lines[i].match(re);
    if (m) return m[1];
  }
  return null;
}

const MAX_BLOCK_SCAN_LINES = 200;

/**
 * Extract `gaps.push({status: '...'})` status strings inside an evaluator block body.
 * Returns the captured status strings in source order. Used as `gapsPushIds` for
 * crosswalk authors to verify which gaps a block emits.
 */
function extractGapsPushIds(
  lines: readonly string[],
  bodyStart: number,
  bodyEnd: number,
): string[] {
  const ids: string[] = [];
  // Match status: '...' or status: "..."
  const re = /status:\s*['"`]([^'"`]+)['"`]/;
  // gaps.push expects the status to appear in the body; some statuses are template literals.
  // For determinism, only capture simple-quoted status values.
  for (let i = bodyStart - 1; i < Math.min(bodyEnd, lines.length); i++) {
    if (!/gaps\.push\(/.test(lines[i])) {
      // Check if previous line had gaps.push and this line has status
      // Walk forward up to ~10 lines from a gaps.push to find its status field
      continue;
    }
    // Once we find gaps.push, scan up to 30 lines forward for the status
    for (let j = i; j < Math.min(i + 30, bodyEnd, lines.length); j++) {
      const m = lines[j].match(re);
      if (m) {
        ids.push(m[1]);
        break;
      }
    }
  }
  return ids;
}

/**
 * Walk the evaluator file end-to-end, detecting comment-pattern matches and emitting
 * EvaluatorBlock entries. Each match's body line range is computed via the
 * string-literal-aware brace walker.
 *
 * Block ownership (module assignment) for each detected block:
 *   1. Use moduleEnumFromBody if a `module: ModuleType.<ENUM>` tag is present in the body
 *   2. Else fall back to moduleHintFromBlockName based on the comment prefix
 *   3. Blocks that match neither remain unassigned (rare)
 */
export function extractEvaluatorBlocksForModule(
  lines: readonly string[],
  enumName: string,
  codePrefix: string,
): EvaluatorBlock[] {
  const blocks: EvaluatorBlock[] = [];
  const seenLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (seenLines.has(i + 1)) continue;
    if (!/^\s*\/\//.test(line)) continue;
    const pm = detectCommentPattern(line);
    if (!pm) continue;

    // Determine block boundaries
    let openLine: number;
    let closeLine: number;
    try {
      const b = findIfBlockBoundaries(lines, i + 1, MAX_BLOCK_SCAN_LINES, pm.name);
      openLine = b.openLine;
      closeLine = b.closeLine;
    } catch (e) {
      // Some comments (like the file-header comment at line 2) won't have a following if-block.
      // Skip these silently — they're not evaluator blocks.
      continue;
    }

    // Module assignment
    const enumFromBody = moduleEnumFromBody(lines, openLine, closeLine);
    let assignedModule: string | null = null;
    if (enumFromBody) {
      assignedModule = enumFromBody;
    } else {
      const codeHint = moduleHintFromBlockName(pm.name);
      if (codeHint === codePrefix) assignedModule = enumName;
    }

    // Skip blocks that don't belong to this module
    if (assignedModule !== enumName) continue;

    const gapsPushIds = extractGapsPushIds(lines, openLine, closeLine);

    blocks.push({
      name: pm.name,
      commentLine: i + 1,
      commentLiteral: line.trim(),
      commentPattern: pm.pattern,
      bodyStartLine: openLine,
      bodyEndLine: closeLine,
      gapsPushIds,
    });
    seenLines.add(i + 1);
  }

  // Sort by commentLine ascending (already is, but make explicit)
  blocks.sort((a, b) => a.commentLine - b.commentLine);
  return blocks;
}

// =============================================================================
// gaps.push count for module
// =============================================================================

export function countGapsPush(lines: readonly string[], enumName: string): number {
  const re = new RegExp(`module:\\s*ModuleType\\.${escapeRegExp(enumName)}\\b`);
  let count = 0;
  for (const line of lines) {
    if (re.test(line)) count++;
  }
  return count;
}

// =============================================================================
// Build CodeExtract for a module
// =============================================================================

export function buildCodeExtract(
  config: ModuleConfig,
  lines: readonly string[],
): CodeExtract {
  const registry = extractRegistry(lines, config.enumName);
  const evaluatorBlocks = extractEvaluatorBlocksForModule(
    lines,
    config.enumName,
    config.codePrefix,
  );
  const gapsPushCount = countGapsPush(lines, config.enumName);
  return {
    module: config.code,
    codeSource: relativePosix(EVALUATOR_PATH, REPO_ROOT),
    registry,
    evaluatorBlocks,
    gapsPushCount,
    moduleTagPattern: `module: ModuleType.${config.enumName}`,
  };
}

export function buildCodeMeta(module: ModuleCode, sourceSha: string, generatedAt: string): ExtractMeta {
  return {
    module,
    generatedAt,
    generatedBy: 'extractCode',
    extractorVersion: EXTRACTOR_VERSION,
    extractorScript: SCRIPT_RELPATH,
    sourceSha256: sourceSha,
  };
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv: readonly string[]): {
  module?: ModuleCode;
  all: boolean;
  output?: string;
} {
  let mod: ModuleCode | undefined;
  let all = false;
  let output: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      const candidate = argv[i + 1].toUpperCase();
      if (!MODULE_CONFIGS.find((m) => m.code === candidate)) {
        throw new Error(
          `Invalid module "${candidate}". Valid: ${MODULE_CONFIGS.map((m) => m.code).join(', ')}`,
        );
      }
      mod = candidate as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--output' && argv[i + 1]) {
      output = argv[i + 1];
      i++;
    }
  }
  return { module: mod, all, output };
}

function main(): void {
  const args = parseArgs(process.argv);
  if (!args.module && !args.all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const outputDir = args.output ? path.resolve(args.output) : CANONICAL_OUTPUT_DIR;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(EVALUATOR_PATH)) {
    console.error(`ERROR: evaluator file not found at ${EVALUATOR_PATH}`);
    process.exit(2);
  }

  const targets = args.all
    ? MODULE_CONFIGS
    : MODULE_CONFIGS.filter((m) => m.code === args.module);

  const lines = readLines(EVALUATOR_PATH);
  const sourceSha = sha256(EVALUATOR_PATH);
  const generatedAt = new Date().toISOString();

  console.log('=== extractCode.ts ===');
  for (const cfg of targets) {
    try {
      const extract = buildCodeExtract(cfg, lines);
      const meta = buildCodeMeta(cfg.code, sourceSha, generatedAt);

      const extractPath = path.join(outputDir, `${cfg.code}.code.json`);
      const metaPath = path.join(outputDir, `${cfg.code}.code.meta.json`);

      fs.writeFileSync(extractPath, stableStringify(extract));
      fs.writeFileSync(metaPath, stableStringify(meta));

      const patternCounts: Record<string, number> = {};
      for (const b of extract.evaluatorBlocks) {
        patternCounts[b.commentPattern] = (patternCounts[b.commentPattern] || 0) + 1;
      }
      const patternSummary = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}=${c}`)
        .join(' ');

      console.log(
        `  ${cfg.code}: registry=${extract.registry.length} evaluator=${extract.evaluatorBlocks.length} ` +
          `gapsPush=${extract.gapsPushCount} | patterns: ${patternSummary}`,
      );
    } catch (e) {
      const err = e as Error;
      console.error(`  ${cfg.code}: FAILED — ${err.name}: ${err.message}`);
      process.exit(2);
    }
  }
  console.log(`Output: ${outputDir}`);
}

if (require.main === module) {
  main();
}
