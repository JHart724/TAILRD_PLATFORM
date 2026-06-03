/**
 * validateEvidenceObjects.ts - evidence-object internal-consistency gate.
 *
 * Guards the FDA-CDS-exemption transparency surface against the AUDIT-103 /
 * AUDIT-100 defect class: a `gaps.push({...})` rule whose `evidence` object
 * carries a copy-pasted / wrong-provenance classOfRecommendation,
 * levelOfEvidence, or guidelineSource that disagrees with the SAME rule's own
 * `recommendations` text (and, softly, its preceding comment).
 *
 * Approach is AST-based (TypeScript compiler API), NOT regex-on-free-text:
 *   - Each `gaps.push(<objectLiteral>)` node is located structurally.
 *   - The plain-string-literal fields classOfRecommendation / levelOfEvidence /
 *     guidelineSource are read off the `evidence` object literal.
 *   - They are cross-checked against the co-located `recommendations.action` /
 *     `recommendations.guideline` string literals (HARD gate - same AST node,
 *     unambiguous 1:1 with the evidence object) and against the preceding
 *     comment (SOFT cross-check - one comment may govern multiple push nodes,
 *     so a comment divergence warns but never fails the gate; see edge case (c)).
 *
 * Cross-check semantics (both sides normalized; see normalize* helpers):
 *   - COR: graded arabic token 1 | 2a | 2b | 3 only. Non-graded evidence values
 *     ('Expert Consensus', 'FDA Mandate', 'Class 1 (data required ...)') are not
 *     false-flagged. Claim extraction excludes Vaughan-Williams arabic 1a/1c,
 *     all roman numerals (NYHA / Vaughan-Williams), and NYHA-prefixed "Class".
 *   - LOE: A | B | C with optional -R/-NR/-LD/-EO suffix. Non-graded ('FDA
 *     Mandate') skipped.
 *   - guidelineSource: 4-digit guideline YEAR set intersection (containment /
 *     primary-clause, NOT string equality) - multi-guideline ';'/'+'-joined
 *     sources carry multiple years and pass if any year overlaps. Flags only
 *     when both sides carry years and the sets are disjoint (the SH-2 catch:
 *     evidence 2023 AF-Management vs rule 2020 VHD).
 *
 * Bare-vs-prefixed evidence values ('1' vs 'Class 1', 'B' vs 'LOE B') are
 * reported as HYGIENE (non-failing). The gate does NOT rewrite source.
 *
 * BEHAVIOR: PURE HARD GATE. Exits non-zero on ANY inconsistency. No allowlist -
 * the runtime baseline is clean post-AUDIT-103.
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/validateEvidenceObjects.ts
 *   npx tsx backend/scripts/auditCanonical/validateEvidenceObjects.ts --file <path>
 *
 * Exit codes:
 *   0 - every evidence object is internally consistent with its rule
 *   1 - one or more inconsistencies found
 *   2 - script error (file read failure, parse error)
 */

import * as fs from 'fs';
import * as ts from 'typescript';
import { EVALUATOR_PATH, REPO_ROOT } from './lib/modules';
import { relativePosix } from './lib/utils';

const SCRIPT_RELPATH = 'backend/scripts/auditCanonical/validateEvidenceObjects.ts';

// =============================================================================
// Types
// =============================================================================

export type EvidenceField =
  | 'classOfRecommendation'
  | 'levelOfEvidence'
  | 'guidelineSource';

export type Severity = 'INCONSISTENCY' | 'WARN' | 'HYGIENE';

export interface Finding {
  readonly line: number;
  readonly ruleLabel: string;
  readonly field: EvidenceField;
  readonly severity: Severity;
  /** Which rule surface the conflicting claim came from. */
  readonly source: 'recommendations' | 'comment' | 'evidence';
  readonly evidenceValue: string;
  readonly claimValue: string;
  readonly message: string;
}

export interface AnalysisResult {
  readonly pushCount: number;
  readonly evidenceCount: number;
  readonly inconsistencies: Finding[];
  readonly warnings: Finding[];
  readonly hygiene: Finding[];
}

// =============================================================================
// Normalization
// =============================================================================

const COR_TOKENS = new Set(['1', '2a', '2b', '3']);

/** Strip a leading "Class " prefix; trim; lowercase. Keeps any qualifier tail. */
export function normalizeCor(raw: string): string {
  return raw.trim().replace(/^class\s+/i, '').trim().toLowerCase();
}

