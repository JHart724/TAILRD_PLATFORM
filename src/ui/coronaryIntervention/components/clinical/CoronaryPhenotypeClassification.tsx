import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, Activity, Zap } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface CoronaryPhenotypeInputs {
  chestPainAtRest: boolean;
  chestPainExertional: boolean;
  stSegmentChanges: boolean;
  troponinElevation: boolean;
  coronaryCalciumScore: number;
  priorPCI: boolean;
  priorCABG: boolean;
  diabetes: boolean;
  familyHistoryPrematureCAD: boolean;
  age: number;
  gender: string;
  smokingStatus: string;
  ldlCholesterol: number;
  hsCRP: number;
  lipoproteinA: number;
}

interface PhenotypeResult {
  microvascularDysfunction: { risk: string; probability: number; recommendations: string[] };
  vasospasm: { risk: string; probability: number; recommendations: string[] };
  acceleratedAtherosclerosis: { risk: string; probability: number; recommendations: string[] };
  combinedRiskProfile: string;
}

const CoronaryPhenotypeClassification: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<CoronaryPhenotypeInputs>({
 chestPainAtRest: false, chestPainExertional: true, stSegmentChanges: false,
 troponinElevation: false, coronaryCalciumScore: 120, priorPCI: false,
 priorCABG: false, diabetes: patientData?.diabetes ?? false, familyHistoryPrematureCAD: true,
 age: patientData?.age ?? 58, gender: patientData?.gender ?? 'male', smokingStatus: 'former', ldlCholesterol: patientData?.ldl ?? 145,
 hsCRP: patientData?.hsCRP ?? 2.8, lipoproteinA: patientData?.lipoproteinA ?? 45,
  });
  const [results, setResults] = useState<PhenotypeResult | null>(null);

  const classifyPhenotypes = (): PhenotypeResult => {
 const cmdFactors = [
 inputs.chestPainExertional && !inputs.stSegmentChanges,
 inputs.gender === 'female', inputs.diabetes, inputs.hsCRP > 3.0,
 inputs.coronaryCalciumScore < 100 && inputs.chestPainExertional,
 ].filter(Boolean).length;
 const cmdRisk = cmdFactors >= 3 ? 'High' : cmdFactors >= 2 ? 'Moderate' : 'Low';

 const vasospasmFactors = [
 inputs.chestPainAtRest, inputs.stSegmentChanges && inputs.chestPainAtRest,
 inputs.smokingStatus === 'current', inputs.age < 55, !inputs.diabetes,
 ].filter(Boolean).length;
 const vasospasmRisk = vasospasmFactors >= 3 ? 'High' : vasospasmFactors >= 2 ? 'Moderate' : 'Low';

 const atheroFactors = [
 inputs.familyHistoryPrematureCAD, inputs.lipoproteinA > 50, inputs.ldlCholesterol > 160,
 inputs.diabetes, inputs.smokingStatus !== 'never', inputs.hsCRP > 2.0, inputs.coronaryCalciumScore > 300,
 ].filter(Boolean).length;
 const atheroRisk = atheroFactors >= 4 ? 'High' : atheroFactors >= 2 ? 'Moderate' : 'Low';
 const highRisks = [cmdRisk, vasospasmRisk, atheroRisk].filter(r => r === 'High').length;

 return {
 microvascularDysfunction: { risk: cmdRisk, probability: Math.min(95, 20 + cmdFactors * 18),
 recommendations: cmdRisk === 'High' ? ['Consider coronary reactivity testing', 'Trial of ranolazine or CCB', 'Assess endothelial function', 'Screen for systemic microvascular disease']
 : cmdRisk === 'Moderate' ? ['Stress CMR with perfusion', 'Optimize risk factors'] : ['Standard risk factor management'] },
 vasospasm: { risk: vasospasmRisk, probability: Math.min(90, 15 + vasospasmFactors * 17),
 recommendations: vasospasmRisk === 'High' ? ['Provocative testing with acetylcholine', 'Start long-acting CCB', 'Strict smoking cessation', 'Avoid beta-blockers if isolated vasospasm']
 : vasospasmRisk === 'Moderate' ? ['24-hour Holter for ST changes', 'Consider CCB trial'] : ['Standard evaluation pathway'] },
 acceleratedAtherosclerosis: { risk: atheroRisk, probability: Math.min(95, 10 + atheroFactors * 13),
 recommendations: atheroRisk === 'High' ? ['Aggressive LDL target <55 mg/dL', 'Consider PCSK9 inhibitor', 'Lp(a) testing', 'Anti-inflammatory therapy (colchicine)']
 : atheroRisk === 'Moderate' ? ['LDL target <70 mg/dL', 'High-intensity statin', 'Lp(a) testing'] : ['Standard primary prevention'] },
 combinedRiskProfile: highRisks >= 2 ? 'Multiple high-risk coronary phenotypes - multidisciplinary review recommended'
 : highRisks === 1 ? 'Single high-risk phenotype - targeted intervention pathway indicated' : 'Standard coronary risk profile',
 };
  };

  const getRiskColor = (risk: string) => risk === 'High' ? 'text-crimson-600 bg-crimson-50 border-crimson-200' : risk === 'Moderate' ? 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]' : 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]';
  const updateInput = (key: keyof CoronaryPhenotypeInputs, value: any) => setInputs(prev => ({ ...prev, [key]: value }));

  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><Heart className="w-6 h-6 text-porsche-600" /></div>
 <div><h3 className="text-lg font-bold text-titanium-900">Coronary Phenotype Classification</h3>
 <p className="text-sm text-titanium-500">CMD, Vasospasm & Accelerated Atherosclerosis Assessment</p></div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Presentation</h4>
 {(['chestPainAtRest','chestPainExertional','stSegmentChanges','troponinElevation'] as const).map(key => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key] as boolean} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
 </label>))}
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Search className="w-4 h-4" /> Labs</h4>
 {[{k:'age',l:'Age'},{k:'ldlCholesterol',l:'LDL (mg/dL)'},{k:'hsCRP',l:'hs-CRP (mg/L)'},{k:'lipoproteinA',l:'Lp(a) (nmol/L)'},{k:'coronaryCalciumScore',l:'CAC Score'}].map(({k,l}) => (
 <div key={k} className="mb-2"><label className="text-xs text-titanium-600">{l}</label>
 <input type="number" value={inputs[k as keyof CoronaryPhenotypeInputs] as number} onChange={e => updateInput(k as keyof CoronaryPhenotypeInputs, parseFloat(e.target.value)||0)} className="input-liquid w-full text-sm mt-0.5" />
 </div>))}
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> History</h4>
 {(['priorPCI','priorCABG','diabetes','familyHistoryPrematureCAD'] as const).map(key => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key] as boolean} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
 </label>))}
 <div className="mt-2"><label className="text-xs text-titanium-600">Smoking</label>
 <select value={inputs.smokingStatus} onChange={e => updateInput('smokingStatus', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="never">Never</option><option value="former">Former</option><option value="current">Current</option>
 </select></div>
 </div>
 </div>
 <button onClick={() => setResults(classifyPhenotypes())} className="btn-liquid-primary w-full flex items-center justify-center gap-2">
 <Search className="w-5 h-5" /> Classify Coronary Phenotypes
 </button>
 {results && (
 <div className="space-y-4">
 <div className={`p-4 rounded-xl border ${results.combinedRiskProfile.includes('Multiple') ? 'bg-crimson-50 border-crimson-200' : results.combinedRiskProfile.includes('Single') ? 'bg-[#F0F5FA] border-[#C8D4DC]' : 'bg-[#C8D4DC] border-[#2C4A60]'}`}>
 <p className="font-semibold text-titanium-900">{results.combinedRiskProfile}</p>
 </div>
 {[{t:'Microvascular Dysfunction (CMD)',d:results.microvascularDysfunction,i:<Activity className="w-5 h-5"/>},
 {t:'Coronary Vasospasm',d:results.vasospasm,i:<Zap className="w-5 h-5"/>},
 {t:'Accelerated Atherosclerosis',d:results.acceleratedAtherosclerosis,i:<AlertTriangle className="w-5 h-5"/>}
 ].map(({t,d,i}) => (
 <div key={t} className={`metal-card p-5 border ${getRiskColor(d.risk)}`}>
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">{i}<h4 className="font-semibold">{t}</h4></div>
 <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(d.risk)}`}>{d.risk} Risk ({d.probability}%)</span>
 </div>
 <div className="w-full bg-titanium-100 rounded-full h-2 mb-3">
 <div className={`h-full rounded-full ${d.risk==='High'?'bg-crimson-500':d.risk==='Moderate'?'bg-[#F0F5FA]':'bg-[#C8D4DC]'}`} style={{width:`${d.probability}%`}}/>
 </div>
 <ul className="space-y-1">{d.recommendations.map((r)=>(<li key={r} className="text-sm text-titanium-700 flex items-start gap-2"><span className="text-porsche-500 mt-1">{'\u2022'}</span>{r}</li>))}</ul>
 </div>))}
 </div>
 )}

 <div className="mt-6 bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
 <p className="text-sm text-[#6B7280]">
 <strong>Guidelines:</strong> 2021 ACC/AHA Coronary Revascularization Guideline; 2023 ESC ACS Guidelines; 2014 ACC/AHA NSTE-ACS Guideline.
 </p>
 </div>
 </div>
  );
};

export default CoronaryPhenotypeClassification;
