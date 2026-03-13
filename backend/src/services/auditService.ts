/**
 * Audit Service — HIPAA-compliant audit trail for all PHI access and system events
 *
 * Records who accessed what data, when, and from where. Required for
 * HIPAA compliance and breach investigation.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export type AuditEventType =
  | 'PHI_ACCESS'
  | 'PHI_EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PATIENT_VIEW'
  | 'PATIENT_UPDATE'
  | 'REPORT_GENERATED'
  | 'WEBHOOK_RECEIVED'
  | 'ORDER_PROCESSED'
  | 'RESULT_PROCESSED'
  | 'ALERT_TRIGGERED'
  | 'SYSTEM_CONFIG_CHANGE';

export class AuditService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async logEvent(data: {
    eventType: AuditEventType;
    userId: string;
    userEmail: string;
    userRole: string;
    hospitalId: string;
    patientId?: string;
    resourceType: string;
    resourceId?: string;
    action: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          userRole: data.userRole,
          hospitalId: data.hospitalId!,
          patientId: data.patientId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          action: data.action,
          metadata: data.details ? data.details : undefined,
          ipAddress: data.ipAddress,
        },
      });
    } catch (error) {
      // Audit logging must never crash the main flow
      logger.error('Failed to write audit log', { error, eventType: data.eventType });
    }
  }

  async getAuditTrail(filters: {
    userId?: string;
    hospitalId?: string;
    patientId?: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          ...(filters.userId && { userId: filters.userId }),
          ...(filters.hospitalId && { hospitalId: filters.hospitalId }),
          ...(filters.patientId && { patientId: filters.patientId }),
          ...(filters.eventType && { eventType: filters.eventType }),
          ...(filters.startDate && {
            timestamp: {
              gte: filters.startDate,
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }),
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
      });
    } catch (error) {
      logger.error('Failed to retrieve audit trail', { error });
      return [];
    }
  }
}
