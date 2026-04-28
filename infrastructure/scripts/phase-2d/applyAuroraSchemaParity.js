/**
 * Pre-Wave-2 Aurora schema parity:
 *   1. Apply any missing Prisma migrations to Aurora (via `prisma migrate deploy`)
 *   2. DROP chaos_test_day7 (stale Day 7 test artifact)
 *   3. Schema parity check for the 21 NEEDS_MIGRATION tables: compare column
 *      metadata (name/type/nullability/default) between RDS and Aurora.
 *
 * Single Fargate run. Standard `tailrd-backend` task def container has
 * /app/prisma/migrations/ already baked in (deploy workflow always copies
 * the prisma directory in the multi-stage Docker build). `npx prisma migrate
 * deploy` reads from that directory and applies any migrations not already
 * recorded in the target's `_prisma_migrations` table.
 *
 * Aurora connection: built from `tailrd-production/app/aurora-db-password`
 * secret (Phase2D-TempSecretsAccess required).
 * RDS connection: process.env.DATABASE_URL (injected by task def secrets,
 * available to the existing ECS task role permissions).
 *
 * Exit code:
 *   0 - verdict CLEAN (all migrations applied, parity verified, drop ok)
 *   1 - anything else (operator must investigate)
 */
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { spawnSync } = require('child_process');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const AURORA_SECRET = 'tailrd-production/app/aurora-db-password';

// The 21 NEEDS_MIGRATION tables from inventoryRdsAurora.js output, sorted alpha
const PARITY_TABLES = [
  'alerts', 'allergy_intolerances', 'audit_logs', 'conditions',
  'contraindication_assessments', 'device_implants', 'drug_titrations',
  'encounters', 'error_logs', 'hospitals', 'intervention_tracking',
  'login_sessions', 'medications', 'observations', 'patients',
  'phenotypes', 'procedures', 'recommendations', 'risk_score_assessments',
  'therapy_gaps', 'users',
];

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1) || 'postgres',
  };
}

async function fetchAuroraSecret() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: AURORA_SECRET }));
  return JSON.parse(r.SecretString);
}

function buildAuroraUrl(secret) {
  const password = encodeURIComponent(secret.password);
  return `postgresql://${secret.username}:${password}@${AURORA_WRITER}:5432/tailrd?sslmode=require`;
}

async function connectAurora(secret) {
  const c = new Client({
    host: AURORA_WRITER, port: 5432, user: secret.username, password: secret.password, database: 'tailrd',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 120000, query_timeout: 120000,
  });
  await c.connect();
  return c;
}

async function connectRds() {
  const url = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL env var required');
  const c = new Client({
    ...parseDbUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 120000, query_timeout: 120000,
  });
  await c.connect();
  return c;
}

async function listAppliedMigrations(client) {
  try {
    const r = await client.query(`
      SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
      FROM _prisma_migrations
      ORDER BY migration_name
    `);
    return r.rows.map((row) => ({
      name: row.migration_name,
      finishedAt: row.finished_at,
      stepsApplied: row.applied_steps_count,
      rolledBack: row.rolled_back_at !== null,
    }));
  } catch (err) {
    return { error: String(err.message || err) };
  }
}

async function getColumnsForTable(client, table) {
  const r = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  return r.rows;
}

function diffColumns(rdsCols, auroraCols, table) {
  const diffs = [];
  const rdsByName = new Map(rdsCols.map((c) => [c.column_name, c]));
  const auroraByName = new Map(auroraCols.map((c) => [c.column_name, c]));

  for (const colName of new Set([...rdsByName.keys(), ...auroraByName.keys()])) {
    const r = rdsByName.get(colName);
    const a = auroraByName.get(colName);
    if (!r) {
      diffs.push({ table, column: colName, type: 'AURORA_ONLY', aurora: a });
      continue;
    }
    if (!a) {
      diffs.push({ table, column: colName, type: 'RDS_ONLY', rds: r });
      continue;
    }
    // Compare each property
    const fieldDiffs = {};
    for (const k of ['data_type', 'udt_name', 'is_nullable', 'column_default']) {
      if (r[k] !== a[k]) {
        fieldDiffs[k] = { rds: r[k], aurora: a[k] };
      }
    }
    if (Object.keys(fieldDiffs).length > 0) {
      diffs.push({ table, column: colName, type: 'MISMATCH', diffs: fieldDiffs });
    }
  }
  return diffs;
}

