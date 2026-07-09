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
import { parseCSVLine, ParsedRow, MedicationRecord, parseDoseFromDescription } from '../ingestion/csvParser';
import { resolveConditionIcd10, CrosswalkReporter, CodeSystem } from '../ingestion/snomedCrosswalk';
import { ECHO_LOINC_TO_SLUG } from '../services/observationService';
import { detectPHI } from '../ingestion/phiDetector';
import { writePatients } from '../ingestion/patientWriter';
import { runGapDetection } from '../ingestion/gapDetectionRunner';
import { evaluateGapRules } from '../ingestion/gaps/gapRuleEngine';
import { expandToIngredients } from '../terminology/expandToIngredients';
// Reuse the runner's EXPORTED staleness constants so the projection mirrors the real run exactly (no drift).
import { ECHO_CUTOFF_MS, LAB_CUTOFF_MS, IMAGING_TYPES } from '../ingestion/runGapDetectionForPatient';
import { HospitalType, SubscriptionTier, Gender } from '@prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_UPLOADS || 'tailrd-cardiovascular-datasets-863518424332';
const CSV_PREFIX = process.env.SYNTHEA_CSV_PREFIX || 'synthea/nyc-population-2026/csv/';
const PROOF_HOSPITAL_ID = process.env.PROOF_HOSPITAL_ID || 'demo-synthea-proof';
const WRITE_BATCH = parseInt(process.env.PROOF_WRITE_BATCH || '500', 10);
const EXECUTE = process.argv.includes('--execute'); // mutating path; default = dry-run
// --sample=N: representative fast preview. Reads the first N patients from patients.csv and (because Synthea
// CSVs are patient-GROUPED) early-stops each child file once it has passed that patient region, so only ~N/total
// of each file is streamed. 0 = full population. Sample mode is DRY-RUN-only (never writes); the projected
// per-module gap distribution is reported for the sample and extrapolated x(total/N).
const SAMPLE = parseInt((process.argv.find(a => a.startsWith('--sample='))?.split('=')[1]) || '0', 10);
const SAMPLE_MARGIN_ROWS = 5000; // after the contiguous sample region, stop a child file once this many consecutive non-sample rows pass
const sampleSet = new Set<string>(); // sample patient ids (populated in ingestPatients when SAMPLE > 0)

const KEY = (name: string): string => `${CSV_PREFIX}${name}`;

// AUDIT-192 (2026-06-29): the winston `logger` (utils/logger) does not reach CloudWatch in production (file
// transport), so the [proof] progress markers were INVISIBLE during the 25,571-patient --execute run
// (verification had to go via a DB query). console.log writes to stdout, which the ECS awslogs driver always
// ships to CloudWatch - use it for the script's own progress/result logging so future runs are observable.
function plog(message: string, data?: Record<string, unknown>): void {
  console.log(message + (data ? ' ' + JSON.stringify(data) : ''));
}

/** Per-child-file early-stop state for sample mode (patient-grouped files -> sample rows are contiguous at the front). */
interface SampleGate { seen: number; miss: number; }
function sampleDecision(pid: string, g: SampleGate): 'use' | 'skip' | 'stop' {
  if (SAMPLE <= 0) return 'use';
  if (sampleSet.has(pid)) { g.seen++; g.miss = 0; return 'use'; }
  if (g.seen > 0 && ++g.miss > SAMPLE_MARGIN_ROWS) return 'stop';
  return 'skip';
}

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
  onRow: (cells: string[], idx: (header: string) => number) => void | boolean, // return false to early-stop
): Promise<number> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY(name) }));
  if (!resp.Body) throw new Error(`Empty S3 body for ${KEY(name)}`);
  const body = resp.Body as Readable;
  const rl = readline.createInterface({ input: body, crlfDelay: Infinity });
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
    const cont = onRow(cells, idxOf);
    rows++;
    if (cont === false) { rl.close(); body.destroy(); break; } // early-stop (sample mode): close S3 stream now
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
    if (SAMPLE > 0 && spine.size >= SAMPLE) return false; // sample mode: stop after first N patients
    const id = (cells[idx('id')] || '').trim();
    if (!id) return;
    const birthdate = (cells[idx('birthdate')] || '').trim();
    const gender = (cells[idx('gender')] || '').trim();
    spine.set(id, { age: ageFromBirthdate(birthdate), sex: gender || null });
    if (SAMPLE > 0) sampleSet.add(id);
    if (phiSample.length < 100) phiSample.push([id, birthdate, gender]);
  });
  plog('[proof] patients streamed', { rows: n, spine: spine.size, sample: SAMPLE > 0 ? SAMPLE : 'full' });
  return phiSample;
}

