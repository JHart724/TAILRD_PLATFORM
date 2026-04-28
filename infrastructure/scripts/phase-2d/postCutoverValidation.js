/**
 * Day 10 post-cutover validation script.
 *
 * Symmetric to preCutoverValidation.js. Runs after the cutover deploy completes
 * and READ_ONLY is set back to false. Verifies the new state is healthy before
 * the 24h soak. The soak monitor (postCutoverSoakMonitor.sh) re-runs this script
 * on a backoff schedule across 24 hours and alerts on first failure.
 *
 * 7 checks:
 *   1. database_url_points_at_aurora - Secrets Manager value resolved
 *   2. backend_reading_aurora        - live pg connection to Aurora succeeds
 *   3. modules_respond_healthy       - all 6 module dashboards return 200 with source=database
 *   4. p95_latency_within_baseline   - ALB TargetResponseTime vs operator-supplied baseline
 *   5. data_integrity_drift          - row counts RDS vs Aurora within tolerance per table
 *   6. read_only_off                 - production task def has READ_ONLY=false (or unset)
 *   7. error_rate_within_baseline    - CloudWatch ERROR/5xx count vs operator-supplied baseline
 *
 * JSON envelope:
 *   { ready_for_soak, generatedAt, checks, blockers, warnings }
 *
 * Exit codes:
 *   0 - ready_for_soak=true (soak proceeds)
 *   1 - ready_for_soak=false (one or more blockers; do NOT proceed to soak)
 *   2 - internal failure (script crashed; surface to operator)
 *
 * Operator-supplied env vars (with sensible defaults):
 *   BASELINE_P95_MS        - pre-cutover p95 latency in ms (default 0 means skip latency check)
 *   BASELINE_ERROR_RATE    - pre-cutover ERROR count over 30 min (default 0)
 *   SMOKE_TEST_EMAIL       - test account for module probes (required for check 3)
 *   SMOKE_TEST_PASSWORD    - test password (required for check 3)
 *   API_BASE               - default https://api.tailrd-heart.com
 */
/* eslint-disable */

const https = require('https');
const { Client } = require('pg');
const {
  DatabaseMigrationServiceClient,
  DescribeReplicationTasksCommand,
} = require('@aws-sdk/client-database-migration-service');
const {
  ECSClient,
  DescribeTaskDefinitionCommand,
  DescribeServicesCommand,
} = require('@aws-sdk/client-ecs');
const {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} = require('@aws-sdk/client-cloudwatch');
const {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} = require('@aws-sdk/client-cloudwatch-logs');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.AWS_REGION || 'us-east-1';
const API_BASE = process.env.API_BASE || 'https://api.tailrd-heart.com';
const ALB_NAME_TAG = 'app/tailrd-production-alb/12cc0d46828a90ae';
const LOG_GROUP = '/ecs/tailrd-production-backend';
const ECS_CLUSTER = 'tailrd-production-cluster';
const ECS_SERVICE = 'tailrd-production-backend';
const AURORA_HOST_FRAGMENT = 'tailrd-production-aurora';
const RDS_HOST_FRAGMENT = 'tailrd-production-postgres';
const PARITY_TABLES_STATIC = ['patients', 'observations', 'encounters'];
const PARITY_TABLES_VOLATILE = ['audit_logs', 'login_sessions'];
const PARITY_DRIFT_TOLERANCE_STATIC = 0;
const PARITY_DRIFT_TOLERANCE_VOLATILE = 100;
const MODULES = [
  'heart-failure',
  'electrophysiology',
  'coronary-intervention',
  'structural-heart',
  'valvular-disease',
  'peripheral-vascular',
];

const BASELINE_P95_MS = Number(process.env.BASELINE_P95_MS || 0);
const BASELINE_ERROR_RATE = Number(process.env.BASELINE_ERROR_RATE || 0);
const SMOKE_EMAIL = process.env.SMOKE_TEST_EMAIL || '';
const SMOKE_PASSWORD = process.env.SMOKE_TEST_PASSWORD || '';

const dms = new DatabaseMigrationServiceClient({ region: REGION });
const ecs = new ECSClient({ region: REGION });
const cw = new CloudWatchClient({ region: REGION });
const cwl = new CloudWatchLogsClient({ region: REGION });
const sm = new SecretsManagerClient({ region: REGION });

const checks = [];
const blockers = [];
const warnings = [];

function record(name, ok, detail, severity = 'block') {
  checks.push({ name, ok, detail, severity });
  if (!ok) {
    if (severity === 'warn') warnings.push(name);
    else blockers.push(name);
  }
}

async function getSecret(name) {
  const r = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  return r.SecretString;
}

function buildPgConfig(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '').split('?')[0] || 'tailrd',
    ssl: { rejectUnauthorized: false },
  };
}

