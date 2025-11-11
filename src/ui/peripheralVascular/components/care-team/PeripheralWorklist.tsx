import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Activity,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Edit,
  Stethoscope,
  Target,
  Heart,
  AlertTriangle,
  TrendingUp,
  Cigarette,
  Droplets
} from 'lucide-react';

interface PeripheralPatient {
  id: string;
  name: string;
  age: number;
  mrn: string;
  diseaseSeverity: 'Claudication' | 'CLI' | 'CLTI';
  lesionLocation: 'Aortoiliac' | 'Femoropopliteal' | 'Infrapopliteal' | 'Multi-level';
  procedure: 'Angioplasty' | 'Stent' | 'Atherectomy' | 'Bypass' | 'Hybrid' | 'Medical' | 'Screening';
  scheduledDate: string;
  status: 'Screening' | 'Scheduled' | 'Pre-procedure' | 'In Progress' | 'Post-op' | 'Follow-up' | 'Wound Care';
  abi: {
    right: number;
    left: number;
  };
  wifiStage?: 1 | 2 | 3 | 4;
  tascGrade?: 'A' | 'B' | 'C' | 'D';
  smokingStatus: 'Never' | 'Former' | 'Current';
  diabetesControl: 'Good' | 'Fair' | 'Poor' | 'None';
  procedurePlan: {
    approach: string;
    timeline: string;
    urgency: 'Elective' | 'Urgent' | 'Emergent';
  };
  lastVisit: string;
  nextFollowup: string;
  complications?: string[];
  woundStatus?: 'None' | 'Healing' | 'Infected' | 'Non-healing';
}

type WorklistTab = 'screening' | 'pre-procedure' | 'today' | 'post-op' | 'wound-care';

