/**
 * Day 7 Phase 7F — Wave 2 data integrity pre-flight.
 *
 * Read-only checks against the production RDS source before Wave 2 DMS
 * full-load starts. Catches data that would violate Aurora's composite
 * uniqueness constraints (hospitalId + fhirPatientId, hospitalId +
 * fhirEncounterId) and surfaces source-volume stats for sizing.
 *
 * Runs via ECS one-shot with DATABASE_URL or PROBE_DATABASE_URL pointing
 * at production RDS.
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
    statement_timeout: 60000,
    query_timeout: 60000,
  });
  const out = { ok: true, checks: {}, errors: [] };
  try {
    await client.connect();

    // 1. Duplicate check — patients on (hospitalId, fhirPatientId)
    const patientDupes = await client.query(`
      SELECT "hospitalId", "fhirPatientId", COUNT(*)::int AS dupe_count
      FROM "patients"
      WHERE "fhirPatientId" IS NOT NULL
      GROUP BY "hospitalId", "fhirPatientId"
      HAVING COUNT(*) > 1
      ORDER BY dupe_count DESC
      LIMIT 50
    `);
    out.checks.patients_duplicates = {
      count: patientDupes.rows.length,
      rows: normalize(patientDupes.rows),
      pass: patientDupes.rows.length === 0,
    };

    // 2. Duplicate check — encounters on (hospitalId, fhirEncounterId)
    const encounterDupes = await client.query(`
      SELECT "hospitalId", "fhirEncounterId", COUNT(*)::int AS dupe_count
      FROM "encounters"
      WHERE "fhirEncounterId" IS NOT NULL
      GROUP BY "hospitalId", "fhirEncounterId"
      HAVING COUNT(*) > 1
      ORDER BY dupe_count DESC
      LIMIT 50
    `);
    out.checks.encounters_duplicates = {
      count: encounterDupes.rows.length,
      rows: normalize(encounterDupes.rows),
      pass: encounterDupes.rows.length === 0,
    };

    // 3. Row counts — also split by fhirPatientId/fhirEncounterId nullness
    const patientCount = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "fhirPatientId" IS NOT NULL)::int AS with_fhir_id,
        COUNT(*) FILTER (WHERE "fhirPatientId" IS NULL)::int AS without_fhir_id
      FROM "patients"
    `);
    out.checks.patients_counts = normalize(patientCount.rows)[0];

    const encounterCount = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "fhirEncounterId" IS NOT NULL)::int AS with_fhir_id,
        COUNT(*) FILTER (WHERE "fhirEncounterId" IS NULL)::int AS without_fhir_id
      FROM "encounters"
    `);
    out.checks.encounters_counts = normalize(encounterCount.rows)[0];

    // 4. Largest patients by encounter count
    const topPatients = await client.query(`
      SELECT "patientId", COUNT(*)::int AS encounter_count
      FROM "encounters"
      GROUP BY "patientId"
      ORDER BY encounter_count DESC
      LIMIT 10
    `);
    out.checks.top_patients_by_encounter_count = normalize(topPatients.rows);

    // 5. Encounter-per-patient distribution
    const distribution = await client.query(`
      WITH per_patient AS (
        SELECT "patientId", COUNT(*)::int AS c FROM "encounters" GROUP BY "patientId"
      )
      SELECT
        COUNT(*)::int AS patients_with_encounters,
        MIN(c)::int AS min_encounters,
        PERCENTILE_DISC(0.5)  WITHIN GROUP (ORDER BY c)::int AS p50,
        PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY c)::int AS p95,
        PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY c)::int AS p99,
        MAX(c)::int AS max_encounters,
        ROUND(AVG(c)::numeric, 2)::text AS mean
      FROM per_patient
    `);
    out.checks.encounters_per_patient_distribution = normalize(distribution.rows)[0];

    // 6. Patient rows split by hospital (helps size DMS sub-tasks)
    const byHospital = await client.query(`
      SELECT "hospitalId", COUNT(*)::int AS patient_count
      FROM "patients"
      GROUP BY "hospitalId"
      ORDER BY patient_count DESC
      LIMIT 20
    `);
    out.checks.patients_by_hospital = normalize(byHospital.rows);

    // Overall pass/fail
    if (!out.checks.patients_duplicates.pass || !out.checks.encounters_duplicates.pass) {
      out.ok = false;
      out.errors.push('Duplicates detected — see checks for details');
    }
  } catch (e) {
    out.ok = false;
    out.errors.push(String(e.message || e));
  } finally {
    try { await client.end(); } catch {}
  }

  console.log('---PREFLIGHT---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  process.exit(out.ok ? 0 : 1);
})();
