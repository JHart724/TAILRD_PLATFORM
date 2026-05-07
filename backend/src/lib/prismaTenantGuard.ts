/**
 * AUDIT-011 Layer 3 — Prisma `$extends` tenant-isolation guard.
 *
 * Structural backstop for multi-tenancy enforcement. Layer 1 (RBAC) +
 * Layer 2 (`enforceHospitalScope` + per-handler `where: { hospitalId }`
 * discipline) are app-layer; this module is the data-layer enforcement
 * that catches "forgot to filter at all" by construction. Pure function
 * over `params.args.where` — does NOT inspect req.user.hospitalId; that's
 * Layer 2's value-match axis.
 *
 * Defense-in-depth axes:
 *   - Layer 2 — semantic match: where.hospitalId === req.user.hospitalId
 *   - Layer 3 — structural presence: where.hospitalId in args.where AT ALL
 *
 * The two layers cover different attack surfaces; complementary not redundant.
 *
 * Three-state mode (`TENANT_GUARD_MODE` env):
 *   - `off`     extension installed but inert (deploy escape hatch only)
 *   - `audit`   violations log + emit HIPAA-graded TENANT_GUARD_VIOLATION
 *               audit event; NO throw (production soak mode; default)
 *   - `strict`  violations log + emit audit event + throw TenantGuardError
 *               (post-soak production mode)
 *
 * Per-action handling:
 *   - create / createMany — pass unconditionally (data must include
 *     hospitalId per schema; type system enforces compile-time)
 *   - findUnique / findFirst / findMany / update / delete / upsert /
 *     updateMany / deleteMany / count / aggregate / groupBy /
 *     findUniqueOrThrow / findFirstOrThrow — inspect args.where for
 *     hospitalId presence; throw / log on missing
 *
 * Bypass mechanism:
 *   - `__tenantGuardBypass: true` on args (string-keyed; survives Prisma
 *     5.22 `$extends` args sanitization per Step 1.0/1.0.1 verification)
 *   - 11 production callsites + 3 FeatureUsage analytics-read callsites
 *     use this marker (sister-discipline to webhookPipeline pattern)
 *   - Detection helper: `hasBypassMarker(args)` from `tenantGuard.ts`
 *
 * Module-init validation:
 *   - `validateTenantGuardModeOrThrow()` runs at first import; sister to
 *     `validateKeyOrThrow` (AUDIT-017) + `validateEnvelopeConfigOrThrow`
 *     (AUDIT-016 PR 2). Invalid TENANT_GUARD_MODE fails fast at startup.
 *
 * Cross-references:
 *   - docs/audit/AUDIT_011_DESIGN.md §6 Phase b/c (Layer 3 design + rollout)
 *   - docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md
 *     (full design refinement; D1-D9 + Step 1.0/1.0.1 + PAUSE 2.6/2.7)
 *   - backend/src/middleware/tenantGuard.ts (TENANT_GUARD_BYPASS_KEY +
 *     hasBypassMarker helper; canonical detection contract)
 *   - backend/src/middleware/auditLogger.ts (TENANT_GUARD_VIOLATION promoted
 *     to HIPAA_GRADE_ACTIONS Set per AUDIT-076 partial closure +1)
 *   - HIPAA Security Rule §164.312(a)(1) Access Control standard
 *   - HIPAA Security Rule §164.312(b) Audit Controls
 */

import type { PrismaClient } from '@prisma/client';
import { hasBypassMarker, TENANT_GUARD_BYPASS_KEY } from '../middleware/tenantGuard';
import { auditLogger } from '../middleware/auditLogger';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Three-state runtime mode for Layer 3 enforcement. Default is `audit` —
 * extension fires + logs + emits audit events without throwing. Allows
 * production soak window where violations surface in CloudWatch / DB
 * audit log without breaking real user requests. Operators flip to
 * `strict` after the soak window confirms zero false-positive throws.
 */
export type TenantGuardMode = 'off' | 'audit' | 'strict';

/**
 * Structured error thrown by Layer 3 in `strict` mode (and constructed
 * but not thrown in `audit` mode). Sister to `EnvelopeFormatError`
 * (AUDIT-015) and `KeyValidationError` (AUDIT-017) — fail-loud pattern,
 * structured fields for forensic triage.
 */
export class TenantGuardError extends Error {
  readonly model: string;
  readonly action: string;
  readonly providedWhereKeys: readonly string[];
  readonly mode: TenantGuardMode;
  readonly bypassMarkerPresent: boolean;
  readonly bypassGuidance: string;

