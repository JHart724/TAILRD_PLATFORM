/**
 * AUDIT-215: classify the synthetic-data tenants so BAA_GUARD_MODE=strict permits them.
 *
 * Sets `Hospital.isSyntheticData = true` on the SIX synthetic/demo tenants. isSyntheticData is a
 * directly-writable classification (NOT the `baaExecuted` derived cache), so this does NOT violate
 * the do-not-write-directly contract on baaExecuted, and it keeps baaExecuted honestly false for
 * synthetic data instead of faking a real BAA. The BAA guard (prismaBaaGuard.ts) permits PHI flow
 * when isSyntheticData === true OR baaExecuted === true.
 *
 * DRIFT-51: the target set is an EXPLICIT LITERAL LIST of hospitalIds, never a heuristic. Two tenants
 * (`demo-synthea-proof`, `demo-synthea-threaded`) hold exactly 25,571 patients each, so any
 * largest-by-count selection is ambiguous and unsafe.
 *
 * GATED (production data mutation): dry-run by default. `--execute` additionally requires
 * `AUDIT_215_EXECUTE_CONFIRMED=yes` in the environment and an operator-taken Aurora snapshot first.
 * Idempotent (setting true on an already-true row is a no-op effect). Per-tenant audit event on write.
 *
 * SEQUENCE (operator runbook): run this (gated, snapshot + execute-GO) FIRST and verify all six read
 * isSyntheticData=true, THEN flip BAA_GUARD_MODE=strict in the task-def - else strict denies the demos
 * on deploy. The isSyntheticData column ships with migration 20260809000000_audit_215_hospital_is_synthetic_data,
 * so this script's read/write is only meaningful once that migration has deployed.
 *
 * DUA-day: when a real DUA signs for a tenant, flip its isSyntheticData=false AND record the real BAA
 * via coveredEntityService.upsertCoveredEntityBaaExecution, so strict then requires a real executed BAA.
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-215-classify-synthetic-tenants.ts                 # dry-run
 *   AUDIT_215_EXECUTE_CONFIRMED=yes npx tsx .../audit-215-classify-synthetic-tenants.ts --execute
 */

// DRIFT-51: literal hospitalIds. Verified live 2026-08-09 (all six present, all baaExecuted=false).
const SYNTHETIC_TENANT_IDS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'tailrd-platform', name: 'TAILRD Platform (SUPER_ADMIN home, 0 patients)' },
  { id: 'hosp-001', name: 'TAILRD Demo Hospital' },
  { id: 'hosp-002', name: 'TAILRD Demo Hospital 2' },
  { id: 'demo-medical-city-dallas', name: 'Medical City Dallas (demo)' },
  { id: 'demo-synthea-proof', name: 'Synthea Proof (NYC 2026) - pre-threading baseline' },
  { id: 'demo-synthea-threaded', name: 'Synthea Proof (NYC 2026) - active demo' },
];

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');

  console.log(`AUDIT-215 synthetic-tenant classification - ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`Target: ${SYNTHETIC_TENANT_IDS.length} literal tenant ids (DRIFT-51)\n`);

  // Confirmation gate BEFORE any DB/env access, so `--execute` without confirmation refuses cleanly.
  if (execute && process.env.AUDIT_215_EXECUTE_CONFIRMED !== 'yes') {
    console.error('AUDIT-215 --execute requires AUDIT_215_EXECUTE_CONFIRMED=yes in the environment.');
    console.error('Refusing to mutate. Take an Aurora snapshot first; this is a gated production data change.');
    process.exit(1);
  }
  if (execute) {
    console.error('WARNING: --execute sets Hospital.isSyntheticData=true on the six synthetic tenants.');
    console.error('Confirm an Aurora snapshot exists before proceeding. The change is idempotent and');
    console.error('reversible (set isSyntheticData=false to undo). baaExecuted is NOT touched.\n');
  }

  // Import the singleton + audit logger only after the gate (dynamic import so the refusal path needs no env).
  const prisma = (await import('../../src/lib/prisma')).default;
  const { auditLogger } = await import('../../src/middleware/auditLogger');
  const db = prisma as unknown as {
    hospital: {
      findUnique: (a: unknown) => Promise<{ id: string; isSyntheticData: boolean; baaExecuted: boolean } | null>;
      update: (a: unknown) => Promise<unknown>;
    };
    $disconnect: () => Promise<void>;
  };

  let flipped = 0;
  let alreadyTrue = 0;
  let missing = 0;

  for (const t of SYNTHETIC_TENANT_IDS) {
    const before = await db.hospital.findUnique({
      where: { id: t.id },
      select: { id: true, isSyntheticData: true, baaExecuted: true },
    });

    if (!before) {
      console.log(`  MISSING   ${t.id} (${t.name}) - no Hospital row; skipped`);
      missing++;
      continue;
    }
    if (before.isSyntheticData === true) {
      console.log(`  ALREADY   ${t.id} isSyntheticData=true (no change)`);
      alreadyTrue++;
      continue;
    }

    console.log(
      `  ${execute ? 'SET      ' : 'WOULD SET'} ${t.id} isSyntheticData false -> true (baaExecuted stays ${before.baaExecuted})`,
    );

    if (execute) {
      await db.hospital.update({ where: { id: t.id }, data: { isSyntheticData: true } });
      auditLogger.info('audit_event', {
        timestamp: new Date().toISOString(),
        userId: 'system:audit-215-classify',
        userEmail: 'system@tailrd-heart.com',
        userRole: 'SYSTEM',
        hospitalId: t.id,
        action: 'HOSPITAL_SYNTHETIC_DATA_CLASSIFIED',
        resourceType: 'Hospital',
        resourceId: t.id,
        ipAddress: 'cli',
        description:
          `AUDIT-215: Hospital.isSyntheticData set true (synthetic/demo tenant, no real BAA; permits ` +
          `PHI flow under BAA_GUARD_MODE=strict). baaExecuted unchanged (${before.baaExecuted}).`,
      });
      flipped++;
    }
  }

  if (execute) {
    console.log('\nPost-state verification:');
    let allPresentTrue = true;
    for (const t of SYNTHETIC_TENANT_IDS) {
      const after = await db.hospital.findUnique({ where: { id: t.id }, select: { id: true, isSyntheticData: true, baaExecuted: true } });
      if (after && after.isSyntheticData !== true) allPresentTrue = false;
      console.log(`  ${after ? (after.isSyntheticData ? 'OK   ' : 'FAIL ') : 'MISSING'} ${t.id}`);
    }
    console.log(`\nAUDIT-215 classification ${allPresentTrue ? 'COMPLETE' : 'INCOMPLETE - investigate'}: flipped=${flipped}, alreadyTrue=${alreadyTrue}, missing=${missing}`);
    await db.$disconnect();
    if (!allPresentTrue) process.exit(1);
  } else {
    const wouldFlip = SYNTHETIC_TENANT_IDS.length - alreadyTrue - missing;
    console.log(`\nDRY-RUN summary: wouldFlip=${wouldFlip}, alreadyTrue=${alreadyTrue}, missing=${missing}`);
    console.log('Re-run with --execute AND AUDIT_215_EXECUTE_CONFIRMED=yes to apply (snapshot first).');
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error('AUDIT-215 script error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
