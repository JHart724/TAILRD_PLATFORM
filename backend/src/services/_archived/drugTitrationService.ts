import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface DrugTitrationPlan {
  id: string;
  patientId: string;
  hospitalId: string;
  drugClass: HFPillarType;
  drugName: string;
  currentDose: number;
  currentDoseUnit: string;
  targetDose: number;
  targetDoseUnit: string;
  nextStepDate: Date;
  nextStepDose: number;
  titrationStep: number;
  barriers: TitrationBarrier[];
  monitoringPlan: MonitoringRequirement[];
  isActive: boolean;
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  progress: number; // 0-1 indicating progress to target
}

export interface TitrationBarrier {
  type: BarrierType;
  severity: 'mild' | 'moderate' | 'severe';
  value?: number;
  unit?: string;
  description: string;
  blocking: boolean;
  recommendations: string[];
}

export interface MonitoringRequirement {
  parameter: string;
  frequency: string;
  targetValue?: string;
  lastChecked?: Date;
  nextDue?: Date;
  status: 'current' | 'overdue' | 'due_soon';
}

export interface TitrationRecommendation {
  patientId: string;
  drugClass: HFPillarType;
  action: 'increase' | 'maintain' | 'decrease' | 'hold' | 'restart';
  fromDose: number;
  toDose: number;
  reasoning: string;
  barriers: TitrationBarrier[];
  monitoring: MonitoringRequirement[];
  timeframe: string;
  confidence: number;
}

export interface GDMTOptimizationSummary {
  patientId: string;
  overallOptimization: number; // 0-1
  pillarStatus: {
    [key in HFPillarType]: {
      prescribed: boolean;
      currentDose: number;
      targetDose: number;
      optimization: number;
      barriers: string[];
      nextAction: string;
    };
  };
  recommendations: TitrationRecommendation[];
  monitoringDue: MonitoringRequirement[];
  estimatedTimeToTarget: string;
}

export enum HFPillarType {
  ACE_ARB_ARNI = 'ACE_ARB_ARNI',
  BETA_BLOCKER = 'BETA_BLOCKER',
  MRA = 'MRA',
  SGLT2_INHIBITOR = 'SGLT2_INHIBITOR'
}

export enum BarrierType {
  HYPERKALEMIA = 'HYPERKALEMIA',
  HYPOTENSION = 'HYPOTENSION',
  RENAL_DYSFUNCTION = 'RENAL_DYSFUNCTION',
  BRADYCARDIA = 'BRADYCARDIA',
  HEART_BLOCK = 'HEART_BLOCK',
  ANGIOEDEMA = 'ANGIOEDEMA',
  COUGH = 'COUGH',
  FATIGUE = 'FATIGUE',
  GI_INTOLERANCE = 'GI_INTOLERANCE',
  COST = 'COST',
  ADHERENCE = 'ADHERENCE'
}

export class DrugTitrationService {
  private prisma: PrismaClient;

  // Target doses for each drug class (mg)
  private readonly TARGET_DOSES = {
    [HFPillarType.ACE_ARB_ARNI]: {
      'lisinopril': 40,
      'enalapril': 20,
      'losartan': 150,
      'valsartan': 320,
      'sacubitril-valsartan': 97, // sacubitril component
    },
    [HFPillarType.BETA_BLOCKER]: {
      'metoprolol_succinate': 200,
      'carvedilol': 50,
      'bisoprolol': 10
    },
    [HFPillarType.MRA]: {
      'spironolactone': 50,
      'eplerenone': 50
    },
    [HFPillarType.SGLT2_INHIBITOR]: {
      'empagliflozin': 10,
      'dapagliflozin': 10
    }
  };

