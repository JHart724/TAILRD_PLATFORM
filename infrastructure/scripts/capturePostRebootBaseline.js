/**
 * Day 6 post-reboot baseline capture.
 *
 * Runs after the 30-minute post-reboot observation window. Captures:
 *   1. pg_stat_statements top 20 queries by total_exec_time
 *   2. pg_stat_statements aggregate totals (across all queries)
 *   3. Active session count + connections per database
 *   4. Replication slots census (should be 0 post-Phase-6E)
 *   5. Reset-time reference for pg_stat_statements (so the observation
 *      window duration can be confirmed later)
 *
 * Output: one JSON document to stdout between --BASELINE-- markers.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });

async function q(sql) {
  return await prisma.$queryRawUnsafe(sql);
}

// Helper — convert any bigints in a row to strings so JSON.stringify doesn't die
function normalize(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = typeof v === 'bigint' ? v.toString() : v;
    }
    return out;
  });
}

(async () => {
  const out = { ok: true, ts: new Date().toISOString(), sections: {} };

  try {
    // pg_stat_statements version + reset time reference
    try {
      const ext = await q(
        `SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements'`
      );
      out.sections.extension = normalize(ext);
    } catch (e) {
      out.sections.extension_err = String(e.message || e);
    }

    // Current wall-clock (DB-side) — correlates with our observation-window end
    try {
      const now = await q(`SELECT now()::text AS db_now, current_timestamp::text AS ts`);
      out.sections.db_now = normalize(now);
    } catch {}

    // Top 20 queries by total_exec_time
    try {
      const top = await q(`
        SELECT
          queryid::text AS queryid,
          calls::text AS calls,
          ROUND(mean_exec_time::numeric, 3)::text AS mean_exec_ms,
          ROUND(total_exec_time::numeric, 2)::text AS total_exec_ms,
          ROUND(max_exec_time::numeric, 2)::text AS max_exec_ms,
          rows::text AS rows_returned,
          LEFT(REGEXP_REPLACE(query, '[\\r\\n\\t ]+', ' ', 'g'), 280) AS query_preview
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        ORDER BY total_exec_time DESC
        LIMIT 20
      `);
      out.sections.top20 = normalize(top);
    } catch (e) {
      out.sections.top20_err = String(e.message || e);
      out.ok = false;
    }

    // Aggregate totals
    try {
      const agg = await q(`
        SELECT
          COUNT(*)::text AS unique_queries,
          SUM(calls)::text AS total_calls,
          ROUND(SUM(total_exec_time)::numeric, 2)::text AS total_exec_ms,
          ROUND(AVG(mean_exec_time)::numeric, 3)::text AS avg_mean_exec_ms,
          MAX(max_exec_time)::text AS worst_query_max_ms
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `);
      out.sections.aggregate = normalize(agg);
    } catch (e) {
      out.sections.aggregate_err = String(e.message || e);
    }

    // Active session census
    try {
      const sess = await q(`
        SELECT state, COUNT(*)::text AS n
        FROM pg_stat_activity
        WHERE datname IS NOT NULL
        GROUP BY state
      `);
      out.sections.sessions_by_state = normalize(sess);

      const db = await q(`
        SELECT datname, COUNT(*)::text AS connections
        FROM pg_stat_activity
        WHERE datname IS NOT NULL
        GROUP BY datname
      `);
      out.sections.connections_by_db = normalize(db);
    } catch (e) {
      out.sections.sessions_err = String(e.message || e);
    }

    // Long-running queries (> 60s)
    try {
      const slow = await q(`
        SELECT
          pid::text AS pid,
          datname,
          usename,
          state,
          EXTRACT(EPOCH FROM (now() - query_start))::int::text AS duration_s,
          LEFT(query, 200) AS query_preview
        FROM pg_stat_activity
        WHERE datname = 'tailrd'
          AND state != 'idle'
          AND query_start < now() - interval '60 seconds'
        ORDER BY query_start
      `);
      out.sections.long_running = normalize(slow);
      if (slow.length > 0) {
        out.warnings = out.warnings || [];
        out.warnings.push(`${slow.length} long-running (>60s) queries detected`);
      }
    } catch (e) {
      out.sections.long_running_err = String(e.message || e);
    }

    // Replication slots — should be 0 after Phase 6E cleanup
    try {
      const slots = await q(`
        SELECT slot_name, plugin, slot_type, database, active
        FROM pg_replication_slots
      `);
      out.sections.replication_slots = normalize(slots);
      if (slots.length > 0) {
        out.warnings = out.warnings || [];
        out.warnings.push(`${slots.length} replication slots present (expected 0 at Day 6 close)`);
      }
    } catch (e) {
      out.sections.replication_slots_err = String(e.message || e);
    }

    // Logical replication runtime state (should reflect on / logical / 25)
    try {
      const show = await q(`
        SELECT name, setting
        FROM pg_settings
        WHERE name IN ('wal_level','rds.logical_replication','max_replication_slots','max_wal_senders')
        ORDER BY name
      `);
      out.sections.logical_repl_settings = normalize(show);
    } catch (e) {
      out.sections.logical_repl_err = String(e.message || e);
    }
  } catch (e) {
    out.ok = false;
    out.fatal = String(e.message || e);
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }

  console.log('---BASELINE---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END-BASELINE---');
  process.exit(out.ok ? 0 : 1);
})();
