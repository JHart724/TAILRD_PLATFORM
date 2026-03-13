import React, { useState, useMemo } from 'react';
import {
  Heart,
  Activity,
  Shield,
  Zap,
  Eye,
  AlertTriangle,
  DollarSign,
  Calendar,
  Clock,
  Filter,
  Download,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';

export interface DeviceEligiblePatient {
  id: string;
  patientName: string;
  patientMRN: string;
  age: number;
  deviceType: 'CRT' | 'ICD' | 'WATCHMAN' | 'CardioMEMS' | 'TAVR' | 'MitraClip';
  eligibilityCriteria: string[];
  eligibilityCriteriaMet: number;
  totalCriteria: number;
  barriers: string[];
  daysSinceEligible: number;
  estimatedDRGRevenue: number;
  clinicalContext: {
 ejectionFraction?: number;
 nyhaClass?: string;
 qrsDuration?: number;
 creatinine?: number;
 bmi?: number;
 comorbidities?: string[];
  };
  riskScore: number;
  priority: 'high' | 'medium' | 'low';
  assignedProvider?: string;
  lastReviewed?: string;
  status: 'eligible' | 'pending-approval' | 'scheduled' | 'declined' | 'contraindicated';
}

type SortField = 'daysSinceEligible' | 'estimatedDRGRevenue' | 'patientName' | 'riskScore';

const DeviceUnderutilizationPanel: React.FC = () => {
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('estimatedDRGRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  // Mock data
  const mockPatients: DeviceEligiblePatient[] = [
 {
 id: 'patient-001',
 patientName: 'John Anderson',
 patientMRN: 'MRN123456',
 age: 68,
 deviceType: 'CRT',
 eligibilityCriteria: [
 'EF ≤ 35%',
 'NYHA Class II-IV',
 'QRS ≥ 130ms',
 'LBBB morphology',
 'Optimal medical therapy ≥ 3 months'
 ],
 eligibilityCriteriaMet: 5,
 totalCriteria: 5,
 barriers: ['Insurance prior authorization required', 'Patient hesitant about procedure'],
 daysSinceEligible: 45,
 estimatedDRGRevenue: 95000,
 clinicalContext: {
 ejectionFraction: 28,
 nyhaClass: 'III',
 qrsDuration: 145,
 creatinine: 1.2,
 comorbidities: ['Diabetes', 'Hypertension']
 },
 riskScore: 7.5,
 priority: 'high',
 assignedProvider: 'Dr. Sarah Chen',
 lastReviewed: '2024-12-10T14:30:00Z',
 status: 'eligible'
 },
 {
 id: 'patient-002',
 patientName: 'Maria Rodriguez',
 patientMRN: 'MRN789012',
 age: 72,
 deviceType: 'ICD',
 eligibilityCriteria: [
 'EF ≤ 35%',
 'Ischemic cardiomyopathy',
 'Life expectancy > 1 year',
 'Optimal medical therapy'
 ],
 eligibilityCriteriaMet: 4,
 totalCriteria: 4,
 barriers: ['Family concerns about device complications'],
 daysSinceEligible: 32,
 estimatedDRGRevenue: 68000,
 clinicalContext: {
 ejectionFraction: 25,
 nyhaClass: 'II',
 creatinine: 0.9,
 comorbidities: ['Previous MI', 'Hyperlipidemia']
 },
 riskScore: 6.2,
 priority: 'high',
 assignedProvider: 'Dr. Michael Torres',
 lastReviewed: '2024-12-12T10:15:00Z',
 status: 'eligible'
 },
 {
 id: 'patient-003',
 patientName: 'Robert Chen',
 patientMRN: 'MRN345678',
 age: 75,
 deviceType: 'WATCHMAN',
 eligibilityCriteria: [
 'CHA2DS2-VASc ≥ 2',
 'HAS-BLED score favorable',
 'Contraindication to anticoagulation',
 'Life expectancy > 1 year'
 ],
 eligibilityCriteriaMet: 4,
 totalCriteria: 4,
 barriers: ['Complex anatomy on TEE', 'Prior GI bleeding episode'],
 daysSinceEligible: 67,
 estimatedDRGRevenue: 42000,
 clinicalContext: {
 bmi: 28.5,
 creatinine: 1.4,
 comorbidities: ['Atrial fibrillation', 'Previous GI bleed', 'CKD Stage 3']
 },
 riskScore: 8.1,
 priority: 'medium',
 assignedProvider: 'Dr. Jennifer Walsh',
 lastReviewed: '2024-12-08T16:45:00Z',
 status: 'pending-approval'
 },
 {
 id: 'patient-004',
 patientName: 'Sarah Johnson',
 patientMRN: 'MRN567890',
 age: 78,
 deviceType: 'TAVR',
 eligibilityCriteria: [
 'Severe aortic stenosis',
 'High surgical risk (STS > 8%)',
 'Favorable anatomy',
 'Life expectancy > 1 year'
 ],
 eligibilityCriteriaMet: 4,
 totalCriteria: 4,
 barriers: [],
 daysSinceEligible: 18,
 estimatedDRGRevenue: 125000,
 clinicalContext: {
 ejectionFraction: 45,
 comorbidities: ['Severe AS', 'Frailty', 'Previous stroke']
 },
 riskScore: 9.2,
 priority: 'high',
 assignedProvider: 'Dr. David Kim',
 lastReviewed: '2024-12-13T09:20:00Z',
 status: 'scheduled'
 },
 {
 id: 'patient-005',
 patientName: 'Michael Brown',
 patientMRN: 'MRN678901',
 age: 65,
 deviceType: 'MitraClip',
 eligibilityCriteria: [
 'Severe mitral regurgitation',
 'High surgical risk',
 'Favorable anatomy',
 'Heart team approval'
 ],
 eligibilityCriteriaMet: 3,
 totalCriteria: 4,
 barriers: ['Unfavorable anatomy on 3D echo', 'Need heart team consensus'],
 daysSinceEligible: 89,
 estimatedDRGRevenue: 85000,
 clinicalContext: {
 ejectionFraction: 35,
 nyhaClass: 'III',
 comorbidities: ['Severe MR', 'Pulmonary hypertension']
 },
 riskScore: 7.8,
 priority: 'medium',
 assignedProvider: 'Dr. Lisa Park',
 lastReviewed: '2024-11-28T11:10:00Z',
 status: 'eligible'
 },
 {
 id: 'patient-006',
 patientName: 'Elizabeth Davis',
 patientMRN: 'MRN789013',
 age: 71,
 deviceType: 'CardioMEMS',
 eligibilityCriteria: [
 'NYHA Class III heart failure',
 'Recent HF hospitalization',
 'EF < 40% or preserved EF with elevated pressures',
 'Optimal medical therapy'
 ],
 eligibilityCriteriaMet: 4,
 totalCriteria: 4,
 barriers: ['Patient education needed about device monitoring'],
 daysSinceEligible: 23,
 estimatedDRGRevenue: 35000,
 clinicalContext: {
 ejectionFraction: 32,
 nyhaClass: 'III',
 comorbidities: ['Recent HF admission', 'Diabetes', 'CKD']
 },
 riskScore: 6.5,
 priority: 'medium',
 assignedProvider: 'Dr. Sarah Chen',
 lastReviewed: '2024-12-11T15:30:00Z',
 status: 'eligible'
 }
  ];

  const deviceTypes = Array.from(new Set(mockPatients.map(p => p.deviceType))).sort();

  const filteredPatients = useMemo(() => {
 let filtered = mockPatients;

 if (selectedDeviceType !== 'all') {
 filtered = filtered.filter(p => p.deviceType === selectedDeviceType);
 }

 if (selectedPriority !== 'all') {
 filtered = filtered.filter(p => p.priority === selectedPriority);
 }

 // Sort
 filtered.sort((a, b) => {
 let aValue: any = a[sortField];
 let bValue: any = b[sortField];

 if (sortField === 'patientName') {
 aValue = aValue.toLowerCase();
 bValue = bValue.toLowerCase();
 }

 if (sortDirection === 'asc') {
 return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
 } else {
 return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
 }
 });

 return filtered;
  }, [mockPatients, selectedDeviceType, selectedPriority, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDirection('desc');
 }
  };

  const getDeviceIcon = (deviceType: string) => {
 switch (deviceType) {
 case 'CRT':
 return Heart;
 case 'ICD':
 return Zap;
 case 'WATCHMAN':
 return Shield;
 case 'CardioMEMS':
 return Activity;
 case 'TAVR':
 return Heart;
 case 'MitraClip':
 return Heart;
 default:
 return Activity;
 }
  };

  const getDeviceColor = (deviceType: string) => {
 switch (deviceType) {
 case 'CRT':
 return 'text-porsche-600 bg-porsche-100';
 case 'ICD':
 return 'text-medical-red-600 bg-medical-red-100';
 case 'WATCHMAN':
 return 'text-medical-green-600 bg-medical-green-100';
 case 'CardioMEMS':
 return 'text-medical-amber-600 bg-medical-amber-100';
 case 'TAVR':
 return 'text-purple-600 bg-purple-100';
 case 'MitraClip':
 return 'text-chrome-600 bg-chrome-100';
 default:
 return 'text-titanium-600 bg-titanium-100';
 }
  };

  const getPriorityColor = (priority: string) => {
 switch (priority) {
 case 'high':
 return 'text-medical-red-600 bg-medical-red-100 border-medical-red-200';
 case 'medium':
 return 'text-medical-amber-600 bg-medical-amber-100 border-medical-amber-200';
 case 'low':
 return 'text-medical-green-600 bg-medical-green-100 border-medical-green-200';
 default:
 return 'text-titanium-600 bg-titanium-100 border-titanium-200';
 }
  };

  const getStatusColor = (status: string) => {
 switch (status) {
 case 'eligible':
 return 'text-porsche-600 bg-porsche-100 border-porsche-200';
 case 'pending-approval':
 return 'text-medical-amber-600 bg-medical-amber-100 border-medical-amber-200';
 case 'scheduled':
 return 'text-medical-green-600 bg-medical-green-100 border-medical-green-200';
 case 'declined':
 return 'text-medical-red-600 bg-medical-red-100 border-medical-red-200';
 case 'contraindicated':
 return 'text-titanium-600 bg-titanium-100 border-titanium-200';
 default:
 return 'text-titanium-600 bg-titanium-100 border-titanium-200';
 }
  };

  const exportToCSV = () => {
 const headers = ['Patient', 'MRN', 'Device', 'Days Eligible', 'Criteria Met', 'Revenue', 'Priority', 'Status'];
 const csvContent = [
 headers.join(','),
 ...filteredPatients.map(p => [
 p.patientName,
 p.patientMRN,
 p.deviceType,
 p.daysSinceEligible,
 `${p.eligibilityCriteriaMet}/${p.totalCriteria}`,
 p.estimatedDRGRevenue,
 p.priority,
 p.status
 ].join(','))
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `device-underutilization-${selectedDeviceType}-${new Date().toISOString().split('T')[0]}.csv`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
  };

  const totalRevenue = filteredPatients.reduce((sum, p) => sum + p.estimatedDRGRevenue, 0);
  const averageDaysEligible = filteredPatients.length > 0 
 ? Math.round(filteredPatients.reduce((sum, p) => sum + p.daysSinceEligible, 0) / filteredPatients.length)
 : 0;

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-titanium-800 mb-2">Device Underutilization Panel</h1>
 <p className="text-titanium-600">
 Patients eligible for cardiac devices who haven't been implanted
 </p>
 </div>
 
 <button
 onClick={exportToCSV}
 className="flex items-center gap-2 px-4 py-2 bg-medical-green-600 text-white rounded-lg hover:bg-medical-green-700 transition-colors"
 >
 <Download className="w-4 h-4" />
 Export CSV
 </button>
 </div>

 {/* Filters */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <select
 value={selectedDeviceType}
 onChange={(e) => setSelectedDeviceType(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Devices</option>
 {deviceTypes.map(type => (
 <option key={type} value={type}>{type}</option>
 ))}
 </select>
 
 <select
 value={selectedPriority}
 onChange={(e) => setSelectedPriority(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Priorities</option>
 <option value="high">High Priority</option>
 <option value="medium">Medium Priority</option>
 <option value="low">Low Priority</option>
 </select>
 
 <div className="text-sm text-titanium-600 self-center">
 {filteredPatients.length} patients • ${(totalRevenue / 1000).toFixed(0)}K potential revenue
 </div>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="retina-card p-4 border-l-4 border-l-porsche-500">
 <div className="flex items-center justify-between mb-2">
 <Users className="w-5 h-5 text-porsche-500" />
 <TrendingUp className="w-4 h-4 text-medical-green-500" />
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 {filteredPatients.length}
 </div>
 <div className="text-sm text-titanium-600">Eligible Patients</div>
 </div>

 <div className="retina-card p-4 border-l-4 border-l-medical-green-500">
 <div className="flex items-center justify-between mb-2">
 <DollarSign className="w-5 h-5 text-medical-green-500" />
 <span className="text-xs text-titanium-500">Avg ${Math.round(totalRevenue / filteredPatients.length / 1000)}K</span>
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 ${(totalRevenue / 1000).toFixed(0)}K
 </div>
 <div className="text-sm text-titanium-600">Total Revenue Potential</div>
 </div>

 <div className="retina-card p-4 border-l-4 border-l-medical-amber-500">
 <div className="flex items-center justify-between mb-2">
 <Clock className="w-5 h-5 text-medical-amber-500" />
 <span className="text-xs text-titanium-500">Range: {Math.min(...filteredPatients.map(p => p.daysSinceEligible))}-{Math.max(...filteredPatients.map(p => p.daysSinceEligible))}d</span>
 </div>
 <div className="text-2xl font-bold text-titanium-800 mb-1">
 {averageDaysEligible}d
 </div>
 <div className="text-sm text-titanium-600">Avg Days Since Eligible</div>
 </div>
 </div>

 {/* Patient Table */}
 <div className="bg-white rounded-2xl shadow-chrome-card border border-titanium-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-titanium-50">
 <tr>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('patientName')}
 >
 Patient {sortField === 'patientName' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Device</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Eligibility</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Barriers</th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('daysSinceEligible')}
 >
 Days Eligible {sortField === 'daysSinceEligible' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('estimatedDRGRevenue')}
 >
 Revenue {sortField === 'estimatedDRGRevenue' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Priority</th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredPatients.map((patient, index) => {
 const DeviceIcon = getDeviceIcon(patient.deviceType);
 const deviceColor = getDeviceColor(patient.deviceType);
 const priorityColor = getPriorityColor(patient.priority);
 const statusColor = getStatusColor(patient.status);
 const isExpanded = expandedPatient === patient.id;

 return (
 <React.Fragment key={patient.id}>
 <tr className={`border-t border-titanium-200 hover:bg-titanium-50 ${index % 2 === 0 ? 'bg-white' : 'bg-titanium-25'}`}>
 <td className="p-3">
 <div>
 <div className="font-medium text-titanium-800">{patient.patientName}</div>
 <div className="text-sm text-titanium-500">
 Age {patient.age} • {patient.patientMRN}
 </div>
 </div>
 </td>
 <td className="p-3">
 <div className={`flex items-center gap-2 px-2 py-1 rounded-lg w-fit ${deviceColor}`}>
 <DeviceIcon className="w-4 h-4" />
 <span className="text-sm font-medium">{patient.deviceType}</span>
 </div>
 </td>
 <td className="p-3">
 <div className="flex items-center gap-2">
 <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
 patient.eligibilityCriteriaMet === patient.totalCriteria 
 ? 'bg-medical-green-500' 
 : 'bg-medical-amber-500'
 }`}>
 {patient.eligibilityCriteriaMet === patient.totalCriteria ? (
 <CheckCircle className="w-3 h-3 text-white" />
 ) : (
 <AlertTriangle className="w-3 h-3 text-white" />
 )}
 </div>
 <span className="text-sm font-medium">
 {patient.eligibilityCriteriaMet}/{patient.totalCriteria}
 </span>
 </div>
 </td>
 <td className="p-3">
 <div className="max-w-48">
 {patient.barriers.length > 0 ? (
 <div className="text-sm text-medical-red-700">
 {patient.barriers[0]}
 {patient.barriers.length > 1 && (
 <span className="text-titanium-500"> (+{patient.barriers.length - 1} more)</span>
 )}
 </div>
 ) : (
 <span className="text-sm text-medical-green-600">None identified</span>
 )}
 </div>
 </td>
 <td className="p-3">
 <div className="text-sm">
 <div className={`font-medium ${
 patient.daysSinceEligible > 90 ? 'text-medical-red-600' :
 patient.daysSinceEligible > 30 ? 'text-medical-amber-600' :
 'text-titanium-800'
 }`}>
 {patient.daysSinceEligible} days
 </div>
 </div>
 </td>
 <td className="p-3">
 <div className="font-medium text-medical-green-600">
 ${patient.estimatedDRGRevenue.toLocaleString()}
 </div>
 </td>
 <td className="p-3">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColor}`}>
 {patient.priority.toUpperCase()}
 </span>
 </td>
 <td className="p-3">
 <div className="flex items-center gap-2">
 <button
 onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
 className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-porsche-600 hover:text-porsche-700 hover:bg-porsche-50 rounded transition-colors"
 >
 <Eye className="w-3 h-3" />
 {isExpanded ? 'Hide' : 'View'}
 </button>
 </div>
 </td>
 </tr>

 {/* Expanded Details */}
 {isExpanded && (
 <tr>
 <td colSpan={8} className="p-0">
 <div className="p-4 bg-titanium-50 border-t border-titanium-200">
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {/* Eligibility Criteria */}
 <div>
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2">
 <CheckCircle className="w-4 h-4 text-medical-green-500" />
 Eligibility Criteria
 </h4>
 <div className="space-y-2">
 {patient.eligibilityCriteria.map((criteria, idx) => (
 <div key={idx} className="flex items-center gap-2 text-sm">
 <CheckCircle className="w-3 h-3 text-medical-green-500 flex-shrink-0" />
 <span className="text-titanium-700">{criteria}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Clinical Context */}
 <div>
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2">
 <Activity className="w-4 h-4 text-porsche-500" />
 Clinical Context
 </h4>
 <div className="space-y-2">
 {patient.clinicalContext.ejectionFraction && (
 <div className="text-sm">
 <span className="text-titanium-600">EF:</span>
 <span className="ml-2 font-medium">{patient.clinicalContext.ejectionFraction}%</span>
 </div>
 )}
 {patient.clinicalContext.nyhaClass && (
 <div className="text-sm">
 <span className="text-titanium-600">NYHA Class:</span>
 <span className="ml-2 font-medium">{patient.clinicalContext.nyhaClass}</span>
 </div>
 )}
 {patient.clinicalContext.qrsDuration && (
 <div className="text-sm">
 <span className="text-titanium-600">QRS Duration:</span>
 <span className="ml-2 font-medium">{patient.clinicalContext.qrsDuration}ms</span>
 </div>
 )}
 {patient.clinicalContext.comorbidities && (
 <div className="text-sm">
 <span className="text-titanium-600 block">Comorbidities:</span>
 <div className="flex flex-wrap gap-1 mt-1">
 {patient.clinicalContext.comorbidities.map((comorbidity, idx) => (
 <span key={idx} className="px-2 py-0.5 bg-titanium-100 text-titanium-700 text-xs rounded">
 {comorbidity}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Barriers and Status */}
 <div>
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-medical-red-500" />
 Current Status
 </h4>
 <div className="space-y-3">
 <div>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
 {patient.status.replace('-', ' ').toUpperCase()}
 </span>
 </div>
 
 {patient.assignedProvider && (
 <div className="text-sm">
 <span className="text-titanium-600">Assigned to:</span>
 <span className="ml-2 font-medium">{patient.assignedProvider}</span>
 </div>
 )}
 
 <div className="text-sm">
 <span className="text-titanium-600">Risk Score:</span>
 <span className="ml-2 font-medium">{patient.riskScore}/10</span>
 </div>
 
 {patient.barriers.length > 0 && (
 <div>
 <span className="text-sm text-titanium-600 block mb-1">Barriers:</span>
 {patient.barriers.map((barrier, idx) => (
 <div key={idx} className="text-xs text-medical-red-700 bg-medical-red-50 p-2 rounded border border-medical-red-200 mb-1">
 {barrier}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>
  );
};

export default DeviceUnderutilizationPanel;