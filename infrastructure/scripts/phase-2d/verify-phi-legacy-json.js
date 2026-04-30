/**
 * Phase 96.5f-diag-1: verify PHI JSON fields for legacy plaintext.
 *
 * Companion to verify-phi-legacy.js (which only checks string columns).
 *
 * JSON encryption format (from backend/src/middleware/phiEncryption.ts):
 *   - encryptJsonField serializes the entire JSON value with JSON.stringify,
 *     then encrypts the string. Result: column stores a JSON STRING value
 *     "enc:iv:tag:ciphertext" (with surrounding quotes in JSON serialization).
 *   - decryptJsonField checks `typeof === 'string' && startsWith('enc:')`.
 *     If field is null, an object/array, or a string without enc: prefix,
 *     it's PASSED THROUGH (not throwing). Different from string-column path
 *     which now throws on legacy.
 *
 * Implication: legacy JSON values (objects/arrays from pre-encryption-rollout)
 * do NOT cause throw-on-legacy in the new code. But finding them is still
 * useful evidence: it tells us the backfill needs to extend to JSON, AND it
 * rules out / confirms whether legacy JSON is the cause of the :138 smoke
 * failure.
 *
 * Per Phase 2 PHI field map (PHI_JSON_FIELDS):
 *   WebhookEvent.rawPayload
 *   RiskScoreAssessment.{inputData, components, inputs}
 *   InterventionTracking.{findings, complications, outcomes}
 *   Alert.triggerData
 *   Phenotype.evidence
 *   ContraindicationAssessment.{reasons, alternatives, monitoring}
 *   TherapyGap.{barriers, recommendations}
 *   Encounter.diagnosisCodes
 *   CdsHooksSession.{fhirContext, cards}
 *   AuditLog.{previousValues, newValues, metadata}
 *   CarePlan.{goals, activities, careTeam}
 *   DrugTitration.{barriers, monitoringPlan}
 *   DeviceEligibility.{criteria, barriers, contraindications}
 *   CrossReferral.triggerData
 *   CQLResult.result
 *
 * Postgres detection:
 *   For each (table, column) where column is jsonb: a value is "encrypted" if
 *   the JSON serialization is a string starting with "enc:" — i.e.
 *   column::text LIKE '"enc:%' (note the leading quote — JSON strings are
 *   double-quoted in their text representation).
 *   Anything else NON-NULL is "legacy" (object, array, or unencrypted string).
 *
 *   We exclude empty objects {} and empty arrays [] as not-PHI-relevant.
 *
 * Output: JSON envelope on stdout, exit 0 if cleanForFlagFlip=true.
 */
/* eslint-disable */

const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.AWS_REGION || 'us-east-1';
const sm = new SecretsManagerClient({ region: REGION });

async function getSecret(name) {
  const r = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  return r.SecretString;
}

const TARGETS = [
  { table: 'webhook_events',                column: 'rawPayload' },
  { table: 'risk_score_assessments',        column: 'inputData' },
  { table: 'risk_score_assessments',        column: 'components' },
  { table: 'risk_score_assessments',        column: 'inputs' },
  { table: 'intervention_tracking',         column: 'findings' },
  { table: 'intervention_tracking',         column: 'complications' },
  { table: 'intervention_tracking',         column: 'outcomes' },
  { table: 'alerts',                        column: 'triggerData' },
  { table: 'phenotypes',                    column: 'evidence' },
  { table: 'contraindication_assessments',  column: 'reasons' },
  { table: 'contraindication_assessments',  column: 'alternatives' },
  { table: 'contraindication_assessments',  column: 'monitoring' },
  { table: 'therapy_gaps',                  column: 'barriers' },
  { table: 'therapy_gaps',                  column: 'recommendations' },
  { table: 'encounters',                    column: 'diagnosisCodes' },
  { table: 'cds_hooks_sessions',            column: 'fhirContext' },
  { table: 'cds_hooks_sessions',            column: 'cards' },
  { table: 'audit_logs',                    column: 'previousValues' },
  { table: 'audit_logs',                    column: 'newValues' },
  { table: 'audit_logs',                    column: 'metadata' },
  { table: 'care_plans',                    column: 'goals' },
  { table: 'care_plans',                    column: 'activities' },
  { table: 'care_plans',                    column: 'careTeam' },
  { table: 'drug_titrations',               column: 'barriers' },
  { table: 'drug_titrations',               column: 'monitoringPlan' },
  { table: 'device_eligibility',            column: 'criteria' },
  { table: 'device_eligibility',            column: 'barriers' },
  { table: 'device_eligibility',            column: 'contraindications' },
  { table: 'cross_referrals',               column: 'triggerData' },
  { table: 'cql_results',                   column: 'result' },
];

