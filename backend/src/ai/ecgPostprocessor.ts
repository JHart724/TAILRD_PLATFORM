/**
 * ECG Postprocessor - Results interpretation and clinical decision support
 * 
 * Maps AI model outputs to clinical findings, applies clinical thresholds,
 * generates FHIR DiagnosticReports, and integrates with CQL rules.
 */

import { logger } from '../utils/logger';
import type { ECGData } from './ecgInferencePipeline';

// Re-export interfaces from the main pipeline
export interface ClinicalFindings {
  rhythm: RhythmFindings;
  abnormalities: AbnormalityFindings;
  morphology?: MorphologyFindings;
  measurements?: ECGMeasurements;
  alerts: ClinicalAlert[];
}

export interface RhythmFindings {
  primaryRhythm: string;
  rhythmConfidence: number;
  heartRate: number;
  rhythmVariability?: number;
  alternativeRhythms?: Array<{ rhythm: string; confidence: number }>;
}

export interface AbnormalityFindings {
  abnormalities: Array<{
    finding: string;
    confidence: number;
    leads: string[];
    severity?: 'mild' | 'moderate' | 'severe';
    location?: string;
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
  duration: number;
  amplitude: number;
  morphology: string;
  abnormalities: string[];
}

export interface ECGMeasurements {
  prInterval: number;
  qrsDuration: number;
  qtInterval: number;
  qtcInterval: number;
  qrsAxis: number;
  tAxis?: number;
}

export interface ClinicalAlert {
  type: 'critical' | 'warning' | 'info';
  finding: string;
  message: string;
  actionRequired?: string;
  cqlRuleTriggered?: string;
  confidence: number;
}

// Postprocessing specific interfaces
export interface PostprocessingOptions {
  clinicalThresholds: ClinicalThresholds;
  confidenceThreshold: number;
  generateFHIR: boolean;
  compareWithPriorECG: boolean;
  uncertaintyQuantification: boolean;
}

export interface ClinicalThresholds {
  sensitivity: number;
  specificity: number;
  confidenceThreshold?: number;
  customThresholds?: Record<string, number>;
}

export interface ModelOutputMapping {
  rhythmClassification: boolean;
  abnormalityDetection: boolean;
  phenotypeScreening: boolean;
  morphologyAnalysis: boolean;
}

export interface UncertaintyQuantification {
  epistemic: number; // Model uncertainty
  aleatoric: number; // Data uncertainty
  total: number; // Combined uncertainty
  confidence: number; // Overall confidence
  calibration: CalibrationMetrics;
}

export interface CalibrationMetrics {
  expectedCalibrationError: number;
  reliability: number;
  resolution: number;
  sharpness: number;
}

export interface PriorECGComparison {
  priorECGId: string;
  priorDate: Date;
  deltaFindings: DeltaFinding[];
  progression: 'improved' | 'stable' | 'worsened' | 'new_findings';
  significantChanges: boolean;
}

export interface DeltaFinding {
  category: 'rhythm' | 'morphology' | 'measurement' | 'abnormality';
  finding: string;
  change: 'new' | 'resolved' | 'improved' | 'worsened' | 'stable';
  previousValue?: any;
  currentValue?: any;
  significance: 'high' | 'medium' | 'low';
  clinicalImplication?: string;
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  meta: {
    profile: string[];
    lastUpdated: string;
  };
  status: 'final' | 'preliminary' | 'amended';
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  issued: string;
  performer: Array<{
    reference: string;
    display: string;
  }>;
  result: Array<{
    reference: string;
  }>;
  conclusion: string;
  conclusionCode: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  presentedForm?: Array<{
    contentType: string;
    data: string;
  }>;
}

export interface ClinicalKnowledge {
  rhythmMappings: Map<string, RhythmKnowledge>;
  abnormalityMappings: Map<string, AbnormalityKnowledge>;
  measurementNorms: MeasurementNorms;
  cqlIntegration: CQLIntegration;
}

export interface RhythmKnowledge {
  snomed: string;
  icd10: string;
  clinicalName: string;
  severity: 'normal' | 'benign' | 'concerning' | 'urgent' | 'critical';
  clinicalImplications: string[];
  recommendedActions: string[];
  cqlRules: string[];
}

export interface AbnormalityKnowledge {
  snomed: string;
  icd10: string;
  clinicalName: string;
  leadAssociations: string[];
  morphologicalFeatures: string[];
  clinicalContext: string[];
  differentialDiagnosis: string[];
  recommendedWorkup: string[];
}

export interface MeasurementNorms {
  prInterval: { normal: [number, number]; abnormal: { short: number; long: number } };
  qrsDuration: { normal: [number, number]; abnormal: { narrow: number; wide: number } };
  qtInterval: { normal: [number, number]; corrected: boolean };
  qtcFormula: 'bazett' | 'fridericia' | 'framingham';
  qrsAxis: { normal: [number, number]; leftDeviation: number; rightDeviation: number };
}

export interface CQLIntegration {
  ruleEngine: any; // Reference to CQL engine
  ruleMappings: Map<string, CQLRuleMapping>;
  contextBuilder: (findings: ClinicalFindings, ecgData: ECGData) => any;
}

export interface CQLRuleMapping {
  ruleId: string;
  triggerFindings: string[];
  contextRequirements: string[];
  priority: number;
  description: string;
}

export class ECGPostprocessor {
  private clinicalKnowledge: ClinicalKnowledge;
  private confidenceCalibrator: ConfidenceCalibrator;

  constructor() {
    this.clinicalKnowledge = this.initializeClinicalKnowledge();
    this.confidenceCalibrator = new ConfidenceCalibrator();
  }

  /**
   * Initialize the postprocessor
   */
  async initialize(): Promise<void> {
    logger.info('Initializing ECG postprocessor...');
    
    await this.loadClinicalKnowledge();
    await this.confidenceCalibrator.initialize();
    
    logger.info('ECG postprocessor initialized');
  }

  /**
   * Process clinical findings through postprocessing pipeline
   */
  async process(
    findings: ClinicalFindings,
    ecgData: ECGData,
    options: PostprocessingOptions
  ): Promise<ClinicalFindings> {
    try {
      logger.info(`Postprocessing findings for patient ${ecgData.patientId}`);

      // Step 1: Apply clinical thresholds
      const thresholdedFindings = await this.applyClinicalThresholds(findings, options.clinicalThresholds);

      // Step 2: Calibrate confidence scores
      const calibratedFindings = await this.calibrateConfidence(thresholdedFindings);

      // Step 3: Add uncertainty quantification if requested
      let uncertaintyFindings = calibratedFindings;
      if (options.uncertaintyQuantification) {
        uncertaintyFindings = await this.addUncertaintyQuantification(calibratedFindings);
      }

      // Step 4: Compare with prior ECG if requested
      let deltaFindings = uncertaintyFindings;
      if (options.compareWithPriorECG) {
        deltaFindings = await this.compareWithPriorECG(uncertaintyFindings, ecgData);
      }

      // Step 5: Generate clinical alerts
      const alertFindings = await this.generateClinicalAlerts(deltaFindings, ecgData);

      // Step 6: Integrate with CQL rules
      const cqlIntegratedFindings = await this.integrateCQLRules(alertFindings, ecgData);

      logger.info(`Postprocessing completed for patient ${ecgData.patientId}`);
      return cqlIntegratedFindings;

    } catch (error) {
      logger.error(`Postprocessing failed for patient ${ecgData.patientId}:`, error);
      throw error;
    }
  }

