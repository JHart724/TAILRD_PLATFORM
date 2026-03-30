import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Calendar,
  User,
  RefreshCw,
  Grid,
  List
} from 'lucide-react';

export interface CrossReferral {
  id: string;
  patientName: string;
  patientMRN: string;
  patientAge: number;
  fromModule: string;
  toModule: string;
  reason: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  status: 'pending' | 'reviewed' | 'accepted' | 'scheduled' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
  triggeringCQL: string;
  clinicalContext: {
 primaryDiagnosis: string;
 relevantLabs?: Array<{ name: string; value: string; unit: string; }>;
 currentMedications?: string[];
 allergie?: string[];
  };
  estimatedRevenue?: number;
  priority: number;
}

type SortField = 'createdAt' | 'patientName' | 'urgency' | 'status' | 'fromModule' | 'toModule';
type ViewMode = 'table' | 'cards';

const CrossReferralEngine: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data
  const mockReferrals: CrossReferral[] = [
 {
 id: 'REF-001',
 patientName: 'John Anderson',
 patientMRN: 'MRN123456',
 patientAge: 68,
 fromModule: 'Heart Failure',
 toModule: 'Structural Heart',
 reason: 'Severe MR detected, MitraClip evaluation recommended',
 urgency: 'urgent',
 status: 'pending',
 createdAt: '2024-12-14T09:30:00Z',
 updatedAt: '2024-12-14T09:30:00Z',
 createdBy: 'Dr. Sarah Chen',
 triggeringCQL: 'HF_Severe_MR_Detection',
 clinicalContext: {
 primaryDiagnosis: 'Heart Failure with Reduced Ejection Fraction',
 relevantLabs: [
 { name: 'BNP', value: '850', unit: 'pg/mL' },
 { name: 'Creatinine', value: '1.2', unit: 'mg/dL' }
 ],
 currentMedications: ['Carvedilol 25mg BID', 'Lisinopril 10mg daily', 'Furosemide 40mg daily']
 },
 estimatedRevenue: 85000,
 priority: 8
 },
 {
 id: 'REF-002',
 patientName: 'Maria Rodriguez',
 patientMRN: 'MRN789012',
 patientAge: 72,
 fromModule: 'Structural Heart',
 toModule: 'Electrophysiology',
 reason: 'Post-TAVR complete heart block, pacemaker evaluation',
 urgency: 'emergent',
 status: 'reviewed',
 createdAt: '2024-12-14T11:15:00Z',
 updatedAt: '2024-12-14T14:20:00Z',
 createdBy: 'Dr. Michael Torres',
 assignedTo: 'Dr. Jennifer Walsh',
 triggeringCQL: 'TAVR_Post_Procedure_CHB',
 clinicalContext: {
 primaryDiagnosis: 'Severe Aortic Stenosis s/p TAVR',
 relevantLabs: [
 { name: 'Troponin', value: '12.5', unit: 'ng/mL' }
 ]
 },
 estimatedRevenue: 45000,
 priority: 10
 },
 {
 id: 'REF-003',
 patientName: 'Robert Chen',
 patientMRN: 'MRN345678',
 patientAge: 59,
 fromModule: 'Preventive Cardiology',
 toModule: 'Heart Failure',
 reason: 'New onset HFrEF, GDMT optimization needed',
 urgency: 'routine',
 status: 'accepted',
 createdAt: '2024-12-13T16:45:00Z',
 updatedAt: '2024-12-14T08:30:00Z',
 createdBy: 'Dr. Lisa Park',
 assignedTo: 'Dr. David Kim',
 triggeringCQL: 'New_HFrEF_Detection',
 clinicalContext: {
 primaryDiagnosis: 'Newly diagnosed HFrEF',
 relevantLabs: [
 { name: 'BNP', value: '450', unit: 'pg/mL' },
 { name: 'eGFR', value: '65', unit: 'mL/min/1.73m²' }
 ]
 },
 estimatedRevenue: 25000,
 priority: 4
 },
 {
 id: 'REF-004',
 patientName: 'Sarah Johnson',
 patientMRN: 'MRN567890',
 patientAge: 75,
 fromModule: 'Electrophysiology',
 toModule: 'Heart Failure',
 reason: 'CRT-D upgrade candidate, HF optimization before device',
 urgency: 'urgent',
 status: 'scheduled',
 createdAt: '2024-12-12T13:20:00Z',
 updatedAt: '2024-12-14T10:15:00Z',
 createdBy: 'Dr. Jennifer Walsh',
 assignedTo: 'Dr. Sarah Chen',
 triggeringCQL: 'CRT_Upgrade_Evaluation',
 clinicalContext: {
 primaryDiagnosis: 'Advanced Heart Failure with LBBB',
 relevantLabs: [
 { name: 'BNP', value: '1200', unit: 'pg/mL' }
 ]
 },
 estimatedRevenue: 95000,
 priority: 7
 }
  ];

  const modules = Array.from(new Set([
 ...mockReferrals.map(r => r.fromModule),
 ...mockReferrals.map(r => r.toModule)
  ])).sort();

  const filteredAndSortedReferrals = useMemo(() => {
 let filtered = mockReferrals;

 // Apply filters
 if (searchTerm) {
 const term = searchTerm.toLowerCase();
 filtered = filtered.filter(r =>
 r.patientName.toLowerCase().includes(term) ||
 r.patientMRN.toLowerCase().includes(term) ||
 r.reason.toLowerCase().includes(term) ||
 r.fromModule.toLowerCase().includes(term) ||
 r.toModule.toLowerCase().includes(term)
 );
 }

 if (filterModule !== 'all') {
 filtered = filtered.filter(r => 
 r.fromModule === filterModule || r.toModule === filterModule
 );
 }

 if (filterUrgency !== 'all') {
 filtered = filtered.filter(r => r.urgency === filterUrgency);
 }

 if (filterStatus !== 'all') {
 filtered = filtered.filter(r => r.status === filterStatus);
 }

 // Apply sorting
 filtered.sort((a, b) => {
 let aValue: any = a[sortField];
 let bValue: any = b[sortField];

 if (sortField === 'createdAt') {
 aValue = new Date(aValue).getTime();
 bValue = new Date(bValue).getTime();
 }

 if (sortDirection === 'asc') {
 return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
 } else {
 return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
 }
 });

 return filtered;
  }, [mockReferrals, searchTerm, filterModule, filterUrgency, filterStatus, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDirection('desc');
 }
  };

  const handleRefresh = async () => {
 setRefreshing(true);
 // Simulate API call
 await new Promise(resolve => setTimeout(resolve, 1500));
 setRefreshing(false);
  };

  const getUrgencyConfig = (urgency: string) => {
 switch (urgency) {
 case 'emergent':
 return {
 color: 'bg-medical-red-100 text-medical-red-700 border-medical-red-200',
 icon: 'bg-medical-red-600',
 priority: 'HIGH'
 };
 case 'urgent':
 return {
 color: 'bg-crimson-100 text-crimson-700 border-crimson-200',
 icon: 'bg-crimson-600',
 priority: 'MED'
 };
 case 'routine':
 return {
 color: 'bg-porsche-100 text-porsche-700 border-porsche-200',
 icon: 'bg-porsche-600',
 priority: 'LOW'
 };
 default:
 return {
 color: 'bg-titanium-100 text-titanium-700 border-titanium-200',
 icon: 'bg-titanium-600',
 priority: 'UNK'
 };
 }
  };

  const getStatusConfig = (status: string) => {
 switch (status) {
 case 'pending':
 return 'bg-titanium-100 text-titanium-700 border-titanium-200';
 case 'reviewed':
 return 'bg-porsche-100 text-porsche-700 border-porsche-200';
 case 'accepted':
 return 'bg-[#e0eaf3] text-[#2C4A60] border-[#C8D4DC]';
 case 'scheduled':
 return 'bg-arterial-100 text-arterial-700 border-arterial-200';
 case 'completed':
 return 'bg-[#F0F5FA] text-[#2C4A60] border-[#C8D4DC]';
 case 'rejected':
 return 'bg-medical-red-100 text-medical-red-700 border-medical-red-200';
 default:
 return 'bg-titanium-100 text-titanium-700 border-titanium-200';
 }
  };

  const getAgeInHours = (dateString: string) => {
 return Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60));
  };

  const exportToCSV = () => {
 const headers = ['Patient', 'MRN', 'From', 'To', 'Reason', 'Urgency', 'Status', 'Created', 'Age (hrs)'];
 const csvContent = [
 headers.join(','),
 ...filteredAndSortedReferrals.map(r => [
 r.patientName,
 r.patientMRN,
 r.fromModule,
 r.toModule,
 `"${r.reason}"`,
 r.urgency,
 r.status,
 new Date(r.createdAt).toLocaleDateString(),
 getAgeInHours(r.createdAt)
 ].join(','))
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `cross-referrals-${new Date().toISOString().split('T')[0]}.csv`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
  };

  const renderTableView = () => (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-titanium-50">
 <tr>
 <th className="p-3 text-left">
 <input
 type="checkbox"
 className="rounded border-titanium-300"
 checked={selectedReferrals.length === filteredAndSortedReferrals.length && filteredAndSortedReferrals.length > 0}
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedReferrals(filteredAndSortedReferrals.map(r => r.id));
 } else {
 setSelectedReferrals([]);
 }
 }}
 />
 </th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('patientName')}
 >
 Patient {sortField === 'patientName' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('fromModule')}
 >
 From → To {sortField === 'fromModule' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Reason</th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('urgency')}
 >
 Urgency {sortField === 'urgency' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('status')}
 >
 Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th 
 className="p-3 text-left text-sm font-semibold text-titanium-700 cursor-pointer hover:text-titanium-900"
 onClick={() => handleSort('createdAt')}
 >
 Age {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
 </th>
 <th className="p-3 text-left text-sm font-semibold text-titanium-700">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredAndSortedReferrals.map((referral, index) => {
 const urgencyConfig = getUrgencyConfig(referral.urgency);
 const statusConfig = getStatusConfig(referral.status);
 const ageHours = getAgeInHours(referral.createdAt);
 
 return (
 <tr
 key={referral.id}
 className={`border-t border-titanium-200 hover:bg-titanium-50 ${
 index % 2 === 0 ? 'bg-white' : 'bg-titanium-25'
 }`}
 >
 <td className="p-3">
 <input
 type="checkbox"
 className="rounded border-titanium-300"
 checked={selectedReferrals.includes(referral.id)}
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedReferrals([...selectedReferrals, referral.id]);
 } else {
 setSelectedReferrals(selectedReferrals.filter(id => id !== referral.id));
 }
 }}
 />
 </td>
 <td className="p-3">
 <div>
 <div className="font-medium text-titanium-800">{referral.patientName}</div>
 <div className="text-sm text-titanium-500">
 Age {referral.patientAge} • {referral.patientMRN}
 </div>
 </div>
 </td>
 <td className="p-3">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-titanium-700">{referral.fromModule}</span>
 <ArrowRight className="w-3 h-3 text-titanium-400" />
 <span className="text-sm font-medium text-titanium-700">{referral.toModule}</span>
 </div>
 </td>
 <td className="p-3">
 <div className="text-sm text-titanium-800 max-w-xs">
 {referral.reason}
 </div>
 </td>
 <td className="p-3">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${urgencyConfig.color}`}>
 {referral.urgency.toUpperCase()}
 </span>
 </td>
 <td className="p-3">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusConfig}`}>
 {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
 </span>
 </td>
 <td className="p-3">
 <div className="text-sm">
 <div className="font-medium text-titanium-800">{ageHours}h</div>
 <div className="text-xs text-titanium-500">
 {new Date(referral.createdAt).toLocaleDateString()}
 </div>
 </div>
 </td>
 <td className="p-3">
 <button
 className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-porsche-600 hover:text-porsche-700 hover:bg-porsche-50 rounded-lg transition-colors"
 onClick={() => window.open(`/referral/${referral.id}`, '_blank')}
 >
 <Eye className="w-3 h-3" />
 View
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
  );

  const renderCardView = () => (
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
 {filteredAndSortedReferrals.map((referral) => {
 const urgencyConfig = getUrgencyConfig(referral.urgency);
 const statusConfig = getStatusConfig(referral.status);
 const ageHours = getAgeInHours(referral.createdAt);
 
 return (
 <div key={referral.id} className="retina-card p-4">
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-semibold text-titanium-800">{referral.patientName}</h3>
 <p className="text-sm text-titanium-500">
 Age {referral.patientAge} • {referral.patientMRN}
 </p>
 </div>
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${urgencyConfig.color}`}>
 {referral.urgency.toUpperCase()}
 </span>
 </div>

 {/* Module Flow */}
 <div className="flex items-center gap-2 mb-3 p-2 bg-titanium-50 rounded-lg">
 <span className="text-sm font-medium text-titanium-700">{referral.fromModule}</span>
 <ArrowRight className="w-4 h-4 text-titanium-400" />
 <span className="text-sm font-medium text-titanium-700">{referral.toModule}</span>
 </div>

 {/* Reason */}
 <p className="text-sm text-titanium-700 mb-3 leading-relaxed">
 {referral.reason}
 </p>

 {/* Status and Age */}
 <div className="flex items-center justify-between mb-3">
 <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusConfig}`}>
 {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
 </span>
 <div className="text-sm text-titanium-600 flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {ageHours}h ago
 </div>
 </div>

 {/* Action */}
 <button
 className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-porsche-600 hover:text-porsche-700 hover:bg-porsche-50 rounded-lg transition-colors border border-porsche-200"
 onClick={() => window.open(`/referral/${referral.id}`, '_blank')}
 >
 <Eye className="w-4 h-4" />
 View Detail
 </button>
 </div>
 );
 })}
 </div>
  );

  return (
 <div className="space-y-6">
 {/* Header and Controls */}
 <div className="bg-white rounded-2xl p-6 shadow-chrome-card border border-titanium-200">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-titanium-800 mb-2">Cross-Referral Engine</h1>
 <p className="text-titanium-600">
 Active cross-module referrals requiring attention
 </p>
 </div>
 
 <div className="flex items-center gap-2">
 <button
 onClick={handleRefresh}
 disabled={refreshing}
 className="flex items-center gap-2 px-4 py-2 bg-titanium-600 text-white rounded-lg hover:bg-titanium-700 transition-colors disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 
 <div className="flex rounded-lg border border-titanium-300 overflow-hidden">
 <button
 onClick={() => setViewMode('table')}
 className={`p-2 ${viewMode === 'table' ? 'bg-porsche-500 text-white' : 'bg-white text-titanium-600 hover:bg-titanium-50'}`}
 >
 <List className="w-4 h-4" />
 </button>
 <button
 onClick={() => setViewMode('cards')}
 className={`p-2 ${viewMode === 'cards' ? 'bg-porsche-500 text-white' : 'bg-white text-titanium-600 hover:bg-titanium-50'}`}
 >
 <Grid className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
 {/* Search */}
 <div className="lg:col-span-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-titanium-400" />
 <input
 type="text"
 placeholder="Search patients, reasons, modules..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 </div>

 {/* Module Filter */}
 <select
 value={filterModule}
 onChange={(e) => setFilterModule(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Modules</option>
 {modules.map(module => (
 <option key={module} value={module}>{module}</option>
 ))}
 </select>

 {/* Urgency Filter */}
 <select
 value={filterUrgency}
 onChange={(e) => setFilterUrgency(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Urgencies</option>
 <option value="emergent">Emergent</option>
 <option value="urgent">Urgent</option>
 <option value="routine">Routine</option>
 </select>

 {/* Status Filter */}
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-3 py-2 border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Statuses</option>
 <option value="pending">Pending</option>
 <option value="reviewed">Reviewed</option>
 <option value="accepted">Accepted</option>
 <option value="scheduled">Scheduled</option>
 <option value="completed">Completed</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>

 {/* Export Button */}
 <div className="flex justify-end">
 <button
 onClick={exportToCSV}
 className="flex items-center gap-2 px-4 py-2 bg-[#2C4A60] text-white rounded-lg hover:bg-[#2C4A60] transition-colors"
 >
 <Download className="w-4 h-4" />
 Export CSV
 </button>
 </div>
 </div>

 {/* Results Summary */}
 <div className="bg-white rounded-2xl p-4 shadow-chrome-card border border-titanium-200">
 <div className="flex items-center justify-between">
 <div className="text-sm text-titanium-600">
 Showing <span className="font-semibold text-titanium-800">{filteredAndSortedReferrals.length}</span> of{' '}
 <span className="font-semibold text-titanium-800">{mockReferrals.length}</span> referrals
 {selectedReferrals.length > 0 && (
 <span className="ml-4 text-porsche-600">
 ({selectedReferrals.length} selected)
 </span>
 )}
 </div>
 
 {/* Quick stats */}
 <div className="flex items-center gap-6 text-sm">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-medical-red-500 rounded-full"></div>
 <span>Emergent: {mockReferrals.filter(r => r.urgency === 'emergent').length}</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-crimson-500 rounded-full"></div>
 <span>Urgent: {mockReferrals.filter(r => r.urgency === 'urgent').length}</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-porsche-500 rounded-full"></div>
 <span>Routine: {mockReferrals.filter(r => r.urgency === 'routine').length}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Results */}
 <div className="bg-white rounded-2xl shadow-chrome-card border border-titanium-200 overflow-hidden">
 {viewMode === 'table' ? renderTableView() : renderCardView()}
 </div>
 </div>
  );
};

export default CrossReferralEngine;