import React, { useState } from 'react';
import { Heart, Zap, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface FunnelStage {
  stage: string;
  label: string;
  patients: number;
  percentage: number;
  eligible: number;
  implanted: number;
  pending: number;
  contraindicated: number;
  avgDaysToDecision: number;
  successRate: number;
  commonBarriers: string[];
}

interface DeviceCategory {
  type: 'CRT-D' | 'CRT-P' | 'ICD' | 'CardioMEMS';
  icon: React.ElementType;
  color: string;
  stages: FunnelStage[];
}

const DevicePathwayFunnel: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceCategory['type']>('CRT-D');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const deviceData: DeviceCategory[] = [
    {
      type: 'CRT-D',
      icon: Heart,
      color: 'medical-red',
      stages: [
        {
          stage: 'screening',
          label: 'Initial Screening',
          patients: 1247,
          percentage: 100,
          eligible: 1247,
          implanted: 0,
          pending: 1247,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['EF >35%', 'QRS <130ms', 'Life expectancy <1yr'],
        },
        {
          stage: 'guidelines',
          label: 'Guideline Criteria',
          patients: 387,
          percentage: 31.0,
          eligible: 387,
          implanted: 0,
          pending: 387,
          contraindicated: 860,
          avgDaysToDecision: 7,
          successRate: 0,
          commonBarriers: ['LBBB absent', 'Non-ambulatory', 'Recent MI'],
        },
        {
          stage: 'evaluation',
          label: 'Comprehensive Eval',
          patients: 298,
          percentage: 23.9,
          eligible: 298,
          implanted: 0,
          pending: 267,
          contraindicated: 31,
          avgDaysToDecision: 14,
          successRate: 0,
          commonBarriers: ['Frailty', 'Cognitive decline', 'Social factors'],
        },
        {
          stage: 'decision',
          label: 'Clinical Decision',
          patients: 234,
          percentage: 18.8,
          eligible: 234,
          implanted: 0,
          pending: 156,
          contraindicated: 78,
          avgDaysToDecision: 21,
          successRate: 0,
          commonBarriers: ['Patient preference', 'Surgical risk', 'Comorbidities'],
        },
        {
          stage: 'implant',
          label: 'Device Implant',
          patients: 187,
          percentage: 15.0,
          eligible: 0,
          implanted: 187,
          pending: 0,
          contraindicated: 0,
          avgDaysToDecision: 45,
          successRate: 94.7,
          commonBarriers: ['Scheduling delays', 'Insurance approval', 'Lead issues'],
        },
      ],
    },
    {
      type: 'ICD',
      icon: Zap,
      color: 'medical-blue',
      stages: [
        {
          stage: 'screening',
          label: 'Initial Screening',
          patients: 892,
          percentage: 100,
          eligible: 892,
          implanted: 0,
          pending: 892,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['EF >35%', 'Non-ischemic <3mo', 'Life expectancy <1yr'],
        },
        {
          stage: 'guidelines',
          label: 'Guideline Criteria',
          patients: 456,
          percentage: 51.1,
          eligible: 456,
          implanted: 0,
          pending: 456,
          contraindicated: 436,
          avgDaysToDecision: 5,
          successRate: 0,
          commonBarriers: ['Recent revascularization', 'Incessant VT', 'Reversible cause'],
        },
        {
          stage: 'evaluation',
          label: 'Risk Assessment',
          patients: 378,
          percentage: 42.4,
          eligible: 378,
          implanted: 0,
          pending: 334,
          contraindicated: 44,
          avgDaysToDecision: 12,
          successRate: 0,
          commonBarriers: ['High surgical risk', 'Infection', 'Bleeding risk'],
        },
        {
          stage: 'decision',
          label: 'Shared Decision',
          patients: 298,
          percentage: 33.4,
          eligible: 298,
          implanted: 0,
          pending: 223,
          contraindicated: 75,
          avgDaysToDecision: 18,
          successRate: 0,
          commonBarriers: ['Patient refusal', 'Family concerns', 'Quality of life'],
        },
        {
          stage: 'implant',
          label: 'Device Implant',
          patients: 267,
          percentage: 29.9,
          eligible: 0,
          implanted: 267,
          pending: 0,
          contraindicated: 0,
          avgDaysToDecision: 42,
          successRate: 96.2,
          commonBarriers: ['OR availability', 'Lead recall', 'Device shortage'],
        },
      ],
    },
    {
      type: 'CardioMEMS',
      icon: Activity,
      color: 'medical-green',
      stages: [
        {
          stage: 'screening',
          label: 'NYHA III Screening',
          patients: 654,
          percentage: 100,
          eligible: 654,
          implanted: 0,
          pending: 654,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['NYHA I-II', 'End-stage HF', 'Unable to anticoagulate'],
        },
        {
          stage: 'guidelines',
          label: 'Clinical Criteria',
          patients: 234,
          percentage: 35.8,
          eligible: 234,
          implanted: 0,
          pending: 234,
          contraindicated: 420,
          avgDaysToDecision: 3,
          successRate: 0,
          commonBarriers: ['Recent hospitalization', 'GFR <25', 'Pregnancy'],
        },
        {
          stage: 'evaluation',
          label: 'Catheterization',
          patients: 178,
          percentage: 27.2,
          eligible: 178,
          implanted: 0,
          pending: 156,
          contraindicated: 22,
          avgDaysToDecision: 21,
          successRate: 0,
          commonBarriers: ['PA anatomy', 'Contrast allergy', 'Bleeding risk'],
        },
        {
          stage: 'decision',
          label: 'Patient Education',
          patients: 142,
          percentage: 21.7,
          eligible: 142,
          implanted: 0,
          pending: 119,
          contraindicated: 23,
          avgDaysToDecision: 28,
          successRate: 0,
          commonBarriers: ['Technology concerns', 'Compliance issues', 'Cost concerns'],
        },
        {
          stage: 'implant',
          label: 'Sensor Implant',
          patients: 98,
          percentage: 15.0,
          eligible: 0,
          implanted: 98,
          pending: 0,
          contraindicated: 0,
          avgDaysToDecision: 56,
          successRate: 92.8,
          commonBarriers: ['Implant complications', 'Sensor migration', 'Training delays'],
        },
      ],
    },
  ];

  const selectedDeviceData = deviceData.find(d => d.type === selectedDevice)!;
  const selectedStageData = selectedDeviceData.stages.find(s => s.stage === selectedStage);

  const getStageColor = (stage: string) => {
    const colors = {
      screening: 'medical-blue',
      guidelines: 'medical-amber',
      evaluation: 'steel',
      decision: 'medical-green',
      implant: 'medical-red',
    };
    return colors[stage as keyof typeof colors] || 'steel';
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="retina-card p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Device Therapy Pathway Funnel
          </h2>
          <p className="text-steel-600">
            Patient journey through device evaluation and implantation
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Total Conversion Rate</div>
          <div className="text-3xl font-bold text-steel-900 font-sf">
            {formatPercentage((selectedDeviceData.stages[4].patients / selectedDeviceData.stages[0].patients) * 100)}
          </div>
          <div className="text-sm text-steel-600">
            {selectedDeviceData.stages[4].patients} of {selectedDeviceData.stages[0].patients} screened
          </div>
        </div>
      </div>

      {/* Device Type Selector */}
      <div className="flex gap-3 mb-6">
        {deviceData.map((device) => {
          const IconComponent = device.icon;
          return (
            <button
              key={device.type}
              onClick={() => {
                setSelectedDevice(device.type);
                setSelectedStage(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                selectedDevice === device.type
                  ? `border-${device.color}-400 bg-${device.color}-50 shadow-retina-3`
                  : 'border-steel-200 hover:border-steel-300 bg-white'
              }`}
            >
              <IconComponent className={`w-5 h-5 text-${device.color}-600`} />
              <span className="font-semibold text-steel-900">{device.type}</span>
              <div className="text-sm text-steel-600">
                {device.stages[0].patients} patients
              </div>
            </button>
          );
        })}
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4 mb-6">
        {selectedDeviceData.stages.map((stage, index) => {
          const stageColor = getStageColor(stage.stage);
          const isSelected = selectedStage === stage.stage;
          const conversionRate = index > 0 
            ? (stage.patients / selectedDeviceData.stages[index - 1].patients) * 100 
            : 100;

          return (
            <div key={stage.stage} className="relative">
              <button
                onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                  isSelected
                    ? `border-${stageColor}-400 shadow-retina-3 bg-${stageColor}-50`
                    : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2'
                }`}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-${stageColor}-100 flex items-center justify-center`}>
                      <span className={`text-sm font-bold text-${stageColor}-600`}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-steel-900">{stage.label}</div>
                      <div className="text-sm text-steel-600">
                        {stage.patients} patients ({formatPercentage(stage.percentage)})
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {index > 0 && (
                      <div className={`text-sm font-bold ${
                        conversionRate >= 80 ? 'text-medical-green-600' :
                        conversionRate >= 60 ? 'text-medical-amber-600' : 'text-medical-red-600'
                      }`}>
                        {formatPercentage(conversionRate)} conversion
                      </div>
                    )}
                    <div className="text-xs text-steel-600">
                      {stage.avgDaysToDecision} days avg
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-steel-100 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full bg-${stageColor}-500`}
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>

                {/* Stage Metrics */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-lg font-bold text-medical-green-600">
                      {stage.eligible}
                    </div>
                    <div className="text-xs text-steel-600">Eligible</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-lg font-bold text-medical-blue-600">
                      {stage.implanted}
                    </div>
                    <div className="text-xs text-steel-600">Implanted</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-lg font-bold text-medical-amber-600">
                      {stage.pending}
                    </div>
                    <div className="text-xs text-steel-600">Pending</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg">
                    <div className="text-lg font-bold text-medical-red-600">
                      {stage.contraindicated}
                    </div>
                    <div className="text-xs text-steel-600">Excluded</div>
                  </div>
                </div>
              </button>

              {/* Expanded Stage Details */}
              {isSelected && selectedStageData && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-steel-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-medical-amber-600" />
                    <h4 className="font-semibold text-steel-900">Common Barriers</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedStageData.commonBarriers.map((barrier, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-medical-amber-50 rounded-lg text-sm text-steel-800"
                      >
                        {barrier}
                      </div>
                    ))}
                  </div>
                  {selectedStageData.successRate > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-medical-green-600" />
                      <span className="text-sm text-steel-700">
                        Success Rate: <span className="font-bold text-medical-green-600">
                          {formatPercentage(selectedStageData.successRate)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-steel-200">
        <div>
          <div className="text-sm text-steel-600 mb-1">Highest Dropout</div>
          <div className="text-lg font-bold text-medical-red-600">
            Guidelines → Evaluation
          </div>
          <div className="text-sm text-steel-600">
            {formatPercentage(((selectedDeviceData.stages[1].patients - selectedDeviceData.stages[2].patients) / selectedDeviceData.stages[1].patients) * 100)} loss rate
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Avg Time to Implant</div>
          <div className="text-lg font-bold text-steel-900">
            {selectedDeviceData.stages[4].avgDaysToDecision} days
          </div>
          <div className="text-sm text-steel-600">
            From initial screening
          </div>
        </div>

        <div>
          <div className="text-sm text-steel-600 mb-1">Success Rate</div>
          <div className="text-lg font-bold text-medical-green-600">
            {formatPercentage(selectedDeviceData.stages[4].successRate)}
          </div>
          <div className="text-sm text-steel-600">
            Successful implants
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicePathwayFunnel;