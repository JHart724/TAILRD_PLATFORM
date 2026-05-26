/**
 * AUDIT-001 Tier A coverage extension for backend/src/middleware/auth.ts.
 *
 * Covers 5 of 6 exports: authenticateToken, authorizeHospital, authorizeRole,
 * authorizeModule, authorizeView. The 6th export (requireMFA) is covered
 * by the existing requireMFA.test.ts (AUDIT-009 tagged), preserved verbatim.
 *
 * Refresh-token flow is out of scope (lives in routes/auth.ts, not middleware).
 *
 * isDemoMode and JWT_SECRET are read at module-load time in auth.ts. The
 * DEMO_MODE bypass tests use jest.isolateModules with controlled env to
 * exercise the bypass path on a freshly loaded module.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'a'.repeat(64);
process.env.JWT_SECRET = TEST_JWT_SECRET;

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    loginSession: { findUnique: jest.fn() },
    userMFA: { findUnique: jest.fn() },
  },
}));

jest.mock('../cognitoAuth', () => ({
  __esModule: true,
  verifyCognitoToken: jest.fn(),
  isCognitoEnabled: jest.fn().mockReturnValue(false),
}));

import prisma from '../../lib/prisma';
import * as cognitoMod from '../cognitoAuth';

const mockFindUniqueSession = (prisma as any).loginSession.findUnique as jest.Mock;
const mockIsCognitoEnabled = cognitoMod.isCognitoEnabled as jest.Mock;
const mockVerifyCognitoToken = cognitoMod.verifyCognitoToken as jest.Mock;

function buildPermissions(overrides: any = {}): any {
  return {
    modules: {
      heartFailure: false,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: false,
      peripheralVascular: false,
      valvularDisease: false,
      ...(overrides.modules || {}),
    },
    views: {
      executive: false,
      serviceLines: false,
      careTeam: false,
      ...(overrides.views || {}),
    },
    actions: {
      viewReports: false,
      exportData: false,
      manageUsers: false,
      configureAlerts: false,
      accessPHI: false,
      ...(overrides.actions || {}),
    },
  };
}

function buildPayload(overrides: any = {}): any {
  return {
    userId: 'u1',
    email: 'user@example.com',
    role: 'PHYSICIAN',
    hospitalId: 'hosp-1',
    hospitalName: 'Test Hospital',
    permissions: buildPermissions(overrides.permissions),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([k]) => k !== 'permissions'),
    ),
  };
}

function signToken(payload: any, secret: string = TEST_JWT_SECRET): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

function buildReq(overrides: any = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

function loadFreshAuth(envOverrides: Record<string, string | undefined> = {}): any {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../auth');
  });
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return mod;
}

describe('auth middleware - AUDIT-001 Tier A coverage extension', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.DEMO_MODE;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    mockFindUniqueSession.mockReset();
    mockIsCognitoEnabled.mockReset().mockReturnValue(false);
    mockVerifyCognitoToken.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (a): authenticateToken
  // ───────────────────────────────────────────────────────────────────────
  describe('authenticateToken', () => {
    it('rejects requests with no Authorization header (non-demo) with 401', async () => {
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(buildReq(), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Access token required',
      }));
    });

    it('accepts valid HS256 token + active session and populates req.user', async () => {
      mockFindUniqueSession.mockResolvedValue({ isActive: true });
      const payload = buildPayload({ userId: 'u-active' });
      const token = signToken(payload);
      const { authenticateToken } = require('../auth');
      const req = buildReq({ headers: { authorization: `Bearer ${token}` } });
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect((req as any).user?.userId).toBe('u-active');
      expect(mockFindUniqueSession).toHaveBeenCalledTimes(1);
    });

    it('rejects valid token with revoked session with 401', async () => {
      mockFindUniqueSession.mockResolvedValue({ isActive: false });
      const token = signToken(buildPayload());
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: `Bearer ${token}` } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Session has been revoked',
      }));
    });

    it('rejects valid token when session record is missing with 401', async () => {
      mockFindUniqueSession.mockResolvedValue(null);
      const token = signToken(buildPayload());
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: `Bearer ${token}` } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Session has been revoked',
      }));
    });

    it('rejects token with invalid signature with 403', async () => {
      const tampered = signToken(buildPayload(), 'b'.repeat(64));
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: `Bearer ${tampered}` } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid or expired token',
      }));
    });

    it('rejects expired token with 403', async () => {
      const expiredPayload = {
        ...buildPayload(),
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const token = signToken(expiredPayload);
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: `Bearer ${token}` } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid or expired token',
      }));
    });

    it('rejects malformed Authorization header (no Bearer split) with 401', async () => {
      const { authenticateToken } = require('../auth');
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: 'NoBearerPrefix' } }),
        res,
        next,
      );
      // split(' ')[1] is undefined; falls through to no-token path
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
    });

    it('skips session lookup for JWT with demoMode=true flag', async () => {
      const demoPayload = { ...buildPayload(), demoMode: true };
      const token = signToken(demoPayload);
      const { authenticateToken } = require('../auth');
      const req = buildReq({ headers: { authorization: `Bearer ${token}` } });
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect(mockFindUniqueSession).not.toHaveBeenCalled();
    });

    it('falls back to Cognito verification when local JWT fails and Cognito is enabled', async () => {
      const cognitoUser = buildPayload({ userId: 'sso-user', role: 'HOSPITAL_ADMIN' });
      mockIsCognitoEnabled.mockReturnValue(true);
      mockVerifyCognitoToken.mockResolvedValue(cognitoUser);
      const { authenticateToken } = require('../auth');
      const req = buildReq({ headers: { authorization: 'Bearer cognito-rs256-token' } });
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect((req as any).user?.userId).toBe('sso-user');
      expect(mockVerifyCognitoToken).toHaveBeenCalledWith('cognito-rs256-token');
    });

    it('rejects with 403 when local JWT fails and Cognito returns null', async () => {
      mockIsCognitoEnabled.mockReturnValue(true);
      mockVerifyCognitoToken.mockResolvedValue(null);
      const { authenticateToken } = require('../auth');
      const { res, status, json } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: 'Bearer bogus-token' } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid or expired token',
      }));
    });

    it('does not call Cognito when isCognitoEnabled returns false', async () => {
      mockIsCognitoEnabled.mockReturnValue(false);
      const { authenticateToken } = require('../auth');
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(
        buildReq({ headers: { authorization: 'Bearer bogus' } }),
        res,
        next,
      );
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(mockVerifyCognitoToken).not.toHaveBeenCalled();
    });

    it('bypasses auth and creates demo SUPER_ADMIN payload when DEMO_MODE=true and no token', async () => {
      const { authenticateToken } = loadFreshAuth({ DEMO_MODE: 'true' });
      const req = buildReq();
      const { res, status } = buildRes();
      const next = jest.fn();
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
      expect((req as any).user?.role).toBe('SUPER_ADMIN');
      expect((req as any).user?.demoMode).toBe(true);
      expect((req as any).user?.userId).toBe('demo-user');
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (b): authorizeHospital
  // ───────────────────────────────────────────────────────────────────────
  describe('authorizeHospital', () => {
    it('bypasses check for SUPER_ADMIN regardless of hospitalId', () => {
      const { authorizeHospital } = require('../auth');
      const req = buildReq({
        user: buildPayload({ role: 'SUPER_ADMIN', hospitalId: 'hosp-1' }),
        params: { hospitalId: 'hosp-99' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses check entirely when DEMO_MODE=true', () => {
      const { authorizeHospital } = loadFreshAuth({ DEMO_MODE: 'true' });
      const req = buildReq({
        user: buildPayload({ role: 'PHYSICIAN', hospitalId: 'hosp-1' }),
        params: { hospitalId: 'hosp-99' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access when params.hospitalId matches user.hospitalId', () => {
      const { authorizeHospital } = require('../auth');
      const req = buildReq({
        user: buildPayload({ hospitalId: 'hosp-1' }),
        params: { hospitalId: 'hosp-1' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access when query.hospitalId matches user.hospitalId', () => {
      const { authorizeHospital } = require('../auth');
      const req = buildReq({
        user: buildPayload({ hospitalId: 'hosp-1' }),
        query: { hospitalId: 'hosp-1' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when hospitalId in params does not match user.hospitalId', () => {
      const { authorizeHospital } = require('../auth');
      const req = buildReq({
        user: buildPayload({ hospitalId: 'hosp-1' }),
        params: { hospitalId: 'hosp-99' },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied: Cannot access other hospital data',
      }));
    });

    it('continues to next() when no hospitalId is in the request (route handler scopes)', () => {
      const { authorizeHospital } = require('../auth');
      const req = buildReq({
        user: buildPayload({ hospitalId: 'hosp-1' }),
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeHospital(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (c): authorizeRole
  // ───────────────────────────────────────────────────────────────────────
  describe('authorizeRole', () => {
    it('allows access when user role is in the allowlist', () => {
      const { authorizeRole } = require('../auth');
      const middleware = authorizeRole(['PHYSICIAN', 'NURSE_MANAGER']);
      const req = buildReq({ user: buildPayload({ role: 'PHYSICIAN' }) });
      const { res, status } = buildRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when user role is not in the allowlist', () => {
      const { authorizeRole } = require('../auth');
      const middleware = authorizeRole(['SUPER_ADMIN']);
      const req = buildReq({ user: buildPayload({ role: 'VIEWER' }) });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied: Requires one of roles: SUPER_ADMIN',
      }));
    });

    it('rejects with 403 when no user is present on the request', () => {
      const { authorizeRole } = require('../auth');
      const middleware = authorizeRole(['PHYSICIAN']);
      const req = buildReq();
      const { res, status } = buildRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
    });

    it('allows access when role matches any of multiple allowed roles', () => {
      const { authorizeRole } = require('../auth');
      const middleware = authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN']);
      const req = buildReq({ user: buildPayload({ role: 'HOSPITAL_ADMIN' }) });
      const { res, status } = buildRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses role check when DEMO_MODE=true', () => {
      const { authorizeRole } = loadFreshAuth({ DEMO_MODE: 'true' });
      const middleware = authorizeRole(['SUPER_ADMIN']);
      const req = buildReq({ user: buildPayload({ role: 'VIEWER' }) });
      const { res, status } = buildRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (d): authorizeModule
  // ───────────────────────────────────────────────────────────────────────
  describe('authorizeModule', () => {
    it('continues when no moduleId is present in the request', () => {
      const { authorizeModule } = require('../auth');
      const req = buildReq({ user: buildPayload() });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access when MODULE_KEY_MAP entry is granted in user permissions', () => {
      const { authorizeModule } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { modules: { heartFailure: true } } }),
        params: { moduleId: 'heart-failure' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when MODULE_KEY_MAP entry is denied in user permissions', () => {
      const { authorizeModule } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { modules: { heartFailure: false } } }),
        params: { moduleId: 'heart-failure' },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied: No permission for module heart-failure',
      }));
    });

    it('continues to next() for unknown module slug (route returns 404 instead)', () => {
      const { authorizeModule } = require('../auth');
      const req = buildReq({
        user: buildPayload(),
        params: { moduleId: 'made-up-module' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('supports the abbreviated module slug (ep) via MODULE_KEY_MAP', () => {
      const { authorizeModule } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { modules: { electrophysiology: true } } }),
        query: { module: 'ep' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses module check when DEMO_MODE=true', () => {
      const { authorizeModule } = loadFreshAuth({ DEMO_MODE: 'true' });
      const req = buildReq({
        user: buildPayload({ permissions: { modules: { heartFailure: false } } }),
        params: { moduleId: 'heart-failure' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeModule(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category (e): authorizeView
  // ───────────────────────────────────────────────────────────────────────
  describe('authorizeView', () => {
    it('continues when no viewType is present in the request', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({ user: buildPayload() });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access to the executive view when granted', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { views: { executive: true } } }),
        params: { viewType: 'executive' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access to the service-line view (kebab variant) when serviceLines granted', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { views: { serviceLines: true } } }),
        params: { viewType: 'service-line' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access to the service-lines view (plural variant) when serviceLines granted', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { views: { serviceLines: true } } }),
        query: { view: 'service-lines' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('allows access to the care-team view when granted', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { views: { careTeam: true } } }),
        params: { viewType: 'care-team' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the requested view is denied in user permissions', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload({ permissions: { views: { executive: false } } }),
        params: { viewType: 'executive' },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied: No permission for view executive',
      }));
    });

    it('continues to next() for unknown view slug not in viewKeyMap', () => {
      const { authorizeView } = require('../auth');
      const req = buildReq({
        user: buildPayload(),
        params: { viewType: 'made-up-view' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });

    it('bypasses view check when DEMO_MODE=true', () => {
      const { authorizeView } = loadFreshAuth({ DEMO_MODE: 'true' });
      const req = buildReq({
        user: buildPayload({ permissions: { views: { executive: false } } }),
        params: { viewType: 'executive' },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      authorizeView(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(status).not.toHaveBeenCalled();
    });
  });
});
