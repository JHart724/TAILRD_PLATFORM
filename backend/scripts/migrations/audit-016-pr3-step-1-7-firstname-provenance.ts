/**
 * AUDIT-016 PR 3 STEP 1.7 - patients.firstName envelope provenance probe.
 *
 * Read-only multi-purpose decrypt diagnostic. Sister to
 * audit-016-pr3-spotcheck-decrypt.ts (PR #272, PR #273, PR #278). Authored
 * 2026-05-18 in response to §10.7 PARTIAL verdict where 5 of 5
 * patients.firstName samples failed decrypt under canonical 'phi-encryption'
 * purpose with decryptError="UnknownError", while 23 of 24 other V2-emitting
 * targets passed 5/5.
 *
 * 4-axis test design (per Phase G investigation):
 *   AXIS A keyset-offset stratification: 5 offsets (0, 50, 1500, 3000, 6100)
 *     x 5 samples each = 25 firstName envelopes probed. Offset 0 + 50 cover
 *     the §10.4 SKIP_CANONICAL abort cohort; >=1500 covers rows the
 *     all-skip safety abort never reached.
 *   AXIS B control rows: 25 lastName envelopes fetched from the SAME
 *     patient.id as firstName samples. Expected: all decrypt under
 *     canonical purpose (lastName passed 5/5 in §10.7).
 *   AXIS C write-time correlation: createdAt + updatedAt captured per row;
 *     samples bucketed pre/in/post AUDIT-084 deployment window
 *     (2026-05-07 to 2026-05-10 task-def env-var gap).
 *   AXIS D multi-purpose decrypt: each envelope attempted under three
 *     purposes: canonical (CANONICAL_PHI_PURPOSE imported from
 *     phiEncryption.ts; single source of truth per §17.1 15th-entry),
 *     'phi-migration-v0v1-to-v2' (V0/V1->V2 migration; v0v1-to-v2.ts L99),
 *     'phi-field' (kmsService direct-encrypt; kmsService.ts L81).
 *
 * Sister architecture:
 *   - audit-016-pr3-spotcheck-decrypt.ts (raw-SQL fetch pattern L129-144,
 *     decryptAny invocation L170, entrypoint guard L447-481, SUMMARY_ARTIFACT
 *     writer L301-308; canonical purpose import from phiEncryption.ts
 *     post-§17.1-15th-entry refactor)
 *   - audit-016-pr3-v0v1-to-v2.ts (preFlightValidate import; sister discipline)
 *
 * Sister-pattern divergence (CONSCIOUS):
 *   This script captures plaintextPrefix (first 10 chars) per PerPurposeResult.
 *   spotcheck-decrypt.ts ShapeCheckResult records ONLY plaintextLength (no
 *   prefix; GROUP E PHI-exposure regression guard at test L300-329 asserts
 *   no plaintext field). This probe diverges intentionally per operator
 *   Phase G.4 spec: the 10-char prefix is necessary to distinguish expected
 *   patient PII ("Patient" literal at 7 chars from ingestSynthea/patientWriter
 *   ingest paths, or actual short given-name) from KMS garbage. HIPAA
 *   §164.514(e) limited-dataset compliant; 10 chars is far below the
 *   250-char identifier threshold and tightens spec-default 30 per operator
 *   Decision 2. The probe is a one-shot diagnostic; not a recurring path.
 *
 * Pass criteria (per envelope-purpose probe):
 *   success = decryptAny returns plaintext without throwing
 *   failure = decryptAny throws; error categorized into:
 *               InvalidCiphertextException, AccessDeniedException,
 *               KMSInvalidStateException, IncorrectKeyException,
 *               IntegrityCheckFailed, EnvelopeFormatError, UnknownError
 *
 * PHI handling discipline (HIPAA §164.312(a)(2)(iv) + §164.312(b)):
 *   - Plaintext NEVER persisted beyond length + first 10 chars (CONSCIOUS
 *     divergence from spotcheck-decrypt.ts; justified above).
 *   - SUMMARY_ARTIFACT records ONLY metadata + plaintextPrefix(10).
 *   - Audit events Winston-only (PHI_PROVENANCE_PROBE_SAMPLE +
 *     PHI_PROVENANCE_PROBE_COMPLETED).
 *   - READ-access audit-trail anchor per §164.312(b).
 *   - NO DB writes anywhere in this script.
 *
 * EncryptionContext binding (CRITICAL):
 *   Each purpose probe constructs a fresh context with that purpose plus
 *   correct model + field. KMS EncryptionContext is binding at the
 *   envelopeDecrypt layer; this is exactly the binding behavior the probe
 *   is designed to exploit (test which purpose the envelope was written
 *   under).
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-016-pr3-step-1-7-firstname-provenance.ts
 *   npx tsx backend/scripts/migrations/audit-016-pr3-step-1-7-firstname-provenance.ts \
 *     --samples-per-offset 10 --offsets 0,50,1500,3000,6100
 *
 * Exit codes:
 *   0 = all envelopes probed (diagnostic; per-purpose pass/fail does not gate)
 *   2 = fatal error (pre-flight fail, DB connect, unhandled exception,
 *       argument parse error)
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';
import { auditLogger } from '../../src/middleware/auditLogger';
import { CANONICAL_PHI_PURPOSE } from '../../src/middleware/phiEncryption';
import {
  decryptAny,
  type EncryptionContext,
} from '../../src/services/keyRotation';
import { preFlightValidate } from './audit-016-pr3-v0v1-to-v2';

// Constants (sister to spotcheck-decrypt.ts L64-71)
const SERVICE_NAME = 'tailrd-backend';
const MODEL_NAME = 'Patient';

// Purposes to probe. CANONICAL_PHI_PURPOSE imported from phiEncryption.ts
// per §17.1 15th-entry single-source-of-truth discipline (codified
// 2026-05-18; readers import, do not hardcode). Legacy
// 'phi-migration-v0v1-to-v2' is the V0/V1-to-V2 migration source purpose
// (audit-016-pr3-v0v1-to-v2.ts L99). 'phi-field' is the kmsService direct-
// encrypt purpose (kmsService.ts L81); included to rule out the unlikely
// scenario of direct-KMS-encrypted patient PHI surfacing in a V2 slot.
export const PURPOSES_TO_PROBE = [
  CANONICAL_PHI_PURPOSE,
  'phi-migration-v0v1-to-v2',
  'phi-field',
] as const;

export type Purpose = (typeof PURPOSES_TO_PROBE)[number];

// AXIS A default keyset offsets.
export const DEFAULT_OFFSETS = [0, 50, 1500, 3000, 6100] as const;
export const DEFAULT_SAMPLES_PER_OFFSET = 5;

// AXIS C AUDIT-084 deployment window bounds.
export const AUDIT_084_WINDOW_START = new Date('2026-05-07T00:00:00Z');
export const AUDIT_084_WINDOW_END   = new Date('2026-05-10T00:00:00Z');

// PHI-safe prefix length (HIPAA §164.514(e) limited-dataset).
// Operator Decision 2 (2026-05-18): 10 chars tightens default 30 while
// preserving "Patient" literal + short given-name diagnostic discrimination.
const PLAINTEXT_PREFIX_LEN = 10;
const ENVELOPE_PREVIEW_LEN = 50;
const ERROR_MESSAGE_MAX_LEN = 200;

// CLI args
export interface Opts {
  readonly samplesPerOffset: number;
  readonly offsets: readonly number[];
}

export function parseArgs(argv: readonly string[]): Opts {
  let samplesPerOffset = DEFAULT_SAMPLES_PER_OFFSET;
  let offsets: readonly number[] = DEFAULT_OFFSETS;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--samples-per-offset') {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error(`--samples-per-offset must be 1-100; got '${raw}'`);
      }
      samplesPerOffset = parsed;
    } else if (a === '--offsets') {
      const raw = argv[++i];
      if (raw === undefined || raw.trim() === '') {
        throw new Error(`--offsets must be comma-separated non-negative integers; got '${raw}'`);
      }
      const parts = raw.split(',').map((s) => s.trim());
      if (parts.some((s) => s === '')) {
        throw new Error(`--offsets must be comma-separated non-negative integers; got '${raw}'`);
      }
      const parsed = parts.map((s) => Number(s));
      if (parsed.length === 0 || parsed.some((n) => !Number.isFinite(n) || n < 0 || !Number.isInteger(n))) {
        throw new Error(`--offsets must be comma-separated non-negative integers; got '${raw}'`);
      }
      offsets = parsed;
    } else if (a === '--dry-run') {
      // Accepted for parity with sister scripts; script is read-only by design.
    } else {
      throw new Error(`Unknown argument: '${a}'`);
    }
  }
  return { samplesPerOffset, offsets };
}

// Sample fetch (raw SQL bypassing phiEncryption middleware)
// Sister to spotcheck-decrypt.ts L129-144.
export interface SampleRow {
  readonly id: string;
  readonly firstNameEnvelope: string;
  readonly lastNameEnvelope: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly offsetGroup: number;
}

export async function sampleRowsAtOffset(
  prismaClient: Pick<typeof prisma, '$queryRawUnsafe'>,
  offset: number,
  limit: number,
): Promise<SampleRow[]> {
  const rows = await prismaClient.$queryRawUnsafe<Array<{
    id: string;
    firstNameEnv: string;
    lastNameEnv: string;
    createdAt: Date;
    updatedAt: Date;
  }>>(
    `SELECT id, "firstName" AS "firstNameEnv", "lastName" AS "lastNameEnv",
            "createdAt", "updatedAt"
     FROM "patients"
     WHERE "firstName" LIKE 'enc:v2:%' AND "lastName" LIKE 'enc:v2:%'
     ORDER BY id ASC
     LIMIT ${limit} OFFSET ${offset}`,
  );
  return rows.map((r) => ({
    id: r.id,
    firstNameEnvelope: r.firstNameEnv,
    lastNameEnvelope: r.lastNameEnv,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    offsetGroup: offset,
  }));
}

// Decrypt error categorization
export type ErrorCategory =
  | 'InvalidCiphertextException'
  | 'AccessDeniedException'
  | 'KMSInvalidStateException'
  | 'IncorrectKeyException'
  | 'IntegrityCheckFailed'
  | 'EnvelopeFormatError'
  | 'UnknownError';

export function categorizeError(err: unknown): ErrorCategory {
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err);
  if (name === 'InvalidCiphertextException' || message.includes('InvalidCiphertextException')) return 'InvalidCiphertextException';
  if (name === 'AccessDeniedException' || message.includes('AccessDeniedException') || message.includes('AccessDenied')) return 'AccessDeniedException';
  if (name === 'KMSInvalidStateException' || message.includes('KMSInvalidStateException')) return 'KMSInvalidStateException';
  if (name === 'IncorrectKeyException' || message.includes('IncorrectKeyException')) return 'IncorrectKeyException';
  if (name === 'EnvelopeFormatError' || message.includes('EnvelopeFormatError')) return 'EnvelopeFormatError';
  if (message.includes('integrity check failed')) return 'IntegrityCheckFailed';
  return 'UnknownError';
}

// Multi-purpose decrypt probe
export interface PerPurposeResult {
  readonly purpose: Purpose;
  readonly success: boolean;
  readonly plaintextLength: number;
  readonly plaintextPrefix: string;
  readonly errorCategory?: ErrorCategory;
  readonly errorMessage?: string;
}

export async function probePurposes(
  envelope: string,
  field: string,
  purposes: readonly Purpose[],
  decryptFn: (env: string, ctx: EncryptionContext) => Promise<string> = decryptAny,
): Promise<PerPurposeResult[]> {
  const out: PerPurposeResult[] = [];
  for (const purpose of purposes) {
    const context: EncryptionContext = {
      service: SERVICE_NAME,
      purpose,
      model: MODEL_NAME,
      field,
    };
    try {
      const plaintext = await decryptFn(envelope, context);
      out.push({
        purpose,
        success: true,
        plaintextLength: plaintext.length,
        plaintextPrefix: plaintext.slice(0, PLAINTEXT_PREFIX_LEN),
      });
    } catch (err) {
      const cat = categorizeError(err);
      const msg = err instanceof Error ? err.message : String(err);
      out.push({
        purpose,
        success: false,
        plaintextLength: 0,
        plaintextPrefix: '',
        errorCategory: cat,
        errorMessage: msg.slice(0, ERROR_MESSAGE_MAX_LEN),
      });
    }
  }
  return out;
}

// Write-time bucket categorization (AXIS C)
export type WriteTimeBucket = 'pre-audit-084' | 'in-audit-084-window' | 'post-audit-084';

export function categorizeWriteTime(d: Date): WriteTimeBucket {
  if (d < AUDIT_084_WINDOW_START) return 'pre-audit-084';
  if (d >= AUDIT_084_WINDOW_END) return 'post-audit-084';
  return 'in-audit-084-window';
}

// Per-row probe result
export interface PerRowResult {
  readonly rowId: string;
  readonly offsetGroup: number;
  readonly createdAtUTC: string;
  readonly updatedAtUTC: string;
  readonly createdAtBucket: WriteTimeBucket;
  readonly updatedAtBucket: WriteTimeBucket;
  readonly firstName: {
    readonly envelopePreview: string;
    readonly envelopeLength: number;
    readonly perPurpose: readonly PerPurposeResult[];
  };
  readonly lastName: {
    readonly envelopePreview: string;
    readonly envelopeLength: number;
    readonly perPurpose: readonly PerPurposeResult[];
  };
}

// Per-row probe + audit-event emit
export async function probeSampleRow(row: SampleRow): Promise<PerRowResult> {
  const firstNameProbes = await probePurposes(row.firstNameEnvelope, 'firstName', PURPOSES_TO_PROBE);
  const lastNameProbes  = await probePurposes(row.lastNameEnvelope, 'lastName', PURPOSES_TO_PROBE);

  const createdBucket = categorizeWriteTime(row.createdAt);
  const updatedBucket = categorizeWriteTime(row.updatedAt);

  const result: PerRowResult = {
    rowId: row.id,
    offsetGroup: row.offsetGroup,
    createdAtUTC: row.createdAt.toISOString(),
    updatedAtUTC: row.updatedAt.toISOString(),
    createdAtBucket: createdBucket,
    updatedAtBucket: updatedBucket,
    firstName: {
      envelopePreview: row.firstNameEnvelope.slice(0, ENVELOPE_PREVIEW_LEN),
      envelopeLength: row.firstNameEnvelope.length,
      perPurpose: firstNameProbes,
    },
    lastName: {
      envelopePreview: row.lastNameEnvelope.slice(0, ENVELOPE_PREVIEW_LEN),
      envelopeLength: row.lastNameEnvelope.length,
      perPurpose: lastNameProbes,
    },
  };

  const firstAny = firstNameProbes.some((p) => p.success);
  const lastAny = lastNameProbes.some((p) => p.success);
  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:audit-016-pr3-firstname-provenance',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: null,
    action: 'PHI_PROVENANCE_PROBE_SAMPLE',
    resourceType: 'patients',
    resourceId: row.id,
    ipAddress: 'cli',
    description:
      `AUDIT-016 PR 3 STEP 1.7 firstName provenance probe row ${row.id} ` +
      `offsetGroup=${row.offsetGroup} createdAtBucket=${createdBucket} ` +
      `updatedAtBucket=${updatedBucket} ` +
      `firstName.anyPurposeSuccess=${firstAny} ` +
      `lastName.anyPurposeSuccess=${lastAny}`,
  });

  return result;
}

// Summary types
export interface PurposeTally {
  successCount: number;
  failureCount: number;
  errorCategoryTally: Record<string, number>;
}

export interface ProbeSummary {
  readonly audit: string;
  readonly mode: string;
  readonly samplesPerOffset: number;
  readonly offsets: readonly number[];
  readonly startedAtUTC: string;
  readonly stoppedAtUTC: string;
  readonly wallClockMs: number;
  readonly totalRowsFetched: number;
  readonly totalEnvelopesProbed: number;
  readonly perRow: readonly PerRowResult[];
  readonly purposeTally: Record<string, { firstName: PurposeTally; lastName: PurposeTally }>;
  readonly offsetGroupTally: Record<string, {
    firstNameSuccessAnyPurpose: number;
    lastNameSuccessAnyPurpose: number;
    totalRowsAtOffset: number;
  }>;
  readonly writeTimeBucketTally: Record<WriteTimeBucket, number>;
}

// SUMMARY_ARTIFACT writer (sister to spotcheck L301-308)
export async function writeProbeArtifact(envelope: object): Promise<string> {
  const dir = path.resolve(__dirname, '../../var');
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `audit-016-pr3-step-1-7-firstname-provenance-${ts}.json`);
  await fs.writeFile(file, JSON.stringify(envelope, null, 2), 'utf8');
  return file;
}

// Main
export async function main(opts: Opts): Promise<number> {
  const startedAtUTC = new Date().toISOString();
  const startMs = Date.now();

  const preFlight = preFlightValidate(process.env);
  if (!preFlight.ok) {
    console.error('PRE_FLIGHT_FAILED');
    for (const e of preFlight.errors) console.error(`  ERROR: ${e}`);
    for (const w of preFlight.warnings) console.error(`  WARN:  ${w}`);
    return 2;
  }
  for (const w of preFlight.warnings) console.error(`  WARN:  ${w}`);

  console.error('');
  console.error('AUDIT-016 PR 3 STEP 1.7 patients.firstName envelope provenance probe');
  console.error('Read-only multi-purpose decrypt diagnostic. No DB writes.');
  console.error(`Offsets: [${opts.offsets.join(', ')}]`);
  console.error(`Samples per offset: ${opts.samplesPerOffset}`);
  console.error(`Purposes probed: [${PURPOSES_TO_PROBE.join(', ')}]`);
  console.error('');

  const allRows: SampleRow[] = [];
  for (const offset of opts.offsets) {
    const rows = await sampleRowsAtOffset(prisma, offset, opts.samplesPerOffset);
    allRows.push(...rows);
    console.error(`OFFSET ${offset}: fetched ${rows.length} rows`);
  }

  const perRow: PerRowResult[] = [];
  for (const row of allRows) {
    const result = await probeSampleRow(row);
    perRow.push(result);
    const firstAny = result.firstName.perPurpose.some((p) => p.success);
    const lastAny = result.lastName.perPurpose.some((p) => p.success);
    console.error(
      `DONE row=${row.id} offset=${row.offsetGroup} ` +
        `firstName.any=${firstAny} lastName.any=${lastAny}`,
    );
  }

  // Build purposeTally
  const purposeTally: Record<string, { firstName: PurposeTally; lastName: PurposeTally }> = {};
  for (const purpose of PURPOSES_TO_PROBE) {
    purposeTally[purpose] = {
      firstName: { successCount: 0, failureCount: 0, errorCategoryTally: {} },
      lastName: { successCount: 0, failureCount: 0, errorCategoryTally: {} },
    };
  }
  for (const r of perRow) {
    for (const p of r.firstName.perPurpose) {
      const t = purposeTally[p.purpose].firstName;
      if (p.success) { t.successCount++; } else {
        t.failureCount++;
        const cat = p.errorCategory ?? 'UnknownError';
        t.errorCategoryTally[cat] = (t.errorCategoryTally[cat] ?? 0) + 1;
      }
    }
    for (const p of r.lastName.perPurpose) {
      const t = purposeTally[p.purpose].lastName;
      if (p.success) { t.successCount++; } else {
        t.failureCount++;
        const cat = p.errorCategory ?? 'UnknownError';
        t.errorCategoryTally[cat] = (t.errorCategoryTally[cat] ?? 0) + 1;
      }
    }
  }

  // Build offsetGroupTally
  const offsetGroupTally: Record<string, {
    firstNameSuccessAnyPurpose: number;
    lastNameSuccessAnyPurpose: number;
    totalRowsAtOffset: number;
  }> = {};
  for (const offset of opts.offsets) {
    offsetGroupTally[String(offset)] = {
      firstNameSuccessAnyPurpose: 0,
      lastNameSuccessAnyPurpose: 0,
      totalRowsAtOffset: 0,
    };
  }
  for (const r of perRow) {
    const t = offsetGroupTally[String(r.offsetGroup)];
    t.totalRowsAtOffset++;
    if (r.firstName.perPurpose.some((p) => p.success)) t.firstNameSuccessAnyPurpose++;
    if (r.lastName.perPurpose.some((p) => p.success)) t.lastNameSuccessAnyPurpose++;
  }

  // Build writeTimeBucketTally
  const writeTimeBucketTally: Record<WriteTimeBucket, number> = {
    'pre-audit-084': 0,
    'in-audit-084-window': 0,
    'post-audit-084': 0,
  };
  for (const r of perRow) {
    writeTimeBucketTally[r.createdAtBucket]++;
  }

  const stoppedAtUTC = new Date().toISOString();
  const wallClockMs = Date.now() - startMs;

  const summary: ProbeSummary = {
    audit: 'AUDIT-016-PR-3-STEP-1.7',
    mode: 'firstname-provenance-probe',
    samplesPerOffset: opts.samplesPerOffset,
    offsets: opts.offsets,
    startedAtUTC,
    stoppedAtUTC,
    wallClockMs,
    totalRowsFetched: allRows.length,
    totalEnvelopesProbed: allRows.length * 2,
    perRow,
    purposeTally,
    offsetGroupTally,
    writeTimeBucketTally,
  };

  let artifactPath = '<not written>';
  try {
    artifactPath = await writeProbeArtifact(summary);
    console.error(`PROVENANCE_ARTIFACT: ${artifactPath}`);
  } catch (artifactErr) {
    console.error(
      `PROVENANCE_ARTIFACT_WRITE_FAILED: ` +
        `${artifactErr instanceof Error ? artifactErr.message : String(artifactErr)}`,
    );
  }

  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:audit-016-pr3-firstname-provenance',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: null,
    action: 'PHI_PROVENANCE_PROBE_COMPLETED',
    resourceType: 'patients',
    resourceId: null,
    ipAddress: 'cli',
    description:
      `AUDIT-016 PR 3 STEP 1.7 firstName provenance probe COMPLETED ` +
      `totalRows=${allRows.length} ` +
      `totalProbes=${allRows.length * 2 * PURPOSES_TO_PROBE.length}`,
  });

  console.log('---AUDIT_016_PR3_STEP_1_7_FIRSTNAME_PROVENANCE---');
  console.log(JSON.stringify({ ...summary, artifactPath }, null, 2));
  console.log('---END---');

  return 0;
}

// Entrypoint guard (sister to spotcheck L447-481)
const invokedAsScript = require.main === module;

if (invokedAsScript) {
  let opts: Opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    void prisma.$disconnect().catch(() => {});
    process.exit(2);
  }
  main(opts)
    .then(async (code) => {
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch(async (err) => {
      console.error('FATAL', err);
      console.log('---AUDIT_016_PR3_STEP_1_7_FIRSTNAME_PROVENANCE---');
      console.log(
        JSON.stringify(
          {
            audit: 'AUDIT-016-PR-3-STEP-1.7',
            fatalError: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ),
      );
      console.log('---END---');
      await prisma.$disconnect().catch(() => {});
      process.exit(2);
    });
}
