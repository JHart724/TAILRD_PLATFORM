/**
 * Tech debt #34 investigation script.
 *
 * READ-ONLY queries against the predecessor RDS instance `tailrd-production`
 * (db.t4g.medium, PG 15.10, created 2026-04-03) to determine its disposition.
 *
 * Outputs:
 *   - server_version, current_database, last vacuum stats
 *   - schema list (excluding pg_catalog/information_schema)
 *   - per-schema table list with row counts
 *   - PHI-shape probe: counts rows that LOOK like real data
 *     (no actual data values exported, only structural counts)
 *   - replication slot state
 *
 * NEVER prints actual row data. NEVER exports sample rows. Only counts +
 * structural metadata. If real PHI shape is detected, the script reports
 * the count + table location so the operator can do follow-up via secure
 * channels.
 *
 * Connects via `tailrd-production/rds/master-password` secret (Phase2D-T4g
 * temporary policy required at task role).
 */
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const T4G_HOST = 'tailrd-production.csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const MASTER_SECRET = 'tailrd-production/rds/master-password';

async function fetchMasterPassword() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: MASTER_SECRET }));
  // Secret might be a JSON object {username, password} or just the password string
  try {
    return JSON.parse(r.SecretString);
  } catch (_) {
    return { username: 'tailrd_admin', password: r.SecretString };
  }
}

async function connectT4g(creds) {
  const c = new Client({
    host: T4G_HOST,
    port: 5432,
    user: creds.username,
    password: creds.password,
    database: 'tailrd_platform',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
    query_timeout: 60000,
  });
  await c.connect();
  return c;
}

(async () => {
  const out = { generatedAt: new Date().toISOString() };
  let c;

  try {
    const creds = await fetchMasterPassword();
    out.connection = { host: T4G_HOST, database: 'tailrd_platform', user: creds.username };
    c = await connectT4g(creds);
  } catch (err) {
    out.verdict = 'CONNECT_ERROR';
    out.error = String(err.message || err);
    console.log('---T4G_INVESTIGATION---');
    console.log(JSON.stringify(out, null, 2));
    console.log('---END---');
    process.exit(1);
  }

  try {
    // 1. Server + DB metadata
    const meta = await c.query(`
      SELECT
        current_database() AS db,
        current_user AS connected_as,
        version() AS pg_version,
        pg_database_size(current_database())::bigint AS db_size_bytes,
        (SELECT setting FROM pg_settings WHERE name = 'wal_level') AS wal_level
    `);
    out.metadata = meta.rows[0];
    out.metadata.db_size_bytes = String(out.metadata.db_size_bytes);

    // 2. Schemas
    const schemas = await c.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND schema_name NOT LIKE 'pg_temp_%'
        AND schema_name NOT LIKE 'pg_toast_temp_%'
      ORDER BY schema_name
    `);
    out.schemas = schemas.rows.map((r) => r.schema_name);

    // 3. Tables (per schema) with row counts
    const tables = await c.query(`
      SELECT
        schemaname AS schema,
        relname AS table,
        n_live_tup::bigint AS rows,
        pg_total_relation_size(relid)::bigint AS size_bytes,
        last_autoanalyze,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY schemaname, relname
    `);
    out.tables = tables.rows.map((r) => ({
      schema: r.schema,
      table: r.table,
      rows: Number(r.rows),
      size_bytes: Number(r.size_bytes),
      last_analyze: r.last_analyze || r.last_autoanalyze,
    }));

    // 4. Total rows across all tables
    out.total_user_rows = out.tables.reduce((a, t) => a + t.rows, 0);

    // 5. Connection statistics from pg_stat_database
    const dbStats = await c.query(`
      SELECT
        numbackends,
        xact_commit::bigint AS commits,
        xact_rollback::bigint AS rollbacks,
        tup_returned::bigint AS tuples_returned,
        tup_inserted::bigint AS tuples_inserted,
        tup_updated::bigint AS tuples_updated,
        tup_deleted::bigint AS tuples_deleted,
        stats_reset
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    if (dbStats.rows.length > 0) {
      out.db_stats = {
        active_backends: dbStats.rows[0].numbackends,
        commits: String(dbStats.rows[0].commits),
        rollbacks: String(dbStats.rows[0].rollbacks),
        tuples_returned: String(dbStats.rows[0].tuples_returned),
        tuples_inserted: String(dbStats.rows[0].tuples_inserted),
        tuples_updated: String(dbStats.rows[0].tuples_updated),
        tuples_deleted: String(dbStats.rows[0].tuples_deleted),
        stats_reset: dbStats.rows[0].stats_reset,
      };
    }

    // 6. Replication slots (should be 0 if truly orphaned)
    try {
      const slots = await c.query(`SELECT slot_name, slot_type, active FROM pg_replication_slots`);
      out.replication_slots = slots.rows;
    } catch (_) {
      out.replication_slots = 'query failed';
    }

    // 7. PHI-shape probe — count rows that LOOK like they could be real PHI.
    //    Probe is per-table-name based, not column-content. Never prints data.
    out.phi_shape_probe = {};
    for (const t of out.tables) {
      if (t.rows === 0) continue;
      const tname = t.table.toLowerCase();
      // Likely PHI table names. Ad-hoc list — Synthea synthetic data also
      // matches some of these, so a non-zero count here is not definitive
      // proof of real PHI; it just means the table was populated.
      if (['patients', 'encounters', 'observations', 'conditions', 'medications',
           'audit_logs', 'users', 'login_sessions'].includes(tname)) {
        out.phi_shape_probe[`${t.schema}.${t.table}`] = {
          rows: t.rows,
          note: 'PHI-candidate table populated; verify Synthea-vs-real via separate channel',
        };
      }
    }

    // Verdict
    out.verdict = out.total_user_rows === 0
      ? 'EMPTY_RETIRE_SAFE'
      : (Object.keys(out.phi_shape_probe).length === 0
        ? 'POPULATED_NO_PHI_SHAPE'
        : 'POPULATED_PHI_SHAPE_PRESENT');
  } catch (err) {
    out.verdict = 'QUERY_ERROR';
    out.error = String(err.message || err);
  } finally {
    try { await c.end(); } catch (_) {}
  }

  console.log('---T4G_INVESTIGATION---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.verdict && (out.verdict.startsWith('EMPTY') || out.verdict.startsWith('POPULATED')) ? 0 : 1);
})();
