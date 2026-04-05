import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CrossReferralTrigger {
  patientId: string;
  hospitalId: string;
  fromModule: ModuleType;
  toModule: ModuleType;
  reason: string;
  urgency: ReferralUrgency;
  triggerData: any;
  triggeredBy: 'cql_rule' | 'alert' | 'manual' | 'phenotype_detection';
  triggeredByData?: any;
}

export interface CrossReferralEvaluation {
  id: string;
  patientId: string;
  fromModule: ModuleType;
  toModule: ModuleType;
  reason: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  confidence: number;
  recommendations: string[];
  triggerData: any;
  triggeredAt: Date;
  estimatedResponseTime?: string;
  requiredActions?: string[];
}

export interface ReferralNotification {
  recipientType: 'care_team' | 'physician' | 'nurse_manager' | 'specialist';
  recipientId?: string;
  message: string;
  urgency: ReferralUrgency;
  actionRequired: boolean;
  data: any;
}

export enum ModuleType {
  HEART_FAILURE = 'HEART_FAILURE',
  ELECTROPHYSIOLOGY = 'ELECTROPHYSIOLOGY',
  STRUCTURAL_HEART = 'STRUCTURAL_HEART',
  CORONARY_INTERVENTION = 'CORONARY_INTERVENTION',
  PERIPHERAL_VASCULAR = 'PERIPHERAL_VASCULAR',
  VALVULAR_DISEASE = 'VALVULAR_DISEASE'
}

export enum ReferralUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ReferralStatus {
  TRIGGERED = 'TRIGGERED',
  REVIEWED = 'REVIEWED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

// Aliases used by routes/referrals.ts
export const ReferralType = ModuleType;
export const ReferralPriority = ReferralUrgency;

export class CrossReferralService {
  private prisma: PrismaClient;

  // Referral rules mapping conditions to appropriate modules
  private readonly REFERRAL_RULES: Record<string, Record<string, string[]>> = {
    // Heart Failure to other modules
    [ModuleType.HEART_FAILURE]: {
      [ModuleType.ELECTROPHYSIOLOGY]: [
        'sustained_ventricular_tachycardia',
        'ventricular_fibrillation',
        'frequent_pvcs',
        'heart_block',
        'atrial_fibrillation_new',
        'icd_appropriate_shock',
        'crt_nonresponse'
      ],
      [ModuleType.STRUCTURAL_HEART]: [
        'mitral_regurgitation_severe',
        'tricuspid_regurgitation_severe',
        'aortic_stenosis_severe',
        'heart_transplant_evaluation',
        'lvad_evaluation',
        'mitral_clip_candidate'
      ],
      [ModuleType.CORONARY_INTERVENTION]: [
        'ischemic_cardiomyopathy',
        'coronary_artery_disease',
        'acute_coronary_syndrome',
        'angina_refractory'
      ]
    },
    // Electrophysiology to other modules
    [ModuleType.ELECTROPHYSIOLOGY]: {
      [ModuleType.HEART_FAILURE]: [
        'tachycardia_cardiomyopathy',
        'heart_failure_with_arrhythmia',
        'crt_candidate',
        'post_ablation_cardiomyopathy'
      ],
      [ModuleType.STRUCTURAL_HEART]: [
        'atrial_fibrillation_with_valvular_disease',
        'arrhythmia_post_valve_surgery',
        'device_related_endocarditis'
      ]
    },
    // Add more module combinations as needed
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Evaluate cross-referral triggers from CQL rule results
   */
  async evaluateCQLRuleForReferrals(cqlResult: any): Promise<CrossReferralEvaluation[]> {
    try {
      logger.info('Evaluating CQL result for referrals', { 
        ruleId: cqlResult.ruleId, 
        patientId: cqlResult.patientId 
      });

      const referrals: CrossReferralEvaluation[] = [];
      const resultData = cqlResult.result;

      // Check for specific conditions that trigger referrals
      const triggers = this.extractReferralTriggers(resultData, cqlResult.rule.module);

      for (const trigger of triggers) {
        const evaluation = await this.evaluateReferralTrigger({
          patientId: cqlResult.patientId,
          hospitalId: cqlResult.hospitalId,
          fromModule: cqlResult.rule.module,
          toModule: trigger.toModule,
          reason: trigger.reason,
          urgency: trigger.urgency,
          triggerData: { cqlResult, trigger },
          triggeredBy: 'cql_rule',
          triggeredByData: { ruleId: cqlResult.ruleId, resultId: cqlResult.id }
        });

        if (evaluation) {
          referrals.push(evaluation);
        }
      }

      // Create referrals in database
      if (referrals.length > 0) {
        await this.createReferrals(referrals);
        await this.sendReferralNotifications(referrals);
      }

      return referrals;

    } catch (error) {
      logger.error('Failed to evaluate CQL rule for referrals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cqlResultId: cqlResult.id
      });
      return [];
    }
  }

