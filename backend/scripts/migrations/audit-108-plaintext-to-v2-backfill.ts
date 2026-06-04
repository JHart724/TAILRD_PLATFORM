/**
 * audit-108-plaintext-to-v2-backfill.ts - AUDIT-108 targeted plaintext->V2 PHI backfill.
 *
 * Encrypts the legacy PLAINTEXT values left in encryption-expected columns that
 * the V0/V1->V2 rekey (audit-016-pr3) never covered (it re-wraps already-encrypted
 * envelopes only). Those plaintext rows cause the fail-closed decrypt control
 * (phiEncryption.ts:185, AUDIT-015) to THROW on read -> the production HTTP 500
 * authentication outage (AUDIT-108).
 *
 * SCOPE (from the 2026-06-03 production data-state census) - exactly 6 columns:
 *   users.firstName (1), users.lastName (1),
 *   recommendations.title (8), recommendations.description (8), recommendations.evidence (8),
 *   audit_logs.description (193).  Total 219 plaintext values across 202 rows.
 *
 * MECHANISM (per row whose value is plaintext):
 *   1. READ plaintext via $queryRawUnsafe (raw SQL bypasses the $extends decrypt
 *      path, so AUDIT-015 never throws on the read).
 *   2. ENCRYPT via the CANONICAL primitive encryptWithCurrent(value, contextFor(model, field))
 *      - the SAME function + EncryptionContext the app read path reconstructs, so
 *      backfilled rows decrypt on the real login/read path (no writer/reader drift).
 *   3. WRITE back via $executeRawUnsafe parameterized UPDATE (raw write bypasses the
 *      encryption middleware, preventing double-encrypt).
 *
 * NO PHI_LEGACY_PLAINTEXT_OK anywhere - the rejected global stopgap stays rejected;
 * raw-SQL read is exactly why the flag is not needed.
 *
 * IDEMPOTENCY: candidate predicate `NOT LIKE 'enc:%' AND <> '' AND IS NOT NULL` is
 * self-discriminating (an encrypted row leaves the set), so re-runs converge and
 * the infinite-loop class is structurally excluded. An all-skip assertion verifies
 * candidate count is 0 after --execute.
 *
 * GATES:
 *   --dry-run (default)  per-column candidate counts; NO writes.
 *   --execute            performs the backfill. Requires AUDIT_108_EXECUTE_CONFIRMED=yes.
 *   Pre-flight: PHI_ENCRYPTION_KEY + AWS_KMS_PHI_KEY_ALIAS + PHI_ENVELOPE_VERSION=v2;
 *   DEMO_MODE=true declines. Re-parse rejects a non-V2 emit.
 *
 * EXECUTION: ECS run-task command override on the post-merge image (census precedent);
 * never from a developer machine. Aurora snapshot before --execute (operator runbook).
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-108-plaintext-to-v2-backfill.ts --dry-run
 *   AUDIT_108_EXECUTE_CONFIRMED=yes PHI_ENVELOPE_VERSION=v2 AWS_KMS_PHI_KEY_ALIAS=... \
 *     npx tsx backend/scripts/migrations/audit-108-plaintext-to-v2-backfill.ts --execute
 *
 * Exit codes: 0 ok; 1 gate/pre-flight/assertion failure; 2 runtime error.
 */

import prisma from '../../src/lib/prisma';
import { encryptWithCurrent } from '../../src/services/keyRotation';
import { contextFor } from '../../src/middleware/phiEncryption';
import { auditLogger } from '../../src/middleware/auditLogger';

// -- Targets (census-scoped; table is snake_case @@map, model is PascalCase) --
export interface BackfillTarget {
  readonly table: string;
  readonly model: string;
  readonly column: string;
}

export const TARGETS: readonly BackfillTarget[] = [
  { table: 'users', model: 'User', column: 'firstName' },
  { table: 'users', model: 'User', column: 'lastName' },
  { table: 'recommendations', model: 'Recommendation', column: 'title' },
  { table: 'recommendations', model: 'Recommendation', column: 'description' },
  { table: 'recommendations', model: 'Recommendation', column: 'evidence' },
  { table: 'audit_logs', model: 'AuditLog', column: 'description' },
];

// -- Identifier safety: only a-z, 0-9, underscore; columns double-quoted -------
const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/i;
function assertSafeIdent(name: string): void {
  if (!SAFE_IDENT.test(name)) {
    throw new Error(`Unsafe identifier rejected: ${JSON.stringify(name)}`);
  }
}

/**
 * Self-discriminating candidate predicate. Plaintext = present, non-empty, and
 * NOT already an `enc:` envelope. Encrypted rows leave the set => re-run converges.
 */
export function candidatePredicate(column: string): string {
  assertSafeIdent(column);
  const c = `"${column}"`;
  return `${c} IS NOT NULL AND ${c}::text <> '' AND ${c}::text NOT LIKE 'enc:%'`;
}

/** Defensive: the read query must be SELECT-only (no mutation keywords). */
export function assertReadOnly(sql: string): void {
  if (!/^\s*SELECT\b/i.test(sql)) {
    throw new Error(`Read query is not SELECT-only: ${sql.slice(0, 60)}`);
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|MERGE)\b/i.test(sql)) {
    throw new Error('Read query contains a mutating keyword');
  }
}

function countSql(t: BackfillTarget): string {
  assertSafeIdent(t.table);
  return `SELECT count(*)::int AS n FROM ${t.table} WHERE ${candidatePredicate(t.column)}`;
}

function selectSql(t: BackfillTarget): string {
  assertSafeIdent(t.table);
  return `SELECT id, "${t.column}"::text AS val FROM ${t.table} WHERE ${candidatePredicate(t.column)}`;
}

async function countCandidates(t: BackfillTarget): Promise<number> {
  const sql = countSql(t);
  assertReadOnly(sql);
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  return rows[0]?.n ?? 0;
}

// -- CLI ----------------------------------------------------------------------
export interface CliOptions {
  readonly execute: boolean;
  readonly targetFilter: string | null; // e.g. "users.firstName"
}

export function parseArgs(argv: string[]): CliOptions {
  let execute = false;
  let targetFilter: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') execute = true;
    else if (a === '--dry-run') execute = false;
    else if (a === '--target') { targetFilter = argv[i + 1] ?? null; i++; }
  }
  return { execute, targetFilter };
}

export interface PreFlight { ok: boolean; errors: string[]; }

export function preFlightValidate(env: NodeJS.ProcessEnv = process.env): PreFlight {
  const errors: string[] = [];
  if (env.DEMO_MODE === 'true') {
    errors.push('DEMO_MODE=true is incompatible with --execute; the backfill declines to run on demo data.');
  }
  if (!env.PHI_ENCRYPTION_KEY) {
    errors.push('PHI_ENCRYPTION_KEY is required.');
  }
  if (env.PHI_ENVELOPE_VERSION !== 'v2') {
    errors.push(`PHI_ENVELOPE_VERSION must be 'v2'; got '${env.PHI_ENVELOPE_VERSION ?? '(unset)'}' (without it, encryptWithCurrent emits V1, not V2).`);
  }
  if (!env.AWS_KMS_PHI_KEY_ALIAS) {
    errors.push('AWS_KMS_PHI_KEY_ALIAS is required for V2 envelope emission.');
  }
  return { ok: errors.length === 0, errors };
}

export function checkExecuteConfirmation(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUDIT_108_EXECUTE_CONFIRMED === 'yes';
}

