/**
 * NEGATIVE-CONTROL FIXTURE for validateEvidenceObjects.test.ts.
 *
 * This file is NOT part of the runtime engine and is NOT a Jest test (the
 * `.fixture.ts` suffix is excluded by the `(spec|test).ts` testMatch). It is read
 * as plain TEXT and fed to analyzeSource() to prove the gate FIRES on a synthetic
 * wrong-provenance evidence object - i.e. the gate is not vacuously passing.
 *
 * The single rule below carries three deliberate disagreements between its
 * `recommendations` text and its `evidence` object (the AUDIT-103 defect class):
 *   - classOfRecommendation: recommendations say "Class 1", evidence says '2a'
 *   - levelOfEvidence:       recommendations say "LOE A",  evidence says 'B'
 *   - guidelineSource:       recommendations.guideline is 2020 VHD,
 *                            evidence.guidelineSource is a 2023 AF-Management donor
 *
 * Identifiers are intentionally undefined - analyzeSource is syntax-only (it never
 * type-checks or executes this source), so it parses fine.
 */

// Gap XX-9: Synthetic inconsistent rule (negative control)
// Guideline: 2020 ACC/AHA VHD Guideline, Class 1, LOE A
if (someCondition) {
  gaps.push({
    type: TherapyGapType.MEDICATION_MISSING,
    module: ModuleType.STRUCTURAL_HEART,
    status: 'Synthetic inconsistent evidence (negative control)',
    target: 'Therapy initiated',
    recommendations: {
      action: 'Consider therapy per 2020 ACC/AHA VHD, Class 1, LOE A',
      guideline: '2020 ACC/AHA Valvular Heart Disease',
    },
    evidence: {
      triggerCriteria: ['synthetic trigger'],
      guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for AF Management',
      classOfRecommendation: '2a',
      levelOfEvidence: 'B',
      exclusions: ['Hospice/palliative care'],
    },
  });
}

// Gap XX-10: Synthetic CONSISTENT control rule (must NOT be flagged)
// Guideline: 2022 AHA/ACC/HFSA HF Guideline, Class 1, LOE A
if (otherCondition) {
  gaps.push({
    type: TherapyGapType.MEDICATION_MISSING,
    module: ModuleType.HEART_FAILURE,
    status: 'Synthetic consistent evidence (positive control)',
    target: 'Therapy initiated',
    recommendations: {
      action: 'Consider SGLT2i per 2022 AHA/ACC/HFSA, Class 1, LOE A',
      guideline: '2022 AHA/ACC/HFSA HF Guideline',
    },
    evidence: {
      triggerCriteria: ['synthetic trigger'],
      guidelineSource: '2022 AHA/ACC/HFSA Guideline (DAPA-HF, EMPEROR-Reduced)',
      classOfRecommendation: '1',
      levelOfEvidence: 'A',
      exclusions: ['Hospice/palliative care'],
    },
  });
}
