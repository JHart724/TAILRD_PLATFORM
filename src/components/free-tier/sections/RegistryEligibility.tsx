import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

interface Registry {
  name: string;
  condition: string;
  eligible: number;
  submitted: number;
  rate: number;
  trend: string;
}

const REGISTRIES: Registry[] = [
  { name: 'ACC NCDR CathPCI', condition: 'Coronary Artery Disease / PCI', eligible: 892, submitted: 714, rate: 80, trend: '+4%' },
  { name: 'ACC NCDR ICD', condition: 'Device Therapy (ICD/CRT)', eligible: 340, submitted: 251, rate: 74, trend: '+2%' },
  { name: 'STS National Database', condition: 'Cardiac Surgery (CABG/Valve)', eligible: 184, submitted: 161, rate: 88, trend: '+1%' },
  { name: 'GWTG-Heart Failure', condition: 'Heart Failure Admissions', eligible: 2104, submitted: 1682, rate: 80, trend: '+6%' },
  { name: 'GWTG-AFIB', condition: 'Atrial Fibrillation', eligible: 743, submitted: 498, rate: 67, trend: '+3%' },
];

const RegistryEligibility: React.FC = () => {
  const [expandedRegistry, setExpandedRegistry] = useState<string | null>(null);

  return (
    <SectionCard
      title="Registry Eligibility & Submission"
      subtitle="ACC/AHA quality registries · Patient-level matching locked"
    >
      <div className="space-y-3">
        {REGISTRIES.map((registry) => {
          const isExpanded = expandedRegistry === registry.name;
          const gap = registry.eligible - registry.submitted;

          return (
            <div key={registry.name}>
              <div
                className="bg-white border border-chrome-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-chrome-300 transition-all"
                onClick={() => setExpandedRegistry(prev => prev === registry.name ? null : registry.name)}
              >
                {/* Registry name + condition */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-titanium-800">{registry.name}</p>
                  <p className="text-xs text-titanium-500 mt-0.5">{registry.condition}</p>
                </div>

                {/* Submission rate bar */}
                <div className="flex items-center gap-2 w-40 flex-shrink-0">
                  <div className="flex-1 h-2 bg-chrome-100 rounded-full">
                    <div
                      className="h-full bg-chrome-500 rounded-full"
                      style={{ width: `${registry.rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-data font-semibold text-titanium-700 ml-2">
                    {registry.rate}%
                  </span>
                </div>

                {/* Trend + locked button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="bg-[#F0F5FA] text-[#2C4A60] text-xs font-data px-2 py-0.5 rounded-full">
                    {registry.trend}
                  </span>
                  <button
                    type="button"
                    className="cursor-not-allowed bg-chrome-100 text-titanium-400 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                    disabled
                  >
                    <Lock className="w-3 h-3" />
                    Match Patients →
                  </button>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="bg-chrome-50 rounded-lg p-3 mt-1 text-xs space-y-2">
                  <p className="text-titanium-600">
                    Eligible: <span className="font-data font-semibold text-titanium-700">{registry.eligible.toLocaleString()}</span> patients
                    {' · '}Submitted: <span className="font-data font-semibold text-titanium-700">{registry.submitted.toLocaleString()}</span>
                    {' · '}Gap: <span className="font-data font-semibold text-arterial-600">{gap.toLocaleString()}</span>
                  </p>
                  <p className="text-titanium-500 leading-snug">
                    Submitting the {gap.toLocaleString()} missing patients would improve your {registry.name} star rating and strengthen your accreditation status.
                  </p>
                  <div className="flex items-center gap-1.5 text-titanium-400">
                    <Lock className="w-3 h-3" />
                    <span>Patient-level matching and submission workflow: Premium</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default RegistryEligibility;
