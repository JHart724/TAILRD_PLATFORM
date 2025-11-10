import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Hospital Onboarding Workflow
router.post('/hospitals',
  authenticateToken,
  authorizeRole(['super-admin']),
  [
    body('hospitalInfo.name').isLength({ min: 2 }).withMessage('Hospital name is required'),
    body('hospitalInfo.patientCount').isInt({ min: 0 }).withMessage('Patient count must be a positive integer'),
    body('hospitalInfo.bedCount').isInt({ min: 1 }).withMessage('Bed count must be a positive integer'),
    body('hospitalInfo.hospitalType').isIn(['COMMUNITY', 'ACADEMIC', 'SPECIALTY', 'CRITICAL_ACCESS', 'FEDERAL']),
    body('adminUser.firstName').isLength({ min: 1 }).withMessage('Admin first name is required'),
    body('adminUser.lastName').isLength({ min: 1 }).withMessage('Admin last name is required'),
    body('adminUser.email').isEmail().withMessage('Valid admin email is required'),
    body('adminUser.password').isLength({ min: 8 }).withMessage('Admin password must be at least 8 characters'),
    body('subscription.tier').isIn(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
    body('subscription.maxUsers').isInt({ min: 1 }).withMessage('Max users must be positive')
  ],
  async (req: AuthenticatedRequest, res) => {
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

      const { hospitalInfo, adminUser, subscription, modules = {}, redoxConfig = {} } = req.body;

      // Start transaction for atomic onboarding
      const result = await prisma.$transaction(async (tx) => {
        // Generate unique hospital ID
        const hospitalCount = await tx.hospital.count();
        const hospitalId = `hosp-${String(hospitalCount + 1).padStart(3, '0')}`;

        // Generate Redox configuration
        const redoxSourceId = redoxConfig.sourceId || 
          `${hospitalInfo.name.toLowerCase().replace(/\s+/g, '-')}-${hospitalId}`;
        const redoxDestinationId = redoxConfig.destinationId || `tailrd-${hospitalId}`;
        const redoxWebhookUrl = redoxConfig.webhookUrl || 
          `https://api.tailrd.com/webhooks/redox/${hospitalId}`;

        // Create hospital
        const hospital = await tx.hospital.create({
          data: {
            id: hospitalId,
            name: hospitalInfo.name,
            system: hospitalInfo.system,
            npi: hospitalInfo.npi,
            patientCount: hospitalInfo.patientCount,
            bedCount: hospitalInfo.bedCount,
            hospitalType: hospitalInfo.hospitalType,
            street: hospitalInfo.address.street,
            city: hospitalInfo.address.city,
            state: hospitalInfo.address.state,
            zipCode: hospitalInfo.address.zipCode,
            country: hospitalInfo.address.country || 'USA',
            redoxSourceId,
            redoxDestinationId,
            redoxWebhookUrl,
            redoxIsActive: false, // Will be activated after Redox setup
            // Module configuration with defaults
            moduleHeartFailure: modules.heartFailure || true, // Default enabled
            moduleElectrophysiology: modules.electrophysiology || false,
            moduleStructuralHeart: modules.structuralHeart || false,
            moduleCoronaryIntervention: modules.coronaryIntervention || true, // Default enabled
            modulePeripheralVascular: modules.peripheralVascular || false,
            moduleValvularDisease: modules.valvularDisease || false,
            // Subscription
            subscriptionTier: subscription.tier,
            subscriptionStart: new Date(),
            subscriptionActive: true,
            maxUsers: subscription.maxUsers
          }
        });

        // Hash admin password
        const passwordHash = await bcrypt.hash(adminUser.password, 12);

        // Create hospital admin user
        const admin = await tx.user.create({
          data: {
            email: adminUser.email,
            passwordHash,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            title: adminUser.title || 'Hospital Administrator',
            role: 'HOSPITAL_ADMIN',
            hospitalId: hospital.id,
            // Full permissions for hospital admin
            permHeartFailure: hospital.moduleHeartFailure,
            permElectrophysiology: hospital.moduleElectrophysiology,
            permStructuralHeart: hospital.moduleStructuralHeart,
            permCoronaryIntervention: hospital.moduleCoronaryIntervention,
            permPeripheralVascular: hospital.modulePeripheralVascular,
            permValvularDisease: hospital.moduleValvularDisease,
            permExecutiveView: true,
            permServiceLineView: true,
            permCareTeamView: true,
            permViewReports: true,
            permExportData: true,
            permManageUsers: true,
            permConfigureAlerts: true,
            permAccessPHI: true
          }
        });

        return { hospital, admin };
      });

      // Generate onboarding checklist
      const onboardingTasks = generateOnboardingChecklist(result.hospital, result.admin);

      res.status(201).json({
        success: true,
        data: {
          hospital: result.hospital,
          adminUser: {
            id: result.admin.id,
            email: result.admin.email,
            firstName: result.admin.firstName,
            lastName: result.admin.lastName,
            title: result.admin.title,
            role: result.admin.role
          },
          onboardingTasks,
          nextSteps: [
            'Configure Redox integration with provided webhook URL',
            'Test EHR connectivity and data flow',
            'Set up additional users and roles',
            'Configure clinical alerts and thresholds',
            'Train staff on platform usage'
          ]
        },
        message: 'Hospital onboarded successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Hospital with this NPI or admin email already exists',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to onboard hospital',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Get Onboarding Status
router.get('/hospitals/:hospitalId/status',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { hospitalId } = req.params;

      // Check if user can access this hospital
      if (req.user?.role !== 'super-admin' && req.user?.hospitalId !== hospitalId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true
            }
          },
          _count: {
            select: {
              patients: true,
              webhookEvents: true
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

      // Calculate onboarding progress
      const onboardingStatus = calculateOnboardingProgress(hospital);

      res.json({
        success: true,
        data: {
          hospital: {
            id: hospital.id,
            name: hospital.name,
            subscriptionActive: hospital.subscriptionActive,
            redoxIsActive: hospital.redoxIsActive
          },
          onboardingStatus,
          users: hospital.users,
          stats: {
            patientCount: hospital._count.patients,
            webhookEvents: hospital._count.webhookEvents
          }
        },
        message: 'Onboarding status retrieved',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve onboarding status',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Update Onboarding Step
router.patch('/hospitals/:hospitalId/onboarding/:step',
  authenticateToken,
  authorizeRole(['super-admin', 'hospital-admin']),
  [
    body('completed').isBoolean().withMessage('Completed status must be boolean'),
    body('notes').optional().isString()
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const { hospitalId, step } = req.params;
      const { completed, notes } = req.body;

      // Handle different onboarding steps
      let updateData: any = {};

      switch (step) {
        case 'redox-setup':
          updateData.redoxIsActive = completed;
          break;
        case 'user-setup':
          // Additional validation could be added here
          break;
        case 'data-sync':
          // Mark as having received first webhook data
          break;
        case 'training':
          // Could track training completion
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid onboarding step',
            timestamp: new Date().toISOString()
          } as APIResponse);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.hospital.update({
          where: { id: hospitalId },
          data: updateData
        });
      }

      res.json({
        success: true,
        data: {
          step,
          completed,
          notes,
          updatedAt: new Date().toISOString()
        },
        message: `Onboarding step '${step}' updated`,
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to update onboarding step',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Generate Hospital API Keys for Redox
router.post('/hospitals/:hospitalId/api-keys',
  authenticateToken,
  authorizeRole(['super-admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { hospitalId } = req.params;

      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
      });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Generate API keys for hospital-specific integrations
      const apiKey = `tailrd_${hospitalId}_${generateRandomString(32)}`;
      const webhookSecret = generateRandomString(64);

      // In production, store these securely (encrypted)
      const apiKeys = {
        hospitalId,
        apiKey,
        webhookSecret,
        redoxWebhookUrl: hospital.redoxWebhookUrl,
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: apiKeys,
        message: 'API keys generated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate API keys',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
);

// Helper Functions

function generateOnboardingChecklist(hospital: any, admin: any) {
  return [
    {
      id: 'hospital-setup',
      title: 'Hospital Configuration',
      description: 'Basic hospital information and settings configured',
      completed: true,
      completedAt: new Date().toISOString()
    },
    {
      id: 'admin-user',
      title: 'Administrator Account',
      description: 'Hospital administrator account created and configured',
      completed: true,
      completedAt: new Date().toISOString()
    },
    {
      id: 'redox-setup',
      title: 'EHR Integration Setup',
      description: 'Configure Redox integration with hospital EHR system',
      completed: hospital.redoxIsActive,
      instructions: [
        'Configure EHR system with provided webhook URL',
        'Set up data mapping for FHIR resources',
        'Test connectivity and data flow',
        'Activate real-time data streaming'
      ]
    },
    {
      id: 'user-setup',
      title: 'Additional Users',
      description: 'Create physician, nurse, and analyst accounts',
      completed: false,
      instructions: [
        'Add physician users with appropriate module access',
        'Create quality director and analyst accounts',
        'Configure role-based permissions',
        'Send welcome emails with login instructions'
      ]
    },
    {
      id: 'module-config',
      title: 'Module Configuration',
      description: 'Configure clinical modules and alerts',
      completed: false,
      instructions: [
        'Set up clinical alert thresholds',
        'Configure risk stratification rules',
        'Customize dashboard layouts',
        'Enable desired cardiovascular modules'
      ]
    },
    {
      id: 'data-sync',
      title: 'Data Synchronization',
      description: 'Initial patient data import and validation',
      completed: false,
      instructions: [
        'Import historical patient data',
        'Validate data quality and completeness',
        'Test real-time data streaming',
        'Verify patient matching and deduplication'
      ]
    },
    {
      id: 'training',
      title: 'Staff Training',
      description: 'Train hospital staff on platform usage',
      completed: false,
      instructions: [
        'Conduct administrator training session',
        'Train physicians on clinical workflows',
        'Provide quality team with reporting training',
        'Create custom training materials'
      ]
    },
    {
      id: 'go-live',
      title: 'Go Live',
      description: 'Platform ready for production use',
      completed: false,
      instructions: [
        'Complete final testing and validation',
        'Activate all monitoring and alerts',
        'Enable production data flow',
        'Schedule go-live celebration!'
      ]
    }
  ];
}

function calculateOnboardingProgress(hospital: any) {
  const totalSteps = 8;
  let completedSteps = 2; // Hospital setup and admin user always completed

  if (hospital.redoxIsActive) completedSteps++;
  if (hospital.users.length > 1) completedSteps++; // Additional users created
  if (hospital._count.webhookEvents > 0) completedSteps++; // Data sync started

  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  return {
    totalSteps,
    completedSteps,
    progressPercentage,
    currentPhase: getOnboardingPhase(progressPercentage),
    estimatedCompletion: calculateEstimatedCompletion(progressPercentage)
  };
}

function getOnboardingPhase(progressPercentage: number): string {
  if (progressPercentage < 25) return 'Initial Setup';
  if (progressPercentage < 50) return 'EHR Integration';
  if (progressPercentage < 75) return 'Configuration & Testing';
  if (progressPercentage < 100) return 'Training & Validation';
  return 'Production Ready';
}

function calculateEstimatedCompletion(progressPercentage: number): string {
  const daysRemaining = Math.ceil((100 - progressPercentage) / 100 * 14); // Assume 14-day onboarding
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysRemaining);
  return completionDate.toISOString().split('T')[0];
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export = router;