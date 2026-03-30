import React, { useState } from 'react';
import { demoAction } from '../../../../utils/demoActions';
import { Target, TrendingUp, Award, AlertTriangle, Users, Calendar, ChevronDown, ChevronRight, Eye, FileText, Activity, Clock, Zap, Heart, Shield } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface QualityMetric {
  id: string;
  name: string;
  category: 'Clinical' | 'Safety' | 'Outcomes';
  currentValue: number;
  targetValue: number;
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  unit: '%' | 'days' | 'ratio';
  riskAdjusted: boolean;
  patientCount: number;
  lastUpdated: string;
  description: string;
  opportunities: {
 description: string;
 impact: number;
 difficulty: 'Low' | 'Medium' | 'High';
  }[];
  patientCohorts?: {
 name: string;
 count: number;
 percentage: number;
 riskLevel: 'high' | 'medium' | 'low';
  }[];
  trendData?: {
 period: string;
 value: number;
 change: number;
  }[];
}

const EPQualityMetrics: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<QualityMetric['category']>('Clinical');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState<string | null>(null);

  const qualityMetrics: QualityMetric[] = [
 {
 id: 'af-anticoag-rate',
 name: 'AF Anticoagulation Rate',
 category: 'Clinical',
 currentValue: 87.2,
 targetValue: 95.0,
 benchmark: 82.4,
 trend: 'up',
 trendValue: 4.8,
 unit: '%',
 riskAdjusted: true,
 patientCount: 1847,
 lastUpdated: '2024-12-10',
 description: 'Percentage of AF patients with CHA₂DS₂-VASc ≥2 on anticoagulation',
 opportunities: [
 { description: 'DOAC transition from warfarin', impact: 12, difficulty: 'Low' },
 { description: 'Address bleeding risk concerns', impact: 8, difficulty: 'Medium' },
 { description: 'Patient education initiatives', impact: 6, difficulty: 'Low' },
 ],
 patientCohorts: [
 { name: 'On optimal DOAC therapy', count: 985, percentage: 53.4, riskLevel: 'low' },
 { name: 'On warfarin with good INR control', count: 624, percentage: 33.8, riskLevel: 'low' },
 { name: 'Subtherapeutic anticoagulation', count: 152, percentage: 8.2, riskLevel: 'high' },
 { name: 'No anticoagulation (high bleeding risk)', count: 86, percentage: 4.6, riskLevel: 'medium' },
 ],
 trendData: [
 { period: 'Q1 2024', value: 79.1, change: -1.2 },
 { period: 'Q2 2024', value: 82.3, change: 3.2 },
 { period: 'Q3 2024', value: 85.7, change: 3.4 },
 { period: 'Q4 2024', value: 87.2, change: 1.5 },
 ],
 },
 {
 id: 'ablation-success-rate',
 name: 'AF Ablation Success Rate',
 category: 'Clinical',
 currentValue: 78.9,
 targetValue: 80.0,
 benchmark: 75.2,
 trend: 'up',
 trendValue: 2.1,
 unit: '%',
 riskAdjusted: false,
 patientCount: 342,
 lastUpdated: '2024-12-10',
 description: 'Freedom from AF at 12 months post-catheter ablation',
 opportunities: [
 { description: 'Enhanced pre-procedure imaging', impact: 8, difficulty: 'Medium' },
 { description: 'Improved patient selection criteria', impact: 6, difficulty: 'High' },
 { description: 'Post-procedure monitoring optimization', impact: 4, difficulty: 'Low' },
 ],
 },
 {
 id: 'device-implant-complications',
 name: 'Device Implant Complications',
 category: 'Safety',
 currentValue: 3.2,
 targetValue: 2.0,
 benchmark: 4.1,
 trend: 'down',
 trendValue: -1.8,
 unit: '%',
 riskAdjusted: true,
 patientCount: 628,
 lastUpdated: '2024-12-10',
 description: 'Procedure-related complications within 30 days of device implant',
 opportunities: [
 { description: 'Enhanced pre-procedure planning', impact: 25, difficulty: 'Medium' },
 { description: 'Improved surgical technique training', impact: 20, difficulty: 'High' },
 { description: 'Better patient selection protocols', impact: 15, difficulty: 'Medium' },
 ],
 },
 {
 id: 'stroke-prevention-score',
 name: 'Stroke Prevention Quality',
 category: 'Outcomes',
 currentValue: 94.3,
 targetValue: 95.0,
 benchmark: 89.7,
 trend: 'stable',
 trendValue: 0.2,
 unit: '%',
 riskAdjusted: true,
 patientCount: 2156,
 lastUpdated: '2024-12-10',
 description: 'Composite score for stroke prevention in AF patients',
 opportunities: [
 { description: 'CHA₂DS₂-VASc optimization protocols', impact: 3, difficulty: 'Low' },
 { description: 'Enhanced monitoring systems', impact: 2, difficulty: 'Medium' },
 { description: 'Patient adherence programs', impact: 1, difficulty: 'Low' },
 ],
 },
 {
 id: 'ep-readmission-rate',
 name: 'EP 30-Day Readmission',
 category: 'Outcomes',
 currentValue: 12.4,
 targetValue: 8.0,
 benchmark: 14.2,
 trend: 'down',
 trendValue: -2.7,
 unit: '%',
 riskAdjusted: true,
 patientCount: 892,
 lastUpdated: '2024-12-10',
 description: 'EP-related 30-day readmission rate post-procedure',
 opportunities: [
 { description: 'Enhanced discharge planning', impact: 35, difficulty: 'Medium' },
 { description: 'Post-procedure follow-up protocols', impact: 25, difficulty: 'Low' },
 { description: 'Patient education improvements', impact: 15, difficulty: 'Low' },
 ],
 },
 {
 id: 'device-longevity',
 name: 'Device Battery Longevity',
 category: 'Outcomes',
 currentValue: 8.7,
 targetValue: 10.0,
 benchmark: 8.2,
 trend: 'up',
 trendValue: 1.2,
 unit: 'ratio',
 riskAdjusted: false,
 patientCount: 1243,
 lastUpdated: '2024-12-10',
 description: 'Average device battery life in years',
 opportunities: [
 { description: 'Optimized programming protocols', impact: 18, difficulty: 'Medium' },
 { description: 'Patient lifestyle counseling', impact: 12, difficulty: 'Low' },
 { description: 'Advanced device selection', impact: 8, difficulty: 'High' },
 ],
 },
 {
 id: 'radiation-safety',
 name: 'Radiation Safety Score',
 category: 'Safety',
 currentValue: 92.1,
 targetValue: 95.0,
 benchmark: 88.4,
 trend: 'up',
 trendValue: 3.4,
 unit: '%',
 riskAdjusted: false,
 patientCount: 756,
 lastUpdated: '2024-12-10',
 description: 'Adherence to radiation safety protocols during EP procedures',
 opportunities: [
 { description: 'Enhanced ALARA protocols', impact: 15, difficulty: 'Medium' },
 { description: 'Staff radiation safety training', impact: 10, difficulty: 'Low' },
 { description: 'Advanced imaging techniques', impact: 8, difficulty: 'High' },
 ],
 },
 {
 id: 'patient-satisfaction',
 name: 'EP Patient Satisfaction',
 category: 'Outcomes',
 currentValue: 89.6,
 targetValue: 92.0,
 benchmark: 85.1,
 trend: 'up',
 trendValue: 2.8,
 unit: '%',
 riskAdjusted: false,
 patientCount: 1456,
 lastUpdated: '2024-12-10',
 description: 'Overall patient satisfaction with EP care experience',
 opportunities: [
 { description: 'Improved communication protocols', impact: 12, difficulty: 'Low' },
 { description: 'Reduced wait times', impact: 8, difficulty: 'Medium' },
 { description: 'Enhanced comfort measures', impact: 6, difficulty: 'Low' },
 ],
 }
  ];

  const filteredMetrics = qualityMetrics.filter(metric => metric.category === selectedCategory);
  const selectedMetricData = qualityMetrics.find(m => m.id === selectedMetric);

  const getPerformanceColor = (current: number, target: number, unit: string) => {
 let performance;
 if (unit === '%' && current <= target) {
 performance = (current / target) * 100;
 } else if (unit === '%' && current > target) {
 performance = (target / current) * 100;
 } else if (unit === 'ratio') {
 performance = (current / target) * 100;
 } else {
 performance = (current / target) * 100;
 }

 if (performance >= 90) return 'text-[#2C4A60] bg-[#C8D4DC]';
 if (performance >= 75) return 'text-[#6B7280] bg-[#F0F5FA]';
 return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
 switch (trend) {
 case 'up':
 return <TrendingUp className="w-4 h-4 text-[#2C4A60]" />;
 case 'down':
 return <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />;
 default:
 return <div className="w-4 h-4 bg-titanium-400 rounded-full"></div>;
 }
  };

  const formatValue = (value: number, unit: string) => {
 if (unit === '%') return `${toFixed(value, 1)}%`;
 if (unit === 'days') return `${toFixed(value, 0)} days`;
 if (unit === 'ratio') return `${toFixed(value, 1)} years`;
 return value.toString();
  };

  const getCategoryColor = (category: QualityMetric['category']) => {
 const colors = {
 'Clinical': 'blue',
 'Safety': 'red',
 'Outcomes': 'green',
 };
 return colors[category];
  };

  const getCategoryIcon = (category: QualityMetric['category']) => {
 const icons = {
 'Clinical': <Zap className="w-5 h-5" />,
 'Safety': <Shield className="w-5 h-5" />,
 'Outcomes': <Heart className="w-5 h-5" />,
 };
 return icons[category];
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 flex items-center gap-2">
 <Target className="w-6 h-6 text-chrome-600" />
 EP Quality Metrics
 </h2>
 <p className="text-titanium-600">
 Electrophysiology care quality indicators and performance measures
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Overall Performance</div>
 <div 
 className="text-3xl font-bold text-titanium-900 cursor-pointer hover:text-chrome-600 transition-colors"
 onClick={demoAction()}
 >
 {toFixed(filteredMetrics.reduce((sum, m) => sum + ((m.currentValue / m.targetValue) * 100), 0) / filteredMetrics.length, 0)}%
 </div>
 <div className="text-sm text-titanium-600">
 Vs target goals
 </div>
 </div>
 </div>

 {/* Category Tabs */}
 <div className="flex gap-2 mb-6">
 {(['Clinical', 'Safety', 'Outcomes'] as const).map((category) => {
 const colorClass = getCategoryColor(category);
 const categoryMetrics = qualityMetrics.filter(m => m.category === category);
 return (
 <button
 key={category}
 onClick={() => {
 setSelectedCategory(category);
 setSelectedMetric(null);
 console.log('Category selected:', category);
 }}
 className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
 selectedCategory === category
 ? `border-${colorClass}-400 bg-${colorClass}-50 shadow-lg`
 : 'border-titanium-200 hover:border-titanium-300 bg-white'
 }`}
 >
 <div className={`text-${colorClass}-600`}>
 {getCategoryIcon(category)}
 </div>
 <span className="font-semibold text-titanium-900">{category}</span>
 <div className="text-sm text-titanium-600">
 {categoryMetrics.length} metrics
 </div>
 </button>
 );
 })}
 </div>

 {/* Metrics Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
 {filteredMetrics.map((metric) => (
 <button
 key={metric.id}
 onClick={() => {
 setSelectedMetric(selectedMetric === metric.id ? null : metric.id);
 console.log('Metric selected:', metric.name, metric.currentValue);
 }}
 className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
 selectedMetric === metric.id
 ? `border-${getCategoryColor(metric.category)}-400 shadow-lg bg-${getCategoryColor(metric.category)}-50/30`
 : 'border-titanium-200 hover:border-titanium-300 hover:shadow-md'
 }`}
 >
 {/* Metric Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold text-titanium-900">{metric.name}</span>
 {metric.riskAdjusted && (
 <span className="px-2 py-1 text-xs bg-titanium-100 text-titanium-700 rounded-full">
 Risk-Adj
 </span>
 )}
 </div>
 <div className="text-xs text-titanium-600">{metric.description}</div>
 </div>
 <div className="flex items-center gap-2 ml-4">
 {getTrendIcon(metric.trend)}
 <span className={`text-sm font-semibold ${
 metric.trend === 'up' ? 'text-[#2C4A60]' :
 metric.trend === 'down' ? 'text-red-600' : 'text-titanium-600'
 }`}>
 {metric.trend !== 'stable' && (metric.trendValue > 0 ? '+' : '')}{metric.trendValue}%
 </span>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setShowDetailedView(showDetailedView === metric.id ? null : metric.id);
 console.log('Detailed view toggled:', metric.name);
 }}
 className="ml-2 p-1 rounded-lg hover:bg-titanium-100 transition-colors"
 title="View detailed breakdown"
 >
 {showDetailedView === metric.id ? (
 <ChevronDown className="w-4 h-4 text-titanium-600" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-600" />
 )}
 </button>
 </div>
 </div>

 {/* Current vs Target */}
 <div className="grid grid-cols-3 gap-3 mb-3">
 <div 
 className={`text-center p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${getPerformanceColor(metric.currentValue, metric.targetValue, metric.unit)}`}
 onClick={(e) => {
 e.stopPropagation();
 console.log('Current value drill-down:', metric.name, metric.currentValue);
 }}
 >
 <div className="text-2xl font-bold">
 {formatValue(metric.currentValue, metric.unit)}
 </div>
 <div className="text-xs">Current</div>
 </div>
 <div className="text-center p-2 rounded-lg bg-titanium-50">
 <div className="text-2xl font-bold text-titanium-900">
 {formatValue(metric.targetValue, metric.unit)}
 </div>
 <div className="text-xs text-titanium-600">Target</div>
 </div>
 <div className="text-center p-2 rounded-lg bg-titanium-50">
 <div className="text-2xl font-bold text-titanium-900">
 {formatValue(metric.benchmark, metric.unit)}
 </div>
 <div className="text-xs text-titanium-600">Benchmark</div>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="w-full bg-titanium-100 rounded-full h-2 mb-2">
 <div
 className={`h-2 rounded-full ${
 (metric.currentValue / metric.targetValue) >= 0.9 ? 'bg-[#C8D4DC]' :
 (metric.currentValue / metric.targetValue) >= 0.75 ? 'bg-[#F0F5FA]' :
 'bg-red-500'
 }`}
 style={{ 
 width: `${Math.min((metric.currentValue / metric.targetValue) * 100, 100)}%` 
 }}
 ></div>
 </div>

 {/* Detailed Breakdown - Expandable */}
 {showDetailedView === metric.id && metric.patientCohorts && (
 <div className="mt-4 p-4 bg-titanium-50 rounded-lg border border-titanium-200">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
 {/* Patient Cohorts */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <Users className="w-4 h-4 text-chrome-600" />
 <h4 className="font-semibold text-titanium-900">Patient Cohorts</h4>
 </div>
 <div className="space-y-2">
 {metric.patientCohorts.map((cohort, index) => (
 <div
 key={cohort.name}
 className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-titanium-50 transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 console.log('Patient cohort drill-down:', cohort.name, cohort.count);
 }}
 >
 <div className="flex items-center gap-2">
 <div className={`w-3 h-3 rounded-full ${
 cohort.riskLevel === 'high' ? 'bg-red-500' :
 cohort.riskLevel === 'medium' ? 'bg-[#F0F5FA]' :
 'bg-[#C8D4DC]'
 }`}></div>
 <span className="text-sm text-titanium-800">{cohort.name}</span>
 </div>
 <div className="text-right">
 <div className="text-sm font-semibold text-titanium-900">{cohort.count}</div>
 <div className="text-xs text-titanium-600">{cohort.percentage}%</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Trend Data */}
 {metric.trendData && (
 <div>
 <div className="flex items-center gap-2 mb-3">
 <Activity className="w-4 h-4 text-[#2C4A60]" />
 <h4 className="font-semibold text-titanium-900">Quarterly Trends</h4>
 </div>
 <div className="space-y-2">
 {metric.trendData.map((trend, index) => (
 <div
 key={trend.period}
 className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-titanium-50 transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 console.log('Trend period drill-down:', trend.period, trend.value);
 }}
 >
 <span className="text-sm text-titanium-800">{trend.period}</span>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-titanium-900">
 {formatValue(trend.value, metric.unit)}
 </span>
 <span className={`text-xs px-2 py-1 rounded-full ${
 trend.change > 0 ? 'bg-[#C8D4DC] text-[#2C4A60]' :
 trend.change < 0 ? 'bg-red-100 text-red-700' :
 'bg-titanium-100 text-titanium-600'
 }`}>
 {trend.change > 0 ? '+' : ''}{trend.change}%
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Quick Actions */}
 <div className="flex gap-2 pt-3 border-t border-titanium-200">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 console.log('Viewing patient list for metric:', metric.name, 'Patient count:', metric.patientCount);
 }}
 className="flex items-center gap-2 px-3 py-2 bg-chrome-600 text-white text-xs rounded-lg hover:bg-chrome-700 transition-colors"
 >
 <Eye className="w-3 h-3" />
 View Patient List
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 console.log('Exporting report for metric:', metric.name, 'Category:', metric.category);
 }}
 className="flex items-center gap-2 px-3 py-2 bg-titanium-600 text-white text-xs rounded-lg hover:bg-titanium-700 transition-colors"
 >
 <FileText className="w-3 h-3" />
 Export Report
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 console.log('Setting alert for metric:', metric.name, 'Current value:', metric.currentValue, 'Target:', metric.targetValue);
 }}
 className="flex items-center gap-2 px-3 py-2 bg-[#C8D4DC] text-white text-xs rounded-lg hover:bg-[#C8D4DC] transition-colors"
 >
 <Clock className="w-3 h-3" />
 Set Alert
 </button>
 </div>
 </div>
 )}

 <div className="flex items-center justify-between text-xs text-titanium-600">
 <div 
 className="flex items-center gap-1 cursor-pointer hover:text-titanium-800 transition-colors"
 onClick={(e) => {
 e.stopPropagation();
 console.log('Patient count drill-down:', metric.name, metric.patientCount);
 }}
 >
 <Users className="w-3 h-3" />
 <span>{metric.patientCount.toLocaleString()} patients</span>
 </div>
 <div className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 <span>Updated {metric.lastUpdated}</span>
 </div>
 </div>
 </button>
 ))}
 </div>

 {/* Selected Metric Detailed View */}
 {selectedMetricData && (
 <div className={`p-6 rounded-xl border-2 border-${getCategoryColor(selectedMetricData.category)}-200 bg-${getCategoryColor(selectedMetricData.category)}-50/50`}>
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-xl font-bold text-titanium-900">
 {selectedMetricData.name}
 </h3>
 <p className="text-titanium-600">{selectedMetricData.description}</p>
 </div>
 <div className="flex items-center gap-2">
 <Award className={`w-5 h-5 text-${getCategoryColor(selectedMetricData.category)}-600`} />
 <span className={`text-lg font-bold text-${getCategoryColor(selectedMetricData.category)}-600`}>
 {selectedMetricData.category} Metric
 </span>
 </div>
 </div>

 <div className="mb-4">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
 <h4 className="font-semibold text-titanium-900">Improvement Opportunities</h4>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {selectedMetricData.opportunities.map((opportunity, index) => (
 <div
 key={opportunity.description}
 className="p-3 bg-white rounded-lg border border-titanium-200 cursor-pointer hover:bg-titanium-50 transition-colors"
 onClick={demoAction()}
 >
 <div className="flex items-center justify-between mb-2">
 <span className={`px-2 py-1 text-xs rounded-full ${
 opportunity.difficulty === 'Low' ? 'bg-[#C8D4DC] text-[#2C4A60]' :
 opportunity.difficulty === 'Medium' ? 'bg-[#F0F5FA] text-[#6B7280]' :
 'bg-red-100 text-red-700'
 }`}>
 {opportunity.difficulty}
 </span>
 <span className="text-sm font-bold text-chrome-600">
 +{opportunity.impact}{selectedMetricData.unit === 'ratio' ? '' : '%'}
 </span>
 </div>
 <div className="text-sm text-titanium-800">{opportunity.description}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Summary Statistics */}
 <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div 
 className="cursor-pointer hover:bg-titanium-50 p-2 rounded-lg transition-colors"
 onClick={() => {
 const topPerformer = filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0];
 console.log('Top performer drill-down:', topPerformer?.name, topPerformer?.currentValue);
 }}
 >
 <div className="text-sm text-titanium-600 mb-1">Top Performer</div>
 <div className="text-lg font-bold text-[#2C4A60]">
 {filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.name.split(' ')[0]}
 </div>
 <div className="text-sm text-titanium-600">
 {formatValue(filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.currentValue || 0, 
 filteredMetrics.sort((a, b) => (b.currentValue / b.targetValue) - (a.currentValue / a.targetValue))[0]?.unit || '%')}
 </div>
 </div>

 <div 
 className="cursor-pointer hover:bg-titanium-50 p-2 rounded-lg transition-colors"
 onClick={() => {
 const needsAttention = filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0];
 console.log('Needs attention drill-down:', needsAttention?.name, needsAttention?.currentValue);
 }}
 >
 <div className="text-sm text-titanium-600 mb-1">Needs Attention</div>
 <div className="text-lg font-bold text-red-600">
 {filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.name.split(' ')[0]}
 </div>
 <div className="text-sm text-titanium-600">
 {toFixed(((filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.currentValue || 0) /
 (filteredMetrics.sort((a, b) => (a.currentValue / a.targetValue) - (b.currentValue / b.targetValue))[0]?.targetValue || 1) * 100), 0)}% to target
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Trending Up</div>
 <div className="text-lg font-bold text-[#2C4A60]">
 {filteredMetrics.filter(m => m.trend === 'up').length}
 </div>
 <div className="text-sm text-titanium-600">
 of {filteredMetrics.length} metrics
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Total Patients</div>
 <div className="text-lg font-bold text-chrome-600">
 {Math.max(...filteredMetrics.map(m => m.patientCount)).toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">
 Largest cohort
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPQualityMetrics;