/**
 * AUDIT-011 Layer 3 — TENANT_GUARD_BYPASS marker.
 *
 * Apply `{ __tenantGuardBypass: true }` to Prisma args when a query is
 * intentionally cross-tenant or system-internal. Legitimate use cases:
 *   - Webhook ingest (services/webhookPipeline.ts) where hospitalId is
 *     resolved from the HMAC-validated payload, not from a user JWT.
 *   - Audit logging (middleware/auditLogger.ts) where hospitalId is
 *     nullable for unauthenticated events (failed-login attempts, etc.).
 *   - SUPER_ADMIN cross-tenant tooling (e.g., crossReferralService
 *     getReferralByIdAcrossTenants), gated by route-level role checks.
 *   - FeatureUsage analytics aggregation reads (routes/analytics.ts) where
 *     SUPER_ADMIN cross-tenant aggregation is the primary use; per-tenant
 *     write at middleware/analytics.ts:257 stays Layer 3-enforced (compound
 *     unique key includes hospitalId).
 *
 * Phase a-pre Symbol.for() pattern fully migrated to string-keyed
 * `__tenantGuardBypass` during AUDIT-011 Phase b/c implementation
 * (2026-05-07). All 11 production callsites + 2 migration script callsites
 * updated. Symbol export removed; only `TENANT_GUARD_BYPASS_KEY` constant +
 * `hasBypassMarker` helper exported.
 *
 * Driver: Prisma 5.22 `$extends({ query: { $allModels: { $allOperations
 * } } })` strips Symbol-keyed properties from args before passing to the
 * wrapper (verified in `backend/src/lib/__tests__/prismaTenantGuardSymbolSurvival.test.ts`
 * Step 1.0). String-keyed properties survive transit (Step 1.0.1).
 *
 * Detection (Layer 3 reads):
 *   - Inspect args via `hasBypassMarker(args)` helper exported below
 *   - Returns true if `args.__tenantGuardBypass === true` AND args is a
 *     plain object (defensive against null/undefined/non-object args)
 *   - The exported helper is the canonical detection point — Layer 3 calls it,
 *     and tests assert the same contract.
 *
 * Cross-references:
 *   - docs/audit/AUDIT_011_DESIGN.md §6 Phase b (Layer 3 implementation)
 *   - docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md §4
 *     (bypass mechanism + Step 1.0/1.0.1 verdict capture)
 *   - backend/src/lib/__tests__/prismaTenantGuardSymbolSurvival.test.ts
 *     (Step 1.0 + 1.0.1 verification gates)
 */

/**
 * Bypass marker property name. Place on Prisma args as
 * `{ __tenantGuardBypass: true }` to opt out of Layer 3 enforcement.
 *
 * Naming: double-underscore prefix signals non-domain metadata (will not
 * collide with any current or future Prisma schema field name per project
 * naming conventions).
 */
export const TENANT_GUARD_BYPASS_KEY = '__tenantGuardBypass' as const;

/**
 * Detect whether a Prisma args object carries the bypass marker.
 *
 * Returns true iff:
 *   - args is a plain object (not null/undefined/non-object)
 *   - args has own property `__tenantGuardBypass`
 *   - args.__tenantGuardBypass !== false (defensive against accidental
 *     `false` setting; the marker semantically means "bypass on" so any
 *     truthy value short of explicit `false` activates)
 *
 * Layer 3 (`prismaTenantGuard.ts`) is the canonical caller. Tests assert
 * the same contract on identical fixture shapes.
 */
export function hasBypassMarker(args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  const argsObj = args as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(argsObj, TENANT_GUARD_BYPASS_KEY)) {
    return false;
  }
  return argsObj[TENANT_GUARD_BYPASS_KEY] !== false;
}
