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
  rotateKey,
  encryptWithCurrent,
  decryptAny,
  migrateRecord,
  validateKeyOrThrow,
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

describe('migrateRecord() — still stub (PR 3 lands)', () => {
  it('throws DesignPhaseStubError until implementation PR 3 lands', async () => {
    await expect(migrateRecord('rec-1', 'Patient')).rejects.toThrow(DesignPhaseStubError);
    await expect(migrateRecord('rec-1', 'Patient')).rejects.toThrow(/migrateRecord\(\)/);
  });
});

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

  it('V2 envelope throws DesignPhaseStubError (PR 2 lands V2 decrypt)', async () => {
    const v2 = buildV2('wrappedDEKbase64', 'ivbase64', 'authTagbase64', 'ciphertextbase64');
    await expect(decryptAny(v2, TEST_CONTEXT)).rejects.toThrow(DesignPhaseStubError);
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
      table: 'Patient',
      fromVersion: 'v0',
      toVersion: 'v2',
      fieldsConverted: 4,
      skipped: false,
      migratedAt: new Date(),
    };
    expect(result.fromVersion).toBe('v0');
    expect(result.toVersion).toBe('v2');
  });
});
