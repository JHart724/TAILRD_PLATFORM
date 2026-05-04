/**
 * Read-only data investigation on production RDS.
 * Produces counts by hospital, isActive/isMerged status, createdAt distribution,
 * pg_stat_user_tables history, clinical table sizes, information_schema scan.
 *
 * Exits 0 always. Wraps output in ---INVESTIGATION--- / ---END--- for log scrape.
 */
/* eslint-disable */
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

function normalize(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = typeof v === 'bigint' ? v.toString() : v;
    }
    return out;
  });
}

(async () => {
  const conn = process.env.PROBE_DATABASE_URL || process.env.DATABASE_URL;
  const client = new Client({
    ...parseDbUrl(conn),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 300000,
    query_timeout: 300000,
  });
  const out = { generatedAt: new Date().toISOString(), ok: true, checks: {}, errors: [] };

  try {
    await client.connect();

    // 1a. Total patient count
    const totalPatients = await client.query(`SELECT COUNT(*)::int AS n FROM patients`);
    out.checks.total_patients = totalPatients.rows[0].n;

    // 1b. isActive / isMerged split
    const statusSplit = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE "isActive" = true AND "isMerged" = false)::int AS active_unmerged,
        COUNT(*) FILTER (WHERE "isActive" = false)::int AS inactive,
        COUNT(*) FILTER (WHERE "isMerged" = true)::int AS merged
      FROM patients
    `);
    out.checks.patients_by_status = normalize(statusSplit.rows)[0];

    // 1c. Patient count by hospital
    const byHospital = await client.query(`
      SELECT
        h.id AS hospital_id,
        h.name AS hospital_name,
        COUNT(p.id)::int AS patient_count,
        COUNT(p.id) FILTER (WHERE p."isActive" = true)::int AS active_count
      FROM hospitals h
      LEFT JOIN patients p ON p."hospitalId" = h.id
      GROUP BY h.id, h.name
      ORDER BY patient_count DESC
    `);
    out.checks.patients_by_hospital = normalize(byHospital.rows);

    // 1d. Hospitals count
    const hospitalCount = await client.query(`SELECT COUNT(*)::int AS n FROM hospitals`);
    out.checks.total_hospitals = hospitalCount.rows[0].n;

    // 1e. Creation timeline (daily)
    const timeline = await client.query(`
      SELECT
        date_trunc('day', "createdAt")::date::text AS day,
        COUNT(*)::int AS patients_created
      FROM patients
      GROUP BY day
      ORDER BY day DESC
      LIMIT 60
    `);
    out.checks.patient_creation_timeline = normalize(timeline.rows);

    // 2a. pg_stat_user_tables history — covers the biggest clinical tables
    const pgStat = await client.query(`
      SELECT relname,
             n_tup_ins::bigint::text AS n_tup_ins,
             n_tup_upd::bigint::text AS n_tup_upd,
             n_tup_del::bigint::text AS n_tup_del,
             n_live_tup::bigint::text AS n_live_tup,
             n_dead_tup::bigint::text AS n_dead_tup,
             last_vacuum,
             last_analyze
      FROM pg_stat_user_tables
      WHERE relname IN ('patients','encounters','observations','conditions','medications',
                        'procedures','device_implants','allergy_intolerances',
                        'hospitals','users','alerts','orders')
      ORDER BY n_live_tup DESC NULLS LAST
    `);
    out.checks.pg_stat_user_tables = normalize(pgStat.rows);

    // 2b. information_schema for patient-related or archive tables
    const relatedTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name ILIKE '%patient%' OR table_name ILIKE '%archive%' OR table_name ILIKE '%backup%')
      ORDER BY table_name
    `);
    out.checks.patient_or_archive_tables = relatedTables.rows.map((r) => r.table_name);

    // 2c. All public tables (counts)
    const allTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    out.checks.all_public_tables = allTables.rows.map((r) => r.table_name);
    out.checks.all_public_tables_count = out.checks.all_public_tables.length;

    // 3. Raw counts for clinical tables (live_tup can lag stats)
    const clinicalCounts = {};
    for (const t of ['patients','encounters','observations','conditions','medications','procedures',
                     'device_implants','allergy_intolerances','hospitals','users','alerts','orders']) {
      try {
        const r = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        clinicalCounts[t] = r.rows[0].n;
      } catch (e) {
        clinicalCounts[t] = `ERROR: ${e.message}`;
      }
    }
    out.checks.clinical_table_counts = clinicalCounts;

    // 4. Audit log presence + scope (table may be named audit_logs)
    const auditInspect = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('audit_log', 'audit_logs')
    `);
    if (auditInspect.rows.length > 0) {
      const auditTable = auditInspect.rows[0].table_name;
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [auditTable]);
      out.checks.audit_table_name = auditTable;
      out.checks.audit_table_columns = cols.rows.map((r) => r.column_name);
      const auditCount = await client.query(`SELECT COUNT(*)::int AS n FROM "${auditTable}"`);
      out.checks.audit_table_total = auditCount.rows[0].n;
      // Try common 'action' field for patient-related actions
      if (cols.rows.some((r) => r.column_name === 'action')) {
        const patientActions = await client.query(
          `SELECT action, COUNT(*)::int AS n FROM "${auditTable}" WHERE action ILIKE '%patient%' GROUP BY action ORDER BY n DESC LIMIT 20`
        );
        out.checks.audit_patient_actions = normalize(patientActions.rows);
      }
    } else {
      out.checks.audit_table_present = false;
    }

    // 5. pg_stat_database for inserts/updates/deletes since reset
    const dbStat = await client.query(`
      SELECT datname,
             tup_returned::bigint::text AS tup_returned,
             tup_fetched::bigint::text AS tup_fetched,
             tup_inserted::bigint::text AS tup_inserted,
             tup_updated::bigint::text AS tup_updated,
             tup_deleted::bigint::text AS tup_deleted,
             stats_reset
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    out.checks.pg_stat_database = normalize(dbStat.rows)[0];

    // 6. Max fhirPatientId nulls + mrn source patterns
    const patientSrcHints = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE "fhirPatientId" IS NULL)::int AS fhir_null,
        COUNT(*) FILTER (WHERE "fhirPatientId" IS NOT NULL)::int AS fhir_present,
        COUNT(*) FILTER (WHERE mrn LIKE 'SYNTHEA%' OR mrn LIKE 'synthea%' OR fhir_patient_id_text_match(true))::int AS synthea_hint
      FROM patients
    `).catch(async () => {
      // Simpler fallback if custom func not present
      return await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE "fhirPatientId" IS NULL)::int AS fhir_null,
          COUNT(*) FILTER (WHERE "fhirPatientId" IS NOT NULL)::int AS fhir_present,
          COUNT(*) FILTER (WHERE mrn ILIKE '%synth%' OR "fhirPatientId" ILIKE '%synth%')::int AS synthea_hint
        FROM patients
      `);
    });
    out.checks.patient_source_hints = normalize(patientSrcHints.rows)[0];

    // 7. Sample recent patient rows (non-PHI identifiers only — id, hospitalId, createdAt)
    const sampleRecent = await client.query(`
      SELECT id, "hospitalId", "createdAt"::text, "isActive", "isMerged", "fhirPatientId"
      FROM patients
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);
    out.checks.recent_patient_ids_sample = sampleRecent.rows;
  } catch (e) {
    out.ok = false;
    out.errors.push(String(e.message || e));
    out.errorStack = e.stack;
  } finally {
    try { await client.end(); } catch {}
  }

  console.log('---INVESTIGATION---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(0);
})();
