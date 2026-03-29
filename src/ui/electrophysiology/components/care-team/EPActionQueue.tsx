import React, { useState } from 'react';
import { CheckSquare, Clock, AlertCircle, Calendar, Pill, Zap, User } from 'lucide-react';

interface EPAction {
  id: string;
  patientName: string;
  mrn: string;
  action: string;
  category: 'Anticoagulation' | 'Ablation' | 'Device' | 'Follow-up';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  assignedTo: string;
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'completed';
}

const EPActionQueue: React.FC = () => {
  const [actions, setActions] = useState<EPAction[]>([
 {
 id: 'A001',
 patientName: 'Smith, John',
 mrn: 'MRN001',
 action: 'Optimize anticoagulation therapy',
 category: 'Anticoagulation',
 priority: 'urgent',
 dueDate: '2024-01-15',
 assignedTo: 'Dr. Johnson',
 estimatedTime: '15 min',
 status: 'pending'
 },
 {
 id: 'A002',
 patientName: 'Williams, Sarah',
 mrn: 'MRN002', 
 action: 'Schedule ablation evaluation',
 category: 'Ablation',
 priority: 'high',
 dueDate: '2024-01-16',
 assignedTo: 'Dr. Brown',
 estimatedTime: '30 min',
 status: 'pending'
 },
 {
 id: 'A003',
 patientName: 'Davis, Michael',
 mrn: 'MRN003',
 action: 'Pacemaker evaluation',
 category: 'Device',
 priority: 'medium',
 dueDate: '2024-01-17',
 assignedTo: 'Dr. Smith',
 estimatedTime: '45 min',
 status: 'in_progress'
 }
  ]);

  const [filter, setFilter] = useState<string>('all');

  const filteredActions = actions.filter(action => {
 if (filter === 'all') return true;
 return action.status === filter;
  });

  const getPriorityColor = (priority: string) => {
 switch(priority) {
 case 'urgent': return 'bg-red-100 text-red-900 border-red-400';
 case 'high': return 'bg-[#F0F5FA] text-[#6B7280] border-[#C8D4DC]';
 case 'medium': return 'bg-[#F0F5FA] text-[#6B7280] border-[#C8D4DC]';
 case 'low': return 'bg-[#C8D4DC] text-[#2C4A60] border-[#2C4A60]';
 default: return 'bg-gray-100 text-gray-900 border-gray-400';
 }
  };

  const getCategoryIcon = (category: string) => {
 switch(category) {
 case 'Anticoagulation': return <Pill className="w-4 h-4" />;
 case 'Ablation': return <Zap className="w-4 h-4" />;
 case 'Device': return <CheckSquare className="w-4 h-4" />;
 case 'Follow-up': return <Calendar className="w-4 h-4" />;
 default: return <AlertCircle className="w-4 h-4" />;
 }
  };

  const markCompleted = (actionId: string) => {
 setActions(actions.map(action => 
 action.id === actionId ? { ...action, status: 'completed' as const } : action
 ));
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <CheckSquare className="w-5 h-5 text-chrome-600" />
 EP Action Queue
 </h3>
 <div className="flex items-center gap-2">
 <Clock className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700 font-medium">{filteredActions.length} pending</span>
 </div>
 </div>

 <div className="flex gap-3 flex-wrap">
 <select
 value={filter}
 onChange={(e) => setFilter(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-titanium-500 bg-white"
 >
 <option value="all">All Actions</option>
 <option value="pending">Pending</option>
 <option value="in_progress">In Progress</option>
 <option value="completed">Completed</option>
 </select>
 </div>
 </div>

 <div className="divide-y divide-white/20 max-h-80 overflow-y-auto">
 {filteredActions.map((action) => (
 <div key={action.id} className="px-6 py-4 hover:bg-titanium-50 transition-colors">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getPriorityColor(action.priority)}`}>
 {action.priority.toUpperCase()}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{action.patientName}</div>
 <div className="text-sm text-titanium-600">MRN: {action.mrn}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-600">Due</div>
 <div className="text-sm font-medium text-titanium-900">{new Date(action.dueDate).toLocaleDateString()}</div>
 </div>
 </div>

 <div className="flex items-center gap-2 mb-3">
 {getCategoryIcon(action.category)}
 <span className="font-medium text-titanium-800">{action.action}</span>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Assigned To</div>
 <div className="flex items-center gap-1">
 <User className="w-3 h-3 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-800">{action.assignedTo}</span>
 </div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Est. Time</div>
 <div className="flex items-center gap-1">
 <Clock className="w-3 h-3 text-titanium-600" />
 <span className="text-sm font-medium text-titanium-800">{action.estimatedTime}</span>
 </div>
 </div>
 </div>

 <div className="flex gap-2">
 {action.status === 'pending' && (
 <button 
 onClick={() => markCompleted(action.id)}
 className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center gap-2 font-medium"
 >
 <CheckSquare className="w-4 h-4" />
 Mark Complete
 </button>
 )}
 <button className="px-4 py-2 bg-gradient-to-r from-titanium-100 to-titanium-200 text-titanium-800 text-sm rounded-lg hover:from-titanium-200 hover:to-titanium-300 transition-all duration-300 flex items-center gap-2 font-medium">
 View Details
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
  );
};

export default EPActionQueue;