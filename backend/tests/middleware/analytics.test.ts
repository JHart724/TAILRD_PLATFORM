/**
 * Unit tests for AnalyticsTracker performance request log flushing.
 *
 * Covers tech debt #28 fix:
 *   - flush calls prisma.performanceRequestLog.createMany (not the old
 *     performanceMetric model)
 *   - buffer is reset on success
 *   - buffer is ALSO reset on failure (memory-leak fix — try/finally)
 *   - buffer entries carry the field shape that matches the new schema
 */

// Mock the prisma client BEFORE importing the module under test so the
// AnalyticsTracker singleton picks up the mock during construction.
const createManyMock = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    performanceRequestLog: {
      createMany: (...args: unknown[]) => createManyMock(...args),
    },
    // Other models accessed by AnalyticsTracker — stubs only
    userActivity: { createMany: jest.fn() },
    featureUsage: { upsert: jest.fn() },
    errorLog: { create: jest.fn() },
    reportGeneration: { create: jest.fn() },
  },
}));

import AnalyticsTracker from '../../src/middleware/analytics';

describe('AnalyticsTracker — performance request log flushing', () => {
  let tracker: AnalyticsTracker;

  beforeEach(() => {
    createManyMock.mockReset();
    tracker = AnalyticsTracker.getInstance();
    // Singleton: reset internal buffer between tests via flushAll on a clean
    // mock (any pending entries get drained into the mock and discarded).
    createManyMock.mockResolvedValueOnce({ count: 0 });
    return tracker.flushAll();
  });

  it('writes buffered entries to performanceRequestLog and resets the buffer on success', async () => {
    createManyMock.mockResolvedValueOnce({ count: 1 });

    await tracker.trackPerformance({
      hospitalId: 'hosp-1',
      userId: 'user-1',
      endpoint: '/api/admin/dashboard',
      method: 'GET',
      responseTime: 42,
      statusCode: 200,
      memoryUsage: 1024,
    });

    await tracker.flushAll();

    expect(createManyMock).toHaveBeenCalledTimes(1);
    const call = createManyMock.mock.calls[0][0];
    expect(call).toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          hospitalId: 'hosp-1',
          userId: 'user-1',
          endpoint: '/api/admin/dashboard',
          method: 'GET',
          responseTime: 42,
          statusCode: 200,
          memoryUsage: 1024,
        }),
      ]),
    });

    // Buffer must be empty after a successful flush
    createManyMock.mockResolvedValueOnce({ count: 0 });
    await tracker.flushAll();
    expect(createManyMock).toHaveBeenCalledTimes(2);
    expect(createManyMock.mock.calls[1][0].data).toHaveLength(0);
  });

  it('resets the buffer even when createMany throws (memory-leak regression)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    createManyMock.mockRejectedValueOnce(new Error('boom'));

    await tracker.trackPerformance({
      hospitalId: 'hosp-1',
      userId: 'user-1',
      endpoint: '/api/test',
      method: 'POST',
      responseTime: 10,
      statusCode: 500,
    });

    await tracker.flushAll();

    expect(createManyMock).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();

    // Critical: buffer must be empty. Run another flush against an empty
    // mock; if the buffer had retained the failed entry, it would call
    // createMany a second time with the same payload.
    createManyMock.mockResolvedValueOnce({ count: 0 });
    await tracker.flushAll();
    expect(createManyMock).toHaveBeenCalledTimes(2);
    expect(createManyMock.mock.calls[1][0].data).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('does not call createMany when the buffer is empty', async () => {
    await tracker.flushAll();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it('omits userId/hospitalId when caller does not provide them (anonymous request paths)', async () => {
    createManyMock.mockResolvedValueOnce({ count: 1 });

    await tracker.trackPerformance({
      endpoint: '/health',
      method: 'GET',
      responseTime: 5,
      statusCode: 200,
    });

    await tracker.flushAll();

    expect(createManyMock).toHaveBeenCalledTimes(1);
    const entry = createManyMock.mock.calls[0][0].data[0];
    expect(entry.endpoint).toBe('/health');
    expect(entry.method).toBe('GET');
    expect(entry.statusCode).toBe(200);
    expect(entry.hospitalId).toBeUndefined();
    expect(entry.userId).toBeUndefined();
  });
});
