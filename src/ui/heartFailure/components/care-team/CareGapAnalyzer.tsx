import React, { useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, CheckCircle, Users, Calendar, ArrowRight, ExternalLink, X, Heart, Thermometer, Droplets, Shield, Pill, FileText, Activity, ChevronRight } from 'lucide-react';

interface PatientInfo {
  mrn: string;
  name: string;
  age: number;
  ef: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  admissionDate?: string;
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
      bnp: number;
    };
    medications: {
      name: string;
      dose: string;
      frequency: string;
      adherence: number;
    }[];
    careTeam: {
      attending: string;
      resident?: string;
      nurse: string;
      pharmacist: string;
    };
    notes: string[];
    allergies: string[];
    recentHospitalizations: {
      date: string;
      reason: string;
      los: number;
    }[];
    careGaps: string[];
  };
}

interface CareGap {
  id: string;
  category: 'GDMT' | 'Device' | 'Screening' | 'Follow-up' | 'Lab' | 'Lifestyle';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'routine';
  affectedPatients: number;
  potentialOutcome: string;
  actionRequired: string;
  estimatedTimeToClose: string;
  assignedTo?: string;
  dueDate: string;
  evidenceLevel: 'Class I' | 'Class IIa' | 'Class IIb' | 'Class III';
  costSavings?: number;
  qualityMeasure?: string;
  barriers: string[];
  recommendations: {
    action: string;
    timeline: string;
    responsibility: string;
  }[];
}

interface CareGapSummary {
  totalGaps: number;
  highImpact: number;
  urgent: number;
  avgClosureTime: number;
  totalPotentialSavings: number;
  complianceRate: number;
}

