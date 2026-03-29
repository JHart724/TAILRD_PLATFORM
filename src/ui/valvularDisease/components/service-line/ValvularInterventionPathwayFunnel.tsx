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
  type: 'Aortic-Valve' | 'Mitral-Valve' | 'Tricuspid-Valve' | 'Multi-Valve';
  icon: React.ElementType;
  color: string;
  stages: FunnelStage[];
}

interface InterventionPatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  gradientPeak: number;
  status: 'eligible' | 'pending' | 'treated' | 'contraindicated';
  lastVisit: Date;
  provider: string;
  barriers?: string[];
  nextSteps: string[];
  interventionType: string;
  stage: string;
}

const ValvularInterventionPathwayFunnel: React.FC = () => {
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionCategory['type']>('Aortic-Valve');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{ stage: string; metric: string } | null>(null);

  const interventionData: InterventionCategory[] = [
 {
 type: 'Aortic-Valve',
 icon: Heart,
 color: 'medical-red',
 stages: [
 {
 stage: 'screening',
 label: 'Aortic Stenosis Screen',
 patients: 1456,
 percentage: 100,
 eligible: 1456,
 treated: 0,
 pending: 1456,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Mild/moderate AS', 'Asymptomatic', 'Low gradient'],
 },
 {
 stage: 'guidelines',
 label: 'Intervention Criteria',
 patients: 542,
 percentage: 37.2,
 eligible: 542,
 treated: 0,
 pending: 542,
 contraindicated: 914,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Asymptomatic severe AS', 'Preserved LVEF', 'Low flow-low gradient'],
 },
 {
 stage: 'evaluation',
 label: 'Valve Assessment',
 patients: 398,
 percentage: 27.3,
 eligible: 398,
 treated: 0,
 pending: 334,
 contraindicated: 64,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Bicuspid valve', 'Small annulus', 'Porcelain aorta'],
 },
 {
 stage: 'decision',
 label: 'Heart Team Decision',
 patients: 289,
 percentage: 19.8,
 eligible: 289,
 treated: 0,
 pending: 234,
 contraindicated: 55,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['TAVR vs SAVR', 'Valve choice', 'Surgical risk'],
 },
 {
 stage: 'procedure',
 label: 'Valve Intervention',
 patients: 245,
 percentage: 16.8,
 eligible: 0,
 treated: 245,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 35,
 successRate: 95.1,
 commonBarriers: ['Paravalvular leak', 'Conduction block', 'Bleeding'],
 },
 ],
 },
 {
 type: 'Mitral-Valve',
 icon: Activity,
 color: 'porsche',
 stages: [
 {
 stage: 'screening',
 label: 'Mitral Disease Screen',
 patients: 1234,
 percentage: 100,
 eligible: 1234,
 treated: 0,
 pending: 1234,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Mild/moderate MR', 'Primary vs secondary', 'Functional assessment'],
 },
 {
 stage: 'guidelines',
 label: 'MV Intervention Criteria',
 patients: 345,
 percentage: 28.0,
 eligible: 345,
 treated: 0,
 pending: 345,
 contraindicated: 889,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Asymptomatic primary MR', 'Preserved LVEF', 'Functional MR optimization'],
 },
 {
 stage: 'evaluation',
 label: 'TEE Assessment',
 patients: 234,
 percentage: 19.0,
 eligible: 234,
 treated: 0,
 pending: 198,
 contraindicated: 36,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Anatomy unsuitable', 'Cleft leaflet', 'Prior intervention'],
 },
 {
 stage: 'decision',
 label: 'Repair vs Replace',
 patients: 178,
 percentage: 14.4,
 eligible: 178,
 treated: 0,
 pending: 134,
 contraindicated: 44,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['Repair feasibility', 'Rheumatic disease', 'Calcification'],
 },
 {
 stage: 'procedure',
 label: 'MV Intervention',
 patients: 145,
 percentage: 11.7,
 eligible: 0,
 treated: 145,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 28,
 successRate: 92.4,
 commonBarriers: ['Systolic anterior motion', 'Residual MR', 'Leaflet tear'],
 },
 ],
 },
 {
 type: 'Tricuspid-Valve',
 icon: Zap,
 color: 'medical-green',
 stages: [
 {
 stage: 'screening',
 label: 'Tricuspid Disease Screen',
 patients: 678,
 percentage: 100,
 eligible: 678,
 treated: 0,
 pending: 678,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Mild/moderate TR', 'Secondary TR', 'RV function assessment'],
 },
 {
 stage: 'guidelines',
 label: 'TV Intervention Criteria',
 patients: 156,
 percentage: 23.0,
 eligible: 156,
 treated: 0,
 pending: 156,
 contraindicated: 522,
 avgDaysToDecision: 5,
 successRate: 0,
 commonBarriers: ['Asymptomatic TR', 'Pulmonary hypertension', 'RV dysfunction'],
 },
 {
 stage: 'evaluation',
 label: 'RV Function Assess',
 patients: 123,
 percentage: 18.1,
 eligible: 123,
 treated: 0,
 pending: 98,
 contraindicated: 25,
 avgDaysToDecision: 14,
 successRate: 0,
 commonBarriers: ['Severe RV dysfunction', 'Irreversible PHT', 'Multiple valves'],
 },
 {
 stage: 'decision',
 label: 'Intervention Planning',
 patients: 89,
 percentage: 13.1,
 eligible: 89,
 treated: 0,
 pending: 67,
 contraindicated: 22,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['TriClip vs surgery', 'Concomitant procedure', 'High risk'],
 },
 {
 stage: 'procedure',
 label: 'TV Intervention',
 patients: 78,
 percentage: 11.5,
 eligible: 0,
 treated: 78,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 35,
 successRate: 88.5,
 commonBarriers: ['Leaflet perforation', 'RV failure', 'Device malposition'],
 },
 ],
 },
 {
 type: 'Multi-Valve',
 icon: Heart,
 color: 'medical-amber',
 stages: [
 {
 stage: 'screening',
 label: 'Multi-Valve Screen',
 patients: 456,
 percentage: 100,
 eligible: 456,
 treated: 0,
 pending: 456,
 contraindicated: 0,
 avgDaysToDecision: 0,
 successRate: 0,
 commonBarriers: ['Single valve disease', 'Mild disease', 'Rheumatic inactive'],
 },
 {
 stage: 'guidelines',
 label: 'Combined Criteria',
 patients: 134,
 percentage: 29.4,
 eligible: 134,
 treated: 0,
 pending: 134,
 contraindicated: 322,
 avgDaysToDecision: 7,
 successRate: 0,
 commonBarriers: ['Staged approach', 'Primary valve only', 'High surgical risk'],
 },
 {
 stage: 'evaluation',
 label: 'Complex Assessment',
 patients: 98,
 percentage: 21.5,
 eligible: 98,
 treated: 0,
 pending: 78,
 contraindicated: 20,
 avgDaysToDecision: 21,
 successRate: 0,
 commonBarriers: ['Prohibitive risk', 'Poor LV function', 'Multiple comorbidities'],
 },
 {
 stage: 'decision',
 label: 'Surgical Planning',
 patients: 67,
 percentage: 14.7,
 eligible: 67,
 treated: 0,
 pending: 45,
 contraindicated: 22,
 avgDaysToDecision: 28,
 successRate: 0,
 commonBarriers: ['Procedure complexity', 'Concomitant CABG', 'Redo surgery'],
 },
 {
 stage: 'procedure',
 label: 'Multi-Valve Surgery',
 patients: 56,
 percentage: 12.3,
 eligible: 0,
 treated: 56,
 pending: 0,
 contraindicated: 0,
 avgDaysToDecision: 42,
 successRate: 85.7,
 commonBarriers: ['Prolonged CPB', 'Bleeding', 'Multi-organ failure'],
 },
 ],
 },
  ];

  // Mock patient data for valvular intervention pathways
  const interventionPatients: InterventionPatientData[] = [
 // Aortic Valve patients
 { id: 'VAL001', name: 'Johnson, Mary', age: 78, ejectionFraction: 60, gradientPeak: 68, status: 'eligible', lastVisit: new Date('2024-10-20'), provider: 'Dr. Sarah Martinez', nextSteps: ['Echo assessment', 'Stress testing'], interventionType: 'Aortic-Valve', stage: 'screening' },
 { id: 'VAL002', name: 'Williams, Robert', age: 82, ejectionFraction: 45, gradientPeak: 84, status: 'pending', lastVisit: new Date('2024-10-18'), provider: 'Dr. Michael Chen', barriers: ['Bicuspid valve'], nextSteps: ['MDCT evaluation'], interventionType: 'Aortic-Valve', stage: 'guidelines' },
 { id: 'VAL003', name: 'Davis, Patricia', age: 75, ejectionFraction: 55, gradientPeak: 72, status: 'treated', lastVisit: new Date('2024-10-22'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-TAVR follow-up', 'Echo surveillance'], interventionType: 'Aortic-Valve', stage: 'procedure' },
 
 // Mitral Valve patients
 { id: 'VAL004', name: 'Brown, James', age: 72, ejectionFraction: 35, gradientPeak: 0, status: 'eligible', lastVisit: new Date('2024-10-21'), provider: 'Dr. David Rodriguez', nextSteps: ['TEE evaluation', 'MitraClip assessment'], interventionType: 'Mitral-Valve', stage: 'screening' },
 { id: 'VAL005', name: 'Miller, Susan', age: 69, ejectionFraction: 40, gradientPeak: 0, status: 'pending', lastVisit: new Date('2024-10-23'), provider: 'Dr. Sarah Martinez', barriers: ['Cleft leaflet'], nextSteps: ['Surgical consultation'], interventionType: 'Mitral-Valve', stage: 'evaluation' },
 
 // Tricuspid Valve patients
 { id: 'VAL006', name: 'Garcia, Maria', age: 71, ejectionFraction: 45, gradientPeak: 0, status: 'eligible', lastVisit: new Date('2024-10-17'), provider: 'Dr. Michael Chen', nextSteps: ['RV assessment', 'TriClip evaluation'], interventionType: 'Tricuspid-Valve', stage: 'screening' },
 { id: 'VAL007', name: 'Taylor, John', age: 68, ejectionFraction: 50, gradientPeak: 0, status: 'treated', lastVisit: new Date('2024-10-16'), provider: 'Dr. Jennifer Kim', nextSteps: ['Post-TriClip echo', 'RV function monitoring'], interventionType: 'Tricuspid-Valve', stage: 'procedure' },
 
 // Multi-Valve patients
 { id: 'VAL008', name: 'Anderson, William', age: 74, ejectionFraction: 30, gradientPeak: 58, status: 'eligible', lastVisit: new Date('2024-10-24'), provider: 'Dr. David Rodriguez', nextSteps: ['Multi-valve assessment', 'Surgical planning'], interventionType: 'Multi-Valve', stage: 'screening' },
 { id: 'VAL009', name: 'Thomas, Nancy', age: 70, ejectionFraction: 35, gradientPeak: 62, status: 'pending', lastVisit: new Date('2024-10-22'), provider: 'Dr. Sarah Martinez', barriers: ['Prohibitive risk'], nextSteps: ['Risk optimization'], interventionType: 'Multi-Valve', stage: 'evaluation' }
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
 guidelines: 'medical-amber',
 evaluation: 'titanium',
 decision: 'medical-green',
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
 Valvular Disease Pathway Funnel
 </h2>
 <p className="text-titanium-600">
 Patient journey through valvular intervention • Click metrics for patient details
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
 conversionRate >= 80 ? 'text-medical-green-600' :
 conversionRate >= 60 ? 'text-medical-amber-600' : 'text-medical-red-600'
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
 <div className="text-lg font-bold text-medical-green-600 group-hover:text-medical-green-700">
 {stage.eligible}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Eligible</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-green-600" />
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
 <div className="text-lg font-bold text-medical-amber-600 group-hover:text-medical-amber-700">
 {stage.pending}
 </div>
 <div className="text-xs text-titanium-600 group-hover:text-titanium-700">Pending</div>
 <ChevronRight className="w-3 h-3 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-medical-amber-600" />
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
 <AlertTriangle className="w-5 h-5 text-medical-amber-600" />
 <h4 className="font-semibold text-titanium-900">Common Barriers</h4>
 </div>
 <div className="grid grid-cols-3 gap-2">
 {selectedStageData.commonBarriers.map((barrier, idx) => (
 <div
 key={barrier}
 className="p-2 bg-medical-amber-50 rounded-lg text-sm text-titanium-800"
 >
 {barrier}
 </div>
 ))}
 </div>
 {selectedStageData.successRate > 0 && (
 <div className="mt-3 flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-medical-green-600" />
 <span className="text-sm text-titanium-700">
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
 <div className="text-lg font-bold text-medical-green-600">
 {formatPercentage(selectedInterventionData.stages[4].successRate)}
 </div>
 <div className="text-sm text-titanium-600">
 Successful procedures
 </div>
 </div>
 </div>

 {/* Valvular Patients Panel */}
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
 <div className="bg-gradient-to-br from-gold-50 to-gold-100 p-4 rounded-xl">
 <div className="text-sm text-gold-700 font-medium">Avg Age</div>
 <div className="text-2xl font-bold text-gold-800">
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
 patient.status === 'treated' ? 'bg-[#C8D4DC]' :
 patient.status === 'eligible' ? 'bg-chrome-500' :
 patient.status === 'pending' ? 'bg-[#F0F5FA]' : 'bg-red-500'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 Age {patient.age} • EF {patient.ejectionFraction}% • Peak Grad {patient.gradientPeak}mmHg
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.status === 'treated' ? 'bg-[#C8D4DC] text-[#2C4A60]' :
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
 No patients found for this intervention stage and status.
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 mt-6 pt-6 border-t border-titanium-200">
 <button 
 onClick={() => {
 console.log('Generating valvular disease report:', selectedIntervention, selectedMetric);
 {}
 }}
 className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 >
 Generate Valvular Report
 </button>
 <button 
 onClick={() => {
 console.log('Scheduling valvular disease reviews:', selectedIntervention, getFilteredPatients().length);
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

export default ValvularInterventionPathwayFunnel;