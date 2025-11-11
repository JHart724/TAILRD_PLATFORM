import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Heart,
  Activity,
  Zap,
  Cpu,
  User,
  FileText,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Wifi,
  Shield,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface DeviceStatus {
  type: 'Pacemaker' | 'ICD' | 'CRT-P' | 'CRT-D' | 'Loop Recorder' | 'None';
  manufacturer: string;
  model: string;
  implantDate: string;
  batteryStatus: 'Normal' | 'ERI' | 'EOL';
  lastInterrogation: string;
  nextFollowUp: string;
  alerts: string[];
}

interface EPPatient {
  id: string;
  name: string;
  age: number;
  mrn: string;
  currentRhythm: 'SR' | 'AF' | 'AFL' | 'VT' | 'VF' | 'Brady' | 'SVT';
  procedureType: 'Ablation' | 'Device Implant' | 'Device Revision' | 'EP Study' | 'Cardioversion' | 'Follow-up';
  scheduledDate: string;
  status: 'Scheduled' | 'Pre-procedure' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Routine' | 'Urgent' | 'Emergent';
  cha2ds2vasc: number;
  hasbled: number;
  deviceStatus?: DeviceStatus;
  lastEcho: {
    date: string;
    ef: number;
    laSize: number;
  };
  medications: {
    antiarrhythmic: string[];
    anticoagulation: string;
    betaBlocker: string;
  };
  nextFollowUp: string;
  remoteMonitoring: boolean;
  ablationHistory: {
    date: string;
    type: string;
    outcome: 'Success' | 'Partial' | 'Failed';
  }[];
  notes: string;
}

type WorklistTab = 'pre-procedure' | 'today' | 'post-ablation' | 'device-followup';

