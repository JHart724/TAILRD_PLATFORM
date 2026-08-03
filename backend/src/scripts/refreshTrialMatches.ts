/**
 * TrialMatch verdict-refresh runner (TrialMatch identity design, section 3.4).
 *
 * WHY: `GET /trials/summary` currently evaluates inside the request under a 20s budget and reports a
 * TRUNCATED, ID-ORDERED sample - which is not merely incomplete but NOT REPRESENTATIVE (measured: a
 * 1,200-patient prefix reads HFrEF 5/52/1143 where the population reads 68/24,319/1,184). Executive
 * numbers must be population-true, and a full evaluation costs 451 seconds, so it must happen OUTSIDE
 * the request path and be read back. This runner is that computation.
 *
 * SHAPE (the AUDIT-218/225 pattern, proven four times in this repo): dedicated script, dry-run
 * default, mutation-safe cursor pagination, full-scan invariant asserted before the run record is
 * closed, AUDIT-221 buildSha self-emit, AUDIT-224-equivalent durable run record opened up-front,
 * AUDIT-193-class completeness gate. Resolution-like writes carry the reserved `system:` actor.
 *
 * WRITE SEMANTICS (section 3.2): version-and-supersede, never overwrite.
 *   - no stored verdict      -> INSERT a current row
 *   - same verdict           -> advance lastConfirmedAt only (NO new row)
 *   - different verdict      -> supersede the current row (with a three-way reason) + INSERT the new
 *
 * SHIPS INERT: dry-run is the default and writes nothing. Merging this file changes no data.
 *
 * USAGE:
 *   node dist/scripts/refreshTrialMatches.js                      # dry-run, no writes
 *   node dist/scripts/refreshTrialMatches.js --execute            # mutating; operator-gated
 *   node dist/scripts/refreshTrialMatches.js --tenant <id>        # default demo-synthea-threaded
 */

import prisma from '../lib/prisma';
import { resolveBuildSha } from './buildSha';
import { criteriaHash } from '../lib/canonicalJson';
import { buildPatientEvalContext } from '../ingestion/buildPatientEvalContext';
import { evaluateTrialMatch, TrialCriterion } from '../services/trialMatchService';
import {
  REFRESH_ACTOR, TrialMatchStatus, StoredMatch,
  decideAction, evaluateCompleteness, emptyTallies, assertFullScan,
} from '../services/trialMatchLifecycle';

const EXECUTE = process.argv.includes('--execute');
const tenantArgIdx = process.argv.indexOf('--tenant');
export const DEFAULT_TENANT = 'demo-synthea-threaded' as const;
const TARGET_TENANT =
  tenantArgIdx >= 0 && process.argv[tenantArgIdx + 1] ? process.argv[tenantArgIdx + 1] : DEFAULT_TENANT;

/** Cursor batch over patients. Mirrors gapDetectionRunner's proven BATCH_SIZE shape. */
const BATCH = 100;

function plog(msg: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(msg, extra ? JSON.stringify(extra) : '');
}

