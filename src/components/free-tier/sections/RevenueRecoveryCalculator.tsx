import React, { useState } from 'react';
import SectionCard from '../../../design-system/SectionCard';

interface Lever {
  id: string;
  name: string;
  description: string;
  current: number;
  nationalAvg: number;
  topDecile: number;
  min: number;
  max: number;
  step: number;
  direction: 'lower-better' | 'higher-better';
  dollarPerUnit: number;
  unit: string;
  label: string;
  explanation: string;
}

const LEVERS: Lever[] = [
  {
    id: 'readmission',
    name: '30-Day Readmission Rate',
    description: 'Reduction in avoidable readmissions drives both quality scores and penalty avoidance',
    current: 14.8,
    nationalAvg: 15.5,
    topDecile: 11.2,
    min: 8,
    max: 20,
    step: 0.1,
    direction: 'lower-better',
    dollarPerUnit: 340000,
    unit: '%',
    label: 'Each 1% reduction toward top decile = ~$340K',
    explanation:
      'CMS calculates readmission penalties based on excess readmission ratios under the Hospital Readmissions Reduction Program (HRRP). Each 1% reduction in your 30-day readmission rate reduces your penalty exposure and improves your Value-Based Purchasing score. The $340K figure reflects the average penalty savings plus quality bonus uplift for a CV facility of your volume.',
  },
  {
    id: 'gdmt',
    name: 'GDMT Compliance',
    description: 'Guideline-directed medical therapy adherence across eligible heart failure population',
    current: 63,
    nationalAvg: 72,
    topDecile: 84,
    min: 40,
    max: 95,
    step: 1,
    direction: 'higher-better',
    dollarPerUnit: 120000,
    unit: '%',
    label: 'Each 1% improvement = ~$120K quality bonus',
    explanation:
      'GDMT compliance is a core component of CMS Merit-based Incentive Payment System (MIPS) and several ACC/AHA registry quality measures. Improving compliance drives both direct quality bonus payments and reduces downstream costs from preventable hospitalizations. The $120K estimate is based on MIPS performance thresholds for facilities with your patient panel size.',
  },
  {
    id: 'referral',
    name: 'CV Referral Capture Rate',
    description: 'Share of cardiovascular referrals originating in catchment area retained within your system',
    current: 34,
    nationalAvg: 41,
    topDecile: 58,
    min: 20,
    max: 70,
    step: 1,
    direction: 'higher-better',
    dollarPerUnit: 420000,
    unit: '%',
    label: 'Each 1% capture increase = ~$420K revenue',
    explanation:
      'Referral leakage analysis uses CMS claims data to estimate the share of CV cases originating within your primary service area (12 ZIP codes) that are performed at competing facilities. Each recovered referral generates an average of $42K in contribution margin based on your DRG mix; 10 net additional referrals per percentage point equals ~$420K annually.',
  },
  {
    id: 'ablation',
    name: 'EP Ablation Volume',
    description: 'Electrophysiology ablation procedures per quarter; growth driven by referral and capacity expansion',
    current: 18,
    nationalAvg: 24,
    topDecile: 35,
    min: 5,
    max: 50,
    step: 1,
    direction: 'higher-better',
    dollarPerUnit: 310000,
    unit: ' cases/qtr',
    label: 'Each 1% volume growth = ~$310K revenue',
    explanation:
      'EP ablation reimbursement averages $31K per case under Medicare (DRG 273) based on CMS 2024 IPPS final rule rates. Volume growth is modeled on peer facilities that expanded EP lab capacity or referral network — each additional case per quarter annualizes to ~$124K; the $310K figure reflects a typical 2.5-case per quarter improvement from referral optimization.',
  },
];

