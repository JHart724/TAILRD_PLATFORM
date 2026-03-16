import { logger } from '../utils/logger';
import { RedoxWebhookPayload, FHIRPatient, FHIREncounter, FHIRObservation } from '../types';

/**
 * FHIR Data Mapper
 * 
 * Transforms Redox webhook data into FHIR R4 bundles for CQL rule execution.
 * Handles mapping of PatientAdmin, Results, and Orders events to appropriate FHIR resources.
 * 
 * Features:
 * - Map Redox PatientAdmin events to FHIR Patient/Encounter resources
 * - Map Results events to FHIR Observation resources
 * - Map Orders to FHIR MedicationRequest/ServiceRequest resources
 * - Handle cardiac-specific lab results (BNP, troponin, K+, creatinine, INR)
 * - Handle ECG findings and echo measurements
 * - Generate valid FHIR Bundle with proper resource references
 */

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  meta?: {
    lastUpdated: string;
    profile?: string[];
  };
  type: 'collection' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset';
  timestamp?: string;
  total?: number;
  entry: Array<{
    fullUrl?: string;
    resource: any;
    search?: {
      mode: 'match' | 'include' | 'outcome';
      score?: number;
    };
  }>;
}

export interface MappingContext {
  /** Source Redox data model */
  sourceDataModel: string;
  /** Source event type */
  sourceEventType: string;
  /** Facility/organization context */
  facilityCode?: string;
  /** Additional mapping options */
  options?: {
    /** Include raw Redox data in extensions */
    includeSourceData?: boolean;
    /** Generate placeholder resources for missing data */
    generatePlaceholders?: boolean;
    /** Validation level */
    validationLevel?: 'strict' | 'lenient' | 'none';
  };
}

export interface MappingResult {
  /** Generated FHIR bundle */
  bundle: FHIRBundle;
  /** Mapping summary */
  summary: {
    /** Resources created by type */
    resourcesCreated: Record<string, number>;
    /** Total processing time */
    processingTimeMs: number;
    /** Warnings encountered */
    warnings: string[];
    /** Errors encountered (non-fatal) */
    errors: string[];
  };
}

export class FHIRDataMapper {
  
  /**
   * Map a Redox webhook payload to a FHIR bundle
   */
  async mapRedoxToFHIR(payload: RedoxWebhookPayload, context: MappingContext): Promise<MappingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const resourcesCreated: Record<string, number> = {};

