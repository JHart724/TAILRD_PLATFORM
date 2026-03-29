import React, { useState } from 'react';
import { Activity, Heart, Zap, Monitor, TrendingUp, AlertTriangle, DollarSign, Users, Eye, Crosshair , CheckCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface InterventionData {
  id: string;
  name: string;
  eligiblePercent: string;
  nationalUtilization: string;
  currentUtilization: number;
  avgReimbursement: string;
  strategicValue: string;
  citation: string;
  eligiblePatients: number;
  utilizedPatients: number;
  revenueGap: number;
  category: 'percutaneous' | 'diagnostic' | 'imaging' | 'pharmacologic';
}

const CORONARY_INTERVENTIONS: InterventionData[] = [
  {
 id: 'des-implantation',
 name: 'DES Implantation',
 eligiblePercent: '~70%',
 nationalUtilization: '~65%',
 currentUtilization: 62,
 avgReimbursement: '$12,000-$18,000',
 strategicValue: 'Primary PCI workhorse; drives cath lab volume and follow-up',
 citation: 'Mauri et al., NEJM 2014',
 eligiblePatients: 892,
 utilizedPatients: 553,
 revenueGap: 6100000,
 category: 'percutaneous'
  },
  {
 id: 'ivus-oct',
 name: 'IVUS/OCT Imaging',
 eligiblePercent: '~40%',
 nationalUtilization: '~25%',
 currentUtilization: 22,
 avgReimbursement: '$2,000-$4,000',
 strategicValue: 'Optimizes stent sizing; reduces MACE; incremental add-on revenue',
 citation: 'ILUMIEN IV, Lancet 2023',
 eligiblePatients: 510,
 utilizedPatients: 112,
 revenueGap: 1200000,
 category: 'diagnostic'
  },
  {
 id: 'ffr-ifr',
 name: 'FFR/iFR Assessment',
 eligiblePercent: '~35%',
 nationalUtilization: '~20%',
 currentUtilization: 18,
 avgReimbursement: '$1,500-$3,000',
 strategicValue: 'Guideline-recommended; reduces unnecessary stenting; CMS quality metric',
 citation: 'FAME 2, NEJM 2012; iFR-SWEDEHEART 2017',
 eligiblePatients: 447,
 utilizedPatients: 80,
 revenueGap: 826000,
 category: 'diagnostic'
  },
  {
 id: 'rotational-atherectomy',
 name: 'Rotational Atherectomy',
 eligiblePercent: '~8%',
 nationalUtilization: '~5%',
 currentUtilization: 4,
 avgReimbursement: '$8,000-$15,000',
 strategicValue: 'Enables PCI in heavily calcified lesions; niche expertise differentiator',
 citation: 'ROTAXUS, JACC Interv 2013',
 eligiblePatients: 102,
 utilizedPatients: 41,
 revenueGap: 702000,
 category: 'percutaneous'
  },
  {
 id: 'cto-pci',
 name: 'CTO PCI',
 eligiblePercent: '~5%',
 nationalUtilization: '~3%',
 currentUtilization: 2.5,
 avgReimbursement: '$15,000-$25,000',
 strategicValue: 'High-value referral magnet; improves angina and LV function in select patients',
 citation: 'EURO-CTO, EuroIntervention 2019',
 eligiblePatients: 64,
 utilizedPatients: 16,
 revenueGap: 960000,
 category: 'percutaneous'
  },
  {
 id: 'protected-pci',
 name: 'Protected PCI (Impella)',
 eligiblePercent: '~3%',
 nationalUtilization: '~2%',
 currentUtilization: 1.5,
 avgReimbursement: '$25,000-$40,000',
 strategicValue: 'Enables complex PCI in high-risk patients; avoids CABG in select cases',
 citation: 'PROTECT III, AHJ 2021',
 eligiblePatients: 38,
 utilizedPatients: 6,
 revenueGap: 1040000,
 category: 'percutaneous'
  },
  {
 id: 'ivl',
 name: 'Intravascular Lithotripsy',
 eligiblePercent: '~6%',
 nationalUtilization: '~4%',
 currentUtilization: 3,
 avgReimbursement: '$10,000-$18,000',
 strategicValue: 'Novel calcium modification; growing evidence base; easier learning curve than rota',
 citation: 'Disrupt CAD III, Circulation 2021',
 eligiblePatients: 77,
 utilizedPatients: 23,
 revenueGap: 756000,
 category: 'percutaneous'
  },
  {
 id: 'dcb',
 name: 'Drug-Coated Balloon',
 eligiblePercent: '~10%',
 nationalUtilization: '~7%',
 currentUtilization: 5,
 avgReimbursement: '$6,000-$10,000',
 strategicValue: 'ISR treatment; small vessel disease; avoids additional metal layer',
 citation: 'BASKET-SMALL 2, Lancet 2018',
 eligiblePatients: 128,
 utilizedPatients: 64,
 revenueGap: 512000,
 category: 'percutaneous'
  },
  {
 id: 'ccta',
 name: 'Coronary CT Angiography',
 eligiblePercent: '~25%',
 nationalUtilization: '~15%',
 currentUtilization: 12,
 avgReimbursement: '$800-$1,500',
 strategicValue: 'Non-invasive gatekeeper; reduces unnecessary caths; chest pain pathway',
 citation: 'SCOT-HEART, Lancet 2018; PROMISE, NEJM 2015',
 eligiblePatients: 319,
 utilizedPatients: 38,
 revenueGap: 322000,
 category: 'imaging'
  },
  {
 id: 'cardiac-pet-mri',
 name: 'Cardiac PET/MRI',
 eligiblePercent: '~12%',
 nationalUtilization: '~8%',
 currentUtilization: 6,
 avgReimbursement: '$2,000-$5,000',
 strategicValue: 'Viability, ischemia mapping; microvascular disease diagnosis; research differentiation',
 citation: 'Patel et al., JACC Imaging 2022',
 eligiblePatients: 153,
 utilizedPatients: 9,
 revenueGap: 504000,
 category: 'imaging'
  }
];

const AdvancedInterventionTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'revenue' | 'utilization'>('revenue');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const filteredInterventions = CORONARY_INTERVENTIONS
 .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
 .sort((a, b) => {
 switch (sortBy) {
 case 'name':
 return a.name.localeCompare(b.name);
 case 'gap':
 return (b.eligiblePatients - b.utilizedPatients) - (a.eligiblePatients - a.utilizedPatients);
 case 'revenue':
 return b.revenueGap - a.revenueGap;
 case 'utilization':
 return a.currentUtilization - b.currentUtilization;
 default:
 return 0;
 }
 });

  const totalEligible = CORONARY_INTERVENTIONS.reduce((sum, d) => sum + d.eligiblePatients, 0);
  const totalUtilized = CORONARY_INTERVENTIONS.reduce((sum, d) => sum + d.utilizedPatients, 0);
  const totalRevenueGap = CORONARY_INTERVENTIONS.reduce((sum, d) => sum + d.revenueGap, 0);

  const getCategoryIcon = (category: string) => {
 switch (category) {
 case 'percutaneous': return <Heart className="w-5 h-5" />;
 case 'diagnostic': return <Crosshair className="w-5 h-5" />;
 case 'imaging': return <Eye className="w-5 h-5" />;
 case 'pharmacologic': return <Zap className="w-5 h-5" />;
 default: return <Activity className="w-5 h-5" />;
 }
  };

  const getCategoryColor = (category: string) => {
 switch (category) {
 case 'percutaneous': return 'text-porsche-600 bg-porsche-50 border-porsche-200';
 case 'diagnostic': return 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]';
 case 'imaging': return 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]';
 case 'pharmacologic': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getUtilizationColor = (utilization: number) => {
 if (utilization < 10) return 'text-crimson-600 bg-crimson-50';
 if (utilization < 30) return 'text-[#6B7280] bg-[#F0F5FA]';
 if (utilization < 50) return 'text-porsche-600 bg-porsche-50';
 return 'text-[#2C4A60] bg-[#C8D4DC]';
  };

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-4">
 <Activity className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-3xl font-bold text-titanium-900 font-sf">Advanced Coronary Intervention Tracker</h2>
 <p className="text-titanium-600">Underutilized interventions with high clinical and financial impact</p>
 </div>
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-4 gap-4 mb-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="text-2xl font-bold text-porsche-600 font-sf">{totalEligible.toLocaleString()}</div>
 <div className="text-sm text-porsche-700">Total Eligible Patients</div>
 </div>
 <div className="p-4 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg">
 <div className="text-2xl font-bold text-[#2C4A60] font-sf">{totalUtilized.toLocaleString()}</div>
 <div className="text-sm text-[#2C4A60]">Currently Receiving</div>
 </div>
 <div className="p-4 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
 <div className="text-2xl font-bold text-[#6B7280] font-sf">{Math.round((totalUtilized / totalEligible) * 100)}%</div>
 <div className="text-sm text-[#6B7280]">Overall Utilization</div>
 </div>
 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <div className="text-2xl font-bold text-crimson-600 font-sf">${toFixed(totalRevenueGap / 1000000, 1)}M</div>
 <div className="text-sm text-crimson-700">Revenue Opportunity</div>
 </div>
 </div>

 {/* Controls */}
 <div className="flex gap-4 items-center">
 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Categories</option>
 <option value="percutaneous">Percutaneous</option>
 <option value="diagnostic">Diagnostic</option>
 <option value="imaging">Imaging</option>
 <option value="pharmacologic">Pharmacologic</option>
 </select>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as 'name' | 'gap' | 'revenue' | 'utilization')}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="revenue">Sort by Revenue Gap</option>
 <option value="gap">Sort by Patient Gap</option>
 <option value="utilization">Sort by Utilization</option>
 <option value="name">Sort by Name</option>
 </select>
 </div>
 </div>

 {/* Interventions Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredInterventions.map((item) => (
 <div key={item.id} className="metal-card p-6 hover:shadow-chrome-elevated transition-all duration-300">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <h3 className="text-lg font-bold text-titanium-900 mb-2">{item.name}</h3>
 <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(item.category)}`}>
 {getCategoryIcon(item.category)}
 {item.category.toUpperCase()}
 </div>
 </div>
 </div>

 {/* Utilization Progress */}
 <div className="mb-4">
 <div className="flex justify-between items-center mb-2">
 <span className="text-sm font-semibold text-titanium-700">Current Utilization</span>
 <span className={`text-sm font-bold px-2 py-1 rounded ${getUtilizationColor(item.currentUtilization)}`}>
 {item.currentUtilization}%
 </span>
 </div>
 <div className="w-full bg-titanium-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${
 item.currentUtilization < 10 ? 'bg-crimson-500' :
 item.currentUtilization < 30 ? 'bg-[#F0F5FA]' :
 item.currentUtilization < 50 ? 'bg-porsche-500' : 'bg-[#C8D4DC]'
 }`}
 style={{ width: `${Math.min(item.currentUtilization, 100)}%` }}
 ></div>
 </div>
 <div className="text-xs text-titanium-600 mt-1">
 National: {item.nationalUtilization}
 </div>
 </div>

 {/* Patient Numbers */}
 <div className="grid grid-cols-3 gap-2 mb-4">
 <div className="text-center p-2 bg-titanium-50 rounded">
 <div className="font-bold text-titanium-900">{item.eligiblePatients}</div>
 <div className="text-xs text-titanium-600">Eligible</div>
 </div>
 <div className="text-center p-2 bg-[#C8D4DC] rounded">
 <div className="font-bold text-[#2C4A60]">{item.utilizedPatients}</div>
 <div className="text-xs text-[#2C4A60]">Current</div>
 </div>
 <div className="text-center p-2 bg-crimson-50 rounded">
 <div className="font-bold text-crimson-600">{item.eligiblePatients - item.utilizedPatients}</div>
 <div className="text-xs text-crimson-700">Gap</div>
 </div>
 </div>

 {/* Clinical Info */}
 <div className="space-y-2 mb-4">
 <div>
 <div className="text-xs font-semibold text-titanium-700">Eligibility</div>
 <div className="text-xs text-titanium-600">{item.eligiblePercent}</div>
 </div>
 <div>
 <div className="text-xs font-semibold text-titanium-700">Reimbursement</div>
 <div className="text-xs text-titanium-600">{item.avgReimbursement}</div>
 </div>
 <div>
 <div className="text-xs font-semibold text-titanium-700">Strategic Value</div>
 <div className="text-xs text-titanium-600">{item.strategicValue}</div>
 </div>
 </div>

 {/* Revenue Impact */}
 <div className="flex items-center justify-between p-3 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg mb-4">
 <div>
 <div className="text-sm font-semibold text-[#2C4A60]">Revenue Gap</div>
 <div className="text-xs text-[#2C4A60]">{item.citation}</div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-[#2C4A60]">
 ${item.revenueGap >= 1000000 ? `${toFixed(item.revenueGap / 1000000, 1)}M` : `${toFixed(item.revenueGap / 1000, 0)}K`}
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex gap-2">
 <button
 className="flex-1 px-3 py-2 bg-porsche-500 text-white text-sm font-semibold rounded-lg hover:bg-porsche-600 transition-colors"
 onClick={() => {
 setActionFeedback('screening');
 setTimeout(() => setActionFeedback(null), 2000);
 }}
 >
 Screen Patients
 </button>
 <button
 className="px-3 py-2 border border-titanium-300 text-titanium-700 text-sm font-semibold rounded-lg hover:bg-titanium-50 transition-colors"
 onClick={() => {
 setActionFeedback('guidelines');
 setTimeout(() => setActionFeedback(null), 2000);
 }}
 >
 Guidelines
 </button>
 </div>
 {actionFeedback && (
 <div className="mt-2 p-2 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg text-[#2C4A60] text-sm flex items-center gap-2">
 <CheckCircle className="w-4 h-4" />
 {actionFeedback === 'screening' ? 'Patient screening tool loading...' : 'Opening clinical guidelines...'}
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Strategic Insights Panel */}
 <div className="metal-card p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4">Strategic Insights</h3>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="p-4 border-2 border-crimson-200 rounded-lg">
 <AlertTriangle className="w-6 h-6 text-crimson-600 mb-2" />
 <div className="text-sm font-semibold text-crimson-800">Highest Gap</div>
 <div className="text-lg font-bold text-crimson-600">DES Implantation</div>
 <div className="text-xs text-crimson-600">339 patients underutilized</div>
 </div>
 <div className="p-4 border-2 border-[#2C4A60] rounded-lg">
 <DollarSign className="w-6 h-6 text-[#2C4A60] mb-2" />
 <div className="text-sm font-semibold text-[#2C4A60]">Revenue Leader</div>
 <div className="text-lg font-bold text-[#2C4A60]">$6.1M</div>
 <div className="text-xs text-[#2C4A60]">DES program expansion</div>
 </div>
 <div className="p-4 border-2 border-porsche-200 rounded-lg">
 <TrendingUp className="w-6 h-6 text-porsche-600 mb-2" />
 <div className="text-sm font-semibold text-porsche-800">Quick Win</div>
 <div className="text-lg font-bold text-porsche-600">IVUS/OCT</div>
 <div className="text-xs text-porsche-600">Add-on to existing cases; low friction</div>
 </div>
 <div className="p-4 border-2 border-[#C8D4DC] rounded-lg">
 <Users className="w-6 h-6 text-[#6B7280] mb-2" />
 <div className="text-sm font-semibold text-[#6B7280]">Population Impact</div>
 <div className="text-lg font-bold text-[#6B7280]">{(totalEligible - totalUtilized).toLocaleString()}</div>
 <div className="text-xs text-[#6B7280]">Total underserved patients</div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default AdvancedInterventionTracker;
