/**
 * 4-APM-01 - tracing.ts unit tests.
 *
 * Coverage:
 *   Group A - isTracingEnabled gate (3 tests)
 *   Group B - sanitizeTraceUrl PHI scrub (8 tests; query strip, id masking,
 *             content-pattern redaction, edge inputs)
 *   Group C - Express middleware factories enabled vs disabled (6 tests)
 *   Group D - scrubSegmentUrl segment URL rewrite (2 tests)
 *   Group E - applyPrismaTracing disabled no-op (2 tests)
 *   Group F - applyPrismaTracing enabled subsegment + PHI safety (5 tests;
 *             model/operation annotation, no-args-leak, error path, close)
 *
 * The aws-xray-sdk-core and aws-xray-sdk-express modules are mocked so tests
 * assert the instrumentation logic without a live X-Ray daemon.
 *
 * Cross-references:
 *   - backend/src/middleware/tracing.ts (system under test)
 *   - docs/audit/PHASE_4_REPORT.md 4-APM-01
 */

jest.mock('aws-xray-sdk-core', () => ({
  getSegment: jest.fn(),
  setContextMissingStrategy: jest.fn(),
  setDaemonAddress: jest.fn(),
}));

jest.mock('aws-xray-sdk-express', () => ({
  openSegment: jest.fn(() => 'XRAY_OPEN_MW'),
  closeSegment: jest.fn(() => 'XRAY_CLOSE_MW'),
}));

import { getSegment } from 'aws-xray-sdk-core';
import {
  isTracingEnabled,
  sanitizeTraceUrl,
  openSegment,
  scrubSegmentUrl,
  closeSegment,
  applyPrismaTracing,
} from '../tracing';

const getSegmentMock = getSegment as jest.Mock;

const ORIGINAL_XRAY_ENABLED = process.env.XRAY_ENABLED;

function enableTracing(): void {
  process.env.XRAY_ENABLED = 'true';
}

function disableTracing(): void {
  delete process.env.XRAY_ENABLED;
}

afterEach(() => {
  if (ORIGINAL_XRAY_ENABLED === undefined) {
    delete process.env.XRAY_ENABLED;
  } else {
    process.env.XRAY_ENABLED = ORIGINAL_XRAY_ENABLED;
  }
  jest.clearAllMocks();
});

// --- Group A - isTracingEnabled gate ----------------------------------------

describe('Group A - isTracingEnabled gate', () => {
  it('A.1: returns true when XRAY_ENABLED is "true"', () => {
    enableTracing();
    expect(isTracingEnabled()).toBe(true);
  });

  it('A.2: returns false when XRAY_ENABLED is unset', () => {
    disableTracing();
    expect(isTracingEnabled()).toBe(false);
  });

  it('A.3: returns false for any non-"true" value', () => {
    process.env.XRAY_ENABLED = '1';
    expect(isTracingEnabled()).toBe(false);
  });
});

// --- Group B - sanitizeTraceUrl PHI scrub -----------------------------------

describe('Group B - sanitizeTraceUrl PHI scrub', () => {
  it('B.1: strips the query string entirely', () => {
    expect(sanitizeTraceUrl('/api/patients?mrn=ABC123456')).toBe('/api/patients');
  });

  it('B.2: masks a UUID path segment to :id', () => {
    expect(
      sanitizeTraceUrl('/api/patients/3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
    ).toBe('/api/patients/:id');
  });

  it('B.3: masks a long numeric path segment to :id', () => {
    expect(sanitizeTraceUrl('/api/patients/123456')).toBe('/api/patients/:id');
  });

  it('B.4: masks an opaque token path segment to :id', () => {
    expect(sanitizeTraceUrl('/api/files/aZ09_-token1234567890')).toBe('/api/files/:id');
  });

  it('B.5: leaves short non-id path segments intact', () => {
    expect(sanitizeTraceUrl('/api/gaps')).toBe('/api/gaps');
  });

  it('B.6: applies content-pattern PHI redaction as defense in depth', () => {
    // SSN-shaped segment is not id-like (it has hyphens) so it survives masking,
    // then redactPHIFragments catches it.
    expect(sanitizeTraceUrl('/lookup/123-45-6789')).toBe('/lookup/[REDACTED-SSN]');
  });

  it('B.7: returns "/" for an empty string', () => {
    expect(sanitizeTraceUrl('')).toBe('/');
  });

  it('B.8: strips query and masks id together', () => {
    expect(
      sanitizeTraceUrl('/api/patients/3f2504e0-4f89-41d3-9a0c-0305e82c3301?include=labs'),
    ).toBe('/api/patients/:id');
  });
});

// --- Group C - Express middleware factories ---------------------------------

describe('Group C - Express middleware factories', () => {
  it('C.1: openSegment returns a pass-through when disabled', () => {
    disableTracing();
    const mw = openSegment();
    expect(typeof mw).toBe('function');
    const next = jest.fn();
    (mw as Function)({}, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('C.2: openSegment delegates to the X-Ray SDK when enabled', () => {
    enableTracing();
    expect(openSegment()).toBe('XRAY_OPEN_MW');
  });

  it('C.3: scrubSegmentUrl returns a pass-through when disabled', () => {
    disableTracing();
    const mw = scrubSegmentUrl();
    const next = jest.fn();
    mw({} as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(getSegmentMock).not.toHaveBeenCalled();
  });

  it('C.4: closeSegment returns an error pass-through when disabled', () => {
    disableTracing();
    const mw = closeSegment();
    const next = jest.fn();
    const err = new Error('boom');
    (mw as Function)(err, {}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('C.5: closeSegment delegates to the X-Ray SDK when enabled', () => {
    enableTracing();
    expect(closeSegment()).toBe('XRAY_CLOSE_MW');
  });

  it('C.6: openSegment pass-through forwards without throwing', () => {
    disableTracing();
    const next = jest.fn();
    expect(() => (openSegment() as Function)({}, {}, next)).not.toThrow();
  });
});

// --- Group D - scrubSegmentUrl segment rewrite ------------------------------

describe('Group D - scrubSegmentUrl segment rewrite', () => {
  it('D.1: rewrites the active segment URL to a PHI-safe form', () => {
    enableTracing();
    const segment: any = {
      http: { request: { url: '/api/patients/123456?mrn=ABC123456' } },
    };
    getSegmentMock.mockReturnValue(segment);
    const next = jest.fn();
    scrubSegmentUrl()({} as any, {} as any, next);
    expect(segment.http.request.url).toBe('/api/patients/:id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('D.2: tolerates a missing segment without throwing', () => {
    enableTracing();
    getSegmentMock.mockReturnValue(undefined);
    const next = jest.fn();
    expect(() => scrubSegmentUrl()({} as any, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// --- Group E - applyPrismaTracing disabled ----------------------------------

describe('Group E - applyPrismaTracing disabled no-op', () => {
  it('E.1: returns the client unchanged when disabled', () => {
    disableTracing();
    const client: any = { $extends: jest.fn() };
    expect(applyPrismaTracing(client)).toBe(client);
  });

  it('E.2: does not call $extends when disabled', () => {
    disableTracing();
    const extend = jest.fn();
    const client: any = { $extends: extend };
    applyPrismaTracing(client);
    expect(extend).not.toHaveBeenCalled();
  });
});

// --- Group F - applyPrismaTracing enabled subsegment + PHI safety ------------

interface CapturedExtension {
  query: {
    $allModels: {
      $allOperations: (params: {
        model: string;
        operation: string;
        args: unknown;
        query: (args: unknown) => Promise<unknown>;
      }) => Promise<unknown>;
    };
  };
}

function captureExtension(): {
  run: CapturedExtension['query']['$allModels']['$allOperations'];
} {
  let captured: CapturedExtension | undefined;
  const client: any = {
    $extends: (config: CapturedExtension) => {
      captured = config;
      return { extended: true };
    },
  };
  applyPrismaTracing(client);
  if (!captured) {
    throw new Error('extension not captured');
  }
  return { run: captured.query.$allModels.$allOperations };
}

describe('Group F - applyPrismaTracing enabled subsegment + PHI safety', () => {
  it('F.1: opens a subsegment named prisma.<model>.<operation>', async () => {
    enableTracing();
    const subsegment: any = {
      namespace: '',
      addAnnotation: jest.fn(),
      addErrorFlag: jest.fn(),
      close: jest.fn(),
    };
    const segment: any = { addNewSubsegment: jest.fn(() => subsegment) };
    getSegmentMock.mockReturnValue(segment);

    const { run } = captureExtension();
    await run({
      model: 'Patient',
      operation: 'findMany',
      args: { where: { id: 'x' } },
      query: async () => 'OK',
    });

    expect(segment.addNewSubsegment).toHaveBeenCalledWith('prisma.Patient.findMany');
  });

  it('F.2: annotates model + operation only', async () => {
    enableTracing();
    const subsegment: any = {
      namespace: '',
      addAnnotation: jest.fn(),
      addErrorFlag: jest.fn(),
      close: jest.fn(),
    };
    getSegmentMock.mockReturnValue({ addNewSubsegment: () => subsegment });

    const { run } = captureExtension();
    await run({
      model: 'Patient',
      operation: 'findUnique',
      args: { where: { id: 'x' } },
      query: async () => 'OK',
    });

    expect(subsegment.addAnnotation).toHaveBeenCalledWith('prisma_model', 'Patient');
    expect(subsegment.addAnnotation).toHaveBeenCalledWith('prisma_operation', 'findUnique');
  });

  it('F.3: never leaks query args into the subsegment (PHI safety)', async () => {
    enableTracing();
    const subsegment: any = {
      namespace: '',
      addAnnotation: jest.fn(),
      addMetadata: jest.fn(),
      addErrorFlag: jest.fn(),
      close: jest.fn(),
    };
    const segment: any = { addNewSubsegment: jest.fn(() => subsegment) };
    getSegmentMock.mockReturnValue(segment);

    const SECRET_MRN = 'MRN-SECRET-9988776655';
    const { run } = captureExtension();
    await run({
      model: 'Patient',
      operation: 'findFirst',
      args: { where: { mrn: SECRET_MRN } },
      query: async () => 'OK',
    });

    const annotationPayload = JSON.stringify(subsegment.addAnnotation.mock.calls);
    const namePayload = JSON.stringify(segment.addNewSubsegment.mock.calls);
    expect(annotationPayload).not.toContain(SECRET_MRN);
    expect(namePayload).not.toContain(SECRET_MRN);
    expect(subsegment.addMetadata).not.toHaveBeenCalled();
  });

  it('F.4: on query error flags the subsegment with error class only, no message', async () => {
    enableTracing();
    const subsegment: any = {
      namespace: '',
      addAnnotation: jest.fn(),
      addErrorFlag: jest.fn(),
      addError: jest.fn(),
      close: jest.fn(),
    };
    getSegmentMock.mockReturnValue({ addNewSubsegment: () => subsegment });

    class PrismaClientKnownRequestError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'PrismaClientKnownRequestError';
      }
    }
    const SECRET_MESSAGE = 'unique constraint failed on mrn ABC123456';
    const err = new PrismaClientKnownRequestError(SECRET_MESSAGE);

    const { run } = captureExtension();
    await expect(
      run({
        model: 'Patient',
        operation: 'create',
        args: {},
        query: async () => {
          throw err;
        },
      }),
    ).rejects.toBe(err);

    expect(subsegment.addErrorFlag).toHaveBeenCalledTimes(1);
    expect(subsegment.addAnnotation).toHaveBeenCalledWith(
      'prisma_error',
      'PrismaClientKnownRequestError',
    );
    expect(subsegment.addError).not.toHaveBeenCalled();
    const annotationPayload = JSON.stringify(subsegment.addAnnotation.mock.calls);
    expect(annotationPayload).not.toContain('ABC123456');
  });

  it('F.5: closes the subsegment on both success and error', async () => {
    enableTracing();
    const subsegment: any = {
      namespace: '',
      addAnnotation: jest.fn(),
      addErrorFlag: jest.fn(),
      close: jest.fn(),
    };
    getSegmentMock.mockReturnValue({ addNewSubsegment: () => subsegment });

    const { run } = captureExtension();
    await run({ model: 'Gap', operation: 'count', args: {}, query: async () => 1 });
    expect(subsegment.close).toHaveBeenCalledTimes(1);

    await expect(
      run({
        model: 'Gap',
        operation: 'count',
        args: {},
        query: async () => {
          throw new Error('db down');
        },
      }),
    ).rejects.toThrow('db down');
    expect(subsegment.close).toHaveBeenCalledTimes(2);
  });
});
