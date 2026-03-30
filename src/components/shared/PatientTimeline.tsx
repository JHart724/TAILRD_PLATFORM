import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Heart,
  Activity,
  Pill,
  TestTube,
  Image,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Filter,
  Clock,
  MapPin,
  User,
  FileText,
  Zap
} from 'lucide-react';

// Mock patient timeline data
const mockTimelineEvents = [
  {
 id: 'E001',
 date: '2024-02-11',
 time: '14:30',
 type: 'alert',
 module: 'heartFailure',
 title: 'GDMT Optimization Alert',
 description: 'Patient eligible for ACE inhibitor initiation based on current EF 35%',
 details: {
 cqlRule: 'HF_GDMT_ACE_ELIGIBLE',
 confidence: 92,
 recommendation: 'Consider initiating lisinopril 2.5mg daily',
 contraindications: 'None identified'
 },
 provider: 'System Generated',
 status: 'active'
  },
  {
 id: 'E002',
 date: '2024-02-10',
 time: '09:15',
 type: 'medication',
 module: 'heartFailure',
 title: 'Medication Change - Carvedilol',
 description: 'Increased carvedilol from 12.5mg BID to 25mg BID',
 details: {
 medication: 'Carvedilol',
 change: '12.5mg BID → 25mg BID',
 reason: 'Beta-blocker optimization per HF guidelines',
 prescriber: 'Dr. Sarah Chen'
 },
 provider: 'Dr. Sarah Chen',
 status: 'completed'
  },
  {
 id: 'E003',
 date: '2024-02-09',
 time: '11:45',
 type: 'lab',
 module: 'heartFailure',
 title: 'Laboratory Results',
 description: 'BNP, electrolytes, and renal function panel',
 details: {
 results: [
 { name: 'BNP', value: '450', unit: 'pg/mL', reference: '<100', status: 'high' },
 { name: 'Creatinine', value: '1.1', unit: 'mg/dL', reference: '0.6-1.3', status: 'normal' },
 { name: 'Potassium', value: '4.2', unit: 'mEq/L', reference: '3.5-5.0', status: 'normal' },
 { name: 'eGFR', value: '68', unit: 'mL/min/1.73m²', reference: '>60', status: 'normal' }
 ]
 },
 provider: 'Lab Services',
 status: 'completed'
  },
  {
 id: 'E004',
 date: '2024-02-08',
 time: '13:20',
 type: 'procedure',
 module: 'structural',
 title: 'Echocardiogram',
 description: 'Transthoracic echo with Doppler',
 details: {
 findings: [
 'Left ventricular ejection fraction: 35%',
 'Moderate mitral regurgitation',
 'Mild tricuspid regurgitation',
 'Pulmonary artery systolic pressure: 45 mmHg'
 ],
 conclusion: 'Reduced LVEF with moderate MR'
 },
 provider: 'Echo Lab',
 status: 'completed'
  },
  {
 id: 'E005',
 date: '2024-02-07',
 time: '10:00',
 type: 'visit',
 module: 'heartFailure',
 title: 'Cardiology Follow-up',
 description: 'Heart failure management and medication optimization',
 details: {
 chiefComplaint: 'Shortness of breath on exertion',
 assessment: 'Heart failure with reduced ejection fraction, NYHA Class II',
 plan: [
 'Increase beta-blocker as tolerated',
 'Continue diuretic therapy',
 'Order follow-up BNP',
 'Patient education on daily weights'
 ]
 },
 provider: 'Dr. Sarah Chen',
 status: 'completed'
  },
  {
 id: 'E006',
 date: '2024-02-05',
 time: '16:45',
 type: 'imaging',
 module: 'coronary',
 title: 'Cardiac Catheterization',
 description: 'Left heart catheterization with coronary angiography',
 details: {
 findings: [
 'Left main: Normal',
 'LAD: 70% mid-vessel stenosis',
 'LCX: 40% proximal stenosis',
 'RCA: Normal'
 ],
 intervention: 'PCI with DES to LAD',
 complications: 'None'
 },
 provider: 'Dr. Michael Rodriguez',
 status: 'completed'
  },
  {
 id: 'E007',
 date: '2024-02-01',
 time: '08:30',
 type: 'admission',
 module: 'heartFailure',
 title: 'Hospital Admission',
 description: 'Admitted for acute heart failure exacerbation',
 details: {
 admissionDiagnosis: 'Acute on chronic heart failure',
 symptoms: 'Dyspnea, orthopnea, lower extremity edema',
 vitals: {
 bp: '145/92',
 hr: '98',
 rr: '22',
 o2sat: '92% on RA'
 }
 },
 provider: 'Emergency Department',
 status: 'completed'
  },
  {
 id: 'E008',
 date: '2024-01-15',
 time: '14:15',
 type: 'diagnosis',
 module: 'heartFailure',
 title: 'New Diagnosis',
 description: 'Heart failure with reduced ejection fraction',
 details: {
 icd10: 'I50.9',
 description: 'Heart failure, unspecified',
 supportingEvidence: [
 'Echocardiogram showing EF 35%',
 'BNP 1240 pg/mL',
 'Clinical presentation consistent with HF'
 ]
 },
 provider: 'Dr. Sarah Chen',
 status: 'active'
  }
];

