// AUDIT STEP 4 - census of audit_logs.newValues envelope versions (READ-ONLY, no decrypt, no PHI).
// Counts only: version split (v0/v1/v2/plaintext-json/sql-null) + jsonb_typeof of the non-enc rows.
(async () => {
  const p = require('./src/lib/prisma').default;
  const split = await p.$queryRawUnsafe(`
    SELECT
      count(*) FILTER (WHERE "newValues" IS NULL) AS sql_null,
      count(*) FILTER (WHERE "newValues"::text LIKE '"enc:v2:%') AS v2,
      count(*) FILTER (WHERE "newValues"::text LIKE '"enc:v1:%') AS v1,
      count(*) FILTER (WHERE "newValues"::text LIKE '"enc:%' AND "newValues"::text NOT LIKE '"enc:v1:%' AND "newValues"::text NOT LIKE '"enc:v2:%') AS v0,
      count(*) FILTER (WHERE "newValues" IS NOT NULL AND "newValues"::text NOT LIKE '"enc:%') AS plaintext_or_other,
      count(*) AS total
    FROM "audit_logs"`);
  const typeofDist = await p.$queryRawUnsafe(`
    SELECT jsonb_typeof("newValues") AS t, count(*)::int AS n
    FROM "audit_logs"
    WHERE "newValues" IS NOT NULL AND "newValues"::text NOT LIKE '"enc:%'
    GROUP BY 1 ORDER BY 2 DESC`);
  const norm = (o) => { const r = {}; for (const k in o) r[k] = typeof o[k] === 'bigint' ? Number(o[k]) : o[k]; return r; };
  console.log('---AUDIT_NEWVALUES_CENSUS---');
  console.log(JSON.stringify({ split: norm(split[0]), nonEncJsonbTypeof: typeofDist.map(norm) }, null, 2));
  console.log('---END---');
  await p.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.log('CENSUS_FATAL', e && e.message); process.exit(2); });
