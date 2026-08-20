/**
 * AUDIT-328 part (iii): the gate must distinguish "nothing changed" from "nothing ran".
 *
 * THE GATE SHAPE THIS EXISTS TO FIX: every gate in auditCanonical.yml regenerates then runs
 * `git diff --exit-code`. A stage that writes NO output produces NO diff, so the gate passes. Parts
 * (i)+(ii) made a SKIPPING stage exit non-zero, which CI observes - but a stage that no-ops without
 * skipping is still invisible, and so is a hand-edited input on a PR whose paths do not trigger the
 * regenerating gate at all (the AUDIT-229 rotting-hinge problem).
 *
 * The verifier is hung on Gate 5, which runs UNCONDITIONALLY, precisely so it does not inherit the
 * path-trigger fragility of Gates 2-4.
 *
 * All assertions drive the pure `verifyManifests()` with `manifestDir` / `repoRoot` overrides, so no
 * test mutates the real canonical tree.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
  MANIFESTED_STAGES,
  MANIFEST_SCHEMA_VERSION,
  verifyManifests,
  formatProblems,
  type StageManifest,
} from '../../../scripts/auditCanonical/lib/manifest';

const BACKEND = path.resolve(__dirname, '..', '..', '..');
const REPO = path.resolve(BACKEND, '..');
const REAL_MANIFESTS = path.join(REPO, 'docs', 'audit', 'canonical', '.manifests');
const EXPECTED_MODULES = 6;

/** A sandbox repo-root containing only the files the manifests reference, plus the manifests. */
function sandbox(): { root: string; manifestDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit328iii-'));
  const manifestDir = path.join(root, 'manifests');
  fs.mkdirSync(manifestDir, { recursive: true });
  for (const stage of MANIFESTED_STAGES) {
    const src = path.join(REAL_MANIFESTS, `${stage}.manifest.json`);
    fs.copyFileSync(src, path.join(manifestDir, `${stage}.manifest.json`));
    const m = JSON.parse(fs.readFileSync(src, 'utf8')) as StageManifest;
    for (const ref of [...m.inputs, ...m.outputs]) {
      const dest = path.join(root, ref.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest)) fs.copyFileSync(path.join(REPO, ref.path), dest);
    }
  }
  return { root, manifestDir };
}

function readManifest(dir: string, stage: string): StageManifest {
  return JSON.parse(fs.readFileSync(path.join(dir, `${stage}.manifest.json`), 'utf8')) as StageManifest;
}
function writeManifest(dir: string, stage: string, m: StageManifest): void {
  fs.writeFileSync(path.join(dir, `${stage}.manifest.json`), JSON.stringify(m, null, 2));
}

describe('AUDIT-328 (iii) negative control: a faithful tree verifies clean', () => {
  it('an unaltered sandbox produces no problems', () => {
    const { root, manifestDir } = sandbox();
    expect(verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root })).toEqual([]);
  });

  it('the REAL committed tree verifies clean (the state this PR ships)', () => {
    expect(verifyManifests({ expectedModules: EXPECTED_MODULES })).toEqual([]);
  });
});

describe('AUDIT-328 (iii) RED case 1: a stage that RAN and wrote NOTHING', () => {
  // This is the case regenerate-then-diff cannot see: no output written means no diff to find.
  it('a manifest recording zero processed modules is NOTHING_RAN', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'renderSynthesis');
    writeManifest(manifestDir, 'renderSynthesis', { ...m, modulesProcessed: [], outputs: [] });

    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.stage === 'renderSynthesis' && p.kind === 'NOTHING_RAN')).toBe(true);
    expect(formatProblems(problems)).toContain('the stage ran and did nothing');
  });

  it('a PARTIAL run - five of six modules - is also NOTHING_RAN, not silently accepted', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'reconcile');
    writeManifest(manifestDir, 'reconcile', { ...m, modulesProcessed: m.modulesProcessed.slice(0, 5) });

    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.stage === 'reconcile' && p.kind === 'NOTHING_RAN')).toBe(true);
  });

  it('an ABSENT manifest means the stage has no record of ever running', () => {
    const { root, manifestDir } = sandbox();
    fs.unlinkSync(path.join(manifestDir, 'extractCode.manifest.json'));
    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.stage === 'extractCode' && p.kind === 'MISSING')).toBe(true);
  });
});

