/**
 * coveredEntityService - CoveredEntity registry CRUD with tenant-isolation.
 *
 * 5-BRC-06 sub-phase 2 of 3 (P1.3.3b). Foundation for BA-to-CE breach
 * notification workflow per 45 CFR 164.410. Manages the registry of
 * downstream Covered Entities each TAILRD tenant maintains BA relationships
 * with (per Q-5BRC-A Option A1: 1 CE to N Hospitals).
 *
 * Tenant-isolation discipline (Q-5BRC-G + AUDIT-011 Layer 3 + CLAUDE.md
 * NEVER DO rules 6-8):
 *
 *   The CoveredEntity model carries its tenant FK as `tenantId` (sister to
 *   the canonical `hospitalId` tenant-FK pattern). Layer 3 prismaTenantGuard
 *   currently inspects `where.hospitalId` only; CoveredEntity is NOT in
 *   HIPAA_GRADE_TENANT_MODELS today. Tenant-isolation here is enforced at
 *   Layer 2 (this service) via explicit `where: { tenantId }` filters on
 *   every read/update/delete. Cross-tenant access throws
 *   TenantScopeViolationError.
 *
 *   Layer 3 generalization to support any tenant-FK column name is a
 *   17.1 architectural-precedent candidate flagged for P1.3.4 self-review
 *   codification.
 *
 * RBAC:
 *   - SUPER_ADMIN: full access (cross-tenant; pass null for tenantId to
 *     list all CEs across all tenants)
 *   - HOSPITAL_ADMIN: tenant-scoped access (manage own tenant's CE registry)
 *   - All other roles: denied (throws CoveredEntityAccessDeniedError)
 *
 * Audit-trail discipline (Q-5BRC-F):
 *   Service emits Winston-only audit entries (file + console + CloudWatch).
 *   Routes additionally call writeAuditLog(req, ...) for DB persistence.
 *   Dual emission covers operational at-a-glance (file) + HIPAA durable
 *   record (DB) per CLAUDE.md PHI audit-trail discipline.
 */

import type { CoveredEntity, Prisma, PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';
import { auditLogger } from '../middleware/auditLogger';
import type { UserRole } from '../types';

// Tx-or-base client union: accepts either the singleton or a $transaction-scoped
// inner client so callers can compose BAA cache updates atomically with the
// CoveredEntity write that triggered them (Q-5ADM-C single-source-of-truth).
type BaaCacheClient = PrismaClient | Prisma.TransactionClient;

// ─── Authenticated actor shape ─────────────────────────────────────────────
// Subset of JWTPayload sufficient for service-layer authorization.

export interface AuthenticatedActor {
  userId: string;
  email: string;
  role: UserRole;
  hospitalId: string;
}

// ─── Structured errors ─────────────────────────────────────────────────────

export class CoveredEntityServiceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'CoveredEntityServiceError';
    this.code = code;
  }
}

export class CoveredEntityNotFoundError extends CoveredEntityServiceError {
  constructor(id: string) {
    super('COVERED_ENTITY_NOT_FOUND', `CoveredEntity not found: ${id}`);
    this.name = 'CoveredEntityNotFoundError';
  }
}

export class TenantScopeViolationError extends CoveredEntityServiceError {
  readonly attemptedTenantId: string;
  readonly resourceTenantId: string;
  constructor(attemptedTenantId: string, resourceTenantId: string) {
    super(
      'TENANT_SCOPE_VIOLATION',
      `Cross-tenant access denied: actor tenant ${attemptedTenantId} attempted to access resource owned by tenant ${resourceTenantId}`,
    );
    this.name = 'TenantScopeViolationError';
    this.attemptedTenantId = attemptedTenantId;
    this.resourceTenantId = resourceTenantId;
  }
}

export class CoveredEntityAccessDeniedError extends CoveredEntityServiceError {
  readonly role: UserRole;
  constructor(role: UserRole, operation: string) {
    super(
      'COVERED_ENTITY_ACCESS_DENIED',
      `Role ${role} not authorized for CoveredEntity operation: ${operation}`,
    );
    this.name = 'CoveredEntityAccessDeniedError';
    this.role = role;
  }
}

