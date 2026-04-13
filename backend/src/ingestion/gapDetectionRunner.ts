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
import { Prisma } from '@prisma/client';

// FINDING-3.7-002: Observation staleness cutoffs
// Echo/imaging observations must be within 12 months to suppress gap rules.
// Lab observations must be within 6 months.
const ECHO_CUTOFF_MS = 365 * 24 * 60 * 60 * 1000;  // 12 months
const LAB_CUTOFF_MS = 180 * 24 * 60 * 60 * 1000;    // 6 months
const IMAGING_TYPES = new Set(['lvef', 'LVEF', 'qrs_duration', 'QRS_DURATION', 'echo_lvef', 'lv_ejection_fraction']);

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

  while (true) {
    const patients = await prisma.patient.findMany({
      where: { hospitalId },
      include: {
        conditions: true,
        observations: { orderBy: { observedDateTime: 'desc' } },
        medications: { where: { status: 'ACTIVE' } },
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

      const dxCodes = patient.conditions.map((c: any) => c.icd10Code).filter(Boolean) as string[];
      const labValues: Record<string, number> = {};
      const now = Date.now();
      for (const obs of patient.observations) {
        if (obs.valueNumeric === null) continue;
        if (labValues[obs.observationType] !== undefined) continue;
        // Enforce staleness cutoffs: imaging 12mo, labs 6mo
        if (obs.observedDateTime) {
          const ageMs = now - new Date(obs.observedDateTime).getTime();
          const cutoff = IMAGING_TYPES.has(obs.observationType) ? ECHO_CUTOFF_MS : LAB_CUTOFF_MS;
          if (ageMs > cutoff) continue;
        }
        labValues[obs.observationType] = obs.valueNumeric;
      }
      const medCodes = patient.medications.map((m: any) => m.rxNormCode).filter(Boolean) as string[];
      const age = Math.floor(
        (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );

      try {
        const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, patient.gender, patient.race ?? undefined);

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
      await prisma.$transaction(
        allToUpdate.map(u => prisma.therapyGap.update({
          where: { id: u.id },
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
