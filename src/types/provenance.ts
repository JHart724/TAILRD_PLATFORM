/**
 * AUDIT-208 provenance vocabulary - where a rendered figure's data came from.
 *
 * THE DEFECT THIS EXISTS FOR: the backend already emits `source: 'database'` on the HF dashboard and
 * worklist responses and ZERO components read it. Three honesty markers exist - DemoDataBadge (23
 * files), PendingRealSourceNote (3), Badge variant="estimate" (3) - all manual, all opt-in, none
 * enforced. So there was no way to ask programmatically whether a figure is database-derived, and the
 * one machine-generated provenance signal in the system was discarded at the client boundary.
 *
 * THE FOUR VALUES ARE NOT INVENTED. They are the distinction AUDIT-233 already drew when it ruled
 * `estimate` (a real source estimated FROM) apart from PendingRealSourceNote (no source connected AT
 * ALL), plus `demo` for the fabricated-illustrative case and `live` for the database. The vocabulary
 * existed in three separate components; this gives it a type.
 *
 *   live      - read from the database on this request. The backend says so in its own payload.
 *   demo      - fabricated illustrative data. No source exists and none is claimed.
 *   estimate  - derived from a REAL external source (e.g. Medicare PUF), not the customer's own data.
 *   unsourced - the panel describes something real that HAS a path, but nothing is connected yet.
 *
 * DECLARATION RULE FOR MIXED SURFACES, recorded because it is the one judgement call in the scheme:
 * a surface rendering BOTH live and non-live data declares the WEAKER value, not `live`. The
 * declaration is a FLOOR - "you may not assume anything on this surface is live" - not a description
 * of every panel. That direction is deliberate: for a document generated from platform output, an
 * undercount of live surfaces is safe and an overcount is the AUDIT-233 defect.
 */

export type Provenance = 'live' | 'demo' | 'estimate' | 'unsourced';

export const PROVENANCE_VALUES: readonly Provenance[] = ['live', 'demo', 'estimate', 'unsourced'];

/**
 * The backend's own wire value. `modules.ts` emits `source: 'database'`; older/other payloads may
 * carry 'demo' or nothing at all. Anything unrecognised degrades to 'unsourced' rather than to
 * 'live' - an unknown provenance must never read as a database claim.
 */
export function normalizeSource(source: string | null | undefined): Provenance {
  switch (source) {
    case 'database':
    case 'live':
      return 'live';
    case 'demo':
      return 'demo';
    case 'estimate':
      return 'estimate';
    default:
      return 'unsourced';
  }
}

/** Human-facing label. Kept here so the four values have exactly one wording. */
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  live: 'Live - from your database',
  demo: 'Demo data - EHR integration pending',
  estimate: 'Medicare-derived estimate',
  unsourced: 'No source connected yet',
};

/** True only for data actually read from the database. Used where a claim must be conservative. */
export function isDatabaseDerived(p: Provenance): boolean {
  return p === 'live';
}