export class CoveredEntityValidationError extends CoveredEntityServiceError {
  readonly field: string;
  constructor(field: string, reason: string) {
    super('COVERED_ENTITY_VALIDATION_FAILED', `Validation failed for ${field}: ${reason}`);
    this.name = 'CoveredEntityValidationError';
    this.field = field;
  }
}

// ─── 5-ADM-09 P1.3.3b BAA execution structured errors ──────────────────────
//
// Sister-precedent: PR #292 service-layer 4-error-class pattern. Each carries
// distinct structured fields for forensic triage and fail-loud HIPAA audit
// trail. Extends CoveredEntityServiceError base so code-field convention and
// type narrowing (instanceof) match the existing CE error hierarchy.
//
// BAANotExecutedError is consumed by:
//   - Service-layer functions (this module) on detected BAA-absence violations
//   - Prisma extension (prismaBaaGuard.ts) on PHI-flow-gating rejection in
//     strict mode (sister to TenantGuardError thrown by prismaTenantGuard.ts)

export class BAANotExecutedError extends CoveredEntityServiceError {
  readonly hospitalId: string;
  readonly model?: string;
  readonly operation?: string;

  constructor(hospitalId: string, context?: { model?: string; operation?: string }) {
    const contextSuffix = context?.model
      ? ` (blocked operation: ${context.model}.${context.operation ?? 'unknown'})`
      : '';
    super(
      'BAA_NOT_EXECUTED',
      `BAA not executed for hospital ${hospitalId}; PHI flow blocked per HIPAA §164.308(b)(1)${contextSuffix}`,
    );
    this.name = 'BAANotExecutedError';
    this.hospitalId = hospitalId;
    this.model = context?.model;
    this.operation = context?.operation;
  }
}

export class BAAExpiredError extends CoveredEntityServiceError {
  readonly hospitalId: string;
  readonly expiredAt: Date;

  constructor(hospitalId: string, expiredAt: Date) {
    super(
      'BAA_EXPIRED',
      `BAA expired for hospital ${hospitalId} at ${expiredAt.toISOString()}; renewal required before PHI flow resumes`,
    );
    this.name = 'BAAExpiredError';
    this.hospitalId = hospitalId;
    this.expiredAt = expiredAt;
  }
}

export class HospitalBaaCacheStaleError extends CoveredEntityServiceError {
  readonly hospitalId: string;
  readonly cacheValue: boolean;
  readonly authoritativeValue: boolean;

  constructor(hospitalId: string, cacheValue: boolean, authoritativeValue: boolean) {
    super(
      'HOSPITAL_BAA_CACHE_STALE',
      `Hospital ${hospitalId} BAA cache drift detected: cache=${cacheValue} authoritative=${authoritativeValue}; cache refreshed`,
    );
    this.name = 'HospitalBaaCacheStaleError';
    this.hospitalId = hospitalId;
    this.cacheValue = cacheValue;
    this.authoritativeValue = authoritativeValue;
  }
}

export class InvalidBaaTransitionError extends CoveredEntityServiceError {
  readonly fromState: string;
  readonly toState: string;
  readonly coveredEntityId: string;

  constructor(coveredEntityId: string, fromState: string, toState: string) {
    super(
      'INVALID_BAA_TRANSITION',
      `Invalid BAA state transition for CoveredEntity ${coveredEntityId}: ${fromState} to ${toState}`,
    );
    this.name = 'InvalidBaaTransitionError';
    this.coveredEntityId = coveredEntityId;
    this.fromState = fromState;
    this.toState = toState;
  }
}

// ─── Input types ───────────────────────────────────────────────────────────

export interface CreateCoveredEntityInput {
  name: string;
  legalName?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  primaryContactAddress?: string | null;
  escalationContactName?: string | null;
  escalationContactEmail?: string | null;
  escalationContactPhone?: string | null;
  ceType?: string | null;
  baaExecutedAt?: Date | null;
  baaExpiresAt?: Date | null;
  baaDocumentUrl?: string | null;
  notes?: string | null;
}

export interface UpdateCoveredEntityInput {
  name?: string;
  legalName?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  primaryContactAddress?: string | null;
  escalationContactName?: string | null;
  escalationContactEmail?: string | null;
  escalationContactPhone?: string | null;
  ceType?: string | null;
  baaExecutedAt?: Date | null;
  baaExpiresAt?: Date | null;
  baaDocumentUrl?: string | null;
  notes?: string | null;
}

