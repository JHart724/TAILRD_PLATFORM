import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface CHADSVAScInputs {
  hasCongestiveHF: boolean;
  hasHypertension: boolean;
  age: number;
  hasDiabetes: boolean;
  hasStrokeTIAEmbolism: boolean;
  hasVascularDisease: boolean;
  isFemale: boolean;
}

interface CHADSVAScResult {
  score: number;
  annualStrokeRisk: number;
  riskCategory: 'Low' | 'Low-Moderate' | 'Moderate' | 'High';
  anticoagulationRecommendation: string;
  interpretation: string;
}

const EPCHADSVAScCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<CHADSVAScInputs>({
 hasCongestiveHF: patientData?.chf ?? false,
 hasHypertension: patientData?.hypertension ?? false,
 age: patientData?.age ?? 65,
 hasDiabetes: patientData?.diabetes ?? false,
 hasStrokeTIAEmbolism: (patientData?.priorStroke || patientData?.priorTIA) ?? false,
 hasVascularDisease: (patientData?.pvd || patientData?.priorMI || patientData?.cad) ?? false,
 isFemale: patientData?.gender === 'female',
  });

  const calculateCHADSVASc = (): CHADSVAScResult => {
 let score = 0;

 if (inputs.hasCongestiveHF) score += 1;
 if (inputs.hasHypertension) score += 1;
 if (inputs.age >= 75) score += 2;
 else if (inputs.age >= 65) score += 1;
 if (inputs.hasDiabetes) score += 1;
 if (inputs.hasStrokeTIAEmbolism) score += 2;
 if (inputs.hasVascularDisease) score += 1;
 if (inputs.isFemale) score += 1;

 const strokeRiskTable: Record<number, number> = {
 0: 0.0, 1: 1.3, 2: 2.2, 3: 3.2, 4: 4.0,
 5: 6.7, 6: 9.8, 7: 9.6, 8: 6.7, 9: 15.2,
 };

 const annualStrokeRisk = strokeRiskTable[Math.min(score, 9)] ?? 15.2;

 // Sex-adjusted thresholds per 2020 ESC / 2023 ACC/AHA AF Guidelines
 const adjustedScore = inputs.isFemale ? score - 1 : score;

 let riskCategory: CHADSVAScResult['riskCategory'];
 let anticoagulationRecommendation: string;
 let interpretation: string;

 if (adjustedScore === 0) {
 riskCategory = 'Low';
 anticoagulationRecommendation = 'No antithrombotic therapy recommended. Reassess risk factors periodically.';
 interpretation = 'Low stroke risk. Anticoagulation not indicated based on CHA\u2082DS\u2082-VASc alone.';
 } else if (adjustedScore === 1) {
 riskCategory = 'Low-Moderate';
 anticoagulationRecommendation = 'Oral anticoagulation should be considered (Class IIa). Shared decision-making recommended. Assess bleeding risk with HAS-BLED.';
 interpretation = 'Low-moderate stroke risk. Consider OAC based on net clinical benefit vs. bleeding risk assessment.';
 } else {
 riskCategory = score >= 5 ? 'High' : 'Moderate';
 anticoagulationRecommendation = 'Oral anticoagulation is recommended (Class I). DOAC preferred over warfarin unless mechanical valve or moderate-severe mitral stenosis.';
 interpretation = `${riskCategory} stroke risk. Annual stroke rate ~${annualStrokeRisk}%. Anticoagulation clearly indicated unless contraindicated.`;
 }

 return { score, annualStrokeRisk, riskCategory, anticoagulationRecommendation, interpretation };
  };

  const result = calculateCHADSVASc();

  const getRiskColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-[#2C4A60]';
 case 'Low-Moderate': return 'text-[#6B7280]';
 case 'Moderate': return 'text-[#6B7280]';
 case 'High': return 'text-red-400';
 default: return 'text-titanium-400';
 }
  };

  const getRiskBg = (category: string) => {
 switch (category) {
 case 'Low': return 'bg-[#F0F5FA] border-[#C8D4DC]';
 case 'Low-Moderate': return 'bg-[#F0F5FA]/10 border-[#C8D4DC]/30';
 case 'Moderate': return 'bg-bg-[#F0F5FA] border-[#C8D4DC]/30';
 case 'High': return 'bg-red-500 border-red-500';
 default: return 'bg-titanium-500 border-titanium-500';
 }
  };

  const updateInput = (field: keyof CHADSVAScInputs, value: boolean | number) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  const checkboxFields: { key: keyof CHADSVAScInputs; label: string; points: string; description: string }[] = [
 { key: 'hasCongestiveHF', label: 'Congestive Heart Failure', points: '+1', description: 'LV systolic dysfunction or symptomatic HF' },
 { key: 'hasHypertension', label: 'Hypertension', points: '+1', description: 'Resting BP > 140/90 mmHg or on antihypertensive therapy' },
 { key: 'hasDiabetes', label: 'Diabetes Mellitus', points: '+1', description: 'Fasting glucose \u2265 126 mg/dL or on hypoglycemic therapy' },
 { key: 'hasStrokeTIAEmbolism', label: 'Stroke / TIA / Thromboembolism', points: '+2', description: 'Prior stroke, transient ischemic attack, or systemic embolism' },
 { key: 'hasVascularDisease', label: 'Vascular Disease', points: '+1', description: 'Prior MI, peripheral arterial disease, or aortic plaque' },
 { key: 'isFemale', label: 'Female Sex', points: '+1', description: 'Sex category modifier (not counted alone for OAC indication)' },
  ];

  return (
 <div className="space-y-6">
 <div className="metal-card rounded-2xl p-6 border border-porsche-400/20">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-porsche-400 to-porsche-600 flex items-center justify-center">
 <Calculator className="w-5 h-5 text-porsche-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-white font-sf">CHA\u2082DS\u2082-VASc Score Calculator</h3>
 <p className="text-xs text-titanium-400 font-sf">Atrial Fibrillation Stroke Risk Assessment</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Risk Factor Inputs */}
 <div className="metal-card rounded-2xl p-6 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-4 flex items-center gap-2">
 <Heart className="w-4 h-4 text-porsche-400" />
 Risk Factors
 </h4>

 <div className="mb-4 p-3 rounded-xl bg-white border border-titanium-200">
 <div className="flex items-center justify-between mb-2">
 <label className="text-sm font-medium text-titanium-300 font-sf">
 Age: {inputs.age} years
 <span className="ml-2 text-xs text-porsche-400">
 {inputs.age >= 75 ? '(+2)' : inputs.age >= 65 ? '(+1)' : '(+0)'}
 </span>
 </label>
 </div>
 <input
 type="range"
 min={18}
 max={100}
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value))}
 className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-titanium-700 accent-porsche-500"
 />
 <div className="flex justify-between text-xs text-titanium-500 mt-1">
 <span>18</span>
 <span className="text-titanium-400">65-74: +1 | \u226575: +2</span>
 <span>100</span>
 </div>
 </div>

 <div className="space-y-2">
 {checkboxFields.map(({ key, label, points, description }) => (
 <label
 key={key}
 className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
 inputs[key] ? 'bg-porsche-500/10 border-porsche-500/30' : 'bg-white border-titanium-200 hover:border-titanium-200'
 }`}
 >
 <input
 type="checkbox"
 checked={inputs[key] as boolean}
 onChange={(e) => updateInput(key, e.target.checked)}
 className="mt-1 w-4 h-4 rounded accent-porsche-500"
 />
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-white font-sf">{label}</span>
 <span className="text-xs font-bold text-porsche-400">{points}</span>
 </div>
 <span className="text-xs text-titanium-400">{description}</span>
 </div>
 </label>
 ))}
 </div>
 </div>

 {/* Results */}
 <div className="space-y-4">
 <div className={`metal-card rounded-2xl p-6 border ${getRiskBg(result.riskCategory)}`}>
 <div className="text-center mb-4">
 <div className="text-5xl font-bold text-white font-sf mb-1">{result.score}</div>
 <div className="text-sm text-titanium-400 font-sf">of 9 possible points</div>
 <div className={`text-lg font-semibold mt-2 ${getRiskColor(result.riskCategory)}`}>
 {result.riskCategory} Risk
 </div>
 </div>

 <div className="w-full bg-titanium-800 rounded-full h-3 mb-4">
 <div
 className="h-3 rounded-full transition-all duration-500"
 style={{
 width: `${(result.score / 9) * 100}%`,
 background: result.score === 0 ? '#2C4A60' : result.score <= 1 ? '#6B7280' : result.score <= 4 ? '#7A1A2E' : '#ef4444'
 }}
 />
 </div>

 <div className="grid grid-cols-4 gap-1 text-center text-xs">
 <div className="text-[#2C4A60]">Low (0)</div>
 <div className="text-[#6B7280]">Low-Mod (1)</div>
 <div className="text-[#6B7280]">Mod (2-4)</div>
 <div className="text-red-400">High (5-9)</div>
 </div>
 </div>

 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-[#6B7280]" />
 Annual Stroke Risk
 </h4>
 <div className="text-2xl font-bold text-white font-sf">
 {result.annualStrokeRisk}%<span className="text-sm font-normal text-titanium-400"> / year</span>
 </div>
 </div>

 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Shield className="w-4 h-4 text-porsche-400" />
 Anticoagulation Recommendation
 </h4>
 <div className="flex items-start gap-2">
 {result.riskCategory === 'Low' ? (
 <CheckCircle className="w-5 h-5 text-[#2C4A60] mt-0.5 flex-shrink-0" />
 ) : (
 <Info className="w-5 h-5 text-porsche-400 mt-0.5 flex-shrink-0" />
 )}
 <p className="text-sm text-titanium-300 font-sf">{result.anticoagulationRecommendation}</p>
 </div>
 </div>

 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Info className="w-4 h-4 text-chrome-400" />
 Clinical Interpretation
 </h4>
 <p className="text-sm text-titanium-300 font-sf">{result.interpretation}</p>
 </div>

 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-xs font-semibold text-titanium-400 font-sf mb-2 uppercase tracking-wider">Score Reference</h4>
 <div className="grid grid-cols-2 gap-1 text-xs">
 {[
 { s: 0, r: '0.0%' }, { s: 1, r: '1.3%' }, { s: 2, r: '2.2%' }, { s: 3, r: '3.2%' },
 { s: 4, r: '4.0%' }, { s: 5, r: '6.7%' }, { s: 6, r: '9.8%' }, { s: 7, r: '9.6%' },
 { s: 8, r: '6.7%' }, { s: 9, r: '15.2%' },
 ].map(({ s, r }) => (
 <div key={s} className={`flex justify-between px-2 py-1 rounded ${result.score === s ? 'bg-porsche-500/20 text-porsche-300' : 'text-titanium-400'}`}>
 <span>Score {s}:</span><span className="font-mono">{r}/yr</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="metal-card rounded-xl p-3 border border-titanium-200">
 <p className="text-xs text-titanium-500 text-center font-sf">
 CHA\u2082DS\u2082-VASc: Lip GYH et al. Chest 2010; 137:263-272 | 2020 ESC AF Guidelines | 2023 ACC/AHA/ACCP/HRS AF Guideline.
 Female sex alone does not independently warrant anticoagulation.
 </p>
 </div>
 </div>
  );
};

export default EPCHADSVAScCalculator;
