import prisma from '../lib/prisma';
import { TherapyGapType, ModuleType, Prisma } from '@prisma/client';

export interface GapDetectionResult {
  patientsEvaluated: number;
  gapFlagsCreated: number;
  gapFlagsUpdated: number;
  gapFlagsResolved: number;
}

export async function runGapDetection(
  hospitalId: string,
  _uploadJobId: string,
): Promise<GapDetectionResult> {
  const result: GapDetectionResult = {
    patientsEvaluated: 0,
    gapFlagsCreated: 0,
    gapFlagsUpdated: 0,
    gapFlagsResolved: 0,
  };

  // Get all patients for this hospital with clinical data
  const patients = await prisma.patient.findMany({
    where: { hospitalId },
    include: {
      conditions: true,
      observations: { orderBy: { observedDateTime: 'desc' } },
      medications: true,
    },
  });

  for (const patient of patients) {
    result.patientsEvaluated++;

    // Collect diagnosis codes
    const dxCodes = patient.conditions.map(c => c.icd10Code).filter(Boolean) as string[];

    // Build lab value map (most recent value per observation type)
    const labValues: Record<string, number> = {};
    for (const obs of patient.observations) {
      if (obs.valueNumeric !== null && !labValues[obs.observationType]) {
        labValues[obs.observationType] = obs.valueNumeric;
      }
    }

    // Collect medication RxNorm codes
    const medCodes = patient.medications
      .map(m => m.rxNormCode)
      .filter(Boolean) as string[];

    // Estimate patient age from dateOfBirth
    const age = Math.floor(
      (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // Run gap detection rules
    const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age);

    for (const gap of detectedGaps) {
      const existing = await prisma.therapyGap.findFirst({
        where: {
          patientId: patient.id,
          hospitalId,
          gapType: gap.type,
          module: gap.module,
        },
      });

      if (existing) {
        await prisma.therapyGap.update({
          where: { id: existing.id },
          data: { currentStatus: gap.status },
        });
        result.gapFlagsUpdated++;
      } else {
        await prisma.therapyGap.create({
          data: {
            patientId: patient.id,
            hospitalId,
            gapType: gap.type,
            module: gap.module,
            medication: gap.medication || null,
            currentStatus: gap.status,
            targetStatus: gap.target,
            recommendations: gap.recommendations as Prisma.InputJsonValue ?? Prisma.JsonNull,
          },
        });
        result.gapFlagsCreated++;
      }
    }
  }

  return result;
}

interface DetectedGap {
  type: TherapyGapType;
  module: ModuleType;
  status: string;
  target: string;
  medication?: string;
  recommendations?: Record<string, unknown>;
}

function evaluateGapRules(
  dxCodes: string[],
  labValues: Record<string, number>,
  medCodes: string[],
  age: number,
): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const hasHF = dxCodes.some(c => c.startsWith('I50'));
  const hasAF = dxCodes.some(c => c.startsWith('I48'));
  const hasCAD = dxCodes.some(c => c.startsWith('I25'));

  // Suppress unused variable warnings for AF and CAD — reserved for future rules
  void hasAF;
  void hasCAD;

  // Gap 1: ATTR-CM Detection (HF)
  if (hasHF) {
    let signals = 0;
    if (labValues['nt_probnp'] && labValues['nt_probnp'] > 900) signals++;
    if (labValues['lvef'] && labValues['lvef'] >= 50) signals++;
    if (labValues['ferritin'] && labValues['ferritin'] > 14) signals++; // hs-TnT proxy
    if (age >= 65) signals++;
    if (signals >= 3) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.HEART_FAILURE,
        status: 'ATTR-CM screening needed',
        target: 'Tc-99m PYP ordered',
        recommendations: { action: 'Order Tc-99m PYP Scan' },
      });
    }
  }

  // Gap 2: Iron Deficiency in HF
  if (hasHF && labValues['ferritin'] !== undefined) {
    const ferritinLow = labValues['ferritin'] < 100;
    const tsatLow = labValues['tsat'] !== undefined && labValues['tsat'] < 20;
    const functionalID = labValues['ferritin'] >= 100 && labValues['ferritin'] < 300 && tsatLow;
    if (ferritinLow || functionalID) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Iron deficiency untreated',
        target: 'IV iron prescribed',
        medication: 'IV Iron',
        recommendations: { action: 'Order IV Ferric Carboxymaltose' },
      });
    }
  }

  // Gap 6: Finerenone (HF)
  if (
    hasHF &&
    labValues['lvef'] !== undefined &&
    labValues['lvef'] >= 40 &&
    labValues['egfr'] !== undefined &&
    labValues['egfr'] >= 25 &&
    labValues['potassium'] !== undefined &&
    labValues['potassium'] < 5.0
  ) {
    if (!medCodes.some(c => c === '2481926')) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Finerenone not prescribed',
        target: 'Finerenone initiated',
        medication: 'Finerenone',
        recommendations: { action: 'Prescribe Finerenone' },
      });
    }
  }

  // Gap 39: QTc Safety Alert (EP)
  if (labValues['qtc_interval'] !== undefined && labValues['qtc_interval'] > 470) {
    const severity = labValues['qtc_interval'] > 500 ? 'CRITICAL' : 'HIGH';
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: `QTc ${severity}: ${labValues['qtc_interval']}ms`,
      target: 'QT drug review completed',
      recommendations: { action: 'Order ECG + Electrolytes + Medication Review' },
    });
  }

  // Gap 44: Digoxin Toxicity (HF)
  if (
    age >= 75 &&
    labValues['egfr'] !== undefined &&
    labValues['egfr'] < 50
  ) {
    if (medCodes.some(c => ['197604', '197605', '197606'].includes(c))) {
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.HEART_FAILURE,
        status: 'Digoxin toxicity risk',
        target: 'Digoxin dose reviewed',
        medication: 'Digoxin',
        recommendations: { action: 'Review Digoxin Dose' },
      });
    }
  }

  return gaps;
}
