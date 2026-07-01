import prisma from '../lib/prisma';
import { ParsedRow, MedicationRecord, ConditionRecord } from './csvParser';
import { Gender, ObservationCategory, ConditionCategory, ConditionClinicalStatus, ConditionVerificationStatus, MedicationStatus } from '@prisma/client';

// AUDIT-193: the recurring monthly extract model. 'full' = a complete snapshot (a med/dx absent from it is no
// longer on the active list -> deactivate-diff runs). 'delta' = an incremental extract (absence means unchanged,
// NOT ended -> deactivate-diff is SKIPPED; only explicit STOP dates deactivate). Default 'full'.
export type ExtractMode = 'full' | 'delta';

export interface WriteResult {
  patientsCreated: number;
  patientsUpdated: number;
  observationsWritten: number;
  errors: Array<{ patientId: string; error: string }>;
  // AUDIT-193: structured, fail-loud completeness errors. Populated when the deactivate-diff is ABORTED because
  // the extract looks truncated (below the patient-count band) - surfaced, never a silent mass-deactivate.
  completenessErrors: Array<{ hospitalId: string; message: string }>;
}

// AUDIT-193: deactivate-diff aborts if the new extract's distinct-patient count is below this fraction of the
// tenant's stored patient count. Legitimate monthly churn is low single digits; a >10% drop signals a truncated
// extract, not real attrition. Operator decision (2026-06-30).
const COMPLETENESS_MIN_FRACTION = 0.9;

// AUDIT-192 (2026-06-29): BATCHED write path. The prior per-row loop did findUnique + per-Condition /
// per-Medication upsert per patient -> ~12 serial Aurora round-trips per patient (~300K for the 25,571-patient
// proof) AND tripped the audit-mode tenant guard on every where:{id} op (~250K TENANT_GUARD_VIOLATION events),
// making the proof take ~3h. This path collects each sub-batch and writes via createMany (the operation the
// tenant guard EXEMPTS by design - the schema-typed `data` carries hospitalId, so every row is tenant-scoped by
// construction; this PRESERVES the Layer-3 invariant, it does NOT bypass it). Lookups/updates carry hospitalId
// in `where` so they pass the guard structurally. Net: ~300K serial round-trips -> ~5-8 per 500-patient batch,
// zero guard violations. Re-ingest (month-2+) still UPDATES existing rows (lastAssessment + clinicalStatus/
// status re-affirm) via bounded updateMany / $transaction, never silent skip.
const WRITE_BATCH = 500;

/** Deterministic Patient PK so child rows (Condition/Medication/Observation) can reference it without a
 *  per-row create round-trip, and re-ingest is idempotent. Unique per (hospital, mrn) - mrn is unique per
 *  hospital via the @@unique([hospitalId, mrn]) constraint. */
function deterministicPatientId(hospitalId: string, mrn: string): string {
  return `${hospitalId}::${mrn}`;
}

const ECHO_FIELDS: ReadonlySet<string> = new Set([
  'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade',
  'sts_score', 'valve_severity',
  'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
  'mitral_eroa', 'pasp', 'ascending_aorta',
]);

// Lab/vital/echo slugs the gap engine reads by observationType. NLM-verified LOINCs / CSV-only derived values
// (see AUDIT-165 / AUDIT-181 / AUDIT-184 / LVESD-batch lineage in getObservationName below).
const LAB_FIELDS: readonly string[] = [
  'lvef', 'bnp', 'nt_probnp', 'ferritin', 'tsat', 'sodium', 'potassium', 'egfr',
  'bmi', // AUDIT-194-B1 / Threading Tranche 1: bmi was the one confirmed-present slug not already in LAB_FIELDS; added so the synthea/CSV write path persists it (LOINC 39156-5 threaded in ECHO_LOINC_TO_SLUG)
  'ldl', 'lpa', 'triglycerides', 'qtc_interval', 'qrs_duration', 'kccq_score', 'abi_right', 'abi_left',
  'apob', 'inr',
  'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade', 'sts_score',
  'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
  'mitral_eroa', 'pasp', 'ascending_aorta',
  'heart_rate', 'systolic_bp', 'diastolic_bp', 'hemoglobin', 'hba1c', 'tsh', 'creatinine', 'crp', 'hs_crp', 'alt', 'ast',
  'cac_score', 'stress_test_months', 'ccta', 'graft_duplex_months',
  'lvesd', 'tapse', 'fac', 'vegetation_size', 'anti_xa',
];

