import prisma from '../lib/prisma';
import { ParsedRow } from './csvParser';
import { Gender, ObservationCategory, ConditionCategory, ConditionClinicalStatus, ConditionVerificationStatus } from '@prisma/client';

export interface WriteResult {
  patientsCreated: number;
  patientsUpdated: number;
  observationsWritten: number;
  errors: Array<{ patientId: string; error: string }>;
}

export async function writePatients(
  rows: ParsedRow[],
  hospitalId: string,
  _uploadJobId: string,
  _moduleId: string,
): Promise<WriteResult> {
  const result: WriteResult = { patientsCreated: 0, patientsUpdated: 0, observationsWritten: 0, errors: [] };

  for (const row of rows) {
    const patientId = row.data.patient_id as string;
    if (!patientId) continue;

    try {
      // Look up existing patient by MRN within this hospital
      const existing = await prisma.patient.findUnique({
        where: { hospitalId_mrn: { hospitalId, mrn: patientId } },
      });

      const age = row.data.age as number | null;
      const encounterDateStr = row.data.encounter_date as string | null;

      // Estimate dateOfBirth from age (fallback: use 1970-01-01 if no age)
      const estimatedDob = age !== null
        ? new Date(new Date().getFullYear() - age, 0, 1)
        : new Date('1970-01-01');

      const patientData = {
        mrn: patientId,
        hospitalId,
        firstName: 'Patient',
        lastName: patientId,
        dateOfBirth: estimatedDob.toISOString(),
        gender: mapGender(row.data.sex as string),
        riskCategory: 'MODERATE' as const,
        lastAssessment: encounterDateStr ? new Date(encounterDateStr) : null,
      };

      let dbPatient;
      if (existing) {
        dbPatient = await prisma.patient.update({
          where: { id: existing.id },
          data: {
            lastAssessment: patientData.lastAssessment,
          },
        });
        result.patientsUpdated++;
      } else {
        dbPatient = await prisma.patient.create({
          data: patientData,
        });
        result.patientsCreated++;
      }

      // Write primary diagnosis as a Condition
      const primaryDx = row.data.primary_diagnosis as string;
      if (primaryDx) {
        const conditionId = `${dbPatient.id}-${primaryDx}`;
        await prisma.condition.upsert({
          where: { id: conditionId },
          update: { clinicalStatus: ConditionClinicalStatus.ACTIVE },
          create: {
            id: conditionId,
            patientId: dbPatient.id,
            hospitalId,
            conditionName: primaryDx,
            icd10Code: primaryDx,
            category: ConditionCategory.ENCOUNTER_DIAGNOSIS,
            clinicalStatus: ConditionClinicalStatus.ACTIVE,
            verificationStatus: ConditionVerificationStatus.CONFIRMED,
            onsetDate: encounterDateStr ? new Date(encounterDateStr) : new Date(),
          },
        });
        result.observationsWritten++;
      }

      // Write lab observations (batched to avoid N+1)
      // ECHO_FIELDS (v3.0 echo-severity threading, 2026-06-17): valve-severity numerics from csvSchema
      // SH_COLUMNS. Previously parsed + validated by csvParser then SILENTLY DROPPED here (AUDIT-165) -
      // now persisted as IMAGING observations so the engine's labValues can read them by slug. The 365-day
      // echo-freshness window is applied in the gap runners' IMAGING_TYPES (NOT here).
      const ECHO_FIELDS = new Set([
        'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade',
        'sts_score', 'valve_severity',
        // TR + vena-contracta numerics (v3.0 SH chunk 3)
        'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
        // chunk-3 acceptance + chunk-4 path-prep: MR/PASP CSV-path consistency + ascending aorta dimension
        'mitral_eroa', 'pasp', 'ascending_aorta',
      ]);
      const labFields = [
        'lvef', 'bnp', 'nt_probnp', 'ferritin', 'tsat', 'sodium', 'potassium', 'egfr',
        'ldl', 'lpa', 'triglycerides', 'qtc_interval', 'qrs_duration', 'kccq_score',
        'abi_right', 'abi_left',
        'inr', // coag lab - mechanical-valve / LVAD / AF anticoag (AUDIT-170 INR slug-fix, CSV path)
        // echo-severity numerics (AUDIT-165 remediation)
        'aortic_valve_vmax', 'aortic_valve_mean_gradient', 'aortic_valve_area', 'mitral_regurg_grade', 'sts_score',
        // TR + vena-contracta numerics (v3.0 SH chunk 3)
        'tr_regurg_grade', 'tr_regurg_vmax', 'mitral_vena_contracta', 'aortic_vena_contracta', 'tricuspid_vena_contracta',
        // chunk-3 acceptance + chunk-4 path-prep
        'mitral_eroa', 'pasp', 'ascending_aorta',
      ];
      const observationBatch: any[] = [];
      for (const field of labFields) {
        const value = row.data[field];
        if (value !== null && value !== undefined) {
          const dateFieldKey = `${field}_date`;
          const effectiveDateStr = row.data[dateFieldKey] as string | null;
          const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
          const category: ObservationCategory = ECHO_FIELDS.has(field)
            ? 'IMAGING'
            : field === 'kccq_score' ? 'SURVEY' : 'LABORATORY';

          observationBatch.push({
            patientId: dbPatient.id,
            hospitalId,
            observationType: field,
            observationName: getObservationName(field),
            category,
            valueNumeric: value as number,
            unit: getUnit(field),
            observedDateTime: effectiveDate,
          });
        }
      }
      // valve_severity: a coded grade string. Ordinal-encode to the grade-preserving 0-5 scale and persist as
      // valueNumeric (design option A - zero engine-signature ripple). The engine reads labValues['valve_severity']
      // >= 5 for severe (>= 4 includes moderate-severe; >= 3 is moderate-or-worse). valueText is NOT threaded.
      const severityRaw = row.data['valve_severity'];
      const severityOrdinal = encodeValveSeverity(severityRaw == null ? null : String(severityRaw));
      if (severityOrdinal !== null) {
        const sevDateStr = row.data['last_echo_date'] as string | null;
        observationBatch.push({
          patientId: dbPatient.id,
          hospitalId,
          observationType: 'valve_severity',
          observationName: getObservationName('valve_severity'),
          category: 'IMAGING' as ObservationCategory,
          valueNumeric: severityOrdinal,
          unit: getUnit('valve_severity'),
          observedDateTime: sevDateStr ? new Date(sevDateStr) : new Date(),
        });
      }
      if (observationBatch.length > 0) {
        await prisma.observation.createMany({ data: observationBatch });
        result.observationsWritten += observationBatch.length;
      }
    } catch (err) {
      result.errors.push({ patientId, error: (err as Error).message });
    }
  }

  return result;
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
    ldl: 'mg/dL',
    lpa: 'nmol/L',
    triglycerides: 'mg/dL',
    qtc_interval: 'ms',
    qrs_duration: 'ms',
    kccq_score: 'points',
    abi_right: 'ratio',
    abi_left: 'ratio',
    tr_regurg_grade: 'grade',
    tr_regurg_vmax: 'm/s',
    mitral_vena_contracta: 'cm',
    aortic_vena_contracta: 'cm',
    tricuspid_vena_contracta: 'cm',
    mitral_eroa: 'cm2',
    pasp: 'mmHg',
    ascending_aorta: 'cm',
    inr: 'ratio',
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
    ldl: 'LDL Cholesterol',
    lpa: 'Lipoprotein(a)',
    triglycerides: 'Triglycerides',
    qtc_interval: 'QTc Interval',
    qrs_duration: 'QRS Duration',
    kccq_score: 'KCCQ-12 Score',
    abi_right: 'Ankle-Brachial Index (Right)',
    abi_left: 'Ankle-Brachial Index (Left)',
    tr_regurg_grade: 'Tricuspid Regurgitation Grade',
    tr_regurg_vmax: 'Tricuspid Regurgitation Peak Velocity',
    mitral_vena_contracta: 'Mitral Vena Contracta Diameter',
    aortic_vena_contracta: 'Aortic Vena Contracta Diameter',
    tricuspid_vena_contracta: 'Tricuspid Vena Contracta Diameter',
    mitral_eroa: 'Mitral Effective Regurgitant Orifice Area',
    pasp: 'Pulmonary Artery Systolic Pressure',
    ascending_aorta: 'Ascending Aorta Diameter',
    inr: 'International Normalized Ratio (INR)',
  };
  return names[field] || field;
}
