/**
 * AUDIT-325 guard: unclassified-bullet lint (C2 / AUDIT_METHODOLOGY section 23).
 *
 * THE DEFECT: `registerOpenCount` ALREADY computes `unclassifiedBullets` - index bullets carrying
 * neither an OPEN token nor a supersession, so the classifier can place them in neither direction -
 * and the script PRINTS them as a NOTE. Nothing ever failed on them. A bullet the classifier cannot
 * place is a hole in the instrument: it is absent from the open count AND absent from the resolved
 * set, so it appears in no working view at all.
 *
 * LIVE EVIDENCE (2026-08-18 reconciliation, PR #582): three bullets sat unclassified. AUDIT-194 went
 * UNCOUNTED FOR TWO MONTHS because its status token sits on a continuation line the parent-anchored
 * classifier never reads, and AUDIT-011's stalled Phase d - a 14-day soak that expired 2026-05-21 and
 * then ran 89 days past it - stayed invisible behind a non-counting `IN PROGRESS` token. Neither
 * surfaced in any HIGH working set while the count read "21 HIGH", which was right by coincidence and
 * wrong in its membership.
 *
 * THE GUARD: assert `unclassifiedBullets` is empty against the LIVE register, and - because a bare
 * count would send the next person hunting - classify each offender into the THREE SHAPES, which need
 * three different fixes:
 *
 *   1. NON_COUNTING_VOCABULARY - the bullet carries a real work state (`**DEPLOYED`, `**IN PROGRESS`)
 *      that registerOpenCount DELIBERATELY excludes from the OPEN vocabulary (see its line 55). The
 *      state is not wrong; it simply does not count. Fix: add an explicit token alongside it.
 *   2. CONTINUATION_LINE_TOKEN - the entry is MULTI-LINE and its status token sits on a later line.
 *      The bullet regex anchors at column 0 and tokens are read per line, so the parent is tokenless.
 *      This is the AUDIT-194 shape. Fix: MIRROR the token onto the parent AS STATE.
 *   3. NO_STATUS_ANYWHERE - no status token on the parent or on any continuation line at all.
 *
 * NO ALLOWLIST BY DESIGN (operator ruling 2026-08-18): every bullet must carry a countable token, so
 * this lint has no hand-maintained exception list to rot into - the AUDIT-229 failure mode it would
 * otherwise inherit. It ships green on its own merits or not at all.
 *
 * Coupled to the REAL classifier (`parseIndex` / `computeOpen`) rather than reimplementing it, so the
 * lint and the count can never disagree. Offline, deterministic, source-parsing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { computeOpen, parseIndex } from '../../scripts/registerOpenCount';

const HEADER = '## Findings by severity';
const FOOTER = '## Full findings detail';

/** Work states registerOpenCount deliberately does NOT treat as OPEN tokens (its line 55). */
const NON_COUNTING_VOCABULARY = ['DEPLOYED', 'IN PROGRESS'] as const;

export type Shape = 'NON_COUNTING_VOCABULARY' | 'CONTINUATION_LINE_TOKEN' | 'NO_STATUS_ANYWHERE';

export interface Offender {
  id: string;
  bucket: string;
  line: number;
  shape: Shape;
  evidence: string;
}

function idx(...bullets: string[]): string {
  return [HEADER, '### HIGH (P1)', ...bullets, FOOTER].join('\n');
}

/**
 * Does this text carry a status token the classifier would read? Wraps it as a synthetic bullet and
 * asks the REAL classifier - no regex reimplementation, so continuation-line detection uses exactly
 * the same token vocabulary as the count itself.
 */
function carriesToken(text: string): boolean {
  const recs = parseIndex(idx(`- **AUDIT-999** - ${text.trim()}`));
  return recs.length > 0 && (recs[0].hasOpenToken || recs[0].superseded);
}

const IS_BULLET = /^- \*\*AUDIT-/;
const IS_SECTION = /^#{2,3} /;

