/**
 * keyRotation.ts — DESIGN PHASE STUB tests.
 *
 * AUDIT-016 PHI key rotation: design phase ships interface stubs only.
 * All exported functions throw `DesignPhaseStubError`. These tests assert
 * stub-throws-correctly behavior + envelope schema type assertions.
 *
 * Implementation tests will replace these stubs in 3 follow-up PRs per
 * docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md §10.
 */

import {
  DesignPhaseStubError,
  rotateKey,
  encryptWithCurrent,
  decryptAny,
  migrateRecord,
  EncryptionContext,
  EnvelopeV0,
  EnvelopeV1,
  KeyVersion,
  MigrationResult,
} from '../keyRotation';

const TEST_CONTEXT: EncryptionContext = {
  service: 'tailrd-backend',
  purpose: 'phi-encryption',
};

describe('keyRotation — DESIGN PHASE STUBS (AUDIT-016)', () => {
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

  describe('rotateKey() — stub', () => {
    it('throws DesignPhaseStubError until implementation PR 2 lands', async () => {
      await expect(rotateKey()).rejects.toThrow(DesignPhaseStubError);
      await expect(rotateKey()).rejects.toThrow(/rotateKey\(\)/);
    });
  });

  describe('encryptWithCurrent() — stub', () => {
    it('throws DesignPhaseStubError until implementation PR 1 lands', async () => {
      await expect(encryptWithCurrent('test', TEST_CONTEXT)).rejects.toThrow(DesignPhaseStubError);
      await expect(encryptWithCurrent('test', TEST_CONTEXT)).rejects.toThrow(/encryptWithCurrent\(\)/);
    });
  });

  describe('decryptAny() — stub', () => {
    it('throws DesignPhaseStubError until implementation PR 1 lands', async () => {
      await expect(decryptAny('enc:abc:def:ghi', TEST_CONTEXT)).rejects.toThrow(DesignPhaseStubError);
      await expect(decryptAny('enc:abc:def:ghi', TEST_CONTEXT)).rejects.toThrow(/decryptAny\(\)/);
    });
  });

  describe('migrateRecord() — stub', () => {
    it('throws DesignPhaseStubError until implementation PR 3 lands', async () => {
      await expect(migrateRecord('rec-1', 'Patient')).rejects.toThrow(DesignPhaseStubError);
      await expect(migrateRecord('rec-1', 'Patient')).rejects.toThrow(/migrateRecord\(\)/);
    });
  });

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
      expect(v0.authTag).toBe('eeff0011');
      expect(v0.ciphertext).toBe('22334455');
    });
    it('EnvelopeV1 has 5 readonly fields: version, wrappedDEK, iv, authTag, ciphertext', () => {
      const v1: EnvelopeV1 = {
        version: 'v1',
        wrappedDEK: 'wrappedKeyBase64',
        iv: 'ivBase64',
        authTag: 'authTagBase64',
        ciphertext: 'ciphertextBase64',
      };
      expect(v1.version).toBe('v1');
      expect(v1.wrappedDEK).toBe('wrappedKeyBase64');
    });
    it('KeyVersion accepts v0 and v1 only (compile-time check)', () => {
      const versions: KeyVersion[] = ['v0', 'v1'];
      expect(versions).toContain('v0');
      expect(versions).toContain('v1');
    });
    it('EncryptionContext has required service + purpose; optional model + field', () => {
      const minimal: EncryptionContext = { service: 'a', purpose: 'b' };
      const full: EncryptionContext = { service: 'a', purpose: 'b', model: 'Patient', field: 'mrn' };
      expect(minimal.service).toBe('a');
      expect(full.model).toBe('Patient');
      expect(full.field).toBe('mrn');
    });
    it('MigrationResult schema captures conversion outcome', () => {
      const result: MigrationResult = {
        recordId: 'rec-1',
        table: 'Patient',
        fromVersion: 'v0',
        toVersion: 'v1',
        fieldsConverted: 4,
        skipped: false,
        migratedAt: new Date(),
      };
      expect(result.fromVersion).toBe('v0');
      expect(result.toVersion).toBe('v1');
      expect(result.fieldsConverted).toBe(4);
      expect(result.skipped).toBe(false);
    });
  });
});
