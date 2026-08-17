/**
 * AUDIT-319 - the eight role-comparison guards, exercised through the REAL route handlers.
 *
 * The bug (all 8 sites): `role.toLowerCase().replace(/_/g,'-')` yields `super-admin`, compared to the
 * literal `SUPER_ADMIN`, which can never match - so each guard was a constant. Fixed to the raw compare
 * `req.user?.role (===|!==) 'SUPER_ADMIN'`. These tests assert each guard now DECIDES on the role, and
 * are written to FAIL against the pre-fix behavior (proven by reverting the src fix and re-running - see
 * the PR report; every "SUPER_ADMIN is refused"/"SUPER_ADMIN is permitted" assertion below flips).
 *
 * Harness: authenticateToken is stubbed to inject a chosen `currentUser` (so the role under test is the
 * only variable); authorizeRole/requireMFA pass through (they are not the code under test); the service
 * layer is mocked only enough to REACH each guard. Assertions are guard-scoped: `=== 403` where the guard
 * must block, `!== 403` where it must permit (robust to any post-guard behavior), or a prisma spy where
 * the guard's effect is to skip/apply a tenant-scoping query.
 */

process.env.JWT_SECRET = 'x'.repeat(64);
delete process.env.MFA_ENFORCED;
delete process.env.DEMO_MODE;

import express from 'express';
import request from 'supertest';

let currentUser: any = null;

