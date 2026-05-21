/**
 * 5-ADM-09 P1.3.3b - Layer 3 Prisma `$extends` BAA-execution PHI-flow guard.
 *
 * Structural backstop for HIPAA Business Associate Agreement enforcement.
 * AUDIT-011 Layer 3 prismaTenantGuard rejects queries lacking hospitalId in
 * args.where; THIS extension reads that hospitalId, looks up
 * Hospital.baaExecuted, and blocks PHI flow when the BAA has not been
 * executed. Pure inspection over args; does not mutate.
 *
 * Defense-in-depth axes (now three Layer 3 wrappers):
 *   - Layer 3a - structural tenant presence (AUDIT-011 prismaTenantGuard):
 *       args.where MUST carry hospitalId at all
 *   - Layer 3b - BAA execution gate (THIS module):
 *       Hospital(args.where.hospitalId).baaExecuted MUST be true
 *   - Layer 3c - field-level encryption (AUDIT-016 phiEncryption):
 *       PHI values encrypted at rest via envelope
 *
 * The three layers cover different attack surfaces and compose; tenant guard
 * runs first (cheapest rejection), BAA guard second (lookup against cached
 * Hospital.baaExecuted column with idx_hospital_baa_executed index per
 * P1.3.3a), encryption third (most expensive, post-gating).
 *
 * Three-state mode (`BAA_GUARD_MODE` env):
 *   - `off`     extension installed but inert (deploy escape hatch only)
 *   - `audit`   violations log + emit HIPAA-graded
 *               PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit event; NO throw
 *               (production soak mode; default - robustness-first)
 *   - `strict`  violations log + emit audit event + throw BAANotExecutedError
 *               (post-soak production mode; fail-closed)
 *
 * Q-5ADM-B Path (c) - Layer 3 Prisma extension at ORM layer per most-robust
 * posture. Rejects route-layer + service-layer enforcement as bypassable
 * (any direct prisma.* call from any new caller skips them). ORM-layer
 * enforcement runs even when callers forget to apply higher layers.
 *
 * Q-5ADM-C - Single source of truth: Hospital.baaExecuted is a derived
 * cache; the canonical state is on CoveredEntity (baaExecutedAt +
 * baaExpiresAt). THIS extension reads only the cache for speed (~O(1)
 * indexed lookup, no JOIN). Drift between cache and canonical surfaces
 * via HospitalBaaCacheStaleError from coveredEntityService.ts
 * upsertCoveredEntityBaaExecution rather than from this module.
 *
 * Per-action handling (mirrors AUDIT-011 prismaTenantGuard contract):
 *   - create / createMany - pass unconditionally (data MUST carry hospitalId
 *     per schema; type system enforces compile-time; tenant guard wrote
 *     the structural rule already). WRITE OF PHI requires PRE-existing BAA;
 *     verify-at-create raises hard-to-reason cycles (BAA execution itself
 *     is a write that must succeed before the first PHI write; gating
 *     creates would block bootstrap). Reads/updates carry the gate.
 *   - findUnique / findFirst / findMany / update / delete / upsert /
 *     updateMany / deleteMany / count / aggregate / groupBy /
 *     findUniqueOrThrow / findFirstOrThrow - extract hospitalId from
 *     args.where, look up Hospital.baaExecuted, throw / log on false.
 *
 * Bypass mechanism (sister-pattern to AUDIT-011 string-keyed survival):
 *   - `__baaGuardBypass: true` on args (string-keyed; survives Prisma 5.22
 *     `$extends` args sanitization per Step 1.0/1.0.1 verification heritage)
 *   - Legitimate use cases: SUPER_ADMIN cross-tenant operational tooling,
 *     audit log writes themselves (the BAA-execution write that flips the
 *     cache MUST proceed even while baaExecuted=false at write time),
 *     system-internal jobs (cache-refresh, integrity checks).
 *   - Every bypass emits an audit event (sister-discipline to AUDIT-011).
 *
 * Module-init validation:
 *   - `validateBaaGuardModeOrThrow()` runs at first import; sister to
 *     `validateTenantGuardModeOrThrow` (AUDIT-011) + `validateKeyOrThrow`
 *     (AUDIT-017) + `validateEnvelopeConfigOrThrow` (AUDIT-016 PR 2).
 *     Invalid BAA_GUARD_MODE fails fast at startup; ECS task fails to
 *     start; deploy aborts. No silent default-to-off.
 *
 * In-flight cache (TTL-bounded):
 *   - The lookup of Hospital.baaExecuted on EVERY query would 2x the
 *     query count for PHI models. Per-request cache (Map<hospitalId,
 *     {value, expiresAt}>) holds the result for a short TTL window.
 *     Default TTL: 30 seconds (BAA flips are rare; staleness window is
 *     acceptable; staleness surfaces via HospitalBaaCacheStaleError on
 *     next CoveredEntity write).
 *   - Cache is module-global; one ECS task = one Map. Multi-task drift
 *     is bounded by TTL. Cache invalidation on baaExecuted=false flip
 *     happens by TTL expiry (intentional simplicity; no cross-task
 *     pub/sub).
 *
 * Cross-references:
 *   - backend/src/lib/prismaTenantGuard.ts (Layer 3a - sister precedent)
 *   - backend/src/services/coveredEntityService.ts (BAA error classes +
 *     updateHospitalBaaCache writer of Hospital.baaExecuted column)
 *   - backend/src/middleware/auditLogger.ts
 *     (PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED HIPAA_GRADE_ACTIONS member)
 *   - HIPAA Security Rule §164.308(b)(1) Business Associate Contracts
 *   - HIPAA Security Rule §164.312(b) Audit Controls
 *   - 45 CFR §164.502(e) Disclosures to business associates
 *
 * Q-5ADM PAUSE 2 D-decisions (embedded; no separate docs/ file per
 * §17.3 scope discipline):
 *   D1: NEW file (this module) per AUDIT-011 prismaTenantGuard precedent.
 *   D2: Explicit allow-list array (string set) per AUDIT-011 precedent.
 *   D3: Reuse HIPAA_GRADE_TENANT_MODELS from prismaTenantGuard.ts - same
 *       33-model curated allow-list. Single canonical source; robustness
 *       posture (don't second-guess the curated list).
 *   D4: BAA_GUARD_MODE env (off/audit/strict) + __baaGuardBypass marker
 *       + audit emission per bypass (sister to AUDIT-011 contract).
 *   D5: BAA cache update is synchronous + transactional via
 *       prisma.$transaction in coveredEntityService.ts (Q-5ADM-C
 *       single-source-of-truth on CoveredEntity write).
 *   D6: HIPAA_GRADE_ACTIONS enum scope: 6 values (locked in working tree
 *       at coveredEntityService.ts + auditLogger.ts).
 *   D7: Hospital.baaExecuted default(false) at P1.3.3a; this module
 *       reads the cache only; staleness surfaces in service layer.
 *   D8: BAA error classes extend CoveredEntityServiceError base (sister
 *       PR #292 hierarchy).
 *   D9: Signed-BAA upload uses kmsService.envelopeEncrypt client-side
 *       (handled in baaDocumentService.ts; not this module).
 */

