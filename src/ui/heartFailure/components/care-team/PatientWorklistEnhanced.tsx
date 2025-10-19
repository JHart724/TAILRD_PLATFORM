import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, ExternalLink, Filter, User, Heart, Clock } from 'lucide-react';
import PatientDetailPanel from './PatientDetailPanel';

interface WorklistPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  lvef: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  priority: 'high' | 'medium' | 'low';
  gdmtGaps: string[];
  deviceEligible: boolean;
  lastVisit: string;
  nextAppointment?: string;
  assignedProvider: string;
  recentAdmission: boolean;
  actionItems: {
    category: 'GDMT' | 'Device' | 'Lab' | 'Follow-up';
    description: string;
    dueDate: string;
    urgent: boolean;
  }[];
  riskScore: number;
  phenotype?: string;
}

const PatientWorklistEnhanced: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<WorklistPatient | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterGDMT, setFilterGDMT] = useState<boolean>(false);
  const [filterDevice, setFilterDevice] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<keyof WorklistPatient>('riskScore');

  // Enhanced mock data with comprehensive patient information
  const patients: WorklistPatient[] = [
    {
      id: 'PT001',
      name: 'Johnson, Maria',
      mrn: '123456789',
      age: 67,
      gender: 'F',
      lvef: 28,
      nyhaClass: 'III',
      priority: 'high',
      gdmtGaps: ['SGLT2i not started', 'MRA suboptimal dose'],
      deviceEligible: true,
      lastVisit: '2025-10-12',
      nextAppointment: '2025-10-25',
      assignedProvider: 'Dr. Rivera',
      recentAdmission: true,
      riskScore: 8.7,
      phenotype: 'HFrEF',
      actionItems: [
        { category: 'GDMT', description: 'Initiate SGLT2i therapy', dueDate: '2025-10-20', urgent: true },
        { category: 'Device', description: 'CRT-D evaluation', dueDate: '2025-10-22', urgent: true },
        { category: 'Lab', description: 'BNP trending', dueDate: '2025-10-18', urgent: false },
      ],
    },
    {
      id: 'PT002',
      name: 'Williams, Robert',
      mrn: '987654321',
      age: 72,
      gender: 'M',
      lvef: 35,
      nyhaClass: 'II',
      priority: 'medium',
      gdmtGaps: ['Beta-blocker not at target dose'],
      deviceEligible: false,
      lastVisit: '2025-10-08',
      nextAppointment: '2025-11-05',
      assignedProvider: 'Dr. Chen',
      recentAdmission: false,
      riskScore: 6.2,
      phenotype: 'HFrEF',
      actionItems: [
        { category: 'GDMT', description: 'Uptitrate metoprolol', dueDate: '2025-10-28', urgent: false },
        { category: 'Follow-up', description: 'Exercise stress test', dueDate: '2025-11-01', urgent: false },
      ],
    },
    {
      id: 'PT003',
      name: 'Davis, Linda',
      mrn: '456789123',
      age: 58,
      gender: 'F',
      lvef: 22,
      nyhaClass: 'IV',
      priority: 'high',
      gdmtGaps: ['ARNi not started', 'MRA contraindicated'],
      deviceEligible: true,
      lastVisit: '2025-10-15',
      assignedProvider: 'Dr. Martinez',
      recentAdmission: true,
      riskScore: 9.4,
      phenotype: 'Advanced HF',
      actionItems: [
        { category: 'GDMT', description: 'ARNi transition plan', dueDate: '2025-10-17', urgent: true },
        { category: 'Device', description: 'LVAD evaluation', dueDate: '2025-10-20', urgent: true },
        { category: 'Follow-up', description: 'Transplant consultation', dueDate: '2025-10-19', urgent: true },
      ],
    },
    {
      id: 'PT004',
      name: 'Brown, Charles',
      mrn: '789123456',
      age: 45,
      gender: 'M',
      lvef: 42,
      nyhaClass: 'II',
      priority: 'low',
      gdmtGaps: [],
      deviceEligible: false,
      lastVisit: '2025-09-28',
      nextAppointment: '2025-12-15',
      assignedProvider: 'Dr. Foster',
      recentAdmission: false,
      riskScore: 4.1,
      phenotype: 'HFpEF',
      actionItems: [
        { category: 'Lab', description: 'Annual lab panel', dueDate: '2025-11-15', urgent: false },
        { category: 'Follow-up', description: 'Routine follow-up', dueDate: '2025-12-15', urgent: false },
      ],
    },
    {
      id: 'PT005',
      name: 'Anderson, Sarah',
      mrn: '321654987',
      age: 81,
      gender: 'F',
      lvef: 31,
      nyhaClass: 'III',
      priority: 'medium',
      gdmtGaps: ['SGLT2i age consideration', 'Beta-blocker intolerance'],
      deviceEligible: true,
      lastVisit: '2025-10-10',
      nextAppointment: '2025-10-30',
      assignedProvider: 'Dr. Park',
      recentAdmission: false,
      riskScore: 7.3,
      phenotype: 'HFrEF',
      actionItems: [
        { category: 'GDMT', description: 'Review SGLT2i risks/benefits', dueDate: '2025-10-25', urgent: false },
        { category: 'Device', description: 'ICD consideration', dueDate: '2025-11-10', urgent: false },
      ],
    },
  ];

  const filteredPatients = patients.filter(patient => {
    if (filterPriority !== 'all' && patient.priority !== filterPriority) return false;
    if (filterGDMT && patient.gdmtGaps.length === 0) return false;
    if (filterDevice && !patient.deviceEligible) return false;
    return true;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (typeof a[sortBy] === 'number' && typeof b[sortBy] === 'number') {
      return (b[sortBy] as number) - (a[sortBy] as number);
    }
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'border-l-medical-red-400 bg-medical-red-50/50',
      medium: 'border-l-medical-amber-400 bg-medical-amber-50/50',
      low: 'border-l-medical-green-400 bg-medical-green-50/50',
    };
    return colors[priority as keyof typeof colors];
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 8) return 'text-medical-red-600 bg-medical-red-100';
    if (riskScore >= 6) return 'text-medical-amber-600 bg-medical-amber-100';
    return 'text-medical-green-600 bg-medical-green-100';
  };

  const getNYHAColor = (nyhaClass: string) => {
    const colors = {
      'I': 'text-medical-green-600 bg-medical-green-100',
      'II': 'text-medical-blue-600 bg-medical-blue-100',
      'III': 'text-medical-amber-600 bg-medical-amber-100',
      'IV': 'text-medical-red-600 bg-medical-red-100',
    };
    return colors[nyhaClass as keyof typeof colors];
  };

  const urgentActions = sortedPatients.reduce((total, patient) => 
    total + patient.actionItems.filter(item => item.urgent).length, 0
  );

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Patient Care Worklist
          </h2>
          <p className="text-steel-600">
            Prioritized patient list with care gaps and action items
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Urgent Actions</div>
          <div className="text-3xl font-bold text-medical-red-600 font-sf">
            {urgentActions}
          </div>
          <div className="text-sm text-steel-600">
            Require immediate attention
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-steel-50 rounded-xl border border-steel-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-steel-600" />
            <span className="text-sm font-medium text-steel-700">Filters:</span>
          </div>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-steel-300 rounded-lg cursor-pointer hover:bg-steel-50">
            <input
              type="checkbox"
              checked={filterGDMT}
              onChange={(e) => setFilterGDMT(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-steel-800">GDMT Gaps Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-steel-300 rounded-lg cursor-pointer hover:bg-steel-50">
            <input
              type="checkbox"
              checked={filterDevice}
              onChange={(e) => setFilterDevice(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-steel-800">Device Eligible</span>
          </label>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as keyof WorklistPatient)}
          className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
        >
          <option value="riskScore">Sort by Risk Score</option>
          <option value="lastVisit">Sort by Last Visit</option>
          <option value="age">Sort by Age</option>
          <option value="lvef">Sort by LVEF</option>
        </select>
      </div>

      {/* Patient Cards */}
      <div className="space-y-4">
        {sortedPatients.map((patient) => (
          <div
            key={patient.id}
            className={`retina-card border-l-4 transition-all duration-300 hover:shadow-retina-3 cursor-pointer ${getPriorityColor(patient.priority)}`}
            onClick={() => setSelectedPatient(patient)}
          >
            <div className="p-4">
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-medical-blue-100">
                    <User className="w-6 h-6 text-medical-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-steel-900">{patient.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(patient.riskScore)}`}>
                        Risk: {patient.riskScore.toFixed(1)}
                      </span>
                      {patient.recentAdmission && (
                        <span className="px-2 py-1 text-xs font-semibold bg-medical-red-100 text-medical-red-700 rounded-full">
                          Recent Admission
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-steel-600">
                      <span>MRN: {patient.mrn}</span>
                      <span>Age: {patient.age}{patient.gender}</span>
                      <span>Provider: {patient.assignedProvider}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-steel-600 mb-1">Priority</div>
                  <div className={`inline-block px-3 py-1 rounded-lg font-semibold text-sm ${
                    patient.priority === 'high' ? 'bg-medical-red-100 text-medical-red-700' :
                    patient.priority === 'medium' ? 'bg-medical-amber-100 text-medical-amber-700' :
                    'bg-medical-green-100 text-medical-green-700'
                  }`}>
                    {patient.priority.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Clinical Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Heart className="w-4 h-4 text-medical-red-600" />
                    <span className="text-2xl font-bold text-steel-900">{patient.lvef}%</span>
                  </div>
                  <div className="text-xs text-steel-600">LVEF</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className={`text-lg font-bold px-2 py-1 rounded ${getNYHAColor(patient.nyhaClass)}`}>
                    NYHA {patient.nyhaClass}
                  </div>
                  <div className="text-xs text-steel-600 mt-1">Functional Class</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-2xl font-bold text-steel-900">{patient.gdmtGaps.length}</div>
                  <div className="text-xs text-steel-600">GDMT Gaps</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-2xl font-bold text-steel-900">
                    {patient.actionItems.filter(item => item.urgent).length}
                  </div>
                  <div className="text-xs text-steel-600">Urgent Actions</div>
                </div>
              </div>

              {/* GDMT Gaps */}
              {patient.gdmtGaps.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-steel-700 mb-2">GDMT Gaps:</div>
                  <div className="flex flex-wrap gap-2">
                    {patient.gdmtGaps.map((gap, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-medical-amber-50 text-medical-amber-800 text-sm rounded-lg border border-medical-amber-200"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-steel-700 mb-2">Action Items:</div>
                <div className="space-y-2">
                  {patient.actionItems.slice(0, 3).map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        item.urgent 
                          ? 'bg-medical-red-50 border-medical-red-200' 
                          : 'bg-steel-50 border-steel-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.urgent && <AlertCircle className="w-4 h-4 text-medical-red-600" />}
                        <span className={`text-sm ${item.urgent ? 'text-medical-red-800' : 'text-steel-800'}`}>
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-steel-500" />
                        <span className="text-xs text-steel-600">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {patient.actionItems.length > 3 && (
                    <div className="text-xs text-steel-600 text-center">
                      +{patient.actionItems.length - 3} more items
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-steel-200">
                <div className="flex items-center gap-4 text-sm text-steel-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Last: {new Date(patient.lastVisit).toLocaleDateString()}</span>
                  </div>
                  {patient.nextAppointment && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Next: {new Date(patient.nextAppointment).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  Open Chart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedPatient && (
        <PatientDetailPanel 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
        />
      )}
    </div>
  );
};

export default PatientWorklistEnhanced;