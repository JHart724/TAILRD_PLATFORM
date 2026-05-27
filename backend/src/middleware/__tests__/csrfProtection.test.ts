/**
 * AUDIT-001 Tier A coverage extension for backend/src/middleware/csrfProtection.ts
 * (P1.AUDIT-001.D file 4 of 7; request-gate domain).
 *
 * 10 axes (a-j) / target 22+ test invocations / NEW file (no prior test coverage).
 *
 * Per V.5-RECOVERY discipline + Q-D.D2 Path (b) comprehensive lock:
 *   - Axes (a)-(j) exhaustive across 4 exports + 5 skip-path branches + Double-Submit
 *     Cookie validation + timing-safe-compare invariant per OWASP CSRF prevention.
 *   - Sister-precedent: auth.test.ts buildReq + buildRes + loadFreshAuth jest.isolateModules
 *     pattern adapted for module-load isDemoMode + isProduction env toggle.
 *
 * Mock policy (REAL execution; NOT mocked):
 *   - csrfProtection module itself - REAL execution required for coverage instrumentation
 *   - crypto - preserves cryptographic invariants per axis (a)
 *   - REUSE infrastructure: buildReq + buildRes + jest.isolateModules env toggle
 *   - NOVEL infrastructure (minimal): buildReq cookies + headers extension
 */
import type { Request, Response, NextFunction } from 'express';

function buildReq(overrides: any = {}): Request {
  return {
    method: 'GET',
    path: '/',
    cookies: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function buildRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const cookie = jest.fn();
  const res = { status, json, cookie } as unknown as Response;
  return { res, status, json, cookie };
}

function loadFreshCsrf(envOverrides: Record<string, string | undefined> = {}): any {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../csrfProtection');
  });
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return mod;
}

