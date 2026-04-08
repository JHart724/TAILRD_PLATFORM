import { Router, Response } from 'express';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, authorizeHospital, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

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
  authorizeRole(['super-admin']),
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

export = router;