function formatDollar(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function calcOpportunity(lever: Lever, targetVal: number): number {
  if (lever.direction === 'lower-better') {
    return (lever.current - targetVal) * lever.dollarPerUnit;
  }
  return (targetVal - lever.current) * lever.dollarPerUnit;
}

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

const SliderRow: React.FC<{
  lever: Lever;
  value: number;
  onChange: (val: number) => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ lever, value, onChange, isExpanded, onToggle }) => {
  const opportunity = calcOpportunity(lever, value);
  const isPositive = opportunity > 0;

  return (
    <div className="bg-white border border-chrome-200 rounded-xl p-4 space-y-2">
      {/* Name + description */}
      <div>
        <p className="text-sm font-semibold text-titanium-800">{lever.name}</p>
        <p className="text-xs text-titanium-400 mt-0.5 leading-snug">{lever.description}</p>
      </div>

      {/* Current / Target labels */}
      <div className="flex items-center justify-between text-xs text-titanium-500">
        <span>
          Current:{' '}
          <span className="font-semibold text-titanium-700">
            {lever.current}
            {lever.unit}
          </span>
        </span>
        <span>
          Target:{' '}
          <span className="font-semibold text-chrome-700">
            {value}
            {lever.unit}
          </span>
        </span>
      </div>

      {/* Range input */}
      <input
        type="range"
        min={lever.min}
        max={lever.max}
        step={lever.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          accentColor: '#8C1F32',
          background: `linear-gradient(to right, #8C1F32 0%, #8C1F32 ${
            ((value - lever.min) / (lever.max - lever.min)) * 100
          }%, #E5E7EB ${
            ((value - lever.min) / (lever.max - lever.min)) * 100
          }%, #E5E7EB 100%)`,
        }}
      />

      {/* Benchmarks row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-titanium-400">
          National avg:{' '}
          <span className="text-titanium-600 font-medium">
            {lever.nationalAvg}
            {lever.unit}
          </span>{' '}
          · Top decile:{' '}
          <span className="text-titanium-600 font-medium">
            {lever.topDecile}
            {lever.unit}
          </span>
        </p>
        <p
          className={`text-sm font-bold ${
            isPositive ? 'text-teal-700' : 'text-arterial-600'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatDollar(opportunity)}
        </p>
      </div>

      {/* Per-unit label */}
      <p className="text-[11px] text-titanium-400 italic">{lever.label}</p>

      {/* How is this calculated toggle */}
      <button
        type="button"
        className="text-[11px] text-chrome-500 hover:text-chrome-700 cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? '↑ Hide' : 'How is this calculated? ↓'}
      </button>

      {/* Expanded explanation */}
      {isExpanded && (
        <div className="bg-chrome-50 rounded-lg p-3 text-xs text-titanium-500 leading-relaxed">
          {lever.explanation}
        </div>
      )}
    </div>
  );
};

const LEVER_DEFAULTS: Record<string, number> = {
  readmission: 13.5,
  gdmt: 70,
  referral: 38,
  ablation: 22,
};

const RevenueRecoveryCalculator: React.FC = () => {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(LEVERS.map((l) => [l.id, LEVER_DEFAULTS[l.id] ?? l.current]))
  );
  const [expandedLever, setExpandedLever] = useState<string | null>(null);

  const totalOpportunity = LEVERS.reduce(
    (sum, lever) => sum + calcOpportunity(lever, values[lever.id]),
    0
  );

  const handleChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleToggle = (id: string) => {
    setExpandedLever(prev => prev === id ? null : id);
  };

  return (
    <SectionCard
      title="Revenue Recovery Calculator"
      subtitle="Adjust targets to see your estimated upside"
    >
      {/* Amber banner */}
      <div className="mb-5 flex items-start gap-2 bg-chrome-50 border border-titanium-300 rounded-xl px-4 py-3">
        <span className="text-gray-500 text-base mt-0.5">⚠</span>
        <p className="text-xs text-gray-500 leading-snug">
          Based on CMS national benchmarks for facilities your size —{' '}
          <span className="font-semibold">connect your EHR to verify</span> these estimates with
          your actual data.
        </p>
      </div>

      {/* Slider grid — 2 cols on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {LEVERS.map((lever) => (
          <SliderRow
            key={lever.id}
            lever={lever}
            value={values[lever.id]}
            onChange={(val) => handleChange(lever.id, val)}
            isExpanded={expandedLever === lever.id}
            onToggle={() => handleToggle(lever.id)}
          />
        ))}
      </div>

      {/* Total + CTA */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between">
        <div className="flex-1 bg-chrome-50 border border-chrome-200 rounded-xl px-5 py-4">
          <p className="text-xs text-titanium-500 font-medium uppercase tracking-wider">
            Total Estimated Opportunity
          </p>
          <p
            className={`text-3xl font-bold font-data mt-1 ${
              totalOpportunity > 0 ? 'text-teal-700' : 'text-titanium-800'
            }`}
          >
            {totalOpportunity > 0 ? '+' : ''}
            {formatDollar(totalOpportunity)}
          </p>
          <p className="text-[11px] text-titanium-400 mt-1">
            Annualised estimate · connect EHR data to verify
          </p>

          {/* This Quarter vs Full Year */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">This Quarter</div>
              <div className="text-lg font-bold text-blue-700">
                {formatDollar(Math.round(totalOpportunity * 0.35))}
              </div>
              <div className="text-xs text-blue-500">Immediate + near-term patients</div>
            </div>
            <div className="bg-titanium-50/70 border border-titanium-100 rounded-lg p-3 text-center">
              <div className="text-xs text-titanium-600 font-semibold uppercase tracking-wide">Full Year</div>
              <div className="text-lg font-bold text-titanium-700">
                {formatDollar(totalOpportunity)}
              </div>
              <div className="text-xs text-titanium-500">All identified opportunities</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex-shrink-0 px-6 py-3.5 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
          style={carmonaGradient}
        >
          Get Your Verified Estimate →
        </button>
      </div>
    </SectionCard>
  );
};

export default RevenueRecoveryCalculator;