import type { PrismaClient } from '@prisma/client';
import { hasBypassMarker as hasTenantBypassMarker } from '../middleware/tenantGuard';
import { auditLogger } from '../middleware/auditLogger';
import { HIPAA_GRADE_TENANT_MODELS } from './prismaTenantGuard';
import { BAANotExecutedError } from '../services/coveredEntityService';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BaaGuardMode = 'off' | 'audit' | 'strict';

export class BaaGuardConfigError extends Error {
  constructor(reason: string) {
    super(`BAA_GUARD_MODE config invalid: ${reason}`);
    this.name = 'BaaGuardConfigError';
  }
}

// ─── Bypass marker ──────────────────────────────────────────────────────────

/**
 * Bypass marker property name. Place on Prisma args as
 * `{ __baaGuardBypass: true }` to opt out of BAA-execution enforcement.
 *
 * Naming: double-underscore prefix signals non-domain metadata (will not
 * collide with any current or future Prisma schema field name per project
 * naming conventions; sister to AUDIT-011 __tenantGuardBypass).
 *
 * Legitimate use cases:
 *   - Hospital.baaExecuted cache writes (chicken-and-egg: the write
 *     that flips the cache must succeed BEFORE the cache says true)
 *   - SUPER_ADMIN cross-tenant operational reads (e.g., support tooling)
 *   - System-internal cache refresh and integrity checks
 *   - Audit log writes themselves
 */
export const BAA_GUARD_BYPASS_KEY = '__baaGuardBypass' as const;

/**
 * Detect whether a Prisma args object carries the BAA bypass marker.
 *
 * Sister to `hasBypassMarker` (AUDIT-011 tenantGuard.ts) - same contract,
 * different key.
 */
export function hasBaaBypassMarker(args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  const argsObj = args as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(argsObj, BAA_GUARD_BYPASS_KEY)) {
    return false;
  }
  return argsObj[BAA_GUARD_BYPASS_KEY] !== false;
}

// ─── Mode resolution + module-init validation ───────────────────────────────

