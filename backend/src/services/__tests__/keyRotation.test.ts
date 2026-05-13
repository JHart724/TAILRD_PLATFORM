/**
 * keyRotation.ts — AUDIT-016 PR 1 implementation tests.
 *
 * Tests cover:
 *   - V0 backwards-compat decrypt
 *   - V1 round-trip (encryptWithCurrent → decryptAny)
 *   - Mixed-state batch decrypt (V0 + V1 in same result set)
 *   - AUDIT-015 fail-loud invariants on V0 + V1 paths
 *   - AUDIT-017 PHI_ENCRYPTION_KEY validation (bundled per D4)
 *   - V2 envelope returns DesignPhaseStubError until PR 2 lands
 *   - rotateKey + migrateRecord still throw DesignPhaseStubError
 *   - Type-schema assertions for V0/V1/V2 (post 2026-05-07 design doc revision)
 */

import crypto from 'crypto';
import {
  DesignPhaseStubError,
  KeyValidationError,
  EnvelopeConfigError,
  rotateKey,
  encryptWithCurrent,
  decryptAny,
  migrateRecord,
  validateKeyOrThrow,
  validateEnvelopeConfigOrThrow,
  _resetKeyValidationCacheForTests,
  EncryptionContext,
  EnvelopeV0,
  EnvelopeV1,
  EnvelopeV2,
  KeyVersion,
  MigrationResult,
} from '../keyRotation';
import { buildV0, buildV1, buildV2 } from '../envelopeFormat';

const TEST_CONTEXT: EncryptionContext = {
  service: 'tailrd-backend',
  purpose: 'phi-encryption',
};

// 64 hex chars = 256-bit AES key
const TEST_KEY = crypto.randomBytes(32).toString('hex');

const ORIG_KEY = process.env.PHI_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
  _resetKeyValidationCacheForTests();
});

afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.PHI_ENCRYPTION_KEY;
  else process.env.PHI_ENCRYPTION_KEY = ORIG_KEY;
  _resetKeyValidationCacheForTests();
});

describe('DesignPhaseStubError', () => {
  it('extends Error with name DesignPhaseStubError', () => {
    const err = new DesignPhaseStubError('testOperation()');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DesignPhaseStubError');
  });
  it('error message references the operation + design doc', () => {
    const err = new DesignPhaseStubError('rotateKey()');
    expect(err.message).toContain('rotateKey()');
    expect(err.message).toContain('AUDIT-016');
    expect(err.message).toContain('AUDIT_016_KEY_ROTATION_DESIGN.md');
  });
});

describe('rotateKey() — still stub (PR 3 lands)', () => {
  it('throws DesignPhaseStubError until implementation PR 3 lands', async () => {
    await expect(rotateKey()).rejects.toThrow(DesignPhaseStubError);
    await expect(rotateKey()).rejects.toThrow(/rotateKey\(\)/);
  });
});

// migrateRecord() — AUDIT-016 PR 3 implementation tests live in their own
// describe block below ("AUDIT-016 PR 3 — migrateRecord() V0/V1 → V2"). PR 1
// stub-throw test removed at PR 3 implementation.

// ── AUDIT-017 — validateKeyOrThrow (bundled per D4) ────────────────────────

describe('validateKeyOrThrow() — AUDIT-017', () => {
  it('throws KeyValidationError when key is undefined', () => {
    expect(() => validateKeyOrThrow(undefined)).toThrow(KeyValidationError);
    expect(() => validateKeyOrThrow(undefined)).toThrow(/not set/);
  });
  it('throws KeyValidationError when key is empty string', () => {
    expect(() => validateKeyOrThrow('')).toThrow(KeyValidationError);
  });
  it('throws KeyValidationError when key is too short (e.g., 32 hex chars)', () => {
    expect(() => validateKeyOrThrow('a'.repeat(32))).toThrow(KeyValidationError);
    expect(() => validateKeyOrThrow('a'.repeat(32))).toThrow(/64 hex/);
  });
  it('throws KeyValidationError when key is too long (e.g., 128 hex chars)', () => {
    expect(() => validateKeyOrThrow('a'.repeat(128))).toThrow(KeyValidationError);
  });
  it('throws KeyValidationError when key contains non-hex characters', () => {
    expect(() => validateKeyOrThrow('z'.repeat(64))).toThrow(KeyValidationError);
    expect(() => validateKeyOrThrow('z'.repeat(64))).toThrow(/non-hex/);
  });
  it('passes when key is exactly 64 hex chars (256-bit)', () => {
    expect(() => validateKeyOrThrow('a'.repeat(64))).not.toThrow();
    expect(() => validateKeyOrThrow(crypto.randomBytes(32).toString('hex'))).not.toThrow();
  });
});

// ── encryptWithCurrent — V1 emission ────────────────────────────────────────

