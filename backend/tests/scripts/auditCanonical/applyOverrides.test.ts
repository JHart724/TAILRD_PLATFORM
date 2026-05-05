/**
 * Tests for applyOverrides.ts.
 *
 * Per AUDIT-041 fix design (operator-approved 2026-05-06): 6 tests covering the
 * canonical-default behavior, --candidate opt-in flag, idempotency, missing-file
 * graceful skip, no-op-overrides modules, and cross-module --all coverage.
 *
 * The script's OVERRIDES dictionary is module-scoped (not parameterizable from
 * tests). To stay deterministic, these tests run the actual CLI against fixture
 * canonical/candidate files in an isolated tmp dir using --input <dir> and use
 * known-good override entries from the live OVERRIDES dict (e.g., GAP-VHD-005,
 * GAP-EP-079) to assert on output content.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { stableStringify } from '../../../scripts/auditCanonical/lib/utils';

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
    if (includeCandidate && fs.existsSync(path.join(CANONICAL_DIR, `${mod}.crosswalk.candidate.json`))) {
      fs.copyFileSync(
        path.join(CANONICAL_DIR, `${mod}.crosswalk.candidate.json`),
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

describe('applyOverrides — AUDIT-041 canonical-default behavior', () => {
  jest.setTimeout(60000); // CLI subprocess; allow time for tsx warmup

  it('default mode writes overrides to *.crosswalk.json (canonical)', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--module', 'EP'], tmpDir);
    expect(result.stdout).toContain('=== applyOverrides.ts (canonical) ===');
    expect(result.stdout).toMatch(/EP: applied=\d+/);

    // EP has GAP-EP-079 override (AUDIT-031 mitigation pin)
    const xw = readJson(path.join(tmpDir, 'EP.crosswalk.json'));
    const row = findRow(xw, 'GAP-EP-079');
    expect(row).toBeDefined();
    expect(row.classification).toBe('DET_OK');
    expect(row.auditNotes).toContain('AUDIT-031 RESOLVED');
    expect(row.ruleBodyCite).toBeDefined();
    expect(row.ruleBodyCite.evaluatorBlockName).toBe('EP-079');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--candidate mode writes overrides to *.crosswalk.candidate.json (legacy verifyDraft baseline workflow)', () => {
    const tmpDir = setupTmpDir(/*canonical*/ false, /*candidate*/ true);
    const result = runApplyOverrides(['--module', 'EP', '--candidate'], tmpDir);
    expect(result.stdout).toContain('=== applyOverrides.ts (candidate) ===');

    // Candidate file should contain the override (was already pinned in the live candidate file from prior verifyDraft cycle)
    const xw = readJson(path.join(tmpDir, 'EP.crosswalk.candidate.json'));
    const row = findRow(xw, 'GAP-EP-079');
    expect(row).toBeDefined();
    expect(row.classification).toBe('DET_OK');
    expect(row.auditNotes).toContain('AUDIT-031 RESOLVED');

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

  it('module without overrides (SH/PV with empty OVERRIDES table) runs cleanly with applied=0', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--module', 'SH'], tmpDir);
    expect(result.stdout).toMatch(/SH: applied=0 demoted=0 \(out of 0 configured\)/);

    // SH crosswalk should not have changed (idempotent on no-op)
    const before = fs.readFileSync(path.join(CANONICAL_DIR, 'SH.crosswalk.json'), 'utf8');
    const after = fs.readFileSync(path.join(tmpDir, 'SH.crosswalk.json'), 'utf8');
    expect(stableStringify(JSON.parse(after))).toBe(stableStringify(JSON.parse(before)));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--all applies overrides across multiple modules deterministically', () => {
    const tmpDir = setupTmpDir(/*canonical*/ true, /*candidate*/ false);
    const result = runApplyOverrides(['--all'], tmpDir);

    // All 6 modules should appear in deterministic order (per MODULE_CONFIGS iteration)
    const lines = result.stdout.split('\n').filter(l => l.match(/^\s+(HF|EP|SH|CAD|VHD|PV):/));
    expect(lines.length).toBe(6);

    // Module-specific overrides should land correctly per-module.
    // HF has 2 overrides; EP has 7 (incl. EP-079 from AUDIT-031); CAD has 2; VHD has 13; SH/PV have 0.
    const epXw = readJson(path.join(tmpDir, 'EP.crosswalk.json'));
    expect(findRow(epXw, 'GAP-EP-079').classification).toBe('DET_OK');

    const cadXw = readJson(path.join(tmpDir, 'CAD.crosswalk.json'));
    expect(findRow(cadXw, 'GAP-CAD-016').classification).toBe('DET_OK');

    const vhdXw = readJson(path.join(tmpDir, 'VHD.crosswalk.json'));
    // VHD-005 is a manual override per existing OVERRIDES.VHD entries (DET_OK with cross-module cite)
    expect(findRow(vhdXw, 'GAP-VHD-005')).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
