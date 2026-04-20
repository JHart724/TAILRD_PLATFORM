/**
 * One-off: wipe all clinical data for demo-medical-city-dallas (MCD).
 *
 * Context: overnight 2026-04-16 Synthea ingestion OOM'd mid-run and left MCD
 * with ~14k patients but half-populated encounters/observations (Phase 1
 * investigation confirmed). The fhir*Id unique constraints were ALSO global
 * rather than per-tenant, so re-running ingestion was skipping encounters and
 * observations as "duplicates" when they were intra-tenant first-time inserts.
 *
 * Schema fix has shipped (migration 20260419170743). This script gives MCD a
 * clean slate so Phase 1's batched-ingestion throughput can be validated on a
 * true empty-tenant write path (not upserts / skips).
 *
 * Ordering matters: children before parents to satisfy FK Restrict constraints.
 * Hospital row itself is NOT deleted — ingestion re-uses it.
 *
 * Usage:
 *   npx tsx backend/scripts/wipeMCDData.ts
 *
 * Run as an ECS one-off task (same network, secrets, and role as tailrd-ingest)
 * so the script reaches prod RDS via DATABASE_URL from Secrets Manager.
 */
import prisma from "../src/lib/prisma";

const HOSPITAL_ID = process.env.WIPE_HOSPITAL_ID || "demo-medical-city-dallas";

async function countAll(where: { hospitalId: string }) {
  const [
    therapyGaps, observations, encounters, medications, conditions,
    procedures, devices, allergies, alerts, orders, patients,
  ] = await Promise.all([
    prisma.therapyGap.count({ where }),
    prisma.observation.count({ where }),
    prisma.encounter.count({ where }),
    prisma.medication.count({ where }),
    prisma.condition.count({ where }),
    prisma.procedure.count({ where }),
    prisma.deviceImplant.count({ where }),
    prisma.allergyIntolerance.count({ where }),
    prisma.alert.count({ where }),
    prisma.order.count({ where }),
    prisma.patient.count({ where }),
  ]);
  return { therapyGaps, observations, encounters, medications, conditions, procedures, devices, allergies, alerts, orders, patients };
}

async function main() {
  const where = { hospitalId: HOSPITAL_ID };

  const hospital = await prisma.hospital.findUnique({ where: { id: HOSPITAL_ID } });
  if (!hospital) {
    console.error(`Hospital not found: ${HOSPITAL_ID}`);
    process.exit(1);
  }
  console.log(`Hospital: ${hospital.name} (${HOSPITAL_ID})`);

  console.log("Counting rows before wipe...");
  const before = await countAll(where);
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  const totalRows = Object.values(before).reduce((s, n) => s + n, 0);
  if (totalRows === 0) {
    console.log("No rows to delete. Exiting.");
    return;
  }

  console.log(`\nDeleting ${totalRows} rows across 11 tables (chunked)...`);

  // Chunked delete: original single-deleteMany approach exhausted RDS t3.medium
  // CPU burst credits mid-run and hung on 353k encounters. Each chunk is a
  // small transaction; sleep between chunks so baseline CPU doesn't stay at
  // 100%. See docs/SCALE_REQUIREMENTS.md Phase 2 for the t4g migration plan.
  const CHUNK_SIZE = 10000;
  const SLEEP_MS = 1500;
  const results: Record<string, number> = {};

  async function chunkedDelete(
    name: string,
    deleteChunk: (ids: string[]) => Promise<{ count: number }>,
    findChunk: () => Promise<Array<{ id: string }>>,
  ): Promise<number> {
    const start = Date.now();
    let total = 0;
    for (;;) {
      const rows = await findChunk();
      if (rows.length === 0) break;
      const res = await deleteChunk(rows.map((r) => r.id));
      total += res.count;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ${name}: chunk ${res.count} done  total=${total}  ${elapsed}s`);
      await new Promise((r) => setTimeout(r, SLEEP_MS));
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  deleted ${String(total).padStart(8)} ${name}s (${elapsed}s total)`);
    return total;
  }

  const stages: Array<[string, () => Promise<number>]> = [
    ["therapyGap", async () => (await prisma.therapyGap.deleteMany({ where })).count],
    ["alert", async () => (await prisma.alert.deleteMany({ where })).count],
    ["order", async () => (await prisma.order.deleteMany({ where })).count],
    ["observation", () => chunkedDelete(
      "observation",
      (ids) => prisma.observation.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.observation.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["encounter", () => chunkedDelete(
      "encounter",
      (ids) => prisma.encounter.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.encounter.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["medication", () => chunkedDelete(
      "medication",
      (ids) => prisma.medication.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.medication.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["condition", () => chunkedDelete(
      "condition",
      (ids) => prisma.condition.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.condition.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["procedure", () => chunkedDelete(
      "procedure",
      (ids) => prisma.procedure.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.procedure.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["deviceImplant", () => chunkedDelete(
      "deviceImplant",
      (ids) => prisma.deviceImplant.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.deviceImplant.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["allergyIntolerance", () => chunkedDelete(
      "allergyIntolerance",
      (ids) => prisma.allergyIntolerance.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.allergyIntolerance.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
    ["patient", () => chunkedDelete(
      "patient",
      (ids) => prisma.patient.deleteMany({ where: { id: { in: ids } } }),
      () => prisma.patient.findMany({ where, select: { id: true }, take: CHUNK_SIZE }),
    )],
  ];

  for (const [name, fn] of stages) {
    results[name] = await fn();
  }

  console.log("\nCounting rows after wipe...");
  const after = await countAll(where);
  console.log("AFTER:", JSON.stringify(after, null, 2));

  const totalDeleted = Object.values(results).reduce((s, n) => s + n, 0);
  const totalRemaining = Object.values(after).reduce((s, n) => s + n, 0);

  console.log(`\nSummary:`);
  console.log(`  deleted:   ${totalDeleted}`);
  console.log(`  remaining: ${totalRemaining}`);
  console.log(`  hospital row preserved: ${hospital.name}`);

  if (totalRemaining > 0) {
    console.error(`\nWARNING: ${totalRemaining} rows still exist after wipe.`);
    process.exit(2);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
