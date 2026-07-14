/**
 * validateCanonical.ts — schema-validate the 6 canonical .crosswalk.json files.
 *
 * Used by .github/workflows/auditCanonical.yml Gate 5. Pre-loads all 6 module
 * code extracts so cross-module ruleBodyCite rows (where evaluatorModule differs
 * from the row's module) can resolve correctly.
 *
 * Exit:
 *   0 — all 6 module crosswalks pass validateCrosswalk
 *   1 — at least one module returns INVALID
 *   2 — script error (missing extracts, parse failure)
 *
 * Designed to run from any working directory: paths resolved via __dirname-rooted
 * constants in lib/modules.ts (no cwd assumptions).
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateCrosswalk, summarizeValidation, Crosswalk, ValidationResult } from './crosswalkSchema';
import { SpecExtract, CodeExtract, ModuleCode } from './lib/types';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';

// AUDIT-206: the validation logic is a PURE function so callers (the CLI main() below AND the jest
// regression test) can assert on the returned object without spawning a subprocess. The jest test used to
// spawnSync('npx tsx ...') and scrape stdout, which flaked under worker contention (a 30s subprocess cap
// starved past). The authoritative spawn-time gate is still auditCanonical.yml (it invokes main() via
// `npx tsx`); this in-process path is the fast, deterministic duplicate.

export type ModuleValidationStatus = 'VALIDATED' | 'SKIPPED_NO_SPEC' | 'SKIPPED_NO_CROSSWALK';

export interface ModuleValidation {
  readonly code: ModuleCode;
  readonly status: ModuleValidationStatus;
  readonly result?: ValidationResult; // present iff status === 'VALIDATED'
  readonly summary?: string;           // summarizeValidation(result), present iff VALIDATED
}

export interface CanonicalValidation {
  readonly valid: boolean;             // true iff modulesValidated > 0 AND no missing extract AND no INVALID module (the exit-0 condition)
  readonly modulesValidated: number;
  readonly missingExtract?: string;    // path of the first missing *.code.json (the exit-2 condition)
  readonly results: readonly ModuleValidation[];
}

/**
 * Pure validation of the 6 canonical crosswalks. Reads the extracts, runs validateCrosswalk per module,
 * and RETURNS the aggregate - it does NOT console.log or process.exit (the CLI main() does that).
 */
export function runValidation(): CanonicalValidation {
  // Pre-load all module code extracts for cross-module cite validation
  const allCodeExtracts = new Map<ModuleCode, CodeExtract>();
  for (const cfg of MODULE_CONFIGS) {
    const cp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.code.json`);
    if (!fs.existsSync(cp)) {
      return { valid: false, modulesValidated: 0, missingExtract: cp, results: [] };
    }
    allCodeExtracts.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
  }

  const results: ModuleValidation[] = [];
  let anyInvalid = false;
  let modulesValidated = 0;

  for (const cfg of MODULE_CONFIGS) {
    const sp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.spec.json`);
    const xp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.crosswalk.json`);
    if (!fs.existsSync(sp)) {
      results.push({ code: cfg.code, status: 'SKIPPED_NO_SPEC' });
      continue;
    }
    if (!fs.existsSync(xp)) {
      results.push({ code: cfg.code, status: 'SKIPPED_NO_CROSSWALK' });
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(sp, 'utf8')) as SpecExtract;
    const code = allCodeExtracts.get(cfg.code)!;
    const xw = JSON.parse(fs.readFileSync(xp, 'utf8')) as Crosswalk;

    const r = validateCrosswalk(xw, spec, code, allCodeExtracts);
    results.push({ code: cfg.code, status: 'VALIDATED', result: r, summary: summarizeValidation(r) });
    modulesValidated++;
    if (!r.valid) anyInvalid = true;
  }

  return { valid: modulesValidated > 0 && !anyInvalid, modulesValidated, results };
}

/**
 * CLI entrypoint - behavior byte-equivalent to the pre-AUDIT-206 main(): same stdout/stderr and same
 * exit codes (0 all valid / 1 any invalid / 2 missing-extract or nothing-to-validate). The dedicated
 * auditCanonical.yml gate invokes this via `npx tsx` and is UNCHANGED.
 */
function main(): void {
  const v = runValidation();

  if (v.missingExtract) {
    console.error(`ERROR: missing ${v.missingExtract}. Run extractCode --all first.`);
    process.exit(2);
  }

  console.log('=== validateCanonical ===');
  for (const m of v.results) {
    if (m.status === 'SKIPPED_NO_SPEC') {
      console.error(`  ${m.code}: SKIPPED - missing spec.json`);
      continue;
    }
    if (m.status === 'SKIPPED_NO_CROSSWALK') {
      console.log(`  ${m.code}: NO CANONICAL CROSSWALK (skipped)`);
      continue;
    }
    const r = m.result!;
    console.log(`  ${m.code}: ${m.summary}`);
    if (!r.valid) {
      for (const e of r.errors.slice(0, 5)) {
        console.log(`    ERROR ${e.code} at ${e.path}: ${e.message.slice(0, 120)}`);
      }
      if (r.errors.length > 5) {
        console.log(`    ... and ${r.errors.length - 5} more errors`);
      }
    }
  }

  if (v.modulesValidated === 0) {
    console.error('ERROR: no canonical crosswalks found to validate.');
    process.exit(2);
  }

  process.exit(v.valid ? 0 : 1);
}

if (require.main === module) {
  main();
}
