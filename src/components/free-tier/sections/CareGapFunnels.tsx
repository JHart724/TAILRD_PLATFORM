import React from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { CareGapFunnel } from '../types';
import { formatNumber } from '../utils';

interface CareGapFunnelsProps {
  funnels: CareGapFunnel[];
  hasUploadedFiles: boolean;
}

const WIDTHS = ['w-full', 'w-[85%]', 'w-[70%]', 'w-[55%]'] as const;
const BG_COLORS = ['bg-chrome-100', 'bg-chrome-200', 'bg-chrome-300', 'bg-chrome-400'] as const;
const TEXT_COLORS = ['text-chrome-800', 'text-chrome-800', 'text-chrome-800', 'text-white'] as const;
const FUNNEL_VALUES = ['est. $480K quality bonus', 'est. $320K stroke prevention', 'est. $580K Star Rating uplift', 'est. $240K incentive payments'];

const CareGapFunnels: React.FC<CareGapFunnelsProps> = ({
  funnels,
  hasUploadedFiles,
}) => {
  return (
    <SectionCard
      title="Care Gap Analysis"
      subtitle="HEDIS Quality Measure Compliance"
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {funnels.map((funnel, funnelIndex) => {
          const lastStage = funnel.stages[funnel.stages.length - 1];

          return (
            <div key={funnelIndex}>
              {/* Funnel Title */}
              <div className="text-sm font-body font-semibold text-titanium-700 text-center mb-3">
                {funnel.title}
              </div>

              {/* Funnel Stages */}
              <div className="flex flex-col items-center gap-1">
                {funnel.stages.map((stage, stageIndex) => {
                  const width = WIDTHS[stageIndex] ?? WIDTHS[WIDTHS.length - 1];
                  const bgColor = BG_COLORS[stageIndex] ?? BG_COLORS[BG_COLORS.length - 1];
                  const textColor = TEXT_COLORS[stageIndex] ?? TEXT_COLORS[TEXT_COLORS.length - 1];

                  return (
                    <div
                      key={stageIndex}
                      className={`${width} ${bgColor} mx-auto rounded-md py-2.5 px-3 text-center transition-all duration-200`}
                    >
                      <div className={`text-sm font-data font-bold ${textColor}`}>
                        {formatNumber(stage.value)}
                      </div>
                      <div className={`text-[10px] font-body ${textColor} opacity-80`}>
                        {stage.label}
                      </div>
                      <div className={`text-[10px] font-data font-semibold ${textColor} opacity-70`}>
                        ({stage.percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conversion Rate */}
              {lastStage && (
                <div className="text-xs font-body text-titanium-500 text-center mt-2">
                  {lastStage.percentage}% {lastStage.label.toLowerCase()}
                </div>
              )}

              {/* Dollar opportunity */}
              <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 text-center">
                <div className="text-[10px] text-emerald-600 font-body">Closing gap =</div>
                <div className="text-xs font-data font-bold text-emerald-700">{FUNNEL_VALUES[funnelIndex]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default CareGapFunnels;
