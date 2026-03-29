import React from 'react';
import {
  Heart,
  Users,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Activity,
  Search,
  ClipboardCheck,
  Syringe,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import CountUp from 'react-countup';
import SectionCard from '../../../design-system/SectionCard';
import Badge from '../../../design-system/Badge';
import { PopulationStat } from '../types';

interface PopulationImpactProps {
  hasUploadedFiles: boolean;
  clinicalImpact: PopulationStat[];
  populationHealth: PopulationStat[];
}

const iconMap: Record<string, React.ElementType> = {
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Activity,
  Users,
  Search,
  ClipboardCheck,
  Syringe,
};

const StatRow: React.FC<{
  stat: PopulationStat;
  hasUploadedFiles: boolean;
}> = ({ stat, hasUploadedFiles }) => {
  const IconComponent = iconMap[stat.icon] ?? Activity;
  const displayValue = hasUploadedFiles ? stat.stateBValue : stat.stateAValue;

  return (
    <div className="flex items-center gap-3 p-3 bg-chrome-50 rounded-lg">
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
        <IconComponent className="w-4 h-4 text-chrome-600" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="text-sm font-body text-titanium-600">{stat.label}</div>
        <div className="font-data text-lg font-bold text-titanium-800">
          {stat.unit === 'percent' ? (
            <CountUp
              end={displayValue}
              duration={1.5}
              decimals={1}
              suffix="%"
              preserveValue
            />
          ) : (
            <CountUp
              end={displayValue}
              duration={1.5}
              separator=","
              preserveValue
            />
          )}
        </div>
      </div>

      {/* Trend */}
      {stat.trend && (
        <div
          className={`flex items-center gap-1 ${
            stat.trend.direction === 'up'
              ? 'text-[#2C4A60]'
              : 'text-arterial-600'
          }`}
        >
          {stat.trend.direction === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span className="text-xs font-body">{stat.trend.value}</span>
        </div>
      )}
    </div>
  );
};

const PopulationImpact: React.FC<PopulationImpactProps> = ({
  hasUploadedFiles,
  clinicalImpact,
  populationHealth,
}) => {
  return (
    <SectionCard
      title="Population & Clinical Impact"
      subtitle="Estimated Community Health Outcomes"
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Clinical Impact */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-arterial-600" />
            <span className="text-base font-body font-semibold text-titanium-800">
              Clinical Impact
            </span>
          </div>
          <div className="space-y-3">
            {clinicalImpact.map((stat, index) => (
              <StatRow
                key={stat.label}
                stat={stat}
                hasUploadedFiles={hasUploadedFiles}
              />
            ))}
          </div>
        </div>

        {/* Right column: Population Health */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-chrome-600" />
            <span className="text-base font-body font-semibold text-titanium-800">
              Population Health
            </span>
          </div>
          <div className="space-y-3">
            {populationHealth.map((stat, index) => (
              <StatRow
                key={stat.label}
                stat={stat}
                hasUploadedFiles={hasUploadedFiles}
              />
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default PopulationImpact;
