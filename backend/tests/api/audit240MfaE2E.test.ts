/**
 * AUDIT-240 END-TO-END - the MFA enroll -> verify -> reach path works through the ACTUAL handlers,
 * chaining REAL signed JWTs, not only the middleware gate in isolation.
 *
 * WHY THIS EXISTS (belt-and-braces per the arc's "a filed bug is not a real bug until proven end to
 * end" lesson). `audit240MfaLockout.test.ts` proves the `requireMFA` EXEMPTION in isolation (real
 * middleware, hand-built req). This proves the whole mint-and-upgrade chain a real user walks:
 *
 *   POST /api/auth/login        -> real signToken mints an mfaVerified:false JWT (AUDIT-239: password only)
 *   POST /api/mfa/setup         -> reachable (not yet enrolled)
 *   POST /api/mfa/verify-setup  -> UserMFA.enabled := true          <-- the lockout arms here
 *   GET  /api/protected         -> 403: enrolled + unverified token is walled from PHI/admin (AUDIT-239 hole stays shut)
 *   POST /api/mfa/verify        -> REACHABLE via the exemption -> mints a REAL mfaVerified:true JWT   <-- the escape
 *   GET  /api/protected         -> 200: the upgraded token reaches protected routes
 *
 * The app is mounted to mirror server.ts: `/api/auth` sits BEFORE the global gate (login must be
 * reachable password-only); `app.use('/api', authenticateToken, requireMFA)` is the REAL global gate;
 * `/api/mfa` and a trivial `/api/protected` sit behind it. authenticateToken does a REAL jwt.verify on
 * every request, so the login-minted and verify-minted tokens are genuinely exercised. Only prisma,
 * bcrypt, the TOTP check (mfaService), and the audit-DB write are mocked - the JWT sign/verify and the
 * requireMFA gate are the real code under test.
 *
 * RED PROOF: with the MFA_ONBOARDING_PATHS exemption reverted, step 5 (POST /api/mfa/verify) is 403'd by
 * the global gate - the chain cannot complete, and this suite fails at the verify step. That is the
 * lockout, exercised end to end. See the AUDIT-240 PR report for the reverted-run transcript.
 */

// JWT_SECRET must be set before the middleware/routers are imported (auth middleware captures it at load).
process.env.JWT_SECRET = 'x'.repeat(64);
delete process.env.MFA_ENFORCED;
delete process.env.DEMO_MODE;

import express from 'express';
import request from 'supertest';

// Mutable enrollment state the chain flips at verify-setup.
const mfaState = { enabled: false };

const USER = {
  id: 'u-e2e',
  email: 'e2e@hospital.test',
  passwordHash: 'stored-hash',
  role: 'PHYSICIAN',
  hospitalId: 'h-e2e',
  isActive: true,
  permHeartFailure: true,
  permExecutiveView: true,
  permServiceLineView: true,
  permCareTeamView: true,
  permViewReports: true,
  permAccessPHI: true,
  hospital: {
    id: 'h-e2e',
    name: 'E2E Hospital',
    moduleHeartFailure: true,
    moduleElectrophysiology: true,
    moduleStructuralHeart: true,
    moduleCoronaryIntervention: true,
    modulePeripheralVascular: true,
    moduleValvularDisease: true,
  },
};

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    userMFA: { findUnique: jest.fn() },
    loginSession: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));

// The TOTP check is the only "second factor" mock - everything about the JWT mint/upgrade stays real.
const mockGenerateSecret = jest.fn();
const mockEnableMFA = jest.fn();
const mockVerifyTOTP = jest.fn();
jest.mock('../../src/services/mfaService', () => ({
  __esModule: true,
  mfaService: {
    generateSecret: (...a: any[]) => mockGenerateSecret(...a),
    enableMFA: (...a: any[]) => mockEnableMFA(...a),
    verifyTOTP: (...a: any[]) => mockVerifyTOTP(...a),
  },
  MFAService: jest.fn(),
}));

import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireMFA } from '../../src/middleware/auth';
import authRouter from '../../src/routes/auth';
import mfaRouter from '../../src/routes/mfa';

const db = prisma as any;

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter); // BEFORE the gate: login is reachable password-only (AUDIT-239 fact)
app.use('/api', authenticateToken, requireMFA); // the REAL global gate (server.ts:265)
app.use('/api/mfa', mfaRouter);
app.get('/api/protected', (req: any, res) => res.json({ ok: true, who: req.user?.userId }));

