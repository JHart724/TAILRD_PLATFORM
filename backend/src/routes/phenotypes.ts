import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { PhenotypeService, PhenotypeDetectionResult, PhenotypeType, PhenotypeStatus } from '../services/phenotypeService';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Initialize phenotype service (singleton pattern)
let phenotypeService: PhenotypeService;

const initializePhenotypeService = () => {
  if (!phenotypeService) {
    logger.info('Initializing phenotype service');
    phenotypeService = new PhenotypeService(prisma);
    logger.info('Phenotype service initialized');
  }
  return phenotypeService;
};

/**
 * GET /api/phenotypes/:patientId
 * Get all phenotype screenings for a patient
 */
router.get('/:patientId',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager']),
  [
    param('patientId').isString().notEmpty().withMessage('Patient ID is required'),
    query('status').optional().isIn(['confirmed', 'suspected', 'ruled-out', 'pending']),
    query('phenotype').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const patientId = req.params.patientId;
      const {
        status,
        phenotype,
        startDate,
        endDate,
        limit = 20,
        offset = 0
      } = req.query;

      const service = initializePhenotypeService();

      // Get phenotype history for patient
      const phenotypes = await service.getPhenotypeHistory(patientId);

      // Get summary statistics
      const summary = await service.getPatientPhenotypeSummary(patientId);

      logger.info('Patient phenotypes retrieved', {
        patientId,
        count: phenotypes.length,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          patientId,
          phenotypes,
          summary: {
            totalPhenotypes: phenotypes.length,
            activePhenotypes: summary.activePhenotypes,
            screeningHistory: summary.screeningHistory
          },
          pagination: {
            offset: Number(offset),
            limit: Number(limit),
            total: phenotypes.length,
            hasMore: Number(offset) + Number(limit) < phenotypes.length
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get patient phenotypes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: req.params.patientId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve patient phenotypes',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * POST /api/phenotypes/screen/:patientId
 * Trigger phenotype screening for a patient
 */
router.post('/screen/:patientId',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager']),
  [
    param('patientId').isString().notEmpty().withMessage('Patient ID is required'),
    body('phenotypes').optional().isArray().withMessage('Phenotypes must be an array'),
    body('phenotypes.*').optional().isIn(Object.values(PhenotypeType)),
    body('encounterType').optional().isIn(['inpatient', 'outpatient', 'emergency', 'observation']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('includeGenetic').optional().isBoolean(),
    body('includeFamilyHistory').optional().isBoolean()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const patientId = req.params.patientId;
      const {
        phenotypes,
        encounterType = 'outpatient',
        priority = 'medium',
        includeGenetic = false,
        includeFamilyHistory = true
      } = req.body;

      const service = initializePhenotypeService();
      const hospitalId = req.user?.hospitalId || '';

      logger.info('Phenotype screening requested', {
        patientId,
        phenotypes: phenotypes?.length || 'all',
        encounterType,
        priority,
        userId: req.user?.userId,
        hospitalId
      });

      // Trigger phenotype screening
      const detected = await service.runPhenotypeScreening(patientId, hospitalId);

      res.json({
        success: true,
        data: {
          patientId,
          detectedPhenotypes: detected,
          summary: {
            totalScreened: Object.values(PhenotypeType).length,
            detected: detected.length,
            highConfidence: detected.filter((p: PhenotypeDetectionResult) => p.confidence > 0.8).length,
            requiresReview: detected.filter((p: PhenotypeDetectionResult) => p.status === PhenotypeStatus.SUSPECTED).length
          }
        },
        message: `Phenotype screening completed: ${detected.length} phenotypes detected`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Phenotype screening failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: req.params.patientId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Phenotype screening failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/phenotypes/summary/:hospitalId
 * Get population phenotype prevalence summary for a hospital
 */
router.get('/summary/:hospitalId',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin', 'quality-director', 'analyst']),
  [
    param('hospitalId').isString().notEmpty().withMessage('Hospital ID is required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('phenotype').optional().isString(),
    query('department').optional().isString(),
    query('groupBy').optional().isIn(['phenotype', 'department', 'month', 'age-group', 'gender'])
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const hospitalId = req.params.hospitalId;

      // Verify user has access to this hospital
      if (req.user?.hospitalId !== hospitalId && req.user?.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to hospital data',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        endDate = new Date().toISOString(),
        phenotype,
        department,
        groupBy = 'phenotype'
      } = req.query;

      const service = initializePhenotypeService();

      const summary = await service.getHospitalPhenotypeSummary(hospitalId, {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        phenotype: phenotype as string,
        department: department as string,
        groupBy: groupBy as string
      });

      logger.info('Hospital phenotype summary retrieved', {
        hospitalId,
        dateRange: { startDate, endDate },
        phenotype,
        department,
        groupBy,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get hospital phenotype summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hospitalId: req.params.hospitalId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve hospital phenotype summary',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * PUT /api/phenotypes/:id/confirm
 * Clinician confirms or rejects a phenotype detection
 */
router.put('/:id/confirm',
  authenticateToken,
  authorizeRole(['physician', 'nurse-manager']),
  [
    param('id').isString().notEmpty().withMessage('Phenotype detection ID is required'),
    body('action').isIn(['confirm', 'reject']).withMessage('Action must be confirm or reject'),
    body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
    body('evidenceOverride').optional().isObject(),
    body('recommendationAdjustments').optional().isArray()
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const phenotypeId = req.params.id;
      const {
        action,
        confidence,
        notes,
        evidenceOverride,
        recommendationAdjustments
      } = req.body;

      const service = initializePhenotypeService();

      // Get the phenotype detection first
      const phenotype = await service.getPhenotypeById(phenotypeId);

      if (!phenotype) {
        return res.status(404).json({
          success: false,
          error: 'Phenotype detection not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Verify user has access to this patient's hospital
      if (req.user?.hospitalId !== phenotype.hospitalId && req.user?.role !== 'super-admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to patient data',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      logger.info('Phenotype confirmation requested', {
        phenotypeId,
        action,
        patientId: phenotype.patientId,
        phenotypeName: phenotype.phenotypeName,
        originalConfidence: phenotype.confidence,
        newConfidence: confidence,
        userId: req.user?.userId
      });

      // Update phenotype status
      const newStatus = action === 'confirm' ? PhenotypeStatus.CONFIRMED : PhenotypeStatus.RULED_OUT;
      await service.updatePhenotypeStatus(phenotypeId, newStatus, req.user?.userId);

      res.json({
        success: true,
        data: {
          phenotypeId,
          status: newStatus,
          confidence: confidence !== undefined ? confidence : phenotype.confidence,
          reviewedBy: req.user?.userId,
          reviewedAt: new Date().toISOString(),
          workflowsTriggered: action === 'confirm' ? ['care-plan-update', 'quality-measures', 'alerts'] : ['documentation']
        },
        message: `Phenotype ${action}ed successfully`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to confirm/reject phenotype', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phenotypeId: req.params.id,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update phenotype status',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Error handling middleware specific to phenotype routes
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Phenotypes API error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error in Phenotypes API',
    timestamp: new Date().toISOString()
  });
});

export = router;