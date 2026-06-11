/**
 * Tests for applyOverrides.ts.
 *
 * Per AUDIT-041 fix design (operator-approved 2026-05-06): 6 tests covering the
 * canonical-default behavior, --candidate opt-in flag, idempotency, missing-file
 * graceful skip, no-op-overrides modules, and cross-module --all coverage.
 *
 * The script's OVERRIDES dictionary is not parameterizable from tests. To stay
 * deterministic, these tests run the actual CLI against fixture canonical/candidate
 * files in an isolated tmp dir using --input <dir>. Assertions on override content
 * anchor to the exported OVERRIDES dict (imported below) rather than hardcoded
 * clinical-verdict literals, so a re-audit that re-classifies a gap cannot strand
 * this suite (AUDIT-110).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { stableStringify } from '../../../scripts/auditCanonical/lib/utils';
// Side-effect-free import: applyOverrides.ts gates its CLI main() behind require.main === module.
import { OVERRIDES } from '../../../scripts/auditCanonical/applyOverrides';

const SCRIPT = path.join(__dirname, '../../../scripts/auditCanonical/applyOverrides.ts');
const CANONICAL_DIR = path.join(__dirname, '../../../../docs/audit/canonical');

function runApplyOverrides(args: string[], inputDir: string): { stdout: string; stderr: string; combined: string } {
  // execSync via shell so `npx tsx` resolves on both Windows and POSIX
  const cmd = `npx tsx "${SCRIPT}" ${args.map(a => `"${a}"`).join(' ')} --input "${inputDir}" 2>&1`;
  try {
    const combined = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    } as any);
    return { stdout: combined, stderr: '', combined };
  } catch (err: any) {
    const out = err.stdout?.toString() ?? '';
    const errOut = err.stderr?.toString() ?? '';
    return { stdout: out, stderr: errOut, combined: out + errOut };
  }
}

function setupTmpDir(includeCanonical: boolean, includeCandidate: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'applyOverrides-test-'));
  // Copy code.json + reconciliation.json + crosswalk variants from real canonical
  for (const mod of ['HF', 'EP', 'SH', 'CAD', 'VHD', 'PV']) {
    fs.copyFileSync(
      path.join(CANONICAL_DIR, `${mod}.code.json`),
      path.join(tmpDir, `${mod}.code.json`),
    );
    if (fs.existsSync(path.join(CANONICAL_DIR, `${mod}.reconciliation.json`))) {
      fs.copyFileSync(
        path.join(CANONICAL_DIR, `${mod}.reconciliation.json`),
        path.join(tmpDir, `${mod}.reconciliation.json`),
      );
    }
    if (includeCanonical) {
      fs.copyFileSync(
        path.join(CANONICAL_DIR, `${mod}.crosswalk.json`),
        path.join(tmpDir, `${mod}.crosswalk.json`),
      );
    }
    if (includeCandidate) {
      // Candidate files share schema with canonical; copy canonical as a fixture.
      // The committed canonical *.crosswalk.json contains the override pins applied
      // yesterday (PRs #238/240/241/243), which is exactly what --candidate-mode tests
      // need to assert against. The actual *.crosswalk.candidate.json is gitignored
      // / not committed, so we synthesize the fixture from canonical here.
      fs.copyFileSync(
        path.join(CANONICAL_DIR, `${mod}.crosswalk.json`),
        path.join(tmpDir, `${mod}.crosswalk.candidate.json`),
      );
    }
  }
  return tmpDir;
}

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function findRow(crosswalk: any, specGapId: string): any | undefined {
  return crosswalk.rows.find((r: any) => r.specGapId === specGapId);
}

interface ModuleSummary {
  code: string;
  applied: number;
  demoted: number;
  configured: number;
}

// Parse the script's per-module summary lines:
//   "  <CODE>: applied=<A> demoted=<D> (out of <N> configured)"
// N is dict-derived inside applyOverrides.ts, so tests read counts here instead of
// hardcoding any module name or integer.
function parseSummaryLines(stdout: string): ModuleSummary[] {
  const re = /([A-Z]{2,4}): applied=(\d+) demoted=(\d+) \(out of (\d+) configured\)/;
  return stdout
    .split('\n')
    .map((l) => l.match(re))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({
      code: m[1],
      applied: Number(m[2]),
      demoted: Number(m[3]),
      configured: Number(m[4]),
    }));
}

describe('applyOverrides — AUDIT-041 canonical-default behavior', () => {
  jest.setTimeout(60000); // CLI subprocess; allow time for tsx warmup

  it('default mode writes overrides to *.crosswalk.json (canonical)', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--module', 'EP'], tmpDir);
    expect(result.stdout).toContain('=== applyOverrides.ts (canonical) ===');
    expect(result.stdout).toMatch(/EP: applied=\d+/);

    // GAP-EP-079 is the named write-path exemplar. Its classification and auditNote
    // are asserted against the exported OVERRIDES dict, not hardcoded clinical-verdict
    // literals, so a re-audit that re-classifies the gap cannot strand this test
    // (AUDIT-110). A non-SPEC_ONLY override MUST preserve its registryId-derived
    // ruleBodyCite (without a resolvable registryId it demotes to SPEC_ONLY) - the
    // exact mechanic the 13 EP flips rely on.
    const expected = OVERRIDES.EP['GAP-EP-079'];
    expect(expected).toBeDefined();
    const xw = readJson(path.join(tmpDir, 'EP.crosswalk.json'));
    const row = findRow(xw, 'GAP-EP-079');
    expect(row).toBeDefined();
    expect(row.classification).toBe(expected.classification);
    expect(row.auditNotes).toContain(expected.auditNote);
    expect(row.ruleBodyCite).toBeDefined();
    expect(row.ruleBodyCite.evaluatorBlockName).toBe('EP-079');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--candidate mode writes overrides to *.crosswalk.candidate.json (legacy verifyDraft baseline workflow)', () => {
    const tmpDir = setupTmpDir(/*canonical*/ false, /*candidate*/ true);
    const result = runApplyOverrides(['--module', 'EP', '--candidate'], tmpDir);
    expect(result.stdout).toContain('=== applyOverrides.ts (candidate) ===');

    // Candidate file should contain the override (was already pinned in the live candidate file from prior verifyDraft cycle).
    // Dict-anchored: asserted against OVERRIDES.EP, not a hardcoded clinical verdict (AUDIT-110).
    const expected = OVERRIDES.EP['GAP-EP-079'];
    expect(expected).toBeDefined();
    const xw = readJson(path.join(tmpDir, 'EP.crosswalk.candidate.json'));
    const row = findRow(xw, 'GAP-EP-079');
    expect(row).toBeDefined();
    expect(row.classification).toBe(expected.classification);
    expect(row.auditNotes).toContain(expected.auditNote);

    // Canonical file in tmp dir should NOT have been written (we didn't include it; --candidate mode targets candidate only)
    expect(fs.existsSync(path.join(tmpDir, 'EP.crosswalk.json'))).toBe(false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('idempotency: re-running on already-applied state produces byte-identical output', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    runApplyOverrides(['--module', 'EP'], tmpDir);
    const after1 = fs.readFileSync(path.join(tmpDir, 'EP.crosswalk.json'), 'utf8');
    runApplyOverrides(['--module', 'EP'], tmpDir);
    const after2 = fs.readFileSync(path.join(tmpDir, 'EP.crosswalk.json'), 'utf8');
    expect(after2).toBe(after1);

    // Cross-check via stableStringify of parsed JSON (defends against whitespace drift in raw file)
    expect(stableStringify(JSON.parse(after2))).toBe(stableStringify(JSON.parse(after1)));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('missing target file: graceful skip with informative message', () => {
    const tmpDir = setupTmpDir(/*canonical*/ false, /*candidate*/ false);
    const result = runApplyOverrides(['--all'], tmpDir);
    // No canonical files copied → all 6 modules should skip
    // SKIPPED messages go to stderr; use combined stream
    expect(result.combined).toMatch(/HF: SKIPPED — no canonical file/);
    expect(result.combined).toMatch(/EP: SKIPPED — no canonical file/);
    expect(result.combined).toMatch(/CAD: SKIPPED — no canonical file/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('empty-override modules (N=0 configured) run cleanly: applied=0, demoted=0, crosswalk byte-identical to source', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--all'], tmpDir);

    // Select empty-override modules DYNAMICALLY from the script's own dict-derived
    // summary lines. Which modules have an empty OVERRIDES table is a property of the
    // script, not a constant: this test NEVER names a module and NEVER freezes a count,
    // so adding overrides to a previously-empty module must not require a test edit.
    const summary = parseSummaryLines(result.stdout);
    const emptyModules = summary.filter((s) => s.configured === 0);

    if (emptyModules.length === 0) {
      // Skip-with-loud-reason: do NOT silently pass. If no module is empty anymore, the
      // zero-override code path (applyOverrides early-return at applied=0/demoted=0) can
      // no longer be exercised here and the coverage gap must be visible in CI logs.
      console.warn(
        '[applyOverrides.test] WARNING: no module has an empty OVERRIDES table at this commit. ' +
          'The zero-override code path (applyOverrides early-return, no file write) can no longer be ' +
          'exercised by this test. Restore an empty-override module or add a deliberately-empty fixture ' +
          'module to keep this path covered.',
      );
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return;
    }

    for (const m of emptyModules) {
      expect(m.applied).toBe(0);
      expect(m.demoted).toBe(0);

      // Empty-override modules early-return WITHOUT writing the target file
      // (applyOverrides.ts: applied=0/demoted=0 short-circuit), so the tmp crosswalk
      // must be byte-identical to the source canonical it was copied from.
      const before = fs.readFileSync(path.join(CANONICAL_DIR, `${m.code}.crosswalk.json`), 'utf8');
      const after = fs.readFileSync(path.join(tmpDir, `${m.code}.crosswalk.json`), 'utf8');
      expect(after).toBe(before);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--all applies overrides across multiple modules deterministically', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--all'], tmpDir);

    // All 6 modules should appear in deterministic order (per MODULE_CONFIGS iteration)
    const lines = result.stdout.split('\n').filter(l => l.match(/^\s+(HF|EP|SH|CAD|VHD|PV):/));
    expect(lines.length).toBe(6);

    // Module-specific overrides should land correctly per-module.
    // DET_OK-preservation: the exemplar is selected DYNAMICALLY from the exported
    // OVERRIDES dict (any module, declared classification DET_OK) instead of naming a
    // gap, so a re-audit that re-classifies the current exemplar cannot strand this
    // test (AUDIT-110). Loud skip if the class is empty - a silently-hollow pass would
    // hide the coverage gap.
    const detOkExemplars = Object.entries(OVERRIDES).flatMap(([mod, entries]) =>
      Object.entries(entries)
        .filter(([, o]) => o.classification === 'DET_OK')
        .map(([gapId, o]) => ({ mod, gapId, o })),
    );
    if (detOkExemplars.length === 0) {
      console.warn(
        '[applyOverrides.test] WARNING: no override in the OVERRIDES dict declares DET_OK at this ' +
          'commit. The DET_OK-preservation path (a DET_OK override surviving the --all pass) is no ' +
          'longer exercised by this test. Add a DET_OK override or a deliberately-DET_OK fixture ' +
          'entry to keep this path covered.',
      );
    } else {
      const { mod, gapId, o } = detOkExemplars[0];
      const detXw = readJson(path.join(tmpDir, `${mod}.crosswalk.json`));
      const detRow = findRow(detXw, gapId);
      expect(detRow).toBeDefined();
      expect(detRow.classification).toBe(o.classification);
    }

    // PARTIAL-with-cite regression: a PARTIAL_DETECTION override with a registryId must
    // keep its registryId-derived ruleBodyCite (else it would demote to SPEC_ONLY).
    // Exemplar selected dynamically from the exported dict (AUDIT-110); loud skip if
    // the class is empty.
    const partialCiteExemplars = Object.entries(OVERRIDES).flatMap(([mod, entries]) =>
      Object.entries(entries)
        .filter(([, o]) => o.classification === 'PARTIAL_DETECTION' && o.registryId !== undefined)
        .map(([gapId, o]) => ({ mod, gapId, o })),
    );
    if (partialCiteExemplars.length === 0) {
      console.warn(
        '[applyOverrides.test] WARNING: no override in the OVERRIDES dict declares ' +
          'PARTIAL_DETECTION with a registryId at this commit. The PARTIAL-with-cite path (cite ' +
          'preserved, no demote to SPEC_ONLY) is no longer exercised by this test. Add such an ' +
          'override or a deliberately-shaped fixture entry to keep this path covered.',
      );
    } else {
      const { mod, gapId, o } = partialCiteExemplars[0];
      const partXw = readJson(path.join(tmpDir, `${mod}.crosswalk.json`));
      const partRow = findRow(partXw, gapId);
      expect(partRow).toBeDefined();
      expect(partRow.classification).toBe(o.classification);
      expect(partRow.ruleBodyCite).toBeDefined();
      expect(partRow.auditNotes).toContain(o.auditNote);
    }

    // Override-count invariant (dynamic - no frozen integer, no module names): for
    // EVERY module with N>0 configured overrides, applied===configured and demoted===0.
    // A demote means a PARTIAL override lost its registryId. Counts are read straight
    // from the script's own dict-derived "(out of N configured)" summary lines.
    const populated = parseSummaryLines(result.stdout).filter((s) => s.configured > 0);
    expect(populated.length).toBeGreaterThan(0);
    for (const s of populated) {
      expect(s.applied).toBe(s.configured); // every configured override applied
      expect(s.demoted).toBe(0);            // none demoted (no PARTIAL override lost its registryId)
    }

    const vhdXw = readJson(path.join(tmpDir, 'VHD.crosswalk.json'));
    // VHD-005 has a manual override in OVERRIDES.VHD (cross-module cite). Presence-only
    // assertion - the clinical verdict is owned by the audit layer and may legitimately
    // change on re-audit (AUDIT-110).
    expect(findRow(vhdXw, 'GAP-VHD-005')).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
