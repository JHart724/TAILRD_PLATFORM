/**
 * CDS Hooks 2.0 Implementation
 *
 * Endpoints:
 *   GET  /cds-services                              — Discovery
 *   POST /cds-services/tailrd-cardiovascular-gaps    — patient-view hook
 *   POST /cds-services/tailrd-drug-interaction-check — order-select hook
 *   POST /cds-services/:hookId/feedback              — Feedback
 *
 * CDS Hooks must always return HTTP 200. Never return 4xx or 5xx from hook endpoints.
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// ─── CDS Hooks JWT Verification (per CDS Hooks 2.0 spec) ─────────────────
// Required for Epic App Orchard. Verifies JWT from EHR's JWKS endpoint.
// jose is ESM-only — must use dynamic import() to avoid CJS require-time crash.

const jwksCache = new Map<string, any>();

async function verifyCDSHooksJWT(
  authHeader: string | undefined,
  hookId: string,
  issuerUrl: string
): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('CDS Hooks missing JWT', { hookId });
    return false;
  }
  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const jwksUrl = new URL('/.well-known/jwks.json', issuerUrl);
    if (!jwksCache.has(issuerUrl)) {
      jwksCache.set(issuerUrl, createRemoteJWKSet(jwksUrl));
    }
    const { payload } = await jwtVerify(authHeader.slice(7), jwksCache.get(issuerUrl)!, {
      audience: `${process.env.API_URL || 'https://api.tailrd-heart.com'}/cds-services`,
    });
    if (!payload.iss || !payload.iat || !payload.exp || !payload.jti) return false;
    return true;
  } catch (error) {
    logger.error('CDS Hooks JWT failed', { hookId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
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
    // JWT verification in production
    if (process.env.NODE_ENV === 'production' && req.body.fhirAuthorization?.subject) {
      const valid = await verifyCDSHooksJWT(
        req.headers.authorization as string,
        'tailrd-cardiovascular-gaps',
        req.body.fhirAuthorization.subject
      );
      if (!valid) return res.json({ cards: [] });
    }

    const { context } = req.body;
    const patientFhirId = context?.patientId;

    if (!patientFhirId) {
      return res.json({ cards: [] });
    }

    const patient = await prisma.patient.findFirst({
      where: { fhirPatientId: patientFhirId, isActive: true },
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

// order-select hook — drug interaction checking
router.post('/tailrd-drug-interaction-check', async (req: Request, res: Response) => {
  const hookStart = Date.now();
  try {
    // JWT verification in production
    if (process.env.NODE_ENV === 'production' && req.body.fhirAuthorization?.subject) {
      const valid = await verifyCDSHooksJWT(
        req.headers.authorization as string,
        'tailrd-drug-interaction-check',
        req.body.fhirAuthorization.subject
      );
      if (!valid) return res.json({ cards: [] });
    }

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
    // JWT verification in production
    if (process.env.NODE_ENV === 'production' && req.body.fhirAuthorization?.subject) {
      const valid = await verifyCDSHooksJWT(
        req.headers.authorization as string,
        'tailrd-discharge-gaps',
        req.body.fhirAuthorization.subject
      );
      if (!valid) return res.json({ cards: [] });
    }

    const { context } = req.body;
    const patientFhirId = context?.patientId;

    if (!patientFhirId) return res.json({ cards: [] });

    const patient = await prisma.patient.findFirst({
      where: { fhirPatientId: patientFhirId, isActive: true },
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