export async function writePatients(
  rows: ParsedRow[],
  hospitalId: string,
  _uploadJobId: string,
  _moduleId: string,
  extractMode: ExtractMode = 'full',
): Promise<WriteResult> {
  const result: WriteResult = { patientsCreated: 0, patientsUpdated: 0, observationsWritten: 0, errors: [], completenessErrors: [] };

  // AUDIT-193 completeness guard (computed ONCE, whole-extract - the deactivate-diff is an extract-level concern,
  // not per-batch). The deactivate-diff runs ONLY in full-snapshot mode AND when the extract is not truncated.
  // STOP-parse (explicit end dates) runs in BOTH modes regardless - an explicit STOP is unambiguous.
  let canDeactivate = extractMode === 'full';
  if (canDeactivate) {
    const distinctNew = new Set(
      rows.map((r) => r.data.patient_id).filter((x): x is string => typeof x === 'string' && x.length > 0),
    ).size;
    const storedCount = await prisma.patient.count({ where: { hospitalId } });
    if (storedCount > 0 && distinctNew < COMPLETENESS_MIN_FRACTION * storedCount) {
      // Fail loud: the extract has far fewer patients than are stored -> likely truncated/failed export. Abort the
      // deactivate-diff to avoid mass false-deactivation; STOP-parse still applies. Surfaced, never silent.
      canDeactivate = false;
      result.completenessErrors.push({
        hospitalId,
        message: `IngestCompletenessError: extract has ${distinctNew} distinct patients, below ${Math.round(COMPLETENESS_MIN_FRACTION * 100)}% of the ${storedCount} stored for this tenant. Deactivate-diff ABORTED (fail-loud) to avoid mass false-deactivation on a truncated extract; explicit-STOP deactivation still applied.`,
      });
    }
  }

  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    const batch = rows.slice(i, i + WRITE_BATCH);
    try {
      await writeBatch(batch, hospitalId, result, canDeactivate);
    } catch (err) {
      // Batch-level isolation: a malformed row fails its 500-row batch (coarser than per-row), recorded here;
      // the ingest continues with the next batch (the snapshot + fresh-tenant model bound the blast radius).
      result.errors.push({ patientId: `batch@${i}`, error: (err as Error).message });
    }
  }
  return result;
}

/** Write one sub-batch of patients + their conditions/medications/observations via createMany (guard-exempt),
 *  with hospitalId-scoped lookup/update for the re-ingest path. */
