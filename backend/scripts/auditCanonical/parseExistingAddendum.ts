/**
 * parseExistingAddendum.ts — parse hand-authored Phase 0B addenda into
 * <MODULE>.crosswalk.draft.json starting drafts (Option β per operator decision).
 *
 * Phase 5 verifies these drafts row-by-row against spec.json/code.json before
 * promoting to canonical. Drafts are marked draft: true at the top level.
 *
 * Per-row: parseSource records the addendum line number; parseConfidence indicates
 * how cleanly the row was parsed (1.0 = unambiguous; <0.5 = needs human review).
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/parseExistingAddendum.ts --module VHD
 *   npx tsx backend/scripts/auditCanonical/parseExistingAddendum.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleCode,
  Tier,
  CodeExtract,
  SpecExtract,
} from './lib/types';
import {
  Crosswalk,
  CrosswalkRow,
  CrosswalkExtra,
  Classification,
  RuleBodyCite,
} from './crosswalkSchema';
import { ReconciliationResult } from './reconcile';
import {
  MODULE_CONFIGS,
  REPO_ROOT,
  CANONICAL_OUTPUT_DIR,
  getModuleConfig,
} from './lib/modules';
import { readLines, stableStringify } from './lib/utils';

const ADDENDUM_PATHS: Record<ModuleCode, string> = {
  HF: 'docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md',
  EP: 'docs/audit/PHASE_0B_EP_AUDIT_ADDENDUM.md',
  SH: 'docs/audit/PHASE_0B_SH_AUDIT_ADDENDUM.md',
  CAD: 'docs/audit/PHASE_0B_CAD_AUDIT_ADDENDUM.md',
  VHD: 'docs/audit/PHASE_0B_VHD_AUDIT_ADDENDUM.md',
  PV: 'docs/audit/PHASE_0B_PV_AUDIT_REPORT_ADDENDUM.md',
};

// =============================================================================
// Row-level parser
// =============================================================================

interface ParsedRow {
  readonly specGapId: string;
  readonly tier: Tier | null;
  readonly classification: Classification | null;
  readonly registryIdsFromCell: readonly string[];
  readonly notesFromCell: string;
  readonly classCell: string;
  readonly addendumLine: number;
  readonly parseConfidence: number;
}

const GAP_ID_REGEX = /^\| (?:\*\*)?\s*(GAP-[A-Z]+-\d+)\s*(?:\*\*)?\s*\|/;

const TIER_REGEX = /^T[123]$/;

const CLASSIFICATION_TOKENS: ReadonlyMap<string, Classification> = new Map([
  ['DET_OK', 'DET_OK'],
  ['PRODUCTION_GRADE', 'PRODUCTION_GRADE'],
  ['SPEC_ONLY', 'SPEC_ONLY'],
  ['PARTIAL', 'PARTIAL_DETECTION'],
  ['PARTIAL_DETECTION', 'PARTIAL_DETECTION'],
]);

/** Extract backtick-wrapped registry IDs from a cell (`gap-xxx`). */
function extractRegistryIds(cell: string): string[] {
  const ids: string[] = [];
  const re = /`([a-z][a-z0-9-]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cell)) !== null) {
    if (m[1].startsWith('gap-')) ids.push(m[1]);
  }
  return ids;
}

/** Strip markdown bold/italic wrappers and whitespace. */
function cleanCell(cell: string): string {
  return cell.replace(/^\*+|\*+$/g, '').trim();
}

/** Parse a single addendum row. Returns null if not a recognizable gap row. */
export function parseAddendumRow(line: string, lineNum: number): ParsedRow | null {
  const idMatch = line.match(GAP_ID_REGEX);
  if (!idMatch) return null;
  const specGapId = idMatch[1];

  // Split on `|`, drop leading/trailing empty cells from `| ... |`
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 4) return null; // Malformed
  // Remove leading and trailing empty (from outer `|`)
  if (cells[0] === '') cells.shift();
  if (cells[cells.length - 1] === '') cells.pop();

  // Find tier: first cell matching ^T[123]$ (after stripping markdown)
  let tier: Tier | null = null;
  for (const c of cells) {
    const cleaned = cleanCell(c);
    if (TIER_REGEX.test(cleaned)) {
      tier = cleaned as Tier;
      break;
    }
  }

  // Find classification: scan cells from RIGHT, find first that matches a classification token
  let classification: Classification | null = null;
  let classCell = '';
  for (let i = cells.length - 1; i >= 0; i--) {
    const cleaned = cleanCell(cells[i]).toUpperCase().replace(/\s+/g, '_');
    const cls = CLASSIFICATION_TOKENS.get(cleaned);
    if (cls) {
      classification = cls;
      classCell = cells[i];
      break;
    }
  }

  // Find impl cell: cell with backtick-wrapped gap-* registry IDs, OR cell containing "registry"/"line"/"no evaluator" prose
  // Prefer cell with most backtick gap-* tokens
  let registryIds: string[] = [];
  let notesFromCell = '';
  let bestImplIdx = -1;
  let bestCount = 0;
  for (let i = 0; i < cells.length; i++) {
    const ids = extractRegistryIds(cells[i]);
    if (ids.length > bestCount) {
      bestCount = ids.length;
      registryIds = ids;
      bestImplIdx = i;
    }
  }
  if (bestImplIdx >= 0) {
    notesFromCell = cells[bestImplIdx].replace(/`[^`]*`/g, '').trim();
  } else {
    // No backtick-wrapped registry ID. Look for a cell with prose (impl-prose case).
    // Heuristic: the cell that mentions "registry", "evaluator", "line", "no", or "—" but isn't the spec-gap text or the class cell
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      if (c === classCell) continue;
      if (/(registry|evaluator|line\s+\d+|no\s+\w+|—)/i.test(c)) {
        notesFromCell = c;
        break;
      }
    }
  }

  // parseConfidence
  let confidence = 0.5;
  if (specGapId && tier && classification) confidence = 0.85;
  if (classification === 'SPEC_ONLY' && registryIds.length === 0) confidence = 0.9;
  if (classification && classification !== 'SPEC_ONLY' && registryIds.length === 1) confidence = 0.95;
  if (registryIds.length > 1) confidence = Math.max(0.5, confidence - 0.15);
  if (notesFromCell.length > 80) confidence = Math.max(0.5, confidence - 0.1);
  if (!tier || !classification) confidence = 0.3;

  return {
    specGapId,
    tier,
    classification,
    registryIdsFromCell: registryIds,
    notesFromCell,
    classCell,
    addendumLine: lineNum,
    parseConfidence: Math.round(confidence * 100) / 100,
  };
}