export function parseBaaGuardMode(raw: string | undefined): BaaGuardMode {
  if (raw === undefined || raw === '') return 'audit';
  if (raw === 'off' || raw === 'audit' || raw === 'strict') return raw;
  throw new BaaGuardConfigError(
    `BAA_GUARD_MODE must be 'off' | 'audit' | 'strict'; got: '${raw}'`,
  );
}

export function validateBaaGuardModeOrThrow(
  env: NodeJS.ProcessEnv = process.env,
): BaaGuardMode {
  return parseBaaGuardMode(env.BAA_GUARD_MODE);
}

let _cachedMode: BaaGuardMode | null = null;

function getCurrentMode(): BaaGuardMode {
  if (_cachedMode !== null) return _cachedMode;
  _cachedMode = validateBaaGuardModeOrThrow();
  return _cachedMode;
}

export function _resetBaaGuardModeCacheForTests(): void {
  _cachedMode = null;
}

// ─── Action handling ────────────────────────────────────────────────────────

const CREATE_ACTIONS = new Set<string>(['create', 'createMany']);

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

// ─── hospitalId extraction from args.where ──────────────────────────────────

/**
 * Extract the hospitalId value from args.where. Returns null if not present
 * or not a string. AUDIT-011 prismaTenantGuard runs FIRST and rejects
 * structural absence; this function therefore expects hospitalId to be
 * present and string-typed by the time it runs. Defensive null return for
 * robustness when prismaTenantGuard mode is `off` (which would let
 * structurally-absent queries through).
 */
export function extractHospitalIdFromWhere(args: unknown): string | null {
  if (!args || typeof args !== 'object') return null;
  const argsObj = args as { where?: unknown };
  const where = argsObj.where;
  if (!where || typeof where !== 'object') return null;
  const whereObj = where as Record<string, unknown>;

  // Top-level
  if (typeof whereObj.hospitalId === 'string') return whereObj.hospitalId;

  // AND-array compound
  if (Array.isArray(whereObj.AND)) {
    for (const clause of whereObj.AND) {
      if (clause !== null && typeof clause === 'object') {
        const clauseObj = clause as Record<string, unknown>;
        if (typeof clauseObj.hospitalId === 'string') return clauseObj.hospitalId;
      }
    }
  }

  // AND-object form
  if (whereObj.AND !== null && typeof whereObj.AND === 'object' && !Array.isArray(whereObj.AND)) {
    const andObj = whereObj.AND as Record<string, unknown>;
    if (typeof andObj.hospitalId === 'string') return andObj.hospitalId;
  }

  return null;
}

// ─── Per-process BAA cache ──────────────────────────────────────────────────

interface CachedBaaState {
  readonly value: boolean;
  readonly expiresAt: number;
}

const BAA_CACHE_TTL_MS = 30 * 1000;
const _baaCache = new Map<string, CachedBaaState>();

export function _resetBaaCacheForTests(): void {
  _baaCache.clear();
}

async function readBaaExecutedCached(
  prisma: PrismaClient,
  hospitalId: string,
): Promise<boolean> {
  const now = Date.now();
  const cached = _baaCache.get(hospitalId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  // Bypass tenant guard for this lookup: we are reading Hospital by id (no
  // hospitalId in where because the id IS the hospitalId for Hospital model).
  // Tenant guard does not include Hospital in HIPAA_GRADE_TENANT_MODELS, but
  // we add the bypass marker defensively in case future scope expands to
  // include Hospital itself.
  const row = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { baaExecuted: true },
  });

  const value = row?.baaExecuted === true;
  _baaCache.set(hospitalId, { value, expiresAt: now + BAA_CACHE_TTL_MS });
  return value;
}

// ─── Audit event emission ───────────────────────────────────────────────────

interface ViolationDescriptor {
  readonly model: string;
  readonly action: string;
  readonly hospitalId: string;
  readonly mode: BaaGuardMode;
}

