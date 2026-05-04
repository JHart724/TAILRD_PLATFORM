/**
 * Shared utilities for canonical extractors. Pure functions, no I/O side effects
 * beyond fs reads. Zero new dependencies — node fs + crypto only.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

/** Read a file and split into lines (CRLF or LF). */
export function readLines(filepath: string): string[] {
  return fs.readFileSync(filepath, 'utf8').split(/\r?\n/);
}

/** SHA256 hex digest of a file's bytes. */
export function sha256(filepath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filepath));
  return hash.digest('hex');
}

/** Escape a string for use as a regex literal. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stringify with stable key ordering. Recursively sorts object keys alphabetically.
 * Arrays preserve caller-supplied order (caller responsible for sorting where appropriate).
 *
 * Trailing newline ensured for POSIX-friendly diffs.
 */
export function stableStringify(value: unknown, indent = 2): string {
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

/** Project-relative POSIX path for portability across Windows/Linux. */
export function relativePosix(absPath: string, repoRoot: string): string {
  // Convert backslashes to forward slashes for cross-platform JSON output
  const rel = absPath.startsWith(repoRoot) ? absPath.slice(repoRoot.length + 1) : absPath;
  return rel.replace(/\\/g, '/');
}

// =============================================================================
// String-literal-aware brace walker
// =============================================================================

/**
 * Find the closing brace of the if-block whose `{` opens on or after `searchStartLine`.
 *
 * Two-step search:
 *   1. Scan forward up to IF_SEARCH_WINDOW lines for first line matching `^\s*if\s*\(`.
 *      This skips intervening comment-continuation lines and `const`/`let` declarations.
 *   2. From that `if` line, find the first `{` (string-aware) — either on the same line
 *      (typical: `if (cond) {`) or within IF_BRACE_WINDOW lines (multi-line conditions
 *      where `) {` lands on a continuation line).
 *
 * Tracks tokenization state to skip braces inside string literals:
 *   - single-quote string: 'foo {bar}'
 *   - double-quote string: "foo {bar}"
 *   - template literal: `foo ${bar}`     ← interpolations contain code with braces
 *   - line comment: // ... }
 *   - block comment: /* ... } *\/
 *   - escaped chars: \' \" \\ \`
 *
 * For template-literal `${...}` interpolations, tracks brace depth INSIDE the
 * interpolation; the closing `}` of the interpolation does NOT count toward the
 * outer if-block balance. Interpolations may nest (e.g., `${a ? `${b}` : c}`).
 *
 * @param lines - source file lines (0-indexed array; line numbers are 1-indexed)
 * @param searchStartLine - 1-indexed line where scanning begins (typically the comment line)
 * @param maxScanLines - maximum lines to scan past the open brace before throwing
 * @returns 1-indexed line of the matching close brace, AND 1-indexed line of the open brace
 * @throws when no `if (` found within IF_SEARCH_WINDOW lines, or no matching `}` within maxScanLines
 */
const IF_SEARCH_WINDOW = 30;
const IF_BRACE_WINDOW = 20;

export function findIfBlockBoundaries(
  lines: readonly string[],
  searchStartLine: number,
  maxScanLines: number,
  blockName: string,
): { openLine: number; closeLine: number } {
  // Step 1: find the first `if (` line at or after searchStartLine
  let ifLine = -1;
  const ifSearchEnd = Math.min(lines.length, searchStartLine - 1 + IF_SEARCH_WINDOW);
  for (let i = searchStartLine - 1; i < ifSearchEnd; i++) {
    if (/^\s*if\s*\(/.test(lines[i])) {
      ifLine = i + 1;
      break;
    }
  }
  if (ifLine === -1) {
    throw makeUnbalancedBraceError(
      `No 'if (' found within ${IF_SEARCH_WINDOW} lines after comment at line ${searchStartLine}`,
      searchStartLine,
      blockName,
      searchStartLine,
      ifSearchEnd,
    );
  }

  // Step 2: find the first `{` from the if-line forward (string-aware)
  let openLine = -1;
  let openCol = -1;
  const braceSearchEnd = Math.min(lines.length, ifLine - 1 + IF_BRACE_WINDOW);
  for (let i = ifLine - 1; i < braceSearchEnd; i++) {
    const col = findUnescapedOpenBrace(lines[i]);
    if (col !== -1) {
      openLine = i + 1;
      openCol = col;
      break;
    }
  }
  if (openLine === -1) {
    throw makeUnbalancedBraceError(
      `No opening { found within ${IF_BRACE_WINDOW} lines after 'if (' at line ${ifLine}`,
      searchStartLine,
      blockName,
      ifLine,
      braceSearchEnd,
    );
  }

  // Walk from the opening brace, tracking string/comment state
  type State = 'CODE' | 'SINGLE' | 'DOUBLE' | 'TEMPLATE' | 'LINE_COMMENT' | 'BLOCK_COMMENT';
  let state: State = 'CODE';
  let depth = 0;
  // Stack tracks template-literal interpolation contexts; each entry is the brace depth
  // at which we re-enter the template literal when its interpolation closes
  const tmplStack: Array<{ returnDepth: number }> = [];

  const closeSearchEnd = Math.min(lines.length, openLine - 1 + maxScanLines);

  for (let i = openLine - 1; i < closeSearchEnd; i++) {
    const line = lines[i];
    const startCol = i === openLine - 1 ? openCol : 0;

    // Reset LINE_COMMENT state at end of each physical line
    if (state === 'LINE_COMMENT') state = 'CODE';

    for (let j = startCol; j < line.length; j++) {
      const c = line[j];
      const next = j + 1 < line.length ? line[j + 1] : '';
      const prev = j > 0 ? line[j - 1] : '';

      // Skip escaped characters in string contexts
      if ((state === 'SINGLE' || state === 'DOUBLE' || state === 'TEMPLATE') && prev === '\\') {
        // Check for double-escape: \\ means the previous backslash was itself escaped
        // Look back two chars: if it's also \, then the current char is NOT escaped
        const prev2 = j > 1 ? line[j - 2] : '';
        if (prev2 !== '\\') continue;
      }

      switch (state) {
        case 'CODE':
          if (c === '/' && next === '/') {
            state = 'LINE_COMMENT';
            j++;
          } else if (c === '/' && next === '*') {
            state = 'BLOCK_COMMENT';
            j++;
          } else if (c === "'") {
            state = 'SINGLE';
          } else if (c === '"') {
            state = 'DOUBLE';
          } else if (c === '`') {
            state = 'TEMPLATE';
          } else if (c === '{') {
            depth++;
          } else if (c === '}') {
            // Check whether we're closing a template-literal interpolation
            if (tmplStack.length > 0 && depth === tmplStack[tmplStack.length - 1].returnDepth + 1) {
              // This } closes the ${...} — pop back to TEMPLATE state without decrementing past returnDepth
              tmplStack.pop();
              state = 'TEMPLATE';
              depth--;
            } else {
              depth--;
              if (depth === 0) {
                return { openLine, closeLine: i + 1 };
              }
            }
          }
          break;

        case 'SINGLE':
          if (c === "'") state = 'CODE';
          break;

        case 'DOUBLE':
          if (c === '"') state = 'CODE';
          break;

        case 'TEMPLATE':
          if (c === '`') {
            state = 'CODE';
          } else if (c === '$' && next === '{') {
            // Enter ${...} interpolation; push current depth so we know when to return
            tmplStack.push({ returnDepth: depth });
            state = 'CODE';
            depth++;
            j++; // skip the {
          }
          break;

        case 'BLOCK_COMMENT':
          if (c === '*' && next === '/') {
            state = 'CODE';
            j++;
          }
          break;

        case 'LINE_COMMENT':
          // consumed at end of physical line
          break;
      }
    }
  }

  throw makeUnbalancedBraceError(
    `No matching } found within ${maxScanLines} lines after open { at line ${openLine}`,
    searchStartLine,
    blockName,
    openLine,
    closeSearchEnd,
  );
}

function findUnescapedOpenBrace(line: string): number {
  // Quick scan for `{` while respecting line/block comments + strings on a single line.
  // Line comments cause early return (rest of line ignored), so no LINE_COMMENT state needed here.
  type State = 'CODE' | 'SINGLE' | 'DOUBLE' | 'TEMPLATE' | 'BLOCK_COMMENT';
  let state: State = 'CODE';
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const next = j + 1 < line.length ? line[j + 1] : '';
    const prev = j > 0 ? line[j - 1] : '';

    if ((state === 'SINGLE' || state === 'DOUBLE' || state === 'TEMPLATE') && prev === '\\') {
      const prev2 = j > 1 ? line[j - 2] : '';
      if (prev2 !== '\\') continue;
    }

    switch (state) {
      case 'CODE':
        if (c === '/' && next === '/') return -1; // rest of line is comment
        if (c === '/' && next === '*') {
          state = 'BLOCK_COMMENT';
          j++;
        } else if (c === "'") state = 'SINGLE';
        else if (c === '"') state = 'DOUBLE';
        else if (c === '`') state = 'TEMPLATE';
        else if (c === '{') return j;
        break;
      case 'SINGLE':
        if (c === "'") state = 'CODE';
        break;
      case 'DOUBLE':
        if (c === '"') state = 'CODE';
        break;
      case 'TEMPLATE':
        if (c === '`') state = 'CODE';
        break;
      case 'BLOCK_COMMENT':
        if (c === '*' && next === '/') {
          state = 'CODE';
          j++;
        }
        break;
    }
  }
  return -1;
}

function makeUnbalancedBraceError(
  message: string,
  commentLine: number,
  blockName: string,
  searchStart: number,
  searchEnd: number,
): Error {
  // Lazy require to avoid circular type-import issues
  const { UnbalancedBraceError } = require('./types');
  return new UnbalancedBraceError(message, commentLine, blockName, searchStart, searchEnd);
}
