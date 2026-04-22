/**
 * MCD patient duplicate dedup.
 *
 * Target: production RDS (or the `tailrd-staging-mcd-rehearsal` instance
 * restored from a prod snapshot, for staging rehearsal).
 *
 * Strategy: keep the oldest `createdAt` row per `(hospitalId, fhirPatientId)`
 * on `demo-medical-city-dallas`, reassign all FK-dependent rows (encounters,
 * procedures, conditions, medications, device_implants, allergy_intolerances)
 * from non-survivor patient CUIDs to the survivor CUID, then delete the
 * 8,023 non-survivor patient rows.
 *
 * One transaction with SAVEPOINTs between each UPDATE so a mid-run failure
 * can be localized. All statements wrapped; COMMIT only if every verification
 * passes.
 *
 * DRY_RUN=1 pre-counts everything but rolls back at the end (no data changes).
 * DRY_RUN=0 (default) runs the real transaction.
 *
 * Env:
 *   PROBE_DATABASE_URL — connection string
 *   DRY_RUN            — "1" to rollback at end, "0" to commit
 *   TARGET_HOSPITAL_ID — defaults to demo-medical-city-dallas
 */

const { Client } = require('pg');

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

const DRY_RUN = process.env.DRY_RUN !== '0';
const HOSPITAL_ID = process.env.TARGET_HOSPITAL_ID || 'demo-medical-city-dallas';

// FK-dependent tables that actually have rows pointing at dupe patients
// (empirically verified via FK discovery — Phase 7G step 3). Order doesn't
// matter because each is an UPDATE, not a DELETE.
const FK_TABLES = [
  'encounters',
  'procedures',
  'conditions',
  'medications',
  'device_implants',
  'allergy_intolerances',
];

function ts() { return new Date().toISOString(); }

