/**
 * AUDIT-148 Slice 3 - the trials module's first WRITE of a clinical decision.
 *
 * Exercises the REAL route handlers (trials.ts refer + registry.ts update/submit/approve/reject) through
 * supertest, with prisma, writeAuditLog, and the matcher mocked. The auth middleware is stubbed so each
 * request injects its own req.user via an x-test-user header; authorizeRole is re-implemented with the
 * SAME logic as the real middleware (minus the DEMO_MODE bypass, which must be OFF here) so the role
 * gates are genuinely enforced.
 *
 * Coverage: audit-write per mutation; approve/reject HIPAA-grade 500 on audit DB failure; role gates
 * (PHYSICIAN cannot approve, QUALITY_DIRECTOR can); status guards (409); tenant 404; refer accepts
 * INDETERMINATE + ELIGIBLE (NOT gated on eligibility); refer records matchStatusAtReferral; reject
 * requires a reason; audit prev/new carry a fields DIGEST, never raw PHI.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    clinicalTrial: { findFirst: jest.fn() },
    patient: { findFirst: jest.fn() },
    trialReferral: { create: jest.fn() },
    registryCase: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../../src/middleware/auditLogger', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/ingestion/buildPatientEvalContext', () => ({
  buildPatientEvalContext: jest.fn(() => ({ age: 70, gender: 'M' })),
}));

jest.mock('../../src/services/trialMatchService', () => ({
  evaluateTrialMatch: jest.fn(() => ({ status: 'ELIGIBLE', criteriaResults: [], indeterminateSignals: [] })),
}));

// Stub authenticateToken/requireMFA; re-implement authorizeRole with the real logic (DEMO_MODE bypass off).
jest.mock('../../src/middleware/auth', () => ({
  __esModule: true,
  authenticateToken: (req: any, _res: any, next: any) => {
    const hdr = req.headers['x-test-user'];
    if (hdr) req.user = JSON.parse(hdr);
    next();
  },
  requireMFA: (_req: any, _res: any, next: any) => next(),
  authorizeRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied', timestamp: new Date().toISOString() });
    }
    next();
  },
}));

import prisma from '../../src/lib/prisma';
import { writeAuditLog } from '../../src/middleware/auditLogger';
import { evaluateTrialMatch } from '../../src/services/trialMatchService';
import trialsRouter from '../../src/routes/trials';
import registryRouter from '../../src/routes/registry';

const db = prisma as any;
const mockAudit = writeAuditLog as jest.Mock;
const mockEval = evaluateTrialMatch as unknown as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/trials', trialsRouter);
app.use('/api/registry', registryRouter);

const PHYSICIAN = { userId: 'u-phys', role: 'PHYSICIAN', hospitalId: 'h1', email: 'phys@x.test' };
const NURSE = { userId: 'u-nurse', role: 'NURSE_MANAGER', hospitalId: 'h1', email: 'nurse@x.test' };
const QD = { userId: 'u-qd', role: 'QUALITY_DIRECTOR', hospitalId: 'h1', email: 'qd@x.test' };

const asUser = (u: object) => JSON.stringify(u);

beforeEach(() => {
  jest.clearAllMocks();
  mockAudit.mockResolvedValue(undefined);
  mockEval.mockReturnValue({ status: 'ELIGIBLE', criteriaResults: [], indeterminateSignals: [] });
});

// ─── POST /api/trials/:trialId/refer ─────────────────────────────────────────────

describe('POST /api/trials/:trialId/refer', () => {
  const wireHappyRefer = (matchStatus = 'ELIGIBLE') => {
    db.clinicalTrial.findFirst.mockResolvedValue({ id: 't1', criteria: [] });
    db.patient.findFirst.mockResolvedValue({ id: 'p1', hospitalId: 'h1', conditions: [], medications: [], observations: [], procedures: [] });
    mockEval.mockReturnValue({ status: matchStatus, criteriaResults: [], indeterminateSignals: [] });
    db.trialReferral.create.mockResolvedValue({
      id: 'r1', patientId: 'p1', trialId: 't1', status: 'PENDING',
      matchStatusAtReferral: matchStatus, referredBy: 'u-phys', referredAt: new Date(),
    });
  };

  test('ELIGIBLE patient -> 201, records matchStatusAtReferral, writes TRIAL_REFERRAL_CREATED audit', async () => {
    wireHappyRefer('ELIGIBLE');
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(PHYSICIAN)).send({ patientId: 'p1' });
    expect(res.status).toBe(201);
    expect(res.body.data.matchStatusAtReferral).toBe('ELIGIBLE');
    expect(mockAudit).toHaveBeenCalledTimes(1);
    const [, action, resourceType, resourceId, , prev, next] = mockAudit.mock.calls[0];
    expect(action).toBe('TRIAL_REFERRAL_CREATED');
    expect(resourceType).toBe('TrialReferral');
    expect(resourceId).toBe('r1');
    expect(prev).toBeNull();
    expect(next).toEqual({ patientId: 'p1', trialId: 't1', matchStatusAtReferral: 'ELIGIBLE' });
  });

  test('INDETERMINATE patient is NOT gated -> 201 (a coordinator may refer to drive the missing test)', async () => {
    wireHappyRefer('INDETERMINATE');
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(NURSE)).send({ patientId: 'p1' });
    expect(res.status).toBe(201);
    expect(res.body.data.matchStatusAtReferral).toBe('INDETERMINATE');
    expect(db.trialReferral.create).toHaveBeenCalledTimes(1);
  });

  test('INELIGIBLE patient is NOT gated either -> 201', async () => {
    wireHappyRefer('INELIGIBLE');
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(PHYSICIAN)).send({ patientId: 'p1' });
    expect(res.status).toBe(201);
    expect(res.body.data.matchStatusAtReferral).toBe('INELIGIBLE');
  });

  test('trial outside tenant -> 404 (no existence leak)', async () => {
    db.clinicalTrial.findFirst.mockResolvedValue(null);
    const res = await request(app).post('/api/trials/tX/refer').set('x-test-user', asUser(PHYSICIAN)).send({ patientId: 'p1' });
    expect(res.status).toBe(404);
    expect(db.trialReferral.create).not.toHaveBeenCalled();
  });

  test('patient outside tenant -> 404 (no existence leak)', async () => {
    db.clinicalTrial.findFirst.mockResolvedValue({ id: 't1', criteria: [] });
    db.patient.findFirst.mockResolvedValue(null);
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(PHYSICIAN)).send({ patientId: 'pX' });
    expect(res.status).toBe(404);
    expect(db.trialReferral.create).not.toHaveBeenCalled();
  });

  test('duplicate referral (unique violation P2002) -> 409', async () => {
    wireHappyRefer('ELIGIBLE');
    db.trialReferral.create.mockRejectedValue({ code: 'P2002' });
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(PHYSICIAN)).send({ patientId: 'p1' });
    expect(res.status).toBe(409);
  });

  test('missing patientId -> 400 validation', async () => {
    const res = await request(app).post('/api/trials/t1/refer').set('x-test-user', asUser(PHYSICIAN)).send({});
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/registry/cases/:caseId ───────────────────────────────────────────

describe('PATCH /api/registry/cases/:caseId', () => {
  test('DRAFT case -> 200, writes REGISTRY_CASE_UPDATED with a fields DIGEST (never raw PHI)', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'DRAFT', fields: { mrn: 'SECRET' }, hospitalId: 'h1' });
    db.registryCase.update.mockResolvedValue({ id: 'c1', patientId: 'p1', registryType: 'NCDR', status: 'DRAFT', fields: { mrn: 'SECRET2' }, createdAt: new Date(), updatedAt: new Date() });
    const res = await request(app).patch('/api/registry/cases/c1').set('x-test-user', asUser(PHYSICIAN)).send({ fields: { mrn: 'SECRET2' } });
    expect(res.status).toBe(200);
    expect(mockAudit).toHaveBeenCalledTimes(1);
    const [, action, , , , prev, next] = mockAudit.mock.calls[0];
    expect(action).toBe('REGISTRY_CASE_UPDATED');
    expect(Object.keys(prev).sort()).toEqual(['fieldsHash', 'status']);
    expect(Object.keys(next).sort()).toEqual(['fieldsHash', 'status']);
    expect(prev.fieldsHash).toMatch(/^[a-f0-9]{64}$/);
    // Raw PHI must NOT appear anywhere in the audit payload.
    expect(JSON.stringify([prev, next])).not.toContain('SECRET');
  });

  test('non-DRAFT case -> 409 (only DRAFT is editable)', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'SUBMITTED', fields: {}, hospitalId: 'h1' });
    const res = await request(app).patch('/api/registry/cases/c1').set('x-test-user', asUser(PHYSICIAN)).send({ fields: { a: 1 } });
    expect(res.status).toBe(409);
    expect(db.registryCase.update).not.toHaveBeenCalled();
  });

  test('cross-tenant case -> 404', async () => {
    db.registryCase.findFirst.mockResolvedValue(null);
    const res = await request(app).patch('/api/registry/cases/cX').set('x-test-user', asUser(PHYSICIAN)).send({ fields: { a: 1 } });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/registry/cases/:caseId/submit ─────────────────────────────────────

describe('POST /api/registry/cases/:caseId/submit', () => {
  test('DRAFT -> SUBMITTED -> 200, writes REGISTRY_CASE_SUBMITTED', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'DRAFT', fields: {}, hospitalId: 'h1' });
    db.registryCase.update.mockResolvedValue({ id: 'c1', patientId: 'p1', registryType: 'NCDR', status: 'SUBMITTED', fields: {}, createdAt: new Date(), updatedAt: new Date() });
    const res = await request(app).post('/api/registry/cases/c1/submit').set('x-test-user', asUser(PHYSICIAN)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUBMITTED');
    const [, action, , , , prev, next] = mockAudit.mock.calls[0];
    expect(action).toBe('REGISTRY_CASE_SUBMITTED');
    expect(prev).toEqual({ status: 'DRAFT' });
    expect(next).toEqual({ status: 'SUBMITTED' });
  });

  test('non-DRAFT -> 409', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'APPROVED', fields: {}, hospitalId: 'h1' });
    const res = await request(app).post('/api/registry/cases/c1/submit').set('x-test-user', asUser(PHYSICIAN)).send({});
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/registry/cases/:caseId/approve ────────────────────────────────────

describe('POST /api/registry/cases/:caseId/approve', () => {
  const wireSubmitted = () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'SUBMITTED', fields: {}, hospitalId: 'h1' });
    db.registryCase.update.mockResolvedValue({ id: 'c1', patientId: 'p1', registryType: 'NCDR', status: 'APPROVED', fields: {}, createdAt: new Date(), updatedAt: new Date() });
  };

  test('QUALITY_DIRECTOR approves SUBMITTED -> 200 APPROVED, writes REGISTRY_CASE_APPROVED with approvedBy', async () => {
    wireSubmitted();
    const res = await request(app).post('/api/registry/cases/c1/approve').set('x-test-user', asUser(QD)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(db.registryCase.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'APPROVED', approvedBy: 'u-qd' }),
    }));
    const [, action, , , , prev, next] = mockAudit.mock.calls[0];
    expect(action).toBe('REGISTRY_CASE_APPROVED');
    expect(prev).toEqual({ status: 'SUBMITTED' });
    expect(next).toEqual({ status: 'APPROVED', approvedBy: 'u-qd' });
  });

  test('PHYSICIAN (maker) cannot approve -> 403', async () => {
    const res = await request(app).post('/api/registry/cases/c1/approve').set('x-test-user', asUser(PHYSICIAN)).send({});
    expect(res.status).toBe(403);
    expect(db.registryCase.update).not.toHaveBeenCalled();
  });

  test('approve a non-SUBMITTED case -> 409', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'DRAFT', fields: {}, hospitalId: 'h1' });
    const res = await request(app).post('/api/registry/cases/c1/approve').set('x-test-user', asUser(QD)).send({});
    expect(res.status).toBe(409);
  });

  test('HIPAA-grade: audit DB write failure -> 500', async () => {
    wireSubmitted();
    mockAudit.mockRejectedValueOnce(new Error('Audit DB write failed for HIPAA-grade event: REGISTRY_CASE_APPROVED'));
    const res = await request(app).post('/api/registry/cases/c1/approve').set('x-test-user', asUser(QD)).send({});
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/registry/cases/:caseId/reject ─────────────────────────────────────

describe('POST /api/registry/cases/:caseId/reject', () => {
  const wireSubmitted = () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'SUBMITTED', fields: {}, hospitalId: 'h1' });
    db.registryCase.update.mockResolvedValue({ id: 'c1', patientId: 'p1', registryType: 'NCDR', status: 'REJECTED', fields: {}, createdAt: new Date(), updatedAt: new Date() });
  };

  test('QUALITY_DIRECTOR rejects SUBMITTED with reason -> 200 REJECTED, writes REGISTRY_CASE_REJECTED with reason', async () => {
    wireSubmitted();
    const res = await request(app).post('/api/registry/cases/c1/reject').set('x-test-user', asUser(QD)).send({ reason: 'Missing echo' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
    const [, action, , , , prev, next] = mockAudit.mock.calls[0];
    expect(action).toBe('REGISTRY_CASE_REJECTED');
    expect(prev).toEqual({ status: 'SUBMITTED' });
    expect(next).toEqual({ status: 'REJECTED', reason: 'Missing echo' });
  });

  test('reject WITHOUT a reason -> 400', async () => {
    const res = await request(app).post('/api/registry/cases/c1/reject').set('x-test-user', asUser(QD)).send({});
    expect(res.status).toBe(400);
    expect(db.registryCase.update).not.toHaveBeenCalled();
  });

  test('PHYSICIAN (maker) cannot reject -> 403', async () => {
    const res = await request(app).post('/api/registry/cases/c1/reject').set('x-test-user', asUser(PHYSICIAN)).send({ reason: 'x' });
    expect(res.status).toBe(403);
  });

  test('reject a non-SUBMITTED case -> 409', async () => {
    db.registryCase.findFirst.mockResolvedValue({ id: 'c1', status: 'DRAFT', fields: {}, hospitalId: 'h1' });
    const res = await request(app).post('/api/registry/cases/c1/reject').set('x-test-user', asUser(QD)).send({ reason: 'x' });
    expect(res.status).toBe(409);
  });

  test('HIPAA-grade: audit DB write failure -> 500', async () => {
    wireSubmitted();
    mockAudit.mockRejectedValueOnce(new Error('Audit DB write failed for HIPAA-grade event: REGISTRY_CASE_REJECTED'));
    const res = await request(app).post('/api/registry/cases/c1/reject').set('x-test-user', asUser(QD)).send({ reason: 'x' });
    expect(res.status).toBe(500);
  });
});
