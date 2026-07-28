/**
 * AUDIT-218 remediation: dedicated procedures-only backfill runner.
 *
 * WHY THIS EXISTS: the proof CSV ingest path (`syntheaProofRun.ts ingestProcedures`) reads
 * `procedures.csv` but only COUNTS rows ("no authoritative SNOMED->CPT map -> count only, not
 * persisted"), so the `procedures` table is EMPTY for the Synthea demo tenants (verified in-VPC:
 * 0 rows). `deriveEchoMonths` (echoRecency.ts) reads `patient.procedures` as its PRIMARY echo signal,
 * and the planned Tranche-3 structural threading reads it too - both are inoperative on empty data.
 * This runner persists the raw SNOMED procedures the source already contains (5,480,901 rows;
 * echo SNOMEDs 40701008 x7205 / 433236007 x2030 / 105376000 x73 full-file).
 *
 * OPERATOR RULINGS (2026-07-24):
 *   (1) persist ALL procedures, no filter (the "no SNOMED->CPT map" reason is invalid: the schema
 *       stores snomedCode and the engine gates on either system - ingestSynthea.ts already persists
 *       raw SNOMED; SNOMED->CPT translation is NOT a persistence prerequisite).
 *   (2) DEDICATED + STRUCTURALLY ISOLATED: this runner reads ONLY procedures.csv and writes ONLY
 *       prisma.procedure.createMany (+ one summary prisma.auditLog.create on execute). It NEVER
 *       invokes writePatients / writeBatch / runGapDetection / any condition/observation/medication
 *       writer, so "touches only the procedures table" is a structural guarantee, not a reasoned one.
 *   (3) DETERMINISTIC IDEMPOTENCY KEY: the CSV has no procedure UUID, so fhirProcedureId is synthesized
 *       as `synthea:<sha256(PATIENT|CODE|START|ENCOUNTER)>`. The Procedure @@unique([hospitalId,
 *       fhirProcedureId]) then dedups on re-run (createMany skipDuplicates), making the backfill safely
 *       re-runnable. Benign in-CSV duplicate collapse: two identical (patient,code,start,encounter)
 *       rows map to the same key and are collapsed to one row - acceptable for a synthetic substrate,
 *       counted + reported (never silent).
 *   (4) DECOUPLED from gap re-detection: this runner persists procedures ONLY. It does NOT re-run gap
 *       detection, so stored therapy_gaps are untouched. The VD-ECHO-INTERVAL echo_months improvement
 *       manifests only on a SUBSEQUENT, separately-gated gap re-detection - out of scope here.
 *
 * TENANT SCOPE: `demo-synthea-threaded` ONLY (a literal, DRIFT-51 - never derived/heuristic). The
 * sibling proof tenant `demo-synthea-proof` is EXCLUDED per the operator ruling; if its emptiness later
 * matters it gets its own ruling.
 *
 * SAFETY:
 *   - DRY-RUN by default. `--execute` is the only mutating path; gate it behind the section-18 snapshot
 *     + explicit operator GO (Aurora snapshot -> dry-run with count invariants -> execute-GO).
 *   - AUDIT-193 STOP-parse: a malformed row (short cell count / missing PATIENT or CODE) THROWS a
 *     structured error - never a silent skip.
 *   - AUDIT-115/016 non-progress tripwire: a run that processes 0 source rows, or an execute run that
 *     would insert 0 rows (e.g. patient-map empty / all orphans), THROWS loudly rather than reporting
 *     a silent exit-0 no-op (the class that was caught only by an operator count invariant, not the
 *     exit code).
 *   - Batched createMany(500) skipDuplicates per AUDIT-192 (the tenant-guard-EXEMPT create op; each row
 *     carries hospitalId in data, so tenant isolation is preserved, not bypassed).
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as readline from 'readline';
import * as crypto from 'crypto';
import prisma from '../lib/prisma';
import { parseCSVLine } from '../ingestion/csvParser';

// --- Config (mirrors syntheaProofRun.ts constants; same env-var names + defaults - kept in lock-step by
//     name, NOT imported, because importing syntheaProofRun.ts runs its main() at module load). ---
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_UPLOADS || 'tailrd-cardiovascular-datasets-863518424332';
const CSV_PREFIX = process.env.SYNTHEA_CSV_PREFIX || 'synthea/nyc-population-2026/csv/';
const PROCEDURES_KEY = `${CSV_PREFIX}procedures.csv`;
const WRITE_BATCH = parseInt(process.env.PROC_WRITE_BATCH || '500', 10);
const PROGRESS_EVERY = parseInt(process.env.PROC_PROGRESS_EVERY || '500000', 10);

// DRIFT-51: the target tenant is a LITERAL, never derived. The proof tenant is deliberately excluded.
export const TARGET_TENANT = 'demo-synthea-threaded' as const;

const EXECUTE = process.argv.includes('--execute'); // mutating path; default = dry-run

// console.log -> stdout -> ECS awslogs -> CloudWatch (winston file transport is invisible in prod;
// AUDIT-192 lesson). Use it for the runner's own progress/result logging so runs are observable.
function plog(message: string, data?: Record<string, unknown>): void {
  console.log(message + (data ? ' ' + JSON.stringify(data) : ''));
}

/**
 * Execution-vehicle fidelity (item 1): the build SHA baked into the image at build time, emitted at
 * startup so a reader can confirm WHICH build is running before a production write. `APP_GIT_SHA` is
 * set from the docker `--build-arg GIT_SHA=<github.sha>` (Dockerfile ARG -> ENV); locally it is unset
 * and this returns 'dev'. Combined with the PR/merge provenance, the emitted SHA establishes that the
 * running code is the CI-verified runner from this commit.
 */
