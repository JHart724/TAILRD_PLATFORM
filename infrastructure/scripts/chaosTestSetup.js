/**
 * Day 7 Phase 7B — chaos test table setup on STAGING RDS.
 * Creates a small harmless table with 2 rows. Run via ECS one-shot
 * against staging using PROBE_DATABASE_URL override.
 *
 * Idempotent: CREATE TABLE IF NOT EXISTS, INSERTs use ON CONFLICT DO NOTHING.
 */
const { Client } = require('pg');

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

(async () => {
  const conn = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({ ...parseDbUrl(conn), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  const result = { ok: true, steps: [] };
  try {
    await client.connect();
    result.steps.push({ step: 'connect', ok: true });
    await client.query(`CREATE TABLE IF NOT EXISTS chaos_test_day7 (id int PRIMARY KEY, label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    result.steps.push({ step: 'create_table', ok: true });
    await client.query(`INSERT INTO chaos_test_day7 (id, label) VALUES (1, 'phase-7b-row-1'), (2, 'phase-7b-row-2') ON CONFLICT (id) DO NOTHING`);
    const rows = await client.query(`SELECT id, label FROM chaos_test_day7 ORDER BY id`);
    result.steps.push({ step: 'verify', ok: true, count: rows.rows.length, rows: rows.rows });
  } catch (e) {
    result.ok = false;
    result.error = String(e.message || e);
  } finally {
    try { await client.end(); } catch {}
  }
  console.log('---CHAOS-SETUP-RESULT---');
  console.log(JSON.stringify(result, null, 2));
  console.log('---END---');
  process.exit(result.ok ? 0 : 1);
})();
