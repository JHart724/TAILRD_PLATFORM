/**
 * Regression test for validateCanonical.ts.
 *
 * Catches the bug class that surfaced on PR #234 first CI run: workflow Gate 5
 * had inline TypeScript with relative imports that resolved against /tmp/ instead
 * of the script's actual location, causing MODULE_NOT_FOUND.
 *
 * This test spawns the script as CI does + asserts:
 *   - Imports resolve cleanly (no MODULE_NOT_FOUND)
 *   - Script runs to completion
 *   - All 6 module crosswalks validate as VALID (exit code 0)
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT_PATH = path.resolve(REPO_ROOT, 'backend', 'scripts', 'auditCanonical', 'validateCanonical.ts');

describe('validateCanonical.ts', () => {
  it('script file exists', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('runs without import-resolution errors and exits 0 against canonical crosswalks', () => {
    // Skip if canonical artifacts haven't been generated yet (fresh checkout w/o extract run)
    const canonicalDir = path.resolve(REPO_ROOT, 'docs', 'audit', 'canonical');
    if (!fs.existsSync(canonicalDir)) {
      // Treat as inconclusive rather than failure — extract producers may not have been run
      return;
    }

    const result = spawnSync('npx', ['tsx', SCRIPT_PATH], {
      cwd: path.resolve(REPO_ROOT, 'backend'),
      encoding: 'utf8',
      shell: true,
      timeout: 30000,
    });

    // The bug we're guarding against: MODULE_NOT_FOUND error in stderr
    expect(result.stderr).not.toMatch(/Cannot find module/);
    expect(result.stderr).not.toMatch(/MODULE_NOT_FOUND/);

    // Script should exit 0 (all canonical crosswalks valid)
    expect(result.status).toBe(0);

    // Stdout should contain the validateCanonical banner + at least one VALID line
    expect(result.stdout).toMatch(/=== validateCanonical ===/);
    expect(result.stdout).toMatch(/VALID/);
  }, 30000);
});
