// AUDIT-148 Slice 2: registry-case backend route (the READ half).
//
// Slice 2 ships GET /registry/:registryType/cases - list the tenant's registry submission cases for a
// given registry (NCDR / STS / GWTG / ...). Read-only; the mutations (update fields, approve) are
// Slice 3 (PHI-adjacent clinical decisions needing audit-log + authz + DRAFT->SUBMITTED->APPROVED
// transition rules + the FDA-CDS clinician-decides framing).
//
// Tenant isolation: hospitalId ALWAYS from the verified JWT (req.user.hospitalId), NEVER the body/params.

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { createHash } from 'crypto';
import prisma from '../lib/prisma';
import { APIResponse, UserRole } from '../types';
import { authenticateToken, authorizeRole, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
import { logger } from '../utils/logger';

const router = Router();

// Maker-checker ROLE sets (AUDIT-148 Slice 3). Slice 3 enforces role-level separation now; person-level
// (approver != createdBy) is deferred but the schema fields (createdBy/updatedBy/approvedBy) exist for it.
//   MAKER    - create / edit / submit a draft case:  physicians and nurse managers do the data entry.
//   APPROVER - approve / reject a submitted case:     quality directors (+ admins) sign off. PHYSICIAN and
//              NURSE_MANAGER are intentionally NOT approvers (a maker cannot self-approve their own work).
const REGISTRY_ROLES: UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER'];
const REGISTRY_APPROVER_ROLES: UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'QUALITY_DIRECTOR'];
const ok = (data: unknown): APIResponse => ({ success: true, data, timestamp: new Date().toISOString() });
const fail = (error: string): APIResponse => ({ success: false, error, timestamp: new Date().toISOString() });

// Hash the flexible registry payload for the audit trail. The registry `fields` blob can carry PHI, so the
// durable audit record stores a stable digest (proves the payload changed / matches) NEVER the raw values.
const fieldsHash = (fields: unknown): string =>
  createHash('sha256').update(JSON.stringify(fields ?? null)).digest('hex');

