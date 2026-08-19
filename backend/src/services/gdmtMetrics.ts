/**
 * AUDIT-324: GDMT pillar rates, computed from MEDICATION CODES on the patient record.
 *
 * THE DEFECT THIS REPLACES: the HF dashboard computed each pillar as
 *   coverage = 1 - (distinct patients with a matching open MEDICATION_MISSING gap) / totalPatients
 * matched by a REGEX OVER THE FREE-TEXT `medication` STRING on the gap row. Whether the patient
 * was on the drug was never consulted, so a patient the engine could not evaluate produced no gap
 * row and therefore counted as COVERED. Measured 2026-08-18 on demo-synthea-threaded: beta blocker
 * read 100.0% with missingCount 0, while 568 of 1,996 patients were not on a beta blocker by code.
 *
 * THE REPLACEMENT, per the three remediation clauses in AUDIT-324:
 *   (a) NUMERATOR FROM CODES - `expandToIngredients` over the patient's own `rxNormCode` values,
 *       so an SCD/SBD-coded product rolls up to its ingredient (AUDIT-118) and the numerator
 *       answers "is this patient on the drug" rather than "did a rule fire".
 *   (b) EXPLICIT EVALUABLE DENOMINATOR - HFrEF, i.e. an LVEF measured within ECHO_CUTOFF_MS and
 *       <= 40, mirroring the gate the gap rules themselves apply in buildPatientEvalContext.
 *       Patients the engine cannot assess are NOT folded into the numerator as covered; they are
 *       counted and reported with their reason.
 *   (c) NO NAME MATCHING ANYWHERE IN THIS PATH (the AUDIT-315 class). Gap rows are not read here
 *       at all, so the `/ARB/i` collision that scored IV-iron gaps as missing ACE/ARB cannot recur.
 *
 * THE UNEVALUABLE SPLIT IS THREE-WAY, not two, because a DATA gap and a CLINICAL exclusion are
 * different facts (operator ruling 2026-08-19):
 *   - echoStale / echoAbsent  -> actionable echo-surveillance care gaps
 *   - lvefAbove40             -> assessed and simply not HFrEF; a correct exclusion, not a gap.
 * Folding lvefAbove40 in with the echo gaps would overstate the care gap.
 *
 * Pure and deterministic: no I/O, no clock read (the caller passes `nowMs`), no Prisma. The caller
 * batches (AUDIT-227 precedent) and accumulates, so the cohort is never held in memory at once.
 */

import { RXNORM_GDMT } from '../terminology/cardiovascularValuesets';
import { expandToIngredients } from '../terminology/expandToIngredients';
import { ECHO_CUTOFF_MS } from '../ingestion/buildPatientEvalContext';

/** The HFrEF ceiling the GDMT gap rules gate on (gapRuleEngine gap-hf-34/35/36). */
export const HFREF_LVEF_MAX = 40;

export const GDMT_PILLARS = {
  aceArb: {
    codes: [
      RXNORM_GDMT.LISINOPRIL,
      RXNORM_GDMT.ENALAPRIL,
      RXNORM_GDMT.RAMIPRIL,
      RXNORM_GDMT.LOSARTAN,
      RXNORM_GDMT.VALSARTAN,
      RXNORM_GDMT.CANDESARTAN,
      RXNORM_GDMT.SACUBITRIL_VALSARTAN,
    ],
    target: 95,
    amber: 85,
  },
  betaBlocker: {
    // Evidence-based HF beta-blockers ONLY. Atenolol is deliberately absent - it lives in
    // RXNORM_NON_EBM_BB_HF and has no HFrEF mortality evidence, so it must not satisfy this pillar.
    codes: [RXNORM_GDMT.CARVEDILOL, RXNORM_GDMT.METOPROLOL_SUCCINATE, RXNORM_GDMT.BISOPROLOL],
    target: 95,
    amber: 85,
  },
  mra: {
    // Steroidal MRAs only. FINERENONE IS EXCLUDED - operator ruling 2026-08-19.
    //
    // THE STRUCTURAL ARGUMENT, which is the decisive one: this pillar's denominator is LVEF <= 40,
    // and finerenone's heart-failure evidence (FINEARTS-HF) is LVEF >= 40. The populations DO NOT
    // OVERLAP, so counting finerenone here would import evidence from one side of the
    // ejection-fraction split to justify coverage on the other - the same shape as AUDIT-233's
    // `AHA 2024` chip, a real citation displayed as authority on a layer it does not cover.
    //
    // THE GUIDELINE LANGUAGE AGREES: the 2022 AHA/ACC/HFSA recommendation is worded "(spironolactone
    // or eplerenone)", Class 1 LOE A on RALES and EMPHASIS-HF, and predates FINEARTS-HF entirely.
    //
    // EXPECTED DATA EFFECT: few or no patients move today, because a finerenone patient only enters
    // this denominator at LVEF <= 40, where they are outside finerenone's HF indication anyway. This
    // is a correctness decision about what the number MEANS, not one that changes it.
    //
    // KNOWN CONSEQUENCE, filed separately as AUDIT-326: a HFrEF patient already taking finerenone
    // still fires `gap-hf-36-mra`, whose recommendation text reads as though they are on nothing.
    codes: [RXNORM_GDMT.SPIRONOLACTONE, RXNORM_GDMT.EPLERENONE],
    target: 85,
    amber: 70,
  },
  sglt2i: {
    // The canonical set wins over the retired regex, which carried canagliflozin (not HF-indicated)
    // and omitted sotagliflozin. The two disagreed; the regex was never the source of truth.
    codes: [RXNORM_GDMT.DAPAGLIFLOZIN, RXNORM_GDMT.EMPAGLIFLOZIN, RXNORM_GDMT.SOTAGLIFLOZIN],
    target: 75,
    amber: 60,
  },
} as const;

