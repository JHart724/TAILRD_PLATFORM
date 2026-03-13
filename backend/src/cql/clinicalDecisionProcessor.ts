import { logger } from '../utils/logger';
import { AlertService } from '../services/alertService';
import { RedoxWebhookPayload } from '../types';
import { CQLEngine, CQLRuleResult, CQLExecutionOptions } from './cqlEngine';
import { FHIRDataMapper, MappingContext } from './fhirDataMapper';
import { ValuesetResolver } from './valuesetResolver';

/**
 * Clinical Decision Processor
 * 
 * Orchestrates the CQL execution workflow for clinical decision support.
 * Integrates with existing Redox event processing pipeline.
 * 
 * Features:
 * - Processes Redox events → FHIR mapping → CQL execution → alerts
 * - Intelligent rule selection based on patient conditions
 * - Result aggregation and priority scoring
 * - Integration with existing AlertService
 * - Performance monitoring and optimization
 */

export interface ClinicalDecisionContext {
  /** Source event information */
  eventInfo: {
    dataModel: string;
    eventType: string;
    eventDateTime: string;
    facilityCode?: string;
    source?: string;
  };
  /** Patient context */
  patient?: {
    id: string;
    conditions?: string[]; // ICD-10 codes
    visitType?: string;
    location?: {
      department?: string;
      unit?: string;
    };
  };
  /** Provider context */
  provider?: {
    id?: string;
    name?: string;
    specialty?: string;
  };
  /** Processing options */
  options?: {
    /** Force execution of all rules regardless of context */
    forceAllRules?: boolean;
    /** Skip alert generation (evaluation only) */
    evaluationOnly?: boolean;
    /** Maximum execution time (ms) */
    timeoutMs?: number;
    /** Enable debug logging */
    debug?: boolean;
  };
}

export interface ClinicalDecisionResult {
  /** Execution summary */
  summary: {
    /** Total processing time */
    processingTimeMs: number;
    /** Number of rules evaluated */
    rulesEvaluated: number;
    /** Number of alerts generated */
    alertsGenerated: number;
    /** Number of recommendations generated */
    recommendationsGenerated: number;
    /** Number of gaps identified */
    gapsIdentified: number;
    /** Success status */
    success: boolean;
    /** Error messages if any */
    errors: string[];
  };
  /** CQL rule results */
  cqlResults: CQLRuleResult[];
  /** Generated clinical alerts */
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    category: 'cardiac' | 'medication' | 'lab' | 'clinical';
    title: string;
    message: string;
    recommendations: string[];
    sourceRule: string;
  }>;
  /** Clinical recommendations */
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'medication' | 'procedure' | 'followup' | 'lifestyle';
    description: string;
    evidence: string;
    sourceRule: string;
  }>;
  /** Therapy gaps */
  gaps: Array<{
    gapType: 'medication' | 'testing' | 'followup' | 'monitoring';
    description: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    sourceRule: string;
  }>;
  /** Risk scores */
  scores: Array<{
    scoreType: string;
    value: number;
    interpretation: string;
    sourceRule: string;
  }>;
}

export interface RuleSelectionCriteria {
  /** Patient conditions (ICD-10 codes) */
  conditions?: string[];
  /** Encounter type */
  encounterType?: string;
  /** Department/unit */
  department?: string;
  /** Available data types in the patient bundle */
  availableDataTypes: string[];
  /** Force include specific rules */
  includeRules?: string[];
  /** Force exclude specific rules */
  excludeRules?: string[];
}

export class ClinicalDecisionProcessor {
  private cqlEngine: CQLEngine;
  private fhirMapper: FHIRDataMapper;
  private valuesetResolver: ValuesetResolver;
  private alertService: AlertService;

  constructor() {
    this.cqlEngine = new CQLEngine();
    this.fhirMapper = new FHIRDataMapper();
    this.valuesetResolver = new ValuesetResolver();
    this.alertService = new AlertService();
  }

  /**
   * Initialize the clinical decision processor
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing clinical decision processor');
      
      // Initialize valueset resolver
      await this.valuesetResolver.initialize();
      
      logger.info('Clinical decision processor initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize clinical decision processor', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Clinical decision processor initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a Redox webhook event through the complete CQL workflow
   */
  async processRedoxEvent(
    payload: RedoxWebhookPayload,
    context: ClinicalDecisionContext
  ): Promise<ClinicalDecisionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      logger.info('Starting clinical decision processing', {
        dataModel: context.eventInfo.dataModel,
        eventType: context.eventInfo.eventType,
        facilityCode: context.eventInfo.facilityCode,
        patientId: context.patient?.id
      });

