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

  // ── $extends-aware fake-client helpers ────────────────────────────────
  // 2026-05-07 phiEncryption migrated $use → $extends per AUDIT-011 Phase
  // b/c §8. Fake clients capture the registered wrapper from
  // `$extends({ query: { $allModels: { $allOperations: ... } } })` and
  // expose it via `_fn`. Test bodies retain the (params, next) calling
  // convention via the `invokeMiddleware` adapter — minimal body changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeFakeExtendsClient(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeClient: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fakeClient.$extends = (ext: any) => {
      fakeClient._fn = ext.query.$allModels.$allOperations;
      return fakeClient; // chainable; mirrors real Prisma extends-return
    };
    return fakeClient;
  }
  // Adapter — preserves the (params, next) calling convention used by
  // existing tests. Maps OLD `$use` shape → NEW `$extends` shape:
  //   params.action → operation, params.args → args, next → query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function invokeMiddleware(fakeClient: any, params: any, next: any): Promise<any> {
    return fakeClient._fn({
      args: params.args,
      model: params.model,
      operation: params.action,
      query: next,
    });
  }

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
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);
      const params = {
        model: 'Patient',
        action: 'findUnique',
        args: {},
      };
      // Patient model has firstName in PHI_FIELD_MAP, so read-path should decrypt it
      const promise = invokeMiddleware(fakeClient, params, async () => ({ firstName: input }));
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
    const fakeClient = makeFakeExtendsClient();
    mod.applyPHIEncryption(fakeClient);

    const writeData: any = { firstName: 'Charlie' };
    const params = {
      model: 'Patient',
      action: 'create',
      args: { data: writeData },
    };
    await invokeMiddleware(fakeClient, params, async () => ({ id: 'r' }));
    expect(typeof writeData.firstName).toBe('string');
    expect(writeData.firstName.startsWith('enc:v1:')).toBe(true);
    expect(writeData.firstName.split(':').length).toBe(5);
  });

  it('AUDIT-016 PR 1: V1 round-trip via middleware (write → encrypted; read decrypts)', async () => {
    jest.resetModules();
    const mod = require('../phiEncryption');
    const fakeClient = makeFakeExtendsClient();
    mod.applyPHIEncryption(fakeClient);

    // Write — capture encrypted ciphertext from middleware.
    const writeData: any = { firstName: 'Diana' };
    await invokeMiddleware(
      fakeClient,
      { model: 'Patient', action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );
    const v1Envelope = writeData.firstName;
    expect(v1Envelope.startsWith('enc:v1:')).toBe(true);

    // Read — feed V1 envelope back through middleware, expect plaintext out.
    const readResult = await invokeMiddleware(
      fakeClient,
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
    const fakeClient = makeFakeExtendsClient();
    mod.applyPHIEncryption(fakeClient);

    const writeData: any = { firstName: 'Eve' };
    await invokeMiddleware(
      fakeClient,
      { model: 'Patient', action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );
    const v1 = writeData.firstName;
    const parts = v1.split(':');
    const tagBuf = Buffer.from(parts[3], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tagBuf.toString('hex')}:${parts[4]}`;

    await expect(
      invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findUnique', args: {} },
        async () => ({ firstName: tampered }),
      ),
    ).rejects.toThrow(/integrity check failed/);
  });

  // T7: per-record EncryptionContext plumbing through middleware
  it('AUDIT-016 PR 2 T7: middleware plumbs { model, field } context through to keyRotation.encryptWithCurrent', async () => {
    // Spy on keyRotation.encryptWithCurrent via mock
    const spyEncryptWithCurrent = jest.fn(async (text: string, _ctx: any) => `enc:v1:fakeIv:fakeTag:${Buffer.from(text).toString('hex')}`);

    jest.resetModules();
    jest.doMock('../../services/keyRotation', () => {
      const actual = jest.requireActual('../../services/keyRotation');
      return {
        ...actual,
        encryptWithCurrent: spyEncryptWithCurrent,
      };
    });

    const mod = require('../phiEncryption');
    const fakeClient = makeFakeExtendsClient();
    mod.applyPHIEncryption(fakeClient);

    const writeData: any = { firstName: 'Frank', lastName: 'Foo' };
    await invokeMiddleware(
      fakeClient,
      { model: 'Patient', action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );

    // Both firstName and lastName should have been encrypted with model=Patient
    // and the corresponding field name in EncryptionContext
    const firstNameCall = spyEncryptWithCurrent.mock.calls.find((c: any[]) => c[0] === 'Frank');
    const lastNameCall = spyEncryptWithCurrent.mock.calls.find((c: any[]) => c[0] === 'Foo');

    expect(firstNameCall).toBeDefined();
    expect(firstNameCall![1]).toEqual({
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'firstName',
    });
    expect(lastNameCall).toBeDefined();
    expect(lastNameCall![1]).toEqual({
      service: 'tailrd-backend',
      purpose: 'phi-encryption',
      model: 'Patient',
      field: 'lastName',
    });

    jest.dontMock('../../services/keyRotation');
  });
});

// ─── AUDIT-075 — PHI_FIELD_MAP coverage round-trip (Groups H/I/J) ─────────────
//
// Step 5 ships two test layers:
//   - Groups H/I/J (this describe block): middleware-scope encrypt/decrypt
//     round-trip semantics across AUDIT-075 NEW PHI_FIELD_MAP entries.
//   - Group K (backend/src/services/__tests__/webhookPipeline-sanitize.test.ts):
//     write-path callsite integration — verifies sanitize-at-write actually
//     applied at prisma boundary. Without Group K, Step 4 callsite redaction
//     could silently regress and middleware-scope tests would still pass.
//
// Helpers (per CONCERN C):
//   assertRoundTripStandard(model, field, plaintext) — encrypt → decrypt via
//     middleware; asserts V1 envelope shape + decrypt fidelity.
//   assertRoundTripSanitized(model, field, plaintextWithPHI, redactedExpected)
//     — pre-sanitizes via redactPHIFragments (simulating Step 4 callsite
//     integration), then runs middleware round-trip on the redacted string.
//     SCOPE: middleware encrypt/decrypt on already-redacted input. Does NOT
//     verify write-path integration (Group K covers that).

describe('AUDIT-075 — PHI_FIELD_MAP coverage round-trip (Groups H/I/J)', () => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeFakeExtendsClient(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeClient: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fakeClient.$extends = (ext: any) => {
      fakeClient._fn = ext.query.$allModels.$allOperations;
      return fakeClient;
    };
    return fakeClient;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function invokeMiddleware(fakeClient: any, params: any, next: any): Promise<any> {
    return fakeClient._fn({
      args: params.args,
      model: params.model,
      operation: params.action,
      query: next,
    });
  }

  async function assertRoundTripStandard(
    model: string,
    field: string,
    plaintext: string,
  ): Promise<void> {
    jest.resetModules();
    const mod = require('../phiEncryption');
    const fakeClient = makeFakeExtendsClient();
    mod.applyPHIEncryption(fakeClient);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeData: any = { [field]: plaintext };
    await invokeMiddleware(
      fakeClient,
      { model, action: 'create', args: { data: writeData } },
      async () => ({ id: 'r' }),
    );
    const envelope = writeData[field];
    expect(typeof envelope).toBe('string');
    expect(envelope.startsWith('enc:v1:')).toBe(true);
    expect(envelope.split(':').length).toBe(5);

    const readResult = await invokeMiddleware(
      fakeClient,
      { model, action: 'findUnique', args: {} },
      async () => ({ [field]: envelope }),
    );
    expect(readResult[field]).toBe(plaintext);
  }

  async function assertRoundTripSanitized(
    model: string,
    field: string,
    plaintextWithPHI: string,
    redactedExpected: string,
  ): Promise<void> {
    const { redactPHIFragments } = require('../../utils/phiRedaction');
    const redacted = redactPHIFragments(plaintextWithPHI);
    expect(redacted).toBe(redactedExpected);
    expect(redacted).not.toBe(plaintextWithPHI); // PHI was actually present + redacted

    await assertRoundTripStandard(model, field, redacted);
  }

  // ─── Group H — Standard round-trip (NEW PHI_FIELD_MAP models) ──────────────

  describe('Group H — standard round-trip (NEW PHI_FIELD_MAP models)', () => {
    it('H.1: WebhookEvent.errorMessage encrypts + decrypts via middleware', async () => {
      await assertRoundTripStandard(
        'WebhookEvent',
        'errorMessage',
        'Connection refused at upstream endpoint',
      );
    });

    it('H.2: UploadJob.errorMessage encrypts + decrypts via middleware', async () => {
      await assertRoundTripStandard(
        'UploadJob',
        'errorMessage',
        'CSV parse failure: invalid header row 3',
      );
    });

    it('H.3: AuditLog.description encrypts + decrypts via middleware', async () => {
      await assertRoundTripStandard(
        'AuditLog',
        'description',
        'User accessed patient roster',
      );
    });

    it('H.4: InternalNote.content encrypts + decrypts via middleware', async () => {
      await assertRoundTripStandard(
        'InternalNote',
        'content',
        'Care team reviewed clinical context for follow-up',
      );
    });
  });

  // ─── Group I — Sanitized round-trip middleware-scope ──────────────────────

  describe('Group I — sanitized round-trip middleware-scope', () => {
    it('I.1: WebhookEvent.errorMessage sanitized SSN round-trips as redacted', async () => {
      await assertRoundTripSanitized(
        'WebhookEvent',
        'errorMessage',
        'Failed for SSN: 123-45-6789',
        'Failed for SSN: [REDACTED-SSN]',
      );
    });

    it('I.2: UploadJob.errorMessage sanitized EMAIL round-trips as redacted', async () => {
      await assertRoundTripSanitized(
        'UploadJob',
        'errorMessage',
        'Header validation failed; contact patient@email.com for source',
        'Header validation failed; contact [REDACTED-EMAIL] for source',
      );
    });

    it('I.3: AuditLog.description sanitized PHONE round-trips as redacted', async () => {
      await assertRoundTripSanitized(
        'AuditLog',
        'description',
        'Patient contact phone 555-123-4567 logged',
        'Patient contact phone [REDACTED-PHONE] logged',
      );
    });
  });

  // ─── Group J — Encrypt-only PII (PatientDataRequest.notes) ────────────────

  describe('Group J — encrypt-only PII standard round-trip', () => {
    it('J.1: PatientDataRequest.notes encrypts + decrypts via middleware', async () => {
      await assertRoundTripStandard(
        'PatientDataRequest',
        'notes',
        'Right-to-deletion request submitted via portal',
      );
    });
  });
});