(async () => {
  const url = await getSecret('tailrd-production/app/database-url');
  const u = new URL(url);
  const client = new Client({
    host: u.hostname,
    port: 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '').split('?')[0] || 'tailrd',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.error(`Connected to ${u.hostname}`);

  let totalChecks = 0;
  const findings = [];

  for (const { table, column } of TARGETS) {
    // Verify table + column exist
    const colCheck = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, column]
    );
    if (colCheck.rows.length === 0) {
      console.error(`SKIP ${table}.${column} (column not found)`);
      continue;
    }
    const dataType = colCheck.rows[0].data_type;
    if (!['json', 'jsonb'].includes(dataType)) {
      console.error(`SKIP ${table}.${column} (data_type=${dataType}, not json/jsonb)`);
      continue;
    }

    totalChecks++;

    // Total non-null rows (denominator)
    const totalSql = `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "${column}" IS NOT NULL`;
    const total = (await client.query(totalSql)).rows[0].c;

    // Encrypted rows: JSON value is a string starting with enc: (text rep starts with "enc: with leading quote)
    const encSql = `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}"::text LIKE '"enc:%'`;
    const encrypted = (await client.query(encSql)).rows[0].c;

    // Legacy: non-null AND not enc-prefixed AND not empty {}/[] AND not 'null'
    const legacySql = `
      SELECT COUNT(*)::int AS c
      FROM "${table}"
      WHERE "${column}" IS NOT NULL
        AND "${column}"::text NOT LIKE '"enc:%'
        AND "${column}"::text NOT IN ('{}', '[]', 'null', '""')
    `;
    const legacy = (await client.query(legacySql)).rows[0].c;

    // Sample legacy ids (max 5) for surface area
    let sampleIds = [];
    if (legacy > 0) {
      const sampleSql = `
        SELECT id FROM "${table}"
        WHERE "${column}" IS NOT NULL
          AND "${column}"::text NOT LIKE '"enc:%'
          AND "${column}"::text NOT IN ('{}', '[]', 'null', '""')
        LIMIT 5
      `;
      sampleIds = (await client.query(sampleSql)).rows.map((r) => r.id);
    }

    const finding = { table, column, total, encrypted, legacy, sampleIds };
    if (legacy > 0) {
      findings.push(finding);
      console.error(`LEGACY ${table}.${column}: total=${total} encrypted=${encrypted} legacy=${legacy}`);
    } else {
      console.error(`CLEAN  ${table}.${column}: total=${total} encrypted=${encrypted}`);
    }
  }

  await client.end();

  console.log('---PHI_LEGACY_JSON_VERIFICATION---');
  console.log(JSON.stringify({
    totalChecks,
    findings,
    cleanForFlagFlip: findings.length === 0,
  }, null, 2));
  console.log('---END---');

  process.exit(findings.length > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL', err);
  console.log('---PHI_LEGACY_JSON_VERIFICATION---');
  console.log(JSON.stringify({ fatalError: err.message }, null, 2));
  console.log('---END---');
  process.exit(2);
});
