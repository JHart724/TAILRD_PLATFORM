import React from 'react';
import { MapPin } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';
import LockedOverlay from '../../../design-system/LockedOverlay';
import { TrialEntry } from '../types';

interface TrialsMarketMapProps {
  hasUploadedFiles: boolean;
  trials: TrialEntry[];
}

function getStatusStyles(status: TrialEntry['status']): string {
  switch (status) {
    case 'Recruiting':
      return 'bg-chrome-50 text-teal-700';
    case 'Active':
      return 'bg-chrome-100 text-chrome-700';
    case 'Completed':
      return 'bg-titanium-100 text-titanium-600';
    default:
      return 'bg-chrome-100 text-chrome-700';
  }
}

const TrialsMarketMap: React.FC<TrialsMarketMapProps> = ({
  hasUploadedFiles,
  trials,
}) => {
  return (
    <LockedOverlay
      title="Market Intelligence"
      ctaText="Upgrade to access clinical trials and market analysis"
    >
      <SectionCard
        title="Clinical Trials & Regional Market Intelligence"
        subtitle="Active Studies & Competitive Landscape"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Active Clinical Trials */}
          <div>
            <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
              Active Clinical Trials
            </h3>
            <table className="w-full">
              <thead className="bg-chrome-50">
                <tr>
                  <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-3 py-2 text-left">
                    Trial
                  </th>
                  <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-3 py-2 text-left">
                    Phase
                  </th>
                  <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-3 py-2 text-left">
                    Sponsor
                  </th>
                  <th className="text-xs font-body font-semibold uppercase tracking-wider text-titanium-500 px-3 py-2 text-left">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {trials.map((trial, index) => (
                  <tr key={`${trial.title}-${trial.phase}`}>
                    <td className="text-xs font-body px-3 py-2.5 border-b border-chrome-100">
                      <span className="text-titanium-700 max-w-[200px] truncate block">
                        {trial.title}
                      </span>
                    </td>
                    <td className="text-xs font-body px-3 py-2.5 border-b border-chrome-100">
                      <span className="font-data text-chrome-600">
                        {trial.phase}
                      </span>
                    </td>
                    <td className="text-xs font-body px-3 py-2.5 border-b border-chrome-100">
                      <span className="text-titanium-600 max-w-[120px] truncate block">
                        {trial.sponsor}
                      </span>
                    </td>
                    <td className="text-xs font-body px-3 py-2.5 border-b border-chrome-100">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-body font-medium ${getStatusStyles(trial.status)}`}
                      >
                        {trial.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Regional Market Map */}
          <div>
            <h3 className="text-sm font-body font-semibold text-titanium-700 mb-3">
              Regional Market Map
            </h3>
            <div className="bg-chrome-50 rounded-xl border border-chrome-200 p-6 h-64 flex flex-col items-center justify-center">
              <MapPin className="w-10 h-10 text-chrome-300" />
              <p className="text-sm font-body text-titanium-500 mt-3">
                Regional Competitor Analysis
              </p>
              <p className="text-xs text-titanium-400 mt-1 text-center max-w-xs">
                Market share, referral patterns, and competitive positioning
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </LockedOverlay>
  );
};

export default TrialsMarketMap;
