import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { writeAuditLog } from '../middleware/auditLogger';
import { logger } from '../utils/logger';
const godViewRouter = require('./godView');

const router = Router();

// Mount GOD view routes
router.use('/god', godViewRouter);

// Quick Analytics for Admin Dashboard
// Hospital-admin sees only their hospital; super-admin sees platform-wide
router.get('/analytics', authenticateToken, authorizeRole(['super-admin', 'hospital-admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user!.role === 'super-admin';
    const hospitalFilter = isSuperAdmin ? {} : { hospitalId: req.user!.hospitalId };

    const [
      totalHospitals,
      activeUsers,
      totalPatients,
      totalAlerts
    ] = await Promise.all([
      isSuperAdmin ? prisma.hospital.count() : Promise.resolve(1),
      prisma.user.count({ where: { isActive: true, ...hospitalFilter } }),
      prisma.patient.count({ where: hospitalFilter }),
      prisma.alert.count({ where: { isAcknowledged: false, ...hospitalFilter } }),
    ]);

    const analytics = {
      totalHospitals,
      activeUsers,
      totalPatients,
      criticalAlerts: totalAlerts,
    };

    res.json({ success: true, data: analytics, timestamp: new Date().toISOString() });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to load analytics',
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin Dashboard - Platform Overview
router.get('/dashboard', 
  authenticateToken, 
  authorizeRole(['super-admin']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get platform-wide statistics
      const [
        totalHospitals,
        activeHospitals,
        totalUsers,
        activeUsers,
        totalPatients,
        recentPatients,
        totalWebhookEvents,
        recentWebhookEvents,
        totalAlerts,
        unacknowledgedAlerts
      ] = await Promise.all([
        prisma.hospital.count(),
        prisma.hospital.count({ where: { subscriptionActive: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.patient.count(),
        prisma.patient.count({ 
          where: { 
            createdAt: { 
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            } 
          } 
        }),
        prisma.webhookEvent.count({
          where: { receivedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } // Last 90 days (bounded)
        }),
        prisma.webhookEvent.count({
          where: {
            receivedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }),
        prisma.alert.count({ where: { isAcknowledged: false } }),
        prisma.alert.count({ where: { isAcknowledged: false } })
      ]);

      // Get subscription tier breakdown
      const subscriptionStats = await prisma.hospital.groupBy({
        by: ['subscriptionTier'],
        _count: {
          subscriptionTier: true
        }
      });

      // Get module usage statistics (count hospitals with each module enabled)
      const [
        moduleHFCount,
        moduleEPCount,
        moduleSHCount,
        moduleCICount,
        modulePVCount,
        moduleVDCount
      ] = await Promise.all([
        prisma.hospital.count({ where: { moduleHeartFailure: true } }),
        prisma.hospital.count({ where: { moduleElectrophysiology: true } }),
        prisma.hospital.count({ where: { moduleStructuralHeart: true } }),
        prisma.hospital.count({ where: { moduleCoronaryIntervention: true } }),
        prisma.hospital.count({ where: { modulePeripheralVascular: true } }),
        prisma.hospital.count({ where: { moduleValvularDisease: true } })
      ]);

      // Get recent hospital registrations
      const recentHospitals = await prisma.hospital.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          hospitalType: true,
          subscriptionTier: true,
          patientCount: true,
          createdAt: true,
          subscriptionActive: true
        }
      });

      const dashboardData = {
        overview: {
          hospitals: {
            total: totalHospitals,
            active: activeHospitals,
            inactive: totalHospitals - activeHospitals
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          patients: {
            total: totalPatients,
            recentlyAdded: recentPatients
          },
          webhooks: {
            total: totalWebhookEvents,
            recent24h: recentWebhookEvents
          },
          alerts: {
            total: totalAlerts,
            unacknowledged: unacknowledgedAlerts
          }
        },
        subscriptions: subscriptionStats.reduce((acc, stat) => {
          acc[stat.subscriptionTier.toLowerCase()] = stat._count.subscriptionTier;
          return acc;
        }, {} as any),
        modules: {
          heartFailure: moduleHFCount,
          electrophysiology: moduleEPCount,
          structuralHeart: moduleSHCount,
          coronaryIntervention: moduleCICount,
          peripheralVascular: modulePVCount,
          valvularDisease: moduleVDCount
        },
        recentHospitals
      };

      res.json({
        success: true,
        data: dashboardData,
        message: 'Admin dashboard data retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Get All Hospitals (Admin view)
router.get('/hospitals', 
  authenticateToken, 
  authorizeRole(['super-admin']), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string; // 'active', 'inactive', 'all'
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { system: { contains: search, mode: 'insensitive' } },
          { npi: { contains: search } }
        ];
      }
      
      if (status === 'active') {
        where.subscriptionActive = true;
      } else if (status === 'inactive') {
        where.subscriptionActive = false;
      }

      const [hospitals, total] = await Promise.all([
        prisma.hospital.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                users: true,
                patients: true
              }
            }
          }
        }),
        prisma.hospital.count({ where })
      ]);

      res.json({
        success: true,
        data: hospitals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Hospitals retrieved successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve hospitals',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Create New Hospital
router.post('/hospitals',
  authenticateToken,
  authorizeRole(['super-admin']),
  [
    body('name').isLength({ min: 2 }).withMessage('Hospital name is required'),
    body('npi').optional().isLength({ min: 10, max: 10 }).withMessage('NPI must be 10 digits'),
    body('patientCount').isInt({ min: 0 }).withMessage('Patient count must be a positive integer'),
    body('bedCount').isInt({ min: 1 }).withMessage('Bed count must be a positive integer'),
    body('hospitalType').isIn(['COMMUNITY', 'ACADEMIC', 'SPECIALTY', 'CRITICAL_ACCESS', 'FEDERAL']),
    body('subscriptionTier').isIn(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
    body('street').isLength({ min: 1 }).withMessage('Street address is required'),
    body('city').isLength({ min: 1 }).withMessage('City is required'),
    body('state').isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters'),
    body('zipCode').isLength({ min: 5 }).withMessage('Zip code is required'),
    body('maxUsers').isInt({ min: 1 }).withMessage('Max users must be positive')
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
        name, system, npi, patientCount, bedCount, hospitalType,
        street, city, state, zipCode, country = 'USA',
        subscriptionTier, maxUsers,
        modules = {},
        redoxConfig = {}
      } = req.body;

      // Generate unique hospital ID
      const hospitalCount = await prisma.hospital.count();
      const hospitalId = `hosp-${String(hospitalCount + 1).padStart(3, '0')}`;

      // Generate Redox configuration
      const redoxSourceId = redoxConfig.sourceId || `${name.toLowerCase().replace(/\s+/g, '-')}-${hospitalId}`;
      const redoxDestinationId = redoxConfig.destinationId || `tailrd-${hospitalId}`;
      const redoxWebhookUrl = redoxConfig.webhookUrl || `https://api.tailrd.com/webhooks/redox/${hospitalId}`;

      const hospital = await prisma.hospital.create({
        data: {
          id: hospitalId,
          name,
          system,
          npi,
          patientCount,
          bedCount,
          hospitalType,
          street,
          city,
          state,
          zipCode,
          country,
          redoxSourceId,
          redoxDestinationId,
          redoxWebhookUrl,
          redoxIsActive: true,
          // Module configuration
          moduleHeartFailure: modules.heartFailure || false,
          moduleElectrophysiology: modules.electrophysiology || false,
          moduleStructuralHeart: modules.structuralHeart || false,
          moduleCoronaryIntervention: modules.coronaryIntervention || false,
          modulePeripheralVascular: modules.peripheralVascular || false,
          moduleValvularDisease: modules.valvularDisease || false,
          // Subscription
          subscriptionTier,
          subscriptionStart: new Date(),
          subscriptionActive: true,
          maxUsers
        },
        include: {
          _count: {
            select: {
              users: true,
              patients: true
            }
          }
        }
      });

      await writeAuditLog(req, 'HOSPITAL_CREATED', 'Hospital', hospital.id, `Created hospital: ${hospital.name}`);
      res.status(201).json({
        success: true,
        data: hospital,
        message: 'Hospital created successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Hospital with this NPI or Redox configuration already exists',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create hospital',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Update Hospital
router.put('/hospitals/:hospitalId',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hospitalId } = req.params;

      // Whitelist allowed update fields to prevent mass assignment
      const { name, displayName, address, city, state, zipCode, phone, website,
              logoUrl, primaryColor, secondaryColor, timezone, ehrSystem,
              subscriptionTier, subscriptionActive, maxUsers, enabledModules,
              contactName, contactEmail, contactPhone } = req.body;
      const updateData = Object.fromEntries(
        Object.entries({ name, displayName, address, city, state, zipCode, phone, website,
          logoUrl, primaryColor, secondaryColor, timezone, ehrSystem,
          subscriptionTier, subscriptionActive, maxUsers, enabledModules,
          contactName, contactEmail, contactPhone })
          .filter(([_, v]) => v !== undefined)
      );

      const hospital = await prisma.hospital.update({
        where: { id: hospitalId },
        data: updateData,
        include: {
          _count: {
            select: {
              users: true,
              patients: true
            }
          }
        }
      });

      await writeAuditLog(req, 'HOSPITAL_UPDATED', 'Hospital', req.params.hospitalId, 'Updated hospital configuration');
      res.json({
        success: true,
        data: hospital,
        message: 'Hospital updated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update hospital',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Get Hospital Details (Admin view with full info)
router.get('/hospitals/:hospitalId',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hospitalId } = req.params;

      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              title: true,
              role: true,
              isActive: true,
              lastLogin: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              patients: true,
              webhookEvents: true,
              loginSessions: { where: { isActive: true } }
            }
          }
        }
      });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Get recent activity stats
      const [recentPatients, recentWebhooks, activeAlerts] = await Promise.all([
        prisma.patient.count({
          where: {
            hospitalId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.webhookEvent.count({
          where: {
            hospitalId,
            receivedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.alert.count({
          where: {
            patient: { hospitalId },
            isAcknowledged: false
          }
        })
      ]);

      const hospitalWithStats = {
        ...hospital,
        recentActivity: {
          patientsLast30Days: recentPatients,
          webhooksLast24Hours: recentWebhooks,
          activeAlerts
        }
      };

      res.json({
        success: true,
        data: hospitalWithStats,
        message: 'Hospital details retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve hospital details',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Deactivate/Activate Hospital
router.patch('/hospitals/:hospitalId/status',
  authenticateToken,
  authorizeRole(['super-admin']),
  [
    body('active').isBoolean().withMessage('Active status must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hospitalId } = req.params;
      const { active } = req.body;

      const hospital = await prisma.hospital.update({
        where: { id: hospitalId },
        data: { subscriptionActive: active },
        include: {
          _count: {
            select: {
              users: true,
              patients: true
            }
          }
        }
      });

      await writeAuditLog(req, 'HOSPITAL_STATUS_CHANGED', 'Hospital', hospitalId,
        JSON.stringify({ newStatus: active, changedBy: req.user?.userId }));

      res.json({
        success: true,
        data: hospital,
        message: `Hospital ${active ? 'activated' : 'deactivated'} successfully`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to update hospital status',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Get All Users (Admin view)
router.get('/users',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const hospitalId = req.query.hospitalId as string;
      const role = req.query.role as string;
      const status = req.query.status as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (hospitalId) {
        where.hospitalId = hospitalId;
      }

      if (role) {
        where.role = role;
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            title: true,
            role: true,
            hospitalId: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            hospital: {
              select: {
                name: true,
                subscriptionActive: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Users retrieved successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Create User for Hospital
router.post('/hospitals/:hospitalId/users',
  authenticateToken,
  authorizeRole(['super-admin']),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
    body('role').isIn(['HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER', 'QUALITY_DIRECTOR', 'ANALYST', 'VIEWER']),
    body('password').isLength({ min: 12 }).matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/).withMessage('Password must be 12+ characters with uppercase, number, and special character')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hospitalId } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Check if hospital exists and has capacity
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        include: {
          _count: {
            select: { users: { where: { isActive: true } } }
          }
        }
      });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      if (hospital._count.users >= hospital.maxUsers) {
        return res.status(400).json({
          success: false,
          error: 'Hospital has reached maximum user limit',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const { email, password, firstName, lastName, title, role, permissions = {} } = req.body;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Set default permissions based on role
      const defaultPermissions = getDefaultPermissionsByRole(role, hospital);

      // Explicit allowlist — only these permission keys can be set via API.
      // Any other key (e.g. role, hospitalId, isActive) is silently dropped.
      const ALLOWED_PERMISSION_KEYS = [
        'permHeartFailure', 'permElectrophysiology', 'permStructuralHeart',
        'permCoronaryIntervention', 'permPeripheralVascular', 'permValvularDisease',
        'permAccessPHI', 'permManageUsers', 'permExportData',
        'permViewAnalytics', 'permManageSettings',
      ] as const;
      const safePermissions: Record<string, boolean> = {};
      for (const key of ALLOWED_PERMISSION_KEYS) {
        if (typeof (permissions as Record<string, unknown>)[key] === 'boolean') {
          safePermissions[key] = Boolean((permissions as Record<string, unknown>)[key]);
        }
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          title,
          role,
          hospitalId,
          ...defaultPermissions,
          ...safePermissions,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          title: true,
          role: true,
          hospitalId: true,
          isActive: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);
      await writeAuditLog(req, 'USER_CREATED', 'User', user.id, `Created user: ${user.role} at hospital ${req.params.hospitalId}`);

    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Update User
router.put('/users/:userId',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      // Whitelist allowed fields -- prevent mass assignment privilege escalation
      const { firstName, lastName, title, department, npi, isActive } = req.body;
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (title !== undefined) updateData.title = title;
      if (department !== undefined) updateData.department = department;
      if (npi !== undefined) updateData.npi = npi;
      if (isActive !== undefined) updateData.isActive = isActive;
      // role changes require explicit separate endpoint for audit trail
      // hospitalId, email, passwordHash, permissions are NEVER mass-assignable

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          title: true,
          role: true,
          hospitalId: true,
          isActive: true,
          lastLogin: true,
          hospital: {
            select: {
              name: true
            }
          }
        }
      });

      await writeAuditLog(req, 'USER_UPDATED', 'User', req.params.userId, 'Updated user profile/role');
      res.json({
        success: true,
        data: user,
        message: 'User updated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Helper function to set default permissions based on role
function getDefaultPermissionsByRole(role: string, hospital: any) {
  const permissions: any = {
    // Default all permissions to false
    permHeartFailure: false,
    permElectrophysiology: false,
    permStructuralHeart: false,
    permCoronaryIntervention: false,
    permPeripheralVascular: false,
    permValvularDisease: false,
    permExecutiveView: false,
    permServiceLineView: false,
    permCareTeamView: false,
    permViewReports: false,
    permExportData: false,
    permManageUsers: false,
    permConfigureAlerts: false,
    permAccessPHI: false
  };

  switch (role) {
    case 'HOSPITAL_ADMIN':
      // Full access to all modules enabled for the hospital
      permissions.permHeartFailure = hospital.moduleHeartFailure;
      permissions.permElectrophysiology = hospital.moduleElectrophysiology;
      permissions.permStructuralHeart = hospital.moduleStructuralHeart;
      permissions.permCoronaryIntervention = hospital.moduleCoronaryIntervention;
      permissions.permPeripheralVascular = hospital.modulePeripheralVascular;
      permissions.permValvularDisease = hospital.moduleValvularDisease;
      permissions.permExecutiveView = true;
      permissions.permServiceLineView = true;
      permissions.permCareTeamView = true;
      permissions.permViewReports = true;
      permissions.permExportData = true;
      permissions.permManageUsers = true;
      permissions.permConfigureAlerts = true;
      permissions.permAccessPHI = true;
      break;

    case 'PHYSICIAN':
      // Clinical modules access, no admin functions
      permissions.permHeartFailure = hospital.moduleHeartFailure;
      permissions.permElectrophysiology = hospital.moduleElectrophysiology;
      permissions.permStructuralHeart = hospital.moduleStructuralHeart;
      permissions.permCoronaryIntervention = hospital.moduleCoronaryIntervention;
      permissions.permPeripheralVascular = hospital.modulePeripheralVascular;
      permissions.permValvularDisease = hospital.moduleValvularDisease;
      permissions.permServiceLineView = true;
      permissions.permCareTeamView = true;
      permissions.permViewReports = true;
      permissions.permAccessPHI = true;
      break;

    case 'QUALITY_DIRECTOR':
      // Quality-focused access, no PHI
      permissions.permHeartFailure = hospital.moduleHeartFailure;
      permissions.permCoronaryIntervention = hospital.moduleCoronaryIntervention;
      permissions.permExecutiveView = true;
      permissions.permServiceLineView = true;
      permissions.permViewReports = true;
      permissions.permExportData = true;
      permissions.permConfigureAlerts = true;
      break;

    case 'ANALYST':
      // Read-only access to reports and analytics
      permissions.permHeartFailure = hospital.moduleHeartFailure;
      permissions.permElectrophysiology = hospital.moduleElectrophysiology;
      permissions.permStructuralHeart = hospital.moduleStructuralHeart;
      permissions.permCoronaryIntervention = hospital.moduleCoronaryIntervention;
      permissions.permPeripheralVascular = hospital.modulePeripheralVascular;
      permissions.permValvularDisease = hospital.moduleValvularDisease;
      permissions.permExecutiveView = true;
      permissions.permServiceLineView = true;
      permissions.permViewReports = true;
      break;

    case 'VIEWER':
      // Minimal read-only access
      permissions.permServiceLineView = true;
      permissions.permViewReports = true;
      break;
  }

  return permissions;
}

// ═══════════════════════════════════════════════════════════════════════════
// Super Admin Console Endpoints (mock data for frontend console)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/overview — Platform overview KPIs + activity feed
router.get('/overview',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        kpis: {
          totalHealthSystems: 3,
          totalActiveUsers: 12,
          totalPatients: 10660,
          totalGapFlags: 104,
          dataUploadsThisMonth: 7,
          platformUptime: 99.97,
        },
        healthSystems: [
          { name: 'Baylor Scott & White', abbr: 'BSW', status: 'Active', tier: 'Enterprise', users: 4, patients: 5280, location: 'Temple, TX' },
          { name: 'Mount Sinai Health System', abbr: 'MSH', status: 'Active', tier: 'Standard', users: 5, patients: 3540, location: 'New York, NY' },
          { name: 'Memorial Hermann', abbr: 'MH', status: 'Trial', tier: 'Trial', users: 3, patients: 1840, location: 'Houston, TX' },
        ],
        recentActivity: [
          { id: 'e01', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), type: 'login', user: 'Dr. Sarah Chen', hospital: 'BSW', description: 'Signed in to Care Team view' },
          { id: 'e02', timestamp: new Date(Date.now() - 8 * 60000).toISOString(), type: 'gap_action', user: 'Dr. James Wilson', hospital: 'Mount Sinai', description: 'Resolved 3 HF gaps for patient cohort' },
          { id: 'e03', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), type: 'upload', user: 'Admin Thompson', hospital: 'BSW', description: 'Uploaded Q1 2026 patient registry' },
          { id: 'e04', timestamp: new Date(Date.now() - 22 * 60000).toISOString(), type: 'login', user: 'Dr. Maria Rodriguez', hospital: 'Memorial Hermann', description: 'Signed in to Executive view' },
          { id: 'e05', timestamp: new Date(Date.now() - 35 * 60000).toISOString(), type: 'gap_action', user: 'NM Lisa Park', hospital: 'Mount Sinai', description: 'Flagged 5 EP patients for device follow-up' },
        ],
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/health-systems — list of health systems for console
router.get('/health-systems',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: [
        { id: 'hs-001', name: 'Baylor Scott & White', status: 'Active', tier: 'Enterprise', modules: ['HF','EP','SH','CAD','PV','VD'], users: 4, location: 'Temple, TX', contactEmail: 'admin@bswhealth.med', contractStart: '2025-06-01', mrr: 42000 },
        { id: 'hs-002', name: 'Mount Sinai Health System', status: 'Active', tier: 'Standard', modules: ['HF','EP','SH','CAD','PV','VD'], users: 5, location: 'New York, NY', contactEmail: 'admin@mountsinai.org', contractStart: '2025-09-15', mrr: 28000 },
        { id: 'hs-003', name: 'Memorial Hermann', status: 'Trial', tier: 'Trial', modules: ['HF','CAD','SH'], users: 3, location: 'Houston, TX', trialDaysRemaining: 14, contactEmail: 'admin@memhermann.org', contractStart: '2026-03-08', mrr: 0 },
      ],
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// POST /api/admin/health-systems — add health system (mock)
router.post('/health-systems',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(201).json({
      success: true,
      data: { id: `hs-${Date.now()}`, name: req.body.name || 'New Health System', status: 'Active', tier: req.body.tier || 'Standard' },
      message: 'Health system created successfully',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// PUT /api/admin/health-systems/:id — update health system (mock)
router.put('/health-systems/:id',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: { id: req.params.id, ...req.body },
      message: 'Health system updated',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/health-systems/:id/detail — health system detail (mock)
router.get('/health-systems/:id/detail',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: { id: req.params.id, name: 'Baylor Scott & White', status: 'Active', tier: 'Enterprise', users: 4, patients: 5280, modules: ['HF','EP','SH','CAD','PV','VD'], location: 'Temple, TX', dataQualityScore: 87 },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// POST /api/admin/users/invite — invite user (mock)
router.post('/users/invite',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(201).json({
      success: true,
      data: { inviteId: `inv-${Date.now()}`, email: req.body.email, role: req.body.role },
      message: 'Invitation sent',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/users/:id/activity — user activity detail (mock)
router.get('/users/:id/activity',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = req.params.id;
      const callerRole = (req.user?.role ?? '').toLowerCase().replace(/_/g, '-');
      const callerHospitalId = req.user?.hospitalId;

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, hospitalId: true, role: true },
      });

      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' } as APIResponse);
      }

      if (callerRole !== 'super-admin' && targetUser.hospitalId !== callerHospitalId) {
        return res.status(403).json({ success: false, error: 'Cross-tenant access denied' } as APIResponse);
      }

      const limitParam = Number.parseInt(String(req.query.limit ?? '50'), 10);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

      const [loginEvents, actionEvents] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            userId: targetUserId,
            action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'MFA_CHALLENGE', 'MFA_SUCCESS', 'MFA_FAILURE'] },
          },
          orderBy: { timestamp: 'desc' },
          take: limit,
          select: { id: true, action: true, ipAddress: true, timestamp: true, description: true },
        }),
        prisma.auditLog.findMany({
          where: {
            userId: targetUserId,
            action: { notIn: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'MFA_CHALLENGE', 'MFA_SUCCESS', 'MFA_FAILURE'] },
          },
          orderBy: { timestamp: 'desc' },
          take: limit,
          select: {
            id: true,
            action: true,
            resourceType: true,
            resourceId: true,
            description: true,
            timestamp: true,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          userEmail: targetUser.email,
          hospitalId: targetUser.hospitalId,
          loginHistory: loginEvents.map(e => ({
            id: e.id,
            timestamp: e.timestamp.toISOString(),
            ip: e.ipAddress ?? null,
            success: e.action === 'LOGIN_SUCCESS' || e.action === 'MFA_SUCCESS',
            action: e.action,
            description: e.description,
          })),
          recentActions: actionEvents.map(e => ({
            id: e.id,
            timestamp: e.timestamp.toISOString(),
            action: e.action,
            resourceType: e.resourceType,
            resourceId: e.resourceId,
            detail: e.description,
          })),
        },
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error) {
      logger.error('Failed to fetch user activity', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch user activity' } as APIResponse);
    }
  }
);

// GET /api/admin/config — platform configuration (real data)
router.get('/config',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const [hospitals, totalUsers, totalPatients, totalGaps] = await Promise.all([
        prisma.hospital.findMany({
          select: {
            id: true, name: true, subscriptionTier: true, subscriptionActive: true, maxUsers: true,
            moduleHeartFailure: true, moduleElectrophysiology: true, moduleStructuralHeart: true,
            moduleCoronaryIntervention: true, modulePeripheralVascular: true, moduleValvularDisease: true,
            _count: { select: { users: true, patients: true } },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.patient.count({ where: { isActive: true } }),
        prisma.therapyGap.count({ where: { resolvedAt: null } }),
      ]);

      const moduleConfig: Record<string, Record<string, boolean>> = {};
      for (const h of hospitals) {
        moduleConfig[h.id] = {
          hf: h.moduleHeartFailure, ep: h.moduleElectrophysiology, sh: h.moduleStructuralHeart,
          cad: h.moduleCoronaryIntervention, pv: h.modulePeripheralVascular, vd: h.moduleValvularDisease,
        };
      }

      res.json({
        success: true,
        data: {
          platformStats: { totalHospitals: hospitals.length, totalUsers, totalPatients, totalOpenGaps: totalGaps },
          moduleConfig,
          hospitals: hospitals.map(h => ({
            id: h.id, name: h.name, tier: h.subscriptionTier, active: h.subscriptionActive,
            users: h._count.users, patients: h._count.patients, maxUsers: h.maxUsers,
          })),
          featureFlags: { demoMode: false, clinicalTrials: true, registryAssist: true, predictiveLayer: false, mfaEnforcement: true },
          maintenanceMode: false,
        },
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error) {
      logger.error('Failed to fetch platform config', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to fetch platform configuration' });
    }
  }
);

// PUT /api/admin/config/modules/:hospitalId
router.put('/config/modules/:hospitalId',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: { hospitalId: req.params.hospitalId, modules: req.body }, message: 'Module configuration updated', timestamp: new Date().toISOString() } as APIResponse);
  }
);

// PUT /api/admin/config/feature-flags
router.put('/config/feature-flags',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: req.body, message: 'Feature flags updated', timestamp: new Date().toISOString() } as APIResponse);
  }
);

// PUT /api/admin/config/maintenance
router.put('/config/maintenance',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: { maintenanceMode: req.body.enabled, scheduledEnd: req.body.scheduledEnd }, message: req.body.enabled ? 'Maintenance mode activated' : 'Maintenance mode deactivated', timestamp: new Date().toISOString() } as APIResponse);
  }
);

// GET /api/admin/audit — audit + security overview (mock)
router.get('/audit',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        securitySummary: { failedLogins: 3, suspiciousIPs: 1, phiRejections: 0 },
        mfaStatus: { enabled: 7, disabled: 5, total: 12, adoptionRate: 58 },
        ipAllowlist: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/security/failed-logins
router.get('/security/failed-logins',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: [
        { id: 'fl-1', email: 'unknown@external.com', ip: '203.0.113.42', timestamp: '2026-03-22 03:14:22', reason: 'Invalid credentials' },
        { id: 'fl-2', email: 'sarah.chen@bswhealth.med', ip: '10.0.1.42', timestamp: '2026-03-21 08:45:11', reason: 'Wrong password (1/5)' },
        { id: 'fl-3', email: 'admin@test.com', ip: '198.51.100.77', timestamp: '2026-03-20 22:30:05', reason: 'Account not found' },
      ],
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/security/active-sessions
router.get('/security/active-sessions',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: [
        { id: 'as-1', user: 'Sarah Chen', hospital: 'BSW', ip: '10.0.1.42', startedAt: '2026-03-22 08:15', lastActivity: '2 min ago' },
        { id: 'as-2', user: 'James Wilson', hospital: 'Mount Sinai', ip: '172.16.5.88', startedAt: '2026-03-22 08:45', lastActivity: '5 min ago' },
        { id: 'as-3', user: 'Maria Rodriguez', hospital: 'Memorial Hermann', ip: '192.168.10.12', startedAt: '2026-03-22 06:20', lastActivity: '15 min ago' },
        { id: 'as-4', user: 'Platform Admin', hospital: 'TAILRD', ip: '10.0.0.1', startedAt: '2026-03-22 09:00', lastActivity: 'Now' },
      ],
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/security/mfa-status
router.get('/security/mfa-status',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: { enabled: 7, disabled: 5, total: 12, adoptionRate: 58, byHospital: { BSW: { enabled: 3, total: 4 }, 'Mount Sinai': { enabled: 3, total: 5 }, 'Memorial Hermann': { enabled: 1, total: 3 } } },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/customer-success
router.get('/customer-success',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        platformSummary: { totalGapsIdentified: 10660, totalGapsActioned: 3624, actionRate: 34, estimatedRevenueRecovered: 47200000 },
        hospitals: [
          { id: 'hs-001', name: 'Baylor Scott & White', gapClosureRate: 42, avgTimeToAction: '2.3 days', physicianEngagement: '3/4', revenueRecovered: 22400000 },
          { id: 'hs-002', name: 'Mount Sinai', gapClosureRate: 34, avgTimeToAction: '3.1 days', physicianEngagement: '4/5', revenueRecovered: 18200000 },
          { id: 'hs-003', name: 'Memorial Hermann', gapClosureRate: 18, avgTimeToAction: '5.7 days', physicianEngagement: '2/3', revenueRecovered: 6600000 },
        ],
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// GET /api/admin/data-quality
router.get('/data-quality',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        hospitals: [
          { id: 'hs-001', name: 'Baylor Scott & White', abbr: 'BSW', totalPatients: 5280, observations: 42240, gapFlags: 52, storageUsedMB: 2840, lastUpload: '2026-03-22', dataQualityScore: 87 },
          { id: 'hs-002', name: 'Mount Sinai Health System', abbr: 'MSH', totalPatients: 3540, observations: 28320, gapFlags: 38, storageUsedMB: 1920, lastUpload: '2026-03-21', dataQualityScore: 72 },
          { id: 'hs-003', name: 'Memorial Hermann', abbr: 'MH', totalPatients: 1840, observations: 11040, gapFlags: 14, storageUsedMB: 680, lastUpload: '2026-03-18', dataQualityScore: 45 },
        ],
        fieldCompleteness: [
          { field: 'LVEF Populated', bsw: 94, msh: 78, mh: 45 },
          { field: 'Medications', bsw: 91, msh: 65, mh: 38 },
          { field: 'Lab Results (BNP)', bsw: 88, msh: 71, mh: 42 },
          { field: 'Procedure Dates', bsw: 96, msh: 82, mh: 55 },
          { field: 'Device Serial Numbers', bsw: 82, msh: 58, mh: 22 },
          { field: 'Follow-up Scheduling', bsw: 78, msh: 61, mh: 35 },
        ],
        recommendations: [
          { hospital: 'Memorial Hermann', field: 'Device Serial Numbers', currentRate: 22, suggestion: 'Implement barcode scanning at device implant.' },
          { hospital: 'Memorial Hermann', field: 'Medications', currentRate: 38, suggestion: 'Enable Redox medication reconciliation feed.' },
          { hospital: 'Mount Sinai', field: 'Device Serial Numbers', currentRate: 58, suggestion: 'Cross-reference implant registry with device tracking module.' },
        ],
      },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

export = router;