async function writeBatch(batch: ParsedRow[], hospitalId: string, result: WriteResult, canDeactivate: boolean): Promise<void> {
  const valid = batch.filter((r) => typeof r.data.patient_id === 'string' && (r.data.patient_id as string).length > 0);
  if (valid.length === 0) return;
  const mrns = [...new Set(valid.map((r) => r.data.patient_id as string))];

  // 1. Existing-patient lookup (hospitalId in where -> guard passes; one round-trip for the whole batch).
  const existing = await prisma.patient.findMany({
    where: { hospitalId, mrn: { in: mrns } },
    select: { id: true, mrn: true },
  });
  const idByMrn = new Map(existing.map((p) => [p.mrn, p.id]));
  const isReingest = existing.length > 0;

  // 2. Resolve each patient's db id; partition new (createMany) vs existing (batched lastAssessment update).
  const dbIdByMrn = new Map<string, string>();
  const newPatients: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; lastAssessment: Date | null }> = [];
  for (const r of valid) {
    const mrn = r.data.patient_id as string;
    if (dbIdByMrn.has(mrn)) continue; // de-dup within the batch
    const encDateStr = r.data.encounter_date as string | null;
    const lastAssessment = encDateStr ? new Date(encDateStr) : null;
    if (idByMrn.has(mrn)) {
      const id = idByMrn.get(mrn) as string;
      dbIdByMrn.set(mrn, id);
      updates.push({ id, lastAssessment });
    } else {
      const id = deterministicPatientId(hospitalId, mrn);
      dbIdByMrn.set(mrn, id);
      const age = r.data.age as number | null;
      const estimatedDob = age !== null ? new Date(new Date().getFullYear() - age, 0, 1) : new Date('1970-01-01');
      newPatients.push({
        id, mrn, hospitalId,
        firstName: 'Patient', lastName: mrn,
        dateOfBirth: estimatedDob.toISOString(),
        gender: mapGender(r.data.sex as string),
        riskCategory: 'MODERATE',
        lastAssessment,
      });
    }
  }

  // 3. New patients via createMany (guard-EXEMPT create; tenant-safe via hospitalId in data).
  if (newPatients.length > 0) {
    const c = await prisma.patient.createMany({ data: newPatients as any, skipDuplicates: true });
    result.patientsCreated += c.count;
  }
  // 4. Re-ingest: existing patients' lastAssessment is per-row -> batch the updates in ONE $transaction
  //    (bounded round-trips, NOT N serial). Each updateMany carries hospitalId in where -> guard passes.
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.patient.updateMany({ where: { id: u.id, hospitalId }, data: { lastAssessment: u.lastAssessment } }),
      ),
    );
    result.patientsUpdated += updates.length;
  }

  // 5. Build child rows (Conditions / Medications / Observations) across the whole batch.
  const conditions: Array<Record<string, unknown>> = [];
  const meds: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  for (const r of valid) {
    const pid = dbIdByMrn.get(r.data.patient_id as string) as string;
    const encDateStr = r.data.encounter_date as string | null;
    const onsetDate = encDateStr ? new Date(encDateStr) : new Date();

    // Conditions: primary + secondary diagnoses (deduped per patient). Deterministic id -> idempotent re-ingest.
    // AUDIT-193: a dx with a STOP date (from condition_records) is written RESOLVED + abatementDate; else ACTIVE.
    const dxSet = new Set<string>();
    const primaryDx = r.data.primary_diagnosis;
    if (typeof primaryDx === 'string' && primaryDx) dxSet.add(primaryDx);
    const secondaryDx = r.data.secondary_diagnoses;
    if (Array.isArray(secondaryDx)) for (const dx of secondaryDx) if (typeof dx === 'string' && dx) dxSet.add(dx);
    const condStopByDx = new Map<string, string | null>();
    const condRecords = r.data.condition_records;
    if (Array.isArray(condRecords)) {
      for (const cr of condRecords as ConditionRecord[]) {
        if (cr && typeof cr === 'object' && typeof cr.icd10Code === 'string') condStopByDx.set(cr.icd10Code, cr.stopDate ?? null);
      }
    }
    for (const dx of dxSet) {
      const stop = condStopByDx.get(dx) ?? null;
      const resolved = stop !== null;
      conditions.push({
        id: `${pid}-${dx}`, patientId: pid, hospitalId,
        conditionName: dx, icd10Code: dx,
        category: ConditionCategory.ENCOUNTER_DIAGNOSIS,
        clinicalStatus: resolved ? ConditionClinicalStatus.RESOLVED : ConditionClinicalStatus.ACTIVE,
        verificationStatus: ConditionVerificationStatus.CONFIRMED,
        onsetDate,
        abatementDate: resolved ? new Date(stop as string) : null,
      });
    }

    // Observations: lab/vital/echo slugs + the coded valve_severity. Deterministic id keyed on
    // (patient, slug, date) -> a new dated value appends (time-series; the gap runner reads latest), the same
    // value is idempotent on re-ingest. Date prefers the slug's _date, falls back to encounter_date (stable).
    for (const field of LAB_FIELDS) {
      const value = r.data[field];
      if (value === null || value === undefined) continue;
      const slugDateStr = (r.data[`${field}_date`] as string | null) || encDateStr || '';
      const observedDateTime = slugDateStr ? new Date(slugDateStr) : new Date();
      const category: ObservationCategory = ECHO_FIELDS.has(field)
        ? 'IMAGING'
        : field === 'kccq_score' ? 'SURVEY' : 'LABORATORY';
      observations.push({
        id: `${pid}-${field}-${slugDateStr}`, patientId: pid, hospitalId,
        observationType: field, observationName: getObservationName(field), category,
        valueNumeric: value as number, unit: getUnit(field), observedDateTime,
      });
    }
    const severityRaw = r.data['valve_severity'];
    const severityOrdinal = encodeValveSeverity(severityRaw == null ? null : String(severityRaw));
    if (severityOrdinal !== null) {
      const sevDateStr = (r.data['last_echo_date'] as string | null) || encDateStr || '';
      observations.push({
        id: `${pid}-valve_severity-${sevDateStr}`, patientId: pid, hospitalId,
        observationType: 'valve_severity', observationName: getObservationName('valve_severity'),
        category: 'IMAGING' as ObservationCategory,
        valueNumeric: severityOrdinal, unit: getUnit('valve_severity'),
        observedDateTime: sevDateStr ? new Date(sevDateStr) : new Date(),
      });
    }

    // Medications: one row per drug (deduped). Deterministic id -> idempotent re-ingest.
    // AUDIT-193: a med with a STOP date is written DISCONTINUED + endDate; else ACTIVE.
    const medRecords = r.data.medication_records;
    if (Array.isArray(medRecords)) {
      const seenRx = new Set<string>();
      for (const m of medRecords as MedicationRecord[]) {
        if (!m || typeof m !== 'object' || !m.rxNormCode || seenRx.has(m.rxNormCode)) continue;
        seenRx.add(m.rxNormCode);
        const stop = m.stopDate ?? null;
        const discontinued = stop !== null;
        meds.push({
          id: `${pid}-rx-${m.rxNormCode}`, patientId: pid, hospitalId,
          medicationName: m.medicationName || m.rxNormCode, rxNormCode: m.rxNormCode,
          status: discontinued ? MedicationStatus.DISCONTINUED : MedicationStatus.ACTIVE,
          startDate: m.startDate ? new Date(m.startDate) : null,
          endDate: discontinued ? new Date(stop as string) : null,
        });
      }
    }
  }

  // 6. Bulk insert child rows via createMany (guard-EXEMPT; skipDuplicates -> idempotent re-ingest of net-new).
  if (conditions.length > 0) {
    const c = await prisma.condition.createMany({ data: conditions as any, skipDuplicates: true });
    result.observationsWritten += c.count;
  }
  if (meds.length > 0) {
    const c = await prisma.medication.createMany({ data: meds as any, skipDuplicates: true });
    result.observationsWritten += c.count;
  }
  if (observations.length > 0) {
    const c = await prisma.observation.createMany({ data: observations as any, skipDuplicates: true });
    result.observationsWritten += c.count;
  }

  // 7. Re-ingest STATUS-CHANGE pass (AUDIT-193; ONLY when patients pre-existed). createMany(skipDuplicates)
  //    inserts net-new rows but SKIPS existing ids, so existing rows keep their prior status. This pass updates
  //    them, split by the status we built from STOP: rows still present-and-ongoing -> re-affirm ACTIVE (clear
  //    any prior end date); rows present-with-a-STOP -> DISCONTINUED/RESOLVED + end/abatement date. All bounded:
  //    ONE updateMany for the uniform ACTIVE set, ONE $transaction of updateMany for the per-row-dated ended set
  //    (mirrors the step-4 lastAssessment pattern - one round-trip, NOT N serial). Skipped on a fresh tenant.
  if (isReingest) {
    // Conditions: partition the built rows by clinicalStatus.
    const condActiveIds = conditions.filter((c) => c.clinicalStatus === ConditionClinicalStatus.ACTIVE).map((c) => c.id as string);
    const condEnded = conditions.filter((c) => c.clinicalStatus === ConditionClinicalStatus.RESOLVED);
    if (condActiveIds.length > 0) {
      await prisma.condition.updateMany({
        where: { id: { in: condActiveIds }, hospitalId },
        data: { clinicalStatus: ConditionClinicalStatus.ACTIVE, abatementDate: null },
      });
    }
    if (condEnded.length > 0) {
      await prisma.$transaction(
        condEnded.map((c) =>
          prisma.condition.updateMany({
            where: { id: c.id as string, hospitalId },
            data: { clinicalStatus: ConditionClinicalStatus.RESOLVED, abatementDate: c.abatementDate as Date | null },
          }),
        ),
      );
    }
    // Medications: partition the built rows by status.
    const medActiveIds = meds.filter((m) => m.status === MedicationStatus.ACTIVE).map((m) => m.id as string);
    const medEnded = meds.filter((m) => m.status === MedicationStatus.DISCONTINUED);
    if (medActiveIds.length > 0) {
      await prisma.medication.updateMany({
        where: { id: { in: medActiveIds }, hospitalId },
        data: { status: MedicationStatus.ACTIVE, endDate: null },
      });
    }
    if (medEnded.length > 0) {
      await prisma.$transaction(
        medEnded.map((m) =>
          prisma.medication.updateMany({
            where: { id: m.id as string, hospitalId },
            data: { status: MedicationStatus.DISCONTINUED, endDate: m.endDate as Date | null },
          }),
        ),
      );
    }

    // 8. Deactivate-diff (AUDIT-193; GUARDED - only when canDeactivate = full-snapshot mode AND the completeness
    //    band passed). For patients PRESENT in this batch (per-patient scoping: an entirely-absent patient is
    //    never processed, so their rows are never touched), find their existing ACTIVE rows whose id is NOT in
    //    the new extract -> deactivate (the row dropped off the active list). INACTIVE (not RESOLVED) since there
    //    is no explicit resolution date - it just left the snapshot. Two findMany + two updateMany (bounded).
    if (canDeactivate) {
      const presentPatientIds = [...idByMrn.values()];
      if (presentPatientIds.length > 0) {
        const newCondIds = new Set(conditions.map((c) => c.id as string));
        const newMedIds = new Set(meds.map((m) => m.id as string));
        const existingActiveConds = await prisma.condition.findMany({
          where: { hospitalId, patientId: { in: presentPatientIds }, clinicalStatus: ConditionClinicalStatus.ACTIVE },
          select: { id: true },
        });
        const absentCondIds = existingActiveConds.map((c) => c.id).filter((id) => !newCondIds.has(id));
        if (absentCondIds.length > 0) {
          await prisma.condition.updateMany({
            where: { id: { in: absentCondIds }, hospitalId },
            data: { clinicalStatus: ConditionClinicalStatus.INACTIVE },
          });
        }
        const existingActiveMeds = await prisma.medication.findMany({
          where: { hospitalId, patientId: { in: presentPatientIds }, status: MedicationStatus.ACTIVE },
          select: { id: true },
        });
        const absentMedIds = existingActiveMeds.map((m) => m.id).filter((id) => !newMedIds.has(id));
        if (absentMedIds.length > 0) {
          await prisma.medication.updateMany({
            where: { id: { in: absentMedIds }, hospitalId },
            data: { status: MedicationStatus.DISCONTINUED },
          });
        }
      }
    }
  }
}

