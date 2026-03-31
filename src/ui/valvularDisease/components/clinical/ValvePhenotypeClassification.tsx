import React, { useState } from 'react';
import { Heart, Search, AlertTriangle, Activity, Zap, Shield } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface ValvePhenotypeInputs {
  age: number;
  gender: string;
  valveAffected: 'aortic' | 'mitral' | 'tricuspid' | 'pulmonic';
  stenosisPresent: boolean;
  regurgitationPresent: boolean;
  calcificationSevere: boolean;
  leafletProlapse: boolean;
  bicuspidAorticValve: boolean;
  rheumaticHistory: boolean;
  connectiveTissueDisease: boolean;
  endocarditisHistory: boolean;
  priorValveSurgery: boolean;
  aorticDilatation: boolean;
  lvef: number;
  lvedd: number;
  pulmonaryHTN: boolean;
  atrialFibrillation: boolean;
}

interface PhenotypeCategory {
  risk: string;
  probability: number;
  recommendations: string[];
}

interface PhenotypeResult {
  degenerativeVsRheumatic: PhenotypeCategory;
  bicuspidAorticValveDisease: PhenotypeCategory;
  connectiveTissueValveDisease: PhenotypeCategory;
  endocarditisRiskProfile: PhenotypeCategory;
  combinedRiskProfile: string;
}

