/**
 * TAILRD Synthea FHIR Bundle Processor
 *
 * Reads FHIR R4 bundles from S3 or local directory and persists patients,
 * encounters, and observations to the database via the shared service layer.
 *
 * Usage:
 *   npx tsx backend/scripts/processSynthea.ts --s3 [--limit 1000] [--concurrency 10]
 *   npx tsx backend/scripts/processSynthea.ts ./path/to/fhir [--limit 1000]
 *
 * The --limit flag processes only the first N bundles (useful for testing).
 * The --concurrency flag controls parallel S3 fetches (default 10).
 *
 * A cursor file (.synthea-cursor) tracks the last processed S3 key so that
 * interrupted runs can resume without reprocessing.
 */

import * as fs from "fs";
import * as path from "path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import prisma from "../src/lib/prisma";
import { processPatientData } from "../src/services/patientService";
import { processObservationData } from "../src/services/observationService";
import { processEncounterData } from "../src/services/encounterService";
import { FHIRPatient, FHIREncounter, FHIRObservation } from "../src/types";

dotenv.config();

const BUCKET = "tailrd-cardiovascular-datasets-863518424332";
const PREFIX = "synthea/nyc-population-2026/fhir/";
const CURSOR_FILE = path.join(__dirname, ".synthea-cursor");

// Default hospital for Synthea ingestion. Must exist in DB.
// Create via seed or manually before running.
const SYNTHEA_HOSPITAL_ID = process.env.SYNTHEA_HOSPITAL_ID || "synthea-nyc-demo";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── S3 Helpers ────────────────────────────────────────────────────────────────

