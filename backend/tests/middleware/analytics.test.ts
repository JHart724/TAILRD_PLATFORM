/**
 * Unit tests for AnalyticsTracker performance request log flushing.
 *
 * Covers tech debt #28 fix:
 *   - flush calls prisma.performanceRequestLog.createMany (not the old
 *     performanceMetric model)
 *   - buffer is reset on success
 *   - buffer is ALSO reset on failure (memory-leak fix — try/finally)
 *   - buffer entries carry the field shape that matches the new schema
 *
 * Mock pattern note (test fixture wiring, not production code):
 *   beforeEach uses mockResolvedValue (persistent default) + mockClear
 *   (reset history without consuming the default) so test setups never
 *   accidentally queue an unused mockResolvedValueOnce that gets consumed
 *   by the next call. Tests verify "buffer is empty after flush" by side
 *   effect — push a distinct second entry, flush, assert only THAT entry
 *   in the second createMany call. (Calling flushAll a second time on an
 *   empty buffer short-circuits without invoking createMany, so a second
 *   call-count assertion would be wrong.)
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

  beforeEach(async () => {
    // Persistent default: any unmatched createMany call resolves with count: 0.
    // mockResolvedValue (NOT mockResolvedValueOnce) means the mock is reusable
    // and can never end up as an "orphan" in the queue.
    createManyMock.mockReset();
    createManyMock.mockResolvedValue({ count: 0 });

    tracker = AnalyticsTracker.getInstance();

    // Drain any state from prior tests so this test starts with a clean buffer.
    await tracker.flushAll();

    // Reset call history (mockClear keeps the mockResolvedValue default).
    createManyMock.mockClear();
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
    const firstCall = createManyMock.mock.calls[0][0];
    expect(firstCall.data).toHaveLength(1);
    expect(firstCall.data[0]).toMatchObject({
      hospitalId: 'hosp-1',
      userId: 'user-1',
      endpoint: '/api/admin/dashboard',
      method: 'GET',
      responseTime: 42,
      statusCode: 200,
      memoryUsage: 1024,
    });

    // Buffer-clear verification: push a NEW distinct entry, flush again.
    // If the buffer had retained the first entry, the second call's data
    // would have length 2. We assert it has length 1 with only the new entry.
    createManyMock.mockResolvedValueOnce({ count: 1 });
    await tracker.trackPerformance({
      hospitalId: 'hosp-2',
      userId: 'user-2',
      endpoint: '/api/admin/users',
      method: 'POST',
      responseTime: 12,
      statusCode: 201,
    });
    await tracker.flushAll();

    expect(createManyMock).toHaveBeenCalledTimes(2);
    const secondCall = createManyMock.mock.calls[1][0];
    expect(secondCall.data).toHaveLength(1);
    expect(secondCall.data[0]).toMatchObject({
      endpoint: '/api/admin/users',
      method: 'POST',
    });
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

    // Critical: buffer must be empty even after the failure. Push a NEW entry,
    // flush, and assert the second call's data has length 1 with only that
    // new entry. If the buffer had retained the failed entry, the second
    // call would have length 2.
    await tracker.trackPerformance({
      endpoint: '/api/different',
      method: 'GET',
      responseTime: 20,
      statusCode: 200,
    });
    await tracker.flushAll();

    expect(createManyMock).toHaveBeenCalledTimes(2);
    const secondCall = createManyMock.mock.calls[1][0];
    expect(secondCall.data).toHaveLength(1);
    expect(secondCall.data[0]).toMatchObject({
      endpoint: '/api/different',
      method: 'GET',
    });

    consoleSpy.mockRestore();
  });

  it('does not call createMany when the buffer is empty', async () => {
    await tracker.flushAll();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it('omits userId/hospitalId when caller does not provide them (anonymous request paths)', async () => {
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
