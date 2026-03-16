import React, { useState } from 'react';
import { AlertTriangle, Users, TrendingDown, ChevronRight, Pill, Zap } from 'lucide-react';

interface TreatmentGap {
  category: string;
  description: string;
  patientCount: number;
  severity: 'high' | 'medium' | 'low';
  potentialImpact: string;
  recommendedAction: string;
}

const EPTreatmentGapQueue: React.FC = () => {
  const [gaps] = useState<TreatmentGap[]>([
 {
 category: 'Anticoagulation Undertreated',
 description: 'High stroke risk patients without optimal anticoagulation',
 patientCount: 23,
 severity: 'high',
 potentialImpact: 'Stroke prevention',
 recommendedAction: 'Optimize anticoagulation therapy'
 },
 {
 category: 'Rate Control Gap',
 description: 'AF patients with poor heart rate control',
 patientCount: 18,
 severity: 'medium',
 potentialImpact: 'Symptom management',
 recommendedAction: 'Adjust rate control medications'
 },
 {
 category: 'Rhythm Control Gap',
 description: 'Symptomatic AF patients without rhythm control',
 patientCount: 15,
 severity: 'medium',
 potentialImpact: 'Quality of life',
 recommendedAction: 'Consider antiarrhythmic therapy'
 },
 {
 category: 'Ablation Candidates',
 description: 'Patients who may benefit from catheter ablation',
 patientCount: 12,
 severity: 'high',
 potentialImpact: 'Rhythm control, QOL',
 recommendedAction: 'EP evaluation for ablation'
 }
  ]);

  const getSeverityColor = (severity: string) => {
 switch(severity) {
 case 'high': return 'bg-red-100 text-red-900 border-red-400';
 case 'medium': return 'bg-amber-100 text-amber-900 border-amber-400';
 case 'low': return 'bg-green-100 text-green-900 border-green-400';
 default: return 'bg-gray-100 text-gray-900 border-gray-400';
 }
  };

  const getCategoryIcon = (category: string) => {
 if (category.toLowerCase().includes('anticoag')) return <Pill className="w-5 h-5" />;
 if (category.toLowerCase().includes('ablation')) return <Zap className="w-5 h-5" />;
 return <AlertTriangle className="w-5 h-5" />;
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <TrendingDown className="w-5 h-5 text-amber-600" />
 EP Treatment Gap Queue
 </h3>
 <p className="text-sm text-titanium-600 mt-1">Patients with opportunities for EP care optimization</p>
 </div>

 <div className="divide-y divide-white/20">
 {gaps.map((gap, index) => (
 <div key={`${gap.category}-${gap.description}`} className="px-6 py-4 hover:bg-titanium-50 transition-colors cursor-pointer">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className="text-amber-600">
 {getCategoryIcon(gap.category)}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{gap.category}</div>
 <div className="text-sm text-titanium-600">{gap.description}</div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getSeverityColor(gap.severity)}`}>
 {gap.severity.toUpperCase()}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Patient Count</div>
 <div className="flex items-center gap-1">
 <Users className="w-4 h-4 text-chrome-600" />
 <span className="text-lg font-bold text-chrome-900">{gap.patientCount}</span>
 </div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Potential Impact</div>
 <div className="text-sm font-medium text-titanium-800">{gap.potentialImpact}</div>
 </div>
 </div>

 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Recommended Action</div>
 <div className="text-sm font-medium text-green-700">{gap.recommendedAction}</div>
 </div>
 <div className="flex items-center gap-1 text-sm text-porsche-600 hover:text-porsche-700">
 <span>View Patients</span>
 <ChevronRight className="w-4 h-4" />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
  );
};

export default EPTreatmentGapQueue;