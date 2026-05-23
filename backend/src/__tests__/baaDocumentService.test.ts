/**
 * baaDocumentService (5-ADM-09 P1.3.3c IMPLEMENT-2B) uploadSignedBaaDocument
 * + getSignedBaaDocument unit tests.
 *
 * Covers:
 *   - uploadSignedBaaDocument: RBAC + input validation + Hospital to CE
 *     traversal + tenant-scope + KMS envelope-encrypt + S3 PutObject +
 *     Hospital row update + SIGNED_BAA_UPLOADED audit emission. Error paths:
 *     KMS encrypt failure / S3 put failure / Hospital update orphan path.
 *   - getSignedBaaDocument: RBAC + Hospital to CE traversal + tenant-scope +
 *     missing-document path + S3 GetObject + envelope parse + version check +
 *     KMS envelope-decrypt + SIGNED_BAA_RETRIEVED audit emission. Error paths:
 *     S3 get / envelope parse / version / KMS decrypt failures.
 *
 * Locked Q-decision provenance:
 *   Q-5ADM-D signed-BAA discipline (per-hospital KMS encryption context;
 *   AUDIT-016 PR 2 D2 tamper evidence). Q-5ADM-M Path A per-service-file
 *   test suite (file 2 of 3). Q-5ADM-T Path A 5-block decomposition.
 *
 * Sister-precedent: IMPLEMENT-2A coveredEntityBaaExecution.test.ts pattern
 * (jest.fn closures + jest.mock module pattern + inline actor() factory +
 * structured-error toBeInstanceOf assertions + audit-payload calls.find()
 * + describe-block organization).
 *
 * V.5-RECOVERY catches surfaced at PAUSE A.IMPLEMENT-2B (brief authoring-spec
 * vs running code at commit 81dbea4):
 *   - catch #14: brief said "ENVELOPE_ENCRYPT_FAILED" code; running code
 *     uses "KMS_ENVELOPE_ENCRYPT_FAILED".
 *   - catch #15: brief said "S3_PUT_FAILED" code; running code uses
 *     "S3_PUT_OBJECT_FAILED".
 *   - catch #16: brief said "S3_GET_FAILED" code; running code uses
 *     "S3_GET_OBJECT_FAILED".
 *   - catch #17: brief said "KMS_DECRYPT_FAILED" code; running code uses
 *     "KMS_ENVELOPE_DECRYPT_FAILED".
 *   - catch #18: brief omitted "ENVELOPE_PARSE_FAILED" and
 *     "ENVELOPE_VERSION_UNSUPPORTED" retrieval-path codes; running code
 *     emits both. Tests cover both.
 *
 * Synthetic-data discipline: all PDF byte fixtures are obviously-synthetic
 * Buffer.from(string) constructions. Zero realistic PDF content. Audit-payload
 * assertions never include decoded PDF bytes (PHI discipline; CLAUDE.md
 * NEVER DO §14 PHI logging ban).
 */

// === Mocks ===

const hospitalFindUnique = jest.fn();
const hospitalUpdate = jest.fn();
const kmsEnvelopeEncrypt = jest.fn();
const kmsEnvelopeDecrypt = jest.fn();
const s3Send = jest.fn();
const writeAuditLog = jest.fn().mockResolvedValue(undefined);
const auditLoggerInfo = jest.fn();
const auditLoggerWarn = jest.fn();
const auditLoggerError = jest.fn();

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    hospital: {
      findUnique: (...args: unknown[]) => hospitalFindUnique(...args),
      update: (...args: unknown[]) => hospitalUpdate(...args),
    },
  },
}));

jest.mock('../middleware/auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: {
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
    error: (...args: unknown[]) => auditLoggerError(...args),
  },
}));

jest.mock('../services/kmsService', () => ({
  kmsService: {
    envelopeEncrypt: (...args: unknown[]) => kmsEnvelopeEncrypt(...args),
    envelopeDecrypt: (...args: unknown[]) => kmsEnvelopeDecrypt(...args),
  },
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => s3Send(...args),
  })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({
    commandType: 'PutObject',
    input,
  })),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({
    commandType: 'GetObject',
    input,
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  uploadSignedBaaDocument,
  getSignedBaaDocument,
  SignedBaaUploadError,
  BaaDocumentServiceError,
} from '../services/baaDocumentService';
import {
  CoveredEntityValidationError,
  TenantScopeViolationError,
  CoveredEntityAccessDeniedError,
  type AuthenticatedActor,
} from '../services/coveredEntityService';

// === Helpers ===

const TENANT_A = 'tenant-test-a';
const TENANT_B = 'tenant-test-b';
const CE_ID = 'ce-test-1';
const HOSPITAL_1 = 'h-test-1';
const USER_ID = 'user-test-1';

const SYNTHETIC_PDF_BYTES = Buffer.from('synthetic-pdf-content-payload');

function actor(
  role: AuthenticatedActor['role'],
  hospitalId: string = TENANT_A,
): AuthenticatedActor {
  return { userId: USER_ID, email: 'test@example.test', role, hospitalId };
}

function fakeHospitalLink(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: HOSPITAL_1,
    coveredEntityId: CE_ID,
    signedBaaS3Key: null,
    signedBaaUploadedAt: null,
    coveredEntity: { tenantId: TENANT_A },
    ...overrides,
  };
}

function fakeEnvelopeResult(): {
  ciphertext: string;
  encryptedDataKey: string;
  iv: string;
  authTag: string;
} {
  return {
    ciphertext: 'synthetic-ciphertext-base64',
    encryptedDataKey: 'synthetic-edk-base64',
    iv: 'synthetic-iv-base64',
    authTag: 'synthetic-authtag-base64',
  };
}

function fakeEnvelopeJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: '1',
    ciphertext: 'synthetic-ciphertext-base64',
    encryptedDataKey: 'synthetic-edk-base64',
    iv: 'synthetic-iv-base64',
    authTag: 'synthetic-authtag-base64',
    originalContentType: 'application/pdf',
    uploadedBy: USER_ID,
    uploadedAt: '2026-05-10T00:00:00.000Z',
    ...overrides,
  });
}

