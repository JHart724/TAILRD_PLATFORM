/**
 * AUDIT-071 — CDS Hooks tenant isolation middleware
 *
 * Resolves the tenant (`hospitalId`) for CDS Hooks invocations BEFORE the
 * handler executes any patient lookup. Replaces the prior structurally-broken
 * pattern at `cdsHooks.ts:117-123, 294-300` where `(req as any).user?.hospitalId`
 * was always undefined and the conditional filter was always-false → cross-
 * tenant patient lookup by `fhirPatientId`.
 *
 * Design source: docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md
 *
 * Path A (EHR-initiated, primary path):
 *   1. Read `req.body.fhirAuthorization.subject` → claimed `iss`
 *   2. Verify CDS Hooks JWT signature against `<iss>/.well-known/jwks.json`
 *   3. Validate JWT claims: presence of iss, iat, exp, jti; audience matches
 *   4. Look up HospitalEhrIssuer by issuerUrl (must be isActive)
 *   5. Populate `req.cdsHooks = { hospitalId, issuerUrl, ehrIssuerId }`
 *   6. Pass to handler — which MUST scope every Patient query by hospitalId
 *
 * Path B (non-EHR / missing fhirAuthorization, per operator decision D2):
 *   - Deny via 200 + empty cards + audit log entry
 *   - No platform-JWT fallback today (admin tooling not a CDS Hooks consumer)
 *
 * Failure modes (per operator decision D3):
 *   - Missing fhirAuthorization.subject       → 200 + empty cards + audit
 *   - JWT signature invalid / expired         → 401 (auth-level) + audit
 *   - JWT valid but iss not in HospitalEhrIssuer → 200 + empty cards + audit
 *
 * Audit actions promoted to HIPAA_GRADE_ACTIONS (per operator decision D6):
 *   - CDS_HOOKS_JWT_VALIDATION_FAILURE
 *   - CDS_HOOKS_UNMAPPED_ISSUER
 *   - CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED
 *   - CDS_HOOKS_NO_TENANT_RESOLVED
 *
 * Discovery + feedback endpoints exempted (no PHI; spec-required public).
 *
 * Demo-mode non-inheritance: `authenticateToken` synthesizes a super-admin
 * payload in DEMO_MODE; this middleware DOES NOT inherit that bypass. CDS
 * Hooks endpoints are external-facing; demo-mode bypass would re-introduce
 * the very vulnerability being fixed.
 *
 * Cross-references:
 *   - AUDIT-071 register entry — docs/audit/AUDIT_FINDINGS_REGISTER.md
 *   - AUDIT-073 (per-tenant fhir*Id uniques; bundled per §17.3)
 *   - AUDIT-013 (dual-transport audit logger pattern)
 *   - AUDIT-076 (HIPAA_GRADE_ACTIONS boundary refinement; partial closure here)
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../lib/prisma';
import { writeAuditLog } from './auditLogger';
import { logger } from '../utils/logger';

// ── Types ──────────────────────────────────────────────────────────────────

/** Tenant context populated by this middleware; consumed by cdsHooks handlers. */
export interface CdsHooksContext {
  readonly hospitalId: string;
  readonly issuerUrl: string;
  readonly ehrIssuerId: string;
}

/** Augments Express Request with CDS-Hooks-specific tenant context. */
export interface CdsHooksAuthenticatedRequest extends Request {
  cdsHooks?: CdsHooksContext;
}

// ── JWKS cache ─────────────────────────────────────────────────────────────
// Per-issuer JWKS sets are expensive to fetch + slow to validate the first
// time. Cache by issuerUrl. Same pattern used by the prior (now-removed)
// verifyCDSHooksJWT helper.

const jwksCache = new Map<string, unknown>();

// ── Path detection ─────────────────────────────────────────────────────────
// Discovery + feedback endpoints don't expose PHI; spec-required public.

function isExempt(req: Request): boolean {
  // Discovery: GET /cds-services or GET /cds-services/
  if (req.method === 'GET' && (req.path === '/' || req.path === '')) return true;
  // Feedback: POST /cds-services/<hookId>/feedback
  if (req.method === 'POST' && req.path.endsWith('/feedback')) return true;
  return false;
}

// ── JWT verification ──────────────────────────────────────────────────────

interface JwtVerifyResult {
  ok: boolean;
  iss?: string;
  reason?: string;
}

