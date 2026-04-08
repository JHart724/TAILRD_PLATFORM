/**
 * Drug-Drug Interaction (DDI) Service
 *
 * Cardiovascular-specific DDI checking for therapy gap recommendations.
 * 5 rules: hyperkalemia cascade, QTc prolongation, ARNI washout, bleeding, digoxin toxicity.
 */

import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const CARDIOVASCULAR_DDI_RULES = [
  {
    ruleId: 'DDI-HK-001',
    trigger: ['1545653', '896744', '2200644', '41493'], // SGLT2i codes
    interactsWith: [
      { codes: ['485301', '392534'], drugClass: 'MRA (spironolactone/eplerenone)' },
    ],
    riskType: 'HYPERKALEMIA',
    severity: 'HIGH',
    recommendation: 'Monitor serum potassium within 1-2 weeks of initiating. Target K+ < 5.0 mEq/L.',
    guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guidelines, Section 7.4',
  },
  {
    ruleId: 'DDI-QT-001',
    trigger: ['703793'], // amiodarone
    interactsWith: [
      { codes: ['834060', '308460', '1665212'], drugClass: 'Class I/III antiarrhythmics' },
    ],
    riskType: 'QTC_PROLONGATION',
    severity: 'CRITICAL',
    recommendation: 'Combination generally contraindicated. If unavoidable, obtain baseline QTc, monitor ECG weekly for first month. Discontinue if QTc >500ms.',
    guidelineSource: 'ACC/AHA/HRS 2017 Ventricular Arrhythmia Guidelines',
  },
  {
    ruleId: 'DDI-ARNI-001',
    trigger: ['1656339', '1656341'], // sacubitril/valsartan
    interactsWith: [
      { codes: ['29046', '18867', '214354', '54552'], drugClass: 'ACEi' },
    ],
    riskType: 'ARNI_WASHOUT',
    severity: 'CRITICAL',
    recommendation: 'Must hold ACEi for 36 hours before initiating sacubitril/valsartan. Risk of life-threatening angioedema.',
    guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guidelines, PARADIGM-HF protocol',
  },
  {
    ruleId: 'DDI-BLD-001',
    trigger: ['1364430', '1599538', '1037045', '1037046'], // DOACs
    interactsWith: [
      { codes: ['1191', '243670'], drugClass: 'Antiplatelet (aspirin/P2Y12)' },
    ],
    riskType: 'BLEEDING',
    severity: 'HIGH',
    recommendation: 'Dual antithrombotic therapy increases major bleeding 2-3x. Limit to 1 year post-ACS/PCI. Use PPI concomitantly.',
    guidelineSource: 'ACC/AHA 2023 Chronic Coronary Disease Guidelines',
  },
  {
    ruleId: 'DDI-DIG-001',
    trigger: ['3407'], // digoxin
    interactsWith: [
      { codes: ['703793'], drugClass: 'Amiodarone' },
    ],
    riskType: 'DIGOXIN_TOXICITY',
    severity: 'HIGH',
    recommendation: 'Amiodarone increases digoxin levels by 50-100%. Reduce digoxin dose by 50% when initiating amiodarone. Monitor digoxin levels.',
    guidelineSource: 'ACC/AHA/HRS 2019 Atrial Fibrillation Guidelines',
  },
];

export interface DDIWarning {
  ruleId: string;
  riskType: string;
  severity: string;
  summary: string;
  recommendation: string;
  guidelineSource: string;
  drug1RxNorm: string;
  drug2RxNorm: string;
  drug2Name: string;
}

export function checkDDI(
  proposedRxNorm: string,
  currentMedications: Array<{ rxNormCode: string | null; medicationName?: string | null; status: string }>
): DDIWarning[] {
  const warnings: DDIWarning[] = [];

  for (const rule of CARDIOVASCULAR_DDI_RULES) {
    if (!rule.trigger.includes(proposedRxNorm)) continue;

    for (const interaction of rule.interactsWith) {
      const matchingMed = currentMedications.find(med =>
        med.rxNormCode && interaction.codes.includes(med.rxNormCode) && med.status === 'ACTIVE'
      );

      if (matchingMed) {
        warnings.push({
          ruleId: rule.ruleId,
          riskType: rule.riskType,
          severity: rule.severity,
          summary: `${rule.riskType.replace(/_/g, ' ')} risk: interacts with ${interaction.drugClass}`,
          recommendation: rule.recommendation,
          guidelineSource: rule.guidelineSource,
          drug1RxNorm: proposedRxNorm,
          drug2RxNorm: matchingMed.rxNormCode!,
          drug2Name: matchingMed.medicationName || 'Unknown',
        });
      }
    }
  }

  return warnings;
}

export async function runPatientDDICheck(patientId: string, hospitalId: string): Promise<number> {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { medications: { where: { status: 'ACTIVE' } } },
    });

    if (!patient || patient.medications.length < 2) return 0;

    const seenKeys = new Set<string>();
    let alertCount = 0;

    for (const med of patient.medications) {
      if (!med.rxNormCode) continue;
      const otherMeds = patient.medications.filter(m => m.id !== med.id);
      const warnings = checkDDI(med.rxNormCode, otherMeds);

      for (const w of warnings) {
        const key = [w.drug1RxNorm, w.drug2RxNorm, w.riskType].sort().join('-');
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        await prisma.drugInteractionAlert.create({
          data: {
            patientId,
            hospitalId,
            drug1RxNorm: w.drug1RxNorm,
            drug1Name: med.medicationName || 'Unknown',
            drug2RxNorm: w.drug2RxNorm,
            drug2Name: w.drug2Name,
            interactionType: w.riskType,
            severity: w.severity,
            recommendation: w.recommendation,
            status: 'ACTIVE',
          },
        });
        alertCount++;
      }
    }

    if (alertCount > 0) {
      logger.info('DDI alerts created', { patientId, hospitalId, alertCount });
    }
    return alertCount;
  } catch (error) {
    logger.error('DDI check failed', { patientId, error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}
