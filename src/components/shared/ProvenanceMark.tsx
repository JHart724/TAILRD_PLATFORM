import React from 'react';
import DemoDataBadge from './DemoDataBadge';
import PendingRealSourceNote from './PendingRealSourceNote';
import Badge from '../../design-system/Badge';
import type { Provenance } from '../../types/provenance';

/**
 * AUDIT-208: one dispatcher over the three honesty markers that already exist.
 *
 * THIS IS DELIBERATELY NOT A NEW MARKER. DemoDataBadge, PendingRealSourceNote and Badge are
 * unchanged; this only routes a typed `Provenance` to whichever already renders that case. Building
 * a fourth marker alongside three working ones would be the parallel-system mistake - the point of
 * AUDIT-208 is that the pieces existed and were not connected, not that they were missing.
 *
 * What it buys over calling the three directly: ONE grep-able call site, so "which surfaces declare
 * provenance" becomes a question with a mechanical answer. That is the property the PR-2 lint needs.
 *
 * `unsourced` REQUIRES `sources` and `detail`, enforced by the props union below rather than by
 * convention. That is not incidental - PendingRealSourceNote was designed under AUDIT-233 to make
 * the author name the real source being waited on AND what the static panel therefore cannot tell
 * the reader. A generic "no source" marker would lose exactly the information that made it useful,
 * so the type makes the lossy call unrepresentable.
 *
 * `live` renders nothing by default: a database-derived figure should not need a badge to be
 * trusted, since the badges exist to mark the exceptions. `showLive` states it positively where the
 * contrast is the point (a mixed panel, an exported report).
 */
type ProvenanceMarkProps =
  | {
      provenance: 'unsourced';
      /** The real source this block waits on, e.g. "CathPCI, STS and ACC-NCDR submissions". */
      sources: string;
      /** What specifically is static, and what it therefore cannot tell the reader. */
      detail: string;
      className?: string;
    }
  | {
      provenance: 'live' | 'demo' | 'estimate';
      showLive?: boolean;
      label?: string;
      className?: string;
    };

export const ProvenanceMark: React.FC<ProvenanceMarkProps> = (props) => {
  if (props.provenance === 'unsourced') {
    return (
      <PendingRealSourceNote
        sources={props.sources}
        detail={props.detail}
        className={props.className ?? ''}
      />
    );
  }

  const { label, className = '' } = props;
  switch (props.provenance) {
    case 'demo':
      return <DemoDataBadge label={label} className={className} />;
    case 'estimate':
      return <Badge variant="estimate" label={label ?? 'Medicare-derived estimate'} className={className} />;
    case 'live':
      if (!props.showLive) return null;
      return (
        <span className={`text-xs text-green-700 font-medium ${className}`}>
          {label ?? 'Live - from your database'}
        </span>
      );
    default:
      return null;
  }
};

export default ProvenanceMark;
