/**
 * AUDIT-188 re-seed PHASE 2 - pre-reseed wipe + baseline count task.
 *
 * Extends the proven wipeMCDData.ts pattern to the FULL current patient-FK table set across ALL THREE
 * demo hospitals, so the operator-gated re-seed is a clean REPLACE (not a layer-on-top: seedFromSynthea
 * appends observations via createMany and the gap runner never deletes no-longer-firing gaps, so the 8
 * AUDIT-184 over-fires only clear when the underlying gap rows are wiped).
 *
 * SCOPE CORRECTION (PAUSE 2-PREP): the 2026-04 wipeMCDData.ts cleared 10 child tables + patient. The
 * authoritative schema grep (`@relation(fields: [patientId]`) finds 23 patient-FK models. WebhookEvent is
 * EXCLUDED (its patientId is optional -> the FK SetNulls on patient delete, never blocks, and it is
 * event-log data the seed does not create). The remaining 22 children all carry non-null patientId with
 * onDelete: Restrict (BpciEpisode + DrugInteractionAlert rely on Prisma's implicit-Restrict default), so
 * EVERY one must be cleared before `patient` or the patient delete FK-fails. Delegate accessor names are
 * verified against the generated client (note CQLResult -> `cQLResult`).
 *
 * SAFETY: count-only by DEFAULT. The destructive wipe runs ONLY with --execute. Hospital rows are PRESERVED.
 * Verifies the count-invariant (0 rows remaining across all tables/hospitals) after an --execute run; exit 2
 * if any remain. Chunked deletes (10k + sleep) to stay within Aurora CPU-credit headroom.
 *
 * Usage (run as an ECS one-off Fargate task - same network/secrets/role as tailrd-ingest, prod DATABASE_URL
 * from Secrets Manager; NOT from a laptop):
 *   npx tsx backend/scripts/wipePreReseed.ts                # BASELINE count-only (PHASE 2 baseline + PHASE 3 dry-run)
 *   npx tsx backend/scripts/wipePreReseed.ts --execute      # DESTRUCTIVE wipe (only after snapshot + execute-GO)
 */
import prisma from "../src/lib/prisma";

export const DEMO_HOSPITAL_IDS = [
  "demo-medical-city-dallas",
  "demo-commonspirit",
  "demo-mount-sinai",
];

// Patient-FK child tables (non-null patientId, onDelete: Restrict), Prisma delegate accessors, deleted
// BEFORE `patient`. None reference each other (all direct children of Patient), so intra-group order is
// free; `patient` MUST be last. WebhookEvent omitted (optional FK -> SetNull, non-blocking, non-seed data).
export const CHILD_TABLES = [
  // 10 from the proven wipeMCDData.ts
  "therapyGap", "alert", "order", "observation", "encounter",
  "medication", "condition", "procedure", "deviceImplant", "allergyIntolerance",
  // 12 added (current-schema patient-FK models the 2026-04 script missed)
  "bpciEpisode", "carePlan", "cQLResult", "contraindicationAssessment", "crossReferral",
  "deviceEligibility", "drugInteractionAlert", "drugTitration", "interventionTracking",
  "phenotype", "recommendation", "riskScoreAssessment",
  "trialMatch", // AUDIT-148 Slice 1: patient-FK (non-null patientId, onDelete: Restrict). clinical_trials has no patient FK (global catalog), so it is NOT wiped by a patient re-seed.
  "registryCase", // AUDIT-148 Slice 2: patient-FK (non-null patientId, onDelete: Restrict) - MUST be wiped before patient, same as trialMatch.
] as const;

export const WIPE_ORDER = [...CHILD_TABLES, "patient"] as const;

const CHUNK_SIZE = 10000;
const SLEEP_MS = 1500;

function delegate(model: string): any {
  return (prisma as any)[model];
}

async function countTable(model: string, hospitalId: string): Promise<number> {
  return delegate(model).count({ where: { hospitalId } });
}

async function countAllForHospital(hospitalId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of WIPE_ORDER) out[t] = await countTable(t, hospitalId);
  return out;
}

