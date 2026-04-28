/**
 * Post-deploy verification for tech debt #28 fix (PR #184).
 *
 * READ-ONLY queries against the backend's actual database (RDS, via
 * DATABASE_URL inherited from the task def's secrets) to confirm:
 *   1. Table `performance_request_logs` exists
 *   2. Column shape matches the migration (12 columns + correct types)
 *   3. All 4 expected indexes are present
 *   4. Both expected FK constraints are present
 *   5. Rows are being written (recent timestamps, multiple endpoints/methods)
 *   6. Sample row shape (no NULLs in NOT NULL columns; metadata is jsonb)
 *
 * Pairs with steps 4.2 + 4.7 of the post-deploy verification plan.
 *
 * Production backend writes to RDS until Wave 2 cutover; Aurora is the
 * migration target and stays empty pre-cutover. This script targets RDS
 * via DATABASE_URL, the same connection the backend itself uses, so
 * "table exists" + "rows being written" reflect what the backend sees.
 * Single connection. No DDL. No DML.
 */
/* eslint-disable */
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

async function connectRds() {
  const url = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('PROBE_DATABASE_URL or DATABASE_URL env var required');
  const c = new Client({
    ...parseDbUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 60000, query_timeout: 60000,
  });
  await c.connect();
  return c;
}

(async () => {
  const out = { generatedAt: new Date().toISOString() };
  const c = await connectRds();
  try {
    // Step 4.1 / 4.2: table existence + structure
    const tableExists = await c.query(`SELECT to_regclass('public.performance_request_logs') AS reg`);
    out.tableExists = tableExists.rows[0].reg;

    const cols = await c.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'performance_request_logs'
      ORDER BY ordinal_position
    `);
    out.columns = cols.rows;

    const indexes = await c.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'performance_request_logs'
      ORDER BY indexname
    `);
    out.indexes = indexes.rows;

    const fks = await c.query(`
      SELECT conname AS constraint_name,
             pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public.performance_request_logs'::regclass
        AND contype = 'f'
      ORDER BY conname
    `);
    out.foreign_keys = fks.rows;

    // Step 4.7: row counts + recency (last 60 minutes - generous window
    // for real-world delays between traffic generation and verification)
    const rowStats = await c.query(`
      SELECT
        COUNT(*)::int AS total_rows,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '60 minutes')::int AS recent_rows_60min,
        MIN(timestamp) AS earliest,
        MAX(timestamp) AS latest,
        COUNT(DISTINCT endpoint)::int AS distinct_endpoints,
        COUNT(DISTINCT method)::int AS distinct_methods,
        COUNT(DISTINCT "hospitalId")::int AS distinct_hospitals,
        COUNT(DISTINCT "userId")::int AS distinct_users
      FROM performance_request_logs
    `);
    out.row_stats = rowStats.rows[0];

    // Distribution over 5-minute buckets within the last 60 minutes.
    // Catches "writes stopped suddenly" cases that a single COUNT misses.
    const buckets = await c.query(`
      SELECT
        date_bin('5 minutes', timestamp, TIMESTAMP '2000-01-01 00:00:00') AS bucket,
        COUNT(*)::int AS count
      FROM performance_request_logs
      WHERE timestamp > NOW() - INTERVAL '60 minutes'
      GROUP BY bucket
      ORDER BY bucket
    `);
    out.minute_buckets = buckets.rows;

    // Sample 5 most recent rows (column shape check + spot data)
    const sample = await c.query(`
      SELECT id, "hospitalId", "userId", endpoint, method, "statusCode",
             "responseTime", "memoryUsage",
             metadata IS NULL AS metadata_is_null,
             jsonb_typeof(metadata) AS metadata_type,
             timestamp
      FROM performance_request_logs
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    out.recent_sample = sample.rows;

    // Verdict
    const expectedColumns = [
      'id', 'hospitalId', 'userId', 'endpoint', 'method', 'statusCode',
      'responseTime', 'memoryUsage', 'cpuUsage', 'dbQueryTime', 'metadata', 'timestamp',
    ];
    const actualColumns = out.columns.map((c) => c.column_name);
    const missingColumns = expectedColumns.filter((c) => !actualColumns.includes(c));

    const expectedIndexes = [
      'performance_request_logs_pkey',
      'performance_request_logs_hospitalId_timestamp_idx',
      'performance_request_logs_userId_timestamp_idx',
      'performance_request_logs_endpoint_timestamp_idx',
      'performance_request_logs_timestamp_idx',
    ];
    const actualIndexes = out.indexes.map((i) => i.indexname);
    const missingIndexes = expectedIndexes.filter((i) => !actualIndexes.includes(i));

    const expectedFks = [
      'performance_request_logs_hospitalId_fkey',
      'performance_request_logs_userId_fkey',
    ];
    const actualFks = out.foreign_keys.map((f) => f.constraint_name);
    const missingFks = expectedFks.filter((f) => !actualFks.includes(f));

    out.verdict_checks = {
      tableExists: out.tableExists === 'performance_request_logs',
      columnsComplete: missingColumns.length === 0,
      missingColumns,
      indexesComplete: missingIndexes.length === 0,
      missingIndexes,
      fksComplete: missingFks.length === 0,
      missingFks,
      rowsWritten: out.row_stats.total_rows > 0,
      recentWrites: out.row_stats.recent_rows_60min > 0,
    };

    const allOk = Object.values(out.verdict_checks)
      .filter((v) => typeof v === 'boolean')
      .every(Boolean);
    out.verdict = allOk ? 'CLEAN' : 'NEEDS_REVIEW';
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  } finally {
    try { await c.end(); } catch (_) { /* noop */ }
  }

  console.log('---VERIFY---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.verdict === 'CLEAN' ? 0 : 1);
})();
