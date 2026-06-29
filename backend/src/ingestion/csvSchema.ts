export interface CSVColumn {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'icd10' | 'cpt' | 'rxnorm' | 'pipe_delimited';
  validation?: { min?: number; max?: number; pattern?: RegExp };
}

export const COMMON_COLUMNS: CSVColumn[] = [
  { name: 'patient_id', required: true, type: 'string' },
  { name: 'age', required: true, type: 'number', validation: { min: 0, max: 120 } },
  { name: 'sex', required: true, type: 'string' },
  { name: 'encounter_date', required: true, type: 'date' },
  { name: 'encounter_type', required: false, type: 'string' },
  { name: 'primary_diagnosis', required: true, type: 'icd10' },
  { name: 'secondary_diagnoses', required: false, type: 'pipe_delimited' },
  { name: 'procedures', required: false, type: 'pipe_delimited' },
  { name: 'medications', required: false, type: 'pipe_delimited' },
  // Hollow-DET_OK repair (AUDIT-184, 2026-06-19): cross-module labs/vitals + derived values the DET_OK rules gate
  // on but were threaded in NEITHER path. COMMON so every module CSV carries them; the 12 labs/vitals are also
  // FHIR-mapped (observationService, NLM-verified LOINCs). cac_score/stress_test_months/ccta/graft_duplex_months
  // are CSV-only (derived/temporal/presence; no verifiable observation LOINC, per the LVESD no-guess rule).
  { name: 'heart_rate', required: false, type: 'number', validation: { min: 0, max: 300 } },
  { name: 'systolic_bp', required: false, type: 'number', validation: { min: 0, max: 300 } },
  { name: 'diastolic_bp', required: false, type: 'number', validation: { min: 0, max: 200 } },
  { name: 'hemoglobin', required: false, type: 'number', validation: { min: 0, max: 25 } },
  { name: 'hba1c', required: false, type: 'number', validation: { min: 0, max: 20 } },
  { name: 'tsh', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'creatinine', required: false, type: 'number', validation: { min: 0, max: 20 } },
  { name: 'crp', required: false, type: 'number', validation: { min: 0, max: 500 } },
  { name: 'hs_crp', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'alt', required: false, type: 'number', validation: { min: 0, max: 5000 } },
  { name: 'ast', required: false, type: 'number', validation: { min: 0, max: 5000 } },
  { name: 'cac_score', required: false, type: 'number', validation: { min: 0, max: 10000 } },
  { name: 'stress_test_months', required: false, type: 'number', validation: { min: 0, max: 600 } },
  { name: 'ccta', required: false, type: 'number', validation: { min: 0, max: 1 } },
  { name: 'graft_duplex_months', required: false, type: 'number', validation: { min: 0, max: 600 } },
  // T1-broader LVESD batch (2026-06-22): LV end-systolic dimension (mm). CSV-only - NLM could not verify a clean
  // LOINC for LVESD, so per the no-guess rule the FHIR map is omitted (same pattern as cac_score). Gates the
  // severe-MR (>=40), severe-AR (>=50), and COAPT-TEER (<=70) surgical/eligibility thresholds.
  { name: 'lvesd', required: false, type: 'number', validation: { min: 0, max: 120 } },
];

export const HF_COLUMNS: CSVColumn[] = [
  { name: 'lvef', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'lvef_date', required: false, type: 'date' },
  { name: 'nyha_class', required: false, type: 'number', validation: { min: 1, max: 4 } },
  { name: 'bnp', required: false, type: 'number', validation: { min: 0, max: 100000 } },
  { name: 'nt_probnp', required: false, type: 'number', validation: { min: 0, max: 500000 } },
  { name: 'ferritin', required: false, type: 'number' },
  { name: 'tsat', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'sodium', required: false, type: 'number', validation: { min: 100, max: 180 } },
  { name: 'potassium', required: false, type: 'number', validation: { min: 1, max: 10 } },
  { name: 'egfr', required: false, type: 'number', validation: { min: 0, max: 200 } },
  { name: 'kccq_score', required: false, type: 'number', validation: { min: 0, max: 100 } },
];

export const EP_COLUMNS: CSVColumn[] = [
  { name: 'rhythm', required: false, type: 'string' },
  { name: 'qtc_interval', required: false, type: 'number', validation: { min: 200, max: 800 } },
  { name: 'qrs_duration', required: false, type: 'number', validation: { min: 50, max: 300 } },
  { name: 'device_type', required: false, type: 'string' },
  { name: 'device_implant_date', required: false, type: 'date' },
  { name: 'chadsvasc_score', required: false, type: 'number', validation: { min: 0, max: 9 } },
];

export const CAD_COLUMNS: CSVColumn[] = [
  { name: 'syntax_score', required: false, type: 'number' },
  { name: 'lvef', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'last_pci_date', required: false, type: 'date' },
  { name: 'ldl', required: false, type: 'number' },
  { name: 'lpa', required: false, type: 'number' },
  { name: 'triglycerides', required: false, type: 'number' },
  { name: 'apob', required: false, type: 'number' },
];

