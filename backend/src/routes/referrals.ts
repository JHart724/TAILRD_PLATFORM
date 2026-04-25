import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { CrossReferralService, ReferralType, ReferralStatus, ReferralPriority, ModuleType, ReferralUrgency } from '../services/crossReferralService';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Initialize cross-referral service (singleton pattern)
let referralService: CrossReferralService;

const initializeReferralService = async () => {
  if (!referralService) {
    logger.info('Initializing cross-referral service');
    referralService = new CrossReferralService(prisma);
    logger.info('Cross-referral service initialized');
  }
  return referralService;
};

/**
 * GET /api/referrals/:hospitalId
 * Get all active referrals for a hospital
 */
router.get('/:hospitalId',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER', 'QUALITY_DIRECTOR', 'ANALYST']),
  // Multi-tenant isolation: verify user can access requested hospital
  (req: AuthenticatedRequest, res: Response, next: any) => {
    const requestedHospital = req.params.hospitalId;
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hospitalId !== requestedHospital) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Cannot access other hospital data',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
    next();
  },
  [
    param('hospitalId').isString().notEmpty().withMessage('Hospital ID is required'),
    query('status').optional().isIn(Object.values(ReferralStatus)),
    query('type').optional().isIn(Object.values(ReferralType)),
    query('priority').optional().isIn(Object.values(ReferralPriority)),
    query('fromModule').optional().isString(),
    query('toModule').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'priority', 'dueDate', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
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
      if (req.user?.hospitalId !== hospitalId && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to hospital data',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const {
        status,
        type,
        priority,
        fromModule,
        toModule,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const service = await initializeReferralService();

      const filters = {
        hospitalId,
        status: status as ReferralStatus,
        type: type as ModuleType,
        priority: priority as ReferralUrgency,
        fromModule: fromModule as string,
        toModule: toModule as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const referrals = await service.getHospitalReferrals(filters, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      // Get summary statistics
      const summary = await service.getHospitalReferralSummary(hospitalId);

      logger.info('Hospital referrals retrieved', {
        hospitalId,
        count: referrals.data.length,
        filters,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          referrals: referrals.data,
          summary: {
            totalActive: summary.totalActive,
            pendingReview: summary.pendingReview,
            inProgress: summary.inProgress,
            completed: summary.completed,
            byPriority: summary.byPriority,
            byModule: summary.byModule,
            averageCompletionTime: summary.averageCompletionTime,
            overdueReferrals: summary.overdueReferrals
          },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: referrals.total,
            totalPages: Math.ceil(referrals.total / Number(limit)),
            hasMore: referrals.total > (Number(page) * Number(limit))
          }
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get hospital referrals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hospitalId: req.params.hospitalId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve hospital referrals',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/referrals/patient/:patientId
 * Get all referrals for a specific patient
 */
router.get('/patient/:patientId',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER']),
  [
    param('patientId').isString().notEmpty().withMessage('Patient ID is required'),
    query('status').optional().isIn(Object.values(ReferralStatus)),
    query('type').optional().isIn(Object.values(ReferralType)),
    query('includeHistory').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 50 })
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
        type,
        includeHistory = true,
        limit = 20
      } = req.query;

      const service = await initializeReferralService();

      const filters = {
        patientId,
        status: status as ReferralStatus,
        type: type as ModuleType,
        includeCompleted: includeHistory === 'true',
        hospitalId: req.user?.hospitalId // Ensure user can only see referrals from their hospital
      };

      const referrals = await service.getPatientReferrals(patientId, filters.hospitalId);

      logger.info('Patient referrals retrieved', {
        patientId,
        count: referrals.length,
        includeHistory,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          patientId,
          referrals
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get patient referrals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: req.params.patientId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve patient referrals',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * PUT /api/referrals/:id/status
 * Update referral status
 */
router.put('/:id/status',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER']),
  [
    param('id').isString().notEmpty().withMessage('Referral ID is required'),
    body('status').isIn(Object.values(ReferralStatus)).withMessage('Valid status is required'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
    body('assignedTo').optional().isString(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(Object.values(ReferralPriority)),
    body('statusReason').optional().isString().isLength({ max: 500 }),
    body('attachments').optional().isArray()
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

      const referralId = req.params.id;
      const {
        status,
        notes,
        assignedTo,
        dueDate,
        priority,
        statusReason,
        attachments
      } = req.body;

      const service = await initializeReferralService();

      // Get the referral first to verify access
      const referral = await service.getReferralById(referralId);
      
      if (!referral) {
        return res.status(404).json({
          success: false,
          error: 'Referral not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Verify user has access to this referral
      if (req.user?.hospitalId !== referral.hospitalId && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to referral data',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      logger.info('Referral status update requested', {
        referralId,
        oldStatus: referral.status,
        newStatus: status,
        patientId: referral.patientId,
        userId: req.user?.userId
      });

      // Update referral status with audit trail
      await service.updateReferralStatus(
        referralId,
        status as ReferralStatus,
        req.user?.userId!,
        notes
      );

      res.json({
        success: true,
        data: {
          referralId,
          status,
          updatedBy: req.user?.userId,
          updatedAt: new Date().toISOString()
        },
        message: `Referral status updated to ${status}`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to update referral status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        referralId: req.params.id,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update referral status',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * GET /api/referrals/analytics/:hospitalId
 * Get referral metrics and analytics for a hospital
 */
router.get('/analytics/:hospitalId',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'QUALITY_DIRECTOR', 'ANALYST']),
  [
    param('hospitalId').isString().notEmpty().withMessage('Hospital ID is required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['day', 'week', 'month', 'module', 'type', 'priority']),
    query('metric').optional().isIn(['volume', 'completion-time', 'success-rate', 'overdue-rate'])
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
      if (req.user?.hospitalId !== hospitalId && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to hospital data',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        endDate = new Date().toISOString(),
        groupBy = 'week',
        metric = 'volume'
      } = req.query;

      const service = await initializeReferralService();

      const analytics = await service.getReferralAnalytics(hospitalId, {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        groupBy: groupBy as string,
        metric: metric as string
      });

      // Get benchmarking data if user is super-admin
      let benchmarks = undefined;
      if (req.user?.role === 'SUPER_ADMIN') {
        benchmarks = await service.getReferralBenchmarks(hospitalId, {
          timeframe: '90d',
          peerGroup: 'similar-size'
        });
      }

      logger.info('Referral analytics retrieved', {
        hospitalId,
        dateRange: { startDate, endDate },
        groupBy,
        metric,
        includeBenchmarks: !!benchmarks,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        data: {
          hospitalId,
          reportPeriod: {
            start: startDate,
            end: endDate
          },
          metrics: analytics.metrics,
          trends: analytics.trends,
          performance: analytics.performance,
          moduleBreakdown: analytics.moduleBreakdown,
          qualityIndicators: analytics.qualityIndicators,
          benchmarks,
          insights: analytics.insights,
          recommendations: analytics.recommendations
        },
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to get referral analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hospitalId: req.params.hospitalId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve referral analytics',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

/**
 * POST /api/referrals
 * Create a new referral (internal endpoint for module-to-module referrals)
 */
router.post('/',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER']),
  [
    body('patientId').isString().notEmpty().withMessage('Patient ID is required'),
    body('type').isIn(Object.values(ReferralType)).withMessage('Valid referral type is required'),
    body('fromModule').isString().notEmpty().withMessage('From module is required'),
    body('toModule').isString().notEmpty().withMessage('To module is required'),
    body('priority').isIn(Object.values(ReferralPriority)).withMessage('Valid priority is required'),
    body('reason').isString().notEmpty().withMessage('Referral reason is required'),
    body('clinicalContext').isObject().withMessage('Clinical context is required'),
    body('dueDate').optional().isISO8601(),
    body('assignedTo').optional().isString(),
    body('urgentNotification').optional().isBoolean()
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

      const {
        patientId,
        type,
        fromModule,
        toModule,
        priority,
        reason,
        clinicalContext,
        dueDate,
        assignedTo,
        urgentNotification = false
      } = req.body;

      const service = await initializeReferralService();

      logger.info('New referral creation requested', {
        patientId,
        type,
        fromModule,
        toModule,
        priority,
        userId: req.user?.userId,
        hospitalId: req.user?.hospitalId
      });

      // Create the referral
      const newReferral = await service.createManualReferral(
        patientId,
        req.user?.hospitalId!,
        fromModule as ModuleType,
        toModule as ModuleType,
        reason,
        priority as ReferralUrgency,
        req.user?.userId!,
        clinicalContext ? JSON.stringify(clinicalContext) : undefined
      );

      res.status(201).json({
        success: true,
        data: {
          referralId: newReferral.id,
          patientId,
          status: newReferral.status,
          fromModule: newReferral.fromModule,
          toModule: newReferral.toModule,
          createdBy: req.user?.userId,
          createdAt: new Date().toISOString()
        },
        message: 'Referral created successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error) {
      logger.error('Failed to create referral', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create referral',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Error handling middleware specific to referrals routes
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Referrals API error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error in Referrals API',
    timestamp: new Date().toISOString()
  });
});

export = router;