      // Step 1: Map Redox data to FHIR bundle
      const mappingContext: MappingContext = {
        sourceDataModel: context.eventInfo.dataModel,
        sourceEventType: context.eventInfo.eventType,
        facilityCode: context.eventInfo.facilityCode,
        options: {
          includeSourceData: context.options?.debug,
          generatePlaceholders: true,
          validationLevel: 'lenient'
        }
      };

      const mappingResult = await this.fhirMapper.mapRedoxToFHIR(payload, mappingContext);
      
      if (mappingResult.summary.errors.length > 0) {
        errors.push(...mappingResult.summary.errors);
      }

      // Step 2: Select applicable CQL rules
      const selectionCriteria = this.buildRuleSelectionCriteria(
        mappingResult.bundle,
        context
      );

      const applicableRules = this.selectApplicableRules(selectionCriteria);
      
      logger.debug('Selected CQL rules for evaluation', {
        totalRules: applicableRules.length,
        ruleIds: applicableRules.map(r => r.id),
        patientId: context.patient?.id
      });

      // Step 3: Execute CQL rules
      const executionOptions: CQLExecutionOptions = {
        ruleIds: applicableRules.map(r => r.id),
        context: {
          conditions: context.patient?.conditions,
          encounterType: context.patient?.visitType,
          facilityCode: context.eventInfo.facilityCode,
          provider: context.provider?.name
        },
        debug: context.options?.debug,
        timeoutMs: context.options?.timeoutMs || 30000,
        enableCaching: true
      };

      const cqlExecution = await this.cqlEngine.executeRules(
        mappingResult.bundle,
        executionOptions
      );

      if (cqlExecution.summary.errors.length > 0) {
        errors.push(...cqlExecution.summary.errors.map(e => e.error));
      }

      // Step 4: Process and prioritize results
      const processedResults = await this.processRuleResults(
        cqlExecution.results,
        context
      );

      // Step 5: Generate alerts (if not evaluation-only mode)
      if (!context.options?.evaluationOnly) {
        await this.generateClinicalAlerts(processedResults, context);
      }

      const processingTime = Date.now() - startTime;

      const result: ClinicalDecisionResult = {
        summary: {
          processingTimeMs: processingTime,
          rulesEvaluated: cqlExecution.summary.totalRules,
          alertsGenerated: processedResults.alerts.length,
          recommendationsGenerated: processedResults.recommendations.length,
          gapsIdentified: processedResults.gaps.length,
          success: errors.length === 0,
          errors
        },
        cqlResults: cqlExecution.results,
        alerts: processedResults.alerts,
        recommendations: processedResults.recommendations,
        gaps: processedResults.gaps,
        scores: processedResults.scores
      };

      logger.info('Clinical decision processing completed', {
        patientId: context.patient?.id,
        processingTimeMs: processingTime,
        rulesEvaluated: result.summary.rulesEvaluated,
        alertsGenerated: result.summary.alertsGenerated,
        success: result.summary.success
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Clinical decision processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: context.patient?.id,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Return error result
      return {
        summary: {
          processingTimeMs: processingTime,
          rulesEvaluated: 0,
          alertsGenerated: 0,
          recommendationsGenerated: 0,
          gapsIdentified: 0,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        },
        cqlResults: [],
        alerts: [],
        recommendations: [],
        gaps: [],
        scores: []
      };
    }
  }

  /**
   * Manually evaluate CQL rules against a patient bundle
   */
  async evaluatePatientBundle(
    patientBundle: any,
    options: {
      ruleIds?: string[];
      conditions?: string[];
      debug?: boolean;
    } = {}
  ): Promise<ClinicalDecisionResult> {
    const context: ClinicalDecisionContext = {
      eventInfo: {
        dataModel: 'Manual',
        eventType: 'Evaluation',
        eventDateTime: new Date().toISOString()
      },
      patient: {
        id: this.extractPatientId(patientBundle),
        conditions: options.conditions
      },
      options: {
        evaluationOnly: true,
        debug: options.debug
      }
    };

    // Create a mock payload for processing
    const mockPayload: RedoxWebhookPayload = {
      EventType: 'Evaluation',
      EventDateTime: new Date().toISOString(),
      Test: false,
      Source: { Name: 'Manual Evaluation' },
      Destinations: []
    };

    return this.processRedoxEvent(mockPayload, context);
  }

