/**
 * AUDIT-203 - clinical-decision writes absent from the HIPAA audit trail (the pattern class).
 *
 * Exercises the REAL route handlers AND the REAL writeAuditLog: only prisma (incl. auditLog.create),
 * the auth middleware, the two domain services, bcrypt, and emailService are mocked. So each test proves
 * the true route -> writeAuditLog -> prisma.auditLog.create integration, and the HIPAA-grade behavior is
 * the REAL HIPAA_GRADE_ACTIONS set: making prisma.auditLog.create reject drives a HIPAA-grade action to
 * 500 (writeAuditLog throws) and lets a best-effort action succeed (writeAuditLog swallows).
 *
 * Coverage: audit-write per mutation across all four routes; the contraindication OVERRIDE carries
 * before/after + the acting user; HIPAA-grade 500-on-audit-DB-fail vs best-effort success; no raw PHI in
 * any audit description.
 */

import express from 'express';
import request from 'supertest';

const mockRefSvc = {
  createManualReferral: jest.fn(),
  updateReferralStatus: jest.fn(),
  getReferralById: jest.fn(),
  getReferralByIdAcrossTenants: jest.fn(),
  getHospitalReferrals: jest.fn(),
  getHospitalReferralSummary: jest.fn(),
};
const mockPhenoSvc = {
  runPhenotypeScreening: jest.fn(),
  getPhenotypeById: jest.fn(),
  getPhenotypeByIdAcrossTenants: jest.fn(),
  updatePhenotypeStatus: jest.fn(),
  getPhenotypeHistory: jest.fn(),
  getPatientPhenotypeSummary: jest.fn(),
};

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    riskScoreAssessment: { create: jest.fn() },
    interventionTracking: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    contraindicationAssessment: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    loginSession: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

// Stub auth; re-implement authorizeRole with the real logic (DEMO_MODE bypass off).
jest.mock('../../src/middleware/auth', () => ({
  __esModule: true,
  authenticateToken: (req: any, _res: any, next: any) => {
    const hdr = req.headers['x-test-user'];
    if (hdr) req.user = JSON.parse(hdr);
    next();
  },
  requireMFA: (_req: any, _res: any, next: any) => next(),
  authorizeHospital: (_req: any, _res: any, next: any) => next(),
  authorizeRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied', timestamp: new Date().toISOString() });
    }
    next();
  },
}));

jest.mock('../../src/services/crossReferralService', () => {
  const actual = jest.requireActual('../../src/services/crossReferralService');
  return { ...actual, CrossReferralService: jest.fn(() => mockRefSvc) };
});
jest.mock('../../src/services/phenotypeService', () => {
  const actual = jest.requireActual('../../src/services/phenotypeService');
  return { ...actual, PhenotypeService: jest.fn(() => mockPhenoSvc) };
});
jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildPasswordResetEmail: jest.fn(() => ({ to: '', subject: '', html: '' })),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn().mockResolvedValue('newhash') }));

import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import referralsRouter from '../../src/routes/referrals';
import clinicalRouter from '../../src/routes/clinicalIntelligence';
import phenotypesRouter from '../../src/routes/phenotypes';
import accountSecurityRouter from '../../src/routes/accountSecurity';

const db = prisma as any;
const auditCreate = db.auditLog.create as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/referrals', referralsRouter);
app.use('/api/clinical-intelligence', clinicalRouter);
app.use('/api/phenotypes', phenotypesRouter);
app.use('/api/account-security', accountSecurityRouter);

const PHYS = { userId: 'u-phys', role: 'PHYSICIAN', hospitalId: 'h1', email: 'phys@x.test' };
const asUser = (u: object) => JSON.stringify(u);

// Pull the data arg out of the Nth prisma.auditLog.create call.
const auditData = (n = 0) => auditCreate.mock.calls[n][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  auditCreate.mockResolvedValue({ id: 'audit1' });
});

// ─── referrals.ts ────────────────────────────────────────────────────────────────