function httpJson(method, urlString, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, body: JSON.parse(text) });
        } catch (_) {
          resolve({ status: res.statusCode, body: { _raw: text } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Check 1: DATABASE_URL points at Aurora.
async function checkDatabaseUrlPointsAtAurora() {
  try {
    const url = await getSecret('tailrd-production/app/database-url');
    const u = new URL(url);
    const isAurora = u.hostname.includes(AURORA_HOST_FRAGMENT);
    const isRds = u.hostname.includes(RDS_HOST_FRAGMENT) && !isAurora;
    const ok = isAurora;
    record('database_url_points_at_aurora', ok, {
      hostFragment: u.hostname.split('.')[0],
      isAurora,
      stillOnRds: isRds,
    });
  } catch (err) {
    record('database_url_points_at_aurora', false, String(err.message || err));
  }
}

// Check 2: Backend can connect to Aurora and read patients table.
async function checkBackendReadingAurora() {
  let client;
  try {
    const url = await getSecret('tailrd-production/app/database-url');
    client = new Client(buildPgConfig(url));
    await client.connect();
    const v = await client.query('SELECT version() AS v');
    const c = await client.query('SELECT COUNT(*)::bigint AS c FROM patients');
    const version = v.rows[0].v;
    const isAurora = /aurora|aws-aurora/i.test(version) || version.includes('PostgreSQL');
    const patientCount = Number(c.rows[0].c);
    record('backend_reading_aurora', patientCount > 0, {
      version,
      patientCount,
      hostnameFromUrl: new URL(url).hostname,
    });
  } catch (err) {
    record('backend_reading_aurora', false, String(err.message || err));
  } finally {
    try { if (client) await client.end(); } catch (_) {}
  }
}

// Check 3: All 6 module dashboards respond 200 with source=database.
async function checkModulesRespondHealthy() {
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    return record('modules_respond_healthy', false, 'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD env vars not set');
  }
  try {
    const login = await httpJson('POST', `${API_BASE}/api/auth/login`, {
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD,
    });
    if (login.status !== 200 || !login.body?.success || !login.body?.data?.token) {
      return record('modules_respond_healthy', false, {
        loginStatus: login.status,
        loginError: login.body?.error || login.body?._raw?.slice(0, 120),
      });
    }
    const token = login.body.data.token;

    const results = [];
    for (const m of MODULES) {
      const r = await httpJson('GET', `${API_BASE}/api/modules/${m}/dashboard`, null, token);
      const success = r.status === 200 && r.body?.success === true;
      const source = r.body?.data?.source || r.body?.source || null;
      results.push({ module: m, status: r.status, success, source });
    }
    const allOk = results.every((r) => r.success && r.source === 'database');
    record('modules_respond_healthy', allOk, { results });
  } catch (err) {
    record('modules_respond_healthy', false, String(err.message || err));
  }
}

// Check 4: P95 latency within 1.2x baseline (warn at 1.5x, fail at 2x).
async function checkP95LatencyBaseline() {
  if (BASELINE_P95_MS <= 0) {
    return record('p95_latency_within_baseline', true, {
      note: 'BASELINE_P95_MS not set; skipping comparison',
    }, 'warn');
  }
  try {
    const r = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/ApplicationELB',
        MetricName: 'TargetResponseTime',
        Dimensions: [{ Name: 'LoadBalancer', Value: ALB_NAME_TAG }],
        StartTime: new Date(Date.now() - 30 * 60 * 1000),
        EndTime: new Date(),
        Period: 300,
        ExtendedStatistics: ['p95'],
      })
    );
    const points = r.Datapoints || [];
    if (points.length === 0) {
      return record('p95_latency_within_baseline', true, {
        note: 'no datapoints in last 30 min; possible low-traffic window',
      }, 'warn');
    }
    const p95Seconds = Math.max(...points.map((p) => p.ExtendedStatistics?.p95 || 0));
    const p95Ms = p95Seconds * 1000;
    const ratio = p95Ms / BASELINE_P95_MS;
    let ok = true;
    let severity = 'block';
    if (ratio > 2.0) {
      ok = false;
      severity = 'block';
    } else if (ratio > 1.5) {
      ok = false;
      severity = 'warn';
    }
    record('p95_latency_within_baseline', ok, {
      currentP95Ms: Math.round(p95Ms),
      baselineP95Ms: BASELINE_P95_MS,
      ratio: Number(ratio.toFixed(2)),
      severity,
    }, severity);
  } catch (err) {
    record('p95_latency_within_baseline', false, String(err.message || err));
  }
}

