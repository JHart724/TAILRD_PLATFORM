import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface QualityMeasureResult {
  measureCode: string;
  measureName: string;
  numerator: number;
  denominator: number;
  rate: number;
  target?: number;
  nationalBenchmark?: number;
  previousRate?: number;
  exclusions?: number;
  reportingPeriod: string;
  periodStart: Date;
  periodEnd: Date;
  status: 'meeting_target' | 'below_target' | 'improvement_needed';
  trend: 'improving' | 'declining' | 'stable';
}

export interface PatientQualityGap {
  patientId: string;
  measureCode: string;
  measureName: string;
  gapType: 'missing_medication' | 'missing_monitoring' | 'missing_follow_up' | 'suboptimal_control';
  description: string;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // Impact on measure rate if addressed
}

export interface QualityDashboard {
  hospitalId: string;
  reportingPeriod: string;
  measures: QualityMeasureResult[];
  overallPerformance: number;
  patientsAtRisk: number;
  improvementOpportunities: PatientQualityGap[];
  trends: {
    measureCode: string;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }[];
}

export interface CMSMeasureDefinition {
  code: string;
  name: string;
  description: string;
  numeratorCriteria: string[];
  denominatorCriteria: string[];
  exclusionCriteria: string[];
  target: number;
  reportingFrequency: 'monthly' | 'quarterly' | 'annually';
  module: string[];
}

export class QualityMeasureService {
  private prisma: PrismaClient;

  // CMS eCQM Definitions
  private readonly CMS_MEASURES: Record<string, CMSMeasureDefinition> = {
    'CMS144': {
      code: 'CMS144',
      name: 'Heart Failure (HF): Beta-Blocker Therapy for Left Ventricular Systolic Dysfunction (LVSD)',
      description: 'Percentage of patients with HF with LVSD who were prescribed beta-blocker therapy',
      numeratorCriteria: [
        'beta_blocker_prescribed',
        'carvedilol OR metoprolol_succinate OR bisoprolol'
      ],
      denominatorCriteria: [
        'heart_failure_diagnosis',
        'left_ventricular_systolic_dysfunction',
        'age >= 18',
        'encounter_during_measurement_period'
      ],
      exclusionCriteria: [
        'beta_blocker_contraindication',
        'patient_refusal',
        'medical_reason',
        'hospice_care'
      ],
      target: 0.85,
      reportingFrequency: 'quarterly',
      module: ['HEART_FAILURE']
    },
    'CMS145': {
      code: 'CMS145',
      name: 'Coronary Artery Disease (CAD): Beta-Blocker Therapy for CAD Patients with Prior MI',
      description: 'Percentage of patients with CAD and prior MI who were prescribed beta-blocker therapy',
      numeratorCriteria: [
        'beta_blocker_prescribed',
        'carvedilol OR metoprolol OR atenolol'
      ],
      denominatorCriteria: [
        'coronary_artery_disease_diagnosis',
        'prior_myocardial_infarction',
        'age >= 18',
        'encounter_during_measurement_period'
      ],
      exclusionCriteria: [
        'beta_blocker_contraindication',
        'patient_refusal',
        'medical_reason'
      ],
      target: 0.90,
      reportingFrequency: 'quarterly',
      module: ['CORONARY_INTERVENTION', 'HEART_FAILURE']
    },
    'CMS135': {
      code: 'CMS135',
      name: 'Heart Failure (HF): Angiotensin-Converting Enzyme (ACE) Inhibitor or Angiotensin Receptor Blocker (ARB) or ARNI Therapy for LVSD',
      description: 'Percentage of patients with HF and LVSD who were prescribed ACE inhibitor, ARB, or ARNI therapy',
      numeratorCriteria: [
        'ace_arb_arni_prescribed',
        'lisinopril OR enalapril OR losartan OR valsartan OR sacubitril_valsartan'
      ],
      denominatorCriteria: [
        'heart_failure_diagnosis',
        'left_ventricular_systolic_dysfunction',
        'age >= 18',
        'encounter_during_measurement_period'
      ],
      exclusionCriteria: [
        'ace_arb_contraindication',
        'angioedema_history',
        'hyperkalemia',
        'patient_refusal'
      ],
      target: 0.85,
      reportingFrequency: 'quarterly',
      module: ['HEART_FAILURE']
    },
    'CMS347': {
      code: 'CMS347',
      name: 'Statin Therapy for the Prevention and Treatment of Cardiovascular Disease',
      description: 'Percentage of patients with clinical atherosclerotic cardiovascular disease (ASCVD) who were prescribed high-intensity statin therapy',
      numeratorCriteria: [
        'high_intensity_statin_prescribed',
        'atorvastatin >= 40mg OR rosuvastatin >= 20mg'
      ],
      denominatorCriteria: [
        'clinical_ascvd',
        'age >= 21',
        'encounter_during_measurement_period'
      ],
      exclusionCriteria: [
        'statin_contraindication',
        'muscle_disease',
        'liver_disease',
        'patient_refusal'
      ],
      target: 0.80,
      reportingFrequency: 'quarterly',
      module: ['CORONARY_INTERVENTION', 'HEART_FAILURE', 'PERIPHERAL_VASCULAR']
    },
    'CMS236': {
      code: 'CMS236',
      name: 'Controlling High Blood Pressure',
      description: 'Percentage of patients with hypertension whose blood pressure was adequately controlled',
      numeratorCriteria: [
        'blood_pressure_controlled',
        'systolic_bp < 140 AND diastolic_bp < 90'
      ],
      denominatorCriteria: [
        'hypertension_diagnosis',
        'age >= 18',
        'encounter_during_measurement_period'
      ],
      exclusionCriteria: [
        'pregnancy',
        'end_stage_renal_disease',
        'hospice_care'
      ],
      target: 0.70,
      reportingFrequency: 'quarterly',
      module: ['HEART_FAILURE', 'CORONARY_INTERVENTION', 'PERIPHERAL_VASCULAR']
    }
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate quality measures for a hospital and reporting period
   */
  async calculateQualityMeasures(
    hospitalId: string, 
    reportingPeriod: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<QualityMeasureResult[]> {
    try {
      logger.info('Calculating quality measures', { 
        hospitalId, 
        reportingPeriod, 
        periodStart, 
        periodEnd 
      });

      const results: QualityMeasureResult[] = [];

      for (const [measureCode, definition] of Object.entries(this.CMS_MEASURES)) {
        try {
          const result = await this.calculateSingleMeasure(
            hospitalId,
            definition,
            periodStart,
            periodEnd,
            reportingPeriod
          );
          
          if (result) {
            results.push(result);
          }
        } catch (error) {
          logger.error(`Failed to calculate measure ${measureCode}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            hospitalId,
            measureCode
          });
        }
      }

      // Store results in database
      await this.storeMeasureResults(hospitalId, results);

      logger.info('Quality measures calculated', {
        hospitalId,
        resultCount: results.length,
        measures: results.map(r => r.measureCode)
      });

      return results;

    } catch (error) {
      logger.error('Failed to calculate quality measures', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hospitalId
      });
      throw error;
    }
  }

  /**
   * Identify patients falling out of quality measures
   */
  async identifyQualityGaps(
    hospitalId: string,
    measureCode?: string
  ): Promise<PatientQualityGap[]> {
    try {
      logger.info('Identifying quality gaps', { hospitalId, measureCode });

      const gaps: PatientQualityGap[] = [];
      const measuresToCheck = measureCode ? [measureCode] : Object.keys(this.CMS_MEASURES);

      for (const code of measuresToCheck) {
        const measureDefinition = this.CMS_MEASURES[code];
        if (!measureDefinition) continue;

        const measureGaps = await this.findMeasureGaps(hospitalId, measureDefinition);
        gaps.push(...measureGaps);
      }

      // Sort gaps by priority and impact
      gaps.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) return priorityDiff;
        return b.estimatedImpact - a.estimatedImpact;
      });

      logger.info('Quality gaps identified', {
        hospitalId,
        gapCount: gaps.length,
        highPriorityGaps: gaps.filter(g => g.priority === 'high').length
      });

      return gaps;

    } catch (error) {
      logger.error('Failed to identify quality gaps', { error, hospitalId });
      return [];
    }
  }

  /**
   * Generate quality improvement reports
   */
  async generateQualityReport(
    hospitalId: string,
    reportingPeriod: string
  ): Promise<QualityDashboard> {
    try {
      const [year, quarter] = reportingPeriod.split('-');
      const periodStart = this.getQuarterStart(parseInt(year), parseInt(quarter.replace('Q', '')));
      const periodEnd = this.getQuarterEnd(parseInt(year), parseInt(quarter.replace('Q', '')));

      // Calculate current measures
      const measures = await this.calculateQualityMeasures(hospitalId, reportingPeriod, periodStart, periodEnd);

      // Calculate overall performance
      const overallPerformance = measures.length > 0 
        ? measures.reduce((sum, m) => sum + m.rate, 0) / measures.length
        : 0;

      // Get patients at risk
      const patientsAtRisk = await this.countPatientsAtRisk(hospitalId, periodStart, periodEnd);

      // Identify improvement opportunities
      const improvementOpportunities = await this.identifyQualityGaps(hospitalId);

      // Calculate trends
      const trends = await this.calculateMeasureTrends(hospitalId, reportingPeriod);

      const dashboard: QualityDashboard = {
        hospitalId,
        reportingPeriod,
        measures,
        overallPerformance,
        patientsAtRisk,
        improvementOpportunities: improvementOpportunities.slice(0, 20), // Top 20
        trends
      };

      return dashboard;

    } catch (error) {
      logger.error('Failed to generate quality report', { error, hospitalId });
      throw error;
    }
  }

  /**
   * Get quality measure history for trending
   */
  async getMeasureHistory(
    hospitalId: string,
    measureCode: string,
    periods: number = 8
  ): Promise<QualityMeasureResult[]> {
    try {
      return await this.prisma.qualityMeasure.findMany({
        where: {
          hospitalId,
          measureCode
        },
        orderBy: { periodStart: 'desc' },
        take: periods
      }).then(results => results.map(result => ({
        measureCode: result.measureCode,
        measureName: result.measureName,
        numerator: result.numerator,
        denominator: result.denominator,
        rate: result.rate,
        target: result.target || undefined,
        nationalBenchmark: result.nationalBenchmark || undefined,
        previousRate: result.previousRate || undefined,
        exclusions: result.exclusions || undefined,
        reportingPeriod: result.reportingPeriod,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        status: this.determineMeasureStatus(result.rate, result.target || 0),
        trend: this.calculateTrend(result.rate, result.previousRate || 0)
      })));

    } catch (error) {
      logger.error('Failed to get measure history', { error, hospitalId, measureCode });
      return [];
    }
  }

  /**
   * Calculate a single quality measure
   */
  private async calculateSingleMeasure(
    hospitalId: string,
    definition: CMSMeasureDefinition,
    periodStart: Date,
    periodEnd: Date,
    reportingPeriod: string
  ): Promise<QualityMeasureResult | null> {
    try {
      // Get eligible patients (denominator)
      const eligiblePatients = await this.getEligiblePatients(
        hospitalId,
        definition.denominatorCriteria,
        periodStart,
        periodEnd
      );

      // Remove excluded patients
      const excludedPatients = await this.getExcludedPatients(
        hospitalId,
        eligiblePatients,
        definition.exclusionCriteria,
        periodStart,
        periodEnd
      );

      const denominator = eligiblePatients.length - excludedPatients.length;

      if (denominator === 0) {
        return null;
      }

      // Find patients meeting numerator criteria
      const numeratorPatients = await this.getNumeratorPatients(
        hospitalId,
        eligiblePatients.filter(p => !excludedPatients.includes(p)),
        definition.numeratorCriteria,
        periodStart,
        periodEnd
      );

      const numerator = numeratorPatients.length;
      const rate = denominator > 0 ? numerator / denominator : 0;

      // Get previous rate for comparison
      const previousRate = await this.getPreviousMeasureRate(
        hospitalId,
        definition.code,
        periodStart
      );

      const result: QualityMeasureResult = {
        measureCode: definition.code,
        measureName: definition.name,
        numerator,
        denominator,
        rate,
        target: definition.target,
        nationalBenchmark: await this.getNationalBenchmark(definition.code) ?? undefined,
        previousRate: previousRate ?? undefined,
        exclusions: excludedPatients.length,
        reportingPeriod,
        periodStart,
        periodEnd,
        status: this.determineMeasureStatus(rate, definition.target),
        trend: this.calculateTrend(rate, previousRate)
      };

      return result;

    } catch (error) {
      logger.error('Failed to calculate single measure', { 
        error, 
        hospitalId, 
        measureCode: definition.code 
      });
      return null;
    }
  }

  /**
   * Find quality gaps for a specific measure
   */
  private async findMeasureGaps(
    hospitalId: string,
    definition: CMSMeasureDefinition
  ): Promise<PatientQualityGap[]> {
    const gaps: PatientQualityGap[] = [];

    try {
      // Get patients who should be in numerator but aren't
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - 3); // Last 3 months
      const periodEnd = new Date();

      const eligiblePatients = await this.getEligiblePatients(
        hospitalId,
        definition.denominatorCriteria,
        periodStart,
        periodEnd
      );

      const excludedPatients = await this.getExcludedPatients(
        hospitalId,
        eligiblePatients,
        definition.exclusionCriteria,
        periodStart,
        periodEnd
      );

      const denominatorPatients = eligiblePatients.filter(p => !excludedPatients.includes(p));
      
      const numeratorPatients = await this.getNumeratorPatients(
        hospitalId,
        denominatorPatients,
        definition.numeratorCriteria,
        periodStart,
        periodEnd
      );

      const patientsWithGaps = denominatorPatients.filter(p => !numeratorPatients.includes(p));

      for (const patientId of patientsWithGaps) {
        const gapAnalysis = await this.analyzePatientGap(patientId, definition);
        
        if (gapAnalysis) {
          gaps.push({
            patientId,
            measureCode: definition.code,
            measureName: definition.name,
            gapType: gapAnalysis.gapType,
            description: gapAnalysis.description,
            recommendations: gapAnalysis.recommendations,
            priority: gapAnalysis.priority,
            estimatedImpact: 1 / denominatorPatients.length // Each patient represents this much of the measure
          });
        }
      }

    } catch (error) {
      logger.error('Failed to find measure gaps', { error, measureCode: definition.code });
    }

    return gaps;
  }

  /**
   * Store measure results in database
   */
  private async storeMeasureResults(hospitalId: string, results: QualityMeasureResult[]): Promise<void> {
    try {
      for (const result of results) {
        await this.prisma.qualityMeasure.upsert({
          where: {
            hospitalId_measureCode_reportingPeriod: {
              hospitalId,
              measureCode: result.measureCode,
              reportingPeriod: result.reportingPeriod
            }
          },
          update: {
            numerator: result.numerator,
            denominator: result.denominator,
            rate: result.rate,
            target: result.target,
            nationalBenchmark: result.nationalBenchmark,
            previousRate: result.previousRate,
            exclusions: result.exclusions
          },
          create: {
            hospitalId,
            measureCode: result.measureCode,
            measureName: result.measureName,
            measureDescription: this.CMS_MEASURES[result.measureCode].description,
            numerator: result.numerator,
            denominator: result.denominator,
            rate: result.rate,
            reportingPeriod: result.reportingPeriod,
            periodStart: result.periodStart,
            periodEnd: result.periodEnd,
            target: result.target,
            nationalBenchmark: result.nationalBenchmark,
            previousRate: result.previousRate,
            exclusions: result.exclusions
          }
        });
      }

      logger.info('Stored quality measure results', { 
        hospitalId, 
        resultCount: results.length 
      });

    } catch (error) {
      logger.error('Failed to store measure results', { error, hospitalId });
      throw error;
    }
  }

  // Helper methods (mock implementations)

  private async getEligiblePatients(
    hospitalId: string,
    criteria: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    // Mock implementation - would query patients based on denominator criteria
    // This would involve checking diagnosis codes, encounters, age, etc.
    return [];
  }

  private async getExcludedPatients(
    hospitalId: string,
    eligiblePatients: string[],
    exclusionCriteria: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    // Mock implementation - would check exclusion criteria
    return [];
  }

  private async getNumeratorPatients(
    hospitalId: string,
    denominatorPatients: string[],
    numeratorCriteria: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    // Mock implementation - would check if patients meet numerator criteria
    // This would involve checking medication orders, lab values, etc.
    return [];
  }

  private async getPreviousMeasureRate(
    hospitalId: string,
    measureCode: string,
    currentPeriodStart: Date
  ): Promise<number | null> {
    try {
      const previousMeasure = await this.prisma.qualityMeasure.findFirst({
        where: {
          hospitalId,
          measureCode,
          periodStart: { lt: currentPeriodStart }
        },
        orderBy: { periodStart: 'desc' }
      });

      return previousMeasure?.rate || null;

    } catch (error) {
      logger.error('Failed to get previous measure rate', { error });
      return null;
    }
  }

  private async getNationalBenchmark(measureCode: string): Promise<number | null> {
    // Mock implementation - would fetch from external benchmarking service
    const benchmarks: Record<string, number> = {
      'CMS144': 0.82,
      'CMS145': 0.88,
      'CMS135': 0.81,
      'CMS347': 0.75,
      'CMS236': 0.68
    };

    return benchmarks[measureCode] || null;
  }

  private async countPatientsAtRisk(
    hospitalId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    try {
      return await this.prisma.patient.count({
        where: {
          hospitalId,
          isActive: true,
          // Additional criteria for at-risk patients
          OR: [
            { heartFailurePatient: true },
            { coronaryPatient: true }
          ]
        }
      });
    } catch (error) {
      logger.error('Failed to count patients at risk', { error });
      return 0;
    }
  }

  private async calculateMeasureTrends(
    hospitalId: string,
    currentPeriod: string
  ): Promise<Array<{ measureCode: string; trend: 'up' | 'down' | 'stable'; changePercent: number }>> {
    const trends = [];

    for (const measureCode of Object.keys(this.CMS_MEASURES)) {
      try {
        const history = await this.getMeasureHistory(hospitalId, measureCode, 2);
        
        if (history.length >= 2) {
          const current = history[0].rate;
          const previous = history[1].rate;
          const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
          
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (Math.abs(changePercent) > 2) { // More than 2% change
            trend = changePercent > 0 ? 'up' : 'down';
          }

          trends.push({
            measureCode,
            trend,
            changePercent: Math.round(changePercent * 100) / 100
          });
        }
      } catch (error) {
        logger.error('Failed to calculate trend', { error, measureCode });
      }
    }

    return trends;
  }

  private async analyzePatientGap(
    patientId: string,
    definition: CMSMeasureDefinition
  ): Promise<{
    gapType: PatientQualityGap['gapType'];
    description: string;
    recommendations: string[];
    priority: PatientQualityGap['priority'];
  } | null> {
    
    // Mock implementation - would analyze why patient doesn't meet criteria
    const gapTypes = ['missing_medication', 'missing_monitoring', 'missing_follow_up'] as const;
    const gapType = gapTypes[Math.floor(Math.random() * gapTypes.length)];

    const gapDescriptions = {
      'missing_medication': 'Required medication not prescribed or documented',
      'missing_monitoring': 'Required monitoring not performed within timeframe',
      'missing_follow_up': 'Follow-up appointment not scheduled or attended',
      'suboptimal_control': 'Clinical targets not achieved'
    };

    const recommendations = this.getGapRecommendations(definition.code, gapType);

    return {
      gapType,
      description: gapDescriptions[gapType],
      recommendations,
      priority: 'medium'
    };
  }

  private getGapRecommendations(measureCode: string, gapType: string): string[] {
    const recommendationMap: Record<string, Record<string, string[]>> = {
      'CMS144': {
        'missing_medication': [
          'Prescribe evidence-based beta-blocker (carvedilol, metoprolol succinate, or bisoprolol)',
          'Start at low dose and titrate per guidelines',
          'Document contraindications if medication not appropriate'
        ]
      },
      'CMS145': {
        'missing_medication': [
          'Prescribe beta-blocker therapy for post-MI patient',
          'Ensure appropriate drug selection and dosing',
          'Monitor for tolerance and side effects'
        ]
      }
    };

    return recommendationMap[measureCode]?.[gapType] || ['Review patient case for improvement opportunities'];
  }

  private determineMeasureStatus(rate: number, target: number): 'meeting_target' | 'below_target' | 'improvement_needed' {
    if (rate >= target) {
      return 'meeting_target';
    } else if (rate >= target * 0.9) {
      return 'below_target';
    } else {
      return 'improvement_needed';
    }
  }

  private calculateTrend(currentRate: number, previousRate: number | null): 'improving' | 'declining' | 'stable' {
    if (previousRate === null) {
      return 'stable';
    }

    const changePercent = ((currentRate - previousRate) / previousRate) * 100;
    
    if (changePercent > 2) {
      return 'improving';
    } else if (changePercent < -2) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  private getQuarterStart(year: number, quarter: number): Date {
    const month = (quarter - 1) * 3;
    return new Date(year, month, 1);
  }

  private getQuarterEnd(year: number, quarter: number): Date {
    const month = quarter * 3;
    return new Date(year, month, 0); // Last day of previous month
  }
}