// =============================================================================
// Build crosswalk draft from parsed rows
// =============================================================================

interface BuildContext {
  readonly module: ModuleCode;
  readonly spec: SpecExtract;
  readonly code: CodeExtract;
  readonly reconciliation: ReconciliationResult;
}

/** Build a CrosswalkRow from a ParsedRow + extract context. */
function buildCrosswalkRow(parsed: ParsedRow, ctx: BuildContext): CrosswalkRow {
  // Look up spec.json gap to get authoritative tier/specLine
  const specGap = ctx.spec.gaps.find((g) => g.id === parsed.specGapId);
  const tier = specGap?.tier ?? parsed.tier ?? 'T2';
  const specLine = specGap?.specLine ?? 0;

  // Build ruleBodyCite from first backtick registry ID, looking up registryLine + evaluator block
  let ruleBodyCite: RuleBodyCite | null = null;
  if (
    parsed.classification &&
    parsed.classification !== 'SPEC_ONLY' &&
    parsed.registryIdsFromCell.length > 0
  ) {
    const regId = parsed.registryIdsFromCell[0];
    const reg = ctx.code.registry.find((r) => r.id === regId);
    if (reg) {
      // Find evaluator block via reconciliation matches
      const m = ctx.reconciliation.matches.find((m) => m.registryId === regId);
      if (m) {
        const evBlock = ctx.code.evaluatorBlocks.find((b) => b.name === m.evaluatorBlockName);
        if (evBlock) {
          ruleBodyCite = {
            registryId: regId,
            registryLine: reg.registryLine,
            evaluatorBlockName: evBlock.name,
            evaluatorBodyLineRange: [evBlock.bodyStartLine, evBlock.bodyEndLine] as const,
            evaluatorModule: ctx.module,
          };
        }
      }
    }
  }

  // Build auditNotes: combine cell notes + backtick IDs (if multiple) + parsed flags
  const noteParts: string[] = [];
  if (parsed.notesFromCell) noteParts.push(parsed.notesFromCell);
  if (parsed.registryIdsFromCell.length > 1) {
    noteParts.push(`Multiple registry ids cited: ${parsed.registryIdsFromCell.join(', ')}`);
  }
  if (parsed.classification && parsed.classification !== 'SPEC_ONLY' && !ruleBodyCite) {
    noteParts.push('AUTO-PARSE: classified non-SPEC_ONLY but no matching ruleBodyCite found in extracts; verify in Phase 5');
  }

  return {
    specGapId: parsed.specGapId,
    specLine,
    tier: tier as Tier,
    classification: parsed.classification ?? 'SPEC_ONLY',
    ruleBodyCite,
    auditNotes: noteParts.join(' | '),
    inferredSafetyTag: null,
    inferredSafetyRationale: null,
    parseSource: `addendum-line-${parsed.addendumLine}`,
    parseConfidence: parsed.parseConfidence,
  };
}

