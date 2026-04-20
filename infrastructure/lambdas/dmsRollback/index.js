/**
 * DMS Wave rollback Lambda.
 *
 * Invoked by CloudWatch alarms (DMS_TASK_FAILED, REPLICATION_LAG_CRITICAL,
 * DMS_ERROR_COUNT_CRITICAL) to safely abort a DMS replication wave.
 *
 * Actions, in order:
 *   1. Stop the DMS replication task (idempotent).
 *   2. If a logical replication slot was created by the task, drop it on
 *      the source so WAL does not pile up. (no-op for full-load-only
 *      migrations where no slot exists)
 *   3. Truncate the wave's target tables on Aurora so a later restart of
 *      the full load starts clean. Configured via TARGET_TRUNCATE_TABLES
 *      env var (comma-separated).
 *   4. Publish an SNS alert with the alarm that triggered the rollback.
 *
 * Environment variables:
 *   DMS_TASK_ARN             (required) — ARN of the replication task to stop
 *   AURORA_SECRET_ARN        (required) — Secrets Manager secret containing
 *                             {"username","password"} for Aurora admin
 *   AURORA_WRITER_ENDPOINT   (required) — host:port or bare host of Aurora
 *   AURORA_DATABASE          (default: tailrd) — target DB name
 *   TARGET_TRUNCATE_TABLES   (required) — comma-separated table names to
 *                             TRUNCATE CASCADE on rollback (e.g. "hospitals,users")
 *   SOURCE_SECRET_ARN        (optional) — Secrets Manager secret URL for RDS
 *   SOURCE_HOST              (optional) — RDS host for slot cleanup
 *   SOURCE_DATABASE          (default: tailrd)
 *   REPLICATION_SLOT_NAME    (optional) — slot to drop on RDS (no-op if absent)
 *   SNS_TOPIC_ARN            (required) — topic to publish rollback alerts to
 *
 * Event shape: the Lambda accepts two shapes:
 *   1. CloudWatch alarm event (invoked via alarm -> Lambda directly or via SNS)
 *      — extract AlarmName + reason from `event.detail` or `event.Records[0].Sns.Message`
 *   2. Manual invocation for testing: { "alarmName": "MANUAL_TEST", "reason": "chaos test" }
 *
 * Handles missing/malformed inputs gracefully — surfaces them in the SNS
 * message so the on-call engineer knows what happened.
 */

const {
  DatabaseMigrationServiceClient,
  StopReplicationTaskCommand,
  DescribeReplicationTasksCommand,
} = require('@aws-sdk/client-database-migration-service');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');
const {
  SNSClient,
  PublishCommand,
} = require('@aws-sdk/client-sns');
const { Client: PgClient } = require('pg');

const dms = new DatabaseMigrationServiceClient({});
const secrets = new SecretsManagerClient({});
const sns = new SNSClient({});

/** Pull a Secrets Manager JSON secret and return its parsed body. */
async function readSecret(arn) {
  if (!arn) return null;
  const res = await secrets.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) return null;
  try {
    return JSON.parse(res.SecretString);
  } catch {
    // Secret is a raw string (e.g. the old DATABASE_URL secret)
    return { raw: res.SecretString };
  }
}

function parseAlarmFromEvent(event) {
  // CloudWatch alarm invoked directly (new AlarmAction -> Lambda path)
  if (event?.alarmData?.alarmName) {
    return {
      alarmName: event.alarmData.alarmName,
      reason: event.alarmData.state?.reason || 'alarm transitioned to ALARM',
    };
  }
  // CloudWatch alarm via SNS subscription
  if (event?.Records?.[0]?.Sns?.Message) {
    try {
      const body = JSON.parse(event.Records[0].Sns.Message);
      return {
        alarmName: body.AlarmName || 'UNKNOWN',
        reason: body.NewStateReason || body.AlarmDescription || 'via SNS',
      };
    } catch {
      return { alarmName: 'SNS_UNPARSEABLE', reason: String(event.Records[0].Sns.Message).slice(0, 200) };
    }
  }
  // Manual test invocation
  if (event?.alarmName) {
    return { alarmName: event.alarmName, reason: event.reason || 'manual invocation' };
  }
  return { alarmName: 'NO_ALARM_INFO', reason: 'event had no recognizable alarm payload' };
}

async function stopTask(taskArn) {
  if (!taskArn) return { skipped: 'no DMS_TASK_ARN configured' };
  // Check current state — avoid stopping something already stopped
  const describe = await dms.send(
    new DescribeReplicationTasksCommand({
      Filters: [{ Name: 'replication-task-arn', Values: [taskArn] }],
    }),
  );
  const task = describe.ReplicationTasks?.[0];
  if (!task) return { skipped: 'task not found', taskArn };
  if (['stopped', 'failed', 'deleted'].includes((task.Status || '').toLowerCase())) {
    return { skipped: `task already in ${task.Status}` };
  }
  await dms.send(new StopReplicationTaskCommand({ ReplicationTaskArn: taskArn }));
  return { stopped: true, priorStatus: task.Status };
}

