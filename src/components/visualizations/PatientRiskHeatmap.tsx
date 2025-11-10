import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Filter, Download, RotateCcw, X, Users, Calendar, FileText, Activity, AlertTriangle } from 'lucide-react';

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
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPillarColor = (pillars: number) => {
    if (pillars === 4) return 'bg-emerald-500';
    if (pillars === 3) return 'bg-green-500';
    if (pillars === 2) return 'bg-yellow-500';
    if (pillars === 1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getAgeColor = (age: number) => {
    if (age >= 80) return 'bg-purple-500';
    if (age >= 70) return 'bg-blue-500';
    if (age >= 60) return 'bg-teal-500';
    return 'bg-green-500';
  };

  const getCellColor = (patient: PatientRiskData) => {
    switch (filterBy) {
      case 'risk': return getRiskColor(patient.riskScore);
      case 'pillars': return getPillarColor(patient.gdmtPillars);
      case 'age': return getAgeColor(patient.age);
      case 'provider': 
        const providerIndex = ['Dr. Sarah Williams', 'Dr. Michael Chen', 'Dr. Jennifer Martinez', 'Dr. Robert Thompson', 'Dr. Lisa Park'].indexOf(patient.provider);
        return ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'][providerIndex] || 'bg-gray-400';
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
          <h3 className="text-2xl font-bold text-steel-900">Patient Risk Heatmap</h3>
          <p className="text-steel-600">Interactive visualization of patient risk stratification and GDMT status • Click cells for patient details</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-steel-600" />
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="risk">Risk Score</option>
              <option value="pillars">GDMT Pillars</option>
              <option value="provider">Provider</option>
              <option value="age">Age Group</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-steel-600" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="risk">Risk Score</option>
              <option value="pillars">GDMT Pillars</option>
              <option value="age">Age</option>
              <option value="name">Name</option>
            </select>
          </div>
          
          <button
            onClick={exportHeatmapData}
            className="p-2 rounded-lg bg-medical-blue-100 text-medical-blue-700 hover:bg-medical-blue-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl border border-steel-200">
        <div className="flex items-center gap-8">
          <span className="font-medium text-steel-700">Legend:</span>
          {filterBy === 'risk' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">High Risk (80-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Moderate-High (60-79)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Moderate (40-59)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Low-Moderate (20-39)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Low Risk (0-19)</span>
              </div>
            </div>
          )}
          {filterBy === 'pillars' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-sm">4 Pillars</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">3 Pillars</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">2 Pillars</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">1 Pillar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">0 Pillars</span>
              </div>
            </div>
          )}
          {filterBy === 'age' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm">80+ years</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">70-79 years</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-teal-500 rounded"></div>
                <span className="text-sm">60-69 years</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">45-59 years</span>
              </div>
            </div>
          )}
          {filterBy === 'provider' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 rounded"></div>
                <span className="text-sm">Dr. Williams</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span className="text-sm">Dr. Chen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-sm">Dr. Martinez</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded"></div>
                <span className="text-sm">Dr. Thompson</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <span className="text-sm">Dr. Park</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <div className="grid grid-cols-10 gap-1">
          {sortedData.map((patient) => (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className={`${getCellColor(patient)} aspect-square rounded-sm cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 relative group border-2 border-transparent hover:border-white hover:shadow-lg`}
              title={`${patient.name} - Risk: ${patient.riskScore}, Pillars: ${patient.gdmtPillars}, Age: ${patient.age} (Click for details)`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="bg-steel-900 text-white text-xs rounded-lg p-3 whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{patient.name}</div>
                  <div>Risk Score: {patient.riskScore}</div>
                  <div>GDMT Pillars: {patient.gdmtPillars}</div>
                  <div>Age: {patient.age}</div>
                  <div>Provider: {patient.provider.split(' ')[1]}</div>
                  {patient.ejectionFraction && <div>EF: {patient.ejectionFraction}%</div>}
                  <div>Comorbidities: {patient.comorbidities.join(', ')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-steel-200">
          <div className="text-center p-3 bg-steel-50 rounded-lg">
            <div className="text-2xl font-bold text-steel-900">{sortedData.length}</div>
            <div className="text-sm text-steel-600">Total Patients</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {sortedData.filter(p => p.riskScore >= 80).length}
            </div>
            <div className="text-sm text-steel-600">High Risk (≥80)</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {sortedData.filter(p => p.gdmtPillars === 4).length}
            </div>
            <div className="text-sm text-steel-600">4-Pillar Optimal</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(sortedData.reduce((sum, p) => sum + p.age, 0) / sortedData.length)}
            </div>
            <div className="text-sm text-steel-600">Average Age</div>
          </div>
        </div>
      </div>

      {/* Patient Detail Side Panel */}
      {showPatientPanel && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-steel-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-steel-900">{selectedPatient.name}</h3>
                  <p className="text-steel-600 mt-1">
                    Patient ID: {selectedPatient.id} • {selectedPatient.provider}
                  </p>
                </div>
                <button
                  onClick={closePatientPanel}
                  className="p-2 rounded-lg hover:bg-steel-100 transition-colors"
                >
                  <X className="w-5 h-5 text-steel-600" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {/* Risk Assessment */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-xl border-2 ${
                  selectedPatient.riskScore >= 80 ? 'bg-red-50 border-red-200' :
                  selectedPatient.riskScore >= 60 ? 'bg-orange-50 border-orange-200' :
                  selectedPatient.riskScore >= 40 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-8 h-8 ${
                      selectedPatient.riskScore >= 80 ? 'text-red-600' :
                      selectedPatient.riskScore >= 60 ? 'text-orange-600' :
                      selectedPatient.riskScore >= 40 ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-steel-700">Risk Score</div>
                      <div className={`text-2xl font-bold ${
                        selectedPatient.riskScore >= 80 ? 'text-red-800' :
                        selectedPatient.riskScore >= 60 ? 'text-orange-800' :
                        selectedPatient.riskScore >= 40 ? 'text-yellow-800' :
                        'text-green-800'
                      }`}>{selectedPatient.riskScore}</div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 ${
                  selectedPatient.gdmtPillars === 4 ? 'bg-emerald-50 border-emerald-200' :
                  selectedPatient.gdmtPillars >= 2 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <Activity className={`w-8 h-8 ${
                      selectedPatient.gdmtPillars === 4 ? 'text-emerald-600' :
                      selectedPatient.gdmtPillars >= 2 ? 'text-yellow-600' :
                      'text-red-600'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-steel-700">GDMT Pillars</div>
                      <div className={`text-2xl font-bold ${
                        selectedPatient.gdmtPillars === 4 ? 'text-emerald-800' :
                        selectedPatient.gdmtPillars >= 2 ? 'text-yellow-800' :
                        'text-red-800'
                      }`}>{selectedPatient.gdmtPillars}/4</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-steel-200 rounded-lg p-3">
                    <div className="text-sm text-steel-600">Age</div>
                    <div className="text-lg font-semibold text-steel-900">{selectedPatient.age} years</div>
                  </div>
                  {selectedPatient.ejectionFraction && (
                    <div className="bg-white border border-steel-200 rounded-lg p-3">
                      <div className="text-sm text-steel-600">Ejection Fraction</div>
                      <div className="text-lg font-semibold text-steel-900">{selectedPatient.ejectionFraction}%</div>
                    </div>
                  )}
                  <div className="bg-white border border-steel-200 rounded-lg p-3">
                    <div className="text-sm text-steel-600">Creatinine</div>
                    <div className="text-lg font-semibold text-steel-900">{selectedPatient.creatinine.toFixed(1)} mg/dL</div>
                  </div>
                  <div className="bg-white border border-steel-200 rounded-lg p-3">
                    <div className="text-sm text-steel-600">Potassium</div>
                    <div className="text-lg font-semibold text-steel-900">{selectedPatient.potassium.toFixed(1)} mEq/L</div>
                  </div>
                  <div className="bg-white border border-steel-200 rounded-lg p-3">
                    <div className="text-sm text-steel-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last Visit
                    </div>
                    <div className="text-lg font-semibold text-steel-900">{selectedPatient.lastVisit.toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Comorbidities */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-steel-900 mb-4">Comorbidities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.comorbidities.map((condition, idx) => (
                    <span key={idx} className="px-3 py-1 bg-medical-blue-100 text-medical-blue-700 text-sm rounded-full border border-medical-blue-200">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>

              {/* Clinical Recommendations */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Clinical Recommendations
                </h4>
                <div className="space-y-3">
                  {getRecommendations(selectedPatient).map((recommendation, idx) => (
                    <div key={idx} className="bg-white border border-steel-200 rounded-lg p-3 flex items-start gap-3">
                      <div className="w-2 h-2 bg-medical-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      <div className="text-steel-700">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-medical-blue-500 text-white py-3 px-4 rounded-lg hover:bg-medical-blue-600 transition-colors font-medium">
                  View Full Chart
                </button>
                <button className="flex-1 bg-white border border-steel-300 text-steel-700 py-3 px-4 rounded-lg hover:bg-steel-50 transition-colors font-medium">
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