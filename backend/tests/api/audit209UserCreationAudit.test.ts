/**
 * AUDIT-209 Phase 2 - user-creation paths must write a USER_CREATED audit row.
 *
 * The AUDIT-209 re-verification (2026-08-05) confirmed that the ADMIN creation path
 * (`admin.ts POST /hospitals/:id/users`) already writes USER_CREATED, but two OTHER user-creation
 * paths do not:
 *   - `invite.ts POST /invite/accept/:token` - self-provisioning via an invite token - wrote NO audit
 *     row at all: a user came into existence and was auto-logged-in with nothing in the HIPAA trail.
 *   - `sso.ts GET /callback` - JIT-provisioning on first SSO login - wrote only `SSO_LOGIN`, so a user
 *     CREATION was recorded as a login and never as a creation.
 *
 * These are the confirmed Phase 2 defects (audit-rows-absent on user create). This suite is tests-first:
 * each assertion FAILS against the pre-fix handlers (RED) and passes after the USER_CREATED write is
 * added (GREEN). It mirrors the `auditTrailClass.test.ts` harness: the REAL router + REAL writeAuditLog,
 * with only prisma, fetch, bcrypt and jwt-adjacent seams mocked, so it proves the true
 * route -> writeAuditLog -> prisma.auditLog.create integration rather than a stub.
 *
 * Scope note: this fixes the ABSENCE (no USER_CREATED). It does NOT promote USER_CREATED into
 * HIPAA_GRADE_ACTIONS or reorder the existing admin-path write - that throw-on-failure / ordering
 * concern is AUDIT-212 and is deliberately left to it (section 17.3, no scope creep).
 */
// sso.ts captures COGNITO_DOMAIN / COGNITO_CLIENT_ID at MODULE LOAD (sso.ts:20-21), so these must be
// set before the router is imported below - beforeEach is too late.
process.env.COGNITO_DOMAIN = 'example.auth.us-east-1.amazoncognito.com';
process.env.COGNITO_CLIENT_ID = 'client-123';
process.env.JWT_SECRET = 'test-secret-not-a-real-key';

import express from 'express';
import request from 'supertest';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    inviteToken: { findUnique: jest.fn(), update: jest.fn() },
    hospital: { findUnique: jest.fn() },
    loginSession: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw'), genSalt: jest.fn() }));

// emailService is imported by invite.ts; stub so no real mail.
jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildInviteEmail: jest.fn(() => ({ to: '', subject: '', html: '' })),
}));

import prisma from '../../src/lib/prisma';
import inviteRouter from '../../src/routes/invite';
import ssoRouter from '../../src/routes/sso';

const db = prisma as any;
const auditCreate = db.auditLog.create as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/users', inviteRouter);
app.use('/api/sso', ssoRouter);

/** Every prisma.auditLog.create action string, in call order. */
const auditActions = (): string[] => auditCreate.mock.calls.map((c: any[]) => c[0]?.data?.action);
/** The data of the USER_CREATED audit call, if any. */
const userCreatedAudit = () =>
  auditCreate.mock.calls.map((c: any[]) => c[0]?.data).find((d: any) => d?.action === 'USER_CREATED');

beforeEach(() => {
  jest.clearAllMocks();
  auditCreate.mockResolvedValue({ id: 'audit-1' });
  process.env.JWT_SECRET = 'test-secret-not-a-real-key';
});

describe('AUDIT-209 Phase 2: invite-accept writes a USER_CREATED audit row', () => {
  const validInvite = {
    id: 'inv-1',
    token: 'tok-abc',
    email: 'newuser@hospital.test',
    role: 'PHYSICIAN',
    hospitalId: 'h-real',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
  const createdUser = {
    id: 'u-new',
    email: 'newuser@hospital.test',
    role: 'PHYSICIAN',
    hospitalId: 'h-real',
  };

  beforeEach(() => {
    db.inviteToken.findUnique.mockResolvedValue(validInvite);
    db.user.create.mockResolvedValue(createdUser);
    db.inviteToken.update.mockResolvedValue({ ...validInvite, usedAt: new Date() });
    db.hospital.findUnique.mockResolvedValue({ id: 'h-real', name: 'Real Hospital' });
  });

  it('POST /invite/accept/:token creates the user AND records USER_CREATED', async () => {
    const res = await request(app)
      .post('/api/users/invite/accept/tok-abc')
      .send({ password: 'Str0ng!Password12', firstName: 'New', lastName: 'User' });

    expect(res.status).toBe(200);
    expect(db.user.create).toHaveBeenCalledTimes(1);
    // RED before fix: no USER_CREATED row is written on this path.
    expect(auditActions()).toContain('USER_CREATED');
    const audit = userCreatedAudit();
    expect(audit?.resourceType).toBe('User');
    expect(audit?.resourceId).toBe('u-new');
  });
});

describe('AUDIT-209 Phase 2: SSO JIT-provisioning writes USER_CREATED, not only SSO_LOGIN', () => {
  const idPayload = {
    email: 'sso-user@hospital.test',
    'custom:hospitalId': 'h-real',
    given_name: 'Sso',
    family_name: 'User',
    sub: 'saml-sub-1',
  };
  const idToken = `x.${Buffer.from(JSON.stringify(idPayload)).toString('base64')}.y`;
  const createdSsoUser = {
    id: 'u-sso',
    email: 'sso-user@hospital.test',
    role: 'PHYSICIAN',
    hospitalId: 'h-real',
    isActive: true,
    hospital: { id: 'h-real', name: 'Real Hospital' },
  };

  beforeEach(() => {
    db.user.findUnique.mockResolvedValue(null); // first login -> JIT create
    db.hospital.findUnique.mockResolvedValue({ id: 'h-real', name: 'Real Hospital' });
    db.user.create.mockResolvedValue(createdSsoUser);
    db.loginSession.create.mockResolvedValue({ id: 'sess-1' });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: idToken, access_token: 'a' }),
    });
  });

  it('GET /callback for a new SSO user records USER_CREATED in addition to SSO_LOGIN', async () => {
    await request(app).get('/api/sso/callback').query({ code: 'auth-code' });

    expect(db.user.create).toHaveBeenCalledTimes(1);
    const actions = auditActions();
    // RED before fix: the create branch wrote NO audit at all; the only audit on this path was the
    // later SSO_LOGIN. The fix writes USER_CREATED immediately after user.create - deliberately BEFORE
    // buildUserPermissions / jwt.sign / loginSession.create - so the creation is recorded even if the
    // login-completion steps (which this harness does not fully mock) fail. That ordering is why this
    // suite asserts only USER_CREATED here; SSO_LOGIN is pre-existing behavior downstream of the fix.
    expect(actions).toContain('USER_CREATED');
    const audit = userCreatedAudit();
    expect(audit?.resourceId).toBe('u-sso');
    expect(audit?.resourceType).toBe('User');
  });
});