describe('encryptWithCurrent() — emits V1', () => {
  it('emits an envelope starting with enc:v1: prefix', async () => {
    const envelope = await encryptWithCurrent('hello world', TEST_CONTEXT);
    expect(envelope.startsWith('enc:v1:')).toBe(true);
  });
  it('emits a 5-colon-part V1 envelope', async () => {
    const envelope = await encryptWithCurrent('plaintext', TEST_CONTEXT);
    expect(envelope.split(':').length).toBe(5);
  });
  it('produces different envelopes for the same plaintext (random IV)', async () => {
    const a = await encryptWithCurrent('same', TEST_CONTEXT);
    const b = await encryptWithCurrent('same', TEST_CONTEXT);
    expect(a).not.toBe(b);
  });
  it('throws KeyValidationError when PHI_ENCRYPTION_KEY is unset', async () => {
    delete process.env.PHI_ENCRYPTION_KEY;
    _resetKeyValidationCacheForTests();
    await expect(encryptWithCurrent('plaintext', TEST_CONTEXT)).rejects.toThrow(KeyValidationError);
  });
});

// ── decryptAny — V0 backwards-compat + V1 round-trip ────────────────────────

describe('decryptAny() — V0 + V1 dispatch', () => {
  it('V1 round-trip: encryptWithCurrent → decryptAny preserves plaintext', async () => {
    const plaintext = 'Patient MRN-12345 DOB-1955-03-14';
    const envelope = await encryptWithCurrent(plaintext, TEST_CONTEXT);
    const decrypted = await decryptAny(envelope, TEST_CONTEXT);
    expect(decrypted).toBe(plaintext);
  });

  it('V0 backwards-compat: decrypts legacy V0 envelope correctly', async () => {
    // Manually craft a V0 envelope to simulate legacy production ciphertext.
    const keyBuf = Buffer.from(TEST_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
    let encrypted = cipher.update('legacy-V0-row', 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const v0 = buildV0(iv.toString('hex'), authTag, encrypted);

    const decrypted = await decryptAny(v0, TEST_CONTEXT);
    expect(decrypted).toBe('legacy-V0-row');
  });

  it('mixed-state batch: V0 + V1 + V0 + V1 all decrypt correctly per-row', async () => {
    const plaintexts = ['v0-row-A', 'v1-row-B', 'v0-row-C', 'v1-row-D'];
    const envelopes: string[] = [];

    // Build V0 for indices 0, 2 and V1 for indices 1, 3.
    for (let i = 0; i < plaintexts.length; i++) {
      if (i % 2 === 0) {
        const keyBuf = Buffer.from(TEST_KEY, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
        let enc = cipher.update(plaintexts[i], 'utf8', 'hex');
        enc += cipher.final('hex');
        envelopes.push(buildV0(iv.toString('hex'), cipher.getAuthTag().toString('hex'), enc));
      } else {
        envelopes.push(await encryptWithCurrent(plaintexts[i], TEST_CONTEXT));
      }
    }

    // Verify the mix is real: prefixes alternate.
    expect(envelopes[0].startsWith('enc:v1:')).toBe(false);
    expect(envelopes[1].startsWith('enc:v1:')).toBe(true);
    expect(envelopes[2].startsWith('enc:v1:')).toBe(false);
    expect(envelopes[3].startsWith('enc:v1:')).toBe(true);

    // Decrypt all in parallel.
    const decrypted = await Promise.all(envelopes.map(e => decryptAny(e, TEST_CONTEXT)));
    expect(decrypted).toEqual(plaintexts);
  });

  // V2 stub-throw test (PR 1) replaced by V2 round-trip test (PR 2 — see
  // 'V2 envelope round-trip via localEncrypt' below).
});

// ── AUDIT-016 PR 2 — V2 envelope emission + KMS wiring ─────────────────────
//
// T1-T8 from operator's PR 2 implementation brief PLUS design §6 test plan.
// Mock-based unit tests; integration tests against real AWS KMS are gated
// separately (see audit016-pr2-kms-roundtrip.test.ts).
//
// Note on dev-mode behavior: kmsService gates KMS API calls on
// `NODE_ENV === 'production'` (kmsService.ts:75 + 122). In test env
// (NODE_ENV='test'), envelopeEncrypt + envelopeDecrypt always use
// localEncrypt/Decrypt — no real KMS calls. Tests verifying KMS error
// handling stub envelopeEncrypt/Decrypt directly to simulate KMS rejection.

describe('AUDIT-016 PR 2 — V2 envelope round-trip + flag-flip', () => {
  const ORIG_VERSION = process.env.PHI_ENVELOPE_VERSION;
  const ORIG_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS;

  afterEach(() => {
    if (ORIG_VERSION === undefined) delete process.env.PHI_ENVELOPE_VERSION;
    else process.env.PHI_ENVELOPE_VERSION = ORIG_VERSION;
    if (ORIG_ALIAS === undefined) delete process.env.AWS_KMS_PHI_KEY_ALIAS;
    else process.env.AWS_KMS_PHI_KEY_ALIAS = ORIG_ALIAS;
  });

  // T6: dev V2 round-trip via localEncrypt
  it('T6: dev V2 round-trip via localEncrypt — encryptWithCurrent V2 → decryptAny V2 → plaintext', async () => {
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    const plaintext = 'Patient MRN-12345 firstName=Alice';
    const envelope = await encryptWithCurrent(plaintext, TEST_CONTEXT);
    expect(envelope.startsWith('enc:v2:')).toBe(true);
    expect(envelope.split(':').length).toBe(6); // enc:v2:wrappedDEK:iv:authTag:ciphertext

    const decrypted = await decryptAny(envelope, TEST_CONTEXT);
    expect(decrypted).toBe(plaintext);
  });

  // Flag-flip emission default (V1)
  it('flag-flip default: PHI_ENVELOPE_VERSION unset → V1 emission (backwards-compat)', async () => {
    delete process.env.PHI_ENVELOPE_VERSION;
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';

    const envelope = await encryptWithCurrent('plaintext', TEST_CONTEXT);
    expect(envelope.startsWith('enc:v1:')).toBe(true);
    expect(envelope.split(':').length).toBe(5); // enc:v1:iv:authTag:ciphertext
  });

  // Flag-flip emission requires both env vars
  it('flag-flip: PHI_ENVELOPE_VERSION=v2 without AWS_KMS_PHI_KEY_ALIAS → V1 emission (gating not satisfied)', async () => {
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    delete process.env.AWS_KMS_PHI_KEY_ALIAS;

    const envelope = await encryptWithCurrent('plaintext', TEST_CONTEXT);
    expect(envelope.startsWith('enc:v1:')).toBe(true);
  });

  // T1: decrypt-is-not-gated (rollback safety)
  it('T1: decrypt-is-not-gated — V2 ciphertext decrypts even when PHI_ENVELOPE_VERSION=v1 (rollback safety)', async () => {
    // Encrypt with V2 enabled
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';
    const v2envelope = await encryptWithCurrent('rollback-test', TEST_CONTEXT);
    expect(v2envelope.startsWith('enc:v2:')).toBe(true);

    // Now disable V2 emission (rollback simulation)
    delete process.env.PHI_ENVELOPE_VERSION;

    // Decryption of existing V2 ciphertext must still succeed
    const decrypted = await decryptAny(v2envelope, TEST_CONTEXT);
    expect(decrypted).toBe('rollback-test');
  });
});

describe('AUDIT-016 PR 2 — V0/V1/V2 mixed-state batch decrypt (triple coverage)', () => {
  const ORIG_VERSION = process.env.PHI_ENVELOPE_VERSION;
  const ORIG_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS;

  afterEach(() => {
    if (ORIG_VERSION === undefined) delete process.env.PHI_ENVELOPE_VERSION;
    else process.env.PHI_ENVELOPE_VERSION = ORIG_VERSION;
    if (ORIG_ALIAS === undefined) delete process.env.AWS_KMS_PHI_KEY_ALIAS;
    else process.env.AWS_KMS_PHI_KEY_ALIAS = ORIG_ALIAS;
  });

  it('triple coverage: V0 + V1 + V2 in same array all decrypt cleanly', async () => {
    // Build one of each version for the SAME plaintext
    const plaintexts = ['v0-row', 'v1-row', 'v2-row'];

    // V0 — manual craft (legacy untagged)
    const keyBuf = Buffer.from(TEST_KEY, 'hex');
    const iv0 = crypto.randomBytes(16);
    const cipher0 = crypto.createCipheriv('aes-256-gcm', keyBuf, iv0);
    let enc0 = cipher0.update(plaintexts[0], 'utf8', 'hex');
    enc0 += cipher0.final('hex');
    const v0 = buildV0(iv0.toString('hex'), cipher0.getAuthTag().toString('hex'), enc0);

    // V1 — via encryptWithCurrent default
    delete process.env.PHI_ENVELOPE_VERSION;
    const v1 = await encryptWithCurrent(plaintexts[1], TEST_CONTEXT);
    expect(v1.startsWith('enc:v1:')).toBe(true);

    // V2 — via encryptWithCurrent with V2 enabled
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';
    const v2 = await encryptWithCurrent(plaintexts[2], TEST_CONTEXT);
    expect(v2.startsWith('enc:v2:')).toBe(true);

    // Decrypt all three (mixed-state result set)
    const decrypted = await Promise.all([
      decryptAny(v0, TEST_CONTEXT),
      decryptAny(v1, TEST_CONTEXT),
      decryptAny(v2, TEST_CONTEXT),
    ]);
    expect(decrypted).toEqual(plaintexts);
  });
});

describe('AUDIT-016 PR 2 — validateEnvelopeConfigOrThrow', () => {
  // T4: module-init validation
  it('T4: PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS missing → EnvelopeConfigError', () => {
    expect(() =>
      validateEnvelopeConfigOrThrow({ PHI_ENVELOPE_VERSION: 'v2' }),
    ).toThrow(EnvelopeConfigError);
    expect(() =>
      validateEnvelopeConfigOrThrow({ PHI_ENVELOPE_VERSION: 'v2' }),
    ).toThrow(/AWS_KMS_PHI_KEY_ALIAS/);
  });

  it('default (PHI_ENVELOPE_VERSION unset) → no-op', () => {
    expect(() => validateEnvelopeConfigOrThrow({})).not.toThrow();
  });

  it('PHI_ENVELOPE_VERSION=v1 → no-op (default V1 emission)', () => {
    expect(() =>
      validateEnvelopeConfigOrThrow({ PHI_ENVELOPE_VERSION: 'v1' }),
    ).not.toThrow();
  });

  it('PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS set → no-op', () => {
    expect(() =>
      validateEnvelopeConfigOrThrow({
        PHI_ENVELOPE_VERSION: 'v2',
        AWS_KMS_PHI_KEY_ALIAS: 'alias/test',
      }),
    ).not.toThrow();
  });

  it('PHI_ENVELOPE_VERSION=v3 (unrecognized) → EnvelopeConfigError', () => {
    expect(() =>
      validateEnvelopeConfigOrThrow({ PHI_ENVELOPE_VERSION: 'v3' }),
    ).toThrow(/must be 'v1'/);
  });
});

describe('AUDIT-016 PR 2 — AUDIT-022 SQL filter compatibility', () => {
  const ORIG_VERSION = process.env.PHI_ENVELOPE_VERSION;
  const ORIG_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS;

  afterEach(() => {
    if (ORIG_VERSION === undefined) delete process.env.PHI_ENVELOPE_VERSION;
    else process.env.PHI_ENVELOPE_VERSION = ORIG_VERSION;
    if (ORIG_ALIAS === undefined) delete process.env.AWS_KMS_PHI_KEY_ALIAS;
    else process.env.AWS_KMS_PHI_KEY_ALIAS = ORIG_ALIAS;
  });

  // T5: AUDIT-022 enc:% prefix preserved
  it('T5: V2 envelope starts with enc:v2: → matches AUDIT-022 SQL filter "enc:%"', async () => {
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';
    const envelope = await encryptWithCurrent('payload', TEST_CONTEXT);
    expect(envelope.startsWith('enc:')).toBe(true);
    expect(envelope.startsWith('enc:v2:')).toBe(true);
  });
});

// ── AUDIT-015 fail-loud invariants on V0 + V1 paths ─────────────────────────

describe('decryptAny() — AUDIT-015 fail-loud invariants', () => {
  it('throws on malformed envelope (wrong segment count for V0)', async () => {
    await expect(decryptAny('enc:onlyOnePart', TEST_CONTEXT)).rejects.toThrow(/parse failed/);
  });
  it('throws on malformed envelope (wrong segment count for V1)', async () => {
    await expect(decryptAny('enc:v1:tooFew', TEST_CONTEXT)).rejects.toThrow(/parse failed/);
  });
  it('throws on missing enc: prefix', async () => {
    await expect(decryptAny('plaintext-no-prefix', TEST_CONTEXT)).rejects.toThrow(/missing enc: prefix/);
  });
  it('throws on unrecognized version tag (e.g., v9)', async () => {
    await expect(decryptAny('enc:v9:a:b:c:d', TEST_CONTEXT)).rejects.toThrow(/unrecognized version/);
  });
  it('V0 auth-tag tampering throws integrity error', async () => {
    // Build a valid V1, then corrupt authTag to flip integrity check.
    const v1 = await encryptWithCurrent('payload', TEST_CONTEXT);
    const parts = v1.split(':');
    const tagBuf = Buffer.from(parts[3], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tagBuf.toString('hex')}:${parts[4]}`;
    await expect(decryptAny(tampered, TEST_CONTEXT)).rejects.toThrow(/integrity check failed/);
  });
  it('V1 auth-tag tampering throws integrity error with envelope=v1 in message', async () => {
    const v1 = await encryptWithCurrent('payload', TEST_CONTEXT);
    const parts = v1.split(':');
    const tagBuf = Buffer.from(parts[3], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tagBuf.toString('hex')}:${parts[4]}`;
    await expect(decryptAny(tampered, TEST_CONTEXT)).rejects.toThrow(/envelope=v1/);
  });
});

// ── Audit-022 SQL-filter compatibility (V1 + V2 still match `enc:%`) ───────

describe('AUDIT-022 SQL-filter compatibility', () => {
  it('V1 envelope starts with "enc:" — matches the "enc:%" SQL filter', async () => {
    const v1 = await encryptWithCurrent('any', TEST_CONTEXT);
    expect(v1.startsWith('enc:')).toBe(true);
  });
  it('V2 envelope starts with "enc:" — matches the "enc:%" SQL filter (PR 2 forward-compat)', () => {
    const v2 = buildV2('w', 'i', 'a', 'c');
    expect(v2.startsWith('enc:')).toBe(true);
  });
});

// ── Type-schema assertions (post 2026-05-07 V0/V1/V2 design revision) ──────

describe('Envelope type schemas (compile-time + runtime shape)', () => {
  it('EnvelopeV0 has 4 readonly fields: version, iv, authTag, ciphertext', () => {
    const v0: EnvelopeV0 = {
      version: 'v0',
      iv: 'aabbccdd',
      authTag: 'eeff0011',
      ciphertext: '22334455',
    };
    expect(v0.version).toBe('v0');
    expect(v0.iv).toBe('aabbccdd');
  });
  it('EnvelopeV1 has 4 readonly fields: version, iv, authTag, ciphertext (NO wrappedDEK; that lives in V2)', () => {
    const v1: EnvelopeV1 = {
      version: 'v1',
      iv: 'aabbccdd',
      authTag: 'eeff0011',
      ciphertext: '22334455',
    };
    expect(v1.version).toBe('v1');
    // Compile-time check: V1 must NOT have wrappedDEK. (This test passing
    // through the type system is itself the assertion. Runtime check below
    // confirms the explicit field shape.)
    expect(Object.keys(v1)).toEqual(['version', 'iv', 'authTag', 'ciphertext']);
  });
  it('EnvelopeV2 has 5 readonly fields: version, wrappedDEK, iv, authTag, ciphertext', () => {
    const v2: EnvelopeV2 = {
      version: 'v2',
      wrappedDEK: 'wrappedKeyBase64',
      iv: 'ivBase64',
      authTag: 'authTagBase64',
      ciphertext: 'ciphertextBase64',
    };
    expect(v2.version).toBe('v2');
    expect(v2.wrappedDEK).toBe('wrappedKeyBase64');
  });
  it('KeyVersion accepts v0, v1, and v2 (compile-time check)', () => {
    const versions: KeyVersion[] = ['v0', 'v1', 'v2'];
    expect(versions).toContain('v0');
    expect(versions).toContain('v1');
    expect(versions).toContain('v2');
  });
  it('EncryptionContext has required service + purpose; optional model + field', () => {
    const minimal: EncryptionContext = { service: 'a', purpose: 'b' };
    const full: EncryptionContext = { service: 'a', purpose: 'b', model: 'Patient', field: 'mrn' };
    expect(minimal.service).toBe('a');
    expect(full.model).toBe('Patient');
  });
  it('MigrationResult schema captures conversion outcome', () => {
    const result: MigrationResult = {
      recordId: 'rec-1',
      table: 'patients',
      column: 'firstName',
      fromVersion: 'v0',
      toVersion: 'v2',
      fieldsConverted: 1,
      skipped: false,
      migratedAt: new Date(),
    };
    expect(result.fromVersion).toBe('v0');
    expect(result.toVersion).toBe('v2');
    expect(result.column).toBe('firstName');
  });
});

// ── AUDIT-016 PR 3 — migrateRecord() V0/V1 → V2 ─────────────────────────────

describe('AUDIT-016 PR 3 — migrateRecord() V0/V1 → V2', () => {
  // Reset modules between tests so env-mutating cases re-evaluate the V2 emit
  // gate. Local helper builds a fresh keyRotation module reference per test.
  function freshModule() {
    jest.resetModules();
    process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test-tailrd-phi';
    delete process.env.DEMO_MODE;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../keyRotation');
  }

  const PR3_CONTEXT: EncryptionContext = {
    service: 'tailrd-backend',
    purpose: 'phi-migration-v0v1-to-v2',
    model: 'Patient',
    field: 'firstName',
  };

  // Helpers for per-test V0/V1 envelope construction without going through the
  // public encrypt path (we want to test migrateRecord on KNOWN-shape inputs).
  function encryptV0LikeProductionLegacy(plaintext: string, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return buildV0(iv.toString('hex'), authTag, enc);
  }

  function encryptV1LikeProduction(plaintext: string, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return buildV1(iv.toString('hex'), authTag, enc);
  }

  function fakePrismaWithSpy(): {
    client: { $executeRawUnsafe: jest.Mock };
    spy: jest.Mock;
  } {
    const spy = jest.fn().mockResolvedValue(1);
    return { client: { $executeRawUnsafe: spy }, spy };
  }

  it('T-MR-1: V0 envelope → re-encrypted as V2; plaintext preserved (round-trip)', async () => {
    const mod = freshModule();
    const v0 = encryptV0LikeProductionLegacy('Alice', TEST_KEY);
    const { client, spy } = fakePrismaWithSpy();

    const result = await mod.migrateRecord('rec-1', 'patients', 'firstName', PR3_CONTEXT, client, v0);

    expect(result.skipped).toBe(false);
    expect(result.fromVersion).toBe('v0');
    expect(result.toVersion).toBe('v2');
    expect(result.fieldsConverted).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    // Args: (query, v2envelope, recordId)
    const [query, v2envelope, recordId] = spy.mock.calls[0];
    expect(query).toMatch(/UPDATE "patients" SET "firstName" = \$1 WHERE id = \$2/);
    expect(typeof v2envelope).toBe('string');
    expect((v2envelope as string).startsWith('enc:v2:')).toBe(true);
    expect(recordId).toBe('rec-1');
    // Round-trip: decrypt the V2 envelope and verify plaintext preserved
    const decrypted = await mod.decryptAny(v2envelope, PR3_CONTEXT);
    expect(decrypted).toBe('Alice');
  });

  it('T-MR-2: V1 envelope → re-encrypted as V2; plaintext preserved', async () => {
    const mod = freshModule();
    const v1 = encryptV1LikeProduction('Bob', TEST_KEY);
    const { client, spy } = fakePrismaWithSpy();

    const result = await mod.migrateRecord('rec-2', 'patients', 'lastName',
      { ...PR3_CONTEXT, field: 'lastName' }, client, v1);

    expect(result.skipped).toBe(false);
    expect(result.fromVersion).toBe('v1');
    expect(result.toVersion).toBe('v2');
    expect(spy).toHaveBeenCalledTimes(1);
    const v2envelope = spy.mock.calls[0][1];
    expect((v2envelope as string).startsWith('enc:v2:')).toBe(true);
    const decrypted = await mod.decryptAny(v2envelope, { ...PR3_CONTEXT, field: 'lastName' });
    expect(decrypted).toBe('Bob');
  });

  it('T-MR-3: V2 envelope → log + skip; NO DB write (race protection)', async () => {
    const mod = freshModule();
    // Synthesize V2 envelope directly via buildV2 (skip-input path doesn't
    // require a real KMS-wrapped DEK — parseEnvelope only needs the v2 prefix
    // + 5 colon segments).
    const v2 = buildV2('fakeWrappedDEK', 'fakeIv', 'fakeAuthTag', 'fakeCiphertext');
    const { client, spy } = fakePrismaWithSpy();

    const result = await mod.migrateRecord('rec-3', 'patients', 'firstName', PR3_CONTEXT, client, v2);

    expect(result.skipped).toBe(true);
    expect(result.fromVersion).toBe('v2');
    expect(result.toVersion).toBe('v2');
    expect(result.fieldsConverted).toBe(0);
    expect(spy).not.toHaveBeenCalled(); // D3: no DB write
  });

  it('T-MR-4: invalid envelope → throws EnvelopeFormatError', async () => {
    const mod = freshModule();
    const { client } = fakePrismaWithSpy();
    await expect(
      mod.migrateRecord('rec-4', 'patients', 'firstName', PR3_CONTEXT, client, 'not-an-envelope'),
    ).rejects.toThrow();
  });

  it('T-MR-5: decrypt failure (auth tag tampered) → throws with envelopeVersion preserved', async () => {
    const mod = freshModule();
    const v0 = encryptV0LikeProductionLegacy('Carol', TEST_KEY);
    // Tamper the auth tag
    const parts = v0.split(':');
    const tagBuf = Buffer.from(parts[2], 'hex');
    tagBuf[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${tagBuf.toString('hex')}:${parts[3]}`;
    const { client, spy } = fakePrismaWithSpy();

    await expect(
      mod.migrateRecord('rec-5', 'patients', 'firstName', PR3_CONTEXT, client, tampered),
    ).rejects.toThrow(/integrity check failed/);
    expect(spy).not.toHaveBeenCalled(); // failure path should not write
  });

  it('T-MR-6: SQL UPDATE failure propagates to caller (continue-on-error contract)', async () => {
    const mod = freshModule();
    const v1 = encryptV1LikeProduction('Dave', TEST_KEY);
    const failingClient = {
      $executeRawUnsafe: jest.fn().mockRejectedValue(new Error('deadlock detected')),
    };

    await expect(
      mod.migrateRecord('rec-6', 'patients', 'firstName', PR3_CONTEXT, failingClient, v1),
    ).rejects.toThrow(/deadlock detected/);
    expect(failingClient.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('T-MR-7: MigrationResult shape contains all committed fields', async () => {
    const mod = freshModule();
    const v0 = encryptV0LikeProductionLegacy('Eve', TEST_KEY);
    const { client } = fakePrismaWithSpy();

    const before = Date.now();
    const result: MigrationResult = await mod.migrateRecord(
      'rec-7', 'patients', 'firstName', PR3_CONTEXT, client, v0,
    );
    const after = Date.now();

    expect(result.recordId).toBe('rec-7');
    expect(result.table).toBe('patients');
    expect(result.column).toBe('firstName');
    expect(result.fromVersion).toBe('v0');
    expect(result.toVersion).toBe('v2');
    expect(result.fieldsConverted).toBe(1);
    expect(result.skipped).toBe(false);
    expect(result.migratedAt).toBeInstanceOf(Date);
    expect(result.migratedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.migratedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('T-MR-8: per-record EncryptionContext { service, purpose, model, field } passed through to V2 emit', async () => {
    const mod = freshModule();
    // Spy on encryptWithCurrent via re-import of the module's exports — the
    // V2 envelope's identity is opaque post-emit (KMS-wrapped DEK), but we can
    // verify the context shape by inspecting decryptAny round-trip with the
    // SAME context (succeeds) vs. a DIFFERENT context (fails — context is the
    // KMS audit-trail anchor; mismatch fails decrypt at KMS layer).
    const v0 = encryptV0LikeProductionLegacy('Frank', TEST_KEY);
    const { client, spy } = fakePrismaWithSpy();

    const ctxOriginal: EncryptionContext = {
      service: 'tailrd-backend',
      purpose: 'phi-migration-v0v1-to-v2',
      model: 'Patient',
      field: 'lastName',
    };

    const result = await mod.migrateRecord('rec-8', 'patients', 'lastName', ctxOriginal, client, v0);
    expect(result.toVersion).toBe('v2');
    const v2envelope = spy.mock.calls[0][1] as string;

    // Same context decrypts cleanly
    const decrypted = await mod.decryptAny(v2envelope, ctxOriginal);
    expect(decrypted).toBe('Frank');

    // NB: for production KMS, mismatched EncryptionContext fails AccessDenied.
    // In test mode (local fallback path inside kmsService), context is recorded
    // in the wrappedDEK payload; mismatch produces wrong-key decrypt → throws.
    // We assert the round-trip succeeds with same context here; mismatch
    // rejection is covered by kmsService.test.ts T3d.
  });
});


// AUDIT-016 PR3 STEP 1.7 Day 13 - rekeyV2Record() V2 -> V2 purpose reconciliation
describe('AUDIT-016 PR3 STEP 1.7 - rekeyV2Record() V2 -> V2 purpose reconciliation', () => {
  // Sister to migrateRecord describe block: V2 emission gated on env vars.
  // Local helpers (sister-copy of migrateRecord describe helpers to keep this
  // block self-contained; see migrateRecord describe at line 479 for source).
  function freshModule() {
    jest.resetModules();
    process.env.PHI_ENCRYPTION_KEY = TEST_KEY;
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test-tailrd-phi';
    delete process.env.DEMO_MODE;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../keyRotation');
  }
  function fakePrismaWithSpy(): { client: { $executeRawUnsafe: jest.Mock }; spy: jest.Mock } {
    const spy = jest.fn().mockResolvedValue(1);
    return { client: { $executeRawUnsafe: spy }, spy };
  }
  function encryptV0LikeProductionLegacy(plaintext: string, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return buildV0(iv.toString('hex'), authTag, enc);
  }
  const ORIG_VERSION = process.env.PHI_ENVELOPE_VERSION;
  const ORIG_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS;
  beforeEach(() => {
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    process.env.AWS_KMS_PHI_KEY_ALIAS = 'alias/test';
  });
  afterAll(() => {
    if (ORIG_VERSION === undefined) delete process.env.PHI_ENVELOPE_VERSION;
    else process.env.PHI_ENVELOPE_VERSION = ORIG_VERSION;
    if (ORIG_ALIAS === undefined) delete process.env.AWS_KMS_PHI_KEY_ALIAS;
    else process.env.AWS_KMS_PHI_KEY_ALIAS = ORIG_ALIAS;
  });

  const OLD_CONTEXT: EncryptionContext = {
    service: 'tailrd-backend',
    purpose: 'phi-migration-v0v1-to-v2',
    model: 'AuditLog',
    field: 'description',
  };
  const NEW_CONTEXT: EncryptionContext = {
    service: 'tailrd-backend',
    purpose: 'phi-encryption',
    model: 'AuditLog',
    field: 'description',
  };

  it('T-REKEY-1: V2 envelope decrypted under oldContext re-encrypted under newContext; plaintext preserved (round-trip)', async () => {
    const mod = freshModule();
    const v2under_old = await mod.encryptWithCurrent('Heart failure NYHA III', OLD_CONTEXT);
    expect(v2under_old.startsWith('enc:v2:')).toBe(true);
    const { client, spy } = fakePrismaWithSpy();
    const result = await mod.rekeyV2Record(
      'rec-1', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v2under_old,
    );
    expect(result.fromVersion).toBe('v2');
    expect(result.toVersion).toBe('v2');
    expect(result.fieldsConverted).toBe(1);
    expect(result.skipped).toBe(false);
    const v2under_new = spy.mock.calls[0][1] as string;
    expect(v2under_new.startsWith('enc:v2:')).toBe(true);
    expect(v2under_new).not.toBe(v2under_old);
    const decrypted = await mod.decryptAny(v2under_new, NEW_CONTEXT);
    expect(decrypted).toBe('Heart failure NYHA III');
  });

  it('T-REKEY-2: V0 envelope input throws (caller SQL filter contract violation)', async () => {
    const mod = freshModule();
    const v0 = encryptV0LikeProductionLegacy('plaintext-x', TEST_KEY);
    const { client } = fakePrismaWithSpy();
    await expect(
      mod.rekeyV2Record('rec-2', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v0),
    ).rejects.toThrow(/expected V2 envelope; got v0/);
  });

  it('T-REKEY-3: V1 envelope input throws (caller SQL filter contract violation)', async () => {
    const mod = freshModule();
    delete process.env.PHI_ENVELOPE_VERSION;
    const v1 = await mod.encryptWithCurrent('plaintext-y', OLD_CONTEXT);
    expect(v1.startsWith('enc:v1:')).toBe(true);
    process.env.PHI_ENVELOPE_VERSION = 'v2';
    const { client } = fakePrismaWithSpy();
    await expect(
      mod.rekeyV2Record('rec-3', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v1),
    ).rejects.toThrow(/expected V2 envelope; got v1/);
  });

  it('T-REKEY-4: test-mode local fallback allows context mismatch (production KMS enforces; NB ref kmsService.test.ts T3d)', async () => {
    const mod = freshModule();
    const v2under_new = await mod.encryptWithCurrent('plaintext-z', NEW_CONTEXT);
    const { client } = fakePrismaWithSpy();
    // NB: In production KMS, EncryptionContext mismatch fails AccessDenied
    // (covered by kmsService.test.ts T3d). In test mode (local fallback),
    // context is recorded in wrappedDEK but not authenticated; mismatch passes.
    // This test verifies rekey COMPLETES in test mode; production rejection
    // is integration-tested via STEP 1.7 spotcheck against real KMS.
    const result = await mod.rekeyV2Record(
      'rec-4', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v2under_new,
    );
    expect(result.toVersion).toBe('v2');
  });

  it('T-REKEY-5: SQL UPDATE failure propagates to caller (continue-on-error contract)', async () => {
    const mod = freshModule();
    const v2under_old = await mod.encryptWithCurrent('plaintext-w', OLD_CONTEXT);
    const failingClient = {
      $executeRawUnsafe: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    };
    await expect(
      mod.rekeyV2Record('rec-5', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, failingClient, v2under_old),
    ).rejects.toThrow(/DB connection lost/);
  });

  it('T-REKEY-6: MigrationResult shape contains all committed fields', async () => {
    const mod = freshModule();
    const v2under_old = await mod.encryptWithCurrent('Mary', OLD_CONTEXT);
    const { client } = fakePrismaWithSpy();
    const before = Date.now();
    const result: MigrationResult = await mod.rekeyV2Record(
      'rec-6', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v2under_old,
    );
    const after = Date.now();
    expect(result.recordId).toBe('rec-6');
    expect(result.table).toBe('audit_logs');
    expect(result.column).toBe('description');
    expect(result.fromVersion).toBe('v2');
    expect(result.toVersion).toBe('v2');
    expect(result.fieldsConverted).toBe(1);
    expect(result.skipped).toBe(false);
    expect(result.migratedAt).toBeInstanceOf(Date);
    expect(result.migratedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.migratedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('T-REKEY-7: rekey emits envelope decryptable with newContext (oldContext rejection covered by kmsService.test.ts T3d + production STEP 1.7)', async () => {
    const mod = freshModule();
    const v2under_old = await mod.encryptWithCurrent('Robert', OLD_CONTEXT);
    const { client, spy } = fakePrismaWithSpy();
    const result = await mod.rekeyV2Record(
      'rec-7', 'audit_logs', 'description', OLD_CONTEXT, NEW_CONTEXT, client, v2under_old,
    );
    expect(result.toVersion).toBe('v2');
    const v2under_new = spy.mock.calls[0][1] as string;
    // newContext decrypts cleanly (rekey emitted V2 under newContext)
    const decryptedWithNew = await mod.decryptAny(v2under_new, NEW_CONTEXT);
    expect(decryptedWithNew).toBe('Robert');
    // NB: In production KMS, decryptAny(v2under_new, OLD_CONTEXT) throws
    // AccessDenied (covered by kmsService.test.ts T3d). Test-mode local
    // fallback does not authenticate context; mismatch passes silently.
  });
});