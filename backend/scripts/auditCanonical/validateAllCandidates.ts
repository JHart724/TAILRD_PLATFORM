/**
 * One-shot validator for all 6 .crosswalk.candidate.json files.
 */
import * as fs from 'fs';
import * as path from 'path';
import { validateCrosswalk, summarizeValidation, Crosswalk } from './crosswalkSchema';
import { SpecExtract, CodeExtract, ModuleCode } from './lib/types';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';

const promote = process.argv.includes('--promote');

// Pre-load all code extracts for cross-module validation
const allCodeExtracts = new Map<ModuleCode, CodeExtract>();
for (const cfg of MODULE_CONFIGS) {
  const cp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.code.json`);
  if (fs.existsSync(cp)) allCodeExtracts.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
}

console.log(`=== validateAllCandidates${promote ? ' (with promotion)' : ''} ===`);
let anyInvalid = false;
for (const cfg of MODULE_CONFIGS) {
  const sp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.spec.json`);
  const xp = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.crosswalk.candidate.json`);
  if (!fs.existsSync(xp)) {
    console.log(`  ${cfg.code}: NO CANDIDATE`);
    continue;
  }
  const spec = JSON.parse(fs.readFileSync(sp, 'utf8')) as SpecExtract;
  const code = allCodeExtracts.get(cfg.code)!;
  const xw = JSON.parse(fs.readFileSync(xp, 'utf8')) as Crosswalk;
  const r = validateCrosswalk(xw, spec, code, allCodeExtracts);
  console.log(`  ${cfg.code}: ${summarizeValidation(r)}`);
  if (!r.valid) {
    anyInvalid = true;
    for (const e of r.errors.slice(0, 5)) {
      console.log(`    ERROR ${e.code} at ${e.path}: ${e.message.slice(0, 120)}`);
    }
  } else if (promote) {
    const finalPath = path.join(CANONICAL_OUTPUT_DIR, `${cfg.code}.crosswalk.json`);
    // Strip draft fields when promoting
    const { draft, ...finalXw } = xw as any;
    const sortedRows = (finalXw.rows as any[]).map((row) => {
      const { parseSource, parseConfidence, ...clean } = row;
      return clean;
    });
    fs.writeFileSync(finalPath, JSON.stringify({ ...finalXw, rows: sortedRows }, null, 2) + '\n');
    console.log(`    PROMOTED → ${path.basename(finalPath)}`);
  }
}
process.exit(anyInvalid ? 1 : 0);
