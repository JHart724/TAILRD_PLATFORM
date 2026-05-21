/**
 * baaDocumentService - signed-BAA PDF upload + retrieval with KMS envelope
 * encryption and S3 storage.
 *
 * 5-ADM-09 P1.3.3b sub-phase 3 of 3 (IMPLEMENT-3). Sister-precedent
 * coveredEntityService.ts F1 + F2 (Hospital cache propagation + CE-level
 * BAA execution upsert). Per Q-5ADM-D signed-BAA-document discipline +
 * D9 client-side envelope encryption + AUDIT-016 v2 envelope tamper-evidence.
 *
 * Architecture (D9, PAUSE 2 from prior session):
 *   1. Caller supplies raw PDF Buffer + hospitalId
 *   2. Service base64-encodes PDF and calls kmsService.envelopeEncrypt with a
 *      per-hospital KmsEncryptionContext (binds ciphertext to specific hospital
 *      so KMS rejects cross-hospital decrypts; AUDIT-016 PR 2 D2 tamper-evidence)
 *   3. The envelope-encrypted result (ciphertext + encryptedDataKey + iv +
 *      authTag) is serialized as JSON with sidecar metadata (originalContentType,
 *      uploadedBy, uploadedAt) and PutObject-ed to the PHI bucket
 *   4. S3 SSE-KMS layered on top (defense-in-depth; the envelope JSON itself
 *      gets re-encrypted at-rest by S3 server-side KMS)
 *   5. Hospital.signedBaaS3Key + Hospital.signedBaaUploadedAt updated with the
 *      uploaded key + timestamp (P1.3.3a schema fields)
 *   6. HIPAA_GRADE SIGNED_BAA_UPLOADED audit emission
 *
 * Retrieval is the inverse: GetObject -> parse JSON envelope ->
 * kmsService.envelopeDecrypt with identical KmsEncryptionContext (KMS rejects
 * on mismatch) -> base64-decode -> return Buffer + SIGNED_BAA_RETRIEVED audit.
 *
 * Tenant-isolation discipline (Q-5BRC-G + AUDIT-011 Layer 3):
 *   Hospital.coveredEntityId -> CoveredEntity.tenantId is traversed once at the
 *   top of each operation; assertTenantScope rejects cross-tenant access.
 *   Hospital with no linked CoveredEntity cannot have a signed BAA per HIPAA
 *   §164.308(b)(1) (BAA is between Business Associate and Covered Entity).
 *
 * PHI-discipline (CLAUDE.md NEVER DO §14):
 *   - PDF bytes never logged in plaintext (no console output, no auditLogger
 *     payload field containing pdfBytes or decrypted content)
 *   - Audit emissions carry s3Key + s3ETag + uploadedAt metadata only
 *   - Hospital-scoped audit attribution (resourceType='Hospital') via inline
 *     auditLogger.info; emitAudit helper is CE-bound and not reused here
 *     (sister-precedent F1 divergence per coveredEntityService.ts:609-617)
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import prisma from '../lib/prisma';
import { auditLogger } from '../middleware/auditLogger';
import { kmsService, type KmsEncryptionContext } from './kmsService';
import {
  CoveredEntityValidationError,
  TenantScopeViolationError,
  CoveredEntityAccessDeniedError,
  type AuthenticatedActor,
} from './coveredEntityService';
import type { UserRole } from '../types';

// ─── Configuration ──────────────────────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }),
});

// Sister-precedent: s3Service.ts BUCKETS.phi (PHI bucket for HIPAA-relevant
// documents). BAA documents are PHI-adjacent (compliance artifact rather than
// patient PHI directly, but treated with PHI-grade protection per
// HIPAA §164.308(b)(1) audit-trail discipline).
const PHI_BUCKET =
  process.env.S3_PHI_BUCKET || 'tailrd-production-phi-documents';

// S3 SSE-KMS key for server-side encryption layered on top of client-side
// envelope encryption (defense-in-depth). Sister-precedent: s3Service.ts:48.
const S3_KMS_KEY_ID = process.env.AWS_KMS_S3_KEY_ID || '';

// Per-operation tenant-isolation enforcement. Sister-precedent
// coveredEntityService.ts:291 MANAGE_ROLES. Signed BAA documents are highly
// sensitive (the executed contract artifact); retrieval is restricted to the
// same set as upload (no QUALITY_DIRECTOR read-only access at this tier).
const MANAGE_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN'];

// PDF size ceiling. Sister-precedent: s3Service.ts FILE_CATEGORIES['clinical-report']
// is 50MB; patient-document is 25MB. BAA documents are typically <10MB; 25MB
// ceiling matches the conservative patient-document limit.
const MAX_PDF_BYTES = 25 * 1024 * 1024;

// ─── Structured errors ─────────────────────────────────────────────────────

/**
 * Base error class for baaDocumentService. Sister-precedent
 * coveredEntityService.ts:59 CoveredEntityServiceError pattern: service-specific
 * base + sub-classes with structured `code` field for forensic triage.
 */
