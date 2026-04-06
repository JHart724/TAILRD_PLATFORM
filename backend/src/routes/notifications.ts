/**
 * Notification Preferences & Alert History API
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
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
  if (req.user?.role !== 'super-admin') {
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
  if (req.user?.role !== 'super-admin') {
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