async function verifyJwt(
  authHeader: string | undefined,
  issuerUrl: string,
): Promise<JwtVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing or malformed Authorization header' };
  }
  try {
    // jose is ESM-only; dynamic import to avoid CJS require-time crash.
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const jwksUrl = new URL('/.well-known/jwks.json', issuerUrl);
    if (!jwksCache.has(issuerUrl)) {
      jwksCache.set(issuerUrl, createRemoteJWKSet(jwksUrl));
    }
    const apiUrl = process.env.API_URL || 'https://api.tailrd-heart.com';
    const { payload } = await jwtVerify(
      authHeader.slice(7),
      jwksCache.get(issuerUrl) as Parameters<typeof jwtVerify>[1],
      { audience: `${apiUrl}/cds-services` },
    );
    if (!payload.iss || !payload.iat || !payload.exp || !payload.jti) {
      return { ok: false, reason: 'JWT missing required claim (iss/iat/exp/jti)' };
    }
    if (payload.iss !== issuerUrl) {
      return { ok: false, reason: `JWT iss claim (${payload.iss}) does not match fhirAuthorization.subject (${issuerUrl})` };
    }
    return { ok: true, iss: payload.iss };
  } catch (err) {
    return {
      ok: false,
      reason: `JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── HospitalEhrIssuer lookup ───────────────────────────────────────────────

interface IssuerLookupResult {
  ok: boolean;
  hospitalId?: string;
  ehrIssuerId?: string;
}

async function lookupIssuer(issuerUrl: string): Promise<IssuerLookupResult> {
  const row = await prisma.hospitalEhrIssuer.findFirst({
    where: { issuerUrl, isActive: true },
    select: { id: true, hospitalId: true },
  });
  if (!row) return { ok: false };
  return { ok: true, hospitalId: row.hospitalId, ehrIssuerId: row.id };
}

// ── Audit log helpers ──────────────────────────────────────────────────────
// Synthesize a Request-like shape for writeAuditLog when there is no
// authenticated platform user (req.user undefined for CDS Hooks endpoints).
// writeAuditLog reads userId/email/role from req.user with defaults to
// 'anonymous' / 'unknown' / 'unknown' — for CDS Hooks events we override
// with system-level identity so the audit trail is greppable.

function cdsHooksAuditReq(req: Request, hospitalId: string | null): Request {
  // Cast: we only override fields writeAuditLog reads via authReq.user.
  const augmented = req as Request & {
    user?: {
      userId: string;
      email: string;
      role: string;
      hospitalId: string | null;
    };
  };
  augmented.user = {
    userId: 'system:cds-hooks',
    email: 'system@cds-hooks.tailrd-heart.com',
    role: 'SYSTEM',
    hospitalId,
  };
  return augmented;
}

async function auditFailure(
  req: Request,
  action:
    | 'CDS_HOOKS_NO_TENANT_RESOLVED'
    | 'CDS_HOOKS_JWT_VALIDATION_FAILURE'
    | 'CDS_HOOKS_UNMAPPED_ISSUER'
    | 'CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED',
  description: string,
  metadata: Record<string, unknown>,
  hospitalId: string | null = null,
): Promise<void> {
  try {
    await writeAuditLog(
      cdsHooksAuditReq(req, hospitalId),
      action,
      'CdsHooks',
      null,
      description,
      null,
      metadata,
    );
  } catch (err) {
    // writeAuditLog throws on HIPAA-grade DB write failure (per AUDIT-013).
    // The 4 actions above are HIPAA-graded per AUDIT-076 boundary refinement.
    // Surface the throw to the caller so the request fails closed.
    throw err;
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * CDS Hooks tenant resolution middleware.
 *
 * Mounts between `cdsLimiter` and the cdsHooks router. Discovery + feedback
 * endpoints bypass via `isExempt`. All other paths require successful tenant
 * resolution; failures fail-closed per AUDIT-015 sister pattern (200 + empty
 * cards or 401 per design §4) and emit a HIPAA-grade audit log entry.
 */
export const cdsHooksAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (isExempt(req)) {
    next();
    return;
  }

  const issuerUrl: string | undefined = req.body?.fhirAuthorization?.subject;

  // Path B (per D2): no fhirAuthorization → deny via 200 + empty cards
  if (!issuerUrl) {
    await auditFailure(
      req,
      'CDS_HOOKS_NO_TENANT_RESOLVED',
      'CDS Hooks invocation rejected: missing fhirAuthorization.subject',
      { path: req.path, method: req.method },
    );
    res.status(200).json({ cards: [] });
    return;
  }

  // Path A: verify JWT signature
  const jwtResult = await verifyJwt(req.headers.authorization, issuerUrl);
  if (!jwtResult.ok) {
    await auditFailure(
      req,
      'CDS_HOOKS_JWT_VALIDATION_FAILURE',
      `CDS Hooks JWT validation failed: ${jwtResult.reason}`,
      { path: req.path, issuerUrl, reason: jwtResult.reason },
    );
    // 401 per D3 — JWT-signature-level failures are auth-boundary errors
    res.status(401).json({ error: 'Invalid CDS Hooks JWT' });
    return;
  }

  // Look up HospitalEhrIssuer mapping
  const lookup = await lookupIssuer(issuerUrl);
  if (!lookup.ok || !lookup.hospitalId || !lookup.ehrIssuerId) {
    await auditFailure(
      req,
      'CDS_HOOKS_UNMAPPED_ISSUER',
      `CDS Hooks issuer not registered: ${issuerUrl}`,
      { path: req.path, issuerUrl },
    );
    res.status(200).json({ cards: [] });
    return;
  }

  // Populate tenant context. Handler MUST scope all Patient queries by hospitalId.
  (req as CdsHooksAuthenticatedRequest).cdsHooks = {
    hospitalId: lookup.hospitalId,
    issuerUrl,
    ehrIssuerId: lookup.ehrIssuerId,
  };

  logger.info('CDS Hooks tenant resolved', {
    path: req.path,
    issuerUrl,
    hospitalId: lookup.hospitalId,
    ehrIssuerId: lookup.ehrIssuerId,
  });

  next();
};

// Test helper — clear JWKS cache between tests to avoid cross-test contamination.
export function _resetJwksCacheForTests(): void {
  jwksCache.clear();
}