async function main(): Promise<void> {
  const buildSha = resolveBuildSha();
  plog('[trialmatch-refresh] start', {
    buildSha, tenant: TARGET_TENANT, mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
  });

  // Trials visible to this tenant: the global curated catalog (hospitalId null) + tenant-owned.
  const trials = await prisma.clinicalTrial.findMany({
    where: { OR: [{ hospitalId: null }, { hospitalId: TARGET_TENANT }] },
    orderBy: { createdAt: 'asc' },
  });
  if (trials.length === 0) {
    plog('[trialmatch-refresh] no trials visible to this tenant - nothing to do');
    return;
  }

  // criteriaVersion per trial: the content hash of its structured criteria (design R1). Computed once
  // per run; the read path separately compares this against the live trial (detect, do not act).
  const versions = new Map<string, string>(trials.map(t => [t.id, criteriaHash(t.criteria)]));
  const criteriaBy = new Map<string, TrialCriterion[]>(
    trials.map(t => [t.id, t.criteria as unknown as TrialCriterion[]]),
  );

  const expectedTotal = await prisma.patient.count({ where: { hospitalId: TARGET_TENANT, isActive: true } });
  plog('[trialmatch-refresh] tenant patients to walk', { expectedTotal, trials: trials.length });

  // AUDIT-224: run record opened UP-FRONT so a crashed run still leaves evidence it started.
  const run = EXECUTE
    ? await prisma.trialMatchRun.create({
        data: { hospitalId: TARGET_TENANT, buildSha, outcome: 'RUNNING', trialsEvaluated: trials.length },
      })
    : null;

  const tallies = emptyTallies();
  tallies.trialsEvaluated = trials.length;

  // Deferred writes: supersessions are WITHHELD until the completeness gate passes at the end of the
  // walk (AUDIT-193 class). Creates-for-new-pairs and confirmations are safe to apply immediately,
  // but are batched here too so a dry-run reports exactly what an execute would do.
  const toCreate: Array<{ patientId: string; trialId: string; status: TrialMatchStatus; criteriaResults: unknown; indeterminateSignals: string[] }> = [];
  const toConfirm: string[] = [];
  const toSupersede: Array<{ rowId: string; reason: string; next: { patientId: string; trialId: string; status: TrialMatchStatus; criteriaResults: unknown; indeterminateSignals: string[] } }> = [];

  let cursor: string | undefined;
  let scanned = 0;
  const now = Date.now();

  for (;;) {
    const patients = await prisma.patient.findMany({
      where: { hospitalId: TARGET_TENANT, isActive: true },
      include: {
        conditions: { where: { clinicalStatus: { notIn: ['RESOLVED', 'INACTIVE'] } } },
        medications: { where: { status: 'ACTIVE' } },
        observations: { orderBy: { observedDateTime: 'desc' } },
        procedures: true,
      },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (patients.length === 0) break;
    cursor = patients[patients.length - 1].id;
    scanned += patients.length;

    // Current stored verdicts for this batch, one query per batch rather than per patient.
    const batchIds = patients.map(p => p.id);
    const storedRows = await prisma.trialMatch.findMany({
      where: { hospitalId: TARGET_TENANT, patientId: { in: batchIds }, supersededAt: null },
      select: { id: true, patientId: true, trialId: true, status: true, criteriaVersion: true, evaluatedAt: true },
    });
    const storedBy = new Map<string, StoredMatch>(
      (storedRows as any[]).map(r => [`${r.patientId}::${r.trialId}`, r as StoredMatch]),
    );

    for (const p of patients as any[]) {
      const ctx = buildPatientEvalContext(p, now);
      tallies.patientsEvaluated++;

      for (const t of trials) {
        const fresh = evaluateTrialMatch({ id: t.id, criteria: criteriaBy.get(t.id)! }, ctx);
        const stored = storedBy.get(`${p.id}::${t.id}`);
        const version = versions.get(t.id)!;

        // AUDIT-223 two-clock probe, computed ONLY when it can matter: a differing verdict whose
        // criteria hash is unchanged. Re-evaluating the same rows at the stored row's clock isolates
        // the clock's contribution exactly, because buildPatientEvalContext is pure over rows + clock.
        let firedSameAtOldClock = false;
        if (stored && stored.status !== fresh.status && stored.criteriaVersion === version) {
          const thenCtx = buildPatientEvalContext(p, new Date(stored.evaluatedAt).getTime());
          const thenMatch = evaluateTrialMatch({ id: t.id, criteria: criteriaBy.get(t.id)! }, thenCtx);
          firedSameAtOldClock = thenMatch.status === stored.status;
        }

        const action = decideAction(stored, fresh.status as TrialMatchStatus, version, firedSameAtOldClock);
        const payload = {
          patientId: p.id,
          trialId: t.id,
          status: fresh.status as TrialMatchStatus,
          criteriaResults: fresh.criteriaResults,
          indeterminateSignals: fresh.indeterminateSignals,
        };

        if (action.kind === 'create') { toCreate.push(payload); tallies.matchesCreated++; }
        else if (action.kind === 'confirm') { toConfirm.push(action.rowId); tallies.matchesConfirmed++; }
        else { toSupersede.push({ rowId: action.rowId, reason: action.reason, next: payload }); tallies.matchesSuperseded++; }
      }
    }

    if (patients.length < BATCH) break;
    plog('[trialmatch-refresh] progress', { scanned, expectedTotal });
  }

  const completeness = evaluateCompleteness(tallies.patientsEvaluated, expectedTotal);
  let outcome = 'COMPLETED';

  if (EXECUTE) {
    const stamp = new Date();

    for (const c of toCreate) {
      await prisma.trialMatch.create({
        data: {
          ...c, hospitalId: TARGET_TENANT, criteriaResults: c.criteriaResults as any,
          buildSha, criteriaVersion: versions.get(c.trialId)!,
          evaluatedAt: stamp, lastConfirmedAt: stamp, evaluatedBy: REFRESH_ACTOR,
        } as any,
      });
    }

    if (toConfirm.length > 0) {
      await prisma.trialMatch.updateMany({
        where: { id: { in: toConfirm }, hospitalId: TARGET_TENANT },
        data: { lastConfirmedAt: stamp, buildSha },
      });
    }

    if (!completeness.ok) {
      // AUDIT-193 class: withhold supersession, keep creates/confirmations, record why.
      outcome = 'ABORTED_INCOMPLETE';
      tallies.matchesSuperseded = 0;
      plog('[trialmatch-refresh] supersession WITHHELD (completeness gate)', {
        evaluated: tallies.patientsEvaluated, stored: expectedTotal, message: completeness.message,
      });
    } else {
      for (const s of toSupersede) {
        // Supersede-then-insert. The partial unique (WHERE supersededAt IS NULL) permits both rows to
        // coexist precisely because the old one is no longer current.
        const inserted = await prisma.trialMatch.create({
          data: {
            ...s.next, hospitalId: TARGET_TENANT, criteriaResults: s.next.criteriaResults as any,
            buildSha, criteriaVersion: versions.get(s.next.trialId)!,
            evaluatedAt: stamp, lastConfirmedAt: stamp, evaluatedBy: REFRESH_ACTOR,
          } as any,
        });
        await prisma.trialMatch.updateMany({
          where: { id: s.rowId, hospitalId: TARGET_TENANT, supersededAt: null },
          data: { supersededAt: stamp, supersededBy: inserted.id, supersessionReason: s.reason },
        });
      }
    }
  }

  assertFullScan(scanned, expectedTotal, EXECUTE);

  if (EXECUTE && run) {
    await prisma.trialMatchRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        trialsEvaluated: tallies.trialsEvaluated,
        patientsEvaluated: tallies.patientsEvaluated,
        matchesCreated: tallies.matchesCreated,
        matchesSuperseded: tallies.matchesSuperseded,
        matchesConfirmed: tallies.matchesConfirmed,
        completenessFraction: completeness.fraction,
        outcome,
        notes: completeness.ok ? null : (completeness.message ?? null),
      },
    });
  }

  plog('[trialmatch-refresh] DONE', {
    mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN', ...tallies,
    scanned, expectedTotal, completenessFraction: completeness.fraction, outcome, buildSha,
  });
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      plog('[trialmatch-refresh] FAILED', { error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    });
}
