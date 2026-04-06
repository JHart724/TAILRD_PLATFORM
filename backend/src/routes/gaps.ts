import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { writeAuditLog } from '../middleware/auditLogger';
import { ModuleType } from '@prisma/client';

const router = Router();

// Map URL slug to Prisma ModuleType enum
const moduleMap: Record<string, ModuleType> = {
  'heart-failure': 'HEART_FAILURE',
  'electrophysiology': 'ELECTROPHYSIOLOGY',
  'coronary-intervention': 'CORONARY_INTERVENTION',
  'structural-heart': 'STRUCTURAL_HEART',
  'peripheral-vascular': 'PERIPHERAL_VASCULAR',
  'valvular-disease': 'VALVULAR_DISEASE',
  'hf': 'HEART_FAILURE',
  'ep': 'ELECTROPHYSIOLOGY',
  'cad': 'CORONARY_INTERVENTION',
  'sh': 'STRUCTURAL_HEART',
  'pv': 'PERIPHERAL_VASCULAR',
  'vd': 'VALVULAR_DISEASE',
};

// GET /api/gaps/:moduleId
router.get('/:moduleId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = req.user?.hospitalId;
  const moduleId = req.params.moduleId;

  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital context required' });
  }

  const moduleEnum = moduleMap[moduleId];
  if (!moduleEnum) {
    return res.status(400).json({ error: 'Invalid module' });
  }

  try {
    const gapCount = await prisma.therapyGap.count({
      where: { hospitalId, module: moduleEnum },
    });

    if (gapCount === 0) {
      return res.json({ source: 'mock', gaps: [] });
    }

    // Group by gapType to get summary
    const gapSummary = await prisma.therapyGap.groupBy({
      by: ['gapType'],
      where: { hospitalId, module: moduleEnum, resolvedAt: null },
      _count: { id: true },
    });

    res.json({
      source: 'database',
      module: moduleId,
      gaps: gapSummary.map(g => ({
        gapType: g.gapType,
        patientCount: g._count.id,
      })),
      totalGaps: gapSummary.length,
      totalPatients: gapSummary.reduce((sum, g) => sum + g._count.id, 0),
    });
  } catch (error) {
    console.error('Gaps fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch gaps' });
  }
});

// POST /api/gaps/:moduleId/:gapId/action
router.post('/:moduleId/:gapId/action', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, action, notes } = req.body;
  const hospitalId = req.user?.hospitalId;

  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital context required' });
  }

  if (!patientId || !action) {
    return res.status(400).json({ error: 'patientId and action required' });
  }

  const validActions = ['REFERRED', 'INITIATED', 'DEFERRED', 'CONTRAINDICATED'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const gap = await prisma.therapyGap.findFirst({
      where: { id: req.params.gapId, hospitalId, patientId },
    });

    if (!gap) {
      return res.status(404).json({ error: 'Gap not found' });
    }

    const updated = await prisma.therapyGap.update({
      where: { id: gap.id },
      data: {
        currentStatus: action,
        resolvedAt: ['INITIATED', 'CONTRAINDICATED'].includes(action) ? new Date() : null,
        resolvedBy: req.user?.userId,
      },
    });

    // Audit log
    await writeAuditLog(
      req,
      'GAP_ACTIONED',
      'TherapyGap',
      gap.id,
      `Gap actioned: ${action}`,
      null,
      { action, notes },
    );

    res.json(updated);
  } catch (error) {
    console.error('Gap action error:', error);
    res.status(500).json({ error: 'Failed to action gap' });
  }
});

// GET /api/gaps/:moduleId/detailed
// Returns gap data in the shape the frontend gap dashboards need:
// grouped by gapType, with patient list per gap, severity, and evidence
router.get('/:moduleId/detailed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = req.user?.hospitalId;
  const moduleId = req.params.moduleId;

  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital context required' });
  }

  const moduleEnum = moduleMap[moduleId];
  if (!moduleEnum) {
    return res.status(400).json({ error: 'Invalid module' });
  }

  try {
    // Get all open gaps for this module with patient details
    const gaps = await prisma.therapyGap.findMany({
      where: { hospitalId, module: moduleEnum, resolvedAt: null },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dateOfBirth: true,
            gender: true,
            riskScore: true,
            riskCategory: true,
          },
        },
      },
      orderBy: { identifiedAt: 'desc' },
    });

    // Group by gapType for the dashboard view
    const grouped: Record<string, {
      gapType: string;
      status: string;
      target: string;
      medication: string | null;
      recommendations: any;
      patients: any[];
      count: number;
    }> = {};

    for (const gap of gaps) {
      const key = gap.gapType;
      if (!grouped[key]) {
        grouped[key] = {
          gapType: gap.gapType,
          status: gap.currentStatus,
          target: gap.targetStatus,
          medication: gap.medication,
          recommendations: gap.recommendations,
          patients: [],
          count: 0,
        };
      }
      grouped[key].patients.push({
        id: gap.patient.id,
        firstName: gap.patient.firstName,
        lastName: gap.patient.lastName,
        mrn: gap.patient.mrn,
        age: gap.patient.dateOfBirth
          ? Math.floor((Date.now() - new Date(gap.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
        gender: gap.patient.gender,
        riskCategory: gap.patient.riskCategory,
        gapId: gap.id,
      });
      grouped[key].count++;
    }

    const gapList = Object.values(grouped).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        module: moduleId,
        source: 'database',
        totalGapTypes: gapList.length,
        totalPatientGaps: gaps.length,
        gaps: gapList,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch detailed gaps' });
  }
});

// GET /api/gaps/summary/all
// Returns gap counts per module for the platform dashboard / module navigator
router.get('/summary/all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = req.user?.hospitalId;

  if (!hospitalId) {
    return res.status(400).json({ error: 'Hospital context required' });
  }

  try {
    const summary = await prisma.therapyGap.groupBy({
      by: ['module'],
      where: { hospitalId, resolvedAt: null },
      _count: { id: true },
    });

    const totalPatientCount = await prisma.patient.count({
      where: { hospitalId, isActive: true },
    });

    const modulePatientCounts = await Promise.all(
      Object.values(moduleMap).filter((v, i, arr) => arr.indexOf(v) === i).map(async (mod) => {
        const fieldMap: Record<string, string> = {
          HEART_FAILURE: 'heartFailurePatient',
          ELECTROPHYSIOLOGY: 'electrophysiologyPatient',
          CORONARY_INTERVENTION: 'coronaryPatient',
          STRUCTURAL_HEART: 'structuralHeartPatient',
          VALVULAR_DISEASE: 'valvularDiseasePatient',
          PERIPHERAL_VASCULAR: 'peripheralVascularPatient',
        };
        const field = fieldMap[mod];
        if (!field) return { module: mod, patients: 0 };
        const count = await prisma.patient.count({
          where: { hospitalId, isActive: true, [field]: true },
        });
        return { module: mod, patients: count };
      })
    );

    res.json({
      success: true,
      data: {
        totalPatients: totalPatientCount,
        modules: summary.map(s => {
          const modPatients = modulePatientCounts.find(m => m.module === s.module);
          return {
            module: s.module,
            openGaps: s._count.id,
            patients: modPatients?.patients || 0,
          };
        }),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch gap summary' });
  }
});

export default router;
