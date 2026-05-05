/**
 * refreshCites.ts — refresh cite line numbers in canonical crosswalks after source-line shifts.
 *
 * Per AUDIT-040 (resolved by this script): when `gapRuleEngine.ts` or
 * `CLINICAL_KNOWLEDGE_BASE_v4.0.md` has line-affecting changes (e.g., adding a
 * registry entry or a new evaluator block), every cite in every committed
 * `<MODULE>.crosswalk.json` that references downstream rows becomes stale.
 *
 * This script surgically updates `ruleBodyCite.registryLine`,
 * `ruleBodyCite.evaluatorBodyLineRange`, and `specLine` from the current
 * canonical extracts. All other content (auditNotes, classification,
 * inferredSafetyTag, manual override text) is preserved byte-for-byte.
 *
 * Cross-module cites (where `ruleBodyCite.evaluatorModule` differs from the
 * row's module) are resolved against the cited module's code.json.
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/refreshCites.ts --all
 *   npx tsx backend/scripts/auditCanonical/refreshCites.ts --module EP
 *   npx tsx backend/scripts/auditCanonical/refreshCites.ts --all --dry-run
 *
 * Exit codes:
 *   0 — refresh completed successfully (with or without changes)
 *   1 — fail-loud error (registry/evaluator no longer exists; needs manual review)
 *   2 — script error (missing inputs, parse failure, unknown module)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleCode, SpecExtract, CodeExtract } from './lib/types';
import { Crosswalk, CrosswalkRow, RuleBodyCite } from './crosswalkSchema';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR } from './lib/modules';
import { stableStringify } from './lib/utils';

// =============================================================================
// Structured errors
// =============================================================================

export class RegistryIdNotFoundInRefresh extends Error {
  constructor(
    public readonly module: ModuleCode,
    public readonly evaluatorModule: ModuleCode,
    public readonly specGapId: string,
    public readonly registryId: string,
  ) {
    super(
      `RegistryIdNotFoundInRefresh: row ${specGapId} in ${module} module cites registryId="${registryId}" in ${evaluatorModule}.code.json, but no such registry entry exists. Source-code change may have removed the rule. Manual review required.`,
    );
    this.name = 'RegistryIdNotFoundInRefresh';
  }
}

export class EvaluatorBlockNotFoundInRefresh extends Error {
  constructor(
    public readonly module: ModuleCode,
    public readonly evaluatorModule: ModuleCode,
    public readonly specGapId: string,
    public readonly evaluatorBlockName: string,
  ) {
    super(
      `EvaluatorBlockNotFoundInRefresh: row ${specGapId} in ${module} module cites evaluatorBlockName="${evaluatorBlockName}" in ${evaluatorModule}.code.json, but no such evaluator block exists. Source-code change may have removed or renamed the block. Manual review required.`,
    );
    this.name = 'EvaluatorBlockNotFoundInRefresh';
  }
}

export class CrossModuleSourceMissing extends Error {
  constructor(
    public readonly module: ModuleCode,
    public readonly specGapId: string,
    public readonly missingModule: ModuleCode,
  ) {
    super(
      `CrossModuleSourceMissing: row ${specGapId} in ${module} module cites evaluatorModule="${missingModule}" but ${missingModule}.code.json was not loaded. Pre-load all module code extracts before refresh.`,
    );
    this.name = 'CrossModuleSourceMissing';
  }
}

// =============================================================================
// Refresh logic
// =============================================================================

export interface RefreshContext {
  readonly module: ModuleCode;
  readonly crosswalk: Crosswalk;
  readonly spec: SpecExtract;
  readonly allCodeExtracts: ReadonlyMap<ModuleCode, CodeExtract>;
}

export interface RefreshResult {
  readonly module: ModuleCode;
  readonly rowsScanned: number;
  readonly citesUpdated: number;
  readonly specLineUpdated: number;
  readonly registryLineUpdated: number;
  readonly evaluatorBodyLineRangeUpdated: number;
  readonly updatedCrosswalk: Crosswalk;
}

/**
 * Refresh a single crosswalk in memory. Pure function — no I/O.
 */
export function refreshCrosswalk(ctx: RefreshContext): RefreshResult {
  const specByGapId = new Map(ctx.spec.gaps.map((g) => [g.id, g]));
  let citesUpdated = 0;
  let specLineUpdated = 0;
  let registryLineUpdated = 0;
  let evalBodyUpdated = 0;

  const newRows: CrosswalkRow[] = ctx.crosswalk.rows.map((row) => {
    let nextRow: CrosswalkRow = row;

    // Refresh specLine from current spec.json (Q1: yes, also handle CK v4.0 line shifts)
    const specGap = specByGapId.get(row.specGapId);
    if (specGap && specGap.specLine !== row.specLine) {
      nextRow = { ...nextRow, specLine: specGap.specLine };
      specLineUpdated++;
    }

    // Refresh ruleBodyCite if present
    if (nextRow.ruleBodyCite) {
      const cite = nextRow.ruleBodyCite;
      const targetCode = ctx.allCodeExtracts.get(cite.evaluatorModule);
      if (!targetCode) {
        throw new CrossModuleSourceMissing(ctx.module, row.specGapId, cite.evaluatorModule);
      }

      const reg = targetCode.registry.find((r) => r.id === cite.registryId);
      if (!reg) {
        throw new RegistryIdNotFoundInRefresh(
          ctx.module,
          cite.evaluatorModule,
          row.specGapId,
          cite.registryId,
        );
      }

      const evBlock = targetCode.evaluatorBlocks.find((b) => b.name === cite.evaluatorBlockName);
      if (!evBlock) {
        throw new EvaluatorBlockNotFoundInRefresh(
          ctx.module,
          cite.evaluatorModule,
          row.specGapId,
          cite.evaluatorBlockName,
        );
      }

      const registryLineChanged = cite.registryLine !== reg.registryLine;
      const evalBodyChanged =
        cite.evaluatorBodyLineRange[0] !== evBlock.bodyStartLine ||
        cite.evaluatorBodyLineRange[1] !== evBlock.bodyEndLine;

      if (registryLineChanged) registryLineUpdated++;
      if (evalBodyChanged) evalBodyUpdated++;

      if (registryLineChanged || evalBodyChanged) {
        const newCite: RuleBodyCite = {
          ...cite,
          registryLine: reg.registryLine,
          evaluatorBodyLineRange: [evBlock.bodyStartLine, evBlock.bodyEndLine] as const,
        };
        nextRow = { ...nextRow, ruleBodyCite: newCite };
        citesUpdated++;
      }
    }

    return nextRow;
  });

  const updatedCrosswalk: Crosswalk = { ...ctx.crosswalk, rows: newRows };

  return {
    module: ctx.module,
    rowsScanned: ctx.crosswalk.rows.length,
    citesUpdated,
    specLineUpdated,
    registryLineUpdated,
    evaluatorBodyLineRangeUpdated: evalBodyUpdated,
    updatedCrosswalk,
  };
}

