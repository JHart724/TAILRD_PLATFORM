import React, { useState, useMemo } from 'react';
import { Heart, Filter, Download, RotateCcw, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface ValvePatientData {
  id: string;
  name: string;
  age: number;
  valveType: 'Aortic' | 'Mitral' | 'Tricuspid' | 'Pulmonary';
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  stsScore: number; // STS Risk Score (0-100)
  surgicalRisk: 'Low' | 'Intermediate' | 'High' | 'Prohibitive';
  treatment: 'Medical' | 'Surgical' | 'Interventional' | 'Hybrid';
  provider: string;
  lastVisit: Date;
  comorbidities: string[];
  ejectionFraction: number;
  isBicuspid: boolean;
  rossProcedureCandidate: boolean;
  repairVsReplacement: 'Repair' | 'Replacement' | 'Undetermined';
  postOpOutcome?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  gradientPeak: number; // Peak gradient mmHg
  effectiveOrificeArea: number; // cm²
  regurgitationGrade: 'None' | 'Trace' | 'Mild' | 'Moderate' | 'Severe';
}

const ValvePatientHeatmap: React.FC = () => {
  const [filterBy, setFilterBy] = useState<'severity' | 'surgicalRisk' | 'valveType' | 'treatment' | 'stsScore'>('severity');
  const [sortBy, setSortBy] = useState<'name' | 'severity' | 'stsScore' | 'age' | 'gradient'>('severity');
  const [selectedValveType, setSelectedValveType] = useState<'All' | 'Aortic' | 'Mitral' | 'Tricuspid' | 'Pulmonary'>('All');
  
  // Generate realistic valve disease patient data
  const patientData: ValvePatientData[] = useMemo(() => {
    const providers = ['Dr. Sarah Williams', 'Dr. Michael Chen', 'Dr. Jennifer Martinez', 'Dr. Robert Thompson', 'Dr. Lisa Park'];
    const valveTypes: Array<'Aortic' | 'Mitral' | 'Tricuspid' | 'Pulmonary'> = ['Aortic', 'Mitral', 'Tricuspid', 'Pulmonary'];
    const severities: Array<'Mild' | 'Moderate' | 'Severe' | 'Critical'> = ['Mild', 'Moderate', 'Severe', 'Critical'];
    const surgicalRisks: Array<'Low' | 'Intermediate' | 'High' | 'Prohibitive'> = ['Low', 'Intermediate', 'High', 'Prohibitive'];
    const treatments: Array<'Medical' | 'Surgical' | 'Interventional' | 'Hybrid'> = ['Medical', 'Surgical', 'Interventional', 'Hybrid'];
    const comorbidityOptions = ['Diabetes', 'CKD', 'COPD', 'AFib', 'CAD', 'HTN', 'Obesity', 'Rheumatic Heart Disease'];
    const repairOptions: Array<'Repair' | 'Replacement' | 'Undetermined'> = ['Repair', 'Replacement', 'Undetermined'];
    const regurgitationGrades: Array<'None' | 'Trace' | 'Mild' | 'Moderate' | 'Severe'> = ['None', 'Trace', 'Mild', 'Moderate', 'Severe'];
    
    return Array.from({ length: 120 }, (_, i) => {
      const valveType = valveTypes[Math.floor(Math.random() * valveTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const isBicuspid = valveType === 'Aortic' && Math.random() > 0.8;
      const age = Math.floor(Math.random() * 40) + 45; // 45-85 years
      
      // STS Score correlates with age and severity
      let stsScore = Math.random() * 20;
      if (severity === 'Severe' || severity === 'Critical') stsScore += 15;
      if (age > 75) stsScore += 10;
      stsScore = Math.min(Math.floor(stsScore), 100);
      
      const surgicalRisk = stsScore < 4 ? 'Low' : stsScore < 8 ? 'Intermediate' : stsScore < 15 ? 'High' : 'Prohibitive';
      
      // Gradient varies by valve type and severity
      let gradientPeak = 20;
      if (valveType === 'Aortic') {
        gradientPeak = severity === 'Mild' ? Math.random() * 20 + 10 :
                      severity === 'Moderate' ? Math.random() * 20 + 40 :
                      severity === 'Severe' ? Math.random() * 30 + 60 :
                      Math.random() * 40 + 80;
      } else if (valveType === 'Mitral') {
        gradientPeak = severity === 'Mild' ? Math.random() * 5 + 5 :
                      severity === 'Moderate' ? Math.random() * 5 + 10 :
                      severity === 'Severe' ? Math.random() * 10 + 15 :
                      Math.random() * 15 + 20;
      }
      
      return {
        id: `VD${String(i + 1).padStart(3, '0')}`,
        name: `Patient ${i + 1}`,
        age,
        valveType,
        severity,
        stsScore,
        surgicalRisk,
        treatment: treatments[Math.floor(Math.random() * treatments.length)],
        provider: providers[Math.floor(Math.random() * providers.length)],
        lastVisit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        comorbidities: comorbidityOptions.slice(0, Math.floor(Math.random() * 3) + 1),
        ejectionFraction: Math.floor(Math.random() * 40) + 35, // 35-75%
        isBicuspid,
        rossProcedureCandidate: valveType === 'Aortic' && age < 60 && Math.random() > 0.7,
        repairVsReplacement: repairOptions[Math.floor(Math.random() * repairOptions.length)],
        postOpOutcome: Math.random() > 0.3 ? ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)] as any : undefined,
        gradientPeak,
        effectiveOrificeArea: Math.random() * 2 + 0.5, // 0.5-2.5 cm²
        regurgitationGrade: regurgitationGrades[Math.floor(Math.random() * regurgitationGrades.length)]
      };
    });
  }, []);

  const filteredData = useMemo(() => {
    return selectedValveType === 'All' 
      ? patientData 
      : patientData.filter(p => p.valveType === selectedValveType);
  }, [patientData, selectedValveType]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'severity': 
          const severityOrder = { 'Critical': 4, 'Severe': 3, 'Moderate': 2, 'Mild': 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'stsScore': return b.stsScore - a.stsScore;
        case 'age': return b.age - a.age;
        case 'gradient': return b.gradientPeak - a.gradientPeak;
        default: return 0;
      }
    });
  }, [filteredData, sortBy]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-600';
      case 'Severe': return 'bg-red-500';
      case 'Moderate': return 'bg-orange-500';
      case 'Mild': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getSurgicalRiskColor = (risk: string) => {
    switch (risk) {
      case 'Prohibitive': return 'bg-red-600';
      case 'High': return 'bg-red-500';
      case 'Intermediate': return 'bg-orange-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getValveTypeColor = (valveType: string) => {
    switch (valveType) {
      case 'Aortic': return 'bg-red-400';
      case 'Mitral': return 'bg-blue-400';
      case 'Tricuspid': return 'bg-green-400';
      case 'Pulmonary': return 'bg-purple-400';
      default: return 'bg-gray-400';
    }
  };

  const getTreatmentColor = (treatment: string) => {
    switch (treatment) {
      case 'Surgical': return 'bg-red-500';
      case 'Interventional': return 'bg-blue-500';
      case 'Hybrid': return 'bg-purple-500';
      case 'Medical': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getStsScoreColor = (score: number) => {
    if (score >= 15) return 'bg-red-600';
    if (score >= 8) return 'bg-red-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getCellColor = (patient: ValvePatientData) => {
    switch (filterBy) {
      case 'severity': return getSeverityColor(patient.severity);
      case 'surgicalRisk': return getSurgicalRiskColor(patient.surgicalRisk);
      case 'valveType': return getValveTypeColor(patient.valveType);
      case 'treatment': return getTreatmentColor(patient.treatment);
      case 'stsScore': return getStsScoreColor(patient.stsScore);
      default: return 'bg-gray-300';
    }
  };

  const exportHeatmapData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      filterBy,
      sortBy,
      selectedValveType,
      patients: sortedData.map(p => ({
        ...p,
        lastVisit: p.lastVisit.toISOString()
      })),
      summary: {
        totalPatients: sortedData.length,
        criticalSevereCount: sortedData.filter(p => p.severity === 'Critical' || p.severity === 'Severe').length,
        highRiskSurgicalCount: sortedData.filter(p => p.surgicalRisk === 'High' || p.surgicalRisk === 'Prohibitive').length,
        rossCandidates: sortedData.filter(p => p.rossProcedureCandidate).length,
        bicuspidCount: sortedData.filter(p => p.isBicuspid).length,
        avgStsScore: sortedData.reduce((sum, p) => sum + p.stsScore, 0) / sortedData.length,
        repairCandidates: sortedData.filter(p => p.repairVsReplacement === 'Repair').length
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valve-patient-heatmap-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-steel-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Valve Disease Patient Heatmap
          </h3>
          <p className="text-steel-600">Interactive risk assessment and surgical decision support for valvular disease patients</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-steel-600" />
            <select 
              value={selectedValveType} 
              onChange={(e) => setSelectedValveType(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="All">All Valves</option>
              <option value="Aortic">Aortic</option>
              <option value="Mitral">Mitral</option>
              <option value="Tricuspid">Tricuspid</option>
              <option value="Pulmonary">Pulmonary</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-steel-600" />
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="severity">Disease Severity</option>
              <option value="surgicalRisk">Surgical Risk</option>
              <option value="valveType">Valve Type</option>
              <option value="treatment">Treatment Type</option>
              <option value="stsScore">STS Score</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-steel-600" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="severity">Severity</option>
              <option value="stsScore">STS Score</option>
              <option value="gradient">Peak Gradient</option>
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
        <div className="flex items-center gap-8 flex-wrap">
          <span className="font-medium text-steel-700">Legend:</span>
          {filterBy === 'severity' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-sm">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Severe</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Mild</span>
              </div>
            </div>
          )}
          {filterBy === 'surgicalRisk' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-sm">Prohibitive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Intermediate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Low Risk</span>
              </div>
            </div>
          )}
          {filterBy === 'valveType' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 rounded"></div>
                <span className="text-sm">Aortic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span className="text-sm">Mitral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-sm">Tricuspid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded"></div>
                <span className="text-sm">Pulmonary</span>
              </div>
            </div>
          )}
          {filterBy === 'treatment' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Surgical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Interventional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm">Hybrid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Medical</span>
              </div>
            </div>
          )}
          {filterBy === 'stsScore' && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-sm">Very High (≥15)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">High (8-14)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Intermediate (4-7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Low (less than 4)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Support Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Surgical Candidates</span>
          </div>
          <div className="mt-2 text-amber-700">
            <div className="text-2xl font-bold">
              {sortedData.filter(p => p.severity === 'Severe' && p.surgicalRisk !== 'Prohibitive').length}
            </div>
            <div className="text-sm">Severe disease, operable risk</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Heart className="w-5 h-5" />
            <span className="font-semibold">Ross Candidates</span>
          </div>
          <div className="mt-2 text-blue-700">
            <div className="text-2xl font-bold">
              {sortedData.filter(p => p.rossProcedureCandidate).length}
            </div>
            <div className="text-sm">Young aortic valve patients</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">Repair Candidates</span>
          </div>
          <div className="mt-2 text-green-700">
            <div className="text-2xl font-bold">
              {sortedData.filter(p => p.repairVsReplacement === 'Repair').length}
            </div>
            <div className="text-sm">Optimal for valve repair</div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <div className="grid grid-cols-10 gap-1">
          {sortedData.map((patient) => (
            <div
              key={patient.id}
              className={`${getCellColor(patient)} aspect-square rounded-sm cursor-pointer hover:opacity-80 transition-opacity relative group`}
              title={`${patient.name} - ${patient.valveType} ${patient.severity}`}
            >
              {/* Special indicators */}
              {patient.isBicuspid && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
              )}
              {patient.rossProcedureCandidate && (
                <div className="absolute top-0 left-0 w-2 h-2 bg-blue-400 rounded-full"></div>
              )}

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="bg-steel-900 text-white text-xs rounded-lg p-3 whitespace-nowrap shadow-lg max-w-xs">
                  <div className="font-semibold">{patient.name}</div>
                  <div>Valve: {patient.valveType} ({patient.severity})</div>
                  <div>STS Score: {patient.stsScore}% ({patient.surgicalRisk})</div>
                  <div>Peak Gradient: {patient.gradientPeak.toFixed(0)} mmHg</div>
                  <div>EOA: {patient.effectiveOrificeArea.toFixed(1)} cm²</div>
                  <div>Regurgitation: {patient.regurgitationGrade}</div>
                  {patient.isBicuspid && <div className="text-yellow-400">Bicuspid Aortic Valve</div>}
                  {patient.rossProcedureCandidate && <div className="text-blue-400">Ross Candidate</div>}
                  <div>Recommendation: {patient.repairVsReplacement}</div>
                  <div>Treatment: {patient.treatment}</div>
                  <div>EF: {patient.ejectionFraction}%</div>
                  <div>Age: {patient.age}</div>
                  <div>Provider: {patient.provider.split(' ')[1]}</div>
                  {patient.postOpOutcome && <div>Post-op: {patient.postOpOutcome}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4 pt-6 border-t border-steel-200">
          <div className="text-center p-3 bg-steel-50 rounded-lg">
            <div className="text-xl font-bold text-steel-900">{sortedData.length}</div>
            <div className="text-xs text-steel-600">Total Patients</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-600">
              {sortedData.filter(p => p.severity === 'Severe' || p.severity === 'Critical').length}
            </div>
            <div className="text-xs text-steel-600">Severe/Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-600">
              {sortedData.filter(p => p.surgicalRisk === 'High' || p.surgicalRisk === 'Prohibitive').length}
            </div>
            <div className="text-xs text-steel-600">High Risk</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {sortedData.filter(p => p.repairVsReplacement === 'Repair').length}
            </div>
            <div className="text-xs text-steel-600">Repair Candidates</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {sortedData.filter(p => p.rossProcedureCandidate).length}
            </div>
            <div className="text-xs text-steel-600">Ross Candidates</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl font-bold text-yellow-600">
              {sortedData.filter(p => p.isBicuspid).length}
            </div>
            <div className="text-xs text-steel-600">Bicuspid Valves</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValvePatientHeatmap;