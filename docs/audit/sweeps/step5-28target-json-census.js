// AUDIT-116 STEP 2 - 28-target JSON envelope census (READ-ONLY, no decrypt, no PHI).
// Quote-aware classification (mirrors step4-newvalues-census.js) across ALL 28 kind:'json'
// TARGETS from audit-016-pr3-v0v1-to-v2.ts. Counts only: an exact 6-way partition per column
// (sql_null / v2 / v1 / v0 / json_null-literal / real_plaintext) + total. jsonb_typeof of any
// real_plaintext rows (type NAMES only, never values). Resolves the AUDIT-116 MEDIUM->LOW
// downgrade question: are there any v0/v1 envelopes hidden behind the broken unquoted filter?
(async () => {
  const p = require('./src/lib/prisma').default;
  const TARGETS = [
    ['webhook_events', 'rawPayload'],
    ['risk_score_assessments', 'inputData'],
    ['risk_score_assessments', 'components'],
    ['intervention_tracking', 'findings'],
    ['intervention_tracking', 'complications'],
    ['alerts', 'triggerData'],
    ['phenotypes', 'evidence'],
    ['contraindication_assessments', 'reasons'],
    ['contraindication_assessments', 'alternatives'],
    ['contraindication_assessments', 'monitoring'],
    ['therapy_gaps', 'barriers'],
    ['therapy_gaps', 'recommendations'],
    ['encounters', 'diagnosisCodes'],
    ['cds_hooks_sessions', 'fhirContext'],
    ['cds_hooks_sessions', 'cards'],
    ['audit_logs', 'previousValues'],
    ['audit_logs', 'newValues'],
    ['audit_logs', 'metadata'],
    ['care_plans', 'goals'],
    ['care_plans', 'activities'],
    ['care_plans', 'careTeam'],
    ['drug_titrations', 'barriers'],
    ['drug_titrations', 'monitoringPlan'],
    ['device_eligibility', 'criteria'],
    ['device_eligibility', 'barriers'],
    ['device_eligibility', 'contraindications'],
    ['cross_referrals', 'triggerData'],
    ['cql_results', 'result'],
  ];
  const rows = [];
  for (const [tbl, col] of TARGETS) {
    const c = `"${col}"`;
    try {
      const r = await p.$queryRawUnsafe(`
        SELECT
          count(*) FILTER (WHERE ${c} IS NULL) AS sql_null,
          count(*) FILTER (WHERE ${c}::text LIKE '"enc:v2:%') AS v2,
          count(*) FILTER (WHERE ${c}::text LIKE '"enc:v1:%') AS v1,
          count(*) FILTER (WHERE ${c}::text LIKE '"enc:%' AND ${c}::text NOT LIKE '"enc:v1:%' AND ${c}::text NOT LIKE '"enc:v2:%') AS v0,
          count(*) FILTER (WHERE ${c} IS NOT NULL AND ${c}::text NOT LIKE '"enc:%' AND jsonb_typeof(${c}::jsonb) = 'null') AS json_null,
          count(*) FILTER (WHERE ${c} IS NOT NULL AND ${c}::text NOT LIKE '"enc:%' AND jsonb_typeof(${c}::jsonb) <> 'null') AS real_plaintext,
          count(*) AS total
        FROM "${tbl}"`);
      const o = {};
      for (const k in r[0]) o[k] = typeof r[0][k] === 'bigint' ? Number(r[0][k]) : r[0][k];
      let ptTypes = null;
      if (o.real_plaintext > 0) {
        const d = await p.$queryRawUnsafe(`
          SELECT jsonb_typeof(${c}::jsonb) AS t, count(*)::int AS n
          FROM "${tbl}"
          WHERE ${c} IS NOT NULL AND ${c}::text NOT LIKE '"enc:%' AND jsonb_typeof(${c}::jsonb) <> 'null'
          GROUP BY 1 ORDER BY 2 DESC`);
        ptTypes = d.map((x) => ({ t: x.t, n: typeof x.n === 'bigint' ? Number(x.n) : x.n }));
      }
      rows.push({ target: `${tbl}.${col}`, ...o, ptTypes });
    } catch (e) {
      rows.push({ target: `${tbl}.${col}`, error: (e && e.message) || String(e) });
    }
  }
  const totals = rows.reduce((a, r) => {
    for (const k of ['sql_null', 'v2', 'v1', 'v0', 'json_null', 'real_plaintext', 'total']) a[k] = (a[k] || 0) + (r[k] || 0);
    return a;
  }, {});
  const v0v1Targets = rows.filter((r) => (r.v0 || 0) + (r.v1 || 0) > 0).map((r) => r.target);
  console.log('---AUDIT_116_28TARGET_JSON_CENSUS---');
  console.log(JSON.stringify({ rows, totals, v0v1Targets, targetCount: rows.length }, null, 2));
  console.log('---END---');
  await p.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.log('CENSUS28_FATAL', e && e.message); process.exit(2); });