describe('csrfProtection middleware - AUDIT-001 Tier A coverage extension', () => {
  describe('(a) generateCSRFToken cryptographic invariants', () => {
    it('a.1: returns 64-character hex string (CSRF_TOKEN_LENGTH=32 bytes -> hex doubles)', () => {
      const { generateCSRFToken } = require('../csrfProtection');
      const token = generateCSRFToken();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('a.2: is non-deterministic (two calls produce different tokens)', () => {
      const { generateCSRFToken } = require('../csrfProtection');
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(t1).not.toBe(t2);
    });

    it('a.3: output decodes as hex Buffer with length 32 bytes', () => {
      const { generateCSRFToken } = require('../csrfProtection');
      const token = generateCSRFToken();
      const buf = Buffer.from(token, 'hex');
      expect(buf.length).toBe(32);
    });
  });

  describe('(b) csrfCookieSetter behavior', () => {
    it('b.1: sets __tailrd_csrf cookie when absent with httpOnly:false + sameSite:strict + path:/ + maxAge:24h', () => {
      const { csrfCookieSetter } = require('../csrfProtection');
      const req = buildReq({ cookies: {} });
      const { res, cookie } = buildRes();
      const next = jest.fn();
      csrfCookieSetter(req, res, next);
      expect(cookie).toHaveBeenCalledTimes(1);
      const [name, value, opts] = cookie.mock.calls[0];
      expect(name).toBe('__tailrd_csrf');
      expect(value).toMatch(/^[0-9a-f]{64}$/);
      expect(opts.httpOnly).toBe(false);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBe(24 * 60 * 60 * 1000);
      expect(next).toHaveBeenCalled();
    });

    it('b.2: skips cookie set when __tailrd_csrf already present', () => {
      const { csrfCookieSetter } = require('../csrfProtection');
      const req = buildReq({ cookies: { __tailrd_csrf: 'existing-token' } });
      const { res, cookie } = buildRes();
      const next = jest.fn();
      csrfCookieSetter(req, res, next);
      expect(cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('b.3: cookie secure=true when NODE_ENV=production (module-load isProduction constant)', () => {
      const mod = loadFreshCsrf({ NODE_ENV: 'production', DEMO_MODE: undefined });
      const req = buildReq({ cookies: {} });
      const { res, cookie } = buildRes();
      const next = jest.fn();
      mod.csrfCookieSetter(req, res, next);
      const [, , opts] = cookie.mock.calls[0];
      expect(opts.secure).toBe(true);
    });

    it('b.4: cookie secure=false when NODE_ENV != production', () => {
      const mod = loadFreshCsrf({ NODE_ENV: 'test', DEMO_MODE: undefined });
      const req = buildReq({ cookies: {} });
      const { res, cookie } = buildRes();
      const next = jest.fn();
      mod.csrfCookieSetter(req, res, next);
      const [, , opts] = cookie.mock.calls[0];
      expect(opts.secure).toBe(false);
    });

    it('b.5: req.cookies undefined still proceeds and sets cookie (optional-chain guard)', () => {
      const { csrfCookieSetter } = require('../csrfProtection');
      const req = { method: 'GET', path: '/', headers: {} } as unknown as Request;
      const { res, cookie } = buildRes();
      const next = jest.fn();
      csrfCookieSetter(req, res, next);
      expect(cookie).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('(c) csrfProtection isDemoMode bypass', () => {
    it('c.1: DEMO_MODE=true bypasses validation regardless of method/cookies/headers', () => {
      const mod = loadFreshCsrf({ DEMO_MODE: 'true' });
      const req = buildReq({ method: 'POST', path: '/api/patients', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      mod.csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('(d) csrfProtection safe-method skip', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('d.%#: %s method bypasses validation', (method) => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method, path: '/api/patients', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('(e) csrfProtection webhook-path skip', () => {
    it('e.1: /api/webhooks prefix bypasses validation on POST without cookie/header', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/webhooks/redox', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('(f) csrfProtection auth-path skip', () => {
    it('f.1: /api/auth/login bypasses validation on POST', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/auth/login', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });

    it('f.2: /api/auth/register bypasses validation on POST', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/auth/register', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('(g) csrfProtection password-reset-path skip', () => {
    it('g.1: /api/account/password-reset bypasses validation on POST', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/account/password-reset', cookies: {}, headers: {} });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });

  describe('(h) csrfProtection missing-token paths', () => {
    it('h.1: cookie missing on mutating request -> 403 CSRF-missing error', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: {},
        headers: { 'x-csrf-token': 'abc' },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'CSRF token missing. Include X-CSRF-Token header.',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('h.2: header missing on mutating request -> 403 CSRF-missing error', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: { __tailrd_csrf: 'abc' },
        headers: {},
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'CSRF token missing. Include X-CSRF-Token header.',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('h.3: both cookie and header missing on mutating request -> 403', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/patients', cookies: {}, headers: {} });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(next).not.toHaveBeenCalled();
    });

    it('h.4: response includes ISO timestamp on missing-token rejection', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({ method: 'POST', path: '/api/patients', cookies: {}, headers: {} });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      const body = json.mock.calls[0][0];
      expect(typeof body.timestamp).toBe('string');
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe('(i) csrfProtection timing-safe-compare paths', () => {
    it('i.1: cookie/header length mismatch short-circuits crypto.timingSafeEqual -> 403 mismatch', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: { __tailrd_csrf: 'short' },
        headers: { 'x-csrf-token': 'much-longer-token-value' },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'CSRF token mismatch',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('i.2: cookie/header content mismatch (same length) -> 403 mismatch', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: { __tailrd_csrf: 'a'.repeat(64) },
        headers: { 'x-csrf-token': 'b'.repeat(64) },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'CSRF token mismatch',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('i.3: cookie/header match -> next() called, no status set', () => {
      const { csrfProtection } = require('../csrfProtection');
      const token = 'a'.repeat(64);
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: { __tailrd_csrf: token },
        headers: { 'x-csrf-token': token },
      });
      const { res, status } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });

    it('i.4: Buffer.from non-string throws -> catch block returns 403 invalid', () => {
      const { csrfProtection } = require('../csrfProtection');
      const req = buildReq({
        method: 'POST',
        path: '/api/patients',
        cookies: { __tailrd_csrf: 1234 as any },
        headers: { 'x-csrf-token': 5678 as any },
      });
      const { res, status, json } = buildRes();
      const next = jest.fn();
      csrfProtection(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid CSRF token',
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('(j) csrfTokenEndpoint', () => {
    it('j.1: generates token + sets cookie + returns success JSON envelope', () => {
      const { csrfTokenEndpoint } = require('../csrfProtection');
      const req = buildReq();
      const { res, json, cookie } = buildRes();
      csrfTokenEndpoint(req, res);
      expect(cookie).toHaveBeenCalledTimes(1);
      const [name, value, opts] = cookie.mock.calls[0];
      expect(name).toBe('__tailrd_csrf');
      expect(value).toMatch(/^[0-9a-f]{64}$/);
      expect(opts.sameSite).toBe('strict');
      expect(opts.httpOnly).toBe(false);
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBe(24 * 60 * 60 * 1000);
      expect(json).toHaveBeenCalledWith({
        success: true,
        data: { csrfToken: value },
      });
    });

    it('j.2: each call generates a distinct token', () => {
      const { csrfTokenEndpoint } = require('../csrfProtection');
      const tokens: string[] = [];
      for (let i = 0; i < 2; i++) {
        const { res, json } = buildRes();
        csrfTokenEndpoint(buildReq(), res);
        tokens.push(json.mock.calls[0][0].data.csrfToken);
      }
      expect(tokens[0]).not.toBe(tokens[1]);
    });
  });
});
