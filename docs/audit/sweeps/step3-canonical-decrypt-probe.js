// AUDIT-113 STEP 3 - full canonical-context decrypt probe (READ-ONLY).
// Attempts canonical decrypt (contextFor('AuditLog', col), purpose 'phi-encryption')
// on EVERY v2 envelope in audit_logs.description (string) + audit_logs.newValues (json).
// Bit-identical to the production read path (imports the middleware's own contextFor
// + keyRotation.decryptAny). No DB writes; no plaintext logged (counts + error-name
// map + a capped sample of failing CUIDs only). Run via ECS RunTask command override:
//   node -r tsx/cjs -e "eval(Buffer.from('<base64>','base64').toString())"
(async () => {
  const p = require('./src/lib/prisma').default;
  const { decryptAny } = require('./src/services/keyRotation');
  const { contextFor } = require('./src/middleware/phiEncryption');
  const T = [{ c: 'description', k: 's' }, { c: 'newValues', k: 'j' }];
  const out = {};
  for (const t of T) {
    const sel = t.k === 'j' ? `"${t.c}"#>>'{}'` : `"${t.c}"`;
    const w = t.k === 'j' ? `"${t.c}"::text LIKE '"enc:v2:%'` : `"${t.c}" LIKE 'enc:v2:%'`;
    let cur = null, att = 0, ok = 0, bad = 0;
    const errs = {}, badIds = [];
    for (;;) {
      const cc = cur ? ` AND id > '${cur}'` : '';
      const rows = await p.$queryRawUnsafe(`SELECT id, ${sel} AS value FROM "audit_logs" WHERE ${w}${cc} ORDER BY id ASC LIMIT 500`);
      if (rows.length === 0) break;
      for (const r of rows) {
        att++;
        try { await decryptAny(r.value, contextFor('AuditLog', t.c)); ok++; }
        catch (e) { bad++; const n = (e && e.name) || 'Err'; errs[n] = (errs[n] || 0) + 1; if (badIds.length < 25) badIds.push(r.id); }
        cur = r.id;
      }
      if (rows.length < 500) break;
    }
    out['audit_logs.' + t.c] = { attempted: att, ok, fail: bad, errs, badIds };
  }
  console.log('---AUDIT_113_CANONICAL_DECRYPT_PROBE---');
  console.log(JSON.stringify(out, null, 2));
  console.log('---END---');
  await p.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.log('PROBE_FATAL', e && e.message); process.exit(2); });
