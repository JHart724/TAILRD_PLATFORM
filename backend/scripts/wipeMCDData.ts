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

  console.log(`\nDeleting ${totalRows} rows across 11 tables...`);

  // Order matters: delete children before parents (FK Restrict)
  // Therapy gaps / alerts / orders reference Patient → delete first
  // Observation → Encounter (SetNull on delete) but still delete obs first so
  //   Encounter deletion doesn't need to update obs.encounterId
  const results: Record<string, number> = {};

  const stages: Array<[string, () => Promise<{ count: number }>]> = [
    ["therapyGap", () => prisma.therapyGap.deleteMany({ where })],
    ["alert", () => prisma.alert.deleteMany({ where })],
    ["order", () => prisma.order.deleteMany({ where })],
    ["observation", () => prisma.observation.deleteMany({ where })],
    ["encounter", () => prisma.encounter.deleteMany({ where })],
    ["medication", () => prisma.medication.deleteMany({ where })],
    ["condition", () => prisma.condition.deleteMany({ where })],
    ["procedure", () => prisma.procedure.deleteMany({ where })],
    ["deviceImplant", () => prisma.deviceImplant.deleteMany({ where })],
    ["allergyIntolerance", () => prisma.allergyIntolerance.deleteMany({ where })],
    ["patient", () => prisma.patient.deleteMany({ where })],
  ];

  for (const [name, fn] of stages) {
    const start = Date.now();
    const res = await fn();
    results[name] = res.count;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  deleted ${String(res.count).padStart(8)} ${name}s (${elapsed}s)`);
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
