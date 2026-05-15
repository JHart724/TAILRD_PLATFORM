/**
 * AUDIT-016 PR3 STEP 1.7 - V2 -> V2 EncryptionContext.purpose rekey.
 *
 * Discovers V2 envelopes (enc:v2:wrappedDEK:iv:authTag:ciphertext) encrypted
 * under the legacy migration purpose 'phi-migration-v0v1-to-v2' and
 * re-encrypts them under the canonical production purpose 'phi-encryption'
 * via keyRotation.rekeyV2Record. Eliminates the dual-purpose architectural
 * inconsistency caught at STEP 1.7 attempt-2 (Day 12; audit_logs.description
 * decryptError=UnknownError 5/5). Single canonical purpose end-state; no
 * multi-purpose tolerance code in production hot path; no tech debt.
 *
 * Sister architecture to audit-016-pr3-v0v1-to-v2.ts:
 *   - One-shot operator-triggered script (not scheduled job)
 *   - SQL discovery filter + batched Prisma processing
 *   - --dry-run (default) / --execute (gated by env confirmation)
 *   - Per-row try/catch + safety abort + summary artifact
 *   - Audit trail: per-row + per-batch events (best-effort)
 *
 * SQL discovery filter (sister to v0v1-to-v2 D2 but inverted):
 *   column LIKE 'enc:v2:%'
 *   Includes ALL V2 envelopes (legacy migration purpose + canonical purpose);
 *   per-row decrypt-with-old-purpose probe discriminates which to rekey.
 *
 * Modes:
 *   --dry-run            (default) per-target V2 count; no writes.
 *   --execute            re-encrypt V2 envelopes under canonical purpose.
 *                        Requires AUDIT_016_PR3_REKEY_CONFIRMED=yes.
 *   --batch <N>          batch size for execute mode (default 50; same KMS
 *                        rate-limit headroom as v0v1-to-v2 sister script).
 *   --pause-ms <N>       sleep N ms between batches and targets (default 100).
 *   --target <t>.<col>   restrict to a single (table, column) pair.
 *
 * Production safeguards:
 *   - Confirmation gate: --execute exits 1 unless AUDIT_016_PR3_REKEY_CONFIRMED=yes.
 *     Forces operator to follow rekey runbook (post-execute snapshot + STEP 1.7
 *     attempt-3 verification cadence).
 *   - Pre-flight env validation: DATABASE_URL + PHI_ENCRYPTION_KEY +
 *     AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2 checked before any DB query.
 *   - Rate-limiting: --pause-ms bounds DB + KMS load.
 *   - Summary artifact: every run writes a timestamped JSON envelope to
 *     backend/var/audit-016-pr3-v2-rekey-{mode}-{ISO}.json for compliance.
 *   - Backup reminder: --execute prints an informational warning before run.
 *   - Graceful skip: per-row decrypt-with-old-purpose failure is RECORDED + SKIPPED
 *     (record is already under canonical purpose; sister to audit_logs.description
 *     Day 13 finding).
 *
 * Idempotency:
 *   1. Graceful-skip on old-purpose decrypt failure means re-runs are safe.
 *   2. Re-running rekey on a canonical-purpose record fails decrypt + records
 *      skip; no DB write.
 *   3. MigrationResult.skipped flag tracks no-op-skip count separately.
 *
 * Audit trail (HIPAA section 164.312 subsection b; all best-effort):
 *   - File: auditLogger.info/error per row + per batch.
 *   - DB: AuditLog row per batch (action='PHI_REKEY_BATCH_*').
 *   - Filesystem: summary artifact in backend/var/.
 *   - NONE in HIPAA_GRADE_ACTIONS Set (per-row volume; sister to v0v1-to-v2).
 *
 * Exit codes:
 *   0 = clean run (no failures, no unexpected skips beyond canonical-purpose probe)
 *   1 = run completed with one or more per-row failures (continue-on-error),
 *       OR confirmation gate / pre-flight env validation failed
 *   2 = fatal error (DB connect, unhandled exception)
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts --dry-run
 *   AUDIT_016_PR3_REKEY_CONFIRMED=yes \
 *     PHI_ENVELOPE_VERSION=v2 \
 *     AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi \
 *     npx tsx backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts \
 *       --execute --batch 50 --pause-ms 100
 *
 * Sister references:
 *   - audit-016-pr3-v0v1-to-v2.ts (V0/V1 -> V2 migration; STEP 1.5 Day 11)
 *   - keyRotation.rekeyV2Record (Day 13 architectural keystone)
 *   - keyRotation.test.ts T-REKEY-1 through T-REKEY-7 (Day 13)
 *   - AUDIT-085 + AUDIT-086 sister-discipline cadence
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';
import { auditLogger } from '../../src/middleware/auditLogger';
import {
  rekeyV2Record,
  type EncryptionContext,
  type MigrationResult,
} from '../../src/services/keyRotation';

// Re-use TARGETS from sister script to keep PHI column inventory single-sourced.
// If migration script TARGETS change (e.g., AUDIT-075 adds errorMessage), this
// script auto-tracks via import. Sister to PR #272 spotcheck pattern:
//   `type Target = (typeof TARGETS)[number]` derives type from array element.
import { TARGETS } from './audit-016-pr3-v0v1-to-v2';

type Target = (typeof TARGETS)[number];

// Old purpose: what STEP 1.5 migration encrypted V2 envelopes under.
const OLD_PURPOSE = 'phi-migration-v0v1-to-v2';

// New purpose: canonical production middleware purpose (phiEncryption.ts line 74).
const NEW_PURPOSE = 'phi-encryption';

const SERVICE_NAME = 'tailrd-backend';

function oldContextFor(t: Target): EncryptionContext {
  return { service: SERVICE_NAME, purpose: OLD_PURPOSE, model: t.model, field: t.column };
}

function newContextFor(t: Target): EncryptionContext {
  return { service: SERVICE_NAME, purpose: NEW_PURPOSE, model: t.model, field: t.column };
}

export interface CliOptions {
  readonly mode: 'dry-run' | 'execute';
  readonly batch: number;
  readonly pauseMs: number;
  readonly target: { table: string; column: string } | null;
}

export function parseArgs(argv: string[]): CliOptions {
  let mode: 'dry-run' | 'execute' = 'dry-run';
  let batch = 50;
  let pauseMs = 100;
  let target: { table: string; column: string } | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      mode = 'dry-run';
    } else if (arg === '--execute') {
      mode = 'execute';
    } else if (arg === '--batch') {
      const v = argv[++i];
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--batch requires positive integer; got: ${v}`);
      }
      batch = n;
    } else if (arg === '--pause-ms') {
      const v = argv[++i];
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`--pause-ms requires non-negative integer; got: ${v}`);
      }
      pauseMs = n;
    } else if (arg === '--target') {
      const v = argv[++i];
      const parts = v.split('.');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`--target requires <table>.<column> format; got: ${v}`);
      }
      target = { table: parts[0], column: parts[1] };
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npx tsx audit-016-pr3-v2-rekey-purpose.ts [--dry-run|--execute] [--batch N] [--pause-ms N] [--target table.column]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { mode, batch, pauseMs, target };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PreFlightResult {
  readonly ok: boolean;
  readonly error?: string;
}

export function preFlightValidate(env: NodeJS.ProcessEnv = process.env): PreFlightResult {
  const required = ['DATABASE_URL', 'PHI_ENCRYPTION_KEY', 'AWS_KMS_PHI_KEY_ALIAS'];
  for (const key of required) {
    if (!env[key]) {
      return { ok: false, error: `Missing required env var: ${key}` };
    }
  }
  if (env.PHI_ENVELOPE_VERSION !== 'v2') {
    return {
      ok: false,
      error: `PHI_ENVELOPE_VERSION must be 'v2' (got: ${env.PHI_ENVELOPE_VERSION ?? 'unset'}). ` +
        `Without v2 gating, keyRotation.encryptWithCurrent emits V1, defeating rekey.`,
    };
  }
  if (env.DEMO_MODE === 'true') {
    return {
      ok: false,
      error: 'DEMO_MODE=true is incompatible with --execute. Rekey script declines to run on demo data.',
    };
  }
  return { ok: true };
}

export function checkRekeyConfirmation(env: NodeJS.ProcessEnv = process.env): { ok: boolean; error?: string } {
  if (env.AUDIT_016_PR3_REKEY_CONFIRMED !== 'yes') {
    return {
      ok: false,
      error:
        'AUDIT-016 PR3 v2-rekey --execute requires AUDIT_016_PR3_REKEY_CONFIRMED=yes in environment.\n' +
        'Confirm pre-execute Aurora cluster snapshot exists; sister to STEP 1.5 cadence.',
    };
  }
  return { ok: true };
}

function printBackupReminder(): void {
  console.error('');
  console.error('================================================================================');
  console.error('  WARNING: AUDIT-016 PR3 v2-rekey --execute re-encrypts PHI data in-place.');
  console.error('  Confirm an Aurora cluster snapshot exists before proceeding.');
  console.error('  Rekey is idempotent (graceful-skip on canonical-purpose records).');
  console.error('  Sister to STEP 1.5 cadence; pre-execute snapshot is rollback substrate.');
  console.error('================================================================================');
  console.error('');
}
export async function writeSummaryArtifact(envelope: object, mode: 'dry-run' | 'execute'): Promise<string> {
  const dir = path.resolve(__dirname, '../../var');
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `audit-016-pr3-v2-rekey-${mode}-${ts}.json`);
  await fs.writeFile(file, JSON.stringify(envelope, null, 2), 'utf8');
  return file;
}

export interface RekeyTargetCounts {
  readonly total: number;
  readonly v2: number;
}

export async function countTarget(t: Target): Promise<RekeyTargetCounts> {
  const colExpr = t.kind === 'json' ? `"${t.column}"::text` : `"${t.column}"`;
  const pattern = t.kind === 'json' ? `'"enc:v2:%'` : `'enc:v2:%'`;
  const totalRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL`,
  );
  const v2Rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL AND ${colExpr} LIKE ${pattern}`,
  );
  return {
    total: Number(totalRows[0].c),
    v2: Number(v2Rows[0].c),
  };
}

// Keyset cursor: `afterId` advances past prior-batch tail to prevent the
// rekey loop from re-fetching skip-canonical rows that the SQL WHERE clause
// cannot discriminate (both pre-rekey and post-rekey states are byte-
// identical `enc:v2:%` envelopes). Without the cursor, a target with
// 100 percent already-canonical rows yields an infinite loop because the
// candidate set never shrinks. Sister to audit-016-pr3-v0v1-to-v2.ts ORDER
// BY id discipline (line 429), tightened for the rekey same-prefix case.
// afterId is sourced from prior-batch row.id (UUID/CUID from DB); single-
// quote escape is defense-in-depth.
export async function fetchV2Rows(
  t: Target,
  limit: number,
  afterId: string | null = null,
): Promise<Array<{ id: string; value: string }>> {
  const selectExpr = t.kind === 'json' ? `"${t.column}"#>>'{}'` : `"${t.column}"`;
  const whereExpr = t.kind === 'json' ? `"${t.column}"::text LIKE '"enc:v2:%'` : `"${t.column}" LIKE 'enc:v2:%'`;
  const cursorExpr = afterId !== null ? ` AND id > '${afterId.replace(/'/g, "''")}'` : '';
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: string }>>(
    `SELECT id, ${selectExpr} AS value FROM "${t.table}" WHERE ${whereExpr}${cursorExpr} ORDER BY id ASC LIMIT ${limit}`,
  );
  return rows;
}

export interface RekeyTargetReport {
  readonly table: string;
  readonly column: string;
  readonly kind: 'string' | 'json';
  readonly beforeCounts: RekeyTargetCounts;
  readonly rowsAttempted: number;
  readonly rowsRekeyed: number;
  readonly rowsSkippedCanonical: number;
  readonly rowsFailed: number;
  readonly errors: Array<{ recordId: string; message: string }>;
}

export async function rekeyTarget(t: Target, batchSize: number, pauseMs: number): Promise<RekeyTargetReport> {
  const oldCtx = oldContextFor(t);
  const newCtx = newContextFor(t);
  const beforeCounts = await countTarget(t);

  let rowsAttempted = 0;
  let rowsRekeyed = 0;
  let rowsSkippedCanonical = 0;
  let rowsFailed = 0;
  const errors: Array<{ recordId: string; message: string }> = [];

  auditLogger.info(`PHI_REKEY_TARGET_START table=${t.table} column=${t.column} kind=${t.kind} v2Count=${beforeCounts.v2}`);

  // Keyset cursor: tracks last-seen id to advance past skip-canonical rows.
  // Without this cursor, the WHERE clause `LIKE 'enc:v2:%'` cannot
  // discriminate pre-rekey from post-rekey state (both byte-identical V2
  // envelopes); candidate set never shrinks; loop infinite on
  // already-canonical targets. Sister-pattern to audit-016-pr3-v0v1-to-v2.ts
  // ORDER BY id discipline, hardened for the rekey same-prefix case.
  let cursor: string | null = null;

  while (true) {
    const rows = await fetchV2Rows(t, batchSize, cursor);
    if (rows.length === 0) break;

    auditLogger.info(`PHI_REKEY_BATCH_START table=${t.table} column=${t.column} batchSize=${rows.length}`);

    let batchSkippedCanonical = 0;
    let batchRekeyed = 0;
    let batchFailed = 0;

    for (const row of rows) {
      rowsAttempted++;
      try {
        const result: MigrationResult = await rekeyV2Record(
          row.id,
          t.table,
          t.column,
          oldCtx,
          newCtx,
          prisma,
          row.value,
        );
        if (result.skipped) {
          rowsSkippedCanonical++;
          batchSkippedCanonical++;
        } else {
          rowsRekeyed++;
          batchRekeyed++;
        }
      } catch (err: any) {
        // Graceful-skip: decrypt-under-oldContext failure means the record is already
        // under canonical purpose (sister to audit_logs.description Day 13 finding).
        // KMS AccessDenied (production) or wrong-key decrypt (test-mode fallback)
        // both manifest as decryptAny throwing. Record as skip-canonical, NOT failure.
        const msg = err?.message || '<empty>';
        const isContextMismatch = msg.includes('AccessDenied') ||
                                  msg.includes('UnknownError') ||
                                  msg.includes('integrity check failed') ||
                                  msg.includes('InvalidCiphertextException');
        if (isContextMismatch) {
          rowsSkippedCanonical++;
          batchSkippedCanonical++;
          auditLogger.info(`PHI_REKEY_SKIP_CANONICAL table=${t.table} column=${t.column} recordId=${row.id}`);
        } else {
          rowsFailed++;
          batchFailed++;
          errors.push({ recordId: row.id, message: msg });
          auditLogger.error(`PHI_REKEY_ROW_FAIL table=${t.table} column=${t.column} recordId=${row.id} err=${msg}`);
        }
      }
    }

    auditLogger.info(`PHI_REKEY_BATCH_COMPLETED table=${t.table} column=${t.column} rekeyed=${rowsRekeyed} skipped=${rowsSkippedCanonical} failed=${rowsFailed}`);

    // Cursor advance: last row's id is the next iteration's exclusive lower
    // bound. Combined with ORDER BY id ASC in fetchV2Rows, this guarantees
    // forward progress even when every row in a batch was skip-canonical
    // (legacy SQL filter cannot discriminate post-rekey envelopes).
    cursor = rows[rows.length - 1].id;

    // Option B safety abort: if every row in the batch was skip-canonical,
    // assume the target has converged and stop. Mirrors sister-script
    // audit-016-pr3-v0v1-to-v2.ts:615-617 all-fail abort, inverted for the
    // rekey case where all-skip (not all-fail) is the convergence signal.
    // The cursor alone prevents infinite loops; this guard short-circuits
    // tail-end scans on already-canonical targets.
    const batchAllSkipped =
      rows.length > 0 && batchSkippedCanonical === rows.length && batchRekeyed === 0 && batchFailed === 0;
    if (batchAllSkipped) {
      auditLogger.info(
        `PHI_REKEY_BATCH_ALL_SKIPPED table=${t.table} column=${t.column} batchSize=${rows.length} cursor=${cursor}`,
      );
      break;
    }

    if (rows.length < batchSize) break;
    await sleep(pauseMs);
  }

  auditLogger.info(`PHI_REKEY_TARGET_COMPLETED table=${t.table} column=${t.column} attempted=${rowsAttempted} rekeyed=${rowsRekeyed} skipped=${rowsSkippedCanonical} failed=${rowsFailed}`);

  return {
    table: t.table,
    column: t.column,
    kind: t.kind,
    beforeCounts,
    rowsAttempted,
    rowsRekeyed,
    rowsSkippedCanonical,
    rowsFailed,
    errors,
  };
}

async function main(opts: CliOptions): Promise<number> {
  const preFlight = preFlightValidate();
  if (!preFlight.ok) {
    console.error(`PRE_FLIGHT_FAIL: ${preFlight.error}`);
    return 1;
  }
  if (opts.mode === 'execute') {
    const confirmation = checkRekeyConfirmation();
    if (!confirmation.ok) {
      console.error(`CONFIRMATION_FAIL: ${confirmation.error}`);
      return 1;
    }
    printBackupReminder();
  }

  const filteredTargets = opts.target
    ? TARGETS.filter((t) => t.table === opts.target!.table && t.column === opts.target!.column)
    : TARGETS;

  if (filteredTargets.length === 0) {
    console.error(`No matching targets for ${opts.target!.table}.${opts.target!.column}`);
    return 1;
  }

  const startedAt = new Date().toISOString();
  const reports: RekeyTargetReport[] = [];
  let totalV2Before = 0;
  let totalRowsAttempted = 0;
  let totalRowsRekeyed = 0;
  let totalRowsSkippedCanonical = 0;
  let totalRowsFailed = 0;

  auditLogger.info(`PHI_REKEY_RUN_START mode=${opts.mode} batch=${opts.batch} pauseMs=${opts.pauseMs} targets=${filteredTargets.length}`);

  for (const t of filteredTargets) {
    if (opts.mode === 'dry-run') {
      const counts = await countTarget(t);
      reports.push({
        table: t.table,
        column: t.column,
        kind: t.kind,
        beforeCounts: counts,
        rowsAttempted: 0,
        rowsRekeyed: 0,
        rowsSkippedCanonical: 0,
        rowsFailed: 0,
        errors: [],
      });
      totalV2Before += counts.v2;
    } else {
      const r = await rekeyTarget(t, opts.batch, opts.pauseMs);
      reports.push(r);
      totalV2Before += r.beforeCounts.v2;
      totalRowsAttempted += r.rowsAttempted;
      totalRowsRekeyed += r.rowsRekeyed;
      totalRowsSkippedCanonical += r.rowsSkippedCanonical;
      totalRowsFailed += r.rowsFailed;
      await sleep(opts.pauseMs);
    }
  }

  const completedAt = new Date().toISOString();
  const envelope: any = {
    finding: 'AUDIT-016-PR3-STEP-1-7-V2-REKEY-PURPOSE',
    mode: opts.mode,
    startedAt,
    completedAt,
    batch: opts.batch,
    pauseMs: opts.pauseMs,
    targetFilter: opts.target,
    totals: {
      v2Before: totalV2Before,
      rowsAttempted: totalRowsAttempted,
      rowsRekeyed: totalRowsRekeyed,
      rowsSkippedCanonical: totalRowsSkippedCanonical,
      rowsFailed: totalRowsFailed,
    },
    reports,
  };

  try {
    const artifactPath = await writeSummaryArtifact(envelope, opts.mode);
    envelope.artifactPath = artifactPath;
    console.error(`SUMMARY_ARTIFACT: ${artifactPath}`);
  } catch (artifactErr) {
    console.error(`SUMMARY_ARTIFACT_WRITE_FAIL: ${(artifactErr as any)?.message ?? artifactErr}`);
  }

  console.log(JSON.stringify(envelope, null, 2));

  auditLogger.info(`PHI_REKEY_RUN_COMPLETED mode=${opts.mode} rekeyed=${totalRowsRekeyed} skipped=${totalRowsSkippedCanonical} failed=${totalRowsFailed}`);

  return totalRowsFailed > 0 ? 1 : 0;
}

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  main(opts)
    .then(async (code) => {
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch(async (err) => {
      console.error('FATAL', err?.name, err?.message, err?.stack);
      await prisma.$disconnect();
      process.exit(2);
    });
}