jest.mock('../../src/middleware/auth', () => ({
  __esModule: true,
  authenticateToken: (req: any, _res: any, next: any) => { req.user = currentUser; next(); },
  authorizeRole: () => (_req: any, _res: any, next: any) => next(),
  requireMFA: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    patient: { findFirst: jest.fn() },
    hospital: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    userMFA: { findUnique: jest.fn() },
    loginSession: { updateMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('../../src/middleware/auditLogger', () => ({ __esModule: true, writeAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/mfaService', () => ({ __esModule: true, mfaService: { disableMFA: jest.fn().mockResolvedValue(undefined) }, MFAService: jest.fn() }));
jest.mock('../../src/services/emailService', () => ({ __esModule: true, sendEmail: jest.fn().mockResolvedValue(undefined), buildSecurityAlertEmail: () => ({}), buildMFABackupCodesEmail: () => ({}) }));
jest.mock('../../src/services/clinicalAlertService', () => ({
  __esModule: true,
  sendDailyDigest: jest.fn().mockResolvedValue(0),
  sendWeeklySummary: jest.fn().mockResolvedValue(0),
  runDailyDigestForAllHospitals: jest.fn().mockResolvedValue({ emails: 0, hospitals: 0 }),
  runWeeklySummaryForAllHospitals: jest.fn().mockResolvedValue({ emails: 0, hospitals: 0 }),
}));
// The winston logger (utils/logger.ts) has a File transport that opens a persistent write-stream on the
// first log call (an open FD). The cqlRules handlers log (23 call sites); mfa/notifications do not. That
// open stream is what kept jest from exiting (the 22-minute "hang" was jest never flushing its report -
// NOT the guard code). Stubbing the logger removes the File transport entirely - the real handlers and
// the real guards still run; only the logging is a no-op. Filed as AUDIT-320. See that finding.
jest.mock('../../src/utils/logger', () => {
  const stub = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn(), verbose: jest.fn() };
  return { __esModule: true, logger: stub, default: stub, redactLogInfo: (x: any) => x };
});
// The cqlRules /rules/:id/recommendations handler calls initializeCQLComponents(), which instantiates
// CQLRuleLoader and, via startWatching(), opens a CHOKIDAR file watcher (a persistent FS handle) plus
// ValuesetResolver fs reads. That watcher is the second handle that kept jest alive (AUDIT-320). Stubbing
// the CQL subsystem makes initializeCQLComponents open nothing; the handler still runs the real guard and
// returns its real status - the test still exercises the guard end to end.
jest.mock('../../src/cql/cqlEngine', () => ({ __esModule: true, CQLEngine: jest.fn().mockImplementation(() => ({})) }));
jest.mock('../../src/cql/ruleLoader', () => ({ __esModule: true, CQLRuleLoader: jest.fn().mockImplementation(() => ({ loadAllRules: jest.fn().mockResolvedValue({ loaded: [], failed: [] }), startWatching: jest.fn().mockResolvedValue(undefined) })) }));
jest.mock('../../src/cql/valuesetResolver', () => ({ __esModule: true, ValuesetResolver: jest.fn().mockImplementation(() => ({ initialize: jest.fn().mockResolvedValue(undefined) })) }));
jest.mock('../../src/cql/clinicalDecisionProcessor', () => ({ __esModule: true, ClinicalDecisionProcessor: jest.fn().mockImplementation(() => ({ initialize: jest.fn().mockResolvedValue(undefined) })) }));
jest.mock('../../src/services/therapyGapService', () => ({ __esModule: true, TherapyGapService: jest.fn().mockImplementation(() => ({})) }));

import prisma from '../../src/lib/prisma';
import mfaRouter from '../../src/routes/mfa';
import notificationsRouter from '../../src/routes/notifications';
import cqlRouter from '../../src/routes/cqlRules';
import adminRouter from '../../src/routes/admin';
import inviteRouter from '../../src/routes/invite';
import onboardingRouter from '../../src/routes/onboarding';

const db = prisma as any;

const app = express();
app.use(express.json());
app.use('/api/mfa', mfaRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/cql', cqlRouter);
app.use('/api/admin', adminRouter);
app.use('/api/team', inviteRouter);
app.use('/api/onboarding', onboardingRouter);

const SUPER = { userId: 'sa', role: 'SUPER_ADMIN', hospitalId: 'tailrd-platform', email: 'sa@t.test' };
const ADMIN = { userId: 'ha', role: 'HOSPITAL_ADMIN', hospitalId: 'hosp-A', email: 'ha@t.test' };

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = null;
  db.user.findUnique.mockResolvedValue({ id: 'x', email: 'x@t.test', hospitalId: 'hosp-A', role: 'PHYSICIAN', firstName: 'X', lastName: 'Y' });
  db.patient.findFirst.mockResolvedValue(null);
  db.auditLog.findMany.mockResolvedValue([]);
});

describe('AUDIT-319 site 1 - mfa.ts DELETE /disable (fails OPEN pre-fix: super-admin could disable own MFA)', () => {
  it('REFUSES a SUPER_ADMIN (guard now fires)', async () => {
    currentUser = SUPER;
    const res = await request(app).delete('/api/mfa/disable').send({ token: '123456' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot disable their own MFA/i);
  });
  it('PERMITS a non-super-admin (guard does not fire; unchanged)', async () => {
    currentUser = ADMIN;
    const res = await request(app).delete('/api/mfa/disable').send({ token: '123456' });
    expect(res.status).not.toBe(403);
  });
});

describe('AUDIT-319 sites 2-3 - notifications.ts trigger endpoints (fail CLOSED pre-fix: 403 for everyone)', () => {
  for (const path of ['daily-digest', 'weekly-summary']) {
    it(`/trigger/${path} PERMITS a real SUPER_ADMIN (guard now permits)`, async () => {
      currentUser = SUPER;
      const res = await request(app).post(`/api/notifications/trigger/${path}`).send({});
      expect(res.status).not.toBe(403);
    });
    it(`/trigger/${path} REFUSES a non-super-admin (unchanged)`, async () => {
      currentUser = ADMIN;
      const res = await request(app).post(`/api/notifications/trigger/${path}`).send({});
      expect(res.status).toBe(403);
    });
  }
});

describe('AUDIT-319 sites 4-5 - cqlRules.ts tenant-scoping (fails CLOSED pre-fix: super-admin subjected to tenant filter)', () => {
  it('/results/:patientId - a SUPER_ADMIN SKIPS the tenant-scoping patient.findFirst; a non-super-admin does NOT', async () => {
    currentUser = SUPER;
    await request(app).get('/api/cql/results/p1');
    expect(db.patient.findFirst).not.toHaveBeenCalled(); // super-admin exemption restored

    jest.clearAllMocks();
    db.patient.findFirst.mockResolvedValue(null);
    currentUser = ADMIN;
    await request(app).get('/api/cql/results/p1');
    expect(db.patient.findFirst).toHaveBeenCalled(); // non-super-admin still tenant-scoped
  });
  it('/rules/:id/recommendations - same guard: SUPER_ADMIN skips the tenant-scoping query; a non-super-admin does NOT', async () => {
    // NOTE: patientId query is required (handler 400s without it before the guard), so it must be
    // present for the request to REACH the guard - otherwise the test would pass trivially.
    currentUser = SUPER;
    await request(app).get('/api/cql/rules/r1/recommendations?patientId=p1');
    expect(db.patient.findFirst).not.toHaveBeenCalled();

    jest.clearAllMocks();
    db.patient.findFirst.mockResolvedValue(null);
    currentUser = ADMIN;
    await request(app).get('/api/cql/rules/r1/recommendations?patientId=p1');
    expect(db.patient.findFirst).toHaveBeenCalled();
  });
});

describe('AUDIT-319 site 6 - admin.ts GET /users/:id/activity cross-tenant (fails CLOSED pre-fix: super-admin loses exemption)', () => {
  beforeEach(() => {
    db.user.findUnique.mockResolvedValue({ id: 'target', email: 't@t.test', hospitalId: 'other-hosp', role: 'PHYSICIAN' });
  });
  it('PERMITS a SUPER_ADMIN acting on a user in another hospital (exemption restored)', async () => {
    currentUser = SUPER;
    const res = await request(app).get('/api/admin/users/target/activity');
    expect(res.status).not.toBe(403);
  });
  it('REFUSES a non-super-admin acting cross-tenant (unchanged)', async () => {
    currentUser = ADMIN; // hosp-A acting on a target in other-hosp
    const res = await request(app).get('/api/admin/users/target/activity');
    expect(res.status).toBe(403);
  });
});

describe('AUDIT-319 site 7 - invite.ts POST /invite super-admin assignment (fails CLOSED pre-fix: no one could invite a super-admin)', () => {
  beforeEach(() => { db.user.findUnique.mockResolvedValue(null); });
  it('PERMITS a SUPER_ADMIN inviting a SUPER_ADMIN (exemption restored)', async () => {
    currentUser = SUPER;
    const res = await request(app).post('/api/team/invite').send({ email: 'new@t.test', role: 'SUPER_ADMIN' });
    expect(res.status).not.toBe(403);
  });
  it('REFUSES a non-super-admin inviting a SUPER_ADMIN (unchanged)', async () => {
    currentUser = ADMIN;
    const res = await request(app).post('/api/team/invite').send({ email: 'new@t.test', role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });
});

describe('AUDIT-319 site 8 - onboarding.ts PATCH tenant-ownership (fails CLOSED pre-fix: super-admin loses cross-hospital exemption)', () => {
  it('PERMITS a SUPER_ADMIN modifying another hospital onboarding (exemption restored; now identical in shape to :176)', async () => {
    currentUser = SUPER; // hospitalId tailrd-platform, modifying other-hosp
    const res = await request(app).patch('/api/onboarding/hospitals/other-hosp/onboarding/redox-setup').send({ completed: true });
    expect(res.status).not.toBe(403);
  });
  it('REFUSES a non-super-admin modifying another hospital onboarding (unchanged)', async () => {
    currentUser = ADMIN; // hosp-A modifying other-hosp
    const res = await request(app).patch('/api/onboarding/hospitals/other-hosp/onboarding/redox-setup').send({ completed: true });
    expect(res.status).toBe(403);
  });
});
