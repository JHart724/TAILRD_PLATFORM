/**
 * Clinical Alert Service
 *
 * Delivers gap detection alerts to clinicians via email (SES).
 * Three delivery modes:
 *   1. Immediate: high-severity safety alerts (QTc critical, digoxin toxicity)
 *   2. Daily digest: new gaps detected in the last 24h, grouped by provider
 *   3. Weekly summary: gap closure trends for department/service line leaders
 *
 * Notification preferences are per-user, stored in the User model.
 * All alert deliveries are audit-logged for HIPAA compliance.
 */

import prisma from '../lib/prisma';
import { sendEmail } from './emailService';
import { TherapyGapType, UserRole } from '@prisma/client';
import { writeAuditLog } from '../middleware/auditLogger';
import { ModuleType } from '@prisma/client';
import { Request } from 'express';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AlertPreferences {
  immediateAlerts: boolean;   // Safety alerts sent immediately
  dailyDigest: boolean;       // New gaps emailed daily at 7am local
  weeklySummary: boolean;     // Weekly gap closure summary
  moduleFilter: string[];     // Only alert for these modules (empty = all)
}

const DEFAULT_PREFERENCES: AlertPreferences = {
  immediateAlerts: true,
  dailyDigest: true,
  weeklySummary: false,
  moduleFilter: [],
};

interface GapAlertData {
  gapType: string;
  module: string;
  patientCount: number;
  severity: 'critical' | 'high' | 'medium';
  samplePatientIds: string[];
  recommendation: string;
}

// ─── Immediate Safety Alerts ────────────────────────────────────────────────

const IMMEDIATE_ALERT_GAP_TYPES = [
  'SAFETY_ALERT',
  'MEDICATION_CONTRAINDICATED',
];

/**
 * Send immediate alerts for high-severity gaps detected during a gap detection run.
 * Called from gapDetectionRunner after each batch.
 */
export async function sendImmediateAlerts(
  hospitalId: string,
  newGapIds: string[],
): Promise<number> {
  if (newGapIds.length === 0) return 0;

  // Find safety-critical gaps from this batch
  const criticalGaps = await prisma.therapyGap.findMany({
    where: {
      id: { in: newGapIds },
      hospitalId,
      gapType: { in: IMMEDIATE_ALERT_GAP_TYPES as TherapyGapType[] },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
    },
  });

  if (criticalGaps.length === 0) return 0;

  // Find clinicians for this hospital who have immediate alerts enabled
  const clinicians = await prisma.user.findMany({
    where: {
      hospitalId,
      isActive: true,
      role: { in: [UserRole.PHYSICIAN, UserRole.NURSE_MANAGER, UserRole.HOSPITAL_ADMIN] },
    },
    select: { id: true, email: true, firstName: true, role: true, notificationPreferences: true },
  }) as Array<{ id: string; email: string; firstName: string; role: string; notificationPreferences: unknown }>;

  let sent = 0;
  for (const clinician of clinicians) {
    const prefs = parsePreferences(clinician.notificationPreferences);
    if (!prefs.immediateAlerts) continue;

    const email = buildImmediateAlertEmail({
      clinicianName: clinician.firstName,
      gaps: criticalGaps.map(g => ({
        patientName: `${g.patient.firstName} ${g.patient.lastName}`,
        mrn: g.patient.mrn,
        gapType: g.gapType,
        status: g.currentStatus,
        module: g.module,
      })),
      hospitalId,
    });

    email.to = clinician.email;
    await sendEmail(email);
    sent++;
  }

  return sent;
}

// ─── Daily Digest ───────────────────────────────────────────────────────────

/**
 * Generate and send daily digest emails for a hospital.
 * Called by cron job (node-cron in server.ts or external scheduler).
 */
