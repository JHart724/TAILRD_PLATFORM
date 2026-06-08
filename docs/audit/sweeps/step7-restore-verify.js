// AUDIT-078 Phase 1 sign-off restore-test verification - READ-ONLY against the
// RESTORED scratch copy (DATABASE_URL pointed at the scratch writer via a per-run
// env override). Pure SELECT + in-memory decrypt; writes nothing.
//   (a) parity row counts (compared against the T0 baseline);
//   (b) full canonical-decrypt spotcheck (D3(d)) over EVERY V2 envelope of the two
//       audit_logs PHI columns - PHI provably recoverable from a restored backup.
// Emits CONNECT_TS at first successful query (RTO stop marker). Node Date is the
// ECS-Fargate runtime clock (this is not the workflow sandbox).
(async () => {
  const p = require('./src/lib/prisma').default;
  const { decryptAny } = require('./src/services/keyRotation');
  const { contextFor } = require('./src/middleware/phiEncryption');
  const num = (x) => (typeof x === 'bigint' ? Number(x) : x);
  const counts = {};
  let connected = false;
  for (const t of ['patients', 'audit_logs', 'conditions', 'medications', 'recommendations', 'users']) {
    const r = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "${t}"`);
    if (!connected) { console.log('CONNECT_TS', new Date().toISOString()); connected = true; }
    counts[t] = num(r[0].c);
  }
  const dv2 = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "audit_logs" WHERE "description" IS NOT NULL AND "description" LIKE 'enc:v2:%'`);
  const nv2 = await p.$queryRawUnsafe(`SELECT count(*)::bigint AS c FROM "audit_logs" WHERE "newValues" IS NOT NULL AND "newValues"::text LIKE '"enc:v2:%'`);
  counts['audit_logs.description.v2'] = num(dv2[0].c);
  counts['audit_logs.newValues.v2'] = num(nv2[0].c);

  const T = [{ c: 'description', k: 's' }, { c: 'newValues', k: 'j' }];
  const decrypt = {};
  for (const t of T) {
    const sel = t.k === 'j' ? `"${t.c}"#>>'{}'` : `"${t.c}"`;
    const w = t.k === 'j' ? `"${t.c}"::text LIKE '"enc:v2:%'` : `"${t.c}" LIKE 'enc:v2:%'`;
    let cur = null, att = 0, ok = 0, bad = 0; const errs = {};
    for (;;) {
      const cc = cur ? ` AND id > '${cur}'` : '';
      const rows = await p.$queryRawUnsafe(`SELECT id, ${sel} AS value FROM "audit_logs" WHERE ${w}${cc} ORDER BY id ASC LIMIT 500`);
      if (rows.length === 0) break;
      for (const r of rows) { att++; try { await decryptAny(r.value, contextFor('AuditLog', t.c)); ok++; } catch (e) { bad++; const n = (e && e.name) || 'Err'; errs[n] = (errs[n] || 0) + 1; } cur = r.id; }
      if (rows.length < 500) break;
    }
    decrypt['audit_logs.' + t.c] = { attempted: att, ok, fail: bad, errs };
  }
  console.log('---PHASE1_RESTORE_VERIFY---');
  console.log(JSON.stringify({ counts, decrypt }, null, 2));
  console.log('---END---');
  await p.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.log('VERIFY_FATAL', e && e.message); process.exit(2); });