  constructor(input: {
    model: string;
    action: string;
    providedWhereKeys: readonly string[];
    mode: TenantGuardMode;
    bypassMarkerPresent: boolean;
  }) {
    const guidance =
      `Either include hospitalId in args.where (e.g., where: { id, hospitalId }) ` +
      `or pass { __tenantGuardBypass: true } at the top level of args for ` +
      `SUPER_ADMIN / system-internal tooling. See ` +
      `backend/src/middleware/tenantGuard.ts for the canonical contract and ` +
      `existing bypass callsites (auditLogger.ts, webhookPipeline.ts × 8, ` +
      `crossReferralService.ts, phenotypeService.ts, analytics.ts × 3).`;
    super(
      `Tenant guard: ${input.model}.${input.action} called without hospitalId in where clause ` +
        `(provided keys: ${input.providedWhereKeys.length > 0 ? input.providedWhereKeys.join(', ') : '<none>'}). ` +
        `Mode: ${input.mode}. ${guidance}`,
    );
    this.name = 'TenantGuardError';
    this.model = input.model;
    this.action = input.action;
    this.providedWhereKeys = input.providedWhereKeys;
    this.mode = input.mode;
    this.bypassMarkerPresent = input.bypassMarkerPresent;
    this.bypassGuidance = guidance;
  }
}

/**
 * Thrown at module init when `TENANT_GUARD_MODE` env value is invalid.
 * Sister to `EnvelopeConfigError` (AUDIT-016 PR 2) + `KeyValidationError`
 * (AUDIT-017). Fails fast at startup; ECS task fails to start; deploy
 * aborts. No silent default-to-off (would mask the misconfiguration).
 */
export class TenantGuardConfigError extends Error {
  constructor(reason: string) {
    super(`TENANT_GUARD_MODE config invalid: ${reason}`);
    this.name = 'TenantGuardConfigError';
  }
}

// ─── HIPAA-graded tenant-bound model allow-list ─────────────────────────────

/**
 * Models that REQUIRE `hospitalId` in `args.where` for non-create operations.
 *
 * 33 entries per PAUSE 2.6 + 2.7 verification (callsite-level scoping
 * verification — not just schema-column-presence enumeration). See
 * `docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md` §2.1
 * for the full verdict table.
 *
 * System-bypass list (NOT enforced; documented in design §2.2):
 *   ErrorLog, FailedFhirBundle, PerformanceMetric, PerformanceRequestLog,
 *   BusinessMetric, LoginSession, InviteToken, Onboarding, UserActivity
 *   (9 models — 4 nullable-hospitalId system events + 2 analytics-aggregation
 *   + 2 token/session-scoped + 1 SUPER_ADMIN-only operator surface).
 *
 * FeatureUsage stays in this allow-list per PAUSE 2.7 (b) refinement
 * (defense-in-depth: primary write at middleware/analytics.ts:257 IS
 * hospitalId-scoped via compound unique key; 3 analytics-read callsites
 * carry conditional `__tenantGuardBypass: true` for SUPER_ADMIN
 * cross-tenant aggregation).
 */
export const HIPAA_GRADE_TENANT_MODELS: ReadonlySet<string> = new Set<string>([
  // Core patient PHI (10 models; AUDIT-011 design §4.3 starter)
  'Patient',
  'Encounter',
  'Observation',
  'Alert',
  'TherapyGap',
  'Phenotype',
  'RiskScoreAssessment',
  'InterventionTracking',
  'ContraindicationAssessment',
  'CarePlan',
  // Clinical decision support (7 models; AUDIT-011 design §4.3 starter)
  'DrugTitration',
  'DeviceEligibility',
  'CrossReferral',
  'AuditLog',
  'PatientDataRequest',
  'WebhookEvent',
  'CdsHooksSession',
  // Clinical content (8 models; PAUSE 2 robustness expansion)
  'Condition',
  'Medication',
  'Order',
  'Procedure',
  'AllergyIntolerance',
  'DrugInteractionAlert',
  'DeviceImplant',
  'Recommendation',
  // Operational + research (6 models; PAUSE 2 robustness expansion)
  'HospitalEhrIssuer',
  'BpciEpisode',
  'CQLResult',
  'QualityMeasure',
  'UploadJob',
  'InternalNote',
  // Analytics + reporting (2 models; PAUSE 2.6 + 2.7 retained)
  'FeatureUsage',
  'ReportGeneration',
]);

// ─── Mode resolution + module-init validation ───────────────────────────────

/**
 * Parse `TENANT_GUARD_MODE` env value into a typed mode enum.
 *
 * Default (unset / empty string): `audit` — robustness-first posture
 * (extension fires + logs + emits audit events without throwing).
 *
 * @throws TenantGuardConfigError on invalid value (anything outside
 *   `off | audit | strict`).
 */
export function parseTenantGuardMode(raw: string | undefined): TenantGuardMode {
  if (raw === undefined || raw === '') return 'audit';
  if (raw === 'off' || raw === 'audit' || raw === 'strict') return raw;
  throw new TenantGuardConfigError(
    `TENANT_GUARD_MODE must be 'off' | 'audit' | 'strict'; got: '${raw}'`,
  );
}