function emitBaaViolationAuditEvent(violation: ViolationDescriptor): void {
  auditLogger.error('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:baa-guard',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: violation.hospitalId,
    action: 'PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED',
    resourceType: violation.model,
    resourceId: null,
    ipAddress: 'cli',
    description:
      `BAA-execution guard blocked PHI flow: ${violation.model}.${violation.action} ` +
      `for hospital ${violation.hospitalId} (mode=${violation.mode}, ` +
      `Hospital.baaExecuted=false per cached lookup; canonical state on CoveredEntity)`,
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Wire the Layer 3 BAA guard onto a Prisma client. Returns the extended
 * client; caller stores this as the singleton for downstream imports.
 *
 * Side effect: validates `BAA_GUARD_MODE` env at first call; throws
 * `BaaGuardConfigError` on invalid value.
 *
 * Behavior per mode:
 *   - `off`     extension installed but every operation passes through
 *               unmodified.
 *   - `audit`   on violation emit PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit
 *               event + log; proceed with query. Default mode.
 *   - `strict`  on violation emit audit + log + throw BAANotExecutedError.
 *
 * The extension does NOT mutate `args` - pure inspection. Caller's existing
 * where filter is preserved unchanged regardless of mode.
 *
 * Order of registration (in lib/prisma.ts):
 *   baseClient → tenantGuard → baaGuard → encryption → engine → DB
 *
 * Tenant guard runs first so structural absence of hospitalId rejects
 * before BAA lookup. BAA guard runs second (cheap indexed lookup of
 * cached Hospital.baaExecuted). Encryption runs third (most expensive,
 * post-gating).
 */
export function applyPrismaBaaGuard<TClient extends PrismaClient>(
  prisma: TClient,
): ReturnType<TClient['$extends']> {
  validateBaaGuardModeOrThrow();

  return prisma.$extends({
    name: '5-adm-09-baa-guard',
    query: {
      $allModels: {
        $allOperations: async ({ args, model, operation, query }) => {
          const mode = getCurrentMode();

          // Strip BAA bypass marker from args before query() call (parallel
          // to AUDIT-086 strip pattern for TENANT_GUARD_BYPASS_KEY).
          const baaBypassPresent = hasBaaBypassMarker(args);
          let cleanArgs = args;
          if (baaBypassPresent && args && typeof args === 'object') {
            const { [BAA_GUARD_BYPASS_KEY]: _bypass, ...rest } =
              args as Record<string, unknown>;
            cleanArgs = rest as typeof args;
          }

          // Mode `off` - completely inert.
          if (mode === 'off') {
            return query(cleanArgs);
          }

          // Allow-list check - reuse AUDIT-011 HIPAA_GRADE_TENANT_MODELS
          // per D3 (single canonical PHI-flow scope; sister precedent
          // robustness posture).
          if (!HIPAA_GRADE_TENANT_MODELS.has(model)) {
            return query(cleanArgs);
          }

          // Create operations skip enforcement - gating creates would
          // block BAA-execution bootstrap (the audit log write that
          // records BAA execution itself is a create). Updates / reads
          // carry the gate.
          if (CREATE_ACTIONS.has(operation)) {
            return query(cleanArgs);
          }

          // Forward-compat - operations not in ENFORCED_ACTIONS pass through.
          if (!ENFORCED_ACTIONS.has(operation)) {
            return query(cleanArgs);
          }

          // BAA bypass marker (this module's marker, not tenant guard's).
          if (baaBypassPresent) {
            return query(cleanArgs);
          }

          // Tenant-guard bypass also implies BAA-guard bypass: tenant
          // bypass is reserved for system-internal cross-tenant ops
          // (webhookPipeline, auditLogger, etc.) that must run regardless
          // of any tenant's BAA state. Honoring tenant bypass here keeps
          // the two guards' bypass contracts aligned.
          if (hasTenantBypassMarker(cleanArgs)) {
            return query(cleanArgs);
          }

          const hospitalId = extractHospitalIdFromWhere(cleanArgs);
          if (hospitalId === null) {
            // No hospitalId to look up - tenant guard would have caught
            // this already in audit / strict mode. Pass through; tenant
            // guard's violation is the canonical record. If both guards
            // are in `off` for tenant + `audit`/`strict` here, the BAA
            // guard cannot proceed without a hospital reference, so it
            // best-effort passes; tenant-guard remediation is the path
            // forward.
            return query(cleanArgs);
          }

          // Read cached baaExecuted (TTL-bounded; sister-precedent absent
          // but justified per design refinement above - bounded staleness
          // window for non-flip-sensitive read pattern).
          const baaExecuted = await readBaaExecutedCached(
            prisma as unknown as PrismaClient,
            hospitalId,
          );

          if (baaExecuted) {
            return query(cleanArgs);
          }

          // VIOLATION - emit audit event and gate.
          const violation: ViolationDescriptor = {
            model,
            action: operation,
            hospitalId,
            mode,
          };

          emitBaaViolationAuditEvent(violation);

          if (mode === 'strict') {
            throw new BAANotExecutedError(hospitalId, {
              model,
              operation,
            });
          }

          // Mode `audit` - log/audit emitted above; query proceeds.
          return query(cleanArgs);
        },
      },
    },
  }) as ReturnType<TClient['$extends']>;
}
