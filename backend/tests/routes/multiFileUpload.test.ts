/**
 * PHASE 3: multi-file upload route (POST /api/data/upload/multi).
 *
 * End-to-end orchestration test: real parseMultiFileCSV (parse + join + crosswalk) wired through the
 * route to a mocked writePatients + runGapDetection (the DB-touching steps), mirroring the established
 * mock pattern. Proves: a file SET is accepted and processed; a missing required file rejects with a
 * structured error (no partial ingest - writer/detector not called); optional-file absence is a warning
 * not a failure; and hospitalId comes from the JWT, never the request body.
 */
import request from 'supertest';
import express from 'express';

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { hospitalId: 'h1', userId: 'u1' };
    next();
  },
}));
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    uploadJob: {
      create: jest.fn().mockResolvedValue({ id: 'job1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));
jest.mock('../../src/ingestion/patientWriter', () => ({
  writePatients: jest.fn().mockResolvedValue({ patientsCreated: 2, patientsUpdated: 0, observationsWritten: 5, errors: [] }),
}));
jest.mock('../../src/ingestion/gapDetectionRunner', () => ({
  runGapDetection: jest.fn().mockResolvedValue({ patientsEvaluated: 2, gapFlagsCreated: 7, gapFlagsUpdated: 0, gapFlagsResolved: 0 }),
}));
jest.mock('../../src/middleware/auditLogger', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

import { writePatients } from '../../src/ingestion/patientWriter';
import { runGapDetection } from '../../src/ingestion/gapDetectionRunner';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const uploadRouter = require('../../src/routes/upload');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/api/data', uploadRouter);

const PATIENTS = `Id,BIRTHDATE,DEATHDATE,FIRST,MIDDLE,LAST,RACE,ETHNICITY,GENDER,ZIP
P1,1960-06-15,,Jane,Q,Doe,white,nonhispanic,F,10001
P2,1975-03-02,,John,R,Roe,black,nonhispanic,M,10002`;
const CONDITIONS = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION
2020-01-01,,P1,E1,http://snomed.info/sct,49436004,Atrial fibrillation
2021-02-01,,P1,E2,http://snomed.info/sct,84114007,Heart failure
2022-03-01,,P2,E3,http://snomed.info/sct,9999999,Some unmapped disorder`;
const OBSERVATIONS = `DATE,PATIENT,ENCOUNTER,CATEGORY,CODE,DESCRIPTION,VALUE,UNITS,TYPE
2021-02-01,P1,E2,procedure,10230-1,Ejection fraction,35,%,numeric`;
const PROCEDURES = `START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION
2021-02-01,,P1,E2,http://snomed.info/sct,433236007,Insertion of implant`;
const MEDICATIONS = `START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION
2021-02-01,,P1,PAY1,E2,197361,Lisinopril 10 MG Oral Tablet`;
const ENCOUNTERS = `Id,START,STOP,PATIENT,ORGANIZATION,PROVIDER,PAYER,ENCOUNTERCLASS,CODE,DESCRIPTION
E2,2021-02-01T10:00:00Z,2021-02-01T11:00:00Z,P1,ORG1,PRV1,PAY1,outpatient,185349003,Encounter for check up`;

const fullFiles = () => ({
  patients: PATIENTS,
  conditions: CONDITIONS,
  observations: OBSERVATIONS,
  procedures: PROCEDURES,
  medications: MEDICATIONS,
  encounters: ENCOUNTERS,
});

beforeEach(() => jest.clearAllMocks());

describe('POST /api/data/upload/multi - happy path', () => {
  it('accepts a file SET and surfaces the structured result end-to-end', async () => {
    const res = await request(app).post('/api/data/upload/multi').send({ files: fullFiles(), moduleId: 'hf' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETE');
    expect(res.body.summary.patientsIngested).toBe(2);
    expect(res.body.summary.gapsIdentified).toBe(7);
    // crosswalk miss surfaced (no silent drop)
    expect(res.body.unmappedConditionCodes.totalUnmapped).toBe(1);
    expect(res.body.unmappedConditionCodes.unmappedCodes).toContainEqual({ snomed: '9999999', count: 1 });
    // SNOMED procedure left untranslated (no SNOMED->CPT map)
    expect(res.body.procedureCodesUntranslated).toBe(1);
    expect(res.body.fileWarnings).toEqual([]); // all files present
    expect(writePatients).toHaveBeenCalledTimes(1);
    expect(runGapDetection).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/data/upload/multi - structured errors over silent defaults', () => {
  it('rejects the whole ingest with a structured error when a required file is missing (no partial ingest)', async () => {
    const files = fullFiles();
    delete (files as any).observations;
    const res = await request(app).post('/api/data/upload/multi').send({ files });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('FAILED');
    expect(res.body.fileErrors.some((e: any) => e.file === 'observations.csv')).toBe(true);
    expect(writePatients).not.toHaveBeenCalled(); // no partial ingest
    expect(runGapDetection).not.toHaveBeenCalled();
  });

  it('rejects when no files object / patients content is provided', async () => {
    const res = await request(app).post('/api/data/upload/multi').send({ moduleId: 'hf' });
    expect(res.status).toBe(400);
    expect(writePatients).not.toHaveBeenCalled();
  });
});

describe('POST /api/data/upload/multi - optional-file absence is a warning, not a failure', () => {
  it('processes successfully and surfaces a warning when an optional file is absent', async () => {
    const files = fullFiles();
    delete (files as any).medications;
    const res = await request(app).post('/api/data/upload/multi').send({ files });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETE');
    expect(res.body.fileWarnings.some((w: any) => w.file === 'medications.csv')).toBe(true);
    expect(writePatients).toHaveBeenCalledTimes(1); // still ingests
  });
});

describe('POST /api/data/upload/multi - hospitalId comes from the JWT, never the body', () => {
  it('ignores a hospitalId in the request body and uses req.user.hospitalId', async () => {
    const res = await request(app)
      .post('/api/data/upload/multi')
      .send({ files: fullFiles(), moduleId: 'hf', hospitalId: 'EVIL-HOSPITAL' });
    expect(res.status).toBe(200);
    // writePatients(rows, hospitalId, jobId, moduleId) - 2nd arg must be the JWT hospital, not the body value
    expect((writePatients as jest.Mock).mock.calls[0][1]).toBe('h1');
    expect((runGapDetection as jest.Mock).mock.calls[0][0]).toBe('h1');
  });
});
