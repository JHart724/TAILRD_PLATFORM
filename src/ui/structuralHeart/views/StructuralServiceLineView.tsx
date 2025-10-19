import React, { useState } from 'react';
import { Heart, Calculator, Users, Award, TrendingUp, Shield, Brain, Zap } from 'lucide-react';

interface TAVRCandidate {
  id: string;
  name: string;
  age: number;
  stsScore: number;
  logisticEuroScore: number;
  aorticValveArea: number;
  meanGradient: number;
  ef: number;
  frailtyScore: number;
  recommendation: 'TAVR' | 'SAVR' | 'Medical' | 'Evaluation';
  riskLevel: 'low' | 'intermediate' | 'high' | 'prohibitive';
}

interface MitraClipCandidate {
  id: string;
  name: string;
  age: number;
  ef: number;
  mrSeverity: string;
  suitability: number;
  anatomy: 'favorable' | 'intermediate' | 'unfavorable';
  recommendation: 'MitraClip' | 'Surgery' | 'Medical' | 'Evaluation';
}

const StructuralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'outcomes' | 'calculators'>('candidates');

  const tavrCandidates: TAVRCandidate[] = [
    {
      id: 'T001',
      name: 'Thompson, Margaret',
      age: 84,
      stsScore: 6.8,
      logisticEuroScore: 12.4,
      aorticValveArea: 0.6,
      meanGradient: 54,
      ef: 55,
      frailtyScore: 3,
      recommendation: 'TAVR',
      riskLevel: 'intermediate'
    },
    {
      id: 'T002',
      name: 'Rodriguez, Carlos',
      age: 72,
      stsScore: 3.2,
      logisticEuroScore: 8.1,
      aorticValveArea: 0.7,
      meanGradient: 48,
      ef: 60,
      frailtyScore: 2,
      recommendation: 'TAVR',
      riskLevel: 'low'
    },
    {
      id: 'T003',
      name: 'Wilson, Robert',
      age: 89,
      stsScore: 12.4,
      logisticEuroScore: 28.7,
      aorticValveArea: 0.5,
      meanGradient: 62,
      ef: 35,
      frailtyScore: 5,
      recommendation: 'TAVR',
      riskLevel: 'prohibitive'
    }
  ];

  const mitraClipCandidates: MitraClipCandidate[] = [
    {
      id: 'M001',
      name: 'Anderson, Dorothy',
      age: 78,
      ef: 45,
      mrSeverity: 'Severe',
      suitability: 85,
      anatomy: 'favorable',
      recommendation: 'MitraClip'
    },
    {
      id: 'M002',
      name: 'Brown, James',
      age: 81,
      ef: 38,
      mrSeverity: 'Severe',
      suitability: 72,
      anatomy: 'intermediate',
      recommendation: 'MitraClip'
    }
  ];

  const calculateTAVRRisk = (stsScore: number): { risk: string; mortality: number; color: string } => {
    if (stsScore < 4) {
      return { risk: 'Low', mortality: 1.1, color: 'text-medical-green-600' };
    } else if (stsScore < 8) {
      return { risk: 'Intermediate', mortality: 3.2, color: 'text-medical-amber-600' };
    } else if (stsScore < 15) {
      return { risk: 'High', mortality: 7.8, color: 'text-medical-red-600' };
    } else {
      return { risk: 'Prohibitive', mortality: 15.4, color: 'text-medical-red-800' };
    }
  };

  const calculateMitraClipSuitability = (ef: number, age: number, anatomy: string): number => {
    let score = 60; // Base score
    
    // EF contribution
    if (ef >= 50) score += 20;
    else if (ef >= 40) score += 15;
    else if (ef >= 30) score += 10;
    else score += 5;
    
    // Age contribution
    if (age < 70) score += 10;
    else if (age < 80) score += 5;
    else score += 0;
    
    // Anatomy contribution
    if (anatomy === 'favorable') score += 20;
    else if (anatomy === 'intermediate') score += 10;
    else score += 0;
    
    return Math.min(95, score);
  };

  const getHeartTeamDecision = (patient: TAVRCandidate): { decision: string; rationale: string[] } => {
    const decisions = [];
    const rationale = [];
    
    if (patient.stsScore < 4 && patient.age < 75) {
      rationale.push('Low surgical risk favors SAVR consideration');
    }
    
    if (patient.stsScore >= 8 || patient.age >= 80) {
      rationale.push('High surgical risk favors TAVR approach');
    }
    
    if (patient.frailtyScore >= 4) {
      rationale.push('Frailty supports transcatheter intervention');
    }
    
    if (patient.ef < 40) {
      rationale.push('Reduced EF requires careful risk assessment');
    }
    
    return {
      decision: patient.recommendation,
      rationale
    };
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'candidates', label: 'Candidate Assessment', icon: Users },
          { id: 'outcomes', label: 'Outcomes Analytics', icon: Award },
          { id: 'calculators', label: 'Risk Calculators', icon: Calculator }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-medical-red-500 text-medical-red-600 bg-medical-red-50'
                  : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Candidate Assessment Tab */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          {/* TAVR Candidates */}
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf flex items-center gap-2">
              <Heart className="w-8 h-8 text-medical-red-500" />
              TAVR Candidate Pipeline
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tavrCandidates.map((patient) => {
                const riskAssessment = calculateTAVRRisk(patient.stsScore);
                const heartTeam = getHeartTeamDecision(patient);
                
                return (
                  <div
                    key={patient.id}
                    className="p-6 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-steel-900">{patient.name}</h3>
                        <p className="text-sm text-steel-600">Age {patient.age} • EF {patient.ef}%</p>
                      </div>
                      <div className={`px-3 py-1 rounded text-xs font-semibold ${
                        patient.riskLevel === 'low' ? 'bg-medical-green-100 text-medical-green-800' :
                        patient.riskLevel === 'intermediate' ? 'bg-medical-amber-100 text-medical-amber-800' :
                        patient.riskLevel === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
                        'bg-medical-red-200 text-medical-red-900'
                      }`}>
                        {riskAssessment.risk} Risk
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-steel-600">STS Score:</span>
                          <span className={`ml-2 font-semibold ${riskAssessment.color}`}>
                            {patient.stsScore}%
                          </span>
                        </div>
                        <div>
                          <span className="text-steel-600">EuroSCORE:</span>
                          <span className="ml-2 font-semibold text-steel-900">
                            {patient.logisticEuroScore}%
                          </span>
                        </div>
                        <div>
                          <span className="text-steel-600">AVA:</span>
                          <span className="ml-2 font-semibold text-steel-900">
                            {patient.aorticValveArea} cm²
                          </span>
                        </div>
                        <div>
                          <span className="text-steel-600">Mean Grad:</span>
                          <span className="ml-2 font-semibold text-steel-900">
                            {patient.meanGradient} mmHg
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-steel-100">
                        <div className="text-sm font-semibold text-steel-700 mb-2">Heart Team Decision</div>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                          patient.recommendation === 'TAVR' ? 'bg-medical-green-100 text-medical-green-800' :
                          patient.recommendation === 'SAVR' ? 'bg-medical-blue-100 text-medical-blue-800' :
                          'bg-medical-amber-100 text-medical-amber-800'
                        }`}>
                          {patient.recommendation} Recommended
                        </div>
                        
                        <div className="mt-2 text-xs text-steel-600">
                          <ul className="space-y-1">
                            {heartTeam.rationale.map((reason, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <div className="w-1 h-1 bg-steel-400 rounded-full mt-2 flex-shrink-0"></div>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 px-3 py-2 bg-medical-red-500 text-white text-xs rounded-lg hover:bg-medical-red-600 transition-colors">
                        Schedule Procedure
                      </button>
                      <button className="flex-1 px-3 py-2 bg-steel-200 text-steel-800 text-xs rounded-lg hover:bg-steel-300 transition-colors">
                        Heart Team Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MitraClip Candidates */}
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf flex items-center gap-2">
              <Heart className="w-8 h-8 text-medical-blue-500" />
              MitraClip Candidate Pipeline
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mitraClipCandidates.map((patient) => {
                const suitability = calculateMitraClipSuitability(patient.ef, patient.age, patient.anatomy);
                
                return (
                  <div
                    key={patient.id}
                    className="p-6 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-steel-900">{patient.name}</h3>
                        <p className="text-sm text-steel-600">Age {patient.age} • EF {patient.ef}%</p>
                      </div>
                      <div className={`px-3 py-1 rounded text-xs font-semibold ${
                        suitability >= 80 ? 'bg-medical-green-100 text-medical-green-800' :
                        suitability >= 60 ? 'bg-medical-amber-100 text-medical-amber-800' :
                        'bg-medical-red-100 text-medical-red-800'
                      }`}>
                        {suitability}% Suitable
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-steel-600">MR Severity:</span>
                          <span className="ml-2 font-semibold text-medical-red-600">
                            {patient.mrSeverity}
                          </span>
                        </div>
                        <div>
                          <span className="text-steel-600">Anatomy:</span>
                          <span className={`ml-2 font-semibold ${
                            patient.anatomy === 'favorable' ? 'text-medical-green-600' :
                            patient.anatomy === 'intermediate' ? 'text-medical-amber-600' :
                            'text-medical-red-600'
                          }`}>
                            {patient.anatomy}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-steel-100">
                        <div className="text-sm font-semibold text-steel-700 mb-2">Recommendation</div>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                          patient.recommendation === 'MitraClip' ? 'bg-medical-green-100 text-medical-green-800' :
                          patient.recommendation === 'Surgery' ? 'bg-medical-blue-100 text-medical-blue-800' :
                          'bg-medical-amber-100 text-medical-amber-800'
                        }`}>
                          {patient.recommendation}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 px-3 py-2 bg-medical-blue-500 text-white text-xs rounded-lg hover:bg-medical-blue-600 transition-colors">
                        Schedule Procedure
                      </button>
                      <button className="flex-1 px-3 py-2 bg-steel-200 text-steel-800 text-xs rounded-lg hover:bg-steel-300 transition-colors">
                        Anatomical Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Outcomes Analytics Tab */}
      {activeTab === 'outcomes' && (
        <div className="space-y-6">
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
              Outcomes Analytics Dashboard
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* TAVR Outcomes */}
              <div>
                <h3 className="text-xl font-semibold text-steel-900 mb-4">TAVR Outcomes by Risk</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-green-800">Low Risk (STS <4%)</span>
                      <span className="text-sm text-steel-600">186 cases</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">30d Mortality</div>
                        <div className="font-bold text-medical-green-600">0.8%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Stroke</div>
                        <div className="font-bold text-medical-green-600">1.6%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">PPI</div>
                        <div className="font-bold text-medical-amber-600">8.2%</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-amber-800">Intermediate Risk (STS 4-8%)</span>
                      <span className="text-sm text-steel-600">127 cases</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">30d Mortality</div>
                        <div className="font-bold text-medical-green-600">1.6%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Stroke</div>
                        <div className="font-bold text-medical-green-600">2.4%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">PPI</div>
                        <div className="font-bold text-medical-amber-600">12.8%</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-medical-red-50 rounded-lg border border-medical-red-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-red-800">High Risk (STS >8%)</span>
                      <span className="text-sm text-steel-600">34 cases</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">30d Mortality</div>
                        <div className="font-bold text-medical-amber-600">4.1%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Stroke</div>
                        <div className="font-bold text-medical-amber-600">3.8%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">PPI</div>
                        <div className="font-bold text-medical-red-600">18.4%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MitraClip Outcomes */}
              <div>
                <h3 className="text-xl font-semibold text-steel-900 mb-4">MitraClip Outcomes</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-medical-blue-50 rounded-lg border border-medical-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-blue-800">Favorable Anatomy</span>
                      <span className="text-sm text-steel-600">89 cases</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">MR ≤2+ at 30d</div>
                        <div className="font-bold text-medical-green-600">96.8%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Device Success</div>
                        <div className="font-bold text-medical-green-600">98.9%</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-amber-800">Intermediate Anatomy</span>
                      <span className="text-sm text-steel-600">52 cases</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">MR ≤2+ at 30d</div>
                        <div className="font-bold text-medical-green-600">88.5%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Device Success</div>
                        <div className="font-bold text-medical-green-600">94.2%</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-medical-red-50 rounded-lg border border-medical-red-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-medical-red-800">Unfavorable Anatomy</span>
                      <span className="text-sm text-steel-600">15 cases</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-steel-600">MR ≤2+ at 30d</div>
                        <div className="font-bold text-medical-amber-600">73.3%</div>
                      </div>
                      <div>
                        <div className="text-steel-600">Device Success</div>
                        <div className="font-bold text-medical-amber-600">86.7%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Calculators Tab */}
      {activeTab === 'calculators' && (
        <div className="space-y-6">
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf flex items-center gap-2">
              <Calculator className="w-8 h-8 text-medical-blue-500" />
              Structural Heart Risk Calculators
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* STS Calculator */}
              <div className="p-6 bg-white rounded-xl border border-steel-200">
                <h3 className="text-xl font-semibold text-steel-900 mb-4">STS Risk Calculator</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">Age</label>
                    <input type="number" className="w-full px-3 py-2 border border-steel-300 rounded-lg" placeholder="Enter age" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">Gender</label>
                    <select className="w-full px-3 py-2 border border-steel-300 rounded-lg">
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">Ejection Fraction (%)</label>
                    <input type="number" className="w-full px-3 py-2 border border-steel-300 rounded-lg" placeholder="Enter EF" />
                  </div>
                  
                  <div className="pt-4 border-t border-steel-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-steel-900">STS Score</span>
                      <span className="text-2xl font-bold text-medical-red-600">6.8%</span>
                    </div>
                    <div className="text-sm text-steel-600 mt-1">Intermediate Risk</div>
                  </div>
                </div>
              </div>

              {/* EuroSCORE Calculator */}
              <div className="p-6 bg-white rounded-xl border border-steel-200">
                <h3 className="text-xl font-semibold text-steel-900 mb-4">EuroSCORE II Calculator</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">Creatinine (mg/dL)</label>
                    <input type="number" className="w-full px-3 py-2 border border-steel-300 rounded-lg" placeholder="Enter creatinine" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">NYHA Class</label>
                    <select className="w-full px-3 py-2 border border-steel-300 rounded-lg">
                      <option>I</option>
                      <option>II</option>
                      <option>III</option>
                      <option>IV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-steel-700 mb-1">Urgency</label>
                    <select className="w-full px-3 py-2 border border-steel-300 rounded-lg">
                      <option>Elective</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t border-steel-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-steel-900">EuroSCORE II</span>
                      <span className="text-2xl font-bold text-medical-red-600">12.4%</span>
                    </div>
                    <div className="text-sm text-steel-600 mt-1">Intermediate Risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuralServiceLineView;