/**
 * RDS reboot health-check probe.
 *
 * Runs a 1 Hz `SELECT 1` loop against the database pointed at by
 * DATABASE_URL (via the backend's bundled `@prisma/client`) and writes
 * one JSON line per attempt to stdout. Intended to be launched as an
 * ECS one-shot task in the same VPC as the backend so it observes
 * database availability from the application's network perspective
 * (not from the public internet).
 *
 * We use @prisma/client rather than a raw `pg` client for two reasons:
 *   1. The backend image does not have a direct `pg` dependency —
 *      Prisma bundles its own query engine. @prisma/client is the
 *      one DB-capable package guaranteed to be in /app/node_modules.
 *   2. Prisma's connection manager handles reconnect + retry
 *      internally, so Multi-AZ failover behavior observed via this
 *      probe mirrors what live backend traffic experiences.
 *
 * Connection errors surface as `status: "fail"` samples — the probe
 * process itself does not exit on DB error. It only exits on
 * SIGTERM / SIGINT from the container runtime.
 *
 * Output line shape:
 *   {"ts":"2026-04-21T10:15:03.214Z","status":"ok","latency_ms":3,"error":null}
 *   {"ts":"2026-04-21T10:15:04.215Z","status":"fail","latency_ms":1024,"error":"..."}
 *
 * Tail the CloudWatch log group for the task's log stream to follow
 * along live.
 */

const { PrismaClient } = require('@prisma/client');

const INTERVAL_MS = Number(process.env.PROBE_INTERVAL_MS || 1000);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — cannot probe');
  process.exit(2);
}

// Silence Prisma's chatty logger; we want only our own JSON lines on stdout.
const prisma = new PrismaClient({ log: [] });

let stopping = false;

function emit(obj) {
  // One JSON line per sample — CloudWatch parses each line separately.
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function probeOnce() {
  const ts = new Date().toISOString();
  const t0 = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    emit({ ts, status: 'ok', latency_ms: Date.now() - t0, error: null });
  } catch (e) {
    emit({ ts, status: 'fail', latency_ms: Date.now() - t0, error: String(e.message || e) });
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
  try { await prisma.$disconnect(); } catch {}
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
  driver: '@prisma/client',
});

runLoop().catch((e) => {
  emit({ ts: new Date().toISOString(), status: 'fatal', latency_ms: 0, error: String(e.message || e) });
  process.exit(1);
});