/** Lines belonging to an entry: everything after its bullet until the next bullet or section header. */
function continuationLines(lines: string[], startIdx: number): Array<{ n: number; text: string }> {
  const out: Array<{ n: number; text: string }> = [];
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    if (IS_BULLET.test(l) || IS_SECTION.test(l)) break;
    if (l.trim() !== '') out.push({ n: i + 1, text: l });
  }
  return out;
}

/** Classify every bullet the classifier cannot place, into the three actionable shapes. */
export function findUnclassified(md: string): Offender[] {
  const recs = parseIndex(md);
  const res = computeOpen(recs);
  const lines = md.split(/\r?\n/);
  const out: Offender[] = [];

  for (const u of res.unclassifiedBullets) {
    const parent = lines[u.line - 1] ?? '';

    const vocab = NON_COUNTING_VOCABULARY.filter((v) => parent.includes(`**${v}`));
    if (vocab.length > 0) {
      out.push({
        id: u.id,
        bucket: u.bucket,
        line: u.line,
        shape: 'NON_COUNTING_VOCABULARY',
        evidence: `carries **${vocab.join(' / **')}`,
      });
      continue;
    }

    const cont = continuationLines(lines, u.line).find((c) => carriesToken(c.text));
    if (cont) {
      out.push({
        id: u.id,
        bucket: u.bucket,
        line: u.line,
        shape: 'CONTINUATION_LINE_TOKEN',
        evidence: `token found on line ${cont.n}, ${cont.n - u.line} line(s) below the bullet`,
      });
      continue;
    }

    out.push({
      id: u.id,
      bucket: u.bucket,
      line: u.line,
      shape: 'NO_STATUS_ANYWHERE',
      evidence: 'no status token on the bullet or on any continuation line',
    });
  }
  return out;
}

const REMEDY: Record<Shape, string> = {
  NON_COUNTING_VOCABULARY:
    'That word states WORK state, not COUNT state, and registerOpenCount deliberately excludes it. ' +
    'Add an explicit **OPEN** (or a dated terminal such as **RESOLVED 2026-01-01**) ALONGSIDE it - do ' +
    'not remove the work state.',
  CONTINUATION_LINE_TOKEN:
    'The entry is MULTI-LINE and the classifier only reads the bullet line (its regex anchors at ' +
    'column 0). MIRROR the token onto the bullet AS STATE, not as a verbatim string copy - copied text ' +
    'containing a dated terminal would classify the bullet NOT-OPEN and re-create the hole inverted.',
  NO_STATUS_ANYWHERE:
    'The entry carries no status at all. Add **OPEN** if it is live, or a dated terminal if finished.',
};

/** Human-actionable failure text: names the id, the shape, the evidence, and the shape-specific fix. */
export function formatOffenders(os: Offender[]): string {
  return os
    .map(
      (o) =>
        `  ${o.id} @ line ${o.line} [${o.bucket}] is UNCLASSIFIED - the classifier can place it in ` +
        `NEITHER direction, so it appears in no working view. SHAPE: ${o.shape} (${o.evidence}). ` +
        `FIX: ${REMEDY[o.shape]} See AUDIT-325.`,
    )
    .join('\n');
}

// The three shapes, reusing the fixtures registerOpenCount.test.ts already pins (AUDIT-913/914/915).
// NOTE: 913/914/915 cover only TWO of the three shapes - both vocabulary cases and the no-status case.
// The continuation shape is 915's own text PLUS the sub-bullets and trailing status line that AUDIT-194
// actually carries; the synthetic fixture omitted them, which is precisely why the existing synthetic
// suite could not have caught AUDIT-194.
const F913 = '- **AUDIT-913** - x (Phase 2A, **DEPLOYED 2026-04-30**; flag-off pending rollout).';
const F914 = '- **AUDIT-914** - x (Phase 2A, **IN PROGRESS - Phase b/c SHIPPED 2026-05-07**).';
const F915 = '- **AUDIT-915** - x descriptive meta bullet with no status. TWO DISTINCT FINDINGS:';
const F915_CONTINUATION = [
  '  - **PART A - OVER-FIRE:** first half.',
  '  - **PART B - UNDER-FIRE:** second half.',
  '  (Cross-module clinical-accuracy, **Part A RESOLVED 2026-06-30 / Part B OPEN-DEFERRED**.)',
];

