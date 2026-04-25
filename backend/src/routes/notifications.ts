/**
 * Notification Preferences & Alert History API
 */

import { Router, Response } from 'express';
import { authenticateToken, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import {
  sendDailyDigest,
  sendWeeklySummary,
  runDailyDigestForAllHospitals,
  AlertPreferences,
} from '../services/clinicalAlertService';
import { writeAuditLog } from '../middleware/auditLogger';

const router = Router();
router.use(authenticateToken);

// ─── GET /api/notifications ─────────────────────────────────────────────────
// Unified notification feed for the current user's hospital.
// Aggregates two sources: unresolved TherapyGaps (clinical attention) and
// recent AuditLog entries for user-visible events (exports, resolutions,
// patient views). Tenant-scoped by req.user.hospitalId — never from body.

router.get('/', requireMFA, async (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = req.user?.hospitalId;
  if (!hospitalId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
      timestamp: new Date().toISOString(),
    });
  }

  const limitParam = Number.parseInt(String(req.query.limit ?? '25'), 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

  const [gaps, events] = await Promise.all([
    prisma.therapyGap.findMany({
      where: { hospitalId, resolvedAt: null },
      orderBy: { identifiedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        module: true,
        gapType: true,
        medication: true,
        device: true,
        currentStatus: true,
        targetStatus: true,
        identifiedAt: true,
        patientId: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        hospitalId,
        action: {
          in: [
            'GAP_RESOLVED',
            'GAP_DISMISSED',
            'PATIENT_VIEWED',
            'REPORT_EXPORTED',
            'ALERT_ACKNOWLEDGED',
            'NOTIFICATION_PREFERENCES_UPDATED',
          ],
        },
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
        userEmail: true,
      },
    }),
  ]);

  const gapNotifications = gaps.map(g => ({
    id: `gap-${g.id}`,
    kind: 'gap' as const,
    severity: 'attention',
    module: g.module,
    title: `${g.module} gap recommended for review`,
    detail: `${g.currentStatus} → ${g.targetStatus}`,
    medication: g.medication,
    device: g.device,
    patientId: g.patientId,
    timestamp: g.identifiedAt.toISOString(),
  }));

  const eventNotifications = events.map(e => ({
    id: `audit-${e.id}`,
    kind: 'event' as const,
    severity: 'info',
    action: e.action,
    title: e.description ?? e.action,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    actorEmail: e.userEmail,
    timestamp: e.timestamp.toISOString(),
  }));

  const notifications = [...gapNotifications, ...eventNotifications]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);

  res.json({
    success: true,
    data: {
      notifications,
      counts: {
        gaps: gapNotifications.length,
        events: eventNotifications.length,
        total: notifications.length,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/notifications/preferences ─────────────────────────────────────
// Get current user's notification preferences

router.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  const defaults: AlertPreferences = {
    immediateAlerts: true,
    dailyDigest: true,
    weeklySummary: false,
    moduleFilter: [],
  };

  res.json({
    success: true,
    data: user?.notificationPreferences || defaults,
    timestamp: new Date().toISOString(),
  });
});

// ─── PUT /api/notifications/preferences ─────────────────────────────────────
// Update notification preferences

router.put('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { immediateAlerts, dailyDigest, weeklySummary, moduleFilter } = req.body;

  const prefs: AlertPreferences = {
    immediateAlerts: immediateAlerts ?? true,
    dailyDigest: dailyDigest ?? true,
    weeklySummary: weeklySummary ?? false,
    moduleFilter: Array.isArray(moduleFilter) ? moduleFilter : [],
  };

  await prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: prefs as any },
  });

  await writeAuditLog(req, 'NOTIFICATION_PREFERENCES_UPDATED', 'User', userId, 'Updated notification preferences');

  res.json({
    success: true,
    data: prefs,
    message: 'Notification preferences updated',
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /api/notifications/trigger/daily-digest ───────────────────────────
// Manually trigger daily digest (super-admin only, also called by cron)

router.post('/trigger/daily-digest', async (req: AuthenticatedRequest, res: Response) => {
  const normalizedRole = req.user?.role?.toLowerCase().replace(/_/g, '-') || '';
  if (normalizedRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super-admin only' });
  }

  const hospitalId = req.query.hospitalId as string;

  if (hospitalId) {
    const sent = await sendDailyDigest(hospitalId);
    return res.json({ success: true, data: { emails: sent, hospital: hospitalId }, timestamp: new Date().toISOString() });
  }

  const result = await runDailyDigestForAllHospitals();
  await writeAuditLog(req, 'DAILY_DIGEST_TRIGGERED', 'Notification', null, `Sent ${result.emails} digest emails to ${result.hospitals} hospitals`);

  res.json({ success: true, data: result, timestamp: new Date().toISOString() });
});

// ─── POST /api/notifications/trigger/weekly-summary ─────────────────────────

router.post('/trigger/weekly-summary', async (req: AuthenticatedRequest, res: Response) => {
  const normalizedRole = req.user?.role?.toLowerCase().replace(/_/g, '-') || '';
  if (normalizedRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super-admin only' });
  }

  const hospitalId = req.query.hospitalId as string;

  if (hospitalId) {
    const sent = await sendWeeklySummary(hospitalId);
    return res.json({ success: true, data: { emails: sent, hospital: hospitalId }, timestamp: new Date().toISOString() });
  }

  const { runWeeklySummaryForAllHospitals } = await import('../services/clinicalAlertService');
  const result = await runWeeklySummaryForAllHospitals();
  await writeAuditLog(req, 'WEEKLY_SUMMARY_TRIGGERED', 'Notification', null, `Sent ${result.emails} weekly summaries to ${result.hospitals} hospitals`);

  res.json({ success: true, data: result, timestamp: new Date().toISOString() });
});

export default router;