export function resolveBuildSha(env: NodeJS.ProcessEnv = process.env): string {
  return env.APP_GIT_SHA || 'dev';
}

// --- Pure, testable core --------------------------------------------------------------------------

/** Synthesize a stable idempotency key from the natural key of a Synthea procedure row (ruling 3). */
export function deterministicProcedureId(
  patient: string,
  code: string,
  start: string,
  encounter: string,
): string {
  const h = crypto.createHash('sha256').update(`${patient}|${code}|${start}|${encounter}`).digest('hex');
  return `synthea:${h}`;
}

export interface ProcedureRow {
  patientId: string;
  hospitalId: string;
  fhirProcedureId: string;
  cptCode: null;
  snomedCode: string | null;
  procedureName: string | null;
  status: string;
  procedureDate: Date | null;
}

export class MalformedProcedureRowError extends Error {
  constructor(rowNumber: number, reason: string, cells: string[]) {
    super(`Malformed procedures.csv row ${rowNumber}: ${reason} (cells=${JSON.stringify(cells.slice(0, 10))})`);
    this.name = 'MalformedProcedureRowError';
  }
}

export type MapResult =
  | { kind: 'row'; row: ProcedureRow }
  | { kind: 'orphan'; mrn: string };

/**
 * Map ONE CSV procedure row to a Procedure insert, or classify it as an orphan (patient not ingested
 * for this tenant). THROWS MalformedProcedureRowError on a structurally-bad row (STOP-parse; never a
 * silent skip). `idx` resolves a lower_snake header name to its column index (or -1).
 */
