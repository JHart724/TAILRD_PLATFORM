/**
 * AUDIT-113 - Patient PHI decrypt blast-radius probe (READ-ONLY).
 *
 * Phase A diagnostic for AUDIT-113 (production HTTP 500 on
 * GET /api/modules/heart-failure/patients): a Patient record in the HF cohort
 * fails fail-loud PHI decrypt-on-read (modules.ts:309 -> $extends middleware ->
 * decryptAny). The HF-worklist 500 logged error.message="UnknownError"; the
 * STEP-1 firstName-provenance interim probe (task 79cfa932, 2026-06-06) found a
 * DIFFERENT signature (firstName purpose-mismatch -> InvalidCiphertextException),
 * so the UnknownError cause is most likely in an untested field (mrn /
 * dateOfBirth) and/or a different envelope class. This probe resolves the true,
 * full-table blast radius across ALL FOUR worklist-selected PHI fields.
 *
 * ------------------------------------------------------------------------------
 * READ-ONLY guarantees (verified against backend/src/lib/prisma.ts wiring):
 *   - NO database writes. The $extends extension chain is
 *     tracing -> PHI-encryption -> BAA-guard -> tenant-guard -> engine. NONE of
 *     these writes AuditLog on a READ; the DB-writing auditLogger is Express
 *     route middleware, NOT a client extension, and is never invoked by a script.
 *   - Guard violation writes are AVOIDED: every primary read is hospitalId-scoped
 *     (tenant guard satisfied -> no violation row). The BAA guard writes a DB
 *     AuditLog row only on a baaExecuted=false hospital; such hospitals are routed
 *     through the raw + manual canonical-decrypt fallback (Pass 1b) which never
 *     touches the guarded client, so it emits zero writes. The canonical decrypt
 *     ERROR is identical on both paths (the guard gates access, not the decrypt).
 *   - Net AuditLog writes emitted by this probe: 0. Lifecycle is logged via the
 *     Winston `logger` (stdout -> CloudWatch via the AUDIT-109 transport) only.
 *   - Honest label: read-only w.r.t. PHI content (no plaintext persisted or
 *     logged, NOT EVEN a prefix - tighter than the STEP-1 provenance probe) AND
 *     read-only w.r.t. the database (no AuditLog rows, no soak-telemetry
 *     pollution).
 *
 * PHI handling discipline (HIPAA 164.312(a)(2)(iv) + 164.514(e)):
 *   - Decrypted plaintext is NEVER logged, persisted, or retained beyond the
 *     in-memory decrypt attempt (success is recorded as a boolean only). No
 *     plaintext prefix (the STEP-1 probe kept 10 chars; this one keeps none).
 *   - Only metadata is emitted: record id (internal CUID, not an identifier),
 *     hospitalId, field name, envelope version, decrypt pass/fail, error name +
 *     truncated error message + categorizeError category, and module-cohort
 *     membership. KMS error messages carry KMS metadata (key id / context), not
 *     patient PHI.
 *
 * ------------------------------------------------------------------------------
 * Three passes (operator-approved design, 2026-06-06):
 *   PASS 1  PRIMARY (production-faithful): per hospital, keyset-cursor over
 *           patient ids; read each record through the REAL $extends client
 *           (findFirst by id+hospitalId selecting the 4 PHI fields). This
 *           reproduces the EXACT error.name/message the production route sees.
 *           A throw -> the record enters the failing set. (Pass 1b: non-BAA
 *           hospitals use raw + manual canonical decrypt, identical outcome,
 *           zero guard writes.)
 *   PASS 2  SECONDARY (failing records only): raw $queryRawUnsafe fetch of the 4
 *           ciphertext columns; per field parseEnvelope (version) + decryptAny
 *           under canonical; on canonical failure, probe the alternate purposes
 *           and classify the envelope:
 *             - decrypts under an alternate purpose -> non-canonical-purpose:<p>
 *             - parseEnvelope throws / all purposes fail integrity -> corrupted
 *             - else -> wrong-key-or-context. Captures error.name + message +
 *             category per (record, field).
 *   PASS 3  COHORT (item d): for each of the 6 modules, run the EXACT route
 *           predicate (OR[{<flag>:true},{therapyGaps.some{module,resolvedAt:null}}])
 *           per hospital selecting id only (no decrypt), and intersect each
 *           module's member set with the failing set -> which module worklists
 *           sit on (or one record away from) the same 500.
 *
 * ------------------------------------------------------------------------------
 * Expected load / runtime (table ~6,105+ patients per STEP-1 offset 6100):
 *   PASS 1  ~6,105 records x 4 PHI fields = ~24,420 KMS Decrypt calls (one per
 *           V2 wrapped-DEK unwrap). PASS 2 adds (failingRecords x 4 fields x up
 *           to 3 purposes) - negligible unless the failing set is large. PASS 3
 *           does NO decrypt (id-only selects). KMS Decrypt cost ~$0.03/10k ->
 *           ~$0.08 total. Runtime ~10-30 min depending on KMS round-trip latency
 *           and --batch/--pause-ms; chunked + resumable so a throttle/interrupt
 *           is recoverable.
 *
 * Exit codes (deterministic; findings do NOT gate):
 *   0 = probe completed (regardless of how many failures found)
 *   2 = fatal (pre-flight fail, DB connect, unhandled exception, bad args)
 *
 * Usage (ECS run-task command override on the post-merge image; NEVER from a
 * developer machine - VPC-isolated Aurora + KMS):
 *   node -r tsx/cjs scripts/migrations/audit-113-patient-phi-decrypt-blast-radius.ts
 *   node -r tsx/cjs scripts/migrations/audit-113-patient-phi-decrypt-blast-radius.ts \
 *     --batch 500 --pause-ms 100 [--resume-hospital <id> --after-id <id>] [--limit-per-hospital N]
 *
 * Tests: backend/tests/scripts/migrations/audit-113-patient-phi-decrypt-blast-radius.test.ts
 *   (mirrors the audit-016-pr3-step-1-7-firstname-provenance.test.ts +
 *   audit-016-pr3-v2-rekey-purpose.test.ts precedent: mock client + decryptAny,
 *   assert classification / per-field map / cohort intersection / no-plaintext /
 *   exit codes).
 */

