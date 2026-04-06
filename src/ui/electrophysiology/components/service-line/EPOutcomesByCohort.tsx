import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Users, Target, Eye, FileText, Activity, ChevronDown, ChevronRight, Calendar, AlertTriangle, Award, Heart, Zap } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface EPOutcome {
  id: string;
  name: string;
  description: string;
  unit: '%' | '#' | 'days' | 'events/100pt-yr';
  cohorts: OutcomeCohort[];
  overallTarget: number;
  clinicalSignificance: 'primary' | 'secondary' | 'safety';
  lastUpdated: string;
}

interface OutcomeCohort {
  cohortName: string;
  cohortType: 'arrhythmia' | 'risk_score' | 'treatment' | 'age_group' | 'comorbidity';
  patientCount: number;
  currentValue: number;
  targetValue: number;
  benchmarkValue: number;
  trend: 'improving' | 'declining' | 'stable';
  trendValue: number;
  confidenceInterval: [number, number];
  statisticalSignificance: 'significant' | 'trending' | 'none';
  keyDrivers: string[];
  riskAdjusted: boolean;
}

interface CohortPatientDetail {
  id: string;
  name: string;
  age: number;
  mrn: string;
  arrhythmia: 'AF' | 'AFL' | 'VT' | 'VF' | 'Bradycardia';
  cha2ds2vasc: number;
  hasbled: number;
  treatmentStatus: string;
  outcomeEvents: string[];
  lastVisit: Date;
}

