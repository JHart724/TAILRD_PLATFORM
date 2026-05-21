/**
 * Covered Entity Registry Routes (5-BRC-06 P1.3.3c)
 *
 * CRUD endpoints for managing the registry of downstream Covered Entities
 * each TAILRD tenant maintains BA relationships with. Foundation for the
 * 164.410 BA-to-CE breach notification workflow.
 *
 * Authorization (Q-5BRC-G + CLAUDE.md 14 NEVER DO rules 6-8):
 *   - All routes require authenticated JWT
 *   - Write operations (POST, PUT, DELETE): SUPER_ADMIN + HOSPITAL_ADMIN
 *   - Read operations (GET): SUPER_ADMIN + HOSPITAL_ADMIN + QUALITY_DIRECTOR
 *   - tenantId is ALWAYS re-derived from req.user.hospitalId; client-supplied
 *     tenantId in body/params is NEVER trusted (rule 8)
 *
 * Audit-trail (Q-5BRC-F dual-emission):
 *   - Service layer emits Winston-only audit entries (file + console + CloudWatch)
 *   - Route layer additionally calls writeAuditLog(req, ...) for DB persistence
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
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

const router = Router();

router.use(authenticateToken);

// ── Zod schemas ─────────────────────────────────────────────────────────────

const createCoveredEntitySchema = z.object({
  name: z.string().min(1).max(255),
  legalName: z.string().max(255).nullable().optional(),
  primaryContactName: z.string().max(255).nullable().optional(),
  primaryContactEmail: z.string().email().max(255).nullable().optional(),
  primaryContactPhone: z.string().max(64).nullable().optional(),
  primaryContactAddress: z.string().max(1024).nullable().optional(),
  escalationContactName: z.string().max(255).nullable().optional(),
  escalationContactEmail: z.string().email().max(255).nullable().optional(),
  escalationContactPhone: z.string().max(64).nullable().optional(),
  ceType: z.string().max(64).nullable().optional(),
  baaExecutedAt: z.string().datetime().nullable().optional(),
  baaExpiresAt: z.string().datetime().nullable().optional(),
  baaDocumentUrl: z.string().max(2048).nullable().optional(),
  notes: z.string().max(4096).nullable().optional(),
});

const updateCoveredEntitySchema = createCoveredEntitySchema.partial();

const listFiltersSchema = z.object({
  ceType: z.string().max(64).optional(),
  baaExpiringBefore: z.string().datetime().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractActor(req: AuthenticatedRequest): AuthenticatedActor {
  // Re-derive tenantId from authenticated session per CLAUDE.md 14 rule 8.
  // NEVER trust client-supplied tenantId from req.body or req.params.
  const user = req.user!;
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
  };
}

function mapErrorToResponse(err: unknown, res: Response): Response {
  if (err instanceof CoveredEntityNotFoundError) {
    return res.status(404).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof TenantScopeViolationError) {
    return res.status(403).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof CoveredEntityAccessDeniedError) {
    return res.status(403).json({ success: false, error: err.message, code: err.code });
  }
  if (err instanceof CoveredEntityValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: err.code,
      field: err.field,
    });
  }
  if (err instanceof CoveredEntityServiceError) {
    return res.status(400).json({ success: false, error: err.message, code: err.code });
  }
  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({ success: false, error: message });
}

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

// ── Routes ──────────────────────────────────────────────────────────────────

router.post(
  '/',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const parsed = createCoveredEntitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const actor = extractActor(req);
      const created = await createCoveredEntity(
        actor.hospitalId,
        {
          ...parsed.data,
          baaExecutedAt: parseOptionalDate(parsed.data.baaExecutedAt),
          baaExpiresAt: parseOptionalDate(parsed.data.baaExpiresAt),
        },
        actor,
      );
      await writeAuditLog(
        req,
        'BREACH_DATA_MODIFIED',
        'CoveredEntity',
        created.id,
        `Created CoveredEntity ${created.name}`,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.get(
  '/',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'QUALITY_DIRECTOR']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const parsed = listFiltersSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filter parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const actor = extractActor(req);
      const filters = parsed.data.baaExpiringBefore
        ? { ...parsed.data, baaExpiringBefore: new Date(parsed.data.baaExpiringBefore) }
        : { ceType: parsed.data.ceType };
      const entities = await listCoveredEntities(actor.hospitalId, actor, filters);
      await writeAuditLog(
        req,
        'BREACH_DATA_ACCESSED',
        'CoveredEntity',
        'all',
        `Listed ${entities.length} CoveredEntities`,
      );
      return res.json({ success: true, data: entities, meta: { count: entities.length } });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.get(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'QUALITY_DIRECTOR']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const actor = extractActor(req);
      const entity = await getCoveredEntityById(actor.hospitalId, req.params.id, actor);
      if (!entity) {
        return res.status(404).json({ success: false, error: 'CoveredEntity not found' });
      }
      await writeAuditLog(
        req,
        'BREACH_DATA_ACCESSED',
        'CoveredEntity',
        entity.id,
        `Viewed CoveredEntity ${entity.name}`,
      );
      return res.json({ success: true, data: entity });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.put(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const parsed = updateCoveredEntitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const actor = extractActor(req);
      const updated = await updateCoveredEntity(
        actor.hospitalId,
        req.params.id,
        {
          ...parsed.data,
          baaExecutedAt: parseOptionalDate(parsed.data.baaExecutedAt),
          baaExpiresAt: parseOptionalDate(parsed.data.baaExpiresAt),
        },
        actor,
      );
      await writeAuditLog(
        req,
        'BREACH_DATA_MODIFIED',
        'CoveredEntity',
        updated.id,
        `Updated CoveredEntity ${updated.name}`,
      );
      return res.json({ success: true, data: updated });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.delete(
  '/:id',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const actor = extractActor(req);
      await deleteCoveredEntity(actor.hospitalId, req.params.id, actor);
      await writeAuditLog(
        req,
        'BREACH_DATA_MODIFIED',
        'CoveredEntity',
        req.params.id,
        `Deleted CoveredEntity ${req.params.id}`,
      );
      return res.json({ success: true, message: 'CoveredEntity deleted' });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.post(
  '/:id/hospitals/:hospitalId',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const actor = extractActor(req);
      await linkHospitalToCoveredEntity(
        actor.hospitalId,
        req.params.id,
        req.params.hospitalId,
        actor,
      );
      await writeAuditLog(
        req,
        'BREACH_DATA_MODIFIED',
        'CoveredEntity',
        req.params.id,
        `Linked Hospital ${req.params.hospitalId} to CoveredEntity ${req.params.id}`,
      );
      return res.json({ success: true, message: 'Hospital linked to CoveredEntity' });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

router.delete(
  '/:id/hospitals/:hospitalId',
  authorizeRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
      const actor = extractActor(req);
      await unlinkHospitalFromCoveredEntity(
        actor.hospitalId,
        req.params.id,
        req.params.hospitalId,
        actor,
      );
      await writeAuditLog(
        req,
        'BREACH_DATA_MODIFIED',
        'CoveredEntity',
        req.params.id,
        `Unlinked Hospital ${req.params.hospitalId} from CoveredEntity ${req.params.id}`,
      );
      return res.json({ success: true, message: 'Hospital unlinked from CoveredEntity' });
    } catch (err) {
      return mapErrorToResponse(err, res);
    }
  },
);

export default router;