export function mapProcedureRow(
  cells: string[],
  idx: (header: string) => number,
  patientIdByMrn: ReadonlyMap<string, string>,
  hospitalId: string,
  rowNumber: number,
): MapResult {
  const iPatient = idx('patient');
  const iCode = idx('code');
  const iStart = idx('start');
  const iEnc = idx('encounter');
  const iDesc = idx('description');
  if (iPatient < 0 || iCode < 0 || iStart < 0) {
    throw new MalformedProcedureRowError(rowNumber, 'required header (PATIENT/CODE/START) missing', cells);
  }
  // A row shorter than the required columns is malformed (a truncated/misquoted line) - fail loud.
  if (cells.length <= Math.max(iPatient, iCode, iStart)) {
    throw new MalformedProcedureRowError(rowNumber, 'cell count shorter than required columns', cells);
  }
  const patient = (cells[iPatient] || '').trim();
  const code = (cells[iCode] || '').trim();
  const start = (cells[iStart] || '').trim();
  const encounter = iEnc >= 0 ? (cells[iEnc] || '').trim() : '';
  if (!patient || !code) {
    throw new MalformedProcedureRowError(rowNumber, 'empty PATIENT or CODE', cells);
  }
  const dbId = patientIdByMrn.get(patient);
  if (dbId === undefined) return { kind: 'orphan', mrn: patient };

  const procedureDate = start ? new Date(start) : null;
  return {
    kind: 'row',
    row: {
      patientId: dbId,
      hospitalId,
      fhirProcedureId: deterministicProcedureId(patient, code, start, encounter),
      cptCode: null,
      snomedCode: code,
      procedureName: iDesc >= 0 ? (cells[iDesc] || '').trim() || null : null,
      status: 'completed',
      procedureDate: procedureDate && !isNaN(procedureDate.getTime()) ? procedureDate : null,
    },
  };
}

export interface BackfillResult {
  sourceRows: number;
  orphansDropped: number;
  inCsvCollisions: number;
  inserted: number;       // execute: rows written; dry-run: rows that WOULD be written
  echoSnomed: Record<string, number>; // spot-check among resolved (non-orphan) rows
  execute: boolean;
}

// The echo SNOMEDs deriveEchoMonths keys on - spot-checked so the report proves the echo signal landed.
const ECHO_SNOMED = ['40701008', '433236007', '105376000'] as const;

// --- Non-progress tripwire guards (AUDIT-115/016: a silent exit-0 no-op must fail LOUD; the class caught
//     only by an operator count invariant, not the exit code). Pure + unit-tested; called from main. ---

/** Pre-flight: refuse to stream the 1.1GB file against an empty/wrong tenant (every row would orphan). */
export function assertTenantPopulated(patientMapSize: number, tenant: string): void {
  if (patientMapSize === 0) {
    throw new Error(`[proc-backfill] ABORT: 0 patients for tenant ${tenant} - refusing to run (would drop 100% as orphans). Verify the tenant is populated.`);
  }
}

export interface StreamProgress { sourceRows: number; resolved: number; inserted: number; execute: boolean; priorExisting: number; }

/**
 * AUDIT-220: an execute pass inserted 0 rows because the full resolved set was ALREADY present (an
 * idempotent re-run: every row is a deterministic-key skipDuplicates collision), as opposed to a genuine
 * 0-insert anomaly. The distinguishing signal is `priorExisting` - the tenant's procedure count measured
 * BEFORE the write - NOT `resolved - inserted`: the latter is circular (Prisma createMany returns only the
 * insert count, so `resolved - inserted` is ALWAYS `resolved` when inserted==0, which would blind the guard
 * to real anomalies). inserted==0 is idempotent iff the store already held at least the resolved set.
 */
export function isIdempotentSkip(p: StreamProgress): boolean {
  return p.execute && p.resolved > 0 && p.inserted === 0 && p.priorExisting >= p.resolved;
}

/**
 * Post-stream tripwire (AUDIT-115/016 non-progress class). Throws on an empty read, or on an execute pass
 * that inserts 0 despite resolved rows - UNLESS that 0 is a provable idempotent skip (see isIdempotentSkip).
 * A true patient-FK / no-op anomaly (inserted 0, resolved > 0, priorExisting < resolved) still throws.
 * (AUDIT-220 refinement: idempotent re-runs are now accepted, exit 0.)
 */