  /**
   * Get rule selection recommendations for a patient
   */
  async getRecommendedRules(
    patientBundle: any,
    encounterType?: string
  ): Promise<Array<{
    ruleId: string;
    libraryName: string;
    description: string;
    module: string;
    priority: string;
    applicabilityReason: string;
  }>> {
    const criteria = this.buildRuleSelectionCriteria(patientBundle, {
      eventInfo: {
        dataModel: 'PatientAdmin',
        eventType: 'Admission',
        eventDateTime: new Date().toISOString()
      },
      patient: {
        id: this.extractPatientId(patientBundle),
        visitType: encounterType
      }
    });

    const applicableRules = this.selectApplicableRules(criteria);

    return applicableRules.map(rule => ({
      ruleId: rule.id,
      libraryName: rule.libraryName,
      description: rule.description,
      module: rule.module,
      priority: rule.metadata.priority,
      applicabilityReason: this.getApplicabilityReason(rule, criteria)
    }));
  }

  // Private helper methods

  private buildRuleSelectionCriteria(
    fhirBundle: any,
    context: ClinicalDecisionContext
  ): RuleSelectionCriteria {
    // Extract available FHIR resource types
    const availableDataTypes = new Set<string>();
    if (fhirBundle.entry) {
      for (const entry of fhirBundle.entry) {
        if (entry.resource?.resourceType) {
          availableDataTypes.add(entry.resource.resourceType);
        }
      }
    }

    // Extract patient conditions from the bundle
    const conditions = new Set<string>();
    if (context.patient?.conditions) {
      context.patient.conditions.forEach(c => conditions.add(c));
    }

    // Extract conditions from FHIR Condition resources
    if (fhirBundle.entry) {
      for (const entry of fhirBundle.entry) {
        if (entry.resource?.resourceType === 'Condition') {
          const coding = entry.resource.code?.coding?.[0];
          if (coding?.code) {
            conditions.add(coding.code);
          }
        }
      }
    }

    return {
      conditions: Array.from(conditions),
      encounterType: context.patient?.visitType,
      department: context.patient?.location?.department,
      availableDataTypes: Array.from(availableDataTypes),
      includeRules: context.options?.forceAllRules ? undefined : [],
      excludeRules: []
    };
  }

  private selectApplicableRules(criteria: RuleSelectionCriteria): any[] {
    const loadedRules = this.cqlEngine.getLoadedRules();
    
    if (criteria.includeRules && criteria.includeRules.length > 0) {
      return loadedRules.filter(rule => criteria.includeRules!.includes(rule.id));
    }

    return loadedRules.filter(rule => {
      // Skip excluded rules
      if (criteria.excludeRules?.includes(rule.id)) {
        return false;
      }

      // Check data requirements
      const hasRequiredData = rule.metadata.dataRequirements.every(dataType =>
        criteria.availableDataTypes.includes(dataType)
      );

      if (!hasRequiredData) {
        return false;
      }

      // Check condition applicability
      if (rule.metadata.conditions.length > 0 && criteria.conditions) {
        const hasMatchingCondition = rule.metadata.conditions.some(ruleCondition =>
          criteria.conditions!.some(patientCondition =>
            this.conditionsMatch(ruleCondition, patientCondition)
          )
        );

        if (!hasMatchingCondition) {
          return false;
        }
      }

      // Department/encounter type specific rules
      if (criteria.encounterType || criteria.department) {
        const isRelevantForContext = this.isRuleRelevantForContext(
          rule,
          criteria.encounterType,
          criteria.department
        );

        if (!isRelevantForContext) {
          return false;
        }
      }

      return true;
    });
  }

