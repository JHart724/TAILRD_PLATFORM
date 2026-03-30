import React, { useState } from 'react';
import { BarChart, Users, AlertTriangle, TrendingUp, TrendingDown, Filter, Target, Eye, ChevronRight, Activity } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface EPEquityMetric {
  id: string;
  metric: string;
  description: string;
  overallAverage: number;
  unit: '%' | '#' | 'days';
}

interface EquitySegment {
  segment: string;
  label: string;
  groups: EquityGroup[];
}

interface EquityGroup {
  group: string;
  value: number;
  count: number;
  delta: number;
  significance: 'significant' | 'trending' | 'none';
  patients: EPPatientExample[];
}

interface EPPatientExample {
  id: string;
  name: string;
  age: number;
  mrn: string;
  arrhythmia: 'AF' | 'AFL' | 'VT' | 'VF' | 'Bradycardia';
  cha2ds2vasc: number;
  hasbled: number;
  currentTreatment: string[];
  treatmentGaps: string[];
  lastVisit: Date;
}

const EPEquityAnalysis: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>('oac_prescription');
  const [selectedSegment, setSelectedSegment] = useState<string>('race');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  // EP-specific equity metrics
  const equityMetrics: EPEquityMetric[] = [
 {
 id: 'oac_prescription',
 metric: 'OAC Prescription Rate',
 description: 'Percentage of eligible AF/AFL patients prescribed oral anticoagulation',
 overallAverage: 84.2,
 unit: '%'
 },
 {
 id: 'inr_control',
 metric: 'INR Control Rate',
 description: 'Percentage of warfarin patients achieving therapeutic INR (2.0-3.0)',
 overallAverage: 73.8,
 unit: '%'
 },
 {
 id: 'ablation_referral',
 metric: 'Ablation Referral Rate',
 description: 'Rate of appropriate catheter ablation referrals for eligible patients',
 overallAverage: 22.4,
 unit: '%'
 },
 {
 id: 'device_therapy_time',
 metric: 'Time to Device Therapy',
 description: 'Days from guideline indication to device implantation',
 overallAverage: 28.6,
 unit: 'days'
 },
 {
 id: 'stroke_rate',
 metric: 'Annual Stroke Rate',
 description: 'Stroke events per 100 patient-years in AF/AFL patients',
 overallAverage: 2.1,
 unit: '%'
 },
 {
 id: 'bleeding_events',
 metric: 'Major Bleeding Events',
 description: 'Major bleeding events per 100 patient-years',
 overallAverage: 1.8,
 unit: '%'
 }
  ];

  // Equity segments with mock data
  const equitySegments: EquitySegment[] = [
 {
 segment: 'race',
 label: 'Race/Ethnicity',
 groups: [
 {
 group: 'White',
 value: selectedMetric === 'oac_prescription' ? 88.4 : selectedMetric === 'inr_control' ? 76.2 : selectedMetric === 'ablation_referral' ? 25.1 : 
 selectedMetric === 'device_therapy_time' ? 26.8 : selectedMetric === 'stroke_rate' ? 1.9 : 1.6,
 count: 1247,
 delta: selectedMetric === 'oac_prescription' ? 4.2 : selectedMetric === 'inr_control' ? 2.4 : selectedMetric === 'ablation_referral' ? 2.7 : 
 selectedMetric === 'device_therapy_time' ? -1.8 : selectedMetric === 'stroke_rate' ? -0.2 : -0.2,
 significance: 'significant',
 patients: [
 { id: 'P001', name: 'Johnson, Mary', age: 67, mrn: 'MRN001', arrhythmia: 'AF', cha2ds2vasc: 4, hasbled: 2, currentTreatment: ['Apixaban 5mg BID'], treatmentGaps: [], lastVisit: new Date('2024-10-20') },
 { id: 'P002', name: 'Smith, Robert', age: 72, mrn: 'MRN002', arrhythmia: 'AFL', cha2ds2vasc: 5, hasbled: 1, currentTreatment: ['Warfarin 5mg'], treatmentGaps: ['Subtherapeutic INR'], lastVisit: new Date('2024-10-18') }
 ]
 },
 {
 group: 'Black/AA',
 value: selectedMetric === 'oac_prescription' ? 76.8 : selectedMetric === 'inr_control' ? 68.3 : selectedMetric === 'ablation_referral' ? 17.2 : 
 selectedMetric === 'device_therapy_time' ? 34.1 : selectedMetric === 'stroke_rate' ? 2.8 : 2.3,
 count: 342,
 delta: selectedMetric === 'oac_prescription' ? -7.4 : selectedMetric === 'inr_control' ? -5.5 : selectedMetric === 'ablation_referral' ? -5.2 : 
 selectedMetric === 'device_therapy_time' ? 5.5 : selectedMetric === 'stroke_rate' ? 0.7 : 0.5,
 significance: 'significant',
 patients: [
 { id: 'P003', name: 'Williams, David', age: 64, mrn: 'MRN003', arrhythmia: 'AF', cha2ds2vasc: 6, hasbled: 3, currentTreatment: ['Aspirin 81mg'], treatmentGaps: ['No anticoagulation prescribed', 'High stroke risk'], lastVisit: new Date('2024-10-15') },
 { id: 'P004', name: 'Jackson, Linda', age: 59, mrn: 'MRN004', arrhythmia: 'VT', cha2ds2vasc: 3, hasbled: 2, currentTreatment: ['Amiodarone'], treatmentGaps: ['ICD evaluation delayed'], lastVisit: new Date('2024-10-22') }
 ]
 },
 {
 group: 'Hispanic',
 value: selectedMetric === 'oac_prescription' ? 79.1 : selectedMetric === 'inr_control' ? 71.4 : selectedMetric === 'ablation_referral' ? 19.8 : 
 selectedMetric === 'device_therapy_time' ? 31.7 : selectedMetric === 'stroke_rate' ? 2.4 : 2.0,
 count: 186,
 delta: selectedMetric === 'oac_prescription' ? -5.1 : selectedMetric === 'inr_control' ? -2.4 : selectedMetric === 'ablation_referral' ? -2.6 : 
 selectedMetric === 'device_therapy_time' ? 3.1 : selectedMetric === 'stroke_rate' ? 0.3 : 0.2,
 significance: 'trending',
 patients: [
 { id: 'P005', name: 'Garcia, Maria', age: 71, mrn: 'MRN005', arrhythmia: 'AF', cha2ds2vasc: 5, hasbled: 2, currentTreatment: ['Rivaroxaban 15mg'], treatmentGaps: ['Language barrier affecting compliance'], lastVisit: new Date('2024-10-19') }
 ]
 },
 {
 group: 'Asian',
 value: selectedMetric === 'oac_prescription' ? 82.7 : selectedMetric === 'inr_control' ? 74.9 : selectedMetric === 'ablation_referral' ? 21.3 : 
 selectedMetric === 'device_therapy_time' ? 29.2 : selectedMetric === 'stroke_rate' ? 2.0 : 1.7,
 count: 94,
 delta: selectedMetric === 'oac_prescription' ? -1.5 : selectedMetric === 'inr_control' ? 1.1 : selectedMetric === 'ablation_referral' ? -1.1 : 
 selectedMetric === 'device_therapy_time' ? 0.6 : selectedMetric === 'stroke_rate' ? -0.1 : -0.1,
 significance: 'none',
 patients: [
 { id: 'P006', name: 'Kim, Jennifer', age: 68, mrn: 'MRN006', arrhythmia: 'AF', cha2ds2vasc: 4, hasbled: 1, currentTreatment: ['Edoxaban 60mg'], treatmentGaps: [], lastVisit: new Date('2024-10-21') }
 ]
 },
 {
 group: 'Other',
 value: selectedMetric === 'oac_prescription' ? 81.3 : selectedMetric === 'inr_control' ? 72.8 : selectedMetric === 'ablation_referral' ? 20.9 : 
 selectedMetric === 'device_therapy_time' ? 30.1 : selectedMetric === 'stroke_rate' ? 2.2 : 1.9,
 count: 67,
 delta: selectedMetric === 'oac_prescription' ? -2.9 : selectedMetric === 'inr_control' ? -1.0 : selectedMetric === 'ablation_referral' ? -1.5 : 
 selectedMetric === 'device_therapy_time' ? 1.5 : selectedMetric === 'stroke_rate' ? 0.1 : 0.1,
 significance: 'none',
 patients: []
 }
 ]
 },
 {
 segment: 'age_group',
 label: 'Age Groups',
 groups: [
 {
 group: '18-49',
 value: selectedMetric === 'oac_prescription' ? 91.2 : selectedMetric === 'inr_control' ? 79.4 : selectedMetric === 'ablation_referral' ? 31.7 : 
 selectedMetric === 'device_therapy_time' ? 24.8 : selectedMetric === 'stroke_rate' ? 0.8 : 0.9,
 count: 134,
 delta: selectedMetric === 'oac_prescription' ? 7.0 : selectedMetric === 'inr_control' ? 5.6 : selectedMetric === 'ablation_referral' ? 9.3 : 
 selectedMetric === 'device_therapy_time' ? -3.8 : selectedMetric === 'stroke_rate' ? -1.3 : -0.9,
 significance: 'significant',
 patients: []
 },
 {
 group: '50-64',
 value: selectedMetric === 'oac_prescription' ? 86.8 : selectedMetric === 'inr_control' ? 76.1 : selectedMetric === 'ablation_referral' ? 26.3 : 
 selectedMetric === 'device_therapy_time' ? 27.2 : selectedMetric === 'stroke_rate' ? 1.5 : 1.4,
 count: 483,
 delta: selectedMetric === 'oac_prescription' ? 2.6 : selectedMetric === 'inr_control' ? 2.3 : selectedMetric === 'ablation_referral' ? 3.9 : 
 selectedMetric === 'device_therapy_time' ? -1.4 : selectedMetric === 'stroke_rate' ? -0.6 : -0.4,
 significance: 'trending',
 patients: []
 },
 {
 group: '65-79',
 value: selectedMetric === 'oac_prescription' ? 83.1 : selectedMetric === 'inr_control' ? 73.2 : selectedMetric === 'ablation_referral' ? 21.8 : 
 selectedMetric === 'device_therapy_time' ? 29.7 : selectedMetric === 'stroke_rate' ? 2.3 : 1.9,
 count: 892,
 delta: selectedMetric === 'oac_prescription' ? -1.1 : selectedMetric === 'inr_control' ? -0.6 : selectedMetric === 'ablation_referral' ? -0.6 : 
 selectedMetric === 'device_therapy_time' ? 1.1 : selectedMetric === 'stroke_rate' ? 0.2 : 0.1,
 significance: 'none',
 patients: []
 },
 {
 group: '80+',
 value: selectedMetric === 'oac_prescription' ? 77.9 : selectedMetric === 'inr_control' ? 69.8 : selectedMetric === 'ablation_referral' ? 12.4 : 
 selectedMetric === 'device_therapy_time' ? 35.8 : selectedMetric === 'stroke_rate' ? 3.1 : 2.4,
 count: 427,
 delta: selectedMetric === 'oac_prescription' ? -6.3 : selectedMetric === 'inr_control' ? -4.0 : selectedMetric === 'ablation_referral' ? -10.0 : 
 selectedMetric === 'device_therapy_time' ? 7.2 : selectedMetric === 'stroke_rate' ? 1.0 : 0.6,
 significance: 'significant',
 patients: []
 }
 ]
 },
 {
 segment: 'insurance',
 label: 'Insurance Type',
 groups: [
 {
 group: 'Commercial',
 value: selectedMetric === 'oac_prescription' ? 88.7 : selectedMetric === 'inr_control' ? 77.8 : selectedMetric === 'ablation_referral' ? 28.4 : 
 selectedMetric === 'device_therapy_time' ? 25.1 : selectedMetric === 'stroke_rate' ? 1.7 : 1.5,
 count: 723,
 delta: selectedMetric === 'oac_prescription' ? 4.5 : selectedMetric === 'inr_control' ? 4.0 : selectedMetric === 'ablation_referral' ? 6.0 : 
 selectedMetric === 'device_therapy_time' ? -3.5 : selectedMetric === 'stroke_rate' ? -0.4 : -0.3,
 significance: 'significant',
 patients: []
 },
 {
 group: 'Medicare',
 value: selectedMetric === 'oac_prescription' ? 82.8 : selectedMetric === 'inr_control' ? 72.4 : selectedMetric === 'ablation_referral' ? 20.8 : 
 selectedMetric === 'device_therapy_time' ? 30.2 : selectedMetric === 'stroke_rate' ? 2.2 : 1.9,
 count: 946,
 delta: selectedMetric === 'oac_prescription' ? -1.4 : selectedMetric === 'inr_control' ? -1.4 : selectedMetric === 'ablation_referral' ? -1.6 : 
 selectedMetric === 'device_therapy_time' ? 1.6 : selectedMetric === 'stroke_rate' ? 0.1 : 0.1,
 significance: 'trending',
 patients: []
 },
 {
 group: 'Medicaid',
 value: selectedMetric === 'oac_prescription' ? 74.2 : selectedMetric === 'inr_control' ? 66.9 : selectedMetric === 'ablation_referral' ? 15.7 : 
 selectedMetric === 'device_therapy_time' ? 36.8 : selectedMetric === 'stroke_rate' ? 2.9 : 2.4,
 count: 267,
 delta: selectedMetric === 'oac_prescription' ? -10.0 : selectedMetric === 'inr_control' ? -6.9 : selectedMetric === 'ablation_referral' ? -6.7 : 
 selectedMetric === 'device_therapy_time' ? 8.2 : selectedMetric === 'stroke_rate' ? 0.8 : 0.6,
 significance: 'significant',
 patients: []
 },
 {
 group: 'Uninsured',
 value: selectedMetric === 'oac_prescription' ? 68.3 : selectedMetric === 'inr_control' ? 61.2 : selectedMetric === 'ablation_referral' ? 8.9 : 
 selectedMetric === 'device_therapy_time' ? 45.7 : selectedMetric === 'stroke_rate' ? 3.8 : 3.1,
 count: 38,
 delta: selectedMetric === 'oac_prescription' ? -15.9 : selectedMetric === 'inr_control' ? -12.6 : selectedMetric === 'ablation_referral' ? -13.5 : 
 selectedMetric === 'device_therapy_time' ? 17.1 : selectedMetric === 'stroke_rate' ? 1.7 : 1.3,
 significance: 'significant',
 patients: []
 }
 ]
 },
 {
 segment: 'geography',
 label: 'Geographic Region',
 groups: [
 {
 group: 'Urban Core',
 value: selectedMetric === 'oac_prescription' ? 87.1 : selectedMetric === 'inr_control' ? 75.7 : selectedMetric === 'ablation_referral' ? 25.8 : 
 selectedMetric === 'device_therapy_time' ? 26.9 : selectedMetric === 'stroke_rate' ? 1.9 : 1.6,
 count: 1284,
 delta: selectedMetric === 'oac_prescription' ? 2.9 : selectedMetric === 'inr_control' ? 1.9 : selectedMetric === 'ablation_referral' ? 3.4 : 
 selectedMetric === 'device_therapy_time' ? -1.7 : selectedMetric === 'stroke_rate' ? -0.2 : -0.2,
 significance: 'trending',
 patients: []
 },
 {
 group: 'Suburban',
 value: selectedMetric === 'oac_prescription' ? 84.8 : selectedMetric === 'inr_control' ? 74.1 : selectedMetric === 'ablation_referral' ? 22.7 : 
 selectedMetric === 'device_therapy_time' ? 28.8 : selectedMetric === 'stroke_rate' ? 2.0 : 1.7,
 count: 567,
 delta: selectedMetric === 'oac_prescription' ? 0.6 : selectedMetric === 'inr_control' ? 0.3 : selectedMetric === 'ablation_referral' ? 0.3 : 
 selectedMetric === 'device_therapy_time' ? 0.2 : selectedMetric === 'stroke_rate' ? -0.1 : -0.1,
 significance: 'none',
 patients: []
 },
 {
 group: 'Rural',
 value: selectedMetric === 'oac_prescription' ? 78.9 : selectedMetric === 'inr_control' ? 69.2 : selectedMetric === 'ablation_referral' ? 16.1 : 
 selectedMetric === 'device_therapy_time' ? 35.4 : selectedMetric === 'stroke_rate' ? 2.7 : 2.3,
 count: 173,
 delta: selectedMetric === 'oac_prescription' ? -5.3 : selectedMetric === 'inr_control' ? -4.6 : selectedMetric === 'ablation_referral' ? -6.3 : 
 selectedMetric === 'device_therapy_time' ? 6.8 : selectedMetric === 'stroke_rate' ? 0.6 : 0.5,
 significance: 'significant',
 patients: []
 }
 ]
 }
  ];

  const selectedMetricData = equityMetrics.find(m => m.id === selectedMetric)!;
  const selectedSegmentData = equitySegments.find(s => s.segment === selectedSegment)!;

  const getSignificanceColor = (significance: string) => {
 switch (significance) {
 case 'significant':
 return 'bg-red-100 text-red-800 border-red-200';
 case 'trending':
 return 'bg-[#F0F5FA] text-[#6B7280] border-[#C8D4DC]';
 default:
 return 'bg-[#C8D4DC] text-[#2C4A60] border-[#2C4A60]';
 }
  };

  const getBarColor = (delta: number, isInverted: boolean = false) => {
 const threshold = isInverted ? 0 : 0; // For metrics where lower is better (stroke, bleeding, time)
 if (isInverted) {
 if (delta <= -2) return 'bg-[#2C4A60]';
 if (delta <= 0) return 'bg-crimson-500';
 return 'bg-medical-red-500';
 } else {
 if (delta >= 2) return 'bg-[#2C4A60]';
 if (delta >= 0) return 'bg-crimson-500';
 return 'bg-medical-red-500';
 }
  };

  const handleGroupClick = (group: EquityGroup) => {
 setSelectedGroup(group.group);
 setShowPatientDetail(true);
 console.log('Opening equity drill-down for:', selectedSegmentData.label, '-', group.group);
 {};
  };

  const isInvertedMetric = selectedMetric === 'device_therapy_time' || selectedMetric === 'stroke_rate' || selectedMetric === 'bleeding_events';

  return (
 <>
 <div className="metal-card p-8">
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 EP Health Equity Analysis
 </h2>
 <p className="text-titanium-600">
 Demographic disparities in EP care quality • Click segments for patient cohort drill-down
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <BarChart className="w-4 h-4 text-titanium-600" />
 <select
 value={selectedMetric}
 onChange={(e) => setSelectedMetric(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 {equityMetrics.map((metric) => (
 <option key={metric.id} value={metric.id}>
 {metric.metric}
 </option>
 ))}
 </select>
 </div>
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-titanium-600" />
 <select
 value={selectedSegment}
 onChange={(e) => setSelectedSegment(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 {equitySegments.map((segment) => (
 <option key={segment.segment} value={segment.segment}>
 {segment.label}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Metric Overview */}
 <div className="p-4 bg-titanium-50 rounded-xl mb-6">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-titanium-900 mb-1">
 {selectedMetricData.metric} by {selectedSegmentData.label}
 </h3>
 <p className="text-sm text-titanium-600">{selectedMetricData.description}</p>
 </div>
 <div className="text-right">
 <div className="text-3xl font-bold text-porsche-600">
 {toFixed(selectedMetricData.overallAverage, 1)}{selectedMetricData.unit}
 </div>
 <div className="text-sm text-titanium-600">Overall Average</div>
 </div>
 </div>
 </div>

 {/* Grouped Bar Chart */}
 <div className="space-y-6 mb-6">
 {selectedSegmentData.groups.map((group, index) => {
 const barWidth = Math.abs(group.delta) / 20 * 100; // Scale for visualization
 const maxWidth = Math.min(barWidth, 100);
 
 return (
 <div key={group.group} className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 flex-1">
 <button
 onClick={() => handleGroupClick(group)}
 className="text-left hover:bg-titanium-50 p-2 rounded-lg transition-colors flex-1 flex items-center gap-3"
 >
 <div className="min-w-24">
 <div className="font-semibold text-titanium-900">{group.group}</div>
 <div className="text-xs text-titanium-600">n={group.count.toLocaleString()}</div>
 </div>
 <div className="flex items-center gap-2 flex-1">
 <div className="text-2xl font-bold text-titanium-900">
 {toFixed(group.value, 1)}{selectedMetricData.unit}
 </div>
 <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
 (isInvertedMetric ? group.delta <= 0 : group.delta >= 0) 
 ? 'text-[#2C4A60] bg-[#e0eaf3]' 
 : 'text-medical-red-700 bg-medical-red-100'
 }`}>
 {(isInvertedMetric ? group.delta <= 0 : group.delta >= 0) ? (
 <TrendingUp className="w-3 h-3" />
 ) : (
 <TrendingDown className="w-3 h-3" />
 )}
 {group.delta > 0 ? '+' : ''}{toFixed(group.delta, 1)}{selectedMetricData.unit}
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSignificanceColor(group.significance)}`}>
 {group.significance === 'significant' ? 'Significant' : 
 group.significance === 'trending' ? 'Trending' : 'No Gap'}
 </div>
 </div>
 <ChevronRight className="w-4 h-4 text-titanium-400" />
 </button>
 </div>
 </div>
 
 {/* Visual Bar */}
 <div className="relative">
 <div className="w-full bg-titanium-100 rounded-full h-4 overflow-hidden">
 <div 
 className={`h-full rounded-full transition-all duration-700 ${getBarColor(group.delta, isInvertedMetric)}`}
 style={{ width: `${Math.min((group.value / (selectedMetricData.overallAverage * 1.5)) * 100, 100)}%` }}
 />
 </div>
 <div className="absolute inset-y-0 left-0 flex items-center ml-2">
 <div className="text-xs font-medium text-white">
 {toFixed(group.value, 1)}{selectedMetricData.unit}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Gap Analysis Summary */}
 <div className="grid grid-cols-3 gap-4 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-sm text-titanium-600 mb-1">Largest Equity Gap</div>
 <div className="text-lg font-bold text-medical-red-600">
 {selectedSegmentData.groups.reduce((prev, curr) => 
 Math.abs(prev.delta) > Math.abs(curr.delta) ? prev : curr
 ).group}
 </div>
 <div className="text-sm text-titanium-600">
 {toFixed(selectedSegmentData.groups.reduce((prev, curr) =>
 Math.abs(prev.delta) > Math.abs(curr.delta) ? prev : curr
 ).delta, 1)}{selectedMetricData.unit} gap
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Patients Affected</div>
 <div className="text-lg font-bold text-titanium-900">
 {selectedSegmentData.groups
 .filter(g => g.significance === 'significant')
 .reduce((sum, g) => sum + g.count, 0)
 .toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">
 Significant disparities
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Performance Leader</div>
 <div className="text-lg font-bold text-[#2C4A60]">
 {selectedSegmentData.groups.reduce((prev, curr) => 
 (isInvertedMetric ? prev.value < curr.value : prev.value > curr.value) ? prev : curr
 ).group}
 </div>
 <div className="text-sm text-titanium-600">
 {toFixed(selectedSegmentData.groups.reduce((prev, curr) =>
 (isInvertedMetric ? prev.value < curr.value : prev.value > curr.value) ? prev : curr
 ).value, 1)}{selectedMetricData.unit}
 </div>
 </div>
 </div>

 {/* Action Recommendations */}
 <div className="mt-6 p-4 bg-porsche-50 rounded-xl border border-porsche-200">
 <h4 className="font-semibold text-porsche-900 mb-3 flex items-center gap-2">
 <Target className="w-5 h-5" />
 Targeted Intervention Recommendations
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {selectedSegmentData.groups
 .filter(g => g.significance === 'significant' && g.delta < -2)
 .slice(0, 3)
 .map((group, index) => (
 <div key={group.group} className="p-3 bg-white rounded-lg border border-porsche-100">
 <div className="font-medium text-titanium-900 mb-1">{group.group} Cohort</div>
 <div className="text-sm text-titanium-600 mb-2">
 {group.count.toLocaleString()} patients • {toFixed(Math.abs(group.delta), 1)}{selectedMetricData.unit} below average
 </div>
 <button
 onClick={() => {
 console.log('Opening targeted intervention plan for:', group.group);
 {};
 }}
 className="text-sm bg-porsche-500 text-white px-3 py-1 rounded hover:bg-porsche-600 transition-colors"
 >
 View Action Plan
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Legend */}
 <div className="mt-6 p-4 bg-titanium-50 rounded-xl">
 <h4 className="font-semibold text-titanium-900 mb-3">Performance Legend</h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-[#2C4A60] rounded"></div>
 <span className="text-sm text-titanium-700">Above Average Performance</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-crimson-500 rounded"></div>
 <span className="text-sm text-titanium-700">Near Average Performance</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-medical-red-500 rounded"></div>
 <span className="text-sm text-titanium-700">Below Average Performance</span>
 </div>
 </div>
 
 <div className="mt-3 text-sm text-titanium-600">
 <p><strong>Statistical Significance:</strong> Red badges indicate statistically significant disparities requiring targeted interventions. 
 Click any demographic segment to view patient cohort details and evidence-based improvement strategies.</p>
 </div>
 </div>
 </div>

 {/* Patient Detail Modal */}
 {showPatientDetail && selectedGroup && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
 <div className="flex items-center justify-between p-6 border-b border-titanium-200 bg-gradient-to-r from-titanium-50 to-white">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900">
 {selectedMetricData.metric} - {selectedGroup} Cohort
 </h2>
 <div className="text-sm text-titanium-600 mt-1">
 {selectedSegmentData.label} equity analysis • Targeted intervention recommendations
 </div>
 </div>
 <button 
 onClick={() => setShowPatientDetail(false)}
 className="p-2 hover:bg-titanium-100 rounded-lg transition-colors"
 >
 <Eye className="w-6 h-6 text-titanium-500" />
 </button>
 </div>

 <div className="p-6">
 <div className="grid grid-cols-3 gap-6 mb-6">
 <div className="p-4 bg-porsche-50 rounded-xl border border-porsche-200">
 <div className="text-sm text-porsche-700 font-medium">Cohort Performance</div>
 <div className="text-2xl font-bold text-porsche-800">
 {toFixed(selectedSegmentData.groups.find(g => g.group === selectedGroup)?.value ?? 0, 1)}{selectedMetricData.unit}
 </div>
 <div className="text-sm text-porsche-600">
 vs {toFixed(selectedMetricData.overallAverage, 1)}{selectedMetricData.unit} overall
 </div>
 </div>
 <div className="p-4 bg-titanium-50 rounded-xl border border-titanium-200">
 <div className="text-sm text-titanium-700 font-medium">Patients in Cohort</div>
 <div className="text-2xl font-bold text-titanium-900">
 {selectedSegmentData.groups.find(g => g.group === selectedGroup)?.count.toLocaleString()}
 </div>
 <div className="text-sm text-titanium-600">Total patients</div>
 </div>
 <div className="p-4 bg-medical-red-50 rounded-xl border border-medical-red-200">
 <div className="text-sm text-medical-red-700 font-medium">Performance Gap</div>
 <div className="text-2xl font-bold text-medical-red-800">
 {toFixed(selectedSegmentData.groups.find(g => g.group === selectedGroup)?.delta ?? 0, 1)}{selectedMetricData.unit}
 </div>
 <div className="text-sm text-medical-red-600">From average</div>
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Evidence-Based Intervention Strategies
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-4 border border-titanium-200 rounded-xl">
 <div className="font-medium text-titanium-900 mb-2">Provider Education</div>
 <div className="text-sm text-titanium-600 space-y-1">
 <div>• Cultural competency training programs</div>
 <div>• Implicit bias awareness workshops</div>
 <div>• Best practice sharing sessions</div>
 </div>
 </div>
 <div className="p-4 border border-titanium-200 rounded-xl">
 <div className="font-medium text-titanium-900 mb-2">Patient-Centered Care</div>
 <div className="text-sm text-titanium-600 space-y-1">
 <div>• Language-appropriate educational materials</div>
 <div>• Community health worker programs</div>
 <div>• Flexible appointment scheduling</div>
 </div>
 </div>
 <div className="p-4 border border-titanium-200 rounded-xl">
 <div className="font-medium text-titanium-900 mb-2">System-Level Changes</div>
 <div className="text-sm text-titanium-600 space-y-1">
 <div>• Clinical decision support enhancements</div>
 <div>• Quality metric monitoring by demographics</div>
 <div>• Care pathway standardization</div>
 </div>
 </div>
 <div className="p-4 border border-titanium-200 rounded-xl">
 <div className="font-medium text-titanium-900 mb-2">Community Outreach</div>
 <div className="text-sm text-titanium-600 space-y-1">
 <div>• Partnership with community organizations</div>
 <div>• Health education programs</div>
 <div>• Screening event coordination</div>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-4 mt-6 border-t border-titanium-200">
 <button 
 className="flex items-center gap-2 px-4 py-2 bg-porsche-600 text-white rounded-lg hover:bg-porsche-700 transition-colors"
 onClick={() => {
 console.log('Generating equity improvement plan');
 {};
 }}
 >
 <Target className="w-4 h-4" />
 Generate Action Plan
 </button>
 <button 
 className="flex items-center gap-2 px-4 py-2 bg-white border border-titanium-300 text-titanium-700 rounded-lg hover:bg-titanium-50 transition-colors"
 onClick={() => {
 console.log('Opening patient cohort list');
 {};
 }}
 >
 <Activity className="w-4 h-4" />
 View Patient Cohort
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
  );
};

export default EPEquityAnalysis;