async function listS3Files(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: token,
    });
    const res = await s3.send(cmd);
    for (const obj of res.Contents || []) {
      if (obj.Key?.endsWith(".json")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function getS3File(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// ── Cursor for resumability ───────────────────────────────────────────────────

function loadCursor(): string | null {
  try {
    return fs.readFileSync(CURSOR_FILE, "utf-8").trim() || null;
  } catch {
    return null;
  }
}

function saveCursor(key: string): void {
  fs.writeFileSync(CURSOR_FILE, key, "utf-8");
}

function clearCursor(): void {
  try { fs.unlinkSync(CURSOR_FILE); } catch { /* no cursor to clear */ }
}

// ── FHIR Bundle Processing ───────────────────────────────────────────────────

interface FHIRBundle {
  resourceType: "Bundle";
  type?: string;
  entry?: Array<{
    fullUrl?: string;
    resource: {
      resourceType: string;
      [key: string]: any;
    };
  }>;
}

interface ProcessingStats {
  patients: number;
  encounters: number;
  observations: number;
  errors: number;
}

async function processFHIRBundle(
  bundle: FHIRBundle,
  hospitalId: string,
  stats: ProcessingStats,
): Promise<void> {
  if (!bundle.entry || bundle.entry.length === 0) return;

  // Extract resources by type
  const patients: FHIRPatient[] = [];
  const encounters: FHIREncounter[] = [];
  const observations: FHIRObservation[] = [];

  for (const entry of bundle.entry) {
    const r = entry.resource;
    switch (r.resourceType) {
      case "Patient":
        patients.push(r as FHIRPatient);
        break;
      case "Encounter":
        encounters.push(r as FHIREncounter);
        break;
      case "Observation":
        observations.push(r as FHIRObservation);
        break;
      // Condition, MedicationRequest, Procedure, etc. can be added later
      // as persistence functions are built for those resource types
    }
  }

  // 1. Persist patients first (needed for FK references)
  let patientId: string | null = null;
  for (const patient of patients) {
    try {
      const result = await processPatientData(patient, "SyntheaImport", hospitalId);
      patientId = result.patientId;
      stats.patients++;
    } catch (err: any) {
      stats.errors++;
    }
  }

  if (!patientId) return; // No patient persisted — skip dependents

  // 2. Persist encounters
  const encounterIdMap = new Map<string, string>(); // fhirId -> internalId
  for (const encounter of encounters) {
    try {
      const result = await processEncounterData(
        encounter,
        patients[0],
        "SyntheaImport",
        hospitalId,
        patientId,
      );
      if (encounter.id) encounterIdMap.set(encounter.id, result.encounterId);
      stats.encounters++;
    } catch (err: any) {
      stats.errors++;
    }
  }

  // 3. Persist observations (link to encounter if possible)
  for (const obs of observations) {
    try {
      // Synthea links observations to encounters via encounter.reference
      const encounterRef = (obs as any).encounter?.reference;
      const fhirEncounterId = encounterRef?.replace(/^urn:uuid:/, "")?.replace(/^Encounter\//, "");
      const encounterId = fhirEncounterId ? encounterIdMap.get(fhirEncounterId) : undefined;

      await processObservationData(obs, patients[0], hospitalId, patientId, encounterId);
      stats.observations++;
    } catch (err: any) {
      stats.errors++;
    }
  }
}

// ── Concurrency limiter ──────────────────────────────────────────────────────

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function ensureHospital(hospitalId: string): Promise<void> {
  const existing = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!existing) {
    console.log(`Creating demo hospital: ${hospitalId}`);
    await prisma.hospital.create({
      data: {
        id: hospitalId,
        name: "Synthea NYC Demo Population",
        displayName: "Synthea NYC Demo",
        ehrSystem: "Synthea",
        subscriptionTier: "ENTERPRISE",
        subscriptionActive: true,
        enabledModules: ["HEART_FAILURE", "ELECTROPHYSIOLOGY", "CORONARY_INTERVENTION", "STRUCTURAL_HEART", "VALVULAR_DISEASE", "PERIPHERAL_VASCULAR"],
      },
    });
  }
}

async function main() {
  const useS3 = process.argv.includes("--s3");
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
  const concurrencyArg = process.argv.indexOf("--concurrency");
  const concurrency = concurrencyArg !== -1 ? parseInt(process.argv[concurrencyArg + 1], 10) : 10;

  console.log("TAILRD Synthea Processor");
  console.log("========================");

  const stats: ProcessingStats = { patients: 0, encounters: 0, observations: 0, errors: 0 };
  const startTime = Date.now();

  if (useS3) {
    console.log("Mode: S3");
    console.log(`Bucket: ${BUCKET}`);
    console.log(`Concurrency: ${concurrency}`);
    if (limit < Infinity) console.log(`Limit: ${limit} bundles`);

    await ensureHospital(SYNTHEA_HOSPITAL_ID);

    console.log("Listing FHIR bundles...");
    const allKeys = await listS3Files();
    console.log(`Found ${allKeys.length} FHIR bundles`);

    // Resume from cursor if available
    const cursor = loadCursor();
    let keys = allKeys;
    if (cursor) {
      const cursorIdx = allKeys.indexOf(cursor);
      if (cursorIdx !== -1) {
        keys = allKeys.slice(cursorIdx + 1);
        console.log(`Resuming after cursor: ${cursor} (${allKeys.length - keys.length} already processed)`);
      }
    }

    // Apply limit
    if (keys.length > limit) {
      keys = keys.slice(0, limit);
    }

    console.log(`Processing ${keys.length} bundles...`);

    // Process in batches for bounded memory
    const BATCH_SIZE = concurrency * 5;
    for (let batchStart = 0; batchStart < keys.length; batchStart += BATCH_SIZE) {
      const batch = keys.slice(batchStart, batchStart + BATCH_SIZE);

      const tasks = batch.map((key) => async () => {
        try {
          const content = await getS3File(key);
          const bundle: FHIRBundle = JSON.parse(content);
          await processFHIRBundle(bundle, SYNTHEA_HOSPITAL_ID, stats);
          saveCursor(key);
        } catch (err: any) {
          console.error(`Failed: ${key}`, err.message);
          stats.errors++;
        }
      });

      await pLimit(tasks, concurrency);

      const total = batchStart + batch.length;
      if (total % 500 === 0 || total === keys.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `Progress: ${total}/${keys.length} bundles | ` +
          `${stats.patients} patients, ${stats.encounters} encounters, ${stats.observations} observations | ` +
          `${stats.errors} errors | ${elapsed}s elapsed`
        );
      }
    }

    clearCursor();
  } else {
    const dir = process.argv[2] || path.join(__dirname, "../../../synthea/output/fhir");
    console.log(`Mode: Local`);
    console.log(`Directory: ${dir}`);
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }

    await ensureHospital(SYNTHEA_HOSPITAL_ID);

    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    const filesToProcess = files.slice(0, Math.min(files.length, limit));
    console.log(`Found ${files.length} FHIR bundles, processing ${filesToProcess.length}`);

    for (let i = 0; i < filesToProcess.length; i++) {
      try {
        const content = fs.readFileSync(path.join(dir, filesToProcess[i]), "utf-8");
        const bundle: FHIRBundle = JSON.parse(content);
        await processFHIRBundle(bundle, SYNTHEA_HOSPITAL_ID, stats);
      } catch (err: any) {
        console.error(`Failed: ${filesToProcess[i]}`, err.message);
        stats.errors++;
      }

      if ((i + 1) % 100 === 0 || i === filesToProcess.length - 1) {
        console.log(
          `Progress: ${i + 1}/${filesToProcess.length} | ` +
          `${stats.patients} patients, ${stats.encounters} encounters, ${stats.observations} observations`
        );
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nComplete.`);
  console.log(`  Patients:     ${stats.patients}`);
  console.log(`  Encounters:   ${stats.encounters}`);
  console.log(`  Observations: ${stats.observations}`);
  console.log(`  Errors:       ${stats.errors}`);
  console.log(`  Time:         ${elapsed}s`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
