import winston from 'winston';
import path from 'path';
import { Request } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { TENANT_GUARD_BYPASS } from './tenantGuard';
// AUDIT-011 LEGITIMATE_BYPASS (2026-05-02): AuditLog.create has nullable
// hospitalId for unauthenticated audit events (failed login attempts, etc.).
// System-level audit trail, not user-scoped. Layer 3 reads TENANT_GUARD_BYPASS
// to skip enforcement for these writes.

// ─── Audit Log Directory ────────────────────────────────────────────────────────
const LOG_DIR = path.resolve(__dirname, '../../logs');

// ─── HIPAA Retention: 6 years = 2190 days ───────────────────────────────────────
const RETENTION_DAYS = 2190;

// ─── Winston Audit Logger ───────────────────────────────────────────────────────
// Append-only JSON log for HIPAA-compliant audit trail.
// Writes to logs/audit.log with daily rotation via DailyRotateFile transport
// if available, otherwise falls back to a standard file transport.

let auditTransport: winston.transport;

try {
  // Attempt to use daily-rotate-file if installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DailyRotateFile = require('winston-daily-rotate-file');
  auditTransport = new DailyRotateFile({
    filename: path.join(LOG_DIR, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${RETENTION_DAYS}d`,
    zippedArchive: true,
    auditFile: path.join(LOG_DIR, 'audit-rotate-audit.json'),
  });
} catch {
  // Fallback: standard file transport (no rotation)
  auditTransport = new winston.transports.File({
    filename: path.join(LOG_DIR, 'audit.log'),
    maxsize: 50 * 1024 * 1024, // 50 MB per file
    maxFiles: 1000,
  });
}

// AUDIT-013 remediation: dual-transport for durability.
// - File transport (existing) preserves dev ergonomics and gives the operator
//   a local audit-log artifact for offline review.
// - Console JSON transport (new) writes to ECS task stdout, captured by the
//   awslogs driver into CloudWatch Logs. CloudWatch is durable, queryable,
//   and HIPAA-eligible — addresses §164.312(b) audit control retention even
//   when the ECS task filesystem is recycled.
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'tailrd-audit' },
  transports: [
    auditTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.json(),
      ),
      level: 'info',
    }),
  ],
  // Never exit on uncaught — audit logs must persist
  exitOnError: false,
});

// AUDIT-013 remediation: HIPAA-grade actions throw on DB write failure
// (rather than silently best-effort) so callers can degrade safely instead
// of pretending the audit succeeded. File + Console transports still capture
// the event regardless; the throw signals "primary durable record failed."
const HIPAA_GRADE_ACTIONS = new Set<string>([
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PHI_VIEW',
  'PHI_EXPORT',
  'PATIENT_CREATED',
  'PATIENT_UPDATED',
  'PATIENT_DELETED',
  'BREACH_DATA_ACCESSED',
  'BREACH_DATA_MODIFIED',
  // AUDIT-071 mitigation — CDS Hooks tenant isolation events. Promoted per
  // operator decision D6 (partial closure of AUDIT-076 HIPAA_GRADE_ACTIONS
  // boundary refinement). DB write failure throws so caller fails closed.
  'CDS_HOOKS_JWT_VALIDATION_FAILURE',
  'CDS_HOOKS_UNMAPPED_ISSUER',
  'CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED',
  'CDS_HOOKS_NO_TENANT_RESOLVED',
]);

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AuditEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole: string;
  hospitalId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  description: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

// ─── Helper: extract client IP ──────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

// ─── writeAuditLog ──────────────────────────────────────────────────────────────
// Primary export. Call from route handlers and middleware to record audit events.
//
// Writes to both the file-based audit log (append-only, retained 6 years) and
// the database AuditLog table for queryability.
//
// Failures in database writes are logged but never throw — the file log is the
// authoritative HIPAA record.

async function writeAuditLog(
  req: Request,
  action: string,
  resourceType: string,
  resourceId: string | null,
  description: string | null,
  previousValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  // hospitalId is null for unauthenticated events (failed logins on unknown users,
  // anonymous webhook traffic, etc.). The DB column is nullable to allow this.
  // Earlier behavior wrote the literal string 'unknown' which violated the
  // hospitals FK and caused every failed-login audit write to be rejected.
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    userId: user?.userId || 'anonymous',
    userEmail: user?.email || 'unknown',
    userRole: user?.role || 'unknown',
    hospitalId: user?.hospitalId ?? null,
    action,
    resourceType,
    resourceId,
    ipAddress: getClientIp(req),
    description,
    previousValues: previousValues || null,
    newValues: newValues || null,
  };

  // 1. Write to file-based audit log (synchronous from Winston's perspective)
  auditLogger.info('audit_event', entry);

  // 2. Write to database AuditLog table.
  // AUDIT-013 remediation: HIPAA-grade events throw on DB failure so the
  // calling route can return 500 ("audit unavailable") rather than pretend
  // the action succeeded silently. Non-HIPAA events remain best-effort.
  try {
    await prisma.auditLog.create({
      data: {
        hospitalId: entry.hospitalId,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        ipAddress: entry.ipAddress,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        description: entry.description,
        previousValues: entry.previousValues as any,
        newValues: entry.newValues as any,
      },
      [TENANT_GUARD_BYPASS]: true,
    } as any);
  } catch (dbError) {
    auditLogger.error('audit_db_write_failed', {
      error: dbError instanceof Error ? dbError.message : String(dbError),
      hipaaGrade: HIPAA_GRADE_ACTIONS.has(action),
      originalEntry: entry,
    });
    if (HIPAA_GRADE_ACTIONS.has(action)) {
      throw new Error(
        `Audit DB write failed for HIPAA-grade event: ${action}. File and Console transports still captured the event but the durable DB record failed.`,
      );
    }
  }
}

export { writeAuditLog, auditLogger };
