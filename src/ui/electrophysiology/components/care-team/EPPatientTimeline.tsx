import React, { useState } from 'react';
import { Calendar, Clock, Activity, Pill, Zap, Heart, FileText, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'EKG' | 'Holter' | 'Echo' | 'Anticoag_Lab' | 'EP_Visit' | 'Ablation' | 'Device' | 'Medication';
  title: string;
  description: string;
  provider: string;
  important: boolean;
  results?: {
 key: string;
 value: string;
 normal: boolean;
  }[];
}

interface EPPatientTimelineProps {
  patientId: string;
  patientName: string;
}

const EPPatientTimeline: React.FC<EPPatientTimelineProps> = ({ patientId, patientName }) => {
  const [events] = useState<TimelineEvent[]>([
 {
 id: 'E001',
 date: '2024-01-15',
 type: 'EP_Visit',
 title: 'EP Consultation',
 description: 'Initial EP evaluation for symptomatic AF',
 provider: 'Dr. Johnson',
 important: true,
 results: [
 { key: 'CHA₂DS₂-VASc', value: '4', normal: false },
 { key: 'HAS-BLED', value: '2', normal: true }
 ]
 },
 {
 id: 'E002',
 date: '2024-01-12',
 type: 'Holter',
 title: '48-Hour Holter Monitor',
 description: 'Continuous rhythm monitoring',
 provider: 'EP Lab',
 important: false,
 results: [
 { key: 'AF Burden', value: '35%', normal: false },
 { key: 'Max HR', value: '145 bpm', normal: false },
 { key: 'Min HR', value: '45 bpm', normal: true }
 ]
 },
 {
 id: 'E003',
 date: '2024-01-10',
 type: 'Anticoag_Lab',
 title: 'INR Check',
 description: 'Warfarin monitoring',
 provider: 'Lab',
 important: true,
 results: [
 { key: 'INR', value: '2.8', normal: true },
 { key: 'PT', value: '28.5 sec', normal: true }
 ]
 },
 {
 id: 'E004',
 date: '2024-01-08',
 type: 'EKG',
 title: '12-Lead EKG',
 description: 'Rhythm assessment',
 provider: 'EP Clinic',
 important: false,
 results: [
 { key: 'Rhythm', value: 'AF', normal: false },
 { key: 'Rate', value: '98 bpm', normal: true }
 ]
 },
 {
 id: 'E005',
 date: '2024-01-05',
 type: 'Medication',
 title: 'Medication Adjustment',
 description: 'Started metoprolol for rate control',
 provider: 'Dr. Johnson',
 important: true
 },
 {
 id: 'E006',
 date: '2024-01-01',
 type: 'Echo',
 title: 'Echocardiogram',
 description: 'Structural heart assessment',
 provider: 'Cardiology',
 important: false,
 results: [
 { key: 'EF', value: '55%', normal: true },
 { key: 'LA Size', value: 'Mildly dilated', normal: false }
 ]
 }
  ]);

  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const getEventIcon = (type: string) => {
 switch(type) {
 case 'EKG': return <Activity className="w-4 h-4" />;
 case 'Holter': return <Heart className="w-4 h-4" />;
 case 'Echo': return <Heart className="w-4 h-4" />;
 case 'Anticoag_Lab': return <Pill className="w-4 h-4" />;
 case 'EP_Visit': return <FileText className="w-4 h-4" />;
 case 'Ablation': return <Zap className="w-4 h-4" />;
 case 'Device': return <Activity className="w-4 h-4" />;
 case 'Medication': return <Pill className="w-4 h-4" />;
 default: return <Calendar className="w-4 h-4" />;
 }
  };

  const getEventColor = (type: string) => {
 switch(type) {
 case 'EKG': return 'bg-green-100 text-green-700 border-green-300';
 case 'Holter': return 'bg-chrome-100 text-chrome-700 border-chrome-300';
 case 'Echo': return 'bg-arterial-100 text-arterial-700 border-arterial-300';
 case 'Anticoag_Lab': return 'bg-red-100 text-red-700 border-red-300';
 case 'EP_Visit': return 'bg-chrome-100 text-chrome-700 border-chrome-300';
 case 'Ablation': return 'bg-amber-100 text-amber-700 border-amber-300';
 case 'Device': return 'bg-gray-100 text-gray-700 border-gray-300';
 case 'Medication': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
 default: return 'bg-gray-100 text-gray-700 border-gray-300';
 }
  };

  return (
 <>
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Clock className="w-5 h-5 text-chrome-600" />
 EP Patient Timeline - {patientName}
 </h3>
 <p className="text-sm text-titanium-600 mt-1">Recent EP-related events and interventions</p>
 </div>

 <div className="p-6 max-h-80 overflow-y-auto">
 <div className="space-y-4">
 {events.map((event, index) => (
 <div key={event.id} className="relative">
 {index !== events.length - 1 && (
 <div className="absolute left-6 top-12 w-px h-8 bg-titanium-200"></div>
 )}
 
 <div 
 className="flex items-start gap-4 cursor-pointer hover:bg-titanium-50 p-3 rounded-lg transition-colors"
 onClick={() => setSelectedEvent(event)}
 >
 <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${getEventColor(event.type)}`}>
 {getEventIcon(event.type)}
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between mb-1">
 <div>
 <div className="flex items-center gap-2">
 <h4 className="text-sm font-semibold text-titanium-900">{event.title}</h4>
 {event.important && <AlertCircle className="w-3 h-3 text-amber-500" />}
 </div>
 <p className="text-sm text-titanium-600">{event.description}</p>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-500">{new Date(event.date).toLocaleDateString()}</div>
 <div className="text-xs text-titanium-500">{event.provider}</div>
 </div>
 </div>
 
 {event.results && event.results.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2">
 {event.results.slice(0, 2).map((result, resultIndex) => (
 <span 
 key={resultIndex}
 className={`px-2 py-1 text-xs rounded border ${
 result.normal 
 ? 'bg-green-50 text-green-700 border-green-200' 
 : 'bg-red-50 text-red-700 border-red-200'
 }`}
 >
 {result.key}: {result.value}
 </span>
 ))}
 {event.results.length > 2 && (
 <span className="px-2 py-1 text-xs rounded bg-titanium-50 text-titanium-600 border border-titanium-200">
 +{event.results.length - 2} more
 </span>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Event Detail Modal */}
 {selectedEvent && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
 <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-titanium-50 to-white">
 <div className="flex items-center gap-3">
 <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getEventColor(selectedEvent.type)}`}>
 {getEventIcon(selectedEvent.type)}
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
 <div className="text-sm text-gray-600">{new Date(selectedEvent.date).toLocaleDateString()} • {selectedEvent.provider}</div>
 </div>
 </div>
 <button 
 onClick={() => setSelectedEvent(null)}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <AlertCircle className="w-6 h-6 text-gray-500" />
 </button>
 </div>

 <div className="p-6">
 <div className="mb-4">
 <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
 <p className="text-gray-700">{selectedEvent.description}</p>
 </div>

 {selectedEvent.results && selectedEvent.results.length > 0 && (
 <div>
 <h3 className="font-semibold text-gray-900 mb-3">Results</h3>
 <div className="grid grid-cols-2 gap-3">
 {selectedEvent.results.map((result, index) => (
 <div
 key={`${result.key}-${result.value}`}
 className={`p-3 rounded-lg border ${
 result.normal 
 ? 'bg-green-50 border-green-200' 
 : 'bg-red-50 border-red-200'
 }`}
 >
 <div className="text-sm font-medium text-gray-900">{result.key}</div>
 <div className={`text-lg font-bold ${
 result.normal ? 'text-green-700' : 'text-red-700'
 }`}>
 {result.value}
 </div>
 <div className={`text-xs ${
 result.normal ? 'text-green-600' : 'text-red-600'
 }`}>
 {result.normal ? 'Normal' : 'Abnormal'}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="flex gap-3 pt-4 mt-4 border-t border-gray-200">
 <button 
 onClick={() => setSelectedEvent(null)}
 className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
 >
 Close
 </button>
 <button className="px-4 py-2 bg-chrome-600 text-white rounded-lg hover:bg-chrome-700 transition-colors">
 Add Follow-up
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
  );
};

export default EPPatientTimeline;