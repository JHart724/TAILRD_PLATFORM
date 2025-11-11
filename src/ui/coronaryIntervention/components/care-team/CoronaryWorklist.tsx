import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Heart,
  AlertTriangle,
  CheckCircle,
  User,
  FileText,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Pill,
  Activity,
  MapPin,
  Star
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  age: number;
  mrn: string;
  lesionComplexity: 'Low' | 'Intermediate' | 'High';
  procedureType: 'PCI' | 'CABG' | 'Medical Management' | 'Evaluation';
  scheduledDate: string;
  status: 'Scheduled' | 'Pre-procedure' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Routine' | 'Urgent' | 'Emergent';
  angiogramSummary: {
    lm: boolean;
    lad: boolean;
    lcx: boolean;
    rca: boolean;
    severity: string;
  };
  syntaxScore: number;
  recommendation: 'PCI' | 'CABG' | 'Medical' | 'Further Evaluation';
  riskAssessment: {
    surgicalRisk: 'Low' | 'Intermediate' | 'High';
    bleedingRisk: 'Low' | 'Intermediate' | 'High';
    ischemicRisk: 'Low' | 'Intermediate' | 'High';
  };
  daptPlan?: {
    medication: 'Aspirin + Clopidogrel' | 'Aspirin + Prasugrel' | 'Aspirin + Ticagrelor';
    duration: '1 month' | '3 months' | '6 months' | '12 months' | 'Indefinite';
    startDate: string;
    endDate: string;
    adherence: 'Good' | 'Poor' | 'Unknown';
    lastCheck: string;
  };
  cardiacRehab?: {
    ordered: boolean;
    startDate?: string;
    completion?: number;
  };
}

type WorklistTab = 'pre-pci' | 'today' | 'cabg-planning' | 'post-procedure';

