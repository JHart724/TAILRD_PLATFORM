import React, { useState } from 'react';
import { Heart, Zap, Activity, AlertTriangle, CheckCircle, X, Users, Calendar, FileText, ChevronRight } from 'lucide-react';

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

interface DevicePatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  qrsDuration: number;
  status: 'eligible' | 'pending' | 'implanted' | 'contraindicated';
  lastVisit: Date;
  provider: string;
  barriers?: string[];
  nextSteps: string[];
  deviceType: string;
  stage: string;
}

const DevicePathwayFunnel: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceCategory['type']>('CRT-D');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ stage: string; metric: string } | null>(null);

  const deviceData: DeviceCategory[] = [
    {
      type: 'CRT-D',
      icon: Heart,
      color: 'medical-red',
      stages: [
        {
          stage: 'screening',
          label: 'Initial Screening',
          patients: 2494,
          percentage: 100,
          eligible: 2494,
          implanted: 0,
          pending: 2494,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['EF >35%', 'QRS <130ms', 'Life expectancy <1yr'],
        },
        {
          stage: 'guidelines',
          label: 'Guideline Criteria',
          patients: 774,
          percentage: 31.0,
          eligible: 774,
          implanted: 0,
          pending: 774,
          contraindicated: 1720,
          avgDaysToDecision: 7,
          successRate: 0,
          commonBarriers: ['LBBB absent', 'Non-ambulatory', 'Recent MI'],
        },
        {
          stage: 'evaluation',
          label: 'Comprehensive Eval',
          patients: 596,
          percentage: 23.9,
          eligible: 596,
          implanted: 0,
          pending: 534,
          contraindicated: 62,
          avgDaysToDecision: 14,
          successRate: 0,
          commonBarriers: ['Frailty', 'Cognitive decline', 'Social factors'],
        },
        {
          stage: 'decision',
          label: 'Clinical Decision',
          patients: 468,
          percentage: 18.8,
          eligible: 468,
          implanted: 0,
          pending: 312,
          contraindicated: 156,
          avgDaysToDecision: 21,
          successRate: 0,
          commonBarriers: ['Patient preference', 'Surgical risk', 'Comorbidities'],
        },
        {
          stage: 'implant',
          label: 'Device Implant',
          patients: 374,
          percentage: 15.0,
          eligible: 0,
          implanted: 374,
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
          patients: 1784,
          percentage: 100,
          eligible: 1784,
          implanted: 0,
          pending: 1784,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['EF >35%', 'Non-ischemic <3mo', 'Life expectancy <1yr'],
        },
        {
          stage: 'guidelines',
          label: 'Guideline Criteria',
          patients: 912,
          percentage: 51.1,
          eligible: 912,
          implanted: 0,
          pending: 912,
          contraindicated: 872,
          avgDaysToDecision: 5,
          successRate: 0,
          commonBarriers: ['Recent revascularization', 'Incessant VT', 'Reversible cause'],
        },
        {
          stage: 'evaluation',
          label: 'Risk Assessment',
          patients: 756,
          percentage: 42.4,
          eligible: 756,
          implanted: 0,
          pending: 668,
          contraindicated: 88,
          avgDaysToDecision: 12,
          successRate: 0,
          commonBarriers: ['High surgical risk', 'Infection', 'Bleeding risk'],
        },
        {
          stage: 'decision',
          label: 'Shared Decision',
          patients: 596,
          percentage: 33.4,
          eligible: 596,
          implanted: 0,
          pending: 446,
          contraindicated: 150,
          avgDaysToDecision: 18,
          successRate: 0,
          commonBarriers: ['Patient refusal', 'Family concerns', 'Quality of life'],
        },
        {
          stage: 'implant',
          label: 'Device Implant',
          patients: 534,
          percentage: 29.9,
          eligible: 0,
          implanted: 534,
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
          patients: 1308,
          percentage: 100,
          eligible: 1308,
          implanted: 0,
          pending: 1308,
          contraindicated: 0,
          avgDaysToDecision: 0,
          successRate: 0,
          commonBarriers: ['NYHA I-II', 'End-stage HF', 'Unable to anticoagulate'],
        },
        {
          stage: 'guidelines',
          label: 'Clinical Criteria',
          patients: 468,
          percentage: 35.8,
          eligible: 468,
          implanted: 0,
          pending: 468,
          contraindicated: 840,
          avgDaysToDecision: 3,
          successRate: 0,
          commonBarriers: ['Recent hospitalization', 'GFR <25', 'Pregnancy'],
        },
        {
          stage: 'evaluation',
          label: 'Catheterization',
          patients: 356,
          percentage: 27.2,
          eligible: 356,
          implanted: 0,
          pending: 312,
          contraindicated: 44,
          avgDaysToDecision: 21,
          successRate: 0,
          commonBarriers: ['PA anatomy', 'Contrast allergy', 'Bleeding risk'],
        },
        {
          stage: 'decision',
          label: 'Patient Education',
          patients: 284,
          percentage: 21.7,
          eligible: 284,
          implanted: 0,
          pending: 238,
          contraindicated: 46,
          avgDaysToDecision: 28,
          successRate: 0,
          commonBarriers: ['Technology concerns', 'Compliance issues', 'Cost concerns'],
        },
        {
          stage: 'implant',
          label: 'Sensor Implant',
          patients: 196,
          percentage: 15.0,
          eligible: 0,
          implanted: 196,
          pending: 0,
          contraindicated: 0,
          avgDaysToDecision: 56,
          successRate: 92.8,
          commonBarriers: ['Implant complications', 'Sensor migration', 'Training delays'],
        },
      ],
    },
  ];

  // Mock patient data for device pathways
  const devicePatients: DevicePatientData[] = [
    // CRT-D patients
    { id: 'D001', name: 'Johnson, Mary', age: 67, ejectionFraction: 25, qrsDuration: 150, status: 'eligible', lastVisit: new Date('2024-10-20'), provider: 'Dr. Sarah Williams', nextSteps: ['Complete echo', 'EP consult'], deviceType: 'CRT-D', stage: 'screening' },
    { id: 'D002', name: 'Chen, Robert', age: 72, ejectionFraction: 30, qrsDuration: 145, status: 'pending', lastVisit: new Date('2024-10-18'), provider: 'Dr. Michael Chen', barriers: ['LBBB absent'], nextSteps: ['Electrophysiology evaluation'], deviceType: 'CRT-D', stage: 'guidelines' },
    { id: 'D003', name: 'Davis, Patricia', age: 59, ejectionFraction: 28, qrsDuration: 155, status: 'implanted', lastVisit: new Date('2024-10-22'), provider: 'Dr. Jennifer Martinez', nextSteps: ['Post-implant follow-up', 'Device optimization'], deviceType: 'CRT-D', stage: 'implant' },
    { id: 'D004', name: 'Wilson, James', age: 70, ejectionFraction: 32, qrsDuration: 140, status: 'contraindicated', lastVisit: new Date('2024-10-19'), provider: 'Dr. Robert Thompson', barriers: ['Life expectancy <1yr'], nextSteps: ['Palliative care consultation'], deviceType: 'CRT-D', stage: 'evaluation' },
    
    // ICD patients
    { id: 'D005', name: 'Brown, Linda', age: 65, ejectionFraction: 30, qrsDuration: 110, status: 'eligible', lastVisit: new Date('2024-10-21'), provider: 'Dr. Lisa Park', nextSteps: ['Risk stratification', 'Shared decision making'], deviceType: 'ICD', stage: 'screening' },
    { id: 'D006', name: 'Miller, David', age: 68, ejectionFraction: 25, qrsDuration: 95, status: 'pending', lastVisit: new Date('2024-10-23'), provider: 'Dr. Sarah Williams', barriers: ['Recent MI'], nextSteps: ['Wait 3 months post-MI'], deviceType: 'ICD', stage: 'guidelines' },
    { id: 'D007', name: 'Garcia, Maria', age: 63, ejectionFraction: 28, qrsDuration: 100, status: 'implanted', lastVisit: new Date('2024-10-17'), provider: 'Dr. Michael Chen', nextSteps: ['ICD clinic follow-up'], deviceType: 'ICD', stage: 'implant' },
    
    // CardioMEMS patients
    { id: 'D008', name: 'Taylor, John', age: 71, ejectionFraction: 35, qrsDuration: 120, status: 'eligible', lastVisit: new Date('2024-10-16'), provider: 'Dr. Jennifer Martinez', nextSteps: ['NYHA assessment', 'Patient education'], deviceType: 'CardioMEMS', stage: 'screening' },
    { id: 'D009', name: 'Anderson, Susan', age: 66, ejectionFraction: 40, qrsDuration: 105, status: 'pending', lastVisit: new Date('2024-10-24'), provider: 'Dr. Robert Thompson', barriers: ['Technology concerns'], nextSteps: ['Patient counseling session'], deviceType: 'CardioMEMS', stage: 'decision' },
    { id: 'D010', name: 'Thomas, Michael', age: 69, ejectionFraction: 32, qrsDuration: 115, status: 'implanted', lastVisit: new Date('2024-10-22'), provider: 'Dr. Lisa Park', nextSteps: ['Monitor daily readings', 'Titrate medications'], deviceType: 'CardioMEMS', stage: 'implant' }
  ];

  const selectedDeviceData = deviceData.find(d => d.type === selectedDevice)!;
  const selectedStageData = selectedDeviceData.stages.find(s => s.stage === selectedStage);

  const getFilteredPatients = () => {
    if (!selectedMetric) return [];
    
    return devicePatients.filter(patient => 
      patient.deviceType === selectedDevice && 
      patient.stage === selectedMetric.stage &&
      (selectedMetric.metric === 'all' || patient.status === selectedMetric.metric)
    );
  };

  const handleMetricClick = (stage: string, metric: string) => {
    setSelectedMetric({ stage, metric });
    setShowPatientPanel(true);
  };

  const closePatientPanel = () => {
    setShowPatientPanel(false);
    setSelectedMetric(null);
  };

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
            Patient journey through device evaluation and implantation • Click metrics for patient details
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
                  <button
                    onClick={() => handleMetricClick(stage.stage, 'eligible')}
                    className="p-2 bg-white rounded-lg hover:bg-green-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="text-lg font-bold text-medical-green-600 group-hover:text-medical-green-700">
                      {stage.eligible}
                    </div>
                    <div className="text-xs text-steel-600 group-hover:text-steel-700">Eligible</div>
                    <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-green-600" />
                  </button>
                  <button
                    onClick={() => handleMetricClick(stage.stage, 'implanted')}
                    className="p-2 bg-white rounded-lg hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="text-lg font-bold text-medical-blue-600 group-hover:text-medical-blue-700">
                      {stage.implanted}
                    </div>
                    <div className="text-xs text-steel-600 group-hover:text-steel-700">Implanted</div>
                    <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-blue-600" />
                  </button>
                  <button
                    onClick={() => handleMetricClick(stage.stage, 'pending')}
                    className="p-2 bg-white rounded-lg hover:bg-amber-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="text-lg font-bold text-medical-amber-600 group-hover:text-medical-amber-700">
                      {stage.pending}
                    </div>
                    <div className="text-xs text-steel-600 group-hover:text-steel-700">Pending</div>
                    <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-amber-600" />
                  </button>
                  <button
                    onClick={() => handleMetricClick(stage.stage, 'contraindicated')}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="text-lg font-bold text-medical-red-600 group-hover:text-medical-red-700">
                      {stage.contraindicated}
                    </div>
                    <div className="text-xs text-steel-600 group-hover:text-steel-700">Excluded</div>
                    <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-red-600" />
                  </button>
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

      {/* Device Patients Panel */}
      {showPatientPanel && selectedMetric && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-steel-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-steel-900">
                    {selectedDevice} - {selectedMetric.stage.charAt(0).toUpperCase() + selectedMetric.stage.slice(1)}
                  </h3>
                  <p className="text-steel-600 mt-1">
                    {selectedMetric.metric.charAt(0).toUpperCase() + selectedMetric.metric.slice(1)} patients \u2022 {getFilteredPatients().length} found
                  </p>
                </div>
                <button
                  onClick={closePatientPanel}
                  className="p-2 rounded-lg hover:bg-steel-100 transition-colors"
                >
                  <X className="w-5 h-5 text-steel-600" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="text-sm text-blue-700 font-medium">Total Patients</div>
                  <div className="text-2xl font-bold text-blue-800">{getFilteredPatients().length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="text-sm text-purple-700 font-medium">Avg Age</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {getFilteredPatients().length ? 
                      Math.round(getFilteredPatients().reduce((sum, p) => sum + p.age, 0) / getFilteredPatients().length) : 0
                    }
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="text-sm text-green-700 font-medium">Avg EF</div>
                  <div className="text-2xl font-bold text-green-800">
                    {getFilteredPatients().length ? 
                      Math.round(getFilteredPatients().reduce((sum, p) => sum + p.ejectionFraction, 0) / getFilteredPatients().length) : 0
                    }%
                  </div>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Details
                </h4>
                
                {getFilteredPatients().map((patient) => (
                  <div key={patient.id} className="border border-steel-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          patient.status === 'implanted' ? 'bg-green-500' :
                          patient.status === 'eligible' ? 'bg-blue-500' :
                          patient.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-steel-900">{patient.name}</div>
                          <div className="text-sm text-steel-600">
                            Age {patient.age} \u2022 EF {patient.ejectionFraction}% \u2022 QRS {patient.qrsDuration}ms
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'implanted' ? 'bg-green-100 text-green-700' :
                        patient.status === 'eligible' ? 'bg-blue-100 text-blue-700' :
                        patient.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {patient.status.toUpperCase()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2">Provider</div>
                        <div className="text-sm text-steel-600">{patient.provider}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last Visit
                        </div>
                        <div className="text-sm text-steel-600">
                          {patient.lastVisit.toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2">Device Stage</div>
                        <div className="text-sm text-steel-600 capitalize">{patient.stage}</div>
                      </div>
                    </div>

                    {patient.barriers && patient.barriers.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Current Barriers
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {patient.barriers.map((barrier, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              {barrier}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Next Steps
                      </div>
                      <div className="space-y-1">
                        {patient.nextSteps.map((step, idx) => (
                          <div key={idx} className="text-sm text-steel-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-medical-blue-500 rounded-full flex-shrink-0"></div>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {getFilteredPatients().length === 0 && (
                  <div className="text-center py-8 text-steel-500">
                    No patients found for this device stage and status.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-steel-200">
                <button 
                  onClick={() => {
                    console.log('Generating patient report for device pathway funnel:', selectedDevice, selectedMetric);
                    alert('Patient Report Generation\n\nThis would generate a comprehensive report for ' + getFilteredPatients().length + ' patients in the ' + selectedDevice + ' pathway at the ' + selectedMetric?.stage + ' stage.\n\n• Patient demographics and clinical data\n• Device eligibility criteria assessment\n• Pathway progression analysis\n• Barrier identification and recommendations\n\nTODO: Implement report generation with PDF export');
                  }}
                  className="flex-1 bg-medical-blue-500 text-white py-3 px-4 rounded-lg hover:bg-medical-blue-600 transition-colors font-medium"
                >
                  Generate Patient Report
                </button>
                <button 
                  onClick={() => {
                    console.log('Scheduling reviews for device pathway patients:', selectedDevice, getFilteredPatients().length);
                    alert('Schedule Patient Reviews\n\nThis would schedule follow-up reviews for ' + getFilteredPatients().length + ' patients in the ' + selectedDevice + ' pathway.\n\n• Automated appointment scheduling\n• Provider calendar integration\n• Patient notification system\n• Care team coordination\n\nTODO: Integrate with scheduling system and EHR workflow');
                  }}
                  className="flex-1 bg-white border border-steel-300 text-steel-700 py-3 px-4 rounded-lg hover:bg-steel-50 transition-colors font-medium"
                >
                  Schedule Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicePathwayFunnel;