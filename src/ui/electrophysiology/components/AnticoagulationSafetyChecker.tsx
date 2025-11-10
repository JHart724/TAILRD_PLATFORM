import React, { useState } from 'react';
import { Shield, Droplets, AlertTriangle, CheckCircle, XCircle, Clock, Pill, Zap } from 'lucide-react';

interface PatientData {
  age: number;
  weight: number;
  creatinine: number;
  eGFR: number;
  hemoglobin: number;
  plateletCount: number;
  inr: number;
  isPregnant: boolean;
  hasActiveBleeding: boolean;
  hasRecentBleeding: boolean;
  hasIntracranialHemorrhage: boolean;
  hasLiverDisease: boolean;
  liverDiseaseSeverity: 'mild' | 'moderate' | 'severe';
  hasEsophagealVarices: boolean;
  hasPepticUlcer: boolean;
  hasRecentSurgery: boolean;
  surgeryType: 'minor' | 'major';
  daysSinceSurgery: number;
  isOnAnticoagulant: boolean;
  currentAnticoagulant: 'warfarin' | 'dabigatran' | 'rivaroxaban' | 'apixaban' | 'edoxaban' | 'none';
  hasAFib: boolean;
  chaidsVascScore: number;
  hasbledScore: number;
  procedurePlanned: boolean;
  procedureType: 'ablation' | 'device' | 'cardioversion' | 'none';
  procedureUrgency: 'emergent' | 'urgent' | 'elective';
  currentMedications: string[];
}

interface AnticoagulationResult {
  therapy: 'warfarin' | 'dabigatran' | 'rivaroxaban' | 'apixaban' | 'edoxaban' | 'none';
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  dosing: {
    startDose: string;
    targetDose: string;
    adjustments: string;
  };
  bridging: {
    required: boolean;
    protocol: string;
    timing: string;
  };
  reversal: {
    agent: string;
    indication: string;
  };
}

