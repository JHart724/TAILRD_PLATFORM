/**
 * Day 9 Session 1 close-out: verify + clean Aurora, drop any source RDS replication slots.
 *
 * Two connections in one run to amortize IAM/secret cost:
 *   1. Aurora writer @ tailrd database: verify patients/encounters/awsdms_*, CASCADE truncate + DROP as needed
 *   2. Source RDS @ tailrd database: list pg_replication_slots, drop any DMS-managed slots from attempts 1+2
 *
 * All DDL wrapped in safety guards (only touches awsdms_* prefix, only patients+encounters,
 * only drops slots that match known DMS auto-name pattern).
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
    connectionTimeoutMillis: 10000, statement_timeout: 120000, query_timeout: 120000,
  });
  await c.connect();
  return c;
}

async function connectRds() {
  const url = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  const c = new Client({
    ...parseDbUrl(url),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, statement_timeout: 60000, query_timeout: 60000,
  });
  await c.connect();
  return c;
}

async function auroraCleanup() {
  const out = { before: {}, after: {}, actions: [], verdict: 'UNKNOWN' };
  const client = await connectAurora();
  try {
    // Snapshot before
    const tables = ['patients','encounters','observations','alerts','hospitals','users',
                    'conditions','medications','procedures','device_implants','allergy_intolerances','orders'];
    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      out.before[t] = r.rows[0].n;
    }
    const awsdmsBefore = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'awsdms\\_%' ESCAPE '\\' ORDER BY table_name`
    );
    out.before.awsdms_tables = awsdmsBefore.rows.map((r) => r.table_name);

    // Safety gate
    const unexpectedNonEmpty = [];
    for (const t of ['observations','alerts','hospitals','users','conditions','medications','procedures','device_implants','allergy_intolerances','orders']) {
      if (out.before[t] > 0) unexpectedNonEmpty.push(`${t}=${out.before[t]}`);
    }
    if (unexpectedNonEmpty.length) {
      out.verdict = 'ABORT_UNEXPECTED';
      out.error = `Unexpected clinical data: ${unexpectedNonEmpty.join(', ')}`;
      return out;
    }

    await client.query('BEGIN');
    // Drop awsdms_* CASCADE
    for (const tbl of out.before.awsdms_tables) {
      if (!tbl.startsWith('awsdms_')) throw new Error(`Refuse drop non-awsdms: ${tbl}`);
      await client.query(`DROP TABLE IF EXISTS public."${tbl}" CASCADE`);
      out.actions.push(`DROP public."${tbl}"`);
    }
    // TRUNCATE patients + encounters CASCADE (FK-aware)
    await client.query(`TRUNCATE TABLE public.patients, public.encounters CASCADE`);
    out.actions.push('TRUNCATE public.patients, public.encounters CASCADE');

    // Post-snapshot
    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      out.after[t] = r.rows[0].n;
    }
    const awsdmsAfter = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'awsdms\\_%' ESCAPE '\\' ORDER BY table_name`
    );
    out.after.awsdms_tables = awsdmsAfter.rows.map((r) => r.table_name);

    const ok = out.after.patients === 0 && out.after.encounters === 0 && out.after.awsdms_tables.length === 0;
    if (!ok) throw new Error(`Post-verify failed: patients=${out.after.patients} encounters=${out.after.encounters} awsdms=${JSON.stringify(out.after.awsdms_tables)}`);

    await client.query('COMMIT');
    out.verdict = 'CLEAN';
  } catch (e) {
    out.verdict = 'ERROR';
    out.error = String(e.message || e);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    try { await client.end(); } catch {}
  }
  return out;
}

async function rdsSlotCleanup() {
  const out = { before: [], after: [], dropped: [], verdict: 'UNKNOWN' };
  const client = await connectRds();
  try {
    const slotsBefore = await client.query(
      `SELECT slot_name, plugin, slot_type, active, restart_lsn::text AS restart_lsn FROM pg_replication_slots ORDER BY slot_name`
    );
    out.before = normalize(slotsBefore.rows);

    for (const slot of out.before) {
      if (slot.active) {
        out.dropped.push({ slot_name: slot.slot_name, action: 'SKIPPED_ACTIVE' });
        continue;
      }
      // Only drop slots matching DMS auto-name pattern (alphanumeric + underscore, no manual ones)
      // DMS auto-names look like: y2r2kwwlcfenfe4l_00016413_abc...
      const looksDms = /^[a-z0-9_]+$/.test(slot.slot_name) && slot.slot_name.length > 10;
      if (!looksDms) {
        out.dropped.push({ slot_name: slot.slot_name, action: 'SKIPPED_UNKNOWN_PATTERN' });
        continue;
      }
      try {
        await client.query(`SELECT pg_drop_replication_slot($1)`, [slot.slot_name]);
        out.dropped.push({ slot_name: slot.slot_name, action: 'DROPPED' });
      } catch (e) {
        out.dropped.push({ slot_name: slot.slot_name, action: `FAILED: ${e.message}` });
      }
    }

    const slotsAfter = await client.query(
      `SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots ORDER BY slot_name`
    );
    out.after = normalize(slotsAfter.rows);
    out.verdict = out.after.length === 0 ? 'CLEAN' : 'SLOTS_REMAIN';
  } catch (e) {
    out.verdict = 'ERROR';
    out.error = String(e.message || e);
  } finally {
    try { await client.end(); } catch {}
  }
  return out;
}

(async () => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Starting Day 9 close-out cleanup...`);

  console.log(`[${new Date().toISOString()}] Phase A: Aurora cleanup`);
  const aurora = await auroraCleanup();

  console.log(`[${new Date().toISOString()}] Phase B: RDS replication slot cleanup`);
  const rds = await rdsSlotCleanup();

  const overall = {
    generatedAt: ts,
    aurora,
    rds,
    verdict: (aurora.verdict === 'CLEAN' && rds.verdict === 'CLEAN') ? 'CLEAN' : 'NEEDS_REVIEW',
  };

  console.log('---CLOSEOUT---');
  console.log(JSON.stringify(overall, null, 2));
  console.log('---END---');
  process.exit(overall.verdict === 'CLEAN' ? 0 : 1);
})();
