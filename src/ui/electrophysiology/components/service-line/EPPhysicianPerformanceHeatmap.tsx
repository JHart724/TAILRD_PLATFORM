import React, { useState } from 'react';
import { User, TrendingUp, TrendingDown, X, Users, Calendar, FileText, Activity, ChevronRight, Filter, ArrowUpDown, Eye, Award, Target, Zap, Heart } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface EPPhysicianData {
  id: string;
  name: string;
  title: string;
  specialty: 'General EP' | 'Device Specialist' | 'Ablation Specialist' | 'Heart Rhythm';
  group: 'Academic' | 'Private' | 'Hospital Employed';
  oacs_rx_rate: number;  // OAC Rx Rate
  inr_control_pct: number;  // INR Control %
  ablation_referral_rate: number;  // Ablation Referral Rate
  stroke_events: number;  // Stroke Events
  bleeding_events: number;  // Bleeding Events
  patient_volume: number;  // Patient Volume
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface EPPatientData {
  id: string;
  name: string;
  age: number;
  mrn: string;
  arrhythmia: 'AF' | 'AFL' | 'VT' | 'VF' | 'Bradycardia';
  cha2ds2vasc: number;
  hasbled: number;
  strokeRisk: number;
  lastVisit: Date;
  currentTherapy: string[];
  nextSteps: string[];
  treatmentGaps: string[];
}

const EPPhysicianPerformanceHeatmap: React.FC = () => {
  const [selectedCell, setSelectedCell] = useState<{physician: string, metric: string} | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedPhysician, setSelectedPhysician] = useState<string | null>(null);

  // EP-specific metrics configuration
  const metrics = [
 { key: 'oacs_rx_rate', label: 'OAC Rx Rate', unit: '%', description: 'Oral anticoagulation prescribing rate for eligible patients' },
 { key: 'inr_control_pct', label: 'INR Control %', unit: '%', description: 'Percentage of patients with therapeutic INR levels' },
 { key: 'ablation_referral_rate', label: 'Ablation Referral Rate', unit: '%', description: 'Rate of appropriate ablation referrals' },
 { key: 'stroke_events', label: 'Stroke Events', unit: '#', description: 'Number of stroke events in past 12 months' },
 { key: 'bleeding_events', label: 'Bleeding Events', unit: '#', description: 'Number of major bleeding events in past 12 months' },
 { key: 'patient_volume', label: 'Patient Volume', unit: '#', description: 'Total EP patients managed' }
  ];

  // Mock physician data - would be replaced with real API data
  const physicianData: EPPhysicianData[] = [
 {
 id: 'EP001',
 name: 'Dr. Sarah Chen',
 title: 'Lead Electrophysiologist',
 specialty: 'Ablation Specialist',
 group: 'Academic',
 oacs_rx_rate: 92.5,
 inr_control_pct: 78.4,
 ablation_referral_rate: 24.1,
 stroke_events: 2,
 bleeding_events: 1,
 patient_volume: 387,
 trend: 'up',
 trendValue: 4.2
 },
 {
 id: 'EP002',
 name: 'Dr. Michael Rodriguez',
 title: 'Cardiac Electrophysiologist',
 specialty: 'Device Specialist',
 group: 'Private',
 oacs_rx_rate: 88.7,
 inr_control_pct: 82.1,
 ablation_referral_rate: 18.3,
 stroke_events: 1,
 bleeding_events: 3,
 patient_volume: 234,
 trend: 'up',
 trendValue: 2.8
 },
 {
 id: 'EP003',
 name: 'Dr. Jennifer Park',
 title: 'Electrophysiologist',
 specialty: 'General EP',
 group: 'Hospital Employed',
 oacs_rx_rate: 76.2,
 inr_control_pct: 68.9,
 ablation_referral_rate: 31.7,
 stroke_events: 4,
 bleeding_events: 2,
 patient_volume: 192,
 trend: 'down',
 trendValue: -1.3
 },
 {
 id: 'EP004',
 name: 'Dr. David Kim',
 title: 'Senior Electrophysiologist',
 specialty: 'Heart Rhythm',
 group: 'Academic',
 oacs_rx_rate: 94.1,
 inr_control_pct: 85.3,
 ablation_referral_rate: 29.4,
 stroke_events: 1,
 bleeding_events: 0,
 patient_volume: 412,
 trend: 'up',
 trendValue: 6.7
 },
 {
 id: 'EP005',
 name: 'Dr. Lisa Thompson',
 title: 'Electrophysiologist',
 specialty: 'Device Specialist',
 group: 'Private',
 oacs_rx_rate: 85.3,
 inr_control_pct: 74.6,
 ablation_referral_rate: 15.8,
 stroke_events: 3,
 bleeding_events: 1,
 patient_volume: 298,
 trend: 'stable',
 trendValue: 0.1
 },
 {
 id: 'EP006',
 name: 'Dr. James Wilson',
 title: 'Electrophysiologist',
 specialty: 'General EP',
 group: 'Hospital Employed',
 oacs_rx_rate: 81.4,
 inr_control_pct: 71.2,
 ablation_referral_rate: 22.9,
 stroke_events: 2,
 bleeding_events: 4,
 patient_volume: 156,
 trend: 'down',
 trendValue: -2.1
 }
  ];

  // Mock patient data for each physician
  const physicianPatients: Record<string, EPPatientData[]> = {
 'EP001': [
 { id: 'P001', name: 'Johnson, Mary', age: 67, mrn: 'MRN001', arrhythmia: 'AF', cha2ds2vasc: 6, hasbled: 2, strokeRisk: 8.5, lastVisit: new Date('2024-10-20'), currentTherapy: ['Apixaban 5mg BID', 'Metoprolol 50mg BID'], nextSteps: ['Continue current therapy', 'INR monitoring'], treatmentGaps: [] },
 { id: 'P002', name: 'Smith, Robert', age: 72, mrn: 'MRN002', arrhythmia: 'VT', cha2ds2vasc: 4, hasbled: 1, strokeRisk: 5.2, lastVisit: new Date('2024-10-18'), currentTherapy: ['Amiodarone 200mg daily'], nextSteps: ['ICD evaluation', 'EP follow-up'], treatmentGaps: ['No anticoagulation'] },
 { id: 'P003', name: 'Davis, Patricia', age: 59, mrn: 'MRN003', arrhythmia: 'AF', cha2ds2vasc: 3, hasbled: 1, strokeRisk: 4.1, lastVisit: new Date('2024-10-22'), currentTherapy: ['Rivaroxaban 20mg daily'], nextSteps: ['Rhythm monitoring', 'Consider ablation'], treatmentGaps: ['Suboptimal rate control'] }
 ],
 'EP002': [
 { id: 'P004', name: 'Wilson, James', age: 70, mrn: 'MRN004', arrhythmia: 'Bradycardia', cha2ds2vasc: 2, hasbled: 1, strokeRisk: 3.2, lastVisit: new Date('2024-10-19'), currentTherapy: ['Dual-chamber pacemaker'], nextSteps: ['Device interrogation', 'Rate optimization'], treatmentGaps: [] },
 { id: 'P005', name: 'Brown, Linda', age: 65, mrn: 'MRN005', arrhythmia: 'VF', cha2ds2vasc: 3, hasbled: 2, strokeRisk: 4.8, lastVisit: new Date('2024-10-21'), currentTherapy: ['ICD', 'Carvedilol 25mg BID'], nextSteps: ['ICD follow-up', 'EP consultation'], treatmentGaps: ['No anticoagulation'] }
 ],
 'EP003': [
 { id: 'P006', name: 'Miller, David', age: 68, mrn: 'MRN006', arrhythmia: 'AFL', cha2ds2vasc: 4, hasbled: 3, strokeRisk: 6.1, lastVisit: new Date('2024-10-23'), currentTherapy: ['Warfarin 5mg daily'], nextSteps: ['INR monitoring', 'Ablation consultation'], treatmentGaps: ['Subtherapeutic INR'] },
 { id: 'P007', name: 'Garcia, Maria', age: 63, mrn: 'MRN007', arrhythmia: 'AF', cha2ds2vasc: 5, hasbled: 2, strokeRisk: 7.3, lastVisit: new Date('2024-10-17'), currentTherapy: ['Diltiazem 120mg daily'], nextSteps: ['Start anticoagulation', 'Rate control optimization'], treatmentGaps: ['No anticoagulation', 'Inadequate rate control'] }
 ],
 'EP004': [
 { id: 'P008', name: 'Taylor, John', age: 71, mrn: 'MRN008', arrhythmia: 'AF', cha2ds2vasc: 6, hasbled: 1, strokeRisk: 8.9, lastVisit: new Date('2024-10-16'), currentTherapy: ['Edoxaban 60mg daily', 'Amiodarone 200mg daily'], nextSteps: ['Continue current therapy', 'Rhythm monitoring'], treatmentGaps: [] },
 { id: 'P009', name: 'Anderson, Susan', age: 66, mrn: 'MRN009', arrhythmia: 'VT', cha2ds2vasc: 3, hasbled: 1, strokeRisk: 4.5, lastVisit: new Date('2024-10-24'), currentTherapy: ['ICD', 'Sotalol 80mg BID'], nextSteps: ['Device optimization', 'Antiarrhythmic monitoring'], treatmentGaps: ['Consider ablation'] }
 ],
 'EP005': [
 { id: 'P010', name: 'Thomas, Michael', age: 69, mrn: 'MRN010', arrhythmia: 'AF', cha2ds2vasc: 4, hasbled: 2, strokeRisk: 5.8, lastVisit: new Date('2024-10-22'), currentTherapy: ['CRT-D', 'Dabigatran 150mg BID'], nextSteps: ['Device optimization', 'Continue anticoagulation'], treatmentGaps: [] },
 { id: 'P011', name: 'Martinez, Carlos', age: 58, mrn: 'MRN011', arrhythmia: 'Bradycardia', cha2ds2vasc: 1, hasbled: 1, strokeRisk: 2.1, lastVisit: new Date('2024-10-25'), currentTherapy: ['Single-chamber pacemaker'], nextSteps: ['Device follow-up'], treatmentGaps: [] }
 ],
 'EP006': [
 { id: 'P012', name: 'Lee, Jennifer', age: 64, mrn: 'MRN012', arrhythmia: 'AF', cha2ds2vasc: 5, hasbled: 4, strokeRisk: 7.1, lastVisit: new Date('2024-10-20'), currentTherapy: ['Aspirin 81mg daily'], nextSteps: ['Risk-benefit assessment', 'Consider DOAC'], treatmentGaps: ['High bleeding risk on aspirin only', 'Suboptimal anticoagulation'] }
 ]
  };

  // Filtering logic
  const filteredPhysicians = physicianData.filter(physician => {
 if (filterSpecialty !== 'all' && physician.specialty !== filterSpecialty) return false;
 if (filterGroup !== 'all' && physician.group !== filterGroup) return false;
 return true;
  });

  // Sorting logic
  const sortedPhysicians = [...filteredPhysicians].sort((a, b) => {
 if (sortBy === 'name') {
 return a.name.localeCompare(b.name);
 }
 if (typeof a[sortBy as keyof EPPhysicianData] === 'number' && typeof b[sortBy as keyof EPPhysicianData] === 'number') {
 return (b[sortBy as keyof EPPhysicianData] as number) - (a[sortBy as keyof EPPhysicianData] as number);
 }
 return 0;
  });

  // Color scale function for heatmap cells
  const getHeatmapColor = (value: number, metric: string) => {
 const metricRanges = {
 'oacs_rx_rate': { good: 85, warning: 70, poor: 0 },
 'inr_control_pct': { good: 80, warning: 65, poor: 0 },
 'ablation_referral_rate': { good: 25, warning: 15, poor: 0 },
 'stroke_events': { good: 0, warning: 2, poor: 5 }, // Inverted - lower is better
 'bleeding_events': { good: 0, warning: 2, poor: 5 }, // Inverted - lower is better
 'patient_volume': { good: 300, warning: 150, poor: 0 }
 };

 const range = metricRanges[metric as keyof typeof metricRanges] || { good: 80, warning: 60, poor: 0 };
 
 if (metric === 'stroke_events' || metric === 'bleeding_events') {
 // For event counts, lower is better
 if (value <= range.good) return 'bg-[#2C4A60] text-white';
 if (value <= range.warning) return 'bg-crimson-500 text-white';
 return 'bg-medical-red-500 text-white';
 } else {
 // For rates and percentages, higher is better
 if (value >= range.good) return 'bg-[#2C4A60] text-white';
 if (value >= range.warning) return 'bg-crimson-500 text-white';
 return 'bg-medical-red-500 text-white';
 }
  };

  const formatValue = (value: number, metric: string) => {
 const metricConfig = metrics.find(m => m.key === metric);
 if (metricConfig?.unit === '%') {
 return `${toFixed(value, 1)}%`;
 }
 if (metricConfig?.unit === '#') {
 return value.toString();
 }
 return toFixed(value, 1);
  };

  const selectedPhysicianData = physicianData.find(p => p.id === selectedPhysician);
  const selectedPatients = selectedPhysician ? physicianPatients[selectedPhysician] || [] : [];

  const handleCellClick = (physicianId: string, metricKey: string) => {
 setSelectedCell({ physician: physicianId, metric: metricKey });
 console.log('Opening detailed view for:', physicianId, metricKey);
 // TODO: Implement detailed cell drill-down modal
 {};
  };

  const handlePhysicianClick = (physicianId: string) => {
 setSelectedPhysician(physicianId);
 setShowPatientPanel(true);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
 switch (trend) {
 case 'up':
 return <TrendingUp className="w-4 h-4 text-[#2C4A60]" />;
 case 'down':
 return <TrendingDown className="w-4 h-4 text-medical-red-600" />;
 default:
 return <div className="w-4 h-4 bg-titanium-400 rounded-full"></div>;
 }
  };

  return (
 <>
 <div className="metal-card p-8">
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 EP Physician Performance Heatmap
 </h2>
 <p className="text-titanium-600">
 Performance metrics by physician • Click cells for detailed drill-down • Click physician names for patient lists
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-titanium-600" />
 <select
 value={filterSpecialty}
 onChange={(e) => setFilterSpecialty(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 <option value="all">All Specialties</option>
 <option value="General EP">General EP</option>
 <option value="Device Specialist">Device Specialist</option>
 <option value="Ablation Specialist">Ablation Specialist</option>
 <option value="Heart Rhythm">Heart Rhythm</option>
 </select>
 <select
 value={filterGroup}
 onChange={(e) => setFilterGroup(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 <option value="all">All Groups</option>
 <option value="Academic">Academic</option>
 <option value="Private">Private</option>
 <option value="Hospital Employed">Hospital Employed</option>
 </select>
 </div>
 <div className="flex items-center gap-2">
 <ArrowUpDown className="w-4 h-4 text-titanium-600" />
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg text-sm bg-white"
 >
 <option value="name">Name</option>
 <option value="oacs_rx_rate">OAC Rx Rate</option>
 <option value="inr_control_pct">INR Control %</option>
 <option value="patient_volume">Patient Volume</option>
 </select>
 </div>
 </div>
 </div>

 {/* Heatmap Table */}
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr>
 <th className="p-4 text-left border-b border-titanium-200 bg-titanium-50 sticky left-0 z-10">
 <div className="font-semibold text-titanium-900">Physician</div>
 </th>
 {metrics.map((metric) => (
 <th key={metric.key} className="p-4 text-center border-b border-titanium-200 bg-titanium-50 min-w-32">
 <div className="font-semibold text-titanium-900">{metric.label}</div>
 <div className="text-xs text-titanium-600 mt-1">{metric.unit}</div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {sortedPhysicians.map((physician) => (
 <tr key={physician.id} className="hover:bg-titanium-50">
 <td className="p-4 border-b border-titanium-100 sticky left-0 bg-white z-10">
 <button
 onClick={() => handlePhysicianClick(physician.id)}
 className="flex items-center gap-3 text-left hover:bg-titanium-50 p-2 rounded-lg transition-colors w-full"
 >
 <div className="p-2 rounded-lg bg-porsche-100">
 <User className="w-4 h-4 text-porsche-600" />
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{physician.name}</div>
 <div className="text-xs text-titanium-600">{physician.specialty}</div>
 <div className="text-xs text-titanium-500">{physician.group}</div>
 </div>
 <div className="flex items-center gap-1 ml-auto">
 {getTrendIcon(physician.trend)}
 <span className={`text-xs font-semibold ${
 physician.trend === 'up' ? 'text-[#2C4A60]' :
 physician.trend === 'down' ? 'text-medical-red-600' : 'text-titanium-600'
 }`}>
 {physician.trend !== 'stable' && (physician.trendValue > 0 ? '+' : '')}{physician.trendValue}%
 </span>
 </div>
 </button>
 </td>
 {metrics.map((metric) => (
 <td key={metric.key} className="p-0 border-b border-titanium-100">
 <button
 onClick={() => handleCellClick(physician.id, metric.key)}
 className={`w-full h-full p-4 text-center font-semibold hover:opacity-80 transition-opacity ${
 getHeatmapColor(physician[metric.key as keyof EPPhysicianData] as number, metric.key)
 }`}
 title={`${physician.name} - ${metric.label}: ${formatValue(physician[metric.key as keyof EPPhysicianData] as number, metric.key)}`}
 >
 {formatValue(physician[metric.key as keyof EPPhysicianData] as number, metric.key)}
 </button>
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Legend */}
 <div className="mt-6 p-4 bg-titanium-50 rounded-xl">
 <h4 className="font-semibold text-titanium-900 mb-3">Performance Legend</h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-[#2C4A60] rounded"></div>
 <span className="text-sm text-titanium-700">Excellent Performance</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-crimson-500 rounded"></div>
 <span className="text-sm text-titanium-700">Needs Improvement</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-medical-red-500 rounded"></div>
 <span className="text-sm text-titanium-700">Requires Attention</span>
 </div>
 </div>
 
 <div className="mt-4 text-sm text-titanium-600">
 <p><strong>Note:</strong> For Stroke Events and Bleeding Events, lower numbers indicate better performance. 
 Click any cell for detailed patient breakdown and improvement recommendations.</p>
 </div>
 </div>

 {/* Summary Statistics */}
 <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div>
 <div className="text-sm text-titanium-600 mb-1">Top OAC Performer</div>
 <div className="text-lg font-bold text-[#2C4A60]">
 {sortedPhysicians.sort((a, b) => b.oacs_rx_rate - a.oacs_rx_rate)[0]?.name}
 </div>
 <div className="text-sm text-titanium-600">
 {toFixed(sortedPhysicians.sort((a, b) => b.oacs_rx_rate - a.oacs_rx_rate)[0]?.oacs_rx_rate, 1)}% Prescription Rate
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Average INR Control</div>
 <div className="text-lg font-bold text-titanium-900">
 {toFixed(sortedPhysicians.reduce((sum, p) => sum + p.inr_control_pct, 0) / sortedPhysicians.length, 1)}%
 </div>
 <div className="text-sm text-titanium-600">
 Across {sortedPhysicians.length} physicians
 </div>
 </div>

 <div>
 <div className="text-sm text-titanium-600 mb-1">Total EP Patients</div>
 <div className="text-lg font-bold text-porsche-600">
 {sortedPhysicians.reduce((sum, p) => sum + p.patient_volume, 0)}
 </div>
 <div className="text-sm text-titanium-600">
 Under EP management
 </div>
 </div>
 </div>
 </div>

 {/* Physician Patient Panel */}
 {showPatientPanel && selectedPhysicianData && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
 <div className="w-full max-w-4xl bg-white h-full overflow-y-auto shadow-2xl">
 {/* Panel Header */}
 <div className="sticky top-0 bg-white border-b border-titanium-200 p-6 z-10">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">{selectedPhysicianData.name}</h3>
 <p className="text-titanium-600 mt-1">
 {selectedPhysicianData.title} • {selectedPhysicianData.specialty} • {selectedPatients.length} patients
 </p>
 </div>
 <button
 onClick={() => setShowPatientPanel(false)}
 className="p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-5 h-5 text-titanium-600" />
 </button>
 </div>
 </div>

 {/* Panel Content */}
 <div className="p-6">
 {/* Physician Performance Summary */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-gradient-to-br from-chrome-50 to-chrome-100 p-4 rounded-xl">
 <div className="text-sm text-chrome-700 font-medium flex items-center gap-1">
 <Heart className="w-4 h-4" />
 OAC Prescription Rate
 </div>
 <div className="text-2xl font-bold text-chrome-800">{toFixed(selectedPhysicianData.oacs_rx_rate, 1)}%</div>
 </div>
 <div className={`p-4 rounded-xl ${
 selectedPhysicianData.inr_control_pct >= 80 ? 'bg-gradient-to-br from-[#EFF3F7] to-[#E4EDF5]' : 'bg-gradient-to-br from-slate-50 to-slate-100'
 }`}>
 <div className={`text-sm font-medium flex items-center gap-1 ${
 selectedPhysicianData.inr_control_pct >= 80 ? 'text-[#2C4A60]' : 'text-[#6B7280]'
 }`}>
 <Target className="w-4 h-4" />
 INR Control
 </div>
 <div className={`text-2xl font-bold ${
 selectedPhysicianData.inr_control_pct >= 80 ? 'text-[#2C4A60]' : 'text-[#6B7280]'
 }`}>{toFixed(selectedPhysicianData.inr_control_pct, 1)}%</div>
 </div>
 <div className="bg-gradient-to-br from-arterial-50 to-arterial-100 p-4 rounded-xl">
 <div className="text-sm text-arterial-700 font-medium flex items-center gap-1">
 <Zap className="w-4 h-4" />
 Ablation Referral Rate
 </div>
 <div className="text-2xl font-bold text-arterial-800">{toFixed(selectedPhysicianData.ablation_referral_rate, 1)}%</div>
 </div>
 </div>

 {/* Patient List */}
 <div className="space-y-4">
 <h4 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Patient Details
 </h4>
 
 {selectedPatients.map((patient) => (
 <div key={patient.id} className="border border-titanium-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 patient.strokeRisk >= 7 ? 'bg-red-500' :
 patient.strokeRisk >= 4 ? 'bg-[#F0F5FA]' : 'bg-[#C8D4DC]'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 MRN: {patient.mrn} • Age {patient.age} • {patient.arrhythmia}
 </div>
 <div className="text-sm text-titanium-500">
 CHA₂DS₂-VASc: {patient.cha2ds2vasc} • HAS-BLED: {patient.hasbled} • Stroke Risk: {patient.strokeRisk}%
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.strokeRisk >= 7 ? 'bg-red-100 text-red-700' :
 patient.strokeRisk >= 4 ? 'bg-[#FAF6E8] text-[#8B6914]' : 'bg-[#F0F7F4] text-[#2D6147]'
 }`}>
 {patient.strokeRisk >= 7 ? 'HIGH RISK' : patient.strokeRisk >= 4 ? 'MODERATE RISK' : 'LOW RISK'}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <Activity className="w-3 h-3" />
 Current Therapy
 </div>
 <div className="space-y-1">
 {patient.currentTherapy.map((therapy, idx) => (
 <div key={therapy} className="text-xs bg-porsche-100 text-porsche-700 px-2 py-1 rounded">
 {therapy}
 </div>
 ))}
 </div>
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
 <div className="text-sm font-medium text-titanium-700 mb-2">Treatment Gaps</div>
 <div className="space-y-1">
 {patient.treatmentGaps.length > 0 ? (
 patient.treatmentGaps.map((gap, idx) => (
 <div key={gap} className="text-xs bg-[#FAF6E8] text-[#8B6914] px-2 py-1 rounded">
 {gap}
 </div>
 ))
 ) : (
 <div className="text-xs bg-[#F0F7F4] text-[#2D6147] px-2 py-1 rounded">
 No gaps identified
 </div>
 )}
 </div>
 </div>
 </div>

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

 {selectedPatients.length === 0 && (
 <div className="text-center py-8 text-titanium-500">
 No patient data available for this physician.
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 mt-6 pt-6 border-t border-titanium-200">
 <button 
 className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium"
 onClick={() => {
 console.log('Opening physician performance report');
 {};
 }}
 >
 View Performance Report
 </button>
 <button 
 className="flex-1 bg-white border border-titanium-300 text-titanium-700 py-3 px-4 rounded-lg hover:bg-titanium-50 transition-colors font-medium"
 onClick={() => {
 console.log('Opening quality improvement plan');
 {};
 }}
 >
 Quality Improvement Plan
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
  );
};

export default EPPhysicianPerformanceHeatmap;