describe('referrals.ts audit writes', () => {
  test('POST /referrals -> writes CROSS_REFERRAL_CREATED', async () => {
    mockRefSvc.createManualReferral.mockResolvedValue({ id: 'r1', status: 'TRIGGERED', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY' });
    const res = await request(app).post('/api/referrals').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', type: 'HEART_FAILURE', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY', priority: 'HIGH', reason: 'VT', clinicalContext: {} });
    expect(res.status).toBe(201);
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const d = auditData();
    expect(d.action).toBe('CROSS_REFERRAL_CREATED');
    expect(d.resourceType).toBe('CrossReferral');
    expect(d.newValues).toEqual({ patientId: 'p1', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY', priority: 'HIGH' });
    expect(d.userId).toBe('u-phys');
  });

  test('PUT /referrals/:id/status -> writes CROSS_REFERRAL_STATUS_CHANGED with prev/new', async () => {
    mockRefSvc.getReferralById.mockResolvedValue({ id: 'r1', hospitalId: 'h1', status: 'TRIGGERED', patientId: 'p1' });
    mockRefSvc.updateReferralStatus.mockResolvedValue(undefined);
    const res = await request(app).put('/api/referrals/r1/status').set('x-test-user', asUser(PHYS)).send({ status: 'ACCEPTED' });
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('CROSS_REFERRAL_STATUS_CHANGED');
    expect(d.previousValues).toEqual({ status: 'TRIGGERED' });
    expect(d.newValues).toEqual({ status: 'ACCEPTED' });
  });

  test('HIPAA-grade: audit DB failure on create -> 500', async () => {
    mockRefSvc.createManualReferral.mockResolvedValue({ id: 'r1', status: 'TRIGGERED', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY' });
    auditCreate.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).post('/api/referrals').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', type: 'HEART_FAILURE', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY', priority: 'HIGH', reason: 'VT', clinicalContext: {} });
    expect(res.status).toBe(500);
  });
});

// ─── clinicalIntelligence.ts ───────────────────────────────────────────────────────

describe('clinicalIntelligence.ts audit writes', () => {
  test('POST /risk-scores -> RISK_SCORE_ASSESSED', async () => {
    db.riskScoreAssessment.create.mockResolvedValue({ id: 'rs1', patientId: 'p1', scoreType: 'MAGGIC', riskCategory: 'HIGH' });
    const res = await request(app).post('/api/clinical-intelligence/risk-scores').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', hospitalId: 'h1', module: 'HEART_FAILURE', scoreType: 'MAGGIC', totalScore: 12, riskCategory: 'HIGH', inputData: {}, interpretation: 'high risk' });
    expect(res.status).toBe(201);
    expect(auditData().action).toBe('RISK_SCORE_ASSESSED');
  });

  test('POST /interventions -> INTERVENTION_CREATED', async () => {
    db.interventionTracking.create.mockResolvedValue({ id: 'iv1', patientId: 'p1', module: 'CORONARY_INTERVENTION', category: 'PCI' });
    const res = await request(app).post('/api/clinical-intelligence/interventions').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', hospitalId: 'h1', module: 'CORONARY_INTERVENTION', interventionName: 'DES', category: 'PCI' });
    expect(res.status).toBe(201);
    expect(auditData().action).toBe('INTERVENTION_CREATED');
  });

  test('PATCH /interventions/:id/status -> INTERVENTION_UPDATED with prev/new', async () => {
    db.interventionTracking.findFirst.mockResolvedValue({ id: 'iv1', hospitalId: 'h1', status: 'PENDING' });
    db.interventionTracking.update.mockResolvedValue({ id: 'iv1', status: 'COMPLETED' });
    const res = await request(app).patch('/api/clinical-intelligence/interventions/iv1/status').set('x-test-user', asUser(PHYS)).send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('INTERVENTION_UPDATED');
    expect(d.previousValues).toEqual({ status: 'PENDING' });
    expect(d.newValues).toEqual({ status: 'COMPLETED' });
  });

  test('POST /contraindications -> CONTRAINDICATION_ASSESSED (best-effort)', async () => {
    db.contraindicationAssessment.create.mockResolvedValue({ id: 'c1', patientId: 'p1', module: 'HEART_FAILURE', level: 'ABSOLUTE' });
    const res = await request(app).post('/api/clinical-intelligence/contraindications').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', hospitalId: 'h1', module: 'HEART_FAILURE', therapyName: 'BB', therapyType: 'medication', level: 'ABSOLUTE', reasons: [] });
    expect(res.status).toBe(201);
    expect(auditData().action).toBe('CONTRAINDICATION_ASSESSED');
  });

  test('PATCH /contraindications/:id/override -> CONTRAINDICATION_OVERRIDDEN carries before/after + acting user', async () => {
    db.contraindicationAssessment.findFirst.mockResolvedValue({ id: 'c1', hospitalId: 'h1', overriddenBy: null, overrideReason: null });
    db.contraindicationAssessment.update.mockResolvedValue({ id: 'c1', overriddenBy: 'dr-smith', overrideReason: 'benefit outweighs risk' });
    const res = await request(app).patch('/api/clinical-intelligence/contraindications/c1/override').set('x-test-user', asUser(PHYS))
      .send({ overriddenBy: 'dr-smith', overrideReason: 'benefit outweighs risk' });
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('CONTRAINDICATION_OVERRIDDEN');
    expect(d.previousValues).toEqual({ overriddenBy: null, overrideReason: null });
    expect(d.newValues).toEqual({ overriddenBy: 'dr-smith', overrideReason: 'benefit outweighs risk' });
    expect(d.userId).toBe('u-phys'); // the acting user is captured by writeAuditLog
  });

  test('HIPAA-grade override: audit DB failure -> 500', async () => {
    db.contraindicationAssessment.findFirst.mockResolvedValue({ id: 'c1', hospitalId: 'h1', overriddenBy: null, overrideReason: null });
    db.contraindicationAssessment.update.mockResolvedValue({ id: 'c1', overriddenBy: 'dr-smith', overrideReason: 'x' });
    auditCreate.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).patch('/api/clinical-intelligence/contraindications/c1/override').set('x-test-user', asUser(PHYS))
      .send({ overriddenBy: 'dr-smith', overrideReason: 'x' });
    expect(res.status).toBe(500);
  });

  test('best-effort assess: audit DB failure does NOT 500 (still 201)', async () => {
    db.contraindicationAssessment.create.mockResolvedValue({ id: 'c1', patientId: 'p1', module: 'HEART_FAILURE', level: 'ABSOLUTE' });
    auditCreate.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).post('/api/clinical-intelligence/contraindications').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', hospitalId: 'h1', module: 'HEART_FAILURE', therapyName: 'BB', therapyType: 'medication', level: 'ABSOLUTE', reasons: [] });
    expect(res.status).toBe(201); // CONTRAINDICATION_ASSESSED is NOT in HIPAA_GRADE_ACTIONS
  });
});

