/**
 * AUDIT-204: precise type-check-coverage detector.
 *
 * Replaces the coarse `grep -r "@ts-nocheck" backend/src/` (CLAUDE.md section-18 3-check gate item 1),
 * which matched the LITERAL STRING anywhere - including JSDoc prose and mid-file mentions - and so
 * raised a FALSE POSITIVE on buildPatientEvalContext.ts (a comment on line 55 that merely NOTES the
 * runners are suppressed) while nobody was auditing type-check coverage at all.
 *
 * This detector matches `@ts-nocheck` ONLY inside a file's LEADING comment block (the run of blank /
 * `//` / `/* ... *​/` lines before the first code statement) - which is the ONLY place TypeScript
 * honors the directive - and cross-checks every real hit against the section-14 sanctioned list.
 * It FAILS (exit 1) on any unsanctioned leading-block directive.
 *
 * The pattern behind AUDIT-203 + AUDIT-204: both gaps existed because nobody audited the COVERAGE of
 * an invariant (audit-write coverage / type-check coverage). Both were found by accident. The durable
 * answer is enforcement in CI, not vigilance - AUDIT-203's is its auditTrailClass suite, AUDIT-204's
 * is this detector.
 */

import * as fs from 'fs';
import * as path from 'path';

// Section-14 sanctioned exceptions (backend-relative posix paths). Keep in lock-step with CLAUDE.md
// section 14: adding a file here WITHOUT a section-14 entry (and vice versa) is itself drift.
export const SANCTIONED: ReadonlySet<string> = new Set<string>([
  'src/ingestion/gaps/gapRuleEngine.ts',
  'src/ingestion/runGapDetectionForPatient.ts',
]);

// TypeScript honors @ts-nocheck ONLY in a `//` (or `///`) LINE comment - never inside a `/* ... *​/`
// block/JSDoc comment. So a `@ts-nocheck` token in prose inside a JSDoc suppresses NOTHING, and flagging
// it would reproduce the very false-positive class this detector exists to kill. This regex matches TS's
// own rule (`/^\/\/\/?\s*@ts-nocheck/`).
const LINE_DIRECTIVE = /^\/\/\/?\s*@ts-nocheck\b/;

/**
 * True iff an EFFECTIVE `// @ts-nocheck` line directive appears in the file's LEADING comment region -
 * the leading run of blank / line-comment / block-comment lines before the first line that contains
 * code. Block-comment (JSDoc) content is traversed to find where the leading region ends but is NEVER
 * itself treated as a directive (TS does not honor it there); mid-file mentions are excluded because the
 * scan stops at the first code line.
 */
export function hasLeadingTsNocheck(source: string): boolean {
  const lines = source.split(/\r?\n/);
  let inBlockComment = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inBlockComment) {
      if (line.includes('*/')) {
        const afterClose = line.slice(line.indexOf('*/') + 2).trim();
        inBlockComment = false;
        if (afterClose === '') continue;
        if (afterClose.startsWith('//')) { if (LINE_DIRECTIVE.test(afterClose)) return true; continue; }
        if (afterClose.startsWith('/*')) { if (!afterClose.includes('*/')) inBlockComment = true; continue; }
        break; // code shares the block-comment's closing line -> leading region ends
      }
      continue; // inside a block comment: @ts-nocheck is NOT honored here
    }
    if (line === '') continue;
    if (line.startsWith('//')) {
      if (LINE_DIRECTIVE.test(line)) return true;
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true; // single-line or opening block comment; directive not honored
      continue;
    }
    break; // first code line reached
  }
  return false;
}

/** Given files as { path (backend-relative posix), source }, return the unsanctioned leading-directive paths. */
export function findUnsanctioned(files: Array<{ path: string; source: string }>): string[] {
  return files
    .filter((f) => hasLeadingTsNocheck(f.source) && !SANCTIONED.has(f.path))
    .map((f) => f.path)
    .sort();
}

/** Recursively collect *.ts files under a backend-relative root, returning backend-relative posix paths. */
export function collectTsFiles(backendDir: string, root: string): string[] {
  const out: string[] = [];
  const walk = (absDir: string) => {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push(path.relative(backendDir, abs).split(path.sep).join('/'));
      }
    }
  };
  const absRoot = path.join(backendDir, root);
  if (fs.existsSync(absRoot)) walk(absRoot);
  return out;
}

function main(): void {
  const backendDir = path.resolve(__dirname, '..');
  const roots = ['src', 'tests', 'scripts'];
  const files = roots.flatMap((r) => collectTsFiles(backendDir, r)).map((rel) => ({
    path: rel,
    source: fs.readFileSync(path.join(backendDir, rel), 'utf8'),
  }));

  const unsanctioned = findUnsanctioned(files);
  const sanctionedPresent = files
    .filter((f) => hasLeadingTsNocheck(f.source) && SANCTIONED.has(f.path))
    .map((f) => f.path);

  console.log(`[checkTsNocheck] scanned ${files.length} .ts files across: ${roots.join(', ')}`);
  console.log(`[checkTsNocheck] sanctioned @ts-nocheck present (section-14): ${sanctionedPresent.join(', ') || '(none)'}`);

  if (unsanctioned.length > 0) {
    console.error('\n[checkTsNocheck] FAIL - unsanctioned // @ts-nocheck in a leading comment block:');
    for (const p of unsanctioned) console.error(`  - ${p}`);
    console.error(
      '\nEither remove the directive and fix the types (preferred), or - if genuinely required -\n' +
      'add the file to BOTH CLAUDE.md section 14 AND the SANCTIONED set in this script, with a rationale.\n',
    );
    process.exit(1);
  }
  console.log('[checkTsNocheck] PASS - no unsanctioned @ts-nocheck directives.');
}

// Run only as a CLI, not when imported by the test.
if (require.main === module) main();
