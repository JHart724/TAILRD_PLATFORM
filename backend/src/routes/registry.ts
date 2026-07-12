// AUDIT-148 Slice 2: registry-case backend route (the READ half).
//
// Slice 2 ships GET /registry/:registryType/cases - list the tenant's registry submission cases for a
// given registry (NCDR / STS / GWTG / ...). Read-only; the mutations (update fields, approve) are
// Slice 3 (PHI-adjacent clinical decisions needing audit-log + authz + DRAFT->SUBMITTED->APPROVED
// transition rules + the FDA-CDS clinician-decides framing).
//
// Tenant isolation: hospitalId ALWAYS from the verified JWT (req.user.hospitalId), NEVER the body/params.

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { APIResponse, UserRole } from '../types';
import { authenticateToken, authorizeRole, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const REGISTRY_ROLES: UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER'];
const ok = (data: unknown): APIResponse => ({ success: true, data, timestamp: new Date().toISOString() });
const fail = (error: string): APIResponse => ({ success: false, error, timestamp: new Date().toISOString() });

/**
 * GET /api/registry/:registryType/cases
 * List this tenant's registry submission cases for the given registry type. Tenant-scoped by the JWT
 * hospitalId (never the params) - a case in another tenant is never returned.
 */
router.get('/:registryType/cases', authenticateToken, requireMFA, authorizeRole(REGISTRY_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId; // tenant scope from the verified JWT, never the params
      const { registryType } = req.params;

      const cases = await prisma.registryCase.findMany({
        where: { hospitalId, registryType },
        orderBy: { createdAt: 'desc' },
      });

      const payload = cases.map((c: any) => ({
        id: c.id,
        patientId: c.patientId,
        registryType: c.registryType,
        status: c.status,
        fields: c.fields,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));

      logger.info('Registry cases listed', { hospitalId, registryType, count: payload.length });
      res.json(ok(payload));
    } catch (error) {
      logger.error('List registry cases failed', {
        hospitalId: req.user?.hospitalId, registryType: req.params.registryType,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to list registry cases'));
    }
  });

export default router;