const EPWorklist: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorklistTab>('pre-procedure');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof EPPatient>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [filterRhythm, setFilterRhythm] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const mockPatients: EPPatient[] = [
    {
      id: 'EP001',
      name: 'John Anderson',
      age: 68,
      mrn: 'MRN123456',
      currentRhythm: 'AF',
      procedureType: 'Ablation',
      scheduledDate: '2024-12-15T09:00:00Z',
      status: 'Pre-procedure',
      priority: 'Urgent',
      cha2ds2vasc: 4,
      hasbled: 2,
      lastEcho: {
        date: '2024-11-15',
        ef: 55,
        laSize: 45
      },
      medications: {
        antiarrhythmic: ['Amiodarone'],
        anticoagulation: 'Warfarin',
        betaBlocker: 'Metoprolol'
      },
      nextFollowUp: '2025-01-15',
      remoteMonitoring: false,
      ablationHistory: [
        {
          date: '2022-05-15',
          type: 'PVI',
          outcome: 'Partial'
        }
      ],
      notes: 'Redo ablation for recurrent AF'
    },
    {
      id: 'EP002',
      name: 'Maria Rodriguez',
      age: 75,
      mrn: 'MRN789012',
      currentRhythm: 'SR',
      procedureType: 'Device Implant',
      scheduledDate: '2024-12-16T07:30:00Z',
      status: 'Scheduled',
      priority: 'Routine',
      cha2ds2vasc: 3,
      hasbled: 1,
      lastEcho: {
        date: '2024-11-01',
        ef: 25,
        laSize: 38
      },
      medications: {
        antiarrhythmic: [],
        anticoagulation: 'Apixaban',
        betaBlocker: 'Carvedilol'
      },
      nextFollowUp: '2025-02-16',
      remoteMonitoring: true,
      ablationHistory: [],
      notes: 'Primary prevention ICD candidate'
    },
    {
      id: 'EP003',
      name: 'Robert Chen',
      age: 59,
      mrn: 'MRN345678',
      currentRhythm: 'SR',
      procedureType: 'Follow-up',
      scheduledDate: '2024-12-14T14:00:00Z',
      status: 'Completed',
      priority: 'Routine',
      cha2ds2vasc: 1,
      hasbled: 0,
      deviceStatus: {
        type: 'CRT-D',
        manufacturer: 'Medtronic',
        model: 'Cobalt',
        implantDate: '2023-08-15',
        batteryStatus: 'Normal',
        lastInterrogation: '2024-12-01',
        nextFollowUp: '2025-06-01',
        alerts: []
      },
      lastEcho: {
        date: '2024-11-15',
        ef: 40,
        laSize: 35
      },
      medications: {
        antiarrhythmic: [],
        anticoagulation: 'None',
        betaBlocker: 'Metoprolol XL'
      },
      nextFollowUp: '2025-06-01',
      remoteMonitoring: true,
      ablationHistory: [],
      notes: 'Good CRT response, EF improved from 25% to 40%'
    },
    {
      id: 'EP004',
      name: 'Sarah Johnson',
      age: 42,
      mrn: 'MRN567890',
      currentRhythm: 'SVT',
      procedureType: 'Ablation',
      scheduledDate: '2024-12-18T10:00:00Z',
      status: 'Scheduled',
      priority: 'Routine',
      cha2ds2vasc: 0,
      hasbled: 0,
      lastEcho: {
        date: '2024-10-20',
        ef: 60,
        laSize: 32
      },
      medications: {
        antiarrhythmic: ['Flecainide'],
        anticoagulation: 'None',
        betaBlocker: 'None'
      },
      nextFollowUp: '2025-03-18',
      remoteMonitoring: false,
      ablationHistory: [],
      notes: 'AVNRT, failed medical therapy'
    }
  ];

  const tabs = [
    { id: 'pre-procedure', label: 'Pre-procedure', icon: Calendar },
    { id: 'today', label: "Today's Cases", icon: Clock },
    { id: 'post-ablation', label: 'Post-ablation', icon: Zap },
    { id: 'device-followup', label: 'Device Follow-up', icon: Cpu }
  ];

  const filteredPatients = useMemo(() => {
    let filtered = mockPatients;

    // Tab filtering
    const today = new Date().toISOString().split('T')[0];
    switch (activeTab) {
      case 'pre-procedure':
        filtered = filtered.filter(p => 
          (p.procedureType === 'Ablation' || p.procedureType === 'Device Implant' || p.procedureType === 'EP Study') 
          && p.status !== 'Completed'
        );
        break;
      case 'today':
        filtered = filtered.filter(p => p.scheduledDate.startsWith(today));
        break;
      case 'post-ablation':
        filtered = filtered.filter(p => p.ablationHistory.length > 0 || p.procedureType === 'Ablation');
        break;
      case 'device-followup':
        filtered = filtered.filter(p => p.deviceStatus);
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.currentRhythm.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rhythm filtering
    if (filterRhythm !== 'all') {
      filtered = filtered.filter(p => p.currentRhythm === filterRhythm);
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
  }, [mockPatients, activeTab, searchTerm, filterRhythm, filterPriority, sortField, sortDirection]);

  const handleSort = (field: keyof EPPatient) => {
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

  const bulkScheduleRemoteMonitoring = () => {
    alert(`Scheduling remote monitoring for ${selectedPatients.length} patients`);
  };

  const bulkOrderEcho = () => {
    alert(`Ordering echocardiogram for ${selectedPatients.length} patients`);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'MRN', 'Age', 'Rhythm', 'Procedure', 'Date', 'Status', 'Priority'];
    const csvContent = [
      headers.join(','),
      ...filteredPatients.map(p => [
        p.name,
        p.mrn,
        p.age,
        p.currentRhythm,
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
    link.download = `ep-worklist-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
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

  const getRhythmColor = (rhythm: string) => {
    switch (rhythm) {
      case 'SR': return 'bg-green-100 text-green-700';
      case 'AF': case 'AFL': return 'bg-red-100 text-red-700';
      case 'VT': case 'VF': return 'bg-red-100 text-red-700';
      case 'Brady': return 'bg-amber-100 text-amber-700';
      case 'SVT': return 'bg-blue-100 text-blue-700';
      default: return 'bg-steel-100 text-steel-700';
    }
  };

  const getBatteryColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'text-green-600';
      case 'ERI': return 'text-amber-600';
      case 'EOL': return 'text-red-600';
      default: return 'text-steel-600';
    }
  };

  const renderPatientDetail = (patient: EPPatient) => (
    <div className="mt-4 p-4 bg-steel-50/50 rounded-lg border border-steel-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Scores */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Risk Assessment
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-steel-200">
              <div className="text-sm text-steel-600">CHA₂DS₂-VASc Score</div>
              <div className={`text-xl font-bold ${
                patient.cha2ds2vasc >= 4 ? 'text-red-600' :
                patient.cha2ds2vasc >= 2 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {patient.cha2ds2vasc}
              </div>
              <div className="text-xs text-steel-500">
                {patient.cha2ds2vasc < 2 ? 'Low stroke risk' :
                 patient.cha2ds2vasc < 4 ? 'Moderate risk' : 'High stroke risk'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-steel-200">
              <div className="text-sm text-steel-600">HAS-BLED Score</div>
              <div className={`text-xl font-bold ${
                patient.hasbled >= 3 ? 'text-red-600' :
                patient.hasbled >= 2 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {patient.hasbled}
              </div>
              <div className="text-xs text-steel-500">
                {patient.hasbled < 2 ? 'Low bleeding risk' :
                 patient.hasbled < 3 ? 'Moderate risk' : 'High bleeding risk'}
              </div>
            </div>
          </div>
        </div>

        {/* Device Status (if applicable) */}
        {patient.deviceStatus && (
          <div>
            <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              Device Status
            </h4>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded-lg border border-steel-200">
                <div className="font-medium text-steel-800">{patient.deviceStatus.type}</div>
                <div className="text-sm text-steel-600">
                  {patient.deviceStatus.manufacturer} {patient.deviceStatus.model}
                </div>
                <div className="text-xs text-steel-500">
                  Implanted: {new Date(patient.deviceStatus.implantDate).toLocaleDateString()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-white rounded border border-steel-200">
                  <div className="text-xs text-steel-600">Battery</div>
                  <div className={`font-medium ${getBatteryColor(patient.deviceStatus.batteryStatus)}`}>
                    {patient.deviceStatus.batteryStatus}
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-steel-200">
                  <div className="text-xs text-steel-600">Last Check</div>
                  <div className="text-sm text-steel-800">
                    {new Date(patient.deviceStatus.lastInterrogation).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {patient.remoteMonitoring && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Remote monitoring active</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Medications */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            Current Medications
          </h4>
          <div className="space-y-2">
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Antiarrhythmic</div>
              <div className="text-sm text-steel-800">
                {patient.medications.antiarrhythmic.length > 0 ? 
                  patient.medications.antiarrhythmic.join(', ') : 'None'}
              </div>
            </div>
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Anticoagulation</div>
              <div className="text-sm text-steel-800">{patient.medications.anticoagulation}</div>
            </div>
            <div className="p-2 bg-white rounded border border-steel-200">
              <div className="text-xs text-steel-600">Beta Blocker</div>
              <div className="text-sm text-steel-800">{patient.medications.betaBlocker || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Echo Results */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            Latest Echo
          </h4>
          <div className="p-3 bg-white rounded-lg border border-steel-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-steel-600">Ejection Fraction</div>
                <div className={`text-lg font-bold ${
                  patient.lastEcho.ef >= 50 ? 'text-green-600' :
                  patient.lastEcho.ef >= 35 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {patient.lastEcho.ef}%
                </div>
              </div>
              <div>
                <div className="text-xs text-steel-600">LA Size</div>
                <div className={`text-lg font-bold ${
                  patient.lastEcho.laSize <= 40 ? 'text-green-600' :
                  patient.lastEcho.laSize <= 45 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {patient.lastEcho.laSize}mm
                </div>
              </div>
            </div>
            <div className="text-xs text-steel-500 mt-2">
              Date: {new Date(patient.lastEcho.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Ablation History */}
        {patient.ablationHistory.length > 0 && (
          <div>
            <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Ablation History
            </h4>
            <div className="space-y-2">
              {patient.ablationHistory.map((ablation, index) => (
                <div key={index} className="p-2 bg-white rounded border border-steel-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-steel-800">{ablation.type}</div>
                      <div className="text-xs text-steel-500">
                        {new Date(ablation.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      ablation.outcome === 'Success' ? 'bg-green-100 text-green-700' :
                      ablation.outcome === 'Partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ablation.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up */}
        <div>
          <h4 className="font-semibold text-steel-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Follow-up
          </h4>
          <div className="p-3 bg-white rounded-lg border border-steel-200">
            <div className="text-sm text-steel-600 mb-1">Next Appointment</div>
            <div className="font-medium text-steel-800 mb-2">
              {new Date(patient.nextFollowUp).toLocaleDateString()}
            </div>
            {patient.deviceStatus && (
              <div>
                <div className="text-xs text-steel-600">Device Follow-up</div>
                <div className="text-sm text-steel-800">
                  {new Date(patient.deviceStatus.nextFollowUp).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {patient.notes && (
        <div className="mt-4">
          <h4 className="font-semibold text-steel-800 mb-2">Notes</h4>
          <div className="p-3 bg-white rounded-lg border border-steel-200">
            <div className="text-sm text-steel-700">{patient.notes}</div>
          </div>
        </div>
      )}
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
                    ? 'bg-medical-purple-500 text-white'
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
              placeholder="Search by name, MRN, or rhythm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
            />
          </div>
          
          <select
            value={filterRhythm}
            onChange={(e) => setFilterRhythm(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
          >
            <option value="all">All Rhythms</option>
            <option value="SR">Sinus Rhythm</option>
            <option value="AF">Atrial Fibrillation</option>
            <option value="AFL">Atrial Flutter</option>
            <option value="VT">Ventricular Tachycardia</option>
            <option value="SVT">SVT</option>
            <option value="Brady">Bradycardia</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
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
          <div className="flex items-center gap-2 mt-4 p-3 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
            <span className="text-sm text-medical-purple-700 font-medium">
              {selectedPatients.length} patients selected
            </span>
            <button
              onClick={bulkScheduleRemoteMonitoring}
              className="px-3 py-1 bg-medical-purple-600 text-white rounded text-sm hover:bg-medical-purple-700 transition-colors"
            >
              Schedule Remote Monitoring
            </button>
            <button
              onClick={bulkOrderEcho}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Order Echo
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
                  onClick={() => handleSort('currentRhythm')}
                >
                  Rhythm {sortField === 'currentRhythm' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRhythmColor(patient.currentRhythm)}`}>
                        {patient.currentRhythm}
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
                        {patient.remoteMonitoring && (
                          <div title="Remote monitoring enabled">
                            <Wifi className="w-4 h-4 text-green-500" />
                          </div>
                        )}
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

export default EPWorklist;