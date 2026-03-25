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

export default router;
