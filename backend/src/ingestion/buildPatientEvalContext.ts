// AUDIT-148 Slice 1 (STEP 1): shared per-patient evaluation-context assembly.
//
// Behavior-neutral extraction of the inline context assembly that was DUPLICATED in
// runGapDetectionForPatient.ts + gapDetectionRunner.ts. Both gap runners AND the trial matcher
// (evaluateTrialMatch) consume this exact context, so the matcher inherits the same crosswalks,
// LOINC threading, echo_months derivation, and re-ingest correctness the gap engine uses.
//
// This is a de-dup ONLY - the produced context is byte-identical to the prior inline logic
// (proven by buildPatientEvalContext.test.ts legacy-vs-extracted equivalence + the golden-cohort
// gap-identity check). No behavior change.

import { expandToIngredients } from '../terminology/expandToIngredients';
import { deriveEchoMonths } from './echoRecency';

export const ECHO_CUTOFF_MS = 365 * 24 * 60 * 60 * 1000;
export const LAB_CUTOFF_MS = 180 * 24 * 60 * 60 * 1000;

// Observation slugs that get the 365-day ECHO freshness window (echos are ~annual) rather than the
// 180-day LAB cutoff. (Moved here from the runners as the single source; runGapDetectionForPatient
// re-exports these for syntheaProofRun's import.)
export const IMAGING_TYPES = new Set<string>([
  'lvef', 'LVEF', 'qrs_duration', 'QRS_DURATION', 'echo_lvef', 'lv_ejection_fraction',
  'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade',
  'mitral_eroa', 'mitral_valve_area', 'valve_severity', 'sts_score',
  'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
  'pasp', 'ascending_aorta',
]);

export interface EvalMed {
  rxNormCode: string | null;
  doseValue: number | null;
  doseUnit: string | null;
  genericName: string | null;
  medicationName: string | null;
  startDate: Date | string | null;
}

export interface PatientEvalContext {
  dxCodes: string[];
  labValues: Record<string, number>;
  medCodes: string[];
  meds: EvalMed[];
  age: number;
  gender: string | undefined;
  race: string | undefined;
  procedureCodes: string[];
}

/**
 * Assemble the per-patient evaluation context from a loaded patient (conditions / observations /
 * medications / procedures included). `nowMs` is the evaluation epoch (pass Date.now() once at the
 * call site so labValues staleness, echo_months, and age are computed against a single clock).
 *
 * Uses `any` for the patient to avoid stale-Prisma-client type friction under WSL (per section 14);
 * the runners suppress type-checking on their Prisma-row inputs and pass rows directly. (This file
 * itself is type-checked - it carries NO suppression directive; see AUDIT-204.)
 */
export function buildPatientEvalContext(patient: any, nowMs: number): PatientEvalContext {
  const dxCodes: string[] = patient.conditions.map((c: any) => c.icd10Code).filter(Boolean);

  const labValues: Record<string, number> = {};
  for (const obs of patient.observations) {
    if (obs.valueNumeric === null) continue;
    if (labValues[obs.observationType] !== undefined) continue;
    if (obs.observedDateTime) {
      const ageMs = nowMs - new Date(obs.observedDateTime).getTime();
      const cutoff = IMAGING_TYPES.has(obs.observationType) ? ECHO_CUTOFF_MS : LAB_CUTOFF_MS;
      if (ageMs > cutoff) continue;
    }
    labValues[obs.observationType] = obs.valueNumeric;
  }
  // AUDIT-194-B3: echo_months from the UNFILTERED echo procedure + lvef dates (before the staleness
  // filter above). undefined (no echo on record) is NOT written -> never-fire-on-absence downstream.
  const echoMonths = deriveEchoMonths(patient.observations, patient.procedures ?? [], nowMs);
  if (echoMonths !== undefined) labValues['echo_months'] = echoMonths;

  // AUDIT-118: ingredient-expand so product-coded (SCD/SBD) meds match the ingredient-level value sets.
  const medCodes: string[] = expandToIngredients(
    patient.medications.map((m: any) => m.rxNormCode).filter(Boolean),
  );
  // AUDIT-101: dose-bearing medication records for dose-dependent gates.
  const meds: EvalMed[] = patient.medications.map((m: any) => ({
    rxNormCode: m.rxNormCode ?? null,
    doseValue: m.doseValue ?? null,
    doseUnit: m.doseUnit ?? null,
    genericName: m.genericName ?? null,
    medicationName: m.medicationName ?? null,
    startDate: m.startDate ?? null,
  }));
  // v3.0 ingest work-unit 1: procedure codes (CPT + SNOMED) for procedure-gated gaps.
  const procedureCodes: string[] = (patient.procedures ?? []).flatMap((p: any) => [p.cptCode, p.snomedCode]).filter(Boolean);
  const age = Math.floor((nowMs - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return {
    dxCodes,
    labValues,
    medCodes,
    meds,
    age,
    gender: patient.gender,
    race: patient.race ?? undefined,
    procedureCodes,
  };
}
