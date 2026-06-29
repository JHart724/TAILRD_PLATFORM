import React from 'react';
import { DollarSign } from 'lucide-react';
import DRGOptimizationAlert from './DRGOptimizationAlert';
import { ExecutiveViewConfig } from './BaseExecutiveView';

interface SharedDRGPerformanceProps {
  config: ExecutiveViewConfig;
}

/**
 * SharedDRGPerformance - the DRGOptimizationAlert + DRG Financial Performance + Case Mix Index block,
 * extracted verbatim from BaseExecutiveView.tsx (formerly that file's :117-192). This lets a module
 * Executive view render the DRG/CMI block ONCE, without dragging in BaseExecutiveView's full-page
 * min-h-screen wrapper or its (duplicate) 4-KPI row. The rendered markup of this block is byte-identical
 * to what BaseExecutiveView renders for it; only the page wrapper + KPI row are dropped at the call site.
 * AUDIT-302 Layer 2, PR 1 (CAD pilot). BaseExecutiveView is intentionally left intact for the other
 * modules until PR 2.
 */
const SharedDRGPerformance: React.FC<SharedDRGPerformanceProps> = ({ config }) => {
  const { drgTitle, drgDescription, drgOpportunities, drgMetrics, drgPerformanceCards } = config;

  return (
    <div className="space-y-6">
      {/* Immediate Revenue Opportunities */}
      <DRGOptimizationAlert
        opportunities={drgOpportunities}
        title="Immediate Revenue Opportunities"
        maxVisible={3}
        showPatientInfo={true}
      />

      {/* DRG Financial Performance */}
      <div className="metal-card relative z-10">
        <div className="px-6 py-4 border-b border-titanium-200 bg-white/80">
          <h3 className="text-lg font-semibold text-titanium-900 mb-2">{drgTitle}</h3>
          <p className="text-sm text-titanium-600">{drgDescription}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {drgPerformanceCards.map((card, index) => {
              // DRG 0 (MCC, highest) -> Metallic Gold; DRG 1 (CC, mid) -> Chrome Blue mid; DRG 2 (lowest) -> Carmona Red
              const drgColors = [
                { value: '#C4982A', bg: '#FAF6E8', border: '#D4B85C' },
                { value: '#4A6880', bg: '#F0F5FA', border: '#C8D4DC' },
                { value: '#9B2438', bg: '#FDF2F3', border: '#F5C0C8' },
              ];
              const dc = drgColors[index] || drgColors[0];
              return (
                <div
                  key={card.title}
                  className="rounded-xl p-4 border shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ background: `linear-gradient(to right, white, ${dc.bg})`, borderColor: dc.border }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8" style={{ color: dc.value }} />
                    <div>
                      <div className="font-semibold text-neutral-800">{card.title}</div>
                      <div className="text-2xl font-bold" style={{ color: dc.value }}>{card.value}</div>
                    </div>
                  </div>
                  <div className="text-sm text-teal-500 mb-2">{card.caseCount}</div>
                  <div className="text-sm" style={{ color: card.isPositive ? '#2C4A60' : '#9B2438' }}>{card.variance}</div>
                </div>
              );
            })}
          </div>

          {/* Case Mix Index */}
          <div className="bg-white rounded-xl p-4 border border-titanium-200 shadow-lg">
            <h4 className="font-semibold text-titanium-900 mb-4">Case Mix Index (CMI) Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                {/* Current CMI -> Chrome Blue */}
                <div className="text-2xl font-bold" style={{ color: '#2C4A60' }}>{drgMetrics.currentCMI}</div>
                <div className="text-sm text-titanium-600">Current CMI</div>
                <div className="text-xs text-teal-700">+0.28 vs target</div>
              </div>
              <div className="text-center">
                {/* Monthly Opportunity -> Metallic Gold */}
                <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>{drgMetrics.monthlyOpportunity}</div>
                <div className="text-sm text-titanium-600">Monthly Opportunity</div>
                <div className="text-xs text-titanium-500">From DRG optimization</div>
              </div>
              <div className="text-center">
                {/* Documentation Rate -> Racing Green */}
                <div className="text-2xl font-bold" style={{ color: '#2D6147' }}>{drgMetrics.documentationRate}</div>
                <div className="text-sm text-titanium-600">Documentation Rate</div>
                <div className="text-xs text-titanium-500">CC/MCC capture</div>
              </div>
              <div className="text-center">
                {/* Avg LOS -> Steel Teal */}
                <div className="text-2xl font-bold" style={{ color: '#1A6878' }}>{drgMetrics.avgLOS}</div>
                <div className="text-sm text-titanium-600">Avg LOS</div>
                <div className="text-xs text-teal-700">{drgMetrics.losBenchmark}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedDRGPerformance;