/** Parse an addendum file into a Crosswalk draft. */
export function parseAddendumToDraft(
  module: ModuleCode,
  addendumPath: string,
  ctx: BuildContext,
): { crosswalk: Crosswalk; parseStats: ParseStats } {
  if (!fs.existsSync(addendumPath)) {
    return {
      crosswalk: emptyDraft(module),
      parseStats: { rowsParsed: 0, rowsByConfidence: { high: 0, medium: 0, low: 0 }, missingSpecGaps: ctx.spec.gaps.length, addendumLineRange: [0, 0] },
    };
  }

  const lines = readLines(addendumPath);
  const parsedRows: ParsedRow[] = [];
  let firstLine = 0;
  let lastLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseAddendumRow(lines[i], i + 1);
    if (parsed) {
      parsedRows.push(parsed);
      if (firstLine === 0) firstLine = i + 1;
      lastLine = i + 1;
    }
  }

  // Deduplicate: per spec gap, keep the row with highest parseConfidence
  // (some addenda repeat the same gap in §4 subcategory + §4.5 T1 SPEC_ONLY + §11 cross-module)
  const byId = new Map<string, ParsedRow>();
  for (const r of parsedRows) {
    const existing = byId.get(r.specGapId);
    if (!existing || r.parseConfidence > existing.parseConfidence) {
      byId.set(r.specGapId, r);
    }
  }

  // Build CrosswalkRow per parsed gap
  const rows: CrosswalkRow[] = [];
  for (const parsed of byId.values()) {
    rows.push(buildCrosswalkRow(parsed, ctx));
  }

  // Add SPEC_ONLY rows for spec gaps not present in the addendum (uncovered in addendum)
  const specGapIds = new Set(rows.map((r) => r.specGapId));
  for (const g of ctx.spec.gaps) {
    if (!specGapIds.has(g.id)) {
      rows.push({
        specGapId: g.id,
        specLine: g.specLine,
        tier: g.tier,
        classification: 'SPEC_ONLY',
        ruleBodyCite: null,
        auditNotes: 'Not classified in source addendum; defaulted to SPEC_ONLY for completeness',
        inferredSafetyTag: null,
        inferredSafetyRationale: null,
        parseSource: 'addendum-default-SPEC_ONLY',
        parseConfidence: 0.3,
      });
    }
  }

  // Sort rows by specLine ascending
  rows.sort((a, b) => a.specLine - b.specLine);

  const high = rows.filter((r) => (r.parseConfidence ?? 0) >= 0.85).length;
  const medium = rows.filter((r) => (r.parseConfidence ?? 0) >= 0.5 && (r.parseConfidence ?? 0) < 0.85).length;
  const low = rows.filter((r) => (r.parseConfidence ?? 0) < 0.5).length;
  const missingFromAddendum = ctx.spec.gaps.length - byId.size;

  return {
    crosswalk: {
      module,
      crosswalkVersion: '1.0',
      auditDate: new Date().toISOString().slice(0, 10),
      auditMethod: module === 'VHD' ? 'rule-body-citation-verified' : 'rule-body-verified',
      draft: true,
      rows,
      extras: [],
      strategicPosture: '',
      sequencingNotes: '',
      lessonsLearned: '',
    },
    parseStats: {
      rowsParsed: byId.size,
      rowsByConfidence: { high, medium, low },
      missingSpecGaps: missingFromAddendum,
      addendumLineRange: [firstLine, lastLine],
    },
  };
}

