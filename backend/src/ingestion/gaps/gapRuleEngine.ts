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
  RXNORM_FINERENONE,
  RXNORM_GLP1_RA,
  RXNORM_DHP_CCB,
  RXNORM_PPI,
  RXNORM_LOOP_DIURETICS,
  RXNORM_THIAZIDES,
  RXNORM_ATTR_DMT,
  RXNORM_COLCHICINE,
  RXNORM_IV_IRON,
  RXNORM_NON_EBM_BB_HF,
  RXNORM_FABRY_DMT,
  RXNORM_INOTROPES,
  RXNORM_TOLVAPTAN,
  RXNORM_THYROID_THERAPY,
  RXNORM_METFORMIN,
  RXNORM_CORTICOSTEROIDS,
  RXNORM_STEROID_SPARING,
  RXNORM_IL1_INHIBITORS,
  RXNORM_OCTREOTIDE,
  EP_ABLATION_CPT,
  CIED_IMPLANT_CPT,
  CIED_EXTRACTION_CPT,
  LAAC_CPT,
  RXNORM_ALPHA_BLOCKERS,
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
const GLP1_RA_CODES_CV = codes(RXNORM_GLP1_RA); // AUDIT-104: canonical GLP-1 RA set consumed by HF-7 + gap-cad-glp1

// =============================================================================
// Dose-aware high-intensity statin detection (AUDIT-101; shared infrastructure)
// =============================================================================
//
// High-intensity statin per the 2018 AHA/ACC Blood Cholesterol Guideline
// (Grundy et al., Circulation 2019;139:e1082-e1143) = LDL-C reduction >=50%:
//   atorvastatin 40-80 mg  OR  rosuvastatin 20-40 mg.
// No other agent/dose qualifies; simvastatin and pravastatin are moderate/low
// intensity at every approved dose.
//
// AUDIT-101 root cause: an ingredient-level RxCUI (TTY=IN) maps to the
// ingredient, NOT the strength - atorvastatin 10mg and 80mg are both 83367 - so
// "on high-intensity statin" is structurally undetectable from rxNormCode alone.
// Detection is therefore by AGENT (ingredient identity) + doseValue THRESHOLD,
// using the dose fields the Medication record already carries. This helper is
// shared infrastructure: every future dose-dependent rule should consume it
// rather than re-deriving dose from a flat code list.
//
// §16 (RxNav properties.json, verified 2026-06-04; TTY=IN):
//   atorvastatin 83367; rosuvastatin 301542.
// Full §16 log: docs/architecture/AUDIT_101_STATIN_INTENSITY_NOTES.md §4.
const RXNORM_ATORVASTATIN_IN = '83367';
const RXNORM_ROSUVASTATIN_IN = '301542';
// Minimum high-intensity daily dose (mg), keyed by ingredient RxCUI.
const HIGH_INTENSITY_STATIN_MIN_MG: Record<string, number> = {
  [RXNORM_ATORVASTATIN_IN]: 40,
  [RXNORM_ROSUVASTATIN_IN]: 20,
};

/**
 * A medication with the dose fields threaded from the Medication record.
 * Legacy callers that pass only a flat code list are adapted to this shape
 * (dose undefined) so the engine degrades to 'agent present, dose unknown'
 * rather than silently treating ingredient presence as high-intensity.
 */
interface MedicationDose {
  rxNormCode: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  // v3.0 ingest work-unit 1: med start-date (stored from FHIR authoredOn) threaded so
  // duration/recency gates (GDMT >=3mo, HF-081 recent-intensification) can test temporality.
  // Optional - legacy callers omit it; date-dependent gates fail-open to 'duration unknown'.
  startDate?: Date | string | null;
  genericName?: string | null;
  medicationName?: string | null;
}

type HighIntensityStatinStatus =
  | 'on_high_intensity'   // atorvastatin >=40mg or rosuvastatin >=20mg, dose documented
  | 'agent_dose_unknown'  // on atorvastatin/rosuvastatin but dose not documented -> qualified fire
  | 'not_high_intensity'; // no statin, a non-high-intensity agent, or a documented sub-threshold dose

/** Resolve a medication to the high-intensity-eligible ingredient (atorvastatin/rosuvastatin), or null. */
function highIntensityStatinAgent(med: MedicationDose): string | null {
  const code = med.rxNormCode ?? '';
  if (code === RXNORM_ATORVASTATIN_IN) return RXNORM_ATORVASTATIN_IN;
  if (code === RXNORM_ROSUVASTATIN_IN) return RXNORM_ROSUVASTATIN_IN;
  // rxNormCode may be a dose-level SCD/SBD rather than the ingredient; fall back
  // to the name so agent identity survives whichever code level was ingested.
  const text = `${med.genericName ?? ''} ${med.medicationName ?? ''}`.toLowerCase();
  if (text.includes('atorvastatin')) return RXNORM_ATORVASTATIN_IN;
  if (text.includes('rosuvastatin')) return RXNORM_ROSUVASTATIN_IN;
  return null;
}

/**
 * Classify a medication list for high-intensity statin therapy (AUDIT-101).
 * - 'on_high_intensity' if any med is atorvastatin >=40mg / rosuvastatin >=20mg
 *   with a usable mg dose;
 * - else 'agent_dose_unknown' if a high-intensity-eligible agent is present but
 *   no usable mg dose is documented (fail-loud: surface for confirm/intensify,
 *   never silent-suppress);
 * - else 'not_high_intensity' (no statin, a non-high-intensity agent such as
 *   simvastatin/pravastatin, or a documented sub-threshold atorva/rosuva dose).
 */
