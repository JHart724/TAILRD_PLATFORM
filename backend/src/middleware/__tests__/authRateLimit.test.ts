/**
 * AUDIT-001 Tier A coverage extension for backend/src/middleware/authRateLimit.ts
 * (P1.AUDIT-001.D file 5 of 7; request-gate domain).
 *
 * 7 axes (a-g) / target 25+ test invocations / NEW file (no prior test coverage).
 *
 * Per V.5-RECOVERY discipline + Q-D.D2 Path (b) comprehensive lock + catch #54
 * applies-only-where-source-warrants discipline (DEMO_MODE axis REMOVED; canonical-grep
 * A.AUTH.3 confirmed NO DEMO_MODE bypass in source).
 *
 * Mock policy:
 *   REUSE: buildReq + buildRes adapted for express-rate-limit v7 (status + send + setHeader)
 *   REUSE: jest.isolateModules + jest.mock for createRedisRateLimitStore swap test (axis f)
 *   NOT mocked: express-rate-limit (REAL MemoryStore execution; unique keys per test
 *     prevent cross-test counter interference)
 *   NOT mocked: authRateLimit module itself (REAL execution required for coverage)
 */
import type { Request, Response, NextFunction } from 'express';

function buildReq(overrides: any = {}): Request {
  return {
    ip: '1.2.3.4',
    body: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function buildRes() {
  const send = jest.fn();
  const json = jest.fn();
  const setHeader = jest.fn();
  const status = jest.fn();
  status.mockReturnValue({ send, json, setHeader, status });
  const res = { status, send, json, setHeader } as unknown as Response;
  return { res, status, send, json, setHeader };
}

async function invoke(
  middleware: any,
  req: Request,
  res: Response,
): Promise<{ nextCalled: boolean }> {
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  const result = middleware(req, res, next);
  if (result && typeof result.then === 'function') {
    await result;
  }
  await new Promise((r) => setImmediate(r));
  return { nextCalled };
}

let keyCounter = 0;
function uniqueIp(): string {
  keyCounter++;
  return `10.0.${Math.floor(keyCounter / 256)}.${keyCounter % 256}`;
}
function uniqueEmail(): string {
  return `t${++keyCounter}-${Date.now()}@example.com`;
}

describe('authRateLimit middleware - AUDIT-001 Tier A coverage extension', () => {
  describe('(a) loginRateLimit (15min window, max 5, ip-email keyGen)', () => {
    it('a.1: allows 5 sequential requests with same ip-email key', async () => {
      const { loginRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      const email = uniqueEmail();
      for (let i = 0; i < 5; i++) {
        const req = buildReq({ ip, body: { email } });
        const { res } = buildRes();
        const { nextCalled } = await invoke(loginRateLimit, req, res);
        expect(nextCalled).toBe(true);
      }
    });

    it('a.2: 6th request with same ip-email key is rate-limited (429 status set)', async () => {
      const { loginRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      const email = uniqueEmail();
      let finalStatus: jest.Mock = jest.fn();
      let finalNextCalled = true;
      for (let i = 0; i < 6; i++) {
        const req = buildReq({ ip, body: { email } });
        const built = buildRes();
        const { nextCalled } = await invoke(loginRateLimit, req, built.res);
        if (i === 5) {
          finalStatus = built.status;
          finalNextCalled = nextCalled;
        }
      }
      expect(finalNextCalled).toBe(false);
      expect(finalStatus).toHaveBeenCalledWith(429);
    });

    it('a.3: distinct ip-email keys do not share counter (parallel users isolated)', async () => {
      const { loginRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      const emailA = uniqueEmail();
      const emailB = uniqueEmail();
      // Exhaust user A
      for (let i = 0; i < 5; i++) {
        const req = buildReq({ ip, body: { email: emailA } });
        await invoke(loginRateLimit, req, buildRes().res);
      }
      // User B with same IP but different email still allowed
      const req = buildReq({ ip, body: { email: emailB } });
      const { res } = buildRes();
      const { nextCalled } = await invoke(loginRateLimit, req, res);
      expect(nextCalled).toBe(true);
    });

    it('a.4: distinct IPs do not share counter (same email different IPs isolated)', async () => {
      const { loginRateLimit } = require('../authRateLimit');
      const ipA = uniqueIp();
      const ipB = uniqueIp();
      const email = uniqueEmail();
      for (let i = 0; i < 5; i++) {
        await invoke(loginRateLimit, buildReq({ ip: ipA, body: { email } }), buildRes().res);
      }
      const req = buildReq({ ip: ipB, body: { email } });
      const { res } = buildRes();
      const { nextCalled } = await invoke(loginRateLimit, req, res);
      expect(nextCalled).toBe(true);
    });

    it('a.5: empty body.email still produces a stable key (ip-empty)', async () => {
      const { loginRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      for (let i = 0; i < 5; i++) {
        await invoke(loginRateLimit, buildReq({ ip, body: {} }), buildRes().res);
      }
      const built = buildRes();
      const { nextCalled } = await invoke(loginRateLimit, buildReq({ ip, body: {} }), built.res);
      expect(nextCalled).toBe(false);
      expect(built.status).toHaveBeenCalledWith(429);
    });
  });

  describe('(b) passwordResetRateLimit (60min window, max 3)', () => {
    it('b.1: allows 3 sequential requests with same key', async () => {
      const { passwordResetRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      for (let i = 0; i < 3; i++) {
        const { nextCalled } = await invoke(passwordResetRateLimit, buildReq({ ip }), buildRes().res);
        expect(nextCalled).toBe(true);
      }
    });

    it('b.2: 4th request is rate-limited with 429', async () => {
      const { passwordResetRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      let final = { status: jest.fn() as jest.Mock, nextCalled: true };
      for (let i = 0; i < 4; i++) {
        const built = buildRes();
        const { nextCalled } = await invoke(passwordResetRateLimit, buildReq({ ip }), built.res);
        if (i === 3) final = { status: built.status, nextCalled };
      }
      expect(final.nextCalled).toBe(false);
      expect(final.status).toHaveBeenCalledWith(429);
    });

    it('b.3: distinct IPs do not share counter', async () => {
      const { passwordResetRateLimit } = require('../authRateLimit');
      const ipA = uniqueIp();
      const ipB = uniqueIp();
      for (let i = 0; i < 3; i++) {
        await invoke(passwordResetRateLimit, buildReq({ ip: ipA }), buildRes().res);
      }
      const { nextCalled } = await invoke(passwordResetRateLimit, buildReq({ ip: ipB }), buildRes().res);
      expect(nextCalled).toBe(true);
    });
  });

  describe('(c) tokenRefreshRateLimit (1min window, max 10)', () => {
    it('c.1: allows 10 sequential requests', async () => {
      const { tokenRefreshRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      for (let i = 0; i < 10; i++) {
        const { nextCalled } = await invoke(tokenRefreshRateLimit, buildReq({ ip }), buildRes().res);
        expect(nextCalled).toBe(true);
      }
    });

    it('c.2: 11th request is rate-limited with 429', async () => {
      const { tokenRefreshRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      let final = { status: jest.fn() as jest.Mock, nextCalled: true };
      for (let i = 0; i < 11; i++) {
        const built = buildRes();
        const { nextCalled } = await invoke(tokenRefreshRateLimit, buildReq({ ip }), built.res);
        if (i === 10) final = { status: built.status, nextCalled };
      }
      expect(final.nextCalled).toBe(false);
      expect(final.status).toHaveBeenCalledWith(429);
    });

    it('c.3: distinct IPs do not share counter', async () => {
      const { tokenRefreshRateLimit } = require('../authRateLimit');
      const ipA = uniqueIp();
      const ipB = uniqueIp();
      for (let i = 0; i < 10; i++) {
        await invoke(tokenRefreshRateLimit, buildReq({ ip: ipA }), buildRes().res);
      }
      const { nextCalled } = await invoke(tokenRefreshRateLimit, buildReq({ ip: ipB }), buildRes().res);
      expect(nextCalled).toBe(true);
    });
  });

  describe('(d) registrationRateLimit (60min window, max 3)', () => {
    it('d.1: allows 3 sequential requests with same key', async () => {
      const { registrationRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      for (let i = 0; i < 3; i++) {
        const { nextCalled } = await invoke(registrationRateLimit, buildReq({ ip }), buildRes().res);
        expect(nextCalled).toBe(true);
      }
    });

    it('d.2: 4th request is rate-limited with 429', async () => {
      const { registrationRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      let final = { status: jest.fn() as jest.Mock, nextCalled: true };
      for (let i = 0; i < 4; i++) {
        const built = buildRes();
        const { nextCalled } = await invoke(registrationRateLimit, buildReq({ ip }), built.res);
        if (i === 3) final = { status: built.status, nextCalled };
      }
      expect(final.nextCalled).toBe(false);
      expect(final.status).toHaveBeenCalledWith(429);
    });

    it('d.3: distinct IPs do not share counter', async () => {
      const { registrationRateLimit } = require('../authRateLimit');
      const ipA = uniqueIp();
      const ipB = uniqueIp();
      for (let i = 0; i < 3; i++) {
        await invoke(registrationRateLimit, buildReq({ ip: ipA }), buildRes().res);
      }
      const { nextCalled } = await invoke(registrationRateLimit, buildReq({ ip: ipB }), buildRes().res);
      expect(nextCalled).toBe(true);
    });
  });

  describe('(e) exportRateLimit (60min window, max 10, userId-or-ip keyGen)', () => {
    it('e.1: allows 10 sequential requests with same userId key', async () => {
      const { exportRateLimit } = require('../authRateLimit');
      const userId = `user-${keyCounter++}-${Date.now()}`;
      for (let i = 0; i < 10; i++) {
        const req = buildReq({ ip: uniqueIp(), user: { userId } });
        const { nextCalled } = await invoke(exportRateLimit, req, buildRes().res);
        expect(nextCalled).toBe(true);
      }
    });

    it('e.2: 11th request with same userId is rate-limited even from different IP (userId-preferred-over-ip)', async () => {
      const { exportRateLimit } = require('../authRateLimit');
      const userId = `user-${keyCounter++}-${Date.now()}`;
      let final = { status: jest.fn() as jest.Mock, nextCalled: true };
      for (let i = 0; i < 11; i++) {
        const built = buildRes();
        const req = buildReq({ ip: uniqueIp(), user: { userId } });
        const { nextCalled } = await invoke(exportRateLimit, req, built.res);
        if (i === 10) final = { status: built.status, nextCalled };
      }
      expect(final.nextCalled).toBe(false);
      expect(final.status).toHaveBeenCalledWith(429);
    });

    it('e.3: falls back to req.ip when req.user is undefined', async () => {
      const { exportRateLimit } = require('../authRateLimit');
      const ip = uniqueIp();
      for (let i = 0; i < 10; i++) {
        await invoke(exportRateLimit, buildReq({ ip }), buildRes().res);
      }
      const built = buildRes();
      const { nextCalled } = await invoke(exportRateLimit, buildReq({ ip }), built.res);
      expect(nextCalled).toBe(false);
      expect(built.status).toHaveBeenCalledWith(429);
    });

    it('e.4: distinct userIds do not share counter', async () => {
      const { exportRateLimit } = require('../authRateLimit');
      const userIdA = `user-${keyCounter++}-${Date.now()}`;
      const userIdB = `user-${keyCounter++}-${Date.now()}`;
      const ip = uniqueIp();
      for (let i = 0; i < 10; i++) {
        await invoke(exportRateLimit, buildReq({ ip, user: { userId: userIdA } }), buildRes().res);
      }
      const { nextCalled } = await invoke(
        exportRateLimit,
        buildReq({ ip, user: { userId: userIdB } }),
        buildRes().res,
      );
      expect(nextCalled).toBe(true);
    });
  });

  describe('(f) upgradeAuthRateLimitStores Redis swap', () => {
    it('f.1: returns false when createRedisRateLimitStore returns null (Redis unavailable)', () => {
      let mod: any;
      jest.isolateModules(() => {
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: jest.fn(() => null),
        }));
        mod = require('../authRateLimit');
      });
      const result = mod.upgradeAuthRateLimitStores();
      expect(result).toBe(false);
    });

    it('f.2: returns true when createRedisRateLimitStore returns store object', () => {
      let mod: any;
      let mockCreateStore: jest.Mock;
      jest.isolateModules(() => {
        mockCreateStore = jest.fn(() => ({
          increment: jest.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date(Date.now() + 900000) }),
          decrement: jest.fn().mockResolvedValue(undefined),
          resetKey: jest.fn().mockResolvedValue(undefined),
        }));
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: mockCreateStore,
        }));
        mod = require('../authRateLimit');
      });
      const result = mod.upgradeAuthRateLimitStores();
      expect(result).toBe(true);
    });

    it('f.3: requests 5 distinct Redis stores by namespace (login + pwreset + refresh + register + export)', () => {
      let mod: any;
      let mockCreateStore: jest.Mock;
      jest.isolateModules(() => {
        mockCreateStore = jest.fn(() => ({
          increment: jest.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date(Date.now() + 900000) }),
          decrement: jest.fn().mockResolvedValue(undefined),
          resetKey: jest.fn().mockResolvedValue(undefined),
        }));
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: mockCreateStore,
        }));
        mod = require('../authRateLimit');
      });
      mod.upgradeAuthRateLimitStores();
      const namespaces = mockCreateStore!.mock.calls.map((c) => c[0]);
      expect(namespaces).toEqual(
        expect.arrayContaining(['auth:login', 'auth:pwreset', 'auth:refresh', 'auth:register', 'auth:export']),
      );
      expect(mockCreateStore!).toHaveBeenCalledTimes(5);
    });

    it('f.4: early-return false skips remaining 4 store creations (loginStore probed first)', () => {
      let mod: any;
      let mockCreateStore: jest.Mock;
      jest.isolateModules(() => {
        mockCreateStore = jest.fn(() => null);
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: mockCreateStore,
        }));
        mod = require('../authRateLimit');
      });
      const result = mod.upgradeAuthRateLimitStores();
      expect(result).toBe(false);
      expect(mockCreateStore!).toHaveBeenCalledTimes(1);
      expect(mockCreateStore!).toHaveBeenCalledWith('auth:login');
    });
  });

  describe('(g) Delegate handler pattern (active limiter swap behavior)', () => {
    it('g.1: loginRateLimit export is a function with arity 3 (req, res, next)', () => {
      const { loginRateLimit } = require('../authRateLimit');
      expect(typeof loginRateLimit).toBe('function');
      expect(loginRateLimit.length).toBe(3);
    });

    it('g.2: all 5 named exports are RequestHandler functions', () => {
      const mod = require('../authRateLimit');
      const handlers = [
        mod.loginRateLimit,
        mod.passwordResetRateLimit,
        mod.tokenRefreshRateLimit,
        mod.registrationRateLimit,
        mod.exportRateLimit,
      ];
      for (const h of handlers) {
        expect(typeof h).toBe('function');
        expect(h.length).toBe(3);
      }
    });

    it('g.3: after Redis upgrade, delegate invokes Redis store increment on request', async () => {
      let mod: any;
      const incrementMock = jest.fn().mockResolvedValue({
        totalHits: 1,
        resetTime: new Date(Date.now() + 900000),
      });
      jest.isolateModules(() => {
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: jest.fn(() => ({
            increment: incrementMock,
            decrement: jest.fn().mockResolvedValue(undefined),
            resetKey: jest.fn().mockResolvedValue(undefined),
          })),
        }));
        mod = require('../authRateLimit');
      });
      mod.upgradeAuthRateLimitStores();
      const req = buildReq({ ip: uniqueIp(), body: { email: uniqueEmail() } });
      const { res } = buildRes();
      await invoke(mod.loginRateLimit, req, res);
      expect(incrementMock).toHaveBeenCalled();
    });

    it('g.4: after Redis upgrade, exportRateLimit keyGenerator uses req.user.userId when set (L161 left-side OR)', async () => {
      let mod: any;
      const incrementMock = jest.fn().mockResolvedValue({
        totalHits: 1,
        resetTime: new Date(Date.now() + 3600000),
      });
      jest.isolateModules(() => {
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: jest.fn(() => ({
            increment: incrementMock,
            decrement: jest.fn().mockResolvedValue(undefined),
            resetKey: jest.fn().mockResolvedValue(undefined),
          })),
        }));
        mod = require('../authRateLimit');
      });
      mod.upgradeAuthRateLimitStores();
      const userId = `user-redis-${keyCounter++}`;
      const req = buildReq({ ip: uniqueIp(), user: { userId } });
      const { res } = buildRes();
      await invoke(mod.exportRateLimit, req, res);
      expect(incrementMock).toHaveBeenCalled();
      // increment is called with the keyGenerator's output as key
      const firstCallArg = incrementMock.mock.calls[0][0];
      expect(firstCallArg).toBe(userId);
    });

    it('g.5: after Redis upgrade, exportRateLimit falls back to req.ip when req.user undefined (L161 right-side OR)', async () => {
      let mod: any;
      const incrementMock = jest.fn().mockResolvedValue({
        totalHits: 1,
        resetTime: new Date(Date.now() + 3600000),
      });
      jest.isolateModules(() => {
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: jest.fn(() => ({
            increment: incrementMock,
            decrement: jest.fn().mockResolvedValue(undefined),
            resetKey: jest.fn().mockResolvedValue(undefined),
          })),
        }));
        mod = require('../authRateLimit');
      });
      mod.upgradeAuthRateLimitStores();
      const ip = uniqueIp();
      const req = buildReq({ ip });
      const { res } = buildRes();
      await invoke(mod.exportRateLimit, req, res);
      expect(incrementMock).toHaveBeenCalled();
      const firstCallArg = incrementMock.mock.calls[0][0];
      expect(firstCallArg).toBe(ip);
    });

    it('g.6: after Redis upgrade, loginRateLimit handles empty body.email (L124 right-side OR fallback)', async () => {
      let mod: any;
      const incrementMock = jest.fn().mockResolvedValue({
        totalHits: 1,
        resetTime: new Date(Date.now() + 900000),
      });
      jest.isolateModules(() => {
        jest.doMock('../../lib/redis', () => ({
          createRedisRateLimitStore: jest.fn(() => ({
            increment: incrementMock,
            decrement: jest.fn().mockResolvedValue(undefined),
            resetKey: jest.fn().mockResolvedValue(undefined),
          })),
        }));
        mod = require('../authRateLimit');
      });
      mod.upgradeAuthRateLimitStores();
      const ip = uniqueIp();
      const req = buildReq({ ip, body: {} });
      const { res } = buildRes();
      await invoke(mod.loginRateLimit, req, res);
      expect(incrementMock).toHaveBeenCalled();
      // keyGenerator output: `${ip}-${body.email || ''}` -> `${ip}-`
      const firstCallArg = incrementMock.mock.calls[0][0];
      expect(firstCallArg).toBe(`${ip}-`);
    });
  });
});