async function ingestConditions(): Promise<void> {
  const condSys: CodeSystem = 'SNOMED';
  const gate: SampleGate = { seen: 0, miss: 0 };
  await forEachRow('conditions.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const d = sampleDecision(pid, gate);
    if (d === 'stop') return false;
    if (d === 'skip') return;
    const code = (cells[idx('code')] || '').trim();
    if (!pid || !code) return;
    const res = resolveConditionIcd10(code, condSys);
    reporter.record(res, code);
    if (!res.mapped) return;
    const list = dxByPatient.get(pid) || [];
    for (const icd of res.icd10) if (!list.includes(icd)) list.push(icd);
    dxByPatient.set(pid, list);
  });
  plog('[proof] conditions streamed', { patientsWithDx: dxByPatient.size });
}

async function ingestObservations(): Promise<void> {
  // 4.7GB - the hot path. Keep ONLY CV-relevant LOINCs (ECHO_LOINC_TO_SLUG keys); drop the rest unbuffered.
  const gate: SampleGate = { seen: 0, miss: 0 };
  await forEachRow('observations.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const d = sampleDecision(pid, gate);
    if (d === 'stop') return false;
    if (d === 'skip') return;
    const loinc = (cells[idx('code')] || '').trim();
    const slug = ECHO_LOINC_TO_SLUG[loinc];
    if (!slug) return;
    if (!pid) return;
    const value = parseFloat((cells[idx('value')] || '').trim());
    if (isNaN(value)) return;
    const date = (cells[idx('date')] || '').trim();
    let slots = labsByPatient.get(pid);
    if (!slots) { slots = new Map(); labsByPatient.set(pid, slots); }
    const prev = slots.get(slug);
    if (!prev || date >= prev.date) slots.set(slug, { value, date }); // latest-wins
  });
  plog('[proof] observations streamed', { patientsWithLabs: labsByPatient.size });
}

async function ingestMedications(): Promise<void> {
  const gate: SampleGate = { seen: 0, miss: 0 };
  await forEachRow('medications.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const d = sampleDecision(pid, gate);
    if (d === 'stop') return false;
    if (d === 'skip') return;
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
  plog('[proof] medications streamed', { patientsWithMeds: medsByPatient.size });
}

async function ingestProcedures(): Promise<void> {
  // SNOMED procedures: no authoritative SNOMED->CPT map -> count only (expected under-fire, not persisted).
  const gate: SampleGate = { seen: 0, miss: 0 };
  await forEachRow('procedures.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const d = sampleDecision(pid, gate);
    if (d === 'stop') return false;
    if (d === 'skip') return;
    const code = (cells[idx('code')] || '').trim();
    if (code) procedureCodesUntranslated++;
  });
  plog('[proof] procedures streamed (untranslated)', { procedureCodesUntranslated });
}