// Mock patient database with care gap information
const CARE_GAP_PATIENTS: PatientInfo[] = [
  {
    mrn: 'HF-2024-001',
    name: 'Margaret Thompson',
    age: 67,
    ef: 35,
    nyhaClass: 'III',
    fullChart: {
      vitals: { bp: '148/92', hr: 88, temp: 98.6, o2sat: 94, weight: 175 },
      labs: { creatinine: 1.4, bun: 32, sodium: 138, potassium: 4.2, hemoglobin: 11.8, bnp: 450 },
      medications: [
        { name: 'Lisinopril', dose: '10mg', frequency: 'Daily', adherence: 85 },
        { name: 'Metoprolol', dose: '25mg', frequency: 'BID', adherence: 90 },
        { name: 'Furosemide', dose: '40mg', frequency: 'Daily', adherence: 78 }
      ],
      careTeam: { attending: 'Dr. Sarah Chen', nurse: 'RN Kelly Martinez', pharmacist: 'PharmD Alex Kim' },
      notes: ['Patient reports occasional chest tightness', 'ACE inhibitor not optimized', 'Beta-blocker needs titration'],
      allergies: ['Penicillin', 'Shellfish'],
      recentHospitalizations: [
        { date: '2024-09-15', reason: 'HF exacerbation', los: 4 }
      ],
      careGaps: ['SGLT2i Underutilization', 'ACE/ARB Optimization', 'Beta-blocker Titration']
    }
  },
  {
    mrn: 'HF-2024-002',
    name: 'Robert Martinez',
    age: 72,
    ef: 28,
    nyhaClass: 'II',
    fullChart: {
      vitals: { bp: '132/78', hr: 72, temp: 98.4, o2sat: 96, weight: 185 },
      labs: { creatinine: 1.8, bun: 45, sodium: 135, potassium: 3.8, hemoglobin: 12.1, bnp: 320 },
      medications: [
        { name: 'Enalapril', dose: '5mg', frequency: 'BID', adherence: 92 },
        { name: 'Carvedilol', dose: '6.25mg', frequency: 'BID', adherence: 88 },
        { name: 'Spironolactone', dose: '25mg', frequency: 'Daily', adherence: 85 }
      ],
      careTeam: { attending: 'Dr. Michael Chen', resident: 'Dr. Lisa Park', nurse: 'RN David Rodriguez', pharmacist: 'PharmD Maria Garcia' },
      notes: ['Stable HF patient', 'Kidney function monitoring needed', 'Good medication adherence'],
      allergies: ['Sulfa drugs'],
      recentHospitalizations: [],
      careGaps: ['SGLT2i Underutilization', 'BNP Monitoring Compliance']
    }
  },
  {
    mrn: 'HF-2024-003',
    name: 'Linda Wilson',
    age: 58,
    ef: 42,
    nyhaClass: 'II',
    fullChart: {
      vitals: { bp: '156/94', hr: 95, temp: 98.2, o2sat: 97, weight: 162 },
      labs: { creatinine: 1.1, bun: 28, sodium: 140, potassium: 4.5, hemoglobin: 13.2, bnp: 180 },
      medications: [
        { name: 'Losartan', dose: '50mg', frequency: 'Daily', adherence: 75 },
        { name: 'Metoprolol', dose: '50mg', frequency: 'BID', adherence: 80 }
      ],
      careTeam: { attending: 'Dr. Jennifer Lee', nurse: 'RN Amanda Johnson', pharmacist: 'PharmD Robert Smith' },
      notes: ['Medication adherence concerns', 'BP not at target', 'Patient education needed'],
      allergies: ['Latex'],
      recentHospitalizations: [
        { date: '2024-08-22', reason: 'Hypertensive crisis', los: 2 }
      ],
      careGaps: ['Post-Discharge Follow-up Gaps', 'BNP Monitoring Compliance']
    }
  },
  {
    mrn: 'HF-2024-004',
    name: 'James Anderson',
    age: 81,
    ef: 31,
    nyhaClass: 'III',
    fullChart: {
      vitals: { bp: '118/68', hr: 68, temp: 97.8, o2sat: 92, weight: 190 },
      labs: { creatinine: 2.1, bun: 58, sodium: 133, potassium: 4.8, hemoglobin: 10.5, bnp: 680 },
      medications: [
        { name: 'Captopril', dose: '25mg', frequency: 'TID', adherence: 88 },
        { name: 'Bisoprolol', dose: '2.5mg', frequency: 'Daily', adherence: 92 }
      ],
      careTeam: { attending: 'Dr. Patricia Wong', nurse: 'RN Mark Thompson', pharmacist: 'PharmD Sarah Lee' },
      notes: ['Advanced HF with renal dysfunction', 'Careful monitoring required', 'Consider device therapy'],
      allergies: ['None known'],
      recentHospitalizations: [
        { date: '2024-10-01', reason: 'HF exacerbation', los: 6 },
        { date: '2024-07-15', reason: 'Volume overload', los: 3 }
      ],
      careGaps: ['Delayed CRT Evaluations', 'BNP Monitoring Compliance']
    }
  },
  {
    mrn: 'HF-2024-005',
    name: 'Patricia Davis',
    age: 64,
    ef: 45,
    nyhaClass: 'I',
    fullChart: {
      vitals: { bp: '142/88', hr: 78, temp: 98.5, o2sat: 98, weight: 158 },
      labs: { creatinine: 0.9, bun: 18, sodium: 142, potassium: 4.1, hemoglobin: 12.8, bnp: 125 },
      medications: [
        { name: 'Lisinopril', dose: '20mg', frequency: 'Daily', adherence: 95 },
        { name: 'Atenolol', dose: '50mg', frequency: 'Daily', adherence: 93 }
      ],
      careTeam: { attending: 'Dr. Kevin Park', nurse: 'RN Susan Brown', pharmacist: 'PharmD Tom Wilson' },
      notes: ['Stable HFpEF patient', 'Good medication adherence', 'Regular follow-up scheduled'],
      allergies: ['Aspirin'],
      recentHospitalizations: [],
      careGaps: ['Cardiac Amyloidosis Screening', 'BNP Monitoring Compliance']
    }
  },
  {
    mrn: 'HF-2024-006',
    name: 'William Brown',
    age: 59,
    ef: 32,
    nyhaClass: 'II',
    fullChart: {
      vitals: { bp: '138/82', hr: 76, temp: 98.1, o2sat: 95, weight: 172 },
      labs: { creatinine: 1.2, bun: 24, sodium: 139, potassium: 4.3, hemoglobin: 12.5, bnp: 285 },
      medications: [
        { name: 'Valsartan', dose: '80mg', frequency: 'BID', adherence: 82 },
        { name: 'Carvedilol', dose: '12.5mg', frequency: 'BID', adherence: 88 }
      ],
      careTeam: { attending: 'Dr. Maria Rodriguez', nurse: 'RN Jennifer Walsh', pharmacist: 'PharmD Kevin Chen' },
      notes: ['Post-discharge patient', 'Missed follow-up appointment', 'Needs medication reconciliation'],
      allergies: ['Iodine'],
      recentHospitalizations: [
        { date: '2024-09-28', reason: 'Acute decompensated HF', los: 5 }
      ],
      careGaps: ['Post-Discharge Follow-up Gaps', 'BNP Monitoring Compliance']
    }
  },
  {
    mrn: 'HF-2024-007',
    name: 'Carol Johnson',
    age: 75,
    ef: 29,
    nyhaClass: 'III',
    fullChart: {
      vitals: { bp: '124/74', hr: 64, temp: 98.3, o2sat: 93, weight: 168 },
      labs: { creatinine: 1.6, bun: 38, sodium: 136, potassium: 4.6, hemoglobin: 11.2, bnp: 520 },
      medications: [
        { name: 'Lisinopril', dose: '5mg', frequency: 'Daily', adherence: 90 },
        { name: 'Metoprolol', dose: '50mg', frequency: 'BID', adherence: 85 }
      ],
      careTeam: { attending: 'Dr. Robert Kim', nurse: 'RN Michael Davis', pharmacist: 'PharmD Lisa Wang' },
      notes: ['Candidate for CRT evaluation', 'QRS duration 155ms', 'NYHA Class III symptoms'],
      allergies: ['Codeine'],
      recentHospitalizations: [
        { date: '2024-08-10', reason: 'HF hospitalization', los: 4 }
      ],
      careGaps: ['Delayed CRT Evaluations', 'SGLT2i Underutilization']
    }
  },
  {
    mrn: 'HF-2024-008',
    name: 'Frank Miller',
    age: 68,
    ef: 38,
    nyhaClass: 'II',
    fullChart: {
      vitals: { bp: '145/88', hr: 82, temp: 98.7, o2sat: 96, weight: 180 },
      labs: { creatinine: 1.3, bun: 29, sodium: 141, potassium: 4.0, hemoglobin: 12.9, bnp: 220 },
      medications: [
        { name: 'Enalapril', dose: '10mg', frequency: 'BID', adherence: 78 },
        { name: 'Atenolol', dose: '25mg', frequency: 'Daily', adherence: 82 }
      ],
      careTeam: { attending: 'Dr. Susan Taylor', nurse: 'RN Patricia Garcia', pharmacist: 'PharmD David Lee' },
      notes: ['Eligible for cardiac rehabilitation', 'Insurance approval pending', 'Patient interested'],
      allergies: ['Morphine'],
      recentHospitalizations: [],
      careGaps: ['Cardiac Rehabilitation Enrollment', 'BNP Monitoring Compliance']
    }
  }
];