/**
 * Module-init validator. Sister to `validateKeyOrThrow` (AUDIT-017) +
 * `validateEnvelopeConfigOrThrow` (AUDIT-016 PR 2). Fails fast at module
 * init with structured error.
 *
 * Called for side effect by `applyPrismaTenantGuard` so any consumer that
 * wires the extension also pays the validation cost (no silent default).
 */
export function validateTenantGuardModeOrThrow(
  env: NodeJS.ProcessEnv = process.env,
): TenantGuardMode {
  return parseTenantGuardMode(env.TENANT_GUARD_MODE);
}

// Cache the parsed mode at module init; flag flip requires ECS task
// restart per design refinement note §5.2 (sister to AUDIT-013/017/AUDIT-016
// PR 2 module-init cached patterns). No hot-reload path.
let _cachedMode: TenantGuardMode | null = null;

function getCurrentMode(): TenantGuardMode {
  if (_cachedMode !== null) return _cachedMode;
  _cachedMode = validateTenantGuardModeOrThrow();
  return _cachedMode;
}

/**
 * Test helper — clear cached mode so env-mutating tests re-resolve. Mirror
 * of `_resetKeyValidationCacheForTests` from keyRotation.ts.
 */
export function _resetTenantGuardModeCacheForTests(): void {
  _cachedMode = null;
}

// ─── Where-clause inspection ────────────────────────────────────────────────

/**
 * Detect whether `args.where` contains `hospitalId` at any of the supported
 * positions. Pure function over args; does NOT inspect req.user.hospitalId.
 *
 * Supported positions (mirror Prisma `where` filter semantics):
 *   - Top-level: `where: { hospitalId: '...' }`
 *   - AND-array compound: `where: { AND: [{ id: '...' }, { hospitalId: '...' }] }`
 *   - AND-object form: `where: { AND: { hospitalId: '...' } }`
 *
 * NOT detected (intentional — these are not structural presence):
 *   - OR-array branches (any branch could omit hospitalId; structural
 *     enforcement requires every read to carry hospitalId at top level
 *     OR in every AND branch)
 *   - Nested relation filters (e.g., `where: { patient: { hospitalId } }`)
 *
 * @param args Prisma operation args (may be undefined; returns false)
 */
export function hasHospitalIdInWhere(args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  const argsObj = args as { where?: unknown };
  const where = argsObj.where;
  if (!where || typeof where !== 'object') return false;
  const whereObj = where as Record<string, unknown>;

  // Top-level
  if (Object.prototype.hasOwnProperty.call(whereObj, 'hospitalId')) return true;

  // AND-array compound
  if (Array.isArray(whereObj.AND)) {
    return whereObj.AND.some(
      (clause) =>
        clause !== null &&
        typeof clause === 'object' &&
        Object.prototype.hasOwnProperty.call(clause, 'hospitalId'),
    );
  }

  // AND-object form
  if (whereObj.AND !== null && typeof whereObj.AND === 'object') {
    return Object.prototype.hasOwnProperty.call(
      whereObj.AND as Record<string, unknown>,
      'hospitalId',
    );
  }

  return false;
}

// ─── Action handling ────────────────────────────────────────────────────────

/**
 * Operations that skip Layer 3 enforcement (no `where` to inspect; data
 * payload validation is the type-system's job).
 */
const CREATE_ACTIONS = new Set<string>(['create', 'createMany']);

/**
 * Operations that MUST be inspected. Listed explicitly (rather than
 * negation of CREATE_ACTIONS) so future Prisma operation additions
 * default to "not enforced" until the allow-list is extended — fail-safe
 * for forward-compat.
 */
const ENFORCED_ACTIONS = new Set<string>([
  'findUnique',
  'findFirst',
  'findMany',
  'update',
  'delete',
  'upsert',
  'updateMany',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
  'findUniqueOrThrow',
  'findFirstOrThrow',
]);

// ─── Audit event emission ───────────────────────────────────────────────────

interface ViolationDescriptor {
  readonly model: string;
  readonly action: string;
  readonly providedWhereKeys: readonly string[];
  readonly mode: TenantGuardMode;
  readonly bypassMarkerPresent: boolean;
}