(async () => {
  const out = { generatedAt: new Date().toISOString() };

  // Step A: Aurora migration state BEFORE
  const auroraSecret = await fetchAuroraSecret();
  let aurora = await connectAurora(auroraSecret);
  out.aurora_migrations_before = await listAppliedMigrations(aurora);
  await aurora.end();

  // Step B: Run `prisma migrate deploy` against Aurora
  const auroraUrl = buildAuroraUrl(auroraSecret);
  console.log('Running prisma migrate deploy against Aurora...');
  const md = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: '/app',
    env: { ...process.env, DATABASE_URL: auroraUrl },
    encoding: 'utf8',
    timeout: 180000,
  });
  out.migrate_deploy = {
    exitCode: md.status,
    stdout: (md.stdout || '').slice(0, 4000),
    stderr: (md.stderr || '').slice(0, 4000),
  };
  if (md.status !== 0) {
    out.verdict = 'MIGRATE_DEPLOY_FAILED';
    console.log('---PARITY---');
    console.log(JSON.stringify(out, null, 2));
    console.log('---END---');
    process.exit(1);
  }

  // Step C: Aurora migration state AFTER + DROP chaos_test_day7
  aurora = await connectAurora(auroraSecret);
  try {
    out.aurora_migrations_after = await listAppliedMigrations(aurora);

    // chaos_test_day7 cleanup
    const existsBefore = await aurora.query(
      `SELECT to_regclass('public.chaos_test_day7') AS reg`
    );
    const existed = existsBefore.rows[0].reg !== null;
    await aurora.query(`DROP TABLE IF EXISTS public.chaos_test_day7`);
    const existsAfter = await aurora.query(
      `SELECT to_regclass('public.chaos_test_day7') AS reg`
    );
    out.chaos_test_day7 = {
      existed_before: existed,
      exists_after: existsAfter.rows[0].reg !== null,
      dropped: existed && existsAfter.rows[0].reg === null,
    };

    // Step D: Schema parity for the 21 tables
    const rds = await connectRds();
    try {
      out.rds_migrations_applied = await listAppliedMigrations(rds);
      const allDiffs = [];
      const tableResults = [];
      for (const t of PARITY_TABLES) {
        const rdsCols = await getColumnsForTable(rds, t);
        const auroraCols = await getColumnsForTable(aurora, t);
        const diffs = diffColumns(rdsCols, auroraCols, t);
        tableResults.push({ table: t, rdsColumns: rdsCols.length, auroraColumns: auroraCols.length, diffCount: diffs.length });
        allDiffs.push(...diffs);
      }
      out.schema_parity = {
        tables_checked: PARITY_TABLES.length,
        matches: tableResults.filter((r) => r.diffCount === 0).length,
        mismatches: allDiffs,
        per_table: tableResults,
        verdict: allDiffs.length === 0 ? 'PARITY_PASS' : 'PARITY_FAIL',
      };
    } finally {
      try { await rds.end(); } catch (_) {}
    }
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  } finally {
    try { await aurora.end(); } catch (_) {}
  }

  if (!out.verdict) {
    const ok = out.migrate_deploy.exitCode === 0
      && out.chaos_test_day7.exists_after === false
      && out.schema_parity.verdict === 'PARITY_PASS';
    out.verdict = ok ? 'CLEAN' : 'NEEDS_REVIEW';
  }

  console.log('---PARITY---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.verdict === 'CLEAN' ? 0 : 1);
})();
