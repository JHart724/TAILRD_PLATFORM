/**
 * AUDIT-194-B3 (Threading Tranche 2): echo_months recency derivation.
 *
 * echo_months = whole months since the patient's MOST-RECENT echocardiogram, derived from the union of
 *   (a) echo PROCEDURE dates - SNOMED 40701008 (Echocardiography) / 433236007 (Transthoracic echo) /
 *       105376000 (Transesophageal echo). PRESENT in the SOURCE procedures.csv (full-file counts,
 *       s3://.../synthea/nyc-population-2026/csv/procedures.csv, 5,480,901 rows, verified 2026-07-22:
 *       40701008 x7205 + 433236007 x2030 + 105376000 x73). The earlier "x1037/x283/x7" figures were an
 *       845K-row SAMPLE, not the full file - relabeled here to avoid presenting a sample as full-file
 *       confirmation (AUDIT-218). CAVEAT: these procedures were NOT PERSISTED for the demo tenants until
 *       the AUDIT-218 backfill (the proof CSV path counted-and-dropped them, so patient.procedures was
 *       empty; see scripts/backfillProcedures.ts) - so branch (a) contributed NOTHING pre-backfill and
 *       the derivation ran entirely on branch (b), and
 *   (b) the LVEF observation date - Synthea's echo-numeric proxy (LOINC 10230-1 -> slug 'lvef') - as fallback.
 * Most-recent-of-either = the complete "when last echo'd" signal.
 *
 * CRITICAL - UNFILTERED dates: this runs on the RAW observation/procedure set, BEFORE the 365-day
 * ECHO_CUTOFF_MS staleness filter the runners apply when building labValues. A >12-month-old echo is exactly
 * what the VD-ECHO-INTERVAL surveillance rule must catch, so it must NOT be pre-filtered out.
 *
 * Returns undefined when NO echo is on record (no echo procedure AND no lvef observation). The consuming
 * surveillance rule must NEVER fire on undefined - that is the hollow direction AUDIT-194 caught (fired
 * ~100% of the valve cohort). never-fire-on-absence discipline.
 */

// Echocardiography procedure SNOMED codes (Synthea procedures.csv, Stage 1b-confirmed present).
export const ECHO_PROCEDURE_SNOMED: ReadonlySet<string> = new Set([
  '40701008',  // Echocardiography (procedure)
  '433236007', // Transthoracic echocardiography (procedure)
  '105376000', // Transesophageal echocardiography (procedure)
]);

// Observation slugs representing an echo-derived numeric (Synthea emits LVEF LOINC 10230-1 -> 'lvef').
export const ECHO_OBSERVATION_SLUGS: ReadonlySet<string> = new Set(['lvef']);

// Mean Gregorian month in ms (365.2425 / 12 days). Whole-month granularity is sufficient for a >=12-month gate.
const MS_PER_MONTH = 30.436875 * 24 * 60 * 60 * 1000;

interface EchoObservation {
  observationType: string;
  observedDateTime: Date | string | null;
}
interface EchoProcedure {
  snomedCode: string | null;
  procedureDate: Date | string | null;
}

/**
 * Whole months since the most-recent echo (procedure date union lvef observation date), or undefined if
 * no echo is on record. Pass the UNFILTERED observation/procedure arrays and the current epoch ms.
 */
export function deriveEchoMonths(
  observations: ReadonlyArray<EchoObservation>,
  procedures: ReadonlyArray<EchoProcedure>,
  nowMs: number,
): number | undefined {
  let mostRecentMs: number | null = null;
  const consider = (d: Date | string | null): void => {
    if (d == null) return;
    const ms = new Date(d).getTime();
    if (!Number.isFinite(ms)) return;
    if (mostRecentMs === null || ms > mostRecentMs) mostRecentMs = ms;
  };
  for (const p of procedures) {
    if (p.snomedCode != null && ECHO_PROCEDURE_SNOMED.has(p.snomedCode)) consider(p.procedureDate);
  }
  for (const o of observations) {
    if (ECHO_OBSERVATION_SLUGS.has(o.observationType)) consider(o.observedDateTime);
  }
  if (mostRecentMs === null) return undefined;
  return Math.max(0, Math.floor((nowMs - mostRecentMs) / MS_PER_MONTH));
}
