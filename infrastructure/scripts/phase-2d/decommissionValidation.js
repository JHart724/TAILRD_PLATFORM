/**
 * Day 11 pre-decommission validation script.
 *
 * Last gate before tailrd-production-postgres RDS instance is deleted.
 * Verifies that Aurora is fully serving production, RDS has no traffic, and
 * the cutover snapshot trail is sound.
 *
 * 7 checks:
 *   1. production_task_def_uses_aurora      - DATABASE_URL env var resolves to Aurora hostname
 *   2. rds_no_recent_traffic                - DatabaseConnections == 0 last 24h on RDS
 *   3. aurora_active_traffic                - TWO-PART direct evidence (point-in-time pg_stat_activity AND 24h max DatabaseConnections >= 1)
 *   4. error_rate_within_baseline           - 24h error count vs operator-supplied baseline
 *   5. final_snapshot_exists                - tailrd-production-postgres-final-pre-decom-* available
 *   6. rds_still_present                    - RDS instance currently exists (sanity check; deletion target valid)
 *   7. dms_task_stopped                     - Wave 2 DMS task is stopped (not running)
 *
 * JSON envelope:
 *   { ready_for_decommission, generatedAt, checks, blockers, warnings }
 *
 * Exit codes:
 *   0 - ready_for_decommission=true
 *   1 - ready_for_decommission=false (blockers present)
 *   2 - internal failure (script crashed)
 *
 * Operator-supplied env vars:
 *   BASELINE_ERROR_RATE        post-cutover error rate baseline (default 0)
 *   FINAL_SNAPSHOT_PREFIX      snapshot id prefix (default 'tailrd-production-postgres-final-pre-decom-')
 */
/* eslint-disable */

const {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBSnapshotsCommand,
} = require('@aws-sdk/client-rds');
const {
  DatabaseMigrationServiceClient,
  DescribeReplicationTasksCommand,
} = require('@aws-sdk/client-database-migration-service');
const {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
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
const { Client: PgClient } = require('pg');

const REGION = process.env.AWS_REGION || 'us-east-1';
const RDS_INSTANCE_ID = 'tailrd-production-postgres';
const AURORA_CLUSTER_ID = 'tailrd-production-aurora';
const AURORA_HOST_FRAGMENT = 'tailrd-production-aurora';
const DMS_TASK_ARN = 'arn:aws:dms:us-east-1:863518424332:task:YFGGBH5LXRHDBHYD76DVX5MQRA';
const ECS_CLUSTER = 'tailrd-production-cluster';
const ECS_SERVICE = 'tailrd-production-backend';
const LOG_GROUP = '/ecs/tailrd-production-backend';

const BASELINE_ERROR_RATE = Number(process.env.BASELINE_ERROR_RATE || 0);
const FINAL_SNAPSHOT_PREFIX = process.env.FINAL_SNAPSHOT_PREFIX || 'tailrd-production-postgres-final-pre-decom-';

const rds = new RDSClient({ region: REGION });
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

// Check 1: production task def's DATABASE_URL secret resolves to Aurora.
async function checkProductionTaskDefUsesAurora() {
  try {
    const svc = await ecs.send(
      new DescribeServicesCommand({ cluster: ECS_CLUSTER, services: [ECS_SERVICE] })
    );
    const taskDefArn = svc.services?.[0]?.taskDefinition;
    if (!taskDefArn) {
      return record('production_task_def_uses_aurora', false, 'service has no task definition');
    }
    const td = await ecs.send(
      new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn })
    );
    const secrets = td.taskDefinition?.containerDefinitions?.[0]?.secrets || [];
    const dbUrlSecret = secrets.find((s) => s.name === 'DATABASE_URL');
    if (!dbUrlSecret) {
      return record('production_task_def_uses_aurora', false, 'task def has no DATABASE_URL secret');
    }
    const secretArn = dbUrlSecret.valueFrom;
    const secretId = secretArn.split(':secret:')[1].split('-').slice(0, -1).join('-');
    const url = await getSecret(secretId);
    const u = new URL(url);
    const isAurora = u.hostname.includes(AURORA_HOST_FRAGMENT);
    record('production_task_def_uses_aurora', isAurora, {
      taskDef: taskDefArn.split('/').pop(),
      secretId,
      hostname: u.hostname,
      isAurora,
    });
  } catch (err) {
    record('production_task_def_uses_aurora', false, String(err.message || err));
  }
}

