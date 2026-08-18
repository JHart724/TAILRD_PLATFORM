/**
 * AUDIT-321 guard: the ignored-but-tracked detector.
 *
 * THE FAILURE MODE: a `.gitignore` entry does NOTHING for a file that is ALREADY tracked - git
 * consults ignore rules only for UNtracked paths. So a rule can be added, look like protection, and
 * silently do nothing forever. `.claude/settings.local.json` sat tracked for five months that way
 * while CLAUDE.md RULE 9 and the ignore entry both appeared to be in force.
 *
 * WHAT THIS CHECKS: no TRACKED path may match a `.gitignore` pattern. That single state -
 * tracked AND ignored - is what the whole class shares, and the manual sweep that motivated this
 * detector found NINE more instances beyond the one that prompted it.
 *
 * THE STATE HAS TWO OPPOSITE REMEDIES, and the detector deliberately does not guess between them:
 *   (1) the RULE is wrong and the file must stay tracked - e.g. `package-lock.json`, which npm ci
 *       requires, and `.env.production`, which is public-by-design frontend build config. Remedy:
 *       fix `.gitignore` (remove or negate the rule). Do NOT untrack.
 *   (2) the TRACKING is wrong and the rule is right - e.g. local settings, probe scripts, run-task
 *       payloads. Remedy: `git rm --cached <path>` (the file stays on disk).
 * Choosing between them is human judgment, so the failure message states both and names neither as
 * the answer.
 *
 * NOT COVERED (stated plainly rather than implied): a file that SHOULD be tracked but was never
 * committed and is ignored is invisible here - there is no tracked entry to find. This detector
 * sees only the tracked-AND-ignored intersection.
 *
 * Offline and deterministic: it shells out to git (the only correct authority on git's own ignore
 * semantics - reimplementing negation, anchoring and glob precedence would be a new bug surface),
 * reads no network, and asserts on the working tree as checked out. NO allowlist and NO baseline
 * exemptions by design: the tree was cleaned to zero first, so this ships green on its own merits.
 */

import { execFileSync } from 'child_process';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

/** Fail LOUD (never silently pass) if this is not a git work tree - a skip here would be a suppression. */
function assertGitWorkTree(): void {
  try {
    if (git(['rev-parse', '--is-inside-work-tree']).trim() !== 'true') throw new Error('not a work tree');
  } catch {
    throw new Error(
      'AUDIT-321 detector requires a git work tree (it asks git which tracked paths are ignored). ' +
        'It must NOT be skipped: a skip would restore exactly the silent-no-protection state it exists to catch.',
    );
  }
}

export interface IgnoredTracked {
  path: string;
  /** The winning ignore rule, as `<file>:<line>:<pattern>`; '(rule not resolved)' if git cannot report one. */
  rule: string;
}

/** The winning ignore rule for a path. `--no-index` is required: without it check-ignore ignores tracked files. */
export function winningRule(p: string): string {
  try {
    const line = git(['check-ignore', '--no-index', '-v', '--', p]).split(/\r?\n/)[0] ?? '';
    const parts = line.split('\t');
    return parts[0]?.trim() || '(rule not resolved)';
  } catch {
    return '(rule not resolved)';
  }
}

/** Every TRACKED path that matches a .gitignore pattern. Empty is the only acceptable result. */
export function findIgnoredTracked(): IgnoredTracked[] {
  assertGitWorkTree();
  return git(['ls-files', '-i', '-c', '--exclude-standard'])
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((p) => ({ path: p, rule: winningRule(p) }));
}

/** Count of tracked paths examined - reported so the check's coverage is visible, not assumed. */
export function trackedFileCount(): number {
  assertGitWorkTree();
  return git(['ls-files']).split(/\r?\n/).filter((l) => l.length > 0).length;
}

/** Actionable failure text: names the path, names the winning rule, and states BOTH remedies. */
export function formatFindings(findings: IgnoredTracked[]): string {
  const rows = findings
    .map((f) => `  ${f.path}\n      ignored by ${f.rule} - yet it is TRACKED, so that rule does nothing for it.`)
    .join('\n');
  return (
    `${findings.length} tracked path(s) match a .gitignore pattern (ignored-but-tracked):\n${rows}\n\n` +
    'A .gitignore entry does NOTHING for an already-tracked file, so this rule is not protecting anything.\n' +
    'Pick the remedy that fits - the detector does not choose for you:\n' +
    '  (1) the file MUST stay tracked (e.g. a lockfile npm ci needs, or public build config):\n' +
    '      fix .gitignore - remove the rule, or add a negation such as !<path>.\n' +
    '  (2) the file should NOT be tracked (local settings, scratch artifacts, run payloads):\n' +
    '      run: git rm --cached <path>   (the file stays on disk and becomes genuinely ignored)\n' +
    'Do NOT add an allowlist to this test. See AUDIT-321.'
  );
}

describe('AUDIT-321 ignored-but-tracked detector (message contract - synthetic, no git state)', () => {
  it('names the path, the winning rule, and BOTH remedies', () => {
    const msg = formatFindings([{ path: '.claude/settings.local.json', rule: '.gitignore:41:.claude/*.local.json' }]);
    expect(msg).toContain('.claude/settings.local.json');
    expect(msg).toContain('.gitignore:41:.claude/*.local.json');
    expect(msg).toContain('git rm --cached');
    expect(msg).toContain('negation');
    expect(msg).toContain('AUDIT-321');
  });

  it('reports the count and lists every finding, not just the first', () => {
    const msg = formatFindings([
      { path: 'package-lock.json', rule: '.gitignore:5:package-lock.json' },
      { path: '.env.production', rule: '.gitignore:24:.env.*' },
    ]);
    expect(msg).toContain('2 tracked path(s)');
    expect(msg).toContain('package-lock.json');
    expect(msg).toContain('.env.production');
  });
});

describe('AUDIT-321 ignored-but-tracked detector (live tree)', () => {
  it('no tracked path matches a .gitignore pattern', () => {
    const findings = findIgnoredTracked();
    if (findings.length > 0) throw new Error(formatFindings(findings));
    expect(findings).toEqual([]);
  });

  it('examined the whole tracked set (coverage is measured, not assumed)', () => {
    expect(trackedFileCount()).toBeGreaterThan(500);
  });
});
