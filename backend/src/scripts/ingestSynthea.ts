/**
 * FHIR Bundle Ingest Pipeline — S3 → Prisma
 *
 * Reads Synthea FHIR bundles from S3, parses Patient/Condition/Medication/
 * Observation/Encounter resources, and upserts into the database.
 *
 * Designed for scale:
 *   - Streaming from S3 (never loads all bundles into memory)
 *   - Parallel workers (configurable concurrency)
 *   - Batch inserts via Prisma createMany
 *   - Resumable via progress tracking file
 *   - Idempotent via fhirPatientId / fhirEncounterId dedup
 *
 * Usage:
 *   npx ts-node src/scripts/ingestSynthea.ts [--concurrency 10] [--limit 100] [--resume]
 */

import { PrismaClient, Gender, EncounterType, EncounterStatus, ObservationCategory, MedicationStatus, ConditionCategory, ConditionClinicalStatus, ConditionVerificationStatus } from '@prisma/client';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_UPLOADS || 'tailrd-cardiovascular-datasets-863518424332';
const PREFIX = 'synthea/nyc-population-2026/fhir/';
const HOSPITAL_ID = process.env.INGEST_HOSPITAL_ID || 'hosp-synthea-nyc';
const PROGRESS_FILE = path.join(__dirname, '../../.ingest-progress.json');

// ── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency'))?.split('=')[1] || '10');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit'))?.split('=')[1] || '0');
const RESUME = args.includes('--resume');
const DRY_RUN = args.includes('--dry-run');

interface Progress {
  processedKeys: string[];
  totalProcessed: number;
  totalSkipped: number;
  totalErrors: number;
  lastKey: string;
  startedAt: string;
  updatedAt: string;
}

interface IngestStats {
  patients: number;
  conditions: number;
  medications: number;
  observations: number;
  encounters: number;
  errors: number;
  skipped: number;
}

// ── S3 Listing ──────────────────────────────────────────────────────────────

