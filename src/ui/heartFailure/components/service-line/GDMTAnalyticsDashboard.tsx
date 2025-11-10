import React, { useState, useEffect } from 'react';
import { Pill, Target, Heart, Stethoscope, TrendingUp, TrendingDown, Zap, RefreshCw, Download, AlertTriangle, X, ChevronRight, Users, Calendar, FileText, Activity } from 'lucide-react';

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
    { value: 13.8, trend: 2.1, timestamp: new Date() },
    { value: 27.3, trend: -1.4, timestamp: new Date() },
    { value: 31.9, trend: 3.7, timestamp: new Date() },
    { value: 19.8, trend: 1.2, timestamp: new Date() },
    { value: 7.1, trend: -0.8, timestamp: new Date() }
  ]);

  const [providers, setProviders] = useState<ProviderMetric[]>([
    { name: 'Dr. Sarah Williams', specialty: 'Cardiology', score: 92.1, rate: 42.2, trend: 8.4, patients: 178, riskAdjusted: 94.3 },
    { name: 'Dr. Michael Chen', specialty: 'Cardiology', score: 88.7, rate: 38.9, trend: 5.2, patients: 254, riskAdjusted: 91.2 },
    { name: 'Dr. Jennifer Martinez', specialty: 'Internal Medicine', score: 67.3, rate: 18.5, trend: 12.1, patients: 406, riskAdjusted: 73.8 },
    { name: 'Dr. Robert Thompson', specialty: 'Cardiology', score: 85.4, rate: 34.7, trend: -2.3, patients: 312, riskAdjusted: 87.9 },
    { name: 'Dr. Lisa Park', specialty: 'Internal Medicine', score: 71.2, rate: 22.8, trend: 6.7, patients: 356, riskAdjusted: 76.5 }
  ]);

  // Enhanced HF Type Analytics Data
  const [hfTypeData] = useState<HFTypeData[]>([
    {
      type: 'HFrEF',
      totalPatients: 1694,
      fourPillarRate: 18.2,
      avgPillars: 2.4,
      nyhaBreakdown: {
        I: { count: 178, avgPillars: 3.2, fourPillarRate: 34.8 },
        II: { count: 624, avgPillars: 2.7, fourPillarRate: 21.5 },
        III: { count: 756, avgPillars: 2.1, fourPillarRate: 14.3 },
        IV: { count: 136, avgPillars: 1.6, fourPillarRate: 8.8 }
      },
      pillarDistribution: [12.3, 23.8, 31.2, 22.5, 10.2]
    },
    {
      type: 'HFpEF',
      totalPatients: 596,
      fourPillarRate: 8.9,
      avgPillars: 1.8,
      nyhaBreakdown: {
        I: { count: 134, avgPillars: 2.3, fourPillarRate: 16.4 },
        II: { count: 284, avgPillars: 1.9, fourPillarRate: 9.2 },
        III: { count: 156, avgPillars: 1.4, fourPillarRate: 5.1 },
        IV: { count: 22, avgPillars: 1.1, fourPillarRate: 0.0 }
      },
      pillarDistribution: [34.2, 28.5, 22.1, 10.7, 4.5]
    },
    {
      type: 'HFmrEF',
      totalPatients: 204,
      fourPillarRate: 12.1,
      avgPillars: 2.1,
      nyhaBreakdown: {
        I: { count: 46, avgPillars: 2.8, fourPillarRate: 26.1 },
        II: { count: 90, avgPillars: 2.2, fourPillarRate: 13.3 },
        III: { count: 58, avgPillars: 1.7, fourPillarRate: 6.9 },
        IV: { count: 10, avgPillars: 1.2, fourPillarRate: 0.0 }
      },
      pillarDistribution: [18.6, 29.4, 27.5, 16.7, 7.8]
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
      <div className="retina-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">Advanced GDMT Analytics</h2>
            <p className="text-steel-600">Real-time 4-pillar therapy optimization with predictive insights</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-steel-600">
              <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {isLiveMode ? 'Live' : 'Paused'}
            </div>
            
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`p-2 rounded-lg transition-colors ${
                isLiveMode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLiveMode ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportData}
              className="p-2 rounded-lg bg-medical-blue-100 text-medical-blue-700 hover:bg-medical-blue-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <div className="text-xs text-steel-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setActiveView('real-time')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeView === 'real-time' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Real-time Dashboard
          </button>
          <button
            onClick={() => setActiveView('pillars')}
            className={`px-4 py-2 rounded-lg ${activeView === 'pillars' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            By # of Pillars
          </button>
          <button
            onClick={() => setActiveView('types')}
            className={`px-4 py-2 rounded-lg ${activeView === 'types' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            By HF Type
          </button>
          <button
            onClick={() => setActiveView('providers')}
            className={`px-4 py-2 rounded-lg ${activeView === 'providers' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            Provider Performance
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="retina-card p-6">
        {activeView === 'real-time' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-medical-blue-600" />
              Live Performance Dashboard
            </h3>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-emerald-700 font-medium">4-Pillar Achievement</div>
                    <div className="text-2xl font-bold text-emerald-800">{gdmtMetrics[0]?.value.toFixed(1)}%</div>
                  </div>
                  <div className={`flex items-center text-sm ${gdmtMetrics[0]?.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {gdmtMetrics[0]?.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(gdmtMetrics[0]?.trend || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-700 font-medium">Active Patients</div>
                    <div className="text-2xl font-bold text-blue-800">{providers.reduce((sum, p) => sum + p.patients, 0).toLocaleString()}</div>
                  </div>
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-purple-700 font-medium">Avg Provider Score</div>
                    <div className="text-2xl font-bold text-purple-800">
                      {(providers.reduce((sum, p) => sum + p.score, 0) / providers.length).toFixed(1)}
                    </div>
                  </div>
                  <Stethoscope className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-amber-700 font-medium">Optimization Rate</div>
                    <div className="text-2xl font-bold text-amber-800">
                      {(providers.reduce((sum, p) => sum + p.rate, 0) / providers.length).toFixed(1)}%
                    </div>
                  </div>
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            
            {/* Live Provider Performance */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Provider Performance (Live Updates)
                {isLiveMode && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              </h4>
              
              <div className="space-y-3">
                {providers.slice(0, 5).map((provider, index) => (
                  <div key={index} className="p-4 bg-white border border-steel-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          provider.score >= 90 ? 'bg-green-500' : 
                          provider.score >= 80 ? 'bg-blue-500' : 
                          provider.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {provider.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-steel-900">{provider.name}</div>
                          <div className="text-sm text-steel-600">{provider.specialty} • {provider.patients} patients</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-medical-blue-600">{provider.score.toFixed(1)}</div>
                          <div className="text-xs text-steel-600">GDMT Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-600">{provider.rate.toFixed(1)}%</div>
                          <div className="text-xs text-steel-600">4-Pillar Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{provider.riskAdjusted.toFixed(1)}</div>
                          <div className="text-xs text-steel-600">Risk-Adjusted</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold flex items-center gap-1 ${
                            provider.trend > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {provider.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {provider.trend > 0 ? '+' : ''}{provider.trend.toFixed(1)}%
                          </div>
                          <div className="text-xs text-steel-600">30d Trend</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Alert System */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-amber-800">Performance Alerts</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="text-amber-700">• Dr. Robert Thompson showing -2.3% trend over 30 days</div>
                <div className="text-amber-700">• Overall 4-pillar rate below target (13.8% vs 15.0% target)</div>
                <div className="text-green-700">• Dr. Jennifer Martinez improved 12.1% this month</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'pillars' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Pill className="w-6 h-6 text-medical-blue-600" />
              GDMT by Number of Pillars
              <span className="text-sm font-normal text-steel-600">(Click to drill down)</span>
            </h3>

            {/* Simplified Pillar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((pillars, index) => (
                <button
                  key={pillars}
                  onClick={() => handlePillarClick(pillars)}
                  className="group p-6 rounded-xl bg-white border border-steel-200 shadow-sm hover:shadow-md hover:border-medical-blue-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="text-center space-y-3">
                    <div 
                      className={`text-5xl font-bold ${
                        pillars === 0 ? 'text-red-500' :
                        pillars === 1 ? 'text-orange-500' :
                        pillars === 2 ? 'text-yellow-500' :
                        pillars === 3 ? 'text-blue-500' :
                        'text-emerald-500'
                      }`}
                    >
                      {pillars}
                    </div>
                    <div className="text-sm text-steel-600 font-medium">Pillars</div>
                    
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-medical-blue-600">
                        {gdmtMetrics[index]?.value.toFixed(1)}%
                      </div>
                      <div className="text-sm text-steel-600">of patients</div>
                      
                      <div className="flex items-center justify-center gap-1 text-sm text-steel-500">
                        <Users className="w-4 h-4" />
                        <span>{patientsByPillar[pillars]?.length || 0} patients</span>
                      </div>
                      
                      <div className={`flex items-center justify-center gap-1 text-xs ${
                        gdmtMetrics[index]?.trend > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {gdmtMetrics[index]?.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{gdmtMetrics[index]?.trend > 0 ? '+' : ''}{gdmtMetrics[index]?.trend.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-medical-blue-500" />
                  </div>
                </button>
              ))}
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-xl border border-steel-200 p-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-medical-blue-600" />
                Key Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    {gdmtMetrics[4]?.value.toFixed(1)}%
                  </div>
                  <div className="text-sm text-emerald-700">Optimal Therapy Rate</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 mb-1">
                    {((gdmtMetrics[0]?.value || 0) + (gdmtMetrics[1]?.value || 0)).toFixed(1)}%
                  </div>
                  <div className="text-sm text-amber-700">High Opportunity (0-1 pillars)</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {(4 - [0,1,2,3,4].reduce((sum, pillars, index) => sum + (pillars * (gdmtMetrics[index]?.value || 0)) / 100, 0)).toFixed(1)}
                  </div>
                  <div className="text-sm text-blue-700">Avg Gap to Optimal</div>
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
                  <span className="text-sm font-normal text-steel-600">
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
                  className="px-3 py-2 bg-steel-100 text-steel-700 rounded-lg hover:bg-steel-200 transition-colors flex items-center gap-2"
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
                    className="group p-6 rounded-xl bg-white border border-steel-200 shadow-sm hover:shadow-md hover:border-medical-blue-300 transition-all duration-200 cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className={`text-2xl font-bold ${
                          hfType.type === 'HFrEF' ? 'text-red-600' : 
                          hfType.type === 'HFpEF' ? 'text-blue-600' : 'text-purple-600'
                        }`}
                      >
                        {hfType.type}
                      </div>
                      <ChevronRight className="w-5 h-5 text-steel-400 group-hover:text-medical-blue-600 transition-colors" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xl font-bold text-steel-900">{hfType.totalPatients.toLocaleString()}</div>
                          <div className="text-sm text-steel-600">Patients</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-emerald-600">{hfType.fourPillarRate}%</div>
                          <div className="text-sm text-steel-600">4-Pillar Rate</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-lg font-bold text-medical-blue-600">{hfType.avgPillars}</div>
                          <div className="text-sm text-steel-600">Avg Pillars</div>
                        </div>
                        <div>
                          <div className="text-sm text-steel-600 mb-1">NYHA Distribution</div>
                          <div className="flex gap-1">
                            {Object.entries(hfType.nyhaBreakdown).map(([nyha, data]) => (
                              <div 
                                key={nyha}
                                className={`h-2 rounded-sm flex-1 ${
                                  nyha === 'I' ? 'bg-green-400' :
                                  nyha === 'II' ? 'bg-yellow-400' :
                                  nyha === 'III' ? 'bg-orange-400' : 'bg-red-400'
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
                      <div className="bg-white rounded-xl border border-steel-200 p-6">
                        <h4 className="text-lg font-semibold mb-4">NYHA Class Breakdown for {selectedHFType}</h4>
                        <div className="grid grid-cols-4 gap-4">
                          {Object.entries(selectedData.nyhaBreakdown).map(([nyhaClass, data]) => (
                            <div
                              key={nyhaClass}
                              className="p-4 rounded-lg bg-gray-50 text-center"
                            >
                              <div className={`text-lg font-bold mb-2 ${
                                nyhaClass === 'I' ? 'text-green-600' :
                                nyhaClass === 'II' ? 'text-yellow-600' :
                                nyhaClass === 'III' ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                NYHA {nyhaClass}
                              </div>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <div className="font-semibold text-steel-900">{data.count}</div>
                                  <div className="text-steel-600">patients</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-emerald-600">{data.fourPillarRate}%</div>
                                  <div className="text-steel-600">4-pillar rate</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-medical-blue-600">{data.avgPillars}</div>
                                  <div className="text-steel-600">avg pillars</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pillar Distribution */}
                      <div className="bg-white rounded-xl border border-steel-200 p-6">
                        <h4 className="text-lg font-semibold mb-4">Pillar Distribution for {selectedHFType}</h4>
                        <div className="grid grid-cols-5 gap-4">
                          {selectedData.pillarDistribution.map((percentage, pillars) => (
                            <div key={pillars} className="text-center p-4 bg-medical-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-medical-blue-600 mb-2">{pillars}</div>
                              <div className="text-sm text-steel-600 mb-1">Pillars</div>
                              <div className="text-lg font-semibold text-steel-900">{percentage}%</div>
                              <div className="text-xs text-steel-500">of patients</div>
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
                <div key={index} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      provider.score >= 90 ? 'bg-green-500' : 
                      provider.score >= 80 ? 'bg-blue-500' : 
                      provider.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      {provider.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold">{provider.name}</div>
                      <div className="text-sm text-steel-600">{provider.specialty} • {provider.patients} patients</div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-medical-blue-600">{provider.score.toFixed(1)}</div>
                      <div className="text-xs text-steel-600">GDMT Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">{provider.rate.toFixed(1)}%</div>
                      <div className="text-xs text-steel-600">4-Pillar Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{provider.riskAdjusted.toFixed(1)}</div>
                      <div className="text-xs text-steel-600">Risk-Adjusted</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${provider.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {provider.trend > 0 ? '+' : ''}{provider.trend.toFixed(1)}%
                      </div>
                      <div className="text-xs text-steel-600">30d Trend</div>
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
            <div className="sticky top-0 bg-white border-b border-steel-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-steel-900">
                    Patients with {selectedPillarCount} GDMT Pillar{selectedPillarCount !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-steel-600 mt-1">
                    {patientsByPillar[selectedPillarCount]?.length || 0} patients • Drill-down analysis
                  </p>
                </div>
                <button
                  onClick={closePillarPanel}
                  className="p-2 rounded-lg hover:bg-steel-100 transition-colors"
                >
                  <X className="w-5 h-5 text-steel-600" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="text-sm text-blue-700 font-medium">Total Patients</div>
                  <div className="text-2xl font-bold text-blue-800">{patientsByPillar[selectedPillarCount]?.length || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl">
                  <div className="text-sm text-amber-700 font-medium">Avg Age</div>
                  <div className="text-2xl font-bold text-amber-800">
                    {patientsByPillar[selectedPillarCount]?.length ? 
                      Math.round(patientsByPillar[selectedPillarCount].reduce((sum, p) => sum + p.age, 0) / patientsByPillar[selectedPillarCount].length) : 0
                    }
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="text-sm text-purple-700 font-medium">High Risk</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {patientsByPillar[selectedPillarCount]?.filter(p => p.riskLevel === 'high').length || 0}
                  </div>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-steel-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Details
                </h4>
                
                {patientsByPillar[selectedPillarCount]?.map((patient) => (
                  <div key={patient.id} className="border border-steel-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          patient.riskLevel === 'high' ? 'bg-red-500' :
                          patient.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`}>
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-steel-900">{patient.name}</div>
                          <div className="text-sm text-steel-600">
                            Age {patient.age} • EF {patient.ejectionFraction}% • {patient.provider}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        patient.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                        patient.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {patient.riskLevel.toUpperCase()} RISK
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2">Current Therapy</div>
                        <div className="text-sm text-steel-600">
                          {patient.currentPillars}/4 GDMT pillars active
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last Visit
                        </div>
                        <div className="text-sm text-steel-600">
                          {patient.lastVisit.toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {patient.missingPillars.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-steel-700 mb-2">Missing GDMT Pillars</div>
                        <div className="flex flex-wrap gap-2">
                          {patient.missingPillars.map((pillar, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              {pillar}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium text-steel-700 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Recommended Actions
                      </div>
                      <div className="space-y-1">
                        {patient.actionItems.map((action, idx) => (
                          <div key={idx} className="text-sm text-steel-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-medical-blue-500 rounded-full flex-shrink-0"></div>
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