/**
 * AUDIT-011 Layer 3 — TENANT_GUARD_STRICT bypass marker.
 *
 * Apply `{ [TENANT_GUARD_BYPASS]: true }` to Prisma args when a query is
 * intentionally cross-tenant or system-internal. Legitimate use cases:
 *   - Webhook ingest (services/webhookPipeline.ts) where hospitalId is
 *     resolved from the HMAC-validated payload, not from a user JWT.
 *   - Audit logging (middleware/auditLogger.ts) where hospitalId is
 *     nullable for unauthenticated events (failed-login attempts, etc.).
 *   - SUPER_ADMIN cross-tenant tooling (e.g., crossReferralService
 *     getReferralByIdAcrossTenants), gated by route-level role checks.
 *
 * Layer 3 (Prisma extension, planned in docs/audit/AUDIT_011_DESIGN.md
 * §6 Phase b) will inspect Prisma args for this symbol and skip the
 * hospitalId enforcement when present. Until Phase b ships, the symbol
 * is a no-op marker — Prisma's runtime model checker inspects string
 * keys only and ignores symbol-keyed properties.
 *
 * Phase a-pre (this PR) installs the marker at every legitimate bypass
 * callsite so Phase b can flag-flip without further application code
 * changes.
 *
 * Symbol.for() interns on the global symbol registry, so multiple imports
 * of this module yield the same symbol identity (important for the Layer
 * 3 extension's hasOwnProperty check).
 */
export const TENANT_GUARD_BYPASS = Symbol.for('tailrd:tenant_guard_bypass');
