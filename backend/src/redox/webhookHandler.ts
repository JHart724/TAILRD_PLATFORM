import { Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { RedoxEventProcessor } from './eventProcessor';
import { RedoxWebhookValidator } from './webhookValidator';

/**
 * Redox Webhook Handler
 * Processes incoming webhooks from Redox for real-time EMR data
 * Supports all major EMR systems (Epic, Cerner, AllScripts, etc.)
 */

export interface RedoxWebhookPayload {
  Meta: {
    DataModel: string;
    EventType: string;
    EventDateTime: string;
    Test: boolean;
    Source: {
      ID: string;
      Name: string;
    };
    Destinations: Array<{
      ID: string;
      Name: string;
    }>;
    FacilityCode: string;
  };
  Patient?: {
    Identifiers: Array<{
      ID: string;
      IDType: string;
    }>;
    Demographics: {
      FirstName: string;
      MiddleName?: string;
      LastName: string;
      DOB: string;
      SSN?: string;
      Sex: string;
      Race?: string;
      IsHispanic?: boolean;
      Religion?: string;
      MaritalStatus?: string;
      IsDeceased?: boolean;
      DeathDateTime?: string;
      PhoneNumber: {
        Home?: string;
        Office?: string;
        Mobile?: string;
      };
      EmailAddresses?: string[];
      Language?: string;
      Citizenship?: string[];
      Address: {
        StreetAddress: string;
        City: string;
        State: string;
        ZIP: string;
        County?: string;
        Country?: string;
      };
    };
  };
  Visit?: {
    VisitNumber: string;
    AccountNumber?: string;
    PatientClass: string;
    VisitDateTime: string;
    Location: {
      Type?: string;
      Facility?: string;
      FacilityIdentifiers?: Array<{
        ID: string;
        IDType: string;
      }>;
      Department?: string;
      DepartmentIdentifiers?: Array<{
        ID: string;
        IDType: string;
      }>;
      Room?: string;
      Bed?: string;
    };
    AttendingProvider?: {
      ID: string;
      IDType: string;
      FirstName: string;
      LastName: string;
      Credentials?: string[];
      Address?: any;
      EmailAddresses?: string[];
      PhoneNumber?: any;
      Location?: any;
    };
  };
  Orders?: Array<{
    ID: string;
    ApplicationOrderID?: string;
    TransactionDateTime: string;
    CollectionDateTime?: string;
    CompletionDateTime?: string;
    AccessionNumber?: string;
    ResultsStatus: string;
    ResultCopiesTo?: Array<{
      ID: string;
      IDType: string;
      FirstName: string;
      LastName: string;
    }>;
    Provider: {
      ID: string;
      IDType: string;
      FirstName: string;
      LastName: string;
      Credentials?: string[];
      Address?: any;
      EmailAddresses?: string[];
      PhoneNumber?: any;
      Location?: any;
    };
    Procedure: {
      Code: string;
      Codeset: string;
      Description: string;
    };
    Results?: Array<{
      Code: string;
      Codeset: string;
      Description: string;
      RelatedGroupID?: string;
      Specimen?: {
        Source: string;
        BodySite?: string;
        ID?: string;
      };
      Value: string;
      ValueType: string;
      Units?: string;
      ReferenceRange?: {
        Low?: number;
        High?: number;
        Text?: string;
      };
      AbnormalFlag?: string;
      Status: string;
      PrimaryResultsInterpreter?: {
        ID: string;
        IDType: string;
        FirstName: string;
        LastName: string;
      };
      Producer?: {
        ID: string;
        IDType: string;
        FirstName: string;
        LastName: string;
      };
      Performer?: {
        ID: string;
        IDType: string;
        FirstName: string;
        LastName: string;
      };
      Notes?: string[];
    }>;
  }>;
}

export class RedoxWebhookHandler {
  private eventProcessor: RedoxEventProcessor;
  private validator: RedoxWebhookValidator;

  constructor() {
    this.eventProcessor = new RedoxEventProcessor();
    this.validator = new RedoxWebhookValidator();
  }

  /**
   * Main webhook endpoint handler
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const payload = req.body as RedoxWebhookPayload;
      
      // Log incoming webhook
      logger.info('Redox webhook received', {
        dataModel: payload.Meta?.DataModel,
        eventType: payload.Meta?.EventType,
        facilityCode: payload.Meta?.FacilityCode,
        isTest: payload.Meta?.Test,
        timestamp: payload.Meta?.EventDateTime
      });

      // Validate webhook signature
      if (!this.validator.validateSignature(req)) {
        logger.warn('Invalid webhook signature', {
          headers: req.headers,
          facilityCode: payload.Meta?.FacilityCode
        });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Validate payload structure
      const validationResult = this.validator.validatePayload(payload);
      if (!validationResult.isValid) {
        logger.error('Invalid webhook payload', {
          errors: validationResult.errors,
          facilityCode: payload.Meta?.FacilityCode
        });
        res.status(400).json({ 
          error: 'Invalid payload',
          details: validationResult.errors
        });
        return;
      }

      // Process the webhook event
      await this.eventProcessor.processEvent(payload);

      // Send success response
      const processingTime = Date.now() - startTime;
      logger.info('Webhook processed successfully', {
        dataModel: payload.Meta?.DataModel,
        eventType: payload.Meta?.EventType,
        facilityCode: payload.Meta?.FacilityCode,
        processingTimeMs: processingTime
      });

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
        processingTimeMs: processingTime
      });

    } catch (error) {
      logger.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Health check endpoint for Redox
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Verify database connectivity
      // Verify Redis connectivity
      // Check any other dependencies
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get webhook configuration for Redox setup
   */
  async getWebhookConfig(req: Request, res: Response): Promise<void> {
    const config = {
      webhookUrl: `${process.env.API_BASE_URL}/api/redox/webhook`,
      healthCheckUrl: `${process.env.API_BASE_URL}/api/redox/health`,
      supportedDataModels: [
        'Clinical Summary',
        'PatientAdmin',
        'Results',
        'Orders',
        'Notes',
        'Media',
        'Scheduling',
        'SurgicalScheduling'
      ],
      supportedEventTypes: [
        'NewPatient',
        'PatientUpdate',
        'Admission',
        'Discharge',
        'Transfer',
        'NewResult',
        'NewOrder',
        'OrderUpdate',
        'NewNote',
        'NoteUpdate'
      ],
      securityRequirements: {
        signatureValidation: true,
        httpsRequired: true,
        ipWhitelisting: process.env.REDOX_IP_WHITELIST?.split(',') || []
      }
    };

    res.status(200).json(config);
  }
}