async function dropReplicationSlot({ sourceSecretArn, sourceHost, sourceDatabase, slotName }) {
  if (!slotName) return { skipped: 'no REPLICATION_SLOT_NAME configured (full-load-only)' };
  if (!sourceHost) return { skipped: 'no SOURCE_HOST configured' };

  // For RDS, the secret may be {"username","password"} OR a raw connection URL
  const secret = await readSecret(sourceSecretArn);
  let user, password;
  if (secret?.username && secret?.password) {
    user = secret.username;
    password = secret.password;
  } else if (secret?.raw) {
    // Expect postgresql://user:pass@host:port/db?... — parse
    const m = secret.raw.match(/^postgresql:\/\/([^:]+):([^@]+)@/);
    if (m) {
      user = decodeURIComponent(m[1]);
      password = decodeURIComponent(m[2]);
    }
  }
  if (!user || !password) return { skipped: 'could not resolve source credentials from secret' };

  const client = new PgClient({
    host: sourceHost,
    port: 5432,
    database: sourceDatabase || 'tailrd',
    user,
    password,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    // pg_drop_replication_slot raises if slot is active — force-kill any consumer first
    await client.query(
      `SELECT pg_terminate_backend(active_pid) FROM pg_replication_slots WHERE slot_name = $1 AND active_pid IS NOT NULL`,
      [slotName],
    );
    await client.query(`SELECT pg_drop_replication_slot($1)`, [slotName]);
    return { dropped: slotName };
  } catch (e) {
    return { error: `slot drop failed: ${e.message}` };
  } finally {
    await client.end().catch(() => {});
  }
}

async function truncateTargetTables({ auroraSecretArn, auroraEndpoint, database, tables }) {
  if (!tables || !tables.length) return { skipped: 'no TARGET_TRUNCATE_TABLES configured' };
  if (!auroraEndpoint) return { skipped: 'no AURORA_WRITER_ENDPOINT configured' };

  const secret = await readSecret(auroraSecretArn);
  if (!secret?.username || !secret?.password) {
    return { error: 'aurora secret missing username/password fields' };
  }

  const [host, port] = String(auroraEndpoint).split(':');
  const client = new PgClient({
    host,
    port: port ? Number(port) : 5432,
    database: database || 'tailrd',
    user: secret.username,
    password: secret.password,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    // Quote each identifier to survive reserved words / mixed case
    const identList = tables.map((t) => `"${t.replace(/"/g, '')}"`).join(', ');
    const sql = `TRUNCATE ${identList} CASCADE`;
    await client.query(sql);
    return { truncated: tables, sql };
  } catch (e) {
    return { error: `truncate failed: ${e.message}` };
  } finally {
    await client.end().catch(() => {});
  }
}

async function publishSNS(topicArn, payload) {
  if (!topicArn) return { skipped: 'no SNS_TOPIC_ARN configured' };
  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: `[TAILRD] DMS rollback executed (${payload.alarmName})`.slice(0, 100),
      Message: JSON.stringify(payload, null, 2),
    }),
  );
  return { published: true };
}

exports.handler = async (event) => {
  const startedAt = new Date().toISOString();
  const alarm = parseAlarmFromEvent(event);

  const cfg = {
    dmsTaskArn: process.env.DMS_TASK_ARN,
    auroraSecretArn: process.env.AURORA_SECRET_ARN,
    auroraEndpoint: process.env.AURORA_WRITER_ENDPOINT,
    auroraDatabase: process.env.AURORA_DATABASE || 'tailrd',
    truncateTables: (process.env.TARGET_TRUNCATE_TABLES || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    sourceSecretArn: process.env.SOURCE_SECRET_ARN,
    sourceHost: process.env.SOURCE_HOST,
    sourceDatabase: process.env.SOURCE_DATABASE || 'tailrd',
    slotName: process.env.REPLICATION_SLOT_NAME,
    snsTopicArn: process.env.SNS_TOPIC_ARN,
  };

  const report = { startedAt, alarm, config: cfg, steps: {} };

  // Step 1: stop DMS task
  try {
    report.steps.stopTask = await stopTask(cfg.dmsTaskArn);
  } catch (e) {
    report.steps.stopTask = { error: e.message };
  }

  // Step 2: drop replication slot (CDC only)
  try {
    report.steps.dropSlot = await dropReplicationSlot({
      sourceSecretArn: cfg.sourceSecretArn,
      sourceHost: cfg.sourceHost,
      sourceDatabase: cfg.sourceDatabase,
      slotName: cfg.slotName,
    });
  } catch (e) {
    report.steps.dropSlot = { error: e.message };
  }

  // Step 3: truncate target tables
  try {
    report.steps.truncate = await truncateTargetTables({
      auroraSecretArn: cfg.auroraSecretArn,
      auroraEndpoint: cfg.auroraEndpoint,
      database: cfg.auroraDatabase,
      tables: cfg.truncateTables,
    });
  } catch (e) {
    report.steps.truncate = { error: e.message };
  }

  // Step 4: SNS notification (even on partial failure — operator needs to see it)
  try {
    report.steps.sns = await publishSNS(cfg.snsTopicArn, {
      ...report,
      finishedAt: new Date().toISOString(),
    });
  } catch (e) {
    report.steps.sns = { error: e.message };
  }

  report.finishedAt = new Date().toISOString();
  // Lambda return shows up in CloudWatch Logs automatically
  console.log(JSON.stringify(report));
  return report;
};