// Aggregate gap distribution (the verifiable invariant per finding 3: therapyGap stores gapType+module,
// NOT rule-id, so over-fires are verified at module/gapType granularity, never per-rule).
async function gapDistribution(hospitalId: string): Promise<Array<{ module: string; gapType: string; count: number }>> {
  const rows = await prisma.therapyGap.groupBy({
    by: ["module", "gapType"],
    where: { hospitalId, resolvedAt: null },
    _count: { id: true },
  });
  return rows
    .map((r: any) => ({ module: r.module, gapType: r.gapType, count: r._count.id }))
    .sort((a, b) => (a.module + a.gapType).localeCompare(b.module + b.gapType));
}

async function chunkedDelete(model: string, hospitalId: string): Promise<number> {
  let total = 0;
  for (;;) {
    const rows = await delegate(model).findMany({ where: { hospitalId }, select: { id: true }, take: CHUNK_SIZE });
    if (rows.length === 0) break;
    const res = await delegate(model).deleteMany({ where: { id: { in: rows.map((r: any) => r.id) } } });
    total += res.count;
    await new Promise((r) => setTimeout(r, SLEEP_MS));
  }
  return total;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  console.log("wipePreReseed");
  console.log("=============");
  console.log(`mode:      ${execute ? "EXECUTE (DESTRUCTIVE WIPE)" : "COUNT-ONLY (baseline / dry-run, no mutation)"}`);
  console.log(`hospitals: ${DEMO_HOSPITAL_IDS.join(", ")}`);
  console.log(`tables:    ${WIPE_ORDER.length} (${CHILD_TABLES.length} children + patient)\n`);

  for (const id of DEMO_HOSPITAL_IDS) {
    const h = await prisma.hospital.findUnique({ where: { id } });
    if (!h) {
      console.error(`Hospital not found: ${id} - aborting (no partial run).`);
      process.exit(1);
    }
  }

  // BASELINE (always emitted - this IS the count-task / dry-run output).
  let grandTotal = 0;
  for (const id of DEMO_HOSPITAL_IDS) {
    const counts = await countAllForHospital(id);
    const dist = await gapDistribution(id);
    const subtotal = Object.values(counts).reduce((s, n) => s + n, 0);
    grandTotal += subtotal;
    console.log(`BASELINE ${id} (rowsTotal=${subtotal}):`);
    console.log("  counts:", JSON.stringify(counts));
    console.log("  gapDistribution(open):", JSON.stringify(dist));
  }
  console.log(`\nBASELINE grand total rows (3 hospitals x ${WIPE_ORDER.length} tables): ${grandTotal}`);

  if (!execute) {
    console.log("\nCOUNT-ONLY: nothing deleted. Re-run with --execute ONLY after snapshot verified + execute-GO.");
    await prisma.$disconnect();
    return;
  }

  // DESTRUCTIVE PATH (only --execute). Children-first, then patient; chunked per hospital.
  console.log("\n=== EXECUTE: wiping children-first then patient (chunked, hospital rows preserved) ===");
  for (const id of DEMO_HOSPITAL_IDS) {
    console.log(`\n--- ${id} ---`);
    for (const model of WIPE_ORDER) {
      const n = await chunkedDelete(model, id);
      console.log(`  ${model.padEnd(26)} deleted ${n}`);
    }
  }

  // COUNT-INVARIANT verification (exit code 0 is NOT verification - the counts are).
  console.log("\n=== verify: count-invariant (expect 0 across all tables / all hospitals) ===");
  let remaining = 0;
  for (const id of DEMO_HOSPITAL_IDS) {
    const after = await countAllForHospital(id);
    const rem = Object.values(after).reduce((s, n) => s + n, 0);
    remaining += rem;
    console.log(`AFTER ${id}: remaining=${rem}${rem > 0 ? " " + JSON.stringify(after) : ""}`);
  }
  if (remaining > 0) {
    console.error(`\nWIPE INCOMPLETE: ${remaining} rows remain - NOT a clean slate. Investigate before seeding.`);
    process.exit(2);
  }
  console.log("\nWIPE VERIFIED CLEAN: 0 rows remaining, 3 hospital rows preserved. Ready for re-seed.");
  await prisma.$disconnect();
}

// require.main guard so tests can import the exported constants without executing the task.
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
