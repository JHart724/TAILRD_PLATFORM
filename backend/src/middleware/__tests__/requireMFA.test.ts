/**
 * Unit tests for AUDIT-009 remediation in backend/src/middleware/auth.ts
 *
 * AUDIT-009: requireMFA was opt-in per user (only enforced if user enabled
 * MFA voluntarily). Remediation: MFA_ENFORCED env flag forces enrollment
 * for SUPER_ADMIN + HOSPITAL_ADMIN. Default false in production for
 * controlled rollout.
 */
import type { Request, Response, NextFunction } from 'express';

// Mock prisma client used by requireMFA
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    userMFA: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';
const mockFindUnique = (prisma as any).userMFA.findUnique as jest.Mock;

function buildReq(user: any): Request {
  return { user } as unknown as Request;
}

function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

describe('requireMFA — AUDIT-009 enforcement gate', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // No jest.resetModules — auth.ts reads env at call-time (per AUDIT-009
    // design); resetting modules creates a new mock instance and breaks
    // the captured mockFindUnique reference.
    delete process.env.MFA_ENFORCED;
    delete process.env.DEMO_MODE;
    process.env.JWT_SECRET = 'a'.repeat(64);
    mockFindUnique.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function runMiddleware(reqUser: any, mfaEnabled: boolean | null) {
    if (mfaEnabled === null) {
      mockFindUnique.mockResolvedValue(null);
    } else {
      mockFindUnique.mockResolvedValue({ enabled: mfaEnabled });
    }
    const { requireMFA } = require('../auth');
    const next: NextFunction = jest.fn();
    const { res, status, json } = buildRes();
    await requireMFA(buildReq(reqUser), res, next);
    return { next, status, json };
  }

  describe('when MFA_ENFORCED=false (legacy behavior)', () => {
    beforeEach(() => {
      process.env.MFA_ENFORCED = 'false';
    });

    it('passes SUPER_ADMIN with no MFA enrollment', async () => {
      const { next, status } = await runMiddleware(
        { userId: 'u1', role: 'SUPER_ADMIN', mfaVerified: false },
        null,
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('passes HOSPITAL_ADMIN with no MFA enrollment', async () => {
      const { next, status } = await runMiddleware(
        { userId: 'u1', role: 'HOSPITAL_ADMIN', mfaVerified: false },
        null,
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('blocks user with MFA enabled but not yet verified', async () => {
      const { next, status, json } = await runMiddleware(
        { userId: 'u1', role: 'PHYSICIAN', mfaVerified: false },
        true,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ requiresMfaVerification: true }));
    });

    it('passes user with MFA enabled and verified', async () => {
      const { next, status } = await runMiddleware(
        { userId: 'u1', role: 'PHYSICIAN', mfaVerified: true },
        true,
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('when MFA_ENFORCED=true (new enforcement)', () => {
    beforeEach(() => {
      process.env.MFA_ENFORCED = 'true';
    });

    it('blocks SUPER_ADMIN without MFA enrollment with requiresMfaEnrollment hint', async () => {
      const { next, status, json } = await runMiddleware(
        { userId: 'u1', role: 'SUPER_ADMIN', mfaVerified: false },
        null,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        requiresMfaEnrollment: true,
      }));
    });

    it('blocks HOSPITAL_ADMIN without MFA enrollment with requiresMfaEnrollment hint', async () => {
      const { next, status, json } = await runMiddleware(
        { userId: 'u1', role: 'HOSPITAL_ADMIN', mfaVerified: false },
        false,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        requiresMfaEnrollment: true,
      }));
    });

    it('passes PHYSICIAN without MFA enrollment (not in enforced roles set)', async () => {
      const { next, status } = await runMiddleware(
        { userId: 'u1', role: 'PHYSICIAN', mfaVerified: false },
        null,
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('blocks SUPER_ADMIN with MFA enrolled but not yet verified (existing path still active)', async () => {
      const { next, status, json } = await runMiddleware(
        { userId: 'u1', role: 'SUPER_ADMIN', mfaVerified: false },
        true,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        requiresMfaVerification: true,
      }));
    });

    it('passes SUPER_ADMIN with MFA enrolled and verified', async () => {
      const { next, status } = await runMiddleware(
        { userId: 'u1', role: 'SUPER_ADMIN', mfaVerified: true },
        true,
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  // DEMO_MODE bypass test omitted: isDemoMode is read at module-load time
  // (existing pre-AUDIT-009 behavior), so test isolation requires
  // jest.isolateModules + re-import per test which fights the mock pattern.
  // The bypass is well-established in production ECS env validation
  // (server.ts blocks DEMO_MODE outside dev/test) and unaffected by this PR.
});
