// @ts-nocheck
// Per-patient gap detection — runs all 257 rules for a single patient
// Used by post-webhook triggers and on-demand evaluation

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { evaluateGapRules } from './gaps/gapRuleEngine';
import { buildPatientEvalContext } from './buildPatientEvalContext';
import { Prisma } from '@prisma/client';

// AUDIT-148 Slice 1 (STEP 1): the per-patient context assembly + these constants moved to the shared
// buildPatientEvalContext (single source, also consumed by gapDetectionRunner + the trial matcher).
// Re-exported here so syntheaProofRun (which imports them from this module) is unaffected.
export { ECHO_CUTOFF_MS, LAB_CUTOFF_MS, IMAGING_TYPES } from './buildPatientEvalContext';

export async function runGapDetectionForPatient(
  patientId: string,
  hospitalId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // AUDIT-011 GAP-1 fix (2026-05-02): switched findUnique → findFirst with
    // hospitalId in where. Function receives hospitalId as parameter (line 16);
    // prior code ignored it, allowing cross-tenant patient PHI to load into
    // memory if a webhook caller passed a mismatched (patientId, hospitalId).
    // findFirst preserves found-row semantics (id is unique) and adds the
    // tenant scope filter; cross-tenant lookups return null → no-op return below.
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId },
      include: {
        // AUDIT-193 companion fix (also fixes a standing latent bug independent of re-ingest): only ACTIVE-class
        // conditions drive gap detection. Previously `conditions: true` included ALL conditions regardless of
        // clinicalStatus, so a RESOLVED/INACTIVE condition still fired gaps for EVERY patient - wrong. We exclude
        // exactly the two deactivation values the writer sets (RESOLVED = explicit STOP; INACTIVE = dropped off a
        // full-snapshot extract). notIn (NOT ==ACTIVE) deliberately KEEPS genuinely-active RECURRENCE/RELAPSE
        // firing - the redox path folds those into 'active', but ingestSynthea stores the raw uppercased FHIR code,
        // so a literal ==ACTIVE filter would wrongly drop them. Medications already filter status ACTIVE (so a
        // DISCONTINUED med drops correctly) - the asymmetry is why this condition filter was the missing half.
        conditions: { where: { clinicalStatus: { notIn: ['RESOLVED', 'INACTIVE'] } } },
        medications: { where: { status: 'ACTIVE' } },
        observations: { orderBy: { observedDateTime: 'desc' } },
        procedures: true, // v3.0 ingest work-unit 1: procedure codes thread to the engine
      },
    });

    if (!patient || !patient.isActive) {
      return;
    }

    // AUDIT-148 Slice 1 (STEP 1): per-patient context assembled by the shared buildPatientEvalContext
    // (behavior-neutral extraction of the former inline logic; identical output, proven by
    // buildPatientEvalContext.test.ts). Includes the AUDIT-194-B3 echo_months derivation.
    const { dxCodes, labValues, medCodes, meds, age, gender, race, procedureCodes } =
      buildPatientEvalContext(patient, Date.now());

    const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, gender, race, meds, procedureCodes);

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
      // AUDIT-011 REFACTOR (2026-05-02): update → updateMany with hospitalId
      // scope. update.where requires unique-key shape; updateMany accepts
      // arbitrary where. Return value not used in this transaction.
      await prisma.$transaction(
        toUpdate.map(u => prisma.therapyGap.updateMany({
          where: { id: u.id, hospitalId },
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