const ValvePhenotypeClassification: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<ValvePhenotypeInputs>({
 age: patientData?.age ?? 72,
 gender: patientData?.gender ?? 'male',
 valveAffected: 'aortic',
 stenosisPresent: true,
 regurgitationPresent: false,
 calcificationSevere: true,
 leafletProlapse: false,
 bicuspidAorticValve: false,
 rheumaticHistory: false,
 connectiveTissueDisease: false,
 endocarditisHistory: false,
 priorValveSurgery: false,
 aorticDilatation: false,
 lvef: patientData?.lvef ?? 55,
 lvedd: patientData?.lvedd ?? 52,
 pulmonaryHTN: false,
 atrialFibrillation: patientData?.atrialFibrillation ?? false,
  });
  const [results, setResults] = useState<PhenotypeResult | null>(null);

  const classifyPhenotypes = (): PhenotypeResult => {
 const degFactors = [
 inputs.age > 65, inputs.calcificationSevere,
 inputs.valveAffected === 'aortic' && inputs.stenosisPresent,
 !inputs.rheumaticHistory, inputs.gender === 'male',
 ].filter(Boolean).length;
 const rheumaticFactors = [
 inputs.rheumaticHistory, inputs.age < 50,
 inputs.valveAffected === 'mitral' && inputs.stenosisPresent,
 !inputs.calcificationSevere && inputs.stenosisPresent,
 ].filter(Boolean).length;
 const degRisk = rheumaticFactors >= 3 ? 'High' : rheumaticFactors >= 2 ? 'Moderate' : degFactors >= 3 ? 'Low' : 'Moderate';
 const degProb = rheumaticFactors >= 3 ? Math.min(90, 25 + rheumaticFactors * 18) : Math.min(85, 15 + degFactors * 14);

 const bavFactors = [
 inputs.bicuspidAorticValve, inputs.aorticDilatation,
 inputs.age < 65, inputs.valveAffected === 'aortic',
 inputs.stenosisPresent && inputs.age < 60,
 ].filter(Boolean).length;
 const bavRisk = bavFactors >= 3 ? 'High' : bavFactors >= 2 ? 'Moderate' : 'Low';

 const ctdFactors = [
 inputs.connectiveTissueDisease, inputs.leafletProlapse,
 inputs.aorticDilatation, inputs.valveAffected === 'mitral' && inputs.regurgitationPresent,
 inputs.age < 50,
 ].filter(Boolean).length;
 const ctdRisk = ctdFactors >= 3 ? 'High' : ctdFactors >= 2 ? 'Moderate' : 'Low';

 const ieFactors = [
 inputs.endocarditisHistory, inputs.priorValveSurgery,
 inputs.regurgitationPresent && inputs.lvef < 40,
 inputs.atrialFibrillation,
 ].filter(Boolean).length;
 const ieRisk = ieFactors >= 3 ? 'High' : ieFactors >= 2 ? 'Moderate' : 'Low';

 const highRisks = [degRisk, bavRisk, ctdRisk, ieRisk].filter(r => r === 'High').length;

 return {
 degenerativeVsRheumatic: {
 risk: degRisk, probability: degProb,
 recommendations: rheumaticFactors >= 3
 ? ['Confirm rheumatic etiology with echo features', 'Screen for commissural fusion', 'Consider penicillin prophylaxis', 'Evaluate for balloon valvuloplasty if mitral stenosis']
 : degFactors >= 3
 ? ['Age-related degenerative process likely', 'Monitor calcification progression', 'CT calcium scoring if aortic stenosis', 'Standard valve surveillance protocol']
 : ['Mixed etiology - correlate with echo findings', 'Consider detailed valve morphology assessment'],
 },
 bicuspidAorticValveDisease: {
 risk: bavRisk, probability: Math.min(90, 15 + bavFactors * 19),
 recommendations: bavRisk === 'High'
 ? ['CT angiography for aortic root assessment', 'Screen first-degree relatives', 'Monitor aortic dimensions every 6-12 months', 'Surgical threshold at 5.5cm (5.0cm if rapid growth)']
 : bavRisk === 'Moderate'
 ? ['Echocardiographic surveillance annually', 'Assess aortic root dimensions', 'Genetic counseling consideration']
 : ['Standard valve follow-up', 'No BAV-specific monitoring needed'],
 },
 connectiveTissueValveDisease: {
 risk: ctdRisk, probability: Math.min(90, 12 + ctdFactors * 20),
 recommendations: ctdRisk === 'High'
 ? ['Genetic testing for Marfan/Ehlers-Danlos/Loeys-Dietz', 'Aortic root monitoring every 6 months', 'Prophylactic surgery at lower thresholds (4.5cm Marfan)', 'Beta-blocker or losartan for aortic root protection']
 : ctdRisk === 'Moderate'
 ? ['Clinical genetics referral', 'Annual aortic imaging', 'Assess for systemic CTD features']
 : ['No CTD-specific workup indicated'],
 },
 endocarditisRiskProfile: {
 risk: ieRisk, probability: Math.min(85, 10 + ieFactors * 22),
 recommendations: ieRisk === 'High'
 ? ['Strict endocarditis prophylaxis for dental procedures', 'Surveillance blood cultures if febrile', 'Dental health optimization', 'Patient education on IE prevention']
 : ieRisk === 'Moderate'
 ? ['Consider prophylaxis for high-risk procedures', 'Regular dental care', 'Educate on warning signs']
 : ['Standard precautions', 'No specific IE prophylaxis needed'],
 },
 combinedRiskProfile: highRisks >= 2
 ? 'Multiple high-risk valve phenotypes - multidisciplinary Heart Valve Team review recommended'
 : highRisks === 1
 ? 'Single high-risk phenotype - targeted intervention pathway indicated'
 : 'Standard valve disease profile - guideline-directed monitoring',
 };
  };

  const getRiskColor = (risk: string) =>
 risk === 'High' ? 'text-crimson-600 bg-crimson-50 border-crimson-200'
 : risk === 'Moderate' ? 'text-[#8B6914] bg-[#FAF6E8] border-[#C8D4DC]'
 : 'text-[#2D6147] bg-[#F0F7F4] border-[#2C4A60]';

  const updateInput = (key: keyof ValvePhenotypeInputs, value: any) =>
 setInputs(prev => ({ ...prev, [key]: value }));

  return (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-porsche-50 rounded-xl"><Heart className="w-6 h-6 text-porsche-600" /></div>
 <div>
 <h3 className="text-lg font-bold text-titanium-900 font-sf">Valve Phenotype Classification</h3>
 <p className="text-sm text-titanium-500">Degenerative, BAV, CTD & Endocarditis Risk Assessment</p>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Valve Details</h4>
 <div className="mb-2"><label className="text-xs text-titanium-600">Valve Affected</label>
 <select value={inputs.valveAffected} onChange={e => updateInput('valveAffected', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="aortic">Aortic</option><option value="mitral">Mitral</option>
 <option value="tricuspid">Tricuspid</option><option value="pulmonic">Pulmonic</option>
 </select></div>
 {[{k:'age',l:'Age'},{k:'lvef',l:'LVEF (%)'},{k:'lvedd',l:'LVEDD (mm)'}].map(({k,l}) => (
 <div key={k} className="mb-2"><label className="text-xs text-titanium-600">{l}</label>
 <input type="number" value={inputs[k as keyof ValvePhenotypeInputs] as number} onChange={e => updateInput(k as keyof ValvePhenotypeInputs, parseFloat(e.target.value)||0)} className="input-liquid w-full text-sm mt-0.5" />
 </div>))}
 <div className="mb-2"><label className="text-xs text-titanium-600">Gender</label>
 <select value={inputs.gender} onChange={e => updateInput('gender', e.target.value)} className="input-liquid w-full text-sm mt-0.5">
 <option value="male">Male</option><option value="female">Female</option>
 </select></div>
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Clinical Features</h4>
 {([
 ['stenosisPresent','Stenosis Present'],['regurgitationPresent','Regurgitation Present'],
 ['calcificationSevere','Severe Calcification'],['leafletProlapse','Leaflet Prolapse'],
 ['bicuspidAorticValve','Bicuspid Aortic Valve'],['rheumaticHistory','Rheumatic History'],
 ['connectiveTissueDisease','Connective Tissue Disease'],['endocarditisHistory','Endocarditis History'],
 ] as const).map(([key, label]) => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key] as boolean} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {label}
 </label>))}
 </div>
 <div className="metal-card p-4">
 <h4 className="font-semibold text-titanium-800 mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Imaging & History</h4>
 {([
 ['priorValveSurgery','Prior Valve Surgery'],['aorticDilatation','Aortic Dilatation'],
 ['pulmonaryHTN','Pulmonary Hypertension'],['atrialFibrillation','Atrial Fibrillation'],
 ] as const).map(([key, label]) => (
 <label key={key} className="flex items-center gap-2 py-1 text-sm text-titanium-700">
 <input type="checkbox" checked={inputs[key] as boolean} onChange={e => updateInput(key, e.target.checked)} className="rounded border-titanium-300 text-porsche-600" />
 {label}
 </label>))}
 </div>
 </div>
 <button onClick={() => setResults(classifyPhenotypes())} className="btn-liquid-primary w-full flex items-center justify-center gap-2">
 <Search className="w-5 h-5" /> Classify Valve Phenotypes
 </button>
 {results && (
 <div className="space-y-4">
 <div className={`p-4 rounded-xl border ${results.combinedRiskProfile.includes('Multiple') ? 'bg-crimson-50 border-crimson-200' : results.combinedRiskProfile.includes('Single') ? 'bg-[#F0F5FA] border-[#C8D4DC]' : 'bg-[#F0F7F4] border-[#D8EDE6]'}`}>
 <p className="font-semibold text-titanium-900">{results.combinedRiskProfile}</p>
 </div>
 {[
 {t:'Degenerative vs Rheumatic',d:results.degenerativeVsRheumatic,i:<Activity className="w-5 h-5"/>},
 {t:'Bicuspid Aortic Valve Disease',d:results.bicuspidAorticValveDisease,i:<Heart className="w-5 h-5"/>},
 {t:'Connective Tissue Valve Disease',d:results.connectiveTissueValveDisease,i:<Zap className="w-5 h-5"/>},
 {t:'Endocarditis Risk Profile',d:results.endocarditisRiskProfile,i:<AlertTriangle className="w-5 h-5"/>},
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
 </div>
  );
};

export default ValvePhenotypeClassification;
