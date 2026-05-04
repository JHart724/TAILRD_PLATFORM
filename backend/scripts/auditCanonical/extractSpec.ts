/**
 * extractSpec.ts — canonical spec extractor per docs/audit/AUDIT_METHODOLOGY.md §2.1.A.
 *
 * Reads docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md and emits one
 * docs/audit/canonical/<MODULE>.spec.json per module, plus its sidecar provenance.
 *
 * Mechanical extraction. No clinical inference. Audit author classifications live
 * in <MODULE>.crosswalk.json and are out of scope for this script.
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/extractSpec.ts --module VHD
 *   npx tsx backend/scripts/auditCanonical/extractSpec.ts --all
 *   npx tsx backend/scripts/auditCanonical/extractSpec.ts --output <dir>
 *
 * Exit codes:
 *   0 — extraction succeeded for all selected modules
 *   2 — script error (file read failure, parse error, structured extraction error)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleConfig,
  ModuleCode,
  Tier,
  SafetyTagCategory,
  BswPathwayTag,
  SpecGap,
  SpecSubcategory,
  SpecExtract,
  ExtractMeta,
  InvalidTierError,
} from './lib/types';
import {
  MODULE_CONFIGS,
  REPO_ROOT,
  SPEC_PATH,
  CANONICAL_OUTPUT_DIR,
  EXTRACTOR_VERSION,
} from './lib/modules';
import { readLines, sha256, escapeRegExp, stableStringify, relativePosix } from './lib/utils';

const SCRIPT_RELPATH = 'backend/scripts/auditCanonical/extractSpec.ts';

// =============================================================================
// Subcategory header detection
// =============================================================================

const SUBCAT_HEADER_REGEX = /^([A-Z][a-zA-Z\/' \-]+?)\s*\((\d+)\s*gaps?\)\s*$/;
const MODULE_HEADER_REGEX = /^(\d+\.\d+)\s+([A-Z][^(]+)\s*\((\d+)\s*gaps?\)\s*$/;

export function findModuleHeaderLine(
  lines: readonly string[],
  range: readonly [number, number],
): number {
  // Search backwards from range[0] for the "6.X Module Name (NNN gaps)" header.
  // The header is typically a few lines before the first gap row.
  for (let i = range[0] - 1; i >= Math.max(0, range[0] - 30); i--) {
    if (MODULE_HEADER_REGEX.test(lines[i])) {
      return i + 1;
    }
  }
  // Fall back to range start if not found (rare; defensive)
  return range[0];
}

export function extractSubcategories(
  lines: readonly string[],
  range: readonly [number, number],
): SpecSubcategory[] {
  const subcats: SpecSubcategory[] = [];
  for (let i = range[0] - 1; i < Math.min(range[1], lines.length); i++) {
    const m = lines[i].match(SUBCAT_HEADER_REGEX);
    if (m) {
      subcats.push({
        name: m[1].trim(),
        headerLine: i + 1,
        gapCount: parseInt(m[2], 10),
      });
    }
  }
  return subcats;
}

// =============================================================================
// Gap row extraction
// =============================================================================

/**
 * Spec table row format (from CK v4.0 §6.X tables):
 *   | T1 | GAP-VHD-001 | <name>. <detection logic>. | <data> | <domains> | <PHI> |
 *
 * The "Gap Name and Detection Logic" cell often contains both name and logic
 * separated by ". " (period-space). When present, name = first sentence, logic
 * = remainder. When no period separator: name = full text, logic = empty.
 */
const GAP_ROW_REGEX_TEMPLATE =
  '^\\|\\s*(T[123])\\s*\\|\\s*(GAP-{PREFIX}-\\d+)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|';

function buildGapRowRegex(specCodePrefix: string): RegExp {
  return new RegExp(GAP_ROW_REGEX_TEMPLATE.replace('{PREFIX}', escapeRegExp(specCodePrefix)));
}

const DOMAIN_TOKEN_REGEX = /^D\d+$/;
const BSW_PATHWAY_REGEX = /\(P([1-4])\)/g;

/**
 * Detect spec-explicit SAFETY tag in gap text.
 * Order matters: longest match first, so "(CRITICAL SAFETY)" doesn't get
 * misclassified as "(CRITICAL)" with trailing " SAFETY)".
 */
export function detectSafetyTag(gapText: string): {
  literal: string | null;
  category: SafetyTagCategory;
} {
  if (/\(CRITICAL\s+SAFETY\)/.test(gapText)) {
    return { literal: '(CRITICAL SAFETY)', category: 'CRITICAL_SAFETY' };
  }
  if (/\(CRITICAL\)/.test(gapText)) {
    return { literal: '(CRITICAL)', category: 'CRITICAL' };
  }
  if (/\(SAFETY\)/.test(gapText)) {
    return { literal: '(SAFETY)', category: 'SAFETY' };
  }
  // SAFETY: prefix in the gap description
  const prefixMatch = gapText.match(/(^|\.\s+)SAFETY:\s+\S/);
  if (prefixMatch) {
    return { literal: 'SAFETY:', category: 'SAFETY_PREFIX' };
  }
  return { literal: null, category: null };
}

export function extractBswPathwayTags(gapText: string): BswPathwayTag[] {
  const tags = new Set<BswPathwayTag>();
  let m: RegExpExecArray | null;
  // Reset regex state (global flag is stateful)
  BSW_PATHWAY_REGEX.lastIndex = 0;
  while ((m = BSW_PATHWAY_REGEX.exec(gapText)) !== null) {
    tags.add(`P${m[1]}` as BswPathwayTag);
  }
  return [...tags].sort();
}

