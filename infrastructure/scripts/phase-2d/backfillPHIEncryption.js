/**
 * AUDIT-015 backfill — re-encrypt 51 legacy plaintext rows in production.
 *
 * Companion to:
 *   - infrastructure/scripts/phase-2d/verify-phi-legacy.js (pre-state)
 *   - docs/audit/PHASE_2_REPORT.md (Tier S findings)
 *   - docs/audit/TIER_S_REMEDIATION_DESIGN.md (Path A design)
 *
 * Pattern (Option A authorized 2026-04-29):
 *   1. Import the production Prisma singleton from /app/dist/lib/prisma.js
 *      — this is the same client every production write uses, with the
 *      PHI encryption middleware (applyPHIEncryption) already attached.
 *   2. For each row found by verify-phi-legacy.js:
 *        a. prisma.<model>.findUnique() — middleware decrypts (returns
 *           legacy plaintext as-is when PHI_LEGACY_PLAINTEXT_OK=true).
 *        b. prisma.<model>.update() with the same value — middleware
 *           re-encrypts on write, replacing plaintext with enc:iv:tag:ct.
 *   3. Per-model post-verification via raw pg query — confirms 0 plaintext
 *      rows remain for that model before moving to the next.
 *
 * Required env:
 *   PHI_LEGACY_PLAINTEXT_OK=true   (so the decrypt path passes legacy through)
 *   PHI_ENCRYPTION_KEY=<hex>       (production key from Secrets Manager;
 *                                   the production task def already injects this)
 *   DATABASE_URL=<aurora-url>      (production task def injects this from
 *                                   tailrd-production/app/database-url)
 *
 * IMPORTANT: this script logs only ids, model/column names, and success
 * flags. It NEVER logs decrypted PHI values.
 *
 * Output: JSON envelope on stdout, progress on stderr.
 * Exit: 0 on full success (anyFailures=false AND verificationPostBackfill
 *       all-zero), 1 otherwise.
 */
/* eslint-disable */

const { Client } = require('pg');

// Import the production Prisma singleton (compiled to /app/dist by Docker
// build; contains the applyPHIEncryption middleware already wired).
const prisma = require('/app/dist/lib/prisma').default;

// (model, table, column) tuples from verify-phi-legacy.js findings.
// Model = Prisma model name (camelCase access), table = Postgres table name
// (snake_case from @@map), column = field name in both Prisma and DB
// (since these PHI fields are not @map'd to different DB column names).
const TARGETS = [
  { model: 'patient',              table: 'patients',              column: 'dateOfBirth' },
  { model: 'observation',          table: 'observations',          column: 'orderingProvider' },
  { model: 'alert',                table: 'alerts',                column: 'message' },
  { model: 'drugTitration',        table: 'drug_titrations',       column: 'drugName' },
  { model: 'interventionTracking', table: 'intervention_tracking', column: 'interventionName' },
  { model: 'interventionTracking', table: 'intervention_tracking', column: 'indication' },
  { model: 'interventionTracking', table: 'intervention_tracking', column: 'performingProvider' },
  { model: 'interventionTracking', table: 'intervention_tracking', column: 'outcome' },
];

function err(msg) {
  process.stderr.write(`${new Date().toISOString()} ${msg}\n`);
}

