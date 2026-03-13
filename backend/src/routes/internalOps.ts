/**
 * Internal Operations Routes — BAA tracking, credential delivery, internal notes.
 *
 * Super-admin only. These endpoints power the TAILRD internal dashboard
 * for managing hospital onboarding lifecycle, legal agreements, and
 * support communications.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { APIResponse, PaginatedResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import {
  validateBody,
  createBAASchema,
  createInternalNoteSchema,
} from '../validation/clinicalSchemas';
import prisma from '../lib/prisma';

const router = Router();

// All internal ops require authentication + super-admin
router.use(authenticateToken);
router.use(authorizeRole(['super-admin']));

// ═══════════════════════════════════════════════════════════════════════════════
// BAA (Business Associate Agreement) TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

// List all BAAs
router.get('/baa', async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = req.query.hospitalId as string;
    const status = req.query.status as string;

    const where: any = {};
    if (hospitalId) where.hospitalId = hospitalId;
    if (status) where.status = status;

    const baas = await prisma.onboarding.findMany({
      where: { ...where, stepName: 'BAA_EXECUTION' },
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: baas,
      message: `${baas.length} BAA records`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// Create/track BAA for a hospital
router.post('/baa', async (req: AuthenticatedRequest, res) => {
  try {
    const validation = createBAASchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const data = validation.data;

    const baa = await prisma.onboarding.create({
      data: {
        hospitalId: data.hospitalId,
        stepName: 'BAA_EXECUTION',
        status: 'IN_PROGRESS',
        stepData: {
          signatoryName: data.signatoryName,
          signatoryTitle: data.signatoryTitle,
          signatoryEmail: data.signatoryEmail,
          effectiveDate: data.effectiveDate,
          expirationDate: data.expirationDate,
          documentId: `baa-${crypto.randomUUID()}`,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: baa,
      message: 'BAA tracking record created',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// Update BAA status (executed, expired, etc.)
router.patch('/baa/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'TERMINATED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const updated = await prisma.onboarding.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        ...(notes ? { notes } : {}),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `BAA status updated to ${status}`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL DELIVERY
// ═══════════════════════════════════════════════════════════════════════════════

// Generate and track credential delivery for hospital users
router.post('/credentials/:hospitalId/generate', async (req: AuthenticatedRequest, res) => {
  try {
    const { hospitalId } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        users: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, email: true, firstName: true, lastName: true, role: true, lastLogin: true },
        },
      },
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Generate temporary credentials for users who haven't logged in
    const credentialPackages = hospital.users
      .filter(u => !u.lastLogin)
      .map(user => ({
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        tempPassword: generateSecurePassword(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h expiry
      }));

    // Track credential delivery in onboarding
    if (credentialPackages.length > 0) {
      await prisma.onboarding.create({
        data: {
          hospitalId,
          stepName: 'CREDENTIAL_DELIVERY',
          status: 'COMPLETED',
          completedAt: new Date(),
          stepData: {
            deliveredCount: credentialPackages.length,
            deliveredAt: new Date().toISOString(),
            recipientEmails: credentialPackages.map(c => c.email),
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        hospitalName: hospital.name,
        totalUsers: hospital.users.length,
        pendingActivation: credentialPackages.length,
        credentials: credentialPackages,
      },
      message: `Generated ${credentialPackages.length} credential packages`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL NOTES
// ═══════════════════════════════════════════════════════════════════════════════

// List internal notes for a hospital
router.get('/notes/:hospitalId', async (req: AuthenticatedRequest, res) => {
  try {
    const { hospitalId } = req.params;
    const noteType = req.query.type as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const skip = (page - 1) * limit;

    const where: any = { hospitalId };
    if (noteType) where.noteType = noteType;

    const [notes, total] = await Promise.all([
      prisma.internalNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.internalNote.count({ where }),
    ]);

    const response: PaginatedResponse = {
      success: true,
      data: notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      message: `${notes.length} notes`,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// Create internal note
router.post('/notes', async (req: AuthenticatedRequest, res) => {
  try {
    const validation = createInternalNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const data = validation.data;
    const note = await prisma.internalNote.create({
      data: {
        hospitalId: data.hospitalId,
        noteType: data.noteType,
        title: data.title,
        content: data.content,
        priority: data.priority,
        isInternal: data.isInternal,
        createdBy: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: note,
      message: 'Internal note created',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HOSPITAL LIFECYCLE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalHospitals,
      activeHospitals,
      totalPatients,
      totalUsers,
      recentWebhooks,
      failedWebhooks,
      onboardingSteps,
    ] = await Promise.all([
      prisma.hospital.count(),
      prisma.hospital.count({ where: { subscriptionActive: true } }),
      prisma.patient.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.webhookEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
      prisma.onboarding.groupBy({ by: ['status'], _count: true }),
    ]);

    res.json({
      success: true,
      data: {
        hospitals: { total: totalHospitals, active: activeHospitals },
        patients: { total: totalPatients },
        users: { total: totalUsers },
        webhooks: { last24h: recentWebhooks, failed: failedWebhooks },
        onboarding: onboardingSteps.map(s => ({ status: s.status, count: s._count })),
      },
      message: 'Internal ops dashboard',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  let password = '';
  // Guarantee one of each category
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export = router;
