/**
 * AUDIT-222: rule identity in the gap write path.
 *
 * DEFECT (measured in production 2026-07-29, tenant demo-synthea-threaded): both runners matched
 * stored-vs-detected gaps on `gapType::module`, a key COARSER than rule identity. 357 of 368 rules
 * (97.0%) share a bucket with at least one sibling, so the key produced three failure modes:
 *
 *   1. SHADOWING - `new Map(existing.map(...))` keeps only the LAST id per key, so exactly one row per
 *      patient-bucket is reachable by the refresh path. 31,108 of 65,251 stored rows (47.7%) were
 *      permanently unreachable.
 *   2. RELABELING - the one reachable row has its currentStatus overwritten by whichever sibling fires
 *      last (evidenced: 95 rows relabeled into the VD-ECHO-INTERVAL status in one run).
 *   3. SIBLING SUPPRESSION - when a bucket already holds a row, EVERY detected sibling routes to
 *      toUpdate against that single id and NO row is created for the genuinely-missing siblings:
 *      silent clinical under-reporting.
 *
 * FIX: `DetectedGap.ruleId` (registry-adopted where a confident canonical binding exists, else a frozen
 * `slug:` id) is persisted to `TherapyGap.ruleId`, and both runners match on patient + ruleId.
 *
 * These four proofs are written against POST-fix behavior and MUST fail on the pre-fix code
 * (see docs/audit/AUDIT_222_223_JOINT_DESIGN.md section 6.1). evaluateGapRules is mocked so the
 * detected set is controlled; prisma is mocked (no live DB) - this exercises the REAL runner write path.
 */

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    therapyGap: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    // AUDIT-224: the batch runner now opens and closes a durable run record.
    gapDetectionRun: {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn().mockResolvedValue({ id: 'run-1' }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/ingestion/gaps/gapRuleEngine', () => ({
  __esModule: true,
  evaluateGapRules: jest.fn(),
  RUNTIME_GAP_REGISTRY: [],
}));

import prisma from '../../src/lib/prisma';
import { evaluateGapRules } from '../../src/ingestion/gaps/gapRuleEngine';
import { runGapDetectionForPatient } from '../../src/ingestion/runGapDetectionForPatient';
import { runGapDetection } from '../../src/ingestion/gapDetectionRunner';

const p = prisma as any;
const evalMock = evaluateGapRules as unknown as jest.Mock;

const HOSPITAL = 'hosp-test-222';
const PATIENT = 'pat-222';

/** Minimal patient row the shared context builder accepts. */
const fixturePatient = (id: string = PATIENT) => ({
  id,
  isActive: true,
  dateOfBirth: '1960-01-01T00:00:00.000Z',
  gender: 'male',
  race: null,
  conditions: [],
  observations: [],
  medications: [],
  procedures: [],
});

/** A detected gap in the crowded IMAGING_OVERDUE/VALVULAR_DISEASE bucket. */
const gap = (ruleId: string, status: string) => ({
  ruleId,
  type: 'IMAGING_OVERDUE',
  module: 'VALVULAR_DISEASE',
  status,
  target: 'target',
  recommendations: {},
});

/** A stored row in that same bucket. */
const row = (id: string, ruleId: string | null, currentStatus = 'stored') => ({
  id,
  patientId: PATIENT,
  gapType: 'IMAGING_OVERDUE',
  module: 'VALVULAR_DISEASE',
  ruleId,
  currentStatus,
});

interface UpdateCall { id: string; status: string }

const updateCalls = (): UpdateCall[] =>
  p.therapyGap.updateMany.mock.calls.map((c: any[]) => ({
    id: c[0].where.id,
    status: c[0].data.currentStatus,
  }));

const createdRows = (): any[] =>
  p.therapyGap.createMany.mock.calls.flatMap((c: any[]) => c[0].data);

beforeEach(() => {
  jest.clearAllMocks();
  p.patient.findFirst.mockResolvedValue(fixturePatient());
  p.patient.count.mockResolvedValue(1);
  p.patient.findMany.mockReset();
  p.therapyGap.createMany.mockResolvedValue({ count: 0 });
  p.therapyGap.updateMany.mockResolvedValue({ count: 1 });
  p.$transaction.mockResolvedValue([]);
  p.gapDetectionRun.create.mockResolvedValue({ id: 'run-1' });
  p.gapDetectionRun.update.mockResolvedValue({ id: 'run-1' });
});