function mapGender(sex: string | null): Gender {
  if (!sex) return Gender.UNKNOWN;
  const s = sex.toUpperCase();
  if (s === 'M' || s === 'MALE') return Gender.MALE;
  if (s === 'F' || s === 'FEMALE') return Gender.FEMALE;
  return Gender.OTHER;
}

// Ordinal encoding of the coded valve_severity grade (operator clinical sign-off 2026-06-17).
// GRADE-PRESERVING 0-5 scale: each half-grade is a DISTINCT ordinal (NOT round-collapsed), so each SH/VHD gap
// can set its own clinically-correct threshold during authoring - severe-only = >=5; severe-or-moderate-severe
// = >=4; moderate-or-worse = >=3. Distinct from mitral_regurg_grade's standard 0-4 MR scale (read the right
// threshold per field).
//   none/trivial/trace -> 0 | mild -> 1 | mild-moderate -> 2 | moderate -> 3 | moderate-severe -> 4 | severe/torrential -> 5
// Unrecognized -> null (treated as absent / Path-B, never mis-encoded - the AUDIT-070 no-guess discipline).
export function encodeValveSeverity(raw: string | null): number | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (s === '') return null;
  const map: Record<string, number> = {
    none: 0, trivial: 0, trace: 0,
    mild: 1,
    'mild-moderate': 2, 'mild to moderate': 2,
    moderate: 3,
    'moderate-severe': 4, 'moderate to severe': 4,
    severe: 5, torrential: 5,
  };
  return s in map ? map[s] : null;
}

