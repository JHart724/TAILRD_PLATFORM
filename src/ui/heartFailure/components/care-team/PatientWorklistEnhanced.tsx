import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, ExternalLink, Filter, User, Heart, Clock, Target, CheckCircle, XCircle, AlertTriangle, ChevronUp, ChevronRight, Pill, Activity } from 'lucide-react';
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
  fullChart?: {
    vitals: {
      bp: string;
      hr: number;
      temp: number;
      o2sat: number;
      weight: number;
    };
    labs: {
      creatinine: number;
      bun: number;
      sodium: number;
      potassium: number;
      hemoglobin: number;
      bnp?: number;
      hba1c?: number;
    };
    medications: {
      name: string;
      dose: string;
      frequency: string;
      adherence?: number;
    }[];
    provider: {
      attending: string;
      resident?: string;
      nurse: string;
      coordinator?: string;
    };
    notes: string[];
    allergies: string[];
    recentHospitalizations: {
      date: string;
      reason: string;
      los: number;
    }[];
    gdmt?: {
      overallScore: number;
      pillars: {
        arni: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        betaBlocker: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        sglt2i: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        mra: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
      };
      lastReview: string;
      nextReview: string;
      barriers: string[];
      opportunities: {
        pillar: string;
        action: string;
        priority: 'high' | 'medium' | 'low';
        timeframe: string;
      }[];
    };
  };
}

