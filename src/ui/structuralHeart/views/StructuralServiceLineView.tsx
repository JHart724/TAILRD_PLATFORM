import React, { useState } from 'react';
import { Heart, Users, Calendar, Shield, Gauge, Activity, Target, BarChart3, FileText, TrendingUp } from 'lucide-react';

// Import Structural Heart components
import STSRiskCalculator from '../components/STSRiskCalculator';
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';

type TabId = 'tavr' | 'teer-mitral' | 'teer-tricuspid' | 'tmvr' | 'pfo-asd' | 'sts-risk' | 'referrals' | 'analytics' | 'outcomes' | 'quality' | 'reporting';

const StructuralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tavr');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const tabs = [
 { id: 'tavr', label: 'TAVR Analytics', icon: Heart, description: 'TAVR procedure analytics and outcomes' },
 { id: 'teer-mitral', label: 'TEER Mitral', icon: Activity, description: 'MitraClip procedure funnel' },
 { id: 'teer-tricuspid', label: 'TEER Tricuspid', icon: Target, description: 'Tricuspid TEER pathway' },
 { id: 'tmvr', label: 'TMVR', icon: Shield, description: 'Transcatheter mitral valve replacement' },
 { id: 'pfo-asd', label: 'PFO/ASD', icon: Shield, description: 'Patent foramen ovale and atrial septal defect closure' },
 { id: 'sts-risk', label: 'STS Risk', icon: Gauge, description: 'STS risk calculator' },
 { id: 'referrals', label: 'Referral Network', icon: Users, description: 'Heart team referral patterns' },
 { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced analytics dashboard' },
 { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Clinical outcomes tracking' },
 { id: 'quality', label: 'Quality', icon: Target, description: 'Quality metrics and benchmarks' },
 { id: 'reporting', label: 'Reporting', icon: FileText, description: 'Automated reports and exports' }
  ];

  const renderTabContent = () => {
 switch (activeTab) {
 case 'tavr':
 return <TAVRAnalyticsDashboard />;
 case 'sts-risk':
 return <STSRiskCalculator />;
 case 'referrals':
 return <StructuralReferralNetworkVisualization />;
 case 'teer-mitral':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Activity className="w-8 h-8 text-medical-purple-600" />
 TEER Mitral (MitraClip) Funnel
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 {[
 { stage: 'Screening', patients: 247, rate: '100%', bgColor: 'bg-chrome-50', borderColor: 'border-chrome-200', textColor: 'text-chrome-600' },
 { stage: 'Suitable', patients: 189, rate: '76.5%', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' },
 { stage: 'Scheduled', patients: 156, rate: '82.5%', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
 { stage: 'Completed', patients: 142, rate: '91.0%', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-600' }
 ].map((item, index) => (
 <div key={index} className={`text-center p-6 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
 <div className={`text-3xl font-bold ${item.textColor} mb-2`}>{item.patients}</div>
 <div className="font-semibold text-titanium-900">{item.stage}</div>
 <div className={`text-sm ${item.textColor}`}>{item.rate}</div>
 </div>
 ))}
 </div>
 <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Suitability Criteria</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between"><span>Moderate-to-severe MR</span><span className="text-green-600">✓ Met</span></div>
 <div className="flex justify-between"><span>Disease Stage ≥20%</span><span className="text-green-600">✓ Met</span></div>
 <div className="flex justify-between"><span>Appropriate anatomy</span><span className="text-amber-600">Review</span></div>
 <div className="flex justify-between"><span>Heart team evaluation</span><span className="text-green-600">✓ Met</span></div>
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Recent Outcomes</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between"><span>30-day mortality</span><span className="font-medium">2.1%</span></div>
 <div className="flex justify-between"><span>Procedural success</span><span className="font-medium">96.8%</span></div>
 <div className="flex justify-between"><span>MR reduction ≥1 grade</span><span className="font-medium">94.2%</span></div>
 <div className="flex justify-between"><span>Length of stay</span><span className="font-medium">2.3 days</span></div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'teer-tricuspid':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Target className="w-8 h-8 text-medical-purple-600" />
 TEER Tricuspid Pathway
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { stage: 'Evaluation', patients: 89, status: 'Active' },
 { stage: 'Approved', patients: 34, status: 'In Progress' },
 { stage: 'Completed', patients: 12, status: 'Success' }
 ].map((item, index) => (
 <div key={index} className="text-center p-6 rounded-xl bg-purple-50 border border-purple-200">
 <div className="text-3xl font-bold text-purple-600 mb-2">{item.patients}</div>
 <div className="font-semibold text-titanium-900">{item.stage}</div>
 <div className="text-sm text-purple-600">{item.status}</div>
 </div>
 ))}
 </div>
 </div>
 );
 case 'tmvr':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Shield className="w-8 h-8 text-medical-purple-600" />
 TMVR Candidate Assessment
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Inclusion Criteria</h4>
 <div className="space-y-3">
 {[
 { criteria: 'Severe MS or MR', met: true },
 { criteria: 'High surgical risk', met: true },
 { criteria: 'Suitable anatomy', met: true },
 { criteria: 'Disease Stage ≥20%', met: true },
 { criteria: 'Heart team approval', met: false }
 ].map((item, index) => (
 <div key={index} className={`p-3 rounded-lg border ${
 item.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
 }`}>
 <div className="flex items-center justify-between">
 <span className="text-titanium-900">{item.criteria}</span>
 <span className={`font-medium ${item.met ? 'text-green-600' : 'text-red-600'}`}>
 {item.met ? '✓ Met' : '✗ Not Met'}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Procedure Stats</h4>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span className="text-titanium-600">Total Procedures</span>
 <span className="font-bold text-titanium-900">89</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Success Rate</span>
 <span className="font-bold text-green-600">94.4%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Complication Rate</span>
 <span className="font-bold text-amber-600">5.6%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Avg Procedure Time</span>
 <span className="font-bold text-titanium-900">120 min</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'pfo-asd':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Shield className="w-8 h-8 text-medical-purple-600" />
 PFO/ASD Closure Assessment
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Closure Criteria</h4>
 <div className="space-y-3">
 {[
 { criteria: 'Cryptogenic stroke', met: true },
 { criteria: 'Age <60 years', met: true },
 { criteria: 'Suitable anatomy', met: true },
 { criteria: 'High-risk PFO features', met: true },
 { criteria: 'No other stroke etiology', met: false }
 ].map((item, index) => (
 <div key={index} className={`p-3 rounded-lg border ${
 item.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
 }`}>
 <div className="flex items-center justify-between">
 <span className="text-titanium-900">{item.criteria}</span>
 <span className={`font-medium ${item.met ? 'text-green-600' : 'text-red-600'}`}>
 {item.met ? '✓ Met' : '✗ Not Met'}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">Procedure Stats</h4>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span className="text-titanium-600">Total Closures</span>
 <span className="font-bold text-titanium-900">67</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Success Rate</span>
 <span className="font-bold text-green-600">98.5%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Complication Rate</span>
 <span className="font-bold text-amber-600">1.5%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-titanium-600">Avg Procedure Time</span>
 <span className="font-bold text-titanium-900">30 min</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'analytics':
 return <TAVRAnalyticsDashboard />;
 case 'outcomes':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6">Clinical Outcomes Tracking</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { metric: '30-Day Mortality', value: '1.8%', benchmark: '2.5%', trend: 'down' },
 { metric: 'Stroke Rate', value: '1.2%', benchmark: '1.8%', trend: 'down' },
 { metric: 'Readmission Rate', value: '8.4%', benchmark: '12.0%', trend: 'down' }
 ].map((item, index) => (
 <div key={index} className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-2">{item.metric}</h4>
 <div className="text-3xl font-bold text-medical-purple-600 mb-1">{item.value}</div>
 <div className="text-sm text-titanium-600">Benchmark: {item.benchmark}</div>
 <div className="text-xs text-green-600">↓ Better than benchmark</div>
 </div>
 ))}
 </div>
 </div>
 );
 case 'quality':
 return (
 <div className="space-y-6">
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <Target className="w-8 h-8 text-medical-purple-600" />
 Quality Metrics & Benchmarks
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 {[
 { metric: '30-Day Mortality', value: '1.8%', benchmark: '<2.5%', met: true },
 { metric: 'Stroke Rate', value: '1.2%', benchmark: '<2.0%', met: true },
 { metric: 'Paravalvular Leak', value: '3.4%', benchmark: '<5.0%', met: true },
 { metric: '30-Day Readmission', value: '8.4%', benchmark: '<12.0%', met: true }
 ].map((item, index) => (
 <div key={index} className={`p-6 rounded-xl border ${item.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
 <div className="text-2xl font-bold text-titanium-900 mb-1">{item.value}</div>
 <div className="font-medium text-titanium-800 text-sm">{item.metric}</div>
 <div className={`text-xs mt-2 ${item.met ? 'text-green-600' : 'text-red-600'}`}>
 Benchmark: {item.benchmark} {item.met ? '✓' : '✗'}
 </div>
 </div>
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">STS/ACC TVT Registry Metrics</h4>
 <div className="space-y-3">
 {[
 { metric: 'TAVR In-Hospital Mortality', value: '1.4%', percentile: '92nd' },
 { metric: 'New Pacemaker Rate', value: '12.3%', percentile: '75th' },
 { metric: 'Major Vascular Complication', value: '2.1%', percentile: '88th' },
 { metric: 'Moderate+ PVL', value: '3.4%', percentile: '82nd' },
 { metric: 'Acute Kidney Injury', value: '1.8%', percentile: '90th' }
 ].map((item, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
 <span className="text-titanium-800 text-sm">{item.metric}</span>
 <div className="flex items-center gap-3">
 <span className="font-medium text-titanium-900">{item.value}</span>
 <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{item.percentile}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4">MitraClip Quality Indicators</h4>
 <div className="space-y-3">
 {[
 { metric: 'Technical Success Rate', value: '96.8%', status: 'Excellent' },
 { metric: 'MR Reduction to ≤2+', value: '94.2%', status: 'Excellent' },
 { metric: '30-Day Mortality', value: '2.1%', status: 'Below Benchmark' },
 { metric: 'Heart Team Review Rate', value: '98.0%', status: 'Excellent' },
 { metric: 'Discharge <3 Days', value: '78.5%', status: 'Good' }
 ].map((item, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-chrome-50 rounded-lg">
 <span className="text-titanium-800 text-sm">{item.metric}</span>
 <div className="flex items-center gap-3">
 <span className="font-medium text-titanium-900">{item.value}</span>
 <span className={`text-xs px-2 py-1 rounded-full ${
 item.status === 'Excellent' ? 'bg-green-100 text-green-700' :
 item.status === 'Good' ? 'bg-chrome-100 text-chrome-700' :
 'bg-amber-100 text-amber-700'
 }`}>{item.status}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 case 'reporting':
 return (
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-8">
 <h3 className="text-2xl font-bold text-titanium-900 mb-6 flex items-center gap-3">
 <FileText className="w-8 h-8 text-medical-purple-600" />
 Structural Heart Reports
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="space-y-4">
 <h4 className="font-semibold text-titanium-900 mb-2">Available Reports</h4>
 {[
 { name: 'Monthly TAVR Volume & Outcomes', frequency: 'Monthly', lastRun: 'Feb 28, 2026' },
 { name: 'STS/ACC TVT Registry Submission', frequency: 'Quarterly', lastRun: 'Jan 15, 2026' },
 { name: 'MitraClip Program Report', frequency: 'Monthly', lastRun: 'Feb 28, 2026' },
 { name: 'Heart Team Conference Summary', frequency: 'Weekly', lastRun: 'Mar 7, 2026' },
 { name: 'Structural Heart Program Annual Report', frequency: 'Annual', lastRun: 'Jan 1, 2026' }
 ].map((report, index) => (
 <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-titanium-200 hover:shadow-md transition-shadow">
 <div>
 <div className="font-medium text-titanium-900">{report.name}</div>
 <div className="text-xs text-titanium-500">{report.frequency} | Last: {report.lastRun}</div>
 </div>
 <button onClick={() => { setGeneratingReport(report.name); setTimeout(() => setGeneratingReport(null), 2000); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
 generatingReport === report.name
 ? 'bg-green-50 text-green-600 border-green-200'
 : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
 }`}>
 {generatingReport === report.name ? '✓ Generated' : 'Generate'}
 </button>
 </div>
 ))}
 </div>
 <div className="space-y-4">
 <h4 className="font-semibold text-titanium-900 mb-2">Quick Export</h4>
 <div className="p-4 bg-chrome-50 rounded-xl border border-chrome-200">
 <div className="grid grid-cols-2 gap-3">
 {['PDF Summary', 'Excel Data', 'CSV Raw Data', 'PowerPoint Deck'].map((format, index) => (
 <button key={index} onClick={() => { setExportingFormat(format); setTimeout(() => setExportingFormat(null), 2000); }} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
 exportingFormat === format
 ? 'bg-green-50 text-green-600 border-green-200'
 : 'bg-white text-chrome-700 border-chrome-200 hover:bg-chrome-100'
 }`}>
 {exportingFormat === format ? `✓ ${format}` : format}
 </button>
 ))}
 </div>
 </div>
 <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
 <h4 className="font-semibold text-purple-900 mb-2">Scheduled Reports</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-purple-800">Weekly Heart Team Summary</span>
 <span className="text-purple-600">Every Friday 6:00 AM</span>
 </div>
 <div className="flex justify-between">
 <span className="text-purple-800">Monthly TAVR Dashboard</span>
 <span className="text-purple-600">1st of month</span>
 </div>
 <div className="flex justify-between">
 <span className="text-purple-800">Quarterly TVT Submission</span>
 <span className="text-purple-600">End of quarter</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 default:
 return <TAVRAnalyticsDashboard />;
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
 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400/10 rounded-full blur-2xl" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h1 className="text-4xl font-bold bg-gradient-to-r from-titanium-900 via-titanium-800 to-titanium-900 bg-clip-text text-transparent mb-2 font-sf">
 Service Line Command Center
 </h1>
 <p className="text-lg text-titanium-600 font-medium">
 Advanced Analytics for TAVR, TEER, and Structural Heart Interventions
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="p-4 rounded-2xl bg-medical-purple-50 border-medical-purple-200 border shadow-lg">
 <Heart className="w-8 h-8 text-medical-purple-600" />
 </div>
 </div>
 </div>
 </header>

 {/* Tab Navigation */}
 <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
 <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as TabId)}
 className={`group relative p-4 rounded-xl border transition-all duration-300 ${
 isActive
 ? 'bg-medical-purple-50 border-medical-purple-200 text-medical-purple-600 shadow-lg scale-105'
 : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
 }`}
 >
 <div className="flex flex-col items-center gap-2">
 <Icon className={`w-6 h-6 ${isActive ? 'text-medical-purple-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
 <span className={`text-sm font-semibold ${isActive ? 'text-medical-purple-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
 {tab.label}
 </span>
 </div>
 {isActive && (
 <div className="absolute inset-0 bg-gradient-to-r from-medical-purple-400/20 to-medical-purple-500/20 rounded-xl opacity-50" />
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

export default StructuralServiceLineView;