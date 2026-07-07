// AUDIT-148 Slice 1 (STEP 5): curated clinical-trial seed with structured, section-16-verified criteria.
//
// Exercises all three honest match states: fully-threadable trials (clean ELIGIBLE + INELIGIBLE) and
// INDETERMINATE-forcing trials (an unthreaded / Synthea-absent criterion -> INDETERMINATE, signal named).
// Curated structured trials coexist with the honest client-side ClinicalTrials.gov discovery feed
// (AUDIT-147, ResearchServiceLineView) - the feed is browse-only; these are the matchable catalog.
//
// Section 16 (clinical-code verification): every ICD-10 / RxNorm below is verified.
//   ICD-10 (CMS ICD-10-CM 2024): I50.2 Systolic (congestive) heart failure; I25.10 ASHD of native
//     coronary artery without angina; I27.0 Primary pulmonary hypertension; E85.82 Wild-type
//     transthyretin-related (ATTRwt) amyloidosis. (All also in use in gapRuleEngine.ts.)
//   RxNorm (RxNav IN, codebase-verified in cardiovascularValuesets.ts): 1488564 dapagliflozin,
//     1545653 empagliflozin (SGLT2i); 83367 atorvastatin (statin).
//   Lab slugs: lvef + ldl are THREADED-and-Synthea-present (matchable); pasp + bnp are intentionally
//     un-threaded (pasp Synthea-absent, BNP dark vs the threaded NT-proBNP) -> force INDETERMINATE.

import type { TrialCriterion } from './trialMatchService';

export interface CuratedTrialSeed {
  nctId: string | null;
  name: string;
  module: string; // ModuleType
  phase: string | null;
  status: string | null;
  provenance: 'CURATED';
  criteria: TrialCriterion[];
  enrollmentTarget: number | null;
  currentEnrollment: number | null;
}

export const CURATED_TRIALS: CuratedTrialSeed[] = [
  {
    nctId: null,
    name: 'HFrEF GDMT Optimization (SGLT2i-naive) - TAILRD curated',
    module: 'HEART_FAILURE',
    phase: 'Phase 3',
    status: 'Recruiting',
    provenance: 'CURATED',
    // Fully threadable: dx + age + LVEF (threaded) + SGLT2i exclusion (RxNorm). Produces ELIGIBLE
    // (HFrEF adult, LVEF<=40, not on SGLT2i) and INELIGIBLE (already on SGLT2i, or LVEF>40).
    criteria: [
      { criterionId: 'hf-dx', polarity: 'inclusion', type: 'dx', codes: ['I50.2'] },
      { criterionId: 'age-adult', polarity: 'inclusion', type: 'age', op: '>=', value: 18 },
      { criterionId: 'lvef-reduced', polarity: 'inclusion', type: 'lab', slug: 'lvef', op: '<=', value: 40 },
      { criterionId: 'sglt2i-naive', polarity: 'exclusion', type: 'med', codes: ['1488564', '1545653'] },
    ],
    enrollmentTarget: 120,
    currentEnrollment: 0,
  },
  {
    nctId: null,
    name: 'Residual Lipid Risk in ASCVD on Statin - TAILRD curated',
    module: 'CORONARY_INTERVENTION',
    phase: 'Phase 3',
    status: 'Recruiting',
    provenance: 'CURATED',
    // Fully threadable: CAD dx + age + LDL (threaded) + on-statin (RxNorm). ELIGIBLE = CAD adult on a
    // statin with LDL>=70; INELIGIBLE = LDL<70 or not on a statin.
    criteria: [
      { criterionId: 'cad-dx', polarity: 'inclusion', type: 'dx', codes: ['I25.10'] },
      { criterionId: 'age-40', polarity: 'inclusion', type: 'age', op: '>=', value: 40 },
      { criterionId: 'ldl-elevated', polarity: 'inclusion', type: 'lab', slug: 'ldl', op: '>=', value: 70 },
      { criterionId: 'on-statin', polarity: 'inclusion', type: 'med', codes: ['83367'] },
    ],
    enrollmentTarget: 200,
    currentEnrollment: 0,
  },
  {
    nctId: null,
    name: 'Pulmonary Hypertension Hemodynamic Study (echo PASP) - TAILRD curated',
    module: 'VALVULAR_DISEASE',
    phase: 'Phase 2',
    status: 'Recruiting',
    provenance: 'CURATED',
    // INDETERMINATE-forcing: pasp is echo-derived and Synthea-absent (real-EHR-only). The matcher must
    // NEVER assert ELIGIBLE on it -> INDETERMINATE, missingSignal 'pasp'.
    criteria: [
      { criterionId: 'ph-dx', polarity: 'inclusion', type: 'dx', codes: ['I27.0'] },
      { criterionId: 'age-adult', polarity: 'inclusion', type: 'age', op: '>=', value: 18 },
      { criterionId: 'pasp-elevated', polarity: 'inclusion', type: 'lab', slug: 'pasp', op: '>=', value: 35 },
    ],
    enrollmentTarget: 60,
    currentEnrollment: 0,
  },
  {
    nctId: null,
    name: 'ATTR-CM Biomarker Cohort (BNP) - TAILRD curated',
    module: 'HEART_FAILURE',
    phase: 'Phase 2',
    status: 'Recruiting',
    provenance: 'CURATED',
    // INDETERMINATE-forcing via BNP: NT-proBNP is threaded but BNP is dark (Synthea-absent). Demonstrates
    // the honest distinction - a BNP-threshold criterion is UNEVALUABLE even though a related peptide is
    // threaded. INDETERMINATE, missingSignal 'bnp'.
    criteria: [
      { criterionId: 'attr-dx', polarity: 'inclusion', type: 'dx', codes: ['E85.82'] },
      { criterionId: 'bnp-elevated', polarity: 'inclusion', type: 'lab', slug: 'bnp', op: '>=', value: 200 },
    ],
    enrollmentTarget: 40,
    currentEnrollment: 0,
  },
];
