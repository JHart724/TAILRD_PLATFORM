import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Activity, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  RefreshCw, 
  Download, 
  AlertTriangle,
  Users,
  Clock,
  Award,
  Filter,
  BarChart3,
  PieChart,
  MapPin,
  Calendar,
  Stethoscope
} from 'lucide-react';

interface TAVRMetric {
  value: number;
  trend: number;
  timestamp: Date;
}

interface PatientRisk {
  id: string;
  name: string;
  age: number;
  stsScore: number;
  euroScore: number;
  riskCategory: 'Low' | 'Intermediate' | 'High' | 'Prohibitive';
  valveType: 'Edwards SAPIEN' | 'Medtronic CoreValve' | 'Boston Lotus' | 'Abbott Portico';
  approach: 'Transfemoral' | 'Transapical' | 'Transaortic' | 'Subclavian';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  procedureDate: Date;
  outcome: 'Success' | 'Complication' | 'Pending';
  los: number; // Length of stay
}

interface QualityMetric {
  measure: string;
  value: number;
  target: number;
  trend: number;
  category: 'Mortality' | 'Morbidity' | 'Efficiency' | 'Quality';
}

interface ComplianceData {
  siteId: string;
  siteName: string;
  procedures: number;
  successRate: number;
  mortality30Day: number;
  avgLOS: number;
  riskAdjustedScore: number;
  coordinates: [number, number];
}

const TAVRAnalyticsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'real-time' | 'risk-analysis' | 'outcomes' | 'geography'>('real-time');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedFilters, setSelectedFilters] = useState({
    riskCategory: 'all',
    valveType: 'all',
    approach: 'all',
    timeframe: '30d'
  });

  // TAVR Key Metrics
  const [tavrMetrics, setTAVRMetrics] = useState<TAVRMetric[]>([
    { value: 96.8, trend: 1.2, timestamp: new Date() }, // Success Rate
    { value: 2.1, trend: -0.3, timestamp: new Date() }, // 30-day Mortality
    { value: 4.2, trend: -0.8, timestamp: new Date() }, // Avg Length of Stay
    { value: 89.3, trend: 2.4, timestamp: new Date() }, // Risk-Adjusted Performance
    { value: 327, trend: 12.0, timestamp: new Date() }  // Total Procedures MTD
  ]);

  // Patient Risk Data
  const [patients, setPatients] = useState<PatientRisk[]>([
    {
      id: 'P001',
      name: 'Margaret Johnson',
      age: 82,
      stsScore: 4.2,
      euroScore: 8.1,
      riskCategory: 'Intermediate',
      valveType: 'Edwards SAPIEN',
      approach: 'Transfemoral',
      status: 'Completed',
      procedureDate: new Date('2024-10-20'),
      outcome: 'Success',
      los: 3
    },
    {
      id: 'P002',
      name: 'Robert Chen',
      age: 78,
      stsScore: 7.8,
      euroScore: 12.3,
      riskCategory: 'High',
      valveType: 'Medtronic CoreValve',
      approach: 'Transfemoral',
      status: 'Completed',
      procedureDate: new Date('2024-10-19'),
      outcome: 'Success',
      los: 4
    },
    {
      id: 'P003',
      name: 'Dorothy Williams',
      age: 85,
      stsScore: 12.1,
      euroScore: 18.7,
      riskCategory: 'Prohibitive',
      valveType: 'Edwards SAPIEN',
      approach: 'Transapical',
      status: 'Scheduled',
      procedureDate: new Date('2024-10-25'),
      outcome: 'Pending',
      los: 0
    },
    {
      id: 'P004',
      name: 'James Martinez',
      age: 71,
      stsScore: 2.8,
      euroScore: 5.2,
      riskCategory: 'Low',
      valveType: 'Boston Lotus',
      approach: 'Transfemoral',
      status: 'Completed',
      procedureDate: new Date('2024-10-18'),
      outcome: 'Success',
      los: 2
    },
    {
      id: 'P005',
      name: 'Helen Thompson',
      age: 79,
      stsScore: 6.3,
      euroScore: 10.4,
      riskCategory: 'Intermediate',
      valveType: 'Abbott Portico',
      approach: 'Subclavian',
      status: 'Completed',
      procedureDate: new Date('2024-10-17'),
      outcome: 'Complication',
      los: 7
    }
  ]);

  // Quality Metrics
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([
    { measure: '30-Day Mortality', value: 2.1, target: 3.0, trend: -0.3, category: 'Mortality' },
    { measure: 'In-Hospital Mortality', value: 1.4, target: 2.0, trend: -0.2, category: 'Mortality' },
    { measure: 'Stroke Rate', value: 1.8, target: 2.5, trend: 0.1, category: 'Morbidity' },
    { measure: 'Acute Kidney Injury', value: 6.2, target: 8.0, trend: -1.1, category: 'Morbidity' },
    { measure: 'Average LOS', value: 4.2, target: 5.0, trend: -0.8, category: 'Efficiency' },
    { measure: 'Readmission Rate', value: 8.7, target: 10.0, trend: -1.4, category: 'Quality' }
  ]);

  // Site Performance Data
  const [siteData, setSiteData] = useState<ComplianceData[]>([
    {
      siteId: 'MC001',
      siteName: 'Main Campus',
      procedures: 127,
      successRate: 97.6,
      mortality30Day: 1.8,
      avgLOS: 3.9,
      riskAdjustedScore: 92.4,
      coordinates: [40.7589, -73.9851]
    },
    {
      siteId: 'CC002',
      siteName: 'Cardiac Center East',
      procedures: 89,
      successRate: 95.5,
      mortality30Day: 2.4,
      avgLOS: 4.7,
      riskAdjustedScore: 88.1,
      coordinates: [40.7505, -73.9934]
    },
    {
      siteId: 'WC003',
      siteName: 'West Campus',
      procedures: 64,
      successRate: 98.4,
      mortality30Day: 1.6,
      avgLOS: 3.2,
      riskAdjustedScore: 94.7,
      coordinates: [40.7614, -73.9776]
    }
  ]);

  // Real-time data simulation
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setTAVRMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() - 0.5) * 0.1),
        trend: metric.trend + (Math.random() - 0.5) * 0.05,
        timestamp: new Date()
      })));

      setQualityMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() - 0.5) * 0.02),
        trend: metric.trend + (Math.random() - 0.5) * 0.02
      })));

      setLastUpdate(new Date());
    }, 4000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const exportClinicalReport = () => {
    const reportData = {
      reportDate: new Date().toISOString(),
      reportType: 'TAVR Analytics Clinical Report',
      timeframe: selectedFilters.timeframe,
      filters: selectedFilters,
      keyMetrics: {
        totalProcedures: tavrMetrics[4].value,
        successRate: tavrMetrics[0].value,
        mortality30Day: tavrMetrics[1].value,
        avgLOS: tavrMetrics[2].value,
        riskAdjustedScore: tavrMetrics[3].value
      },
      qualityMeasures: qualityMetrics,
      patientBreakdown: {
        byRisk: patients.reduce((acc, p) => {
          acc[p.riskCategory] = (acc[p.riskCategory] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byValveType: patients.reduce((acc, p) => {
          acc[p.valveType] = (acc[p.valveType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byApproach: patients.reduce((acc, p) => {
          acc[p.approach] = (acc[p.approach] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      sitePerformance: siteData,
      recentPatients: patients.slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tavr-clinical-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Low': return 'bg-green-500';
      case 'Intermediate': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Prohibitive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'Success': return 'text-green-600';
      case 'Complication': return 'text-red-600';
      case 'Pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="retina-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">Advanced TAVR Analytics Dashboard</h2>
            <p className="text-steel-600">Real-time structural heart program analytics with risk stratification and outcomes tracking</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-steel-600">
              <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {isLiveMode ? 'Live Updates' : 'Paused'}
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
              onClick={exportClinicalReport}
              className="p-2 rounded-lg bg-medical-blue-100 text-medical-blue-700 hover:bg-medical-blue-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <div className="text-xs text-steel-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
            onClick={() => setActiveView('risk-analysis')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeView === 'risk-analysis' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'
            }`}
          >
            <Target className="w-4 h-4" />
            Risk Analysis
          </button>
          <button
            onClick={() => setActiveView('outcomes')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeView === 'outcomes' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Outcomes & Quality
          </button>
          <button
            onClick={() => setActiveView('geography')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeView === 'geography' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Geographic Analysis
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4 p-4 bg-steel-50 rounded-lg">
          <Filter className="w-4 h-4 text-steel-600" />
          <select 
            value={selectedFilters.riskCategory}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, riskCategory: e.target.value }))}
            className="px-3 py-1 border border-steel-300 rounded text-sm"
          >
            <option value="all">All Risk Categories</option>
            <option value="Low">Low Risk</option>
            <option value="Intermediate">Intermediate Risk</option>
            <option value="High">High Risk</option>
            <option value="Prohibitive">Prohibitive Risk</option>
          </select>
          
          <select 
            value={selectedFilters.valveType}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, valveType: e.target.value }))}
            className="px-3 py-1 border border-steel-300 rounded text-sm"
          >
            <option value="all">All Valve Types</option>
            <option value="Edwards SAPIEN">Edwards SAPIEN</option>
            <option value="Medtronic CoreValve">Medtronic CoreValve</option>
            <option value="Boston Lotus">Boston Lotus</option>
            <option value="Abbott Portico">Abbott Portico</option>
          </select>
          
          <select 
            value={selectedFilters.approach}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, approach: e.target.value }))}
            className="px-3 py-1 border border-steel-300 rounded text-sm"
          >
            <option value="all">All Approaches</option>
            <option value="Transfemoral">Transfemoral</option>
            <option value="Transapical">Transapical</option>
            <option value="Transaortic">Transaortic</option>
            <option value="Subclavian">Subclavian</option>
          </select>
          
          <select 
            value={selectedFilters.timeframe}
            onChange={(e) => setSelectedFilters(prev => ({ ...prev, timeframe: e.target.value }))}
            className="px-3 py-1 border border-steel-300 rounded text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="retina-card p-6">
        {activeView === 'real-time' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-medical-blue-600" />
              Live TAVR Performance Dashboard
            </h3>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-emerald-700 font-medium">Success Rate</div>
                    <div className="text-2xl font-bold text-emerald-800">{tavrMetrics[0]?.value.toFixed(1)}%</div>
                  </div>
                  <div className={`flex items-center text-sm ${tavrMetrics[0]?.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tavrMetrics[0]?.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(tavrMetrics[0]?.trend || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-red-700 font-medium">30-Day Mortality</div>
                    <div className="text-2xl font-bold text-red-800">{tavrMetrics[1]?.value.toFixed(1)}%</div>
                  </div>
                  <div className={`flex items-center text-sm ${tavrMetrics[1]?.trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tavrMetrics[1]?.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {Math.abs(tavrMetrics[1]?.trend || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-700 font-medium">Avg Length of Stay</div>
                    <div className="text-2xl font-bold text-blue-800">{tavrMetrics[2]?.value.toFixed(1)} days</div>
                  </div>
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-purple-700 font-medium">Risk-Adjusted Score</div>
                    <div className="text-2xl font-bold text-purple-800">{tavrMetrics[3]?.value.toFixed(1)}</div>
                  </div>
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-amber-700 font-medium">Procedures MTD</div>
                    <div className="text-2xl font-bold text-amber-800">{Math.round(tavrMetrics[4]?.value || 0)}</div>
                  </div>
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Recent Procedures */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Recent TAVR Procedures
                {isLiveMode && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              </h4>
              
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient, index) => (
                  <div key={index} className="p-4 bg-white border border-steel-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRiskColor(patient.riskCategory)}`}>
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-steel-900">{patient.name}</div>
                          <div className="text-sm text-steel-600">Age {patient.age} • {patient.riskCategory} Risk • {patient.valveType}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-medical-blue-600">{patient.stsScore.toFixed(1)}</div>
                          <div className="text-xs text-steel-600">STS Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{patient.euroScore.toFixed(1)}</div>
                          <div className="text-xs text-steel-600">EuroSCORE</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-steel-600">{patient.approach}</div>
                          <div className="text-xs text-steel-500">Approach</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getOutcomeColor(patient.outcome)}`}>{patient.outcome}</div>
                          <div className="text-xs text-steel-600">Outcome</div>
                        </div>
                        {patient.los > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{patient.los}d</div>
                            <div className="text-xs text-steel-600">LOS</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Alerts */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-amber-800">Quality & Safety Alerts</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="text-green-700">✓ 30-day mortality below national benchmark (2.1% vs 3.0%)</div>
                <div className="text-green-700">✓ Average LOS improved by 0.8 days this month</div>
                <div className="text-amber-700">⚠ Patient P005 (Helen Thompson) had extended LOS - review for optimization</div>
                <div className="text-amber-700">⚠ Stroke rate slightly elevated - monitor next 5 procedures closely</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'risk-analysis' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-medical-blue-600" />
              Patient Risk Stratification & Analysis
            </h3>

            {/* Risk Category Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['Low', 'Intermediate', 'High', 'Prohibitive'].map((risk, index) => {
                const count = patients.filter(p => p.riskCategory === risk).length;
                const percentage = (count / patients.length * 100).toFixed(1);
                return (
                  <div key={risk} className="p-4 border rounded-lg bg-white shadow-sm">
                    <div className={`text-2xl font-bold text-center mb-2 ${
                      risk === 'Low' ? 'text-green-600' :
                      risk === 'Intermediate' ? 'text-yellow-600' :
                      risk === 'High' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {count}
                    </div>
                    <div className="text-sm text-center text-steel-600">{risk} Risk</div>
                    <div className="text-lg font-bold text-center mt-2 text-medical-blue-600">
                      {percentage}%
                    </div>
                    <div className="text-xs text-center text-steel-500">of patients</div>
                  </div>
                );
              })}
            </div>

            {/* Patient Heatmap */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Patient Risk Heatmap</h4>
              <div className="space-y-2">
                {patients.map((patient, index) => (
                  <div key={index} className="flex items-center p-3 bg-white border rounded-lg">
                    <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-center">
                        <div className={`inline-block w-3 h-3 rounded-full ${getRiskColor(patient.riskCategory)}`}></div>
                        <div className="text-xs mt-1">{patient.riskCategory}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{patient.stsScore.toFixed(1)}</div>
                        <div className="text-xs text-steel-600">STS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{patient.euroScore.toFixed(1)}</div>
                        <div className="text-xs text-steel-600">Euro</div>
                      </div>
                      <div className="text-center text-sm">{patient.valveType.split(' ')[0]}</div>
                      <div className="text-center text-sm">{patient.approach}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valve Type Performance */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Valve Type Performance Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Edwards SAPIEN', 'Medtronic CoreValve', 'Boston Lotus', 'Abbott Portico'].map(valve => {
                  const valvePatients = patients.filter(p => p.valveType === valve);
                  const successRate = valvePatients.length > 0 ? 
                    (valvePatients.filter(p => p.outcome === 'Success').length / valvePatients.filter(p => p.outcome !== 'Pending').length * 100) : 0;
                  
                  return (
                    <div key={valve} className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                      <div className="text-lg font-bold text-blue-800 mb-2">{valve.split(' ')[0]}</div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-steel-600">Procedures: </span>
                          <span className="font-semibold">{valvePatients.length}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-steel-600">Success Rate: </span>
                          <span className="font-semibold text-green-600">{successRate.toFixed(1)}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-steel-600">Avg Risk Score: </span>
                          <span className="font-semibold">
                            {valvePatients.length > 0 ? 
                              (valvePatients.reduce((sum, p) => sum + p.stsScore, 0) / valvePatients.length).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'outcomes' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-medical-blue-600" />
              Outcomes & Quality Measures
            </h3>

            {/* Quality Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualityMetrics.map((metric, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-steel-700">{metric.measure}</div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      metric.category === 'Mortality' ? 'bg-red-100 text-red-700' :
                      metric.category === 'Morbidity' ? 'bg-orange-100 text-orange-700' :
                      metric.category === 'Efficiency' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {metric.category}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-steel-900">{metric.value.toFixed(1)}%</div>
                      <div className="text-sm text-steel-600">vs {metric.target.toFixed(1)}% target</div>
                    </div>
                    <div className={`flex items-center text-sm ${
                      (metric.category === 'Mortality' || metric.category === 'Morbidity') ?
                        (metric.trend < 0 ? 'text-green-600' : 'text-red-600') :
                        (metric.trend > 0 ? 'text-green-600' : 'text-red-600')
                    }`}>
                      {((metric.category === 'Mortality' || metric.category === 'Morbidity') ? metric.trend < 0 : metric.trend > 0) ? 
                        <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
                      }
                      {Math.abs(metric.trend).toFixed(1)}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.value <= metric.target ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Approach Analysis */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Approach Optimization Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Transfemoral', 'Transapical', 'Transaortic', 'Subclavian'].map(approach => {
                  const approachPatients = patients.filter(p => p.approach === approach);
                  const avgLOS = approachPatients.length > 0 ? 
                    (approachPatients.reduce((sum, p) => sum + p.los, 0) / approachPatients.filter(p => p.los > 0).length) : 0;
                  const successRate = approachPatients.length > 0 ? 
                    (approachPatients.filter(p => p.outcome === 'Success').length / approachPatients.filter(p => p.outcome !== 'Pending').length * 100) : 0;
                  
                  return (
                    <div key={approach} className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
                      <div className="text-lg font-bold text-purple-800 mb-2">{approach}</div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-steel-600">Procedures: </span>
                          <span className="font-semibold">{approachPatients.length}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-steel-600">Success Rate: </span>
                          <span className="font-semibold text-green-600">{successRate.toFixed(1)}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-steel-600">Avg LOS: </span>
                          <span className="font-semibold text-blue-600">{avgLOS.toFixed(1)} days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Complications Analysis */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-red-800 mb-3">Complications Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">1.8%</div>
                  <div className="text-sm text-red-700">Stroke Rate</div>
                  <div className="text-xs text-steel-600">vs 2.5% benchmark</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">6.2%</div>
                  <div className="text-sm text-red-700">AKI Rate</div>
                  <div className="text-xs text-steel-600">vs 8.0% benchmark</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">8.7%</div>
                  <div className="text-sm text-red-700">30-Day Readmission</div>
                  <div className="text-xs text-steel-600">vs 10.0% benchmark</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'geography' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-medical-blue-600" />
              Geographic Performance Analysis
            </h3>

            {/* Site Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {siteData.map((site, index) => (
                <div key={index} className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-blue-800">{site.siteName}</h4>
                    <div className="text-sm text-blue-600">ID: {site.siteId}</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-steel-600">Total Procedures:</span>
                      <span className="font-semibold">{site.procedures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">{site.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">30-Day Mortality:</span>
                      <span className="font-semibold text-red-600">{site.mortality30Day.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Avg LOS:</span>
                      <span className="font-semibold text-blue-600">{site.avgLOS.toFixed(1)} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Risk-Adjusted Score:</span>
                      <span className="font-semibold text-purple-600">{site.riskAdjustedScore.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  {/* Performance indicator */}
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {site.riskAdjustedScore >= 90 ? 'Excellent' : 
                         site.riskAdjustedScore >= 85 ? 'Good' : 
                         site.riskAdjustedScore >= 80 ? 'Average' : 'Needs Improvement'} Performance
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Ranking */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Site Performance Ranking</h4>
              <div className="space-y-3">
                {siteData
                  .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
                  .map((site, index) => (
                    <div key={index} className="p-4 bg-white border border-steel-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-amber-600' : 'bg-steel-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-steel-900">{site.siteName}</div>
                            <div className="text-sm text-steel-600">{site.procedures} procedures</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{site.riskAdjustedScore.toFixed(1)}</div>
                            <div className="text-xs text-steel-600">Risk-Adjusted</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{site.successRate.toFixed(1)}%</div>
                            <div className="text-xs text-steel-600">Success Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{site.mortality30Day.toFixed(1)}%</div>
                            <div className="text-xs text-steel-600">30d Mortality</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{site.avgLOS.toFixed(1)}d</div>
                            <div className="text-xs text-steel-600">Avg LOS</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TAVRAnalyticsDashboard;