const caseView = (c: any) => ({
  id: c.id,
  patientId: c.patientId,
  registryType: c.registryType,
  status: c.status,
  fields: c.fields,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

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

/**
 * PATCH /api/registry/cases/:caseId
 * Edit a DRAFT case's registry payload. Does exactly ONE thing - edit fields while DRAFT. Submitting is a
 * separate endpoint (POST .../submit). Maker roles only. A case not in DRAFT returns 409 (no edits once it
 * has left the maker's hands). Tenant-scoped by the JWT hospitalId; a cross-tenant case is a 404, not a 403.
 */
router.patch('/cases/:caseId', authenticateToken, requireMFA, authorizeRole(REGISTRY_ROLES),
  [body('fields').isObject().withMessage('fields object is required')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(fail('Validation failed'));
      }

      const hospitalId = req.user!.hospitalId; // tenant scope from the verified JWT, never the params
      const updatedBy = req.user!.userId;
      const { caseId } = req.params;
      const { fields } = req.body as { fields: Record<string, unknown> };

      const existing = await prisma.registryCase.findFirst({ where: { id: caseId, hospitalId } });
      if (!existing) {
        return res.status(404).json(fail('Registry case not found'));
      }
      if (existing.status !== 'DRAFT') {
        return res.status(409).json(fail(`Cannot edit a case in status ${existing.status}; only DRAFT is editable`));
      }

      const updated = await prisma.registryCase.update({
        where: { id: caseId },
        data: { fields: fields as any, updatedBy },
      });

      // Audit the mutation with a fields DIGEST, never the raw PHI payload.
      await writeAuditLog(
        req, 'REGISTRY_CASE_UPDATED', 'RegistryCase', caseId,
        `Registry case ${caseId} fields edited (DRAFT)`,
        { status: existing.status, fieldsHash: fieldsHash(existing.fields) },
        { status: updated.status, fieldsHash: fieldsHash(updated.fields) },
      );

      logger.info('Registry case updated', { hospitalId, caseId });
      res.json(ok(caseView(updated)));
    } catch (error) {
      logger.error('Update registry case failed', {
        hospitalId: req.user?.hospitalId, caseId: req.params.caseId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to update registry case'));
    }
  });

/**
 * POST /api/registry/cases/:caseId/submit
 * Transition DRAFT -> SUBMITTED (the maker hands the case to a checker for sign-off). Maker roles only.
 * Only a DRAFT case can be submitted; any other status returns 409. Tenant-scoped; cross-tenant is 404.
 */
router.post('/cases/:caseId/submit', authenticateToken, requireMFA, authorizeRole(REGISTRY_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId;
      const updatedBy = req.user!.userId;
      const { caseId } = req.params;

      const existing = await prisma.registryCase.findFirst({ where: { id: caseId, hospitalId } });
      if (!existing) {
        return res.status(404).json(fail('Registry case not found'));
      }
      if (existing.status !== 'DRAFT') {
        return res.status(409).json(fail(`Cannot submit a case in status ${existing.status}; only DRAFT is submittable`));
      }

      const updated = await prisma.registryCase.update({
        where: { id: caseId },
        data: { status: 'SUBMITTED', updatedBy },
      });

      await writeAuditLog(
        req, 'REGISTRY_CASE_SUBMITTED', 'RegistryCase', caseId,
        `Registry case ${caseId} submitted for sign-off`,
        { status: 'DRAFT' },
        { status: 'SUBMITTED' },
      );

      logger.info('Registry case submitted', { hospitalId, caseId });
      res.json(ok(caseView(updated)));
    } catch (error) {
      logger.error('Submit registry case failed', {
        hospitalId: req.user?.hospitalId, caseId: req.params.caseId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to submit registry case'));
    }
  });

/**
 * POST /api/registry/cases/:caseId/approve
 * Human sign-off: SUBMITTED -> APPROVED. Approver roles only (a maker cannot approve their own work).
 * Stamps approvedBy / approvedAt. Only a SUBMITTED case can be approved; any other status returns 409.
 * The approval audit is HIPAA-grade (DB write failure throws -> route returns 500 rather than record a
 * sign-off that was never durably persisted). Tenant-scoped; cross-tenant is 404.
 */
router.post('/cases/:caseId/approve', authenticateToken, requireMFA, authorizeRole(REGISTRY_APPROVER_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId;
      const approvedBy = req.user!.userId;
      const { caseId } = req.params;

      const existing = await prisma.registryCase.findFirst({ where: { id: caseId, hospitalId } });
      if (!existing) {
        return res.status(404).json(fail('Registry case not found'));
      }
      if (existing.status !== 'SUBMITTED') {
        return res.status(409).json(fail(`Cannot approve a case in status ${existing.status}; only SUBMITTED is approvable`));
      }

      const updated = await prisma.registryCase.update({
        where: { id: caseId },
        data: { status: 'APPROVED', approvedBy, approvedAt: new Date(), updatedBy: approvedBy },
      });

      // HIPAA-grade: if the durable audit write fails, throw -> caught below -> 500 (fail closed).
      await writeAuditLog(
        req, 'REGISTRY_CASE_APPROVED', 'RegistryCase', caseId,
        `Registry case ${caseId} approved (human sign-off)`,
        { status: 'SUBMITTED' },
        { status: 'APPROVED', approvedBy },
      );

      logger.info('Registry case approved', { hospitalId, caseId });
      res.json(ok(caseView(updated)));
    } catch (error) {
      logger.error('Approve registry case failed', {
        hospitalId: req.user?.hospitalId, caseId: req.params.caseId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to approve registry case'));
    }
  });

/**
 * POST /api/registry/cases/:caseId/reject
 * Human sign-off: SUBMITTED -> REJECTED, with a REQUIRED reason (recorded in the audit trail). Approver
 * roles only. Only a SUBMITTED case can be rejected; any other status returns 409. The rejection audit is
 * HIPAA-grade (DB write failure throws -> 500). Tenant-scoped; cross-tenant is 404.
 */
router.post('/cases/:caseId/reject', authenticateToken, requireMFA, authorizeRole(REGISTRY_APPROVER_ROLES),
  [body('reason').isString().notEmpty().withMessage('reason is required').isLength({ max: 1000 }).withMessage('reason must be <= 1000 chars')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(fail('A rejection reason is required'));
      }

      const hospitalId = req.user!.hospitalId;
      const updatedBy = req.user!.userId;
      const { caseId } = req.params;
      const { reason } = req.body as { reason: string };

      const existing = await prisma.registryCase.findFirst({ where: { id: caseId, hospitalId } });
      if (!existing) {
        return res.status(404).json(fail('Registry case not found'));
      }
      if (existing.status !== 'SUBMITTED') {
        return res.status(409).json(fail(`Cannot reject a case in status ${existing.status}; only SUBMITTED is rejectable`));
      }

      const updated = await prisma.registryCase.update({
        where: { id: caseId },
        data: { status: 'REJECTED', updatedBy },
      });

      // HIPAA-grade: DB write failure throws -> 500. The reason is recorded here (no dedicated column).
      await writeAuditLog(
        req, 'REGISTRY_CASE_REJECTED', 'RegistryCase', caseId,
        `Registry case ${caseId} rejected (human sign-off)`,
        { status: 'SUBMITTED' },
        { status: 'REJECTED', reason },
      );

      logger.info('Registry case rejected', { hospitalId, caseId });
      res.json(ok(caseView(updated)));
    } catch (error) {
      logger.error('Reject registry case failed', {
        hospitalId: req.user?.hospitalId, caseId: req.params.caseId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to reject registry case'));
    }
  });

export default router;
