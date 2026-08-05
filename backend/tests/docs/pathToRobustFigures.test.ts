/**
 * PATH_TO_ROBUST.md figure binding - the mechanism that makes the strategic authority TRUE, not just
 * currently-corrected.
 *
 * WHY THIS EXISTS. `docs/PATH_TO_ROBUST.md` is the single canonical strategic authority, and until
 * 2026-08-05 it carried hand-entered derived figures with NOTHING binding them to their sources. They
 * drifted, and the drift was not subtle: the coverage total disagreed with the synthesis it claimed to
 * quote AND with another passage of the same document sixteen lines away; the 8th module was described
 * as having "no schema, no routes, no matching logic" months after that backend shipped and was
 * live-proven; a closed finding was still listed as blocking a track. Correcting those lines by hand
 * would have left the actual defect - an authority whose numbers can go stale in silence - completely
 * intact. This test IS the fix. The corrections were only the prerequisite.
 *
 * This follows the established in-repo pattern of asserting a committed document against its derived
 * source: `registerOpenCount.test.ts` (the register's own counts) and `audit222RuleIdFreeze.test.ts`
 * (the ruleId report row-for-row against the engine). It runs in the DEFAULT Jest suite, so it fails CI
 * rather than waiting to be noticed.
 *
 * THE MARKER, and why it is opt-in.
 *
 *     <!--@checked KEY-->VALUE<!--/@checked-->
 *
 * Only the delimited span is parsed. Free prose is never touched, so rewriting the sentence around a
 * figure cannot break this test - a property that matters because the alternative (regexing figures out
 * of prose) produces a test that fights every edit and is eventually deleted for being annoying.
 *
 * An UNMARKED figure is deliberately NOT checked, because this document is full of DATED MILESTONES
 * that must never be updated: `gaps.push 394 -> 378 -> 367`, `task-def :332`, the v3.0 buildout counts.
 * A mechanism that "helpfully" refreshed those would destroy the history that makes
 * supersede-not-overwrite meaningful. **Historical figures are exempt BY CONSTRUCTION - they carry no
 * marker - never by a denylist that would rot exactly like the section 19.4 snapshot did (AUDIT-229).**
 *
 * THE HOLE, STATED RATHER THAN HIDDEN. A NEW live figure added without a marker is silently unchecked.
 * That cannot be closed without brittle-parsing prose. What IS closed is REMOVAL: REQUIRED_KEYS below
 * means deleting or renaming a marker fails the build. Adding a live figure without binding it remains
 * an authoring discipline; section 9 of the document is the reminder.
 */
import * as fs from 'fs';
import * as path from 'path';
import { runCount } from '../../scripts/registerOpenCount';

