import React, { useState } from 'react';
import { Activity, Search, AlertTriangle, Zap, Heart, Flame } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface PADPhenotypeInputs {
  age: number;
  gender: string;
  ankleIndex: number;
  toePressure: number;
  restPain: boolean;
  tissueLoss: boolean;
  gangrene: boolean;
  claudication: boolean;
  walkingDistance: number;
  diabetes: boolean;
  diabeticNeuropathy: boolean;
  diabeticFoot: boolean;
  smokingStatus: 'never' | 'former' | 'current';
  crp: number;
  esr: number;
  renalInsufficiency: boolean;
  dialysis: boolean;
  aortoiliacDisease: boolean;
  femoropoplitealDisease: boolean;
  infrapoplitealDisease: boolean;
}

interface PhenotypeResult {
  name: string;
  risk: string;
  probability: number;
  recommendations: string[];
}

interface ClassificationResult {
  phenotypes: PhenotypeResult[];
  combinedProfile: string;
}

const PADPhenotypeClassification: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<PADPhenotypeInputs>({
 age: patientData?.age ?? 62,
 gender: patientData?.gender ?? 'male',
 ankleIndex: 0.65,
 toePressure: 40,
 restPain: false,
 tissueLoss: false,
 gangrene: false,
 claudication: true,
 walkingDistance: 150,
 diabetes: patientData?.diabetes ?? true,
 diabeticNeuropathy: false,
 diabeticFoot: false,
 smokingStatus: 'former',
 crp: 3.2,
 esr: 22,
 renalInsufficiency: false,
 dialysis: patientData?.dialysis ?? false,
 aortoiliacDisease: false,
 femoropoplitealDisease: true,
 infrapoplitealDisease: false,
  });
  const [results, setResults] = useState<ClassificationResult | null>(null);

  const classifyPhenotypes = (): ClassificationResult => {
 const phenotypes: PhenotypeResult[] = [];

 // 1. Critical Limb Ischemia (CLI)
 const cliFactors = [
 inputs.restPain, inputs.tissueLoss, inputs.gangrene,
 inputs.ankleIndex < 0.4, inputs.toePressure < 30,
 inputs.walkingDistance < 50 && inputs.claudication,
 ].filter(Boolean).length;
 const cliRisk = cliFactors >= 3 ? 'High' : cliFactors >= 1 ? 'Moderate' : 'Low';
 phenotypes.push({
 name: 'Critical Limb Ischemia (CLI)', risk: cliRisk, probability: Math.min(95, 10 + cliFactors * 17),
 recommendations: cliRisk === 'High' ? ['Urgent vascular surgery consultation', 'Emergent revascularization evaluation', 'Wound care team activation', 'Pain management protocol']
 : cliRisk === 'Moderate' ? ['Vascular lab follow-up within 2 weeks', 'Optimize medical therapy', 'Serial ABI monitoring'] : ['Annual ABI screening'],
 });

 // 2. Diabetic PAD
 const diabeticFactors = [
 inputs.diabetes, inputs.diabeticNeuropathy, inputs.diabeticFoot,
 inputs.diabetes && inputs.ankleIndex < 0.9, inputs.diabetes && inputs.infrapoplitealDisease,
 inputs.diabetes && inputs.tissueLoss,
 ].filter(Boolean).length;
 const diabeticRisk = diabeticFactors >= 4 ? 'High' : diabeticFactors >= 2 ? 'Moderate' : 'Low';
 phenotypes.push({
 name: 'Diabetic PAD', risk: diabeticRisk, probability: Math.min(95, 8 + diabeticFactors * 16),
 recommendations: diabeticRisk === 'High' ? ['Multidisciplinary diabetic foot team', 'HbA1c optimization <7%', 'Podiatry referral', 'Neuropathy-directed therapy', 'Vascular assessment with toe pressures']
 : diabeticRisk === 'Moderate' ? ['Annual foot examination', 'Toe-brachial index measurement', 'Glycemic optimization'] : ['Standard diabetes screening'],
 });

 // 3. Inflammatory/Vasculitic PAD
 const inflammatoryFactors = [
 inputs.crp > 5, inputs.esr > 30, inputs.age < 50,
 inputs.smokingStatus === 'current' && inputs.age < 45,
 !inputs.diabetes && !inputs.aortoiliacDisease && inputs.infrapoplitealDisease,
 ].filter(Boolean).length;
 const inflammatoryRisk = inflammatoryFactors >= 3 ? 'High' : inflammatoryFactors >= 2 ? 'Moderate' : 'Low';
 phenotypes.push({
 name: 'Inflammatory/Vasculitic PAD', risk: inflammatoryRisk, probability: Math.min(90, 5 + inflammatoryFactors * 19),
 recommendations: inflammatoryRisk === 'High' ? ['Rheumatology consultation', 'Vasculitis workup (ANCA, ANA, complement)', 'CTA/MRA for vessel wall inflammation', 'Consider immunosuppressive therapy']
 : inflammatoryRisk === 'Moderate' ? ['Inflammatory marker trending', 'Autoimmune screening panel'] : ['Standard risk factor management'],
 });

 // 4. Medial Calcific Sclerosis (Monckeberg)
 const calcificFactors = [
 inputs.ankleIndex > 1.3, inputs.diabetes, inputs.renalInsufficiency || inputs.dialysis,
 inputs.age > 65, inputs.dialysis,
 ].filter(Boolean).length;
 const calcificRisk = calcificFactors >= 3 ? 'High' : calcificFactors >= 2 ? 'Moderate' : 'Low';
 phenotypes.push({
 name: 'Medial Calcific Sclerosis', risk: calcificRisk, probability: Math.min(90, 5 + calcificFactors * 18),
 recommendations: calcificRisk === 'High' ? ['Toe-brachial index (TBI) required', 'Pulse volume recordings (PVR)', 'Avoid reliance on ABI alone', 'Duplex ultrasound for hemodynamic assessment', 'Nephrology co-management']
 : calcificRisk === 'Moderate' ? ['TBI measurement', 'Consider alternative vascular testing'] : ['Standard ABI interpretation valid'],
 });

 // 5. Acute Limb Ischemia
 const acuteFactors = [
 inputs.restPain && !inputs.claudication, inputs.ankleIndex < 0.3,
 inputs.gangrene, inputs.toePressure < 20,
 ].filter(Boolean).length;
 const acuteRisk = acuteFactors >= 2 ? 'High' : acuteFactors >= 1 ? 'Moderate' : 'Low';
 phenotypes.push({
 name: 'Acute Limb Ischemia', risk: acuteRisk, probability: Math.min(95, 5 + acuteFactors * 24),
 recommendations: acuteRisk === 'High' ? ['EMERGENCY: Immediate vascular surgery consultation', 'Systemic heparinization', 'Assess 6 Ps (Pain, Pallor, Pulselessness, Paresthesia, Paralysis, Poikilothermia)', 'CTA or emergent angiography']
 : acuteRisk === 'Moderate' ? ['Urgent vascular evaluation within 24 hours', 'Anticoagulation initiation'] : ['Monitor for acute symptoms'],
 });

 const highRisks = phenotypes.filter(p => p.risk === 'High').length;
 return {
 phenotypes,
 combinedProfile: highRisks >= 2 ? 'Multiple high-risk PAD phenotypes detected - multidisciplinary vascular review recommended'
 : highRisks === 1 ? 'Single high-risk PAD phenotype - targeted intervention pathway indicated'
 : 'Standard PAD risk profile - guideline-directed management',
 };
  };

  const getRiskColor = (risk: string) => risk === 'High' ? 'text-crimson-600 bg-crimson-50 border-crimson-200' : risk === 'Moderate' ? 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]' : 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]';
  const updateInput = (key: keyof PADPhenotypeInputs, value: any) => setInputs(prev => ({ ...prev, [key]: value }));

  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><Activity className="w-6 h-6 text-porsche-600" /></div>
 <div><h3 className="text-lg font-bold text-titanium-900 font-sf">PAD Phenotype Classification</h3>
 <p className="text-sm text-titanium-500">CLI, Diabetic PAD, Vasculitic, Calcific & Acute Limb Assessment</p></div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Heart className="w-4 h-4" /> Vascular Status</h4>
 {[{k:'ankleIndex',l:'ABI'},{k:'toePressure',l:'Toe Pressure (mmHg)'},{k:'walkingDistance',l:'Walking Distance (m)'}].map(({k,l}) => (
 <div key={k} className="mb-2"><label className="text-xs text-titanium-600">{l}</label>
 <input type="number" step="0.01" value={inputs[k as keyof PADPhenotypeInputs] as number} onChange={e => updateInput(k as keyof PADPhenotypeInputs, parseFloat(e.target.value)||0)} className="input-liquid w-full text-sm mt-0.5" /></div>))}
 {(['restPain','tissueLoss','gangrene','claudication'] as const).map(key => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key]} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>))}
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Comorbidities & Labs</h4>
 {[{k:'age',l:'Age'},{k:'crp',l:'CRP (mg/L)'},{k:'esr',l:'ESR (mm/hr)'}].map(({k,l}) => (
 <div key={k} className="mb-2"><label className="text-xs text-titanium-600">{l}</label>
 <input type="number" step="0.1" value={inputs[k as keyof PADPhenotypeInputs] as number} onChange={e => updateInput(k as keyof PADPhenotypeInputs, parseFloat(e.target.value)||0)} className="input-liquid w-full text-sm mt-0.5" /></div>))}
 <div className="mt-2"><label className="text-xs text-titanium-600">Gender</label>
 <select value={inputs.gender} onChange={e => updateInput('gender', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="male">Male</option><option value="female">Female</option></select></div>
 <div className="mt-2"><label className="text-xs text-titanium-600">Smoking</label>
 <select value={inputs.smokingStatus} onChange={e => updateInput('smokingStatus', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="never">Never</option><option value="former">Former</option><option value="current">Current</option></select></div>
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Flame className="w-4 h-4" /> Disease Pattern</h4>
 {(['diabetes','diabeticNeuropathy','diabeticFoot','renalInsufficiency','dialysis','aortoiliacDisease','femoropoplitealDisease','infrapoplitealDisease'] as const).map(key => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key]} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>))}
 </div>
 </div>
 <button onClick={() => setResults(classifyPhenotypes())} className="btn-liquid-primary w-full flex items-center justify-center gap-2">
 <Search className="w-5 h-5" /> Classify PAD Phenotypes
 </button>
 {results && (
 <div className="space-y-4">
 <div className={`p-4 rounded-xl border ${results.combinedProfile.includes('Multiple') ? 'bg-crimson-50 border-crimson-200' : results.combinedProfile.includes('Single') ? 'bg-[#F0F5FA] border-[#C8D4DC]' : 'bg-[#C8D4DC] border-[#2C4A60]'}`}>
 <p className="font-semibold text-titanium-900">{results.combinedProfile}</p>
 </div>
 {results.phenotypes.map((p) => (
 <div key={p.name} className={`metal-card p-5 border ${getRiskColor(p.risk)}`}>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /><h4 className="font-semibold">{p.name}</h4></div>
 <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(p.risk)}`}>{p.risk} Risk ({p.probability}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2 mb-3">
 <div className={`h-full rounded-full ${p.risk==='High'?'bg-crimson-500':p.risk==='Moderate'?'bg-[#F0F5FA]':'bg-[#C8D4DC]'}`} style={{width:`${p.probability}%`}}/>
 </div>
 <ul className="space-y-1">{p.recommendations.map((r)=>(<li key={r} className="text-sm text-titanium-700 flex items-start gap-2"><span className="text-porsche-500 mt-1">{'\u2022'}</span>{r}</li>))}</ul>
 </div>))}
 </div>
 )}
 </div>
  );
};

export default PADPhenotypeClassification;
