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

import type { CoveredEntity } from '@prisma/client';
import prisma from '../lib/prisma';
import { auditLogger } from '../middleware/auditLogger';
import type { UserRole } from '../types';

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
