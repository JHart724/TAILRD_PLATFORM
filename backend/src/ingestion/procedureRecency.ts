/**
 * Tranche 3 Slice 1: PCI-anchored recency derivations for the CAD procedure-timing rules.
 *
 * Two derived signals, both written into labValues by buildPatientEvalContext (the echo_months
 * pattern - AUDIT-194-B3):
 *
 *   months_since_pci      - whole months since the patient's MOST-RECENT PCI (SNOMED 415070008).
 *                           Consumed by GAP-CAD-061 (DAPT de-escalation window, TWILIGHT/TICO:
 *                           1-3 months post-PCI).
 *   ncs_after_pci_months  - whole months from a PCI to the FIRST curated non-cardiac surgery
 *                           performed AFTER it, minimized over all (PCI, NCS) pairs. Consumed by
 *                           GAP-CAD-051 (post-PCI non-cardiac surgery timing, 2016 ACC/AHA DAPT
 *                           Focused Update). Pairwise, not latest-PCI-anchored: a surgery 2 months
 *                           after an earlier PCI is a timing event even if a later PCI followed.
 *
 * CRITICAL - UNFILTERED dates: both run on the RAW procedures array, before any staleness filter.
 * An old PCI is exactly what places a patient OUTSIDE the 1-3 month window, so it must not be
 * pre-filtered away.
 *
 * Returns undefined when the anchoring signal is absent (no PCI on record; no qualifying NCS after
 * any PCI). undefined is NEVER written into labValues -> consuming rules never fire on absence
 * (the hollow direction AUDIT-194 caught). never-fire-on-absence discipline.
 *
 * Substrate soundness (measured live 2026-07-30, demo-synthea-threaded): PCI/CABG procedureDate
 * NULLs 0/3,096 - every revascularization row is dated.
 */

import { SNOMED_CORONARY_REVASC, SNOMED_NONCARDIAC_SURGERY } from '../terminology/cardiovascularValuesets';

// Mean Gregorian month in ms (365.2425 / 12 days) - same constant as echoRecency.ts. Whole-month
// granularity is sufficient for the 1-3 month and <6 month gates.
const MS_PER_MONTH = 30.436875 * 24 * 60 * 60 * 1000;

const NCS_CODES: ReadonlySet<string> = new Set(Object.values(SNOMED_NONCARDIAC_SURGERY));

interface RecencyProcedure {
  snomedCode: string | null;
  procedureDate: Date | string | null;
}

function toMs(d: Date | string | null): number | undefined {
  if (d == null) return undefined;
  const ms = new Date(d).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * Whole months since the most-recent PCI, or undefined if no dated PCI is on record.
 * Pass the UNFILTERED procedures array and the current epoch ms (single clock per evaluation).
 */
export function deriveMonthsSincePci(
  procedures: ReadonlyArray<RecencyProcedure>,
  nowMs: number,
): number | undefined {
  let mostRecentMs: number | undefined;
  for (const p of procedures) {
    if (p.snomedCode !== SNOMED_CORONARY_REVASC.PCI) continue;
    const ms = toMs(p.procedureDate);
    if (ms === undefined) continue;
    if (mostRecentMs === undefined || ms > mostRecentMs) mostRecentMs = ms;
  }
  if (mostRecentMs === undefined) return undefined;
  return Math.max(0, Math.floor((nowMs - mostRecentMs) / MS_PER_MONTH));
}

/**
 * Whole months from a PCI to the FIRST curated non-cardiac surgery strictly after it, minimized
 * over all (PCI, NCS) pairs; undefined when no qualifying pair exists (no PCI, no NCS, or every
 * NCS precedes every PCI). The consuming rule gates on `< 6`; returning the MINIMUM gap means the
 * closest (most guideline-relevant) pairing decides.
 */
export function deriveNcsAfterPciMonths(
  procedures: ReadonlyArray<RecencyProcedure>,
): number | undefined {
  const pciDates: number[] = [];
  const ncsDates: number[] = [];
  for (const p of procedures) {
    if (p.snomedCode == null) continue;
    const ms = toMs(p.procedureDate);
    if (ms === undefined) continue;
    if (p.snomedCode === SNOMED_CORONARY_REVASC.PCI) pciDates.push(ms);
    else if (NCS_CODES.has(p.snomedCode)) ncsDates.push(ms);
  }
  if (pciDates.length === 0 || ncsDates.length === 0) return undefined;
  let minGapMs: number | undefined;
  for (const pci of pciDates) {
    for (const ncs of ncsDates) {
      if (ncs <= pci) continue; // surgery strictly AFTER the PCI
      const gap = ncs - pci;
      if (minGapMs === undefined || gap < minGapMs) minGapMs = gap;
    }
  }
  if (minGapMs === undefined) return undefined;
  return Math.floor(minGapMs / MS_PER_MONTH);
}
