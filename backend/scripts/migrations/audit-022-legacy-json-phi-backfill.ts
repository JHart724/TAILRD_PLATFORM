/**
 * AUDIT-022 Legacy JSON PHI backfill migration.
 *
 * Encrypts pre-encryption-rollout legacy JSON values (objects / arrays /
 * unencrypted strings) in PHI_JSON_FIELDS columns. Mirrors the detection
 * pattern from `infrastructure/scripts/phase-2d/verify-phi-legacy-json.js`
 * across the (table, column) pairs derived from
 * `backend/src/middleware/phiEncryption.ts` PHI_JSON_FIELDS map.
 *
 * Envelope: writes V0 (`enc:<iv>:<authTag>:<ciphertext>`) via the existing
 * applyPHIEncryption Prisma middleware. AUDIT-016 PR 3 will re-encrypt to
 * V1 (KMS-wrapped DEK) once the rotation pipeline ships.
 *
 * Modes:
 *   --dry-run            (default) per-target legacy/encrypted/total counts; no writes.
 *   --execute            perform encryption on legacy rows. Requires
 *                        AUDIT_022_EXECUTE_CONFIRMED=yes in the environment.
 *   --batch <N>          batch size for execute mode (default 50).
 *   --pause-ms <N>       sleep N ms between batches and between targets (default 100).
 *   --target <t>.<col>   restrict to a single (table, column) pair.
 *
 * Production safeguards:
 *   - Confirmation gate: --execute exits 1 unless AUDIT_022_EXECUTE_CONFIRMED=yes.
 *     Forces operator to follow docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md.
 *   - Pre-flight env validation: DATABASE_URL + PHI_ENCRYPTION_KEY checked before
 *     any DB query. Fail-fast with actionable error.
 *   - Rate-limiting: --pause-ms bounds DB load on arbitrary row counts.
 *   - Summary artifact: every run writes a timestamped JSON envelope to
 *     `backend/var/audit-022-{mode}-{ISO}.json` for compliance archival.
 *   - Backup reminder: --execute prints an informational warning before run.
 *
 * Concurrent-write safety:
 *   This script DOES NOT take row-level locks. The migration assumes no
 *   concurrent writers update PHI_JSON_FIELDS columns during the execution
 *   window. Operator runbook recommends off-hours execution. Idempotent
 *   re-run handles partial-failure recovery.
 *
 * Audit trail (HIPAA §164.312(b)):
 *   - File: `auditLogger.info('audit_event', ...)` per row + per batch.
 *     Backed by winston DailyRotateFile (6yr retention) + Console JSON →
 *     ECS stdout → CloudWatch Logs (durable, queryable).
 *     See AUDIT-013 remediation in `backend/src/middleware/auditLogger.ts`.
 *   - DB: `AuditLog` row per batch (action='PHI_BACKFILL_BATCH').
 *   - Filesystem: summary artifact in backend/var/.
 *
 * Idempotency: detection SQL excludes any row whose JSON text representation
 * already starts with `"enc:` — re-running on a clean DB is a no-op.
 *
 * Exit codes:
 *   0 = clean run (no failures)
 *   1 = run completed with one or more per-row failures (continue-on-error),
 *       OR confirmation gate / pre-flight env validation failed
 *   2 = fatal error (DB connect, unhandled exception)
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts --dry-run
 *   AUDIT_022_EXECUTE_CONFIRMED=yes \
 *     npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts \
 *       --execute --batch 50 --pause-ms 100
 *   AUDIT_022_EXECUTE_CONFIRMED=yes \
 *     npx tsx backend/scripts/migrations/audit-022-legacy-json-phi-backfill.ts \
 *       --execute --target alerts.triggerData
 */

import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../src/lib/prisma';
import { auditLogger } from '../../src/middleware/auditLogger';
import { TENANT_GUARD_BYPASS } from '../../src/middleware/tenantGuard';

// ── TARGETS ─────────────────────────────────────────────────────────────────
// Mirrors PHI_JSON_FIELDS in phiEncryption.ts. 30 columns × 16 models (15 listed
// here; the schema's `Encounter`/`Alert`/etc. all carry an explicit @@map).
// `model` is the Prisma client property name (camelCase first char).
// `table` is the underlying postgres table (matches @@map).

interface Target {
  readonly table: string;
  readonly model: string;
  readonly column: string;
}

