import { Router } from 'express';
import crypto from 'crypto';
import { RedoxWebhookPayload, APIResponse } from '../types';
import { processPatientData } from '../services/patientService';
import { processObservationData } from '../services/observationService';
import { processEncounterData } from '../services/encounterService';
import { createLogger } from 'winston';

const router = Router();
const logger = createLogger({ service: 'webhook-handler' });

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

  const rawBody = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  )) {
    logger.warn('Invalid Redox webhook signature', {
      expected: expectedSignature,
      provided: providedSignature
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
      timestamp: new Date().toISOString()
    } as APIResponse);
  }

  next();
};

router.post('/redox', verifyRedoxSignature, async (req, res) => {
  try {
    const payload: RedoxWebhookPayload = req.body;
    
    logger.info('Received Redox webhook', {
      eventType: payload.EventType,
      eventDateTime: payload.EventDateTime,
      isTest: payload.Test,
      source: payload.Source?.Name
    });

    if (payload.Test) {
      logger.info('Test webhook received - no processing required');
      return res.status(200).json({
        success: true,
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }

    switch (payload.EventType) {
      case 'NewPatient':
      case 'PatientUpdate':
        if (payload.Patient) {
          await processPatientData(payload.Patient, payload.EventType);
          logger.info(`Processed ${payload.EventType} for patient`, {
            patientId: payload.Patient.id
          });
        }
        break;

      case 'Results':
      case 'NewResults':
        if (payload.Results && payload.Results.length > 0) {
          for (const result of payload.Results) {
            await processObservationData(result, payload.Patient);
          }
          logger.info(`Processed ${payload.Results.length} lab results`);
        }
        break;

      case 'NewVisit':
      case 'VisitUpdate':
      case 'Discharge':
        if (payload.Visit) {
          await processEncounterData(payload.Visit, payload.Patient, payload.EventType);
          logger.info(`Processed ${payload.EventType} for encounter`, {
            encounterId: payload.Visit.id
          });
        }
        break;

      case 'NewOrder':
      case 'OrderUpdate':
        if (payload.Orders && payload.Orders.length > 0) {
          logger.info(`Received ${payload.Orders.length} orders - processing not yet implemented`);
        }
        break;

      default:
        logger.warn(`Unhandled event type: ${payload.EventType}`);
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
      payload: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message,
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

router.post('/redox/test', (req, res) => {
  logger.info('Test webhook endpoint called');
  res.status(200).json({
    success: true,
    message: 'Test webhook endpoint is working',
    timestamp: new Date().toISOString(),
    receivedData: req.body
  } as APIResponse);
});

router.get('/redox/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'active',
      webhookUrl: `${process.env.API_BASE_URL}/webhooks/redox`,
      testUrl: `${process.env.API_BASE_URL}/webhooks/redox/test`,
      signatureVerification: !!process.env.REDOX_WEBHOOK_SECRET,
      lastUpdated: new Date().toISOString()
    },
    message: 'Redox webhook endpoints are configured and ready',
    timestamp: new Date().toISOString()
  } as APIResponse);
});

export = router;