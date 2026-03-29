import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import SectionCard from '../../../design-system/SectionCard';

const carmonaGradient: React.CSSProperties = {
  background: 'linear-gradient(145deg, #8C1F32, #9B2438, #7A1A2E)',
};

interface Trial {
  id: string;
  name: string;
  condition: string;
  phase: string;
  sponsor: string;
  estimatedMatch: number;
  status: string;
}

interface TrialDetail {
  primaryEndpoint: string;
  eligibilitySummary: string;
  enrollmentWindow: string;
}

const TRIALS: Trial[] = [
  {
    id: 'NCT04153149',
    name: 'HEART-HF 2.0',
    condition: 'Heart Failure with Reduced EF',
    phase: 'Phase III',
    sponsor: 'NIH NHLBI',
    estimatedMatch: 94,
    status: 'Enrolling',
  },
  {
    id: 'NCT03022448',
    name: 'EMPEROR-Preserved',
    condition: 'HFpEF + T2DM',
    phase: 'Phase III',
    sponsor: 'Boehringer Ingelheim',
    estimatedMatch: 67,
    status: 'Enrolling',
  },
  {
    id: 'NCT04814888',
    name: 'VALOR-HCM',
    condition: 'Obstructive HCM',
    phase: 'Phase III',
    sponsor: 'Bristol-Myers Squibb',
    estimatedMatch: 31,
    status: 'Active',
  },
  {
    id: 'NCT05060341',
    name: 'ATLAS-EP',
    condition: 'Persistent Atrial Fibrillation',
    phase: 'Phase II',
    sponsor: 'Medtronic',
    estimatedMatch: 52,
    status: 'Enrolling',
  },
];

const TRIAL_DETAILS: Record<string, TrialDetail> = {
  NCT04153149: {
    primaryEndpoint: 'Composite of CV death or worsening heart failure event at 24 months',
    eligibilitySummary: 'Age ≥18, HFrEF (EF ≤40%), NYHA Class II–IV, NT-proBNP ≥600 pg/mL, on stable GDMT ≥3 months',
    enrollmentWindow: 'Open enrollment through December 2025 — 18 sites nationally',
  },
  NCT03022448: {
    primaryEndpoint: 'Time to first CV death or hospitalization for worsening HF',
    eligibilitySummary: 'HFpEF (EF ≥40%), T2DM or pre-diabetes, eGFR ≥20 mL/min/1.73m², NYHA Class II–III',
    enrollmentWindow: 'Ongoing enrollment through Q3 2025 — limited site slots available',
  },
  NCT04814888: {
    primaryEndpoint: 'Peak VO2 improvement at 30 weeks assessed by cardiopulmonary exercise testing',
    eligibilitySummary: 'Symptomatic obstructive HCM, resting LVOT gradient ≥30 mmHg, age 18–85, NYHA Class II–III',
    enrollmentWindow: 'Actively enrolling — estimated completion June 2026',
  },
  NCT05060341: {
    primaryEndpoint: 'Freedom from atrial arrhythmia recurrence at 12 months post-ablation',
    eligibilitySummary: 'Persistent AF ≥7 days, age 21–75, at least one prior antiarrhythmic drug failure, structurally normal heart',
    enrollmentWindow: 'Enrollment open through March 2026 — Phase II dose confirmation cohort',
  },
};

const ClinicalTrialEnrollment: React.FC = () => {
  const [activeLockedTrial, setActiveLockedTrial] = useState<string | null>(null);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);

  return (
    <SectionCard
      title="Clinical Trial Enrollment Opportunities"
      subtitle="Active trials matching your patient population · Patient matching requires Premium"
    >
      <div className="space-y-3">
        {TRIALS.map((trial) => {
          const isMatchLocked = activeLockedTrial === trial.id;
          const isDetailExpanded = expandedTrial === trial.id;
          const detail = TRIAL_DETAILS[trial.id];

          return (
            <div key={trial.id}>
              <div className="bg-white border border-chrome-200 rounded-xl p-4 flex items-center gap-4">
                {/* Status + phase badges */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trial.status === 'Enrolling' ? 'bg-[#F0F5FA] text-[#2C4A60]' : 'bg-chrome-100 text-chrome-700'}`}>
                    {trial.status}
                  </span>
                  <span className="bg-chrome-100 text-chrome-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {trial.phase}
                  </span>
                </div>

                {/* Trial info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-titanium-800">{trial.name}</p>
                  <p className="text-xs text-titanium-500 mt-0.5">{trial.condition}</p>
                  <p className="text-[10px] text-titanium-400 mt-0.5">{trial.sponsor}</p>
                </div>

                {/* Right side: match count + button */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-sm font-data font-bold text-titanium-700">
                    Est. {trial.estimatedMatch} patients match
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                    style={carmonaGradient}
                    onClick={() => setActiveLockedTrial(prev => prev === trial.id ? null : trial.id)}
                  >
                    Match My Patients →
                  </button>
                </div>
              </div>

              {/* Lock panel */}
              {isMatchLocked && (
                <div className="bg-chrome-50 border border-chrome-200 rounded-lg p-3 mt-2 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-titanium-400 flex-shrink-0" />
                  <p className="text-xs text-titanium-500 flex-1 leading-snug">
                    Patient-level matching requires Premium — upgrade to identify eligible patients by name, eligibility criteria, and enrollment status
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
                    style={carmonaGradient}
                  >
                    Unlock Trial Matching
                  </button>
                </div>
              )}

              {/* Details toggle */}
              <div className="mt-1.5 px-1">
                <button
                  type="button"
                  className="text-[11px] text-chrome-500 hover:text-chrome-700 cursor-pointer"
                  onClick={() => setExpandedTrial(prev => prev === trial.id ? null : trial.id)}
                >
                  {isDetailExpanded ? '↑ Hide' : 'Details ↓'}
                </button>
              </div>

              {/* Expanded detail */}
              {isDetailExpanded && detail && (
                <div className="bg-chrome-50 rounded-lg p-3 mt-1 text-xs space-y-1.5 text-titanium-500">
                  <div>
                    <span className="font-semibold text-titanium-700">Primary endpoint: </span>
                    {detail.primaryEndpoint}
                  </div>
                  <div>
                    <span className="font-semibold text-titanium-700">Eligibility: </span>
                    {detail.eligibilitySummary}
                  </div>
                  <div>
                    <span className="font-semibold text-titanium-700">Enrollment window: </span>
                    {detail.enrollmentWindow}
                  </div>
                  <div>
                    <span className="font-semibold text-titanium-700">NCT ID: </span>
                    <span className="font-data">{trial.id}</span>
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

export default ClinicalTrialEnrollment;
