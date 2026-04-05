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
  // --- New EP Rules ---
  {
    id: 'gap-ep-laac',
    name: 'LAAC Device Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-ablation',
    name: 'AFib Ablation Referral',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (CASTLE-AF, CABANA)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-device-icd',
    name: 'ICD Evaluation in HFrEF',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline + 2017 ACC/AHA/HRS Ventricular Arrhythmia Guideline',
    guidelineVersion: '2022/2017',
    guidelineOrg: 'AHA/ACC/HFSA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-device-crt',
    name: 'CRT Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-amiodarone-monitor',
    name: 'Amiodarone Toxicity Monitoring',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-dofetilide-rems',
    name: 'Dofetilide REMS Compliance',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: 'FDA REMS Program for Dofetilide (Tikosyn)',
    guidelineVersion: 'Current',
    guidelineOrg: 'FDA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'FDA Mandate',
  },
  {
    id: 'gap-ep-syncope',
    name: 'Syncope Workup',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Syncope',
    guidelineVersion: '2017',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-remote-monitoring',
    name: 'Device Remote Monitoring',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on Remote Interrogation and Monitoring of CIEDs',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  // --- New Coronary Rules ---
  {
    id: 'gap-cad-acei',
    name: 'ACEi/ARB Post-MI',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-bb-post-mi',
    name: 'Beta-Blocker Post-MI',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-smoking',
    name: 'Smoking Cessation in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-lpa',
    name: 'Lipoprotein(a) Screening',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-ezetimibe',
    name: 'Ezetimibe Add-on Therapy',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol (IMPROVE-IT)',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-diabetes-control',
    name: 'A1c Monitoring in CAD+DM',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-bp-control',
    name: 'Blood Pressure Monitoring in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2017 ACC/AHA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure',
    guidelineVersion: '2017',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  // ---- Heart Failure Extended Rules (HF-7 through HF-82) ----
  {
    id: 'gap-hf-7-glp1ra',
    name: 'GLP-1 RA for HFpEF with Obesity',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Management of HFpEF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-12-hcm-screening',
    name: 'HCM Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy',
    guidelineVersion: '2024',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-17-ivabradine',
    name: 'Ivabradine in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-18-vericiguat',
    name: 'Vericiguat in Worsening HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-19-hydralazine-isdn',
    name: 'Hydralazine-ISDN for Black Patients with HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (A-HeFT Trial)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-20-cardiac-rehab',
    name: 'Cardiac Rehab Referral in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-21-hfpef-screening',
    name: 'Undiagnosed HFpEF Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-26-osa-screening',
    name: 'OSA Screening in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-29-remote-monitoring',
    name: 'Remote Patient Monitoring in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (TIM-HF2 Trial)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-30-arni-underdosing',
    name: 'ARNi Underdosing Review',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-37-fu-discharge',
    name: 'Discharge Follow-up in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-38-influenza-vax',
    name: 'Influenza Vaccination in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-73-hyponatremia',
    name: 'Hyponatremia Monitoring in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-74-bnp-monitoring',
    name: 'NT-proBNP Serial Monitoring in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-75-cardiac-mri',
    name: 'Cardiac MRI Referral for Non-Ischemic Cardiomyopathy',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-76-palliative-care',
    name: 'Palliative Care Consult in Advanced HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-77-diuretic-resistance',
    name: 'Diuretic Resistance Assessment',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-79-sglt2i-hfpef',
    name: 'SGLT2i for HFpEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on HFpEF (EMPEROR-Preserved, DELIVER Trials)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-80-cardio-oncology',
    name: 'Cardio-Oncology Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 ACC/AHA Guideline for Cardio-Oncology',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-82-cardiac-sarcoidosis',
    name: 'Cardiac Sarcoidosis Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 HRS Expert Consensus Statement on Evaluation and Management of Arrhythmic Risk in Cardiac Sarcoidosis',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  // --- New Structural Heart Rules (SH-3 through SH-9) ---
  {
    id: 'gap-sh-3-mitral-intervention',
    name: 'Mitral Valve Intervention Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-4-tricuspid-assessment',
    name: 'Tricuspid Valve Assessment',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-sh-5-structural-imaging',
    name: 'Structural Heart Imaging Follow-up',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-6-post-tavr-followup',
    name: 'Post-TAVR Follow-up',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-7-endocarditis-prophylaxis',
    name: 'Endocarditis Prophylaxis Review',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-8-laa-assessment',
    name: 'Left Atrial Appendage Assessment',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-9-pfo-closure',
    name: 'PFO Closure Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 AHA/ASA Guideline for Prevention of Stroke in Patients with Stroke and TIA',
    guidelineVersion: '2020',
    guidelineOrg: 'AHA/ASA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  // --- New Valvular Disease Rules (VD-3 through VD-12) ---
  {
    id: 'gap-vd-3-inr-monitoring',
    name: 'INR Monitoring for Mechanical Valve',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-vd-4-mitral-stenosis',
    name: 'Mitral Stenosis Surveillance',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-5-aortic-regurgitation',
    name: 'Aortic Regurgitation Monitoring',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-6-doac-mechanical-valve',
    name: 'DOAC Contraindicated in Mechanical Valve',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (RE-ALIGN Trial)',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-7-exercise-restriction-as',
    name: 'Exercise Restriction in Severe AS',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-vd-8-rheumatic-screen',
    name: 'Rheumatic Heart Disease Screen',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 AHA Scientific Statement on Rheumatic Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-9-endocarditis-education',
    name: 'Endocarditis Education',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-vd-10-pregnancy-risk',
    name: 'Pregnancy Risk in Valve Disease',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-vd-11-bioprosthetic-degeneration',
    name: 'Bioprosthetic Valve Degeneration Watch',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-12-af-valve-anticoag',
    name: 'Anticoagulation in AF + Valve Disease',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  // --- New Peripheral Vascular Rules (PV-3 through PV-9) ---
  {
    id: 'gap-pv-3-antiplatelet',
    name: 'Antiplatelet in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-4-smoking-cessation',
    name: 'Smoking Cessation in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-5-exercise-therapy',
    name: 'Exercise Therapy for Claudication',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-6-diabetes-control',
    name: 'Diabetes Control in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-7-wound-care',
    name: 'Wound Care Assessment',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-8-duplex-followup',
    name: 'Duplex Ultrasound Follow-up',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-9-aaa-screening',
    name: 'AAA Screening',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA/AATS/STS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // --- New EP Rules (EP-CSP through EP-TORSADES) ---
  {
    id: 'gap-ep-csp',
    name: 'Conduction System Pacing Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS/APHRS/LAHRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-pfa',
    name: 'Pulsed Field Ablation Candidacy',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2024 HRS Expert Consensus on Pulsed Field Ablation',
    guidelineVersion: '2024',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-wpw',
    name: 'WPW Syndrome Detection',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-dronedarone',
    name: 'Dronedarone Contraindication Check',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ANDROMEDA Trial)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-flutter-oac',
    name: 'Atrial Flutter OAC',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-ist-ivabradine',
    name: 'Inappropriate Sinus Tachycardia Treatment',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-ep-pvc-cm',
    name: 'PVC-Induced Cardiomyopathy Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-lqts-bb',
    name: 'Long QT Beta-Blocker',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-subclinical-af',
    name: 'Subclinical AF Detection in Device Patients',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT, NOAH-AFNET 6)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-icd-programming',
    name: 'ICD Programming Optimization',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT, ADVANCE III)',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-lead-integrity',
    name: 'Lead Integrity Monitoring',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-aad-post-ablation',
    name: 'Antiarrhythmic Review Post-Ablation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-secondary-icd',
    name: 'Secondary Prevention ICD',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-achd-arrhythmia',
    name: 'Adult CHD Arrhythmia Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-torsades',
    name: 'Torsades Risk with QT-Prolonging Drugs',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  // --- New Coronary Rules (CAD-PCSK9 through CAD-INFLUENZA) ---
  {
    id: 'gap-cad-pcsk9',
    name: 'PCSK9 Inhibitor Consideration',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on Management of Blood Cholesterol (FOURIER, ODYSSEY)',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-ivus',
    name: 'Intravascular Imaging for Left Main',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-ffr',
    name: 'Fractional Flow Reserve for Intermediate Lesions',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (FAME, FAME 2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-colchicine',
    name: 'Anti-Inflammatory Therapy with Colchicine',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 AHA/ACC Guideline Update: Colchicine for Atherosclerotic CVD (COLCOT, LoDoCo2)',
    guidelineVersion: '2023',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-omega3',
    name: 'Icosapent Ethyl for Elevated Triglycerides',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (REDUCE-IT)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-ranolazine',
    name: 'Refractory Angina Treatment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACC/AHA/AATS/PCNA/SCAI/STS Guideline for Diagnosis and Management of Stable Ischemic Heart Disease',
    guidelineVersion: '2012/2023 update',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-stress-test',
    name: 'Stress Test Follow-up',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-revascularization',
    name: 'Revascularization Assessment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (STICH, REVIVED-BCIS2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-anticoag-af',
    name: 'Anticoagulation in CAD + AF',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS AF Guideline + 2021 ACC/AHA Revascularization (AUGUSTUS, AFIRE)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-glp1-dm',
    name: 'GLP-1 RA for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (SUSTAIN-6, LEADER)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-sglt2-dm',
    name: 'SGLT2i for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (EMPA-REG, CANVAS)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-bempedoic',
    name: 'Bempedoic Acid for Statin Intolerance',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC Expert Consensus Decision Pathway on Nonstatin Therapies (CLEAR Outcomes)',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-weight-mgmt',
    name: 'Weight Management in CAD + Obesity',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-depression',
    name: 'Depression Screening in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2008 AHA Science Advisory: Depression and CHD (reaffirmed 2021)',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-influenza',
    name: 'Influenza Vaccination in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // --- New EP Rules (EP-CSP through EP-TORSADES) ---
  {
    id: 'gap-ep-csp',
    name: 'Conduction System Pacing Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS/APHRS/LAHRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-pfa',
    name: 'Pulsed Field Ablation Candidacy',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2024 HRS Expert Consensus on Pulsed Field Ablation',
    guidelineVersion: '2024',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-wpw',
    name: 'WPW Syndrome Detection',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-dronedarone',
    name: 'Dronedarone Contraindication Check',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ANDROMEDA Trial)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-flutter-oac',
    name: 'Atrial Flutter OAC',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-ist-ivabradine',
    name: 'Inappropriate Sinus Tachycardia Treatment',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-ep-pvc-cm',
    name: 'PVC-Induced Cardiomyopathy Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-lqts-bb',
    name: 'Long QT Beta-Blocker',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-subclinical-af',
    name: 'Subclinical AF Detection in Device Patients',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT, NOAH-AFNET 6)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-icd-programming',
    name: 'ICD Programming Optimization',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT, ADVANCE III)',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-lead-integrity',
    name: 'Lead Integrity Monitoring',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-aad-post-ablation',
    name: 'Antiarrhythmic Review Post-Ablation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-secondary-icd',
    name: 'Secondary Prevention ICD',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-achd-arrhythmia',
    name: 'Adult CHD Arrhythmia Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-torsades',
    name: 'Torsades Risk with QT-Prolonging Drugs',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  // --- New Coronary Rules (CAD-PCSK9 through CAD-INFLUENZA) ---
  {
    id: 'gap-cad-pcsk9',
    name: 'PCSK9 Inhibitor Consideration',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on Management of Blood Cholesterol (FOURIER, ODYSSEY)',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-ivus',
    name: 'Intravascular Imaging for Left Main',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-ffr',
    name: 'Fractional Flow Reserve for Intermediate Lesions',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (FAME, FAME 2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-colchicine',
    name: 'Anti-Inflammatory Therapy with Colchicine',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 AHA/ACC Guideline Update: Colchicine for Atherosclerotic CVD (COLCOT, LoDoCo2)',
    guidelineVersion: '2023',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-omega3',
    name: 'Icosapent Ethyl for Elevated Triglycerides',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (REDUCE-IT)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-ranolazine',
    name: 'Refractory Angina Treatment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACC/AHA/AATS/PCNA/SCAI/STS Guideline for Diagnosis and Management of Stable Ischemic Heart Disease',
    guidelineVersion: '2012/2023 update',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-stress-test',
    name: 'Stress Test Follow-up',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-revascularization',
    name: 'Revascularization Assessment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (STICH, REVIVED-BCIS2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-anticoag-af',
    name: 'Anticoagulation in CAD + AF',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS AF Guideline + 2021 ACC/AHA Revascularization (AUGUSTUS, AFIRE)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-glp1-dm',
    name: 'GLP-1 RA for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (SUSTAIN-6, LEADER)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-sglt2-dm',
    name: 'SGLT2i for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (EMPA-REG, CANVAS)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-bempedoic',
    name: 'Bempedoic Acid for Statin Intolerance',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC Expert Consensus Decision Pathway on Nonstatin Therapies (CLEAR Outcomes)',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-weight-mgmt',
    name: 'Weight Management in CAD + Obesity',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-depression',
    name: 'Depression Screening in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2008 AHA Science Advisory: Depression and CHD (reaffirmed 2021)',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-influenza',
    name: 'Influenza Vaccination in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // --- New EP Rules (EP-CSP through EP-TORSADES) ---
  {
    id: 'gap-ep-csp',
    name: 'Conduction System Pacing Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS/APHRS/LAHRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-pfa',
    name: 'Pulsed Field Ablation Candidacy',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2024 HRS Expert Consensus on Pulsed Field Ablation',
    guidelineVersion: '2024',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-wpw',
    name: 'WPW Syndrome Detection',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-dronedarone',
    name: 'Dronedarone Contraindication Check',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ANDROMEDA Trial)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-flutter-oac',
    name: 'Atrial Flutter OAC',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-ist-ivabradine',
    name: 'Inappropriate Sinus Tachycardia Treatment',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-ep-pvc-cm',
    name: 'PVC-Induced Cardiomyopathy Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-lqts-bb',
    name: 'Long QT Beta-Blocker',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-subclinical-af',
    name: 'Subclinical AF Detection in Device Patients',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT, NOAH-AFNET 6)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-icd-programming',
    name: 'ICD Programming Optimization',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT, ADVANCE III)',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-lead-integrity',
    name: 'Lead Integrity Monitoring',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-aad-post-ablation',
    name: 'Antiarrhythmic Review Post-Ablation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-secondary-icd',
    name: 'Secondary Prevention ICD',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-achd-arrhythmia',
    name: 'Adult CHD Arrhythmia Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-torsades',
    name: 'Torsades Risk with QT-Prolonging Drugs',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  // --- New Coronary Rules (CAD-PCSK9 through CAD-INFLUENZA) ---
  {
    id: 'gap-cad-pcsk9',
    name: 'PCSK9 Inhibitor Consideration',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on Management of Blood Cholesterol (FOURIER, ODYSSEY)',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-ivus',
    name: 'Intravascular Imaging for Left Main',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-ffr',
    name: 'Fractional Flow Reserve for Intermediate Lesions',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (FAME, FAME 2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-colchicine',
    name: 'Anti-Inflammatory Therapy with Colchicine',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 AHA/ACC Guideline Update: Colchicine for Atherosclerotic CVD (COLCOT, LoDoCo2)',
    guidelineVersion: '2023',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-omega3',
    name: 'Icosapent Ethyl for Elevated Triglycerides',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (REDUCE-IT)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-ranolazine',
    name: 'Refractory Angina Treatment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACC/AHA/AATS/PCNA/SCAI/STS Guideline for Diagnosis and Management of Stable Ischemic Heart Disease',
    guidelineVersion: '2012/2023 update',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-stress-test',
    name: 'Stress Test Follow-up',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-revascularization',
    name: 'Revascularization Assessment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (STICH, REVIVED-BCIS2)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-anticoag-af',
    name: 'Anticoagulation in CAD + AF',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS AF Guideline + 2021 ACC/AHA Revascularization (AUGUSTUS, AFIRE)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-glp1-dm',
    name: 'GLP-1 RA for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (SUSTAIN-6, LEADER)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-sglt2-dm',
    name: 'SGLT2i for CAD + Diabetes',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (EMPA-REG, CANVAS)',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-bempedoic',
    name: 'Bempedoic Acid for Statin Intolerance',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC Expert Consensus Decision Pathway on Nonstatin Therapies (CLEAR Outcomes)',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-weight-mgmt',
    name: 'Weight Management in CAD + Obesity',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-depression',
    name: 'Depression Screening in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2008 AHA Science Advisory: Depression and CHD (reaffirmed 2021)',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-influenza',
    name: 'Influenza Vaccination in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // ---- Heart Failure Extended Rules (HF-83 through HF-92) ----
  {
    id: 'gap-hf-83-loop-without-mra',
    name: 'Loop Diuretic Without MRA in HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (RALES, EMPHASIS-HF)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-84-transplant-eval',
    name: 'Transplant Evaluation Referral',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; ISHLT Listing Criteria',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA/ISHLT',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-85-lvad-referral',
    name: 'LVAD Referral for Advanced HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; 2023 ISHLT Mechanical Circulatory Support Guideline',
    guidelineVersion: '2022/2023',
    guidelineOrg: 'AHA/ACC/HFSA/ISHLT',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-86-crt-d-upgrade',
    name: 'CRT-D Upgrade Evaluation',
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
    id: 'gap-hf-87-peripartum',
    name: 'Peripartum Cardiomyopathy Screen',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; ESC Position Statement on PPCM',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA/ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-88-myocarditis',
    name: 'Acute Myocarditis Follow-up',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA Scientific Statement on Myocarditis',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-89-fabry',
    name: 'Fabry Disease Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy; ESC Fabry Expert Consensus',
    guidelineVersion: '2024',
    guidelineOrg: 'AHA/ACC/ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-90-amyloid-biomarker',
    name: 'Amyloid Biomarker Follow-up',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Comprehensive Multidisciplinary Care for Cardiac Amyloidosis',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-hf-91-sleep-apnea-treatment',
    name: 'CSA/OSA Treatment in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; SERVE-HF trial',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-92-volume-status',
    name: 'Volume Status Monitoring in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // ---- Structural Heart Extended Rules (SH-10 through SH-17) ----
  {
    id: 'gap-sh-10-mitraclip',
    name: 'MitraClip Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (COAPT Trial)',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-11-tmvr',
    name: 'Transcatheter Mitral Valve Replacement Candidacy',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-sh-12-ttvr',
    name: 'Tricuspid Intervention Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ACC TVT Registry',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-sh-13-paravalvular-leak',
    name: 'Paravalvular Leak Assessment',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-14-congenital-adult',
    name: 'Adult Congenital Heart Disease Screen',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-sh-15-alcohol-septal',
    name: 'Alcohol Septal Ablation Candidacy',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy',
    guidelineVersion: '2024',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-16-watchman-fu',
    name: 'WATCHMAN Device Follow-up',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF; WATCHMAN post-implant protocol',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-17-3d-echo',
    name: '3D Echo for Structural Planning',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ASE Structural Heart Imaging Guideline',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA/ASE',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  // ---- Valvular Disease Extended Rules (VD-13 through VD-18) ----
  {
    id: 'gap-vd-13-anticoag-first3mo',
    name: 'Anticoagulation First 3 Months Post-Bioprosthetic',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-14-dental-prophylaxis',
    name: 'Dental Prophylaxis in High-Risk Valve',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
    guidelineVersion: '2021',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-15-aortic-root',
    name: 'Aortic Root Dilation Monitoring',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA/AATS/STS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-16-mixed-valve',
    name: 'Mixed Valve Disease Assessment',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-vd-17-hemolysis',
    name: 'Hemolysis Monitoring Post-Valve',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-vd-18-exercise-testing',
    name: 'Exercise Testing in Asymptomatic Severe Valve Disease',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  // ---- Peripheral Vascular Extended Rules (PV-10 through PV-15) ----
  {
    id: 'gap-pv-10-cilostazol',
    name: 'Cilostazol for Claudication',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-11-acei-pad',
    name: 'ACEi/ARB in PAD with Hypertension',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; HOPE Trial',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-12-renal-artery',
    name: 'Renal Artery Stenosis Screen',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; 2017 ACC/AHA Hypertension Guideline',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-pv-13-carotid',
    name: 'Carotid Screening in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; 2021 ASA/AHA Stroke Guideline',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA/ASA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-14-foot-exam',
    name: 'Annual Foot Exam in PAD with Diabetes',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; ADA Standards of Care 2024',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA/ADA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-15-compression',
    name: 'Compression Therapy Assessment',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2022 ESVS/SVS Guidelines on Chronic Venous Disease; AHA Venous Disease Scientific Statement',
    guidelineVersion: '2022',
    guidelineOrg: 'ESVS/SVS/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
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

  // ============================================================
  // Heart Failure Extended Gap Rules (HF-7 through HF-82)
  // ============================================================

  // Gap HF-7: GLP-1 RA for HFpEF with Obesity
  // Guideline: 2023 ACC Expert Consensus Decision Pathway on Management of HFpEF
  const hasObesity = dxCodes.some(c => c.startsWith('E66'));
  const bmiOver30 = labValues['bmi'] !== undefined && labValues['bmi'] > 30;
  if (
    hasHF &&
    (hasObesity || bmiOver30) &&
    labValues['lvef'] !== undefined && labValues['lvef'] >= 50 &&
    !medCodes.some(c => ['2551758', '475968'].includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'GLP-1 RA not prescribed in HFpEF with obesity',
      target: 'GLP-1 RA therapy considered',
      medication: 'Semaglutide or Liraglutide',
      recommendations: { action: 'Consider GLP-1 RA for HFpEF with obesity per 2023 ACC Expert Consensus' },
      evidence: {
        triggerCriteria: ['HFpEF (LVEF >= 50%)', 'Obesity (BMI > 30 or E66.* diagnosis)', 'No current GLP-1 RA'],
        guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Management of HFpEF',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Medullary thyroid carcinoma', 'MEN2 syndrome', 'Pancreatitis history', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-12: HCM Screening
  // Guideline: 2024 AHA/ACC Guideline for the Diagnosis and Treatment of HCM
  const hasHCMcodes = dxCodes.some(c => c.startsWith('I42.1') || c.startsWith('I42.2'));
  if (
    hasHCMcodes &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'HCM evaluation recommended for review',
      target: 'HCM comprehensive evaluation completed',
      recommendations: { action: 'Recommended for review: HCM evaluation with genetic counseling per 2024 AHA/ACC HCM Guideline' },
      evidence: {
        triggerCriteria: ['Hypertrophic cardiomyopathy ICD code (I42.1 or I42.2)'],
        guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Known HCM with established management plan', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-17: Ivabradine in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  const BB_CODES_IVA = ['20352', '6918', '19484'];
  const onBBforIva = medCodes.some(c => BB_CODES_IVA.includes(c));
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    labValues['heart_rate'] !== undefined && labValues['heart_rate'] > 70 &&
    onBBforIva &&
    !hasAF &&
    !medCodes.includes('1649480') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Ivabradine not prescribed in HFrEF with elevated HR on max beta-blocker',
      target: 'Ivabradine therapy considered',
      medication: 'Ivabradine',
      recommendations: { action: 'Consider ivabradine for persistent HR > 70 bpm in sinus rhythm per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['LVEF <= 35%', 'HR > 70 bpm', 'On beta-blocker', 'Sinus rhythm (no AFib)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Atrial fibrillation', 'Severe hepatic impairment', 'Sick sinus syndrome', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-18: Vericiguat in Worsening HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 45 &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 400 &&
    !medCodes.includes('2475055') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Vericiguat not prescribed in worsening HF',
      target: 'Vericiguat therapy considered',
      medication: 'Vericiguat',
      recommendations: { action: 'Consider vericiguat for worsening HF with recent hospitalization per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['LVEF < 45%', 'Elevated BNP > 400 (worsening HF proxy)', 'No current vericiguat'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Concurrent use of long-acting nitrates', 'Concurrent PDE5 inhibitors', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-19: Hydralazine-ISDN for Black Patients with HFrEF
  // Guideline: 2022 AHA/ACC/HFSA Guideline (A-HeFT Trial)
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 40 &&
    gender === 'BLACK' &&
    !medCodes.some(c => ['5470', '6058'].includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Hydralazine-ISDN not prescribed in self-identified Black patient with HFrEF',
      target: 'Hydralazine-ISDN therapy considered',
      medication: 'Hydralazine + Isosorbide Dinitrate',
      recommendations: { action: 'Consider hydralazine-ISDN per 2022 AHA/ACC/HFSA (A-HeFT), Class 1' },
      evidence: {
        triggerCriteria: ['HFrEF (LVEF <= 40%)', 'Self-identified Black race', 'No current hydralazine or ISDN'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (A-HeFT Trial)',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hypotension (SBP < 90)', 'Hospice/palliative care', 'Drug allergy documented'],
      },
    });
  }

  // Gap HF-20: Cardiac Rehab Referral in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac rehabilitation referral not documented for HF',
      target: 'Cardiac rehab referral placed',
      recommendations: { action: 'Consider cardiac rehabilitation referral per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis (I50.*)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Unstable angina', 'Decompensated HF', 'Severe functional limitation', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-21: Undiagnosed HFpEF Screening
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  const hasHTN = dxCodes.some(c => c.startsWith('I10'));
  if (
    !hasHF &&
    age > 65 &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 125 &&
    hasHTN &&
    hasDiabetes &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Undiagnosed HFpEF screening recommended for review',
      target: 'Echocardiographic evaluation for HFpEF completed',
      recommendations: { action: 'Guideline suggests echocardiographic evaluation for occult HFpEF per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Age > 65', 'Elevated BNP > 125', 'Hypertension (I10)', 'Type 2 diabetes (E11)', 'No HF diagnosis'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Known HF diagnosis', 'Recent echocardiogram', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-26: OSA Screening in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  const hasOSA = dxCodes.some(c => c.startsWith('G47.3'));
  if (
    hasHF &&
    (hasObesity || bmiOver30) &&
    !hasOSA &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Obstructive sleep apnea screening not documented in HF with obesity',
      target: 'Sleep study or OSA screening completed',
      recommendations: { action: 'Consider OSA screening in HF patients with obesity per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'Obesity (BMI > 30 or E66.*)', 'No OSA diagnosis (G47.3)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Known OSA on treatment', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-29: Remote Patient Monitoring in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline (TIM-HF2 Trial)
  if (
    hasHF &&
    ((labValues['bnp'] !== undefined && labValues['bnp'] > 300) ||
     (labValues['lvef'] !== undefined && labValues['lvef'] < 30)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Remote patient monitoring not documented in high-risk HF',
      target: 'Remote monitoring enrollment considered',
      recommendations: { action: 'Consider remote patient monitoring for high-risk HF per 2022 AHA/ACC/HFSA (TIM-HF2)' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'BNP > 300 or LVEF < 30%'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (TIM-HF2 Trial)',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Already enrolled in remote monitoring', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-30: ARNi Underdosing Review
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    medCodes.includes('1656339') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_UNDERDOSED,
      module: ModuleType.HEART_FAILURE,
      status: 'Sacubitril/valsartan dose optimization review recommended',
      target: 'ARNi dose titrated to target or documented rationale',
      medication: 'Sacubitril/Valsartan',
      recommendations: { action: 'Recommended for review: ARNi dose optimization per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['On sacubitril/valsartan (RxNorm 1656339)', 'Dose optimization not confirmed'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-R',
        exclusions: ['Hypotension (SBP < 90)', 'Hyperkalemia', 'Renal impairment limiting titration', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-37-FU: Discharge Follow-up in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.FOLLOWUP_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Post-discharge follow-up not documented within 7 days',
      target: 'Follow-up visit within 7 days of discharge',
      recommendations: { action: 'Guideline suggests early post-discharge follow-up within 7 days per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'Encounter present (discharge proxy)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Follow-up already scheduled', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-38: Influenza Vaccination in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (hasHF && !hasContraindication(dxCodes, [...EXCLUSION_HOSPICE, ...EXCLUSION_ALLERGY_DOCUMENTED])) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Influenza vaccination status not documented in HF',
      target: 'Annual influenza vaccination administered or documented',
      recommendations: { action: 'Recommended for review: annual influenza vaccination per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis (I50.*)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Documented egg allergy or vaccine contraindication', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-73: Hyponatremia Monitoring in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    labValues['sodium'] !== undefined && labValues['sodium'] < 135 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SAFETY_ALERT,
      module: ModuleType.HEART_FAILURE,
      status: `Hyponatremia detected: sodium ${labValues['sodium']} mEq/L`,
      target: 'Sodium level monitored and fluid restriction considered',
      recommendations: { action: 'Consider evaluation of hyponatremia etiology and fluid restriction per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', `Sodium < 135 mEq/L (current: ${labValues['sodium']})`],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Known chronic hyponatremia on active management', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-74: NT-proBNP Serial Monitoring in HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    labValues['bnp'] === undefined && labValues['nt_probnp'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'NT-proBNP/BNP monitoring not documented in HF',
      target: 'Serial natriuretic peptide measurement obtained',
      recommendations: { action: 'Consider serial NT-proBNP/BNP monitoring per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'No recent BNP or NT-proBNP value on record'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Recent natriuretic peptide within 3 months', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-75: Cardiac MRI Referral for Non-Ischemic Cardiomyopathy
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  const hasNICM = dxCodes.some(c => c.startsWith('I42.0'));
  if (
    hasNICM &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac MRI not documented for non-ischemic cardiomyopathy',
      target: 'Cardiac MRI with late gadolinium enhancement completed',
      recommendations: { action: 'Consider cardiac MRI for etiology and prognosis assessment per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Non-ischemic cardiomyopathy (I42.0)', 'LVEF < 50%'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Cardiac MRI already performed', 'MRI contraindication (pacemaker, etc.)', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-76: Palliative Care Consult in Advanced HF
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    age > 80 &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 25 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.HEART_FAILURE,
      status: 'Palliative care consult not documented in advanced HF',
      target: 'Palliative care consultation completed',
      recommendations: { action: 'Consider palliative care consultation for symptom management per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'Age > 80', 'LVEF < 25%'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Already receiving palliative care', 'Hospice enrolled'],
      },
    });
  }

  // Gap HF-77: Diuretic Resistance Assessment
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  if (
    hasHF &&
    medCodes.includes('4603') &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 600 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Diuretic resistance assessment recommended in HF with persistent congestion',
      target: 'Diuretic strategy reassessed or nephrology consultation',
      medication: 'Furosemide',
      recommendations: { action: 'Consider diuretic resistance evaluation and strategy adjustment per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'On furosemide (RxNorm 4603)', 'BNP > 600 (persistent congestion proxy)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Recent diuretic adjustment within 7 days', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-79: SGLT2i for HFpEF
  // Guideline: 2023 ACC Expert Consensus on HFpEF (EMPEROR-Preserved, DELIVER Trials)
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] >= 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const SGLT2I_CODES_HFPEF = ['1488564', '1545653', '2627044'];
    const onSGLT2iHFpEF = medCodes.some(c => SGLT2I_CODES_HFPEF.includes(c));
    if (!onSGLT2iHFpEF) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'SGLT2i not prescribed in HFpEF',
        target: 'SGLT2i therapy considered for HFpEF',
        medication: 'Dapagliflozin or Empagliflozin',
        recommendations: { action: 'Consider SGLT2i for HFpEF per 2023 ACC Expert Consensus (EMPEROR-Preserved, DELIVER)' },
        evidence: {
          triggerCriteria: ['HFpEF (LVEF >= 50%)', 'No current SGLT2i'],
          guidelineSource: '2023 ACC Expert Consensus Decision Pathway on HFpEF (EMPEROR-Preserved, DELIVER Trials)',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['eGFR < 20', 'Type 1 diabetes', 'Recurrent DKA', 'Hospice/palliative care'],
        },
      });
    }
  }

  // Gap HF-80: Cardio-Oncology Screening
  // Guideline: 2022 ACC/AHA Guideline for Cardio-Oncology
  const hasCancer = dxCodes.some(c => /^C[0-9]/.test(c));
  if (
    hasHF &&
    hasCancer &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardio-oncology evaluation not documented in HF with cancer',
      target: 'Cardio-oncology consultation completed',
      recommendations: { action: 'Consider cardio-oncology consultation per 2022 ACC/AHA Cardio-Oncology Guideline' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'Active cancer diagnosis (C00-C97)'],
        guidelineSource: '2022 ACC/AHA Guideline for Cardio-Oncology',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Already under cardio-oncology care', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-82: Cardiac Sarcoidosis Screening
  // Guideline: 2023 HRS Expert Consensus Statement on Arrhythmic Risk in Cardiac Sarcoidosis
  const hasCM = dxCodes.some(c => c.startsWith('I42.0') || c.startsWith('I42.1'));
  const hasArrhythmia = dxCodes.some(c => c.startsWith('I49'));
  if (
    hasCM &&
    hasArrhythmia &&
    age >= 25 && age <= 60 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac sarcoidosis screening recommended for review',
      target: 'Cardiac sarcoidosis evaluation with advanced imaging completed',
      recommendations: { action: 'Consider cardiac sarcoidosis evaluation with PET or CMR per 2023 HRS Expert Consensus' },
      evidence: {
        triggerCriteria: ['Cardiomyopathy (I42.0 or I42.1)', 'Arrhythmia (I49.*)', 'Age 25-60'],
        guidelineSource: '2023 HRS Expert Consensus Statement on Evaluation and Management of Arrhythmic Risk in Cardiac Sarcoidosis',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C',
        exclusions: ['Known sarcoidosis diagnosis', 'Alternative etiology established', 'Hospice/palliative care'],
      },
    });
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

  // ============================================================
  // EP-LAAC: LAAC Device Evaluation for AFib with OAC Contraindication
  // ============================================================
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 2a, LOE B
  // AFib + age>=65 + contraindication to OAC (documented allergy Z88 or bleeding history)
  if (hasAF && age >= 65 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasOACContraindication = dxCodes.some(c =>
      c.startsWith('Z88') || c.startsWith('D68.3') || c.startsWith('K92.2') || c.startsWith('I60') || c.startsWith('I61') || c.startsWith('I62')
    );
    if (hasOACContraindication) {
      gaps.push({
        type: TherapyGapType.DEVICE_ELIGIBLE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider LAAC device evaluation for AFib with OAC contraindication',
        target: 'LAAC candidacy evaluated by EP specialist',
        recommendations: {
          action: 'Consider referral for Left Atrial Appendage Closure (LAAC) evaluation',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation',
          note: 'Recommended for review in AFib patients with documented contraindication to long-term oral anticoagulation',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            `Age: ${age} (>=65)`,
            'Documented OAC contraindication (allergy Z88.* or bleeding history)',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Able to tolerate OAC therapy'],
        },
      });
    }
  }

  // ============================================================
  // EP-ABLATION: AFib Ablation Referral
  // ============================================================
  // Guideline: 2023 ACC/AHA AFib (CASTLE-AF, CABANA trials), Class 2a, LOE B-R
  // AFib + age<80 + symptomatic (AF + HF combo as proxy for symptomatic AF)
  if (hasAF && age < 80 && hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider AFib catheter ablation referral',
      target: 'EP consultation for ablation candidacy completed',
      recommendations: {
        action: 'Consider referral to electrophysiology for catheter ablation evaluation',
        guideline: '2023 ACC/AHA AFib Guideline (CASTLE-AF, CABANA)',
        note: 'Recommended for review in symptomatic AFib patients with concurrent heart failure',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          `Age: ${age} (<80)`,
          'Heart failure diagnosis (I50.*) as proxy for symptomatic AFib',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (CASTLE-AF, CABANA)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Age >= 80', 'Prior ablation documented'],
      },
    });
  }

  // ============================================================
  // EP-DEVICE-ICD: ICD Evaluation in HFrEF
  // ============================================================
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline + 2017 ACC/AHA/HRS VA Guideline, Class 1, LOE A
  // LVEF <=35% + HF diagnosis
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 35 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasICD = dxCodes.some(c => c.startsWith('Z95.810') || c.startsWith('Z95.0'));
    if (!hasICD) {
      gaps.push({
        type: TherapyGapType.DEVICE_ELIGIBLE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider ICD evaluation for primary prevention in HFrEF',
        target: 'ICD candidacy evaluated by EP specialist',
        recommendations: {
          action: 'Consider referral for ICD evaluation in HFrEF with LVEF <=35%',
          guideline: '2022 AHA/ACC/HFSA HF + 2017 ACC/AHA/HRS VA Guideline',
          note: 'Recommended for review after >=3 months of optimized GDMT',
        },
        evidence: {
          triggerCriteria: [
            'Heart failure diagnosis (I50.*)',
            `LVEF: ${labValues['lvef']}% (<=35%)`,
            'No existing ICD/device documented',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA HF Guideline + 2017 ACC/AHA/HRS Ventricular Arrhythmia Guideline',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD (Z95.810)', 'Life expectancy < 1 year'],
        },
      });
    }
  }

  // ============================================================
  // EP-DEVICE-CRT: CRT Evaluation
  // ============================================================
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A
  // LVEF <=35% + QRS >150ms
  if (
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    labValues['qrs_duration'] !== undefined && labValues['qrs_duration'] > 150 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider CRT evaluation for LVEF <=35% with wide QRS',
      target: 'CRT candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider referral for Cardiac Resynchronization Therapy (CRT) evaluation',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review in patients with LVEF <=35% and QRS >150ms (especially LBBB morphology)',
      },
      evidence: {
        triggerCriteria: [
          `LVEF: ${labValues['lvef']}% (<=35%)`,
          `QRS duration: ${labValues['qrs_duration']}ms (>150ms)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing CRT device', 'Life expectancy < 1 year'],
      },
    });
  }

  // ============================================================
  // EP-AMIODARONE-MONITOR: Amiodarone Toxicity Monitoring
  // ============================================================
  // Guideline: 2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline, Class 1, LOE B
  // On amiodarone (RxNorm 703) -- check thyroid, liver, pulmonary function
  if (medCodes.includes('703') && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasTSH = labValues['tsh'] !== undefined;
    const hasLFT = labValues['alt'] !== undefined || labValues['ast'] !== undefined;
    if (!hasTSH || !hasLFT) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Amiodarone toxicity monitoring recommended for review',
        target: 'Thyroid, liver, and pulmonary function tests completed',
        medication: 'Amiodarone',
        recommendations: {
          action: 'Consider ordering TSH, LFTs, and pulmonary function tests for amiodarone monitoring',
          guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
          note: 'Recommended for review: amiodarone requires monitoring for thyroid, hepatic, and pulmonary toxicity',
        },
        evidence: {
          triggerCriteria: [
            'Amiodarone active (RxNorm 703)',
            `TSH available: ${hasTSH ? 'Yes' : 'No'}`,
            `LFTs available: ${hasLFT ? 'Yes' : 'No'}`,
          ],
          guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // ============================================================
  // EP-DOFETILIDE-REMS: Dofetilide REMS Compliance
  // ============================================================
  // Guideline: FDA REMS Program, Class 1
  // On dofetilide (RxNorm 135447) -- requires in-hospital initiation and QTc monitoring
  if (medCodes.includes('135447') && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasQTc = labValues['qtc_interval'] !== undefined;
    const hasCreatinine = labValues['creatinine'] !== undefined;
    if (!hasQTc || !hasCreatinine) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Dofetilide REMS monitoring recommended for review',
        target: 'QTc and renal function monitoring completed per REMS',
        medication: 'Dofetilide',
        recommendations: {
          action: 'Consider verifying dofetilide REMS compliance: QTc monitoring and renal function assessment',
          guideline: 'FDA REMS Program for Dofetilide (Tikosyn)',
          note: 'Recommended for review: dofetilide requires ECG and creatinine clearance monitoring per FDA REMS',
        },
        evidence: {
          triggerCriteria: [
            'Dofetilide active (RxNorm 135447)',
            `QTc available: ${hasQTc ? 'Yes' : 'No'}`,
            `Creatinine available: ${hasCreatinine ? 'Yes' : 'No'}`,
          ],
          guidelineSource: 'FDA REMS Program for Dofetilide (Tikosyn)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'FDA Mandate',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // ============================================================
  // EP-SYNCOPE: Syncope Workup
  // ============================================================
  // Guideline: 2017 ACC/AHA/HRS Syncope Guideline, Class 1, LOE B
  // Syncope diagnosis (R55) without documented workup
  const hasSyncope = dxCodes.some(c => c.startsWith('R55'));
  if (hasSyncope && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasECG = labValues['qtc_interval'] !== undefined || labValues['qrs_duration'] !== undefined;
    if (!hasECG) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider syncope workup evaluation',
        target: 'ECG, orthostatic vitals, and echocardiogram completed',
        recommendations: {
          action: 'Consider initial syncope workup: 12-lead ECG, orthostatic vital signs, and echocardiogram',
          guideline: '2017 ACC/AHA/HRS Syncope Guideline',
          note: 'Recommended for review: all syncope patients should have baseline cardiac evaluation',
        },
        evidence: {
          triggerCriteria: [
            'Syncope diagnosis (R55)',
            'No ECG data available in recent observations',
          ],
          guidelineSource: '2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Syncope',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Clearly situational syncope'],
        },
      });
    }
  }

  // ============================================================
  // EP-REMOTE-MONITORING: Device Remote Monitoring
  // ============================================================
  // Guideline: 2023 HRS Expert Consensus, Class 1, LOE A
  // Any pacemaker/ICD (Z95.0) should be on remote monitoring
  const hasCIED = dxCodes.some(c => c.startsWith('Z95.0') || c.startsWith('Z95.810'));
  if (hasCIED && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider remote monitoring enrollment for cardiac implantable device',
      target: 'Remote monitoring setup confirmed',
      recommendations: {
        action: 'Consider enrolling patient in remote monitoring for pacemaker/ICD',
        guideline: '2023 HRS Expert Consensus on Remote Monitoring of CIEDs',
        note: 'Recommended for review: remote monitoring reduces time to clinical decision and improves outcomes',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac implantable electronic device (Z95.0 or Z95.810)',
        ],
        guidelineSource: '2023 HRS Expert Consensus Statement on Remote Interrogation and Monitoring of CIEDs',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
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
  // CAD-ACEI: ACEi/ARB Post-MI
  // ============================================================
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE A
  // Recent MI (I21/I22) + no RAAS inhibitor
  const hasRecentMI = dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22'));
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const RAAS_CODES_MI = ['29046', '3827', '35296', '52175', '69749', '1656339'];
    const onRAASmi = medCodes.some(c => RAAS_CODES_MI.includes(c));
    if (!onRAASmi) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'ACEi/ARB not prescribed post-MI',
        target: 'RAAS inhibitor initiated post-MI',
        medication: 'Lisinopril, Enalapril, Ramipril, Losartan, or Valsartan',
        recommendations: {
          action: 'Consider initiating ACEi/ARB post-MI per 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE A',
          guideline: '2022 ACC/AHA Chest Pain Guideline',
          note: 'Recommended for review in all post-MI patients, especially with LVEF <=40% or anterior MI',
        },
        evidence: {
          triggerCriteria: [
            'Recent MI diagnosis (I21.* or I22.*)',
            'No RAAS inhibitor in active medications',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Hyperkalemia', 'Bilateral renal artery stenosis', 'Angioedema history'],
        },
      });
    }
  }

  // ============================================================
  // CAD-BB-POST-MI: Beta-Blocker Post-MI with Reduced EF
  // ============================================================
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE A
  // MI (I21/I22) + LVEF <=40% + no beta-blocker
  if (hasRecentMI && labValues['lvef'] !== undefined && labValues['lvef'] <= 40 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const BB_CODES_MI = ['20352', '6918', '19484']; // carvedilol, metoprolol succinate, bisoprolol
    const onBBmi = medCodes.some(c => BB_CODES_MI.includes(c));
    if (!onBBmi) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Beta-blocker not prescribed post-MI with reduced LVEF',
        target: 'Evidence-based beta-blocker initiated',
        medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol',
        recommendations: {
          action: 'Consider initiating evidence-based beta-blocker post-MI per 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE A',
          guideline: '2022 ACC/AHA Chest Pain Guideline',
          note: 'Recommended for review in post-MI patients with LVEF <=40%',
        },
        evidence: {
          triggerCriteria: [
            'MI diagnosis (I21.* or I22.*)',
            `LVEF: ${labValues['lvef']}% (<=40%)`,
            'No beta-blocker in active medications',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe bradycardia', 'Decompensated HF', 'Severe reactive airway disease'],
        },
      });
    }
  }

  // ============================================================
  // CAD-SMOKING: Smoking Cessation Referral
  // ============================================================
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE A
  // CAD + smoking diagnosis (F17/Z72.0)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const isSmoker = dxCodes.some(c => c.startsWith('F17') || c.startsWith('Z72.0'));
    if (isSmoker) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Smoking cessation support recommended for review in CAD patient',
        target: 'Smoking cessation referral or pharmacotherapy initiated',
        recommendations: {
          action: 'Consider referral to smoking cessation program and/or pharmacotherapy',
          guideline: '2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: smoking cessation is the single most impactful modifiable risk factor in CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Active tobacco use (F17.* or Z72.0)',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // ============================================================
  // CAD-LPA: Lipoprotein(a) Screening in Premature ASCVD
  // ============================================================
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 2a, LOE B
  // CAD + premature ASCVD (age <55 male, <65 female)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const prematureASCVD = (gender === 'MALE' && age < 55) || (gender === 'FEMALE' && age < 65);
    if (prematureASCVD) {
      const hasLpa = labValues['lipoprotein_a'] !== undefined;
      if (!hasLpa) {
        gaps.push({
          type: TherapyGapType.SCREENING_DUE,
          module: ModuleType.CORONARY_INTERVENTION,
          status: 'Consider Lipoprotein(a) screening in premature ASCVD',
          target: 'Lipoprotein(a) level measured',
          recommendations: {
            action: 'Consider ordering Lipoprotein(a) level for premature ASCVD evaluation',
            guideline: '2018 ACC/AHA Cholesterol Guideline',
            note: 'Recommended for review: elevated Lp(a) is an independent risk factor and may guide intensification of therapy',
          },
          evidence: {
            triggerCriteria: [
              'Coronary artery disease (I25.*)',
              `Age: ${age}, Gender: ${gender ?? 'unknown'} (premature ASCVD threshold: male <55, female <65)`,
              'No Lipoprotein(a) result in recent labs',
            ],
            guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
            classOfRecommendation: 'Class 2a',
            levelOfEvidence: 'LOE B',
            exclusions: ['Hospice/palliative care (Z51.5)', 'Lp(a) already measured'],
          },
        });
      }
    }
  }

  // ============================================================
  // CAD-EZETIMIBE: Ezetimibe Add-on Therapy
  // ============================================================
  // Guideline: 2018 ACC/AHA Cholesterol Guideline (IMPROVE-IT), Class 1, LOE A
  // CAD + on statin + LDL >70
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_EZE = ['36567', '301542', '83367', '42463'];
    const onStatinEze = medCodes.some(c => STATIN_CODES_EZE.includes(c));
    const onEzetimibe = medCodes.includes('341248');
    if (onStatinEze && !onEzetimibe && labValues['ldl'] !== undefined && labValues['ldl'] > 70) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider ezetimibe add-on for LDL not at goal on statin',
        target: 'Ezetimibe initiated or LDL at goal (<70 mg/dL)',
        medication: 'Ezetimibe',
        recommendations: {
          action: 'Consider adding ezetimibe to statin therapy per 2018 ACC/AHA Cholesterol Guideline (IMPROVE-IT)',
          guideline: '2018 ACC/AHA Cholesterol Guideline',
          note: 'Recommended for review: LDL >70 mg/dL on maximally tolerated statin in ASCVD patient',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Currently on statin therapy',
            `LDL: ${labValues['ldl']} mg/dL (>70)`,
            'Ezetimibe not in active medications (RxNorm 341248)',
          ],
          guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol (IMPROVE-IT trial)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Ezetimibe allergy or intolerance'],
        },
      });
    }
  }

  // ============================================================
  // CAD-DIABETES-CONTROL: A1c Monitoring in CAD + Diabetes
  // ============================================================
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE A
  // CAD + diabetes + no HbA1c in labs
  if (hasCAD && hasDiabetes && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasA1c = labValues['hba1c'] !== undefined;
    if (!hasA1c) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'HbA1c monitoring recommended for review in CAD patient with diabetes',
        target: 'HbA1c level measured',
        recommendations: {
          action: 'Consider ordering HbA1c for glycemic monitoring in CAD + diabetes',
          guideline: '2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: glycemic control is a key modifiable risk factor in CAD patients with diabetes',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Diabetes mellitus (E11.*)',
            'No HbA1c result in recent observations',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // ============================================================
  // CAD-BP-CONTROL: Blood Pressure Monitoring in CAD
  // ============================================================
  // Guideline: 2017 ACC/AHA Hypertension Guideline, Class 1, LOE A
  // CAD + no recent BP check (systolic_bp not in observations)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasBP = labValues['systolic_bp'] !== undefined || labValues['diastolic_bp'] !== undefined;
    if (!hasBP) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Blood pressure monitoring recommended for review in CAD patient',
        target: 'Blood pressure measurement documented',
        recommendations: {
          action: 'Consider blood pressure assessment for CAD patient',
          guideline: '2017 ACC/AHA Hypertension Guideline',
          note: 'Recommended for review: BP target <130/80 mmHg in CAD patients per ACC/AHA guidelines',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No recent blood pressure measurement in observations',
          ],
          guidelineSource: '2017 ACC/AHA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)'],
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

  // ============================================================
  // NEW Structural Heart Rules (SH-3 through SH-9)
  // ============================================================

  // Gap SH-3: Mitral Valve Intervention Evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Mitral regurgitation (I34.0) with LVEF < 60 or symptomatic warrants intervention evaluation
  const hasMitralRegurg = dxCodes.some(c => c.startsWith('I34.0'));
  if (
    hasMitralRegurg &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const lvefBelow60 = labValues['lvef'] !== undefined && labValues['lvef'] < 60;
    const symptomatic = dxCodes.some(c => c.startsWith('R06') || c.startsWith('R00')); // Dyspnea, palpitations
    if (lvefBelow60 || symptomatic) {
      gaps.push({
        type: TherapyGapType.PROCEDURE_INDICATED,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Mitral valve intervention evaluation recommended for review',
        target: 'Mitral valve intervention assessment completed',
        recommendations: {
          action: 'Consider referral to heart valve team for mitral valve intervention evaluation per 2020 ACC/AHA VHD',
        },
        evidence: {
          triggerCriteria: [
            'Mitral regurgitation (I34.0)',
            `LVEF: ${labValues['lvef'] ?? 'N/A'}% (threshold < 60%)`,
            `Symptomatic: ${symptomatic ? 'Yes' : 'No'}`,
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Life expectancy < 1 year'],
        },
      });
    }
  }

  // Gap SH-4: Tricuspid Valve Assessment
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE C
  // Tricuspid regurgitation (I36.1) with right heart symptoms warrants assessment
  const hasTricuspidRegurg = dxCodes.some(c => c.startsWith('I36.1'));
  if (
    hasTricuspidRegurg &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // Right heart symptom proxies: peripheral edema (R60), hepatomegaly (R16), ascites (R18)
    const hasRightHeartSymptoms = dxCodes.some(c =>
      c.startsWith('R60') || c.startsWith('R16') || c.startsWith('R18')
    );
    if (hasRightHeartSymptoms) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Tricuspid valve assessment recommended for review',
        target: 'Tricuspid valve evaluation completed',
        recommendations: {
          action: 'Consider tricuspid valve assessment for symptomatic tricuspid regurgitation per 2020 ACC/AHA VHD',
        },
        evidence: {
          triggerCriteria: [
            'Tricuspid regurgitation (I36.1)',
            'Right heart symptoms present (edema, hepatomegaly, or ascites)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: '2a',
          levelOfEvidence: 'C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe pulmonary hypertension as primary cause'],
        },
      });
    }
  }

  // Gap SH-5: Structural Heart Imaging Follow-up
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Any valve disease diagnosis (I34-I37) without recent echo needs follow-up imaging
  const hasAnyValveDx = dxCodes.some(c =>
    c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37')
  );
  if (
    hasAnyValveDx &&
    labValues['lvef'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Structural heart imaging follow-up recommended for review',
      target: 'Echocardiogram completed for valve disease surveillance',
      recommendations: {
        action: 'Consider echocardiographic follow-up for valve disease per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Valve disease diagnosis present (I34-I37 range)',
          'No recent echocardiogram data available (LVEF not on file)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echo within guideline interval'],
      },
    });
  }

  // Gap SH-6: Post-TAVR Follow-up
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Patients with prosthetic aortic valve (Z95.2) AND aortic stenosis history need follow-up
  const hasProstheticAorticValve = dxCodes.some(c => c.startsWith('Z95.2'));
  if (
    hasProstheticAorticValve &&
    hasAorticStenosis &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.FOLLOWUP_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-TAVR follow-up recommended for review',
      target: 'Post-TAVR surveillance evaluation completed',
      recommendations: {
        action: 'Consider post-TAVR follow-up evaluation with echocardiography per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic aortic valve (Z95.2)',
          'History of aortic stenosis (I35.0)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent post-TAVR evaluation on file'],
      },
    });
  }

  // Gap SH-7: Endocarditis Prophylaxis Review
  // Guideline: 2021 AHA Endocarditis Prevention, Class 2a, LOE B
  // Prosthetic valve patients (Z95.2-Z95.4) with high-risk procedure codes
  const hasProstheticValve = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
  );
  // High-risk procedure proxy: dental procedure codes (Z01.2) or documented procedures
  const hasHighRiskProcedure = dxCodes.some(c => c.startsWith('Z01.2') || c.startsWith('Z96'));
  if (
    hasProstheticValve &&
    hasHighRiskProcedure &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Endocarditis prophylaxis review recommended',
      target: 'Endocarditis prophylaxis assessment documented',
      recommendations: {
        action: 'Consider reviewing endocarditis prophylaxis needs for prosthetic valve patient per 2021 AHA guideline',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic valve (Z95.2, Z95.3, or Z95.4)',
          'High-risk procedure encounter documented',
        ],
        guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Documented allergy to prophylactic antibiotics (Z88)'],
      },
    });
  }

  // Gap SH-8: Left Atrial Appendage Assessment
  // Guideline: 2023 ACC/AHA AFib Guideline, Class 2a, LOE B
  // AF + structural heart disease (I34-I37) should consider LAA assessment
  if (
    hasAF &&
    hasAnyValveDx &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Left atrial appendage assessment recommended for review',
      target: 'LAA assessment completed',
      recommendations: {
        action: 'Consider left atrial appendage evaluation in AF with structural heart disease per 2023 ACC/AHA AFib',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation (I48.*)',
          'Structural heart / valve disease (I34-I37 range)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior LAA occlusion device'],
      },
    });
  }

  // Gap SH-9: PFO Closure Evaluation
  // Guideline: 2020 AHA/ASA Stroke Prevention, Class 2a, LOE B
  // Cryptogenic stroke (I63.9) + age < 60 + PFO (Q21.1)
  const hasCryptogenicStroke = dxCodes.some(c => c.startsWith('I63.9'));
  const hasPFO = dxCodes.some(c => c.startsWith('Q21.1'));
  if (
    hasCryptogenicStroke &&
    age < 60 &&
    hasPFO &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'PFO closure evaluation recommended for review',
      target: 'PFO closure candidacy assessment completed',
      recommendations: {
        action: 'Consider PFO closure evaluation for cryptogenic stroke prevention per 2020 AHA/ASA guideline',
      },
      evidence: {
        triggerCriteria: [
          'Cryptogenic stroke (I63.9)',
          `Age: ${age} (< 60 threshold)`,
          'Patent foramen ovale (Q21.1)',
        ],
        guidelineSource: '2020 AHA/ASA Guideline for Prevention of Stroke in Patients with Stroke and TIA',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known alternative stroke etiology', 'Active endocarditis'],
      },
    });
  }

  // ============================================================
  // NEW Valvular Disease Rules (VD-3 through VD-12)
  // ============================================================

  // Gap VD-3: INR Monitoring for Mechanical Valve
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE A
  // Mechanical valve on warfarin needs regular INR monitoring
  if (
    hasMechanicalValve &&
    medCodes.includes('11289') && // on warfarin
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const hasRecentINR = labValues['inr'] !== undefined;
    if (!hasRecentINR) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'INR monitoring overdue for mechanical valve on warfarin',
        target: 'INR checked and within therapeutic range',
        recommendations: {
          action: 'Recommended for review: INR monitoring for mechanical valve anticoagulation per 2020 ACC/AHA VHD',
        },
        evidence: {
          triggerCriteria: [
            'Mechanical valve (Z95.2, Z95.3, or Z95.4)',
            'Active warfarin therapy',
            'No recent INR value on file',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // Gap VD-4: Mitral Stenosis Surveillance
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Mitral stenosis (I05.0 or I34.2) requires periodic echo surveillance
  const hasMitralStenosis = dxCodes.some(c => c.startsWith('I05.0') || c.startsWith('I34.2'));
  if (
    hasMitralStenosis &&
    labValues['lvef'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Echo surveillance overdue for mitral stenosis',
      target: 'Transthoracic echocardiogram completed',
      recommendations: {
        action: 'Consider echocardiographic surveillance for mitral stenosis per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Mitral stenosis (I05.0 or I34.2)',
          'No recent echocardiogram data available',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echo within guideline interval'],
      },
    });
  }

  // Gap VD-5: Aortic Regurgitation Monitoring
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Aortic regurgitation (I35.1) requires periodic echo surveillance
  const hasAorticRegurg = dxCodes.some(c => c.startsWith('I35.1'));
  if (
    hasAorticRegurg &&
    labValues['lvef'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Echo surveillance overdue for aortic regurgitation',
      target: 'Transthoracic echocardiogram completed',
      recommendations: {
        action: 'Consider echocardiographic surveillance for aortic regurgitation per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Aortic regurgitation (I35.1)',
          'No recent echocardiogram data available',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echo within guideline interval'],
      },
    });
  }

  // Gap VD-6: DOAC Contraindicated in Mechanical Valve
  // Guideline: 2020 ACC/AHA VHD (RE-ALIGN Trial), Class 3 (Harm), LOE B
  // DOACs are contraindicated in mechanical valve patients -- warfarin is required
  // DOAC RxNorm: apixaban (1364430), rivaroxaban (1114195), dabigatran (1037045), edoxaban (1599538)
  if (hasMechanicalValve && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const DOAC_CODES = ['1364430', '1114195', '1037045', '1599538'];
    const onDOAC = medCodes.some(c => DOAC_CODES.includes(c));
    if (onDOAC) {
      gaps.push({
        type: TherapyGapType.SAFETY_ALERT,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'DOAC detected in mechanical valve patient -- contraindicated',
        target: 'DOAC discontinued and warfarin initiated',
        recommendations: {
          action: 'SAFETY ALERT: Consider urgent review -- DOAC is contraindicated with mechanical valve per RE-ALIGN trial. Warfarin is the only approved anticoagulant.',
        },
        evidence: {
          triggerCriteria: [
            'Mechanical valve (Z95.2, Z95.3, or Z95.4)',
            'Active DOAC therapy detected (apixaban, rivaroxaban, dabigatran, or edoxaban)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (RE-ALIGN Trial)',
          classOfRecommendation: '3 (Harm)',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // Gap VD-7: Exercise Restriction in Severe AS
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Severe AS (I35.0) + age > 65 should have exercise restriction documentation
  if (
    hasAorticStenosis &&
    age > 65 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Exercise restriction documentation recommended for review in severe AS',
      target: 'Exercise restriction counseling documented',
      recommendations: {
        action: 'Consider documenting exercise restriction counseling for severe aortic stenosis per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Severe aortic stenosis (I35.0)',
          `Age: ${age} (> 65 threshold)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already documented exercise restriction'],
      },
    });
  }

  // Gap VD-8: Rheumatic Heart Disease Screen
  // Guideline: 2020 AHA RHD Scientific Statement, Class 1, LOE B
  // Rheumatic fever history (I01/I02) + age < 40 warrants screening
  const hasRheumaticFever = dxCodes.some(c => c.startsWith('I01') || c.startsWith('I02'));
  if (
    hasRheumaticFever &&
    age < 40 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Rheumatic heart disease screening recommended for review',
      target: 'Echocardiographic screening for RHD completed',
      recommendations: {
        action: 'Consider rheumatic heart disease screening with echocardiography per 2020 AHA RHD Statement',
      },
      evidence: {
        triggerCriteria: [
          'History of rheumatic fever (I01 or I02)',
          `Age: ${age} (< 40 threshold)`,
        ],
        guidelineSource: '2020 AHA Scientific Statement on Rheumatic Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Established RHD already under management'],
      },
    });
  }

  // Gap VD-9: Endocarditis Education
  // Guideline: 2021 AHA Endocarditis Prevention, Class 1, LOE C
  // Any prosthetic valve patient should have endocarditis education documented
  if (
    hasProstheticValve &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Endocarditis education documentation recommended for review',
      target: 'Patient education on endocarditis prevention documented',
      recommendations: {
        action: 'Consider documenting endocarditis prevention education for prosthetic valve patient per 2021 AHA guideline',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic valve (Z95.2, Z95.3, or Z95.4)',
        ],
        guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Education already documented this cycle'],
      },
    });
  }

  // Gap VD-10: Pregnancy Risk in Valve Disease
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Valve disease + female + age 18-45 needs pregnancy risk counseling
  if (
    hasAnyValveDx &&
    gender === 'FEMALE' &&
    age >= 18 && age <= 45 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE) &&
    !hasContraindication(dxCodes, EXCLUSION_PREGNANCY)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Pregnancy risk assessment recommended for review in valve disease',
      target: 'Pregnancy risk counseling and pre-conception evaluation completed',
      recommendations: {
        action: 'Consider pre-conception cardiovascular risk assessment for valve disease per 2020 ACC/AHA VHD',
      },
      evidence: {
        triggerCriteria: [
          'Valve disease diagnosis present (I34-I37 range)',
          `Gender: Female`,
          `Age: ${age} (18-45 reproductive age range)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Current pregnancy (managed separately)', 'Post-menopausal'],
      },
    });
  }

  // Gap VD-11: Bioprosthetic Valve Degeneration Watch
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Bioprosthetic valve (Z95.2/Z95.4) + age > 65 (proxy for >10yr post-implant risk)
  if (
    hasBioprostheticValve &&
    age > 65 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Bioprosthetic valve degeneration monitoring recommended for review',
      target: 'Structural valve deterioration assessment completed',
      recommendations: {
        action: 'Consider enhanced surveillance for bioprosthetic valve degeneration per 2020 ACC/AHA VHD',
        note: 'Bioprosthetic valves have increased degeneration risk after 10 years, especially in older patients',
      },
      evidence: {
        triggerCriteria: [
          'Bioprosthetic valve (Z95.2 or Z95.4)',
          `Age: ${age} (> 65, increased degeneration risk proxy)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent valve assessment on file'],
      },
    });
  }

  // Gap VD-12: Anticoagulation in AF + Valve Disease
  // Guideline: 2023 ACC/AHA AFib Guideline, Class 1, LOE A
  // AF + any valve dx + no oral anticoagulant
  // OAC RxNorm: warfarin (11289), apixaban (1364430), rivaroxaban (1114195), dabigatran (1037045), edoxaban (1599538)
  if (
    hasAF &&
    hasAnyValveDx &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const OAC_CODES = ['11289', '1364430', '1114195', '1037045', '1599538'];
    const onOAC = medCodes.some(c => OAC_CODES.includes(c));
    if (!onOAC) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Oral anticoagulation missing in AF with valve disease',
        target: 'Oral anticoagulant initiated',
        medication: 'Warfarin or DOAC (based on valve type)',
        recommendations: {
          action: 'Consider oral anticoagulation for AF with concomitant valve disease per 2023 ACC/AHA AFib Guideline',
          note: 'Mechanical valves require warfarin; bioprosthetic or native valve disease may use DOAC',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation (I48.*)',
            'Valve disease diagnosis present (I34-I37 range)',
            'No oral anticoagulant on active medication list',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Documented contraindication to anticoagulation'],
        },
      });
    }
  }

  // ============================================================
  // NEW Peripheral Vascular Rules (PV-3 through PV-9)
  // ============================================================

  // Gap PV-3: Antiplatelet in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  // PAD patients should be on aspirin or clopidogrel
  // RxNorm: aspirin (1191), clopidogrel (32968)
  if (
    hasPAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const ANTIPLATELET_CODES = ['1191', '32968'];
    const onAntiplatelet = medCodes.some(c => ANTIPLATELET_CODES.includes(c));
    if (!onAntiplatelet) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Antiplatelet therapy missing in PAD',
        target: 'Antiplatelet therapy initiated',
        medication: 'Aspirin or Clopidogrel',
        recommendations: {
          action: 'Consider antiplatelet therapy for peripheral artery disease per 2024 ACC/AHA PAD Guideline',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9 or I70.2*)',
            'No aspirin or clopidogrel on active medication list',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Documented antiplatelet allergy (Z88)'],
        },
      });
    }
  }

  // Gap PV-4: Smoking Cessation in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  // PAD + active smoking (F17 tobacco use or Z72.0 tobacco use)
  const hasSmoking = dxCodes.some(c => c.startsWith('F17') || c.startsWith('Z72.0'));
  if (
    hasPAD &&
    hasSmoking &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Smoking cessation referral recommended for review in PAD',
      target: 'Smoking cessation program referral placed',
      recommendations: {
        action: 'Consider referral to smoking cessation program for PAD patient per 2024 ACC/AHA PAD Guideline',
      },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Active tobacco use (F17 or Z72.0)',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // Gap PV-5: Exercise Therapy for Claudication
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  // PAD + claudication (I73.9) warrants supervised exercise therapy
  const hasClaudicationPAD = dxCodes.some(c => c.startsWith('I73.9'));
  if (
    hasPAD &&
    hasClaudicationPAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REHABILITATION_ELIGIBLE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Supervised exercise therapy recommended for review in PAD with claudication',
      target: 'Supervised exercise therapy program initiated',
      recommendations: {
        action: 'Consider supervised exercise therapy for claudication per 2024 ACC/AHA PAD Guideline',
      },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Claudication symptoms (I73.9)',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Critical limb ischemia', 'Unable to exercise due to comorbidity'],
      },
    });
  }

  // Gap PV-6: Diabetes Control in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE B
  // PAD + diabetes + no HbA1c on file
  if (
    hasPAD &&
    hasDiabetes &&
    labValues['hba1c'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'HbA1c monitoring overdue in PAD with diabetes',
      target: 'HbA1c checked and glycemic control assessed',
      recommendations: {
        action: 'Consider HbA1c monitoring for diabetes management in PAD per 2024 ACC/AHA PAD Guideline',
      },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Diabetes mellitus (E11.*)',
          'No HbA1c value on file',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent HbA1c within guideline interval'],
      },
    });
  }

  // Gap PV-7: Wound Care Assessment
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE B
  // PAD + ulcer/gangrene (I70.23, I70.24, L97)
  const hasWoundOrGangrene = dxCodes.some(c =>
    c.startsWith('I70.23') || c.startsWith('I70.24') || c.startsWith('L97')
  );
  if (
    hasPAD &&
    hasWoundOrGangrene &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Wound care assessment referral recommended for review in PAD',
      target: 'Wound care specialist referral placed',
      recommendations: {
        action: 'Consider wound care specialist referral for PAD with ulcer/gangrene per 2024 ACC/AHA PAD Guideline',
      },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Ulcer or gangrene (I70.23, I70.24, or L97)',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // Gap PV-8: Duplex Ultrasound Follow-up
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE B
  // PAD + prior vascular intervention (Z95.8) needs imaging follow-up
  const hasPriorVascularIntervention = dxCodes.some(c => c.startsWith('Z95.8'));
  if (
    hasPAD &&
    hasPriorVascularIntervention &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Duplex ultrasound follow-up recommended for review post-intervention',
      target: 'Duplex ultrasound surveillance completed',
      recommendations: {
        action: 'Consider duplex ultrasound follow-up for post-intervention PAD surveillance per 2024 ACC/AHA PAD Guideline',
      },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Prior vascular intervention (Z95.8)',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent duplex ultrasound on file'],
      },
    });
  }

  // Gap PV-9: AAA Screening
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline, Class 1, LOE B
  // Male + age >= 65 + ever smoked (F17 tobacco use or Z87.891 history of tobacco use)
  const hasEverSmoked = dxCodes.some(c => c.startsWith('F17') || c.startsWith('Z87.891'));
  if (
    gender === 'MALE' &&
    age >= 65 &&
    hasEverSmoked &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Abdominal aortic aneurysm screening recommended for review',
      target: 'AAA ultrasound screening completed',
      recommendations: {
        action: 'Consider one-time AAA ultrasound screening for male ever-smoker age >= 65 per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
      },
      evidence: {
        triggerCriteria: [
          `Gender: Male`,
          `Age: ${age} (>= 65 threshold)`,
          'History of tobacco use (F17 or Z87.891)',
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known AAA already under surveillance', 'Prior AAA repair'],
      },
    });
  }

  // ============================================================
  // NEW Heart Failure Rules (HF-83 through HF-92)
  // ============================================================

  // Gap HF-83: Loop Diuretic Without MRA in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A (RALES, EMPHASIS-HF)
  // On loop diuretic (furosemide 4603, bumetanide 1808) but no MRA in HFrEF
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 40 &&
    medCodes.some(c => ['4603', '1808'].includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const MRA_CODES_HF83 = ['9997', '298869']; // spironolactone, eplerenone
    const onMRA83 = medCodes.some(c => MRA_CODES_HF83.includes(c));
    if (!onMRA83 && labValues['potassium'] !== undefined && labValues['potassium'] < 5.0) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Loop diuretic without MRA in HFrEF',
        target: 'MRA therapy considered alongside loop diuretic',
        medication: 'Spironolactone or Eplerenone',
        recommendations: { action: 'Consider adding MRA to loop diuretic regimen per 2022 AHA/ACC/HFSA (RALES/EMPHASIS-HF)' },
        evidence: {
          triggerCriteria: [
            'HFrEF (LVEF <= 40%)',
            'On loop diuretic (furosemide or bumetanide)',
            'No MRA on active medication list',
            `Potassium: ${labValues['potassium']} (< 5.0)`,
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (RALES, EMPHASIS-HF)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Hyperkalemia (K >= 5.0)', 'Severe renal impairment (eGFR < 30)'],
        },
      });
    }
  }

  // Gap HF-84: Transplant Evaluation Referral
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; ISHLT Listing Criteria
  // LVEF < 20% + age < 70
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 20 &&
    age < 70 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac transplant evaluation referral recommended for review',
      target: 'Advanced HF / transplant specialist consultation completed',
      recommendations: { action: 'Consider referral for cardiac transplant evaluation per 2022 AHA/ACC/HFSA and ISHLT criteria' },
      evidence: {
        triggerCriteria: [
          `LVEF: ${labValues['lvef']}% (< 20%)`,
          `Age: ${age} (< 70)`,
          'Heart failure diagnosis (I50.*)',
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; ISHLT Listing Criteria',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active malignancy', 'Irreversible pulmonary hypertension', 'Active substance abuse'],
      },
    });
  }

  // Gap HF-85: LVAD Referral for Advanced HF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; 2023 ISHLT MCS Guideline
  // LVEF < 25% + refractory HF (BNP > 500 as proxy) + age < 75
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 25 &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 500 &&
    age < 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.HEART_FAILURE,
      status: 'LVAD referral recommended for review in refractory advanced HF',
      target: 'Mechanical circulatory support evaluation completed',
      recommendations: { action: 'Consider referral for LVAD evaluation in refractory advanced HF per 2022 AHA/ACC/HFSA and 2023 ISHLT MCS Guideline' },
      evidence: {
        triggerCriteria: [
          `LVEF: ${labValues['lvef']}% (< 25%)`,
          `BNP: ${labValues['bnp']} (> 500, refractory HF proxy)`,
          `Age: ${age} (< 75)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; 2023 ISHLT Mechanical Circulatory Support Guideline',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active systemic infection', 'Irreversible hepatic/renal failure', 'Severe RV dysfunction'],
      },
    });
  }

  // Gap HF-86: CRT-D Upgrade Evaluation
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A
  // Existing ICD (Z95.810) + LVEF <= 35 + QRS > 150ms
  const hasICDDevice86 = dxCodes.some(c => c.startsWith('Z95.810'));
  if (
    hasICDDevice86 &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    labValues['qrs_duration'] !== undefined && labValues['qrs_duration'] > 150 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_UPGRADE_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'CRT-D upgrade evaluation recommended for review',
      target: 'CRT-D upgrade candidacy assessed by EP specialist',
      recommendations: { action: 'Consider CRT-D upgrade evaluation for ICD patient with wide QRS per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: [
          'Existing ICD (Z95.810)',
          `LVEF: ${labValues['lvef']}% (<= 35%)`,
          `QRS duration: ${labValues['qrs_duration']}ms (> 150ms)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing CRT device', 'Life expectancy < 1 year'],
      },
    });
  }

  // Gap HF-87: Peripartum Cardiomyopathy Screen
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; ESC Position Statement on PPCM
  // O90.3 or (female + recent pregnancy codes + LVEF < 45)
  const hasPPCMcode = dxCodes.some(c => c.startsWith('O90.3'));
  const hasRecentPregnancy = dxCodes.some(c => c.startsWith('O') && !c.startsWith('O90.3'));
  if (
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE) &&
    (hasPPCMcode || (gender === 'FEMALE' && hasRecentPregnancy && labValues['lvef'] !== undefined && labValues['lvef'] < 45))
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Peripartum cardiomyopathy screening recommended for review',
      target: 'PPCM evaluation with echocardiography completed',
      recommendations: { action: 'Consider peripartum cardiomyopathy evaluation per 2022 AHA/ACC/HFSA and ESC PPCM Position Statement' },
      evidence: {
        triggerCriteria: [
          hasPPCMcode ? 'PPCM diagnosis code (O90.3)' : 'Female with pregnancy-related diagnosis',
          `LVEF: ${labValues['lvef'] ?? 'N/A'}% (threshold < 45%)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; ESC Position Statement on PPCM',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known pre-existing cardiomyopathy'],
      },
    });
  }

  // Gap HF-88: Acute Myocarditis Follow-up
  // Guideline: 2022 AHA Scientific Statement on Myocarditis
  // I40.* (acute myocarditis) + LVEF < 50
  const hasMyocarditis = dxCodes.some(c => c.startsWith('I40'));
  if (
    hasMyocarditis &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.FOLLOWUP_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Acute myocarditis follow-up recommended for review',
      target: 'Cardiac MRI and serial echo follow-up scheduled',
      recommendations: { action: 'Consider cardiac MRI and serial echocardiographic follow-up for myocarditis per 2022 AHA Scientific Statement' },
      evidence: {
        triggerCriteria: [
          'Acute myocarditis diagnosis (I40.*)',
          `LVEF: ${labValues['lvef']}% (< 50%)`,
        ],
        guidelineSource: '2022 AHA Scientific Statement on Myocarditis',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Chronic stable myocarditis with established follow-up plan'],
      },
    });
  }

  // Gap HF-89: Fabry Disease Screening
  // Guideline: 2024 AHA/ACC HCM Guideline; ESC Fabry Expert Consensus
  // Unexplained LVH (I42.1) + age 30-60
  const hasLVH89 = dxCodes.some(c => c.startsWith('I42.1'));
  if (
    hasLVH89 &&
    age >= 30 && age <= 60 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // Exclude known Fabry (E75.2)
    const hasKnownFabry = dxCodes.some(c => c.startsWith('E75.2'));
    if (!hasKnownFabry) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.HEART_FAILURE,
        status: 'Fabry disease screening recommended for review in unexplained LVH',
        target: 'Alpha-galactosidase A activity or genetic testing completed',
        recommendations: { action: 'Consider Fabry disease screening in unexplained LVH per 2024 AHA/ACC HCM Guideline and ESC Fabry Consensus' },
        evidence: {
          triggerCriteria: [
            'Left ventricular hypertrophy (I42.1)',
            `Age: ${age} (30-60 range)`,
            'No known Fabry diagnosis (E75.2)',
          ],
          guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy; ESC Fabry Expert Consensus',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known Fabry disease (E75.2)', 'Hypertensive heart disease as established etiology'],
        },
      });
    }
  }

  // Gap HF-90: Amyloid Biomarker Follow-up
  // Guideline: 2023 ACC Expert Consensus on Cardiac Amyloidosis
  // Known ATTR (E85.*) + no recent BNP/NT-proBNP
  const hasATTR90 = dxCodes.some(c => c.startsWith('E85'));
  if (
    hasATTR90 &&
    labValues['bnp'] === undefined && labValues['nt_probnp'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Amyloid biomarker follow-up overdue (no recent BNP/NT-proBNP)',
      target: 'Serial natriuretic peptide and troponin monitoring completed',
      recommendations: { action: 'Consider serial BNP/NT-proBNP and troponin monitoring for cardiac amyloidosis per 2023 ACC Expert Consensus' },
      evidence: {
        triggerCriteria: [
          'Known amyloidosis (E85.*)',
          'No recent BNP or NT-proBNP value on file',
        ],
        guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Comprehensive Multidisciplinary Care for Cardiac Amyloidosis',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent natriuretic peptide within follow-up interval'],
      },
    });
  }

  // Gap HF-91: CSA/OSA Treatment in HF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; SERVE-HF trial
  // G47.3 (sleep apnea) + HF + no CPAP/ASV proxy (absence of E11.65 durable medical equipment)
  const hasSleepApnea91 = dxCodes.some(c => c.startsWith('G47.3'));
  if (
    hasSleepApnea91 &&
    hasHF &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // Proxy for no CPAP/ASV: check if sleep treatment-related code is absent
    const hasCPAPproxy = dxCodes.some(c => c.startsWith('Z99.8')); // Dependence on other enabling machines
    if (!hasCPAPproxy) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.HEART_FAILURE,
        status: 'Sleep-disordered breathing treatment not documented in HF',
        target: 'Sleep apnea treatment plan initiated or documented',
        recommendations: { action: 'Consider sleep apnea treatment evaluation in HF per 2022 AHA/ACC/HFSA (note: ASV contraindicated in CSA with HFrEF per SERVE-HF)' },
        evidence: {
          triggerCriteria: [
            'Sleep apnea diagnosis (G47.3)',
            'Heart failure diagnosis (I50.*)',
            'No CPAP/ASV therapy documented',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; SERVE-HF trial',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'ASV contraindicated in CSA with HFrEF (SERVE-HF)', 'Already on established CPAP therapy'],
        },
      });
    }
  }

  // Gap HF-92: Volume Status Monitoring in HF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline
  // HF + elevated BNP trend (BNP > 400 as proxy for volume overload)
  if (
    hasHF &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 400 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Volume status monitoring recommended for review in HF with elevated BNP',
      target: 'Volume status assessment and diuretic adjustment considered',
      recommendations: { action: 'Consider volume status assessment with daily weights and diuretic optimization per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `BNP: ${labValues['bnp']} (> 400, volume overload proxy)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent diuretic adjustment within 48 hours'],
      },
    });
  }

  // ============================================================
  // NEW Structural Heart Rules (SH-10 through SH-17)
  // ============================================================

  // Gap SH-10: MitraClip Evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline (COAPT Trial), Class 2a, LOE B-R
  // I34.0 (mitral regurgitation) + LVEF < 50 + high surgical risk (age > 75 proxy)
  const hasMR10 = dxCodes.some(c => c.startsWith('I34.0'));
  if (
    hasMR10 &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    age > 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'MitraClip evaluation recommended for review in high surgical risk MR',
      target: 'Transcatheter mitral valve repair candidacy assessed',
      recommendations: { action: 'Consider MitraClip evaluation for secondary MR with high surgical risk per 2020 ACC/AHA VHD (COAPT trial)' },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          `LVEF: ${labValues['lvef']}% (< 50%)`,
          `Age: ${age} (> 75, high surgical risk proxy)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (COAPT Trial)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe mitral annular calcification', 'Life expectancy < 1 year'],
      },
    });
  }

  // Gap SH-11: Transcatheter Mitral Valve Replacement Candidacy
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE C
  // Severe MR (I34.0) + age > 80
  if (
    hasMR10 &&
    age > 80 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Transcatheter mitral valve replacement candidacy recommended for review',
      target: 'TMVR candidacy evaluation by structural heart team completed',
      recommendations: { action: 'Consider TMVR candidacy evaluation for severe MR in elderly patient per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Severe mitral regurgitation (I34.0)',
          `Age: ${age} (> 80)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive frailty', 'Life expectancy < 1 year'],
      },
    });
  }

  // Gap SH-12: Tricuspid Intervention Evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline; ACC TVT Registry
  // I36.1 (tricuspid regurgitation) + right heart failure (edema R60, hepatomegaly R16, ascites R18)
  const hasTR12 = dxCodes.some(c => c.startsWith('I36.1'));
  const hasRHFsymptoms12 = dxCodes.some(c =>
    c.startsWith('R60') || c.startsWith('R16') || c.startsWith('R18') || c.startsWith('I50.81')
  );
  if (
    hasTR12 &&
    hasRHFsymptoms12 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Tricuspid intervention evaluation recommended for review',
      target: 'Transcatheter tricuspid intervention candidacy assessed',
      recommendations: { action: 'Consider tricuspid intervention evaluation for symptomatic TR with right heart failure per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Tricuspid regurgitation (I36.1)',
          'Right heart failure symptoms (edema, hepatomegaly, or ascites)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ACC TVT Registry',
        classOfRecommendation: 'Class 2b',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe pulmonary hypertension as primary etiology', 'Irreversible RV dysfunction'],
      },
    });
  }

  // Gap SH-13: Paravalvular Leak Assessment Post-Valve
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Z95.2 (prosthetic valve) + new murmur proxy (I35.1 aortic regurgitation)
  const hasProsthetic13 = dxCodes.some(c => c.startsWith('Z95.2'));
  const hasNewRegurg13 = dxCodes.some(c => c.startsWith('I35.1') || c.startsWith('I34.0'));
  if (
    hasProsthetic13 &&
    hasNewRegurg13 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Paravalvular leak assessment recommended for review post-valve replacement',
      target: 'TEE or TTE for paravalvular leak evaluation completed',
      recommendations: { action: 'Consider paravalvular leak assessment with echocardiography for prosthetic valve with new regurgitation per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Prosthetic valve (Z95.2)',
          'New regurgitation detected (I35.1 or I34.0)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known stable paravalvular leak under surveillance'],
      },
    });
  }

  // Gap SH-14: Adult Congenital Heart Disease Screen
  // Guideline: 2018 AHA/ACC Guideline for Management of Adults with CHD, Class 1, LOE C
  // Q20-Q28 (congenital heart defects) + age > 18
  const hasCongenitalHeart = dxCodes.some(c => /^Q2[0-8]/.test(c));
  if (
    hasCongenitalHeart &&
    age > 18 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Adult congenital heart disease specialist referral recommended for review',
      target: 'ACHD specialist evaluation completed',
      recommendations: { action: 'Consider referral to Adult Congenital Heart Disease (ACHD) center per 2018 AHA/ACC ACHD Guideline' },
      evidence: {
        triggerCriteria: [
          'Congenital heart defect (Q20-Q28)',
          `Age: ${age} (> 18)`,
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already under ACHD specialty care'],
      },
    });
  }

  // Gap SH-15: Alcohol Septal Ablation Candidacy
  // Guideline: 2024 AHA/ACC HCM Guideline, Class 2a, LOE B
  // HCM (I42.1) + obstruction (I42.1 with symptoms R06 dyspnea or R55 syncope as proxy)
  const hasHCM15 = dxCodes.some(c => c.startsWith('I42.1'));
  const hasObstructionProxy = dxCodes.some(c => c.startsWith('R06') || c.startsWith('R55') || c.startsWith('R00'));
  if (
    hasHCM15 &&
    hasObstructionProxy &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Alcohol septal ablation candidacy recommended for review in symptomatic HCM',
      target: 'Septal reduction therapy evaluation completed',
      recommendations: { action: 'Consider alcohol septal ablation or myectomy evaluation for symptomatic obstructive HCM per 2024 AHA/ACC HCM Guideline' },
      evidence: {
        triggerCriteria: [
          'Hypertrophic cardiomyopathy (I42.1)',
          'Symptomatic obstruction proxy (dyspnea, syncope, or palpitations)',
        ],
        guidelineSource: '2024 AHA/ACC Guideline for the Diagnosis and Treatment of Hypertrophic Cardiomyopathy',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Non-obstructive HCM', 'Suitable anatomy for myectomy preferred'],
      },
    });
  }

  // Gap SH-16: WATCHMAN Device Follow-up
  // Guideline: 2023 ACC/AHA AFib Guideline; WATCHMAN post-implant protocol
  // Z95.818 or LAAC history -- requires TEE follow-up
  const hasWATCHMAN = dxCodes.some(c => c.startsWith('Z95.818'));
  if (
    hasWATCHMAN &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.FOLLOWUP_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'WATCHMAN device follow-up recommended for review',
      target: 'Post-LAAC TEE surveillance and medication assessment completed',
      recommendations: { action: 'Consider post-WATCHMAN TEE follow-up and anticoagulation step-down assessment per implant protocol' },
      evidence: {
        triggerCriteria: [
          'LAAC device present (Z95.818)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF; WATCHMAN post-implant protocol',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent post-LAAC imaging within protocol interval'],
      },
    });
  }

  // Gap SH-17: 3D Echo for Structural Planning
  // Guideline: 2020 ACC/AHA VHD Guideline; ASE Structural Heart Imaging Guideline
  // Any valve surgery planned: prosthetic valve (Z95.2-Z95.4) + valve disease (I34-I37)
  const hasValveSurgeryPlanned = dxCodes.some(c =>
    c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37')
  );
  const hasExistingProsthesis = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
  );
  if (
    hasValveSurgeryPlanned &&
    hasExistingProsthesis &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: '3D echocardiography recommended for review for structural intervention planning',
      target: '3D TEE or TTE for structural planning completed',
      recommendations: { action: 'Consider 3D echocardiography for structural intervention planning per 2020 ACC/AHA VHD and ASE guidelines' },
      evidence: {
        triggerCriteria: [
          'Valve disease diagnosis (I34-I37)',
          'Existing prosthetic valve (Z95.2, Z95.3, or Z95.4)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ASE Structural Heart Imaging Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent 3D echo on file'],
      },
    });
  }

  // ============================================================
  // NEW Valvular Disease Rules (VD-13 through VD-18)
  // ============================================================

  // Gap VD-13: Anticoagulation First 3 Months Post-Bioprosthetic
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE B
  // Z95.2/Z95.4 (bioprosthetic valve) + recent implant proxy + no anticoagulant
  const hasBioprosthetic13 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4'));
  if (
    hasBioprosthetic13 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const OAC_CODES_VD13 = ['11289', '1364430', '1114195', '1037045', '1599538']; // warfarin + DOACs
    const onOAC13 = medCodes.some(c => OAC_CODES_VD13.includes(c));
    const ANTIPLATELET_VD13 = ['1191']; // aspirin as minimum
    const onASA13 = medCodes.some(c => ANTIPLATELET_VD13.includes(c));
    if (!onOAC13 && !onASA13) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Anticoagulation/antiplatelet not documented in early post-bioprosthetic valve period',
        target: 'Anticoagulation or aspirin therapy for first 3-6 months post-implant considered',
        medication: 'Warfarin or Aspirin (per valve position and risk)',
        recommendations: { action: 'Consider anticoagulation or aspirin for early post-bioprosthetic valve period per 2020 ACC/AHA VHD' },
        evidence: {
          triggerCriteria: [
            'Bioprosthetic valve (Z95.2 or Z95.4)',
            'No anticoagulant or aspirin on active medication list',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Documented allergy to anticoagulants'],
        },
      });
    }
  }

  // Gap VD-14: Dental Prophylaxis in High-Risk Valve
  // Guideline: 2021 AHA Endocarditis Prevention, Class 1, LOE B
  // Prosthetic valve + dental procedure (Z01.2)
  const hasProstheticVD14 = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
  );
  const hasDentalProcedure = dxCodes.some(c => c.startsWith('Z01.2'));
  if (
    hasProstheticVD14 &&
    hasDentalProcedure &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE) &&
    !hasContraindication(dxCodes, EXCLUSION_ALLERGY_DOCUMENTED)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Dental prophylaxis antibiotic recommended for review in prosthetic valve patient',
      target: 'Endocarditis prophylaxis prescribed prior to dental procedure',
      medication: 'Amoxicillin 2g (or clindamycin if penicillin allergic)',
      recommendations: { action: 'Consider antibiotic prophylaxis prior to dental procedure for prosthetic valve patient per 2021 AHA Endocarditis Prevention' },
      evidence: {
        triggerCriteria: [
          'Prosthetic valve (Z95.2, Z95.3, or Z95.4)',
          'Dental procedure encounter (Z01.2)',
        ],
        guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Documented penicillin allergy -- use alternative', 'Non-invasive dental procedure'],
      },
    });
  }

  // Gap VD-15: Aortic Root Dilation Monitoring
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline, Class 1, LOE B
  // Marfan/bicuspid (Q23.1) + aortic dilation (I71.2 or aortic root measurement)
  const hasBicuspidOrMarfan = dxCodes.some(c => c.startsWith('Q23.1') || c.startsWith('Q87.4'));
  const hasAorticDilation = dxCodes.some(c => c.startsWith('I71.2') || c.startsWith('I77.81'));
  if (
    hasBicuspidOrMarfan &&
    (hasAorticDilation || (labValues['aortic_root'] !== undefined && labValues['aortic_root'] > 40)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Aortic root dilation monitoring recommended for review',
      target: 'Serial aortic imaging (CT or MRI) completed',
      recommendations: { action: 'Consider serial aortic root imaging for bicuspid/Marfan with aortic dilation per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline' },
      evidence: {
        triggerCriteria: [
          'Bicuspid aortic valve (Q23.1) or Marfan syndrome (Q87.4)',
          hasAorticDilation ? 'Aortic dilation diagnosis (I71.2 or I77.81)' : `Aortic root: ${labValues['aortic_root']}mm (> 40mm)`,
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent aortic imaging within guideline interval', 'Post-aortic root replacement'],
      },
    });
  }

  // Gap VD-16: Mixed Valve Disease Assessment
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Concurrent AS + AR (I35.2 mixed aortic valve disease)
  const hasMixedAorticValve = dxCodes.some(c => c.startsWith('I35.2'));
  if (
    hasMixedAorticValve &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mixed aortic valve disease assessment recommended for review',
      target: 'Comprehensive hemodynamic evaluation of mixed AS/AR completed',
      recommendations: { action: 'Consider comprehensive assessment of mixed aortic valve disease per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Mixed aortic valve disease -- concurrent AS and AR (I35.2)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent comprehensive valve assessment on file'],
      },
    });
  }

  // Gap VD-17: Hemolysis Monitoring Post-Valve
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Prosthetic valve + anemia (D50-D64)
  const hasProstheticVD17 = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
  );
  const hasAnemia = dxCodes.some(c => /^D[5-6][0-4]/.test(c));
  if (
    hasProstheticVD17 &&
    hasAnemia &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Hemolysis monitoring recommended for review in prosthetic valve with anemia',
      target: 'LDH, haptoglobin, reticulocyte count, and peripheral smear completed',
      recommendations: { action: 'Consider hemolysis workup (LDH, haptoglobin, reticulocyte count) for prosthetic valve with anemia per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Prosthetic valve (Z95.2, Z95.3, or Z95.4)',
          'Anemia diagnosis (D50-D64 range)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known non-hemolytic anemia etiology established'],
      },
    });
  }

  // Gap VD-18: Exercise Testing in Asymptomatic Severe Valve Disease
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE B
  // Severe valve disease (I35.0 AS or I34.0 severe MR) + no symptoms documented
  const hasSevereValve18 = dxCodes.some(c => c.startsWith('I35.0') || c.startsWith('I34.0'));
  const hasSymptomsVD18 = dxCodes.some(c =>
    c.startsWith('R06') || c.startsWith('R00') || c.startsWith('R55') || c.startsWith('R07')
  );
  if (
    hasSevereValve18 &&
    !hasSymptomsVD18 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Exercise testing recommended for review in asymptomatic severe valve disease',
      target: 'Exercise stress test completed to assess functional capacity',
      recommendations: { action: 'Consider exercise stress testing to unmask symptoms in asymptomatic severe valve disease per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Severe valve disease (I35.0 AS or I34.0 severe MR)',
          'No documented symptoms (R06, R00, R55, R07)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Symptomatic valve disease', 'Exercise contraindicated'],
      },
    });
  }

  // ============================================================
  // NEW Peripheral Vascular Rules (PV-10 through PV-15)
  // ============================================================

  // Gap PV-10: Cilostazol for Claudication
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 2a, LOE A
  // PAD + claudication (I73.9) + no cilostazol (19847)
  if (
    hasPAD &&
    dxCodes.some(c => c.startsWith('I73.9')) &&
    !medCodes.includes('19847') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // Cilostazol is contraindicated in HF
    if (!hasHF) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Cilostazol not prescribed for claudication in PAD',
        target: 'Cilostazol therapy considered for claudication symptom relief',
        medication: 'Cilostazol',
        recommendations: { action: 'Consider cilostazol for claudication symptom improvement per 2024 ACC/AHA PAD Guideline' },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9)',
            'Claudication symptoms',
            'No cilostazol on active medication list (RxNorm 19847)',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Heart failure (contraindication)', 'Active bleeding'],
        },
      });
    }
  }

  // Gap PV-11: ACEi/ARB in PAD with Hypertension
  // Guideline: 2024 ACC/AHA PAD Guideline; HOPE Trial, Class 1, LOE A
  // PAD + HTN (I10) + no RAAS inhibitor
  const hasHTN_PV11 = dxCodes.some(c => c.startsWith('I10'));
  if (
    hasPAD &&
    hasHTN_PV11 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const RAAS_CODES_PV11 = ['29046', '3827', '35296', '52175', '69749', '1656339']; // ACEi/ARB/ARNi
    const onRAAS_PV11 = medCodes.some(c => RAAS_CODES_PV11.includes(c));
    if (!onRAAS_PV11) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'ACEi/ARB not prescribed in PAD with hypertension',
        target: 'RAAS inhibitor initiated for cardiovascular risk reduction',
        medication: 'Ramipril, Lisinopril, Enalapril, Losartan, or Valsartan',
        recommendations: { action: 'Consider ACEi/ARB for PAD with hypertension per 2024 ACC/AHA PAD Guideline and HOPE trial' },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9 or I70.2*)',
            'Hypertension (I10)',
            'No RAAS inhibitor on active medication list',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; HOPE Trial',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Hyperkalemia', 'Bilateral renal artery stenosis', 'Angioedema history'],
        },
      });
    }
  }

  // Gap PV-12: Renal Artery Stenosis Screen
  // Guideline: 2024 ACC/AHA PAD Guideline; 2017 ACC/AHA Hypertension Guideline, Class 2a, LOE C
  // PAD + HTN + renal impairment (eGFR < 60 or creatinine elevated)
  if (
    hasPAD &&
    hasHTN_PV11 &&
    labValues['egfr'] !== undefined && labValues['egfr'] < 60 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Renal artery stenosis screening recommended for review in PAD with HTN and renal impairment',
      target: 'Renal duplex ultrasound or CTA for renal artery stenosis completed',
      recommendations: { action: 'Consider renal artery stenosis screening in PAD with resistant HTN and renal impairment per 2024 ACC/AHA PAD Guideline' },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Hypertension (I10)',
          `eGFR: ${labValues['egfr']} (< 60, renal impairment)`,
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; 2017 ACC/AHA Hypertension Guideline',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known renal artery anatomy', 'Contrast allergy without alternative imaging'],
      },
    });
  }

  // Gap PV-13: Carotid Screening in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline; 2021 ASA/AHA Stroke Guideline, Class 2a, LOE B
  // PAD + stroke risk factors (age > 65, HTN, diabetes, smoking, prior CVA)
  if (
    hasPAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const hasStrokeRisk = age > 65 || hasHTN_PV11 || hasDiabetes || hasSmoking ||
      dxCodes.some(c => c.startsWith('I63') || c.startsWith('G45'));
    if (hasStrokeRisk) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Carotid screening recommended for review in PAD with stroke risk factors',
        target: 'Carotid duplex ultrasound completed',
        recommendations: { action: 'Consider carotid artery screening in PAD with cerebrovascular risk factors per 2024 ACC/AHA PAD Guideline' },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9 or I70.2*)',
            'Stroke risk factors present (age > 65, HTN, DM, smoking, or prior CVA)',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; 2021 ASA/AHA Stroke Guideline',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent carotid imaging on file', 'Known carotid disease under management'],
        },
      });
    }
  }

  // Gap PV-14: Annual Foot Exam in PAD with Diabetes
  // Guideline: 2024 ACC/AHA PAD Guideline; ADA Standards of Care 2024, Class 1, LOE B
  // PAD + diabetes
  if (
    hasPAD &&
    hasDiabetes &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Annual comprehensive foot exam recommended for review in PAD with diabetes',
      target: 'Comprehensive foot examination with pulse assessment documented',
      recommendations: { action: 'Consider annual comprehensive foot exam with pedal pulse assessment per 2024 ACC/AHA PAD and ADA Standards of Care' },
      evidence: {
        triggerCriteria: [
          'Peripheral artery disease (I73.9 or I70.2*)',
          'Diabetes mellitus (E11.*)',
        ],
        guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; ADA Standards of Care 2024',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent foot exam documented within 12 months'],
      },
    });
  }

  // Gap PV-15: Compression Therapy Assessment
  // Guideline: 2022 ESVS/SVS Guidelines on Chronic Venous Disease; AHA Venous Disease Scientific Statement
  // Venous disease (I87) + edema (R60)
  const hasVenousDisease = dxCodes.some(c => c.startsWith('I87'));
  const hasEdema = dxCodes.some(c => c.startsWith('R60'));
  if (
    hasVenousDisease &&
    hasEdema &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Compression therapy assessment recommended for review in venous disease with edema',
      target: 'Compression therapy evaluation and ABI clearance completed',
      recommendations: { action: 'Consider compression therapy assessment for chronic venous disease with edema per 2022 ESVS/SVS guidelines (verify ABI > 0.8 before prescribing)' },
      evidence: {
        triggerCriteria: [
          'Chronic venous disease (I87.*)',
          'Peripheral edema (R60.*)',
        ],
        guidelineSource: '2022 ESVS/SVS Guidelines on Chronic Venous Disease; AHA Venous Disease Scientific Statement',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe PAD (ABI < 0.5)', 'Active cellulitis or skin breakdown'],
      },
    });
  }

  // ============================================================
  // NEW EP RULES (EP-CSP through EP-TORSADES)
  // ============================================================

  // EP-CSP: Conduction System Pacing Evaluation
  // Guideline: 2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing, Class 2a, LOE B-R
  // LVEF <=35% + pacing indication (existing pacemaker Z95.0 or AV block I44.*)
  const hasPacingIndication = dxCodes.some(c => c.startsWith('Z95.0') || c.startsWith('I44'));
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    hasPacingIndication &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider conduction system pacing evaluation',
      target: 'CSP candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider referral for conduction system pacing (His bundle or left bundle branch area pacing) evaluation',
        guideline: '2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing',
        note: 'Recommended for review in patients with pacing indication and reduced LVEF to minimize pacing-induced cardiomyopathy',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `LVEF: ${labValues['lvef']}% (<=35%)`,
          'Pacing indication (Z95.0 pacemaker or I44.* AV block)',
        ],
        guidelineSource: '2023 HRS/APHRS/LAHRS Guideline on Cardiac Physiologic Pacing',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing CRT device', 'Anatomic unsuitability for CSP'],
      },
    });
  }

  // EP-PFA: Pulsed Field Ablation Candidacy
  // Guideline: 2024 HRS Expert Consensus on PFA, Class 2a, LOE B-NR
  // AF + prior failed ablation proxy (AF + on antiarrhythmic = failed rhythm control proxy)
  // AAD codes: flecainide (4603), propafenone (8754), sotalol (9947), amiodarone (703), dofetilide (135447)
  const AAD_CODES = ['4603', '8754', '9947', '703', '135447'];
  const onAAD = medCodes.some(c => AAD_CODES.includes(c));
  if (
    hasAF &&
    onAAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider pulsed field ablation candidacy evaluation',
      target: 'PFA candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider referral for pulsed field ablation evaluation in AF patient on antiarrhythmic therapy',
        guideline: '2024 HRS Expert Consensus on Pulsed Field Ablation',
        note: 'Recommended for review: PFA may offer improved tissue selectivity compared to thermal ablation',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          'Currently on antiarrhythmic drug (proxy for failed rhythm control or recurrence)',
        ],
        guidelineSource: '2024 HRS Expert Consensus on Pulsed Field Ablation',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Intracardiac thrombus', 'Severe comorbidity limiting life expectancy'],
      },
    });
  }

  // EP-WPW: WPW Syndrome Detection
  // Guideline: 2015 ACC/AHA/HRS SVT Guideline, Class 1, LOE B
  // WPW (I45.6) + age <40 -- high-risk for sudden cardiac death in young patients
  const hasWPW = dxCodes.some(c => c.startsWith('I45.6'));
  if (hasWPW && age < 40 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider EP study for WPW syndrome risk stratification',
      target: 'EP study and ablation candidacy evaluated',
      recommendations: {
        action: 'Consider referral for electrophysiology study and catheter ablation evaluation for WPW',
        guideline: '2015 ACC/AHA/HRS SVT Guideline',
        note: 'Recommended for review: young patients with WPW are at risk for sudden cardiac death via rapid accessory pathway conduction',
      },
      evidence: {
        triggerCriteria: [
          'WPW syndrome diagnosis (I45.6)',
          `Age: ${age} (<40)`,
        ],
        guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior successful ablation documented'],
      },
    });
  }

  // EP-DRONEDARONE: Dronedarone Contraindication Check
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (ANDROMEDA trial), Class 3 (Harm), LOE B-R
  // AF + HF + on dronedarone (RxNorm 997221) -- CONTRAINDICATED in NYHA III/IV or decompensated HF
  if (
    hasAF &&
    hasHF &&
    medCodes.includes('997221') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // LVEF <35% as proxy for NYHA III/IV
    const severeHF = labValues['lvef'] !== undefined && labValues['lvef'] < 35;
    if (severeHF) {
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Dronedarone contraindicated in advanced heart failure',
        target: 'Dronedarone discontinued or HF severity reassessed',
        medication: 'Dronedarone',
        recommendations: {
          action: 'Consider discontinuing dronedarone: contraindicated in NYHA Class III/IV or decompensated HF per ANDROMEDA trial',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'SAFETY ALERT: Dronedarone associated with increased mortality in advanced HF (ANDROMEDA)',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            'Heart failure diagnosis (I50.*)',
            `LVEF: ${labValues['lvef']}% (<35%, proxy for NYHA III/IV)`,
            'Dronedarone active (RxNorm 997221)',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ANDROMEDA Trial)',
          classOfRecommendation: 'Class 3 (Harm)',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // EP-FLUTTER-OAC: Atrial Flutter OAC
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B-NR
  // Atrial flutter (I48.3/I48.4) + age>=65 + no OAC -- same stroke risk as AFib
  const hasFlutter = dxCodes.some(c => c.startsWith('I48.3') || c.startsWith('I48.4'));
  if (hasFlutter && age >= 65 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const OAC_CODES_FLUTTER = ['1364430', '1114195', '1599538', '1037045', '11289'];
    const onOACFlutter = medCodes.some(c => OAC_CODES_FLUTTER.includes(c));
    if (!onOACFlutter) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Oral anticoagulant not prescribed in atrial flutter',
        target: 'OAC therapy initiated for stroke prevention',
        medication: 'Apixaban, Rivaroxaban, or Edoxaban',
        recommendations: {
          action: 'Consider initiating oral anticoagulation for atrial flutter per 2023 ACC/AHA/ACCP/HRS AF Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'Recommended for review: atrial flutter carries similar stroke risk as atrial fibrillation',
        },
        evidence: {
          triggerCriteria: [
            'Atrial flutter diagnosis (I48.3 or I48.4)',
            `Age: ${age} (>=65)`,
            'No oral anticoagulant in active medications',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active major bleeding', 'Severe thrombocytopenia'],
        },
      });
    }
  }

  // EP-IST-IVABRADINE: Inappropriate Sinus Tachycardia Treatment
  // Guideline: 2015 ACC/AHA/HRS SVT Guideline, Class 2a, LOE C
  // Other specified cardiac arrhythmia (I49.8) as IST proxy + HR>100 + no ivabradine
  const hasIST = dxCodes.some(c => c.startsWith('I49.8'));
  if (
    hasIST &&
    labValues['heart_rate'] !== undefined && labValues['heart_rate'] > 100 &&
    !medCodes.includes('1649480') && // ivabradine
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider ivabradine for inappropriate sinus tachycardia',
      target: 'Ivabradine or beta-blocker initiated for rate control',
      medication: 'Ivabradine',
      recommendations: {
        action: 'Consider ivabradine for symptomatic inappropriate sinus tachycardia per 2015 ACC/AHA/HRS SVT Guideline',
        guideline: '2015 ACC/AHA/HRS SVT Guideline',
        note: 'Recommended for review: ivabradine selectively reduces sinus rate without affecting blood pressure',
      },
      evidence: {
        triggerCriteria: [
          'Inappropriate sinus tachycardia proxy (I49.8)',
          `Heart rate: ${labValues['heart_rate']} bpm (>100)`,
          'No ivabradine in active medications',
        ],
        guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Sick sinus syndrome', 'Severe hepatic impairment'],
      },
    });
  }

  // EP-PVC-CM: PVC-Induced Cardiomyopathy Screening
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE B-NR
  // Premature ventricular contractions (I49.3) + LVEF <50% (new cardiomyopathy)
  const hasPVC = dxCodes.some(c => c.startsWith('I49.3'));
  if (
    hasPVC &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider PVC-induced cardiomyopathy evaluation',
      target: 'EP referral for PVC ablation or suppression therapy',
      recommendations: {
        action: 'Consider referral for PVC burden assessment and ablation evaluation in setting of reduced LVEF',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: frequent PVCs (>10-15% burden) can cause reversible cardiomyopathy',
      },
      evidence: {
        triggerCriteria: [
          'PVC diagnosis (I49.3)',
          `LVEF: ${labValues['lvef']}% (<50%)`,
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known structural heart disease causing reduced LVEF'],
      },
    });
  }

  // EP-LQTS-BB: Long QT Syndrome Beta-Blocker
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE B
  // Long QT syndrome (I45.81) + no beta-blocker
  const hasLQTS = dxCodes.some(c => c.startsWith('I45.81'));
  if (hasLQTS && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const BB_CODES_LQTS = ['20352', '6918', '19484', '7512']; // carvedilol, metoprolol, bisoprolol, nadolol
    const onBBforLQTS = medCodes.some(c => BB_CODES_LQTS.includes(c));
    if (!onBBforLQTS) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Beta-blocker not prescribed in Long QT syndrome',
        target: 'Beta-blocker initiated for LQTS',
        medication: 'Nadolol (preferred) or Propranolol',
        recommendations: {
          action: 'Consider initiating beta-blocker therapy for Long QT syndrome per 2017 AHA/ACC/HRS VA Guideline',
          guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
          note: 'Recommended for review: beta-blockers are first-line therapy for LQTS to reduce arrhythmic events',
        },
        evidence: {
          triggerCriteria: [
            'Long QT syndrome diagnosis (I45.81)',
            'No beta-blocker in active medications',
          ],
          guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe asthma/COPD', 'Symptomatic bradycardia'],
        },
      });
    }
  }

  // EP-SUBCLINICAL-AF: Subclinical AF Detection in Device Patients
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (ASSERT, NOAH-AFNET 6), Class 2a, LOE B-R
  // Cardiac device (Z95.0) + no AF diagnosis -- device may detect subclinical atrial high-rate episodes
  const hasPacemaker = dxCodes.some(c => c.startsWith('Z95.0'));
  if (
    hasPacemaker &&
    !hasAF &&
    age >= 65 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider subclinical AF screening via device interrogation',
      target: 'Device interrogation reviewed for atrial high-rate episodes',
      recommendations: {
        action: 'Consider reviewing device interrogation for subclinical atrial high-rate episodes (AHREs)',
        guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
        note: 'Recommended for review: subclinical AF detected by CIEDs is associated with increased stroke risk',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac implantable device (Z95.0)',
          'No atrial fibrillation diagnosis on problem list',
          `Age: ${age} (>=65)`,
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT, NOAH-AFNET 6)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known AF already on anticoagulation'],
      },
    });
  }

  // EP-ICD-PROGRAMMING: ICD Programming Optimization
  // Guideline: 2023 HRS Expert Consensus on ICD Programming (MADIT-RIT, ADVANCE III), Class 1, LOE A
  // ICD (Z95.810) + HF -- programming review to reduce inappropriate shocks
  const hasICDnew = dxCodes.some(c => c.startsWith('Z95.810'));
  if (hasICDnew && hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider ICD programming optimization review',
      target: 'ICD programming reviewed per current evidence-based settings',
      recommendations: {
        action: 'Consider ICD programming review for optimized detection settings per MADIT-RIT/ADVANCE III',
        guideline: '2023 HRS Expert Consensus on ICD Programming',
        note: 'Recommended for review: evidence-based programming reduces inappropriate shocks and improves quality of life',
      },
      evidence: {
        triggerCriteria: [
          'ICD present (Z95.810)',
          'Heart failure diagnosis (I50.*)',
        ],
        guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT, ADVANCE III)',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent programming optimization documented'],
      },
    });
  }

  // EP-LEAD-INTEGRITY: Lead Integrity Monitoring
  // Guideline: 2023 HRS Expert Consensus on CIED Lead Management, Class 1, LOE B
  // ICD (Z95.810) + age proxy (age >= 70 as surrogate for older device/leads)
  if (hasICDnew && age >= 70 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider lead integrity assessment for aging ICD system',
      target: 'Lead integrity evaluation completed',
      recommendations: {
        action: 'Consider lead integrity monitoring and impedance trend review for aging ICD system',
        guideline: '2023 HRS Expert Consensus on CIED Lead Management',
        note: 'Recommended for review: older leads have higher fracture/failure risk; proactive monitoring recommended',
      },
      evidence: {
        triggerCriteria: [
          'ICD present (Z95.810)',
          `Age: ${age} (>=70, proxy for potentially aging lead system)`,
        ],
        guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent lead assessment on file'],
      },
    });
  }

  // EP-AAD-POST-ABLATION: Antiarrhythmic Review Post-Ablation
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 2a, LOE B-NR
  // AF + ablation history proxy (Z98.89 post-procedural status) + still on AAD
  const hasAblationHx = dxCodes.some(c => c.startsWith('Z98.89') || c.startsWith('Z86.79'));
  if (
    hasAF &&
    hasAblationHx &&
    onAAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider antiarrhythmic drug review post-ablation',
      target: 'AAD therapy reassessed for potential discontinuation',
      recommendations: {
        action: 'Consider reviewing antiarrhythmic drug therapy post-ablation for potential discontinuation',
        guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
        note: 'Recommended for review: AADs are often continued during blanking period but may be discontinued 3 months post-ablation',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          'Post-ablation history proxy (Z98.89 or Z86.79)',
          'Currently on antiarrhythmic drug',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Within 3-month blanking period post-ablation'],
      },
    });
  }

  // EP-SECONDARY-ICD: Secondary Prevention ICD
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE A
  // Cardiac arrest survivor (I46.*) without existing ICD
  const hasCardiacArrest = dxCodes.some(c => c.startsWith('I46'));
  if (hasCardiacArrest && !hasICDnew && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider secondary prevention ICD evaluation for cardiac arrest survivor',
      target: 'ICD implantation candidacy evaluated',
      recommendations: {
        action: 'Consider ICD evaluation for secondary prevention in cardiac arrest survivor',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: survivors of VF/hemodynamically unstable VT have high recurrence risk without ICD',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac arrest diagnosis (I46.*)',
          'No existing ICD (Z95.810 absent)',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Completely reversible cause identified', 'Life expectancy < 1 year'],
      },
    });
  }

  // EP-ACHD-ARRHYTHMIA: Adult CHD Arrhythmia Screening
  // Guideline: 2018 AHA/ACC Guideline for Management of Adults with CHD, Class 1, LOE B
  // Congenital heart disease (Q20-Q28) + adult (age >18)
  const hasACHD = dxCodes.some(c => {
    const prefix = c.substring(0, 3);
    return prefix >= 'Q20' && prefix <= 'Q28';
  });
  if (hasACHD && age > 18 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider arrhythmia screening in adult congenital heart disease',
      target: 'Holter monitor or event recorder and EP evaluation completed',
      recommendations: {
        action: 'Consider arrhythmia screening with ambulatory monitoring for adult congenital heart disease patient',
        guideline: '2018 AHA/ACC Guideline for Management of Adults with Congenital Heart Disease',
        note: 'Recommended for review: ACHD patients have high lifetime arrhythmia risk including atrial flutter, AF, and VT',
      },
      evidence: {
        triggerCriteria: [
          'Congenital heart disease diagnosis (Q20-Q28)',
          `Age: ${age} (>18)`,
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent arrhythmia evaluation on file'],
      },
    });
  }

  // EP-TORSADES: Torsades Risk with Multiple QT-Prolonging Drugs
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE B-NR
  // QTc >500ms + at least 1 QT-prolonging medication
  // QT-prolonging med codes: amiodarone (703), dofetilide (135447), sotalol (9947),
  //   ondansetron (26225), haloperidol (5093), methadone (6813)
  const QT_PROLONGING_CODES = ['703', '135447', '9947', '26225', '5093', '6813'];
  const qtProlongingMedCount = medCodes.filter(c => QT_PROLONGING_CODES.includes(c)).length;
  if (
    labValues['qtc_interval'] !== undefined && labValues['qtc_interval'] > 500 &&
    qtProlongingMedCount >= 1 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SAFETY_ALERT,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Torsades de pointes risk: prolonged QTc with QT-prolonging medication(s)',
      target: 'QT-prolonging medications reviewed and electrolytes assessed',
      recommendations: {
        action: 'Consider urgent review of QT-prolonging medications and electrolyte correction (K>4.0, Mg>2.0)',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'SAFETY ALERT: QTc >500ms with QT-prolonging drugs significantly increases torsades risk',
      },
      evidence: {
        triggerCriteria: [
          `QTc interval: ${labValues['qtc_interval']}ms (>500ms)`,
          `QT-prolonging medications active: ${qtProlongingMedCount}`,
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // ============================================================
  // NEW CORONARY RULES (CAD-PCSK9 through CAD-INFLUENZA)
  // ============================================================

  // CAD-PCSK9: PCSK9 Inhibitor Consideration
  // Guideline: 2018 ACC/AHA Cholesterol Guideline (FOURIER, ODYSSEY), Class 2a, LOE A
  // CAD + on max statin + LDL still >70
  // RxNorm: evolocumab (1657974), alirocumab (1659149)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_PCSK9 = ['36567', '301542', '83367', '42463'];
    const onStatinPCSK9 = medCodes.some(c => STATIN_CODES_PCSK9.includes(c));
    const PCSK9_CODES = ['1657974', '1659149'];
    const onPCSK9 = medCodes.some(c => PCSK9_CODES.includes(c));
    if (onStatinPCSK9 && !onPCSK9 && labValues['ldl'] !== undefined && labValues['ldl'] > 70) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider PCSK9 inhibitor for LDL not at goal on maximally tolerated statin',
        target: 'PCSK9 inhibitor therapy initiated or LDL <70 mg/dL achieved',
        medication: 'Evolocumab or Alirocumab',
        recommendations: {
          action: 'Consider PCSK9 inhibitor for persistent LDL >70 on maximally tolerated statin per 2018 ACC/AHA Cholesterol Guideline',
          guideline: '2018 ACC/AHA Cholesterol Guideline (FOURIER, ODYSSEY)',
          note: 'Recommended for review: PCSK9i reduce LDL by ~60% and decrease CV events in ASCVD patients',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Currently on statin therapy',
            `LDL: ${labValues['ldl']} mg/dL (>70)`,
            'No PCSK9 inhibitor in active medications',
          ],
          guidelineSource: '2018 ACC/AHA Guideline on Management of Blood Cholesterol (FOURIER, ODYSSEY)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'PCSK9i allergy or intolerance'],
        },
      });
    }
  }

  // CAD-IVUS: Intravascular Imaging for Left Main
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline, Class 2a, LOE B-NR
  // Left main CAD (I25.110) -- consider IVUS/OCT for PCI planning
  const hasLeftMain = dxCodes.some(c => c.startsWith('I25.110'));
  if (hasLeftMain && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'Consider intravascular imaging for left main coronary disease',
      target: 'IVUS or OCT guidance documented for PCI planning',
      recommendations: {
        action: 'Consider intravascular imaging (IVUS or OCT) to guide left main PCI per 2021 ACC/AHA/SCAI Guideline',
        guideline: '2021 ACC/AHA/SCAI Revascularization Guideline',
        note: 'Recommended for review: intravascular imaging improves outcomes for left main PCI',
      },
      evidence: {
        triggerCriteria: [
          'Left main coronary artery disease (I25.110)',
        ],
        guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'CABG planned', 'Contrast allergy'],
      },
    });
  }

  // CAD-FFR: Fractional Flow Reserve for Intermediate Lesions
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline (FAME, FAME 2), Class 1, LOE A
  // CAD + borderline/intermediate stenosis proxy (CAD without MI = stable CAD)
  if (hasCAD && !hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    // Stable CAD without documented stress test as proxy for intermediate lesion needing FFR
    const hasStressTestFFR = labValues['stress_test'] !== undefined;
    if (!hasStressTestFFR) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider physiologic assessment (FFR/iFR) for intermediate coronary lesions',
        target: 'FFR/iFR or stress testing completed for functional assessment',
        recommendations: {
          action: 'Consider fractional flow reserve (FFR) or instantaneous wave-free ratio (iFR) for intermediate lesions per FAME/FAME 2',
          guideline: '2021 ACC/AHA/SCAI Revascularization Guideline',
          note: 'Recommended for review: FFR-guided PCI improves outcomes compared to angiography-guided alone',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No recent MI (stable CAD proxy for intermediate lesions)',
            'No stress test result available',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (FAME, FAME 2)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent revascularization', 'Non-candidate for PCI'],
        },
      });
    }
  }

  // CAD-COLCHICINE: Anti-Inflammatory Therapy with Colchicine
  // Guideline: 2023 AHA/ACC Update: Colchicine for ASCVD (COLCOT, LoDoCo2), Class 2b, LOE A
  // CAD + elevated CRP as inflammation proxy
  // RxNorm colchicine: 2683
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCRP = labValues['crp'] !== undefined && labValues['crp'] > 2;
    if (hasCRP && !medCodes.includes('2683')) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider low-dose colchicine for residual inflammatory risk in CAD',
        target: 'Colchicine therapy considered for CV risk reduction',
        medication: 'Colchicine 0.5mg daily',
        recommendations: {
          action: 'Consider low-dose colchicine for residual inflammatory CV risk per COLCOT/LoDoCo2',
          guideline: '2023 AHA/ACC Guideline Update',
          note: 'Recommended for review: colchicine reduced CV events in CAD patients with residual inflammation',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `CRP: ${labValues['crp']} mg/L (>2, elevated inflammatory marker)`,
            'Colchicine not in active medications (RxNorm 2683)',
          ],
          guidelineSource: '2023 AHA/ACC Guideline Update: Colchicine for Atherosclerotic CVD (COLCOT, LoDoCo2)',
          classOfRecommendation: 'Class 2b',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe renal impairment (eGFR <30)', 'Severe hepatic impairment', 'Myopathy'],
        },
      });
    }
  }

  // CAD-OMEGA3: Icosapent Ethyl for Elevated Triglycerides
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline (REDUCE-IT), Class 2a, LOE B-R
  // CAD + TG >150 + on statin + no icosapent ethyl
  // RxNorm icosapent ethyl: 1546275
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_O3 = ['36567', '301542', '83367', '42463'];
    const onStatinO3 = medCodes.some(c => STATIN_CODES_O3.includes(c));
    if (
      onStatinO3 &&
      labValues['triglycerides'] !== undefined && labValues['triglycerides'] > 150 &&
      !medCodes.includes('1546275')
    ) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider icosapent ethyl for elevated triglycerides in CAD',
        target: 'Icosapent ethyl therapy initiated or TG at goal',
        medication: 'Icosapent ethyl (Vascepa)',
        recommendations: {
          action: 'Consider icosapent ethyl for persistent TG >150 on statin per REDUCE-IT',
          guideline: '2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: icosapent ethyl 4g/day reduced CV events by 25% in REDUCE-IT',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Currently on statin therapy',
            `Triglycerides: ${labValues['triglycerides']} mg/dL (>150)`,
            'Icosapent ethyl not in active medications (RxNorm 1546275)',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (REDUCE-IT)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Fish/shellfish allergy', 'Active bleeding'],
        },
      });
    }
  }

  // CAD-RANOLAZINE: Refractory Angina Treatment
  // Guideline: 2012 ACC/AHA Stable Ischemic Heart Disease Guideline (updated 2023), Class 2a, LOE B-R
  // CAD + still symptomatic proxy (angina I20.* + on beta-blocker + on CCB = max therapy) + no ranolazine
  // RxNorm ranolazine: 355019
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAngina = dxCodes.some(c => c.startsWith('I20'));
    const BB_CODES_RAN = ['20352', '6918', '19484'];
    const CCB_CODES_RAN = ['3443', '17767', '7417']; // diltiazem, amlodipine, nifedipine
    const onBBran = medCodes.some(c => BB_CODES_RAN.includes(c));
    const onCCBran = medCodes.some(c => CCB_CODES_RAN.includes(c));
    if (hasAngina && onBBran && onCCBran && !medCodes.includes('355019')) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider ranolazine for refractory angina on maximal anti-anginal therapy',
        target: 'Ranolazine initiated or angina reassessed',
        medication: 'Ranolazine',
        recommendations: {
          action: 'Consider ranolazine for persistent angina despite beta-blocker and CCB per ACC/AHA Stable IHD Guideline',
          guideline: '2012 ACC/AHA Stable IHD Guideline',
          note: 'Recommended for review: ranolazine can be added as third-line anti-anginal agent',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Angina diagnosis (I20.*)',
            'On beta-blocker and calcium channel blocker (max therapy proxy)',
            'Ranolazine not in active medications (RxNorm 355019)',
          ],
          guidelineSource: '2012 ACC/AHA/AATS/PCNA/SCAI/STS Guideline for Diagnosis and Management of Stable Ischemic Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'QTc >500ms', 'Hepatic cirrhosis', 'Strong CYP3A4 inhibitor use'],
        },
      });
    }
  }

  // CAD-STRESS-TEST: Stress Test Follow-up
  // Guideline: 2021 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  // CAD + no recent imaging (no LVEF and no stress test as proxy)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasImagingProxy = labValues['lvef'] !== undefined || labValues['stress_test'] !== undefined;
    if (!hasImagingProxy) {
      gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider periodic stress testing or imaging follow-up in CAD',
        target: 'Stress test or functional imaging completed',
        recommendations: {
          action: 'Consider stress testing or cardiac imaging for CAD follow-up per 2021 ACC/AHA Chest Pain Guideline',
          guideline: '2021 ACC/AHA Chest Pain Guideline',
          note: 'Recommended for review: periodic functional assessment guides management in stable CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No LVEF or stress test result in recent observations',
          ],
          guidelineSource: '2021 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent revascularization with documented follow-up'],
        },
      });
    }
  }

  // CAD-REVASCULARIZATION: Revascularization Assessment
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline (STICH, REVIVED-BCIS2), Class 2a, LOE B
  // CAD + LVEF <35% + multivessel disease proxy (multiple CAD codes or I25.1*)
  const hasMultivesselCAD = dxCodes.filter(c => c.startsWith('I25.1')).length >= 2;
  if (
    hasCAD &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 35 &&
    hasMultivesselCAD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'Consider revascularization assessment for multivessel CAD with reduced LVEF',
      target: 'Heart team discussion for revascularization strategy',
      recommendations: {
        action: 'Consider heart team evaluation for revascularization in multivessel CAD with ischemic cardiomyopathy',
        guideline: '2021 ACC/AHA/SCAI Revascularization Guideline (STICH)',
        note: 'Recommended for review: CABG may improve outcomes in multivessel CAD with reduced LVEF per STICH trial',
      },
      evidence: {
        triggerCriteria: [
          'Coronary artery disease (I25.*)',
          `LVEF: ${labValues['lvef']}% (<35%)`,
          'Multiple I25.1* codes suggesting multivessel disease',
        ],
        guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (STICH, REVIVED-BCIS2)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Non-candidate for surgery', 'Recent revascularization'],
      },
    });
  }

  // CAD-ANTICOAG-AF: Anticoagulation in CAD + AF (Dual Pathway Therapy)
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline + 2021 ACC/AHA Revasc (AUGUSTUS, AFIRE), Class 1, LOE A
  // CAD + AF + not on OAC
  if (hasCAD && hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const OAC_CODES_CAD_AF = ['1364430', '1114195', '1599538', '1037045', '11289'];
    const onOACforCADAF = medCodes.some(c => OAC_CODES_CAD_AF.includes(c));
    if (!onOACforCADAF) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider oral anticoagulation in CAD patient with atrial fibrillation',
        target: 'OAC therapy initiated with dual pathway strategy review',
        medication: 'Apixaban or Rivaroxaban (DOAC preferred)',
        recommendations: {
          action: 'Consider DOAC monotherapy over triple therapy when feasible per AUGUSTUS/AFIRE',
          guideline: '2023 ACC/AHA/ACCP/HRS AF + 2021 Revascularization Guideline',
          note: 'Recommended for review: DOAC + single antiplatelet preferred over triple therapy to reduce bleeding',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Atrial fibrillation (I48.*)',
            'No oral anticoagulant in active medications',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS AF Guideline + 2021 ACC/AHA Revascularization (AUGUSTUS, AFIRE)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active major bleeding', 'Mechanical valve (warfarin required)'],
        },
      });
    }
  }

  // CAD-GLP1-DM: GLP-1 RA for CAD + Diabetes (CV Risk Reduction)
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline (SUSTAIN-6, LEADER), Class 1, LOE A
  // CAD + T2DM + no GLP-1 RA
  // RxNorm semaglutide: 2551758
  if (hasCAD && hasDiabetes && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const GLP1_CODES = ['2551758', '475968', '1803932']; // semaglutide, liraglutide, dulaglutide
    const onGLP1 = medCodes.some(c => GLP1_CODES.includes(c));
    if (!onGLP1) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider GLP-1 RA for cardiovascular risk reduction in CAD + diabetes',
        target: 'GLP-1 RA therapy initiated for CV benefit',
        medication: 'Semaglutide, Liraglutide, or Dulaglutide',
        recommendations: {
          action: 'Consider GLP-1 RA with proven CV benefit for CAD + T2DM per 2019 ACC/AHA Guideline',
          guideline: '2019 ACC/AHA Primary Prevention Guideline (SUSTAIN-6, LEADER)',
          note: 'Recommended for review: GLP-1 RAs with proven CV benefit reduce MACE in T2DM with established ASCVD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Type 2 diabetes mellitus (E11.*)',
            'No GLP-1 RA in active medications',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (SUSTAIN-6, LEADER)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Medullary thyroid carcinoma', 'MEN2 syndrome', 'Pancreatitis history'],
        },
      });
    }
  }

  // CAD-SGLT2-DM: SGLT2i for CAD + Diabetes
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline (EMPA-REG, CANVAS), Class 1, LOE A
  // CAD + T2DM + no SGLT2i
  // RxNorm dapagliflozin: 1488564
  if (hasCAD && hasDiabetes && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const SGLT2I_CODES_CAD = ['1488564', '1545653', '2627044']; // dapagliflozin, empagliflozin, sotagliflozin
    const onSGLT2iCAD = medCodes.some(c => SGLT2I_CODES_CAD.includes(c));
    if (!onSGLT2iCAD) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider SGLT2i for cardiovascular risk reduction in CAD + diabetes',
        target: 'SGLT2i therapy initiated for CV and renal benefit',
        medication: 'Dapagliflozin or Empagliflozin',
        recommendations: {
          action: 'Consider SGLT2i with proven CV benefit for CAD + T2DM per 2019 ACC/AHA Guideline',
          guideline: '2019 ACC/AHA Primary Prevention Guideline (EMPA-REG, CANVAS)',
          note: 'Recommended for review: SGLT2i reduce MACE, HF hospitalizations, and renal outcomes in T2DM with ASCVD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Type 2 diabetes mellitus (E11.*)',
            'No SGLT2i in active medications',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD (EMPA-REG, CANVAS)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'eGFR <20', 'Recurrent DKA', 'Type 1 diabetes'],
        },
      });
    }
  }

  // CAD-BEMPEDOIC: Bempedoic Acid for Statin Intolerance
  // Guideline: 2022 ACC Expert Consensus on Nonstatin Therapies (CLEAR Outcomes), Class 2a, LOE B-R
  // CAD + statin allergy/intolerance (Z88.*) + high LDL + no bempedoic acid
  // RxNorm bempedoic acid: 2390411
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasStatinIntolerance = dxCodes.some(c => c.startsWith('Z88'));
    if (
      hasStatinIntolerance &&
      labValues['ldl'] !== undefined && labValues['ldl'] > 70 &&
      !medCodes.includes('2390411')
    ) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider bempedoic acid for statin-intolerant CAD patient with elevated LDL',
        target: 'Bempedoic acid or alternative lipid-lowering therapy initiated',
        medication: 'Bempedoic acid',
        recommendations: {
          action: 'Consider bempedoic acid for CAD patients with documented statin intolerance per CLEAR Outcomes',
          guideline: '2022 ACC Expert Consensus on Nonstatin Therapies',
          note: 'Recommended for review: bempedoic acid reduced MACE by 13% in statin-intolerant patients (CLEAR Outcomes)',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Drug allergy/intolerance documented (Z88.*)',
            `LDL: ${labValues['ldl']} mg/dL (>70)`,
            'Bempedoic acid not in active medications (RxNorm 2390411)',
          ],
          guidelineSource: '2022 ACC Expert Consensus Decision Pathway on Nonstatin Therapies (CLEAR Outcomes)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe renal impairment', 'Tendon disorders'],
        },
      });
    }
  }

  // CAD-WEIGHT-MGMT: Weight Management in CAD + Obesity
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE B
  // CAD + obesity (BMI >30 or E66.*)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasObesityCAD = dxCodes.some(c => c.startsWith('E66'));
    const bmiOver30CAD = labValues['bmi'] !== undefined && labValues['bmi'] > 30;
    if (hasObesityCAD || bmiOver30CAD) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider structured weight management program for CAD patient with obesity',
        target: 'Weight management referral or structured program initiated',
        recommendations: {
          action: 'Consider referral to structured weight management program for CAD + obesity per ACC/AHA Guideline',
          guideline: '2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: weight management reduces CV risk factors and improves outcomes in CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `Obesity (E66.* or BMI: ${labValues['bmi'] ?? 'N/A'} >30)`,
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // CAD-DEPRESSION: Depression Screening in CAD
  // Guideline: 2008 AHA Science Advisory: Depression and CHD (reaffirmed 2021), Class 1, LOE B
  // CAD + no depression screening (PHQ-2/PHQ-9 not in labs)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPHQ = labValues['phq2'] !== undefined || labValues['phq9'] !== undefined;
    if (!hasPHQ) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider depression screening for CAD patient',
        target: 'PHQ-2 or PHQ-9 screening completed',
        recommendations: {
          action: 'Consider routine depression screening (PHQ-2/PHQ-9) for CAD patient per AHA Science Advisory',
          guideline: '2008 AHA Science Advisory on Depression and CHD (reaffirmed 2021)',
          note: 'Recommended for review: depression is common in CAD (15-20%) and independently associated with worse outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No PHQ-2 or PHQ-9 screening result in observations',
          ],
          guidelineSource: '2008 AHA Science Advisory: Depression and CHD (reaffirmed 2021)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active psychiatric treatment documented'],
        },
      });
    }
  }

  // CAD-INFLUENZA: Influenza Vaccination in CAD
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE B
  // CAD + no flu vaccine documented (Z23 = encounter for immunization)
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasVaccine = dxCodes.some(c => c.startsWith('Z23'));
    if (!hasVaccine) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider annual influenza vaccination for CAD patient',
        target: 'Influenza vaccination administered or documented',
        recommendations: {
          action: 'Consider annual influenza vaccination for cardiovascular risk reduction per 2019 ACC/AHA Guideline',
          guideline: '2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: influenza vaccination reduces CV events and mortality in CAD patients',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No immunization encounter (Z23) documented',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of CVD',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Egg allergy (severe)', 'Prior severe vaccine reaction'],
        },
      });
    }
  }

  return gaps;
}
