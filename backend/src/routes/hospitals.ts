import { Router, Response } from 'express';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, authorizeHospital, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { writeAuditLog } from '../middleware/auditLogger';
import {
  uploadSignedBaaDocument,
  getSignedBaaDocument,
  BaaDocumentServiceError,
  SignedBaaUploadError,
} from '../services/baaDocumentService';
import {
  CoveredEntityValidationError,
  CoveredEntityAccessDeniedError,
  TenantScopeViolationError,
  type AuthenticatedActor,
} from '../services/coveredEntityService';

const router = Router();

// 5-ADM-09 P1.3.3c.IMPLEMENT-1.RESUME signed-BAA-document route constants.
// MAX_BAA_PDF_BYTES mirrors baaDocumentService.MAX_PDF_BYTES (25MB; sister to
// s3Service patient-document ceiling). The route-level check short-circuits
// oversized uploads BEFORE service-layer KMS / S3 work; service still enforces
// authoritatively via SignedBaaUploadError('PDF_TOO_LARGE', ...).
const MAX_BAA_PDF_BYTES = 25 * 1024 * 1024;
const BAA_PDF_CONTENT_TYPE = 'application/pdf';

// Removed: mock hospital data. All endpoints now query Prisma.
const _MOCK_REMOVED = [
  {
    id: 'hosp-001',
    name: 'St. Mary\'s Regional Medical Center',
    system: 'Catholic Health Network',
    npi: '1234567890',
    address: {
      street: '123 Medical Center Dr',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA'
    },
    patientCount: 485000,
    bedCount: 650,
    hospitalType: 'academic',
    redoxConfig: {
      sourceId: 'stmarys-001',
      destinationId: 'tailrd-001',
      webhookUrl: 'https://api.tailrd.com/webhooks/redox/hosp-001',
      isActive: true
    },
    modules: {
      heartFailure: true,
      electrophysiology: true,
      structuralHeart: true,
      coronaryIntervention: true,
      peripheralVascular: true,
      valvularDisease: true
    },
    subscription: {
      tier: 'enterprise',
      startDate: new Date('2024-01-01'),
      isActive: true,
      maxUsers: 50
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'hosp-002',
    name: 'Community General Hospital',
    npi: '2345678901',
    address: {
      street: '456 Community Blvd',
      city: 'Riverside',
      state: 'CA',
      zipCode: '92501',
      country: 'USA'
    },
    patientCount: 180000,
    bedCount: 250,
    hospitalType: 'community',
    redoxConfig: {
      sourceId: 'community-002',
      destinationId: 'tailrd-002',
      webhookUrl: 'https://api.tailrd.com/webhooks/redox/hosp-002',
      isActive: true
    },
    modules: {
      heartFailure: true,
      electrophysiology: false,
      structuralHeart: false,
      coronaryIntervention: true,
      peripheralVascular: true,
      valvularDisease: false
    },
    subscription: {
      tier: 'professional',
      startDate: new Date('2024-03-15'),
      isActive: true,
      maxUsers: 25
    },
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date()
  }
];

// GET /api/hospitals - Super admin only (can see all hospitals)
router.get('/',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitals = await prisma.hospital.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, system: true, npi: true, patientCount: true, bedCount: true,
          hospitalType: true, street: true, city: true, state: true, zipCode: true,
          subscriptionTier: true, subscriptionActive: true, maxUsers: true,
          moduleHeartFailure: true, moduleElectrophysiology: true, moduleStructuralHeart: true,
          moduleCoronaryIntervention: true, modulePeripheralVascular: true, moduleValvularDisease: true,
        },
      });
      res.json({ success: true, data: hospitals, message: 'All hospitals retrieved', timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('Failed to fetch hospitals', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch hospitals' });
    }
  }
);

