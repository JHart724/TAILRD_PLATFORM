import React, { useState } from 'react';
import {
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Shield,
  Activity,
  Target,
  Info
} from 'lucide-react';

export interface GDMTPillar {
  id: string;
  name: string;
  abbreviation: string;
  currentDose: number;
  targetDose: number;
  unit: string;
  percentOfTarget: number;
  barriers: string[];
  nextStep: string;
  daysSinceLastTitration: number;
  status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not-prescribed';
  populationPercentage: number;
  populationAtTarget: number;
}

export interface PatientGDMT {
  patientId: string;
  patientName: string;
  patientMRN: string;
  age: number;
  ejectionFraction: number;
  pillars: GDMTPillar[];
  overallGDMTScore: number;
  lastUpdated: string;
}

interface PopulationMetrics {
  totalPatients: number;
  onACEi: { count: number; atTarget: number; percentage: number; };
  onBetaBlocker: { count: number; atTarget: number; percentage: number; };
  onMRA: { count: number; atTarget: number; percentage: number; };
  onSGLT2i: { count: number; atTarget: number; percentage: number; };
}

const GDMTOptimizationTracker: React.FC = () => {
  const [viewMode, setViewMode] = useState<'individual' | 'population'>('individual');
  const [selectedPatient, setSelectedPatient] = useState<string>('patient-001');

  // Mock patient data
  const mockPatients: PatientGDMT[] = [
 {
 patientId: 'patient-001',
 patientName: 'John Anderson',
 patientMRN: 'MRN123456',
 age: 68,
 ejectionFraction: 35,
 overallGDMTScore: 75,
 lastUpdated: '2024-12-14T10:30:00Z',
 pillars: [
 {
 id: 'acei-arb-arni',
 name: 'ACEi/ARB/ARNI',
 abbreviation: 'ACEi',
 currentDose: 10,
 targetDose: 20,
 unit: 'mg',
 percentOfTarget: 50,
 barriers: ['Mild hyperkalemia (K+ 5.2)', 'Patient concerned about side effects'],
 nextStep: 'Recheck electrolytes in 1 week, consider dose increase if stable',
 daysSinceLastTitration: 14,
 status: 'suboptimal',
 populationPercentage: 85,
 populationAtTarget: 65
 },
 {
 id: 'beta-blocker',
 name: 'Beta-blocker',
 abbreviation: 'BB',
 currentDose: 25,
 targetDose: 50,
 unit: 'mg BID',
 percentOfTarget: 50,
 barriers: ['HR drops to 55 at current dose', 'Mild fatigue reported'],
 nextStep: 'Continue current dose, monitor symptoms and HR',
 daysSinceLastTitration: 21,
 status: 'suboptimal',
 populationPercentage: 92,
 populationAtTarget: 58
 },
 {
 id: 'mra',
 name: 'Mineralocorticoid Receptor Antagonist',
 abbreviation: 'MRA',
 currentDose: 25,
 targetDose: 25,
 unit: 'mg',
 percentOfTarget: 100,
 barriers: [],
 nextStep: 'Continue current dose, monitor electrolytes',
 daysSinceLastTitration: 45,
 status: 'optimal',
 populationPercentage: 78,
 populationAtTarget: 89
 },
 {
 id: 'sglt2i',
 name: 'SGLT2 Inhibitor',
 abbreviation: 'SGLT2i',
 currentDose: 0,
 targetDose: 10,
 unit: 'mg',
 percentOfTarget: 0,
 barriers: ['eGFR 28 mL/min/1.73m²', 'Insurance prior auth pending'],
 nextStep: 'Complete prior authorization, reassess renal function',
 daysSinceLastTitration: 0,
 status: 'not-prescribed',
 populationPercentage: 45,
 populationAtTarget: 35
 }
 ]
 }
  ];

  const mockPopulationMetrics: PopulationMetrics = {
 totalPatients: 1247,
 onACEi: { count: 1060, atTarget: 689, percentage: 85 },
 onBetaBlocker: { count: 1147, atTarget: 665, percentage: 92 },
 onMRA: { count: 973, atTarget: 866, percentage: 78 },
 onSGLT2i: { count: 561, atTarget: 436, percentage: 45 }
  };

  const currentPatient = mockPatients.find(p => p.patientId === selectedPatient) || mockPatients[0];

  const getPillarStatusConfig = (status: string) => {
 switch (status) {
 case 'optimal':
 return {
 color: 'text-medical-green-600',
 bgColor: 'bg-medical-green-100',
 borderColor: 'border-medical-green-300',
 icon: CheckCircle,
 light: 'bg-medical-green-500'
 };
 case 'suboptimal':
 return {
 color: 'text-medical-amber-600',
 bgColor: 'bg-medical-amber-100',
 borderColor: 'border-medical-amber-300',
 icon: AlertTriangle,
 light: 'bg-medical-amber-500'
 };
 case 'contraindicated':
 return {
 color: 'text-medical-red-600',
 bgColor: 'bg-medical-red-100',
 borderColor: 'border-medical-red-300',
 icon: AlertTriangle,
 light: 'bg-medical-red-500'
 };
 case 'not-prescribed':
 return {
 color: 'text-titanium-600',
 bgColor: 'bg-titanium-100',
 borderColor: 'border-titanium-300',
 icon: Clock,
 light: 'bg-titanium-500'
 };
 default:
 return {
 color: 'text-titanium-600',
 bgColor: 'bg-titanium-100',
 borderColor: 'border-titanium-300',
 icon: Clock,
 light: 'bg-titanium-500'
 };
 }
  };

  const getOverallGDMTColor = (score: number) => {
 if (score >= 85) return 'text-medical-green-600';
 if (score >= 65) return 'text-medical-amber-600';
 return 'text-medical-red-600';
  };

  const formatTimeAgo = (dateString: string) => {
 const hours = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60));
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 return `${days}d ago`;
  };

  const renderIndividualView = () => (
 <div className="space-y-6">
 {/* Patient Header */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex items-start justify-between mb-4">
 <div>
 <h2 className="text-xl font-bold text-titanium-800 mb-2">
 {currentPatient.patientName}
 </h2>
 <div className="flex items-center gap-4 text-sm text-titanium-600">
 <span>Age {currentPatient.age}</span>
 <span>{currentPatient.patientMRN}</span>
 <span>EF: {currentPatient.ejectionFraction}%</span>
 </div>
 </div>
 
 <div className="text-right">
 <div className={`text-2xl font-bold ${getOverallGDMTColor(currentPatient.overallGDMTScore)}`}>
 {currentPatient.overallGDMTScore}%
 </div>
 <div className="text-sm text-titanium-600">GDMT Score</div>
 <div className="text-xs text-titanium-500 mt-1">
 Updated {formatTimeAgo(currentPatient.lastUpdated)}
 </div>
 </div>
 </div>

 {/* Overall Progress Bar */}
 <div className="w-full bg-titanium-200 rounded-full h-3 mb-2">
 <div
 className={`h-3 rounded-full transition-all duration-500 ${
 currentPatient.overallGDMTScore >= 85 ? 'bg-medical-green-500' :
 currentPatient.overallGDMTScore >= 65 ? 'bg-medical-amber-500' :
 'bg-medical-red-500'
 }`}
 style={{ width: `${currentPatient.overallGDMTScore}%` }}
 />
 </div>
 <div className="text-xs text-titanium-500">Overall GDMT Optimization</div>
 </div>

 {/* 4-Pillar Visual */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {currentPatient.pillars.map((pillar) => {
 const config = getPillarStatusConfig(pillar.status);
 const Icon = config.icon;

 return (
 <div key={pillar.id} className={`retina-card border-l-4 ${config.borderColor}`}>
 {/* Header */}
 <div className="p-4 border-b border-titanium-100">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <div className={`p-2 rounded-lg ${config.bgColor}`}>
 <Heart className={`w-5 h-5 ${config.color}`} />
 </div>
 <div>
 <h3 className="font-semibold text-titanium-800">{pillar.name}</h3>
 <p className="text-sm text-titanium-600">{pillar.abbreviation}</p>
 </div>
 </div>
 
 {/* Traffic Light Indicator */}
 <div className="flex items-center gap-1">
 <div className={`w-3 h-3 rounded-full ${config.light}`} />
 <Icon className={`w-4 h-4 ${config.color}`} />
 </div>
 </div>

 {/* Dosing Information */}
 <div className="grid grid-cols-3 gap-4 text-center">
 <div className="p-2 bg-titanium-50 rounded">
 <div className="text-lg font-bold text-titanium-800">
 {pillar.currentDose} {pillar.unit}
 </div>
 <div className="text-xs text-titanium-600">Current</div>
 </div>
 
 <div className="p-2 bg-titanium-50 rounded">
 <div className="text-lg font-bold text-titanium-800">
 {pillar.targetDose} {pillar.unit}
 </div>
 <div className="text-xs text-titanium-600">Target</div>
 </div>
 
 <div className="p-2 bg-titanium-50 rounded">
 <div className={`text-lg font-bold ${config.color}`}>
 {pillar.percentOfTarget}%
 </div>
 <div className="text-xs text-titanium-600">of Target</div>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="mt-3">
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${config.light}`}
 style={{ width: `${pillar.percentOfTarget}%` }}
 />
 </div>
 </div>
 </div>

 {/* Barriers and Next Steps */}
 <div className="p-4 space-y-3">
 {/* Barriers */}
 {pillar.barriers.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-titanium-800 mb-2 flex items-center gap-1">
 <AlertTriangle className="w-3 h-3 text-medical-red-500" />
 Barriers
 </h4>
 <div className="space-y-1">
 {pillar.barriers.map((barrier, index) => (
 <div key={barrier} className="text-xs text-medical-red-700 bg-medical-red-50 p-2 rounded border border-medical-red-200">
 {barrier}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Next Step */}
 <div>
 <h4 className="text-sm font-medium text-titanium-800 mb-2 flex items-center gap-1">
 <Target className="w-3 h-3 text-porsche-500" />
 Next Step
 </h4>
 <div className="text-xs text-titanium-700 bg-porsche-50 p-2 rounded border border-porsche-200">
 {pillar.nextStep}
 </div>
 </div>

 {/* Last Titration */}
 <div className="flex items-center justify-between text-xs text-titanium-500">
 <div className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 Last titration: {pillar.daysSinceLastTitration} days ago
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor} border ${config.borderColor}`}>
 {pillar.status.replace('-', ' ').toUpperCase()}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
  );

  const renderPopulationView = () => (
 <div className="space-y-6">
 {/* Population Overview */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-xl font-bold text-titanium-800 mb-2">Population GDMT Analysis</h2>
 <p className="text-titanium-600">
 Heart Failure patient cohort (n = {mockPopulationMetrics.totalPatients})
 </p>
 </div>
 
 <div className="text-right">
 <div className="text-2xl font-bold text-porsche-600">
 {Math.round((mockPopulationMetrics.onACEi.atTarget + mockPopulationMetrics.onBetaBlocker.atTarget + mockPopulationMetrics.onMRA.atTarget + mockPopulationMetrics.onSGLT2i.atTarget) / 4 / mockPopulationMetrics.totalPatients * 100)}%
 </div>
 <div className="text-sm text-titanium-600">Avg. Optimization</div>
 </div>
 </div>
 </div>

 {/* 4-Pillar Population Stats */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* ACEi/ARB/ARNI */}
 <div className="retina-card border-l-4 border-l-porsche-500">
 <div className="p-4">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-porsche-100 rounded-lg">
 <Heart className="w-5 h-5 text-porsche-600" />
 </div>
 <div>
 <h3 className="font-semibold text-titanium-800">ACEi/ARB/ARNI</h3>
 <p className="text-sm text-titanium-600">Renin-Angiotensin System Inhibitor</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xl font-bold text-porsche-600">
 {mockPopulationMetrics.onACEi.percentage}%
 </div>
 <div className="text-xs text-titanium-600">On therapy</div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">Total patients on therapy:</span>
 <span className="font-medium text-titanium-800">
 {mockPopulationMetrics.onACEi.count.toLocaleString()}
 </span>
 </div>
 
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">At target dose:</span>
 <span className="font-medium text-medical-green-600">
 {mockPopulationMetrics.onACEi.atTarget.toLocaleString()} ({Math.round(mockPopulationMetrics.onACEi.atTarget / mockPopulationMetrics.onACEi.count * 100)}%)
 </span>
 </div>

 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className="h-2 bg-medical-green-500 rounded-full transition-all duration-500"
 style={{ width: `${mockPopulationMetrics.onACEi.atTarget / mockPopulationMetrics.onACEi.count * 100}%` }}
 />
 </div>
 </div>
 </div>
 </div>

 {/* Beta-blocker */}
 <div className="retina-card border-l-4 border-l-medical-red-500">
 <div className="p-4">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-medical-red-100 rounded-lg">
 <Shield className="w-5 h-5 text-medical-red-600" />
 </div>
 <div>
 <h3 className="font-semibold text-titanium-800">Beta-blocker</h3>
 <p className="text-sm text-titanium-600">Beta-adrenergic Receptor Blocker</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xl font-bold text-medical-red-600">
 {mockPopulationMetrics.onBetaBlocker.percentage}%
 </div>
 <div className="text-xs text-titanium-600">On therapy</div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">Total patients on therapy:</span>
 <span className="font-medium text-titanium-800">
 {mockPopulationMetrics.onBetaBlocker.count.toLocaleString()}
 </span>
 </div>
 
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">At target dose:</span>
 <span className="font-medium text-medical-green-600">
 {mockPopulationMetrics.onBetaBlocker.atTarget.toLocaleString()} ({Math.round(mockPopulationMetrics.onBetaBlocker.atTarget / mockPopulationMetrics.onBetaBlocker.count * 100)}%)
 </span>
 </div>

 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className="h-2 bg-medical-green-500 rounded-full transition-all duration-500"
 style={{ width: `${mockPopulationMetrics.onBetaBlocker.atTarget / mockPopulationMetrics.onBetaBlocker.count * 100}%` }}
 />
 </div>
 </div>
 </div>
 </div>

 {/* MRA */}
 <div className="retina-card border-l-4 border-l-medical-green-500">
 <div className="p-4">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-medical-green-100 rounded-lg">
 <Activity className="w-5 h-5 text-medical-green-600" />
 </div>
 <div>
 <h3 className="font-semibold text-titanium-800">MRA</h3>
 <p className="text-sm text-titanium-600">Mineralocorticoid Receptor Antagonist</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xl font-bold text-medical-green-600">
 {mockPopulationMetrics.onMRA.percentage}%
 </div>
 <div className="text-xs text-titanium-600">On therapy</div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">Total patients on therapy:</span>
 <span className="font-medium text-titanium-800">
 {mockPopulationMetrics.onMRA.count.toLocaleString()}
 </span>
 </div>
 
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">At target dose:</span>
 <span className="font-medium text-medical-green-600">
 {mockPopulationMetrics.onMRA.atTarget.toLocaleString()} ({Math.round(mockPopulationMetrics.onMRA.atTarget / mockPopulationMetrics.onMRA.count * 100)}%)
 </span>
 </div>

 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className="h-2 bg-medical-green-500 rounded-full transition-all duration-500"
 style={{ width: `${mockPopulationMetrics.onMRA.atTarget / mockPopulationMetrics.onMRA.count * 100}%` }}
 />
 </div>
 </div>
 </div>
 </div>

 {/* SGLT2i */}
 <div className="retina-card border-l-4 border-l-medical-amber-500">
 <div className="p-4">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-medical-amber-100 rounded-lg">
 <Target className="w-5 h-5 text-medical-amber-600" />
 </div>
 <div>
 <h3 className="font-semibold text-titanium-800">SGLT2i</h3>
 <p className="text-sm text-titanium-600">Sodium-Glucose Cotransporter-2 Inhibitor</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xl font-bold text-medical-amber-600">
 {mockPopulationMetrics.onSGLT2i.percentage}%
 </div>
 <div className="text-xs text-titanium-600">On therapy</div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">Total patients on therapy:</span>
 <span className="font-medium text-titanium-800">
 {mockPopulationMetrics.onSGLT2i.count.toLocaleString()}
 </span>
 </div>
 
 <div className="flex justify-between items-center text-sm">
 <span className="text-titanium-600">At target dose:</span>
 <span className="font-medium text-medical-green-600">
 {mockPopulationMetrics.onSGLT2i.atTarget.toLocaleString()} ({Math.round(mockPopulationMetrics.onSGLT2i.atTarget / mockPopulationMetrics.onSGLT2i.count * 100)}%)
 </span>
 </div>

 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className="h-2 bg-medical-green-500 rounded-full transition-all duration-500"
 style={{ width: `${mockPopulationMetrics.onSGLT2i.atTarget / mockPopulationMetrics.onSGLT2i.count * 100}%` }}
 />
 </div>
 
 <div className="text-xs text-medical-amber-600 bg-medical-amber-50 p-2 rounded border border-medical-amber-200">
 <Info className="w-3 h-3 inline mr-1" />
 Opportunity for improvement: 55% of eligible patients not on therapy
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
  );

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-titanium-800 mb-2">GDMT Optimization Tracker</h1>
 <p className="text-titanium-600">
 4-pillar heart failure medication optimization tracking
 </p>
 </div>
 
 <div className="flex rounded-lg border border-titanium-300 overflow-hidden">
 <button
 onClick={() => setViewMode('individual')}
 className={`px-4 py-2 text-sm font-medium transition-colors ${
 viewMode === 'individual'
 ? 'bg-porsche-500 text-white'
 : 'bg-white text-titanium-600 hover:bg-titanium-50'
 }`}
 >
 Individual View
 </button>
 <button
 onClick={() => setViewMode('population')}
 className={`px-4 py-2 text-sm font-medium transition-colors ${
 viewMode === 'population'
 ? 'bg-porsche-500 text-white'
 : 'bg-white text-titanium-600 hover:bg-titanium-50'
 }`}
 >
 Population View
 </button>
 </div>
 </div>
 </div>

 {viewMode === 'individual' ? renderIndividualView() : renderPopulationView()}
 </div>
  );
};

export default GDMTOptimizationTracker;