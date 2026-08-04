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
import { criteriaHash } from '../lib/canonicalJson';
import { resolveBuildSha } from '../scripts/buildSha';
import {
  PAGE_SIZE_MAX,
  resolvePageSize, resolveCursor,
  emptyCounts, totalEvaluated, MatchCounts, MatchStatus,
} from '../services/trialMatchPaging';
import {
  AsOf, buildAsOf, matchPageArgs, nextMatchPage, ageAt,
} from '../services/trialMatchReadModel';

/** As-of for a tenant with no visible trials: nothing computed, nothing to claim. */
function emptyAsOf(liveBuildSha: string): AsOf {
  return {
    evaluatedAt: null, lastRunFinishedAt: null, runBuildSha: null,
    liveBuildSha, stale: true, staleReasons: ['never-run'],
  };
}

/**
 * The relation set buildPatientEvalContext needs. One definition, so every read loads the same graph.
 * Annotated with Prisma's own include type: extracting the literal to a const widens `status: 'ACTIVE'`
 * to `string` and loses the enum, which the generated types reject.
 *
 * TRIALS PR 3: the two AGGREGATE reads no longer load this graph at all - they read persisted verdicts.
 * Its one remaining consumer is POST /:trialId/refer, which evaluates ONE patient live by design
 * (section 3.5(e)). That endpoint previously duplicated this literal inline; it now uses this constant,
 * so the "one definition" the comment claims is actually true.
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
 * Collect the as-of / staleness envelope for a set of current rows (identity design 3.6, R2/R3).
 * Shared by both read endpoints so a page and the summary can never disagree about currency.
 * `matchWhere` scopes it to exactly the rows the response covers.
 */
