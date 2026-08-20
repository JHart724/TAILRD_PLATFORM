import React from 'react';
import SectionCard from '../../../design-system/SectionCard';
import LockedOverlay from '../../../design-system/LockedOverlay';
import Badge from '../../../design-system/Badge';
import type { Provenance } from '../../../types/provenance';

/**
 * OPERATOR RULING 2026-08-05 (AUDIT-233): referral leakage KEEPS its place on the freemium
 * surface, relabelled as a Medicare-derived estimate with an explicit caveat. It is NOT ruled onto
 * the in-suite Service Line tier, where a figure carries the authority of the customer's own data.
 *
 * WHY THIS IS A RELABEL AND NOT A REMOVE, unlike the physician-coaching panel next door: leakage
 * IS derivable from a source we can actually obtain. Medicare fee-for-service claims attribute a
 * beneficiary to a primary care provider and separately record the facility that performed each
 * procedure; where those diverge inside one ZIP cluster the case left the network. That is a real
 * federal-data method with a real limitation, and the limitation is stated in the UI rather than
 * buried here: Medicare FFS is roughly a third of a typical CV panel, so the figure is a lower
 * bound scaled by assumption, not a measurement of total leakage.
 *
 * The bars below are DEMO CONSTANTS. The pipeline that would compute them from CMS public files
 * is Phase 3 work; see `docs/PATH_TO_ROBUST.md` section 10.
 */

interface ReferralLeakageProps {
  hasUploadedFiles: boolean;
}

const LEAKAGE_BARS = [
  { label: 'Cardiology', value: 68 },
  { label: 'Cardiac Surgery', value: 52 },
  { label: 'Vascular', value: 38 },
  { label: 'Electrophysiology', value: 32 },
  { label: 'Radiology', value: 22 },
];

const ReferralLeakage: React.FC<ReferralLeakageProps> = () => {
  return (
    <LockedOverlay
      title="Referral Leakage Analysis"
      bodyText="Medicare-derived estimate: roughly $3.8M of annual CV revenue appears to leave this catchment for competing systems. Connect your EHR to replace the estimate with your own referral data - by source, by physician, by ZIP."
      ctaText="Unlock Referral Intelligence →"
    >
      <SectionCard
        title="Referral Leakage Intelligence"
        subtitle="Estimated from Medicare fee-for-service claims - not your own referral data"
        headerRight={<Badge variant="estimate" label="Medicare-derived estimate" />}
      >
        <p className="text-xs text-titanium-500 mb-4">
          HOW THIS IS DERIVED, and what it cannot tell you. Medicare fee-for-service claims attribute a
          beneficiary to a primary care provider and separately record the facility that performed each
          procedure; where those diverge within one ZIP cluster, the case is counted as leaked. Medicare
          FFS is roughly a third of a typical cardiovascular panel, so commercial and Medicare Advantage
          volume is invisible here and the total is scaled by assumption. Treat this as a lower bound and
          a direction, not a measurement of your leakage.
        </p>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Leakage Rate', value: '12.4%', color: 'text-arterial-600' },
            { label: 'Lost Revenue', value: '$8.2M', color: 'text-titanium-800' },
            { label: 'Retained Referrals', value: '87.6%', color: 'text-teal-700' },
            { label: 'Top Destinations', value: '14', color: 'text-titanium-800' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center p-3 bg-chrome-50 rounded-lg">
              <div className={`font-data text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-body text-titanium-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Leakage by Department bars */}
        <div className="space-y-3">
          <div className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-400 mb-2">
            Leakage by Department
          </div>
          {LEAKAGE_BARS.map((bar, i) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="text-sm font-body text-titanium-600 w-36 flex-shrink-0">{bar.label}</span>
              <div className="flex-1 h-6 bg-chrome-100 rounded-md overflow-hidden">
                <div
                  className="h-full bg-chrome-400 rounded-md"
                  style={{ width: `${bar.value}%` }}
                />
              </div>
              <span className="text-sm font-data text-titanium-500 w-10 text-right">{bar.value}%</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </LockedOverlay>
  );
};

export default ReferralLeakage;

// AUDIT-208 provenance declaration. States where THIS surface's data comes from, so that
// "is this figure database-derived" has a mechanical answer instead of requiring someone to know.
export const PROVENANCE: Provenance = 'estimate';
