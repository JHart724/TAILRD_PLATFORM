import { Router } from 'express';
import crypto from 'crypto';
import { RedoxWebhookPayload, APIResponse } from '../types';
import { processPatientData } from '../services/patientService';
import { processObservationData } from '../services/observationService';
import { processEncounterData } from '../services/encounterService';
import {
  deriveIdempotencyKey,
  checkDuplicate,
  createWebhookRecord,
  markCompleted,
  markFailed,
  getDeadLetterEvents,
} from '../services/webhookPipeline';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
import { createLogger } from 'winston';

const router = Router();
const logger = createLogger({ defaultMeta: { service: 'webhook-handler' } });

// ── Resolve hospitalId from Redox source ────────────────────────────────────
// Redox payloads include Source.ID which maps to Hospital.redoxSourceId.

async function resolveHospitalId(payload: RedoxWebhookPayload): Promise<string> {
  const sourceId = payload.Source?.ID || payload.Meta?.Source?.ID;
  if (!sourceId) {
    throw new Error('Webhook payload has no Source.ID — cannot resolve hospital');
  }

  const hospital = await prisma.hospital.findUnique({
    where: { redoxSourceId: sourceId },
    select: { id: true },
  });

  if (!hospital) {
    throw new Error(`No hospital found for Redox source ID: ${sourceId}`);
  }

  return hospital.id;
}

// ── Ensure patient exists in DB before processing encounters/observations ──
// If no Patient section in payload, try to look up by FHIR id within hospital.

async function ensurePatientId(
  payload: RedoxWebhookPayload,
  hospitalId: string,
): Promise<string> {
  if (payload.Patient) {
    const result = await processPatientData(payload.Patient, payload.EventType, hospitalId);
    return result.patientId;
  }

  // No Patient in payload — this shouldn't happen per Redox spec, but handle gracefully
  throw new Error('Webhook payload has no Patient section — cannot resolve patientId');
}

// ── HMAC-SHA256 signature verification ──────────────────────────────────────

const verifyRedoxSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-redox-signature'];
  const webhookSecret = process.env.REDOX_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('REDOX_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: 'Webhook verification not configured',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  if (!signature) {
    logger.warn('Missing Redox signature in webhook request');
    return res.status(401).json({
      success: false,
      error: 'Missing webhook signature',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  // Use raw body captured by express.json verify callback for accurate HMAC
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  )) {
    logger.warn('Invalid Redox webhook signature');
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  next();
};

// ── Main webhook endpoint ───────────────────────────────────────────────────

router.post('/redox', verifyRedoxSignature, async (req, res) => {
  try {
    const payload: RedoxWebhookPayload = req.body;

    logger.info('Received Redox webhook', {
      eventType: payload.EventType,
      eventDateTime: payload.EventDateTime,
      isTest: payload.Test,
      source: payload.Source?.Name,
    });

    // Test webhooks: acknowledge immediately, don't process
    if (payload.Test) {
      logger.info('Test webhook received — no processing');
      return res.status(200).json({
        success: true,
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    // Resolve the hospital from the Redox source ID
    const hospitalId = await resolveHospitalId(payload);

    // ── Idempotency check ────────────────────────────────────────────────
    const idempotencyKey = deriveIdempotencyKey(payload);
    const { isDuplicate, existingId, existingStatus } = await checkDuplicate(idempotencyKey);

    if (isDuplicate) {
      return res.status(200).json({
        success: true,
        message: `Duplicate event — already processed (${existingId})`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Archive the raw payload for audit/replay (WebhookEvent table)
    const webhookEventId = await createWebhookRecord(
      idempotencyKey, hospitalId, payload, existingId,
    );

    let processedPatientId: string | undefined;

    try {
      switch (payload.EventType) {
        case 'NewPatient':
        case 'PatientUpdate': {
          if (payload.Patient) {
            const { patientId } = await processPatientData(payload.Patient, payload.EventType, hospitalId);
            processedPatientId = patientId;
            logger.info(`Processed ${payload.EventType}`, { patientId, hospitalId });
          }
          break;
        }

        case 'Results':
        case 'NewResults': {
          if (payload.Results && payload.Results.length > 0) {
            const patientId = await ensurePatientId(payload, hospitalId);
            processedPatientId = patientId;
            for (const result of payload.Results) {
              await processObservationData(result, payload.Patient, hospitalId, patientId);
            }
            logger.info(`Processed ${payload.Results.length} lab results`, { hospitalId, patientId });
          }
          break;
        }

        case 'NewVisit':
        case 'VisitUpdate':
        case 'Discharge': {
          if (payload.Visit) {
            const patientId = await ensurePatientId(payload, hospitalId);
            const { encounterId } = await processEncounterData(
              payload.Visit, payload.Patient, payload.EventType, hospitalId, patientId,
            );
            logger.info(`Processed ${payload.EventType}`, { encounterId, hospitalId, patientId });
          }
          break;
        }

        case 'NewOrder':
        case 'OrderUpdate': {
          if (payload.Orders && payload.Orders.length > 0) {
            const patientId = await ensurePatientId(payload, hospitalId);
            const { OrdersService } = require('../services/ordersService');
            const ordersService = new OrdersService();
            for (const order of payload.Orders) {
              const orderCode = order.code?.coding?.[0]?.code || order.id || 'UNKNOWN';
              const orderName = order.code?.text || order.code?.coding?.[0]?.display;
              const categoryCode = order.category?.[0]?.coding?.[0]?.code || 'procedure';
              await ordersService.processOrder({
                patientId,
                hospitalId,
                orderType: categoryCode.toLowerCase() as any,
                orderCode,
                orderName,
                status: order.status,
                orderedDateTime: order.authoredOn ? new Date(order.authoredOn) : undefined,
                orderingProvider: order.requester?.display,
                rawPayload: order,
              });
            }
            logger.info(`Processed ${payload.Orders.length} orders`, { hospitalId, patientId });
          }
          break;
        }

        case 'PatientMerge': {
          try {
            const survivingMRN = (payload as any).Patient?.Identifiers?.find((i: any) => i.IDType === 'MRN')?.ID;
            const retiredMRN = (payload as any).Patient?.PreviousIdentifiers?.find((i: any) => i.IDType === 'MRN')?.ID;

            if (!survivingMRN || !retiredMRN) {
              logger.warn('PatientMerge event missing MRN identifiers', { hospitalId });
              break;
            }

            const [survivingPatient, retiredPatient] = await Promise.all([
              prisma.patient.findFirst({ where: { mrn: survivingMRN, hospitalId } }),
              prisma.patient.findFirst({ where: { mrn: retiredMRN, hospitalId } }),
            ]);

            if (!survivingPatient) {
              logger.warn('PatientMerge: surviving patient not found', { survivingMRN, hospitalId });
              break;
            }
            if (!retiredPatient) {
              logger.warn('PatientMerge: retired patient not found', { retiredMRN, hospitalId });
              break;
            }
            if (survivingPatient.id === retiredPatient.id) {
              logger.warn('PatientMerge: surviving and retired are same patient', { hospitalId });
              break;
            }

            await prisma.$transaction([
              prisma.encounter.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.observation.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.medication.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.condition.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.therapyGap.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.alert.updateMany({ where: { patientId: retiredPatient.id }, data: { patientId: survivingPatient.id } }),
              prisma.patient.update({
                where: { id: retiredPatient.id },
                data: { isActive: false, isMerged: true, mergedIntoId: survivingPatient.id, mergedAt: new Date() },
              }),
            ]);

            // Re-run gap detection for surviving patient with merged data
            const { runGapDetectionForPatient: runMergeGapDetection } = require('../ingestion/runGapDetectionForPatient');
            setImmediate(async () => {
              try {
                await runMergeGapDetection(survivingPatient.id, hospitalId);
              } catch (gapErr: any) {
                logger.error('Post-merge gap detection failed', { patientId: survivingPatient.id, error: gapErr.message });
              }
            });

            await writeAuditLog(
              { user: { userId: 'system', hospitalId } } as any,
              'PATIENT_MERGED', 'Patient', retiredPatient.id,
              JSON.stringify({ survivingPatientId: survivingPatient.id, survivingMRN, retiredMRN })
            );

            logger.info('PatientMerge completed', {
              survivingPatientId: survivingPatient.id,
              retiredPatientId: retiredPatient.id,
              hospitalId,
            });
          } catch (mergeError: any) {
            logger.error('PatientMerge failed', { hospitalId, error: mergeError.message });
          }
          break;
        }

        default:
          logger.warn(`Unhandled event type: ${payload.EventType}`);
      }

      // Write resolved patientId to WebhookEvent for DSAR cascade (FINDING-2.5-002)
      if (processedPatientId && webhookEventId) {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { patientId: processedPatientId },
        }).catch((err: Error) => {
          logger.warn('Failed to set patientId on WebhookEvent', { webhookEventId, error: err.message });
        });
      }

      // Mark webhook as completed
      await markCompleted(webhookEventId);

      // Trigger gap detection for affected patient (non-blocking)
      if (processedPatientId && hospitalId) {
        const { runGapDetectionForPatient } = require('../ingestion/runGapDetectionForPatient');
        setImmediate(async () => {
          try {
            await runGapDetectionForPatient(processedPatientId, hospitalId);
          } catch (gapError) {
            logger.error('Post-webhook gap detection failed', {
              patientId: processedPatientId,
              hospitalId,
              error: gapError instanceof Error ? gapError.message : String(gapError),
            });
          }
        });
      }
    } catch (processingError: any) {
      // Mark failed with retry logic (exponential backoff, dead-letter after 5 attempts)
      const { shouldRetry } = await markFailed(webhookEventId, processingError);
      if (!shouldRetry) {
        logger.error('Webhook dead-lettered', { webhookEventId, error: processingError.message });
      }
      // Re-throw so the outer catch can log it
      throw processingError;
    }

    res.status(200).json({
      success: true,
      message: `Webhook processed successfully for event: ${payload.EventType}`,
      timestamp: new Date().toISOString()
    } as APIResponse);

  } catch (error: any) {
    logger.error('Error processing Redox webhook:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message,
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

// ── Test endpoint (super-admin only, no signature verification) ──────────────

router.post('/redox/test',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN']),
  (req, res) => {
    logger.info('Test webhook endpoint called');
    res.status(200).json({
      success: true,
      message: 'Test webhook endpoint is working',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
);

// ── Dead-letter queue (admin only) ──────────────────────────────────────────

router.get('/dead-letter',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = req.query.hospitalId as string | undefined;
      const events = await getDeadLetterEvents(hospitalId);
      res.json({
        success: true,
        data: events,
        message: `${events.length} dead-letter events`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

// ── Status endpoint (super-admin only) ───────────────────────────────────────

router.get('/redox/status',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN']),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'active',
        signatureVerification: !!process.env.REDOX_WEBHOOK_SECRET,
        lastUpdated: new Date().toISOString()
      },
      message: 'Redox webhook status',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
);

export = router;
