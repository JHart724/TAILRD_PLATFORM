/**
 * AUDIT-328 part (iii): per-stage run manifests.
 *
 * THE PROBLEM THIS EXISTS FOR: a gate that regenerates-then-diffs cannot distinguish "nothing
 * changed" from "nothing ran". A stage that writes no output produces no diff, so the gate passes.
 * Parts (i)+(ii) made a SKIPPING stage exit non-zero, which CI observes - but the gate SHAPE is
 * still blind, so any future stage that no-ops without skipping reproduces the defect.
 *
 * WHAT A MANIFEST RECORDS, and why each field is here (a field nobody reads is the defect class we
 * have been closing, so there are no decorative fields):
 *   - schemaVersion   : a format change must fail loudly, not be misread by an older verifier.
 *   - stage           : which of the pipeline stages this describes.
 *   - generatedBy     : the script to re-run; a failure message that names it is actionable.
 *   - modulesProcessed: THE DISCRIMINATOR. Empty means the stage ran and did nothing.
 *   - modulesSkipped  : must be empty after part (i); a non-empty list means the exit path regressed.
 *   - inputs[]        : path + sha256 of every file READ. Lets the verifier detect a hand-edited
 *                       input that was never regenerated - INDEPENDENT of the CI path triggers,
 *                       which is what closes the AUDIT-229 rotting-hinge problem.
 *   - outputs[]       : path + sha256 of every file WRITTEN, so the manifest cannot claim work it
 *                       did not do.
 *
 * DELIBERATELY ABSENT: a timestamp (churns every run, proves nothing) and a git SHA (chicken-and-egg
 * - the manifest is written before the commit that would name it, and input hashes answer a strictly
 * stronger question anyway).
 *
 * THE GUARANTEE, stated honestly: this does NOT make a manifest unforgeable. A committed manifest
 * can in principle be hand-written. What the input-hash design changes is the ECONOMICS - a forged
 * manifest must carry correct sha256 values for every input AND matching output hashes for artifacts
 * that must also survive the content diff, which means producing the real outputs. THE CHEAPEST PATH
 * TO A PASSING GATE IS TO RUN THE PIPELINE. That is the strongest property available to any
 * committed artifact, and claiming more would be the class of defect this work has been closing.
 *
 * MANIFESTS ARE DERIVED OUTPUT AND ARE NEVER HAND-EDITED. On a merge conflict the resolution is
 * always delete-and-regenerate; see AUDIT_METHODOLOGY section 24.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CANONICAL_OUTPUT_DIR, REPO_ROOT } from './modules';
import { relativePosix, sha256, stableStringify } from './utils';

export const MANIFEST_SCHEMA_VERSION = 1;
export const MANIFEST_DIR = path.join(CANONICAL_OUTPUT_DIR, '.manifests');

/** Stages whose outputs are committed and gated. validateCanonical writes nothing and runs the verifier. */
export const MANIFESTED_STAGES = [
  'extractCode',
  'extractSpec',
  'reconcile',
  'renderAddendum',
  'renderSynthesis',
] as const;
export type ManifestedStage = (typeof MANIFESTED_STAGES)[number];

export interface ManifestFileRef {
  readonly path: string; // repo-relative, posix
  readonly sha256: string;
}

export interface StageManifest {
  readonly schemaVersion: number;
  readonly stage: string;
  readonly generatedBy: string;
  readonly modulesProcessed: readonly string[];
  readonly modulesSkipped: readonly string[];
  readonly inputs: readonly ManifestFileRef[];
  readonly outputs: readonly ManifestFileRef[];
}

export function manifestPath(stage: string): string {
  return path.join(MANIFEST_DIR, `${stage}.manifest.json`);
}

/** Hash a file into a repo-relative ref. Missing files are the caller's problem, not silently dropped. */
export function fileRef(absPath: string): ManifestFileRef {
  return { path: relativePosix(absPath, REPO_ROOT), sha256: sha256(absPath) };
}

