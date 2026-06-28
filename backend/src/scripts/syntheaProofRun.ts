/**
 * PHASE 4 (STAGED): Synthea multi-file proof run.
 *
 * Streams the S3 Synthea normalized CSV set through the Phase 1-3 multi-file ingest path
 * (SNOMED->ICD-10 crosswalk -> writePatients -> runGapDetection) into a FRESH demo hospital,
 * to prove gaps fire across all 6 modules once SNOMED conditions are crosswalked (vs the 0-gap
 * raw-SNOMED bucket).
 *
 * WHY A STREAMING SCRIPT (not the HTTP route / not parseMultiFileCSV directly):
 *   observations.csv is 4.7GB, procedures.csv 1.1GB, encounters 638MB, medications 521MB. The Phase 2
 *   parseMultiFileCSV loads each file as one in-memory string -> guaranteed OOM at this scale, and a 4.7GB
 *   HTTP body is infeasible. This script instead STREAMS each file once (readline over the S3 GetObject
 *   stream), filters at stream time to engine-relevant rows (CV-LOINC observations only; the ~99% non-CV
 *   rows are dropped without buffering), and accumulates BOUNDED per-patient state (25,571 patients x a
 *   handful of codes/slugs each). It REUSES the exact Phase 1/2/2.5 building blocks - resolveConditionIcd10,
 *   CrosswalkReporter, ECHO_LOINC_TO_SLUG, the row.data shape, and writePatients - so there is no second
 *   crosswalk/assembly implementation to drift; only the file-reading (streaming vs whole-string) differs.
 *
 * PHI (operator decision: de-identified-input contract, NOT relaxed): patients.csv is PROJECTED to only the
 * columns the assembler reads (Id, BIRTHDATE, GENDER). SSN / ADDRESS / names are never read into the
 * pipeline. A detectPHI assertion runs over the projected sample and ABORTS on any PHI before writing.
 *
 * SAFETY: DRY-RUN by default. Without `--execute` the script streams, accumulates, and reports the INTENDED
 * counts WITHOUT creating the hospital, writing patients, or running gap detection. `--execute` is the only
 * mutating path and is gated by the §18 snapshot + explicit operator GO (see syntheaProofRun plan).
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as readline from 'readline';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { parseCSVLine, ParsedRow, MedicationRecord } from '../ingestion/csvParser';
import { resolveConditionIcd10, CrosswalkReporter, CodeSystem } from '../ingestion/snomedCrosswalk';
import { ECHO_LOINC_TO_SLUG } from '../services/observationService';
import { detectPHI } from '../ingestion/phiDetector';
import { writePatients } from '../ingestion/patientWriter';
import { runGapDetection } from '../ingestion/gapDetectionRunner';
import { HospitalType, SubscriptionTier } from '@prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_UPLOADS || 'tailrd-cardiovascular-datasets-863518424332';
const CSV_PREFIX = process.env.SYNTHEA_CSV_PREFIX || 'synthea/nyc-population-2026/csv/';
const PROOF_HOSPITAL_ID = process.env.PROOF_HOSPITAL_ID || 'demo-synthea-proof';
const WRITE_BATCH = parseInt(process.env.PROOF_WRITE_BATCH || '500', 10);
const EXECUTE = process.argv.includes('--execute'); // mutating path; default = dry-run

const KEY = (name: string): string => `${CSV_PREFIX}${name}`;

// ---------------------------------------------------------------------------
// Bounded per-patient accumulators (keyed by Synthea patient id)
// ---------------------------------------------------------------------------
interface PatientSpine { age: number | null; sex: string | null; }
interface LabSlot { value: number; date: string; }

const spine = new Map<string, PatientSpine>();
const dxByPatient = new Map<string, string[]>();                 // crosswalked, deduped ICD-10
const labsByPatient = new Map<string, Map<string, LabSlot>>();   // slug -> latest value
const medsByPatient = new Map<string, Map<string, MedicationRecord>>(); // rxNormCode -> record (deduped)
const encDateByPatient = new Map<string, string>();             // latest encounter START
const reporter = new CrosswalkReporter();
let procedureCodesUntranslated = 0;

// ---------------------------------------------------------------------------
// Streaming primitive: iterate a CSV's data rows once, header-indexed, no whole-file buffering.
// ---------------------------------------------------------------------------
async function forEachRow(
  name: string,
  onRow: (cells: string[], idx: (header: string) => number) => void,
): Promise<number> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY(name) }));
  if (!resp.Body) throw new Error(`Empty S3 body for ${KEY(name)}`);
  const rl = readline.createInterface({ input: resp.Body as Readable, crlfDelay: Infinity });
  let idxOf: ((header: string) => number) | null = null;
  let rows = 0;
  for await (const line of rl) {
    if (line === '') continue;
    const cells = parseCSVLine(line);
    if (!idxOf) {
      const headerMap: Record<string, number> = {};
      cells.forEach((h, i) => { headerMap[h.toLowerCase().replace(/\s+/g, '_')] = i; });
      idxOf = (h: string): number => (h in headerMap ? headerMap[h] : -1);
      continue;
    }
    onRow(cells, idxOf);
    rows++;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Stream + accumulate each entity file
// ---------------------------------------------------------------------------
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

async function ingestPatients(): Promise<string[][]> {
  const phiSample: string[][] = []; // projected (Id, BIRTHDATE, GENDER) only - never SSN/ADDRESS
  const n = await forEachRow('patients.csv', (cells, idx) => {
    const id = (cells[idx('id')] || '').trim();
    if (!id) return;
    const birthdate = (cells[idx('birthdate')] || '').trim();
    const gender = (cells[idx('gender')] || '').trim();
    spine.set(id, { age: ageFromBirthdate(birthdate), sex: gender || null });
    if (phiSample.length < 100) phiSample.push([id, birthdate, gender]);
  });
  logger.info('[proof] patients streamed', { rows: n, spine: spine.size });
  return phiSample;
}

async function ingestConditions(): Promise<void> {
  const condSys: CodeSystem = 'SNOMED';
  await forEachRow('conditions.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const code = (cells[idx('code')] || '').trim();
    if (!pid || !code) return;
    const res = resolveConditionIcd10(code, condSys);
    reporter.record(res, code);
    if (!res.mapped) return;
    const list = dxByPatient.get(pid) || [];
    for (const icd of res.icd10) if (!list.includes(icd)) list.push(icd);
    dxByPatient.set(pid, list);
  });
  logger.info('[proof] conditions streamed', { patientsWithDx: dxByPatient.size });
}

async function ingestObservations(): Promise<void> {
  // 4.7GB - the hot path. Keep ONLY CV-relevant LOINCs (ECHO_LOINC_TO_SLUG keys); drop the rest unbuffered.
  await forEachRow('observations.csv', (cells, idx) => {
    const loinc = (cells[idx('code')] || '').trim();
    const slug = ECHO_LOINC_TO_SLUG[loinc];
    if (!slug) return;
    const pid = (cells[idx('patient')] || '').trim();
    if (!pid) return;
    const value = parseFloat((cells[idx('value')] || '').trim());
    if (isNaN(value)) return;
    const date = (cells[idx('date')] || '').trim();
    let slots = labsByPatient.get(pid);
    if (!slots) { slots = new Map(); labsByPatient.set(pid, slots); }
    const prev = slots.get(slug);
    if (!prev || date >= prev.date) slots.set(slug, { value, date }); // latest-wins
  });
  logger.info('[proof] observations streamed', { patientsWithLabs: labsByPatient.size });
}

async function ingestMedications(): Promise<void> {
  await forEachRow('medications.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const code = (cells[idx('code')] || '').trim();
    if (!pid || !code) return;
    let byRx = medsByPatient.get(pid);
    if (!byRx) { byRx = new Map(); medsByPatient.set(pid, byRx); }
    if (!byRx.has(code)) {
      byRx.set(code, {
        rxNormCode: code,
        medicationName: (cells[idx('description')] || '').trim() || code,
        startDate: (cells[idx('start')] || '').trim() || null,
      });
    }
  });
  logger.info('[proof] medications streamed', { patientsWithMeds: medsByPatient.size });
}

async function ingestProcedures(): Promise<void> {
  // SNOMED procedures: no authoritative SNOMED->CPT map -> count only (expected under-fire, not persisted).
  await forEachRow('procedures.csv', (cells, idx) => {
    const code = (cells[idx('code')] || '').trim();
    if (code) procedureCodesUntranslated++;
  });
  logger.info('[proof] procedures streamed (untranslated)', { procedureCodesUntranslated });
}

async function ingestEncounters(): Promise<void> {
  await forEachRow('encounters.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const start = (cells[idx('start')] || '').trim();
    if (!pid || !start) return;
    const prev = encDateByPatient.get(pid);
    if (!prev || start > prev) encDateByPatient.set(pid, start);
  });
  logger.info('[proof] encounters streamed', { patientsWithEnc: encDateByPatient.size });
}

// ---------------------------------------------------------------------------
// Assemble one ParsedRow per patient (SAME shape writePatients consumes)
// ---------------------------------------------------------------------------
function assembleRow(pid: string, rowNumber: number): ParsedRow {
  const sp = spine.get(pid)!;
  const data: ParsedRow['data'] = {
    patient_id: pid,
    age: sp.age,
    sex: sp.sex,
  };

  const dx = dxByPatient.get(pid) || [];
  data.primary_diagnosis = dx.length > 0 ? dx[0] : null;
  data.secondary_diagnoses = dx.slice(1);

  const enc = encDateByPatient.get(pid);
  data.encounter_date = enc ? new Date(enc).toISOString() : null;

  const slots = labsByPatient.get(pid);
  if (slots) for (const [slug, slot] of slots) data[slug] = slot.value;

  const meds = medsByPatient.get(pid);
  data.medication_records = meds ? [...meds.values()] : [];
  data.procedures = [];

  return { rowNumber, data, errors: [], warnings: [] };
}

// ---------------------------------------------------------------------------
// Fresh-hospital provisioning (create passes the BAA guard; baaExecuted is set via the CoveredEntity
// service path - NOT a direct write, per the schema's "do NOT write directly" rule). See the staged plan:
// the operator confirms BAA_GUARD_MODE + provisions the executed BAA before --execute.
// ---------------------------------------------------------------------------
async function ensureProofHospital(): Promise<void> {
  const existing = await prisma.hospital.findUnique({ where: { id: PROOF_HOSPITAL_ID } });
  if (existing) { logger.info('[proof] hospital exists', { id: PROOF_HOSPITAL_ID }); return; }
  await prisma.hospital.create({
    data: {
      id: PROOF_HOSPITAL_ID,
      name: 'Synthea Proof (NYC 2026)',
      patientCount: 0, bedCount: 0, hospitalType: HospitalType.COMMUNITY,
      street: 'N/A', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA',
      moduleHeartFailure: true, moduleElectrophysiology: true, moduleStructuralHeart: true,
      moduleCoronaryIntervention: true, modulePeripheralVascular: true, moduleValvularDisease: true,
      subscriptionTier: SubscriptionTier.ENTERPRISE, subscriptionStart: new Date(), maxUsers: 1,
    },
  });
  logger.info('[proof] hospital created', { id: PROOF_HOSPITAL_ID });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  logger.info('[proof] start', { execute: EXECUTE, hospital: PROOF_HOSPITAL_ID, bucket: BUCKET, prefix: CSV_PREFIX });

  const phiSample = await ingestPatients();

  // PHI gate (de-identified-input contract, NOT relaxed): assert the projected columns carry no PHI.
  const phi = detectPHI(['id', 'birthdate', 'gender'], phiSample);
  if (phi.hasPHI) {
    throw new Error(`[proof] ABORT: PHI detected in projected patients data (${phi.detections.length} hits). De-identified-input contract violated.`);
  }

  await ingestConditions();
  await ingestObservations();
  await ingestMedications();
  await ingestProcedures();
  await ingestEncounters();

  const unmapped = reporter.report();
  logger.info('[proof] crosswalk report', {
    totalMapped: unmapped.totalMapped, totalUnmapped: unmapped.totalUnmapped,
    distinctUnmapped: unmapped.unmappedCodes.length,
  });

  const pids = [...spine.keys()];
  logger.info('[proof] assembly summary', {
    patients: pids.length,
    patientsWithDx: dxByPatient.size,
    patientsWithLabs: labsByPatient.size,
    patientsWithMeds: medsByPatient.size,
    procedureCodesUntranslated,
  });

  if (!EXECUTE) {
    logger.warn('[proof] DRY-RUN complete - no hospital created, no patients written, no gap detection run. Pass --execute (post-snapshot, post-GO) to write.');
    return;
  }

  // ---- mutating path (only with --execute) ----
  await ensureProofHospital();

  let written = 0;
  let batch: ParsedRow[] = [];
  let rowNum = 2;
  for (const pid of pids) {
    batch.push(assembleRow(pid, rowNum++));
    if (batch.length >= WRITE_BATCH) {
      const r = await writePatients(batch, PROOF_HOSPITAL_ID, `proof-${Date.now()}`, 'multi');
      written += r.patientsCreated + r.patientsUpdated;
      batch = [];
    }
  }
  if (batch.length > 0) {
    const r = await writePatients(batch, PROOF_HOSPITAL_ID, `proof-${Date.now()}`, 'multi');
    written += r.patientsCreated + r.patientsUpdated;
  }
  logger.info('[proof] write complete', { patientsWritten: written });

  const gapResult = await runGapDetection(PROOF_HOSPITAL_ID);
  logger.info('[proof] gap detection complete', { ...gapResult });

  // Per-module gap distribution (the proof's headline invariant).
  const byModule = await prisma.therapyGap.groupBy({
    by: ['module'],
    where: { hospitalId: PROOF_HOSPITAL_ID },
    _count: { _all: true },
  });
  logger.info('[proof] per-module gap distribution', {
    distribution: byModule.map((m) => ({ module: m.module, gaps: m._count._all })),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => { logger.error('[proof] failed', { error: err instanceof Error ? err.message : String(err) }); process.exit(1); });
