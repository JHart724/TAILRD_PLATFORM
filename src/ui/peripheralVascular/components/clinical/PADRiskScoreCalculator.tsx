import React, { useState } from 'react';
import { Calculator, Activity, Heart, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface PADRiskInputs {
  age: number; gender: 'male' | 'female'; ankleIndex: number; toePressure: number;
  restPain: boolean; tissueLoss: boolean; gangrene: boolean; claudication: boolean;
  walkingDistance: number; diabetes: boolean; smoking: 'never' | 'former' | 'current';
  hypertension: boolean; hyperlipidemia: boolean; creatinine: number;
  priorRevascularization: boolean; cad: boolean;
}

interface RiskResult {
  abiAssessment: { category: string; severity: string; interpretation: string; color: string };
  fontaineStage: { stage: string; description: string; management: string; color: string };
  rutherfordCategory: { category: number; grade: number; description: string; management: string; color: string };
  combinedRisk: string; managementRecommendations: string[]; amputationRisk: string; fiveYearMortalityEstimate: string;
}

const PADRiskScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<PADRiskInputs>({
 age: patientData?.age ?? 65,
 gender: patientData?.gender ?? 'male',
 ankleIndex: 0.65,
 toePressure: 40,
 restPain: false,
 tissueLoss: false,
 gangrene: false,
 claudication: true,
 walkingDistance: 150,
 diabetes: patientData?.diabetes ?? true,
 smoking: 'former',
 hypertension: patientData?.hypertension ?? true,
 hyperlipidemia: true,
 creatinine: patientData?.creatinine ?? 1.3,
 priorRevascularization: false,
 cad: patientData?.cad ?? false,
  });
  const [result, setResult] = useState<RiskResult | null>(null);
  const BULLET = '\u2022';

  const calculateRisk = (): RiskResult => {
 let abiCat: string, abiSev: string, abiInterp: string, abiColor: string;
 if (inputs.ankleIndex > 1.3) { abiCat = 'Non-compressible'; abiSev = 'Indeterminate'; abiInterp = 'Non-compressible vessels (medial calcification). ABI unreliable - use TBI or PVR.'; abiColor = 'text-porsche-600 bg-porsche-50 border-porsche-200'; }
 else if (inputs.ankleIndex >= 1.0) { abiCat = 'Normal'; abiSev = 'Normal'; abiInterp = 'Normal arterial perfusion. No hemodynamically significant PAD.'; abiColor = 'text-green-600 bg-green-50 border-green-200'; }
 else if (inputs.ankleIndex >= 0.9) { abiCat = 'Borderline'; abiSev = 'Borderline'; abiInterp = 'Borderline result. Consider exercise ABI for unmasking.'; abiColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else if (inputs.ankleIndex >= 0.7) { abiCat = 'Mild PAD'; abiSev = 'Mild'; abiInterp = 'Mild PAD. Symptom-directed management with risk factor optimization.'; abiColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else if (inputs.ankleIndex >= 0.4) { abiCat = 'Moderate PAD'; abiSev = 'Moderate'; abiInterp = 'Moderate PAD. Structured exercise program and medical optimization.'; abiColor = 'text-crimson-600 bg-crimson-50 border-crimson-200'; }
 else { abiCat = 'Severe PAD / CLI'; abiSev = 'Severe'; abiInterp = 'Severe PAD consistent with critical limb ischemia. Urgent vascular evaluation.'; abiColor = 'text-red-700 bg-red-50 border-red-200'; }

 let fStage: string, fDesc: string, fMgmt: string, fColor: string;
 if (inputs.gangrene || (inputs.tissueLoss && inputs.ankleIndex < 0.4)) { fStage = 'IV'; fDesc = 'Gangrene / tissue necrosis'; fMgmt = 'Urgent revascularization, wound care, amputation risk assessment'; fColor = 'text-red-700 bg-red-50 border-red-200'; }
 else if (inputs.tissueLoss || (inputs.restPain && inputs.ankleIndex < 0.5)) { fStage = 'III-IV'; fDesc = 'Rest pain with tissue loss'; fMgmt = 'Revascularization evaluation, pain management, wound care referral'; fColor = 'text-crimson-600 bg-crimson-50 border-crimson-200'; }
 else if (inputs.restPain) { fStage = 'III'; fDesc = 'Ischemic rest pain'; fMgmt = 'Urgent vascular referral, revascularization assessment, optimize perfusion'; fColor = 'text-crimson-600 bg-crimson-50 border-crimson-200'; }
 else if (inputs.claudication && inputs.walkingDistance < 200) { fStage = 'IIb'; fDesc = 'Moderate-severe claudication (< 200m)'; fMgmt = 'Supervised exercise therapy, cilostazol, consider revascularization'; fColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else if (inputs.claudication) { fStage = 'IIa'; fDesc = 'Mild claudication (> 200m)'; fMgmt = 'Risk factor modification, supervised exercise, medical therapy'; fColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else { fStage = 'I'; fDesc = 'Asymptomatic PAD'; fMgmt = 'Risk factor optimization, annual ABI monitoring, exercise'; fColor = 'text-green-600 bg-green-50 border-green-200'; }

 let rCat: number, rGrade: number, rDesc: string, rMgmt: string, rColor: string;
 if (inputs.gangrene) { rCat = 6; rGrade = 3; rDesc = 'Major tissue loss - Functional foot unsalvageable'; rMgmt = 'Major amputation likely, vascular surgery consultation'; rColor = 'text-red-700 bg-red-50 border-red-200'; }
 else if (inputs.tissueLoss) { rCat = 5; rGrade = 3; rDesc = 'Minor tissue loss - Non-healing ulcer, focal gangrene'; rMgmt = 'Revascularization for limb salvage, wound care'; rColor = 'text-crimson-600 bg-crimson-50 border-crimson-200'; }
 else if (inputs.restPain) { rCat = 4; rGrade = 2; rDesc = 'Ischemic rest pain'; rMgmt = 'Revascularization evaluation, hemodynamic assessment'; rColor = 'text-crimson-600 bg-crimson-50 border-crimson-200'; }
 else if (inputs.claudication && inputs.walkingDistance < 100) { rCat = 3; rGrade = 1; rDesc = 'Severe claudication'; rMgmt = 'Supervised exercise + revascularization consideration'; rColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else if (inputs.claudication && inputs.walkingDistance < 200) { rCat = 2; rGrade = 1; rDesc = 'Moderate claudication'; rMgmt = 'Supervised exercise therapy, medical optimization'; rColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else if (inputs.claudication) { rCat = 1; rGrade = 1; rDesc = 'Mild claudication'; rMgmt = 'Exercise therapy, risk factor management'; rColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
 else { rCat = 0; rGrade = 0; rDesc = 'Asymptomatic'; rMgmt = 'Risk factor modification, monitoring'; rColor = 'text-green-600 bg-green-50 border-green-200'; }

 const rf = [inputs.diabetes, inputs.smoking !== 'never', inputs.hypertension, inputs.cad, inputs.creatinine > 1.5, inputs.age > 70, inputs.priorRevascularization, inputs.ankleIndex < 0.5].filter(Boolean).length;
 const combinedRisk = rf >= 5 ? 'Very High Cardiovascular Risk' : rf >= 3 ? 'High Cardiovascular Risk' : rf >= 1 ? 'Moderate Cardiovascular Risk' : 'Low Cardiovascular Risk';
 const amputationRisk = (inputs.gangrene || inputs.tissueLoss) && inputs.diabetes && inputs.ankleIndex < 0.4 ? 'High (>30% 1-year)' : inputs.restPain || inputs.tissueLoss ? 'Moderate (10-30% 1-year)' : inputs.claudication && inputs.ankleIndex < 0.5 ? 'Low-Moderate (5-10% 5-year)' : 'Low (<5% 5-year)';
 const fiveYearMort = rf >= 5 ? '40-60%' : rf >= 3 ? '25-40%' : rf >= 1 ? '10-25%' : '<10%';
 const recs: string[] = [];
 if (inputs.ankleIndex < 0.4 || inputs.restPain || inputs.tissueLoss || inputs.gangrene) recs.push('Urgent vascular surgery consultation for revascularization');
 if (inputs.diabetes) recs.push('Multidisciplinary diabetic foot care, HbA1c target <7%');
 if (inputs.smoking === 'current') recs.push('Immediate smoking cessation program (NRT + counseling)');
 if (inputs.claudication) recs.push('Supervised exercise therapy (3x/week, 30-45 min sessions)');
 recs.push('High-intensity statin therapy (atorvastatin 40-80mg)');
 recs.push('Antiplatelet therapy (aspirin 81mg or clopidogrel 75mg)');
 if (inputs.hypertension) recs.push('BP target < 130/80 mmHg, prefer ACE-I/ARB');
 if (inputs.ankleIndex > 1.3) recs.push('Non-compressible vessels: Obtain toe-brachial index and PVR');
 if (inputs.cad) recs.push('Dual antiplatelet consideration, cardiology co-management');
 return {
 abiAssessment: { category: abiCat, severity: abiSev, interpretation: abiInterp, color: abiColor },
 fontaineStage: { stage: fStage, description: fDesc, management: fMgmt, color: fColor },
 rutherfordCategory: { category: rCat, grade: rGrade, description: rDesc, management: rMgmt, color: rColor },
 combinedRisk, managementRecommendations: recs, amputationRisk, fiveYearMortalityEstimate: fiveYearMort,
 };
  };
  const updateInput = (key: keyof PADRiskInputs, value: any) => setInputs(prev => ({ ...prev, [key]: value }));

  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><Calculator className="w-6 h-6 text-porsche-600" /></div>
 <div><h3 className="text-lg font-bold text-titanium-900 font-sf">PAD Risk Score Calculator</h3>
 <p className="text-sm text-titanium-500">Combined ABI Assessment + Fontaine + Rutherford Staging</p></div>
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-4">
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Hemodynamic Data</h4>
 <div className="grid grid-cols-2 gap-3">
 {[{k:'ankleIndex',l:'Ankle-Brachial Index',s:0.01,mn:0,mx:2},{k:'toePressure',l:'Toe Pressure (mmHg)',s:1,mn:0,mx:200},{k:'walkingDistance',l:'Walking Distance (m)',s:10,mn:0,mx:2000},{k:'age',l:'Age (years)',s:1,mn:18,mx:120},{k:'creatinine',l:'Creatinine (mg/dL)',s:0.1,mn:0.3,mx:15}].map(({k,l,s,mn,mx}) => (
 <div key={k}><label className="text-xs text-titanium-600">{l}</label>
 <input type="number" step={s} min={mn} max={mx} value={inputs[k as keyof PADRiskInputs] as number} onChange={e => updateInput(k as keyof PADRiskInputs, parseFloat(e.target.value)||0)} className="input-liquid w-full text-sm mt-0.5" /></div>))}
 <div><label className="text-xs text-titanium-600">Gender</label>
 <select value={inputs.gender} onChange={e => updateInput('gender', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="male">Male</option><option value="female">Female</option></select></div>
 <div><label className="text-xs text-titanium-600">Smoking Status</label>
 <select value={inputs.smoking} onChange={e => updateInput('smoking', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="never">Never</option><option value="former">Former</option><option value="current">Current</option></select></div>
 </div>
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Heart className="w-4 h-4" /> Clinical Findings & History</h4>
 <div className="grid grid-cols-2 gap-2">
 {(['restPain','tissueLoss','gangrene','claudication','diabetes','hypertension','hyperlipidemia','priorRevascularization','cad'] as const).map(key => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key]} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>))}
 </div>
 </div>
 <button onClick={() => setResult(calculateRisk())} className="btn-liquid-primary w-full flex items-center justify-center gap-2">
 <Calculator className="w-5 h-5" /> Calculate PAD Risk Score
 </button>
 </div>
 <div className="space-y-4">
 {result ? (<>
 <div className={`metal-card p-4 border-2 ${result.abiAssessment.color}`}>
 <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5" /><h4 className="font-semibold">ABI Assessment</h4></div>
 <div className="text-xl font-bold mb-1">{result.abiAssessment.category}</div>
 <div className="text-xs">{result.abiAssessment.interpretation}</div>
 </div>
 <div className={`metal-card p-4 border-2 ${result.fontaineStage.color}`}>
 <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5" /><h4 className="font-semibold">Fontaine Stage {result.fontaineStage.stage}</h4></div>
 <div className="text-sm font-medium mb-1">{result.fontaineStage.description}</div>
 <div className="text-xs">{result.fontaineStage.management}</div>
 </div>
 <div className={`metal-card p-4 border-2 ${result.rutherfordCategory.color}`}>
 <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" /><h4 className="font-semibold">Rutherford {result.rutherfordCategory.grade}-{result.rutherfordCategory.category}</h4></div>
 <div className="text-sm font-medium mb-1">{result.rutherfordCategory.description}</div>
 <div className="text-xs">{result.rutherfordCategory.management}</div>
 </div>
 <div className="metal-card p-4 border border-titanium-300">
 <div className="text-xs text-titanium-500 mb-1">Combined CV Risk</div>
 <div className="font-bold text-titanium-900 text-sm">{result.combinedRisk}</div>
 <div className="grid grid-cols-2 gap-2 mt-2">
 <div><div className="text-xs text-titanium-500">Amputation Risk</div><div className="text-xs font-semibold text-crimson-600">{result.amputationRisk}</div></div>
 <div><div className="text-xs text-titanium-500">5-Year Mortality</div><div className="text-xs font-semibold text-titanium-800">{result.fiveYearMortalityEstimate}</div></div>
 </div>
 </div>
 <div className="metal-card p-4 bg-porsche-50/30 border border-porsche-200">
 <div className="flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-porsche-600" /><h4 className="text-sm font-semibold text-titanium-900">Management Recommendations</h4></div>
 <ul className="space-y-1">{result.managementRecommendations.map((r) => (<li key={r} className="text-xs text-titanium-700 flex items-start gap-1"><span className="text-porsche-500 mt-0.5">{BULLET}</span>{r}</li>))}</ul>
 </div>
 </>) : (
 <div className="metal-card p-6 text-center text-titanium-500">
 <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
 <p className="text-sm">Enter patient data and click Calculate to see ABI, Fontaine, and Rutherford classifications</p>
 </div>
 )}
 </div>
 </div>
 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Guidelines:</strong> 2024 ACC/AHA PAD Guideline; WIfI Classification System; Rutherford Classification; TASC II Scoring.
 </p>
 </div>
 <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
 <p className="text-xs text-red-800">
 <strong>Disclaimer:</strong> This calculator is for informational and educational purposes only. It is not intended to replace clinical judgment or serve as a substitute for professional medical evaluation. Risk scores should be interpreted in the context of individual patient characteristics by qualified healthcare providers. WIfI, Rutherford, and TASC classifications assist in PAD risk stratification. Management decisions should integrate clinical assessment and vascular laboratory data.
 </p>
 </div>
 </div>
  );
};
export default PADRiskScoreCalculator;
