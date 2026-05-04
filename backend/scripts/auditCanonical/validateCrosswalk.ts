/**
 * validateCrosswalk.ts — CLI wrapper around crosswalkSchema.validateCrosswalk.
 *
 * Reads <MODULE>.spec.json + <MODULE>.code.json + <MODULE>.crosswalk.json (or
 * crosswalk.draft.json) and emits a validation report.
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/validateCrosswalk.ts --module VHD --draft
 *   npx tsx backend/scripts/auditCanonical/validateCrosswalk.ts --all --draft
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleCode, SpecExtract, CodeExtract } from './lib/types';
import { Crosswalk, validateCrosswalk, summarizeValidation } from './crosswalkSchema';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';

function parseArgs(argv: readonly string[]): {
  module?: ModuleCode;
  all: boolean;
  draft: boolean;
  inputDir?: string;
} {
  let mod: ModuleCode | undefined;
  let all = false;
  let draft = false;
  let inputDir: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      mod = argv[i + 1].toUpperCase() as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--draft') {
      draft = true;
    } else if (a === '--input' && argv[i + 1]) {
      inputDir = argv[i + 1];
      i++;
    }
  }
  return { module: mod, all, draft, inputDir };
}

function main(): void {
  const args = parseArgs(process.argv);
  if (!args.module && !args.all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const inputDir = args.inputDir ? path.resolve(args.inputDir) : CANONICAL_OUTPUT_DIR;
  const targets = args.all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === args.module);
  const suffix = args.draft ? '.crosswalk.draft.json' : '.crosswalk.json';

  console.log(`=== validateCrosswalk.ts (${args.draft ? 'draft' : 'canonical'}) ===`);
  let anyInvalid = false;
  for (const cfg of targets) {
    const specPath = path.join(inputDir, `${cfg.code}.spec.json`);
    const codePath = path.join(inputDir, `${cfg.code}.code.json`);
    const xwPath = path.join(inputDir, `${cfg.code}${suffix}`);
    if (!fs.existsSync(specPath) || !fs.existsSync(codePath) || !fs.existsSync(xwPath)) {
      console.error(`  ${cfg.code}: SKIPPED — missing extract or crosswalk file`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as SpecExtract;
    const code = JSON.parse(fs.readFileSync(codePath, 'utf8')) as CodeExtract;
    const crosswalk = JSON.parse(fs.readFileSync(xwPath, 'utf8')) as Crosswalk;

    const result = validateCrosswalk(crosswalk, spec, code);
    console.log(`  ${cfg.code}: ${summarizeValidation(result)}`);
    if (!result.valid) {
      anyInvalid = true;
      // Surface first 5 errors per module for review
      for (const e of result.errors.slice(0, 5)) {
        console.log(`    ERROR ${e.code} at ${e.path}: ${e.message}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more errors`);
      }
    }
    if (result.warnings.length > 0) {
      console.log(`    (${result.warnings.length} warnings)`);
    }
  }

  process.exit(anyInvalid ? 1 : 0);
}

if (require.main === module) {
  main();
}
