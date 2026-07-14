/**
 * AUDIT-204: tests for the precise type-check-coverage detector.
 *
 * Fixtures are in-memory strings (never real files with a leading directive, which would trip the
 * detector's own CI scan). Proves the detector: (a) does NOT flag buildPatientEvalContext-style JSDoc
 * prose, (b) DOES flag an unsanctioned leading-block directive, (c) does NOT flag the two section-14
 * sanctioned files, (d) yields a non-empty (fail) result on an unsanctioned hit.
 */
import * as fs from 'fs';
import * as path from 'path';
import { hasLeadingTsNocheck, findUnsanctioned, SANCTIONED } from '../../scripts/checkTsNocheck';

// Build the directive token at runtime so this test file's own source carries no literal leading directive.
const TOKEN = ['//', ' @ts-', 'nocheck'].join('');

// Mirrors buildPatientEvalContext.ts: leading `//` header, code at the first import, then a JSDoc that
// only MENTIONS suppression far below the first code line.
const PROSE_AFTER_CODE = `// Header line one.
//
// Header line two.

import { x } from './x';

/**
 * Uses any to avoid friction; the runners ${'@ts-' + 'nocheck'} and pass rows directly.
 */
export function f(p: any) { return p; }
`;

const LEADING_LINE_DIRECTIVE = `${TOKEN}
/** A file that genuinely suppresses type-checking from the top. */
export const y = 1;
`;

// A @ts-nocheck token INSIDE a leading block/JSDoc comment. TypeScript does NOT honor it there (only
// `//` line comments count), so it suppresses nothing and must NOT be flagged - this is exactly the
// shape of checkTsNocheck.ts's own header, which the detector must not flag itself on.
const LEADING_BLOCK_MENTION = `/* preamble
   ${'@ts-' + 'nocheck'}
*/
export const z = 2;
`;

const CLEAN = `/**
 * A normal file.
 */
export const ok = true;
`;

describe('hasLeadingTsNocheck', () => {
  test('(a) does NOT flag JSDoc prose that mentions the directive AFTER the first code line', () => {
    expect(hasLeadingTsNocheck(PROSE_AFTER_CODE)).toBe(false);
  });
  test('(b) DOES flag a leading single-line // directive', () => {
    expect(hasLeadingTsNocheck(LEADING_LINE_DIRECTIVE)).toBe(true);
  });
  test('does NOT flag a @ts-nocheck mention inside a leading BLOCK/JSDoc comment (TS honors only // line comments)', () => {
    expect(hasLeadingTsNocheck(LEADING_BLOCK_MENTION)).toBe(false);
  });
  test('does NOT flag this detector script itself (its header JSDoc mentions the token in prose)', () => {
    const self = fs.readFileSync(path.resolve(__dirname, '../../scripts/checkTsNocheck.ts'), 'utf8');
    expect(hasLeadingTsNocheck(self)).toBe(false);
  });
  test('does NOT flag a clean file', () => {
    expect(hasLeadingTsNocheck(CLEAN)).toBe(false);
  });
});

describe('findUnsanctioned', () => {
  test('(c) does NOT flag the two section-14 sanctioned files even with a leading directive', () => {
    const files = [
      { path: 'src/ingestion/gaps/gapRuleEngine.ts', source: LEADING_LINE_DIRECTIVE },
      { path: 'src/ingestion/runGapDetectionForPatient.ts', source: LEADING_LINE_DIRECTIVE },
    ];
    expect(findUnsanctioned(files)).toEqual([]);
  });

  test('(d) yields a non-empty (fail) result for an unsanctioned leading directive', () => {
    const files = [
      { path: 'tests/gapRules/clinicalScenarios.test.ts', source: LEADING_LINE_DIRECTIVE }, // now unsanctioned
      { path: 'src/ingestion/gaps/gapRuleEngine.ts', source: LEADING_LINE_DIRECTIVE },       // sanctioned
      { path: 'src/ingestion/buildPatientEvalContext.ts', source: PROSE_AFTER_CODE },         // prose - clean
    ];
    expect(findUnsanctioned(files)).toEqual(['tests/gapRules/clinicalScenarios.test.ts']);
  });

  test('SANCTIONED holds exactly the two runners', () => {
    expect([...SANCTIONED].sort()).toEqual([
      'src/ingestion/gaps/gapRuleEngine.ts',
      'src/ingestion/runGapDetectionForPatient.ts',
    ]);
  });
});

// Real-tree sanity: the repo as-committed must be clean under the detector (this is what CI enforces).
describe('real backend tree', () => {
  test('buildPatientEvalContext.ts carries NO leading directive (refuted false positive)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/ingestion/buildPatientEvalContext.ts'), 'utf8');
    expect(hasLeadingTsNocheck(src)).toBe(false);
  });
  test('clinicalScenarios.test.ts carries NO leading directive (drift deleted)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../gapRules/clinicalScenarios.test.ts'), 'utf8');
    expect(hasLeadingTsNocheck(src)).toBe(false);
  });
  test('the two sanctioned runners DO carry a leading directive', () => {
    for (const p of ['../../src/ingestion/gaps/gapRuleEngine.ts', '../../src/ingestion/runGapDetectionForPatient.ts']) {
      const src = fs.readFileSync(path.resolve(__dirname, p), 'utf8');
      expect(hasLeadingTsNocheck(src)).toBe(true);
    }
  });
});
