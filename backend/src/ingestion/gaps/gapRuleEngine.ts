// @ts-nocheck
// Gap detection rules use TherapyGapType enum values defined in schema.prisma
// but not yet in the generated Prisma client. Type checking disabled until prisma generate runs.
import { TherapyGapType, ModuleType, Prisma } from '@prisma/client';
import {
  RXNORM_GDMT,
  RXNORM_STATINS,
  RXNORM_DOACS,
  RXNORM_WARFARIN,
  RXNORM_P2Y12_INHIBITORS,
  RXNORM_DIGOXIN,
  RXNORM_QT_PROLONGING,
  RXNORM_RATE_CONTROL,
} from '../../terminology/cardiovascularValuesets';

/** Extract code arrays from valueset objects for medication matching */
function codes(obj: Record<string, string>): string[] {
  return Object.values(obj);
}

// Canonical medication code arrays from cardiovascularValuesets.ts (single source of truth)
const STATIN_CODES_CV = codes(RXNORM_STATINS);
const DOAC_CODES_CV = codes(RXNORM_DOACS);
const P2Y12_CODES_CV = codes(RXNORM_P2Y12_INHIBITORS);
const DIGOXIN_CODES_CV = codes(RXNORM_DIGOXIN);
const BB_CODES_CV = [RXNORM_GDMT.CARVEDILOL, RXNORM_GDMT.METOPROLOL_SUCCINATE, RXNORM_GDMT.BISOPROLOL];
const MRA_CODES_CV = [RXNORM_GDMT.SPIRONOLACTONE, RXNORM_GDMT.EPLERENONE];
const SGLT2I_CODES_CV = [RXNORM_GDMT.DAPAGLIFLOZIN, RXNORM_GDMT.EMPAGLIFLOZIN, RXNORM_GDMT.SOTAGLIFLOZIN];
const RAAS_CODES_CV = [RXNORM_GDMT.LISINOPRIL, RXNORM_GDMT.ENALAPRIL, RXNORM_GDMT.RAMIPRIL, RXNORM_GDMT.LOSARTAN, RXNORM_GDMT.VALSARTAN, RXNORM_GDMT.SACUBITRIL_VALSARTAN];
const AAD_CODES_CV = [RXNORM_QT_PROLONGING.FLECAINIDE, RXNORM_QT_PROLONGING.AMIODARONE, RXNORM_QT_PROLONGING.SOTALOL, RXNORM_QT_PROLONGING.DOFETILIDE, RXNORM_QT_PROLONGING.DRONEDARONE];
const RATE_CONTROL_CODES_CV = codes(RXNORM_RATE_CONTROL);
const OAC_CODES_CV = [...codes(RXNORM_DOACS), RXNORM_WARFARIN.WARFARIN];


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
    safetyClass?: 'SAFETY' | 'SAFETY_CRITICAL'; // Spec-flagged immediate-harm category. Persistence layer should write a parallel AuditLog entry per HIPAA §164.312(b) when set.
  };
}

/**
 * HFrEF detection states. Used by EP-RC rule and any future rules that need to
 * differentiate HFrEF / non-HFrEF / HF-with-unknown-LVEF for therapy gating.
 */
type HfrefStatus = 'hfref' | 'not_hfref' | 'hf_unknown_lvef';

/**
 * Determine HFrEF status from dx codes + lab values with explicit LVEF check.
 * Returns 'hf_unknown_lvef' when HF dx is present but LVEF is missing — caller
 * should surface a structured data gap rather than silently default to non-HFrEF.
 *
 * Threshold: LVEF <= 40% per 2022 AHA/ACC/HFSA HF Guideline (HFrEF definition).
 */
function detectHfrefStatus(hasHF: boolean, labValues: Record<string, number>): HfrefStatus {
  if (!hasHF) return 'not_hfref';
  const lvef = labValues['lvef'];
  if (lvef === undefined) return 'hf_unknown_lvef';
  return lvef <= 40 ? 'hfref' : 'not_hfref';
}

/**
 * Feature flag for EP-017 HFrEF gating on the rate-control rule.
 * Default: enabled (true). Set EP_RATE_CONTROL_HFREF_GATING_ENABLED=false for rollback.
 *
 * When disabled: rate-control rule fires with original recommendation (BB or non-DHP CCB).
 * When enabled (default): rule recommends BB-only for HFrEF, fires SAFETY gap when
 * HFrEF + on non-DHP CCB, fires data gap when HF dx but LVEF unknown.
 *
 * Rollback path: set env var to literal string 'false'. No code change required.
 */
const EP_RATE_CONTROL_HFREF_GATING_ENABLED =
  process.env.EP_RATE_CONTROL_HFREF_GATING_ENABLED !== 'false';

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
    id: 'gap-ep-017-hfref-non-dhp-ccb',
    name: 'AF + non-DHP CCB in HFrEF (SAFETY)',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guideline + 2023 ACC/AHA/ACCP/HRS AF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-05-05',
    nextReviewDue: '2026-11-05',
    classOfRecommendation: '3 (Harm)',
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
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
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
  {
    id: 'gap-ep-early-rhythm',
    name: 'Early Rhythm Control in New AF',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (EAST-AFNET 4)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-vt-ablation',
    name: 'VT Ablation Referral',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017/2023 update',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-svt-ablation',
    name: 'SVT Ablation Referral',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-brugada',
    name: 'Brugada Syndrome Screening',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-ep-arvc',
    name: 'ARVC Screening',
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
    id: 'gap-ep-cardiac-sarcoid-ep',
    name: 'Cardiac Sarcoid Arrhythmia Screen',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on Evaluation and Management of Arrhythmic Risk in Cardiac Sarcoidosis',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-pacemaker-upgrade',
    name: 'Pacemaker to CRT Upgrade Evaluation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-af-stroke-risk',
    name: 'CHA2DS2-VASc Formal Calculation',
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
    id: 'gap-ep-anticoag-interruption',
    name: 'Perioperative Anticoagulation Management',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF; 2022 ACC/AHA Perioperative Guidelines',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-direct-cardioversion',
    name: 'Cardioversion Timing Assessment',
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
    id: 'gap-ep-tee-pre-cardioversion',
    name: 'TEE Before Cardioversion',
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
    id: 'gap-ep-cied-mri',
    name: 'MRI-Conditional CIED Documentation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 HRS Expert Consensus Statement on MRI and Radiation Exposure in Patients with CIEDs',
    guidelineVersion: '2017',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-generator-replacement',
    name: 'Generator Replacement Planning',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management and Generator Replacement',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-ep-inappropriate-shocks',
    name: 'ICD Inappropriate Shock Workup',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT)',
    guidelineVersion: '2023',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-exercise-testing-ep',
    name: 'Exercise Testing for Arrhythmia',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
    guidelineVersion: '2015',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-arni-switch',
    name: 'ACEi/ARB to ARNi Switch',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (PARADIGM-HF)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-thiamine',
    name: 'Thiamine Supplementation in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; Systematic Review (DiNicolantonio 2013)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-potassium-monitor',
    name: 'Potassium Monitoring on MRA',
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
    id: 'gap-hf-advance-care',
    name: 'Advance Care Planning in Advanced HF',
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
    id: 'gap-hf-lvnc',
    name: 'LV Non-Compaction Screening',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; 2019 ESC Position Statement on LVNC',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-hemodynamic-monitor',
    name: 'Hemodynamic Monitoring Review',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (CHAMPION Trial)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-diuretic-optimization',
    name: 'Diuretic Dose Optimization',
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
    id: 'gap-hf-vaccine-covid',
    name: 'COVID Vaccination in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; CDC Immunization Guidelines',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA/CDC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-hf-anemia-hf',
    name: 'Anemia Workup in HF',
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
    id: 'gap-sh-bicuspid-surveillance',
    name: 'Bicuspid Aortic Valve Surveillance',
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
    id: 'gap-sh-ross-procedure',
    name: 'Ross Procedure Candidacy',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-sh-valve-in-valve',
    name: 'Valve-in-Valve TAVR Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-asd-closure',
    name: 'ASD Closure Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-vsd-closure',
    name: 'VSD Closure Evaluation',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-coarctation',
    name: 'Coarctation Follow-up',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-fontan-surveillance',
    name: 'Fontan Surveillance',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-carcinoid-valve',
    name: 'Carcinoid Valve Disease Screen',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ENETS Consensus Guidelines on Carcinoid Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA/ENETS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-prosthetic-pannus',
    name: 'Prosthetic Valve Pannus/Thrombosis Screen',
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
    id: 'gap-vd-radiation-valve',
    name: 'Radiation-Associated Valve Disease',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2022 ACC/AHA Guideline for Cardio-Oncology; 2020 ACC/AHA VHD Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-infective-endo',
    name: 'Infective Endocarditis Surveillance',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2015 AHA Scientific Statement on Infective Endocarditis; 2023 ESC Guidelines on Endocarditis',
    guidelineVersion: '2023',
    guidelineOrg: 'AHA/ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-bicuspid-aneurysm',
    name: 'Bicuspid Valve Aortopathy Screening',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; 2022 ACC/AHA Aortic Disease Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-anticoag-reversal',
    name: 'Anticoagulation Reversal Plan',
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
    id: 'gap-vd-transcatheter-mv',
    name: 'Transcatheter Mitral Intervention Evaluation',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (COAPT Trial)',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-vd-right-heart-cath',
    name: 'Right Heart Catheterization for Valve Surgery',
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
    id: 'gap-vd-valve-clinic-referral',
    name: 'Multidisciplinary Valve Clinic Referral',
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
    id: 'gap-cad-ticagrelor-acs',
    name: 'Ticagrelor in ACS',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (PLATO Trial)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-nitro-prn',
    name: 'PRN Nitroglycerin for Angina',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
    guidelineVersion: '2012/2014 update',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-echo-cad',
    name: 'Echocardiography in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-bnp-cad',
    name: 'BNP Monitoring in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; 2022 ACC/AHA Chest Pain Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-renal-monitor',
    name: 'Renal Function Monitoring on ACEi in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-dapt-duration',
    name: 'DAPT Duration Review',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-ppi-dapt',
    name: 'PPI with DAPT for GI Protection',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2020 ACC Expert Consensus on GI Bleeding in Patients on Antithrombotic Therapy',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-aldo-postmi',
    name: 'MRA Post-MI with LVEF<=40 and HF',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (EPHESUS Trial)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-electrolyte',
    name: 'Electrolyte Monitoring Post-MI on Diuretic',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-anemia',
    name: 'Anemia Screening Post-MI',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-thyroid',
    name: 'Thyroid Function in CAD with AFib',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-activity',
    name: 'Physical Activity Counseling in CAD',
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
    id: 'gap-cad-diet',
    name: 'Dietary Counseling in CAD with Obesity',
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
    id: 'gap-cad-psychosocial',
    name: 'Psychosocial Assessment in Elderly CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-family-screen',
    name: 'Premature CAD Family Screening',
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
    id: 'gap-cad-calcium-score',
    name: 'Coronary Calcium Score for Intermediate Risk',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-crp',
    name: 'CRP Monitoring in CAD on Statin',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol (CANTOS Trial)',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-advance-dir',
    name: 'Advance Directive Discussion in Severe CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-cad-palliative',
    name: 'Palliative Care Referral in Refractory CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-cardiac-ct',
    name: 'Cardiac CT for Stable Chest Pain',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain (SCOT-HEART, PROMISE)',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-prasugrel',
    name: 'Prasugrel in ACS with PCI',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (TRITON-TIMI 38)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-heparin-bridge',
    name: 'Heparin Bridging in CAD with AF and Procedure',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS AF Guideline (BRIDGE Trial)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-sexual-health',
    name: 'Sexual Health Counseling Post-MI',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 AHA/ACC Scientific Statement on Sexual Activity and Cardiovascular Disease',
    guidelineVersion: '2012',
    guidelineOrg: 'AHA/ACC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-driving',
    name: 'Post-MI Driving Restriction Documentation',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
    guidelineVersion: '2012/2014 update',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-cad-liver-statin',
    name: 'Liver Function Monitoring on Statin in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-rivaroxaban',
    name: 'Low-Dose Rivaroxaban in PAD (COMPASS)',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease (COMPASS Trial)',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-clopidogrel',
    name: 'Clopidogrel for Aspirin Intolerance in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease (CAPRIE Trial)',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-bypass-eval',
    name: 'Bypass Evaluation for CLI',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; GVG CLI Guidelines',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA/SVS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-endovascular',
    name: 'Endovascular Evaluation for Claudication',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-venous-ulcer',
    name: 'Venous Ulcer Management',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2023 SVS/AVF/AVLS Clinical Practice Guidelines for Venous Ulceration',
    guidelineVersion: '2023',
    guidelineOrg: 'SVS/AVF',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-pv-dvt-screen',
    name: 'DVT Screening for Unilateral Edema',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2020 ASH Guideline on VTE Diagnosis',
    guidelineVersion: '2020',
    guidelineOrg: 'ASH',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-pts-prevention',
    name: 'Post-Thrombotic Syndrome Prevention',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2021 ASH Guideline on VTE Treatment (SOX Trial)',
    guidelineVersion: '2021',
    guidelineOrg: 'ASH',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-mesenteric',
    name: 'Mesenteric Ischemia Screening in PAD',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-pv-thoracic-outlet',
    name: 'Thoracic Outlet Syndrome Evaluation',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: 'SVS Reporting Standards for Thoracic Outlet Syndrome',
    guidelineVersion: '2016',
    guidelineOrg: 'SVS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-pv-varicose',
    name: 'Varicose Vein Management',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 SVS/AVF Clinical Practice Guidelines for Varicose Veins',
    guidelineVersion: '2024',
    guidelineOrg: 'SVS/AVF',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-lymphedema',
    name: 'Lymphedema Management',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2020 ISL Consensus Document on Lymphedema Management',
    guidelineVersion: '2020',
    guidelineOrg: 'ISL',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-raynaud',
    name: 'Raynaud Phenomenon CCB Therapy',
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
    id: 'gap-pv-vascular-rehab',
    name: 'Vascular Rehabilitation Post-Intervention',
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
    id: 'gap-pv-pentoxifylline',
    name: 'Pentoxifylline When Cilostazol Contraindicated',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-naftidrofuryl',
    name: 'Naftidrofuryl for Severe Claudication',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ESC/ESVS Guideline on Peripheral Arterial and Aortic Diseases',
    guidelineVersion: '2024',
    guidelineOrg: 'ESC/ESVS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-ep-af-catheter-timing',
    name: 'AF Ablation Timing Optimization',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (EAST-AFNET 4, EARLY-AF)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-iron-iv-monitoring',
    name: 'IV Iron Therapy Monitoring',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (AFFIRM-AHF, IRONMAN)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-aspirin-primary',
    name: 'Aspirin Assessment in CAD',
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
    id: 'gap-cad-beta-blocker',
    name: 'Beta-Blocker in Stable CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
    guidelineVersion: '2012',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-ace-stable',
    name: 'ACEi in Stable CAD with HTN',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2017 ACC/AHA High Blood Pressure Guideline + 2012 Stable IHD Guideline',
    guidelineVersion: '2017',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-nicorandil',
    name: 'Nicorandil for Refractory Angina',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes',
    guidelineVersion: '2019',
    guidelineOrg: 'ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-trimetazidine',
    name: 'Trimetazidine Consideration in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes',
    guidelineVersion: '2019',
    guidelineOrg: 'ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-coronary-cta-fu',
    name: 'Coronary CTA Follow-Up',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-nuclear-stress',
    name: 'Nuclear Stress Test Consideration',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-catheterization',
    name: 'Catheterization Review',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-complete-revasc',
    name: 'Complete Revascularization Assessment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (COMPLETE Trial)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-ischemia-guided',
    name: 'Ischemia-Guided Therapy Review',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (ISCHEMIA Trial)',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA/SCAI',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-minoca',
    name: 'MINOCA Workup',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for Evaluation and Diagnosis of Chest Pain; AHA MINOCA Scientific Statement',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-scad',
    name: 'SCAD Evaluation',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 AHA Scientific Statement on SCAD',
    guidelineVersion: '2018',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-cad-takotsubo',
    name: 'Takotsubo Follow-Up',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ESC Position Statement on Takotsubo Syndrome',
    guidelineVersion: '2018',
    guidelineOrg: 'ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: 'Expert Consensus',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-cad-vasospastic',
    name: 'Vasospastic Angina Evaluation',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes; JCS 2013 Vasospastic Angina Guideline',
    guidelineVersion: '2019',
    guidelineOrg: 'ESC/JCS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-microvascular',
    name: 'Microvascular Disease Assessment',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes; COVADIS Criteria',
    guidelineVersion: '2019',
    guidelineOrg: 'ESC',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-cad-cardiac-transplant-cad',
    name: 'Cardiac Allograft Vasculopathy',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: 'ISHLT 2010 Guideline on Cardiac Allograft Vasculopathy',
    guidelineVersion: '2010',
    guidelineOrg: 'ISHLT',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C',
  },
  {
    id: 'gap-cad-lipid-panel-fu',
    name: 'Lipid Panel Follow-Up in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-glucose-screen',
    name: 'Glucose Screening in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of Cardiovascular Disease',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-hemoglobin-a1c-target',
    name: 'A1c Target Review in CAD+DM',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention; ADA Standards of Care 2024',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA/ADA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-antiplatelet-review',
    name: 'Antiplatelet Review Post-Event',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2016 ACC/AHA Guideline Focused Update on Duration of DAPT',
    guidelineVersion: '2016',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-cad-chest-pain-protocol',
    name: 'Chest Pain Protocol Adherence',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-secondary-prevention',
    name: 'Secondary Prevention Bundle Review',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention; AHA/ACC Secondary Prevention Recommendations',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-women-specific',
    name: 'Women-Specific CAD Screening',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention; AHA Cardiovascular Disease in Women Scientific Statement',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-cad-young-mi',
    name: 'Young MI Workup',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
    guidelineVersion: '2022',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-cad-exercise-prescription',
    name: 'Exercise Prescription in CAD',
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
    id: 'gap-cad-sleep-apnea-cad',
    name: 'Sleep Apnea Screening in CAD',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention; AHA Sleep Apnea and CVD Scientific Statement',
    guidelineVersion: '2019',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-pill-in-pocket',
    name: 'Pill-in-Pocket Strategy for Paroxysmal AF',
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
    id: 'gap-ep-left-atrial-size',
    name: 'Left Atrial Size Documentation',
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
    id: 'gap-ep-anticoag-score-reassess',
    name: 'Annual CHA2DS2-VASc Reassessment',
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
    id: 'gap-vd-echo-interval',
    name: 'Echo Surveillance Interval Adherence',
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
    id: 'gap-vd-functional-status',
    name: 'Functional Status Assessment in Valve Disease',
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
    id: 'gap-vd-preop-assessment',
    name: 'Preoperative Assessment for Valve Surgery',
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
    id: 'gap-vd-pulmonary-htn',
    name: 'Pulmonary Hypertension Screen in Valve Disease',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2022 ESC/ERS Guidelines for Diagnosis and Treatment of Pulmonary Hypertension',
    guidelineVersion: '2022',
    guidelineOrg: 'ESC/ERS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-vd-tricuspid-secondary',
    name: 'Secondary Tricuspid Regurgitation',
    module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vd-antiplatelet-bioprosthetic',
    name: 'Antiplatelet After Bioprosthetic Valve',
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
    id: 'gap-pv-critical-limb',
    name: 'Critical Limb Ischemia Urgent Evaluation',
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
    id: 'gap-pv-graft-surveillance',
    name: 'Bypass Graft Surveillance',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; SVS Practice Guidelines',
    guidelineVersion: '2024',
    guidelineOrg: 'ACC/AHA/SVS',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-pv-anticoag-vte',
    name: 'VTE Anticoagulation Duration Review',
    module: 'PERIPHERAL_VASCULAR',
    guidelineSource: '2021 ASH Guidelines on VTE Management; 2020 CHEST Guideline on Antithrombotic Therapy for VTE',
    guidelineVersion: '2021',
    guidelineOrg: 'ASH/CHEST',
    lastReviewDate: '2026-04-03',
    nextReviewDue: '2026-10-03',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
] as const;

export function evaluateGapRules(
  dxCodes: string[],
  labValues: Record<string, number>,
  medCodes: string[],
  age: number,
  gender?: string,
  race?: string,
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
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
  }

  // Gap 2: Iron Deficiency in HF — gated on LVEF ≤45% per AFFIRM-AHF/IRONMAN
  // 2022 AHA/ACC HF Guideline §7.19, Class 2a, LOE B-R
  // Requires: HF + LVEF ≤45% + iron deficiency (ferritin <100 OR ferritin 100-299 + TSAT <20%)
  // NYHA II-III gate cannot be fully enforced without NYHA data — LVEF ≤45% is the primary gate
  if (hasHF && labValues['ferritin'] !== undefined && labValues['lvef'] !== undefined && labValues['lvef'] <= 45) {
    const ferritinLow = labValues['ferritin'] < 100;
    const tsatLow = labValues['tsat'] !== undefined && labValues['tsat'] < 20;
    const functionalID = labValues['ferritin'] >= 100 && labValues['ferritin'] < 300 && tsatLow;
    if ((ferritinLow || functionalID) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'Iron deficiency untreated in HF with LVEF ≤45%',
        target: 'IV iron considered',
        medication: 'IV Iron',
        recommendations: { action: 'Consider IV Ferric Carboxymaltose per 2022 AHA/ACC HF Guideline (AFFIRM-AHF, IRONMAN)' },
        evidence: {
          triggerCriteria: [
            `LVEF: ${labValues['lvef']}% (≤45%)`,
            ferritinLow ? `Ferritin: ${labValues['ferritin']} ng/mL (<100 — absolute ID)` : `Ferritin: ${labValues['ferritin']} ng/mL + TSAT: ${labValues['tsat'] ?? 'N/A'}% (<20% — functional ID)`,
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline §7.19 (AFFIRM-AHF, IRONMAN trials)',
          classOfRecommendation: '2a',
          levelOfEvidence: 'B-R',
          exclusions: ['Active infection', 'Iron overload', 'LVEF >45%', 'Hospice/palliative care'],
        },
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.HEART_FAILURE,
          status: 'Finerenone not prescribed (CKD + T2DM)',
          target: 'Finerenone initiated',
          medication: 'Finerenone',
          recommendations: { action: 'Consider Finerenone for CKD with T2DM per FIDELIO-DKD/FIGARO-DKD' },
              evidence: {
          triggerCriteria: ['Finerenone not prescribed (CKD + T2DM)'],
          guidelineSource: 'FIDELIO-DKD / FIGARO-DKD Trials; FDA-approved for CKD + T2DM',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hyperkalemia (K+ >= 5.0)', 'Severe hepatic impairment', 'Hospice/palliative care'],
        },
  });
      }
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.HEART_FAILURE,
          status: 'SGLT2i not prescribed in HFrEF',
          target: 'SGLT2i initiated',
          medication: 'Dapagliflozin or Empagliflozin',
          recommendations: {
            action: 'Consider SGLT2i per 2022 AHA/ACC/HFSA, Class 1, LOE A',
            guideline: 'DAPA-HF / EMPEROR-Reduced trials',
          },
              evidence: {
          triggerCriteria: ['SGLT2i not prescribed in HFrEF'],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline (DAPA-HF, EMPEROR-Reduced)',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Type 1 diabetes with DKA', 'eGFR < 20', 'Hospice/palliative care'],
        },
  });
      }
    }
  }

  // Gap HF-35: Beta-Blocker Missing in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A
  // Evidence-based BB: carvedilol (20352), metoprolol succinate (6918), bisoprolol (19484)
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 40) {
    const BB_CODES = ['20352', '6918', '19484'];
    const onBB = medCodes.some(c => BB_CODES.includes(c));
    if (!onBB) {
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.HEART_FAILURE,
          status: 'Evidence-based beta-blocker not prescribed in HFrEF',
          target: 'Beta-blocker initiated',
          medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol',
          recommendations: {
            action: 'Consider evidence-based BB per 2022 AHA/ACC/HFSA, Class 1, LOE A',
          },
          evidence: {
            triggerCriteria: ['HFrEF without evidence-based beta-blocker'],
            guidelineSource: '2022 AHA/ACC/HFSA Guideline for Heart Failure',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Severe bradycardia', 'Cardiogenic shock', 'Hospice/palliative care'],
          },
        });
      }
    }
  }

  // Gap HF-36: MRA Missing in HFrEF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A (RALES, EMPHASIS-HF)
  // Spironolactone (9997) or Eplerenone (298869) when LVEF <=40%, K<5.0, eGFR>30
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 40 &&
    labValues['potassium'] !== undefined && labValues['potassium'] < 5.0 &&
    labValues['egfr'] !== undefined && labValues['egfr'] > 30
  ) {
    const MRA_CODES = ['9997', '298869'];
    const onMRA = medCodes.some(c => MRA_CODES.includes(c));
    if (!onMRA) {
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.HEART_FAILURE,
          status: 'MRA not prescribed in HFrEF with LVEF<=40%',
          target: 'Spironolactone or Eplerenone initiated',
          medication: 'Spironolactone or Eplerenone',
          recommendations: { action: 'Consider MRA per 2022 AHA/ACC/HFSA, Class 1, LOE A (RALES/EMPHASIS-HF)' },
              evidence: {
          triggerCriteria: ['Evidence-based beta-blocker not prescribed in HFrEF'],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Severe bradycardia (HR < 50)', 'Cardiogenic shock', 'Hospice/palliative care'],
        },
  });
      }
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
    !medCodes.includes('1649380') &&
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
    race?.toUpperCase() === 'BLACK' &&
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

  // Gap HF-79: SGLT2i for HFpEF/HFmrEF
  // Guideline: 2023 ACC Expert Consensus on HFpEF (EMPEROR-Preserved, DELIVER Trials)
  // DELIVER included LVEF > 40%, so this covers both HFmrEF (41-49%) and HFpEF (>=50%)
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] > 40 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const SGLT2I_CODES_HFPEF = ['1488564', '1545653', '2627044'];
    const onSGLT2iHFpEF = medCodes.some(c => SGLT2I_CODES_HFPEF.includes(c));
    if (!onSGLT2iHFpEF) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.HEART_FAILURE,
        status: 'SGLT2i not prescribed in HFmrEF/HFpEF',
        target: 'SGLT2i therapy considered',
        medication: 'Dapagliflozin or Empagliflozin',
        recommendations: { action: 'Consider SGLT2i for HFmrEF/HFpEF per 2023 ACC Expert Consensus (EMPEROR-Preserved, DELIVER)' },
        evidence: {
          triggerCriteria: [`HFmrEF/HFpEF (LVEF > 40%): ${labValues['lvef']}%`, 'No current SGLT2i'],
          guidelineSource: '2023 ACC Expert Consensus Decision Pathway on HFpEF (EMPEROR-Preserved, DELIVER Trials)',
          classOfRecommendation: '2a',
          levelOfEvidence: 'B-R',
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_CONTRAINDICATED,
          module: ModuleType.ELECTROPHYSIOLOGY,
          status: `QTc ${severity}: ${labValues['qtc_interval']}ms (threshold ${qtcThreshold}ms)`,
          target: 'QT drug review completed',
          recommendations: { action: 'Consider ECG + Electrolytes + Medication Review' },
          evidence: {
            triggerCriteria: ['QTc prolongation above sex-specific threshold'],
            guidelineSource: '2017 AHA/ACC/HRS Guideline for Ventricular Arrhythmias',
            classOfRecommendation: '1',
            levelOfEvidence: 'B',
            exclusions: ['Known congenital LQTS on treatment', 'Hospice/palliative care'],
          },
        });
      }
    }
  }

  // Gap EP-OAC: Oral Anticoagulation Missing in AFib — full CHA₂DS₂-VASc scoring
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE A
  // Male threshold: score ≥2; Female threshold: score ≥3
  if (hasAF) {
    // CHA₂DS₂-VASc calculation per 2019 AHA/ACC AF guideline
    const scoreComponents: Record<string, number> = {};
    let cha2Score = 0;

    // C: Congestive Heart Failure (+1)
    if (dxCodes.some(c => c.startsWith('I50'))) { scoreComponents['CHF'] = 1; cha2Score += 1; }
    // H: Hypertension (+1)
    if (dxCodes.some(c => c.startsWith('I10') || c.startsWith('I11') || c.startsWith('I12') || c.startsWith('I13') || c.startsWith('I15'))) { scoreComponents['HTN'] = 1; cha2Score += 1; }
    // A2: Age ≥75 (+2) or Age 65-74 (+1)
    if (age >= 75) { scoreComponents['Age≥75'] = 2; cha2Score += 2; }
    else if (age >= 65) { scoreComponents['Age65-74'] = 1; cha2Score += 1; }
    // D: Diabetes mellitus (+1)
    if (dxCodes.some(c => c.startsWith('E10') || c.startsWith('E11') || c.startsWith('E13') || c.startsWith('E14'))) { scoreComponents['DM'] = 1; cha2Score += 1; }
    // S2: Stroke/TIA/thromboembolism (+2)
    if (dxCodes.some(c => c.startsWith('I63') || c.startsWith('I64') || c.startsWith('G45') || c === 'Z86.73')) { scoreComponents['Stroke/TIA'] = 2; cha2Score += 2; }
    // V: Vascular disease — prior MI, PAD, aortic plaque (+1)
    if (dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22') || c === 'I73.9' || c.startsWith('I70.2'))) { scoreComponents['Vascular'] = 1; cha2Score += 1; }
    // Sc: Sex category female (+1)
    const isFemale = gender?.toUpperCase() === 'FEMALE' || gender?.toUpperCase() === 'F';
    if (isFemale) { scoreComponents['Female'] = 1; cha2Score += 1; }

    const threshold = isFemale ? 3 : 2;
    if (cha2Score >= threshold) {
      const OAC_CODES = ['1364430', '1114195', '1599538', '1037045', '11289']; // DOACs + warfarin
      const onOAC = medCodes.some(c => OAC_CODES.includes(c));
      if (!onOAC && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
        const activeComponents = Object.entries(scoreComponents).filter(([, v]) => v > 0).map(([k, v]) => `${k}+${v}`).join(', ');
        gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.ELECTROPHYSIOLOGY,
          status: 'Oral anticoagulant not prescribed in AFib',
          target: 'OAC therapy initiated',
          medication: 'Apixaban, Rivaroxaban, or Edoxaban',
          recommendations: {
            action: 'Consider DOAC per 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE A',
            guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation',
          },
          evidence: {
            triggerCriteria: [
              'AFib confirmed (I48.*)',
              `CHA₂DS₂-VASc score: ${cha2Score} (${activeComponents})`,
              `Threshold: ≥${threshold} (${isFemale ? 'female' : 'male'})`,
              'No current OAC therapy',
            ],
            guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Active major bleeding', 'Mechanical heart valve', 'Hospice/palliative care'],
          },
        });
      }
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_CONTRAINDICATED,
          module: ModuleType.HEART_FAILURE,
          status: 'Digoxin toxicity risk',
          target: 'Digoxin dose reviewed',
          medication: 'Digoxin',
          recommendations: { action: 'Review Digoxin Dose' },
          evidence: {
            triggerCriteria: ['Age >= 75, eGFR < 50, on digoxin'],
            guidelineSource: 'DIG Trial Post-Hoc; 2022 AHA/ACC/HFSA Guideline',
            classOfRecommendation: '1',
            levelOfEvidence: 'B',
            exclusions: ['Hospice/palliative care'],
          },
        });
      }
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
        if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'P2Y12 inhibitor not active post-stent/CAD',
        target: 'DAPT resumed or documented discontinuation rationale',
        medication: 'P2Y12 Inhibitor',
        recommendations: { action: 'Verify DAPT status with interventional cardiologist per ACC/AHA 2021' },
          evidence: {
            triggerCriteria: ['CAD/stent without P2Y12 inhibitor'],
            guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Revascularization',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Active bleeding', 'High bleeding risk', 'Hospice/palliative care'],
          },
      });
    }
  }

  // Gap CAD-STATIN: High-Intensity Statin in CAD
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 1, LOE A
  // All ASCVD patients should be on high-intensity statin
  if (hasCAD) {
    const STATIN_CODES = ['83367', '301542', '36567', '42463'];
    const onStatin = medCodes.some(c => STATIN_CODES.includes(c));
    if (!onStatin) {
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.CORONARY_INTERVENTION,
          status: 'High-intensity statin not prescribed in CAD',
          target: 'Statin therapy initiated',
          medication: 'Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
          recommendations: {
            action: 'Consider high-intensity statin per 2018 ACC/AHA Cholesterol, Class 1, LOE A',
            guideline: '2018 ACC/AHA Cholesterol Management',
          },
              evidence: {
          triggerCriteria: ['Digoxin toxicity risk'],
          guidelineSource: 'DIG Trial Post-Hoc Analysis; 2022 AHA/ACC/HFSA Guideline',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care'],
        },
  });
      }
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
    const STATIN_CODES_EZE = ['83367', '301542', '36567', '42463'];
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.IMAGING_OVERDUE,
          module: ModuleType.STRUCTURAL_HEART,
          status: 'Echo surveillance overdue for aortic stenosis',
          target: 'Transthoracic echocardiogram completed',
          recommendations: {
            action: 'Consider TTE per 2020 ACC/AHA VHD Guideline',
            guideline: '2020 ACC/AHA Valvular Heart Disease, Class 1, LOE B',
          },
          evidence: {
            triggerCriteria: ['Aortic stenosis without recent echo'],
            guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
            classOfRecommendation: '1',
            levelOfEvidence: 'B',
            exclusions: ['Hospice/palliative care'],
          },
        });
      }
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.VALVULAR_DISEASE,
          status: 'Warfarin not active with mechanical valve',
          target: 'Warfarin prescribed with target INR 2.5-3.5',
          medication: 'Warfarin',
          recommendations: {
            action: 'Consider warfarin per 2020 ACC/AHA VHD Guideline, Class 1, LOE A',
            guideline: '2020 ACC/AHA Valvular Heart Disease',
          },
              evidence: {
          triggerCriteria: ['Echo surveillance overdue for aortic stenosis'],
          guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care'],
        },
  });
      }
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
    const STATIN_CODES = ['83367', '301542', '36567', '42463']; // atorvastatin, rosuvastatin, simvastatin, pravastatin
    const onStatin = medCodes.some(c => STATIN_CODES.includes(c));
    if (!onStatin) {
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.PERIPHERAL_VASCULAR,
          status: 'High-intensity statin not prescribed in PAD',
          target: 'Statin therapy initiated',
          medication: 'Atorvastatin or Rosuvastatin',
          recommendations: {
            action: 'Consider high-intensity statin per 2024 ACC/AHA PAD Guideline, Class 1, LOE A',
            guideline: '2024 ACC/AHA Peripheral Artery Disease',
          },
          evidence: {
            triggerCriteria: ['PAD without high-intensity statin'],
            guidelineSource: '2024 ACC/AHA Guideline for Peripheral Artery Disease',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Statin intolerance', 'Active liver disease', 'Hospice/palliative care'],
          },
        });
      }
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.SCREENING_DUE,
          module: ModuleType.PERIPHERAL_VASCULAR,
          status: 'ABI screening not performed',
          target: 'Ankle-brachial index completed',
          recommendations: {
            action: 'Consider ABI per 2024 ACC/AHA PAD Guideline for symptomatic/at-risk patients',
            guideline: '2024 ACC/AHA Peripheral Artery Disease, Class 1, LOE B',
          },
          evidence: {
            triggerCriteria: ['Claudication or diabetes+age>=50 without ABI'],
            guidelineSource: '2024 ACC/AHA Guideline for Peripheral Artery Disease',
            classOfRecommendation: '1',
            levelOfEvidence: 'B',
            exclusions: ['Known PAD', 'Prior ABI', 'Hospice/palliative care'],
          },
        });
      }
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
            if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.HEART_FAILURE,
          status: 'ACEi/ARB/ARNi not prescribed in HFrEF',
          target: 'RAAS inhibitor initiated (preferably sacubitril/valsartan)',
          medication: 'Sacubitril/Valsartan (preferred), Lisinopril, Enalapril, Ramipril, Losartan, or Valsartan',
          recommendations: {
            action: 'Consider RAAS inhibitor per 2022 AHA/ACC/HFSA, Class 1, LOE A',
            guideline: '2022 AHA/ACC/HFSA Heart Failure Guideline',
            preferred: 'Sacubitril/Valsartan (ARNI) per PARADIGM-HF',
          },
              evidence: {
          triggerCriteria: ['High-intensity statin not prescribed in PAD'],
          guidelineSource: '2024 ACC/AHA Guideline for Peripheral Artery Disease',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Documented statin intolerance', 'Active liver disease', 'Hospice/palliative care'],
        },
  });
      }
    }
  }

  // ============================================================
  // Gap EP-RC + EP-017: Rate Control in AFib (HFrEF-aware)
  // ============================================================
  // Guideline (rate control): 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE B
  // Guideline (EP-017 SAFETY): 2022 AHA/ACC/HFSA HF Guideline, Class 3 (Harm) for non-DHP CCB in HFrEF
  // RxNorm:
  //   BB (HFrEF-safe rate control): metoprolol (6918), carvedilol (20352)
  //   Non-DHP CCB (HFrEF-DANGEROUS — Class 3 Harm in HFrEF): diltiazem (3443), verapamil (11170)
  //
  // Behavior is gated by EP_RATE_CONTROL_HFREF_GATING_ENABLED feature flag (default true).
  // Pre-gating: rule recommended BB or non-DHP CCB indiscriminately (EP-XX-7 harm vector).
  // With gating: rule recommends BB-only for HFrEF, fires SAFETY gap when HFrEF + on non-DHP CCB,
  // fires structured data gap when HF dx is present but LVEF is missing.
  if (hasAF) {
    const BB_RATE_CONTROL_CODES = ['6918', '20352'];        // metoprolol, carvedilol
    const NON_DHP_CCB_CODES = ['3443', '11170'];             // diltiazem, verapamil
    const ALL_RATE_CONTROL_CODES = [...BB_RATE_CONTROL_CODES, ...NON_DHP_CCB_CODES];
    const onAnyRateControl = medCodes.some(c => ALL_RATE_CONTROL_CODES.includes(c));
    const onNonDhpCcb = medCodes.some(c => NON_DHP_CCB_CODES.includes(c));
    const hfrefStatus: HfrefStatus = EP_RATE_CONTROL_HFREF_GATING_ENABLED
      ? detectHfrefStatus(hasHF, labValues)
      : 'not_hfref';

    if (EP_RATE_CONTROL_HFREF_GATING_ENABLED) {
      // EP-017 SAFETY: HFrEF + on non-DHP CCB → fire SAFETY gap (Class 3 Harm).
      // This fires regardless of whether other rate-control agents are also on board —
      // the SAFETY scenario is "patient is currently exposed to non-DHP CCB while having HFrEF."
      if (hfrefStatus === 'hfref' && onNonDhpCcb && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
        gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.ELECTROPHYSIOLOGY,
          status: 'SAFETY: Non-DHP CCB (diltiazem/verapamil) is contraindicated in HFrEF',
          target: 'Switch to evidence-based beta-blocker (metoprolol succinate, carvedilol, or bisoprolol)',
          medication: 'Replace diltiazem/verapamil with metoprolol succinate, carvedilol, or bisoprolol',
          recommendations: {
            action: 'Discontinue non-DHP CCB and initiate evidence-based BB per 2022 AHA/ACC/HFSA, Class 3 (Harm)',
            guideline: '2022 AHA/ACC/HFSA Heart Failure Guideline + 2023 ACC/AHA/ACCP/HRS AF Guideline',
            note: 'Non-DHP CCB has negative inotropic effect; in HFrEF (LVEF <=40%) this is Class 3 (Harm).',
          },
          evidence: {
            triggerCriteria: [
              'AFib (I48.x)',
              'HFrEF detected (HF dx + LVEF <=40%)',
              'On diltiazem (RxNorm 3443) or verapamil (RxNorm 11170)',
            ],
            guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guideline',
            classOfRecommendation: '3 (Harm)',
            levelOfEvidence: 'B',
            exclusions: ['Hospice/palliative care', 'Documented contraindication to all BBs'],
            safetyClass: 'SAFETY',
          },
        });
      }

      // Structured data gap: HF dx + AF + LVEF unknown → can't evaluate HFrEF gating.
      // Surfaces a real action (measure LVEF) rather than silently defaulting to "no HFrEF"
      // which would preserve the EP-XX-7 harm vector.
      if (hfrefStatus === 'hf_unknown_lvef' && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
        gaps.push({
          type: TherapyGapType.SCREENING_DUE,
          module: ModuleType.ELECTROPHYSIOLOGY,
          status: 'LVEF measurement required to safely guide AF rate-control therapy in HF patient',
          target: 'Recent echocardiogram or cardiac MRI with LVEF documented',
          recommendations: {
            action: 'Obtain LVEF measurement (echocardiogram or cardiac MRI) before prescribing AF rate-control therapy. Non-DHP CCB is contraindicated in HFrEF (LVEF <=40%); LVEF data is required to safely select rate-control agent.',
            guideline: '2022 AHA/ACC/HFSA Heart Failure Guideline + 2023 ACC/AHA/ACCP/HRS AF Guideline',
          },
          evidence: {
            triggerCriteria: [
              'HF diagnosis (I50.x) present',
              'AFib (I48.x) present',
              'No LVEF value in lab observations',
            ],
            guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guideline',
            classOfRecommendation: '1',
            levelOfEvidence: 'C-EO',
            exclusions: ['Hospice/palliative care'],
          },
        });
      }
    }

    // Rate-control gap: fires when patient has AF and is not on any rate-control agent.
    // HFrEF-aware recommendation: if HFrEF detected, recommend BB only (avoid non-DHP CCB).
    if (!onAnyRateControl && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      const isHfref = hfrefStatus === 'hfref';
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: isHfref
          ? 'Rate control agent not prescribed in AFib (HFrEF: avoid non-DHP CCB)'
          : 'Rate control agent not prescribed in AFib',
        target: isHfref
          ? 'Beta-blocker initiated (avoid non-DHP CCB in HFrEF)'
          : 'Beta-blocker or non-dihydropyridine CCB initiated',
        medication: isHfref
          ? 'Metoprolol or Carvedilol (BB only — non-DHP CCB contraindicated in HFrEF)'
          : 'Metoprolol, Carvedilol, Diltiazem, or Verapamil',
        recommendations: {
          action: isHfref
            ? 'Consider evidence-based beta-blocker per 2023 ACC/AHA/ACCP/HRS AFib Guideline + 2022 AHA/ACC/HFSA HF Guideline. Avoid diltiazem/verapamil — Class 3 (Harm) in HFrEF.'
            : 'Consider rate control agent per 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE B',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation',
          note: isHfref
            ? 'HFrEF detected (LVEF <=40%): non-DHP CCB excluded from recommendation per 2022 AHA/ACC/HFSA Class 3 (Harm).'
            : 'Avoid non-DHP CCB (diltiazem/verapamil) in patients with HFrEF',
        },
        evidence: {
          triggerCriteria: isHfref
            ? ['AFib without rate control agent', 'HFrEF detected (HF dx + LVEF <=40%)']
            : ['AFib without rate control agent'],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Severe bradycardia', 'Sick sinus without pacemaker', 'Hospice/palliative care'],
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
        if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
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
          evidence: {
            triggerCriteria: ['CAD without cardiac rehabilitation referral'],
            guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Revascularization',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Unstable angina', 'Severe functional limitation', 'Hospice/palliative care'],
          },
      });
    }
  }

  // ============================================================
  // Gap SH-2: TAVR Evaluation for Severe Aortic Stenosis
  // ============================================================
  // Guideline: 2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE A
  // Patients with severe AS (I35.0), age >= 65, and LVEF available (suggests symptomatic/evaluated)
  // should be evaluated for TAVR by a heart valve team
  if (hasAorticStenosis && age >= 65 && labValues['lvef'] !== undefined) {
        if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
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
            evidence: {
          triggerCriteria: ['Rate control agent not prescribed in AFib'],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Severe bradycardia', 'Sick sinus syndrome without pacemaker', 'Hospice/palliative care'],
        },
  });
    }
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
        if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
  gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Echo surveillance overdue for bioprosthetic valve',
        target: 'Annual transthoracic echocardiogram completed',
        recommendations: {
          action: 'Consider TTE for bioprosthetic valve surveillance per 2020 ACC/AHA VHD, Class 1, LOE C',
          guideline: '2020 ACC/AHA Valvular Heart Disease',
          note: 'Annual echo monitors for structural valve deterioration (SVD) in bioprosthetic valves',
        },
          evidence: {
            triggerCriteria: ['Bioprosthetic valve without recent echo'],
            guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
            classOfRecommendation: '1',
            levelOfEvidence: 'C',
            exclusions: ['Hospice/palliative care'],
          },
      });
    }
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
  // AAD codes: flecainide (4441), propafenone (8754), sotalol (9947), amiodarone (703), dofetilide (135447)
  const AAD_CODES = ['4441', '8754', '9947', '703', '135447'];
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
    !medCodes.includes('1649380') && // ivabradine
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
    const STATIN_CODES_PCSK9 = ['83367', '301542', '36567', '42463'];
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
    const STATIN_CODES_O3 = ['83367', '301542', '36567', '42463'];
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


  // ============================================================
  // NEW CORONARY RULES (CAD-TICAGRELOR-ACS through CAD-LIVER-STATIN)
  // ============================================================

  // CAD-TICAGRELOR-ACS: Ticagrelor in Acute Coronary Syndrome
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline (PLATO Trial), Class 1, LOE A
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onTicagrelorACS = medCodes.includes('1116632');
    if (!onTicagrelorACS) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider ticagrelor for ACS per PLATO trial evidence',
        target: 'P2Y12 inhibitor therapy reviewed',
        medication: 'Ticagrelor',
        recommendations: {
          action: 'Consider ticagrelor 90mg BID for ACS per 2021 ACC/AHA/SCAI Guideline (PLATO)',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: ticagrelor reduced CV death, MI, and stroke vs clopidogrel in PLATO',
        },
        evidence: {
          triggerCriteria: [
            'Acute coronary syndrome (I21.*)',
            'No ticagrelor (RxNorm 1116632) in active medications',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (PLATO Trial)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Prior intracranial hemorrhage', 'On prasugrel'],
        },
      });
    }
  }

  // CAD-NITRO-PRN: PRN Nitroglycerin for Angina
  // Guideline: 2012 ACCF/AHA Stable Ischemic Heart Disease Guideline, Class 1, LOE B
  const hasAnginaNitro = dxCodes.some(c => c.startsWith('I20'));
  if (hasAnginaNitro && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onNitro = medCodes.includes('7832');
    if (!onNitro) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider PRN nitroglycerin for angina symptom relief',
        target: 'Sublingual nitroglycerin prescribed for acute episodes',
        medication: 'Nitroglycerin SL',
        recommendations: {
          action: 'Consider sublingual nitroglycerin PRN for acute anginal episodes per SIHD Guideline',
          guideline: '2012 ACCF/AHA Stable Ischemic Heart Disease Guideline',
          note: 'Recommended for review: all angina patients should have PRN nitroglycerin access',
        },
        evidence: {
          triggerCriteria: [
            'Angina pectoris (I20.*)',
            'No nitroglycerin (RxNorm 7832) in active medications',
          ],
          guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'PDE5 inhibitor use', 'Severe aortic stenosis', 'Hypotension'],
        },
      });
    }
  }

  // CAD-ECHO-CAD: Echocardiography for LVEF Assessment in CAD
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['lvef'] === undefined) {
      gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider echocardiography for LVEF assessment in CAD',
        target: 'LVEF documented via echocardiography',
        recommendations: {
          action: 'Consider transthoracic echocardiogram to assess LV function per 2022 ACC/AHA Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: LVEF guides risk stratification and therapy selection in CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No LVEF measurement in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echocardiogram within 12 months'],
        },
      });
    }
  }

  // CAD-BNP-CAD: BNP/NT-proBNP Monitoring in CAD
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 2a, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasBNPcad = labValues['bnp'] !== undefined || labValues['nt_probnp'] !== undefined;
    if (!hasBNPcad) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider BNP/NT-proBNP measurement for CAD risk stratification',
        target: 'Natriuretic peptide level documented',
        recommendations: {
          action: 'Consider BNP or NT-proBNP to assess for subclinical HF and guide prognosis per 2022 AHA/ACC/HFSA Guideline',
          guideline: '2022 AHA/ACC/HFSA HF Guideline',
          note: 'Recommended for review: natriuretic peptides help identify CAD patients at risk for HF development',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No BNP or NT-proBNP in observations',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known HF with recent BNP monitoring'],
        },
      });
    }
  }

  // CAD-RENAL-MONITOR: Renal Function Monitoring on ACEi in CAD
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  const ACEI_ARB_CODES_RENAL = ['29046', '214354', '83818', '321064', '52175', '69749'];
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onACEiARBrenal = medCodes.some(c => ACEI_ARB_CODES_RENAL.includes(c));
    if (onACEiARBrenal && labValues['egfr'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider renal function monitoring for CAD patient on ACEi/ARB',
        target: 'eGFR and creatinine documented',
        recommendations: {
          action: 'Consider checking eGFR and serum creatinine per guideline-directed monitoring',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: ACEi/ARB therapy requires periodic renal function assessment',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On ACEi/ARB therapy',
            'No eGFR in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Dialysis-dependent (N18.6)'],
        },
      });
    }
  }

  // CAD-DAPT-DURATION: DAPT Duration Review Beyond 12 Months
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline, Class 2a, LOE A
  const ASPIRIN_CODE_DAPT = '1191';
  const P2Y12_CODES_DAPT = ['32968', '1116632', '613391'];
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onAspirinDAPT = medCodes.includes(ASPIRIN_CODE_DAPT);
    const onP2Y12dapt = medCodes.some(c => P2Y12_CODES_DAPT.includes(c));
    if (onAspirinDAPT && onP2Y12dapt) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider DAPT duration review: assess continued need beyond 12 months',
        target: 'DAPT duration documented with bleeding/ischemic risk assessment',
        recommendations: {
          action: 'Consider reviewing DAPT duration using DAPT score or PRECISE-DAPT to balance ischemic vs bleeding risk',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: prolonged DAPT beyond 12 months should be reassessed periodically',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On dual antiplatelet therapy (aspirin + P2Y12)',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent ACS within 12 months'],
        },
      });
    }
  }

  // CAD-PPI-DAPT: PPI with DAPT for GI Risk
  // Guideline: 2020 ACC Expert Consensus on GI Bleeding in Antithrombotic Therapy, Class 2a, LOE B
  const GI_RISK_CODES_PPI = ['K21', 'K25', 'K26', 'K27', 'K92'];
  const PPI_CODES_DAPT = ['7646', '36567', '40790', '283742'];
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onDAPTppi = medCodes.includes(ASPIRIN_CODE_DAPT) && medCodes.some(c => P2Y12_CODES_DAPT.includes(c));
    const hasGIriskPPI = dxCodes.some(dx => GI_RISK_CODES_PPI.some(gi => dx.startsWith(gi)));
    const onPPIdapt = medCodes.some(c => PPI_CODES_DAPT.includes(c));
    if (onDAPTppi && hasGIriskPPI && !onPPIdapt) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider PPI for GI protection in CAD patient on DAPT with GI risk factors',
        target: 'PPI co-prescribed with DAPT for GI prophylaxis',
        medication: 'Proton Pump Inhibitor',
        recommendations: {
          action: 'Consider PPI for gastroprotection in patients on DAPT with GI risk per 2020 ACC Expert Consensus',
          guideline: '2020 ACC Expert Consensus on GI Bleeding in Patients on Antithrombotic Therapy',
          note: 'Recommended for review: PPI reduces GI bleeding risk with DAPT without increasing CV events',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On dual antiplatelet therapy',
            'GI risk factor documented (GERD, PUD, GI bleed history)',
            'No PPI in active medications',
          ],
          guidelineSource: '2020 ACC Expert Consensus on GI Bleeding in Patients on Antithrombotic Therapy',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'PPI allergy'],
        },
      });
    }
  }

  // CAD-ALDO-POSTMI: MRA Post-MI with LVEF<=40 and HF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline (EPHESUS Trial), Class 1, LOE A
  const MRA_CODES_POSTMI = ['9997', '298869'];
  if (hasRecentMI && hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const lvefPostMI = labValues['lvef'];
    const onMRApostMI = medCodes.some(c => MRA_CODES_POSTMI.includes(c));
    if (lvefPostMI !== undefined && lvefPostMI <= 40 && !onMRApostMI) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider MRA for post-MI patient with LVEF<=40% and HF',
        target: 'MRA therapy initiated or contraindication documented',
        medication: 'Eplerenone or Spironolactone',
        recommendations: {
          action: 'Consider eplerenone or spironolactone post-MI with LVEF<=40% and HF per EPHESUS trial evidence',
          guideline: '2022 AHA/ACC/HFSA HF Guideline',
          note: 'Recommended for review: EPHESUS showed 15% mortality reduction with eplerenone post-MI',
        },
        evidence: {
          triggerCriteria: [
            'Acute MI (I21.*)',
            `LVEF: ${lvefPostMI}% (<=40%)`,
            'Heart failure (I50.*) present',
            'No MRA in active medications',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (EPHESUS Trial)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'K+>=5.5', 'eGFR<30', 'MRA allergy'],
        },
      });
    }
  }

  // CAD-ELECTROLYTE: Electrolyte Monitoring Post-MI on Diuretic
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE B
  const DIURETIC_CODES_ELEC = ['4603', '1808', '38413', '5487'];
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onDiureticElec = medCodes.some(c => DIURETIC_CODES_ELEC.includes(c));
    if (onDiureticElec && labValues['potassium'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider potassium monitoring for post-MI patient on diuretic',
        target: 'Serum potassium level documented',
        recommendations: {
          action: 'Consider serum potassium and electrolyte monitoring in post-MI patient on diuretics',
          guideline: '2022 AHA/ACC/HFSA HF Guideline',
          note: 'Recommended for review: diuretic-induced hypokalemia increases arrhythmia risk post-MI',
        },
        evidence: {
          triggerCriteria: [
            'Acute MI (I21.*)',
            'On diuretic therapy',
            'No serum potassium in observations',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent electrolyte panel within 7 days'],
        },
      });
    }
  }

  // CAD-ANEMIA: Anemia Screening Post-MI
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['hemoglobin'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider hemoglobin assessment for post-MI patient',
        target: 'Hemoglobin level documented',
        recommendations: {
          action: 'Consider CBC with hemoglobin for post-MI risk assessment per 2022 ACC/AHA Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: anemia worsens myocardial oxygen supply-demand and post-MI outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Acute MI (I21.*)',
            'No hemoglobin in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent CBC within 48 hours'],
        },
      });
    }
  }

  // CAD-THYROID: Thyroid Function in CAD with AFib
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B
  if (hasCAD && hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['tsh'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider thyroid function testing in CAD patient with atrial fibrillation',
        target: 'TSH level documented',
        recommendations: {
          action: 'Consider TSH to evaluate for thyroid-related AF in CAD per 2023 ACC/AHA AF Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'Recommended for review: hyperthyroidism is a reversible cause of AF and worsens CAD outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Atrial fibrillation (I48.*)',
            'No TSH in observations',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known thyroid disease on treatment'],
        },
      });
    }
  }

  // CAD-ACTIVITY: Physical Activity Counseling in CAD
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasRehabCodeAct = dxCodes.some(c => c.startsWith('Z50.0') || c.startsWith('Z71.3'));
    if (!hasRehabCodeAct) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider physical activity counseling for CAD patient',
        target: 'Physical activity counseling or cardiac rehab referral documented',
        recommendations: {
          action: 'Consider structured physical activity counseling (150 min/wk moderate or 75 min/wk vigorous)',
          guideline: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          note: 'Recommended for review: regular physical activity reduces all-cause and CV mortality in CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No physical activity counseling or cardiac rehab encounter documented',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe mobility limitation', 'Unstable angina'],
        },
      });
    }
  }

  // CAD-DIET: Dietary Counseling in CAD with Obesity
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasObesityDiet = dxCodes.some(c => c.startsWith('E66'));
    const hasDietCounsel = dxCodes.some(c => c.startsWith('Z71.3'));
    if (hasObesityDiet && !hasDietCounsel) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider dietary counseling for CAD patient with obesity',
        target: 'Dietary counseling or nutrition referral documented',
        recommendations: {
          action: 'Consider referral for dietary counseling emphasizing Mediterranean or DASH diet pattern',
          guideline: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          note: 'Recommended for review: dietary intervention reduces CV events in CAD with obesity',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Obesity (E66.*)',
            'No dietary counseling (Z71.3) documented',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active eating disorder'],
        },
      });
    }
  }

  // CAD-PSYCHOSOCIAL: Psychosocial Assessment in Elderly CAD
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 2a, LOE B
  if (hasCAD && age > 65 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPsychAssessCad = dxCodes.some(c => c.startsWith('Z13.3') || c.startsWith('Z04.6'));
    if (!hasPsychAssessCad) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider psychosocial assessment for elderly CAD patient',
        target: 'Psychosocial assessment documented',
        recommendations: {
          action: 'Consider psychosocial assessment including depression, anxiety, social isolation, and cognitive screening',
          guideline: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          note: 'Recommended for review: psychosocial factors independently predict adverse CV outcomes in elderly',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `Age: ${age} (>65)`,
            'No psychosocial assessment documented',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active psychiatric treatment documented'],
        },
      });
    }
  }

  // CAD-FAMILY-SCREEN: Premature CAD Family Screening
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 2a, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const prematureCADfam = (gender === 'MALE' && age < 55) || (gender === 'FEMALE' && age < 65);
    if (prematureCADfam) {
      const hasFamilyScreenFam = dxCodes.some(c => c.startsWith('Z82.4') || c.startsWith('Z80.0'));
      if (!hasFamilyScreenFam) {
        gaps.push({
          type: TherapyGapType.SCREENING_DUE,
          module: ModuleType.CORONARY_INTERVENTION,
          status: 'Consider family screening for premature CAD',
          target: 'Family history screening and cascade lipid testing documented',
          recommendations: {
            action: 'Consider familial hypercholesterolemia cascade screening for first-degree relatives',
            guideline: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
            note: 'Recommended for review: premature CAD warrants family screening for FH and early CV prevention',
          },
          evidence: {
            triggerCriteria: [
              'Coronary artery disease (I25.*)',
              `Premature onset: age ${age}, gender ${gender ?? 'unknown'}`,
              'No family screening documented (Z82.4/Z80.0)',
            ],
            guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
            classOfRecommendation: 'Class 2a',
            levelOfEvidence: 'LOE B',
            exclusions: ['Hospice/palliative care (Z51.5)', 'Known FH already documented'],
          },
        });
      }
    }
  }

  // CAD-CALCIUM-SCORE: Coronary Artery Calcium Score for Intermediate Risk
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 2a, LOE B-NR
  const hasHypertensionCAC = dxCodes.some(c => c.startsWith('I10') || c.startsWith('I11'));
  if (!hasCAD && (hasDiabetes || hasHypertensionCAC) && age >= 40 && age <= 75 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCACscore = labValues['cac_score'] !== undefined;
    if (!hasCACscore) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider coronary artery calcium scoring for intermediate-risk patient',
        target: 'CAC score obtained for risk reclassification',
        recommendations: {
          action: 'Consider coronary artery calcium score to refine ASCVD risk assessment per 2019 ACC/AHA Guideline',
          guideline: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          note: 'Recommended for review: CAC score helps reclassify intermediate-risk patients for statin decisions',
        },
        evidence: {
          triggerCriteria: [
            'Intermediate CV risk (diabetes or hypertension present)',
            `Age: ${age} (40-75)`,
            'No established CAD',
            'No CAC score in observations',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known CAD', 'Already on high-intensity statin'],
        },
      });
    }
  }

  // CAD-CRP: CRP Monitoring in CAD on Statin
  // Guideline: 2018 ACC/AHA Cholesterol Guideline (CANTOS Trial), Class 2b, LOE B-R
  const STATIN_CODES_CRP_NEW = ['83367', '301542', '36567', '42463', '861634'];
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onStatinCRPnew = medCodes.some(c => STATIN_CODES_CRP_NEW.includes(c));
    if (onStatinCRPnew && labValues['crp'] === undefined && labValues['hs_crp'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider hs-CRP measurement for residual inflammatory risk in CAD on statin',
        target: 'hs-CRP level documented',
        recommendations: {
          action: 'Consider hs-CRP to assess residual inflammatory risk per CANTOS trial evidence',
          guideline: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
          note: 'Recommended for review: elevated hs-CRP on statin may identify patients benefiting from anti-inflammatory therapy',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On statin therapy',
            'No CRP or hs-CRP in observations',
          ],
          guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol (CANTOS Trial)',
          classOfRecommendation: 'Class 2b',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active infection', 'Autoimmune disease'],
        },
      });
    }
  }

  // CAD-ADVANCE-DIR: Advance Directive Discussion in Severe CAD
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE C
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const lvefAdvDir = labValues['lvef'];
    if (lvefAdvDir !== undefined && lvefAdvDir < 30) {
      const hasAdvDirDoc = dxCodes.some(c => c.startsWith('Z66') || c.startsWith('Z76.89'));
      if (!hasAdvDirDoc) {
        gaps.push({
          type: TherapyGapType.REFERRAL_NEEDED,
          module: ModuleType.CORONARY_INTERVENTION,
          status: 'Consider advance directive discussion for CAD patient with severe LV dysfunction',
          target: 'Advance directive or goals-of-care discussion documented',
          recommendations: {
            action: 'Consider advance directive and goals-of-care discussion per AHA/ACC palliative care guidance',
            guideline: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
            note: 'Recommended for review: patients with LVEF<30% benefit from early advance care planning',
          },
          evidence: {
            triggerCriteria: [
              'Coronary artery disease (I25.*)',
              `LVEF: ${lvefAdvDir}% (<30%)`,
              'No advance directive (Z66) documented',
            ],
            guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
            classOfRecommendation: 'Class 1',
            levelOfEvidence: 'LOE C',
            exclusions: ['Hospice/palliative care already active (Z51.5)', 'Advance directive already documented'],
          },
        });
      }
    }
  }

  // CAD-PALLIATIVE: Palliative Care Referral in Refractory CAD
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE B
  if (hasCAD && age > 80 && hasAnginaNitro && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPalliativeRefCad = dxCodes.some(c => c.startsWith('Z51.5') || c.startsWith('Z51.89'));
    if (!hasPalliativeRefCad) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider palliative care referral for elderly patient with refractory angina',
        target: 'Palliative care consultation documented',
        recommendations: {
          action: 'Consider palliative care referral for symptom management and quality of life in refractory angina',
          guideline: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
          note: 'Recommended for review: palliative care improves symptom burden and quality of life in refractory CV disease',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `Age: ${age} (>80)`,
            'Angina pectoris (I20.*) present',
          ],
          guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; AHA Palliative Care Scientific Statement',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Already receiving palliative care (Z51.5)'],
        },
      });
    }
  }

  // CAD-CARDIAC-CT: Cardiac CT Angiography for Stable Chest Pain
  // Guideline: 2022 ACC/AHA Chest Pain Guideline (SCOT-HEART, PROMISE), Class 1, LOE A
  const hasStableChestPainCT = dxCodes.some(c => c === 'I20.9');
  if (hasStableChestPainCT && !hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCCTAct = labValues['ccta'] !== undefined;
    if (!hasCCTAct) {
      gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider CCTA for evaluation of stable chest pain',
        target: 'Coronary CT angiography or equivalent anatomical assessment completed',
        recommendations: {
          action: 'Consider CCTA as first-line anatomical evaluation for stable chest pain per SCOT-HEART/PROMISE evidence',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: CCTA has high sensitivity for excluding obstructive CAD in stable chest pain',
        },
        evidence: {
          triggerCriteria: [
            'Stable chest pain (I20.9)',
            'No established coronary artery disease',
            'No CCTA in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain (SCOT-HEART, PROMISE)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Contrast allergy', 'Severe renal impairment', 'Known CAD'],
        },
      });
    }
  }

  // CAD-PRASUGREL: Prasugrel in ACS with PCI
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline (TRITON-TIMI 38), Class 1, LOE A
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onPrasugrelACS = medCodes.includes('613391');
    const onTicagrelorPras = medCodes.includes('1116632');
    const hasStrokeHxPras = dxCodes.some(c => c.startsWith('I63') || c.startsWith('G45'));
    if (!onPrasugrelACS && !onTicagrelorPras && !hasStrokeHxPras && age < 75) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider prasugrel for ACS with PCI per TRITON-TIMI 38 evidence',
        target: 'P2Y12 inhibitor selection reviewed for ACS',
        medication: 'Prasugrel',
        recommendations: {
          action: 'Consider prasugrel 10mg daily for ACS patients undergoing PCI per 2021 ACC/AHA/SCAI Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (TRITON-TIMI 38)',
          note: 'Recommended for review: prasugrel reduced CV events vs clopidogrel in ACS-PCI; avoid if prior stroke/TIA or age>=75',
        },
        evidence: {
          triggerCriteria: [
            'Acute coronary syndrome (I21.*)',
            'No prasugrel (RxNorm 613391) in active medications',
            'No ticagrelor in active medications',
            `Age: ${age} (<75)`,
            'No prior stroke/TIA',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (TRITON-TIMI 38)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Prior stroke/TIA', 'Age>=75', 'Body weight <60kg', 'On ticagrelor'],
        },
      });
    }
  }

  // CAD-HEPARIN-BRIDGE: Anticoagulation Bridge Assessment in CAD with AF and Procedure
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (BRIDGE Trial), Class 2a, LOE B
  if (hasCAD && hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPreProcBridge = dxCodes.some(c => c.startsWith('Z01.81') || c.startsWith('Z01.89'));
    if (hasPreProcBridge) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider anticoagulation bridging assessment for CAD+AF patient with upcoming procedure',
        target: 'Bridging anticoagulation plan documented',
        recommendations: {
          action: 'Consider periprocedural anticoagulation management per BRIDGE trial evidence (most patients do NOT need bridging)',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'Recommended for review: BRIDGE trial showed no benefit of bridging in most AF patients',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Atrial fibrillation (I48.*)',
            'Pre-procedural encounter documented',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (BRIDGE Trial)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Mechanical heart valve (requires bridging)'],
        },
      });
    }
  }

  // CAD-SEXUAL-HEALTH: Sexual Health Counseling Post-MI
  // Guideline: 2012 AHA/ACC Scientific Statement on Sexual Activity and CVD, Class 2a, LOE B
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasSexCounsel = dxCodes.some(c => c.startsWith('Z70'));
    if (!hasSexCounsel) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider sexual health counseling for post-MI patient',
        target: 'Sexual activity counseling documented',
        recommendations: {
          action: 'Consider sexual health counseling per 2012 AHA/ACC Scientific Statement on Sexual Activity and CVD',
          guideline: '2012 AHA/ACC Scientific Statement on Sexual Activity and Cardiovascular Disease',
          note: 'Recommended for review: patients can typically resume sexual activity 1 week post-MI if stable',
        },
        evidence: {
          triggerCriteria: [
            'Acute MI (I21.*)',
            'No sexual health counseling (Z70) documented',
          ],
          guidelineSource: '2012 AHA/ACC Scientific Statement on Sexual Activity and Cardiovascular Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Unstable angina', 'Uncompensated HF'],
        },
      });
    }
  }

  // CAD-DRIVING: Post-MI Driving Restriction Documentation
  // Guideline: 2012 ACCF/AHA Stable Ischemic Heart Disease Guideline, Class 1, LOE C
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasDrivingDocMI = dxCodes.some(c => c.startsWith('Z73.6') || c.startsWith('Z02.4'));
    if (!hasDrivingDocMI) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider documenting driving restrictions for post-MI patient',
        target: 'Post-MI driving restriction counseling documented',
        recommendations: {
          action: 'Consider documenting driving restriction counseling (typically 1-2 weeks private, 4-6 weeks commercial post-MI)',
          guideline: '2012 ACCF/AHA Stable Ischemic Heart Disease Guideline',
          note: 'Recommended for review: post-MI patients should be counseled on temporary driving restrictions',
        },
        evidence: {
          triggerCriteria: [
            'Acute MI (I21.*)',
            'No driving restriction documentation (Z73.6/Z02.4)',
          ],
          guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Non-driver'],
        },
      });
    }
  }

  // CAD-LIVER-STATIN: Liver Function Monitoring on Statin in CAD
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 1, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onStatinLiverNew = medCodes.some(c => STATIN_CODES_CRP_NEW.includes(c));
    if (onStatinLiverNew && labValues['alt'] === undefined && labValues['ast'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider liver function monitoring for CAD patient on statin therapy',
        target: 'ALT/AST levels documented',
        recommendations: {
          action: 'Consider hepatic transaminase panel (ALT/AST) for statin safety monitoring per 2018 ACC/AHA Guideline',
          guideline: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
          note: 'Recommended for review: baseline and as-needed liver function testing recommended with statin therapy',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On statin therapy',
            'No ALT or AST in observations',
          ],
          guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known hepatic disease with monitoring plan'],
        },
      });
    }
  }
  // ============================================================
  // FINAL BATCH: 26 CORONARY RULES (CAD-ASPIRIN-PRIMARY through CAD-SLEEP-APNEA-CAD)
  // ============================================================

  // CAD-ASPIRIN-PRIMARY: Aspirin Assessment in CAD
  // Guideline: 2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const ASPIRIN_CODES_CAP = ['1191', '198464'];
    const onAspirinCAP = medCodes.some(c => ASPIRIN_CODES_CAP.includes(c));
    if (!onAspirinCAP) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider aspirin therapy assessment for established CAD',
        target: 'Aspirin initiated or contraindication documented',
        medication: 'Aspirin 81mg',
        recommendations: {
          action: 'Consider low-dose aspirin 81mg daily for secondary prevention in CAD per 2021 ACC/AHA/SCAI Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: aspirin reduces major adverse cardiovascular events in established CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No aspirin (RxNorm 1191/198464) in active medications',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Aspirin allergy (Z88.6)', 'Concurrent OAC therapy'],
        },
      });
    }
  }

  // CAD-BETA-BLOCKER: Beta-Blocker in Stable CAD
  // Guideline: 2012 ACCF/AHA Stable IHD Guideline, Class 2a, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const BB_CODES_SCAD = ['20352', '6918', '19484', '7512']; // carvedilol, metoprolol, bisoprolol, nadolol
    const onBBscad = medCodes.some(c => BB_CODES_SCAD.includes(c));
    if (!onBBscad) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider beta-blocker assessment for stable CAD',
        target: 'Beta-blocker initiated or rationale for deferral documented',
        medication: 'Metoprolol Succinate or Bisoprolol',
        recommendations: {
          action: 'Consider beta-blocker for stable ischemic heart disease per 2012 ACCF/AHA Guideline',
          guideline: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
          note: 'Recommended for review: beta-blockers improve outcomes in stable CAD particularly post-MI',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No beta-blocker in active medications',
          ],
          guidelineSource: '2012 ACCF/AHA/ACP/AATS/PCNA/SCAI/STS Guideline for Stable Ischemic Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe bradycardia', 'Decompensated HF', 'Severe reactive airway disease'],
        },
      });
    }
  }

  // CAD-ACE-STABLE: ACEi in Stable CAD with Hypertension
  // Guideline: 2017 ACC/AHA High BP Guideline + 2012 Stable IHD Guideline, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasHTN = dxCodes.some(c => c.startsWith('I10'));
    const RAAS_CODES_SCAD = ['29046', '3827', '35296', '52175', '69749', '1656339', '83818', '83515'];
    const onRAASscad = medCodes.some(c => RAAS_CODES_SCAD.includes(c));
    if (hasHTN && !onRAASscad) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider ACEi/ARB for stable CAD with hypertension',
        target: 'RAAS inhibitor initiated or contraindication documented',
        medication: 'ACEi or ARB',
        recommendations: {
          action: 'Consider ACEi or ARB for blood pressure management in stable CAD with HTN per ACC/AHA Guidelines',
          guideline: '2017 ACC/AHA High Blood Pressure Guideline + 2012 Stable IHD Guideline',
          note: 'Recommended for review: RAAS inhibition reduces cardiovascular events in CAD with hypertension',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Hypertension (I10)',
            'No ACEi/ARB/ARNi in active medications',
          ],
          guidelineSource: '2017 ACC/AHA High Blood Pressure Guideline + 2012 Stable IHD Guideline',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Angioedema history', 'Pregnancy (O00-O09)', 'Hyperkalemia (K>5.5)'],
        },
      });
    }
  }

  // CAD-NICORANDIL: Nicorandil for Refractory Angina
  // Guideline: 2019 ESC Chronic Coronary Syndromes Guideline, Class 2a, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAngina = dxCodes.some(c => c.startsWith('I20'));
    const onMaxAntianginal = medCodes.some(c => ['6918', '17767', '7417'].includes(c)); // BB + CCB
    const onNicorandil = medCodes.includes('29987');
    if (hasAngina && onMaxAntianginal && !onNicorandil) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider nicorandil for refractory angina on maximal antianginal therapy',
        target: 'Nicorandil reviewed for refractory angina management',
        medication: 'Nicorandil',
        recommendations: {
          action: 'Consider nicorandil as add-on antianginal therapy per 2019 ESC CCS Guideline',
          guideline: '2019 ESC Guideline for Chronic Coronary Syndromes',
          note: 'Recommended for review: nicorandil reduces angina frequency via potassium channel opening and nitrate-like effects',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*) with angina (I20.*)',
            'On maximal first-line antianginal therapy (BB + CCB)',
            'No nicorandil in active medications',
          ],
          guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Concurrent PDE5 inhibitor', 'GI ulceration', 'Hypotension'],
        },
      });
    }
  }

  // CAD-TRIMETAZIDINE: Trimetazidine Consideration
  // Guideline: 2019 ESC CCS Guideline, Class 2b, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAnginaTMZ = dxCodes.some(c => c.startsWith('I20'));
    const hasMetabolicTMZ = dxCodes.some(c => c.startsWith('E11') || c.startsWith('E78'));
    const onTrimetazidine = medCodes.includes('47832');
    if (hasAnginaTMZ && hasMetabolicTMZ && !onTrimetazidine) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider trimetazidine for angina with metabolic comorbidities',
        target: 'Trimetazidine reviewed for metabolic modulation in CAD',
        medication: 'Trimetazidine',
        recommendations: {
          action: 'Consider trimetazidine as metabolic antianginal agent per 2019 ESC CCS Guideline',
          guideline: '2019 ESC Guideline for Chronic Coronary Syndromes',
          note: 'Recommended for review: trimetazidine shifts myocardial metabolism from fatty acid to glucose oxidation, reducing ischemia',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*) with angina (I20.*)',
            'Metabolic comorbidity (diabetes E11 or dyslipidemia E78)',
            'No trimetazidine in active medications',
          ],
          guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes',
          classOfRecommendation: 'Class 2b',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Parkinson disease', 'Severe renal impairment (eGFR<30)', 'Movement disorders'],
        },
      });
    }
  }

  // CAD-CORONARY-CTA-FU: Coronary CTA Follow-Up
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 2a, LOE B-NR
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPriorCTA = dxCodes.some(c => c.startsWith('Z87.39')); // personal history of cardiac procedure proxy
    if (hasPriorCTA && labValues['coronary_cta_months'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider coronary CTA follow-up imaging interval review',
        target: 'Follow-up coronary CTA or alternative imaging scheduled',
        recommendations: {
          action: 'Consider interval coronary CTA follow-up per 2022 ACC/AHA Chest Pain Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: periodic noninvasive imaging reassessment may guide management adjustments in CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Prior cardiac imaging history (Z87.39)',
            'No recent coronary CTA documented in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Contrast allergy', 'Severe renal disease (eGFR<30)', 'Recent catheterization'],
        },
      });
    }
  }

  // CAD-NUCLEAR-STRESS: Nuclear Stress Test Consideration
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasIntermediateRisk = labValues['ascvd_risk'] !== undefined && labValues['ascvd_risk'] >= 7.5 && labValues['ascvd_risk'] < 20;
    const noRecentStress = labValues['stress_test_months'] === undefined;
    if (hasIntermediateRisk && noRecentStress) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider nuclear stress test for intermediate-risk CAD patient',
        target: 'Stress imaging study ordered or alternative assessment documented',
        recommendations: {
          action: 'Consider nuclear stress testing for functional ischemia assessment per 2022 ACC/AHA Chest Pain Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: functional ischemia testing guides revascularization decisions in intermediate-risk patients',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `ASCVD risk: ${labValues['ascvd_risk'] ?? 'N/A'}% (intermediate 7.5-20%)`,
            'No recent stress test documented',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Unable to exercise with no pharmacologic alternative', 'Recent revascularization <90 days'],
        },
      });
    }
  }

  // CAD-CATHETERIZATION: Catheterization Review for High Risk Features
  // Guideline: 2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasHighRiskCAD = labValues['lvef'] !== undefined && labValues['lvef'] < 35;
    const hasAnginaCath = dxCodes.some(c => c.startsWith('I20'));
    if (hasHighRiskCAD && hasAnginaCath) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider cardiac catheterization review for high-risk CAD features',
        target: 'Coronary angiography or interventional evaluation reviewed',
        recommendations: {
          action: 'Consider coronary angiography for CAD with high-risk features (LVEF <35% + angina) per 2021 ACC/AHA/SCAI Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: invasive evaluation may identify revascularization targets in high-risk patients',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `LVEF: ${labValues['lvef'] ?? 'N/A'}% (<35%)`,
            'Angina symptoms (I20.*)',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent catheterization <6 months', 'Severe comorbidities precluding intervention'],
        },
      });
    }
  }

  // CAD-COMPLETE-REVASC: Complete Revascularization Assessment
  // Guideline: 2021 ACC/AHA/SCAI (COMPLETE Trial), Class 2a, LOE B-R
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasMultivessel = dxCodes.some(c => c.startsWith('I25.1')); // multivessel CAD proxy
    const hasPriorPCI = dxCodes.some(c => c.startsWith('Z95.5')); // presence of coronary stent
    if (hasMultivessel && hasPriorPCI) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider complete revascularization assessment for multivessel CAD',
        target: 'Multivessel CAD revascularization strategy reviewed by heart team',
        recommendations: {
          action: 'Consider complete revascularization strategy per COMPLETE trial and 2021 ACC/AHA/SCAI Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (COMPLETE Trial)',
          note: 'Recommended for review: complete revascularization reduced CV death and MI vs culprit-only PCI in STEMI with multivessel CAD',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease with multivessel involvement (I25.1*)',
            'Prior coronary stent (Z95.5)',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (COMPLETE Trial)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive surgical risk', 'Complete revascularization already achieved'],
        },
      });
    }
  }

  // CAD-ISCHEMIA-GUIDED: Ischemia-Guided Therapy Review
  // Guideline: 2021 ACC/AHA/SCAI (ISCHEMIA Trial), Class 2a, LOE B-R
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasStableAnginaISC = dxCodes.some(c => c.startsWith('I25.11') || c.startsWith('I20.8'));
    const hasModerateIschemia = labValues['stress_test_months'] !== undefined; // proxy for stress test done
    if (hasStableAnginaISC && hasModerateIschemia) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider ischemia-guided therapy review per ISCHEMIA trial evidence',
        target: 'Optimal medical therapy vs revascularization strategy reviewed',
        recommendations: {
          action: 'Consider ischemia-guided management approach per ISCHEMIA trial and 2021 ACC/AHA/SCAI Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (ISCHEMIA Trial)',
          note: 'Recommended for review: ISCHEMIA trial showed initial conservative strategy was non-inferior to routine invasive strategy for stable CAD',
        },
        evidence: {
          triggerCriteria: [
            'Stable coronary artery disease (I25.11/I20.8)',
            'Prior stress test documented',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (ISCHEMIA Trial)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Left main disease', 'LVEF <35%', 'Unacceptable angina on OMT'],
        },
      });
    }
  }

  // CAD-MINOCA: MINOCA Workup
  // Guideline: 2022 ACC/AHA Chest Pain Guideline + AHA MINOCA Scientific Statement, Class 1, LOE B-NR
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasMI = dxCodes.some(c => c.startsWith('I21'));
    const hasMINOCA = dxCodes.some(c => c.startsWith('I24'));
    if (hasMI && hasMINOCA) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider MINOCA comprehensive workup for MI with non-obstructive coronaries',
        target: 'MINOCA diagnostic evaluation (CMR, provocation testing) reviewed',
        recommendations: {
          action: 'Consider cardiac MRI and vasospasm provocation testing per AHA MINOCA Scientific Statement',
          guideline: '2022 ACC/AHA Chest Pain Guideline; AHA MINOCA Scientific Statement',
          note: 'Recommended for review: MINOCA requires etiologic workup including CMR, vasospasm testing, and thrombophilia screening',
        },
        evidence: {
          triggerCriteria: [
            'Myocardial infarction (I21.*)',
            'Non-obstructive coronary disease (I24.*)',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for Evaluation and Diagnosis of Chest Pain; AHA MINOCA Scientific Statement',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'MINOCA workup already completed', 'Obstructive CAD confirmed'],
        },
      });
    }
  }

  // CAD-SCAD: Spontaneous Coronary Artery Dissection Evaluation
  // Guideline: 2018 AHA Scientific Statement on SCAD, Class 1, LOE C-LD
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasMIscad = dxCodes.some(c => c.startsWith('I21'));
    const isYoungFemale = gender === 'FEMALE' && age < 55;
    const noAtherosclerosis = !dxCodes.some(c => c.startsWith('I25.1'));
    if (hasMIscad && isYoungFemale && noAtherosclerosis) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider SCAD evaluation for young female MI without atherosclerotic CAD',
        target: 'SCAD-specific evaluation and FMD screening reviewed',
        recommendations: {
          action: 'Consider SCAD-specific workup including FMD screening per 2018 AHA Scientific Statement on SCAD',
          guideline: '2018 AHA Scientific Statement on Spontaneous Coronary Artery Dissection',
          note: 'Recommended for review: SCAD is the leading cause of MI in young women; requires distinct management from atherosclerotic ACS',
        },
        evidence: {
          triggerCriteria: [
            'Myocardial infarction (I21.*)',
            `Female patient, age ${age} (<55)`,
            'No atherosclerotic coronary disease (I25.1)',
          ],
          guidelineSource: '2018 AHA Scientific Statement on Spontaneous Coronary Artery Dissection',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C-LD',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known atherosclerotic CAD', 'SCAD diagnosis already established'],
        },
      });
    }
  }

  // CAD-TAKOTSUBO: Takotsubo Follow-Up
  // Guideline: 2018 ESC Position Statement on Takotsubo, Expert Consensus, LOE C
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasTakotsubo = dxCodes.some(c => c.startsWith('I51.81'));
    if (hasTakotsubo) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider Takotsubo syndrome follow-up and recovery monitoring',
        target: 'Follow-up echocardiogram and functional assessment scheduled',
        recommendations: {
          action: 'Consider serial echocardiography and stress testing follow-up per 2018 ESC Takotsubo Position Statement',
          guideline: '2018 ESC Position Statement on Takotsubo Syndrome',
          note: 'Recommended for review: Takotsubo carries ~5% annual recurrence rate; LV function recovery monitoring is essential',
        },
        evidence: {
          triggerCriteria: [
            'Takotsubo syndrome (I51.81)',
          ],
          guidelineSource: '2018 ESC Position Statement on Takotsubo Syndrome',
          classOfRecommendation: 'Expert Consensus',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Full LV recovery confirmed on recent echo', 'Alternative diagnosis established'],
        },
      });
    }
  }

  // CAD-VASOSPASTIC: Vasospastic Angina Evaluation
  // Guideline: 2019 ESC CCS Guideline + JCS Vasospastic Angina Guideline, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasVasospasm = dxCodes.some(c => c.startsWith('I20.1'));
    const CCB_CODES_VASOSP = ['17767', '7417', '33910']; // nifedipine, amlodipine, diltiazem
    const onCCBvasosp = medCodes.some(c => CCB_CODES_VASOSP.includes(c));
    if (hasVasospasm && !onCCBvasosp) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider calcium channel blocker for vasospastic angina',
        target: 'CCB initiated or alternative vasodilator reviewed',
        medication: 'Diltiazem or Nifedipine',
        recommendations: {
          action: 'Consider CCB (diltiazem or nifedipine) for vasospastic angina per 2019 ESC CCS Guideline',
          guideline: '2019 ESC Guideline for Chronic Coronary Syndromes; JCS 2013 Vasospastic Angina Guideline',
          note: 'Recommended for review: CCBs are first-line therapy for coronary vasospasm; beta-blockers may worsen vasospasm',
        },
        evidence: {
          triggerCriteria: [
            'Vasospastic angina (I20.1)',
            'No calcium channel blocker in active medications',
          ],
          guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes; JCS 2013 Vasospastic Angina Guideline',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Severe hypotension', 'CCB allergy', 'Severe LV dysfunction with hemodynamic compromise'],
        },
      });
    }
  }

  // CAD-MICROVASCULAR: Microvascular Disease Assessment
  // Guideline: 2019 ESC CCS Guideline, COVADIS Criteria, Class 2a, LOE B-NR
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAnginaMVD = dxCodes.some(c => c.startsWith('I20'));
    const hasNormalCoronaries = dxCodes.some(c => c.startsWith('I25.5')); // ischemic CM proxy
    const noObstructiveCAD = !dxCodes.some(c => c.startsWith('I25.1'));
    if (hasAnginaMVD && (hasNormalCoronaries || noObstructiveCAD) && age > 40) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider microvascular disease assessment for angina with non-obstructive coronaries',
        target: 'Coronary microvascular function testing reviewed',
        recommendations: {
          action: 'Consider coronary microvascular function assessment (CFR/IMR testing) per 2019 ESC CCS Guideline and COVADIS criteria',
          guideline: '2019 ESC Guideline for Chronic Coronary Syndromes; COVADIS Criteria',
          note: 'Recommended for review: up to 50% of angina patients have non-obstructive CAD; microvascular dysfunction is a treatable cause',
        },
        evidence: {
          triggerCriteria: [
            'Angina symptoms (I20.*)',
            'No obstructive coronary disease (I25.1)',
            `Age: ${age} (>40)`,
          ],
          guidelineSource: '2019 ESC Guideline for Chronic Coronary Syndromes; COVADIS Criteria',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known obstructive CAD', 'Non-cardiac chest pain confirmed'],
        },
      });
    }
  }

  // CAD-CARDIAC-TRANSPLANT-CAD: Cardiac Allograft Vasculopathy
  // Guideline: ISHLT 2010 Guideline on Cardiac Allograft Vasculopathy, Class 1, LOE C
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasTransplant = dxCodes.some(c => c.startsWith('Z94.1')); // heart transplant status
    if (hasTransplant && hasCAD) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider cardiac allograft vasculopathy (CAV) surveillance in heart transplant recipient',
        target: 'Annual coronary angiography or dobutamine stress echo reviewed',
        recommendations: {
          action: 'Consider annual CAV surveillance per ISHLT Guidelines for heart transplant recipients with CAD',
          guideline: 'ISHLT 2010 Guideline on Cardiac Allograft Vasculopathy',
          note: 'Recommended for review: CAV is the leading cause of late graft failure; annual surveillance improves outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Heart transplant recipient (Z94.1)',
            'Coronary artery disease (I25.*)',
          ],
          guidelineSource: 'ISHLT 2010 Guideline on Cardiac Allograft Vasculopathy',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Graft failure with planned retransplant', 'Recent angiography <6 months'],
        },
      });
    }
  }

  // CAD-LIPID-PANEL-FU: Lipid Panel Follow-Up
  // Guideline: 2018 ACC/AHA Cholesterol Guideline, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_LPF = ['83367', '301542', '36567', '42463', '861634'];
    const onStatinLPF = medCodes.some(c => STATIN_CODES_LPF.includes(c));
    if (onStatinLPF && labValues['ldl'] === undefined && labValues['total_cholesterol'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider lipid panel follow-up for CAD patient on statin therapy',
        target: 'Fasting lipid panel obtained and LDL-C response assessed',
        recommendations: {
          action: 'Consider fasting lipid panel to assess LDL-C response to statin per 2018 ACC/AHA Cholesterol Guideline',
          guideline: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
          note: 'Recommended for review: repeat lipid panel 4-12 weeks after statin initiation, then periodically to confirm LDL-C <70 mg/dL',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'On statin therapy',
            'No recent LDL or total cholesterol in observations',
          ],
          guidelineSource: '2018 ACC/AHA Guideline on the Management of Blood Cholesterol',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent lipid panel <4 weeks', 'Statin intolerance documented'],
        },
      });
    }
  }

  // CAD-GLUCOSE-SCREEN: Glucose Screening in CAD
  // Guideline: 2019 ACC/AHA Primary Prevention Guideline, Class 1, LOE B
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const noDiabetesGS = !dxCodes.some(c => c.startsWith('E11') || c.startsWith('E10'));
    if (noDiabetesGS && labValues['hba1c'] === undefined && labValues['fasting_glucose'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider glucose screening for CAD patient without known diabetes',
        target: 'HbA1c or fasting glucose obtained',
        recommendations: {
          action: 'Consider HbA1c or fasting glucose screening per 2019 ACC/AHA Primary Prevention Guideline',
          guideline: '2019 ACC/AHA Guideline on Primary Prevention of Cardiovascular Disease',
          note: 'Recommended for review: undiagnosed diabetes or prediabetes is common in CAD and affects management',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'No diabetes diagnosis (E10/E11)',
            'No HbA1c or fasting glucose in observations',
          ],
          guidelineSource: '2019 ACC/AHA Guideline on Primary Prevention of Cardiovascular Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known diabetes on treatment', 'Recent glucose screening <3 months'],
        },
      });
    }
  }

  // CAD-HEMOGLOBIN-A1C-TARGET: A1c Target Review
  // Guideline: ADA Standards of Care 2024 + 2019 ACC/AHA, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasDM_A1c = dxCodes.some(c => c.startsWith('E11'));
    if (hasDM_A1c && labValues['hba1c'] !== undefined && labValues['hba1c'] > 7.0) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider A1c target review for CAD patient with diabetes and elevated A1c',
        target: 'A1c management plan with cardiovascular-benefit agents reviewed',
        recommendations: {
          action: 'Consider intensifying glucose management with CV-benefit agents (SGLT2i/GLP-1 RA) per ADA 2024 Standards of Care',
          guideline: 'ADA Standards of Care 2024; 2019 ACC/AHA Primary Prevention Guideline',
          note: 'Recommended for review: A1c >7% in CAD+DM warrants review of glycemic agents with proven cardiovascular benefit',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Type 2 diabetes (E11.*)',
            `HbA1c: ${labValues['hba1c'] ?? 'N/A'}% (>7.0%)`,
          ],
          guidelineSource: 'ADA Standards of Care 2024; 2019 ACC/AHA Guideline on Primary Prevention',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Age >80 with frailty (relaxed A1c target)', 'Hypoglycemia unawareness'],
        },
      });
    }
  }

  // CAD-ANTIPLATELET-REVIEW: Antiplatelet Review >1yr Post Event
  // Guideline: 2016 ACC/AHA DAPT Focused Update, Class 2a, LOE B-R
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onDualAntiplatelet = medCodes.includes('1191') && medCodes.some(c => ['32968', '1116632'].includes(c)); // aspirin + clopidogrel/ticagrelor
    const hasPriorMI = dxCodes.some(c => c.startsWith('I25.2')); // old MI
    if (onDualAntiplatelet && hasPriorMI) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider antiplatelet duration review for long-term DAPT post MI',
        target: 'DAPT continuation vs de-escalation assessed per bleeding/ischemic risk',
        recommendations: {
          action: 'Consider DAPT duration review using DAPT score or PRECISE-DAPT per 2016 ACC/AHA Focused Update',
          guideline: '2016 ACC/AHA Guideline Focused Update on Duration of DAPT',
          note: 'Recommended for review: prolonged DAPT >12 months reduces ischemic events but increases bleeding; individualize duration',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Old myocardial infarction (I25.2)',
            'On dual antiplatelet therapy (aspirin + P2Y12 inhibitor)',
          ],
          guidelineSource: '2016 ACC/AHA Guideline Focused Update on Duration of DAPT',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-R',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Recent stent <12 months'],
        },
      });
    }
  }

  // CAD-CHEST-PAIN-PROTOCOL: Chest Pain Protocol Adherence
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasChestPain = dxCodes.some(c => c.startsWith('I20'));
    const hasEDvisit = dxCodes.some(c => c.startsWith('Z76.89') || c.startsWith('R07')); // ED presentation proxy
    if (hasChestPain && hasEDvisit && labValues['troponin'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider chest pain protocol adherence review with troponin assessment',
        target: 'Serial troponin and risk stratification completed per protocol',
        recommendations: {
          action: 'Consider high-sensitivity troponin protocol for chest pain evaluation per 2022 ACC/AHA Chest Pain Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: 0/1-hour or 0/3-hour hs-troponin protocol enables rapid and safe triage of chest pain',
        },
        evidence: {
          triggerCriteria: [
            'Angina/chest pain (I20.*/R07.*)',
            'ED presentation proxy (Z76.89/R07)',
            'No troponin documented in observations',
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Non-cardiac chest pain established', 'Troponin already resulted'],
        },
      });
    }
  }

  // CAD-SECONDARY-PREVENTION: Secondary Prevention Bundle Review
  // Guideline: 2019 ACC/AHA Primary Prevention + AHA/ACC Secondary Prevention, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_SP = ['83367', '301542', '36567', '42463'];
    const onStatinSP = medCodes.some(c => STATIN_CODES_SP.includes(c));
    const onAspirinSP = medCodes.includes('1191');
    const onBBsp = medCodes.some(c => ['20352', '6918', '19484'].includes(c));
    const bundleDeficit = (!onStatinSP ? 1 : 0) + (!onAspirinSP ? 1 : 0) + (!onBBsp ? 1 : 0);
    if (bundleDeficit >= 2) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider comprehensive secondary prevention bundle review for CAD',
        target: 'Statin + antiplatelet + beta-blocker bundle assessed',
        recommendations: {
          action: 'Consider secondary prevention medication bundle optimization per AHA/ACC guidelines',
          guideline: '2019 ACC/AHA Primary Prevention Guideline; AHA/ACC Secondary Prevention Recommendations',
          note: 'Recommended for review: secondary prevention bundle (statin + antiplatelet + BB) reduces recurrent events by >50%',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            `Secondary prevention deficits: ${bundleDeficit} of 3 core medications missing`,
          ],
          guidelineSource: '2019 ACC/AHA Primary Prevention Guideline; AHA/ACC Secondary Prevention Recommendations',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Documented contraindications to missing agents', 'Active bleeding'],
        },
      });
    }
  }

  // CAD-WOMEN-SPECIFIC: Women-Specific CAD Screening
  // Guideline: 2019 ACC/AHA Primary Prevention + AHA CVD in Women Statement, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const isFemaleOver50 = gender === 'FEMALE' && age > 50;
    const hasRiskFactors = dxCodes.some(c =>
      c.startsWith('I10') || c.startsWith('E78') || c.startsWith('E11') || c.startsWith('F17')
    );
    if (isFemaleOver50 && hasRiskFactors && !hasCAD) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider women-specific CAD risk assessment for female patient with cardiovascular risk factors',
        target: 'Sex-specific CVD risk assessment and screening reviewed',
        recommendations: {
          action: 'Consider women-specific CAD risk assessment including coronary artery calcium scoring per AHA CVD in Women Statement',
          guideline: '2019 ACC/AHA Primary Prevention Guideline; AHA Cardiovascular Disease in Women Scientific Statement',
          note: 'Recommended for review: women have unique CAD presentations and risk factors including preeclampsia history and autoimmune conditions',
        },
        evidence: {
          triggerCriteria: [
            `Female patient, age ${age} (>50)`,
            'Cardiovascular risk factors (HTN, dyslipidemia, DM, or smoking)',
            'No established CAD diagnosis',
          ],
          guidelineSource: '2019 ACC/AHA Primary Prevention Guideline; AHA Cardiovascular Disease in Women Scientific Statement',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known CAD on treatment', 'Recent comprehensive CVD screening'],
        },
      });
    }
  }

  // CAD-YOUNG-MI: Young MI Workup
  // Guideline: 2022 ACC/AHA Chest Pain Guideline, Class 1, LOE C-LD
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAcuteMI = dxCodes.some(c => c.startsWith('I21'));
    if (hasAcuteMI && age < 45) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider extended workup for young MI (age <45) including thrombophilia and substance screening',
        target: 'Young MI workup including hypercoagulability, toxicology, and familial screening reviewed',
        recommendations: {
          action: 'Consider thrombophilia screening, urine toxicology, and familial hypercholesterolemia assessment per ACC/AHA Guideline',
          guideline: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          note: 'Recommended for review: MI in patients <45 warrants evaluation for non-atherosclerotic etiologies',
        },
        evidence: {
          triggerCriteria: [
            'Acute myocardial infarction (I21.*)',
            `Age: ${age} (<45)`,
          ],
          guidelineSource: '2022 ACC/AHA Guideline for the Evaluation and Diagnosis of Chest Pain',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C-LD',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known atherosclerotic CAD', 'Workup already completed'],
        },
      });
    }
  }

  // CAD-EXERCISE-PRESCRIPTION: Exercise Prescription Post-Rehab
  // Guideline: 2021 ACC/AHA/SCAI Guideline, Class 1, LOE A
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCompletedRehab = dxCodes.some(c => c.startsWith('Z50.0')); // rehab status
    if (hasCompletedRehab && labValues['exercise_prescription'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider maintenance exercise prescription for CAD patient post cardiac rehabilitation',
        target: 'Structured exercise maintenance plan documented',
        recommendations: {
          action: 'Consider structured exercise prescription (150 min/wk moderate or 75 min/wk vigorous) per 2021 ACC/AHA Guideline',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: sustained exercise reduces mortality 20-30% in CAD patients post-rehabilitation',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Cardiac rehab completed (Z50.0)',
            'No exercise prescription documented',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Unstable angina', 'Decompensated HF', 'Severe musculoskeletal limitation'],
        },
      });
    }
  }

  // CAD-SLEEP-APNEA-CAD: Sleep Apnea Screening in CAD
  // Guideline: 2019 ACC/AHA Primary Prevention + AHA Sleep Apnea Statement, Class 2a, LOE B-NR
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasObesity = dxCodes.some(c => c.startsWith('E66'));
    const noSleepApnea = !dxCodes.some(c => c.startsWith('G47.3'));
    if (hasObesity && noSleepApnea) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider sleep apnea screening for CAD patient with obesity',
        target: 'Sleep study or screening questionnaire (STOP-BANG) completed',
        recommendations: {
          action: 'Consider polysomnography or home sleep testing for obese CAD patient per AHA Sleep Apnea and CVD Statement',
          guideline: '2019 ACC/AHA Primary Prevention Guideline; AHA Sleep Apnea and CVD Scientific Statement',
          note: 'Recommended for review: OSA prevalence exceeds 60% in CAD patients with obesity; treatment may improve cardiovascular outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Coronary artery disease (I25.*)',
            'Obesity (E66.*)',
            'No sleep apnea diagnosis (G47.3)',
          ],
          guidelineSource: '2019 ACC/AHA Primary Prevention Guideline; AHA Sleep Apnea and CVD Scientific Statement',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known sleep apnea on CPAP', 'Recent sleep study <12 months'],
        },
      });
    }
  }

  // ============================================================
  // NEW EP RULES (EP-EARLY-RHYTHM through EP-AF-CATHETER-TIMING)
  // ============================================================

  // EP-EARLY-RHYTHM: Early Rhythm Control in Newly Diagnosed AF
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (EAST-AFNET 4), Class 2a, LOE B-R
  // AF diagnosed <1 year + no rhythm control medication
  const RHYTHM_CONTROL_CODES_ER = ['4441', '8754', '9947', '703', '135447'];
  const onRhythmControlER = medCodes.some(c => RHYTHM_CONTROL_CODES_ER.includes(c));
  if (
    hasAF &&
    !onRhythmControlER &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider early rhythm control strategy evaluation for atrial fibrillation',
      target: 'Early rhythm control strategy discussed or initiated',
      recommendations: {
        action: 'Consider early rhythm control strategy per EAST-AFNET 4 findings in AF within 1 year of diagnosis',
        guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline (EAST-AFNET 4)',
        note: 'Recommended for review: early rhythm control associated with reduced cardiovascular outcomes',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          'No antiarrhythmic drug on active medication list',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (EAST-AFNET 4)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Permanent AF with adequate rate control', 'Contraindication to antiarrhythmics'],
      },
    });
  }

  // EP-VT-ABLATION: VT Ablation Referral
  // Guideline: 2017 AHA/ACC/HRS VA Guideline (2023 update), Class 1, LOE B-R
  // Ventricular tachycardia (I47.2) + ICD (Z95.810) + recurrent shocks proxy
  const hasVT = dxCodes.some(c => c.startsWith('I47.2'));
  const hasICDvt = dxCodes.some(c => c.startsWith('Z95.810'));
  if (
    hasVT &&
    hasICDvt &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider VT ablation referral for recurrent ventricular tachycardia with ICD shocks',
      target: 'VT ablation candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider referral for VT catheter ablation evaluation per 2017 AHA/ACC/HRS VA Guideline',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: catheter ablation reduces ICD shocks and improves quality of life in recurrent VT',
      },
      evidence: {
        triggerCriteria: [
          'Ventricular tachycardia (I47.2)',
          'Implantable cardioverter-defibrillator (Z95.810)',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent VT ablation within 6 months', 'Reversible cause identified'],
      },
    });
  }

  // EP-SVT-ABLATION: SVT Ablation Referral
  // Guideline: 2015 ACC/AHA/HRS SVT Guideline, Class 1, LOE B-NR
  // Recurrent SVT (I47.1) + on rate/rhythm control agents
  const hasSVT = dxCodes.some(c => c.startsWith('I47.1'));
  const RATE_CONTROL_CODES_SVT = ['6918', '2991', '11170']; // metoprolol, diltiazem, verapamil
  const onRateControlSVT = medCodes.some(c => RATE_CONTROL_CODES_SVT.includes(c));
  if (
    hasSVT &&
    onRateControlSVT &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider catheter ablation referral for recurrent supraventricular tachycardia',
      target: 'SVT ablation candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider referral for SVT catheter ablation per 2015 ACC/AHA/HRS SVT Guideline',
        guideline: '2015 ACC/AHA/HRS SVT Guideline',
        note: 'Recommended for review: ablation has high success rate (>95%) for AVNRT/AVRT and is preferred over long-term drug therapy',
      },
      evidence: {
        triggerCriteria: [
          'Supraventricular tachycardia (I47.1)',
          'Currently on rate/rhythm control medications (proxy for recurrence)',
        ],
        guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with Supraventricular Tachycardia',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent SVT ablation', 'Patient preference for medical management'],
      },
    });
  }

  // EP-BRUGADA: Brugada Syndrome Screening
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE C
  // Syncope (R55) + male + age <45
  if (
    dxCodes.some(c => c.startsWith('R55')) &&
    gender === 'MALE' &&
    age < 45 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider Brugada syndrome screening in young male with unexplained syncope',
      target: 'Brugada screening ECG and/or provocative testing completed',
      recommendations: {
        action: 'Consider ECG evaluation for Brugada pattern in young male with syncope per 2017 AHA/ACC/HRS VA Guideline',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: Brugada syndrome is a leading cause of sudden cardiac death in young males',
      },
      evidence: {
        triggerCriteria: [
          'Syncope (R55)',
          `Gender: ${gender}`,
          `Age: ${age} (<45)`,
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known Brugada diagnosis', 'Vasovagal syncope documented'],
      },
    });
  }

  // EP-ARVC: ARVC Screening
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE B
  // Cardiomyopathy NOS (I42.8) + VT (I47.2) + age <50
  const hasCMnos = dxCodes.some(c => c.startsWith('I42.8'));
  if (
    hasCMnos &&
    hasVT &&
    age < 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider ARVC evaluation in young patient with cardiomyopathy and ventricular tachycardia',
      target: 'Cardiac MRI and genetic testing for ARVC completed',
      recommendations: {
        action: 'Consider cardiac MRI and ARVC genetic testing per 2017 AHA/ACC/HRS VA Guideline',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: ARVC is an important cause of sudden cardiac death in young patients with VT',
      },
      evidence: {
        triggerCriteria: [
          'Cardiomyopathy NOS (I42.8)',
          'Ventricular tachycardia (I47.2)',
          `Age: ${age} (<50)`,
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known ARVC diagnosis', 'Ischemic cardiomyopathy confirmed'],
      },
    });
  }

  // EP-CARDIAC-SARCOID-EP: Cardiac Sarcoid Arrhythmia Screening
  // Guideline: 2023 HRS Expert Consensus on Cardiac Sarcoidosis, Class 1, LOE B-NR
  // Sarcoidosis (D86) + conduction abnormality (I44 or I45)
  const hasSarcoid = dxCodes.some(c => c.startsWith('D86'));
  const hasConductionDisease = dxCodes.some(c => c.startsWith('I44') || c.startsWith('I45'));
  if (
    hasSarcoid &&
    hasConductionDisease &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider cardiac sarcoidosis arrhythmia evaluation',
      target: 'Cardiac MRI, advanced ECG, and EP consultation completed',
      recommendations: {
        action: 'Consider cardiac MRI and EP referral for sarcoidosis with conduction disease per 2023 HRS Expert Consensus',
        guideline: '2023 HRS Expert Consensus on Cardiac Sarcoidosis',
        note: 'Recommended for review: cardiac sarcoidosis with conduction disease carries high arrhythmia and sudden death risk',
      },
      evidence: {
        triggerCriteria: [
          'Sarcoidosis diagnosis (D86.*)',
          'Conduction abnormality (I44.* or I45.*)',
        ],
        guidelineSource: '2023 HRS Expert Consensus Statement on Evaluation and Management of Arrhythmic Risk in Cardiac Sarcoidosis',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD for cardiac sarcoidosis', 'Benign isolated RBBB'],
      },
    });
  }

  // EP-PACEMAKER-UPGRADE: Pacemaker to CRT Upgrade Evaluation
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 2a, LOE B
  // Existing pacemaker (Z95.0) + LVEF <35%
  const hasPacemakerUpgrade = dxCodes.some(c => c.startsWith('Z95.0'));
  if (
    hasPacemakerUpgrade &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 35 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider pacemaker upgrade to CRT evaluation',
      target: 'CRT upgrade candidacy evaluated by EP specialist',
      recommendations: {
        action: 'Consider upgrade from pacemaker to CRT for patient with LVEF <35% per 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review: patients with high RV pacing burden and reduced LVEF may benefit from CRT upgrade',
      },
      evidence: {
        triggerCriteria: [
          'Pacemaker in situ (Z95.0)',
          `LVEF: ${labValues['lvef']}% (<35%)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing CRT device', 'Life expectancy <1 year'],
      },
    });
  }

  // EP-AF-STROKE-RISK: CHA2DS2-VASc Formal Documentation
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B
  // AF without documented CHA2DS2-VASc score
  if (
    hasAF &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // Proxy: AF patient without OAC and without documented score = likely undocumented
    const DOAC_CODES_STROKE = ['1364430', '1232082', '1114195', '1549682']; // apixaban, rivaroxaban, dabigatran, edoxaban
    const WARFARIN_CODES_STROKE = ['11289'];
    const onAnticoagStroke = medCodes.some(c =>
      DOAC_CODES_STROKE.includes(c) || WARFARIN_CODES_STROKE.includes(c)
    );
    if (!onAnticoagStroke) {
      gaps.push({
        type: TherapyGapType.DOCUMENTATION_GAP,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider formal CHA2DS2-VASc score documentation for AF stroke risk stratification',
        target: 'CHA2DS2-VASc score calculated and anticoagulation decision documented',
        recommendations: {
          action: 'Consider documenting CHA2DS2-VASc score and anticoagulation decision per 2023 ACC/AHA/ACCP/HRS AF Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'Recommended for review: formal stroke risk documentation ensures guideline-concordant anticoagulation decisions',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            'No oral anticoagulant on active medication list',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Documented low CHA2DS2-VASc with rationale', 'Anticoagulation contraindicated'],
        },
      });
    }
  }

  // EP-CARDIOVERSION-TIMING: Cardioversion Timing Assessment
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B-NR
  // AF <48h onset = eligible for direct cardioversion without prolonged anticoag
  if (
    hasAF &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider cardioversion timing assessment for atrial fibrillation',
      target: 'AF onset duration documented and cardioversion eligibility determined',
      recommendations: {
        action: 'Consider documenting AF onset duration to determine cardioversion eligibility per 2023 ACC/AHA/ACCP/HRS AF Guideline',
        guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
        note: 'Recommended for review: AF <48h may be eligible for direct cardioversion; AF >48h requires anticoagulation or TEE',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already in sinus rhythm', 'Permanent AF documented'],
      },
    });
  }

  // EP-TEE-PRE-CV: TEE Before Cardioversion
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B
  // AF >48h + not on adequate anticoagulation (no OAC)
  if (
    hasAF &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const DOAC_CODES_TEE = ['1364430', '1232082', '1114195', '1549682'];
    const WARFARIN_CODES_TEE = ['11289'];
    const onAnticoagTEE = medCodes.some(c =>
      DOAC_CODES_TEE.includes(c) || WARFARIN_CODES_TEE.includes(c)
    );
    if (!onAnticoagTEE) {
      gaps.push({
        type: TherapyGapType.PROCEDURE_INDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider TEE before cardioversion in AF without adequate anticoagulation',
        target: 'TEE performed or 3+ weeks anticoagulation documented before cardioversion',
        recommendations: {
          action: 'Consider TEE to rule out LAA thrombus before cardioversion if inadequate anticoagulation per 2023 ACC/AHA/ACCP/HRS AF Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'Recommended for review: cardioversion without adequate anticoagulation or TEE carries significant stroke risk',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            'No oral anticoagulant on active medication list',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Already on therapeutic anticoagulation >3 weeks', 'Cardioversion not planned'],
        },
      });
    }
  }

  // EP-CIED-MRI: MRI-Conditional CIED Documentation
  // Guideline: 2017 HRS Expert Consensus on MRI and CIEDs, Class 1, LOE B
  // CIED (Z95.0) + no MRI-conditional documentation
  if (
    dxCodes.some(c => c.startsWith('Z95.0')) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider MRI-conditional status documentation for cardiac implantable device',
      target: 'CIED MRI-conditional status documented in medical record',
      recommendations: {
        action: 'Consider documenting MRI-conditional status for CIED per 2017 HRS Expert Consensus',
        guideline: '2017 HRS Expert Consensus on MRI and CIEDs',
        note: 'Recommended for review: MRI-conditional documentation prevents delays when MRI is clinically needed',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac implantable electronic device (Z95.0)',
        ],
        guidelineSource: '2017 HRS Expert Consensus Statement on MRI and Radiation Exposure in Patients with CIEDs',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'MRI-conditional status already documented', 'Legacy non-MRI-conditional device documented'],
      },
    });
  }

  // EP-GENERATOR-REPLACEMENT: Generator Replacement Planning
  // Guideline: 2023 HRS Expert Consensus on CIED Lead Management, Class 1, LOE C
  // CIED (Z95.0 or Z95.810) + age >70 (proxy for aging device)
  const hasCIEDgen = dxCodes.some(c => c.startsWith('Z95.0') || c.startsWith('Z95.810'));
  if (
    hasCIEDgen &&
    age > 70 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider generator replacement planning review for aging CIED patient',
      target: 'Battery status assessed and replacement timeline documented',
      recommendations: {
        action: 'Consider proactive generator replacement planning per 2023 HRS Expert Consensus on CIED Management',
        guideline: '2023 HRS Expert Consensus on CIED Lead Management',
        note: 'Recommended for review: proactive replacement planning prevents emergent generator changes and lapses in therapy',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac implantable electronic device (Z95.0 or Z95.810)',
          `Age: ${age} (>70, proxy for aging device)`,
        ],
        guidelineSource: '2023 HRS Expert Consensus Statement on CIED Lead Management and Generator Replacement',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent generator replacement within 5 years', 'Device deactivation documented'],
      },
    });
  }

  // EP-INAPPROPRIATE-SHOCKS: ICD Inappropriate Shock Workup
  // Guideline: 2023 HRS Expert Consensus on ICD Programming (MADIT-RIT), Class 1, LOE B
  // ICD (Z95.810) + AF (I48) = risk for inappropriate shocks
  if (
    dxCodes.some(c => c.startsWith('Z95.810')) &&
    hasAF &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SAFETY_ALERT,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider ICD programming review for inappropriate shock prevention in AF patient',
      target: 'ICD programming optimized with SVT discriminators and rate control assessed',
      recommendations: {
        action: 'Consider ICD programming review with SVT discriminators per 2023 HRS Expert Consensus (MADIT-RIT)',
        guideline: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT)',
        note: 'Recommended for review: AF is the leading cause of inappropriate ICD shocks; programming optimization reduces risk',
      },
      evidence: {
        triggerCriteria: [
          'Implantable cardioverter-defibrillator (Z95.810)',
          'Atrial fibrillation (I48.*)',
        ],
        guidelineSource: '2023 HRS Expert Consensus on ICD Programming (MADIT-RIT)',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent ICD programming optimization', 'ICD deactivation documented'],
      },
    });
  }

  // EP-EXERCISE-EP: Exercise Testing for Exercise-Induced Arrhythmia
  // Guideline: 2015 ACC/AHA/HRS SVT Guideline, Class 2a, LOE B
  // Exercise-induced arrhythmia (I47) + no exercise test documented
  const hasExerciseArrhythmia = dxCodes.some(c => c.startsWith('I47'));
  if (
    hasExerciseArrhythmia &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider exercise stress testing for arrhythmia characterization',
      target: 'Exercise stress test with arrhythmia monitoring completed',
      recommendations: {
        action: 'Consider exercise stress testing for arrhythmia provocation and characterization per 2015 ACC/AHA/HRS SVT Guideline',
        guideline: '2015 ACC/AHA/HRS SVT Guideline',
        note: 'Recommended for review: exercise testing can reproduce arrhythmia, guide diagnosis, and assess treatment efficacy',
      },
      evidence: {
        triggerCriteria: [
          'Paroxysmal tachycardia diagnosis (I47.*)',
        ],
        guidelineSource: '2015 ACC/AHA/HRS Guideline for the Management of Adult Patients with SVT',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent exercise test on file', 'Exercise contraindicated (severe AS, acute illness)'],
      },
    });
  }

  // EP-AF-CATHETER-TIMING: AF Ablation Timing Optimization
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (EAST-AFNET 4, EARLY-AF), Class 2a, LOE B-R
  // AF + on AAD (proxy for drug-refractory) + no prior ablation
  const AAD_CODES_TIMING = ['4441', '8754', '9947', '703', '135447'];
  const onAADtiming = medCodes.some(c => AAD_CODES_TIMING.includes(c));
  if (
    hasAF &&
    onAADtiming &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider catheter ablation timing optimization for AF on antiarrhythmic therapy',
      target: 'AF ablation candidacy and timing evaluated by EP specialist',
      recommendations: {
        action: 'Consider early catheter ablation referral for AF on AAD per 2023 ACC/AHA/ACCP/HRS AF Guideline (EARLY-AF)',
        guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline (EAST-AFNET 4, EARLY-AF)',
        note: 'Recommended for review: earlier ablation may improve long-term rhythm control outcomes vs prolonged AAD therapy',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          'Currently on antiarrhythmic drug therapy',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (EAST-AFNET 4, EARLY-AF)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent ablation within 12 months', 'Long-standing persistent AF >3 years'],
      },
    });
  }

  // ============================================================
  // FINAL BATCH: 3 EP RULES (EP-PILL-IN-POCKET through EP-ANTICOAG-SCORE-REASSESS)
  // ============================================================

  // EP-PILL-IN-POCKET: Pill-in-Pocket Strategy for Paroxysmal AF
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 2a, LOE B
  if (hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasParoxysmalAF = dxCodes.some(c => c.startsWith('I48.0'));
    const noStructuralHD = !dxCodes.some(c => c.startsWith('I42') || c.startsWith('I50'));
    const AAD_CODES_PIP = ['4441', '8754']; // flecainide, propafenone
    const onAADpip = medCodes.some(c => AAD_CODES_PIP.includes(c));
    if (hasParoxysmalAF && noStructuralHD && !onAADpip) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider pill-in-pocket strategy for paroxysmal AF without structural heart disease',
        target: 'Pill-in-pocket flecainide or propafenone reviewed with EP',
        medication: 'Flecainide or Propafenone (PRN)',
        recommendations: {
          action: 'Consider pill-in-pocket flecainide/propafenone for infrequent paroxysmal AF per 2023 ACC/AHA/ACCP/HRS Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          note: 'Recommended for review: pill-in-pocket approach suitable for hemodynamically stable patients with infrequent, symptomatic episodes',
        },
        evidence: {
          triggerCriteria: [
            'Paroxysmal atrial fibrillation (I48.0)',
            'No structural heart disease (I42/I50)',
            'No standing antiarrhythmic drug therapy',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Structural heart disease', 'Bundle branch block', 'Known coronary artery disease'],
        },
      });
    }
  }

  // EP-LEFT-ATRIAL-SIZE: Left Atrial Size Documentation
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B
  if (hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['la_diameter'] === undefined && labValues['la_volume_index'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider left atrial size documentation for AF management planning',
        target: 'LA volume index or LA diameter documented via echocardiography',
        recommendations: {
          action: 'Consider echocardiographic LA size assessment for AF rhythm strategy planning per 2023 ACC/AHA/ACCP/HRS Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          note: 'Recommended for review: LA size impacts ablation candidacy, success rates, and rhythm vs rate control decision',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation (I48.*)',
            'No LA diameter or LA volume index in observations',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echocardiogram <6 months', 'Rate-controlled permanent AF'],
        },
      });
    }
  }

  // EP-ANTICOAG-SCORE-REASSESS: Annual CHA2DS2-VASc Reassessment
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline, Class 1, LOE B
  if (hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const OAC_CODES_REASSESS = ['11289', '1364430', '1114195', '1037045', '1599538'];
    const onOACreassess = medCodes.some(c => OAC_CODES_REASSESS.includes(c));
    if (onOACreassess && labValues['cha2ds2_vasc_date'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Consider annual CHA2DS2-VASc score reassessment for AF patient on anticoagulation',
        target: 'CHA2DS2-VASc score recalculated and anticoagulation appropriateness reviewed',
        recommendations: {
          action: 'Consider annual reassessment of CHA2DS2-VASc and HAS-BLED scores per 2023 ACC/AHA/ACCP/HRS Guideline',
          guideline: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          note: 'Recommended for review: stroke and bleeding risk evolve over time; annual reassessment ensures ongoing OAC appropriateness',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation (I48.*)',
            'On oral anticoagulation therapy',
            'No recent CHA2DS2-VASc reassessment documented',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Mechanical valve (separate indication)', 'Recent score calculation <6 months'],
        },
      });
    }
  }

  // ============================================================
  // NEW HF RULES (HF-ARNI-SWITCH through HF-IRON-IV-MONITORING)
  // ============================================================

  // HF-ARNI-SWITCH: ACEi/ARB to ARNi Switch Evaluation
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline (PARADIGM-HF), Class 1, LOE A
  // HFrEF + on ACEi/ARB + LVEF <=40 + not on ARNi
  const ACEI_CODES = ['3827', '29046', '1998', '35296', '50166']; // lisinopril, enalapril, captopril, ramipril, benazepril
  const ARB_CODES = ['83818', '83515', '52175', '73494']; // losartan, valsartan, irbesartan, candesartan
  const ARNI_CODES = ['1656328']; // sacubitril/valsartan
  const onACEiARB = medCodes.some(c => ACEI_CODES.includes(c) || ARB_CODES.includes(c));
  const onARNI = medCodes.some(c => ARNI_CODES.includes(c));
  if (
    hasHF &&
    onACEiARB &&
    !onARNI &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 40 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider ACEi/ARB to ARNi switch evaluation for HFrEF',
      target: 'ARNi therapy initiated or contraindication documented',
      medication: 'Sacubitril/Valsartan',
      recommendations: {
        action: 'Consider switching ACEi/ARB to sacubitril/valsartan per 2022 AHA/ACC/HFSA HF Guideline (PARADIGM-HF)',
        guideline: '2022 AHA/ACC/HFSA HF Guideline (PARADIGM-HF)',
        note: 'Recommended for review: ARNi reduces HF hospitalization and cardiovascular mortality vs ACEi/ARB in HFrEF',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `LVEF: ${labValues['lvef']}% (<=40%)`,
          'Currently on ACEi or ARB but not ARNi',
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (PARADIGM-HF)',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'History of angioedema', 'SBP <100 mmHg', 'Severe renal impairment (eGFR <30)'],
      },
    });
  }

  // HF-THIAMINE: Thiamine Supplementation on Loop Diuretics
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; DiNicolantonio 2013, Class 2b, LOE C
  // HF + on loop diuretic + malnutrition or low BMI proxy
  const LOOP_DIURETIC_CODES_TH = ['4603', '4109']; // furosemide, bumetanide
  const onLoopTH = medCodes.some(c => LOOP_DIURETIC_CODES_TH.includes(c));
  const hasMalnutrition = dxCodes.some(c => c.startsWith('E44') || c.startsWith('E46') || c.startsWith('R63.4'));
  if (
    hasHF &&
    onLoopTH &&
    hasMalnutrition &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider thiamine supplementation for HF patient on loop diuretics with malnutrition',
      target: 'Thiamine level checked or empiric supplementation initiated',
      medication: 'Thiamine',
      recommendations: {
        action: 'Consider thiamine assessment in HF patient on chronic loop diuretics with nutritional deficiency',
        guideline: '2022 AHA/ACC/HFSA HF Guideline; DiNicolantonio systematic review',
        note: 'Recommended for review: loop diuretics deplete thiamine; deficiency may worsen HF symptoms',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          'Loop diuretic on active medication list',
          'Malnutrition or weight loss documented (E44/E46/R63.4)',
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; Systematic Review (DiNicolantonio 2013)',
        classOfRecommendation: 'Class 2b',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already on thiamine supplementation', 'Normal thiamine level documented'],
      },
    });
  }

  // HF-K-MONITOR: Potassium Monitoring on MRA
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE B
  // HF + on MRA + no recent potassium lab
  const MRA_CODES_K = ['9947', '37801']; // spironolactone (using sotalol proxy), eplerenone
  const onMRA_K = medCodes.some(c => MRA_CODES_K.includes(c));
  if (
    hasHF &&
    onMRA_K &&
    labValues['potassium'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider potassium monitoring for HF patient on mineralocorticoid receptor antagonist',
      target: 'Serum potassium level obtained and renal function assessed',
      recommendations: {
        action: 'Consider serum potassium and creatinine monitoring per 2022 AHA/ACC/HFSA HF Guideline for patient on MRA',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review: MRA therapy requires regular potassium monitoring to prevent hyperkalemia',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          'Mineralocorticoid receptor antagonist on active medication list',
          'No recent serum potassium value available',
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Potassium checked within 30 days', 'MRA recently discontinued'],
      },
    });
  }

  // HF-ADVANCE-CARE: Advance Care Planning in Advanced HF
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE C
  // LVEF <25% + age >75
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 25 &&
    age > 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider advance care planning discussion for advanced heart failure',
      target: 'Advance directive and goals-of-care documented',
      recommendations: {
        action: 'Consider advance care planning and goals-of-care discussion per 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review: patients with advanced HF and significant age benefit from shared decision-making about care goals',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `LVEF: ${labValues['lvef']}% (<25%)`,
          `Age: ${age} (>75)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Advance directive already documented', 'Palliative care consult completed'],
      },
    });
  }

  // HF-LVNC: LV Non-Compaction Screening
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline; 2019 ESC Position Statement on LVNC, Class 2a, LOE C
  // Cardiomyopathy NOS (I42.8) + young (<45) + LVEF <45%
  if (
    dxCodes.some(c => c.startsWith('I42.8')) &&
    age < 45 &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 45 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider LV non-compaction evaluation in young patient with unexplained cardiomyopathy',
      target: 'Cardiac MRI with LVNC assessment and genetic testing considered',
      recommendations: {
        action: 'Consider cardiac MRI for LVNC evaluation per 2019 ESC Position Statement and 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline; 2019 ESC Position Statement on LVNC',
        note: 'Recommended for review: LVNC is underdiagnosed in young patients with unexplained cardiomyopathy',
      },
      evidence: {
        triggerCriteria: [
          'Cardiomyopathy NOS (I42.8)',
          `Age: ${age} (<45)`,
          `LVEF: ${labValues['lvef']}% (<45%)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure; 2019 ESC Position Statement on LVNC',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known LVNC diagnosis', 'Ischemic cardiomyopathy confirmed'],
      },
    });
  }

  // HF-HEMODYNAMIC: Hemodynamic Monitoring Review
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline (CHAMPION Trial), Class 2b, LOE B-R
  // HF + BNP >900 (proxy for congestion/hemodynamic instability)
  if (
    hasHF &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 900 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider hemodynamic assessment review for HF with elevated BNP',
      target: 'Hemodynamic status evaluated and diuretic strategy reviewed',
      recommendations: {
        action: 'Consider hemodynamic review including volume status and filling pressures per 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline (CHAMPION Trial)',
        note: 'Recommended for review: markedly elevated BNP suggests hemodynamic compromise warranting clinical reassessment',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `BNP: ${labValues['bnp']} pg/mL (>900)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (CHAMPION Trial)',
        classOfRecommendation: 'Class 2b',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent hemodynamic assessment within 7 days', 'Acute renal failure (confounding BNP)'],
      },
    });
  }

  // HF-DIURETIC-OPT: Diuretic Dose Optimization
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE B
  // HF + high-dose loop diuretic + signs of congestion (elevated BNP proxy)
  const LOOP_DIURETIC_CODES_OPT = ['4603', '4109']; // furosemide, bumetanide
  const onLoopOpt = medCodes.some(c => LOOP_DIURETIC_CODES_OPT.includes(c));
  if (
    hasHF &&
    onLoopOpt &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 400 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_UNDERDOSED,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider diuretic dose optimization for persistent congestion in HF',
      target: 'Diuretic regimen reviewed and adjusted based on volume status',
      medication: 'Loop diuretic',
      recommendations: {
        action: 'Consider diuretic dose adjustment or combination diuretic strategy per 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review: persistent congestion on loop diuretics may require dose escalation or thiazide addition',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          'Loop diuretic on active medication list',
          `BNP: ${labValues['bnp']} pg/mL (>400, proxy for persistent congestion)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent diuretic adjustment within 14 days', 'Severe hypotension (SBP <90)'],
      },
    });
  }

  // HF-ANEMIA-HF: Anemia Workup in HF — sex-specific thresholds per WHO 2011 + 2022 AHA/ACC HF
  // Male: Hgb < 13.0 g/dL, Female: Hgb < 12.0 g/dL. Unknown sex: 12.0 (conservative).
  if (hasHF && labValues['hemoglobin'] !== undefined && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const isMaleAnemia = gender?.toUpperCase() === 'MALE' || gender?.toUpperCase() === 'M';
    const anemiaThreshold = isMaleAnemia ? 13.0 : 12.0;
    const sexLabel = isMaleAnemia ? 'male' : (gender?.toUpperCase() === 'FEMALE' || gender?.toUpperCase() === 'F') ? 'female' : 'unknown (using female threshold)';
    if (labValues['hemoglobin'] < anemiaThreshold) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: `Consider anemia workup for HF patient with hemoglobin <${anemiaThreshold} g/dL`,
      target: 'Anemia evaluation completed including iron studies, B12, folate',
      recommendations: {
        action: 'Consider comprehensive anemia evaluation per 2022 AHA/ACC/HFSA HF Guideline',
        guideline: '2022 AHA/ACC/HFSA HF Guideline',
        note: 'Recommended for review: anemia worsens HF outcomes and may have treatable causes (iron deficiency, B12 deficiency)',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `Hemoglobin: ${labValues['hemoglobin']} g/dL (<${anemiaThreshold} — ${sexLabel}, WHO 2011 criteria)`,
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active GI bleeding', 'Anemia workup completed within 90 days'],
      },
    });
    }
  }

  // HF-IRON-IV-MONITORING: IV Iron Therapy Monitoring
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN), Class 2a, LOE B-R
  // HF + on IV iron (proxy: iron deficiency treated) + no follow-up ferritin
  if (
    hasHF &&
    labValues['ferritin'] !== undefined && labValues['ferritin'] < 100 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider IV iron therapy monitoring with follow-up ferritin and TSAT',
      target: 'Follow-up ferritin and TSAT obtained 8-12 weeks after IV iron administration',
      recommendations: {
        action: 'Consider follow-up iron studies after IV iron therapy per 2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF)',
        guideline: '2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN)',
        note: 'Recommended for review: serial monitoring ensures adequate iron repletion and identifies need for repeat dosing',
      },
      evidence: {
        triggerCriteria: [
          'Heart failure diagnosis (I50.*)',
          `Ferritin: ${labValues['ferritin']} ng/mL (<100, iron deficiency present)`,
          'Follow-up ferritin/TSAT may be due after IV iron therapy',
        ],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (AFFIRM-AHF, IRONMAN)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Ferritin >300 (repleted)', 'IV iron not initiated'],
      },
    });
  }

  // ============================================================
  // NEW SH RULES (SH-BICUSPID through SH-CARCINOID)
  // ============================================================

  // SH-BICUSPID: Bicuspid Aortic Valve Surveillance
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Bicuspid aortic valve (Q23.1)
  const hasBicuspid = dxCodes.some(c => c.startsWith('Q23.1'));
  if (
    hasBicuspid &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider echocardiographic surveillance for bicuspid aortic valve',
      target: 'Echocardiogram and aortic imaging completed per surveillance protocol',
      recommendations: {
        action: 'Consider serial echocardiography and aortic imaging for bicuspid aortic valve per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: bicuspid aortic valve requires surveillance for progressive stenosis, regurgitation, and aortopathy',
      },
      evidence: {
        triggerCriteria: [
          'Bicuspid aortic valve (Q23.1)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Echo within 12 months', 'Post-surgical aortic valve replacement'],
      },
    });
  }

  // SH-ROSS: Ross Procedure Candidacy
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2b, LOE C
  // Severe AS (I35.0) + age <50
  if (
    hasAorticStenosis &&
    age < 50 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider Ross procedure candidacy evaluation for young patient with severe AS',
      target: 'Ross procedure or pulmonary autograft candidacy evaluated',
      recommendations: {
        action: 'Consider Ross procedure evaluation for young patient with severe AS per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: Ross procedure avoids lifelong anticoagulation and offers excellent hemodynamics in young patients',
      },
      evidence: {
        triggerCriteria: [
          'Severe aortic stenosis (I35.0)',
          `Age: ${age} (<50)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2b',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Bicuspid aortic valve with aortopathy', 'Connective tissue disorder', 'Prior cardiac surgery'],
      },
    });
  }

  // SH-VALVE-IN-VALVE: Valve-in-Valve TAVR Evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE B-NR
  // Bioprosthetic valve (Z95.2) + new symptoms (R06 dyspnea)
  const hasBioprostheticVIV = dxCodes.some(c => c.startsWith('Z95.2'));
  const hasNewSymptomsVIV = dxCodes.some(c => c.startsWith('R06') || c.startsWith('R00') || c.startsWith('R55'));
  if (
    hasBioprostheticVIV &&
    hasNewSymptomsVIV &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider valve-in-valve TAVR evaluation for symptomatic bioprosthetic valve dysfunction',
      target: 'Valve-in-valve candidacy assessed by structural heart team',
      recommendations: {
        action: 'Consider valve-in-valve TAVR evaluation for failed bioprosthetic valve per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: valve-in-valve TAVR is a less invasive option for degenerated bioprosthetic valves',
      },
      evidence: {
        triggerCriteria: [
          'Bioprosthetic valve in situ (Z95.2)',
          'New symptoms (dyspnea R06, palpitations R00, or syncope R55)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Valve replacement within 2 years', 'Active endocarditis'],
      },
    });
  }

  // SH-ASD: ASD Closure Evaluation
  // Guideline: 2018 AHA/ACC Guideline for Adults with CHD, Class 1, LOE B
  // Atrial septal defect (Q21.1) + RV dilation proxy (right heart failure, I50.810)
  const hasASD = dxCodes.some(c => c.startsWith('Q21.1'));
  const hasRVdilation = dxCodes.some(c => c.startsWith('I50.810') || c.startsWith('I50.81'));
  if (
    hasASD &&
    hasRVdilation &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider ASD closure evaluation for hemodynamically significant atrial septal defect',
      target: 'ASD closure candidacy evaluated by structural heart team',
      recommendations: {
        action: 'Consider percutaneous or surgical ASD closure for ASD with RV volume overload per 2018 AHA/ACC CHD Guideline',
        guideline: '2018 AHA/ACC Guideline for Adults with CHD',
        note: 'Recommended for review: hemodynamically significant ASDs with RV dilation benefit from closure to prevent RV failure',
      },
      evidence: {
        triggerCriteria: [
          'Atrial septal defect (Q21.1)',
          'Right ventricular dilation or right heart failure (I50.81*)',
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Eisenmenger syndrome', 'Severe pulmonary hypertension (irreversible)'],
      },
    });
  }

  // SH-VSD: VSD Closure Evaluation
  // Guideline: 2018 AHA/ACC Guideline for Adults with CHD, Class 1, LOE B
  // Ventricular septal defect (Q21.0)
  const hasVSD = dxCodes.some(c => c.startsWith('Q21.0'));
  if (
    hasVSD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider VSD closure evaluation for ventricular septal defect',
      target: 'VSD closure candidacy assessed by structural heart team',
      recommendations: {
        action: 'Consider hemodynamic evaluation and closure assessment for VSD per 2018 AHA/ACC CHD Guideline',
        guideline: '2018 AHA/ACC Guideline for Adults with CHD',
        note: 'Recommended for review: significant VSDs with LV volume overload or Qp:Qs >1.5 may benefit from closure',
      },
      evidence: {
        triggerCriteria: [
          'Ventricular septal defect (Q21.0)',
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Eisenmenger syndrome', 'Small restrictive VSD with no volume overload'],
      },
    });
  }

  // SH-COARCTATION: Coarctation of Aorta Follow-up
  // Guideline: 2018 AHA/ACC Guideline for Adults with CHD, Class 1, LOE B
  // Coarctation (Q25.1) + HTN (I10)
  const hasCoarctation = dxCodes.some(c => c.startsWith('Q25.1'));
  const hasHTNcoarc = dxCodes.some(c => c.startsWith('I10'));
  if (
    hasCoarctation &&
    hasHTNcoarc &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider coarctation surveillance and hypertension management',
      target: 'Aortic imaging and BP gradient assessment completed',
      recommendations: {
        action: 'Consider aortic imaging and arm-leg BP gradient assessment for coarctation with HTN per 2018 AHA/ACC CHD Guideline',
        guideline: '2018 AHA/ACC Guideline for Adults with CHD',
        note: 'Recommended for review: recoarctation and persistent HTN are common long-term complications requiring surveillance',
      },
      evidence: {
        triggerCriteria: [
          'Coarctation of aorta (Q25.1)',
          'Hypertension (I10)',
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent aortic imaging within 12 months', 'Post-repair with no residual gradient'],
      },
    });
  }

  // SH-FONTAN: Fontan Surveillance
  // Guideline: 2018 AHA/ACC Guideline for Adults with CHD, Class 1, LOE B
  // Single ventricle / Fontan physiology (Q20.4 or Q20.8 or Q20.3)
  const hasFontanPhysiology = dxCodes.some(c =>
    c.startsWith('Q20.4') || c.startsWith('Q20.8') || c.startsWith('Q20.3')
  );
  if (
    hasFontanPhysiology &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider comprehensive Fontan surveillance evaluation',
      target: 'Annual Fontan surveillance labs, imaging, and functional assessment completed',
      recommendations: {
        action: 'Consider annual Fontan surveillance including liver function, protein-losing enteropathy screen, and cardiac imaging per 2018 AHA/ACC CHD Guideline',
        guideline: '2018 AHA/ACC Guideline for Adults with CHD',
        note: 'Recommended for review: Fontan patients require lifelong surveillance for heart failure, arrhythmias, hepatopathy, and PLE',
      },
      evidence: {
        triggerCriteria: [
          'Single ventricle / Fontan physiology (Q20.3, Q20.4, Q20.8)',
        ],
        guidelineSource: '2018 AHA/ACC Guideline for the Management of Adults with Congenital Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Surveillance completed within 12 months', 'Heart transplant recipient'],
      },
    });
  }

  // SH-CARCINOID: Carcinoid Valve Disease Screening
  // Guideline: 2020 ACC/AHA VHD Guideline; ENETS Consensus on Carcinoid Heart Disease, Class 1, LOE B
  // Carcinoid syndrome (E34.0) + valve disease codes
  const hasCarcinoid = dxCodes.some(c => c.startsWith('E34.0'));
  const hasValveDisease = dxCodes.some(c =>
    c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37')
  );
  if (
    hasCarcinoid &&
    hasValveDisease &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Consider carcinoid valve disease screening and surveillance',
      target: 'Echocardiogram and 5-HIAA level obtained for carcinoid heart disease assessment',
      recommendations: {
        action: 'Consider echocardiographic surveillance and 5-HIAA monitoring for carcinoid heart disease per ENETS and 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline; ENETS Consensus on Carcinoid Heart Disease',
        note: 'Recommended for review: carcinoid heart disease causes right-sided valve fibrosis and may require valve intervention',
      },
      evidence: {
        triggerCriteria: [
          'Carcinoid syndrome (E34.0)',
          'Valve disease diagnosis (I34-I37)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; ENETS Consensus Guidelines on Carcinoid Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echocardiogram within 6 months', 'Carcinoid in remission with normal 5-HIAA'],
      },
    });
  }

  // ============================================================
  // NEW VD RULES (VD-PANNUS through VD-VALVE-CLINIC)
  // ============================================================

  // VD-PANNUS: Prosthetic Valve Pannus/Thrombosis Screening
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Prosthetic valve (Z95.2 or Z95.4) + new gradient increase proxy (R06 dyspnea)
  const hasProstheticValveVD = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4'));
  const hasNewGradientProxy = dxCodes.some(c => c.startsWith('R06') || c.startsWith('R00'));
  if (
    hasProstheticValveVD &&
    hasNewGradientProxy &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider pannus vs thrombosis evaluation for prosthetic valve with new symptoms',
      target: 'TTE/TEE with gradient assessment and CT if indicated',
      recommendations: {
        action: 'Consider echocardiographic evaluation for pannus vs thrombosis in prosthetic valve with new symptoms per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: new gradients in prosthetic valves may indicate pannus, thrombosis, or endocarditis requiring different treatments',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic heart valve (Z95.2 or Z95.4)',
          'New symptoms (dyspnea R06 or palpitations R00)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent valve imaging within 30 days', 'Known stable gradients'],
      },
    });
  }

  // VD-RADIATION: Radiation-Associated Valve Disease
  // Guideline: 2022 ACC/AHA Cardio-Oncology Guideline; 2020 ACC/AHA VHD Guideline, Class 2a, LOE B
  // Cancer history + radiation (Z92.3) + valve disease
  const hasRadiationHx = dxCodes.some(c => c.startsWith('Z92.3'));
  const hasCancerVD = dxCodes.some(c => /^C[0-9]/.test(c));
  if (
    (hasRadiationHx || hasCancerVD) &&
    hasValveDisease &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider radiation-associated valve disease evaluation',
      target: 'Comprehensive echocardiography with radiation-heart disease assessment',
      recommendations: {
        action: 'Consider surveillance echocardiography for radiation-associated valve disease per 2022 ACC/AHA Cardio-Oncology Guideline',
        guideline: '2022 ACC/AHA Cardio-Oncology Guideline; 2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: radiation therapy causes progressive valve fibrosis and calcification, often presenting years after treatment',
      },
      evidence: {
        triggerCriteria: [
          'Cancer history or radiation exposure (Z92.3)',
          'Valve disease diagnosis (I34-I37)',
        ],
        guidelineSource: '2022 ACC/AHA Guideline for Cardio-Oncology; 2020 ACC/AHA VHD Guideline',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echo within 12 months', 'Radiation >20 years ago with normal echo'],
      },
    });
  }

  // VD-ENDOCARDITIS-SURV: Infective Endocarditis Surveillance
  // Guideline: 2015 AHA Scientific Statement on IE; 2023 ESC Endocarditis Guidelines, Class 1, LOE B
  // Prosthetic valve + fever (R50)
  const hasFever = dxCodes.some(c => c.startsWith('R50'));
  if (
    hasProstheticValveVD &&
    hasFever &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SAFETY_ALERT,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider infective endocarditis evaluation for prosthetic valve patient with fever',
      target: 'Blood cultures obtained and echocardiography performed per Duke criteria workup',
      recommendations: {
        action: 'Consider endocarditis workup (blood cultures x3, TTE/TEE) for prosthetic valve with fever per 2023 ESC Endocarditis Guidelines',
        guideline: '2023 ESC Endocarditis Guidelines; 2015 AHA IE Scientific Statement',
        note: 'SAFETY ALERT: prosthetic valve endocarditis carries high mortality; early diagnosis is critical',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic heart valve (Z95.2 or Z95.4)',
          'Fever (R50.*)',
        ],
        guidelineSource: '2015 AHA Scientific Statement on Infective Endocarditis; 2023 ESC Guidelines on Endocarditis',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known non-cardiac source of fever', 'Endocarditis workup completed'],
      },
    });
  }

  // VD-BICUSPID-AORTOPATHY: Bicuspid Valve Aortopathy Screening
  // Guideline: 2020 ACC/AHA VHD Guideline; 2022 ACC/AHA Aortic Disease Guideline, Class 1, LOE B
  // Bicuspid valve (Q23.1) + aortic dilation (I71.2 thoracic aortic aneurysm)
  const hasAorticDilationVD = dxCodes.some(c => c.startsWith('I71.2') || c.startsWith('I71.0'));
  if (
    hasBicuspid &&
    hasAorticDilationVD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider aortic surveillance for bicuspid valve-associated aortopathy',
      target: 'CT or MRI aortography completed for aortic size assessment',
      recommendations: {
        action: 'Consider cross-sectional aortic imaging (CT/MRA) for bicuspid aortopathy surveillance per 2022 ACC/AHA Aortic Disease Guideline',
        guideline: '2020 ACC/AHA VHD Guideline; 2022 ACC/AHA Aortic Disease Guideline',
        note: 'Recommended for review: bicuspid valve aortopathy may progress to dissection; surgical threshold is 5.0-5.5 cm',
      },
      evidence: {
        triggerCriteria: [
          'Bicuspid aortic valve (Q23.1)',
          'Aortic dilation (I71.0 or I71.2)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; 2022 ACC/AHA Aortic Disease Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Aortic imaging within 12 months', 'Post-aortic repair with stable size'],
      },
    });
  }

  // VD-ANTICOAG-REVERSAL: Anticoagulation Reversal Emergency Plan
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Mechanical valve (Z95.2 + I97) + on anticoagulation
  if (
    hasMechanicalValve &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider anticoagulation reversal emergency plan documentation for mechanical valve',
      target: 'Emergency reversal protocol documented including vitamin K and PCC instructions',
      recommendations: {
        action: 'Consider documenting anticoagulation reversal plan for emergency situations per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: mechanical valve patients need documented emergency plans for anticoagulation reversal and bridging',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical heart valve (presence of mechanical prosthesis)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Emergency plan already documented', 'Valve replaced with bioprosthetic'],
      },
    });
  }

  // VD-TRANSCATHETER-MV: Transcatheter Mitral Intervention Evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline (COAPT Trial), Class 2a, LOE B-R
  // Mitral regurgitation (I34.0) + HF + high surgical risk proxy (age >75)
  const hasMitralRegurgVD = dxCodes.some(c => c.startsWith('I34.0'));
  if (
    hasMitralRegurgVD &&
    hasHF &&
    age > 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider transcatheter mitral valve intervention evaluation for high-risk MR patient',
      target: 'Transcatheter mitral intervention candidacy assessed by valve team',
      recommendations: {
        action: 'Consider MitraClip/TEER evaluation for symptomatic MR with HF in high-risk patient per 2020 ACC/AHA VHD Guideline (COAPT)',
        guideline: '2020 ACC/AHA VHD Guideline (COAPT Trial)',
        note: 'Recommended for review: transcatheter edge-to-edge repair reduces HF hospitalization and mortality in appropriately selected patients',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          'Heart failure (I50.*)',
          `Age: ${age} (>75, proxy for high surgical risk)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (COAPT Trial)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'LVEF <20%', 'Severe mitral annular calcification', 'Life expectancy <1 year'],
      },
    });
  }

  // VD-RHC: Right Heart Catheterization for Valve + PH
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Valve disease + pulmonary hypertension (I27)
  const hasPH = dxCodes.some(c => c.startsWith('I27'));
  if (
    hasValveDisease &&
    hasPH &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider right heart catheterization for valve disease with pulmonary hypertension',
      target: 'Right heart catheterization completed to assess hemodynamics before valve intervention',
      recommendations: {
        action: 'Consider right heart catheterization to characterize pulmonary hypertension in valve disease per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: RHC defines PH etiology (pre vs post-capillary) and guides surgical timing and risk stratification',
      },
      evidence: {
        triggerCriteria: [
          'Valve disease diagnosis (I34-I37)',
          'Pulmonary hypertension (I27.*)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'RHC within 6 months', 'Valve intervention not under consideration'],
      },
    });
  }

  // VD-VALVE-CLINIC: Multidisciplinary Valve Clinic Referral
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  // Moderate+ valve disease + symptoms (R06 dyspnea, R07 chest pain)
  const hasModerateValve = dxCodes.some(c =>
    c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37')
  );
  const hasValveSymptoms = dxCodes.some(c =>
    c.startsWith('R06') || c.startsWith('R07') || c.startsWith('R55') || c.startsWith('R00')
  );
  if (
    hasModerateValve &&
    hasValveSymptoms &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Consider multidisciplinary valve clinic referral for symptomatic valve disease',
      target: 'Valve clinic evaluation by multidisciplinary heart team completed',
      recommendations: {
        action: 'Consider referral to multidisciplinary valve clinic for comprehensive assessment per 2020 ACC/AHA VHD Guideline',
        guideline: '2020 ACC/AHA VHD Guideline',
        note: 'Recommended for review: multidisciplinary valve clinics improve outcomes through coordinated evaluation and intervention planning',
      },
      evidence: {
        triggerCriteria: [
          'Valve disease diagnosis (I34-I37)',
          'Symptoms present (dyspnea R06, chest pain R07, syncope R55, or palpitations R00)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already followed in valve clinic', 'Mild valve disease only'],
      },
    });
  }


  // ============================================================
  // FINAL BATCH: 6 VALVULAR RULES (VD-ECHO-INTERVAL through VD-ANTIPLATELET-BIOPROSTHETIC)
  // ============================================================

  // VD-ECHO-INTERVAL: Echo Surveillance Interval Adherence
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  const hasAnyValveDxFB = dxCodes.some(c =>
    c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37') || c.startsWith('I05') || c.startsWith('I06') || c.startsWith('I07') || c.startsWith('I08')
  );
  if (hasAnyValveDxFB && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['echo_months'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider echocardiographic surveillance interval review for valve disease',
        target: 'Echo surveillance completed per guideline-recommended intervals',
        recommendations: {
          action: 'Consider echocardiogram per surveillance intervals in 2020 ACC/AHA VHD Guideline (annual for severe, 1-2yr for moderate)',
          guideline: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          note: 'Recommended for review: regular echo surveillance detects disease progression and optimizes intervention timing',
        },
        evidence: {
          triggerCriteria: [
            'Valvular heart disease (I34-I37, I05-I08)',
            'No recent echocardiogram documented in observations',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Trace/trivial regurgitation only', 'Recent echo <3 months'],
        },
      });
    }
  }

  // VD-FUNCTIONAL-STATUS: Functional Status Assessment in Valve Disease
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE C
  if (hasAnyValveDxFB && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasValveSxFS = dxCodes.some(c =>
      c.startsWith('R06') || c.startsWith('R53') || c.startsWith('R55') || c.startsWith('R00')
    );
    if (hasValveSxFS && labValues['nyha_class'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider functional status assessment (NYHA class) for symptomatic valve disease',
        target: 'NYHA functional class and exercise capacity documented',
        recommendations: {
          action: 'Consider formal NYHA classification and 6-minute walk test per 2020 ACC/AHA VHD Guideline',
          guideline: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          note: 'Recommended for review: symptom onset is a key trigger for valve intervention; formal assessment prevents missed indications',
        },
        evidence: {
          triggerCriteria: [
            'Valvular heart disease (I34-I37, I05-I08)',
            'Symptoms present (dyspnea R06, fatigue R53, syncope R55, palpitations R00)',
            'No NYHA class documented in observations',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'NYHA recently documented', 'Mild valve disease only'],
        },
      });
    }
  }

  // VD-PREOP-ASSESSMENT: Preoperative Assessment for Valve Surgery
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasSevereValve = dxCodes.some(c => c.startsWith('I35.0') || c.startsWith('I34.0') || c.startsWith('I35.2'));
    if (hasSevereValve && labValues['sts_score'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider preoperative risk assessment for potential valve intervention',
        target: 'STS risk score and heart team evaluation documented',
        recommendations: {
          action: 'Consider STS risk score calculation and multidisciplinary heart team review per 2020 ACC/AHA VHD Guideline',
          guideline: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          note: 'Recommended for review: STS score and heart team assessment guide surgical vs transcatheter approach selection',
        },
        evidence: {
          triggerCriteria: [
            'Severe valvular disease (I35.0 AS, I34.0 MR, I35.2 AR)',
            'No STS risk score documented',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'STS score recently calculated', 'Patient declines intervention'],
        },
      });
    }
  }

  // VD-PULMONARY-HTN: Pulmonary Hypertension Screen in Valve Disease
  // Guideline: 2022 ESC/ERS PH Guidelines + 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  if (hasAnyValveDxFB && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasDyspneaVD = dxCodes.some(c => c.startsWith('R06'));
    const noPH = !dxCodes.some(c => c.startsWith('I27'));
    if (hasDyspneaVD && noPH && labValues['pasp'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider pulmonary hypertension screening in valve disease patient with dyspnea',
        target: 'PASP estimated via echocardiography or right heart catheterization reviewed',
        recommendations: {
          action: 'Consider echo-estimated PASP and RV function assessment per 2022 ESC/ERS PH + 2020 ACC/AHA VHD Guidelines',
          guideline: '2022 ESC/ERS Guidelines for Diagnosis and Treatment of Pulmonary Hypertension',
          note: 'Recommended for review: secondary PH in valve disease affects surgical timing and post-operative outcomes',
        },
        evidence: {
          triggerCriteria: [
            'Valvular heart disease (I34-I37, I05-I08)',
            'Dyspnea (R06.*)',
            'No pulmonary hypertension diagnosis (I27)',
            'No PASP documented in observations',
          ],
          guidelineSource: '2022 ESC/ERS Guidelines for Diagnosis and Treatment of Pulmonary Hypertension',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known PH on treatment', 'Recent RHC <6 months'],
        },
      });
    }
  }

  // VD-TRICUSPID-SECONDARY: Secondary Tricuspid Regurgitation
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE B-NR
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasTR = dxCodes.some(c => c.startsWith('I36'));
    const hasLeftHeartDx = dxCodes.some(c =>
      c.startsWith('I50') || c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I05') || c.startsWith('I06')
    );
    if (hasTR && hasLeftHeartDx) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider secondary tricuspid regurgitation assessment in left heart disease',
        target: 'TR severity grading and intervention candidacy reviewed',
        recommendations: {
          action: 'Consider comprehensive TR evaluation including RV function and annular dilation per 2020 ACC/AHA VHD Guideline',
          guideline: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          note: 'Recommended for review: significant secondary TR may warrant concurrent intervention during left-sided valve surgery',
        },
        evidence: {
          triggerCriteria: [
            'Tricuspid regurgitation (I36.*)',
            'Left heart disease (I50, I34, I35, I05, I06)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Trivial TR only', 'Recent TR assessment <3 months'],
        },
      });
    }
  }

  // VD-ANTIPLATELET-BIOPROSTHETIC: Antiplatelet After Bioprosthetic Valve >3 Months
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 2a, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasBioprosthetic = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4')); // bioprosthetic valve proxy
    const noMechanicalValveBio = !dxCodes.some(c => c.startsWith('Z95.3')); // not mechanical
    const ASPIRIN_CODE_BIO = '1191';
    const onAspirinBio = medCodes.includes(ASPIRIN_CODE_BIO);
    if (hasBioprosthetic && noMechanicalValveBio && !onAspirinBio) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.VALVULAR_DISEASE,
        status: 'Consider low-dose aspirin for bioprosthetic valve >3 months post-implant',
        target: 'Aspirin 81mg initiated or anticoagulation rationale documented',
        medication: 'Aspirin 81mg',
        recommendations: {
          action: 'Consider low-dose aspirin for long-term antithrombotic therapy after bioprosthetic valve per 2020 ACC/AHA VHD Guideline',
          guideline: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          note: 'Recommended for review: low-dose aspirin is reasonable after initial 3-6 month anticoagulation period post bioprosthetic valve',
        },
        evidence: {
          triggerCriteria: [
            'Bioprosthetic valve (Z95.2/Z95.4)',
            'Not a mechanical valve (Z95.3)',
            'No aspirin in active medications',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'On therapeutic anticoagulation for other indication', 'Aspirin allergy'],
        },
      });
    }
  }

  // ============================================================
  // NEW PERIPHERAL VASCULAR RULES (PV-RIVAROXABAN through PV-NAFTIDROFURYL)
  // ============================================================

  // PV-RIVAROXABAN: Low-Dose Rivaroxaban in PAD (COMPASS Trial)
  // Guideline: 2024 ACC/AHA PAD Guideline (COMPASS Trial), Class 2a, LOE A
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onAspirinPVriv = medCodes.includes('1191');
    const onRivaroxabanPV = medCodes.includes('1114195');
    if (onAspirinPVriv && !onRivaroxabanPV) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider low-dose rivaroxaban + aspirin per COMPASS trial for PAD',
        target: 'Vascular dose rivaroxaban 2.5mg BID + aspirin reviewed',
        medication: 'Rivaroxaban 2.5mg',
        recommendations: {
          action: 'Consider rivaroxaban 2.5mg BID + aspirin for MACE and MALE reduction per COMPASS trial',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease (COMPASS Trial)',
          note: 'Recommended for review: COMPASS showed 24% reduction in MACE and 46% reduction in MALE with combo therapy',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9/I70.2*)',
            'On aspirin therapy',
            'No rivaroxaban (RxNorm 1114195) in active medications',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease (COMPASS Trial)',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'High bleeding risk', 'On full-dose anticoagulation', 'CrCl<15 mL/min'],
        },
      });
    }
  }

  // PV-CLOPIDOGREL: Clopidogrel for Aspirin Intolerance in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline (CAPRIE Trial), Class 1, LOE A
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAspirinIntolerancePV = dxCodes.some(c => c.startsWith('Z88'));
    const onClopidogrelPV = medCodes.includes('32968');
    const onAspirinPVclop = medCodes.includes('1191');
    if (hasAspirinIntolerancePV && !onAspirinPVclop && !onClopidogrelPV) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider clopidogrel as alternative antiplatelet for PAD with aspirin intolerance',
        target: 'Clopidogrel 75mg daily initiated or documented',
        medication: 'Clopidogrel',
        recommendations: {
          action: 'Consider clopidogrel 75mg daily as alternative antiplatelet per CAPRIE trial evidence',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease (CAPRIE Trial)',
          note: 'Recommended for review: CAPRIE demonstrated clopidogrel superiority over aspirin in PAD subgroup',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9/I70.2*)',
            'Aspirin intolerance/allergy documented (Z88.*)',
            'No clopidogrel (RxNorm 32968) in active medications',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease (CAPRIE Trial)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Severe hepatic impairment'],
        },
      });
    }
  }

  // PV-BYPASS-EVAL: Bypass Surgery Evaluation for CLI
  // Guideline: 2024 ACC/AHA PAD Guideline; GVG CLI Guidelines, Class 1, LOE B
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCLIbypass = dxCodes.some(c => c.startsWith('I70.22') || c.startsWith('I70.23') || c.startsWith('I70.24') || c.startsWith('I70.25'));
    const hasRestPainBypass = dxCodes.some(c => c.startsWith('I70.21'));
    if (hasCLIbypass || hasRestPainBypass) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider surgical bypass evaluation for chronic limb-threatening ischemia',
        target: 'Vascular surgery consultation for bypass vs continued endovascular approach',
        recommendations: {
          action: 'Consider vascular surgery evaluation for bypass in CLTI per 2024 ACC/AHA PAD Guideline',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease; GVG CLI Guidelines',
          note: 'Recommended for review: CLTI patients may benefit from surgical bypass especially with adequate conduit',
        },
        evidence: {
          triggerCriteria: [
            'Chronic limb-threatening ischemia (I70.22-25) or rest pain (I70.21)',
            'PAD diagnosis present',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; GVG CLI Guidelines',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Poor surgical candidate', 'Limited life expectancy'],
        },
      });
    }
  }

  // PV-ENDOVASCULAR: Endovascular Evaluation for Lifestyle-Limiting Claudication
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 2a, LOE B
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasClaudicationEndo = dxCodes.some(c => c.startsWith('I73.9'));
    if (hasClaudicationEndo) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider endovascular intervention evaluation for lifestyle-limiting claudication',
        target: 'Vascular intervention consultation documented',
        recommendations: {
          action: 'Consider endovascular revascularization evaluation if claudication persists despite exercise and medical therapy',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: endovascular intervention may improve walking distance and quality of life in refractory claudication',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9)',
            'Intermittent claudication present',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Adequate response to exercise therapy', 'High procedural risk'],
        },
      });
    }
  }

  // PV-VENOUS-ULCER: Venous Ulcer Management
  // Guideline: 2023 SVS/AVF/AVLS Venous Ulceration Guidelines, Class 1, LOE A
  const hasVenousInsuffPV = dxCodes.some(c => c.startsWith('I87'));
  const hasSkinUlcerPV = dxCodes.some(c => c.startsWith('L97'));
  if (hasVenousInsuffPV && hasSkinUlcerPV && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Consider comprehensive venous ulcer management protocol',
      target: 'Compression therapy and wound care plan documented',
      recommendations: {
        action: 'Consider compression therapy, wound care, and venous intervention evaluation per 2023 SVS/AVF Guideline',
        guideline: '2023 SVS/AVF/AVLS Clinical Practice Guidelines for Venous Ulceration',
        note: 'Recommended for review: compression therapy is cornerstone of venous ulcer healing',
      },
      evidence: {
        triggerCriteria: [
          'Chronic venous insufficiency (I87.*)',
          'Non-healing skin ulcer (L97.*)',
        ],
        guidelineSource: '2023 SVS/AVF/AVLS Clinical Practice Guidelines for Venous Ulceration',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe arterial insufficiency (ABI<0.5)', 'Active cellulitis'],
      },
    });
  }

  // PV-DVT-SCREEN: DVT Screening for Unilateral Edema
  // Guideline: 2020 ASH Guideline on VTE Diagnosis, Class 1, LOE B
  const hasUnilateralEdemaPV = dxCodes.some(c => c.startsWith('R60'));
  if (hasUnilateralEdemaPV && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasDVTdxScreen = dxCodes.some(c => c.startsWith('I82'));
    if (!hasDVTdxScreen) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider DVT screening for unilateral edema',
        target: 'Venous duplex ultrasound or D-dimer documented',
        recommendations: {
          action: 'Consider venous duplex ultrasound or Wells score + D-dimer for DVT evaluation per 2020 ASH Guideline',
          guideline: '2020 ASH Guideline on VTE Diagnosis',
          note: 'Recommended for review: unilateral lower extremity edema warrants DVT exclusion',
        },
        evidence: {
          triggerCriteria: [
            'Unilateral edema (R60.*)',
            'No DVT diagnosis (I82) documented',
          ],
          guidelineSource: '2020 ASH Guideline on VTE Diagnosis',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known bilateral edema cause (HF, nephrotic)', 'Recent DVT workup'],
        },
      });
    }
  }

  // PV-PTS-PREVENTION: Post-Thrombotic Syndrome Prevention after DVT
  // Guideline: 2021 ASH Guideline on VTE Treatment (SOX Trial), Class 2a, LOE B
  const hasDVTpts = dxCodes.some(c => c.startsWith('I82'));
  if (hasDVTpts && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Consider compression therapy for post-thrombotic syndrome prevention after DVT',
      target: 'Graduated compression stockings prescribed or PTS risk assessment documented',
      recommendations: {
        action: 'Consider graduated compression stockings and early mobilization for PTS prevention post-DVT',
        guideline: '2021 ASH Guideline on VTE Treatment',
        note: 'Recommended for review: compression therapy may reduce PTS incidence and severity after acute DVT',
      },
      evidence: {
        triggerCriteria: [
          'Deep vein thrombosis (I82.*)',
        ],
        guidelineSource: '2021 ASH Guideline on VTE Treatment (SOX Trial)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe arterial insufficiency', 'Skin breakdown at compression site'],
      },
    });
  }

  // PV-MESENTERIC: Mesenteric Ischemia Screening in PAD
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 2a, LOE C
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasMesentericSxPV = dxCodes.some(c => c.startsWith('K55'));
    if (hasMesentericSxPV) {
      gaps.push({
        type: TherapyGapType.SCREENING_DUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider mesenteric ischemia evaluation in PAD patient with intestinal vascular symptoms',
        target: 'Mesenteric duplex or CTA documented',
        recommendations: {
          action: 'Consider mesenteric duplex ultrasound or CTA for mesenteric ischemia evaluation per 2024 ACC/AHA PAD Guideline',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: PAD patients with postprandial symptoms may have concurrent mesenteric stenosis',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9/I70.2*)',
            'Vascular disorder of intestine (K55.*)',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE C',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Known mesenteric disease on treatment'],
        },
      });
    }
  }

  // PV-THORACIC-OUTLET: Thoracic Outlet Syndrome Evaluation
  // Guideline: SVS Reporting Standards for TOS, Class 2a, LOE C
  const hasUpperExtVascPV = dxCodes.some(c => c.startsWith('I74.2') || c.startsWith('I82.6'));
  if (hasUpperExtVascPV && age < 50 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Consider thoracic outlet syndrome evaluation for young patient with upper extremity vascular symptoms',
      target: 'TOS evaluation with provocative testing and imaging documented',
      recommendations: {
        action: 'Consider thoracic outlet syndrome workup including chest X-ray, duplex, and provocative maneuvers',
        guideline: 'SVS Reporting Standards for Thoracic Outlet Syndrome',
        note: 'Recommended for review: TOS is an underdiagnosed cause of upper extremity vascular compromise in young patients',
      },
      evidence: {
        triggerCriteria: [
          'Upper extremity vascular event (I74.2/I82.6)',
          `Age: ${age} (<50)`,
        ],
        guidelineSource: 'SVS Reporting Standards for Thoracic Outlet Syndrome',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known cause of upper extremity event', 'Hypercoagulable state identified'],
      },
    });
  }

  // PV-VARICOSE: Varicose Vein Management
  // Guideline: 2024 SVS/AVF Varicose Vein Guidelines, Class 1, LOE B
  const hasVaricoseVeinsPV = dxCodes.some(c => c.startsWith('I83'));
  if (hasVaricoseVeinsPV && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Consider venous insufficiency evaluation and management for symptomatic varicose veins',
      target: 'Venous duplex and treatment plan documented',
      recommendations: {
        action: 'Consider venous duplex ultrasound and compression therapy evaluation per 2024 SVS/AVF Guideline',
        guideline: '2024 SVS/AVF Clinical Practice Guidelines for Varicose Veins',
        note: 'Recommended for review: symptomatic varicose veins may indicate underlying venous reflux requiring intervention',
      },
      evidence: {
        triggerCriteria: [
          'Varicose veins (I83.*) with symptoms',
        ],
        guidelineSource: '2024 SVS/AVF Clinical Practice Guidelines for Varicose Veins',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Asymptomatic varicose veins', 'Active DVT'],
      },
    });
  }

  // PV-LYMPHEDEMA: Lymphedema Management
  // Guideline: 2020 ISL Consensus Document on Lymphedema, Class 1, LOE B
  const hasLymphedemaPV = dxCodes.some(c => c.startsWith('I89'));
  if (hasLymphedemaPV && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.PERIPHERAL_VASCULAR,
      status: 'Consider comprehensive decongestive therapy referral for lymphedema',
      target: 'Lymphedema management plan with CDT referral documented',
      recommendations: {
        action: 'Consider referral for complete decongestive therapy (CDT) including MLD, compression, and exercise per ISL Guideline',
        guideline: '2020 ISL Consensus Document on Lymphedema Management',
        note: 'Recommended for review: early CDT intervention improves lymphedema outcomes and prevents progression',
      },
      evidence: {
        triggerCriteria: [
          'Lymphedema (I89.*)',
        ],
        guidelineSource: '2020 ISL Consensus Document on Lymphedema Management',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active cellulitis', 'Acute DVT', 'Active malignancy in affected area'],
      },
    });
  }

  // PV-RAYNAUD: Calcium Channel Blocker for Raynaud Phenomenon
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  const hasRaynaudPV = dxCodes.some(c => c.startsWith('I73.0'));
  const CCB_CODES_RAYNAUD = ['7417', '17767', '33910'];
  if (hasRaynaudPV && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onCCBraynaud = medCodes.some(c => CCB_CODES_RAYNAUD.includes(c));
    if (!onCCBraynaud) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider calcium channel blocker for Raynaud phenomenon',
        target: 'Dihydropyridine CCB initiated or contraindication documented',
        medication: 'Nifedipine or Amlodipine',
        recommendations: {
          action: 'Consider nifedipine or amlodipine for Raynaud symptom reduction per 2024 ACC/AHA PAD Guideline',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: CCBs reduce frequency and severity of Raynaud attacks',
        },
        evidence: {
          triggerCriteria: [
            'Raynaud phenomenon (I73.0)',
            'No calcium channel blocker in active medications',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Hypotension', 'CCB allergy', 'Severe LV dysfunction'],
        },
      });
    }
  }

  // PV-VASCULAR-REHAB: Vascular Rehabilitation Post-Intervention
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasPostProcRehab = dxCodes.some(c => c.startsWith('Z96.') || c.startsWith('Z98.'));
    const hasVascRehabPV = dxCodes.some(c => c.startsWith('Z50.0'));
    if (hasPostProcRehab && !hasVascRehabPV) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider supervised exercise rehabilitation post vascular intervention',
        target: 'Supervised exercise program or vascular rehab referral documented',
        recommendations: {
          action: 'Consider supervised exercise therapy referral post-intervention for PAD per 2024 ACC/AHA Guideline',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: supervised exercise post-revascularization improves functional outcomes and patency',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease (I73.9/I70.2*)',
            'Post-procedural status documented (Z96/Z98)',
            'No vascular rehab (Z50.0) documented',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Non-healing wounds precluding exercise', 'Unstable cardiac condition'],
        },
      });
    }
  }

  // PV-PENTOXIFYLLINE: Pentoxifylline When Cilostazol Contraindicated
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 2b, LOE B
  if (hasPAD && hasHF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onPentoxifyllinePV = medCodes.includes('7979');
    const hasClaudicationPent = dxCodes.some(c => c.startsWith('I73.9'));
    if (hasClaudicationPent && !onPentoxifyllinePV) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider pentoxifylline for claudication in PAD patient with HF (cilostazol contraindicated)',
        target: 'Pentoxifylline therapy reviewed as alternative to cilostazol',
        medication: 'Pentoxifylline',
        recommendations: {
          action: 'Consider pentoxifylline 400mg TID as alternative for claudication when cilostazol is contraindicated (HF)',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: pentoxifylline is an alternative when cilostazol is contraindicated due to HF',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease with claudication (I73.9)',
            'Heart failure (I50.*) -- cilostazol contraindicated',
            'No pentoxifylline (RxNorm 7979) in active medications',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 2b',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent cerebral/retinal hemorrhage', 'Pentoxifylline allergy'],
        },
      });
    }
  }

  // PV-NAFTIDROFURYL: Naftidrofuryl for Severe Claudication
  // Guideline: 2024 ESC/ESVS Guideline on Peripheral Arterial and Aortic Diseases, Class 2a, LOE A
  if (hasPAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasSevereClaudNaft = dxCodes.some(c => c.startsWith('I73.9'));
    const onNaftidrofurylPV = medCodes.includes('1310463');
    if (hasSevereClaudNaft && !onNaftidrofurylPV) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider naftidrofuryl for severe claudication per ESC/ESVS Guideline',
        target: 'Naftidrofuryl therapy reviewed for claudication symptom relief',
        medication: 'Naftidrofuryl',
        recommendations: {
          action: 'Consider naftidrofuryl 200mg TID for severe claudication per 2024 ESC/ESVS PAD Guideline',
          guideline: '2024 ESC/ESVS Guideline on Peripheral Arterial and Aortic Diseases',
          note: 'Recommended for review: naftidrofuryl improved pain-free walking distance by 37% in meta-analysis of RCTs',
        },
        evidence: {
          triggerCriteria: [
            'Peripheral artery disease with claudication (I73.9)',
            'No naftidrofuryl in active medications',
          ],
          guidelineSource: '2024 ESC/ESVS Guideline on Peripheral Arterial and Aortic Diseases',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Oxalate nephrolithiasis', 'Naftidrofuryl allergy'],
        },
      });
    }
  }

  // ============================================================
  // FINAL BATCH: 3 PV RULES (PV-CRITICAL-LIMB through PV-ANTICOAG-VTE)
  // ============================================================

  // PV-CRITICAL-LIMB: Critical Limb Ischemia Urgent Evaluation
  // Guideline: 2024 ACC/AHA PAD Guideline, Class 1, LOE A
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasCLI = dxCodes.some(c => c.startsWith('I70.24') || c.startsWith('I70.25'));
    const hasTissueLoss = dxCodes.some(c => c.startsWith('L97') || c.startsWith('L98.4'));
    if (hasCLI || (hasPAD && hasTissueLoss)) {
      gaps.push({
        type: TherapyGapType.REFERRAL_NEEDED,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider urgent vascular evaluation for critical limb ischemia with tissue loss',
        target: 'Urgent vascular surgery or interventional consultation obtained',
        recommendations: {
          action: 'Consider urgent vascular specialist referral for CLI assessment and revascularization planning per 2024 ACC/AHA PAD Guideline',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          note: 'Recommended for review: CLI with tissue loss requires urgent revascularization evaluation to prevent limb loss',
        },
        evidence: {
          triggerCriteria: [
            'Critical limb ischemia (I70.24/I70.25) or PAD with tissue loss (L97/L98.4)',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Vascular surgery already consulted', 'Non-ischemic wound etiology confirmed'],
        },
      });
    }
  }

  // PV-GRAFT-SURVEILLANCE: Bypass Graft Surveillance
  // Guideline: 2024 ACC/AHA PAD Guideline + SVS Practice Guidelines, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasVascularGraft = dxCodes.some(c => c.startsWith('Z95.8'));
    if (hasVascularGraft && hasPAD && labValues['graft_duplex_months'] === undefined) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider interval duplex surveillance for peripheral bypass graft',
        target: 'Graft duplex ultrasound surveillance completed per guideline intervals',
        recommendations: {
          action: 'Consider duplex ultrasound graft surveillance at 1, 3, 6, 12 months then annually per SVS/ACC/AHA Guidelines',
          guideline: '2024 ACC/AHA Guideline on Peripheral Artery Disease; SVS Practice Guidelines',
          note: 'Recommended for review: duplex surveillance detects graft stenosis before occlusion; assisted primary patency exceeds primary patency',
        },
        evidence: {
          triggerCriteria: [
            'Vascular graft (Z95.8)',
            'Peripheral artery disease (I73.9/I70.2*)',
            'No recent graft duplex documented in observations',
          ],
          guidelineSource: '2024 ACC/AHA Guideline on Peripheral Artery Disease; SVS Practice Guidelines',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent duplex <3 months', 'Graft known to be occluded'],
        },
      });
    }
  }

  // PV-ANTICOAG-VTE: VTE Anticoagulation Duration Review
  // Guideline: 2021 ASH VTE Guidelines + 2020 CHEST Antithrombotic Guideline, Class 1, LOE B
  if (!hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasVTE = dxCodes.some(c => c.startsWith('I82'));
    const OAC_CODES_VTE = ['11289', '1364430', '1114195', '1037045', '1599538'];
    const onOACvte = medCodes.some(c => OAC_CODES_VTE.includes(c));
    if (hasVTE && onOACvte) {
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.PERIPHERAL_VASCULAR,
        status: 'Consider VTE anticoagulation duration review and continued need assessment',
        target: 'OAC duration assessed with bleeding risk re-evaluation',
        recommendations: {
          action: 'Consider reassessing anticoagulation duration and bleeding risk at 3-6 month intervals per ASH/CHEST VTE Guidelines',
          guideline: '2021 ASH Guidelines on VTE Management; 2020 CHEST Guideline on Antithrombotic Therapy for VTE',
          note: 'Recommended for review: unprovoked VTE may warrant extended anticoagulation; provoked VTE typically 3-6 months',
        },
        evidence: {
          triggerCriteria: [
            'Venous thromboembolism (I82.*)',
            'On oral anticoagulation therapy',
          ],
          guidelineSource: '2021 ASH Guidelines on VTE Management; 2020 CHEST Guideline on Antithrombotic Therapy for VTE',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active cancer-associated VTE (separate protocol)', 'Recent duration review <3 months'],
        },
      });
    }
  }

  return gaps;
}
