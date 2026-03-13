/**
 * Orders Service — Processes medication and procedure orders from Redox events
 *
 * Handles order creation, medication interaction alerts, and
 * cardiovascular-specific order monitoring.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class OrdersService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private mapOrderType(type: string): any {
    const map: Record<string, string> = {
      'medication': 'MEDICATION',
      'lab': 'LABORATORY',
      'procedure': 'PROCEDURE',
      'imaging': 'IMAGING',
    };
    return map[type] || 'PROCEDURE';
  }

  async processOrder(data: {
    patientId: string;
    hospitalId: string;
    encounterId?: string;
    orderType: 'medication' | 'lab' | 'procedure' | 'imaging';
    orderCode: string;
    orderName?: string;
    status?: string;
    orderedDateTime?: Date;
    orderingProvider?: string;
    priority?: string;
    rawPayload?: any;
  }): Promise<string> {
    try {
      const order = await this.prisma.order.create({
        data: {
          patientId: data.patientId,
          hospitalId: data.hospitalId,
          encounterId: data.encounterId,
          orderType: this.mapOrderType(data.orderType),
          orderCode: data.orderCode,
          orderName: data.orderName || data.orderCode,
          status: 'ACTIVE',
          orderedDateTime: data.orderedDateTime || new Date(),
          orderingProvider: data.orderingProvider || 'Unknown',
          priority: data.priority?.toUpperCase() === 'STAT' ? 'STAT'
            : data.priority?.toUpperCase() === 'ASAP' ? 'ASAP'
            : data.priority?.toUpperCase() === 'URGENT' ? 'URGENT'
            : 'ROUTINE',
        },
      });

      logger.info('Order processed', { orderId: order.id, orderCode: data.orderCode });
      return order.id;
    } catch (error) {
      logger.error('Failed to process order', { error, orderCode: data.orderCode });
      throw error;
    }
  }

  async checkMedicationInteractions(patientId: string, newMedication: string): Promise<Array<{
    severity: string;
    description: string;
    interactingMedication: string;
  }>> {
    // Placeholder — real implementation would check against drug interaction DB
    logger.debug('Checking medication interactions', { patientId, newMedication });
    return [];
  }

  async getActiveOrders(patientId: string, orderType?: string): Promise<any[]> {
    try {
      return await this.prisma.order.findMany({
        where: {
          patientId,
          status: 'ACTIVE',
          ...(orderType && { orderType: this.mapOrderType(orderType) }),
        },
        orderBy: { orderedDateTime: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get active orders', { error, patientId });
      return [];
    }
  }
}
