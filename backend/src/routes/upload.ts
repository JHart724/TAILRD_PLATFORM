import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { parseCSV, parseMultiFileCSV, MultiFileInput } from '../ingestion/csvParser';
import { writePatients } from '../ingestion/patientWriter';
import { runGapDetection } from '../ingestion/gapDetectionRunner';
import { writeAuditLog } from '../middleware/auditLogger';
import { redactPHIFragments } from '../utils/phiRedaction';
import prisma from '../lib/prisma';

const router = Router();

// POST /api/data/upload — Accept CSV file upload
router.post('/upload', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.hospitalId) return res.status(403).json({ error: 'No hospital association' });

    const { csvContent, moduleId, fileName } = req.body;
    if (!csvContent || !moduleId) return res.status(400).json({ error: 'csvContent and moduleId required' });

    // Create upload job
    const job = await prisma.uploadJob.create({
      data: {
        hospitalId: user.hospitalId,
        uploadedBy: user.userId,
        fileName: fileName || 'upload.csv',
        fileSize: Buffer.byteLength(csvContent, 'utf8'),
        s3Key: `uploads/${user.hospitalId}/${Date.now()}/${fileName || 'upload.csv'}`,
        moduleId,
        status: 'VALIDATING',
        startedAt: new Date(),
      },
    });

    await writeAuditLog(req, 'FILE_UPLOAD_STARTED', 'UploadJob', job.id, `File upload started: ${fileName}`);

    // Parse and validate
    const parseResult = parseCSV(csvContent, moduleId);

    // PHI check
    if (parseResult.phiResult.hasPHI) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'REJECTED_PHI',
          phiDetected: true,
          completedAt: new Date(),
          // AUDIT-075 D2: CONSERVATIVE per §4.2 (static literal here; sanitize for consistency / idempotent on no-match)
          errorMessage: redactPHIFragments('Potential PHI detected in file'),
        },
      });
      await writeAuditLog(req, 'FILE_REJECTED_PHI', 'UploadJob', job.id, 'PHI detected in upload');
      return res.status(422).json({
        jobId: job.id,
        status: 'REJECTED_PHI',
        message: 'File rejected — potential PHI detected. Please verify file is de-identified.',
      });
    }

    // Header validation
    if (parseResult.headerErrors.length > 0) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          // AUDIT-075 D2: CONSERVATIVE per §4.2 (operator-CSV-content; sanitize before persist)
          errorMessage: redactPHIFragments(parseResult.headerErrors.join('; ')),
        },
      });
      return res.status(400).json({
        jobId: job.id,
        status: 'FAILED',
        errors: parseResult.headerErrors,
      });
    }

    // Update status to processing
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        totalRows: parseResult.totalRows,
        errorRows: parseResult.errorRows.length,
      },
    });

    // Write patients (hospitalId from JWT, never from file)
    const writeResult = await writePatients(parseResult.validRows, user.hospitalId, job.id, moduleId);

    // Run gap detection
    await prisma.uploadJob.update({ where: { id: job.id }, data: { status: 'DETECTING_GAPS' } });
    const gapResult = await runGapDetection(user.hospitalId, job.id);

    // Complete
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
        processedRows: parseResult.validRows.length,
        patientsCreated: writeResult.patientsCreated,
        patientsUpdated: writeResult.patientsUpdated,
        gapFlagsCreated: gapResult.gapFlagsCreated,
        validationErrors:
          parseResult.errorRows.length > 0
            ? JSON.parse(JSON.stringify(parseResult.errorRows.slice(0, 100)))
            : undefined,
      },
    });

    await writeAuditLog(
      req,
      'FILE_UPLOAD_COMPLETE',
      'UploadJob',
      job.id,
      `Upload complete: ${writeResult.patientsCreated} created, ${writeResult.patientsUpdated} updated, ${gapResult.gapFlagsCreated} gaps`,
    );

    res.json({
      jobId: job.id,
      status: 'COMPLETE',
      summary: {
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows.length,
        errorRows: parseResult.errorRows.length,
        patientsCreated: writeResult.patientsCreated,
        patientsUpdated: writeResult.patientsUpdated,
        gapsIdentified: gapResult.gapFlagsCreated,
      },
    });
  } catch (error) {
    logger.error('Upload processing failed:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Upload processing failed' });
  }
});

// ---------------------------------------------------------------------------
// PHASE 3: multi-file normalized (Epic-extract shape) upload route.
//
// Additive endpoint - the single-file POST /upload above is untouched. Mirrors that
// route's JSON-body-of-CSV-strings shape (there is no multer in this router), but
// receives a SET of named entity files instead of one wide csvContent: the closest
// fit to how a client submits an Epic Clarity/Caboodle extract drop. hospitalId is
// taken from the verified JWT (req.user), NEVER from the request body.
//
// Orchestration: parseMultiFileCSV (Phase 2) -> writePatients (Phase 2.5 secondary-dx
// + medication persistence) -> runGapDetection (called as-is, NOT modified). A
// required-file error rejects the WHOLE ingest with a structured error (no partial
// ingest); optional-file absence is surfaced as a warning, not a failure.
// ---------------------------------------------------------------------------

/** Request body for the multi-file route: a set of named entity-file CSV strings + optional module label. */
interface MultiFileUploadBody {
  files: Partial<Record<'patients' | 'conditions' | 'procedures' | 'observations' | 'medications' | 'encounters', string>>;
  moduleId?: string;
}

