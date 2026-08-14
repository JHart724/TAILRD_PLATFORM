/**
 * AUDIT-317 guard: date-anchored terminal-literal collision lint (C2 / AUDIT_METHODOLOGY section 23).
 *
 * THE DEFECT (AUDIT-316 shape): registerOpenCount's terminal-status regex matches a bracketed / bold
 * terminal literal ANYWHERE on a finding's (one physical) line, not only in the entry's own status
 * position, and the canonical rule is supersede-wins. So a genuinely-OPEN finding whose PROSE quotes
 * an UNDATED bracket/bold terminal literal is silently dropped from the OPEN count. Live evidence
 * 2026-08-13: amending AUDIT-316 to quote the new tenant name (it leads with a bracketed SUPERSEDED
 * warning) dropped it from OPEN, count 101 -> 100.
 *
 * THE GUARD: harm-tied and coupled to the REAL classifier (zero drift). A finding line is a collision
 * iff (a) it carries an OPEN token AND (b) the classifier currently marks it superseded AND (c)
 * neutralizing ONLY its UNDATED bracket/bold terminal literals flips it back to not-superseded - i.e.
 * the undated literal was the load-bearing (wrongful) supersession. A DATED terminal (the legitimate
 * resolution form, e.g. **RESOLVED 2026-07-29**) survives neutralization, so a genuinely-resolved
 * finding is NEVER flagged - which is why AUDIT-222 / AUDIT-223, which describe a `[RETIRED ...]` /
 * `[RESOLVED ...]` marker in prose while being dated-resolved, do NOT flag.
 *
 * WHY DATE-ANCHORED (not "any undated terminal anywhere"): the naive form over-fires on AUDIT-222/223
 * (dated-resolved, undated terminal in prose). The date anchor is the exact discriminator: dated =>
 * real resolution, undated-with-no-dated-sibling => the AUDIT-316 collision. See AUDIT-317.
 *
 * RESIDUAL (why AUDIT-317 stays OPEN): a DATED terminal quoted in prose on an OPEN line (e.g. citing
 * another finding's `RESOLVED 2026-05-27`) still silently drops the finding, and a date-anchored lint
 * cannot distinguish that from a real resolution without positional parsing (rejected as high-regression
 * in AUDIT-317 option a). The classifier itself remains permissive; this lint only makes the common
 * undated-literal case loud at authoring time.
 *
 * Offline, deterministic, source-parsing - mirrors registerOpenCount.test.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseIndex, TERMINAL_STATUSES } from '../../scripts/registerOpenCount';

const HEADER = '## Findings by severity';
const FOOTER = '## Full findings detail';

// Verdict statuses mirror registerOpenCount's VERDICT_SUPERSEDE (undated bold/bracket only). Combined
// with the dated TERMINAL_STATUSES they form the full set of tokens the classifier treats as terminal.
const VERDICT_STATUSES = ['REFUTED', 'DUPLICATE', 'INVALID'] as const;
const ALL_TERMS = [...TERMINAL_STATUSES, ...VERDICT_STATUSES].join('|');

// A bracket/bold terminal literal: **TERM or [TERM at a word boundary (global - a line may hold several).
const BB_TERMINAL = new RegExp(`(?:\\*\\*|\\[)(?:${ALL_TERMS})\\b`, 'g');
// "Dated" iff the terminal keyword is immediately followed (optionally through a ** / ] close) by a date.
const DATED_AFTER = /^(?:\*\*|\])?\s+\d{4}-\d{2}-\d{2}/;

function idx(...bullets: string[]): string {
  return [HEADER, '### HIGH (P1)', ...bullets, FOOTER].join('\n');
}

/** Classify a single bullet line using the REAL classifier (parseIndex) - no reimplementation. */
function classify(line: string): { hasOpen: boolean; superseded: boolean } {
  const recs = parseIndex(idx(line));
  if (recs.length === 0) return { hasOpen: false, superseded: false };
  return { hasOpen: recs[0].hasOpenToken, superseded: recs[0].superseded };
}

/** Neutralize UNDATED bracket/bold terminal literals; keep DATED ones. Returns the rewritten line + what was removed. */
function neutralizeUndated(line: string): { line: string; removed: string[] } {
  const removed: string[] = [];
  let out = '';
  let last = 0;
  for (const mm of line.matchAll(BB_TERMINAL)) {
    const start = mm.index ?? 0;
    const m = mm[0];
    const rest = line.slice(start + m.length);
    out += line.slice(last, start);
    if (DATED_AFTER.test(rest)) {
      out += m; // dated terminal - the legitimate resolution - keep it so it still supersedes
    } else {
      removed.push(m);
      out += '~'.repeat(m.length); // neutralize: no terminal token remains
    }
    last = start + m.length;
  }
  out += line.slice(last);
  return { line: out, removed };
}