export const SH_COLUMNS: CSVColumn[] = [
  { name: 'aortic_valve_vmax', required: false, type: 'number' },
  { name: 'aortic_valve_mean_gradient', required: false, type: 'number' },
  { name: 'aortic_valve_area', required: false, type: 'number' },
  { name: 'mitral_regurg_grade', required: false, type: 'number', validation: { min: 0, max: 4 } },
  { name: 'sts_score', required: false, type: 'number' },
  // TR + vena-contracta (v3.0 SH chunk 3). tr_regurg_grade is a 0-4 numeric TR grade (4 = severe),
  // mirroring mitral_regurg_grade; the coded valve_severity (0-5) is the cross-valve fallback.
  { name: 'tr_regurg_grade', required: false, type: 'number', validation: { min: 0, max: 4 } },
  { name: 'tr_regurg_vmax', required: false, type: 'number' },
  { name: 'mitral_vena_contracta', required: false, type: 'number' },
  { name: 'aortic_vena_contracta', required: false, type: 'number' },
  { name: 'tricuspid_vena_contracta', required: false, type: 'number' },
  // Chunk-2 MR rules read these but the CSV path silently dropped them (AUDIT-165 class); mitral_eroa also
  // threads via FHIR (29448-8), pasp via neither until now. ascending_aorta added for chunk-4 aortic-dimension
  // gaps (already in the FHIR map 18012-5).
  { name: 'mitral_eroa', required: false, type: 'number' },
  { name: 'pasp', required: false, type: 'number' },
  { name: 'ascending_aorta', required: false, type: 'number' },
  // T1-broader PART 2 (2026-06-22): RV systolic function for the TR + RV-dysfunction gap (SH-024). tapse (mm) and
  // fac (RV fractional area change, %) are echo-derived - NLM has no clean simple-measurement LOINC, so CSV-only
  // per the no-guess rule (lvesd/cac_score pattern). TAPSE <17 mm / FAC <35% is the RV-systolic-dysfunction cut.
  { name: 'tapse', required: false, type: 'number', validation: { min: 0, max: 50 } },
  { name: 'fac', required: false, type: 'number', validation: { min: 0, max: 100 } },
];

export const PV_COLUMNS: CSVColumn[] = [
  { name: 'abi_right', required: false, type: 'number' },
  { name: 'abi_left', required: false, type: 'number' },
  { name: 'wound_present', required: false, type: 'boolean' },
  { name: 'wifi_score', required: false, type: 'string' },
];

export const VD_COLUMNS: CSVColumn[] = [
  { name: 'valve_lesion_type', required: false, type: 'string' },
  { name: 'valve_severity', required: false, type: 'string' },
  { name: 'last_echo_date', required: false, type: 'date' },
  { name: 'surgical_risk', required: false, type: 'string' },
  // INR for mechanical-valve anticoagulation (AUDIT-170 slug-fix, CSV path). reaches labValues['inr'].
  { name: 'inr', required: false, type: 'number' },
  // T1-broader PART 2 (2026-06-22): vegetation_size (mm, TEE-derived -> CSV-only, no clean LOINC) gates the IE
  // large-vegetation surgical-consideration gap (VHD-060, >10 mm). anti_xa (Heparin anti-Xa activity, U/mL) gates
  // the mechanical-valve-pregnancy LMWH-monitoring gap (VHD-100, target 0.8-1.2); anti_xa is ALSO FHIR-mapped
  // (LOINC 31159-7, NLM exact-verified) in observationService - the one both-paths slug in this batch.
  { name: 'vegetation_size', required: false, type: 'number', validation: { min: 0, max: 80 } },
  { name: 'anti_xa', required: false, type: 'number', validation: { min: 0, max: 5 } },
];

export function getModuleColumns(moduleId: string): CSVColumn[] {
  const moduleMap: Record<string, CSVColumn[]> = {
    hf: HF_COLUMNS,
    ep: EP_COLUMNS,
    cad: CAD_COLUMNS,
    sh: SH_COLUMNS,
    pv: PV_COLUMNS,
    vd: VD_COLUMNS,
  };
  return [...COMMON_COLUMNS, ...(moduleMap[moduleId] || [])];
}

// ---------------------------------------------------------------------------
// PHASE 2: multi-file normalized (Epic-extract shape) per-entity input schemas.
//
// The single-file wide schema above (COMMON_COLUMNS + module columns) is the
// LEGACY denormalized upload path and is left intact. The schemas below describe
// the PRODUCTION client contract: a SET of normalized entity files (one per
// resource type), the shape Epic Clarity/Caboodle SQL extracts emit and the
// shape the S3 Synthea csv/ export already matches.
//
// Each entity file declares the code system its CODE column carries. SNOMED code
// columns are routed through snomedCrosswalk at parse time (Phase 1); ICD10
// columns (a real Epic ICD-10-CM feed) bypass the crosswalk. Header names here
// are the lowercased form the parser normalizes raw headers to (Synthea headers
// have no spaces, so this is a plain lowercase of the verified header).
// ---------------------------------------------------------------------------

