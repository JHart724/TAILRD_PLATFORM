/**
 * Day 9 Phase 9-PRE-4+5 — Combined Wave 2 production pre-flight.
 *
 * Read-only on both databases. Writes artifacts to S3 migration-artifacts/wave2-production/.
 *
 * Source RDS checks:
 *   - patients count (expect 6,147)
 *   - encounters count (expect 353,512)
 *   - pg_replication_slots empty
 *   - tailrd_admin is member of rds_superuser
 *   - full patient md5 checksum (baseline for Gate 2)
 *   - 10k random encounter ID sample (saved to S3 for Gate 3)
 *   - encounter sample rowset checksum (baseline for Gate 3)
 *
 * Aurora target checks:
 *   - patients count (must be 0 — DO_NOTHING precondition)
 *   - encounters count (must be 0 — DO_NOTHING precondition)
 *   - hospitals + users counts (informational)
 *   - pg_database has no rehearsal% / tailrd_rehearsal% entries
 *
 * Exits 0 only if all gates pass. Emits single-line markers ---PREFLIGHT--- / ---END---
 * wrapping JSON for log scraping.
 */

/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const AURORA_SECRET = 'tailrd-production/app/aurora-db-password';
const S3_BUCKET = 'tailrd-cardiovascular-datasets-863518424332';
const S3_PREFIX = 'migration-artifacts/wave2-production/';
const RUN_TS = new Date().toISOString();
const EXPECT_PATIENTS = 6147;
const EXPECT_ENCOUNTERS = 353512;

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
      out[k] = typeof v === 'bigint' ? v.toString() : v;
    }
    return out;
  });
}

async function connectSource() {
  const conn = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL / PROBE_DATABASE_URL not set');
  const client = new Client({
    ...parseDbUrl(conn),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 600000,
    query_timeout: 600000,
  });
  await client.connect();
  return client;
}

async function connectAurora() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: AURORA_SECRET }));
  const s = JSON.parse(r.SecretString);
  const client = new Client({
    host: AURORA_WRITER,
    port: 5432,
    user: s.username,
    password: s.password,
    database: 'tailrd',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
    query_timeout: 60000,
  });
  await client.connect();
  return client;
}

async function sourceChecks(source) {
  const checks = {};

  const pc = await source.query('SELECT COUNT(*)::int AS n FROM patients');
  checks.patients_count = pc.rows[0].n;

  const ec = await source.query('SELECT COUNT(*)::int AS n FROM encounters');
  checks.encounters_count = ec.rows[0].n;

  const slots = await source.query('SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots');
  checks.replication_slots = normalize(slots.rows);
  checks.replication_slots_count = slots.rows.length;

  const roles = await source.query(`
    SELECT r.rolname AS parent_role
    FROM pg_auth_members m
    JOIN pg_roles r ON m.roleid = r.oid
    JOIN pg_roles u ON m.member = u.oid
    WHERE u.rolname = 'tailrd_admin'
  `);
  checks.tailrd_admin_roles = roles.rows.map((r) => r.parent_role);
  checks.tailrd_admin_has_superuser = checks.tailrd_admin_roles.includes('rds_superuser');

  const patientChecksum = await source.query(
    `SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum FROM patients`
  );
  checks.patients_checksum = patientChecksum.rows[0].checksum;

  const sampleRows = await source.query(
    `SELECT id FROM encounters ORDER BY random() LIMIT 10000`
  );
  const sampleIds = sampleRows.rows.map((r) => r.id);
  checks.sample_size = sampleIds.length;

  const sampleChecksum = await source.query(
    `SELECT md5(string_agg(
       id::text || '|' ||
       "patientId"::text || '|' ||
       COALESCE("startDateTime"::text, '') || '|' ||
       "encounterType"::text,
       ',' ORDER BY id
     )) AS checksum
     FROM encounters
     WHERE id = ANY($1::text[])`,
    [sampleIds]
  );
  checks.encounter_sample_checksum = sampleChecksum.rows[0].checksum;

  return { checks, sampleIds };
}

