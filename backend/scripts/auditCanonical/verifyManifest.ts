/**
 * AUDIT-328 part (iii): the gate-side verifier.
 *
 * Runs UNCONDITIONALLY from Gate 5, deliberately - Gates 2-4 are path-triggered, and AUDIT-229
 * documents that path-trigger enumerations rot. Hanging the input-hash check on the one gate that
 * always runs is what makes this independent of that fragility rather than adding another thing
 * behind it.
 *
 * What it asserts, per stage manifest:
 *   - the manifest EXISTS (a stage with no record never ran)
 *   - modulesProcessed length equals the module count (the "nothing ran" discriminator)
 *   - modulesSkipped is empty
 *   - every recorded input and output still hashes to what the manifest says
 *
 * That last check is the one that catches a hand-edited crosswalk on a PR whose paths do not trigger
 * Gate 4: the crosswalk is an INPUT to reconcile / renderAddendum / renderSynthesis, so editing it
 * without regenerating leaves the manifest's input hash pointing at content that no longer exists.
 *
 * Pure logic lives in lib/manifest.ts (verifyManifests); this file is the CLI shell.
 */

import { MODULE_CONFIGS } from './lib/modules';
import { formatProblems, verifyManifests } from './lib/manifest';

function main(): void {
  const problems = verifyManifests({ expectedModules: MODULE_CONFIGS.length });

  console.log('=== verifyManifest.ts ===');
  if (problems.length === 0) {
    console.log(
      `PASS: all ${MODULE_CONFIGS.length}-module stage manifests present, complete, and consistent with the working tree.`,
    );
    process.exit(0);
  }

  console.error(`FAIL: ${problems.length} manifest problem(s).`);
  console.error(formatProblems(problems));
  process.exit(1);
}

if (require.main === module) {
  main();
}
