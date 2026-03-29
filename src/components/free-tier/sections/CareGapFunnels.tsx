import React, { useState } from 'react';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { CareGapFunnel } from '../types';
import { formatNumber } from '../utils';
import { Lock } from 'lucide-react';

interface CareGapFunnelsProps {
  funnels: CareGapFunnel[];
  hasUploadedFiles: boolean;
}

const WIDTHS = ['w-full', 'w-[85%]', 'w-[70%]', 'w-[55%]'] as const;
const BG_COLORS = ['bg-chrome-100', 'bg-chrome-200', 'bg-chrome-300', 'bg-chrome-400'] as const;
const TEXT_COLORS = ['text-chrome-800', 'text-chrome-800', 'text-chrome-800', 'text-white'] as const;
const FUNNEL_VALUES = ['est. $480K quality bonus', 'est. $320K stroke prevention', 'est. $580K Star Rating uplift', 'est. $240K incentive payments'];

interface StageDetail {
  dropOffReason: string;
  intervention: string;
}

// STAGE_DETAILS[funnelIndex][stageIndex]
const STAGE_DETAILS: StageDetail[][] = [
  // Funnel 0: GDMT / Statin compliance funnel
  [
    { dropOffReason: 'All eligible patients are captured at initial screening — no drop-off at this stage.', intervention: 'Maintain active population registry to ensure new diagnoses are captured within 30 days.' },
    { dropOffReason: '10% are not screened due to missed follow-up appointments or care gaps in attribution.', intervention: 'Automated outreach to patients with no encounter in 90+ days to reschedule preventive visits.' },
    { dropOffReason: '25% who are screened are not yet prescribed due to clinical contraindications or deferred decisions.', intervention: 'Structured clinical decision support alert at next encounter to prompt prescribing or document contraindication.' },
    { dropOffReason: '37% of prescribed patients are not fully adherent due to side effects, cost, or complexity.', intervention: 'Pharmacy-led medication counseling and 30-day refill monitoring program for high-risk patients.' },
  ],
  // Funnel 1: Anticoagulation / AF funnel
  [
    { dropOffReason: 'All AF patients meeting CHA₂DS₂-VASc ≥2 criteria are identified — no drop-off at this stage.', intervention: 'Ensure AF registry is refreshed monthly from inpatient and outpatient diagnoses.' },
    { dropOffReason: '10% are not assessed due to fragmented care across inpatient and outpatient settings.', intervention: 'Unified care gap report shared with cardiology and primary care teams for co-management.' },
    { dropOffReason: '20% of assessed patients are not prescribed due to bleeding risk concerns or patient refusal.', intervention: 'Shared decision-making tool for anticoagulation benefits vs. bleeding risk using HAS-BLED scoring.' },
    { dropOffReason: '32% of prescribed patients are not at therapeutic target due to adherence or dosing issues.', intervention: 'Anticoagulation clinic monitoring with INR tracking for warfarin patients; DOAC adherence program.' },
  ],
  // Funnel 2: Hypertension / BP control funnel
  [
    { dropOffReason: 'All hypertensive patients with documented diagnosis are in the eligible cohort.', intervention: 'Cross-reference claims and EHR to ensure all hypertension diagnoses are in the active care gap registry.' },
    { dropOffReason: '10% have not been screened for BP targets at a recent encounter due to missed appointments.', intervention: 'Remote blood pressure monitoring program with digital cuff distribution for high-risk patients.' },
    { dropOffReason: '20% screened are prescribed but lack documentation of BP target in the chart.', intervention: 'Add structured BP goal field to hypertension encounters in EHR to support registry tracking.' },
    { dropOffReason: '40% are not at target BP (<130/80) due to medication adherence, lifestyle, or therapy intensity.', intervention: 'Pharmacist-led hypertension titration protocol under standing orders for eligible uncontrolled patients.' },
  ],
  // Funnel 3: Diabetes / HbA1c control funnel
  [
    { dropOffReason: 'All diagnosed T2DM patients are enrolled in the monitoring cohort — no drop-off initially.', intervention: 'Ensure diabetes registry pulls from both inpatient diagnoses and outpatient lab-based identification.' },
    { dropOffReason: '10% are not monitored regularly due to lapsed care relationships or social barriers.', intervention: 'Community health worker outreach to patients with no HbA1c test in the last 12 months.' },
    { dropOffReason: '25% monitored patients are not on guideline-recommended therapy (SGLT2i/GLP-1 for CV-risk).', intervention: 'Cardiologist-primary care collaboration protocol to initiate SGLT2 inhibitors for HF co-morbid patients.' },
    { dropOffReason: '40% are not achieving glycemic control targets (HbA1c <8% for high-risk CV patients).', intervention: 'Structured diabetes self-management education (DSME) referrals for patients with HbA1c >9%.' },
  ],
];

const CareGapFunnels: React.FC<CareGapFunnelsProps> = ({
  funnels,
  hasUploadedFiles,
}) => {
  const [expandedStage, setExpandedStage] = useState<{ funnelIndex: number; stageIndex: number } | null>(null);

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
                  const isStageExpanded =
                    expandedStage?.funnelIndex === funnelIndex &&
                    expandedStage?.stageIndex === stageIndex;
                  const stageDetail = STAGE_DETAILS[funnelIndex]?.[stageIndex];

                  return (
                    <div key={stageIndex} className="w-full flex flex-col items-center">
                      <div
                        className={`${width} ${bgColor} mx-auto rounded-md py-2.5 px-3 text-center transition-all duration-200 cursor-pointer hover:opacity-80`}
                        onClick={() =>
                          setExpandedStage(prev =>
                            prev?.funnelIndex === funnelIndex && prev?.stageIndex === stageIndex
                              ? null
                              : { funnelIndex, stageIndex }
                          )
                        }
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

                      {/* Stage expanded panel */}
                      {isStageExpanded && stageDetail && (
                        <div className="w-full bg-white border border-chrome-200 rounded-lg p-2.5 text-xs space-y-1.5 mt-1">
                          <div>
                            <span className="font-semibold text-titanium-700">Why patients drop off: </span>
                            <span className="text-titanium-500">{stageDetail.dropOffReason}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-titanium-700">Clinical intervention: </span>
                            <span className="text-titanium-500">{stageDetail.intervention}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-titanium-700">Dollar impact: </span>
                            <span className="text-[#2C4A60] font-data font-semibold">{FUNNEL_VALUES[funnelIndex]}</span>
                          </div>
                          <div className="flex items-center gap-1 text-titanium-400">
                            <Lock className="w-3 h-3" />
                            <span>Patient list: Premium only</span>
                          </div>
                        </div>
                      )}
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
              <div className="mt-2 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg px-2 py-1.5 text-center">
                <div className="text-[10px] text-[#2C4A60] font-body">Closing gap =</div>
                <div className="text-xs font-data font-bold text-[#2C4A60]">{FUNNEL_VALUES[funnelIndex]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default CareGapFunnels;
