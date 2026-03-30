import React, { useState } from 'react';
import { Heart, Zap, Activity, AlertTriangle, CheckCircle, X, Users, Calendar, FileText, ChevronRight } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

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
  type: 'ICD' | 'CRT-D' | 'Pacemaker' | 'WatchmanLAA';
  icon: React.ElementType;
  color: string;
  stages: FunnelStage[];
}

interface DevicePatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  afType: string;
  status: 'eligible' | 'pending' | 'implanted' | 'contraindicated';
  lastVisit: Date;
  provider: string;
  barriers?: string[];
  nextSteps: string[];
  deviceType: string;
  stage: string;
}

const EPDevicePathwayFunnel: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceCategory['type']>('ICD');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ stage: string; metric: string } | null>(null);

  const deviceData: DeviceCategory[] = [
 {
 type: 'ICD',
 icon: Zap,
 color: 'medical-red',
 stages: [
 {
 stage: 'screening',
 label: 'VT/VF Risk Screening',
 patients: 1894,
 percentage: 100,
 eligible: 1894,
 implanted: 0,
 pending: 1894,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['EF >35%', 'No prior VT/VF', 'Life expectancy <1yr'],
 },
 {
 stage: 'guidelines',
 label: 'Guideline Criteria',
 patients: 743,
 percentage: 39.2,
 eligible: 743,
 implanted: 0,
 pending: 743,
 contraindicated: 1151,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Recent MI <40 days', 'Reversible cause', 'Incessant VT'],
 },
 {
 stage: 'evaluation',
 label: 'EP Risk Assessment',
 patients: 594,
 percentage: 31.4,
 eligible: 594,
 implanted: 0,
 pending: 531,
 contraindicated: 63,
 avgDaysToDecision: 12,
 successRate: 0,
 commonBarriers: ['High surgical risk', 'Active infection', 'Bleeding risk'],
 },
 {
 stage: 'decision',
 label: 'Shared Decision',
 patients: 467,
 percentage: 24.7,
 eligible: 467,
 implanted: 0,
 pending: 312,
 contraindicated: 155,
 avgDaysToDecision: 18,
 successRate: 0,
 commonBarriers: ['Patient refusal', 'Quality of life concerns', 'Family opposition'],
 },
 {
 stage: 'implant',
 label: 'ICD Implantation',
 patients: 389,
 percentage: 20.5,
 eligible: 0,
 implanted: 389,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 42,
 successRate: 95.8,
 commonBarriers: ['OR scheduling', 'Device availability', 'Lead complications'],
 },
 ],
 },
 {
 type: 'CRT-D',
 icon: Heart,
 color: 'porsche',
 stages: [
 {
 stage: 'screening',
 label: 'HF + Arrhythmia Screen',
 patients: 1456,
 percentage: 100,
 eligible: 1456,
 implanted: 0,
 pending: 1456,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['EF >35%', 'QRS <120ms', 'Non-ambulatory'],
 },
 {
 stage: 'guidelines',
 label: 'CRT-D Criteria',
 patients: 467,
 percentage: 32.1,
 eligible: 467,
 implanted: 0,
 pending: 467,
 contraindicated: 989,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['No LBBB', 'AF with poor rate control', 'NYHA I-II only'],
 },
 {
 stage: 'evaluation',
 label: 'Comprehensive Eval',
 patients: 356,
 percentage: 24.4,
 eligible: 356,
 implanted: 0,
 pending: 312,
 contraindicated: 44,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Coronary anatomy', 'Prior failed CRT', 'Frailty'],
 },
 {
 stage: 'decision',
 label: 'Clinical Decision',
 patients: 289,
 percentage: 19.8,
 eligible: 289,
 implanted: 0,
 pending: 201,
 contraindicated: 88,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['Complex procedure', 'Patient preference', 'Comorbidities'],
 },
 {
 stage: 'implant',
 label: 'CRT-D Implant',
 patients: 223,
 percentage: 15.3,
 eligible: 0,
 implanted: 223,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 48,
 successRate: 92.4,
 commonBarriers: ['LV lead placement', 'High threshold', 'Phrenic stimulation'],
 },
 ],
 },
 {
 type: 'Pacemaker',
 icon: Activity,
 color: 'chrome-blue',
 stages: [
 {
 stage: 'screening',
 label: 'Bradycardia Screening',
 patients: 2123,
 percentage: 100,
 eligible: 2123,
 implanted: 0,
 pending: 2123,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Reversible causes', 'Asymptomatic', 'Medication effect'],
 },
 {
 stage: 'guidelines',
 label: 'Pacing Indications',
 patients: 892,
 percentage: 42.0,
 eligible: 892,
 implanted: 0,
 pending: 892,
 contraindicated: 1231,
 avgDaysToDecision: 3,
 successRate: 0,
 commonBarriers: ['Intermittent symptoms', 'Drug-induced', 'Sleep apnea'],
 },
 {
 stage: 'evaluation',
 label: 'EP Study Assessment',
 patients: 734,
 percentage: 34.6,
 eligible: 734,
 implanted: 0,
 pending: 645,
 contraindicated: 89,
 avgDaysToDecision: 8,
 successRate: 0,
 commonBarriers: ['AV node recovery', 'Bundle branch block', 'Autonomic causes'],
 },
 {
 stage: 'decision',
 label: 'Pacing Decision',
 patients: 612,
 percentage: 28.8,
 eligible: 612,
 implanted: 0,
 pending: 489,
 contraindicated: 123,
 avgDaysToDecision: 12,
 successRate: 0,
 commonBarriers: ['Single chamber vs dual', 'Rate responsive need', 'MRI compatibility'],
 },
 {
 stage: 'implant',
 label: 'Pacemaker Implant',
 patients: 556,
 percentage: 26.2,
 eligible: 0,
 implanted: 556,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 28,
 successRate: 97.1,
 commonBarriers: ['Lead complications', 'Pocket hematoma', 'Infection'],
 },
 ],
 },
 {
 type: 'WatchmanLAA',
 icon: Heart,
 color: 'crimson',
 stages: [
 {
 stage: 'screening',
 label: 'AF + Stroke Risk Screen',
 patients: 1678,
 percentage: 100,
 eligible: 1678,
 implanted: 0,
 pending: 1678,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Low CHA₂DS₂-VASc', 'No contraindication to OAC', 'Paroxysmal AF only'],
 },
 {
 stage: 'guidelines',
 label: 'LAA Closure Criteria',
 patients: 234,
 percentage: 13.9,
 eligible: 234,
 implanted: 0,
 pending: 234,
 contraindicated: 1444,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['OAC tolerance', 'Low bleeding risk', 'Alternative therapies'],
 },
 {
 stage: 'evaluation',
 label: 'TEE Assessment',
 patients: 178,
 percentage: 10.6,
 eligible: 178,
 implanted: 0,
 pending: 156,
 contraindicated: 22,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['LAA anatomy', 'Thrombus present', 'Septal defect'],
 },
 {
 stage: 'decision',
 label: 'Procedure Planning',
 patients: 134,
 percentage: 8.0,
 eligible: 134,
 implanted: 0,
 pending: 98,
 contraindicated: 36,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['Device sizing', 'Procedure complexity', 'Patient anxiety'],
 },
 {
 stage: 'implant',
 label: 'Watchman Implant',
 patients: 89,
 percentage: 5.3,
 eligible: 0,
 implanted: 89,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 35,
 successRate: 94.2,
 commonBarriers: ['Device embolization', 'Peri-device leak', 'Access complications'],
 },
 ],
 },
  ];

  // Mock patient data for EP device pathways
  const devicePatients: DevicePatientData[] = [
 // ICD patients
 { id: 'EP001', name: 'Johnson, Mark', age: 67, ejectionFraction: 25, afType: 'Persistent AF', status: 'eligible', lastVisit: new Date('2024-10-20'), provider: 'Dr. Sarah Chen', nextSteps: ['VT risk stratification', 'EP consult'], deviceType: 'ICD', stage: 'screening' },
 { id: 'EP002', name: 'Williams, Lisa', age: 72, ejectionFraction: 30, afType: 'Paroxysmal AF', status: 'pending', lastVisit: new Date('2024-10-18'), provider: 'Dr. Michael Rodriguez', barriers: ['Recent MI'], nextSteps: ['Wait 40 days post-MI'], deviceType: 'ICD', stage: 'guidelines' },
 { id: 'EP003', name: 'Davis, Robert', age: 59, ejectionFraction: 28, afType: 'Permanent AF', status: 'implanted', lastVisit: new Date('2024-10-22'), provider: 'Dr. Jennifer Kim', nextSteps: ['ICD clinic follow-up', 'Remote monitoring'], deviceType: 'ICD', stage: 'implant' },
 
 // CRT-D patients  
 { id: 'EP004', name: 'Brown, Patricia', age: 65, ejectionFraction: 20, afType: 'Persistent AF', status: 'eligible', lastVisit: new Date('2024-10-21'), provider: 'Dr. David Martinez', nextSteps: ['Echo optimization', 'CRT evaluation'], deviceType: 'CRT-D', stage: 'screening' },
 { id: 'EP005', name: 'Miller, James', age: 68, ejectionFraction: 25, afType: 'Paroxysmal AF', status: 'pending', lastVisit: new Date('2024-10-23'), provider: 'Dr. Sarah Chen', barriers: ['No LBBB'], nextSteps: ['EPS evaluation'], deviceType: 'CRT-D', stage: 'guidelines' },
 
 // Pacemaker patients
 { id: 'EP006', name: 'Garcia, Maria', age: 78, ejectionFraction: 55, afType: 'Bradycardia-tachy', status: 'eligible', lastVisit: new Date('2024-10-17'), provider: 'Dr. Michael Rodriguez', nextSteps: ['Holter monitoring', 'Symptom correlation'], deviceType: 'Pacemaker', stage: 'screening' },
 { id: 'EP007', name: 'Taylor, Susan', age: 71, ejectionFraction: 60, afType: 'SSS', status: 'implanted', lastVisit: new Date('2024-10-16'), provider: 'Dr. Jennifer Kim', nextSteps: ['Device clinic', 'Programming optimization'], deviceType: 'Pacemaker', stage: 'implant' },
 
 // Watchman LAA patients
 { id: 'EP008', name: 'Anderson, John', age: 74, ejectionFraction: 45, afType: 'Persistent AF', status: 'eligible', lastVisit: new Date('2024-10-24'), provider: 'Dr. David Martinez', nextSteps: ['TEE evaluation', 'Bleeding risk assessment'], deviceType: 'WatchmanLAA', stage: 'screening' },
 { id: 'EP009', name: 'Thomas, Nancy', age: 69, ejectionFraction: 50, afType: 'Permanent AF', status: 'pending', lastVisit: new Date('2024-10-22'), provider: 'Dr. Sarah Chen', barriers: ['LAA anatomy'], nextSteps: ['CT angiogram', 'Alternative device sizing'], deviceType: 'WatchmanLAA', stage: 'evaluation' }
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
 screening: 'porsche',
 guidelines: 'crimson',
 evaluation: 'titanium',
 decision: 'chrome-blue',
 implant: 'medical-red',
 };
 return colors[stage as keyof typeof colors] || 'titanium';
  };

  const formatPercentage = (value: number) => `${toFixed(value, 1)}%`;

  return (
 <div className="metal-card p-8">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 EP Device Therapy Pathway Funnel
 </h2>
 <p className="text-titanium-600">
 Patient journey through EP device evaluation and implantation • Click metrics for patient details
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Total Conversion Rate</div>
 <div className="text-3xl font-bold text-titanium-900 font-sf">
 {formatPercentage((selectedDeviceData.stages[4].patients / selectedDeviceData.stages[0].patients) * 100)}
 </div>
 <div className="text-sm text-titanium-600">
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
 ? `border-${device.color}-400 bg-${device.color}-50 shadow-chrome-elevated`
 : 'border-titanium-200 hover:border-titanium-300 bg-white'
 }`}
 >
 <IconComponent className={`w-5 h-5 text-${device.color}-600`} />
 <span className="font-semibold text-titanium-900">{device.type}</span>
 <div className="text-sm text-titanium-600">
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
 ? `border-${stageColor}-400 shadow-chrome-elevated bg-${stageColor}-50`
 : 'border-titanium-200 hover:border-titanium-300 hover:shadow-chrome-card-hover'
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
 <div className="font-semibold text-titanium-900">{stage.label}</div>
 <div className="text-sm text-titanium-600">
 {stage.patients} patients ({formatPercentage(stage.percentage)})
 </div>
 </div>
 </div>
 <div className="text-right">
 {index > 0 && (
 <div className={`text-sm font-bold ${
 conversionRate >= 80 ? 'text-[#2C4A60]' :
 conversionRate >= 60 ? 'text-crimson-600' : 'text-medical-red-600'
 }`}>
 {formatPercentage(conversionRate)} conversion
 </div>
 )}
 <div className="text-xs text-titanium-600">
 {stage.avgDaysToDecision} days avg
 </div>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="w-full bg-titanium-100 rounded-full h-3 mb-2">
 <div
 className={`h-3 rounded-full bg-${stageColor}-500`}
 style={{ width: `${stage.percentage}%` }}
 ></div>
 </div>

 {/* Stage Metrics */}
 <div className="grid grid-cols-4 gap-3 text-center">
 <button
 onClick={() => handleMetricClick(stage.stage, 'eligible')}
 className="p-2 bg-white rounded-lg hover:bg-[#C8D4DC] hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-[#2C4A60] group-hover:text-[#2C4A60]">
 {stage.eligible}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Eligible</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#2C4A60]" />
 </button>
 <button
 onClick={() => handleMetricClick(stage.stage, 'implanted')}
 className="p-2 bg-white rounded-lg hover:bg-chrome-50 hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-porsche-600 group-hover:text-porsche-700">
 {stage.implanted}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Implanted</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-porsche-600" />
 </button>
 <button
 onClick={() => handleMetricClick(stage.stage, 'pending')}
 className="p-2 bg-white rounded-lg hover:bg-[#F0F5FA] hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-crimson-600 group-hover:text-crimson-700">
 {stage.pending}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Pending</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-crimson-600" />
 </button>
 <button
 onClick={() => handleMetricClick(stage.stage, 'contraindicated')}
 className="p-2 bg-white rounded-lg hover:bg-red-50 hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-medical-red-600 group-hover:text-medical-red-700">
 {stage.contraindicated}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Excluded</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-red-600" />
 </button>
 </div>
 </button>

 {/* Expanded Stage Details */}
 {isSelected && selectedStageData && (
 <div className="mt-3 p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle className="w-5 h-5 text-crimson-600" />
 <h4 className="font-semibold text-titanium-900">Common Barriers</h4>
 </div>
 <div className="grid grid-cols-3 gap-2">
 {selectedStageData.commonBarriers.map((barrier, idx) => (
 <div
 key={barrier}
 className="p-2 bg-crimson-50 rounded-lg text-sm text-titanium-800"
 >
 {barrier}
 </div>
 ))}
 </div>
 {selectedStageData.successRate > 0 && (
 <div className="mt-3 flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-[#2C4A60]" />
 <span className="text-sm text-titanium-700">
 Success Rate: <span className="font-bold text-[#2C4A60]">
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
 <div className="grid grid-cols-3 gap-4 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-sm text-titanium-600 mb-1">Highest Dropout</div>
 <div className="text-lg font-bold text-medical-red-600">
 Guidelines → Evaluation
 </div>
 <div className="text-sm text-titanium-600">
 {formatPercentage(((selectedDeviceData.stages[1].patients - selectedDeviceData.stages[2].patients) / selectedDeviceData.stages[1].patients) * 100)} loss rate
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Avg Time to Implant</div>
 <div className="text-lg font-bold text-titanium-900">
 {selectedDeviceData.stages[4].avgDaysToDecision} days
 </div>
 <div className="text-sm text-titanium-600">
 From initial screening
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Success Rate</div>
 <div className="text-lg font-bold text-[#2C4A60]">
 {formatPercentage(selectedDeviceData.stages[4].successRate)}
 </div>
 <div className="text-sm text-titanium-600">
 Successful implants
 </div>
 </div>
 </div>

 {/* Device Patients Panel */}
 {showPatientPanel && selectedMetric && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
 <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
 {/* Panel Header */}
 <div className="sticky top-0 bg-white border-b border-titanium-200 p-6 z-10">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">
 {selectedDevice} - {selectedMetric.stage.charAt(0).toUpperCase() + selectedMetric.stage.slice(1)}
 </h3>
 <p className="text-titanium-600 mt-1">
 {selectedMetric.metric.charAt(0).toUpperCase() + selectedMetric.metric.slice(1)} patients • {getFilteredPatients().length} found
 </p>
 </div>
 <button
 onClick={closePatientPanel}
 className="p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-5 h-5 text-titanium-600" />
 </button>
 </div>
 </div>

 {/* Panel Content */}
 <div className="p-6">
 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-gradient-to-br from-chrome-50 to-chrome-100 p-4 rounded-xl">
 <div className="text-sm text-chrome-700 font-medium">Total Patients</div>
 <div className="text-2xl font-bold text-chrome-800">{getFilteredPatients().length}</div>
 </div>
 <div className="bg-gradient-to-br from-arterial-50 to-arterial-100 p-4 rounded-xl">
 <div className="text-sm text-arterial-700 font-medium">Avg Age</div>
 <div className="text-2xl font-bold text-arterial-800">
 {getFilteredPatients().length ? 
 Math.round(getFilteredPatients().reduce((sum, p) => sum + p.age, 0) / getFilteredPatients().length) : 0
 }
 </div>
 </div>
 <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
 <div className="text-sm text-[#2C4A60] font-medium">Avg EF</div>
 <div className="text-2xl font-bold text-[#2C4A60]">
 {getFilteredPatients().length ? 
 Math.round(getFilteredPatients().reduce((sum, p) => sum + p.ejectionFraction, 0) / getFilteredPatients().length) : 0
 }%
 </div>
 </div>
 </div>

 {/* Patient List */}
 <div className="space-y-4">
 <h4 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Patient Details
 </h4>
 
 {getFilteredPatients().map((patient) => (
 <div key={patient.id} className="border border-titanium-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 patient.status === 'implanted' ? 'bg-[#C8D4DC]' :
 patient.status === 'eligible' ? 'bg-chrome-500' :
 patient.status === 'pending' ? 'bg-[#F0F5FA]' : 'bg-red-500'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 Age {patient.age} • EF {patient.ejectionFraction}% • {patient.afType}
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.status === 'implanted' ? 'bg-[#C8D4DC] text-[#2C4A60]' :
 patient.status === 'eligible' ? 'bg-chrome-100 text-chrome-700' :
 patient.status === 'pending' ? 'bg-[#F0F5FA] text-[#6B7280]' : 'bg-red-100 text-red-700'
 }`}>
 {patient.status.toUpperCase()}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2">Provider</div>
 <div className="text-sm text-titanium-600">{patient.provider}</div>
 </div>
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 Last Visit
 </div>
 <div className="text-sm text-titanium-600">
 {patient.lastVisit.toLocaleDateString()}
 </div>
 </div>
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2">Device Stage</div>
 <div className="text-sm text-titanium-600 capitalize">{patient.stage}</div>
 </div>
 </div>

 {patient.barriers && patient.barriers.length > 0 && (
 <div className="mb-4">
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3 text-[#6B7280]" />
 Current Barriers
 </div>
 <div className="flex flex-wrap gap-2">
 {patient.barriers.map((barrier, idx) => (
 <span key={barrier} className="px-2 py-1 bg-[#F0F5FA] text-[#6B7280] text-xs rounded-full">
 {barrier}
 </span>
 ))}
 </div>
 </div>
 )}

 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <FileText className="w-3 h-3" />
 Next Steps
 </div>
 <div className="space-y-1">
 {patient.nextSteps.map((step, idx) => (
 <div key={step} className="text-sm text-titanium-600 flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-porsche-500 rounded-full flex-shrink-0"></div>
 {step}
 </div>
 ))}
 </div>
 </div>
 </div>
 ))}

 {getFilteredPatients().length === 0 && (
 <div className="text-center py-8 text-titanium-500">
 No patients found for this device stage and status.
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 mt-6 pt-6 border-t border-titanium-200">
 <button 
 onClick={() => {
 console.log('Generating EP device report:', selectedDevice, selectedMetric);
 {}
 }}
 className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 >
 Generate EP Report
 </button>
 <button 
 onClick={() => {
 console.log('Scheduling EP device reviews:', selectedDevice, getFilteredPatients().length);
 {}
 }}
 className="flex-1 bg-white border border-titanium-300 text-titanium-700 py-3 px-4 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
 >
 Schedule EP Reviews
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default EPDevicePathwayFunnel;