/** Encrypt one value with the canonical writer==reader context; reject non-V2. */
export async function encryptValue(plaintext: string, model: string, field: string): Promise<string> {
  const envelope = await encryptWithCurrent(plaintext, contextFor(model, field));
  if (!envelope.startsWith('enc:v2:')) {
    throw new Error(`Refusing to write non-V2 envelope (got prefix ${envelope.slice(0, 7)}); check PHI_ENVELOPE_VERSION=v2 + KMS.`);
  }
  return envelope;
}

// -- Phases -----------------------------------------------------------------
function selectedTargets(filter: string | null): readonly BackfillTarget[] {
  if (!filter) return TARGETS;
  return TARGETS.filter((t) => `${t.table}.${t.column}` === filter);
}

async function runDryRun(targets: readonly BackfillTarget[]): Promise<void> {
  console.log('=== AUDIT-108 backfill DRY-RUN (no writes) ===');
  let total = 0;
  for (const t of targets) {
    const n = await countCandidates(t);
    total += n;
    console.log(`  ${t.table}.${t.column}: ${n} plaintext candidate(s)`);
  }
  console.log(`TOTAL plaintext candidates: ${total}`);
}

async function runExecute(targets: readonly BackfillTarget[]): Promise<number> {
  console.log('=== AUDIT-108 backfill EXECUTE ===');
  let migrated = 0;
  let failed = 0;
  for (const t of targets) {
    const sql = selectSql(t);
    assertReadOnly(sql);
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; val: string }>>(sql);
    for (const row of rows) {
      try {
        const envelope = await encryptValue(row.val, t.model, t.column);
        // Raw parameterized write bypasses the encryption middleware (no double-encrypt).
        await prisma.$executeRawUnsafe(
          `UPDATE ${t.table} SET "${t.column}" = $1 WHERE id = $2`,
          envelope,
          row.id,
        );
        migrated++;
        // Best-effort audit trail (winston file/console transport), per the rekey precedent.
        auditLogger.info('audit_event', {
          action: 'PHI_RECORD_MIGRATED',
          resourceType: t.model,
          resourceId: row.id,
          description: `AUDIT-108 plaintext->V2 backfill: ${t.table}.${t.column}`,
        });
      } catch (e) {
        failed++;
        console.error(`  FAIL ${t.table}.${t.column} id=${row.id}: ${(e as Error).message}`);
      }
    }
    console.log(`  ${t.table}.${t.column}: ${rows.length} processed`);
  }
  console.log(`EXECUTE summary: migrated=${migrated} failed=${failed}`);

  // -- All-skip assertion (idempotency / convergence proof) --
  let remaining = 0;
  for (const t of targets) remaining += await countCandidates(t);
  if (remaining !== 0) {
    throw new Error(`All-skip assertion FAILED: ${remaining} plaintext candidate(s) remain after execute (backfill did not converge).`);
  }
  console.log('All-skip assertion PASSED: 0 plaintext candidates remain.');
  return failed;
}

async function main(): Promise<number> {
  const opts = parseArgs(process.argv.slice(2));
  const targets = selectedTargets(opts.targetFilter);
  if (targets.length === 0) {
    console.error(`No target matched filter '${opts.targetFilter}'.`);
    return 1;
  }

  if (!opts.execute) {
    await runDryRun(targets);
    return 0;
  }

  const pf = preFlightValidate();
  if (!pf.ok) {
    console.error('Pre-flight FAILED:');
    pf.errors.forEach((e) => console.error(`  - ${e}`));
    return 1;
  }
  if (!checkExecuteConfirmation()) {
    console.error('--execute requires AUDIT_108_EXECUTE_CONFIRMED=yes in the environment.');
    return 1;
  }
  console.error('WARNING: AUDIT-108 --execute encrypts PHI in-place. Take an Aurora snapshot first (runbook).');
  const failed = await runExecute(targets);
  return failed === 0 ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => prisma.$disconnect().then(() => process.exit(code)))
    .catch((e) => {
      console.error('FATAL:', (e as Error).message);
      prisma.$disconnect().finally(() => process.exit(2));
    });
}