import prisma from '../../src/lib/prisma';
import { logger } from '../../src/utils/logger';
import { contextFor } from '../../src/middleware/phiEncryption';
import { decryptAny, type EncryptionContext } from '../../src/services/keyRotation';
import { parseEnvelope } from '../../src/services/envelopeFormat';
import {
  categorizeError,
  type ErrorCategory,
} from './audit-016-pr3-step-1-7-firstname-provenance';

// --- Constants ----------------------------------------------------------------

const MODEL_NAME = 'Patient';

// The four PHI fields the worklist routes select (modules.ts:320-325) and that
// the $extends middleware therefore decrypts on read.
export const TARGET_FIELDS = ['firstName', 'lastName', 'mrn', 'dateOfBirth'] as const;
export type TargetField = (typeof TARGET_FIELDS)[number];

// camelCase field -> raw SQL column reference (quoted where the column is
// camelCase in Postgres; `mrn` is lowercase so unquoted is fine but quote for
// uniformity).
const FIELD_COLUMN: Record<TargetField, string> = {
  firstName: '"firstName"',
  lastName: '"lastName"',
  mrn: '"mrn"',
  dateOfBirth: '"dateOfBirth"',
};

// Canonical purpose is probed first via contextFor() (the middleware's own
// context builder - imported, not reconstructed, so the probe decrypt is
// bit-identical to production). Alternate purposes are tried only on a canonical
// failure to classify the envelope (STEP-1 found firstName under
// phi-migration-v0v1-to-v2; phi-field is the kmsService direct-encrypt purpose).
const ALT_PURPOSES = ['phi-migration-v0v1-to-v2', 'phi-field'] as const;

// The 6 module worklist predicates (verbatim from modules.ts).
export const MODULES = [
  { key: 'heart-failure', flag: 'heartFailurePatient', module: 'HEART_FAILURE' },
  { key: 'electrophysiology', flag: 'electrophysiologyPatient', module: 'ELECTROPHYSIOLOGY' },
  { key: 'structural-heart', flag: 'structuralHeartPatient', module: 'STRUCTURAL_HEART' },
  { key: 'coronary-intervention', flag: 'coronaryPatient', module: 'CORONARY_INTERVENTION' },
  { key: 'valvular-disease', flag: 'valvularDiseasePatient', module: 'VALVULAR_DISEASE' },
  { key: 'peripheral-vascular', flag: 'peripheralVascularPatient', module: 'PERIPHERAL_VASCULAR' },
] as const;

