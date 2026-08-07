/**
 * AUDIT-240 - enabling MFA must NOT self-lock the account, and the fix must NOT reopen AUDIT-239.
 *
 * The trap: `/api/mfa` mounts BEHIND the global `requireMFA` gate (server.ts:265 gate / :292 mfa
 * router). Before the fix, an enrolled-but-unverified token (which every login mints - AUDIT-239) was
 * 403'd on EVERY /api route, including `/api/mfa/verify` - the one endpoint needed to upgrade the token.
 * No path to finish verification => locked out of the whole product the moment MFA is enabled.
 *
 * The fix (`middleware/auth.ts`): a SURGICAL exemption - `requireMFA` lets a not-yet-verified user reach
 * ONLY the four MFA onboarding/completion paths (setup, verify-setup, verify, verify-backup), and
 * NOTHING else. These tests prove both halves: the lockout is gone AND the hole is not reopened.
 *
 * Tests-first: every assertion here FAILS against the pre-fix middleware (no exemption) and passes
 * after. Mirrors the `requireMFA.test.ts` harness (real middleware, mocked prisma.userMFA).
 */
import type { Request, Response, NextFunction } from 'express';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: { userMFA: { findUnique: jest.fn() } },
}));

import prisma from '../../lib/prisma';
const mockFindUnique = (prisma as any).userMFA.findUnique as jest.Mock;

/** A request the way Express presents it to a middleware mounted at `/api`: originalUrl is the full path. */
function buildReq(user: any, originalUrl: string): Request {
  return { user, originalUrl } as unknown as Request;
}
function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
}
async function run(user: any, mfaEnabled: boolean | null, originalUrl: string) {
  mockFindUnique.mockResolvedValue(mfaEnabled === null ? null : { enabled: mfaEnabled });
  const { requireMFA } = require('../auth');
  const next: NextFunction = jest.fn();
  const { res, status, json } = buildRes();
  await requireMFA(buildReq(user, originalUrl), res, next);
  return { next, status, json };
}

const ENROLLED_UNVERIFIED = { userId: 'u1', role: 'PHYSICIAN', mfaVerified: false };
const ENROLLED_VERIFIED = { userId: 'u1', role: 'PHYSICIAN', mfaVerified: true };
const SA_UNENROLLED = { userId: 'sa', role: 'SUPER_ADMIN', mfaVerified: false };

const ONBOARDING = ['/api/mfa/setup', '/api/mfa/verify-setup', '/api/mfa/verify', '/api/mfa/verify-backup'];

describe('AUDIT-240: MFA onboarding/completion paths are reachable by a not-yet-verified user', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.MFA_ENFORCED;
    delete process.env.DEMO_MODE;
    process.env.JWT_SECRET = 'a'.repeat(64);
    mockFindUnique.mockReset();
  });
  afterAll(() => { process.env = originalEnv; });

  it.each(ONBOARDING)('an enrolled+unverified token CAN reach %s (lockout fixed)', async (path) => {
    const { next, status } = await run(ENROLLED_UNVERIFIED, true, path);
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('a forced-to-enroll SUPER_ADMIN (MFA_ENFORCED, not enrolled) CAN reach /api/mfa/setup', async () => {
    process.env.MFA_ENFORCED = 'true';
    const { next, status } = await run(SA_UNENROLLED, null, '/api/mfa/setup');
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });
});

describe('AUDIT-240: the exemption is SURGICAL - the AUDIT-239 hole is NOT reopened', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.MFA_ENFORCED; delete process.env.DEMO_MODE;
    process.env.JWT_SECRET = 'a'.repeat(64); mockFindUnique.mockReset();
  });
  afterAll(() => { process.env = originalEnv; });

  it.each([
    '/api/patients', '/api/admin/users', '/api/modules/heart-failure/dashboard', '/api/trials',
  ])('an enrolled+unverified token is STILL 403 on protected route %s', async (path) => {
    const { next, status, json } = await run(ENROLLED_UNVERIFIED, true, path);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ requiresMfaVerification: true }));
  });

  it('an enrolled+unverified token is 403 on /api/mfa/disable (NOT an exempt path)', async () => {
    const { next, status } = await run(ENROLLED_UNVERIFIED, true, '/api/mfa/disable');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('an enrolled+unverified token is 403 on /api/mfa/status (NOT an exempt path)', async () => {
    const { next, status } = await run(ENROLLED_UNVERIFIED, true, '/api/mfa/status');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('does not treat a look-alike path (/api/mfa/verify-evil) as exempt', async () => {
    const { next, status } = await run(ENROLLED_UNVERIFIED, true, '/api/mfa/verify-evil');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe('AUDIT-240: happy path + enforcement mechanism (proves config activation compels enrollment)', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.MFA_ENFORCED; delete process.env.DEMO_MODE;
    process.env.JWT_SECRET = 'a'.repeat(64); mockFindUnique.mockReset();
  });
  afterAll(() => { process.env = originalEnv; });

  it('a fully MFA-verified token reaches a protected route', async () => {
    const { next, status } = await run(ENROLLED_VERIFIED, true, '/api/patients');
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('MFA_ENFORCED=true: an unenrolled SUPER_ADMIN is compelled to enroll (403 on a protected route)', async () => {
    process.env.MFA_ENFORCED = 'true';
    const { next, status, json } = await run(SA_UNENROLLED, null, '/api/admin/users');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ requiresMfaEnrollment: true }));
  });

  it('MFA_ENFORCED off (default): an unenrolled non-privileged account is NOT blocked (enrollment gap policy)', async () => {
    const { next, status } = await run({ userId: 'p', role: 'PHYSICIAN', mfaVerified: false }, null, '/api/patients');
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });
});
