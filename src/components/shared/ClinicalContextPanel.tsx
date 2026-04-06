import React, { useState } from 'react';
import {
  Heart,
  Pill,
  TestTube,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  Clock,
  Scale,
  Thermometer
} from 'lucide-react';

// Mock clinical data - in real implementation, this would come from API
const mockPatientData = {
  demographics: {
 name: 'Margaret Johnson',
 age: 78,
 gender: 'F',
 mrn: '12345678'
  },
  conditions: [
 {
 condition: 'Heart failure with reduced ejection fraction',
 icd10: 'I50.21',
 onsetDate: '2024-01-15',
 status: 'active',
 severity: 'moderate'
 },
 {
 condition: 'Coronary artery disease',
 icd10: 'I25.10',
 onsetDate: '2023-08-12',
 status: 'active',
 severity: 'severe'
 },
 {
 condition: 'Diabetes mellitus, type 2',
 icd10: 'E11.9',
 onsetDate: '2018-03-20',
 status: 'active',
 severity: 'mild'
 },
 {
 condition: 'Hypertension',
 icd10: 'I10',
 onsetDate: '2016-05-15',
 status: 'active',
 severity: 'moderate'
 }
  ],
  medications: [
 {
 name: 'Carvedilol',
 dose: '25mg',
 frequency: 'BID',
 route: 'PO',
 startDate: '2024-01-20',
 gdmtPillar: 'Beta-blocker',
 adherence: 95
 },
 {
 name: 'Lisinopril',
 dose: '10mg',
 frequency: 'Daily',
 route: 'PO',
 startDate: '2024-01-22',
 gdmtPillar: 'ACE/ARB/ARNI',
 adherence: 88
 },
 {
 name: 'Spironolactone',
 dose: '25mg',
 frequency: 'Daily',
 route: 'PO',
 startDate: '2024-02-05',
 gdmtPillar: 'MRA',
 adherence: 92
 },
 {
 name: 'Furosemide',
 dose: '40mg',
 frequency: 'BID',
 route: 'PO',
 startDate: '2024-01-18',
 gdmtPillar: null,
 adherence: 90
 },
 {
 name: 'Atorvastatin',
 dose: '80mg',
 frequency: 'Daily',
 route: 'PO',
 startDate: '2023-08-15',
 gdmtPillar: null,
 adherence: 85
 },
 {
 name: 'Metformin',
 dose: '1000mg',
 frequency: 'BID',
 route: 'PO',
 startDate: '2018-03-25',
 gdmtPillar: null,
 adherence: 93
 }
  ],
  labs: [
 {
 name: 'BNP',
 value: 450,
 unit: 'pg/mL',
 date: '2024-02-09',
 reference: '<100',
 status: 'high',
 trend: 'down'
 },
 {
 name: 'Potassium',
 value: 4.2,
 unit: 'mEq/L',
 date: '2024-02-09',
 reference: '3.5-5.0',
 status: 'normal',
 trend: 'stable'
 },
 {
 name: 'Creatinine',
 value: 1.1,
 unit: 'mg/dL',
 date: '2024-02-09',
 reference: '0.6-1.3',
 status: 'normal',
 trend: 'up'
 },
 {
 name: 'eGFR',
 value: 68,
 unit: 'mL/min/1.73m²',
 date: '2024-02-09',
 reference: '>60',
 status: 'normal',
 trend: 'down'
 },
 {
 name: 'INR',
 value: 1.0,
 unit: '',
 date: '2024-02-09',
 reference: '0.8-1.2',
 status: 'normal',
 trend: 'stable'
 }
  ],
  vitals: [
 {
 name: 'Blood Pressure',
 value: '125/78',
 unit: 'mmHg',
 date: '2024-02-11',
 status: 'normal',
 trend: 'down'
 },
 {
 name: 'Heart Rate',
 value: 68,
 unit: 'bpm',
 date: '2024-02-11',
 status: 'normal',
 trend: 'stable'
 },
 {
 name: 'Weight',
 value: 72.3,
 unit: 'kg',
 date: '2024-02-11',
 status: 'normal',
 trend: 'down'
 },
 {
 name: 'Temperature',
 value: 36.8,
 unit: '°C',
 date: '2024-02-11',
 status: 'normal',
 trend: 'stable'
 }
  ],
  alerts: [
 {
 id: 'A001',
 type: 'cql-rule',
 severity: 'high',
 title: 'GDMT Optimization Opportunity',
 description: 'Patient eligible for SGLT2 inhibitor based on current therapy and clinical profile',
 rule: 'HF_SGLT2_ELIGIBLE',
 daysActive: 3
 },
 {
 id: 'A002',
 type: 'medication',
 severity: 'medium',
 title: 'Beta-blocker Titration',
 description: 'Consider increasing carvedilol dose if tolerated (current: 25mg BID, target: 50mg BID)',
 rule: 'HF_BB_TITRATION',
 daysActive: 7
 },
 {
 id: 'A003',
 type: 'lab-monitoring',
 severity: 'low',
 title: 'Renal Function Monitoring',
 description: 'Due for follow-up creatinine and K+ given ACE inhibitor and MRA therapy',
 rule: 'RENAL_MONITORING',
 daysActive: 12
 }
  ],
  phenotypes: [
 {
 name: 'Heart Failure with Reduced EF',
 status: 'confirmed',
 confidence: 96,
 lastScreened: '2024-02-08'
 },
 {
 name: 'Diabetes Mellitus',
 status: 'confirmed',
 confidence: 100,
 lastScreened: '2024-02-01'
 },
 {
 name: 'Coronary Artery Disease',
 status: 'confirmed',
 confidence: 98,
 lastScreened: '2024-02-05'
 },
 {
 name: 'Atrial Fibrillation',
 status: 'pending',
 confidence: 72,
 lastScreened: '2024-02-09'
 }
  ],
  referrals: [
 {
 id: 'R001',
 specialty: 'Cardiac Rehabilitation',
 status: 'pending',
 urgency: 'routine',
 dateOrdered: '2024-02-10',
 provider: 'Dr. Sarah Chen'
 },
 {
 id: 'R002',
 specialty: 'Nutrition Counseling',
 status: 'scheduled',
 urgency: 'routine',
 dateOrdered: '2024-02-08',
 appointmentDate: '2024-02-15',
 provider: 'Dr. Sarah Chen'
 }
  ]
};

