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
import { validateCrosswalk, summarizeValidation, Crosswalk } from './crosswalkSchema';
import { SpecExtract, CodeExtract, ModuleCode } from './lib/types';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';

function main(): void {
  // Pre-load all module code extracts for cross-module cite validation
  const allCodeExtracts = new Map<ModuleCode, CodeExtract>();
  for (const cfg of MODULE_CONFIGS) {
    const cp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.code.json`);
    if (!fs.existsSync(cp)) {
      console.error(`ERROR: missing ${cp}. Run extractCode --all first.`);
      process.exit(2);
    }
    allCodeExtracts.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
  }

  console.log('=== validateCanonical ===');
  let anyInvalid = false;
  let modulesValidated = 0;

  for (const cfg of MODULE_CONFIGS) {
    const sp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.spec.json`);
    const xp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.crosswalk.json`);
    if (!fs.existsSync(sp)) {
      console.error(`  ${cfg.code}: SKIPPED — missing spec.json`);
      continue;
    }
    if (!fs.existsSync(xp)) {
      console.log(`  ${cfg.code}: NO CANONICAL CROSSWALK (skipped)`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(sp, 'utf8')) as SpecExtract;
    const code = allCodeExtracts.get(cfg.code)!;
    const xw = JSON.parse(fs.readFileSync(xp, 'utf8')) as Crosswalk;

    const r = validateCrosswalk(xw, spec, code, allCodeExtracts);
    console.log(`  ${cfg.code}: ${summarizeValidation(r)}`);
    modulesValidated++;
    if (!r.valid) {
      anyInvalid = true;
      for (const e of r.errors.slice(0, 5)) {
        console.log(`    ERROR ${e.code} at ${e.path}: ${e.message.slice(0, 120)}`);
      }
      if (r.errors.length > 5) {
        console.log(`    ... and ${r.errors.length - 5} more errors`);
      }
    }
  }

  if (modulesValidated === 0) {
    console.error('ERROR: no canonical crosswalks found to validate.');
    process.exit(2);
  }

  process.exit(anyInvalid ? 1 : 0);
}

if (require.main === module) {
  main();
}
