import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeHospital, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import {
  validateBody,
  createRiskScoreSchema,
  createInterventionSchema,
  updateInterventionStatusSchema,
  createContraindicationSchema,
  overrideContraindicationSchema,
  createGDMTAssessmentSchema,
} from '../validation/clinicalSchemas';
import { assessGDMT, GDMTAssessmentInput } from '../services/gdmtEngine';

const router = Router();

// All clinical intelligence routes require authentication
router.use(authenticateToken);
router.use(requireMFA);

// ============================================
// Risk Score Assessments
// ============================================

// Get risk score assessments for a patient
router.get('/risk-scores/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { module, scoreType } = req.query;
    const hospitalId = req.user!.hospitalId;

    const where: any = { patientId, hospitalId };
    if (module) where.module = module;
    if (scoreType) where.scoreType = scoreType;

    const assessments = await prisma.riskScoreAssessment.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: assessments,
      message: `Found ${assessments.length} risk score assessments`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Create a risk score assessment
router.post('/risk-scores', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = validateBody(createRiskScoreSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors, timestamp: new Date().toISOString() });
    }
    const assessment = await prisma.riskScoreAssessment.create({
      data: { ...(validation.data as any), hospitalId: req.user!.hospitalId },
    });

    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Risk score assessment created',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get risk score summary for a hospital
router.get('/risk-scores/summary/:hospitalId', authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const { module } = req.query;

    const where: any = { hospitalId };
    if (module) where.module = module;

    const [total, byCategory, byScoreType] = await Promise.all([
      prisma.riskScoreAssessment.count({ where }),
      prisma.riskScoreAssessment.groupBy({
        by: ['riskCategory'],
        where,
        _count: true,
      }),
      prisma.riskScoreAssessment.groupBy({
        by: ['scoreType'],
        where,
        _count: true,
        _avg: { totalScore: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byCategory: byCategory.map(c => ({ category: c.riskCategory, count: c._count })),
        byScoreType: byScoreType.map(s => ({
          scoreType: s.scoreType,
          count: s._count,
          avgScore: s._avg.totalScore,
        })),
      },
      message: 'Risk score summary',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// Intervention Tracking
// ============================================

// Get interventions for a patient
router.get('/interventions/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { module, status, category } = req.query;
    const hospitalId = req.user!.hospitalId;

    const where: any = { patientId, hospitalId };
    if (module) where.module = module;
    if (status) where.status = status;
    if (category) where.category = category;

    const interventions = await prisma.interventionTracking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: interventions,
      message: `Found ${interventions.length} interventions`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Create an intervention record
router.post('/interventions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = validateBody(createInterventionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors, timestamp: new Date().toISOString() });
    }
    const intervention = await prisma.interventionTracking.create({
      data: { ...(validation.data as any), hospitalId: req.user!.hospitalId },
    });

    res.status(201).json({
      success: true,
      data: intervention,
      message: 'Intervention record created',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Update intervention status
router.patch('/interventions/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateInterventionStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`), timestamp: new Date().toISOString() });
    }
    const { status, outcome, completedAt, complications } = parsed.data;
    const hospitalId = req.user!.hospitalId;

    // Verify intervention belongs to this hospital before updating
    const existing = await prisma.interventionTracking.findFirst({
      where: { id, hospitalId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Intervention not found', timestamp: new Date().toISOString() });
    }

    const updated = await prisma.interventionTracking.update({
      where: { id, hospitalId },
      data: {
        status: status as any,
        ...(outcome && { outcome }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
        ...(complications && { complications }),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Intervention status updated',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get intervention summary for a hospital
router.get('/interventions/summary/:hospitalId', authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const { module } = req.query;

    const where: any = { hospitalId };
    if (module) where.module = module;

    const [total, byStatus, byModule, reimbursement] = await Promise.all([
      prisma.interventionTracking.count({ where }),
      prisma.interventionTracking.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.interventionTracking.groupBy({
        by: ['module'],
        where,
        _count: true,
      }),
      prisma.interventionTracking.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { estimatedReimbursement: true, actualReimbursement: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        byModule: byModule.map(m => ({ module: m.module, count: m._count })),
        reimbursement: {
          completedCount: reimbursement._count,
          estimatedTotal: reimbursement._sum.estimatedReimbursement,
          actualTotal: reimbursement._sum.actualReimbursement,
        },
      },
      message: 'Intervention summary',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// Contraindication Assessments
// ============================================

// Get contraindication assessments for a patient
router.get('/contraindications/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { module, level } = req.query;
    const hospitalId = req.user!.hospitalId;

    const where: any = { patientId, hospitalId };
    if (module) where.module = module;
    if (level) where.level = level;

    const assessments = await prisma.contraindicationAssessment.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
    });

    res.json({
      success: true,
      data: assessments,
      message: `Found ${assessments.length} contraindication assessments`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Create a contraindication assessment
router.post('/contraindications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = validateBody(createContraindicationSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors, timestamp: new Date().toISOString() });
    }
    const assessment = await prisma.contraindicationAssessment.create({
      data: { ...(validation.data as any), hospitalId: req.user!.hospitalId },
    });

    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Contraindication assessment created',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Override a contraindication
router.patch('/contraindications/:id/override', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = validateBody(overrideContraindicationSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors, timestamp: new Date().toISOString() });
    }
    const { overriddenBy, overrideReason } = validation.data;
    const hospitalId = req.user!.hospitalId;

    // Verify contraindication belongs to this hospital before updating
    const existing = await prisma.contraindicationAssessment.findFirst({
      where: { id, hospitalId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contraindication not found', timestamp: new Date().toISOString() });
    }

    const updated = await prisma.contraindicationAssessment.update({
      where: { id, hospitalId },
      data: { overriddenBy, overrideReason },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Contraindication override recorded',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get contraindication summary for a hospital
router.get('/contraindications/summary/:hospitalId', authorizeHospital, async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const { module } = req.query;

    const where: any = { hospitalId };
    if (module) where.module = module;

    const [total, byLevel, byModule] = await Promise.all([
      prisma.contraindicationAssessment.count({ where }),
      prisma.contraindicationAssessment.groupBy({
        by: ['level'],
        where,
        _count: true,
      }),
      prisma.contraindicationAssessment.groupBy({
        by: ['module'],
        where,
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byLevel: byLevel.map(l => ({ level: l.level, count: l._count })),
        byModule: byModule.map(m => ({ module: m.module, count: m._count })),
      },
      message: 'Contraindication summary',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// GDMT Optimization Engine (Heart Failure)
// ============================================

// Run GDMT assessment for a patient
router.post('/gdmt/assess', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createGDMTAssessmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      });
    }

    const result = await assessGDMT(validation.data as GDMTAssessmentInput);

    res.json({
      success: true,
      data: result,
      message: `GDMT assessment complete: ${result.overallOptimization}% optimized, ${result.recommendations.length} recommendations`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get GDMT history for a patient
router.get('/gdmt/history/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.user!.hospitalId;

    const assessments = await prisma.riskScoreAssessment.findMany({
      where: { patientId, hospitalId, scoreType: 'GDMT_OPTIMIZATION' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: assessments,
      message: `${assessments.length} GDMT assessments`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// Drug Titration (Group B extensions)
// ============================================

// Get drug titrations by module (supports generalDrugClass)
router.get('/drug-titrations/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { module } = req.query;
    const hospitalId = req.user!.hospitalId;

    const where: any = { patientId, hospitalId };
    if (module) where.module = module;

    const titrations = await prisma.drugTitration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: titrations,
      message: `Found ${titrations.length} drug titrations`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export = router;
