import React, { useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, CheckCircle, Users, Calendar, ArrowRight, ExternalLink, X, Heart, Zap, Shield, Pill, FileText, Activity, ChevronRight } from 'lucide-react';

interface EPTreatmentGap {
  id: string;
  category: 'Anticoagulation' | 'Rate_Control' | 'Rhythm_Control' | 'Device';
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'moderate';
  urgency: 'urgent' | 'soon' | 'routine';
  affectedPatients: number;
  potentialOutcome: string;
  actionRequired: string;
  estimatedTimeToClose: string;
  assignedTo?: string;
  dueDate: string;
  evidenceLevel: 'Class I' | 'Class IIa' | 'Class IIb' | 'Class III';
  strokeRiskReduction?: number;
  qualityMeasure?: string;
  barriers: string[];
  recommendations: {
 action: string;
 timeline: string;
 responsibility: string;
  }[];
}

interface GapSummary {
  totalGaps: number;
  criticalGaps: number;
  urgent: number;
  avgClosureTime: number;
  totalPotentialStrokePrevention: number;
  complianceRate: number;
}

const EPGapAnalysisPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGap, setSelectedGap] = useState<EPTreatmentGap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'priority'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const treatmentGaps: EPTreatmentGap[] = [
 {
 id: 'EPGAP001',
 category: 'Anticoagulation',
 title: 'OAC Not Prescribed (CHA₂DS₂-VASc ≥2)',
 description: '47 AF patients with CHA₂DS₂-VASc ≥2 not on oral anticoagulation',
 impact: 'critical',
 urgency: 'urgent',
 affectedPatients: 47,
 potentialOutcome: '65% stroke risk reduction with appropriate OAC therapy',
 actionRequired: 'Risk stratification, bleeding assessment, OAC initiation',
 estimatedTimeToClose: '2-4 weeks',
 assignedTo: 'Dr. Johnson',
 dueDate: '2025-01-15',
 evidenceLevel: 'Class I',
 strokeRiskReduction: 65,
 qualityMeasure: 'AF Anticoagulation Quality',
 barriers: ['Bleeding concerns', 'Patient resistance', 'Cost concerns'],
 recommendations: [
 {
 action: 'Bleeding risk stratification using HAS-BLED score',
 timeline: '1 week',
 responsibility: 'EP Attending',
 },
 {
 action: 'Patient education on stroke vs bleeding risk',
 timeline: '2 weeks',
 responsibility: 'Care Team',
 },
 {
 action: 'DOAC vs warfarin shared decision making',
 timeline: '3 weeks',
 responsibility: 'EP Nurse',
 },
 ],
 },
 {
 id: 'EPGAP002',
 category: 'Anticoagulation',
 title: 'Subtherapeutic OAC Dosing',
 description: '23 patients on inadequate anticoagulation dosing',
 impact: 'high',
 urgency: 'urgent',
 affectedPatients: 23,
 potentialOutcome: 'Improved stroke protection through dose optimization',
 actionRequired: 'Dose adjustment, renal function assessment, monitoring',
 estimatedTimeToClose: '1-2 weeks',
 assignedTo: 'Clinical Pharmacist',
 dueDate: '2025-01-08',
 evidenceLevel: 'Class I',
 strokeRiskReduction: 35,
 qualityMeasure: 'Anticoagulation Effectiveness',
 barriers: ['Renal impairment', 'Drug interactions', 'Patient adherence'],
 recommendations: [
 {
 action: 'Comprehensive medication review',
 timeline: '3 days',
 responsibility: 'Clinical Pharmacist',
 },
 {
 action: 'Renal function-based dose adjustment',
 timeline: '1 week',
 responsibility: 'EP Provider',
 },
 ],
 },
 {
 id: 'EPGAP003',
 category: 'Anticoagulation',
 title: 'INR Out of Range (Warfarin)',
 description: '15 warfarin patients with INR outside therapeutic range',
 impact: 'high',
 urgency: 'soon',
 affectedPatients: 15,
 potentialOutcome: 'Reduced stroke and bleeding risk through INR optimization',
 actionRequired: 'INR monitoring, dose adjustment, dietary counseling',
 estimatedTimeToClose: '2-3 weeks',
 assignedTo: 'Anticoagulation Clinic',
 dueDate: '2025-01-22',
 evidenceLevel: 'Class I',
 strokeRiskReduction: 40,
 barriers: ['Dietary interactions', 'Medication compliance', 'Frequent monitoring'],
 recommendations: [
 {
 action: 'Enhanced INR monitoring schedule',
 timeline: '1 week',
 responsibility: 'Anticoag Clinic',
 },
 {
 action: 'Dietary counseling and education',
 timeline: '2 weeks',
 responsibility: 'Nutritionist',
 },
 ],
 },
 {
 id: 'EPGAP004',
 category: 'Rate_Control',
 title: 'Uncontrolled Ventricular Rate',
 description: '31 AF patients with inadequate heart rate control',
 impact: 'high',
 urgency: 'soon',
 affectedPatients: 31,
 potentialOutcome: 'Improved symptoms and cardiac function',
 actionRequired: 'Beta-blocker optimization, CCB consideration, monitoring',
 estimatedTimeToClose: '3-4 weeks',
 assignedTo: 'Dr. Chen',
 dueDate: '2025-02-01',
 evidenceLevel: 'Class I',
 qualityMeasure: 'AF Rate Control',
 barriers: ['Hypotension risk', 'Bradycardia concerns', 'Drug interactions'],
 recommendations: [
 {
 action: 'Beta-blocker titration protocol',
 timeline: '2 weeks',
 responsibility: 'EP Provider',
 },
 {
 action: 'Ambulatory heart rate monitoring',
 timeline: '3 weeks',
 responsibility: 'EP Lab',
 },
 ],
 },
 {
 id: 'EPGAP005',
 category: 'Rhythm_Control',
 title: 'Ablation Candidate Not Referred',
 description: '18 symptomatic AF patients eligible for catheter ablation',
 impact: 'high',
 urgency: 'soon',
 affectedPatients: 18,
 potentialOutcome: 'Improved quality of life and reduced AF burden',
 actionRequired: 'EP consultation, imaging assessment, patient counseling',
 estimatedTimeToClose: '4-6 weeks',
 assignedTo: 'Dr. Martinez',
 dueDate: '2025-02-15',
 evidenceLevel: 'Class I',
 qualityMeasure: 'AF Ablation Utilization',
 barriers: ['Patient anxiety', 'Insurance authorization', 'Procedure risks'],
 recommendations: [
 {
 action: 'EP consultation for ablation evaluation',
 timeline: '2 weeks',
 responsibility: 'Primary Team',
 },
 {
 action: 'Patient education on ablation benefits',
 timeline: '4 weeks',
 responsibility: 'EP Nurse',
 },
 ],
 },
 {
 id: 'EPGAP006',
 category: 'Device',
 title: 'Pacemaker Candidates',
 description: '12 patients with symptomatic bradycardia requiring pacemaker',
 impact: 'critical',
 urgency: 'urgent',
 affectedPatients: 12,
 potentialOutcome: 'Prevention of syncope and sudden cardiac death',
 actionRequired: 'Device evaluation, pre-procedure workup, implantation',
 estimatedTimeToClose: '2-3 weeks',
 assignedTo: 'Device Team',
 dueDate: '2025-01-20',
 evidenceLevel: 'Class I',
 qualityMeasure: 'Appropriate Device Therapy',
 barriers: ['Patient reluctance', 'Surgical risk', 'Device selection'],
 recommendations: [
 {
 action: 'Urgent device clinic referral',
 timeline: '3 days',
 responsibility: 'EP Provider',
 },
 {
 action: 'Pre-procedure risk assessment',
 timeline: '1 week',
 responsibility: 'Device Team',
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
 const impactWeight = { critical: 4, high: 3, moderate: 2 };
 
 const aScore = urgencyWeight[a.urgency] + impactWeight[a.impact];
 const bScore = urgencyWeight[b.urgency] + impactWeight[b.impact];
 
 return bScore - aScore;
 }
 return 0;
  });

  const summary: GapSummary = {
 totalGaps: treatmentGaps.length,
 criticalGaps: treatmentGaps.filter(g => g.impact === 'critical').length,
 urgent: treatmentGaps.filter(g => g.urgency === 'urgent').length,
 avgClosureTime: 2.8,
 totalPotentialStrokePrevention: treatmentGaps.reduce((sum, g) => sum + (g.strokeRiskReduction || 0), 0),
 complianceRate: 72.4,
  };

  const toggleCategoryExpansion = (category: string) => {
 const newExpanded = new Set(expandedCategories);
 if (newExpanded.has(category)) {
 newExpanded.delete(category);
 } else {
 newExpanded.add(category);
 }
 setExpandedCategories(newExpanded);
  };

  const getImpactColor = (impact: string) => {
 const colors = {
 critical: 'text-red-600 bg-red-100 border-red-300',
 high: 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]',
 moderate: 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]',
 };
 return colors[impact as keyof typeof colors];
  };

  const getUrgencyColor = (urgency: string) => {
 const colors = {
 urgent: 'border-l-red-500 bg-red-50',
 soon: 'border-l-[#6B7280] bg-[#F0F5FA]',
 routine: 'border-l-[#2C4A60] bg-[#C8D4DC]',
 };
 return colors[urgency as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
 const icons = {
 Anticoagulation: <Shield className="w-5 h-5 text-chrome-600" />,
 Rate_Control: <Heart className="w-5 h-5 text-[#2C4A60]" />,
 Rhythm_Control: <Zap className="w-5 h-5 text-arterial-600" />,
 Device: <Activity className="w-5 h-5 text-chrome-600" />,
 };
 return icons[category as keyof typeof icons];
  };

  const categorizedGaps = {
 'Anticoagulation Gaps': treatmentGaps.filter(g => g.category === 'Anticoagulation'),
 'Rate Control Gaps': treatmentGaps.filter(g => g.category === 'Rate_Control'),
 'Rhythm Control Gaps': treatmentGaps.filter(g => g.category === 'Rhythm_Control'),
 'Device Gaps': treatmentGaps.filter(g => g.category === 'Device'),
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 flex items-center gap-2">
 <AlertTriangle className="w-6 h-6 text-[#6B7280]" />
 EP Treatment Gap Analysis
 </h2>
 <p className="text-titanium-600">
 Identify and prioritize EP care optimization opportunities
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Stroke Risk Reduction</div>
 <div className="text-3xl font-bold text-chrome-600">
 {summary.totalPotentialStrokePrevention}%
 </div>
 <div className="text-sm text-titanium-600">Total opportunity</div>
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
 onClick={() => console.log('Critical gaps drill-down')}
 >
 <div className="text-3xl font-bold text-red-600 mb-1">{summary.criticalGaps}</div>
 <div className="text-sm text-titanium-600">Critical</div>
 </div>
 <div 
 className="p-4 text-center bg-[#F0F5FA] rounded-lg border border-[#C8D4DC] cursor-pointer hover:bg-[#F0F5FA] transition-colors"
 onClick={() => console.log('Urgent gaps drill-down')}
 >
 <div className="text-3xl font-bold text-[#6B7280] mb-1">{summary.urgent}</div>
 <div className="text-sm text-titanium-600">Urgent</div>
 </div>
 <div className="p-4 text-center bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="text-3xl font-bold text-titanium-900 mb-1">{summary.avgClosureTime}</div>
 <div className="text-sm text-titanium-600">Avg Weeks</div>
 </div>
 <div className="p-4 text-center bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="text-3xl font-bold text-chrome-600 mb-1">{summary.complianceRate}%</div>
 <div className="text-sm text-titanium-600">Compliance</div>
 </div>
 </div>

 {/* Categorized Gap View */}
 <div className="space-y-4 mb-6">
 <h3 className="text-lg font-semibold text-titanium-900">Treatment Gaps by Category</h3>
 {Object.entries(categorizedGaps).map(([categoryName, gaps]) => (
 <div key={categoryName} className="border border-titanium-200 rounded-lg">
 <div 
 className="flex items-center justify-between p-4 cursor-pointer hover:bg-titanium-50 transition-colors"
 onClick={() => {
 toggleCategoryExpansion(categoryName);
 console.log('Gap category clicked:', categoryName, gaps.length);
 }}
 >
 <div className="flex items-center gap-3">
 {getCategoryIcon(gaps[0]?.category || '')}
 <div>
 <h4 className="text-lg font-semibold text-titanium-900">{categoryName}</h4>
 <p className="text-sm text-titanium-600">{gaps.length} gaps affecting {gaps.reduce((sum, g) => sum + g.affectedPatients, 0)} patients</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-right">
 <div className="text-sm text-titanium-600">Critical</div>
 <div className="text-2xl font-bold text-red-600">{gaps.filter(g => g.impact === 'critical').length}</div>
 </div>
 <ChevronRight className={`w-5 h-5 text-titanium-400 transition-transform ${
 expandedCategories.has(categoryName) ? 'rotate-90' : ''
 }`} />
 </div>
 </div>

 {expandedCategories.has(categoryName) && (
 <div className="border-t border-titanium-200 bg-titanium-50">
 <div className="p-4 space-y-3">
 {gaps.map((gap) => (
 <div 
 key={gap.id}
 className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${getUrgencyColor(gap.urgency)} bg-white`}
 onClick={() => {
 setSelectedGap(gap);
 console.log('Individual gap clicked:', gap.title, gap.affectedPatients);
 }}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <h5 className="font-semibold text-titanium-900">{gap.title}</h5>
 <span className={`px-2 py-1 text-xs font-semibold rounded border ${getImpactColor(gap.impact)}`}>
 {gap.impact.toUpperCase()}
 </span>
 </div>
 <p className="text-sm text-titanium-700 mb-2">{gap.description}</p>
 <div className="text-xs text-titanium-600">
 <span className="font-medium">{gap.affectedPatients}</span> patients • 
 <span className="ml-2">{gap.evidenceLevel}</span> • 
 <span className="ml-2">Due {new Date(gap.dueDate).toLocaleDateString()}</span>
 </div>
 </div>
 <div 
 className="ml-4 text-center cursor-pointer hover:bg-chrome-50 p-2 rounded-lg transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 console.log('Patient list for gap:', gap.title, gap.affectedPatients);
 }}
 >
 <div className="text-2xl font-bold text-chrome-600">{gap.affectedPatients}</div>
 <div className="text-xs text-chrome-600">patients</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Controls */}
 <div className="flex items-center justify-between mb-6 p-4 bg-titanium-50 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-4">
 <span className="text-sm font-medium text-titanium-700">Category:</span>
 <select
 value={selectedCategory}
 onChange={(e) => {
 setSelectedCategory(e.target.value);
 console.log('Filter changed:', e.target.value);
 }}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-chrome-500"
 >
 <option value="all">All Categories</option>
 <option value="Anticoagulation">Anticoagulation</option>
 <option value="Rate_Control">Rate Control</option>
 <option value="Rhythm_Control">Rhythm Control</option>
 <option value="Device">Device</option>
 </select>
 </div>
 
 <div className="flex items-center gap-2">
 <span className="text-sm text-titanium-600">View:</span>
 <button
 onClick={() => {
 setViewMode('grid');
 console.log('View mode changed:', 'grid');
 }}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'grid' ? 'bg-chrome-100 text-chrome-800' : 'text-titanium-600'
 }`}
 >
 Grid
 </button>
 <button
 onClick={() => {
 setViewMode('priority');
 console.log('View mode changed:', 'priority');
 }}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'priority' ? 'bg-chrome-100 text-chrome-800' : 'text-titanium-600'
 }`}
 >
 Priority
 </button>
 </div>
 </div>

 {/* Gap Detail Cards (when not in categorized view) */}
 {selectedCategory !== 'all' && (
 <div className="space-y-4">
 {sortedGaps.map((gap) => (
 <div
 key={gap.id}
 className={`border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer bg-white rounded-lg p-5 border border-titanium-200 ${getUrgencyColor(gap.urgency)}`}
 onClick={() => {
 setSelectedGap(selectedGap?.id === gap.id ? null : gap);
 console.log('Gap card clicked:', gap.title);
 }}
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
 <span className={`px-2 py-1 text-xs font-semibold rounded border ${getImpactColor(gap.impact)}`}>
 {gap.impact.toUpperCase()}
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
 console.log('Patient list for:', gap.title, gap.affectedPatients);
 }}
 >
 {gap.affectedPatients} <ExternalLink className="w-5 h-5" />
 </div>
 {gap.strokeRiskReduction && (
 <div className="text-sm text-chrome-600 font-semibold">
 {gap.strokeRiskReduction}% stroke reduction
 </div>
 )}
 </div>
 </div>

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
 className="px-4 py-2 bg-[#C8D4DC] text-[#2C4A60] text-sm rounded-lg hover:bg-[#C8D4DC] transition-colors border border-[#2C4A60]"
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
 )}
 </div>
  );
};

export default EPGapAnalysisPanel;