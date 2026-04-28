/**
 * Inventory all public-schema tables across RDS (source) and Aurora (target).
 *
 * Output: per-table row counts on each side + categorization:
 *   - NEEDS_MIGRATION: RDS has rows, Aurora is empty
 *   - ALREADY_MIGRATED: counts match (>= 1 row each)
 *   - EMPTY_BOTH_OK:    both sides have 0 rows (no-op)
 *   - DRIFT_AURORA_AHEAD: Aurora > RDS (anomaly - investigate)
 *   - DRIFT_PARTIAL:    counts differ but both > 0 (anomaly - investigate)
 *
 * Excludes:
 *   - _prisma_migrations: Prisma internal, has separate lifecycle
 *   - awsdms_*: DMS control tables (should be absent on Aurora)
 *
 * READ-ONLY. Two connections (RDS via DATABASE_URL, Aurora via secret).
 */
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const AURORA_SECRET = 'tailrd-production/app/aurora-db-password';

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

async function connectAurora() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: AURORA_SECRET }));
  const s = JSON.parse(r.SecretString);
  const c = new Client({
    host: AURORA_WRITER, port: 5432, user: s.username, password: s.password, database: 'tailrd',
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

async function listTables(client) {
  const r = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '\\_prisma\\_%' ESCAPE '\\'
      AND table_name NOT LIKE 'awsdms\\_%' ESCAPE '\\'
    ORDER BY table_name
  `);
  return r.rows.map((row) => row.table_name);
}

async function countRows(client, table) {
  // Quoted identifier to handle camelCase or reserved-word table names
  const r = await client.query(`SELECT COUNT(*)::bigint AS n FROM "${table}"`);
  return Number(r.rows[0].n);
}

function categorize(rdsCount, auroraCount) {
  if (rdsCount === 0 && auroraCount === 0) return 'EMPTY_BOTH_OK';
  if (rdsCount > 0 && auroraCount === 0) return 'NEEDS_MIGRATION';
  if (rdsCount === 0 && auroraCount > 0) return 'DRIFT_AURORA_AHEAD';
  if (rdsCount === auroraCount) return 'ALREADY_MIGRATED';
  return 'DRIFT_PARTIAL';
}

(async () => {
  const out = { generatedAt: new Date().toISOString(), tables: [], summary: {} };
  const aurora = await connectAurora();
  const rds = await connectRds();
  try {
    const rdsTables = await listTables(rds);
    const auroraTables = await listTables(aurora);
    const all = Array.from(new Set([...rdsTables, ...auroraTables])).sort();

    for (const t of all) {
      const inRds = rdsTables.includes(t);
      const inAurora = auroraTables.includes(t);
      let rdsCount = null;
      let auroraCount = null;
      try { if (inRds) rdsCount = await countRows(rds, t); } catch (e) { rdsCount = `ERROR: ${e.message}`; }
      try { if (inAurora) auroraCount = await countRows(aurora, t); } catch (e) { auroraCount = `ERROR: ${e.message}`; }

      let category;
      if (!inRds || !inAurora) {
        category = !inRds ? 'AURORA_ONLY' : 'RDS_ONLY';
      } else if (typeof rdsCount === 'number' && typeof auroraCount === 'number') {
        category = categorize(rdsCount, auroraCount);
      } else {
        category = 'COUNT_ERROR';
      }
      out.tables.push({ table: t, rds: rdsCount, aurora: auroraCount, category });
    }

    // Summary by category
    const summary = {};
    for (const row of out.tables) {
      summary[row.category] = (summary[row.category] || 0) + 1;
    }
    out.summary = summary;

    out.needs_migration = out.tables.filter((r) => r.category === 'NEEDS_MIGRATION').map((r) => r.table);
    out.drift_anomalies = out.tables.filter((r) =>
      r.category === 'DRIFT_AURORA_AHEAD' || r.category === 'DRIFT_PARTIAL' || r.category === 'COUNT_ERROR' || r.category === 'AURORA_ONLY' || r.category === 'RDS_ONLY'
    );

    out.verdict = out.drift_anomalies.length === 0 ? 'CLEAN' : 'ANOMALIES_PRESENT';

    // RDS replication slots check (added 2026-04-27 for Wave 2 combined pre-start)
    try {
      const slotRes = await rds.query(
        `SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots ORDER BY slot_name`
      );
      out.rds_replication_slots = slotRes.rows;
      out.rds_slots_clean = slotRes.rows.length === 0;
      if (!out.rds_slots_clean) out.verdict = 'ANOMALIES_PRESENT';
    } catch (err) {
      out.rds_replication_slots = `ERROR: ${err.message}`;
      out.verdict = 'ANOMALIES_PRESENT';
    }
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  } finally {
    try { await aurora.end(); } catch (_) {}
    try { await rds.end(); } catch (_) {}
  }

  console.log('---INVENTORY---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(0);
})();
