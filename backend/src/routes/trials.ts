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
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { APIResponse, UserRole } from '../types';
import { authenticateToken, authorizeRole, requireMFA, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
import { logger } from '../utils/logger';
import { buildPatientEvalContext } from '../ingestion/buildPatientEvalContext';
import { evaluateTrialMatch, TrialCriterion } from '../services/trialMatchService';
import {
  PAGE_SIZE_MAX, SUMMARY_BATCH_SIZE,
  resolvePageSize, resolveCursor, pageArgs, nextPage, budgetExhausted,
  emptyCounts, tally, totalEvaluated, MatchCounts,
} from '../services/trialMatchPaging';

/**
 * The relation set buildPatientEvalContext needs. One definition, so every read loads the same graph.
 * Annotated with Prisma's own include type: extracting the literal to a const widens `status: 'ACTIVE'`
 * to `string` and loses the enum, which the generated types reject.
 */
const EVAL_INCLUDE: Prisma.PatientInclude = {
  conditions: { where: { clinicalStatus: { notIn: ['RESOLVED', 'INACTIVE'] } } },
  medications: { where: { status: 'ACTIVE' } },
  observations: { orderBy: { observedDateTime: 'desc' } },
  procedures: true,
};

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
 * GET /api/trials/summary
 * AUDIT-227: COUNTS ONLY, per trial, across all three match states. This exists so the Executive and
 * Service Line views never need patient rows to render an aggregate - the shape that made the unbounded
 * read tempting in the first place.
 *
 * Walks the tenant's patients in SUMMARY_BATCH_SIZE cursor batches, evaluating every visible trial per
 * batch so the relation graph is loaded ONCE per patient rather than once per trial. Nothing but tallies
 * is retained: no patient row, name, or MRN ever enters the payload or the logs.
 *
 * REGISTERED BEFORE '/:trialId/...' deliberately - Express matches in order, and '/summary' would
 * otherwise be captured as a trialId.
 */
router.get('/summary', authenticateToken, requireMFA, authorizeRole(TRIAL_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    const startedAt = Date.now();
    try {
      const hospitalId = req.user!.hospitalId;

      const trials = await prisma.clinicalTrial.findMany({
        where: tenantTrialWhere(hospitalId),
        orderBy: { createdAt: 'asc' },
      });
      if (trials.length === 0) {
        return res.json(ok({ trials: [], patientsEvaluated: 0, computedInMs: Date.now() - startedAt, complete: true }));
      }

      const counts = new Map<string, MatchCounts>(trials.map(t => [t.id, emptyCounts()]));
      const criteriaByTrial = new Map<string, TrialCriterion[]>(
        trials.map(t => [t.id, t.criteria as unknown as TrialCriterion[]]),
      );

      let cursor: string | undefined;
      let patientsEvaluated = 0;
      const now = Date.now();
      // MEASURED: a complete walk of this tenant takes 451s (25,571 patients, 17.64 ms each) - past any
      // sane HTTP timeout. The walk is budgeted and reports what it covered; `complete` says which.
      let complete = true;

      for (;;) {
        if (budgetExhausted(startedAt, Date.now())) { complete = false; break; }

        const batch = await prisma.patient.findMany({
          where: { hospitalId, isActive: true },
          include: EVAL_INCLUDE,
          ...pageArgs(SUMMARY_BATCH_SIZE, cursor),
        });
        if (batch.length === 0) break;

        for (const p of batch as any[]) {
          const ctx = buildPatientEvalContext(p, now);
          for (const t of trials) {
            const m = evaluateTrialMatch({ id: t.id, criteria: criteriaByTrial.get(t.id)! }, ctx);
            tally(counts.get(t.id)!, m.status);
          }
        }
        patientsEvaluated += batch.length;
        cursor = batch[batch.length - 1].id;
        if (batch.length < SUMMARY_BATCH_SIZE) break;
      }

      const payload = trials.map(t => {
        const c = counts.get(t.id)!;
        return {
          trialId: t.id,
          name: t.name,
          module: t.module ?? '',
          phase: t.phase ?? '',
          status: t.status ?? '',
          eligible: c.ELIGIBLE,
          indeterminate: c.INDETERMINATE,
          ineligible: c.INELIGIBLE,
          evaluated: totalEvaluated(c),
        };
      });

      const computedInMs = Date.now() - startedAt;
      logger.info('Trial summary computed', {
        hospitalId, trials: trials.length, patientsEvaluated, computedInMs, complete,
      });
      // `complete: false` means the counts cover patientsEvaluated of the tenant, NOT the whole tenant.
      // The client must label it a sample - a partial presented as a total is the dishonest failure here.
      res.json(ok({ trials: payload, patientsEvaluated, computedInMs, complete }));
    } catch (error) {
      logger.error('Trial summary failed', {
        hospitalId: req.user?.hospitalId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to compute trial summary'));
    }
  });

/**
 * GET /api/trials/:trialId/referrals
 * AUDIT-227: the read side of the referral flow (the write, POST /:trialId/refer, shipped in Slice 3
 * with no way to list what it wrote). Tenant-scoped; returns internal patient UUIDs and the recorded
 * verdict-at-referral, never PHI in logs.
 */
router.get('/:trialId/referrals', authenticateToken, requireMFA, authorizeRole(TRIAL_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hospitalId = req.user!.hospitalId;
      const { trialId } = req.params;

      // Trial must be visible to this tenant; else 404 (no existence leak), same guard as the siblings.
      const trial = await prisma.clinicalTrial.findFirst({
        where: { id: trialId, ...tenantTrialWhere(hospitalId) },
      });
      if (!trial) {
        return res.status(404).json(fail('Trial not found'));
      }

      // hospitalId in the WHERE is the tenant-isolation invariant - a referral from another tenant is
      // unreachable here even though the trial itself may be the shared global-curated row.
      const referrals = await prisma.trialReferral.findMany({
        where: { hospitalId, trialId },
        orderBy: { referredAt: 'desc' },
        take: PAGE_SIZE_MAX,
      });

      const payload = referrals.map(r => ({
        referralId: r.id,
        patientId: r.patientId,
        trialId: r.trialId,
        status: r.status,
        matchStatusAtReferral: r.matchStatusAtReferral,
        referredBy: r.referredBy,
        referredAt: r.referredAt.toISOString(),
        notes: r.notes,
      }));

      logger.info('Trial referrals listed', { hospitalId, trialId, count: payload.length });
      res.json(ok(payload));
    } catch (error) {
      logger.error('List trial referrals failed', {
        hospitalId: req.user?.hospitalId, trialId: req.params.trialId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to list trial referrals'));
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

      // AUDIT-227: ONE PAGE of the tenant's active patients, never the whole set. The prior shape loaded
      // every patient with all four relations and mapped the matcher over the array in memory - a
      // 3,000-patient probe with that graph died exit 137 (OOM) at production task size, and this tenant
      // holds 25,571. Page size is CLAMPED (resolvePageSize), so a caller cannot request its way back to
      // the unbounded read. Cursor shape mirrors gapDetectionRunner's proven id-cursor batch.
      const pageSize = resolvePageSize(req.query.pageSize);
      const cursor = resolveCursor(req.query.cursor);
      const patients = await prisma.patient.findMany({
        where: { hospitalId, isActive: true },
        include: EVAL_INCLUDE,
        ...pageArgs(pageSize, cursor),
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
      logger.info('Trial eligibility evaluated (page)', {
        hospitalId, trialId, evaluated: results.length, pageSize, hasCursor: Boolean(cursor), counts,
      });

      // AUDIT-227: the payload is now an ENVELOPE, not a bare array. The page's counts are page-local by
      // construction - a client must call GET /trials/summary for tenant-wide totals rather than summing
      // pages, which would only ever be right after walking every page.
      const { nextCursor, hasMore } = nextPage(results, pageSize);
      res.json(ok({ patients: results, pageSize, nextCursor, hasMore, pageCounts: counts }));
    } catch (error) {
      logger.error('Trial eligibility match failed', {
        hospitalId: req.user?.hospitalId, trialId: req.params.trialId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to evaluate trial eligibility'));
    }
  });

/**
 * POST /api/trials/:trialId/refer
 * Record that a clinician REFERRED a patient to a trial. This is the trials module's first WRITE of a
 * clinical decision - the platform RECORDS a human's decision, it does not enroll anyone (FDA-CDS: the
 * coordinator decides, we durably capture who/when/what).
 *
 * NOT gated on matchStatus: a coordinator may refer an INDETERMINATE patient precisely to drive the one
 * missing test, so ELIGIBLE, INELIGIBLE and INDETERMINATE are ALL accepted. The honest verdict at the
 * moment of referral is captured in matchStatusAtReferral for the audit trail only - it does not block.
 *
 * Tenant isolation: hospitalId ALWAYS from the verified JWT. A trial or patient outside the tenant is
 * unreachable and returns 404 (never 403 - we do not leak the existence of another tenant's rows).
 */
router.post('/:trialId/refer', authenticateToken, requireMFA, authorizeRole(TRIAL_ROLES),
  [
    body('patientId').isString().notEmpty().withMessage('patientId is required'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('notes must be <= 1000 chars'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(fail('Validation failed'));
      }

      const hospitalId = req.user!.hospitalId; // tenant scope from the verified JWT, never body/params
      const referredBy = req.user!.userId;     // the acting clinician
      const { trialId } = req.params;
      const { patientId, notes } = req.body as { patientId: string; notes?: string };

      // Trial must be visible to this tenant (global curated OR tenant-owned); else 404.
      const trial = await prisma.clinicalTrial.findFirst({
        where: { id: trialId, ...tenantTrialWhere(hospitalId) },
      });
      if (!trial) {
        return res.status(404).json(fail('Trial not found'));
      }

      // Patient must belong to this tenant; a cross-tenant patient is unreachable -> 404 (no existence leak).
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, hospitalId },
        include: {
          conditions: { where: { clinicalStatus: { notIn: ['RESOLVED', 'INACTIVE'] } } },
          medications: { where: { status: 'ACTIVE' } },
          observations: { orderBy: { observedDateTime: 'desc' } },
          procedures: true,
        },
      });
      if (!patient) {
        return res.status(404).json(fail('Patient not found'));
      }

      // Honest verdict at referral time - recorded for the trail, NOT a gate.
      const ctx = buildPatientEvalContext(patient as any, Date.now());
      const match = evaluateTrialMatch(
        { id: trial.id, criteria: trial.criteria as unknown as TrialCriterion[] }, ctx,
      );

      let referral;
      try {
        referral = await prisma.trialReferral.create({
          data: {
            patientId,
            hospitalId,
            trialId,
            referredBy,
            notes: notes ?? null,
            matchStatusAtReferral: match.status,
          },
        });
      } catch (createError: any) {
        // @@unique([patientId, trialId, hospitalId]) - this patient is already referred to this trial.
        if (createError?.code === 'P2002') {
          return res.status(409).json(fail('Patient already referred to this trial'));
        }
        throw createError;
      }

      // Audit the clinical-decision WRITE. Internal UUIDs only in the durable record - never patient PHI.
      await writeAuditLog(
        req, 'TRIAL_REFERRAL_CREATED', 'TrialReferral', referral.id,
        `Clinician referred a patient to trial ${trialId} (match status at referral: ${match.status})`,
        null,
        { patientId, trialId, matchStatusAtReferral: match.status },
      );

      logger.info('Trial referral created', { hospitalId, trialId, referralId: referral.id, matchStatusAtReferral: match.status });

      res.status(201).json(ok({
        referralId: referral.id,
        patientId: referral.patientId,
        trialId: referral.trialId,
        status: referral.status,
        matchStatusAtReferral: referral.matchStatusAtReferral,
        referredBy: referral.referredBy,
        referredAt: referral.referredAt.toISOString(),
      }));
    } catch (error) {
      logger.error('Trial referral failed', {
        hospitalId: req.user?.hospitalId, trialId: req.params.trialId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to create trial referral'));
    }
  });

export default router;
