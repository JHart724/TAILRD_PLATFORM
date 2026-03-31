import React, { useState } from 'react';
import { Activity, Heart, TrendingUp, AlertTriangle, DollarSign, Users, Zap, Monitor , CheckCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface ProcedureData {
  id: string;
  name: string;
  eligiblePercent: string;
  nationalUtilization: string;
  currentUtilization: number;
  avgReimbursement: string;
  eligiblePatients: number;
  utilizedPatients: number;
  revenueGap: number;
  category: 'procedure' | 'emerging';
}

const VALVE_PROCEDURES: ProcedureData[] = [
  {
 id: 'tavr', name: 'TAVR', eligiblePercent: '~15%',
 nationalUtilization: '~70%', currentUtilization: 68,
 avgReimbursement: '$40,000-$60,000',
 eligiblePatients: 187, utilizedPatients: 127, revenueGap: 2400000,
 category: 'procedure',
  },
  {
 id: 'savr', name: 'SAVR', eligiblePercent: '~10%',
 nationalUtilization: '~85%', currentUtilization: 82,
 avgReimbursement: '$35,000-$55,000',
 eligiblePatients: 124, utilizedPatients: 102, revenueGap: 990000,
 category: 'procedure',
  },
  {
 id: 'mitraclip', name: 'MitraClip / TEER', eligiblePercent: '~8%',
 nationalUtilization: '~15%', currentUtilization: 12,
 avgReimbursement: '$30,000-$45,000',
 eligiblePatients: 99, utilizedPatients: 12, revenueGap: 3260000,
 category: 'procedure',
  },
  {
 id: 'tmvr', name: 'TMVR (Transcatheter Mitral)', eligiblePercent: '~3%',
 nationalUtilization: '~2%', currentUtilization: 1,
 avgReimbursement: '$45,000-$65,000',
 eligiblePatients: 37, utilizedPatients: 4, revenueGap: 1820000,
 category: 'emerging',
  },
  {
 id: 'tricuspid', name: 'Tricuspid Intervention', eligiblePercent: '~5%',
 nationalUtilization: '~3%', currentUtilization: 2,
 avgReimbursement: '$25,000-$40,000',
 eligiblePatients: 62, utilizedPatients: 12, revenueGap: 1630000,
 category: 'emerging',
  },
  {
 id: 'viv-tavr', name: 'Valve-in-Valve TAVR', eligiblePercent: '~2%',
 nationalUtilization: '~60%', currentUtilization: 55,
 avgReimbursement: '$45,000-$60,000',
 eligiblePatients: 25, utilizedPatients: 14, revenueGap: 577000,
 category: 'procedure',
  },
  {
 id: 'pvl-closure', name: 'Paravalvular Leak Closure', eligiblePercent: '~3%',
 nationalUtilization: '~20%', currentUtilization: 15,
 avgReimbursement: '$20,000-$35,000',
 eligiblePatients: 37, utilizedPatients: 6, revenueGap: 854000,
 category: 'procedure',
  },
  {
 id: 'bav', name: 'Balloon Aortic Valvuloplasty', eligiblePercent: '~4%',
 nationalUtilization: '~40%', currentUtilization: 35,
 avgReimbursement: '$8,000-$12,000',
 eligiblePatients: 50, utilizedPatients: 18, revenueGap: 320000,
 category: 'procedure',
  },
];

const AdvancedValveProcedureTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'revenue' | 'utilization'>('gap');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const filteredProcedures = VALVE_PROCEDURES
 .filter(proc => selectedCategory === 'all' || proc.category === selectedCategory)
 .sort((a, b) => {
 switch (sortBy) {
 case 'name': return a.name.localeCompare(b.name);
 case 'gap': return (b.eligiblePatients - b.utilizedPatients) - (a.eligiblePatients - a.utilizedPatients);
 case 'revenue': return b.revenueGap - a.revenueGap;
 case 'utilization': return a.currentUtilization - b.currentUtilization;
 default: return 0;
 }
 });

  const totalEligible = VALVE_PROCEDURES.reduce((sum, d) => sum + d.eligiblePatients, 0);
  const totalUtilized = VALVE_PROCEDURES.reduce((sum, d) => sum + d.utilizedPatients, 0);
  const totalRevenueGap = VALVE_PROCEDURES.reduce((sum, d) => sum + d.revenueGap, 0);

  const getCategoryIcon = (category: string) => {
 switch (category) {
 case 'procedure': return <Heart className="w-5 h-5" />;
 case 'emerging': return <Zap className="w-5 h-5" />;
 default: return <Heart className="w-5 h-5" />;
 }
  };

  const getCategoryColor = (category: string) => {
 switch (category) {
 case 'procedure': return 'text-porsche-600 bg-porsche-50 border-porsche-200';
 case 'emerging': return 'text-[#8B6914] bg-[#FAF6E8] border-[#C8D4DC]';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getUtilizationColor = (utilization: number) => {
 if (utilization < 10) return 'text-crimson-600 bg-crimson-50';
 if (utilization < 30) return 'text-[#8B6914] bg-[#FAF6E8]';
 if (utilization < 50) return 'text-porsche-600 bg-porsche-50';
 return 'text-[#2D6147] bg-[#F0F7F4]';
  };

  return (
 <div className="space-y-6">
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-4">
 <Activity className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-3xl font-bold text-titanium-900 font-sf">Advanced Valve Procedure Tracker</h2>
 <p className="text-titanium-600">Underutilized valve procedures with high clinical and financial impact</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 mb-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="text-2xl font-bold text-porsche-600 font-sf">{totalEligible}</div>
 <div className="text-sm text-porsche-700">Total Eligible Patients</div>
 </div>
 <div className="p-4 bg-[#F0F7F4] border border-[#D8EDE6] rounded-lg">
 <div className="text-2xl font-bold text-[#2C4A60] font-sf">{totalUtilized}</div>
 <div className="text-sm text-[#2C4A60]">Currently Receiving</div>
 </div>
 <div className="p-4 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
 <div className="text-2xl font-bold text-[#6B7280] font-sf">{Math.round((totalUtilized/totalEligible)*100)}%</div>
 <div className="text-sm text-[#6B7280]">Overall Utilization</div>
 </div>
 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <div className="text-2xl font-bold text-crimson-600 font-sf">${toFixed(totalRevenueGap / 1000000, 1)}M</div>
 <div className="text-sm text-crimson-700">Revenue Opportunity</div>
 </div>
 </div>

 <div className="flex gap-4 items-center">
 <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value="all">All Categories</option>
 <option value="procedure">Established Procedures</option>
 <option value="emerging">Emerging Procedures</option>
 </select>
 <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value="gap">Sort by Patient Gap</option>
 <option value="revenue">Sort by Revenue Gap</option>
 <option value="utilization">Sort by Utilization</option>
 <option value="name">Sort by Name</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredProcedures.map((proc) => (
 <div key={proc.id} className="metal-card p-6 hover:shadow-chrome-elevated transition-all duration-300">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <h3 className="text-lg font-bold text-titanium-900 mb-2">{proc.name}</h3>
 <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(proc.category)}`}>
 {getCategoryIcon(proc.category)}
 {proc.category.toUpperCase()}
 </div>
 </div>
 </div>

 <div className="mb-4">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm font-semibold text-titanium-700">Current Utilization</span>
 <span className={`text-sm font-bold px-2 py-1 rounded ${getUtilizationColor(proc.currentUtilization)}`}>
 {proc.currentUtilization}%
 </span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${
 proc.currentUtilization < 10 ? 'bg-crimson-500' :
 proc.currentUtilization < 30 ? 'bg-[#F0F5FA]' :
 proc.currentUtilization < 50 ? 'bg-porsche-500' : 'bg-[#C8D4DC]'
 }`}
 style={{ width: `${Math.min(proc.currentUtilization, 100)}%` }}
 ></div>
 </div>
 <div className="text-xs text-titanium-600 mt-1">National: {proc.nationalUtilization}</div>
 </div>

 <div className="grid grid-cols-3 gap-2 mb-4">
 <div className="text-center p-2 bg-titanium-50 rounded">
 <div className="font-bold text-titanium-900">{proc.eligiblePatients}</div>
 <div className="text-xs text-titanium-600">Eligible</div>
 </div>
 <div className="text-center p-2 bg-[#C8D4DC] rounded">
 <div className="font-bold text-[#2C4A60]">{proc.utilizedPatients}</div>
 <div className="text-xs text-[#2C4A60]">Current</div>
 </div>
 <div className="text-center p-2 bg-crimson-50 rounded">
 <div className="font-bold text-crimson-600">{proc.eligiblePatients - proc.utilizedPatients}</div>
 <div className="text-xs text-crimson-700">Gap</div>
 </div>
 </div>

 <div className="space-y-2 mb-4">
 <div>
 <div className="text-xs font-semibold text-titanium-700">Eligibility</div>
 <div className="text-xs text-titanium-600">{proc.eligiblePercent}</div>
 </div>
 <div>
 <div className="text-xs font-semibold text-titanium-700">Reimbursement</div>
 <div className="text-xs text-titanium-600">{proc.avgReimbursement}</div>
 </div>
 </div>

 <div className="flex items-center justify-between p-3 bg-[#F0F7F4] border border-[#D8EDE6] rounded-lg mb-4">
 <div>
 <div className="text-sm font-semibold text-[#2C4A60]">Revenue Gap</div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-[#2C4A60]">
 ${proc.revenueGap >= 1000000 ? `${toFixed(proc.revenueGap / 1000000, 1)}M` : `${toFixed(proc.revenueGap / 1000, 0)}K`}
 </div>
 </div>
 </div>

 <div className="flex gap-2">
 <button className="flex-1 px-3 py-2 bg-porsche-500 text-white text-sm font-semibold rounded-lg hover:bg-porsche-600 transition-colors"
 onClick={() => {
 setActionFeedback('screening');
 setTimeout(() => setActionFeedback(null), 2000);
 }}>
 Screen Patients
 </button>
 <button className="px-3 py-2 border border-titanium-300 text-titanium-700 text-sm font-semibold rounded-lg hover:bg-titanium-50 transition-colors"
 onClick={() => {
 setActionFeedback('guidelines');
 setTimeout(() => setActionFeedback(null), 2000);
 }}>
 Guidelines
 </button>
 </div>
 {actionFeedback && (
 <div className="mt-2 p-2 bg-[#F0F7F4] border border-[#D8EDE6] rounded-lg text-[#2C4A60] text-sm flex items-center gap-2">
 <CheckCircle className="w-4 h-4" />
 {actionFeedback === 'screening' ? 'Patient screening tool loading...' : 'Opening clinical guidelines...'}
 </div>
 )}
 </div>
 ))}
 </div>

 <div className="metal-card p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4">Strategic Insights</h3>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="p-4 border-2 border-crimson-200 rounded-lg">
 <AlertTriangle className="w-6 h-6 text-crimson-600 mb-2" />
 <div className="text-sm font-semibold text-crimson-800">Highest Gap</div>
 <div className="text-lg font-bold text-crimson-600">MitraClip/TEER</div>
 <div className="text-xs text-crimson-600">87 patients underutilized</div>
 </div>
 <div className="p-4 border-2 border-[#2C4A60] rounded-lg">
 <DollarSign className="w-6 h-6 text-[#2C4A60] mb-2" />
 <div className="text-sm font-semibold text-[#2C4A60]">Revenue Leader</div>
 <div className="text-lg font-bold text-[#2C4A60]">$3.26M</div>
 <div className="text-xs text-[#2C4A60]">MitraClip/TEER program expansion</div>
 </div>
 <div className="p-4 border-2 border-porsche-200 rounded-lg">
 <TrendingUp className="w-6 h-6 text-porsche-600 mb-2" />
 <div className="text-sm font-semibold text-porsche-800">Emerging Opportunity</div>
 <div className="text-lg font-bold text-porsche-600">Tricuspid</div>
 <div className="text-xs text-porsche-600">Rapidly expanding indication</div>
 </div>
 <div className="p-4 border-2 border-[#C8D4DC] rounded-lg">
 <Users className="w-6 h-6 text-[#6B7280] mb-2" />
 <div className="text-sm font-semibold text-[#6B7280]">Population Impact</div>
 <div className="text-lg font-bold text-[#6B7280]">{totalEligible - totalUtilized}</div>
 <div className="text-xs text-[#6B7280]">Total underutilized patients</div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default AdvancedValveProcedureTracker;
