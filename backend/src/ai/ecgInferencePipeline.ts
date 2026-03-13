/**
 * ECG AI Inference Pipeline - Main orchestrating service for ECG analysis
 * 
 * This service coordinates ECG preprocessing, model inference, and post-processing
 * to deliver structured clinical findings from 12-lead ECG waveform data.
 */

import { ECGPreprocessor } from './ecgPreprocessor';
import { ECGPostprocessor } from './ecgPostprocessor';
import { ModelRegistry } from './modelRegistry';
import { PhenotypeFromECG } from './phenotypeFromECG';
import { logger } from '../utils/logger';

// Core ECG data interfaces
export interface ECGData {
  patientId: string;
  acquisitionDateTime: Date;
  samplingRate: number; // Hz
  duration: number; // seconds
  leads: ECGLead[];
  metadata?: ECGMetadata;
}

export interface ECGLead {
  name: string; // I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6
  samples: number[]; // Raw voltage samples in mV
  quality?: number; // 0-1 quality score
  gain?: number; // mV per unit
  offset?: number; // baseline offset
}

export interface ECGMetadata {
  deviceModel?: string;
  softwareVersion?: string;
  filterSettings?: {
    lowPass?: number;
    highPass?: number;
    notch?: number;
  };
  patientPosition?: 'supine' | 'sitting' | 'standing';
  clinicalContext?: string;
}

// Model inference configuration
export interface InferenceConfig {
  models: ModelSelectionConfig[];
  preprocessingOptions: PreprocessingOptions;
  postprocessingOptions: PostprocessingOptions;
  cacheResults: boolean;
  hospitalId?: string; // For multi-tenant model assignment
}

export interface ModelSelectionConfig {
  modelId: string;
  priority: number; // Higher = more priority
  conditions?: ModelConditions; // When to use this model
  outputMapping: ModelOutputMapping;
}

export interface ModelConditions {
  patientAgeRange?: [number, number];
  clinicalIndications?: string[];
  requiredLeads?: string[];
  minimumQuality?: number;
}

export interface ModelOutputMapping {
  rhythmClassification: boolean;
  abnormalityDetection: boolean;
  phenotypeScreening: boolean;
  morphologyAnalysis: boolean;
}

export interface PreprocessingOptions {
  targetSamplingRate: number; // 250 or 500 Hz
  windowSize: number; // seconds (typically 10)
  windowOverlap: number; // 0-1 overlap fraction
  filterConfig: FilterConfig;
  normalizationMethod: 'z-score' | 'min-max' | 'per-lead' | 'global';
  qualityThreshold: number; // Minimum lead quality (0-1)
}

export interface FilterConfig {
  rhythmFilter: { low: number; high: number }; // 0.5-40 Hz
  morphologyFilter: { low: number; high: number }; // 0.05-150 Hz
  removeBaselineWander: boolean;
  powerLineFrequency: 50 | 60; // Hz
}

export interface PostprocessingOptions {
  clinicalThresholds: ClinicalThresholds;
  confidenceThreshold: number; // Minimum confidence for reporting
  generateFHIR: boolean;
  compareWithPriorECG: boolean;
  uncertaintyQuantification: boolean;
}

export interface ClinicalThresholds {
  sensitivity: number; // 0-1, higher = more sensitive
  specificity: number; // 0-1, higher = more specific
  customThresholds?: Record<string, number>; // Finding-specific thresholds
}

// Inference results
export interface ECGInferenceResult {
  patientId: string;
  ecgId: string;
  timestamp: Date;
  processingTime: number; // milliseconds
  models: ModelResult[];
  aggregatedFindings: ClinicalFindings;
  phenotypeScreening?: PhenotypeScreeningResult;
  qualityAssessment: QualityAssessment;
  fhirDiagnosticReport?: any; // FHIR DiagnosticReport JSON
  cacheKey?: string;
}

export interface ModelResult {
  modelId: string;
  modelVersion: string;
  inferenceTime: number; // milliseconds
  confidence: number; // 0-1
  rawOutput: any; // Model-specific output format
  findings: ClinicalFindings;
  metadata?: {
    preprocessingConfig: any;
    modelParameters?: any;
  };
}

export interface ClinicalFindings {
  rhythm: RhythmFindings;
  abnormalities: AbnormalityFindings;
  morphology?: MorphologyFindings;
  measurements?: ECGMeasurements;
  alerts: ClinicalAlert[];
}

export interface RhythmFindings {
  primaryRhythm: string; // 'sinus', 'atrial_fibrillation', 'atrial_flutter', etc.
  rhythmConfidence: number;
  heartRate: number; // BPM
  rhythmVariability?: number;
  alternativeRhythms?: Array<{ rhythm: string; confidence: number }>;
}

export interface AbnormalityFindings {
  abnormalities: Array<{
    finding: string; // e.g., 'left_ventricular_hypertrophy', 'st_elevation'
    confidence: number;
    leads: string[]; // Which leads show this finding
    severity?: 'mild' | 'moderate' | 'severe';
    location?: string; // Anatomical location if applicable
  }>;
  isNormal: boolean;
  normalConfidence: number;
}

export interface MorphologyFindings {
  pWave?: WaveformAnalysis;
  qrsComplex?: WaveformAnalysis;
  tWave?: WaveformAnalysis;
  stSegment?: WaveformAnalysis;
}

export interface WaveformAnalysis {
  duration: number; // ms
  amplitude: number; // mV
  morphology: string;
  abnormalities: string[];
}

export interface ECGMeasurements {
  prInterval: number; // ms
  qrsDuration: number; // ms
  qtInterval: number; // ms
  qtcInterval: number; // ms (corrected)
  qrsAxis: number; // degrees
  tAxis?: number; // degrees
}

export interface ClinicalAlert {
  type: 'critical' | 'warning' | 'info';
  finding: string;
  message: string;
  actionRequired?: string;
  cqlRuleTriggered?: string; // Reference to triggered CQL rule
  confidence: number;
}

export interface PhenotypeScreeningResult {
  suspectedPhenotypes: Array<{
    phenotype: string;
    confidence: number;
    triggeringFindings: string[];
    recommendedFollowup: string[];
  }>;
  riskScores?: Record<string, number>;
}

export interface QualityAssessment {
  overallQuality: number; // 0-1
  leadQualities: Record<string, number>; // Per-lead quality scores
  noiseLevel: number; // 0-1
  artifactDetected: boolean;
  usableLeads: string[];
  qualityIssues: string[];
}

// Batch processing interfaces
export interface BatchInferenceRequest {
  ecgs: ECGData[];
  config: InferenceConfig;
  priority?: 'low' | 'normal' | 'high';
  callback?: string; // URL for completion notification
}

export interface BatchInferenceResult {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-1
  results: ECGInferenceResult[];
  errors: Array<{ ecgId: string; error: string }>;
  startTime: Date;
  completionTime?: Date;
  totalProcessingTime?: number;
}

// Cache interfaces
export interface CacheEntry {
  key: string;
  result: ECGInferenceResult;
  timestamp: Date;
  ttl: number; // Time to live in seconds
  accessCount: number;
  lastAccessed: Date;
}

export class ECGInferencePipeline {
  private preprocessor: ECGPreprocessor;
  private postprocessor: ECGPostprocessor;
  private modelRegistry: ModelRegistry;
  private phenotypeScreener: PhenotypeFromECG;
  private cache: Map<string, CacheEntry> = new Map();
  private batchJobs: Map<string, BatchInferenceResult> = new Map();

  constructor() {
    this.preprocessor = new ECGPreprocessor();
    this.postprocessor = new ECGPostprocessor();
    this.modelRegistry = new ModelRegistry();
    this.phenotypeScreener = new PhenotypeFromECG();
  }

  /**
   * Initialize the pipeline by loading models and warming up components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing ECG AI inference pipeline...');
      
      await this.modelRegistry.initialize();
      await this.preprocessor.initialize();
      await this.postprocessor.initialize();
      // PhenotypeFromECG does not require initialization
      
      // Start cache cleanup timer
      this.startCacheCleanup();
      
      logger.info('ECG AI inference pipeline initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ECG AI inference pipeline:', error);
      throw error;
    }
  }

  /**
   * Process a single ECG through the entire inference pipeline
   */
  async processECG(
    ecgData: ECGData,
    config: InferenceConfig
  ): Promise<ECGInferenceResult> {
    const startTime = Date.now();
    const ecgId = `ecg_${ecgData.patientId}_${startTime}`;
    
    try {
      logger.info(`Processing ECG ${ecgId} for patient ${ecgData.patientId}`);

      // Check cache if enabled
      if (config.cacheResults) {
        const cacheKey = this.generateCacheKey(ecgData, config);
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
          logger.info(`Cache hit for ECG ${ecgId}`);
          return cachedResult;
        }
      }

      // Step 1: Preprocessing
      const preprocessedData = await this.preprocessor.process(
        ecgData,
        config.preprocessingOptions
      );

      // Step 2: Quality assessment
      const qualityAssessment = await this.assessQuality(preprocessedData);
      
      if (qualityAssessment.overallQuality < config.preprocessingOptions.qualityThreshold) {
        logger.warn(`ECG ${ecgId} quality too low: ${qualityAssessment.overallQuality}`);
      }

      // Step 3: Model selection and inference
      const selectedModels = await this.selectModels(
        ecgData,
        config,
        qualityAssessment
      );

      const modelResults: ModelResult[] = [];
      for (const modelConfig of selectedModels) {
        try {
          const modelResult = await this.runModelInference(
            preprocessedData,
            modelConfig
          );
          modelResults.push(modelResult);
        } catch (error) {
          logger.error(`Model ${modelConfig.modelId} inference failed:`, error);
          // Continue with other models
        }
      }

      if (modelResults.length === 0) {
        throw new Error('All model inferences failed');
      }

      // Step 4: Aggregate findings from all models
      const aggregatedFindings = await this.aggregateFindings(modelResults);

      // Step 5: Post-processing
      const processedFindings = await this.postprocessor.process(
        aggregatedFindings,
        ecgData,
        config.postprocessingOptions
      );

      // Step 6: Phenotype screening
      const phenotypeResults = await this.phenotypeScreener.screenForPhenotypes(
        ecgData,
        processedFindings
      );
      const phenotypeScreening: PhenotypeScreeningResult = {
        suspectedPhenotypes: phenotypeResults.map(r => ({
          phenotype: r.phenotypeType,
          confidence: r.confidence,
          triggeringFindings: r.supportingFindings,
          recommendedFollowup: [r.recommendation],
        })),
      };

      // Step 7: Generate FHIR DiagnosticReport if requested
      let fhirDiagnosticReport;
      if (config.postprocessingOptions.generateFHIR) {
        fhirDiagnosticReport = await this.postprocessor.generateFHIRReport(
          processedFindings,
          ecgData
        );
      }

      const result: ECGInferenceResult = {
        patientId: ecgData.patientId,
        ecgId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        models: modelResults,
        aggregatedFindings: processedFindings,
        phenotypeScreening,
        qualityAssessment,
        fhirDiagnosticReport,
        cacheKey: config.cacheResults ? this.generateCacheKey(ecgData, config) : undefined
      };

      // Cache result if enabled
      if (config.cacheResults && result.cacheKey) {
        this.cacheResult(result.cacheKey, result);
      }

      logger.info(`ECG ${ecgId} processed successfully in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      logger.error(`ECG ${ecgId} processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process multiple ECGs in batch
   */
  async processBatch(request: BatchInferenceRequest): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batchResult: BatchInferenceResult = {
      batchId,
      status: 'pending',
      progress: 0,
      results: [],
      errors: [],
      startTime: new Date(),
      totalProcessingTime: 0
    };

    this.batchJobs.set(batchId, batchResult);

    // Process batch asynchronously
    this.processBatchAsync(batchId, request);

    logger.info(`Started batch processing ${batchId} with ${request.ecgs.length} ECGs`);
    return batchId;
  }

  /**
   * Get batch processing status
   */
  getBatchStatus(batchId: string): BatchInferenceResult | null {
    return this.batchJobs.get(batchId) || null;
  }

  /**
   * Get pipeline health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const modelHealth = await this.modelRegistry.getHealthStatus();
      const cacheStats = this.getCacheStats();

      const isHealthy = modelHealth.loadedModels > 0 && 
                      modelHealth.errorRate < 0.1;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          models: modelHealth,
          cache: cacheStats,
          activeBatches: this.batchJobs.size
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  // Private methods

  private async processBatchAsync(
    batchId: string,
    request: BatchInferenceRequest
  ): Promise<void> {
    const batch = this.batchJobs.get(batchId)!;
    batch.status = 'processing';

    const startTime = Date.now();

    for (let i = 0; i < request.ecgs.length; i++) {
      try {
        const result = await this.processECG(request.ecgs[i], request.config);
        batch.results.push(result);
      } catch (error) {
        batch.errors.push({
          ecgId: request.ecgs[i].patientId,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Update progress
      batch.progress = (i + 1) / request.ecgs.length;
      
      // Allow other operations to proceed
      await new Promise(resolve => setImmediate(resolve));
    }

    batch.status = 'completed';
    batch.completionTime = new Date();
    batch.totalProcessingTime = Date.now() - startTime;

    logger.info(`Batch ${batchId} completed: ${batch.results.length} success, ${batch.errors.length} errors`);

    // Notify callback if provided
    if (request.callback) {
      try {
        // Implementation would depend on your HTTP client setup
        // await this.httpClient.post(request.callback, batch);
      } catch (error) {
        logger.error(`Failed to notify callback for batch ${batchId}:`, error);
      }
    }
  }

  private async selectModels(
    ecgData: ECGData,
    config: InferenceConfig,
    qualityAssessment: QualityAssessment
  ): Promise<ModelSelectionConfig[]> {
    const availableModels = await this.modelRegistry.getAvailableModels(
      config.hospitalId
    );

    return config.models
      .filter(modelConfig => {
        const model = availableModels.find(m => m.id === modelConfig.modelId);
        if (!model) return false;

        // Check if model conditions are met
        if (modelConfig.conditions) {
          const conditions = modelConfig.conditions;
          
          // Check required leads
          if (conditions.requiredLeads) {
            const hasRequiredLeads = conditions.requiredLeads.every(lead =>
              qualityAssessment.usableLeads.includes(lead)
            );
            if (!hasRequiredLeads) return false;
          }

          // Check minimum quality
          if (conditions.minimumQuality && 
              qualityAssessment.overallQuality < conditions.minimumQuality) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  private async runModelInference(
    preprocessedData: any,
    modelConfig: ModelSelectionConfig
  ): Promise<ModelResult> {
    const startTime = Date.now();
    
    const model = await this.modelRegistry.getModel(modelConfig.modelId);
    const rawOutput = await model.predict(preprocessedData);
    
    // Convert raw output to structured findings
    const findings = await this.postprocessor.mapModelOutput(
      rawOutput,
      modelConfig.outputMapping,
      modelConfig.modelId
    );

    return {
      modelId: modelConfig.modelId,
      modelVersion: model.version,
      inferenceTime: Date.now() - startTime,
      confidence: this.calculateOverallConfidence(rawOutput),
      rawOutput,
      findings,
      metadata: {
        preprocessingConfig: preprocessedData.config,
        modelParameters: model.parameters
      }
    };
  }

  private async aggregateFindings(modelResults: ModelResult[]): Promise<ClinicalFindings> {
    // Implement ensemble aggregation logic
    // This is a simplified version - actual implementation would be more sophisticated
    
    const allFindings = modelResults.map(r => r.findings);
    const weights = modelResults.map(r => r.confidence);
    
    // Weighted average for rhythm findings
    const rhythmFindings = this.aggregateRhythmFindings(allFindings, weights);
    
    // Union of abnormalities with confidence weighting
    const abnormalityFindings = this.aggregateAbnormalityFindings(allFindings, weights);
    
    // Average measurements
    const measurements = this.aggregateMeasurements(allFindings, weights);
    
    // Merge all alerts
    const alerts = allFindings.flatMap(f => f.alerts);

    return {
      rhythm: rhythmFindings,
      abnormalities: abnormalityFindings,
      measurements,
      alerts
    };
  }

  private aggregateRhythmFindings(
    findings: ClinicalFindings[],
    weights: number[]
  ): RhythmFindings {
    // Simplified aggregation - would be more sophisticated in practice
    const rhythmCounts = new Map<string, { count: number; totalWeight: number }>();
    let totalHeartRate = 0;
    let totalWeight = 0;

    findings.forEach((finding, i) => {
      const weight = weights[i];
      const rhythm = finding.rhythm.primaryRhythm;
      
      if (!rhythmCounts.has(rhythm)) {
        rhythmCounts.set(rhythm, { count: 0, totalWeight: 0 });
      }
      
      const entry = rhythmCounts.get(rhythm)!;
      entry.count += 1;
      entry.totalWeight += weight;
      
      totalHeartRate += finding.rhythm.heartRate * weight;
      totalWeight += weight;
    });

    // Find the most confident rhythm
    let bestRhythm = '';
    let bestScore = 0;
    
    for (const [rhythm, data] of rhythmCounts.entries()) {
      const score = data.totalWeight / totalWeight;
      if (score > bestScore) {
        bestScore = score;
        bestRhythm = rhythm;
      }
    }

    return {
      primaryRhythm: bestRhythm,
      rhythmConfidence: bestScore,
      heartRate: Math.round(totalHeartRate / totalWeight),
      alternativeRhythms: Array.from(rhythmCounts.entries())
        .filter(([rhythm]) => rhythm !== bestRhythm)
        .map(([rhythm, data]) => ({
          rhythm,
          confidence: data.totalWeight / totalWeight
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
    };
  }

  private aggregateAbnormalityFindings(
    findings: ClinicalFindings[],
    weights: number[]
  ): AbnormalityFindings {
    const abnormalityMap = new Map<string, {
      confidences: number[];
      weights: number[];
      leads: Set<string>;
      severities: string[];
      locations: string[];
    }>();

    findings.forEach((finding, i) => {
      const weight = weights[i];
      
      finding.abnormalities.abnormalities.forEach(abnormality => {
        if (!abnormalityMap.has(abnormality.finding)) {
          abnormalityMap.set(abnormality.finding, {
            confidences: [],
            weights: [],
            leads: new Set(),
            severities: [],
            locations: []
          });
        }
        
        const entry = abnormalityMap.get(abnormality.finding)!;
        entry.confidences.push(abnormality.confidence);
        entry.weights.push(weight);
        abnormality.leads.forEach(lead => entry.leads.add(lead));
        if (abnormality.severity) entry.severities.push(abnormality.severity);
        if (abnormality.location) entry.locations.push(abnormality.location);
      });
    });

    const aggregatedAbnormalities = Array.from(abnormalityMap.entries())
      .map(([finding, data]) => {
        // Weighted average confidence
        const totalWeight = data.weights.reduce((sum, w) => sum + w, 0);
        const weightedConfidence = data.confidences
          .reduce((sum, conf, i) => sum + conf * data.weights[i], 0) / totalWeight;
        
        // Most common severity and location
        const mostCommonSeverity = this.getMostCommon(data.severities);
        const mostCommonLocation = this.getMostCommon(data.locations);

        return {
          finding,
          confidence: weightedConfidence,
          leads: Array.from(data.leads),
          severity: mostCommonSeverity as any,
          location: mostCommonLocation
        };
      })
      .filter(abnormality => abnormality.confidence > 0.3) // Filter low-confidence findings
      .sort((a, b) => b.confidence - a.confidence);

    // Calculate overall normal probability
    const normalConfidences = findings.map((f, i) => f.abnormalities.normalConfidence * weights[i]);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalConfidence = normalConfidences.reduce((sum, conf) => sum + conf, 0) / totalWeight;

    return {
      abnormalities: aggregatedAbnormalities,
      isNormal: aggregatedAbnormalities.length === 0 && normalConfidence > 0.7,
      normalConfidence
    };
  }

  private aggregateMeasurements(
    findings: ClinicalFindings[],
    weights: number[]
  ): ECGMeasurements | undefined {
    const validMeasurements = findings.filter(f => f.measurements);
    if (validMeasurements.length === 0) return undefined;

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const aggregate = (getValue: (m: ECGMeasurements) => number) => {
      let sum = 0;
      let weight = 0;
      
      validMeasurements.forEach((finding, i) => {
        if (finding.measurements) {
          sum += getValue(finding.measurements) * weights[i];
          weight += weights[i];
        }
      });
      
      return sum / weight;
    };

    return {
      prInterval: Math.round(aggregate(m => m.prInterval)),
      qrsDuration: Math.round(aggregate(m => m.qrsDuration)),
      qtInterval: Math.round(aggregate(m => m.qtInterval)),
      qtcInterval: Math.round(aggregate(m => m.qtcInterval)),
      qrsAxis: Math.round(aggregate(m => m.qrsAxis)),
      tAxis: validMeasurements[0].measurements?.tAxis ? 
        Math.round(aggregate(m => m.tAxis || 0)) : undefined
    };
  }

  private getMostCommon<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    
    const counts = new Map<T, number>();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon: T | undefined;
    
    for (const [item, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    
    return mostCommon;
  }

  private async assessQuality(preprocessedData: any): Promise<QualityAssessment> {
    // This would implement actual quality assessment logic
    // For now, returning a placeholder
    return {
      overallQuality: 0.85,
      leadQualities: {
        'I': 0.9, 'II': 0.85, 'III': 0.8,
        'aVR': 0.75, 'aVL': 0.85, 'aVF': 0.9,
        'V1': 0.8, 'V2': 0.85, 'V3': 0.9,
        'V4': 0.85, 'V5': 0.8, 'V6': 0.85
      },
      noiseLevel: 0.15,
      artifactDetected: false,
      usableLeads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
      qualityIssues: []
    };
  }

  private calculateOverallConfidence(rawOutput: any): number {
    // Model-specific confidence calculation
    // This would be implemented based on each model's output format
    return 0.8; // Placeholder
  }

  private generateCacheKey(ecgData: ECGData, config: InferenceConfig): string {
    // Generate a hash-based cache key from ECG data and config
    const keyData = {
      patientId: ecgData.patientId,
      acquisitionDateTime: ecgData.acquisitionDateTime.toISOString(),
      samplingRate: ecgData.samplingRate,
      duration: ecgData.duration,
      leadCount: ecgData.leads.length,
      configHash: this.hashConfig(config)
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private hashConfig(config: InferenceConfig): string {
    // Simple config hash - in practice you'd use a proper hash function
    return JSON.stringify({
      models: config.models.map(m => ({ id: m.modelId, priority: m.priority })),
      preprocessing: config.preprocessingOptions,
      postprocessing: config.postprocessingOptions
    });
  }

  private getFromCache(cacheKey: string): ECGInferenceResult | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp.getTime() > entry.ttl * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = new Date();

    return entry.result;
  }

  private cacheResult(cacheKey: string, result: ECGInferenceResult): void {
    const ttl = 24 * 60 * 60; // 24 hours default TTL

    this.cache.set(cacheKey, {
      key: cacheKey,
      result,
      timestamp: new Date(),
      ttl,
      accessCount: 0,
      lastAccessed: new Date()
    });
  }

  private getCacheStats(): any {
    return {
      entries: this.cache.size,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateCacheMemoryUsage()
    };
  }

  private calculateHitRate(): number {
    // Implementation would track hits/misses
    return 0.75; // Placeholder
  }

  private estimateCacheMemoryUsage(): string {
    // Rough estimation of cache memory usage
    const entries = Array.from(this.cache.values());
    const avgSize = 50 * 1024; // Estimate 50KB per entry
    const totalBytes = entries.length * avgSize;
    
    if (totalBytes > 1024 * 1024) {
      return `${Math.round(totalBytes / (1024 * 1024))}MB`;
    } else {
      return `${Math.round(totalBytes / 1024)}KB`;
    }
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp.getTime() > entry.ttl * 1000) {
          this.cache.delete(key);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}