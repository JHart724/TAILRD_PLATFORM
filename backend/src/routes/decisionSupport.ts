/**
 * Pure clinical decision-support builders for the per-patient module endpoints in modules.ts.
 * Extracted here so they can be unit-tested without the Express router (modules.ts uses
 * `export = router`, which cannot coexist with named exports).
 *
 * AUDIT-187 (2026-06-22): the FFR/iFR handler previously also returned a hardcoded `qualityMetrics`
 * block (ffrUtilization '68.4%', benchmark '75%', improvementOpportunity '+$1.2M annual revenue with
 * optimal FFR utilization') - a fabricated POPULATION statistic + revenue projection presented on a
 * SINGLE-PATIENT decision endpoint, computed from nothing (no persisted FFR-utilization field exists,
 * and a per-patient POST is the wrong surface for a population KPI) and consumed by no client. Dropped
 * per the no-fabricated-figure rule (compute infeasible; disclosure would preserve meaningless content).
 * The documentation note is retained as a qualitative appropriate-use statement carrying no figure.
 */

export interface FfrDecisionInput {
  id?: string;
  stenosisPercent?: number;
  ffrValue?: number;
  ifrValue?: number;
}

export function buildFfrDecisionSupport(patientData: FfrDecisionInput = {}) {
  const stenosisPercent = patientData.stenosisPercent ?? 60;
  const ffrValue = patientData.ffrValue;
  const ifrValue = patientData.ifrValue;
  let recommendation = 'Defer revascularization';
  let evidenceLevel = 'Class I, Level A';
  if (ffrValue !== undefined) {
    recommendation = ffrValue <= 0.80 ? 'Revascularization recommended (FFR-positive)' : 'Medical therapy recommended (FFR-negative)';
  } else if (ifrValue !== undefined) {
    recommendation = ifrValue <= 0.89 ? 'Revascularization recommended (iFR-positive)' : 'Medical therapy recommended (iFR-negative)';
  } else if (stenosisPercent >= 90) {
    recommendation = 'Revascularization recommended (severe stenosis)';
  } else if (stenosisPercent >= 50 && stenosisPercent < 90) {
    recommendation = 'Physiological assessment recommended (FFR/iFR)';
    evidenceLevel = 'Class I, Level A - FAME/DEFINE-FLAIR trials';
  }
  const documentationNote = ffrValue !== undefined || ifrValue !== undefined
    ? 'Physiological assessment documented - supports appropriate-use compliance'
    : 'Consider documenting FFR/iFR where indicated per appropriate-use criteria';
  return { patientId: patientData.id, stenosisPercent, ffrValue, ifrValue, recommendation, evidenceLevel, documentationNote };
}

/**
 * Population-level GDMT gap analysis (HF) - pure builder over real `therapyGap` rows, exported for unit testing.
 *
 * AUDIT-188 (2026-06-22): replaces a whole-endpoint silent-mock (fabricated `totalPatients: 1247`, invented
 * `gapBreakdown` counts, `priorityPatients` with FABRICATED patient NAMES 'Sarah Johnson' + `estimatedBenefit`
 * dollars, fabricated `qualityMetrics` %). The names/dollars were PURE-REMOVED per the AUDIT-300 precedent
 * (fabricated patient identifiers are removed, not relabeled). This builder derives only what the gap engine
 * actually stores; fields the engine does not store (per-class eligible/prescribed/atTargetDose denominators,
 * external benchmark, historical trend) are returned as null EmptyState - NEVER a fabricated default. Patient
 * references are INTERNAL UUIDs only, never names (PHI discipline). GDMT 4-pillar classes per the 2022
 * AHA/ACC/HFSA HF Guideline; the class matchers mirror the HF dashboard GET for cross-surface consistency.
 */
export interface HfMedGapRow {
  id: string;
  patientId: string;
  gapType: string;
  medication: string | null;
  targetStatus?: string | null;
  identifiedAt: Date;
}

const GDMT_CLASSES: { key: string; label: string; matcher: RegExp }[] = [
  { key: 'aceArb', label: 'ACEi/ARB/ARNI', matcher: /(ACEi|ACE inhibitor|ARB|ARNI|sacubitril|valsartan|lisinopril|enalapril|losartan)/i },
  { key: 'betaBlocker', label: 'Beta-blocker', matcher: /(beta blocker|bisoprolol|carvedilol|metoprolol)/i },
  { key: 'mra', label: 'MRA', matcher: /(MRA|spironolactone|eplerenone|mineralocorticoid)/i },
  { key: 'sglt2i', label: 'SGLT2i', matcher: /(SGLT2|dapagliflozin|empagliflozin|canagliflozin)/i },
];

export function buildGdmtGapAnalysis(totalPatients: number, medGaps: HfMedGapRow[]) {
  const isMissing = (t: string) => t === 'MEDICATION_MISSING';
  const gapBreakdown: Record<string, unknown> = {};
  for (const c of GDMT_CLASSES) {
    const classGaps = medGaps.filter(g => g.medication !== null && c.matcher.test(g.medication));
    const notPrescribed = new Set(classGaps.filter(g => isMissing(g.gapType)).map(g => g.patientId)).size;
    const underDosed = new Set(classGaps.filter(g => g.gapType === 'MEDICATION_UNDERDOSED').map(g => g.patientId)).size;
    const gapCount = new Set(classGaps.map(g => g.patientId)).size;
    gapBreakdown[c.key] = {
      label: c.label,
      gapCount,
      // Denominator fields are NOT stored by the gap engine (it records gaps, not the eligible population) ->
      // null EmptyState, never a fabricated count.
      eligible: null,
      prescribed: null,
      atTargetDose: null,
      opportunities: [
        { type: 'Not Prescribed', count: notPrescribed, priority: 'high' },
        { type: 'Under-dosed', count: underDosed, priority: 'medium' },
      ],
    };
  }
  // Priority patients = real open gaps, most-recent first, INTERNAL UUID only (never a patient name).
  const priorityPatients = medGaps
    .slice()
    .sort((a, b) => b.identifiedAt.getTime() - a.identifiedAt.getTime())
    .slice(0, 10)
    .map(g => ({
      patientId: g.patientId,
      gapId: g.id,
      gap: g.medication !== null ? `${g.medication} ${isMissing(g.gapType) ? 'not prescribed' : 'under-dosed'}` : (g.targetStatus ?? 'GDMT gap'),
      priority: isMissing(g.gapType) ? 'high' : 'medium',
      identifiedAt: g.identifiedAt.toISOString(),
    }));
  const patientsWithMedGap = new Set(medGaps.map(g => g.patientId)).size;
  const overallOptimization = totalPatients > 0
    ? Math.round(((totalPatients - patientsWithMedGap) / totalPatients) * 1000) / 10
    : null;
  return {
    totalPatients,
    gapBreakdown,
    priorityPatients,
    qualityMetrics: {
      overallOptimization,  // real - share of HF patients with zero unresolved medication gap
      benchmark: null,      // external benchmark not stored -> EmptyState
      improvement: null,    // historical quarter-over-quarter trend not stored -> EmptyState
      target: null,
    },
  };
}