export class BaaDocumentServiceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'BaaDocumentServiceError';
    this.code = code;
  }
}

/**
 * Thrown when signed-BAA upload or retrieval fails (KMS envelope failure,
 * S3 PutObject / GetObject failure, missing-document-on-retrieval, or any
 * transactional-intent rollback path).
 *
 * The `cause` field carries the underlying error for forensic triage without
 * exposing it in HTTP response bodies (routes surface a sanitized message).
 */
export class SignedBaaUploadError extends BaaDocumentServiceError {
  readonly cause?: Error;
  constructor(code: string, message: string, cause?: Error) {
    super(code, message);
    this.name = 'SignedBaaUploadError';
    this.cause = cause;
  }
}

// ─── Input types ───────────────────────────────────────────────────────────

export interface UploadSignedBaaDocumentInput {
  hospitalId: string;
  pdfBytes: Buffer;
  contentType?: string;
}

export interface UploadSignedBaaDocumentResult {
  s3Key: string;
  uploadedAt: Date;
}

// ─── Internal envelope wire format ─────────────────────────────────────────

/**
 * Wire format persisted to S3 as application/json. Wraps the
 * EnvelopeEncryptResult shape returned by kmsService.envelopeEncrypt with
 * sidecar metadata needed for retrieval (originalContentType for downstream
 * response Content-Type, uploadedBy + uploadedAt for forensic trail).
 *
 * `version` permits future format evolution without breaking historical
 * documents (e.g., V2 might switch to per-chunk envelope encryption for
 * documents >25MB). Current value is "1".
 */
interface SignedBaaEnvelope {
  version: '1';
  ciphertext: string;
  encryptedDataKey: string;
  iv: string;
  authTag: string;
  originalContentType: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ─── Authorization helpers ─────────────────────────────────────────────────

function assertCanManage(actor: AuthenticatedActor, operation: string): void {
  if (!MANAGE_ROLES.includes(actor.role)) {
    throw new CoveredEntityAccessDeniedError(actor.role, operation);
  }
}

function assertTenantScope(
  actor: AuthenticatedActor,
  resourceTenantId: string,
): void {
  if (actor.role === 'SUPER_ADMIN') return;
  if (actor.hospitalId !== resourceTenantId) {
    throw new TenantScopeViolationError(actor.hospitalId, resourceTenantId);
  }
}

/**
 * Build the per-hospital KmsEncryptionContext used for both encrypt and
 * decrypt. Identical context must be supplied at decrypt time or AWS KMS
 * rejects with AccessDeniedException (tamper evidence + cross-hospital
 * decrypt prevention per AUDIT-016 PR 2 D2).
 *
 * KmsEncryptionContext is fixed at { service, purpose, model?, field? }
 * (kmsService.ts:67). The `field` slot binds the ciphertext to a specific
 * hospitalId for per-record tamper evidence.
 */
function buildEncryptionContext(hospitalId: string): KmsEncryptionContext {
  return {
    service: 'tailrd-backend',
    purpose: 'signed-baa-document',
    model: 'Hospital',
    field: hospitalId,
  };
}

/**
 * Resolve the tenantId for a Hospital via the CoveredEntity link. A Hospital
 * with no linked CoveredEntity cannot have a signed BAA (HIPAA §164.308(b)(1)
 * BAA is between Business Associate and Covered Entity), so this also gates
 * out unlinked hospitals.
 *
 * Returns { tenantId, hospital } for downstream tenant-scope + signedBaaS3Key
 * inspection in a single round-trip.
 */
async function resolveHospitalTenantContext(
  client: PrismaClient | Prisma.TransactionClient,
  hospitalId: string,
): Promise<{
  tenantId: string;
  signedBaaS3Key: string | null;
  signedBaaUploadedAt: Date | null;
}> {
  const hospital = await client.hospital.findUnique({
    where: { id: hospitalId },
    select: {
      id: true,
      coveredEntityId: true,
      signedBaaS3Key: true,
      signedBaaUploadedAt: true,
      coveredEntity: { select: { tenantId: true } },
    },
  });
  if (!hospital) {
    throw new CoveredEntityValidationError(
      'hospitalId',
      `Hospital not found: ${hospitalId}`,
    );
  }
  if (!hospital.coveredEntityId || !hospital.coveredEntity) {
    throw new CoveredEntityValidationError(
      'hospitalId',
      `Hospital ${hospitalId} has no Covered Entity linked; cannot manage signed BAA document`,
    );
  }
  return {
    tenantId: hospital.coveredEntity.tenantId,
    signedBaaS3Key: hospital.signedBaaS3Key,
    signedBaaUploadedAt: hospital.signedBaaUploadedAt,
  };
}

// ─── Public surface ────────────────────────────────────────────────────────

/**
 * uploadSignedBaaDocument - encrypt + persist a signed-BAA PDF document.
 *
 * Per Q-5ADM-D + D9: PDF bytes are base64-encoded, KMS-envelope-encrypted
 * with a per-hospital encryption context (AUDIT-016 PR 2 D2 tamper-evidence),
 * serialized as JSON, and PutObject-ed to the PHI S3 bucket. S3 SSE-KMS is
 * layered on top as defense-in-depth. The Hospital row is then updated with
 * the resulting S3 key + uploaded timestamp (P1.3.3a schema fields) and a
 * SIGNED_BAA_UPLOADED HIPAA-graded audit event is emitted.
 *
 * Transactional intent: KMS encrypt + S3 PutObject + Hospital update + audit
 * emission. KMS + S3 are external systems and cannot participate in a Prisma
 * $transaction; on Hospital update failure post-S3 success, the S3 object is
 * orphaned (operational cleanup deferred to AUDIT-053 S3 orphan reconciliation
 * sister-precedent). On KMS or S3 failure pre-Hospital-update, no Hospital
 * row mutation occurs and no audit emission is made.
 *
 * Authorization: MANAGE_ROLES (SUPER_ADMIN + HOSPITAL_ADMIN). Tenant scope is
 * derived from Hospital -> CoveredEntity.tenantId traversal; cross-tenant
 * upload attempts throw TenantScopeViolationError.
 */
export async function uploadSignedBaaDocument(
  input: UploadSignedBaaDocumentInput,
  actor: AuthenticatedActor,
): Promise<UploadSignedBaaDocumentResult> {
  assertCanManage(actor, 'uploadSignedBaaDocument');

  if (!input.pdfBytes || input.pdfBytes.length === 0) {
    throw new SignedBaaUploadError(
      'INVALID_INPUT',
      'pdfBytes required and non-empty',
    );
  }
  if (input.pdfBytes.length > MAX_PDF_BYTES) {
    const maxMB = Math.round(MAX_PDF_BYTES / (1024 * 1024));
    throw new SignedBaaUploadError(
      'PDF_TOO_LARGE',
      `Signed BAA PDF exceeds ${maxMB}MB maximum (got ${input.pdfBytes.length} bytes)`,
    );
  }

  const { tenantId } = await resolveHospitalTenantContext(prisma, input.hospitalId);
  assertTenantScope(actor, tenantId);

  const contentType = input.contentType ?? 'application/pdf';
  const uploadedAt = new Date();
  const s3Key = `signed-baa/${input.hospitalId}/${uploadedAt.toISOString()}.envelope.json`;
  const encryptionContext = buildEncryptionContext(input.hospitalId);

  // Step 1: KMS envelope-encrypt the base64-encoded PDF. envelopeEncrypt
  // accepts string input (kmsService.ts:115); base64-encoding the PDF Buffer
  // is the canonical projection. Failure throws SignedBaaUploadError with
  // original cause; no S3 write, no Hospital update, no audit emission.
  let envelopeResult: Awaited<ReturnType<typeof kmsService.envelopeEncrypt>>;
  try {
    const base64Pdf = input.pdfBytes.toString('base64');
    envelopeResult = await kmsService.envelopeEncrypt(base64Pdf, encryptionContext);
  } catch (err) {
    throw new SignedBaaUploadError(
      'KMS_ENVELOPE_ENCRYPT_FAILED',
      `KMS envelope encryption failed for hospital ${input.hospitalId}`,
      err instanceof Error ? err : undefined,
    );
  }

  const envelope: SignedBaaEnvelope = {
    version: '1',
    ciphertext: envelopeResult.ciphertext,
    encryptedDataKey: envelopeResult.encryptedDataKey,
    iv: envelopeResult.iv,
    authTag: envelopeResult.authTag,
    originalContentType: contentType,
    uploadedBy: actor.userId,
    uploadedAt: uploadedAt.toISOString(),
  };

  // Step 2: S3 PutObject. Failure throws SignedBaaUploadError; no Hospital
  // update, no audit emission. SSE-KMS layered on top as defense-in-depth.
  let s3ETag: string | undefined;
  try {
    const command = new PutObjectCommand({
      Bucket: PHI_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(envelope),
      ContentType: 'application/json',
      ...(S3_KMS_KEY_ID && {
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: S3_KMS_KEY_ID,
      }),
      Metadata: {
        'x-tailrd-hospital-id': input.hospitalId,
        'x-tailrd-uploaded-by': actor.userId,
        'x-tailrd-content-type': contentType,
        'x-tailrd-envelope-version': '1',
      },
      Tagging: `hospitalId=${input.hospitalId}&category=signed-baa&hipaa=true`,
    });
    const result = await s3Client.send(command);
    s3ETag = result.ETag;
  } catch (err) {
    throw new SignedBaaUploadError(
      'S3_PUT_OBJECT_FAILED',
      `S3 PutObject failed for hospital ${input.hospitalId}`,
      err instanceof Error ? err : undefined,
    );
  }

  // Step 3: Hospital row update. Sister-precedent F1 (coveredEntityService.ts:648)
  // direct prisma.hospital.update by id; tenant-scope was verified upstream via
  // resolveHospitalTenantContext + assertTenantScope. No $transaction wrap: no
  // cross-record invariant and KMS + S3 already committed; failure here would
  // orphan the S3 object (deferred to AUDIT-053 cleanup).
  try {
    await prisma.hospital.update({
      where: { id: input.hospitalId },
      data: {
        signedBaaS3Key: s3Key,
        signedBaaUploadedAt: uploadedAt,
      },
    });
  } catch (err) {
    throw new SignedBaaUploadError(
      'HOSPITAL_UPDATE_FAILED',
      `Hospital row update failed post-S3 success for hospital ${input.hospitalId}; S3 object ${s3Key} orphaned pending reconciliation`,
      err instanceof Error ? err : undefined,
    );
  }

  // Step 4: HIPAA_GRADE SIGNED_BAA_UPLOADED audit emission. Inline
  // auditLogger.info per F1 sister-precedent (Hospital scope, not CE; emitAudit
  // helper is CE-bound). PHI-discipline: payload contains s3Key + s3ETag +
  // metadata only; pdfBytes / base64Pdf / envelope contents are never logged.
  auditLogger.info('audit_event', {
    timestamp: uploadedAt.toISOString(),
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    hospitalId: actor.hospitalId,
    action: 'SIGNED_BAA_UPLOADED',
    resourceType: 'Hospital',
    resourceId: input.hospitalId,
    source: 'baaDocumentService',
    targetHospitalId: input.hospitalId,
    tenantId,
    s3Key,
    s3ETag: s3ETag ?? null,
    originalContentType: contentType,
    pdfSizeBytes: input.pdfBytes.length,
    envelopeVersion: '1',
  });

  return { s3Key, uploadedAt };
}

/**
 * getSignedBaaDocument - retrieve + decrypt a signed-BAA PDF document.
 *
 * Per Q-5ADM-D: looks up Hospital.signedBaaS3Key (P1.3.3a schema field),
 * GetObject-s the envelope JSON, KMS-envelope-decrypts the payload with the
 * per-hospital encryption context (must match upload-time context or KMS
 * rejects), base64-decodes to a PDF Buffer, and emits a SIGNED_BAA_RETRIEVED
 * HIPAA-graded audit event.
 *
 * Authorization: MANAGE_ROLES (SUPER_ADMIN + HOSPITAL_ADMIN). Signed BAA
 * documents are highly sensitive contract artifacts; no read-only role tier.
 *
 * Throws SignedBaaUploadError('NO_DOCUMENT_ON_FILE', ...) when
 * Hospital.signedBaaS3Key is null (no BAA has been uploaded).
 */
export async function getSignedBaaDocument(
  hospitalId: string,
  actor: AuthenticatedActor,
): Promise<Buffer> {
  assertCanManage(actor, 'getSignedBaaDocument');

  const { tenantId, signedBaaS3Key, signedBaaUploadedAt } =
    await resolveHospitalTenantContext(prisma, hospitalId);
  assertTenantScope(actor, tenantId);

  if (!signedBaaS3Key) {
    throw new SignedBaaUploadError(
      'NO_DOCUMENT_ON_FILE',
      `No signed BAA document on file for hospital ${hospitalId}`,
    );
  }

  // Step 1: S3 GetObject. Failure throws SignedBaaUploadError. Audit
  // emission is suppressed on failure (no successful retrieval to attribute).
  let envelopeJson: string;
  try {
    const command = new GetObjectCommand({
      Bucket: PHI_BUCKET,
      Key: signedBaaS3Key,
    });
    const result = await s3Client.send(command);
    if (!result.Body) {
      throw new Error('S3 GetObject returned empty Body');
    }
    envelopeJson = await result.Body.transformToString('utf-8');
  } catch (err) {
    throw new SignedBaaUploadError(
      'S3_GET_OBJECT_FAILED',
      `S3 GetObject failed for hospital ${hospitalId} key ${signedBaaS3Key}`,
      err instanceof Error ? err : undefined,
    );
  }

  let envelope: SignedBaaEnvelope;
  try {
    envelope = JSON.parse(envelopeJson) as SignedBaaEnvelope;
  } catch (err) {
    throw new SignedBaaUploadError(
      'ENVELOPE_PARSE_FAILED',
      `Envelope JSON parse failed for hospital ${hospitalId} key ${signedBaaS3Key}`,
      err instanceof Error ? err : undefined,
    );
  }
  if (envelope.version !== '1') {
    throw new SignedBaaUploadError(
      'ENVELOPE_VERSION_UNSUPPORTED',
      `Unsupported envelope version ${String(envelope.version)} for hospital ${hospitalId}`,
    );
  }

  // Step 2: KMS envelope-decrypt with identical context. AWS KMS rejects with
  // AccessDeniedException on context mismatch (cross-hospital decrypt evidence).
  const encryptionContext = buildEncryptionContext(hospitalId);
  let base64Pdf: string;
  try {
    base64Pdf = await kmsService.envelopeDecrypt(
      {
        ciphertext: envelope.ciphertext,
        encryptedDataKey: envelope.encryptedDataKey,
        iv: envelope.iv,
        authTag: envelope.authTag,
      },
      encryptionContext,
    );
  } catch (err) {
    throw new SignedBaaUploadError(
      'KMS_ENVELOPE_DECRYPT_FAILED',
      `KMS envelope decryption failed for hospital ${hospitalId} (possible context tamper or cross-hospital decrypt attempt)`,
      err instanceof Error ? err : undefined,
    );
  }

  const pdfBuffer = Buffer.from(base64Pdf, 'base64');

  // Step 3: HIPAA_GRADE SIGNED_BAA_RETRIEVED audit emission. PHI-discipline:
  // payload contains s3Key + originalContentType + size metadata only;
  // pdfBuffer / base64Pdf / envelope ciphertext are never logged.
  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    hospitalId: actor.hospitalId,
    action: 'SIGNED_BAA_RETRIEVED',
    resourceType: 'Hospital',
    resourceId: hospitalId,
    source: 'baaDocumentService',
    targetHospitalId: hospitalId,
    tenantId,
    s3Key: signedBaaS3Key,
    signedBaaUploadedAt: signedBaaUploadedAt?.toISOString() ?? null,
    originalContentType: envelope.originalContentType,
    pdfSizeBytes: pdfBuffer.length,
    envelopeVersion: envelope.version,
  });

  return pdfBuffer;
}
