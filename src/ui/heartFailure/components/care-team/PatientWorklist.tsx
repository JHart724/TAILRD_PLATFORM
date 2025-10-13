import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, ExternalLink, Filter } from 'lucide-react';
import PatientDetailPanel from './PatientDetailPanel';

interface WorklistPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  ef: number;
  nyhaClass: string;
  riskScore: number;
  gdmtGaps: number;
  deviceEligible: string[];
  phenotypeFlags: string[];
  nextAppt: string;
  assignedProvider: string;
  priority: 'high' | 'medium' | 'low';
}

const PatientWorklist: React.FC = () => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterGDMT, setFilterGDMT] = useState<boolean>(false);
  const [filterDevice, setFilterDevice] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<WorklistPatient | null>(null);

  const patients: WorklistPatient[] = [
    {
      id: 'P001',
      name: 'Johnson, Maria',
      mrn: '123456',
      age: 67,
      ef: 28,
      nyhaClass: 'III',
      riskScore: 82,
      gdmtGaps: 3,
      deviceEligible: ['CRT-D', 'CardioMEMS'],
      phenotypeFlags: ['Amyloid Risk', 'Iron Deficiency'],
      nextAppt: '2025-10-15',
      assignedProvider: 'Dr. Smith',
      priority: 'high'
    },
    {
      id: 'P002',
      name: 'Williams, Robert',
      mrn: '789012',
      age: 54,
      ef: 35,
      nyhaClass: 'II',
      riskScore: 65,
      gdmtGaps: 1,
      deviceEligible: ['ICD'],
      phenotypeFlags: [],
      nextAppt: '2025-10-18',
      assignedProvider: 'Dr. Jones',
      priority: 'medium'
    },
    {
      id: 'P003',
      name: 'Davis, Linda',
      mrn: '345678',
      age: 71,
      ef: 22,
      nyhaClass: 'III',
      riskScore: 88,
      gdmtGaps: 4,
      deviceEligible: ['CRT-D', 'LVAD', 'CardioMEMS'],
      phenotypeFlags: ['HCM', 'Tachy-CM'],
      nextAppt: '2025-10-12',
      assignedProvider: 'Dr. Smith',
      priority: 'high'
    },
    {
      id: 'P004',
      name: 'Martinez, Carlos',
      mrn: '456789',
      age: 62,
      ef: 31,
      nyhaClass: 'II',
      riskScore: 58,
      gdmtGaps: 2,
      deviceEligible: ['ICD'],
      phenotypeFlags: ['Iron Deficiency'],
      nextAppt: '2025-10-20',
      assignedProvider: 'Dr. Jones',
      priority: 'medium'
    },
    {
      id: 'P005',
      name: 'Chen, Wei',
      mrn: '567890',
      age: 59,
      ef: 38,
      nyhaClass: 'II',
      riskScore: 52,
      gdmtGaps: 1,
      deviceEligible: [],
      phenotypeFlags: [],
      nextAppt: '2025-10-22',
      assignedProvider: 'Dr. Smith',
      priority: 'low'
    }
  ];

  const filteredPatients = patients.filter(p => {
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
    if (filterGDMT && p.gdmtGaps === 0) return false;
    if (filterDevice && p.deviceEligible.length === 0) return false;
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-900 border-red-400',
      medium: 'bg-amber-100 text-amber-900 border-amber-400',
      low: 'bg-slate-100 text-slate-700 border-slate-400'
    };
    return colors[priority as keyof typeof colors];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-300 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Care Team Worklist</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-slate-700 font-medium">{filteredPatients.length} patients</span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={filterGDMT}
              onChange={(e) => setFilterGDMT(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-800">GDMT Gaps Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={filterDevice}
              onChange={(e) => setFilterDevice(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-800">Device Eligible Only</span>
          </label>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getPriorityBadge(patient.priority)}`}>
                  {patient.priority.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{patient.name}</div>
                  <div className="text-sm text-slate-600">MRN: {patient.mrn} • Age {patient.age} • EF {patient.ef}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-600">Risk Score</div>
                <div className="text-lg font-bold text-red-800">{patient.riskScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">NYHA Class</div>
                <div className="font-medium text-slate-800">{patient.nyhaClass}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">GDMT Gaps</div>
                <div className="font-medium text-amber-800">{patient.gdmtGaps} medications</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Next Appointment</div>
                <div className="font-medium text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(patient.nextAppt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {patient.deviceEligible.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-600 mb-1">Device Eligibility</div>
                <div className="flex flex-wrap gap-2">
                  {patient.deviceEligible.map(device => (
                    <span key={device} className="px-2 py-1 bg-indigo-50 text-indigo-900 text-xs rounded-md border border-indigo-300 font-medium">
                      {device}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {patient.phenotypeFlags.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-600 mb-1">Phenotype Flags</div>
                <div className="flex flex-wrap gap-2">
                  {patient.phenotypeFlags.map(flag => (
                    <span key={flag} className="px-2 py-1 bg-red-50 text-red-900 text-xs rounded-md border border-red-300 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedPatient(patient)}
                className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Review Patient
              </button>
              <button className="px-4 py-2 bg-slate-200 text-slate-800 text-sm rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 font-medium">
                <ExternalLink className="w-4 h-4" />
                Open Chart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    {selectedPatient && (
        <PatientDetailPanel 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
        />
      )}
  );
};

export default PatientWorklist;
