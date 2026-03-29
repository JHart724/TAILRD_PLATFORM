import React, { useState } from 'react';
import { Activity, Heart, Zap, Monitor, TrendingUp, AlertTriangle, DollarSign, Users, Scissors, Pill } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';
interface InterventionData { id: string; name: string; eligiblePercent: string; nationalUtilization: string; currentUtilization: number; avgReimbursement: string; strategicValue: string; eligiblePatients: number; utilizedPatients: number; revenueGap: number; category: 'percutaneous' | 'surgical' | 'therapeutic' | 'pharmacologic' | 'diagnostic'; }
const PAD_INTERVENTIONS: InterventionData[] = [
  { id: 'supervised-exercise', name: 'Supervised Exercise Therapy', eligiblePercent: '~60%', nationalUtilization: '~10%', currentUtilization: 8, avgReimbursement: '$2K-4K/program', strategicValue: 'First-line therapy, high patient volume', eligiblePatients: 744, utilizedPatients: 60, revenueGap: 2740000, category: 'therapeutic' },
  { id: 'endovascular', name: 'Endovascular Revascularization', eligiblePercent: '~30%', nationalUtilization: '~25%', currentUtilization: 22, avgReimbursement: '$12K-20K', strategicValue: 'Core vascular service, cath lab utilization', eligiblePatients: 372, utilizedPatients: 82, revenueGap: 4640000, category: 'percutaneous' },
  { id: 'surgical-bypass', name: 'Surgical Bypass', eligiblePercent: '~10%', nationalUtilization: '~8%', currentUtilization: 7, avgReimbursement: '$25K-40K', strategicValue: 'Complex cases, high reimbursement', eligiblePatients: 124, utilizedPatients: 9, revenueGap: 3740000, category: 'surgical' },
  { id: 'atherectomy', name: 'Atherectomy', eligiblePercent: '~15%', nationalUtilization: '~10%', currentUtilization: 8, avgReimbursement: '$8K-15K', strategicValue: 'Calcified lesions, adjunctive to angioplasty', eligiblePatients: 186, utilizedPatients: 15, revenueGap: 1970000, category: 'percutaneous' },
  { id: 'dcb', name: 'Drug-Coated Balloon', eligiblePercent: '~12%', nationalUtilization: '~8%', currentUtilization: 6, avgReimbursement: '$6K-10K', strategicValue: 'Reduced restenosis, femoropopliteal lesions', eligiblePatients: 149, utilizedPatients: 9, revenueGap: 1120000, category: 'percutaneous' },
  { id: 'wound-care', name: 'Wound Care Center', eligiblePercent: '~20%', nationalUtilization: '~15%', currentUtilization: 12, avgReimbursement: '$3K-8K/episode', strategicValue: 'Multidisciplinary, amputation prevention', eligiblePatients: 248, utilizedPatients: 30, revenueGap: 1200000, category: 'therapeutic' },
  { id: 'amputation-prevention', name: 'Amputation Prevention Program', eligiblePercent: '~8%', nationalUtilization: '~5%', currentUtilization: 3, avgReimbursement: '$5K-15K', strategicValue: 'Limb salvage, quality metrics', eligiblePatients: 99, utilizedPatients: 3, revenueGap: 1440000, category: 'surgical' },
  { id: 'cilostazol', name: 'Cilostazol Optimization', eligiblePercent: '~40%', nationalUtilization: '~20%', currentUtilization: 15, avgReimbursement: '$500-1K/yr', strategicValue: 'Claudication relief, low cost, high volume', eligiblePatients: 496, utilizedPatients: 74, revenueGap: 316000, category: 'pharmacologic' },
  { id: 'duplex-surveillance', name: 'Duplex Ultrasound Surveillance', eligiblePercent: '~50%', nationalUtilization: '~30%', currentUtilization: 25, avgReimbursement: '$500-1K', strategicValue: 'Vascular lab revenue, serial monitoring', eligiblePatients: 620, utilizedPatients: 155, revenueGap: 349000, category: 'diagnostic' },
  { id: 'cta', name: 'CT Angiography (CTA)', eligiblePercent: '~25%', nationalUtilization: '~15%', currentUtilization: 12, avgReimbursement: '$800-1.5K', strategicValue: 'Pre-intervention planning', eligiblePatients: 310, utilizedPatients: 37, revenueGap: 314000, category: 'diagnostic' },
];
const AdvancedInterventionTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'revenue' | 'utilization'>('gap');
  const filteredInterventions = PAD_INTERVENTIONS.filter(d => selectedCategory === 'all' || d.category === selectedCategory).sort((a, b) => { switch (sortBy) { case 'name': return a.name.localeCompare(b.name); case 'gap': return (b.eligiblePatients - b.utilizedPatients) - (a.eligiblePatients - a.utilizedPatients); case 'revenue': return b.revenueGap - a.revenueGap; case 'utilization': return a.currentUtilization - b.currentUtilization; default: return 0; } });
  const totalEligible = PAD_INTERVENTIONS.reduce((s, d) => s + d.eligiblePatients, 0);
  const totalUtilized = PAD_INTERVENTIONS.reduce((s, d) => s + d.utilizedPatients, 0);
  const totalRevenueGap = PAD_INTERVENTIONS.reduce((s, d) => s + d.revenueGap, 0);
  const BULLET = '\u2022';
  const formatRevenue = (n: number) => n >= 1000000 ? `$${toFixed(n/1000000, 1)}M` : `$${toFixed(n/1000, 0)}K`;
  const getCategoryIcon = (c: string) => { switch(c) { case 'percutaneous': return <Zap className="w-4 h-4" />; case 'surgical': return <Scissors className="w-4 h-4" />; case 'therapeutic': return <Heart className="w-4 h-4" />; case 'pharmacologic': return <Pill className="w-4 h-4" />; case 'diagnostic': return <Monitor className="w-4 h-4" />; default: return <Activity className="w-4 h-4" />; } };
  const getCategoryColor = (c: string) => { switch(c) { case 'percutaneous': return 'bg-porsche-100 text-porsche-700'; case 'surgical': return 'bg-crimson-100 text-crimson-700'; case 'therapeutic': return 'bg-[#C8D4DC] text-[#2C4A60]'; case 'pharmacologic': return 'bg-[#F0F5FA] text-[#6B7280]'; case 'diagnostic': return 'bg-chrome-100 text-chrome-700'; default: return 'bg-titanium-100 text-titanium-700'; } };
  const getUtilizationColor = (u: number) => u < 10 ? 'bg-crimson-500' : u < 20 ? 'bg-[#F0F5FA]' : 'bg-[#C8D4DC]';
  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><TrendingUp className="w-6 h-6 text-porsche-600" /></div>
 <div><h3 className="text-lg font-bold text-titanium-900 font-sf">Advanced PAD Intervention Tracker</h3>
 <p className="text-sm text-titanium-500">Utilization gaps, patient volumes & revenue opportunity analysis</p></div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Total Eligible</div><div className="text-2xl font-bold text-titanium-900">{totalEligible.toLocaleString()}</div><div className="text-xs text-titanium-500">patients across all interventions</div></div>
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Currently Utilized</div><div className="text-2xl font-bold text-porsche-600">{totalUtilized.toLocaleString()}</div><div className="text-xs text-titanium-500">{toFixed((totalUtilized/totalEligible)*100, 1)}% overall utilization</div></div>
 <div className="metal-card p-4 text-center"><div className="text-xs text-titanium-500 mb-1">Revenue Gap</div><div className="text-2xl font-bold text-crimson-600">{formatRevenue(totalRevenueGap)}</div><div className="text-xs text-titanium-500">annualized opportunity</div></div>
 </div>
 <div className="flex gap-3 flex-wrap">
 <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="input-liquid text-sm">
 <option value="all">All Categories</option><option value="percutaneous">Percutaneous</option><option value="surgical">Surgical</option><option value="therapeutic">Therapeutic</option><option value="pharmacologic">Pharmacologic</option><option value="diagnostic">Diagnostic</option>
 </select>
 <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="input-liquid text-sm">
 <option value="gap">Sort by Patient Gap</option><option value="revenue">Sort by Revenue Gap</option><option value="utilization">Sort by Utilization</option><option value="name">Sort by Name</option>
 </select>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredInterventions.map(d => {
 const gap = d.eligiblePatients - d.utilizedPatients;
 return (
 <div key={d.id} className="metal-card p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">{getCategoryIcon(d.category)}<h4 className="font-semibold text-titanium-900 text-sm">{d.name}</h4></div>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(d.category)}`}>{d.category}</span>
 </div>
 <div className="mb-3">
 <div className="flex justify-between text-xs text-titanium-600 mb-1"><span>Utilization: {d.currentUtilization}%</span><span>National: {d.nationalUtilization}</span></div>
 <div className="w-full bg-titanium-100 rounded-full h-2"><div className={`h-full rounded-full ${getUtilizationColor(d.currentUtilization)}`} style={{width:`${d.currentUtilization}%`}} /></div>
 </div>
 <div className="grid grid-cols-3 gap-2 text-center mb-3">
 <div><div className="text-xs text-titanium-500">Eligible</div><div className="font-bold text-titanium-800">{d.eligiblePatients}</div></div>
 <div><div className="text-xs text-titanium-500">Gap</div><div className="font-bold text-crimson-600"><Users className="w-3 h-3 inline mr-1" />{gap}</div></div>
 <div><div className="text-xs text-titanium-500">Revenue Gap</div><div className="font-bold text-[#6B7280]"><DollarSign className="w-3 h-3 inline" />{formatRevenue(d.revenueGap)}</div></div>
 </div>
 <p className="text-xs text-titanium-500">{d.strategicValue}</p>
 </div>
 );
 })}
 </div>
 <div className="metal-card p-5 border border-porsche-200 bg-porsche-50/30">
 <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-porsche-600" /><h4 className="font-semibold text-titanium-900">Strategic Insights</h4></div>
 <ul className="space-y-1 text-sm text-titanium-700">
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Supervised Exercise Therapy has the largest patient gap with minimal current utilization</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Endovascular revascularization represents the highest single revenue opportunity</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Cilostazol optimization is a low-cost, high-volume improvement target</li>
 <li className="flex items-start gap-2"><span className="text-porsche-500 mt-0.5">{BULLET}</span>Amputation prevention programs address critical quality metrics and limb salvage</li>
 </ul>
 </div>
 <div className="mt-6 bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
 <p className="text-sm text-[#6B7280]">
 <strong>Guidelines:</strong> 2024 ACC/AHA PAD Guideline; TASC II Classification; Global Vascular Guidelines on CLI/CLTI Management.
 </p>
 </div>
 </div>
  );
};
export default AdvancedInterventionTracker;