// ─── phenotypes.ts ─────────────────────────────────────────────────────────────────

describe('phenotypes.ts audit writes', () => {
  test('POST /screen/:patientId -> PHENOTYPE_SCREENED (best-effort)', async () => {
    mockPhenoSvc.runPhenotypeScreening.mockResolvedValue([{ confidence: 0.9, status: 'SUSPECTED' }]);
    const res = await request(app).post('/api/phenotypes/screen/p1').set('x-test-user', asUser(PHYS)).send({});
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('PHENOTYPE_SCREENED');
    expect(d.newValues).toEqual({ patientId: 'p1', detectedCount: 1 });
  });

  test('PUT /:id/confirm -> PHENOTYPE_CONFIRMED with prev/new', async () => {
    mockPhenoSvc.getPhenotypeById.mockResolvedValue({ id: 'ph1', hospitalId: 'h1', status: 'SUSPECTED', patientId: 'p1', phenotypeName: 'HCM', confidence: 0.7 });
    mockPhenoSvc.updatePhenotypeStatus.mockResolvedValue(undefined);
    const res = await request(app).put('/api/phenotypes/ph1/confirm').set('x-test-user', asUser(PHYS)).send({ action: 'confirm' });
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('PHENOTYPE_CONFIRMED');
    expect(d.previousValues).toEqual({ status: 'SUSPECTED' });
    expect(d.newValues).toEqual({ status: 'CONFIRMED', action: 'confirm' });
  });

  test('HIPAA-grade confirm: audit DB failure -> 500', async () => {
    mockPhenoSvc.getPhenotypeById.mockResolvedValue({ id: 'ph1', hospitalId: 'h1', status: 'SUSPECTED', patientId: 'p1', phenotypeName: 'HCM', confidence: 0.7 });
    mockPhenoSvc.updatePhenotypeStatus.mockResolvedValue(undefined);
    auditCreate.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).put('/api/phenotypes/ph1/confirm').set('x-test-user', asUser(PHYS)).send({ action: 'confirm' });
    expect(res.status).toBe(500);
  });
});

