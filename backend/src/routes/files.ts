/**
 * File Upload & Download Routes
 *
 * HIPAA-compliant file operations with hospital-scoped access:
 *   - Pre-signed upload URLs (client uploads directly to S3)
 *   - Pre-signed download URLs (temporary, 5-min expiry)
 *   - File metadata & listing
 *   - Audit-logged delete (soft delete via S3 versioning)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { requirePHIAccess } from '../middleware/tierEnforcement';
import { exportRateLimit } from '../middleware/authRateLimit';
import s3Service from '../services/s3Service';

const router = Router();

router.use(authenticateToken);

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  category: z.enum(['patient-document', 'clinical-report', 'audit-export', 'app-asset']),
  patientId: z.string().optional(),
});

const listFilesSchema = z.object({
  category: z.enum(['patient-document', 'clinical-report', 'audit-export', 'app-asset']),
  prefix: z.string().optional(),
  maxKeys: z.coerce.number().int().min(1).max(1000).default(100),
  continuationToken: z.string().optional(),
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/files/upload-url
 * Get a pre-signed S3 upload URL. Client uploads directly to S3.
 * PHI categories require paid tier.
 */
router.post('/upload-url',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = uploadRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { fileName, contentType, category, patientId } = parsed.data;
      const hospitalId = req.user?.hospitalId;
      const userId = req.user?.userId;

      if (!hospitalId || !userId) {
        return res.status(403).json({
          success: false,
          error: 'No hospital context',
        });
      }

      // PHI categories require tier check (handled by middleware for PHI routes)
      if (['patient-document', 'clinical-report'].includes(category)) {
        // Inline tier check for file uploads
        const tierCheck = requirePHIAccess();
        await new Promise<void>((resolve, reject) => {
          tierCheck(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        // If res was already sent by tierCheck, don't continue
        if (res.headersSent) return;
      }

      const result = await s3Service.getPresignedUploadUrl(
        hospitalId,
        userId,
        category,
        fileName,
        contentType,
        patientId,
      );

      return res.json({
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
          key: result.key,
          expiresIn: result.expiresIn,
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/files/upload
 * Direct upload through the backend (for smaller files or when pre-signed isn't used).
 * Body should be the raw file content.
 */
router.post('/upload',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = req.query.category as string;
      const fileName = req.query.fileName as string;
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const patientId = req.query.patientId as string | undefined;

      if (!category || !fileName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query params: category, fileName',
        });
      }

      const hospitalId = req.user?.hospitalId;
      const userId = req.user?.userId;

      if (!hospitalId || !userId) {
        return res.status(403).json({ success: false, error: 'No hospital context' });
      }

      // Collect body buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);

      const result = await s3Service.uploadFile({
        hospitalId,
        userId,
        category,
        fileName,
        contentType,
        body,
        patientId,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(err.message.includes('not allowed') ? 400 : 500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/**
 * GET /api/files/download-url
 * Get a pre-signed download URL (5-min expiry).
 */
router.get('/download-url',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const key = req.query.key as string;
      const bucket = req.query.bucket as 'phi' | 'audit' | 'assets';

      if (!key || !bucket) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query params: key, bucket',
        });
      }

      const hospitalId = req.user?.hospitalId;
      if (!hospitalId) {
        return res.status(403).json({ success: false, error: 'No hospital context' });
      }

      // Verify file belongs to this hospital (path-based check)
      const pathParts = key.split('/');
      const fileHospitalId = pathParts[1]; // {prefix}/{hospitalId}/...
      if (fileHospitalId !== hospitalId && req.user?.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: file does not belong to your hospital',
        });
      }

      const url = await s3Service.getPresignedDownloadUrl({
        key,
        bucket,
        expiresIn: 300, // 5 minutes
      });

      return res.json({
        success: true,
        data: { url, expiresIn: 300 },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/files
 * List files for the authenticated hospital.
 */
router.get('/',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = listFilesSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const hospitalId = req.user?.hospitalId;
      if (!hospitalId) {
        return res.status(403).json({ success: false, error: 'No hospital context' });
      }

      const result = await s3Service.listFiles({
        hospitalId,
        ...parsed.data,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/files/metadata
 * Get file metadata without downloading.
 */
router.get('/metadata',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const key = req.query.key as string;
      const bucket = req.query.bucket as 'phi' | 'audit' | 'assets';

      if (!key || !bucket) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query params: key, bucket',
        });
      }

      // Verify the file key belongs to the user's hospital
      const hospitalId = req.user?.hospitalId;
      if (hospitalId && !key.includes(hospitalId) && req.user?.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied: file does not belong to your hospital',
        });
      }

      const metadata = await s3Service.getFileMetadata(key, bucket);

      return res.json({
        success: true,
        data: metadata,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/files
 * Soft-delete a file (S3 versioning preserves it).
 */
router.delete('/',
  authorizeRole(['hospital-admin', 'super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const key = req.query.key as string;
      const bucket = req.query.bucket as 'phi' | 'audit' | 'assets';

      if (!key || !bucket) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query params: key, bucket',
        });
      }

      const hospitalId = req.user?.hospitalId;
      if (!hospitalId) {
        return res.status(403).json({ success: false, error: 'No hospital context' });
      }

      const result = await s3Service.deleteFile(key, bucket, hospitalId);

      return res.json({
        success: true,
        data: result,
        message: 'File deleted (recoverable via S3 versioning)',
      });
    } catch (err: any) {
      const status = err.message.includes('Access denied') ? 403 : 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/files/archive
 * Copy a file to the audit bucket for compliance retention.
 * Super-admin only.
 */
router.post('/archive',
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sourceKey, sourceBucket, reason } = req.body;

      if (!sourceKey || !sourceBucket || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: sourceKey, sourceBucket, reason',
        });
      }

      const hospitalId = req.user?.hospitalId || 'platform';
      const archiveKey = await s3Service.archiveToAudit(
        sourceKey,
        sourceBucket,
        hospitalId,
        reason,
      );

      return res.json({
        success: true,
        data: { archiveKey, bucket: 'audit' },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
export default router;