function getUnit(field: string): string {
  const units: Record<string, string> = {
    lvef: '%',
    aortic_valve_vmax: 'm/s',
    aortic_valve_mean_gradient: 'mmHg',
    aortic_valve_area: 'cm2',
    mitral_regurg_grade: 'grade',
    sts_score: '%',
    valve_severity: 'grade',
    bnp: 'pg/mL',
    nt_probnp: 'pg/mL',
    ferritin: 'ng/mL',
    tsat: '%',
    sodium: 'mEq/L',
    potassium: 'mEq/L',
    egfr: 'mL/min/1.73m2',
    bmi: 'kg/m2',
    ldl: 'mg/dL',
    lpa: 'nmol/L',
    triglycerides: 'mg/dL',
    qtc_interval: 'ms',
    qrs_duration: 'ms',
    kccq_score: 'points',
    abi_right: 'ratio',
    abi_left: 'ratio',
    apob: 'mg/dL',
    tr_regurg_grade: 'grade',
    tr_regurg_vmax: 'm/s',
    mitral_vena_contracta: 'cm',
    aortic_vena_contracta: 'cm',
    tricuspid_vena_contracta: 'cm',
    mitral_eroa: 'cm2',
    pasp: 'mmHg',
    ascending_aorta: 'cm',
    inr: 'ratio',
    // Hollow-DET_OK repair (AUDIT-184)
    heart_rate: 'bpm', systolic_bp: 'mmHg', diastolic_bp: 'mmHg', hemoglobin: 'g/dL', hba1c: '%', tsh: 'mIU/L', creatinine: 'mg/dL',
    crp: 'mg/L', hs_crp: 'mg/L', alt: 'U/L', ast: 'U/L',
    cac_score: 'Agatston', stress_test_months: 'months', ccta: 'present', graft_duplex_months: 'months',
    lvesd: 'mm',
    tapse: 'mm', fac: '%', vegetation_size: 'mm', anti_xa: 'U/mL',
  };
  return units[field] || '';
}