export interface CoveredEntityFilters {
  ceType?: string;
  baaExpiringBefore?: Date;
}

// ─── 5-ADM-09 P1.3.3b BAA execution input + context types ──────────────────
//
// Sister-precedent: existing CreateCoveredEntityInput / UpdateCoveredEntityInput
// shape. These types drive the CE-level BAA execution state machine
// (NOT_EXECUTED <-> EXECUTED) per Q-5ADM-C single-source-of-truth discipline
// (CoveredEntity owns the authoritative state; Hospital.baaExecuted is a
// derived cache propagated by `updateHospitalBaaCache`).

/**
 * Input shape for `upsertCoveredEntityBaaExecution`.
 *
 * Field semantics:
 *   - `baaExecutedAt: null`   revoke (transition to NOT_EXECUTED)
 *   - `baaExecutedAt: Date`   record / update (transition to or remain EXECUTED)
 *   - `baaExpiresAt`          optional renewal-due timestamp; must be later
 *                             than baaExecutedAt when both are supplied
 *   - `baaDocumentUrl`        optional reference to the executed-PDF artifact
 *                             (S3 key or URL). Per Q-5ADM-D, signed-PDF
 *                             per-hospital upload metadata lives on Hospital
 *                             (signedBaaS3Key + signedBaaUploadedAt); this
 *                             field is the CE-level execution reference.
 *
 * `undefined` on baaExpiresAt or baaDocumentUrl means "leave unchanged";
 * explicit `null` means "clear the field".
 */
export interface UpsertBaaExecutionInput {
  baaExecutedAt: Date | null;
  baaExpiresAt?: Date | null;
  baaDocumentUrl?: string | null;
}

/**
 * Input shape for `updateHospitalBaaCache`. Carries the authoritative cache
 * values to propagate; this function does NOT re-derive (caller is
 * responsible for computing authoritative state at the transactional commit
 * boundary, per D5 single-source-of-truth).
 */
export interface UpdateHospitalBaaCacheInput {
  hospitalId: string;
  authoritativeBaaExecuted: boolean;
  authoritativeBaaExecutedAt: Date | null;
}

/**
 * Caller-supplied context for `updateHospitalBaaCache`.
 *
 *   - `actor`   AuthenticatedActor driving the parent write; HIPAA audit
 *               attribution for the HOSPITAL_BAA_CACHE_UPDATED event.
 *   - `client`  optional `Prisma.TransactionClient` when invoked from inside
 *               an outer `$transaction`; falls back to the singleton when
 *               absent. D5 transactional discipline (PAUSE 2 decisions).
 */
export interface BaaCacheUpdateContext {
  actor: AuthenticatedActor;
  client?: BaaCacheClient;
}

// ─── Authorization helpers ─────────────────────────────────────────────────

const MANAGE_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN'];
const READ_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'QUALITY_DIRECTOR'];

function assertCanManage(actor: AuthenticatedActor, operation: string): void {
  if (!MANAGE_ROLES.includes(actor.role)) {
    throw new CoveredEntityAccessDeniedError(actor.role, operation);
  }
}

function assertCanRead(actor: AuthenticatedActor, operation: string): void {
  if (!READ_ROLES.includes(actor.role)) {
    throw new CoveredEntityAccessDeniedError(actor.role, operation);
  }
}

function assertTenantScope(actor: AuthenticatedActor, resourceTenantId: string): void {
  // SUPER_ADMIN bypasses tenant scope.
  if (actor.role === 'SUPER_ADMIN') return;
  if (actor.hospitalId !== resourceTenantId) {
    throw new TenantScopeViolationError(actor.hospitalId, resourceTenantId);
  }
}

function emitAudit(
  level: 'info' | 'warn' | 'error',
  action: string,
  actor: AuthenticatedActor,
  resourceId: string | null,
  payload: Record<string, unknown>,
): void {
  auditLogger[level]('audit_event', {
    timestamp: new Date().toISOString(),
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    hospitalId: actor.hospitalId,
    action,
    resourceType: 'CoveredEntity',
    resourceId,
    source: 'coveredEntityService',
    ...payload,
  });
}

// ─── Input validation ──────────────────────────────────────────────────────