function emitViolationAuditEvent(violation: ViolationDescriptor): void {
  // Best-effort file/console transport — DB-write is via writeAuditLog
  // upstream when caller is request-scoped; here we go via the auditLogger
  // direct (sister to KMS_KEY_VALIDATION_FAILURE pattern from AUDIT-016 PR 2).
  // TENANT_GUARD_VIOLATION is HIPAA_GRADE per design §7 — promotion happens
  // in auditLogger.ts HIPAA_GRADE_ACTIONS Set update (Step 4 of work-order).
  auditLogger.error('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:tenant-guard',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: null,
    action: 'TENANT_GUARD_VIOLATION',
    resourceType: violation.model,
    resourceId: null,
    ipAddress: 'cli',
    description:
      `Tenant guard violation: ${violation.model}.${violation.action} ` +
      `missing hospitalId (mode=${violation.mode}, ` +
      `bypassMarkerPresent=${violation.bypassMarkerPresent}, ` +
      `providedWhereKeys=[${violation.providedWhereKeys.join(',')}])`,
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Wire the Layer 3 tenant guard onto a Prisma client. Returns the extended
 * client; caller stores this as the singleton for downstream imports.
 *
 * Side effect: validates `TENANT_GUARD_MODE` env at first call; throws
 * `TenantGuardConfigError` on invalid value (sister to `validateKeyOrThrow`
 * + `validateEnvelopeConfigOrThrow` startup gates).
 *
 * Behavior per mode:
 *   - `off`     extension installed but every operation passes through
 *               unmodified (no inspection, no logging, no audit, no throw).
 *               Deploy escape hatch — set when emergency rollback needed.
 *   - `audit`   inspect args.where; on violation emit
 *               TENANT_GUARD_VIOLATION HIPAA-graded audit event + log;
 *               proceed with query. Default mode — production soak window.
 *   - `strict`  inspect args.where; on violation emit audit + log +
 *               throw TenantGuardError (caller surfaces 500). Production
 *               post-soak.
 *
 * The extension does NOT mutate `args` — pure inspection. Caller's existing
 * where filter is preserved unchanged regardless of mode.
 *
 * Compatibility: stacks transparently with `applyPHIEncryption` (which is
 * also `$extends`-based after AUDIT-011 Phase b/c migration). Order of
 * registration determines the wrapper-call order; for tenant-guard +
 * encryption together, register tenant-guard FIRST so it inspects
 * pre-encryption args (post-encryption args still carry hospitalId in
 * where unchanged — encryption operates on data values, not where keys).
 */
export function applyPrismaTenantGuard<TClient extends PrismaClient>(
  prisma: TClient,
): ReturnType<TClient['$extends']> {
  // Validate env at wire-up time so misconfiguration is caught at startup
  // rather than at first violation. Throw propagates to caller (likely
  // lib/prisma.ts module init) so deploy fails fast.
  validateTenantGuardModeOrThrow();

  return prisma.$extends({
    name: 'audit-011-tenant-guard',
    query: {
      $allModels: {
        $allOperations: async ({ args, model, operation, query }) => {
          const mode = getCurrentMode();

          // Mode `off` — completely inert; no inspection, no logging.
          if (mode === 'off') {
            return query(args);
          }

          // Allow-list check — only enforce on HIPAA-graded tenant-bound models.
          if (!HIPAA_GRADE_TENANT_MODELS.has(model)) {
            return query(args);
          }

          // Create operations skip enforcement — schema-typed `data` payload
          // is the compile-time guarantee (hospitalId required as schema field).
          if (CREATE_ACTIONS.has(operation)) {
            return query(args);
          }

          // Forward-compat — operations not in ENFORCED_ACTIONS pass through.
          // New Prisma operations default to "not enforced" until allow-list
          // is extended (fail-safe).
          if (!ENFORCED_ACTIONS.has(operation)) {
            return query(args);
          }

          // Bypass marker — explicit opt-out for legitimate cross-tenant /
          // system-internal callsites. 14 production callsites today
          // (auditLogger × 1, webhookPipeline × 8, crossReferralService × 1,
          // phenotypeService × 1, analytics × 3 conditional).
          const bypassPresent = hasBypassMarker(args);
          if (bypassPresent) {
            return query(args);
          }

          // Structural inspection — does where carry hospitalId at any
          // supported position?
          if (hasHospitalIdInWhere(args)) {
            return query(args);
          }

          // VIOLATION — record for forensic triage.
          const argsObj = (args as { where?: Record<string, unknown> }) || {};
          const providedWhereKeys: readonly string[] = argsObj.where && typeof argsObj.where === 'object'
            ? Object.keys(argsObj.where)
            : [];

          const violation: ViolationDescriptor = {
            model,
            action: operation,
            providedWhereKeys,
            mode,
            bypassMarkerPresent: bypassPresent,
          };

          emitViolationAuditEvent(violation);

          if (mode === 'strict') {
            throw new TenantGuardError(violation);
          }

          // Mode `audit` — log/audit emitted above; query proceeds.
          return query(args);
        },
      },
    },
  }) as ReturnType<TClient['$extends']>;
}

/**
 * Re-export the bypass marker key so consumers don't need to import from
 * `tenantGuard.ts` separately. Single import path: `import { ..., TENANT_GUARD_BYPASS_KEY }
 * from './prismaTenantGuard'`.
 */
export { TENANT_GUARD_BYPASS_KEY };
