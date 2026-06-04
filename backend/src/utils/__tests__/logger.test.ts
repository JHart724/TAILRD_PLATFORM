/**
 * AUDIT-109 - `logger.ts` production error-logging + format-layer PHI redaction.
 *
 * Coverage (per docs/architecture/AUDIT_109_ERROR_LOGGING_OBSERVABILITY_NOTES.md §6.2):
 *   Test 1 - prod-env transport presence + LOG_STDOUT_LEVEL tunability
 *   Test 2 - happy path (clean content, no redaction artifacts)
 *   Test 3 - generic error (message + stack present)
 *   Test 4 - PHI-bearing throw redacted in message AND stack
 *   Test 5 - non-Error throw handled (no crash, nested redaction)
 *   Test 6 - redaction-failure fail-closed (placeholder, no raw, no throw)
 *   Test 8 - stack legibility under AGGRESSIVE redaction (frames resolvable)
 *   Wiring - format chain redacts end-to-end when logging through the real logger
 *
 * Test 7 (auth.ts login-catch stack) lives in
 * backend/src/routes/__tests__/authLoginError.test.ts.
 *
 * Cross-references:
 *   - backend/src/utils/logger.ts (system under test)
 *   - backend/src/utils/phiRedaction.ts (redaction patterns)
 */

import winston from 'winston';
import * as phiRedaction from '../phiRedaction';
import { redactLogInfo, logger } from '../logger';

// --- Helpers ------------------------------------------------------------------

const ENV_KEYS = ['NODE_ENV', 'LOG_STDOUT_LEVEL', 'LOG_LEVEL'] as const;

/**
 * Load a fresh copy of logger.ts under a controlled environment, then restore
 * the prior environment. Uses jest.isolateModules so the env is read at module
 * construction time. Transports are identified by their winston `.name`
 * ('console' / 'file') rather than instanceof, because the isolated module
 * registry yields a distinct winston instance.
 */
function loadFreshLogger(env: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>): {
  transports: Array<{ name?: string; level?: string }>;
} {
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  for (const k of ENV_KEYS) {
    const v = env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }

  let loaded: { logger: winston.Logger } | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    loaded = require('../logger') as { logger: winston.Logger };
  });

  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = saved[k];
    }
  }

  const transports = (loaded as { logger: winston.Logger }).logger.transports as Array<{
    name?: string;
    level?: string;
  }>;
  return { transports };
}

function consoleTransports(transports: Array<{ name?: string; level?: string }>): Array<{
  name?: string;
  level?: string;
}> {
  return transports.filter((t) => t.name === 'console');
}

// --- Test 1 - transport presence + level tunability ----------------------------

describe('Test 1 - production stdout transport presence + level tunability', () => {
  it('production: exactly one unconditional Console transport, default level warn', () => {
    const { transports } = loadFreshLogger({ NODE_ENV: 'production', LOG_STDOUT_LEVEL: undefined });
    const consoles = consoleTransports(transports);
    // In production the dev colorized console is not added, so the JSON stdout
    // transport is the only Console - proving presence is unconditional (not gated).
    expect(consoles).toHaveLength(1);
    expect(consoles[0].level).toBe('warn');
  });

  it('production: LOG_STDOUT_LEVEL tunes verbosity without affecting presence', () => {
    const { transports } = loadFreshLogger({ NODE_ENV: 'production', LOG_STDOUT_LEVEL: 'info' });
    const consoles = consoleTransports(transports);
    expect(consoles).toHaveLength(1);
    expect(consoles[0].level).toBe('info');
  });

  it('non-production: the unconditional warn-level stdout transport is still present', () => {
    const { transports } = loadFreshLogger({ NODE_ENV: 'test', LOG_STDOUT_LEVEL: undefined });
    const consoles = consoleTransports(transports);
    // Dev adds a second (colorized) Console; the JSON stdout one is identifiable
    // by its explicit warn level. Presence here proves the transport is not gated
    // on NODE_ENV === 'production'.
    expect(consoles.some((c) => c.level === 'warn')).toBe(true);
  });
});

// --- Tests 2-5, 8 - redactLogInfo behavior -------------------------------------

describe('Test 2 - happy path (clean content untouched)', () => {
  it('leaves non-PHI message/stack/meta intact with no placeholders', () => {
    const out = redactLogInfo({
      message: 'Global error handler:',
      stack: 'Error: connection reset\n    at Socket.onError (/app/src/net.ts:42:9)',
      path: '/api/health',
      method: 'GET',
      statusCode: 503,
    });
    expect(out.message).toBe('Global error handler:');
    expect(out.stack).toBe('Error: connection reset\n    at Socket.onError (/app/src/net.ts:42:9)');
    expect(out.path).toBe('/api/health');
    expect(out.statusCode).toBe(503);
    expect(JSON.stringify(out)).not.toContain('[REDACT');
  });
});

describe('Test 3 - generic error carries message + stack', () => {
  it('preserves both error message and stack for a PHI-free Error', () => {
    const err = new Error('database timeout after 5000ms');
    const out = redactLogInfo({
      message: 'Login error:',
      error: err.message,
      stack: err.stack,
    });
    expect(out.error).toBe('database timeout after 5000ms');
    expect(typeof out.stack).toBe('string');
    expect(out.stack as string).toContain('database timeout');
  });
});

