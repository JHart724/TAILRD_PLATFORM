import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, ChevronRight, AlertCircle } from 'lucide-react';

interface FollowUpItem {
  id: string;
  patientName: string;
  mrn: string;
  followUpType: 'Post-Ablation' | 'Device Check' | 'Anticoagulation Monitoring' | 'Routine EP';
  scheduledDate: string;
  provider: string;
  priority: 'overdue' | 'due_soon' | 'scheduled';
  notes: string;
  lastContact?: string;
}

const EPFollowUpQueue: React.FC = () => {
  const [followUps] = useState<FollowUpItem[]>([
 {
 id: 'F001',
 patientName: 'Johnson, Mary',
 mrn: 'MRN001',
 followUpType: 'Post-Ablation',
 scheduledDate: '2024-01-16',
 provider: 'Dr. Johnson',
 priority: 'due_soon',
 notes: '3-month post AF ablation follow-up',
 lastContact: '2024-01-10'
 },
 {
 id: 'F002',
 patientName: 'Williams, Robert',
 mrn: 'MRN002',
 followUpType: 'Device Check',
 scheduledDate: '2024-01-14',
 provider: 'Device Clinic',
 priority: 'overdue',
 notes: 'ICD interrogation due',
 lastContact: '2024-01-05'
 },
 {
 id: 'F003',
 patientName: 'Davis, Patricia',
 mrn: 'MRN003',
 followUpType: 'Anticoagulation Monitoring',
 scheduledDate: '2024-01-18',
 provider: 'Dr. Smith',
 priority: 'scheduled',
 notes: 'INR check and warfarin adjustment',
 lastContact: '2024-01-12'
 },
 {
 id: 'F004',
 patientName: 'Brown, James',
 mrn: 'MRN004',
 followUpType: 'Routine EP',
 scheduledDate: '2024-01-20',
 provider: 'Dr. Brown',
 priority: 'scheduled',
 notes: 'AF follow-up, rate control assessment',
 lastContact: '2024-01-08'
 }
  ]);

  const [filter, setFilter] = useState<string>('all');

  const filteredFollowUps = followUps.filter(item => {
 if (filter === 'all') return true;
 return item.priority === filter;
  });

  const getPriorityColor = (priority: string) => {
 switch(priority) {
 case 'overdue': return 'bg-red-100 text-red-900 border-red-400';
 case 'due_soon': return 'bg-[#FAF6E8] text-[#8B6914] border-[#C8D4DC]';
 case 'scheduled': return 'bg-[#F0F7F4] text-[#2D6147] border-[#2C4A60]';
 default: return 'bg-gray-100 text-gray-900 border-gray-400';
 }
  };

  const getPriorityIcon = (priority: string) => {
 switch(priority) {
 case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
 case 'due_soon': return <Clock className="w-4 h-4 text-[#6B7280]" />;
 case 'scheduled': return <Calendar className="w-4 h-4 text-[#2C4A60]" />;
 default: return <Calendar className="w-4 h-4 text-gray-600" />;
 }
  };

  const formatPriority = (priority: string) => {
 switch(priority) {
 case 'overdue': return 'OVERDUE';
 case 'due_soon': return 'DUE SOON';
 case 'scheduled': return 'SCHEDULED';
 default: return priority.toUpperCase();
 }
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-chrome-600" />
 EP Follow-Up Queue
 </h3>
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700 font-medium">{filteredFollowUps.length} appointments</span>
 </div>
 </div>

 <div className="flex gap-3 flex-wrap">
 <select
 value={filter}
 onChange={(e) => setFilter(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-titanium-500 bg-white"
 >
 <option value="all">All Follow-ups</option>
 <option value="overdue">Overdue</option>
 <option value="due_soon">Due Soon</option>
 <option value="scheduled">Scheduled</option>
 </select>
 </div>
 </div>

 <div className="divide-y divide-white/20 max-h-80 overflow-y-auto">
 {filteredFollowUps.map((item) => (
 <div key={item.id} className="px-6 py-4 hover:bg-titanium-50 transition-colors cursor-pointer">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getPriorityColor(item.priority)}`}>
 {formatPriority(item.priority)}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{item.patientName}</div>
 <div className="text-sm text-titanium-600">MRN: {item.mrn}</div>
 </div>
 </div>
 <div className="text-right">
 {getPriorityIcon(item.priority)}
 </div>
 </div>

 <div className="mb-3">
 <div className="text-sm font-medium text-titanium-800 mb-1">{item.followUpType}</div>
 <div className="text-sm text-titanium-600">{item.notes}</div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Scheduled Date</div>
 <div className="flex items-center gap-1">
 <Calendar className="w-3 h-3 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-800">{new Date(item.scheduledDate).toLocaleDateString()}</span>
 </div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Provider</div>
 <div className="flex items-center gap-1">
 <User className="w-3 h-3 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-800">{item.provider}</span>
 </div>
 </div>
 </div>

 {item.lastContact && (
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Last Contact</div>
 <div className="flex items-center gap-1">
 <Phone className="w-3 h-3 text-titanium-600" />
 <span className="text-sm text-titanium-700">{new Date(item.lastContact).toLocaleDateString()}</span>
 </div>
 </div>
 )}

 <div className="flex items-center justify-between">
 <div className="flex gap-2">
 {item.priority === 'overdue' && (
 <button className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors">
 Contact Now
 </button>
 )}
 <button className="px-3 py-1 bg-chrome-600 text-white text-xs rounded-md hover:bg-chrome-700 transition-colors">
 Reschedule
 </button>
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
  );
};

export default EPFollowUpQueue;