(async () => {
  const conn = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  if (!conn) { console.error('PROBE_DATABASE_URL not set'); process.exit(2); }

  const c = new Client({
    ...parseDbUrl(conn),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 30 * 60 * 1000,
    query_timeout: 30 * 60 * 1000,
  });
  const report = { ok: true, dry_run: DRY_RUN, target_hospital: HOSPITAL_ID, phases: [] };

  async function phase(name, fn) {
    const t0 = Date.now();
    try {
      const out = await fn();
      report.phases.push({ name, ok: true, ms: Date.now() - t0, ...out });
      console.log(`[${ts()}] ${name} OK ${Date.now() - t0}ms`);
    } catch (e) {
      report.phases.push({ name, ok: false, ms: Date.now() - t0, error: String(e.message || e) });
      report.ok = false;
      console.error(`[${ts()}] ${name} FAIL ${e.message || e}`);
      throw e;
    }
  }

  try {
    await c.connect();
    report.phases.push({ name: 'connect', ok: true, ts: ts() });

    // -------- Pre-state verification --------
    let preState = null;
    await phase('pre_state', async () => {
      const r = await c.query(`
        SELECT
          (SELECT COUNT(*)::int FROM "patients" WHERE "hospitalId" = $1) AS patients_total,
          (SELECT COUNT(*)::int FROM "patients" WHERE "hospitalId" = $1 AND "fhirPatientId" IS NOT NULL) AS patients_with_fhir,
          (SELECT COUNT(*)::int FROM "patients" WHERE "hospitalId" = $1 AND "fhirPatientId" IS NULL) AS patients_no_fhir,
          (SELECT COUNT(*)::int FROM (
            SELECT 1 FROM "patients" WHERE "hospitalId" = $1 AND "fhirPatientId" IS NOT NULL
            GROUP BY "hospitalId", "fhirPatientId" HAVING COUNT(*) > 1
          ) d) AS distinct_dupe_keys,
          (SELECT COUNT(*)::int FROM "encounters" WHERE "hospitalId" = $1) AS encounters_total,
          (SELECT COUNT(*)::int FROM "procedures" WHERE "hospitalId" = $1) AS procedures_total,
          (SELECT COUNT(*)::int FROM "conditions" WHERE "hospitalId" = $1) AS conditions_total,
          (SELECT COUNT(*)::int FROM "medications" WHERE "hospitalId" = $1) AS medications_total,
          (SELECT COUNT(*)::int FROM "device_implants" WHERE "hospitalId" = $1) AS device_implants_total,
          (SELECT COUNT(*)::int FROM "allergy_intolerances" WHERE "hospitalId" = $1) AS allergy_intolerances_total
      `, [HOSPITAL_ID]);
      preState = r.rows[0];
      return { counts: preState };
    });

    // -------- BEGIN TRANSACTION --------
    await c.query('BEGIN');
    report.phases.push({ name: 'begin_txn', ok: true, ts: ts() });

    // -------- Create survivor_map temp table --------
    let mapSize = null;
    await phase('create_survivor_map', async () => {
      await c.query(`
        CREATE TEMP TABLE survivor_map ON COMMIT DROP AS
        SELECT p.id AS dupe_id, s.id AS survivor_id
        FROM "patients" p
        JOIN LATERAL (
          SELECT id FROM "patients" p2
          WHERE p2."hospitalId" = p."hospitalId"
            AND p2."fhirPatientId" = p."fhirPatientId"
            AND p2."fhirPatientId" IS NOT NULL
          ORDER BY p2."createdAt" ASC
          LIMIT 1
        ) s ON TRUE
        WHERE p."hospitalId" = $1
          AND p."fhirPatientId" IS NOT NULL
          AND p.id != s.id
      `, [HOSPITAL_ID]);
      await c.query(`CREATE INDEX ON survivor_map (dupe_id)`);
      const r = await c.query(`SELECT COUNT(*)::int AS n FROM survivor_map`);
      mapSize = r.rows[0].n;
      return { survivor_map_rows: mapSize };
    });

    // Expected: 8023 dupe rows to eliminate. Sanity check.
    if (mapSize !== 8023 && !DRY_RUN) {
      console.warn(`[WARN] survivor_map has ${mapSize} rows, expected 8023 based on Phase 7F measurement. Proceeding but flagging.`);
    }

    // -------- UPDATE each FK-dependent table --------
    const updateStats = {};
    for (const table of FK_TABLES) {
      await phase(`update_${table}`, async () => {
        await c.query(`SAVEPOINT before_update_${table}`);
        const r = await c.query(`
          UPDATE "${table}" t SET "patientId" = sm.survivor_id
          FROM survivor_map sm
          WHERE t."patientId" = sm.dupe_id
        `);
        updateStats[table] = r.rowCount;
        return { rows_updated: r.rowCount };
      });
    }

    // -------- DELETE non-survivor patient rows --------
    let deletedCount = null;
    await phase('delete_non_survivor_patients', async () => {
      await c.query(`SAVEPOINT before_delete_patients`);
      const r = await c.query(`DELETE FROM "patients" WHERE id IN (SELECT dupe_id FROM survivor_map)`);
      deletedCount = r.rowCount;
      return { rows_deleted: r.rowCount };
    });

    // -------- Post-state verification (pre-commit) --------
    let postState = null;
    await phase('post_state_in_txn', async () => {
      const r = await c.query(`
        SELECT
          (SELECT COUNT(*)::int FROM "patients" WHERE "hospitalId" = $1) AS patients_total,
          (SELECT COUNT(*)::int FROM (
            SELECT 1 FROM "patients" WHERE "hospitalId" = $1 AND "fhirPatientId" IS NOT NULL
            GROUP BY "hospitalId", "fhirPatientId" HAVING COUNT(*) > 1
          ) d) AS distinct_dupe_keys,
          (SELECT COUNT(*)::int FROM "encounters" WHERE "hospitalId" = $1) AS encounters_total,
          (SELECT COUNT(*)::int FROM "procedures" WHERE "hospitalId" = $1) AS procedures_total,
          (SELECT COUNT(*)::int FROM "conditions" WHERE "hospitalId" = $1) AS conditions_total,
          (SELECT COUNT(*)::int FROM "medications" WHERE "hospitalId" = $1) AS medications_total,
          (SELECT COUNT(*)::int FROM "device_implants" WHERE "hospitalId" = $1) AS device_implants_total,
          (SELECT COUNT(*)::int FROM "allergy_intolerances" WHERE "hospitalId" = $1) AS allergy_intolerances_total
      `, [HOSPITAL_ID]);
      postState = r.rows[0];
      return { counts: postState };
    });

    // -------- Invariant checks --------
    const invariants = [];
    invariants.push({
      name: 'zero_dupes',
      pass: postState.distinct_dupe_keys === 0,
      actual: postState.distinct_dupe_keys,
    });
    for (const tbl of FK_TABLES) {
      const pre = preState[`${tbl}_total`];
      const post = postState[`${tbl}_total`];
      invariants.push({
        name: `${tbl}_count_unchanged`,
        pass: pre === post,
        pre, post, delta: post - pre,
      });
    }
    invariants.push({
      name: 'patient_count_reduced_by_deleted',
      pass: (preState.patients_total - postState.patients_total) === deletedCount,
      pre: preState.patients_total,
      post: postState.patients_total,
      delta: preState.patients_total - postState.patients_total,
      expected_delta: deletedCount,
    });
    report.invariants = invariants;
    const allPass = invariants.every(i => i.pass);
    report.invariants_all_pass = allPass;

    // -------- COMMIT or ROLLBACK --------
    if (DRY_RUN) {
      console.log(`[${ts()}] DRY_RUN — ROLLBACK (no changes persisted)`);
      await c.query('ROLLBACK');
      report.phases.push({ name: 'rollback_dry_run', ok: true, ts: ts() });
    } else if (!allPass) {
      console.error(`[${ts()}] INVARIANTS FAILED — ROLLBACK`);
      await c.query('ROLLBACK');
      report.phases.push({ name: 'rollback_invariant_failure', ok: true, ts: ts() });
      report.ok = false;
    } else {
      console.log(`[${ts()}] COMMIT`);
      await c.query('COMMIT');
      report.phases.push({ name: 'commit', ok: true, ts: ts() });
    }

    report.update_stats = updateStats;
    report.deleted_patient_rows = deletedCount;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch {}
    report.fatal = String(e.message || e);
    report.ok = false;
  } finally {
    try { await c.end(); } catch {}
  }

  console.log('---DEDUP-REPORT---');
  console.log(JSON.stringify(report, null, 2));
  console.log('---END---');
  process.exit(report.ok ? 0 : 1);
})();
