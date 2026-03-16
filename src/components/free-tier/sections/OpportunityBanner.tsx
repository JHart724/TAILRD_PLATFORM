import React from 'react';

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

const OpportunityBanner: React.FC = () => {
  return (
    <div className="bg-white border border-chrome-200 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
        {/* Left side */}
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-widest text-titanium-400 uppercase">
            Identified Opportunities
          </p>
          <p className="text-4xl font-bold font-data text-titanium-800 mt-1">$11.2M</p>
          <p className="text-xs text-titanium-500 mt-1">
            across your cardiovascular service line · CMS benchmark estimate
          </p>

          {/* Micro-stats row */}
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <span className="font-data font-semibold text-titanium-700">571 patients</span>
              <p className="text-[10px] text-titanium-400 uppercase tracking-wider">identified across 6 modules</p>
            </div>
            <div>
              <span className="font-data font-semibold text-titanium-700">287 patients</span>
              <p className="text-[10px] text-titanium-400 uppercase tracking-wider">care gaps with no provider contact in 90+ days</p>
            </div>
            <div>
              <span className="font-data font-semibold text-titanium-700">$2.7M</span>
              <p className="text-[10px] text-titanium-400 uppercase tracking-wider">in procedure revenue unscheduled</p>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="sm:w-80 flex-shrink-0">
          <p className="text-sm text-titanium-600 leading-relaxed mb-4">
            Connect your EHR to see exactly which patients are behind every gap — by name, risk score, and assigned care team.
          </p>
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white w-full sm:w-auto hover:opacity-90 transition-opacity"
            style={carmonaGradient}
          >
            Connect EHR →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityBanner;
