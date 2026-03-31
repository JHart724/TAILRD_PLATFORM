import React, { useState } from 'react';
import { Heart, Activity, Zap, AlertTriangle, CheckCircle, X, Users, Calendar, FileText, ChevronRight } from 'lucide-react';
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
  type: 'PCI' | 'CABG' | 'TAVR' | 'Complex-PCI';
  icon: React.ElementType;
  color: string;
  stages: FunnelStage[];
}

interface InterventionPatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  syntaxScore: number;
  status: 'eligible' | 'pending' | 'treated' | 'contraindicated';
  lastVisit: Date;
  provider: string;
  barriers?: string[];
  nextSteps: string[];
  interventionType: string;
  stage: string;
}

const CADInterventionPathwayFunnel: React.FC = () => {
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionCategory['type']>('PCI');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ stage: string; metric: string } | null>(null);

  const interventionData: InterventionCategory[] = [
 {
 type: 'PCI',
 icon: Heart,
 color: 'medical-red',
 stages: [
 {
 stage: 'screening',
 label: 'CAD Screening',
 patients: 2894,
 percentage: 100,
 eligible: 2894,
 treated: 0,
 pending: 2894,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Stable CAD', 'Low risk anatomy', 'Medical management preferred'],
 },
 {
 stage: 'guidelines',
 label: 'PCI Indications',
 patients: 1456,
 percentage: 50.3,
 eligible: 1456,
 treated: 0,
 pending: 1456,
 contraindicated: 1438,
 avgDaysToDecision: 3,
 successRate: 0,
 commonBarriers: ['FFR negative', 'Non-culprit vessels', 'STEMI contraindication'],
 },
 {
 stage: 'evaluation',
 label: 'Angiographic Assess',
 patients: 1234,
 percentage: 42.6,
 eligible: 1234,
 treated: 0,
 pending: 1089,
 contraindicated: 145,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Complex anatomy', 'Calcified lesions', 'CTO unsuitable'],
 },
 {
 stage: 'decision',
 label: 'Intervention Decision',
 patients: 1089,
 percentage: 37.6,
 eligible: 1089,
 treated: 0,
 pending: 845,
 contraindicated: 244,
 avgDaysToDecision: 2,
 successRate: 0,
 commonBarriers: ['Patient refusal', 'High bleeding risk', 'Contrast allergy'],
 },
 {
 stage: 'procedure',
 label: 'PCI Procedure',
 patients: 1034,
 percentage: 35.7,
 eligible: 0,
 treated: 1034,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 7,
 successRate: 96.2,
 commonBarriers: ['No-reflow', 'Dissection', 'Access complications'],
 },
 ],
 },
 {
 type: 'CABG',
 icon: Activity,
 color: 'porsche',
 stages: [
 {
 stage: 'screening',
 label: 'Complex CAD Screen',
 patients: 1234,
 percentage: 100,
 eligible: 1234,
 treated: 0,
 pending: 1234,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Single vessel disease', 'Low SYNTAX score', 'PCI amenable'],
 },
 {
 stage: 'guidelines',
 label: 'Surgical Criteria',
 patients: 456,
 percentage: 36.9,
 eligible: 456,
 treated: 0,
 pending: 456,
 contraindicated: 778,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Incomplete revascularization', 'Low EuroSCORE', 'No diabetes'],
 },
 {
 stage: 'evaluation',
 label: 'Surgical Evaluation',
 patients: 334,
 percentage: 27.1,
 eligible: 334,
 treated: 0,
 pending: 289,
 contraindicated: 45,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Porcelain aorta', 'Frailty', 'Poor targets'],
 },
 {
 stage: 'decision',
 label: 'Heart Team Decision',
 patients: 278,
 percentage: 22.5,
 eligible: 278,
 treated: 0,
 pending: 201,
 contraindicated: 77,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['Hybrid approach', 'Staged PCI preferred', 'Patient preference'],
 },
 {
 stage: 'procedure',
 label: 'CABG Surgery',
 patients: 234,
 percentage: 19.0,
 eligible: 0,
 treated: 234,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 28,
 successRate: 94.8,
 commonBarriers: ['Graft failure', 'Bleeding', 'Atrial fibrillation'],
 },
 ],
 },
 {
 type: 'TAVR',
 icon: Zap,
 color: 'chrome-blue',
 stages: [
 {
 stage: 'screening',
 label: 'Aortic Stenosis Screen',
 patients: 892,
 percentage: 100,
 eligible: 892,
 treated: 0,
 pending: 892,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Mild/moderate AS', 'Asymptomatic', 'Young age'],
 },
 {
 stage: 'guidelines',
 label: 'TAVR Criteria',
 patients: 234,
 percentage: 26.2,
 eligible: 234,
 treated: 0,
 pending: 234,
 contraindicated: 658,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Low surgical risk', 'Bicuspid valve', 'Small annulus'],
 },
 {
 stage: 'evaluation',
 label: 'MDCT Assessment',
 patients: 189,
 percentage: 21.2,
 eligible: 189,
 treated: 0,
 pending: 156,
 contraindicated: 33,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Unfavorable anatomy', 'Severe MAC', 'Hostile access'],
 },
 {
 stage: 'decision',
 label: 'Heart Team Decision',
 patients: 145,
 percentage: 16.3,
 eligible: 145,
 treated: 0,
 pending: 112,
 contraindicated: 33,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['SAVR preferred', 'Life expectancy', 'Valve-in-valve'],
 },
 {
 stage: 'procedure',
 label: 'TAVR Procedure',
 patients: 123,
 percentage: 13.8,
 eligible: 0,
 treated: 123,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 35,
 successRate: 95.9,
 commonBarriers: ['Paravalvular leak', 'Conduction block', 'Vascular complications'],
 },
 ],
 },
 {
 type: 'Complex-PCI',
 icon: Heart,
 color: 'crimson',
 stages: [
 {
 stage: 'screening',
 label: 'Complex Lesion Screen',
 patients: 567,
 percentage: 100,
 eligible: 567,
 treated: 0,
 pending: 567,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Simple lesions', 'De novo stenosis', 'No bifurcation'],
 },
 {
 stage: 'guidelines',
 label: 'Complex PCI Criteria',
 patients: 234,
 percentage: 41.3,
 eligible: 234,
 treated: 0,
 pending: 234,
 contraindicated: 333,
 avgDaysToDecision: 3,
 successRate: 0,
 commonBarriers: ['CABG preferred', 'Low complexity', 'Restenosis risk'],
 },
 {
 stage: 'evaluation',
 label: 'Advanced Imaging',
 patients: 189,
 percentage: 33.3,
 eligible: 189,
 treated: 0,
 pending: 156,
 contraindicated: 33,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['IVUS contraindication', 'OCT limitations', 'FFR technical failure'],
 },
 {
 stage: 'decision',
 label: 'Complex PCI Plan',
 patients: 145,
 percentage: 25.6,
 eligible: 145,
 treated: 0,
 pending: 112,
 contraindicated: 33,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Two-stage approach', 'Atherectomy need', 'Covered stent requirement'],
 },
 {
 stage: 'procedure',
 label: 'Complex PCI',
 patients: 123,
 percentage: 21.7,
 eligible: 0,
 treated: 123,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 14,
 successRate: 91.9,
 commonBarriers: ['Side branch occlusion', 'Stent thrombosis', 'Perforation'],
 },
 ],
 },
  ];

  // Mock patient data for CAD intervention pathways
  const interventionPatients: InterventionPatientData[] = [
 // PCI patients
 { id: 'CAD001', name: 'Johnson, Robert', age: 67, ejectionFraction: 50, syntaxScore: 12, status: 'eligible', lastVisit: new Date('2024-10-20'), provider: 'Dr. Sarah Martinez', nextSteps: ['Angiogram review', 'PCI planning'], interventionType: 'PCI', stage: 'screening' },
 { id: 'CAD002', name: 'Williams, Lisa', age: 72, ejectionFraction: 45, syntaxScore: 18, status: 'pending', lastVisit: new Date('2024-10-18'), provider: 'Dr. Michael Chen', barriers: ['FFR negative'], nextSteps: ['Repeat functional testing'], interventionType: 'PCI', stage: 'guidelines' },
 { id: 'CAD003', name: 'Davis, Patricia', age: 59, ejectionFraction: 55, syntaxScore: 15, status: 'treated', lastVisit: new Date('2024-10-22'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-PCI follow-up', 'Dual antiplatelet therapy'], interventionType: 'PCI', stage: 'procedure' },
 
 // CABG patients
 { id: 'CAD004', name: 'Brown, James', age: 65, ejectionFraction: 35, syntaxScore: 28, status: 'eligible', lastVisit: new Date('2024-10-21'), provider: 'Dr. David Rodriguez', nextSteps: ['Heart team evaluation', 'Surgical consultation'], interventionType: 'CABG', stage: 'screening' },
 { id: 'CAD005', name: 'Miller, Susan', age: 68, ejectionFraction: 40, syntaxScore: 32, status: 'pending', lastVisit: new Date('2024-10-23'), provider: 'Dr. Sarah Martinez', barriers: ['Frailty'], nextSteps: ['Geriatric assessment'], interventionType: 'CABG', stage: 'evaluation' },
 
 // TAVR patients
 { id: 'CAD006', name: 'Garcia, Maria', age: 78, ejectionFraction: 45, syntaxScore: 0, status: 'eligible', lastVisit: new Date('2024-10-17'), provider: 'Dr. Michael Chen', nextSteps: ['MDCT planning', 'Valve sizing'], interventionType: 'TAVR', stage: 'screening' },
 { id: 'CAD007', name: 'Taylor, John', age: 85, ejectionFraction: 35, syntaxScore: 0, status: 'treated', lastVisit: new Date('2024-10-16'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-TAVR echo', 'Valve clinic'], interventionType: 'TAVR', stage: 'procedure' },
 
 // Complex PCI patients
 { id: 'CAD008', name: 'Anderson, William', age: 71, ejectionFraction: 40, syntaxScore: 22, status: 'eligible', lastVisit: new Date('2024-10-24'), provider: 'Dr. David Rodriguez', nextSteps: ['IVUS planning', 'Complex PCI consent'], interventionType: 'Complex-PCI', stage: 'screening' },
 { id: 'CAD009', name: 'Thomas, Nancy', age: 69, ejectionFraction: 50, syntaxScore: 24, status: 'pending', lastVisit: new Date('2024-10-22'), provider: 'Dr. Sarah Martinez', barriers: ['Two-stage approach'], nextSteps: ['First stage PCI planning'], interventionType: 'Complex-PCI', stage: 'decision' }
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
 CAD Intervention Pathway Funnel
 </h2>
 <p className="text-titanium-600">
 Patient journey through coronary intervention evaluation • Click metrics for patient details
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
 {selectedStageData.commonBarriers.map((barrier) => (
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
 <div className="text-lg font-bold text-[#2C4A60]">
 {formatPercentage(selectedInterventionData.stages[4].successRate)}
 </div>
 <div className="text-sm text-titanium-600">
 Successful procedures
 </div>
 </div>
 </div>

 {/* Intervention Patients Panel */}
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
 <div className="text-sm text-[#2C4A60] font-medium">Avg SYNTAX</div>
 <div className="text-2xl font-bold text-[#2C4A60]">
 {getFilteredPatients().length ? 
 Math.round(getFilteredPatients().reduce((sum, p) => sum + p.syntaxScore, 0) / getFilteredPatients().length) : 0
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
 patient.status === 'treated' ? 'bg-[#C8D4DC]' :
 patient.status === 'eligible' ? 'bg-chrome-500' :
 patient.status === 'pending' ? 'bg-[#F0F5FA]' : 'bg-red-500'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 Age {patient.age} • EF {patient.ejectionFraction}% • SYNTAX {patient.syntaxScore}
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.status === 'treated' ? 'bg-[#F0F7F4] text-[#2D6147]' :
 patient.status === 'eligible' ? 'bg-chrome-100 text-chrome-700' :
 patient.status === 'pending' ? 'bg-[#FAF6E8] text-[#8B6914]' : 'bg-red-100 text-red-700'
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
 <AlertTriangle className="w-3 h-3 text-[#6B7280]" />
 Current Barriers
 </div>
 <div className="flex flex-wrap gap-2">
 {patient.barriers.map((barrier) => (
 <span key={barrier} className="px-2 py-1 bg-[#FAF6E8] text-[#8B6914] text-xs rounded-full">
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
 {patient.nextSteps.map((step) => (
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
 // TODO: Generate CAD intervention report
 }}
 className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 >
 Generate CAD Report
 </button>
 <button 
 onClick={() => {
 // TODO: Schedule CAD intervention reviews
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

export default CADInterventionPathwayFunnel;