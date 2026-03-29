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
  riskLevel: 'high' | 'moderate' | 'low';
  identifiedPatients: number;
  eligiblePatients: number;
  revenueGap: number;
  citation: string;
}

const VALVE_PHENOTYPES: PhenotypeData[] = [
  {
	id: 'lflg-as', name: 'Low-Flow Low-Gradient AS (LFLG)',
	prevalence: '10-15% of severe AS', utilization: '<30%',
	triggers: ['Paradoxical LFLG pattern', 'Low EF + low gradient', 'Dobutamine stress echo needed', 'Small body surface area'],
	interventions: ['Dobutamine stress echo', 'CT calcium scoring', 'TAVR evaluation', 'Guideline-directed medical therapy'],
	riskLevel: 'high', identifiedPatients: 8, eligiblePatients: 42, revenueGap: 1360000,
	citation: 'ACC/AHA VHD Guidelines 2020; JACC 2019',
  },
  {
	id: 'bioprosthetic-degen', name: 'Bioprosthetic Valve Degeneration',
	prevalence: '30% at 10yr', utilization: '~40%',
	triggers: ['Increasing gradient on echo', 'New symptoms post-replacement', 'Valve age >8 years', 'New regurgitation'],
	interventions: ['Valve-in-valve TAVR', 'Redo SAVR evaluation', 'Surveillance echocardiography'],
	riskLevel: 'high', identifiedPatients: 14, eligiblePatients: 35, revenueGap: 1100000,

	citation: 'JACC 2020; PARTNER 3 Trial; ACC/AHA VHD 2020',},
  {
	id: 'ie-risk', name: 'Infective Endocarditis Risk',
	prevalence: '3-10 per 100K', utilization: '~50%',
	triggers: ['Prosthetic valve', 'Prior IE', 'Congenital heart disease', 'IVDU history'],
	interventions: ['Prophylaxis protocol', 'Surveillance echos', 'Dental referral', 'Patient education'],
	riskLevel: 'moderate', identifiedPatients: 22, eligiblePatients: 45, revenueGap: 345000,

	citation: 'ESC Endocarditis Guidelines 2023; AHA 2021',},
  {
	id: 'rhd', name: 'Rheumatic Heart Disease',
	prevalence: '<0.5% in US', utilization: '~60%',
	triggers: ['Commissural fusion', 'Mitral stenosis', 'Young patient', 'Immigration from endemic area'],
	interventions: ['Penicillin prophylaxis', 'Balloon valvuloplasty', 'Surgical intervention'],
	riskLevel: 'moderate', identifiedPatients: 5, eligiblePatients: 8, revenueGap: 36000,

	citation: 'WHO Technical Report 2004; Lancet 2021',},
  {
	id: 'marfan-ctd', name: 'Marfan/CTD Valve Disease',
	prevalence: '1 in 5000', utilization: '~40%',
	triggers: ['Aortic root >4.5cm', 'Mitral prolapse', 'Tall habitus / arachnodactyly', 'Family history of aortic dissection'],
	interventions: ['Genetic testing', 'Aortic root monitoring', 'Prophylactic surgery threshold', 'Beta-blocker/ARB therapy'],
	riskLevel: 'high', identifiedPatients: 3, eligiblePatients: 8, revenueGap: 200000,

	citation: 'Circulation 2010; ACC/AHA Aorta Guidelines 2022',},
  {
	id: 'pvl', name: 'Paravalvular Leak (PVL)',
	prevalence: '5-17% post-surgery', utilization: '<25%',
	triggers: ['Hemolytic anemia', 'Persistent CHF post-surgery', 'Rocking prosthesis on echo', 'Elevated LDH'],
	interventions: ['Percutaneous closure', 'Redo surgery', 'Medical management of anemia'],
	riskLevel: 'moderate', identifiedPatients: 4, eligiblePatients: 16, revenueGap: 330000,

	citation: 'JACC Interv 2019; EuroIntervention 2020',},
  {
	id: 'radiation-valve', name: 'Radiation-Associated Valve Disease',
	prevalence: '5-10% post-radiation', utilization: '<15%',
	triggers: ['Prior mediastinal radiation', 'Cancer survivor >10yr', 'New murmur', 'Hodgkin lymphoma history'],
	interventions: ['Comprehensive echo', 'Surgical risk assessment', 'TAVR consideration', 'Cardio-oncology referral'],
	riskLevel: 'moderate', identifiedPatients: 2, eligiblePatients: 14, revenueGap: 288000,

	citation: 'JACC 2017; Heart 2019',},
  {
	id: 'carcinoid-valve', name: 'Carcinoid Valve Disease',
	prevalence: 'Rare', utilization: '<20%',
	triggers: ['Carcinoid syndrome', 'Right heart failure', 'Tricuspid regurgitation', 'Hepatic metastases'],
	interventions: ['5-HIAA levels', 'Octreotide therapy', 'Surgical valve replacement', 'Oncology co-management'],
	riskLevel: 'low', identifiedPatients: 1, eligiblePatients: 3, revenueGap: 60000,

	citation: 'JACC 2016; Neuroendocrinology 2020',},
];

const ValveSpecialtyPhenotypesDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPhenotype, setExpandedPhenotype] = useState<string | null>(null);
  const [screeningPhenotype, setScreeningPhenotype] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'gap'>('gap');

  const filteredPhenotypes = VALVE_PHENOTYPES
	.filter(phenotype => {
	const matchesSearch = phenotype.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
	phenotype.triggers.some(trigger => trigger.toLowerCase().includes(searchTerm.toLowerCase()));
	const matchesRisk = selectedRisk === 'all' || phenotype.riskLevel === selectedRisk;
	return matchesSearch && matchesRisk;
	})
	.sort((a, b) => {
	switch (sortBy) {
	case 'name': return a.name.localeCompare(b.name);
	case 'revenue': return b.revenueGap - a.revenueGap;
	case 'gap': return (b.eligiblePatients - b.identifiedPatients) - (a.eligiblePatients - a.identifiedPatients);
	default: return 0;
	}
	});

  const totalEligible = VALVE_PHENOTYPES.reduce((sum, p) => sum + p.eligiblePatients, 0);
  const totalIdentified = VALVE_PHENOTYPES.reduce((sum, p) => sum + p.identifiedPatients, 0);
  const totalRevenueGap = VALVE_PHENOTYPES.reduce((sum, p) => sum + p.revenueGap, 0);

  const getRiskColor = (risk: string) => {
	switch (risk) {
	case 'high': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
	case 'moderate': return 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]';
	case 'low': return 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]';
	default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
	}
  };

  return (
	<div className="space-y-6">
	<div className="metal-card p-6">
	<div className="flex items-center gap-3 mb-4">
	<Search className="w-8 h-8 text-porsche-500" />
	<div>
	<h2 className="text-3xl font-bold text-titanium-900 font-sf">Valve Specialty Phenotypes</h2>
	<p className="text-titanium-600">Underdetected valve-specific phenotypes and revenue optimization</p>
	</div>
	</div>

	<div className="grid grid-cols-4 gap-4 mb-6">
	<div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
	<div className="text-2xl font-bold text-porsche-600 font-sf">{totalEligible}</div>
	<div className="text-sm text-porsche-700">Total Eligible Patients</div>
	</div>
	<div className="p-4 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg">
	<div className="text-2xl font-bold text-[#2C4A60] font-sf">{totalIdentified}</div>
	<div className="text-sm text-[#2C4A60]">Currently Identified</div>
	</div>
	<div className="p-4 bg-[#F0F5FA] border border-[#C8D4DC] rounded-lg">
	<div className="text-2xl font-bold text-[#6B7280] font-sf">{totalEligible - totalIdentified}</div>
	<div className="text-sm text-[#6B7280]">Unidentified Patients</div>
	</div>
	<div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
	<div className="text-2xl font-bold text-crimson-600 font-sf">${toFixed(totalRevenueGap / 1000000, 1)}M</div>
	<div className="text-sm text-crimson-700">Revenue Opportunity</div>
	</div>
	</div>

	<div className="flex gap-4 items-center">
	<div className="flex-1">
	<input type="text" placeholder="Search phenotypes or triggers..."
	value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
	className="w-full px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
	</div>
	<select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}
	className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
	<option value="all">All Risk Levels</option>
	<option value="high">High Risk</option>
	<option value="moderate">Moderate Risk</option>
	<option value="low">Low Risk</option>
	</select>
	<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
	className="px-4 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
	<option value="gap">Sort by Patient Gap</option>
	<option value="revenue">Sort by Revenue Gap</option>
	<option value="name">Sort by Name</option>
	</select>
	</div>
	</div>

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

	<div className="grid grid-cols-3 gap-3 mb-4">
	<div className="text-center p-3 bg-titanium-50 rounded-lg">
	<div className="text-lg font-bold text-titanium-900">{phenotype.eligiblePatients}</div>
	<div className="text-xs text-titanium-600">Eligible</div>
	</div>
	<div className="text-center p-3 bg-[#C8D4DC] rounded-lg">
	<div className="text-lg font-bold text-[#2C4A60]">{phenotype.identifiedPatients}</div>
	<div className="text-xs text-[#2C4A60]">Identified</div>
	</div>
	<div className="text-center p-3 bg-crimson-50 rounded-lg">
	<div className="text-lg font-bold text-crimson-600">{phenotype.eligiblePatients - phenotype.identifiedPatients}</div>
	<div className="text-xs text-crimson-700">Missed</div>
	</div>
	</div>

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
	<span key={trigger} className="px-2 py-1 bg-porsche-100 text-porsche-700 text-xs rounded">{trigger}</span>
	))}
	{phenotype.triggers.length > 3 && (
	<span className="px-2 py-1 bg-titanium-100 text-titanium-600 text-xs rounded">+{phenotype.triggers.length - 3} more</span>
	)}
	</div>
	</div>
	<div>
	<div className="text-sm font-semibold text-titanium-700 mb-1">Key Interventions</div>
	<div className="flex flex-wrap gap-1">
	{phenotype.interventions.slice(0, 3).map((intervention) => (
	<span key={intervention} className="px-2 py-1 bg-[#C8D4DC] text-[#2C4A60] text-xs rounded">{intervention}</span>
	))}
	</div>
	</div>
	</div>

	<div className="flex items-center justify-between p-3 bg-[#C8D4DC] border border-[#2C4A60] rounded-lg">
	<div>
	<div className="text-sm font-semibold text-[#2C4A60]">Revenue Opportunity</div>
	</div>
	<div className="text-right">
	<div className="text-lg font-bold text-[#2C4A60]">
	${phenotype.revenueGap >= 1000000 ? `${toFixed(phenotype.revenueGap / 1000000, 1)}M` : `${toFixed(phenotype.revenueGap / 1000, 0)}K`}
	</div>
	<div className="text-xs text-[#2C4A60]">Gap</div>
	</div>
	</div>

	<div className="flex gap-2 mt-4">
	<button className="flex-1 px-3 py-2 bg-porsche-500 text-white text-sm font-semibold rounded-lg hover:bg-porsche-600 transition-colors"
	onClick={() => setScreeningPhenotype(screeningPhenotype === phenotype.id ? null : phenotype.id)}>{screeningPhenotype === phenotype.id ? 'Hide Patients' : 'Screen Patients'}</button>
	<button className="px-3 py-2 border border-titanium-300 text-titanium-700 text-sm font-semibold rounded-lg hover:bg-titanium-50 transition-colors"
	onClick={() => setExpandedPhenotype(expandedPhenotype === phenotype.id ? null : phenotype.id)}>{expandedPhenotype === phenotype.id ? 'Hide Protocol' : 'View Protocol'}</button>
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
	<span className={`text-xs px-2 py-0.5 rounded-full ${pt.risk === 'High' ? 'bg-crimson-100 text-crimson-700' : 'bg-[#F0F5FA] text-[#6B7280]'}`}>
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
	<button className="p-4 border-2 border-crimson-200 rounded-lg hover:bg-crimson-50 transition-colors"
	onClick={() => { setQuickActionFeedback('alerts'); setTimeout(() => setQuickActionFeedback(null), 3000); }}>
	<AlertTriangle className="w-6 h-6 text-crimson-600 mx-auto mb-2" />
	<div className="text-sm font-semibold text-crimson-800">High-Risk Alerts</div>
	<div className="text-xs text-crimson-600">5 patients need immediate screening</div>
	</button>
	<button className="p-4 border-2 border-porsche-200 rounded-lg hover:bg-porsche-50 transition-colors"
	onClick={() => { setQuickActionFeedback('screening'); setTimeout(() => setQuickActionFeedback(null), 3000); }}>
	<Users className="w-6 h-6 text-porsche-600 mx-auto mb-2" />
	<div className="text-sm font-semibold text-porsche-800">Population Screening</div>
	<div className="text-xs text-porsche-600">Run bulk phenotype analysis</div>
	</button>
	<button className="p-4 border-2 border-[#2C4A60] rounded-lg hover:bg-[#C8D4DC] transition-colors"
	onClick={() => { setQuickActionFeedback('revenue'); setTimeout(() => setQuickActionFeedback(null), 3000); }}>
	<DollarSign className="w-6 h-6 text-[#2C4A60] mx-auto mb-2" />
	<div className="text-sm font-semibold text-[#2C4A60]">Revenue Report</div>
	<div className="text-xs text-[#2C4A60]">Generate opportunity analysis</div>
	</button>
	<button className="p-4 border-2 border-[#C8D4DC] rounded-lg hover:bg-[#F0F5FA] transition-colors"
	onClick={() => { setQuickActionFeedback('builder'); setTimeout(() => setQuickActionFeedback(null), 3000); }}>
	<Activity className="w-6 h-6 text-[#6B7280] mx-auto mb-2" />
	<div className="text-sm font-semibold text-[#6B7280]">Protocol Builder</div>
	<div className="text-xs text-[#6B7280]">Create screening workflows</div>
	</button>
	</div>
	</div>
	</div>
  );
};

export default ValveSpecialtyPhenotypesDashboard;
