/**
 * AUDIT-075 Group K — sanitize-at-write callsite integration tests.
 *
 * Step 5 ships TWO test layers (per work-block authorization spec):
 *   - Groups H/I/J (in `backend/src/middleware/__tests__/phiEncryption.test.ts`)
 *     cover middleware-scope encrypt/decrypt round-trip semantics.
 *   - Group K (this file) covers write-path integration: verifies that
 *     sanitize-at-write redaction is actually applied at the prisma call
 *     boundary. Without this layer, Step 4 callsite edits could silently
 *     regress (e.g., `redactPHIFragments` call removed in a future PR) and
 *     middleware-scope tests would still pass because they test pre-redacted
 *     inputs.
 *
 * Pattern:
 *   `jest.doMock('../../lib/prisma')` swaps the singleton with a fake whose
 *   `webhookEvent.update` / `auditLog.create` are `jest.fn()` spies. Pass
 *   PHI-bearing input through the function under test; assert the spy
 *   received the redacted form (NOT the original PHI).
 *
 * Cross-references:
 *   - `backend/src/services/webhookPipeline.ts` markFailed (lines ~136, ~154)
 *   - `backend/src/middleware/auditLogger.ts` writeAuditLog wrapper (line ~175)
 *   - `backend/src/utils/phiRedaction.ts` (CONSERVATIVE pattern set)
 */

describe('AUDIT-075 Group K — sanitize-at-write callsite integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWebhookUpdate: jest.Mock<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWebhookFindUnique: jest.Mock<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAuditLogCreate: jest.Mock<any, any>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    delete process.env.DEMO_MODE;

    mockWebhookUpdate = jest.fn(async () => ({ id: 'fake' }));
    mockWebhookFindUnique = jest.fn(async () => ({ retryCount: 0 }));
    mockAuditLogCreate = jest.fn(async () => ({ id: 'fake' }));

    jest.doMock('../../lib/prisma', () => ({
      __esModule: true,
      default: {
        webhookEvent: {
          update: mockWebhookUpdate,
          findUnique: mockWebhookFindUnique,
        },
        auditLog: {
          create: mockAuditLogCreate,
        },
      },
    }));
  });

  afterEach(() => {
    jest.dontMock('../../lib/prisma');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('K.1: webhookPipeline.markFailed sanitizes PHI in error.message before prisma.webhookEvent.update', async () => {
    // findUnique returns retryCount: 0 → +1 = 1 ≤ MAX_RETRIES(5) → retry path
    // (NOT dead-letter); exercises `redactPHIFragments(error.message)` direct
    // redaction at webhookPipeline.ts L154.
    const { markFailed } = require('../webhookPipeline');

    const phiBearingError = new Error('Processing failed for SSN: 123-45-6789');
    await markFailed('fake-event-id', phiBearingError);

    expect(mockWebhookUpdate).toHaveBeenCalled();
    const callArgs = mockWebhookUpdate.mock.calls[0][0];
    expect(callArgs.data.errorMessage).toBe('Processing failed for SSN: [REDACTED-SSN]');
    expect(callArgs.data.errorMessage).not.toContain('123-45-6789');
    // Status assertion confirms retry path (NOT dead-letter)
    expect(callArgs.data.status).toBe('RETRYING');
  });

  it('K.2: writeAuditLog wrapper sanitizes PHI in description before prisma.auditLog.create', async () => {
    const { writeAuditLog } = require('../../middleware/auditLogger');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeReq: any = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      user: { userId: 'u1', email: 'admin@example.com', role: 'ADMIN', hospitalId: 'h1' },
    };

    await writeAuditLog(
      fakeReq,
      'TEST_ACTION',
      'TestResource',
      'r1',
      'Contact: patient@email.com phone 555-123-4567',
    );

    expect(mockAuditLogCreate).toHaveBeenCalled();
    const callArgs = mockAuditLogCreate.mock.calls[0][0];
    expect(callArgs.data.description).toBe('Contact: [REDACTED-EMAIL] phone [REDACTED-PHONE]');
    expect(callArgs.data.description).not.toContain('patient@email.com');
    expect(callArgs.data.description).not.toContain('555-123-4567');
  });
});
