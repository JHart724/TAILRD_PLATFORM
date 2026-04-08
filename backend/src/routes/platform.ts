import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { ModuleType } from '@prisma/client';

const router = Router();

// GET /api/platform/totals
router.get('/totals', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hospitalId = req.user?.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    // Check if real data exists for this hospital
    const gapCount = await prisma.therapyGap.count({ where: { hospitalId } });

    if (gapCount === 0) {
      // Return mock data signal for frontend feature flag
      return res.json({ source: 'mock', message: 'No real data. Frontend should use mock arrays.' });
    }

    // Aggregate real data
    const modules: ModuleType[] = [
      'HEART_FAILURE',
      'ELECTROPHYSIOLOGY',
      'CORONARY_INTERVENTION',
      'STRUCTURAL_HEART',
      'PERIPHERAL_VASCULAR',
      'VALVULAR_DISEASE',
    ];
    const moduleData: Record<string, { patients: number; gaps: number }> = {};
    let totalPatients = 0;
    let totalGaps = 0;

    for (const mod of modules) {
      const gaps = await prisma.therapyGap.groupBy({
        by: ['patientId'],
        where: { hospitalId, module: mod },
      });
      const gapCountForMod = await prisma.therapyGap.count({
        where: { hospitalId, module: mod },
      });

      const shortKey = mod.toLowerCase().replace(/_/g, '');
      moduleData[shortKey] = {
        patients: gaps.length,
        gaps: gapCountForMod,
      };
      totalPatients += gaps.length;
      totalGaps += gapCountForMod;
    }

    res.json({
      source: 'database',
      totalPatients,
      totalGaps,
      modules: moduleData,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Platform totals error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to compute platform totals' });
  }
});

export default router;
