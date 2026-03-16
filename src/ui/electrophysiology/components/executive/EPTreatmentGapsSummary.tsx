import React, { useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, CheckCircle, Users, Calendar, ArrowRight, ExternalLink, X, Heart, Activity, Zap, Shield, Pill, FileText, Thermometer, Droplets } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface TreatmentGap {
  id: string;
  category: 'Anticoagulation' | 'Rate_Control' | 'Rhythm_Control' | 'Device' | 'Screening' | 'Follow-up';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'routine';
  affectedPatients: number;
  potentialOutcome: string;
  actionRequired: string;
  estimatedTimeToClose: string;
  assignedTo?: string;
  dueDate: string;
  evidenceLevel: 'Class I' | 'Class IIa' | 'Class IIb' | 'Class III';
  costSavings?: number;
  qualityMeasure?: string;
  barriers: string[];
  recommendations: {
 action: string;
 timeline: string;
 responsibility: string;
  }[];
}

interface TreatmentGapSummary {
  totalGaps: number;
  highImpact: number;
  urgent: number;
  avgClosureTime: number;
  totalPotentialSavings: number;
  complianceRate: number;
}

const EPTreatmentGapsSummary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGap, setSelectedGap] = useState<TreatmentGap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'priority'>('grid');

  const treatmentGaps: TreatmentGap[] = [
 {
 id: 'EPG001',
 category: 'Anticoagulation',
 title: 'Anticoagulation Underutilization',
 description: '35 AF patients with CHA₂DS₂-VASc ≥2 not on anticoagulation',
 impact: 'high',
 urgency: 'urgent',
 affectedPatients: 35,
 potentialOutcome: '65% stroke risk reduction, improved quality of life',
 actionRequired: 'Risk assessment, contraindication review, patient counseling',
 estimatedTimeToClose: '3-4 weeks',
 assignedTo: 'Dr. Johnson',
 dueDate: '2025-01-15',
 evidenceLevel: 'Class I',
 costSavings: 2400000,
 qualityMeasure: 'AF Anticoagulation Quality',
 barriers: ['Bleeding concerns', 'Cost concerns', 'Monitoring challenges'],
 recommendations: [
 {
 action: 'Bleeding risk stratification using HAS-BLED',
 timeline: '1 week',
 responsibility: 'EP Attending',
 },
 {
 action: 'DOAC vs warfarin shared decision making',
 timeline: '2 weeks',
 responsibility: 'Care Team',
 },
 {
 action: 'Anticoagulation clinic referral',
 timeline: '3 weeks',
 responsibility: 'NP/PA',
 },
 ],
 },
 {
 id: 'EPG002',
 category: 'Rhythm_Control',
 title: 'Delayed Ablation Evaluations',
 description: '18 patients with symptomatic AF eligible for ablation',
 impact: 'high',
 urgency: 'urgent',
 affectedPatients: 18,
 potentialOutcome: 'Improved symptoms, reduced AF burden, enhanced QoL',
 actionRequired: 'EP consultation, imaging review, patient education',
 estimatedTimeToClose: '6-8 weeks',
 assignedTo: 'Dr. Rivera',
 dueDate: '2025-01-30',
 evidenceLevel: 'Class I',
 costSavings: 1800000,
 qualityMeasure: 'AF Ablation Utilization',
 barriers: ['Patient anxiety', 'Insurance authorization', 'EP lab capacity'],
 recommendations: [
 {
 action: 'Accelerated EP referral for ablation candidates',
 timeline: '1 week',
 responsibility: 'Primary Team',
 },
 {
 action: 'Insurance pre-authorization workflow',
 timeline: '2 weeks',
 responsibility: 'Care Coordinator',
 },
 {
 action: 'Patient education on ablation benefits',
 timeline: 'Ongoing',
 responsibility: 'EP Nurse',
 },
 ],
 },
 {
 id: 'EPG003',
 category: 'Device',
 title: 'ICD Evaluation Delays',
 description: '12 patients meeting ICD criteria without evaluation',
 impact: 'high',
 urgency: 'urgent',
 affectedPatients: 12,
 potentialOutcome: 'Sudden cardiac death prevention, improved survival',
 actionRequired: 'Echo review, EP consultation, device clinic referral',
 estimatedTimeToClose: '4-6 weeks',
 assignedTo: 'Dr. Martinez',
 dueDate: '2025-01-20',
 evidenceLevel: 'Class I',
 costSavings: 2100000,
 qualityMeasure: 'Appropriate Device Therapy',
 barriers: ['Patient reluctance', 'Insurance barriers', 'Device clinic availability'],
 recommendations: [
 {
 action: 'Systematic ICD screening for HF patients',
 timeline: '2 weeks',
 responsibility: 'HF Team',
 },
 {
 action: 'Device clinic integration',
 timeline: '3 weeks',
 responsibility: 'Device Team',
 },
 {
 action: 'Patient counseling on device benefits',
 timeline: 'Ongoing',
 responsibility: 'Device Nurse',
 },
 ],
 },
 {
 id: 'EPG004',
 category: 'Rate_Control',
 title: 'Rate Control Optimization',
 description: '28 AF patients with suboptimal heart rate control',
 impact: 'medium',
 urgency: 'soon',
 affectedPatients: 28,
 potentialOutcome: 'Improved symptoms, exercise tolerance, quality of life',
 actionRequired: 'Medication titration, Holter monitoring, lifestyle counseling',
 estimatedTimeToClose: '4-5 weeks',
 assignedTo: 'Dr. Chen',
 dueDate: '2025-02-01',
 evidenceLevel: 'Class I',
 costSavings: 850000,
 qualityMeasure: 'AF Rate Control Quality',
 barriers: ['Medication side effects', 'Patient adherence', 'Monitoring complexity'],
 recommendations: [
 {
 action: 'Beta-blocker optimization protocol',
 timeline: '2 weeks',
 responsibility: 'Clinical Pharmacist',
 },
 {
 action: 'Ambulatory rhythm monitoring',
 timeline: '3 weeks',
 responsibility: 'EP Lab',
 },
 {
 action: 'Medication adherence counseling',
 timeline: 'Ongoing',
 responsibility: 'Care Team',
 },
 ],
 },
 {
 id: 'EPG005',
 category: 'Screening',
 title: 'Inherited Arrhythmia Screening',
 description: '15 patients with family history not screened for genetic conditions',
 impact: 'medium',
 urgency: 'soon',
 affectedPatients: 15,
 potentialOutcome: 'Early detection, family screening, targeted therapy',
 actionRequired: 'Genetic counseling, testing, family evaluation',
 estimatedTimeToClose: '8-10 weeks',
 assignedTo: 'Dr. Park',
 dueDate: '2025-02-15',
 evidenceLevel: 'Class IIa',
 costSavings: 650000,
 qualityMeasure: 'Genetic Screening Rate',
 barriers: ['Testing cost', 'Genetic counselor availability', 'Patient concerns'],
 recommendations: [
 {
 action: 'Genetic risk assessment tool in EHR',
 timeline: '3 weeks',
 responsibility: 'Clinical Informatics',
 },
 {
 action: 'Genetic counselor integration',
 timeline: '4 weeks',
 responsibility: 'Genetics Team',
 },
 {
 action: 'Family screening protocols',
 timeline: '6 weeks',
 responsibility: 'EP Team',
 },
 ],
 },
 {
 id: 'EPG006',
 category: 'Follow-up',
 title: 'Post-Ablation Follow-up Gaps',
 description: '22 patients overdue for post-ablation monitoring',
 impact: 'medium',
 urgency: 'soon',
 affectedPatients: 22,
 potentialOutcome: 'Early recurrence detection, optimal outcomes',
 actionRequired: 'Rhythm monitoring, symptom assessment, medication adjustment',
 estimatedTimeToClose: '3-4 weeks',
 assignedTo: 'EP Clinic',
 dueDate: '2025-01-25',
 evidenceLevel: 'Class I',
 qualityMeasure: 'Post-Ablation Care',
 barriers: ['Patient scheduling', 'Monitoring compliance', 'Clinic capacity'],
 recommendations: [
 {
 action: 'Automated post-ablation follow-up system',
 timeline: '2 weeks',
 responsibility: 'Care Management',
 },
 {
 action: 'Remote monitoring protocols',
 timeline: '3 weeks',
 responsibility: 'Device Team',
 },
 {
 action: 'Patient education on follow-up importance',
 timeline: 'Ongoing',
 responsibility: 'EP Nurse',
 },
 ],
 },
  ];

  const filteredGaps = treatmentGaps.filter(gap => 
 selectedCategory === 'all' || gap.category === selectedCategory
  );

  const sortedGaps = [...filteredGaps].sort((a, b) => {
 if (viewMode === 'priority') {
 const urgencyWeight = { urgent: 3, soon: 2, routine: 1 };
 const impactWeight = { high: 3, medium: 2, low: 1 };
 
 const aScore = urgencyWeight[a.urgency] + impactWeight[a.impact];
 const bScore = urgencyWeight[b.urgency] + impactWeight[b.impact];
 
 return bScore - aScore;
 }
 return 0;
  });

  const summary: TreatmentGapSummary = {
 totalGaps: treatmentGaps.length,
 highImpact: treatmentGaps.filter(g => g.impact === 'high').length,
 urgent: treatmentGaps.filter(g => g.urgency === 'urgent').length,
 avgClosureTime: 5.2,
 totalPotentialSavings: treatmentGaps.reduce((sum, g) => sum + (g.costSavings || 0), 0),
 complianceRate: 68.7,
  };

  const getImpactColor = (impact: string) => {
 const colors = {
 high: 'text-red-600 bg-red-100',
 medium: 'text-amber-600 bg-amber-100',
 low: 'text-green-600 bg-green-100',
 };
 return colors[impact as keyof typeof colors];
  };

  const getUrgencyColor = (urgency: string) => {
 const colors = {
 urgent: 'border-l-red-400 bg-red-50',
 soon: 'border-l-amber-400 bg-amber-50',
 routine: 'border-l-green-400 bg-green-50',
 };
 return colors[urgency as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
 const icons = {
 Anticoagulation: <Shield className="w-5 h-5 text-chrome-600" />,
 Rate_Control: <Heart className="w-5 h-5 text-green-600" />,
 Rhythm_Control: <Zap className="w-5 h-5 text-arterial-600" />,
 Device: <Activity className="w-5 h-5 text-chrome-600" />,
 Screening: <AlertTriangle className="w-5 h-5 text-amber-600" />,
 'Follow-up': <Clock className="w-5 h-5 text-red-600" />,
 };
 return icons[category as keyof typeof icons];
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2">
 EP Treatment Gaps Summary
 </h2>
 <p className="text-titanium-600">
 Identify and prioritize EP care optimization opportunities
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Total Potential Savings</div>
 <div className="text-3xl font-bold text-green-600">
 ${toFixed(summary.totalPotentialSavings / 1000000, 1)}M
 </div>
 <div className="text-sm text-titanium-600">Annual opportunity</div>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-5 gap-4 mb-6">
 <div 
 className="p-4 text-center bg-titanium-50 rounded-lg border border-titanium-200 cursor-pointer hover:bg-titanium-100 transition-colors"
 onClick={() => console.log('Total gaps drill-down')}
 >
 <div className="text-3xl font-bold text-titanium-900 mb-1">{summary.totalGaps}</div>
 <div className="text-sm text-titanium-600">Total Gaps</div>
 </div>
 <div 
 className="p-4 text-center bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
 onClick={() => console.log('High impact gaps drill-down')}
 >
 <div className="text-3xl font-bold text-red-600 mb-1">{summary.highImpact}</div>
 <div className="text-sm text-titanium-600">High Impact</div>
 </div>
 <div 
 className="p-4 text-center bg-amber-50 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
 onClick={() => console.log('Urgent gaps drill-down')}
 >
 <div className="text-3xl font-bold text-amber-600 mb-1">{summary.urgent}</div>
 <div className="text-sm text-titanium-600">Urgent</div>
 </div>
 <div className="p-4 text-center bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="text-3xl font-bold text-titanium-900 mb-1">{summary.avgClosureTime}</div>
 <div className="text-sm text-titanium-600">Avg Weeks</div>
 </div>
 <div className="p-4 text-center bg-green-50 rounded-lg border border-green-200">
 <div className="text-3xl font-bold text-green-600 mb-1">{summary.complianceRate}%</div>
 <div className="text-sm text-titanium-600">Compliance</div>
 </div>
 </div>

 {/* Controls */}
 <div className="flex items-center justify-between mb-6 p-4 bg-titanium-50 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-4">
 <span className="text-sm font-medium text-titanium-700">Category:</span>
 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-chrome-500"
 >
 <option value="all">All Categories</option>
 <option value="Anticoagulation">Anticoagulation</option>
 <option value="Rate_Control">Rate Control</option>
 <option value="Rhythm_Control">Rhythm Control</option>
 <option value="Device">Device</option>
 <option value="Screening">Screening</option>
 <option value="Follow-up">Follow-up</option>
 </select>
 </div>
 
 <div className="flex items-center gap-2">
 <span className="text-sm text-titanium-600">View:</span>
 <button
 onClick={() => setViewMode('grid')}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'grid' ? 'bg-chrome-100 text-chrome-800' : 'text-titanium-600'
 }`}
 >
 Grid
 </button>
 <button
 onClick={() => setViewMode('priority')}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'priority' ? 'bg-chrome-100 text-chrome-800' : 'text-titanium-600'
 }`}
 >
 Priority
 </button>
 </div>
 </div>

 {/* Treatment Gap Cards */}
 <div className="space-y-4">
 {sortedGaps.map((gap) => (
 <div
 key={gap.id}
 className={`border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer bg-white rounded-lg p-5 border border-titanium-200 ${getUrgencyColor(gap.urgency)}`}
 onClick={() => setSelectedGap(selectedGap?.id === gap.id ? null : gap)}
 >
 {/* Gap Header */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-xl bg-white border border-titanium-200">
 {getCategoryIcon(gap.category)}
 </div>
 <div>
 <div className="flex items-center gap-3 mb-1">
 <h3 className="text-lg font-bold text-titanium-900">{gap.title}</h3>
 <span className={`px-2 py-1 text-xs font-semibold rounded ${getImpactColor(gap.impact)}`}>
 {gap.impact.toUpperCase()} IMPACT
 </span>
 <span className="text-xs bg-titanium-100 text-titanium-700 px-2 py-1 rounded">
 {gap.evidenceLevel}
 </span>
 </div>
 <div className="text-titanium-600">{gap.description}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Affected Patients</div>
 <div 
 className="text-2xl font-bold text-titanium-900 cursor-pointer hover:text-chrome-600 flex items-center gap-1 justify-end"
 onClick={(e) => {
 e.stopPropagation();
 console.log('Patient list for gap:', gap.title);
 }}
 >
 {gap.affectedPatients} <ExternalLink className="w-5 h-5" />
 </div>
 {gap.costSavings && (
 <div className="text-sm text-green-600 font-semibold">
 ${toFixed(gap.costSavings / 1000000, 1)}M savings
 </div>
 )}
 </div>
 </div>

 {/* Gap Summary */}
 <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-titanium-50 rounded-lg border border-titanium-200">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Expected Outcome</div>
 <div className="text-sm text-titanium-800 font-medium">{gap.potentialOutcome}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Action Required</div>
 <div className="text-sm text-titanium-800">{gap.actionRequired}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Time to Close</div>
 <div className="text-sm font-bold text-titanium-900">{gap.estimatedTimeToClose}</div>
 </div>
 </div>

 {/* Assignment and Due Date */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <Users className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700">
 Assigned: <span className="font-medium">{gap.assignedTo || 'Unassigned'}</span>
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700">
 Due: <span className="font-medium">{new Date(gap.dueDate).toLocaleDateString()}</span>
 </span>
 </div>
 </div>
 {gap.qualityMeasure && (
 <div className="text-sm text-chrome-600 font-medium">
 Quality Measure: {gap.qualityMeasure}
 </div>
 )}
 </div>

 {/* Expanded Details */}
 {selectedGap?.id === gap.id && (
 <div className="mt-4 p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Common Barriers</h4>
 <div className="space-y-2">
 {gap.barriers.map((barrier, index) => (
 <div key={barrier} className="flex items-center gap-2 text-sm">
 <AlertTriangle className="w-4 h-4 text-amber-600" />
 <span className="text-titanium-800">{barrier}</span>
 </div>
 ))}
 </div>
 </div>
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Recommended Actions</h4>
 <div className="space-y-3">
 {gap.recommendations.map((rec, index) => (
 <div key={rec.action} className="p-3 bg-white rounded border border-titanium-200">
 <div className="text-sm font-medium text-titanium-900 mb-1">{rec.action}</div>
 <div className="flex items-center justify-between text-xs text-titanium-600">
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 <span>{rec.timeline}</span>
 </div>
 <div className="flex items-center gap-1">
 <Users className="w-3 h-3" />
 <span>{rec.responsibility}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex items-center justify-between pt-4 border-t border-titanium-200">
 <div className="flex gap-3">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 console.log('Start action plan for:', gap.title);
 }}
 className="px-4 py-2 bg-chrome-600 text-white text-sm rounded-lg hover:bg-chrome-700 transition-colors"
 >
 Start Action Plan
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 console.log('Assign to team:', gap.title);
 }}
 className="px-4 py-2 bg-green-100 text-green-800 text-sm rounded-lg hover:bg-green-200 transition-colors border border-green-300"
 >
 Assign to Team
 </button>
 </div>
 <div className="flex items-center gap-2 text-sm text-titanium-600">
 <span>View Details</span>
 <ArrowRight className="w-4 h-4" />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
  );
};

export default EPTreatmentGapsSummary;