describe('AUDIT-325 unclassified-bullet lint (synthetic - proves the detector fires on all three shapes)', () => {
  it('FLAGS shape 1 NON_COUNTING_VOCABULARY: **DEPLOYED (the AUDIT-009 shape)', () => {
    const os = findUnclassified(idx(F913));
    expect(os.map((o) => o.id)).toEqual(['AUDIT-913']);
    expect(os[0].shape).toBe('NON_COUNTING_VOCABULARY');
    expect(os[0].evidence).toContain('**DEPLOYED');
  });

  it('FLAGS shape 1 NON_COUNTING_VOCABULARY: **IN PROGRESS (the AUDIT-011 shape)', () => {
    const os = findUnclassified(idx(F914));
    expect(os.map((o) => o.id)).toEqual(['AUDIT-914']);
    expect(os[0].shape).toBe('NON_COUNTING_VOCABULARY');
    expect(os[0].evidence).toContain('**IN PROGRESS');
  });

  it('FLAGS shape 2 CONTINUATION_LINE_TOKEN: token below the bullet (the AUDIT-194 shape)', () => {
    const os = findUnclassified(idx(F915, ...F915_CONTINUATION));
    expect(os.map((o) => o.id)).toEqual(['AUDIT-915']);
    expect(os[0].shape).toBe('CONTINUATION_LINE_TOKEN');
    expect(os[0].evidence).toContain('token found on line');
  });

  it('FLAGS shape 3 NO_STATUS_ANYWHERE: no token on the bullet or below it', () => {
    const os = findUnclassified(idx(F915));
    expect(os.map((o) => o.id)).toEqual(['AUDIT-915']);
    expect(os[0].shape).toBe('NO_STATUS_ANYWHERE');
  });

  it('all three shapes are distinguished in one pass, not collapsed to a count', () => {
    const os = findUnclassified(idx(F913, F914, F915, ...F915_CONTINUATION));
    expect(os.map((o) => `${o.id}:${o.shape}`)).toEqual([
      'AUDIT-913:NON_COUNTING_VOCABULARY',
      'AUDIT-914:NON_COUNTING_VOCABULARY',
      'AUDIT-915:CONTINUATION_LINE_TOKEN',
    ]);
  });

  it('does NOT flag a bullet carrying a plain OPEN token', () => {
    expect(findUnclassified(idx('- **AUDIT-916** - x (Phase 1, OPEN)'))).toEqual([]);
  });

  it('does NOT flag a bullet carrying a dated terminal', () => {
    expect(findUnclassified(idx('- **AUDIT-917** - x (Phase 1, **RESOLVED 2026-05-27** - done).'))).toEqual([]);
  });

  it('produces an actionable message naming id, shape, and a shape-specific fix', () => {
    const msg = formatOffenders(findUnclassified(idx(F915, ...F915_CONTINUATION)));
    expect(msg).toContain('AUDIT-915');
    expect(msg).toContain('CONTINUATION_LINE_TOKEN');
    expect(msg).toContain('MIRROR the token onto the bullet AS STATE');
    expect(msg).toContain('AUDIT-325');
  });
});

describe('AUDIT-325 unclassified-bullet lint against the live register', () => {
  const registerPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');
  const md = fs.readFileSync(registerPath, 'utf8');
  const bulletCount = parseIndex(md).length;

  it(`every index bullet carries a countable status token (checked ${bulletCount} bullets, no allowlist)`, () => {
    const os = findUnclassified(md);
    if (os.length > 0) {
      throw new Error(`AUDIT-325: ${os.length} unclassified bullet(s) in the register:\n${formatOffenders(os)}`);
    }
    expect(os).toEqual([]);
  });

  it('coverage is measured, not assumed: the lint saw the whole index', () => {
    expect(bulletCount).toBeGreaterThanOrEqual(240);
    expect(computeOpen(parseIndex(md)).unclassifiedBullets).toEqual([]);
  });
});