/**
 * Reduce an evidence COR value to its graded arabic token (1 | 2a | 2b | 3), or
 * null for non-graded values ('expert consensus', 'fda mandate'). Tolerates a
 * trailing qualifier: '3 (harm)' -> '3'; '1 (data required ...)' -> '1'.
 */
export function gradedCor(raw: string): string | null {
  const n = normalizeCor(raw);
  const m = n.match(/^(2a|2b|3|1)\b/);
  return m ? m[1] : null;
}

/** Strip a leading "LOE " prefix; trim; uppercase. */
export function normalizeLoe(raw: string): string {
  return raw.trim().replace(/^loe\s+/i, '').trim().toUpperCase();
}

/**
 * Reduce an evidence LOE value to its graded token (A | B | C, optional
 * -R/-NR/-LD/-EO), or null for non-graded values ('FDA MANDATE').
 */
export function gradedLoe(raw: string): string | null {
  const n = normalizeLoe(raw);
  const m = n.match(/^([ABC](?:-(?:NR|LD|EO|R))?)$/);
  return m ? m[1] : null;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

// =============================================================================
// Claim extraction from free text (recommendations / comment)
// =============================================================================

/**
 * Extract COR claims as graded arabic tokens from rule free text.
 *
 * ONLY arabic Class 1 | 2a | 2b | 3 are claims. Excluded as non-COR:
 *   - Vaughan-Williams arabic variants (Class 1a / 1b / 1c, Class 2c, ...) - the
 *     captured token ('1a') simply isn't in COR_TOKENS.
 *   - All roman numerals (NYHA Class II-IV, Vaughan-Williams Class I/III) - they
 *     don't start with a digit, so the `class\s+[0-9]` anchor never matches.
 *   - NYHA-prefixed "Class" (belt-and-suspenders for a hypothetical "NYHA Class 2").
 */
export function extractCorClaims(text: string): string[] {
  const out: string[] = [];
  const re = /(\w+\s+)?class\s+([0-9][0-9a-z-]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const prefixWord = (m[1] ?? '').trim().toLowerCase();
    if (prefixWord === 'nyha') continue;
    const tok = m[2].toLowerCase();
    if (COR_TOKENS.has(tok)) out.push(tok);
  }
  return out;
}

/** Extract LOE claims (A | B | C with optional -R/-NR/-LD/-EO) from rule free text. */
export function extractLoeClaims(text: string): string[] {
  const out: string[] = [];
  const re = /\bLOE\s+([abc])(?:-(nr|ld|eo|r))?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let tok = m[1].toUpperCase();
    if (m[2]) tok += '-' + m[2].toUpperCase();
    out.push(tok);
  }
  return out;
}

/** Extract 4-digit guideline years (1900-2099) from a guideline/source string. */
export function extractYears(text: string): string[] {
  const out: string[] = [];
  const re = /\b(?:19|20)\d{2}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

// =============================================================================
// AST helpers
// =============================================================================

function getPropName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  return null;
}

function findProp(
  obj: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && getPropName(p.name) === name) {
      return p.initializer;
    }
  }
  return undefined;
}

/** Return the text of a plain string literal, or null for anything computed/templated. */
function plainString(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

/**
 * Collect the leading line/block comments attached to the nearest enclosing
 * statement of `node`. Climbs parents until a comment set is found or a
 * function/source boundary is hit. SOFT signal only - a comment may govern
 * multiple push nodes (HFrEF SAFETY multi-push), so it never fails the gate.
 */
function leadingCommentText(node: ts.Node, sourceText: string): string {
  let cur: ts.Node | undefined = node;
  while (cur) {
    const ranges = ts.getLeadingCommentRanges(sourceText, cur.getFullStart());
    if (ranges && ranges.length > 0) {
      return ranges.map((r) => sourceText.slice(r.pos, r.end)).join('\n');
    }
    if (ts.isSourceFile(cur)) break;
    cur = cur.parent;
  }
  return '';
}

// =============================================================================
// Core analysis
// =============================================================================

export function analyzeSource(sourceText: string, fileLabel: string): AnalysisResult {
  const sf = ts.createSourceFile(
    fileLabel,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const inconsistencies: Finding[] = [];
  const warnings: Finding[] = [];
  const hygiene: Finding[] = [];
  let pushCount = 0;
  let evidenceCount = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'push' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'gaps' &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      pushCount++;
      handleGapObject(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  const handleGapObject = (
    call: ts.CallExpression,
    gapObj: ts.ObjectLiteralExpression,
  ): void => {
    const line = sf.getLineAndCharacterOfPosition(call.getStart(sf)).line + 1;

    const evidenceNode = findProp(gapObj, 'evidence');
    if (!evidenceNode || !ts.isObjectLiteralExpression(evidenceNode)) return;
    evidenceCount++;

    const recNode = findProp(gapObj, 'recommendations');
    const recObj =
      recNode && ts.isObjectLiteralExpression(recNode) ? recNode : undefined;

    const status = plainString(findProp(gapObj, 'status'));
    const ruleLabel = status ?? `gaps.push@${line}`;

    const evCor = plainString(findProp(evidenceNode, 'classOfRecommendation'));
    const evLoe = plainString(findProp(evidenceNode, 'levelOfEvidence'));
    const evGuide = plainString(findProp(evidenceNode, 'guidelineSource'));

    const recAction = recObj ? plainString(findProp(recObj, 'action')) : null;
    const recGuideline = recObj ? plainString(findProp(recObj, 'guideline')) : null;
    const recText = [recAction, recGuideline].filter(Boolean).join('  ');

    const commentText = leadingCommentText(call, sourceText);

    // ---- COR cross-check -----------------------------------------------------
    if (evCor !== null) {
      if (/^class\s+/i.test(evCor.trim())) {
        hygiene.push({
          line,
          ruleLabel,
          field: 'classOfRecommendation',
          severity: 'HYGIENE',
          source: 'evidence',
          evidenceValue: evCor,
          claimValue: '',
          message: `classOfRecommendation '${evCor}' uses "Class " prefix (canonical bare form: '${normalizeCor(evCor)}')`,
        });
      }
      const evTok = gradedCor(evCor);
      if (evTok !== null) {
        for (const claim of unique(extractCorClaims(recText))) {
          if (claim !== evTok) {
            inconsistencies.push({
              line,
              ruleLabel,
              field: 'classOfRecommendation',
              severity: 'INCONSISTENCY',
              source: 'recommendations',
              evidenceValue: evCor,
              claimValue: `Class ${claim}`,
              message: `evidence COR '${evCor}' (=${evTok}) disagrees with recommendations claim 'Class ${claim}'`,
            });
          }
        }
        for (const claim of unique(extractCorClaims(commentText))) {
          if (claim !== evTok) {
            warnings.push({
              line,
              ruleLabel,
              field: 'classOfRecommendation',
              severity: 'WARN',
              source: 'comment',
              evidenceValue: evCor,
              claimValue: `Class ${claim}`,
              message: `evidence COR '${evCor}' (=${evTok}) disagrees with preceding comment 'Class ${claim}' (soft: comment may govern multiple pushes)`,
            });
          }
        }
      }
    }

    // ---- LOE cross-check -----------------------------------------------------
    if (evLoe !== null) {
      if (/^loe\s+/i.test(evLoe.trim())) {
        hygiene.push({
          line,
          ruleLabel,
          field: 'levelOfEvidence',
          severity: 'HYGIENE',
          source: 'evidence',
          evidenceValue: evLoe,
          claimValue: '',
          message: `levelOfEvidence '${evLoe}' uses "LOE " prefix (canonical bare form: '${normalizeLoe(evLoe)}')`,
        });
      }
      const evTok = gradedLoe(evLoe);
      if (evTok !== null) {
        for (const claim of unique(extractLoeClaims(recText))) {
          if (claim !== evTok) {
            inconsistencies.push({
              line,
              ruleLabel,
              field: 'levelOfEvidence',
              severity: 'INCONSISTENCY',
              source: 'recommendations',
              evidenceValue: evLoe,
              claimValue: `LOE ${claim}`,
              message: `evidence LOE '${evLoe}' (=${evTok}) disagrees with recommendations claim 'LOE ${claim}'`,
            });
          }
        }
        for (const claim of unique(extractLoeClaims(commentText))) {
          if (claim !== evTok) {
            warnings.push({
              line,
              ruleLabel,
              field: 'levelOfEvidence',
              severity: 'WARN',
              source: 'comment',
              evidenceValue: evLoe,
              claimValue: `LOE ${claim}`,
              message: `evidence LOE '${evLoe}' (=${evTok}) disagrees with preceding comment 'LOE ${claim}' (soft: comment may govern multiple pushes)`,
            });
          }
        }
      }
    }

    // ---- guidelineSource year cross-check ------------------------------------
    if (evGuide !== null) {
      const evYears = unique(extractYears(evGuide));
      // Prefer the structured recommendations.guideline year set; fall back to
      // the action free-text year only when guideline carries none.
      let ctxYears = recGuideline ? unique(extractYears(recGuideline)) : [];
      if (ctxYears.length === 0 && recAction) {
        ctxYears = unique(extractYears(recAction));
      }
      if (evYears.length > 0 && ctxYears.length > 0) {
        const overlap = evYears.some((y) => ctxYears.includes(y));
        if (!overlap) {
          inconsistencies.push({
            line,
            ruleLabel,
            field: 'guidelineSource',
            severity: 'INCONSISTENCY',
            source: 'recommendations',
            evidenceValue: evGuide,
            claimValue: ctxYears.join('/'),
            message: `evidence guidelineSource year(s) [${evYears.join(', ')}] disjoint from recommendations year(s) [${ctxYears.join(', ')}]`,
          });
        }
      }
    }
  };

  visit(sf);

  // Deterministic ordering: by line, then field.
  const byLineField = (a: Finding, b: Finding): number =>
    a.line - b.line || a.field.localeCompare(b.field);
  inconsistencies.sort(byLineField);
  warnings.sort(byLineField);
  hygiene.sort(byLineField);

  return { pushCount, evidenceCount, inconsistencies, warnings, hygiene };
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv: readonly string[]): { file?: string } {
  let file: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file' && argv[i + 1]) {
      file = argv[i + 1];
      i++;
    }
  }
  return { file };
}

function main(): void {
  const args = parseArgs(process.argv);
  const targetPath = args.file ?? EVALUATOR_PATH;

  if (!fs.existsSync(targetPath)) {
    console.error(`ERROR: source file not found at ${targetPath}`);
    process.exit(2);
  }

  let sourceText: string;
  try {
    sourceText = fs.readFileSync(targetPath, 'utf8');
  } catch (e) {
    console.error(`ERROR: failed to read ${targetPath}: ${(e as Error).message}`);
    process.exit(2);
    return;
  }

  const label = relativePosix(targetPath, REPO_ROOT);
  const result = analyzeSource(sourceText, label);

  console.log('=== validateEvidenceObjects.ts ===');
  console.log(`Source: ${label}`);
  console.log(
    `gaps.push nodes: ${result.pushCount} | with evidence object: ${result.evidenceCount}`,
  );
  console.log(
    `Inconsistencies: ${result.inconsistencies.length} | Warnings (soft/comment): ${result.warnings.length} | Hygiene (prefix): ${result.hygiene.length}`,
  );

  if (result.hygiene.length > 0) {
    const corHyg = result.hygiene.filter((f) => f.field === 'classOfRecommendation').length;
    const loeHyg = result.hygiene.filter((f) => f.field === 'levelOfEvidence').length;
    console.log(
      `  hygiene detail: ${corHyg} "Class "-prefixed COR, ${loeHyg} "LOE "-prefixed LOE (non-failing; source not rewritten)`,
    );
  }

  if (result.warnings.length > 0) {
    console.log('\n--- WARN (soft comment cross-check; does NOT fail the gate) ---');
    for (const f of result.warnings) {
      console.log(`  [${f.field}] L${f.line} ${f.ruleLabel}: ${f.message}`);
    }
  }

  if (result.inconsistencies.length > 0) {
    console.log('\n--- INCONSISTENCIES (gate FAILS) ---');
    for (const f of result.inconsistencies) {
      console.log(`  [${f.field}] L${f.line} ${f.ruleLabel}: ${f.message}`);
    }
    console.error(
      `\nFAIL: ${result.inconsistencies.length} evidence-object inconsistency(ies). ` +
        `Each evidence object must agree with its rule's recommendations text. See ${SCRIPT_RELPATH}.`,
    );
    process.exit(1);
  }

  console.log('\nPASS: all evidence objects internally consistent.');
  process.exit(0);
}

if (require.main === module) {
  main();
}