async function ingestEncounters(): Promise<void> {
  const gate: SampleGate = { seen: 0, miss: 0 };
  await forEachRow('encounters.csv', (cells, idx) => {
    const pid = (cells[idx('patient')] || '').trim();
    const d = sampleDecision(pid, gate);
    if (d === 'stop') return false;
    if (d === 'skip') return;
    const start = (cells[idx('start')] || '').trim();
    if (!pid || !start) return;
    const prev = encDateByPatient.get(pid);
    if (!prev || start > prev) encDateByPatient.set(pid, start);
  });
  plog('[proof] encounters streamed', { patientsWithEnc: encDateByPatient.size });
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

function mapGender(sex: string | null): Gender {
  if (!sex) return Gender.UNKNOWN;
  const s = sex.toUpperCase();
  if (s === 'M' || s === 'MALE') return Gender.MALE;
  if (s === 'F' || s === 'FEMALE') return Gender.FEMALE;
  return Gender.OTHER;
}

// ---------------------------------------------------------------------------
// In-memory gap PROJECTION (read-only, no DB). Mirrors both runners' per-patient transform: dxCodes from
// crosswalked ICD-10, labValues with the runner's staleness cutoffs (IMAGING 365d / LAB 180d), medCodes via
// expandToIngredients, age + gender, race undefined (patientWriter does not write race -> the real run also
// sees null), procedureCodes [] (procedures are not persisted). Calls the engine's pure evaluateGapRules -
// the same function both runners call - so the dry-run projects what --execute would actually produce.
// ---------------------------------------------------------------------------
function projectGapDistribution(): { byModule: Record<string, number>; totalGaps: number; patientsWithGaps: number } {
  const byModule: Record<string, number> = {};
  let totalGaps = 0;
  let patientsWithGaps = 0;
  const now = Date.now();

  for (const pid of spine.keys()) {
    const sp = spine.get(pid)!;
    const dx = dxByPatient.get(pid) || [];

    const labValues: Record<string, number> = {};
    const slots = labsByPatient.get(pid);
    if (slots) {
      for (const [slug, slot] of slots) {
        if (slot.date) {
          const ageMs = now - new Date(slot.date).getTime();
          const cutoff = IMAGING_TYPES.has(slug) ? ECHO_CUTOFF_MS : LAB_CUTOFF_MS;
          if (ageMs > cutoff) continue; // stale -> excluded, mirroring the runner
        }
        labValues[slug] = slot.value;
      }
    }

    const medsMap = medsByPatient.get(pid);
    const medCodes = expandToIngredients(medsMap ? [...medsMap.keys()] : []);
    const meds = medsMap
      ? [...medsMap.values()].map((m) => {
          // AUDIT-199-B: mirror the ingest parse so the projection reflects dose-aware production behavior
          // (previously hardcoded doseValue null -> the proof under-reported the statin coverage gain).
          const { doseValue, doseUnit } = parseDoseFromDescription(m.medicationName);
          return {
            rxNormCode: m.rxNormCode, doseValue, doseUnit,
            genericName: null, medicationName: m.medicationName, startDate: m.startDate,
          };
        })
      : [];

    const gaps = evaluateGapRules(dx, labValues, medCodes, sp.age ?? 0, mapGender(sp.sex), undefined, meds as any, []);
    if (gaps.length > 0) patientsWithGaps++;
    for (const g of gaps) {
      byModule[g.module] = (byModule[g.module] || 0) + 1;
      totalGaps++;
    }
  }
  return { byModule, totalGaps, patientsWithGaps };
}

// ---------------------------------------------------------------------------
// Fresh-hospital provisioning (create passes the BAA guard; baaExecuted is set via the CoveredEntity
// service path - NOT a direct write, per the schema's "do NOT write directly" rule). See the staged plan:
// the operator confirms BAA_GUARD_MODE + provisions the executed BAA before --execute.
// ---------------------------------------------------------------------------
async function ensureProofHospital(): Promise<void> {
  const existing = await prisma.hospital.findUnique({ where: { id: PROOF_HOSPITAL_ID } });
  if (existing) { plog('[proof] hospital exists', { id: PROOF_HOSPITAL_ID }); return; }
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
  plog('[proof] hospital created', { id: PROOF_HOSPITAL_ID });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  plog('[proof] start', { execute: EXECUTE, sample: SAMPLE > 0 ? SAMPLE : 'full', hospital: PROOF_HOSPITAL_ID, bucket: BUCKET, prefix: CSV_PREFIX });

  if (SAMPLE > 0 && EXECUTE) {
    throw new Error('[proof] ABORT: --sample is a DRY-RUN-only representative preview and must never write. Run the full population (no --sample) for --execute.');
  }

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
  plog('[proof] crosswalk report', {
    totalMapped: unmapped.totalMapped, totalUnmapped: unmapped.totalUnmapped,
    distinctUnmapped: unmapped.unmappedCodes.length,
  });

  const pids = [...spine.keys()];
  plog('[proof] assembly summary', {
    patients: pids.length,
    patientsWithDx: dxByPatient.size,
    patientsWithLabs: labsByPatient.size,
    patientsWithMeds: medsByPatient.size,
    procedureCodesUntranslated,
  });

  // Projected per-module gap distribution (read-only; what --execute would produce).
  const projection = projectGapDistribution();
  const extrapolated: Record<string, number> | undefined =
    SAMPLE > 0 && pids.length > 0
      ? Object.fromEntries(Object.entries(projection.byModule).map(([m, c]) => [m, Math.round(c * (25571 / pids.length))]))
      : undefined;
  plog('[proof] PROJECTED per-module gap distribution (no write)', {
    mode: SAMPLE > 0 ? `SAMPLE(${pids.length} of 25571, x${(25571 / Math.max(pids.length, 1)).toFixed(1)})` : 'FULL',
    patients: pids.length,
    patientsWithGaps: projection.patientsWithGaps,
    totalGaps: projection.totalGaps,
    byModule: projection.byModule,
    ...(extrapolated ? { extrapolatedFullByModule: extrapolated } : {}),
  });

  if (!EXECUTE) {
    plog('[proof] DRY-RUN complete - no hospital created, no patients written, no gap detection run. Pass --execute (post-snapshot, post-GO) to write.');
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
  plog('[proof] write complete', { patientsWritten: written });

  const gapResult = await runGapDetection(PROOF_HOSPITAL_ID);
  plog('[proof] gap detection complete', { ...gapResult });

  // Per-module gap distribution (the proof's headline invariant).
  const byModule = await prisma.therapyGap.groupBy({
    by: ['module'],
    where: { hospitalId: PROOF_HOSPITAL_ID },
    _count: { _all: true },
  });
  plog('[proof] per-module gap distribution', {
    distribution: byModule.map((m) => ({ module: m.module, gaps: m._count._all })),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => { plog('[proof] failed', { error: err instanceof Error ? err.message : String(err) }); process.exit(1); });
