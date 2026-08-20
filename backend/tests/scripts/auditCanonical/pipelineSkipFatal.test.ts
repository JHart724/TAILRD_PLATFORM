/**
 * AUDIT-328: a canonical pipeline stage that SKIPS a module must EXIT NON-ZERO.
 *
 * THE DEFECT: every stage that cannot find its inputs prints `SKIPPED` to stderr and `continue`s.
 * Four of them (applyOverrides, renderAddendum, parseExistingAddendum, reconcile) carry no
 * process.exit at all beyond a CLI-arg guard, so they exit 0 however many modules skipped. The
 * other three exit on a DIFFERENT condition (refreshCites on `anyError`, validateCrosswalk on
 * `anyInvalid`, validateCanonical on `valid`), and a skipped module is not an errored or invalid
 * one, so a skip slips past those too. The section 9.2 eight-stage regen can therefore no-op
 * entirely while reporting success.
 *
 * WHY THESE TESTS SPAWN (and why that is not a reversal of AUDIT-206): the property under test IS
 * THE EXIT CODE, and an exit code can only be observed by running a process. An in-process test of
 * a return value would be a strictly weaker assertion - it would pass for a stage that computes
 * `skipped > 0` correctly and then forgets to act on it, which is exactly the applyOverrides and
 * renderAddendum bug. AUDIT-206 removed a FLAKY DUPLICATE spawn of a script that was already
 * testable in-process; here the spawn is the only instrument that can see the thing being asserted.
 *
 * `validateCanonical` is the exception and is driven IN-PROCESS, because AUDIT-206 made
 * `runValidation()` pure. It gained an optional `inputDir` parameter (defaulting to
 * CANONICAL_OUTPUT_DIR, so `main()` is byte-equivalent) purely so a skipped-module tree can be
 * constructed without mutating the real canonical directory.
 *
 * NO --allow-skip FLAG EXISTS, BY OPERATOR RULING 2026-08-19: skip is fatal. All six modules carry
 * all four artifacts today, so nothing skips and no escape hatch is needed; the moment someone
 * would reach for such a flag is the moment the gate should hold. A future staged promotion is a
 * reviewed MODULE_CONFIGS change, not a runtime bypass.
 */

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runValidation } from '../../../scripts/auditCanonical/validateCanonical';

const BACKEND = path.resolve(__dirname, '..', '..', '..');
const REPO = path.resolve(BACKEND, '..');
const CANONICAL = path.join(REPO, 'docs', 'audit', 'canonical');

const SPAWN_TIMEOUT = 120_000;
const TEST_TIMEOUT = 180_000;

/** Copy the canonical corpus to a temp dir, optionally omitting one file. */
function makeTree(omit?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit328-'));
  for (const f of fs.readdirSync(CANONICAL)) {
    if (f === omit) continue;
    // AUDIT-328 (iii) added docs/audit/canonical/.manifests/ - copyFileSync throws EISDIR on a
    // directory, so entries must be filtered by type rather than assumed to be files.
    if (!fs.statSync(path.join(CANONICAL, f)).isFile()) continue;
    fs.copyFileSync(path.join(CANONICAL, f), path.join(dir, f));
  }
  return dir;
}

function outDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audit328-out-'));
}

/** Run a stage and return its exit code. Spawned because the exit code is the assertion. */
function runStage(script: string, args: string[]): number {
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', path.join('scripts', 'auditCanonical', `${script}.ts`), ...args],
    { cwd: BACKEND, encoding: 'utf8', timeout: SPAWN_TIMEOUT, shell: process.platform === 'win32' },
  );
  if (r.error) throw r.error;
  return r.status ?? -1;
}

/**
 * The six stages that accept `--input`, each paired with the artifact whose absence triggers ITS
 * OWN skip branch. Deleting a VHD file leaves the other five modules intact, so every case here is
 * the PARTIAL-skip case - the one a whole-tree test would miss, and the one validateCanonical's
 * `modulesValidated > 0` predicate currently lets through.
 */
const SPAWNED_STAGES: ReadonlyArray<{ script: string; omit: string; needsOutput: boolean }> = [
  { script: 'applyOverrides', omit: 'VHD.crosswalk.json', needsOutput: false },
  { script: 'renderAddendum', omit: 'VHD.reconciliation.json', needsOutput: true },
  { script: 'parseExistingAddendum', omit: 'VHD.reconciliation.json', needsOutput: true },
  { script: 'reconcile', omit: 'VHD.spec.json', needsOutput: true },
  { script: 'refreshCites', omit: 'VHD.crosswalk.json', needsOutput: false },
  { script: 'validateCrosswalk', omit: 'VHD.crosswalk.json', needsOutput: false },
];

function argsFor(stage: { needsOutput: boolean }, input: string): string[] {
  return stage.needsOutput ? ['--all', '--input', input, '--output', outDir()] : ['--all', '--input', input];
}

