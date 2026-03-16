import winston from 'winston';
import path from 'path';
import { Request } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

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

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'tailrd-audit' },
  transports: [auditTransport],
  // Never exit on uncaught — audit logs must persist
  exitOnError: false,
});

// In development, also log audit events to the console for visibility
if (process.env.NODE_ENV === 'development') {
  auditLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AuditEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole: string;
  hospitalId: string;
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

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    userId: user?.userId || 'anonymous',
    userEmail: user?.email || 'unknown',
    userRole: user?.role || 'unknown',
    hospitalId: user?.hospitalId || 'unknown',
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

  // 2. Write to database AuditLog table (best-effort, non-blocking)
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
    });
  } catch (dbError) {
    // Log the database write failure but do NOT throw.
    // The file-based log is the authoritative HIPAA audit trail.
    auditLogger.error('audit_db_write_failed', {
      error: dbError instanceof Error ? dbError.message : String(dbError),
      originalEntry: entry,
    });
  }
}

export { writeAuditLog, auditLogger };