async function main() {
  // Build a separate raw-pg client for the pre/post SELECT queries.
  // Prisma is for the encrypt-on-write path; raw pg is for the
  // verification SELECT (we want to see the raw on-disk value, not
  // the middleware-decrypted value).
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const u = new URL(url);
  const pg = new Client({
    host: u.hostname,
    port: 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '').split('?')[0] || 'tailrd',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();
  err(`Connected to ${u.hostname}`);

  const envelope = {
    startedAt: new Date().toISOString(),
    totalRowsProcessed: 0,
    totalRowsSucceeded: 0,
    totalRowsFailed: 0,
    by_model_column: {},
    failures: [],
    verificationPostBackfill: {},
  };

  for (const t of TARGETS) {
    const key = `${t.model}.${t.column}`;
    err(`---`);
    err(`[${key}] starting backfill (table=${t.table})`);

    // Step a: fetch IDs of rows that are still plaintext.
    // Read raw via pg (so we get the on-disk value, not middleware-decrypted).
    const selectSql = `SELECT id FROM "${t.table}" WHERE "${t.column}" IS NOT NULL AND "${t.column}" != '' AND "${t.column}" NOT LIKE 'enc:%'`;
    let ids;
    try {
      const r = await pg.query(selectSql);
      ids = r.rows.map((row) => row.id);
    } catch (e) {
      err(`[${key}] SELECT failed: ${e.message}`);
      envelope.failures.push({ model: t.model, column: t.column, id: null, error: `select: ${e.message}` });
      envelope.by_model_column[key] = { processed: 0, succeeded: 0, failed: 0, error: e.message };
      continue;
    }

    err(`[${key}] ${ids.length} legacy row(s) to backfill`);
    const stat = { processed: 0, succeeded: 0, failed: 0 };

    // Step b: per-row read via Prisma (decrypt path), then update via Prisma
    // (encrypt path). NEVER log the actual value — only the id and outcome.
    for (const id of ids) {
      stat.processed++;
      try {
        // Read current value via Prisma (decrypt path; PHI_LEGACY_PLAINTEXT_OK
        // is true so legacy plaintext returns as-is).
        const row = await prisma[t.model].findUnique({ where: { id }, select: { [t.column]: true } });
        if (!row) {
          throw new Error('row vanished between SELECT and findUnique');
        }
        const currentValue = row[t.column];
        if (currentValue == null || currentValue === '') {
          err(`[${key}] id=${id} skipped — value null/empty after read`);
          stat.processed--;
          continue;
        }
        // Write back via Prisma update — middleware encrypts on write.
        await prisma[t.model].update({ where: { id }, data: { [t.column]: currentValue } });
        stat.succeeded++;
      } catch (e) {
        stat.failed++;
        envelope.failures.push({ model: t.model, column: t.column, id, error: e.message });
        err(`[${key}] id=${id} FAILED: ${e.message}`);
      }
    }

    err(`[${key}] processed=${stat.processed} succeeded=${stat.succeeded} failed=${stat.failed}`);

    // Step c: post-verify via raw pg — count rows still plaintext.
    let stillPlaintext = -1;
    try {
      const r = await pg.query(
        `SELECT COUNT(*)::int AS c FROM "${t.table}" WHERE "${t.column}" IS NOT NULL AND "${t.column}" != '' AND "${t.column}" NOT LIKE 'enc:%'`,
      );
      stillPlaintext = r.rows[0].c;
      err(`[${key}] post-verify: ${stillPlaintext} legacy rows remaining`);
    } catch (e) {
      err(`[${key}] post-verify SELECT failed: ${e.message}`);
    }

    envelope.by_model_column[key] = stat;
    envelope.verificationPostBackfill[key] = { stillPlaintext };

    envelope.totalRowsProcessed += stat.processed;
    envelope.totalRowsSucceeded += stat.succeeded;
    envelope.totalRowsFailed += stat.failed;
  }

  envelope.completedAt = new Date().toISOString();
  envelope.anyFailures = envelope.failures.length > 0;
  const allClean = Object.values(envelope.verificationPostBackfill).every(
    (v) => v && v.stillPlaintext === 0,
  );
  envelope.allClean = allClean;

  await pg.end();
  await prisma.$disconnect();

  // Final JSON envelope on stdout (single source of truth for the operator).
  console.log('---PHI_BACKFILL---');
  console.log(JSON.stringify(envelope, null, 2));
  console.log('---END---');

  process.exit(envelope.anyFailures || !allClean ? 1 : 0);
}

main().catch((e) => {
  err(`FATAL: ${e.message}`);
  err(e.stack || '');
  console.log('---PHI_BACKFILL---');
  console.log(JSON.stringify({ fatalError: e.message }, null, 2));
  console.log('---END---');
  process.exit(2);
});
