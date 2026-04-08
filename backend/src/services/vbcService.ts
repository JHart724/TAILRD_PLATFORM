/**
 * Value-Based Care (VBC) Service
 *
 * Calculates CMS quality measures mapped to TAILRD therapy gaps.
 * Supports MSSP ACO, HEDIS, and CMS eCQM programs.
 */

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const QUALITY_MEASURES = [
  {
    measureId: 'ACO-13',
    program: 'MSSP',
    name: 'Statin Therapy for CVD Prevention',
    tailrdGapIds: ['cad-statin-high-intensity', 'cad-statin-moderate', 'cad-post-acs-statin'],
  },
  {
    measureId: 'HEDIS-SPC',
    program: 'HEDIS',
    name: 'Statin Use in Persons with Cardiovascular Disease',
    tailrdGapIds: ['cad-statin-high-intensity', 'cad-statin-moderate'],
  },
  {
    measureId: 'HEDIS-CBP',
    program: 'HEDIS',
    name: 'Controlling High Blood Pressure',
    tailrdGapIds: ['hf-bp-target', 'cad-bp-control'],
  },
  {
    measureId: 'HEDIS-AOB',
    program: 'HEDIS',
    name: 'Anticoagulation Monitoring for AF',
    tailrdGapIds: ['ep-oac-monitoring', 'ep-inr-monitoring'],
  },
  {
    measureId: 'CMS122',
    program: 'MSSP',
    name: 'Diabetes: HbA1c Poor Control',
    tailrdGapIds: ['hf-diabetes-control', 'cad-diabetes-management'],
  },
];

export async function calculateQualityMeasures(hospitalId: string): Promise<void> {
  const periodStart = new Date(new Date().getFullYear(), 0, 1);
  const periodEnd = new Date();

  for (const measure of QUALITY_MEASURES) {
    try {
      const patientsWithGap = await prisma.therapyGap.findMany({
        where: {
          hospitalId,
          gapType: { in: measure.tailrdGapIds as any },
          resolvedAt: null,
        },
        select: { patientId: true },
        distinct: ['patientId'],
      });

      const totalEligible = await prisma.patient.count({
        where: { hospitalId, isActive: true },
      });

      const nonCompliant = patientsWithGap.length;
      const compliant = Math.max(0, totalEligible - nonCompliant);
      const rate = totalEligible > 0 ? compliant / totalEligible : 0;

      await prisma.qualityMeasure.upsert({
        where: {
          hospitalId_measureCode_periodStart: {
            hospitalId,
            measureCode: measure.measureId,
            periodStart,
          },
        },
        create: {
          hospitalId,
          measureCode: measure.measureId,
          measureName: measure.name,
          measureDescription: `${measure.program} quality measure`,
          numerator: compliant,
          denominator: totalEligible,
          rate,
          reportingPeriod: `${periodStart.getFullYear()}-YTD`,
          periodStart,
          periodEnd,
        },
        update: {
          numerator: compliant,
          denominator: totalEligible,
          rate,
          periodEnd,
        },
      });

      logger.info('Quality measure calculated', {
        hospitalId,
        measureId: measure.measureId,
        rate: `${(rate * 100).toFixed(1)}%`,
      });
    } catch (error) {
      logger.error('Quality measure calculation failed', {
        measureId: measure.measureId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
