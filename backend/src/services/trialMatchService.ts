// AUDIT-148 Slice 1 (STEP 3): honest clinical-trial eligibility matcher.
//
// evaluateTrialMatch(trial, ctx) returns ELIGIBLE / INELIGIBLE / INDETERMINATE with per-criterion
// verdicts and the named unthreaded signals. The load-bearing discipline (the trial analog of the
// gap engine's never-fire-on-absence): NEVER assert ELIGIBLE when ANY criterion is unevaluable -
// fail loud to INDETERMINATE and name the missing signal. A criterion that references a signal not
// actually threaded AND Synthea-present is UNEVALUABLE, never a false MET/FAILED.
//
// Consumes the shared PatientEvalContext (buildPatientEvalContext) so the matcher inherits the exact
// crosswalks, LOINC threading, echo_months derivation, and re-ingest correctness the gap engine uses.

import type { PatientEvalContext } from '../ingestion/buildPatientEvalContext';

// The lab slugs that are ACTUALLY threaded AND Synthea-present (per the AUDIT-194 Tranche 1/2
// source-checks). A lab criterion on any slug NOT in this allowlist is UNEVALUABLE (platform-
// unthreaded / Synthea-absent) - e.g. bnp (NT-proBNP threaded but BNP dark), pasp, nyha_class, the
// echo-morphometric cluster (valve_severity/lvesd/tapse/fac/mitral_regurg_grade/aortic_root/...),
// qtc/qrs, abi, sts_score, kccq. Allowlist (fail-safe): an unknown slug can never be a false MET.
export const THREADED_LAB_SLUGS: ReadonlySet<string> = new Set([
  // serum labs (Tranche 1, source-confirmed present)
  'nt_probnp', 'egfr', 'ldl', 'triglycerides', 'ferritin', 'tsat', 'potassium', 'sodium', 'creatinine',
  'hemoglobin', 'hba1c', 'apob', 'inr', 'tsh', 'crp', 'hs_crp', 'alt', 'ast', 'lpa',
  // vitals / anthropometrics
  'systolic_bp', 'diastolic_bp', 'heart_rate', 'bmi',
  // echo-numeric proxy + derived recency (Tranche 2)
  'lvef', 'echo_months',
]);

export type CriterionPolarity = 'inclusion' | 'exclusion';
export type CriterionType = 'dx' | 'lab' | 'age' | 'sex' | 'med' | 'procedure';
export type CompareOp = '>=' | '<=' | '>' | '<' | '==' | 'range';
export type Verdict = 'MET' | 'FAILED' | 'UNEVALUABLE';

export interface TrialCriterion {
  criterionId: string;
  polarity: CriterionPolarity;
  type: CriterionType;
  codes?: string[]; // dx (ICD-10 prefixes) / med (RxNorm ingredient) / procedure (CPT|SNOMED)
  slug?: string; // lab slug
  op?: CompareOp; // lab / age
  value?: number | string; // lab / age threshold, or sex value
  min?: number; // range low (inclusive)
  max?: number; // range high (inclusive)
}

export interface CriterionResult {
  criterionId: string;
  polarity: CriterionPolarity;
  verdict: Verdict;
  missingSignal?: string;
}

export type TrialMatchStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INDETERMINATE';

export interface TrialMatchResult {
  status: TrialMatchStatus;
  criteriaResults: CriterionResult[];
  indeterminateSignals: string[];
}

interface MatchableTrial {
  id?: string;
  criteria: TrialCriterion[];
}

function compareNumeric(actual: number, op: CompareOp | undefined, c: TrialCriterion): boolean {
  switch (op) {
    case '>=': return actual >= (c.value as number);
    case '<=': return actual <= (c.value as number);
    case '>': return actual > (c.value as number);
    case '<': return actual < (c.value as number);
    case '==': return actual === (c.value as number);
    case 'range': return actual >= (c.min as number) && actual <= (c.max as number);
    default: return false;
  }
}

/**
 * Evaluate ONE criterion against the patient context. Returns MET/FAILED when the signal is decidable,
 * UNEVALUABLE (with missingSignal) when it references an unthreaded/Synthea-absent signal OR a threaded
 * signal this patient has no value for - never a guessed MET/FAILED on absent data.
 */
export function evaluateCriterion(c: TrialCriterion, ctx: PatientEvalContext): CriterionResult {
  const base = { criterionId: c.criterionId, polarity: c.polarity };
  switch (c.type) {
    case 'dx': {
      const met = (c.codes ?? []).some(code => ctx.dxCodes.some(dx => dx.startsWith(code)));
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    case 'med': {
      const met = (c.codes ?? []).some(code => ctx.medCodes.includes(code));
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    case 'procedure': {
      // AUDIT-201: mirror the lab two-stage UNEVALUABLE pattern (:107-116, the exemplar). procedureCodes
      // is built from patient.procedures; an EMPTY list is AMBIGUOUS - it means EITHER "this patient
      // genuinely had no procedure" OR "procedures are not threaded for this patient/tenant", and the
      // context cannot distinguish the two (both yield []). So an empty list is UNEVALUABLE - err toward
      // unknown, NEVER a false definite negative. This matters because AUDIT-201 makes a FAILED verdict
      // load-bearing (a violation now short-circuits to INELIGIBLE); a FAILED on absent data would become
      // a false definite INELIGIBLE (the mirror of a false-ELIGIBLE). Only a NON-EMPTY procedure list is a
      // populated signal in which a no-match is a genuine FAILED (same threading-completeness caveat as
      // dx/med: a specific procedure that happened but was not threaded can still under-detect, unchanged).
      if (!ctx.procedureCodes || ctx.procedureCodes.length === 0) {
        return { ...base, verdict: 'UNEVALUABLE', missingSignal: 'procedure' };
      }
      const met = (c.codes ?? []).some(code => ctx.procedureCodes.includes(code));
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    case 'age': {
      const met = compareNumeric(ctx.age, c.op, c);
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    case 'sex': {
      if (ctx.gender == null) return { ...base, verdict: 'UNEVALUABLE', missingSignal: 'sex' };
      const met = String(ctx.gender).toUpperCase() === String(c.value).toUpperCase();
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    case 'lab': {
      const slug = c.slug ?? '';
      // Platform-unthreaded / Synthea-absent signal -> UNEVALUABLE (never a false MET/FAILED).
      if (!THREADED_LAB_SLUGS.has(slug)) return { ...base, verdict: 'UNEVALUABLE', missingSignal: slug };
      const actual = ctx.labValues[slug];
      // Threaded signal but no value for THIS patient -> still UNEVALUABLE (never assert on absent data).
      if (actual === undefined) return { ...base, verdict: 'UNEVALUABLE', missingSignal: slug };
      const met = compareNumeric(actual, c.op, c);
      return { ...base, verdict: met ? 'MET' : 'FAILED' };
    }
    default:
      return { ...base, verdict: 'UNEVALUABLE', missingSignal: `unknown-type:${c.type}` };
  }
}

/**
 * Evaluate a whole trial for a patient. Precedence (AUDIT-201): a definite VIOLATION wins over an unknown.
 *   INELIGIBLE     if any threaded criterion is definitively violated (inclusion FAILED or exclusion MET) -
 *                  a FAILED is a definite NEGATIVE on data we DO have, so we report it even when another
 *                  criterion is UNEVALUABLE ("already excluded, stop"). Load-bearing safety: every FAILED
 *                  path rests on present, threaded data (dx/med/age/sex/lab guarded; procedure UNEVALUABLE
 *                  when procedureCodes is empty) - never a FAILED on absent data, which would be a false
 *                  definite INELIGIBLE (the mirror of a false-ELIGIBLE).
 *   INDETERMINATE  else, if any criterion is UNEVALUABLE (no violation, >=1 unknown - the true
 *                  "one test away" worklist; an UNEVALUABLE exclusion resolves here, NEVER to ELIGIBLE).
 *   ELIGIBLE       else (all criteria threaded AND met - never ELIGIBLE with an unknown; unchanged).
 */
export function evaluateTrialMatch(trial: MatchableTrial, ctx: PatientEvalContext): TrialMatchResult {
  const criteriaResults: CriterionResult[] = [];
  const indeterminateSignals: string[] = [];
  let anyUnevaluable = false;
  let anyViolation = false;

  for (const c of trial.criteria ?? []) {
    const r = evaluateCriterion(c, ctx);
    criteriaResults.push(r);
    if (r.verdict === 'UNEVALUABLE') {
      anyUnevaluable = true;
      if (r.missingSignal && !indeterminateSignals.includes(r.missingSignal)) indeterminateSignals.push(r.missingSignal);
    } else if (
      (c.polarity === 'inclusion' && r.verdict === 'FAILED') ||
      (c.polarity === 'exclusion' && r.verdict === 'MET')
    ) {
      anyViolation = true;
    }
  }

  // AUDIT-201: a definite violation short-circuits to INELIGIBLE even when another criterion is
  // UNEVALUABLE. INDETERMINATE only when NO violation AND >=1 unevaluable. ELIGIBLE unchanged - it still
  // requires anyUnevaluable === false, so an unevaluable EXCLUSION resolves INDETERMINATE, never ELIGIBLE.
  const status: TrialMatchStatus = anyViolation ? 'INELIGIBLE' : anyUnevaluable ? 'INDETERMINATE' : 'ELIGIBLE';
  return { status, criteriaResults, indeterminateSignals };
}
