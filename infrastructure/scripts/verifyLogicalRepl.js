/**
 * Post-reboot verification for RDS logical replication enablement.
 *
 * Run via ECS one-shot using the backend image (has @prisma/client + DATABASE_URL).
 * Confirms the four SHOW values required by change record CR-2026-04-21-001,
 * then enables pg_stat_statements (idempotent) and resets its stats.
 *
 * Emits a single JSON object to stdout on exit so the operator can grep it out
 * of CloudWatch Logs without regex gymnastics.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });

async function showOne(name) {
  const rows = await prisma.$queryRawUnsafe(`SHOW ${name}`);
  // $queryRawUnsafe returns [{<name>: '<value>'}] for SHOW
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? row[name] : null;
}

(async () => {
  const out = { ok: true, checks: {}, errors: [] };
  const required = [
    ['wal_level', 'logical'],
    ['rds.logical_replication', 'on'],
    ['max_replication_slots', '10'],
  ];
  try {
    for (const [name, expected] of required) {
      const val = await showOne(name);
      out.checks[name] = { value: val, expected, pass: val === expected };
      if (val !== expected) {
        out.ok = false;
        out.errors.push(`${name}: got "${val}", expected "${expected}"`);
      }
    }
    // max_wal_senders: expect >= 10 (AWS will auto-adjust upward for Multi-AZ)
    const wsStr = await showOne('max_wal_senders');
    const wsNum = Number(wsStr);
    out.checks['max_wal_senders'] = { value: wsStr, expected: '>=10', pass: wsNum >= 10 };
    if (!(wsNum >= 10)) {
      out.ok = false;
      out.errors.push(`max_wal_senders: got "${wsStr}", expected >= 10`);
    }
    // shared_preload_libraries should include pg_stat_statements (AWS default on RDS PG15)
    const spl = await showOne('shared_preload_libraries');
    out.checks['shared_preload_libraries'] = {
      value: spl,
      expected: 'contains pg_stat_statements',
      pass: typeof spl === 'string' && spl.includes('pg_stat_statements'),
    };

    // pg_stat_statements enable (idempotent) + reset
    try {
      await prisma.$queryRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
      out.checks['pg_stat_statements_create'] = { pass: true };
    } catch (e) {
      out.checks['pg_stat_statements_create'] = { pass: false, error: String(e.message || e) };
      out.ok = false;
      out.errors.push(`pg_stat_statements create: ${e.message || e}`);
    }
    try {
      const rst = await prisma.$queryRawUnsafe('SELECT pg_stat_statements_reset()');
      out.checks['pg_stat_statements_reset'] = { pass: true, result: rst };
    } catch (e) {
      out.checks['pg_stat_statements_reset'] = { pass: false, error: String(e.message || e) };
      // Reset may fail if extension not in a queryable state — don't hard-fail overall check
    }
  } catch (e) {
    out.ok = false;
    out.errors.push(`fatal: ${String(e.message || e)}`);
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }

  // Marker line for easy grep in CloudWatch
  console.log('---VERIFY-RESULT---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END-VERIFY-RESULT---');
  process.exit(out.ok ? 0 : 1);
})();
