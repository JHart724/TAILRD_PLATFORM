/**
 * Day 10 Aurora pre-warm script.
 *
 * Runs a series of typical production-shape queries against Aurora to drive
 * ACUs above 0.5 baseline. Goal: when the cutover deploy flips DATABASE_URL
 * and the first real production write hits Aurora, the cluster is already
 * warm and there is no first-write latency spike.
 *
 * 5 minute runtime budget. Per-query latency is logged so the operator can
 * see the warmup taking effect (latency drops as ACUs climb).
 *
 * Reads Aurora connection from:
 *   tailrd-production/app/aurora-db-password   (JSON: { username, password })
 *   tailrd-production/app/aurora-writer-endpoint (string: hostname)
 *
 * Output: per-iteration summary + final query count + final ACU level read
 * from CloudWatch.
 */
/* eslint-disable */

const { Client } = require('pg');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');
const {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} = require('@aws-sdk/client-cloudwatch');

const REGION = process.env.AWS_REGION || 'us-east-1';
const AURORA_CLUSTER_ID = 'tailrd-production-aurora';
const TARGET_RUNTIME_MS = Number(process.env.TARGET_RUNTIME_MS || 15 * 60 * 1000);  // default 15 min
const ITERATION_BUDGET_MS = 8 * 1000;     // ~8s per query iteration cycle

const sm = new SecretsManagerClient({ region: REGION });
const cw = new CloudWatchClient({ region: REGION });

async function getSecret(name) {
  const r = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  return r.SecretString;
}

async function buildAuroraClient() {
  const writer = (await getSecret('tailrd-production/app/aurora-writer-endpoint')).trim();
  const passwordRaw = await getSecret('tailrd-production/app/aurora-db-password');
  let username = 'tailrd_admin';
  let password;
  try {
    const parsed = JSON.parse(passwordRaw);
    username = parsed.username || username;
    password = parsed.password;
  } catch (_) {
    password = passwordRaw;
  }
  return new Client({
    host: writer,
    port: 5432,
    user: username,
    password,
    database: 'tailrd',
    ssl: { rejectUnauthorized: false },
  });
}

async function readAcu() {
  try {
    const r = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/RDS',
        MetricName: 'ServerlessDatabaseCapacity',
        Dimensions: [{ Name: 'DBClusterIdentifier', Value: AURORA_CLUSTER_ID }],
        StartTime: new Date(Date.now() - 5 * 60 * 1000),
        EndTime: new Date(),
        Period: 60,
        Statistics: ['Maximum'],
      })
    );
    const points = r.Datapoints || [];
    if (points.length === 0) return null;
    const sorted = points.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    return sorted[0].Maximum;
  } catch (err) {
    return null;
  }
}

const QUERIES = [
  { name: 'count_patients', sql: 'SELECT COUNT(*)::bigint AS c FROM patients' },
  { name: 'recent_patients', sql: 'SELECT id, "createdAt" FROM patients ORDER BY "createdAt" DESC LIMIT 100' },
  { name: 'patient_encounters_join', sql: 'SELECT p.id, COUNT(e.id) AS encounters FROM patients p LEFT JOIN encounters e ON e."patientId" = p.id GROUP BY p.id LIMIT 50' },
  { name: 'recent_encounters', sql: 'SELECT id, "patientId", "encounterDateTime" FROM encounters ORDER BY "encounterDateTime" DESC LIMIT 200' },
  { name: 'observations_for_recent_encounters', sql: 'SELECT o.id, o."observationType", o."valueNumeric" FROM observations o WHERE o."encounterId" IN (SELECT id FROM encounters ORDER BY "encounterDateTime" DESC LIMIT 50) LIMIT 500' },
  { name: 'count_audit_logs', sql: 'SELECT COUNT(*)::bigint FROM audit_logs' },
  { name: 'count_login_sessions', sql: 'SELECT COUNT(*)::bigint FROM login_sessions WHERE "isActive" = true' },
  { name: 'pg_stat_database', sql: 'SELECT numbackends, xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database()' },
];

(async () => {
  const startedAt = Date.now();
  const startAcu = await readAcu();
  console.log(`startAcu=${startAcu}`);

  const client = await buildAuroraClient();
  await client.connect();
  console.log('connected to Aurora');

  let totalQueries = 0;
  let iteration = 0;

  while (Date.now() - startedAt < TARGET_RUNTIME_MS) {
    iteration++;
    const iterStart = Date.now();
    const timings = [];
    for (const q of QUERIES) {
      const qStart = Date.now();
      try {
        await client.query(q.sql);
        timings.push({ query: q.name, ms: Date.now() - qStart });
        totalQueries++;
      } catch (err) {
        timings.push({ query: q.name, ms: Date.now() - qStart, error: err.message });
      }
    }
    const iterMs = Date.now() - iterStart;
    const acu = await readAcu();
    console.log(`iter=${iteration} totalMs=${iterMs} queries=${totalQueries} acu=${acu} timings=${JSON.stringify(timings)}`);

    // Pad iteration to ITERATION_BUDGET_MS so we don't slam the cluster faster
    // than necessary; pacing keeps the warm-up sustained but not abusive.
    const remainingPad = ITERATION_BUDGET_MS - iterMs;
    if (remainingPad > 0 && Date.now() - startedAt < TARGET_RUNTIME_MS - remainingPad) {
      await new Promise((r) => setTimeout(r, remainingPad));
    }
  }

  await client.end();
  // CloudWatch metric is published with ~60s lag. Wait briefly for final value.
  await new Promise((r) => setTimeout(r, 30 * 1000));
  const endAcu = await readAcu();

  console.log('---AURORA_PRE_WARM---');
  console.log(JSON.stringify({
    completedAt: new Date().toISOString(),
    runtimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    totalIterations: iteration,
    totalQueries,
    startAcu,
    endAcu,
    acuDelta: (endAcu != null && startAcu != null) ? endAcu - startAcu : null,
  }, null, 2));
  console.log('---END---');
  process.exit(0);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
