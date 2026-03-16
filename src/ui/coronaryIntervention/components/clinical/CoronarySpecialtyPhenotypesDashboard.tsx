import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, DollarSign, TrendingUp, Users, Activity , ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface PhenotypeData {
  id: string;
  name: string;
  prevalence: string;
  utilization: string;
  triggers: string[];
  interventions: string[];
  revenue: string;
  citation: string;
  riskLevel: 'high' | 'moderate' | 'low';
  identifiedPatients: number;
  eligiblePatients: number;
  revenueGap: number;
}

const CORONARY_PHENOTYPES: PhenotypeData[] = [
  {
 id: 'cmd',
 name: 'CMD (Coronary Microvascular Disease)',
 prevalence: '50% of angina with non-obstructive CAD',
 utilization: '<10%',
 triggers: ['Exertional angina', 'Non-obstructive cath', 'Female sex', 'Diabetes'],
 interventions: ['Coronary reactivity testing', 'Ranolazine', 'CCB therapy'],
 revenue: '$5,000-$15,000',
 citation: 'COVADIS, JACC 2018; CorMicA, JACC 2019',
 riskLevel: 'high',
 identifiedPatients: 18,
 eligiblePatients: 245,
 revenueGap: 2270000
  },
  {
 id: 'scad',
 name: 'SCAD (Spontaneous Coronary Artery Dissection)',
 prevalence: '1-4% of ACS',
 utilization: '<25%',
 triggers: ['Young female', 'Fibromuscular dysplasia', 'Postpartum', 'Extreme exertion'],
 interventions: ['Conservative management', 'Genetic screening', 'FMD screening'],
 revenue: '$8,000-$20,000',
 citation: 'Saw et al., JACC 2017; AHA Statement 2020',
 riskLevel: 'high',
 identifiedPatients: 4,
 eligiblePatients: 16,
 revenueGap: 192000
  },
  {
 id: 'ectasia',
 name: 'Coronary Ectasia/Aneurysm',
 prevalence: '1.5-5% of cath patients',
 utilization: '~30%',
 triggers: ['Diffuse dilation on angiography', 'Kawasaki history', 'Connective tissue disease'],
 interventions: ['Anticoagulation', 'Covered stent if symptomatic'],
 revenue: '$5,000-$12,000',
 citation: 'Manginas et al., Heart 2006',
 riskLevel: 'moderate',
 identifiedPatients: 8,
 eligiblePatients: 22,
 revenueGap: 119000
  },
  {
 id: 'vasospastic',
 name: 'Vasospastic Angina (Prinzmetal)',
 prevalence: '2-3% of angina',
 utilization: '<15%',
 triggers: ['Rest angina', 'ST elevation transient', 'Smoking', 'Japanese/Korean ethnicity'],
 interventions: ['CCB therapy', 'Nitrates', 'Avoid beta-blockers', 'Provocative testing'],
 revenue: '$4,000-$10,000',
 citation: 'COVADIS, JACC 2017; JCS Guidelines 2020',
 riskLevel: 'moderate',
 identifiedPatients: 6,
 eligiblePatients: 38,
 revenueGap: 224000
  },
  {
 id: 'isr',
 name: 'In-Stent Restenosis (ISR) Phenotype',
 prevalence: '5-10% post-PCI',
 utilization: '~60%',
 triggers: ['Recurrent angina post-PCI', 'Diabetes', 'Small vessel', 'Prior DES'],
 interventions: ['Drug-coated balloon', 'Repeat DES', 'IVUS-guided PCI'],
 revenue: '$12,000-$20,000',
 citation: 'RIBS IV, JACC 2017; DARE, EuroIntervention 2019',
 riskLevel: 'high',
 identifiedPatients: 31,
 eligiblePatients: 52,
 revenueGap: 336000
  },
  {
 id: 'thrombotic',
 name: 'Thrombotic CAD Phenotype',
 prevalence: '3-5% of ACS',
 utilization: '<20%',
 triggers: ['Young ACS', 'Minimal plaque', 'Thrombophilia', 'OCP use'],
 interventions: ['Hypercoagulable workup', 'Prolonged DAPT', 'Hematology referral'],
 revenue: '$6,000-$15,000',
 citation: 'Collet et al., EHJ 2020',
 riskLevel: 'high',
 identifiedPatients: 5,
 eligiblePatients: 28,
 revenueGap: 241000
  },
  {
 id: 'calcific',
 name: 'Calcific Coronary Disease',
 prevalence: '15-20% of PCI candidates',
 utilization: '~40%',
 triggers: ['Heavy calcification on cath', 'CAC >400', 'CKD', 'Diabetes'],
 interventions: ['IVL (lithotripsy)', 'Rotational atherectomy', 'Orbital atherectomy'],
 revenue: '$10,000-$20,000',
 citation: 'Disrupt CAD III, Circ 2021',
 riskLevel: 'moderate',
 identifiedPatients: 45,
 eligiblePatients: 112,
 revenueGap: 1005000
  },
  {
 id: 'left-main',
 name: 'Left Main Disease',
 prevalence: '5-7% of cath patients',
 utilization: '~80%',
 triggers: ['High-risk stress test', 'Proximal LAD disease', 'Low EF'],
 interventions: ['CABG referral', 'Protected left main PCI', 'IVUS guidance'],
 revenue: '$30,000-$50,000',
 citation: 'EXCEL, NEJM 2019; NOBLE, Lancet 2020',
 riskLevel: 'high',
 identifiedPatients: 18,
 eligiblePatients: 22,
 revenueGap: 160000
  },
  {
 id: 'fistula',
 name: 'Coronary Artery Fistula',
 prevalence: '0.1-0.2%',
 utilization: '<50%',
 triggers: ['Continuous murmur', 'Incidental cath finding', 'Volume overload'],
 interventions: ['Coil embolization', 'Surgical ligation if large'],
 revenue: '$15,000-$25,000',
 citation: 'Mangukia et al., Ann Thorac Surg 2012',
 riskLevel: 'low',
 identifiedPatients: 1,
 eligiblePatients: 3,
 revenueGap: 40000
  },
  {
 id: 'bridging',
 name: 'Myocardial Bridging',
 prevalence: '5-25% (angiographic)',
 utilization: '<10%',
 triggers: ['Exertional angina', 'Negative stress test', 'Milking on cath'],
 interventions: ['Beta-blockers', 'CCB therapy', 'Surgical unroofing if refractory'],
 revenue: '$3,000-$8,000',
 citation: 'Sternheim et al., JACC 2021',
 riskLevel: 'low',
 identifiedPatients: 4,
 eligiblePatients: 42,
 revenueGap: 209000
  }
];

const CoronarySpecialtyPhenotypesDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPhenotype, setExpandedPhenotype] = useState<string | null>(null);
  const [screeningPhenotype, setScreeningPhenotype] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'gap'>('gap');

  const filteredPhenotypes = CORONARY_PHENOTYPES
 .filter(phenotype => {
 const matchesSearch = phenotype.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 phenotype.triggers.some(trigger => trigger.toLowerCase().includes(searchTerm.toLowerCase()));
 const matchesRisk = selectedRisk === 'all' || phenotype.riskLevel === selectedRisk;
 return matchesSearch && matchesRisk;
 })
 .sort((a, b) => {
 switch (sortBy) {
 case 'name':
 return a.name.localeCompare(b.name);
 case 'revenue':
 return b.revenueGap - a.revenueGap;
 case 'gap':
 return (b.eligiblePatients - b.identifiedPatients) - (a.eligiblePatients - a.identifiedPatients);
 default:
 return 0;
 }
 });

  const totalEligible = CORONARY_PHENOTYPES.reduce((sum, p) => sum + p.eligiblePatients, 0);
  const totalIdentified = CORONARY_PHENOTYPES.reduce((sum, p) => sum + p.identifiedPatients, 0);
  const totalRevenueGap = CORONARY_PHENOTYPES.reduce((sum, p) => sum + p.revenueGap, 0);

  const getRiskColor = (risk: string) => {
 switch (risk) {
 case 'high': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 case 'moderate': return 'text-amber-600 bg-amber-50 border-amber-200';
 case 'low': return 'text-green-600 bg-green-50 border-green-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  return (
 <div className="space-y-6">
 {/* Header */}
 <div className="metal-card p-6">
 <div className="flex items-center gap-3 mb-4">
 <Search className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-3xl font-bold text-titanium-900 font-sf">Coronary Specialty Phenotypes</h2>
 <p className="text-titanium-600">Underdetected coronary phenotypes for targeted therapy and revenue capture</p>
 </div>
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-4 gap-4 mb-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="text-2xl font-bold text-porsche-600 font-sf">{totalEligible}</div>
 <div className="text-sm text-porsche-700">Total Eligible Patients</div>
 </div>
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <div className="text-2xl font-bold text-green-600 font-sf">{totalIdentified}</div>
 <div className="text-sm text-green-700">Currently Identified</div>
 </div>
 <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
 <div className="text-2xl font-bold text-amber-600 font-sf">{totalEligible - totalIdentified}</div>
 <div className="text-sm text-amber-700">Unidentified Patients</div>
 </div>
 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <div className="text-2xl font-bold text-crimson-600 font-sf">${toFixed(totalRevenueGap / 1000000, 1)}M</div>
 <div className="text-sm text-crimson-700">Revenue Opportunity</div>
 </div>
 </div>

 {/* Controls */}
 <div className="flex gap-4 items-center">
 <div className="flex-1">
 <input
 type="text"
 placeholder="Search phenotypes or triggers..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 <select
 value={selectedRisk}
 onChange={(e) => setSelectedRisk(e.target.value)}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="all">All Risk Levels</option>
 <option value="high">High Risk</option>
 <option value="moderate">Moderate Risk</option>
 <option value="low">Low Risk</option>
 </select>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'gap')}
 className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="gap">Sort by Patient Gap</option>
 <option value="revenue">Sort by Revenue Gap</option>
 <option value="name">Sort by Name</option>
 </select>
 </div>
 </div>

 {/* Phenotypes Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {filteredPhenotypes.map((phenotype) => (
 <div key={phenotype.id} className="metal-card p-6 hover:shadow-chrome-elevated transition-all duration-300">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <h3 className="text-xl font-bold text-titanium-900 mb-2">{phenotype.name}</h3>
 <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(phenotype.riskLevel)}`}>
 {phenotype.riskLevel.toUpperCase()} PRIORITY
 </div>
 </div>
 <Heart className="w-6 h-6 text-porsche-500" />
 </div>

 {/* Patient Numbers */}
 <div className="grid grid-cols-3 gap-3 mb-4">
 <div className="text-center p-3 bg-titanium-50 rounded-lg">
 <div className="text-lg font-bold text-titanium-900">{phenotype.eligiblePatients}</div>
 <div className="text-xs text-titanium-600">Eligible</div>
 </div>
 <div className="text-center p-3 bg-green-50 rounded-lg">
 <div className="text-lg font-bold text-green-600">{phenotype.identifiedPatients}</div>
 <div className="text-xs text-green-700">Identified</div>
 </div>
 <div className="text-center p-3 bg-crimson-50 rounded-lg">
 <div className="text-lg font-bold text-crimson-600">{phenotype.eligiblePatients - phenotype.identifiedPatients}</div>
 <div className="text-xs text-crimson-700">Missed</div>
 </div>
 </div>

 {/* Clinical Info */}
 <div className="space-y-3 mb-4">
 <div>
 <div className="text-sm font-semibold text-titanium-700 mb-1">Prevalence</div>
 <div className="text-sm text-titanium-600">{phenotype.prevalence}</div>
 </div>
 <div>
 <div className="text-sm font-semibold text-titanium-700 mb-1">Current Utilization</div>
 <div className="text-sm text-titanium-600">{phenotype.utilization}</div>
 </div>
 <div>
 <div className="text-sm font-semibold text-titanium-700 mb-1">Clinical Triggers</div>
 <div className="flex flex-wrap gap-1">
 {phenotype.triggers.slice(0, 3).map((trigger) => (
 <span key={trigger} className="px-2 py-1 bg-porsche-100 text-porsche-700 text-xs rounded">
 {trigger}
 </span>
 ))}
 {phenotype.triggers.length > 3 && (
 <span className="px-2 py-1 bg-titanium-100 text-titanium-600 text-xs rounded">
 +{phenotype.triggers.length - 3} more
 </span>
 )}
 </div>
 </div>
 <div>
 <div className="text-sm font-semibold text-titanium-700 mb-1">Interventions</div>
 <div className="flex flex-wrap gap-1">
 {phenotype.interventions.slice(0, 2).map((intervention) => (
 <span key={intervention} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
 {intervention}
 </span>
 ))}
 {phenotype.interventions.length > 2 && (
 <span className="px-2 py-1 bg-titanium-100 text-titanium-600 text-xs rounded">
 +{phenotype.interventions.length - 2} more
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Revenue Impact */}
 <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
 <div>
 <div className="text-sm font-semibold text-green-800">Revenue Opportunity</div>
 <div className="text-xs text-green-600">{phenotype.revenue}</div>
 </div>
 <div className="text-right">
 <div className="text-lg font-bold text-green-700">
 ${phenotype.revenueGap >= 1000000 ? `${toFixed(phenotype.revenueGap / 1000000, 2)}M` : `${toFixed(phenotype.revenueGap / 1000, 0)}K`}
 </div>
 <div className="text-xs text-green-600">Gap</div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex gap-2 mt-4">
 <button
 className="flex-1 px-3 py-2 bg-porsche-500 text-white text-sm font-semibold rounded-lg hover:bg-porsche-600 transition-colors"
 onClick={() => setScreeningPhenotype(screeningPhenotype === phenotype.id ? null : phenotype.id)}
 >{screeningPhenotype === phenotype.id ? 'Hide Patients' : 'Screen Patients'}</button>
 <button
 className="px-3 py-2 border border-titanium-300 text-titanium-700 text-sm font-semibold rounded-lg hover:bg-titanium-50 transition-colors"
 onClick={() => setExpandedPhenotype(expandedPhenotype === phenotype.id ? null : phenotype.id)}
 >{expandedPhenotype === phenotype.id ? 'Hide Protocol' : 'View Protocol'}</button>
 </div>
 {/* Expanded Protocol Panel */}
 {expandedPhenotype === phenotype.id && (
 <div className="mt-4 p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="flex items-center gap-2 mb-3">
 <CheckCircle className="w-5 h-5 text-porsche-500" />
 <h4 className="font-semibold text-titanium-900">Screening Protocol</h4>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <div className="text-xs font-semibold text-titanium-600 mb-2 uppercase tracking-wide">Clinical Triggers</div>
 <ul className="space-y-1">
 {phenotype.triggers.map((trigger: string) => (
 <li key={trigger} className="text-sm text-titanium-700 flex items-start gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-porsche-400 mt-1.5 flex-shrink-0" />
 {trigger}
 </li>
 ))}
 </ul>
 </div>
 <div>
 <div className="text-xs font-semibold text-titanium-600 mb-2 uppercase tracking-wide">Recommended Interventions</div>
 <ul className="space-y-1">
 {phenotype.interventions.map((intervention: string) => (
 <li key={intervention} className="text-sm text-titanium-700 flex items-start gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-medical-green-400 mt-1.5 flex-shrink-0" />
 {intervention}
 </li>
 ))}
 </ul>
 </div>
 </div>
 <div className="mt-3 pt-3 border-t border-titanium-200">
 <div className="text-xs text-titanium-500"><strong>Evidence:</strong> {phenotype.citation}</div>
 </div>
 </div>
 )}
 {/* Screening Patients Panel */}
 {screeningPhenotype === phenotype.id && (
 <div className="mt-4 p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <Users className="w-5 h-5 text-porsche-500" />
 <h4 className="font-semibold text-titanium-900">Eligible Patients for Screening</h4>
 </div>
 <span className="text-xs text-porsche-600 font-medium">{phenotype.eligiblePatients - phenotype.identifiedPatients} unscreened</span>
 </div>
 <div className="space-y-2">
 {[
 { name: 'Patient A', mrn: `MRN-${1000 + Math.floor(phenotype.eligiblePatients * 1.3)}`, status: 'Pending Review', risk: 'High' },
 { name: 'Patient B', mrn: `MRN-${2000 + Math.floor(phenotype.eligiblePatients * 2.1)}`, status: 'Needs Workup', risk: 'Moderate' },
 { name: 'Patient C', mrn: `MRN-${3000 + Math.floor(phenotype.eligiblePatients * 0.7)}`, status: 'Awaiting Results', risk: 'High' },
 ].slice(0, Math.min(3, phenotype.eligiblePatients - phenotype.identifiedPatients || 1)).map((pt) => (
 <div key={pt.mrn} className="flex items-center justify-between p-2 bg-white rounded border border-porsche-100">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-porsche-100 flex items-center justify-center text-xs font-bold text-porsche-700">
 {pt.name.split(' ').map((n: string) => n[0]).join('')}
 </div>
 <div>
 <div className="text-sm font-medium text-titanium-900">{pt.name}</div>
 <div className="text-xs text-titanium-500">{pt.mrn}</div>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className={`text-xs px-2 py-0.5 rounded-full ${pt.risk === 'High' ? 'bg-crimson-100 text-crimson-700' : 'bg-amber-100 text-amber-700'}`}>
 {pt.risk}
 </span>
 <span className="text-xs text-titanium-500">{pt.status}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Quick Actions Panel */}
 <div className="metal-card p-6">
 <h3 className="text-xl font-bold text-titanium-900 mb-4">Quick Actions</h3>
 {quickActionFeedback && (
 <div className="mb-4 p-3 bg-medical-green-50 border border-medical-green-200 rounded-lg flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-medical-green-600" />
 <span className="text-sm font-medium text-medical-green-800">
 {quickActionFeedback === 'alerts' && 'Loading high-risk patient alerts...'}
 {quickActionFeedback === 'screening' && 'Population screening analysis initiated...'}
 {quickActionFeedback === 'revenue' && 'Revenue opportunity report generating...'}
 {quickActionFeedback === 'builder' && 'Protocol builder loading...'}
 </span>
 </div>
 )}
 <div className="grid grid-cols-4 gap-4">
 <button
 className="p-4 border-2 border-crimson-200 rounded-lg hover:bg-crimson-50 transition-colors"
 onClick={() => { setQuickActionFeedback('alerts'); setTimeout(() => setQuickActionFeedback(null), 3000); }}
 >
 <AlertTriangle className="w-6 h-6 text-crimson-600 mx-auto mb-2" />
 <div className="text-sm font-semibold text-crimson-800">High-Risk Alerts</div>
 <div className="text-xs text-crimson-600">CMD and SCAD patients need screening</div>
 </button>
 <button
 className="p-4 border-2 border-porsche-200 rounded-lg hover:bg-porsche-50 transition-colors"
 onClick={() => { setQuickActionFeedback('screening'); setTimeout(() => setQuickActionFeedback(null), 3000); }}
 >
 <Users className="w-6 h-6 text-porsche-600 mx-auto mb-2" />
 <div className="text-sm font-semibold text-porsche-800">Population Screening</div>
 <div className="text-xs text-porsche-600">Run bulk phenotype analysis</div>
 </button>
 <button
 className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
 onClick={() => { setQuickActionFeedback('revenue'); setTimeout(() => setQuickActionFeedback(null), 3000); }}
 >
 <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
 <div className="text-sm font-semibold text-green-800">Revenue Report</div>
 <div className="text-xs text-green-600">Generate opportunity analysis</div>
 </button>
 <button
 className="p-4 border-2 border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
 onClick={() => { setQuickActionFeedback('builder'); setTimeout(() => setQuickActionFeedback(null), 3000); }}
 >
 <Activity className="w-6 h-6 text-amber-600 mx-auto mb-2" />
 <div className="text-sm font-semibold text-amber-800">Protocol Builder</div>
 <div className="text-xs text-amber-600">Create screening workflows</div>
 </button>
 </div>
 </div>
 </div>
  );
};

export default CoronarySpecialtyPhenotypesDashboard;
