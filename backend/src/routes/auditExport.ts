/**
 * Audit Log Query & Export API
 *
 * Provides authenticated access to audit logs for compliance review:
 *   - Query by date range, user, action, resource
 *   - Per-tenant audit trail export
 *   - Immutable log access (read-only, no delete)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRole, authorizeHospital, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const auditQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  action: z.enum(['view', 'create', 'update', 'delete', 'export', 'print', 'login', 'logout']).optional(),
  resourceType: z.string().optional(),
  patientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
}).strict();

// ── Routes ──────────────────────────────────────────────────────────────────

// GET / — Query audit logs (hospital-admin sees own hospital, super-admin sees all)
router.get('/',
  authorizeRole(['hospital-admin', 'super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = auditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { startDate, endDate, userId, action, resourceType, patientId, page, limit } = parsed.data;
      const where: any = {};

      // Hospital scoping — hospital-admin can only see their own
      if (req.user?.role !== 'super-admin') {
        where.hospitalId = req.user?.hospitalId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (patientId) where.patientId = patientId;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return res.json({
        success: true,
        data: logs,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /export — Export audit logs as JSON (with all fields, for compliance)
router.get('/export',
  authorizeRole(['hospital-admin', 'super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = auditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { startDate, endDate, userId, action, resourceType, patientId } = parsed.data;
      const where: any = {};

      if (req.user?.role !== 'super-admin') {
        where.hospitalId = req.user?.hospitalId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (patientId) where.patientId = patientId;

      // Log the export itself
      await prisma.auditLog.create({
        data: {
          hospitalId: req.user?.hospitalId || 'platform',
          userId: req.user?.userId || 'unknown',
          userEmail: req.user?.email || 'unknown',
          userRole: req.user?.role || 'unknown',
          ipAddress: req.ip || 'unknown',
          action: 'export',
          resourceType: 'AuditLog',
          description: `Audit log export: ${JSON.stringify({ startDate, endDate, userId, action, resourceType })}`,
          timestamp: new Date(),
        },
      });

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10000, // Cap at 10K records per export
      });

      // Set download headers
      const filename = `audit-export-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.json({
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.email,
        recordCount: logs.length,
        filters: { startDate, endDate, userId, action, resourceType, patientId },
        records: logs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /summary — Aggregate audit stats for dashboard
router.get('/summary',
  authorizeRole(['hospital-admin', 'super-admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const where: any = {};
      if (req.user?.role !== 'super-admin') {
        where.hospitalId = req.user?.hospitalId;
      }

      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.timestamp = { gte: thirtyDaysAgo };

      const [total, byAction, byResource, recentPHIAccess] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { id: true },
        }),
        prisma.auditLog.groupBy({
          by: ['resourceType'],
          where,
          _count: { id: true },
        }),
        prisma.auditLog.count({
          where: {
            ...where,
            resourceType: 'Patient',
            action: { in: ['view', 'export'] },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          period: '30 days',
          totalEvents: total,
          byAction: byAction.map(a => ({ action: a.action, count: a._count.id })),
          byResource: byResource.map(r => ({ resource: r.resourceType, count: r._count.id })),
          phiAccessCount: recentPHIAccess,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
export default router;