const eventTypeConfig = {
  alert: {
 icon: AlertTriangle,
 color: 'bg-medical-red-500',
 bgColor: 'bg-medical-red-50',
 textColor: 'text-medical-red-700'
  },
  medication: {
 icon: Pill,
 color: 'bg-porsche-500',
 bgColor: 'bg-porsche-50',
 textColor: 'text-porsche-700'
  },
  lab: {
 icon: TestTube,
 color: 'bg-[#2C4A60]',
 bgColor: 'bg-[#f0f5fa]',
 textColor: 'text-[#2C4A60]'
  },
  procedure: {
 icon: Activity,
 color: 'bg-arterial-500',
 bgColor: 'bg-arterial-50',
 textColor: 'text-arterial-700'
  },
  imaging: {
 icon: Image,
 color: 'bg-crimson-500',
 bgColor: 'bg-crimson-50',
 textColor: 'text-crimson-700'
  },
  visit: {
 icon: User,
 color: 'bg-[#2C4A60]',
 bgColor: 'bg-[#f0f5fa]',
 textColor: 'text-[#2C4A60]'
  },
  admission: {
 icon: MapPin,
 color: 'bg-medical-red-600',
 bgColor: 'bg-medical-red-50',
 textColor: 'text-medical-red-700'
  },
  diagnosis: {
 icon: FileText,
 color: 'bg-titanium-600',
 bgColor: 'bg-titanium-50',
 textColor: 'text-titanium-700'
  }
};

const moduleColors = {
  heartFailure: 'border-l-porsche-400',
  structural: 'border-l-arterial-400',
  ep: 'border-l-[#4A6880]',
  vascular: 'border-l-[#4A6880]',
  valvular: 'border-l-crimson-400',
  coronary: 'border-l-medical-red-400'
};

