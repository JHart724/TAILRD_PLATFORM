import React, { useState } from 'react';
import { Heart, Users, Calculator, Shield, Activity, Target, BarChart3, FileText, TrendingUp, Scissors, Route, Gauge } from 'lucide-react';

// Import Coronary Intervention components
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';
import PCINetworkVisualization from '../components/PCINetworkVisualization';

type TabId = 'cabg-vs-pci' | 'protected-pci' | 'multi-arterial' | 'on-off-pump' | 'grace' | 'timi' | 'syntax' | 'safety' | 'network' | 'analytics' | 'outcomes' | 'reporting';

const CoronaryServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('cabg-vs-pci');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const tabs = [
 { id: 'cabg-vs-pci', label: 'CABG vs PCI', icon: Route, description: 'CABG vs PCI decision tool' },
 { id: 'protected-pci', label: 'Protected PCI', icon: Shield, description: 'Protected PCI planner' },
 { id: 'multi-arterial', label: 'Multi-Arterial', icon: Target, description: 'Multi-arterial graft calculator' },
 { id: 'on-off-pump', label: 'On/Off Pump', icon: Activity, description: 'On-pump vs off-pump decision' },
 { id: 'grace', label: 'GRACE Score', icon: Calculator, description: 'GRACE risk calculator' },
 { id: 'timi', label: 'TIMI Score', icon: Gauge, description: 'TIMI risk calculator' },
 { id: 'syntax', label: 'SYNTAX Score', icon: BarChart3, description: 'SYNTAX score calculator' },
 { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Coronary safety screening' },
 { id: 'network', label: 'PCI Network', icon: Users, description: 'PCI referral network' },
 { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced coronary analytics' },
 { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Procedural outcomes' },
 { id: 'reporting', label: 'Reporting', icon: FileText, description: 'Automated reports' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'grace':
 return <GRACEScoreCalculator />;
 case 'timi':
 return <TIMIScoreCalculator />;
 case 'syntax':
 return <SYNTAXScoreCalculator />;
 case 'safety':
 return <CoronarySafetyScreening />;
 case 'network':
 return <PCINetworkVisualization />;
 case 'cabg-vs-pci':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Route className="w-8 h-8 text-medical-red-600" />
 CABG vs PCI Decision Tool
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="space-y-6">
 <h4 className="text-lg font-semibold text-titanium-900">Decision Factors</h4>
 <div className="space-y-4">
 {[
 { factor: 'SYNTAX Score', cabgLabel: '>32 (High)', pciLabel: '\u226422 (Low)', weight: 'Critical' },
 { factor: 'Number of Vessels', cabgLabel: '3-vessel/LM', pciLabel: '1-2 vessel', weight: 'High' },
 { factor: 'Diabetes', cabgLabel: 'Preferred', pciLabel: 'Consider', weight: 'High' },
 { factor: 'Age', cabgLabel: '<80 years', pciLabel: 'Any age', weight: 'Medium' },
 { factor: 'EF', cabgLabel: '>30%', pciLabel: 'Any EF', weight: 'Medium' }
 ].map((item, index) => (
 <div key={index} className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex justify-between items-center mb-2">
 <span className="font-medium text-titanium-900">{item.factor}</span>
 <span className={`text-xs px-2 py-1 rounded-full ${
 item.weight === 'Critical' ? 'bg-red-100 text-red-700' :
 item.weight === 'High' ? 'bg-amber-100 text-amber-700' :
 'bg-chrome-100 text-chrome-700'
 }`}>
 {item.weight}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div className="p-2 bg-red-50 rounded-lg">
 <div className="text-red-700 font-medium">CABG</div>
 <div className="text-red-600">{item.cabgLabel}</div>
 </div>
 <div className="p-2 bg-chrome-50 rounded-lg">
 <div className="text-chrome-700 font-medium">PCI</div>
 <div className="text-chrome-600">{item.pciLabel}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="space-y-6">
 <h4 className="text-lg font-semibold text-titanium-900">Outcomes Comparison</h4>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <div className="grid grid-cols-2 gap-6">
 <div className="text-center">
 <div className="text-red-600 font-semibold mb-3">CABG</div>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span>30-day mortality</span>
 <span className="font-medium">2.9%</span>
 </div>
 <div className="flex justify-between">
 <span>5-year survival</span>
 <span className="font-medium">88.2%</span>
 </div>
 <div className="flex justify-between">
 <span>Repeat revascularization</span>
 <span className="font-medium">9.2%</span>
 </div>
 <div className="flex justify-between">
 <span>Stroke</span>
 <span className="font-medium">2.4%</span>
 </div>
 </div>
 </div>
 <div className="text-center">
 <div className="text-chrome-600 font-semibold mb-3">PCI</div>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span>30-day mortality</span>
 <span className="font-medium">1.9%</span>
 </div>
 <div className="flex justify-between">
 <span>5-year survival</span>
 <span className="font-medium">85.9%</span>
 </div>
 <div className="flex justify-between">
 <span>Repeat revascularization</span>
 <span className="font-medium">25.8%</span>
 </div>
 <div className="flex justify-between">
 <span>Stroke</span>
 <span className="font-medium">1.6%</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Reference:</strong> Based on EXCEL trial (5-year), NOBLE trial, and 2021 ACC/AHA Coronary Revascularization Guidelines.
 Outcomes data are population-level estimates and should be individualized.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
 case 'protected-pci':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Shield className="w-8 h-8 text-medical-green-600" />
 Protected PCI Planner
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 {[
 { type: 'IABP', cases: 47, success: '92.3%' },
 { type: 'Impella CP', cases: 23, success: '89.7%' },
 { type: 'ECMO', cases: 8, success: '75.0%' }
 ].map((item, index) => (
 <div key={index} className="text-center p-6 rounded-xl bg-green-50 border border-green-200">
 <div className="text-3xl font-bold text-green-600 mb-2">{item.cases}</div>
 <div className="font-semibold text-titanium-900">{item.type}</div>
 <div className="text-sm text-green-600">{item.success} success</div>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Selection Criteria</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between"><span>EF &lt;35%</span><span className="text-green-600">Indication</span></div>
 <div className="flex justify-between"><span>Unprotected LM</span><span className="text-green-600">Indication</span></div>
 <div className="flex justify-between"><span>Last patent vessel</span><span className="text-green-600">Indication</span></div>
 <div className="flex justify-between"><span>High SYNTAX score</span><span className="text-amber-600">Consider</span></div>
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Device Selection</h4>
 <div className="space-y-3">
 <div className="p-3 bg-chrome-50 rounded-lg">
 <div className="font-medium text-chrome-900">IABP</div>
 <div className="text-sm text-chrome-600">Stable hemodynamics, planned procedure</div>
 </div>
 <div className="p-3 bg-purple-50 rounded-lg">
 <div className="font-medium text-purple-900">Impella</div>
 <div className="text-sm text-purple-600">Cardiogenic shock, complex lesions</div>
 </div>
 <div className="p-3 bg-red-50 rounded-lg">
 <div className="font-medium text-red-900">ECMO</div>
 <div className="text-sm text-red-600">Severe cardiogenic shock, biventricular failure</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'multi-arterial':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Target className="w-8 h-8 text-medical-purple-600" />
 Multi-Arterial Graft Strategy
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 {[
 { graft: 'LIMA-LAD', patency: '95.2%', usage: '98%', color: 'green' },
 { graft: 'RIMA', patency: '91.8%', usage: '67%', color: 'blue' },
 { graft: 'Radial', patency: '89.4%', usage: '45%', color: 'purple' },
 { graft: 'SVG', patency: '78.3%', usage: '23%', color: 'amber' }
 ].map((item, index) => (
 <div key={index} className="text-center p-6 rounded-xl bg-purple-50 border border-purple-200">
 <div className="text-lg font-bold text-purple-600 mb-1">{item.patency}</div>
 <div className="font-semibold text-titanium-900">{item.graft}</div>
 <div className="text-sm text-purple-600">10-yr patency</div>
 <div className="text-xs text-titanium-500 mt-1">Used in {item.usage} of cases</div>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Total Arterial Revascularization Criteria</h4>
 <div className="space-y-3 text-sm">
 {[
 { criterion: 'Age <70 years', recommendation: 'Strongly consider bilateral IMA' },
 { criterion: 'Non-diabetic or well-controlled DM', recommendation: 'Low sternal wound risk' },
 { criterion: 'BMI <35', recommendation: 'Acceptable IMA harvest' },
 { criterion: 'Non-insulin dependent', recommendation: 'Bilateral IMA safe' },
 { criterion: 'Target vessel >1.5mm', recommendation: 'Required for radial artery' },
 { criterion: 'Proximal stenosis >70%', recommendation: 'Required for radial artery competitive flow' }
 ].map((item, index) => (
 <div key={index} className="flex justify-between items-start p-3 bg-purple-50 rounded-lg">
 <span className="font-medium text-titanium-800">{item.criterion}</span>
 <span className="text-purple-600 text-right ml-4">{item.recommendation}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Conduit Selection Algorithm</h4>
 <div className="space-y-4">
 <div className="p-4 bg-green-50 rounded-lg border border-green-200">
 <div className="font-medium text-green-800 mb-1">Step 1: LIMA to LAD</div>
 <div className="text-sm text-green-700">Gold standard - always first choice</div>
 </div>
 <div className="p-4 bg-chrome-50 rounded-lg border border-chrome-200">
 <div className="font-medium text-chrome-800 mb-1">Step 2: RIMA or Radial to second target</div>
 <div className="text-sm text-chrome-700">RIMA for Cx territory; Radial for RCA/OM</div>
 </div>
 <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
 <div className="font-medium text-purple-800 mb-1">Step 3: Third conduit</div>
 <div className="text-sm text-purple-700">Radial artery or SVG for remaining targets</div>
 </div>
 <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
 <div className="font-medium text-amber-800 mb-1">SVG only if arterial unavailable</div>
 <div className="text-sm text-amber-700">Higher late failure rate; use no-touch technique</div>
 </div>
 </div>
 </div>
 </div>
 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Reference:</strong> ART Trial (10-year), RADIAL Trial, 2021 ACC/AHA Coronary Revascularization Guidelines.
 Patency data from systematic reviews of angiographic follow-up studies.
 </p>
 </div>
 </div>
 );
 case 'on-off-pump':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Activity className="w-8 h-8 text-medical-amber-600" />
 On-Pump vs Off-Pump Decision
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 text-center text-amber-600">On-Pump CABG</h4>
 <div className="space-y-3">
 <div className="text-green-600 font-medium">Advantages:</div>
 <ul className="text-sm space-y-1 text-titanium-700">
 <li>Complete revascularization</li>
 <li>Better graft patency</li>
 <li>Precise anastomosis</li>
 <li>Standard technique</li>
 </ul>
 <div className="text-red-600 font-medium mt-3">Disadvantages:</div>
 <ul className="text-sm space-y-1 text-titanium-700">
 <li>CPB complications</li>
 <li>Neurologic risk</li>
 <li>Inflammatory response</li>
 </ul>
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 text-center text-chrome-600">Off-Pump CABG</h4>
 <div className="space-y-3">
 <div className="text-green-600 font-medium">Advantages:</div>
 <ul className="text-sm space-y-1 text-titanium-700">
 <li>No CPB</li>
 <li>Reduced stroke risk</li>
 <li>Less inflammation</li>
 <li>Faster recovery</li>
 </ul>
 <div className="text-red-600 font-medium mt-3">Disadvantages:</div>
 <ul className="text-sm space-y-1 text-titanium-700">
 <li>Technical difficulty</li>
 <li>Incomplete revascularization risk</li>
 <li>Learning curve</li>
 </ul>
 </div>
 </div>
 </div>
 <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Off-Pump Preferred Candidates</h4>
 <div className="space-y-2 text-sm">
 {[
 'Severely calcified ascending aorta (porcelain aorta)',
 'Prior stroke or high cerebrovascular risk',
 'Chronic kidney disease (avoid CPB nephrotoxicity)',
 'Advanced age (>80 years)',
 'Limited target vessels (1-2 grafts needed)'
 ].map((item, index) => (
 <div key={index} className="flex items-start gap-2 p-2 bg-chrome-50 rounded-lg">
 <span className="text-chrome-500 mt-0.5">&#x2022;</span>
 <span className="text-chrome-800">{item}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">On-Pump Preferred Candidates</h4>
 <div className="space-y-2 text-sm">
 {[
 'Complex multi-vessel disease (3+ grafts)',
 'Intramyocardial LAD requiring endarterectomy',
 'Small or diffusely diseased target vessels',
 'Concomitant valve or aortic surgery',
 'Hemodynamic instability'
 ].map((item, index) => (
 <div key={index} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
 <span className="text-amber-500 mt-0.5">&#x2022;</span>
 <span className="text-amber-800">{item}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Reference:</strong> CORONARY Trial (5-year), ROOBY Trial, GOPCABE Trial.
 Decision should be individualized based on surgeon experience and patient risk profile.
 </p>
 </div>
 </div>
 );
 case 'analytics':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <BarChart3 className="w-8 h-8 text-porsche-600" />
 Coronary Service Line Analytics
 </h3>
 {/* Volume Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 {[
 { label: 'Total PCI Volume', value: '1,247', change: '+8.3%', period: 'YTD', bgClass: 'bg-chrome-50', borderClass: 'border-chrome-200', textClass: 'text-chrome-600' },
 { label: 'CABG Volume', value: '312', change: '+4.1%', period: 'YTD', bgClass: 'bg-red-50', borderClass: 'border-red-200', textClass: 'text-red-600' },
 { label: 'Diagnostic Cath', value: '2,891', change: '-2.1%', period: 'YTD', bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-600' },
 { label: 'STEMI Activations', value: '187', change: '+1.6%', period: 'YTD', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-600' }
 ].map((item, index) => (
 <div key={index} className={`p-6 rounded-xl ${item.bgClass} border ${item.borderClass}`}>
 <div className={`text-3xl font-bold ${item.textClass} mb-1`}>{item.value}</div>
 <div className="font-medium text-titanium-900">{item.label}</div>
 <div className="text-sm text-titanium-600 mt-1">
 <span className={item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>{item.change}</span> vs prior year ({item.period})
 </div>
 </div>
 ))}
 </div>

 {/* Case Mix */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">PCI Case Mix</h4>
 <div className="space-y-3">
 {[
 { type: 'Elective PCI', count: 687, pct: '55.1%', barWidth: '55%' },
 { type: 'Urgent PCI (NSTEMI)', count: 298, pct: '23.9%', barWidth: '24%' },
 { type: 'Primary PCI (STEMI)', count: 187, pct: '15.0%', barWidth: '15%' },
 { type: 'Rescue PCI', count: 42, pct: '3.4%', barWidth: '3.4%' },
 { type: 'Staged PCI', count: 33, pct: '2.6%', barWidth: '2.6%' }
 ].map((item, index) => (
 <div key={index}>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-titanium-800">{item.type}</span>
 <span className="font-medium text-titanium-900">{item.count} ({item.pct})</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-porsche-500 h-2 rounded-full" style={{ width: item.barWidth }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">CABG Case Mix</h4>
 <div className="space-y-3">
 {[
 { type: 'Isolated CABG', count: 198, pct: '63.5%', barWidth: '63.5%' },
 { type: 'CABG + Valve', count: 62, pct: '19.9%', barWidth: '20%' },
 { type: 'CABG + Aortic', count: 18, pct: '5.8%', barWidth: '6%' },
 { type: 'Redo CABG', count: 22, pct: '7.1%', barWidth: '7%' },
 { type: 'Emergency CABG', count: 12, pct: '3.8%', barWidth: '4%' }
 ].map((item, index) => (
 <div key={index}>
 <div className="flex justify-between text-sm mb-1">
 <span className="text-titanium-800">{item.type}</span>
 <span className="font-medium text-titanium-900">{item.count} ({item.pct})</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2">
 <div className="bg-medical-red-500 h-2 rounded-full" style={{ width: item.barWidth }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Quarterly Trends */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Quarterly Volume Trends</h4>
 <div className="grid grid-cols-4 gap-4">
 {[
 { quarter: 'Q1 2025', pci: 298, cabg: 71, cath: 712 },
 { quarter: 'Q2 2025', pci: 321, cabg: 82, cath: 738 },
 { quarter: 'Q3 2025', pci: 314, cabg: 79, cath: 721 },
 { quarter: 'Q4 2025', pci: 314, cabg: 80, cath: 720 }
 ].map((q, index) => (
 <div key={index} className="bg-white p-4 rounded-xl border border-titanium-200 text-center">
 <div className="font-medium text-titanium-900 mb-3">{q.quarter}</div>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-chrome-600">PCI</span>
 <span className="font-medium">{q.pci}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-red-600">CABG</span>
 <span className="font-medium">{q.cabg}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-purple-600">Cath</span>
 <span className="font-medium">{q.cath}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 case 'outcomes':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <TrendingUp className="w-8 h-8 text-green-600" />
 Procedural Outcomes Dashboard
 </h3>

 {/* Key Quality Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 {[
 { label: 'PCI In-Hospital Mortality', value: '1.2%', benchmark: '<2.0%', status: 'met', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
 { label: 'CABG 30-Day Mortality', value: '2.1%', benchmark: '<3.0%', status: 'met', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
 { label: 'D2B Time (Median)', value: '58 min', benchmark: '<90 min', status: 'met', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
 { label: 'PCI Complication Rate', value: '3.8%', benchmark: '<5.0%', status: 'met', bgClass: 'bg-green-50', borderClass: 'border-green-200' }
 ].map((item, index) => (
 <div key={index} className={`p-6 rounded-xl ${item.bgClass} border ${item.borderClass}`}>
 <div className="text-2xl font-bold text-titanium-900 mb-1">{item.value}</div>
 <div className="font-medium text-titanium-800 text-sm">{item.label}</div>
 <div className="text-xs text-green-600 mt-2">Benchmark: {item.benchmark}</div>
 </div>
 ))}
 </div>

 {/* STEMI Outcomes */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">STEMI Quality Metrics</h4>
 <div className="space-y-4">
 {[
 { metric: 'Door-to-Balloon <90 min', value: '91.4%', target: '>90%', met: true },
 { metric: 'First Medical Contact to Device <120 min', value: '87.2%', target: '>75%', met: true },
 { metric: 'Aspirin at Arrival', value: '98.7%', target: '>95%', met: true },
 { metric: 'DAPT at Discharge', value: '96.1%', target: '>95%', met: true },
 { metric: 'Statin at Discharge', value: '97.3%', target: '>95%', met: true },
 { metric: 'Cardiac Rehab Referral', value: '82.4%', target: '>85%', met: false }
 ].map((item, index) => (
 <div key={index} className="flex items-center justify-between">
 <span className="text-sm text-titanium-800">{item.metric}</span>
 <div className="flex items-center gap-3">
 <span className="font-medium text-titanium-900">{item.value}</span>
 <span className={`text-xs px-2 py-1 rounded-full ${
 item.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
 }`}>
 {item.met ? 'Met' : 'Gap'}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">CABG Quality Metrics (STS Benchmarks)</h4>
 <div className="space-y-4">
 {[
 { metric: 'Operative Mortality', value: '2.1%', target: '<2.3%', met: true },
 { metric: 'Deep Sternal Wound Infection', value: '0.4%', target: '<0.6%', met: true },
 { metric: 'Prolonged Ventilation (>24h)', value: '8.2%', target: '<10%', met: true },
 { metric: 'Stroke', value: '1.3%', target: '<1.5%', met: true },
 { metric: 'Renal Failure', value: '2.8%', target: '<4.0%', met: true },
 { metric: 'Readmission (30-day)', value: '11.7%', target: '<12%', met: true }
 ].map((item, index) => (
 <div key={index} className="flex items-center justify-between">
 <span className="text-sm text-titanium-800">{item.metric}</span>
 <div className="flex items-center gap-3">
 <span className="font-medium text-titanium-900">{item.value}</span>
 <span className={`text-xs px-2 py-1 rounded-full ${
 item.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
 }`}>
 {item.met ? 'Met' : 'Gap'}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Complication Detail */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">PCI Complication Breakdown</h4>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { type: 'Access Site Bleeding', rate: '1.8%', trend: 'Decreasing' },
 { type: 'Periprocedural MI', rate: '0.9%', trend: 'Stable' },
 { type: 'Coronary Dissection', rate: '0.6%', trend: 'Stable' },
 { type: 'Contrast Nephropathy', rate: '2.4%', trend: 'Decreasing' },
 { type: 'Stroke/TIA', rate: '0.3%', trend: 'Stable' },
 { type: 'Emergency CABG', rate: '0.2%', trend: 'Stable' },
 { type: 'Stent Thrombosis', rate: '0.4%', trend: 'Decreasing' },
 { type: 'Vascular Complication', rate: '1.1%', trend: 'Decreasing' }
 ].map((item, index) => (
 <div key={index} className="p-3 bg-titanium-50 rounded-lg">
 <div className="font-medium text-titanium-900 text-sm">{item.type}</div>
 <div className="text-lg font-bold text-titanium-800">{item.rate}</div>
 <div className={`text-xs ${item.trend === 'Decreasing' ? 'text-green-600' : 'text-titanium-500'}`}>
 {item.trend}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 case 'reporting':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <FileText className="w-8 h-8 text-porsche-600" />
 Coronary Service Line Reports
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Available Reports */}
 <div className="space-y-4">
 <h4 className="font-semibold text-titanium-900 mb-2">Available Reports</h4>
 {[
 { name: 'Monthly PCI Volume & Outcomes', frequency: 'Monthly', lastRun: 'Feb 28, 2026', status: 'Ready' },
 { name: 'CABG Quality Dashboard (STS Format)', frequency: 'Quarterly', lastRun: 'Jan 15, 2026', status: 'Ready' },
 { name: 'STEMI System Report', frequency: 'Monthly', lastRun: 'Feb 28, 2026', status: 'Ready' },
 { name: 'Door-to-Balloon Time Analysis', frequency: 'Weekly', lastRun: 'Mar 7, 2026', status: 'Ready' },
 { name: 'Operator Volume Report (ACCF/SCAI)', frequency: 'Annual', lastRun: 'Jan 1, 2026', status: 'Ready' },
 { name: 'Cath Lab Utilization Report', frequency: 'Monthly', lastRun: 'Feb 28, 2026', status: 'Ready' },
 { name: 'Device Utilization (DES/BMS/DCB)', frequency: 'Quarterly', lastRun: 'Jan 15, 2026', status: 'Ready' },
 { name: 'Appropriate Use Criteria (AUC) Report', frequency: 'Quarterly', lastRun: 'Jan 15, 2026', status: 'Ready' }
 ].map((report, index) => (
 <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-titanium-200 hover:shadow-md transition-shadow">
 <div>
 <div className="font-medium text-titanium-900">{report.name}</div>
 <div className="text-xs text-titanium-500">{report.frequency} | Last: {report.lastRun}</div>
 </div>
 <button onClick={() => {
 setGeneratingReport(report.name);
 setTimeout(() => setGeneratingReport(null), 2000);
 }} className="px-3 py-1.5 bg-porsche-50 text-porsche-600 rounded-lg text-sm font-medium border border-porsche-200 hover:bg-porsche-100 transition-colors">
 {generatingReport === report.name ? '✓ Generated' : 'Generate'}
 </button>
 </div>
 ))}
 </div>

 {/* Regulatory Submissions */}
 <div className="space-y-4">
 <h4 className="font-semibold text-titanium-900 mb-2">Regulatory & Registry Submissions</h4>
 {[
 { name: 'NCDR CathPCI Registry', deadline: 'Q1 2026 - Mar 31', status: 'In Progress', statusColor: 'bg-amber-100 text-amber-700' },
 { name: 'STS Adult Cardiac Surgery', deadline: 'Q1 2026 - Mar 31', status: 'In Progress', statusColor: 'bg-amber-100 text-amber-700' },
 { name: 'ACC Chest Pain - MI Registry', deadline: 'Q1 2026 - Mar 31', status: 'Complete', statusColor: 'bg-green-100 text-green-700' },
 { name: 'CMS STEMI Core Measures', deadline: 'Annual - Jun 30', status: 'Not Due', statusColor: 'bg-titanium-100 text-titanium-600' }
 ].map((item, index) => (
 <div key={index} className="p-4 bg-white rounded-xl border border-titanium-200">
 <div className="flex justify-between items-start mb-2">
 <div className="font-medium text-titanium-900">{item.name}</div>
 <span className={`text-xs px-2 py-1 rounded-full ${item.statusColor}`}>{item.status}</span>
 </div>
 <div className="text-xs text-titanium-500">Deadline: {item.deadline}</div>
 </div>
 ))}

 <div className="mt-6 p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <h4 className="font-semibold text-chrome-900 mb-2">Quick Export</h4>
 <div className="grid grid-cols-2 gap-3">
 {['PDF Summary', 'Excel Data', 'CSV Raw Data', 'PowerPoint Deck'].map((format, index) => (
 <button key={index} onClick={() => {
 setExportingFormat(format);
 setTimeout(() => setExportingFormat(null), 2000);
 }} className="px-3 py-2 bg-white text-chrome-700 rounded-lg text-sm font-medium border border-chrome-200 hover:bg-chrome-100 transition-colors">
 {exportingFormat === format ? '✓ Exported' : format}
 </button>
 ))}
 </div>
 </div>

 <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
 <h4 className="font-semibold text-purple-900 mb-2">Scheduled Reports</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-purple-800">Weekly D2B Summary</span>
 <span className="text-purple-600">Every Monday 6:00 AM</span>
 </div>
 <div className="flex justify-between">
 <span className="text-purple-800">Monthly PCI Dashboard</span>
 <span className="text-purple-600">1st of month</span>
 </div>
 <div className="flex justify-between">
 <span className="text-purple-800">Quarterly STS Submission</span>
 <span className="text-purple-600">End of quarter</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 default:
 return <GRACEScoreCalculator />;
 }
  };

  return (
 <div className="min-h-screen bg-gradient-to-br from-chrome-50 via-indigo-50/30 to-purple-50 p-6 relative overflow-hidden">
 {/* Web 3.0 Background Elements */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-chrome-100 via-transparent to-transparent" />
 <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
 <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-chrome-400 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />

 <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
 {/* Page Header */}
 <header className="metal-card bg-white border border-titanium-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400 to-purple-400 rounded-full blur-2xl" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold bg-gradient-to-r from-titanium-900 via-titanium-800 to-titanium-900 bg-clip-text text-transparent mb-2 font-sf">
 Service Line Command Center
 </h1>
 <p className="text-lg text-titanium-600 font-medium">
 Advanced Analytics for CABG, PCI, and Coronary Revascularization
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="p-4 rounded-2xl bg-medical-red-50 border-medical-red-200 border shadow-lg">
 <Heart className="w-8 h-8 text-medical-red-600" />
 </div>
 </div>
 </div>
 </header>

 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as TabId)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? 'bg-medical-red-50 border-medical-red-200 text-medical-red-600 shadow-lg scale-105'
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? 'text-medical-red-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? 'text-medical-red-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className="absolute inset-0 bg-gradient-to-r from-medical-red-400/20 to-medical-red-500/20 rounded-xl opacity-50" />
 )}
 </button>
 );
 })}
 </div>
 </div>

 {/* Tab Content */}
 <div className="space-y-6">
 {renderTabContent()}
 </div>
 </div>
 </div>
  );
};

export default CoronaryServiceLineView;
