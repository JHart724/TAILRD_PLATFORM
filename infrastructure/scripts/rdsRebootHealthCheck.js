/**
 * RDS reboot health-check probe.
 *
 * Runs a 1 Hz `SELECT 1` loop against the RDS endpoint pointed at by
 * DATABASE_URL and writes one JSON line per attempt to stdout. Intended
 * to be launched as an ECS one-shot task in the same VPC as the backend
 * so it observes database availability from the application's network
 * perspective (not from the public internet).
 *
 * Connection losses, transient errors, and reconnects are all recorded
 * as `status: "fail"` samples — the probe process itself never exits on
 * DB error. It only exits on SIGTERM / SIGINT from the container runtime.
 *
 * Output line shape:
 *   {"ts":"2026-04-21T10:15:03.214Z","status":"ok","latency_ms":3,"error":null}
 *   {"ts":"2026-04-21T10:15:04.215Z","status":"fail","latency_ms":1024,"error":"Connection terminated unexpectedly"}
 *
 * Tail the CloudWatch log group for the task's log stream to follow
 * along live. Post-reboot, analyze the stream for the first consecutive
 * run of `ok` samples to establish recovery time.
 */

const { Client } = require('pg');

const CONN_STRING = process.env.DATABASE_URL;
const INTERVAL_MS = Number(process.env.PROBE_INTERVAL_MS || 1000);
const QUERY_TIMEOUT_MS = Number(process.env.PROBE_QUERY_TIMEOUT_MS || 5000);

if (!CONN_STRING) {
  console.error('DATABASE_URL not set — cannot probe');
  process.exit(2);
}

let client = null;
let stopping = false;

function emit(obj) {
  // One JSON line per sample — CloudWatch parses each line separately.
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function connect() {
  // Fresh Client per reconnect — `pg` Client state after disconnect is not
  // guaranteed safe to reuse even after re-calling connect().
  const c = new Client({
    connectionString: CONN_STRING,
    ssl: { rejectUnauthorized: false },
    statement_timeout: QUERY_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    connectionTimeoutMillis: QUERY_TIMEOUT_MS,
  });
  // Swallow async 'error' events so a mid-query disconnect surfaces as a
  // query rejection (which we handle below) rather than an unhandled emit.
  c.on('error', () => {});
  await c.connect();
  return c;
}

async function probeOnce() {
  const ts = new Date().toISOString();
  const t0 = Date.now();
  try {
    if (!client) client = await connect();
    await client.query('SELECT 1');
    emit({ ts, status: 'ok', latency_ms: Date.now() - t0, error: null });
  } catch (e) {
    emit({ ts, status: 'fail', latency_ms: Date.now() - t0, error: String(e.message || e) });
    // Drop the dead client; next tick reconnects.
    if (client) {
      try { await client.end(); } catch {}
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
    try { await client.end(); } catch {}
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
  interval_ms: INTERVAL_MS,
  query_timeout_ms: QUERY_TIMEOUT_MS,
});

runLoop().catch((e) => {
  emit({ ts: new Date().toISOString(), status: 'fatal', latency_ms: 0, error: String(e.message || e) });
  process.exit(1);
});