// =============================================================================
// I/O wrapper: load extracts + crosswalk for a module
// =============================================================================

interface ModulePaths {
  readonly spec: string;
  readonly crosswalk: string;
}

function modulePaths(module: ModuleCode, dir: string): ModulePaths {
  return {
    spec: path.join(dir, `${module}.spec.json`),
    crosswalk: path.join(dir, `${module}.crosswalk.json`),
  };
}

function loadAllCodeExtracts(dir: string): Map<ModuleCode, CodeExtract> {
  const map = new Map<ModuleCode, CodeExtract>();
  for (const cfg of MODULE_CONFIGS) {
    const cp = path.join(dir, `${cfg.code}.code.json`);
    if (fs.existsSync(cp)) {
      map.set(cfg.code, JSON.parse(fs.readFileSync(cp, 'utf8')) as CodeExtract);
    }
  }
  return map;
}

// =============================================================================
// CLI
// =============================================================================

interface CliArgs {
  readonly module?: ModuleCode;
  readonly all: boolean;
  readonly dryRun: boolean;
  readonly inputDir: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let mod: ModuleCode | undefined;
  let all = false;
  let dryRun = false;
  let inputDir = CANONICAL_OUTPUT_DIR;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      const candidate = argv[i + 1].toUpperCase();
      if (!MODULE_CONFIGS.find((m) => m.code === candidate)) {
        throw new Error(
          `Invalid module "${candidate}". Valid: ${MODULE_CONFIGS.map((m) => m.code).join(', ')}`,
        );
      }
      mod = candidate as ModuleCode;
      i++;
    } else if (a === '--all') {
      all = true;
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--input' && argv[i + 1]) {
      inputDir = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return { module: mod, all, dryRun, inputDir };
}

function main(): void {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv);
  } catch (e) {
    console.error('ERROR:', (e as Error).message);
    process.exit(2);
  }
  if (!args.module && !args.all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const targets = args.all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === args.module);
  const allCodeExtracts = loadAllCodeExtracts(args.inputDir);

  console.log(`=== refreshCites.ts (${args.dryRun ? 'dry-run' : 'apply'}) ===`);
  let totalCitesUpdated = 0;
  let totalSpecLineUpdated = 0;
  let anyError = false;

  for (const cfg of targets) {
    const paths = modulePaths(cfg.code, args.inputDir);
    if (!fs.existsSync(paths.crosswalk) || !fs.existsSync(paths.spec)) {
      console.error(`  ${cfg.code}: SKIPPED — missing crosswalk or spec.json`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(paths.spec, 'utf8')) as SpecExtract;
    const crosswalk = JSON.parse(fs.readFileSync(paths.crosswalk, 'utf8')) as Crosswalk;

    let result: RefreshResult;
    try {
      result = refreshCrosswalk({
        module: cfg.code,
        crosswalk,
        spec,
        allCodeExtracts,
      });
    } catch (e) {
      const err = e as Error;
      console.error(`  ${cfg.code}: FAILED — ${err.name}: ${err.message}`);
      anyError = true;
      continue;
    }

    console.log(
      `  ${cfg.code}: rows=${result.rowsScanned} citesUpdated=${result.citesUpdated} ` +
        `(specLine=${result.specLineUpdated} regLine=${result.registryLineUpdated} ` +
        `evalBody=${result.evaluatorBodyLineRangeUpdated})`,
    );

    totalCitesUpdated += result.citesUpdated;
    totalSpecLineUpdated += result.specLineUpdated;

    if (!args.dryRun && (result.citesUpdated > 0 || result.specLineUpdated > 0)) {
      fs.writeFileSync(paths.crosswalk, stableStringify(result.updatedCrosswalk));
    }
  }

  if (anyError) {
    console.error(
      '\nOne or more modules failed with structured errors. See above. Manual review required.',
    );
    process.exit(1);
  }

  const totalChanged = totalCitesUpdated + totalSpecLineUpdated;
  if (totalChanged === 0) {
    console.log(`\nNo changes — all cites already current.`);
  } else if (args.dryRun) {
    console.log(`\nDry-run: ${totalChanged} updates would apply (${totalCitesUpdated} cites + ${totalSpecLineUpdated} specLine refreshes).`);
  } else {
    console.log(
      `\nApplied: ${totalChanged} updates (${totalCitesUpdated} cites + ${totalSpecLineUpdated} specLine refreshes).`,
    );
  }
}

if (require.main === module) {
  main();
}