    try {
      logger.debug('Starting Redox to FHIR mapping', {
        dataModel: context.sourceDataModel,
        eventType: context.sourceEventType,
        facilityCode: context.facilityCode
      });

      // Generate bundle ID
      const bundleId = this.generateBundleId(payload, context);
      
      // Initialize FHIR bundle
      const bundle: FHIRBundle = {
        resourceType: 'Bundle',
        id: bundleId,
        meta: {
          lastUpdated: new Date().toISOString(),
          profile: ['http://hl7.org/fhir/StructureDefinition/Bundle']
        },
        type: 'collection',
        timestamp: payload.EventDateTime || new Date().toISOString(),
        entry: []
      };

      // Map based on data model
      switch (context.sourceDataModel) {
        case 'PatientAdmin':
          await this.mapPatientAdmin(payload, bundle, context, warnings, errors, resourcesCreated);
          break;
        
        case 'Results':
          await this.mapResults(payload, bundle, context, warnings, errors, resourcesCreated);
          break;
        
        case 'Orders':
          await this.mapOrders(payload, bundle, context, warnings, errors, resourcesCreated);
          break;
        
        default:
          warnings.push(`Unsupported data model: ${context.sourceDataModel}`);
      }

      // Set bundle total
      bundle.total = bundle.entry.length;

      const processingTime = Date.now() - startTime;
      
      logger.debug('Redox to FHIR mapping completed', {
        bundleId,
        resourceCount: bundle.entry.length,
        processingTimeMs: processingTime,
        warnings: warnings.length,
        errors: errors.length
      });

      return {
        bundle,
        summary: {
          resourcesCreated,
          processingTimeMs: processingTime,
          warnings,
          errors
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Redox to FHIR mapping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dataModel: context.sourceDataModel,
        processingTimeMs: processingTime
      });

      throw new Error(`FHIR mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private mapping methods for different data models

  private async mapPatientAdmin(
    payload: RedoxWebhookPayload,
    bundle: FHIRBundle,
    context: MappingContext,
    warnings: string[],
    errors: string[],
    resourcesCreated: Record<string, number>
  ): Promise<void> {
    // Map Patient resource
    if (payload.Patient) {
      try {
        const patientResource = this.mapPatientResource(payload.Patient, context);
        this.addResourceToBundle(bundle, patientResource, 'Patient');
        this.incrementResourceCount(resourcesCreated, 'Patient');
      } catch (error) {
        errors.push(`Failed to map Patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Map Encounter/Visit resource
    if (payload.Visit) {
      try {
        const encounterResource = this.mapEncounterResource(
          payload.Visit, 
          payload.Patient?.id, 
          context
        );
        this.addResourceToBundle(bundle, encounterResource, 'Encounter');
        this.incrementResourceCount(resourcesCreated, 'Encounter');
      } catch (error) {
        errors.push(`Failed to map Encounter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async mapResults(
    payload: RedoxWebhookPayload,
    bundle: FHIRBundle,
    context: MappingContext,
    warnings: string[],
    errors: string[],
    resourcesCreated: Record<string, number>
  ): Promise<void> {
    // Map Patient if included
    if (payload.Patient) {
      try {
        const patientResource = this.mapPatientResource(payload.Patient, context);
        this.addResourceToBundle(bundle, patientResource, 'Patient');
        this.incrementResourceCount(resourcesCreated, 'Patient');
      } catch (error) {
        warnings.push(`Patient mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Map Results to Observations
    if (payload.Results) {
      for (const result of payload.Results) {
        try {
          const observations = this.mapResultToObservations(result, payload.Patient?.id, context);
          for (const observation of observations) {
            this.addResourceToBundle(bundle, observation, 'Observation');
            this.incrementResourceCount(resourcesCreated, 'Observation');
          }
        } catch (error) {
          errors.push(`Failed to map Result: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Map Orders if included (as DiagnosticReport or ServiceRequest)
    if (payload.Orders) {
      for (const order of payload.Orders) {
        try {
          if (order.Results && order.Results.length > 0) {
            // Map as DiagnosticReport
            const diagnosticReport = this.mapOrderToDiagnosticReport(order, payload.Patient?.id, context);
            this.addResourceToBundle(bundle, diagnosticReport, 'DiagnosticReport');
            this.incrementResourceCount(resourcesCreated, 'DiagnosticReport');
          } else {
            // Map as ServiceRequest
            const serviceRequest = this.mapOrderToServiceRequest(order, payload.Patient?.id, context);
            this.addResourceToBundle(bundle, serviceRequest, 'ServiceRequest');
            this.incrementResourceCount(resourcesCreated, 'ServiceRequest');
          }
        } catch (error) {
          errors.push(`Failed to map Order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  private async mapOrders(
    payload: RedoxWebhookPayload,
    bundle: FHIRBundle,
    context: MappingContext,
    warnings: string[],
    errors: string[],
    resourcesCreated: Record<string, number>
  ): Promise<void> {
    // Map Patient if included
    if (payload.Patient) {
      try {
        const patientResource = this.mapPatientResource(payload.Patient, context);
        this.addResourceToBundle(bundle, patientResource, 'Patient');
        this.incrementResourceCount(resourcesCreated, 'Patient');
      } catch (error) {
        warnings.push(`Patient mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Map Orders
    if (payload.Orders) {
      for (const order of payload.Orders) {
        try {
          if (this.isMedicationOrder(order)) {
            const medicationRequest = this.mapOrderToMedicationRequest(order, payload.Patient?.id, context);
            this.addResourceToBundle(bundle, medicationRequest, 'MedicationRequest');
            this.incrementResourceCount(resourcesCreated, 'MedicationRequest');
          } else {
            const serviceRequest = this.mapOrderToServiceRequest(order, payload.Patient?.id, context);
            this.addResourceToBundle(bundle, serviceRequest, 'ServiceRequest');
            this.incrementResourceCount(resourcesCreated, 'ServiceRequest');
          }
        } catch (error) {
          errors.push(`Failed to map Order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  // Resource mapping methods

  private mapPatientResource(patientData: any, context: MappingContext): FHIRPatient {
    const patient: FHIRPatient = {
      resourceType: 'Patient',
      id: patientData.Identifiers?.[0]?.ID || this.generateResourceId(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: context.facilityCode
      },
      identifier: [],
      active: true,
      name: [],
      telecom: [],
      gender: this.mapGender(patientData.Demographics?.Sex),
      birthDate: this.formatFHIRDate(patientData.Demographics?.DOB),
      address: []
    };

    // Map identifiers
    if (patientData.Identifiers) {
      for (const identifier of patientData.Identifiers) {
        patient.identifier!.push({
          use: identifier.IDType === 'MR' ? 'usual' : 'secondary',
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: identifier.IDType || 'MR',
              display: this.getIdentifierTypeDisplay(identifier.IDType)
            }]
          },
          system: `urn:oid:${context.facilityCode || 'unknown'}.patient.identifier`,
          value: identifier.ID
        });
      }
    }

    // Map name
    if (patientData.Demographics) {
      const demographics = patientData.Demographics;
      patient.name!.push({
        use: 'official',
        family: demographics.LastName,
        given: demographics.FirstName ? [demographics.FirstName] : undefined,
        prefix: demographics.NamePrefix ? [demographics.NamePrefix] : undefined,
        suffix: demographics.NameSuffix ? [demographics.NameSuffix] : undefined
      });
    }

    // Map contact info
    if (patientData.Demographics?.PhoneNumber?.Home) {
      patient.telecom!.push({
        system: 'phone',
        value: patientData.Demographics.PhoneNumber.Home,
        use: 'home'
      });
    }

    if (patientData.Demographics?.EmailAddresses?.length > 0) {
      patient.telecom!.push({
        system: 'email',
        value: patientData.Demographics.EmailAddresses[0],
        use: 'home'
      });
    }

    // Map address
    if (patientData.Demographics?.Address) {
      const address = patientData.Demographics.Address;
      patient.address!.push({
        use: 'home',
        type: 'physical',
        line: [address.StreetAddress].filter(Boolean),
        city: address.City,
        state: address.State,
        postalCode: address.ZIP,
        country: address.Country || 'US'
      });
    }

    return patient;
  }

  private mapEncounterResource(visitData: any, patientId?: string, context?: MappingContext): FHIREncounter {
    return {
      resourceType: 'Encounter',
      id: visitData.VisitNumber || this.generateResourceId(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: context?.facilityCode
      },
      identifier: [{
        use: 'official',
        system: `urn:oid:${context?.facilityCode || 'unknown'}.encounter.identifier`,
        value: visitData.VisitNumber || visitData.AccountNumber
      }],
      status: this.mapEncounterStatus(context?.sourceEventType),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: this.mapPatientClass(visitData.PatientClass),
        display: visitData.PatientClass
      },
      subject: patientId ? {
        reference: `Patient/${patientId}`,
        display: 'Patient'
      } : undefined,
      period: {
        start: this.formatFHIRDateTime(visitData.VisitDateTime),
        end: visitData.DischargeDateTime ? this.formatFHIRDateTime(visitData.DischargeDateTime) : undefined
      },
      location: visitData.Location ? [{
        location: {
          display: `${visitData.Location.Department} - ${visitData.Location.Room || ''} ${visitData.Location.Bed || ''}`.trim()
        },
        status: 'active'
      }] : undefined
    };
  }

  private mapResultToObservations(resultData: any, patientId?: string, context?: MappingContext): FHIRObservation[] {
    const observations: FHIRObservation[] = [];

    // Handle grouped results (like lab panels)
    if (resultData.Results && Array.isArray(resultData.Results)) {
      for (const result of resultData.Results) {
        const observation = this.createObservationFromResult(result, patientId, context, resultData);
        if (observation) {
          observations.push(observation);
        }
      }
    } else {
      // Single result
      const observation = this.createObservationFromResult(resultData, patientId, context);
      if (observation) {
        observations.push(observation);
      }
    }

    return observations;
  }

  private createObservationFromResult(
    result: any, 
    patientId?: string, 
    context?: MappingContext,
    parentResult?: any
  ): FHIRObservation | null {
    try {
      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: this.generateResourceId(),
        meta: {
          lastUpdated: new Date().toISOString(),
          source: context?.facilityCode
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: this.inferObservationCategory(result),
            display: this.getObservationCategoryDisplay(result)
          }]
        }],
        code: {
          coding: [{
            system: result.Codeset || 'http://loinc.org',
            code: result.Code,
            display: result.Description || result.Value
          }],
          text: result.Description
        },
        subject: patientId ? {
          reference: `Patient/${patientId}`,
          display: 'Patient'
        } : undefined,
        effectiveDateTime: this.formatFHIRDateTime(result.ObservationDateTime || parentResult?.CollectionDateTime),
        issued: this.formatFHIRDateTime(result.CompletionDateTime || parentResult?.CompletionDateTime)
      };

      // Map value based on type
      if (result.Value !== undefined && result.Value !== null && result.Value !== '') {
        this.mapObservationValue(observation, result);
      }

      // Add reference ranges
      if (result.ReferenceRange) {
        this.mapReferenceRange(observation, result.ReferenceRange);
      }

      // Add interpretation (normal, high, low, etc.)
      if (result.AbnormalFlag || result.Flag) {
        this.mapInterpretation(observation, result.AbnormalFlag || result.Flag);
      }

      // Add performer if available
      if (parentResult?.Provider) {
        observation.performer = [{
          display: parentResult.Provider.Name
        }];
      }

      return observation;

    } catch (error) {
      logger.error('Failed to create observation from result', {
        error: error instanceof Error ? error.message : 'Unknown error',
        result: result?.Code || 'unknown'
      });
      return null;
    }
  }

  private mapOrderToServiceRequest(orderData: any, patientId?: string, context?: MappingContext): any {
    return {
      resourceType: 'ServiceRequest',
      id: orderData.ID || this.generateResourceId(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: context?.facilityCode
      },
      identifier: [{
        use: 'official',
        system: `urn:oid:${context?.facilityCode || 'unknown'}.order.identifier`,
        value: orderData.ID
      }],
      status: this.mapOrderStatus(context?.sourceEventType),
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '103693007',
          display: 'Diagnostic procedure'
        }]
      }],
      code: {
        coding: [{
          system: orderData.Procedure?.Codeset || 'http://loinc.org',
          code: orderData.Procedure?.Code,
          display: orderData.Procedure?.Description
        }],
        text: orderData.Procedure?.Description
      },
      subject: patientId ? {
        reference: `Patient/${patientId}`,
        display: 'Patient'
      } : undefined,
      occurrenceDateTime: this.formatFHIRDateTime(orderData.TransactionDateTime),
      authoredOn: this.formatFHIRDateTime(orderData.TransactionDateTime),
      requester: orderData.Provider ? {
        display: orderData.Provider.Name
      } : undefined
    };
  }

  private mapOrderToMedicationRequest(orderData: any, patientId?: string, context?: MappingContext): any {
    return {
      resourceType: 'MedicationRequest',
      id: orderData.ID || this.generateResourceId(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: context?.facilityCode
      },
      identifier: [{
        use: 'official',
        system: `urn:oid:${context?.facilityCode || 'unknown'}.medication.identifier`,
        value: orderData.ID
      }],
      status: this.mapMedicationRequestStatus(context?.sourceEventType),
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{
          system: orderData.Procedure?.Codeset || 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: orderData.Procedure?.Code,
          display: orderData.Procedure?.Description
        }],
        text: orderData.Procedure?.Description
      },
      subject: patientId ? {
        reference: `Patient/${patientId}`,
        display: 'Patient'
      } : undefined,
      authoredOn: this.formatFHIRDateTime(orderData.TransactionDateTime),
      requester: orderData.Provider ? {
        display: orderData.Provider.Name
      } : undefined
    };
  }

  private mapOrderToDiagnosticReport(orderData: any, patientId?: string, context?: MappingContext): any {
    return {
      resourceType: 'DiagnosticReport',
      id: orderData.ID || this.generateResourceId(),
      meta: {
        lastUpdated: new Date().toISOString(),
        source: context?.facilityCode
      },
      identifier: [{
        use: 'official',
        system: `urn:oid:${context?.facilityCode || 'unknown'}.report.identifier`,
        value: orderData.ID
      }],
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'LAB',
          display: 'Laboratory'
        }]
      }],
      code: {
        coding: [{
          system: orderData.Procedure?.Codeset || 'http://loinc.org',
          code: orderData.Procedure?.Code,
          display: orderData.Procedure?.Description
        }],
        text: orderData.Procedure?.Description
      },
      subject: patientId ? {
        reference: `Patient/${patientId}`,
        display: 'Patient'
      } : undefined,
      effectiveDateTime: this.formatFHIRDateTime(orderData.CollectionDateTime),
      issued: this.formatFHIRDateTime(orderData.CompletionDateTime)
    };
  }

  // Helper methods

  private generateBundleId(payload: RedoxWebhookPayload, context: MappingContext): string {
    const timestamp = Date.now();
    const patientId = payload.Patient?.id || 'unknown';
    return `bundle-${context.sourceDataModel}-${context.sourceEventType}-${patientId}-${timestamp}`;
  }

  private generateResourceId(): string {
    return `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addResourceToBundle(bundle: FHIRBundle, resource: any, resourceType: string): void {
    bundle.entry.push({
      fullUrl: `urn:uuid:${resource.id}`,
      resource
    });
  }

  private incrementResourceCount(counts: Record<string, number>, resourceType: string): void {
    counts[resourceType] = (counts[resourceType] || 0) + 1;
  }

  private mapGender(sex?: string): 'male' | 'female' | 'other' | 'unknown' {
    if (!sex) return 'unknown';
    
    switch (sex.toLowerCase()) {
      case 'm':
      case 'male':
        return 'male';
      case 'f':
      case 'female':
        return 'female';
      case 'o':
      case 'other':
        return 'other';
      default:
        return 'unknown';
    }
  }

  private formatFHIRDate(dateString?: string): string | undefined {
    if (!dateString) return undefined;
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
      return undefined;
    }
  }

  private formatFHIRDateTime(dateString?: string): string | undefined {
    if (!dateString) return undefined;
    
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  private mapEncounterStatus(eventType?: string): 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' {
    switch (eventType) {
      case 'Admission':
      case 'NewPatient':
        return 'in-progress';
      case 'Discharge':
        return 'finished';
      case 'Cancel':
        return 'cancelled';
      default:
        return 'in-progress';
    }
  }

  private mapPatientClass(patientClass?: string): string {
    switch (patientClass?.toLowerCase()) {
      case 'inpatient':
        return 'IMP';
      case 'outpatient':
        return 'AMB';
      case 'emergency':
        return 'EMER';
      case 'observation':
        return 'OBSENC';
      default:
        return 'AMB';
    }
  }

  private inferObservationCategory(result: any): string {
    const description = (result.Description || '').toLowerCase();
    
    if (description.includes('lab') || description.includes('blood') || description.includes('serum')) {
      return 'laboratory';
    }
    
    if (description.includes('vital') || description.includes('blood pressure') || description.includes('temperature')) {
      return 'vital-signs';
    }
    
    if (description.includes('ecg') || description.includes('ekg') || description.includes('echo')) {
      return 'procedure';
    }
    
    return 'laboratory';
  }

  private getObservationCategoryDisplay(result: any): string {
    const category = this.inferObservationCategory(result);
    switch (category) {
      case 'laboratory':
        return 'Laboratory';
      case 'vital-signs':
        return 'Vital Signs';
      case 'procedure':
        return 'Procedure';
      default:
        return 'Laboratory';
    }
  }

  private mapObservationValue(observation: FHIRObservation, result: any): void {
    const value = result.Value;
    const units = result.Units;
    
    // Try to parse as numeric first
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && isFinite(numericValue)) {
      observation.valueQuantity = {
        value: numericValue,
        unit: units,
        system: 'http://unitsofmeasure.org',
        code: this.mapUnitsToUCUM(units)
      };
    } else {
      // Handle as text/coded value
      observation.valueString = value;
      
      // Try to map common coded values
      const codedValue = this.mapCodedValue(value);
      if (codedValue) {
        observation.valueCodeableConcept = codedValue;
      }
    }
  }

  private mapUnitsToUCUM(units?: string): string | undefined {
    if (!units) return undefined;
    
    const unitsMap: Record<string, string> = {
      'mg/dL': 'mg/dL',
      'mg/L': 'mg/L',
      'pg/mL': 'pg/mL',
      'ng/mL': 'ng/mL',
      'mEq/L': 'meq/L',
      'mmol/L': 'mmol/L',
      'IU/L': '[IU]/L',
      '%': '%'
    };
    
    return unitsMap[units] || units;
  }

  private mapCodedValue(value: string): any {
    const valueLower = value.toLowerCase().trim();
    
    // Common lab result values
    if (['positive', 'neg', 'negative', 'pos'].includes(valueLower)) {
      return {
        coding: [{
          system: 'http://snomed.info/sct',
          code: valueLower === 'positive' || valueLower === 'pos' ? '10828004' : '260385009',
          display: valueLower === 'positive' || valueLower === 'pos' ? 'Positive' : 'Negative'
        }]
      };
    }
    
    if (['normal', 'abnormal', 'critical'].includes(valueLower)) {
      return {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: valueLower === 'normal' ? 'N' : valueLower === 'abnormal' ? 'A' : 'AA',
          display: valueLower === 'normal' ? 'Normal' : valueLower === 'abnormal' ? 'Abnormal' : 'Critical abnormal'
        }]
      };
    }
    
    return null;
  }

  private mapReferenceRange(observation: FHIRObservation, referenceRange: any): void {
    if (typeof referenceRange === 'string') {
      // Parse string like "0.0-0.04 ng/mL"
      const rangeMatch = referenceRange.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(.*)$/);
      if (rangeMatch) {
        observation.referenceRange = [{
          low: {
            value: parseFloat(rangeMatch[1]),
            unit: rangeMatch[3].trim(),
            system: 'http://unitsofmeasure.org'
          },
          high: {
            value: parseFloat(rangeMatch[2]),
            unit: rangeMatch[3].trim(),
            system: 'http://unitsofmeasure.org'
          }
        }];
      }
    }
  }

  private mapInterpretation(observation: FHIRObservation, flag: string): void {
    const flagLower = flag.toLowerCase();
    let code = 'N';
    let display = 'Normal';
    
    if (['h', 'high', 'elevated'].includes(flagLower)) {
      code = 'H';
      display = 'High';
    } else if (['l', 'low', 'decreased'].includes(flagLower)) {
      code = 'L';
      display = 'Low';
    } else if (['critical', 'panic'].includes(flagLower)) {
      code = 'AA';
      display = 'Critical abnormal';
    } else if (['abnormal', 'a'].includes(flagLower)) {
      code = 'A';
      display = 'Abnormal';
    }
    
    observation.interpretation = [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        code,
        display
      }]
    }];
  }

  private getIdentifierTypeDisplay(idType?: string): string {
    const typeMap: Record<string, string> = {
      'MR': 'Medical Record Number',
      'PI': 'Patient Internal Identifier',
      'PT': 'Patient External Identifier',
      'AN': 'Account Number',
      'VN': 'Visit Number'
    };
    
    return typeMap[idType || 'MR'] || 'Medical Record Number';
  }

  private isMedicationOrder(order: any): boolean {
    const description = (order.Procedure?.Description || '').toLowerCase();
    const code = order.Procedure?.Code || '';
    
    // Common medication-related keywords or codes
    const medicationKeywords = [
      'tablet', 'capsule', 'mg', 'ml', 'dose', 'prescription', 'medication',
      'lisinopril', 'metoprolol', 'atorvastatin', 'furosemide', 'warfarin'
    ];
    
    return medicationKeywords.some(keyword => description.includes(keyword)) ||
           code.startsWith('RXN'); // RxNorm codes
  }

  private mapOrderStatus(eventType?: string): string {
    switch (eventType) {
      case 'New':
        return 'active';
      case 'Cancel':
        return 'cancelled';
      case 'Complete':
        return 'completed';
      default:
        return 'active';
    }
  }

  private mapMedicationRequestStatus(eventType?: string): string {
    switch (eventType) {
      case 'New':
        return 'active';
      case 'Cancel':
        return 'cancelled';
      case 'Complete':
        return 'completed';
      default:
        return 'active';
    }
  }
}

export default FHIRDataMapper;