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
import { writeAuditLog } from '../middleware/auditLogger';
import {
  queueCeNotification,
  sendCeNotification,
  recordCeDelivery,
  recordCeAcknowledgment,
  recordCeFollowupRequest,
  recordCeFollowupResponse,
  closeCeNotification,
  InvalidStateTransitionError,
  CoveredEntityNotLinkedError,
  BreachIncidentNotFoundError,
  NotImplementedError as ChannelNotImplementedError,
  BreachCeNotificationServiceError,
  type NotificationChannel,
} from '../services/breachCeNotificationService';
import {
  TenantScopeViolationError,
  type AuthenticatedActor,
} from '../services/coveredEntityService';

const router = Router();

// All breach routes require super-admin
router.use(authenticateToken);
router.use(authorizeRole(['SUPER_ADMIN']));

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
    await writeAuditLog(req, 'BREACH_DATA_ACCESSED', 'BreachIncident', 'all', 'Super-admin listed breach incidents');
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

// GET /overdue-check — Automated breach deadline warning for cron/dashboard
router.get('/overdue-check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await checkBreachDeadlines();

    // Also return the detailed list for dashboard display
    const now = new Date();
    const openBreaches = await prisma.breachIncident.findMany({
      where: {
        status: { not: 'CLOSED' },
        hhsNotifiedAt: null,
      },
      orderBy: { discoveredAt: 'asc' },
    });

    const breaches = openBreaches.map((inc) => {
      const deadline = new Date(inc.discoveredAt);
      deadline.setDate(deadline.getDate() + 60);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: inc.id,
        discoveredAt: inc.discoveredAt.toISOString(),
        incidentType: inc.incidentType,
        severity: inc.severity,
        status: inc.status,
        hhsDeadline: deadline.toISOString(),
        daysRemaining,
        overdue: daysRemaining < 0,
        approaching: daysRemaining >= 0 && daysRemaining <= 14,
      };
    });

    return res.json({
      success: true,
      data: {
        summary: result,
        breaches,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:id — Get breach incident detail
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await writeAuditLog(req, 'BREACH_DATA_ACCESSED', 'BreachIncident', req.params.id, 'Super-admin viewed breach incident detail');
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
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', req.params.id, 'Super-admin updated breach incident');
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

/**
 * Check all open breach incidents against the HIPAA 60-day notification deadline.
 * Returns counts of overdue and approaching (within 14 days) breaches.
 * Designed to be called from a cron schedule.
 */
export async function checkBreachDeadlines(): Promise<{ overdue: number; approaching: number }> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const fortysixDaysAgo = new Date(now);
  fortysixDaysAgo.setDate(fortysixDaysAgo.getDate() - 46); // 60 - 14 = 46 days ago means 14 days remaining

  // Overdue: discovered more than 60 days ago, not notified, not closed
  const overdue = await prisma.breachIncident.count({
    where: {
      discoveredAt: { lt: sixtyDaysAgo },
      hhsNotifiedAt: null,
      status: { not: 'CLOSED' },
    },
  });

  // Approaching: discovered 46-60 days ago (14 days or fewer remaining), not notified, not closed
  const approaching = await prisma.breachIncident.count({
    where: {
      discoveredAt: { gte: sixtyDaysAgo, lte: fortysixDaysAgo },
      hhsNotifiedAt: null,
      status: { not: 'CLOSED' },
    },
  });

  return { overdue, approaching };
}

// ── 5-BRC-06 BA-to-CE notification workflow handlers (Q-5BRC-J sister bundle) ──

const queueCeSchema = z.object({
  coveredEntityId: z.string().min(1),
});

const sendCeSchema = z.object({
  channel: z.enum(['email', 'signedPdf', 'securePortal', 'sms']),
});

const recordCeDeliverySchema = z.object({
  channel: z.enum(['email', 'signedPdf', 'securePortal', 'sms']),
  deliveredAt: z.string().datetime(),
  recipientConfirmation: z.string().min(1).max(4096),
  externalMessageId: z.string().max(255).nullable().optional(),
});

const recordCeAckSchema = z.object({
  acknowledgedAt: z.string().datetime(),
  acknowledgmentSource: z.enum(['email', 'phone', 'signed_document', 'portal_v3']),
  recordedBy: z.string().min(1).max(255),
  notes: z.string().max(4096).nullable().optional(),
});

const recordCeFollowupRequestSchema = z.object({
  requestedAt: z.string().datetime(),
  question: z.string().min(1).max(4096),
  requestedBy: z.string().min(1).max(255),
});

const recordCeFollowupResponseSchema = z.object({
  respondedAt: z.string().datetime(),
  response: z.string().min(1).max(4096),
  recordedBy: z.string().min(1).max(255),
});

const fourFactorRiskSchema = z.object({
  fourFactorRiskAssessment: z.record(z.unknown()),
  fourFactorRiskCompletedAt: z.string().datetime(),
  fourFactorRiskCompletedBy: z.string().min(1).max(255),
});

const baActsAsAgentSchema = z.object({
  baActsAsAgent: z.boolean(),
  baActsAsAgentRationale: z.string().min(1).max(4096),
});

const lawEnforcementDelaySchema = z.object({
  lawEnforcementDelayActive: z.boolean(),
  lawEnforcementDelayUntil: z.string().datetime().optional(),
  lawEnforcementDelayRationale: z.string().min(1).max(4096),
});

function extractCeActor(req: AuthenticatedRequest): AuthenticatedActor {
  // Re-derive tenantId per CLAUDE.md 14 rule 8 (NEVER trust client-supplied tenantId).
  const user = req.user!;
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
  };
}

function mapCeErrorToResponse(err: unknown, res: Response): Response {
  if (err instanceof InvalidStateTransitionError) {
    return res.status(409).json({
      success: false,
      error: err.message,
      code: err.code,
      currentStatus: err.currentStatus,
      attemptedStatus: err.attemptedStatus,
    });
  }
  if (err instanceof TenantScopeViolationError) {
    return res.status(403).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof CoveredEntityNotLinkedError) {
    return res.status(409).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof BreachIncidentNotFoundError) {
    return res.status(404).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof ChannelNotImplementedError) {
    return res.status(501).json({
      success: false,
      error: err.message,
      code: err.code,
      feature: err.feature,
    });
  }
  if (err instanceof BreachCeNotificationServiceError) {
    return res.status(400).json({ success: false, error: err.message, code: err.code });
  }
  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({ success: false, error: message });
}

// POST /:id/ce-notification/queue
router.post('/:id/ce-notification/queue', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = queueCeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const updated = await queueCeNotification(actor.hospitalId, req.params.id, parsed.data.coveredEntityId, actor);
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, `CE notification queued for CE ${parsed.data.coveredEntityId}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-notification/send
router.post('/:id/ce-notification/send', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = sendCeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const channel: NotificationChannel = { type: parsed.data.channel };
    const updated = await sendCeNotification(actor.hospitalId, req.params.id, channel, actor);
    // Q-5BRC-F dual-emission: route-layer notification-level audit (HIPAA-graded action).
    await writeAuditLog(req, 'BREACH_CE_NOTIFIED', 'BreachIncident', updated.id, `CE notification sent via ${parsed.data.channel}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-notification/delivery
router.post('/:id/ce-notification/delivery', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = recordCeDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const updated = await recordCeDelivery(
      actor.hospitalId,
      req.params.id,
      {
        channel: parsed.data.channel,
        deliveredAt: new Date(parsed.data.deliveredAt),
        recipientConfirmation: parsed.data.recipientConfirmation,
        externalMessageId: parsed.data.externalMessageId ?? null,
      },
      actor,
    );
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, `CE delivery confirmation recorded via ${parsed.data.channel}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-acknowledgment
router.post('/:id/ce-acknowledgment', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = recordCeAckSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const updated = await recordCeAcknowledgment(
      actor.hospitalId,
      req.params.id,
      {
        acknowledgedAt: new Date(parsed.data.acknowledgedAt),
        acknowledgmentSource: parsed.data.acknowledgmentSource,
        recordedBy: parsed.data.recordedBy,
        notes: parsed.data.notes ?? null,
      },
      actor,
    );
    // Q-5BRC-F dual-emission: route-layer HIPAA-graded audit + 164.414(b) burden-of-proof anchor.
    await writeAuditLog(req, 'BREACH_CE_ACKNOWLEDGED', 'BreachIncident', updated.id, `CE acknowledged via ${parsed.data.acknowledgmentSource}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-followup-request
router.post('/:id/ce-followup-request', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = recordCeFollowupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const updated = await recordCeFollowupRequest(
      actor.hospitalId,
      req.params.id,
      {
        requestedAt: new Date(parsed.data.requestedAt),
        question: parsed.data.question,
        requestedBy: parsed.data.requestedBy,
      },
      actor,
    );
    await writeAuditLog(req, 'BREACH_CE_FOLLOWUP_REQUESTED', 'BreachIncident', updated.id, 'CE followup question recorded');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-followup-response
router.post('/:id/ce-followup-response', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = recordCeFollowupResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const actor = extractCeActor(req);
    const updated = await recordCeFollowupResponse(
      actor.hospitalId,
      req.params.id,
      {
        respondedAt: new Date(parsed.data.respondedAt),
        response: parsed.data.response,
        recordedBy: parsed.data.recordedBy,
      },
      actor,
    );
    await writeAuditLog(req, 'BREACH_CE_FOLLOWUP_RESPONDED', 'BreachIncident', updated.id, 'CE followup response recorded');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/ce-close
router.post('/:id/ce-close', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const actor = extractCeActor(req);
    const updated = await closeCeNotification(actor.hospitalId, req.params.id, actor);
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, 'CE notification workflow closed');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return mapCeErrorToResponse(err, res);
  }
});

// POST /:id/four-factor-risk-assessment (5-BRC-02 + 5-BRC-08 sister-bundle)
router.post('/:id/four-factor-risk-assessment', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = fourFactorRiskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const tenantId = req.user!.hospitalId;
    const existing = await prisma.breachIncident.findFirst({ where: { id: req.params.id, hospitalId: tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'BreachIncident not found in tenant scope' });
    }
    const updated = await prisma.breachIncident.update({
      where: { id: req.params.id },
      data: {
        fourFactorRiskAssessment: parsed.data.fourFactorRiskAssessment as any,
        fourFactorRiskCompletedAt: new Date(parsed.data.fourFactorRiskCompletedAt),
        fourFactorRiskCompletedBy: parsed.data.fourFactorRiskCompletedBy,
      },
    });
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, '4-factor risk assessment recorded per 164.402');
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:id/ba-acts-as-agent (5-BRC-03 sister-bundle)
router.post('/:id/ba-acts-as-agent', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = baActsAsAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const tenantId = req.user!.hospitalId;
    const existing = await prisma.breachIncident.findFirst({ where: { id: req.params.id, hospitalId: tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'BreachIncident not found in tenant scope' });
    }
    const updated = await prisma.breachIncident.update({
      where: { id: req.params.id },
      data: {
        baActsAsAgent: parsed.data.baActsAsAgent,
        baActsAsAgentRationale: parsed.data.baActsAsAgentRationale,
      },
    });
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, `BA-acts-as-agent determination recorded: ${parsed.data.baActsAsAgent}`);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:id/law-enforcement-delay (5-BRC-07 sister-bundle)
router.post('/:id/law-enforcement-delay', async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const parsed = lawEnforcementDelaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const tenantId = req.user!.hospitalId;
    const existing = await prisma.breachIncident.findFirst({ where: { id: req.params.id, hospitalId: tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'BreachIncident not found in tenant scope' });
    }
    const updated = await prisma.breachIncident.update({
      where: { id: req.params.id },
      data: {
        lawEnforcementDelayActive: parsed.data.lawEnforcementDelayActive,
        lawEnforcementDelayUntil: parsed.data.lawEnforcementDelayUntil ? new Date(parsed.data.lawEnforcementDelayUntil) : null,
        lawEnforcementDelayRationale: parsed.data.lawEnforcementDelayRationale,
      },
    });
    await writeAuditLog(req, 'BREACH_DATA_MODIFIED', 'BreachIncident', updated.id, `Law-enforcement delay per 164.412: active=${parsed.data.lawEnforcementDelayActive}`);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
export default router;
