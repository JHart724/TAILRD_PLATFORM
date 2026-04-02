import React from 'react';
import SectionCard from '../../../design-system/SectionCard';
import LockedOverlay from '../../../design-system/LockedOverlay';

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
      bodyText="You are losing an estimated $3.8M annually to competing health systems. Connect your EHR to see which referral sources are leaking, which physicians are sending cases out, and which ZIP codes you are losing."
      ctaText="Unlock Referral Intelligence →"
    >
      <SectionCard title="Referral Leakage Intelligence" subtitle="Network Retention Analysis">
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
