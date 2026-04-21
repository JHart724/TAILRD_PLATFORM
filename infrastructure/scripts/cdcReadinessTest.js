/**
 * Phase 6E — CDC readiness test.
 *
 * Creates a temporary logical replication slot, advances the WAL with a
 * `pg_logical_emit_message` call (no table writes), verifies slot state,
 * then drops the slot. Emits a structured JSON result to stdout.
 *
 * Design choice: we picked `pg_logical_emit_message` over the change
 * record's suggested `UPDATE modules SET updatedAt = NOW()` because the
 * TAILRD schema has no `modules` model (the "modules" are frontend views;
 * there's no backing table). Emitting a logical message still produces a
 * WAL record visible through the logical decoder — which is exactly what
 * DMS will consume for CDC — so the test remains end-to-end valid.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });

const SLOT = 'day6_readiness_test';

async function q(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return rows;
}

function ts() {
  return new Date().toISOString();
}

(async () => {
  const result = { ok: true, steps: [], errors: [] };

  function rec(step, data, extra = {}) {
    result.steps.push({ step, ts: ts(), ...extra, ...data });
  }

  try {
    // Step 0: baseline — existing slots BEFORE we create anything
    const slotsBefore = await q(`SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots`);
    rec('0_slots_before', { slots: slotsBefore, count: slotsBefore.length });

    // Step 1: create logical replication slot
    try {
      const createRes = await q(`SELECT slot_name, lsn::text FROM pg_create_logical_replication_slot('${SLOT}', 'pgoutput')`);
      rec('1_create_slot', { rows: createRes });
    } catch (e) {
      rec('1_create_slot', { error: String(e.message || e) });
      result.ok = false;
      result.errors.push(`create_slot: ${e.message || e}`);
      throw e;
    }

    // Step 2: inspect slot
    const slot = await q(`
      SELECT slot_name, plugin, slot_type, database, active,
             restart_lsn::text AS restart_lsn,
             confirmed_flush_lsn::text AS confirmed_flush_lsn
      FROM pg_replication_slots
      WHERE slot_name = '${SLOT}'
    `);
    rec('2_inspect_slot', { row: slot[0] });
    if (!slot[0]) {
      result.ok = false;
      result.errors.push('inspect_slot: slot not found after create');
    } else {
      const s = slot[0];
      if (s.plugin !== 'pgoutput') { result.ok = false; result.errors.push(`plugin expected pgoutput got ${s.plugin}`); }
      if (s.slot_type !== 'logical') { result.ok = false; result.errors.push(`slot_type expected logical got ${s.slot_type}`); }
      if (s.active !== false) { result.ok = false; result.errors.push(`active expected false got ${s.active}`); }
      if (!s.restart_lsn) { result.ok = false; result.errors.push('restart_lsn empty'); }
      if (!s.confirmed_flush_lsn) { result.ok = false; result.errors.push('confirmed_flush_lsn empty'); }
    }

    // Step 3: pre-test LSN
    const preLsn = (await q(`SELECT pg_current_wal_lsn()::text AS lsn`))[0].lsn;
    rec('3_pre_test_lsn', { lsn: preLsn });

    // Step 4: exercise slot — emit a logical decoder-visible WAL record
    //  (substitution from the change record's `UPDATE modules` suggestion;
    //  schema has no `modules` table. pg_logical_emit_message produces a
    //  WAL record consumable via logical decoding — same CDC path.)
    const emitLsn = (await q(
      `SELECT pg_logical_emit_message(true, 'day6_readiness', 'cdc readiness test ${Date.now()}')::text AS lsn`
    ))[0].lsn;
    rec('4_emit_message', { lsn: emitLsn, note: 'used pg_logical_emit_message (no modules table in schema)' });

    const postLsn = (await q(`SELECT pg_current_wal_lsn()::text AS lsn`))[0].lsn;
    rec('4b_post_test_lsn', { lsn: postLsn });

    // Compare LSNs using pg_wal_lsn_diff (positive means postLsn is ahead of preLsn)
    const diffRows = await q(`SELECT pg_wal_lsn_diff('${postLsn}'::pg_lsn, '${preLsn}'::pg_lsn)::text AS bytes`);
    const diffBytes = Number(diffRows[0].bytes);
    rec('4c_wal_advance', { pre_lsn: preLsn, post_lsn: postLsn, advance_bytes: diffBytes });
    if (!(diffBytes > 0)) {
      result.ok = false;
      result.errors.push(`WAL did not advance: pre=${preLsn} post=${postLsn} diff=${diffBytes}`);
    }

    // Step 5: re-inspect slot health
    const slot2 = await q(`
      SELECT slot_name, active,
             restart_lsn::text AS restart_lsn,
             confirmed_flush_lsn::text AS confirmed_flush_lsn
      FROM pg_replication_slots WHERE slot_name = '${SLOT}'
    `);
    rec('5_slot_post_activity', { row: slot2[0] });
    if (!slot2[0]) {
      result.ok = false;
      result.errors.push('slot disappeared after WAL activity');
    }

    // Step 6: drop slot
    // Cast ::text on the void return so Prisma can deserialize — same
    // pattern used with pg_stat_statements_reset() in verifyLogicalRepl.js
    try {
      await q(`SELECT pg_drop_replication_slot('${SLOT}')::text`);
      rec('6_drop_slot', { dropped: SLOT });
    } catch (e) {
      rec('6_drop_slot', { error: String(e.message || e) });
      result.ok = false;
      result.errors.push(`drop_slot: ${e.message || e}`);
    }

    // Step 6b: verify gone
    const goneCheck = await q(`SELECT COUNT(*)::int AS c FROM pg_replication_slots WHERE slot_name = '${SLOT}'`);
    rec('6b_slot_gone_count', { count: goneCheck[0].c });
    if (goneCheck[0].c !== 0) {
      result.ok = false;
      result.errors.push(`slot still present after drop: count=${goneCheck[0].c}`);
    }

    // Step 7: final orphan check
    const slotsAfter = await q(`SELECT slot_name, plugin, slot_type, active FROM pg_replication_slots`);
    rec('7_slots_after', { slots: slotsAfter, count: slotsAfter.length });

  } catch (e) {
    if (!result.errors.some((x) => x.startsWith('create_slot'))) {
      result.ok = false;
      result.errors.push(`fatal: ${String(e.message || e)}`);
    }
  } finally {
    // Best-effort cleanup in case the drop step above didn't run
    try {
      const still = await q(`SELECT COUNT(*)::int AS c FROM pg_replication_slots WHERE slot_name = '${SLOT}'`);
      if (still[0].c > 0) {
        await q(`SELECT pg_drop_replication_slot('${SLOT}')`);
        result.steps.push({ step: 'cleanup_fallback', ts: ts(), dropped: SLOT });
      }
    } catch (e) {
      result.steps.push({ step: 'cleanup_fallback', ts: ts(), error: String(e.message || e) });
    }
    try { await prisma.$disconnect(); } catch {}
  }

  console.log('---CDC-READINESS-RESULT---');
  console.log(JSON.stringify(result, null, 2));
  console.log('---END-CDC-READINESS-RESULT---');
  process.exit(result.ok ? 0 : 1);
})();