export function assertStreamProgress(p: StreamProgress): void {
  if (p.sourceRows === 0) {
    throw new Error('[proc-backfill] ABORT: 0 source rows read from procedures.csv (empty/failed S3 stream).');
  }
  if (p.execute && p.resolved > 0 && p.inserted === 0 && !isIdempotentSkip(p)) {
    throw new Error(`[proc-backfill] ABORT: execute inserted 0 rows despite ${p.resolved} resolved and only ${p.priorExisting} pre-existing (patient-FK/no-op anomaly, not idempotent-skip).`);
  }
}

/** Minimal writer surface the core needs - lets the integration test inject a mock (no real prisma/S3). */
export interface ProcedureWriter {
  createMany(rows: ProcedureRow[]): Promise<{ count: number }>;
}

/**
 * Core stream processor - testable with a fixture line-iterator + an in-memory writer. Consumes the CSV
 * header first, then each data row: STOP-parse on malformed, drop+count orphans, collapse+count in-CSV
 * key collisions, and (execute) batch-insert via the writer. Non-progress tripwire enforced by the
 * caller against the returned counts.
 */
export async function processProcedureStream(
  lines: AsyncIterable<string>,
  patientIdByMrn: ReadonlyMap<string, string>,
  hospitalId: string,
  execute: boolean,
  writer: ProcedureWriter,
): Promise<BackfillResult> {
  const res: BackfillResult = {
    sourceRows: 0, orphansDropped: 0, inCsvCollisions: 0, inserted: 0,
    echoSnomed: Object.fromEntries(ECHO_SNOMED.map((c) => [c, 0])), execute,
  };
  const seenKeys = new Set<string>();
  let buffer: ProcedureRow[] = [];
  let idxOf: ((h: string) => number) | null = null;
  let rowNumber = 0;

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return;
    if (execute) {
      const { count } = await writer.createMany(buffer);
      res.inserted += count;
    } else {
      res.inserted += buffer.length; // dry-run: rows that WOULD be written (post orphan/collision drop)
    }
    buffer = [];
  };

  for await (const line of lines) {
    if (line === '') continue;
    const cells = parseCSVLine(line);
    if (!idxOf) {
      const headerMap: Record<string, number> = {};
      cells.forEach((h, i) => { headerMap[h.toLowerCase().replace(/\s+/g, '_')] = i; });
      idxOf = (h: string): number => (h in headerMap ? headerMap[h] : -1);
      continue;
    }
    rowNumber++;
    res.sourceRows++;
    const mapped = mapProcedureRow(cells, idxOf, patientIdByMrn, hospitalId, rowNumber);
    if (mapped.kind === 'orphan') { res.orphansDropped++; continue; }
    const key = mapped.row.fhirProcedureId;
    if (seenKeys.has(key)) { res.inCsvCollisions++; continue; } // benign in-CSV duplicate collapse (ruling 3)
    seenKeys.add(key);
    if (mapped.row.snomedCode && res.echoSnomed[mapped.row.snomedCode] !== undefined) {
      res.echoSnomed[mapped.row.snomedCode]++;
    }
    buffer.push(mapped.row);
    if (buffer.length >= WRITE_BATCH) await flush();
  }
  await flush();
  return res;
}

// --- S3 streaming + real-prisma wiring (not exercised by unit tests) ------------------------------

