import React, { useState, useEffect } from 'react';
import { Pill, Target, Heart, Stethoscope, TrendingUp, TrendingDown, Zap, RefreshCw, Download, AlertTriangle, X, ChevronRight, Users, Calendar, FileText, Activity } from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface MetricData {
  value: number;
  trend: number;
  timestamp: Date;
}

interface ProviderMetric {
  name: string;
  specialty: string;
  score: number;
  rate: number;
  trend: number;
  patients: number;
  riskAdjusted: number;
}

interface PatientData {
  id: string;
  name: string;
  age: number;
  ejectionFraction: number;
  currentPillars: number;
  missingPillars: string[];
  provider: string;
  lastVisit: Date;
  riskLevel: 'low' | 'medium' | 'high';
  actionItems: string[];
  hfType: 'HFrEF' | 'HFpEF' | 'HFmrEF';
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
}

interface HFTypeData {
  type: 'HFrEF' | 'HFpEF' | 'HFmrEF';
  totalPatients: number;
  fourPillarRate: number;
  avgPillars: number;
  nyhaBreakdown: {
 I: { count: number; avgPillars: number; fourPillarRate: number };
 II: { count: number; avgPillars: number; fourPillarRate: number };
 III: { count: number; avgPillars: number; fourPillarRate: number };
 IV: { count: number; avgPillars: number; fourPillarRate: number };
  };
  pillarDistribution: number[];
}

const GDMTAnalyticsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pillars' | 'types' | 'providers' | 'real-time'>('real-time');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedPillarCount, setSelectedPillarCount] = useState<number | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedHFType, setSelectedHFType] = useState<'HFrEF' | 'HFpEF' | 'HFmrEF' | null>(null);
  const [selectedNYHAClass, setSelectedNYHAClass] = useState<'I' | 'II' | 'III' | 'IV' | null>(null);
  const [gdmtMetrics, setGdmtMetrics] = useState<MetricData[]>([
 { value: 8.2, trend: -1.8, timestamp: new Date() },
 { value: 22.4, trend: -2.1, timestamp: new Date() },
 { value: 33.6, trend: 1.4, timestamp: new Date() },
 { value: 24.1, trend: 3.2, timestamp: new Date() },
 { value: 11.7, trend: 2.8, timestamp: new Date() }
  ]);

  const [providers, setProviders] = useState<ProviderMetric[]>([
 { name: 'Dr. Sarah Williams', specialty: 'Cardiology', score: 92.1, rate: 42.2, trend: 8.4, patients: 824, riskAdjusted: 94.3 },
 { name: 'Dr. Michael Chen', specialty: 'Cardiology', score: 88.7, rate: 38.9, trend: 5.2, patients: 1156, riskAdjusted: 91.2 },
 { name: 'Dr. Jennifer Martinez', specialty: 'Internal Medicine', score: 67.3, rate: 18.5, trend: 12.1, patients: 2340, riskAdjusted: 73.8 },
 { name: 'Dr. Robert Thompson', specialty: 'Cardiology', score: 85.4, rate: 34.7, trend: -2.3, patients: 1478, riskAdjusted: 87.9 },
 { name: 'Dr. Lisa Park', specialty: 'Internal Medicine', score: 71.2, rate: 22.8, trend: 6.7, patients: 1890, riskAdjusted: 76.5 }
  ]);

  // Enhanced HF Type Analytics Data
  const [hfTypeData] = useState<HFTypeData[]>([
 {
 type: 'HFrEF',
 totalPatients: 7200,
 fourPillarRate: 11.7,
 avgPillars: 2.1,
 nyhaBreakdown: {
 I: { count: 864, avgPillars: 3.1, fourPillarRate: 28.4 },
 II: { count: 2880, avgPillars: 2.4, fourPillarRate: 14.2 },
 III: { count: 2808, avgPillars: 1.8, fourPillarRate: 7.6 },
 IV: { count: 648, avgPillars: 1.3, fourPillarRate: 3.1 }
 },
 pillarDistribution: [8.2, 22.4, 33.6, 24.1, 11.7]
 },
 {
 type: 'HFpEF',
 totalPatients: 9000,
 fourPillarRate: 4.8,
 avgPillars: 1.6,
 nyhaBreakdown: {
 I: { count: 1980, avgPillars: 2.1, fourPillarRate: 12.3 },
 II: { count: 4140, avgPillars: 1.7, fourPillarRate: 5.4 },
 III: { count: 2520, avgPillars: 1.2, fourPillarRate: 2.1 },
 IV: { count: 360, avgPillars: 0.8, fourPillarRate: 0.0 }
 },
 pillarDistribution: [28.4, 32.1, 24.6, 10.1, 4.8]
 },
 {
 type: 'HFmrEF',
 totalPatients: 1800,
 fourPillarRate: 8.4,
 avgPillars: 1.9,
 nyhaBreakdown: {
 I: { count: 396, avgPillars: 2.6, fourPillarRate: 18.2 },
 II: { count: 792, avgPillars: 2.0, fourPillarRate: 9.8 },
 III: { count: 522, avgPillars: 1.5, fourPillarRate: 4.2 },
 IV: { count: 90, avgPillars: 1.0, fourPillarRate: 0.0 }
 },
 pillarDistribution: [14.2, 26.8, 30.4, 20.2, 8.4]
 }
  ]);

  // Mock patient data for pillar drill-down with enhanced HF and NYHA data
  const [patientsByPillar] = useState<Record<number, PatientData[]>>({
 0: [
 { id: 'P001', name: 'Johnson, Mary', age: 67, ejectionFraction: 25, currentPillars: 0, missingPillars: ['ACE/ARB', 'Beta-blocker', 'MRA', 'SGLT2'], provider: 'Dr. Sarah Williams', lastVisit: new Date('2024-10-20'), riskLevel: 'high', actionItems: ['Initiate ACE inhibitor', 'Start beta-blocker', 'Assess kidney function'], hfType: 'HFrEF', nyhaClass: 'III' },
 { id: 'P002', name: 'Chen, Robert', age: 72, ejectionFraction: 30, currentPillars: 0, missingPillars: ['ACE/ARB', 'Beta-blocker', 'MRA', 'SGLT2'], provider: 'Dr. Michael Chen', lastVisit: new Date('2024-10-18'), riskLevel: 'high', actionItems: ['Review contraindications', 'Schedule cardiology consultation'], hfType: 'HFrEF', nyhaClass: 'IV' }
 ],
 1: [
 { id: 'P003', name: 'Rodriguez, Anna', age: 58, ejectionFraction: 35, currentPillars: 1, missingPillars: ['Beta-blocker', 'MRA', 'SGLT2'], provider: 'Dr. Jennifer Martinez', lastVisit: new Date('2024-10-22'), riskLevel: 'medium', actionItems: ['Add beta-blocker therapy', 'Monitor blood pressure'], hfType: 'HFrEF', nyhaClass: 'II' },
 { id: 'P004', name: 'Williams, David', age: 64, ejectionFraction: 28, currentPillars: 1, missingPillars: ['MRA', 'SGLT2'], provider: 'Dr. Robert Thompson', lastVisit: new Date('2024-10-19'), riskLevel: 'medium', actionItems: ['Consider MRA addition', 'SGLT2 inhibitor evaluation'], hfType: 'HFrEF', nyhaClass: 'III' }
 ],
 2: [
 { id: 'P005', name: 'Brown, Patricia', age: 61, ejectionFraction: 45, currentPillars: 2, missingPillars: ['MRA', 'SGLT2'], provider: 'Dr. Lisa Park', lastVisit: new Date('2024-10-21'), riskLevel: 'medium', actionItems: ['MRA titration', 'Diabetes screening for SGLT2'], hfType: 'HFpEF', nyhaClass: 'II' },
 { id: 'P006', name: 'Davis, Michael', age: 69, ejectionFraction: 32, currentPillars: 2, missingPillars: ['SGLT2'], provider: 'Dr. Sarah Williams', lastVisit: new Date('2024-10-23'), riskLevel: 'low', actionItems: ['Consider SGLT2 inhibitor'], hfType: 'HFrEF', nyhaClass: 'II' }
 ],
 3: [
 { id: 'P007', name: 'Miller, Susan', age: 55, ejectionFraction: 42, currentPillars: 3, missingPillars: ['SGLT2'], provider: 'Dr. Michael Chen', lastVisit: new Date('2024-10-24'), riskLevel: 'low', actionItems: ['SGLT2 inhibitor initiation'], hfType: 'HFmrEF', nyhaClass: 'I' },
 { id: 'P008', name: 'Wilson, James', age: 70, ejectionFraction: 38, currentPillars: 3, missingPillars: ['MRA'], provider: 'Dr. Jennifer Martinez', lastVisit: new Date('2024-10-20'), riskLevel: 'low', actionItems: ['MRA dose optimization'], hfType: 'HFrEF', nyhaClass: 'II' }
 ],
 4: [
 { id: 'P009', name: 'Garcia, Elena', age: 59, ejectionFraction: 45, currentPillars: 4, missingPillars: [], provider: 'Dr. Sarah Williams', lastVisit: new Date('2024-10-25'), riskLevel: 'low', actionItems: ['Continue current therapy', 'Monitor adherence'], hfType: 'HFrEF', nyhaClass: 'I' },
 { id: 'P010', name: 'Taylor, Richard', age: 66, ejectionFraction: 41, currentPillars: 4, missingPillars: [], provider: 'Dr. Michael Chen', lastVisit: new Date('2024-10-22'), riskLevel: 'low', actionItems: ['Optimize dosing', 'Schedule follow-up'], hfType: 'HFrEF', nyhaClass: 'I' }
 ]
  });

  // Simulate real-time data updates
  useEffect(() => {
 if (!isLiveMode) return;

 const interval = setInterval(() => {
 setGdmtMetrics(prev => prev.map(metric => ({
 ...metric,
 value: Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 0.5)),
 trend: metric.trend + (Math.random() - 0.5) * 0.2,
 timestamp: new Date()
 })));

 setProviders(prev => prev.map(provider => ({
 ...provider,
 score: Math.max(0, Math.min(100, provider.score + (Math.random() - 0.5) * 0.3)),
 rate: Math.max(0, Math.min(100, provider.rate + (Math.random() - 0.5) * 0.2)),
 trend: provider.trend + (Math.random() - 0.5) * 0.1
 })));

 setLastUpdate(new Date());
 }, 3000);

 return () => clearInterval(interval);
  }, [isLiveMode]);

  const exportData = () => {
 const data = {
 timestamp: new Date().toISOString(),
 gdmtMetrics,
 providers,
 summary: {
 totalPatients: providers.reduce((sum, p) => sum + p.patients, 0),
 avgScore: providers.reduce((sum, p) => sum + p.score, 0) / providers.length,
 topPerformer: providers.sort((a, b) => b.score - a.score)[0]
 }
 };
 
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `gdmt-analytics-${new Date().toISOString().split('T')[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
  };

  const handlePillarClick = (pillarCount: number) => {
 setSelectedPillarCount(pillarCount);
 setShowPatientPanel(true);
  };

  const closePillarPanel = () => {
 setShowPatientPanel(false);
 setSelectedPillarCount(null);
  };

  return (
 <div className="space-y-6">
 {/* Enhanced Header with Real-time Controls */}
 <div className="metal-card p-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-3xl font-bold text-titanium-900 mb-2">Advanced GDMT Analytics</h2>
 <p className="text-titanium-600">Real-time 4-pillar therapy optimization with predictive insights</p>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 text-sm text-titanium-600">
 <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-[#2C4A60] animate-pulse' : 'bg-gray-400'}`}></div>
 {isLiveMode ? 'Live' : 'Paused'}
 </div>
 
 <button
 onClick={() => setIsLiveMode(!isLiveMode)}
 className={`p-2 rounded-lg transition-colors ${
 isLiveMode ? 'bg-[#F0F5FA] text-[#2C4A60]' : 'bg-gray-100 text-gray-700'
 }`}
 >
 <RefreshCw className={`w-4 h-4 ${isLiveMode ? 'animate-spin' : ''}`} />
 </button>
 
 <button
 onClick={exportData}
 className="p-2 rounded-lg bg-porsche-100 text-porsche-700 hover:bg-porsche-200 transition-colors"
 >
 <Download className="w-4 h-4" />
 </button>
 
 <div className="text-xs text-titanium-500">
 Last updated: {lastUpdate.toLocaleTimeString()}
 </div>
 </div>
 </div>
 
 <div className="flex gap-4 mt-6">
 <button
 onClick={() => setActiveView('real-time')}
 className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
 activeView === 'real-time' ? 'bg-porsche-500 text-white' : 'bg-titanium-100 text-titanium-700'
 }`}
 >
 <Zap className="w-4 h-4" />
 Real-time Dashboard
 </button>
 <button
 onClick={() => setActiveView('pillars')}
 className={`px-4 py-2 rounded-lg ${activeView === 'pillars' ? 'bg-porsche-500 text-white' : 'bg-titanium-100 text-titanium-700'}`}
 >
 By # of Pillars
 </button>
 <button
 onClick={() => setActiveView('types')}
 className={`px-4 py-2 rounded-lg ${activeView === 'types' ? 'bg-porsche-500 text-white' : 'bg-titanium-100 text-titanium-700'}`}
 >
 By HF Type
 </button>
 <button
 onClick={() => setActiveView('providers')}
 className={`px-4 py-2 rounded-lg ${activeView === 'providers' ? 'bg-porsche-500 text-white' : 'bg-titanium-100 text-titanium-700'}`}
 >
 Provider Performance
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="metal-card p-6">
 {activeView === 'real-time' && (
 <div className="space-y-6">
 <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
 <Zap className="w-5 h-5 text-porsche-600" />
 Live Performance Dashboard
 </h3>
 
 {/* Key Metrics Row */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-gradient-to-br from-[#EFF3F7] to-[#E4EDF5] p-4 rounded-xl border border-[#C8D4DC]">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-sm text-[#2C4A60] font-medium">4-Pillar Achievement</div>
 <div className="text-2xl font-bold text-[#2C4A60]">{toFixed(gdmtMetrics[0]?.value ?? 0, 1)}%</div>
 </div>
 <div className={`flex items-center text-sm ${gdmtMetrics[0]?.trend > 0 ? 'text-[#2C4A60]' : 'text-red-600'}`}>
 {gdmtMetrics[0]?.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
 {toFixed(Math.abs(gdmtMetrics[0]?.trend || 0), 1)}%
 </div>
 </div>
 </div>
 
 <div className="bg-gradient-to-br from-chrome-50 to-chrome-100 p-4 rounded-xl border border-chrome-200">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-sm text-chrome-700 font-medium">Active Patients</div>
 <div className="text-2xl font-bold text-chrome-800">{providers.reduce((sum, p) => sum + p.patients, 0).toLocaleString()}</div>
 </div>
 <Heart className="w-6 h-6 text-chrome-600" />
 </div>
 </div>
 
 <div className="bg-gradient-to-br from-arterial-50 to-arterial-100 p-4 rounded-xl border border-arterial-200">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-sm text-arterial-700 font-medium">Avg Provider Score</div>
 <div className="text-2xl font-bold text-arterial-800">
 {toFixed(providers.reduce((sum, p) => sum + p.score, 0) / providers.length, 1)}
 </div>
 </div>
 <Stethoscope className="w-6 h-6 text-arterial-600" />
 </div>
 </div>
 
 <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-[#C8D4DC]">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-sm text-[#8B6914] font-medium">Optimization Rate</div>
 <div className="text-2xl font-bold text-[#8B6914]">
 {toFixed(providers.reduce((sum, p) => sum + p.rate, 0) / providers.length, 1)}%
 </div>
 </div>
 <Target className="w-6 h-6 text-[#8B6914]" />
 </div>
 </div>
 </div>
 
 {/* Live Provider Performance */}
 <div>
 <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
 Provider Performance (Live Updates)
 {isLiveMode && <div className="w-2 h-2 bg-[#2C4A60] rounded-full animate-pulse"></div>}
 </h4>
 
 <div className="space-y-3">
 {providers.slice(0, 5).map((provider, index) => (
 <div key={provider.name} className="p-4 bg-white border border-titanium-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 provider.score >= 90 ? 'bg-[#2D6147]' : 
 provider.score >= 80 ? 'bg-chrome-500' : 
 provider.score >= 70 ? 'bg-[#F0F5FA]' : 'bg-red-500'
 }`}>
 {provider.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{provider.name}</div>
 <div className="text-sm text-titanium-600">{provider.specialty} • {provider.patients} patients</div>
 </div>
 </div>
 
 <div className="flex items-center gap-6">
 <div className="text-center">
 <div className="text-lg font-bold text-porsche-600">{toFixed(provider.score, 1)}</div>
 <div className="text-xs text-titanium-600">GDMT Score</div>
 </div>
 <div className="text-center">
 <div className="text-lg font-bold text-[#2C4A60]">{toFixed(provider.rate, 1)}%</div>
 <div className="text-xs text-titanium-600">4-Pillar Rate</div>
 </div>
 <div className="text-center">
 <div className="text-lg font-bold text-arterial-600">{toFixed(provider.riskAdjusted, 1)}</div>
 <div className="text-xs text-titanium-600">Risk-Adjusted</div>
 </div>
 <div className="text-center">
 <div className={`text-lg font-bold flex items-center gap-1 ${
 provider.trend > 0 ? 'text-[#2C4A60]' : 'text-red-600'
 }`}>
 {provider.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
 {provider.trend > 0 ? '+' : ''}{toFixed(provider.trend, 1)}%
 </div>
 <div className="text-xs text-titanium-600">30d Trend</div>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 
 {/* Alert System */}
 <div className="bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <AlertTriangle className="w-5 h-5 text-[#8B6914]" />
 <h4 className="font-semibold text-[#8B6914]">Performance Alerts</h4>
 </div>
 <div className="space-y-2 text-sm">
 <div className="text-[#8B6914]">• Dr. Robert Thompson showing -2.3% trend over 30 days</div>
 <div className="text-[#8B6914]">• Overall 4-pillar rate below target (13.8% vs 15.0% target)</div>
 <div className="text-[#2C4A60]">• Dr. Jennifer Martinez improved 12.1% this month</div>
 </div>
 </div>
 </div>
 )}

 {activeView === 'pillars' && (
 <div className="space-y-6">
 <h3 className="text-xl font-bold flex items-center gap-2">
 <Pill className="w-6 h-6 text-porsche-600" />
 GDMT by Number of Pillars
 <span className="text-sm font-normal text-titanium-600">(Click to drill down)</span>
 </h3>

 {/* Simplified Pillar Cards */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 {[0, 1, 2, 3, 4].map((pillars, index) => (
 <button
 key={pillars}
 onClick={() => handlePillarClick(pillars)}
 className="group p-6 rounded-xl bg-white border border-titanium-200 shadow-sm hover:shadow-md hover:border-porsche-300 transition-all duration-200 cursor-pointer"
 >
 <div className="text-center space-y-3">
 <div 
 className={`text-5xl font-bold ${
 pillars === 0 ? 'text-red-500' :
 pillars === 1 ? 'text-[#C4982A]' :
 pillars === 2 ? 'text-[#B8763E]' :
 pillars === 3 ? 'text-[#3D7A5C]' :
 'text-[#2C4A60]'
 }`}
 >
 {pillars}
 </div>
 <div className="text-sm text-titanium-600 font-medium">Pillars</div>
 
 <div className="space-y-2">
 <div className="text-2xl font-bold text-porsche-600">
 {toFixed(gdmtMetrics[index]?.value ?? 0, 1)}%
 </div>
 <div className="text-sm text-titanium-600">of patients</div>
 
 <div className="flex items-center justify-center gap-1 text-sm text-titanium-500">
 <Users className="w-4 h-4" />
 <span>{patientsByPillar[pillars]?.length || 0} patients</span>
 </div>
 
 <div className={`flex items-center justify-center gap-1 text-xs ${
 gdmtMetrics[index]?.trend > 0 ? 'text-[#2C4A60]' : 'text-red-600'
 }`}>
 {gdmtMetrics[index]?.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
 <span>{gdmtMetrics[index]?.trend > 0 ? '+' : ''}{toFixed(gdmtMetrics[index]?.trend ?? 0, 1)}%</span>
 </div>
 </div>
 </div>
 
 <div className="flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
 <ChevronRight className="w-4 h-4 text-porsche-500" />
 </div>
 </button>
 ))}
 </div>

 {/* Key Insights */}
 <div className="bg-white rounded-xl border border-titanium-200 p-6">
 <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
 <Target className="w-5 h-5 text-porsche-600" />
 Key Insights
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="text-center p-4 bg-[#F0F5FA] rounded-lg">
 <div className="text-2xl font-bold text-[#2C4A60] mb-1">
 {toFixed(gdmtMetrics[4]?.value ?? 0, 1)}%
 </div>
 <div className="text-sm text-[#2C4A60]">Optimal Therapy Rate</div>
 </div>
 <div className="text-center p-4 bg-[#F0F5FA] rounded-lg">
 <div className="text-2xl font-bold text-[#8B6914] mb-1">
 {toFixed((gdmtMetrics[0]?.value || 0) + (gdmtMetrics[1]?.value || 0), 1)}%
 </div>
 <div className="text-sm text-[#8B6914]">High Opportunity (0-1 pillars)</div>
 </div>
 <div className="text-center p-4 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-chrome-600 mb-1">
 {toFixed(4 - [0,1,2,3,4].reduce((sum, pillars, index) => sum + (pillars * (gdmtMetrics[index]?.value || 0)) / 100, 0), 1)}
 </div>
 <div className="text-sm text-chrome-700">Avg Gap to Optimal</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeView === 'types' && (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h3 className="text-xl font-bold flex items-center gap-2">
 <Heart className="w-6 h-6 text-medical-red-500" />
 GDMT by Heart Failure Type
 {selectedHFType && (
 <span className="text-sm font-normal text-titanium-600">
 → {selectedHFType}
 </span>
 )}
 </h3>
 {selectedHFType && (
 <button
 onClick={() => {
 setSelectedHFType(null);
 setSelectedNYHAClass(null);
 }}
 className="px-3 py-2 bg-titanium-100 text-titanium-700 rounded-lg hover:bg-titanium-200 transition-colors flex items-center gap-2"
 >
 <X className="w-4 h-4" />
 Back
 </button>
 )}
 </div>

 {!selectedHFType && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {hfTypeData.map((hfType) => (
 <button
 key={hfType.type}
 onClick={() => setSelectedHFType(hfType.type)}
 className="group p-6 rounded-xl bg-white border border-titanium-200 shadow-sm hover:shadow-md hover:border-porsche-300 transition-all duration-200 cursor-pointer text-left"
 >
 <div className="flex items-center justify-between mb-4">
 <div 
 className={`text-2xl font-bold ${
 hfType.type === 'HFrEF' ? 'text-red-600' : 
 hfType.type === 'HFpEF' ? 'text-chrome-600' : 'text-arterial-600'
 }`}
 >
 {hfType.type}
 </div>
 <ChevronRight className="w-5 h-5 text-titanium-400 group-hover:text-porsche-600 transition-colors" />
 </div>
 
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-xl font-bold text-titanium-900">{hfType.totalPatients.toLocaleString()}</div>
 <div className="text-sm text-titanium-600">Patients</div>
 </div>
 <div>
 <div className="text-xl font-bold text-[#2C4A60]">{hfType.fourPillarRate}%</div>
 <div className="text-sm text-titanium-600">4-Pillar Rate</div>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-lg font-bold text-porsche-600">{hfType.avgPillars}</div>
 <div className="text-sm text-titanium-600">Avg Pillars</div>
 </div>
 <div>
 <div className="text-sm text-titanium-600 mb-1">NYHA Distribution</div>
 <div className="flex gap-1">
 {Object.entries(hfType.nyhaBreakdown).map(([nyha, data]) => (
 <div 
 key={nyha}
 className={`h-2 rounded-sm flex-1 ${
 nyha === 'I' ? 'bg-[#2D6147]' :
 nyha === 'II' ? 'bg-[#C4982A]' :
 nyha === 'III' ? 'bg-[#9B2438]' : 'bg-[#7A1A2E]'
 }`}
 title={`NYHA ${nyha}: ${data.count} patients`}
 />
 ))}
 </div>
 </div>
 </div>
 </div>
 </button>
 ))}
 </div>
 )}

 {selectedHFType && (
 <div className="space-y-6">
 {(() => {
 const selectedData = hfTypeData.find(d => d.type === selectedHFType);
 if (!selectedData) return null;
 
 return (
 <>
 {/* NYHA Class Breakdown */}
 <div className="bg-white rounded-xl border border-titanium-200 p-6">
 <h4 className="text-lg font-semibold mb-4">NYHA Class Breakdown for {selectedHFType}</h4>
 <div className="grid grid-cols-4 gap-4">
 {Object.entries(selectedData.nyhaBreakdown).map(([nyhaClass, data]) => (
 <div
 key={nyhaClass}
 className="p-4 rounded-lg bg-gray-50 text-center"
 >
 <div className={`text-lg font-bold mb-2 ${
 nyhaClass === 'I' ? 'text-[#2D6147]' :
 nyhaClass === 'II' ? 'text-[#8B6914]' :
 nyhaClass === 'III' ? 'text-[#8B6914]' : 'text-red-600'
 }`}>
 NYHA {nyhaClass}
 </div>
 <div className="space-y-1 text-sm">
 <div>
 <div className="font-semibold text-titanium-900">{data.count}</div>
 <div className="text-titanium-600">patients</div>
 </div>
 <div>
 <div className="font-semibold text-[#2C4A60]">{data.fourPillarRate}%</div>
 <div className="text-titanium-600">4-pillar rate</div>
 </div>
 <div>
 <div className="font-semibold text-porsche-600">{data.avgPillars}</div>
 <div className="text-titanium-600">avg pillars</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Pillar Distribution */}
 <div className="bg-white rounded-xl border border-titanium-200 p-6">
 <h4 className="text-lg font-semibold mb-4">Pillar Distribution for {selectedHFType}</h4>
 <div className="grid grid-cols-5 gap-4">
 {selectedData.pillarDistribution.map((percentage, pillars) => (
 <div key={pillars} className="text-center p-4 bg-porsche-50 rounded-lg">
 <div className="text-2xl font-bold text-porsche-600 mb-2">{pillars}</div>
 <div className="text-sm text-titanium-600 mb-1">Pillars</div>
 <div className="text-lg font-semibold text-titanium-900">{percentage}%</div>
 <div className="text-xs text-titanium-500">of patients</div>
 </div>
 ))}
 </div>
 </div>
 </>
 );
 })()}
 </div>
 )}
 </div>
 )}

 {activeView === 'providers' && (
 <div>
 <h3 className="text-xl font-bold mb-4">Enhanced Provider Performance Analytics</h3>
 <div className="space-y-4">
 {providers.map((provider, index) => (
 <div key={provider.name} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-center gap-3">
 <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
 provider.score >= 90 ? 'bg-[#2D6147]' : 
 provider.score >= 80 ? 'bg-chrome-500' : 
 provider.score >= 70 ? 'bg-[#F0F5FA]' : 'bg-red-500'
 }`}>
 {provider.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-bold">{provider.name}</div>
 <div className="text-sm text-titanium-600">{provider.specialty} • {provider.patients} patients</div>
 </div>
 </div>
 <div className="flex gap-6">
 <div className="text-center">
 <div className="text-lg font-bold text-porsche-600">{toFixed(provider.score, 1)}</div>
 <div className="text-xs text-titanium-600">GDMT Score</div>
 </div>
 <div className="text-center">
 <div className="text-lg font-bold text-[#2C4A60]">{toFixed(provider.rate, 1)}%</div>
 <div className="text-xs text-titanium-600">4-Pillar Rate</div>
 </div>
 <div className="text-center">
 <div className="text-lg font-bold text-arterial-600">{toFixed(provider.riskAdjusted, 1)}</div>
 <div className="text-xs text-titanium-600">Risk-Adjusted</div>
 </div>
 <div className="text-center">
 <div className={`text-lg font-bold ${provider.trend > 0 ? 'text-[#2C4A60]' : 'text-red-600'}`}>
 {provider.trend > 0 ? '+' : ''}{toFixed(provider.trend, 1)}%
 </div>
 <div className="text-xs text-titanium-600">30d Trend</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Patient Detail Side Panel */}
 {showPatientPanel && selectedPillarCount !== null && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
 <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
 {/* Panel Header */}
 <div className="sticky top-0 bg-white border-b border-titanium-200 p-6 z-10">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">
 Patients with {selectedPillarCount} GDMT Pillar{selectedPillarCount !== 1 ? 's' : ''}
 </h3>
 <p className="text-titanium-600 mt-1">
 {patientsByPillar[selectedPillarCount]?.length || 0} patients • Drill-down analysis
 </p>
 </div>
 <button
 onClick={closePillarPanel}
 className="p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-5 h-5 text-titanium-600" />
 </button>
 </div>
 </div>

 {/* Panel Content */}
 <div className="p-6">
 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-gradient-to-br from-chrome-50 to-chrome-100 p-4 rounded-xl">
 <div className="text-sm text-chrome-700 font-medium">Total Patients</div>
 <div className="text-2xl font-bold text-chrome-800">{patientsByPillar[selectedPillarCount]?.length || 0}</div>
 </div>
 <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl">
 <div className="text-sm text-[#636D80] font-medium">Avg Age</div>
 <div className="text-2xl font-bold text-[#8B6914]">
 {patientsByPillar[selectedPillarCount]?.length ? 
 Math.round(patientsByPillar[selectedPillarCount].reduce((sum, p) => sum + p.age, 0) / patientsByPillar[selectedPillarCount].length) : 0
 }
 </div>
 </div>
 <div className="bg-gradient-to-br from-arterial-50 to-arterial-100 p-4 rounded-xl">
 <div className="text-sm text-arterial-700 font-medium">High Risk</div>
 <div className="text-2xl font-bold text-arterial-800">
 {patientsByPillar[selectedPillarCount]?.filter(p => p.riskLevel === 'high').length || 0}
 </div>
 </div>
 </div>

 {/* Patient List */}
 <div className="space-y-4">
 <h4 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Patient Details
 </h4>
 
 {patientsByPillar[selectedPillarCount]?.map((patient) => (
 <div key={patient.id} className="border border-titanium-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 patient.riskLevel === 'high' ? 'bg-red-500' :
 patient.riskLevel === 'medium' ? 'bg-[#8B6914]' : 'bg-[#2D6147]'
 }`}>
 {patient.name.split(' ').map(n => n[0]).join('')}
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{patient.name}</div>
 <div className="text-sm text-titanium-600">
 Age {patient.age} • EF {patient.ejectionFraction}% • {patient.provider}
 </div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded-full text-xs font-medium ${
 patient.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
 patient.riskLevel === 'medium' ? 'bg-[#FAF6E8] text-[#8B6914]' : 'bg-[#F0F7F4] text-[#2D6147]'
 }`}>
 {patient.riskLevel.toUpperCase()} RISK
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2">Current Therapy</div>
 <div className="text-sm text-titanium-600">
 {patient.currentPillars}/4 GDMT pillars active
 </div>
 </div>
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 Last Visit
 </div>
 <div className="text-sm text-titanium-600">
 {patient.lastVisit.toLocaleDateString()}
 </div>
 </div>
 </div>

 {patient.missingPillars.length > 0 && (
 <div className="mb-4">
 <div className="text-sm font-medium text-titanium-700 mb-2">Missing GDMT Pillars</div>
 <div className="flex flex-wrap gap-2">
 {patient.missingPillars.map((pillar, idx) => {
 const pillarColors: Record<string, { bg: string; text: string }> = {
 'ACE/ARB': { bg: '#EEF4F9', text: '#2C4A60' },       // Chrome Blue — ARNi/ACE
 'Beta-blocker': { bg: '#EDF5F0', text: '#2D6147' },  // Racing Green — BB
 'SGLT2': { bg: '#E8F6F9', text: '#1A6878' },         // Steel Teal — SGLT2i
 'MRA': { bg: '#FDF8EC', text: '#C4982A' },           // Metallic Gold — MRA
 };
 const colors = pillarColors[pillar] || { bg: '#FAF6E8', text: '#8B6914' };
 return (
 <span key={pillar} className="px-2 py-1 text-xs rounded-full font-medium" style={{ background: colors.bg, color: colors.text }}>
 {pillar}
 </span>
 );
 })}
 </div>
 </div>
 )}

 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2 flex items-center gap-1">
 <FileText className="w-3 h-3" />
 Recommended Actions
 </div>
 <div className="space-y-1">
 {patient.actionItems.map((action, idx) => (
 <div key={action} className="text-sm text-titanium-600 flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-porsche-500 rounded-full flex-shrink-0"></div>
 {action}
 </div>
 ))}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default GDMTAnalyticsDashboard;