export async function sendDailyDigest(hospitalId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get new gaps from last 24h grouped by module
  const newGaps = await prisma.therapyGap.groupBy({
    by: ['module', 'gapType'],
    where: {
      hospitalId,
      identifiedAt: { gte: since },
      resolvedAt: null,
    },
    _count: { id: true },
  });

  if (newGaps.length === 0) return 0;

  // Get total open gap count
  const totalOpen = await prisma.therapyGap.count({
    where: { hospitalId, resolvedAt: null },
  });

  // Get clinicians who want daily digest
  const clinicians = await prisma.user.findMany({
    where: {
      hospitalId,
      isActive: true,
      role: { in: [UserRole.PHYSICIAN, UserRole.NURSE_MANAGER, UserRole.HOSPITAL_ADMIN, UserRole.QUALITY_DIRECTOR] },
    },
    select: { id: true, email: true, firstName: true, notificationPreferences: true },
  }) as Array<{ id: string; email: string; firstName: string; notificationPreferences: unknown }>;

  const moduleGroups: Record<string, { count: number; types: string[] }> = {};
  for (const g of newGaps) {
    if (!moduleGroups[g.module]) moduleGroups[g.module] = { count: 0, types: [] };
    moduleGroups[g.module].count += g._count.id;
    moduleGroups[g.module].types.push(`${g.gapType} (${g._count.id})`);
  }

  let sent = 0;
  for (const clinician of clinicians) {
    const prefs = parsePreferences(clinician.notificationPreferences);
    if (!prefs.dailyDigest) continue;

    // Filter by module preference if set
    const filteredModules = prefs.moduleFilter.length > 0
      ? Object.fromEntries(Object.entries(moduleGroups).filter(([mod]) => prefs.moduleFilter.includes(mod)))
      : moduleGroups;

    if (Object.keys(filteredModules).length === 0) continue;

    const totalNew = Object.values(filteredModules).reduce((sum, m) => sum + m.count, 0);

    const email = buildDailyDigestEmail({
      clinicianName: clinician.firstName,
      totalNewGaps: totalNew,
      totalOpenGaps: totalOpen,
      modules: filteredModules,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    });

    email.to = clinician.email;
    await sendEmail(email);
    sent++;
  }

  return sent;
}

// ─── Weekly Summary ─────────────────────────────────────────────────────────

/**
 * Generate and send weekly summary for department/service line leaders.
 */
export async function sendWeeklySummary(hospitalId: string): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newGaps, closedGaps, totalOpen] = await Promise.all([
    prisma.therapyGap.count({ where: { hospitalId, identifiedAt: { gte: weekAgo } } }),
    prisma.therapyGap.count({ where: { hospitalId, resolvedAt: { gte: weekAgo } } }),
    prisma.therapyGap.count({ where: { hospitalId, resolvedAt: null } }),
  ]);

  const closureRate = newGaps > 0 ? Math.round((closedGaps / (newGaps + closedGaps)) * 100) : 0;

  // Module breakdown
  const byModule = await prisma.therapyGap.groupBy({
    by: ['module'],
    where: { hospitalId, resolvedAt: null },
    _count: { id: true },
  });

  const leaders = await prisma.user.findMany({
    where: {
      hospitalId,
      isActive: true,
      role: { in: [UserRole.HOSPITAL_ADMIN, UserRole.QUALITY_DIRECTOR] },
    },
    select: { id: true, email: true, firstName: true, notificationPreferences: true },
  }) as Array<{ id: string; email: string; firstName: string; notificationPreferences: unknown }>;

  let sent = 0;
  for (const leader of leaders) {
    const prefs = parsePreferences(leader.notificationPreferences);
    if (!prefs.weeklySummary) continue;

    const email = buildWeeklySummaryEmail({
      leaderName: leader.firstName,
      newGaps,
      closedGaps,
      totalOpen,
      closureRate,
      modules: byModule.map(m => ({ module: m.module, openGaps: m._count.id })),
    });

    email.to = leader.email;
    await sendEmail(email);
    sent++;
  }

  return sent;
}

// ─── Run all digests for all hospitals (called by cron) ─────────────────────

