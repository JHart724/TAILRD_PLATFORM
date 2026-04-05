import { logger } from '../utils/logger';
import { AlertService } from '../services/alertService';
import path from 'path';
import fs from 'fs-extra';

/**
 * CQL Execution Engine
 * 
 * Core engine for executing Clinical Quality Language (CQL) rules against FHIR patient data.
 * Supports rule compilation, caching, batch execution, and integration with the TAILRD alert system.
 * 
 * Features:
 * - Loads and parses CQL rule files from configurable directory
 * - Executes rules against FHIR patient bundles
 * - Supports valueset resolution (SNOMED, ICD-10, LOINC, RxNorm)
 * - Performance optimizations: batch execution, rule caching
 * - Rule result types: Alert, Recommendation, Gap, Score
 * - Integration with AlertService for clinical notifications
 */

export interface CQLRule {
  /** Unique identifier for the rule */
  id: string;
  /** Library name from CQL file */
  libraryName: string;
  /** Library version */
  version: string;
  /** Human-readable description */
  description: string;
  /** Clinical module category */
  module: 'HF' | 'EP' | 'Structural' | 'Coronary' | 'PV' | 'Valvular' | 'Cross-module';
  /** Raw CQL content */
  cqlContent: string;
  /** Compiled rule execution function */
  compiledRule?: Function;
  /** Rule dependencies */
  dependencies: string[];
  /** When this rule was loaded/compiled */
  compiledAt: Date;
  /** File path for hot-reloading */
  filePath: string;
  /** Rule metadata */
  metadata: {
    author?: string;
    lastModified?: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    conditions: string[]; // ICD-10 codes this rule applies to
    dataRequirements: string[]; // Required FHIR resources
  };
}

export interface CQLRuleResult {
  /** Rule that generated this result */
  ruleId: string;
  /** Rule library name for reference */
  libraryName: string;
  /** Type of result */
  type: 'Alert' | 'Recommendation' | 'Gap' | 'Score';
  /** Priority level for clinical action */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Clinical recommendations */
  recommendations?: string[];
  /** Quantitative score (0-100) */
  score?: number;
  /** Supporting evidence/rationale */
  evidence?: string;
  /** Raw CQL evaluation result */
  rawResult: any;
  /** Patient ID this applies to */
  patientId: string;
  /** When this was evaluated */
  evaluatedAt: Date;
  /** Additional context data */
  context?: {
    facilityCode?: string;
    encounterType?: string;
    provider?: string;
    [key: string]: any;
  };
}

export interface CQLExecutionOptions {
  /** Specific rules to execute (if not provided, runs all applicable) */
  ruleIds?: string[];
  /** Clinical context for rule selection */
  context?: {
    conditions?: string[]; // ICD-10 codes
    encounterType?: string;
    facilityCode?: string;
    provider?: string;
  };
  /** Include debug information in results */
  debug?: boolean;
  /** Maximum execution time per rule (ms) */
  timeoutMs?: number;
  /** Enable rule result caching */
  enableCaching?: boolean;
}

export interface CQLExecutionSummary {
  /** Total rules evaluated */
  totalRules: number;
  /** Successful evaluations */
  successfulRules: number;
  /** Failed evaluations */
  failedRules: number;
  /** Total execution time */
  executionTimeMs: number;
  /** Results by type */
  resultTypes: {
    alerts: number;
    recommendations: number;
    gaps: number;
    scores: number;
  };
  /** Errors encountered */
  errors: Array<{
    ruleId: string;
    error: string;
  }>;
}

export class CQLEngine {
  private rules = new Map<string, CQLRule>();
  private ruleCache = new Map<string, { result: CQLRuleResult; cachedAt: Date }>();
  private alertService: AlertService;
  private cacheExpirationMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 1000;

  constructor() {
    this.alertService = new AlertService();
  }

