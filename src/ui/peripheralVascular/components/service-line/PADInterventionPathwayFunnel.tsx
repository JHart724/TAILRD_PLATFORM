import React, { useState } from 'react';
import { Activity, Zap, Heart, AlertTriangle, CheckCircle, X, Users, Calendar, FileText, ChevronRight } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface FunnelStage {
  stage: string;
  label: string;
  patients: number;
  percentage: number;
  eligible: number;
  treated: number;
  pending: number;
  contraindicated: number;
  avgDaysToDecision: number;
  successRate: number;
  commonBarriers: string[];
}

interface InterventionCategory {
  type: 'Endovascular' | 'Surgical-Bypass' | 'Atherectomy' | 'CLI-Salvage';
  icon: React.ElementType;
  color: string;
  stages: FunnelStage[];
}

interface InterventionPatientData {
  id: string;
  name: string;
  age: number;
  abiScore: number;
  rutherfordClass: number;
  status: 'eligible' | 'pending' | 'treated' | 'contraindicated';
  lastVisit: Date;
  provider: string;
  barriers?: string[];
  nextSteps: string[];
  interventionType: string;
  stage: string;
}

const PADInterventionPathwayFunnel: React.FC = () => {
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionCategory['type']>('Endovascular');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ stage: string; metric: string } | null>(null);

  const interventionData: InterventionCategory[] = [
 {
 type: 'Endovascular',
 icon: Activity,
 color: 'medical-red',
 stages: [
 {
 stage: 'screening',
 label: 'PAD Screening',
 patients: 1567,
 percentage: 100,
 eligible: 1567,
 treated: 0,
 pending: 1567,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Asymptomatic PAD', 'Mild claudication', 'No lifestyle limitation'],
 },
 {
 stage: 'guidelines',
 label: 'Intervention Criteria',
 patients: 634,
 percentage: 40.5,
 eligible: 634,
 treated: 0,
 pending: 634,
 contraindicated: 933,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Conservative management', 'Medical therapy trial', 'Exercise therapy'],
 },
 {
 stage: 'evaluation',
 label: 'Angiographic Assess',
 patients: 478,
 percentage: 30.5,
 eligible: 478,
 treated: 0,
 pending: 423,
 contraindicated: 55,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Unfavorable anatomy', 'Chronic total occlusion', 'Poor runoff'],
 },
 {
 stage: 'decision',
 label: 'Intervention Decision',
 patients: 389,
 percentage: 24.8,
 eligible: 389,
 treated: 0,
 pending: 312,
 contraindicated: 77,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Patient preference', 'High bleeding risk', 'Contrast allergy'],
 },
 {
 stage: 'procedure',
 label: 'Endovascular Procedure',
 patients: 356,
 percentage: 22.7,
 eligible: 0,
 treated: 356,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 21,
 successRate: 89.6,
 commonBarriers: ['Access complications', 'Dissection', 'Restenosis risk'],
 },
 ],
 },
 {
 type: 'Surgical-Bypass',
 icon: Heart,
 color: 'porsche',
 stages: [
 {
 stage: 'screening',
 label: 'Complex PAD Screen',
 patients: 892,
 percentage: 100,
 eligible: 892,
 treated: 0,
 pending: 892,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Endovascular option', 'Single lesion', 'Short stenosis'],
 },
 {
 stage: 'guidelines',
 label: 'Surgical Criteria',
 patients: 234,
 percentage: 26.2,
 eligible: 234,
 treated: 0,
 pending: 234,
 contraindicated: 658,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Failed endovascular', 'Extensive disease', 'Poor surgical risk'],
 },
 {
 stage: 'evaluation',
 label: 'Surgical Evaluation',
 patients: 178,
 percentage: 20.0,
 eligible: 178,
 treated: 0,
 pending: 145,
 contraindicated: 33,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['No conduit available', 'High operative risk', 'Poor life expectancy'],
 },
 {
 stage: 'decision',
 label: 'Surgical Planning',
 patients: 134,
 percentage: 15.0,
 eligible: 134,
 treated: 0,
 pending: 98,
 contraindicated: 36,
 avgDaysToDecision: 28,
 successRate: 0,
 commonBarriers: ['Hybrid approach', 'Staged intervention', 'Patient refusal'],
 },
 {
 stage: 'procedure',
 label: 'Bypass Surgery',
 patients: 112,
 percentage: 12.6,
 eligible: 0,
 treated: 112,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 42,
 successRate: 91.1,
 commonBarriers: ['Graft occlusion', 'Wound complications', 'Infection'],
 },
 ],
 },
 {
 type: 'Atherectomy',
 icon: Zap,
 color: 'chrome-blue',
 stages: [
 {
 stage: 'screening',
 label: 'Calcified Lesion Screen',
 patients: 445,
 percentage: 100,
 eligible: 445,
 treated: 0,
 pending: 445,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Non-calcified lesion', 'Soft plaque', 'Short lesion'],
 },
 {
 stage: 'guidelines',
 label: 'Atherectomy Criteria',
 patients: 178,
 percentage: 40.0,
 eligible: 178,
 treated: 0,
 pending: 178,
 contraindicated: 267,
 avgDaysToDecision: 3,
 successRate: 0,
 commonBarriers: ['Balloon angioplasty suitable', 'Non-complex lesion', 'Small vessel'],
 },
 {
 stage: 'evaluation',
 label: 'Lesion Assessment',
 patients: 134,
 percentage: 30.1,
 eligible: 134,
 treated: 0,
 pending: 112,
 contraindicated: 22,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Vessel tortuosity', 'Thrombus present', 'Perforation risk'],
 },
 {
 stage: 'decision',
 label: 'Device Selection',
 patients: 98,
 percentage: 22.0,
 eligible: 98,
 treated: 0,
 pending: 78,
 contraindicated: 20,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Device availability', 'Operator experience', 'Cost considerations'],
 },
 {
 stage: 'procedure',
 label: 'Atherectomy Procedure',
 patients: 89,
 percentage: 20.0,
 eligible: 0,
 treated: 89,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 14,
 successRate: 87.6,
 commonBarriers: ['Distal embolization', 'Slow flow', 'Vessel spasm'],
 },
 ],
 },
 {
 type: 'CLI-Salvage',
 icon: AlertTriangle,
 color: 'crimson',
 stages: [
 {
 stage: 'screening',
 label: 'CLI Assessment',
 patients: 267,
 percentage: 100,
 eligible: 267,
 treated: 0,
 pending: 267,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Non-CLI PAD', 'Healed ulceration', 'Mild rest pain'],
 },
 {
 stage: 'guidelines',
 label: 'Salvage Criteria',
 patients: 189,
 percentage: 70.8,
 eligible: 189,
 treated: 0,
 pending: 189,
 contraindicated: 78,
 avgDaysToDecision: 2,
 successRate: 0,
 commonBarriers: ['Primary amputation', 'Unreconstructable', 'Limited life expectancy'],
 },
 {
 stage: 'evaluation',
 label: 'Revascularization Plan',
 patients: 145,
 percentage: 54.3,
 eligible: 145,
 treated: 0,
 pending: 123,
 contraindicated: 22,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['No target vessel', 'Poor wound healing potential', 'Ongoing infection'],
 },
 {
 stage: 'decision',
 label: 'Limb Salvage Plan',
 patients: 112,
 percentage: 41.9,
 eligible: 112,
 treated: 0,
 pending: 89,
 contraindicated: 23,
 avgDaysToDecision: 3,
 successRate: 0,
 commonBarriers: ['Extensive tissue loss', 'Bone exposure', 'Sepsis'],
 },
 {
 stage: 'procedure',
 label: 'Salvage Procedure',
 patients: 98,
 percentage: 36.7,
 eligible: 0,
 treated: 98,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 7,
 successRate: 78.6,
 commonBarriers: ['Failed revascularization', 'Wound breakdown', 'Reocclusion'],
 },
 ],
 },
  ];

  // Mock patient data for PAD intervention pathways
  const interventionPatients: InterventionPatientData[] = [
 // Endovascular patients
 { id: 'PAD001', name: 'Johnson, Mary', age: 67, abiScore: 0.65, rutherfordClass: 3, status: 'eligible', lastVisit: new Date('2024-10-20'), provider: 'Dr. Sarah Martinez', nextSteps: ['Angiography planning', 'Pre-procedure consent'], interventionType: 'Endovascular', stage: 'screening' },
 { id: 'PAD002', name: 'Williams, Robert', age: 72, abiScore: 0.58, rutherfordClass: 4, status: 'pending', lastVisit: new Date('2024-10-18'), provider: 'Dr. Michael Chen', barriers: ['Contrast allergy'], nextSteps: ['CO2 angiography planning'], interventionType: 'Endovascular', stage: 'guidelines' },
 { id: 'PAD003', name: 'Davis, Patricia', age: 59, abiScore: 0.72, rutherfordClass: 2, status: 'treated', lastVisit: new Date('2024-10-22'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-intervention surveillance', 'Antiplatelet therapy'], interventionType: 'Endovascular', stage: 'procedure' },
 
 // Surgical Bypass patients
 { id: 'PAD004', name: 'Brown, James', age: 65, abiScore: 0.45, rutherfordClass: 5, status: 'eligible', lastVisit: new Date('2024-10-21'), provider: 'Dr. David Rodriguez', nextSteps: ['Vascular surgery consult', 'Conduit mapping'], interventionType: 'Surgical-Bypass', stage: 'screening' },
 { id: 'PAD005', name: 'Miller, Susan', age: 68, abiScore: 0.38, rutherfordClass: 6, status: 'pending', lastVisit: new Date('2024-10-23'), provider: 'Dr. Sarah Martinez', barriers: ['No conduit available'], nextSteps: ['Alternative bypass planning'], interventionType: 'Surgical-Bypass', stage: 'evaluation' },
 
 // Atherectomy patients
 { id: 'PAD006', name: 'Garcia, Maria', age: 74, abiScore: 0.61, rutherfordClass: 3, status: 'eligible', lastVisit: new Date('2024-10-17'), provider: 'Dr. Michael Chen', nextSteps: ['Calcium scoring', 'Device selection'], interventionType: 'Atherectomy', stage: 'screening' },
 { id: 'PAD007', name: 'Taylor, John', age: 71, abiScore: 0.55, rutherfordClass: 4, status: 'treated', lastVisit: new Date('2024-10-16'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-atherectomy follow-up', 'Restenosis surveillance'], interventionType: 'Atherectomy', stage: 'procedure' },
 
 // CLI Salvage patients
 { id: 'PAD008', name: 'Anderson, William', age: 78, abiScore: 0.32, rutherfordClass: 6, status: 'eligible', lastVisit: new Date('2024-10-24'), provider: 'Dr. David Rodriguez', nextSteps: ['Wound care optimization', 'Urgent revascularization'], interventionType: 'CLI-Salvage', stage: 'screening' },
 { id: 'PAD009', name: 'Thomas, Nancy', age: 69, abiScore: 0.28, rutherfordClass: 5, status: 'pending', lastVisit: new Date('2024-10-22'), provider: 'Dr. Sarah Martinez', barriers: ['Extensive tissue loss'], nextSteps: ['Amputation consultation'], interventionType: 'CLI-Salvage', stage: 'decision' }
  ];

  const selectedInterventionData = interventionData.find(d => d.type === selectedIntervention)!;
  const selectedStageData = selectedInterventionData.stages.find(s => s.stage === selectedStage);

  const getFilteredPatients = () => {
 if (!selectedMetric) return [];
 
 return interventionPatients.filter(patient => 
 patient.interventionType === selectedIntervention && 
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
 procedure: 'medical-red',
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
 PAD Intervention Pathway Funnel
 </h2>
 <p className="text-titanium-600">
 Patient journey through peripheral vascular intervention • Click metrics for patient details
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Total Conversion Rate</div>
 <div className="text-3xl font-bold text-titanium-900 font-sf">
 {formatPercentage((selectedInterventionData.stages[4].patients / selectedInterventionData.stages[0].patients) * 100)}
 </div>
 <div className="text-sm text-titanium-600">
 {selectedInterventionData.stages[4].patients} of {selectedInterventionData.stages[0].patients} screened
 </div>
 </div>
 </div>

 {/* Intervention Type Selector */}
 <div className="flex gap-3 mb-6">
 {interventionData.map((intervention) => {
 const IconComponent = intervention.icon;
 return (
 <button
 key={intervention.type}
 onClick={() => {
 setSelectedIntervention(intervention.type);
 setSelectedStage(null);
 }}
 className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
 selectedIntervention === intervention.type
 ? `border-${intervention.color}-400 bg-${intervention.color}-50 shadow-chrome-elevated`
 : 'border-titanium-200 hover:border-titanium-300 bg-white'
 }`}
 >
 <IconComponent className={`w-5 h-5 text-${intervention.color}-600`} />
 <span className="font-semibold text-titanium-900">{intervention.type}</span>
 <div className="text-sm text-titanium-600">
 {intervention.stages[0].patients} patients
 </div>
 </button>
 );
 })}
 </div>

 {/* Funnel Visualization */}
 <div className="space-y-4 mb-6">
 {selectedInterventionData.stages.map((stage, index) => {
 const stageColor = getStageColor(stage.stage);
 const isSelected = selectedStage === stage.stage;
 const conversionRate = index > 0 
 ? (stage.patients / selectedInterventionData.stages[index - 1].patients) * 100 
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
 conversionRate >= 80 ? 'text-teal-700' :
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
 className="p-2 bg-white rounded-lg hover:bg-titanium-300 hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-teal-700 group-hover:text-teal-700">
 {stage.eligible}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Eligible</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-teal-700" />
 </button>
 <button
 onClick={() => handleMetricClick(stage.stage, 'treated')}
 className="p-2 bg-white rounded-lg hover:bg-chrome-50 hover:shadow-md transition-all cursor-pointer group"
 >
 <div className="text-lg font-bold text-porsche-600 group-hover:text-porsche-700">
 {stage.treated}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Treated</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-porsche-600" />
 </button>
 <button
 onClick={() => handleMetricClick(stage.stage, 'pending')}
 className="p-2 bg-white rounded-lg hover:bg-chrome-50 hover:shadow-md transition-all cursor-pointer group"
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
 <CheckCircle className="w-5 h-5 text-teal-700" />
 <span className="text-sm text-titanium-700">
 Success Rate: <span className="font-bold text-teal-700">
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
 {formatPercentage(((selectedInterventionData.stages[1].patients - selectedInterventionData.stages[2].patients) / selectedInterventionData.stages[1].patients) * 100)} loss rate
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Avg Time to Procedure</div>
 <div className="text-lg font-bold text-titanium-900">
 {selectedInterventionData.stages[4].avgDaysToDecision} days
 </div>
 <div className="text-sm text-titanium-600">
 From initial screening
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Success Rate</div>
 <div className="text-lg font-bold text-teal-700">
 {formatPercentage(selectedInterventionData.stages[4].successRate)}
 </div>
 <div className="text-sm text-titanium-600">
 Successful procedures
 </div>
 </div>
 </div>

 {/* PAD Patients Panel */}
 {showPatientPanel && selectedMetric && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
 <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
 {/* Panel Header */}
 <div className="sticky top-0 bg-white border-b border-titanium-200 p-6 z-10">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">
 {selectedIntervention} - {selectedMetric.stage.charAt(0).toUpperCase() + selectedMetric.stage.slice(1)}
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
 <div className="text-sm text-teal-700 font-medium">Avg ABI</div>
 <div className="text-2xl font-bold text-teal-700">
 {getFilteredPatients().length ? 
 toFixed(getFilteredPatients().reduce((sum, p) => sum + p.abiScore, 0) / getFilteredPatients().length, 2) : '0.00'
 }
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
 patient.status === 'treated' ? 'bg-titanium-300' :
 patient.status === 'eligible' ? 'bg-chrome-500' :
 patient.status === 'pending' ? 'bg-chrome-50' : 'bg-red-500'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 Age {patient.age} • ABI {toFixed(patient.abiScore, 2)} • Rutherford {patient.rutherfordClass}
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.status === 'treated' ? 'bg-green-50 text-green-600' :
 patient.status === 'eligible' ? 'bg-chrome-100 text-chrome-700' :
 patient.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-100 text-red-700'
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
 <div className="text-sm font-medium text-titanium-700 mb-2">Intervention Stage</div>
 <div className="text-sm text-titanium-600 capitalize">{patient.stage}</div>
 </div>
 </div>

 {patient.barriers && patient.barriers.length > 0 && (
 <div className="mb-4">
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3 text-gray-500" />
 Current Barriers
 </div>
 <div className="flex flex-wrap gap-2">
 {patient.barriers.map((barrier, idx) => (
 <span key={barrier} className="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded-full">
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
 No patients found for this intervention stage and status.
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 mt-6 pt-6 border-t border-titanium-200">
 <button 
 onClick={() => {
 console.log('Generating PAD intervention report:', selectedIntervention, selectedMetric);
 {}
 }}
 className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 >
 Generate PAD Report
 </button>
 <button 
 onClick={() => {
 console.log('Scheduling PAD intervention reviews:', selectedIntervention, getFilteredPatients().length);
 {}
 }}
 className="flex-1 bg-white border border-titanium-300 text-titanium-700 py-3 px-4 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
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

export default PADInterventionPathwayFunnel;