/**
 * AUDIT-228 remediation, one-row audited mutation: close the run record stranded by the failed
 * idempotency pass.
 *
 * WHAT HAPPENED. The second (idempotency) execute pass of `refreshTrialMatches` died in its confirm
 * write - 102,287 bind variables against PostgreSQL's 32,767 maximum. The AUDIT-224 design worked
 * exactly as intended: the run record had been opened UP-FRONT, so the crash left durable evidence
 * the run started and no forensic reconstruction was needed. What the design did NOT have was the
 * other half - closing it. `trial_match_runs` row 2 therefore sits at `outcome: RUNNING`,
 * `finishedAt: null`, indefinitely claiming to be in flight. It is not wrong about the past; it is
 * wrong about the present, and any future concurrency guard would read it as a live run.
 *
 * The runner now closes its own record on any throw (`closeActiveRunFailed`). That fix cannot reach
 * BACKWARDS to the row already stranded, which is what this script is for. It is a one-time repair of
 * one row, not a reusable tool - `--run-id` is REQUIRED and there is no bulk mode, deliberately.
 *
 * WHAT IT DOES NOT TOUCH. No `trial_matches` row is read or written. The failed pass wrote nothing
 * (verified: 102,284 total / 102,284 current / 0 superseded, spot-checked rows unmoved), so the
 * verdict data needs no repair and this script must not pretend otherwise.
 *
 * SAFETY. Dry-run by default. Refuses any record not currently `RUNNING`, so a re-run after a
 * successful close is a no-op rather than a silent overwrite of a COMPLETED or FAILED record. Prints
 * the before-state for the operator to confirm against the run log before `--execute`.
 *
 * USAGE:
 *   node dist/scripts/closeStrandedTrialMatchRun.js --run-id <id>              # dry-run
 *   node dist/scripts/closeStrandedTrialMatchRun.js --run-id <id> --execute    # operator-gated
 */

import prisma from '../lib/prisma';

const EXECUTE = process.argv.includes('--execute');
const runIdIdx = process.argv.indexOf('--run-id');
const RUN_ID = runIdIdx >= 0 ? process.argv[runIdIdx + 1] : undefined;

/**
 * The note written into the closed record. States what failed, that no data moved, and which finding
 * covers it - so the row explains itself to whoever reads it next without needing this script.
 */
export const CLOSURE_NOTE =
  'Closed by AUDIT-228 remediation 2026-08-03. This run FAILED in its confirm write: ' +
  '"too many bind variables in prepared statement, expected maximum of 32767, received 102287" - ' +
  'the confirm id-list accumulated across all patient batches instead of being chunked. No rows were ' +
  'written or modified by the failed pass (trial_matches verified unchanged at 102,284 total / ' +
  '102,284 current / 0 superseded). The record was left at RUNNING because the runner had no ' +
  'failure-close path; it now closes itself on any throw. See AUDIT-228.';

function plog(msg: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(msg, extra ? JSON.stringify(extra) : '');
}

async function main(): Promise<void> {
  if (!RUN_ID) {
    throw new Error(
      '[close-stranded-run] ABORT: --run-id <id> is required. This script repairs ONE named row; ' +
        'it has no bulk mode by design.',
    );
  }

  const run = await prisma.trialMatchRun.findUnique({ where: { id: RUN_ID } });
  if (!run) {
    throw new Error(`[close-stranded-run] ABORT: no trial_match_runs row with id ${RUN_ID}.`);
  }

  plog('[close-stranded-run] BEFORE', {
    id: run.id, hospitalId: run.hospitalId, buildSha: run.buildSha,
    startedAt: run.startedAt, finishedAt: run.finishedAt, outcome: run.outcome,
    trialsEvaluated: run.trialsEvaluated, patientsEvaluated: run.patientsEvaluated,
    matchesCreated: run.matchesCreated, matchesConfirmed: run.matchesConfirmed,
    matchesSuperseded: run.matchesSuperseded, notes: run.notes,
  });

  if (run.outcome !== 'RUNNING') {
    // Not an error: this is what a second invocation looks like. Report and stop.
    plog('[close-stranded-run] NO-OP: record is not RUNNING, nothing to close', { outcome: run.outcome });
    return;
  }

  if (!EXECUTE) {
    plog('[close-stranded-run] DRY-RUN: would set outcome=FAILED, finishedAt=now, notes=<AUDIT-228 closure note>', {
      note: CLOSURE_NOTE,
    });
    return;
  }

  const updated = await prisma.trialMatchRun.updateMany({
    // `outcome: 'RUNNING'` in the predicate makes the write itself conditional, so a concurrent close
    // between the read above and this update cannot be clobbered - it reports 0 instead.
    where: { id: RUN_ID, outcome: 'RUNNING' },
    data: { finishedAt: new Date(), outcome: 'FAILED', notes: CLOSURE_NOTE },
  });

  if (updated.count !== 1) {
    throw new Error(
      `[close-stranded-run] ABORT: expected to update exactly 1 row, updated ${updated.count}. ` +
        'The record changed between read and write - re-read before retrying.',
    );
  }

  const after = await prisma.trialMatchRun.findUnique({ where: { id: RUN_ID } });
  plog('[close-stranded-run] AFTER', {
    id: after?.id, outcome: after?.outcome, finishedAt: after?.finishedAt, notes: after?.notes,
  });

  // The counts must be untouched: this repairs the run's STATUS, not its measurements.
  const countsHeld =
    after?.trialsEvaluated === run.trialsEvaluated &&
    after?.patientsEvaluated === run.patientsEvaluated &&
    after?.matchesCreated === run.matchesCreated &&
    after?.matchesConfirmed === run.matchesConfirmed &&
    after?.matchesSuperseded === run.matchesSuperseded;
  plog('[close-stranded-run] invariants', {
    outcomeIsFailed: after?.outcome === 'FAILED',
    finishedAtSet: after?.finishedAt != null,
    countsUnchanged: countsHeld,
  });
  if (!countsHeld) {
    throw new Error('[close-stranded-run] ABORT: run counts changed - this script must not touch them.');
  }

  plog('[close-stranded-run] DONE', { id: RUN_ID, outcome: 'FAILED' });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      plog('[close-stranded-run] FAILED', { error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    });
}
