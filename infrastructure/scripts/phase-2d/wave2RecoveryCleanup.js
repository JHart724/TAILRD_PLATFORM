/**
 * Wave 2 attempt 1 recovery cleanup.
 *
 * What this does on Aurora `tailrd` database (production writer):
 *   1. Lists current state: patients/encounters counts, all `awsdms_*` tables, all `tailrd_rehearsal*` databases.
 *   2. Inside a transaction:
 *      a. DROP TABLE IF EXISTS for every `awsdms_*` table found. CASCADE to release any indexes.
 *      b. TRUNCATE patients, encounters CASCADE — this resets to DO_NOTHING precondition.
 *         CASCADE will also touch observations + alerts (which reference patients/encounters via FK).
 *         Day 9 pre-flight verified observations=0 and alerts=0 on Aurora, so CASCADE is a no-op for them.
 *      c. Re-counts patients/encounters to verify both = 0.
 *   3. If post-truncate counts != 0/0, ROLLBACK and exit non-zero.
 *   4. Otherwise COMMIT and emit a final state snapshot.
 *
 * Safety guards:
 *   - Only touches the `tailrd` database on Aurora writer.
 *   - Only drops tables whose name starts with `awsdms_` AND in the public schema.
 *   - Pre-truncate count of clinical tables (observations, alerts, hospitals, users) is captured for forensics.
 *   - Transaction-wrapped: any failure aborts the whole cleanup, leaving Aurora untouched.
 *
 * Read-source-of-truth for what's on Aurora:
 *   - Day 9 pre-flight at 22:49Z (latest known clean state): patients=0, encounters=0, hospitals=0, users=0
 *   - After Wave 2 attempt 1 (23:17Z): patients likely 0 (FullLoadRows=0), encounters likely partial (~350k)
 *   - Other clinical tables: unchanged from pre-flight (Wave 2 task only mapped patients + encounters; nothing else was written)
 *
 * Runs via Fargate one-off task with Phase2D-TempSecretsAccess on tailrd-production-ecs-task.
 */
/* eslint-disable */
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const AURORA_WRITER = 'tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com';
const AURORA_SECRET = 'tailrd-production/app/aurora-db-password';
const RUN_TS = new Date().toISOString();

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
    statement_timeout: 120000,
    query_timeout: 120000,
  });
  await client.connect();
  return client;
}

(async () => {
  const out = { generatedAt: RUN_TS, before: {}, dropped: [], after: {}, verdict: 'UNKNOWN', error: null };
  const client = await connectAurora();

  try {
    // 1. Pre-snapshot: counts + awsdms tables
    const before = {};
    for (const t of ['patients', 'encounters', 'observations', 'alerts', 'hospitals', 'users',
                     'conditions', 'medications', 'procedures', 'device_implants', 'allergy_intolerances', 'orders']) {
      try {
        const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        before[t] = r.rows[0].n;
      } catch (e) {
        before[t] = `ERROR: ${e.message}`;
      }
    }
    out.before = before;

    const awsdmsTables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'awsdms\\_%' ESCAPE '\\'
      ORDER BY table_name
    `);
    out.before.awsdms_tables = awsdmsTables.rows.map((r) => r.table_name);

    console.log(`[${new Date().toISOString()}] BEFORE state:`);
    console.log(JSON.stringify(out.before, null, 2));

    // 2. Sanity check the clinical tables we don't expect to touch
    const unexpected = [];
    for (const t of ['observations', 'alerts', 'hospitals', 'users', 'conditions', 'medications',
                     'procedures', 'device_implants', 'allergy_intolerances', 'orders']) {
      if (typeof before[t] === 'number' && before[t] > 0) {
        unexpected.push(`${t}=${before[t]}`);
      }
    }
    if (unexpected.length > 0) {
      out.verdict = 'ABORT_UNEXPECTED_DATA';
      out.error = `Unexpected non-empty clinical tables on Aurora — refusing to TRUNCATE CASCADE. Found: ${unexpected.join(', ')}`;
      console.error(`---ABORT---`);
      console.error(out.error);
      console.error(`---END---`);
      console.log(JSON.stringify(out, null, 2));
      process.exit(1);
    }

    // 3. Begin transaction
    console.log(`[${new Date().toISOString()}] BEGIN cleanup transaction`);
    await client.query('BEGIN');

    // 3a. Drop awsdms_* tables (whitelisted by schema + prefix, defense-in-depth)
    for (const tbl of out.before.awsdms_tables) {
      if (!tbl.startsWith('awsdms_')) {
        throw new Error(`Refusing to DROP non-awsdms table: ${tbl}`);
      }
      const sql = `DROP TABLE IF EXISTS public."${tbl}" CASCADE`;
      console.log(`[${new Date().toISOString()}] ${sql}`);
      await client.query(sql);
      out.dropped.push(tbl);
    }

    // 3b. TRUNCATE patients + encounters CASCADE
    console.log(`[${new Date().toISOString()}] TRUNCATE TABLE public.patients, public.encounters CASCADE`);
    await client.query(`TRUNCATE TABLE public.patients, public.encounters CASCADE`);

    // 4. Post-truncate counts
    const after = {};
    for (const t of ['patients', 'encounters', 'observations', 'alerts', 'hospitals', 'users',
                     'conditions', 'medications', 'procedures', 'device_implants', 'allergy_intolerances', 'orders']) {
      try {
        const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        after[t] = r.rows[0].n;
      } catch (e) {
        after[t] = `ERROR: ${e.message}`;
      }
    }
    const awsdmsTablesAfter = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'awsdms\\_%' ESCAPE '\\'
      ORDER BY table_name
    `);
    after.awsdms_tables = awsdmsTablesAfter.rows.map((r) => r.table_name);
    out.after = after;

    // 5. Verify clean state
    const ok =
      after.patients === 0 &&
      after.encounters === 0 &&
      after.awsdms_tables.length === 0;

    if (!ok) {
      throw new Error(
        `Post-cleanup verification failed: patients=${after.patients} encounters=${after.encounters} awsdms_tables=${JSON.stringify(after.awsdms_tables)}`
      );
    }

    // 6. Commit
    console.log(`[${new Date().toISOString()}] COMMIT`);
    await client.query('COMMIT');
    out.verdict = 'CLEAN';
  } catch (e) {
    out.verdict = 'ERROR';
    out.error = String(e.message || e);
    out.stack = e.stack;
    try {
      await client.query('ROLLBACK');
      console.error(`[${new Date().toISOString()}] ROLLBACK due to: ${out.error}`);
    } catch (rbErr) {
      console.error(`[${new Date().toISOString()}] ROLLBACK also failed: ${rbErr.message}`);
    }
  } finally {
    try { await client.end(); } catch {}
  }

  console.log('---RECOVERY---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.verdict === 'CLEAN' ? 0 : 1);
})();
