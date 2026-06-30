/**
 * AUDIT-192: batched ingestion write path (throughput + tenant-guard audit-noise fix).
 *
 * The prior per-row patientWriter did findUnique + per-Condition/per-Medication upsert per patient (~12 serial
 * Aurora round-trips/patient + a tenant-guard violation on every where:{id} op). The batched path uses createMany
 * (the operation the tenant guard EXEMPTS by construction) + hospitalId-scoped findMany/updateMany. These tests
 * prove: round-trips are BOUNDED (not O(patients)); the writer issues NO per-row upsert/findUnique; every query
 * preserves the tenant-guard invariant (hospitalId in where, or createMany whose data carries hospitalId); and
 * re-ingest UPDATES existing rows (not silent skip). prisma is mocked (no live DB).
 *
 * Note on the guard: the prisma mock intentionally exposes ONLY findMany/createMany/updateMany/$transaction
 * (no upsert, no findUnique). If the writer called a per-row op it would throw -> result.errors non-empty.
 */
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    condition: { createMany: jest.fn().mockResolvedValue({ count: 0 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    medication: { createMany: jest.fn().mockResolvedValue({ count: 0 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    observation: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

import prisma from '../../src/lib/prisma';
import { writePatients } from '../../src/ingestion/patientWriter';
import { ParsedRow } from '../../src/ingestion/csvParser';

const p = prisma as any;
const allMocks = (): jest.Mock[] => [
  p.patient.findMany, p.patient.createMany, p.patient.updateMany,
  p.condition.createMany, p.condition.updateMany,
  p.medication.createMany, p.medication.updateMany,
  p.observation.createMany, p.$transaction,
];
const totalRoundTrips = (): number => allMocks().reduce((n, m) => n + m.mock.calls.length, 0);

const patientRow = (mrn: string): ParsedRow => ({
  rowNumber: 2,
  data: {
    patient_id: mrn, age: 60, sex: 'M', encounter_date: '2021-02-01T00:00:00.000Z',
    primary_diagnosis: 'I25.10', secondary_diagnoses: ['I50.9'],
    lvef: 35,
    medication_records: [{ rxNormCode: '197361', medicationName: 'Lisinopril', startDate: '2021-02-01' }],
  },
  errors: [], warnings: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  p.patient.findMany.mockResolvedValue([]); // default: fresh tenant
});

describe('AUDIT-192 - round-trips are BOUNDED, not per-row', () => {
  it('a 3-patient batch and a 6-patient batch issue the SAME (constant) number of prisma round-trips', async () => {
    await writePatients([patientRow('A'), patientRow('B'), patientRow('C')], 'h1', 'j', 'hf');
    const rt3 = totalRoundTrips();
    jest.clearAllMocks(); p.patient.findMany.mockResolvedValue([]);
    await writePatients([patientRow('A'), patientRow('B'), patientRow('C'), patientRow('D'), patientRow('E'), patientRow('F')], 'h1', 'j', 'hf');
    const rt6 = totalRoundTrips();
    expect(rt3).toBe(rt6);            // constant per batch, NOT O(patients)
    expect(rt3).toBeLessThanOrEqual(6); // fresh: findMany + 4 createMany (patient/condition/med/obs) ~= 5
  });

  it('issues NO per-row upsert/findUnique (the mock omits them; a per-row call would error)', async () => {
    const result = await writePatients([patientRow('A'), patientRow('B')], 'h1', 'j', 'hf');
    expect(result.errors).toEqual([]); // no "is not a function" -> no upsert/findUnique path taken
    expect(p.patient.createMany).toHaveBeenCalledTimes(1);
    expect(p.condition.createMany).toHaveBeenCalledTimes(1);
    expect(p.medication.createMany).toHaveBeenCalledTimes(1);
  });
});

describe('AUDIT-192 - tenant-guard invariant preserved (no bypass): every query carries hospitalId', () => {
  it('findMany/updateMany carry hospitalId in where; every createMany row carries hospitalId in data', async () => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::A', mrn: 'A' }]); // force re-ingest so updateMany fires too
    await writePatients([patientRow('A')], 'h1', 'j', 'hf');
    // reads/updates: hospitalId in where
    expect(p.patient.findMany.mock.calls[0][0].where.hospitalId).toBe('h1');
    expect(p.condition.updateMany.mock.calls[0][0].where.hospitalId).toBe('h1');
    expect(p.medication.updateMany.mock.calls[0][0].where.hospitalId).toBe('h1');
    // creates: every row's data carries hospitalId (the guard-exempt-by-construction property)
    for (const create of [p.condition.createMany, p.medication.createMany, p.observation.createMany]) {
      if (create.mock.calls.length) {
        for (const rowData of create.mock.calls[0][0].data) expect(rowData.hospitalId).toBe('h1');
      }
    }
  });
});

describe('AUDIT-192 - re-ingest UPDATES existing rows (not silent skip)', () => {
  it('an existing patient gets a batched lastAssessment update + condition/medication re-affirm (not skipped)', async () => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::A', mrn: 'A' }]); // A already exists
    const result = await writePatients([patientRow('A')], 'h1', 'j', 'hf');
    expect(result.errors).toEqual([]);
    expect(p.patient.createMany).not.toHaveBeenCalled();   // existing -> not re-created
    expect(p.$transaction).toHaveBeenCalledTimes(1);        // lastAssessment updated (batched)
    expect(p.condition.updateMany).toHaveBeenCalledTimes(1); // existing conditions re-affirmed, not skipped
    expect(p.medication.updateMany).toHaveBeenCalledTimes(1);
  });

  it('a FRESH tenant skips the re-affirm update pass entirely (all net-new)', async () => {
    p.patient.findMany.mockResolvedValue([]); // none exist
    await writePatients([patientRow('A')], 'h1', 'j', 'hf');
    expect(p.patient.createMany).toHaveBeenCalledTimes(1);
    expect(p.$transaction).not.toHaveBeenCalled();
    expect(p.condition.updateMany).not.toHaveBeenCalled();
    expect(p.medication.updateMany).not.toHaveBeenCalled();
  });
});
