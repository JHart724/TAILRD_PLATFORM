/**
 * PHASE 2.5 medication persistence, re-verified for the AUDIT-192 BATCHED write path.
 *
 * patientWriter now persists via createMany (the tenant-guard-EXEMPT bulk path) instead of per-row upsert.
 * Proves an assembled RxNorm medication still persists as an ACTIVE Medication row in the exact shape both gap
 * runners read (status ACTIVE -> rxNormCode -> expandToIngredients), the deterministic id dedups refills, the
 * persisted code is engine-consumable, and absent medications is a no-op. prisma is mocked (no live DB).
 */
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: {
      findMany: jest.fn().mockResolvedValue([]), // fresh tenant: no existing patients
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    condition: { createMany: jest.fn().mockResolvedValue({ count: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    medication: { createMany: jest.fn().mockResolvedValue({ count: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    observation: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

import prisma from '../../src/lib/prisma';
import { writePatients } from '../../src/ingestion/patientWriter';
import { ParsedRow } from '../../src/ingestion/csvParser';
import { expandToIngredients } from '../../src/terminology/expandToIngredients';
import { MedicationStatus } from '@prisma/client';

const medCreate = (prisma as any).medication.createMany as jest.Mock;

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

describe('patientWriter - medication persistence via batched createMany (PHASE 2.5 / AUDIT-192)', () => {
  it('persists an assembled RxNorm medication as an ACTIVE Medication row in the engine-read shape', async () => {
    const result = await writePatients([rowWithMed()], 'h1', 'job1', 'hf');
    expect(result.errors).toEqual([]);
    expect(medCreate).toHaveBeenCalledTimes(1);
    const arg = medCreate.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    const med = arg.data[0];
    expect(med.rxNormCode).toBe('197361');
    expect(med.status).toBe(MedicationStatus.ACTIVE); // both runners filter on status ACTIVE
    expect(med.hospitalId).toBe('h1');
    expect(med.patientId).toBe('h1::P1'); // deterministic patient id (hospital::mrn)
    expect(med.id).toBe('h1::P1-rx-197361'); // deterministic -> idempotent re-ingest + per-drug dedup
    expect(med.medicationName).toBe('Lisinopril 10 MG Oral Tablet');
  });

  it('the persisted rxNormCode is engine-consumable (expandToIngredients 197361 -> ingredient 17767)', () => {
    const expanded = expandToIngredients(['197361']);
    expect(expanded).toContain('197361');
    expect(expanded).toContain('17767');
  });

  it('dedups repeat/refill rows of the same drug to a single ACTIVE row in the createMany batch', async () => {
    const row = rowWithMed();
    (row.data.medication_records as any[]).push(
      { rxNormCode: '197361', medicationName: 'Lisinopril 10 MG Oral Tablet', startDate: '2022-05-01' }, // refill
    );
    await writePatients([row], 'h1', 'job1', 'hf');
    expect(medCreate).toHaveBeenCalledTimes(1);
    expect(medCreate.mock.calls[0][0].data.filter((m: any) => m.rxNormCode === '197361')).toHaveLength(1);
  });

  it('absent medications is a no-op (single-file path preserved)', async () => {
    const row = rowWithMed();
    delete (row.data as any).medication_records;
    const result = await writePatients([row], 'h1', 'job1', 'hf');
    expect(result.errors).toEqual([]);
    expect(medCreate).not.toHaveBeenCalled();
  });
});
