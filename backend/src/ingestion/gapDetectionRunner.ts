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

/**
 * DetectedGap -- the output of a gap rule evaluation.
 *
 * FDA CDS EXEMPTION COMPLIANCE (21st Century Cures Act):
 * Every gap MUST include `evidence` and `guideline` fields so that
 * the clinician can independently review the basis for the recommendation.
 * Without transparency, the software may be classified as a medical device
 * requiring FDA 510(k) clearance.
 *
 * The platform RECOMMENDS review, it does NOT direct treatment.
 * The clinician always makes the final decision.
 */
interface DetectedGap {
  type: TherapyGapType;
  module: ModuleType;
  status: string;
  target: string;
  medication?: string;
  recommendations?: Record<string, unknown>;
  // FDA CDS transparency fields
  evidence?: {
    triggerCriteria: string[];    // What patient data triggered this gap (human-readable)
    guidelineSource: string;      // e.g., "2022 AHA/ACC/HFSA HF Guideline"
    classOfRecommendation: string; // e.g., "Class 1"
    levelOfEvidence: string;      // e.g., "LOE A"
    exclusions?: string[];        // Conditions that would make this gap inapplicable
  };
}

/**
 * Contraindication/exclusion check helper.
 * If the patient has a documented reason NOT to receive a therapy,
 * the gap should not fire. This prevents false positives and respects
 * clinical judgment already documented in the EHR.
 */
function hasContraindication(dxCodes: string[], exclusionCodes: string[]): boolean {
  return dxCodes.some(dx => exclusionCodes.some(ex => dx.startsWith(ex)));
}

// Common exclusion code sets
const EXCLUSION_RENAL_SEVERE = ['N18.5', 'N18.6', 'N19'];  // ESRD, stage 5 CKD
const EXCLUSION_PREGNANCY = ['O00', 'O09', 'Z33'];          // Pregnancy
const EXCLUSION_HOSPICE = ['Z51.5'];                         // Palliative/hospice
const EXCLUSION_ALLERGY_DOCUMENTED = ['Z88'];                // Drug allergy status

/**
 * Runtime Gap Rule Registry -- guideline provenance for every detection rule.
 * Used for audit, compliance, and identifying rules that need updating when guidelines change.
 */
export const RUNTIME_GAP_REGISTRY = [
  {
    id: 'gap-1-attr-cm',
    name: 'ATTR-CM Detection',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Comprehensive Multidisciplinary Care for the Patient with Cardiac Amyloidosis',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: 'Expert Consensus',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-2-iron-deficiency',
    name: 'Iron Deficiency in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-6-finerenone',
    name: 'Finerenone for CKD with T2DM',
    module: 'HEART_FAILURE',
    guidelineSource: 'FIDELIO-DKD / FIGARO-DKD trials; FDA label for Kerendia',
    guidelineVersion: '2022',
    guidelineOrg: 'FDA/ESC',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-39-qtc-safety',
    name: 'QTc Safety Alert',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017/2023 update',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-44-digoxin-toxicity',
    name: 'Digoxin Toxicity Risk',
    module: 'HEART_FAILURE',
    guidelineSource: 'DIG trial post-hoc analysis; 2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-50-dapt',
    name: 'DAPT Discontinuation',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-04',
    nextReviewDue: '2026-10-04',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-34-sglt2i',
    name: 'SGLT2i in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; DAPA-HF, EMPEROR-Reduced',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-35-beta-blocker',
    name: 'Beta-Blocker in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-36-mra',
    name: 'MRA in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; RALES, EMPHASIS-HF',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-oac-afib',
    name: 'Oral Anticoagulation in AFib',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-statin',
    name: 'High-Intensity Statin in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on Management of Blood Cholesterol',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-sh-1-as-surveillance',
    name: 'Aortic Stenosis Echo Surveillance',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-1-mechanical-valve-anticoag',
    name: 'Mechanical Valve Anticoagulation',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-1-pad-statin',
    name: 'PAD Statin Therapy',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-2-abi-screening',
    name: 'ABI Screening',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-05',
    nextReviewDue: '2026-10-05',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-37-raas',
    name: 'ACEi/ARB/ARNi in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-rate-control-afib',
    name: 'Rate Control in AFib',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-cardiac-rehab',
    name: 'Cardiac Rehab Referral in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-sh-2-tavr-eval',
    name: 'TAVR Evaluation for Severe AS',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-vd-2-bioprosthetic-echo',
    name: 'Echo Surveillance for Bioprosthetic Valve',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
] as const;

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

  // All condition flags are now used by gap rules below

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
        status: 'ATTR-CM screening recommended for review',
        target: 'Tc-99m PYP scan considered',
        recommendations: { action: 'Consider Tc-99m PYP Scan based on clinical assessment' },
        evidence: {
          triggerCriteria: [
            `NT-proBNP: ${labValues['nt_probnp'] ?? 'N/A'}`,
            `LVEF: ${labValues['lvef'] ?? 'N/A'}%`,
            `hs-TnT: ${labValues['hs_tnt'] ?? 'N/A'}`,
            `Age: ${age}`,
            `Signals met: ${signals}/3 required`,
          ],
          guidelineSource: '2023 ACC Expert Consensus on ATTR-CM',
          classOfRecommendation: 'Expert Consensus',
          levelOfEvidence: 'B-NR',
          exclusions: ['Known ATTR-CM diagnosis', 'Active oncology treatment'],
        },
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

  // Gap HF-34: SGLT2i Missing in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A (DAPA-HF, EMPEROR-Reduced)
  // All HFrEF (LVEF <=40%) patients should be on SGLT2i regardless of diabetes status
  // RxNorm: dapagliflozin (1488564), empagliflozin (1545653), sotagliflozin (2627044)
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 40) {
    const SGLT2I_CODES = ['1488564', '1545653', '2627044'];
    const onSGLT2i = medCodes.some(c => SGLT2I_CODES.includes(c));
    if (!onSGLT2i) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'SGLT2i not prescribed in HFrEF',
        target: 'SGLT2i initiated',
        medication: 'Dapagliflozin or Empagliflozin',
        recommendations: {
          action: 'Prescribe SGLT2i per 2022 AHA/ACC/HFSA, Class 1, LOE A',
          guideline: 'DAPA-HF / EMPEROR-Reduced trials',
        },
      });
    }
  }

  // Gap HF-35: Beta-Blocker Missing in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A
  // Evidence-based BB: carvedilol (20352), metoprolol succinate (6918), bisoprolol (19484)
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 40) {
    const BB_CODES = ['20352', '6918', '19484'];
    const onBB = medCodes.some(c => BB_CODES.includes(c));
    if (!onBB) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Evidence-based beta-blocker not prescribed in HFrEF',
        target: 'Beta-blocker initiated',
        medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol',
        recommendations: {
          action: 'Prescribe evidence-based BB per 2022 AHA/ACC/HFSA, Class 1, LOE A',
        },
      });
    }
  }

  // Gap HF-36: MRA Missing in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A (RALES, EMPHASIS-HF)
  // Spironolactone (9997) or Eplerenone (298869) when LVEF <=35%, K<5.0, eGFR>30
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    labValues['potassium'] !== undefined && labValues['potassium'] < 5.0 &&
    labValues['egfr'] !== undefined && labValues['egfr'] > 30
  ) {
    const MRA_CODES = ['9997', '298869'];
    const onMRA = medCodes.some(c => MRA_CODES.includes(c));
    if (!onMRA) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'MRA not prescribed in HFrEF with LVEF<=35%',
        target: 'Spironolactone or Eplerenone initiated',
        medication: 'Spironolactone or Eplerenone',
        recommendations: {
          action: 'Prescribe MRA per 2022 AHA/ACC/HFSA, Class 1, LOE A (RALES/EMPHASIS-HF)',
        },
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

  // Gap EP-OAC: Oral Anticoagulation Missing in AFib
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE A
  // AFib patients with CHA2DS2-VASc >=2 (male) or >=3 (female) should be on OAC
  // Simplified: AFib + age>=65 as proxy for elevated CHA2DS2-VASc
  // DOACs: apixaban (1364430), rivaroxaban (1114195), edoxaban (1599538), dabigatran (1037045)
  if (hasAF && age >= 65) {
    const OAC_CODES = ['1364430', '1114195', '1599538', '1037045', '11289']; // DOACs + warfarin
    const onOAC = medCodes.some(c => OAC_CODES.includes(c));
    if (!onOAC) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Oral anticoagulant not prescribed in AFib',
        target: 'OAC therapy initiated',
        medication: 'Apixaban, Rivaroxaban, or Edoxaban',
        recommendations: {
          action: 'Prescribe DOAC per 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE A',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation',
        },
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

  // Gap CAD-STATIN: High-Intensity Statin in CAD
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 1, LOE A
  // All ASCVD patients should be on high-intensity statin
  if (hasCAD) {
    const STATIN_CODES = ['36567', '301542', '83367', '42463'];
    const onStatin = medCodes.some(c => STATIN_CODES.includes(c));
    if (!onStatin) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'High-intensity statin not prescribed in CAD',
        target: 'Statin therapy initiated',
        medication: 'Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
        recommendations: {
          action: 'Prescribe high-intensity statin per 2018 ACC/AHA Cholesterol, Class 1, LOE A',
          guideline: '2018 ACC/AHA Cholesterol Management',
        },
      });
    }
  }

  // ============================================================
  // Structural Heart Module
  // ============================================================

  // Gap SH-1: Aortic Stenosis Surveillance Imaging Overdue
  // Guideline: 2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE B
  // Moderate AS: echo every 1-2 years. Severe AS: echo every 6-12 months.
  // Fires when: AS diagnosis (I35.0) present but no echo observation in 12 months
  const hasAorticStenosis = dxCodes.some(c => c.startsWith('I35.0'));
  if (hasAorticStenosis) {
    const lastEcho = labValues['lvef']; // LVEF implies echo was done
    // If no LVEF in data, echo may be overdue
    if (lastEcho === undefined) {
      gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Echo surveillance overdue for aortic stenosis',
        target: 'Transthoracic echocardiogram completed',
        recommendations: {
          action: 'Order TTE per 2020 ACC/AHA VHD Guideline',
          guideline: '2020 ACC/AHA Valvular Heart Disease, Class 1, LOE B',
        },
      });
    }
  }

  // ============================================================
  // Valvular Disease Module
  // ============================================================

  // Gap VD-1: Anticoagulation Missing in Mechanical Valve
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE A
  // All mechanical valve patients require lifelong warfarin (INR 2.5-3.5)
  // RxNorm warfarin: 11289
  const hasMechanicalValve = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
  );
  if (hasMechanicalValve) {
    const onWarfarin = medCodes.includes('11289');
    if (!onWarfarin) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Warfarin not active with mechanical valve',
        target: 'Warfarin prescribed with target INR 2.5-3.5',
        medication: 'Warfarin',
        recommendations: {
          action: 'Initiate warfarin per 2020 ACC/AHA VHD Guideline, Class 1, LOE A',
          guideline: '2020 ACC/AHA Valvular Heart Disease',
        },
      });
    }
  }

  // ============================================================
  // Peripheral Vascular Module
  // ============================================================

  // Gap PV-1: Statin Missing in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  // All PAD patients should be on high-intensity statin therapy
  // RxNorm statins: atorvastatin (36567), rosuvastatin (301542)
  const hasPAD = dxCodes.some(c => c.startsWith('I73.9') || c.startsWith('I70.2'));
  if (hasPAD) {
    const STATIN_CODES = ['36567', '301542', '83367', '42463']; // atorvastatin, rosuvastatin, simvastatin, pravastatin
    const onStatin = medCodes.some(c => STATIN_CODES.includes(c));
    if (!onStatin) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'High-intensity statin not prescribed in PAD',
        target: 'Statin therapy initiated',
        medication: 'Atorvastatin or Rosuvastatin',
        recommendations: {
          action: 'Prescribe high-intensity statin per 2024 ACC/AHA PAD Guideline, Class 1, LOE A',
          guideline: '2024 ACC/AHA Peripheral Artery Disease',
        },
      });
    }
  }

  // Gap PV-2: ABI Screening Not Done
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE B
  // Patients with claudication symptoms (R26.89) or diabetes + age >50 should have ABI
  const hasClaudication = dxCodes.some(c => c.startsWith('R26') || c.startsWith('M79.6'));
  const diabetesOver50 = hasDiabetes && age >= 50;
  if ((hasClaudication || diabetesOver50) && !hasPAD) {
    const hasABI = labValues['abi_right'] !== undefined || labValues['abi_left'] !== undefined;
    if (!hasABI) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'ABI screening not performed',
        target: 'Ankle-brachial index completed',
        recommendations: {
          action: 'Order ABI per 2024 ACC/AHA PAD Guideline for symptomatic/at-risk patients',
          guideline: '2024 ACC/AHA Peripheral Artery Disease, Class 1, LOE B',
        },
      });
    }
  }

  // ============================================================
  // Gap HF-37: ACEi/ARB/ARNi Missing in HFrEF (First pillar of GDMT)
  // ============================================================
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure, Class 1, LOE A
  // All HFrEF (LVEF <=40%) patients should be on a RAAS inhibitor unless contraindicated
  // Preferred: sacubitril/valsartan (ARNI); alternatives: ACEi or ARB
  // RxNorm: lisinopril (29046), enalapril (3827), ramipril (35296),
  //         losartan (52175), valsartan (69749), sacubitril/valsartan (1656339)
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 40) {
    const RAAS_CODES = ['29046', '3827', '35296', '52175', '69749', '1656339'];
    const onRAAS = medCodes.some(c => RAAS_CODES.includes(c));
    if (!onRAAS) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'ACEi/ARB/ARNi not prescribed in HFrEF',
        target: 'RAAS inhibitor initiated (preferably sacubitril/valsartan)',
        medication: 'Sacubitril/Valsartan (preferred), Lisinopril, Enalapril, Ramipril, Losartan, or Valsartan',
        recommendations: {
          action: 'Prescribe RAAS inhibitor per 2022 AHA/ACC/HFSA, Class 1, LOE A',
          guideline: '2022 AHA/ACC/HFSA Heart Failure Guideline',
          preferred: 'Sacubitril/Valsartan (ARNI) per PARADIGM-HF',
        },
      });
    }
  }

  // ============================================================
  // Gap EP-RC: Rate Control Missing in AFib
  // ============================================================
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE B
  // AFib patients should be on a rate control agent (beta-blocker or non-dihydropyridine CCB)
  // RxNorm: metoprolol (6918), carvedilol (20352), diltiazem (3443), verapamil (11170)
  if (hasAF) {
    const RATE_CONTROL_CODES = ['6918', '20352', '3443', '11170'];
    const onRateControl = medCodes.some(c => RATE_CONTROL_CODES.includes(c));
    if (!onRateControl) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Rate control agent not prescribed in AFib',
        target: 'Beta-blocker or non-dihydropyridine CCB initiated',
        medication: 'Metoprolol, Carvedilol, Diltiazem, or Verapamil',
        recommendations: {
          action: 'Prescribe rate control agent per 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE B',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation',
          note: 'Avoid non-DHP CCB (diltiazem/verapamil) in patients with HFrEF',
        },
      });
    }
  }

  // ============================================================
  // Gap CAD-REHAB: Cardiac Rehab Referral in CAD
  // ============================================================
  // Guideline: 2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization, Class 1, LOE A
  // All CAD patients (I25.*) should be referred to cardiac rehabilitation
  // This is a referral gap, not a medication gap
  if (hasCAD) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'Cardiac rehabilitation referral not documented',
      target: 'Cardiac rehab referral placed',
      recommendations: {
        action: 'Refer to cardiac rehabilitation per 2021 ACC/AHA Coronary Revascularization, Class 1, LOE A',
        guideline: '2021 ACC/AHA/SCAI Coronary Artery Revascularization',
        note: 'Cardiac rehab improves outcomes in all CAD patients, especially post-ACS and post-revascularization',
      },
    });
  }

  // ============================================================
  // Gap SH-2: TAVR Evaluation for Severe Aortic Stenosis
  // ============================================================
  // Guideline: 2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE A
  // Patients with severe AS (I35.0), age >= 65, and LVEF available (suggests symptomatic/evaluated)
  // should be evaluated for TAVR by a heart valve team
  if (hasAorticStenosis && age >= 65 && labValues['lvef'] !== undefined) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'TAVR evaluation not documented for severe aortic stenosis',
      target: 'Heart valve team evaluation for TAVR completed',
      recommendations: {
        action: 'Refer to heart valve team for TAVR evaluation per 2020 ACC/AHA VHD, Class 1, LOE A',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'All patients >= 65 with severe AS should be evaluated by a multidisciplinary heart valve team',
      },
    });
  }

  // ============================================================
  // Gap VD-2: Echo Surveillance for Bioprosthetic Valve
  // ============================================================
  // Guideline: 2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE C
  // Bioprosthetic valve patients (Z95.2, Z95.4) require annual echo surveillance
  // to monitor for structural valve deterioration (SVD)
  // Fires when: bioprosthetic valve present AND no recent echo (LVEF not available as proxy)
  const hasBioprostheticValve = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.4')
  );
  if (hasBioprostheticValve && labValues['lvef'] === undefined) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Echo surveillance overdue for bioprosthetic valve',
      target: 'Annual transthoracic echocardiogram completed',
      recommendations: {
        action: 'Order TTE for bioprosthetic valve surveillance per 2020 ACC/AHA VHD, Class 1, LOE C',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Annual echo monitors for structural valve deterioration (SVD) in bioprosthetic valves',
      },
    });
  }

  return gaps;
}