async function* s3Lines(key: string): AsyncGenerator<string> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!resp.Body) throw new Error(`Empty S3 body for ${key}`);
  const rl = readline.createInterface({ input: resp.Body as Readable, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

async function main(): Promise<void> {
  plog('[proc-backfill] start', { buildSha: resolveBuildSha(), tenant: TARGET_TENANT, mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN', source: `s3://${BUCKET}/${PROCEDURES_KEY}` });

  // 1. Load the tenant's ingested patients (mrn = Synthea UUID -> db id). Read-only, bounded (~25.6K rows).
  const patients = await prisma.patient.findMany({ where: { hospitalId: TARGET_TENANT }, select: { id: true, mrn: true } });
  const patientIdByMrn = new Map(patients.map((p) => [p.mrn, p.id]));
  plog('[proc-backfill] tenant patients loaded', { patients: patientIdByMrn.size });
  assertTenantPopulated(patientIdByMrn.size, TARGET_TENANT); // pre-flight tripwire

  const writer: ProcedureWriter = {
    createMany: (rows) => prisma.procedure.createMany({ data: rows as any, skipDuplicates: true }),
  };

  // AUDIT-220: capture the tenant's procedure count BEFORE any write - the independent idempotency signal
  // for assertStreamProgress (a 0-insert execute pass is idempotent iff the resolved set was already there).
  const priorExisting = EXECUTE ? await prisma.procedure.count({ where: { hospitalId: TARGET_TENANT } }) : 0;

  // 2. Stream + process. Progress cadence logged inside via a wrapper generator.
  let streamed = 0;
  async function* withProgress(src: AsyncIterable<string>): AsyncGenerator<string> {
    for await (const l of src) {
      if (++streamed % PROGRESS_EVERY === 0) plog('[proc-backfill] progress', { linesStreamed: streamed });
      yield l;
    }
  }
  const res = await processProcedureStream(withProgress(s3Lines(PROCEDURES_KEY)), patientIdByMrn, TARGET_TENANT, EXECUTE, writer);

  // 3. Post-stream non-progress tripwire (AUDIT-115/016; AUDIT-220 idempotent-skip aware) - THROW on a real
  //    no-op, but ACCEPT a provable idempotent re-run (inserted 0 with the resolved set already present).
  const resolved = res.sourceRows - res.orphansDropped - res.inCsvCollisions;
  const progress: StreamProgress = { sourceRows: res.sourceRows, resolved, inserted: res.inserted, execute: EXECUTE, priorExisting };
  assertStreamProgress(progress);
  const idempotent = isIdempotentSkip(progress);
  const skipped = resolved - res.inserted; // rows resolved but not inserted (duplicates on a re-run)

  // 4. Audit the write ONLY when it actually mutated (inserted > 0). A zero-mutation idempotent pass records
  //    nothing (an audit row attests a mutation) - the DONE-idempotent log line is the sole trace.
  if (EXECUTE && res.inserted > 0) {
    await prisma.auditLog.create({
      data: {
        hospitalId: TARGET_TENANT,
        userId: 'system:proc-backfill',
        userEmail: 'system@tailrd-heart.com',
        userRole: 'SYSTEM',
        action: 'PROCEDURES_BACKFILL',
        resourceType: 'Procedure',
        resourceId: null,
        description: `AUDIT-218 procedures backfill: inserted ${res.inserted} (source ${res.sourceRows}, orphans ${res.orphansDropped}, in-CSV collisions ${res.inCsvCollisions}) for ${TARGET_TENANT}`,
        newValues: { inserted: res.inserted, orphansDropped: res.orphansDropped, inCsvCollisions: res.inCsvCollisions, echoSnomed: res.echoSnomed } as any,
      } as any,
    });
  }

  if (idempotent) {
    // A successful no-op re-run: distinct log line, exit 0, no audit row.
    plog('[proc-backfill] DONE idempotent', { inserted: 0, skipped, resolved, priorExisting });
  } else {
    plog('[proc-backfill] DONE', {
      mode: EXECUTE ? 'EXECUTE' : 'DRY-RUN',
      sourceRows: res.sourceRows,
      orphansDropped: res.orphansDropped,
      inCsvCollisions: res.inCsvCollisions,
      resolved,
      [EXECUTE ? 'inserted' : 'wouldInsert']: res.inserted,
      ...(EXECUTE ? { skipped } : {}),
      echoSnomed: res.echoSnomed,
    });
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => { plog('[proc-backfill] FAILED', { error: err instanceof Error ? err.message : String(err) }); process.exit(1); });
}
