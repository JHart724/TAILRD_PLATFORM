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
      // calls decryptRecord internally. We construct a fake "result" object
      // and a fake params with read action, then run middleware.
      let captured = '';
      const fakeNext = async () => ({ id: 'r', firstName: input });
      // Synchronously evaluate the middleware logic for read-path
      // by importing the real applyPHIEncryption and stubbing prisma.$use.
      // Simpler: directly require the internal helper via runtime patching.
      // Since the module doesn't export decrypt, we test via a derived path:
      // round-trip via encryptLocal + applyPHIEncryption read.
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
      // Invoke read with our crafted ciphertext as firstName
      let result: any = null;
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
    await expect((decryptModule() as any)('enc:onlyOnePart')).rejects.toThrow(/malformed ciphertext/);
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
});
