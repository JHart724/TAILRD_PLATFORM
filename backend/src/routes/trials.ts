// AUDIT-148 Slice 1 (STEP 4): trials backend routes (the 8th module getting a real backend).
//
// Slice 1 ships GET /trials (list the tenant-visible curated catalog) and the Slice-1 matcher endpoint
// GET /trials/:trialId/eligible-patients (runs the honest matcher over the tenant's patients, returns
// the EXTENDED shape - matchStatus + criteriaResults + indeterminateSignals - for ALL THREE states,
// INDETERMINATE included, since those are the coordinator worklist). refer + registry-case endpoints
// are later slices. The client-side ClinicalTrials.gov discovery feed (AUDIT-147) is untouched.
//
// Tenant isolation: hospitalId ALWAYS from the verified JWT (req.user.hospitalId), NEVER the body/params.

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { APIResponse, UserRole } from '../types';
import { authenticateToken, authorizeRole, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { buildPatientEvalContext } from '../ingestion/buildPatientEvalContext';
import { evaluateTrialMatch, TrialCriterion } from '../services/trialMatchService';

const router = Router();

const TRIAL_ROLES: UserRole[] = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN', 'NURSE_MANAGER'];
const ok = (data: unknown): APIResponse => ({ success: true, data, timestamp: new Date().toISOString() });
const fail = (error: string): APIResponse => ({ success: false, error, timestamp: new Date().toISOString() });

// Trials visible to a tenant: the global curated catalog (hospitalId null) + this tenant's own trials.
const tenantTrialWhere = (hospitalId: string) => ({ OR: [{ hospitalId: null }, { hospitalId }] });

/**
 * GET /api/trials
 * List the curated clinical trials visible to the caller's tenant (global curated + tenant-scoped).
 */
router.get('/', authenticateToken, requireMFA, authorizeRole(TRIAL_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId;
      const trials = await prisma.clinicalTrial.findMany({
        where: tenantTrialWhere(hospitalId),
        orderBy: { createdAt: 'asc' },
      });
      const payload = trials.map((t: any) => ({
        id: t.id,
        name: t.name,
        module: t.module ?? '',
        phase: t.phase ?? '',
        status: t.status ?? '',
        eligibilityCriteria: (t.criteria as unknown as TrialCriterion[]).map(c => c.criterionId),
        enrollmentTarget: t.enrollmentTarget ?? 0,
        currentEnrollment: t.currentEnrollment ?? 0,
      }));
      res.json(ok(payload));
    } catch (error) {
      logger.error('List trials failed', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json(fail('Failed to list trials'));
    }
  });

/**
 * GET /api/trials/:trialId/eligible-patients
 * Run the honest matcher over the tenant's active patients for the given trial. Returns each patient
 * enriched with matchStatus (ELIGIBLE|INELIGIBLE|INDETERMINATE) + per-criterion results + the named
 * unthreaded signals. INDETERMINATE patients are RETURNED (not filtered) - they are the "one test away"
 * worklist and dropping them would recreate the assert-eligibility-hide-the-unknown defect AUDIT-148 fixes.
 */
router.get('/:trialId/eligible-patients', authenticateToken, requireMFA, authorizeRole(TRIAL_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId; // tenant scope from the verified JWT, never the params/body
      const { trialId } = req.params;

      const trial = await prisma.clinicalTrial.findFirst({
        where: { id: trialId, ...tenantTrialWhere(hospitalId) },
      });
      if (!trial) {
        return res.status(404).json(fail('Trial not found'));
      }

      // Load the tenant's active patients with exactly what buildPatientEvalContext needs.
      const patients = await prisma.patient.findMany({
        where: { hospitalId, isActive: true },
        include: {
          conditions: { where: { clinicalStatus: { notIn: ['RESOLVED', 'INACTIVE'] } } },
          medications: { where: { status: 'ACTIVE' } },
          observations: { orderBy: { observedDateTime: 'desc' } },
          procedures: true,
        },
      });

      const now = Date.now();
      const criteria = trial.criteria as unknown as TrialCriterion[];
      const results = patients.map((p: any) => {
        const ctx = buildPatientEvalContext(p, now);
        const match = evaluateTrialMatch({ id: trial.id, criteria }, ctx);
        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          mrn: p.mrn,
          age: ctx.age,
          gender: ctx.gender,
          matchStatus: match.status,
          criteriaResults: match.criteriaResults,
          indeterminateSignals: match.indeterminateSignals,
        };
      });

      // Log counts only - never PHI (patient names/MRNs stay out of logs).
      const counts = results.reduce((acc: Record<string, number>, r) => {
        acc[r.matchStatus] = (acc[r.matchStatus] ?? 0) + 1; return acc;
      }, {});
      logger.info('Trial eligibility evaluated', { hospitalId, trialId, evaluated: results.length, counts });

      res.json(ok(results));
    } catch (error) {
      logger.error('Trial eligibility match failed', {
        hospitalId: req.user?.hospitalId, trialId: req.params.trialId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to evaluate trial eligibility'));
    }
  });

export default router;