describe('Test 4 - PHI-bearing throw redacted in message AND stack', () => {
  it('redacts a patient name (AGGRESSIVE) and CONSERVATIVE fragments in both fields', () => {
    const out = redactLogInfo({
      message: 'decrypt failed for patient John Smith (SSN 123-45-6789)',
      stack:
        'Error: lookup failed for patient Jane Roe\n' +
        '    contact jane.roe@example.com / MRN AB12345\n' +
        '    at decrypt (/app/src/phiEncryption.ts:185:11)',
    });

    // message (error-context -> AGGRESSIVE): name + SSN both gone.
    expect(out.message).not.toContain('John Smith');
    expect(out.message).toContain('[REDACTED-NAME]');
    expect(out.message).not.toContain('123-45-6789');
    expect(out.message).toContain('[REDACTED-SSN]');

    // stack (error-context -> AGGRESSIVE): name + email + MRN all gone.
    const stack = out.stack as string;
    expect(stack).not.toContain('Jane Roe');
    expect(stack).toContain('[REDACTED-NAME]');
    expect(stack).not.toContain('jane.roe@example.com');
    expect(stack).toContain('[REDACTED-EMAIL]');
    expect(stack).not.toContain('AB12345');
    expect(stack).toContain('[REDACTED-MRN]');
  });
});

describe('Test 5 - non-Error throw handled', () => {
  it('does not crash and redacts nested string leaves of a non-Error payload', () => {
    const out = redactLogInfo({
      message: 'caught non-error: SSN 123-45-6789',
      error: { kind: 'weird', detail: 'reach me at ops@example.com', code: 42 },
    });
    expect(out.message).toContain('[REDACTED-SSN]');
    const errObj = out.error as { kind: string; detail: string; code: number };
    expect(errObj.kind).toBe('weird');
    expect(errObj.detail).toContain('[REDACTED-EMAIL]');
    expect(errObj.code).toBe(42);
  });
});

describe('Test 8 - stack legibility under AGGRESSIVE redaction', () => {
  it('keeps class/method/file frames resolvable while redacting an actual name', () => {
    const stack =
      'Error: decrypt failed\n' +
      '    at PatientService.findByName (/app/src/services/patientService.ts:142:15)\n' +
      '    at processPatient (/app/src/ingestion/runGapDetectionForPatient.ts:88:7)\n' +
      '    Context: patient Jane Roe lookup';
    const out = redactLogInfo({ stack });
    const redacted = out.stack as string;

    // Positive control: a real "patient <First> <Last>" fragment IS redacted,
    // proving redaction is active (not silently disabled).
    expect(redacted).not.toContain('Jane Roe');
    expect(redacted).toContain('[REDACTED-NAME]');

    // Frames must survive intact - the `patient`-anchored NAME pattern must not
    // shred camelCase/dotted code identifiers into placeholders.
    expect(redacted).toContain('PatientService.findByName');
    expect(redacted).toContain('patientService.ts:142:15');
    expect(redacted).toContain('processPatient');
    expect(redacted).toContain('runGapDetectionForPatient.ts:88:7');
  });

  it('replaces meta nested beyond the depth limit with a placeholder (fail-closed)', () => {
    // Depth 1=a, 2=b, 3=c, 4=d, 5=leaf - leaf sits beyond MAX_REDACTION_DEPTH (4).
    const out = redactLogInfo({
      a: { b: { c: { d: { leaf: 'SSN 123-45-6789' } } } },
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain('123-45-6789');
    expect(json).toContain('[REDACTION-DEPTH-LIMIT]');
  });
});

// --- Test 6 - fail-closed ------------------------------------------------------

describe('Test 6 - redaction-failure fail-closed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('replaces a value with [REDACTION-ERROR] when redaction throws (no raw, no escape)', () => {
    const raw = 'patient John Smith SSN 123-45-6789';
    jest.spyOn(phiRedaction, 'redactPHIFragments').mockImplementation(() => {
      throw new Error('synthetic redaction failure');
    });

    let out: Record<string, unknown> = {};
    expect(() => {
      out = redactLogInfo({ message: raw });
    }).not.toThrow();

    expect(out.message).toBe('[REDACTION-ERROR]');
    expect(JSON.stringify(out)).not.toContain('John Smith');
    expect(JSON.stringify(out)).not.toContain('123-45-6789');
  });

  it('fails closed per-key when a meta getter throws mid-walk (no escape, siblings intact)', () => {
    const evil: Record<string, unknown> = {};
    Object.defineProperty(evil, 'boom', {
      enumerable: true,
      get() {
        throw new Error('getter blew up');
      },
    });

    let out: Record<string, unknown> = {};
    expect(() => {
      out = redactLogInfo({ safe: 'ok', danger: evil });
    }).not.toThrow();

    expect(out.safe).toBe('ok');
    expect(out.danger).toBe('[REDACTION-ERROR]');
  });
});

// --- Wiring - format chain applies redaction end-to-end ------------------------

describe('Wiring - redaction format is in the real logger chain', () => {
  it('emits redacted JSON to the stdout transport when logging an error', async () => {
    const jsonConsole = logger.transports.find(
      (t) => (t as { name?: string }).name === 'console' && t.level === 'warn',
    );
    expect(jsonConsole).toBeDefined();

    const captured: string[] = [];
    const messageSymbol = Symbol.for('message');
    const spy = jest
      .spyOn(jsonConsole as winston.transport, 'log')
      .mockImplementation((info: unknown, next?: () => void) => {
        captured.push((info as Record<symbol, string>)[messageSymbol]);
        if (typeof next === 'function') next();
      });

    logger.error('Global error handler:', {
      stack: 'Error at patient John Smith\n    at handler (/app/x.ts:1:1)',
      note: 'SSN 123-45-6789',
    });

    await new Promise((resolve) => setImmediate(resolve));
    spy.mockRestore();

    const out = captured.join('\n');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('[REDACTED-NAME]');
    expect(out).not.toContain('John Smith');
    expect(out).not.toContain('123-45-6789');
  });
});
