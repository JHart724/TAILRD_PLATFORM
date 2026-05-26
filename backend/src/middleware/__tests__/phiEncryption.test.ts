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

// ============================================================================
// AUDIT-001 Tier A coverage extension (P1.AUDIT-001.A file 1 of 7)
//
// Per AUDIT-001 P0 Tier A scope locked at AUDIT-001.RECON + SCOPE.LOCK:
// nine uncovered coverage axes targeting 90%+ on Statements / Branches /
// Functions / Lines. Sister-precedent: IMPLEMENT-2A/2B/2C atomic test
// authoring pattern + AUDIT-015 closeout PR #214 + AUDIT-075 Group H/I/J
// nested-describe structure.
//
// Phase 1 section 5 Tier A acceptance criteria covered:
//   - round-trip encrypt/decrypt (existing + extended via new axes)
//   - key rotation handling (category m)
//   - failed-decrypt error path returns 500 not corrupted plaintext (m.2)
//
// Nine axes:
//   (e) JSON field encrypt/decrypt path (PHI_JSON_FIELDS)
//   (f) upsert operation path (create + update branches)
//   (g) createMany operation path (array + single-object data)
//   (h) array result decrypt path (findMany)
//   (i) DateTime PHI field Date <-> ISO conversion (dateOfBirth)
//   (j) ENCRYPTION_KEY missing paths (production throw + demo passthrough)
//   (k) generateEncryptionKey utility
//   (l) non-PHI model early-return path
//   (m) key rotation handling (Phase 1 section 5 acceptance)
// ============================================================================

