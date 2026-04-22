/**
 * RDS reboot health-check probe (v2 — raw pg with aggressive timeouts).
 *
 * Fix for tech debt #20: the v1 probe (based on @prisma/client) hung for the
 * entire Day 6 Multi-AZ failover window. Prisma's connection manager does
 * not surface dead TCP sessions quickly enough for sub-second failover
 * observation. This v2 rewrites on raw `pg` with layered timeouts:
 *
 *   1. pg Client `connectionTimeoutMillis` — fails initial connect at the TCP layer
 *   2. pg Client `query_timeout` + `statement_timeout` — bounds server-side query work
 *   3. Promise.race wall-clock fallback — guarantees the probe never blocks on
 *      a hung socket, even if both pg layers above miss the failure mode
 *
 * On any failure the current Client is end()-ed, nulled, and the next tick
 * establishes a fresh connection. The probe process never exits on DB error;
 * only SIGTERM / SIGINT from the container runtime can stop it.
 *
 * Launch pattern (ECS one-shot, inherits DATABASE_URL from backend task def
 * or override env):
 *   1. curl -fsSL <s3-presigned-url-for-package.json> -o package.json
 *   2. curl -fsSL <s3-presigned-url-for-probe.js>     -o probe.js
 *   3. npm install --silent --no-audit --no-fund      (pulls pg@^8.13)
 *   4. node probe.js
 *
 * `pg` is not a direct backend dep — Prisma bundles its own driver, so we
 * install it fresh at task start. Cold npm install adds ~20-30s overhead;
 * acceptable for a one-shot observation task.
 *
 * Output (one JSON line per sample):
 *   {"ts":"2026-04-21T12:59:33.856Z","status":"start","driver":"pg","interval_ms":1000,...}
 *   {"ts":"2026-04-21T12:59:34.862Z","status":"ok","latency_ms":3,"error":null}
 *   {"ts":"2026-04-21T12:59:35.865Z","status":"fail","latency_ms":2001,"error":"wallclock timeout after 2000ms"}
 *   {"ts":"2026-04-21T12:59:36.869Z","status":"ok","latency_ms":4,"error":null}
 *
 * `status` values:
 *   start   — first line, emitted before the loop begins
 *   ok      — query returned successfully; latency_ms is real wall time
 *   fail    — query failed or timed out; error field carries the reason
 *   stop    — SIGTERM/SIGINT received, loop exiting
 *   fatal   — unrecoverable error; process will exit(1)
 */

const { Client } = require('pg');

// Prefer PROBE_DATABASE_URL if set — lets staging test runs override the
// backend task def's baked-in production DATABASE_URL without touching
// secrets config. Falls back to DATABASE_URL for normal production use.
const CONN_STRING = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
const INTERVAL_MS = Number(process.env.PROBE_INTERVAL_MS || 1000);
const CONNECT_TIMEOUT_MS = Number(process.env.PROBE_CONNECT_TIMEOUT_MS || 2000);
const QUERY_TIMEOUT_MS = Number(process.env.PROBE_QUERY_TIMEOUT_MS || 2000);

if (!CONN_STRING) {
  console.error('DATABASE_URL not set — cannot probe');
  process.exit(2);
}

let client = null;
let stopping = false;

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// Parse the DATABASE_URL ourselves rather than pass it to pg as
// `connectionString`. Newer pg-connection-string interprets `?sslmode=require`
// as `verify-full`, which then overrides our client-level
// `ssl: { rejectUnauthorized: false }` and fails verification against the
// AWS RDS cert chain (Node's trust store doesn't ship the AWS RDS CA).
// Parsing explicitly gives us full control of the SSL config.
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

async function connect() {
  const parsed = parseDbUrl(CONN_STRING);
  const c = new Client({
    ...parsed,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    // pg interprets these as ms since node-postgres 8.x
    query_timeout: QUERY_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
  });
  // Swallow async socket errors so they surface as query rejections below,
  // not unhandled events that would crash the process.
  c.on('error', () => {});
  await c.connect();
  return c;
}

// Promise.race fallback — if pg's internal timeouts fail to fire on a
// half-open TCP, this wall-clock timer guarantees we move on.
function withDeadline(p, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`wallclock timeout after ${ms}ms (${label})`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function probeOnce() {
  const ts = new Date().toISOString();
  const t0 = Date.now();
  try {
    if (!client) {
      client = await withDeadline(connect(), CONNECT_TIMEOUT_MS + 500, 'connect');
    }
    await withDeadline(client.query('SELECT 1'), QUERY_TIMEOUT_MS + 500, 'query');
    emit({ ts, status: 'ok', latency_ms: Date.now() - t0, error: null });
  } catch (e) {
    emit({ ts, status: 'fail', latency_ms: Date.now() - t0, error: String(e.message || e) });
    // Destroy the dead client so the next tick reconnects cleanly
    if (client) {
      try { await withDeadline(client.end(), 1000, 'client.end'); } catch {}
      client = null;
    }
  }
}

async function runLoop() {
  while (!stopping) {
    const tickStart = Date.now();
    await probeOnce();
    const elapsed = Date.now() - tickStart;
    const sleep = Math.max(0, INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, sleep));
  }
  if (client) {
    try { await withDeadline(client.end(), 1000, 'shutdown'); } catch {}
  }
}

function shutdown(sig) {
  emit({ ts: new Date().toISOString(), status: 'stop', latency_ms: 0, error: `signal ${sig}` });
  stopping = true;
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

emit({
  ts: new Date().toISOString(),
  status: 'start',
  latency_ms: 0,
  error: null,
  driver: 'pg',
  interval_ms: INTERVAL_MS,
  connect_timeout_ms: CONNECT_TIMEOUT_MS,
  query_timeout_ms: QUERY_TIMEOUT_MS,
});

runLoop().catch((e) => {
  emit({ ts: new Date().toISOString(), status: 'fatal', latency_ms: 0, error: String(e.message || e) });
  process.exit(1);
});
