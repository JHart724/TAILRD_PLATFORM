import React from 'react';
import {
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
              ? 'text-teal-700'
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

/**
 * AUDIT-233: the left-hand `Clinical Impact` column was REMOVED with its data. It rendered Lives
 * Impacted / Complications Avoided / Mortality Reduction / Readmissions Prevented as a before-and-
 * after pair - an attributed clinical-outcome claim this platform has never measured. See the
 * removal note in `../data.ts`. What remains is the population denominator, which IS derivable.
 */
const PopulationImpact: React.FC<PopulationImpactProps> = ({
  hasUploadedFiles,
  populationHealth,
}) => {
  return (
    <SectionCard
      title="Population Health"
      subtitle="Demo dataset - counts, not outcomes"
      headerRight={
        <Badge variant={hasUploadedFiles ? 'verified' : 'estimate'} />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {populationHealth.map((stat) => (
          <StatRow
            key={stat.label}
            stat={stat}
            hasUploadedFiles={hasUploadedFiles}
          />
        ))}
      </div>
      <p className="text-xs text-titanium-500 mt-4">
        "CV Patients With Identified Gaps" is computed from the same six module gap arrays as the
        header total, so the two cannot disagree. "Population Served" is the demo catchment and is
        deliberately larger. Neither figure is a measured outcome.
      </p>
    </SectionCard>
  );
};

export default PopulationImpact;