function mockS3GetSuccess(envelopeJson: string): void {
  s3Send.mockResolvedValueOnce({
    Body: {
      transformToString: jest.fn().mockResolvedValue(envelopeJson),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// === uploadSignedBaaDocument ===

describe('uploadSignedBaaDocument', () => {
  describe('happy path', () => {
    it('encrypts + uploads + persists + emits SIGNED_BAA_UPLOADED audit', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"synthetic-etag-abc"' });
      hospitalUpdate.mockResolvedValue(undefined);

      const result = await uploadSignedBaaDocument(
        { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
        actor('HOSPITAL_ADMIN'),
      );

      expect(result.s3Key).toMatch(/^signed-baa\/h-test-1\/.*\.envelope\.json$/);
      expect(result.uploadedAt).toBeInstanceOf(Date);
      expect(kmsEnvelopeEncrypt).toHaveBeenCalledTimes(1);
      expect(s3Send).toHaveBeenCalledTimes(1);
      expect(hospitalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: HOSPITAL_1 },
          data: expect.objectContaining({
            signedBaaS3Key: result.s3Key,
            signedBaaUploadedAt: result.uploadedAt,
          }),
        }),
      );
      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'SIGNED_BAA_UPLOADED',
          resourceType: 'Hospital',
          resourceId: HOSPITAL_1,
        }),
      );
    });

    it('passes per-hospital KMS encryption context binding ciphertext to hospitalId', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"x"' });
      hospitalUpdate.mockResolvedValue(undefined);

      await uploadSignedBaaDocument(
        { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
        actor('HOSPITAL_ADMIN'),
      );

      expect(kmsEnvelopeEncrypt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          service: 'tailrd-backend',
          purpose: 'signed-baa-document',
          model: 'Hospital',
          field: HOSPITAL_1,
        }),
      );
    });

    it('writes envelope JSON to PHI bucket with HIPAA tagging metadata', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"x"' });
      hospitalUpdate.mockResolvedValue(undefined);

      await uploadSignedBaaDocument(
        { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
        actor('HOSPITAL_ADMIN'),
      );

      const putCommand = s3Send.mock.calls[0][0] as {
        commandType: string;
        input: Record<string, unknown>;
      };
      expect(putCommand.commandType).toBe('PutObject');
      expect(putCommand.input.ContentType).toBe('application/json');
      expect(putCommand.input.Tagging).toContain('hipaa=true');
      expect(putCommand.input.Tagging).toContain(`hospitalId=${HOSPITAL_1}`);
      const metadata = putCommand.input.Metadata as Record<string, string>;
      expect(metadata['x-tailrd-hospital-id']).toBe(HOSPITAL_1);
      expect(metadata['x-tailrd-envelope-version']).toBe('1');
    });

    it('audit emission excludes pdfBytes (PHI discipline) and includes pdfSizeBytes metadata only', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"synthetic-etag"' });
      hospitalUpdate.mockResolvedValue(undefined);

      await uploadSignedBaaDocument(
        { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
        actor('HOSPITAL_ADMIN'),
      );

      const payload = auditLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('pdfBytes');
      expect(payload).not.toHaveProperty('pdfBuffer');
      expect(payload).not.toHaveProperty('base64Pdf');
      expect(payload).not.toHaveProperty('plaintext');
      expect(payload.pdfSizeBytes).toBe(SYNTHETIC_PDF_BYTES.length);
      expect(payload.s3ETag).toBe('"synthetic-etag"');
      expect(payload.envelopeVersion).toBe('1');
    });
  });

  describe('authorization', () => {
    it('rejects PHYSICIAN role with CoveredEntityAccessDeniedError', async () => {
      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('PHYSICIAN' as AuthenticatedActor['role']),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('rejects QUALITY_DIRECTOR role (no read-only tier for BAA documents)', async () => {
      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('QUALITY_DIRECTOR' as AuthenticatedActor['role']),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('emits no audit and makes no S3 call when access denied', async () => {
      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('PHYSICIAN' as AuthenticatedActor['role']),
        ),
      ).rejects.toThrow();
      expect(s3Send).not.toHaveBeenCalled();
      expect(kmsEnvelopeEncrypt).not.toHaveBeenCalled();
      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('rejects empty pdfBytes with SignedBaaUploadError code INVALID_INPUT', async () => {
      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: Buffer.alloc(0) },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('INVALID_INPUT');
    });

    it('rejects pdfBytes exceeding 25MB ceiling with SignedBaaUploadError code PDF_TOO_LARGE', async () => {
      const oversize = Buffer.alloc(25 * 1024 * 1024 + 1);
      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: oversize },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('PDF_TOO_LARGE');
      expect(s3Send).not.toHaveBeenCalled();
    });
  });

  describe('Hospital + CoveredEntity traversal', () => {
    it('rejects when Hospital not found with CoveredEntityValidationError', async () => {
      hospitalFindUnique.mockResolvedValue(null);

      await expect(
        uploadSignedBaaDocument(
          { hospitalId: 'h-missing', pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityValidationError);
    });

    it('rejects when Hospital has no linked CoveredEntity with CoveredEntityValidationError', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ coveredEntityId: null, coveredEntity: null }),
      );

      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityValidationError);
    });
  });

  describe('tenant scope', () => {
    it('rejects cross-tenant upload with TenantScopeViolationError', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ coveredEntity: { tenantId: TENANT_A } }),
      );

      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN', TENANT_B),
        ),
      ).rejects.toBeInstanceOf(TenantScopeViolationError);
      expect(kmsEnvelopeEncrypt).not.toHaveBeenCalled();
      expect(s3Send).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN bypasses tenant scope and proceeds', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"x"' });
      hospitalUpdate.mockResolvedValue(undefined);

      await expect(
        uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('SUPER_ADMIN', TENANT_B),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('failure paths', () => {
    it('wraps KMS envelope-encrypt failure with SignedBaaUploadError code KMS_ENVELOPE_ENCRYPT_FAILED', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockRejectedValue(new Error('simulated KMS failure'));

      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('KMS_ENVELOPE_ENCRYPT_FAILED');
      expect(s3Send).not.toHaveBeenCalled();
      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('wraps S3 PutObject failure with SignedBaaUploadError code S3_PUT_OBJECT_FAILED', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockRejectedValue(new Error('simulated S3 PutObject failure'));

      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('S3_PUT_OBJECT_FAILED');
      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('wraps Hospital row update failure with SignedBaaUploadError code HOSPITAL_UPDATE_FAILED + suppresses audit', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      kmsEnvelopeEncrypt.mockResolvedValue(fakeEnvelopeResult());
      s3Send.mockResolvedValue({ ETag: '"x"' });
      hospitalUpdate.mockRejectedValue(new Error('simulated Hospital update failure'));

      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('HOSPITAL_UPDATE_FAILED');
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('preserves underlying cause on KMS encrypt failure for forensic triage', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospitalLink());
      const underlying = new Error('underlying KMS access denied');
      kmsEnvelopeEncrypt.mockRejectedValue(underlying);

      let caught: unknown;
      try {
        await uploadSignedBaaDocument(
          { hospitalId: HOSPITAL_1, pdfBytes: SYNTHETIC_PDF_BYTES },
          actor('HOSPITAL_ADMIN'),
        );
      } catch (error) {
        caught = error;
      }
      expect((caught as SignedBaaUploadError).cause).toBe(underlying);
    });
  });
});

