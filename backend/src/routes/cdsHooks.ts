/**
 * CDS Hooks 2.0 Implementation
 *
 * Endpoints:
 *   GET  /cds-services                              — Discovery
 *   POST /cds-services/tailrd-cardiovascular-gaps    — patient-view hook
 *   POST /cds-services/tailrd-drug-interaction-check — order-select hook
 *   POST /cds-services/tailrd-discharge-gaps         — encounter-discharge hook
 *   POST /cds-services/:hookId/feedback              — Feedback
 *
 * CDS Hooks return HTTP 200 + empty cards on context-resolution failure (per
 * spec). 401 reserved for JWT-signature-level auth failures only (per AUDIT-071
 * design D3).
 *
 * AUDIT-071 mitigation (2026-05-07): tenant resolution moved to upstream
 * `cdsHooksAuth` middleware which populates `req.cdsHooks = { hospitalId, ... }`.
 * Handlers below MUST use `req.cdsHooks.hospitalId` as a MANDATORY filter on
 * every Patient query — no conditional pattern. Discovery + feedback bypass
 * the middleware (no PHI; spec-required public).
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { writeAuditLog } from '../middleware/auditLogger';
import type { CdsHooksAuthenticatedRequest } from '../middleware/cdsHooksAuth';

const router = Router();

// AUDIT-071: defense-in-depth helper — hooks should never reach handler code
// without `req.cdsHooks` populated (cdsHooksAuth middleware short-circuits on
// failure). If middleware bypass happens (routing misconfiguration), fail
// closed: audit + return empty cards.
async function requireCdsHooksContext(
  req: Request,
  res: Response,
): Promise<{ hospitalId: string; ehrIssuerId: string; issuerUrl: string } | null> {
  const ctx = (req as CdsHooksAuthenticatedRequest).cdsHooks;
  if (!ctx) {
    try {
      await writeAuditLog(
        Object.assign(req, { user: { userId: 'system:cds-hooks', email: 'system@cds-hooks.tailrd-heart.com', role: 'SYSTEM', hospitalId: null } }) as Request,
        'CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED',
        'CdsHooks',
        null,
        'Handler reached without tenant context — middleware bypass',
        null,
        { path: req.path, method: req.method },
      );
    } catch {
      // audit log failure already throws for HIPAA-grade actions; swallow here
      // because we still want to return empty cards (spec-strict). The throw
      // is captured by AUDIT-013 file + Console transports.
    }
    res.status(200).json({ cards: [] });
    return null;
  }
  return ctx;
}

// Discovery endpoint — required by CDS Hooks spec
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    services: [
      {
        hook: 'patient-view',
        id: 'tailrd-cardiovascular-gaps',
        title: 'TAILRD Cardiovascular Therapy Gaps',
        description: 'Identifies evidence-based cardiovascular therapy gaps across Heart Failure, EP, Coronary, Structural, Valvular, and Peripheral Vascular disease.',
        prefetch: {
          patient: 'Patient/{{context.patientId}}',
          conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
          medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
        },
      },
      {
        hook: 'order-select',
        id: 'tailrd-drug-interaction-check',
        title: 'TAILRD Cardiovascular Drug Interaction Check',
        description: 'Checks for dangerous cardiovascular drug combinations including QTc prolongation, hyperkalemia cascade, ARNI washout period, and bleeding risk.',
        prefetch: {
          patient: 'Patient/{{context.patientId}}',
          medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
        },
      },
      {
        hook: 'encounter-discharge',
        id: 'tailrd-discharge-gaps',
        title: 'TAILRD Discharge Therapy Gap Check',
        description: 'Identifies therapy gaps at point of discharge to optimize post-discharge medication reconciliation.',
        prefetch: {
          patient: 'Patient/{{context.patientId}}',
          conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
          medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
        },
      },
    ],
  });
});

// patient-view hook — serve active therapy gaps as CDS cards
router.post('/tailrd-cardiovascular-gaps', async (req: Request, res: Response) => {
  const hookStart = Date.now();
  try {
    // AUDIT-071: tenant resolution upstream in cdsHooksAuth middleware.
    // req.cdsHooks.hospitalId is populated; defense-in-depth requireCdsHooksContext
    // catches middleware-bypass routing misconfiguration.
    const ctx = await requireCdsHooksContext(req, res);
    if (!ctx) return;

    const { context } = req.body;
    const patientFhirId = context?.patientId;

    if (!patientFhirId) {
      return res.json({ cards: [] });
    }

    // AUDIT-071: MANDATORY tenant filter — no conditional pattern. The
    // @@unique([hospitalId, fhirPatientId]) constraint (added in this PR's
    // migration) makes findFirst structurally tenant-scoped at the schema
    // layer; combined with the explicit where clause, this is fail-closed
    // by both code and schema.
    const patient = await prisma.patient.findFirst({
      where: {
        fhirPatientId: patientFhirId,
        hospitalId: ctx.hospitalId,
        isActive: true,
      },
    });

    if (!patient) {
      return res.json({ cards: [] });
    }

    const therapyGaps = await prisma.therapyGap.findMany({
      where: {
        patientId: patient.id,
        resolvedAt: null,
        currentStatus: { in: ['CRITICAL', 'HIGH', 'ACTIVE'] },
      },
      orderBy: [{ identifiedAt: 'desc' }],
      take: 5,
    });

    const cards = therapyGaps.map(gap => ({
      uuid: gap.id,
      summary: `${gap.gapType.replace(/_/g, ' ')}: ${gap.medication || gap.device || gap.targetStatus}`,
      detail: `Current: ${gap.currentStatus}. Target: ${gap.targetStatus}. Module: ${gap.module}.`,
      indicator: gap.currentStatus === 'CRITICAL' ? 'critical' : 'warning',
      source: {
        label: 'TAILRD Heart',
        url: `https://app.tailrd-heart.com/patients/${patient.id}/gaps`,
      },
      links: [
        {
          label: 'View in TAILRD',
          url: `https://app.tailrd-heart.com/patients/${patient.id}/gaps/${gap.id}`,
          type: 'absolute',
        },
      ],
    }));

    // Log CDS session
    await prisma.cdsHooksSession.create({
      data: {
        hookId: 'tailrd-cardiovascular-gaps',
        fhirContext: context || {},
        patientId: patient.id,
        hospitalId: patient.hospitalId,
        cards: cards as any,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const duration = Date.now() - hookStart;
    if (duration > 4000) logger.warn('CDS Hooks near 5s Epic limit', { hookId: 'tailrd-cardiovascular-gaps', durationMs: duration });

    logger.info('CDS Hooks patient-view served', {
      patientId: patient.id,
      cardCount: cards.length,
      durationMs: duration,
    });

    return res.json({ cards });
  } catch (error) {
    logger.error('CDS Hooks patient-view error', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - hookStart,
    });
    return res.json({ cards: [] }); // Always 200 per spec
  }
});

// order-select hook — drug interaction checking.
// AUDIT-071: this handler does NOT do patient lookup (operates on draftOrders +
// prefetch payload only). Middleware still resolves tenant for audit-trail
// completeness, but no per-row tenant filter is applied because no row read
// occurs.
router.post('/tailrd-drug-interaction-check', async (req: Request, res: Response) => {
  const hookStart = Date.now();
  try {
    const ctx = await requireCdsHooksContext(req, res);
    if (!ctx) return;

    const { context, prefetch } = req.body;
    const draftOrders = context?.draftOrders?.entry || [];
    const currentMeds = prefetch?.medications?.entry || [];

    const cards: any[] = [];

    const DANGEROUS_COMBOS = [
      {
        newDrugCodes: ['703793', '49737'], // amiodarone
        existingCodes: ['834060', '308460', '1665212'], // flecainide, sotalol, dofetilide
        severity: 'critical' as const,
        summary: 'Critical QTc prolongation risk: amiodarone + antiarrhythmic combination',
        detail: 'Obtain baseline QTc. Monitor ECG weekly for first month. Discontinue if QTc >500ms.',
      },
      {
        newDrugCodes: ['1656339', '1656341'], // sacubitril/valsartan
        existingCodes: ['29046', '18867', '214354', '54552'], // ACEi
        severity: 'critical' as const,
        summary: 'ARNI washout required: must hold ACEi for 36 hours before starting sacubitril/valsartan',
        detail: 'Risk of life-threatening angioedema if washout period not observed. 2022 AHA/ACC/HFSA Guidelines.',
      },
      {
        newDrugCodes: ['1364430', '1599538', '1037045'], // DOACs
        existingCodes: ['1191', '243670'], // aspirin, P2Y12
        severity: 'warning' as const,
        summary: 'Bleeding risk: DOAC + antiplatelet dual antithrombotic therapy',
        detail: 'Limit to ≤1 year post-ACS/PCI. Reassess at each visit. Use PPI concomitantly.',
      },
    ];

    for (const orderEntry of draftOrders) {
      const order = orderEntry.resource;
      if (order?.resourceType !== 'MedicationRequest') continue;

      const orderedRxNorm = order.medicationCodeableConcept?.coding?.find(
        (c: any) => c.system?.includes('rxnorm')
      )?.code;

      if (!orderedRxNorm) continue;

      for (const combo of DANGEROUS_COMBOS) {
        if (!combo.newDrugCodes.includes(orderedRxNorm)) continue;

        const hasRisky = currentMeds.some((me: any) => {
          const rxn = me.resource?.medicationCodeableConcept?.coding?.find(
            (c: any) => c.system?.includes('rxnorm')
          )?.code;
          return rxn && combo.existingCodes.includes(rxn);
        });

        if (hasRisky) {
          cards.push({
            uuid: crypto.randomUUID(),
            summary: combo.summary,
            detail: combo.detail,
            indicator: combo.severity,
            source: { label: 'TAILRD Heart DDI Check' },
          });
        }
      }
    }

    const duration = Date.now() - hookStart;
    if (duration > 4000) logger.warn('CDS Hooks near 5s Epic limit', { hookId: 'tailrd-drug-interaction-check', durationMs: duration });

    return res.json({ cards });
  } catch (error) {
    logger.error('CDS Hooks order-select error', { error: error instanceof Error ? error.message : String(error) });
    return res.json({ cards: [] });
  }
});

// encounter-discharge hook — discharge gap check
router.post('/tailrd-discharge-gaps', async (req: Request, res: Response) => {
  const hookStart = Date.now();
  try {
    // AUDIT-071: tenant resolution upstream in cdsHooksAuth middleware.
    const ctx = await requireCdsHooksContext(req, res);
    if (!ctx) return;

    const { context } = req.body;
    const patientFhirId = context?.patientId;

    if (!patientFhirId) return res.json({ cards: [] });

    // AUDIT-071: MANDATORY tenant filter (same pattern as cardiovascular-gaps)
    const patient = await prisma.patient.findFirst({
      where: {
        fhirPatientId: patientFhirId,
        hospitalId: ctx.hospitalId,
        isActive: true,
      },
    });

    if (!patient) return res.json({ cards: [] });

    const gaps = await prisma.therapyGap.findMany({
      where: { patientId: patient.id, resolvedAt: null },
      orderBy: { identifiedAt: 'desc' },
      take: 10,
    });

    if (gaps.length === 0) return res.json({ cards: [] });

    const duration = Date.now() - hookStart;
    if (duration > 4000) logger.warn('CDS Hooks near 5s Epic limit', { hookId: 'tailrd-discharge-gaps', durationMs: duration });

    return res.json({
      cards: [{
        uuid: crypto.randomUUID(),
        summary: `${gaps.length} cardiovascular therapy gap${gaps.length > 1 ? 's' : ''} identified at discharge`,
        detail: `Review ${gaps.length} open therapy gaps before discharge: ${gaps.map(g => g.gapType.replace(/_/g, ' ')).join(', ')}`,
        indicator: gaps.some(g => g.currentStatus === 'CRITICAL') ? 'critical' : 'warning',
        source: { label: 'TAILRD Heart' },
        links: [{
          label: 'Review all gaps in TAILRD',
          url: `https://app.tailrd-heart.com/patients/${patient.id}/gaps`,
          type: 'absolute',
        }],
      }],
    });
  } catch (error) {
    logger.error('CDS Hooks discharge error', { error: error instanceof Error ? error.message : String(error) });
    return res.json({ cards: [] });
  }
});

// Feedback endpoint — required by CDS Hooks spec
router.post('/:hookId/feedback', (req: Request, res: Response) => {
  const { card, outcome } = req.body;
  logger.info('CDS Hooks feedback', {
    hookId: req.params.hookId,
    cardUuid: card?.uuid,
    outcome,
  });
  return res.status(200).end();
});

export default router;
