import React from 'react';
import { TrendingUp, Clock, Target } from 'lucide-react';
import DemoDataBadge from '../../../components/shared/DemoDataBadge';
import {
  EP_DEMO_PIPELINE,
  EP_DEMO_AT_RISK,
  EP_DEMO_PREDICTIVE,
} from '../config/epDemoFinancials';

/**
 * Consolidated forward-outlook panel (AUDIT-304 EP convergence; mirrors the HF
 * ForwardOutlookPanel). Replaces the three overlapping EP cards (RevenuePipelineCard
 * + RevenueAtRiskCard + PredictiveMetricsBanner) whose banner repeated the other
 * two's figures. ONE panel, three sections, every dollar a stated slice of the single
 * epDemoFinancials model (sums derived in code) - demo-badged, white-card treatment.
 * EP-local: the shared components stay untouched for the other modules.
 */
const box = 'border rounded-xl p-4 bg-white border-titanium-200';

const EPForwardOutlookPanel: React.FC = () => {
  const acceleration = EP_DEMO_PREDICTIVE.projectedRevenueSystematic - EP_DEMO_PREDICTIVE.projectedRevenueCurrentRate;
  const m = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`;

  return (
    <div className="metal-card relative z-10 mb-6">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Forward Outlook</h3>
            <p className="text-sm text-titanium-600">
              12-month projection of the remaining opportunity: pipeline, deferral risk, and capture rate
            </p>
          </div>
          <DemoDataBadge />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Section 1: 12-month pipeline (remaining opportunity by quarter) */}
        <div>
          <h4 className="text-sm font-semibold text-titanium-700 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" style={{ color: '#2C4A60' }} />
            Revenue Pipeline - {m(EP_DEMO_PIPELINE.totalProjected12Month)} projected over 12 months
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {EP_DEMO_PIPELINE.quarters.map((q) => (
              <div key={q.quarter} className={box}>
                <div className="text-xs font-semibold uppercase tracking-wide text-titanium-500">{q.quarter}</div>
                <div className="text-xl font-bold" style={{ color: '#2C4A60' }}>{m(q.revenue)}</div>
                <div className="text-xs text-titanium-500 mt-0.5">{q.procedures} procedures - {q.confidence} confidence</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Revenue at risk (deferral impact; same decomposition as the P-v-R gap) */}
        <div>
          <h4 className="text-sm font-semibold text-titanium-700 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" style={{ color: '#9B2438' }} />
            Revenue at Risk - deferral impact
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B2438' }}>This Quarter</div>
              <div className="text-2xl font-bold" style={{ color: '#9B2438' }}>{m(EP_DEMO_AT_RISK.immediateRevenue)}</div>
              <div className="text-xs mt-1" style={{ color: '#9B2438' }}>
                {EP_DEMO_AT_RISK.immediatePatients} patients in immediate time horizon = the YTD projected-realized gap
              </div>
            </div>
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B6914' }}>If Deferred Past Q2</div>
              <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>+{m(EP_DEMO_AT_RISK.deferralRevenue)}</div>
              <div className="text-xs mt-1" style={{ color: '#8B6914' }}>additional moves to at-risk category</div>
            </div>
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A6880' }}>12-Month Cumulative</div>
              <div className="text-2xl font-bold" style={{ color: '#4A6880' }}>{m(EP_DEMO_AT_RISK.cumulativeRisk12Month)}</div>
              <div className="text-xs mt-1" style={{ color: '#4A6880' }}>
                ${(EP_DEMO_AT_RISK.deferralCostPerMonth / 1_000).toFixed(0)}K per month of deferral
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Capture-rate composite (current pace vs systematic closure) */}
        <div>
          <h4 className="text-sm font-semibold text-titanium-700 mb-3 flex items-center gap-1.5">
            <Target className="w-4 h-4" style={{ color: '#4A6880' }} />
            Capture Rate - current pace vs systematic closure
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A6880' }}>Current Rate Projection</div>
              <div className="text-xl font-bold" style={{ color: '#4A6880' }}>{m(EP_DEMO_PREDICTIVE.projectedRevenueCurrentRate)}</div>
              <div className="text-xs mt-1" style={{ color: '#4A6880' }}>projected 12-month revenue at current closure rate</div>
            </div>
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2C4A60' }}>Systematic Closure</div>
              <div className="text-xl font-bold" style={{ color: '#2C4A60' }}>{m(EP_DEMO_PREDICTIVE.projectedRevenueSystematic)}</div>
              <div className="text-xs mt-1" style={{ color: '#2C4A60' }}>projected with systematic gap closure</div>
            </div>
            <div className={box}>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B6914' }}>Acceleration Potential</div>
              <div className="text-xl font-bold" style={{ color: '#8B6914' }}>{m(acceleration)}</div>
              <div className="text-xs mt-1" style={{ color: '#8B6914' }}>additional revenue with systematic closure</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPForwardOutlookPanel;