export interface Collision {
  id: string;
  bucket: string;
  line: number;
  literals: string[];
}

/**
 * A collision is an OPEN-token bullet that the classifier marks superseded, but which becomes
 * NOT-superseded once its UNDATED bracket/bold terminals are neutralized - i.e. the undated literal
 * was the sole, wrongful supersession (the AUDIT-316 shape).
 */
export function findCollisions(md: string): Collision[] {
  const recs = parseIndex(md);
  const lines = md.split(/\r?\n/);
  const out: Collision[] = [];
  for (const rec of recs) {
    if (!rec.hasOpenToken || !rec.superseded) continue; // only OPEN-token findings the classifier drops
    const raw = lines[rec.line - 1];
    const { line: neutralized, removed } = neutralizeUndated(raw);
    if (removed.length === 0) continue; // dropped by a DATED / plain terminal, not an undated BB one
    if (!classify(neutralized).superseded) {
      out.push({ id: rec.id, bucket: rec.bucket, line: rec.line, literals: removed });
    }
  }
  return out;
}

/** Human-actionable failure text: names the id, the offending literal, and the fix. */
export function formatCollisions(cs: Collision[]): string {
  return cs
    .map(
      (c) =>
        `  ${c.id} @ line ${c.line} [${c.bucket}] is dropped from the OPEN count by undated terminal ` +
        `literal(s) ${c.literals.join(', ')} in its prose. DESCRIBE the token (e.g. "a bracketed ` +
        `SUPERSEDED warning") rather than reproducing the literal, so registerOpenCount does not read ` +
        `it as this finding's status. See AUDIT-317.`,
    )
    .join('\n');
}

describe('AUDIT-317 collision lint (synthetic - proves the detector fires)', () => {
  it('FLAGS an OPEN finding dropped by an undated BRACKET terminal (the AUDIT-316 shape)', () => {
    const md = idx('- **AUDIT-950** - a tenant name that leads with [SUPERSEDED - DO NOT USE] warning (Phase 1, OPEN).');
    const cs = findCollisions(md);
    expect(cs.map((c) => c.id)).toEqual(['AUDIT-950']);
    expect(cs[0].literals).toContain('[SUPERSEDED');
  });

  it('FLAGS an OPEN finding dropped by an undated BOLD terminal', () => {
    const md = idx('- **AUDIT-951** - text that quotes a **REFUTED verdict inline (Phase 1, OPEN).');
    const cs = findCollisions(md);
    expect(cs.map((c) => c.id)).toEqual(['AUDIT-951']);
    expect(cs[0].literals.some((l) => l.startsWith('**'))).toBe(true);
  });

  it('does NOT flag a dated resolution that also describes a marker in prose (AUDIT-222/223 shape)', () => {
    const md = idx('- **AUDIT-952** - x (filed 2026-07-01, OPEN) status preserved under a [RETIRED ...] marker. **RESOLVED 2026-07-29** - done.');
    expect(findCollisions(md)).toEqual([]);
  });

  it('does NOT flag a plain dated resolution (old convention)', () => {
    const md = idx('- **AUDIT-953** - x describing an OPEN gap (Phase 1, RESOLVED 2026-05-27).');
    expect(findCollisions(md)).toEqual([]);
  });

  it('does NOT flag a genuinely-open finding with no terminal literal at all', () => {
    const md = idx('- **AUDIT-954** - a real open finding (Phase 2, OPEN - surfaced via review).');
    expect(findCollisions(md)).toEqual([]);
  });

  it('produces an actionable message naming id, literal, and the fix', () => {
    const md = idx('- **AUDIT-955** - name leads with [RETIRED marker (Phase 1, OPEN).');
    const msg = formatCollisions(findCollisions(md));
    expect(msg).toContain('AUDIT-955');
    expect(msg).toContain('[RETIRED');
    expect(msg).toContain('DESCRIBE the token');
    expect(msg).toContain('AUDIT-317');
  });
});

describe('AUDIT-317 collision lint against the live register', () => {
  const registerPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');
  const md = fs.readFileSync(registerPath, 'utf8');
  const bulletCount = parseIndex(md).length;

  it(`no OPEN-token finding is dropped by an undated terminal literal (checked ${bulletCount} index bullets)`, () => {
    const cs = findCollisions(md);
    if (cs.length > 0) {
      throw new Error(`AUDIT-317 terminal-literal collision(s) in the register:\n${formatCollisions(cs)}`);
    }
    expect(cs).toEqual([]);
  });

  it('the index covers the full corpus (sanity: at least the current open+resolved set)', () => {
    // The index holds every finding (open and resolved); the OPEN subset is 102 at time of writing.
    expect(bulletCount).toBeGreaterThanOrEqual(102);
  });
});
