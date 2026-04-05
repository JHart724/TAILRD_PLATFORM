/**
 * TAILRD Demo Data Seeder from Synthea FHIR Bundles
 *
 * Selects a curated subset of Synthea patients from S3, persists them
 * to the database, then runs gap detection to populate therapy gaps.
 *
 * This creates a realistic demo dataset for health system executives.
 *
 * Usage:
 *   npx tsx backend/scripts/seedFromSynthea.ts --s3 --limit 500
 *   npx tsx backend/scripts/seedFromSynthea.ts ./path/to/fhir --limit 100
 *
 * After seeding, the platform will show real gap data derived from
 * Synthea's clinically realistic patient population.
 */

import * as dotenv from "dotenv";
import prisma from "../src/lib/prisma";
import { runGapDetection } from "../src/ingestion/gapDetectionRunner";

dotenv.config();

const DEMO_HOSPITALS = [
  {
    id: "demo-medical-city-dallas",
    name: "Medical City Dallas",
    displayName: "Medical City Dallas (HCA)",
    ehrSystem: "Epic",
    subscriptionTier: "ENTERPRISE" as const,
    patientLimit: 200,
  },
  {
    id: "demo-commonspirit",
    name: "CommonSpirit Health",
    displayName: "CommonSpirit Health",
    ehrSystem: "Cerner",
    subscriptionTier: "ENTERPRISE" as const,
    patientLimit: 150,
  },
  {
    id: "demo-mount-sinai",
    name: "Mount Sinai Health System",
    displayName: "Mount Sinai",
    ehrSystem: "Epic",
    subscriptionTier: "ENTERPRISE" as const,
    patientLimit: 150,
  },
];

async function ensureHospitals(): Promise<void> {
  for (const h of DEMO_HOSPITALS) {
    await prisma.hospital.upsert({
      where: { id: h.id },
      create: {
        id: h.id,
        name: h.name,
        displayName: h.displayName,
        ehrSystem: h.ehrSystem,
        subscriptionTier: h.subscriptionTier,
        subscriptionActive: true,
        enabledModules: [
          "HEART_FAILURE",
          "ELECTROPHYSIOLOGY",
          "CORONARY_INTERVENTION",
          "STRUCTURAL_HEART",
          "VALVULAR_DISEASE",
          "PERIPHERAL_VASCULAR",
        ],
      },
      update: { subscriptionActive: true },
    });
    console.log(`Hospital ensured: ${h.name}`);
  }
}

async function seedPatientsFromSynthea(): Promise<void> {
  // Import processSynthea's pipeline dynamically to reuse its bundle processing
  // The processSynthea script handles S3 fetching, FHIR parsing, and persistence
  const useS3 = process.argv.includes("--s3");
  const limitArg = process.argv.indexOf("--limit");
  const totalLimit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 500;

  // Distribute patients across demo hospitals
  const perHospital = Math.ceil(totalLimit / DEMO_HOSPITALS.length);

  console.log(`\nSeeding ${totalLimit} patients across ${DEMO_HOSPITALS.length} demo hospitals`);
  console.log(`(${perHospital} per hospital)\n`);

  if (useS3) {
    // For S3 mode, call processSynthea directly for each hospital
    // We set the SYNTHEA_HOSPITAL_ID env var and call the pipeline
    for (const hospital of DEMO_HOSPITALS) {
      console.log(`\n--- Seeding ${hospital.name} (${perHospital} patients) ---`);
      process.env.SYNTHEA_HOSPITAL_ID = hospital.id;

      // Fork processSynthea with per-hospital limit
      const { execSync } = require("child_process");
      try {
        execSync(
          `npx tsx backend/scripts/processSynthea.ts --s3 --limit ${perHospital} --concurrency 5`,
          { stdio: "inherit", env: { ...process.env, SYNTHEA_HOSPITAL_ID: hospital.id } }
        );
      } catch (err: any) {
        console.error(`Failed to seed ${hospital.name}:`, err.message);
      }
    }
  } else {
    const dir = process.argv[2] || "./backend/scripts/synthea/output";
    for (const hospital of DEMO_HOSPITALS) {
      console.log(`\n--- Seeding ${hospital.name} (${perHospital} patients from ${dir}) ---`);
      process.env.SYNTHEA_HOSPITAL_ID = hospital.id;

      const { execSync } = require("child_process");
      try {
        execSync(
          `npx tsx backend/scripts/processSynthea.ts "${dir}" --limit ${perHospital}`,
          { stdio: "inherit", env: { ...process.env, SYNTHEA_HOSPITAL_ID: hospital.id } }
        );
      } catch (err: any) {
        console.error(`Failed to seed ${hospital.name}:`, err.message);
      }
    }
  }
}

async function runGapDetectionForAllHospitals(): Promise<void> {
  console.log("\n--- Running gap detection across all demo hospitals ---\n");

  for (const hospital of DEMO_HOSPITALS) {
    console.log(`Gap detection: ${hospital.name}...`);
    try {
      const result = await runGapDetection(hospital.id);
      console.log(
        `  ${result.patientsEvaluated} patients evaluated, ` +
        `${result.gapFlagsCreated} gaps created, ` +
        `${result.gapFlagsUpdated} updated`
      );
    } catch (err: any) {
      console.error(`  Gap detection failed: ${err.message}`);
    }
  }
}

async function main() {
  console.log("TAILRD Demo Data Seeder");
  console.log("========================\n");

  // 1. Create demo hospitals
  await ensureHospitals();

  // 2. Seed patients from Synthea
  await seedPatientsFromSynthea();

  // 3. Run gap detection
  await runGapDetectionForAllHospitals();

  // 4. Print summary
  const [patientCount, gapCount] = await Promise.all([
    prisma.patient.count(),
    prisma.therapyGap.count(),
  ]);

  console.log("\n========================");
  console.log("Demo seeding complete.");
  console.log(`  Hospitals: ${DEMO_HOSPITALS.length}`);
  console.log(`  Patients:  ${patientCount}`);
  console.log(`  Gaps:      ${gapCount}`);
  console.log("\nDemo accounts:");
  for (const h of DEMO_HOSPITALS) {
    console.log(`  ${h.displayName}: hospital ID = ${h.id}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