const ERROR_MESSAGE_MAX_LEN = 200;

// --- CLI args -----------------------------------------------------------------

export interface Opts {
  readonly batch: number;
  readonly pauseMs: number;
  readonly resumeHospital?: string;
  readonly afterId?: string;
  readonly limitPerHospital?: number;
}

export function parseArgs(argv: readonly string[]): Opts {
  let batch = 500;
  let pauseMs = 100;
  let resumeHospital: string | undefined;
  let afterId: string | undefined;
  let limitPerHospital: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--batch') {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v < 1 || v > 5000) throw new Error(`--batch must be 1-5000; got '${argv[i]}'`);
      batch = v;
    } else if (a === '--pause-ms') {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v < 0 || v > 60000) throw new Error(`--pause-ms must be 0-60000; got '${argv[i]}'`);
      pauseMs = v;
    } else if (a === '--resume-hospital') {
      resumeHospital = argv[++i];
      if (!resumeHospital) throw new Error('--resume-hospital requires a hospital id');
    } else if (a === '--after-id') {
      afterId = argv[++i];
      if (!afterId) throw new Error('--after-id requires a patient id');
    } else if (a === '--limit-per-hospital') {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v < 1) throw new Error(`--limit-per-hospital must be a positive integer; got '${argv[i]}'`);
      limitPerHospital = v;
    } else {
      throw new Error(`Unknown argument: '${a}'`);
    }
  }
  return { batch, pauseMs, resumeHospital, afterId, limitPerHospital };
}

// --- Result types -------------------------------------------------------------

export type EnvelopeClass =
  | `non-canonical-purpose:${string}`
  | 'corrupted-or-unparseable'
  | 'wrong-key-or-context'
  | 'canonical-ok'; // field decrypts under canonical (not the failing field)

export interface FieldFailure {
  readonly field: TargetField;
  readonly envelopeVersion: string | 'unparseable' | 'absent';
  readonly canonicalErrorName: string | null;
  readonly canonicalErrorMessage: string | null;
  readonly canonicalCategory: ErrorCategory | null;
  readonly envelopeClass: EnvelopeClass;
}

export interface FailingRecord {
  readonly id: string;
  readonly hospitalId: string;
  readonly path: 'real-client' | 'raw-fallback';
  readonly primaryErrorName: string;
  readonly primaryErrorMessage: string;
  readonly primaryCategory: ErrorCategory;
  perField: FieldFailure[]; // filled in Pass 2
}

export interface ProbeSummary {
  readonly audit: 'AUDIT-113';
  readonly mode: 'patient-phi-decrypt-blast-radius';
  readonly startedAtUTC: string;
  readonly stoppedAtUTC: string;
  readonly wallClockMs: number;
  readonly totalHospitals: number;
  readonly totalPatients: number;
  readonly totalRealClientReads: number;
  readonly totalRawFallbackReads: number;
  readonly kmsCanonicalDecryptsApprox: number;
  readonly kmsSecondaryProbes: number;
  readonly auditLogWritesEmitted: number; // designed to be 0
  readonly failingRecordCount: number;
  readonly failingRecordIds: string[];
  readonly perFieldFailureMap: Record<TargetField, number>;
  readonly envelopeClassMap: Record<string, number>;
  readonly primaryCategoryMap: Record<string, number>;
  readonly perModuleIntersection: Record<string, { cohortSize: number; failingMembers: string[] }>;
  readonly failures: FailingRecord[];
}

// --- Helpers ------------------------------------------------------------------