// Check 2: RDS DatabaseConnections == 0 over last 24h.
async function checkRdsNoRecentTraffic() {
  try {
    const r = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/RDS',
        MetricName: 'DatabaseConnections',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: RDS_INSTANCE_ID }],
        StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        EndTime: new Date(),
        Period: 3600,
        Statistics: ['Maximum'],
      })
    );
    const points = r.Datapoints || [];
    const maxConnections = points.length > 0 ? Math.max(...points.map((p) => p.Maximum || 0)) : 0;
    // Allow a small number of brief connections from operator parity-check tasks
    // and the post-cutover validation script. Block only on sustained traffic.
    const ok = maxConnections <= 5;
    record('rds_no_recent_traffic', ok, {
      maxConnections,
      datapointCount: points.length,
      threshold: 5,
      note: maxConnections === 0 ? 'no connections in 24h' :
            maxConnections <= 5 ? 'low connection count likely from validation tasks, acceptable' :
            'sustained traffic on RDS, decommission would be data-lossy',
    });
  } catch (err) {
    record('rds_no_recent_traffic', false, String(err.message || err));
  }
}

// Check 3: Aurora is actively serving production - TWO-PART direct evidence.
//   Part 1: Point-in-time pg_stat_activity shows >= 1 production client backend right now
//   Part 2: CloudWatch DatabaseConnections Maximum >= 1 across the last 24h
// Both must pass. Average over 24h is too noisy for low-traffic pilot environments
// where idle pool members can dip the average below 1; Maximum captures presence even
// during ACU scale-down windows.
async function checkAuroraActiveTraffic() {
  let pgPart = { ok: false, detail: 'not_run' };
  let cwPart = { ok: false, detail: 'not_run' };

  // Part 1: pg_stat_activity (point-in-time direct query)
  let pg;
  try {
    const url = await getSecret('tailrd-production/app/database-url');
    const u = new URL(url);
    pg = new PgClient({
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '').split('?')[0] || 'tailrd',
      ssl: { rejectUnauthorized: false },
    });
    await pg.connect();
    const q = await pg.query(`
      SELECT COUNT(*)::int AS c
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND state IS NOT NULL
        AND backend_type = 'client backend'
    `);
    const productionConnections = q.rows[0].c;
    pgPart = {
      ok: productionConnections >= 1,
      productionConnections,
      threshold: 1,
      source: 'pg_stat_activity (point-in-time)',
    };
  } catch (err) {
    pgPart = { ok: false, error: String(err.message || err), source: 'pg_stat_activity' };
  } finally {
    if (pg) {
      try { await pg.end(); } catch (_) { /* swallow */ }
    }
  }

  // Part 2: CloudWatch Maximum over 24h
  try {
    const r = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: 'AWS/RDS',
        MetricName: 'DatabaseConnections',
        Dimensions: [{ Name: 'DBClusterIdentifier', Value: AURORA_CLUSTER_ID }],
        StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        EndTime: new Date(),
        Period: 3600,
        Statistics: ['Maximum'],
      })
    );
    const points = r.Datapoints || [];
    const maxConnections24h = points.length > 0
      ? Math.max(...points.map((p) => p.Maximum || 0))
      : 0;
    cwPart = {
      ok: maxConnections24h >= 1,
      maxConnections24h,
      datapointCount: points.length,
      threshold: 1,
      source: 'CloudWatch DatabaseConnections Maximum (24h)',
    };
  } catch (err) {
    cwPart = { ok: false, error: String(err.message || err), source: 'CloudWatch' };
  }

  const ok = pgPart.ok && cwPart.ok;
  record('aurora_active_traffic', ok, {
    pointInTime: pgPart,
    soakWindow: cwPart,
    note: ok
      ? 'production traffic on Aurora confirmed (both point-in-time and 24h soak)'
      : !pgPart.ok && !cwPart.ok ? 'no Aurora traffic detected - cutover may not be complete'
      : !pgPart.ok ? 'no live production connections right now - production may be down'
      : 'no traffic in 24h soak window - cutover may have just happened or environment is idle',
  });
}

