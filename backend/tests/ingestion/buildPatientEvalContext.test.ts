/**
 * AUDIT-148 Slice 1 STEP 1: buildPatientEvalContext extraction is BEHAVIOR-NEUTRAL.
 *
 * The per-patient context assembly was inline-duplicated in runGapDetectionForPatient +
 * gapDetectionRunner. It is now the shared buildPatientEvalContext. This test proves the extraction
 * changed nothing:
 *   (1) buildPatientEvalContext output == an independent copy of the PRE-refactor inline logic
 *       (buildContextLegacy below), field-for-field, across a representative golden cohort;
 *   (2) evaluateGapRules over the extracted context produces the IDENTICAL gap set (same statuses)
 *       as over the legacy context - i.e. gap detection is byte-identical (the golden-cohort gate).
 * The cohort is deliberately non-trivial (each fixture fires gaps) so the identity check is meaningful.
 */
import { buildPatientEvalContext } from '../../src/ingestion/buildPatientEvalContext';
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { deriveEchoMonths } from '../../src/ingestion/echoRecency';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';

const NOW = Date.parse('2026-07-03T00:00:00Z');
const MS_PER_MONTH = 30.436875 * 24 * 60 * 60 * 1000;
const YEAR = 365.25 * 24 * 60 * 60 * 1000;
const monthsAgo = (m: number) => new Date(NOW - m * MS_PER_MONTH).toISOString();
const yearsAgo = (y: number) => new Date(NOW - y * YEAR).toISOString();

// Independent copy of the PRE-refactor inline assembly (the "before"). If buildPatientEvalContext
// diverges from this, the extraction changed behavior and this test fails.
const ECHO_CUTOFF_MS = 365 * 24 * 60 * 60 * 1000;
const LAB_CUTOFF_MS = 180 * 24 * 60 * 60 * 1000;
const IMAGING_TYPES = new Set([
  'lvef', 'LVEF', 'qrs_duration', 'QRS_DURATION', 'echo_lvef', 'lv_ejection_fraction',
  'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade',
  'mitral_eroa', 'mitral_valve_area', 'valve_severity', 'sts_score',
  'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
  'pasp', 'ascending_aorta',
]);
function buildContextLegacy(patient: any, now: number) {
  const dxCodes = patient.conditions.map((c: any) => c.icd10Code).filter(Boolean);
  const labValues: Record<string, number> = {};
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
  const echoMonths = deriveEchoMonths(patient.observations, patient.procedures ?? [], now);
  if (echoMonths !== undefined) labValues['echo_months'] = echoMonths;
  const medCodes = expandToIngredients(patient.medications.map((m: any) => m.rxNormCode).filter(Boolean));
  const meds = patient.medications.map((m: any) => ({
    rxNormCode: m.rxNormCode ?? null, doseValue: m.doseValue ?? null, doseUnit: m.doseUnit ?? null,
    genericName: m.genericName ?? null, medicationName: m.medicationName ?? null, startDate: m.startDate ?? null,
  }));
  const procedureCodes = (patient.procedures ?? []).flatMap((p: any) => [p.cptCode, p.snomedCode]).filter(Boolean);
  const age = Math.floor((now - new Date(patient.dateOfBirth).getTime()) / YEAR);
  return { dxCodes, labValues, medCodes, meds, age, gender: patient.gender, race: patient.race ?? undefined, procedureCodes };
}

const p = (over: any) => ({
  conditions: [], observations: [], medications: [], procedures: [],
  dateOfBirth: yearsAgo(68), gender: 'MALE', race: null, ...over,
});

// Golden cohort: exercises dx, threaded labs, staleness filter, echo_months (procedure + lvef), meds, procedures.
const COHORT: Record<string, any> = {
  hfrefWithLvef: p({
    conditions: [{ icd10Code: 'I50.22' }],
    observations: [{ observationType: 'lvef', valueNumeric: 30, observedDateTime: monthsAgo(2) }],
    medications: [{ rxNormCode: '83367', doseValue: 40, doseUnit: 'mg', genericName: 'atorvastatin', medicationName: 'atorvastatin 40mg', startDate: monthsAgo(6) }],
  }),
  cadHighLdl: p({
    conditions: [{ icd10Code: 'I25.10' }],
    observations: [{ observationType: 'ldl', valueNumeric: 120, observedDateTime: monthsAgo(1) }],
    medications: [{ rxNormCode: '83367', doseValue: 40, doseUnit: 'mg', genericName: 'atorvastatin', medicationName: 'atorvastatin', startDate: null }],
  }),
  vhdStaleEcho: p({
    conditions: [{ icd10Code: 'I35.0' }],
    procedures: [{ cptCode: null, snomedCode: '40701008', procedureDate: monthsAgo(18) }],
  }),
  vhdRecentEcho: p({
    conditions: [{ icd10Code: 'I34.0' }],
    observations: [{ observationType: 'lvef', valueNumeric: 55, observedDateTime: monthsAgo(3) }],
    procedures: [{ cptCode: null, snomedCode: '433236007', procedureDate: monthsAgo(3) }],
  }),
  staleLabDropped: p({
    conditions: [{ icd10Code: 'I25.10' }],
    // ldl 2 years old -> past the 180-day LAB cutoff -> must be DROPPED from labValues
    observations: [{ observationType: 'ldl', valueNumeric: 200, observedDateTime: yearsAgo(2) }],
  }),
  minimalNoObs: p({ conditions: [{ icd10Code: 'I50.9' }] }),
};

describe('AUDIT-148 STEP 1: buildPatientEvalContext == legacy inline logic (behavior-neutral)', () => {
  for (const [name, patient] of Object.entries(COHORT)) {
    it(`context is field-identical to the pre-refactor logic: ${name}`, () => {
      expect(buildPatientEvalContext(patient, NOW)).toEqual(buildContextLegacy(patient, NOW));
    });
  }
});

describe('AUDIT-148 STEP 1: golden-cohort gap detection is byte-identical after extraction', () => {
  const gapsFor = (ctx: any) =>
    evaluateGapRules(ctx.dxCodes, ctx.labValues, ctx.medCodes, ctx.age, ctx.gender, ctx.race, ctx.meds, ctx.procedureCodes)
      .map((g: any) => g.status).sort();

  for (const [name, patient] of Object.entries(COHORT)) {
    it(`identical gap set (extracted vs legacy context): ${name}`, () => {
      expect(gapsFor(buildPatientEvalContext(patient, NOW))).toEqual(gapsFor(buildContextLegacy(patient, NOW)));
    });
  }

  it('cohort is non-trivial: fixtures actually fire gaps, so the identity check is meaningful', () => {
    const total = Object.values(COHORT).reduce(
      (n, pt) => n + gapsFor(buildPatientEvalContext(pt, NOW)).length, 0);
    expect(total).toBeGreaterThan(5);
  });

  it('echo_months derivation carries through: vhdStaleEcho fires VD-ECHO-INTERVAL, vhdRecentEcho does not', () => {
    const stale = gapsFor(buildPatientEvalContext(COHORT.vhdStaleEcho, NOW));
    const recent = gapsFor(buildPatientEvalContext(COHORT.vhdRecentEcho, NOW));
    expect(stale).toContain('Surveillance echocardiography overdue in valvular heart disease');
    expect(recent).not.toContain('Surveillance echocardiography overdue in valvular heart disease');
  });

  it('staleness filter carries through: a 2-year-old ldl is dropped from labValues', () => {
    expect(buildPatientEvalContext(COHORT.staleLabDropped, NOW).labValues['ldl']).toBeUndefined();
  });
});
