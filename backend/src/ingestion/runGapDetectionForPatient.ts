// @ts-nocheck
// Per-patient gap detection — runs all 257 rules for a single patient
// Used by post-webhook triggers and on-demand evaluation

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { evaluateGapRules } from './gaps/gapRuleEngine';
import { Prisma } from '@prisma/client';

export async function runGapDetectionForPatient(
  patientId: string,
  hospitalId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        conditions: true,
        medications: true,
        observations: { orderBy: { observedDateTime: 'desc' } },
      },
    });

    if (!patient || !patient.isActive) {
      return;
    }

    const dxCodes = patient.conditions.map((c: any) => c.icd10Code).filter(Boolean);
    const labValues: Record<string, number> = {};
    for (const obs of patient.observations) {
      if (obs.valueNumeric !== null && !labValues[obs.observationType]) {
        labValues[obs.observationType] = obs.valueNumeric;
      }
    }
    const medCodes = patient.medications.map((m: any) => m.rxNormCode).filter(Boolean);
    const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, patient.gender, patient.race ?? undefined);

    // Load existing gaps for this patient
    const existingGaps = await prisma.therapyGap.findMany({
      where: { patientId, hospitalId },
      select: { id: true, gapType: true, module: true },
    });

    const existingKey = (gapType: string, module: string) => `${gapType}::${module}`;
    const existingMap = new Map(existingGaps.map((g: any) => [existingKey(g.gapType, g.module), g.id]));

    const toCreate: any[] = [];
    const toUpdate: { id: string; status: string }[] = [];

    for (const gap of detectedGaps) {
      const key = existingKey(gap.type, gap.module);
      const existId = existingMap.get(key);

      if (existId) {
        toUpdate.push({ id: existId, status: gap.status });
      } else {
        toCreate.push({
          patientId,
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

    if (toCreate.length > 0) {
      await prisma.therapyGap.createMany({ data: toCreate });
    }

    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map(u => prisma.therapyGap.update({
          where: { id: u.id },
          data: { currentStatus: u.status },
        }))
      );
    }

    logger.info('Gap detection completed for patient', {
      patientId,
      hospitalId,
      gapsDetected: detectedGaps.length,
      created: toCreate.length,
      updated: toUpdate.length,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Gap detection failed for patient', {
      patientId,
      hospitalId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