function truncate(msg: string): string {
  return msg.length > ERROR_MESSAGE_MAX_LEN ? `${msg.slice(0, ERROR_MESSAGE_MAX_LEN)}...[truncated]` : msg;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Build an EncryptionContext for a given purpose (canonical via contextFor; alt
// purposes by overriding only `purpose`, preserving model+field binding).
function contextForPurpose(field: TargetField, purpose: string): EncryptionContext {
  return { ...contextFor(MODEL_NAME, field), purpose };
}

// Pass-1 production-faithful read of one record through the REAL $extends client.
// Returns null on success; on decrypt throw returns the captured error metadata.
export async function probeRecordViaRealClient(
  client: { patient: { findFirst: (args: unknown) => Promise<unknown> } },
  id: string,
  hospitalId: string,
): Promise<{ name: string; message: string; category: ErrorCategory } | null> {
  try {
    await client.patient.findFirst({
      where: { id, hospitalId },
      select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true },
    });
    return null; // decrypted cleanly (plaintext discarded, never logged)
  } catch (err) {
    const name = err instanceof Error ? err.name : 'NonError';
    const message = err instanceof Error ? err.message : String(err);
    return { name, message: truncate(message), category: categorizeError(err) };
  }
}

// Pass-2 per-field classification from raw ciphertext (no guard, no decrypt of
// non-failing fields beyond the canonical attempt). Never logs plaintext.
export async function classifyField(
  field: TargetField,
  rawValue: string | null,
  decrypt: (envelope: string, ctx: EncryptionContext) => Promise<string>,
  counters: { secondaryProbes: number },
): Promise<FieldFailure> {
  if (rawValue == null || rawValue === '') {
    return {
      field, envelopeVersion: 'absent', canonicalErrorName: null,
      canonicalErrorMessage: null, canonicalCategory: null, envelopeClass: 'canonical-ok',
    };
  }
  let version: string | 'unparseable' = 'unparseable';
  try {
    version = parseEnvelope(rawValue).version;
  } catch {
    version = 'unparseable';
  }
  // Canonical attempt (the production read path; contextFor = the middleware's
  // own context builder, so this decrypt is bit-identical to production).
  counters.secondaryProbes++;
  try {
    await decrypt(rawValue, contextFor(MODEL_NAME, field));
    return {
      field, envelopeVersion: version, canonicalErrorName: null,
      canonicalErrorMessage: null, canonicalCategory: null, envelopeClass: 'canonical-ok',
    };
  } catch (err) {
    const canonicalErrorName = err instanceof Error ? err.name : 'NonError';
    const canonicalErrorMessage = truncate(err instanceof Error ? err.message : String(err));
    const canonicalCategory = categorizeError(err);
    if (version === 'unparseable') {
      return { field, envelopeVersion: version, canonicalErrorName, canonicalErrorMessage, canonicalCategory, envelopeClass: 'corrupted-or-unparseable' };
    }
    // Probe alternate purposes to detect a purpose-mismatch (non-canonical write).
    for (const purpose of ALT_PURPOSES) {
      counters.secondaryProbes++;
      try {
        await decrypt(rawValue, contextForPurpose(field, purpose));
        return { field, envelopeVersion: version, canonicalErrorName, canonicalErrorMessage, canonicalCategory, envelopeClass: `non-canonical-purpose:${purpose}` };
      } catch {
        // try next purpose
      }
    }
    // Failed canonical AND every alternate purpose: integrity/key/context failure.
    const envelopeClass: EnvelopeClass =
      canonicalCategory === 'IntegrityCheckFailed' ? 'corrupted-or-unparseable' : 'wrong-key-or-context';
    return { field, envelopeVersion: version, canonicalErrorName, canonicalErrorMessage, canonicalCategory, envelopeClass };
  }
}

// --- Entrypoint ---------------------------------------------------------------

export async function run(opts: Opts): Promise<number> {
  const startMs = Date.now();
  const startedAtUTC = new Date().toISOString();

  if (!process.env.PHI_ENCRYPTION_KEY) {
    console.error('PRE_FLIGHT_FAILED: PHI_ENCRYPTION_KEY is required (cannot probe decrypt without the key).');
    return 2;
  }

  logger.warn('AUDIT-113 decrypt blast-radius probe START (read-only; no DB writes; no plaintext logged)', {
    actor: 'system:audit-113-decrypt-blast-radius-probe', reason: 'AUDIT-113 Phase A',
    batch: opts.batch, pauseMs: opts.pauseMs,
  });

  const counters = { realReads: 0, rawFallbackReads: 0, secondaryProbes: 0, auditWrites: 0 };
  const failures: FailingRecord[] = [];

  // -- Pass 0: enumerate hospitals (id + baaExecuted; Hospital is not PHI) --
  const hospitals = (await prisma.hospital.findMany({
    select: { id: true, baaExecuted: true },
    orderBy: { id: 'asc' },
  })) as Array<{ id: string; baaExecuted: boolean }>;

  let totalPatients = 0;
  const resumeIdx = opts.resumeHospital ? hospitals.findIndex((h) => h.id === opts.resumeHospital) : 0;
  const startIdx = resumeIdx < 0 ? 0 : resumeIdx;

  // -- Pass 1: production-faithful per-record read, keyset-cursor per hospital --
  for (let h = startIdx; h < hospitals.length; h++) {
    const hospital = hospitals[h];
    let cursor: string | undefined = h === startIdx ? opts.afterId : undefined;
    let processedInHospital = 0;
    for (;;) {
      const idRows = (await prisma.patient.findMany({
        where: { hospitalId: hospital.id, ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: opts.batch,
      })) as Array<{ id: string }>;
      if (idRows.length === 0) break;

      for (const { id } of idRows) {
        totalPatients++;
        processedInHospital++;
        if (hospital.baaExecuted) {
          counters.realReads++;
          // 4 PHI fields decrypted per read -> ~4 KMS Decrypt calls.
          const errMeta = await probeRecordViaRealClient(prisma as never, id, hospital.id);
          if (errMeta) {
            failures.push({ id, hospitalId: hospital.id, path: 'real-client', primaryErrorName: errMeta.name, primaryErrorMessage: errMeta.message, primaryCategory: errMeta.category, perField: [] });
          }
        } else {
          // Pass 1b: non-BAA hospital -> raw + manual canonical decrypt (no
          // guarded client -> zero BAA-violation writes; identical decrypt error).
          counters.rawFallbackReads++;
          const raw = await fetchRawFields(id);
          const firstErr = await firstCanonicalFailure(raw, counters);
          if (firstErr) {
            failures.push({ id, hospitalId: hospital.id, path: 'raw-fallback', primaryErrorName: firstErr.name, primaryErrorMessage: firstErr.message, primaryCategory: firstErr.category, perField: [] });
          }
        }
        cursor = id;
        if (opts.limitPerHospital && processedInHospital >= opts.limitPerHospital) break;
      }

      logger.warn('AUDIT-113 probe PROGRESS', {
        hospital: hospital.id, processedInHospital, lastId: cursor,
        failuresSoFar: failures.length, totalPatients,
      });
      if (opts.pauseMs > 0) await sleep(opts.pauseMs);
      if (idRows.length < opts.batch) break;
      if (opts.limitPerHospital && processedInHospital >= opts.limitPerHospital) break;
    }
  }

  // -- Pass 2: per-field classification for failing records only --
  for (const rec of failures) {
    const raw = await fetchRawFields(rec.id);
    for (const field of TARGET_FIELDS) {
      rec.perField.push(await classifyField(field, raw[field], decryptAny, counters));
    }
  }

  // -- Pass 3: cohort intersection per module (id-only; no decrypt) --
  const failingIdSet = new Set(failures.map((f) => f.id));
  const perModuleIntersection: Record<string, { cohortSize: number; failingMembers: string[] }> = {};
  for (const m of MODULES) {
    let cohortSize = 0;
    const failingMembers: string[] = [];
    for (const hospital of hospitals) {
      const members = (await prisma.patient.findMany({
        where: {
          hospitalId: hospital.id,
          isActive: true,
          OR: [
            { [m.flag]: true } as Record<string, boolean>,
            { therapyGaps: { some: { module: m.module as never, resolvedAt: null } } },
          ],
        },
        select: { id: true },
      })) as Array<{ id: string }>;
      cohortSize += members.length;
      for (const { id } of members) if (failingIdSet.has(id)) failingMembers.push(id);
    }
    perModuleIntersection[m.key] = { cohortSize, failingMembers };
  }

  // -- Build + emit summary --
  const perFieldFailureMap: Record<TargetField, number> = { firstName: 0, lastName: 0, mrn: 0, dateOfBirth: 0 };
  const envelopeClassMap: Record<string, number> = {};
  const primaryCategoryMap: Record<string, number> = {};
  for (const rec of failures) {
    primaryCategoryMap[rec.primaryCategory] = (primaryCategoryMap[rec.primaryCategory] ?? 0) + 1;
    for (const ff of rec.perField) {
      if (ff.envelopeClass !== 'canonical-ok') {
        perFieldFailureMap[ff.field]++;
        envelopeClassMap[ff.envelopeClass] = (envelopeClassMap[ff.envelopeClass] ?? 0) + 1;
      }
    }
  }

  const summary: ProbeSummary = {
    audit: 'AUDIT-113',
    mode: 'patient-phi-decrypt-blast-radius',
    startedAtUTC,
    stoppedAtUTC: new Date().toISOString(),
    wallClockMs: Date.now() - startMs,
    totalHospitals: hospitals.length,
    totalPatients,
    totalRealClientReads: counters.realReads,
    totalRawFallbackReads: counters.rawFallbackReads,
    kmsCanonicalDecryptsApprox: counters.realReads * TARGET_FIELDS.length + counters.rawFallbackReads * TARGET_FIELDS.length,
    kmsSecondaryProbes: counters.secondaryProbes,
    auditLogWritesEmitted: counters.auditWrites,
    failingRecordCount: failures.length,
    failingRecordIds: failures.map((f) => f.id),
    perFieldFailureMap,
    envelopeClassMap,
    primaryCategoryMap,
    perModuleIntersection,
    failures,
  };

  console.log('---AUDIT_113_PATIENT_PHI_DECRYPT_BLAST_RADIUS---');
  console.log(JSON.stringify(summary, null, 2));
  console.log('---END---');

  logger.warn('AUDIT-113 decrypt blast-radius probe COMPLETE', {
    actor: 'system:audit-113-decrypt-blast-radius-probe',
    failingRecordCount: failures.length, totalPatients,
    auditLogWritesEmitted: counters.auditWrites,
  });
  return 0;
}

// Raw ciphertext fetch (bypasses the middleware; no decrypt, no guard).
async function fetchRawFields(id: string): Promise<Record<TargetField, string | null>> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT ${FIELD_COLUMN.firstName} AS "firstName", ${FIELD_COLUMN.lastName} AS "lastName",
            ${FIELD_COLUMN.mrn} AS "mrn", ${FIELD_COLUMN.dateOfBirth} AS "dateOfBirth"
     FROM "patients" WHERE id = $1 LIMIT 1`,
    id,
  )) as Array<Record<TargetField, string | null>>;
  const r = rows[0] ?? { firstName: null, lastName: null, mrn: null, dateOfBirth: null };
  return r;
}

// Pass-1b: reproduce the production canonical decrypt error from raw ciphertext
// (used for non-BAA hospitals to avoid a BAA-guard write). Returns the first
// field's canonical-decrypt failure, mirroring the middleware's first-throw-wins.
async function firstCanonicalFailure(
  raw: Record<TargetField, string | null>,
  counters: { secondaryProbes: number },
): Promise<{ name: string; message: string; category: ErrorCategory } | null> {
  for (const field of TARGET_FIELDS) {
    const v = raw[field];
    if (v == null || v === '' || !v.startsWith('enc:')) continue;
    counters.secondaryProbes++;
    try {
      await decryptAny(v, contextFor(MODEL_NAME, field));
    } catch (err) {
      return {
        name: err instanceof Error ? err.name : 'NonError',
        message: truncate(err instanceof Error ? err.message : String(err)),
        category: categorizeError(err),
      };
    }
  }
  return null;
}

// --- CLI guard ----------------------------------------------------------------

if (require.main === module) {
  (async () => {
    let opts: Opts;
    try {
      opts = parseArgs(process.argv.slice(2));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(2);
    }
    try {
      const code = await run(opts);
      await prisma.$disconnect();
      process.exit(code);
    } catch (err) {
      console.error('FATAL', err instanceof Error ? err.message : String(err));
      console.log('---AUDIT_113_PATIENT_PHI_DECRYPT_BLAST_RADIUS---');
      console.log(JSON.stringify({ audit: 'AUDIT-113', fatal: true, error: err instanceof Error ? err.message : String(err) }, null, 2));
      console.log('---END---');
      await prisma.$disconnect().catch(() => undefined);
      process.exit(2);
    }
  })();
}
