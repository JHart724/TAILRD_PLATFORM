/**
 * PHASE 2.5: medication persistence in patientWriter.
 *
 * Proves the additive medication write: an assembled RxNorm medication persists as an ACTIVE Medication
 * row in the exact shape both gap runners read (`medications: { where: { status: 'ACTIVE' } }` ->
 * `m.rxNormCode` -> expandToIngredients), that the persisted code is consumable by that engine path, and
 * that absent medications is a no-op (single-file path preserved). prisma is mocked (no live DB), mirroring
 * the established procedureMedDateThreading.test.ts pattern.
 */
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: {
      findUnique: jest.fn().mockResolvedValue(null), // new patient
      create: jest.fn().mockResolvedValue({ id: 'db-P1' }),
      update: jest.fn().mockResolvedValue({ id: 'db-P1' }),
    },
    condition: { upsert: jest.fn().mockResolvedValue({}) },
    observation: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    medication: { upsert: jest.fn().mockResolvedValue({}) },
  },
}));

import prisma from '../../src/lib/prisma';
import { writePatients } from '../../src/ingestion/patientWriter';
import { ParsedRow } from '../../src/ingestion/csvParser';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';
import { MedicationStatus } from '@prisma/client';

const med = (prisma as any).medication.upsert as jest.Mock;

const rowWithMed = (): ParsedRow => ({
  rowNumber: 2,
  data: {
    patient_id: 'P1',
    age: 65,
    sex: 'F',
    encounter_date: '2021-02-01T00:00:00.000Z',
    primary_diagnosis: 'I50.9',
    secondary_diagnoses: [],
    medication_records: [
      { rxNormCode: '197361', medicationName: 'Lisinopril 10 MG Oral Tablet', startDate: '2021-02-01' },
    ],
  },
  errors: [],
  warnings: [],
});

beforeEach(() => jest.clearAllMocks());

describe('patientWriter - medication persistence (PHASE 2.5)', () => {
  it('persists an assembled RxNorm medication as an ACTIVE Medication row in the shape the engine reads', async () => {
    const result = await writePatients([rowWithMed()], 'h1', 'job1', 'hf');
    expect(result.errors).toEqual([]); // no swallowed per-row failure
    expect(med).toHaveBeenCalledTimes(1);
    const arg = med.mock.calls[0][0];
    expect(arg.create.rxNormCode).toBe('197361');
    expect(arg.create.status).toBe(MedicationStatus.ACTIVE); // both runners filter on status ACTIVE
    expect(arg.create.patientId).toBe('db-P1');
    expect(arg.create.hospitalId).toBe('h1');
    expect(arg.create.medicationName).toBe('Lisinopril 10 MG Oral Tablet');
    expect(arg.where.id).toBe('db-P1-rx-197361'); // deterministic id -> idempotent re-ingest + per-drug dedup
  });

  it('the persisted rxNormCode is consumable by the engine medication-present path (expandToIngredients)', () => {
    // The runners build medCodes = expandToIngredients(rxNormCode). 197361 (lisinopril SCD) expands to its
    // ingredient IN 17767, which the GDMT value sets gate on - so a persisted 197361 satisfies the on-therapy check.
    const expanded = expandToIngredients(['197361']);
    expect(expanded).toContain('197361'); // raw code kept
    expect(expanded).toContain('17767');  // lisinopril ingredient IN added
  });

  it('dedups repeat/refill rows of the same drug to a single ACTIVE row', async () => {
    const row = rowWithMed();
    (row.data.medication_records as any[]).push(
      { rxNormCode: '197361', medicationName: 'Lisinopril 10 MG Oral Tablet', startDate: '2022-05-01' }, // refill
    );
    await writePatients([row], 'h1', 'job1', 'hf');
    expect(med).toHaveBeenCalledTimes(1); // one upsert for the drug, not two
  });

  it('absent medications is a no-op (single-file path preserved)', async () => {
    const row = rowWithMed();
    delete (row.data as any).medication_records; // single-file path emits no medication_records
    const result = await writePatients([row], 'h1', 'job1', 'hf');
    expect(result.errors).toEqual([]);
    expect(med).not.toHaveBeenCalled();
  });
});
