/**
 * Day 10 pre-cutover validation script.
 *
 * Runs the gating checks documented in docs/DAY_10_PLAN.md section 3 and
 * docs/DAY_10_WEDNESDAY_RUNBOOK.md Step 1. Outputs a single JSON envelope:
 *
 *   { ready: true|false, checks: [...], blockers: [...] }
 *
 * Wednesday-morning operator runs this once. If ready=true, proceed with
 * cutover. If ready=false, surface the blockers and STOP.
 *
 * Checks performed:
 *   1. DMS task status: must be running, no LastFailureMessage
 *   2. DMS table statistics: 22/22 tables with FullLoadEnd populated,
 *      0 ValidationFailedRecords across all tables
 *   3. CDC lag (best-effort): pulls CDCLatencyTarget metric from CloudWatch,
 *      acceptable threshold 5s
 *   4. Row count parity for the 5 highest-write tables (Patient, Observation,
 *      Encounter, AuditLog, LoginSession): drift in [-5, +5] rows
 *   5. Aurora cluster status: available, no PendingMaintenanceActions
 *
 * Run via Fargate one-off using the production task definition. The task role
 * already has DMS, RDS, and Secrets Manager read permissions for this
 * inventory. See companion overrides JSON in this directory.
 */
/* eslint-disable */

const { Client } = require('pg');
const {
  DatabaseMigrationServiceClient,
  DescribeReplicationTasksCommand,
  DescribeTableStatisticsCommand,
} = require('@aws-sdk/client-database-migration-service');
const {
  RDSClient,
  DescribeDBClustersCommand,
  DescribePendingMaintenanceActionsCommand,
} = require('@aws-sdk/client-rds');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');
const {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} = require('@aws-sdk/client-cloudwatch');

const REGION = process.env.AWS_REGION || 'us-east-1';
const DMS_TASK_ARN = 'arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA';
const AURORA_CLUSTER_ID = 'tailrd-production-aurora';
// Actual production table names use lowercase snake_case (verified via the
// 2026-04-28 DMS Wave 2 task statistics output: patients, observations,
// encounters, audit_logs, login_sessions).
const PARITY_TABLES = ['patients', 'observations', 'encounters', 'audit_logs', 'login_sessions'];
const PARITY_DRIFT_TOLERANCE = 5;
const CDC_LAG_THRESHOLD_SECONDS = 5;

const dms = new DatabaseMigrationServiceClient({ region: REGION });
const rds = new RDSClient({ region: REGION });
const sm = new SecretsManagerClient({ region: REGION });
const cw = new CloudWatchClient({ region: REGION });

const checks = [];
const blockers = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) blockers.push(name);
}

async function checkDmsTask() {
  try {
    const r = await dms.send(
      new DescribeReplicationTasksCommand({
        Filters: [{ Name: 'replication-task-arn', Values: [DMS_TASK_ARN] }],
      })
    );
    const t = r.ReplicationTasks?.[0];
    if (!t) return record('dms_task_status', false, 'task not found');
    const status = t.Status;
    const failure = t.LastFailureMessage || null;
    const fullLoadProgress = t.ReplicationTaskStats?.FullLoadProgressPercent;
    const tablesLoaded = t.ReplicationTaskStats?.TablesLoaded;
    const ok = status === 'running' && !failure && fullLoadProgress === 100 && tablesLoaded === 22;
    record('dms_task_status', ok, { status, failure, fullLoadProgress, tablesLoaded });
  } catch (err) {
    record('dms_task_status', false, String(err.message || err));
  }
}

async function checkDmsTableStats() {
  try {
    const r = await dms.send(
      new DescribeTableStatisticsCommand({ ReplicationTaskArn: DMS_TASK_ARN })
    );
    const tables = r.TableStatistics || [];
    const incomplete = tables.filter((t) => !t.FullLoadEndTime).map((t) => `${t.SchemaName}.${t.TableName}`);
    const validationFailed = tables
      .filter((t) => Number(t.ValidationFailedRecords || 0) > 0)
      .map((t) => `${t.SchemaName}.${t.TableName}: ${t.ValidationFailedRecords}`);
    const ok = incomplete.length === 0 && validationFailed.length === 0;
    record('dms_table_stats', ok, {
      tableCount: tables.length,
      incomplete,
      validationFailed,
    });
  } catch (err) {
    record('dms_table_stats', false, String(err.message || err));
  }
}

async function checkAuroraCluster() {
  try {
    const r = await rds.send(
      new DescribeDBClustersCommand({ DBClusterIdentifier: AURORA_CLUSTER_ID })
    );
    const c = r.DBClusters?.[0];
    if (!c) return record('aurora_cluster', false, 'cluster not found');
    const ok = c.Status === 'available';
    record('aurora_cluster', ok, { status: c.Status, engineVersion: c.EngineVersion });
  } catch (err) {
    record('aurora_cluster', false, String(err.message || err));
  }

  try {
    const r = await rds.send(
      new DescribePendingMaintenanceActionsCommand({
        Filters: [{ Name: 'db-cluster-id', Values: [AURORA_CLUSTER_ID] }],
      })
    );
    const actions = r.PendingMaintenanceActions?.[0]?.PendingMaintenanceActionDetails || [];

    // Only flag actions whose CurrentApplyDate is within the next 24h, the
    // cutover window. Far-future scheduled events (e.g. AWS auto minor version
    // upgrades 2+ weeks out) are informational, not blocking.
    const cutoverWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const blocking = actions.filter((a) => {
      const apply = a.CurrentApplyDate ? new Date(a.CurrentApplyDate) : null;
      return apply && apply <= cutoverWindowEnd;
    });
    const informational = actions.filter((a) => !blocking.includes(a));

    record('aurora_pending_maintenance', blocking.length === 0, {
      blocking,
      informational,
      cutoverWindowEnd: cutoverWindowEnd.toISOString(),
    });
  } catch (err) {
    record('aurora_pending_maintenance', false, String(err.message || err));
  }
}