function dedupeSorted(refs: ManifestFileRef[]): ManifestFileRef[] {
  const seen = new Map<string, ManifestFileRef>();
  for (const r of refs) seen.set(r.path, r);
  return [...seen.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export interface EmitOptions {
  readonly stage: ManifestedStage;
  readonly generatedBy: string;
  readonly processed: readonly string[];
  readonly skipped: readonly string[];
  readonly inputs: readonly string[]; // absolute paths
  readonly outputs: readonly string[]; // absolute paths
  /**
   * The canonical directory this run actually read from or wrote to. A manifest is written ONLY for a full run against
   * the real canonical tree: a `--input <tmp>` run (tests) or a `--module <CODE>` run (partial
   * regeneration) must never overwrite the committed manifest, because doing so would make the
   * committed record claim that only one module was generated - which is false about the other five.
   */
  readonly canonicalDir: string;
  readonly isFullRun: boolean;
}

/** Write the manifest, or deliberately do nothing for partial / redirected runs. Returns what it did. */
export function emitManifest(opts: EmitOptions): 'written' | 'skipped-partial-run' | 'skipped-redirected' {
  if (path.resolve(opts.canonicalDir) !== path.resolve(CANONICAL_OUTPUT_DIR)) return 'skipped-redirected';
  if (!opts.isFullRun) return 'skipped-partial-run';

  const m: StageManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    stage: opts.stage,
    generatedBy: opts.generatedBy,
    modulesProcessed: [...opts.processed].sort(),
    modulesSkipped: [...opts.skipped].sort(),
    inputs: dedupeSorted(opts.inputs.map(fileRef)),
    outputs: dedupeSorted(opts.outputs.map(fileRef)),
  };
  if (!fs.existsSync(MANIFEST_DIR)) fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  fs.writeFileSync(manifestPath(opts.stage), stableStringify(m) + '\n');
  return 'written';
}

export interface ManifestProblem {
  readonly stage: string;
  readonly kind:
    | 'MISSING'
    | 'UNREADABLE'
    | 'SCHEMA_VERSION'
    | 'NOTHING_RAN'
    | 'SKIPPED_NONEMPTY'
    | 'INPUT_DRIFT'
    | 'OUTPUT_DRIFT'
    | 'FILE_ABSENT';
  readonly detail: string;
}

export interface VerifyOptions {
  readonly expectedModules: number;
  readonly manifestDir?: string;
  readonly repoRoot?: string;
}

/**
 * Verify every expected stage manifest against the working tree. Pure - returns problems rather than
 * exiting, so it is testable in-process (the AUDIT-206 shape).
 */
export function verifyManifests(opts: VerifyOptions): ManifestProblem[] {
  const dir = opts.manifestDir ?? MANIFEST_DIR;
  const root = opts.repoRoot ?? REPO_ROOT;
  const problems: ManifestProblem[] = [];

  for (const stage of MANIFESTED_STAGES) {
    const p = path.join(dir, `${stage}.manifest.json`);
    if (!fs.existsSync(p)) {
      problems.push({
        stage,
        kind: 'MISSING',
        detail: `no manifest at ${relativePosix(p, root)} - this stage has no record of ever running`,
      });
      continue;
    }
    let m: StageManifest;
    try {
      m = JSON.parse(fs.readFileSync(p, 'utf8')) as StageManifest;
    } catch (e) {
      problems.push({ stage, kind: 'UNREADABLE', detail: `${(e as Error).message}` });
      continue;
    }
    if (m.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
      problems.push({
        stage,
        kind: 'SCHEMA_VERSION',
        detail: `manifest schemaVersion ${m.schemaVersion} != expected ${MANIFEST_SCHEMA_VERSION}`,
      });
      continue;
    }
    // THE DISCRIMINATOR: a stage that ran and produced nothing is the failure "nothing changed"
    // cannot see. This is the assertion the whole of part (iii) exists for.
    if (m.modulesProcessed.length !== opts.expectedModules) {
      problems.push({
        stage,
        kind: 'NOTHING_RAN',
        detail:
          `manifest records ${m.modulesProcessed.length} module(s) processed, expected ${opts.expectedModules}` +
          (m.modulesProcessed.length === 0 ? ' - the stage ran and did nothing' : ''),
      });
    }
    if (m.modulesSkipped.length > 0) {
      problems.push({
        stage,
        kind: 'SKIPPED_NONEMPTY',
        detail: `manifest records skipped modules [${m.modulesSkipped.join(', ')}]; part (i) should have made this fatal at run time`,
      });
    }
    for (const [kind, refs] of [
      ['INPUT_DRIFT', m.inputs],
      ['OUTPUT_DRIFT', m.outputs],
    ] as ReadonlyArray<[ManifestProblem['kind'], readonly ManifestFileRef[]]>) {
      for (const ref of refs) {
        const abs = path.join(root, ref.path);
        if (!fs.existsSync(abs)) {
          problems.push({ stage, kind: 'FILE_ABSENT', detail: `${ref.path} is recorded in the manifest but absent` });
          continue;
        }
        const actual = sha256(abs);
        if (actual !== ref.sha256) {
          problems.push({
            stage,
            kind,
            detail:
              `${ref.path} changed since this stage last ran (manifest ${ref.sha256.slice(0, 12)}, ` +
              `tree ${actual.slice(0, 12)})`,
          });
        }
      }
    }
  }
  return problems;
}

/** Actionable failure text: names the stage, what is wrong, and the command that fixes it. */
export function formatProblems(problems: readonly ManifestProblem[]): string {
  return problems
    .map((p) => `  ${p.stage} [${p.kind}]: ${p.detail}`)
    .concat([
      '',
      '  FIX: re-run the full section 9.2 pipeline and commit the regenerated artifacts AND manifests:',
      '    npx tsx backend/scripts/auditCanonical/extractCode.ts --all',
      '    npx tsx backend/scripts/auditCanonical/extractSpec.ts --all',
      '    npx tsx backend/scripts/auditCanonical/reconcile.ts --all',
      '    npx tsx backend/scripts/auditCanonical/renderAddendum.ts --all',
      '    npx tsx backend/scripts/auditCanonical/renderSynthesis.ts',
      '  Manifests are DERIVED OUTPUT. Never hand-edit them; on a merge conflict, delete and',
      '  regenerate (AUDIT_METHODOLOGY section 24). See AUDIT-328.',
    ])
    .join('\n');
}