async function* listBundleKeys(): AsyncGenerator<string> {
  let continuationToken: string | undefined;
  let count = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response = await s3.send(command);

    for (const obj of response.Contents || []) {
      if (obj.Key && obj.Key.endsWith('.json')) {
        count++;
        if (LIMIT > 0 && count > LIMIT) return;
        yield obj.Key;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
}

// ── S3 Download ─────────────────────────────────────────────────────────────

async function downloadBundle(key: string): Promise<any> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);

  if (!response.Body) throw new Error(`Empty body for ${key}`);

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

// ── FHIR Resource Extractors ────────────────────────────────────────────────

function extractResources(bundle: any): {
  patient: any | null;
  conditions: any[];
  medications: any[];
  observations: any[];
  encounters: any[];
} {
  const entries = bundle.entry || [];
  return {
    patient: entries.find((e: any) => e.resource?.resourceType === 'Patient')?.resource || null,
    conditions: entries.filter((e: any) => e.resource?.resourceType === 'Condition').map((e: any) => e.resource),
    medications: entries.filter((e: any) => e.resource?.resourceType === 'MedicationRequest').map((e: any) => e.resource),
    observations: entries.filter((e: any) => e.resource?.resourceType === 'Observation').map((e: any) => e.resource),
    encounters: entries.filter((e: any) => e.resource?.resourceType === 'Encounter').map((e: any) => e.resource),
  };
}

// ── FHIR → Prisma Mappers ───────────────────────────────────────────────────

function mapGender(fhirGender?: string): Gender {
  switch (fhirGender) {
    case 'male': return 'MALE';
    case 'female': return 'FEMALE';
    case 'other': return 'OTHER';
    default: return 'UNKNOWN';
  }
}

function mapEncounterType(classCode?: string): EncounterType {
  switch (classCode) {
    case 'IMP': case 'ACUTE': case 'NONAC': return 'INPATIENT';
    case 'AMB': return 'OUTPATIENT';
    case 'EMER': return 'EMERGENCY';
    case 'VR': return 'TELEHEALTH';
    case 'SS': return 'DAY_SURGERY';
    default: return 'OUTPATIENT';
  }
}

function mapEncounterStatus(fhirStatus?: string): EncounterStatus {
  switch (fhirStatus) {
    case 'planned': return 'PLANNED';
    case 'arrived': return 'ARRIVED';
    case 'triaged': return 'TRIAGED';
    case 'in-progress': return 'IN_PROGRESS';
    case 'onleave': return 'ON_LEAVE';
    case 'finished': return 'FINISHED';
    case 'cancelled': return 'CANCELLED';
    default: return 'FINISHED';
  }
}

function mapObservationCategory(fhirCategory?: any[]): ObservationCategory {
  const code = fhirCategory?.[0]?.coding?.[0]?.code;
  switch (code) {
    case 'vital-signs': return 'VITAL_SIGNS';
    case 'laboratory': return 'LABORATORY';
    case 'imaging': return 'IMAGING';
    case 'procedure': return 'PROCEDURE';
    case 'survey': return 'SURVEY';
    case 'exam': return 'EXAM';
    case 'therapy': return 'THERAPY';
    default: return 'LABORATORY';
  }
}

function determineModuleFlags(conditions: any[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    heartFailurePatient: false,
    electrophysiologyPatient: false,
    structuralHeartPatient: false,
    coronaryPatient: false,
    peripheralVascularPatient: false,
    valvularDiseasePatient: false,
  };

  for (const cond of conditions) {
    const code = cond.code?.coding?.[0]?.code || '';
    // ICD-10 based module assignment
    if (code.match(/^I50|^I11\.0|^I13\.[02]/)) flags.heartFailurePatient = true;
    if (code.match(/^I47|^I48|^I49/)) flags.electrophysiologyPatient = true;
    if (code.match(/^Q2[0-5]|^I42/)) flags.structuralHeartPatient = true;
    if (code.match(/^I2[0-5]/)) flags.coronaryPatient = true;
    if (code.match(/^I7[0-7]/)) flags.peripheralVascularPatient = true;
    if (code.match(/^I0[5-8]|^I3[4-7]/)) flags.valvularDiseasePatient = true;
    // Broad cardiovascular → heart failure as catch-all
    if (code.match(/^I1[0-5]|^E1[01]/)) flags.heartFailurePatient = true;
  }

  return flags;
}

// ── Bundle Processor ────────────────────────────────────────────────────────

async function processBundle(key: string): Promise<IngestStats> {
  const stats: IngestStats = { patients: 0, conditions: 0, medications: 0, observations: 0, encounters: 0, errors: 0, skipped: 0 };

  const bundle = await downloadBundle(key);
  const { patient, conditions, medications, observations, encounters } = extractResources(bundle);

  if (!patient) {
    stats.skipped++;
    return stats;
  }

  if (DRY_RUN) {
    stats.patients = 1;
    stats.conditions = conditions.length;
    stats.medications = medications.length;
    stats.observations = observations.length;
    stats.encounters = encounters.length;
    return stats;
  }

  // 1. Upsert Patient
  const mrn = patient.identifier?.find((id: any) =>
    id.type?.coding?.[0]?.code === 'MR' || id.type?.text === 'Medical Record Number'
  )?.value || patient.id;

  const name = patient.name?.[0] || {};
  const address = patient.address?.[0] || {};
  const phone = patient.telecom?.find((t: any) => t.system === 'phone')?.value;
  const email = patient.telecom?.find((t: any) => t.system === 'email')?.value;
  const moduleFlags = determineModuleFlags(conditions);

  const dbPatient = await prisma.patient.upsert({
    where: { hospitalId_mrn: { hospitalId: HOSPITAL_ID, mrn } },
    create: {
      hospitalId: HOSPITAL_ID,
      mrn,
      firstName: name.given?.join(' ') || 'Unknown',
      lastName: name.family || 'Unknown',
      dateOfBirth: patient.birthDate ? new Date(patient.birthDate) : new Date('1970-01-01'),
      gender: mapGender(patient.gender),
      phone,
      email,
      street: address.line?.join(', '),
      city: address.city,
      state: address.state,
      zipCode: address.postalCode,
      fhirPatientId: patient.id,
      isActive: patient.active !== false,
      ...moduleFlags,
    },
    update: {
      firstName: name.given?.join(' ') || 'Unknown',
      lastName: name.family || 'Unknown',
      fhirPatientId: patient.id,
      lastEHRSync: new Date(),
      // Module flags only turn ON, never OFF
      ...(moduleFlags.heartFailurePatient && { heartFailurePatient: true }),
      ...(moduleFlags.electrophysiologyPatient && { electrophysiologyPatient: true }),
      ...(moduleFlags.structuralHeartPatient && { structuralHeartPatient: true }),
      ...(moduleFlags.coronaryPatient && { coronaryPatient: true }),
      ...(moduleFlags.peripheralVascularPatient && { peripheralVascularPatient: true }),
      ...(moduleFlags.valvularDiseasePatient && { valvularDiseasePatient: true }),
    },
  });
  stats.patients++;

  // 2. Batch insert Conditions
  if (conditions.length > 0) {
    const conditionData = conditions.map((c: any) => {
      const coding = c.code?.coding?.[0] || {};
      return {
        patientId: dbPatient.id,
        hospitalId: HOSPITAL_ID,
        conditionName: coding.display || c.code?.text || 'Unknown',
        icd10Code: coding.system?.includes('icd') ? coding.code : null,
        snomedCode: coding.system?.includes('snomed') ? coding.code : null,
        category: 'PROBLEM_LIST' as ConditionCategory,
        clinicalStatus: (c.clinicalStatus?.coding?.[0]?.code?.toUpperCase() || 'ACTIVE') as ConditionClinicalStatus,
        verificationStatus: (c.verificationStatus?.coding?.[0]?.code?.toUpperCase() || 'CONFIRMED') as ConditionVerificationStatus,
        onsetDate: c.onsetDateTime ? new Date(c.onsetDateTime) : null,
        abatementDate: c.abatementDateTime ? new Date(c.abatementDateTime) : null,
        recordedDate: c.recordedDate ? new Date(c.recordedDate) : new Date(),
        fhirConditionId: c.id,
      };
    });

    try {
      await prisma.condition.createMany({ data: conditionData, skipDuplicates: true });
      stats.conditions = conditionData.length;
    } catch (e) {
      stats.errors++;
    }
  }

  // 3. Batch insert Medications
  if (medications.length > 0) {
    const medData = medications.map((m: any) => {
      const coding = m.medicationCodeableConcept?.coding?.[0] || {};
      const dosage = m.dosageInstruction?.[0] || {};
      return {
        patientId: dbPatient.id,
        hospitalId: HOSPITAL_ID,
        medicationName: coding.display || m.medicationCodeableConcept?.text || 'Unknown',
        rxNormCode: coding.system?.includes('rxnorm') ? coding.code : null,
        dose: dosage.doseAndRate?.[0]?.doseQuantity?.value
          ? `${dosage.doseAndRate[0].doseQuantity.value} ${dosage.doseAndRate[0].doseQuantity.unit || ''}`
          : null,
        doseValue: dosage.doseAndRate?.[0]?.doseQuantity?.value || null,
        doseUnit: dosage.doseAndRate?.[0]?.doseQuantity?.unit || null,
        route: dosage.route?.coding?.[0]?.display || null,
        frequency: dosage.timing?.code?.text || dosage.timing?.repeat?.frequency
          ? `${dosage.timing.repeat.frequency}x/${dosage.timing.repeat.period}${dosage.timing.repeat.periodUnit}`
          : null,
        status: (m.status === 'active' ? 'ACTIVE' : m.status === 'stopped' ? 'DISCONTINUED' : 'COMPLETED') as MedicationStatus,
        startDate: m.authoredOn ? new Date(m.authoredOn) : null,
        prescribedDate: m.authoredOn ? new Date(m.authoredOn) : null,
        fhirMedicationId: m.id,
      };
    });

    try {
      await prisma.medication.createMany({ data: medData, skipDuplicates: true });
      stats.medications = medData.length;
    } catch (e) {
      stats.errors++;
    }
  }

  // 4. Batch insert Observations (labs + vitals)
  if (observations.length > 0) {
    const obsData = observations.map((o: any) => {
      const coding = o.code?.coding?.[0] || {};
      const isAbnormal = o.interpretation?.[0]?.coding?.[0]?.code
        ? ['H', 'HH', 'L', 'LL', 'A'].includes(o.interpretation[0].coding[0].code)
        : false;

      return {
        patientId: dbPatient.id,
        hospitalId: HOSPITAL_ID,
        observationType: coding.code || 'unknown',
        observationName: coding.display || o.code?.text || 'Unknown',
        category: mapObservationCategory(o.category),
        valueNumeric: o.valueQuantity?.value ?? null,
        valueText: o.valueString ?? o.valueCodeableConcept?.text ?? null,
        valueBoolean: o.valueBoolean ?? null,
        unit: o.valueQuantity?.unit || null,
        referenceRangeLow: o.referenceRange?.[0]?.low?.value ?? null,
        referenceRangeHigh: o.referenceRange?.[0]?.high?.value ?? null,
        isAbnormal,
        observedDateTime: o.effectiveDateTime ? new Date(o.effectiveDateTime) : new Date(),
        resultDateTime: o.issued ? new Date(o.issued) : null,
        fhirObservationId: o.id,
      };
    });

    // Batch in chunks of 500 to avoid Prisma limits
    for (let i = 0; i < obsData.length; i += 500) {
      try {
        await prisma.observation.createMany({ data: obsData.slice(i, i + 500), skipDuplicates: true });
        stats.observations += Math.min(500, obsData.length - i);
      } catch (e) {
        stats.errors++;
      }
    }
  }

  // 5. Batch insert Encounters
  if (encounters.length > 0) {
    const encData = encounters.map((e: any) => {
      const diagnosis = e.reasonCode?.[0]?.coding?.[0];
      return {
        patientId: dbPatient.id,
        hospitalId: HOSPITAL_ID,
        encounterNumber: e.id || `enc-${Date.now()}`,
        encounterType: mapEncounterType(e.class?.code),
        status: mapEncounterStatus(e.status),
        startDateTime: e.period?.start ? new Date(e.period.start) : new Date(),
        endDateTime: e.period?.end ? new Date(e.period.end) : null,
        department: e.serviceType?.coding?.[0]?.display || null,
        location: e.location?.[0]?.location?.display || null,
        chiefComplaint: e.reasonCode?.[0]?.text || diagnosis?.display || null,
        primaryDiagnosis: diagnosis?.display || null,
        diagnosisCodes: e.reasonCode
          ? e.reasonCode.map((rc: any) => ({
              code: rc.coding?.[0]?.code,
              display: rc.coding?.[0]?.display,
              system: rc.coding?.[0]?.system,
            }))
          : undefined,
        fhirEncounterId: e.id,
      };
    });

    try {
      await prisma.encounter.createMany({ data: encData, skipDuplicates: true });
      stats.encounters = encData.length;
    } catch (e) {
      stats.errors++;
    }
  }

  return stats;
}

// ── Progress Tracking ───────────────────────────────────────────────────────

function loadProgress(): Progress {
  if (RESUME && fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {
    processedKeys: [],
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
    lastKey: '',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveProgress(progress: Progress) {
  progress.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── Parallel Worker Pool ────────────────────────────────────────────────────

async function runWorkerPool(keys: string[], progress: Progress): Promise<IngestStats> {
  const totals: IngestStats = { patients: 0, conditions: 0, medications: 0, observations: 0, encounters: 0, errors: 0, skipped: 0 };
  const processed = new Set(progress.processedKeys);
  let pending: Promise<void>[] = [];
  let completed = 0;
  const startTime = Date.now();

  for (const key of keys) {
    if (processed.has(key)) {
      totals.skipped++;
      continue;
    }

    const work = (async () => {
      try {
        const stats = await processBundle(key);
        totals.patients += stats.patients;
        totals.conditions += stats.conditions;
        totals.medications += stats.medications;
        totals.observations += stats.observations;
        totals.encounters += stats.encounters;
        totals.errors += stats.errors;
        totals.skipped += stats.skipped;

        progress.processedKeys.push(key);
        progress.totalProcessed++;
        progress.lastKey = key;
      } catch (err: any) {
        totals.errors++;
        progress.totalErrors++;
        console.error(`  ERROR: ${key} — ${err.message}`);
      }

      completed++;
      if (completed % 50 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = completed / elapsed;
        const remaining = (keys.length - completed) / rate;
        console.log(
          `  Progress: ${completed}/${keys.length} bundles ` +
          `(${rate.toFixed(1)}/sec, ~${Math.ceil(remaining / 60)}min remaining) ` +
          `| ${totals.patients} patients, ${totals.conditions} conditions, ` +
          `${totals.observations} observations, ${totals.errors} errors`
        );
        saveProgress(progress);
      }
    })();

    pending.push(work);

    if (pending.length >= CONCURRENCY) {
      await Promise.race(pending);
      pending = pending.filter(p => p !== undefined);
    }
  }

  await Promise.all(pending);
  saveProgress(progress);

  return totals;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TAILRD FHIR Bundle Ingest Pipeline                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Bucket:      ${BUCKET}`);
  console.log(`║  Prefix:      ${PREFIX}`);
  console.log(`║  Hospital:    ${HOSPITAL_ID}`);
  console.log(`║  Concurrency: ${CONCURRENCY}`);
  console.log(`║  Limit:       ${LIMIT || 'none'}`);
  console.log(`║  Resume:      ${RESUME}`);
  console.log(`║  Dry run:     ${DRY_RUN}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Ensure hospital exists
  if (!DRY_RUN) {
    await prisma.hospital.upsert({
      where: { id: HOSPITAL_ID },
      create: {
        id: HOSPITAL_ID,
        name: 'NYC Synthea Cardiovascular Population',
        system: 'Synthea (Synthetic)',
        hospitalType: 'ACADEMIC',
        patientCount: 0,
        bedCount: 500,
        street: '525 E 68th St',
        city: 'New York',
        state: 'NY',
        zipCode: '10065',
        moduleHeartFailure: true,
        moduleElectrophysiology: true,
        moduleStructuralHeart: true,
        moduleCoronaryIntervention: true,
        modulePeripheralVascular: true,
        moduleValvularDisease: true,
        subscriptionTier: 'PROFESSIONAL',
        subscriptionStart: new Date(),
        maxUsers: 100,
      },
      update: { name: 'NYC Synthea Cardiovascular Population' },
    });
  }

  // List all bundle keys from S3
  console.log('Listing bundles from S3...');
  const keys: string[] = [];
  for await (const key of listBundleKeys()) {
    keys.push(key);
  }
  console.log(`Found ${keys.length} FHIR bundles.`);

  if (keys.length === 0) {
    console.log('No bundles found. Check bucket/prefix.');
    return;
  }

  // Load progress for resume
  const progress = loadProgress();
  if (RESUME && progress.processedKeys.length > 0) {
    console.log(`Resuming from ${progress.processedKeys.length} previously processed bundles.`);
  }

  // Process bundles
  console.log(`\nProcessing with ${CONCURRENCY} parallel workers...\n`);
  const stats = await runWorkerPool(keys, progress);

  // Final report
  console.log();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  INGEST COMPLETE                                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Patients:      ${String(stats.patients).padStart(8)}`);
  console.log(`║  Conditions:    ${String(stats.conditions).padStart(8)}`);
  console.log(`║  Medications:   ${String(stats.medications).padStart(8)}`);
  console.log(`║  Observations:  ${String(stats.observations).padStart(8)}`);
  console.log(`║  Encounters:    ${String(stats.encounters).padStart(8)}`);
  console.log(`║  Errors:        ${String(stats.errors).padStart(8)}`);
  console.log(`║  Skipped:       ${String(stats.skipped).padStart(8)}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
