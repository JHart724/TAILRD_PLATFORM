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

  const existingKey = (patientId: string, gapType: string, module: string) =>
    `${patientId}::${gapType}::${module}`;
  let existingMap = new Map<string, string>();

  const totalPatients = await prisma.patient.count({ where: { hospitalId } });
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
      select: { id: true, patientId: true, gapType: true, module: true },
    });
    existingMap = new Map(
      batchExistingGaps.map(g => [existingKey(g.patientId, g.gapType, g.module), g.id])
    );

    const allToCreate: any[] = [];
    const allToUpdate: { id: string; status: string }[] = [];

    for (const patient of patients) {
      result.patientsEvaluated++;

      // AUDIT-148 Slice 1 (STEP 1): shared context assembly (behavior-neutral; identical output to the
      // former inline logic, incl the AUDIT-194-B3 echo_months derivation and the staleness cutoffs).
      const { dxCodes, labValues, medCodes, meds, age, gender, race, procedureCodes } =
        buildPatientEvalContext(patient, Date.now());

      try {
        const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, gender, race, meds, procedureCodes);

        if (detectedGaps.length === 0) continue;

        for (const gap of detectedGaps) {
          const key = existingKey(patient.id, gap.type, gap.module);
          const existId = existingMap.get(key);

          if (existId) {
            allToUpdate.push({ id: existId, status: gap.status });
          } else {
            allToCreate.push({
              patientId: patient.id,
              hospitalId,
              gapType: gap.type,
              module: gap.module,
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

  logger.info('Gap detection complete', {
    hospitalId,
    ...result,
  });

  return result;
}