describe('AUDIT-222 proof 1: cross-rule clobbering', () => {
  it('refreshes only the matching rule row and CREATES the sibling instead of overwriting it', async () => {
    p.therapyGap.findMany.mockResolvedValue([row('row-A', 'gap-a')]);
    evalMock.mockReturnValue([gap('gap-a', 'A-status'), gap('gap-b', 'B-status')]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);

    // Pre-fix: BOTH detected gaps resolve to the single bucket key and update row-A (last wins),
    // so gap-b's clinical text overwrites gap-a's and nothing is created.
    expect(updateCalls()).toEqual([{ id: 'row-A', status: 'A-status' }]);
    const created = createdRows();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ ruleId: 'gap-b', currentStatus: 'B-status' });
  });
});

describe('AUDIT-222 proof 2: shadow rows', () => {
  it('refreshes EVERY stored row in the bucket, not just the last one loaded', async () => {
    p.therapyGap.findMany.mockResolvedValue([row('row-A', 'gap-a'), row('row-B', 'gap-b')]);
    evalMock.mockReturnValue([gap('gap-a', 'A-status'), gap('gap-b', 'B-status')]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);

    // Pre-fix: the Map collapses both rows to row-B, so row-A is never touched (shadow row).
    expect(updateCalls().sort((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: 'row-A', status: 'A-status' },
      { id: 'row-B', status: 'B-status' },
    ]);
    expect(createdRows()).toHaveLength(0);
  });
});

describe('AUDIT-222 proof 3: sibling suppression', () => {
  it('creates the missing siblings instead of collapsing them onto one stored row', async () => {
    p.therapyGap.findMany.mockResolvedValue([row('row-A', 'gap-a')]);
    evalMock.mockReturnValue([
      gap('gap-a', 'A-status'),
      gap('gap-b', 'B-status'),
      gap('gap-c', 'C-status'),
    ]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);

    // Pre-fix: 3 updates onto row-A, 0 creates -> two genuine clinical gaps are never persisted.
    expect(updateCalls()).toEqual([{ id: 'row-A', status: 'A-status' }]);
    expect(createdRows().map((r: any) => r.ruleId).sort()).toEqual(['gap-b', 'gap-c']);
  });
});

describe('AUDIT-222 proof 4: rename stability', () => {
  it('tracks a renamed status to its OWN row and never swaps sibling statuses', async () => {
    p.therapyGap.findMany.mockResolvedValue([
      row('row-A', 'gap-a', 'A-OLD-TEXT'),
      row('row-B', 'gap-b', 'B-status'),
    ]);
    evalMock.mockReturnValue([gap('gap-a', 'A-NEW-TEXT'), gap('gap-b', 'B-status')]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);

    // Identity is the ruleId, so a status rename updates the SAME row.
    // Pre-fix this fails (both updates land on row-B). It also guards the rejected option-(ii):
    // a status-based key would treat 'A-NEW-TEXT' as a new gap and CREATE a duplicate row.
    expect(updateCalls().sort((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: 'row-A', status: 'A-NEW-TEXT' },
      { id: 'row-B', status: 'B-status' },
    ]);
    expect(createdRows()).toHaveLength(0);
  });
});

describe('AUDIT-222: NULL-ruleId rows are inert (PR-A orphan semantics)', () => {
  it('never adopts a ruleId=NULL row; the detected gap creates its own row', async () => {
    // The 4,129 AUDIT-195/196 consolidation orphans carry ruleId NULL in PR-A. They must not be
    // silently re-pointed at an unrelated rule; their disposition is PR-B retire-with-reason.
    p.therapyGap.findMany.mockResolvedValue([row('row-orphan', null, 'retired rule text')]);
    evalMock.mockReturnValue([gap('gap-a', 'A-status')]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);

    expect(updateCalls()).toHaveLength(0);
    expect(createdRows()).toHaveLength(1);
    expect(createdRows()[0]).toMatchObject({ ruleId: 'gap-a' });
  });
});