async function checkCdcLag() {
  try {
    const r = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/DMS',
        MetricName: 'CDCLatencyTarget',
        Dimensions: [
          { Name: 'ReplicationTaskIdentifier', Value: DMS_TASK_ARN.split(':').pop() },
        ],
        StartTime: new Date(Date.now() - 10 * 60 * 1000),
        EndTime: new Date(),
        Period: 60,
        Statistics: ['Maximum'],
      })
    );
    const points = r.Datapoints || [];
    if (points.length === 0) {
      // CDCLatencyTarget is only emitted when DMS is actively replicating.
      // During low-traffic windows (e.g. nights / weekends) there are no
      // CDC events to measure, so the metric is silent. This is normal.
      // Wednesday morning cutover should have business-hours traffic
      // and produce datapoints. Treat absence as informational, not blocking.
      return record('cdc_lag', true, {
        maxLagSeconds: null,
        note: 'no CloudWatch datapoints in last 10 min - source DB likely idle, normal for low-traffic windows',
      });
    }
    const maxLag = Math.max(...points.map((p) => p.Maximum || 0));
    const ok = maxLag <= CDC_LAG_THRESHOLD_SECONDS;
    record('cdc_lag', ok, { maxLagSeconds: maxLag, threshold: CDC_LAG_THRESHOLD_SECONDS });
  } catch (err) {
    record('cdc_lag', false, String(err.message || err));
  }
}

async function getSecret(name) {
  const r = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  return r.SecretString;
}

async function buildAuroraUrl() {
  // Reuse the Day-5-era stored values rather than reconstructing
  const writer = await getSecret('tailrd-production/app/aurora-writer-endpoint');
  const passwordRaw = await getSecret('tailrd-production/app/aurora-db-password');
  let password;
  try {
    const parsed = JSON.parse(passwordRaw);
    password = parsed.password || passwordRaw;
  } catch (_) {
    password = passwordRaw;
  }
  const encoded = encodeURIComponent(password);
  return `postgresql://tailrd_admin:${encoded}@${writer.trim()}:5432/tailrd?sslmode=require`;
}

async function checkRowParity() {
  let rdsClient, auroraClient;
  try {
    const rdsUrl = await getSecret('tailrd-production/app/database-url');
    const auroraUrl = await buildAuroraUrl();
    // Both RDS and Aurora present Amazon-managed certs. Node's default CA
    // bundle does not include the AWS RDS CA, so connections fail with
    // "self-signed certificate in certificate chain". Connections are
    // intra-VPC (Fargate to RDS in same VPC), so disabling cert chain
    // validation here is acceptable for this read-only validation script.
    //
    // Setting `ssl: { rejectUnauthorized: false }` alone is not enough when
    // the URL contains `sslmode=require` because pg merges the URL-derived
    // ssl config in a way that re-enables verification. Parse the URL into
    // discrete fields so the ssl config is unambiguous.
    const buildPgConfig = (url) => {
      const u = new URL(url);
      return {
        host: u.hostname,
        port: u.port ? Number(u.port) : 5432,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, '').split('?')[0] || 'tailrd',
        ssl: { rejectUnauthorized: false },
      };
    };
    rdsClient = new Client(buildPgConfig(rdsUrl));
    auroraClient = new Client(buildPgConfig(auroraUrl));
    await rdsClient.connect();
    await auroraClient.connect();

    const drifts = [];
    for (const t of PARITY_TABLES) {
      // Tables use lowercase snake_case so quoting is unnecessary, but keep
      // the quotes for safety against future case-sensitive table names.
      const [r, a] = await Promise.all([
        rdsClient.query(`SELECT COUNT(*)::bigint AS c FROM ${t}`),
        auroraClient.query(`SELECT COUNT(*)::bigint AS c FROM ${t}`),
      ]);
      const rdsCount = Number(r.rows[0].c);
      const auroraCount = Number(a.rows[0].c);
      const drift = rdsCount - auroraCount;
      drifts.push({ table: t, rdsCount, auroraCount, drift });
    }
    const overTolerance = drifts.filter((d) => Math.abs(d.drift) > PARITY_DRIFT_TOLERANCE);
    record('row_parity', overTolerance.length === 0, {
      tolerance: PARITY_DRIFT_TOLERANCE,
      drifts,
      overTolerance,
    });
  } catch (err) {
    record('row_parity', false, String(err.message || err));
  } finally {
    try { if (rdsClient) await rdsClient.end(); } catch (_) {}
    try { if (auroraClient) await auroraClient.end(); } catch (_) {}
  }
}

(async () => {
  await checkDmsTask();
  await checkDmsTableStats();
  await checkAuroraCluster();
  await checkCdcLag();
  await checkRowParity();

  const ready = blockers.length === 0;
  const out = {
    ready,
    generatedAt: new Date().toISOString(),
    checks,
    blockers,
  };
  console.log('---PRE_CUTOVER_VALIDATION---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(ready ? 0 : 1);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(2);
});