  /**
   * Evaluate cross-referral triggers from phenotype detection
   */
  async evaluatePhenotypeForReferrals(phenotype: any): Promise<CrossReferralEvaluation[]> {
    try {
      logger.info('Evaluating phenotype for referrals', { 
        phenotype: phenotype.phenotypeName,
        patientId: phenotype.patientId 
      });

      const referrals: CrossReferralEvaluation[] = [];
      
      // Map phenotypes to appropriate module referrals
      const phenotypeReferrals = this.getPhenotypeReferralMappings(phenotype.phenotypeName);

      for (const mapping of phenotypeReferrals) {
        const evaluation = await this.evaluateReferralTrigger({
          patientId: phenotype.patientId,
          hospitalId: phenotype.hospitalId,
          fromModule: mapping.fromModule,
          toModule: mapping.toModule,
          reason: mapping.reason,
          urgency: mapping.urgency,
          triggerData: { phenotype, mapping },
          triggeredBy: 'phenotype_detection',
          triggeredByData: { phenotypeId: phenotype.id }
        });

        if (evaluation) {
          referrals.push(evaluation);
        }
      }

      if (referrals.length > 0) {
        await this.createReferrals(referrals);
        await this.sendReferralNotifications(referrals);
      }

      return referrals;

    } catch (error) {
      logger.error('Failed to evaluate phenotype for referrals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phenotypeId: phenotype.id
      });
      return [];
    }
  }

  /**
   * Create manual referral
   */
  async createManualReferral(
    patientId: string,
    hospitalId: string,
    fromModule: ModuleType,
    toModule: ModuleType,
    reason: string,
    urgency: ReferralUrgency,
    createdBy: string,
    notes?: string
  ): Promise<CrossReferralEvaluation> {
    try {
      const evaluation = await this.evaluateReferralTrigger({
        patientId,
        hospitalId,
        fromModule,
        toModule,
        reason,
        urgency,
        triggerData: { manual: true, notes, createdBy },
        triggeredBy: 'manual'
      });

      if (evaluation) {
        await this.createReferrals([evaluation]);
        await this.sendReferralNotifications([evaluation]);
      }

      return evaluation!;

    } catch (error) {
      logger.error('Failed to create manual referral', { error, patientId });
      throw error;
    }
  }

  /**
   * Evaluate a specific referral trigger
   */
  private async evaluateReferralTrigger(trigger: CrossReferralTrigger): Promise<CrossReferralEvaluation | null> {
    try {
      // Check if patient is eligible for target module
      const isEligible = await this.checkModuleEligibility(trigger.patientId, trigger.toModule);
      if (!isEligible) {
        logger.debug('Patient not eligible for target module', {
          patientId: trigger.patientId,
          toModule: trigger.toModule
        });
        return null;
      }

      // Check for recent similar referrals to avoid duplicates
      const recentReferral = await this.findRecentSimilarReferral(
        trigger.patientId,
        trigger.fromModule,
        trigger.toModule,
        7 // days
      );

      if (recentReferral) {
        logger.debug('Recent similar referral found, skipping', {
          patientId: trigger.patientId,
          existingReferralId: recentReferral.id
        });
        return null;
      }

      // Calculate confidence score
      const confidence = this.calculateReferralConfidence(trigger);

      // Generate recommendations
      const recommendations = this.generateReferralRecommendations(trigger);

      return {
        id: this.generateId(),
        patientId: trigger.patientId,
        fromModule: trigger.fromModule,
        toModule: trigger.toModule,
        reason: trigger.reason,
        urgency: trigger.urgency,
        status: ReferralStatus.TRIGGERED,
        confidence,
        recommendations,
        triggerData: trigger.triggerData,
        triggeredAt: new Date(),
        estimatedResponseTime: this.estimateResponseTime(trigger.urgency),
        requiredActions: this.getRequiredActions(trigger.toModule, trigger.reason)
      };

    } catch (error) {
      logger.error('Failed to evaluate referral trigger', { error, trigger });
      return null;
    }
  }

  /**
   * Create referrals in database
   */
  private async createReferrals(evaluations: CrossReferralEvaluation[]): Promise<void> {
    try {
      for (const evaluation of evaluations) {
        await this.prisma.crossReferral.create({
          data: {
            patientId: evaluation.patientId,
            hospitalId: evaluation.triggerData.hospitalId || 'unknown',
            fromModule: evaluation.fromModule,
            toModule: evaluation.toModule,
            reason: evaluation.reason,
            urgency: evaluation.urgency,
            status: evaluation.status,
            triggerData: evaluation.triggerData,
            notes: `Confidence: ${evaluation.confidence}, Triggered by: ${evaluation.triggerData.triggeredBy}`
          }
        });
      }

      logger.info('Created cross referrals', { count: evaluations.length });

    } catch (error) {
      logger.error('Failed to create referrals', { error });
      throw error;
    }
  }

  /**
   * Send notifications to relevant care team members
   */
  private async sendReferralNotifications(referrals: CrossReferralEvaluation[]): Promise<void> {
    try {
      for (const referral of referrals) {
        const notifications = this.generateNotifications(referral);
        
        for (const notification of notifications) {
          await this.sendNotification(notification, referral);
        }
      }

      logger.info('Sent referral notifications', { referralCount: referrals.length });

    } catch (error) {
      logger.error('Failed to send referral notifications', { error });
    }
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(
    referralId: string,
    status: ReferralStatus,
    updatedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      switch (status) {
        case ReferralStatus.REVIEWED:
          updateData.reviewedAt = new Date();
          updateData.reviewedBy = updatedBy;
          break;
        case ReferralStatus.ACCEPTED:
          updateData.acceptedAt = new Date();
          updateData.acceptedBy = updatedBy;
          break;
        case ReferralStatus.COMPLETED:
          updateData.completedAt = new Date();
          updateData.completedBy = updatedBy;
          break;
      }

      if (notes) {
        updateData.notes = notes;
      }

      await this.prisma.crossReferral.update({
        where: { id: referralId },
        data: updateData
      });

      logger.info('Updated referral status', { referralId, status, updatedBy });

    } catch (error) {
      logger.error('Failed to update referral status', { error, referralId });
      throw error;
    }
  }

  /**
   * Get active referrals for a patient
   */
  async getPatientReferrals(patientId: string, hospitalId?: string): Promise<any[]> {
    try {
      return await this.prisma.crossReferral.findMany({
        where: {
          patientId,
          ...(hospitalId && { hospitalId }),
          status: {
            in: [ReferralStatus.TRIGGERED, ReferralStatus.REVIEWED, ReferralStatus.ACCEPTED]
          }
        },
        orderBy: { triggeredAt: 'desc' },
        include: {
          patient: {
            select: { firstName: true, lastName: true, mrn: true }
          },
          hospital: {
            select: { name: true }
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get patient referrals', { error, patientId });
      return [];
    }
  }

  /**
   * Get referrals by module
   */
  async getReferralsByModule(
    hospitalId: string,
    toModule: ModuleType,
    status?: ReferralStatus
  ): Promise<any[]> {
    try {
      const where: any = {
        hospitalId,
        toModule
      };

      if (status) {
        where.status = status;
      }

      return await this.prisma.crossReferral.findMany({
        where,
        orderBy: [
          { urgency: 'desc' },
          { triggeredAt: 'desc' }
        ],
        include: {
          patient: {
            select: { firstName: true, lastName: true, mrn: true }
          }
        },
        take: 100
      });

    } catch (error) {
      logger.error('Failed to get referrals by module', { error, hospitalId, toModule });
      return [];
    }
  }

  // Helper methods

  private extractReferralTriggers(resultData: any, fromModule: ModuleType): Array<{toModule: ModuleType, reason: string, urgency: ReferralUrgency}> {
    const triggers = [];
    const moduleRules = this.REFERRAL_RULES[fromModule] || {};

    for (const [targetModule, conditions] of Object.entries(moduleRules)) {
      for (const condition of conditions as string[]) {
        if (this.checkConditionInResult(resultData, condition)) {
          triggers.push({
            toModule: targetModule as ModuleType,
            reason: this.getReadableReason(condition),
            urgency: this.determineUrgency(condition)
          });
        }
      }
    }

    return triggers;
  }

  private getPhenotypeReferralMappings(phenotype: string): Array<{
    fromModule: ModuleType, 
    toModule: ModuleType, 
    reason: string, 
    urgency: ReferralUrgency
  }> {
    const mappings: Record<string, any[]> = {
      'CARDIAC_AMYLOIDOSIS': [
        {
          fromModule: ModuleType.HEART_FAILURE,
          toModule: ModuleType.STRUCTURAL_HEART,
          reason: 'Suspected cardiac amyloidosis requires specialized evaluation',
          urgency: ReferralUrgency.HIGH
        }
      ],
      'HCM': [
        {
          fromModule: ModuleType.HEART_FAILURE,
          toModule: ModuleType.ELECTROPHYSIOLOGY,
          reason: 'Hypertrophic cardiomyopathy requires arrhythmia screening',
          urgency: ReferralUrgency.MEDIUM
        }
      ],
      'ARVC': [
        {
          fromModule: ModuleType.HEART_FAILURE,
          toModule: ModuleType.ELECTROPHYSIOLOGY,
          reason: 'ARVC requires immediate EP evaluation for SCD risk',
          urgency: ReferralUrgency.URGENT
        }
      ]
    };

    return mappings[phenotype] || [];
  }

  private async checkModuleEligibility(patientId: string, module: ModuleType): Promise<boolean> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { hospital: true }
      });

      if (!patient) return false;

      // Check if hospital has the target module enabled
      switch (module) {
        case ModuleType.HEART_FAILURE:
          return patient.hospital.moduleHeartFailure;
        case ModuleType.ELECTROPHYSIOLOGY:
          return patient.hospital.moduleElectrophysiology;
        case ModuleType.STRUCTURAL_HEART:
          return patient.hospital.moduleStructuralHeart;
        case ModuleType.CORONARY_INTERVENTION:
          return patient.hospital.moduleCoronaryIntervention;
        case ModuleType.PERIPHERAL_VASCULAR:
          return patient.hospital.modulePeripheralVascular;
        case ModuleType.VALVULAR_DISEASE:
          return patient.hospital.moduleValvularDisease;
        default:
          return false;
      }

    } catch (error) {
      logger.error('Failed to check module eligibility', { error, patientId, module });
      return false;
    }
  }

  private async findRecentSimilarReferral(
    patientId: string,
    fromModule: ModuleType,
    toModule: ModuleType,
    withinDays: number
  ): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - withinDays);

      return await this.prisma.crossReferral.findFirst({
        where: {
          patientId,
          fromModule,
          toModule,
          triggeredAt: { gte: cutoffDate },
          status: {
            not: ReferralStatus.DECLINED
          }
        }
      });

    } catch (error) {
      logger.error('Failed to find recent similar referral', { error });
      return null;
    }
  }

  private calculateReferralConfidence(trigger: CrossReferralTrigger): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on trigger type
    switch (trigger.triggeredBy) {
      case 'cql_rule':
        confidence += 0.3;
        break;
      case 'phenotype_detection':
        confidence += 0.25;
        break;
      case 'alert':
        confidence += 0.2;
        break;
      case 'manual':
        confidence = 1.0; // Full confidence for manual referrals
        break;
    }

    // Adjust based on urgency
    switch (trigger.urgency) {
      case ReferralUrgency.URGENT:
        confidence += 0.2;
        break;
      case ReferralUrgency.HIGH:
        confidence += 0.1;
        break;
    }

    return Math.min(confidence, 1.0);
  }

  private generateReferralRecommendations(trigger: CrossReferralTrigger): string[] {
    const baseRecommendations = [
      'Review patient clinical history',
      'Assess current medications and contraindications',
      'Evaluate recent diagnostic studies'
    ];

    const moduleSpecificRecommendations: Record<ModuleType, string[]> = {
      [ModuleType.ELECTROPHYSIOLOGY]: [
        'Review ECG and rhythm monitoring',
        'Assess arrhythmia history',
        'Consider device interrogation if applicable'
      ],
      [ModuleType.STRUCTURAL_HEART]: [
        'Review echocardiogram',
        'Assess surgical risk',
        'Evaluate anatomy for intervention'
      ],
      [ModuleType.CORONARY_INTERVENTION]: [
        'Review coronary angiogram',
        'Assess ischemic burden',
        'Evaluate revascularization options'
      ],
      [ModuleType.HEART_FAILURE]: [
        'Optimize guideline-directed medical therapy',
        'Assess volume status',
        'Evaluate for device therapy'
      ],
      [ModuleType.PERIPHERAL_VASCULAR]: [
        'Assess vascular anatomy',
        'Evaluate claudication symptoms',
        'Review ankle-brachial index'
      ],
      [ModuleType.VALVULAR_DISEASE]: [
        'Review valve anatomy and function',
        'Assess symptoms and functional status',
        'Evaluate for intervention'
      ]
    };

    return [...baseRecommendations, ...(moduleSpecificRecommendations[trigger.toModule] || [])];
  }

  private estimateResponseTime(urgency: ReferralUrgency): string {
    switch (urgency) {
      case ReferralUrgency.URGENT:
        return '< 1 hour';
      case ReferralUrgency.HIGH:
        return '< 4 hours';
      case ReferralUrgency.MEDIUM:
        return '< 24 hours';
      case ReferralUrgency.LOW:
        return '< 72 hours';
      default:
        return 'Unknown';
    }
  }

  private getRequiredActions(toModule: ModuleType, reason: string): string[] {
    // Return module-specific required actions
    const actions: Record<ModuleType, string[]> = {
      [ModuleType.ELECTROPHYSIOLOGY]: ['Review rhythm', 'Assess device need'],
      [ModuleType.STRUCTURAL_HEART]: ['Review imaging', 'Assess intervention options'],
      [ModuleType.CORONARY_INTERVENTION]: ['Review angiography', 'Plan revascularization'],
      [ModuleType.HEART_FAILURE]: ['Optimize medications', 'Assess volume status'],
      [ModuleType.PERIPHERAL_VASCULAR]: ['Vascular assessment', 'Plan intervention'],
      [ModuleType.VALVULAR_DISEASE]: ['Valve assessment', 'Plan repair/replacement']
    };

    return actions[toModule] || ['Clinical evaluation'];
  }

  private generateNotifications(referral: CrossReferralEvaluation): ReferralNotification[] {
    const notifications: ReferralNotification[] = [];

    // Primary notification to target module team
    notifications.push({
      recipientType: 'care_team',
      message: `New ${referral.urgency.toLowerCase()} priority referral: ${referral.reason}`,
      urgency: referral.urgency,
      actionRequired: true,
      data: referral
    });

    // For urgent referrals, also notify physician directly
    if (referral.urgency === ReferralUrgency.URGENT) {
      notifications.push({
        recipientType: 'physician',
        message: `URGENT referral requires immediate attention: ${referral.reason}`,
        urgency: referral.urgency,
        actionRequired: true,
        data: referral
      });
    }

    return notifications;
  }

  private async sendNotification(notification: ReferralNotification, referral: CrossReferralEvaluation): Promise<void> {
    try {
      // In production, this would integrate with notification system
      logger.info('Sending referral notification', {
        recipientType: notification.recipientType,
        urgency: notification.urgency,
        patientId: referral.patientId,
        toModule: referral.toModule
      });

      // Mock notification sending
      // await notificationService.send(notification);

    } catch (error) {
      logger.error('Failed to send notification', { error, notification });
    }
  }

  private checkConditionInResult(resultData: any, condition: string): boolean {
    // Mock implementation - would check CQL result for specific conditions
    return Math.random() > 0.8; // Mock positive rate
  }

  private getReadableReason(condition: string): string {
    const readable: Record<string, string> = {
      'sustained_ventricular_tachycardia': 'Sustained ventricular tachycardia detected',
      'mitral_regurgitation_severe': 'Severe mitral regurgitation identified',
      'ischemic_cardiomyopathy': 'Ischemic cardiomyopathy requiring intervention',
      'tachycardia_cardiomyopathy': 'Tachycardia-induced cardiomyopathy'
    };

    return readable[condition] || condition.replace(/_/g, ' ');
  }

  private determineUrgency(condition: string): ReferralUrgency {
    const urgentConditions = ['ventricular_fibrillation', 'heart_block', 'acute_coronary_syndrome'];
    const highUrgencyConditions = ['sustained_ventricular_tachycardia', 'icd_appropriate_shock'];
    
    if (urgentConditions.some(c => condition.includes(c))) {
      return ReferralUrgency.URGENT;
    } else if (highUrgencyConditions.some(c => condition.includes(c))) {
      return ReferralUrgency.HIGH;
    } else {
      return ReferralUrgency.MEDIUM;
    }
  }

  private generateId(): string {
    return `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- Stub methods needed by routes/referrals.ts ---

  async getHospitalReferrals(filters?: any, pagination?: any): Promise<any> {
    try {
      const referrals = await this.prisma.crossReferral.findMany({
        where: { hospitalId: filters?.hospitalId, ...filters },
        orderBy: { triggeredAt: 'desc' },
      });
      return { data: referrals, total: referrals.length };
    } catch (error) {
      logger.error('Failed to get hospital referrals', { error, filters });
      return { data: [], total: 0 };
    }
  }

  async getHospitalReferralSummary(hospitalId: string): Promise<any> {
    try {
      const total = await this.prisma.crossReferral.count({ where: { hospitalId } });
      return { total, totalActive: 0, pendingReview: 0, inProgress: 0, completed: 0, byPriority: {}, byModule: {}, averageCompletionTime: 0, overdueReferrals: 0 };
    } catch (error) {
      logger.error('Failed to get referral summary', { error, hospitalId });
      return { total: 0, totalActive: 0, pendingReview: 0, inProgress: 0, completed: 0, byPriority: {}, byModule: {}, averageCompletionTime: 0, overdueReferrals: 0 };
    }
  }

  async getReferralById(referralId: string): Promise<any | null> {
    try {
      return await this.prisma.crossReferral.findUnique({ where: { id: referralId } });
    } catch (error) {
      logger.error('Failed to get referral by id', { error, referralId });
      return null;
    }
  }

  async getReferralAnalytics(hospitalId: string, filters?: any): Promise<any> {
    logger.debug('Getting referral analytics', { hospitalId });
    return { metrics: {}, trends: [], performance: {}, moduleBreakdown: {}, qualityIndicators: {}, insights: [], recommendations: [] };
  }

  async getReferralBenchmarks(hospitalId: string, options?: any): Promise<any> {
    logger.debug('Getting referral benchmarks', { hospitalId });
    return { hospitalMetrics: {}, peerComparison: {} };
  }
}