function highIntensityStatinStatus(meds: MedicationDose[]): HighIntensityStatinStatus {
  let agentDoseUnknown = false;
  for (const med of meds) {
    const agent = highIntensityStatinAgent(med);
    if (!agent) continue;
    const minMg = HIGH_INTENSITY_STATIN_MIN_MG[agent];
    const unitOk = !med.doseUnit || med.doseUnit.toLowerCase().startsWith('mg');
    if (typeof med.doseValue === 'number' && med.doseValue > 0 && unitOk) {
      if (med.doseValue >= minMg) return 'on_high_intensity';
      // documented sub-threshold dose -> not high-intensity; keep scanning in
      // case another medication is high-intensity.
    } else {
      // high-intensity-eligible agent present but dose not usable -> qualified.
      agentDoseUnknown = true;
    }
  }
  return agentDoseUnknown ? 'agent_dose_unknown' : 'not_high_intensity';
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
// Fix (Batch 7 minor, 2026-05-06): expanded scope per operator clinical-intent decision (PR #248
// review). Was ['O00', 'O09', 'Z33'] — covered only ectopic pregnancy + supervision-of-high-risk +
// pregnant-state, missing the entire O00-O9A pregnancy/childbirth/puerperium chapter. Now uses
// prefix 'O' to catch all ICD-10 Chapter XV codes (any pregnancy-related condition) plus Z33 +
// Z34 for routine pregnancy supervision. hasContraindication() does prefix-match via startsWith,
// so 'O' alone matches O00-O9A in one entry.
const EXCLUSION_PREGNANCY = ['O', 'Z33', 'Z34'];            // All pregnancy/childbirth/puerperium (O00-O9A) + routine supervision (Z33, Z34)
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
    id: 'gap-ep-006-dabigatran-renal-safety',
    name: 'Dabigatran + CrCl<30 severe renal impairment (SAFETY)',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Pradaxa (dabigatran) Prescribing Information',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-05-05',
    nextReviewDue: '2026-11-05',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-003-rivaroxaban-renal-dose',
    name: 'Rivaroxaban renal dose not adjusted for CrCl',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Xarelto Prescribing Information',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-004-apixaban-underdose-criteria',
    name: 'Apixaban dose reduction criteria met but on full dose',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis Prescribing Information',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-005-apixaban-inappropriate-underdose',
    name: 'Apixaban inappropriately reduced without criteria',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis Prescribing Information',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-008-doac-mitral-stenosis',
    name: 'DOAC contraindicated in moderate-severe mitral stenosis',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + 2020 ACC/AHA Valvular Heart Disease Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-009-edoxaban-high-crcl',
    name: 'Edoxaban reduced efficacy at high CrCl',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Savaysa Prescribing Information (boxed warning)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-012-laac-high-risk-bleed',
    name: 'LAAC for high stroke risk with prior major bleed',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-014-af-ablation-hfref',
    name: 'AF ablation not referred in HFrEF (CASTLE-AF)',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline (CASTLE-AF)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-071-post-ablation-oac',
    name: 'Anticoagulation not continued after AF ablation',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-072-redo-af-ablation',
    name: 'Redo AF ablation evaluation after recurrence',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-074-flutter-cti-ablation',
    name: 'CTI ablation not offered for typical atrial flutter',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-076-svt-ablation',
    name: 'SVT ablation not offered for recurrent SVT on antiarrhythmic',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline (SVT management)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-020-ischemic-vt-ablation',
    name: 'VT ablation not offered for ischemic VT on antiarrhythmic',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-021-nicm-vt-substrate',
    name: 'VT substrate evaluation not pursued in non-ischemic cardiomyopathy',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-022-vt-ablation-vanish',
    name: 'VT ablation not considered before amiodarone escalation (VANISH)',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias (VANISH)',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-ep-029-pacemaker-class1',
    name: 'Pacemaker not implanted for Class I bradycardia indication',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-034-cied-infection-extraction',
    name: 'Full CIED system extraction not performed for device infection',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 HRS Expert Consensus on Lead Management and CIED Infection',
    guidelineVersion: '2017',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-092-sicd-candidate',
    name: 'S-ICD not considered for young primary-prevention candidate without pacing need',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-ep-030-brady-avn-blocker-reduce',
    name: 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
    guidelineVersion: '2018',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-ep-033-af-slow-rate-pacing',
    name: 'Chronic AF with HR<40 on rate control: adjust medication vs pacing',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS AFib + 2018 ACC/AHA/HRS Bradycardia Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-ep-097-orthostatic-hypotension-med-review',
    name: 'Orthostatic hypotension on BP-lowering therapy: medication review',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Syncope',
    guidelineVersion: '2017',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-067-post-laac-antithrombotic',
    name: 'Post-LAAC patient not on any antithrombotic therapy',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + LAAC device IFU',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-06-16',
    nextReviewDue: '2026-12-16',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-ep-079-wpw-af-avn-blocker',
    name: 'Pre-excited AF + AVN blocker (CRITICAL)',
    module: 'ELECTROPHYSIOLOGY',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/ACCP/HRS',
    lastReviewDate: '2026-05-05',
    nextReviewDue: '2026-11-05',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
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
    id: 'gap-cad-rehab-cabg',
    name: 'Post-CABG Cardiac Rehab Referral',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-18',
    nextReviewDue: '2026-12-18',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-cad-rehab-mi',
    name: 'Post-MI Cardiac Rehab Referral',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
    guidelineVersion: '2021',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-18',
    nextReviewDue: '2026-12-18',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-sh-2-tavr-eval',
    name: 'Severe symptomatic AS - AVR not referred',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-sh-006-as-asymptomatic-lvef',
    name: 'Asymptomatic severe AS with LV dysfunction (Class IIa AVR)',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-003-lflg-as-dse',
    name: 'Low-flow low-gradient AS: dobutamine stress echo not performed',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-004-paradoxical-lflg-as',
    name: 'Paradoxical low-flow low-gradient AS detection',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-050-as-grading-clarification',
    name: 'Moderate AS: severity-grading surveillance / integrated clarification',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-EO',
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
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (remote monitoring; PA-pressure-sensor 2b basis per GUIDE-HF/CHAMPION, supporting telemonitoring trial TIM-HF2)',
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
    name: 'Severe primary MR - surgical referral',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-016-mr-primary-af',
    name: 'Severe primary MR + new AF - surgical IIa',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-017-mr-primary-ph',
    name: 'Severe primary MR + pulmonary hypertension - surgical IIa',
    module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-06-17',
    nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-022-tricuspid-assessment',
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
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT)',
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
  // v3.0 SH buildout registry entries (chunks 1-7, 2026-06-17). One entry per new evaluator.
  {
    id: 'gap-sh-069-evoque-ttvr',
    name: 'Evoque TTVR (TRISCEND) Candidacy', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; TRISCEND II',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-023-tr-device-lead',
    name: 'TR Device Selection Lead Status', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-052-marfan-bb-arb',
    name: 'Marfan Aortic Growth Prophylaxis', module: 'STRUCTURAL_HEART',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022', guidelineOrg: 'ACC/AHA/AATS/STS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-074-typeb-omt',
    name: 'Type B Dissection Optimal Medical Therapy', module: 'STRUCTURAL_HEART',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022', guidelineOrg: 'ACC/AHA/AATS/STS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-075-typeb-tevar',
    name: 'Complicated Type B Dissection TEVAR Evaluation', module: 'STRUCTURAL_HEART',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022', guidelineOrg: 'ACC/AHA/AATS/STS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-054-turner-surveillance',
    name: 'Turner Syndrome Cardiac Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
    guidelineVersion: '2022', guidelineOrg: 'ACC/AHA/AATS/STS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-055-veds-celiprolol',
    name: 'Vascular EDS Celiprolol Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease; BBEST trial',
    guidelineVersion: '2022', guidelineOrg: 'ACC/AHA/AATS/STS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-026-pfo-cryptogenic-closure',
    name: 'PFO Cryptogenic Stroke Closure Evaluation', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; RESPECT/CLOSE/REDUCE',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-029-ie-early-surgery',
    name: 'Infective Endocarditis Early Surgery Indication', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-091-massive-pe-reperfusion',
    name: 'Massive PE Reperfusion Evaluation', module: 'STRUCTURAL_HEART',
    guidelineSource: '2019 ESC Guideline on Acute Pulmonary Embolism',
    guidelineVersion: '2019', guidelineOrg: 'ESC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-101-eisenmenger-pah',
    name: 'Eisenmenger PAH-Specific Therapy', module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline; 2022 ESC/ERS Pulmonary Hypertension Guideline',
    guidelineVersion: '2018', guidelineOrg: 'AHA/ACC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-099-ebstein-arrhythmia',
    name: 'Ebstein Anomaly Arrhythmia Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
    guidelineVersion: '2018', guidelineOrg: 'AHA/ACC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-059-postavr-antithrombotic',
    name: 'Post-AVR Antithrombotic Regimen Review', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; POPular-TAVI',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-sh-057-postavr-lbbb',
    name: 'Post-AVR New LBBB Monitoring', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-060-postavr-pacing',
    name: 'Post-AVR High-Grade AV Block Pacing Decision', module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Bradycardia',
    guidelineVersion: '2018', guidelineOrg: 'ACC/AHA/HRS', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-092-cteph-surveillance',
    name: 'Post-PE CTEPH Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2019 ESC Guideline on Acute Pulmonary Embolism; 2022 ESC/ERS Pulmonary Hypertension Guideline',
    guidelineVersion: '2019', guidelineOrg: 'ESC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-095-coarctation-surveillance',
    name: 'Coarctation Imaging Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
    guidelineVersion: '2018', guidelineOrg: 'AHA/ACC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-097-systemic-rv',
    name: 'Systemic Right Ventricle ACHD Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
    guidelineVersion: '2018', guidelineOrg: 'AHA/ACC', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-082-postclosure-antithrombotic',
    name: 'Post-Septal-Closure Antithrombotic', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; closure-device IFUs',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-EO',
  },
  {
    id: 'gap-sh-083-postclosure-surveillance',
    name: 'Post-Closure Residual Shunt Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-065-postteer-echo',
    name: 'Post-Mitral-TEER Surveillance Echo', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-066-recurrent-mr-teer',
    name: 'Recurrent MR After Mitral TEER', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-003-lflg-classical',
    name: 'Low-Flow Low-Gradient AS Classical DSE', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-004-lflg-paradoxical',
    name: 'Paradoxical Low-Flow Low-Gradient AS', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-006-asymptomatic-as',
    name: 'Asymptomatic Severe AS LV Dysfunction', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B',
  },
  {
    id: 'gap-sh-050-moderate-as-grading',
    name: 'Moderate AS Severity Grading Surveillance', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-sh-016-primary-mr-af',
    name: 'Severe Primary MR New Atrial Fibrillation', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-017-primary-mr-pasp',
    name: 'Severe Primary MR Pulmonary Hypertension', module: 'STRUCTURAL_HEART',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-sh-103-atrial-myxoma',
    name: 'Atrial Myxoma Surgical Referral', module: 'STRUCTURAL_HEART',
    guidelineSource: 'ACC/AHA cardiac-masses consensus; standard surgical management of atrial myxoma',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
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
    id: 'gap-cad-016-prasugrel-stroke-safety',
    name: 'Prasugrel + prior stroke/TIA (SAFETY)',
    module: 'CORONARY_INTERVENTION',
    guidelineSource: '2023 ACC/AHA Chronic Coronary Disease Guideline + FDA Effient (prasugrel) Black-Box Warning',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA',
    lastReviewDate: '2026-05-05',
    nextReviewDue: '2026-11-05',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
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
  // v3.0 VHD buildout chunk 1 registry entries (AR + mixed/integrated valve severity, 2026-06-17).
  {
    id: 'gap-vhd-103-severe-ar-surgical',
    name: 'Severe Asymptomatic AR LV Dysfunction Surgical', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-102-ar-surveillance',
    name: 'Aortic Regurgitation Surveillance Echo', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-104-mixed-valve-staging',
    name: 'Mixed Multi-Valve Integrated Staging', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-vhd-105-mr-quant-triangulation',
    name: 'Moderate MR Quantitative Triangulation', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C-LD',
  },
  // v3.0 VHD buildout chunk 2 registry entries (prosthetic-valve dysfunction PVT/SVD partition, 2026-06-17).
  {
    id: 'gap-vhd-068-mech-pvt-gradient',
    name: 'Mechanical Prosthetic Valve Thrombosis Gradient', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-011-bio-svd-gradient',
    name: 'Bioprosthetic Structural Valve Deterioration Gradient', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  // v3.0 VHD buildout chunk 3 registry entries (mechanical anticoagulation, post INR slug-fix, 2026-06-17).
  {
    id: 'gap-vhd-001-subtherapeutic-inr',
    name: 'Mechanical Valve Sub-Therapeutic INR', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-006-mech-asa-adjunct',
    name: 'Mechanical Valve ASA Adjunct With Vascular Disease', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  // v3.0 VHD buildout chunk 4 registry entries (IE-surgical-dx + rheumatic, 2026-06-17).
  {
    id: 'gap-vhd-057-ie-hf-surgery',
    name: 'IE With Heart Failure Urgent Surgery', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-059-ie-embolic-surgery',
    name: 'IE Embolic Event On Therapy Surgery', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-064-prior-ie-dental-prophylaxis',
    name: 'Prior IE Dental Antibiotic Prophylaxis', module: 'VALVULAR_DISEASE',
    guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
    guidelineVersion: '2021', guidelineOrg: 'AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-079-rheumatic-prophylaxis',
    name: 'Rheumatic Heart Disease Benzathine Prophylaxis', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 AHA / World Heart Federation Rheumatic Heart Disease guidance',
    guidelineVersion: '2020', guidelineOrg: 'AHA/WHF', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-vhd-083-rheumatic-af-warfarin',
    name: 'Rheumatic Heart Disease AF Warfarin', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; INVICTUS',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'B-R',
  },
  // v3.0 VHD chunk 5 registry entries (pregnancy SAFETY + drug-induced valve surveillance, 2026-06-17).
  {
    id: 'gap-vhd-098-mech-valve-preconception',
    name: 'Mechanical Valve Pre-Conception Counseling', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C',
  },
  {
    id: 'gap-vhd-099-mech-valve-pregnancy-anticoag',
    name: 'Mechanical Valve Pregnancy Anticoagulation SAFETY', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '1', levelOfEvidence: 'C',
  },
  {
    id: 'gap-vhd-091-dopamine-agonist-valve-surveillance',
    name: 'Dopamine Agonist Valve Surveillance', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; FDA dopamine-agonist labeling',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'C',
  },
  {
    id: 'gap-vhd-092-ergot-alkaloid-valve-surveillance',
    name: 'Ergot Alkaloid Valve Surveillance', module: 'VALVULAR_DISEASE',
    guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
    guidelineVersion: '2020', guidelineOrg: 'ACC/AHA', lastReviewDate: '2026-06-17', nextReviewDue: '2026-12-17',
    classOfRecommendation: '2a', levelOfEvidence: 'C',
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
  // v3.0 HF buildout calibration sample (2026-06-15). ids token-match the evaluator block names
  // so reconcile pairs them deterministically; the crosswalk flip is via explicit applyOverrides.
  {
    id: 'gap-hf-017-finerenone-mref',
    name: 'Finerenone in HFmrEF/HFpEF',
    module: 'HEART_FAILURE',
    guidelineSource: 'FINEARTS-HF (Solomon et al., NEJM 2024)',
    guidelineVersion: '2024',
    guidelineOrg: 'FINEARTS-HF',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-077-amyloid-af-oac',
    name: 'Cardiac amyloidosis AF anticoagulation',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Cardiac Amyloidosis',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-081-dm-hba1c',
    name: 'HF diabetes HbA1c target',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; ADA Standards of Care',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-008-mra-contra',
    name: 'MRA contraindicated by labs',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-033-iron-def-iv',
    name: 'Absolute iron deficiency IV iron',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-143-pericarditis-colch',
    name: 'Pericarditis colchicine',
    module: 'HEART_FAILURE',
    guidelineSource: '2015 ESC Guideline for the Diagnosis and Management of Pericardial Diseases',
    guidelineVersion: '2015',
    guidelineOrg: 'ESC',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-054-attr-dmt',
    name: 'ATTR-CM disease-modifying therapy',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Cardiac Amyloidosis (ATTR-ACT)',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-002-bb-non-ebm',
    name: 'Non-evidence-based beta-blocker HFrEF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  // v3.0 HF FULL buildout batch (2026-06-15, feat/hf-buildable-gap-batch): 34 new evaluators, registry
  // entries for cite reconstruction. All clinically reviewed; proof hfBuildoutBatch.test.ts.
  {
    id: 'gap-hf-003-bb-target-dose',
    name: 'HFrEF beta-blocker below target dose',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-011-sglt2i-egfr-floor',
    name: 'SGLT2i deferred below eGFR floor',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; FDA SGLT2i labels',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-015-digoxin-high-elderly',
    name: 'High-dose digoxin in elderly with CKD',
    module: 'HEART_FAILURE',
    guidelineSource: '2019 AGS Beers Criteria; 2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2019',
    guidelineOrg: 'AGS/AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-024-icd-primary-ischemic',
    name: 'Primary-prevention ICD (ischemic)',
    module: 'HEART_FAILURE',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for VA/SCD',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-025-icd-primary-nicm',
    name: 'Primary-prevention ICD (non-ischemic)',
    module: 'HEART_FAILURE',
    guidelineSource: '2017 AHA/ACC/HRS Guideline; DANISH (NEJM 2016)',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-026-icd-secondary',
    name: 'Secondary-prevention ICD',
    module: 'HEART_FAILURE',
    guidelineSource: '2017 AHA/ACC/HRS Guideline for VA/SCD',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-031-lead-extraction',
    name: 'CIED lead extraction indication',
    module: 'HEART_FAILURE',
    guidelineSource: '2017 HRS Expert Consensus on CIED Lead Management',
    guidelineVersion: '2017',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-hf-126-ccm-candidate',
    name: 'Cardiac contractility modulation candidacy',
    module: 'HEART_FAILURE',
    guidelineSource: 'FDA approval (FIX-HF-5C); 2023 HF device-therapy consensus',
    guidelineVersion: '2023',
    guidelineOrg: 'FDA/ACC',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-127-wcd-bridge',
    name: 'WCD bridge post-MI',
    module: 'HEART_FAILURE',
    guidelineSource: '2017 AHA/ACC/HRS Guideline; VEST (NEJM 2018)',
    guidelineVersion: '2017',
    guidelineOrg: 'AHA/ACC/HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-061-fabry-ert',
    name: 'Fabry disease-modifying therapy',
    module: 'HEART_FAILURE',
    guidelineSource: '2021 International Expert Consensus on Fabry Disease',
    guidelineVersion: '2021',
    guidelineOrg: 'Fabry Consensus',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B',
  },
  {
    id: 'gap-hf-062-sarcoid-avblock',
    name: 'Cardiac sarcoid AV-block workup',
    module: 'HEART_FAILURE',
    guidelineSource: '2014 HRS Expert Consensus on Cardiac Sarcoidosis',
    guidelineVersion: '2014',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-063-sarcoid-immunosupp',
    name: 'Cardiac sarcoid immunosuppression',
    module: 'HEART_FAILURE',
    guidelineSource: '2014 HRS Expert Consensus on Cardiac Sarcoidosis',
    guidelineVersion: '2014',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-065-tachy-cm',
    name: 'Tachycardia-mediated cardiomyopathy',
    module: 'HEART_FAILURE',
    guidelineSource: '2019 AHA Scientific Statement on Tachycardia-Induced CM',
    guidelineVersion: '2019',
    guidelineOrg: 'AHA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-hf-072-takotsubo-echo',
    name: 'Takotsubo recovery echo',
    module: 'HEART_FAILURE',
    guidelineSource: '2018 International Takotsubo Diagnostic Criteria (InterTAK)',
    guidelineVersion: '2018',
    guidelineOrg: 'InterTAK',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-073-radiation-surv',
    name: 'Radiation heart disease surveillance',
    module: 'HEART_FAILURE',
    guidelineSource: '2013 EACVI/ASE Consensus on Radiation-Induced Heart Disease',
    guidelineVersion: '2013',
    guidelineOrg: 'EACVI/ASE',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-074-arvc-icd',
    name: 'ARVC with VT ICD evaluation',
    module: 'HEART_FAILURE',
    guidelineSource: '2019 HRS Expert Consensus on ARVC',
    guidelineVersion: '2019',
    guidelineOrg: 'HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-hf-032-iron-screen',
    name: 'Iron studies in anemic HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-034-iron-functional',
    name: 'Functional iron deficiency in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-036-gdmt-incomplete',
    name: 'HFrEF GDMT substantially incomplete',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-076-stage-b',
    name: 'Stage B asymptomatic LV dysfunction',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (Stage B)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'A',
  },
  {
    id: 'gap-hf-078-af-rate',
    name: 'HF + chronic AF rate control',
    module: 'HEART_FAILURE',
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
    guidelineVersion: '2023',
    guidelineOrg: 'ACC/AHA/HRS',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-080-thyroid',
    name: 'HF + untreated overt thyroid dysfunction',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-082-metformin-renal',
    name: 'Metformin renal review in HF + CKD',
    module: 'HEART_FAILURE',
    guidelineSource: 'FDA metformin label; 2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'FDA/AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-086-preg-teratogen',
    name: 'Teratogenic HF medication in pregnancy',
    module: 'HEART_FAILURE',
    guidelineSource: 'FDA pregnancy labeling; 2022 AHA/ACC/HFSA HF Guideline',
    guidelineVersion: '2022',
    guidelineOrg: 'FDA/AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '3 (Harm)',
    levelOfEvidence: 'B-NR',
  },
  {
    id: 'gap-hf-047-inotrope-dependence',
    name: 'Inotrope dependence advanced HF referral',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (Stage D)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-132-tolvaptan-hyponatremia',
    name: 'Severe hyponatremia management in HF',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (EVEREST, SALT)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-133-cs-mcs-escalation',
    name: 'Inotrope-refractory cardiogenic shock MCS',
    module: 'HEART_FAILURE',
    guidelineSource: 'SCAI Cardiogenic Shock Classification; 2022 AHA/ACC/HFSA',
    guidelineVersion: '2022',
    guidelineOrg: 'SCAI/AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-139-crs4-screen',
    name: 'Advanced CKD HF screening (cardiorenal type 4)',
    module: 'HEART_FAILURE',
    guidelineSource: 'KDIGO CKD Guideline; cardiorenal syndrome consensus',
    guidelineVersion: '2024',
    guidelineOrg: 'KDIGO',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-144-pericarditis-il1',
    name: 'Recurrent pericarditis IL-1 inhibitor',
    module: 'HEART_FAILURE',
    guidelineSource: 'RHAPSODY trial (rilonacept, NEJM 2021)',
    guidelineVersion: '2021',
    guidelineOrg: 'RHAPSODY',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2a',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-027-cardiomems',
    name: 'CardioMEMS PA-pressure monitor candidacy',
    module: 'HEART_FAILURE',
    guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (CHAMPION, GUIDE-HF)',
    guidelineVersion: '2022',
    guidelineOrg: 'AHA/ACC/HFSA',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2b',
    levelOfEvidence: 'B-R',
  },
  {
    id: 'gap-hf-147-lvad-inr',
    name: 'Post-LVAD INR out of range',
    module: 'HEART_FAILURE',
    guidelineSource: 'ISHLT Mechanical Circulatory Support guidelines',
    guidelineVersion: '2023',
    guidelineOrg: 'ISHLT',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-148-lvad-gib',
    name: 'Post-LVAD GI bleeding management',
    module: 'HEART_FAILURE',
    guidelineSource: 'ISHLT MCS guidance; LVAD GI-bleeding registry data',
    guidelineVersion: '2023',
    guidelineOrg: 'ISHLT',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '2b',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-151-transplant-cav',
    name: 'Post-transplant CAV surveillance',
    module: 'HEART_FAILURE',
    guidelineSource: 'ISHLT Heart Transplant guidelines (CAV surveillance)',
    guidelineVersion: '2023',
    guidelineOrg: 'ISHLT',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
  {
    id: 'gap-hf-152-transplant-biopsy',
    name: 'Post-transplant rejection-surveillance biopsy',
    module: 'HEART_FAILURE',
    guidelineSource: 'ISHLT Heart Transplant guidelines (rejection surveillance)',
    guidelineVersion: '2023',
    guidelineOrg: 'ISHLT',
    lastReviewDate: '2026-06-15',
    nextReviewDue: '2026-12-15',
    classOfRecommendation: '1',
    levelOfEvidence: 'C-LD',
  },
] as const;

export function evaluateGapRules(
  dxCodes: string[],
  labValues: Record<string, number>,
  // AUDIT-118: medCodes MUST be ingredient-expanded via expandToIngredients()
  // before being passed here. Raw product-coded (SCD/SBD) membership silently
  // under-detects against the ingredient-level (TTY=IN) value sets. The two gap
  // runners are the only callers and both expand; a new caller must too
  // (enforced by audit118CallerGuard.test.ts).
  medCodes: string[],
  age: number,
  gender?: string,
  race?: string,
  // Dose-bearing medication records (AUDIT-101), threaded so dose-dependent gates
  // (high-intensity statin) can test strength, not ingredient presence. Defaults
  // to [] so legacy callers degrade to 'agent present, dose unknown' rather than
  // silently treating ingredient presence as high-intensity. The flat medCodes
  // array is retained for all dose-agnostic gates (backward compatible).
  meds: MedicationDose[] = [],
  // v3.0 ingest work-unit 1: procedure codes (CPT + SNOMED) from the patient's Procedure
  // records, threaded so procedure-gated gaps (surgical/peri-op, device-implant timing,
  // prior-procedure history) can detect. Defaults to [] so every existing caller and test
  // is unaffected (additive, backward-compatible; the AUDIT-101 meds-param precedent).
  procedureCodes: string[] = [],
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
    // Fix (AUDIT-053, 2026-05-05): was hardcoded '2481926' (UNKNOWN status — invalid CUI).
    // Now uses RXNORM_FINERENONE.FINERENONE (2562811, verified ingredient) so the rule actually fires.
    if (!medCodes.some(c => c === RXNORM_FINERENONE.FINERENONE)) {
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
  // RxNorm: dapagliflozin (1488564), empagliflozin (1545653), sotagliflozin (2638675)
  if (hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 40) {
    const SGLT2I_CODES = ['1488564', '1545653', '2638675'];
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
          triggerCriteria: ['HFrEF (LVEF <=40%) with K<5.0 and eGFR>30, no MRA (spironolactone/eplerenone) in active medications'],
          guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guideline (RALES/EMPHASIS-HF)',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hyperkalemia (K >= 5.0)', 'eGFR < 30', 'Hospice/palliative care'],
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
  // Legacy-review fix 2026-06-15: exclude E66.3 (overweight, BMI 25-29.9); the obese-HFpEF/OSA gaps
  // target obesity (BMI>=30) and bmiOver30 is the alternate gate.
  const hasObesity = dxCodes.some(c => c.startsWith('E66') && !c.startsWith('E66.3'));
  const bmiOver30 = labValues['bmi'] !== undefined && labValues['bmi'] > 30;
  if (
    hasHF &&
    (hasObesity || bmiOver30) &&
    labValues['lvef'] !== undefined && labValues['lvef'] >= 50 &&
    !medCodes.some(c => GLP1_RA_CODES_CV.includes(c)) &&  // AUDIT-104: canonical RXNORM_GLP1_RA (was ['2551758','475968']; 2551758 dead, dulaglutide now included per union membership)
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
  // Legacy-review fix 2026-06-15: HTN AND DM -> HTN OR DM. HFpEF risk is additive across factors, not a
  // required conjunction; requiring both under-fired vs the H2FPEF/guideline intent (operator ruling).
  if (
    !hasHF &&
    age > 65 &&
    labValues['bnp'] !== undefined && labValues['bnp'] > 125 &&
    (hasHTN || hasDiabetes) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Undiagnosed HFpEF screening recommended for review',
      target: 'Echocardiographic evaluation for HFpEF completed',
      recommendations: { action: 'Guideline suggests echocardiographic evaluation for occult HFpEF per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Age > 65', 'Elevated BNP > 125', 'Hypertension (I10) OR Type 2 diabetes (E11)', 'No HF diagnosis'],
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
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, remote-monitoring section. Citation corrected 2026-06-16
  //   (HF-090 fold-in): TIM-HF2 was mis-cited as THE guideline basis. The guideline addresses three RPM
  //   modalities - implantable PA-pressure sensor (GUIDE-HF/CHAMPION; the Class-2b/B-R basis), noninvasive
  //   telemonitoring (TIM-HF2 is one supporting trial, not the guideline's class basis), and device-based
  //   monitoring. TIM-HF2 is now positioned as a supporting telemonitoring trial, not the source of the 2b/B-R.
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
      recommendations: { action: 'Consider remote monitoring for high-risk HF per 2022 AHA/ACC/HFSA (implantable PA-pressure sensor per GUIDE-HF/CHAMPION, or noninvasive telemonitoring)' },
      evidence: {
        triggerCriteria: ['Heart failure diagnosis', 'BNP > 300 or LVEF < 30%'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (remote monitoring; PA-pressure-sensor 2b basis per GUIDE-HF/CHAMPION, supporting telemonitoring trial TIM-HF2)',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Already enrolled in remote monitoring', 'Hospice/palliative care'],
      },
    });
  }

  // Gap HF-30: ARNi Underdosing Review
  // Guideline: 2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure
  // Legacy-review fix 2026-06-15: added a DOSE GATE (was firing on ARNI presence alone -> over-fired on
  // patients already at target). Now fires only when a dose-bearing ARNI entry is below the 97 mg target
  // (sacubitril component of the 97/103 mg target tablet). No dose data -> suppressed (avoids the
  // over-fire). Data-limit (Path-B, HF-003 precedent): ingredient-coded entries matched; product-coded
  // or dose-less entries under-detect (safe direction); doseValue interpretation (component vs total) flagged.
  const hfARNIUnderdosed = meds.some((m: any) => m.rxNormCode === '1656339' &&
    m.doseValue !== null && m.doseValue !== undefined && m.doseValue < 97);
  if (
    hasHF &&
    hfARNIUnderdosed &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_UNDERDOSED,
      module: ModuleType.HEART_FAILURE,
      status: 'Sacubitril/valsartan dose optimization review recommended',
      target: 'ARNi dose titrated to target (97/103 mg BID) or documented rationale',
      medication: 'Sacubitril/Valsartan',
      recommendations: { action: 'Recommended for review: ARNi below target dose - consider uptitration to 97/103 mg BID per 2022 AHA/ACC/HFSA', note: 'Data-limit (Path-B): dose-target check uses ingredient-coded meds[].doseValue < 97; BID/component-vs-total interpretation not fully resolved (HF-003 precedent).' },
      evidence: {
        triggerCriteria: ['On sacubitril/valsartan (RxNorm 1656339) below target dose (<97 mg)', 'Dose below 97/103 mg BID target'],
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
    const SGLT2I_CODES_HFPEF = ['1488564', '1545653', '2638675'];
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
      // Dedup with EP-TORSADES (2026-06-16): when QTc>500 AND on a QT-prolonging drug, EP-TORSADES owns the
      // (drug-specific, more actionable) alert - EP-025 yields that case to avoid a redundant CRITICAL double-fire.
      const qtProlongingDrugs_025 = ['703', '49247', '9947', '26225', '5093', '6813']; // mirrors EP-TORSADES set
      const torsadesOwnsIt = labValues['qtc_interval'] > 500 && medCodes.some(c => qtProlongingDrugs_025.includes(c));
      const severity = labValues['qtc_interval'] > 500 ? 'CRITICAL' : 'HIGH';
            if (!torsadesOwnsIt && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
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
      const OAC_CODES = ['1364430', '1114195', '1599538', '1037042', '11289']; // DOACs + warfarin
      const onOAC = medCodes.some(c => OAC_CODES.includes(c));
      if (!onOAC && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
        const activeComponents = Object.entries(scoreComponents).filter(([, v]) => v > 0).map(([k, v]) => `${k}+${v}`).join(', ');
        // Subgroup-aware recommendation (operator safety ruling 2026-06-16): a mechanical heart valve makes
        // DOACs CONTRAINDICATED (RE-ALIGN: dabigatran harmful in mech valves) - mech-valve AF patients need
        // WARFARIN, not a DOAC. The detection (OAC missing) is correct for both subgroups; only the drug
        // recommendation differs. Mech-valve set Z95.2 (prosthetic) + Z95.4 (other replacement); Z95.3
        // (xenogenic/bioprosthetic) is EXCLUDED - bioprosthetic AF may use DOACs. ICD-10-CM verified per section 16.
        const hasMechValveEP001 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4'));
        gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.ELECTROPHYSIOLOGY,
          status: 'Oral anticoagulant not prescribed in AFib',
          target: 'OAC therapy initiated',
          medication: hasMechValveEP001 ? 'Warfarin (INR target per valve type/position; DOACs contraindicated with a mechanical valve)' : 'Apixaban, Rivaroxaban, or Edoxaban',
          recommendations: {
            action: hasMechValveEP001
              ? 'Consider warfarin with valve-appropriate INR target per 2023 ACC/AHA/ACCP/HRS AFib + 2020 ACC/AHA VHD (DOACs contraindicated with a mechanical heart valve - RE-ALIGN)'
              : 'Consider DOAC per 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 1, LOE A',
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
            // Mechanical heart valve is NO LONGER an exclusion (it is a handled subgroup - warfarin recommended
            // instead of DOAC; see hasMechValveEP001 above). Active major bleeding remains a clinical caveat.
            exclusions: ['Active major bleeding', 'Hospice/palliative care'],
          },
        });
      }
    }
  }

  // ============================================================
  // EP-006 SAFETY: Dabigatran contraindicated in CrCl<30 severe renal impairment
  // ============================================================
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 3 (Harm)
  // Rationale: FDA Pradaxa (dabigatran) prescribing information warns against use
  //   in patients with CrCl<30 mL/min (severe renal impairment). 80% renally
  //   eliminated; severe impairment causes accumulation + fatal/intracranial
  //   bleeding risk. eGFR<30 mL/min/1.73m² is clinical proxy for CrCl<30.
  // Renal threshold per established codebase convention: labValues['egfr']
  //   (lowercase, matches CAD-RENAL-MONITOR pattern at line 7812+).
  // Switch recommendation: apixaban (RxNorm 1364430) — most renal-tolerant DOAC,
  //   FDA-approved with dose adjustment (2.5mg BID) down to CrCl 15. Alternative:
  //   warfarin (RxNorm 11289) if DOAC contraindicated otherwise.
  // 2-branch compound: SAFETY when eGFR<30; structured DATA gap when eGFR
  //   undefined (preserves harm vector via fail-loud, never silent default —
  //   matches EP-RC LVEF-data-required pattern from PR #229 / EP-XX-7).
  if (medCodes.includes('1037042') && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    if (labValues['egfr'] !== undefined && labValues['egfr'] < 30) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'SAFETY: Dabigatran contraindicated in severe renal impairment (eGFR<30)',
        target: 'Switch to apixaban (preferred) or warfarin; preserve anticoagulation continuity',
        medication: 'Replace dabigatran with apixaban (RxNorm 1364430) 2.5-5mg BID with dose adjustment for renal function, OR warfarin (RxNorm 11289) if DOACs contraindicated',
        recommendations: {
          action: 'Discontinue dabigatran and substitute apixaban with renal dose adjustment per FDA Pradaxa PI + 2023 ACC/AHA AFib Class 3 (Harm)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Pradaxa (dabigatran) Prescribing Information',
          note: 'Dabigatran is 80% renally eliminated; severe renal impairment (CrCl<30 / eGFR<30) causes accumulation and fatal/intracranial bleeding risk. Apixaban is the most renal-tolerant DOAC (ARISTOTLE trial); warfarin is the safety net when DOACs contraindicated.',
        },
        evidence: {
          triggerCriteria: [
            'On dabigatran (RxNorm 1037042) in active medications',
            `eGFR: ${labValues['egfr']} mL/min/1.73m² (<30, severe renal impairment per FDA Pradaxa PI)`,
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Pradaxa Prescribing Information',
          classOfRecommendation: '3 (Harm)',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
          safetyClass: 'SAFETY',
        },
      });
    } else if (labValues['egfr'] === undefined) {
      // Missing data: fire structured DATA gap, do NOT silent-default to "no impairment".
      // Mirrors EP-RC LVEF-data-required pattern from PR #229 / EP-XX-7 mitigation.
      gaps.push({
        type: TherapyGapType.MONITORING_OVERDUE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'eGFR measurement required to evaluate dabigatran safety in renal impairment',
        target: 'eGFR documented to assess dabigatran appropriateness',
        recommendations: {
          action: 'Order eGFR (LOINC 33914-3 or 62238-1) to evaluate dabigatran renal-impairment SAFETY per FDA Pradaxa PI',
          guideline: '2023 ACC/AHA/ACCP/HRS AFib Guideline + FDA Pradaxa Prescribing Information',
          note: 'On dabigatran without recent eGFR — cannot evaluate severe-renal-impairment SAFETY contraindication. Measure eGFR; if <30, switch to apixaban or warfarin.',
        },
        evidence: {
          triggerCriteria: [
            'On dabigatran (RxNorm 1037042) in active medications',
            'No eGFR value in lab observations',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS AFib Guideline + FDA Pradaxa Prescribing Information',
          classOfRecommendation: 'Class 1 (data required for safety evaluation)',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // ============================================================
  // EP CHUNK 1 (v3.0 EP buildout, 2026-06-16): AF anticoagulation + dosing.
  // DOAC RxNorm constants are RxNav-verified ingredient (IN) codes per AUDIT_METHODOLOGY.md
  // section 16 (RXNORM_DOACS / RXNORM_WARFARIN in cardiovascularValuesets.ts); medCodes is
  // ingredient-expanded upstream (AUDIT-118) so IN-level membership matches every formulation.
  // CrCl gates use labValues['egfr'] as the renal proxy (eGFR-for-CrCl, the established EP-006 /
  // CAD-RENAL-MONITOR pattern; the CrCl-vs-Cockcroft-Gault nuance is a documented Path-B limit -
  // patient weight is not ingested). Dose read from threaded meds[] (AUDIT-101).
  // ============================================================

  // EP-003: Rivaroxaban renal dose not adjusted for CrCl.
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline (renal dose-adjust, Class 1) + FDA Xarelto PI.
  // Rivaroxaban nonvalvular AF: 20 mg daily if CrCl>50; reduce to 15 mg if CrCl 15-50; avoid if CrCl<15.
  // Scope note: covers rivaroxaban specifically (apixaban=EP-004/005, dabigatran=EP-006, edoxaban=EP-009).
  // Path-B: eGFR proxies CrCl (weight not ingested). Fires on rivaroxaban + eGFR 15-50 at >=20 mg, OR eGFR<15.
  if (medCodes.includes('1114195') && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const rivaDose = meds.find(m => m.rxNormCode === '1114195')?.doseValue;
    const egfrRiva = labValues['egfr'];
    const rivaOverForRenal = egfrRiva !== undefined && egfrRiva >= 15 && egfrRiva < 50 && rivaDose !== undefined && rivaDose !== null && rivaDose >= 20;
    const rivaAvoidLowCrCl = egfrRiva !== undefined && egfrRiva < 15;
    if (rivaOverForRenal || rivaAvoidLowCrCl) {
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'DOAC dose not adjusted for renal function (rivaroxaban)',
        target: rivaAvoidLowCrCl ? 'Switch off rivaroxaban (CrCl<15) per FDA Xarelto PI' : 'Reduce rivaroxaban to 15 mg daily for CrCl 15-50',
        medication: 'Rivaroxaban (RxNorm 1114195)',
        recommendations: {
          action: 'Consider renal dose adjustment of rivaroxaban per 2023 ACC/AHA/ACCP/HRS AFib + FDA Xarelto PI',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Xarelto (rivaroxaban) Prescribing Information',
          note: 'Rivaroxaban nonvalvular AF: 20 mg daily if CrCl>50; 15 mg if CrCl 15-50; avoid if CrCl<15. CrCl approximated by eGFR (Cockcroft-Gault weight not ingested - Path-B).',
        },
        evidence: {
          triggerCriteria: [
            'On rivaroxaban (RxNorm 1114195) in active medications',
            rivaAvoidLowCrCl ? `eGFR: ${egfrRiva} mL/min/1.73m2 (<15, rivaroxaban to be avoided)` : `eGFR: ${egfrRiva} mL/min/1.73m2 (15-50) on >=20 mg (should be 15 mg)`,
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Xarelto Prescribing Information',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Weight-based CrCl may differ from eGFR proxy (Path-B data limit)'],
        },
      });
    }
  }

  // EP-004: Apixaban dose-reduction criteria met but on full 5 mg dose.
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline + FDA Eliquis PI. Reduce to 2.5 mg BID when >=2 of:
  //   age>=80, weight<=60 kg, serum creatinine>=1.5 mg/dL. Path-B: weight not ingested, so this fires only on
  //   the age>=80 AND creatinine>=1.5 pair (2 criteria confirmed without weight - UNDER-detects, never false-positive).
  if (medCodes.includes('1364430') && age >= 80 && labValues['creatinine'] !== undefined && labValues['creatinine'] >= 1.5
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const apixDose4 = meds.find(m => m.rxNormCode === '1364430')?.doseValue;
    if (apixDose4 !== undefined && apixDose4 !== null && apixDose4 >= 5) {
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Apixaban dose reduction criteria met but on full dose',
        target: 'Reduce apixaban to 2.5 mg BID (>=2 reduction criteria met)',
        medication: 'Apixaban (RxNorm 1364430)',
        recommendations: {
          action: 'Consider reducing apixaban to 2.5 mg BID per 2023 ACC/AHA AFib + FDA Eliquis PI (>=2 of age>=80, weight<=60 kg, Cr>=1.5)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis (apixaban) Prescribing Information',
          note: 'Age>=80 and Cr>=1.5 mg/dL are 2 of 3 reduction criteria; full 5 mg dose raises bleeding risk. Weight<=60 kg criterion not ingested (Path-B - this rule under-detects weight-driven pairs).',
        },
        evidence: {
          triggerCriteria: [
            'On apixaban (RxNorm 1364430) at >=5 mg',
            `Age: ${age} (>=80)`,
            `Serum creatinine: ${labValues['creatinine']} mg/dL (>=1.5)`,
            '2 of 3 reduction criteria met (weight arm not ingested - Path-B)',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis Prescribing Information',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Weight<=60 kg not ingested (Path-B under-detect)'],
        },
      });
    }
  }

  // EP-005: Apixaban inappropriately reduced to 2.5 mg without dose-reduction criteria (reduced efficacy).
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline + FDA Eliquis PI. 2.5 mg BID requires >=2 of age>=80,
  //   weight<=60 kg, Cr>=1.5. Path-B: with age<80 AND Cr<1.5, at most 1 criterion is possible even if weight<=60,
  //   so <2 criteria is certain - under-dosing is inappropriate regardless of the un-ingested weight. Safe to fire.
  if (medCodes.includes('1364430') && age < 80 && labValues['creatinine'] !== undefined && labValues['creatinine'] < 1.5
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const apixDose5 = meds.find(m => m.rxNormCode === '1364430')?.doseValue;
    if (apixDose5 !== undefined && apixDose5 !== null && apixDose5 <= 2.5) {
      gaps.push({
        type: TherapyGapType.MEDICATION_UNDERDOSED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Apixaban inappropriately reduced without criteria',
        target: 'Increase apixaban to 5 mg BID (no dose-reduction criteria met)',
        medication: 'Apixaban (RxNorm 1364430)',
        recommendations: {
          action: 'Consider increasing apixaban to 5 mg BID per 2023 ACC/AHA AFib + FDA Eliquis PI (under-dosing reduces stroke protection)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis (apixaban) Prescribing Information',
          note: 'Age<80 and Cr<1.5 mg/dL means at most 1 of 3 reduction criteria can be met (even if weight<=60), so 2.5 mg is sub-therapeutic. Inappropriate dose reduction associates with higher stroke risk.',
        },
        evidence: {
          triggerCriteria: [
            'On apixaban (RxNorm 1364430) at <=2.5 mg',
            `Age: ${age} (<80)`,
            `Serum creatinine: ${labValues['creatinine']} mg/dL (<1.5)`,
            '<2 reduction criteria possible (weight arm cannot supply a 2nd - Path-B)',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Eliquis Prescribing Information',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)'],
        },
      });
    }
  }

  // EP-008: DOAC contraindicated in NONRHEUMATIC moderate-severe mitral stenosis (warfarin required).
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib + 2020 ACC/AHA VHD, Class 3 (Harm). DOACs are contraindicated in
  //   moderate-severe MS (excluded from RE-LY/ROCKET/ARISTOTLE; INVICTUS confirmed warfarin superiority).
  // Reconciliation (AUDIT-172, v3.0 VHD close): NARROWED to nonrheumatic MS (I34.2 only). VHD-083 OWNS the
  // rheumatic (I05.x) AF anticoagulation recommendation (its on-DOAC branch already says "switch to warfarin"),
  // so EP-008 dropped rheumatic I05.0 to avoid co-firing with VHD-083 on a rheumatic-MS patient. The rheumatic
  // case loses no coverage (VHD-083 covers it); EP-008 retains the nonrheumatic-MS DOAC-contraindication.
  const hasModSevereMS_EP008 = dxCodes.some(c => c.startsWith('I34.2'));
  const onDOAC_EP008 = medCodes.includes('1364430') || medCodes.includes('1114195') || medCodes.includes('1599538') || medCodes.includes('1037042');
  if (hasModSevereMS_EP008 && onDOAC_EP008 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'DOAC contraindicated in moderate-severe mitral stenosis',
      target: 'Switch from DOAC to warfarin (INR 2.0-3.0) for AF with nonrheumatic moderate-severe MS',
      medication: 'Warfarin (RxNorm 11289) in place of the current DOAC',
      recommendations: {
        action: 'Consider switching from DOAC to warfarin per 2023 ACC/AHA AFib + 2020 ACC/AHA VHD Class 3 (Harm)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + 2020 ACC/AHA Valvular Heart Disease Guideline',
        note: 'DOACs are not established in moderate-severe mitral stenosis (excluded from the pivotal DOAC trials; INVICTUS showed warfarin superiority in rheumatic AF). Warfarin (INR 2.0-3.0) is the standard.',
      },
      evidence: {
        triggerCriteria: [
          'Nonrheumatic moderate-severe mitral stenosis (I34.2); rheumatic MS (I05.x) is owned by VHD-083 per the AUDIT-172 reconciliation',
          'On a DOAC (apixaban / rivaroxaban / edoxaban / dabigatran)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + 2020 ACC/AHA VHD Guideline',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already on warfarin'],
      },
    });
  }

  // EP-009: Edoxaban reduced efficacy at high CrCl (CrCl>95).
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib + FDA Savaysa boxed warning. Edoxaban should NOT be used in
  //   nonvalvular AF when CrCl>95 (ENGAGE AF-TIMI 48: higher ischemic-stroke rate vs warfarin at high CrCl).
  // Path-B: eGFR proxies CrCl (weight not ingested). Fires on edoxaban + eGFR>95.
  if (medCodes.includes('1599538') && labValues['egfr'] !== undefined && labValues['egfr'] > 95
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Edoxaban reduced efficacy at high CrCl',
      target: 'Switch off edoxaban (CrCl>95) to an alternative OAC per FDA Savaysa boxed warning',
      medication: 'Alternative DOAC or warfarin in place of edoxaban (RxNorm 1599538)',
      recommendations: {
        action: 'Consider switching off edoxaban per 2023 ACC/AHA AFib + FDA Savaysa boxed warning (do not use if CrCl>95)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Savaysa (edoxaban) Prescribing Information (boxed warning)',
        note: 'Edoxaban carries a boxed warning against use in nonvalvular AF with CrCl>95 (reduced efficacy / higher ischemic-stroke rate vs warfarin in ENGAGE AF-TIMI 48). CrCl approximated by eGFR (weight not ingested - Path-B).',
      },
      evidence: {
        triggerCriteria: [
          'On edoxaban (RxNorm 1599538) in active medications',
          `eGFR: ${labValues['egfr']} mL/min/1.73m2 (>95, edoxaban boxed-warning threshold)`,
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + FDA Savaysa Prescribing Information (boxed warning)',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Weight-based CrCl may differ from eGFR proxy (Path-B data limit)'],
      },
    });
  }

  // EP-012: LAAC evaluation for high stroke risk with prior major bleed.
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 2a, LOE B. Distinct from EP-011 (OAC contraindication):
  //   this rule fires on high CHA2DS2-VASc (>=3) AND a prior major bleed, where LAAC is a guideline alternative to lifelong OAC.
  // Prior-major-bleed set reuses the verified EP-LAAC codes (D68.3, K92.2, I60-I62). LAAC-already-done excluded via
  //   threaded procedureCodes (CPT 33340). CHA2DS2-VASc computed inline (mirrors EP-OAC scoring).
  if (hasAF && !hasContraindication(dxCodes, EXCLUSION_HOSPICE) && !procedureCodes.includes(LAAC_CPT.LAAC)) {
    let cha012 = 0;
    if (dxCodes.some(c => c.startsWith('I50'))) cha012 += 1;
    if (dxCodes.some(c => c.startsWith('I10') || c.startsWith('I11') || c.startsWith('I12') || c.startsWith('I13') || c.startsWith('I15'))) cha012 += 1;
    if (age >= 75) cha012 += 2; else if (age >= 65) cha012 += 1;
    if (dxCodes.some(c => c.startsWith('E10') || c.startsWith('E11') || c.startsWith('E13') || c.startsWith('E14'))) cha012 += 1;
    if (dxCodes.some(c => c.startsWith('I63') || c.startsWith('I64') || c.startsWith('G45') || c === 'Z86.73')) cha012 += 2;
    if (dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22') || c === 'I73.9' || c.startsWith('I70.2'))) cha012 += 1;
    if (gender && (gender.toUpperCase() === 'FEMALE' || gender.toUpperCase() === 'F')) cha012 += 1;
    // GU major-bleed added (operator ruling 2026-06-16): R31.0 gross hematuria + N02 recurrent/persistent
    // hematuria (microscopic R31.1/R31.2 and epistaxis R04.0 excluded). ICD-10-CM verified per section 16.
    const priorMajorBleed_EP012 = dxCodes.some(c => c.startsWith('D68.3') || c.startsWith('K92.2') || c.startsWith('I60') || c.startsWith('I61') || c.startsWith('I62') || c === 'R31.0' || c.startsWith('N02'));
    if (cha012 >= 3 && priorMajorBleed_EP012) {
      gaps.push({
        type: TherapyGapType.DEVICE_ELIGIBLE,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'LAAC evaluation for high stroke risk with prior major bleed',
        target: 'LAAC candidacy evaluated by EP specialist',
        recommendations: {
          action: 'Consider referral for Left Atrial Appendage Closure (LAAC) evaluation per 2023 ACC/AHA/ACCP/HRS AFib (Class 2a)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
          note: 'High stroke risk (CHA2DS2-VASc>=3) with a documented prior major bleed: LAAC is a guideline alternative to lifelong oral anticoagulation. EP evaluation recommended for review.',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            `CHA2DS2-VASc score: ${cha012} (>=3)`,
            'Prior major bleed (D68.3 hemorrhagic disorder, K92.2 GI hemorrhage, or I60-I62 intracranial hemorrhage)',
            'No prior LAAC procedure (CPT 33340)',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF',
          classOfRecommendation: '2a',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Prior LAAC (CPT 33340)'],
        },
      });
    }
  }

  // ============================================================
  // EP CHUNK 2 (v3.0 EP buildout, 2026-06-16): AF rhythm + ablation. FIRST EP consumer of the
  // threaded procedureCodes param (PR #396) + the new EP_ABLATION_CPT value set (CPT verified via
  // AMA CPT Assistant / AAPC / ACC per AUDIT_METHODOLOGY.md section 16; CPT source is AMA, not RxNav).
  // Pattern A: AF (non-flutter) is the specific I48.0/.1/.2/.91 set, EXCLUDING flutter I48.3/.4.
  // Pattern B: ablation/recurrence TIMING is not ingested (procedureCodes carry no dates), so duration
  //   arms are dropped and documented. Pattern C: prior-procedure presence detected via procedureCodes.
  // Deferred (focal AT EP-075, concealed AVRT EP-077) are NOT built here: ICD-10 lumps AVNRT/AVRT/focal-AT
  //   under I47.1 (no mechanism-specific code), and EP-077 explicitly needs an EP study (data-blocked).
  // ============================================================
  const hasAFnonFlutter_EP = dxCodes.some(c => c.startsWith('I48.0') || c.startsWith('I48.1') || c.startsWith('I48.2') || c.startsWith('I48.91'));

  // EP-014: AF ablation not referred in HFrEF (CASTLE-AF). COR 2a.
  // Trigger: AF (non-flutter) + LVEF<=35 + no prior AF ablation (CPT 93656 absent).
  if (hasAFnonFlutter_EP && labValues['lvef'] !== undefined && labValues['lvef'] <= 35
      && !procedureCodes.includes(EP_ABLATION_CPT.AF_PVI) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'AF ablation not referred in HFrEF (CASTLE-AF)',
      target: 'Catheter ablation evaluation for AF with HFrEF',
      recommendations: {
        action: 'Consider referral for AF catheter ablation per 2023 ACC/AHA/ACCP/HRS AFib (CASTLE-AF, Class 2a)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline (CASTLE-AF)',
        note: 'In symptomatic AF with HFrEF (LVEF<=35%), catheter ablation reduced death/HF-hospitalization vs medical therapy (CASTLE-AF). No prior PVI (CPT 93656) on record.',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation, non-flutter (I48.0/.1/.2/.91)',
          `LVEF: ${labValues['lvef']}% (<=35, HFrEF)`,
          'No prior AF ablation procedure (CPT 93656)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline (CASTLE-AF)',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior AF ablation (CPT 93656)'],
      },
    });
  }

  // EP-071: Anticoagulation not continued after AF ablation. COR 1.
  // Trigger: prior AF ablation (CPT 93656 present) + CHA2DS2-VASc qualifying + not on OAC.
  // Path-B: the spec "OAC stopped at 3mo" duration is not ingested (procedureCodes carry no dates);
  //   this fires on the stroke-risk-qualifying + no-current-OAC state, which is the harm vector.
  if (procedureCodes.includes(EP_ABLATION_CPT.AF_PVI) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    let cha071 = 0;
    if (dxCodes.some(c => c.startsWith('I50'))) cha071 += 1;
    if (dxCodes.some(c => c.startsWith('I10') || c.startsWith('I11') || c.startsWith('I12') || c.startsWith('I13') || c.startsWith('I15'))) cha071 += 1;
    if (age >= 75) cha071 += 2; else if (age >= 65) cha071 += 1;
    if (dxCodes.some(c => c.startsWith('E10') || c.startsWith('E11') || c.startsWith('E13') || c.startsWith('E14'))) cha071 += 1;
    if (dxCodes.some(c => c.startsWith('I63') || c.startsWith('I64') || c.startsWith('G45') || c === 'Z86.73')) cha071 += 2;
    if (dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22') || c === 'I73.9' || c.startsWith('I70.2'))) cha071 += 1;
    const isFemale071 = gender !== undefined && (gender.toUpperCase() === 'FEMALE' || gender.toUpperCase() === 'F');
    if (isFemale071) cha071 += 1;
    const qualifies071 = cha071 >= (isFemale071 ? 3 : 2);
    const onOAC071 = OAC_CODES_CV.some(c => medCodes.includes(c));
    if (qualifies071 && !onOAC071) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Anticoagulation not continued after AF ablation',
        target: 'Resume/continue OAC after AF ablation (stroke risk is driven by CHA2DS2-VASc, not ablation success)',
        medication: 'Apixaban, Rivaroxaban, Edoxaban, or Warfarin',
        recommendations: {
          action: 'Consider continuing OAC after AF ablation per 2023 ACC/AHA/ACCP/HRS AFib (Class 1; decision is CHA2DS2-VASc-driven, independent of rhythm outcome)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
          note: 'Post-ablation stroke prophylaxis is governed by CHA2DS2-VASc, NOT by ablation success. Prior PVI (CPT 93656) on record, stroke-risk-qualifying, with no current OAC. Path-B: the "stopped at 3 months" duration is not ingested - this fires on the qualifying + off-OAC state.',
        },
        evidence: {
          triggerCriteria: [
            'Prior AF ablation procedure (CPT 93656)',
            `CHA2DS2-VASc score: ${cha071} (qualifying)`,
            'No current oral anticoagulant',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
          classOfRecommendation: '1',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Ablation-procedure date not ingested (Path-B)'],
        },
      });
    }
  }

  // EP-072: Redo AF ablation evaluation after recurrence. COR 2a.
  // Trigger: prior AF ablation (CPT 93656 present) + AF still coded + ON an antiarrhythmic (AAD).
  // Tightened (operator ruling 2026-06-16): the on-AAD gate distinguishes GENUINE recurrence (back on
  //   rhythm-control drug post-ablation) from a lingering AF problem-list code, suppressing the noise case.
  // Path-B (ingestion worklist): symptom status and the 3-month post-ablation blanking period are not
  //   ingested - on-AAD is the recurrence proxy until ablation dates + symptom flowsheets are available.
  if (procedureCodes.includes(EP_ABLATION_CPT.AF_PVI) && hasAFnonFlutter_EP
      && AAD_CODES_CV.some(c => medCodes.includes(c)) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Redo AF ablation evaluation after recurrence',
      target: 'Re-evaluate for redo ablation vs rhythm-vs-rate strategy after AF recurrence',
      recommendations: {
        action: 'Consider redo-ablation evaluation for recurrent AF after prior PVI per 2023 ACC/AHA/ACCP/HRS AFib (Class 2a)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        note: 'Prior AF ablation (CPT 93656) with AF still on the active problem list suggests recurrence; redo ablation is reasonable for symptomatic recurrence. Path-B: symptom status and the 3-month post-ablation blanking period are not ingested - clinician confirms genuine recurrence.',
      },
      evidence: {
        triggerCriteria: [
          'Prior AF ablation procedure (CPT 93656)',
          'Atrial fibrillation still coded (I48.0/.1/.2/.91)',
          'On an antiarrhythmic drug (recurrence proxy - back on rhythm control post-ablation)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Symptom status + blanking-period timing not ingested (Path-B)'],
      },
    });
  }

  // EP-074: CTI ablation not offered for typical atrial flutter. COR 1.
  // Trigger: typical atrial flutter (I48.3) + no prior SVT/CTI ablation (CPT 93653 absent).
  // Path-B: "symptomatic" status is not ingested - dropped.
  if (dxCodes.some(c => c.startsWith('I48.3')) && !procedureCodes.includes(EP_ABLATION_CPT.SVT)
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'CTI ablation not offered for typical atrial flutter',
      target: 'Cavotricuspid isthmus (CTI) ablation evaluation for typical atrial flutter',
      recommendations: {
        action: 'Consider CTI catheter ablation for typical atrial flutter per 2023 ACC/AHA/ACCP/HRS AFib (Class 1; high success, low risk)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        note: 'CTI ablation for typical (cavotricuspid-isthmus-dependent) atrial flutter is Class 1 - high success, durable, low complication. No prior SVT/CTI ablation (CPT 93653) on record. Path-B: symptom status not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Typical atrial flutter (I48.3)',
          'No prior SVT/CTI ablation procedure (CPT 93653)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior CTI ablation (CPT 93653)', 'Symptom status not ingested (Path-B)'],
      },
    });
  }

  // EP-076: SVT ablation not offered for recurrent SVT on antiarrhythmic. COR 1.
  // Trigger: SVT (I47.1) + on an antiarrhythmic (AAD) + no prior SVT ablation (CPT 93653 absent).
  // Scope note: ICD-10 I47.1 does NOT distinguish AVNRT / AVRT / focal AT (no mechanism-specific code),
  //   so this single rule covers the detectable recurrent-SVT-on-AAD population collectively. EP-075 (focal
  //   AT) and EP-077 (concealed AVRT, needs EP study) are not separately buildable from ingested data.
  // Path-B: "recurrent" status is not ingested; the on-AAD gate is the proxy for failed medical therapy.
  if (dxCodes.some(c => c.startsWith('I47.1')) && AAD_CODES_CV.some(c => medCodes.includes(c))
      && !procedureCodes.includes(EP_ABLATION_CPT.SVT) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'SVT ablation not offered for recurrent SVT on antiarrhythmic',
      target: 'Catheter ablation evaluation for symptomatic SVT on antiarrhythmic therapy',
      recommendations: {
        action: 'Consider catheter ablation for recurrent symptomatic SVT on antiarrhythmic per 2023 ACC/AHA/ACCP/HRS AFib/SVT (Class 1)',
        guideline: '2023 ACC/AHA/ACCP/HRS Guideline (SVT management)',
        note: 'Recurrent SVT (I47.1 - AVNRT/AVRT/focal AT) on an antiarrhythmic is a Class 1 catheter-ablation indication (curative, AAD-sparing). No prior SVT ablation (CPT 93653). Mechanism (AVNRT vs AVRT vs AT) is not ICD-codable; clinician confirms at EP study. Path-B: recurrence not ingested - on-AAD is the failed-medical-therapy proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Supraventricular tachycardia (I47.1)',
          'On an antiarrhythmic drug (flecainide / amiodarone / sotalol / dofetilide / dronedarone)',
          'No prior SVT ablation procedure (CPT 93653)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline (SVT management)',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior SVT ablation (CPT 93653)', 'Mechanism not ICD-codable; recurrence not ingested (Path-B)'],
      },
    });
  }

  // ============================================================
  // EP CHUNK 3 (v3.0 EP buildout, 2026-06-16): VT/VF ablation + CIED management. Uses threaded
  // procedureCodes (PR #396) + EP_ABLATION_CPT (93654 VT) + the new CIED_IMPLANT_CPT / CIED_EXTRACTION_CPT
  // value sets (all CPT verified via AMA/CMS/AAPC per AUDIT_METHODOLOGY.md section 16). dx codes: I47.2 VT,
  // I42.0/.8/.9 non-ischemic CM, I44.1/.2 AV block, I49.5 sick sinus, T82.7 CIED infection (all section-16 verified).
  // Deferred (NOT built): EP-035 (post-AVR pacer - needs an AVR CPT set, out of CIED scope; its AV-block signal
  // is subsumed by EP-029), EP-036 (leadless-discussion - process/counseling gap), EP-086 (VT storm - the >=3
  // episodes/24h count is device-telemetry-blocked), EP-090 (near-duplicate of EP-034, same extraction evaluator).
  // ============================================================
  const hasVT_EP = dxCodes.some(c => c.startsWith('I47.2'));
  const hasNICM_EP = dxCodes.some(c => c.startsWith('I42.0') || c.startsWith('I42.8') || c.startsWith('I42.9'));
  const onAmiodarone_EP = medCodes.includes('703'); // amiodarone (RXNORM_QT_PROLONGING.AMIODARONE)
  const hasPacemaker_EP = [CIED_IMPLANT_CPT.PACEMAKER_ATRIAL, CIED_IMPLANT_CPT.PACEMAKER_VENTRICULAR, CIED_IMPLANT_CPT.PACEMAKER_DUAL, CIED_IMPLANT_CPT.LEADLESS_PACEMAKER].some(c => procedureCodes.includes(c));
  const hasICD_EP = [CIED_IMPLANT_CPT.ICD, CIED_IMPLANT_CPT.SICD].some(c => procedureCodes.includes(c));
  const hasAnyCIED_EP = hasPacemaker_EP || hasICD_EP;
  const hasVTablation_EP = procedureCodes.includes(EP_ABLATION_CPT.VT);
  const hasExtraction_EP = Object.values(CIED_EXTRACTION_CPT).some(c => procedureCodes.includes(c));

  // EP-020: VT catheter ablation not offered for ischemic VT on antiarrhythmic. COR 2a.
  // Trigger: VT (I47.2) + ischemic heart disease (I25) + on an AAD + no prior VT ablation (CPT 93654).
  if (hasVT_EP && hasCAD && AAD_CODES_CV.some(c => medCodes.includes(c)) && !hasVTablation_EP
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'VT catheter ablation not offered for ischemic VT on antiarrhythmic',
      target: 'Catheter ablation evaluation for ischemic ventricular tachycardia',
      recommendations: {
        action: 'Consider VT catheter ablation for ischemic VT on antiarrhythmic per 2017 AHA/ACC/HRS VA Guideline (Class 2a)',
        guideline: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        note: 'Recurrent ischemic VT on antiarrhythmic therapy is a Class 2a catheter-ablation indication (scar-related re-entry substrate). No prior VT ablation (CPT 93654) on record.',
      },
      evidence: {
        triggerCriteria: [
          'Ventricular tachycardia (I47.2)',
          'Ischemic heart disease (I25.*)',
          'On an antiarrhythmic drug',
          'No prior VT ablation (CPT 93654)',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior VT ablation (CPT 93654)'],
      },
    });
  }

  // EP-021: VT substrate evaluation not pursued in non-ischemic cardiomyopathy. COR 2a.
  // Trigger: VT (I47.2) + non-ischemic CM (I42.0/.8/.9) + NOT ischemic (distinguishes from EP-020) + no VT ablation.
  if (hasVT_EP && hasNICM_EP && !hasCAD && !hasVTablation_EP && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'VT substrate evaluation not pursued in non-ischemic cardiomyopathy',
      target: 'EP study / substrate mapping for VT in non-ischemic cardiomyopathy',
      recommendations: {
        action: 'Consider EP study and substrate-based VT ablation for NICM-associated VT per 2017 AHA/ACC/HRS VA Guideline (Class 2a)',
        guideline: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        note: 'NICM-associated monomorphic VT warrants EP study / substrate mapping (often epicardial substrate). No prior VT ablation (CPT 93654). Ischemic disease absent - this is the non-ischemic substrate pathway.',
      },
      evidence: {
        triggerCriteria: [
          'Ventricular tachycardia (I47.2)',
          'Non-ischemic cardiomyopathy (I42.0/.8/.9)',
          'No ischemic heart disease (I25) coded',
          'No prior VT ablation (CPT 93654)',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior VT ablation (CPT 93654)'],
      },
    });
  }

  // EP-022: VT ablation not considered before amiodarone escalation (VANISH). COR 2a.
  // Trigger: ischemic VT + ICD present (CPT 33249/33270) + on amiodarone + no VT ablation (CPT 93654).
  // Path-B: VANISH enrolled ICD patients with VT despite AAD; ICD-delivered-shock counts are not ingested,
  //   so ICD-presence + on-amiodarone is the proxy for the recurrent-VT-on-amiodarone population.
  if (hasVT_EP && hasCAD && hasICD_EP && onAmiodarone_EP && !hasVTablation_EP
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'VT ablation not considered before amiodarone escalation (VANISH)',
      target: 'Catheter ablation as an alternative to escalating amiodarone for recurrent VT with an ICD',
      recommendations: {
        action: 'Consider VT catheter ablation rather than escalating amiodarone per VANISH / 2017 AHA/ACC/HRS VA Guideline (Class 2a)',
        guideline: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias (VANISH)',
        note: 'VANISH: in ICD patients with ischemic VT recurring despite antiarrhythmic, catheter ablation reduced the composite of death/VT-storm/appropriate-shock vs escalating antiarrhythmic. ICD present + on amiodarone + no prior VT ablation. Path-B: ICD-shock counts not ingested - ICD-presence + amiodarone is the recurrence proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Ventricular tachycardia (I47.2) with ischemic heart disease (I25)',
          'Implantable defibrillator present (CPT 33249 or 33270)',
          'On amiodarone (RxNorm 703)',
          'No prior VT ablation (CPT 93654)',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias (VANISH)',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prior VT ablation (CPT 93654)', 'ICD-shock counts not ingested (Path-B)'],
      },
    });
  }

  // EP-029: Pacemaker not implanted for Class I bradycardia indication. COR 1.
  // Trigger: complete AV block (I44.2) OR sick sinus syndrome (I49.5) + NO existing CIED (a pacemaker/leadless OR
  //   an ICD - ICDs pace transvenously, so they close the gap).
  // Intervention-stakes breadth (operator ruling 2026-06-16): I44.1 (Mobitz/2nd-degree) DROPPED from the trigger -
  //   2nd-degree block is Class 1 only when SYMPTOMATIC, and symptom status is not ingested; a pacemaker IMPLANT
  //   should not fire on asymptomatic Mobitz-I. The symptomatic-2nd-degree population is a Path-B deferral
  //   (buildable once symptom/flowsheet data is ingested). Complete AV block (I44.2) is Class 1 regardless of
  //   symptoms; SND (I49.5) symptom status is itself a Path-B note below.
  if (dxCodes.some(c => c.startsWith('I44.2') || c.startsWith('I49.5'))
      && !hasAnyCIED_EP && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Pacemaker not implanted for Class I bradycardia indication',
      target: 'Permanent pacemaker evaluation for high-grade AV block or sinus node dysfunction',
      recommendations: {
        action: 'Consider permanent pacemaker for complete AV block / symptomatic SND per 2018 ACC/AHA/HRS Bradycardia Guideline (Class 1)',
        guideline: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
        note: 'Complete (third-degree) AV block is a Class 1 pacing indication independent of symptoms; sick sinus syndrome is Class 1 when symptomatic. No pacemaker/ICD on record. Mobitz/2nd-degree (I44.1) is excluded from this trigger (Class 1 only when symptomatic; symptom not ingested - Path-B). Path-B: SND symptom status not ingested - clinician confirms.',
      },
      evidence: {
        triggerCriteria: [
          'Complete AV block (I44.2) or sick sinus syndrome (I49.5)',
          'No existing pacemaker, leadless pacemaker, or ICD on record',
        ],
        guidelineSource: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing CIED', 'Asymptomatic Mobitz-I / 2nd-degree (I44.1) - symptom not ingested (Path-B)', 'SND symptom status not ingested (Path-B)'],
      },
    });
  }

  // EP-034 (covers EP-090): Full CIED system extraction not performed for device infection. COR 1.
  // Trigger: a CIED present (CPT 33206/.07/.08/33249/33270/33274) + CIED infection (T82.7) + NO extraction
  //   procedure (CPT 33244/33241/33234/33235) on record.
  if (hasAnyCIED_EP && dxCodes.some(c => c.startsWith('T82.7')) && !hasExtraction_EP
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Full CIED system extraction not performed for device infection',
      target: 'Complete device + lead extraction for confirmed CIED infection',
      recommendations: {
        action: 'Consider complete CIED system (generator + all leads) extraction for device infection per 2017 HRS CIED Infection Consensus (Class 1)',
        guideline: '2017 HRS Expert Consensus on Lead Management and CIED Infection',
        note: 'A confirmed CIED infection (pocket or systemic) requires COMPLETE hardware removal - partial removal / antibiotics alone is inadequate (Class 1). A CIED is present, an infection is coded, and no extraction procedure is on record. Re-implantation is staged after clearance.',
      },
      evidence: {
        triggerCriteria: [
          'CIED present (pacemaker / ICD / leadless - CPT 33206-33208 / 33249 / 33270 / 33274)',
          'CIED infection (T82.7*)',
          'No extraction procedure (CPT 33244 / 33241 / 33234 / 33235)',
        ],
        guidelineSource: '2017 HRS Expert Consensus on Lead Management and CIED Infection',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Extraction already performed'],
      },
    });
  }

  // EP-092: S-ICD not considered for young primary-prevention ICD candidate without pacing need. COR 2a.
  // Trigger: LVEF<=35 (primary-prevention ICD substrate) + age<50 + NO pacing indication (no AV block / SND)
  //   + NO existing defibrillator + QRS<150 (NOT a CRT candidate). STANDING RECOMMENDATION-SUBGROUP CHECK:
  //   an S-ICD cannot pace, so the S-ICD recommendation does NOT hold for a CRT-eligible patient (LVEF<=35 +
  //   wide QRS needs a transvenous CRT-D), nor for a bradycardia-pacing patient - both are excluded here.
  if (labValues['lvef'] !== undefined && labValues['lvef'] <= 35 && age < 50
      && !dxCodes.some(c => c.startsWith('I44.2') || c.startsWith('I44.1') || c.startsWith('I49.5'))
      && !hasICD_EP && !hasPacemaker_EP
      && !(labValues['qrs_duration'] !== undefined && labValues['qrs_duration'] >= 150)
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'S-ICD not considered for young primary-prevention ICD candidate without pacing need',
      target: 'Subcutaneous ICD (S-ICD) evaluation for a young patient with no pacing/CRT indication',
      recommendations: {
        action: 'Consider a subcutaneous ICD (S-ICD) for a young primary-prevention candidate with no pacing or CRT need per 2017 AHA/ACC/HRS VA Guideline (Class 2a)',
        guideline: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        note: 'A young (age<50) primary-prevention ICD candidate (LVEF<=35) with NO bradycardia-pacing indication and NO CRT indication (QRS<150) avoids decades of transvenous-lead risk with an S-ICD. Excluded if pacing/CRT is needed (S-ICD cannot pace). Path-B: ICD candidacy inferred from LVEF; anti-tachycardia-pacing need not separately ingested.',
      },
      evidence: {
        triggerCriteria: [
          `LVEF: ${labValues['lvef']}% (<=35, primary-prevention ICD substrate)`,
          `Age: ${age} (<50)`,
          'No bradycardia-pacing indication (no AV block / SND)',
          'No CRT indication (QRS<150)',
          'No existing defibrillator',
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Ventricular Arrhythmias',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Pacing indication (AV block / SND)', 'CRT candidate (QRS>=150)', 'Existing defibrillator'],
      },
    });
  }

  // ============================================================
  // EP CHUNK 4 (v3.0 EP buildout, 2026-06-16): bradycardia/syncope + LAAC remainder (final EP authoring chunk).
  // dx: I95.1 orthostatic hypotension (section-16 verified); reuses RATE_CONTROL_CODES_CV / RAAS_CODES_CV /
  // OAC_CODES_CV / P2Y12_CODES_CV. Standing recommendation-subgroup check applied per gap.
  // Deferred (data-blocked, to register): EP-031 (vasovagal/recurrence not codable - R55 too broad), EP-094
  // (exertional pattern not codable), EP-101 (needs a coronary-angiography CPT set + acute-inpatient pathway).
  // ============================================================
  const onAVNBlocker_EP = RATE_CONTROL_CODES_CV.some(c => medCodes.includes(c)) || medCodes.includes('3407'); // BB/non-DHP CCB + digoxin

  // EP-030: Symptomatic bradycardia on AV-nodal blocker - reduce/stop the drug before a pacer decision. COR 1.
  // Trigger: HR<50 + on an AV-nodal blocker (BB / non-DHP CCB / digoxin) + NO pacemaker yet.
  // STANDING SUBGROUP CHECK: complete AV block (I44.2) is EXCLUDED - it is structural/drug-independent and needs
  //   pacing (EP-029), NOT "reduce the drug first"; the med-reduction recommendation would be wrong for that subgroup.
  if (labValues['heart_rate'] !== undefined && labValues['heart_rate'] < 50 && onAVNBlocker_EP
      && !dxCodes.some(c => c.startsWith('I44.2')) && !hasPacemaker_EP
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Bradycardia on AV-nodal blocker: reduce drug before pacemaker decision',
      target: 'Reduce/discontinue the AV-nodal blocker and reassess before committing to a pacemaker',
      recommendations: {
        action: 'Consider reducing or stopping the AV-nodal blocker (reversible cause) before a pacemaker decision per 2018 ACC/AHA/HRS Bradycardia Guideline',
        guideline: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
        note: 'Drug-induced bradycardia is a reversible cause - guidelines advise removing the offending AV-nodal agent (beta-blocker / non-DHP CCB / digoxin) and reassessing the rhythm before implanting a permanent pacemaker. Complete AV block (structural) is excluded - that needs pacing, not dose reduction.',
      },
      evidence: {
        triggerCriteria: [
          `Heart rate: ${labValues['heart_rate']} bpm (<50)`,
          'On an AV-nodal blocker (beta-blocker / non-DHP CCB / digoxin)',
          'No complete AV block (I44.2) - reversible drug cause plausible',
          'No existing pacemaker',
        ],
        guidelineSource: '2018 ACC/AHA/HRS Guideline on Evaluation and Management of Bradycardia',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Complete AV block (I44.2 - needs pacing)', 'Existing pacemaker'],
      },
    });
  }

  // EP-033: Chronic AF with awake HR<40 on rate-control - adjust meds vs permanent pacing. COR.
  // Trigger: AF + HR<40 + on a rate-control agent + NO pacemaker. Path-B: "awake" qualifier and sustained
  //   pattern are not ingested (a single low HR could be nocturnal); clinician confirms the awake pattern.
  if (hasAF && labValues['heart_rate'] !== undefined && labValues['heart_rate'] < 40 && onAVNBlocker_EP
      && !hasPacemaker_EP && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Chronic AF with HR<40 on rate control: adjust medication vs pacing',
      target: 'Reduce rate-control dose first; pace if bradycardia persists off/at minimal rate control',
      recommendations: {
        action: 'Consider reducing rate-control medication before pacing for AF with HR<40 per 2023 ACC/AHA/ACCP/HRS AFib + 2018 Bradycardia Guideline',
        guideline: '2023 ACC/AHA/ACCP/HRS AFib + 2018 ACC/AHA/HRS Bradycardia Guideline',
        note: 'In chronic AF with an excessively slow ventricular response (HR<40) on rate-control therapy, over-suppression is often iatrogenic - reduce the rate-control agent first; pace only if symptomatic bradycardia persists at minimal/no rate control. Path-B: the awake/sustained pattern is not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation (I48.*)',
          `Heart rate: ${labValues['heart_rate']} bpm (<40)`,
          'On a rate-control agent',
          'No existing pacemaker',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS AFib + 2018 ACC/AHA/HRS Bradycardia Guideline',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing pacemaker', 'Awake/sustained pattern not ingested (Path-B)'],
      },
    });
  }

  // EP-097: Orthostatic hypotension on BP-lowering therapy - medication review. COR 1.
  // Trigger: orthostatic hypotension (I95.1) + on a BP-lowering agent (RAAS / beta-blocker / CCB / diuretic /
  //   alpha-blocker). Alpha-blockers (RXNORM_ALPHA_BLOCKERS - tamsulosin/doxazosin/terazosin/alfuzosin/silodosin/
  //   prazosin; a common OH culprit) added to the set 2026-06-16, closing the prior Path-B under-detection.
  if (dxCodes.some(c => c.startsWith('I95.1'))
      && ([...RAAS_CODES_CV, ...BB_CODES_CV, ...RATE_CONTROL_CODES_CV, ...codes(RXNORM_LOOP_DIURETICS), ...codes(RXNORM_THIAZIDES), ...codes(RXNORM_ALPHA_BLOCKERS)].some(c => medCodes.includes(c)))
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Orthostatic hypotension on BP-lowering therapy: medication review',
      target: 'Reconcile/deprescribe BP-lowering agents contributing to orthostatic hypotension',
      recommendations: {
        action: 'Consider medication review and deprescribing of BP-lowering agents per 2017 ACC/AHA Syncope Guideline (orthostatic hypotension)',
        guideline: '2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Syncope',
        note: 'Orthostatic hypotension is frequently iatrogenic - antihypertensives, vasodilators, diuretics, and alpha-blockers commonly precipitate or worsen it. A structured medication review/deprescribing pass is first-line.',
      },
      evidence: {
        triggerCriteria: [
          'Orthostatic hypotension (I95.1)',
          'On a BP-lowering agent (RAAS / beta-blocker / CCB / loop or thiazide diuretic / alpha-blocker)',
        ],
        guidelineSource: '2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Syncope',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // EP-067: Post-LAAC antithrombotic protocol - patient on NO antithrombotic after LAAC. COR.
  // Trigger: LAAC implant (CPT 33340) present + NOT on any antithrombotic (no OAC, no P2Y12, no aspirin).
  // Path-B: the precise post-LAAC sequence (e.g. OAC/DAPT 45d -> DAPT -> aspirin) and its timing are not ingested;
  //   this fires on the clear SAFETY floor - a post-LAAC patient on nothing (device-thrombus / stroke risk).
  // STANDING SUBGROUP CHECK: the recommendation is the post-LAAC ANTIPLATELET protocol (DAPT then aspirin) - it
  //   does NOT blanket-recommend OAC, since many LAAC patients had LAAC precisely because OAC was contraindicated.
  if (procedureCodes.includes(LAAC_CPT.LAAC) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onAntithrombotic_EP067 = OAC_CODES_CV.some(c => medCodes.includes(c))
      || P2Y12_CODES_CV.some(c => medCodes.includes(c))
      || medCodes.includes('1191'); // aspirin (acetylsalicylic acid ingredient)
    if (!onAntithrombotic_EP067) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: 'Post-LAAC patient not on any antithrombotic therapy',
        target: 'Antithrombotic per post-LAAC protocol (antiplatelet-based; OAC only if not contraindicated)',
        medication: 'Post-LAAC antiplatelet regimen (e.g. DAPT then aspirin); OAC only if not contraindicated',
        recommendations: {
          action: 'Consider the guideline post-LAAC antithrombotic regimen per device IFU / 2023 ACC/AHA/ACCP/HRS AFib (device-thrombus and residual stroke risk persist)',
          guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + LAAC device IFU',
          note: 'A post-LAAC patient on NO antithrombotic is at risk of device-related thrombus and residual stroke during endothelialization. The protocol is antiplatelet-based (DAPT then aspirin); OAC is recommended ONLY if not contraindicated (many LAAC patients had an absolute OAC contraindication - do not blanket-recommend OAC). Path-B: the exact post-procedure sequence/timing is not ingested.',
        },
        evidence: {
          triggerCriteria: [
            'Prior LAAC implant (CPT 33340)',
            'No oral anticoagulant, no P2Y12 inhibitor, and no aspirin on the active medication list',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline + LAAC device IFU',
          classOfRecommendation: '2a',
          levelOfEvidence: 'B',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Post-procedure regimen sequence/timing not ingested (Path-B)'],
        },
      });
    }
  }

  // ============================================================
  // EP-079 CRITICAL: Pre-excited AF + AVN blocker contraindicated (risk of VF)
  // ============================================================
  // Guideline: 2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline, Class 3 (Harm), LOE B.
  // Spec: CK v4.0 §6.2 line 352 — "WPW + AF on beta-blocker/CCB/digoxin - risk of VF" (CRITICAL).
  // Mechanism: AVN blockade in WPW + AF removes the safety governor on rapid accessory-pathway
  //   conduction → 1:1 AV conduction at AF rate → ventricular fibrillation (fatal arrhythmia).
  // CRITICAL severity: highest CK v4.0 harm tier (escalated above plain SAFETY) — fatal arrhythmia.
  // Recommendation: discontinue AVN blocker; switch to procainamide (RxNorm 8700) or amiodarone
  //   (RxNorm 703) — Class 1a/III antiarrhythmics that preserve accessory-pathway refractoriness
  //   without nodal blockade. Definitive: catheter ablation (Class 1).
  // Verification: All RxNorm constants verified via RxNav properties.json on 2026-05-05 per
  //   AUDIT_METHODOLOGY.md §16. Procainamide 8700 reflects post-AUDIT-042 correction (codebase
  //   previously had 8787 = propranolol). Nadolol 7226 reflects post-AUDIT-043 correction
  //   (codebase BB_CODES_LQTS/SCAD previously had 7512 = norepinephrine). Single-branch design
  //   (categorical inputs only — no labs, no thresholds; no DATA gap branch needed).
  const hasWPW_EP079 = dxCodes.some(c => c.startsWith('I45.6'));
  // 8 BBs + 2 non-DHP CCBs + digoxin ingredient + 3 formulations (RxNav verified 2026-05-05).
  // Nadolol 7226 = post-AUDIT-043 correction; procainamide/amiodarone (switch targets) cited in recommendation text.
  const AVN_BLOCKER_CODES_EP079 = [
    '6918', '20352', '19484', '7226', '1202', '8787', '49737', '6185',  // BBs: metoprolol, carvedilol, bisoprolol, nadolol, atenolol, propranolol, esmolol, labetalol
    '3443', '11170',                                                     // non-DHP CCBs: diltiazem, verapamil
    '3407',                                                              // digoxin ingredient (AUDIT-118: formulations roll up via expandToIngredients)
  ];
  if (
    hasWPW_EP079 && hasAF &&
    medCodes.some(c => AVN_BLOCKER_CODES_EP079.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'CRITICAL: AV nodal blocker contraindicated in pre-excited AF (WPW + AF) — risk of ventricular fibrillation',
      target: 'Discontinue AVN blocker; switch to procainamide or amiodarone; expedite EP referral for ablation',
      medication: 'Replace AVN blocker (BB / non-DHP CCB / digoxin) with procainamide (RxNorm 8700) or amiodarone (RxNorm 703); definitive: catheter ablation (Class 1)',
      recommendations: {
        action: 'Discontinue AVN-blocking medication and substitute Class 1a (procainamide) or Class III (amiodarone) antiarrhythmic; expedite electrophysiology referral for catheter ablation per 2023 ACC/AHA/ACCP/HRS AFib Guideline Class 3 (Harm)',
        guideline: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        note: 'CRITICAL SAFETY: AVN blockade (beta-blocker / non-DHP CCB / digoxin) in WPW + AF removes the safety governor on rapid accessory-pathway conduction. Result: 1:1 AV conduction at AF rate → ventricular fibrillation (fatal arrhythmia). Procainamide and amiodarone preserve accessory-pathway refractoriness without nodal blockade. Catheter ablation is Class 1 for definitive management.',
      },
      evidence: {
        triggerCriteria: [
          'WPW syndrome diagnosis (I45.6 — pre-excitation)',
          'Atrial fibrillation diagnosis (I48.x)',
          'Active AVN-blocking medication (beta-blocker / non-DHP CCB / digoxin)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'CRITICAL',
      },
    });
  }

  // ============================================================
  // EP-LAAC: LAAC Device Evaluation for AFib with OAC Contraindication
  // ============================================================
  // Guideline: 2023 ACC/AHA/ACCP/HRS AFib Guideline, Class 2a, LOE B
  // AFib + age>=65 + contraindication to OAC (documented allergy Z88 or bleeding history)
  if (hasAF && age >= 65 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    // Upgrade for the LAAC rule (AUDIT-120 / GAP-EP-011, v3.0 EP chunk 1 2026-06-16): removed the bare `Z88` (allergy status to
    // ANY drug) over-detection - it fired on penicillin/sulfa allergy etc., not an OAC contraindication.
    // The OAC-contraindication trigger is a documented bleeding/hemorrhagic-disorder history only.
    // GU major-bleed added (operator ruling 2026-06-16): R31.0 gross hematuria (visible blood; microscopic
    // R31.1/R31.2 deliberately EXCLUDED - not a major bleed) + N02 recurrent/persistent hematuria. Epistaxis
    // (R04.0) kept OUT per ruling. ICD-10-CM verified via icd10data / AAPC per AUDIT_METHODOLOGY.md section 16.
    const hasOACContraindication = dxCodes.some(c =>
      c.startsWith('D68.3') || c.startsWith('K92.2') || c.startsWith('I60') || c.startsWith('I61') || c.startsWith('I62')
      || c === 'R31.0' || c.startsWith('N02')
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
  // EP-ABLATION: AFib catheter-ablation candidate (symptomatic AF on antiarrhythmic, NOT yet ablated)
  // ============================================================
  // Guideline: 2023 ACC/AHA AFib (CABANA), Class 2a, LOE B-R.
  // Relabel of GAP-EP-015 (2026-06-16): previously fired on AF + HF (which is the CASTLE-AF population - now owned by
  // EP-014). This rule is now the NON-HF symptomatic-AF pathway: AF + on an antiarrhythmic (failed/ongoing
  // rhythm-control = symptomatic proxy) + age<80 + NOT yet ablated (no CPT 93656). HF cases route to EP-014.
  if (hasAF && !hasHF && age < 80 && AAD_CODES_CV.some(c => medCodes.includes(c))
      && !procedureCodes.includes(EP_ABLATION_CPT.AF_PVI) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider AFib catheter ablation referral (symptomatic AF on antiarrhythmic)',
      target: 'EP consultation for ablation candidacy completed',
      recommendations: {
        action: 'Consider referral to electrophysiology for catheter ablation evaluation per 2023 ACC/AHA AFib (CABANA, Class 2a)',
        guideline: '2023 ACC/AHA AFib Guideline (CABANA)',
        note: 'Symptomatic AF on antiarrhythmic therapy and not yet ablated - catheter ablation is a Class 2a rhythm-control option. HF + AF (CASTLE-AF) is handled by EP-014. Path-B: symptom status is proxied by being on an antiarrhythmic.',
      },
      evidence: {
        triggerCriteria: [
          'Atrial fibrillation diagnosis (I48.*)',
          'On an antiarrhythmic drug (symptomatic-AF / rhythm-control proxy)',
          `Age: ${age} (<80)`,
          'No heart failure (HF + AF routes to EP-014 / CASTLE-AF)',
          'No prior AF ablation (CPT 93656)',
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (CABANA)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Age >= 80', 'Prior AF ablation (CPT 93656)', 'HF present (routes to EP-014)'],
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
  // On dofetilide (RxNorm 49247) -- requires in-hospital initiation and QTc monitoring
  if (medCodes.includes('49247') && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
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
            'Dofetilide active (RxNorm 49247)',
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
    if (medCodes.includes('3407')) { // digoxin ingredient (AUDIT-118: formulations roll up via expandToIngredients)
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
  // Tightening (AUDIT-174, CAD chunk 0 2026-06-18): the prior gate hasStentOrCAD = hasCAD || Z95.5 over-fired
  // "P2Y12 not active" on stable chronic CAD, where single antiplatelet therapy suffices. DAPT is guideline-
  // indicated only in the post-ACS / post-PCI window, so gate on recent ACS (I21/I22, inlined - hasRecentMI is
  // defined later in this function) OR coronary stent/angioplasty implant status (Z95.5, section-16-verified).
  // P2Y12 RxNorm codes: clopidogrel (32968), prasugrel (613391), ticagrelor (1116632).
  const hasDaptIndication = dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22') || c.startsWith('Z95.5'));
  const P2Y12_CODES = ['32968', '613391', '1116632'];
  const onP2Y12 = medCodes.some(c => P2Y12_CODES.includes(c));
  if (hasDaptIndication && !onP2Y12) {
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
  // Guideline: 2018 AHA/ACC/Multisociety Blood Cholesterol Guideline
  //   (Grundy et al., Circulation 2019;139:e1082-e1143), Class 1, LOE A.
  // Clinical ASCVD (hasCAD, ICD-10 I25.*) warrants HIGH-INTENSITY statin therapy:
  // atorvastatin 40-80mg or rosuvastatin 20-40mg (LDL-C reduction >=50%).
  // Detection is dose-aware (AUDIT-101) via highIntensityStatinStatus (agent
  // identity + mg threshold), NOT ingredient presence. The prior ingredient set
  // ['83367','301542','36567','42463'] could not encode dose and wrongly included
  // simvastatin/pravastatin, silently suppressing the gap for patients NOT on
  // high-intensity therapy. The gap now fires for everyone not on high-intensity,
  // with a QUALIFIED status when a statin is on file but the dose is undocumented
  // (structured-data / fail-loud, sibling to the L-code data-quality pattern).
  if (hasCAD) {
    const statinStatus = highIntensityStatinStatus(meds);
    if (statinStatus !== 'on_high_intensity' && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      const doseUnknown = statinStatus === 'agent_dose_unknown';
      gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.CORONARY_INTERVENTION,
          status: doseUnknown
            ? 'Statin present; high-intensity dosing not documented in CAD - confirm or intensify'
            : 'High-intensity statin not prescribed in CAD',
          target: 'Statin therapy initiated',
          medication: 'Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
          recommendations: {
            action: doseUnknown
              ? 'Statin on file without a documented high-intensity dose; confirm current dose or intensify to atorvastatin 40-80mg or rosuvastatin 20-40mg per 2018 ACC/AHA Cholesterol, Class 1, LOE A'
              : 'Consider high-intensity statin per 2018 ACC/AHA Cholesterol, Class 1, LOE A',
            guideline: '2018 ACC/AHA Cholesterol Management',
          },
              evidence: {
          triggerCriteria: [
            doseUnknown
              ? 'CAD (ICD-10 I25.*) on atorvastatin/rosuvastatin with high-intensity dose not documented'
              : 'CAD (ICD-10 I25.*) with no high-intensity statin in active medications',
          ],
          guidelineSource: '2018 ACC/AHA Cholesterol Guideline',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Documented statin intolerance', 'Active liver disease', 'Hospice/palliative care'],
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
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // All mechanical valve patients require lifelong warfarin (INR 2.5-3.5)
  // RxNorm warfarin: 11289
  // Fix (AUDIT-164, 2026-06-16): DROPPED Z95.3 (xenogenic / BIOPROSTHETIC valve) from the mechanical-valve set.
  // Bioprosthetic valves neither contraindicate a DOAC nor mandate lifelong warfarin - including Z95.3 caused
  // a CRITICAL-severity false-positive in the shared EP DOAC-contraindication rule (gap-vd-6, RE-ALIGN Class 3
  // Harm) AND an over-broad fire in the VD mechanical-valve-warfarin rule. Mechanical = Z95.2 (prosthetic) +
  // Z95.4 (other replacement) only. ICD-10-CM verified per AUDIT_METHODOLOGY.md section 16.
  const hasMechanicalValve = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.4')
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
            action: 'Consider warfarin per 2020 ACC/AHA VHD Guideline, Class 1, LOE B',
            guideline: '2020 ACC/AHA Valvular Heart Disease',
          },
              evidence: {
          triggerCriteria: ['Mechanical heart valve (Z95.2 or Z95.4)', 'Warfarin (RxNorm 11289) not on active medication list'],
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

  // Gap PV-1: High-Intensity Statin Missing in PAD
  // Guideline: 2024 ACC/AHA/Multisociety Lower Extremity PAD Guideline
  //   (Gornik et al., Circulation 2024;149:e1313-e1410), Class 1, LOE A:
  //   patients with symptomatic / established lower-extremity PAD (I70.2*, I73.9)
  //   should be treated with HIGH-INTENSITY statin therapy. The high-intensity
  //   tier is the same as ASCVD secondary prevention (atorvastatin 40-80mg or
  //   rosuvastatin 20-40mg, LDL-C reduction >=50%; 2018 AHA/ACC Cholesterol
  //   Guideline tier referenced directly by the PAD guideline).
  // Dose-aware detection (AUDIT-101) via highIntensityStatinStatus, shared with the
  // CAD high-intensity gate. Identical prior ingredient-set defect (could not
  // encode dose; wrongly included simvastatin/pravastatin) is corrected here too.
  // Fires for everyone not on high-intensity, with a QUALIFIED status on
  // documented-statin / undocumented-dose (fail-loud, never silent-suppress).
  const hasPAD = dxCodes.some(c => c.startsWith('I73.9') || c.startsWith('I70.2'));
  if (hasPAD) {
    const padStatinStatus = highIntensityStatinStatus(meds);
    if (padStatinStatus !== 'on_high_intensity' && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      const doseUnknown = padStatinStatus === 'agent_dose_unknown';
      gaps.push({
          type: TherapyGapType.MEDICATION_MISSING,
          module: ModuleType.PERIPHERAL_VASCULAR,
          status: doseUnknown
            ? 'Statin present; high-intensity dosing not documented in PAD - confirm or intensify'
            : 'High-intensity statin not prescribed in PAD',
          target: 'Statin therapy initiated',
          medication: 'Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
          recommendations: {
            action: doseUnknown
              ? 'Statin on file without a documented high-intensity dose; confirm current dose or intensify to atorvastatin 40-80mg or rosuvastatin 20-40mg per 2024 ACC/AHA PAD Guideline, Class 1, LOE A'
              : 'Consider high-intensity statin per 2024 ACC/AHA PAD Guideline, Class 1, LOE A',
            guideline: '2024 ACC/AHA Peripheral Artery Disease',
          },
          evidence: {
            triggerCriteria: [
              doseUnknown
                ? 'PAD (ICD-10 I70.2*/I73.9) on atorvastatin/rosuvastatin with high-intensity dose not documented'
                : 'PAD (ICD-10 I70.2*/I73.9) without high-intensity statin',
            ],
            guidelineSource: '2024 ACC/AHA Guideline for Peripheral Artery Disease',
            classOfRecommendation: '1',
            levelOfEvidence: 'A',
            exclusions: ['Statin intolerance', 'Active liver disease', 'Hospice/palliative care'],
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
          triggerCriteria: ['HFrEF (LVEF <=40%) with no RAAS inhibitor (ACEi/ARB/ARNi) in active medications'],
          guidelineSource: '2022 AHA/ACC/HFSA Heart Failure Guideline (PARADIGM-HF)',
          classOfRecommendation: '1',
          levelOfEvidence: 'A',
          exclusions: ['Hyperkalemia (K >= 5.0)', 'Bilateral renal artery stenosis', 'History of angioedema', 'Pregnancy', 'Hospice/palliative care'],
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

  // Tightening (AUDIT-173, CAD chunk 0 2026-06-18): the single CAD-REHAB rule fired on hasCAD alone (every CAD
  // patient), over-detecting. SPLIT into the two guideline-anchored populations the spec gaps actually target:
  // post-CABG (CAD-029, Z95.1 aortocoronary-bypass-status, section-16-verified) and post-MI (CAD-046, acute
  // I21/I22 or old I25.2, section-16-verified). The CABG/MI gate is the load-bearing over-detection fix.
  // Path-B (rehab-engagement guard deferred, proxy investigation 2026-06-18): no reliable rehab-participation
  // signal exists in pre-DUA data - ICD-10-CM has no cardiac-rehab-participation code (it is a service, not a
  // diagnosis; Z48.812 / Z71.82 are confounders); CPT 93797/93798 are inert (absent from all synthetic/seed
  // data) and Synthea codes procedures as SNOMED, not CPT. Post-DUA: add a guard reading BOTH CPT 93797/93798
  // AND the SNOMED cardiac-rehab procedure code. Until then the residual false-positive (re-recommending rehab
  // to an already-enrolled patient) is an accepted low-harm limitation.
  const hasCABG_rehab = dxCodes.some(c => c.startsWith('Z95.1'));
  const hasMI_rehab = hasRecentMI || dxCodes.some(c => c.startsWith('I25.2'));

  // CAD-REHAB-CABG: Post-CABG cardiac rehab referral (CAD-029)
  // Guideline: 2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization, Class 1, LOE A
  if (hasCABG_rehab && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'Post-CABG cardiac rehabilitation referral not documented',
      target: 'Cardiac rehab referral placed for post-CABG patient',
      recommendations: {
        action: 'Refer to cardiac rehabilitation for the post-CABG patient per 2021 ACC/AHA Coronary Revascularization, Class 1, LOE A',
        guideline: '2021 ACC/AHA/SCAI Coronary Artery Revascularization',
        note: 'Cardiac rehab is a Class 1 recommendation after CABG. Gated on aortocoronary-bypass status (Z95.1). Path-B: the already-enrolled-in-rehab guard is deferred (no reliable pre-DUA rehab-participation signal; CPT 93797/93798 inert, no ICD code); a CPT + SNOMED procedure guard is added post-DUA.',
      },
      evidence: {
        triggerCriteria: ['Post-CABG (Z95.1) without documented cardiac rehabilitation referral'],
        guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Revascularization',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Severe functional limitation', 'Hospice/palliative care'],
      },
    });
  }

  // CAD-REHAB-MI: Post-MI cardiac rehab referral (CAD-046)
  // Guideline: 2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization, Class 1, LOE A
  if (hasMI_rehab && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'Post-MI cardiac rehabilitation referral not documented',
      target: 'Cardiac rehab referral placed for post-MI patient',
      recommendations: {
        action: 'Refer to cardiac rehabilitation for the post-MI patient per 2021 ACC/AHA Coronary Revascularization, Class 1, LOE A',
        guideline: '2021 ACC/AHA/SCAI Coronary Artery Revascularization',
        note: 'Cardiac rehab is a Class 1 recommendation after MI. Gated on MI (acute I21/I22 or old I25.2). Path-B: the already-enrolled-in-rehab guard is deferred (no reliable pre-DUA rehab-participation signal; CPT 93797/93798 inert, no ICD code); a CPT + SNOMED procedure guard is added post-DUA.',
      },
      evidence: {
        triggerCriteria: ['Post-MI (I21/I22/I25.2) without documented cardiac rehabilitation referral'],
        guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Revascularization',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Severe functional limitation', 'Hospice/palliative care'],
      },
    });
  }

  // ============================================================
  // SH CHUNK 1 (v3.0 SH buildout, 2026-06-17): Aortic stenosis severity. Reads the now-threaded echo-severity
  // measures (echo-severity threading unlock, PR #404): aortic_valve_mean_gradient / aortic_valve_area /
  // aortic_valve_vmax / valve_severity (0-5 ordinal). Pattern A: AS = I35.0 specifically (not broad I35).
  // ============================================================
  // concordantSevereAS: the CONFIRMED severe-AS gate for the AVR-INTERVENE gaps (SH-002/006). Operator LFLG
  // ruling (2026-06-17, confirm-then-intervene): use ONLY the unambiguous high-gradient definitions (mean
  // gradient>=40 OR Vmax>=4.0) plus an explicit severe grade (valve_severity>=5). AVA<=1.0 ALONE is NOT used
  // here - a small AVA with a LOW gradient is LFLG (severity UNCERTAIN pending DSE), which routes to SH-003
  // (low-EF LFLG -> DSE) / SH-004 (paradoxical LFLG -> confirm) for severity confirmation FIRST, not to AVR.
  const concordantSevereAS =
    (labValues['aortic_valve_mean_gradient'] !== undefined && labValues['aortic_valve_mean_gradient'] >= 40) ||
    (labValues['aortic_valve_vmax'] !== undefined && labValues['aortic_valve_vmax'] >= 4.0) ||
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 5);
  // Any prosthetic AV already present (Z95.2/.3/.4) = already replaced -> exclude from "AVR not done" gaps.
  // (ANY replacement code is correct here, independent of the Z95.2/Z95.3 mechanical-vs-bio inversion that the
  // AUDIT-123/124 cluster concerns - that inversion lands at the valve-CHOICE recommendation, NOT this exclusion.)
  const hasAnyProstheticValve_SH = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4'));
  const symptomaticAS = dxCodes.some(c => c.startsWith('I50') || c.startsWith('R55') || c.startsWith('I20'));

  // Gap SH-002: Severe SYMPTOMATIC AS - AVR not referred. COR 1.
  // Tightening (AUDIT-125): the prior rule fired on I35.0 + age>=65 + LVEF-present (an "echo-performed" proxy with
  // NO severity gate -> over-detected mild/moderate AS). Now gated on the threaded severe-AS severity + a symptom dx.
  // Path-B: AVR-referral/procedure status is not ingested (no AVR/TAVR CPT set yet, chunk-2/3) - the prosthetic-valve
  // exclusion removes already-replaced patients; the referral-absence arm is a documented Path-B.
  if (hasAorticStenosis && concordantSevereAS && symptomaticAS && !hasAnyProstheticValve_SH
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'AVR not referred for severe symptomatic aortic stenosis',
      target: 'Heart valve team AVR evaluation (SAVR vs TAVR by age/surgical-risk/anatomy)',
      recommendations: {
        // STANDING SUBGROUP CHECK: symptomatic severe AS is a Class 1 intervention indication, but the MODALITY
        // is subgroup-dependent (younger/low-risk -> SAVR; older/high-risk -> TAVR) - recommend heart-team AVR
        // evaluation, NOT blanket TAVR (the prior rule's error for young low-risk patients).
        action: 'Refer to heart valve team for AVR evaluation per 2020 ACC/AHA VHD (Class 1, LOE A); modality (SAVR vs TAVR) by age, surgical risk, and valve anatomy',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Symptomatic severe AS is a Class 1 AVR indication. Modality is heart-team-determined: SAVR is generally preferred at younger age / lower surgical risk; TAVR at older age / higher risk or favorable anatomy.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic stenosis (I35.0)',
          'Concordant severe AS (mean gradient >=40, Vmax >=4.0, or valve_severity >=5; AVA-alone-low-gradient LFLG routes to SH-003/004)',
          'Symptomatic (HF I50 / syncope R55 / angina I20)',
          'No prosthetic aortic valve already present',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prosthetic AV already present (Z95.2/.3/.4)', 'AVR-referral status not ingested (Path-B)'],
      },
    });
  }

  // Gap SH-006: Asymptomatic severe AS + LV dysfunction (Class IIa AVR). COR 2a.
  // Trigger: severe AS + LVEF<55 + NOT symptomatic + no prosthetic AV. (The lower-LVEF subset escalates per
  // guideline; the >=50-<55 band + the abnormal-stress arm are the 2a triggers; stress-test result not threaded.)
  if (hasAorticStenosis && concordantSevereAS && labValues['lvef'] !== undefined && labValues['lvef'] < 55
      && !symptomaticAS && !hasAnyProstheticValve_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'AVR not referred for asymptomatic severe AS with LV dysfunction (Class IIa)',
      target: 'Heart valve team AVR evaluation for asymptomatic severe AS with LVEF<55',
      recommendations: {
        action: 'Consider heart valve team AVR evaluation for asymptomatic severe AS with LVEF<55 per 2020 ACC/AHA VHD (Class 2a)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Asymptomatic severe AS with declining LV function warrants AVR before irreversible LV damage. LVEF<50 is a Class 1 indication; LVEF 50-<55 (or an abnormal exercise test, not ingested) is Class 2a. Modality (SAVR vs TAVR) is heart-team-determined.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic stenosis (I35.0)',
          'Concordant severe AS (mean gradient >=40, Vmax >=4.0, or valve_severity >=5; AVA-alone-low-gradient LFLG routes to SH-003/004)',
          `LVEF: ${labValues['lvef']}% (<55)`,
          'Asymptomatic (no HF/syncope/angina dx)',
          'No prosthetic aortic valve already present',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prosthetic AV present (Z95.2/.3/.4)', 'Exercise-test arm not ingested (Path-B)'],
      },
    });
  }

  // Gap SH-003: Low-flow low-gradient (classical, low-EF) AS - dobutamine stress echo not performed. COR 1.
  // Trigger: LVEF<50 + AVA<1.0 + mean gradient<40 (the classical LFLG pattern). DSE differentiates true-severe
  // from pseudo-severe AS. Path-B: a DSE/stress-echo procedure code is not ingested (no stress-echo CPT set yet) -
  // fires on the LFLG-pattern recognition; the DSE-done exclusion is a documented Path-B.
  if (hasAorticStenosis && labValues['lvef'] !== undefined && labValues['lvef'] < 50
      && labValues['aortic_valve_area'] !== undefined && labValues['aortic_valve_area'] < 1.0
      && labValues['aortic_valve_mean_gradient'] !== undefined && labValues['aortic_valve_mean_gradient'] < 40
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Low-flow low-gradient AS: dobutamine stress echo not performed',
      target: 'Dobutamine stress echo to differentiate true-severe from pseudo-severe AS',
      recommendations: {
        action: 'Consider dobutamine stress echocardiography for classical low-flow low-gradient AS per 2020 ACC/AHA VHD (Class 1)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Low EF + small AVA + low mean gradient is classical LFLG AS - dobutamine stress echo distinguishes true-severe AS (which benefits from AVR) from pseudo-severe AS (afterload-mismatch). Path-B: stress-echo procedure status not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic stenosis (I35.0)',
          `LVEF: ${labValues['lvef']}% (<50)`,
          `AVA: ${labValues['aortic_valve_area']} cm2 (<1.0)`,
          `Mean gradient: ${labValues['aortic_valve_mean_gradient']} mmHg (<40) - low-flow low-gradient`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Stress-echo procedure status not ingested (Path-B)'],
      },
    });
  }

  // Gap SH-004: Paradoxical low-flow low-gradient AS (preserved EF). COR 2a.
  // Trigger: LVEF>=50 + AVA<1.0 + mean gradient<40 (small valve area, low gradient, NORMAL EF). Path-B: the
  // confirmatory stroke-volume index (SVi<35) is NOT threaded - this fires on the preserved-EF discordant pattern
  // and recommends an integrated SVi/flow assessment to confirm paradoxical-LFLG severe AS.
  if (hasAorticStenosis && labValues['lvef'] !== undefined && labValues['lvef'] >= 50
      && labValues['aortic_valve_area'] !== undefined && labValues['aortic_valve_area'] < 1.0
      && labValues['aortic_valve_mean_gradient'] !== undefined && labValues['aortic_valve_mean_gradient'] < 40
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Paradoxical low-flow low-gradient AS: stroke-volume/flow assessment needed',
      target: 'Integrated stroke-volume-index / flow assessment to confirm paradoxical-LFLG severe AS',
      recommendations: {
        action: 'Consider stroke-volume-index and integrated flow assessment for preserved-EF discordant AS per 2020 ACC/AHA VHD (Class 2a)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Small AVA + low gradient with PRESERVED EF suggests paradoxical low-flow low-gradient severe AS (low stroke-volume index despite normal EF). Confirm with SVi (<35 mL/m2) and integrated assessment. Path-B: stroke-volume index not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic stenosis (I35.0)',
          `LVEF: ${labValues['lvef']}% (>=50, preserved)`,
          `AVA: ${labValues['aortic_valve_area']} cm2 (<1.0)`,
          `Mean gradient: ${labValues['aortic_valve_mean_gradient']} mmHg (<40) - discordant with small AVA`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Stroke-volume index (SVi) not ingested (Path-B)'],
      },
    });
  }

  // Gap SH-050: Moderate AS - severity-grading / surveillance + integrated clarification. COR 1 (surveillance).
  // Trigger: AS + AVA in the moderate range (1.0 < AVA <= 1.5). Path-B: CT-derived annular sizing is not threaded;
  // the recommendation is periodic re-grading + integrated (CT-AVA) clarification when echo is discordant.
  // Scope note: the severe (SH-002/006) and LFLG (SH-003/004, AVA<1.0) cases are handled above; SH-050 is the
  // moderate-range watch. Overlap boundary with the LFLG gaps flagged for operator review.
  if (hasAorticStenosis && labValues['aortic_valve_area'] !== undefined
      && labValues['aortic_valve_area'] > 1.0 && labValues['aortic_valve_area'] <= 1.5
      && !hasAnyProstheticValve_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Moderate AS: severity-grading surveillance / integrated clarification',
      target: 'Periodic AS re-grading; integrated (CT-AVA) clarification when echo measures are discordant',
      recommendations: {
        action: 'Consider periodic re-grading of moderate AS and integrated (CT-derived AVA / annular) clarification when echo is discordant per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Moderate AS (AVA 1.0-1.5 cm2) warrants periodic surveillance; when echo measures are discordant or borderline, CT-derived AVA / annular sizing clarifies severity. Path-B: CT-annular measurements not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic stenosis (I35.0)',
          `AVA: ${labValues['aortic_valve_area']} cm2 (1.0-1.5, moderate range)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-EO',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prosthetic AV present (Z95.2/.3/.4)', 'CT-annular sizing not ingested (Path-B)'],
      },
    });
  }

  // ============================================================
  // Gap VD-2: Echo Surveillance for Bioprosthetic Valve
  // ============================================================
  // Guideline: 2020 ACC/AHA Valvular Heart Disease Guideline, Class 1, LOE C
  // Bioprosthetic valve patients require annual echo surveillance for structural valve deterioration (SVD).
  // Fix (AUDIT-123, 2026-06-17): broad predicate = Z95.3 (xenogenic/bioprosthetic, the ACTUAL bio code) OR
  //   Z95.2 (prosthetic, generic) OR Z95.4 (other replacement). The prior set excluded Z95.3, so it MISSED
  //   genuine bioprosthetic patients. Broad is safety-first here per operator ruling: missing a bio patient is
  //   the harm; a mechanical patient getting a surveillance-echo nudge is harmless. (Z95.4 kept from prior.)
  // Fires when: bioprosthetic valve present AND no recent echo (LVEF not available as proxy)
  const hasBioprostheticValve = dxCodes.some(c =>
    c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4')
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

  // ============================================================
  // SH CHUNK 2 (v3.0 SH buildout, 2026-06-17): Mitral regurgitation severity. Reads the threaded MR severity
  // (echo-severity unlock PR #404): mitral_eroa / mitral_regurg_grade (0-4) / valve_severity (0-5) / pasp.
  // PRIMARY vs SECONDARY MR: ICD-10 I34.0 covers BOTH (no separate code). secondaryMRContext (functional MR
  // from LV dysfunction) is proxied by HF (I50) + reduced LVEF; the PRIMARY (degenerative) gaps below EXCLUDE it
  // because secondary MR is GDMT-first-then-TEER (COAPT), NOT primary surgical repair (the MR subgroup distinction).
  // ============================================================
  const hasMitralRegurg = dxCodes.some(c => c.startsWith('I34.0'));
  const severeMR =
    (labValues['mitral_eroa'] !== undefined && labValues['mitral_eroa'] >= 0.40) ||
    (labValues['mitral_regurg_grade'] !== undefined && labValues['mitral_regurg_grade'] >= 4) ||
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 5);
  // secondaryMRContext: functional MR driven by LV systolic dysfunction (HF + reduced EF). Such patients route
  // to GDMT-first then TEER (COAPT) - NOT to the primary surgical gaps. Path-B: a definitive primary-vs-secondary
  // echo classification is not ingested; HF + LVEF<50 is the secondary proxy.
  const secondaryMRContext = hasHF && labValues['lvef'] !== undefined && labValues['lvef'] < 50;
  const symptomaticMR = dxCodes.some(c => c.startsWith('R06') || c.startsWith('R00') || c.startsWith('I50'));

  // Gap SH-014: Severe PRIMARY MR - surgical referral. COR 1 (symptomatic) / 2a (asymptomatic + LV trigger).
  // Tightening (AUDIT-125): the prior rule fired on I34.0 + (LVEF<60 OR symptomatic) with NO severity gate (over-
  // detected mild/moderate MR). Now gated on the threaded severe-MR severity + PRIMARY context.
  if (hasMitralRegurg && severeMR && !secondaryMRContext
      && (symptomaticMR || (labValues['lvef'] !== undefined && labValues['lvef'] <= 60))
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Surgical referral not documented for severe primary mitral regurgitation',
      target: 'Heart valve team mitral surgery evaluation (repair preferred over replacement)',
      recommendations: {
        // STANDING SUBGROUP CHECK: PRIMARY (degenerative) severe MR -> SURGICAL MV REPAIR (preferred) or
        // replacement, NOT TEER. TEER is for SECONDARY MR (GDMT-first, COAPT) or prohibitive-surgical-risk primary
        // MR - those are excluded here (secondaryMRContext) so this never recommends primary surgery to a
        // functional-MR patient. Repair-vs-replacement is heart-team-determined by valve anatomy.
        action: 'Refer to heart valve team for mitral valve surgery (repair preferred over replacement) per 2020 ACC/AHA VHD (Class 1)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Class 1 when symptomatic; the asymptomatic-with-LV-trigger subset (LVEF 30-60% or LV dilation) is a Class 2a indication. Severe PRIMARY (degenerative) MR warrants surgical MV repair (durable, preferred) over replacement. Distinct from SECONDARY/functional MR (GDMT-first then TEER per COAPT), which is excluded here.',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          'Severe MR (EROA >=0.40, regurg grade >=4, or valve_severity >=5)',
          'Primary/degenerative context (not HF+LVEF<50 secondary/functional MR)',
          'Symptomatic (R06/R00/I50) or LVEF <=60%',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Secondary/functional MR (routes to GDMT/TEER)', 'Prior MV intervention not position-specifically codable (Path-B)'],
      },
    });
  }

  // Gap SH-016: Severe primary MR + new AF - surgical Class IIa.
  if (hasMitralRegurg && severeMR && !secondaryMRContext && dxCodes.some(c => c.startsWith('I48'))
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Surgery not considered for severe primary MR with new atrial fibrillation (Class IIa)',
      target: 'Heart valve team MV repair evaluation for severe primary MR + AF',
      recommendations: {
        action: 'Consider MV surgery (repair preferred) for asymptomatic severe primary MR with new AF per 2020 ACC/AHA VHD (Class 2a)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'New AF in asymptomatic severe PRIMARY MR is a Class 2a trigger for MV surgery (repair preferred). Secondary/functional MR excluded.',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          'Severe MR (EROA >=0.40, regurg grade >=4, or valve_severity >=5)',
          'Primary/degenerative context',
          'Atrial fibrillation (I48.*)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Secondary/functional MR'],
      },
    });
  }

  // Gap SH-017: Severe primary MR + pulmonary hypertension (PASP>50) - surgical Class IIa.
  if (hasMitralRegurg && severeMR && !secondaryMRContext
      && labValues['pasp'] !== undefined && labValues['pasp'] > 50
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Surgery not considered for severe primary MR with pulmonary hypertension (Class IIa)',
      target: 'Heart valve team MV repair evaluation for severe primary MR + PASP>50',
      recommendations: {
        action: 'Consider MV surgery (repair preferred) for asymptomatic severe primary MR with PASP>50 mmHg per 2020 ACC/AHA VHD (Class 2a)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Pulmonary hypertension (resting PASP>50) in asymptomatic severe PRIMARY MR is a Class 2a surgical trigger (repair preferred). Secondary/functional MR excluded.',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          'Severe MR (EROA >=0.40, regurg grade >=4, or valve_severity >=5)',
          'Primary/degenerative context',
          `PASP: ${labValues['pasp']} mmHg (>50)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Secondary/functional MR'],
      },
    });
  }

  // ===== v3.0 SH chunk 3: Tricuspid regurgitation severity (SH-022 / SH-069 / SH-023) =====
  // Severe TR now reads the THREADED echo severity (PR #404 + chunk-3 LOINC map-add): tr_regurg_grade is a
  // 0-4 numeric TR grade (4 = severe), and valve_severity is the cross-valve 0-5 ordinal (5 = severe). The
  // 2017 ASE extended scale (massive/torrential) maps to valve_severity 5 / tr_regurg_grade 4.
  const hasTRdx = dxCodes.some(c => c.startsWith('I36.1'));
  const severeTR =
    (labValues['tr_regurg_grade'] !== undefined && labValues['tr_regurg_grade'] >= 4) ||
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 5);
  // NYHA II+ proxy (Path-B for true NYHA + diuretic status): right-heart congestion - peripheral edema (R60),
  // hepatomegaly (R16), ascites (R18), right HF (I50.81).
  const trCongestionSymptoms = dxCodes.some(c =>
    c.startsWith('R60') || c.startsWith('R16') || c.startsWith('R18') || c.startsWith('I50.81')
  );
  // CIED lead presence (Z95.0 pacemaker, Z95.810 ICD) partitions SH-023 (lead present) vs SH-069 (no lead),
  // so for any severe symptomatic-TR patient exactly one device-pathway gap layers onto SH-022.
  const hasCIEDLead_TR = dxCodes.some(c => c.startsWith('Z95.0') || c.startsWith('Z95.810'));

  // Gap SH-022: Severe TR -> transcatheter (T-TEER/TTVR) evaluation gap (AUDIT-125 severity-gated)
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 2a for severe symptomatic TR); TRILUMINATE / CLASP-TR.
  // Tightening (AUDIT-125, v3.0 chunk 3): the prior SH-4 fired on I36.1 + congestion symptoms with NO severity
  // gate, so mild TR + edema-of-another-cause over-detected. Now gated on SEVERE TR. Path-B: T-TEER/TTVR
  // referral status is not ingested, so this surfaces the underreferred severe-TR population, not a confirmed
  // referral gap.
  if (hasTRdx && severeTR && trCongestionSymptoms && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Severe symptomatic TR: transcatheter tricuspid (T-TEER/TTVR) evaluation gap',
      target: 'Heart-team transcatheter tricuspid evaluation (T-TEER vs TTVR) completed',
      recommendations: {
        action: 'Consider heart-team transcatheter tricuspid evaluation (T-TEER or TTVR) for severe symptomatic TR per 2020 ACC/AHA VHD (Class 2a); TRILUMINATE / CLASP-TR pathways',
        guideline: '2020 ACC/AHA Valvular Heart Disease; TRILUMINATE / CLASP-TR',
        note: 'Severity-gated on threaded echo (tr_regurg_grade>=4 or valve_severity>=5). Path-B: NYHA class + diuretic status + prior-referral status not ingested - surfaces the underreferred severe-TR population.',
      },
      evidence: {
        triggerCriteria: [
          'Tricuspid regurgitation (I36.1)',
          'Severe TR (tr_regurg_grade >=4 or valve_severity >=5)',
          'Right-heart congestion (edema R60, hepatomegaly R16, ascites R18, or right HF I50.81) - NYHA II+ proxy',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; TRILUMINATE / CLASP-TR',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe pulmonary hypertension as primary etiology', 'Irreversible RV dysfunction'],
      },
    });

    // Gap SH-069: Evoque TTVR (TRISCEND) candidacy - the NO-lead severe-TR device pathway
    // Guideline: 2020 ACC/AHA VHD Guideline; TRISCEND II (Evoque transcatheter tricuspid valve REPLACEMENT).
    // Device selection: patients with severe TR whose valve anatomy is unsuitable for edge-to-edge repair
    // (large coaptation gap) are TTVR candidates. Path-B: coaptation-gap morphology / T-TEER eligibility is
    // NOT threaded (echo-morphology, DUA-deferred per the deferred-gap register), so this surfaces the
    // non-lead severe-TR population for TTVR-vs-TEER device selection, not a confirmed T-TEER-ineligible call.
    if (!hasCIEDLead_TR) {
      gaps.push({
        type: TherapyGapType.PROCEDURE_INDICATED,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Severe TR (no CIED lead): Evoque TTVR (TRISCEND) candidacy for device selection',
        target: 'TTVR-vs-T-TEER device selection assessed (coaptation-gap morphology at heart team)',
        recommendations: {
          action: 'Consider transcatheter tricuspid valve replacement (Evoque/TRISCEND) candidacy when valve anatomy is unsuitable for edge-to-edge repair, per 2020 ACC/AHA VHD device-selection pathway',
          guideline: '2020 ACC/AHA Valvular Heart Disease; TRISCEND II (Evoque TTVR)',
          note: 'Path-B: coaptation-gap morphology / T-TEER eligibility not ingested (echo-morphology, DUA-deferred). Partitioned to the NO-CIED-lead severe-TR population.',
        },
        evidence: {
          triggerCriteria: [
            'Tricuspid regurgitation (I36.1)',
            'Severe TR (tr_regurg_grade >=4 or valve_severity >=5)',
            'No CIED lead present (not Z95.0 / Z95.810)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; TRISCEND II',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE B-NR',
          exclusions: ['Hospice/palliative care (Z51.5)', 'CIED lead present (routes to SH-023 lead-status pathway)', 'Irreversible RV dysfunction'],
        },
      });
    }

    // Gap SH-023: TR device selection with CIED lead - lead-status + coaptation-gap pathway
    // Guideline: 2020 ACC/AHA VHD Guideline. A transvalvular RV lead (Z95.0/Z95.810) can be a CONTRIBUTOR to
    // severe TR and complicates transcatheter device selection (a lead in the coaptation plane affects T-TEER).
    // Lead status must be assessed (and lead extraction considered) before/with device selection.
    // Path-B: coaptation-gap morphology is NOT threaded (echo-morphology); lead presence IS (Z95.0/Z95.810).
    if (hasCIEDLead_TR) {
      gaps.push({
        type: TherapyGapType.PROCEDURE_INDICATED,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Severe TR with CIED lead: device selection requires lead-status + coaptation-gap assessment',
        target: 'Lead-status (lead-induced TR / extraction candidacy) and coaptation-gap device selection assessed',
        recommendations: {
          action: 'Consider lead-status assessment (transvalvular RV lead as TR contributor; lead-extraction candidacy) alongside transcatheter device selection for severe TR per 2020 ACC/AHA VHD',
          guideline: '2020 ACC/AHA Valvular Heart Disease',
          note: 'Path-B: coaptation-gap morphology not ingested (echo-morphology, DUA-deferred). CIED lead presence (Z95.0/Z95.810) IS threaded - partitioned to the lead-present severe-TR population.',
        },
        evidence: {
          triggerCriteria: [
            'Tricuspid regurgitation (I36.1)',
            'Severe TR (tr_regurg_grade >=4 or valve_severity >=5)',
            'CIED lead present (Z95.0 pacemaker or Z95.810 ICD) - transvalvular lead may contribute to TR',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 2a',
          levelOfEvidence: 'LOE C-LD',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Irreversible RV dysfunction'],
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
  // Patients with prosthetic aortic valve AND aortic stenosis history need post-procedure follow-up.
  // Fix (AUDIT-123, 2026-06-17, GAP-SH-011): added Z95.3 (xenogenic) - TAVR/SAVR tissue valves are bioprosthetic
  //   and may be coded Z95.3 or the generic Z95.2, so the prior Z95.2-only predicate missed Z95.3-coded patients.
  const hasProstheticAorticValve = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3'));
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
          'Prosthetic aortic valve (Z95.2 or Z95.3 xenogenic)',
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

  // Gap SH-9 (gap-sh-9-pfo-closure): SUPERSEDED 2026-06-17 by SH-026 (v3.0 SH chunk 5). Firing removed.
  // Superseded (AUDIT-127 resolution): the legacy PFO-closure rule fired on I63.9 + age<60 + Q21.1 (broad ASD/PFO
  // code) with NO coded stroke-etiology exclusion, over-firing on non-cryptogenic (e.g. AF-cardioembolic) strokes
  // - the AUDIT-127 over-detection. The properly-scoped SH-026 (PFO Q21.12 specific + cryptogenic I63.x + age<60 +
  // EXCLUDES AF I48.x) replaces it. Supersede-not-delete: the registry entry gap-sh-9-pfo-closure is retained for
  // canonical lineage (reconciled at this close to SPEC_ONLY). Same precedent as SH-12 -> SH-022 (AUDIT-167).

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
            'Mechanical valve (Z95.2 or Z95.4)',
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

  // ===== v3.0 VHD chunk 1: AR + mixed/integrated valve severity =====
  // Reads the threaded echo severity (echo-severity unlock PR #404 + SH chunk-3 vena-contracta map-add):
  // valve_severity (0-5 grade-preserving), aortic_vena_contracta (cm, AR width), mitral_eroa, mitral_regurg_grade,
  // mitral_vena_contracta, lvef. Severe AR = valve_severity>=5 OR aortic_vena_contracta>=0.6 cm (a vena-contracta
  // width >=0.6 cm is the guideline severe-AR cut). LVESD is NOT threaded (Path-B arm dropped, documented).
  const hasAorticRegurg = dxCodes.some(c => c.startsWith('I35.1') || c.startsWith('I35.2'));
  const severeAR =
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 5) ||
    (labValues['aortic_vena_contracta'] !== undefined && labValues['aortic_vena_contracta'] >= 0.6);
  const anyAREchoValue =
    labValues['lvef'] !== undefined || labValues['valve_severity'] !== undefined ||
    labValues['aortic_vena_contracta'] !== undefined;
  const symptomaticVHD = dxCodes.some(c =>
    c.startsWith('I50') || c.startsWith('R55') || c.startsWith('I20') || c.startsWith('R06')
  );

  // Gap VHD-103: Severe chronic asymptomatic AR with LV dysfunction -> surgical evaluation (AUDIT-134 tightened)
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 AVR for severe AR + LVEF<=55%, or LVESD threshold).
  // Tightening (AUDIT-134): the prior VD-5 fired on I35.1 + lvef-ABSENT (an echo-existence proxy mis-credited as a
  // severity gate). Now gated on threaded SEVERE AR (valve_severity>=5 or aortic_vena_contracta>=0.6) + asymptomatic
  // + LVEF<=55. STANDING SUBGROUP CHECK: AR surgery is subgroup-dependent - valve-sparing root/repair for select
  // anatomy vs valve replacement (AVR); the recommendation is heart-team repair-vs-replace, not a blanket AVR.
  // Path-B: the LVESD>=50 mm arm of the Class-1 trigger is not threaded (LVESD unmapped); the LVEF<=55 arm is built.
  if (hasAorticRegurg && severeAR && !symptomaticVHD
      && labValues['lvef'] !== undefined && labValues['lvef'] <= 55
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Severe asymptomatic AR with LV dysfunction: surgical evaluation gap',
      target: 'Heart-team aortic valve surgery evaluation (valve-sparing/repair vs replacement)',
      recommendations: {
        action: 'Consider heart-team aortic valve surgery evaluation (valve-sparing root repair vs aortic valve replacement, by anatomy) for severe asymptomatic aortic regurgitation with LVEF <=55% per 2020 ACC/AHA VHD (Class 1)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Subgroup-aware: repair (valve-sparing/David) for select root anatomy vs replacement (AVR) - heart-team-determined. Path-B: the LVESD>=50 mm Class-1 trigger arm is not threaded; the LVEF<=55 arm is gated.',
      },
      evidence: {
        triggerCriteria: [
          'Aortic regurgitation (I35.1 or I35.2)',
          'Severe AR (valve_severity >=5 or aortic vena contracta >=0.6 cm)',
          'Asymptomatic (no HF/syncope/angina/dyspnea dx)',
          `LVEF: ${labValues['lvef']}% (<=55, LV dysfunction)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Aortic valve already replaced (Z95.2/.3/.4)'],
      },
    });
  }

  // Gap VHD-102: Moderate aortic regurgitation without surveillance echo
  // Guideline: 2020 ACC/AHA VHD Guideline (periodic surveillance for chronic AR). The existence-proxy is
  // LEGITIMATE here (a surveillance gap fires on absence of a recent echo, by design). Path-B: AR severity is not
  // confirmable from the dx alone (I35.1 does not encode grade); this surfaces the AR population due for surveillance.
  if (hasAorticRegurg && !anyAREchoValue && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Aortic regurgitation without surveillance echo on file',
      target: 'Periodic surveillance echocardiogram (AR severity grading + LV size/function)',
      recommendations: {
        action: 'Consider periodic surveillance echocardiography (AR severity grading and LV size/function) for chronic aortic regurgitation per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Path-B: AR grade is not encoded in the dx; no echo-derived value on file is the surveillance-due proxy. The surveillance interval scales with severity (annual for moderate, every 6-12 mo for severe).',
      },
      evidence: {
        triggerCriteria: [
          'Aortic regurgitation (I35.1 or I35.2)',
          'No echo-derived value on file (surveillance-due proxy)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent echo within the guideline interval'],
      },
    });
  }

  // Gap VHD-104: Mixed / multi-valve disease without integrated staging
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 integrated assessment when >1 valve lesion; the dominant
  // lesion drives management). Multi-valve = >=2 of AS (I35.0) / MR (I34.0) / AR (I35.1), or mixed aortic I35.2.
  const hasAS_VHD = dxCodes.some(c => c.startsWith('I35.0'));
  const hasMR_VHD = dxCodes.some(c => c.startsWith('I34.0'));
  const hasAR_VHD = dxCodes.some(c => c.startsWith('I35.1'));
  const multiValveCount = [hasAS_VHD, hasMR_VHD, hasAR_VHD].filter(Boolean).length;
  const hasMixedAortic = dxCodes.some(c => c.startsWith('I35.2'));
  if ((multiValveCount >= 2 || hasMixedAortic) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mixed / multi-valve disease without integrated severity staging',
      target: 'Integrated multi-valve severity staging (dominant-lesion-driven management)',
      recommendations: {
        action: 'Consider integrated multi-valve severity staging - the dominant lesion drives management, and combined lesions can mask single-valve severity - per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Combined lesions (e.g. AS + MR) alter loading and can under- or over-estimate single-valve severity; integrated staging clarifies the dominant lesion. Path-B: documentation of prior integrated staging is not ingested.',
      },
      evidence: {
        triggerCriteria: [
          hasMixedAortic ? 'Mixed aortic valve disease (I35.2)' : 'Multiple valve lesions (>=2 of AS I35.0 / MR I34.0 / AR I35.1)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent integrated staging documented'],
      },
    });
  }

  // Gap VHD-105: Moderate MR graded by color Doppler without quantitative triangulation
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 quantitative grading - EROA + vena contracta + regurgitant
  // volume - especially for moderate MR where color-flow alone is unreliable).
  const hasModerateMRColor = labValues['mitral_regurg_grade'] !== undefined &&
    labValues['mitral_regurg_grade'] >= 2 && labValues['mitral_regurg_grade'] <= 3;
  const hasMRQuant = labValues['mitral_eroa'] !== undefined || labValues['mitral_vena_contracta'] !== undefined;
  if (hasMR_VHD && hasModerateMRColor && !hasMRQuant && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Moderate MR by color Doppler without quantitative (EROA/vena-contracta) triangulation',
      target: 'Quantitative MR grading (EROA + vena contracta + regurgitant volume)',
      recommendations: {
        action: 'Consider quantitative MR grading (effective regurgitant orifice area + vena contracta + regurgitant volume) for moderate MR graded by color Doppler alone per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Color-flow grading alone is unreliable in the moderate band and can underestimate severe MR; quantitative triangulation reclassifies a meaningful fraction. Path-B: regurgitant-volume is not separately threaded; EROA + vena contracta are the threaded quantitative measures.',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0)',
          `MR grade ${labValues['mitral_regurg_grade']} (moderate band, color Doppler)`,
          'No quantitative measure on file (EROA and vena contracta both absent)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Quantitative MR assessment already on file'],
      },
    });
  }

  // ===== v3.0 VHD chunk 2: prosthetic-valve dysfunction (PVT vs SVD partition) =====
  // Reads the threaded prosthetic-valve gradients (aortic_valve_mean_gradient / mitral_valve_mean_gradient) +
  // the AUDIT-123-corrected Z95.x semantics. STANDING SUBGROUP CHECK: a MECHANICAL valve with an elevated
  // gradient is prosthetic-valve THROMBOSIS / pannus (-> anticoag/lysis/surgery workup), whereas a BIOPROSTHETIC
  // valve is structural valve DETERIORATION (-> ViV-TAVR vs redo surgery) - the valve TYPE drives the
  // recommendation. Mechanical = Z95.2 (generic, treated-as-mechanical) || Z95.4; bioprosthetic = Z95.3 (xenogenic,
  // definitive). Path-B: the serial gradient-DELTA (rise>=10 mmHg / rise>=50%) and new-PVL arms are not threaded
  // (no serial/baseline gradients); the ABSOLUTE elevated prosthetic gradient is the proxy (aortic >=20, mitral
  // >=10 mmHg). The aortic-prosthesis case overlaps SH-012 (general SVD eval, aortic-only) - flagged for the close.
  const hasMechValve_VHD2 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4'));
  const hasBioValve_VHD2 = dxCodes.some(c => c.startsWith('Z95.3'));
  const elevatedProstheticGradient_VHD =
    (labValues['aortic_valve_mean_gradient'] !== undefined && labValues['aortic_valve_mean_gradient'] >= 20) ||
    (labValues['mitral_valve_mean_gradient'] !== undefined && labValues['mitral_valve_mean_gradient'] >= 10);

  // Gap VHD-068: Mechanical prosthetic valve + elevated gradient -> thrombosis (PVT) workup
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 urgent TTE/TEE + fluoroscopy for suspected prosthetic valve
  // thrombosis with an elevated gradient).
  if (hasMechValve_VHD2 && elevatedProstheticGradient_VHD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mechanical prosthetic valve with elevated gradient: thrombosis (PVT) workup gap',
      target: 'Prosthetic valve thrombosis workup (TEE + cinefluoroscopy) + anticoagulation review',
      recommendations: {
        action: 'Consider urgent prosthetic valve thrombosis workup (transesophageal echo + cinefluoroscopy) and anticoagulation review for a mechanical valve with an elevated gradient; thrombolysis vs surgery is determined by thrombus burden and symptoms, per 2020 ACC/AHA VHD (Class 1)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Subgroup: mechanical valve -> THROMBOSIS/pannus pathway (not SVD). Obstructive PVT is a surgical/thrombolysis emergency. Path-B: the gradient-rise-from-baseline (>=50%) arm is not threaded; the absolute elevated gradient (aortic >=20 / mitral >=10 mmHg) is the proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical prosthetic valve (Z95.2 or Z95.4)',
          'Elevated prosthetic mean gradient (aortic >=20 or mitral >=10 mmHg)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known stable elevated baseline gradient', 'Recent PVT workup on file'],
      },
    });
  }

  // Gap VHD-011: Bioprosthetic valve + elevated gradient -> structural valve deterioration (SVD) evaluation
  // Guideline: 2020 ACC/AHA VHD Guideline (SVD with hemodynamic significance -> ViV-TAVR vs redo surgery, Class 2a).
  if (hasBioValve_VHD2 && elevatedProstheticGradient_VHD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Bioprosthetic valve with elevated gradient: structural deterioration (SVD) evaluation gap',
      target: 'Structural valve deterioration assessment + redo-intervention candidacy (ViV-TAVR vs redo surgery)',
      recommendations: {
        action: 'Consider structural valve deterioration evaluation and redo-intervention candidacy (valve-in-valve TAVR vs redo surgery) for a bioprosthetic valve with an elevated gradient per 2020 ACC/AHA VHD (Class 2a)',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Subgroup: bioprosthetic valve -> structural DETERIORATION pathway (not thrombosis). Path-B: the gradient-rise-from-baseline (>=10 mmHg) and new-paravalvular-leak arms are not threaded; the absolute elevated gradient (aortic >=20 / mitral >=10 mmHg) is the proxy. Distinct from the mechanical PVT pathway (VHD-068).',
      },
      evidence: {
        triggerCriteria: [
          'Bioprosthetic (xenogenic) valve (Z95.3)',
          'Elevated prosthetic mean gradient (aortic >=20 or mitral >=10 mmHg)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known stable elevated baseline gradient', 'Recent SVD assessment on file'],
      },
    });
  }

  // ===== v3.0 VHD chunk 3: mechanical/bioprosthetic anticoagulation (post INR slug-fix) =====
  // The AUDIT-170 slug-fix threads INR (LOINC 34714-6 -> 'inr') to labValues['inr'], so the INR-VALUE rules below
  // can now read it (before the fix the threaded INR never reached them). Mechanical = Z95.2 (generic, treated-as-
  // mech) || Z95.4 (the AUDIT-123-corrected predicate). Warfarin RxNorm 11289; aspirin 1191.
  const hasMechValve_VHD3 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.4'));
  const onWarfarin_VHD3 = medCodes.includes('11289');

  // Gap VHD-001: Mechanical valve on warfarin with sub-therapeutic INR (AUDIT-133 / post slug-fix)
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 maintain INR in the valve-specific therapeutic range).
  // Tightening (AUDIT-133): the prior VD-3 only detected INR-ABSENT (monitoring overdue); this is the INR-VALUE gap - a
  // sub-therapeutic INR is under-anticoagulation (valve-thrombosis / thromboembolism risk). Path-B: the target
  // range is valve-position-dependent (aortic 2.0-3.0, mitral 2.5-3.5) and position is not codable; INR < 2.0 is
  // the definite-sub-therapeutic threshold for ANY mechanical valve (the 2.0-2.5 mitral-subtherapeutic band is the
  // documented Path-B residual). Safety-first: under-anticoagulating a mechanical valve is catastrophic.
  if (hasMechValve_VHD3 && onWarfarin_VHD3
      && labValues['inr'] !== undefined && labValues['inr'] < 2.0
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mechanical valve with sub-therapeutic INR: warfarin management gap',
      target: 'INR brought into the valve-specific therapeutic range (warfarin dose / adherence review)',
      recommendations: {
        action: 'Consider warfarin management (dose adjustment, adherence and time-in-therapeutic-range review) for a mechanical valve with a sub-therapeutic INR per 2020 ACC/AHA VHD (Class 1) - a sub-therapeutic INR is under-anticoagulation with valve-thrombosis and thromboembolism risk',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Subgroup: the INR target is valve-position-dependent (aortic mechanical 2.0-3.0, mitral mechanical 2.5-3.5). Path-B: valve position is not codable, so INR < 2.0 is the definite-sub-therapeutic gate for any mechanical valve; the 2.0-2.5 mitral-subtherapeutic band is not captured.',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical prosthetic valve (Z95.2 or Z95.4)',
          'On warfarin (RxNorm 11289)',
          `INR: ${labValues['inr']} (<2.0, sub-therapeutic for any mechanical valve)`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recently adjusted dose pending re-check', 'Documented goal-INR override'],
      },
    });
  }

  // Gap VHD-006: Mechanical valve + atherosclerotic disease without low-dose ASA adjunct
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 2a low-dose ASA adjunct to VKA for a mechanical valve WITH
  // concomitant atherosclerotic vascular disease - the "when indicated" qualifier; routine ASA adjunct without a
  // vascular indication was downgraded for bleeding risk).
  const hasAtheroscleroticDz_VHD = dxCodes.some(c => c.startsWith('I25') || c.startsWith('I70'));
  const onAspirin_VHD6 = medCodes.includes('1191');
  if (hasMechValve_VHD3 && onWarfarin_VHD3 && hasAtheroscleroticDz_VHD && !onAspirin_VHD6
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mechanical valve with atherosclerotic disease without low-dose ASA adjunct',
      target: 'Low-dose aspirin adjunct to warfarin (with the bleeding-risk trade-off documented)',
      recommendations: {
        action: 'Consider low-dose aspirin (75-100 mg) adjunct to warfarin for a mechanical valve with concomitant atherosclerotic vascular disease per 2020 ACC/AHA VHD (Class 2a), weighing the incremental bleeding risk',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'The ASA adjunct is indicated by the concomitant vascular disease (the "when indicated" qualifier) - routine ASA adjunct without a vascular indication was downgraded for bleeding risk. Bioprosthetic ASA is a separate gap (VD-ANTIPLATELET).',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical prosthetic valve (Z95.2 or Z95.4)',
          'On warfarin (RxNorm 11289)',
          'Concomitant atherosclerotic vascular disease (I25 or I70)',
          'No aspirin on the active medication list',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding / high bleeding risk', 'Aspirin intolerance'],
      },
    });
  }

  // ===== v3.0 VHD chunk 4: IE-surgical-indication (dx-driven) + rheumatic =====
  // The IE early-surgery indications that are dx-CODABLE (HF from valve dysfunction I50; recurrent embolic event)
  // are buildable per the SH-029 precedent; the culture/vegetation-dependent indications (uncontrolled infection /
  // persistent bacteremia, large-vegetation embolism prevention) are NOT codable -> Path-B, documented. All ICDs
  // section-16-verified vs NLM 2026-06-17. benzathine penicillin RxCUI 7982 (RxNav-verified, reused from SH).
  // OVERLAP FLAGS (for the VHD close): VHD-057/059 overlap the SH-module SH-029 (lumped IE-surgery); VHD-083
  // overlaps VD-12 (general AF+valve OAC-missing) + EP-008 (rheumatic-MS DOAC-contraindication).
  const hasIE_VHD = dxCodes.some(c => c.startsWith('I33.0'));
  const hasRheumatic_VHD = dxCodes.some(c =>
    c.startsWith('I05') || c.startsWith('I06') || c.startsWith('I07') || c.startsWith('I08') || c.startsWith('I09')
  );
  const onBenzathinePCN_VHD = medCodes.includes('7982');

  // Gap VHD-057: Infective endocarditis + heart failure -> urgent surgery indication
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 early/urgent surgery for IE with valve dysfunction causing HF).
  if (hasIE_VHD && dxCodes.some(c => c.startsWith('I50')) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Infective endocarditis with heart failure: urgent surgery indication gap',
      target: 'Urgent endocarditis-team valve surgery evaluation (HF from valve dysfunction)',
      recommendations: {
        action: 'Consider URGENT valve surgery evaluation for infective endocarditis complicated by heart failure from valve dysfunction per 2020 ACC/AHA VHD (Class 1) - this is the most urgent early-surgery indication',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Subgroup-aware: IE-with-HF is the URGENT (often within days) early-surgery indication, distinct from the elective indications. Path-B: that the HF is FROM the valve lesion (vs incidental) is proxied by the I33.0 + I50 co-occurrence.',
      },
      evidence: {
        triggerCriteria: [
          'Acute/subacute infective endocarditis (I33.0)',
          'Heart failure (I50) - valve-dysfunction-driven',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Surgery already performed this episode'],
      },
    });
  }

  // Gap VHD-059: Infective endocarditis + embolic event on anticoagulation -> surgery consideration
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 2a surgery for recurrent emboli despite appropriate therapy).
  const hasEmbolic_VHD = dxCodes.some(c => c.startsWith('I74') || c.startsWith('I63'));
  const onAnticoag_VHD = ['11289', '1364430', '1114195', '1037042', '1599538'].some(c => medCodes.includes(c));
  if (hasIE_VHD && hasEmbolic_VHD && onAnticoag_VHD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Infective endocarditis with embolic event on therapy: surgery consideration gap',
      target: 'Endocarditis-team surgery evaluation for embolism despite appropriate antithrombotic/antimicrobial therapy',
      recommendations: {
        action: 'Consider valve surgery evaluation for infective endocarditis with an embolic event despite appropriate therapy per 2020 ACC/AHA VHD (Class 2a) - recurrent embolism on treatment is a surgical indication',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Path-B: a recurrent embolic event despite antimicrobial therapy is the surgical trigger; "on therapy" is proxied by a concurrent anticoagulant, and the embolic dx (I74 arterial / I63 cerebral) is the event proxy. Vegetation-size-driven prophylactic surgery is a separate, echo-morphology-blocked indication.',
      },
      evidence: {
        triggerCriteria: [
          'Acute/subacute infective endocarditis (I33.0)',
          'Embolic event (I74 arterial or I63 cerebral)',
          'On anticoagulation (appropriate-therapy proxy)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Surgery already performed this episode'],
      },
    });
  }

  // Gap VHD-064: Prior infective endocarditis + dental procedure without antibiotic prophylaxis
  // Guideline: 2021 AHA Endocarditis Prevention (Class 1 prophylaxis for previous IE - a highest-risk condition).
  const hasPriorIE_VHD = hasIE_VHD || dxCodes.some(c => c.startsWith('Z86.79'));
  const hasDental_VHD = dxCodes.some(c => c.startsWith('Z01.2'));
  const onProphylaxisAbx_VHD = medCodes.includes('723') || medCodes.includes('2582');
  if (hasPriorIE_VHD && hasDental_VHD && !onProphylaxisAbx_VHD
      && !hasContraindication(dxCodes, EXCLUSION_HOSPICE) && !hasContraindication(dxCodes, EXCLUSION_ALLERGY_DOCUMENTED)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Prior infective endocarditis: dental antibiotic prophylaxis gap',
      target: 'Endocarditis prophylaxis prescribed prior to dental procedure (previous-IE high-risk condition)',
      medication: 'Amoxicillin 2g (or clindamycin if penicillin allergic)',
      recommendations: {
        action: 'Consider antibiotic prophylaxis prior to the dental procedure for a patient with previous infective endocarditis per 2021 AHA Endocarditis Prevention (Class 1 - previous IE is a highest-risk condition)',
        guideline: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
        note: 'Previous IE is one of the four highest-risk conditions warranting prophylaxis. Path-B: a clean history-of-IE code is limited - I33.0 (current/recent) or Z86.79 (circulatory history) is the proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Previous / current infective endocarditis (I33.0 or Z86.79)',
          'Dental procedure encounter (Z01.2)',
          'No prophylaxis antibiotic on the active medication list',
        ],
        guidelineSource: '2021 AHA Scientific Statement on Prevention of Infective Endocarditis',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Documented penicillin allergy -- use alternative', 'Non-invasive dental procedure'],
      },
    });
  }

  // Gap VHD-079: Rheumatic heart disease without benzathine penicillin secondary prophylaxis
  // Guideline: 2020 AHA RHD / WHF (Class 1 secondary prophylaxis - benzathine penicillin G every 3-4 weeks).
  if (hasRheumatic_VHD && !onBenzathinePCN_VHD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Rheumatic heart disease without benzathine penicillin secondary prophylaxis',
      target: 'Benzathine penicillin G secondary prophylaxis (with the duration set by age/risk)',
      medication: 'Benzathine penicillin G',
      recommendations: {
        action: 'Consider benzathine penicillin G secondary prophylaxis for rheumatic heart disease per 2020 AHA/WHF RHD guidance (Class 1)',
        guideline: '2020 AHA / World Heart Federation Rheumatic Heart Disease guidance',
        note: 'Subgroup-aware: prophylaxis DURATION is age/risk-dependent (typically 10 years or until age 21 for RHD without carditis; longer - until age 40 or lifelong - for RHD with carditis/residual valve disease). Path-B: the duration nuance and penicillin-allergy alternative (a macrolide) are surfaced for clinician selection.',
      },
      evidence: {
        triggerCriteria: [
          'Chronic rheumatic heart disease (I05-I09)',
          'No benzathine penicillin on the active medication list',
        ],
        guidelineSource: '2020 AHA / World Heart Federation Rheumatic Heart Disease guidance',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Penicillin allergy (use a macrolide alternative)', 'Beyond the indicated prophylaxis duration'],
      },
    });
  }

  // Gap VHD-083: Rheumatic heart disease + AF not on warfarin -> anticoagulation (warfarin, DOAC contraindicated)
  // Guideline: 2020 ACC/AHA VHD; INVICTUS (warfarin superior to a DOAC in rheumatic AF). SAFETY subgroup: the OAC
  // for rheumatic-MS-associated AF must be WARFARIN, not a DOAC.
  const hasAF_VHD4 = dxCodes.some(c => c.startsWith('I48'));
  const onWarfarin_VHD4 = medCodes.includes('11289');
  if (hasRheumatic_VHD && hasAF_VHD4 && !onWarfarin_VHD4 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onDOAC_VHD4 = ['1364430', '1114195', '1037042', '1599538'].some(c => medCodes.includes(c));
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Rheumatic heart disease + atrial fibrillation not on warfarin (DOAC contraindicated)',
      target: 'Warfarin (INR 2.0-3.0) for rheumatic AF - DOACs are not established in rheumatic mitral stenosis',
      recommendations: {
        action: onDOAC_VHD4
          ? 'SAFETY: Consider switching from the DOAC to warfarin (INR 2.0-3.0) for rheumatic heart disease with atrial fibrillation - DOACs are contraindicated/not established in rheumatic mitral stenosis (INVICTUS showed warfarin superiority) per 2020 ACC/AHA VHD'
          : 'Consider warfarin (INR 2.0-3.0) for rheumatic heart disease with atrial fibrillation per 2020 ACC/AHA VHD - warfarin is the established anticoagulant (DOACs are not established in rheumatic mitral stenosis)',
        guideline: '2020 ACC/AHA Valvular Heart Disease; INVICTUS',
        note: 'SAFETY subgroup: rheumatic-MS-associated AF requires WARFARIN, not a DOAC (the DOAC-contraindication subgroup). Fires whether the patient is on a DOAC (switch) or on no OAC (start warfarin).',
      },
      evidence: {
        triggerCriteria: [
          'Chronic rheumatic heart disease (I05-I09)',
          'Atrial fibrillation (I48)',
          onDOAC_VHD4 ? 'On a DOAC (contraindicated in rheumatic MS)' : 'Not on warfarin',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; INVICTUS trial',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Anticoagulation contraindicated', 'Already on warfarin'],
      },
    });
  }

  // ===== v3.0 VHD chunk 5: pregnancy SAFETY (Tier-S) + drug-induced valve surveillance =====
  // The mechanical-valve-pregnancy anticoagulation scenario is the highest-stakes recommendation-correctness case
  // in VHD: warfarin is teratogenic (dose-dependent embryopathy, peak 6-12 weeks) BUT a mechanical valve mandates
  // anticoagulation, so the recommendation is a heart-team + MFM tradeoff, NOT a blanket "stop warfarin". Pregnancy
  // ICDs section-16-verified vs NLM 2026-06-17: O99.4x circulatory-complicating-pregnancy, O09 high-risk
  // supervision, Z34 normal supervision, Z33.1 pregnant-state (Z33.2 termination deliberately excluded), Z3A
  // weeks-gestation. Drug RxCUIs RxNav-verified: cabergoline 47579, pergolide 8047, ergotamine 4025, methysergide
  // 6911. The fetotoxic-RAAS-in-pregnancy vector is already covered by HF-086 (overlap-flag, not re-authored).
  const isPregnant_VHD5 = dxCodes.some(c =>
    c.startsWith('O99.4') || c.startsWith('O09') || c.startsWith('Z34') || c === 'Z33.1' || c.startsWith('Z3A')
  );

  // Gap VHD-098: Mechanical valve + reproductive-age female, not pregnant -> pre-conception counseling
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 pre-pregnancy counseling; mechanical-valve anticoagulation
  // planning is the higher-stakes layer above the general VD-10 valve-pregnancy counseling).
  if (
    hasMechanicalValve && gender === 'FEMALE' && age >= 18 && age <= 45 &&
    !isPregnant_VHD5 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mechanical valve in a reproductive-age patient: pre-conception anticoagulation counseling gap',
      target: 'Pre-conception cardio-obstetric counseling on the mechanical-valve anticoagulation strategy for pregnancy',
      recommendations: {
        action: 'Consider pre-conception cardio-obstetric counseling for this reproductive-age mechanical-valve patient - warfarin is teratogenic, so the anticoagulation plan for any future pregnancy (dose-adjusted warfarin vs LMWH vs UFH by trimester) should be discussed before conception, per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Mechanical-valve-specific layer above VD-10 (general valve-disease pregnancy counseling). Complement to VHD-099, which handles the already-pregnant case.',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical prosthetic valve (Z95.2 / Z95.4)',
          'Female, reproductive age 18-45',
          'Not currently pregnant',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Currently pregnant (handled by VHD-099)', 'Post-menopausal'],
      },
    });
  }

  // Gap VHD-099: Mechanical valve + pregnancy -> anticoagulation SAFETY management (Tier-S)
  // Guideline: 2020 ACC/AHA VHD Guideline (Class 1 - therapeutic anticoagulation must be maintained throughout
  // pregnancy in mechanical-valve patients; the warfarin-vs-LMWH-vs-UFH strategy is a heart-team decision).
  // SAFETY: warfarin is teratogenic (peak embryopathy 6-12 weeks) but valve thrombosis is life-threatening, so the
  // action is a heart-team + MFM tradeoff, NEVER a blanket discontinuation. This is the highest-stakes subgroup.
  if (hasMechanicalValve && isPregnant_VHD5 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onWarfarin_VHD5 = medCodes.includes('11289');
    gaps.push({
      type: TherapyGapType.SAFETY_ALERT,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Mechanical valve in pregnancy: anticoagulation strategy SAFETY review (teratogenicity vs valve-thrombosis tradeoff)',
      target: 'Cardio-obstetric heart-team + maternal-fetal-medicine management of mechanical-valve anticoagulation in pregnancy',
      recommendations: {
        action: onWarfarin_VHD5
          ? 'SAFETY: Consider urgent cardio-obstetric heart-team and maternal-fetal-medicine referral. Warfarin crosses the placenta with a dose-dependent embryopathy risk (peak 6-12 weeks); the strategy (continued dose-adjusted warfarin vs anti-Xa-monitored LMWH vs UFH, by trimester and warfarin dose) is a heart-team decision - do NOT simply discontinue anticoagulation, as mechanical-valve thrombosis is life-threatening, per 2020 ACC/AHA VHD'
          : 'SAFETY: Consider cardio-obstetric heart-team and maternal-fetal-medicine referral to confirm a guideline mechanical-valve anticoagulation protocol for pregnancy (anti-Xa-monitored LMWH or dose-adjusted warfarin/UFH by trimester) - therapeutic anticoagulation must be maintained throughout pregnancy, per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Tier-S SAFETY: the recommendation is heart-team + MFM management of the warfarin-teratogenicity-vs-valve-thrombosis tradeoff, NOT a blanket drug change. Path-B: anti-Xa-targeted LMWH monitoring (VHD-100) and the 36-week LMWH/delivery-plan timing (VHD-101) need anti-Xa levels and gestational-week precision that are not threaded.',
      },
      evidence: {
        triggerCriteria: [
          'Mechanical prosthetic valve (Z95.2 / Z95.4)',
          'Pregnancy (O99.4x / O09 / Z34 / Z33.1 / Z3A)',
          onWarfarin_VHD5 ? 'On warfarin (teratogenic - embryopathy risk)' : 'Anticoagulation strategy to be confirmed',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '1',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // Gap VHD-091: Dopamine agonist (cabergoline / pergolide) -> drug-induced valve surveillance echo
  // Guideline: 2020 ACC/AHA VHD Guideline + FDA labeling (ergot-derived dopamine agonists cause serotonergic
  // valvulopathy; echocardiographic surveillance during chronic therapy).
  const onDopamineAgonist_VHD5 = medCodes.includes('47579') || medCodes.includes('8047');
  if (onDopamineAgonist_VHD5 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Ergot-derived dopamine agonist therapy: drug-induced valve disease surveillance echo gap',
      target: 'Surveillance echocardiogram for ergot-derived dopamine-agonist (cabergoline / pergolide) valvulopathy',
      recommendations: {
        action: 'Consider surveillance echocardiography for drug-induced (serotonergic) valvular heart disease in this patient on an ergot-derived dopamine agonist (cabergoline / pergolide), per 2020 ACC/AHA VHD and FDA labeling',
        guideline: '2020 ACC/AHA Valvular Heart Disease; FDA dopamine-agonist labeling',
        note: 'Surveillance interval is exposure-duration / dose-dependent (Path-B: cumulative dose is not threaded).',
      },
      evidence: {
        triggerCriteria: [
          'On an ergot-derived dopamine agonist: cabergoline (RxNorm 47579) or pergolide (RxNorm 8047)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // Gap VHD-092: Ergotamine / methysergide -> drug-induced valve surveillance echo
  // Guideline: 2020 ACC/AHA VHD Guideline (chronic ergot-alkaloid exposure -> serotonergic valvulopathy;
  // echocardiographic surveillance).
  const onErgotAlkaloid_VHD5 = medCodes.includes('4025') || medCodes.includes('6911');
  if (onErgotAlkaloid_VHD5 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.VALVULAR_DISEASE,
      status: 'Chronic ergot-alkaloid therapy: drug-induced valve disease surveillance echo gap',
      target: 'Surveillance echocardiogram for ergot-alkaloid (ergotamine / methysergide) valvulopathy',
      recommendations: {
        action: 'Consider surveillance echocardiography for drug-induced (serotonergic) valvular heart disease in this patient on a chronic ergot alkaloid (ergotamine / methysergide), per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Surveillance interval is exposure-duration / dose-dependent (Path-B: cumulative dose is not threaded).',
      },
      evidence: {
        triggerCriteria: [
          'On a chronic ergot alkaloid: ergotamine (RxNorm 4025) or methysergide (RxNorm 6911)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // Gap VD-6: DOAC Contraindicated in Mechanical Valve
  // Guideline: 2020 ACC/AHA VHD (RE-ALIGN Trial), Class 3 (Harm), LOE B
  // DOACs are contraindicated in mechanical valve patients -- warfarin is required
  // DOAC RxNorm: apixaban (1364430), rivaroxaban (1114195), dabigatran (1037042), edoxaban (1599538)
  if (hasMechanicalValve && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const DOAC_CODES = ['1364430', '1114195', '1037042', '1599538'];
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
            'Mechanical valve (Z95.2 or Z95.4)',
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
          'Bioprosthetic valve (Z95.2, Z95.3, or Z95.4)',
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
  // OAC RxNorm: warfarin (11289), apixaban (1364430), rivaroxaban (1114195), dabigatran (1037042), edoxaban (1599538)
  // Reconciliation (AUDIT-172, v3.0 VHD close): EXCLUDE rheumatic mitral disease (I05.x). The rheumatic-AF
  // anticoagulation recommendation is OWNED by the VHD-083 rule (warfarin mandate, DOACs contraindicated per
  // INVICTUS); the generic VD-12 "may use DOAC" note would be unsafe if it co-fired on a rheumatic-MS patient,
  // so VD-12 yields to the rheumatic-AF rule here. Non-rheumatic AF + valve still fires VD-12 (no over-narrowing).
  const hasRheumaticMitral_VD12 = dxCodes.some(c => c.startsWith('I05'));
  if (
    hasAF &&
    hasAnyValveDx &&
    !hasRheumaticMitral_VD12 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const OAC_CODES = ['11289', '1364430', '1114195', '1037042', '1599538'];
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
  // Legacy-review fix 2026-06-15 (Pattern A): narrowed from the over-broad 'O' chapter prefix (which
  // captured ectopic/abortion/routine-antenatal) to the peripartum/postpartum WINDOW - puerperium
  // complications (O85-O92) + postpartum care (Z39). PPCM occurs late-pregnancy through ~5mo postpartum.
  const hasRecentPregnancy = dxCodes.some(c => /^O8[5-9]/.test(c) || /^O9[0-2]/.test(c) || c.startsWith('Z39'));
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

  // Gap SH-10: Secondary MR transcatheter repair (TEER) - GDMT-FIRST. COR 2a (COAPT).
  // Guideline: 2020 ACC/AHA VHD Guideline (COAPT Trial).
  // Fix (AUDIT-166, v3.0 SH chunk 2): COAPT enrolled GDMT-OPTIMIZED patients with persistent severe secondary MR.
  // The prior rule recommended MitraClip/TEER on I34.0 + LVEF<50 + age>75 with NO GDMT gate and NO severity gate -
  // premature TEER for a GDMT-naive patient. Now: (a) AUDIT-125 severity gate (moderate-severe+ secondary MR via
  // valve_severity>=4 OR EROA>=0.30 OR regurg grade>=3, the COAPT band), and (b) STANDING SUBGROUP CHECK - the
  // recommendation BRANCHES on GDMT status: GDMT-naive -> "optimize GDMT first, then TEER if MR persists";
  // GDMT-optimized -> TEER candidacy. Path-B: GDMT proxy = BB + RAASi present (the HF Pattern-C minimum).
  const hasMR10 = dxCodes.some(c => c.startsWith('I34.0'));
  const modSevereSecondaryMR =
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 4) ||
    (labValues['mitral_eroa'] !== undefined && labValues['mitral_eroa'] >= 0.30) ||
    (labValues['mitral_regurg_grade'] !== undefined && labValues['mitral_regurg_grade'] >= 3);
  const onGDMT_SH10 = BB_CODES_CV.some(c => medCodes.includes(c)) && RAAS_CODES_CV.some(c => medCodes.includes(c));
  if (
    hasMR10 &&
    labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    modSevereSecondaryMR &&
    age > 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: onGDMT_SH10
        ? 'TEER (MitraClip) evaluation for secondary MR persistent despite optimized GDMT'
        : 'Secondary MR: optimize GDMT before transcatheter repair (TEER)',
      target: onGDMT_SH10
        ? 'Transcatheter mitral valve repair candidacy assessed'
        : 'GDMT optimized (beta-blocker + RAASi + as tolerated MRA/SGLT2i), then re-assess MR for TEER',
      recommendations: {
        action: onGDMT_SH10
          ? 'Consider TEER (MitraClip) for secondary MR that persists despite optimized GDMT per 2020 ACC/AHA VHD (COAPT, Class 2a)'
          : 'Optimize guideline-directed medical therapy (beta-blocker + RAASi) FIRST; refer for TEER only if severe secondary MR persists despite optimized GDMT per COAPT (premature TEER without GDMT optimization is not COAPT-supported)',
        guideline: '2020 ACC/AHA Valvular Heart Disease (COAPT Trial)',
        note: 'COAPT enrolled GDMT-optimized patients with persistent severe secondary MR. GDMT is the prerequisite: optimize first, then TEER if MR persists. This rule branches on GDMT status (BB + RAASi present).',
      },
      evidence: {
        triggerCriteria: [
          'Mitral regurgitation (I34.0), secondary/functional (LVEF<50)',
          'Moderate-severe+ MR (valve_severity >=4, EROA >=0.30, or regurg grade >=3 - COAPT band)',
          `LVEF: ${labValues['lvef']}% (<50%)`,
          `Age: ${age} (>75, high surgical risk proxy)`,
          `GDMT status: ${onGDMT_SH10 ? 'on BB + RAASi (optimized)' : 'NOT on BB + RAASi (optimize first)'}`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease (COAPT Trial)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe mitral annular calcification', 'Life expectancy < 1 year'],
      },
    });
  }

  // Gap SH-064: Transcatheter MVR candidacy for severe MR with non-TEER anatomy. COR 2a.
  // Guideline: 2020 ACC/AHA VHD Guideline.
  // Tightening (AUDIT-125, v3.0 SH chunk 2): the prior rule fired on I34.0 + age>80 with NO severity gate (over-
  // detected mild/moderate MR). Now gated on the threaded severe-MR severity. Path-B: TEER-eligibility / valve
  // anatomy (the "non-TEER anatomy" qualifier) is not ingested - this fires on severe MR + high-surgical-risk age;
  // the structural heart team confirms TEER-ineligibility vs TMVR candidacy.
  if (
    hasMR10 &&
    severeMR &&
    age > 75 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Transcatheter mitral valve replacement candidacy recommended for review',
      target: 'TMVR candidacy evaluation by structural heart team completed',
      recommendations: { action: 'Consider TMVR candidacy evaluation for severe MR with high surgical risk and TEER-unfavorable anatomy per 2020 ACC/AHA VHD' },
      evidence: {
        triggerCriteria: [
          'Severe mitral regurgitation (EROA >=0.40, regurg grade >=4, or valve_severity >=5)',
          `Age: ${age} (>75, high surgical risk proxy)`,
          'TEER-eligibility / valve anatomy not ingested (Path-B)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive frailty', 'Life expectancy < 1 year'],
      },
    });
  }

  // Gap SH-12 (gap-sh-12-ttvr): SUPERSEDED 2026-06-17 by SH-022 (v3.0 SH chunk 3).
  // Superseded (AUDIT-125 lineage): SH-12 fired on I36.1 + right-heart-failure symptoms with NO TR-severity gate
  // - the same un-gated over-detector pattern as the old SH-4, and it co-fired with the new severity-gated
  // tricuspid gap on every severe-symptomatic-TR patient while still over-detecting mild TR + edema. The
  // canonical transcatheter-tricuspid-evaluation gap is now SH-022 (severe TR via threaded echo + congestion),
  // with the SH-069 / SH-023 device-selection pathway layered on. Firing removed here (supersede-not-delete: the
  // registry entry gap-sh-12-ttvr is retained for canonical lineage and reconciled at the SH close). Same
  // precedent as the SH-002 supersede of gap-sh-2-tavr-eval and the SH-014 supersede of gap-sh-3.

  // Gap SH-13: Paravalvular Leak Assessment Post-Valve
  // Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE B
  // Prosthetic valve + new murmur proxy (I35.1 aortic regurgitation). Paravalvular leak affects ANY prosthesis.
  // Fix (AUDIT-123, 2026-06-17): broadened from Z95.2-only to Z95.2||Z95.3||Z95.4 - PVL is not type-specific, so
  //   the prior Z95.2-only predicate under-detected bioprosthetic (Z95.3) and other-replacement (Z95.4) valves.
  const hasProsthetic13 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4'));
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
          'Prosthetic valve (Z95.2, Z95.3, or Z95.4)',
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
  // Bioprosthetic valve + recent-implant proxy + no anticoagulant.
  // Fix (AUDIT-123, 2026-06-17): broad bio predicate adds Z95.3 (xenogenic/bioprosthetic), the code the prior
  //   Z95.2||Z95.4 set wrongly excluded. Missing a bio patient in the first-3-months anticoag window is the harm.
  const hasBioprosthetic13 = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4'));
  if (
    hasBioprosthetic13 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    const OAC_CODES_VD13 = ['11289', '1364430', '1114195', '1037042', '1599538']; // warfarin + DOACs
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
            'Bioprosthetic valve (Z95.2, Z95.3, or Z95.4)',
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
  // Fix (AUDIT-135, 2026-06-17): the therapy-ABSENT guard - the prior rule fired on prosthetic-valve + dental
  // regardless of whether prophylaxis was already prescribed, over-firing on already-treated patients. Now gates
  // on the prophylaxis abx being ABSENT. Amoxicillin 723, clindamycin 2582 (RxNav-verified IN).
  const onProphylaxisAbx_VD14 = medCodes.includes('723') || medCodes.includes('2582');
  if (
    hasProstheticVD14 &&
    hasDentalProcedure &&
    !onProphylaxisAbx_VD14 &&
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

  // ===== v3.0 SH chunk 4: Aortic syndromes + genetic-syndrome dx =====
  // All codes section-16-verified vs NLM Clinical Tables 2026-06-17 (ICD-10-CM): Marfan Q87.40 (unspecified) + Q87.41x
  // (aortic-dilation Q87.410 / other-CV Q87.418); Turner Q96.x; vascular EDS Q79.63 (NOT Q79.61 = classical);
  // bicuspid AV Q23.81; aortic dissection I71.010 ascending(Type A) / I71.012 descending-thoracic(Type B) /
  // I71.03 thoracoabdominal; thoracic aneurysm I71.2x. DEFERRED: GAP-SH-053 (Loeys-Dietz has no dedicated
  // dx code, collapses to non-specific Q87.89) and GAP-SH-073 (descending-aorta dimension not threaded -
  // only ascending_aorta has a slug). Threaded dimension: ascending_aorta (cm). Serial growth-rate NOT threaded
  // (Path-B). celiprolol RxCUI 20498 (RxNav-verified IN). TEVAR named by procedure - CPT numerals unverifiable
  // via free AMA/CMS sources, omitted per the no-fabrication discipline (the engine has no procedure-code input
  // anyway, so a CPT would be reference-text only).
  const hasMarfan_SH = dxCodes.some(c => c.startsWith('Q87.40') || c.startsWith('Q87.41'));
  const hasTurner_SH = dxCodes.some(c => c.startsWith('Q96'));
  const hasVascularEDS_SH = dxCodes.some(c => c.startsWith('Q79.63'));
  const hasBicuspidAV_SH = dxCodes.some(c => c.startsWith('Q23.81'));
  const ascAorta_SH = labValues['ascending_aorta']; // cm
  const onBB_SH = BB_CODES_CV.some(c => medCodes.includes(c));
  const ARB_CODES_AORTOPATHY = [RXNORM_GDMT.LOSARTAN, RXNORM_GDMT.VALSARTAN, RXNORM_GDMT.CANDESARTAN];
  const onARB_SH = ARB_CODES_AORTOPATHY.some(c => medCodes.includes(c));
  const onStatin_SH = STATIN_CODES_CV.some(c => medCodes.includes(c));
  const onCeliprolol_SH = medCodes.includes('20498');
  // Type-B dissection = descending thoracic (I71.012) or thoracoabdominal (I71.03); EXCLUDES ascending Type A
  // (I71.010 -> surgical, not the medical/TEVAR pathway). Unspecified-site (I71.00/I71.019) left out to avoid
  // mis-routing a Type A (Path-B: Stanford type not always coded).
  const hasTypeBDissection_SH = dxCodes.some(c => c.startsWith('I71.012') || c.startsWith('I71.03'));
  // Malperfusion proxy for complicated type-B (acute end-organ ischemia): mesenteric K55.0x, AKI N17,
  // limb/iliac arterial occlusion I74.3/I74.4/I74.5. Path-B: rapid-expansion + dissection-attribution not coded.
  const hasMalperfusion_SH = dxCodes.some(c =>
    c.startsWith('K55.0') || c.startsWith('N17') || c.startsWith('I74.3') || c.startsWith('I74.4') || c.startsWith('I74.5')
  );

  // Gap SH-052: Marfan syndrome -> beta-blocker or ARB to slow aortic growth
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1 for BB/ARB in Marfan with aortic dilation).
  const hasMarfanAorticDilation_SH = dxCodes.some(c => c.startsWith('Q87.410') || c.startsWith('I71.2')) ||
    (ascAorta_SH !== undefined && ascAorta_SH >= 4.0);
  if (hasMarfan_SH && hasMarfanAorticDilation_SH && !(onBB_SH || onARB_SH) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Marfan with aortic dilation not on beta-blocker or ARB (aortic-growth prophylaxis)',
      target: 'Beta-blocker or ARB (losartan) started to slow aortic root/ascending growth',
      recommendations: {
        action: 'Consider beta-blocker OR ARB (losartan) to slow aortic dilation in Marfan syndrome per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1)',
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
        note: 'Syndrome-specific: Marfan aortopathy. BB and ARB are both Class 1; losartan (AT1 blockade) is the trial-supported ARB.',
      },
      evidence: {
        triggerCriteria: [
          'Marfan syndrome (Q87.40 / Q87.41x)',
          hasMarfanAorticDilation_SH && ascAorta_SH !== undefined && ascAorta_SH >= 4.0
            ? `Ascending aorta: ${ascAorta_SH} cm (>=4.0, dilated)` : 'Aortic dilation (Q87.410 or thoracic aneurysm I71.2x)',
          'Not on a beta-blocker or ARB',
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Beta-blocker / ARB intolerance', 'Already on BB or ARB'],
      },
    });
  }

  // Gap SH-072: Ascending aorta at intervention threshold -> surgical evaluation (SUBGROUP-AWARE threshold)
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline. The intervention DIAMETER differs by underlying
  // dx: Marfan >=5.0 cm (>=4.5 with risk features - Path-B, risk features not threaded); bicuspid aortopathy
  // >=5.5 cm (>=5.0 with risk - Path-B); non-syndromic >=5.5 cm. STANDING SUBGROUP CHECK: the threshold + the
  // recommendation are syndrome-specific (mis-applying the 5.5 cm non-syndromic cut to a Marfan patient would
  // under-refer). vascular EDS routed to SH-055; Loeys-Dietz deferred (no ICD).
  let ascThreshold_SH = 5.5;
  let ascSubgroup_SH = 'non-syndromic';
  if (hasMarfan_SH) { ascThreshold_SH = 5.0; ascSubgroup_SH = 'Marfan (>=5.0 cm; >=4.5 with risk features)'; }
  else if (hasBicuspidAV_SH) { ascThreshold_SH = 5.5; ascSubgroup_SH = 'bicuspid aortopathy (>=5.5 cm; >=5.0 with risk features)'; }
  if (ascAorta_SH !== undefined && ascAorta_SH >= ascThreshold_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: `Ascending aorta at the ${ascSubgroup_SH} intervention threshold: surgical evaluation gap`,
      target: 'Aortic surgery (ascending/root replacement) evaluation at a reference aortic center',
      recommendations: {
        action: `Consider referral for ascending aortic surgery evaluation - ${ascAorta_SH} cm meets the ${ascSubgroup_SH} threshold per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline`,
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
        note: 'Subgroup-aware threshold (Marfan 5.0 / bicuspid 5.5 / non-syndromic 5.5 cm). Path-B: the lower with-risk-feature cut (family history of dissection, rapid growth, planned pregnancy) is not threaded.',
      },
      evidence: {
        triggerCriteria: [
          `Ascending aorta: ${ascAorta_SH} cm (>= ${ascThreshold_SH} cm ${ascSubgroup_SH} threshold)`,
          `Aortopathy subgroup: ${ascSubgroup_SH}`,
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Prior ascending/root replacement'],
      },
    });
  }

  // Gap SH-074: Uncomplicated type-B aortic dissection -> optimal medical therapy (impulse control)
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1 anti-impulse BB + BP control + statin).
  if (hasTypeBDissection_SH && !hasMalperfusion_SH && !(onBB_SH && onStatin_SH) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Uncomplicated type-B aortic dissection not on optimal medical therapy (impulse control)',
      target: 'Anti-impulse beta-blocker + BP control (ARB/ACEi) + statin optimized',
      recommendations: {
        action: 'Consider optimizing medical therapy for uncomplicated type-B dissection: anti-impulse beta-blocker (HR/BP control) + ARB or ACEi + statin per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1)',
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
        note: 'Uncomplicated type-B (no malperfusion proxy). OMT proxy = beta-blocker + statin present; full OMT also includes ARB/ACEi BP control. Path-B: target HR/BP values not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Type-B aortic dissection (descending I71.012 or thoracoabdominal I71.03)',
          'No malperfusion proxy (uncomplicated)',
          `Not on full medical therapy (beta-blocker: ${onBB_SH ? 'yes' : 'no'}, statin: ${onStatin_SH ? 'yes' : 'no'})`,
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Complicated dissection (routes to SH-075 TEVAR)', 'Beta-blocker intolerance'],
      },
    });
  }

  // Gap SH-075: Complicated type-B aortic dissection -> urgent TEVAR evaluation
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1 TEVAR for complicated type-B).
  if (hasTypeBDissection_SH && hasMalperfusion_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Complicated type-B aortic dissection (malperfusion): urgent TEVAR evaluation gap',
      target: 'Urgent TEVAR (thoracic endovascular aortic repair) evaluation at an aortic center',
      recommendations: {
        action: 'Consider urgent TEVAR (thoracic endovascular aortic repair) evaluation for complicated type-B dissection with malperfusion per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline (Class 1)',
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
        note: 'Complicated = malperfusion proxy (mesenteric K55.0x / AKI N17 / limb-iliac I74.3-5). Path-B: rapid aortic expansion + refractory pain/hypertension not coded. TEVAR named by procedure; CPT not cited (unverifiable via free AMA/CMS).',
      },
      evidence: {
        triggerCriteria: [
          'Type-B aortic dissection (descending I71.012 or thoracoabdominal I71.03)',
          'Malperfusion proxy: acute mesenteric ischemia (K55.0x), AKI (N17), or limb/iliac arterial occlusion (I74.3-I74.5)',
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Prior TEVAR for this segment'],
      },
    });
  }

  // Gap SH-054: Turner syndrome -> cardiac surveillance (echo + aortic imaging)
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline; Turner-syndrome care standards. Turner carries
  // BAV, coarctation, and aortic-dilation/dissection risk -> protocolized echo + cross-sectional aortic imaging.
  // Path-B: imaging dates not precisely tracked; absence of any echo-derived value is the surveillance-due proxy.
  const noEchoData_SH = labValues['lvef'] === undefined && ascAorta_SH === undefined;
  if (hasTurner_SH && noEchoData_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Turner syndrome without cardiac surveillance on file (echo + aortic imaging)',
      target: 'Protocolized echocardiography + cross-sectional aortic imaging completed',
      recommendations: {
        action: 'Consider protocolized cardiac surveillance (echocardiography + cross-sectional aortic imaging) for Turner syndrome per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline and Turner care standards',
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline',
        note: 'Syndrome-specific: Turner carries bicuspid aortic valve, coarctation, and aortic-dilation risk. Path-B: imaging dates not ingested; no echo-derived value on file used as the surveillance-due proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Turner syndrome (Q96.x)',
          'No echo-derived value on file (LVEF and ascending-aorta both absent) - surveillance-due proxy',
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent surveillance imaging within protocol interval'],
      },
    });
  }

  // Gap SH-055: Vascular Ehlers-Danlos (Q79.63) -> celiprolol + comprehensive vascular surveillance
  // Guideline: 2022 ACC/AHA/AATS/STS Aortic Disease Guideline; BBEST trial (celiprolol reduces arterial events
  // in vEDS). vEDS carries spontaneous arterial dissection/rupture risk -> celiprolol + whole-body vascular
  // surveillance.
  if (hasVascularEDS_SH && !onCeliprolol_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Vascular Ehlers-Danlos not on celiprolol / comprehensive vascular surveillance',
      target: 'Celiprolol (or alternative beta-blocker where unavailable) + whole-body vascular surveillance',
      recommendations: {
        action: 'Consider celiprolol (BBEST-trial evidence in vascular EDS) plus comprehensive vascular surveillance per 2022 ACC/AHA/AATS/STS Aortic Disease Guideline; where celiprolol is unavailable, an alternative beta-blocker',
        guideline: '2022 ACC/AHA/AATS/STS Aortic Disease Guideline; BBEST trial',
        note: 'Syndrome-specific: vEDS (Q79.63) arterial-fragility phenotype. Celiprolol (RxCUI 20498) is the trial-supported agent; US availability varies, so an alternative beta-blocker is the fallback.',
      },
      evidence: {
        triggerCriteria: [
          'Vascular Ehlers-Danlos syndrome (Q79.63)',
          'Not on celiprolol',
        ],
        guidelineSource: '2022 ACC/AHA/AATS/STS Guideline for the Diagnosis and Management of Aortic Disease; BBEST trial',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Beta-blocker intolerance', 'Already on celiprolol'],
      },
    });
  }

  // ===== v3.0 SH chunk 5: PFO/ASD, IE, PE, ACHD, cardiac masses (recommend-only / reliable-dx gaps) =====
  // All codes section-16-verified vs NLM Clinical Tables 2026-06-17 (ICD-10-CM): PFO Q21.12 (distinct from ASD
  // Q21.1x), TOF Q21.3, Ebstein Q22.5, Eisenmenger I27.83, IE I33.0, massive PE I26.0x (with acute cor
  // pulmonale), cardiogenic shock R57.0, cerebral infarction I63.x, sepsis A41/R65.2, benign cardiac neoplasm
  // D15.1. CPT-DEPENDENT post-closure gaps (SH-082 antithrombotic, SH-083 residual-shunt surveillance) are
  // PARKED to the CPT-verification-blocked tranche (no authoritative closure-CPT source available; the
  // procedureCodes param is ready, only the verified CPT set is missing). Every recommended procedure is named
  // as text, no CPT numeral.
  const hasPFO_SH = dxCodes.some(c => c.startsWith('Q21.12'));
  const hasASD_SH = dxCodes.some(c => c.startsWith('Q21.1') && !c.startsWith('Q21.12'));
  const hasStroke_SH = dxCodes.some(c => c.startsWith('I63'));
  const hasAF_SH5 = dxCodes.some(c => c.startsWith('I48'));
  const hasEisenmenger_SH = dxCodes.some(c => c.startsWith('I27.83'));
  const hasIE_SH = dxCodes.some(c => c.startsWith('I33.0'));
  const hasMassivePE_SH = dxCodes.some(c => c.startsWith('I26.0'));
  const hasShock_SH = dxCodes.some(c => c.startsWith('R57.0'));
  const hasTOF_SH = dxCodes.some(c => c.startsWith('Q21.3'));
  const hasEbstein_SH = dxCodes.some(c => c.startsWith('Q22.5'));
  const hasCardiacMyxoma_SH = dxCodes.some(c => c.startsWith('D15.1'));

  // Gap SH-026: PFO + cryptogenic stroke (age<60) -> closure evaluation
  // Guideline: 2020 ACC/AHA VHD + 2021 AAN PFO/stroke; RESPECT/CLOSE/REDUCE (closure superior to medical for
  // cryptogenic stroke + PFO in young patients). STANDING SUBGROUP CHECK: cryptogenic (PFO-attributable) vs
  // cardioembolic-from-AF - a stroke patient WITH AF (I48.x) is cardioembolic (treat the AF), NOT a PFO-closure
  // candidate, so AF is excluded. Path-B: full RoPE-score components (cortical infarct, absent vascular risk
  // factors) are mostly not codable - this surfaces the candidate population for a RoPE-scored closure discussion.
  if (hasPFO_SH && hasStroke_SH && age < 60 && !hasAF_SH5 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'PFO + cryptogenic stroke (age<60): closure evaluation gap',
      target: 'Heart-team / neurology PFO-closure discussion with RoPE-score assessment',
      recommendations: {
        action: 'Consider transcatheter PFO closure evaluation (with RoPE-score assessment) for cryptogenic stroke + PFO in a patient under 60 per 2020 ACC/AHA VHD and the RESPECT/CLOSE/REDUCE evidence',
        guideline: '2020 ACC/AHA VHD; RESPECT / CLOSE / REDUCE',
        note: 'Subgroup-aware: AF (I48.x) excluded as a cardioembolic source (treat the AF, not the PFO). Path-B: RoPE-score components (cortical infarct, vascular risk factors) mostly not codable.',
      },
      evidence: {
        triggerCriteria: [
          'Patent foramen ovale (Q21.12)',
          'Cerebral infarction (I63.x)',
          `Age: ${age} (<60)`,
          'No atrial fibrillation (cardioembolic source excluded)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; RESPECT/CLOSE/REDUCE',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Atrial fibrillation (cardioembolic, routes to anticoagulation)', 'Other identified stroke etiology'],
      },
    });
  }

  // Gap SH-027: Hemodynamically significant ASD -> closure evaluation
  // Guideline: 2020 ACC/AHA VHD; 2018 AHA/ACC ACHD (Class 1 closure for RV volume overload). STANDING SUBGROUP
  // CHECK: Eisenmenger physiology (I27.83, fixed severe PAH) is a CONTRAINDICATION to closure - excluded. Path-B:
  // shunt magnitude (Qp:Qs) + RV dilation are not threaded; elevated PASP (threaded) is the significance proxy.
  if (hasASD_SH && labValues['pasp'] !== undefined && labValues['pasp'] >= 40 && !hasEisenmenger_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Hemodynamically significant ASD: closure evaluation gap',
      target: 'ASD closure candidacy assessed (shunt magnitude + RV assessment at heart team)',
      recommendations: {
        action: 'Consider ASD closure evaluation for a hemodynamically significant atrial septal defect per 2020 ACC/AHA VHD and 2018 ACHD guidance',
        guideline: '2020 ACC/AHA VHD; 2018 AHA/ACC ACHD',
        note: 'Subgroup-aware: Eisenmenger physiology (fixed severe PAH, I27.83) excluded - closure contraindicated. Path-B: Qp:Qs + RV dilation not threaded; elevated PASP used as the significance proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Atrial septal defect (Q21.1x, not PFO)',
          `Elevated PASP: ${labValues['pasp']} mmHg (>=40, significance proxy)`,
          'Not Eisenmenger physiology',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; 2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Eisenmenger physiology (I27.83) - closure contraindicated', 'Small non-significant shunt'],
      },
    });
  }

  // Gap SH-029: Infective endocarditis with an early-surgery indication -> surgery review
  // Guideline: 2020 ACC/AHA VHD (Class 1 early surgery for HF, uncontrolled infection, or embolic events).
  // Reconciliation (AUDIT-172, v3.0 VHD close): SCOPE-NARROWED. The HF arm (I33.0 + I50) was an exact duplicate
  // of the new granular VHD-057, so it is REMOVED here (VHD-057 owns IE + heart failure). The embolic arm is
  // retained (broader than VHD-059, which gates on on-anticoagulation - removing it would lose the
  // embolic-not-anticoagulated population), as is the uncontrolled-infection arm (A41/R65.2, unique to this
  // rule and not covered by the granular VHD gaps). This is general/native IE, NOT structural-device-specific,
  // so it is scope-narrowed (not superseded). A benign residual overlap with VHD-059 on the anticoagulated-
  // embolic subset remains (both surface a consistent surgery-eval recommendation; non-harmful).
  const hasIEEmbolic_SH = dxCodes.some(c => c.startsWith('I74') || c.startsWith('I63'));
  const hasIEUncontrolled_SH = dxCodes.some(c => c.startsWith('A41') || c.startsWith('R65.2'));
  if (hasIE_SH && (hasIEEmbolic_SH || hasIEUncontrolled_SH) && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Infective endocarditis with an embolic / uncontrolled-infection surgery indication: surgery evaluation gap',
      target: 'Endocarditis-team early-surgery evaluation completed',
      recommendations: {
        action: 'Consider early surgery evaluation for infective endocarditis with embolic events or uncontrolled infection per 2020 ACC/AHA VHD (Class 1). For IE with heart failure, see VHD-057.',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Scope-narrowed (AUDIT-172): the IE + heart-failure arm is owned by VHD-057. Early-surgery indication present via a threaded proxy (embolic I74/I63, or uncontrolled infection A41/R65.2). Path-B: vegetation size + persistent bacteremia duration not threaded.',
      },
      evidence: {
        triggerCriteria: [
          'Acute/subacute infective endocarditis (I33.0)',
          `Early-surgery indication: ${hasIEEmbolic_SH ? 'embolic event' : 'uncontrolled infection'}`,
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative risk', 'Surgery already performed this episode', 'IE + heart failure (owned by VHD-057)'],
      },
    });
  }

  // Gap SH-091: High-risk (massive) PE -> systemic lysis / embolectomy / ECMO evaluation
  // Guideline: 2019 ESC / 2020 ACC PE; massive (hemodynamically unstable) PE warrants reperfusion. STANDING
  // SUBGROUP CHECK: massive (shock/instability) vs submassive (intermediate-risk) - only the massive subgroup
  // gets primary reperfusion; submassive is NOT in scope (would over-treat). Gate = PE with acute cor pulmonale
  // (I26.0x) + cardiogenic shock (R57.0).
  if (hasMassivePE_SH && hasShock_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Massive (high-risk) PE with instability: reperfusion evaluation gap',
      target: 'Systemic thrombolysis, surgical embolectomy, or ECMO/PERT evaluation',
      recommendations: {
        action: 'Consider urgent reperfusion (systemic thrombolysis, catheter or surgical embolectomy, or ECMO via a PE response team) for massive PE with hemodynamic instability per 2019 ESC / 2020 ACC PE guidance',
        guideline: '2019 ESC / 2020 ACC Pulmonary Embolism',
        note: 'Subgroup-aware: massive (shock) only - submassive/intermediate-risk PE is NOT in scope. Path-B: RV/troponin risk stratification beyond the cor-pulmonale + shock codes not fully threaded.',
      },
      evidence: {
        triggerCriteria: [
          'Pulmonary embolism with acute cor pulmonale (I26.0x)',
          'Cardiogenic shock (R57.0) - hemodynamic instability',
        ],
        guidelineSource: '2019 ESC Guideline on Acute Pulmonary Embolism; 2020 ACC Pulmonary Embolism guidance',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Absolute thrombolysis contraindication (then embolectomy/ECMO)', 'Reperfusion already delivered'],
      },
    });
  }

  // Gap SH-101: Eisenmenger physiology -> PAH-specific therapy evaluation
  // Guideline: 2018 AHA/ACC ACHD; 2022 ESC/ERS PH (PAH-specific therapy improves outcomes in Eisenmenger).
  if (hasEisenmenger_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Eisenmenger physiology without PAH-specific therapy evaluation',
      target: 'PAH-specific therapy evaluation at a PH/ACHD center',
      recommendations: {
        action: 'Consider PAH-specific therapy evaluation (endothelin-receptor antagonist, PDE5 inhibitor, or prostacyclin pathway) at a PH/ACHD center for Eisenmenger physiology per 2018 AHA/ACC ACHD and 2022 ESC/ERS PH',
        guideline: '2018 AHA/ACC ACHD; 2022 ESC/ERS Pulmonary Hypertension',
        note: 'Eisenmenger is a high-risk ACHD/PAH subgroup requiring specialist-directed therapy. Path-B: current PAH-drug status not gated here - surfaces the population for specialist evaluation.',
      },
      evidence: {
        triggerCriteria: [
          "Eisenmenger's syndrome (I27.83)",
        ],
        guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline; 2022 ESC/ERS Pulmonary Hypertension Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already under PH-center management on PAH therapy'],
      },
    });
  }

  // Gap SH-096: Adult repaired Tetralogy of Fallot -> pulmonary valve replacement evaluation
  // Guideline: 2018 AHA/ACC ACHD (PVR for RV dilation/dysfunction in repaired TOF).
  if (hasTOF_SH && age >= 18 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Adult Tetralogy of Fallot: pulmonary valve replacement evaluation gap',
      target: 'CMR-based RV assessment + pulmonary valve replacement candidacy evaluation',
      recommendations: {
        action: 'Consider cardiac MRI-based RV assessment and pulmonary valve replacement evaluation for an adult with repaired Tetralogy of Fallot per 2018 AHA/ACC ACHD',
        guideline: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        note: 'Path-B: RV dilation/dysfunction (CMR RV end-diastolic volume) is the intervention trigger but is not threaded - this surfaces the adult repaired-TOF population for protocolized RV surveillance/PVR evaluation.',
      },
      evidence: {
        triggerCriteria: [
          'Tetralogy of Fallot (Q21.3)',
          `Adult (age ${age} >=18)`,
        ],
        guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent CMR/PVR evaluation on file'],
      },
    });
  }

  // Gap SH-099: Ebstein anomaly -> arrhythmia surveillance
  // Guideline: 2018 AHA/ACC ACHD (atrial + accessory-pathway arrhythmia risk in Ebstein).
  if (hasEbstein_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Ebstein anomaly without arrhythmia surveillance on file',
      target: 'Periodic rhythm monitoring (atrial arrhythmia + accessory-pathway screening)',
      recommendations: {
        action: 'Consider periodic rhythm monitoring for Ebstein anomaly (atrial arrhythmia and accessory-pathway risk) per 2018 AHA/ACC ACHD',
        guideline: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        note: 'Path-B: monitoring dates are not tracked - surfaces the Ebstein population for scheduled rhythm surveillance.',
      },
      evidence: {
        triggerCriteria: [
          "Ebstein's anomaly (Q22.5)",
        ],
        guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent rhythm monitoring within interval'],
      },
    });
  }

  // Gap SH-103: Benign cardiac neoplasm (atrial myxoma) -> surgical referral
  // Guideline: surgical resection is standard for atrial myxoma given embolic + obstruction risk.
  if (hasCardiacMyxoma_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Benign cardiac neoplasm (atrial myxoma): surgical referral gap',
      target: 'Cardiac surgery referral for resection evaluation',
      recommendations: {
        action: 'Consider cardiac surgery referral for resection evaluation of a benign cardiac neoplasm (atrial myxoma carries embolic and obstruction risk)',
        guideline: 'ACC/AHA cardiac-masses consensus; standard of care for atrial myxoma',
        note: 'D15.1 covers benign cardiac neoplasms (atrial myxoma is the predominant one). Path-B: referral status not tracked - surfaces the dx for a resection discussion.',
      },
      evidence: {
        triggerCriteria: [
          'Benign neoplasm of heart (D15.1) - atrial myxoma',
        ],
        guidelineSource: 'ACC/AHA cardiac-masses consensus; standard surgical management of atrial myxoma',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Resection already performed', 'Prohibitive operative risk'],
      },
    });
  }

  // ===== v3.0 SH chunk 6: valve-procedure + remaining buildable SH gaps =====
  // Built on the RESOLVED AUDIT-123/124 Z95.x semantics: Z95.2 = prosthetic (generic), Z95.3 = xenogenic
  // (bioprosthetic), Z95.4 = other replacement. Post-AVR proxy = Z95.2||Z95.3 + AS history (no aortic-position
  // or TAVR-vs-SAVR ICD code; Path-B). All ICDs section-16-verified vs NLM Clinical Tables 2026-06-17. Procedures
  // named as recommendation text (no CPT numeral). CPT-gated post-procedure gaps (SH-065/066 TEER, SH-082/083
  // closure, SH-104 ASA) STAY PARKED in the CPT-verification-blocked tranche. SH-058 (HALT CT) + SH-062 (iEOA PPM)
  // stay DUA-deferred (CT/echo-morphology + indexed-EOA not threaded).
  const hasPriorAVR_SH = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3')) && dxCodes.some(c => c.startsWith('I35.0'));
  const onAspirin_SH6 = medCodes.includes('1191');
  const onP2Y12_SH6 = P2Y12_CODES_CV.some(c => medCodes.includes(c));
  const hasAF_SH6 = dxCodes.some(c => c.startsWith('I48'));

  // Gap SH-059: Post-AVR antithrombotic regimen review (de-escalation)
  // Guideline: 2020 ACC/AHA VHD; POPular-TAVI (aspirin monotherapy, not indefinite DAPT, post-TAVR absent another
  // indication; OAC if AF). SUBGROUP-AWARE: AF -> OAC; no other indication -> single antiplatelet.
  if (hasPriorAVR_SH && onAspirin_SH6 && onP2Y12_SH6 && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MEDICATION_NOT_OPTIMIZED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-AVR on dual antiplatelet: antithrombotic regimen reassessment gap',
      target: 'Antithrombotic de-escalation reviewed (single antiplatelet, or OAC if atrial fibrillation)',
      recommendations: {
        action: hasAF_SH6
          ? 'Consider reassessing antithrombotic therapy post-AVR with concurrent atrial fibrillation - oral anticoagulation (not dual antiplatelet) is generally indicated per 2020 ACC/AHA VHD'
          : 'Consider de-escalating dual antiplatelet to single antiplatelet post-AVR absent another DAPT indication, per 2020 ACC/AHA VHD and POPular-TAVI',
        guideline: '2020 ACC/AHA Valvular Heart Disease; POPular-TAVI',
        note: 'Subgroup-aware: AF -> OAC; no other indication -> single antiplatelet. Path-B: time-since-implant (>3-6 mo) and TAVR-vs-SAVR not coded; post-AVR proxy = prosthetic AV (Z95.2/Z95.3) + AS history.',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic aortic valve (Z95.2 or Z95.3 xenogenic) with aortic stenosis history',
          'On dual antiplatelet (aspirin + a P2Y12 inhibitor)',
          hasAF_SH6 ? 'Concurrent atrial fibrillation (I48.x)' : 'No other documented DAPT indication',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; POPular-TAVI',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent PCI or other active DAPT indication', 'Bleeding risk reassessed within interval'],
      },
    });
  }

  // Gap SH-057: Post-AVR new LBBB -> ambulatory rhythm monitoring
  // Guideline: 2020 ACC/AHA VHD; post-TAVR conduction pathway (new LBBB warrants ambulatory monitoring for
  // delayed high-grade AV block).
  const hasNewLBBB_SH = dxCodes.some(c => c.startsWith('I44.7'));
  if (hasPriorAVR_SH && hasNewLBBB_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-AVR new LBBB without ambulatory rhythm monitoring',
      target: 'Ambulatory rhythm monitoring (30-day Holter or loop recorder) for delayed AV block',
      recommendations: {
        action: 'Consider ambulatory rhythm monitoring (30-day Holter or loop recorder) for new LBBB after aortic valve replacement to detect delayed high-grade AV block per 2020 ACC/AHA VHD post-TAVR conduction pathway',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Path-B: TAVR-vs-SAVR, time-since-implant, and monitoring-completed status not coded.',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic aortic valve (Z95.2 or Z95.3) with aortic stenosis history',
          'New left bundle-branch block (I44.7)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Pacemaker already present', 'Recent ambulatory monitoring on file'],
      },
    });
  }

  // Gap SH-060: Post-AVR high-grade AV block -> permanent pacing decision
  // Guideline: 2018 ACC/AHA/HRS bradycardia; post-TAVR high-grade/complete AV block is a Class 1 pacing indication.
  // SUBGROUP-AWARE vs SH-057: LBBB -> monitor (SH-057); high-grade/complete block -> pace (this gap).
  const hasHighGradeAVB_SH = dxCodes.some(c => c.startsWith('I44.1') || c.startsWith('I44.2'));
  if (hasPriorAVR_SH && hasHighGradeAVB_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-AVR high-grade AV block: permanent pacing decision gap',
      target: 'Permanent pacemaker decision documented for post-AVR high-grade AV block',
      recommendations: {
        action: 'Consider permanent pacemaker evaluation for high-grade or complete AV block after aortic valve replacement per 2018 ACC/AHA/HRS bradycardia guideline (Class 1)',
        guideline: '2018 ACC/AHA/HRS Bradycardia Guideline',
        note: 'Subgroup-aware: complete/high-grade AV block -> pacing decision (vs isolated LBBB -> monitoring, SH-057). Path-B: time-since-implant not coded.',
      },
      evidence: {
        triggerCriteria: [
          'Prosthetic aortic valve (Z95.2 or Z95.3) with aortic stenosis history',
          'Second-degree (I44.1) or complete (I44.2) AV block',
        ],
        guidelineSource: '2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Bradycardia',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Pacemaker already present (Z95.0)', 'Reversible cause documented'],
      },
    });
  }

  // SUPERSEDED 2026-06-17 by the type-aware VHD-068 / VHD-011 (v3.0 VHD chunk 2) - the legacy SH-012 firing is
  // removed (comment lead de-tokenized at the VHD close, AUDIT-171, so extractCode no longer parses this retired
  // marker as an evaluator block; mirrors the clean SH-9 / SH-ASD retirements rather than leaving an evalOrphan).
  // Superseded (AUDIT-169): the legacy SH-012 was the GENERAL, un-partitioned prosthetic-SVD gap - it gated ANY prosthetic
  // (Z95.2/.3/.4) + elevated AORTIC gradient and applied an SVD/ViV-vs-redo recommendation UNIFORMLY, including to
  // MECHANICAL valves (for which an elevated gradient is thrombosis/pannus, NOT structural deterioration). The
  // chunk-2 partition strictly improves on it: VHD-068 (mechanical Z95.2/.4 -> PVT workup) + VHD-011 (bioprosthetic
  // Z95.3 -> SVD / ViV-vs-redo), each with the type-correct recommendation, AND extended to the MITRAL prosthesis
  // (mitral_valve_mean_gradient). No coverage lost (aortic still covered, mitral added, type-partition added).
  // Supersede-not-delete: firing removed here; the SH registry entry is reconciled at the SH/VHD close.

  // Gap SH-092: Post-PE CTEPH surveillance
  // Guideline: 2019 ESC PE / 2022 ESC-ERS PH; persistent dyspnea after PE warrants chronic thromboembolic
  // pulmonary hypertension (CTEPH) workup (echo + V/Q scan).
  const hasPEHistory_SH = dxCodes.some(c => c.startsWith('I26') || c.startsWith('Z86.711'));
  const hasPersistentDyspnea_SH = dxCodes.some(c => c.startsWith('R06'));
  if (hasPEHistory_SH && hasPersistentDyspnea_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-PE persistent dyspnea: CTEPH surveillance workup gap',
      target: 'CTEPH workup (echocardiography + ventilation-perfusion scan) completed',
      recommendations: {
        action: 'Consider CTEPH workup (echocardiography and ventilation-perfusion scan) for persistent dyspnea after pulmonary embolism per 2019 ESC PE / 2022 ESC-ERS PH',
        guideline: '2019 ESC Pulmonary Embolism; 2022 ESC/ERS Pulmonary Hypertension',
        note: 'Path-B: the 3-6 month post-PE window is not coded; PE history + persistent dyspnea is the surveillance-due proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Pulmonary embolism, current or history (I26.x or Z86.711)',
          'Persistent dyspnea (R06.x)',
        ],
        guidelineSource: '2019 ESC Guideline on Acute Pulmonary Embolism; 2022 ESC/ERS Pulmonary Hypertension Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'CTEPH already evaluated/diagnosed', 'Recent workup within interval'],
      },
    });
  }

  // Gap SH-095: Coarctation of the aorta -> serial imaging surveillance
  // Guideline: 2018 AHA/ACC ACHD; coarctation (native or repaired) needs lifelong serial imaging for
  // re-coarctation, aneurysm, and pseudoaneurysm.
  const hasCoarctation_SH = dxCodes.some(c => c.startsWith('Q25.1'));
  if (hasCoarctation_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Coarctation of the aorta without serial imaging surveillance',
      target: 'Serial cross-sectional imaging (CTA or MRA) surveillance completed',
      recommendations: {
        action: 'Consider serial cross-sectional aortic imaging (CTA or MRA) surveillance for coarctation of the aorta (re-coarctation, aneurysm, pseudoaneurysm) per 2018 AHA/ACC ACHD',
        guideline: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        note: 'Path-B: repair status is not coded (Q25.1 persists post-repair); serial imaging is recommended for native and repaired coarctation alike.',
      },
      evidence: {
        triggerCriteria: [
          'Coarctation of the aorta (Q25.1)',
        ],
        guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent cross-sectional imaging within interval'],
      },
    });
  }

  // Gap SH-097: Systemic right ventricle (ccTGA / d-TGA post-atrial-switch) -> ACHD-center surveillance
  // Guideline: 2018 AHA/ACC ACHD; a systemic RV (congenitally corrected TGA Q20.5, or d-TGA Q20.3 post
  // Senning/Mustard) is at risk of systemic-RV failure and systemic-AV-valve regurgitation -> specialist f/u.
  const hasSystemicRV_SH = dxCodes.some(c => c.startsWith('Q20.5') || c.startsWith('Q20.3'));
  if (hasSystemicRV_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.FOLLOWUP_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Systemic right ventricle (ccTGA / TGA) without dedicated ACHD-center surveillance',
      target: 'Dedicated ACHD-center surveillance (systemic-RV function + systemic-AV-valve assessment)',
      recommendations: {
        action: 'Consider dedicated ACHD-center surveillance for a systemic right ventricle (congenitally corrected TGA, or transposition post atrial switch) - systemic-RV failure and systemic AV-valve regurgitation risk - per 2018 AHA/ACC ACHD',
        guideline: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        note: 'Path-B: post-atrial-switch (Senning/Mustard) procedure status is not separately coded; the discordant-connection dx (Q20.5 ccTGA, Q20.3 d-TGA) is the systemic-RV proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Systemic RV anatomy: discordant AV connection (Q20.5, ccTGA) or discordant VA connection (Q20.3, d-TGA)',
        ],
        guidelineSource: '2018 AHA/ACC Adult Congenital Heart Disease Guideline',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already under ACHD-center management'],
      },
    });
  }

  // ===== v3.0 SH chunk 7: CPT-unblocked post-procedure gaps (manufacturer-confirmed CPTs) =====
  // These detect a prior PROCEDURE via the engine-wide procedureCodes param (8th arg, PR #396) - no threading.
  // CPTs cleared the two-key bar (manufacturer reimbursement guide + operator sign-off): 93580 = ASD/PFO closure
  // (Abbott Amplatzer guide; covers both ASD and PFO, no distinct PFO code), 93581 = VSD closure, 33418 = mitral
  // TEER initial / 33419 = each additional (Abbott MitraClip guide; MITRAL, not tricuspid). STILL PARKED: SH-104
  // (alcohol septal ablation 93583 - confirmed only via non-manufacturer sources, no device guide exists for the
  // technique, so it does not clear the operator CPT bar). All recommended procedures named as text.
  const onAnyAntithrombotic_SH = medCodes.includes('1191')
    || P2Y12_CODES_CV.some(c => medCodes.includes(c))
    || OAC_CODES_CV.some(c => medCodes.includes(c));
  const hasSeptalClosure_SH = procedureCodes.includes('93580') || procedureCodes.includes('93581');
  const hasMitralTEER_SH = procedureCodes.includes('33418') || procedureCodes.includes('33419');
  const echoOverdueProxy_SH = labValues['lvef'] === undefined;
  const hasAF_SH7 = dxCodes.some(c => c.startsWith('I48'));

  // Gap SH-082: Post-ASD/PFO/VSD closure without an antithrombotic regimen
  // Guideline: 2020 ACC/AHA VHD + closure-device IFUs; post-closure antiplatelet (aspirin +/- clopidogrel for
  // ~6 months, then aspirin) is standard; OAC if atrial fibrillation. SUBGROUP-AWARE: AF -> OAC; else antiplatelet.
  if (procedureCodes.includes('93580') || procedureCodes.includes('93581')) {
    if (!onAnyAntithrombotic_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Post-septal-closure device without an antithrombotic regimen',
        target: 'Antithrombotic regimen documented (antiplatelet, or oral anticoagulation if atrial fibrillation)',
        recommendations: {
          action: hasAF_SH7
            ? 'Consider an antithrombotic regimen after septal-closure device placement - oral anticoagulation is indicated with concurrent atrial fibrillation per 2020 ACC/AHA VHD and device IFUs'
            : 'Consider an antiplatelet regimen (aspirin, with clopidogrel for the initial post-implant period) after septal-closure device placement per 2020 ACC/AHA VHD and device IFUs',
          guideline: '2020 ACC/AHA Valvular Heart Disease; closure-device IFUs',
          note: 'Detected via the procedureCodes param (CPT 93580 ASD/PFO or 93581 VSD closure, manufacturer-confirmed). Subgroup-aware: AF -> OAC; else antiplatelet. Path-B: implant date / duration not threaded.',
        },
        evidence: {
          triggerCriteria: [
            'Prior septal-closure device (CPT 93580 ASD/PFO or 93581 VSD)',
            'No antithrombotic (antiplatelet or anticoagulant) on the active medication list',
            hasAF_SH7 ? 'Concurrent atrial fibrillation (I48.x)' : 'No atrial fibrillation (antiplatelet pathway)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease; closure-device Instructions for Use',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C-EO',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding / antithrombotic contraindication', 'Already on antithrombotic for another indication'],
        },
      });
    }

    // Gap SH-083: Post-closure residual-shunt surveillance echo
    // Guideline: post-closure follow-up echo detects residual shunt and device-related complications.
    if (echoOverdueProxy_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
      gaps.push({
        type: TherapyGapType.IMAGING_OVERDUE,
        module: ModuleType.STRUCTURAL_HEART,
        status: 'Post-septal-closure without surveillance echo (residual-shunt assessment)',
        target: 'Post-closure surveillance echocardiogram (residual shunt + device position) completed',
        recommendations: {
          action: 'Consider a post-closure surveillance echocardiogram to assess for residual shunt and device position after septal-closure device placement',
          guideline: '2020 ACC/AHA Valvular Heart Disease; closure-device follow-up',
          note: 'Detected via the procedureCodes param (CPT 93580/93581, manufacturer-confirmed). Path-B: residual-shunt magnitude is not quantified in structured data; the surveillance echo is the detection vehicle. Echo-overdue proxied by absent LVEF.',
        },
        evidence: {
          triggerCriteria: [
            'Prior septal-closure device (CPT 93580 ASD/PFO or 93581 VSD)',
            'No recent echocardiogram on file (surveillance-overdue proxy)',
          ],
          guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE C-LD',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Recent surveillance echo within interval'],
        },
      });
    }
  }

  // Gap SH-065: Post-mitral-TEER surveillance echo
  // Guideline: 2020 ACC/AHA VHD; annual echo surveillance after transcatheter mitral repair (TEER).
  if (hasMitralTEER_SH && echoOverdueProxy_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Post-mitral-TEER without annual surveillance echo',
      target: 'Annual transthoracic echocardiogram after mitral TEER completed',
      recommendations: {
        action: 'Consider annual surveillance echocardiography after transcatheter edge-to-edge mitral repair (TEER) per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Detected via the procedureCodes param (CPT 33418/33419 mitral TEER, Abbott MitraClip-confirmed). Echo-overdue proxied by absent LVEF.',
      },
      evidence: {
        triggerCriteria: [
          'Prior mitral TEER (CPT 33418 or 33419)',
          'No recent echocardiogram on file (surveillance-overdue proxy)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent surveillance echo within interval'],
      },
    });
  }

  // Gap SH-066: Recurrent significant MR after mitral TEER -> reassessment (redo TEER vs surgery)
  // Guideline: 2020 ACC/AHA VHD; recurrent/residual significant MR after TEER warrants heart-team reassessment.
  const recurrentSignificantMR_SH =
    (labValues['mitral_eroa'] !== undefined && labValues['mitral_eroa'] >= 0.30) ||
    (labValues['mitral_regurg_grade'] !== undefined && labValues['mitral_regurg_grade'] >= 3) ||
    (labValues['valve_severity'] !== undefined && labValues['valve_severity'] >= 4);
  if (hasMitralTEER_SH && recurrentSignificantMR_SH && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.STRUCTURAL_HEART,
      status: 'Recurrent significant MR after mitral TEER: heart-team reassessment gap',
      target: 'Heart-team reassessment (redo TEER vs mitral surgery) for recurrent/residual MR',
      recommendations: {
        action: 'Consider heart-team reassessment (redo TEER versus mitral valve surgery) for recurrent or residual significant mitral regurgitation after TEER per 2020 ACC/AHA VHD',
        guideline: '2020 ACC/AHA Valvular Heart Disease',
        note: 'Detected via the procedureCodes param (CPT 33418/33419 mitral TEER) + threaded MR severity. Path-B: the serial pre/post-TEER MR-grade trend is not threaded; current moderate-severe-or-worse MR is the recurrence proxy.',
      },
      evidence: {
        triggerCriteria: [
          'Prior mitral TEER (CPT 33418 or 33419)',
          'Recurrent/residual significant MR (EROA >=0.30, regurg grade >=3, or valve_severity >=4)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Prohibitive operative + redo-transcatheter risk', 'Reassessment already documented'],
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
  // PAD + claudication (I73.9) + no cilostazol (21107) -- AUDIT-104: was 19847 = bumadizone (an NSAID); nominal 24592 is NotCurrent, do not use
  if (
    hasPAD &&
    dxCodes.some(c => c.startsWith('I73.9')) &&
    !medCodes.includes('21107') && // AUDIT-104: cilostazol (was 19847 = bumadizone)
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
            'No cilostazol on active medication list (RxNorm 21107)',
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
  // Note (2026-06-16): the Z95.0 arm is intentionally dual-purpose - it captures BOTH a new pacing indication
  //   (I44 AV block, no device yet) AND an EXISTING-device patient (Z95.0) with HF + low EF who is a CSP/CRT
  //   UPGRADE candidate (to minimize RV-pacing-induced cardiomyopathy). The "existing CRT device" exclusion in
  //   the evidence object is not separately enforced (CRT-vs-RV-pacing device type is not ingested) - so an
  //   already-optimized CRT patient could fire; clinician confirms device type. Documented limitation.
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
  // AAD codes: flecainide (4441), propafenone (8754), sotalol (9947), amiodarone (703), dofetilide (49247)
  const AAD_CODES = ['4441', '8754', '9947', '703', '49247'];
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
  // AF + on dronedarone (RxNorm 233698) -- CONTRAINDICATED in (a) advanced HF NYHA III/IV (ANDROMEDA) OR
  // (b) PERMANENT AF (PALLAS - increased CV death/stroke/HF-hospitalization). Both are Class 3 (Harm).
  // Dronedarone permanent-AF arm (GAP-EP-046) added 2026-06-16: I48.21 (permanent AF) fires independent of HF status.
  if (
    hasAF &&
    medCodes.includes('233698') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    // LVEF <35% as proxy for NYHA III/IV (requires an HF dx); permanent AF is the second, HF-independent arm.
    const severeHF = hasHF && labValues['lvef'] !== undefined && labValues['lvef'] < 35;
    const hasPermanentAF = dxCodes.some(c => c.startsWith('I48.21')); // permanent AF (PALLAS)
    if (severeHF || hasPermanentAF) {
      const arm = severeHF ? 'advanced heart failure (NYHA III/IV proxy)' : 'permanent atrial fibrillation';
      gaps.push({
        type: TherapyGapType.MEDICATION_CONTRAINDICATED,
        module: ModuleType.ELECTROPHYSIOLOGY,
        status: `Dronedarone contraindicated in ${arm}`,
        target: 'Dronedarone discontinued; reassess rhythm-vs-rate strategy',
        medication: 'Dronedarone',
        recommendations: {
          action: 'Consider discontinuing dronedarone: contraindicated in NYHA III/IV / decompensated HF (ANDROMEDA) and in permanent AF (PALLAS) per 2023 ACC/AHA/ACCP/HRS AF Guideline Class 3 (Harm)',
          guideline: '2023 ACC/AHA/ACCP/HRS AF Guideline',
          note: 'SAFETY ALERT: dronedarone increases mortality in advanced HF (ANDROMEDA) and CV events in permanent AF (PALLAS).',
        },
        evidence: {
          triggerCriteria: [
            'Atrial fibrillation diagnosis (I48.*)',
            'Dronedarone active (RxNorm 233698)',
            severeHF ? `Heart failure + LVEF: ${labValues['lvef']}% (<35%, proxy for NYHA III/IV) - ANDROMEDA arm` : 'Permanent atrial fibrillation (I48.21) - PALLAS arm',
          ],
          guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ANDROMEDA + PALLAS Trials)',
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
    const OAC_CODES_FLUTTER = ['1364430', '1114195', '1599538', '1037042', '11289'];
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
  // Path-B genotype limit (noted 2026-06-16): LQTS subtype is not ingested. The preferred BBs in LQTS are the
  //   non-selective NADOLOL / PROPRANOLOL; the "treated" set here also counts metoprolol/carvedilol/bisoprolol
  //   (less effective for LQTS, esp. LQT2). And LQT3 (SCN5A) responds less to BB and may prefer mexiletine - the
  //   genotype-specific tailoring is DUA-deferred (ties to EP-081 LQT1-nadolol / EP-083 LQT3-mexiletine). The
  //   primary no-BB-at-all gap below remains correct; the subtype refinement awaits genotype ingestion.
  const hasLQTS = dxCodes.some(c => c.startsWith('I45.81'));
  if (hasLQTS && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const BB_CODES_LQTS = ['20352', '6918', '19484', '7226']; // carvedilol, metoprolol, bisoprolol, nadolol — AUDIT-043 (2026-05-05): was '7512' = norepinephrine, NOT nadolol
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

  // EP-SUBCLINICAL-AF: Subclinical AF Detection in Device Patients (PROXY)
  // Guideline: 2023 ACC/AHA/ACCP/HRS AF Guideline (ASSERT), Class 2a, LOE B-R.
  // Citation corrected 2026-06-16: NOAH-AFNET 6 was NEGATIVE for ANTICOAGULATING device-detected AHRE - it does
  //   NOT support a screen-and-anticoagulate rationale, so it is removed. ASSERT established the AHRE-stroke
  //   association that motivates REVIEWING the interrogation (the action here); the decision to anticoagulate is
  //   left to the clinician (NOAH/ARTESIA nuance). The recommendation is review-only, not anticoagulate.
  // PROXY/breadth: this fires on EVERY cardiac-device patient (Z95.0) >=65 without an AF dx - a broad screening
  //   prompt. The AHRE burden threshold (e.g. >=24h) is NOT checkable (device telemetry not ingested - EP-018 is a
  //   DUA-deferred device-interrogation gap). Benign "consider reviewing interrogation" prompt only.
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
        note: 'Recommended for review: device-detected AHRE is associated with increased stroke risk (ASSERT). Whether to anticoagulate is individualized (NOAH-AFNET 6 / ARTESIA showed a modest, bleed-offset benefit) - this prompt is review-only.',
      },
      evidence: {
        triggerCriteria: [
          'Cardiac implantable device (Z95.0)',
          'No atrial fibrillation diagnosis on problem list',
          `Age: ${age} (>=65)`,
        ],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of AF (ASSERT)',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known AF already on anticoagulation', 'PROXY: AHRE burden threshold not ingested (DUA-deferred device-interrogation); broad screening prompt'],
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
  // QT-prolonging med codes: amiodarone (703), dofetilide (49247), sotalol (9947),
  //   ondansetron (26225), haloperidol (5093), methadone (6813)
  const QT_PROLONGING_CODES = ['703', '49247', '9947', '26225', '5093', '6813'];
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
  // RxNorm: evolocumab (1665684), alirocumab (1659152) -- AUDIT-102: was 1657974 = tocilizumab, 1659149 = piperacillin/tazobactam
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_PCSK9 = ['83367', '301542', '36567', '42463'];
    const onStatinPCSK9 = medCodes.some(c => STATIN_CODES_PCSK9.includes(c));
    const PCSK9_CODES = ['1665684', '1659152']; // AUDIT-102: evolocumab, alirocumab (was 1657974 tocilizumab, 1659149 pip/tazo)
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
  // RxNorm icosapent ethyl: 1304974 -- AUDIT-102: was 1546275 = iodide ion
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const STATIN_CODES_O3 = ['83367', '301542', '36567', '42463'];
    const onStatinO3 = medCodes.some(c => STATIN_CODES_O3.includes(c));
    if (
      onStatinO3 &&
      labValues['triglycerides'] !== undefined && labValues['triglycerides'] > 150 &&
      !medCodes.includes('1304974') // AUDIT-102: icosapent ethyl (was 1546275 = iodide ion)
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
            'Icosapent ethyl not in active medications (RxNorm 1304974)',
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
  // RxNorm ranolazine: 35829 -- AUDIT-104: was 355019 = UNKNOWN/invalid CUI
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasAngina = dxCodes.some(c => c.startsWith('I20'));
    const BB_CODES_RAN = ['20352', '6918', '19484'];
    // Fix (AUDIT-052, 2026-05-06): refactored to canonical lookups (RXNORM_RATE_CONTROL + RXNORM_DHP_CCB).
    // Keeps exact 3-drug membership (diltiazem + 2 DHPs); future canonical updates flow through automatically.
    const CCB_CODES_RAN = [RXNORM_RATE_CONTROL.DILTIAZEM, RXNORM_DHP_CCB.AMLODIPINE, RXNORM_DHP_CCB.NIFEDIPINE];
    const onBBran = medCodes.some(c => BB_CODES_RAN.includes(c));
    const onCCBran = medCodes.some(c => CCB_CODES_RAN.includes(c));
    if (hasAngina && onBBran && onCCBran && !medCodes.includes('35829')) { // AUDIT-104: ranolazine (was 355019 = UNKNOWN)
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
            'Ranolazine not in active medications (RxNorm 35829)',
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
    const OAC_CODES_CAD_AF = ['1364430', '1114195', '1599538', '1037042', '11289'];
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
  // RxNorm GLP-1 RA: canonical RXNORM_GLP1_RA (AUDIT-104; was inline ['2551758','475968','1803932'] - 2551758 dead/UNKNOWN, 1803932 = leucovorin)
  if (hasCAD && hasDiabetes && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const GLP1_CODES = GLP1_RA_CODES_CV; // AUDIT-104: canonical RXNORM_GLP1_RA (semaglutide, liraglutide, dulaglutide)
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
    const SGLT2I_CODES_CAD = ['1488564', '1545653', '2638675']; // dapagliflozin, empagliflozin, sotagliflozin
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
  // RxNorm bempedoic acid: 2282403 -- AUDIT-104: was 2390411 = NotCurrent/invalid CUI
  if (hasCAD && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const hasStatinIntolerance = dxCodes.some(c => c.startsWith('Z88'));
    if (
      hasStatinIntolerance &&
      labValues['ldl'] !== undefined && labValues['ldl'] > 70 &&
      !medCodes.includes('2282403') // AUDIT-104: bempedoic acid (was 2390411 = NotCurrent)
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
            'Bempedoic acid not in active medications (RxNorm 2282403)',
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

  // CAD-TICAGRELOR-ACS: Potent P2Y12 inhibitor in Acute Coronary Syndrome
  // Guideline: 2021 ACC/AHA/SCAI Revascularization Guideline (PLATO / TRITON-TIMI 38), Class 1, LOE A
  // Tightening (AUDIT-176, CAD chunk 0 2026-06-18): the prior gate fired on !onTicagrelor alone, false-firing
  // a "consider ticagrelor" gap on patients correctly on PRASUGREL (an equally guideline-preferred potent
  // P2Y12). A patient on EITHER potent P2Y12 meets the ACS need, so also exclude prasugrel (613391). The
  // recommendation is reframed as the potent-P2Y12 choice (ticagrelor or prasugrel) over clopidogrel.
  if (hasRecentMI && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onTicagrelorACS = medCodes.includes('1116632');
    const onPrasugrelACS = medCodes.includes('613391');
    if (!onTicagrelorACS && !onPrasugrelACS) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider a potent P2Y12 inhibitor (ticagrelor or prasugrel) for ACS',
        target: 'Potent P2Y12 inhibitor therapy reviewed',
        medication: 'Ticagrelor or prasugrel',
        recommendations: {
          action: 'Consider a potent P2Y12 inhibitor (ticagrelor or prasugrel) over clopidogrel for ACS per 2021 ACC/AHA/SCAI Guideline (PLATO / TRITON-TIMI 38)',
          guideline: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization',
          note: 'Recommended for review: a potent P2Y12 (ticagrelor or prasugrel) is preferred over clopidogrel for ACS; fires only when on neither potent agent.',
        },
        evidence: {
          triggerCriteria: [
            'Acute coronary syndrome (I21.*)',
            'No potent P2Y12 (ticagrelor 1116632 or prasugrel 613391) in active medications',
          ],
          guidelineSource: '2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization (PLATO / TRITON-TIMI 38)',
          classOfRecommendation: 'Class 1',
          levelOfEvidence: 'LOE A',
          exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Prior intracranial hemorrhage', 'On ticagrelor or prasugrel (potent P2Y12 need met)'],
        },
      });
    }
  }

  // CAD-NITRO-PRN: PRN Nitroglycerin for Angina
  // Guideline: 2012 ACCF/AHA Stable Ischemic Heart Disease Guideline, Class 1, LOE B
  const hasAnginaNitro = dxCodes.some(c => c.startsWith('I20'));
  if (hasAnginaNitro && !hasContraindication(dxCodes, EXCLUSION_HOSPICE)) {
    const onNitro = medCodes.includes('4917'); // AUDIT-104: nitroglycerin (was 7832 = 4-aminohippuric acid)
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
            'No nitroglycerin (RxNorm 4917) in active medications',
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
  // Fix (AUDIT-062, 2026-05-06): was '36567' = simvastatin (a statin, NOT a PPI — drug class collision).
  // Removed; real PPIs verified: omeprazole (7646), pantoprazole (40790), esomeprazole (283742).
  // Note (AUDIT-052): follow-up will refactor to RXNORM_PPI canonical valueset.
  // Fix (AUDIT-052, 2026-05-06): refactored to canonical RXNORM_PPI valueset (5 standard PPIs).
  // Behavior change: expanded from 3 PPIs to 5 (added lansoprazole, rabeprazole) — clinical intent
  // is detecting any PPI co-prescription with DAPT, so broader coverage matches rule semantics.
  const PPI_CODES_DAPT = codes(RXNORM_PPI); // omeprazole, pantoprazole, esomeprazole, lansoprazole, rabeprazole
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
  // Fix (AUDIT-052, 2026-05-06): refactored to canonical RXNORM_LOOP_DIURETICS + RXNORM_THIAZIDES.
  // Behavior change: expanded from {furosemide, bumetanide, torsemide, HCTZ} to also include
  // ethacrynic acid + chlorthalidone + indapamide + metolazone. Rule clinical intent: detect any
  // loop or thiazide diuretic for electrolyte-monitoring purposes — broader coverage matches intent.
  const DIURETIC_CODES_ELEC = [...codes(RXNORM_LOOP_DIURETICS), ...codes(RXNORM_THIAZIDES)];
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

  // CAD-016 SAFETY: Prasugrel contraindicated in prior stroke/TIA history
  // Guideline: 2023 ACC/AHA Chronic Coronary Disease Guideline, Class 3 (Harm)
  // Rationale: FDA Effient (prasugrel) black-box warning — prasugrel + prior stroke/TIA
  //   carries fatal/intracranial bleeding risk per TRITON-TIMI 38 sub-analysis.
  // Stroke/TIA codes per established convention (matches CHA2DS2-VASc scoring at line 3984):
  //   I63.* (cerebral infarction), I64 (stroke unspecified),
  //   G45.* (TIA), Z86.73 (history of TIA/stroke without residual deficit)
  // Hemorrhagic stroke (I60-I62) intentionally NOT in discriminator — FDA black-box
  //   specifically warns about prior ischemic stroke/TIA. Hemorrhagic-stroke
  //   antiplatelet contraindication is a separate broader rule.
  if (
    medCodes.includes('613391') &&
    dxCodes.some(c =>
      c.startsWith('I63') || c.startsWith('I64') || c.startsWith('G45') || c === 'Z86.73'
    ) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.CORONARY_INTERVENTION,
      status: 'SAFETY: Prasugrel contraindicated in patient with prior stroke/TIA',
      target: 'Switch to ticagrelor or clopidogrel; preserve DAPT continuity',
      medication: 'Replace prasugrel with ticagrelor (RxNorm 1116632) or clopidogrel (RxNorm 32968)',
      recommendations: {
        action: 'Discontinue prasugrel and substitute ticagrelor or clopidogrel per FDA black-box + 2023 ACC/AHA CCD Class 3 (Harm)',
        guideline: '2023 ACC/AHA Chronic Coronary Disease Guideline + FDA Effient (prasugrel) Black-Box Warning',
        note: 'Prasugrel + prior stroke/TIA increases fatal and intracranial bleeding risk. Patient on combination therapy requires immediate switch.',
      },
      evidence: {
        triggerCriteria: [
          'On prasugrel (RxNorm 613391) in active medications',
          'Prior stroke/TIA history (ICD-10 I63.x cerebral infarction, I64 stroke unspecified, G45.x TIA, Z86.73 history without deficit)',
        ],
        guidelineSource: '2023 ACC/AHA Chronic Coronary Disease Guideline + FDA Effient Black-Box Warning',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
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
    const ASPIRIN_CODES_CAP = ['1191', '243670'];
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
            'No aspirin (RxNorm 1191/243670) in active medications',
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
    const BB_CODES_SCAD = ['20352', '6918', '19484', '7226']; // carvedilol, metoprolol, bisoprolol, nadolol — AUDIT-043 (2026-05-05): was '7512' = norepinephrine, NOT nadolol
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

  // RETIRED 2026-06-18 (CAD chunk 0, AUDIT-175): the nicorandil and trimetazidine gaps are removed. Both were
  // non-US, ESC-only agents (not in the 2023 ACC/AHA Chronic Coronary Disease Guideline) and their RxCUIs
  // (nicorandil 29987, trimetazidine 47832) FAIL section-16 - RxNav returns NOT FOUND for both. Neither block
  // mapped to a covered CAD spec gap. Dead code with unverifiable codes; removed cleanly (firing + registry).

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
    // Fix (AUDIT-052, 2026-05-06): refactored to canonical RXNORM_DHP_CCB valueset (5 DHP CCBs).
    // Behavior change: expanded from 3 DHPs to 5 (added felodipine, nicardipine) — clinical intent
    // is detecting any DHP for vasospastic angina, so broader coverage matches rule semantics.
    // Comment correction: original said "diltiazem" but 33910 = isradipine (DHP, not non-DHP).
    const CCB_CODES_VASOSP = codes(RXNORM_DHP_CCB);
    const onCCBvasosp = medCodes.some(c => CCB_CODES_VASOSP.includes(c));
    if (hasVasospasm && !onCCBvasosp) {
      gaps.push({
        type: TherapyGapType.MEDICATION_MISSING,
        module: ModuleType.CORONARY_INTERVENTION,
        status: 'Consider calcium channel blocker for vasospastic angina',
        target: 'CCB initiated or alternative vasodilator reviewed',
        medication: 'Diltiazem or Nifedipine',
        recommendations: {
          action: 'Consider a calcium channel blocker (diltiazem or nifedipine) as first-line therapy for confirmed vasospastic angina, and provocation/spasm testing to establish the diagnosis where it is not yet confirmed, per 2019 ESC CCS Guideline',
          guideline: '2019 ESC Guideline for Chronic Coronary Syndromes; JCS 2013 Vasospastic Angina Guideline',
          note: 'Recommended for review: this rule fires on a coded vasospastic-angina diagnosis (I20.1) without a CCB - CCBs are first-line therapy and beta-blockers may worsen vasospasm. Where vasospasm is suspected but not yet coded, provocation testing (the CAD-037 spec target) confirms the diagnosis (axis-reconciled, AUDIT-177-adjacent).',
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
  const RHYTHM_CONTROL_CODES_ER = ['4441', '8754', '9947', '703', '49247'];
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
  // Fix (AUDIT-050, 2026-05-06): was '2991' (invalid CUI; rule never matched diltiazem). Real diltiazem = 3443 (canonical).
  const RATE_CONTROL_CODES_SVT = ['6918', RXNORM_RATE_CONTROL.DILTIAZEM, '11170']; // metoprolol (6918), diltiazem (3443), verapamil (11170)
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

  // EP-BRUGADA: Brugada Syndrome Screening (PROXY)
  // Guideline: 2017 AHA/ACC/HRS VA Guideline, Class 1, LOE C
  // Syncope (R55) + age <45 (BOTH sexes - the MALE-only restriction was removed 2026-06-16: Brugada affects
  //   women too, and a female-restricted screen misses real cases).
  // PROXY/breadth note: R55 is generic syncope (mostly benign vasovagal); this is a broad screening prompt, not a
  //   confirmed gap. The "vasovagal syncope documented" exclusion is NOT enforceable (vasovagal is not separately
  //   ICD-codable under R55). True Brugada confirmation needs ECG-pattern morphology (not ingested - EP-023 carries
  //   a DUA-deferred ECG-morphology dependency); this fires as a benign "consider screening" prompt only.
  if (
    dxCodes.some(c => c.startsWith('R55')) &&
    age < 45 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.ELECTROPHYSIOLOGY,
      status: 'Consider Brugada syndrome screening in young patient with unexplained syncope',
      target: 'Brugada screening ECG and/or provocative testing completed',
      recommendations: {
        action: 'Consider ECG evaluation for Brugada pattern in a young patient with syncope per 2017 AHA/ACC/HRS VA Guideline',
        guideline: '2017 AHA/ACC/HRS Ventricular Arrhythmia Guideline',
        note: 'Recommended for review: Brugada syndrome is a cause of sudden cardiac death in young adults of both sexes. PROXY: R55 is generic syncope; ECG-pattern confirmation is not ingested.',
      },
      evidence: {
        triggerCriteria: [
          'Syncope (R55 - generic; vasovagal cannot be excluded by code)',
          `Age: ${age} (<45)`,
        ],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias',
        classOfRecommendation: 'Class 1',
        levelOfEvidence: 'LOE C',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Known Brugada diagnosis', 'Vasovagal syncope (NOT enforceable - not codable under R55; proxy breadth)', 'PROXY: ECG-pattern morphology not ingested (DUA-deferred)'],
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
    // Fix (AUDIT-049, 2026-05-06): was ['1364430', '1232082', '1114195', '1549682'] — 1232082 is rivaroxaban
    // 15mg formulation, 1549682 is rivaroxaban-pack (combo). Comment claimed dabigatran/edoxaban but
    // those ingredients were missing. Now uses canonical RXNORM_DOACS ingredient list (all 4 DOACs).
    const DOAC_CODES_STROKE = [...DOAC_CODES_CV]; // apixaban (1364430), rivaroxaban (1114195), edoxaban (1599538), dabigatran (1037042)
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
    // Fix (AUDIT-049, 2026-05-06): same correction as DOAC_CODES_STROKE — formulation codes replaced with canonical ingredient list.
    const DOAC_CODES_TEE = [...DOAC_CODES_CV];
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

  // EP-INAPPROPRIATE-SHOCKS: ICD Inappropriate Shock Workup (PROXY; serves GAP-EP-050 + GAP-EP-089)
  // Guideline: 2023 HRS Expert Consensus on ICD Programming (MADIT-RIT), Class 1, LOE B
  // ICD (Z95.810) + AF (I48) = risk for inappropriate shocks.
  // PROXY/breadth: this fires on EVERY ICD+AF patient regardless of whether any shock has occurred - the actual
  //   delivered-shock log is device-telemetry (not ingested; EP-050/089 are DUA-deferred device-interrogation gaps).
  //   AF-as-shock-risk is the proxy. The "recent programming optimization" / "deactivation" exclusions are NOT
  //   enforceable (programming history not ingested). Benign preventive "consider programming review" prompt only.
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
        exclusions: ['Hospice/palliative care (Z51.5)', 'Recent ICD programming optimization (NOT enforceable - history not ingested)', 'ICD deactivation documented (NOT enforceable)', 'PROXY: delivered-shock log not ingested (DUA-deferred); broad preventive prompt'],
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
  const AAD_CODES_TIMING = ['4441', '8754', '9947', '703', '49247'];
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
    const OAC_CODES_REASSESS = ['11289', '1364430', '1114195', '1037042', '1599538'];
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
  // Fix (AUDIT-051, 2026-05-06): was '50166' = fosinopril (NOT benazepril); benazepril verified RxNav = 18867.
  const ACEI_CODES = ['3827', '29046', '1998', '35296', '18867']; // lisinopril (29046), enalapril (3827), captopril (1998), ramipril (35296), benazepril (18867)
  // Fix (AUDIT-048, 2026-05-06): was ['83818', '83515', '52175', '73494'] = irbesartan, eprosartan, losartan, telmisartan
  // (3 of 4 wrong drugs vs comment). Now uses canonical RXNORM_GDMT.
  const ARB_CODES = [RXNORM_GDMT.LOSARTAN, RXNORM_GDMT.VALSARTAN, RXNORM_GDMT.CANDESARTAN]; // losartan (52175), valsartan (69749), candesartan (214354)
  // Fix (AUDIT-047, 2026-05-06): was '1656328' = sacubitril alone (NOT the combo). Real combo = 1656339.
  const ARNI_CODES = [RXNORM_GDMT.SACUBITRIL_VALSARTAN]; // sacubitril/valsartan (1656339)
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
  // Fix (AUDIT-063, 2026-05-06): was '4109' = ethacrynic acid (NOT bumetanide; bumetanide = 1808). Class still loop diuretic. Added 1808 for bumetanide coverage.
  // Fix (AUDIT-052, 2026-05-06): refactored to canonical RXNORM_LOOP_DIURETICS valueset (4 loops).
  // Behavior change: expanded from 3 loops to 4 (added torsemide 38413) — clinical intent is detecting
  // any loop diuretic for thiamine-deficiency monitoring, so broader coverage matches rule semantics.
  const LOOP_DIURETIC_CODES_TH = codes(RXNORM_LOOP_DIURETICS); // furosemide, bumetanide, torsemide, ethacrynic acid
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
  // Fix (AUDIT-046, 2026-05-06): was ['9947', '37801'] — 9947 is sotalol (Class III AAD, NOT MRA),
  // 37801 is terbinafine (antifungal, NOT eplerenone). Now uses canonical RXNORM_GDMT MRAs.
  const MRA_CODES_K = [RXNORM_GDMT.SPIRONOLACTONE, RXNORM_GDMT.EPLERENONE]; // spironolactone (9997), eplerenone (298869)
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
  // Fix (AUDIT-063, 2026-05-06): same correction as LOOP_DIURETIC_CODES_TH.
  // Fix (AUDIT-052, 2026-05-06): same refactor as LOOP_DIURETIC_CODES_TH. Adds torsemide for full coverage.
  const LOOP_DIURETIC_CODES_OPT = codes(RXNORM_LOOP_DIURETICS);
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
  // v3.0 HF BUILDOUT - calibration sample (8 gaps). medCodes is ingredient-
  // expanded (AUDIT-118); med sets are IN-level. Each carries a full evidence
  // object (CLAUDE.md §14). Stable ids threaded for AUDIT-106 registry mapping.
  // ============================================================

  // HF-FINERENONE-MREF: Finerenone not prescribed in HFmrEF/HFpEF (GAP-HF-017)
  // Evidence: FINEARTS-HF (Solomon et al., NEJM 2024) - finerenone reduced total worsening-HF
  // events + CV death in LVEF>=40% HF. COR 2a (trial-grounded; not yet a numbered guideline rec -
  // honest provenance per the clinical-regulatory discipline). Operator ruling 2026-06-15.
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] >= 40 &&
    labValues['potassium'] !== undefined && labValues['potassium'] < 5.0 &&
    labValues['egfr'] !== undefined && labValues['egfr'] >= 25 &&
    !medCodes.includes(RXNORM_FINERENONE.FINERENONE) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Consider finerenone in HFmrEF/HFpEF (FINEARTS-HF)',
      target: 'Finerenone initiated or contraindication documented',
      medication: 'Finerenone',
      recommendations: { action: 'Consider finerenone for LVEF>=40% HF per FINEARTS-HF (reduced HF events); K+ and eGFR within initiation range' },
      evidence: {
        triggerCriteria: [`LVEF: ${labValues['lvef']}% (>=40%)`, `K+: ${labValues['potassium']} (<5.0)`, `eGFR: ${labValues['egfr']} (>=25)`, 'Not on finerenone'],
        guidelineSource: 'FINEARTS-HF (Solomon et al., NEJM 2024) - finerenone in LVEF>=40% HF',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'K+ >=5.0', 'eGFR <25'],
      },
    });
  }

  // HF-AMYLOID-AF-OAC: Cardiac amyloidosis + AF without anticoagulation (GAP-HF-077)
  // Guideline: 2023 ACC Expert Consensus on Cardiac Amyloidosis, Class 2a (all cardiac amyloid high-risk regardless of CHA2DS2-VASc)
  if (
    dxCodes.some(c => c.startsWith('E85.82') || c.startsWith('E85.1')) &&
    hasAF &&
    !medCodes.some(c => OAC_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Anticoagulation gap in cardiac amyloidosis with atrial fibrillation',
      target: 'Anticoagulation initiated or contraindication documented',
      recommendations: { action: 'Consider anticoagulation: cardiac amyloidosis with AF is high thromboembolic risk independent of CHA2DS2-VASc per 2023 ACC consensus' },
      evidence: {
        triggerCriteria: ['Cardiac amyloidosis (E85.82 ATTRwt / E85.1 hATTR)', 'Atrial fibrillation (I48.*)', 'Not on anticoagulation'],
        guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Cardiac Amyloidosis',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active bleeding', 'Anticoagulation contraindication'],
      },
    });
  }

  // HF-DM-HBA1C: HF + diabetes with HbA1c above target (GAP-HF-081)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline + ADA Standards of Care, Class 1
  // Operator clinical ruling 2026-06-15 (Path B): the spec's "without intensification" gate is
  // NOT cleanly ingestible - the evaluator receives medCodes + dose, but no medication
  // start-date / change-history, so "recently intensified" cannot be tested. Gate on HbA1c>8
  // regardless; KNOWN POTENTIAL OVER-FIRE on patients already being uptitrated, pending a
  // therapy-intensification data element (med-start-date / recent-change ingestion).
  if (
    hasHF &&
    dxCodes.some(c => c.startsWith('E11') || c.startsWith('E10')) &&
    labValues['hba1c'] !== undefined && labValues['hba1c'] > 8 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Diabetes above glycemic target in heart failure',
      target: 'HbA1c reassessed and therapy intensified per individualized target',
      recommendations: { action: 'Consider glycemic therapy intensification (SGLT2i preferred in HF) for HbA1c above individualized target', note: 'Refinement pending: a therapy-intensification data element (med start-date / recent uptitration) would suppress this on patients already being intensified - not yet ingested, so this may over-fire (per HF-calibration ruling).' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'Diabetes mellitus (E10/E11)', `HbA1c: ${labValues['hba1c']}% (>8%)`, 'Intensification status not assessed (data element pending)'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; ADA Standards of Care',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Individualized higher target documented'],
      },
    });
  }

  // HF-MRA-CONTRA: MRA contraindicated by labs in HF (GAP-HF-008, SAFETY)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 3 (Harm) - MRA unsafe at K+>=5.5 or eGFR<30.
  // Operator clinical ruling 2026-06-15: eGFR threshold <30 (the protective safety cutoff for a
  // COR-3-Harm gap; the standard MRA-avoid threshold), changed from the spec's <20.
  if (
    hasHF &&
    medCodes.some(c => MRA_CODES_CV.includes(c)) &&
    ((labValues['potassium'] !== undefined && labValues['potassium'] >= 5.5) ||
     (labValues['egfr'] !== undefined && labValues['egfr'] < 30)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'SAFETY: MRA contraindicated by hyperkalemia or severe renal impairment',
      target: 'MRA held/discontinued and electrolytes/renal function reassessed',
      recommendations: { action: 'SAFETY ALERT: Consider holding MRA - K+>=5.5 or eGFR<30 contraindicates MRA per 2022 AHA/ACC/HFSA (hyperkalemia/AKI risk)' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'On an MRA (spironolactone/eplerenone)', `K+>=5.5 or eGFR<30 (K+ ${labValues['potassium']}, eGFR ${labValues['egfr']})`],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
  }

  // HF-IRON-DEF-IV: Absolute iron deficiency untreated in HF (GAP-HF-033)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 2a (AFFIRM-AHF, IRONMAN) - IV iron for ferritin<100
  if (
    hasHF &&
    labValues['ferritin'] !== undefined && labValues['ferritin'] < 100 &&
    !medCodes.some(c => codes(RXNORM_IV_IRON).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Absolute iron deficiency untreated in heart failure',
      target: 'IV iron repletion administered',
      medication: 'IV iron (ferric carboxymaltose or ferric derisomaltose)',
      recommendations: { action: 'Consider IV iron repletion for ferritin<100 ng/mL in HF per AFFIRM-AHF/IRONMAN (improves symptoms, reduces HF hospitalization)' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `Ferritin: ${labValues['ferritin']} ng/mL (<100)`, 'No IV iron administered'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN)',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Active infection', 'IV iron already administered'],
      },
    });
  }

  // HF-PERICARDITIS-COLCH: Acute/recurrent pericarditis without colchicine (GAP-HF-143)
  // Guideline: 2015 ESC Pericardial Disease Guideline, Class 1, LOE A (colchicine first-line adjunct)
  // Operator clinical ruling 2026-06-15: I30 (acute pericarditis) + I31.9 (chronic/unspecified
  // pericarditis) ONLY - colchicine is for acute/recurrent pericarditis, NOT the structural
  // complications I31.2 hemopericardium / I31.3 effusion / I31.4 tamponade.
  if (
    dxCodes.some(c => c.startsWith('I30') || c.startsWith('I31.9')) &&
    !medCodes.includes(RXNORM_COLCHICINE.COLCHICINE) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Colchicine not prescribed in pericarditis',
      target: 'Colchicine initiated or contraindication documented',
      medication: 'Colchicine',
      recommendations: { action: 'Consider colchicine as first-line adjunct to reduce recurrence in acute/recurrent pericarditis per 2015 ESC' },
      evidence: {
        triggerCriteria: ['Acute or unspecified pericarditis (I30.* or I31.9)', 'Not on colchicine'],
        guidelineSource: '2015 ESC Guideline for the Diagnosis and Management of Pericardial Diseases',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Severe renal/hepatic impairment', 'Colchicine intolerance'],
      },
    });
  }

  // HF-ATTR-DMT: ATTR-CM confirmed without disease-modifying therapy (GAP-HF-054)
  // Guideline: 2023 ACC Expert Consensus on Cardiac Amyloidosis, Class 1 (ATTR-ACT tafamidis)
  if (
    dxCodes.some(c => c.startsWith('E85.82') || c.startsWith('E85.1')) &&
    !medCodes.some(c => codes(RXNORM_ATTR_DMT).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'ATTR cardiac amyloidosis without disease-modifying therapy',
      target: 'ATTR disease-modifying therapy initiated or contraindication documented',
      medication: 'Tafamidis, acoramidis, or vutrisiran',
      recommendations: { action: 'Consider ATTR disease-modifying therapy (tafamidis per ATTR-ACT) for confirmed ATTR-CM to reduce mortality and HF hospitalization' },
      evidence: {
        triggerCriteria: ['ATTR amyloidosis (E85.82/E85.1)', 'No ATTR disease-modifying therapy'],
        guidelineSource: '2023 ACC Expert Consensus Decision Pathway on Cardiac Amyloidosis (ATTR-ACT)',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'DMT already prescribed', 'NYHA IV / advanced disease where DMT not indicated'],
      },
    });
  }

  // HF-BB-NON-EBM: Non-evidence-based beta-blocker in HFrEF (GAP-HF-002, data-limit: atenolol only; nebivolol dropped per operator, metoprolol-tartrate not IN-distinguishable)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1 - only carvedilol/metoprolol-succinate/bisoprolol are evidence-based in HFrEF
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 40 &&
    medCodes.some(c => codes(RXNORM_NON_EBM_BB_HF).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Non-evidence-based beta-blocker in HFrEF',
      target: 'Switch to an evidence-based beta-blocker (carvedilol, metoprolol succinate, or bisoprolol)',
      medication: 'Carvedilol, Metoprolol Succinate, or Bisoprolol',
      recommendations: { action: 'Consider switching to an evidence-based beta-blocker: only carvedilol/metoprolol-succinate/bisoprolol have mortality benefit in HFrEF' },
      evidence: {
        triggerCriteria: ['HFrEF (LVEF<=40%)', 'On atenolol (non-evidence-based in HFrEF)'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // ============================================================
  // v3.0 HF BUILDOUT BATCH (2026-06-15) - CHUNK 1: GDMT + Device Therapy
  // Autonomous build; chunked clinical review. Stable ids per AUDIT-106.
  // Helper booleans re-derived locally (batch-self-contained, no scope coupling).
  // ============================================================
  const hfHasICD = dxCodes.some(c => c.startsWith('Z95.810') || c.startsWith('Z95.0'));
  const hfHasCIED = hfHasICD || dxCodes.some(c => c.startsWith('Z95.818'));
  const hfHasRecentMI = dxCodes.some(c => c.startsWith('I21') || c.startsWith('I22'));
  const hfIsHFrEF = labValues['lvef'] !== undefined && labValues['lvef'] <= 40;
  // Pattern C (operator-locked 2026-06-15): GDMT proxy = beta-blocker + RAASi present (NOT all-4-pillars).
  // >=3-month duration gated via the threaded med start-date (PR #396) WHEN present; Path-B (proceed +
  // note) when no GDMT-med start-date is available. Matches ingredient-coded GDMT entries (product-coded
  // entries fall through to Path-B). The documented start-date limitation feeds the ingestion worklist.
  const hfGDMTSet = new Set<string>([...BB_CODES_CV, ...RAAS_CODES_CV]);
  const hfGDMTDated = meds.filter((m: any) => m.rxNormCode !== null && hfGDMTSet.has(m.rxNormCode) && m.startDate);
  const hfGDMT3moOK =
    hfGDMTDated.length === 0 || // Path-B: no GDMT start-date data -> proceed (duration documented as ungated)
    hfGDMTDated.some((m: any) => (Date.now() - new Date(m.startDate).getTime()) >= 90 * 24 * 60 * 60 * 1000);

  // HF-BB-TARGET-DOSE: HFrEF on beta-blocker below target dose (GAP-HF-003)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline, COR 1, LOE A (titrate GDMT to target/max-tolerated dose).
  // Data-limit note (HF-081 Path-B precedent): compares threaded meds[].doseValue (AUDIT-101) to
  // per-ingredient TOTAL-DAILY target; only matches ingredient-coded BB entries (product-coded entries
  // under-detect, the safe direction). BID schedules + weight-based carvedilol target (25 vs 50 mg/d by
  // <85 kg) are NOT captured (no frequency/weight element). HR>=60 + SBP>=100 gate ensures uptitration
  // headroom (not bradycardia/hypotension-limited).
  const hfBBTarget: Record<string, number> = {
    [RXNORM_GDMT.CARVEDILOL]: 50,
    [RXNORM_GDMT.METOPROLOL_SUCCINATE]: 200,
    [RXNORM_GDMT.BISOPROLOL]: 10,
  };
  const hfBBBelowTarget = meds.some((m: any) =>
    m.rxNormCode !== null && m.doseValue !== null && m.doseValue !== undefined &&
    hfBBTarget[m.rxNormCode] !== undefined && m.doseValue < hfBBTarget[m.rxNormCode]
  );
  if (
    hasHF && hfIsHFrEF &&
    hfBBBelowTarget &&
    labValues['heart_rate'] !== undefined && labValues['heart_rate'] >= 60 &&
    labValues['systolic_bp'] !== undefined && labValues['systolic_bp'] >= 100 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_UNDERDOSED,
      module: ModuleType.HEART_FAILURE,
      status: 'HFrEF beta-blocker below target dose with uptitration headroom',
      target: 'Beta-blocker uptitrated to target/max-tolerated dose or intolerance documented',
      medication: 'Beta-blocker (carvedilol/metoprolol succinate/bisoprolol)',
      recommendations: { action: 'Consider beta-blocker uptitration toward target (carvedilol 50, metoprolol succinate 200, bisoprolol 10 mg/day) - HR>=60 and SBP>=100 indicate headroom', note: 'Data-limit (Path-B): dose-target check uses ingredient-coded meds[].doseValue vs total-daily target; BID/weight-based dosing not captured - may under-detect product-coded entries.' },
      evidence: {
        triggerCriteria: ['HFrEF (LVEF<=40%)', 'On an evidence-based beta-blocker below target daily dose', `HR ${labValues['heart_rate']} (>=60)`, `SBP ${labValues['systolic_bp']} (>=100)`],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'HR<60', 'SBP<100', 'Documented intolerance'],
      },
    });
  }

  // HF-SGLT2I-EGFR-FLOOR: SGLT2i deferred below initiation eGFR floor (GAP-HF-011)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline (SGLT2i COR 1 in HFrEF) + FDA labels - do NOT initiate
  // dapagliflozin at eGFR<25, empagliflozin at eGFR<20. JUDGMENT FLAG: this is framed as a
  // documentation/awareness annotation (not a missing-therapy gap) - it marks WHY the SGLT2i-missing
  // gap is suppressed. Operator to rule: keep as awareness, reframe, or drop.
  if (
    hasHF &&
    labValues['egfr'] !== undefined && labValues['egfr'] < 20 &&
    !medCodes.some(c => SGLT2I_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DOCUMENTATION_GAP,
      module: ModuleType.HEART_FAILURE,
      status: 'SGLT2i initiation deferred below eGFR floor',
      target: 'Deferral documented; reassess SGLT2i if renal function recovers',
      recommendations: { action: 'Document SGLT2i deferral: eGFR<20 is below the initiation floor (dapagliflozin <25, empagliflozin <20 per FDA label); reassess if eGFR recovers. Continuation of an already-started SGLT2i may proceed per tolerance.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `eGFR ${labValues['egfr']} (<20, below SGLT2i initiation floor)`, 'Not on an SGLT2i'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline; FDA dapagliflozin/empagliflozin labels',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already on an SGLT2i'],
      },
    });
  }

  // HF-DIGOXIN-HIGH-ELDERLY: High-dose digoxin in elderly + CKD (GAP-HF-015, SAFETY)
  // Guideline: 2019 AGS Beers Criteria + 2022 AHA/ACC/HFSA - avoid digoxin >0.125 mg/day in age>75 or
  // CKD (reduced clearance -> toxicity). COR 3 (Harm). Data-limit: dose check matches digoxin entries
  // with doseValue>0.125; tablet-vs-daily ambiguity flagged.
  const hfHighDoseDigoxin = meds.some((m: any) =>
    m.rxNormCode !== null && DIGOXIN_CODES_CV.includes(m.rxNormCode) &&
    m.doseValue !== null && m.doseValue !== undefined && m.doseValue > 0.125
  );
  if (
    hasHF && age > 75 &&
    labValues['egfr'] !== undefined && labValues['egfr'] < 50 &&
    hfHighDoseDigoxin &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'SAFETY: high-dose digoxin in elderly patient with renal impairment',
      target: 'Digoxin reduced to <=0.125 mg/day and level checked',
      medication: 'Digoxin',
      recommendations: { action: 'SAFETY: Consider reducing digoxin to <=0.125 mg/day - age>75 + eGFR<50 reduces clearance (toxicity risk) per Beers Criteria / 2022 AHA/ACC/HFSA', note: 'Data-limit: dose interpreted from meds[].doseValue (mg/day assumed); verify against tablet strength/frequency.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `Age ${age} (>75)`, `eGFR ${labValues['egfr']} (<50)`, 'Digoxin daily dose >0.125 mg'],
        guidelineSource: '2019 AGS Beers Criteria; 2022 AHA/ACC/HFSA HF Guideline',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
  }

  // HF-ICD-PRIMARY-ISCHEMIC: Primary-prevention ICD eligible, ischemic (GAP-HF-024)
  // Guideline: 2017 AHA/ACC/HRS Guideline for VA/SCD, COR 1, LOE A (LVEF<=35, ischemic, >40d post-MI,
  // >3mo GDMT, NYHA II-III, expected survival >1y).
  // Data-limit FLAG: the ">40 days post-MI" window cannot be tested (dx codes carry no onset date) - the
  // I21/I22 dx is used as the MI marker WITHOUT the 40-day gate (may over-fire in the acute window).
  // GDMT-duration uses presence (>=3mo via med start-date not yet gated here; flagged for chunk-review).
  if (
    hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    (hfHasRecentMI || hasCAD) &&
    medCodes.some(c => BB_CODES_CV.includes(c)) && medCodes.some(c => RAAS_CODES_CV.includes(c)) &&
    hfGDMT3moOK &&
    !hfHasICD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'Primary-prevention ICD eligibility (ischemic cardiomyopathy)',
      target: 'ICD evaluation/referral or documented decline/contraindication',
      recommendations: { action: 'Consider primary-prevention ICD referral: ischemic LVEF<=35% on GDMT (BB+RAASi) >=3 months per 2017 AHA/ACC/HRS', note: 'Pattern C: GDMT >=3mo gated via med start-date when present (Path-B when absent). Data-limit: >40-day post-MI window not gated (no MI onset date); confirm timing clinically. Sequential with WCD bridge (HF-127) in the early post-MI window.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `LVEF ${labValues['lvef']}% (<=35)`, 'Ischemic (prior MI I21/I22 or CAD I25)', 'On beta-blocker + RAASi', 'No ICD (Z95.810/Z95.0)'],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for Management of Patients with Ventricular Arrhythmias and Prevention of SCD',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD', 'Expected survival <1 year', '<40 days post-MI (verify clinically)'],
      },
    });
  }

  // HF-ICD-PRIMARY-NICM: Primary-prevention ICD eligible, non-ischemic (GAP-HF-025)
  // Guideline: 2017 AHA/ACC/HRS, COR 1, LOE B-R (NICM, LVEF<=35, NYHA II-III on GDMT). DANISH (2016):
  // benefit attenuates with age - age noted in trigger for the age-stratified read.
  // NICM = I42.0 (dilated CM) + I42.9 (unspecified CM) per operator ruling 2026-06-15 (specific-subcode
  // discipline, Pattern A; unspecified CM in a non-ischemic LVEF<=35 patient is the target population).
  // Excludes HCM (I42.1/.2) and secondary CM (I42.6/.7/.8) and ischemic (no I21/I22/I25).
  const hfNICM = dxCodes.some(c => c.startsWith('I42.0') || c.startsWith('I42.9'));
  if (
    hasHF && labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    hfNICM && !hfHasRecentMI && !hasCAD &&
    medCodes.some(c => BB_CODES_CV.includes(c)) && medCodes.some(c => RAAS_CODES_CV.includes(c)) &&
    hfGDMT3moOK &&
    !hfHasICD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'Primary-prevention ICD eligibility (non-ischemic cardiomyopathy)',
      target: 'ICD evaluation/referral or documented decline (age-stratified per DANISH)',
      recommendations: { action: `Consider primary-prevention ICD referral: non-ischemic LVEF<=35% on GDMT (BB+RAASi) >=3 months per 2017 AHA/ACC/HRS (DANISH age-stratified; patient age ${age})`, note: 'Pattern C: GDMT >=3mo gated via med start-date when present (Path-B when absent). DANISH suggests weighing benefit by age/comorbidity.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `LVEF ${labValues['lvef']}% (<=35)`, 'Non-ischemic (I42.0/I42.9, no MI/CAD)', 'On beta-blocker + RAASi', 'No ICD', `Age ${age} (DANISH stratification)`],
        guidelineSource: '2017 AHA/ACC/HRS Guideline; DANISH trial (NEJM 2016)',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD', 'Expected survival <1 year'],
      },
    });
  }

  // HF-ICD-SECONDARY: Secondary-prevention ICD eligible (GAP-HF-026)
  // Guideline: 2017 AHA/ACC/HRS, COR 1, LOE B - survivors of sustained VT/VF or SCA without reversible
  // cause. ICD-breadth FLAG: VT I47.2, VF/flutter I49.01/I49.02, cardiac arrest I46.* - NOT the broad
  // I49 prefix (would catch benign ectopy).
  if (
    dxCodes.some(c => c.startsWith('I47.2') || c.startsWith('I49.01') || c.startsWith('I49.02') || c.startsWith('I46')) &&
    !hfHasICD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'Secondary-prevention ICD eligibility (prior VT/VF/cardiac arrest)',
      target: 'ICD evaluation/referral or documented reversible cause / decline',
      recommendations: { action: 'Consider secondary-prevention ICD referral: history of sustained VT/VF or cardiac arrest without reversible cause per 2017 AHA/ACC/HRS' },
      evidence: {
        triggerCriteria: ['Sustained VT (I47.2) / VF or flutter (I49.01/I49.02) / cardiac arrest (I46.*)', 'No ICD (Z95.810/Z95.0)'],
        guidelineSource: '2017 AHA/ACC/HRS Guideline for VA/SCD',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD', 'Reversible/transient cause documented'],
      },
    });
  }

  // HF-LEAD-EXTRACTION: CIED lead/device complication - extraction indication (GAP-HF-031)
  // Guideline: 2017 HRS Expert Consensus on CIED Lead Management, COR 1 (complete device + lead removal
  // for CIED infection). ICD-breadth FLAG: device infection T82.6/T82.7, mechanical complication T82.1
  // of cardiac device; requires a CIED present (Z95.0/Z95.810/Z95.818).
  if (
    hfHasCIED &&
    dxCodes.some(c => c.startsWith('T82.6') || c.startsWith('T82.7') || c.startsWith('T82.1')) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'CIED infection/complication - lead extraction evaluation',
      target: 'Lead/device extraction evaluation or referral',
      recommendations: { action: 'Consider CIED extraction evaluation: device infection or lead complication warrants complete hardware removal per 2017 HRS Lead Management consensus' },
      evidence: {
        triggerCriteria: ['CIED present (Z95.0/Z95.810/Z95.818)', 'Device infection (T82.6/T82.7) or mechanical complication (T82.1)'],
        guidelineSource: '2017 HRS Expert Consensus Statement on CIED Lead Management and Extraction',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-CCM-CANDIDATE: Cardiac contractility modulation (Optimizer) candidate (GAP-HF-126)
  // Guideline: FDA-approved (FIX-HF-5C); 2023 device-therapy reviews - LVEF 25-45%, NYHA III, narrow
  // QRS (CRT-ineligible) on optimal GDMT. COR 2b. Data-limit (Path-B): nyha_class + qrs_duration are
  // CSV/Synthea-populated keys; FHIR mapping pending (AUDIT-070 class).
  if (
    hasHF &&
    labValues['lvef'] !== undefined && labValues['lvef'] >= 25 && labValues['lvef'] <= 45 &&
    labValues['nyha_class'] !== undefined && labValues['nyha_class'] === 3 &&
    labValues['qrs_duration'] !== undefined && labValues['qrs_duration'] < 130 &&
    medCodes.some(c => BB_CODES_CV.includes(c)) && medCodes.some(c => RAAS_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac contractility modulation (CCM/Optimizer) candidacy',
      target: 'CCM evaluation/referral or documented decline',
      recommendations: { action: 'Consider CCM (Optimizer) referral: LVEF 25-45%, NYHA III, narrow QRS on GDMT (CRT-ineligible) per FDA approval / FIX-HF-5C', note: 'Data-limit (Path-B): NYHA class + QRS duration are CSV/Synthea-ingested keys; FHIR mapping pending (AUDIT-070 class).' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `LVEF ${labValues['lvef']}% (25-45)`, 'NYHA III', `QRS ${labValues['qrs_duration']} ms (<130, narrow)`, 'On beta-blocker + RAASi'],
        guidelineSource: 'FDA approval (FIX-HF-5C, Abraham et al.); 2023 HF device-therapy consensus',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'CRT-eligible (wide QRS)'],
      },
    });
  }

  // HF-WCD-BRIDGE: Wearable cardioverter-defibrillator bridge post-MI (GAP-HF-127)
  // Guideline: 2017 AHA/ACC/HRS, COR 2b for WCD in the early post-MI LVEF<=35% ICD-waiting window
  // (VEST trial mixed). Data-limit FLAG: the 40-90 day post-MI "waiting period" cannot be precisely
  // timed (no MI onset date); WCD order status not ingested. Fires on recent-MI dx + LVEF<=35 + no ICD.
  if (
    hfHasRecentMI &&
    labValues['lvef'] !== undefined && labValues['lvef'] <= 35 &&
    !hfHasICD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'WCD bridge consideration in early post-MI LV dysfunction',
      target: 'WCD consideration or documented decline during the ICD-waiting period',
      recommendations: { action: 'Consider WCD during the post-MI ICD-waiting period: LVEF<=35% early post-MI per 2017 AHA/ACC/HRS (COR 2b; VEST mixed)', note: 'Data-limit: the 40-90 day post-MI waiting window cannot be timed (no MI onset date); confirm the patient is within the bridge window. Sequential with the primary-prevention ICD gap (HF-024): WCD bridges the post-MI window BEFORE ICD eligibility - both firing on one patient is the expected WCD-now/ICD-later pathway, not a duplicate.' },
      evidence: {
        triggerCriteria: ['Recent MI (I21/I22)', `LVEF ${labValues['lvef']}% (<=35)`, 'No ICD'],
        guidelineSource: '2017 AHA/ACC/HRS Guideline; VEST trial (NEJM 2018)',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD', 'Outside the post-MI bridge window'],
      },
    });
  }

  // ============================================================
  // v3.0 HF BUILDOUT BATCH (2026-06-15) - CHUNK 2: Phenotypes + Iron
  // Patterns A (specific subcodes), B (Path-B data-limit notes) applied per operator ruling.
  // ============================================================

  // HF-FABRY-ERT: Fabry disease without enzyme replacement / chaperone (GAP-HF-061)
  // Guideline: 2021 international Fabry consensus (Ortiz et al.) - ERT (agalsidase) or oral chaperone
  // (migalastat, amenable mutations) for classic Fabry with cardiac involvement. COR 1 (disease-specific).
  // Specific code E75.21 (Fabry [-Anderson] disease).
  if (
    dxCodes.some(c => c.startsWith('E75.21')) &&
    !medCodes.some(c => codes(RXNORM_FABRY_DMT).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Fabry disease without disease-modifying therapy',
      target: 'ERT (agalsidase) or chaperone (migalastat) initiated or contraindication documented',
      medication: 'Agalsidase alfa/beta or migalastat',
      recommendations: { action: 'Consider Fabry disease-modifying therapy (ERT agalsidase or chaperone migalastat) per 2021 international Fabry consensus - delays cardiac/renal progression' },
      evidence: {
        triggerCriteria: ['Fabry disease (E75.21)', 'Not on agalsidase or migalastat'],
        guidelineSource: '2021 International Expert Consensus on Fabry Disease (Ortiz et al.)',
        classOfRecommendation: '1',
        levelOfEvidence: 'B',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-SARCOID-AVBLOCK: Unexplained high-grade AV block <60y - sarcoid workup (GAP-HF-062)
  // Guideline: 2014 HRS Expert Consensus on Arrhythmias in Cardiac Sarcoidosis - unexplained Mobitz II /
  // high-grade or complete AV block age<60 warrants sarcoidosis evaluation. COR 2a.
  // Specific: I44.1 (2nd-degree AV block) + I44.2 (complete AV block). Age<60. No existing sarcoid (D86.*).
  // FLAG: I44.1 includes Mobitz I (benign) - no separate Mobitz-II code exists (breadth caveat).
  // Data-limit (Path-B): "unexplained"/"new" not testable; FDG-PET workup not ingested.
  if (
    age < 60 &&
    dxCodes.some(c => c.startsWith('I44.1') || c.startsWith('I44.2')) &&
    !dxCodes.some(c => c.startsWith('D86')) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Unexplained high-grade AV block under 60 - cardiac sarcoidosis workup',
      target: 'Cardiac sarcoidosis evaluation (advanced imaging) or alternative etiology documented',
      recommendations: { action: 'Consider cardiac sarcoidosis workup: high-grade AV block under age 60 without explanation warrants advanced imaging (FDG-PET/CMR) per 2014 HRS consensus', note: 'FLAG: I44.1 includes Mobitz I (benign) - no Mobitz-II-specific code. Data-limit: "unexplained" and the FDG-PET workup status are not ingested.' },
      evidence: {
        triggerCriteria: [`Age ${age} (<60)`, 'High-grade AV block (I44.1 second-degree / I44.2 complete)', 'No existing sarcoidosis dx (D86.*)'],
        guidelineSource: '2014 HRS Expert Consensus Statement on Arrhythmias in Cardiac Sarcoidosis',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing sarcoidosis dx'],
      },
    });
  }

  // HF-SARCOID-IMMUNOSUPP: Cardiac sarcoidosis without immunosuppression (GAP-HF-063)
  // Guideline: 2014 HRS / sarcoid consensus - corticosteroids are first-line for cardiac sarcoid with
  // active disease; steroid-sparing agents for chronic/steroid-intolerant. COR 2a.
  // Specific D86.85 (sarcoid myocarditis = cardiac sarcoidosis).
  if (
    dxCodes.some(c => c.startsWith('D86.85')) &&
    !medCodes.some(c => codes(RXNORM_CORTICOSTEROIDS).includes(c)) &&
    !medCodes.some(c => codes(RXNORM_STEROID_SPARING).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Cardiac sarcoidosis without immunosuppressive therapy',
      target: 'Corticosteroid or steroid-sparing therapy initiated or inactive-disease documented',
      medication: 'Corticosteroid (prednisone) or steroid-sparing (methotrexate/azathioprine/MMF)',
      recommendations: { action: 'Consider immunosuppression for cardiac sarcoidosis: corticosteroids first-line for active disease, steroid-sparing for chronic, per 2014 HRS consensus', note: 'Data-limit: disease-activity (FDG-PET uptake) not ingested - confirm active inflammation before initiating.' },
      evidence: {
        triggerCriteria: ['Cardiac sarcoidosis (D86.85)', 'Not on a corticosteroid or steroid-sparing agent'],
        guidelineSource: '2014 HRS Expert Consensus on Arrhythmias in Cardiac Sarcoidosis',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Inactive disease documented'],
      },
    });
  }

  // HF-TACHY-CM: Tachycardia-mediated cardiomyopathy suspected (GAP-HF-065)
  // Guideline: 2019 AHA Scientific Statement on tachycardia-induced cardiomyopathy - reduced LVEF with
  // persistent tachycardia (HR>100) and no adequate rate/rhythm control. COR 2a.
  // Data-limit (Path-B): PVC-burden arm dropped (device/Holter not ingested); "new" LV dysfunction not
  // testable - uses current LVEF<50 + HR>100.
  if (
    hasHF && labValues['lvef'] !== undefined && labValues['lvef'] < 50 &&
    labValues['heart_rate'] !== undefined && labValues['heart_rate'] > 100 &&
    !medCodes.some(c => RATE_CONTROL_CODES_CV.includes(c)) &&
    !medCodes.some(c => AAD_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Possible tachycardia-mediated cardiomyopathy without rate/rhythm control',
      target: 'Rate or rhythm control initiated and LVEF reassessed',
      recommendations: { action: 'Consider rate/rhythm control: reduced LVEF with persistent tachycardia (HR>100) may be tachycardia-mediated and potentially reversible per 2019 AHA statement', note: 'Data-limit (Path-B): PVC-burden arm not ingested (device/Holter); fires on HR>100 only. Confirm sustained tachycardia.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `LVEF ${labValues['lvef']}% (<50)`, `HR ${labValues['heart_rate']} (>100)`, 'Not on rate-control or antiarrhythmic'],
        guidelineSource: '2019 AHA Scientific Statement on Tachycardia-Induced Cardiomyopathy',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-TAKOTSUBO-ECHO: Takotsubo without recovery echo (GAP-HF-072)
  // Guideline: 2018 International Takotsubo Diagnostic Criteria (InterTAK) - follow-up echo at 3-6 weeks
  // to confirm LVEF recovery. COR 2a (consensus). Specific I51.81 (Takotsubo syndrome).
  // Data-limit (Path-B): echo_months is a CSV/Synthea key (FHIR pending); months granularity approximates
  // the 3-6 week window as >=2 months overdue; undefined (no echo recorded) also fires (never-echoed).
  if (
    dxCodes.some(c => c.startsWith('I51.81')) &&
    (labValues['echo_months'] === undefined || labValues['echo_months'] >= 2) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Takotsubo syndrome without recovery echocardiogram',
      target: 'Follow-up echo to confirm LVEF recovery',
      recommendations: { action: 'Consider follow-up echocardiogram to confirm LVEF recovery in Takotsubo syndrome (typically 3-6 weeks) per InterTAK consensus', note: 'Data-limit (Path-B): echo recency from echo_months (CSV/Synthea key, FHIR pending); months granularity approximates the 3-6 week window.' },
      evidence: {
        triggerCriteria: ['Takotsubo syndrome (I51.81)', 'No recovery echo (echo_months >=2 or none recorded)'],
        guidelineSource: '2018 International Takotsubo Diagnostic Criteria (InterTAK)',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-RADIATION-SURV: Radiation heart disease surveillance (GAP-HF-073)
  // Guideline: 2013 EACVI/ASE Expert Consensus on multimodality imaging in radiation-induced heart
  // disease - periodic echo surveillance after thoracic radiation. COR 2a.
  // Specific Z92.3 (personal history of irradiation) + a STRUCTURAL cardiac dx. echo_months>=12 annual.
  // Pattern A (operator ruling 2026-06-15): narrowed from the broad I-chapter prefix to the specific
  // radiation-cardiotoxicity target set - HF (I50), cardiomyopathy (I42), CAD (I25), valve disease
  // (I34-I37), pericardial disease (I30/I31). Isolated HTN/arrhythmia no longer triggers surveillance.
  if (
    dxCodes.some(c => c.startsWith('Z92.3')) &&
    dxCodes.some(c => c.startsWith('I50') || c.startsWith('I42') || c.startsWith('I25') ||
      c.startsWith('I34') || c.startsWith('I35') || c.startsWith('I36') || c.startsWith('I37') ||
      c.startsWith('I30') || c.startsWith('I31')) &&
    (labValues['echo_months'] === undefined || labValues['echo_months'] >= 12) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Prior thoracic radiation with cardiac disease - surveillance echo overdue',
      target: 'Surveillance echocardiogram per radiation-heart-disease protocol',
      recommendations: { action: 'Consider surveillance echocardiography: prior thoracic radiation with structural cardiac disease warrants periodic imaging for radiation-induced valve/myocardial/pericardial disease per 2013 EACVI/ASE consensus', note: 'Pattern A: narrowed to a specific structural-cardiac dx set (HF/CM/CAD/valve/pericardial). Data-limit: echo recency from echo_months (CSV/Synthea key).' },
      evidence: {
        triggerCriteria: ['Personal history of irradiation (Z92.3)', 'Structural cardiac dx (HF I50 / CM I42 / CAD I25 / valve I34-I37 / pericardial I30-I31)', 'No annual echo (echo_months >=12 or none)'],
        guidelineSource: '2013 EACVI/ASE Expert Consensus on Multimodality Imaging in Radiation-Induced Heart Disease',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-IRON-SCREEN: Iron studies overdue in anemic HF (GAP-HF-032)
  // Guideline: 2022 AHA/ACC/HFSA HF Guideline - assess iron status in HF (COR 1 for symptomatic HFrEF).
  // Path-B NARROWING (operator-reviewable): the spec's universal "no ferritin/TSAT in 12mo" would over-fire
  // on every HF patient (ferritin FHIR-mapping pending; absence indistinguishable from not-ingested), so
  // this is GATED on anemia (hemoglobin present + <12) where iron studies are most clearly indicated, and
  // fires only when ferritin is absent. KNOWN under-detect of non-anemic screening; feeds ingestion track.
  if (
    hasHF &&
    labValues['hemoglobin'] !== undefined && labValues['hemoglobin'] < 12 &&
    labValues['ferritin'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Iron studies overdue in anemic heart failure',
      target: 'Ferritin and TSAT obtained',
      recommendations: { action: 'Consider iron studies (ferritin + TSAT): anemic HF without documented iron status; iron deficiency is common and treatable in HF per 2022 AHA/ACC/HFSA', note: 'Path-B narrowing: gated on anemia (Hgb<12) because ferritin absence is FHIR-mapping-pending; the spec intent (universal HF iron screening) is broader - under-detects non-anemic patients pending ferritin ingestion.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `Hemoglobin ${labValues['hemoglobin']} (<12, anemic)`, 'Ferritin not measured'],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-IRON-FUNCTIONAL: Functional iron deficiency untreated in HF (GAP-HF-034)
  // Guideline: 2022 AHA/ACC/HFSA (AFFIRM-AHF, IRONMAN) - IV iron for functional iron deficiency
  // (ferritin 100-299 ng/mL + TSAT<20%). COR 2a. Complements HF-033 (absolute, ferritin<100).
  if (
    hasHF &&
    labValues['ferritin'] !== undefined && labValues['ferritin'] >= 100 && labValues['ferritin'] < 300 &&
    labValues['tsat'] !== undefined && labValues['tsat'] < 20 &&
    !medCodes.some(c => codes(RXNORM_IV_IRON).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Functional iron deficiency untreated in heart failure',
      target: 'IV iron repletion administered',
      medication: 'IV iron (ferric carboxymaltose or ferric derisomaltose)',
      recommendations: { action: 'Consider IV iron repletion for functional iron deficiency (ferritin 100-299 + TSAT<20%) in HF per AFFIRM-AHF/IRONMAN' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `Ferritin ${labValues['ferritin']} (100-299)`, `TSAT ${labValues['tsat']}% (<20)`, 'No IV iron administered'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (AFFIRM-AHF, IRONMAN)',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-ARVC-ICD: ARVC with ventricular arrhythmia - ICD risk assessment (GAP-HF-074)
  // Guideline: 2019 HRS Expert Consensus on ARVC - ICD for ARVC with sustained VT / aborted SCA (COR 1).
  // ARVC has NO specific ICD-10 (coded I42.8 "other cardiomyopathies"); per Pattern A + operator ruling
  // 2026-06-15 it is NARROWED by pairing I42.8 with a sustained-VT dx (I47.2) - the ARVC-with-VT
  // population is specific enough to satisfy Pattern A; bare I42.8 (over-broad) is NOT built.
  if (
    dxCodes.some(c => c.startsWith('I42.8')) &&
    dxCodes.some(c => c.startsWith('I47.2')) &&
    !hfHasICD &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'ARVC with ventricular tachycardia - ICD evaluation',
      target: 'ICD evaluation/referral and exercise-restriction counseling, or documented decline',
      recommendations: { action: 'Consider ICD evaluation: cardiomyopathy with sustained VT (ARVC phenotype) meets secondary-prevention ICD criteria per 2019 HRS ARVC consensus; counsel exercise restriction', note: 'Pattern A: ARVC has no specific ICD-10; built on I42.8 narrowed by a sustained-VT (I47.2) pairing - confirm ARVC phenotype clinically (I42.8 also covers other cardiomyopathies).' },
      evidence: {
        triggerCriteria: ['Other cardiomyopathy (I42.8, ARVC phenotype)', 'Sustained VT (I47.2)', 'No ICD (Z95.810/Z95.0)'],
        guidelineSource: '2019 HRS Expert Consensus Statement on Arrhythmogenic Right Ventricular Cardiomyopathy',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Existing ICD'],
      },
    });
  }

  // ============================================================
  // v3.0 HF BUILDOUT BATCH (2026-06-15) - CHUNK 3: Cross-cutting
  // Patterns A/B/C applied. HF-084 (functional capacity) + HF-087 (opioid+OSA) deferred (no ingested
  // representation; flagged for the data-blocked register).
  // ============================================================

  // HF-GDMT-INCOMPLETE: HFrEF GDMT regimen substantially incomplete (GAP-HF-036)
  // Guideline: 2022 AHA/ACC/HFSA - quadruple therapy (BB, RAASi/ARNI, MRA, SGLT2i) for HFrEF, COR 1.
  // Reframed (Pattern B) from the spec's discharge-med-list context to the CURRENT med list (no
  // encounter/discharge data). THRESHOLD: fires when <=2 of 4 pillar classes present (missing >=2) - the
  // "substantially incomplete" threshold (operator-reviewable vs missing>=1). Roll-up; may overlap
  // per-pillar gaps.
  const hfPillarCount = [
    medCodes.some(c => BB_CODES_CV.includes(c)),
    medCodes.some(c => RAAS_CODES_CV.includes(c)),
    medCodes.some(c => MRA_CODES_CV.includes(c)),
    medCodes.some(c => SGLT2I_CODES_CV.includes(c)),
  ].filter(Boolean).length;
  if (
    hasHF && hfIsHFrEF && hfPillarCount <= 2 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: `HFrEF GDMT substantially incomplete (${hfPillarCount} of 4 pillars)`,
      target: 'GDMT advanced toward quadruple therapy or intolerances documented',
      recommendations: { action: `Consider advancing GDMT: only ${hfPillarCount} of 4 pillars (BB, RAASi/ARNI, MRA, SGLT2i) present in HFrEF per 2022 AHA/ACC/HFSA quadruple-therapy standard`, note: 'Pattern B: reframed from discharge-med-list to current meds (no encounter data). Roll-up summary - may overlap per-pillar gaps; threshold is missing>=2 pillars.' },
      evidence: {
        triggerCriteria: ['HFrEF (LVEF<=40%)', `${hfPillarCount} of 4 GDMT pillar classes present (<=2)`],
        guidelineSource: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Documented intolerances'],
      },
    });
  }

  // HF-STAGE-B: Asymptomatic LV dysfunction (Stage B) without GDMT (GAP-HF-076)
  // Guideline: 2022 AHA/ACC/HFSA - Stage B (structural disease, no HF symptoms): ACEi/ARB + BB for
  // LVEF<=40, COR 1. Path-B: "asymptomatic" proxied by ABSENCE of an I50 HF dx; "structural changes"
  // proxied by LVEF<40 + a structural substrate (prior MI / CAD). LVEF threshold tightened to <40 per
  // operator ruling 2026-06-15 (the COR-1 Stage-B GDMT range; excludes HFmrEF 40-50).
  if (
    !hasHF && labValues['lvef'] !== undefined && labValues['lvef'] < 40 &&
    (hfHasRecentMI || hasCAD) &&
    !medCodes.some(c => RAAS_CODES_CV.includes(c)) && !medCodes.some(c => BB_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Stage B (asymptomatic LV dysfunction) without GDMT initiation',
      target: 'ACEi/ARB + beta-blocker initiated to prevent progression to symptomatic HF',
      recommendations: { action: 'Consider ACEi/ARB + beta-blocker: asymptomatic LV dysfunction (LVEF<40) with structural substrate (Stage B) without GDMT per 2022 AHA/ACC/HFSA (prevents progression)', note: 'Path-B: asymptomatic proxied by absence of an I50 HF dx (imperfect). LVEF<40 = COR-1 Stage-B range per operator ruling.' },
      evidence: {
        triggerCriteria: [`LVEF ${labValues['lvef']}% (<40)`, 'Structural substrate (prior MI I21/I22 or CAD I25)', 'No HF dx (asymptomatic proxy)', 'Not on ACEi/ARB or beta-blocker'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (Stage B)',
        classOfRecommendation: '1',
        levelOfEvidence: 'A',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-AF-RATE: HF + chronic/permanent AF with uncontrolled rate (GAP-HF-078)
  // Guideline: 2023 ACC/AHA/HRS AF Guideline - rate control (lenient resting HR target <110 per RACE II)
  // in permanent AF. COR 1. Specific I48.2 (chronic/permanent AF) + I48.1x (persistent). HR>110.
  if (
    hasHF && dxCodes.some(c => c.startsWith('I48.2') || c.startsWith('I48.1')) &&
    labValues['heart_rate'] !== undefined && labValues['heart_rate'] > 110 &&
    !medCodes.some(c => RATE_CONTROL_CODES_CV.includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'HF + chronic AF with uncontrolled ventricular rate',
      target: 'Rate-control therapy initiated (resting HR <110)',
      recommendations: { action: 'Consider rate control: HF with chronic/permanent AF and resting HR>110 without a rate-control agent per 2023 ACC/AHA AF Guideline (RACE II lenient target <110)' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'Chronic/persistent AF (I48.2/I48.1x)', `HR ${labValues['heart_rate']} (>110)`, 'Not on a rate-control agent'],
        guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation',
        classOfRecommendation: '1',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-THYROID: HF + untreated thyroid dysfunction (GAP-HF-080)
  // Guideline: 2022 AHA/ACC/HFSA - thyroid dysfunction worsens HF outcomes; treat. OVERT-ONLY thresholds
  // per operator ruling 2026-06-15: TSH>10 (overt hypothyroid -> levothyroxine), TSH<0.1 (overt
  // hyperthyroid -> antithyroid). Subclinical ranges (4.5-10 / 0.1-0.4) excluded. tsh key (CSV/Synthea).
  const hfHypoUntreated = labValues['tsh'] !== undefined && labValues['tsh'] > 10 &&
    !medCodes.includes(RXNORM_THYROID_THERAPY.LEVOTHYROXINE);
  const hfHyperUntreated = labValues['tsh'] !== undefined && labValues['tsh'] < 0.1 &&
    !medCodes.includes(RXNORM_THYROID_THERAPY.METHIMAZOLE) && !medCodes.includes(RXNORM_THYROID_THERAPY.PROPYLTHIOURACIL);
  if (
    hasHF && (hfHypoUntreated || hfHyperUntreated) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Heart failure with untreated thyroid dysfunction',
      target: 'Thyroid dysfunction treated (levothyroxine for hypo / antithyroid for hyper)',
      recommendations: { action: `Consider thyroid therapy: ${hfHypoUntreated ? 'overt hypothyroidism (TSH>10) without levothyroxine' : 'overt hyperthyroidism (TSH<0.1) without antithyroid therapy'} in HF per 2022 AHA/ACC/HFSA (thyroid dysfunction worsens HF)`, note: 'Overt-only (TSH>10 / <0.1) per operator ruling; subclinical excluded. tsh is a CSV/Synthea key (FHIR pending).' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `TSH ${labValues['tsh']} (>10 overt hypo or <0.1 overt hyper)`, 'Not on corresponding thyroid therapy'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Subclinical dysfunction (TSH 4.5-10 / 0.1-0.4)'],
      },
    });
  }

  // HF-METFORMIN-RENAL: HF + CKD + metformin at low eGFR - renal/safety review (GAP-HF-082, SAFETY)
  // Guideline: FDA metformin label - contraindicated eGFR<30; do-not-initiate/dose-reduce 30-45 (lactic
  // acidosis risk, heightened in HF). THRESHOLD: eGFR<45 triggers review; <30 is contraindication.
  if (
    hasHF && dxCodes.some(c => c.startsWith('N18')) &&
    medCodes.includes(RXNORM_METFORMIN.METFORMIN) &&
    labValues['egfr'] !== undefined && labValues['egfr'] < 45 &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'SAFETY: metformin at reduced eGFR in HF + CKD - renal-dose review',
      target: 'Metformin dose reviewed (reduce 30-45; discontinue if eGFR<30)',
      medication: 'Metformin',
      recommendations: { action: `SAFETY: Review metformin - eGFR ${labValues['egfr']} (<45) in HF + CKD raises lactic-acidosis risk; FDA label = dose-reduce 30-45, contraindicated <30`, note: 'THRESHOLD: <45 review vs <30 contraindication.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'CKD (N18.*)', 'On metformin', `eGFR ${labValues['egfr']} (<45)`],
        guidelineSource: 'FDA metformin label; 2022 AHA/ACC/HFSA HF Guideline',
        classOfRecommendation: '3 (Harm) at eGFR<30',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
  }

  // HF-PREG-TERATOGEN: HF in pregnancy on teratogenic GDMT (GAP-HF-086, SAFETY)
  // Guideline: ACEi/ARB/ARNI (fetal renal/skull) + SGLT2i contraindicated in pregnancy. COR 3 (Harm).
  // INVERSE of the usual pregnancy exclusion: here pregnancy + a teratogenic GDMT med = safety alert.
  // Pregnancy via O-chapter / Z33 / Z34.
  if (
    hasHF && dxCodes.some(c => /^O/.test(c) || c.startsWith('Z33') || c.startsWith('Z34')) &&
    (medCodes.some(c => RAAS_CODES_CV.includes(c)) || medCodes.some(c => SGLT2I_CODES_CV.includes(c))) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_CONTRAINDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'SAFETY: teratogenic HF medication in pregnancy',
      target: 'Teratogenic agent stopped and pregnancy-compatible regimen substituted',
      recommendations: { action: 'SAFETY ALERT: Consider stopping ACEi/ARB/ARNI/SGLT2i in pregnancy (teratogenic/fetotoxic); substitute a pregnancy-compatible HF regimen (e.g. hydralazine/nitrates, beta-blocker)' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'Pregnancy (O-chapter / Z33 / Z34)', 'On a teratogenic GDMT agent (ACEi/ARB/ARNI or SGLT2i)'],
        guidelineSource: 'FDA pregnancy labeling; 2022 AHA/ACC/HFSA HF Guideline',
        classOfRecommendation: '3 (Harm)',
        levelOfEvidence: 'B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
  }

  // ============================================================
  // v3.0 HF BUILDOUT BATCH (2026-06-15) - CHUNK 4: Advanced / Cardiorenal / Pericardial / Transitions
  // Patterns A/B/C applied. Uses the threaded procedureCodes (PR #396) for MCS/device gaps.
  // ============================================================

  // HF-INOTROPE-DEPENDENCE: Inotrope dependence - advanced HF referral (GAP-HF-047)
  // Guideline: 2022 AHA/ACC/HFSA - continuous/intermittent inotrope dependence defines advanced (Stage D)
  // HF; refer for advanced therapies (transplant/MCS) or palliative care. COR 1.
  if (
    hasHF && medCodes.some(c => codes(RXNORM_INOTROPES).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.REFERRAL_NEEDED,
      module: ModuleType.HEART_FAILURE,
      status: 'Inotrope dependence - advanced heart failure referral',
      target: 'Advanced HF / MCS / transplant evaluation or palliative-care referral',
      recommendations: { action: 'Consider advanced HF referral: inotrope dependence (milrinone/dobutamine) indicates Stage D HF - evaluate for transplant/MCS or palliative care per 2022 AHA/ACC/HFSA' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'On a continuous inotrope (milrinone or dobutamine)'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (Stage D / advanced HF)',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-TOLVAPTAN-HYPONATREMIA: Severe hyponatremia in HF without vaptan evaluation (GAP-HF-132)
  // Guideline: 2022 AHA/ACC/HFSA - tolvaptan COR 2b for short-term management of symptomatic
  // hypervolemic hyponatremia (EVEREST: symptom/Na improvement, no mortality benefit). THRESHOLD: Na<125
  // (severe). FLAG: tolvaptan is LATER-LINE (after fluid restriction/diuretic adjustment); "symptomatic"
  // not testable; framed as a management-evaluation gap, not a strict missing-drug.
  if (
    hasHF && labValues['sodium'] !== undefined && labValues['sodium'] < 125 &&
    !medCodes.includes(RXNORM_TOLVAPTAN.TOLVAPTAN) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Severe hyponatremia in heart failure - management evaluation',
      target: 'Hyponatremia management optimized (fluid restriction, diuretic adjustment; tolvaptan if refractory)',
      recommendations: { action: 'Consider hyponatremia management: severe hyponatremia (Na<125) in HF - optimize fluid restriction/diuretics first; tolvaptan (COR 2b) for refractory symptomatic hypervolemic hyponatremia per 2022 AHA/ACC/HFSA', note: 'FLAG: tolvaptan is later-line (EVEREST: no mortality benefit); this flags evaluation, not a strict missing drug. "Symptomatic" not testable.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', `Sodium ${labValues['sodium']} (<125, severe)`, 'Not on tolvaptan'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (EVEREST, SALT)',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-CS-MCS-ESCALATION: Inotrope-refractory cardiogenic shock without MCS (GAP-HF-133)
  // Guideline: 2022 AHA/ACC/HFSA + SCAI shock - inotrope-refractory cardiogenic shock warrants temporary
  // MCS (Impella/IABP/ECMO) evaluation. COR 2a. Uses threaded procedureCodes (PR #396) for MCS presence.
  // FLAG: SCAI stage not ingested - inotrope-on-board + shock dx proxies the inotrope-refractory stage;
  // MCS detected via CPT (Impella 33990-33993, ECMO 33946-33949, IABP 33967/33970/33973).
  const hfMCSCodes = ['33990', '33991', '33992', '33993', '33946', '33947', '33948', '33949', '33967', '33970', '33973'];
  const hfHasMCS = procedureCodes.some((c: string) => hfMCSCodes.includes(c));
  if (
    hasHF && dxCodes.some(c => c.startsWith('R57.0')) &&
    medCodes.some(c => codes(RXNORM_INOTROPES).includes(c)) &&
    !hfHasMCS &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'Inotrope-refractory cardiogenic shock without mechanical circulatory support',
      target: 'Temporary MCS evaluation (Impella/IABP/ECMO) or escalation/de-escalation decision',
      recommendations: { action: 'Consider temporary MCS evaluation: cardiogenic shock on inotropes without mechanical support may warrant Impella/IABP/ECMO per SCAI shock / 2022 AHA/ACC/HFSA', note: 'FLAG (Path-B): SCAI stage not ingested; inotrope-on-board + shock dx proxies inotrope-refractory. Confirm SCAI stage and candidacy clinically.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'Cardiogenic shock (R57.0)', 'On an inotrope', 'No MCS procedure (Impella/ECMO/IABP CPT)'],
        guidelineSource: 'SCAI Cardiogenic Shock Classification; 2022 AHA/ACC/HFSA HF Guideline',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-CRS4-SCREEN: Advanced CKD without HF screening (cardiorenal type 4) (GAP-HF-139)
  // Guideline: KDIGO + cardiorenal consensus - advanced CKD (eGFR<30) carries high HF risk; screen with
  // natriuretic peptide. COR 2a (screening). Path-B: nt_probnp ABSENCE = not screened; echo arm dropped.
  // Gated on NO existing HF dx (screening, not management).
  if (
    !hasHF && labValues['egfr'] !== undefined && labValues['egfr'] < 30 &&
    labValues['nt_probnp'] === undefined && labValues['bnp'] === undefined &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.SCREENING_DUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Advanced CKD without heart-failure screening (cardiorenal type 4)',
      target: 'Natriuretic peptide (or echo) obtained to screen for occult HF',
      recommendations: { action: 'Consider HF screening: advanced CKD (eGFR<30) carries high occult-HF risk - obtain a natriuretic peptide per cardiorenal consensus', note: 'Path-B: natriuretic-peptide absence = not screened (CSV/Synthea key, FHIR pending); echo-history arm dropped.' },
      evidence: {
        triggerCriteria: [`eGFR ${labValues['egfr']} (<30, advanced CKD)`, 'No natriuretic peptide measured', 'No existing HF dx'],
        guidelineSource: 'KDIGO CKD Guideline; cardiorenal syndrome consensus',
        classOfRecommendation: '2a',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-PERICARDITIS-IL1: Steroid-dependent recurrent pericarditis without IL-1 inhibitor (GAP-HF-144)
  // Guideline: 2023 evidence (RHAPSODY) - rilonacept (IL-1 inhibitor) for recurrent pericarditis,
  // particularly steroid-dependent/colchicine-resistant. COR 2a. Specific I30 (acute/recurrent
  // pericarditis). FLAG: "recurrent/steroid-dependent" proxied by pericarditis dx + on corticosteroid
  // (recurrence not confirmable from a single dx); IL-1 set = rilonacept/anakinra/canakinumab.
  if (
    dxCodes.some(c => c.startsWith('I30')) &&
    medCodes.includes(RXNORM_CORTICOSTEROIDS.PREDNISONE) &&
    !medCodes.some(c => codes(RXNORM_IL1_INHIBITORS).includes(c)) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Steroid-dependent recurrent pericarditis without IL-1 inhibitor',
      target: 'IL-1 inhibitor (rilonacept) evaluation to enable steroid taper',
      medication: 'Rilonacept (IL-1 inhibitor)',
      recommendations: { action: 'Consider an IL-1 inhibitor (rilonacept): steroid-dependent recurrent pericarditis benefits from IL-1 blockade to reduce recurrence and enable steroid taper per RHAPSODY', note: 'FLAG: recurrence/steroid-dependence proxied by pericarditis dx + active corticosteroid (single-dx recurrence not confirmable).' },
      evidence: {
        triggerCriteria: ['Acute/recurrent pericarditis (I30.*)', 'On a corticosteroid (steroid-dependence proxy)', 'Not on an IL-1 inhibitor'],
        guidelineSource: 'RHAPSODY trial (rilonacept, NEJM 2021); 2023 pericarditis management',
        classOfRecommendation: '2a',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-CARDIOMEMS: Pulmonary-artery pressure monitor (CardioMEMS) candidacy (GAP-HF-027)
  // Guideline: 2022 AHA/ACC/HFSA COR 2b (CHAMPION/GUIDE-HF) - PA pressure monitoring in NYHA III with a
  // recent HF event OR elevated natriuretic peptides. Path-B: the HF-hospitalization arm is not ingested,
  // so the GUIDE-HF NATRIURETIC-PEPTIDE entry arm is used (BNP>=125 or NT-proBNP>=300). Not already
  // implanted (CardioMEMS CPT 33289). nyha_class key (CSV/Synthea; FHIR pending).
  if (
    hasHF && labValues['nyha_class'] !== undefined && labValues['nyha_class'] === 3 &&
    ((labValues['bnp'] !== undefined && labValues['bnp'] >= 125) ||
     (labValues['nt_probnp'] !== undefined && labValues['nt_probnp'] >= 300)) &&
    !procedureCodes.includes('33289') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.DEVICE_ELIGIBLE,
      module: ModuleType.HEART_FAILURE,
      status: 'CardioMEMS PA-pressure monitor candidacy (NYHA III + elevated natriuretic peptide)',
      target: 'CardioMEMS evaluation/referral or documented decline',
      recommendations: { action: 'Consider CardioMEMS (PA pressure monitor) referral: NYHA III HF with elevated natriuretic peptide per GUIDE-HF/CHAMPION (COR 2b) - reduces HF hospitalizations', note: 'Path-B: the HF-hospitalization entry criterion is not ingested; the GUIDE-HF natriuretic-peptide arm (BNP>=125 / NT-proBNP>=300) is used instead.' },
      evidence: {
        triggerCriteria: ['Heart failure (I50.*)', 'NYHA III', 'Elevated natriuretic peptide (BNP>=125 or NT-proBNP>=300)', 'No CardioMEMS (CPT 33289)'],
        guidelineSource: '2022 AHA/ACC/HFSA HF Guideline (CHAMPION, GUIDE-HF)',
        classOfRecommendation: '2b',
        levelOfEvidence: 'B-R',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Already implanted'],
      },
    });
  }

  // ============================================================
  // v3.0 HF BUILDOUT BATCH (2026-06-15) - CHUNK 5: LVAD / Transplant (final new-gap chunk)
  // Patterns A/B/C applied; threaded procedureCodes (PR #396) used for biopsy detection.
  // HF-149 (pump-thrombosis screening) deferred - discriminating signal is LDH (hemolysis), no ingested key.
  // ============================================================

  // HF-LVAD-INR: Post-LVAD INR out of therapeutic range (GAP-HF-147, SAFETY)
  // Guideline: ISHLT MCS / device IFU - LVAD anticoagulation INR target 2.0-3.0 (device-specific; some
  // HeartMate 3 protocols 2.0-2.5). INR<2 = pump-thrombosis risk; INR>3 = bleeding. COR 1 (device mgmt).
  // Specific Z95.811 (presence of heart assist device). FLAG: target is device-specific; 2.0-3.0 used.
  if (
    dxCodes.some(c => c.startsWith('Z95.811')) &&
    labValues['inr'] !== undefined && (labValues['inr'] < 2.0 || labValues['inr'] > 3.0) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MONITORING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'SAFETY: post-LVAD INR outside therapeutic range',
      target: 'INR corrected to the device target (2.0-3.0) and anticoagulation adjusted',
      recommendations: { action: `SAFETY: Adjust LVAD anticoagulation - INR ${labValues['inr']} is outside the 2.0-3.0 target (INR<2 pump-thrombosis risk, INR>3 bleeding) per ISHLT MCS guidance`, note: 'FLAG: target range is device-specific (some HeartMate 3 protocols use 2.0-2.5); 2.0-3.0 used as default.' },
      evidence: {
        triggerCriteria: ['LVAD (Z95.811)', `INR ${labValues['inr']} (outside 2.0-3.0)`],
        guidelineSource: 'ISHLT Mechanical Circulatory Support guidelines; device IFU',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
        safetyClass: 'SAFETY',
      },
    });
  }

  // HF-LVAD-GIB: Post-LVAD GI bleeding without anti-angiodysplasia therapy (GAP-HF-148)
  // Guideline: LVAD GI bleeding from acquired von Willebrand deficiency + angiodysplasia; octreotide
  // reduces rebleeding (observational/registry). COR 2b. Specific Z95.811 + GI hemorrhage (K92.0/.1/.2).
  // FLAG: "recurrent" not confirmable from a single dx; octreotide is one of several strategies.
  if (
    dxCodes.some(c => c.startsWith('Z95.811')) &&
    dxCodes.some(c => c.startsWith('K92.0') || c.startsWith('K92.1') || c.startsWith('K92.2')) &&
    !medCodes.includes(RXNORM_OCTREOTIDE.OCTREOTIDE) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.MEDICATION_MISSING,
      module: ModuleType.HEART_FAILURE,
      status: 'Post-LVAD GI bleeding without anti-angiodysplasia therapy',
      target: 'Octreotide (or alternative anti-angiodysplasia strategy) considered',
      medication: 'Octreotide',
      recommendations: { action: 'Consider octreotide: recurrent LVAD GI bleeding from angiodysplasia (acquired vWF deficiency) may respond to octreotide per registry data; also consider AC/antiplatelet adjustment', note: 'FLAG (Path-B): "recurrent" not confirmable from a single GI-bleed dx; octreotide is one of several strategies (also digoxin, ACEi, thalidomide).' },
      evidence: {
        triggerCriteria: ['LVAD (Z95.811)', 'GI hemorrhage (K92.0/K92.1/K92.2)', 'Not on octreotide'],
        guidelineSource: 'ISHLT MCS guidance; LVAD GI-bleeding registry data',
        classOfRecommendation: '2b',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-TRANSPLANT-CAV: Post-heart-transplant CAV surveillance overdue (GAP-HF-151)
  // Guideline: ISHLT - periodic (typically annual) coronary angiography for cardiac allograft vasculopathy
  // surveillance. COR 1. Specific Z94.1 (heart transplant status). coronary_cta_months>=12 recency proxy.
  // FLAG: CAV surveillance is invasive coronary angiography; coronary_cta_months is the closest recency key.
  if (
    dxCodes.some(c => c.startsWith('Z94.1')) &&
    (labValues['coronary_cta_months'] === undefined || labValues['coronary_cta_months'] >= 12) &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.IMAGING_OVERDUE,
      module: ModuleType.HEART_FAILURE,
      status: 'Post-heart-transplant CAV surveillance overdue',
      target: 'Coronary angiography (or CTA) for cardiac allograft vasculopathy surveillance',
      recommendations: { action: 'Consider CAV surveillance: heart transplant without recent coronary assessment; ISHLT recommends periodic coronary angiography for cardiac allograft vasculopathy', note: 'FLAG: CAV surveillance is invasive coronary angiography; coronary_cta_months is the closest ingested recency key (CSV/Synthea, FHIR pending).' },
      evidence: {
        triggerCriteria: ['Heart transplant (Z94.1)', 'No coronary assessment within 12 months (or none recorded)'],
        guidelineSource: 'ISHLT Heart Transplant guidelines (CAV surveillance)',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
      },
    });
  }

  // HF-TRANSPLANT-BIOPSY: Post-heart-transplant rejection-surveillance biopsy gap (GAP-HF-152)
  // Guideline: ISHLT - scheduled endomyocardial biopsy for rejection surveillance (most intensive in
  // year 1). COR 1. Specific Z94.1 + no EMB procedure recorded (CPT 93505). FLAG: the biopsy SCHEDULE /
  // timing is not ingested - fires on biopsy-procedure ABSENCE (procedureCodes), a presence proxy, not a
  // schedule-adherence check; non-invasive rejection surveillance (gene-expression/dd-cfDNA) also absent.
  if (
    dxCodes.some(c => c.startsWith('Z94.1')) &&
    !procedureCodes.includes('93505') &&
    !hasContraindication(dxCodes, EXCLUSION_HOSPICE)
  ) {
    gaps.push({
      type: TherapyGapType.PROCEDURE_INDICATED,
      module: ModuleType.HEART_FAILURE,
      status: 'Post-heart-transplant rejection-surveillance biopsy not documented',
      target: 'Endomyocardial biopsy (or non-invasive surveillance) per the ISHLT schedule',
      recommendations: { action: 'Consider rejection surveillance: heart transplant without a documented endomyocardial biopsy; ISHLT recommends scheduled surveillance (biopsy or non-invasive gene-expression/dd-cfDNA), most intensive in year 1', note: 'FLAG (Path-B): biopsy schedule/timing not ingested; fires on EMB-procedure absence (CPT 93505) - a presence proxy. Confirm the surveillance schedule clinically.' },
      evidence: {
        triggerCriteria: ['Heart transplant (Z94.1)', 'No endomyocardial biopsy recorded (CPT 93505)'],
        guidelineSource: 'ISHLT Heart Transplant guidelines (rejection surveillance)',
        classOfRecommendation: '1',
        levelOfEvidence: 'C-LD',
        exclusions: ['Hospice/palliative care (Z51.5)'],
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
  // Failed bioprosthetic valve + new symptoms (R06 dyspnea). Valve-in-valve TAVR is for a degenerated
  //   BIOPROSTHETIC valve - a mechanical valve is NOT a ViV target, so this must not false-fire on mechanical.
  // Fix (AUDIT-123, 2026-06-17, GAP-SH-061): Z95.3-ONLY (xenogenic/bioprosthetic, definitive). The prior
  //   Z95.2-only predicate was the inversion - Z95.2 is generic (could be mechanical), so firing ViV on it would
  //   false-fire on a mechanical valve. Z95.3-only never false-fires on mechanical. Path-B: a bioprosthetic coded
  //   generically as Z95.2 is the accepted miss (no mechanical-specific ICD-10 code to disambiguate it from).
  const hasBioprostheticVIV = dxCodes.some(c => c.startsWith('Z95.3'));
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
          'Bioprosthetic (xenogenic) valve in situ (Z95.3)',
          'New symptoms (dyspnea R06, palpitations R00, or syncope R55)',
        ],
        guidelineSource: '2020 ACC/AHA Guideline for Management of Patients with Valvular Heart Disease',
        classOfRecommendation: 'Class 2a',
        levelOfEvidence: 'LOE B-NR',
        exclusions: ['Hospice/palliative care (Z51.5)', 'Valve replacement within 2 years', 'Active endocarditis'],
      },
    });
  }

  // SH-ASD (gap-sh-asd-closure): SUPERSEDED 2026-06-17 by SH-027 (v3.0 SH chunk 5). Firing removed.
  // Superseded (AUDIT-128 resolution): the legacy ASD-closure rule gated significance on I50.81 (right heart
  // failure) - a LATE proxy that MISSED a significant ASD with RV dilation or PASP elevation but not yet RV
  // failure (the AUDIT-128 under-detection). The properly-scoped SH-027 (ASD Q21.1x-not-PFO + threaded PASP>=40
  // significance + EXCLUDES Eisenmenger I27.83) replaces it. Supersede-not-delete: the registry entry
  // gap-sh-asd-closure is retained for canonical lineage (reconciled to SPEC_ONLY). Same precedent as SH-12/SH-9.

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
  // Prosthetic valve + new gradient-increase proxy (R06 dyspnea). Obstruction/thrombosis affects ANY prosthesis.
  // Fix (AUDIT-123, 2026-06-17): added Z95.3 (xenogenic/bioprosthetic) to the prior Z95.2||Z95.4 set.
  const hasProstheticValveVD = dxCodes.some(c => c.startsWith('Z95.2') || c.startsWith('Z95.3') || c.startsWith('Z95.4'));
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
          'Prosthetic heart valve (Z95.2, Z95.3, or Z95.4)',
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
          'Prosthetic heart valve (Z95.2, Z95.3, or Z95.4)',
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
    // Fix (AUDIT-123, 2026-06-17): this rule was INVERTED - it gated on Z95.2||Z95.4 AND !Z95.3 with a comment
    //   calling Z95.3 "mechanical". Z95.3 (xenogenic) IS the bioprosthetic code. Per operator ruling, a
    //   DRUG-BEARING antiplatelet recommendation must be Z95.3-ONLY (never recommend antiplatelet-only to a
    //   possibly-mechanical patient coded by the generic Z95.2). Now fires on the definitively-bioprosthetic Z95.3.
    const hasBioprosthetic = dxCodes.some(c => c.startsWith('Z95.3')); // Z95.3 = xenogenic / bioprosthetic (definitive)
    const ASPIRIN_CODE_BIO = '1191';
    const onAspirinBio = medCodes.includes(ASPIRIN_CODE_BIO);
    if (hasBioprosthetic && !onAspirinBio) {
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
            'Bioprosthetic (xenogenic) valve (Z95.3)',
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
  // Fix (AUDIT-052, 2026-05-06): refactored to canonical RXNORM_DHP_CCB valueset (5 DHP CCBs).
  // Behavior change: expanded from 3 DHPs to 5 — Raynaud's first-line is any DHP per ACR/ACC.
  const CCB_CODES_RAYNAUD = codes(RXNORM_DHP_CCB);
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
    const onPentoxifyllinePV = medCodes.includes('8013'); // AUDIT-104: pentoxifylline (was 7979 = NotCurrent)
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
            'No pentoxifylline (RxNorm 8013) in active medications',
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
    const OAC_CODES_VTE = ['11289', '1364430', '1114195', '1037042', '1599538'];
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