interface ParseStats {
  readonly rowsParsed: number;
  readonly rowsByConfidence: { high: number; medium: number; low: number };
  readonly missingSpecGaps: number;
  readonly addendumLineRange: readonly [number, number];
}

function emptyDraft(module: ModuleCode): Crosswalk {
  return {
    module,
    crosswalkVersion: '1.0',
    auditDate: new Date().toISOString().slice(0, 10),
    auditMethod: 'name-match',
    draft: true,
    rows: [],
    extras: [],
    strategicPosture: '',
    sequencingNotes: '',
    lessonsLearned: '',
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

  console.log('=== parseExistingAddendum.ts ===');
  for (const cfg of targets) {
    const specPath = path.join(inputDir, `${cfg.code}.spec.json`);
    const codePath = path.join(inputDir, `${cfg.code}.code.json`);
    const reconPath = path.join(inputDir, `${cfg.code}.reconciliation.json`);
    if (!fs.existsSync(specPath) || !fs.existsSync(codePath) || !fs.existsSync(reconPath)) {
      console.error(`  ${cfg.code}: SKIPPED — missing spec/code/reconciliation extracts`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as SpecExtract;
    const code = JSON.parse(fs.readFileSync(codePath, 'utf8')) as CodeExtract;
    const reconciliation = JSON.parse(fs.readFileSync(reconPath, 'utf8')) as ReconciliationResult;

    const addendumPath = path.join(REPO_ROOT, ADDENDUM_PATHS[cfg.code]);
    const ctx: BuildContext = { module: cfg.code, spec, code, reconciliation };
    const { crosswalk, parseStats } = parseAddendumToDraft(cfg.code, addendumPath, ctx);

    const outPath = path.join(outputDir, `${cfg.code}.crosswalk.draft.json`);
    fs.writeFileSync(outPath, stableStringify(crosswalk));

    console.log(
      `  ${cfg.code}: ${parseStats.rowsParsed}/${spec.gaps.length} parsed | ` +
        `confidence: H=${parseStats.rowsByConfidence.high} M=${parseStats.rowsByConfidence.medium} L=${parseStats.rowsByConfidence.low} | ` +
        `defaulted-SPEC_ONLY: ${parseStats.missingSpecGaps} | ` +
        `addendum lines [${parseStats.addendumLineRange[0]}-${parseStats.addendumLineRange[1]}]`,
    );
  }
  console.log(`Output: ${outputDir}`);
}

if (require.main === module) {
  main();
}
