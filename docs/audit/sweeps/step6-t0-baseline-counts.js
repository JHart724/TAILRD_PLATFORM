// Phase 1 sign-off T0 baseline - counts only, READ-ONLY, no decrypt, no PHI.
// Captures the parity invariants compared against the restored copy in the
// AUDIT-078 restore test: plain row counts for 6 tables + V2-envelope counts
// for the two audit_logs PHI columns (description = string col, newValues =
// json col, so kind-aware LIKE prefixes). Pure SELECT - writes nothing, so it
// does not perturb the counts it measures.
(async () => {
  const p = require('./src/lib/prisma').default;
  const num = (x) => (typeof x === 'bigint' ? Number(x) : x);
  const out = {};
  for (const t of ['patients', 'audit_logs', 'conditions', 'medications', 'recommendations', 'users']) {
    const r = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "${t}"`);
    out[t] = num(r[0].c);
  }
  const desc = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "audit_logs" WHERE "description" IS NOT NULL AND "description" LIKE 'enc:v2:%'`);
  const nv = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "audit_logs" WHERE "newValues" IS NOT NULL AND "newValues"::text LIKE '"enc:v2:%'`);
  out['audit_logs.description.v2'] = num(desc[0].c);
  out['audit_logs.newValues.v2'] = num(nv[0].c);
  console.log('---PHASE1_T0_BASELINE---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  await p.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.log('T0_FATAL', e && e.message); process.exit(2); });
