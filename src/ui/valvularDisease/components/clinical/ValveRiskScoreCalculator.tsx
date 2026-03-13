import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, Info, Shield, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface ValveRiskInputs {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  lvef: number;
  nyhaClass: 1 | 2 | 3 | 4;
  creatinine: number;
  diabetes: boolean;
  dialysis: boolean;
  pulmonaryHTN: boolean;
  paSystemolicPressure: number;
  priorCardiacSurgery: boolean;
  urgency: 'elective' | 'urgent' | 'emergent' | 'salvage';
  activeEndocarditis: boolean;
  criticalPreopState: boolean;
  poorMobility: boolean;
  chronicLungDisease: boolean;
  extracardiacArteriopathy: boolean;
}

interface RiskResult {
  stsScore: number;
  stsCategory: string;
  euroScore: number;
  euroCategory: string;
  combinedRecommendation: string;
  approachRecommendation: string;
}

const ValveRiskScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<ValveRiskInputs>({
 age: patientData?.age ?? 75,
 gender: patientData?.gender ?? 'male',
 height: patientData?.height ?? 175,
 weight: patientData?.weight ?? 80,
 lvef: patientData?.lvef ?? 50,
 nyhaClass: patientData?.nyhaClass ?? 2,
 creatinine: patientData?.creatinine ?? 1.3,
 diabetes: patientData?.diabetes ?? false,
 dialysis: patientData?.dialysis ?? false,
 pulmonaryHTN: false,
 paSystemolicPressure: patientData?.paSystolicPressure ?? 35,
 priorCardiacSurgery: patientData?.priorCardiacSurgery ?? false,
 urgency: 'elective',
 activeEndocarditis: patientData?.activeEndocarditis ?? false,
 criticalPreopState: false,
 poorMobility: false,
 chronicLungDisease: patientData?.copd ?? false,
 extracardiacArteriopathy: patientData?.pvd ?? false,
  });

  const calculateRisk = (): RiskResult => {
 // STS Score Estimation
 let stsMortality = 1.5; // base mortality

 // Age contribution
 if (inputs.age > 70) stsMortality += (inputs.age - 70) * 0.5;
 if (inputs.age > 80) stsMortality += (inputs.age - 80) * 0.3; // additional for very elderly

 // Gender
 if (inputs.gender === 'female') stsMortality += 0.3;

 // LVEF
 if (inputs.lvef < 30) stsMortality += 2.0;
 else if (inputs.lvef < 40) stsMortality += 1.2;
 else if (inputs.lvef < 50) stsMortality += 0.5;

 // NYHA Class
 if (inputs.nyhaClass === 3) stsMortality += 1.5;
 if (inputs.nyhaClass === 4) stsMortality += 3.0;

 // Renal
 if (inputs.dialysis) stsMortality += 4.0;
 else if (inputs.creatinine > 2.0) stsMortality += 2.0;
 else if (inputs.creatinine > 1.5) stsMortality += 0.8;

 // Diabetes
 if (inputs.diabetes) stsMortality += 0.5;

 // Prior surgery (redo)
 if (inputs.priorCardiacSurgery) stsMortality += 3.0;

 // Urgency
 if (inputs.urgency === 'urgent') stsMortality += 2.0;
 if (inputs.urgency === 'emergent') stsMortality += 5.0;
 if (inputs.urgency === 'salvage') stsMortality += 10.0;

 // Endocarditis
 if (inputs.activeEndocarditis) stsMortality += 3.0;

 // Lung disease
 if (inputs.chronicLungDisease) stsMortality += 0.8;

 // Peripheral vascular disease
 if (inputs.extracardiacArteriopathy) stsMortality += 1.0;

 // Poor mobility
 if (inputs.poorMobility) stsMortality += 1.2;

 // Pulmonary HTN
 if (inputs.pulmonaryHTN && inputs.paSystemolicPressure > 55) stsMortality += 1.5;
 else if (inputs.pulmonaryHTN) stsMortality += 0.7;

 stsMortality = Math.min(50, Math.max(0.5, stsMortality));
 stsMortality = Math.round(stsMortality * 10) / 10;

 let stsCategory: string;
 if (stsMortality < 4) stsCategory = 'Low';
 else if (stsMortality < 8) stsCategory = 'Intermediate';
 else stsCategory = 'High/Prohibitive';

 // EuroSCORE II Estimation
 let euroMortality = 1.0; // base

 // Age (exponential contribution above 60)
 if (inputs.age > 60) euroMortality += Math.pow((inputs.age - 60) / 10, 1.3) * 0.8;

 // Gender
 if (inputs.gender === 'female') euroMortality += 0.2;

 // Renal impairment
 if (inputs.dialysis) euroMortality += 3.5;
 else if (inputs.creatinine > 2.0) euroMortality += 1.8;
 else if (inputs.creatinine > 1.5) euroMortality += 0.6;

 // Extracardiac arteriopathy
 if (inputs.extracardiacArteriopathy) euroMortality += 1.5;

 // Poor mobility
 if (inputs.poorMobility) euroMortality += 1.2;

 // Prior cardiac surgery
 if (inputs.priorCardiacSurgery) euroMortality += 2.5;

 // Chronic lung disease
 if (inputs.chronicLungDisease) euroMortality += 0.7;

 // Active endocarditis
 if (inputs.activeEndocarditis) euroMortality += 2.8;

 // Critical preop state
 if (inputs.criticalPreopState) euroMortality += 4.5;

 // NYHA
 if (inputs.nyhaClass === 3) euroMortality += 1.0;
 if (inputs.nyhaClass === 4) euroMortality += 2.5;

 // LV function
 if (inputs.lvef < 20) euroMortality += 3.0;
 else if (inputs.lvef < 30) euroMortality += 2.0;
 else if (inputs.lvef < 50) euroMortality += 0.8;

 // Pulmonary HTN
 if (inputs.paSystemolicPressure > 55) euroMortality += 1.8;
 else if (inputs.paSystemolicPressure > 30) euroMortality += 0.5;

 // Urgency
 if (inputs.urgency === 'urgent') euroMortality += 1.5;
 if (inputs.urgency === 'emergent') euroMortality += 4.0;
 if (inputs.urgency === 'salvage') euroMortality += 8.0;

 // Diabetes
 if (inputs.diabetes) euroMortality += 0.4;

 euroMortality = Math.min(50, Math.max(0.5, euroMortality));
 euroMortality = Math.round(euroMortality * 10) / 10;

 let euroCategory: string;
 if (euroMortality < 4) euroCategory = 'Low';
 else if (euroMortality < 8) euroCategory = 'Intermediate';
 else euroCategory = 'High/Prohibitive';

 // Combined recommendation
 let combinedRecommendation: string;
 let approachRecommendation: string;

 if (stsMortality < 4 && euroMortality < 4) {
 combinedRecommendation = 'Low surgical risk - both TAVR and SAVR are appropriate options';
 approachRecommendation = 'SAVR or TAVR based on anatomy, age, and patient preference. For age <65, SAVR may offer better long-term durability.';
 } else if (stsMortality >= 4 && stsMortality < 8) {
 combinedRecommendation = 'Intermediate surgical risk - Heart Team discussion recommended';
 approachRecommendation = 'Both TAVR and SAVR remain options. TAVR may be preferred for intermediate-risk patients >70 years. Heart Team should weigh individual factors.';
 } else {
 combinedRecommendation = 'High/Prohibitive surgical risk - TAVR preferred if anatomically suitable';
 approachRecommendation = 'TAVR is the preferred approach. SAVR carries prohibitive risk. Consider palliative pathway if not TAVR candidate.';
 }

 return {
 stsScore: stsMortality,
 stsCategory,
 euroScore: euroMortality,
 euroCategory,
 combinedRecommendation,
 approachRecommendation,
 };
  };

  const result = calculateRisk();

  const updateInput = (key: keyof ValveRiskInputs, value: any) => {
 setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-green-600 bg-green-50 border-green-200';
 case 'Intermediate': return 'text-amber-600 bg-amber-50 border-amber-200';
 case 'High/Prohibitive': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getRiskBarColor = (category: string) => {
 switch (category) {
 case 'Low': return 'bg-green-500';
 case 'Intermediate': return 'bg-amber-500';
 case 'High/Prohibitive': return 'bg-crimson-500';
 default: return 'bg-titanium-500';
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Calculator className="w-8 h-8 text-porsche-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">Valve Risk Score Calculator</h2>
 <p className="text-titanium-600">Combined STS Score & EuroSCORE II for Valve Surgery Risk Assessment</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input type="number" value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" min="18" max="120" />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Gender</label>
 <select value={inputs.gender} onChange={(e) => updateInput('gender', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value="male">Male</option><option value="female">Female</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Height (cm)</label>
 <input type="number" value={inputs.height}
 onChange={(e) => updateInput('height', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Weight (kg)</label>
 <input type="number" value={inputs.weight}
 onChange={(e) => updateInput('weight', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">LVEF (%)</label>
 <input type="number" value={inputs.lvef}
 onChange={(e) => updateInput('lvef', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" min="5" max="80" />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">NYHA Class</label>
 <select value={inputs.nyhaClass} onChange={(e) => updateInput('nyhaClass', parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value={1}>I</option><option value={2}>II</option>
 <option value={3}>III</option><option value={4}>IV</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Creatinine (mg/dL)</label>
 <input type="number" step="0.1" value={inputs.creatinine}
 onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">PA Systolic Pressure (mmHg)</label>
 <input type="number" value={inputs.paSystemolicPressure}
 onChange={(e) => updateInput('paSystemolicPressure', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500" />
 </div>
 <div className="col-span-2">
 <label className="block text-sm font-medium text-titanium-700 mb-2">Urgency</label>
 <select value={inputs.urgency} onChange={(e) => updateInput('urgency', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500">
 <option value="elective">Elective</option><option value="urgent">Urgent</option>
 <option value="emergent">Emergent</option><option value="salvage">Salvage</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 {[
 { key: 'diabetes', label: 'Diabetes Mellitus' },
 { key: 'dialysis', label: 'Dialysis' },
 { key: 'pulmonaryHTN', label: 'Pulmonary Hypertension' },
 { key: 'priorCardiacSurgery', label: 'Prior Cardiac Surgery' },
 { key: 'activeEndocarditis', label: 'Active Endocarditis' },
 { key: 'criticalPreopState', label: 'Critical Preoperative State' },
 { key: 'poorMobility', label: 'Poor Mobility / Frailty' },
 { key: 'chronicLungDisease', label: 'Chronic Lung Disease' },
 { key: 'extracardiacArteriopathy', label: 'Extracardiac Arteriopathy' },
 ].map(({ key, label }) => (
 <label key={key} className="flex items-center space-x-3 p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input type="checkbox"
 checked={inputs[key as keyof ValveRiskInputs] as boolean}
 onChange={(e) => updateInput(key as keyof ValveRiskInputs, e.target.checked)}
 className="rounded text-porsche-600" />
 <span className="text-sm font-medium text-titanium-700">{label}</span>
 </label>
 ))}
 </div>
 </div>

 <div className="space-y-6">
 {/* STS Score Result */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.stsCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Heart className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">STS Score</div>
 <div className="text-sm opacity-80">{result.stsCategory} Risk</div>
 </div>
 </div>
 <div className="mb-3">
 <div className="text-3xl font-bold">{result.stsScore}%</div>
 <div className="text-sm opacity-80">Predicted Operative Mortality</div>
 </div>
 <div className="w-full bg-white bg-opacity-50 rounded-full h-3 mb-2">
 <div className={`h-full rounded-full ${getRiskBarColor(result.stsCategory)}`}
 style={{width: `${Math.min(result.stsScore * 2, 100)}%`}} />
 </div>
 <div className="text-xs opacity-70">Scale: 0-50% (bars normalized to 50%)</div>
 </div>

 {/* EuroSCORE II Result */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.euroCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Shield className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">EuroSCORE II</div>
 <div className="text-sm opacity-80">{result.euroCategory} Risk</div>
 </div>
 </div>
 <div className="mb-3">
 <div className="text-3xl font-bold">{result.euroScore}%</div>
 <div className="text-sm opacity-80">Predicted Operative Mortality</div>
 </div>
 <div className="w-full bg-white bg-opacity-50 rounded-full h-3 mb-2">
 <div className={`h-full rounded-full ${getRiskBarColor(result.euroCategory)}`}
 style={{width: `${Math.min(result.euroScore * 2, 100)}%`}} />
 </div>
 <div className="text-xs opacity-70">Scale: 0-50% (bars normalized to 50%)</div>
 </div>

 {/* Combined Recommendation */}
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Activity className="w-5 h-5 text-porsche-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-porsche-800">
 <div className="font-semibold mb-1">Combined Assessment</div>
 <p className="mb-2">{result.combinedRecommendation}</p>
 <p className="text-xs">{result.approachRecommendation}</p>
 </div>
 </div>
 </div>

 {/* Risk Thresholds Reference */}
 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">Risk Thresholds</div>
 <div className="space-y-1 text-xs">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded bg-green-500"></div>
 Low Risk: STS &lt;4% - TAVR or SAVR
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded bg-amber-500"></div>
 Intermediate: STS 4-8% - Heart Team Discussion
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded bg-crimson-500"></div>
 High/Prohibitive: STS &gt;8% - TAVR Preferred
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
 <div className="flex items-start gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
 <div className="text-xs text-amber-800">
 <div className="font-semibold mb-1">Clinical Disclaimer</div>
 <p>These are estimated risk scores for educational purposes. Actual STS and EuroSCORE II calculations require the full validated algorithms. Always use the official calculators for clinical decision-making.</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
 <p className="text-xs text-red-800">
 <strong>Disclaimer:</strong> This calculator is for informational and educational purposes only. It is not intended to replace clinical judgment or serve as a substitute for professional medical evaluation. Risk scores should be interpreted in the context of individual patient characteristics by qualified healthcare providers. STS PROM and EuroSCORE II are validated surgical risk models. Heart Team discussion is recommended for all intermediate and high-risk patients per ACC/AHA guidelines.
 </p>
 </div>
 </div>
  );
};

export default ValveRiskScoreCalculator;
