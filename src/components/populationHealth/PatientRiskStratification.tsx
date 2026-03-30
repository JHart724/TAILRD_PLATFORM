import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
const PolarAngleAxisAny = PolarAngleAxis as any;
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  Activity,
  Clock,
  Target,
  Filter,
  Search,
  ArrowRight,
  Zap,
  UserX,
  Calendar,
  MapPin
} from 'lucide-react';

// Mock data - in real implementation, this would come from API
const mockRiskDistribution = [
  { riskRange: '0-20', count: 234, percentage: 18.2 },
  { riskRange: '21-40', count: 456, percentage: 35.4 },
  { riskRange: '41-60', count: 398, percentage: 30.9 },
  { riskRange: '61-80', count: 156, percentage: 12.1 },
  { riskRange: '81-100', count: 44, percentage: 3.4 }
];

const mockHighRiskPatients = [
  {
 id: 'P001',
 name: 'Margaret Johnson',
 mrn: '12345678',
 age: 78,
 riskScore: 87,
 predictedEvents: ['30-day readmission (72%)', 'Mortality (15%)'],
 primaryDiagnosis: 'Heart Failure with reduced EF',
 provider: 'Dr. Chen',
 lastVisit: '2024-02-08',
 daysLastVisit: 3
  },
  {
 id: 'P002',
 name: 'Robert Williams',
 mrn: '23456789',
 age: 65,
 riskScore: 84,
 predictedEvents: ['30-day readmission (68%)', 'MI (12%)'],
 primaryDiagnosis: 'NSTEMI, Diabetes',
 provider: 'Dr. Rodriguez',
 lastVisit: '2024-02-06',
 daysLastVisit: 5
  },
  {
 id: 'P003',
 name: 'Dorothy Smith',
 mrn: '34567890',
 age: 82,
 riskScore: 81,
 predictedEvents: ['90-day readmission (59%)', 'Mortality (18%)'],
 primaryDiagnosis: 'Atrial Fibrillation',
 provider: 'Dr. Kim',
 lastVisit: '2024-02-04',
 daysLastVisit: 7
  },
  {
 id: 'P004',
 name: 'James Brown',
 mrn: '45678901',
 age: 71,
 riskScore: 79,
 predictedEvents: ['30-day readmission (64%)', 'HF exacerbation (28%)'],
 primaryDiagnosis: 'Coronary Artery Disease',
 provider: 'Dr. Thompson',
 lastVisit: '2024-02-10',
 daysLastVisit: 1
  },
  {
 id: 'P005',
 name: 'Patricia Davis',
 mrn: '56789012',
 age: 69,
 riskScore: 76,
 predictedEvents: ['30-day readmission (61%)', 'Stroke (8%)'],
 primaryDiagnosis: 'Valvular Heart Disease',
 provider: 'Dr. Wang',
 lastVisit: '2024-02-09',
 daysLastVisit: 2
  }
];

const mockRiskFactorBreakdown = {
  modifiable: [
 { factor: 'Medication Adherence', impact: 25, prevalence: 68 },
 { factor: 'Blood Pressure Control', impact: 22, prevalence: 45 },
 { factor: 'Weight Management', impact: 18, prevalence: 72 },
 { factor: 'Smoking Cessation', impact: 15, prevalence: 23 },
 { factor: 'Exercise Program', impact: 12, prevalence: 34 }
  ],
  nonModifiable: [
 { factor: 'Age > 75', impact: 28, prevalence: 42 },
 { factor: 'Prior MI History', impact: 24, prevalence: 31 },
 { factor: 'Diabetes Duration', impact: 20, prevalence: 55 },
 { factor: 'Family History', impact: 16, prevalence: 38 },
 { factor: 'Gender (Female)', impact: 8, prevalence: 48 }
  ]
};

const mockInterventions = [
  {
 id: 'INT001',
 title: 'Enhanced Medication Adherence Program',
 impact: 92,
 cost: 1200,
 roi: 4.2,
 timeFrame: '3 months',
 eligiblePatients: 156,
 description: 'Pharmacist-led medication reconciliation with automated refill reminders'
  },
  {
 id: 'INT002',
 title: 'Remote Patient Monitoring',
 impact: 87,
 cost: 2800,
 roi: 3.8,
 timeFrame: '6 months',
 eligiblePatients: 89,
 description: 'Daily weight and vital sign monitoring with alert thresholds'
  },
  {
 id: 'INT003',
 title: 'Cardiac Rehabilitation Referral',
 impact: 78,
 cost: 800,
 roi: 5.1,
 timeFrame: '12 weeks',
 eligiblePatients: 234,
 description: 'Structured exercise and education program for post-MI patients'
  },
  {
 id: 'INT004',
 title: 'Care Coordination Program',
 impact: 72,
 cost: 1500,
 roi: 2.9,
 timeFrame: '4 months',
 eligiblePatients: 178,
 description: 'Nurse navigator support for complex care transitions'
  }
];

interface PatientRiskStratificationProps {
  className?: string;
}

const PatientRiskStratification: React.FC<PatientRiskStratificationProps> = ({ className = '' }) => {
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  // Filter patients based on selections
  const filteredPatients = useMemo(() => {
 return mockHighRiskPatients.filter(patient => {
 if (searchTerm && !patient.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
 !patient.mrn.includes(searchTerm)) {
 return false;
 }
 if (selectedRiskLevel !== 'all') {
 const riskThreshold = selectedRiskLevel === 'critical' ? 80 : 
 selectedRiskLevel === 'high' ? 60 : 40;
 if (patient.riskScore < riskThreshold) return false;
 }
 if (selectedProvider !== 'all' && !patient.provider.includes(selectedProvider)) {
 return false;
 }
 return true;
 });
  }, [searchTerm, selectedRiskLevel, selectedProvider]);

  const getRiskColor = (score: number) => {
 if (score >= 80) return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
 if (score >= 60) return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 if (score >= 40) return 'text-porsche-600 bg-porsche-50 border-porsche-200';
 return 'text-[#2C4A60] bg-[#f0f5fa] border-[#C8D4DC]';
  };

  const getRiskBadgeColor = (score: number) => {
 if (score >= 80) return 'bg-medical-red-500';
 if (score >= 60) return 'bg-crimson-500';
 if (score >= 40) return 'bg-porsche-500';
 return 'bg-[#2C4A60]';
  };

  const getRiskLabel = (score: number) => {
 if (score >= 80) return 'Critical';
 if (score >= 60) return 'High';
 if (score >= 40) return 'Moderate';
 return 'Low';
  };

  return (
 <div className={`space-y-6 ${className}`}>
 {/* Header with Filters */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-gradient-to-br from-medical-red-500 to-medical-red-600 rounded-2xl shadow-lg">
 <AlertTriangle className="w-8 h-8 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-titanium-900">Patient Risk Stratification</h1>
 <p className="text-titanium-600">Identify and manage high-risk cardiovascular patients</p>
 </div>
 </div>
 
 <div className="flex items-center gap-2 text-sm text-titanium-600">
 <Users className="w-4 h-4" />
 <span>{filteredPatients.length} high-risk patients</span>
 </div>
 </div>

 {/* Filters */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-titanium-400" />
 <input
 type="text"
 placeholder="Search patients..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 />
 </div>
 
 <select
 value={selectedModule}
 onChange={(e) => setSelectedModule(e.target.value)}
 className="px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="all">All Modules</option>
 <option value="heartFailure">Heart Failure</option>
 <option value="coronary">Coronary</option>
 <option value="structural">Structural</option>
 <option value="ep">Electrophysiology</option>
 <option value="vascular">Vascular</option>
 </select>
 
 <select
 value={selectedRiskLevel}
 onChange={(e) => setSelectedRiskLevel(e.target.value)}
 className="px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="all">All Risk Levels</option>
 <option value="critical">Critical (80+)</option>
 <option value="high">High (60-79)</option>
 <option value="moderate">Moderate (40-59)</option>
 </select>
 
 <select
 value={selectedProvider}
 onChange={(e) => setSelectedProvider(e.target.value)}
 className="px-3 py-2 bg-white border border-titanium-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-porsche-500/50"
 >
 <option value="all">All Providers</option>
 <option value="Chen">Dr. Chen</option>
 <option value="Rodriguez">Dr. Rodriguez</option>
 <option value="Kim">Dr. Kim</option>
 <option value="Thompson">Dr. Thompson</option>
 <option value="Wang">Dr. Wang</option>
 </select>
 
 <button className="px-4 py-2 bg-porsche-500 text-white rounded-lg hover:bg-porsche-600 transition-colors duration-200 flex items-center justify-center gap-2">
 <Filter className="w-4 h-4" />
 Export List
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 {/* Risk Score Distribution */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Risk Score Distribution</h2>
 <Activity className="w-5 h-5 text-porsche-500" />
 </div>
 
 <ResponsiveContainer width="100%" height={300}>
 <BarChart data={mockRiskDistribution}>
 <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
 <XAxis 
 dataKey="riskRange" 
 tick={{ fill: '#64748b', fontSize: 12 }}
 />
 <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(255, 255, 255, 0.95)',
 border: '1px solid rgba(255, 255, 255, 0.3)',
 borderRadius: '12px',
 backdropFilter: 'blur(20px)'
 }}
 formatter={(value, name) => [
 `${value} patients (${mockRiskDistribution.find(d => d.count === value)?.percentage}%)`,
 'Count'
 ]}
 />
 <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
 {mockRiskDistribution.map((entry, index) => (
 <Cell 
 key={`cell-${index}`} 
 fill={
 entry.riskRange === '81-100' ? '#ef4444' :
 entry.riskRange === '61-80' ? '#6B7280' :
 entry.riskRange === '41-60' ? '#3b82f6' :
 '#2C4A60'
 }
 />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 
 <div className="mt-4 grid grid-cols-2 gap-4">
 <div className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="text-sm text-titanium-600">Avg Risk Score</div>
 <div className="text-2xl font-bold text-titanium-900">64.2</div>
 </div>
 <div className="p-3 bg-white rounded-lg border border-titanium-200">
 <div className="text-sm text-titanium-600">Critical Risk</div>
 <div className="text-2xl font-bold text-medical-red-600">44</div>
 </div>
 </div>
 </div>

 {/* Risk Factor Radar */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-semibold text-titanium-900">Risk Factor Impact</h2>
 <Target className="w-5 h-5 text-crimson-500" />
 </div>
 
 <ResponsiveContainer width="100%" height={300}>
 <RadarChart data={mockRiskFactorBreakdown.modifiable}>
 <PolarGrid />
 <PolarAngleAxisAny 
 dataKey="factor" 
 tick={{ fill: '#64748b', fontSize: 10 }}
 />
 <PolarRadiusAxis 
 angle={90} 
 domain={[0, 30]} 
 tick={{ fill: '#64748b', fontSize: 10 }}
 />
 <Radar
 name="Impact Score"
 dataKey="impact"
 stroke="#3b82f6"
 fill="#3b82f6"
 fillOpacity={0.3}
 strokeWidth={2}
 />
 </RadarChart>
 </ResponsiveContainer>
 
 <div className="mt-4">
 <div className="flex items-center justify-between text-xs mb-2">
 <span className="text-titanium-600">Modifiable Risk Factors</span>
 <span className="flex items-center gap-1">
 <div className="w-3 h-3 bg-porsche-500 rounded"></div>
 <span>Impact Score</span>
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* High-Risk Patients List */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-titanium-900">High-Risk Patient List</h2>
 <div className="flex items-center gap-3">
 <span className="text-sm text-titanium-600">
 Predicted events within next 30 days
 </span>
 <Clock className="w-4 h-4 text-titanium-400" />
 </div>
 </div>
 
 <div className="space-y-3">
 {filteredPatients.map((patient) => (
 <div 
 key={patient.id}
 className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-lg ${
 selectedPatient === patient.id 
 ? 'bg-white border-porsche-300 shadow-lg' 
 : 'bg-white border-titanium-200 hover:bg-white'
 }`}
 onClick={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 {/* Risk Score Badge */}
 <div className={`px-3 py-1 rounded-full text-white font-bold text-sm ${getRiskBadgeColor(patient.riskScore)}`}>
 {patient.riskScore}
 </div>
 
 <div>
 <div className="flex items-center gap-3">
 <h3 className="font-semibold text-titanium-900">{patient.name}</h3>
 <span className="text-sm text-titanium-500">MRN: {patient.mrn}</span>
 <span className="text-sm text-titanium-500">Age: {patient.age}</span>
 </div>
 <div className="text-sm text-titanium-600 mt-1">
 {patient.primaryDiagnosis} • {patient.provider}
 </div>
 </div>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="text-right">
 <div className="text-xs text-titanium-500">Last Visit</div>
 <div className="text-sm font-medium text-titanium-700">
 {patient.daysLastVisit} days ago
 </div>
 </div>
 
 <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(patient.riskScore)}`}>
 {getRiskLabel(patient.riskScore)} Risk
 </div>
 
 <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${
 selectedPatient === patient.id ? 'rotate-90' : ''
 } text-titanium-400`} />
 </div>
 </div>
 
 {/* Predicted Events */}
 <div className="mt-3 flex flex-wrap gap-2">
 {patient.predictedEvents.map((event, index) => (
 <span 
 key={event}
 className="px-3 py-1 bg-medical-red-50 text-medical-red-700 rounded-full text-xs font-medium border border-medical-red-200"
 >
 {event}
 </span>
 ))}
 </div>
 
 {/* Expanded Details */}
 {selectedPatient === patient.id && (
 <div className="mt-4 pt-4 border-t border-titanium-200">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">Risk Factor Breakdown</h4>
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-titanium-600">Medication Adherence</span>
 <span className="font-medium text-medical-red-600">High Impact</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-titanium-600">Comorbidity Burden</span>
 <span className="font-medium text-crimson-600">Moderate</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-titanium-600">Prior Admissions</span>
 <span className="font-medium text-medical-red-600">High Impact</span>
 </div>
 </div>
 </div>
 
 <div>
 <h4 className="font-medium text-titanium-900 mb-2">Recommended Actions</h4>
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-sm">
 <Zap className="w-3 h-3 text-porsche-500" />
 <span className="text-titanium-700">Schedule care coordinator visit</span>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <Heart className="w-3 h-3 text-medical-red-500" />
 <span className="text-titanium-700">Review medication adherence</span>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <Calendar className="w-3 h-3 text-[#2C4A60]" />
 <span className="text-titanium-700">Enroll in remote monitoring</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Suggested Interventions */}
 <div className="retina-card p-6 bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold text-titanium-900">Suggested Interventions</h2>
 <div className="text-sm text-titanium-600">Ranked by impact potential</div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {mockInterventions.map((intervention, index) => (
 <div key={intervention.id} className="p-5 bg-white rounded-xl border border-titanium-200">
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
 index === 0 ? 'bg-[#2C4A60]' :
 index === 1 ? 'bg-porsche-500' :
 index === 2 ? 'bg-crimson-500' :
 'bg-arterial-500'
 }`}>
 {index + 1}
 </div>
 <div>
 <h3 className="font-semibold text-titanium-900">{intervention.title}</h3>
 <p className="text-xs text-titanium-600 mt-1">{intervention.description}</p>
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 mb-3">
 <div className="text-center p-2 bg-white rounded-lg">
 <div className="text-lg font-bold text-[#2C4A60]">{intervention.impact}%</div>
 <div className="text-xs text-titanium-600">Impact Score</div>
 </div>
 <div className="text-center p-2 bg-white rounded-lg">
 <div className="text-lg font-bold text-porsche-600">{intervention.roi}x</div>
 <div className="text-xs text-titanium-600">Expected ROI</div>
 </div>
 </div>
 
 <div className="flex justify-between text-sm text-titanium-600 mb-3">
 <span>Cost: ${intervention.cost.toLocaleString()}</span>
 <span>Timeline: {intervention.timeFrame}</span>
 </div>
 
 <div className="flex items-center justify-between">
 <span className="text-sm text-titanium-600">
 {intervention.eligiblePatients} eligible patients
 </span>
 <button className="px-3 py-1 bg-porsche-500 text-white text-xs rounded-lg hover:bg-porsche-600 transition-colors duration-200">
 Implement
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
  );
};

export default PatientRiskStratification;