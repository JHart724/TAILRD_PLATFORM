import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Filter, Download, RotateCcw, X, Users, Calendar, FileText, Activity, AlertTriangle } from 'lucide-react';
import { toFixed } from '../../utils/formatters';

interface PatientRiskData {
  id: string;
  name: string;
  age: number;
  riskScore: number;
  gdmtPillars: number;
  provider: string;
  lastVisit: Date;
  comorbidities: string[];
  ejectionFraction?: number;
  creatinine: number;
  potassium: number;
}

const PatientRiskHeatmap: React.FC = () => {
  const [filterBy, setFilterBy] = useState<'risk' | 'pillars' | 'provider' | 'age'>('risk');
  const [sortBy, setSortBy] = useState<'name' | 'risk' | 'pillars' | 'age'>('risk');
  const [selectedPatient, setSelectedPatient] = useState<PatientRiskData | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  
  // Generate realistic patient data
  const patientData: PatientRiskData[] = useMemo(() => {
 const providers = ['Dr. Sarah Williams', 'Dr. Michael Chen', 'Dr. Jennifer Martinez', 'Dr. Robert Thompson', 'Dr. Lisa Park'];
 const comorbidityOptions = ['Diabetes', 'CKD', 'COPD', 'AFib', 'CAD', 'HTN', 'Obesity'];
 
 return Array.from({ length: 50 }, (_, i) => ({
 id: `P${String(i + 1).padStart(3, '0')}`,
 name: `Patient ${i + 1}`,
 age: Math.floor(Math.random() * 40) + 45, // 45-85 years
 riskScore: Math.floor(Math.random() * 100),
 gdmtPillars: Math.floor(Math.random() * 5),
 provider: providers[Math.floor(Math.random() * providers.length)],
 lastVisit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
 comorbidities: comorbidityOptions.slice(0, Math.floor(Math.random() * 4) + 1),
 ejectionFraction: Math.random() > 0.3 ? Math.floor(Math.random() * 40) + 15 : undefined, // 15-55%
 creatinine: Math.random() * 2 + 0.8, // 0.8-2.8
 potassium: Math.random() * 2 + 3.5 // 3.5-5.5
 }));
  }, []);

  const sortedData = useMemo(() => {
 return [...patientData].sort((a, b) => {
 switch (sortBy) {
 case 'name': return a.name.localeCompare(b.name);
 case 'risk': return b.riskScore - a.riskScore;
 case 'pillars': return b.gdmtPillars - a.gdmtPillars;
 case 'age': return b.age - a.age;
 default: return 0;
 }
 });
  }, [patientData, sortBy]);

  const getRiskColor = (score: number) => {
 if (score >= 80) return 'bg-red-600';   // Very High Risk: Carmona deep red
 if (score >= 60) return 'bg-red-500';   // High Risk: Carmona mid
 if (score >= 40) return 'bg-amber-500';   // Moderate Risk: Metallic Gold
 if (score >= 20) return 'bg-green-500';   // Low-Moderate: Racing Green mid
 return 'bg-green-600';                    // Low Risk: Racing Green
  };

  const getPillarColor = (pillars: number) => {
 if (pillars === 4) return 'bg-teal-700';   // Chrome Blue — full therapy
 if (pillars === 3) return 'bg-green-500';   // Racing Green mid
 if (pillars === 2) return 'bg-amber-500';   // Metallic Gold
 if (pillars === 1) return 'bg-red-500';   // Carmona Red
 return 'bg-red-600';                      // Carmona deep — no therapy
  };

  const getAgeColor = (age: number) => {
 if (age >= 80) return 'bg-red-500';   // Carmona Red — highest age band
 if (age >= 70) return 'bg-amber-500';   // Metallic Gold
 if (age >= 60) return 'bg-teal-500';   // Chrome Blue mid
 return 'bg-green-500';                  // Racing Green mid — youngest
  };

  const getEfColor = (ef: number | undefined) => {
 if (ef === undefined) return 'bg-gray-300';
 if (ef < 25) return 'bg-red-500';
 if (ef < 35) return 'bg-chrome-50';
 if (ef < 45) return 'bg-chrome-50';
 return 'bg-titanium-300';
  };

  const getInitials = (name: string) => {
 return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getCellColor = (patient: PatientRiskData) => {
 switch (filterBy) {
 case 'risk': return getRiskColor(patient.riskScore);
 case 'pillars': return getPillarColor(patient.gdmtPillars);
 case 'age': return getAgeColor(patient.age);
 case 'provider': 
 const providerIndex = ['Dr. Sarah Williams', 'Dr. Michael Chen', 'Dr. Jennifer Martinez', 'Dr. Robert Thompson', 'Dr. Lisa Park'].indexOf(patient.provider);
 return ['bg-teal-700', 'bg-red-500', 'bg-amber-500', 'bg-green-600', 'bg-[#1A6878]'][providerIndex] || 'bg-[#8B5A2B]';
 default: return 'bg-gray-300';
 }
  };

  const exportHeatmapData = () => {
 const exportData = {
 timestamp: new Date().toISOString(),
 filterBy,
 sortBy,
 patients: sortedData.map(p => ({
 ...p,
 lastVisit: p.lastVisit.toISOString()
 })),
 summary: {
 totalPatients: sortedData.length,
 highRiskCount: sortedData.filter(p => p.riskScore >= 80).length,
 fourPillarCount: sortedData.filter(p => p.gdmtPillars === 4).length,
 avgAge: sortedData.reduce((sum, p) => sum + p.age, 0) / sortedData.length
 }
 };
 
 const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `patient-risk-heatmap-${new Date().toISOString().split('T')[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
  };

  const handlePatientClick = (patient: PatientRiskData) => {
 setSelectedPatient(patient);
 setShowPatientPanel(true);
  };

  const closePatientPanel = () => {
 setShowPatientPanel(false);
 setSelectedPatient(null);
  };

  const getRecommendations = (patient: PatientRiskData) => {
 const recommendations = [];
 
 if (patient.gdmtPillars < 4) {
 recommendations.push(`Optimize GDMT therapy (currently ${patient.gdmtPillars}/4 pillars)`);
 }
 
 if (patient.riskScore >= 80) {
 recommendations.push('High-risk patient: consider cardiology referral');
 recommendations.push('Enhanced monitoring and follow-up needed');
 }
 
 if (patient.creatinine > 1.5) {
 recommendations.push('Monitor kidney function closely');
 }
 
 if (patient.potassium > 5.0) {
 recommendations.push('Monitor potassium levels');
 }
 
 if (patient.ejectionFraction && patient.ejectionFraction < 35) {
 recommendations.push('Consider ICD evaluation');
 recommendations.push('Evaluate for CRT candidacy');
 }
 
 if (patient.comorbidities.includes('Diabetes')) {
 recommendations.push('Consider SGLT2 inhibitor if appropriate');
 }
 
 if (recommendations.length === 0) {
 recommendations.push('Continue current management plan');
 recommendations.push('Routine follow-up as scheduled');
 }
 
 return recommendations;
  };

  return (
 <div className="space-y-6">
 {/* Header and Controls */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">Patient Risk Heatmap</h3>
 <p className="text-titanium-600">Interactive visualization of patient risk stratification and GDMT status • Click cells for patient details</p>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <Filter className="w-4 h-4 text-titanium-600" />
 <select 
 value={filterBy} 
 onChange={(e) => setFilterBy(e.target.value as any)}
 className="px-3 py-1 border border-titanium-300 rounded-lg text-sm"
 >
 <option value="risk">Risk Score</option>
 <option value="pillars">GDMT Pillars</option>
 <option value="provider">Provider</option>
 <option value="age">Age Group</option>
 </select>
 </div>
 
 <div className="flex items-center gap-2">
 <RotateCcw className="w-4 h-4 text-titanium-600" />
 <select 
 value={sortBy} 
 onChange={(e) => setSortBy(e.target.value as any)}
 className="px-3 py-1 border border-titanium-300 rounded-lg text-sm"
 >
 <option value="risk">Risk Score</option>
 <option value="pillars">GDMT Pillars</option>
 <option value="age">Age</option>
 <option value="name">Name</option>
 </select>
 </div>
 
 <button
 onClick={exportHeatmapData}
 className="p-2 rounded-lg bg-porsche-100 text-porsche-700 hover:bg-porsche-200 transition-colors"
 >
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Color Legend Bar */}
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="space-y-3">
 <span className="font-semibold text-titanium-800 text-sm uppercase tracking-wide">Color Legend</span>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {/* Risk Score Legend */}
 <div>
 <div className="text-xs font-medium text-titanium-600 mb-1.5">Risk Score</div>
 <div className="flex rounded-md overflow-hidden h-5">
 <div className="flex-1 bg-titanium-300 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">0-19</span>
 </div>
 <div className="flex-1 bg-chrome-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">20-39</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">40-59</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">60-79</span>
 </div>
 <div className="flex-1 bg-red-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">80+</span>
 </div>
 </div>
 <div className="flex justify-between text-[10px] text-titanium-500 mt-0.5">
 <span>Low</span>
 <span>High</span>
 </div>
 </div>
 {/* GDMT Pillars Legend */}
 <div>
 <div className="text-xs font-medium text-titanium-600 mb-1.5">GDMT Pillars</div>
 <div className="flex rounded-md overflow-hidden h-5">
 <div className="flex-1 bg-red-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">0</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">1</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">2</span>
 </div>
 <div className="flex-1 bg-titanium-300 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">3</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">4</span>
 </div>
 </div>
 <div className="flex justify-between text-[10px] text-titanium-500 mt-0.5">
 <span>None</span>
 <span>Optimal</span>
 </div>
 </div>
 {/* EF% Legend */}
 <div>
 <div className="text-xs font-medium text-titanium-600 mb-1.5">Ejection Fraction</div>
 <div className="flex rounded-md overflow-hidden h-5">
 <div className="flex-1 bg-red-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">&lt;25</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">25-34</span>
 </div>
 <div className="flex-1 bg-chrome-50 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">35-44</span>
 </div>
 <div className="flex-1 bg-titanium-300 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">45+</span>
 </div>
 </div>
 <div className="flex justify-between text-[10px] text-titanium-500 mt-0.5">
 <span>Severe</span>
 <span>Normal</span>
 </div>
 </div>
 {/* Age Legend */}
 <div>
 <div className="text-xs font-medium text-titanium-600 mb-1.5">Age Group</div>
 <div className="flex rounded-md overflow-hidden h-5">
 <div className="flex-1 bg-titanium-300 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">45-59</span>
 </div>
 <div className="flex-1 bg-titanium-300 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">60-69</span>
 </div>
 <div className="flex-1 bg-chrome-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">70-79</span>
 </div>
 <div className="flex-1 bg-arterial-500 relative group">
 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">80+</span>
 </div>
 </div>
 <div className="flex justify-between text-[10px] text-titanium-500 mt-0.5">
 <span>Younger</span>
 <span>Older</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Heatmap Table */}
 <div className="bg-white rounded-xl border border-titanium-200 overflow-hidden">
 {/* Table Header */}
 <div className="grid grid-cols-[200px_1fr_1fr_1fr_1fr_140px] bg-titanium-50 border-b border-titanium-200 px-4 py-3 text-xs font-semibold text-titanium-600 uppercase tracking-wider">
 <div>Patient</div>
 <div className="text-center">Risk Score</div>
 <div className="text-center">GDMT Pillars</div>
 <div className="text-center">EF%</div>
 <div className="text-center">Age</div>
 <div className="text-center">Provider</div>
 </div>

 {/* Table Rows - first 20 patients */}
 <div className="divide-y divide-titanium-100">
 {sortedData.slice(0, 20).map((patient) => (
 <div
 key={patient.id}
 onClick={() => handlePatientClick(patient)}
 onMouseEnter={() => setHoveredRow(patient.id)}
 onMouseLeave={() => setHoveredRow(null)}
 className={`grid grid-cols-[200px_1fr_1fr_1fr_1fr_140px] items-center px-4 py-2.5 cursor-pointer transition-colors duration-150 ${
 hoveredRow === patient.id ? 'bg-porsche-50' : 'hover:bg-titanium-50'
 } ${selectedPatient?.id === patient.id ? 'bg-porsche-50 ring-1 ring-inset ring-porsche-200' : ''}`}
 >
 {/* Patient name + ID */}
 <div className="flex items-center gap-3 min-w-0">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getRiskColor(patient.riskScore)}`}>
 {getInitials(patient.name)}
 </div>
 <div className="min-w-0">
 <div className="text-sm font-medium text-titanium-900 truncate">{patient.name}</div>
 <div className="text-xs text-titanium-500">{patient.id}</div>
 </div>
 </div>

 {/* Risk Score cell */}
 <div className="flex justify-center">
 <div className={`${getRiskColor(patient.riskScore)} text-white text-xs font-bold rounded-md px-3 py-1.5 min-w-[48px] text-center shadow-sm`}>
 {patient.riskScore}
 </div>
 </div>

 {/* GDMT Pillars cell */}
 <div className="flex justify-center">
 <div className={`${getPillarColor(patient.gdmtPillars)} text-white text-xs font-bold rounded-md px-3 py-1.5 min-w-[48px] text-center shadow-sm`}>
 {patient.gdmtPillars}/4
 </div>
 </div>

 {/* EF% cell */}
 <div className="flex justify-center">
 <div className={`${getEfColor(patient.ejectionFraction)} text-white text-xs font-bold rounded-md px-3 py-1.5 min-w-[48px] text-center shadow-sm`}>
 {patient.ejectionFraction !== undefined ? `${patient.ejectionFraction}%` : 'N/A'}
 </div>
 </div>

 {/* Age cell */}
 <div className="flex justify-center">
 <div className={`${getAgeColor(patient.age)} text-white text-xs font-bold rounded-md px-3 py-1.5 min-w-[48px] text-center shadow-sm`}>
 {patient.age}
 </div>
 </div>

 {/* Provider */}
 <div className="text-xs text-titanium-600 text-center truncate">
 {patient.provider.replace('Dr. ', '')}
 </div>
 </div>
 ))}
 </div>

 {/* Show more indicator */}
 {sortedData.length > 20 && (
 <div className="px-4 py-3 bg-titanium-50 border-t border-titanium-200 text-center">
 <span className="text-sm text-titanium-500">
 Showing 20 of {sortedData.length} patients (sorted by {sortBy}) &middot; Click any row for details
 </span>
 </div>
 )}
 
 {/* Summary Stats */}
 <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-titanium-200">
 <div className="text-center p-3 bg-titanium-50 rounded-lg">
 <div className="text-2xl font-bold text-titanium-900">{sortedData.length}</div>
 <div className="text-sm text-titanium-600">Total Patients</div>
 </div>
 <div className="text-center p-3 bg-red-50 rounded-lg">
 <div className="text-2xl font-bold text-red-600">
 {sortedData.filter(p => p.riskScore >= 80).length}
 </div>
 <div className="text-sm text-titanium-600">High Risk (≥80)</div>
 </div>
 <div className="text-center p-3 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-teal-700">
 {sortedData.filter(p => p.gdmtPillars === 4).length}
 </div>
 <div className="text-sm text-titanium-600">4-Pillar Optimal</div>
 </div>
 <div className="text-center p-3 bg-chrome-50 rounded-lg">
 <div className="text-2xl font-bold text-chrome-600">
 {Math.round(sortedData.reduce((sum, p) => sum + p.age, 0) / sortedData.length)}
 </div>
 <div className="text-sm text-titanium-600">Average Age</div>
 </div>
 </div>
 </div>

 {/* Patient Detail Side Panel */}
 {showPatientPanel && selectedPatient && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
 <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
 {/* Panel Header */}
 <div className="sticky top-0 bg-white border-b border-titanium-200 p-6 z-10">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">{selectedPatient.name}</h3>
 <p className="text-titanium-600 mt-1">
 Patient ID: {selectedPatient.id} • {selectedPatient.provider}
 </p>
 </div>
 <button
 onClick={closePatientPanel}
 className="p-2 rounded-lg hover:bg-titanium-100 transition-colors"
 >
 <X className="w-5 h-5 text-titanium-600" />
 </button>
 </div>
 </div>

 {/* Panel Content */}
 <div className="p-6">
 {/* Risk Assessment */}
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className={`p-4 rounded-xl border-2 ${
 selectedPatient.riskScore >= 80 ? 'bg-red-50 border-red-200' :
 selectedPatient.riskScore >= 60 ? 'bg-chrome-50 border-titanium-300' :
 selectedPatient.riskScore >= 40 ? 'bg-chrome-50 border-titanium-300' :
 'bg-green-50 border-green-100'
 }`}>
 <div className="flex items-center gap-3">
 <AlertTriangle className={`w-8 h-8 ${
 selectedPatient.riskScore >= 80 ? 'text-red-600' :
 selectedPatient.riskScore >= 60 ? 'text-gray-500' :
 selectedPatient.riskScore >= 40 ? 'text-gray-500' :
 'text-teal-700'
 }`} />
 <div>
 <div className="text-sm font-medium text-titanium-700">Risk Score</div>
 <div className={`text-2xl font-bold ${
 selectedPatient.riskScore >= 80 ? 'text-red-800' :
 selectedPatient.riskScore >= 60 ? 'text-gray-500' :
 selectedPatient.riskScore >= 40 ? 'text-gray-500' :
 'text-teal-700'
 }`}>{selectedPatient.riskScore}</div>
 </div>
 </div>
 </div>

 <div className={`p-4 rounded-xl border-2 ${
 selectedPatient.gdmtPillars === 4 ? 'bg-chrome-50 border-titanium-300' :
 selectedPatient.gdmtPillars >= 2 ? 'bg-chrome-50 border-titanium-300' :
 'bg-red-50 border-red-200'
 }`}>
 <div className="flex items-center gap-3">
 <Activity className={`w-8 h-8 ${
 selectedPatient.gdmtPillars === 4 ? 'text-teal-700' :
 selectedPatient.gdmtPillars >= 2 ? 'text-gray-500' :
 'text-red-600'
 }`} />
 <div>
 <div className="text-sm font-medium text-titanium-700">GDMT Pillars</div>
 <div className={`text-2xl font-bold ${
 selectedPatient.gdmtPillars === 4 ? 'text-teal-700' :
 selectedPatient.gdmtPillars >= 2 ? 'text-gray-500' :
 'text-red-800'
 }`}>{selectedPatient.gdmtPillars}/4</div>
 </div>
 </div>
 </div>
 </div>

 {/* Patient Demographics */}
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5" />
 Patient Information
 </h4>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div className="bg-white border border-titanium-200 rounded-lg p-3">
 <div className="text-sm text-titanium-600">Age</div>
 <div className="text-lg font-semibold text-titanium-900">{selectedPatient.age} years</div>
 </div>
 {selectedPatient.ejectionFraction && (
 <div className="bg-white border border-titanium-200 rounded-lg p-3">
 <div className="text-sm text-titanium-600">Ejection Fraction</div>
 <div className="text-lg font-semibold text-titanium-900">{selectedPatient.ejectionFraction}%</div>
 </div>
 )}
 <div className="bg-white border border-titanium-200 rounded-lg p-3">
 <div className="text-sm text-titanium-600">Creatinine</div>
 <div className="text-lg font-semibold text-titanium-900">{toFixed(selectedPatient.creatinine, 1)} mg/dL</div>
 </div>
 <div className="bg-white border border-titanium-200 rounded-lg p-3">
 <div className="text-sm text-titanium-600">Potassium</div>
 <div className="text-lg font-semibold text-titanium-900">{toFixed(selectedPatient.potassium, 1)} mEq/L</div>
 </div>
 <div className="bg-white border border-titanium-200 rounded-lg p-3">
 <div className="text-sm text-titanium-600 flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 Last Visit
 </div>
 <div className="text-lg font-semibold text-titanium-900">{selectedPatient.lastVisit.toLocaleDateString()}</div>
 </div>
 </div>
 </div>

 {/* Comorbidities */}
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Comorbidities</h4>
 <div className="flex flex-wrap gap-2">
 {selectedPatient.comorbidities.map((condition, idx) => (
 <span key={condition} className="px-3 py-1 bg-porsche-100 text-porsche-700 text-sm rounded-full border border-porsche-200">
 {condition}
 </span>
 ))}
 </div>
 </div>

 {/* Clinical Recommendations */}
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <FileText className="w-5 h-5" />
 Clinical Recommendations
 </h4>
 <div className="space-y-3">
 {getRecommendations(selectedPatient).map((recommendation, idx) => (
 <div key={recommendation} className="bg-white border border-titanium-200 rounded-lg p-3 flex items-start gap-3">
 <div className="w-2 h-2 bg-porsche-500 rounded-full flex-shrink-0 mt-2"></div>
 <div className="text-titanium-700">{recommendation}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3">
 <button className="flex-1 bg-porsche-500 text-white py-3 px-4 rounded-lg hover:bg-porsche-600 transition-colors font-medium">
 View Full Chart
 </button>
 <button className="flex-1 bg-white border border-titanium-300 text-titanium-700 py-3 px-4 rounded-lg hover:bg-titanium-50 transition-colors font-medium">
 Schedule Follow-up
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default PatientRiskHeatmap;