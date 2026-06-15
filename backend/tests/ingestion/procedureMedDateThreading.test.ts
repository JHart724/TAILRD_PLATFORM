/**
 * v3.0 ingest work-unit 1: engine-signature expansion + procedure/med-date threading.
 * Proves: (a) procedureCodes + med startDate reach evaluateGapRules from the runner,
 * (b) the engine signature is additive/backward-compatible (no existing call breaks),
 * (c) Synthea bundles' Procedure resources are extracted.
 */
import * as engine from '../../src/ingestion/gaps/gapRuleEngine';
import { extractResources } from '../../src/scripts/ingestSynthea';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: { findFirst: jest.fn() },
    therapyGap: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));
import prisma from '../../src/lib/prisma';
import { runGapDetectionForPatient } from '../../src/ingestion/runGapDetectionForPatient';

describe('engine signature - additive + backward-compatible', () => {
  it('accepts the new procedureCodes 8th param and produces identical output to omitting it', () => {
    const dx = ['I50.20'];
    const labs = { lvef: 30 };
    const meds = ['20352']; // carvedilol IN (already expanded)
    const without = engine.evaluateGapRules(dx, labs, meds, 70, 'MALE', undefined, []);
    const withProc = engine.evaluateGapRules(dx, labs, meds, 70, 'MALE', undefined, [], ['33533', '232717009']);
    expect(withProc.length).toBe(without.length); // no gap consumes procedureCodes yet (threading only)
  });

  it('accepts meds records carrying a startDate (new optional MedicationDose field)', () => {
    const out = engine.evaluateGapRules(
      ['I50.20'], { lvef: 30 }, ['20352'], 70, 'MALE', undefined,
      [{ rxNormCode: '20352', startDate: '2026-01-01' } as any],
    );
    expect(Array.isArray(out)).toBe(true); // does not throw; startDate is tolerated
  });
});

describe('runner threading - procedureCodes + med startDate reach the engine', () => {
  it('passes the patient procedure codes (CPT + SNOMED) and meds startDate to evaluateGapRules', async () => {
    const spy = jest.spyOn(engine, 'evaluateGapRules').mockReturnValue([]);
    (prisma as any).patient.findFirst.mockResolvedValue({
      id: 'p1',
      hospitalId: 'h1',
      isActive: true,
      dateOfBirth: new Date('1955-01-01'),
      gender: 'MALE',
      race: 'WHITE',
      conditions: [{ icd10Code: 'I50.20' }],
      observations: [],
      medications: [{ rxNormCode: '20352', doseValue: 25, startDate: new Date('2026-01-15') }],
      procedures: [{ cptCode: '33533', snomedCode: '232717009', procedureName: 'CABG' }],
    });

    await runGapDetectionForPatient('p1', 'h1');

    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0];
    const procedureCodes = args[7] as string[]; // 8th positional arg
    expect(procedureCodes).toEqual(expect.arrayContaining(['33533', '232717009']));
    const medsArg = args[6] as any[]; // 7th positional arg
    expect(medsArg[0].startDate).toBeInstanceOf(Date);
    spy.mockRestore();
  });
});

describe('Synthea ingestion - Procedure resources extracted from the bundle', () => {
  it('extractResources picks up Procedure resources (previously dropped)', () => {
    const bundle = {
      entry: [
        { resource: { resourceType: 'Patient', id: 'pt1' } },
        { resource: { resourceType: 'Condition', id: 'c1' } },
        { resource: { resourceType: 'Procedure', id: 'proc1', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '232717009', display: 'CABG' }] }, performedDateTime: '2026-02-01' } },
      ],
    };
    const extracted = extractResources(bundle);
    expect(extracted.procedures).toHaveLength(1);
    expect(extracted.procedures[0].id).toBe('proc1');
    expect(extracted.procedures[0].code.coding[0].code).toBe('232717009');
  });

  it('returns an empty procedures array when the bundle has none (backward-compatible)', () => {
    const extracted = extractResources({ entry: [{ resource: { resourceType: 'Patient', id: 'p' } }] });
    expect(extracted.procedures).toEqual([]);
  });
});
