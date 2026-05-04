/**
 * Login-fix Step 1 — read-only users table audit on production RDS.
 *
 * Writes NOTHING. Redacts passwordHash. Uses DATABASE_URL injected via ECS
 * task-def secrets (same pattern as other phase-2d scripts). No IAM secrets
 * fetch needed for RDS — DATABASE_URL already in env.
 *
 * Output wrapped in ---USERS-AUDIT--- / ---END--- for log scrape.
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

function normalize(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === 'passwordHash') { out[k] = '<REDACTED>'; continue; }
      out[k] = typeof v === 'bigint' ? v.toString() : v;
    }
    return out;
  });
}

(async () => {
  const conn = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) { console.error('FATAL: DATABASE_URL not set'); process.exit(1); }

  const client = new Client({
    ...parseDbUrl(conn),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
    query_timeout: 60000,
  });

  const out = { generatedAt: new Date().toISOString(), ok: true };

  try {
    await client.connect();

    // 1. User count + active split
    const totals = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "isActive" = true)::int AS active,
        COUNT(*) FILTER (WHERE "isActive" = false)::int AS inactive
      FROM users
    `);
    out.user_totals = normalize(totals.rows)[0];

    // 2. Discover user table columns first (avoids column-name mismatches)
    const userCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users'
      ORDER BY ordinal_position
    `);
    out.user_columns = userCols.rows.map((r) => r.column_name);

    // 3. Full user list: select * with passwordHash redacted in normalize()
    const users = await client.query(`
      SELECT u.*, h.name AS _hospital_name
      FROM users u
      LEFT JOIN hospitals h ON h.id = u."hospitalId"
      ORDER BY u."createdAt" ASC
    `);
    out.users = normalize(users.rows);

    // 3. jhart / hart variant check (case-insensitive)
    const jhartCheck = await client.query(`
      SELECT email, "isActive" AS is_active, role, "hospitalId" AS hospital_id
      FROM users
      WHERE LOWER(email) LIKE '%jhart%' OR LOWER(email) LIKE '%hart%'
    `);
    out.jhart_variants = normalize(jhartCheck.rows);

    // 4. Hospitals table (to diagnose audit_logs FK violations too)
    const hospitals = await client.query(`
      SELECT id, name, "createdAt" AS created_at
      FROM hospitals
      ORDER BY "createdAt" ASC
    `);
    out.hospitals = normalize(hospitals.rows);

    // 5. Broken FK check — any user whose hospitalId does not exist in hospitals
    const orphanUsers = await client.query(`
      SELECT u.id, u.email, u.role, u."hospitalId" AS hospital_id
      FROM users u
      LEFT JOIN hospitals h ON h.id = u."hospitalId"
      WHERE h.id IS NULL
    `);
    out.orphan_users = normalize(orphanUsers.rows);

    // 6. audit_logs sample to see what hospitalId values have been written recently
    const auditRecent = await client.query(`
      SELECT "hospitalId" AS hospital_id, action, COUNT(*)::int AS n,
             MAX(timestamp) AS latest
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY "hospitalId", action
      ORDER BY latest DESC
      LIMIT 20
    `);
    out.audit_recent_24h = normalize(auditRecent.rows);

  } catch (e) {
    out.ok = false;
    out.error = String(e.message || e);
    out.stack = e.stack;
  } finally {
    try { await client.end(); } catch {}
  }

  console.log('---USERS-AUDIT---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.ok ? 0 : 1);
})();