async function readAsOf(
  matchWhere: Record<string, unknown>,
  trials: Array<{ id: string; criteria: unknown }>,
  hospitalId: string,
): Promise<AsOf> {
  const [agg, shaGroups, versionGroups, lastRun] = await Promise.all([
    prisma.trialMatch.aggregate({ where: matchWhere, _min: { evaluatedAt: true } }),
    prisma.trialMatch.groupBy({ by: ['buildSha'], where: matchWhere }),
    prisma.trialMatch.groupBy({ by: ['trialId', 'criteriaVersion'], where: matchWhere }),
    prisma.trialMatchRun.findFirst({
      where: { hospitalId, outcome: 'COMPLETED' },
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  const storedVersions = new Map<string, (string | null)[]>();
  for (const g of versionGroups as Array<{ trialId: string; criteriaVersion: string | null }>) {
    const list = storedVersions.get(g.trialId) ?? [];
    list.push(g.criteriaVersion);
    storedVersions.set(g.trialId, list);
  }

  return buildAsOf({
    oldestEvaluatedAt: agg._min.evaluatedAt ?? null,
    lastRun: lastRun ? { finishedAt: lastRun.finishedAt, buildSha: lastRun.buildSha } : null,
    // A NULL buildSha (a row written before provenance existed) is normalized to '' so it can never
    // accidentally equal the live sha and wave itself through the divergence check.
    storedBuildShas: (shaGroups as Array<{ buildSha: string | null }>).map(g => g.buildSha ?? ''),
    liveBuildSha: resolveBuildSha(),
    storedCriteriaVersions: storedVersions,
    liveCriteriaVersions: new Map(trials.map(t => [t.id, criteriaHash(t.criteria)])),
    nowMs: Date.now(),
  });
}

/**
 * GET /api/trials/summary
 * COUNTS ONLY, per trial, across all three match states, for the Executive and Service Line views.
 *
 * TRIALS PR 3 (identity design 3.5(e)): this is now an INDEXED READ of persisted verdicts, not an
 * evaluation. It was a budgeted walk that evaluated the tenant inside the request, because a full pass
 * measured 451 seconds; it therefore returned a truncated id-ordered sample and honestly said so. The
 * problem was not the honesty, it was the number: measured, a 1,200-patient prefix reads HFrEF
 * 5/52/1143 where the population reads 68/24,319/1,184. A sample that is not representative cannot be
 * an executive figure at all.
 *
 * So the counts come from `groupBy` over current rows (`supersededAt IS NULL`), served by the existing
 * `(hospitalId, trialId, status)` index. Population-true, no budget, no `complete: false`, no sampling.
 * What replaces the sample banner is the as-of envelope: a precomputed number is honest only if it says
 * when it was computed and under what build and criteria.
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
        return res.json(ok({
          trials: [], patientsEvaluated: 0, computedInMs: Date.now() - startedAt,
          asOf: emptyAsOf(resolveBuildSha()),
        }));
      }

      // Tenant-scoped and current-only. `supersededAt: null` is the whole point of the partial unique
      // index: exactly one row per (patient, trial, tenant) is current, so this groupBy cannot
      // double-count a patient whose verdict has flipped - the superseded history stays out of it.
      const matchWhere = { hospitalId, supersededAt: null };

      const [statusGroups, patientsEvaluated, asOf] = await Promise.all([
        prisma.trialMatch.groupBy({
          by: ['trialId', 'status'],
          where: matchWhere,
          _count: { _all: true },
        }),
        // Distinct patients carrying a current verdict - the screened denominator. Derived from the
        // persisted set rather than from a live patient count, so the denominator always describes the
        // same population as the numerators.
        prisma.trialMatch.findMany({
          where: matchWhere, distinct: ['patientId'], select: { patientId: true },
        }).then(rows => rows.length),
        readAsOf(matchWhere, trials, hospitalId),
      ]);

      const counts = new Map<string, MatchCounts>(trials.map(t => [t.id, emptyCounts()]));
      for (const g of statusGroups as Array<{ trialId: string; status: MatchStatus; _count: { _all: number } }>) {
        const c = counts.get(g.trialId);
        if (c) c[g.status] = g._count._all;
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
      logger.info('Trial summary read', {
        hospitalId, trials: trials.length, patientsEvaluated, computedInMs,
        stale: asOf.stale, staleReasons: asOf.staleReasons,
      });
      res.json(ok({ trials: payload, patientsEvaluated, computedInMs, asOf }));
    } catch (error) {
      logger.error('Trial summary failed', {
        hospitalId: req.user?.hospitalId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to read trial summary'));
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
 * One page of the tenant's patients for a trial, each carrying matchStatus
 * (ELIGIBLE|INELIGIBLE|INDETERMINATE) + per-criterion results + the named unthreaded signals.
 * INDETERMINATE patients are RETURNED (not filtered) - they are the "one test away" worklist, and
 * dropping them would recreate the assert-eligibility-hide-the-unknown defect AUDIT-148 fixes.
 *
 * TRIALS PR 3 (identity design 3.5(e)): the page is now a READ of persisted verdicts rather than a
 * per-request evaluation. AUDIT-227 made the page bounded; this makes it cheap. The four-relation graph
 * (`EVAL_INCLUDE`) is gone from this path entirely - it now loads only the identity fields it renders.
 *
 * WHERE criteriaResults / indeterminateSignals COME FROM: **the stored row**, not a re-evaluation.
 * They are persisted columns (`TrialMatch.criteriaResults` Json, `indeterminateSignals` String[]),
 * written by the same `evaluateTrialMatch` call that produced `status`. Reading them back is the only
 * choice that keeps the row SELF-CONSISTENT: re-evaluating the page for detail while the count came
 * from the stored status could show a patient counted ELIGIBLE whose displayed criteria say otherwise,
 * at exactly the moment the two disagree - which is the moment a coordinator most needs them not to.
 * The detail and the verdict must come from the same evaluation or they are not evidence for it. If the
 * stored verdict is stale, the honest answer is to say so (the as-of envelope does), not to silently
 * mix a fresh detail into a stale count.
 *
 * Single-patient real-time answers keep evaluating live - see POST /:trialId/refer. The rule from the
 * design: aggregates read persisted verdicts, single-patient decisions evaluate live.
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

      // Page size stays CLAMPED (resolvePageSize) - a caller cannot request its way back to an
      // unbounded read, and that cap remains the actual defense even though the page is now cheap.
      const pageSize = resolvePageSize(req.query.pageSize);
      const cursor = resolveCursor(req.query.cursor);

      // Current rows only. Ordered by patientId, which preserves the ordering the evaluating version
      // had, so AUDIT-227's live-proven property (strictly ascending, zero duplicates across page
      // boundaries) is still literally true here. The cursor stays opaque to the client.
      const where = { hospitalId, trialId, supersededAt: null };
      const rows = await prisma.trialMatch.findMany({
        ...matchPageArgs(pageSize, cursor),
        where: { ...where, ...(cursor ? { patientId: { gt: cursor } } : {}) },
        select: {
          patientId: true, status: true, criteriaResults: true, indeterminateSignals: true,
          evaluatedAt: true,
          patient: { select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
        },
      });

      const now = Date.now();
      const results = (rows as any[]).map(r => ({
        // `id` is the PATIENT id, not the match row id - the CareTeam view keys expansion on it and
        // POSTs it to /refer. Changing it to the match id would silently break the referral flow.
        id: r.patientId,
        name: `${r.patient.firstName} ${r.patient.lastName}`,
        mrn: r.patient.mrn,
        age: ageAt(r.patient.dateOfBirth, now),
        gender: r.patient.gender ?? undefined,
        matchStatus: r.status,
        criteriaResults: r.criteriaResults,
        indeterminateSignals: r.indeterminateSignals,
      }));

      // Log counts only - never PHI (patient names/MRNs stay out of logs).
      const counts = results.reduce((acc: Record<string, number>, r) => {
        acc[r.matchStatus] = (acc[r.matchStatus] ?? 0) + 1; return acc;
      }, {});

      // The as-of envelope is scoped to THIS TRIAL's current rows, so a page says how current the
      // verdicts it is showing are - not how current the tenant is on average.
      const asOf = await readAsOf(where, [{ id: trial.id, criteria: trial.criteria }], hospitalId);

      logger.info('Trial eligibility page read', {
        hospitalId, trialId, returned: results.length, pageSize, hasCursor: Boolean(cursor), counts,
        stale: asOf.stale, staleReasons: asOf.staleReasons,
      });

      // AUDIT-227: the payload is an ENVELOPE, not a bare array. The page's counts are page-local by
      // construction - a client must call GET /trials/summary for tenant-wide totals rather than summing
      // pages, which would only ever be right after walking every page.
      const { nextCursor, hasMore } = nextMatchPage(rows as Array<{ patientId: string }>, pageSize);
      res.json(ok({ patients: results, pageSize, nextCursor, hasMore, pageCounts: counts, asOf }));
    } catch (error) {
      logger.error('Trial eligibility page failed', {
        hospitalId: req.user?.hospitalId, trialId: req.params.trialId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json(fail('Failed to read trial eligibility'));
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
        include: EVAL_INCLUDE,
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