const AnticoagulationSafetyChecker: React.FC = () => {
  const [patientData, setPatientData] = useState<PatientData>({
    age: 65,
    weight: 80,
    creatinine: 1.2,
    eGFR: 60,
    hemoglobin: 12.5,
    plateletCount: 200,
    inr: 1.0,
    isPregnant: false,
    hasActiveBleeding: false,
    hasRecentBleeding: false,
    hasIntracranialHemorrhage: false,
    hasLiverDisease: false,
    liverDiseaseSeverity: 'mild',
    hasEsophagealVarices: false,
    hasPepticUlcer: false,
    hasRecentSurgery: false,
    surgeryType: 'minor',
    daysSinceSurgery: 0,
    isOnAnticoagulant: false,
    currentAnticoagulant: 'none',
    hasAFib: true,
    chaidsVascScore: 3,
    hasbledScore: 2,
    procedurePlanned: false,
    procedureType: 'none',
    procedureUrgency: 'elective',
    currentMedications: []
  });

  const assessAnticoagulation = (): AnticoagulationResult[] => {
    const results: AnticoagulationResult[] = [];

    // Warfarin Assessment
    let warfarinStatus: AnticoagulationResult['status'] = 'safe';
    let warfarinLevel: AnticoagulationResult['level'] = 'none';
    const warfarinReasons: string[] = [];
    const warfarinAlternatives: string[] = [];
    const warfarinMonitoring: string[] = ['INR monitoring', 'CBC', 'Drug interactions'];

    // Absolute contraindications for Warfarin
    if (patientData.hasActiveBleeding) {
      warfarinStatus = 'contraindicated';
      warfarinLevel = 'absolute';
      warfarinReasons.push('Active bleeding');
      warfarinAlternatives.push('Treat bleeding first', 'Consider DOAC after stabilization');
    }
    if (patientData.isPregnant) {
      warfarinStatus = 'contraindicated';
      warfarinLevel = 'absolute';
      warfarinReasons.push('Pregnancy (teratogenic)');
      warfarinAlternatives.push('Heparin/LMWH', 'Mechanical valve consultation');
    }
    if (patientData.hasIntracranialHemorrhage) {
      warfarinStatus = 'contraindicated';
      warfarinLevel = 'absolute';
      warfarinReasons.push('History of intracranial hemorrhage');
      warfarinAlternatives.push('Left atrial appendage closure', 'Aspirin if low stroke risk');
    }
    if (patientData.hasLiverDisease && patientData.liverDiseaseSeverity === 'severe') {
      warfarinStatus = 'contraindicated';
      warfarinLevel = 'absolute';
      warfarinReasons.push('Severe liver disease');
      warfarinAlternatives.push('DOAC may be safer', 'Hepatology consultation');
    }

    // Relative contraindications for Warfarin
    if (patientData.hasEsophagealVarices && warfarinStatus !== 'contraindicated') {
      warfarinStatus = 'caution';
      warfarinLevel = 'relative';
      warfarinReasons.push('Esophageal varices (bleeding risk)');
      warfarinMonitoring.push('GI evaluation', 'Lower INR target consideration');
    }
    if (patientData.hasbledScore >= 3 && warfarinStatus !== 'contraindicated') {
      warfarinStatus = 'caution';
      warfarinLevel = 'relative';
      warfarinReasons.push('High bleeding risk (HAS-BLED ≥3)');
      warfarinMonitoring.push('Frequent INR monitoring', 'Bleeding prevention counseling');
    }

    results.push({
      therapy: 'warfarin',
      status: warfarinStatus,
      level: warfarinLevel,
      reasons: warfarinReasons,
      alternatives: warfarinAlternatives,
      monitoring: warfarinMonitoring,
      dosing: {
        startDose: warfarinStatus === 'caution' ? '2.5-5mg daily' : '5-10mg daily',
        targetDose: 'INR 2.0-3.0 (2.5-3.5 for mechanical valves)',
        adjustments: 'Based on INR, genetics, interactions'
      },
      bridging: {
        required: patientData.procedurePlanned && patientData.procedureUrgency !== 'emergent',
        protocol: 'Stop warfarin 5 days prior, bridge with LMWH',
        timing: 'Resume 12-24h post-procedure if hemostasis'
      },
      reversal: {
        agent: 'Vitamin K, FFP, or 4-factor PCC',
        indication: 'Major bleeding or urgent surgery'
      }
    });

    // DOAC Assessment (using Apixaban as representative)
    let doacStatus: AnticoagulationResult['status'] = 'safe';
    let doacLevel: AnticoagulationResult['level'] = 'none';
    const doacReasons: string[] = [];
    const doacAlternatives: string[] = [];
    const doacMonitoring: string[] = ['Renal function', 'CBC', 'Liver function'];

    // Absolute contraindications for DOACs
    if (patientData.hasActiveBleeding) {
      doacStatus = 'contraindicated';
      doacLevel = 'absolute';
      doacReasons.push('Active bleeding');
      doacAlternatives.push('Treat bleeding first');
    }
    if (patientData.eGFR < 15) {
      doacStatus = 'contraindicated';
      doacLevel = 'absolute';
      doacReasons.push('Severe renal impairment (eGFR <15)');
      doacAlternatives.push('Warfarin with careful monitoring', 'Dialysis evaluation');
    }
    if (patientData.hasLiverDisease && patientData.liverDiseaseSeverity === 'severe') {
      doacStatus = 'contraindicated';
      doacLevel = 'absolute';
      doacReasons.push('Severe liver disease');
      doacAlternatives.push('Warfarin may be preferred');
    }

    // Relative contraindications for DOACs
    if (patientData.eGFR < 30 && doacStatus !== 'contraindicated') {
      doacStatus = 'caution';
      doacLevel = 'relative';
      doacReasons.push('Moderate renal impairment (eGFR 15-30)');
      doacMonitoring.push('Frequent renal monitoring', 'Dose reduction required');
    }
    if (patientData.age > 80 && doacStatus !== 'contraindicated') {
      doacStatus = 'monitor';
      doacReasons.push('Advanced age (>80 years)');
      doacMonitoring.push('Fall risk assessment', 'Dose reduction consideration');
    }
    if (patientData.weight < 60 && doacStatus !== 'contraindicated') {
      doacStatus = 'monitor';
      doacReasons.push('Low body weight (<60 kg)');
      doacMonitoring.push('Dose reduction consideration');
    }

    results.push({
      therapy: 'apixaban',
      status: doacStatus,
      level: doacLevel,
      reasons: doacReasons,
      alternatives: doacAlternatives,
      monitoring: doacMonitoring,
      dosing: {
        startDose: doacStatus === 'caution' || patientData.age > 80 || patientData.weight < 60 
          ? 'Apixaban 2.5mg BID' : 'Apixaban 5mg BID',
        targetDose: 'Apixaban 5mg BID (2.5mg BID if dose reduction criteria)',
        adjustments: 'Age ≥80, weight ≤60kg, or creatinine ≥1.5'
      },
      bridging: {
        required: patientData.procedurePlanned && patientData.procedureUrgency !== 'emergent',
        protocol: 'Stop 24-48h prior depending on procedure risk',
        timing: 'Resume 6-24h post-procedure if hemostasis'
      },
      reversal: {
        agent: 'Andexanet alfa (if available) or 4-factor PCC',
        indication: 'Life-threatening bleeding'
      }
    });

    // No Anticoagulation Assessment
    let noACStatus: AnticoagulationResult['status'] = 'safe';
    let noACLevel: AnticoagulationResult['level'] = 'none';
    const noACReasons: string[] = [];
    const noACAlternatives: string[] = [];
    const noACMonitoring: string[] = ['Stroke risk assessment', 'Bleeding risk monitoring'];

    if (patientData.chaidsVascScore >= 2) {
      noACStatus = 'caution';
      noACLevel = 'relative';
      noACReasons.push(`High stroke risk (CHA₂DS₂-VASc = ${patientData.chaidsVascScore})`);
      noACAlternatives.push('Anticoagulation strongly recommended', 'LAA closure if AC contraindicated');
    } else if (patientData.chaidsVascScore === 1) {
      noACStatus = 'monitor';
      noACReasons.push('Intermediate stroke risk');
      noACMonitoring.push('Consider anticoagulation', 'Shared decision making');
    }

    results.push({
      therapy: 'none',
      status: noACStatus,
      level: noACLevel,
      reasons: noACReasons,
      alternatives: noACAlternatives,
      monitoring: noACMonitoring,
      dosing: {
        startDose: 'Aspirin 75-100mg daily (if low bleeding risk)',
        targetDose: 'Aspirin 75-100mg daily',
        adjustments: 'Based on bleeding/stroke risk balance'
      },
      bridging: {
        required: false,
        protocol: 'Not applicable',
        timing: 'Not applicable'
      },
      reversal: {
        agent: 'Not applicable',
        indication: 'Not applicable'
      }
    });

    return results;
  };

  const results = assessAnticoagulation();

  const updatePatientData = (key: keyof PatientData, value: any) => {
    setPatientData(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: AnticoagulationResult['status']) => {
    switch (status) {
      case 'contraindicated': return 'text-red-800 bg-red-100 border-red-300';
      case 'caution': return 'text-medical-amber-800 bg-medical-amber-100 border-medical-amber-300';
      case 'monitor': return 'text-medical-green-800 bg-medical-green-100 border-medical-green-300';
      case 'safe': return 'text-medical-green-800 bg-medical-green-100 border-medical-green-300';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getStatusIcon = (status: AnticoagulationResult['status']) => {
    switch (status) {
      case 'contraindicated': return <XCircle className="w-5 h-5" />;
      case 'caution': return <AlertTriangle className="w-5 h-5" />;
      case 'monitor': return <Clock className="w-5 h-5" />;
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getTherapyIcon = (therapy: AnticoagulationResult['therapy']) => {
    switch (therapy) {
      case 'warfarin': return <Pill className="w-5 h-5" />;
      case 'apixaban': return <Droplets className="w-5 h-5" />;
      case 'none': return <Shield className="w-5 h-5" />;
      default: return <Pill className="w-5 h-5" />;
    }
  };

  const getTherapyLabel = (therapy: AnticoagulationResult['therapy']) => {
    switch (therapy) {
      case 'warfarin': return 'Warfarin';
      case 'apixaban': return 'DOAC (Apixaban)';
      case 'none': return 'No Anticoagulation';
      default: return therapy;
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="w-8 h-8 text-medical-purple-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">Anticoagulation Safety Checker</h2>
          <p className="text-steel-600">Comprehensive bleeding and stroke risk assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient Data Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 bg-medical-purple-50 border border-medical-purple-200 rounded-lg">
            <h3 className="font-semibold text-medical-purple-800 mb-3">Patient Demographics & Labs</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientData.age}
                    onChange={(e) => updatePatientData('age', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={patientData.weight}
                    onChange={(e) => updatePatientData('weight', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">eGFR</label>
                  <input
                    type="number"
                    value={patientData.eGFR}
                    onChange={(e) => updatePatientData('eGFR', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Hemoglobin</label>
                  <input
                    type="number"
                    step="0.1"
                    value={patientData.hemoglobin}
                    onChange={(e) => updatePatientData('hemoglobin', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-red-50 border border-medical-red-200 rounded-lg">
            <h3 className="font-semibold text-medical-red-800 mb-3">Risk Scores</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">CHA₂DS₂-VASc Score</label>
                <input
                  type="number"
                  value={patientData.chaidsVascScore}
                  onChange={(e) => updatePatientData('chaidsVascScore', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">HAS-BLED Score</label>
                <input
                  type="number"
                  value={patientData.hasbledScore}
                  onChange={(e) => updatePatientData('hasbledScore', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
                  min="0"
                  max="9"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 border border-medical-amber-200 rounded-lg">
            <h3 className="font-semibold text-medical-amber-800 mb-3">Clinical Conditions</h3>
            <div className="space-y-3">
              {[
                { key: 'isPregnant', label: 'Pregnant' },
                { key: 'hasActiveBleeding', label: 'Active bleeding' },
                { key: 'hasIntracranialHemorrhage', label: 'Intracranial hemorrhage history' },
                { key: 'hasEsophagealVarices', label: 'Esophageal varices' },
                { key: 'hasPepticUlcer', label: 'Active peptic ulcer' },
                { key: 'hasRecentSurgery', label: 'Recent surgery' },
                { key: 'procedurePlanned', label: 'Procedure planned' }
              ].map((condition) => (
                <label key={condition.key} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData[condition.key as keyof PatientData] as boolean}
                    onChange={(e) => updatePatientData(condition.key as keyof PatientData, e.target.checked)}
                    className="rounded text-medical-amber-600"
                  />
                  <span className="text-sm font-medium text-steel-700">{condition.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {results.map((result) => (
              <div key={result.therapy} className={`p-6 rounded-xl border-2 ${getStatusColor(result.status)}`}>
                <div className="flex items-center gap-3 mb-4">
                  {getTherapyIcon(result.therapy)}
                  <div className="flex-1">
                    <div className="font-bold text-lg">{getTherapyLabel(result.therapy)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(result.status)}
                      <span className="text-sm font-medium capitalize">{result.status}</span>
                      {result.level !== 'none' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                          {result.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {result.reasons.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold mb-2">Considerations:</div>
                    <ul className="text-sm space-y-1">
                      {result.reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></div>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Dosing:</span>
                    <div className="mt-1">{result.dosing.startDose}</div>
                  </div>
                  <div>
                    <span className="font-semibold">Target:</span>
                    <div className="mt-1">{result.dosing.targetDose}</div>
                  </div>
                </div>

                {result.bridging.required && (
                  <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                    <div className="text-sm font-semibold mb-1">Procedural Bridging:</div>
                    <div className="text-sm">{result.bridging.protocol}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Risk Assessment Summary */}
          <div className="p-6 bg-white rounded-xl border border-steel-200 shadow-retina-2">
            <h3 className="text-lg font-semibold text-steel-900 mb-4">Risk-Benefit Assessment</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="font-semibold text-steel-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-medical-red-500" />
                  Stroke Risk
                </div>
                <div className="text-sm text-steel-700">
                  <div>CHA₂DS₂-VASc: {patientData.chaidsVascScore}</div>
                  <div className="text-xs mt-1">
                    {patientData.chaidsVascScore === 0 && 'Very low risk (0.2%/year)'}
                    {patientData.chaidsVascScore === 1 && 'Low risk (0.9%/year)'}
                    {patientData.chaidsVascScore === 2 && 'Moderate risk (2.9%/year)'}
                    {patientData.chaidsVascScore >= 3 && 'High risk (>4%/year)'}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold text-steel-900 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-medical-amber-500" />
                  Bleeding Risk
                </div>
                <div className="text-sm text-steel-700">
                  <div>HAS-BLED: {patientData.hasbledScore}</div>
                  <div className="text-xs mt-1">
                    {patientData.hasbledScore <= 2 && 'Low risk (<2%/year)'}
                    {patientData.hasbledScore >= 3 && 'High risk (>3%/year)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Recommendation */}
          <div className="p-6 bg-medical-green-50 border border-medical-green-200 rounded-xl">
            <h3 className="text-lg font-semibold text-medical-green-800 mb-4">Clinical Recommendation</h3>
            <div className="text-sm text-medical-green-700">
              {patientData.chaidsVascScore >= 2 && !patientData.hasActiveBleeding && (
                <div className="font-semibold text-medical-green-800">
                  Anticoagulation RECOMMENDED - Stroke risk outweighs bleeding risk
                </div>
              )}
              {patientData.chaidsVascScore === 1 && (
                <div className="font-semibold text-medical-amber-800">
                  Consider anticoagulation - Shared decision making recommended
                </div>
              )}
              {patientData.chaidsVascScore === 0 && (
                <div className="font-semibold text-medical-green-800">
                  Anticoagulation NOT recommended - Very low stroke risk
                </div>
              )}
              {patientData.hasActiveBleeding && (
                <div className="font-semibold text-red-800">
                  Anticoagulation CONTRAINDICATED - Treat bleeding first
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnticoagulationSafetyChecker;