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
 * Evaluate a whole trial for a patient. INDETERMINATE if ANY criterion is UNEVALUABLE (never ELIGIBLE
 * with an unknown). Otherwise INELIGIBLE if any threaded criterion is violated (inclusion FAILED or
 * exclusion MET), else ELIGIBLE.
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

  const status: TrialMatchStatus = anyUnevaluable ? 'INDETERMINATE' : anyViolation ? 'INELIGIBLE' : 'ELIGIBLE';
  return { status, criteriaResults, indeterminateSignals };
}
