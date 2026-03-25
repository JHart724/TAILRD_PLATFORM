import React from 'react';
import { PLATFORM_TOTALS, formatDollars } from '../../../data/platformTotals';

const OpportunityBanner: React.FC = () => {
  return (
    <div className="bg-white border border-chrome-200 rounded-2xl p-6">
      <p className="text-[10px] font-semibold tracking-widest text-titanium-400 uppercase">
        Identified Opportunities
      </p>
      <p className="text-4xl font-bold font-data text-titanium-800 mt-1">
        {formatDollars(PLATFORM_TOTALS.totalOpportunity)} identified · <span className="text-emerald-600">{formatDollars(PLATFORM_TOTALS.quarterlyActionable)} actionable this quarter</span>
      </p>
    </div>
  );
};

export default OpportunityBanner;