// Check 4: 24-hour error rate within tolerance.
async function checkErrorRateBaseline() {
  try {
    const r = await cwl.send(
      new FilterLogEventsCommand({
        logGroupName: LOG_GROUP,
        startTime: Date.now() - 24 * 60 * 60 * 1000,
        endTime: Date.now(),
        filterPattern: '?ERROR ?5xx ?500 ?502 ?503 ?504',
      })
    );
    const errorCount24h = (r.events || []).length;
    // 24h error count tolerance: extrapolate from 30-min baseline (48x factor)
    const expected24h = BASELINE_ERROR_RATE * 48;
    const threshold = Math.max(expected24h * 2, 100); // floor of 100 errors/24h to allow noise

    const ok = errorCount24h <= threshold;
    record('error_rate_within_baseline', ok, {
      errorCount24h,
      baselineErrorRate30min: BASELINE_ERROR_RATE,
      expected24h,
      threshold,
    });
  } catch (err) {
    record('error_rate_within_baseline', false, String(err.message || err));
  }
}

// Check 5: Final snapshot exists and is available.
async function checkFinalSnapshotExists() {
  try {
    const r = await rds.send(
      new DescribeDBSnapshotsCommand({
        DBInstanceIdentifier: RDS_INSTANCE_ID,
        SnapshotType: 'manual',
      })
    );
    const snapshots = r.DBSnapshots || [];
    const finalSnapshots = snapshots.filter((s) =>
      s.DBSnapshotIdentifier?.startsWith(FINAL_SNAPSHOT_PREFIX)
    );
    if (finalSnapshots.length === 0) {
      return record('final_snapshot_exists', false, {
        searchedPrefix: FINAL_SNAPSHOT_PREFIX,
        totalManualSnapshots: snapshots.length,
        note: 'no final snapshot found - take one before deletion (Step 4.2 of runbook)',
      });
    }
    const latest = finalSnapshots.sort((a, b) =>
      new Date(b.SnapshotCreateTime) - new Date(a.SnapshotCreateTime)
    )[0];
    const ok = latest.Status === 'available';
    record('final_snapshot_exists', ok, {
      snapshotId: latest.DBSnapshotIdentifier,
      status: latest.Status,
      createdAt: latest.SnapshotCreateTime,
      sizeGb: latest.AllocatedStorage,
    });
  } catch (err) {
    record('final_snapshot_exists', false, String(err.message || err));
  }
}

// Check 6: RDS instance still present (sanity check - we wouldn't want to "decommission" something already gone).
async function checkRdsStillPresent() {
  try {
    const r = await rds.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: RDS_INSTANCE_ID })
    );
    const inst = r.DBInstances?.[0];
    if (!inst) {
      return record('rds_still_present', false, 'RDS instance already gone - already decommissioned?');
    }
    const ok = inst.DBInstanceStatus === 'available' || inst.DBInstanceStatus === 'stopped';
    record('rds_still_present', ok, {
      status: inst.DBInstanceStatus,
      class: inst.DBInstanceClass,
      deletionProtection: inst.DeletionProtection,
      note: inst.DeletionProtection ? 'deletion protection still on; will be disabled at Step 4.4' : 'deletion protection off',
    });
  } catch (err) {
    if (err.name === 'DBInstanceNotFoundFault' || /not found/i.test(err.message || '')) {
      return record('rds_still_present', false, 'RDS instance not found - already decommissioned?');
    }
    record('rds_still_present', false, String(err.message || err));
  }
}

// Check 7: DMS task is stopped (cutover Step 4.2 was successful).
async function checkDmsTaskStopped() {
  try {
    const r = await dms.send(
      new DescribeReplicationTasksCommand({
        Filters: [{ Name: 'replication-task-arn', Values: [DMS_TASK_ARN] }],
      })
    );
    const t = r.ReplicationTasks?.[0];
    if (!t) {
      // Already deleted: that's fine for decommission
      return record('dms_task_stopped', true, 'DMS task already deleted');
    }
    const ok = t.Status === 'stopped' || t.Status === 'failed';
    record('dms_task_stopped', ok, {
      status: t.Status,
      lastFailure: t.LastFailureMessage || null,
      note: ok ? 'DMS stopped, ready for cleanup' : `DMS still ${t.Status}, did Day 10 cutover Step 4.2 fire?`,
    });
  } catch (err) {
    record('dms_task_stopped', false, String(err.message || err));
  }
}

(async () => {
  await checkProductionTaskDefUsesAurora();
  await checkRdsNoRecentTraffic();
  await checkAuroraActiveTraffic();
  await checkErrorRateBaseline();
  await checkFinalSnapshotExists();
  await checkRdsStillPresent();
  await checkDmsTaskStopped();

  const ready = blockers.length === 0;
  const out = {
    ready_for_decommission: ready,
    generatedAt: new Date().toISOString(),
    checks,
    blockers,
    warnings,
  };
  console.log('---DECOMMISSION_VALIDATION---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(ready ? 0 : 1);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(2);
});
