/**
 * AUDIT-016 PR 3 STEP 1.7 - V2 envelope spot-check decrypt verification.
 *
 * Read-only verification script. Samples N random V2-encoded rows per
 * non-zero-V2 target from TARGETS (defined in audit-016-pr3-v0v1-to-v2.ts),
 * decrypts each via keyRotation.decryptAny with reconstructed
 * EncryptionContext, and applies 4 shape-check predicates per sample.
 *
 * Sister architecture:
 *   - audit-016-pr3-v0v1-to-v2.ts (consumes TARGETS export; reuses
 *     preFlightValidate; same writeSummaryArtifact + envelope-marker
 *     pattern; same entrypoint guard)
 *   - AUDIT-078 §9.1 quarterly cadence (this script is the permanent
 *     V2-envelope verification anchor; re-runnable quarterly against
 *     restore-test clusters per AUDIT-078 §5-§6 D3 (d))
 *
 * Pass criteria (per sample):
 *   (a) decryptAny returns without throwing
 *   (b) plaintext.length > 0 (non-empty)
 *   (c) !plaintext.startsWith('enc:v') (not envelope-encoded; sister to
 *       AUDIT-015 fail-loud discipline)
 *   (d) plaintext.length <= 10000 (reasonable size)
 *
 * PHI handling discipline (HIPAA §164.312(a)(2)(iv) + §164.312(b)):
 *   - Plaintext NEVER persisted outside immediate verification scope.
 *   - SUMMARY_ARTIFACT records ONLY metadata: length, success bool,
 *     first-30-char prefix (debugging operational issues only).
 *   - Audit events Winston-only (per-sample PHI_SPOTCHECK_VERIFIED +
 *     per-target boundary PHI_SPOTCHECK_TARGET_COMPLETED).
 *   - READ-access audit-trail anchor per §164.312(b).
 *
 * EncryptionContext binding (CRITICAL):
 *   The context must match the migration script's contextFor() exactly
 *   (audit-016-pr3-v0v1-to-v2.ts:455-457). KMS EncryptionContext is
 *   binding at the envelopeDecrypt layer; any mismatch causes decrypt
 *   failure regardless of key material.
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-016-pr3-spotcheck-decrypt.ts
 *   npx tsx backend/scripts/migrations/audit-016-pr3-spotcheck-decrypt.ts --batch-size 10
 *
 * Exit codes:
 *   0 = all samples pass
 *   1 = one or more samples fail (continue-on-error per sample)
 *   2 = fatal error (pre-flight fail, DB connect, unhandled exception,
 *       argument parse error)
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';
import { auditLogger } from '../../src/middleware/auditLogger';
import {
  decryptAny,
  type EncryptionContext,
} from '../../src/services/keyRotation';
import { TARGETS, preFlightValidate } from './audit-016-pr3-v0v1-to-v2';

type Target = (typeof TARGETS)[number];

// ── Constants (sister to migration script line 450-457) ────────────────────
// EncryptionContext base MUST match migration script exactly. KMS context
// is binding at the envelopeDecrypt layer.
const ENCRYPT_CONTEXT_BASE = {
  service: 'tailrd-backend',
  purpose: 'phi-migration-v0v1-to-v2',
} as const;

export function contextFor(t: Target): EncryptionContext {
  return { ...ENCRYPT_CONTEXT_BASE, model: t.model, field: t.column };
}

// ── CLI args ───────────────────────────────────────────────────────────────
export interface Opts {
  readonly batchSize: number;
}

export function parseArgs(argv: readonly string[]): Opts {
  let batchSize = 5;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--batch-size') {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error(`--batch-size must be 1-100; got '${raw}'`);
      }
      batchSize = parsed;
    } else if (a === '--dry-run') {
      // Accepted for parity with sister scripts; script is read-only by design.
    } else {
      throw new Error(`Unknown argument: '${a}'`);
    }
  }
  return { batchSize };
}

// ── Target filter (only targets with V2 rows present) ─────────────────────
export interface NonZeroV2Target {
  readonly target: Target;
  readonly rowCount: number;
}

export async function filterNonZeroV2Targets(
  prismaClient: Pick<typeof prisma, '$queryRawUnsafe'>,
  allTargets: readonly Target[],
): Promise<NonZeroV2Target[]> {
  const results: NonZeroV2Target[] = [];
  for (const t of allTargets) {
    const colExpr = t.kind === 'json' ? `"${t.column}"::text` : `"${t.column}"`;
    const pattern = t.kind === 'json' ? "'\"enc:v2:%'" : "'enc:v2:%'";
    const rows = await prismaClient.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${t.table}" WHERE ${colExpr} LIKE ${pattern}`,
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) {
      results.push({ target: t, rowCount: count });
    }
  }
  return results;
}

// ── Sample N random V2 row IDs + envelopes per target ─────────────────────
export interface SampleRow {
  readonly id: string;
  readonly envelope: string;
}

export async function sampleRowsForTarget(
  prismaClient: Pick<typeof prisma, '$queryRawUnsafe'>,
  t: Target,
  n: number,
): Promise<SampleRow[]> {
  // Raw SQL bypasses Prisma phiEncryption middleware to fetch CIPHERTEXT
  // directly. Middleware would auto-decrypt; we need encoded envelope.
  const selectExpr = t.kind === 'json' ? `"${t.column}"#>>'{}'` : `"${t.column}"`;
  const whereExpr = t.kind === 'json' ? `"${t.column}"::text LIKE '"enc:v2:%'` : `"${t.column}" LIKE 'enc:v2:%'`;
  return prismaClient.$queryRawUnsafe<SampleRow[]>(
    `SELECT id, ${selectExpr} AS envelope FROM "${t.table}"
     WHERE ${whereExpr}
     ORDER BY random()
     LIMIT ${n}`,
  );
}

// ── Shape-check predicates ────────────────────────────────────────────────
// PHI-exposure discipline (HIPAA §164.502(b) minimum necessary):
//   Verification records ONLY metadata about plaintext. Plaintext content
//   itself is NEVER recorded. The boolean predicate results carry sufficient
//   debugging context without exposing PHI. decryptError carries the
//   decrypt-layer error message (KMS / envelope-format / key-material), which
//   is plaintext-free by construction.
export interface ShapeCheckResult {
  readonly success: boolean;
  readonly plaintextLength: number;
  readonly predicateAResult: boolean;
  readonly predicateBResult: boolean;
  readonly predicateCResult: boolean;
  readonly predicateDResult: boolean;
  readonly decryptError?: string;
}

export async function shapeCheck(
  envelope: string,
  context: EncryptionContext,
  decryptFn: (env: string, ctx: EncryptionContext) => Promise<string> = decryptAny,
): Promise<ShapeCheckResult> {
  let plaintext: string;
  try {
    plaintext = await decryptFn(envelope, context);
  } catch (err) {
    return {
      success: false,
      plaintextLength: 0,
      predicateAResult: false,
      predicateBResult: false,
      predicateCResult: false,
      predicateDResult: false,
      decryptError: err instanceof Error ? err.message : String(err),
    };
  }
  const predicateBResult = plaintext.length > 0;
  const predicateCResult = !plaintext.startsWith('enc:v');
  const predicateDResult = plaintext.length <= 10000;
  return {
    success: predicateBResult && predicateCResult && predicateDResult,
    plaintextLength: plaintext.length,
    predicateAResult: true,
    predicateBResult,
    predicateCResult,
    predicateDResult,
  };
}

// ── Per-sample + per-target result types ──────────────────────────────────
// PHI-exposure discipline: SampleResult carries metadata only. No plaintext
// content is persisted (sister to ShapeCheckResult). decryptError is
// plaintext-free by construction (KMS / envelope-format / key-material
// error messages do not leak record values).
export interface SampleResult {
  readonly target: string;
  readonly rowId: string;
  readonly success: boolean;
  readonly plaintextLength: number;
  readonly predicateAResult: boolean;
  readonly predicateBResult: boolean;
  readonly predicateCResult: boolean;
  readonly predicateDResult: boolean;
  readonly decryptError?: string;
}

export interface TargetDetail {
  readonly target: string;
  readonly totalRows: number;
  readonly sampleSize: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly sampleResults: readonly SampleResult[];
}

// ── Per-target spot-check (audit-event side effects + decryption) ─────────
export async function spotCheckTarget(
  t: Target,
  totalRows: number,
  sampleSize: number,
): Promise<TargetDetail> {
  const targetLabel = `${t.table}.${t.column}`;
  const samples = await sampleRowsForTarget(prisma, t, sampleSize);
  const context = contextFor(t);
  const sampleResults: SampleResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  for (const row of samples) {
    const check = await shapeCheck(row.envelope, context);
    const result: SampleResult = {
      target: targetLabel,
      rowId: row.id,
      success: check.success,
      plaintextLength: check.plaintextLength,
      predicateAResult: check.predicateAResult,
      predicateBResult: check.predicateBResult,
      predicateCResult: check.predicateCResult,
      predicateDResult: check.predicateDResult,
      decryptError: check.decryptError,
    };
    sampleResults.push(result);
    if (check.success) {
      successCount++;
    } else {
      failureCount++;
    }
    // Per-sample audit event (Winston-only; HIPAA §164.312(b) read-trail).
    // PHI-exposure discipline: only metadata (length + predicate bools + decrypt
    // error message which is plaintext-free by construction).
    auditLogger.info('audit_event', {
      timestamp: new Date().toISOString(),
      userId: 'system:audit-016-pr3-spotcheck',
      userEmail: 'system@tailrd-heart.com',
      userRole: 'SYSTEM',
      hospitalId: null,
      action: 'PHI_SPOTCHECK_VERIFIED',
      resourceType: t.table,
      resourceId: row.id,
      ipAddress: 'cli',
      description:
        `AUDIT-016 PR 3 STEP 1.7 spot-check: ${targetLabel} ` +
        `success=${check.success} length=${check.plaintextLength} ` +
        `predicates=A:${check.predicateAResult ? 'P' : 'F'}` +
        `B:${check.predicateBResult ? 'P' : 'F'}` +
        `C:${check.predicateCResult ? 'P' : 'F'}` +
        `D:${check.predicateDResult ? 'P' : 'F'}` +
        (check.decryptError ? ` decryptError=${check.decryptError}` : ''),
    });
  }
  // Per-target boundary audit event.
  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:audit-016-pr3-spotcheck',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: null,
    action: 'PHI_SPOTCHECK_TARGET_COMPLETED',
    resourceType: t.table,
    resourceId: null,
    ipAddress: 'cli',
    description:
      `AUDIT-016 PR 3 STEP 1.7 target completed: ${targetLabel} ` +
      `samples=${samples.length} success=${successCount} failed=${failureCount}`,
  });
  return {
    target: targetLabel,
    totalRows,
    sampleSize: samples.length,
    successCount,
    failureCount,
    sampleResults,
  };
}

// ── SUMMARY_ARTIFACT writer (sister to migration script line 361-371) ─────
export async function writeSpotCheckArtifact(envelope: object): Promise<string> {
  const dir = path.resolve(__dirname, '../../var');
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `audit-016-pr3-step-1-7-spotcheck-${ts}.json`);
  await fs.writeFile(file, JSON.stringify(envelope, null, 2), 'utf8');
  return file;
}

// ── Main ──────────────────────────────────────────────────────────────────
export interface SpotCheckEnvelope {
  readonly audit: string;
  readonly mode: string;
  readonly sampleSizePerTarget: number;
  readonly startedAtUTC: string;
  readonly stoppedAtUTC: string;
  readonly wallClockMs: number;
  readonly targetsScanned: number;
  readonly targetsWithRows: number;
  readonly targetsZeroSampled: number;
  readonly totalSamples: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly cleanForCloseout: boolean;
  readonly perTargetDetail: readonly TargetDetail[];
  readonly failures: ReadonlyArray<{
    target: string;
    rowId: string;
    predicateAResult: boolean;
    predicateBResult: boolean;
    predicateCResult: boolean;
    predicateDResult: boolean;
    decryptError?: string;
  }>;
}

export async function main(opts: Opts): Promise<number> {
  const startedAtUTC = new Date().toISOString();
  const startMs = Date.now();

  const preFlight = preFlightValidate(process.env);
  if (!preFlight.ok) {
    console.error('PRE_FLIGHT_FAILED');
    for (const e of preFlight.errors) {
      console.error(`  ERROR: ${e}`);
    }
    for (const w of preFlight.warnings) {
      console.error(`  WARN:  ${w}`);
    }
    return 2;
  }
  for (const w of preFlight.warnings) {
    console.error(`  WARN:  ${w}`);
  }

  console.error('');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('  AUDIT-016 PR 3 STEP 1.7 - V2 envelope spot-check decrypt');
  console.error('  Read-only verification. No DB writes. PHI access logged.');
  console.error(`  Sample size per target: ${opts.batchSize}`);
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('');

  const nonZeroTargets = await filterNonZeroV2Targets(prisma, TARGETS);
  console.error(
    `Filtered ${nonZeroTargets.length} non-zero-V2 targets of ${TARGETS.length} total.`,
  );

  const perTargetDetail: TargetDetail[] = [];
  let totalSamples = 0;
  let totalSuccess = 0;
  let totalFailures = 0;
  const allFailures: Array<{
    target: string;
    rowId: string;
    predicateAResult: boolean;
    predicateBResult: boolean;
    predicateCResult: boolean;
    predicateDResult: boolean;
    decryptError?: string;
  }> = [];
  for (const { target, rowCount } of nonZeroTargets) {
    const detail = await spotCheckTarget(target, rowCount, opts.batchSize);
    perTargetDetail.push(detail);
    totalSamples += detail.sampleSize;
    totalSuccess += detail.successCount;
    totalFailures += detail.failureCount;
    for (const r of detail.sampleResults) {
      if (!r.success) {
        allFailures.push({
          target: r.target,
          rowId: r.rowId,
          predicateAResult: r.predicateAResult,
          predicateBResult: r.predicateBResult,
          predicateCResult: r.predicateCResult,
          predicateDResult: r.predicateDResult,
          decryptError: r.decryptError,
        });
      }
    }
    console.error(
      `DONE ${detail.target}: total=${detail.totalRows} ` +
        `sampled=${detail.sampleSize} success=${detail.successCount} ` +
        `failed=${detail.failureCount}`,
    );
  }

  const stoppedAtUTC = new Date().toISOString();
  const wallClockMs = Date.now() - startMs;

  const envelope: SpotCheckEnvelope = {
    audit: 'AUDIT-016-PR-3-STEP-1.7',
    mode: 'spotcheck-decrypt',
    sampleSizePerTarget: opts.batchSize,
    startedAtUTC,
    stoppedAtUTC,
    wallClockMs,
    targetsScanned: TARGETS.length,
    targetsWithRows: nonZeroTargets.length,
    targetsZeroSampled: TARGETS.length - nonZeroTargets.length,
    totalSamples,
    successCount: totalSuccess,
    failureCount: totalFailures,
    cleanForCloseout: totalFailures === 0,
    perTargetDetail,
    failures: allFailures,
  };

  let artifactPath = '<not written>';
  try {
    artifactPath = await writeSpotCheckArtifact(envelope);
    console.error(`SPOTCHECK_ARTIFACT: ${artifactPath}`);
  } catch (artifactErr) {
    console.error(
      `SPOTCHECK_ARTIFACT_WRITE_FAILED: ` +
        `${artifactErr instanceof Error ? artifactErr.message : String(artifactErr)}`,
    );
  }

  console.log('---AUDIT_016_PR3_STEP_1_7_SPOTCHECK---');
  console.log(JSON.stringify({ ...envelope, artifactPath }, null, 2));
  console.log('---END---');

  return totalFailures > 0 ? 1 : 0;
}

// ── Entrypoint guard (sister to migration script line 766-794) ────────────
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
    .then(async code => {
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch(async err => {
      console.error('FATAL', err);
      console.log('---AUDIT_016_PR3_STEP_1_7_SPOTCHECK---');
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