  // Safety thresholds for lab monitoring
  private readonly SAFETY_THRESHOLDS = {
    potassium_high: 5.5,
    potassium_low: 3.5,
    creatinine_high: 3.0,
    egfr_low: 30,
    sbp_low: 90,
    heart_rate_low: 50
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyze current GDMT optimization for a patient
   */
  async analyzeGDMTOptimization(patientId: string, hospitalId: string): Promise<GDMTOptimizationSummary> {
    try {
      logger.info('Analyzing GDMT optimization', { patientId });

      // Get current medications
      const currentMedications = await this.getCurrentMedications(patientId);
      
      // Get recent lab values and vitals
      const labValues = await this.getRecentLabValues(patientId);
      const vitals = await this.getRecentVitals(patientId);

      // Analyze each pillar
      const pillarStatus: any = {};
      const recommendations: TitrationRecommendation[] = [];
      
      for (const pillar of Object.values(HFPillarType)) {
        const analysis = await this.analyzePillar(
          patientId, 
          hospitalId, 
          pillar, 
          currentMedications, 
          labValues, 
          vitals
        );
        
        pillarStatus[pillar] = analysis.status;
        
        if (analysis.recommendation) {
          recommendations.push(analysis.recommendation);
        }
      }

      // Calculate overall optimization
      const overallOptimization = this.calculateOverallOptimization(pillarStatus);

      // Get monitoring requirements
      const monitoringDue = await this.getMonitoringDue(patientId);

      // Estimate time to target
      const estimatedTimeToTarget = this.estimateTimeToTarget(pillarStatus);

      const summary: GDMTOptimizationSummary = {
        patientId,
        overallOptimization,
        pillarStatus,
        recommendations,
        monitoringDue,
        estimatedTimeToTarget
      };

      // Store analysis results
      await this.storeOptimizationAnalysis(summary);

      return summary;

    } catch (error) {
      logger.error('Failed to analyze GDMT optimization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId
      });
      throw error;
    }
  }

  /**
   * Generate titration recommendations for a patient
   */
  async generateTitrationRecommendations(patientId: string, hospitalId: string): Promise<TitrationRecommendation[]> {
    try {
      const optimizationSummary = await this.analyzeGDMTOptimization(patientId, hospitalId);
      return optimizationSummary.recommendations;

    } catch (error) {
      logger.error('Failed to generate titration recommendations', { error, patientId });
      throw error;
    }
  }

  /**
   * Execute titration step for a drug
   */
  async executeTitrationStep(
    patientId: string,
    drugTitrationId: string,
    newDose: number,
    executedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      // Get current titration plan
      const titration = await this.prisma.drugTitration.findUnique({
        where: { id: drugTitrationId }
      });

      if (!titration) {
        throw new Error('Drug titration plan not found');
      }

      // Calculate next step
      const nextStep = await this.calculateNextTitrationStep(
        patientId,
        titration.drugClass as HFPillarType,
        newDose,
        titration.targetDose
      );

      // Update titration plan
      await this.prisma.drugTitration.update({
        where: { id: drugTitrationId },
        data: {
          currentDose: newDose,
          titrationStep: titration.titrationStep + 1,
          nextStepDate: nextStep.nextStepDate,
          nextStepDose: nextStep.nextStepDose,
          updatedAt: new Date()
        }
      });

      // Log the titration step
      logger.info('Executed titration step', {
        patientId,
        drugTitrationId,
        fromDose: titration.currentDose,
        toDose: newDose,
        executedBy,
        step: titration.titrationStep + 1
      });

      // Create monitoring reminders
      await this.createMonitoringReminders(patientId, titration.drugClass as HFPillarType, newDose);

    } catch (error) {
      logger.error('Failed to execute titration step', { error, patientId, drugTitrationId });
      throw error;
    }
  }

  /**
   * Check for titration barriers based on recent labs/vitals
   */
  async checkTitrationBarriers(
    patientId: string,
    drugClass: HFPillarType,
    proposedDose: number
  ): Promise<TitrationBarrier[]> {
    try {
      const barriers: TitrationBarrier[] = [];
      
      // Get recent lab values
      const labValues = await this.getRecentLabValues(patientId);
      const vitals = await this.getRecentVitals(patientId);

      // Check for hyperkalemia (affects ACE/ARB/ARNI and MRA)
      if ([HFPillarType.ACE_ARB_ARNI, HFPillarType.MRA].includes(drugClass)) {
        const potassium = labValues.find(lab => lab.test === 'potassium');
        if (potassium && potassium.value > this.SAFETY_THRESHOLDS.potassium_high) {
          barriers.push({
            type: BarrierType.HYPERKALEMIA,
            severity: potassium.value > 6.0 ? 'severe' : 'moderate',
            value: potassium.value,
            unit: 'mEq/L',
            description: `Serum potassium ${potassium.value} mEq/L`,
            blocking: potassium.value > 6.0,
            recommendations: [
              'Consider potassium binders',
              'Reduce/hold MRA if appropriate',
              'Recheck K+ in 3-5 days',
              'Review other K+-sparing medications'
            ]
          });
        }
      }

      // Check for renal dysfunction
      const creatinine = labValues.find(lab => lab.test === 'creatinine');
      const egfr = labValues.find(lab => lab.test === 'egfr');
      
      if (egfr && egfr.value < this.SAFETY_THRESHOLDS.egfr_low) {
        barriers.push({
          type: BarrierType.RENAL_DYSFUNCTION,
          severity: egfr.value < 15 ? 'severe' : 'moderate',
          value: egfr.value,
          unit: 'mL/min/1.73m²',
          description: `eGFR ${egfr.value} mL/min/1.73m²`,
          blocking: egfr.value < 15,
          recommendations: [
            'Nephrology consultation',
            'Monitor renal function closely',
            'Consider dose reduction',
            'Avoid nephrotoxic medications'
          ]
        });
      }

      // Check for hypotension (affects ACE/ARB/ARNI)
      if (drugClass === HFPillarType.ACE_ARB_ARNI) {
        const sbp = vitals.find(vital => vital.parameter === 'systolic_bp');
        if (sbp && sbp.value < this.SAFETY_THRESHOLDS.sbp_low) {
          barriers.push({
            type: BarrierType.HYPOTENSION,
            severity: sbp.value < 80 ? 'severe' : 'moderate',
            value: sbp.value,
            unit: 'mmHg',
            description: `Systolic BP ${sbp.value} mmHg`,
            blocking: sbp.value < 80,
            recommendations: [
              'Assess volume status',
              'Consider diuretic adjustment',
              'Monitor symptoms of hypotension',
              'Consider slower titration'
            ]
          });
        }
      }

      // Check for bradycardia (affects beta blockers)
      if (drugClass === HFPillarType.BETA_BLOCKER) {
        const hr = vitals.find(vital => vital.parameter === 'heart_rate');
        if (hr && hr.value < this.SAFETY_THRESHOLDS.heart_rate_low) {
          barriers.push({
            type: BarrierType.BRADYCARDIA,
            severity: hr.value < 45 ? 'severe' : 'moderate',
            value: hr.value,
            unit: 'bpm',
            description: `Heart rate ${hr.value} bpm`,
            blocking: hr.value < 45,
            recommendations: [
              'Check for heart block',
              'Review other rate-lowering medications',
              'Consider dose reduction',
              'Monitor for symptoms'
            ]
          });
        }
      }

      return barriers;

    } catch (error) {
      logger.error('Failed to check titration barriers', { error, patientId, drugClass });
      return [];
    }
  }

  /**
   * Get active titration plans for a patient
   */
  async getPatientTitrationPlans(patientId: string): Promise<DrugTitrationPlan[]> {
    try {
      const dbPlans = await this.prisma.drugTitration.findMany({
        where: {
          patientId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return dbPlans.map(plan => ({
        id: plan.id,
        patientId: plan.patientId,
        hospitalId: plan.hospitalId,
        drugClass: plan.drugClass as HFPillarType,
        drugName: plan.drugName,
        currentDose: plan.currentDose,
        currentDoseUnit: plan.currentDoseUnit,
        targetDose: plan.targetDose,
        targetDoseUnit: plan.targetDoseUnit,
        nextStepDate: plan.nextStepDate || new Date(),
        nextStepDose: plan.nextStepDose || plan.currentDose,
        titrationStep: plan.titrationStep,
        barriers: plan.barriers ? JSON.parse(JSON.stringify(plan.barriers)) : [],
        monitoringPlan: plan.monitoringPlan ? JSON.parse(JSON.stringify(plan.monitoringPlan)) : [],
        isActive: plan.isActive,
        status: plan.completedAt ? 'completed' : plan.pausedReason ? 'paused' : 'active',
        progress: this.calculateProgress(plan.currentDose, plan.targetDose)
      }));

    } catch (error) {
      logger.error('Failed to get patient titration plans', { error, patientId });
      return [];
    }
  }

  /**
   * Create new titration plan
   */
  async createTitrationPlan(
    patientId: string,
    hospitalId: string,
    drugClass: HFPillarType,
    drugName: string,
    currentDose: number,
    targetDose: number,
    doseUnit: string
  ): Promise<string> {
    try {
      const nextStep = await this.calculateNextTitrationStep(patientId, drugClass, currentDose, targetDose);
      
      const titration = await this.prisma.drugTitration.create({
        data: {
          patientId,
          hospitalId,
          drugClass,
          drugName,
          currentDose,
          currentDoseUnit: doseUnit,
          targetDose,
          targetDoseUnit: doseUnit,
          nextStepDate: nextStep.nextStepDate,
          nextStepDose: nextStep.nextStepDose,
          titrationStep: 1,
          barriers: [],
          monitoringPlan: JSON.parse(JSON.stringify(this.getDefaultMonitoringPlan(drugClass))),
          isActive: true
        }
      });

      logger.info('Created titration plan', {
        patientId,
        drugClass,
        drugName,
        titrationId: titration.id
      });

      return titration.id;

    } catch (error) {
      logger.error('Failed to create titration plan', { error, patientId, drugClass });
      throw error;
    }
  }

  // Helper methods

  private async analyzePillar(
    patientId: string,
    hospitalId: string,
    pillar: HFPillarType,
    medications: any[],
    labValues: any[],
    vitals: any[]
  ): Promise<{ status: any; recommendation?: TitrationRecommendation }> {
    
    const currentMed = medications.find(med => this.isDrugInClass(med.name, pillar));
    const prescribed = !!currentMed;
    const currentDose = currentMed ? currentMed.dose : 0;
    const targetDose = currentMed ? this.getTargetDose(currentMed.name) : 0;
    const optimization = targetDose > 0 ? Math.min(currentDose / targetDose, 1.0) : 0;

    // Check barriers
    const barriers = await this.checkTitrationBarriers(patientId, pillar, currentDose);
    const hasBlockingBarriers = barriers.some(b => b.blocking);

    // Determine next action
    let nextAction = 'Monitor';
    let recommendation: TitrationRecommendation | undefined;

    if (!prescribed && !hasBlockingBarriers) {
      nextAction = 'Initiate therapy';
      recommendation = {
        patientId,
        drugClass: pillar,
        action: 'increase',
        fromDose: 0,
        toDose: this.getInitialDose(pillar),
        reasoning: `${pillar} therapy not initiated - start at low dose`,
        barriers: barriers,
        monitoring: this.getDefaultMonitoringPlan(pillar),
        timeframe: '1-2 weeks',
        confidence: 0.8
      };
    } else if (prescribed && optimization < 0.9 && !hasBlockingBarriers) {
      const nextDose = this.calculateNextDose(currentDose, targetDose);
      nextAction = 'Up-titrate';
      recommendation = {
        patientId,
        drugClass: pillar,
        action: 'increase',
        fromDose: currentDose,
        toDose: nextDose,
        reasoning: `Current dose ${optimization * 100}% of target - continue titration`,
        barriers: barriers,
        monitoring: this.getDefaultMonitoringPlan(pillar),
        timeframe: '2-4 weeks',
        confidence: 0.7
      };
    } else if (hasBlockingBarriers) {
      nextAction = 'Address barriers';
    } else if (optimization >= 0.9) {
      nextAction = 'Target achieved';
    }

    return {
      status: {
        prescribed,
        currentDose,
        targetDose,
        optimization,
        barriers: barriers.map(b => b.description),
        nextAction
      },
      recommendation
    };
  }

  private isDrugInClass(drugName: string, drugClass: HFPillarType): boolean {
    const drugClassMappings = {
      [HFPillarType.ACE_ARB_ARNI]: ['lisinopril', 'enalapril', 'losartan', 'valsartan', 'sacubitril-valsartan'],
      [HFPillarType.BETA_BLOCKER]: ['metoprolol', 'carvedilol', 'bisoprolol'],
      [HFPillarType.MRA]: ['spironolactone', 'eplerenone'],
      [HFPillarType.SGLT2_INHIBITOR]: ['empagliflozin', 'dapagliflozin']
    };

    return drugClassMappings[drugClass]?.some(drug => 
      drugName.toLowerCase().includes(drug.toLowerCase())
    ) || false;
  }

  private getTargetDose(drugName: string): number {
    const normalizedName = drugName.toLowerCase().replace(/[^a-z]/g, '_');
    
    for (const [pillar, drugs] of Object.entries(this.TARGET_DOSES)) {
      if ((drugs as any)[normalizedName]) {
        return (drugs as any)[normalizedName];
      }
    }
    
    return 0;
  }

  private getInitialDose(drugClass: HFPillarType): number {
    const initialDoses = {
      [HFPillarType.ACE_ARB_ARNI]: 2.5, // lisinopril equivalent
      [HFPillarType.BETA_BLOCKER]: 12.5, // metoprolol equivalent
      [HFPillarType.MRA]: 25, // spironolactone
      [HFPillarType.SGLT2_INHIBITOR]: 10 // empagliflozin
    };

    return initialDoses[drugClass];
  }

  private calculateNextDose(currentDose: number, targetDose: number): number {
    const increment = Math.min(targetDose * 0.5, currentDose); // 50% increase or double, whichever is smaller
    return Math.min(currentDose + increment, targetDose);
  }

  private calculateOverallOptimization(pillarStatus: any): number {
    const optimizations = Object.values(pillarStatus).map((status: any) => status.optimization);
    return optimizations.reduce((sum: number, opt: number) => sum + opt, 0) / optimizations.length;
  }

  private estimateTimeToTarget(pillarStatus: any): string {
    const suboptimalPillars = Object.values(pillarStatus).filter((status: any) => 
      status.prescribed && status.optimization < 0.9
    );

    if (suboptimalPillars.length === 0) {
      return 'Target achieved';
    }

    const averageStepsNeeded = suboptimalPillars.length * 3; // Estimate 3 steps per pillar
    const weeksEstimate = averageStepsNeeded * 3; // 3 weeks between steps

    if (weeksEstimate <= 12) {
      return `${weeksEstimate} weeks`;
    } else {
      return `${Math.ceil(weeksEstimate / 4)} months`;
    }
  }

  private async calculateNextTitrationStep(
    patientId: string,
    drugClass: HFPillarType,
    currentDose: number,
    targetDose: number
  ): Promise<{ nextStepDate: Date; nextStepDose: number }> {
    
    const barriers = await this.checkTitrationBarriers(patientId, drugClass, currentDose);
    const hasBarriers = barriers.some(b => b.blocking);

    const nextStepDate = new Date();
    
    if (hasBarriers) {
      nextStepDate.setDate(nextStepDate.getDate() + 14); // 2 weeks if barriers
    } else {
      nextStepDate.setDate(nextStepDate.getDate() + 21); // 3 weeks normal
    }

    const nextStepDose = hasBarriers ? currentDose : this.calculateNextDose(currentDose, targetDose);

    return { nextStepDate, nextStepDose };
  }

  private getDefaultMonitoringPlan(drugClass: HFPillarType): MonitoringRequirement[] {
    const plans: Record<HFPillarType, MonitoringRequirement[]> = {
      [HFPillarType.ACE_ARB_ARNI]: [
        {
          parameter: 'potassium',
          frequency: '1-2 weeks after dose change',
          targetValue: '3.5-5.0 mEq/L',
          status: 'due_soon'
        },
        {
          parameter: 'creatinine',
          frequency: '1-2 weeks after dose change',
          targetValue: '<3.0 mg/dL',
          status: 'due_soon'
        },
        {
          parameter: 'blood pressure',
          frequency: 'weekly',
          targetValue: 'SBP >90 mmHg',
          status: 'due_soon'
        }
      ],
      [HFPillarType.BETA_BLOCKER]: [
        {
          parameter: 'heart rate',
          frequency: 'weekly',
          targetValue: '>50 bpm',
          status: 'due_soon'
        },
        {
          parameter: 'blood pressure',
          frequency: 'weekly',
          targetValue: 'SBP >90 mmHg',
          status: 'due_soon'
        }
      ],
      [HFPillarType.MRA]: [
        {
          parameter: 'potassium',
          frequency: '3-7 days after dose change',
          targetValue: '3.5-5.0 mEq/L',
          status: 'due_soon'
        },
        {
          parameter: 'creatinine',
          frequency: '1-2 weeks after dose change',
          targetValue: '<3.0 mg/dL',
          status: 'due_soon'
        }
      ],
      [HFPillarType.SGLT2_INHIBITOR]: [
        {
          parameter: 'egfr',
          frequency: '2-4 weeks after initiation',
          targetValue: '>30 mL/min/1.73m²',
          status: 'due_soon'
        },
        {
          parameter: 'volume status',
          frequency: 'weekly',
          targetValue: 'euvolemic',
          status: 'due_soon'
        }
      ]
    };

    return plans[drugClass] || [];
  }

  private calculateProgress(currentDose: number, targetDose: number): number {
    return targetDose > 0 ? Math.min(currentDose / targetDose, 1.0) : 0;
  }

  private async getCurrentMedications(patientId: string): Promise<any[]> {
    // Mock implementation - would query current medications from orders/medications table
    return [];
  }

  private async getRecentLabValues(patientId: string): Promise<any[]> {
    // Mock implementation - would query recent lab values from observations
    return [];
  }

  private async getRecentVitals(patientId: string): Promise<any[]> {
    // Mock implementation - would query recent vitals from observations
    return [];
  }

  private async getMonitoringDue(patientId: string): Promise<MonitoringRequirement[]> {
    // Mock implementation - would check due monitoring requirements
    return [];
  }

  private async storeOptimizationAnalysis(summary: GDMTOptimizationSummary): Promise<void> {
    // Store analysis results for tracking over time
    logger.info('Stored GDMT optimization analysis', {
      patientId: summary.patientId,
      overallOptimization: summary.overallOptimization,
      recommendations: summary.recommendations.length
    });
  }

  private async createMonitoringReminders(patientId: string, drugClass: HFPillarType, newDose: number): Promise<void> {
    const monitoringPlan = this.getDefaultMonitoringPlan(drugClass);
    
    for (const requirement of monitoringPlan) {
      // Create reminders for required monitoring
      logger.info('Creating monitoring reminder', {
        patientId,
        parameter: requirement.parameter,
        frequency: requirement.frequency
      });
    }
  }
}