// Check 5: Row count drift between RDS and Aurora within tolerance per table.
async function checkDataIntegrity() {
  let rdsClient, auroraClient;
  try {
    // Build RDS URL from a known-stable rollback URL secret (operator must have
    // captured this pre-cutover and stored it in a separate secret).
    let rdsUrl;
    try {
      rdsUrl = await getSecret('tailrd-production/app/database-url-rds-rollback');
    } catch (_) {
      // Fallback: construct from production password + RDS hostname
      const masterPw = await getSecret('tailrd-production/rds/master-password');
      let pw;
      try {
        pw = JSON.parse(masterPw).password;
      } catch (_) {
        pw = masterPw;
      }
      rdsUrl = `postgresql://tailrd_admin:${encodeURIComponent(pw)}@${RDS_HOST_FRAGMENT}.csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require`;
    }
    const auroraUrl = await getSecret('tailrd-production/app/database-url');

    rdsClient = new Client(buildPgConfig(rdsUrl));
    auroraClient = new Client(buildPgConfig(auroraUrl));
    await rdsClient.connect();
    await auroraClient.connect();

    const drifts = [];
    for (const t of [...PARITY_TABLES_STATIC, ...PARITY_TABLES_VOLATILE]) {
      const [r, a] = await Promise.all([
        rdsClient.query(`SELECT COUNT(*)::bigint AS c FROM ${t}`),
        auroraClient.query(`SELECT COUNT(*)::bigint AS c FROM ${t}`),
      ]);
      const rdsCount = Number(r.rows[0].c);
      const auroraCount = Number(a.rows[0].c);
      const drift = rdsCount - auroraCount;
      const tolerance = PARITY_TABLES_VOLATILE.includes(t)
        ? PARITY_DRIFT_TOLERANCE_VOLATILE
        : PARITY_DRIFT_TOLERANCE_STATIC;
      drifts.push({ table: t, rdsCount, auroraCount, drift, tolerance, ok: Math.abs(drift) <= tolerance });
    }
    const overTolerance = drifts.filter((d) => !d.ok);
    record('data_integrity_drift', overTolerance.length === 0, { drifts, overTolerance });
  } catch (err) {
    record('data_integrity_drift', false, String(err.message || err));
  } finally {
    try { if (rdsClient) await rdsClient.end(); } catch (_) {}
    try { if (auroraClient) await auroraClient.end(); } catch (_) {}
  }
}

// Check 6: READ_ONLY env var on the running task definition is false or unset.
async function checkReadOnlyOff() {
  try {
    const svc = await ecs.send(
      new DescribeServicesCommand({ cluster: ECS_CLUSTER, services: [ECS_SERVICE] })
    );
    const taskDefArn = svc.services?.[0]?.taskDefinition;
    if (!taskDefArn) {
      return record('read_only_off', false, 'service has no task definition');
    }
    const td = await ecs.send(
      new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn })
    );
    const env = td.taskDefinition?.containerDefinitions?.[0]?.environment || [];
    const readOnly = env.find((e) => e.name === 'READ_ONLY');
    const value = readOnly?.value || 'unset';
    const ok = value !== 'true';
    record('read_only_off', ok, { taskDef: taskDefArn.split('/').pop(), readOnlyValue: value });
  } catch (err) {
    record('read_only_off', false, String(err.message || err));
  }
}

// Check 7: ERROR / 5xx count in last 30 min within 2x baseline.
async function checkErrorRateBaseline() {
  try {
    const r = await cwl.send(
      new FilterLogEventsCommand({
        logGroupName: LOG_GROUP,
        startTime: Date.now() - 30 * 60 * 1000,
        endTime: Date.now(),
        filterPattern: '?ERROR ?5xx ?500 ?502 ?503 ?504',
      })
    );
    const errorCount = (r.events || []).length;
    if (BASELINE_ERROR_RATE <= 0) {
      // No baseline set; flag absolute count as warn at 100/30min, block at 500.
      let ok = true;
      let severity = 'block';
      if (errorCount > 500) ok = false;
      else if (errorCount > 100) {
        ok = false;
        severity = 'warn';
      }
      return record('error_rate_within_baseline', ok, {
        errorCount,
        baseline: 'not set',
        severity,
      }, severity);
    }
    const ratio = errorCount / BASELINE_ERROR_RATE;
    let ok = true;
    let severity = 'block';
    if (ratio > 10) ok = false;
    else if (ratio > 2) {
      ok = false;
      severity = 'warn';
    }
    record('error_rate_within_baseline', ok, {
      errorCount,
      baselineErrorRate: BASELINE_ERROR_RATE,
      ratio: Number(ratio.toFixed(2)),
      severity,
    }, severity);
  } catch (err) {
    record('error_rate_within_baseline', false, String(err.message || err));
  }
}

(async () => {
  await checkDatabaseUrlPointsAtAurora();
  await checkBackendReadingAurora();
  await checkModulesRespondHealthy();
  await checkP95LatencyBaseline();
  await checkDataIntegrity();
  await checkReadOnlyOff();
  await checkErrorRateBaseline();

  const ready = blockers.length === 0;
  const out = {
    ready_for_soak: ready,
    generatedAt: new Date().toISOString(),
    checks,
    blockers,
    warnings,
  };
  console.log('---POST_CUTOVER_VALIDATION---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(ready ? 0 : 1);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(2);
});
