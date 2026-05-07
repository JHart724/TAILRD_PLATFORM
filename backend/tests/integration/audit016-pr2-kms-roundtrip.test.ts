/**
 * AUDIT-016 PR 2 — V2 envelope KMS round-trip integration test
 * ============================================================
 *
 * Gated. Hits real AWS KMS via the configured `AWS_KMS_PHI_KEY_ALIAS`.
 * Run only against a sandbox KMS key + sandbox AWS credentials.
 *
 * Activation contract:
 *   RUN_INTEGRATION_TESTS=1 AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-sandbox-phi \
 *   AWS_REGION=us-east-1 NODE_ENV=test \
 *   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
 *   PHI_ENCRYPTION_KEY=<64 hex chars> \
 *   PHI_ENVELOPE_VERSION=v2 \
 *   npx jest backend/tests/integration/audit016-pr2-kms-roundtrip.test.ts
 *
 * Without RUN_INTEGRATION_TESTS=1 the suite skips entirely; CI default is OFF.
 *
 * Coverage (per AUDIT_016_KEY_ROTATION_DESIGN.md §6 + AUDIT_016_PR_2_V2_KMS_WIRING_NOTES.md):
 *   1. V2 round-trip via real KMS (encrypt → decrypt; CloudTrail event recorded)
 *   2. EncryptionContext mismatch fails decrypt (KMS rejects on context drift)
 *   3. Decrypt-is-not-gated rollback property — decrypt works after flag flip to v1
 *   4. Strict fail-loud on bogus key alias (no V1 fallback in production-mode)
 *
 * NOT in scope (deferred to operator-side smoke):
 *   - KMS API cost calibration (volume × envelope size)
 *   - CloudTrail event verification end-to-end
 *   - Multi-region failover behavior
 */

const RUN = process.env.RUN_INTEGRATION_TESTS === '1';
const HAS_KMS_ALIAS = !!process.env.AWS_KMS_PHI_KEY_ALIAS;
const ENABLE = RUN && HAS_KMS_ALIAS;

const describeOrSkip = ENABLE ? describe : describe.skip;

describeOrSkip('AUDIT-016 PR 2 — V2 envelope KMS round-trip (integration; gated)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    delete process.env.DEMO_MODE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('V2 round-trip via real KMS (encrypt → decrypt; CloudTrail-anchored)', async () => {
    const { encryptWithCurrent, decryptAny } = require('../../src/services/keyRotation');

    const ctx = {
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    };

    const plaintext = 'Integration-Alice';
    const v2 = await encryptWithCurrent(plaintext, ctx);
    expect(typeof v2).toBe('string');
    expect(v2.startsWith('enc:v2:')).toBe(true);

    const decrypted = await decryptAny(v2, ctx);
    expect(decrypted).toBe(plaintext);
  }, 30_000);

  it('EncryptionContext mismatch fails decrypt (KMS AccessDenied on context drift)', async () => {
    const { encryptWithCurrent, decryptAny } = require('../../src/services/keyRotation');

    const ctxEncrypt = {
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    };
    const ctxDecryptDrift = { ...ctxEncrypt, field: 'lastName' };

    const v2 = await encryptWithCurrent('Integration-Bob', ctxEncrypt);
    expect(v2.startsWith('enc:v2:')).toBe(true);

    await expect(decryptAny(v2, ctxDecryptDrift)).rejects.toThrow();
  }, 30_000);

  it('Decrypt-is-not-gated: V2 ciphertext still decrypts after PHI_ENVELOPE_VERSION=v1 flip', async () => {
    const { encryptWithCurrent } = require('../../src/services/keyRotation');
    const ctx = {
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    };
    const v2 = await encryptWithCurrent('Integration-Carol', ctx);
    expect(v2.startsWith('enc:v2:')).toBe(true);

    // Flip emission gate — but decrypt MUST still succeed (rollback safety).
    jest.resetModules();
    process.env.PHI_ENVELOPE_VERSION = 'v1';
    const { decryptAny } = require('../../src/services/keyRotation');
    const decrypted = await decryptAny(v2, ctx);
    expect(decrypted).toBe('Integration-Carol');
  }, 30_000);

  it('Strict fail-loud: bogus AWS_KMS_PHI_KEY_ALIAS surfaces KMS error (no V1 fallback)', async () => {
    jest.resetModules();
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/does-not-exist-tailrd-integration-bogus';
    const { encryptWithCurrent } = require('../../src/services/keyRotation');
    const ctx = {
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    };
    await expect(encryptWithCurrent('Integration-Dave', ctx)).rejects.toThrow();
  }, 30_000);
});

if (!ENABLE) {
  // Surface skip reason so operators do not silently miss-run integration coverage.
  // Jest sees this as a no-op when describeOrSkip routes to describe.skip.
  describe('AUDIT-016 PR 2 KMS integration (skipped — set RUN_INTEGRATION_TESTS=1 + AWS_KMS_PHI_KEY_ALIAS to enable)', () => {
    it.skip('integration suite gated', () => {});
  });
}