export type PillarKey = keyof typeof GDMT_PILLARS;
export const PILLAR_KEYS = Object.keys(GDMT_PILLARS) as PillarKey[];

/** The per-patient shape this scan needs. Gap rows are deliberately NOT part of it. */
export interface GdmtPatientRow {
  medications: Array<{ rxNormCode: string | null }>;
  /** LVEF observations only; the caller filters by observationType. */
  observations: Array<{ valueNumeric: number | null; observedDateTime: Date | null }>;
}

export interface GdmtScan {
  cohortTotal: number;
  evaluable: number;
  unevaluable: { lvefAbove40: number; echoStale: number; echoAbsent: number };
  onTherapy: Record<PillarKey, number>;
  onAllFour: number;
}

export function emptyScan(): GdmtScan {
  return {
    cohortTotal: 0,
    evaluable: 0,
    unevaluable: { lvefAbove40: 0, echoStale: 0, echoAbsent: 0 },
    onTherapy: { aceArb: 0, betaBlocker: 0, mra: 0, sglt2i: 0 },
    onAllFour: 0,
  };
}

/**
 * Accumulate ONE BATCH into `acc`. Mirrors buildPatientEvalContext's staleness rule exactly: the
 * first non-null observation that passes the cutoff wins, and a stale one is skipped rather than
 * clamped - so the evaluable set here is the same set the gap rules could actually assess.
 */
export function scanGdmtBatch(rows: GdmtPatientRow[], nowMs: number, acc: GdmtScan): void {
  for (const p of rows) {
    acc.cohortTotal++;

    let lvef: number | undefined;
    for (const o of p.observations) {
      if (o.valueNumeric === null) continue;
      if (o.observedDateTime && nowMs - o.observedDateTime.getTime() > ECHO_CUTOFF_MS) continue;
      lvef = o.valueNumeric;
      break;
    }

    if (lvef === undefined) {
      // A DATA gap. Distinguish "we measured it too long ago" from "we never measured it".
      if (p.observations.some((o) => o.valueNumeric !== null)) acc.unevaluable.echoStale++;
      else acc.unevaluable.echoAbsent++;
      continue;
    }
    if (lvef > HFREF_LVEF_MAX) {
      // A CLINICAL exclusion, not a data gap: assessed, and not HFrEF.
      acc.unevaluable.lvefAbove40++;
      continue;
    }

    acc.evaluable++;
    const codes = expandToIngredients(
      p.medications.map((m) => m.rxNormCode).filter((c): c is string => Boolean(c)),
    );
    let onAll = true;
    for (const key of PILLAR_KEYS) {
      const set = GDMT_PILLARS[key].codes as readonly string[];
      if (codes.some((c) => set.includes(c))) acc.onTherapy[key]++;
      else onAll = false;
    }
    if (onAll) acc.onAllFour++;
  }
}

export interface GdmtPillarMetric {
  current: number | null;
  target: number;
  status: 'green' | 'amber' | 'red' | 'unknown';
  /** Evaluable patients NOT on this drug class. Was "patients with an open gap" before AUDIT-324. */
  missingCount: number;
  onTherapyCount: number;
  evaluableCount: number;
}

function statusFor(coverage: number | null, target: number, amber: number): GdmtPillarMetric['status'] {
  if (coverage === null) return 'unknown';
  if (coverage >= target) return 'green';
  if (coverage >= amber) return 'amber';
  return 'red';
}

/** Render the accumulated scan into the response shape. `current` is null when nothing is evaluable. */
export function toGdmtMetrics(acc: GdmtScan): Record<PillarKey, GdmtPillarMetric> {
  const out = {} as Record<PillarKey, GdmtPillarMetric>;
  for (const key of PILLAR_KEYS) {
    const { target, amber } = GDMT_PILLARS[key];
    const on = acc.onTherapy[key];
    const current = acc.evaluable > 0 ? Math.round((on / acc.evaluable) * 1000) / 10 : null;
    out[key] = {
      current,
      target,
      status: statusFor(current, target, amber),
      missingCount: Math.max(acc.evaluable - on, 0),
      onTherapyCount: on,
      evaluableCount: acc.evaluable,
    };
  }
  return out;
}

export interface GdmtDenominator {
  criteria: string;
  cohortTotal: number;
  evaluable: number;
  unevaluable: number;
  unevaluableReasons: { lvefAbove40: number; echoStale: number; echoAbsent: number };
}

export function toGdmtDenominator(acc: GdmtScan): GdmtDenominator {
  const u = acc.unevaluable;
  return {
    criteria: `LVEF <= ${HFREF_LVEF_MAX} measured within ${ECHO_CUTOFF_MS / (24 * 60 * 60 * 1000)} days`,
    cohortTotal: acc.cohortTotal,
    evaluable: acc.evaluable,
    unevaluable: u.lvefAbove40 + u.echoStale + u.echoAbsent,
    unevaluableReasons: { ...u },
  };
}
