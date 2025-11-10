import { Router } from 'express';
import { APIResponse, Hospital } from '../types';
import { authenticateToken, authorizeRole, authorizeHospital, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Mock hospital data for demonstration
const mockHospitals: Hospital[] = [
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
  (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      data: mockHospitals,
      message: 'All hospitals retrieved',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
);

// GET /api/hospitals/:hospitalId - Get specific hospital (users can only see their own)
router.get('/:hospitalId', 
  authenticateToken, 
  authorizeHospital,
  (req: AuthenticatedRequest, res) => {
    const hospital = mockHospitals.find(h => h.id === req.params.hospitalId);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    res.json({
      success: true,
      data: hospital,
      message: 'Hospital retrieved successfully',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
);

// GET /api/hospitals/:hospitalId/modules - Get enabled modules for hospital
router.get('/:hospitalId/modules', 
  authenticateToken, 
  authorizeHospital,
  (req: AuthenticatedRequest, res) => {
    const hospital = mockHospitals.find(h => h.id === req.params.hospitalId);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    // Filter modules based on user permissions
    const userPermissions = req.user?.permissions;
    const enabledModules = Object.entries(hospital.modules)
      .filter(([module, enabled]) => {
        if (!enabled) return false;
        if (!userPermissions?.modules) return false;
        return userPermissions.modules[module as keyof typeof userPermissions.modules];
      })
      .reduce((acc, [module, enabled]) => {
        acc[module] = enabled;
        return acc;
      }, {} as any);

    res.json({
      success: true,
      data: {
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        enabledModules,
        userPermissions: userPermissions?.modules
      },
      message: 'Hospital modules retrieved',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
);

// GET /api/hospitals/:hospitalId/analytics - Get hospital analytics summary
router.get('/:hospitalId/analytics', 
  authenticateToken, 
  authorizeHospital,
  (req: AuthenticatedRequest, res) => {
    const hospital = mockHospitals.find(h => h.id === req.params.hospitalId);
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    // Generate analytics based on hospital size
    const analytics = {
      totalPatients: hospital.patientCount,
      activePatients: Math.floor(hospital.patientCount * 0.15), // 15% active
      riskDistribution: {
        high: Math.floor(hospital.patientCount * 0.08),
        medium: Math.floor(hospital.patientCount * 0.17),
        low: Math.floor(hospital.patientCount * 0.75)
      },
      moduleBreakdown: {
        heartFailure: hospital.modules.heartFailure ? Math.floor(hospital.patientCount * 0.08) : 0,
        coronaryIntervention: hospital.modules.coronaryIntervention ? Math.floor(hospital.patientCount * 0.12) : 0,
        electrophysiology: hospital.modules.electrophysiology ? Math.floor(hospital.patientCount * 0.04) : 0,
        structuralHeart: hospital.modules.structuralHeart ? Math.floor(hospital.patientCount * 0.02) : 0,
        peripheralVascular: hospital.modules.peripheralVascular ? Math.floor(hospital.patientCount * 0.06) : 0,
        valvularDisease: hospital.modules.valvularDisease ? Math.floor(hospital.patientCount * 0.03) : 0
      },
      dailyVolume: {
        admissions: Math.floor(hospital.patientCount * 0.001), // 0.1% daily admission rate
        procedures: Math.floor(hospital.patientCount * 0.0008),
        labResults: Math.floor(hospital.patientCount * 0.05)
      }
    };

    res.json({
      success: true,
      data: analytics,
      message: 'Hospital analytics retrieved',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
);

export = router;