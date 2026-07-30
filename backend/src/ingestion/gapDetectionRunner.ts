/**
 * Gap Detection Runner — Batch Orchestrator
 *
 * Processes all patients for a hospital in batches, running 257 gap detection rules
 * per patient. Rules are defined in gaps/gapRuleEngine.ts.
 *
 * For single-patient detection (post-webhook), use runGapDetectionForPatient.
 */
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { evaluateGapRules } from './gaps/gapRuleEngine';
import { buildPatientEvalContext } from './buildPatientEvalContext';
import { Prisma } from '@prisma/client';
import {
  StoredOpenRow, ResolveReason, RESOLVE_ACTOR,
  selectResolveTargets, classifyResolveReason, resolvedStatus, evaluateCompleteness,
} from './gapResolvePass';
import { resolveBuildSha } from '../scripts/buildSha';

// AUDIT-148 Slice 1 (STEP 1): the per-patient context assembly + the staleness cutoffs / IMAGING_TYPES
// moved to the shared buildPatientEvalContext (single source; this runner previously carried a duplicate
// copy). Behavior-neutral - identical output, proven by buildPatientEvalContext.test.ts.

export { runGapDetectionForPatient } from './runGapDetectionForPatient';
export { RUNTIME_GAP_REGISTRY } from './gaps/gapRuleEngine';

export interface GapDetectionResult {
  patientsEvaluated: number;
  gapFlagsCreated: number;
  gapFlagsUpdated: number;
  gapFlagsResolved: number;
}