// GET /api/hospitals/:hospitalId - Get specific hospital (users can only see their own)
router.get('/:hospitalId',
  authenticateToken,
  authorizeHospital,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospital = await prisma.hospital.findUnique({ where: { id: req.params.hospitalId } });
      if (!hospital) {
        return res.status(404).json({ success: false, error: 'Hospital not found', timestamp: new Date().toISOString() });
      }
      res.json({ success: true, data: hospital, message: 'Hospital retrieved successfully', timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('Failed to fetch hospital', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch hospital' });
    }
  }
);

// GET /api/hospitals/:hospitalId/modules - Get enabled modules for hospital
router.get('/:hospitalId/modules',
  authenticateToken,
  authorizeHospital,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospital = await prisma.hospital.findUnique({
        where: { id: req.params.hospitalId },
        select: {
          id: true, name: true,
          moduleHeartFailure: true, moduleElectrophysiology: true, moduleStructuralHeart: true,
          moduleCoronaryIntervention: true, modulePeripheralVascular: true, moduleValvularDisease: true,
        },
      });
      if (!hospital) {
        return res.status(404).json({ success: false, error: 'Hospital not found', timestamp: new Date().toISOString() });
      }

      const enabledModules: Record<string, boolean> = {
        heartFailure: hospital.moduleHeartFailure,
        electrophysiology: hospital.moduleElectrophysiology,
        structuralHeart: hospital.moduleStructuralHeart,
        coronaryIntervention: hospital.moduleCoronaryIntervention,
        peripheralVascular: hospital.modulePeripheralVascular,
        valvularDisease: hospital.moduleValvularDisease,
      };

      res.json({
        success: true,
        data: { hospitalId: hospital.id, hospitalName: hospital.name, enabledModules, userPermissions: req.user?.permissions?.modules },
        message: 'Hospital modules retrieved',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to fetch hospital modules', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch hospital modules' });
    }
  }
);

// GET /api/hospitals/:hospitalId/analytics - Get hospital analytics summary
router.get('/:hospitalId/analytics',
  authenticateToken,
  authorizeHospital,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.params.hospitalId;
      const [totalPatients, activePatients, openGaps, riskCounts] = await Promise.all([
        prisma.patient.count({ where: { hospitalId } }),
        prisma.patient.count({ where: { hospitalId, isActive: true } }),
        prisma.therapyGap.count({ where: { hospitalId, resolvedAt: null } }),
        prisma.patient.groupBy({
          by: ['riskCategory'],
          where: { hospitalId, isActive: true },
          _count: { id: true },
        }),
      ]);

      const riskDist: Record<string, number> = { high: 0, moderate: 0, low: 0 };
      for (const rc of riskCounts) {
        const cat = (rc.riskCategory || 'low').toLowerCase();
        if (cat in riskDist) riskDist[cat] = rc._count.id;
      }

      const analytics = {
        totalPatients,
        activePatients,
        openGaps,
        riskDistribution: riskDist,
      };

      res.json({
        success: true,
        data: analytics,
        message: 'Hospital analytics retrieved',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to fetch hospital analytics', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch hospital analytics' });
    }
  }
);

// 5-ADM-09 P1.3.3c.IMPLEMENT-1.RESUME signed-BAA-document route helpers.
// Sister-precedent: coveredEntity.ts:87-97 extractActor + coveredEntity.ts:136-177
// mapBaaErrorToResponse pattern. Replicated here per A.RESUME.5 helper-strategy
// decision (Option b): hospital-route-specific helper for SignedBaaUploadError
// + BaaDocumentServiceError code-aware HTTP semantic mapping. coveredEntity.ts
// helper is module-local (not exported) and does not handle baaDocumentService
// error classes.

function extractBaaActor(req: AuthenticatedRequest): AuthenticatedActor {
  // Re-derive tenantId from authenticated session per CLAUDE.md 14 rule 8.
  // NEVER trust client-supplied tenantId from req.body or req.params.
  const user = req.user!;
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
  };
}