interface PatientTimelineProps {
  patientId?: string;
  className?: string;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ patientId, className = '' }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [zoomLevel, setZoomLevel] = useState('month'); // day, week, month, year
  const [dateRange, setDateRange] = useState({
 start: '2024-01-01',
 end: '2024-02-11'
  });

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
 return mockTimelineEvents.filter(event => {
 if (selectedModule !== 'all' && event.module !== selectedModule) return false;
 if (selectedEventType !== 'all' && event.type !== selectedEventType) return false;
 
 const eventDate = new Date(event.date);
 const startDate = new Date(dateRange.start);
 const endDate = new Date(dateRange.end);
 
 return eventDate >= startDate && eventDate <= endDate;
 });
  }, [selectedModule, selectedEventType, dateRange]);

  const toggleEventExpansion = (eventId: string) => {
 const newExpanded = new Set(expandedEvents);
 if (newExpanded.has(eventId)) {
 newExpanded.delete(eventId);
 } else {
 newExpanded.add(eventId);
 }
 setExpandedEvents(newExpanded);
  };

  const adjustDateRange = (direction: 'prev' | 'next') => {
 const start = new Date(dateRange.start);
 const end = new Date(dateRange.end);
 const diff = end.getTime() - start.getTime();
 
 if (direction === 'prev') {
 start.setTime(start.getTime() - diff);
 end.setTime(end.getTime() - diff);
 } else {
 start.setTime(start.getTime() + diff);
 end.setTime(end.getTime() + diff);
 }
 
 setDateRange({
 start: start.toISOString().split('T')[0],
 end: end.toISOString().split('T')[0]
 });
  };

  const getLabStatusColor = (status: string) => {
 switch (status) {
 case 'high': return 'text-medical-red-600';
 case 'low': return 'text-porsche-600';
 case 'critical': return 'text-medical-red-700 font-bold';
 default: return 'text-[#2C4A60]';
 }
  };

  const formatDate = (date: string, time?: string) => {
 const d = new Date(date + (time ? `T${time}` : ''));
 return {
 date: d.toLocaleDateString('en-US', { 
 weekday: 'short', 
 month: 'short', 
 day: 'numeric',
 year: 'numeric'
 }),
 time: time ? d.toLocaleTimeString('en-US', { 
 hour: 'numeric', 
 minute: '2-digit',
 hour12: true
 }) : null
 };
  };

  return (
 <div className={`space-y-6 ${className}`}>
 {/* Header and Controls */}
 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-gradient-to-br from-porsche-500 to-porsche-600 rounded-2xl shadow-lg">
 <Clock className="w-8 h-8 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-titanium-900">Patient Clinical Timeline</h1>
 <p className="text-titanium-600">Cardiovascular care journey and key events</p>
 </div>
 </div>
 
 <div className="flex items-center gap-2">
 <span className="text-sm text-titanium-600">{filteredEvents.length} events</span>
 </div>
 </div>

 {/* Filters and Controls */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Module</label>
 <select
 value={selectedModule}
 onChange={(e) => setSelectedModule(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="all">All Modules</option>
 <option value="heartFailure">Heart Failure</option>
 <option value="coronary">Coronary</option>
 <option value="structural">Structural</option>
 <option value="ep">Electrophysiology</option>
 <option value="vascular">Vascular</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Event Type</label>
 <select
 value={selectedEventType}
 onChange={(e) => setSelectedEventType(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="all">All Types</option>
 <option value="alert">Alerts</option>
 <option value="medication">Medications</option>
 <option value="lab">Lab Results</option>
 <option value="procedure">Procedures</option>
 <option value="imaging">Imaging</option>
 <option value="visit">Visits</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Start Date</label>
 <input
 type="date"
 value={dateRange.start}
 onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">End Date</label>
 <input
 type="date"
 value={dateRange.end}
 onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Zoom</label>
 <select
 value={zoomLevel}
 onChange={(e) => setZoomLevel(e.target.value)}
 className="w-full px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="day">Day View</option>
 <option value="week">Week View</option>
 <option value="month">Month View</option>
 <option value="year">Year View</option>
 </select>
 </div>
 
 <div className="flex items-end gap-2">
 <button
 onClick={() => adjustDateRange('prev')}
 className="px-3 py-2 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex-1"
 >
 ←
 </button>
 <button
 onClick={() => adjustDateRange('next')}
 className="px-3 py-2 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex-1"
 >
 →
 </button>
 </div>
 </div>
 </div>

 {/* Timeline */}
 <div className="metal-card p-6 bg-white border border-titanium-200">
 <div className="relative">
 {/* Timeline Line */}
 <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-porsche-200 via-porsche-300 to-porsche-200" />
 
 {/* Timeline Events */}
 <div className="space-y-6">
 {filteredEvents.map((event, index) => {
 const isExpanded = expandedEvents.has(event.id);
 const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig];
 const IconComponent = config.icon;
 const formatted = formatDate(event.date, event.time);
 
 return (
 <div key={event.id} className="relative flex items-start gap-6">
 {/* Timeline Node */}
 <div className="relative z-10 flex-shrink-0">
 <div className={`w-12 h-12 ${config.color} rounded-2xl shadow-lg flex items-center justify-center`}>
 <IconComponent className="w-6 h-6 text-white" />
 </div>
 {event.type === 'alert' && (
 <div className="absolute -top-1 -right-1 w-4 h-4 bg-medical-red-500 rounded-full flex items-center justify-center">
 <Zap className="w-2 h-2 text-white" />
 </div>
 )}
 </div>
 
 {/* Event Content */}
 <div className={`flex-1 min-w-0 p-5 rounded-xl border-l-4 transition-all duration-200 cursor-pointer hover:shadow-lg ${
 moduleColors[event.module as keyof typeof moduleColors] || 'border-l-titanium-400'
 } ${isExpanded ? 'bg-white shadow-lg' : 'bg-white'} border border-titanium-200`}
 onClick={() => toggleEventExpansion(event.id)}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <h3 className="text-lg font-semibold text-titanium-900">{event.title}</h3>
 <div className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
 {event.type}
 </div>
 {event.type === 'alert' && (
 <div className="px-2 py-1 bg-medical-red-100 text-medical-red-700 rounded text-xs font-medium">
 CQL Rule
 </div>
 )}
 </div>
 
 <p className="text-titanium-700 mb-3">{event.description}</p>
 
 <div className="flex items-center gap-4 text-sm text-titanium-600">
 <div className="flex items-center gap-1">
 <Calendar className="w-4 h-4" />
 <span>{formatted.date}</span>
 {formatted.time && <span>at {formatted.time}</span>}
 </div>
 <div className="flex items-center gap-1">
 <User className="w-4 h-4" />
 <span>{event.provider}</span>
 </div>
 </div>
 </div>
 
 <div className="flex items-center gap-2 ml-4">
 {isExpanded ? (
 <ChevronDown className="w-5 h-5 text-titanium-400" />
 ) : (
 <ChevronRight className="w-5 h-5 text-titanium-400" />
 )}
 </div>
 </div>
 
 {/* Expanded Details */}
 {isExpanded && event.details && (
 <div className="mt-4 pt-4 border-t border-titanium-200">
 {/* Alert Details */}
 {event.type === 'alert' && event.details.cqlRule && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">CQL Rule Details</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-titanium-600">Rule ID:</span>
 <span className="font-mono text-titanium-800">{event.details.cqlRule}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Confidence:</span>
 <span className="font-medium text-titanium-800">{event.details.confidence}%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Status:</span>
 <span className={`font-medium ${
 event.status === 'active' ? 'text-medical-red-600' : 'text-[#2C4A60]'
 }`}>{event.status}</span>
 </div>
 </div>
 </div>
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">Recommendation</h4>
 <p className="text-sm text-titanium-700 mb-2">{event.details.recommendation}</p>
 <div className="text-xs text-titanium-600">
 <strong>Contraindications:</strong> {event.details.contraindications}
 </div>
 </div>
 </div>
 )}
 
 {/* Lab Results */}
 {event.type === 'lab' && event.details.results && (
 <div>
 <h4 className="font-medium text-titanium-900 mb-3">Lab Results</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {event.details.results.map((result: any, i: number) => (
 <div key={result.name} className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="flex justify-between items-center">
 <span className="font-medium text-titanium-900">{result.name}</span>
 <span className={`font-bold ${getLabStatusColor(result.status)}`}>
 {result.value} {result.unit}
 </span>
 </div>
 <div className="text-xs text-titanium-600 mt-1">
 Reference: {result.reference}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 
 {/* Procedure/Imaging Findings */}
 {(event.type === 'procedure' || event.type === 'imaging') && event.details.findings && (
 <div>
 <h4 className="font-medium text-titanium-900 mb-3">Findings</h4>
 <ul className="space-y-1">
 {event.details.findings.map((finding: string, i: number) => (
 <li key={finding} className="text-sm text-titanium-700 flex items-start gap-2">
 <div className="w-1.5 h-1.5 bg-porsche-400 rounded-full mt-2 flex-shrink-0" />
 {finding}
 </li>
 ))}
 </ul>
 {event.details.conclusion && (
 <div className="mt-3 p-3 bg-porsche-50 rounded-lg border border-porsche-200">
 <div className="font-medium text-porsche-900 mb-1">Conclusion</div>
 <div className="text-sm text-porsche-700">{event.details.conclusion}</div>
 </div>
 )}
 </div>
 )}
 
 {/* Medication Details */}
 {event.type === 'medication' && event.details.medication && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">Medication Change</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-titanium-600">Drug:</span>
 <span className="font-medium text-titanium-800">{event.details.medication}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Change:</span>
 <span className="font-medium text-titanium-800">{event.details.change}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Prescriber:</span>
 <span className="font-medium text-titanium-800">{event.details.prescriber}</span>
 </div>
 </div>
 </div>
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">Clinical Reason</h4>
 <p className="text-sm text-titanium-700">{event.details.reason}</p>
 </div>
 </div>
 )}
 
 {/* Visit Details */}
 {event.type === 'visit' && event.details.plan && (
 <div>
 <h4 className="font-medium text-titanium-900 mb-3">Assessment & Plan</h4>
 <div className="mb-3">
 <div className="text-sm font-medium text-titanium-800 mb-1">Assessment:</div>
 <div className="text-sm text-titanium-700">{event.details.assessment}</div>
 </div>
 <div>
 <div className="text-sm font-medium text-titanium-800 mb-2">Plan:</div>
 <ul className="space-y-1">
 {event.details.plan.map((item: string, i: number) => (
 <li key={item} className="text-sm text-titanium-700 flex items-start gap-2">
 <div className="w-1.5 h-1.5 bg-[#4A6880] rounded-full mt-2 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}
 
 {filteredEvents.length === 0 && (
 <div className="text-center py-12">
 <Clock className="w-12 h-12 text-titanium-300 mx-auto mb-4" />
 <div className="text-lg font-medium text-titanium-500">No events found</div>
 <div className="text-sm text-titanium-400">Try adjusting your filters or date range</div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
  );
};

export default PatientTimeline;