// POST /api/data/upload/multi - Accept a multi-file normalized extract (file SET)
router.post('/upload/multi', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.hospitalId) return res.status(403).json({ error: 'No hospital association' });

    const { files, moduleId } = (req.body || {}) as MultiFileUploadBody;
    if (!files || typeof files !== 'object' || typeof files.patients !== 'string' || files.patients.trim() === '') {
      return res.status(400).json({ error: 'A files object with at least files.patients (CSV content) is required' });
    }
    const effectiveModuleId = typeof moduleId === 'string' && moduleId.trim() ? moduleId : 'multi';

    // Total byte size across all provided entity files (for the job record).
    const fileSize = Object.values(files).reduce(
      (acc: number, c) => acc + (typeof c === 'string' ? Buffer.byteLength(c, 'utf8') : 0),
      0,
    );

    const job = await prisma.uploadJob.create({
      data: {
        hospitalId: user.hospitalId, // JWT-derived, never from body
        uploadedBy: user.userId,
        fileName: 'multi-file-extract',
        fileSize,
        s3Key: `uploads/${user.hospitalId}/${Date.now()}/multi-file-extract`,
        moduleId: effectiveModuleId,
        status: 'VALIDATING',
        startedAt: new Date(),
      },
    });

    await writeAuditLog(req, 'FILE_UPLOAD_STARTED', 'UploadJob', job.id, 'Multi-file extract upload started');

    const input: MultiFileInput = {
      patients: files.patients,
      conditions: files.conditions,
      observations: files.observations,
      procedures: files.procedures,
      medications: files.medications,
      encounters: files.encounters,
    };
    const parseResult = parseMultiFileCSV(input);

    // PHI gate (mirrors the single-file route): reject on detected PHI - the multi-file route keeps the
    // same de-identified-input contract; a PHI posture for raw PHI-bearing Epic extracts is a separate
    // operator decision (the assembler already strips names downstream, but the gate is not relaxed here).
    if (parseResult.phiResult.hasPHI) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'REJECTED_PHI',
          phiDetected: true,
          completedAt: new Date(),
          errorMessage: redactPHIFragments('Potential PHI detected in patients file'),
        },
      });
      await writeAuditLog(req, 'FILE_REJECTED_PHI', 'UploadJob', job.id, 'PHI detected in multi-file upload');
      return res.status(422).json({
        jobId: job.id,
        status: 'REJECTED_PHI',
        message: 'Upload rejected - potential PHI detected. Verify the extract is de-identified.',
      });
    }

    // Required-file errors (missing/malformed/bad-header) reject the WHOLE ingest - no partial ingest.
    if (parseResult.fileErrors.length > 0) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: redactPHIFragments(parseResult.fileErrors.map(e => e.message).join('; ')),
        },
      });
      return res.status(400).json({ jobId: job.id, status: 'FAILED', fileErrors: parseResult.fileErrors });
    }

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', totalRows: parseResult.totalPatients, errorRows: parseResult.errorRows.length },
    });

    // Write patients (hospitalId from JWT). Phase 2.5: secondary diagnoses + medications persist here.
    const writeResult = await writePatients(parseResult.validRows, user.hospitalId, job.id, effectiveModuleId);

    // Run gap detection as-is (NOT modified).
    await prisma.uploadJob.update({ where: { id: job.id }, data: { status: 'DETECTING_GAPS' } });
    const gapResult = await runGapDetection(user.hospitalId, job.id);

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
        processedRows: parseResult.validRows.length,
        patientsCreated: writeResult.patientsCreated,
        patientsUpdated: writeResult.patientsUpdated,
        gapFlagsCreated: gapResult.gapFlagsCreated,
      },
    });

    await writeAuditLog(
      req,
      'FILE_UPLOAD_COMPLETE',
      'UploadJob',
      job.id,
      `Multi-file ingest complete: ${writeResult.patientsCreated} created, ${writeResult.patientsUpdated} updated, ${gapResult.gapFlagsCreated} gaps`,
    );

    // Structured result: per-file errors (none on success), warnings (optional files absent), crosswalk
    // misses, untranslated procedures, patients ingested, gaps detected.
    res.json({
      jobId: job.id,
      status: 'COMPLETE',
      summary: {
        patientsIngested: parseResult.validRows.length,
        patientsCreated: writeResult.patientsCreated,
        patientsUpdated: writeResult.patientsUpdated,
        gapsIdentified: gapResult.gapFlagsCreated,
      },
      fileWarnings: parseResult.fileWarnings,
      unmappedConditionCodes: parseResult.unmappedReport,
      procedureCodesUntranslated: parseResult.procedureCodesUntranslated,
    });
  } catch (error) {
    logger.error('Multi-file upload processing failed:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Multi-file upload processing failed' });
  }
});

// GET /api/data/upload/status/:jobId
router.get('/upload/status/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const job = await prisma.uploadJob.findFirst({
    where: { id: req.params.jobId, hospitalId: req.user?.hospitalId },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET /api/data/upload/history
router.get('/upload/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const jobs = await prisma.uploadJob.findMany({
    where: { hospitalId: req.user?.hospitalId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(jobs);
});

// GET /api/data/upload/errors/:jobId
router.get('/upload/errors/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const job = await prisma.uploadJob.findFirst({
    where: { id: req.params.jobId, hospitalId: req.user?.hospitalId },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ errors: job.validationErrors || [] });
});

export = router;