describe('phiEncryption Tier A coverage extension (AUDIT-001 P0 file 1 of 7)', () => {
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

  // --------------------------------------------------------------------------
  // (e) JSON field encrypt/decrypt path (PHI_JSON_FIELDS)
  // Targets: encryptJsonField (lines 221-226) + decryptJsonField (lines 228-238)
  // --------------------------------------------------------------------------
  describe('(e) JSON field encrypt/decrypt path', () => {
    it('e.1: Alert.triggerData object round-trips via middleware (write encrypts JSON-stringified; read decrypts + JSON.parses)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { triggerData: { patientId: 'pat-001', severity: 'high' } };
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'create', args: { data: writeData } },
        async () => ({ id: 'a1' }),
      );
      expect(typeof writeData.triggerData).toBe('string');
      expect(writeData.triggerData.startsWith('enc:v1:')).toBe(true);

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'findUnique', args: {} },
        async () => ({ triggerData: writeData.triggerData }),
      );
      expect(readResult.triggerData).toEqual({ patientId: 'pat-001', severity: 'high' });
    });

    it('e.2: WebhookEvent.rawPayload nested object round-trips via middleware', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const nested = {
        resourceType: 'Bundle',
        entry: [{ resource: { resourceType: 'Patient', id: 'p1', name: [{ family: 'Doe' }] } }],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { rawPayload: nested };
      await invokeMiddleware(
        fakeClient,
        { model: 'WebhookEvent', action: 'create', args: { data: writeData } },
        async () => ({ id: 'w1' }),
      );
      expect(writeData.rawPayload.startsWith('enc:v1:')).toBe(true);

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'WebhookEvent', action: 'findUnique', args: {} },
        async () => ({ rawPayload: writeData.rawPayload }),
      );
      expect(readResult.rawPayload).toEqual(nested);
    });

    it('e.3: Alert.triggerData null value is skipped (encryptJsonField early-return; no encryption attempted)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { triggerData: null };
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'create', args: { data: writeData } },
        async () => ({ id: 'a1' }),
      );
      expect(writeData.triggerData).toBeNull();
    });

    it('e.4: Read path JSON.parse failure falls back to decrypted string', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // Encrypt a non-JSON string under a JSON field via encryptJsonField string branch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { triggerData: 'not-valid-json-string' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'create', args: { data: writeData } },
        async () => ({ id: 'a1' }),
      );
      const envelope = writeData.triggerData;

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'findUnique', args: {} },
        async () => ({ triggerData: envelope }),
      );
      expect(readResult.triggerData).toBe('not-valid-json-string');
    });

    it('e.5: encryptJsonField accepts already-string input without double JSON.stringify', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const jsonStr = JSON.stringify({ patientId: 'p1', flag: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { triggerData: jsonStr };
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'create', args: { data: writeData } },
        async () => ({ id: 'a1' }),
      );

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'findUnique', args: {} },
        async () => ({ triggerData: writeData.triggerData }),
      );
      // JSON.parse should succeed on the round-tripped string and produce the object
      expect(readResult.triggerData).toEqual({ patientId: 'p1', flag: true });
    });

    it('e.6: JSON field write produces V1 envelope (enc:v1: prefix; 5 colon-separated segments)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { triggerData: { a: 1 } };
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'create', args: { data: writeData } },
        async () => ({ id: 'a1' }),
      );
      expect(writeData.triggerData.startsWith('enc:v1:')).toBe(true);
      expect(writeData.triggerData.split(':').length).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // (f) upsert operation path (create + update branches)
  // Targets: lines 302-315 (upsert create + update conditional branches)
  // --------------------------------------------------------------------------
  describe('(f) upsert operation path', () => {
    it('f.1: upsert with both create + update branches encrypts PHI in each', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createBranch: any = { firstName: 'Alice', lastName: 'Anderson' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateBranch: any = { firstName: 'Bob', lastName: 'Brown' };
      await invokeMiddleware(
        fakeClient,
        {
          model: 'Patient',
          action: 'upsert',
          args: { where: { id: 'p1' }, create: createBranch, update: updateBranch },
        },
        async () => ({ id: 'p1' }),
      );
      expect(createBranch.firstName.startsWith('enc:v1:')).toBe(true);
      expect(createBranch.lastName.startsWith('enc:v1:')).toBe(true);
      expect(updateBranch.firstName.startsWith('enc:v1:')).toBe(true);
      expect(updateBranch.lastName.startsWith('enc:v1:')).toBe(true);
    });

    it('f.2: upsert with only create branch (no update) encrypts only create', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createBranch: any = { firstName: 'Alice' };
      await invokeMiddleware(
        fakeClient,
        {
          model: 'Patient',
          action: 'upsert',
          args: { where: { id: 'p1' }, create: createBranch },
        },
        async () => ({ id: 'p1' }),
      );
      expect(createBranch.firstName.startsWith('enc:v1:')).toBe(true);
    });

    it('f.3: upsert with only update branch (no create) encrypts only update', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateBranch: any = { firstName: 'Bob' };
      await invokeMiddleware(
        fakeClient,
        {
          model: 'Patient',
          action: 'upsert',
          args: { where: { id: 'p1' }, update: updateBranch },
        },
        async () => ({ id: 'p1' }),
      );
      expect(updateBranch.firstName.startsWith('enc:v1:')).toBe(true);
    });

    it('f.4: upsert with JSON fields encrypts JSON in both create + update branches', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createBranch: any = { triggerData: { severity: 'high' } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateBranch: any = { triggerData: { severity: 'low' } };
      await invokeMiddleware(
        fakeClient,
        {
          model: 'Alert',
          action: 'upsert',
          args: { where: { id: 'a1' }, create: createBranch, update: updateBranch },
        },
        async () => ({ id: 'a1' }),
      );
      expect(typeof createBranch.triggerData).toBe('string');
      expect(createBranch.triggerData.startsWith('enc:v1:')).toBe(true);
      expect(typeof updateBranch.triggerData).toBe('string');
      expect(updateBranch.triggerData.startsWith('enc:v1:')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // (g) createMany operation path
  // Targets: lines 318-326 (createMany array + single-object normalization)
  // --------------------------------------------------------------------------
  describe('(g) createMany operation path', () => {
    it('g.1: createMany with array data encrypts PHI in each row', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const rows = [
        { firstName: 'Alice' },
        { firstName: 'Bob' },
        { firstName: 'Charlie' },
      ];
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'createMany', args: { data: rows } },
        async () => ({ count: 3 }),
      );
      for (const row of rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((row as any).firstName.startsWith('enc:v1:')).toBe(true);
      }
    });

    it('g.2: createMany with single-object data (not array) wraps + encrypts', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const single: any = { firstName: 'Diana' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'createMany', args: { data: single } },
        async () => ({ count: 1 }),
      );
      expect(single.firstName.startsWith('enc:v1:')).toBe(true);
    });

    it('g.3: createMany with JSON fields encrypts JSON per row', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const rows = [
        { triggerData: { severity: 'low' } },
        { triggerData: { severity: 'high' } },
      ];
      await invokeMiddleware(
        fakeClient,
        { model: 'Alert', action: 'createMany', args: { data: rows } },
        async () => ({ count: 2 }),
      );
      for (const row of rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(typeof (row as any).triggerData).toBe('string');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((row as any).triggerData.startsWith('enc:v1:')).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // (h) array result decrypt path (findMany)
  // Targets: lines 340-345 (Array.isArray + Promise.all + decryptOne dispatch)
  // --------------------------------------------------------------------------
  describe('(h) array result decrypt path (findMany)', () => {
    it('h.1: findMany result with multiple encrypted records decrypts each', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w1: any = { firstName: 'Alice' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w2: any = { firstName: 'Bob' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: w1 } },
        async () => ({ id: 'p1' }),
      );
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: w2 } },
        async () => ({ id: 'p2' }),
      );

      const result = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findMany', args: {} },
        async () => [
          { id: 'p1', firstName: w1.firstName },
          { id: 'p2', firstName: w2.firstName },
        ],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].firstName).toBe('Alice');
      expect(result[1].firstName).toBe('Bob');
    });

    it('h.2: findMany returning empty array returns empty array unchanged', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const result = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findMany', args: {} },
        async () => [],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('h.3: findMany with mix of objects + null + primitives passes non-objects through unchanged', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = { firstName: 'Alice' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: w } },
        async () => ({ id: 'p1' }),
      );

      const result = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findMany', args: {} },
        async () => [{ id: 'p1', firstName: w.firstName }, null, 'string-value'],
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].firstName).toBe('Alice');
      expect(result[1]).toBeNull();
      expect(result[2]).toBe('string-value');
    });
  });

  // --------------------------------------------------------------------------
  // (i) DateTime PHI field Date <-> ISO conversion (dateOfBirth)
  // Targets: line 197-199 (Date.toISOString on write) +
  //          lines 210-215 (new Date + !isNaN(getTime()) on read)
  // --------------------------------------------------------------------------
  describe('(i) DateTime PHI field Date <-> ISO conversion', () => {
    it('i.1: Patient.dateOfBirth as Date converts to ISO + encrypts', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const dob = new Date('1980-05-15T00:00:00.000Z');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { dateOfBirth: dob };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      expect(typeof writeData.dateOfBirth).toBe('string');
      expect(writeData.dateOfBirth.startsWith('enc:v1:')).toBe(true);
    });

    it('i.2: Patient.dateOfBirth encrypted ISO decrypts back to a Date instance preserving time', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const dob = new Date('1980-05-15T00:00:00.000Z');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { dateOfBirth: dob };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelope = writeData.dateOfBirth;

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findUnique', args: {} },
        async () => ({ dateOfBirth: envelope }),
      );
      expect(readResult.dateOfBirth instanceof Date).toBe(true);
      expect((readResult.dateOfBirth as Date).getTime()).toBe(dob.getTime());
    });

    it('i.3: Patient.dateOfBirth null value is skipped (no encryption attempted)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { dateOfBirth: null };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      expect(writeData.dateOfBirth).toBeNull();
    });

    it('i.4: decrypted dateOfBirth that is not a valid Date string falls back to string (isNaN branch)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { dateOfBirth: 'not-a-date-string' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelope = writeData.dateOfBirth;

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findUnique', args: {} },
        async () => ({ dateOfBirth: envelope }),
      );
      expect(readResult.dateOfBirth).toBe('not-a-date-string');
    });
  });

  // --------------------------------------------------------------------------
  // (j) ENCRYPTION_KEY missing paths
  // Targets: lines 161-168 (encrypt throw + demo plaintextWarned)
  //          lines 175-178 (decrypt throw + demo passthrough)
  // --------------------------------------------------------------------------
  describe('(j) ENCRYPTION_KEY missing paths', () => {
    it('j.1: encrypt throws FATAL when PHI_ENCRYPTION_KEY missing and not in demo mode', async () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      delete process.env.DEMO_MODE;
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Alice' };
      await expect(
        invokeMiddleware(
          fakeClient,
          { model: 'Patient', action: 'create', args: { data: writeData } },
          async () => ({ id: 'p1' }),
        ),
      ).rejects.toThrow(/FATAL: PHI_ENCRYPTION_KEY is required outside demo mode\. Cannot store PHI unencrypted/);
    });

    it('j.2: decrypt throws FATAL when PHI_ENCRYPTION_KEY missing and not in demo mode', async () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      delete process.env.DEMO_MODE;
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      await expect(
        invokeMiddleware(
          fakeClient,
          { model: 'Patient', action: 'findUnique', args: {} },
          async () => ({ firstName: 'enc:v1:fakeIv:fakeTag:fakeCt' }),
        ),
      ).rejects.toThrow(/FATAL: PHI_ENCRYPTION_KEY is required outside demo mode\. Cannot read PHI without key/);
    });

    it('j.3: encrypt in demo mode without key returns plaintext + emits console.error PHI-WARN', async () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      process.env.DEMO_MODE = 'true';
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Alice' };
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      expect(writeData.firstName).toBe('Alice');
      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEMO_MODE active without PHI_ENCRYPTION_KEY'),
      );
      consoleErrSpy.mockRestore();
    });

    it('j.4: decrypt in demo mode without key returns envelope passthrough (no integrity check attempted)', async () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      process.env.DEMO_MODE = 'true';
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const readResult = await invokeMiddleware(
        fakeClient,
        { model: 'Patient', action: 'findUnique', args: {} },
        async () => ({ firstName: 'enc:v1:somePassthroughValue' }),
      );
      expect(readResult.firstName).toBe('enc:v1:somePassthroughValue');
    });
  });

  // --------------------------------------------------------------------------
  // (k) generateEncryptionKey utility
  // Targets: line 361 (crypto.randomBytes(32).toString('hex'))
  // --------------------------------------------------------------------------
  describe('(k) generateEncryptionKey utility', () => {
    it('k.1: returns 64-char hex string (256-bit AES key per NIST FIPS 197)', () => {
      const mod = require('../phiEncryption');
      const key = mod.generateEncryptionKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('k.2: is non-deterministic (two calls produce different keys)', () => {
      const mod = require('../phiEncryption');
      const k1 = mod.generateEncryptionKey();
      const k2 = mod.generateEncryptionKey();
      expect(k1).not.toBe(k2);
    });

    it('k.3: output is decodable as hex Buffer with length 32 bytes', () => {
      const mod = require('../phiEncryption');
      const key = mod.generateEncryptionKey();
      const buf = Buffer.from(key, 'hex');
      expect(buf.length).toBe(32);
    });
  });

  // --------------------------------------------------------------------------
  // (l) non-PHI model early-return path
  // Targets: lines 285-287 (!stringFields && !jsonFields early-return)
  // --------------------------------------------------------------------------
  describe('(l) non-PHI model early-return path', () => {
    it('l.1: model not in PHI_FIELD_MAP or PHI_JSON_FIELDS invokes query(args) once with original args', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      const origArgs = { where: { id: 'h1' } };
      const queryFn = jest.fn(async () => ({ id: 'h1', name: 'Hospital A' }));
      const result = await invokeMiddleware(
        fakeClient,
        { model: 'Hospital', action: 'findUnique', args: origArgs },
        queryFn,
      );
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(queryFn).toHaveBeenCalledWith(origArgs);
      expect(result).toEqual({ id: 'h1', name: 'Hospital A' });
    });

    it('l.2: non-PHI model write does not mutate args (no encryption pass)', async () => {
      const mod = require('../phiEncryption');
      const fakeClient = makeFakeExtendsClient();
      mod.applyPHIEncryption(fakeClient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { name: 'Hospital B', region: 'TX' };
      const snapshot = { ...writeData };
      await invokeMiddleware(
        fakeClient,
        { model: 'Hospital', action: 'create', args: { data: writeData } },
        async () => ({ id: 'h2', ...writeData }),
      );
      expect(writeData).toEqual(snapshot);
    });
  });

  // --------------------------------------------------------------------------
  // (m) key rotation handling (Phase 1 section 5 acceptance criteria)
  // Targets: cross-module integrity guarantee on key change +
  //          AUDIT-015 fail-loud invariant under key mismatch
  // --------------------------------------------------------------------------
  describe('(m) key rotation handling', () => {
    it('m.1: ciphertext written with key1 fails integrity check when decrypted with key2', async () => {
      process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
      const mod1 = require('../phiEncryption');
      const client1 = makeFakeExtendsClient();
      mod1.applyPHIEncryption(client1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Alice' };
      await invokeMiddleware(
        client1,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelopeUnderKey1 = writeData.firstName;
      expect(envelopeUnderKey1.startsWith('enc:v1:')).toBe(true);

      const key2 = crypto.randomBytes(32).toString('hex');
      process.env.PHI_ENCRYPTION_KEY = key2;
      jest.resetModules();
      const mod2 = require('../phiEncryption');
      const client2 = makeFakeExtendsClient();
      mod2.applyPHIEncryption(client2);

      await expect(
        invokeMiddleware(
          client2,
          { model: 'Patient', action: 'findUnique', args: {} },
          async () => ({ firstName: envelopeUnderKey1 }),
        ),
      ).rejects.toThrow(/integrity check failed/);
    });

    it('m.2: failed decrypt under wrong key does NOT return ciphertext as plaintext (AUDIT-015 invariant; HTTP 500 not corrupted)', async () => {
      process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
      const mod1 = require('../phiEncryption');
      const client1 = makeFakeExtendsClient();
      mod1.applyPHIEncryption(client1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Bob' };
      await invokeMiddleware(
        client1,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelopeUnderKey1 = writeData.firstName;

      const key2 = crypto.randomBytes(32).toString('hex');
      process.env.PHI_ENCRYPTION_KEY = key2;
      jest.resetModules();
      const mod2 = require('../phiEncryption');
      const client2 = makeFakeExtendsClient();
      mod2.applyPHIEncryption(client2);

      let captured: unknown = undefined;
      let threw = false;
      try {
        captured = await invokeMiddleware(
          client2,
          { model: 'Patient', action: 'findUnique', args: {} },
          async () => ({ firstName: envelopeUnderKey1 }),
        );
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
      expect(captured).toBeUndefined();
      // Crucially: caller never receives the ciphertext envelope as a "value"
      // (no silent passthrough). AUDIT-015 invariant + Phase 1 section 5
      // acceptance: failed decrypt path returns 500, not corrupted plaintext.
    });

    it('m.3: integrity error message identifies envelope version on key mismatch', async () => {
      process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
      const mod1 = require('../phiEncryption');
      const client1 = makeFakeExtendsClient();
      mod1.applyPHIEncryption(client1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Carol' };
      await invokeMiddleware(
        client1,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelopeUnderKey1 = writeData.firstName;

      const key2 = crypto.randomBytes(32).toString('hex');
      process.env.PHI_ENCRYPTION_KEY = key2;
      jest.resetModules();
      const mod2 = require('../phiEncryption');
      const client2 = makeFakeExtendsClient();
      mod2.applyPHIEncryption(client2);

      await expect(
        invokeMiddleware(
          client2,
          { model: 'Patient', action: 'findUnique', args: {} },
          async () => ({ firstName: envelopeUnderKey1 }),
        ),
      ).rejects.toThrow(/envelope=v1/);
    });

    it('m.4: PHI_LEGACY_PLAINTEXT_OK=true does not bypass integrity check on tampered enc-prefixed ciphertext', async () => {
      process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
      process.env.PHI_LEGACY_PLAINTEXT_OK = 'true';
      const mod = require('../phiEncryption');
      const client = makeFakeExtendsClient();
      mod.applyPHIEncryption(client);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writeData: any = { firstName: 'Dan' };
      await invokeMiddleware(
        client,
        { model: 'Patient', action: 'create', args: { data: writeData } },
        async () => ({ id: 'p1' }),
      );
      const envelope = writeData.firstName;

      // Tamper the auth tag (segment index 3 in V1: enc:v1:iv:authTag:ciphertext)
      const parts = envelope.split(':');
      const tagBuf = Buffer.from(parts[3], 'hex');
      tagBuf[0] ^= 0xff;
      const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tagBuf.toString('hex')}:${parts[4]}`;

      await expect(
        invokeMiddleware(
          client,
          { model: 'Patient', action: 'findUnique', args: {} },
          async () => ({ firstName: tampered }),
        ),
      ).rejects.toThrow(/integrity check failed/);
    });
  });
});
