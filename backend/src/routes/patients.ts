import { Router } from 'express';
import { APIResponse, PaginatedResponse } from '../types';
import { authenticateToken, authorizeRole, authorizeHospital, AuthenticatedRequest } from '../middleware/auth';
import { requirePHIAccess } from '../middleware/tierEnforcement';
import { writeAuditLog } from '../middleware/auditLogger';
import { validateBody, createPatientSchema, updatePatientSchema } from '../validation/clinicalSchemas';
import prisma from '../lib/prisma';

// HIPAA minimum necessary: redact direct identifiers for non-clinical roles
const PHI_REDACTED_ROLES = ['analyst', 'quality-director'];
function redactPHI(patient: Record<string, unknown>, role: string): Record<string, unknown> {
  if (!PHI_REDACTED_ROLES.includes(role)) return patient;
  return {
    ...patient,
    firstName: '***',
    lastName: '***',
    mrn: '***',
    dateOfBirth: null,
    phone: null,
    email: null,
    street: null,
    city: null,
    state: null,
    zipCode: null,
  };
}

const router = Router();

// All patient routes require authentication + PHI access tier
router.use(authenticateToken);
router.use(requirePHIAccess());

// ── LIST patients (paginated, scoped to user's hospital) ────────────────────

router.get('/',
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager', 'quality-director', 'analyst']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = req.user!.hospitalId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const skip = (page - 1) * limit;
      const search = (req.query.search as string) || '';
      const module = req.query.module as string;
      const riskCategory = req.query.riskCategory as string;
      const activeOnly = req.query.active !== 'false';

      // Build where clause
      const where: any = {
        hospitalId,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
        ...(riskCategory ? { riskCategory } : {}),
      };

      // Module filter
      if (module) {
        const moduleMap: Record<string, string> = {
          'heart-failure': 'heartFailurePatient',
          'electrophysiology': 'electrophysiologyPatient',
          'structural-heart': 'structuralHeartPatient',
          'coronary-intervention': 'coronaryPatient',
          'peripheral-vascular': 'peripheralVascularPatient',
          'valvular-disease': 'valvularDiseasePatient',
        };
        const field = moduleMap[module];
        if (field) where[field] = true;
      }

      // Search across name, MRN, email
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { mrn: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            isActive: true,
            riskScore: true,
            riskCategory: true,
            lastAssessment: true,
            heartFailurePatient: true,
            electrophysiologyPatient: true,
            structuralHeartPatient: true,
            coronaryPatient: true,
            peripheralVascularPatient: true,
            valvularDiseasePatient: true,
            lastEHRSync: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { encounters: true, observations: true, alerts: true } },
          },
        }),
        prisma.patient.count({ where }),
      ]);

      const role = req.user!.role;
      const scoped = patients.map(p => redactPHI(p as Record<string, unknown>, role));

      const response: PaginatedResponse = {
        success: true,
        data: scoped,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        message: `${patients.length} patients`,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
      writeAuditLog(req, 'PATIENT_LIST_VIEWED', 'Patient', null, `Viewed ${patients.length} patients`).catch(() => {});
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve patients',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── GET single patient with clinical summary ────────────────────────────────

router.get('/:patientId',
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager', 'quality-director', 'analyst']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, hospitalId, deletedAt: null },
        include: {
          encounters: {
            orderBy: { startDateTime: 'desc' },
            take: 10,
            select: {
              id: true, encounterType: true, status: true,
              startDateTime: true, endDateTime: true, primaryDiagnosis: true,
            },
          },
          observations: {
            orderBy: { observedDateTime: 'desc' },
            take: 20,
            select: {
              id: true, observationType: true, observationName: true, category: true,
              valueNumeric: true, valueText: true, unit: true, isAbnormal: true,
              observedDateTime: true,
            },
          },
          alerts: {
            where: { resolvedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true, alertType: true, severity: true, title: true,
              message: true, moduleType: true, actionRequired: true, createdAt: true,
            },
          },
          _count: {
            select: { encounters: true, observations: true, alerts: true, recommendations: true },
          },
        },
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      const scopedPatient = redactPHI(patient as Record<string, unknown>, req.user!.role);
      res.json({
        success: true,
        data: scopedPatient,
        message: 'Patient retrieved',
        timestamp: new Date().toISOString(),
      } as APIResponse);
      writeAuditLog(req, 'PATIENT_DETAIL_VIEWED', 'Patient', patientId, 'Patient record accessed').catch(() => {});
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve patient',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── CREATE patient (manual entry, not via webhook) ──────────────────────────

router.post('/',
  authorizeRole(['super-admin', 'hospital-admin', 'physician']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const validation = createPatientSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      const hospitalId = req.user!.hospitalId;
      const data = validation.data;

      const patient = await prisma.patient.create({
        data: {
          hospitalId,
          mrn: data.mrn,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          phone: data.phone || null,
          email: data.email || null,
          street: data.street || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          riskScore: data.riskScore ?? null,
          riskCategory: data.riskCategory ?? null,
          isActive: true,
        },
      });

      res.status(201).json({
        success: true,
        data: patient,
        message: 'Patient created',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Patient with this MRN already exists at this hospital',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create patient',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── UPDATE patient ──────────────────────────────────────────────────────────

router.put('/:patientId',
  authorizeRole(['super-admin', 'hospital-admin', 'physician']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const validation = updatePatientSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;
      const data = validation.data;

      // Ensure patient belongs to this hospital
      const existing = await prisma.patient.findFirst({
        where: { id: patientId, hospitalId, deletedAt: null },
      });
      if (!existing) {
        return res.status(404).json({
          success: false, error: 'Patient not found',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      const patient = await prisma.patient.update({
        where: { id: patientId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
          ...(data.gender && { gender: data.gender }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.street !== undefined && { street: data.street }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.riskScore !== undefined && { riskScore: data.riskScore }),
          ...(data.riskCategory !== undefined && { riskCategory: data.riskCategory }),
          ...(data.heartFailurePatient !== undefined && { heartFailurePatient: data.heartFailurePatient }),
          ...(data.electrophysiologyPatient !== undefined && { electrophysiologyPatient: data.electrophysiologyPatient }),
          ...(data.structuralHeartPatient !== undefined && { structuralHeartPatient: data.structuralHeartPatient }),
          ...(data.coronaryPatient !== undefined && { coronaryPatient: data.coronaryPatient }),
          ...(data.peripheralVascularPatient !== undefined && { peripheralVascularPatient: data.peripheralVascularPatient }),
          ...(data.valvularDiseasePatient !== undefined && { valvularDiseasePatient: data.valvularDiseasePatient }),
        },
      });

      res.json({
        success: true,
        data: patient,
        message: 'Patient updated',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to update patient',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── SOFT DELETE patient (HIPAA 6-year retention) ────────────────────────────

router.delete('/:patientId',
  authorizeRole(['super-admin', 'hospital-admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;

      const existing = await prisma.patient.findFirst({
        where: { id: patientId, hospitalId, deletedAt: null },
      });
      if (!existing) {
        return res.status(404).json({
          success: false, error: 'Patient not found',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      // Soft delete — set deletedAt, keep data for HIPAA retention
      await prisma.patient.update({
        where: { id: patientId },
        data: { deletedAt: new Date(), isActive: false },
      });

      res.json({
        success: true,
        message: 'Patient deactivated (soft-deleted for HIPAA retention)',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete patient',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── Patient encounter history ───────────────────────────────────────────────

router.get('/:patientId/encounters',
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager', 'quality-director']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

      const encounters = await prisma.encounter.findMany({
        where: { patientId, hospitalId, deletedAt: null },
        orderBy: { startDateTime: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        data: encounters,
        message: `${encounters.length} encounters`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false, error: 'Failed to retrieve encounters',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── Patient observation history (labs/vitals) ───────────────────────────────

router.get('/:patientId/observations',
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager', 'quality-director']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;
      const category = req.query.category as string;
      const limit = Math.min(200, parseInt(req.query.limit as string) || 50);

      const observations = await prisma.observation.findMany({
        where: {
          patientId,
          hospitalId,
          deletedAt: null,
          ...(category ? { category: category as any } : {}),
        },
        orderBy: { observedDateTime: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        data: observations,
        message: `${observations.length} observations`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false, error: 'Failed to retrieve observations',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── Patient active alerts ───────────────────────────────────────────────────

router.get('/:patientId/alerts',
  authorizeRole(['super-admin', 'hospital-admin', 'physician', 'nurse-manager', 'quality-director']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = req.user!.hospitalId;

      const alerts = await prisma.alert.findMany({
        where: { patientId, hospitalId, resolvedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: alerts,
        message: `${alerts.length} active alerts`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false, error: 'Failed to retrieve alerts',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

export = router;
