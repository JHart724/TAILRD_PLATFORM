import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, ExternalLink, Filter } from 'lucide-react';
import EPPatientDetailPanel from './EPPatientDetailPanel';

interface EPWorklistPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  cha2ds2vascScore: number;
  riskCategory: 'I' | 'II' | 'III' | 'IV';
  priority: 'high' | 'medium' | 'low';
  treatmentGaps: string[];
  ablationEligible: boolean;
  lastVisit: string;
  nextAppointment?: string;
  assignedProvider: string;
  recentAdmission: boolean;
  actionItems: {
 category: 'Anticoagulation' | 'Ablation' | 'Device' | 'Follow-up';
 description: string;
 dueDate: string;
 urgent: boolean;
  }[];
  riskScore: number;
  phenotype?: string;
}

const EPPriorityWorklist: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<EPWorklistPatient | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAnticoag, setFilterAnticoag] = useState<boolean>(false);
  const [filterAblation, setFilterAblation] = useState<boolean>(false);

  const patients: EPWorklistPatient[] = [
 {
 id: 'P001',
 name: 'Smith, John',
 mrn: 'MRN001',
 age: 67,
 gender: 'M',
 cha2ds2vascScore: 4,
 riskCategory: 'III',
 riskScore: 8.5,
 treatmentGaps: ['Anticoagulation not optimal', 'Rate control suboptimal'],
 ablationEligible: true,
 nextAppointment: '2024-01-15',
 lastVisit: '2024-01-01',
 assignedProvider: 'Dr. Johnson',
 priority: 'high',
 recentAdmission: false,
 actionItems: [
 { category: 'Anticoagulation', description: 'Optimize anticoagulation', dueDate: '2024-01-20', urgent: true },
 { category: 'Ablation', description: 'Ablation evaluation', dueDate: '2024-01-25', urgent: false }
 ]
 },
 {
 id: 'P002',
 name: 'Williams, Sarah',
 mrn: 'MRN002',
 age: 73,
 gender: 'F',
 cha2ds2vascScore: 6,
 riskCategory: 'II',
 riskScore: 6.2,
 treatmentGaps: ['Rate control optimization'],
 ablationEligible: true,
 nextAppointment: '2024-01-20',
 lastVisit: '2024-01-05',
 assignedProvider: 'Dr. Brown',
 priority: 'medium',
 recentAdmission: true,
 actionItems: [
 { category: 'Anticoagulation', description: 'Monitor INR levels', dueDate: '2024-01-22', urgent: false }
 ]
 },
 {
 id: 'P003',
 name: 'Davis, Michael',
 mrn: 'MRN003',
 age: 59,
 gender: 'M',
 cha2ds2vascScore: 1,
 riskCategory: 'I',
 riskScore: 3.1,
 treatmentGaps: [],
 ablationEligible: false,
 nextAppointment: '2024-02-01',
 lastVisit: '2024-01-10',
 assignedProvider: 'Dr. Smith',
 priority: 'low',
 recentAdmission: false,
 actionItems: [
 { category: 'Device', description: 'Pacemaker evaluation', dueDate: '2024-02-05', urgent: false }
 ]
 }
  ];

  const filteredPatients = patients.filter(p => {
 if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
 if (filterAnticoag && p.treatmentGaps.filter(gap => gap.toLowerCase().includes('anticoag')).length === 0) return false;
 if (filterAblation && !p.ablationEligible) return false;
 return true;
  });

  const getPriorityBadge = (priority: string) => {
 const colors = {
 high: 'bg-red-100 text-red-900 border-red-400',
 medium: 'bg-[#F0F5FA] text-[#6B7280] border-[#C8D4DC]',
 low: 'bg-titanium-100 text-titanium-700 border-titanium-400'
 };
 return colors[priority as keyof typeof colors];
  };

  return (
 <>
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-titanium-300 bg-titanium-50">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-titanium-900">EP Care Team Worklist</h3>
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-titanium-600" />
 <span className="text-sm text-titanium-700 font-medium">{filteredPatients.length} patients</span>
 </div>
 </div>

 <div className="flex gap-3 flex-wrap">
 <select
 value={filterPriority}
 onChange={(e) => setFilterPriority(e.target.value)}
 className="px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-titanium-500 bg-white"
 >
 <option value="all">All Priority</option>
 <option value="high">High Priority</option>
 <option value="medium">Medium Priority</option>
 <option value="low">Low Priority</option>
 </select>

 <label className="flex items-center gap-2 px-3 py-2 bg-white border border-titanium-300 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input
 type="checkbox"
 checked={filterAnticoag}
 onChange={(e) => setFilterAnticoag(e.target.checked)}
 className="rounded"
 />
 <span className="text-sm text-titanium-800">Anticoagulation Gaps</span>
 </label>

 <label className="flex items-center gap-2 px-3 py-2 bg-white border border-titanium-300 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input
 type="checkbox"
 checked={filterAblation}
 onChange={(e) => setFilterAblation(e.target.checked)}
 className="rounded"
 />
 <span className="text-sm text-titanium-800">Ablation Eligible Only</span>
 </label>
 </div>
 </div>

 <div className="divide-y divide-white/20">
 {filteredPatients.map((patient) => (
 <div key={patient.id} className="px-6 py-4 hover:bg-titanium-50 transition-colors">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getPriorityBadge(patient.priority)}`}>
 {patient.priority.toUpperCase()}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">MRN: {patient.mrn} • Age {patient.age} • CHA₂DS₂-VASc {patient.cha2ds2vascScore}</div>
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs text-titanium-600">Stroke Risk Score</div>
 <div className="text-lg font-bold text-red-800">{patient.riskScore}</div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 mb-3">
 <div>
 <div className="text-xs text-titanium-600 mb-1">Phenotype</div>
 <div className="font-medium text-titanium-800">{patient.phenotype}</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Treatment Gaps</div>
 <div className="font-medium text-[#6B7280]">{patient.treatmentGaps.length} gaps</div>
 </div>
 <div>
 <div className="text-xs text-titanium-600 mb-1">Next Appointment</div>
 <div className="font-medium text-titanium-800 flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : 'Not scheduled'}
 </div>
 </div>
 </div>

 {patient.ablationEligible && (
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Ablation Eligibility</div>
 <div className="flex flex-wrap gap-2">
 <span className="px-2 py-1 bg-chrome-50 text-chrome-900 text-xs rounded-md border border-chrome-300 font-medium">
 Ablation Candidate
 </span>
 </div>
 </div>
 )}

 {patient.phenotype && (
 <div className="mb-3">
 <div className="text-xs text-titanium-600 mb-1">Phenotype Pattern</div>
 <div className="flex flex-wrap gap-2">
 <span className="px-2 py-1 bg-red-50 text-red-900 text-xs rounded-md border border-red-300 flex items-center gap-1 font-medium">
 <AlertCircle className="w-3 h-3" />
 {patient.phenotype}
 </span>
 </div>
 </div>
 )}

 <div className="flex gap-2">
 <button 
 onClick={() => setSelectedPatient(patient)}
 className="px-4 py-2 bg-gradient-to-r from-porsche-600 to-porsche-700 text-white text-sm rounded-lg hover:from-porsche-700 hover:to-porsche-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2 font-medium border border-titanium-200"
 >
 <TrendingUp className="w-4 h-4" />
 Review Patient
 </button>
 <button className="px-4 py-2 bg-gradient-to-r from-titanium-100 to-titanium-200 text-titanium-800 text-sm rounded-lg hover:from-titanium-200 hover:to-titanium-300 transition-all duration-300 transform hover:scale-105 hover:shadow-md flex items-center gap-2 font-medium border border-titanium-300">
 <ExternalLink className="w-4 h-4" />
 Open Chart
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 
 {selectedPatient && (
 <EPPatientDetailPanel 
 patient={selectedPatient} 
 onClose={() => setSelectedPatient(null)} 
 />
 )}
 </>
  );
};

export default EPPriorityWorklist;