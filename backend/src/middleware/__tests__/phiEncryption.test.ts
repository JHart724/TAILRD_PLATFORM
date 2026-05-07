/**
 * Unit tests for AUDIT-015 remediation in backend/src/middleware/phiEncryption.ts
 *
 * AUDIT-015: decrypt() previously returned ciphertext as-is on integrity
 * failure. Remediation: throw on tampering, malformed format, and
 * (production) on legacy plaintext. PHI_LEGACY_PLAINTEXT_OK env enables
 * legacy passthrough for migration windows.
 *
 * The applyPHIEncryption() function uses Prisma middleware which is hard
 * to unit-test in isolation. These tests target the encrypt/decrypt
 * round-trip behavior by exercising the module with controlled env state.
 */
import crypto from 'crypto';

// Build a 32-byte (256-bit) hex key for AES-256-GCM
const TEST_KEY = crypto.randomBytes(32).toString('hex');

describe('phiEncryption decrypt() — AUDIT-015 fail-loud behavior', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
    process.env.NODE_ENV = 'test';
    delete process.env.DEMO_MODE;
    delete process.env.PHI_LEGACY_PLAINTEXT_OK;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // The decrypt function isn't directly exported; we exercise it via the
  // Prisma middleware which uses both encrypt/decrypt internally. Tests
  // verify the encrypted format, integrity guarantees, and error behavior
  // by re-implementing the encrypt path locally and asserting on the
  // public surface.

  function encryptLocal(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const keyBuf = Buffer.from(key, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${enc}`;
  }

  function decryptModule(): (s: string) => string {
    // Re-import so module-level const ENCRYPTION_KEY picks up new env
    jest.resetModules();
    const mod = require('../phiEncryption');
    // decrypt is internal; we export-test via applyPHIEncryption Prisma
    // middleware behavior. Here we use a smaller test surface by reaching
    // into the module's compiled internals via require cache.
    // Strategy: build a minimal Prisma-like next() to flow data through.
    return (input: string) => {
      // Test surface workaround: emulate the middleware's read path which
      // calls decryptRecord internally. We synchronously evaluate the
      // middleware logic for read-path by importing the real
      // applyPHIEncryption and stubbing prisma.$use. Since the module
      // doesn't export decrypt, we test via a derived path: round-trip
      // via encryptLocal + applyPHIEncryption read.
      const fakeClient: any = {
        $use: (fn: any) => {
          (fakeClient as any)._fn = fn;
        },
      };
      mod.applyPHIEncryption(fakeClient);
      const params = {
        model: 'Patient',
        action: 'findUnique',
        args: {},
      };
      // Patient model has firstName in PHI_FIELD_MAP, so read-path should decrypt it
      const promise = (fakeClient as any)._fn(params, async () => ({ firstName: input }));
      // The middleware is async; convert to sync for test by returning the promise
      return promise.then((r: any) => r.firstName).catch((err: Error) => {
        throw err;
      }) as any;
    };
  }

  it('valid ciphertext decrypts correctly (round-trip)', async () => {
    const ct = encryptLocal('Alice', TEST_KEY);
    const dec = await (decryptModule() as any)(ct);
    expect(dec).toBe('Alice');
  });

  it('tampered ciphertext (auth tag) throws integrity error', async () => {
    const ct = encryptLocal('Bob', TEST_KEY);
    const parts = ct.split(':');
    // Flip a hex char in the auth tag
    const tagBuf = Buffer.from(parts[2], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${tagBuf.toString('hex')}:${parts[3]}`;
    await expect((decryptModule() as any)(tampered)).rejects.toThrow(/integrity check failed/);
  });

  it('malformed format throws', async () => {
    // AUDIT-016 PR 1: error message text shifted to envelopeFormat parseEnvelope.
    // Behavior preserved — malformed input still throws (AUDIT-015 invariant).
    // New wording identifies version + segment count for operator triage.
    await expect((decryptModule() as any)('enc:onlyOnePart')).rejects.toThrow(/envelope parse failed/);
  });

  it('plaintext (no enc: prefix) throws when PHI_LEGACY_PLAINTEXT_OK=false', async () => {
    process.env.PHI_LEGACY_PLAINTEXT_OK = 'false';
    await expect((decryptModule() as any)('plain text not encrypted')).rejects.toThrow(/unencrypted value/);
  });

  it('plaintext passes through when PHI_LEGACY_PLAINTEXT_OK=true', async () => {
    process.env.PHI_LEGACY_PLAINTEXT_OK = 'true';
    const result = await (decryptModule() as any)('plain text not encrypted');
    expect(result).toBe('plain text not encrypted');
  });

  it('plaintext passes through in DEMO_MODE', async () => {
    process.env.DEMO_MODE = 'true';
    const result = await (decryptModule() as any)('plain text not encrypted');
    expect(result).toBe('plain text not encrypted');
  });

  // ── AUDIT-016 PR 1: V1 envelope round-trip + AUDIT-015 invariants on V1 ──

  it('AUDIT-016 PR 1: middleware write path emits V1 envelope (enc:v1: prefix)', async () => {
    // Exercise write path by capturing the encrypted output of a create action.
    jest.resetModules();
    const mod = require('../phiEncryption');
    const fakeClient: any = { $use: (fn: any) => { fakeClient._fn = fn; } };
    mod.applyPHIEncryption(fakeClient);

    const writeData: any = { firstName: 'Charlie' };
    const params = {
      model: 'Patient',
      action: 'create',
      args: { data: writeData },
    };
    await fakeClient._fn(params, async () => ({ id: 'r' }));
    expect(typeof writeData.firstName).toBe('string');
    expect(writeData.firstName.startsWith('enc:v1:')).toBe(true);
    expect(writeData.firstName.split(':').length).toBe(5);
  });

  it('AUDIT-016 PR 1: V1 round-trip via middleware (write → encrypted; read decrypts)', async () => {
    jest.resetModules();
    const mod = require('../phiEncryption');
    const fakeClient: any = { $use: (fn: any) => { fakeClient._fn = fn; } };
    mod.applyPHIEncryption(fakeClient);

    // Write — capture encrypted ciphertext from middleware.
    const writeData: any = { firstName: 'Diana' };
    await fakeClient._fn(
      { model: 'Patient', action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );
    const v1Envelope = writeData.firstName;
    expect(v1Envelope.startsWith('enc:v1:')).toBe(true);

    // Read — feed V1 envelope back through middleware, expect plaintext out.
    const readResult = await fakeClient._fn(
      { model: 'Patient', action: 'findUnique', args: {} },
      async () => ({ firstName: v1Envelope }),
    );
    expect(readResult.firstName).toBe('Diana');
  });

  it('AUDIT-016 PR 1: V1 auth-tag tampering throws integrity error', async () => {
    // Build a valid V1 ciphertext via middleware write path, tamper the tag,
    // then assert read path throws.
    jest.resetModules();
    const mod = require('../phiEncryption');
    const fakeClient: any = { $use: (fn: any) => { fakeClient._fn = fn; } };
    mod.applyPHIEncryption(fakeClient);

    const writeData: any = { firstName: 'Eve' };
    await fakeClient._fn(
      { model: 'Patient', action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );
    const v1 = writeData.firstName;
    const parts = v1.split(':');
    const tagBuf = Buffer.from(parts[3], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tagBuf.toString('hex')}:${parts[4]}`;

    await expect(
      fakeClient._fn(
        { model: 'Patient', action: 'findUnique', args: {} },
        async () => ({ firstName: tampered }),
      ),
    ).rejects.toThrow(/integrity check failed/);
  });
});