function validateCreateInput(input: CreateCoveredEntityInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new CoveredEntityValidationError('name', 'required and non-empty');
  }
  if (input.name.length > 255) {
    throw new CoveredEntityValidationError('name', 'must be <= 255 characters');
  }
  if (input.baaExpiresAt && input.baaExecutedAt && input.baaExpiresAt <= input.baaExecutedAt) {
    throw new CoveredEntityValidationError(
      'baaExpiresAt',
      'must be after baaExecutedAt',
    );
  }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function createCoveredEntity(
  tenantId: string,
  input: CreateCoveredEntityInput,
  actor: AuthenticatedActor,
): Promise<CoveredEntity> {
  assertCanManage(actor, 'create');
  assertTenantScope(actor, tenantId);
  validateCreateInput(input);

  const created = await prisma.coveredEntity.create({
    data: {
      tenantId,
      name: input.name,
      legalName: input.legalName ?? null,
      primaryContactName: input.primaryContactName ?? null,
      primaryContactEmail: input.primaryContactEmail ?? null,
      primaryContactPhone: input.primaryContactPhone ?? null,
      primaryContactAddress: input.primaryContactAddress ?? null,
      escalationContactName: input.escalationContactName ?? null,
      escalationContactEmail: input.escalationContactEmail ?? null,
      escalationContactPhone: input.escalationContactPhone ?? null,
      ceType: input.ceType ?? null,
      baaExecutedAt: input.baaExecutedAt ?? null,
      baaExpiresAt: input.baaExpiresAt ?? null,
      baaDocumentUrl: input.baaDocumentUrl ?? null,
      notes: input.notes ?? null,
    },
  });

  emitAudit('info', 'COVERED_ENTITY_CREATED', actor, created.id, {
    tenantId,
    ceType: created.ceType,
  });

  return created;
}

export async function getCoveredEntityById(
  tenantId: string,
  id: string,
  actor: AuthenticatedActor,
): Promise<CoveredEntity | null> {
  assertCanRead(actor, 'read');
  assertTenantScope(actor, tenantId);

  const entity = await prisma.coveredEntity.findFirst({
    where: { id, tenantId },
  });

  emitAudit('info', 'COVERED_ENTITY_READ', actor, id, { tenantId, found: entity !== null });

  return entity;
}

export async function listCoveredEntities(
  tenantId: string,
  actor: AuthenticatedActor,
  filters?: CoveredEntityFilters,
): Promise<CoveredEntity[]> {
  assertCanRead(actor, 'list');
  assertTenantScope(actor, tenantId);

  const where: Record<string, unknown> = { tenantId };
  if (filters?.ceType) {
    where.ceType = filters.ceType;
  }
  if (filters?.baaExpiringBefore) {
    where.baaExpiresAt = { lt: filters.baaExpiringBefore };
  }

  const entities = await prisma.coveredEntity.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  emitAudit('info', 'COVERED_ENTITY_LISTED', actor, null, {
    tenantId,
    count: entities.length,
    filters: filters ?? {},
  });

  return entities;
}

export async function updateCoveredEntity(
  tenantId: string,
  id: string,
  input: UpdateCoveredEntityInput,
  actor: AuthenticatedActor,
): Promise<CoveredEntity> {
  assertCanManage(actor, 'update');
  assertTenantScope(actor, tenantId);

  // Tenant-scoped read first to reject cross-tenant id collisions.
  const existing = await prisma.coveredEntity.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new CoveredEntityNotFoundError(id);
  }

  if (
    input.baaExpiresAt &&
    input.baaExecutedAt &&
    input.baaExpiresAt <= input.baaExecutedAt
  ) {
    throw new CoveredEntityValidationError(
      'baaExpiresAt',
      'must be after baaExecutedAt',
    );
  }

  const updated = await prisma.coveredEntity.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.legalName !== undefined && { legalName: input.legalName }),
      ...(input.primaryContactName !== undefined && { primaryContactName: input.primaryContactName }),
      ...(input.primaryContactEmail !== undefined && { primaryContactEmail: input.primaryContactEmail }),
      ...(input.primaryContactPhone !== undefined && { primaryContactPhone: input.primaryContactPhone }),
      ...(input.primaryContactAddress !== undefined && { primaryContactAddress: input.primaryContactAddress }),
      ...(input.escalationContactName !== undefined && { escalationContactName: input.escalationContactName }),
      ...(input.escalationContactEmail !== undefined && { escalationContactEmail: input.escalationContactEmail }),
      ...(input.escalationContactPhone !== undefined && { escalationContactPhone: input.escalationContactPhone }),
      ...(input.ceType !== undefined && { ceType: input.ceType }),
      ...(input.baaExecutedAt !== undefined && { baaExecutedAt: input.baaExecutedAt }),
      ...(input.baaExpiresAt !== undefined && { baaExpiresAt: input.baaExpiresAt }),
      ...(input.baaDocumentUrl !== undefined && { baaDocumentUrl: input.baaDocumentUrl }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });

  emitAudit('info', 'COVERED_ENTITY_UPDATED', actor, id, {
    tenantId,
    fieldsChanged: Object.keys(input),
  });

  return updated;
}

