/**
 * PendingRealSourceNote - the in-UI marker for a comparison figure whose real source does not exist yet.
 *
 * WHY THIS EXISTS (AUDIT-233, operator ruling 2026-08-05). The in-suite Service Line tier renders
 * quality rates beside named-registry thresholds - CathPCI, STS, ACC-NCDR, STS/ACC TVT - and, in one
 * place, percentile ranks. Every one of those is a static literal. The platform holds no registry feed,
 * so nothing on that tier was ever computed against a registry cohort. Read cold by a clinician or a
 * CMO, "92nd percentile" against a named registry is a specific claim about measured standing.
 *
 * WHY A MARKER RATHER THAN A REMOVAL, which is the opposite of the ruling on the freemium surface.
 * The removal rule (AUDIT-232) says mark-as-unavailable is for capability we INTEND to build, and
 * removal is for capability with no path - because a locked or marked panel implies the capability
 * exists. Registry comparison has a path: a customer submitting to CathPCI or the TVT Registry already
 * holds the data, and ingesting it is a wiring problem, not a sourcing problem. Deleting these panels
 * would delete a real target. Contrast the freemium removals in `src/components/free-tier/`, where
 * attributed clinical outcomes and product-efficacy claims have no path at any label.
 *
 * WHAT THIS COMPONENT IS NOT. It is not a provenance Badge. A `Badge variant="estimate"` says "this
 * number was estimated from a real source" (CMS public files, on the freemium surface). This says the
 * stronger and less flattering thing: no source is connected at all, and the number below is a
 * placeholder. Conflating the two is precisely the drift this note exists to prevent, which is why it
 * is a distinct component with its own wording rather than another Badge variant.
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface PendingRealSourceNoteProps {
  /** The real source this block is waiting on, e.g. "CathPCI, STS and ACC-NCDR submissions". */
  sources: string;
  /** What specifically is static, and what it therefore cannot tell the reader. */
  detail: string;
  className?: string;
}

const PendingRealSourceNote: React.FC<PendingRealSourceNoteProps> = ({
  sources,
  detail,
  className = '',
}) => (
  <div
    className={`flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6 ${className}`}
    role="note"
  >
    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="text-xs leading-relaxed text-titanium-700">
      <span className="font-semibold text-amber-800">Pending real source - {sources}.</span>{' '}
      {detail}
    </div>
  </div>
);

export default PendingRealSourceNote;