/** The code system carried by an entity file's CODE column (drives crosswalk routing). */
export type EntityCodeSystem = 'SNOMED' | 'ICD10' | 'LOINC' | 'RxNorm' | 'CPT' | 'none';

/** One normalized entity file's input contract. */
export interface EntityFileSchema {
  /** Stable entity key used by the multi-file parser (also the MultiFileInput field name). */
  entity: 'patients' | 'conditions' | 'procedures' | 'observations' | 'medications' | 'encounters';
  /** Canonical file name in the extract set (for structured error messages). */
  fileName: string;
  /** Headers that MUST be present (lowercased). Missing any -> structured error, never a silent default. */
  requiredHeaders: string[];
  /** The column that joins this row to a patient (lowercased). For patients.csv this is the primary key. */
  patientIdColumn: string;
  /** The column carrying the clinical code, if any (lowercased). */
  codeColumn?: string;
  /** The code system of codeColumn; SNOMED is crosswalked, ICD10 bypasses, LOINC/RxNorm pass through by slug/raw. */
  codeSystem?: EntityCodeSystem;
}

export const PATIENTS_SCHEMA: EntityFileSchema = {
  entity: 'patients',
  fileName: 'patients.csv',
  requiredHeaders: ['id', 'birthdate', 'gender'],
  patientIdColumn: 'id',
};

export const CONDITIONS_SCHEMA: EntityFileSchema = {
  entity: 'conditions',
  fileName: 'conditions.csv',
  requiredHeaders: ['patient', 'code', 'description'],
  patientIdColumn: 'patient',
  codeColumn: 'code',
  codeSystem: 'SNOMED', // Synthea conditions are SNOMED CT -> crosswalk to ICD-10-CM (Phase 1)
};

export const PROCEDURES_SCHEMA: EntityFileSchema = {
  entity: 'procedures',
  fileName: 'procedures.csv',
  requiredHeaders: ['patient', 'code', 'description'],
  patientIdColumn: 'patient',
  codeColumn: 'code',
  codeSystem: 'SNOMED', // Synthea procedures are SNOMED; NO authoritative SNOMED->CPT map -> procedure gaps under-fire (expected)
};

export const OBSERVATIONS_SCHEMA: EntityFileSchema = {
  entity: 'observations',
  fileName: 'observations.csv',
  requiredHeaders: ['patient', 'code', 'value'],
  patientIdColumn: 'patient',
  codeColumn: 'code',
  codeSystem: 'LOINC', // mapped onto engine lab slugs via ECHO_LOINC_TO_SLUG (observationService bridge)
};

export const MEDICATIONS_SCHEMA: EntityFileSchema = {
  entity: 'medications',
  fileName: 'medications.csv',
  requiredHeaders: ['patient', 'code', 'description'],
  patientIdColumn: 'patient',
  codeColumn: 'code',
  codeSystem: 'RxNorm', // Synthea med CODE is RxNorm; the engine gates GDMT on RxNorm -> passes through raw
};

export const ENCOUNTERS_SCHEMA: EntityFileSchema = {
  entity: 'encounters',
  fileName: 'encounters.csv',
  requiredHeaders: ['patient', 'start'],
  patientIdColumn: 'patient',
  codeColumn: 'code',
  codeSystem: 'none', // encounter class code is not gated on; used only to source the latest encounter date
};

/** All entity schemas, keyed by entity. */
export const ENTITY_SCHEMAS: Record<EntityFileSchema['entity'], EntityFileSchema> = {
  patients: PATIENTS_SCHEMA,
  conditions: CONDITIONS_SCHEMA,
  procedures: PROCEDURES_SCHEMA,
  observations: OBSERVATIONS_SCHEMA,
  medications: MEDICATIONS_SCHEMA,
  encounters: ENCOUNTERS_SCHEMA,
};

/**
 * Entities REQUIRED for a meaningful gap-detection run. Absence of any of these is a structured
 * error (no silent default): patients is the demographic spine, conditions gate diagnosis-based
 * rules, observations carry the lab/echo values the rules threshold on. procedures, medications,
 * and encounters ENRICH but are optional - their absence is recorded as a structured warning.
 */
export const REQUIRED_ENTITIES: ReadonlyArray<EntityFileSchema['entity']> = ['patients', 'conditions', 'observations'];
export const OPTIONAL_ENTITIES: ReadonlyArray<EntityFileSchema['entity']> = ['procedures', 'medications', 'encounters'];
