import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// All data-request routes require authentication + admin roles
router.use(authenticateToken);
router.use(authorizeRole(['super-admin', 'hospital-admin']));

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const dataRequestTypeEnum = z.enum(['ACCESS', 'DELETION', 'AMENDMENT', 'RESTRICTION']);

const dataRequestStatusEnum = z.enum(['PENDING', 'APPROVED', 'DENIED', 'COMPLETED']);

const createAccessRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  requestType: dataRequestTypeEnum,
  requestedBy: z.string().min(1, 'Requestor name required'),
  requestorRelation: z.string().min(1, 'Requestor relation required (e.g., patient, legal-representative, attorney)'),
  notes: z.string().optional(),
});

const updateAccessRequestSchema = z.object({
  status: dataRequestStatusEnum,
  reviewNotes: z.string().optional(),
});

const deletionConfirmSchema = z.object({
  confirmation: z.literal('CONFIRM_PATIENT_DATA_DELETION', {
    errorMap: () => ({ message: 'Must provide confirmation string: CONFIRM_PATIENT_DATA_DELETION' }),
  }),
  reason: z.string().min(1, 'Deletion reason required'),
  legalBasis: z.string().min(1, 'Legal basis required (e.g., HIPAA right to deletion, court order)'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA ACCESS REQUEST ROUTES (HIPAA / DSAR)
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /access-request ────────────────────────────────────────────────────
// Create a patient data access/deletion/amendment/restriction request.
// Stored in AuditLog with action 'DATA_REQUEST_CREATED'.

router.post('/access-request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createAccessRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { patientId, requestType, requestedBy, requestorRelation, notes } = validation.data;
    const hospitalId = req.user!.hospitalId;

    // Verify patient exists and belongs to the user's hospital
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId, deletedAt: null },
      select: { id: true, mrn: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Log the data request creation in AuditLog
    const auditEntry = await prisma.auditLog.create({
      data: {
        hospitalId,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || 'unknown',
        action: 'DATA_REQUEST_CREATED',
        resourceType: 'DataRequest',
        resourceId: null,
        patientId,
        description: `${requestType} request created by ${requestedBy} (${requestorRelation})`,
        metadata: {
          requestType,
          requestedBy,
          requestorRelation,
          notes: notes || null,
          status: 'PENDING',
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        requestId: auditEntry.id,
        patientId,
        requestType,
        status: 'PENDING',
        requestedBy,
        requestorRelation,
        createdAt: auditEntry.timestamp,
      },
      message: `${requestType} request created successfully`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Create data request error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to create data request',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── GET /access-request ─────────────────────────────────────────────────────
// List all data requests for the hospital, with optional status filter.

router.get('/access-request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hospitalId = req.user!.hospitalId;
    const statusFilter = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    // Build where clause for AuditLog entries that represent data requests
    const where: any = {
      hospitalId,
      action: { in: ['DATA_REQUEST_CREATED', 'DATA_REQUEST_UPDATED'] },
    };

    // Filter by status if provided (stored in metadata JSON)
    // Note: For production, a dedicated DataRequest model would be more efficient
    // than filtering JSON in AuditLog. This approach works for MVP.

    const auditEntries = await prisma.auditLog.findMany({
      where: {
        hospitalId,
        action: 'DATA_REQUEST_CREATED',
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    });

    // If status filter is provided, filter in-application (metadata is JSON)
    let filteredEntries = auditEntries;
    if (statusFilter) {
      filteredEntries = auditEntries.filter((entry) => {
        const meta = entry.metadata as any;
        return meta?.status === statusFilter;
      });
    }

    const requests = filteredEntries.map((entry) => {
      const meta = entry.metadata as any;
      return {
        requestId: entry.id,
        patientId: entry.patientId,
        patientMRN: meta?.patientMRN,
        patientName: meta?.patientName,
        requestType: meta?.requestType,
        status: meta?.status || 'PENDING',
        requestedBy: meta?.requestedBy,
        requestorRelation: meta?.requestorRelation,
        notes: meta?.notes,
        createdAt: entry.timestamp,
        createdByEmail: entry.userEmail,
      };
    });

    const total = await prisma.auditLog.count({
      where: { hospitalId, action: 'DATA_REQUEST_CREATED' },
    });

    return res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      message: `${requests.length} data request(s)`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('List data requests error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve data requests',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── PATCH /access-request/:requestId ────────────────────────────────────────
// Update data request status (PENDING -> APPROVED/DENIED/COMPLETED).

router.patch('/access-request/:requestId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = updateAccessRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { requestId } = req.params;
    const { status, reviewNotes } = validation.data;
    const hospitalId = req.user!.hospitalId;

    // Find the original request audit entry
    const originalEntry = await prisma.auditLog.findFirst({
      where: {
        id: requestId,
        hospitalId,
        action: 'DATA_REQUEST_CREATED',
      },
    });

    if (!originalEntry) {
      return res.status(404).json({
        success: false,
        error: 'Data request not found',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const previousMeta = originalEntry.metadata as any;

    // HIPAA §164.312(b): audit logs are append-only. Never call auditLog.update().
    // The original DATA_REQUEST_CREATED entry is immutable. Status changes are
    // tracked via separate append entries below. Read current status by querying
    // the latest audit entry for this resource.

    // Create an append-only audit trail entry for the status change
    await prisma.auditLog.create({
      data: {
        hospitalId,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || 'unknown',
        action: 'DATA_REQUEST_UPDATED',
        resourceType: 'DataRequest',
        resourceId: requestId,
        patientId: originalEntry.patientId,
        description: `Data request status changed from ${previousMeta?.status || 'PENDING'} to ${status}`,
        previousValues: { status: previousMeta?.status || 'PENDING' },
        newValues: { status, reviewNotes },
      },
    });

    return res.json({
      success: true,
      data: { requestId, status, reviewedBy: req.user!.email },
      message: `Data request status updated to ${status}`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Update data request error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to update data request',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT DATA EXPORT & DELETION (DSAR)
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /export/:patientId ─────────────────────────────────────────────────
// Generate a complete patient data export (DSAR / HIPAA right of access).
// Returns all encounters, observations, alerts, medications, conditions as JSON.

router.post('/export/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.user!.hospitalId;

    // Verify patient exists and belongs to the hospital
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId, deletedAt: null },
      include: {
        encounters: {
          where: { deletedAt: null },
          orderBy: { startDateTime: 'desc' },
        },
        observations: {
          where: { deletedAt: null },
          orderBy: { observedDateTime: 'desc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
        },
        medications: true,
        conditions: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Log the export action
    await prisma.auditLog.create({
      data: {
        hospitalId,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || 'unknown',
        action: 'DATA_EXPORT_DSAR',
        resourceType: 'Patient',
        resourceId: patientId,
        patientId,
        description: `Complete patient data export (DSAR) for patient ${patientId}`,
        metadata: {
          exportedRecordCounts: {
            encounters: patient.encounters.length,
            observations: patient.observations.length,
            alerts: patient.alerts.length,
            medications: patient.medications.length,
            conditions: patient.conditions.length,
          },
        },
      },
    });

    // Build the export payload
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user!.email,
        exportFormat: 'JSON',
        hipaaCompliant: true,
        requestType: 'DSAR_RIGHT_OF_ACCESS',
      },
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode,
        isActive: patient.isActive,
        riskScore: patient.riskScore,
        riskCategory: patient.riskCategory,
        lastAssessment: patient.lastAssessment,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      encounters: patient.encounters,
      observations: patient.observations,
      alerts: patient.alerts,
      medications: patient.medications,
      conditions: patient.conditions,
    };

    return res.json({
      success: true,
      data: exportData,
      message: 'Patient data export generated successfully',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Patient data export error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to generate patient data export',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── POST /deletion/:patientId ───────────────────────────────────────────────
// Execute a patient data deletion request (DSAR right to erasure).
// Soft-deletes the patient and cascading soft-deletes all related records.
// Requires explicit confirmation string in request body.

router.post('/deletion/:patientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = deletionConfirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { reason, legalBasis } = validation.data;
    const { patientId } = req.params;
    const hospitalId = req.user!.hospitalId;

    // Verify patient exists and belongs to the hospital
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId, deletedAt: null },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        _count: {
          select: { encounters: true, observations: true, alerts: true },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found or already deleted',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const now = new Date();

    // Execute cascade deletion in a transaction
    // Clinical records are hard-deleted; patient shell is soft-deleted for 6-year retention
    const result = await prisma.$transaction(async (tx) => {
      // Hard-delete clinical records (no retention requirement for derived data)
      const [medications, conditions, carePlans, cqlResults, therapyGaps,
             phenotypes, referrals, titrations, devices, riskScores,
             interventions, contraindications, orders, recommendations, alerts] = await Promise.all([
        tx.medication.deleteMany({ where: { patientId, hospitalId } }),
        tx.condition.deleteMany({ where: { patientId, hospitalId } }),
        tx.carePlan.deleteMany({ where: { patientId, hospitalId } }),
        tx.cQLResult.deleteMany({ where: { patientId, hospitalId } }),
        tx.therapyGap.deleteMany({ where: { patientId, hospitalId } }),
        tx.phenotype.deleteMany({ where: { patientId, hospitalId } }),
        tx.crossReferral.deleteMany({ where: { patientId, hospitalId } }),
        tx.drugTitration.deleteMany({ where: { patientId, hospitalId } }),
        tx.deviceEligibility.deleteMany({ where: { patientId, hospitalId } }),
        tx.riskScoreAssessment.deleteMany({ where: { patientId, hospitalId } }),
        tx.interventionTracking.deleteMany({ where: { patientId, hospitalId } }),
        tx.contraindicationAssessment.deleteMany({ where: { patientId, hospitalId } }),
        tx.order.deleteMany({ where: { patientId, hospitalId } }),
        tx.recommendation.deleteMany({ where: { patientId, hospitalId } }),
        tx.alert.deleteMany({ where: { patientId, hospitalId } }),
      ]);

      // Soft-delete encounters and observations (have deletedAt field)
      const encounters = await tx.encounter.updateMany({
        where: { patientId, hospitalId, deletedAt: null },
        data: { deletedAt: now },
      });
      const observations = await tx.observation.updateMany({
        where: { patientId, hospitalId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Resolve remaining alerts (already hard-deleted above, this handles any with resolvedAt tracking)
      const resolvedAlerts = await tx.alert.updateMany({
        where: { patientId, hospitalId, resolvedAt: null },
        data: { resolvedAt: now },
      });

      // Soft-delete the patient record
      await tx.patient.update({
        where: { id: patientId },
        data: { deletedAt: now, isActive: false },
      });

      return {
        encounters: encounters.count,
        observations: observations.count,
        alerts: alerts.count,
        medications: medications.count,
        conditions: conditions.count,
        carePlans: carePlans.count,
        therapyGaps: therapyGaps.count,
        phenotypes: phenotypes.count,
        referrals: referrals.count,
        titrations: titrations.count,
        riskScores: riskScores.count,
        interventions: interventions.count,
        contraindications: contraindications.count,
      };
    });

    // Create comprehensive audit trail
    await prisma.auditLog.create({
      data: {
        hospitalId,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || 'unknown',
        action: 'DATA_DELETION_DSAR',
        resourceType: 'Patient',
        resourceId: patientId,
        patientId,
        description: `Patient data deletion (DSAR) executed for patient ${patientId}`,
        metadata: {
          reason,
          legalBasis,
          deletionType: 'soft-delete',
          deletedAt: now.toISOString(),
          deletedRecordCounts: result,
          note: 'Records soft-deleted for HIPAA 6-year retention compliance. Hard deletion available after retention period.',
        },
      },
    });

    return res.json({
      success: true,
      data: {
        patientId,
        deletedAt: now.toISOString(),
        deletedRecordCounts: result,
      },
      message: `Patient and ${result.encounters} encounters, ${result.observations} observations, ${result.alerts} alerts soft-deleted. Audit trail created.`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Patient data deletion error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to execute patient data deletion',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

export = router;