  /**
   * Map raw model output to clinical findings
   */
  async mapModelOutput(
    rawOutput: any,
    outputMapping: ModelOutputMapping,
    modelId: string
  ): Promise<ClinicalFindings> {
    try {
      const findings: ClinicalFindings = {
        rhythm: { primaryRhythm: 'unknown', rhythmConfidence: 0, heartRate: 0 },
        abnormalities: { abnormalities: [], isNormal: true, normalConfidence: 0 },
        alerts: []
      };

      // Map based on model type and output format
      if (outputMapping.rhythmClassification) {
        findings.rhythm = await this.mapRhythmOutput(rawOutput, modelId);
      }

      if (outputMapping.abnormalityDetection) {
        findings.abnormalities = await this.mapAbnormalityOutput(rawOutput, modelId);
      }

      if (outputMapping.morphologyAnalysis) {
        findings.morphology = await this.mapMorphologyOutput(rawOutput, modelId);
      }

      // Extract measurements if available
      findings.measurements = await this.extractMeasurements(rawOutput, modelId);

      return findings;

    } catch (error) {
      logger.error(`Model output mapping failed for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Generate FHIR DiagnosticReport
   */
  async generateFHIRReport(
    findings: ClinicalFindings,
    ecgData: ECGData
  ): Promise<FHIRDiagnosticReport> {
    try {
      const reportId = `ecg-report-${ecgData.patientId}-${Date.now()}`;
      const now = new Date().toISOString();

      // Build conclusion text
      const conclusion = await this.buildClinicalConclusion(findings);

      // Map findings to FHIR observation codes
      const conclusionCodes = await this.mapFindingsToFHIR(findings);

      const fhirReport: FHIRDiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: reportId,
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport'],
          lastUpdated: now
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'CG',
            display: 'Cardiology'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '11524-6',
            display: 'EKG study'
          }]
        },
        subject: {
          reference: `Patient/${ecgData.patientId}`
        },
        effectiveDateTime: ecgData.acquisitionDateTime.toISOString(),
        issued: now,
        performer: [{
          reference: 'Organization/tailrd-ai',
          display: 'TAILRD AI Analysis System'
        }],
        result: [], // Would contain references to individual observations
        conclusion,
        conclusionCode: conclusionCodes
      };

      logger.info(`Generated FHIR DiagnosticReport ${reportId}`);
      return fhirReport;

    } catch (error) {
      logger.error('FHIR report generation failed:', error);
      throw error;
    }
  }

  // Private methods

  private async loadClinicalKnowledge(): Promise<void> {
    // In practice, this would load from clinical databases or knowledge bases
    this.clinicalKnowledge = this.initializeClinicalKnowledge();
  }

  private initializeClinicalKnowledge(): ClinicalKnowledge {
    const rhythmMappings = new Map<string, RhythmKnowledge>([
      ['sinus_rhythm', {
        snomed: '426783006',
        icd10: 'R00.0',
        clinicalName: 'Normal sinus rhythm',
        severity: 'normal',
        clinicalImplications: ['Normal cardiac conduction'],
        recommendedActions: ['No immediate action required'],
        cqlRules: []
      }],
      ['atrial_fibrillation', {
        snomed: '49436004',
        icd10: 'I48.9',
        clinicalName: 'Atrial fibrillation',
        severity: 'concerning',
        clinicalImplications: [
          'Increased stroke risk',
          'Heart failure risk',
          'Thromboembolic complications'
        ],
        recommendedActions: [
          'Anticoagulation assessment',
          'Rate control evaluation',
          'Rhythm control consideration'
        ],
        cqlRules: ['rule-08-afib-anticoagulation']
      }],
      ['ventricular_tachycardia', {
        snomed: '25569003',
        icd10: 'I47.2',
        clinicalName: 'Ventricular tachycardia',
        severity: 'critical',
        clinicalImplications: [
          'Hemodynamic compromise risk',
          'Sudden cardiac death risk'
        ],
        recommendedActions: [
          'Immediate medical attention',
          'Defibrillator consideration',
          'Electrophysiology consultation'
        ],
        cqlRules: ['rule-vt-urgent-eval']
      }]
    ]);

    const abnormalityMappings = new Map<string, AbnormalityKnowledge>([
      ['st_elevation', {
        snomed: '164865005',
        icd10: 'I21.9',
        clinicalName: 'ST elevation',
        leadAssociations: ['I', 'II', 'III', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        morphologicalFeatures: ['Elevated ST segment'],
        clinicalContext: ['Myocardial infarction', 'Pericarditis', 'Early repolarization'],
        differentialDiagnosis: ['STEMI', 'NSTEMI', 'Pericarditis'],
        recommendedWorkup: ['Cardiac enzymes', 'Echo', 'Cardiac catheterization']
      }],
      ['left_ventricular_hypertrophy', {
        snomed: '164873001',
        icd10: 'I25.1',
        clinicalName: 'Left ventricular hypertrophy',
        leadAssociations: ['V5', 'V6', 'I', 'aVL'],
        morphologicalFeatures: ['Increased QRS amplitude', 'ST changes', 'T wave inversions'],
        clinicalContext: ['Hypertension', 'Aortic stenosis', 'Hypertrophic cardiomyopathy'],
        differentialDiagnosis: ['Essential hypertension', 'HCM', 'Aortic valve disease'],
        recommendedWorkup: ['Echocardiogram', 'Blood pressure monitoring']
      }]
    ]);

    const measurementNorms: MeasurementNorms = {
      prInterval: {
        normal: [120, 200],
        abnormal: { short: 120, long: 200 }
      },
      qrsDuration: {
        normal: [70, 100],
        abnormal: { narrow: 70, wide: 120 }
      },
      qtInterval: {
        normal: [350, 450],
        corrected: true
      },
      qtcFormula: 'bazett',
      qrsAxis: {
        normal: [-30, 90],
        leftDeviation: -30,
        rightDeviation: 90
      }
    };

    const cqlIntegration: CQLIntegration = {
      ruleEngine: null, // Would be injected
      ruleMappings: new Map([
        ['rule-08-afib-anticoagulation', {
          ruleId: 'rule-08',
          triggerFindings: ['atrial_fibrillation'],
          contextRequirements: ['patient_age', 'chads2vasc_score'],
          priority: 1,
          description: 'New atrial fibrillation anticoagulation screening'
        }]
      ]),
      contextBuilder: (findings, ecgData) => ({
        ecgFindings: findings,
        patientData: ecgData,
        timestamp: new Date()
      })
    };

    return {
      rhythmMappings,
      abnormalityMappings,
      measurementNorms,
      cqlIntegration
    };
  }

  private async applyClinicalThresholds(
    findings: ClinicalFindings,
    thresholds: ClinicalThresholds
  ): Promise<ClinicalFindings> {
    const adjustedFindings = { ...findings };

    // Adjust rhythm confidence based on sensitivity/specificity preferences
    adjustedFindings.rhythm = {
      ...findings.rhythm,
      rhythmConfidence: this.adjustConfidenceForThreshold(
        findings.rhythm.rhythmConfidence,
        thresholds.sensitivity,
        thresholds.specificity
      )
    };

    // Filter abnormalities based on custom thresholds
    const filteredAbnormalities = findings.abnormalities.abnormalities.filter(abnormality => {
      const customThreshold = thresholds.customThresholds?.[abnormality.finding];
      const threshold = customThreshold || thresholds.confidenceThreshold || 0.5;
      return abnormality.confidence >= threshold;
    });

    adjustedFindings.abnormalities = {
      ...findings.abnormalities,
      abnormalities: filteredAbnormalities
    };

    return adjustedFindings;
  }

  private adjustConfidenceForThreshold(
    confidence: number,
    sensitivity: number,
    specificity: number
  ): number {
    // Simple threshold adjustment based on desired sensitivity/specificity
    // In practice, this would use proper ROC curve analysis
    const balancePoint = (sensitivity + specificity) / 2;
    
    if (balancePoint > 0.8) {
      // High threshold - be more conservative
      return confidence * 0.9;
    } else if (balancePoint < 0.6) {
      // Low threshold - be more sensitive
      return Math.min(1.0, confidence * 1.1);
    }
    
    return confidence;
  }

  private async calibrateConfidence(findings: ClinicalFindings): Promise<ClinicalFindings> {
    // Use confidence calibrator to adjust overconfident predictions
    const calibratedFindings = { ...findings };

    calibratedFindings.rhythm.rhythmConfidence = 
      this.confidenceCalibrator.calibrate(findings.rhythm.rhythmConfidence, 'rhythm');

    calibratedFindings.abnormalities.abnormalities = findings.abnormalities.abnormalities.map(abnormality => ({
      ...abnormality,
      confidence: this.confidenceCalibrator.calibrate(abnormality.confidence, 'abnormality')
    }));

    return calibratedFindings;
  }

  private async addUncertaintyQuantification(findings: ClinicalFindings): Promise<ClinicalFindings> {
    // Add uncertainty estimates to findings
    const uncertaintyFindings = { ...findings };

    // Calculate uncertainty for rhythm findings
    const rhythmUncertainty = this.calculateUncertainty(
      findings.rhythm.rhythmConfidence,
      'rhythm'
    );

    // Add uncertainty metadata (would be stored separately in practice)
    (uncertaintyFindings.rhythm as any).uncertainty = rhythmUncertainty;

    return uncertaintyFindings;
  }

  private calculateUncertainty(confidence: number, type: string): UncertaintyQuantification {
    // Simplified uncertainty quantification
    const epistemic = 1 - confidence; // Model uncertainty
    const aleatoric = 0.1; // Assumed data uncertainty
    const total = Math.sqrt(epistemic * epistemic + aleatoric * aleatoric);

    return {
      epistemic,
      aleatoric,
      total,
      confidence: 1 - total,
      calibration: {
        expectedCalibrationError: 0.05,
        reliability: 0.9,
        resolution: 0.8,
        sharpness: 0.7
      }
    };
  }

  private async compareWithPriorECG(
    findings: ClinicalFindings,
    ecgData: ECGData
  ): Promise<ClinicalFindings> {
    try {
      // This would fetch prior ECG from database
      const priorECG = await this.fetchPriorECG(ecgData.patientId);
      
      if (!priorECG) {
        logger.info(`No prior ECG found for patient ${ecgData.patientId}`);
        return findings;
      }

      const comparison = await this.performECGComparison(findings, priorECG);
      
      // Add comparison results to findings
      const enhancedFindings = { ...findings };
      enhancedFindings.alerts.push(...this.generateDeltaAlerts(comparison));

      return enhancedFindings;

    } catch (error) {
      logger.error('Prior ECG comparison failed:', error);
      return findings; // Continue without comparison
    }
  }

  private async fetchPriorECG(patientId: string): Promise<any> {
    // Mock implementation - would query database
    return null;
  }

  private async performECGComparison(current: ClinicalFindings, prior: any): Promise<PriorECGComparison> {
    const deltaFindings: DeltaFinding[] = [];
    
    // Compare rhythm findings
    if (current.rhythm.primaryRhythm !== prior.rhythm?.primaryRhythm) {
      deltaFindings.push({
        category: 'rhythm',
        finding: current.rhythm.primaryRhythm,
        change: 'new',
        previousValue: prior.rhythm?.primaryRhythm,
        currentValue: current.rhythm.primaryRhythm,
        significance: 'high',
        clinicalImplication: 'Rhythm change requires evaluation'
      });
    }

    return {
      priorECGId: prior.id,
      priorDate: new Date(prior.date),
      deltaFindings,
      progression: deltaFindings.length > 0 ? 'new_findings' : 'stable',
      significantChanges: deltaFindings.some(d => d.significance === 'high')
    };
  }

  private generateDeltaAlerts(comparison: PriorECGComparison): ClinicalAlert[] {
    return comparison.deltaFindings
      .filter(delta => delta.significance === 'high')
      .map(delta => ({
        type: 'warning' as const,
        finding: delta.finding,
        message: `New ${delta.category}: ${delta.finding}`,
        actionRequired: delta.clinicalImplication,
        confidence: 0.9
      }));
  }

  private async generateClinicalAlerts(
    findings: ClinicalFindings,
    ecgData: ECGData
  ): Promise<ClinicalFindings> {
    const enhancedFindings = { ...findings };
    const alerts: ClinicalAlert[] = [...findings.alerts];

    // Generate rhythm-based alerts
    const rhythmKnowledge = this.clinicalKnowledge.rhythmMappings.get(findings.rhythm.primaryRhythm);
    if (rhythmKnowledge && rhythmKnowledge.severity !== 'normal') {
      alerts.push({
        type: this.mapSeverityToAlertType(rhythmKnowledge.severity),
        finding: findings.rhythm.primaryRhythm,
        message: `${rhythmKnowledge.clinicalName} detected`,
        actionRequired: rhythmKnowledge.recommendedActions.join('; '),
        confidence: findings.rhythm.rhythmConfidence
      });
    }

    // Generate abnormality-based alerts
    for (const abnormality of findings.abnormalities.abnormalities) {
      const abnormalityKnowledge = this.clinicalKnowledge.abnormalityMappings.get(abnormality.finding);
      if (abnormalityKnowledge) {
        alerts.push({
          type: 'warning',
          finding: abnormality.finding,
          message: `${abnormalityKnowledge.clinicalName} in leads ${abnormality.leads.join(', ')}`,
          actionRequired: abnormalityKnowledge.recommendedWorkup.join('; '),
          confidence: abnormality.confidence
        });
      }
    }

    // Generate measurement-based alerts
    if (findings.measurements) {
      alerts.push(...this.generateMeasurementAlerts(findings.measurements));
    }

    enhancedFindings.alerts = alerts;
    return enhancedFindings;
  }

  private mapSeverityToAlertType(severity: string): 'critical' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'urgent':
        return 'critical';
      case 'concerning':
        return 'warning';
      default:
        return 'info';
    }
  }

  private generateMeasurementAlerts(measurements: ECGMeasurements): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];
    const norms = this.clinicalKnowledge.measurementNorms;

    // Check PR interval
    if (measurements.prInterval < norms.prInterval.abnormal.short) {
      alerts.push({
        type: 'warning',
        finding: 'short_pr',
        message: `Short PR interval: ${measurements.prInterval}ms`,
        actionRequired: 'Consider pre-excitation syndrome evaluation',
        confidence: 0.9
      });
    } else if (measurements.prInterval > norms.prInterval.abnormal.long) {
      alerts.push({
        type: 'warning',
        finding: 'long_pr',
        message: `Prolonged PR interval: ${measurements.prInterval}ms`,
        actionRequired: 'Evaluate for AV block',
        confidence: 0.9
      });
    }

    // Check QRS duration
    if (measurements.qrsDuration > norms.qrsDuration.abnormal.wide) {
      alerts.push({
        type: 'warning',
        finding: 'wide_qrs',
        message: `Wide QRS complex: ${measurements.qrsDuration}ms`,
        actionRequired: 'Evaluate for bundle branch block or ventricular conduction delay',
        confidence: 0.9
      });
    }

    // Check QTc interval
    if (measurements.qtcInterval > 480) { // Prolonged QTc threshold
      const severity = measurements.qtcInterval > 500 ? 'critical' : 'warning';
      alerts.push({
        type: severity,
        finding: 'prolonged_qtc',
        message: `Prolonged QTc: ${measurements.qtcInterval}ms`,
        actionRequired: 'Review medications, electrolytes; consider inherited arrhythmia screening',
        confidence: 0.95,
        cqlRuleTriggered: 'rule-qtc-screening'
      });
    }

    return alerts;
  }

  private async integrateCQLRules(
    findings: ClinicalFindings,
    ecgData: ECGData
  ): Promise<ClinicalFindings> {
    if (!this.clinicalKnowledge.cqlIntegration.ruleEngine) {
      return findings; // No CQL engine available
    }

    const enhancedFindings = { ...findings };

    try {
      // Build context for CQL evaluation
      const context = this.clinicalKnowledge.cqlIntegration.contextBuilder(findings, ecgData);

      // Check each alert for CQL rule triggers
      for (const alert of findings.alerts) {
        if (alert.cqlRuleTriggered) {
          const ruleMapping = this.clinicalKnowledge.cqlIntegration.ruleMappings.get(alert.cqlRuleTriggered);
          if (ruleMapping) {
            const cqlResult = await this.evaluateCQLRule(ruleMapping, context);
            if (cqlResult.triggered) {
              // Add CQL-generated recommendations
              alert.actionRequired = [alert.actionRequired, cqlResult.recommendations].filter(Boolean).join('; ');
            }
          }
        }
      }

    } catch (error) {
      logger.error('CQL rule integration failed:', error);
    }

    return enhancedFindings;
  }

  private async evaluateCQLRule(ruleMapping: CQLRuleMapping, context: any): Promise<{ triggered: boolean; recommendations?: string }> {
    // Mock CQL evaluation - would integrate with actual CQL engine
    return {
      triggered: true,
      recommendations: 'CQL-generated clinical recommendations'
    };
  }

  private async mapRhythmOutput(rawOutput: any, modelId: string): Promise<RhythmFindings> {
    // Model-specific output mapping
    switch (modelId) {
      case 'ecgfounder-v1':
        return this.mapECGFounderRhythm(rawOutput);
      case 'ecg-fm-v1':
        return this.mapECGFMRhythm(rawOutput);
      case 'hubert-ecg-small-v1':
      case 'hubert-ecg-base-v1':
        return this.mapHuBERTRhythm(rawOutput);
      default:
        return this.mapGenericRhythm(rawOutput);
    }
  }

  private mapECGFounderRhythm(rawOutput: any): RhythmFindings {
    // ECGFounder-specific output format
    const rhythmProbs = rawOutput.rhythm_probabilities || {};
    const rhythmNames = Object.keys(rhythmProbs);
    const maxProb = Math.max(...Object.values(rhythmProbs) as number[]);
    const primaryRhythm = rhythmNames.find(name => rhythmProbs[name] === maxProb) || 'unknown';

    return {
      primaryRhythm,
      rhythmConfidence: maxProb,
      heartRate: rawOutput.heart_rate || 0,
      alternativeRhythms: rhythmNames
        .filter(name => name !== primaryRhythm)
        .map(name => ({ rhythm: name, confidence: rhythmProbs[name] }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
    };
  }

  private mapECGFMRhythm(rawOutput: any): RhythmFindings {
    // ECG-FM-specific output format (similar structure)
    return this.mapECGFounderRhythm(rawOutput);
  }

  private mapHuBERTRhythm(rawOutput: any): RhythmFindings {
    // HuBERT models output class probabilities
    const classes = rawOutput.classes || [];
    const probabilities = rawOutput.probabilities || [];
    
    if (classes.length !== probabilities.length) {
      throw new Error('Mismatched classes and probabilities in HuBERT output');
    }

    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const primaryRhythm = classes[maxIndex] || 'unknown';

    return {
      primaryRhythm,
      rhythmConfidence: probabilities[maxIndex] || 0,
      heartRate: rawOutput.heart_rate || this.estimateHeartRate(rawOutput),
      alternativeRhythms: classes
        .map((cls: string, idx: number) => ({ rhythm: cls, confidence: probabilities[idx] }))
        .filter((_: any, idx: number) => idx !== maxIndex)
        .sort((a: {confidence: number}, b: {confidence: number}) => b.confidence - a.confidence)
        .slice(0, 3)
    };
  }

  private mapGenericRhythm(rawOutput: any): RhythmFindings {
    // Generic rhythm mapping for unknown models
    return {
      primaryRhythm: rawOutput.rhythm || 'unknown',
      rhythmConfidence: rawOutput.confidence || 0,
      heartRate: rawOutput.heart_rate || 60
    };
  }

  private async mapAbnormalityOutput(rawOutput: any, modelId: string): Promise<AbnormalityFindings> {
    switch (modelId) {
      case 'ecgfounder-v1':
        return this.mapECGFounderAbnormalities(rawOutput);
      case 'ecg-fm-v1':
        return this.mapECGFMAbnormalities(rawOutput);
      default:
        return this.mapGenericAbnormalities(rawOutput);
    }
  }

  private mapECGFounderAbnormalities(rawOutput: any): AbnormalityFindings {
    const abnormalityProbs = rawOutput.abnormality_probabilities || {};
    const leadMapping = rawOutput.lead_mapping || {};

    const abnormalities = Object.entries(abnormalityProbs)
      .filter(([_, confidence]) => (confidence as number) > 0.3)
      .map(([finding, confidence]) => ({
        finding,
        confidence: confidence as number,
        leads: leadMapping[finding] || ['unknown'],
        severity: this.classifySeverity(confidence as number)
      }));

    const normalProb = rawOutput.normal_probability || 0;

    return {
      abnormalities,
      isNormal: abnormalities.length === 0 && normalProb > 0.7,
      normalConfidence: normalProb
    };
  }

  private mapECGFMAbnormalities(rawOutput: any): AbnormalityFindings {
    // Similar to ECGFounder but with potentially different structure
    return this.mapECGFounderAbnormalities(rawOutput);
  }

  private mapGenericAbnormalities(rawOutput: any): AbnormalityFindings {
    const abnormalities = rawOutput.abnormalities || [];
    
    return {
      abnormalities: abnormalities.map((abnormality: any) => ({
        finding: abnormality.name || 'unknown',
        confidence: abnormality.confidence || 0,
        leads: abnormality.leads || ['unknown']
      })),
      isNormal: abnormalities.length === 0,
      normalConfidence: rawOutput.normal_confidence || 0
    };
  }

  private classifySeverity(confidence: number): 'mild' | 'moderate' | 'severe' {
    if (confidence > 0.8) return 'severe';
    if (confidence > 0.6) return 'moderate';
    return 'mild';
  }

  private async mapMorphologyOutput(rawOutput: any, modelId: string): Promise<MorphologyFindings> {
    // Morphology analysis is typically more detailed
    return {
      pWave: rawOutput.p_wave ? {
        duration: rawOutput.p_wave.duration || 0,
        amplitude: rawOutput.p_wave.amplitude || 0,
        morphology: rawOutput.p_wave.morphology || 'normal',
        abnormalities: rawOutput.p_wave.abnormalities || []
      } : undefined,
      qrsComplex: rawOutput.qrs_complex ? {
        duration: rawOutput.qrs_complex.duration || 0,
        amplitude: rawOutput.qrs_complex.amplitude || 0,
        morphology: rawOutput.qrs_complex.morphology || 'normal',
        abnormalities: rawOutput.qrs_complex.abnormalities || []
      } : undefined,
      tWave: rawOutput.t_wave ? {
        duration: rawOutput.t_wave.duration || 0,
        amplitude: rawOutput.t_wave.amplitude || 0,
        morphology: rawOutput.t_wave.morphology || 'normal',
        abnormalities: rawOutput.t_wave.abnormalities || []
      } : undefined
    };
  }

  private async extractMeasurements(rawOutput: any, modelId: string): Promise<ECGMeasurements | undefined> {
    if (!rawOutput.measurements) return undefined;

    const measurements = rawOutput.measurements;
    
    return {
      prInterval: measurements.pr_interval || 0,
      qrsDuration: measurements.qrs_duration || 0,
      qtInterval: measurements.qt_interval || 0,
      qtcInterval: measurements.qtc_interval || this.calculateQTc(measurements.qt_interval, measurements.heart_rate),
      qrsAxis: measurements.qrs_axis || 0,
      tAxis: measurements.t_axis
    };
  }

  private calculateQTc(qtInterval: number, heartRate: number): number {
    if (!qtInterval || !heartRate) return 0;
    
    const rr = 60 / heartRate; // RR interval in seconds
    
    // Bazett's formula: QTc = QT / sqrt(RR)
    return Math.round(qtInterval / Math.sqrt(rr));
  }

  private estimateHeartRate(rawOutput: any): number {
    // Estimate heart rate from other available data
    return rawOutput.rr_interval ? Math.round(60 / rawOutput.rr_interval) : 60;
  }

  private async buildClinicalConclusion(findings: ClinicalFindings): Promise<string> {
    const conclusions: string[] = [];

    // Rhythm conclusion
    const rhythmKnowledge = this.clinicalKnowledge.rhythmMappings.get(findings.rhythm.primaryRhythm);
    if (rhythmKnowledge) {
      conclusions.push(`Rhythm: ${rhythmKnowledge.clinicalName} (confidence: ${Math.round(findings.rhythm.rhythmConfidence * 100)}%)`);
    }

    // Abnormality conclusions
    if (findings.abnormalities.abnormalities.length > 0) {
      const abnormalityDescriptions = findings.abnormalities.abnormalities.map(abnormality => {
        const knowledge = this.clinicalKnowledge.abnormalityMappings.get(abnormality.finding);
        const name = knowledge?.clinicalName || abnormality.finding;
        return `${name} in ${abnormality.leads.join(', ')}`;
      });
      conclusions.push(`Abnormalities: ${abnormalityDescriptions.join('; ')}`);
    } else if (findings.abnormalities.isNormal) {
      conclusions.push('No significant abnormalities detected');
    }

    // Measurement conclusions
    if (findings.measurements) {
      const measurementText = this.formatMeasurements(findings.measurements);
      conclusions.push(`Measurements: ${measurementText}`);
    }

    // Alert summary
    const criticalAlerts = findings.alerts.filter(alert => alert.type === 'critical');
    if (criticalAlerts.length > 0) {
      conclusions.push(`CRITICAL FINDINGS: ${criticalAlerts.map(alert => alert.finding).join(', ')}`);
    }

    return conclusions.join('\n\n');
  }

  private formatMeasurements(measurements: ECGMeasurements): string {
    const parts: string[] = [];
    
    parts.push(`PR: ${measurements.prInterval}ms`);
    parts.push(`QRS: ${measurements.qrsDuration}ms`);
    parts.push(`QTc: ${measurements.qtcInterval}ms`);
    parts.push(`Axis: ${measurements.qrsAxis}°`);
    
    return parts.join(', ');
  }

  private async mapFindingsToFHIR(findings: ClinicalFindings): Promise<Array<{ coding: Array<{ system: string; code: string; display: string }> }>> {
    const codes: Array<{ coding: Array<{ system: string; code: string; display: string }> }> = [];

    // Map rhythm findings
    const rhythmKnowledge = this.clinicalKnowledge.rhythmMappings.get(findings.rhythm.primaryRhythm);
    if (rhythmKnowledge) {
      codes.push({
        coding: [{
          system: 'http://snomed.info/sct',
          code: rhythmKnowledge.snomed,
          display: rhythmKnowledge.clinicalName
        }]
      });
    }

    // Map abnormality findings
    for (const abnormality of findings.abnormalities.abnormalities) {
      const abnormalityKnowledge = this.clinicalKnowledge.abnormalityMappings.get(abnormality.finding);
      if (abnormalityKnowledge) {
        codes.push({
          coding: [{
            system: 'http://snomed.info/sct',
            code: abnormalityKnowledge.snomed,
            display: abnormalityKnowledge.clinicalName
          }]
        });
      }
    }

    return codes;
  }
}

class ConfidenceCalibrator {
  private calibrationData: Map<string, CalibrationFunction> = new Map();

  async initialize(): Promise<void> {
    // Initialize calibration functions based on validation data
    // In practice, this would load calibration curves from historical data
    
    this.calibrationData.set('rhythm', new PlattScalingCalibration([1.2, -0.5])); // Example parameters
    this.calibrationData.set('abnormality', new PlattScalingCalibration([1.1, -0.3]));
  }

  calibrate(rawConfidence: number, type: string): number {
    const calibrator = this.calibrationData.get(type);
    if (!calibrator) return rawConfidence;
    
    return calibrator.calibrate(rawConfidence);
  }
}

interface CalibrationFunction {
  calibrate(rawConfidence: number): number;
}

class PlattScalingCalibration implements CalibrationFunction {
  constructor(private parameters: [number, number]) {}

  calibrate(rawConfidence: number): number {
    const [a, b] = this.parameters;
    const logit = Math.log(rawConfidence / (1 - rawConfidence));
    const calibratedLogit = a * logit + b;
    return 1 / (1 + Math.exp(-calibratedLogit));
  }
}