export async function deleteCoveredEntity(
  tenantId: string,
  id: string,
  actor: AuthenticatedActor,
): Promise<void> {
  assertCanManage(actor, 'delete');
  assertTenantScope(actor, tenantId);

  const existing = await prisma.coveredEntity.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new CoveredEntityNotFoundError(id);
  }

  await prisma.coveredEntity.delete({ where: { id } });

  emitAudit('warn', 'COVERED_ENTITY_DELETED', actor, id, { tenantId });
}

export async function linkHospitalToCoveredEntity(
  tenantId: string,
  coveredEntityId: string,
  hospitalId: string,
  actor: AuthenticatedActor,
): Promise<void> {
  assertCanManage(actor, 'linkHospital');
  assertTenantScope(actor, tenantId);

  const ce = await prisma.coveredEntity.findFirst({
    where: { id: coveredEntityId, tenantId },
  });
  if (!ce) {
    throw new CoveredEntityNotFoundError(coveredEntityId);
  }

  // Hospital must belong to same tenant (single-tenant per AUDIT-011 discipline).
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true },
  });
  if (!hospital) {
    throw new CoveredEntityValidationError('hospitalId', `Hospital not found: ${hospitalId}`);
  }

  await prisma.hospital.update({
    where: { id: hospitalId },
    data: { coveredEntityId },
  });

  emitAudit('info', 'COVERED_ENTITY_HOSPITAL_LINKED', actor, coveredEntityId, {
    tenantId,
    hospitalId,
  });
}

export async function unlinkHospitalFromCoveredEntity(
  tenantId: string,
  coveredEntityId: string,
  hospitalId: string,
  actor: AuthenticatedActor,
): Promise<void> {
  assertCanManage(actor, 'unlinkHospital');
  assertTenantScope(actor, tenantId);

  const ce = await prisma.coveredEntity.findFirst({
    where: { id: coveredEntityId, tenantId },
  });
  if (!ce) {
    throw new CoveredEntityNotFoundError(coveredEntityId);
  }

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true, coveredEntityId: true },
  });
  if (!hospital) {
    throw new CoveredEntityValidationError('hospitalId', `Hospital not found: ${hospitalId}`);
  }
  if (hospital.coveredEntityId !== coveredEntityId) {
    throw new CoveredEntityValidationError(
      'hospitalId',
      `Hospital ${hospitalId} is not linked to CoveredEntity ${coveredEntityId}`,
    );
  }

  await prisma.hospital.update({
    where: { id: hospitalId },
    data: { coveredEntityId: null },
  });

  emitAudit('info', 'COVERED_ENTITY_HOSPITAL_UNLINKED', actor, coveredEntityId, {
    tenantId,
    hospitalId,
  });
}

// ─── 5-ADM-09 P1.3.3b BAA cache propagation (Q-5ADM-C single-source-of-truth) ──