  private async processRuleResults(
    cqlResults: CQLRuleResult[],
    context: ClinicalDecisionContext
  ): Promise<{
    alerts: ClinicalDecisionResult['alerts'];
    recommendations: ClinicalDecisionResult['recommendations'];
    gaps: ClinicalDecisionResult['gaps'];
    scores: ClinicalDecisionResult['scores'];
  }> {
    const alerts: ClinicalDecisionResult['alerts'] = [];
    const recommendations: ClinicalDecisionResult['recommendations'] = [];
    const gaps: ClinicalDecisionResult['gaps'] = [];
    const scores: ClinicalDecisionResult['scores'] = [];

    for (const result of cqlResults) {
      switch (result.type) {
        case 'Alert':
          alerts.push({
            type: this.mapAlertType(result.priority),
            category: this.mapAlertCategory(result.libraryName),
            title: result.title,
            message: result.description,
            recommendations: result.recommendations || [],
            sourceRule: result.ruleId
          });
          break;

        case 'Recommendation':
          recommendations.push({
            priority: this.mapRecommendationPriority(result.priority),
            category: this.mapRecommendationCategory(result.libraryName),
            description: result.description,
            evidence: result.evidence || `Based on ${result.libraryName}`,
            sourceRule: result.ruleId
          });
          break;

        case 'Gap':
          gaps.push({
            gapType: this.mapGapType(result.libraryName),
            description: result.description,
            recommendation: result.recommendations?.[0] || 'Review clinical guidelines',
            priority: this.mapGapPriority(result.priority),
            sourceRule: result.ruleId
          });
          break;

        case 'Score':
          scores.push({
            scoreType: this.extractScoreType(result.libraryName),
            value: result.score || 0,
            interpretation: this.interpretScore(result.score || 0, result.libraryName),
            sourceRule: result.ruleId
          });
          break;
      }
    }

    // Sort by priority
    alerts.sort((a, b) => this.getAlertPriorityWeight(a.type) - this.getAlertPriorityWeight(b.type));
    recommendations.sort((a, b) => this.getRecommendationPriorityWeight(a.priority) - this.getRecommendationPriorityWeight(b.priority));
    gaps.sort((a, b) => this.getGapPriorityWeight(a.priority) - this.getGapPriorityWeight(b.priority));

    return { alerts, recommendations, gaps, scores };
  }

  private async generateClinicalAlerts(
    processedResults: {
      alerts: ClinicalDecisionResult['alerts'];
      recommendations: ClinicalDecisionResult['recommendations'];
      gaps: ClinicalDecisionResult['gaps'];
    },
    context: ClinicalDecisionContext
  ): Promise<void> {
    // Convert critical and warning alerts to TAILRD alerts
    const criticalAlerts = processedResults.alerts.filter(alert => 
      alert.type === 'critical' || alert.type === 'warning'
    );

    if (criticalAlerts.length === 0) return;

    try {
      for (const alert of criticalAlerts) {
        await this.alertService.checkCardiovascularAlerts({
          patientId: context.patient?.id || 'unknown',
          eventType: `CQL_${alert.category.toUpperCase()}`,
          patientClass: context.patient?.visitType || 'Outpatient',
          location: {
            FacilityCode: context.eventInfo.facilityCode || 'unknown',
            Department: context.patient?.location?.department || 'CQL_ENGINE'
          }
        });
      }

      logger.info('Clinical alerts generated', {
        patientId: context.patient?.id,
        alertCount: criticalAlerts.length
      });

    } catch (error) {
      logger.error('Failed to generate clinical alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: context.patient?.id,
        alertCount: criticalAlerts.length
      });
    }
  }

  // Helper methods for mapping and prioritization

  private extractPatientId(patientBundle: any): string {
    const patient = patientBundle.entry?.find((entry: any) => 
      entry.resource?.resourceType === 'Patient'
    )?.resource;
    
    return patient?.id || 'unknown';
  }

  private conditionsMatch(ruleCondition: string, patientCondition: string): boolean {
    // Exact match
    if (ruleCondition === patientCondition) return true;

    // ICD-10 hierarchy matching (e.g., I50 matches I50.9)
    if (patientCondition.startsWith(ruleCondition) || ruleCondition.startsWith(patientCondition)) {
      return true;
    }

    return false;
  }

  private isRuleRelevantForContext(rule: any, encounterType?: string, department?: string): boolean {
    const ruleName = rule.libraryName.toLowerCase();
    const ruleDescription = rule.description.toLowerCase();

    // Check encounter type relevance
    if (encounterType) {
      const encounterLower = encounterType.toLowerCase();
      
      if (encounterLower.includes('emergency') && 
          (ruleName.includes('emergency') || ruleDescription.includes('emergency'))) {
        return true;
      }
      
      if (encounterLower.includes('inpatient') && 
          (ruleName.includes('inpatient') || ruleDescription.includes('inpatient'))) {
        return true;
      }
    }

    // Check department relevance
    if (department) {
      const deptLower = department.toLowerCase();
      
      if (deptLower.includes('cardiology') && 
          (ruleName.includes('cardiac') || ruleName.includes('heart'))) {
        return true;
      }
      
      if (deptLower.includes('icu') && 
          (ruleName.includes('critical') || ruleDescription.includes('intensive'))) {
        return true;
      }
    }

    // Default: rule is relevant
    return true;
  }

  private getApplicabilityReason(rule: any, criteria: RuleSelectionCriteria): string {
    const reasons: string[] = [];

    if (rule.metadata.conditions.length > 0 && criteria.conditions) {
      const matchingConditions = rule.metadata.conditions.filter((ruleCondition: string) =>
        criteria.conditions!.some(patientCondition =>
          this.conditionsMatch(ruleCondition, patientCondition)
        )
      );

      if (matchingConditions.length > 0) {
        reasons.push(`Matches conditions: ${matchingConditions.join(', ')}`);
      }
    }

    if (rule.metadata.dataRequirements.length > 0) {
      const availableData = rule.metadata.dataRequirements.filter((dataType: string) =>
        criteria.availableDataTypes.includes(dataType)
      );

      if (availableData.length > 0) {
        reasons.push(`Has required data: ${availableData.join(', ')}`);
      }
    }

    if (reasons.length === 0) {
      reasons.push('General applicability');
    }

    return reasons.join('; ');
  }

  // Mapping helper methods

  private mapAlertType(priority: string): 'critical' | 'warning' | 'info' {
    switch (priority) {
      case 'critical': return 'critical';
      case 'high': return 'warning';
      default: return 'info';
    }
  }

  private mapAlertCategory(libraryName: string): 'cardiac' | 'medication' | 'lab' | 'clinical' {
    const name = libraryName.toLowerCase();
    if (name.includes('medication') || name.includes('drug')) return 'medication';
    if (name.includes('lab') || name.includes('result')) return 'lab';
    if (name.includes('cardiac') || name.includes('heart')) return 'cardiac';
    return 'clinical';
  }

  private mapRecommendationPriority(priority: string): 'high' | 'medium' | 'low' {
    switch (priority) {
      case 'critical':
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapRecommendationCategory(libraryName: string): 'medication' | 'procedure' | 'followup' | 'lifestyle' {
    const name = libraryName.toLowerCase();
    if (name.includes('medication') || name.includes('drug') || name.includes('gdmt')) return 'medication';
    if (name.includes('procedure') || name.includes('test') || name.includes('imaging')) return 'procedure';
    if (name.includes('followup') || name.includes('appointment')) return 'followup';
    return 'lifestyle';
  }

  private mapGapType(libraryName: string): 'medication' | 'testing' | 'followup' | 'monitoring' {
    const name = libraryName.toLowerCase();
    if (name.includes('medication') || name.includes('gdmt')) return 'medication';
    if (name.includes('test') || name.includes('lab')) return 'testing';
    if (name.includes('followup') || name.includes('appointment')) return 'followup';
    return 'monitoring';
  }

  private mapGapPriority(priority: string): 'high' | 'medium' | 'low' {
    return this.mapRecommendationPriority(priority);
  }

  private extractScoreType(libraryName: string): string {
    const name = libraryName.toLowerCase();
    if (name.includes('readmission')) return 'Readmission Risk';
    if (name.includes('mortality')) return 'Mortality Risk';
    if (name.includes('gdmt')) return 'GDMT Compliance';
    if (name.includes('quality')) return 'Quality Score';
    return 'Clinical Score';
  }

  private interpretScore(score: number, libraryName: string): string {
    const name = libraryName.toLowerCase();
    
    if (name.includes('risk')) {
      if (score >= 80) return 'High Risk';
      if (score >= 50) return 'Moderate Risk';
      return 'Low Risk';
    }
    
    if (name.includes('compliance') || name.includes('quality')) {
      if (score >= 90) return 'Excellent';
      if (score >= 80) return 'Good';
      if (score >= 70) return 'Fair';
      return 'Poor';
    }
    
    return score >= 70 ? 'Above Average' : score >= 50 ? 'Average' : 'Below Average';
  }

  private getAlertPriorityWeight(type: string): number {
    switch (type) {
      case 'critical': return 1;
      case 'warning': return 2;
      case 'info': return 3;
      default: return 4;
    }
  }

  private getRecommendationPriorityWeight(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 4;
    }
  }

  private getGapPriorityWeight(priority: string): number {
    return this.getRecommendationPriorityWeight(priority);
  }
}

export default ClinicalDecisionProcessor;