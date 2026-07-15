/**
 * Regression test for validateCanonical.ts.
 *
 * AUDIT-206: this test now calls runValidation() IN-PROCESS rather than spawning
 * `npx tsx validateCanonical.ts` as a subprocess. The old spawnSync approach flaked
 * under full-parallel jest load - the cold `npx tsx` child (TS compile + validation)
 * exceeded the 30s spawnSync cap when CPU-starved, got SIGTERM'd, and result.status
 * came back null, failing expect(result.status).toBe(0). In-process there is no
 * subprocess to starve, so it runs in ~ms, deterministically.
 *
 * The spawn-time import-resolution guarantee (the original PR #234 MODULE_NOT_FOUND
 * guard) is covered by the DEDICATED gate: .github/workflows/auditCanonical.yml runs
 * `npx tsx scripts/auditCanonical/validateCanonical.ts` and is the authoritative
 * "Audit Canonical Gates" check. This test asserts the SAME 6/6 crosswalk-validity
 * invariant that main() exits on, against the returned object.
 */

import { runValidation } from '../../../scripts/auditCanonical/validateCanonical';
import * as path from 'path';
import * as fs from 'fs';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT_PATH = path.resolve(REPO_ROOT, 'backend', 'scripts', 'auditCanonical', 'validateCanonical.ts');
const CANONICAL_DIR = path.resolve(REPO_ROOT, 'docs', 'audit', 'canonical');

describe('validateCanonical.ts', () => {
  it('script file exists', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('all 6 module crosswalks validate (in-process; the 6/6 canonical-validity invariant)', () => {
    // Inconclusive on a fresh checkout that has not run the extract producers.
    if (!fs.existsSync(CANONICAL_DIR)) {
      return;
    }

    const v = runValidation();

    // No missing *.code.json (the exit-2 condition).
    expect(v.missingExtract).toBeUndefined();
    // All 6 modules were validated (spec + crosswalk present for each).
    expect(v.modulesValidated).toBe(6);
    // Every crosswalk is VALID -> the aggregate is valid (the exit-0 condition).
    expect(v.valid).toBe(true);
    // And no individual VALIDATED module is INVALID (belt-and-suspenders on the same invariant).
    for (const m of v.results) {
      if (m.status === 'VALIDATED') {
        expect(m.result!.valid).toBe(true);
      }
    }
  });
});
