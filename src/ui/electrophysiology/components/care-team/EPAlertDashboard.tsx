import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Zap, Clock, Activity, User, ChevronRight, Shield, Heart, Pill, AlertCircle, X, Thermometer, Droplets, Users, FileText, Calendar, CheckCircle } from 'lucide-react';

interface EPAlert {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  location: 'ED' | 'ICU' | 'Floor' | 'Tele';
  admitTime: string;
  chiefComplaint: string;
  cha2ds2vascScore?: number;
  hasbledScore?: number;
  arrhythmiaType: 'AF' | 'AFL' | 'VT' | 'VF' | 'Bradycardia';
  currentEPManagement: {
 anticoagulation: boolean;
 rateControl: boolean;
 rhythmControl: boolean;
 deviceTherapy: boolean;
  };
  treatmentGaps: string[];
  contraindications: string[];
  alertLevel: 'critical' | 'high' | 'medium';
  timeToIntervene: string;
  recommendations: string[];
  lastStrokeEvent?: string;
  strokeRisk: number;
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
 inr?: number;
 ptt?: number;
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
 coordinator?: string;
 };
 notes: string[];
 allergies: string[];
  };
}

const EPAlertDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<EPAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<EPAlert | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
 // Mock data - would be replaced with real-time data
 const mockAlerts: EPAlert[] = [
 {
 id: 'A001',
 patientName: 'Johnson, Mary',
 mrn: 'MRN001',
 age: 72,
 location: 'ED',
 admitTime: '2024-01-15 14:30',
 chiefComplaint: 'Rapid heart rate, palpitations',
 cha2ds2vascScore: 6,
 hasbledScore: 3,
 arrhythmiaType: 'AF',
 currentEPManagement: {
 anticoagulation: false,
 rateControl: false,
 rhythmControl: false,
 deviceTherapy: false,
 },
 treatmentGaps: ['No anticoagulation', 'No rate control'],
 contraindications: [],
 alertLevel: 'critical',
 timeToIntervene: '< 4 hours',
 strokeRisk: 8.5,
 recommendations: [
 'Initiate anticoagulation therapy',
 'Start rate control medication',
 'EP consultation within 24h'
 ]
 },
 {
 id: 'A002',
 patientName: 'Williams, Robert',
 mrn: 'MRN002',
 age: 65,
 location: 'ICU',
 admitTime: '2024-01-15 10:15',
 chiefComplaint: 'VT storm',
 cha2ds2vascScore: 2,
 hasbledScore: 2,
 arrhythmiaType: 'VT',
 currentEPManagement: {
 anticoagulation: true,
 rateControl: true,
 rhythmControl: false,
 deviceTherapy: false,
 },
 treatmentGaps: ['Antiarrhythmic not started', 'ICD evaluation needed'],
 contraindications: [],
 alertLevel: 'critical',
 timeToIntervene: 'Immediate',
 strokeRisk: 4.2,
 recommendations: [
 'Emergency EP consultation',
 'Consider antiarrhythmic therapy',
 'Urgent ICD evaluation'
 ]
 },
 {
 id: 'A003',
 patientName: 'Davis, Patricia',
 mrn: 'MRN003',
 age: 58,
 location: 'Tele',
 admitTime: '2024-01-15 08:45',
 chiefComplaint: 'Bradycardia, syncope',
 cha2ds2vascScore: 1,
 hasbledScore: 1,
 arrhythmiaType: 'Bradycardia',
 currentEPManagement: {
 anticoagulation: false,
 rateControl: false,
 rhythmControl: false,
 deviceTherapy: false,
 },
 treatmentGaps: ['Pacemaker evaluation needed'],
 contraindications: [],
 alertLevel: 'high',
 timeToIntervene: '12-24 hours',
 strokeRisk: 2.1,
 recommendations: [
 'Pacemaker evaluation',
 'EP consultation',
 'Telemetry monitoring'
 ]
 }
 ];

 setAlerts(mockAlerts);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
 if (filterLevel === 'all') return true;
 return alert.alertLevel === filterLevel;
  });

  const getAlertColor = (level: string) => {
 switch(level) {
 case 'critical': return 'border-red-500 bg-red-50';
 case 'high': return 'border-amber-500 bg-amber-50';
 case 'medium': return 'border-yellow-500 bg-yellow-50';
 default: return 'border-gray-300 bg-gray-50';
 }
  };

  const getAlertIcon = (level: string) => {
 switch(level) {
 case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
 case 'high': return <AlertCircle className="w-5 h-5 text-amber-600" />;
 case 'medium': return <Bell className="w-5 h-5 text-yellow-600" />;
 default: return <Bell className="w-5 h-5 text-gray-600" />;
 }
  };

  return (
 <>
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Bell className="w-5 h-5 text-red-500" />
 EP Real-Time Alerts
 </h3>
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
 <span className="text-sm text-titanium-700 font-medium">{filteredAlerts.length} active</span>
 </div>
 </div>
 </div>

 <div className="flex gap-3 flex-wrap">
 <select
 value={filterLevel}
 onChange={(e) => setFilterLevel(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-titanium-500 bg-white"
 >
 <option value="all">All Alerts</option>
 <option value="critical">Critical</option>
 <option value="high">High Priority</option>
 <option value="medium">Medium Priority</option>
 </select>
 </div>
 </div>

 <div className="divide-y divide-white/20 max-h-96 overflow-y-auto">
 {filteredAlerts.map((alert) => (
 <div key={alert.id} className={`px-6 py-4 hover:bg-titanium-50 transition-colors cursor-pointer border-l-4 ${getAlertColor(alert.alertLevel)}`}
 onClick={() => setSelectedAlert(alert)}>
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 {getAlertIcon(alert.alertLevel)}
 <div>
 <div className="font-semibold text-titanium-900">{alert.patientName}</div>
 <div className="text-sm text-titanium-600">MRN: {alert.mrn} • Age {alert.age} • {alert.location}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-600">Stroke Risk</div>
 <div className="text-lg font-bold text-red-800">{alert.strokeRisk}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Arrhythmia</div>
 <div className="font-medium text-titanium-800">{alert.arrhythmiaType}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Time to Intervene</div>
 <div className="font-medium text-red-700">{alert.timeToIntervene}</div>
 </div>
 </div>

 <div className="text-sm text-titanium-800 mb-2">
 <span className="font-medium">Chief Complaint:</span> {alert.chiefComplaint}
 </div>

 {alert.treatmentGaps.length > 0 && (
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Treatment Gaps</div>
 <div className="flex flex-wrap gap-1">
 {alert.treatmentGaps.map((gap, index) => (
 <span key={gap} className="px-2 py-1 bg-amber-100 text-amber-900 text-xs rounded border border-amber-300">
 {gap}
 </span>
 ))}
 </div>
 </div>
 )}

 <div className="flex justify-between items-center">
 <div className="text-xs text-titanium-600">
 Admitted: {new Date(alert.admitTime).toLocaleString()}
 </div>
 <div className="flex items-center gap-1 text-sm text-porsche-600 hover:text-porsche-700">
 <span>View Details</span>
 <ChevronRight className="w-4 h-4" />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Alert Detail Modal */}
 {selectedAlert && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
 <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-titanium-50 to-white">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-3">
 {getAlertIcon(selectedAlert.alertLevel)}
 <div>
 <h2 className="text-2xl font-bold text-gray-900">{selectedAlert.patientName}</h2>
 <div className="text-sm text-gray-600">MRN: {selectedAlert.mrn} • {selectedAlert.location}</div>
 </div>
 </div>
 </div>
 <button 
 onClick={() => setSelectedAlert(null)}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <X className="w-6 h-6 text-gray-500" />
 </button>
 </div>

 <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
 <div className="grid grid-cols-2 gap-6 mb-6">
 <div className="space-y-4">
 <div>
 <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
 <ul className="space-y-2">
 {selectedAlert.recommendations.map((rec, index) => (
 <li key={rec} className="flex items-start gap-2">
 <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
 <span className="text-sm text-gray-700">{rec}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="space-y-4">
 <div>
 <h3 className="font-semibold text-gray-900 mb-2">Risk Scores</h3>
 <div className="space-y-2">
 {selectedAlert.cha2ds2vascScore && (
 <div className="flex justify-between">
 <span className="text-sm text-gray-600">CHA₂DS₂-VASc:</span>
 <span className="font-medium">{selectedAlert.cha2ds2vascScore}</span>
 </div>
 )}
 {selectedAlert.hasbledScore && (
 <div className="flex justify-between">
 <span className="text-sm text-gray-600">HAS-BLED:</span>
 <span className="font-medium">{selectedAlert.hasbledScore}</span>
 </div>
 )}
 <div className="flex justify-between">
 <span className="text-sm text-gray-600">Stroke Risk:</span>
 <span className="font-bold text-red-600">{selectedAlert.strokeRisk}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-4 border-t border-gray-200">
 <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
 <Zap className="w-4 h-4" />
 Emergency EP Consult
 </button>
 <button className="flex items-center gap-2 px-4 py-2 bg-chrome-600 text-white rounded-lg hover:bg-chrome-700 transition-colors">
 <Calendar className="w-4 h-4" />
 Schedule EP
 </button>
 <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
 <FileText className="w-4 h-4" />
 Generate Orders
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
  );
};

export default EPAlertDashboard;