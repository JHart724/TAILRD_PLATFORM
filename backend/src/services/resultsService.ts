/**
 * Results Service — Processes lab and diagnostic results from Redox events
 *
 * Handles observation creation, cardiac biomarker alerts, and
 * result-triggered clinical decision support.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class ResultsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async processResult(data: {
    patientId: string;
    hospitalId: string;
    encounterId?: string;
    observationType: string;
    observationName?: string;
    valueNumeric?: number;
    valueText?: string;
    unit?: string;
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    category: string;
    observedDateTime?: Date;
    rawPayload?: any;
  }): Promise<string> {
    try {
      const observation = await this.prisma.observation.create({
        data: {
          patientId: data.patientId,
          hospitalId: data.hospitalId,
          encounterId: data.encounterId,
          observationType: data.observationType,
          observationName: data.observationName || data.observationType,
          valueNumeric: data.valueNumeric,
          valueText: data.valueText,
          unit: data.unit,
          referenceRangeLow: data.referenceRangeLow,
          referenceRangeHigh: data.referenceRangeHigh,
          category: data.category as any,
          observedDateTime: data.observedDateTime || new Date(),
        },
      });

      logger.info('Result processed', { observationId: observation.id, observationType: data.observationType });
      return observation.id;
    } catch (error) {
      logger.error('Failed to process result', { error, observationType: data.observationType });
      throw error;
    }
  }

  async getLatestResults(patientId: string, observationTypes: string[]): Promise<any[]> {
    try {
      return await this.prisma.observation.findMany({
        where: { patientId, observationType: { in: observationTypes } },
        orderBy: { observedDateTime: 'desc' },
        take: observationTypes.length,
        distinct: ['observationType'],
      });
    } catch (error) {
      logger.error('Failed to get latest results', { error, patientId });
      return [];
    }
  }

  isCardiacBiomarker(code: string): boolean {
    const cardiacBiomarkers = [
      '33762-6', // Troponin I
      '49563-0', // Troponin I HS
      '89579-7', // Troponin T HS
      '30934-4', // BNP
      '33762-6', // NT-proBNP
      '2093-3',  // Total cholesterol
      '2571-8',  // Triglycerides
      '18262-6', // LDL
    ];
    return cardiacBiomarkers.includes(code);
  }
}