const EPOutcomesByCohort: React.FC = () => {
  const [selectedOutcome, setSelectedOutcome] = useState<string>('stroke_prevention');
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [showDetailView, setShowDetailView] = useState<string | null>(null);
  const [filterCohortType, setFilterCohortType] = useState<string>('all');

  // EP-specific outcomes data
  const epOutcomes: EPOutcome[] = [
 {
 id: 'stroke_prevention',
 name: 'Stroke Prevention Effectiveness',
 description: 'Annual stroke rate per 100 patient-years by patient cohort',
 unit: 'events/100pt-yr',
 overallTarget: 1.5,
 clinicalSignificance: 'primary',
 lastUpdated: '2024-01-15',
 cohorts: [
 {
 cohortName: 'High CHA₂DS₂-VASc (≥4)',
 cohortType: 'risk_score',
 patientCount: 847,
 currentValue: 2.3,
 targetValue: 1.8,
 benchmarkValue: 3.1,
 trend: 'improving',
 trendValue: -0.4,
 confidenceInterval: [1.9, 2.7],
 statisticalSignificance: 'significant',
 keyDrivers: ['OAC adherence 89%', 'INR control 72%', 'TTR optimization'],
 riskAdjusted: true
 },
 {
 cohortName: 'Moderate CHA₂DS₂-VASc (2-3)',
 cohortType: 'risk_score',
 patientCount: 1246,
 currentValue: 1.2,
 targetValue: 1.0,
 benchmarkValue: 1.8,
 trend: 'stable',
 trendValue: 0.1,
 confidenceInterval: [0.9, 1.5],
 statisticalSignificance: 'none',
 keyDrivers: ['OAC prescription rate 94%', 'Low bleeding risk', 'Good adherence'],
 riskAdjusted: true
 },
 {
 cohortName: 'Low CHA₂DS₂-VASc (0-1)',
 cohortType: 'risk_score',
 patientCount: 394,
 currentValue: 0.4,
 targetValue: 0.5,
 benchmarkValue: 0.7,
 trend: 'improving',
 trendValue: -0.2,
 confidenceInterval: [0.2, 0.6],
 statisticalSignificance: 'trending',
 keyDrivers: ['Rate control focus', 'Lifestyle modification', 'Rhythm monitoring'],
 riskAdjusted: false
 },
 {
 cohortName: 'On Warfarin',
 cohortType: 'treatment',
 patientCount: 789,
 currentValue: 1.8,
 targetValue: 1.2,
 benchmarkValue: 2.4,
 trend: 'declining',
 trendValue: 0.3,
 confidenceInterval: [1.4, 2.2],
 statisticalSignificance: 'significant',
 keyDrivers: ['INR variability', 'Drug interactions', 'Compliance issues'],
 riskAdjusted: true
 },
 {
 cohortName: 'On DOAC',
 cohortType: 'treatment',
 patientCount: 1521,
 currentValue: 1.1,
 targetValue: 1.0,
 benchmarkValue: 1.6,
 trend: 'stable',
 trendValue: -0.1,
 confidenceInterval: [0.8, 1.4],
 statisticalSignificance: 'none',
 keyDrivers: ['High adherence', 'Predictable dosing', 'Reduced interactions'],
 riskAdjusted: true
 }
 ]
 },
 {
 id: 'bleeding_risk',
 name: 'Major Bleeding Events',
 description: 'Annual major bleeding events per 100 patient-years',
 unit: 'events/100pt-yr',
 overallTarget: 2.5,
 clinicalSignificance: 'safety',
 lastUpdated: '2024-01-15',
 cohorts: [
 {
 cohortName: 'High HAS-BLED (≥3)',
 cohortType: 'risk_score',
 patientCount: 623,
 currentValue: 4.2,
 targetValue: 3.0,
 benchmarkValue: 4.8,
 trend: 'improving',
 trendValue: -0.6,
 confidenceInterval: [3.4, 5.0],
 statisticalSignificance: 'significant',
 keyDrivers: ['Reduced dose protocols', 'Enhanced monitoring', 'PPI co-therapy'],
 riskAdjusted: true
 },
 {
 cohortName: 'Moderate HAS-BLED (1-2)',
 cohortType: 'risk_score',
 patientCount: 1089,
 currentValue: 2.1,
 targetValue: 2.0,
 benchmarkValue: 2.7,
 trend: 'stable',
 trendValue: 0.0,
 confidenceInterval: [1.7, 2.5],
 statisticalSignificance: 'none',
 keyDrivers: ['Standard dosing', 'Regular follow-up', 'Risk factor management'],
 riskAdjusted: true
 },
 {
 cohortName: 'Low HAS-BLED (0)',
 cohortType: 'risk_score',
 patientCount: 456,
 currentValue: 0.8,
 targetValue: 1.0,
 benchmarkValue: 1.2,
 trend: 'improving',
 trendValue: -0.2,
 confidenceInterval: [0.5, 1.1],
 statisticalSignificance: 'trending',
 keyDrivers: ['Young age', 'No comorbidities', 'Good medication tolerance'],
 riskAdjusted: false
 }
 ]
 },
 {
 id: 'rhythm_control',
 name: 'Rhythm Control Success',
 description: 'Maintenance of sinus rhythm at 12 months post-intervention',
 unit: '%',
 overallTarget: 75.0,
 clinicalSignificance: 'secondary',
 lastUpdated: '2024-01-15',
 cohorts: [
 {
 cohortName: 'Catheter Ablation',
 cohortType: 'treatment',
 patientCount: 342,
 currentValue: 82.4,
 targetValue: 80.0,
 benchmarkValue: 76.8,
 trend: 'improving',
 trendValue: 3.2,
 confidenceInterval: [77.1, 87.7],
 statisticalSignificance: 'significant',
 keyDrivers: ['Operator experience', 'Pulmonary vein isolation', 'Post-ablation care'],
 riskAdjusted: true
 },
 {
 cohortName: 'Antiarrhythmic Drugs',
 cohortType: 'treatment',
 patientCount: 567,
 currentValue: 68.3,
 targetValue: 70.0,
 benchmarkValue: 65.2,
 trend: 'stable',
 trendValue: 0.8,
 confidenceInterval: [64.1, 72.5],
 statisticalSignificance: 'none',
 keyDrivers: ['Drug tolerance', 'Dosing optimization', 'Patient adherence'],
 riskAdjusted: true
 },
 {
 cohortName: 'Rate Control Only',
 cohortType: 'treatment',
 patientCount: 894,
 currentValue: 28.7,
 targetValue: 30.0,
 benchmarkValue: 25.4,
 trend: 'stable',
 trendValue: 1.2,
 confidenceInterval: [25.8, 31.6],
 statisticalSignificance: 'none',
 keyDrivers: ['Spontaneous conversion', 'Cardioversion attempts', 'Rate adequacy'],
 riskAdjusted: false
 }
 ]
 },
 {
 id: 'device_outcomes',
 name: 'Device Therapy Outcomes',
 description: 'Appropriate device therapy delivery and patient outcomes',
 unit: '%',
 overallTarget: 90.0,
 clinicalSignificance: 'primary',
 lastUpdated: '2024-01-15',
 cohorts: [
 {
 cohortName: 'ICD Recipients',
 cohortType: 'treatment',
 patientCount: 456,
 currentValue: 88.2,
 targetValue: 90.0,
 benchmarkValue: 85.7,
 trend: 'improving',
 trendValue: 2.4,
 confidenceInterval: [84.8, 91.6],
 statisticalSignificance: 'trending',
 keyDrivers: ['Appropriate programming', 'Regular follow-up', 'Lead optimization'],
 riskAdjusted: true
 },
 {
 cohortName: 'CRT-D Recipients',
 cohortType: 'treatment',
 patientCount: 289,
 currentValue: 84.1,
 targetValue: 85.0,
 benchmarkValue: 81.3,
 trend: 'stable',
 trendValue: 0.3,
 confidenceInterval: [79.2, 89.0],
 statisticalSignificance: 'none',
 keyDrivers: ['Lead positioning', 'AV delay optimization', 'Response monitoring'],
 riskAdjusted: true
 },
 {
 cohortName: 'Pacemaker Recipients',
 cohortType: 'treatment',
 patientCount: 634,
 currentValue: 94.7,
 targetValue: 92.0,
 benchmarkValue: 91.5,
 trend: 'improving',
 trendValue: 1.8,
 confidenceInterval: [92.1, 97.3],
 statisticalSignificance: 'significant',
 keyDrivers: ['Minimal complications', 'Good programming', 'Patient satisfaction'],
 riskAdjusted: false
 }
 ]
 },
 {
 id: 'quality_of_life',
 name: 'Quality of Life Improvement',
 description: 'AF Effect on Quality of Life (AFEQT) score improvement at 6 months',
 unit: '%',
 overallTarget: 60.0,
 clinicalSignificance: 'secondary',
 lastUpdated: '2024-01-15',
 cohorts: [
 {
 cohortName: 'Successful Ablation',
 cohortType: 'treatment',
 patientCount: 278,
 currentValue: 78.4,
 targetValue: 75.0,
 benchmarkValue: 71.2,
 trend: 'improving',
 trendValue: 4.1,
 confidenceInterval: [73.6, 83.2],
 statisticalSignificance: 'significant',
 keyDrivers: ['Symptom reduction', 'Exercise tolerance', 'Medication reduction'],
 riskAdjusted: true
 },
 {
 cohortName: 'Rate Control Success',
 cohortType: 'treatment',
 patientCount: 892,
 currentValue: 54.2,
 targetValue: 55.0,
 benchmarkValue: 48.7,
 trend: 'stable',
 trendValue: 0.8,
 confidenceInterval: [50.8, 57.6],
 statisticalSignificance: 'none',
 keyDrivers: ['Heart rate control', 'Symptom management', 'Activity tolerance'],
 riskAdjusted: true
 },
 {
 cohortName: 'Failed Rhythm Control',
 cohortType: 'treatment',
 patientCount: 345,
 currentValue: 32.1,
 targetValue: 40.0,
 benchmarkValue: 29.4,
 trend: 'declining',
 trendValue: -2.3,
 confidenceInterval: [27.8, 36.4],
 statisticalSignificance: 'significant',
 keyDrivers: ['Persistent symptoms', 'Drug side effects', 'Psychological impact'],
 riskAdjusted: true
 }
 ]
 }
  ];

  const selectedOutcomeData = epOutcomes.find(o => o.id === selectedOutcome)!;
  
  const filteredCohorts = selectedOutcomeData.cohorts.filter(cohort => {
 if (filterCohortType === 'all') return true;
 return cohort.cohortType === filterCohortType;
  });

  const getPerformanceColor = (current: number, target: number, isLowerBetter: boolean = false) => {
 let performance;
 if (isLowerBetter) {
 performance = current <= target ? 'excellent' : current <= target * 1.2 ? 'good' : 'poor';
 } else {
 performance = current >= target ? 'excellent' : current >= target * 0.8 ? 'good' : 'poor';
 }
 
 switch (performance) {
 case 'excellent': return 'text-teal-700 bg-chrome-50 border-titanium-300';
 case 'good': return 'text-crimson-700 bg-crimson-50 border-crimson-200';
 default: return 'text-medical-red-700 bg-medical-red-50 border-medical-red-200';
 }
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
 switch (trend) {
 case 'improving':
 return <TrendingUp className="w-4 h-4 text-teal-700" />;
 case 'declining':
 return <TrendingDown className="w-4 h-4 text-medical-red-600" />;
 default:
 return <div className="w-4 h-4 bg-titanium-400 rounded-full"></div>;
 }
  };

  const getSignificanceColor = (significance: string) => {
 switch (significance) {
 case 'significant':
 return 'bg-porsche-100 text-porsche-800 border-porsche-200';
 case 'trending':
 return 'bg-crimson-100 text-crimson-700 border-crimson-200';
 default:
 return 'bg-titanium-100 text-titanium-600 border-titanium-200';
 }
  };

  const formatValue = (value: number, unit: string) => {
 if (unit === '%') return `${toFixed(value, 1)}%`;
 if (unit === 'days') return `${toFixed(value, 0)} days`;
 if (unit === 'events/100pt-yr') return `${toFixed(value, 1)}`;
 return toFixed(value, 1);
  };

  const getClinicalSignificanceColor = (significance: string) => {
 switch (significance) {
 case 'primary': return 'medical-red';
 case 'secondary': return 'porsche';  
 case 'safety': return 'crimson';
 default: return 'titanium';
 }
  };

  const isLowerBetter = selectedOutcome === 'stroke_prevention' || selectedOutcome === 'bleeding_risk';

  const handleCohortClick = (cohortName: string) => {
 setSelectedCohort(cohortName);
 console.log('Opening cohort drill-down for:', selectedOutcomeData.name, '-', cohortName);
 {};
  };

  return (
 <div className="metal-card p-8">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 EP Outcomes by Patient Cohort
 </h2>
 <p className="text-titanium-600">
 Clinical outcomes comparison across patient subgroups • Click cohorts for detailed analysis
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <BarChart3 className="w-4 h-4 text-titanium-600" />
 <select
 value={selectedOutcome}
 onChange={(e) => setSelectedOutcome(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 {epOutcomes.map((outcome) => (
 <option key={outcome.id} value={outcome.id}>
 {outcome.name}
 </option>
 ))}
 </select>
 </div>
 <div className="flex items-center gap-2">
 <Target className="w-4 h-4 text-titanium-600" />
 <select
 value={filterCohortType}
 onChange={(e) => setFilterCohortType(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 <option value="all">All Cohorts</option>
 <option value="risk_score">Risk Scores</option>
 <option value="treatment">Treatment Groups</option>
 <option value="age_group">Age Groups</option>
 <option value="comorbidity">Comorbidities</option>
 <option value="arrhythmia">Arrhythmia Types</option>
 </select>
 </div>
 </div>
 </div>

 {/* Outcome Overview */}
 <div className={`p-4 rounded-xl border-2 border-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-200 bg-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-50 mb-6`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={`p-3 rounded-lg bg-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-100`}>
 {selectedOutcomeData.clinicalSignificance === 'primary' ? (
 <Heart className={`w-6 h-6 text-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-600`} />
 ) : selectedOutcomeData.clinicalSignificance === 'safety' ? (
 <AlertTriangle className={`w-6 h-6 text-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-600`} />
 ) : (
 <Activity className={`w-6 h-6 text-${getClinicalSignificanceColor(selectedOutcomeData.clinicalSignificance)}-600`} />
 )}
 </div>
 <div>
 <h3 className="text-xl font-semibold text-titanium-900 mb-1">
 {selectedOutcomeData.name}
 </h3>
 <p className="text-sm text-titanium-600">{selectedOutcomeData.description}</p>
 <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border mt-2 ${
 selectedOutcomeData.clinicalSignificance === 'primary' ? 'bg-medical-red-100 text-medical-red-800 border-medical-red-200' :
 selectedOutcomeData.clinicalSignificance === 'safety' ? 'bg-crimson-100 text-crimson-700 border-crimson-200' :
 'bg-porsche-100 text-porsche-800 border-porsche-200'
 }`}>
 {selectedOutcomeData.clinicalSignificance.toUpperCase()} ENDPOINT
 </div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-3xl font-bold text-titanium-900">
 {formatValue(selectedOutcomeData.overallTarget, selectedOutcomeData.unit)}
 </div>
 <div className="text-sm text-titanium-600">Target Performance</div>
 <div className="text-xs text-titanium-500 mt-1">
 Last updated: {new Date(selectedOutcomeData.lastUpdated).toLocaleDateString()}
 </div>
 </div>
 </div>
 </div>

 {/* Cohort Comparison Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
 {filteredCohorts.map((cohort, index) => (
 <button
 key={cohort.cohortName}
 onClick={() => handleCohortClick(cohort.cohortName)}
 className="p-4 rounded-xl border-2 border-titanium-200 hover:border-titanium-300 hover:shadow-chrome-card-hover transition-all duration-300 text-left bg-white"
 >
 {/* Cohort Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="font-semibold text-titanium-900 mb-1">{cohort.cohortName}</div>
 <div className="text-xs text-titanium-600 mb-2">
 {cohort.patientCount.toLocaleString()} patients • {cohort.riskAdjusted ? 'Risk-adjusted' : 'Unadjusted'}
 </div>
 <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getSignificanceColor(cohort.statisticalSignificance)}`}>
 {cohort.statisticalSignificance === 'significant' ? 'Statistically Significant' :
 cohort.statisticalSignificance === 'trending' ? 'Clinically Trending' : 'Not Significant'}
 </div>
 </div>
 <div className="flex items-center gap-2 ml-4">
 {getTrendIcon(cohort.trend)}
 <span className={`text-sm font-semibold ${
 cohort.trend === 'improving' ? 'text-teal-700' :
 cohort.trend === 'declining' ? 'text-medical-red-600' : 'text-titanium-600'
 }`}>
 {cohort.trend !== 'stable' && (cohort.trendValue > 0 ? '+' : '')}{toFixed(cohort.trendValue, 1)}
 </span>
 </div>
 </div>

 {/* Performance Metrics */}
 <div className="grid grid-cols-3 gap-3 mb-4">
 <div className={`text-center p-3 rounded-lg border ${getPerformanceColor(cohort.currentValue, cohort.targetValue, isLowerBetter)}`}>
 <div className="text-xl font-bold">
 {formatValue(cohort.currentValue, selectedOutcomeData.unit)}
 </div>
 <div className="text-xs">Current</div>
 </div>
 <div className="text-center p-3 rounded-lg bg-titanium-50 border border-titanium-200">
 <div className="text-xl font-bold text-titanium-900">
 {formatValue(cohort.targetValue, selectedOutcomeData.unit)}
 </div>
 <div className="text-xs text-titanium-600">Target</div>
 </div>
 <div className="text-center p-3 rounded-lg bg-porsche-50 border border-porsche-200">
 <div className="text-xl font-bold text-porsche-700">
 {formatValue(cohort.benchmarkValue, selectedOutcomeData.unit)}
 </div>
 <div className="text-xs text-porsche-600">Benchmark</div>
 </div>
 </div>

 {/* Confidence Interval */}
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">
 95% CI: {formatValue(cohort.confidenceInterval[0], selectedOutcomeData.unit)} - {formatValue(cohort.confidenceInterval[1], selectedOutcomeData.unit)}
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-700 ${
 (isLowerBetter ? cohort.currentValue <= cohort.targetValue : cohort.currentValue >= cohort.targetValue) 
 ? 'bg-teal-700' 
 : 'bg-medical-red-500'
 }`}
 style={{
 width: `${Math.min(
 Math.abs((cohort.currentValue / cohort.targetValue) * 100), 
 100
 )}%`
 }}
 />
 </div>
 </div>

 {/* Key Drivers */}
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-2">Key Performance Drivers:</div>
 <div className="flex flex-wrap gap-1">
 {cohort.keyDrivers.slice(0, 2).map((driver, idx) => (
 <span key={driver} className="px-2 py-1 bg-porsche-100 text-porsche-700 text-xs rounded">
 {driver}
 </span>
 ))}
 {cohort.keyDrivers.length > 2 && (
 <span className="px-2 py-1 bg-titanium-100 text-titanium-600 text-xs rounded">
 +{cohort.keyDrivers.length - 2} more
 </span>
 )}
 </div>
 </div>

 {/* Expandable Detail View */}
 <div className="flex items-center justify-between text-xs text-titanium-600">
 <div className="flex items-center gap-1">
 <Users className="w-3 h-3" />
 <span>{cohort.patientCount.toLocaleString()} patients</span>
 </div>
 <div className="flex items-center gap-1 text-porsche-600 hover:text-porsche-700">
 <span>View Details</span>
 <ChevronRight className="w-3 h-3" />
 </div>
 </div>
 </button>
 ))}
 </div>

 {/* Comparative Analysis Summary */}
 <div className="grid grid-cols-4 gap-4 pt-6 border-t border-titanium-200 mb-6">
 <div>
 <div className="text-sm text-titanium-600 mb-1">Best Performing Cohort</div>
 <div className="text-lg font-bold text-teal-700">
 {filteredCohorts.reduce((best, current) => 
 (isLowerBetter ? current.currentValue < best.currentValue : current.currentValue > best.currentValue) 
 ? current : best
 ).cohortName.split(' ')[0]}...
 </div>
 <div className="text-sm text-titanium-600">
 {formatValue(
 filteredCohorts.reduce((best, current) => 
 (isLowerBetter ? current.currentValue < best.currentValue : current.currentValue > best.currentValue) 
 ? current : best
 ).currentValue, 
 selectedOutcomeData.unit
 )}
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Needs Intervention</div>
 <div className="text-lg font-bold text-medical-red-600">
 {filteredCohorts.reduce((worst, current) => 
 (isLowerBetter ? current.currentValue > worst.currentValue : current.currentValue < worst.currentValue) 
 ? current : worst
 ).cohortName.split(' ')[0]}...
 </div>
 <div className="text-sm text-titanium-600">
 {formatValue(
 filteredCohorts.reduce((worst, current) => 
 (isLowerBetter ? current.currentValue > worst.currentValue : current.currentValue < worst.currentValue) 
 ? current : worst
 ).currentValue, 
 selectedOutcomeData.unit
 )}
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Improving Trends</div>
 <div className="text-lg font-bold text-teal-700">
 {filteredCohorts.filter(c => c.trend === 'improving').length}
 </div>
 <div className="text-sm text-titanium-600">
 of {filteredCohorts.length} cohorts
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Total Patients</div>
 <div className="text-lg font-bold text-porsche-600">
 {filteredCohorts.reduce((sum, c) => sum + c.patientCount, 0).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">
 In analysis
 </div>
 </div>
 </div>

 {/* Clinical Insights */}
 <div className="p-4 bg-porsche-50 rounded-xl border border-porsche-200">
 <h4 className="font-semibold text-porsche-900 mb-3 flex items-center gap-2">
 <Eye className="w-5 h-5" />
 Clinical Insights & Action Items
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredCohorts
 .filter(c => c.statisticalSignificance === 'significant' && 
 (isLowerBetter ? c.currentValue > c.targetValue : c.currentValue < c.targetValue))
 .slice(0, 2)
 .map((cohort, index) => (
 <div key={cohort.cohortName} className="p-3 bg-white rounded-lg border border-porsche-100">
 <div className="font-medium text-titanium-900 mb-1">{cohort.cohortName}</div>
 <div className="text-sm text-titanium-600 mb-2">
 Performance gap: {toFixed(Math.abs(cohort.currentValue - cohort.targetValue), 1)}{selectedOutcomeData.unit} from target
 </div>
 <div className="text-sm text-porsche-800">
 <strong>Key Action:</strong> Focus on {cohort.keyDrivers[0]} optimization and enhanced monitoring protocols.
 </div>
 <button
 onClick={() => {
 console.log('Opening intervention protocol for:', cohort.cohortName);
 {};
 }}
 className="mt-2 text-xs bg-porsche-500 text-white px-3 py-1 rounded hover:bg-porsche-600 transition-colors"
 >
 View Protocol
 </button>
 </div>
 ))}
 </div>
 
 {filteredCohorts.filter(c => c.statisticalSignificance === 'significant' && 
 (isLowerBetter ? c.currentValue > c.targetValue : c.currentValue < c.targetValue)).length === 0 && (
 <div className="text-sm text-porsche-800">
 <strong>Good News:</strong> All cohorts are meeting or approaching target performance levels. Continue monitoring for sustained outcomes.
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 mt-6">
 <button 
 className="flex items-center gap-2 px-4 py-2 bg-porsche-600 text-white rounded-lg hover:bg-porsche-700 transition-colors"
 onClick={() => {
 console.log('Generating outcomes analysis report for:', selectedOutcomeData.name);
 {};
 }}
 >
 <FileText className="w-4 h-4" />
 Generate Report
 </button>
 <button 
 className="flex items-center gap-2 px-4 py-2 bg-white border border-titanium-300 text-titanium-700 rounded-lg hover:bg-titanium-50 transition-colors"
 onClick={() => {
 console.log('Opening comparative analysis tool');
 {};
 }}
 >
 <BarChart3 className="w-4 h-4" />
 Compare Cohorts
 </button>
 <button 
 className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-700 transition-colors"
 onClick={() => {
 console.log('Opening quality improvement planning tool');
 {};
 }}
 >
 <Target className="w-4 h-4" />
 Plan Improvements
 </button>
 </div>
 </div>
  );
};

export default EPOutcomesByCohort;