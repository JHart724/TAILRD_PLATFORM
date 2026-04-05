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

  return gaps;
}
