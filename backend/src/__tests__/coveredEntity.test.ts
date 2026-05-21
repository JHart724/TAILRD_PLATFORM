/**
 * coveredEntity (5-BRC-06 P1.3.3c D9) - service + routes unit + integration tests.
 *
 * Covers:
 *   - All 7 coveredEntityService functions (create, getById, list, update,
 *     delete, linkHospital, unlinkHospital).
 *   - All 7 coveredEntity route handlers (POST /, GET /, GET /:id, PUT /:id,
 *     DELETE /:id, POST /:id/hospitals/:hospitalId,
 *     DELETE /:id/hospitals/:hospitalId).
 *   - RBAC enforcement (MANAGE_ROLES vs READ_ROLES vs denied roles).
 *   - Tenant-isolation per Q-5BRC-G + CLAUDE.md NEVER DO rule 8 (actor
 *     hospitalId vs resource tenantId mismatch throws
 *     TenantScopeViolationError; SUPER_ADMIN bypass).
 *   - Structured error class throws + route layer 400/403/404 mapping.
 *   - Input validation edge cases (empty name, oversize name,
 *     baaExpiresAt <= baaExecutedAt).
 *   - Dual-emission audit per Q-5BRC-F (service-layer auditLogger.info +
 *     route-layer writeAuditLog).
 *
 * Pattern: jest.mock for prisma + auditLogger + logger; getHandler helper to
 * extract route handlers directly from the Express Router stack (avoids
 * supertest). Mirrors src/routes/__tests__/cdsHooks.test.ts canonical pattern.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────

const coveredEntityCreate = jest.fn();
const coveredEntityFindFirst = jest.fn();
const coveredEntityFindMany = jest.fn();
const coveredEntityUpdate = jest.fn();
const coveredEntityDelete = jest.fn();
const hospitalFindUnique = jest.fn();
const hospitalUpdate = jest.fn();
const writeAuditLog = jest.fn().mockResolvedValue(undefined);
const auditLoggerInfo = jest.fn();
const auditLoggerWarn = jest.fn();
const auditLoggerError = jest.fn();

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    coveredEntity: {
      create: (...args: unknown[]) => coveredEntityCreate(...args),
      findFirst: (...args: unknown[]) => coveredEntityFindFirst(...args),
      findMany: (...args: unknown[]) => coveredEntityFindMany(...args),
      update: (...args: unknown[]) => coveredEntityUpdate(...args),
      delete: (...args: unknown[]) => coveredEntityDelete(...args),
    },
    hospital: {
      findUnique: (...args: unknown[]) => hospitalFindUnique(...args),
      update: (...args: unknown[]) => hospitalUpdate(...args),
    },
  },
}));

jest.mock('../middleware/auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: {
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
    error: (...args: unknown[]) => auditLoggerError(...args),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Bypass authenticateToken + authorizeRole so handlers are exercised directly.
jest.mock('../middleware/auth', () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorizeRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import type { Request, Response } from 'express';
import {
  createCoveredEntity,
  getCoveredEntityById,
  listCoveredEntities,
  updateCoveredEntity,
  deleteCoveredEntity,
  linkHospitalToCoveredEntity,
  unlinkHospitalFromCoveredEntity,
  CoveredEntityServiceError,
  CoveredEntityNotFoundError,
  TenantScopeViolationError,
  CoveredEntityAccessDeniedError,
  CoveredEntityValidationError,
  type AuthenticatedActor,
} from '../services/coveredEntityService';

// ─── Helpers ─────────────────────────────────────────────────────────────

const TENANT_A = 'hospital-tenant-a';
const TENANT_B = 'hospital-tenant-b';
const CE_ID = 'ce-id-1';
const USER_ID = 'user-id-1';

function actor(role: AuthenticatedActor['role'], hospitalId = TENANT_A): AuthenticatedActor {
  return { userId: USER_ID, email: 'a@b.com', role, hospitalId };
}

function fakeCe(overrides: Record<string, unknown> = {}) {
  return {
    id: CE_ID,
    tenantId: TENANT_A,
    name: 'Acme Health',
    legalName: null,
    primaryContactName: null,
    primaryContactEmail: null,
    primaryContactPhone: null,
    primaryContactAddress: null,
    escalationContactName: null,
    escalationContactEmail: null,
    escalationContactPhone: null,
    ceType: null,
    baaExecutedAt: null,
    baaExpiresAt: null,
    baaDocumentUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

interface AuthReq extends Request {
  user?: { userId: string; email: string; role: string; hospitalId: string };
}

function makeReq(opts: { body?: unknown; params?: Record<string, string>; query?: Record<string, string>; user?: AuthReq['user'] } = {}): AuthReq {
  return {
    method: 'POST',
    headers: {},
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: opts.query ?? {},
    user: opts.user ?? { userId: USER_ID, email: 'a@b.com', role: 'HOSPITAL_ADMIN', hospitalId: TENANT_A },
  } as unknown as AuthReq;
}

function makeRes(): Response {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn().mockImplementation(function (this: Response, code: number) {
      (this as unknown as { statusCode: number }).statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (this: Response, body: unknown) {
      (this as unknown as { body: unknown }).body = body;
      return this;
    }),
  };
  return res as unknown as Response;
}

function getHandler(method: 'post' | 'get' | 'put' | 'delete' | 'patch', path: string) {
  const router = require('../routes/coveredEntity').default;
  for (const layer of router.stack) {
    const route = layer.route;
    if (!route) continue;
    if (route.path === path && route.methods[method]) {
      return route.stack[route.stack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
    }
  }
  throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Service: createCoveredEntity ────────────────────────────────────────

describe('coveredEntityService.createCoveredEntity', () => {
  it('creates a CoveredEntity when actor is HOSPITAL_ADMIN of the tenant', async () => {
    coveredEntityCreate.mockResolvedValue(fakeCe());
    const result = await createCoveredEntity(TENANT_A, { name: 'Acme Health' }, actor('HOSPITAL_ADMIN'));
    expect(result.id).toBe(CE_ID);
    expect(coveredEntityCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: TENANT_A, name: 'Acme Health' }),
    }));
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'COVERED_ENTITY_CREATED',
      resourceType: 'CoveredEntity',
      resourceId: CE_ID,
    }));
  });

  it('SUPER_ADMIN bypasses tenant scope', async () => {
    coveredEntityCreate.mockResolvedValue(fakeCe({ tenantId: TENANT_B }));
    const result = await createCoveredEntity(TENANT_B, { name: 'Acme Health' }, actor('SUPER_ADMIN'));
    expect(result.tenantId).toBe(TENANT_B);
  });

  it('throws TenantScopeViolationError when HOSPITAL_ADMIN attempts cross-tenant create', async () => {
    await expect(
      createCoveredEntity(TENANT_B, { name: 'Acme Health' }, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });

  it('throws CoveredEntityAccessDeniedError when actor role is not in MANAGE_ROLES', async () => {
    await expect(
      createCoveredEntity(TENANT_A, { name: 'Acme Health' }, actor('QUALITY_DIRECTOR' as AuthenticatedActor['role'])),
    ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
  });

  it('throws CoveredEntityValidationError when name is empty', async () => {
    await expect(
      createCoveredEntity(TENANT_A, { name: '   ' }, actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });

  it('throws CoveredEntityValidationError when name exceeds 255 chars', async () => {
    await expect(
      createCoveredEntity(TENANT_A, { name: 'x'.repeat(256) }, actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });

  it('throws CoveredEntityValidationError when baaExpiresAt <= baaExecutedAt', async () => {
    const executedAt = new Date('2026-01-01');
    const expiresAt = new Date('2025-12-31');
    await expect(
      createCoveredEntity(
        TENANT_A,
        { name: 'Acme', baaExecutedAt: executedAt, baaExpiresAt: expiresAt },
        actor('HOSPITAL_ADMIN'),
      ),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });
});

// ─── Service: getCoveredEntityById ───────────────────────────────────────

describe('coveredEntityService.getCoveredEntityById', () => {
  it('reads scoped to tenantId', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    const result = await getCoveredEntityById(TENANT_A, CE_ID, actor('HOSPITAL_ADMIN'));
    expect(result?.id).toBe(CE_ID);
    expect(coveredEntityFindFirst).toHaveBeenCalledWith({ where: { id: CE_ID, tenantId: TENANT_A } });
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'COVERED_ENTITY_READ',
    }));
  });

  it('returns null when not found and emits found:false audit', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    const result = await getCoveredEntityById(TENANT_A, CE_ID, actor('HOSPITAL_ADMIN'));
    expect(result).toBeNull();
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'COVERED_ENTITY_READ',
      found: false,
    }));
  });

  it('QUALITY_DIRECTOR is allowed read access', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    await expect(
      getCoveredEntityById(TENANT_A, CE_ID, actor('QUALITY_DIRECTOR' as AuthenticatedActor['role'])),
    ).resolves.not.toBeNull();
  });

  it('throws TenantScopeViolationError on cross-tenant read', async () => {
    await expect(
      getCoveredEntityById(TENANT_B, CE_ID, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });

  it('throws CoveredEntityAccessDeniedError for unauthorized role', async () => {
    await expect(
      getCoveredEntityById(TENANT_A, CE_ID, actor('PHYSICIAN' as AuthenticatedActor['role'])),
    ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
  });
});

// ─── Service: listCoveredEntities ────────────────────────────────────────

describe('coveredEntityService.listCoveredEntities', () => {
  it('lists scoped to tenantId with default order', async () => {
    coveredEntityFindMany.mockResolvedValue([fakeCe()]);
    const result = await listCoveredEntities(TENANT_A, actor('HOSPITAL_ADMIN'));
    expect(result).toHaveLength(1);
    expect(coveredEntityFindMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_A },
      orderBy: { name: 'asc' },
    });
  });

  it('applies ceType filter', async () => {
    coveredEntityFindMany.mockResolvedValue([]);
    await listCoveredEntities(TENANT_A, actor('HOSPITAL_ADMIN'), { ceType: 'HEALTH_PLAN' });
    expect(coveredEntityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: TENANT_A, ceType: 'HEALTH_PLAN' },
    }));
  });

  it('applies baaExpiringBefore filter as lt clause', async () => {
    coveredEntityFindMany.mockResolvedValue([]);
    const cutoff = new Date('2026-12-31');
    await listCoveredEntities(TENANT_A, actor('HOSPITAL_ADMIN'), { baaExpiringBefore: cutoff });
    expect(coveredEntityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: TENANT_A, baaExpiresAt: { lt: cutoff } },
    }));
  });

  it('throws TenantScopeViolationError on cross-tenant list', async () => {
    await expect(
      listCoveredEntities(TENANT_B, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });
});

// ─── Service: updateCoveredEntity ────────────────────────────────────────

describe('coveredEntityService.updateCoveredEntity', () => {
  it('updates within tenant scope', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityUpdate.mockResolvedValue(fakeCe({ name: 'Acme Renamed' }));
    const result = await updateCoveredEntity(TENANT_A, CE_ID, { name: 'Acme Renamed' }, actor('HOSPITAL_ADMIN'));
    expect(result.name).toBe('Acme Renamed');
    expect(coveredEntityUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: CE_ID },
      data: expect.objectContaining({ name: 'Acme Renamed' }),
    }));
  });

  it('throws CoveredEntityNotFoundError when CE missing in tenant', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    await expect(
      updateCoveredEntity(TENANT_A, CE_ID, { name: 'X' }, actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityNotFoundError);
  });

  it('throws CoveredEntityValidationError on baaExpiresAt <= baaExecutedAt during update', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    await expect(
      updateCoveredEntity(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: new Date('2026-01-01'), baaExpiresAt: new Date('2025-12-31') },
        actor('HOSPITAL_ADMIN'),
      ),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });

  it('throws TenantScopeViolationError on cross-tenant update', async () => {
    await expect(
      updateCoveredEntity(TENANT_B, CE_ID, { name: 'X' }, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });

  it('throws CoveredEntityAccessDeniedError when actor role is read-only', async () => {
    await expect(
      updateCoveredEntity(TENANT_A, CE_ID, { name: 'X' }, actor('QUALITY_DIRECTOR' as AuthenticatedActor['role'])),
    ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
  });

  it('only writes provided fields (skips undefined)', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityUpdate.mockResolvedValue(fakeCe());
    await updateCoveredEntity(TENANT_A, CE_ID, { primaryContactEmail: 'x@y.com' }, actor('HOSPITAL_ADMIN'));
    const dataArg = coveredEntityUpdate.mock.calls[0][0].data;
    expect(dataArg).toEqual({ primaryContactEmail: 'x@y.com' });
    expect(dataArg.name).toBeUndefined();
  });
});

// ─── Service: deleteCoveredEntity ────────────────────────────────────────

describe('coveredEntityService.deleteCoveredEntity', () => {
  it('deletes within tenant scope and emits warn-level audit', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityDelete.mockResolvedValue(fakeCe());
    await deleteCoveredEntity(TENANT_A, CE_ID, actor('HOSPITAL_ADMIN'));
    expect(coveredEntityDelete).toHaveBeenCalledWith({ where: { id: CE_ID } });
    expect(auditLoggerWarn).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'COVERED_ENTITY_DELETED',
    }));
  });

  it('throws CoveredEntityNotFoundError when CE missing in tenant', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    await expect(
      deleteCoveredEntity(TENANT_A, CE_ID, actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityNotFoundError);
  });

  it('throws TenantScopeViolationError on cross-tenant delete', async () => {
    await expect(
      deleteCoveredEntity(TENANT_B, CE_ID, actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });
});

// ─── Service: linkHospitalToCoveredEntity ────────────────────────────────

describe('coveredEntityService.linkHospitalToCoveredEntity', () => {
  it('links hospital when CE + hospital exist in tenant', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue({ id: 'h-2' });
    hospitalUpdate.mockResolvedValue({ id: 'h-2', coveredEntityId: CE_ID });
    await linkHospitalToCoveredEntity(TENANT_A, CE_ID, 'h-2', actor('HOSPITAL_ADMIN'));
    expect(hospitalUpdate).toHaveBeenCalledWith({ where: { id: 'h-2' }, data: { coveredEntityId: CE_ID } });
    expect(auditLoggerInfo).toHaveBeenCalledWith('audit_event', expect.objectContaining({
      action: 'COVERED_ENTITY_HOSPITAL_LINKED',
    }));
  });

  it('throws CoveredEntityNotFoundError when CE missing in tenant', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    await expect(
      linkHospitalToCoveredEntity(TENANT_A, CE_ID, 'h-2', actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityNotFoundError);
  });

  it('throws CoveredEntityValidationError when hospital not found', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue(null);
    await expect(
      linkHospitalToCoveredEntity(TENANT_A, CE_ID, 'h-missing', actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });

  it('throws TenantScopeViolationError on cross-tenant link', async () => {
    await expect(
      linkHospitalToCoveredEntity(TENANT_B, CE_ID, 'h-2', actor('HOSPITAL_ADMIN', TENANT_A)),
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });
});

// ─── Service: unlinkHospitalFromCoveredEntity ────────────────────────────

describe('coveredEntityService.unlinkHospitalFromCoveredEntity', () => {
  it('unlinks hospital when linked to this CE', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue({ id: 'h-2', coveredEntityId: CE_ID });
    hospitalUpdate.mockResolvedValue({ id: 'h-2', coveredEntityId: null });
    await unlinkHospitalFromCoveredEntity(TENANT_A, CE_ID, 'h-2', actor('HOSPITAL_ADMIN'));
    expect(hospitalUpdate).toHaveBeenCalledWith({ where: { id: 'h-2' }, data: { coveredEntityId: null } });
  });

  it('throws CoveredEntityValidationError when hospital is linked to a different CE', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue({ id: 'h-2', coveredEntityId: 'ce-other' });
    await expect(
      unlinkHospitalFromCoveredEntity(TENANT_A, CE_ID, 'h-2', actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });

  it('throws CoveredEntityValidationError when hospital not found', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue(null);
    await expect(
      unlinkHospitalFromCoveredEntity(TENANT_A, CE_ID, 'h-missing', actor('HOSPITAL_ADMIN')),
    ).rejects.toBeInstanceOf(CoveredEntityValidationError);
  });
});

// ─── Structured error invariants ─────────────────────────────────────────

describe('CoveredEntity structured errors', () => {
  it('CoveredEntityServiceError is the common base', () => {
    expect(new CoveredEntityNotFoundError('x')).toBeInstanceOf(CoveredEntityServiceError);
    expect(new TenantScopeViolationError('a', 'b')).toBeInstanceOf(CoveredEntityServiceError);
    expect(new CoveredEntityAccessDeniedError('PHYSICIAN' as AuthenticatedActor['role'], 'op')).toBeInstanceOf(CoveredEntityServiceError);
    expect(new CoveredEntityValidationError('field', 'bad')).toBeInstanceOf(CoveredEntityServiceError);
  });

  it('TenantScopeViolationError carries attempted + resource tenant IDs', () => {
    const e = new TenantScopeViolationError('a', 'b');
    expect(e.attemptedTenantId).toBe('a');
    expect(e.resourceTenantId).toBe('b');
    expect(e.code).toBe('TENANT_SCOPE_VIOLATION');
  });
});

// ─── Routes: POST / ──────────────────────────────────────────────────────

describe('POST /coveredEntity', () => {
  it('returns 201 with created entity + re-derives tenantId from req.user.hospitalId', async () => {
    coveredEntityCreate.mockResolvedValue(fakeCe());
    const handler = getHandler('post', '/');
    const req = makeReq({ body: { name: 'Acme Health' } });
    const res = makeRes();
    await handler(req, res);
    expect(coveredEntityCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: TENANT_A }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_MODIFIED', 'CoveredEntity', CE_ID, expect.stringContaining('Created'));
  });

  it('returns 400 on Zod validation failure (missing name)', async () => {
    const handler = getHandler('post', '/');
    const req = makeReq({ body: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 on invalid email format', async () => {
    const handler = getHandler('post', '/');
    const req = makeReq({ body: { name: 'A', primaryContactEmail: 'not-an-email' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when service throws TenantScopeViolationError (defense-in-depth past req.user re-derivation)', async () => {
    coveredEntityCreate.mockImplementation(() => {
      throw new TenantScopeViolationError(TENANT_A, TENANT_B);
    });
    const handler = getHandler('post', '/');
    const req = makeReq({ body: { name: 'Acme Health' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'TENANT_SCOPE_VIOLATION',
    }));
  });
});

// ─── Routes: GET / ───────────────────────────────────────────────────────

describe('GET /coveredEntity', () => {
  it('returns 200 with list + count meta', async () => {
    coveredEntityFindMany.mockResolvedValue([fakeCe(), fakeCe({ id: 'ce-2', name: 'Brava' })]);
    const handler = getHandler('get', '/');
    const req = makeReq();
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      meta: { count: 2 },
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(req, 'BREACH_DATA_ACCESSED', 'CoveredEntity', 'all', expect.stringContaining('Listed 2'));
  });

  it('returns 400 on invalid datetime in baaExpiringBefore query', async () => {
    const handler = getHandler('get', '/');
    const req = makeReq({ query: { baaExpiringBefore: 'not-a-date' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── Routes: GET /:id ────────────────────────────────────────────────────

describe('GET /coveredEntity/:id', () => {
  it('returns 200 with entity when found', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    const handler = getHandler('get', '/:id');
    const req = makeReq({ params: { id: CE_ID } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 404 when entity not found', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    const handler = getHandler('get', '/:id');
    const req = makeReq({ params: { id: 'missing' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── Routes: PUT /:id ────────────────────────────────────────────────────

describe('PUT /coveredEntity/:id', () => {
  it('returns 200 with updated entity', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityUpdate.mockResolvedValue(fakeCe({ name: 'Renamed' }));
    const handler = getHandler('put', '/:id');
    const req = makeReq({ params: { id: CE_ID }, body: { name: 'Renamed' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 404 when service throws CoveredEntityNotFoundError', async () => {
    coveredEntityFindFirst.mockResolvedValue(null);
    const handler = getHandler('put', '/:id');
    const req = makeReq({ params: { id: 'missing' }, body: { name: 'X' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when service throws CoveredEntityValidationError with field', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityUpdate.mockImplementation(() => {
      throw new CoveredEntityValidationError('name', 'too long');
    });
    const handler = getHandler('put', '/:id');
    const req = makeReq({ params: { id: CE_ID }, body: { name: 'X' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'COVERED_ENTITY_VALIDATION_FAILED',
      field: 'name',
    }));
  });
});

// ─── Routes: DELETE /:id ─────────────────────────────────────────────────

describe('DELETE /coveredEntity/:id', () => {
  it('returns 200 with success message', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    coveredEntityDelete.mockResolvedValue(fakeCe());
    const handler = getHandler('delete', '/:id');
    const req = makeReq({ params: { id: CE_ID } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'CoveredEntity deleted',
    }));
  });
});

// ─── Routes: POST /:id/hospitals/:hospitalId (link) ──────────────────────

describe('POST /coveredEntity/:id/hospitals/:hospitalId', () => {
  it('returns 200 with link success', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue({ id: 'h-2' });
    hospitalUpdate.mockResolvedValue({ id: 'h-2', coveredEntityId: CE_ID });
    const handler = getHandler('post', '/:id/hospitals/:hospitalId');
    const req = makeReq({ params: { id: CE_ID, hospitalId: 'h-2' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── Routes: DELETE /:id/hospitals/:hospitalId (unlink) ──────────────────

describe('DELETE /coveredEntity/:id/hospitals/:hospitalId', () => {
  it('returns 200 with unlink success', async () => {
    coveredEntityFindFirst.mockResolvedValue(fakeCe());
    hospitalFindUnique.mockResolvedValue({ id: 'h-2', coveredEntityId: CE_ID });
    hospitalUpdate.mockResolvedValue({ id: 'h-2', coveredEntityId: null });
    const handler = getHandler('delete', '/:id/hospitals/:hospitalId');
    const req = makeReq({ params: { id: CE_ID, hospitalId: 'h-2' } });
    const res = makeRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
