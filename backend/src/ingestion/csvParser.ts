import {
  CSVColumn,
  getModuleColumns,
  EntityFileSchema,
  ENTITY_SCHEMAS,
  REQUIRED_ENTITIES,
  OPTIONAL_ENTITIES,
} from './csvSchema';
import { detectPHI, PHIDetectionResult } from './phiDetector';
import {
  resolveConditionIcd10,
  CrosswalkReporter,
  UnmappedReport,
  CodeSystem,
} from './snomedCrosswalk';
import { ECHO_LOINC_TO_SLUG } from '../services/observationService';

/**
 * A structured medication row carried from the multi-file path to patientWriter so the
 * RxNorm code, name, and start date persist as a Medication entity the gap engine reads.
 * (The single-file path does not emit this; patientWriter no-ops when it is absent.)
 */
export interface MedicationRecord {
  rxNormCode: string;       // Synthea medications.csv CODE (RxNorm) - what expandToIngredients consumes
  medicationName: string;   // medications.csv DESCRIPTION (falls back to the code if blank)
  startDate: string | null; // medications.csv START, if present
  // AUDIT-193: medications.csv STOP (discontinuation date). Optional field; absent/undefined/empty = ongoing.
  // Threaded so the writer can mark a discontinued med DISCONTINUED+endDate on re-ingest instead of re-affirming
  // it ACTIVE. Optional (not required) so the single-file path and the proof-script accumulator compile unchanged.
  stopDate?: string | null;
  // AUDIT-199-B (2026-07-09): the mg strength parsed out of medicationName (the DESCRIPTION), so the dose-aware
  // gap rules can discriminate on dose instead of degrading to agent_dose_unknown. Optional; null when the
  // DESCRIPTION carries no parseable single-agent strength. See parseDoseFromDescription.
  doseValue?: number | null;
  doseUnit?: string | null;
}

// AUDIT-199-B (2026-07-09): recognized single-agent statin ingredient names, used ONLY to decide whether a
// COMPOUND DESCRIPTION ("A MG / B MG") may safely yield its first strength token (see parseDoseFromDescription).
const STATIN_AGENT_NAME_RE = /(atorvastatin|rosuvastatin|simvastatin|pravastatin|lovastatin|pitavastatin|fluvastatin)/i;

/**
 * AUDIT-199-B (2026-07-09): parse the numeric mg strength out of a Synthea medications.csv DESCRIPTION
 * ("Atorvastatin 80 MG Oral Tablet" -> 80) so the dose-aware gap rules can discriminate on dose.
 *
 * SCOPED slice: only the statin (+DOAC) rules consume doseValue; the engine keeps BB-target / digoxin / ARNI
 * dose-unknown-suppressed pending their own follow-ons (AUDIT-199-B-BB / -DIG / -ARNI).
 *
 * Handling:
 *   - single "N MG"                  -> N (mg)                      [the statin / DOAC case]
 *   - "N MCG"                        -> N/1000 (normalize mcg -> mg)
 *   - COMPOUND "A MG / B MG"         -> the FIRST strength token ONLY IF the first agent (text before the
 *                                       first "/") is a recognized single-agent statin; otherwise null. This
 *                                       deliberately hands NO value to the ARNI rule (sacubitril/valsartan),
 *                                       which stays suppressed regardless, and avoids mis-assigning a
 *                                       non-statin component's strength (e.g. amlodipine in a Caduet combo).
 *   - no MG/MCG token                -> null
 * doseUnit is normalized to 'mg' whenever a value is returned (the engine's mg-threshold checks assume mg).
 */
export function parseDoseFromDescription(
  description: string | null | undefined,
): { doseValue: number | null; doseUnit: string | null } {
  if (!description) return { doseValue: null, doseUnit: null };
  const tokens = [...description.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\b/gi)];
  if (tokens.length === 0) return { doseValue: null, doseUnit: null };

  let chosen: RegExpMatchArray;
  if (tokens.length === 1) {
    chosen = tokens[0];
  } else {
    // Compound / multi-strength string: only accept the first token when the leading agent is a single-agent
    // statin (statins are single-strength; the compound-statin combos - Caduet, Vytorin - list the statin
    // SECOND, so they fall through to null and stay agent_dose_unknown -> suppressed, never wrong-fired).
    const firstAgent = description.split('/')[0];
    if (!STATIN_AGENT_NAME_RE.test(firstAgent)) return { doseValue: null, doseUnit: null };
    chosen = tokens[0];
  }

  let value = parseFloat(chosen[1]);
  if (!isFinite(value) || value <= 0) return { doseValue: null, doseUnit: null };
  if (chosen[2].toLowerCase() === 'mcg') value = value / 1000; // normalize mcg -> mg
  return { doseValue: value, doseUnit: 'mg' };
}