async function auroraChecks(aurora) {
  const checks = {};

  checks.patients_count = (await aurora.query('SELECT COUNT(*)::int AS n FROM patients')).rows[0].n;
  checks.encounters_count = (await aurora.query('SELECT COUNT(*)::int AS n FROM encounters')).rows[0].n;
  checks.hospitals_count = (await aurora.query('SELECT COUNT(*)::int AS n FROM hospitals')).rows[0].n;
  checks.users_count = (await aurora.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n;

  const dbs = await aurora.query(
    `SELECT datname FROM pg_database WHERE datname LIKE 'rehearsal%' OR datname LIKE 'tailrd_rehearsal%'`
  );
  checks.rehearsal_databases = dbs.rows.map((r) => r.datname);

  return checks;
}

async function writeSampleToS3(sampleIds, checksum, patientsChecksum) {
  const s3 = new S3Client({ region: 'us-east-1' });
  const timestamp = RUN_TS.replace(/[:.]/g, '-');
  const key = `${S3_PREFIX}encounter-sample-${timestamp}.json`;
  const latestKey = `${S3_PREFIX}encounter-sample-latest.json`;
  const payload = {
    generatedAt: RUN_TS,
    purpose: 'Day 9 Wave 2 production pre-flight — Gates 2 + 3 post-load validation',
    sampleSize: sampleIds.length,
    sourceEncounterSampleChecksum: checksum,
    sourcePatientsChecksum: patientsChecksum,
    ids: sampleIds,
  };
  const body = JSON.stringify(payload);
  await s3.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: 'application/json' })
  );
  await s3.send(
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: latestKey, Body: body, ContentType: 'application/json' })
  );
  return { key, latestKey };
}

(async () => {
  const out = { generatedAt: RUN_TS, source: {}, aurora: {}, s3: {}, gates: {}, verdict: 'UNKNOWN' };
  let source;
  let aurora;

  try {
    console.log(`[${new Date().toISOString()}] [1/4] Connecting to source RDS...`);
    source = await connectSource();

    console.log(`[${new Date().toISOString()}] [2/4] Running source checks (checksum + 10k sample)...`);
    const { checks: srcChecks, sampleIds } = await sourceChecks(source);
    out.source = srcChecks;

    console.log(`[${new Date().toISOString()}] [3/4] Connecting + checking Aurora target...`);
    aurora = await connectAurora();
    out.aurora = await auroraChecks(aurora);

    console.log(`[${new Date().toISOString()}] [4/4] Saving sample + checksums to S3...`);
    out.s3 = await writeSampleToS3(sampleIds, srcChecks.encounter_sample_checksum, srcChecks.patients_checksum);

    // Gate evaluation
    const sourceRdsGate =
      out.source.patients_count === EXPECT_PATIENTS &&
      out.source.encounters_count === EXPECT_ENCOUNTERS &&
      out.source.replication_slots_count === 0 &&
      out.source.tailrd_admin_has_superuser === true;

    const auroraEmptyGate =
      out.aurora.patients_count === 0 &&
      out.aurora.encounters_count === 0 &&
      out.aurora.rehearsal_databases.length === 0;

    const baselineRecorded =
      typeof out.source.patients_checksum === 'string' &&
      out.source.patients_checksum.length === 32 &&
      typeof out.source.encounter_sample_checksum === 'string' &&
      out.source.encounter_sample_checksum.length === 32 &&
      out.source.sample_size === 10000 &&
      typeof out.s3.latestKey === 'string';

    out.gates = {
      source_rds_clean: sourceRdsGate,
      aurora_empty: auroraEmptyGate,
      baseline_recorded: baselineRecorded,
    };

    out.verdict = sourceRdsGate && auroraEmptyGate && baselineRecorded ? 'GO' : 'STOP';
  } catch (e) {
    out.verdict = 'ERROR';
    out.error = String(e.message || e);
    out.stack = e.stack;
  } finally {
    try { await source?.end(); } catch {}
    try { await aurora?.end(); } catch {}
  }

  console.log('---PREFLIGHT---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.verdict === 'GO' ? 0 : 1);
})();
