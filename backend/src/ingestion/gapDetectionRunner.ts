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
    const detectedGaps = evaluateGapRules(dxCodes, labValues, medCodes, age, patient.gender);

    if (detectedGaps.length === 0) continue;

    // Pre-load existing gaps for this patient in one query (avoids N+1)
    const existingGaps = await prisma.therapyGap.findMany({
      where: { patientId: patient.id, hospitalId },
      select: { id: true, gapType: true, module: true },
    });
    const existingKey = (g: { gapType: string; module: string }) => `${g.gapType}::${g.module}`;
    const existingMap = new Map(existingGaps.map(g => [existingKey(g), g.id]));

    const toCreate: any[] = [];
    for (const gap of detectedGaps) {
      const key = existingKey({ gapType: gap.type, module: gap.module });
      const existingId = existingMap.get(key);

      if (existingId) {
        await prisma.therapyGap.update({
          where: { id: existingId },
          data: { currentStatus: gap.status },
        });
        result.gapFlagsUpdated++;
      } else {
        toCreate.push({
          patientId: patient.id,
          hospitalId,
          gapType: gap.type,
          module: gap.module,
          medication: gap.medication || null,
          currentStatus: gap.status,
          targetStatus: gap.target,
          recommendations: gap.recommendations as Prisma.InputJsonValue ?? Prisma.JsonNull,
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.therapyGap.createMany({ data: toCreate });
      result.gapFlagsCreated += toCreate.length;
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
  gender?: string,
): DetectedGap[] {
  const gaps: DetectedGap[] = [];
  const hasHF = dxCodes.some(c => c.startsWith('I50'));
  const hasAF = dxCodes.some(c => c.startsWith('I48'));
  const hasCAD = dxCodes.some(c => c.startsWith('I25'));

  // Suppress unused variable warnings for AF and CAD — reserved for future rules
  void hasAF;
  void hasCAD;

  // Gap 1: ATTR-CM Detection (HF)
  // Guideline: 2023 ACC Expert Consensus on ATTR-CM Diagnosis and Management
  // Signals: elevated NT-proBNP, preserved LVEF (>=50%), elevated hs-TnT, age>=65
  if (hasHF) {
    let signals = 0;
    if (labValues['nt_probnp'] && labValues['nt_probnp'] > 900) signals++;
    if (labValues['lvef'] && labValues['lvef'] >= 50) signals++;
    if (labValues['hs_tnt'] && labValues['hs_tnt'] > 14) signals++; // hs-TnT (LOINC 67151-1), NOT ferritin
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

  // Gap 6: Finerenone for CKD with Type 2 Diabetes (HF comorbidity)
  // Guideline: FIDELIO-DKD / FIGARO-DKD trials; FDA-approved for CKD + T2DM
  // Requires: T2DM diagnosis + eGFR 25-60 + K<5.0 + not already on finerenone
  // Note: This is NOT a general HF MRA -- finerenone is specifically for diabetic kidney disease
  const hasDiabetes = dxCodes.some(c => c.startsWith('E11')); // Type 2 diabetes mellitus
  if (
    hasDiabetes &&
    labValues['egfr'] !== undefined &&
    labValues['egfr'] >= 25 &&
    labValues['egfr'] <= 60 &&
    labValues['potassium'] !== undefined &&
    labValues['potassium'] < 5.0
  ) {
    if (!medCodes.some(c => c === '2481926')) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Finerenone not prescribed (CKD + T2DM)',
        target: 'Finerenone initiated',
        medication: 'Finerenone',
        recommendations: { action: 'Prescribe Finerenone for CKD with T2DM per FIDELIO-DKD/FIGARO-DKD' },
      });
    }
  }

  // Gap 39: QTc Safety Alert (EP)
  // Guideline: ACC/AHA/HRS EP Guidelines. QTc prolongation thresholds are sex-specific:
  // Male: >450ms prolonged, >500ms critical
  // Female: >470ms prolonged, >500ms critical
  if (labValues['qtc_interval'] !== undefined) {
    const qtcThreshold = gender === 'FEMALE' ? 470 : 450;
    if (labValues['qtc_interval'] > qtcThreshold) {
      const severity = labValues['qtc_interval'] > 500 ? 'CRITICAL' : 'HIGH';
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: `QTc ${severity}: ${labValues['qtc_interval']}ms (threshold ${qtcThreshold}ms)`,
        target: 'QT drug review completed',
        recommendations: { action: 'Order ECG + Electrolytes + Medication Review' },
      });
    }
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

  // Gap 50: Premature DAPT Discontinuation (Coronary)
  // Guideline: ACC/AHA 2016 DAPT Guidelines, updated by 2021 ACC/AHA/SCAI Coronary Revascularization
  // Fires when: CAD/stent patient (I25.* or Z95.5) is missing P2Y12 inhibitor
  // P2Y12 RxNorm codes: clopidogrel (32968), prasugrel (613391), ticagrelor (1116632)
  const hasStentOrCAD = hasCAD || dxCodes.some(c => c.startsWith('Z95.5'));
  const P2Y12_CODES = ['32968', '613391', '1116632'];
  const onP2Y12 = medCodes.some(c => P2Y12_CODES.includes(c));
  if (hasStentOrCAD && !onP2Y12) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'P2Y12 inhibitor not active post-stent/CAD',
      target: 'DAPT resumed or documented discontinuation rationale',
      medication: 'P2Y12 Inhibitor',
      recommendations: { action: 'Verify DAPT status with interventional cardiologist per ACC/AHA 2021' },
    });
  }

  return gaps;
}