// ─── accountSecurity.ts ─────────────────────────────────────────────────────────────

describe('accountSecurity.ts audit writes', () => {
  test('POST /change-password -> SECURITY_SETTINGS_CHANGED (best-effort)', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-phys', isActive: true, passwordHash: 'old' });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false); // current valid, new differs
    db.user.update.mockResolvedValue({ id: 'u-phys' });
    db.loginSession.updateMany.mockResolvedValue({ count: 2 });
    const res = await request(app).post('/api/account-security/change-password').set('x-test-user', asUser(PHYS))
      .set('authorization', 'Bearer tok').send({ currentPassword: 'CurrentP1!@#ab', newPassword: 'NewPass1!@#abc' });
    expect(res.status).toBe(200);
    const d = auditData();
    expect(d.action).toBe('SECURITY_SETTINGS_CHANGED');
    expect(d.newValues).toEqual({ change: 'password' });
  });

  test('DELETE /sessions/:id -> SESSION_REVOKED', async () => {
    db.loginSession.findFirst.mockResolvedValue({ id: 's1', userId: 'u-phys', isActive: true, sessionToken: 'othertokenhash' });
    db.loginSession.update.mockResolvedValue({ id: 's1' });
    const res = await request(app).delete('/api/account-security/sessions/s1').set('x-test-user', asUser(PHYS)).set('authorization', 'Bearer tok');
    expect(res.status).toBe(200);
    expect(auditData().action).toBe('SESSION_REVOKED');
  });

  test('best-effort security event: audit DB failure does NOT 500', async () => {
    db.loginSession.findFirst.mockResolvedValue({ id: 's1', userId: 'u-phys', isActive: true, sessionToken: 'othertokenhash' });
    db.loginSession.update.mockResolvedValue({ id: 's1' });
    auditCreate.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).delete('/api/account-security/sessions/s1').set('x-test-user', asUser(PHYS)).set('authorization', 'Bearer tok');
    expect(res.status).toBe(200); // SESSION_REVOKED is NOT in HIPAA_GRADE_ACTIONS
  });
});

// ─── no PHI in any audit description ────────────────────────────────────────────────

describe('no raw PHI in audit descriptions', () => {
  test('every recorded description is id/count/status prose only', async () => {
    mockRefSvc.createManualReferral.mockResolvedValue({ id: 'r1', status: 'TRIGGERED', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY' });
    await request(app).post('/api/referrals').set('x-test-user', asUser(PHYS))
      .send({ patientId: 'p1', type: 'HEART_FAILURE', fromModule: 'HEART_FAILURE', toModule: 'ELECTROPHYSIOLOGY', priority: 'HIGH', reason: 'VT', clinicalContext: {} });
    for (const call of auditCreate.mock.calls) {
      const desc = call[0].data.description || '';
      expect(desc).not.toMatch(/firstName|lastName|\bmrn\b/i);
    }
  });
});
