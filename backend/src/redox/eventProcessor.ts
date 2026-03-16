import { PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient();

export class RedoxEventProcessor {
  private patientService: PatientService;
  private visitService: VisitService;
  private resultsService: ResultsService;
  private ordersService: OrdersService;
  private alertService: AlertService;
  private auditService: AuditService;

  constructor() {
    this.patientService = new PatientService();
    this.visitService = new VisitService(prisma);
    this.resultsService = new ResultsService(prisma);
    this.ordersService = new OrdersService(prisma);
    this.alertService = new AlertService();
    this.auditService = new AuditService(prisma);
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
        eventType: 'WEBHOOK_RECEIVED',
        userId: 'redox-system',
        userEmail: 'redox@tailrd.com',
        userRole: 'SYSTEM',
        hospitalId: Meta.FacilityCode || 'unknown',
        action: `redox_${Meta.DataModel}_${Meta.EventType}`,
        resourceType: 'RedoxWebhook',
        details: {
          dataModel: Meta.DataModel,
          eventDateTime: Meta.EventDateTime,
          facilityCode: Meta.FacilityCode,
          source: Meta.Source,
        },
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
      let visitResult: string | undefined;
      switch (Meta.EventType) {
        case 'Admission':
        case 'NewPatient':
          visitResult = await this.visitService.createVisit({
            patientId: patientResult.patientId,
            hospitalId: Meta.FacilityCode || '',
            encounterNumber: Visit.VisitNumber || '',
            encounterType: Visit.PatientClass,
            startDateTime: Visit.VisitDateTime ? new Date(Visit.VisitDateTime) : undefined,
            department: Visit.Location?.Department,
            attendingProvider: Visit.AttendingProvider?.FirstName
              ? `${Visit.AttendingProvider.FirstName} ${Visit.AttendingProvider.LastName}`
              : undefined,
            rawPayload: Visit,
          });
          break;

        case 'Discharge': {
          const activeVisitForDischarge = await this.visitService.getActiveVisit(
            patientResult.patientId,
            Meta.FacilityCode || ''
          );
          if (activeVisitForDischarge) {
            await this.visitService.dischargeVisit(
              activeVisitForDischarge.id,
              new Date(Meta.EventDateTime || Date.now())
            );
          }
          visitResult = activeVisitForDischarge?.id || '';
          break;
        }

        case 'Transfer': {
          const activeVisitForTransfer = await this.visitService.getActiveVisit(
            patientResult.patientId,
            Meta.FacilityCode || ''
          );
          if (activeVisitForTransfer) {
            await this.visitService.updateVisit(activeVisitForTransfer.id, {
              department: Visit.Location?.Department,
            });
          }
          visitResult = activeVisitForTransfer?.id || '';
          break;
        }

        default: {
          const activeVisitForUpdate = await this.visitService.getActiveVisit(
            patientResult.patientId,
            Meta.FacilityCode || ''
          );
          if (activeVisitForUpdate) {
            await this.visitService.updateVisit(activeVisitForUpdate.id, {
              department: Visit.Location?.Department,
              attendingProvider: Visit.AttendingProvider?.FirstName
                ? `${Visit.AttendingProvider.FirstName} ${Visit.AttendingProvider.LastName}`
                : undefined,
            });
          }
          visitResult = activeVisitForUpdate?.id || '';
        }
      }

      // Trigger clinical alerts for cardiovascular patients
      const alertsTriggered = await this.alertService.checkCardiovascularAlerts({
        patientId: patientResult.patientId,
        visitId: visitResult,
        eventType: Meta.EventType,
        patientClass: Visit.PatientClass,
        location: Visit.Location
      });

      return {
        success: true,
        message: `Patient admin event processed: ${Meta.EventType}`,
        patientId: patientResult.patientId,
        visitId: visitResult,
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

        for (const result of order.Results) {
          await this.resultsService.processResult({
            patientId: patientResult.patientId,
            hospitalId: Meta.FacilityCode || '',
            observationType: result.Code || order.Procedure?.Code || '',
            observationName: result.Description || order.Procedure?.Description,
            valueNumeric: result.Value && !isNaN(Number(result.Value)) ? Number(result.Value) : undefined,
            valueText: result.Value && isNaN(Number(result.Value)) ? result.Value : undefined,
            unit: result.Units,
            referenceRangeLow: result.ReferenceRange?.Low ? Number(result.ReferenceRange.Low) : undefined,
            referenceRangeHigh: result.ReferenceRange?.High ? Number(result.ReferenceRange.High) : undefined,
            category: 'LABORATORY',
            observedDateTime: order.CompletionDateTime ? new Date(order.CompletionDateTime) : undefined,
            rawPayload: result,
          });
        }

        processedResults.push(order.ID);

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
          hospitalId: Meta.FacilityCode || '',
          orderType: this.mapOrderType(order.Procedure?.Codeset),
          orderCode: order.Procedure?.Code || order.ID || '',
          orderName: order.Procedure?.Description,
          status: order.ResultsStatus,
          orderedDateTime: order.TransactionDateTime
            ? new Date(order.TransactionDateTime)
            : undefined,
          orderingProvider: order.Provider
            ? `${order.Provider.FirstName || ''} ${order.Provider.LastName || ''}`.trim()
            : undefined,
          rawPayload: order,
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
   * Map Redox codeset to OrdersService orderType
   */
  private mapOrderType(codeset?: string): 'medication' | 'lab' | 'procedure' | 'imaging' {
    const map: Record<string, 'medication' | 'lab' | 'procedure' | 'imaging'> = {
      'RxNorm': 'medication',
      'NDC': 'medication',
      'LOINC': 'lab',
      'CPT': 'procedure',
      'HCPCS': 'procedure',
    };
    return map[codeset || ''] || 'procedure';
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