// === getSignedBaaDocument ===

describe('getSignedBaaDocument', () => {
  describe('happy path', () => {
    it('retrieves + decrypts + base64-decodes + emits SIGNED_BAA_RETRIEVED audit', async () => {
      const uploadedAt = new Date('2026-05-10T00:00:00.000Z');
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({
          signedBaaS3Key: 'signed-baa/h-test-1/2026-05-10.envelope.json',
          signedBaaUploadedAt: uploadedAt,
        }),
      );
      mockS3GetSuccess(fakeEnvelopeJson());
      const plaintextBase64 = Buffer.from('synthetic-pdf-decrypted').toString('base64');
      kmsEnvelopeDecrypt.mockResolvedValue(plaintextBase64);

      const result = await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('synthetic-pdf-decrypted');
      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'SIGNED_BAA_RETRIEVED',
          resourceType: 'Hospital',
          resourceId: HOSPITAL_1,
        }),
      );
    });

    it('passes per-hospital KMS decryption context matching upload-time context', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      mockS3GetSuccess(fakeEnvelopeJson());
      kmsEnvelopeDecrypt.mockResolvedValue(Buffer.from('x').toString('base64'));

      await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));

      expect(kmsEnvelopeDecrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          ciphertext: 'synthetic-ciphertext-base64',
          encryptedDataKey: 'synthetic-edk-base64',
          iv: 'synthetic-iv-base64',
          authTag: 'synthetic-authtag-base64',
        }),
        expect.objectContaining({
          service: 'tailrd-backend',
          purpose: 'signed-baa-document',
          model: 'Hospital',
          field: HOSPITAL_1,
        }),
      );
    });

    it('audit emission excludes decrypted bytes (PHI discipline) and includes metadata only', async () => {
      const uploadedAt = new Date('2026-05-10T00:00:00.000Z');
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({
          signedBaaS3Key: 'signed-baa/h-test-1/key.json',
          signedBaaUploadedAt: uploadedAt,
        }),
      );
      mockS3GetSuccess(fakeEnvelopeJson());
      const plaintextBase64 = Buffer.from('synthetic-decrypted-pdf-payload').toString('base64');
      kmsEnvelopeDecrypt.mockResolvedValue(plaintextBase64);

      await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));

      const payload = auditLoggerInfo.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('pdfBytes');
      expect(payload).not.toHaveProperty('pdfBuffer');
      expect(payload).not.toHaveProperty('base64Pdf');
      expect(payload).not.toHaveProperty('plaintext');
      expect(payload).not.toHaveProperty('decrypted');
      expect(payload.pdfSizeBytes).toBe(
        Buffer.from('synthetic-decrypted-pdf-payload').length,
      );
      expect(payload.signedBaaUploadedAt).toBe(uploadedAt.toISOString());
    });
  });

  describe('authorization', () => {
    it('rejects PHYSICIAN role with CoveredEntityAccessDeniedError', async () => {
      await expect(
        getSignedBaaDocument(HOSPITAL_1, actor('PHYSICIAN' as AuthenticatedActor['role'])),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('rejects QUALITY_DIRECTOR role with CoveredEntityAccessDeniedError', async () => {
      await expect(
        getSignedBaaDocument(
          HOSPITAL_1,
          actor('QUALITY_DIRECTOR' as AuthenticatedActor['role']),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('emits no audit and makes no S3 call when access denied', async () => {
      await expect(
        getSignedBaaDocument(HOSPITAL_1, actor('PHYSICIAN' as AuthenticatedActor['role'])),
      ).rejects.toThrow();
      expect(s3Send).not.toHaveBeenCalled();
      expect(kmsEnvelopeDecrypt).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });
  });

  describe('Hospital + CoveredEntity traversal', () => {
    it('rejects when Hospital not found with CoveredEntityValidationError', async () => {
      hospitalFindUnique.mockResolvedValue(null);

      await expect(
        getSignedBaaDocument('h-missing', actor('HOSPITAL_ADMIN')),
      ).rejects.toBeInstanceOf(CoveredEntityValidationError);
    });

    it('rejects when Hospital has no linked CoveredEntity with CoveredEntityValidationError', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ coveredEntityId: null, coveredEntity: null }),
      );

      await expect(
        getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN')),
      ).rejects.toBeInstanceOf(CoveredEntityValidationError);
    });
  });

  describe('tenant scope', () => {
    it('rejects cross-tenant retrieval with TenantScopeViolationError', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({
          signedBaaS3Key: 'signed-baa/h-test-1/key.json',
          coveredEntity: { tenantId: TENANT_A },
        }),
      );

      await expect(
        getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN', TENANT_B)),
      ).rejects.toBeInstanceOf(TenantScopeViolationError);
      expect(s3Send).not.toHaveBeenCalled();
      expect(kmsEnvelopeDecrypt).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN bypasses tenant scope and proceeds', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      mockS3GetSuccess(fakeEnvelopeJson());
      kmsEnvelopeDecrypt.mockResolvedValue(Buffer.from('x').toString('base64'));

      await expect(
        getSignedBaaDocument(HOSPITAL_1, actor('SUPER_ADMIN', TENANT_B)),
      ).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('missing document', () => {
    it('rejects with SignedBaaUploadError code NO_DOCUMENT_ON_FILE when signedBaaS3Key is null', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: null }),
      );

      let caught: unknown;
      try {
        await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('NO_DOCUMENT_ON_FILE');
      expect(s3Send).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });
  });

  describe('failure paths', () => {
    it('wraps S3 GetObject failure with SignedBaaUploadError code S3_GET_OBJECT_FAILED', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      s3Send.mockRejectedValue(new Error('simulated S3 GetObject failure'));

      let caught: unknown;
      try {
        await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('S3_GET_OBJECT_FAILED');
      expect(kmsEnvelopeDecrypt).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('wraps envelope JSON parse failure with SignedBaaUploadError code ENVELOPE_PARSE_FAILED', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      mockS3GetSuccess('not-valid-json{');

      let caught: unknown;
      try {
        await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('ENVELOPE_PARSE_FAILED');
      expect(kmsEnvelopeDecrypt).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('wraps envelope version mismatch with SignedBaaUploadError code ENVELOPE_VERSION_UNSUPPORTED', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      mockS3GetSuccess(fakeEnvelopeJson({ version: '2' }));

      let caught: unknown;
      try {
        await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('ENVELOPE_VERSION_UNSUPPORTED');
      expect(kmsEnvelopeDecrypt).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('wraps KMS envelope-decrypt failure with SignedBaaUploadError code KMS_ENVELOPE_DECRYPT_FAILED (tamper detection)', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospitalLink({ signedBaaS3Key: 'signed-baa/h-test-1/key.json' }),
      );
      mockS3GetSuccess(fakeEnvelopeJson());
      kmsEnvelopeDecrypt.mockRejectedValue(
        new Error('simulated KMS AccessDeniedException (context mismatch)'),
      );

      let caught: unknown;
      try {
        await getSignedBaaDocument(HOSPITAL_1, actor('HOSPITAL_ADMIN'));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(SignedBaaUploadError);
      expect((caught as SignedBaaUploadError).code).toBe('KMS_ENVELOPE_DECRYPT_FAILED');
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });
  });
});

// === Structured-error invariants ===

describe('SignedBaaUploadError structured-error invariants', () => {
  it('extends BaaDocumentServiceError base for type narrowing', () => {
    const err = new SignedBaaUploadError('TEST_CODE', 'test message');
    expect(err).toBeInstanceOf(BaaDocumentServiceError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TEST_CODE');
  });

  it('preserves cause field for forensic triage', () => {
    const underlying = new Error('underlying');
    const err = new SignedBaaUploadError('TEST_CODE', 'test', underlying);
    expect(err.cause).toBe(underlying);
  });
});
