import winston from 'winston';
import path from 'path';
import { Request } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { redactPHIFragments } from '../utils/phiRedaction';
// AUDIT-011 LEGITIMATE_BYPASS (2026-05-02; marker pattern migrated 2026-05-07):
// AuditLog.create has nullable hospitalId for unauthenticated audit events
// (failed login attempts, etc.). System-level audit trail, not user-scoped.
// Layer 3 (`prismaTenantGuard.ts`) reads `__tenantGuardBypass: true` on args
// to skip enforcement for these writes. String-keyed pattern survives Prisma
// 5.22 `$extends` args sanitization (Symbol.for() does not — see Step 1.0/1.0.1
// verification in `backend/src/lib/__tests__/prismaTenantGuardSymbolSurvival.test.ts`).

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
  // AUDIT-016 PR 2 — V2 envelope KMS events. KEY_VALIDATION_FAILURE +
  // ENVELOPE_DECRYPT_FAILURE are HIPAA-graded (security events: bad config or
  // potential ciphertext tampering). KMS_DEK_GENERATED + KMS_DEK_UNWRAPPED
  // remain best-effort (informational). Continues AUDIT-076 partial closure.
  'KMS_KEY_VALIDATION_FAILURE',
  'KMS_ENVELOPE_DECRYPT_FAILURE',
  // AUDIT-011 Phase b/c (2026-05-07) — emitted by prismaTenantGuard.ts when
  // allow-list model query lacks hospitalId in args.where; HIPAA-graded for
  // tenant-isolation incident audit trail per HIPAA §164.312(b) audit
  // controls. Producer-consumer string parity verified via grep at Step 4
  // commit time; const-assertion-union tightening tracked in design
  // refinement note §13.1.
  'TENANT_GUARD_VIOLATION',
  // 5-BRC-06 BA-to-CE notification workflow per §164.410(b) burden-of-proof.
  // Promoted per Q-5BRC-F + PHASE_5_REPORT.md §4.7 remediation step 7 +
  // sister AUDIT-076 promotion. Each state transition emits a HIPAA-graded
  // audit entry; DB write failure throws so caller surfaces 500 rather than
  // silently losing the §164.410(b) burden-of-proof record.
  'BREACH_CE_NOTIFIED',
  'BREACH_CE_ACKNOWLEDGED',
  'BREACH_CE_FOLLOWUP_REQUESTED',
  'BREACH_CE_FOLLOWUP_RESPONDED',
  // 5-ADM-09 P1.3.3b BAA execution + signed-BAA upload + PHI-flow-gating events.
  // Promoted per Q-5ADM-B Path (c) Layer 3 enforcement + Q-5ADM-C single-source-
  // of-truth discipline + sister AUDIT-076 BREACH_CE_* promotion. Each event
  // anchors HIPAA §164.308(b)(1) BAA-execution audit trail OR §164.312(b) PHI
  // access-control audit trail; DB write failure throws so caller fails closed.
  'BAA_EXECUTION_RECORDED',
  'BAA_EXECUTION_REVOKED',
  'SIGNED_BAA_UPLOADED',
  'SIGNED_BAA_RETRIEVED',
  'PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED',
  'HOSPITAL_BAA_CACHE_UPDATED',
  // AUDIT-148 Slice 3 - registry-case human sign-off transitions. Approve/reject
  // are the maker-checker sign-off events (a QUALITY_DIRECTOR/admin attests a
  // patient's registry submission); DB write failure throws so the route returns
  // 500 rather than record a sign-off that was never durably persisted. The
  // create/update/submit events (TRIAL_REFERRAL_CREATED, REGISTRY_CASE_UPDATED,
  // REGISTRY_CASE_SUBMITTED) are audited best-effort - not in this set.
  'REGISTRY_CASE_APPROVED',
  'REGISTRY_CASE_REJECTED',
  // AUDIT-203 - clinical-decision writes across the referrals / clinicalIntelligence /
  // phenotypes routes. These are the definitive clinician decisions in each path
  // (a cross-module referral, a risk/intervention record, a contraindication OVERRIDE,
  // a phenotype CONFIRMATION); a silent audit-DB failure must 500 the route rather than
  // record a clinical decision that was never durably logged. The best-effort siblings
  // (CONTRAINDICATION_ASSESSED create, PHENOTYPE_SCREENED automated run, and the
  // SESSION_REVOKED / SECURITY_SETTINGS_CHANGED security events) are audited but NOT
  // in this set - their audit is best-effort so an audit-DB blip cannot block a
  // security-critical password reset or session revocation.
  'CROSS_REFERRAL_CREATED',
  'CROSS_REFERRAL_STATUS_CHANGED',
  'RISK_SCORE_ASSESSED',
  'INTERVENTION_CREATED',
  'INTERVENTION_UPDATED',
  'CONTRAINDICATION_OVERRIDDEN',
  'PHENOTYPE_CONFIRMED',
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
  // AUDIT-018 sister-bundle (D3) + AUDIT-075 D2: sanitize-at-write redaction
  // applied at single-point integration here so both file (auditLogger.info) +
  // DB (prisma.auditLog.create) transports persist the sanitized form.
  // CONSERVATIVE pattern set per design §4.2 (templated strings from 16
  // existing writeAuditLog callers are non-PHI per AUDIT-018 evidence; defense-
  // in-depth applies sanitize anyway in case future callers pass operator-
  // supplied free-form input).
  const sanitizedDescription = description !== null ? redactPHIFragments(description) : null;

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
    description: sanitizedDescription,
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
      __tenantGuardBypass: true,
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