describe('AUDIT-328 (iii) RED case 2: a hand-edited input, on a PR that triggers no regenerating gate', () => {
  // Gates 2-4 are path-triggered. Gate 5 is not, which is why the verifier hangs there.
  it('editing a crosswalk without regenerating is INPUT_DRIFT', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'renderSynthesis');
    const crosswalk = m.inputs.find((i) => i.path.endsWith('.crosswalk.json'));
    expect(crosswalk).toBeDefined();

    const abs = path.join(root, crosswalk!.path);
    fs.writeFileSync(abs, fs.readFileSync(abs, 'utf8').replace('{', '{ '));

    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    const drift = problems.filter((p) => p.kind === 'INPUT_DRIFT');
    expect(drift.length).toBeGreaterThan(0);
    expect(drift[0].detail).toContain('changed since this stage last ran');
  });

  it('a rewritten OUTPUT is OUTPUT_DRIFT - the manifest cannot claim work it did not do', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'renderAddendum');
    const abs = path.join(root, m.outputs[0].path);
    fs.appendFileSync(abs, '\nhand-edited\n');

    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.kind === 'OUTPUT_DRIFT')).toBe(true);
  });

  it('a recorded file that has been deleted is FILE_ABSENT', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'reconcile');
    fs.unlinkSync(path.join(root, m.outputs[0].path));
    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.kind === 'FILE_ABSENT')).toBe(true);
  });
});

describe('AUDIT-328 (iii) schema and skip guards', () => {
  it('a schemaVersion mismatch fails loudly rather than being misread', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'extractSpec');
    writeManifest(manifestDir, 'extractSpec', { ...m, schemaVersion: MANIFEST_SCHEMA_VERSION + 1 });
    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.kind === 'SCHEMA_VERSION')).toBe(true);
  });

  it('a non-empty modulesSkipped is flagged - part (i) should have made it fatal at run time', () => {
    const { root, manifestDir } = sandbox();
    const m = readManifest(manifestDir, 'reconcile');
    writeManifest(manifestDir, 'reconcile', { ...m, modulesSkipped: ['VHD'] });
    const problems = verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root });
    expect(problems.some((p) => p.kind === 'SKIPPED_NONEMPTY')).toBe(true);
  });

  it('the failure text names the stage and the command that fixes it', () => {
    const { root, manifestDir } = sandbox();
    fs.unlinkSync(path.join(manifestDir, 'reconcile.manifest.json'));
    const msg = formatProblems(verifyManifests({ expectedModules: EXPECTED_MODULES, manifestDir, repoRoot: root }));
    expect(msg).toContain('reconcile');
    expect(msg).toContain('reconcile.ts --all');
    expect(msg).toMatch(/never hand-edit/i);
    expect(msg).toContain('AUDIT-328');
  });
});

describe('AUDIT-328 (iii) a partial run must not clobber the committed manifest', () => {
  // A --module run regenerates ONE module. If it overwrote the manifest, the committed record would
  // claim only one module was ever generated - false about the other five, and Gate 5 would then
  // fail for a reason that is an artifact of the tooling rather than a real defect.
  it('a --module run leaves the committed manifest untouched and verification still passes', () => {
    const before = fs.readFileSync(path.join(REAL_MANIFESTS, 'extractCode.manifest.json'), 'utf8');
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'audit328iii-out-'));
    const r = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['tsx', path.join('scripts', 'auditCanonical', 'extractCode.ts'), '--module', 'HF', '--output', out],
      { cwd: BACKEND, encoding: 'utf8', timeout: 120_000, shell: process.platform === 'win32' },
    );
    expect(r.status).toBe(0);
    expect(fs.readFileSync(path.join(REAL_MANIFESTS, 'extractCode.manifest.json'), 'utf8')).toBe(before);
    expect(verifyManifests({ expectedModules: EXPECTED_MODULES })).toEqual([]);
  }, 180_000);
});