function getObservationName(field: string): string {
  const names: Record<string, string> = {
    lvef: 'Left Ventricular Ejection Fraction',
    aortic_valve_vmax: 'Aortic Valve Peak Velocity (Vmax)',
    aortic_valve_mean_gradient: 'Aortic Valve Mean Gradient',
    aortic_valve_area: 'Aortic Valve Area',
    mitral_regurg_grade: 'Mitral Regurgitation Grade',
    sts_score: 'STS Risk Score',
    valve_severity: 'Valve Severity (ordinal grade)',
    bnp: 'B-type Natriuretic Peptide',
    nt_probnp: 'NT-proBNP',
    ferritin: 'Ferritin',
    tsat: 'Transferrin Saturation',
    sodium: 'Sodium',
    potassium: 'Potassium',
    egfr: 'Estimated GFR',
    bmi: 'Body Mass Index',
    ldl: 'LDL Cholesterol',
    lpa: 'Lipoprotein(a)',
    triglycerides: 'Triglycerides',
    qtc_interval: 'QTc Interval',
    qrs_duration: 'QRS Duration',
    kccq_score: 'KCCQ-12 Score',
    abi_right: 'Ankle-Brachial Index (Right)',
    abi_left: 'Ankle-Brachial Index (Left)',
    apob: 'Apolipoprotein B',
    tr_regurg_grade: 'Tricuspid Regurgitation Grade',
    tr_regurg_vmax: 'Tricuspid Regurgitation Peak Velocity',
    mitral_vena_contracta: 'Mitral Vena Contracta Diameter',
    aortic_vena_contracta: 'Aortic Vena Contracta Diameter',
    tricuspid_vena_contracta: 'Tricuspid Vena Contracta Diameter',
    mitral_eroa: 'Mitral Effective Regurgitant Orifice Area',
    pasp: 'Pulmonary Artery Systolic Pressure',
    ascending_aorta: 'Ascending Aorta Diameter',
    inr: 'International Normalized Ratio (INR)',
    // Hollow-DET_OK repair (AUDIT-184)
    heart_rate: 'Heart Rate', systolic_bp: 'Systolic Blood Pressure', diastolic_bp: 'Diastolic Blood Pressure',
    hemoglobin: 'Hemoglobin', hba1c: 'Hemoglobin A1c', tsh: 'Thyrotropin (TSH)',
    creatinine: 'Creatinine', crp: 'C-Reactive Protein', hs_crp: 'High-Sensitivity CRP',
    alt: 'Alanine Aminotransferase (ALT)', ast: 'Aspartate Aminotransferase (AST)',
    cac_score: 'Coronary Artery Calcium Score (Agatston)', stress_test_months: 'Months Since Stress Test',
    ccta: 'Coronary CT Angiography (presence)', graft_duplex_months: 'Months Since Graft Duplex',
    lvesd: 'LV End-Systolic Dimension',
    tapse: 'Tricuspid Annular Plane Systolic Excursion (TAPSE)', fac: 'RV Fractional Area Change',
    vegetation_size: 'Endocarditis Vegetation Size', anti_xa: 'Heparin Anti-Xa Activity',
  };
  return names[field] || field;
}
