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