/**
 * updateHospitalBaaCache - propagate authoritative BAA execution state to the
 * Hospital.baaExecuted derived cache.
 *
 * Per Q-5ADM-C single-source-of-truth: CoveredEntity owns the authoritative
 * BAA execution state; Hospital.baaExecuted + Hospital.baaExecutedAt are a
 * derived cache. This function is the SOLE writer of those two columns. All
 * other Hospital writes in this service touch unrelated columns (coveredEntityId
 * link / unlink only).
 *
 * Per D5 transactional discipline: caller supplies a transaction-scoped
 * client when invoked inside an outer $transaction, otherwise the singleton
 * is used. Atomic composition with the CoveredEntity write that triggered
 * the cache update is the caller's responsibility (the BAA execution upsert
 * path composes both writes inside one $transaction).
 *
 * Behavior is idempotent: a no-op write is suppressed when authoritative
 * state strictly matches the existing cache (audit-noise reduction). The
 * HOSPITAL_BAA_CACHE_UPDATED audit event is NOT emitted on idempotent skip.
 *
 * Sister-precedent divergence (PAUSE A.F1, surfaced for traceability):
 *   - Audit attribution uses inline auditLogger.info because the local
 *     emitAudit helper hardcodes resourceType='CoveredEntity' but the row
 *     modified here is on the Hospital model. Refactor of emitAudit deferred
 *     out of F1 atomic scope per V.5-RECOVERY discipline.
 *   - Not-found surfaces CoveredEntityValidationError('hospitalId', ...) per
 *     the linkHospitalToCoveredEntity / unlinkHospitalFromCoveredEntity
 *     precedent; no HospitalNotFoundError class exists in the CE error
 *     hierarchy and one is not introduced at F1 work block.
 */
export async function updateHospitalBaaCache(
  input: UpdateHospitalBaaCacheInput,
  context: BaaCacheUpdateContext,
): Promise<void> {
  const client: BaaCacheClient = context.client ?? prisma;
  const { actor } = context;

  const existing = await client.hospital.findUnique({
    where: { id: input.hospitalId },
    select: { id: true, baaExecuted: true, baaExecutedAt: true },
  });
  if (!existing) {
    throw new CoveredEntityValidationError(
      'hospitalId',
      `Hospital not found: ${input.hospitalId}`,
    );
  }

  // Idempotent skip: authoritative state strictly matches existing cache.
  // Epoch-millisecond comparison; both-null is treated as equal.
  const existingExecutedAtMs = existing.baaExecutedAt?.getTime() ?? null;
  const authoritativeExecutedAtMs = input.authoritativeBaaExecutedAt?.getTime() ?? null;
  const stateMatches =
    existing.baaExecuted === input.authoritativeBaaExecuted &&
    existingExecutedAtMs === authoritativeExecutedAtMs;
  if (stateMatches) {
    return;
  }

  await client.hospital.update({
    where: { id: input.hospitalId },
    data: {
      baaExecuted: input.authoritativeBaaExecuted,
      baaExecutedAt: input.authoritativeBaaExecutedAt,
    },
  });

  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    hospitalId: actor.hospitalId,
    action: 'HOSPITAL_BAA_CACHE_UPDATED',
    resourceType: 'Hospital',
    resourceId: input.hospitalId,
    source: 'coveredEntityService',
    previousBaaExecuted: existing.baaExecuted,
    previousBaaExecutedAt: existing.baaExecutedAt?.toISOString() ?? null,
    newBaaExecuted: input.authoritativeBaaExecuted,
    newBaaExecutedAt: input.authoritativeBaaExecutedAt?.toISOString() ?? null,
  });
}

// ─── 5-ADM-09 P1.3.3b BAA execution upsert (Q-5ADM-C transactional composer) ─

