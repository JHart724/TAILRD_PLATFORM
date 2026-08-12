/**
 * BUILD_STATE.md + PRODUCTION_READINESS.md figure binding - the sibling of pathToRobustFigures.test.ts.
 *
 * WHY. Two live figures were hand-maintained in these two documents with nothing binding them, and they
 * drifted: BUILD_STATE's CURRENT-row register count read "90" while the live register was 98, and the
 * last-known-good task-def pointer was hand-synced between CLAUDE.md section 9 and PRODUCTION_READINESS
 * with no check that the two agreed. This test binds them the same way PATH_TO_ROBUST's figures are
 * bound: a delimited <!--@checked KEY-->VALUE<!--/@checked--> span asserted against a derived source. It
 * runs in the default Jest suite, so it fails CI.
 *
 * WHAT THESE BINDINGS DO - AND DELIBERATELY DO NOT DO. They assert DOC-TO-DOC and DOC-TO-DERIVED
 * agreement, NOT agreement with live infrastructure:
 *   - BUILD_STATE's register figures are asserted == registerOpenCount (the register is the source).
 *   - BUILD_STATE's and PRODUCTION_READINESS's task-def pointers are asserted == CLAUDE.md section 9,
 *     which is the CANONICAL source pointer - NOT the live ECS revision.
 * This is the deliberate lag-tolerance trade, and it has a sharp edge the next person must understand:
 * CLAUDE.md section 9 INTENTIONALLY LAGS live ECS (docs-only auto-deploys ride in arrears by
 * convention), so binding to it - never to the cluster - is the only design that does not fail CI on
 * every docs deploy. The consequence: **if CLAUDE.md section 9 itself goes stale, all three documents go
 * stale together and every assertion here still passes.** Internal consistency is NOT accuracy. This
 * test guarantees the three docs cannot silently DISAGREE; it cannot guarantee section 9 is right. An
 * assertEquals(doc, liveECS) would give that guarantee and is deliberately rejected (see
 * PATH_TO_ROBUST.md section 0, follow-up 2/3: lag-tolerance is a hard requirement).
 */
import * as fs from 'fs';
import * as path from 'path';
import { runCount } from '../../scripts/registerOpenCount';

const REPO = path.resolve(__dirname, '..', '..', '..');
const BUILD_STATE = path.join(REPO, 'BUILD_STATE.md');
const PROD_READINESS = path.join(REPO, 'PRODUCTION_READINESS.md');
const CLAUDE_MD = path.join(REPO, 'CLAUDE.md');
const REGISTER = path.join(REPO, 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');

// Same marker grammar as pathToRobustFigures.test.ts (kept in sync deliberately; a KEY is
// [a-z][a-zA-Z0-9.]*, which exempts the uppercase KEY in any syntax example by construction).
const MARKER = /<!--@checked ([a-z][a-zA-Z0-9.]*)-->([^<]*)<!--\/@checked-->/g;

/** Per-file marker map. Throws on a duplicate key WITHIN one file; the same key across files is fine. */
function markersOf(file: string): Map<string, string> {
  const md = fs.readFileSync(file, 'utf-8');
  const out = new Map<string, string>();
  for (const m of md.matchAll(MARKER)) {
    const [, key, value] = m;
    if (out.has(key)) throw new Error(`doc figure binding: duplicate @checked key '${key}' in ${path.basename(file)}`);
    out.set(key, value.trim());
  }
  return out;
}

/** The CLAUDE.md section 9 pointer - the canonical last-known-good task-def revision (same source as
 *  pathToRobustFigures.test.ts). Deliberately read UNMARKED: section 9 is the source, the other docs
 *  mirror it. */
function lastKnownGoodTaskDef(): string {
  const md = fs.readFileSync(CLAUDE_MD, 'utf-8');
  const m = /\*\*Last known working task definition:\*\*\s*`tailrd-backend:(\d+)`/.exec(md);
  if (!m) throw new Error('doc figure binding: CLAUDE.md section 9 task-def pointer not found');
  return m[1];
}

const REQUIRED = {
  buildState: ['register.open', 'register.high', 'register.medium', 'register.low', 'register.info', 'deploy.lastKnownGoodTaskDef'],
  prodReadiness: ['deploy.lastKnownGoodTaskDef'],
};

describe('BUILD_STATE.md + PRODUCTION_READINESS.md: marked figures mirror their sources', () => {
  const bs = markersOf(BUILD_STATE);
  const pr = markersOf(PROD_READINESS);

  it('every required marker is present - removing one is a build failure, not a silent loss', () => {
    for (const k of REQUIRED.buildState) expect(bs.has(k) ? k : `MISSING in BUILD_STATE:${k}`).toBe(k);
    for (const k of REQUIRED.prodReadiness) expect(pr.has(k) ? k : `MISSING in PRODUCTION_READINESS:${k}`).toBe(k);
  });

  it('BUILD_STATE register figures match registerOpenCount (the register is the source)', () => {
    const r: any = runCount(REGISTER);
    const sev = r.bySeverity ?? {};
    const get = (k: string) => String(sev[k] ?? sev[k.toUpperCase()] ?? '');
    expect(bs.get('register.open')).toBe(String(r.total));
    expect(bs.get('register.high')).toBe(get('HIGH (P1)'));
    expect(bs.get('register.medium')).toBe(get('MEDIUM (P2)'));
    expect(bs.get('register.low')).toBe(get('LOW (P3)'));
    expect(bs.get('register.info')).toBe(get('INFO'));
  });

  it('BUILD_STATE + PRODUCTION_READINESS task-def pointers mirror CLAUDE.md section 9 (doc-to-doc, NOT live ECS)', () => {
    const src = lastKnownGoodTaskDef();
    expect(bs.get('deploy.lastKnownGoodTaskDef')).toBe(src);
    expect(pr.get('deploy.lastKnownGoodTaskDef')).toBe(src);
    // transitive mirror: both docs equal section 9, therefore equal each other.
    expect(bs.get('deploy.lastKnownGoodTaskDef')).toBe(pr.get('deploy.lastKnownGoodTaskDef'));
  });
});