interface ClinicalContextPanelProps {
  patientId?: string;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ClinicalContextPanel: React.FC<ClinicalContextPanelProps> = ({ 
  patientId, 
  className = '',
  collapsed = false,
  onToggleCollapse 
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
 new Set(['conditions', 'medications', 'alerts'])
  );

  const toggleSection = (section: string) => {
 const newExpanded = new Set(expandedSections);
 if (newExpanded.has(section)) {
 newExpanded.delete(section);
 } else {
 newExpanded.add(section);
 }
 setExpandedSections(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
 switch (severity) {
 case 'high': return 'text-medical-red-600 bg-medical-red-50';
 case 'medium': return 'text-crimson-600 bg-crimson-50';
 case 'low': return 'text-porsche-600 bg-porsche-50';
 case 'severe': return 'text-medical-red-700 bg-medical-red-100';
 case 'moderate': return 'text-crimson-700 bg-crimson-100';
 case 'mild': return 'text-green-600 bg-green-50';
 default: return 'text-titanium-600 bg-titanium-50';
 }
  };

  const getStatusColor = (status: string) => {
 switch (status) {
 case 'high': return 'text-medical-red-600';
 case 'normal': return 'text-teal-700';
 case 'low': return 'text-porsche-600';
 case 'critical': return 'text-medical-red-700';
 default: return 'text-titanium-600';
 }
  };

  const getTrendIcon = (trend: string) => {
 switch (trend) {
 case 'up': return <TrendingUp className="w-3 h-3 text-medical-red-500" />;
 case 'down': return <TrendingDown className="w-3 h-3 text-teal-700" />;
 case 'stable': return <Minus className="w-3 h-3 text-titanium-400" />;
 default: return null;
 }
  };

  const getAdherenceColor = (adherence: number) => {
 if (adherence >= 90) return 'text-teal-700';
 if (adherence >= 80) return 'text-crimson-600';
 return 'text-medical-red-600';
  };

  if (collapsed) {
 return (
 <div className={`w-12 bg-white border border-titanium-200 rounded-l-2xl ${className}`}>
 <div className="p-3">
 <button
 onClick={onToggleCollapse}
 className="w-full h-8 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex items-center justify-center"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
  }

  return (
 <div className={`w-96 bg-white border border-titanium-200 rounded-l-2xl flex flex-col max-h-screen ${className}`}>
 {/* Header */}
 <div className="p-4 border-b border-titanium-200 flex-shrink-0">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <Heart className="w-5 h-5 text-medical-red-500" />
 <h2 className="font-semibold text-titanium-900">Clinical Context</h2>
 </div>
 {onToggleCollapse && (
 <button
 onClick={onToggleCollapse}
 className="p-1 text-titanium-500 hover:text-titanium-700 transition-colors duration-200"
 >
 <ChevronDown className="w-4 h-4" />
 </button>
 )}
 </div>
 
 <div className="text-sm text-titanium-600">
 <div className="font-medium">{mockPatientData.demographics.name}</div>
 <div>MRN: {mockPatientData.demographics.mrn} • Age: {mockPatientData.demographics.age} • {mockPatientData.demographics.gender}</div>
 </div>
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto">
 {/* Active Conditions */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('conditions')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Active Conditions</h3>
 {expandedSections.has('conditions') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('conditions') && (
 <div className="space-y-2">
 {mockPatientData.conditions.map((condition, index) => (
 <div key={condition.icd10} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-start justify-between mb-1">
 <div className="flex-1 text-sm font-medium text-titanium-900">
 {condition.condition}
 </div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(condition.severity)}`}>
 {condition.severity}
 </div>
 </div>
 <div className="text-xs text-titanium-600">
 <div>ICD-10: {condition.icd10}</div>
 <div>Since: {new Date(condition.onsetDate).toLocaleDateString()}</div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Current Medications */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('medications')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Current Medications</h3>
 {expandedSections.has('medications') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('medications') && (
 <div className="space-y-2">
 {mockPatientData.medications.map((med, index) => (
 <div key={med.name} className={`p-3 rounded-lg border ${
 med.gdmtPillar ? 'bg-porsche-50/50 border-porsche-200/50' : 'bg-white border-titanium-200'
 }`}>
 <div className="flex items-start justify-between mb-1">
 <div className="flex-1">
 <div className="text-sm font-medium text-titanium-900">
 {med.name} {med.dose}
 </div>
 <div className="text-xs text-titanium-600">
 {med.frequency} {med.route}
 </div>
 </div>
 <div className={`text-xs font-medium ${getAdherenceColor(med.adherence)}`}>
 {med.adherence}%
 </div>
 </div>
 
 {med.gdmtPillar && (
 <div className="mt-2">
 <div className="px-2 py-1 bg-porsche-500 text-white rounded text-xs font-medium inline-block">
 GDMT: {med.gdmtPillar}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Recent Labs */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('labs')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Recent Labs</h3>
 {expandedSections.has('labs') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('labs') && (
 <div className="space-y-2">
 {mockPatientData.labs.map((lab, index) => (
 <div key={lab.name} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-1">
 <div className="font-medium text-titanium-900 text-sm">{lab.name}</div>
 <div className="flex items-center gap-2">
 <span className={`font-bold text-sm ${getStatusColor(lab.status)}`}>
 {lab.value} {lab.unit}
 </span>
 {getTrendIcon(lab.trend)}
 </div>
 </div>
 <div className="text-xs text-titanium-600">
 <div>Ref: {lab.reference}</div>
 <div>{new Date(lab.date).toLocaleDateString()}</div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Recent Vitals */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('vitals')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Recent Vitals</h3>
 {expandedSections.has('vitals') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('vitals') && (
 <div className="grid grid-cols-2 gap-2">
 {mockPatientData.vitals.map((vital, index) => (
 <div key={vital.name} className="p-2 bg-white rounded-lg border border-titanium-200">
 <div className="text-xs text-titanium-600 mb-1">{vital.name}</div>
 <div className="flex items-center justify-between">
 <span className={`font-bold text-sm ${getStatusColor(vital.status)}`}>
 {vital.value} {vital.unit}
 </span>
 {getTrendIcon(vital.trend)}
 </div>
 <div className="text-xs text-titanium-500">
 {new Date(vital.date).toLocaleDateString()}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Active CQL Alerts */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('alerts')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Active Alerts</h3>
 {expandedSections.has('alerts') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('alerts') && (
 <div className="space-y-2">
 {mockPatientData.alerts.map((alert) => (
 <div key={alert.id} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <AlertTriangle className={`w-3 h-3 ${
 alert.severity === 'high' ? 'text-medical-red-500' :
 alert.severity === 'medium' ? 'text-crimson-500' :
 'text-porsche-500'
 }`} />
 <span className="text-sm font-medium text-titanium-900">{alert.title}</span>
 </div>
 <p className="text-xs text-titanium-700 mb-2">{alert.description}</p>
 </div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
 {alert.severity}
 </div>
 </div>
 
 <div className="flex items-center justify-between text-xs text-titanium-500">
 <span>Rule: {alert.rule}</span>
 <span>{alert.daysActive}d active</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Phenotype Screenings */}
 <div className="p-4 border-b border-titanium-200">
 <button
 onClick={() => toggleSection('phenotypes')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Phenotype Status</h3>
 {expandedSections.has('phenotypes') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('phenotypes') && (
 <div className="space-y-2">
 {mockPatientData.phenotypes.map((phenotype, index) => (
 <div key={phenotype.name} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-1">
 <div className="text-sm font-medium text-titanium-900">{phenotype.name}</div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${
 phenotype.status === 'confirmed' ? 'text-green-600 bg-green-50' :
 phenotype.status === 'pending' ? 'text-crimson-700 bg-crimson-100' :
 'text-titanium-600 bg-titanium-100'
 }`}>
 {phenotype.status}
 </div>
 </div>
 <div className="flex items-center justify-between text-xs text-titanium-600">
 <span>Confidence: {phenotype.confidence}%</span>
 <span>Screened: {new Date(phenotype.lastScreened).toLocaleDateString()}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Pending Referrals */}
 <div className="p-4">
 <button
 onClick={() => toggleSection('referrals')}
 className="flex items-center justify-between w-full mb-3 text-left"
 >
 <h3 className="font-medium text-titanium-900">Pending Referrals</h3>
 {expandedSections.has('referrals') ? (
 <ChevronDown className="w-4 h-4 text-titanium-500" />
 ) : (
 <ChevronRight className="w-4 h-4 text-titanium-500" />
 )}
 </button>
 
 {expandedSections.has('referrals') && (
 <div className="space-y-2">
 {mockPatientData.referrals.map((referral) => (
 <div key={referral.id} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex items-center justify-between mb-1">
 <div className="text-sm font-medium text-titanium-900">{referral.specialty}</div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${
 referral.status === 'scheduled' ? 'text-green-600 bg-green-50' :
 referral.status === 'pending' ? 'text-crimson-700 bg-crimson-100' :
 'text-titanium-600 bg-titanium-100'
 }`}>
 {referral.status}
 </div>
 </div>
 <div className="text-xs text-titanium-600">
 <div>Ordered: {new Date(referral.dateOrdered).toLocaleDateString()}</div>
 {referral.appointmentDate && (
 <div>Scheduled: {new Date(referral.appointmentDate).toLocaleDateString()}</div>
 )}
 <div>Provider: {referral.provider}</div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="p-4 border-t border-titanium-200 bg-white flex-shrink-0">
 <div className="text-xs text-titanium-600 text-center">
 Last updated: {new Date().toLocaleTimeString()}
 </div>
 </div>
 </div>
  );
};

export default ClinicalContextPanel;