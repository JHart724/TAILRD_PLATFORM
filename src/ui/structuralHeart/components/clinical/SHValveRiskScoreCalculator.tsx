import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, Info, Shield, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface SHValveRiskInputs {
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
  paSystolicPressure: number;
  priorCardiacSurgery: boolean;
  urgency: 'elective' | 'urgent' | 'emergent' | 'salvage';
  activeEndocarditis: boolean;
  criticalPreopState: boolean;
  poorMobility: boolean;
  chronicLungDisease: boolean;
  extracardiacArteriopathy: boolean;
  immunocompromised: boolean;
  procedureType: 'isolated_avr' | 'avr_cabg' | 'isolated_mvr' | 'mvr_cabg';
}

interface RiskResult {
  stsScore: number;
  stsCategory: string;
  euroScore: number;
  euroCategory: string;
  combinedRecommendation: string;
  approachRecommendation: string;
}

const SHValveRiskScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [inputs, setInputs] = useState<SHValveRiskInputs>({
 age: ctx?.age ?? 78, gender: ctx?.gender ?? 'male', height: ctx?.height ?? 172, weight: ctx?.weight ?? 76,
 lvef: ctx?.lvef ?? 45, nyhaClass: ctx?.nyhaClass ?? 3, creatinine: ctx?.creatinine ?? 1.4,
 diabetes: ctx?.diabetes ?? true, dialysis: ctx?.dialysis ?? false,
 pulmonaryHTN: false, paSystolicPressure: ctx?.paSystolicPressure ?? 38,
 priorCardiacSurgery: ctx?.priorCardiacSurgery ?? false, urgency: 'elective',
 activeEndocarditis: ctx?.activeEndocarditis ?? false, criticalPreopState: false,
 poorMobility: false, chronicLungDisease: ctx?.copd ?? false,
 extracardiacArteriopathy: ctx?.pvd ?? false, immunocompromised: false,
 procedureType: 'isolated_avr',
  });

  const calculateRisk = (): RiskResult => {
 // STS PROM Approximation
 let stsMortality = 1.0;

 // Procedure type base risk
 const procBaseRisk: Record<string, number> = {
 isolated_avr: 1.5, avr_cabg: 3.5, isolated_mvr: 2.5, mvr_cabg: 5.0,
 };
 stsMortality = procBaseRisk[inputs.procedureType] || 1.5;

 // Age contribution
 if (inputs.age > 70) stsMortality += (inputs.age - 70) * 0.3;
 if (inputs.age > 80) stsMortality += (inputs.age - 80) * 0.4;

 // Gender
 if (inputs.gender === 'female') stsMortality += 0.5;

 // LV function
 if (inputs.lvef < 50) stsMortality += 0.5;
 if (inputs.lvef < 40) stsMortality += 1.0;
 if (inputs.lvef < 30) stsMortality += 2.0;
 if (inputs.lvef < 20) stsMortality += 3.0;

 // NYHA class
 if (inputs.nyhaClass >= 3) stsMortality += 1.0;
 if (inputs.nyhaClass === 4) stsMortality += 2.0;

 // Renal function
 if (inputs.creatinine > 2.0) stsMortality += 2.0;
 if (inputs.dialysis) stsMortality += 4.0;

 // Comorbidities
 if (inputs.diabetes) stsMortality += 0.5;
 if (inputs.pulmonaryHTN) stsMortality += 1.5;
 if (inputs.paSystolicPressure > 55) stsMortality += 1.0;
 if (inputs.priorCardiacSurgery) stsMortality += 3.0;
 if (inputs.activeEndocarditis) stsMortality += 3.0;
 if (inputs.criticalPreopState) stsMortality += 4.0;
 if (inputs.poorMobility) stsMortality += 1.5;
 if (inputs.chronicLungDisease) stsMortality += 1.0;
 if (inputs.extracardiacArteriopathy) stsMortality += 1.5;
 if (inputs.immunocompromised) stsMortality += 1.0;

 // Urgency
 const urgencyMultiplier: Record<string, number> = { elective: 1.0, urgent: 1.5, emergent: 2.5, salvage: 5.0 };
 stsMortality *= urgencyMultiplier[inputs.urgency] || 1.0;

 stsMortality = Math.round(stsMortality * 10) / 10;

 // STS Category
 let stsCategory = 'Low';
 if (stsMortality >= 15) stsCategory = 'Prohibitive';
 else if (stsMortality >= 8) stsCategory = 'High';
 else if (stsMortality >= 4) stsCategory = 'Intermediate';

 // EuroSCORE II Approximation
 let euroMortality = 0.5;

 // Age (nonlinear contribution)
 if (inputs.age > 60) euroMortality += Math.pow((inputs.age - 60) / 10, 1.3) * 0.8;

 // Gender
 if (inputs.gender === 'female') euroMortality += 0.3;

 // Renal
 if (inputs.creatinine > 2.0) euroMortality += 1.5;
 if (inputs.dialysis) euroMortality += 3.5;

 // LV function
 if (inputs.lvef < 50) euroMortality += 0.5;
 if (inputs.lvef < 30) euroMortality += 2.0;
 if (inputs.lvef < 20) euroMortality += 3.5;

 // NYHA
 if (inputs.nyhaClass >= 3) euroMortality += 1.0;
 if (inputs.nyhaClass === 4) euroMortality += 1.5;

 // Risk factors
 if (inputs.diabetes) euroMortality += 0.5;
 if (inputs.pulmonaryHTN) euroMortality += 1.0;
 if (inputs.paSystolicPressure > 55) euroMortality += 1.5;
 if (inputs.priorCardiacSurgery) euroMortality += 2.5;
 if (inputs.activeEndocarditis) euroMortality += 2.5;
 if (inputs.criticalPreopState) euroMortality += 3.5;
 if (inputs.poorMobility) euroMortality += 1.0;
 if (inputs.chronicLungDisease) euroMortality += 0.8;
 if (inputs.extracardiacArteriopathy) euroMortality += 1.5;

 // Urgency
 euroMortality *= urgencyMultiplier[inputs.urgency] || 1.0;

 euroMortality = Math.round(euroMortality * 10) / 10;

 let euroCategory = 'Low';
 if (euroMortality >= 15) euroCategory = 'Prohibitive';
 else if (euroMortality >= 8) euroCategory = 'High';
 else if (euroMortality >= 4) euroCategory = 'Intermediate';

 // Combined approach recommendation (per 2020 ACC/AHA VHD Guideline)
 const avgRisk = (stsMortality + euroMortality) / 2;
 let combinedRecommendation: string;
 let approachRecommendation: string;

 if (avgRisk < 4) {
 combinedRecommendation = 'Low surgical risk. SAVR preferred for younger patients (<65 years). TAVR is reasonable for patients >65 with favorable anatomy.';
 approachRecommendation = 'Surgical AVR or TAVR per shared decision-making';
 } else if (avgRisk < 8) {
 combinedRecommendation = 'Intermediate surgical risk. Heart Team discussion recommended. Both TAVR and SAVR are appropriate options.';
 approachRecommendation = 'Heart Team: TAVR or SAVR based on anatomy, age, and patient preference';
 } else if (avgRisk < 15) {
 combinedRecommendation = 'High surgical risk. TAVR is preferred over SAVR if anatomically suitable. Evaluate frailty and comorbidity burden.';
 approachRecommendation = 'TAVR preferred if suitable anatomy; consider palliative care discussion';
 } else {
 combinedRecommendation = 'Prohibitive surgical risk. TAVR if anatomically feasible. Consider balloon aortic valvuloplasty as bridge or palliative medical management.';
 approachRecommendation = 'TAVR only if expected improvement in quality of life; otherwise medical/palliative management';
 }

 return { stsScore: stsMortality, stsCategory, euroScore: euroMortality, euroCategory, combinedRecommendation, approachRecommendation };
  };

  const result = calculateRisk();

  const getCategoryColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-[#2C4A60]';
 case 'Intermediate': return 'text-[#6B7280]';
 case 'High': return 'text-[#6B7280]';
 case 'Prohibitive': return 'text-red-400';
 default: return 'text-titanium-400';
 }
  };

  const getCategoryBg = (category: string) => {
 switch (category) {
 case 'Low': return 'bg-[#F0F5FA] border-[#C8D4DC]';
 case 'Intermediate': return 'bg-[#F0F5FA]/10 border-[#C8D4DC]/30';
 case 'High': return 'bg-bg-[#F0F5FA] border-[#C8D4DC]/30';
 case 'Prohibitive': return 'bg-red-500 border-red-500';
 default: return 'bg-white border-titanium-200';
 }
  };

  const updateInput = <K extends keyof SHValveRiskInputs>(field: K, value: SHValveRiskInputs[K]) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="space-y-6">
 <div className="metal-card rounded-2xl p-6 border border-porsche-400/20">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-porsche-400 to-porsche-600 flex items-center justify-center">
 <Calculator className="w-5 h-5 text-porsche-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-white font-sf">Structural Heart Operative Risk Assessment</h3>
 <p className="text-xs text-titanium-400 font-sf">STS PROM & EuroSCORE II Approximation for TAVR/SAVR Decision-Making</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Inputs */}
 <div className="metal-card rounded-2xl p-6 border border-titanium-200 space-y-4">
 <h4 className="text-sm font-semibold text-white font-sf flex items-center gap-2">
 <Heart className="w-4 h-4 text-porsche-400" /> Patient & Procedure Data
 </h4>

 {/* Procedure Type */}
 <div className="p-3 rounded-xl bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf mb-1 block">Procedure Type</label>
 <select
 value={inputs.procedureType}
 onChange={(e) => updateInput('procedureType', e.target.value as SHValveRiskInputs['procedureType'])}
 className="w-full bg-transparent text-white text-sm font-sf border-none outline-none"
 >
 <option value="isolated_avr" className="bg-gray-800">Isolated AVR</option>
 <option value="avr_cabg" className="bg-gray-800">AVR + CABG</option>
 <option value="isolated_mvr" className="bg-gray-800">Isolated MVR</option>
 <option value="mvr_cabg" className="bg-gray-800">MVR + CABG</option>
 </select>
 </div>

 {/* Numeric inputs */}
 <div className="grid grid-cols-2 gap-3">
 {[
 { key: 'age' as const, label: 'Age', unit: 'yrs', min: 18, max: 100, step: 1 },
 { key: 'lvef' as const, label: 'LVEF', unit: '%', min: 5, max: 75, step: 1 },
 { key: 'creatinine' as const, label: 'Creatinine', unit: 'mg/dL', min: 0.3, max: 12, step: 0.1 },
 { key: 'paSystolicPressure' as const, label: 'PA Systolic', unit: 'mmHg', min: 15, max: 100, step: 1 },
 { key: 'height' as const, label: 'Height', unit: 'cm', min: 100, max: 220, step: 1 },
 { key: 'weight' as const, label: 'Weight', unit: 'kg', min: 30, max: 200, step: 1 },
 ].map(({ key, label, unit, min, max, step }) => (
 <div key={key} className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf">{label}</label>
 <div className="flex items-baseline gap-1">
 <input type="number" value={inputs[key] as number}
 onChange={(e) => updateInput(key, parseFloat(e.target.value) || 0)}
 min={min} max={max} step={step}
 className="w-full bg-transparent text-white text-sm font-sf font-medium outline-none" />
 <span className="text-xs text-titanium-500">{unit}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Gender, NYHA, Urgency */}
 <div className="grid grid-cols-3 gap-3">
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">Gender</label>
 <select value={inputs.gender} onChange={(e) => updateInput('gender', e.target.value as 'male' | 'female')}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 <option value="male" className="bg-gray-800">Male</option>
 <option value="female" className="bg-gray-800">Female</option>
 </select>
 </div>
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">NYHA Class</label>
 <select value={inputs.nyhaClass} onChange={(e) => updateInput('nyhaClass', parseInt(e.target.value) as 1 | 2 | 3 | 4)}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 {[1, 2, 3, 4].map(c => <option key={c} value={c} className="bg-gray-800">Class {c}</option>)}
 </select>
 </div>
 <div className="p-2 rounded-lg bg-white border border-titanium-200">
 <label className="text-xs text-titanium-400 font-sf block mb-1">Urgency</label>
 <select value={inputs.urgency} onChange={(e) => updateInput('urgency', e.target.value as SHValveRiskInputs['urgency'])}
 className="w-full bg-transparent text-white text-xs font-sf outline-none">
 {['elective', 'urgent', 'emergent', 'salvage'].map(u => <option key={u} value={u} className="bg-gray-800">{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
 </select>
 </div>
 </div>

 {/* Checkboxes */}
 <div className="space-y-1.5">
 <h5 className="text-xs font-semibold text-titanium-400 font-sf uppercase tracking-wider">Risk Factors</h5>
 {[
 { key: 'diabetes' as const, label: 'Diabetes mellitus' },
 { key: 'dialysis' as const, label: 'Dialysis-dependent' },
 { key: 'pulmonaryHTN' as const, label: 'Pulmonary hypertension' },
 { key: 'priorCardiacSurgery' as const, label: 'Prior cardiac surgery (redo)' },
 { key: 'activeEndocarditis' as const, label: 'Active endocarditis' },
 { key: 'criticalPreopState' as const, label: 'Critical preoperative state' },
 { key: 'poorMobility' as const, label: 'Poor mobility / frailty' },
 { key: 'chronicLungDisease' as const, label: 'Chronic lung disease' },
 { key: 'extracardiacArteriopathy' as const, label: 'Extracardiac arteriopathy (PVD/CVD)' },
 { key: 'immunocompromised' as const, label: 'Immunocompromised' },
 ].map(({ key, label }) => (
 <label key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
 inputs[key] ? 'bg-bg-[#F0F5FA] border-[#C8D4DC]/30' : 'bg-white border-titanium-200 hover:border-titanium-200'
 }`}>
 <input type="checkbox" checked={inputs[key] as boolean} onChange={(e) => updateInput(key, e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
 <span className="text-xs text-titanium-300 font-sf">{label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Results */}
 <div className="space-y-4">
 {/* STS Score */}
 <div className={`metal-card rounded-2xl p-5 border ${getCategoryBg(result.stsCategory)}`}>
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-sm font-semibold text-white font-sf">STS PROM Estimate</h4>
 <span className={`text-xs font-bold uppercase ${getCategoryColor(result.stsCategory)}`}>{result.stsCategory} Risk</span>
 </div>
 <div className="text-3xl font-bold text-white font-sf mb-2">{result.stsScore}%</div>
 <div className="w-full bg-titanium-800 rounded-full h-2">
 <div className="h-2 rounded-full transition-all duration-500"
 style={{ width: `${Math.min(result.stsScore / 20 * 100, 100)}%`,
 background: result.stsScore < 4 ? '#2C4A60' : result.stsScore < 8 ? '#6B7280' : result.stsScore < 15 ? '#7A1A2E' : '#ef4444' }} />
 </div>
 <div className="flex justify-between text-xs text-titanium-500 mt-1">
 <span>Low (&lt;4%)</span><span>Inter (4-8%)</span><span>High (8-15%)</span><span>Prohib (&gt;15%)</span>
 </div>
 </div>

 {/* EuroSCORE */}
 <div className={`metal-card rounded-2xl p-5 border ${getCategoryBg(result.euroCategory)}`}>
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-sm font-semibold text-white font-sf">EuroSCORE II Estimate</h4>
 <span className={`text-xs font-bold uppercase ${getCategoryColor(result.euroCategory)}`}>{result.euroCategory} Risk</span>
 </div>
 <div className="text-3xl font-bold text-white font-sf mb-2">{result.euroScore}%</div>
 <div className="w-full bg-titanium-800 rounded-full h-2">
 <div className="h-2 rounded-full transition-all duration-500"
 style={{ width: `${Math.min(result.euroScore / 20 * 100, 100)}%`,
 background: result.euroScore < 4 ? '#2C4A60' : result.euroScore < 8 ? '#6B7280' : result.euroScore < 15 ? '#7A1A2E' : '#ef4444' }} />
 </div>
 </div>

 {/* Approach Recommendation */}
 <div className="metal-card rounded-2xl p-5 border border-titanium-200">
 <h4 className="text-sm font-semibold text-white font-sf mb-3 flex items-center gap-2">
 <Shield className="w-4 h-4 text-porsche-400" /> TAVR vs. SAVR Recommendation
 </h4>
 <p className="text-sm text-titanium-300 font-sf mb-3">{result.combinedRecommendation}</p>
 <div className="p-3 rounded-xl bg-porsche-500/10 border border-porsche-500/20">
 <p className="text-xs font-medium text-porsche-300 font-sf">{result.approachRecommendation}</p>
 </div>
 </div>

 {/* Key Thresholds */}
 <div className="metal-card rounded-2xl p-4 border border-titanium-200">
 <h4 className="text-xs font-semibold text-titanium-400 mb-3 uppercase tracking-wider">2020 ACC/AHA VHD Guideline Thresholds</h4>
 <div className="space-y-2 text-xs">
 {[
 { range: 'STS < 4%', rec: 'Low risk: SAVR or TAVR', color: 'text-[#2C4A60]' },
 { range: 'STS 4-8%', rec: 'Intermediate: Heart Team shared decision', color: 'text-[#6B7280]' },
 { range: 'STS > 8%', rec: 'High risk: TAVR preferred', color: 'text-[#6B7280]' },
 { range: 'STS > 15% or prohibitive', rec: 'TAVR if feasible, or medical/palliative', color: 'text-red-400' },
 ].map(({ range, rec, color }) => (
 <div key={range} className="flex items-start gap-2">
 <span className={`font-mono font-medium ${color} w-24 flex-shrink-0`}>{range}</span>
 <span className="text-titanium-300">{rec}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="metal-card rounded-xl p-3 border border-titanium-200">
 <p className="text-xs text-titanium-500 text-center font-sf">
 Approximation only \u2014 validated STS PROM and EuroSCORE II use proprietary regression models with 60+ variables.
 2020 ACC/AHA Valvular Heart Disease Guideline | 2021 ESC/EACTS Valve Guidelines | STS Adult Cardiac Surgery Database.
 </p>
 </div>
 </div>
  );
};

export default SHValveRiskScoreCalculator;
