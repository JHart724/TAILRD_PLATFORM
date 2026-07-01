/**
 * AUDIT-193: re-ingest status-change capture.
 *
 * The AUDIT-192 batched write re-affirmed everything ACTIVE on re-ingest and never deactivated what ended, so
 * month-2+ extracts computed gaps against a stale "everything ever seen is still ACTIVE" picture. This proves:
 *   - STOP-parse (both modes): a med/dx with a STOP date is written DISCONTINUED+endDate / RESOLVED+abatementDate.
 *   - deactivate-diff (full mode only, guarded): rows absent from the new extract are deactivated.
 *   - completeness guard: a truncated extract (< 90% of stored count) ABORTS the deactivate-diff with a
 *     structured completenessError (fail-loud), while STOP-parse still applies.
 *   - per-patient scoping: the diff is scoped to patients PRESENT in the extract (absent patients untouched).
 *   - delta mode: the deactivate-diff is skipped entirely.
 *   - runner companion fix: the conditions query excludes exactly RESOLVED + INACTIVE (a deactivated condition
 *     drops from gap computation) while KEEPING genuinely-active RECURRENCE/RELAPSE (no over-deactivation).
 * prisma is mocked (no live DB).
 */
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    condition: { createMany: jest.fn().mockResolvedValue({ count: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    medication: { createMany: jest.fn().mockResolvedValue({ count: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    observation: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    therapyGap: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

import prisma from '../../src/lib/prisma';
import { writePatients } from '../../src/ingestion/patientWriter';
import { runGapDetectionForPatient } from '../../src/ingestion/runGapDetectionForPatient';
import { ParsedRow } from '../../src/ingestion/csvParser';
import { MedicationStatus, ConditionClinicalStatus } from '@prisma/client';

const p = prisma as any;

const row = (opts: {
  meds?: Array<{ rx: string; stop?: string | null }>;
  conds?: Array<{ icd: string; stop?: string | null }>;
} = {}): ParsedRow => {
  const conds = opts.conds ?? [{ icd: 'I50.9' }];
  return {
    rowNumber: 2,
    data: {
      patient_id: 'P1', age: 65, sex: 'F', encounter_date: '2024-02-01T00:00:00.000Z',
      primary_diagnosis: conds[0].icd,
      secondary_diagnoses: conds.slice(1).map((c) => c.icd),
      condition_records: conds.map((c) => ({ icd10Code: c.icd, stopDate: c.stop ?? null })),
      medication_records: (opts.meds ?? []).map((m) => ({ rxNormCode: m.rx, medicationName: m.rx, startDate: '2024-01-01', stopDate: m.stop ?? null })),
    },
    errors: [], warnings: [],
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  p.patient.findMany.mockResolvedValue([]);
  p.patient.count.mockResolvedValue(0);
  p.condition.findMany.mockResolvedValue([]);
  p.medication.findMany.mockResolvedValue([]);
});

describe('AUDIT-193 STOP-parse: a med/dx with a STOP date is written deactivated (fresh ingest, both modes)', () => {
  it('a med with STOP -> DISCONTINUED + endDate (not ACTIVE)', async () => {
    await writePatients([row({ meds: [{ rx: '197361', stop: '2024-06-01' }] })], 'h1', 'j', 'm');
    const med = p.medication.createMany.mock.calls[0][0].data[0];
    expect(med.status).toBe(MedicationStatus.DISCONTINUED);
    expect(med.endDate).toEqual(new Date('2024-06-01'));
  });
  it('a med without STOP -> ACTIVE + endDate null', async () => {
    await writePatients([row({ meds: [{ rx: '197361' }] })], 'h1', 'j', 'm');
    const med = p.medication.createMany.mock.calls[0][0].data[0];
    expect(med.status).toBe(MedicationStatus.ACTIVE);
    expect(med.endDate).toBeNull();
  });
  it('a dx with STOP -> RESOLVED + abatementDate; without STOP -> ACTIVE', async () => {
    await writePatients([row({ conds: [{ icd: 'I50.9', stop: '2024-05-01' }, { icd: 'I25.10' }] })], 'h1', 'j', 'm');
    const data = p.condition.createMany.mock.calls[0][0].data;
    const resolved = data.find((c: any) => c.icd10Code === 'I50.9');
    const active = data.find((c: any) => c.icd10Code === 'I25.10');
    expect(resolved.clinicalStatus).toBe(ConditionClinicalStatus.RESOLVED);
    expect(resolved.abatementDate).toEqual(new Date('2024-05-01'));
    expect(active.clinicalStatus).toBe(ConditionClinicalStatus.ACTIVE);
    expect(active.abatementDate).toBeNull();
  });
  it('STOP-parse applies in DELTA mode too (explicit end date is unambiguous)', async () => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::P1', mrn: 'P1' }]);
    p.patient.count.mockResolvedValue(1);
    await writePatients([row({ meds: [{ rx: '197361', stop: '2024-06-01' }] })], 'h1', 'j', 'm', 'delta');
    // re-ingest ended pass runs regardless of mode: medication.updateMany called with DISCONTINUED
    const call = p.medication.updateMany.mock.calls.find((c: any[]) => c[0].data.status === MedicationStatus.DISCONTINUED);
    expect(call).toBeDefined();
  });
});

describe('AUDIT-193 deactivate-diff (full mode, guard passes): absent rows deactivated', () => {
  beforeEach(() => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::P1', mrn: 'P1' }]); // existing tenant
    p.patient.count.mockResolvedValue(1); // distinctNew(1) >= 90% of stored(1) -> guard passes
  });
  it('an existing ACTIVE med absent from the new extract is DISCONTINUED', async () => {
    p.medication.findMany.mockResolvedValue([{ id: 'h1::P1-rx-OLD' }]); // existing ACTIVE, not in new extract
    await writePatients([row({ meds: [{ rx: '197361' }] })], 'h1', 'j', 'm', 'full');
    const diff = p.medication.updateMany.mock.calls.find((c: any[]) => Array.isArray(c[0].where.id?.in) && c[0].where.id.in.includes('h1::P1-rx-OLD'));
    expect(diff).toBeDefined();
    expect(diff[0].data.status).toBe(MedicationStatus.DISCONTINUED);
  });
  it('an existing ACTIVE condition absent from the new extract is INACTIVE', async () => {
    p.condition.findMany.mockResolvedValue([{ id: 'h1::P1-I99.9' }]); // existing ACTIVE dx not in new extract
    await writePatients([row({ conds: [{ icd: 'I50.9' }] })], 'h1', 'j', 'm', 'full');
    const diff = p.condition.updateMany.mock.calls.find((c: any[]) => Array.isArray(c[0].where.id?.in) && c[0].where.id.in.includes('h1::P1-I99.9'));
    expect(diff).toBeDefined();
    expect(diff[0].data.clinicalStatus).toBe(ConditionClinicalStatus.INACTIVE);
  });
  it('a still-present row is NOT deactivated (only absent rows)', async () => {
    p.medication.findMany.mockResolvedValue([{ id: 'h1::P1-rx-197361' }]); // present in the new extract
    await writePatients([row({ meds: [{ rx: '197361' }] })], 'h1', 'j', 'm', 'full');
    const diff = p.medication.updateMany.mock.calls.find((c: any[]) => Array.isArray(c[0].where.id?.in) && c[0].where.id.in.includes('h1::P1-rx-197361') && c[0].data.status === MedicationStatus.DISCONTINUED);
    expect(diff).toBeUndefined();
  });
  it('per-patient scoping: the diff findMany is scoped to patients PRESENT in the extract', async () => {
    await writePatients([row({ meds: [{ rx: '197361' }] })], 'h1', 'j', 'm', 'full');
    expect(p.medication.findMany.mock.calls[0][0].where.patientId.in).toEqual(['h1::P1']);
    expect(p.medication.findMany.mock.calls[0][0].where.hospitalId).toBe('h1');
  });
});

describe('AUDIT-193 completeness guard: truncated extract ABORTS the deactivate-diff (fail-loud)', () => {
  it('extract < 90% of stored count -> structured completenessError + diff NOT run; STOP-parse still applies', async () => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::P1', mrn: 'P1' }]);
    p.patient.count.mockResolvedValue(100); // 1 new vs 100 stored -> below the 90% band
    const result = await writePatients([row({ meds: [{ rx: '197361', stop: '2024-06-01' }] })], 'h1', 'j', 'm', 'full');
    expect(result.completenessErrors).toHaveLength(1);
    expect(result.completenessErrors[0].message).toContain('IngestCompletenessError');
    // deactivate-diff NOT run: the existing-ACTIVE-rows findMany is never called
    expect(p.medication.findMany).not.toHaveBeenCalled();
    expect(p.condition.findMany).not.toHaveBeenCalled();
    // but STOP-parse still applied: the med with an explicit STOP is still DISCONTINUED
    const call = p.medication.updateMany.mock.calls.find((c: any[]) => c[0].data.status === MedicationStatus.DISCONTINUED);
    expect(call).toBeDefined();
  });
});

describe('AUDIT-193 delta mode: deactivate-diff skipped entirely', () => {
  it('delta mode never runs the diff findMany (absence != ended in a delta extract)', async () => {
    p.patient.findMany.mockResolvedValue([{ id: 'h1::P1', mrn: 'P1' }]);
    p.patient.count.mockResolvedValue(1);
    const result = await writePatients([row({ meds: [{ rx: '197361' }] })], 'h1', 'j', 'm', 'delta');
    expect(result.completenessErrors).toHaveLength(0);
    expect(p.medication.findMany).not.toHaveBeenCalled();
    expect(p.condition.findMany).not.toHaveBeenCalled();
  });
});

describe('AUDIT-193 runner companion fix: conditions query excludes only RESOLVED + INACTIVE', () => {
  it('the conditions include filter is clinicalStatus notIn [RESOLVED, INACTIVE] (keeps ACTIVE/RECURRENCE/RELAPSE)', async () => {
    p.patient.findFirst.mockResolvedValue({
      id: 'p', hospitalId: 'h', isActive: true, dateOfBirth: new Date('1960-01-01'),
      gender: 'FEMALE', race: null, conditions: [], medications: [], observations: [], procedures: [],
    });
    await runGapDetectionForPatient('p', 'h');
    const arg = p.patient.findFirst.mock.calls[0][0];
    expect(arg.include.conditions.where.clinicalStatus.notIn).toEqual(['RESOLVED', 'INACTIVE']);
    // genuinely-active statuses are NOT excluded -> no over-deactivation
    expect(arg.include.conditions.where.clinicalStatus.notIn).not.toContain('ACTIVE');
    expect(arg.include.conditions.where.clinicalStatus.notIn).not.toContain('RECURRENCE');
    expect(arg.include.conditions.where.clinicalStatus.notIn).not.toContain('RELAPSE');
    // medications still filter status ACTIVE (the mechanism that already worked)
    expect(arg.include.medications.where.status).toBe('ACTIVE');
  });
});