const REPO = path.resolve(__dirname, '..', '..', '..');
const PLAN = path.join(REPO, 'docs', 'PATH_TO_ROBUST.md');
const SYNTHESIS = path.join(REPO, 'docs', 'audit', 'PHASE_0B_CROSS_MODULE_SYNTHESIS.md');
const ENGINE = path.join(REPO, 'backend', 'src', 'ingestion', 'gaps', 'gapRuleEngine.ts');
const CLAUDE_MD = path.join(REPO, 'CLAUDE.md');
const REGISTER = path.join(REPO, 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');

/**
 * A KEY is `[a-z][a-zA-Z0-9.]*`. The lowercase-first requirement is load-bearing: it is what exempts
 * the uppercase `KEY` in the document's own syntax example from being parsed as a marker. The
 * documentation of the syntax is exempt from the syntax by construction, not by a special case.
 */
const MARKER = /<!--@checked ([a-z][a-zA-Z0-9.]*)-->([^<]*)<!--\/@checked-->/g;

function markers(): Map<string, string> {
  const md = fs.readFileSync(PLAN, 'utf-8');
  const out = new Map<string, string>();
  for (const m of md.matchAll(MARKER)) {
    const [, key, value] = m;
    if (out.has(key)) throw new Error(`PATH_TO_ROBUST figure binding: duplicate @checked key '${key}' in PATH_TO_ROBUST.md`);
    out.set(key, value.trim());
  }
  return out;
}

/** The synthesis TOTAL row: `| **TOTAL** | **603** | **204** | **108** | **291** | **312/603 (51.7%)** | ...` */
function synthesisTotals() {
  const md = fs.readFileSync(SYNTHESIS, 'utf-8');
  const row = md.split(/\r?\n/).find(l => /^\|\s*\*\*TOTAL\*\*/.test(l));
  if (!row) throw new Error('PATH_TO_ROBUST figure binding: synthesis TOTAL row not found - has renderSynthesis changed shape?');
  const cells = row.split('|').map(c => c.replace(/\*/g, '').trim()).filter(Boolean);
  // cells: TOTAL, spec, DET_OK, PARTIAL, SPEC_ONLY, "312/603 (51.7%)", ...
  const [, spec, detOk, partial, specOnly, anyCell] = cells;
  const m = /^(\d+)\/(\d+)\s*\(([\d.]+)%\)$/.exec(anyCell);
  if (!m) throw new Error(`PATH_TO_ROBUST figure binding: could not parse the synthesis any-coverage cell '${anyCell}'`);
  return {
    spec, detOk, partial, specOnly,
    anyRatio: `${m[1]}/${m[2]}`,
    pct: `${m[3]}%`,
  };
}

/** Per-module any-coverage, e.g. `| HF | 126 | 62 | 25 | 39 | 87/126 (69.0%) | ...` -> "87/126". */
function synthesisPerModule(mod: string): string {
  const md = fs.readFileSync(SYNTHESIS, 'utf-8');
  const row = md.split(/\r?\n/).find(l => new RegExp(`^\\|\\s*${mod}\\s*\\|`).test(l));
  if (!row) throw new Error(`PATH_TO_ROBUST figure binding: synthesis row for module ${mod} not found`);
  const cells = row.split('|').map(c => c.replace(/\*/g, '').trim()).filter(Boolean);
  const m = /^(\d+\/\d+)/.exec(cells[5] ?? '');
  if (!m) throw new Error(`PATH_TO_ROBUST figure binding: could not parse ${mod} any-coverage cell '${cells[5]}'`);
  return m[1];
}

function gapsPushCount(): number {
  return (fs.readFileSync(ENGINE, 'utf-8').match(/gaps\.push\(/g) ?? []).length;
}

/** The CLAUDE.md section 9 pointer - the canonical last-known-good task-def revision. */
function lastKnownGoodTaskDef(): string {
  const md = fs.readFileSync(CLAUDE_MD, 'utf-8');
  const m = /\*\*Last known working task definition:\*\*\s*`tailrd-backend:(\d+)`/.exec(md);
  if (!m) throw new Error('PATH_TO_ROBUST figure binding: CLAUDE.md section 9 task-def pointer not found');
  return m[1];
}

/**
 * Removal-proofing. Deleting or renaming any of these fails the build, which is the half of the
 * silent-staleness hole that CAN be closed mechanically.
 */
const REQUIRED_KEYS = [
  'coverage.any', 'coverage.pct', 'coverage.detOk', 'coverage.partial', 'coverage.specOnly',
  'coverage.hf', 'coverage.ep', 'coverage.sh', 'coverage.cad', 'coverage.vhd', 'coverage.pv',
  'coverage.any2', 'coverage.pct2', 'coverage.partial2', 'coverage.specOnly2',
  'engine.gapsPush',
  'register.open2', 'register.high2', 'register.medium2', 'register.low2', 'register.info2',
  'deploy.lastKnownGoodTaskDef',
];

describe('PATH_TO_ROBUST.md: every marked figure matches its derived source', () => {
  const marks = markers();

  it('every required marker is present - removing one is a build failure, not a silent loss', () => {
    for (const k of REQUIRED_KEYS) {
      expect(marks.has(k) ? k : `MISSING:${k}`).toBe(k);
    }
  });

  it('coverage totals match the cross-module synthesis TOTAL row', () => {
    const t = synthesisTotals();
    expect(marks.get('coverage.any')).toBe(t.anyRatio);
    expect(marks.get('coverage.pct')).toBe(t.pct);
    expect(marks.get('coverage.detOk')).toBe(t.detOk);
    expect(marks.get('coverage.partial')).toBe(t.partial);
    expect(marks.get('coverage.specOnly')).toBe(t.specOnly);
  });

  it('the section-8 restatement of coverage matches the same source (one document, one number)', () => {
    // Two passages quoting the same figure is exactly how this document drifted the first time: the
    // section 1.2 total and the Tranche 3 record disagreed. Both restatements are bound, so they
    // cannot diverge from the source OR from each other again.
    const t = synthesisTotals();
    expect(marks.get('coverage.any2')).toBe(t.anyRatio);
    expect(marks.get('coverage.pct2')).toBe(t.pct);
    expect(marks.get('coverage.any2')).toBe(marks.get('coverage.any'));
    expect(marks.get('coverage.pct2')).toBe(marks.get('coverage.pct'));
  });

  it('the Track A buildout restatement matches the live split', () => {
    const t = synthesisTotals();
    expect(marks.get('coverage.partial2')).toBe(t.partial);
    expect(marks.get('coverage.specOnly2')).toBe(t.specOnly);
  });

  it('per-module coverage matches the synthesis rows - CAD is where the last drift hid', () => {
    for (const [key, mod] of [
      ['coverage.hf', 'HF'], ['coverage.ep', 'EP'], ['coverage.sh', 'SH'],
      ['coverage.cad', 'CAD'], ['coverage.vhd', 'VHD'], ['coverage.pv', 'PV'],
    ] as const) {
      expect(`${mod}=${marks.get(key)}`).toBe(`${mod}=${synthesisPerModule(mod)}`);
    }
  });

  it('the gaps.push count matches the engine', () => {
    expect(marks.get('engine.gapsPush')).toBe(String(gapsPushCount()));
  });

  it('the register total and severity split match registerOpenCount', () => {
    const r: any = runCount(REGISTER);
    expect(marks.get('register.open2')).toBe(String(r.total));
    const sev = r.bySeverity ?? {};
    const get = (k: string) => String(sev[k] ?? sev[k.toUpperCase()] ?? '');
    expect(marks.get('register.high2')).toBe(get('HIGH (P1)'));
    expect(marks.get('register.medium2')).toBe(get('MEDIUM (P2)'));
    expect(marks.get('register.low2')).toBe(get('LOW (P3)'));
    expect(marks.get('register.info2')).toBe(get('INFO'));
  });

  it('the task-def pointer matches CLAUDE.md section 9 - the plan quotes it, section 9 owns it', () => {
    expect(marks.get('deploy.lastKnownGoodTaskDef')).toBe(lastKnownGoodTaskDef());
  });

  it('the syntax example in section 9 is NOT parsed as a marker', () => {
    // Exemption by construction: the example uses an uppercase KEY and the key regex requires
    // lowercase-first. If someone "tidies" the example to a lowercase key, this fails loudly rather
    // than the suite mysteriously demanding a source for a documentation placeholder.
    expect([...marks.keys()]).not.toContain('KEY');
    expect(fs.readFileSync(PLAN, 'utf-8')).toContain('<!--@checked KEY-->');
  });
});