/**
 * upsertCoveredEntityBaaExecution - record / revoke / update CoveredEntity-level
 * BAA execution state and propagate authoritative cache to linked hospitals.
 *
 * Per Q-5ADM-C single-source-of-truth: CoveredEntity owns the authoritative
 * baaExecutedAt + baaExpiresAt + baaDocumentUrl state. Hospital.baaExecuted +
 * Hospital.baaExecutedAt are derived caches. This function is the sole writer
 * of CE-level BAA fields and the sole composer that dispatches
 * updateHospitalBaaCache (F1) inside an atomic prisma.$transaction.
 *
 * Per D5 transactional discipline: CE update + cache fan-out + audit emission
 * are wrapped in a single prisma.$transaction so rollback on any failure
 * preserves the invariant CE-state-and-all-linked-hospital-caches-consistent.
 * F2 introduces the first $transaction usage in this service (PAUSE A.F2.5
 * canonical-grep verified zero pre-existing usage).
 *
 * Per D6 audit-emission scope: BAA_EXECUTION_RECORDED on null-to-Date or
 * value-update transitions; BAA_EXECUTION_REVOKED on Date-to-null transitions.
 * HOSPITAL_BAA_CACHE_UPDATED is emitted by F1 dispatch (one per linked
 * hospital). Idempotent-skip path suppresses all three audit emissions.
 *
 * Per D7 error class invocation: InvalidBaaTransitionError on baaExpiresAt
 * not-after-baaExecutedAt; BAAExpiredError when recorded with expiration in
 * the past. CoveredEntityNotFoundError on missing or cross-tenant id.
 *
 * Idempotent skip: when all three input fields strictly match existing CE
 * state (null=null + Date.getTime()=Date.getTime() + url string equality;
 * undefined input treated as "no change"), no write and no audit occur.
 * Return reflects the existing CE row + the existing aggregated hospital
 * cache (first linked hospital sampled, or false/null if zero linked).
 *
 * Multi-hospital fan-out (Q-5BRC-A A1 health-system arrangement; divergence
 * surfaced at PAUSE A.F2 from brief step 6c singular existing.hospitalId):
 *   CoveredEntity may be linked to N hospitals via Hospital.coveredEntityId
 *   (Prisma "CoveredEntityHospitals" relation). F1 is dispatched once per
 *   linked hospital inside the transaction. Returned hospitalCache reflects
 *   the authoritative state derived from the updated CE row, which is
 *   uniform across all linked hospitals post-propagation. Zero-linked is
 *   permitted: CE state still updates (it is the source of truth); F1
 *   dispatch is skipped (no targets); returned hospitalCache reflects the
 *   authoritative state a future-linked hospital would carry.
 *
 * Sister-precedent divergences (P1.3.3c batch-filing carry-forward):
 *   - emitAudit helper hardcodes resourceType='CoveredEntity' (PAUSE A.F2.2
 *     verified). F2 uses emitAudit for BAA_EXECUTION_RECORDED + REVOKED
 *     (CE-scope correct). F1 inline auditLogger.info divergence was
 *     necessary only because F1 writes Hospital, not CoveredEntity.
 *   - Not-found surfaces CoveredEntityNotFoundError per updateCoveredEntity
 *     sister-precedent (line 450). Zero-linked-hospital does NOT throw
 *     (the BAA-execution semantic is CE-scope; absence of linked hospitals
 *     is a valid intermediate state during health-system onboarding).
 */
