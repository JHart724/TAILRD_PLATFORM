import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

interface PatientData {
  age: number;
  weight: number;
  creatinine: number;
  egfr: number;
  bleedingHistory: boolean;
  activeBleeding: boolean;
  recentSurgery: boolean;
  plateletCount: number;
  onAnticoagulation: boolean;
  pepticUlcer: boolean;
  stroke: boolean;
  hypertension: boolean;
  diabetes: boolean;
  contrastAllergy: boolean;
  priorContrastReaction: string;
  metformin: boolean;
  heartFailure: boolean;
}

interface SafetyAssessment {
  category: string;
  risk: 'low' | 'moderate' | 'high' | 'contraindicated';
  recommendation: string;
  monitoring: string[];
  alternatives?: string[];
}

const CoronarySafetyScreening: React.FC = () => {
  const [patientData, setPatientData] = useState<PatientData>({
    age: 65,
    weight: 75,
    creatinine: 1.2,
    egfr: 60,
    bleedingHistory: false,
    activeBleeding: false,
    recentSurgery: false,
    plateletCount: 200,
    onAnticoagulation: false,
    pepticUlcer: false,
    stroke: false,
    hypertension: true,
    diabetes: false,
    contrastAllergy: false,
    priorContrastReaction: 'none',
    metformin: false,
    heartFailure: false
  });

  const calculateDAPTAssessment = (): SafetyAssessment => {
    let risk: 'low' | 'moderate' | 'high' | 'contraindicated' = 'low';
    let recommendation = '';
    let monitoring: string[] = [];
    let alternatives: string[] = [];

    // Check for absolute contraindications
    if (patientData.activeBleeding) {
      risk = 'contraindicated';
      recommendation = 'DAPT contraindicated due to active bleeding. Consider balloon angioplasty only or defer procedure.';
      alternatives = ['Balloon angioplasty', 'Defer procedure until bleeding controlled'];
      return { category: 'DAPT', risk, recommendation, monitoring, alternatives };
    }

    if (patientData.plateletCount < 50) {
      risk = 'contraindicated';
      recommendation = 'DAPT contraindicated due to severe thrombocytopenia.';
      alternatives = ['Platelet transfusion', 'Hematology consultation'];
      return { category: 'DAPT', risk, recommendation, monitoring, alternatives };
    }

    // Calculate bleeding risk score (simplified HAS-BLED-like)
    let bleedingRisk = 0;
    if (patientData.age >= 65) bleedingRisk += 1;
    if (patientData.hypertension) bleedingRisk += 1;
    if (patientData.bleedingHistory) bleedingRisk += 2;
    if (patientData.stroke) bleedingRisk += 1;
    if (patientData.onAnticoagulation) bleedingRisk += 1;
    if (patientData.pepticUlcer) bleedingRisk += 1;
    if (patientData.recentSurgery) bleedingRisk += 1;

    if (bleedingRisk >= 4) {
      risk = 'high';
      recommendation = 'High bleeding risk. Consider shortened DAPT duration (1-3 months) with P2Y12 monotherapy.';
      monitoring = ['Weekly CBC first month', 'Monitor for bleeding signs', 'Consider PPI therapy'];
      alternatives = ['Shortened DAPT (1-3 months)', 'P2Y12 monotherapy after 1 month'];
    } else if (bleedingRisk >= 2) {
      risk = 'moderate';
      recommendation = 'Moderate bleeding risk. Standard DAPT with enhanced monitoring.';
      monitoring = ['Bi-weekly CBC first month', 'PPI if indicated', 'Monitor for bleeding'];
    } else {
      risk = 'low';
      recommendation = 'Standard DAPT duration (6-12 months) appropriate.';
      monitoring = ['Routine CBC monitoring', 'Patient education on bleeding signs'];
    }

    return { category: 'DAPT', risk, recommendation, monitoring, alternatives };
  };

  const calculateContrastAssessment = (): SafetyAssessment => {
    let risk: 'low' | 'moderate' | 'high' | 'contraindicated' = 'low';
    let recommendation = '';
    let monitoring: string[] = [];
    let alternatives: string[] = [];

    // Check for severe allergy
    if (patientData.contrastAllergy && patientData.priorContrastReaction === 'severe') {
      risk = 'contraindicated';
      recommendation = 'High-risk contrast allergy. Consider alternative imaging or extensive premedication.';
      alternatives = ['IVUS-guided PCI', 'Extensive premedication protocol', 'Defer if possible'];
      monitoring = ['ICU monitoring if contrast used', 'Epinephrine readily available'];
      return { category: 'Contrast', risk, recommendation, monitoring, alternatives };
    }

    // Calculate contrast-induced nephropathy risk
    let cinRisk = 0;
    if (patientData.egfr < 60) cinRisk += 2;
    if (patientData.egfr < 30) cinRisk += 2;
    if (patientData.diabetes) cinRisk += 1;
    if (patientData.age > 75) cinRisk += 1;
    if (patientData.heartFailure) cinRisk += 1;

    if (cinRisk >= 4) {
      risk = 'high';
      recommendation = 'High CIN risk. Minimize contrast volume, ensure adequate hydration.';
      monitoring = ['Pre/post creatinine', 'Urine output monitoring', 'Daily weights'];
      alternatives = ['IVUS guidance to minimize contrast', 'Staged procedures'];
    } else if (cinRisk >= 2) {
      risk = 'moderate';
      recommendation = 'Moderate CIN risk. Standard prevention measures.';
      monitoring = ['48-72h post-procedure creatinine', 'Adequate hydration'];
    } else {
      risk = 'low';
      recommendation = 'Low CIN risk. Standard contrast use appropriate.';
      monitoring = ['Routine post-procedure monitoring'];
    }

    // Metformin considerations
    if (patientData.metformin && patientData.egfr < 30) {
      recommendation += ' Hold metformin 48 hours post-procedure if eGFR <30.';
      monitoring.push('Hold metformin 48h post-procedure');
    }

    return { category: 'Contrast', risk, recommendation, monitoring, alternatives };
  };

  const daptAssessment = calculateDAPTAssessment();
  const contrastAssessment = calculateContrastAssessment();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'contraindicated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'moderate': return <Info className="w-5 h-5 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'contraindicated': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-steel-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-medical-amber-100">
            <Shield className="w-6 h-6 text-medical-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-steel-900 font-sf">Coronary Safety Screening</h2>
            <p className="text-steel-600">DAPT & Contrast Safety Assessment for PCI</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Patient Data Input */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <h3 className="text-lg font-semibold text-steel-900 mb-4 font-sf">Patient Assessment</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Age (years)</label>
                <input
                  type="number"
                  value={patientData.age}
                  onChange={(e) => setPatientData({...patientData, age: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={patientData.weight}
                  onChange={(e) => setPatientData({...patientData, weight: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Creatinine (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={patientData.creatinine}
                  onChange={(e) => setPatientData({...patientData, creatinine: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">eGFR (mL/min/1.73m²)</label>
                <input
                  type="number"
                  value={patientData.egfr}
                  onChange={(e) => setPatientData({...patientData, egfr: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-1">Platelet Count (×10³/μL)</label>
              <input
                type="number"
                value={patientData.plateletCount}
                onChange={(e) => setPatientData({...patientData, plateletCount: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
              />
            </div>

            {/* Checkboxes for risk factors */}
            <div className="space-y-2">
              <h4 className="font-medium text-steel-900">Risk Factors</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'bleedingHistory', label: 'Bleeding History' },
                  { key: 'activeBleeding', label: 'Active Bleeding' },
                  { key: 'recentSurgery', label: 'Recent Surgery' },
                  { key: 'onAnticoagulation', label: 'On Anticoagulation' },
                  { key: 'pepticUlcer', label: 'Peptic Ulcer Disease' },
                  { key: 'stroke', label: 'Prior Stroke' },
                  { key: 'hypertension', label: 'Hypertension' },
                  { key: 'diabetes', label: 'Diabetes' },
                  { key: 'contrastAllergy', label: 'Contrast Allergy' },
                  { key: 'metformin', label: 'On Metformin' },
                  { key: 'heartFailure', label: 'Heart Failure' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={patientData[item.key as keyof PatientData] as boolean}
                      onChange={(e) => setPatientData({
                        ...patientData,
                        [item.key]: e.target.checked
                      })}
                      className="mr-2 text-medical-amber-600 focus:ring-medical-amber-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {patientData.contrastAllergy && (
              <div>
                <label className="block text-sm font-medium text-steel-700 mb-1">Prior Contrast Reaction</label>
                <select
                  value={patientData.priorContrastReaction}
                  onChange={(e) => setPatientData({...patientData, priorContrastReaction: e.target.value})}
                  className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-amber-500 focus:border-medical-amber-500"
                >
                  <option value="none">None/Unknown</option>
                  <option value="mild">Mild (rash, nausea)</option>
                  <option value="moderate">Moderate (urticaria, vomiting)</option>
                  <option value="severe">Severe (anaphylaxis, shock)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Safety Assessment Results */}
        <div className="space-y-6">
          {/* DAPT Assessment */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">DAPT Safety Assessment</h3>
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(daptAssessment.risk)}`}>
                <div className="flex items-center gap-2">
                  {getRiskIcon(daptAssessment.risk)}
                  {daptAssessment.risk.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-steel-900 mb-2">Recommendation</h4>
                <p className="text-sm text-steel-700 bg-steel-50 p-3 rounded-lg">
                  {daptAssessment.recommendation}
                </p>
              </div>

              {daptAssessment.monitoring.length > 0 && (
                <div>
                  <h4 className="font-medium text-steel-900 mb-2">Monitoring Required</h4>
                  <ul className="space-y-1">
                    {daptAssessment.monitoring.map((item, index) => (
                      <li key={index} className="text-sm text-steel-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-medical-amber-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {daptAssessment.alternatives && daptAssessment.alternatives.length > 0 && (
                <div>
                  <h4 className="font-medium text-steel-900 mb-2">Alternative Strategies</h4>
                  <ul className="space-y-1">
                    {daptAssessment.alternatives.map((item, index) => (
                      <li key={index} className="text-sm text-steel-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Contrast Assessment */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Contrast Safety Assessment</h3>
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(contrastAssessment.risk)}`}>
                <div className="flex items-center gap-2">
                  {getRiskIcon(contrastAssessment.risk)}
                  {contrastAssessment.risk.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-steel-900 mb-2">Recommendation</h4>
                <p className="text-sm text-steel-700 bg-steel-50 p-3 rounded-lg">
                  {contrastAssessment.recommendation}
                </p>
              </div>

              {contrastAssessment.monitoring.length > 0 && (
                <div>
                  <h4 className="font-medium text-steel-900 mb-2">Monitoring Required</h4>
                  <ul className="space-y-1">
                    {contrastAssessment.monitoring.map((item, index) => (
                      <li key={index} className="text-sm text-steel-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-medical-amber-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {contrastAssessment.alternatives && contrastAssessment.alternatives.length > 0 && (
                <div>
                  <h4 className="font-medium text-steel-900 mb-2">Alternative Strategies</h4>
                  <ul className="space-y-1">
                    {contrastAssessment.alternatives.map((item, index) => (
                      <li key={index} className="text-sm text-steel-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoronarySafetyScreening;