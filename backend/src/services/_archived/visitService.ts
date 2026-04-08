/**
 * Visit Service — Manages patient encounters/visits from Redox events
 *
 * Handles visit creation, updates, and discharge processing for
 * cardiovascular encounters tracked by the TAILRD platform.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class VisitService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createVisit(data: {
    patientId: string;
    hospitalId: string;
    encounterNumber: string;
    encounterType?: string;
    startDateTime?: Date;
    department?: string;
    attendingProvider?: string;
    diagnoses?: string[];
    rawPayload?: any;
  }): Promise<string> {
    try {
      const encounter = await this.prisma.encounter.create({
        data: {
          patientId: data.patientId,
          hospitalId: data.hospitalId,
          encounterNumber: data.encounterNumber,
          encounterType: (data.encounterType?.toUpperCase() || 'INPATIENT') as any,
          startDateTime: data.startDateTime || new Date(),
          department: data.department,
          attendingProvider: data.attendingProvider,
          status: 'IN_PROGRESS',
        },
      });

      logger.info('Visit created', { encounterId: encounter.id, patientId: data.patientId });
      return encounter.id;
    } catch (error) {
      logger.error('Failed to create visit', { error, patientId: data.patientId });
      throw error;
    }
  }

  async updateVisit(visitId: string, updates: {
    department?: string;
    attendingProvider?: string;
    status?: 'PLANNED' | 'ARRIVED' | 'TRIAGED' | 'IN_PROGRESS' | 'ON_LEAVE' | 'FINISHED' | 'CANCELLED';
  }): Promise<void> {
    try {
      await this.prisma.encounter.update({
        where: { id: visitId },
        data: updates,
      });
      logger.info('Visit updated', { visitId });
    } catch (error) {
      logger.error('Failed to update visit', { error, visitId });
      throw error;
    }
  }

  async dischargeVisit(visitId: string, endDateTime: Date): Promise<void> {
    try {
      await this.prisma.encounter.update({
        where: { id: visitId },
        data: {
          endDateTime,
          status: 'FINISHED',
        },
      });
      logger.info('Visit discharged', { visitId, endDateTime });
    } catch (error) {
      logger.error('Failed to discharge visit', { error, visitId });
      throw error;
    }
  }

  async getActiveVisit(patientId: string, hospitalId: string): Promise<any | null> {
    try {
      return await this.prisma.encounter.findFirst({
        where: { patientId, hospitalId, status: 'IN_PROGRESS' },
        orderBy: { startDateTime: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get active visit', { error, patientId });
      return null;
    }
  }
}
