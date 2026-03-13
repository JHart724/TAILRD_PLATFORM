/**
 * Breach Notification & Incident Response Routes
 *
 * Implements HIPAA Breach Notification Rule (45 CFR §§ 164.400-414):
 *   - 60-day notification timeline to HHS OCR
 *   - Individual notification for all affected
 *   - Media notification if ≥500 records in a state
 *   - Documentation and risk assessment tracking
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All breach routes require super-admin
router.use(authenticateToken);
router.use(authorizeRole(['super-admin']));

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const createBreachSchema = z.object({
  hospitalId: z.string().optional(),
  discoveredAt: z.string().datetime(),
  incidentType: z.enum([
    'UNAUTHORIZED_ACCESS', 'UNAUTHORIZED_DISCLOSURE', 'LOSS_OF_DATA',
    'THEFT_OF_DATA', 'IMPROPER_DISPOSAL', 'HACKING_IT_INCIDENT', 'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(10).max(5000),
  affectedRecords: z.number().int().min(0).optional(),
  affectedFields: z.array(z.string()).optional().default([]),
  affectedPatientIds: z.array(z.string()).optional().default([]),
});

const updateBreachSchema = z.object({
  status: z.enum([
    'DISCOVERED', 'INVESTIGATING', 'CONTAINED', 'RISK_ASSESSED',
    'HHS_NOTIFIED', 'INDIVIDUALS_NOTIFIED', 'REMEDIATED', 'CLOSED',
  ]).optional(),
  rootCause: z.string().max(5000).optional(),
  containmentActions: z.string().max(5000).optional(),
  remediationPlan: z.string().max(5000).optional(),
  internalNotes: z.string().max(10000).optional(),
  affectedRecords: z.number().int().min(0).optional(),
  investigationStarted: z.string().datetime().optional(),
  riskAssessmentCompleted: z.string().datetime().optional(),
  hhsNotifiedAt: z.string().datetime().optional(),
  individualsNotifiedAt: z.string().datetime().optional(),
  mediaNotifiedAt: z.string().datetime().optional(),
  legalReview: z.boolean().optional(),
}).strict();

// ── Routes ──────────────────────────────────────────────────────────────────

// POST / — Report a new breach incident
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createBreachSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const discoveredDate = new Date(data.discoveredAt);

    // Calculate HIPAA 60-day notification deadline
    const hhsDeadline = new Date(discoveredDate);
    hhsDeadline.setDate(hhsDeadline.getDate() + 60);

    const incident = await prisma.breachIncident.create({
      data: {
        hospitalId: data.hospitalId || null,
        discoveredAt: discoveredDate,
        discoveredBy: req.user!.userId,
        incidentType: data.incidentType,
        severity: data.severity,
        description: data.description,
        affectedRecords: data.affectedRecords,
        affectedFields: data.affectedFields,
        affectedPatientIds: data.affectedPatientIds,
        status: 'DISCOVERED',
        statusHistory: [{
          status: 'DISCOVERED',
          timestamp: new Date().toISOString(),
          updatedBy: req.user!.userId,
          notes: 'Incident reported',
        }],
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        incident,
        hipaaTimeline: {
          discoveredAt: discoveredDate.toISOString(),
          hhsNotificationDeadline: hhsDeadline.toISOString(),
          daysRemaining: Math.ceil((hhsDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          requiresMediaNotification: (data.affectedRecords ?? 0) >= 500,
        },
      },
      message: 'Breach incident created — HIPAA 60-day clock started',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET / — List all breach incidents
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, severity } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const incidents = await prisma.breachIncident.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
    });

    // Add timeline info to each
    const withTimeline = incidents.map((inc) => {
      const deadline = new Date(inc.discoveredAt);
      deadline.setDate(deadline.getDate() + 60);
      const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ...inc,
        hipaaTimeline: {
          hhsNotificationDeadline: deadline.toISOString(),
          daysRemaining,
          overdue: daysRemaining < 0 && !inc.hhsNotifiedAt,
          requiresMediaNotification: (inc.affectedRecords ?? 0) >= 500,
        },
      };
    });

    return res.json({ success: true, data: withTimeline });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:id — Get breach incident detail
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incident = await prisma.breachIncident.findUnique({
      where: { id: req.params.id },
    });
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const deadline = new Date(incident.discoveredAt);
    deadline.setDate(deadline.getDate() + 60);

    return res.json({
      success: true,
      data: {
        ...incident,
        hipaaTimeline: {
          discoveredAt: incident.discoveredAt.toISOString(),
          hhsNotificationDeadline: deadline.toISOString(),
          daysRemaining: Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          overdue: !incident.hhsNotifiedAt && Date.now() > deadline.getTime(),
          requiresMediaNotification: (incident.affectedRecords ?? 0) >= 500,
          investigationStarted: !!incident.investigationStarted,
          riskAssessmentCompleted: !!incident.riskAssessmentCompleted,
          hhsNotified: !!incident.hhsNotifiedAt,
          individualsNotified: !!incident.individualsNotifiedAt,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /:id — Update breach incident (status transitions, investigation data)
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = updateBreachSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.breachIncident.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const updateData: any = { ...parsed.data };

    // Convert datetime strings to Date objects
    for (const field of ['investigationStarted', 'riskAssessmentCompleted', 'hhsNotifiedAt', 'individualsNotifiedAt', 'mediaNotifiedAt']) {
      if (updateData[field]) updateData[field] = new Date(updateData[field]);
    }

    // Track legal review
    if (parsed.data.legalReview) {
      updateData.legalReviewedBy = req.user!.userId;
      updateData.legalReviewedAt = new Date();
    }

    // Append to status history if status changed
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const history = (existing.statusHistory as any[]) || [];
      history.push({
        status: parsed.data.status,
        timestamp: new Date().toISOString(),
        updatedBy: req.user!.userId,
        notes: parsed.data.internalNotes || `Status changed to ${parsed.data.status}`,
      });
      updateData.statusHistory = history;
    }

    const updated = await prisma.breachIncident.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated, message: 'Incident updated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /overdue — Get all incidents past HIPAA 60-day deadline without HHS notification
router.get('/compliance/overdue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const overdue = await prisma.breachIncident.findMany({
      where: {
        discoveredAt: { lte: sixtyDaysAgo },
        hhsNotifiedAt: null,
        status: { notIn: ['CLOSED', 'REMEDIATED'] },
      },
      orderBy: { discoveredAt: 'asc' },
    });

    return res.json({
      success: true,
      data: overdue,
      meta: { overdueCount: overdue.length },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
export default router;