// AUDIT-193: one condition with its resolution signal. icd10Code is post-crosswalk (SNOMED -> ICD-10).
// stopDate = conditions.csv STOP (abatement/resolution date); absent/empty = ongoing.
export interface ConditionRecord {
  icd10Code: string;
  stopDate: string | null;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string | number | boolean | string[] | MedicationRecord[] | ConditionRecord[] | null>;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface ParseResult {
  validRows: ParsedRow[];
  errorRows: ParsedRow[];
  totalRows: number;
  phiResult: PHIDetectionResult;
  headerErrors: string[];
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function validateField(
  value: string,
  col: CSVColumn,
): { parsed: string | number | boolean | string[] | null; error?: string; warning?: string } {
  if (!value || value.trim() === '') {
    if (col.required) return { parsed: null, error: `Required field '${col.name}' is missing` };
    return { parsed: null };
  }
  const trimmed = value.trim();

  switch (col.type) {
    case 'number': {
      const num = parseFloat(trimmed);
      if (isNaN(num)) return { parsed: null, error: `'${col.name}' must be a number, got '${trimmed}'` };
      if (col.validation?.min !== undefined && num < col.validation.min)
        return { parsed: null, error: `'${col.name}' value ${num} below minimum ${col.validation.min}` };
      if (col.validation?.max !== undefined && num > col.validation.max)
        return { parsed: null, error: `'${col.name}' value ${num} above maximum ${col.validation.max}` };
      return { parsed: num };
    }
    case 'date': {
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return { parsed: null, error: `'${col.name}' invalid date: '${trimmed}'` };
      return { parsed: d.toISOString() };
    }
    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(lower)) return { parsed: true };
      if (['false', '0', 'no', 'n'].includes(lower)) return { parsed: false };
      return { parsed: null, error: `'${col.name}' must be boolean, got '${trimmed}'` };
    }
    case 'icd10': {
      if (!/^[A-Z]\d{2}(\.\d{1,4})?$/i.test(trimmed))
        return { parsed: trimmed.toUpperCase(), warning: `'${col.name}' may not be valid ICD-10: '${trimmed}'` };
      return { parsed: trimmed.toUpperCase() };
    }
    case 'pipe_delimited': {
      const items = trimmed
        .split('|')
        .map(s => s.trim())
        .filter(Boolean);
      return { parsed: items };
    }
    default:
      return { parsed: trimmed };
  }
}

export function parseCSV(content: string, moduleId: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0)
    return {
      validRows: [],
      errorRows: [],
      totalRows: 0,
      phiResult: { hasPHI: false, detections: [] },
      headerErrors: ['Empty file'],
    };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const columns = getModuleColumns(moduleId);

  // Check required headers
  const headerErrors: string[] = [];
  for (const col of columns) {
    if (col.required && !headers.includes(col.name)) {
      headerErrors.push(`Required column '${col.name}' not found in header`);
    }
  }

  // Parse data rows
  const rawRows = lines.slice(1).map(l => parseCSVLine(l));

  // PHI detection
  const phiResult = detectPHI(headers, rawRows);

  const validRows: ParsedRow[] = [];
  const errorRows: ParsedRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const parsed: ParsedRow = { rowNumber: i + 2, data: {}, errors: [], warnings: [] };

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const col = columns.find(c => c.name === header);
      if (!col) {
        parsed.data[header] = row[j] || null;
        continue;
      }

      const result = validateField(row[j] || '', col);
      parsed.data[col.name] = result.parsed;
      if (result.error) parsed.errors.push({ field: col.name, message: result.error });
      if (result.warning) parsed.warnings.push({ field: col.name, message: result.warning });
    }

    // Check required fields not in header
    for (const col of columns) {
      if (col.required && parsed.data[col.name] === undefined) {
        parsed.data[col.name] = null;
        parsed.errors.push({ field: col.name, message: `Required field '${col.name}' missing` });
      }
    }

    if (parsed.errors.length > 0) errorRows.push(parsed);
    else validRows.push(parsed);
  }

  return { validRows, errorRows, totalRows: rawRows.length, phiResult, headerErrors };
}