export async function upsertCoveredEntityBaaExecution(
  tenantId: string,
  coveredEntityId: string,
  input: UpsertBaaExecutionInput,
  actor: AuthenticatedActor,
): Promise<{
  coveredEntity: CoveredEntity;
  hospitalCache: { baaExecuted: boolean; baaExecutedAt: Date | null };
}> {
  assertCanManage(actor, 'upsertBaaExecution');
  assertTenantScope(actor, tenantId);

  // Tenant-scoped read first to reject cross-tenant id collisions
  // (updateCoveredEntity sister-precedent line 448 pattern).
  const existing = await prisma.coveredEntity.findFirst({
    where: { id: coveredEntityId, tenantId },
  });
  if (!existing) {
    throw new CoveredEntityNotFoundError(coveredEntityId);
  }

  // D7 state-transition validation (input-only per brief steps 3a + 3b;
  // sister-precedent updateCoveredEntity lines 453-462 also operates on
  // input fields directly).
  if (
    input.baaExecutedAt &&
    input.baaExpiresAt &&
    input.baaExpiresAt <= input.baaExecutedAt
  ) {
    throw new InvalidBaaTransitionError(
      coveredEntityId,
      `executedAt=${input.baaExecutedAt.toISOString()}`,
      `expiresAt=${input.baaExpiresAt.toISOString()}`,
    );
  }
  if (
    input.baaExecutedAt &&
    input.baaExpiresAt &&
    input.baaExpiresAt.getTime() < Date.now()
  ) {
    throw new BAAExpiredError(coveredEntityId, input.baaExpiresAt);
  }

  // D6 idempotent-skip computation: undefined input means "no change" for
  // the optional fields; baaExecutedAt is required so it always participates.
  const existingExecutedAtMs = existing.baaExecutedAt?.getTime() ?? null;
  const inputExecutedAtMs = input.baaExecutedAt?.getTime() ?? null;
  const executedChanged = existingExecutedAtMs !== inputExecutedAtMs;
  const expiresChanged =
    input.baaExpiresAt !== undefined &&
    (input.baaExpiresAt?.getTime() ?? null) !==
      (existing.baaExpiresAt?.getTime() ?? null);
  const documentChanged =
    input.baaDocumentUrl !== undefined &&
    input.baaDocumentUrl !== existing.baaDocumentUrl;
  const anyChange = executedChanged || expiresChanged || documentChanged;

  if (!anyChange) {
    // No CE write, no F1 dispatch, no audit emission. Sample first linked
    // hospital's cache for return shape; multi-hospital uniform per Q-5ADM-C.
    const sampled = await prisma.hospital.findFirst({
      where: { coveredEntityId: existing.id },
      select: { baaExecuted: true, baaExecutedAt: true },
    });
    return {
      coveredEntity: existing,
      hospitalCache: {
        baaExecuted: sampled?.baaExecuted ?? false,
        baaExecutedAt: sampled?.baaExecutedAt ?? null,
      },
    };
  }

  // D6 transition kind for audit-action routing. Value-update + expires/url-only
  // changes route to BAA_EXECUTION_RECORDED per brief step 6d (no separate
  // UPDATED audit action defined in HIPAA_GRADE_ACTIONS enum).
  const transitionKind: 'RECORDED' | 'REVOKED' =
    existingExecutedAtMs !== null && inputExecutedAtMs === null
      ? 'REVOKED'
      : 'RECORDED';

  // D5 transactional composition: CE update + F1 fan-out + audit emission
  // commit atomically. Rollback on any failure preserves
  // CE-state-and-all-linked-caches-consistent invariant.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.coveredEntity.update({
      where: { id: coveredEntityId },
      data: {
        baaExecutedAt: input.baaExecutedAt,
        ...(input.baaExpiresAt !== undefined && { baaExpiresAt: input.baaExpiresAt }),
        ...(input.baaDocumentUrl !== undefined && { baaDocumentUrl: input.baaDocumentUrl }),
      },
    });

    // Authoritative cache state derived from updated CE row (Q-5ADM-C):
    // executed iff baaExecutedAt is set AND (no expiration OR expiration in future).
    const nowMs = Date.now();
    const authoritativeBaaExecuted =
      updated.baaExecutedAt !== null &&
      (updated.baaExpiresAt === null || updated.baaExpiresAt.getTime() > nowMs);
    const authoritativeBaaExecutedAt = updated.baaExecutedAt;

    // Fan-out F1 dispatch to all linked hospitals (Q-5BRC-A A1 multi-hospital).
    const linkedHospitals = await tx.hospital.findMany({
      where: { coveredEntityId: updated.id },
      select: { id: true },
    });
    for (const hospital of linkedHospitals) {
      await updateHospitalBaaCache(
        {
          hospitalId: hospital.id,
          authoritativeBaaExecuted,
          authoritativeBaaExecutedAt,
        },
        { actor, client: tx },
      );
    }

    // D6 audit emission inside the transaction per brief step 6d. Uses
    // emitAudit helper since resourceType='CoveredEntity' is correct here
    // (PAUSE A.F2.2 compatibility verified).
    emitAudit(
      'info',
      transitionKind === 'RECORDED'
        ? 'BAA_EXECUTION_RECORDED'
        : 'BAA_EXECUTION_REVOKED',
      actor,
      coveredEntityId,
      {
        tenantId,
        previousBaaExecutedAt: existing.baaExecutedAt?.toISOString() ?? null,
        newBaaExecutedAt: updated.baaExecutedAt?.toISOString() ?? null,
        previousBaaExpiresAt: existing.baaExpiresAt?.toISOString() ?? null,
        newBaaExpiresAt: updated.baaExpiresAt?.toISOString() ?? null,
        previousBaaDocumentUrl: existing.baaDocumentUrl,
        newBaaDocumentUrl: updated.baaDocumentUrl,
        linkedHospitalCount: linkedHospitals.length,
        authoritativeBaaExecuted,
      },
    );

    return {
      updated,
      authoritativeBaaExecuted,
      authoritativeBaaExecutedAt,
    };
  });

  return {
    coveredEntity: result.updated,
    hospitalCache: {
      baaExecuted: result.authoritativeBaaExecuted,
      baaExecutedAt: result.authoritativeBaaExecutedAt,
    },
  };
}