describe('AUDIT-222: the batch runner carries the same identity key', () => {
  it('clobber proof holds through runGapDetection (batch path)', async () => {
    p.patient.findMany.mockResolvedValueOnce([fixturePatient()]).mockResolvedValue([]);
    p.therapyGap.findMany.mockResolvedValue([row('row-A', 'gap-a')]);
    evalMock.mockReturnValue([gap('gap-a', 'A-status'), gap('gap-b', 'B-status')]);

    const res = await runGapDetection(HOSPITAL);

    expect(updateCalls()).toEqual([{ id: 'row-A', status: 'A-status' }]);
    expect(createdRows()).toHaveLength(1);
    expect(createdRows()[0]).toMatchObject({ ruleId: 'gap-b' });
    expect(res.gapFlagsCreated).toBe(1);
    expect(res.gapFlagsUpdated).toBe(1);
  });
});

describe('AUDIT-222: the identity column is actually read back', () => {
  it('selects ruleId when loading existing gaps (both runners)', async () => {
    p.therapyGap.findMany.mockResolvedValue([]);
    evalMock.mockReturnValue([]);

    await runGapDetectionForPatient(PATIENT, HOSPITAL);
    expect(p.therapyGap.findMany.mock.calls[0][0].select).toHaveProperty('ruleId', true);

    jest.clearAllMocks();
    p.patient.findMany.mockResolvedValueOnce([fixturePatient()]).mockResolvedValue([]);
    p.patient.count.mockResolvedValue(1);
    p.therapyGap.findMany.mockResolvedValue([]);
    evalMock.mockReturnValue([]);

    await runGapDetection(HOSPITAL);
    expect(p.therapyGap.findMany.mock.calls[0][0].select).toHaveProperty('ruleId', true);
  });
});

describe('AUDIT-224: every batch run leaves a durable record', () => {
  it('opens a run record with the build SHA and closes it with the tallies + completeness', async () => {
    p.patient.findMany.mockResolvedValueOnce([fixturePatient()]).mockResolvedValue([]);
    p.patient.count.mockResolvedValue(1);
    p.therapyGap.findMany.mockResolvedValue([]);
    evalMock.mockReturnValue([gap('gap-a', 'A-status')]);

    await runGapDetection(HOSPITAL);

    expect(p.gapDetectionRun.create).toHaveBeenCalledTimes(1);
    const opened = p.gapDetectionRun.create.mock.calls[0][0].data;
    expect(opened).toMatchObject({ hospitalId: HOSPITAL, outcome: 'RUNNING' });
    expect(typeof opened.buildSha).toBe('string');

    expect(p.gapDetectionRun.update).toHaveBeenCalledTimes(1);
    const closed = p.gapDetectionRun.update.mock.calls[0][0].data;
    expect(closed).toMatchObject({
      patientsEvaluated: 1, gapsCreated: 1, gapsUpdated: 0, gapsResolved: 0,
      completenessFraction: 1, outcome: 'COMPLETED',
    });
    expect(closed.finishedAt).toBeInstanceOf(Date);
  });

  it('records ABORTED_INCOMPLETE and resolves NOTHING when the walk is truncated', async () => {
    // One patient walked, but the tenant holds 100 -> 1% completeness, far below the 90% gate.
    p.patient.findMany.mockResolvedValueOnce([fixturePatient()]).mockResolvedValue([]);
    p.patient.count.mockResolvedValue(100);
    p.therapyGap.findMany.mockResolvedValue([
      { id: 'row-stale', patientId: PATIENT, gapType: 'IMAGING_OVERDUE', module: 'VALVULAR_DISEASE',
        ruleId: 'gap-gone', currentStatus: 'Old text', identifiedAt: new Date('2026-01-01'),
        resolvedAt: null, resolvedBy: null },
    ]);
    evalMock.mockReturnValue([]); // nothing fires -> row-stale WOULD be a resolve target

    const res = await runGapDetection(HOSPITAL);

    expect(res.gapFlagsResolved).toBe(0);
    const closed = p.gapDetectionRun.update.mock.calls[0][0].data;
    expect(closed.outcome).toBe('ABORTED_INCOMPLETE');
    expect(closed.notes).toMatch(/Resolve pass WITHHELD/);
    // and crucially: no resolution write happened
    const resolveWrites = p.therapyGap.updateMany.mock.calls
      .filter((c: any[]) => c[0].data?.resolvedBy !== undefined);
    expect(resolveWrites).toHaveLength(0);
  });
});