export async function runGapDetection(
  hospitalId: string,
  _uploadJobId?: string,
): Promise<GapDetectionResult> {
  const BATCH_SIZE = 100;
  const result: GapDetectionResult = {
    patientsEvaluated: 0,
    gapFlagsCreated: 0,
    gapFlagsUpdated: 0,
    gapFlagsResolved: 0,
  };

  // AUDIT-222: ruleId is the match key. The former `patientId::gapType::module` key was COARSER than a
  // rule (357 of 368 rules share a gapType+module bucket), so siblings clobbered each other's
  // currentStatus, only one row per patient-bucket was ever reachable by the refresh path (47.7% of
  // production rows were shadowed), and genuinely-firing siblings were never created.
  // See docs/audit/AUDIT_222_223_JOINT_DESIGN.md.
  const existingKey = (patientId: string, ruleId: string) => `${patientId}::${ruleId}`;
  let existingMap = new Map<string, string>();

  // AUDIT-223: resolve targets accumulate across batches; applied only after the completeness gate.
  const allToResolve: Array<{ id: string; ruleId: string; currentStatus: string; reason: ResolveReason }> = [];

  const totalPatients = await prisma.patient.count({ where: { hospitalId } });

  // AUDIT-224: durable per-run record. Created up-front so a crashed run still leaves evidence it started.
  const runRecord = await prisma.gapDetectionRun.create({
    data: { hospitalId, buildSha: resolveBuildSha(), outcome: 'RUNNING' },
  });
  let cursor: string | undefined;

  logger.info('Starting batch gap detection', { hospitalId, totalPatients });

  // Batch cursor-pagination: loop until patients.length === 0 (handled below).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const patients = await prisma.patient.findMany({
      where: { hospitalId },
      include: {
        conditions: true,
        observations: { orderBy: { observedDateTime: 'desc' } },
        medications: { where: { status: 'ACTIVE' } },
        procedures: true, // v3.0 ingest work-unit 1: procedure codes thread to the engine
      },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });

    if (patients.length === 0) break;
    cursor = patients[patients.length - 1].id;

    // Load existing gaps for THIS BATCH only (prevents OOM at scale)
    const batchPatientIds = patients.map(p => p.id);
    const batchExistingGaps = await prisma.therapyGap.findMany({
      where: { hospitalId, patientId: { in: batchPatientIds } },
      select: { id: true, patientId: true, gapType: true, module: true, ruleId: true,
        currentStatus: true, identifiedAt: true, resolvedAt: true, resolvedBy: true },
    });
    // NULL-ruleId rows (pre-backfill rows + the AUDIT-195/196 consolidation orphans) are INERT: they never
    // match a detected gap, so no row is silently re-pointed at an unrelated rule (PR-B dispositions them).
    // First-writer-wins keeps the mapping deterministic if duplicate ruleId rows exist from the pre-fix era.
    existingMap = new Map<string, string>();
    for (const g of batchExistingGaps as any[]) {
      if (!g.ruleId) continue;
      // AUDIT-223: only OPEN rows are match targets. A RESOLVED row keeps its ruleId, so matching it would
      // rewrite a closed gap's text while leaving resolvedAt set - the row would assert a live recommendation
      // while reading as closed. A re-firing rule must instead CREATE a new open row: a new clinical episode
      // beside the resolved history. This is exactly why the uniqueness constraint is PARTIAL (open rows only).
      if (g.resolvedAt) continue;
      const k = existingKey(g.patientId, g.ruleId);
      if (!existingMap.has(k)) existingMap.set(k, g.id);
    }

    const allToCreate: any[] = [];
    const allToUpdate: { id: string; status: string }[] = [];

    // AUDIT-223: rows this batch says should CLOSE. Collected across all batches and applied only after the
    // completeness gate passes at the end of the walk - a truncated run must never mass-resolve.
    const storedOpenByPatient = new Map<string, StoredOpenRow[]>();
    for (const g of batchExistingGaps as any[]) {
      if (g.resolvedAt) continue; // already closed; not a resolve candidate
      const list = storedOpenByPatient.get(g.patientId) ?? [];
      list.push({
        id: g.id, ruleId: g.ruleId, currentStatus: g.currentStatus,
        identifiedAt: g.identifiedAt, resolvedBy: g.resolvedBy,
      });
      storedOpenByPatient.set(g.patientId, list);
    }

    for (const patient of patients) {
      result.patientsEvaluated++;

      // AUDIT-148 Slice 1 (STEP 1): shared context assembly (behavior-neutral; identical output to the
      // former inline logic, incl the AUDIT-194-B3 echo_months derivation and the staleness cutoffs).
      const nowMs = Date.now();
      const { dxCodes, labValues, medCodes, meds, age, gender, race, procedureCodes } =
        buildPatientEvalContext(patient, nowMs);

      try {
        const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, gender, race, meds, procedureCodes);

        // AUDIT-223 resolve pass. Runs BEFORE the early-return below, because a patient for whom NOTHING
        // fires any more is exactly the patient whose stored gaps most need closing.
        const detectedRuleIds = new Set(detectedGaps.map((g: any) => g.ruleId));
        for (const t of selectResolveTargets(storedOpenByPatient.get(patient.id) ?? [], detectedRuleIds)) {
          // Two-clock discriminator: re-evaluate the SAME patient rows at the row's identifiedAt. Any
          // difference is therefore purely the clock's doing (staleness windows, age), which separates
          // "aged out of a window" from "the patient's data changed".
          const thenCtx = buildPatientEvalContext(patient, new Date(t.identifiedAt).getTime());
          const thenGaps = evaluateGapRules(
            thenCtx.dxCodes, thenCtx.labValues, thenCtx.medCodes, thenCtx.age,
            thenCtx.gender, thenCtx.race, thenCtx.meds, thenCtx.procedureCodes,
          );
          const firedThen = thenGaps.some((g: any) => g.ruleId === t.ruleId);
          allToResolve.push({ ...t, reason: classifyResolveReason(firedThen) });
        }

        if (detectedGaps.length === 0) continue;

        const claimed = new Set<string>();
        for (const gap of detectedGaps) {
          const key = existingKey(patient.id, gap.ruleId);
          // A rule fires at most once per patient; guard against double-claiming one stored row.
          const existId = claimed.has(key) ? undefined : existingMap.get(key);

          if (existId) {
            claimed.add(key);
            allToUpdate.push({ id: existId, status: gap.status });
          } else {
            allToCreate.push({
              patientId: patient.id,
              hospitalId,
              gapType: gap.type,
              module: gap.module,
              ruleId: gap.ruleId,
              medication: gap.medication || null,
              currentStatus: gap.status,
              targetStatus: gap.target,
              recommendations: gap.recommendations as Prisma.InputJsonValue ?? Prisma.JsonNull,
            });
          }
        }
      } catch (err) {
        logger.error('Gap detection failed for patient', {
          patientId: patient.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (allToCreate.length > 0) {
      await prisma.therapyGap.createMany({ data: allToCreate });
      result.gapFlagsCreated += allToCreate.length;
    }

    if (allToUpdate.length > 0) {
      // AUDIT-011 REFACTOR (2026-05-02): switched update → updateMany so
      // hospitalId can scope the where clause. update.where requires a
      // unique-key shape; updateMany accepts arbitrary where. Return value
      // ({ count }) is not used here.
      await prisma.$transaction(
        allToUpdate.map(u => prisma.therapyGap.updateMany({
          where: { id: u.id, hospitalId },
          data: { currentStatus: u.status },
        }))
      );
      result.gapFlagsUpdated += allToUpdate.length;
    }

    if (patients.length < BATCH_SIZE) break;

    logger.info('Gap detection batch progress', {
      hospitalId,
      processed: result.patientsEvaluated,
      total: totalPatients,
    });
  }

  // AUDIT-223 completeness gate (AUDIT-193 class). Creates and updates already landed; only RESOLVING is
  // withheld when the walk covered materially fewer patients than the tenant holds, because resolving on a
  // truncated run would mass-close live clinical gaps.
  const completeness = evaluateCompleteness(result.patientsEvaluated, totalPatients);
  let outcome = 'COMPLETED';
  if (!completeness.ok) {
    outcome = 'ABORTED_INCOMPLETE';
    logger.error('Gap resolve pass WITHHELD (completeness gate)', {
      hospitalId, evaluated: result.patientsEvaluated, stored: totalPatients, message: completeness.message,
    });
  } else if (allToResolve.length > 0) {
    const onDate = new Date().toISOString().slice(0, 10);
    const now = new Date();
    for (const r of allToResolve) {
      const res = await prisma.therapyGap.updateMany({
        where: { id: r.id, hospitalId, resolvedAt: null },
        data: {
          resolvedAt: now,
          resolvedBy: RESOLVE_ACTOR,
          currentStatus: resolvedStatus(r.currentStatus, r.reason, onDate),
        },
      });
      result.gapFlagsResolved += res.count;
    }
  }

  await prisma.gapDetectionRun.update({
    where: { id: runRecord.id },
    data: {
      finishedAt: new Date(),
      patientsEvaluated: result.patientsEvaluated,
      gapsCreated: result.gapFlagsCreated,
      gapsUpdated: result.gapFlagsUpdated,
      gapsResolved: result.gapFlagsResolved,
      completenessFraction: completeness.fraction,
      outcome,
      notes: completeness.ok ? null : (completeness.message ?? null),
    },
  });

  logger.info('Gap detection complete', {
    hospitalId,
    ...result,
    completenessFraction: completeness.fraction,
    outcome,
    resolveCandidates: allToResolve.length,
  });

  return result;
}