beforeEach(() => {
  jest.clearAllMocks();
  mfaState.enabled = false;

  db.user.findFirst.mockResolvedValue(USER);  // login: case-insensitive email lookup
  db.user.findUnique.mockResolvedValue(USER); // mfa/verify: by id
  db.user.update.mockResolvedValue(USER);
  // requireMFA reads current enrollment; authenticateToken never calls userMFA.
  db.userMFA.findUnique.mockImplementation(async () => ({ enabled: mfaState.enabled }));
  // authenticateToken's session check: every real token we mint is "active".
  db.loginSession.findUnique.mockResolvedValue({ isActive: true });
  db.loginSession.create.mockResolvedValue({ id: 'sess' });
  db.loginSession.updateMany.mockResolvedValue({ count: 1 });
  db.auditLog.create.mockResolvedValue({ id: 'audit' }); // LOGIN_SUCCESS is HIPAA-graded -> must resolve

  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  mockGenerateSecret.mockResolvedValue({ qrCodeUrl: 'otpauth://x', manualEntryKey: 'ABCD' });
  mockEnableMFA.mockImplementation(async () => {
    mfaState.enabled = true; // enrollment completes -> the lockout is now armed
    return { backupCodes: ['bc1', 'bc2'] };
  });
  mockVerifyTOTP.mockResolvedValue(true);
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('AUDIT-240 e2e: enroll -> verify -> reach, on real signed JWTs through real handlers', () => {
  it('walks the full mint-and-upgrade chain and the AUDIT-239 hole stays shut throughout', async () => {
    // 1. LOGIN - real signToken mints an mfaVerified:false JWT (AUDIT-239: password alone).
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@hospital.test', password: 'whatever-real-bcrypt-mocked' });
    expect(login.status).toBe(200);
    const loginToken: string = login.body.data.token;
    expect(typeof loginToken).toBe('string');

    // 2. SETUP - reachable before enrollment (also an onboarding path).
    const setup = await request(app).post('/api/mfa/setup').set(bearer(loginToken)).send({});
    expect(setup.status).toBe(200);
    expect(setup.body.qrCodeUrl).toBeTruthy();

    // 3. VERIFY-SETUP - enables MFA. The lockout is armed the instant enabled := true.
    const verifySetup = await request(app)
      .post('/api/mfa/verify-setup')
      .set(bearer(loginToken))
      .send({ token: '123456' });
    expect(verifySetup.status).toBe(200);
    expect(verifySetup.body.enabled).toBe(true);
    expect(mfaState.enabled).toBe(true);

    // 4. HOLE STAYS SHUT - the same mfaVerified:false token is now walled from protected routes.
    const blocked = await request(app).get('/api/protected').set(bearer(loginToken));
    expect(blocked.status).toBe(403);
    expect(blocked.body.requiresMfaVerification).toBe(true);

    // 5. THE ESCAPE - the exemption lets the unverified token reach /api/mfa/verify, which mints a
    //    REAL mfaVerified:true JWT. Without the exemption this is 403 (the lockout) - the RED case.
    const verify = await request(app)
      .post('/api/mfa/verify')
      .set(bearer(loginToken))
      .send({ token: '123456' });
    expect(verify.status).toBe(200);
    expect(verify.body.mfaVerified).toBe(true);
    const verifiedToken: string = verify.body.token;
    expect(typeof verifiedToken).toBe('string');
    expect(verifiedToken).not.toBe(loginToken);

    // 6. REACH - the upgraded token clears the global gate and reaches the protected route.
    const reached = await request(app).get('/api/protected').set(bearer(verifiedToken));
    expect(reached.status).toBe(200);
    expect(reached.body.ok).toBe(true);
    expect(reached.body.who).toBe('u-e2e');
  });

  it('the upgraded (verified) token is a genuinely different signed JWT carrying mfaVerified:true', async () => {
    const jwt = require('jsonwebtoken');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@hospital.test', password: 'pw' });
    const loginToken = login.body.data.token;
    expect((jwt.decode(loginToken) as any).mfaVerified).toBe(false);

    await request(app).post('/api/mfa/verify-setup').set(bearer(loginToken)).send({ token: '1' });
    const verify = await request(app).post('/api/mfa/verify').set(bearer(loginToken)).send({ token: '1' });
    const verifiedToken = verify.body.token;

    // Real signature, real claim flip - verified with the real secret, not just trusted.
    const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    expect(decoded.mfaVerified).toBe(true);
    expect(decoded.userId).toBe('u-e2e');
  });
});
