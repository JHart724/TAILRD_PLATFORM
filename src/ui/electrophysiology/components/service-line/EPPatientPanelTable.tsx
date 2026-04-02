import React, { useState } from 'react';
import { Search, Filter, User, Heart, Zap, Clock, Target, AlertCircle, ExternalLink, Calendar, Activity, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, ArrowUpDown, Download, Eye, Pill, FileText } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface EPPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  arrhythmia: 'AF' | 'AFL' | 'VT' | 'VF' | 'Bradycardia';
  cha2ds2vasc: number;
  hasbled: number;
  strokeRisk: number;
  assignedProvider: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  lastVisit: string;
  nextAppointment?: string;
  currentTreatment: {
 anticoagulation: boolean;
 rateControl: boolean;
 rhythmControl: boolean;
 deviceTherapy: boolean;
  };
  treatmentGaps: string[];
  deviceEligible: boolean;
  ablationCandidate: boolean;
  recentEvents: {
 strokes: number;
 bleeds: number;
 hospitalizations: number;
  };
  qualityMetrics: {
 oac_adherence?: number;
 inr_control?: number;
 rhythm_control_success?: number;
 symptom_improvement?: number;
  };
  actionItems: {
 category: 'Anticoagulation' | 'Rate_Control' | 'Rhythm_Control' | 'Device' | 'Follow_up' | 'Lab';
 description: string;
 dueDate: string;
 urgent: boolean;
  }[];
  fullChart?: {
 vitals: {
 bp: string;
 hr: number;
 rhythm: string;
 weight: number;
 };
 labs: {
 creatinine: number;
 hemoglobin: number;
 sodium: number;
 potassium: number;
 inr?: number;
 ptt?: number;
 bnp?: number;
 };
 medications: {
 name: string;
 dose: string;
 frequency: string;
 adherence?: number;
 indication: string;
 }[];
 devices?: {
 type: 'Pacemaker' | 'ICD' | 'CRT' | 'CRT-D';
 implantDate: string;
 manufacturer: string;
 model: string;
 lastInterrogation: string;
 battery: string;
 functioning: 'Normal' | 'Alert' | 'Critical';
 }[];
 procedures: {
 procedure: string;
 date: string;
 outcome: string;
 complications?: string;
 }[];
 notes: string[];
 riskFactors: string[];
  };
}

const EPPatientPanelTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterArrhythmia, setFilterArrhythmia] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTreatmentGaps, setFilterTreatmentGaps] = useState<boolean>(false);
  const [filterDeviceEligible, setFilterDeviceEligible] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<keyof EPPatient>('strokeRisk');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedPatient, setSelectedPatient] = useState<EPPatient | null>(null);

  // Comprehensive EP patient data
  const epPatients: EPPatient[] = [
 {
 id: 'EP001',
 name: 'Anderson, Margaret',
 mrn: 'EP123456',
 age: 74,
 gender: 'F',
 arrhythmia: 'AF',
 cha2ds2vasc: 6,
 hasbled: 3,
 strokeRisk: 8.7,
 assignedProvider: 'Dr. Chen',
 priority: 'critical',
 lastVisit: '2024-10-20',
 nextAppointment: '2024-11-05',
 currentTreatment: {
 anticoagulation: false,
 rateControl: true,
 rhythmControl: false,
 deviceTherapy: false
 },
 treatmentGaps: ['No anticoagulation despite high stroke risk', 'Suboptimal rate control'],
 deviceEligible: false,
 ablationCandidate: true,
 recentEvents: { strokes: 1, bleeds: 0, hospitalizations: 2 },
 qualityMetrics: { oac_adherence: 0, inr_control: 0, rhythm_control_success: 25 },
 actionItems: [
 { category: 'Anticoagulation', description: 'Initiate DOAC therapy', dueDate: '2024-10-25', urgent: true },
 { category: 'Rate_Control', description: 'Optimize beta-blocker dose', dueDate: '2024-10-28', urgent: true },
 { category: 'Follow_up', description: 'EP consultation for ablation', dueDate: '2024-11-01', urgent: false }
 ]
 },
 {
 id: 'EP002',
 name: 'Williams, David',
 mrn: 'EP234567',
 age: 67,
 gender: 'M',
 arrhythmia: 'VT',
 cha2ds2vasc: 3,
 hasbled: 1,
 strokeRisk: 4.2,
 assignedProvider: 'Dr. Rodriguez',
 priority: 'high',
 lastVisit: '2024-10-18',
 nextAppointment: '2024-10-30',
 currentTreatment: {
 anticoagulation: true,
 rateControl: false,
 rhythmControl: true,
 deviceTherapy: true
 },
 treatmentGaps: ['ICD battery approaching ERI'],
 deviceEligible: true,
 ablationCandidate: true,
 recentEvents: { strokes: 0, bleeds: 1, hospitalizations: 1 },
 qualityMetrics: { oac_adherence: 89, rhythm_control_success: 76, symptom_improvement: 82 },
 actionItems: [
 { category: 'Device', description: 'ICD generator replacement', dueDate: '2024-11-15', urgent: true },
 { category: 'Lab', description: 'Amiodarone monitoring labs', dueDate: '2024-11-01', urgent: false }
 ]
 },
 {
 id: 'EP003',
 name: 'Johnson, Patricia',
 mrn: 'EP345678',
 age: 58,
 gender: 'F',
 arrhythmia: 'AF',
 cha2ds2vasc: 4,
 hasbled: 2,
 strokeRisk: 5.8,
 assignedProvider: 'Dr. Park',
 priority: 'medium',
 lastVisit: '2024-10-15',
 nextAppointment: '2024-11-20',
 currentTreatment: {
 anticoagulation: true,
 rateControl: true,
 rhythmControl: true,
 deviceTherapy: false
 },
 treatmentGaps: ['Subtherapeutic INR levels'],
 deviceEligible: false,
 ablationCandidate: true,
 recentEvents: { strokes: 0, bleeds: 0, hospitalizations: 0 },
 qualityMetrics: { oac_adherence: 78, inr_control: 62, rhythm_control_success: 58 },
 actionItems: [
 { category: 'Anticoagulation', description: 'INR monitoring and warfarin adjustment', dueDate: '2024-10-28', urgent: false },
 { category: 'Rhythm_Control', description: 'Consider ablation consultation', dueDate: '2024-11-10', urgent: false }
 ]
 },
 {
 id: 'EP004',
 name: 'Brown, Michael',
 mrn: 'EP456789',
 age: 82,
 gender: 'M',
 arrhythmia: 'Bradycardia',
 cha2ds2vasc: 2,
 hasbled: 4,
 strokeRisk: 3.1,
 assignedProvider: 'Dr. Kim',
 priority: 'medium',
 lastVisit: '2024-10-12',
 nextAppointment: '2024-11-08',
 currentTreatment: {
 anticoagulation: false,
 rateControl: false,
 rhythmControl: false,
 deviceTherapy: true
 },
 treatmentGaps: ['Pacemaker settings suboptimal'],
 deviceEligible: true,
 ablationCandidate: false,
 recentEvents: { strokes: 0, bleeds: 1, hospitalizations: 1 },
 qualityMetrics: { symptom_improvement: 91 },
 actionItems: [
 { category: 'Device', description: 'Pacemaker optimization', dueDate: '2024-11-01', urgent: false },
 { category: 'Follow_up', description: 'Syncope evaluation', dueDate: '2024-11-05', urgent: false }
 ]
 },
 {
 id: 'EP005',
 name: 'Garcia, Maria',
 mrn: 'EP567890',
 age: 45,
 gender: 'F',
 arrhythmia: 'AF',
 cha2ds2vasc: 1,
 hasbled: 0,
 strokeRisk: 1.8,
 assignedProvider: 'Dr. Thompson',
 priority: 'low',
 lastVisit: '2024-10-10',
 nextAppointment: '2024-12-15',
 currentTreatment: {
 anticoagulation: false,
 rateControl: true,
 rhythmControl: true,
 deviceTherapy: false
 },
 treatmentGaps: [],
 deviceEligible: false,
 ablationCandidate: true,
 recentEvents: { strokes: 0, bleeds: 0, hospitalizations: 0 },
 qualityMetrics: { rhythm_control_success: 84, symptom_improvement: 95 },
 actionItems: [
 { category: 'Follow_up', description: 'Routine EP follow-up', dueDate: '2024-12-15', urgent: false }
 ]
 },
 {
 id: 'EP006',
 name: 'Davis, Robert',
 mrn: 'EP678901',
 age: 71,
 gender: 'M',
 arrhythmia: 'AFL',
 cha2ds2vasc: 5,
 hasbled: 2,
 strokeRisk: 6.4,
 assignedProvider: 'Dr. Wilson',
 priority: 'high',
 lastVisit: '2024-10-22',
 nextAppointment: '2024-11-10',
 currentTreatment: {
 anticoagulation: true,
 rateControl: true,
 rhythmControl: false,
 deviceTherapy: false
 },
 treatmentGaps: ['Failed cardioversion', 'No ablation referral'],
 deviceEligible: false,
 ablationCandidate: true,
 recentEvents: { strokes: 0, bleeds: 0, hospitalizations: 1 },
 qualityMetrics: { oac_adherence: 92, rhythm_control_success: 31 },
 actionItems: [
 { category: 'Rhythm_Control', description: 'Ablation consultation', dueDate: '2024-11-05', urgent: true },
 { category: 'Lab', description: 'Pre-ablation evaluation', dueDate: '2024-11-01', urgent: false }
 ]
 },
 {
 id: 'EP007',
 name: 'Miller, Jennifer',
 mrn: 'EP789012',
 age: 63,
 gender: 'F',
 arrhythmia: 'VF',
 cha2ds2vasc: 3,
 hasbled: 1,
 strokeRisk: 4.5,
 assignedProvider: 'Dr. Lee',
 priority: 'critical',
 lastVisit: '2024-10-25',
 nextAppointment: '2024-11-02',
 currentTreatment: {
 anticoagulation: true,
 rateControl: false,
 rhythmControl: true,
 deviceTherapy: true
 },
 treatmentGaps: ['Multiple appropriate ICD shocks'],
 deviceEligible: true,
 ablationCandidate: true,
 recentEvents: { strokes: 0, bleeds: 0, hospitalizations: 3 },
 qualityMetrics: { oac_adherence: 94, rhythm_control_success: 67 },
 actionItems: [
 { category: 'Device', description: 'ICD optimization and VT ablation evaluation', dueDate: '2024-10-28', urgent: true },
 { category: 'Rhythm_Control', description: 'Antiarrhythmic drug adjustment', dueDate: '2024-10-30', urgent: true }
 ]
 }
  ];

  // Filtering and search logic
  const filteredPatients = epPatients.filter(patient => {
 const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
 patient.assignedProvider.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesArrhythmia = filterArrhythmia === 'all' || patient.arrhythmia === filterArrhythmia;
 const matchesPriority = filterPriority === 'all' || patient.priority === filterPriority;
 const matchesTreatmentGaps = !filterTreatmentGaps || patient.treatmentGaps.length > 0;
 const matchesDeviceEligible = !filterDeviceEligible || patient.deviceEligible;

 return matchesSearch && matchesArrhythmia && matchesPriority && matchesTreatmentGaps && matchesDeviceEligible;
  });

  // Sorting logic
  const sortedPatients = [...filteredPatients].sort((a, b) => {
 const aValue = a[sortBy];
 const bValue = b[sortBy];
 
 if (typeof aValue === 'number' && typeof bValue === 'number') {
 return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
 }
 
 if (typeof aValue === 'string' && typeof bValue === 'string') {
 return sortDirection === 'desc' 
 ? bValue.localeCompare(aValue) 
 : aValue.localeCompare(bValue);
 }
 
 return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedPatients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  const getPriorityColor = (priority: string) => {
 const colors = {
 critical: 'bg-medical-red-100 text-medical-red-800 border-medical-red-300',
 high: 'bg-medical-orange-100 text-medical-orange-800 border-medical-orange-300',
 medium: 'bg-crimson-100 text-crimson-700 border-crimson-200',
 low: 'bg-green-50 text-green-600 border-green-100'
 };
 return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStrokeRiskColor = (risk: number) => {
 if (risk >= 6) return 'text-medical-red-700 bg-medical-red-100';
 if (risk >= 3) return 'text-crimson-700 bg-crimson-100';
 return 'text-green-600 bg-green-50';
  };

  const getArrhythmiaIcon = (arrhythmia: string) => {
 switch (arrhythmia) {
 case 'AF':
 case 'AFL':
 return <Heart className="w-4 h-4 text-porsche-600" />;
 case 'VT':
 case 'VF':
 return <Zap className="w-4 h-4 text-medical-red-600" />;
 case 'Bradycardia':
 return <Activity className="w-4 h-4 text-crimson-600" />;
 default:
 return <Heart className="w-4 h-4 text-titanium-600" />;
 }
  };

  const handleSort = (column: keyof EPPatient) => {
 if (sortBy === column) {
 setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
 } else {
 setSortBy(column);
 setSortDirection('desc');
 }
  };

  const handlePatientClick = (patient: EPPatient) => {
 setSelectedPatient(patient);
 console.log('Opening detailed view for EP patient:', patient.name, patient.mrn, 'Arrhythmia:', patient.arrhythmia);
 {};
  };

  const urgentActions = paginatedPatients.reduce((total, patient) => 
 total + patient.actionItems.filter(item => item.urgent).length, 0
  );

  return (
 <div className="metal-card p-8">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 EP Patient Panel
 </h2>
 <p className="text-titanium-600">
 Comprehensive electrophysiology patient database • Click rows for detailed analysis
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Urgent Actions</div>
 <div className="text-3xl font-bold text-medical-red-600 font-sf">
 {urgentActions}
 </div>
 <div className="text-sm text-titanium-600">
 Require immediate attention
 </div>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="space-y-4 mb-6 p-4 bg-titanium-50 rounded-xl border border-titanium-200">
 {/* Search Bar */}
 <div className="flex items-center gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-titanium-400" />
 <input
 type="text"
 placeholder="Search by name, MRN, or provider..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500 bg-white"
 />
 </div>
 <button
 onClick={() => {
 console.log('Exporting EP patient data');
 {};
 }}
 className="flex items-center gap-2 px-4 py-2 bg-porsche-600 text-white rounded-lg hover:bg-porsche-700 transition-colors"
 >
 <Download className="w-4 h-4" />
 Export
 </button>
 </div>

 {/* Filter Controls */}
 <div className="flex items-center gap-4 flex-wrap">
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-700">Filters:</span>
 </div>
 
 <select
 value={filterArrhythmia}
 onChange={(e) => setFilterArrhythmia(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white"
 >
 <option value="all">All Arrhythmias</option>
 <option value="AF">Atrial Fibrillation</option>
 <option value="AFL">Atrial Flutter</option>
 <option value="VT">Ventricular Tachycardia</option>
 <option value="VF">Ventricular Fibrillation</option>
 <option value="Bradycardia">Bradycardia</option>
 </select>

 <select
 value={filterPriority}
 onChange={(e) => setFilterPriority(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white"
 >
 <option value="all">All Priorities</option>
 <option value="critical">Critical</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 </select>

 <label className="flex items-center gap-2 px-3 py-2 bg-white border border-titanium-300 rounded-lg cursor-pointer hover:bg-titanium-50">
 <input
 type="checkbox"
 checked={filterTreatmentGaps}
 onChange={(e) => setFilterTreatmentGaps(e.target.checked)}
 className="rounded"
 />
 <span className="text-sm text-titanium-800">Treatment Gaps Only</span>
 </label>

 <label className="flex items-center gap-2 px-3 py-2 bg-white border border-titanium-300 rounded-lg cursor-pointer hover:bg-titanium-50">
 <input
 type="checkbox"
 checked={filterDeviceEligible}
 onChange={(e) => setFilterDeviceEligible(e.target.checked)}
 className="rounded"
 />
 <span className="text-sm text-titanium-800">Device Eligible</span>
 </label>

 <div className="flex items-center gap-2">
 <span className="text-sm text-titanium-600">Show:</span>
 <select
 value={pageSize}
 onChange={(e) => {
 setPageSize(Number(e.target.value));
 setCurrentPage(1);
 }}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white"
 >
 <option value={5}>5 patients</option>
 <option value={10}>10 patients</option>
 <option value={25}>25 patients</option>
 <option value={50}>50 patients</option>
 </select>
 </div>
 </div>
 </div>

 {/* Patient Table */}
 <div className="bg-white rounded-xl border border-titanium-200 overflow-hidden mb-6">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-titanium-50 border-b border-titanium-200">
 <tr>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('name')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Patient
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('arrhythmia')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Arrhythmia
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('strokeRisk')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Stroke Risk
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('priority')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Priority
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">Treatment Status</th>
 <th className="px-4 py-3 text-left">Treatment Gaps</th>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('assignedProvider')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Provider
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">
 <button
 onClick={() => handleSort('lastVisit')}
 className="flex items-center gap-1 text-sm font-semibold text-titanium-700 hover:text-titanium-900"
 >
 Last Visit
 <ArrowUpDown className="w-3 h-3" />
 </button>
 </th>
 <th className="px-4 py-3 text-left">Actions</th>
 </tr>
 </thead>
 <tbody>
 {paginatedPatients.map((patient, index) => (
 <tr
 key={patient.id}
 onClick={() => handlePatientClick(patient)}
 className="border-b border-titanium-100 hover:bg-titanium-50 cursor-pointer transition-colors"
 >
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-porsche-100">
 <User className="w-4 h-4 text-porsche-600" />
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 {patient.mrn} • Age {patient.age}{patient.gender}
 </div>
 </div>
 </div>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 {getArrhythmiaIcon(patient.arrhythmia)}
 <span className="font-medium text-titanium-900">{patient.arrhythmia}</span>
 </div>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className={`px-2 py-1 rounded text-sm font-semibold ${getStrokeRiskColor(patient.strokeRisk)}`}>
 {toFixed(patient.strokeRisk, 1)}%
 </div>
 <div className="text-xs text-titanium-600">
 CHA₂DS₂-VASc: {patient.cha2ds2vasc}
 </div>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className={`px-2 py-1 rounded text-sm font-semibold border ${getPriorityColor(patient.priority)}`}>
 {patient.priority.toUpperCase()}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="grid grid-cols-2 gap-1 text-xs">
 <div className={`px-1 py-0.5 rounded text-center ${
 patient.currentTreatment.anticoagulation ? 'bg-green-50 text-green-600' : 'bg-red-100 text-red-700'
 }`}>
 OAC
 </div>
 <div className={`px-1 py-0.5 rounded text-center ${
 patient.currentTreatment.rateControl ? 'bg-green-50 text-green-600' : 'bg-red-100 text-red-700'
 }`}>
 Rate
 </div>
 <div className={`px-1 py-0.5 rounded text-center ${
 patient.currentTreatment.rhythmControl ? 'bg-green-50 text-green-600' : 'bg-red-100 text-red-700'
 }`}>
 Rhythm
 </div>
 <div className={`px-1 py-0.5 rounded text-center ${
 patient.currentTreatment.deviceTherapy ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-700'
 }`}>
 Device
 </div>
 </div>
 </td>
 <td className="px-4 py-3">
 {patient.treatmentGaps.length > 0 ? (
 <div className="space-y-1">
 {patient.treatmentGaps.slice(0, 2).map((gap, idx) => (
 <div key={gap} className="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded">
 {gap}
 </div>
 ))}
 {patient.treatmentGaps.length > 2 && (
 <div className="text-xs text-titanium-600">+{patient.treatmentGaps.length - 2} more</div>
 )}
 </div>
 ) : (
 <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded">
 No gaps identified
 </span>
 )}
 </td>
 <td className="px-4 py-3">
 <div className="text-sm text-titanium-900">{patient.assignedProvider}</div>
 </td>
 <td className="px-4 py-3">
 <div className="text-sm text-titanium-900">
 {new Date(patient.lastVisit).toLocaleDateString()}
 </div>
 {patient.nextAppointment && (
 <div className="text-xs text-titanium-600">
 Next: {new Date(patient.nextAppointment).toLocaleDateString()}
 </div>
 )}
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <button
 onClick={(e) => {
 e.stopPropagation();
 console.log('Opening patient chart for:', patient.name);
 {};
 }}
 className="p-1 rounded hover:bg-porsche-100 text-porsche-600 transition-colors"
 title="Open Chart"
 >
 <ExternalLink className="w-4 h-4" />
 </button>
 {patient.actionItems.filter(item => item.urgent).length > 0 && (
 <span className="w-2 h-2 bg-red-500 rounded-full"></span>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between">
 <div className="text-sm text-titanium-600">
 Showing {startIndex + 1}-{Math.min(endIndex, sortedPatients.length)} of {sortedPatients.length} patients
 </div>
 
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
 disabled={currentPage === 1}
 className="flex items-center gap-1 px-3 py-2 border border-titanium-300 rounded-lg text-sm text-titanium-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-titanium-50"
 >
 <ChevronLeft className="w-4 h-4" />
 Previous
 </button>
 
 <div className="flex items-center gap-1">
 {Array.from({ length: totalPages }, (_, i) => i + 1)
 .filter(page => page <= 5 || Math.abs(page - currentPage) <= 1 || page > totalPages - 2)
 .map((page, index, array) => {
 const showEllipsis = index > 0 && array[index - 1] < page - 1;
 return (
 <React.Fragment key={page}>
 {showEllipsis && <span className="px-2 text-titanium-400">...</span>}
 <button
 onClick={() => setCurrentPage(page)}
 className={`px-3 py-2 text-sm rounded-lg border ${
 currentPage === page
 ? 'bg-porsche-600 text-white border-porsche-600'
 : 'border-titanium-300 text-titanium-700 hover:bg-titanium-50'
 }`}
 >
 {page}
 </button>
 </React.Fragment>
 );
 })}
 </div>
 
 <button
 onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
 disabled={currentPage === totalPages}
 className="flex items-center gap-1 px-3 py-2 border border-titanium-300 rounded-lg text-sm text-titanium-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-titanium-50"
 >
 Next
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Summary Statistics */}
 <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-titanium-200">
 <div className="text-center">
 <div className="text-2xl font-bold text-medical-red-600">
 {sortedPatients.filter(p => p.priority === 'critical' || p.priority === 'high').length}
 </div>
 <div className="text-sm text-titanium-600">High Priority</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-crimson-600">
 {sortedPatients.filter(p => p.treatmentGaps.length > 0).length}
 </div>
 <div className="text-sm text-titanium-600">Treatment Gaps</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-porsche-600">
 {sortedPatients.filter(p => p.deviceEligible).length}
 </div>
 <div className="text-sm text-titanium-600">Device Eligible</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-teal-700">
 {sortedPatients.filter(p => p.ablationCandidate).length}
 </div>
 <div className="text-sm text-titanium-600">Ablation Candidates</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-titanium-900">
 {sortedPatients.reduce((sum, p) => sum + p.actionItems.length, 0)}
 </div>
 <div className="text-sm text-titanium-600">Total Actions</div>
 </div>
 </div>
 </div>
  );
};

export default EPPatientPanelTable;