const PeripheralWorklist: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorklistTab>('screening');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof PeripheralPatient>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const mockPatients: PeripheralPatient[] = [
    {
      id: 'PV001',
      name: 'John Anderson',
      age: 68,
      mrn: 'MRN123456',
      diseaseSeverity: 'CLTI',
      lesionLocation: 'Femoropopliteal',
      procedure: 'Angioplasty',
      scheduledDate: '2024-12-15T09:00:00Z',
      status: 'Pre-procedure',
      abi: { right: 0.4, left: 0.6 },
      wifiStage: 3,
      tascGrade: 'C',
      smokingStatus: 'Current',
      diabetesControl: 'Fair',
      procedurePlan: {
        approach: 'Endovascular angioplasty with stenting',
        timeline: 'Within 2 weeks',
        urgency: 'Urgent'
      },
      lastVisit: '2024-11-20',
      nextFollowup: '2025-01-15',
      woundStatus: 'Infected'
    },
    {
      id: 'PV002',
      name: 'Maria Rodriguez',
      age: 72,
      mrn: 'MRN789012',
      diseaseSeverity: 'CLI',
      lesionLocation: 'Aortoiliac',
      procedure: 'Stent',
      scheduledDate: '2024-12-16T07:30:00Z',
      status: 'Scheduled',
      abi: { right: 0.5, left: 0.7 },
      wifiStage: 2,
      tascGrade: 'B',
      smokingStatus: 'Former',
      diabetesControl: 'Good',
      procedurePlan: {
        approach: 'Iliac stenting',
        timeline: 'Elective within 4 weeks',
        urgency: 'Elective'
      },
      lastVisit: '2024-11-15',
      nextFollowup: '2024-12-20',
      woundStatus: 'Healing'
    },
    {
      id: 'PV003',
      name: 'Robert Chen',
      age: 59,
      mrn: 'MRN345678',
      diseaseSeverity: 'Claudication',
      lesionLocation: 'Femoropopliteal',
      procedure: 'Medical',
      scheduledDate: '2024-12-14T14:00:00Z',
      status: 'Follow-up',
      abi: { right: 0.65, left: 0.7 },
      tascGrade: 'A',
      smokingStatus: 'Never',
      diabetesControl: 'None',
      procedurePlan: {
        approach: 'Medical management with exercise therapy',
        timeline: '3-month trial',
        urgency: 'Elective'
      },
      lastVisit: '2024-11-01',
      nextFollowup: '2024-12-30',
      woundStatus: 'None'
    },
    {
      id: 'PV004',
      name: 'Sarah Johnson',
      age: 75,
      mrn: 'MRN567890',
      diseaseSeverity: 'CLTI',
      lesionLocation: 'Multi-level',
      procedure: 'Hybrid',
      scheduledDate: '2024-12-18T10:00:00Z',
      status: 'Post-op',
      abi: { right: 0.3, left: 0.8 },
      wifiStage: 4,
      tascGrade: 'D',
      smokingStatus: 'Current',
      diabetesControl: 'Poor',
      procedurePlan: {
        approach: 'Hybrid revascularization',
        timeline: 'Completed 1 week ago',
        urgency: 'Emergent'
      },
      lastVisit: '2024-12-11',
      nextFollowup: '2024-12-25',
      woundStatus: 'Non-healing',
      complications: ['Access site hematoma', 'Wound infection']
    }
  ];

  const tabs = [
    { id: 'screening', label: 'Screening', icon: Search },
    { id: 'pre-procedure', label: 'Pre-procedure', icon: Calendar },
    { id: 'today', label: "Today's Cases", icon: Clock },
    { id: 'post-op', label: 'Post-op', icon: Activity },
    { id: 'wound-care', label: 'Wound Care', icon: Target }
  ];

  const filteredPatients = useMemo(() => {
    let filtered = mockPatients;

    // Tab filtering
    const today = new Date().toISOString().split('T')[0];
    switch (activeTab) {
      case 'screening':
        filtered = filtered.filter(p => p.status === 'Screening' || p.procedure === 'Screening');
        break;
      case 'pre-procedure':
        filtered = filtered.filter(p => p.status === 'Scheduled' || p.status === 'Pre-procedure');
        break;
      case 'today':
        filtered = filtered.filter(p => p.scheduledDate.startsWith(today));
        break;
      case 'post-op':
        filtered = filtered.filter(p => p.status === 'Post-op' || p.status === 'Follow-up');
        break;
      case 'wound-care':
        filtered = filtered.filter(p => p.woundStatus && p.woundStatus !== 'None');
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.diseaseSeverity.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filtering
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(p => p.diseaseSeverity === filterSeverity);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'scheduledDate') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [mockPatients, activeTab, searchTerm, filterSeverity, sortField, sortDirection]);

  const handleSort = (field: keyof PeripheralPatient) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const selectAllPatients = () => {
    setSelectedPatients(
      selectedPatients.length === filteredPatients.length
        ? []
        : filteredPatients.map(p => p.id)
    );
  };

  const bulkScheduleVascularLab = () => {
    alert(`Scheduling vascular lab for ${selectedPatients.length} patients`);
  };

  const bulkReferToWoundCare = () => {
    alert(`Referring ${selectedPatients.length} patients to wound care`);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'MRN', 'Age', 'Severity', 'Lesion', 'Procedure', 'Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredPatients.map(p => [
        p.name,
        p.mrn,
        p.age,
        p.diseaseSeverity,
        p.lesionLocation,
        p.procedure,
        new Date(p.scheduledDate).toLocaleDateString(),
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `peripheral-worklist-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Claudication': return 'bg-green-100 text-green-700';
      case 'CLI': return 'bg-amber-100 text-amber-700';
      case 'CLTI': return 'bg-red-100 text-red-700';
      default: return 'bg-steel-100 text-steel-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Screening': return 'bg-blue-100 text-blue-700';
      case 'Scheduled': return 'bg-purple-100 text-purple-700';
      case 'Pre-procedure': return 'bg-amber-100 text-amber-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Post-op': return 'bg-emerald-100 text-emerald-700';
      case 'Follow-up': return 'bg-green-100 text-green-700';
      case 'Wound Care': return 'bg-red-100 text-red-700';
      default: return 'bg-steel-100 text-steel-700';
    }
  };

  const getABIColor = (abi: number) => {
    if (abi < 0.4) return 'text-red-600';
    if (abi < 0.7) return 'text-amber-600';
    if (abi < 0.9) return 'text-green-600';
    return 'text-blue-600';
  };

  const getWoundStatusColor = (status?: string) => {
    switch (status) {
      case 'Healing': return 'text-green-600 bg-green-100';
      case 'Infected': return 'text-red-600 bg-red-100';
      case 'Non-healing': return 'text-red-800 bg-red-200';
      case 'None': return 'text-steel-600 bg-steel-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const renderPatientDetail = (patient: PeripheralPatient) => (
    <div className="mt-4 p-4 bg-steel-50/50 rounded-lg border border-steel-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ABI Values & Risk Scores */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Hemodynamic Assessment
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded border border-steel-200">
                <div className="text-xs text-steel-600">Right ABI</div>
                <div className={`font-bold ${getABIColor(patient.abi.right)}`}>
                  {patient.abi.right.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-white rounded border border-steel-200">
                <div className="text-xs text-steel-600">Left ABI</div>
                <div className={`font-bold ${getABIColor(patient.abi.left)}`}>
                  {patient.abi.left.toFixed(2)}
                </div>
              </div>
            </div>
            
            {patient.wifiStage && (
              <div className="p-2 bg-white rounded border border-steel-200">
                <div className="text-xs text-steel-600">WIfI Stage</div>
                <div className={`font-bold ${
                  patient.wifiStage <= 2 ? 'text-green-600' :
                  patient.wifiStage === 3 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  Stage {patient.wifiStage}
                </div>
              </div>
            )}

            {patient.tascGrade && (
              <div className="p-2 bg-white rounded border border-steel-200">
                <div className="text-xs text-steel-600">TASC Grade</div>
                <div className={`font-bold ${
                  patient.tascGrade === 'A' ? 'text-green-600' :
                  patient.tascGrade === 'B' ? 'text-amber-600' :
                  patient.tascGrade === 'C' ? 'text-red-600' : 'text-red-800'
                }`}>
                  Grade {patient.tascGrade}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Risk Factors */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Risk Factors
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-steel-200">
              <Cigarette className="w-4 h-4 text-steel-500" />
              <div className="text-sm">
                <span className="text-steel-600">Smoking:</span>
                <span className={`ml-2 font-medium ${
                  patient.smokingStatus === 'Current' ? 'text-red-600' :
                  patient.smokingStatus === 'Former' ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {patient.smokingStatus}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-white rounded border border-steel-200">
              <Droplets className="w-4 h-4 text-steel-500" />
              <div className="text-sm">
                <span className="text-steel-600">Diabetes:</span>
                <span className={`ml-2 font-medium ${
                  patient.diabetesControl === 'Good' ? 'text-green-600' :
                  patient.diabetesControl === 'Fair' ? 'text-amber-600' :
                  patient.diabetesControl === 'Poor' ? 'text-red-600' : 'text-steel-600'
                }`}>
                  {patient.diabetesControl}
                </span>
              </div>
            </div>

            {patient.woundStatus && patient.woundStatus !== 'None' && (
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-steel-200">
                <Target className="w-4 h-4 text-steel-500" />
                <div className="text-sm">
                  <span className="text-steel-600">Wound:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getWoundStatusColor(patient.woundStatus)}`}>
                    {patient.woundStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Procedure Plan */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            Procedure Plan
          </h4>
          <div className="space-y-2">
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Approach</div>
              <div className="text-sm font-medium text-steel-800">{patient.procedurePlan.approach}</div>
            </div>
            
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Timeline</div>
              <div className="text-sm font-medium text-steel-800">{patient.procedurePlan.timeline}</div>
            </div>
            
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Urgency</div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                patient.procedurePlan.urgency === 'Emergent' ? 'bg-red-100 text-red-700' :
                patient.procedurePlan.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {patient.procedurePlan.urgency}
              </span>
            </div>
          </div>
        </div>

        {/* Complications (if any) */}
        {patient.complications && patient.complications.length > 0 && (
          <div className="lg:col-span-3">
            <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Complications
            </h4>
            <div className="space-y-1">
              {patient.complications.map((complication, index) => (
                <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {complication}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorklistTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-medical-red-500 text-white'
                    : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="w-4 h-4 text-steel-400" />
            <input
              type="text"
              placeholder="Search by name, MRN, or severity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-red-500"
            />
          </div>
          
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-red-500"
          >
            <option value="all">All Severities</option>
            <option value="Claudication">Claudication</option>
            <option value="CLI">CLI</option>
            <option value="CLTI">CLTI</option>
          </select>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-steel-600 text-white rounded-lg hover:bg-steel-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedPatients.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-medical-red-50 border border-medical-red-200 rounded-lg">
            <span className="text-sm text-medical-red-700 font-medium">
              {selectedPatients.length} patients selected
            </span>
            <button
              onClick={bulkScheduleVascularLab}
              className="px-3 py-1 bg-medical-red-600 text-white rounded text-sm hover:bg-medical-red-700 transition-colors"
            >
              Schedule Vascular Lab
            </button>
            <button
              onClick={bulkReferToWoundCare}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Refer to Wound Care
            </button>
          </div>
        )}
      </div>

      {/* Patient Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-medical-card border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50/80">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                    onChange={selectAllPatients}
                    className="rounded border-steel-300"
                  />
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('name')}
                >
                  Patient {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('diseaseSeverity')}
                >
                  Severity {sortField === 'diseaseSeverity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('lesionLocation')}
                >
                  Lesion {sortField === 'lesionLocation' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('procedure')}
                >
                  Procedure {sortField === 'procedure' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('scheduledDate')}
                >
                  Date {sortField === 'scheduledDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 text-left text-sm font-semibold text-steel-700">Status</th>
                <th className="p-3 text-left text-sm font-semibold text-steel-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient, index) => (
                <React.Fragment key={patient.id}>
                  <tr className={`border-t border-steel-200 hover:bg-steel-50/30 ${index % 2 === 0 ? 'bg-white/50' : 'bg-steel-25/50'}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(patient.id)}
                        onChange={() => togglePatientSelection(patient.id)}
                        className="rounded border-steel-300"
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-steel-800">{patient.name}</div>
                        <div className="text-sm text-steel-500">Age {patient.age} • {patient.mrn}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(patient.diseaseSeverity)}`}>
                        {patient.diseaseSeverity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-steel-800">{patient.lesionLocation}</span>
                      {patient.tascGrade && (
                        <div className="text-xs text-steel-500">TASC {patient.tascGrade}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-steel-800">{patient.procedure}</span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-steel-800">
                        {new Date(patient.scheduledDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-steel-500">
                        {new Date(patient.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                      {patient.woundStatus && patient.woundStatus !== 'None' && (
                        <div className={`text-xs px-1 py-0.5 rounded mt-1 ${getWoundStatusColor(patient.woundStatus)}`}>
                          {patient.woundStatus}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}
                          className="p-1 text-steel-600 hover:text-steel-800 hover:bg-steel-100 rounded transition-colors"
                        >
                          {expandedPatient === patient.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button className="p-1 text-steel-600 hover:text-steel-800 hover:bg-steel-100 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedPatient === patient.id && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        {renderPatientDetail(patient)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PeripheralWorklist;