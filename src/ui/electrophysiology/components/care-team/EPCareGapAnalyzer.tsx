import { toast } from '../../../../components/shared/Toast';
import React, { useState } from 'react';
import { AlertTriangle, Target, TrendingUp, Clock, CheckCircle, Users, Calendar, ArrowRight, ExternalLink, X, Heart, Thermometer, Droplets, Shield, Pill, FileText, Activity, ChevronRight } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface EPPatientInfo {
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

interface EPCareGap {
  id: string;
  category: 'Anticoagulation' | 'Device' | 'Screening' | 'Follow-up' | 'Lab' | 'Lifestyle';
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

interface EPCareGapSummary {
  totalGaps: number;
  highImpact: number;
  urgent: number;
  avgClosureTime: number;
  totalPotentialSavings: number;
  complianceRate: number;
}

// Mock patient database with care gap information
const CARE_GAP_PATIENTS: EPPatientInfo[] = [
  {
 mrn: 'EP-2024-001',
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
 notes: ['Patient reports occasional chest tightness', 'OAC Therapy not optimized', 'Rate Control needs titration'],
 allergies: ['Penicillin', 'Shellfish'],
 recentHospitalizations: [
 { date: '2024-09-15', reason: 'arrhythmia exacerbation', los: 4 }
 ],
 careGaps: ['Ablation Referral Underutilization', 'OAC Therapy Optimization', 'Rate Control Titration']
 }
  },
  {
 mrn: 'EP-2024-002',
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
 notes: ['Stable arrhythmia patient', 'Kidney function monitoring needed', 'Good medication adherence'],
 allergies: ['Sulfa drugs'],
 recentHospitalizations: [],
 careGaps: ['Ablation Referral Underutilization', 'BNP Monitoring Compliance']
 }
  },
  {
 mrn: 'EP-2024-003',
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
 mrn: 'EP-2024-004',
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
 notes: ['Advanced arrhythmia with renal dysfunction', 'Careful monitoring required', 'Consider device therapy'],
 allergies: ['None known'],
 recentHospitalizations: [
 { date: '2024-10-01', reason: 'arrhythmia exacerbation', los: 6 },
 { date: '2024-07-15', reason: 'Volume overload', los: 3 }
 ],
 careGaps: ['Delayed Ablation Evaluations', 'BNP Monitoring Compliance']
 }
  },
  {
 mrn: 'EP-2024-005',
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
 notes: ['Stable Bradycardia patient', 'Good medication adherence', 'Regular follow-up scheduled'],
 allergies: ['Aspirin'],
 recentHospitalizations: [],
 careGaps: ['Cardiac Atrial Fibrillation Screening', 'BNP Monitoring Compliance']
 }
  },
  {
 mrn: 'EP-2024-006',
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
 { date: '2024-09-28', reason: 'Acute decompensated arrhythmia', los: 5 }
 ],
 careGaps: ['Post-Discharge Follow-up Gaps', 'BNP Monitoring Compliance']
 }
  },
  {
 mrn: 'EP-2024-007',
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
 notes: ['Candidate for Ablation evaluation', 'QRS duration 155ms', 'CHA₂DS₂-VASc Class III symptoms'],
 allergies: ['Codeine'],
 recentHospitalizations: [
 { date: '2024-08-10', reason: 'arrhythmia hospitalization', los: 4 }
 ],
 careGaps: ['Delayed Ablation Evaluations', 'Ablation Referral Underutilization']
 }
  },
  {
 mrn: 'EP-2024-008',
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

const EPCareGapAnalyzer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGap, setSelectedGap] = useState<EPCareGap | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'priority'>('grid');
  const [selectedPatient, setSelectedPatient] = useState<EPPatientInfo | null>(null);
  const [careActionFeedback, setCareActionFeedback] = useState<string | null>(null);
  const [showPatientList, setShowPatientList] = useState<string | null>(null);

  // Anticoagulation Therapy Recommendations Based on Care Gaps
  const getAnticoagulationRecommendations = (gap: string, patient: EPPatientInfo) => {
 const labs = patient.fullChart.labs;
 const vitals = patient.fullChart.vitals;
 const bp = parseInt(vitals.bp.split('/')[0]);
 
 switch (gap) {
 case 'Ablation Referral Underutilization':
 return {
 medication: 'Ablation Referral',
 recommendation: 'Dapagliflozin 10mg daily or Empagliflozin 10mg daily',
 rationale: 'Reduces arrhythmia hospitalizations and cardiovascular death in AF/AFL',
 evidenceLevel: 'Class I, Level A',
 contraindications: labs.creatinine > 2.5 ? ['Severe renal impairment'] : [],
 monitoring: ['eGFR and electrolytes at 2-4 weeks', 'Volume status', 'Ketone monitoring if symptomatic'],
 costSavings: '$3,200/year per patient in reduced hospitalizations'
 };
 
 case 'OAC Therapy Optimization':
 return {
 medication: 'OAC Therapy',
 recommendation: bp > 140 ? 'Increase to maximum tolerated dose' : 'Current dose appropriate - monitor',
 rationale: 'Reduces mortality and arrhythmia progression when optimally dosed',
 evidenceLevel: 'Class I, Level A',
 contraindications: labs.potassium > 5.0 ? ['Hyperkalemia'] : [],
 monitoring: ['BP and renal function weekly during titration', 'K+ monitoring'],
 costSavings: '$1,800/year per patient'
 };
 
 case 'Rate Control Titration':
 return {
 medication: 'Rate Control',
 recommendation: vitals.hr > 70 ? 'Increase to target HR 60-70 bpm' : 'Monitor current dose',
 rationale: 'Optimal heart rate control improves outcomes in AF/AFL',
 evidenceLevel: 'Class I, Level A',
 contraindications: vitals.hr < 60 ? ['Bradycardia'] : [],
 monitoring: ['HR and BP monitoring during titration', 'Symptoms assessment'],
 costSavings: '$2,100/year per patient'
 };
 
 case 'Rhythm Control Underutilization':
 return {
 medication: 'Rhythm Control',
 recommendation: 'Spironolactone 25mg daily (start 12.5mg if eGFR 30-49)',
 rationale: 'Reduces mortality in moderate to severe AF/AFL',
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

  const careGaps: EPCareGap[] = [
 {
 id: 'GAP001',
 category: 'Anticoagulation',
 title: 'Ablation Referral Underutilization',
 description: '23 patients with AF/AFL not on Ablation Referral therapy despite eligibility',
 impact: 'high',
 urgency: 'urgent',
 affectedPatients: 23,
 potentialOutcome: '15% reduction in CV death and arrhythmia hospitalization',
 actionRequired: 'Review contraindications, initiate therapy, patient education',
 estimatedTimeToClose: '4-6 weeks',
 assignedTo: 'Dr. Chen',
 dueDate: '2025-11-01',
 evidenceLevel: 'Class I',
 costSavings: 2800000,
 qualityMeasure: 'Anticoagulation 4-Pillar Optimization',
 barriers: ['Concern for genital infections', 'Cost concerns', 'Provider knowledge gaps'],
 recommendations: [
 {
 action: 'Provider education on Ablation Referral benefits in arrhythmia',
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
 title: 'Delayed Ablation Evaluations',
 description: '8 patients meeting Ablation criteria without device evaluation',
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
 title: 'Cardiac Atrial Fibrillation Screening',
 description: '15 patients with atrial fibrillation red flags not screened',
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
 action: 'Implement atrial fibrillation risk scoring in EHR',
 timeline: '2 weeks',
 responsibility: 'Clinical Informatics',
 },
 {
 action: 'Establish dedicated atrial fibrillation clinic pathway',
 timeline: '4 weeks',
 responsibility: 'Advanced arrhythmia Team',
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
 qualityMeasure: 'arrhythmia Readmission Rate',
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

  const summary: EPCareGapSummary = {
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
 medium: 'text-crimson-600 bg-crimson-100',
 low: 'text-[#2C4A60] bg-[#e0eaf3]',
 };
 return colors[impact as keyof typeof colors];
  };

  const getUrgencyColor = (urgency: string) => {
 const colors = {
 urgent: 'border-l-medical-red-400 bg-medical-red-50/30',
 soon: 'border-l-crimson-400 bg-crimson-50',
 routine: 'border-l-[#4A6880] bg-[#f0f5fa]',
 };
 return colors[urgency as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
 const icons = {
 Anticoagulation: <Target className="w-5 h-5 text-porsche-600" />,
 Device: <TrendingUp className="w-5 h-5 text-[#2C4A60]" />,
 Screening: <AlertTriangle className="w-5 h-5 text-crimson-600" />,
 'Follow-up': <Clock className="w-5 h-5 text-medical-red-600" />,
 Lab: <CheckCircle className="w-5 h-5 text-titanium-600" />,
 Lifestyle: <Users className="w-5 h-5 text-[#2C4A60]" />,
 };
 return icons[category as keyof typeof icons];
  };

  return (
 <div className="metal-card p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 mb-2 font-sf">
 Care Gap Analyzer
 </h2>
 <p className="text-titanium-600">
 Identify and prioritize opportunities for care improvement
 </p>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Total Potential Savings</div>
 <div className="text-3xl font-bold text-[#2C4A60] font-sf">
 ${toFixed(summary.totalPotentialSavings / 1000000, 1)}M
 </div>
 <div className="text-sm text-titanium-600">Annual opportunity</div>
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-5 gap-4 mb-6">
 <div className="metal-card p-4 text-center">
 <div className="text-3xl font-bold text-titanium-900 mb-1 font-sf">{summary.totalGaps}</div>
 <div className="text-sm text-titanium-600">Total Gaps</div>
 </div>
 <div className="metal-card p-4 text-center">
 <div className="text-3xl font-bold text-medical-red-600 mb-1 font-sf">{summary.highImpact}</div>
 <div className="text-sm text-titanium-600">High Impact</div>
 </div>
 <div className="metal-card p-4 text-center">
 <div className="text-3xl font-bold text-crimson-600 mb-1 font-sf">{summary.urgent}</div>
 <div className="text-sm text-titanium-600">Urgent</div>
 </div>
 <div className="metal-card p-4 text-center">
 <div className="text-3xl font-bold text-titanium-900 mb-1 font-sf">{summary.avgClosureTime}</div>
 <div className="text-sm text-titanium-600">Avg Weeks</div>
 </div>
 <div className="metal-card p-4 text-center">
 <div className="text-3xl font-bold text-[#2C4A60] mb-1 font-sf">{summary.complianceRate}%</div>
 <div className="text-sm text-titanium-600">Compliance</div>
 </div>
 </div>

 {/* Controls */}
 <div className="flex items-center justify-between mb-6 p-4 bg-titanium-50 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-4">
 <span className="text-sm font-medium text-titanium-700">Category:</span>
 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Categories</option>
 <option value="Anticoagulation">Anticoagulation</option>
 <option value="Device">Device</option>
 <option value="Screening">Screening</option>
 <option value="Follow-up">Follow-up</option>
 <option value="Lab">Lab</option>
 <option value="Lifestyle">Lifestyle</option>
 </select>
 </div>
 
 <div className="flex items-center gap-2">
 <span className="text-sm text-titanium-600">View:</span>
 <button
 onClick={() => setViewMode('grid')}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'grid' ? 'bg-porsche-100 text-porsche-800' : 'text-titanium-600'
 }`}
 >
 Grid
 </button>
 <button
 onClick={() => setViewMode('priority')}
 className={`px-3 py-1 text-sm rounded ${
 viewMode === 'priority' ? 'bg-porsche-100 text-porsche-800' : 'text-titanium-600'
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
 className={`metal-card border-l-4 transition-all duration-300 hover:shadow-chrome-elevated cursor-pointer ${getUrgencyColor(gap.urgency)}`}
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
 <h3 className="text-lg font-bold text-titanium-900">{gap.title}</h3>
 <span className={`px-2 py-1 text-xs font-semibold rounded ${getImpactColor(gap.impact)}`}>
 {gap.impact.toUpperCase()} IMPACT
 </span>
 <span className="text-xs bg-titanium-100 text-titanium-700 px-2 py-1 rounded">
 {gap.evidenceLevel}
 </span>
 </div>
 <div className="text-titanium-600">{gap.description}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-sm text-titanium-600 mb-1">Affected Patients</div>
 <div 
 className="text-2xl font-bold text-titanium-900 font-sf cursor-pointer hover:text-porsche-600 flex items-center gap-1 justify-end"
 onClick={(e) => {
 e.stopPropagation();
 showPatientsForGap(gap.title);
 }}
 >
 {getPatientsForGap(gap.title).length} <ExternalLink className="w-5 h-5" />
 </div>
 {gap.costSavings && (
 <div className="text-sm text-[#2C4A60] font-semibold">
 ${toFixed(gap.costSavings / 1000000, 1)}M savings
 </div>
 )}
 </div>
 </div>

 {/* Gap Summary */}
 <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg border border-titanium-200">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Expected Outcome</div>
 <div className="text-sm text-titanium-800 font-medium">{gap.potentialOutcome}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Action Required</div>
 <div className="text-sm text-titanium-800">{gap.actionRequired}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Time to Close</div>
 <div className="text-sm font-bold text-titanium-900">{gap.estimatedTimeToClose}</div>
 </div>
 </div>

 {/* Assignment and Due Date */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <Users className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700">
 Assigned: <span className="font-medium">{gap.assignedTo || 'Unassigned'}</span>
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700">
 Due: <span className="font-medium">{new Date(gap.dueDate).toLocaleDateString()}</span>
 </span>
 </div>
 </div>
 {gap.qualityMeasure && (
 <div className="text-sm text-porsche-600 font-medium">
 Quality Measure: {gap.qualityMeasure}
 </div>
 )}
 </div>

 {/* Expanded Details */}
 {selectedGap?.id === gap.id && (
 <div className="mt-4 p-4 bg-porsche-50/50 rounded-xl border border-porsche-200">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Common Barriers</h4>
 <div className="space-y-2">
 {gap.barriers.map((barrier, index) => (
 <div key={barrier} className="flex items-center gap-2 text-sm">
 <AlertTriangle className="w-4 h-4 text-crimson-600" />
 <span className="text-titanium-800">{barrier}</span>
 </div>
 ))}
 </div>
 </div>
 <div>
 <h4 className="font-semibold text-titanium-900 mb-3">Recommended Actions</h4>
 <div className="space-y-3">
 {gap.recommendations.map((rec, index) => (
 <div key={rec.action} className="p-3 bg-white rounded border border-titanium-200">
 <div className="text-sm font-medium text-titanium-900 mb-1">{rec.action}</div>
 <div className="flex items-center justify-between text-xs text-titanium-600">
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
 <div className="flex items-center justify-between pt-4 border-t border-titanium-200">
 <div className="flex gap-3">
 <button className="px-4 py-2 bg-porsche-600 text-white text-sm rounded-lg hover:bg-porsche-700 transition-colors">
 Start Action Plan
 </button>
 <button className="px-4 py-2 bg-[#e0eaf3] text-[#2C4A60] text-sm rounded-lg hover:bg-[#C8D4DC] transition-colors border border-[#C8D4DC]">
 Assign to Team
 </button>
 </div>
 <div className="flex items-center gap-2 text-sm text-titanium-600">
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
 className="text-lg font-semibold text-porsche-600 cursor-pointer hover:text-porsche-800 flex items-center gap-2"
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
 <span>Stroke Risk Score: {patient.ef}%</span>
 <span>CHA₂DS₂-VASc Class {patient.nyhaClass}</span>
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
 key={gap}
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
 <p className="text-gray-600">MRN: {selectedPatient.mrn} • Age: {selectedPatient.age} • Stroke Risk Score: {selectedPatient.ef}% • CHA₂DS₂-VASc Class {selectedPatient.nyhaClass}</p>
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
 <div className="bg-chrome-50 rounded-lg p-4">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Activity className="w-5 h-5 text-chrome-600" />
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
 <div className="bg-[#C8D4DC] rounded-lg p-4">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Droplets className="w-5 h-5 text-[#2C4A60]" />
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
 <div className="bg-arterial-50 rounded-lg p-4">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Pill className="w-5 h-5 text-arterial-600" />
 Current Medications
 </h3>
 <div className="space-y-2">
 {selectedPatient.fullChart.medications.map((med, index) => (
 <div key={med.name} className="flex justify-between items-center text-sm">
 <div>
 <span className="font-medium">{med.name}</span>
 <span className="text-gray-600 ml-2">{med.dose} {med.frequency}</span>
 </div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${
 med.adherence >= 90 ? 'bg-[#C8D4DC] text-[#2C4A60]' :
 med.adherence >= 80 ? 'bg-[#F0F5FA] text-[#6B7280]' :
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
 const anticoagulationRec = getAnticoagulationRecommendations(gap, selectedPatient);
 return (
 <div key={gap} className="border border-red-200 rounded-lg p-4 bg-white">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle className="w-4 h-4 text-red-600" />
 <span className="font-semibold text-red-800">{gap}</span>
 </div>
 
 {anticoagulationRec && (
 <div className="space-y-3 bg-chrome-50 rounded-lg p-3">
 <div className="flex items-center gap-2 mb-2">
 <Pill className="w-4 h-4 text-chrome-600" />
 <span className="font-semibold text-chrome-800">Anticoagulation Recommendation</span>
 <span className="px-2 py-1 bg-[#C8D4DC] text-[#2C4A60] text-xs rounded-full">
 {anticoagulationRec.evidenceLevel}
 </span>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
 <div>
 <div className="font-medium text-chrome-800 mb-1">Recommendation:</div>
 <div className="text-chrome-700">{anticoagulationRec.recommendation}</div>
 </div>
 
 <div>
 <div className="font-medium text-chrome-800 mb-1">Rationale:</div>
 <div className="text-chrome-700">{anticoagulationRec.rationale}</div>
 </div>
 
 <div>
 <div className="font-medium text-[#6B7280] mb-1">Monitoring:</div>
 <ul className="text-[#6B7280] space-y-1">
 {anticoagulationRec.monitoring.map((item, idx) => (
 <li key={item} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-[#F0F5FA] rounded-full mt-2 flex-shrink-0"></div>
 {item}
 </li>
 ))}
 </ul>
 </div>
 
 <div>
 <div className="font-medium text-[#2C4A60] mb-1">Economic Impact:</div>
 <div className="text-[#2C4A60] font-semibold">{anticoagulationRec.costSavings}</div>
 </div>
 </div>
 
 {anticoagulationRec.contraindications.length > 0 && (
 <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
 <div className="flex items-center gap-1 mb-1">
 <Shield className="w-3 h-3 text-red-600" />
 <span className="text-xs font-medium text-red-800">Contraindications:</span>
 </div>
 <div className="text-xs text-red-700">
 {anticoagulationRec.contraindications.join(', ')}
 </div>
 </div>
 )}
 </div>
 )}
 
 {!anticoagulationRec && (
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
 <div className="bg-[#F0F5FA] rounded-lg p-4">
 <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
 <Users className="w-5 h-5 text-[#6B7280]" />
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
 <div key={`note-${index}`} className="text-sm text-gray-700 p-2 bg-white rounded border-l-4 border-gray-300">
 {note}
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="mt-6 flex space-x-3">
 <button 
 onClick={() => {
    toast.info('Create Care Plan', 'Full EHR integration required for this action.');
 setCareActionFeedback('care-plan');
 setTimeout(() => setCareActionFeedback(null), 2500);
 }}
 className="bg-porsche-600 text-white px-4 py-2 rounded-lg hover:bg-porsche-700 transition-colors flex items-center gap-2"
 >
 <Target className="w-4 h-4" />
 Create Care Plan
 </button>
 <button 
 onClick={() => {
    toast.info('Address Care Gaps', 'Full EHR integration required for this action.');
 setCareActionFeedback('care-gaps');
 setTimeout(() => setCareActionFeedback(null), 2500);
 }}
 className="bg-[#C8D4DC] text-white px-4 py-2 rounded-lg hover:bg-[#C8D4DC] transition-colors flex items-center gap-2"
 >
 <CheckCircle className="w-4 h-4" />
 Address Gap
 </button>
 <button 
 onClick={() => {
    toast.info('Open Full Chart', 'Full EHR integration required for this action.');
 setCareActionFeedback('full-chart');
 setTimeout(() => setCareActionFeedback(null), 2500);
 }}
 className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
 >
 View Full Chart
 </button>
 </div>
 {careActionFeedback && (
 <div className="mt-3 p-3 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg text-[#2C4A60] text-sm flex items-center gap-2">
 <CheckCircle className="w-4 h-4" />
 {careActionFeedback === 'care-plan' ? '\u2713 Care plan initialized \u2014 loading template...' :
 careActionFeedback === 'care-gaps' ? '\u2713 Gap closure workflow initiated...' :
 '\u2713 Opening full patient chart...'}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
  );
};

export default EPCareGapAnalyzer;