// ===========================================================================
// PHASE 2: multi-file normalized (Epic-extract shape) parser.
//
// Ingests a SET of normalized entity files (patients/conditions/procedures/
// observations/medications/encounters) instead of one wide denormalized CSV.
// It validates each file against its per-entity schema (csvSchema.ts), joins
// child rows to the patient spine by patient id, routes SNOMED condition codes
// through the Phase-1 crosswalk (ICD10 input bypasses), maps observation LOINC
// rows onto engine lab slugs via the observationService bridge, and assembles
// one ParsedRow per patient in the SAME row.data shape patientWriter consumes -
// so the writer needs only an additive secondary-diagnosis change, and the
// single-file path above is untouched.
// ===========================================================================

/** Raw CSV content for each normalized entity file. Only `patients` is structurally guaranteed. */
export interface MultiFileInput {
  patients: string;
  conditions?: string;
  procedures?: string;
  observations?: string;
  medications?: string;
  encounters?: string;
}

/** A single entity file parsed into normalized headers + raw cell rows. */
interface ParsedEntityFile {
  schema: EntityFileSchema;
  headers: string[];
  rows: string[][];
}

/** Per-file structured error (malformed / missing-required / header-mismatch). Never a silent default. */
export interface FileError {
  file: string;       // canonical file name, e.g. 'conditions.csv'
  entity: string;     // entity key
  message: string;
}

export interface MultiFileParseResult {
  validRows: ParsedRow[];              // one assembled patient row, SAME shape as the single-file path
  errorRows: ParsedRow[];              // patient rows that failed assembly (e.g. missing patient id)
  totalPatients: number;
  fileErrors: FileError[];             // structured per-file errors (missing required / malformed / bad header)
  fileWarnings: FileError[];           // structured per-file warnings (optional file absent)
  unmappedReport: UnmappedReport;      // SNOMED condition codes with no authoritative ICD-10 entry (recorded, not dropped)
  procedureCodesUntranslated: number;  // SNOMED procedure codes left raw (no authoritative SNOMED->CPT map)
  phiResult: PHIDetectionResult;       // PHI scan over the patients file
}

/** Lowercase + underscore a raw header, matching the single-file parser's normalization. */
function normalizeHeaders(headerLine: string): string[] {
  return parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/\s+/g, '_'));
}

/**
 * Validate one entity file's content against its schema. Returns the parsed file or a structured error.
 * A missing/empty file or a missing required header is an error, never a silent default.
 */
function validateEntityFile(content: string | undefined, schema: EntityFileSchema): {
  file?: ParsedEntityFile;
  error?: FileError;
} {
  if (content === undefined || content.trim() === '') {
    return { error: { file: schema.fileName, entity: schema.entity, message: `${schema.fileName} is empty or missing` } };
  }
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) {
    return { error: { file: schema.fileName, entity: schema.entity, message: `${schema.fileName} has no rows` } };
  }
  const headers = normalizeHeaders(lines[0]);
  const missing = schema.requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    return {
      error: {
        file: schema.fileName,
        entity: schema.entity,
        message: `${schema.fileName} missing required header(s): ${missing.join(', ')}`,
      },
    };
  }
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { file: { schema, headers, rows } };
}

/** Index a parsed entity file's rows by patient id (the schema's patientIdColumn). */
function indexByPatient(file: ParsedEntityFile): Map<string, Record<string, string>[]> {
  const idIdx = file.headers.indexOf(file.schema.patientIdColumn);
  const byPatient = new Map<string, Record<string, string>[]>();
  for (const row of file.rows) {
    const pid = idIdx >= 0 ? (row[idIdx] || '').trim() : '';
    if (!pid) continue;
    const rec: Record<string, string> = {};
    for (let c = 0; c < file.headers.length; c++) rec[file.headers[c]] = (row[c] || '').trim();
    const bucket = byPatient.get(pid);
    if (bucket) bucket.push(rec);
    else byPatient.set(pid, [rec]);
  }
  return byPatient;
}

/** Integer age in years from a Synthea BIRTHDATE (YYYY-MM-DD), or null if unparseable. */
function ageFromBirthdate(birthdate: string): number | null {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

/**
 * Parse a SET of normalized entity files into per-patient ParsedRows.
 *
 * Join: child files (conditions/observations/...) join to patients by patient id (PATIENT -> patients.Id).
 * Crosswalk: condition CODEs are resolved through resolveConditionIcd10 honoring the schema's codeSystem -
 *   SNOMED is crosswalked (Phase 1), ICD10 bypasses unchanged. Unmapped SNOMED codes are recorded (not dropped).
 * Observations: LOINC CODEs map to engine lab slugs via ECHO_LOINC_TO_SLUG; latest value per slug wins.
 * Procedures: SNOMED, left raw (no authoritative SNOMED->CPT map -> CPT-gated procedure gaps under-fire).
 * Medications: RxNorm, passed through raw (the engine gates GDMT on RxNorm).
 */
export function parseMultiFileCSV(input: MultiFileInput): MultiFileParseResult {
  const fileErrors: FileError[] = [];
  const fileWarnings: FileError[] = [];
  const reporter = new CrosswalkReporter();
  let procedureCodesUntranslated = 0;

  const parsed: Partial<Record<EntityFileSchema['entity'], ParsedEntityFile>> = {};
  const contentOf: Record<EntityFileSchema['entity'], string | undefined> = {
    patients: input.patients,
    conditions: input.conditions,
    procedures: input.procedures,
    observations: input.observations,
    medications: input.medications,
    encounters: input.encounters,
  };

  // Required files: a missing/malformed one is a structured error.
  for (const entity of REQUIRED_ENTITIES) {
    const { file, error } = validateEntityFile(contentOf[entity], ENTITY_SCHEMAS[entity]);
    if (error) fileErrors.push(error);
    else parsed[entity] = file;
  }
  // Optional files: absence is a structured warning; a present-but-malformed one is still an error.
  for (const entity of OPTIONAL_ENTITIES) {
    if (contentOf[entity] === undefined || contentOf[entity]!.trim() === '') {
      fileWarnings.push({ file: ENTITY_SCHEMAS[entity].fileName, entity, message: `${ENTITY_SCHEMAS[entity].fileName} not provided (optional; enrichment skipped)` });
      continue;
    }
    const { file, error } = validateEntityFile(contentOf[entity], ENTITY_SCHEMAS[entity]);
    if (error) fileErrors.push(error);
    else parsed[entity] = file;
  }

  const emptyReport: UnmappedReport = reporter.report();

  // If any required file failed, do not assemble (no silent partial ingest).
  if (fileErrors.length > 0 || !parsed.patients) {
    return {
      validRows: [],
      errorRows: [],
      totalPatients: 0,
      fileErrors,
      fileWarnings,
      unmappedReport: emptyReport,
      procedureCodesUntranslated: 0,
      phiResult: { hasPHI: false, detections: [] },
    };
  }

  const patientsFile = parsed.patients;
  const conditionsByPatient = parsed.conditions ? indexByPatient(parsed.conditions) : new Map();
  const observationsByPatient = parsed.observations ? indexByPatient(parsed.observations) : new Map();
  const proceduresByPatient = parsed.procedures ? indexByPatient(parsed.procedures) : new Map();
  const medicationsByPatient = parsed.medications ? indexByPatient(parsed.medications) : new Map();
  const encountersByPatient = parsed.encounters ? indexByPatient(parsed.encounters) : new Map();

  const condSchema = ENTITY_SCHEMAS.conditions;
  const procSchema = ENTITY_SCHEMAS.procedures;

  const validRows: ParsedRow[] = [];
  const errorRows: ParsedRow[] = [];

  const hIdx = (h: string) => patientsFile.headers.indexOf(h);
  const idIdx = hIdx('id');
  const birthIdx = hIdx('birthdate');
  const genderIdx = hIdx('gender');

  for (let i = 0; i < patientsFile.rows.length; i++) {
    const prow = patientsFile.rows[i];
    const pid = (prow[idIdx] || '').trim();
    const parsedRow: ParsedRow = { rowNumber: i + 2, data: {}, errors: [], warnings: [] };

    if (!pid) {
      parsedRow.errors.push({ field: 'id', message: 'patients row missing Id' });
      errorRows.push(parsedRow);
      continue;
    }

    const birthdate = birthIdx >= 0 ? (prow[birthIdx] || '').trim() : '';
    const age = ageFromBirthdate(birthdate);
    parsedRow.data.patient_id = pid;
    parsedRow.data.age = age;
    parsedRow.data.sex = genderIdx >= 0 ? (prow[genderIdx] || '').trim() : null;
    if (age === null) parsedRow.warnings.push({ field: 'age', message: `unparseable BIRTHDATE '${birthdate}'` });

    // --- conditions -> crosswalk SNOMED -> ICD-10 (ICD10 bypasses); first = primary, rest = secondary ---
    // AUDIT-193: also carry each dx's STOP (resolution) date in condition_records. active-wins on dedup: if a dx
    // appears both ongoing (no stop) and resolved (has stop) across rows, the ongoing occurrence wins (a dx that
    // is active anywhere is active). A dx with only a stop date -> resolved.
    const icd10s: string[] = [];
    const stopByIcd = new Map<string, string | null>();
    let latestConditionDate = '';
    for (const c of conditionsByPatient.get(pid) || []) {
      const code = c[condSchema.codeColumn as string] || '';
      if (!code) continue;
      const res = resolveConditionIcd10(code, condSchema.codeSystem as CodeSystem);
      reporter.record(res, code);
      const stop = (c['stop'] || '').trim() || null;
      for (const icd of res.icd10) {
        if (!icd10s.includes(icd)) icd10s.push(icd);
        // active-wins: null (ongoing) overrides a prior stop; a stop does not override a prior null.
        if (!stopByIcd.has(icd) || stop === null) stopByIcd.set(icd, stop);
      }
      const start = c['start'] || '';
      if (start > latestConditionDate) latestConditionDate = start;
    }
    if (icd10s.length > 0) {
      parsedRow.data.primary_diagnosis = icd10s[0];
      parsedRow.data.secondary_diagnoses = icd10s.slice(1);
    } else {
      parsedRow.data.primary_diagnosis = null;
      parsedRow.data.secondary_diagnoses = [];
    }
    parsedRow.data.condition_records = icd10s.map((icd) => ({ icd10Code: icd, stopDate: stopByIcd.get(icd) ?? null }));

    // --- encounter_date: latest encounter START, else latest condition START, else null ---
    let latestEncounterDate = '';
    for (const e of encountersByPatient.get(pid) || []) {
      const start = e['start'] || '';
      if (start > latestEncounterDate) latestEncounterDate = start;
    }
    const encDate = latestEncounterDate || latestConditionDate;
    parsedRow.data.encounter_date = encDate ? new Date(encDate).toISOString() : null;

    // --- observations -> engine lab slug via ECHO_LOINC_TO_SLUG; latest value per slug wins ---
    const slugDates: Record<string, string> = {};
    for (const o of observationsByPatient.get(pid) || []) {
      const loinc = o['code'] || '';
      const slug = ECHO_LOINC_TO_SLUG[loinc];
      if (!slug) continue; // non-CV LOINC: not engine-gated, intentionally skipped (not a crosswalk failure)
      const num = parseFloat(o['value'] || '');
      if (isNaN(num)) continue;
      const when = o['date'] || '';
      if (slugDates[slug] === undefined || when >= slugDates[slug]) {
        parsedRow.data[slug] = num;
        slugDates[slug] = when;
      }
    }

    // --- procedures: SNOMED, left raw (no SNOMED->CPT map); threaded as a pipe for forward-compat ---
    const procCodes: string[] = [];
    for (const p of proceduresByPatient.get(pid) || []) {
      const code = p[procSchema.codeColumn as string] || '';
      if (!code) continue;
      procCodes.push(code);
      procedureCodesUntranslated++;
    }
    parsedRow.data.procedures = procCodes;

    // --- medications: RxNorm, passed through raw (engine gates GDMT on RxNorm). The code pipe is the
    //     parity/visibility shape; medication_records is the structured, persistence-bearing field
    //     patientWriter consumes (rxNormCode + name + start date). ---
    const medCodes: string[] = [];
    const medRecords: MedicationRecord[] = [];
    for (const m of medicationsByPatient.get(pid) || []) {
      const code = m['code'] || '';
      if (!code) continue;
      medCodes.push(code);
      // AUDIT-193: thread STOP (discontinuation date; absent = ongoing) so re-ingest can mark the med DISCONTINUED.
      // AUDIT-199-B: parse the mg strength out of the DESCRIPTION into doseValue/doseUnit for the dose-aware rules.
      const medName = m['description'] || code;
      const { doseValue, doseUnit } = parseDoseFromDescription(medName);
      medRecords.push({ rxNormCode: code, medicationName: medName, startDate: m['start'] || null, stopDate: (m['stop'] || '').trim() || null, doseValue, doseUnit });
    }
    parsedRow.data.medications = medCodes;
    parsedRow.data.medication_records = medRecords;

    validRows.push(parsedRow);
  }

  // PHI scan over the patients file (it carries names/DOB; the assembler does not thread them downstream).
  const phiResult = detectPHI(patientsFile.headers, patientsFile.rows);

  return {
    validRows,
    errorRows,
    totalPatients: patientsFile.rows.length,
    fileErrors,
    fileWarnings,
    unmappedReport: reporter.report(),
    procedureCodesUntranslated,
    phiResult,
  };
}
