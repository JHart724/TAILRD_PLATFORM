/**
 * Wave 2 Attempt 3 pre-flight: combined READ-ONLY verification + LOB sizing.
 *
 * Confirms the production environment matches yesterday's close-out state and
 * gathers the data required to choose the LOB mode for the new task config.
 *
 * Two connections in one Fargate run to amortize IAM/secret cost:
 *   1. Aurora writer @ tailrd database (verify only - patients/encounters/awsdms_*)
 *   2. Source RDS @ tailrd database (verify pg_replication_slots, size LOB candidates)
 *
 * STRICT READ-ONLY. No BEGIN/COMMIT. No DDL. No DML. Only SELECT.
 *
 * Exit code:
 *   0 - verdict CLEAN (Aurora empty, no awsdms_*, no DMS slots, sizing collected)
 *   1 - any verification failure or query error (operator must investigate)
 */
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const AURORA_SECRET = 'tailrd-production/app/aurora-db-password';

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

async function connectAurora() {
  const sm = new SecretsManagerClient({ region: 'us-east-1' });
  const r = await sm.send(new GetSecretValueCommand({ SecretId: AURORA_SECRET }));
  const s = JSON.parse(r.SecretString);
  const c = new Client({
    host: AURORA_WRITER, port: 5432, user: s.username, password: s.password, database: 'tailrd',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 60000, query_timeout: 60000,
  });
  await c.connect();
  return c;
}

async function connectRds() {
  const url = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('PROBE_DATABASE_URL or DATABASE_URL env var required');
  const c = new Client({
    ...parseDbUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 120000, query_timeout: 120000,
  });
  await c.connect();
  return c;
}

async function auroraVerify() {
  const out = { patients: null, encounters: null, awsdms_tables: null, verdict: 'UNKNOWN' };
  const client = await connectAurora();
  try {
    const p = await client.query('SELECT COUNT(*)::int AS n FROM "patients"');
    out.patients = p.rows[0].n;
    const e = await client.query('SELECT COUNT(*)::int AS n FROM "encounters"');
    out.encounters = e.rows[0].n;
    const awsdms = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name LIKE 'awsdms\\_%' ESCAPE '\\'
       ORDER BY table_name`
    );
    out.awsdms_tables = awsdms.rows.map((r) => r.table_name);

    const ok = out.patients === 0 && out.encounters === 0 && out.awsdms_tables.length === 0;
    out.verdict = ok ? 'CLEAN' : 'STATE_DRIFT';
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  } finally {
    try { await client.end(); } catch (_) { /* noop */ }
  }
  return out;
}

async function rdsSlotVerify(client) {
  const out = { slots: null, dms_slots: null, other_slots: null, verdict: 'UNKNOWN' };
  try {
    const r = await client.query(
      `SELECT slot_name, plugin, slot_type, active, restart_lsn::text AS restart_lsn
       FROM pg_replication_slots
       ORDER BY slot_name`
    );
    out.slots = normalize(r.rows);
    // Heuristic: DMS auto-generated slot names are alphanumeric + underscore, > 10 chars,
    // typically prefixed with the task UUID lower-cased.
    const isDmsSlot = (n) => /^[a-z0-9_]+$/.test(n) && n.length > 10;
    out.dms_slots = out.slots.filter((s) => isDmsSlot(s.slot_name));
    out.other_slots = out.slots.filter((s) => !isDmsSlot(s.slot_name));
    out.verdict = out.dms_slots.length === 0 && out.slots.length === 0 ? 'CLEAN'
                : out.dms_slots.length === 0 ? 'NON_DMS_SLOTS_PRESENT'
                : 'DMS_SLOTS_PRESENT';
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  }
  return out;
}

async function rdsSizeEncountersDiagnosisCodes(client) {
  const out = { verdict: 'UNKNOWN' };
  try {
    const r = await client.query(`
      SELECT
        COUNT(*)::int AS total_encounters,
        COALESCE(MAX(LENGTH("diagnosisCodes"::text)), 0)::int AS max_jsonb_bytes,
        COALESCE(AVG(LENGTH("diagnosisCodes"::text)), 0)::int AS avg_jsonb_bytes,
        COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY LENGTH("diagnosisCodes"::text)), 0)::int AS p99_jsonb_bytes,
        COUNT(*) FILTER (WHERE LENGTH("diagnosisCodes"::text) > 32768)::int AS oversized_32k,
        COUNT(*) FILTER (WHERE LENGTH("diagnosisCodes"::text) > 65536)::int AS oversized_64k,
        COUNT(*) FILTER (WHERE "diagnosisCodes" IS NOT NULL)::int AS non_null_count
      FROM "encounters"
    `);
    Object.assign(out, r.rows[0]);
    out.verdict = 'OK';
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  }
  return out;
}

/**
 * Discover all TEXT/VARCHAR/JSONB columns in patients + encounters and report
 * the max byte length per column. Catches any non-obvious large field that
 * could trigger LOB handling beyond the diagnosisCodes JSONB we already track.
 */
async function rdsDiscoverLobCandidates(client) {
  const out = { columns: [], max_observed: 0, verdict: 'UNKNOWN' };
  try {
    const cols = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('patients', 'encounters')
        AND (data_type IN ('text', 'character varying', 'jsonb', 'json')
             OR udt_name IN ('text', 'varchar', 'jsonb', 'json'))
      ORDER BY table_name, ordinal_position
    `);

    for (const row of cols.rows) {
      const { table_name, column_name, data_type, udt_name } = row;
      const sizeQuery = `
        SELECT
          COALESCE(MAX(LENGTH("${column_name}"::text)), 0)::int AS max_bytes,
          COALESCE(AVG(LENGTH("${column_name}"::text)), 0)::int AS avg_bytes,
          COUNT(*) FILTER (WHERE LENGTH("${column_name}"::text) > 32768)::int AS over_32k,
          COUNT(*) FILTER (WHERE "${column_name}" IS NOT NULL)::int AS non_null
        FROM "${table_name}"
      `;
      const r = await client.query(sizeQuery);
      const stats = r.rows[0];
      out.columns.push({
        table: table_name,
        column: column_name,
        type: data_type,
        udt: udt_name,
        max_bytes: stats.max_bytes,
        avg_bytes: stats.avg_bytes,
        over_32k: stats.over_32k,
        non_null: stats.non_null,
      });
      if (stats.max_bytes > out.max_observed) out.max_observed = stats.max_bytes;
    }
    out.verdict = 'OK';
  } catch (err) {
    out.verdict = 'ERROR';
    out.error = String(err.message || err);
  }
  return out;
}