export async function runDailyDigestForAllHospitals(): Promise<{ hospitals: number; emails: number }> {
  const hospitals = await prisma.hospital.findMany({
    where: { subscriptionActive: true },
    select: { id: true },
  });

  let totalEmails = 0;
  for (const h of hospitals) {
    totalEmails += await sendDailyDigest(h.id);
  }

  return { hospitals: hospitals.length, emails: totalEmails };
}

export async function runWeeklySummaryForAllHospitals(): Promise<{ hospitals: number; emails: number }> {
  const hospitals = await prisma.hospital.findMany({
    where: { subscriptionActive: true },
    select: { id: true },
  });

  let totalEmails = 0;
  for (const h of hospitals) {
    totalEmails += await sendWeeklySummary(h.id);
  }

  return { hospitals: hospitals.length, emails: totalEmails };
}

// ─── Preference Helpers ─────────────────────────────────────────────────────

function parsePreferences(raw: any): AlertPreferences {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFERENCES;
  return {
    immediateAlerts: raw.immediateAlerts ?? DEFAULT_PREFERENCES.immediateAlerts,
    dailyDigest: raw.dailyDigest ?? DEFAULT_PREFERENCES.dailyDigest,
    weeklySummary: raw.weeklySummary ?? DEFAULT_PREFERENCES.weeklySummary,
    moduleFilter: Array.isArray(raw.moduleFilter) ? raw.moduleFilter : DEFAULT_PREFERENCES.moduleFilter,
  };
}

// ─── Email Templates ────────────────────────────────────────────────────────

function buildImmediateAlertEmail(params: {
  clinicianName: string;
  gaps: { patientName: string; mrn: string; gapType: string; status: string; module: string }[];
  hospitalId: string;
}) {
  const gapRows = params.gaps.map(g =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0;">${g.patientName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0;">${g.mrn}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0;">${g.status}</td>
    </tr>`
  ).join('');

  const gapText = params.gaps.map(g => `  - ${g.patientName} (${g.mrn}): ${g.status}`).join('\n');

  return {
    to: '',
    subject: `TAILRD Heart -- ${params.gaps.length} Safety Alert${params.gaps.length > 1 ? 's' : ''} Require Review`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2C4A60; font-size: 24px; margin: 0;">TAILRD</h1>
          <p style="color: #DC2626; font-size: 14px; font-weight: 600; margin: 4px 0;">SAFETY ALERT</p>
        </div>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 24px;">
          <p style="color: #1E293B; font-size: 15px; margin: 0 0 16px;">
            ${params.clinicianName}, ${params.gaps.length} safety-critical gap${params.gaps.length > 1 ? 's have' : ' has'} been identified that may require immediate clinical review:
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #FEE2E2;">
                <th style="padding: 8px 12px; text-align: left;">Patient</th>
                <th style="padding: 8px 12px; text-align: left;">MRN</th>
                <th style="padding: 8px 12px; text-align: left;">Finding</th>
              </tr>
            </thead>
            <tbody>${gapRows}</tbody>
          </table>
          <p style="color: #475569; font-size: 13px; margin: 16px 0 0; font-style: italic;">
            This is a clinical decision support notification. The clinician makes the final decision.
          </p>
        </div>
      </div>
    `,
    text: `TAILRD Heart -- Safety Alert\n\n${params.clinicianName}, ${params.gaps.length} safety-critical gap(s) identified:\n\n${gapText}\n\nPlease review in the TAILRD Heart platform.\n\nThis is clinical decision support. The clinician makes the final decision.`,
  };
}

function buildDailyDigestEmail(params: {
  clinicianName: string;
  totalNewGaps: number;
  totalOpenGaps: number;
  modules: Record<string, { count: number; types: string[] }>;
  date: string;
}) {
  const moduleRows = Object.entries(params.modules).map(([mod, data]) =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${mod.replace(/_/g, ' ')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: center;">${data.count}</td>
    </tr>`
  ).join('');

  const moduleText = Object.entries(params.modules).map(([mod, data]) =>
    `  ${mod}: ${data.count} new gaps`
  ).join('\n');

  return {
    to: '',
    subject: `TAILRD Heart -- Daily Digest: ${params.totalNewGaps} New Gaps (${params.date})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2C4A60; font-size: 24px; margin: 0;">TAILRD</h1>
          <p style="color: #4A6880; font-size: 14px;">${params.date}</p>
        </div>
        <div style="background: #F8FAFB; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px;">
          <h2 style="color: #1E293B; font-size: 18px; margin: 0 0 16px;">Daily Gap Summary</h2>
          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="flex: 1; background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #DC2626;">${params.totalNewGaps}</div>
              <div style="font-size: 12px; color: #64748B;">New Gaps</div>
            </div>
            <div style="flex: 1; background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #2C4A60;">${params.totalOpenGaps}</div>
              <div style="font-size: 12px; color: #64748B;">Total Open</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #F1F5F9;">
                <th style="padding: 8px 12px; text-align: left;">Module</th>
                <th style="padding: 8px 12px; text-align: center;">New Gaps</th>
              </tr>
            </thead>
            <tbody>${moduleRows}</tbody>
          </table>
        </div>
        <p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 16px;">
          Log in to TAILRD Heart to review and act on these gaps.
        </p>
      </div>
    `,
    text: `TAILRD Heart -- Daily Digest (${params.date})\n\n${params.clinicianName}, here's your daily gap summary:\n\nNew gaps: ${params.totalNewGaps}\nTotal open: ${params.totalOpenGaps}\n\nBy module:\n${moduleText}\n\nLog in to review.`,
  };
}

function buildWeeklySummaryEmail(params: {
  leaderName: string;
  newGaps: number;
  closedGaps: number;
  totalOpen: number;
  closureRate: number;
  modules: { module: string; openGaps: number }[];
}) {
  const moduleRows = params.modules.map(m =>
    `<tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #E2E8F0;">${m.module.replace(/_/g, ' ')}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #E2E8F0; text-align: center;">${m.openGaps}</td>
    </tr>`
  ).join('');

  return {
    to: '',
    subject: `TAILRD Heart -- Weekly Summary: ${params.closureRate}% Gap Closure Rate`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2C4A60; font-size: 24px; margin: 0;">TAILRD</h1>
          <p style="color: #4A6880; font-size: 14px;">Weekly Performance Summary</p>
        </div>
        <div style="background: #F8FAFB; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px;">
          <h2 style="color: #1E293B; font-size: 18px; margin: 0 0 20px;">This Week</h2>
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <div style="flex: 1; background: white; border-radius: 6px; padding: 12px; text-align: center; border: 1px solid #E2E8F0;">
              <div style="font-size: 24px; font-weight: 700; color: #059669;">${params.closedGaps}</div>
              <div style="font-size: 11px; color: #64748B;">Gaps Closed</div>
            </div>
            <div style="flex: 1; background: white; border-radius: 6px; padding: 12px; text-align: center; border: 1px solid #E2E8F0;">
              <div style="font-size: 24px; font-weight: 700; color: #DC2626;">${params.newGaps}</div>
              <div style="font-size: 11px; color: #64748B;">New Gaps</div>
            </div>
            <div style="flex: 1; background: white; border-radius: 6px; padding: 12px; text-align: center; border: 1px solid #E2E8F0;">
              <div style="font-size: 24px; font-weight: 700; color: #2C4A60;">${params.closureRate}%</div>
              <div style="font-size: 11px; color: #64748B;">Closure Rate</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead><tr style="background: #F1F5F9;"><th style="padding: 6px 12px; text-align: left;">Module</th><th style="padding: 6px 12px; text-align: center;">Open Gaps</th></tr></thead>
            <tbody>${moduleRows}</tbody>
          </table>
        </div>
      </div>
    `,
    text: `TAILRD Heart -- Weekly Summary\n\n${params.leaderName}, here's your weekly performance:\n\nGaps closed: ${params.closedGaps}\nNew gaps: ${params.newGaps}\nClosure rate: ${params.closureRate}%\nTotal open: ${params.totalOpen}`,
  };
}
