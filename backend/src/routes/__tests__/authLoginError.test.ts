/**
 * AUDIT-109 Test 7 - auth.ts login-catch emits a (redacted) stack.
 *
 * Verifies the login error path now logs the exception STACK (not just the
 * message), matching the global error handler, and that a PHI fragment seeded
 * into that stack is redacted end-to-end by the logger format layer before it
 * reaches the stdout transport.
 *
 * Cross-references:
 *   - backend/src/routes/auth.ts (login catch - system under test)
 *   - backend/src/utils/logger.ts (format-layer redaction)
 *   - docs/architecture/AUDIT_109_ERROR_LOGGING_OBSERVABILITY_NOTES.md §6.2 test 7
 */

import express from 'express';
import request from 'supertest';
import winston from 'winston';

// Mock the Prisma singleton so importing the auth router does not initialize the
// real client (PHI middleware, DB connection) and so the login lookup throws.
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';
import { logger } from '../../utils/logger';
// auth.ts uses `export = router`.
import authRouter = require('../auth');

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('AUDIT-109 Test 7 - login catch logs a redacted stack', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (prisma.user.findFirst as jest.Mock).mockReset();
  });

  it('passes the exception stack to logger.error and redacts PHI end-to-end', async () => {
    // Seed an error whose stack carries a patient-name PHI fragment.
    const seededError = new Error('decrypt failed');
    seededError.stack =
      'Error: decrypt failed\n' +
      '    Context: patient John Smith lookup\n' +
      '    at decrypt (/app/src/middleware/phiEncryption.ts:185:11)';
    (prisma.user.findFirst as jest.Mock).mockRejectedValueOnce(seededError);

    // Spy on logger.error WITHOUT replacing its implementation (calls through),
    // so the format chain + transports still run.
    const errorSpy = jest.spyOn(logger, 'error');

    // Capture the post-format output emitted to the stdout JSON transport.
    const jsonConsole = logger.transports.find(
      (t) => (t as { name?: string }).name === 'console' && t.level === 'warn',
    );
    expect(jsonConsole).toBeDefined();
    const captured: string[] = [];
    const messageSymbol = Symbol.for('message');
    jest
      .spyOn(jsonConsole as winston.transport, 'log')
      .mockImplementation((info: unknown, next?: () => void) => {
        captured.push((info as Record<symbol, string>)[messageSymbol]);
        if (typeof next === 'function') next();
      });

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'someone@example.com', password: 'whatever' });

    await new Promise((resolve) => setImmediate(resolve));

    // Response is the generic 500 (no detail leaked to the client).
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, error: 'Internal server error' });

    // (a) The catch passed the stack to the logger (the AUDIT-109 fix).
    // winston's error() is heavily overloaded; treat captured calls loosely.
    const calls = errorSpy.mock.calls as unknown as Array<[unknown, unknown]>;
    const loginErrorCall = calls.find((c) => c[0] === 'Login error:');
    expect(loginErrorCall).toBeDefined();
    const meta = (loginErrorCall as [unknown, unknown])[1] as { error?: unknown; stack?: unknown };
    expect(typeof meta.stack).toBe('string');
    expect(meta.stack as string).toContain('patient John Smith'); // raw at the call site

    // (b) End-to-end: the stdout transport output has the name redacted.
    const out = captured.join('\n');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('[REDACTED-NAME]');
    expect(out).not.toContain('John Smith');
  });
});