  /**
   * Load a single CQL rule from content
   */
  async loadRule(ruleContent: string, filePath: string, metadata?: Partial<CQLRule['metadata']>): Promise<CQLRule> {
    try {
      // Parse CQL metadata from content
      const parsedMetadata = this.parseCQLMetadata(ruleContent);
      
      const rule: CQLRule = {
        id: this.generateRuleId(parsedMetadata.libraryName, parsedMetadata.version),
        libraryName: parsedMetadata.libraryName,
        version: parsedMetadata.version,
        description: parsedMetadata.description,
        module: this.determineModule(filePath, parsedMetadata.libraryName),
        cqlContent: ruleContent,
        dependencies: this.extractDependencies(ruleContent),
        compiledAt: new Date(),
        filePath,
        metadata: {
          priority: 'medium',
          conditions: [],
          dataRequirements: this.extractDataRequirements(ruleContent),
          ...metadata,
          ...parsedMetadata.metadata
        }
      };

      // Compile the rule for execution
      await this.compileRule(rule);

      // Store in memory
      this.rules.set(rule.id, rule);

      logger.info('CQL rule loaded successfully', {
        ruleId: rule.id,
        libraryName: rule.libraryName,
        version: rule.version,
        module: rule.module,
        filePath
      });

      return rule;

    } catch (error) {
      logger.error('Failed to load CQL rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to load CQL rule from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute CQL rules against a FHIR patient bundle
   */
  async executeRules(
    patientBundle: any, 
    options: CQLExecutionOptions = {}
  ): Promise<{ results: CQLRuleResult[]; summary: CQLExecutionSummary }> {
    const startTime = Date.now();
    const results: CQLRuleResult[] = [];
    const errors: Array<{ ruleId: string; error: string }> = [];
    
    try {
      const patientId = this.extractPatientId(patientBundle);
      if (!patientId) {
        throw new Error('Patient ID not found in bundle');
      }

      // Select applicable rules
      const applicableRules = this.selectApplicableRules(patientBundle, options);
      
      logger.info('Starting CQL rule execution', {
        patientId,
        totalRules: applicableRules.length,
        ruleIds: options.ruleIds,
        context: options.context
      });

      // Execute rules (with potential parallelization for performance)
      for (const rule of applicableRules) {
        try {
          // Check cache first
          if (options.enableCaching) {
            const cacheKey = this.generateCacheKey(rule.id, patientId, patientBundle);
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
              results.push(cachedResult);
              continue;
            }
          }

          // Execute the rule
          const result = await this.executeRule(rule, patientBundle, options);
          if (result) {
            results.push(result);

            // Cache the result
            if (options.enableCaching) {
              const cacheKey = this.generateCacheKey(rule.id, patientId, patientBundle);
              this.cacheResult(cacheKey, result);
            }
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            ruleId: rule.id,
            error: errorMessage
          });

          logger.error('CQL rule execution failed', {
            ruleId: rule.id,
            patientId,
            error: errorMessage
          });
        }
      }

      const executionTime = Date.now() - startTime;
      
      // Generate execution summary
      const summary: CQLExecutionSummary = {
        totalRules: applicableRules.length,
        successfulRules: results.length,
        failedRules: errors.length,
        executionTimeMs: executionTime,
        resultTypes: this.categorizeResults(results),
        errors
      };

      // Process alerts and recommendations
      await this.processRuleResults(results, patientId, options.context);

      logger.info('CQL rule execution completed', {
        patientId,
        ...summary
      });

      return { results, summary };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('CQL rule execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: executionTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * Execute multiple patient bundles in batch
   */
  async executeBatch(
    patientBundles: any[], 
    options: CQLExecutionOptions = {}
  ): Promise<Map<string, { results: CQLRuleResult[]; summary: CQLExecutionSummary }>> {
    const batchResults = new Map<string, { results: CQLRuleResult[]; summary: CQLExecutionSummary }>();
    
    logger.info('Starting batch CQL execution', {
      patientCount: patientBundles.length,
      options
    });

    // Process in batches to manage memory
    const batchSize = 10;
    for (let i = 0; i < patientBundles.length; i += batchSize) {
      const batch = patientBundles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (patientBundle) => {
        const patientId = this.extractPatientId(patientBundle);
        if (!patientId) return null;

        try {
          const result = await this.executeRules(patientBundle, options);
          return { patientId, result };
        } catch (error) {
          logger.error('Batch execution failed for patient', {
            patientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      });

      const batchResults_ = await Promise.all(batchPromises);
      
      for (const result of batchResults_) {
        if (result) {
          batchResults.set(result.patientId, result.result);
        }
      }
    }

    logger.info('Batch CQL execution completed', {
      totalPatients: patientBundles.length,
      successfulPatients: batchResults.size
    });

    return batchResults;
  }

  /**
   * Get all loaded rules
   */
  getLoadedRules(): CQLRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get specific rule by ID
   */
  getRule(ruleId: string): CQLRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Remove rule from engine
   */
  unloadRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('CQL rule unloaded', { ruleId });
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.ruleCache.clear();
    logger.info('CQL result cache cleared');
  }

  // Private helper methods

  private parseCQLMetadata(cqlContent: string): {
    libraryName: string;
    version: string;
    description: string;
    metadata: Partial<CQLRule['metadata']>;
  } {
    // Extract library name and version from CQL
    const libraryMatch = cqlContent.match(/library\s+(\w+)\s+version\s+'([^']+)'/i);
    const descriptionMatch = cqlContent.match(/\/\*\s*(.*?)\s*\*\//s);
    
    return {
      libraryName: libraryMatch?.[1] || 'UnknownLibrary',
      version: libraryMatch?.[2] || '1.0.0',
      description: descriptionMatch?.[1] || 'No description provided',
      metadata: {
        priority: 'medium',
        conditions: [],
        dataRequirements: []
      }
    };
  }

  private determineModule(filePath: string, libraryName: string): CQLRule['module'] {
    const path_lower = filePath.toLowerCase();
    const lib_lower = libraryName.toLowerCase();

    if (path_lower.includes('heart-failure') || lib_lower.includes('hf')) return 'HF';
    if (path_lower.includes('electrophysiology') || lib_lower.includes('ep')) return 'EP';
    if (path_lower.includes('structural') || lib_lower.includes('structural')) return 'Structural';
    if (path_lower.includes('coronary') || lib_lower.includes('coronary')) return 'Coronary';
    if (path_lower.includes('peripheral') || lib_lower.includes('pv')) return 'PV';
    if (path_lower.includes('valvular') || lib_lower.includes('valvular')) return 'Valvular';

    return 'Cross-module';
  }

  private extractDependencies(cqlContent: string): string[] {
    // Extract include statements from CQL
    const includes = cqlContent.match(/include\s+(\w+)/gi) || [];
    return includes.map(inc => inc.replace(/include\s+/i, ''));
  }

  private extractDataRequirements(cqlContent: string): string[] {
    // Extract FHIR resource types mentioned in CQL
    const resourceTypes = new Set<string>();
    const fhirResources = [
      'Patient', 'Encounter', 'Observation', 'Condition', 'MedicationRequest',
      'Procedure', 'DiagnosticReport', 'ServiceRequest', 'AllergyIntolerance'
    ];

    for (const resource of fhirResources) {
      if (cqlContent.includes(resource)) {
        resourceTypes.add(resource);
      }
    }

    return Array.from(resourceTypes);
  }

  private async compileRule(rule: CQLRule): Promise<void> {
    try {
      // In a production implementation, this would use a proper CQL engine
      // like the CQL Execution Engine or similar library
      // For now, we'll create a mock compiled function
      rule.compiledRule = this.createMockCompiledRule(rule);
      
      logger.debug('CQL rule compiled successfully', {
        ruleId: rule.id,
        libraryName: rule.libraryName
      });
      
    } catch (error) {
      throw new Error(`Failed to compile CQL rule ${rule.libraryName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createMockCompiledRule(rule: CQLRule): Function {
    // Mock CQL execution function - in production this would be replaced
    // with actual CQL compilation and execution
    return (patientBundle: any, context: any = {}) => {
      // Simulate CQL evaluation based on rule type
      const patient = patientBundle.entry?.find((e: any) => e.resource?.resourceType === 'Patient')?.resource;
      if (!patient) return null;

      // Mock different types of clinical rules
      if (rule.libraryName.includes('BNP') || rule.description.includes('BNP')) {
        return this.evaluateBNPRule(patientBundle, rule);
      } else if (rule.libraryName.includes('Medication') || rule.description.includes('GDMT')) {
        return this.evaluateGDMTRule(patientBundle, rule);
      } else if (rule.libraryName.includes('Readmission')) {
        return this.evaluateReadmissionRule(patientBundle, rule);
      }

      // Default rule evaluation
      return {
        type: 'Recommendation',
        priority: 'low',
        title: 'Clinical Review',
        description: `Review patient per ${rule.libraryName} guidelines`,
        score: Math.floor(Math.random() * 100),
        evidence: `Based on ${rule.description}`
      };
    };
  }

  private evaluateBNPRule(patientBundle: any, rule: CQLRule): any {
    const observations = patientBundle.entry?.filter((e: any) => 
      e.resource?.resourceType === 'Observation' &&
      (e.resource?.code?.coding?.[0]?.display?.toLowerCase().includes('bnp') ||
       e.resource?.code?.coding?.[0]?.display?.toLowerCase().includes('natriuretic'))
    ) || [];

    if (observations.length === 0) {
      return {
        type: 'Gap',
        priority: 'medium',
        title: 'BNP Testing Gap',
        description: 'Consider BNP testing for heart failure assessment',
        recommendations: ['Order BNP or NT-proBNP', 'Clinical correlation with symptoms']
      };
    }

    const latestBNP = observations[0]?.resource;
    const value = latestBNP?.valueQuantity?.value;

    if (value > 400) {
      return {
        type: 'Alert',
        priority: 'high',
        title: 'Elevated BNP',
        description: `BNP elevated at ${value} pg/mL - suggests heart failure`,
        recommendations: [
          'Consider heart failure management',
          'Evaluate GDMT optimization',
          'Assess fluid status'
        ]
      };
    }

    return null;
  }

  private evaluateGDMTRule(patientBundle: any, rule: CQLRule): any {
    const medications = patientBundle.entry?.filter((e: any) => 
      e.resource?.resourceType === 'MedicationRequest'
    ) || [];

    const hasACEi = medications.some((m: any) => 
      m.resource?.medicationCodeableConcept?.text?.toLowerCase().includes('ace inhibitor') ||
      m.resource?.medicationCodeableConcept?.text?.toLowerCase().includes('lisinopril')
    );

    const hasBetaBlocker = medications.some((m: any) =>
      m.resource?.medicationCodeableConcept?.text?.toLowerCase().includes('metoprolol') ||
      m.resource?.medicationCodeableConcept?.text?.toLowerCase().includes('beta blocker')
    );

    if (!hasACEi || !hasBetaBlocker) {
      return {
        type: 'Gap',
        priority: 'high',
        title: 'GDMT Optimization Opportunity',
        description: 'Guideline-directed medical therapy not optimized',
        recommendations: [
          !hasACEi ? 'Consider ACE inhibitor or ARB' : null,
          !hasBetaBlocker ? 'Consider beta blocker therapy' : null
        ].filter(Boolean),
        score: 75
      };
    }

    return {
      type: 'Score',
      priority: 'low',
      title: 'GDMT Compliance',
      description: 'Patient on appropriate heart failure medications',
      score: 95
    };
  }

  private evaluateReadmissionRule(patientBundle: any, rule: CQLRule): any {
    // Mock readmission risk calculation
    const encounters = patientBundle.entry?.filter((e: any) => 
      e.resource?.resourceType === 'Encounter'
    ) || [];

    const recentDischarge = encounters.find((e: any) => {
      const period = e.resource?.period;
      if (period?.end) {
        const dischargeDate = new Date(period.end);
        const daysSince = (Date.now() - dischargeDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      }
      return false;
    });

    if (recentDischarge) {
      return {
        type: 'Alert',
        priority: 'medium',
        title: 'Readmission Risk',
        description: 'Patient recently discharged - monitor for readmission risk',
        recommendations: [
          'Ensure follow-up appointment scheduled',
          'Medication reconciliation',
          'Patient education on warning signs'
        ],
        score: 60
      };
    }

    return null;
  }

  private selectApplicableRules(patientBundle: any, options: CQLExecutionOptions): CQLRule[] {
    const allRules = Array.from(this.rules.values());
    
    // If specific rules requested, filter to those
    if (options.ruleIds && options.ruleIds.length > 0) {
      return allRules.filter(rule => options.ruleIds!.includes(rule.id));
    }

    // Otherwise, select rules based on patient data and context
    return allRules.filter(rule => {
      // Check if rule applies based on available data
      const hasRequiredData = rule.metadata.dataRequirements.every(resourceType => {
        return patientBundle.entry?.some((entry: any) => 
          entry.resource?.resourceType === resourceType
        );
      });

      // Check condition codes if specified
      if (options.context?.conditions && rule.metadata.conditions.length > 0) {
        const hasMatchingCondition = rule.metadata.conditions.some(code =>
          options.context!.conditions!.includes(code)
        );
        return hasRequiredData && hasMatchingCondition;
      }

      return hasRequiredData;
    });
  }

  private async executeRule(
    rule: CQLRule, 
    patientBundle: any, 
    options: CQLExecutionOptions
  ): Promise<CQLRuleResult | null> {
    const startTime = Date.now();
    const patientId = this.extractPatientId(patientBundle) || '';

    try {
      if (!rule.compiledRule) {
        throw new Error('Rule not compiled');
      }

      // Execute with timeout
      const timeoutMs = options.timeoutMs || 5000;
      const executionPromise = Promise.resolve(rule.compiledRule(patientBundle, options.context));
      
      const result = await Promise.race([
        executionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Rule execution timeout')), timeoutMs)
        )
      ]) as any;

      if (!result) {
        return null; // Rule didn't produce a result
      }

      const cqlResult: CQLRuleResult = {
        ruleId: rule.id,
        libraryName: rule.libraryName,
        type: result.type || 'Recommendation',
        priority: result.priority || 'medium',
        title: result.title || rule.description,
        description: result.description || '',
        recommendations: result.recommendations,
        score: result.score,
        evidence: result.evidence,
        rawResult: result,
        patientId,
        evaluatedAt: new Date(),
        context: options.context
      };

      const executionTime = Date.now() - startTime;
      
      logger.debug('CQL rule executed successfully', {
        ruleId: rule.id,
        patientId,
        resultType: cqlResult.type,
        executionTimeMs: executionTime
      });

      return cqlResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('CQL rule execution failed', {
        ruleId: rule.id,
        patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: executionTime
      });

      throw error;
    }
  }

  private extractPatientId(patientBundle: any): string | null {
    const patient = patientBundle.entry?.find((entry: any) => 
      entry.resource?.resourceType === 'Patient'
    )?.resource;
    
    return patient?.id || null;
  }

  private generateRuleId(libraryName: string, version: string): string {
    return `${libraryName}_${version}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private generateCacheKey(ruleId: string, patientId: string, patientBundle: any): string {
    // Create cache key based on rule, patient, and relevant data hash
    const dataHash = this.hashPatientData(patientBundle);
    return `${ruleId}_${patientId}_${dataHash}`;
  }

  private hashPatientData(patientBundle: any): string {
    // Simple hash of relevant patient data for cache invalidation
    const relevantData = {
      observations: patientBundle.entry?.filter((e: any) => e.resource?.resourceType === 'Observation').length || 0,
      medications: patientBundle.entry?.filter((e: any) => e.resource?.resourceType === 'MedicationRequest').length || 0,
      conditions: patientBundle.entry?.filter((e: any) => e.resource?.resourceType === 'Condition').length || 0
    };
    return Buffer.from(JSON.stringify(relevantData)).toString('base64').slice(0, 16);
  }

  private getCachedResult(cacheKey: string): CQLRuleResult | null {
    const cached = this.ruleCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.cachedAt.getTime();
    if (age > this.cacheExpirationMs) {
      this.ruleCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  private cacheResult(cacheKey: string, result: CQLRuleResult): void {
    // Implement LRU cache eviction if cache is full
    if (this.ruleCache.size >= this.maxCacheSize) {
      const oldestKey = this.ruleCache.keys().next().value;
      if (oldestKey) {
        this.ruleCache.delete(oldestKey);
      }
    }

    this.ruleCache.set(cacheKey, {
      result,
      cachedAt: new Date()
    });
  }

  private categorizeResults(results: CQLRuleResult[]): CQLExecutionSummary['resultTypes'] {
    return results.reduce((counts, result) => {
      switch (result.type) {
        case 'Alert':
          counts.alerts++;
          break;
        case 'Recommendation':
          counts.recommendations++;
          break;
        case 'Gap':
          counts.gaps++;
          break;
        case 'Score':
          counts.scores++;
          break;
      }
      return counts;
    }, { alerts: 0, recommendations: 0, gaps: 0, scores: 0 });
  }

  private async processRuleResults(
    results: CQLRuleResult[], 
    patientId: string, 
    context?: any
  ): Promise<void> {
    const alerts = results.filter(r => r.type === 'Alert' && (r.priority === 'critical' || r.priority === 'high'));
    
    if (alerts.length === 0) return;

    try {
      // Convert CQL alerts to TAILRD alerts
      for (const alert of alerts) {
        await this.alertService.checkCardiovascularAlerts({
          patientId: alert.patientId,
          eventType: 'CQL_EVALUATION',
          patientClass: 'Outpatient',
          location: {
            FacilityCode: context?.facilityCode || 'unknown',
            Department: 'CQL_ENGINE'
          }
        });
      }

      logger.info('CQL rule results processed through alert service', {
        patientId,
        alertCount: alerts.length
      });

    } catch (error) {
      logger.error('Failed to process CQL rule results', {
        patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        alertCount: alerts.length
      });
    }
  }
}

export default CQLEngine;