const CareGapAnalyzer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGap, setSelectedGap] = useState<CareGap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'priority'>('grid');
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);
  const [showPatientList, setShowPatientList] = useState<string | null>(null);

  // GDMT Therapy Recommendations Based on Care Gaps
  const getGDMTRecommendations = (gap: string, patient: PatientInfo) => {
    const labs = patient.fullChart.labs;
    const vitals = patient.fullChart.vitals;
    const bp = parseInt(vitals.bp.split('/')[0]);
    
    switch (gap) {
      case 'SGLT2i Underutilization':
        return {
          medication: 'SGLT2 Inhibitor',
          recommendation: 'Dapagliflozin 10mg daily or Empagliflozin 10mg daily',
          rationale: 'Reduces HF hospitalizations and cardiovascular death in HFrEF',
          evidenceLevel: 'Class I, Level A',
          contraindications: labs.creatinine > 2.5 ? ['Severe renal impairment'] : [],
          monitoring: ['eGFR and electrolytes at 2-4 weeks', 'Volume status', 'Ketone monitoring if symptomatic'],
          costSavings: '$3,200/year per patient in reduced hospitalizations'
        };
      
      case 'ACE/ARB Optimization':
        return {
          medication: 'ACE Inhibitor/ARB',
          recommendation: bp > 140 ? 'Increase to maximum tolerated dose' : 'Current dose appropriate - monitor',
          rationale: 'Reduces mortality and HF progression when optimally dosed',
          evidenceLevel: 'Class I, Level A',
          contraindications: labs.potassium > 5.0 ? ['Hyperkalemia'] : [],
          monitoring: ['BP and renal function weekly during titration', 'K+ monitoring'],
          costSavings: '$1,800/year per patient'
        };
      
      case 'Beta-blocker Titration':
        return {
          medication: 'Beta-Blocker',
          recommendation: vitals.hr > 70 ? 'Increase to target HR 60-70 bpm' : 'Monitor current dose',
          rationale: 'Optimal heart rate control improves outcomes in HFrEF',
          evidenceLevel: 'Class I, Level A',
          contraindications: vitals.hr < 60 ? ['Bradycardia'] : [],
          monitoring: ['HR and BP monitoring during titration', 'Symptoms assessment'],
          costSavings: '$2,100/year per patient'
        };
      
      case 'MRA Underutilization':
        return {
          medication: 'Mineralocorticoid Receptor Antagonist',
          recommendation: 'Spironolactone 25mg daily (start 12.5mg if eGFR 30-49)',
          rationale: 'Reduces mortality in moderate to severe HFrEF',
          evidenceLevel: 'Class I, Level A',
          contraindications: labs.potassium > 5.0 || labs.creatinine > 2.5 ? ['Hyperkalemia or severe renal impairment'] : [],
          monitoring: ['K+ and creatinine at 1 week, then 1, 3, 6 months', 'Gynecomastia screening'],
          costSavings: '$2,800/year per patient'
        };
      
      default:
        return null;
    }
  };

  const openPatientChart = (mrn: string) => {
    const patient = CARE_GAP_PATIENTS.find(p => p.mrn === mrn);
    if (patient) {
      setSelectedPatient(patient);
    }
  };

  const closePatientChart = () => {
    setSelectedPatient(null);
  };

  const showPatientsForGap = (gapTitle: string) => {
    setShowPatientList(gapTitle);
  };

  const closePatientsForGap = () => {
    setShowPatientList(null);
  };

  const getPatientsForGap = (gapTitle: string) => {
    return CARE_GAP_PATIENTS.filter(patient => 
      patient.fullChart.careGaps.includes(gapTitle)
    );
  };

  const careGaps: CareGap[] = [
    {
      id: 'GAP001',
      category: 'GDMT',
      title: 'SGLT2i Underutilization',
      description: '23 patients with HFrEF not on SGLT2i therapy despite eligibility',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 23,
      potentialOutcome: '15% reduction in CV death and HF hospitalization',
      actionRequired: 'Review contraindications, initiate therapy, patient education',
      estimatedTimeToClose: '4-6 weeks',
      assignedTo: 'Dr. Chen',
      dueDate: '2025-11-01',
      evidenceLevel: 'Class I',
      costSavings: 2800000,
      qualityMeasure: 'GDMT 4-Pillar Optimization',
      barriers: ['Concern for genital infections', 'Cost concerns', 'Provider knowledge gaps'],
      recommendations: [
        {
          action: 'Provider education on SGLT2i benefits in HF',
          timeline: '1 week',
          responsibility: 'Clinical Pharmacist',
        },
        {
          action: 'Patient counseling and shared decision making',
          timeline: '2-3 weeks',
          responsibility: 'Care Team',
        },
        {
          action: 'Systematic review of eligible patients',
          timeline: '4 weeks',
          responsibility: 'NP/PA',
        },
      ],
    },
    {
      id: 'GAP002',
      category: 'Device',
      title: 'Delayed CRT Evaluations',
      description: '8 patients meeting CRT criteria without device evaluation',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 8,
      potentialOutcome: 'Improved survival, functional status, reduced hospitalizations',
      actionRequired: 'EP consultation, echo review, patient counseling',
      estimatedTimeToClose: '6-8 weeks',
      assignedTo: 'Dr. Rivera',
      dueDate: '2025-10-30',
      evidenceLevel: 'Class I',
      costSavings: 1200000,
      qualityMeasure: 'Appropriate Device Therapy',
      barriers: ['Patient reluctance', 'Insurance authorization', 'EP availability'],
      recommendations: [
        {
          action: 'Fast-track EP referrals for qualified patients',
          timeline: '1 week',
          responsibility: 'Attending Physician',
        },
        {
          action: 'Insurance pre-authorization initiation',
          timeline: '2 weeks',
          responsibility: 'Care Coordinator',
        },
        {
          action: 'Patient education on device benefits',
          timeline: 'Ongoing',
          responsibility: 'Device Nurse',
        },
      ],
    },
    {
      id: 'GAP003',
      category: 'Screening',
      title: 'Cardiac Amyloidosis Screening',
      description: '15 patients with amyloid red flags not screened',
      impact: 'medium',
      urgency: 'soon',
      affectedPatients: 15,
      potentialOutcome: 'Early detection and targeted therapy initiation',
      actionRequired: 'Technetium pyrophosphate scan, TTR genetic testing',
      estimatedTimeToClose: '8-12 weeks',
      assignedTo: 'Dr. Martinez',
      dueDate: '2025-11-15',
      evidenceLevel: 'Class IIa',
      costSavings: 950000,
      qualityMeasure: 'Phenotype Detection Rate',
      barriers: ['Limited scanner availability', 'Cost of testing', 'Subspecialty referral delays'],
      recommendations: [
        {
          action: 'Implement amyloid risk scoring in EHR',
          timeline: '2 weeks',
          responsibility: 'Clinical Informatics',
        },
        {
          action: 'Establish dedicated amyloid clinic pathway',
          timeline: '4 weeks',
          responsibility: 'Advanced HF Team',
        },
        {
          action: 'Provider education on red flag recognition',
          timeline: '3 weeks',
          responsibility: 'Medical Education',
        },
      ],
    },
    {
      id: 'GAP004',
      category: 'Follow-up',
      title: 'Post-Discharge Follow-up Gaps',
      description: '12 patients without 7-day post-discharge contact',
      impact: 'high',
      urgency: 'urgent',
      affectedPatients: 12,
      potentialOutcome: 'Reduced 30-day readmission rate',
      actionRequired: 'Systematic follow-up calls, medication reconciliation',
      estimatedTimeToClose: '2-3 weeks',
      assignedTo: 'Sarah Johnson, NP',
      dueDate: '2025-10-25',
      evidenceLevel: 'Class I',
      qualityMeasure: 'HF Readmission Rate',
      barriers: ['Staffing limitations', 'Patient contact issues', 'Workflow gaps'],
      recommendations: [
        {
          action: 'Automated discharge follow-up system',
          timeline: '1 week',
          responsibility: 'Care Management',
        },
        {
          action: 'Phone tree for patient contact',
          timeline: '3 days',
          responsibility: 'Nursing Staff',
        },
        {
          action: 'Medication adherence assessment',
          timeline: 'Within 7 days',
          responsibility: 'Clinical Pharmacist',
        },
      ],
    },
    {
      id: 'GAP005',
      category: 'Lab',
      title: 'BNP Monitoring Compliance',
      description: '28 patients overdue for BNP trending',
      impact: 'medium',
      urgency: 'soon',
      affectedPatients: 28,
      potentialOutcome: 'Improved therapy optimization and early decompensation detection',
      actionRequired: 'Laboratory orders, result review, therapy adjustment',
      estimatedTimeToClose: '3-4 weeks',
      assignedTo: 'Care Team',
      dueDate: '2025-11-08',
      evidenceLevel: 'Class IIa',
      qualityMeasure: 'Biomarker Monitoring',
      barriers: ['Patient compliance', 'Laboratory scheduling', 'Result follow-up'],
      recommendations: [
        {
          action: 'Automated lab reminders in EHR',
          timeline: '2 weeks',
          responsibility: 'Clinical Informatics',
        },
        {
          action: 'Patient portal lab result notifications',
          timeline: '1 week',
          responsibility: 'IT Support',
        },
        {
          action: 'Nurse navigator lab coordination',
          timeline: 'Ongoing',
          responsibility: 'Nurse Navigator',
        },
      ],
    },
    {
      id: 'GAP006',
      category: 'Lifestyle',
      title: 'Cardiac Rehabilitation Enrollment',
      description: '19 eligible patients not enrolled in cardiac rehab',
      impact: 'medium',
      urgency: 'routine',
      affectedPatients: 19,
      potentialOutcome: 'Improved functional capacity and quality of life',
      actionRequired: 'Referral completion, insurance authorization, patient enrollment',
      estimatedTimeToClose: '6-8 weeks',
      assignedTo: 'Dr. Foster',
      dueDate: '2025-12-01',
      evidenceLevel: 'Class I',
      qualityMeasure: 'Cardiac Rehabilitation Participation',
      barriers: ['Transportation issues', 'Insurance coverage', 'Patient motivation'],
      recommendations: [
        {
          action: 'Transportation assistance program',
          timeline: '4 weeks',
          responsibility: 'Social Services',
        },
        {
          action: 'Virtual cardiac rehab options',
          timeline: '2 weeks',
          responsibility: 'Rehabilitation Services',
        },
        {
          action: 'Patient motivation counseling',
          timeline: 'Ongoing',
          responsibility: 'Care Team',
        },
      ],
    },
  ];

  const filteredGaps = careGaps.filter(gap => 
    selectedCategory === 'all' || gap.category === selectedCategory
  );

  const sortedGaps = [...filteredGaps].sort((a, b) => {
    if (viewMode === 'priority') {
      const urgencyWeight = { urgent: 3, soon: 2, routine: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      
      const aScore = urgencyWeight[a.urgency] + impactWeight[a.impact];
      const bScore = urgencyWeight[b.urgency] + impactWeight[b.impact];
      
      return bScore - aScore;
    }
    return 0;
  });

  const summary: CareGapSummary = {
    totalGaps: careGaps.length,
    highImpact: careGaps.filter(g => g.impact === 'high').length,
    urgent: careGaps.filter(g => g.urgency === 'urgent').length,
    avgClosureTime: 4.5,
    totalPotentialSavings: careGaps.reduce((sum, g) => sum + (g.costSavings || 0), 0),
    complianceRate: 73.2,
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      high: 'text-medical-red-600 bg-medical-red-100',
      medium: 'text-medical-amber-600 bg-medical-amber-100',
      low: 'text-medical-green-600 bg-medical-green-100',
    };
    return colors[impact as keyof typeof colors];
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      urgent: 'border-l-medical-red-400 bg-medical-red-50/30',
      soon: 'border-l-medical-amber-400 bg-medical-amber-50/30',
      routine: 'border-l-medical-green-400 bg-medical-green-50/30',
    };
    return colors[urgency as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      GDMT: <Target className="w-5 h-5 text-medical-blue-600" />,
      Device: <TrendingUp className="w-5 h-5 text-medical-green-600" />,
      Screening: <AlertTriangle className="w-5 h-5 text-medical-amber-600" />,
      'Follow-up': <Clock className="w-5 h-5 text-medical-red-600" />,
      Lab: <CheckCircle className="w-5 h-5 text-steel-600" />,
      Lifestyle: <Users className="w-5 h-5 text-medical-green-600" />,
    };
    return icons[category as keyof typeof icons];
  };

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Care Gap Analyzer
          </h2>
          <p className="text-steel-600">
            Identify and prioritize opportunities for care improvement
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-steel-600 mb-1">Total Potential Savings</div>
          <div className="text-3xl font-bold text-medical-green-600 font-sf">
            ${(summary.totalPotentialSavings / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-steel-600">Annual opportunity</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">{summary.totalGaps}</div>
          <div className="text-sm text-steel-600">Total Gaps</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-red-600 mb-1 font-sf">{summary.highImpact}</div>
          <div className="text-sm text-steel-600">High Impact</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-amber-600 mb-1 font-sf">{summary.urgent}</div>
          <div className="text-sm text-steel-600">Urgent</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">{summary.avgClosureTime}</div>
          <div className="text-sm text-steel-600">Avg Weeks</div>
        </div>
        <div className="retina-card p-4 text-center">
          <div className="text-3xl font-bold text-medical-green-600 mb-1 font-sf">{summary.complianceRate}%</div>
          <div className="text-sm text-steel-600">Compliance</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-steel-50 rounded-xl border border-steel-200">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-steel-700">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-steel-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="GDMT">GDMT</option>
            <option value="Device">Device</option>
            <option value="Screening">Screening</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Lab">Lab</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-steel-600">View:</span>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grid' ? 'bg-medical-blue-100 text-medical-blue-800' : 'text-steel-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('priority')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'priority' ? 'bg-medical-blue-100 text-medical-blue-800' : 'text-steel-600'
            }`}
          >
            Priority
          </button>
        </div>
      </div>

      {/* Care Gap Cards */}
      <div className="space-y-4">
        {sortedGaps.map((gap) => (
          <div
            key={gap.id}
            className={`retina-card border-l-4 transition-all duration-300 hover:shadow-retina-3 cursor-pointer ${getUrgencyColor(gap.urgency)}`}
            onClick={() => setSelectedGap(selectedGap?.id === gap.id ? null : gap)}
          >
            <div className="p-5">
              {/* Gap Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white">
                    {getCategoryIcon(gap.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-steel-900">{gap.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getImpactColor(gap.impact)}`}>
                        {gap.impact.toUpperCase()} IMPACT
                      </span>
                      <span className="text-xs bg-steel-100 text-steel-700 px-2 py-1 rounded">
                        {gap.evidenceLevel}
                      </span>
                    </div>
                    <div className="text-steel-600">{gap.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-steel-600 mb-1">Affected Patients</div>
                  <div 
                    className="text-2xl font-bold text-steel-900 font-sf cursor-pointer hover:text-medical-blue-600 flex items-center gap-1 justify-end"
                    onClick={(e) => {
                      e.stopPropagation();
                      showPatientsForGap(gap.title);
                    }}
                  >
                    {getPatientsForGap(gap.title).length} <ExternalLink className="w-5 h-5" />
                  </div>
                  {gap.costSavings && (
                    <div className="text-sm text-medical-green-600 font-semibold">
                      ${(gap.costSavings / 1000000).toFixed(1)}M savings
                    </div>
                  )}
                </div>
              </div>

              {/* Gap Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg border border-steel-200">
                <div>
                  <div className="text-xs text-steel-600 mb-1">Expected Outcome</div>
                  <div className="text-sm text-steel-800 font-medium">{gap.potentialOutcome}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Action Required</div>
                  <div className="text-sm text-steel-800">{gap.actionRequired}</div>
                </div>
                <div>
                  <div className="text-xs text-steel-600 mb-1">Time to Close</div>
                  <div className="text-sm font-bold text-steel-900">{gap.estimatedTimeToClose}</div>
                </div>
              </div>

              {/* Assignment and Due Date */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-steel-600" />
                    <span className="text-sm text-steel-700">
                      Assigned: <span className="font-medium">{gap.assignedTo || 'Unassigned'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-steel-600" />
                    <span className="text-sm text-steel-700">
                      Due: <span className="font-medium">{new Date(gap.dueDate).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
                {gap.qualityMeasure && (
                  <div className="text-sm text-medical-blue-600 font-medium">
                    Quality Measure: {gap.qualityMeasure}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {selectedGap?.id === gap.id && (
                <div className="mt-4 p-4 bg-medical-blue-50/50 rounded-xl border border-medical-blue-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Common Barriers</h4>
                      <div className="space-y-2">
                        {gap.barriers.map((barrier, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-medical-amber-600" />
                            <span className="text-steel-800">{barrier}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-steel-900 mb-3">Recommended Actions</h4>
                      <div className="space-y-3">
                        {gap.recommendations.map((rec, index) => (
                          <div key={index} className="p-3 bg-white rounded border border-steel-200">
                            <div className="text-sm font-medium text-steel-900 mb-1">{rec.action}</div>
                            <div className="flex items-center justify-between text-xs text-steel-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{rec.timeline}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{rec.responsibility}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-steel-200">
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-medical-blue-600 text-white text-sm rounded-lg hover:bg-medical-blue-700 transition-colors">
                    Start Action Plan
                  </button>
                  <button className="px-4 py-2 bg-medical-green-100 text-medical-green-800 text-sm rounded-lg hover:bg-medical-green-200 transition-colors border border-medical-green-300">
                    Assign to Team
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-steel-600">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient List Modal */}
      {showPatientList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-3/4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Patients with {showPatientList} Gap
              </h2>
              <button
                onClick={closePatientsForGap}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {getPatientsForGap(showPatientList).map((patient) => (
                <div key={patient.mrn} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <h3 
                          className="text-lg font-semibold text-medical-blue-600 cursor-pointer hover:text-medical-blue-800 flex items-center gap-2"
                          onClick={() => {
                            closePatientsForGap();
                            openPatientChart(patient.mrn);
                          }}
                        >
                          {patient.name}
                          <ExternalLink className="w-4 h-4" />
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>MRN: {patient.mrn}</span>
                          <span>Age: {patient.age}</span>
                          <span>EF: {patient.ef}%</span>
                          <span>NYHA Class {patient.nyhaClass}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Care Gaps</div>
                        <div className="text-sm font-medium text-gray-900">
                          {patient.fullChart.careGaps.length} active
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {patient.fullChart.careGaps.map((gap, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gap === showPatientList
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patient Chart Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-3/4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedPatient.name}</h2>
                <p className="text-gray-600">MRN: {selectedPatient.mrn} • Age: {selectedPatient.age} • EF: {selectedPatient.ef}% • NYHA Class {selectedPatient.nyhaClass}</p>
              </div>
              <button
                onClick={closePatientChart}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vitals */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Vital Signs
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Blood Pressure:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.vitals.bp}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Heart Rate:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.vitals.hr} bpm</span>
                  </div>
                  <div>
                    <span className="text-gray-600">O2 Saturation:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.vitals.o2sat}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Weight:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.vitals.weight} lbs</span>
                  </div>
                </div>
              </div>

              {/* Labs */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-green-600" />
                  Laboratory Results
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Creatinine:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.labs.creatinine} mg/dL</span>
                  </div>
                  <div>
                    <span className="text-gray-600">BUN:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.labs.bun} mg/dL</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Sodium:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.labs.sodium} mEq/L</span>
                  </div>
                  <div>
                    <span className="text-gray-600">BNP:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.labs.bnp} pg/mL</span>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  Current Medications
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.medications.map((med, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{med.name}</span>
                        <span className="text-gray-600 ml-2">{med.dose} {med.frequency}</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        med.adherence >= 90 ? 'bg-green-100 text-green-800' :
                        med.adherence >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {med.adherence}% adherence
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Care Gaps */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Active Care Gaps
                </h3>
                <div className="space-y-4">
                  {selectedPatient.fullChart.careGaps.map((gap, index) => {
                    const gdmtRec = getGDMTRecommendations(gap, selectedPatient);
                    return (
                      <div key={index} className="border border-red-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="font-semibold text-red-800">{gap}</span>
                        </div>
                        
                        {gdmtRec && (
                          <div className="space-y-3 bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Pill className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-blue-800">GDMT Recommendation</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                {gdmtRec.evidenceLevel}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="font-medium text-blue-800 mb-1">Recommendation:</div>
                                <div className="text-blue-700">{gdmtRec.recommendation}</div>
                              </div>
                              
                              <div>
                                <div className="font-medium text-blue-800 mb-1">Rationale:</div>
                                <div className="text-blue-700">{gdmtRec.rationale}</div>
                              </div>
                              
                              <div>
                                <div className="font-medium text-orange-800 mb-1">Monitoring:</div>
                                <ul className="text-orange-700 space-y-1">
                                  {gdmtRec.monitoring.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-1">
                                      <div className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <div className="font-medium text-green-800 mb-1">Economic Impact:</div>
                                <div className="text-green-700 font-semibold">{gdmtRec.costSavings}</div>
                              </div>
                            </div>
                            
                            {gdmtRec.contraindications.length > 0 && (
                              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                                <div className="flex items-center gap-1 mb-1">
                                  <Shield className="w-3 h-3 text-red-600" />
                                  <span className="text-xs font-medium text-red-800">Contraindications:</span>
                                </div>
                                <div className="text-xs text-red-700">
                                  {gdmtRec.contraindications.join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!gdmtRec && (
                          <div className="bg-gray-50 rounded p-2 text-sm text-gray-600 italic">
                            General care gap - clinical assessment recommended
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Care Team */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-600" />
                  Care Team
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Attending:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.careTeam.attending}</span>
                  </div>
                  {selectedPatient.fullChart.careTeam.resident && (
                    <div>
                      <span className="text-gray-600">Resident:</span>
                      <span className="ml-2 font-medium">{selectedPatient.fullChart.careTeam.resident}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Nurse:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.careTeam.nurse}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pharmacist:</span>
                    <span className="ml-2 font-medium">{selectedPatient.fullChart.careTeam.pharmacist}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Recent Clinical Notes
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.notes.map((note, index) => (
                    <div key={index} className="text-sm text-gray-700 p-2 bg-white rounded border-l-4 border-gray-300">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button 
                onClick={() => {
                  console.log('Creating care plan for patient:', selectedPatient?.name, selectedPatient?.mrn);
                  alert('Create Care Plan\n\nThis would create a comprehensive care plan for ' + (selectedPatient?.name || 'the selected patient') + '.\n\n• GDMT optimization strategy\n• Clinical milestone tracking\n• Care team coordination\n• Patient education materials\n• Follow-up scheduling\n\nTODO: Implement care plan builder with evidence-based templates');
                }}
                className="bg-medical-blue-600 text-white px-4 py-2 rounded-lg hover:bg-medical-blue-700 transition-colors flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Create Care Plan
              </button>
              <button 
                onClick={() => {
                  console.log('Addressing care gaps for patient:', selectedPatient?.name, selectedPatient?.fullChart?.careGaps);
                  alert('Address Care Gaps\n\nThis would initiate gap closure workflows for ' + (selectedPatient?.name || 'the selected patient') + '.\n\n• Priority gap identification\n• Evidence-based interventions\n• Care team task assignment\n• Progress monitoring setup\n• Barrier resolution protocols\n\nTODO: Implement automated gap closure workflows');
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Address Gap
              </button>
              <button 
                onClick={() => {
                  console.log('Opening full chart for patient:', selectedPatient?.name, selectedPatient?.mrn);
                  alert('View Full Chart\n\nThis would open the complete electronic health record for ' + (selectedPatient?.name || 'the selected patient') + '.\n\n• Complete medical history\n• All lab results and trends\n• Medication history\n• Provider notes and assessments\n• Imaging and diagnostic reports\n\nTODO: Integrate with EHR system for full chart access');
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Full Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareGapAnalyzer;