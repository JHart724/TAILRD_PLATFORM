import { logger } from '../utils/logger';
import { RedoxWebhookPayload } from './webhookHandler';
import { PatientService } from '../services/patientService';
import { VisitService } from '../services/visitService';
import { ResultsService } from '../services/resultsService';
import { OrdersService } from '../services/ordersService';
import { AlertService } from '../services/alertService';
import { AuditService } from '../services/auditService';

/**
 * Redox Event Processor
 * Routes and processes different types of EMR events from Redox
 * Implements clinical decision support and real-time analytics
 */

export interface ProcessingResult {
  success: boolean;
  message: string;
  patientId?: string;
  visitId?: string;
  alertsTriggered?: number;
  dataProcessed?: any;
}

export class RedoxEventProcessor {
  private patientService: PatientService;
  private visitService: VisitService;
  private resultsService: ResultsService;
  private ordersService: OrdersService;
  private alertService: AlertService;
  private auditService: AuditService;

  constructor() {
    this.patientService = new PatientService();
    this.visitService = new VisitService();
    this.resultsService = new ResultsService();
    this.ordersService = new OrdersService();
    this.alertService = new AlertService();
    this.auditService = new AuditService();
  }

  /**
   * Main event processing router
   */
  async processEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    const { Meta } = payload;
    const startTime = Date.now();

    try {
      // Skip test events in production
      if (Meta.Test && process.env.NODE_ENV === 'production') {
        logger.info('Skipping test event in production', {
          dataModel: Meta.DataModel,
          eventType: Meta.EventType
        });
        return {
          success: true,
          message: 'Test event skipped in production'
        };
      }

      // Log event for audit trail
      await this.auditService.logEvent({
        eventType: 'redox_webhook',
        dataModel: Meta.DataModel,
        eventDateTime: Meta.EventDateTime,
        facilityCode: Meta.FacilityCode,
        source: Meta.Source,
        payload: payload
      });

      let result: ProcessingResult;

      // Route based on data model and event type
      switch (Meta.DataModel) {
        case 'PatientAdmin':
          result = await this.processPatientAdminEvent(payload);
          break;
        
        case 'Results':
          result = await this.processResultsEvent(payload);
          break;
        
        case 'Orders':
          result = await this.processOrdersEvent(payload);
          break;
        
        case 'Clinical Summary':
          result = await this.processClinicalSummaryEvent(payload);
          break;
        
        case 'Notes':
          result = await this.processNotesEvent(payload);
          break;
        
        case 'Scheduling':
          result = await this.processSchedulingEvent(payload);
          break;
        
        default:
          logger.warn('Unsupported data model', {
            dataModel: Meta.DataModel,
            eventType: Meta.EventType
          });
          result = {
            success: false,
            message: `Unsupported data model: ${Meta.DataModel}`
          };
      }

      const processingTime = Date.now() - startTime;
      logger.info('Event processed', {
        dataModel: Meta.DataModel,
        eventType: Meta.EventType,
        success: result.success,
        processingTimeMs: processingTime,
        alertsTriggered: result.alertsTriggered
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Event processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dataModel: Meta.DataModel,
        eventType: Meta.EventType,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Process Patient Admin events (admissions, discharges, transfers)
   */
  private async processPatientAdminEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    const { Meta, Patient, Visit } = payload;
    
    if (!Patient || !Visit) {
      return {
        success: false,
        message: 'Missing patient or visit data'
      };
    }

    try {
      // Upsert patient data
      const patientResult = await this.patientService.upsertPatient({
        identifiers: Patient.Identifiers,
        demographics: Patient.Demographics,
        facilityCode: Meta.FacilityCode,
        lastUpdated: Meta.EventDateTime
      });

      // Process visit data
      let visitResult;
      switch (Meta.EventType) {
        case 'Admission':
        case 'NewPatient':
          visitResult = await this.visitService.createVisit({
            patientId: patientResult.patientId,
            visitNumber: Visit.VisitNumber,
            accountNumber: Visit.AccountNumber,
            patientClass: Visit.PatientClass,
            visitDateTime: Visit.VisitDateTime,
            location: Visit.Location,
            attendingProvider: Visit.AttendingProvider,
            facilityCode: Meta.FacilityCode
          });
          break;
        
        case 'Discharge':
          visitResult = await this.visitService.dischargeVisit({
            visitNumber: Visit.VisitNumber,
            dischargeDateTime: Meta.EventDateTime,
            facilityCode: Meta.FacilityCode
          });
          break;
        
        case 'Transfer':
          visitResult = await this.visitService.transferVisit({
            visitNumber: Visit.VisitNumber,
            newLocation: Visit.Location,
            transferDateTime: Meta.EventDateTime,
            facilityCode: Meta.FacilityCode
          });
          break;
        
        default:
          visitResult = await this.visitService.updateVisit({
            visitNumber: Visit.VisitNumber,
            updates: Visit,
            facilityCode: Meta.FacilityCode
          });
      }

      // Trigger clinical alerts for cardiovascular patients
      const alertsTriggered = await this.alertService.checkCardiovascularAlerts({
        patientId: patientResult.patientId,
        visitId: visitResult.visitId,
        eventType: Meta.EventType,
        patientClass: Visit.PatientClass,
        location: Visit.Location
      });

      return {
        success: true,
        message: `Patient admin event processed: ${Meta.EventType}`,
        patientId: patientResult.patientId,
        visitId: visitResult.visitId,
        alertsTriggered: alertsTriggered.length
      };

    } catch (error) {
      throw new Error(`PatientAdmin processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process lab results and diagnostic reports
   */
  private async processResultsEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    const { Meta, Patient, Orders } = payload;
    
    if (!Patient || !Orders) {
      return {
        success: false,
        message: 'Missing patient or orders data'
      };
    }

    try {
      // Get or create patient
      const patientResult = await this.patientService.getOrCreatePatient({
        identifiers: Patient.Identifiers,
        demographics: Patient.Demographics,
        facilityCode: Meta.FacilityCode
      });

      // Process each order with results
      const processedResults = [];
      let totalAlertsTriggered = 0;

      for (const order of Orders) {
        if (!order.Results || order.Results.length === 0) continue;

        const resultData = await this.resultsService.processResults({
          patientId: patientResult.patientId,
          orderId: order.ID,
          accessionNumber: order.AccessionNumber,
          procedure: order.Procedure,
          results: order.Results,
          collectionDateTime: order.CollectionDateTime,
          completionDateTime: order.CompletionDateTime,
          provider: order.Provider,
          facilityCode: Meta.FacilityCode
        });

        processedResults.push(resultData);

        // Check for critical cardiovascular results
        const cardiacAlerts = await this.alertService.checkCardiacLabAlerts({
          patientId: patientResult.patientId,
          results: order.Results,
          procedure: order.Procedure,
          facilityCode: Meta.FacilityCode
        });

        totalAlertsTriggered += cardiacAlerts.length;
      }

      return {
        success: true,
        message: `Results processed: ${processedResults.length} orders`,
        patientId: patientResult.patientId,
        alertsTriggered: totalAlertsTriggered,
        dataProcessed: {
          ordersProcessed: processedResults.length,
          totalResults: Orders.reduce((sum, order) => sum + (order.Results?.length || 0), 0)
        }
      };

    } catch (error) {
      throw new Error(`Results processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process orders (medication orders, lab orders, etc.)
   */
  private async processOrdersEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    const { Meta, Patient, Orders } = payload;
    
    if (!Patient || !Orders) {
      return {
        success: false,
        message: 'Missing patient or orders data'
      };
    }

    try {
      const patientResult = await this.patientService.getOrCreatePatient({
        identifiers: Patient.Identifiers,
        demographics: Patient.Demographics,
        facilityCode: Meta.FacilityCode
      });

      const processedOrders = [];
      let totalAlertsTriggered = 0;

      for (const order of Orders) {
        const orderResult = await this.ordersService.processOrder({
          patientId: patientResult.patientId,
          orderId: order.ID,
          transactionDateTime: order.TransactionDateTime,
          procedure: order.Procedure,
          provider: order.Provider,
          facilityCode: Meta.FacilityCode,
          eventType: Meta.EventType
        });

        processedOrders.push(orderResult);

        // Check for cardiovascular medication interactions
        if (order.Procedure.Code && this.isCardiovascularOrder(order.Procedure)) {
          const medicationAlerts = await this.alertService.checkMedicationAlerts({
            patientId: patientResult.patientId,
            procedure: order.Procedure,
            provider: order.Provider,
            facilityCode: Meta.FacilityCode
          });

          totalAlertsTriggered += medicationAlerts.length;
        }
      }

      return {
        success: true,
        message: `Orders processed: ${processedOrders.length}`,
        patientId: patientResult.patientId,
        alertsTriggered: totalAlertsTriggered,
        dataProcessed: {
          ordersProcessed: processedOrders.length
        }
      };

    } catch (error) {
      throw new Error(`Orders processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process clinical summary events
   */
  private async processClinicalSummaryEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    // Implementation for clinical summary processing
    return {
      success: true,
      message: 'Clinical summary processed (implementation pending)'
    };
  }

  /**
   * Process clinical notes
   */
  private async processNotesEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    // Implementation for notes processing
    return {
      success: true,
      message: 'Notes processed (implementation pending)'
    };
  }

  /**
   * Process scheduling events
   */
  private async processSchedulingEvent(payload: RedoxWebhookPayload): Promise<ProcessingResult> {
    // Implementation for scheduling processing
    return {
      success: true,
      message: 'Scheduling event processed (implementation pending)'
    };
  }

  /**
   * Check if an order is cardiovascular-related
   */
  private isCardiovascularOrder(procedure: { Code: string; Codeset: string; Description: string }): boolean {
    const cardiacCodes = [
      // Common cardiac medication codes
      '10600', '197361', '1202', // ACE inhibitors
      '18867', '83367', '41126',  // Beta blockers
      '32968', '27369', '6918',   // Statins
      '11289', '35648', '35656'   // Diuretics
    ];

    const cardiacKeywords = [
      'cardiac', 'cardio', 'heart', 'blood pressure', 'cholesterol',
      'ecg', 'ekg', 'troponin', 'bnp', 'nt-probnp', 'lipid'
    ];

    return cardiacCodes.includes(procedure.Code) ||
           cardiacKeywords.some(keyword => 
             procedure.Description.toLowerCase().includes(keyword)
           );
  }
}