// 5-ADM-09 P1.3.3c.IMPLEMENT-1.RESUME Q-5ADM-Q Path A finer-grained
// error-to-HTTP mapping for signed-BAA-document routes. Code-aware on
// SignedBaaUploadError: NO_DOCUMENT_ON_FILE -> 404 (read-miss); INVALID_INPUT
// + PDF_TOO_LARGE -> 422 (validation); ENVELOPE_* + KMS_* + S3_* +
// HOSPITAL_UPDATE_FAILED -> 500 (server-side). CoveredEntityValidationError
// -> 422 (hospital-not-found + no-CE-link semantics). TenantScopeViolationError
// + CoveredEntityAccessDeniedError -> 403 (sister AUDIT-011 fail-closed
// posture; tenant-scope routes to 403 NOT 404 to avoid resource-existence
// leak).
function mapBaaDocumentErrorToResponse(err: unknown, res: Response): Response {
  if (err instanceof SignedBaaUploadError) {
    if (err.code === 'NO_DOCUMENT_ON_FILE') {
      return res.status(404).json({ success: false, error: err.message, code: err.code });
    }
    if (err.code === 'INVALID_INPUT' || err.code === 'PDF_TOO_LARGE') {
      return res.status(422).json({ success: false, error: err.message, code: err.code });
    }
    return res.status(500).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof CoveredEntityValidationError) {
    return res.status(422).json({
      success: false,
      error: err.message,
      code: err.code,
      field: err.field,
    });
  }
  if (err instanceof TenantScopeViolationError) {
    return res.status(403).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof CoveredEntityAccessDeniedError) {
    return res.status(403).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof BaaDocumentServiceError) {
    return res.status(500).json({ success: false, error: err.message, code: err.code });
  }
  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({ success: false, error: message });
}

/**
 * PUT /api/hospitals/:hospitalId/baa-document
 *
 * 5-ADM-09 P1.3.3c.IMPLEMENT-1.RESUME signed-BAA-document upload route.
 * Accepts raw application/pdf bytes in the request body; service-layer
 * KMS-envelope-encrypts the PDF with a per-hospital encryption context
 * (AUDIT-016 PR 2 D2 tamper-evidence), PutObjects the envelope JSON to the
 * PHI S3 bucket, and updates Hospital.signedBaaS3Key + signedBaaUploadedAt.
 *
 * Q-5ADM-K Path B PUT verb HTTP idiom: upload-and-record idempotent semantic
 * (re-uploads orphan the prior S3 object pending AUDIT-053 reconciliation).
 *
 * Q-5ADM-L Path B defense-in-depth authorization: authorizeRole route
 * middleware (SUPER_ADMIN + HOSPITAL_ADMIN) + service-layer assertCanManage
 * + assertTenantScope (Hospital -> CoveredEntity.tenantId traversal).
 *
 * Q-5ADM-D D9 client-side envelope encryption: PDF bytes are
 * base64-encoded + KMS-envelope-encrypted by the service BEFORE PutObject;
 * S3 SSE-KMS is layered on top as defense-in-depth. Route NEVER logs raw
 * PDF bytes or base64 form (PHI discipline; sister-precedent coveredEntity.ts
 * IMPLEMENT-1 audit-message discipline).
 *
 * Request:
 *   - Content-Type: application/pdf
 *   - Body: raw PDF bytes (<=25MB per MAX_BAA_PDF_BYTES ceiling)
 *
 * Response: 200 OK with { s3Key, uploadedAt }.
 * Errors map per Q-5ADM-Q Path A (mapBaaDocumentErrorToResponse).
 *
 * Sister-precedent files.ts:136-141 raw-body collection pattern; sister-precedent
 * coveredEntity.ts IMPLEMENT-1 PUT /:id/baa-execution actor + writeAuditLog.
 */
router.put(
  '/:hospitalId/baa-document',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (!contentType.startsWith(BAA_PDF_CONTENT_TYPE)) {
        return res.status(422).json({
          success: false,
          error: `Content-Type must be ${BAA_PDF_CONTENT_TYPE}`,
          code: 'INVALID_CONTENT_TYPE',
        });
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      for await (const chunk of req) {
        const buf = Buffer.from(chunk);
        totalBytes += buf.length;
        if (totalBytes > MAX_BAA_PDF_BYTES) {
          const maxMB = Math.round(MAX_BAA_PDF_BYTES / (1024 * 1024));
          return res.status(422).json({
            success: false,
            error: `Signed BAA PDF exceeds ${maxMB}MB maximum`,
            code: 'PDF_TOO_LARGE',
          });
        }
        chunks.push(buf);
      }
      const pdfBytes = Buffer.concat(chunks);
      if (pdfBytes.length === 0) {
        return res.status(422).json({
          success: false,
          error: 'Request body must contain PDF bytes',
          code: 'INVALID_INPUT',
        });
      }

      const actor = extractBaaActor(req);
      const result = await uploadSignedBaaDocument(
        {
          hospitalId: req.params.hospitalId,
          pdfBytes,
          contentType: BAA_PDF_CONTENT_TYPE,
        },
        actor,
      );

      // Audit message carries metadata only (s3Key + byte count). NEVER include
      // pdfBytes or base64 PDF content per PHI discipline.
      await writeAuditLog(
        req,
        'BAA_DOCUMENT_UPLOADED',
        'Hospital',
        req.params.hospitalId,
        `Uploaded signed BAA document for Hospital ${req.params.hospitalId} (${pdfBytes.length} bytes, s3Key ${result.s3Key})`,
      );

      return res.json({
        success: true,
        data: {
          s3Key: result.s3Key,
          uploadedAt: result.uploadedAt.toISOString(),
        },
      });
    } catch (err) {
      return mapBaaDocumentErrorToResponse(err, res);
    }
  },
);

/**
 * GET /api/hospitals/:hospitalId/baa-document
 *
 * 5-ADM-09 P1.3.3c.IMPLEMENT-1.RESUME signed-BAA-document retrieval route.
 * Service-layer GetObjects the envelope JSON from S3, KMS-envelope-decrypts
 * with identical per-hospital encryption context (KMS rejects on mismatch
 * for cross-hospital tamper evidence), base64-decodes, and returns the PDF
 * Buffer. Route streams the Buffer back to the caller as application/pdf.
 *
 * Q-5ADM-K Path B GET verb HTTP idiom for contract artifact retrieval.
 *
 * Q-5ADM-L Path B defense-in-depth authorization: authorizeRole route
 * middleware (SUPER_ADMIN + HOSPITAL_ADMIN) + service-layer assertCanManage
 * + assertTenantScope. Signed BAA documents are contract artifacts with no
 * read-only role tier (no QUALITY_DIRECTOR access here).
 *
 * Response: 200 OK with application/pdf body (raw PDF bytes).
 *           404 when no document on file (SignedBaaUploadError NO_DOCUMENT_ON_FILE).
 * Errors map per Q-5ADM-Q Path A (mapBaaDocumentErrorToResponse).
 *
 * Sister-precedent coveredEntity.ts IMPLEMENT-1 PUT /:id/baa-execution actor
 * + writeAuditLog dispatch.
 */
router.get(
  '/:hospitalId/baa-document',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const actor = extractBaaActor(req);
      const pdfBuffer = await getSignedBaaDocument(req.params.hospitalId, actor);

      // Audit message carries byte count only. NEVER include PDF content or
      // decrypted form per PHI discipline.
      await writeAuditLog(
        req,
        'BAA_DOCUMENT_RETRIEVED',
        'Hospital',
        req.params.hospitalId,
        `Retrieved signed BAA document for Hospital ${req.params.hospitalId} (${pdfBuffer.length} bytes)`,
      );

      res.setHeader('Content-Type', BAA_PDF_CONTENT_TYPE);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="signed-baa-${req.params.hospitalId}.pdf"`,
      );
      return res.status(200).send(pdfBuffer);
    } catch (err) {
      return mapBaaDocumentErrorToResponse(err, res);
    }
  },
);

export = router;