const CoronaryWorklist: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorklistTab>('pre-pci');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const mockPatients: Patient[] = [
    {
      id: 'P001',
      name: 'John Anderson',
      age: 68,
      mrn: 'MRN123456',
      lesionComplexity: 'High',
      procedureType: 'PCI',
      scheduledDate: '2024-12-15T09:00:00Z',
      status: 'Pre-procedure',
      priority: 'Urgent',
      angiogramSummary: {
        lm: true,
        lad: true,
        lcx: false,
        rca: true,
        severity: '90% LM, 95% proximal LAD, 80% RCA'
      },
      syntaxScore: 32,
      recommendation: 'PCI',
      riskAssessment: {
        surgicalRisk: 'High',
        bleedingRisk: 'Intermediate',
        ischemicRisk: 'High'
      }
    },
    {
      id: 'P002',
      name: 'Maria Rodriguez',
      age: 72,
      mrn: 'MRN789012',
      lesionComplexity: 'Intermediate',
      procedureType: 'CABG',
      scheduledDate: '2024-12-16T07:30:00Z',
      status: 'Scheduled',
      priority: 'Routine',
      angiogramSummary: {
        lm: false,
        lad: true,
        lcx: true,
        rca: true,
        severity: '85% proximal LAD, 70% LCX, 75% RCA'
      },
      syntaxScore: 28,
      recommendation: 'CABG',
      riskAssessment: {
        surgicalRisk: 'Intermediate',
        bleedingRisk: 'Low',
        ischemicRisk: 'Intermediate'
      }
    },
    {
      id: 'P003',
      name: 'Robert Chen',
      age: 59,
      mrn: 'MRN345678',
      lesionComplexity: 'Low',
      procedureType: 'PCI',
      scheduledDate: '2024-12-14T14:00:00Z',
      status: 'Completed',
      priority: 'Routine',
      angiogramSummary: {
        lm: false,
        lad: true,
        lcx: false,
        rca: false,
        severity: '85% mid LAD'
      },
      syntaxScore: 12,
      recommendation: 'PCI',
      riskAssessment: {
        surgicalRisk: 'Low',
        bleedingRisk: 'Low',
        ischemicRisk: 'Low'
      },
      daptPlan: {
        medication: 'Aspirin + Ticagrelor',
        duration: '12 months',
        startDate: '2024-12-14',
        endDate: '2025-12-14',
        adherence: 'Good',
        lastCheck: '2024-12-14'
      },
      cardiacRehab: {
        ordered: true,
        startDate: '2024-12-21',
        completion: 0
      }
    }
  ];

  const tabs = [
    { id: 'pre-pci', label: 'Pre-PCI', icon: Calendar },
    { id: 'today', label: "Today's Cases", icon: Clock },
    { id: 'cabg-planning', label: 'CABG Planning', icon: Heart },
    { id: 'post-procedure', label: 'Post-procedure', icon: Activity }
  ];

  const filteredPatients = useMemo(() => {
    let filtered = mockPatients;

    // Tab filtering
    const today = new Date().toISOString().split('T')[0];
    switch (activeTab) {
      case 'pre-pci':
        filtered = filtered.filter(p => p.procedureType === 'PCI' && p.status !== 'Completed');
        break;
      case 'today':
        filtered = filtered.filter(p => p.scheduledDate.startsWith(today));
        break;
      case 'cabg-planning':
        filtered = filtered.filter(p => p.procedureType === 'CABG' || p.recommendation === 'CABG');
        break;
      case 'post-procedure':
        filtered = filtered.filter(p => p.status === 'Completed');
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filtering
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Priority filtering
    if (filterPriority !== 'all') {
      filtered = filtered.filter(p => p.priority === filterPriority);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'scheduledDate') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle undefined values
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
  }, [mockPatients, activeTab, searchTerm, filterStatus, filterPriority, sortField, sortDirection]);

  const handleSort = (field: keyof Patient) => {
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

  const bulkScheduleCathLab = () => {
    alert(`Scheduling ${selectedPatients.length} patients for cath lab procedures`);
  };

  const bulkOrderCardiacRehab = () => {
    alert(`Ordering cardiac rehabilitation for ${selectedPatients.length} patients`);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'MRN', 'Age', 'Complexity', 'Procedure', 'Date', 'Status', 'Priority'];
    const csvContent = [
      headers.join(','),
      ...filteredPatients.map(p => [
        p.name,
        p.mrn,
        p.age,
        p.lesionComplexity,
        p.procedureType,
        new Date(p.scheduledDate).toLocaleDateString(),
        p.status,
        p.priority
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coronary-worklist-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Emergent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Urgent': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Pre-procedure': return 'bg-amber-100 text-amber-700';
      case 'Scheduled': return 'bg-steel-100 text-steel-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const renderPatientDetail = (patient: Patient) => (
    <div className="mt-4 p-4 bg-steel-50/50 rounded-lg border border-steel-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Angiogram Summary */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            Angiogram Summary
          </h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`p-2 rounded ${patient.angiogramSummary.lm ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                LM: {patient.angiogramSummary.lm ? 'Disease' : 'Normal'}
              </div>
              <div className={`p-2 rounded ${patient.angiogramSummary.lad ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                LAD: {patient.angiogramSummary.lad ? 'Disease' : 'Normal'}
              </div>
              <div className={`p-2 rounded ${patient.angiogramSummary.lcx ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                LCX: {patient.angiogramSummary.lcx ? 'Disease' : 'Normal'}
              </div>
              <div className={`p-2 rounded ${patient.angiogramSummary.rca ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                RCA: {patient.angiogramSummary.rca ? 'Disease' : 'Normal'}
              </div>
            </div>
            <p className="text-sm text-steel-600 mt-2">{patient.angiogramSummary.severity}</p>
          </div>
        </div>

        {/* SYNTAX Score & Recommendation */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Assessment
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-steel-200">
              <div className="text-sm text-steel-600">SYNTAX Score</div>
              <div className={`text-xl font-bold ${
                patient.syntaxScore < 22 ? 'text-green-600' :
                patient.syntaxScore < 33 ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {patient.syntaxScore}
              </div>
              <div className="text-xs text-steel-500">
                {patient.syntaxScore < 22 ? 'Low complexity' :
                 patient.syntaxScore < 33 ? 'Intermediate' : 'High complexity'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-steel-200">
              <div className="text-sm text-steel-600">Recommendation</div>
              <div className="text-lg font-semibold text-steel-800">{patient.recommendation}</div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Risk Assessment
          </h4>
          <div className="space-y-2">
            {Object.entries(patient.riskAssessment).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-white rounded border border-steel-200">
                <span className="text-sm text-steel-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  value === 'Low' ? 'bg-green-100 text-green-700' :
                  value === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DAPT Plan (if exists) */}
        {patient.daptPlan && (
          <div className="lg:col-span-3">
            <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
              <Pill className="w-4 h-4 text-blue-500" />
              DAPT Plan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="text-sm text-steel-600">Medication</div>
                <div className="text-sm font-medium text-steel-800">{patient.daptPlan.medication}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="text-sm text-steel-600">Duration</div>
                <div className="text-sm font-medium text-steel-800">{patient.daptPlan.duration}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="text-sm text-steel-600">End Date</div>
                <div className="text-sm font-medium text-steel-800">{new Date(patient.daptPlan.endDate).toLocaleDateString()}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="text-sm text-steel-600">Adherence</div>
                <div className={`text-sm font-medium ${
                  patient.daptPlan.adherence === 'Good' ? 'text-green-600' :
                  patient.daptPlan.adherence === 'Poor' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {patient.daptPlan.adherence}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cardiac Rehab (if exists) */}
        {patient.cardiacRehab && (
          <div className="lg:col-span-3">
            <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              Cardiac Rehabilitation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="text-sm text-steel-600">Status</div>
                <div className="text-sm font-medium text-steel-800">
                  {patient.cardiacRehab.ordered ? 'Ordered' : 'Not Ordered'}
                </div>
              </div>
              {patient.cardiacRehab.startDate && (
                <div className="p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600">Start Date</div>
                  <div className="text-sm font-medium text-steel-800">
                    {new Date(patient.cardiacRehab.startDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {patient.cardiacRehab.completion !== undefined && (
                <div className="p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600">Completion</div>
                  <div className="text-sm font-medium text-steel-800">{patient.cardiacRehab.completion}%</div>
                </div>
              )}
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
                    ? 'bg-medical-blue-500 text-white'
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
              placeholder="Search by name or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Pre-procedure">Pre-procedure</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergent">Emergent</option>
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
          <div className="flex items-center gap-2 mt-4 p-3 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <span className="text-sm text-medical-blue-700 font-medium">
              {selectedPatients.length} patients selected
            </span>
            <button
              onClick={bulkScheduleCathLab}
              className="px-3 py-1 bg-medical-blue-600 text-white rounded text-sm hover:bg-medical-blue-700 transition-colors"
            >
              Schedule Cath Lab
            </button>
            <button
              onClick={bulkOrderCardiacRehab}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Order Cardiac Rehab
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
                  onClick={() => handleSort('lesionComplexity')}
                >
                  Complexity {sortField === 'lesionComplexity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('procedureType')}
                >
                  Procedure {sortField === 'procedureType' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('scheduledDate')}
                >
                  Date {sortField === 'scheduledDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 text-left text-sm font-semibold text-steel-700">Status</th>
                <th 
                  className="p-3 text-left text-sm font-semibold text-steel-700 cursor-pointer hover:text-steel-900"
                  onClick={() => handleSort('priority')}
                >
                  Priority {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        patient.lesionComplexity === 'High' ? 'bg-red-100 text-red-700' :
                        patient.lesionComplexity === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {patient.lesionComplexity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-steel-800">{patient.procedureType}</span>
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
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(patient.priority)}`}>
                        {patient.priority}
                      </span>
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

export default CoronaryWorklist;