describe('AUDIT-328 negative control: an INTACT tree must exit 0 everywhere', () => {
  // Without this the suite would pass trivially if the fix made every stage fail unconditionally.
  for (const stage of SPAWNED_STAGES) {
    it(
      `${stage.script}: intact tree exits 0`,
      () => {
        const input = makeTree();
        expect(runStage(stage.script, argsFor(stage, input))).toBe(0);
      },
      TEST_TIMEOUT,
    );
  }

  it('validateCanonical: intact tree is valid (in-process)', () => {
    const v = runValidation(makeTree());
    expect(v.valid).toBe(true);
    expect(v.modulesValidated).toBe(6);
  });
});

describe('AUDIT-328 partial skip: five modules intact, one input removed, must exit NON-ZERO', () => {
  for (const stage of SPAWNED_STAGES) {
    it(
      `${stage.script}: skipping VHD (no ${stage.omit}) exits non-zero`,
      () => {
        const input = makeTree(stage.omit);
        expect(runStage(stage.script, argsFor(stage, input))).not.toBe(0);
      },
      TEST_TIMEOUT,
    );
  }

  it('validateCanonical: a SKIPPED_NO_SPEC module makes the aggregate invalid', () => {
    // The precise hole: modulesValidated is 5 (> 0) and no module is INVALID, so the old predicate
    // `modulesValidated > 0 && !anyInvalid` returned TRUE with a module silently unvalidated.
    const v = runValidation(makeTree('VHD.spec.json'));
    expect(v.modulesValidated).toBe(5);
    expect(v.results.some((r) => r.status === 'SKIPPED_NO_SPEC')).toBe(true);
    expect(v.valid).toBe(false);
  });

  it('validateCanonical: a SKIPPED_NO_CROSSWALK module makes the aggregate invalid', () => {
    const v = runValidation(makeTree('VHD.crosswalk.json'));
    expect(v.results.some((r) => r.status === 'SKIPPED_NO_CROSSWALK')).toBe(true);
    expect(v.valid).toBe(false);
  });
});

describe('AUDIT-328 the skip counter is denominated in TARGETS, not the module total', () => {
  it(
    'a --module run over an intact tree exits 0 (it must not count the five untargeted modules as skips)',
    () => {
      // The implementation trap: counting against MODULE_CONFIGS.length rather than targets.length
      // makes every single-module run self-fail with five phantom skips.
      const input = makeTree();
      const r = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['tsx', path.join('scripts', 'auditCanonical', 'validateCrosswalk.ts'), '--module', 'HF', '--input', input],
        { cwd: BACKEND, encoding: 'utf8', timeout: SPAWN_TIMEOUT, shell: process.platform === 'win32' },
      );
      expect(r.status).toBe(0);
    },
    TEST_TIMEOUT,
  );

  it(
    'a --module run whose OWN target is missing exits non-zero',
    () => {
      const input = makeTree('HF.crosswalk.json');
      const r = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['tsx', path.join('scripts', 'auditCanonical', 'validateCrosswalk.ts'), '--module', 'HF', '--input', input],
        { cwd: BACKEND, encoding: 'utf8', timeout: SPAWN_TIMEOUT, shell: process.platform === 'win32' },
      );
      expect(r.status).not.toBe(0);
    },
    TEST_TIMEOUT,
  );
});

describe('AUDIT-328 no escape hatch exists', () => {
  it('no stage accepts --allow-skip (operator ruling: skip is fatal, no flag)', () => {
    const names = [...SPAWNED_STAGES.map((s) => s.script), 'validateCanonical'];
    for (const n of names) {
      const src = fs.readFileSync(path.join(BACKEND, 'scripts', 'auditCanonical', `${n}.ts`), 'utf8');
      // Assert on the QUOTED form an arg parser would match, not the bare token - the AUDIT-328
      // comment in each stage names the flag in prose to explain why it is absent, and a comment
      // mentioning a flag is not a flag. Matching the bare token flagged that comment as the
      // very thing it was documenting.
      expect(src).not.toMatch(/['"`]--allow-skip['"`]/);
      expect(src).not.toMatch(/allowSkip/);
    }
  });

  it('sanity: the real canonical corpus is complete, so nothing skips on main', () => {
    // If this ever fails, the pipeline is ALREADY skipping in normal operation and that is a
    // finding, not a test to relax.
    execFileSync('node', ['-e', '0']); // no-op; keeps the import surface honest
    for (const m of ['CAD', 'EP', 'HF', 'PV', 'SH', 'VHD']) {
      for (const kind of ['spec', 'code', 'crosswalk', 'reconciliation']) {
        expect(fs.existsSync(path.join(CANONICAL, `${m}.${kind}.json`))).toBe(true);
      }
    }
  });
});
