import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, ExternalLink, Filter } from 'lucide-react';

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

  // Mock data - replace with Redux selector
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
      high: 'bg-rose-100 text-rose-700 border-rose-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return colors[priority as keyof typeof colors];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with Filters */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Care Team Worklist</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">{filteredPatients.length} patients</span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filterGDMT}
              onChange={(e) => setFilterGDMT(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-700">GDMT Gaps Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filterDevice}
              onChange={(e) => setFilterDevice(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-700">Device Eligible Only</span>
          </label>
        </div>
      </div>

      {/* Patient List */}
      <div className="divide-y divide-slate-100">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getPriorityBadge(patient.priority)}`}>
                  {patient.priority.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{patient.name}</div>
                  <div className="text-sm text-slate-500">MRN: {patient.mrn} • Age {patient.age} • EF {patient.ef}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Risk Score</div>
                <div className="text-lg font-bold text-rose-600">{patient.riskScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">NYHA Class</div>
                <div className="font-medium text-slate-700">{patient.nyhaClass}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">GDMT Gaps</div>
                <div className="font-medium text-amber-600">{patient.gdmtGaps} medications</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Next Appointment</div>
                <div className="font-medium text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(patient.nextAppt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {patient.deviceEligible.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1">Device Eligibility</div>
                <div className="flex flex-wrap gap-2">
                  {patient.deviceEligible.map(device => (
                    <span key={device} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                      {device}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {patient.phenotypeFlags.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1">Phenotype Flags</div>
                <div className="flex flex-wrap gap-2">
                  {patient.phenotypeFlags.map(flag => (
                    <span key={flag} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md border border-purple-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Review Patient
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Open Chart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientWorklist;
