// @ts-nocheck
// Per-patient gap detection — runs all 257 rules for a single patient
// Used by post-webhook triggers and on-demand evaluation

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { evaluateGapRules } from './gaps/gapRuleEngine';
import { deriveEchoMonths } from './echoRecency';
import { expandToIngredients } from '../terminology/expandToIngredients';
import { Prisma } from '@prisma/client';

export const ECHO_CUTOFF_MS = 365 * 24 * 60 * 60 * 1000;
export const LAB_CUTOFF_MS = 180 * 24 * 60 * 60 * 1000;
export const IMAGING_TYPES = new Set([
  'lvef', 'LVEF', 'qrs_duration', 'QRS_DURATION', 'echo_lvef', 'lv_ejection_fraction',
  // v3.0 echo-severity threading (2026-06-17): valve echo measurements get the 365-day ECHO freshness window
  // (echos are ~annual), not the 180-day LAB cutoff. Covers both the CSV slugs and the path-2 FHIR slugs.
  'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade',
  'mitral_eroa', 'mitral_valve_area', 'valve_severity', 'sts_score',
  // TR + vena-contracta (v3.0 SH chunk 3)
  'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
  // PASP (echo-derived) + ascending aorta dimension (v3.0 SH chunk 3 acceptance + chunk 4)
  'pasp', 'ascending_aorta',
]);

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

    const dxCodes = patient.conditions.map((c: any) => c.icd10Code).filter(Boolean);
    const labValues: Record<string, number> = {};
    const now = Date.now();
    for (const obs of patient.observations) {
      if (obs.valueNumeric === null) continue;
      if (labValues[obs.observationType] !== undefined) continue;
      if (obs.observedDateTime) {
        const ageMs = now - new Date(obs.observedDateTime).getTime();
        const cutoff = IMAGING_TYPES.has(obs.observationType) ? ECHO_CUTOFF_MS : LAB_CUTOFF_MS;
        if (ageMs > cutoff) continue;
      }
      labValues[obs.observationType] = obs.valueNumeric;
    }
    // AUDIT-194-B3 (Threading Tranche 2): derive echo_months = months since the most-recent echo
    // (echo procedure date union lvef observation date) from the UNFILTERED sets - deliberately BEFORE the
    // ECHO_CUTOFF staleness filter above, because a >12-month-old echo is exactly what VD-ECHO-INTERVAL must
    // catch and would otherwise be dropped. undefined (no echo on record) is NOT written -> the surveillance
    // rule never fires on absence (see gapRuleEngine VD-ECHO-INTERVAL, never-fire-on-absence discipline).
    const echoMonths = deriveEchoMonths(patient.observations, patient.procedures ?? [], now);
    if (echoMonths !== undefined) labValues['echo_months'] = echoMonths;
    // AUDIT-118: ingredient-expand at construction so product-coded (SCD/SBD)
    // meds match the ingredient-level (TTY=IN) value sets. medCodes MUST be
    // built via expandToIngredients(); raw membership silently under-detects.
    const medCodes = expandToIngredients(
      patient.medications.map((m: any) => m.rxNormCode).filter(Boolean),
    );
    // AUDIT-101: thread dose-bearing medication records so dose-dependent gates
    // (high-intensity statin) can test strength, not ingredient presence.
    const meds = patient.medications.map((m: any) => ({
      rxNormCode: m.rxNormCode ?? null,
      doseValue: m.doseValue ?? null,
      doseUnit: m.doseUnit ?? null,
      genericName: m.genericName ?? null,
      medicationName: m.medicationName ?? null,
      startDate: m.startDate ?? null, // v3.0 ingest work-unit 1: thread med start-date (FHIR authoredOn)
    }));
    // v3.0 ingest work-unit 1: procedure codes (CPT + SNOMED) for procedure-gated gaps.
    const procedureCodes = (patient.procedures ?? []).flatMap((p: any) => [p.cptCode, p.snomedCode]).filter(Boolean);
    const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, patient.gender, patient.race ?? undefined, meds, procedureCodes);

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