(async () => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Wave 2 Attempt 3 pre-flight (read-only verify + size)...`);

  console.log(`[${new Date().toISOString()}] Phase A: Aurora verify`);
  const aurora = await auroraVerify();

  console.log(`[${new Date().toISOString()}] Phase B: RDS connect + slot verify + sizing`);
  const rds = { slots: null, diagnosis_codes: null, lob_candidates: null, verdict: 'UNKNOWN' };
  let rdsClient;
  try {
    rdsClient = await connectRds();
    rds.slots = await rdsSlotVerify(rdsClient);
    rds.diagnosis_codes = await rdsSizeEncountersDiagnosisCodes(rdsClient);
    rds.lob_candidates = await rdsDiscoverLobCandidates(rdsClient);
    const phaseVerdicts = [rds.slots.verdict, rds.diagnosis_codes.verdict, rds.lob_candidates.verdict];
    rds.verdict = phaseVerdicts.every((v) => v === 'CLEAN' || v === 'OK') ? 'CLEAN' : 'NEEDS_REVIEW';
  } catch (err) {
    rds.verdict = 'ERROR';
    rds.error = String(err.message || err);
  } finally {
    if (rdsClient) try { await rdsClient.end(); } catch (_) { /* noop */ }
  }

  const overall = {
    generatedAt: ts,
    aurora,
    rds,
    verdict: (aurora.verdict === 'CLEAN' && rds.verdict === 'CLEAN') ? 'CLEAN' : 'NEEDS_REVIEW',
  };

  console.log('---PREFLIGHT---');
  console.log(JSON.stringify(overall, null, 2));
  console.log('---END---');
  process.exit(overall.verdict === 'CLEAN' ? 0 : 1);
})();