const PatientWorklistEnhanced: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<WorklistPatient | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterGDMT, setFilterGDMT] = useState<boolean>(false);
  const [filterDevice, setFilterDevice] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<keyof WorklistPatient>('riskScore');
  const [expandedGDMT, setExpandedGDMT] = useState<string | null>(null);

  const getGDMTStatusIcon = (status: string) => {
    switch(status) {
      case 'optimal': return <CheckCircle className="w-3 h-3" />;
      case 'suboptimal': return <Clock className="w-3 h-3" />;
      case 'contraindicated': return <XCircle className="w-3 h-3" />;
      case 'not_started': return <AlertTriangle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getGDMTStatusColor = (status: string) => {
    switch(status) {
      case 'optimal': return 'text-green-600';
      case 'suboptimal': return 'text-yellow-600';
      case 'contraindicated': return 'text-red-600';
      case 'not_started': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getGDMTScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

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
      fullChart: {
        vitals: {
          bp: '138/82',
          hr: 94,
          temp: 98.4,
          o2sat: 93,
          weight: 175.2
        },
        labs: {
          creatinine: 1.3,
          bun: 28,
          sodium: 136,
          potassium: 4.2,
          hemoglobin: 11.8,
          bnp: 1240,
          hba1c: 8.1
        },
        medications: [
          { name: 'Carvedilol', dose: '25mg', frequency: 'BID', adherence: 85 },
          { name: 'Lisinopril', dose: '20mg', frequency: 'Daily', adherence: 90 },
          { name: 'Spironolactone', dose: '12.5mg', frequency: 'Daily', adherence: 78 },
          { name: 'Furosemide', dose: '40mg', frequency: 'Daily', adherence: 88 }
        ],
        provider: {
          attending: 'Dr. Rivera',
          resident: 'Dr. Thompson',
          nurse: 'Maria Santos, RN',
          coordinator: 'Jennifer Lee, NP'
        },
        notes: [
          'Patient reports increased dyspnea with minimal exertion',
          'Bilateral lower extremity edema present',
          'Medication adherence challenges with complex regimen',
          'Recent 30-day readmission for heart failure exacerbation'
        ],
        allergies: ['Sulfa drugs', 'Shellfish'],
        recentHospitalizations: [
          { date: '2025-09-15', reason: 'HF exacerbation', los: 4 },
          { date: '2025-07-22', reason: 'Acute decompensated HF', los: 6 }
        ],
        gdmt: {
          overallScore: 62,
          pillars: {
            arni: {
              status: 'suboptimal',
              currentDrug: 'Lisinopril',
              currentDose: '20mg daily',
              targetDose: 'Sacubitril/valsartan 97/103mg BID',
              reason: 'Can transition to ARNi for better outcomes',
              nextAction: 'Transition to ARNi after washout period'
            },
            betaBlocker: {
              status: 'optimal',
              currentDrug: 'Carvedilol',
              currentDose: '25mg BID',
              targetDose: '25mg BID',
              reason: 'At maximum tolerated dose'
            },
            sglt2i: {
              status: 'not_started',
              reason: 'Not initiated despite DM and HFrEF indication',
              nextAction: 'Start dapagliflozin 10mg daily'
            },
            mra: {
              status: 'suboptimal',
              currentDrug: 'Spironolactone',
              currentDose: '12.5mg daily',
              targetDose: '25mg daily',
              reason: 'Dose can be increased with K+ monitoring',
              nextAction: 'Increase to 25mg daily if K+ <5.0'
            }
          },
          lastReview: '2025-10-12',
          nextReview: '2025-10-25',
          barriers: ['Complex medication regimen', 'Adherence challenges', 'Diabetes management'],
          opportunities: [
            {
              pillar: 'SGLT2i',
              action: 'Initiate dapagliflozin for dual diabetes and HF benefit',
              priority: 'high',
              timeframe: '1-2 weeks'
            },
            {
              pillar: 'MRA',
              action: 'Uptitrate spironolactone with lab monitoring',
              priority: 'medium',
              timeframe: '2-4 weeks'
            },
            {
              pillar: 'ARNi',
              action: 'Transition ACEi to ARNi for mortality benefit',
              priority: 'medium',
              timeframe: '4-6 weeks'
            }
          ]
        }
      }
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
      fullChart: {
        vitals: {
          bp: '124/76',
          hr: 68,
          temp: 98.6,
          o2sat: 97,
          weight: 189.5
        },
        labs: {
          creatinine: 1.1,
          bun: 22,
          sodium: 140,
          potassium: 4.5,
          hemoglobin: 13.2,
          bnp: 680
        },
        medications: [
          { name: 'Metoprolol XL', dose: '50mg', frequency: 'Daily', adherence: 95 },
          { name: 'Lisinopril', dose: '10mg', frequency: 'Daily', adherence: 92 },
          { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily', adherence: 88 },
          { name: 'Aspirin', dose: '81mg', frequency: 'Daily', adherence: 96 }
        ],
        provider: {
          attending: 'Dr. Chen',
          nurse: 'Robert Kim, RN'
        },
        notes: [
          'Stable heart failure with good functional capacity',
          'Beta-blocker dose can be further optimized',
          'Patient walks 30 minutes daily without symptoms',
          'Excellent medication adherence and self-monitoring'
        ],
        allergies: ['NKDA'],
        recentHospitalizations: []
      }
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
      fullChart: {
        vitals: {
          bp: '98/62',
          hr: 110,
          temp: 99.2,
          o2sat: 89,
          weight: 162.8
        },
        labs: {
          creatinine: 2.1,
          bun: 58,
          sodium: 132,
          potassium: 4.8,
          hemoglobin: 9.8,
          bnp: 3850
        },
        medications: [
          { name: 'Carvedilol', dose: '12.5mg', frequency: 'BID', adherence: 82 },
          { name: 'Lisinopril', dose: '5mg', frequency: 'Daily', adherence: 85 },
          { name: 'Torsemide', dose: '80mg', frequency: 'BID', adherence: 90 },
          { name: 'Digoxin', dose: '0.125mg', frequency: 'Daily', adherence: 88 }
        ],
        provider: {
          attending: 'Dr. Martinez',
          resident: 'Dr. Wilson',
          nurse: 'Angela Davis, RN',
          coordinator: 'Michael Brown, NP'
        },
        notes: [
          'Advanced heart failure with frequent hospitalizations',
          'Refractory to standard medical therapy',
          'Candidate for advanced heart failure interventions',
          'Family meeting scheduled to discuss options'
        ],
        allergies: ['Penicillin'],
        recentHospitalizations: [
          { date: '2025-10-05', reason: 'Cardiogenic shock', los: 8 },
          { date: '2025-08-18', reason: 'Acute decompensated HF', los: 12 },
          { date: '2025-06-10', reason: 'HF exacerbation', los: 5 }
        ]
      }
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
      fullChart: {
        vitals: {
          bp: '142/88',
          hr: 72,
          temp: 98.1,
          o2sat: 98,
          weight: 201.5
        },
        labs: {
          creatinine: 0.9,
          bun: 18,
          sodium: 142,
          potassium: 4.1,
          hemoglobin: 14.2,
          bnp: 180,
          hba1c: 5.8
        },
        medications: [
          { name: 'Amlodipine', dose: '5mg', frequency: 'Daily', adherence: 94 },
          { name: 'Losartan', dose: '50mg', frequency: 'Daily', adherence: 96 },
          { name: 'HCTZ', dose: '25mg', frequency: 'Daily', adherence: 91 },
          { name: 'Multivitamin', dose: '1 tablet', frequency: 'Daily', adherence: 88 }
        ],
        provider: {
          attending: 'Dr. Foster',
          nurse: 'Patricia Lee, RN'
        },
        notes: [
          'Stable heart failure with preserved ejection fraction',
          'Well-controlled blood pressure and diabetes',
          'Regular exercise and diet compliance',
          'Annual monitoring appropriate'
        ],
        allergies: ['NKDA'],
        recentHospitalizations: []
      }
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
      fullChart: {
        vitals: {
          bp: '108/68',
          hr: 58,
          temp: 98.8,
          o2sat: 95,
          weight: 156.3
        },
        labs: {
          creatinine: 1.6,
          bun: 42,
          sodium: 139,
          potassium: 4.6,
          hemoglobin: 10.9,
          bnp: 890
        },
        medications: [
          { name: 'Diltiazem', dose: '120mg', frequency: 'Daily', adherence: 89 },
          { name: 'Lisinopril', dose: '2.5mg', frequency: 'Daily', adherence: 91 },
          { name: 'Furosemide', dose: '20mg', frequency: 'Daily', adherence: 94 },
          { name: 'Warfarin', dose: '2mg', frequency: 'Daily', adherence: 96 }
        ],
        provider: {
          attending: 'Dr. Park',
          nurse: 'Susan Garcia, RN',
          coordinator: 'David Kim, NP'
        },
        notes: [
          'Elderly patient with multiple comorbidities',
          'Beta-blocker intolerance due to bradycardia',
          'Cautious approach to GDMT optimization',
          'Fall risk assessment completed'
        ],
        allergies: ['Beta-blockers', 'NSAIDs'],
        recentHospitalizations: [
          { date: '2025-08-05', reason: 'HF exacerbation', los: 3 }
        ]
      }
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

              {/* GDMT 4-Pillar Status */}
              {patient.fullChart?.gdmt && (
                <div className="mb-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedGDMT(expandedGDMT === patient.id ? null : patient.id);
                    }}
                    className="w-full flex items-center justify-between mb-2 p-2 rounded-lg hover:bg-steel-50 transition-colors"
                  >
                    <div className="text-sm font-semibold text-steel-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-medical-blue-600" />
                      GDMT 4-Pillar Status
                      {expandedGDMT === patient.id ? (
                        <ChevronUp className="w-4 h-4 text-steel-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-steel-500" />
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getGDMTScoreColor(patient.fullChart.gdmt.overallScore)}`}>
                      {patient.fullChart.gdmt.overallScore}%
                    </span>
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(patient.fullChart.gdmt.pillars).map(([pillar, data]) => (
                      <div key={pillar} className={`p-2 rounded border text-center ${getGDMTStatusColor(data.status)}`}>
                        <div className="flex items-center justify-center mb-1">
                          {getGDMTStatusIcon(data.status)}
                        </div>
                        <div className="text-xs font-medium">
                          {pillar === 'arni' ? 'ARNi' : 
                           pillar === 'betaBlocker' ? 'BB' :
                           pillar === 'sglt2i' ? 'SGLT2i' :
                           pillar === 'mra' ? 'MRA' : pillar}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded GDMT Details */}
                  {expandedGDMT === patient.id && (
                    <div className="mt-4 p-4 bg-steel-50 rounded-lg border border-steel-200">
                      <div className="space-y-4">
                        {Object.entries(patient.fullChart.gdmt.pillars).map(([pillar, data]) => (
                          <div key={pillar} className="bg-white rounded-lg p-4 border border-steel-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-medical-blue-600" />
                                <h4 className="font-semibold text-steel-900">
                                  {pillar === 'arni' ? 'ARNi/ACE-I/ARB' : 
                                   pillar === 'betaBlocker' ? 'Beta Blocker' :
                                   pillar === 'sglt2i' ? 'SGLT2 Inhibitor' :
                                   pillar === 'mra' ? 'Mineralocorticoid Receptor Antagonist' : pillar}
                                </h4>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                data.status === 'optimal' ? 'bg-medical-green-100 text-medical-green-700' :
                                data.status === 'suboptimal' ? 'bg-medical-amber-100 text-medical-amber-700' :
                                data.status === 'not_started' ? 'bg-medical-red-100 text-medical-red-700' :
                                'bg-steel-100 text-steel-600'
                              }`}>
                                {data.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {data.currentDrug && (
                                <div>
                                  <span className="text-steel-600">Current:</span>
                                  <div className="font-semibold text-steel-900">{data.currentDrug} {data.currentDose}</div>
                                </div>
                              )}
                              
                              {data.targetDose && (
                                <div>
                                  <span className="text-steel-600">Target:</span>
                                  <div className="font-semibold text-medical-blue-900">{data.targetDose}</div>
                                </div>
                              )}

                              {data.reason && (
                                <div className="md:col-span-2">
                                  <span className="text-steel-600">Clinical Note:</span>
                                  <div className="text-steel-800">{data.reason}</div>
                                </div>
                              )}

                              {data.nextAction && (
                                <div className="md:col-span-2">
                                  <span className="text-steel-600">Next Action:</span>
                                  <div className="font-semibold text-medical-green-900">{data.nextAction}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* GDMT Optimization Opportunities */}
                        {patient.fullChart.gdmt.opportunities && (
                          <div className="bg-medical-blue-50 rounded-lg p-4 border border-medical-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity className="w-4 h-4 text-medical-blue-600" />
                              <h4 className="font-semibold text-medical-blue-900">Optimization Opportunities</h4>
                            </div>
                            <div className="space-y-2">
                              {patient.fullChart.gdmt.opportunities.map((opportunity, index) => (
                                <div key={index} className="flex items-start justify-between p-3 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-semibold text-steel-900 mb-1">{opportunity.pillar} Enhancement</div>
                                    <div className="text-sm text-steel-700">{opportunity.action}</div>
                                  </div>
                                  <div className="ml-4 text-right">
                                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                      opportunity.priority === 'high' ? 'bg-medical-red-100 text-medical-red-700' :
                                      opportunity.priority === 'medium' ? 'bg-medical-amber-100 text-medical-amber-700' :
                                      'bg-medical-green-100 text-medical-green-700'
                                    }`}>
                                      {opportunity.priority.toUpperCase()}
                                    </div>
                                    <div className="text-xs text-steel-600 mt-1">{opportunity.timeframe}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Opening chart for patient:', patient.name, patient.mrn, 'Priority:', patient.priority);
                    alert('Open Patient Chart\n\nThis would open the complete electronic health record for ' + patient.name + '.\n\n• Full medical history and timeline\n• Complete lab results and trends\n• All medications and dosing history\n• Provider notes and assessments\n• Imaging and diagnostic reports\n• Care plan and progress tracking\n\nTODO: Integrate with EHR system for seamless chart access');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors"
                >
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