function splitNameAndDetection(gapNameAndLogic: string): { name: string; detectionLogic: string } {
  // Names tend to end at the first ". " — but some short rows have only a name.
  const periodIdx = gapNameAndLogic.indexOf('. ');
  if (periodIdx === -1) {
    return { name: gapNameAndLogic.trim(), detectionLogic: '' };
  }
  const name = gapNameAndLogic.slice(0, periodIdx).trim();
  const detection = gapNameAndLogic.slice(periodIdx + 2).trim();
  return { name, detectionLogic: detection };
}

export function extractGaps(
  lines: readonly string[],
  config: ModuleConfig,
  subcategories: readonly SpecSubcategory[],
): SpecGap[] {
  const gaps: SpecGap[] = [];
  const rowRegex = buildGapRowRegex(config.specCodePrefix);

  // Sort subcategories by headerLine ascending so we can track current subcategory
  // by walking the spec range linearly. This avoids per-row binary search.
  const sortedSubcats = [...subcategories].sort((a, b) => a.headerLine - b.headerLine);
  let subcatIdx = -1;

  for (let i = config.specLineRange[0] - 1; i < Math.min(config.specLineRange[1], lines.length); i++) {
    const lineNum = i + 1;

    // Advance subcategory pointer when the next subcategory's header line is reached
    while (
      subcatIdx + 1 < sortedSubcats.length &&
      sortedSubcats[subcatIdx + 1].headerLine <= lineNum
    ) {
      subcatIdx++;
    }

    const m = lines[i].match(rowRegex);
    if (!m) continue;

    const tierStr = m[1];
    if (tierStr !== 'T1' && tierStr !== 'T2' && tierStr !== 'T3') {
      throw new InvalidTierError(
        `Spec line ${lineNum} has tier marker "${tierStr}" not in {T1, T2, T3}`,
        lineNum,
        tierStr,
      );
    }
    const tier = tierStr as Tier;
    const id = m[2];
    const nameAndLogicCell = m[3].trim();
    const structuredData = m[4].trim();
    const domainsCell = m[5].trim();
    const phi = m[6].trim();

    const { name, detectionLogic } = splitNameAndDetection(nameAndLogicCell);
    const domains = domainsCell
      .split(/[,\s]+/)
      .filter((s) => DOMAIN_TOKEN_REGEX.test(s));
    const bswPathwayTags = extractBswPathwayTags(nameAndLogicCell);
    const safety = detectSafetyTag(nameAndLogicCell);

    const subcat = subcatIdx >= 0 ? sortedSubcats[subcatIdx] : null;

    gaps.push({
      id,
      specLine: lineNum,
      tier,
      tierMarkerLiteral: `| ${tier} |`,
      subcategory: subcat ? subcat.name : '',
      subcategoryHeaderLine: subcat ? subcat.headerLine : 0,
      name,
      detectionLogic,
      structuredDataElements: structuredData,
      domains,
      phi,
      bswPathwayTags,
      safetyTagLiteral: safety.literal,
      safetyTagCategory: safety.category,
    });
  }

  // Stable sort by specLine ascending (already in order by virtue of linear walk)
  gaps.sort((a, b) => a.specLine - b.specLine);
  return gaps;
}

// =============================================================================
// Build SpecExtract for a module
// =============================================================================

export function buildSpecExtract(
  config: ModuleConfig,
  lines: readonly string[],
): SpecExtract {
  const moduleHeaderLine = findModuleHeaderLine(lines, config.specLineRange);
  const subcategories = extractSubcategories(lines, config.specLineRange);
  const gaps = extractGaps(lines, config, subcategories);

  const tierTotals = {
    T1: gaps.filter((g) => g.tier === 'T1').length,
    T2: gaps.filter((g) => g.tier === 'T2').length,
    T3: gaps.filter((g) => g.tier === 'T3').length,
  };

  return {
    module: config.code,
    specSource: relativePosix(SPEC_PATH, REPO_ROOT),
    specSection: `§${config.specSection}`,
    moduleHeaderLine,
    totalGaps: gaps.length,
    tierTotals,
    subcategories,
    gaps,
  };
}

export function buildSpecMeta(module: ModuleCode, sourceSha: string, generatedAt: string): ExtractMeta {
  return {
    module,
    generatedAt,
    generatedBy: 'extractSpec',
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

  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`ERROR: spec file not found at ${SPEC_PATH}`);
    process.exit(2);
  }

  const targets = args.all
    ? MODULE_CONFIGS
    : MODULE_CONFIGS.filter((m) => m.code === args.module);

  const lines = readLines(SPEC_PATH);
  const sourceSha = sha256(SPEC_PATH);
  const generatedAt = new Date().toISOString();

  console.log('=== extractSpec.ts ===');
  for (const cfg of targets) {
    try {
      const extract = buildSpecExtract(cfg, lines);
      const meta = buildSpecMeta(cfg.code, sourceSha, generatedAt);

      const extractPath = path.join(outputDir, `${cfg.code}.spec.json`);
      const metaPath = path.join(outputDir, `${cfg.code}.spec.meta.json`);

      fs.writeFileSync(extractPath, stableStringify(extract));
      fs.writeFileSync(metaPath, stableStringify(meta));

      const safetyCount = extract.gaps.filter((g) => g.safetyTagCategory !== null).length;
      console.log(
        `  ${cfg.code}: ${extract.totalGaps} gaps (T1=${extract.tierTotals.T1} T2=${extract.tierTotals.T2} T3=${extract.tierTotals.T3}) | ` +
          `${extract.subcategories.length} subcategories | ${safetyCount} safety-tagged`,
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
