import React, { useState } from 'react';
import { Send, CheckCircle, Clock, XCircle, AlertTriangle, User, Calendar, MapPin, MessageCircle, ExternalLink, X, Heart, Thermometer, Droplets, Shield, Pill, FileText, Activity } from 'lucide-react';

interface Referral {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  referralType: string;
  targetSpecialty: string;
  targetProvider?: string;
  indication: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  sentDate: string;
  scheduledDate?: string;
  completedDate?: string;
  sentBy: string;
  priority: 'urgent' | 'routine';
  notes?: string;
  expectedOutcome: string;
  estimatedCost?: number;
  insuranceStatus: 'approved' | 'pending' | 'denied' | 'not_required';
  followUpRequired: boolean;
  clinicalContext: {
    lvef?: number;
    nyhaClass?: string;
    primaryDiagnosis: string;
    comorbidities: string[];
  };
}

interface PatientInfo {
  mrn: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  fullChart: {
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
    }[];
    provider: {
      attending: string;
      resident?: string;
      nurse: string;
    };
    notes: string[];
    allergies: string[];
    referralHistory: {
      date: string;
      specialty: string;
      provider: string;
      outcome: string;
    }[];
  };
}

const ReferralTrackerEnhanced: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);

  const referrals: Referral[] = [
    {
      id: 'REF001',
      patientName: 'Johnson, Maria',
      mrn: '123456789',
      age: 67,
      referralType: 'CRT-D Evaluation',
      targetSpecialty: 'Electrophysiology',
      targetProvider: 'Dr. Anderson',
      indication: 'EF 28%, NYHA III, QRS 152ms, LBBB, optimal GDMT',
      status: 'scheduled',
      sentDate: '2025-10-05',
      scheduledDate: '2025-10-25',
      sentBy: 'Dr. Rivera',
      priority: 'urgent',
      expectedOutcome: 'CRT-D implantation if anatomically feasible',
      estimatedCost: 85000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 28,
        nyhaClass: 'III',
        primaryDiagnosis: 'Ischemic cardiomyopathy',
        comorbidities: ['Diabetes mellitus', 'Chronic kidney disease stage 3'],
      },
    },
    {
      id: 'REF002',
      patientName: 'Williams, Robert',
      mrn: '987654321',
      age: 72,
      referralType: 'Cardiac Amyloidosis Workup',
      targetSpecialty: 'Advanced Heart Failure',
      targetProvider: 'Dr. Martinez',
      indication: 'Amyloid risk flags: age >65, unexplained LVH, neuropathy, low voltage ECG',
      status: 'pending',
      sentDate: '2025-10-08',
      sentBy: 'Dr. Chen',
      priority: 'routine',
      expectedOutcome: 'Rule out cardiac amyloidosis, optimize therapy',
      estimatedCost: 12000,
      insuranceStatus: 'pending',
      followUpRequired: true,
      clinicalContext: {
        lvef: 45,
        nyhaClass: 'II',
        primaryDiagnosis: 'Heart failure with preserved ejection fraction',
        comorbidities: ['Peripheral neuropathy', 'Bilateral carpal tunnel syndrome'],
      },
    },
    {
      id: 'REF003',
      patientName: 'Davis, Linda',
      mrn: '456789123',
      age: 58,
      referralType: 'LVAD Evaluation',
      targetSpecialty: 'Cardiac Surgery',
      targetProvider: 'Dr. Thompson',
      indication: 'EF 22%, NYHA IV, inotrope-dependent, transplant candidate',
      status: 'overdue',
      sentDate: '2025-09-28',
      sentBy: 'Dr. Martinez',
      priority: 'urgent',
      notes: 'Patient initially declined evaluation, family now supportive',
      expectedOutcome: 'Bridge to transplant vs destination therapy LVAD',
      estimatedCost: 150000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 22,
        nyhaClass: 'IV',
        primaryDiagnosis: 'Non-ischemic cardiomyopathy',
        comorbidities: ['Pulmonary hypertension', 'Chronic kidney disease stage 4'],
      },
    },
    {
      id: 'REF004',
      patientName: 'Brown, Charles',
      mrn: '789123456',
      age: 45,
      referralType: 'Genetic Testing & Counseling',
      targetSpecialty: 'Medical Genetics',
      targetProvider: 'Dr. Wilson',
      indication: 'HCM phenotype, strong family history, age <50',
      status: 'completed',
      sentDate: '2025-09-15',
      scheduledDate: '2025-09-25',
      completedDate: '2025-10-02',
      sentBy: 'Dr. Foster',
      priority: 'routine',
      expectedOutcome: 'Genetic counseling and cascade screening',
      estimatedCost: 3500,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 60,
        nyhaClass: 'I',
        primaryDiagnosis: 'Hypertrophic cardiomyopathy',
        comorbidities: ['Family history of sudden cardiac death'],
      },
    },
    {
      id: 'REF005',
      patientName: 'Anderson, Sarah',
      mrn: '321654987',
      age: 81,
      referralType: 'CardioMEMS Evaluation',
      targetSpecialty: 'Interventional Cardiology',
      targetProvider: 'Dr. Park',
      indication: 'Recurrent HF hospitalizations, NYHA III despite optimal therapy',
      status: 'scheduled',
      sentDate: '2025-10-12',
      scheduledDate: '2025-10-28',
      sentBy: 'Dr. Park',
      priority: 'routine',
      expectedOutcome: 'Remote hemodynamic monitoring to reduce hospitalizations',
      estimatedCost: 25000,
      insuranceStatus: 'approved',
      followUpRequired: true,
      clinicalContext: {
        lvef: 31,
        nyhaClass: 'III',
        primaryDiagnosis: 'Heart failure with reduced ejection fraction',
        comorbidities: ['Atrial fibrillation', 'Chronic kidney disease stage 3'],
      },
    },
  ];

  // Mock patient data for referral context
  const patientDatabase: PatientInfo[] = [
    {
      mrn: '123456789',
      name: 'Johnson, Maria',
      age: 67,
      gender: 'F',
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
          bnp: 2400,
          hba1c: 8.1
        },
        medications: [
          { name: 'Carvedilol', dose: '25mg', frequency: 'BID' },
          { name: 'Lisinopril', dose: '20mg', frequency: 'Daily' },
          { name: 'Spironolactone', dose: '12.5mg', frequency: 'Daily' },
          { name: 'Furosemide', dose: '40mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Rivera',
          resident: 'Dr. Thompson',
          nurse: 'Maria Santos, RN'
        },
        notes: [
          'CRT-D evaluation scheduled for optimal heart failure management',
          'Patient reports increased dyspnea with minimal exertion',
          'QRS 152ms with LBBB morphology - strong CRT candidate',
          'Insurance approval obtained for device therapy'
        ],
        allergies: ['Sulfa drugs'],
        referralHistory: [
          { date: '2025-10-05', specialty: 'Electrophysiology', provider: 'Dr. Anderson', outcome: 'CRT-D evaluation pending' },
          { date: '2025-08-15', specialty: 'Endocrinology', provider: 'Dr. Davis', outcome: 'Diabetes management optimized' }
        ]
      }
    },
    {
      mrn: '987654321',
      name: 'Williams, Robert',
      age: 72,
      gender: 'M',
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
          { name: 'Metoprolol XL', dose: '50mg', frequency: 'Daily' },
          { name: 'Lisinopril', dose: '10mg', frequency: 'Daily' },
          { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily' },
          { name: 'Aspirin', dose: '81mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Chen',
          nurse: 'Robert Kim, RN'
        },
        notes: [
          'Cardiac amyloidosis workup in progress',
          'Red flags: age >65, unexplained LVH, peripheral neuropathy',
          'Stable heart failure with preserved ejection fraction',
          'Awaiting technetium pyrophosphate scan results'
        ],
        allergies: ['NKDA'],
        referralHistory: [
          { date: '2025-10-08', specialty: 'Advanced Heart Failure', provider: 'Dr. Martinez', outcome: 'Amyloid workup initiated' },
          { date: '2025-07-20', specialty: 'Neurology', provider: 'Dr. Wilson', outcome: 'Neuropathy evaluation completed' }
        ]
      }
    },
    {
      mrn: '456789123',
      name: 'Davis, Linda',
      age: 58,
      gender: 'F',
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
          potassium: 5.1,
          hemoglobin: 9.8,
          bnp: 3850
        },
        medications: [
          { name: 'Carvedilol', dose: '12.5mg', frequency: 'BID' },
          { name: 'Lisinopril', dose: '5mg', frequency: 'Daily' },
          { name: 'Torsemide', dose: '80mg', frequency: 'BID' },
          { name: 'Digoxin', dose: '0.125mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Martinez',
          resident: 'Dr. Wilson',
          nurse: 'Angela Davis, RN'
        },
        notes: [
          'Advanced heart failure - LVAD evaluation urgent',
          'Inotrope-dependent, transplant candidate',
          'Family initially declined evaluation but now supportive',
          'Bridge to transplant vs destination therapy assessment needed'
        ],
        allergies: ['Penicillin'],
        referralHistory: [
          { date: '2025-09-28', specialty: 'Cardiac Surgery', provider: 'Dr. Thompson', outcome: 'LVAD evaluation overdue' },
          { date: '2025-08-10', specialty: 'Nephrology', provider: 'Dr. Lopez', outcome: 'CKD stage 4 management' }
        ]
      }
    },
    {
      mrn: '789123456',
      name: 'Brown, Charles',
      age: 45,
      gender: 'M',
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
          bnp: 180
        },
        medications: [
          { name: 'Amlodipine', dose: '5mg', frequency: 'Daily' },
          { name: 'Losartan', dose: '50mg', frequency: 'Daily' },
          { name: 'HCTZ', dose: '25mg', frequency: 'Daily' },
          { name: 'Multivitamin', dose: '1 tablet', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Foster',
          nurse: 'Patricia Lee, RN'
        },
        notes: [
          'Hypertrophic cardiomyopathy with strong family history',
          'Genetic testing and counseling completed',
          'Age <50 with HCM phenotype - high genetic yield',
          'Cascade screening recommended for family members'
        ],
        allergies: ['NKDA'],
        referralHistory: [
          { date: '2025-09-15', specialty: 'Medical Genetics', provider: 'Dr. Wilson', outcome: 'Genetic counseling completed' },
          { date: '2025-07-05', specialty: 'Sports Medicine', provider: 'Dr. Taylor', outcome: 'Exercise restrictions discussed' }
        ]
      }
    },
    {
      mrn: '321654987',
      name: 'Anderson, Sarah',
      age: 81,
      gender: 'F',
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
          { name: 'Diltiazem', dose: '120mg', frequency: 'Daily' },
          { name: 'Lisinopril', dose: '2.5mg', frequency: 'Daily' },
          { name: 'Furosemide', dose: '20mg', frequency: 'Daily' },
          { name: 'Warfarin', dose: '2mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Park',
          nurse: 'Susan Garcia, RN'
        },
        notes: [
          'CardioMEMS evaluation for recurrent HF hospitalizations',
          'Elderly patient with multiple comorbidities',
          'Remote monitoring may reduce hospital readmissions',
          'Insurance approval obtained for hemodynamic monitoring'
        ],
        allergies: ['Beta-blockers', 'NSAIDs'],
        referralHistory: [
          { date: '2025-10-12', specialty: 'Interventional Cardiology', provider: 'Dr. Park', outcome: 'CardioMEMS evaluation scheduled' },
          { date: '2025-09-01', specialty: 'Geriatrics', provider: 'Dr. Brown', outcome: 'Comprehensive geriatric assessment' }
        ]
      }
    }
  ];

  // Function to get patient data by MRN
  const getPatientByMRN = (mrn: string): PatientInfo | undefined => {
    return patientDatabase.find(patient => patient.mrn === mrn);
  };

  // Function to open patient chart
  const openPatientChart = (mrn: string) => {
    const patient = getPatientByMRN(mrn);
    if (patient) {
      setSelectedPatient(patient);
      setShowPatientPanel(true);
    }
  };

  const filteredReferrals = referrals.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-5 h-5 text-medical-amber-600" />,
      scheduled: <Calendar className="w-5 h-5 text-medical-blue-600" />,
      completed: <CheckCircle className="w-5 h-5 text-medical-green-600" />,
      cancelled: <XCircle className="w-5 h-5 text-steel-500" />,
      overdue: <AlertTriangle className="w-5 h-5 text-medical-red-600" />
    };
    return icons[status as keyof typeof icons];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-medical-amber-50 text-medical-amber-800 border-medical-amber-200',
      scheduled: 'bg-medical-blue-50 text-medical-blue-800 border-medical-blue-200',
      completed: 'bg-medical-green-50 text-medical-green-800 border-medical-green-200',
      cancelled: 'bg-steel-100 text-steel-700 border-steel-300',
      overdue: 'bg-medical-red-50 text-medical-red-800 border-medical-red-200'
    };
    return colors[status as keyof typeof colors];
  };

  const getInsuranceColor = (status: string) => {
    const colors = {
      approved: 'text-medical-green-600 bg-medical-green-100',
      pending: 'text-medical-amber-600 bg-medical-amber-100',
      denied: 'text-medical-red-600 bg-medical-red-100',
      not_required: 'text-steel-600 bg-steel-100',
    };
    return colors[status as keyof typeof colors];
  };

  const statusCounts = {
    all: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    scheduled: referrals.filter(r => r.status === 'scheduled').length,
    overdue: referrals.filter(r => r.status === 'overdue').length,
    completed: referrals.filter(r => r.status === 'completed').length
  };

  const urgentCount = referrals.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;
  const totalCost = filteredReferrals.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Referral Management Center
          </h2>
          <p className="text-steel-600">
            Track specialist referrals and coordinate care transitions
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Urgent Referrals</div>
          <div className="text-3xl font-bold text-medical-red-600 font-sf">
            {urgentCount}
          </div>
          <div className="text-sm text-steel-600">Need immediate attention</div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all', label: 'Total', count: statusCounts.all, color: 'steel' },
          { key: 'pending', label: 'Pending', count: statusCounts.pending, color: 'medical-amber' },
          { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled, color: 'medical-blue' },
          { key: 'overdue', label: 'Overdue', count: statusCounts.overdue, color: 'medical-red' },
          { key: 'completed', label: 'Completed', count: statusCounts.completed, color: 'medical-green' }
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              filterStatus === key
                ? `border-${color}-400 bg-${color}-50 shadow-retina-3`
                : 'border-steel-200 bg-white hover:border-steel-300 hover:shadow-retina-2'
            }`}
          >
            <div className={`text-3xl font-bold mb-1 font-sf ${
              filterStatus === key ? `text-${color}-600` : 'text-steel-900'
            }`}>
              {count}
            </div>
            <div className={`text-sm font-medium ${
              filterStatus === key ? `text-${color}-700` : 'text-steel-600'
            }`}>
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 p-4 bg-steel-50 rounded-xl border border-steel-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-steel-700">Filters:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent Only</option>
            <option value="routine">Routine Only</option>
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm text-steel-600">
          <div>Total Estimated Cost: <span className="font-bold text-steel-900">${totalCost.toLocaleString()}</span></div>
          <div>Showing {filteredReferrals.length} of {referrals.length} referrals</div>
        </div>
      </div>

      {/* Referral Cards */}
      <div className="space-y-4">
        {filteredReferrals.map((referral) => (
          <div
            key={referral.id}
            className={`retina-card border-l-4 transition-all duration-300 hover:shadow-retina-3 cursor-pointer ${
              referral.status === 'overdue' ? 'border-l-medical-red-400' :
              referral.priority === 'urgent' ? 'border-l-medical-amber-400' :
              'border-l-medical-blue-400'
            }`}
            onClick={() => setSelectedReferral(selectedReferral?.id === referral.id ? null : referral)}
          >
            <div className="p-5">
              {/* Referral Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-medical-blue-100">
                    {getStatusIcon(referral.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 
                        className="text-lg font-bold text-steel-900 cursor-pointer hover:text-medical-blue-600 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPatientChart(referral.mrn);
                        }}
                      >
                        {referral.patientName}
                        <ExternalLink className="w-4 h-4" />
                      </h3>
                      <span className="text-sm text-steel-600">Age {referral.age}</span>
                      <span 
                        className="text-sm text-steel-600 cursor-pointer hover:text-medical-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPatientChart(referral.mrn);
                        }}
                      >
                        MRN: {referral.mrn}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-steel-700">{referral.referralType}</span>
                      <span className="text-sm text-steel-500">→</span>
                      <span className="text-sm text-steel-700">{referral.targetSpecialty}</span>
                      {referral.targetProvider && (
                        <>
                          <span className="text-sm text-steel-500">•</span>
                          <span className="text-sm text-steel-700">{referral.targetProvider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {referral.priority === 'urgent' && (
                    <span className="px-3 py-1 bg-medical-red-100 text-medical-red-800 text-sm font-semibold rounded-lg">
                      URGENT
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm font-semibold rounded-lg border ${getStatusColor(referral.status)}`}>
                    {referral.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-steel-50 rounded-xl">
                <div>
                  <div className="text-xs text-steel-600 mb-1">Clinical Indication</div>
                  <div className="text-sm text-steel-800 font-medium">{referral.indication}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Expected Outcome</div>
                  <div className="text-sm text-steel-800">{referral.expectedOutcome}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Estimated Cost</div>
                  <div className="text-sm font-bold text-steel-900">
                    {referral.estimatedCost ? `$${referral.estimatedCost.toLocaleString()}` : 'TBD'}
                  </div>
                </div>
              </div>

              {/* Timeline and Status */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600 mb-1">Sent Date</div>
                  <div className="font-medium text-steel-900">
                    {new Date(referral.sentDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-steel-500">by {referral.sentBy}</div>
                </div>
                {referral.scheduledDate && (
                  <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                    <div className="text-sm text-steel-600 mb-1">Scheduled</div>
                    <div className="font-medium text-medical-blue-700">
                      {new Date(referral.scheduledDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {referral.completedDate && (
                  <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                    <div className="text-sm text-steel-600 mb-1">Completed</div>
                    <div className="font-medium text-medical-green-700">
                      {new Date(referral.completedDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div className="text-center p-3 bg-white rounded-lg border border-steel-200">
                  <div className="text-sm text-steel-600 mb-1">Insurance</div>
                  <div className={`text-sm font-semibold px-2 py-1 rounded ${getInsuranceColor(referral.insuranceStatus)}`}>
                    {referral.insuranceStatus.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedReferral?.id === referral.id && (
                <div className="mt-4 p-4 bg-medical-blue-50/50 rounded-xl border border-medical-blue-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Clinical Context</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-steel-600">Primary Diagnosis:</span>
                          <span className="text-sm font-medium text-steel-800">
                            {referral.clinicalContext.primaryDiagnosis}
                          </span>
                        </div>
                        {referral.clinicalContext.lvef && (
                          <div className="flex justify-between">
                            <span className="text-sm text-steel-600">LVEF:</span>
                            <span className="text-sm font-medium text-steel-800">
                              {referral.clinicalContext.lvef}%
                            </span>
                          </div>
                        )}
                        {referral.clinicalContext.nyhaClass && (
                          <div className="flex justify-between">
                            <span className="text-sm text-steel-600">NYHA Class:</span>
                            <span className="text-sm font-medium text-steel-800">
                              {referral.clinicalContext.nyhaClass}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-steel-600 mb-1">Comorbidities:</div>
                          <div className="space-y-1">
                            {referral.clinicalContext.comorbidities.map((condition, index) => (
                              <div key={index} className="text-sm text-steel-800 bg-white px-2 py-1 rounded border">
                                {condition}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Next Steps</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-medical-green-600" />
                          <span className="text-sm text-steel-800">Follow-up required: {referral.followUpRequired ? 'Yes' : 'No'}</span>
                        </div>
                        {referral.notes && (
                          <div className="mt-3">
                            <div className="text-sm text-steel-600 mb-1">Notes:</div>
                            <div className="text-sm text-steel-800 bg-medical-amber-50 p-3 rounded border border-medical-amber-200">
                              {referral.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-steel-200">
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Follow Up
                  </button>
                  {referral.status === 'pending' && (
                    <button className="px-4 py-2 bg-medical-green-100 text-medical-green-800 text-sm rounded-lg hover:bg-medical-green-200 transition-colors border border-medical-green-300">
                      Mark Scheduled
                    </button>
                  )}
                  {referral.status === 'scheduled' && (
                    <button className="px-4 py-2 bg-medical-amber-100 text-medical-amber-800 text-sm rounded-lg hover:bg-medical-amber-200 transition-colors border border-medical-amber-300">
                      Send Reminder
                    </button>
                  )}
                </div>
                <div className="text-sm text-steel-600">
                  {referral.followUpRequired && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
                      Follow-up required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Detail Side Panel */}
      {showPatientPanel && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-1/2 h-full overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-gray-600">
                    MRN: {selectedPatient.mrn} | Age: {selectedPatient.age}{selectedPatient.gender}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPatientPanel(false);
                    setSelectedPatient(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Vital Signs */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  Current Vital Signs
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Blood Pressure</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.bp} mmHg</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Heart Rate</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.hr} bpm</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Temperature</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.temp}°F</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">O2 Saturation</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.o2sat}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Weight</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.weight} lbs</p>
                  </div>
                </div>
              </div>

              {/* Laboratory Results */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-green-600" />
                  Laboratory Results
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Creatinine</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.creatinine} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">BUN</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.bun} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Sodium</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.sodium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Potassium</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.potassium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hemoglobin</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.hemoglobin} g/dL</p>
                  </div>
                  {selectedPatient.fullChart.labs.bnp && (
                    <div>
                      <span className="text-sm text-gray-600">BNP</span>
                      <p className="font-medium">{selectedPatient.fullChart.labs.bnp} pg/mL</p>
                    </div>
                  )}
                  {selectedPatient.fullChart.labs.hba1c && (
                    <div>
                      <span className="text-sm text-gray-600">HbA1c</span>
                      <p className="font-medium">{selectedPatient.fullChart.labs.hba1c}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Medications */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  Current Medications
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                      <span className="font-medium">{med.name}</span>
                      <span className="text-sm text-gray-600">{med.dose} {med.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Care Team */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Care Team
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attending Physician</span>
                    <span className="font-medium">{selectedPatient.fullChart.provider.attending}</span>
                  </div>
                  {selectedPatient.fullChart.provider.resident && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resident</span>
                      <span className="font-medium">{selectedPatient.fullChart.provider.resident}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Nurse</span>
                    <span className="font-medium">{selectedPatient.fullChart.provider.nurse}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  Recent Clinical Notes
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.notes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Activity className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Allergies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.fullChart.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>

              {/* Referral History */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Referral History
                </h3>
                <div className="space-y-3">
                  {selectedPatient.fullChart.referralHistory.map((referral, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900">{referral.specialty}</span>
                        <span className="text-xs text-gray-500">{new Date(referral.date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">Provider: {referral.provider}</div>
                      <div className="text-sm text-gray-700">{referral.outcome}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button className="flex-1 px-4 py-3 bg-medical-blue-600 text-white rounded-lg font-medium hover:bg-medical-blue-700 transition-colors">
                  <Send className="w-4 h-4 inline mr-2" />
                  Create New Referral
                </button>
                <button
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowPatientPanel(false);
                    setSelectedPatient(null);
                  }}
                >
                  Close Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralTrackerEnhanced;