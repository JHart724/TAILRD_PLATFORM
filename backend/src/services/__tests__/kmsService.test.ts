/**
 * AUDIT-016 PR 2 — kmsService unit tests.
 *
 * Closes the pre-existing test gap on kmsService.ts (~305 LOC, no prior tests).
 * Mock-based unit tests with `@aws-sdk/client-kms` mocked. Covers:
 *   - envelopeEncrypt/Decrypt happy path with per-record EncryptionContext
 *   - Local-fallback path (NODE_ENV !== 'production')
 *   - KMS error handling (network / KeyNotFound / AccessDenied / InvalidCiphertext)
 *   - getKeyInfo
 *   - ARN vs alias detection (AWS SDK accepts both natively; verify pass-through)
 *
 * Note: kmsService gates real-KMS calls on `NODE_ENV === 'production'`.
 * Tests that exercise KMS-rejection paths set NODE_ENV='production' + mock
 * KMSClient.send to throw the desired error class.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-kms', () => {
  const actual = jest.requireActual('@aws-sdk/client-kms');
  return {
    ...actual,
    KMSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

const ORIG_NODE_ENV = process.env.NODE_ENV;
const ORIG_DEMO_MODE = process.env.DEMO_MODE;
const ORIG_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS;
const ORIG_LOCAL_KEY = process.env.PHI_ENCRYPTION_KEY;

function resetEnv(): void {
  if (ORIG_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIG_NODE_ENV;
  if (ORIG_DEMO_MODE === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = ORIG_DEMO_MODE;
  if (ORIG_ALIAS === undefined) delete process.env.AWS_KMS_PHI_KEY_ALIAS;
  else process.env.AWS_KMS_PHI_KEY_ALIAS = ORIG_ALIAS;
  if (ORIG_LOCAL_KEY === undefined) delete process.env.PHI_ENCRYPTION_KEY;
  else process.env.PHI_ENCRYPTION_KEY = ORIG_LOCAL_KEY;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

afterEach(() => {
  resetEnv();
});

afterAll(() => {
  resetEnv();
});

// ── Local-fallback (dev/test mode) ─────────────────────────────────────────

describe('kmsService — local fallback (NODE_ENV !== production)', () => {
  it('envelopeEncrypt + envelopeDecrypt round-trip in test mode (no KMS API calls)', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEMO_MODE;
    process.env.PHI_ENCRYPTION_KEY = 'a'.repeat(64);

    const { envelopeEncrypt, envelopeDecrypt } = await import('../kmsService');
    const result = await envelopeEncrypt('Patient MRN-12345');
    expect(result).toHaveProperty('ciphertext');
    expect(result).toHaveProperty('encryptedDataKey');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('authTag');

    const decrypted = await envelopeDecrypt(result);
    expect(decrypted).toBe('Patient MRN-12345');

    // No real KMS calls
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('envelopeEncrypt accepts per-record EncryptionContext (D6 parameterization)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PHI_ENCRYPTION_KEY = 'a'.repeat(64);

    const { envelopeEncrypt, envelopeDecrypt } = await import('../kmsService');
    const ctx = { service: 'tailrd-backend', purpose: 'phi-encryption', model: 'Patient', field: 'mrn' };
    const result = await envelopeEncrypt('test-data', ctx);
    const decrypted = await envelopeDecrypt(result, ctx);
    expect(decrypted).toBe('test-data');
  });

  it('envelopeEncrypt with default context (backwards-compat) works', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PHI_ENCRYPTION_KEY = 'a'.repeat(64);

    const { envelopeEncrypt, envelopeDecrypt } = await import('../kmsService');
    const result = await envelopeEncrypt('test-data');
    const decrypted = await envelopeDecrypt(result);
    expect(decrypted).toBe('test-data');
  });

  it('localEncrypt with no PHI_ENCRYPTION_KEY uses random ephemeral key (not portable)', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.PHI_ENCRYPTION_KEY;

    const { envelopeEncrypt, envelopeDecrypt } = await import('../kmsService');
    const result = await envelopeEncrypt('plaintext');
    // The "encrypted" data key in local mode IS the ephemeral key itself
    // (base64-encoded). Decrypt round-trip succeeds.
    const decrypted = await envelopeDecrypt(result);
    expect(decrypted).toBe('plaintext');
  });
});

// ── Production mode: KMS API calls ─────────────────────────────────────────

describe('kmsService — production mode KMS API calls', () => {
  it('envelopeEncrypt sends GenerateDataKey with EncryptionContext', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/tailrd-test-phi';

    // Mock GenerateDataKey response
    mockSend.mockResolvedValueOnce({
      Plaintext: new Uint8Array(32).fill(7), // 256-bit "DEK"
      CiphertextBlob: new Uint8Array(64).fill(8), // wrapped-DEK
    });

    const { envelopeEncrypt } = await import('../kmsService');
    const result = await envelopeEncrypt('plaintext', {
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.KeyId).toBe('alias/tailrd-test-phi');
    expect(command.input.KeySpec).toBe('AES_256');
    expect(command.input.EncryptionContext).toEqual({
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    });

    expect(result).toHaveProperty('ciphertext');
    expect(result).toHaveProperty('encryptedDataKey');
  });

  // T2: per-record EncryptionContext round-trip preservation
  it('T2: encrypt context model=Patient,field=firstName ↔ decrypt with same context succeeds via KMS', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    const dek = new Uint8Array(32).fill(7);
    const wrappedDek = new Uint8Array(64).fill(8);

    mockSend
      .mockResolvedValueOnce({ Plaintext: dek, CiphertextBlob: wrappedDek })   // GenerateDataKey
      .mockResolvedValueOnce({ Plaintext: dek });                              // Decrypt

    const { envelopeEncrypt, envelopeDecrypt } = await import('../kmsService');
    const ctx = { service: 'tailrd-backend', purpose: 'phi-encryption', model: 'Patient', field: 'firstName' };

    const result = await envelopeEncrypt('Alice', ctx);
    const decrypted = await envelopeDecrypt(result, ctx);
    expect(decrypted).toBe('Alice');

    // Verify both KMS calls received the same EncryptionContext
    expect(mockSend.mock.calls[0][0].input.EncryptionContext).toEqual({
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    });
    expect(mockSend.mock.calls[1][0].input.EncryptionContext).toEqual({
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    });
  });

  // T3: strict fail-loud per error type
  it('T3a: envelopeEncrypt → NetworkError → throw (no V1 fallback)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    mockSend.mockRejectedValueOnce(Object.assign(new Error('socket hang up'), { name: 'NetworkError' }));

    const { envelopeEncrypt } = await import('../kmsService');
    await expect(envelopeEncrypt('payload')).rejects.toThrow(/socket hang up/);
  });

  it('T3b: envelopeEncrypt → KeyNotFoundException → throw', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/missing-key';

    mockSend.mockRejectedValueOnce(Object.assign(new Error('Key does not exist'), { name: 'NotFoundException' }));

    const { envelopeEncrypt } = await import('../kmsService');
    await expect(envelopeEncrypt('payload')).rejects.toThrow(/Key does not exist/);
  });

  it('T3c: envelopeDecrypt → AccessDeniedException → throw', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    mockSend.mockRejectedValueOnce(Object.assign(new Error('User is not authorized'), { name: 'AccessDeniedException' }));

    const { envelopeDecrypt } = await import('../kmsService');
    await expect(
      envelopeDecrypt({ ciphertext: 'a', encryptedDataKey: 'b', iv: 'c', authTag: 'd' }),
    ).rejects.toThrow(/not authorized/);
  });

  it('T3d: envelopeDecrypt → InvalidCiphertextException (context mismatch) → throw', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    mockSend.mockRejectedValueOnce(
      Object.assign(new Error('InvalidCiphertextException'), { name: 'InvalidCiphertextException' }),
    );

    const { envelopeDecrypt } = await import('../kmsService');
    await expect(
      envelopeDecrypt(
        { ciphertext: 'a', encryptedDataKey: 'b', iv: 'c', authTag: 'd' },
        { service: 'tailrd-backend', purpose: 'phi-encryption', model: 'Order', field: 'fhirOrderId' }, // mismatched ctx
      ),
    ).rejects.toThrow(/InvalidCiphertext/);
  });

  it('envelopeEncrypt throws when GenerateDataKey returns no Plaintext', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    mockSend.mockResolvedValueOnce({ Plaintext: undefined, CiphertextBlob: new Uint8Array(64) });

    const { envelopeEncrypt } = await import('../kmsService');
    await expect(envelopeEncrypt('payload')).rejects.toThrow(/no key material/);
  });

  it('envelopeDecrypt throws when KMS Decrypt returns no Plaintext', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    mockSend.mockResolvedValueOnce({ Plaintext: undefined });

    const { envelopeDecrypt } = await import('../kmsService');
    await expect(
      envelopeDecrypt({ ciphertext: 'a', encryptedDataKey: 'b', iv: 'c', authTag: 'd' }),
    ).rejects.toThrow(/no plaintext key/);
  });
});

// ── ARN vs alias detection (D1) ────────────────────────────────────────────

describe('kmsService — ARN vs alias resolution (D1)', () => {
  // T8: ARN vs alias resolution
  it('T8a: AWS_KMS_PHI_KEY_ALIAS=alias/foo → KMSClient receives KeyId="alias/foo"', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/foo';

    mockSend.mockResolvedValueOnce({
      Plaintext: new Uint8Array(32),
      CiphertextBlob: new Uint8Array(64),
    });

    const { envelopeEncrypt } = await import('../kmsService');
    await envelopeEncrypt('payload');

    expect(mockSend.mock.calls[0][0].input.KeyId).toBe('alias/foo');
  });

  it('T8b: AWS_KMS_PHI_KEY_ALIAS=arn:aws:kms:... → KMSClient receives full ARN (no alias/ prepend)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'arn:aws:kms:us-east-1:123456789012:key/abcd-efgh';

    mockSend.mockResolvedValueOnce({
      Plaintext: new Uint8Array(32),
      CiphertextBlob: new Uint8Array(64),
    });

    const { envelopeEncrypt } = await import('../kmsService');
    await envelopeEncrypt('payload');

    expect(mockSend.mock.calls[0][0].input.KeyId).toBe(
      'arn:aws:kms:us-east-1:123456789012:key/abcd-efgh',
    );
    // No alias/ prefix prepended; ARN passed through untouched
    expect(mockSend.mock.calls[0][0].input.KeyId).not.toMatch(/^alias\//);
  });
});

// ── getKeyInfo ─────────────────────────────────────────────────────────────

describe('kmsService — getKeyInfo', () => {
  it('demo mode → returns synthetic demo key info', async () => {
    process.env.DEMO_MODE = 'true';
    const { getKeyInfo } = await import('../kmsService');
    const info = await getKeyInfo();
    expect(info.keyId).toBe('demo-key');
    expect(info.enabled).toBe(true);
  });

  it('production mode → calls DescribeKey and returns metadata', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;

    mockSend.mockResolvedValueOnce({
      KeyMetadata: {
        KeyId: 'abc-123',
        Arn: 'arn:aws:kms:us-east-1:000:key/abc-123',
        CreationDate: new Date('2026-01-01'),
        Enabled: true,
        KeyManager: 'CUSTOMER',
        Description: 'Test key',
      },
    });

    const { getKeyInfo } = await import('../kmsService');
    const info = await getKeyInfo();
    expect(info.keyId).toBe('abc-123');
    expect(info.keyRotationEnabled).toBe(true);
  });
});