export const TARGETS: readonly Target[] = [
  { table: 'webhook_events',               model: 'webhookEvent',               column: 'rawPayload' },
  { table: 'risk_score_assessments',       model: 'riskScoreAssessment',        column: 'inputData' },
  { table: 'risk_score_assessments',       model: 'riskScoreAssessment',        column: 'components' },
  // AUDIT-022 §17.1 cleanup (2026-05-07): removed risk_score_assessments.inputs
  // and intervention_tracking.outcomes — neither exists in schema.prisma.
  { table: 'intervention_tracking',        model: 'interventionTracking',       column: 'findings' },
  { table: 'intervention_tracking',        model: 'interventionTracking',       column: 'complications' },
  { table: 'alerts',                       model: 'alert',                      column: 'triggerData' },
  { table: 'phenotypes',                   model: 'phenotype',                  column: 'evidence' },
  { table: 'contraindication_assessments', model: 'contraindicationAssessment', column: 'reasons' },
  { table: 'contraindication_assessments', model: 'contraindicationAssessment', column: 'alternatives' },
  { table: 'contraindication_assessments', model: 'contraindicationAssessment', column: 'monitoring' },
  { table: 'therapy_gaps',                 model: 'therapyGap',                 column: 'barriers' },
  { table: 'therapy_gaps',                 model: 'therapyGap',                 column: 'recommendations' },
  { table: 'encounters',                   model: 'encounter',                  column: 'diagnosisCodes' },
  { table: 'cds_hooks_sessions',           model: 'cdsHooksSession',            column: 'fhirContext' },
  { table: 'cds_hooks_sessions',           model: 'cdsHooksSession',            column: 'cards' },
  { table: 'audit_logs',                   model: 'auditLog',                   column: 'previousValues' },
  { table: 'audit_logs',                   model: 'auditLog',                   column: 'newValues' },
  { table: 'audit_logs',                   model: 'auditLog',                   column: 'metadata' },
  { table: 'care_plans',                   model: 'carePlan',                   column: 'goals' },
  { table: 'care_plans',                   model: 'carePlan',                   column: 'activities' },
  { table: 'care_plans',                   model: 'carePlan',                   column: 'careTeam' },
  { table: 'drug_titrations',              model: 'drugTitration',              column: 'barriers' },
  { table: 'drug_titrations',              model: 'drugTitration',              column: 'monitoringPlan' },
  { table: 'device_eligibility',           model: 'deviceEligibility',          column: 'criteria' },
  { table: 'device_eligibility',           model: 'deviceEligibility',          column: 'barriers' },
  { table: 'device_eligibility',           model: 'deviceEligibility',          column: 'contraindications' },
  { table: 'cross_referrals',              model: 'crossReferral',              column: 'triggerData' },
  { table: 'cql_results',                  model: 'cqlResult',                  column: 'result' },
];

// ── CLI parsing ─────────────────────────────────────────────────────────────

interface CliOptions {
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
      const next = argv[++i];
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--batch expects a positive integer, got: ${next}`);
      }
      batch = parsed;
    } else if (arg === '--pause-ms') {
      const next = argv[++i];
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`--pause-ms expects a non-negative integer, got: ${next}`);
      }
      pauseMs = parsed;
    } else if (arg === '--target') {
      const next = argv[++i];
      const dot = next?.indexOf('.');
      if (!next || dot === undefined || dot < 1) {
        throw new Error(`--target expects <table>.<column>, got: ${next}`);
      }
      target = { table: next.slice(0, dot), column: next.slice(dot + 1) };
    }
  }

  return { mode, batch, pauseMs, target };
}

// ── Pre-flight + safeguards ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(r => setTimeout(r, ms));
}

interface PreFlightResult {
  readonly ok: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export function preFlightValidate(env: NodeJS.ProcessEnv = process.env): PreFlightResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set. Cannot connect to Postgres.');
  }
  if (!env.PHI_ENCRYPTION_KEY) {
    errors.push('PHI_ENCRYPTION_KEY is not set. Required for AES-256-GCM encryption-on-write via applyPHIEncryption middleware.');
  } else if (env.PHI_ENCRYPTION_KEY.length !== 64) {
    // AUDIT-017 awareness: a 256-bit AES key is 64 hex chars. We surface this
    // as a warning rather than blocking, because phiEncryption.ts itself does
    // not yet validate length (AUDIT-017 will formalize). If the key has been
    // working for existing ciphertext, the migration is safe — but operators
    // should spot-check via `--target` on a single row before a full run.
    warnings.push(
      `PHI_ENCRYPTION_KEY length is ${env.PHI_ENCRYPTION_KEY.length} chars; expected 64 hex (256-bit). ` +
      `AUDIT-017 will formalize key validation; until then operators should --target a single row first.`,
    );
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function checkExecuteConfirmation(env: NodeJS.ProcessEnv = process.env): { ok: boolean; error?: string } {
  if (env.AUDIT_022_EXECUTE_CONFIRMED !== 'yes') {
    return {
      ok: false,
      error:
        'AUDIT-022 --execute requires AUDIT_022_EXECUTE_CONFIRMED=yes in the environment.\n' +
        'See docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md for the full pre-flight checklist.',
    };
  }
  return { ok: true };
}

function printBackupReminder(): void {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('  WARNING: AUDIT-022 --execute modifies PHI data in-place.');
  console.error('  Confirm a DB snapshot/backup exists before proceeding.');
  console.error('  Migration is idempotent and recoverable via restore-from-snapshot.');
  console.error('  Runbook: docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('');
}

export async function writeSummaryArtifact(envelope: object, mode: 'dry-run' | 'execute'): Promise<string> {
  const dir = path.resolve(__dirname, '../../var');
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `audit-022-${mode}-${ts}.json`);
  await fs.writeFile(file, JSON.stringify(envelope, null, 2), 'utf8');
  return file;
}

// ── SQL helpers ─────────────────────────────────────────────────────────────
// Detection logic mirrored from verify-phi-legacy-json.js:
//   encrypted: column::text LIKE '"enc:%'
//   legacy:    NOT NULL AND NOT LIKE '"enc:%' AND NOT IN ('{}', '[]', 'null', '""')

interface TargetCounts {
  readonly total: number;
  readonly encrypted: number;
  readonly legacy: number;
}

async function columnExists(t: Target): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${t.table}' AND column_name = '${t.column}'`,
  );
  if (rows.length === 0) return false;
  return ['json', 'jsonb'].includes(rows[0].data_type);
}

async function countTarget(t: Target): Promise<TargetCounts> {
  const totalRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL`,
  );
  const encryptedRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL AND "${t.column}"::text LIKE '"enc:%'`,
  );
  const legacyRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL
       AND "${t.column}"::text NOT LIKE '"enc:%'
       AND "${t.column}"::text NOT IN ('{}', '[]', 'null', '""')`,
  );
  return {
    total: Number(totalRows[0].c),
    encrypted: Number(encryptedRows[0].c),
    legacy: Number(legacyRows[0].c),
  };
}

async function fetchLegacyIds(t: Target, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${t.table}"
     WHERE "${t.column}" IS NOT NULL
       AND "${t.column}"::text NOT LIKE '"enc:%'
       AND "${t.column}"::text NOT IN ('{}', '[]', 'null', '""')
     ORDER BY id
     LIMIT ${limit}`,
  );
  return rows.map(r => r.id);
}

// ── Per-target migration ────────────────────────────────────────────────────

interface TargetReport {
  table: string;
  column: string;
  beforeCounts: TargetCounts;
  afterCounts: TargetCounts | null;
  rowsAttempted: number;
  rowsSucceeded: number;
  rowsFailed: number;
  failures: Array<{ id: string; error: string }>;
}

async function migrateTarget(t: Target, batchSize: number, pauseMs: number): Promise<TargetReport> {
  const before = await countTarget(t);
  const report: TargetReport = {
    table: t.table,
    column: t.column,
    beforeCounts: before,
    afterCounts: null,
    rowsAttempted: 0,
    rowsSucceeded: 0,
    rowsFailed: 0,
    failures: [],
  };

  if (before.legacy === 0) {
    report.afterCounts = before;
    return report;
  }

  const modelClient = (prisma as unknown as Record<string, {
    findUnique: (args: { where: { id: string }; select: Record<string, true> }) => Promise<Record<string, unknown> | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  }>)[t.model];

  if (!modelClient) {
    throw new Error(`Prisma model "${t.model}" not found on prisma client (target: ${t.table}.${t.column})`);
  }

  // Process in batches. Re-fetch each batch (legacy IDs shrink as we go).
  for (;;) {
    const ids = await fetchLegacyIds(t, batchSize);
    if (ids.length === 0) break;

    for (const id of ids) {
      report.rowsAttempted++;
      try {
        const rec = await modelClient.findUnique({
          where: { id },
          select: { [t.column]: true },
        });
        if (!rec) {
          throw new Error('record disappeared between detection and read');
        }
        const value = rec[t.column];
        if (value === null || value === undefined) {
          // Race: another writer wrote null since detection. Skip.
          report.rowsSucceeded++;
          continue;
        }
        // Write back via Prisma update — applyPHIEncryption middleware
        // serializes (JSON.stringify) and AES-256-GCM encrypts on write.
        await modelClient.update({
          where: { id },
          data: { [t.column]: value as any },
        });
        report.rowsSucceeded++;
        auditLogger.info('audit_event', {
          timestamp: new Date().toISOString(),
          userId: 'system:audit-022-migration',
          userEmail: 'system@tailrd-heart.com',
          userRole: 'SYSTEM',
          hospitalId: null,
          action: 'PHI_BACKFILL_ROW',
          resourceType: t.table,
          resourceId: id,
          ipAddress: 'cli',
          description: `AUDIT-022 legacy JSON encrypted: ${t.table}.${t.column}`,
        });
      } catch (err) {
        report.rowsFailed++;
        const message = err instanceof Error ? err.message : String(err);
        report.failures.push({ id, error: message });
        auditLogger.error('audit_event', {
          timestamp: new Date().toISOString(),
          userId: 'system:audit-022-migration',
          userEmail: 'system@tailrd-heart.com',
          userRole: 'SYSTEM',
          hospitalId: null,
          action: 'PHI_BACKFILL_ROW_FAILED',
          resourceType: t.table,
          resourceId: id,
          ipAddress: 'cli',
          description: `AUDIT-022 backfill failed: ${t.table}.${t.column}: ${message}`,
        });
      }
    }

    // Per-batch DB audit summary (HIPAA §164.312(b)).
    try {
      await prisma.auditLog.create({
        data: {
          hospitalId: null,
          userId: 'system:audit-022-migration',
          userEmail: 'system@tailrd-heart.com',
          userRole: 'SYSTEM',
          ipAddress: 'cli',
          action: 'PHI_BACKFILL_BATCH',
          resourceType: t.table,
          resourceId: null,
          description: `AUDIT-022 batch: ${t.table}.${t.column} attempted=${ids.length} succeededRunningTotal=${report.rowsSucceeded} failedRunningTotal=${report.rowsFailed}`,
          previousValues: null,
          newValues: {
            target: `${t.table}.${t.column}`,
            batchSize: ids.length,
            ids,
            runningSucceeded: report.rowsSucceeded,
            runningFailed: report.rowsFailed,
          } as any,
        },
        [TENANT_GUARD_BYPASS]: true,
      } as any);
    } catch (dbErr) {
      auditLogger.error('audit_db_write_failed', {
        scope: 'PHI_BACKFILL_BATCH',
        target: `${t.table}.${t.column}`,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    // Safety: if no rows succeeded in this batch and all failed, stop to avoid
    // an infinite loop on a target where every row hits the same error.
    if (ids.length > 0 && report.failures.length >= ids.length && report.rowsSucceeded === 0) {
      break;
    }

    // Inter-batch pause to bound DB load on large targets.
    await sleep(pauseMs);
  }

  report.afterCounts = await countTarget(t);
  return report;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(opts: CliOptions): Promise<number> {
  // Pre-flight env validation (always — both modes need DATABASE_URL + key).
  const preflight = preFlightValidate();
  if (!preflight.ok) {
    for (const err of preflight.errors) {
      console.error(`PREFLIGHT_ERROR: ${err}`);
    }
    return 1;
  }
  for (const w of preflight.warnings) {
    console.error(`PREFLIGHT_WARN: ${w}`);
  }

  // Confirmation gate — execute mode requires explicit env opt-in.
  if (opts.mode === 'execute') {
    const confirm = checkExecuteConfirmation();
    if (!confirm.ok) {
      console.error(`CONFIRMATION_GATE: ${confirm.error}`);
      return 1;
    }
    printBackupReminder();
  }

  const targets = opts.target
    ? TARGETS.filter(t => t.table === opts.target!.table && t.column === opts.target!.column)
    : TARGETS;

  if (opts.target && targets.length === 0) {
    console.error(`--target ${opts.target.table}.${opts.target.column} not found in TARGETS`);
    return 2;
  }

  const startedAt = new Date().toISOString();
  const reports: TargetReport[] = [];
  const skippedTargets: Array<{ table: string; column: string; reason: string }> = [];
  let totalLegacyBefore = 0;
  let totalRowsAttempted = 0;
  let totalRowsSucceeded = 0;
  let totalRowsFailed = 0;

  for (const t of targets) {
    // Pre-flight: skip targets whose column is absent or non-JSON in the schema.
    // Mirrors verify-phi-legacy-json.js behavior. Surfaces drift between
    // PHI_JSON_FIELDS map (phiEncryption.ts) and live schema as a §17.1 finding.
    const exists = await columnExists(t);
    if (!exists) {
      skippedTargets.push({ table: t.table, column: t.column, reason: 'column not found or not json/jsonb' });
      console.error(`SKIP   ${t.table}.${t.column} (column not found or not json/jsonb)`);
      continue;
    }
    if (opts.mode === 'dry-run') {
      const before = await countTarget(t);
      reports.push({
        table: t.table,
        column: t.column,
        beforeCounts: before,
        afterCounts: null,
        rowsAttempted: 0,
        rowsSucceeded: 0,
        rowsFailed: 0,
        failures: [],
      });
      totalLegacyBefore += before.legacy;
      console.error(
        `${before.legacy > 0 ? 'LEGACY' : 'CLEAN '} ${t.table}.${t.column}: total=${before.total} encrypted=${before.encrypted} legacy=${before.legacy}`,
      );
    } else {
      const r = await migrateTarget(t, opts.batch, opts.pauseMs);
      reports.push(r);
      totalLegacyBefore += r.beforeCounts.legacy;
      totalRowsAttempted += r.rowsAttempted;
      totalRowsSucceeded += r.rowsSucceeded;
      totalRowsFailed += r.rowsFailed;
      const after = r.afterCounts!;
      console.error(
        `${r.rowsFailed > 0 ? 'FAILED' : 'DONE  '} ${t.table}.${t.column}: legacy ${r.beforeCounts.legacy}→${after.legacy} encrypted ${r.beforeCounts.encrypted}→${after.encrypted} attempted=${r.rowsAttempted} succeeded=${r.rowsSucceeded} failed=${r.rowsFailed}`,
      );
      // Inter-target pause to bound DB load further on multi-target runs.
      await sleep(opts.pauseMs);
    }
  }

  const finishedAt = new Date().toISOString();

  const envelope = {
    audit: 'AUDIT-022',
    mode: opts.mode,
    batchSize: opts.batch,
    pauseMs: opts.pauseMs,
    targetFilter: opts.target,
    startedAt,
    finishedAt,
    totalsByTarget: reports,
    skippedTargets,
    summary: {
      targetsScanned: targets.length,
      targetsSkipped: skippedTargets.length,
      totalLegacyBefore,
      totalRowsAttempted,
      totalRowsSucceeded,
      totalRowsFailed,
      cleanForCloseout: opts.mode === 'execute' && totalRowsFailed === 0,
    },
    artifactPath: '' as string,
  };

  // Write summary artifact for compliance archival. Failure is non-fatal —
  // stdout envelope remains the canonical record.
  try {
    const artifactPath = await writeSummaryArtifact(envelope, opts.mode);
    envelope.artifactPath = artifactPath;
    console.error(`SUMMARY_ARTIFACT: ${artifactPath}`);
  } catch (artifactErr) {
    console.error(`SUMMARY_ARTIFACT_WRITE_FAILED: ${artifactErr instanceof Error ? artifactErr.message : String(artifactErr)}`);
  }

  console.log('---AUDIT_022_LEGACY_JSON_BACKFILL---');
  console.log(JSON.stringify(envelope, null, 2));
  console.log('---END---');

  return totalRowsFailed > 0 ? 1 : 0;
}

// Entrypoint guard — only run when invoked as a script, not when imported by tests.
const invokedAsScript = require.main === module;

if (invokedAsScript) {
  const opts = parseArgs(process.argv.slice(2));
  main(opts)
    .then(async code => {
      await prisma.$disconnect();
      process.exit(code);
    })
    .catch(async err => {
      console.error('FATAL', err);
      console.log('---AUDIT_022_LEGACY_JSON_BACKFILL---');
      console.log(JSON.stringify({ audit: 'AUDIT-022', fatalError: err instanceof Error ? err.message : String(err) }, null, 2));
      console.log('---END---');
      await prisma.$disconnect().catch(() => {});
      process.exit(2);
    });
}

export { main, countTarget, fetchLegacyIds, migrateTarget };
export type { CliOptions, PreFlightResult };
