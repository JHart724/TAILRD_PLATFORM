import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Pill, Heart, Zap, Activity } from 'lucide-react';
import { PatientContext } from '../../../../types/shared';

interface PatientData {
  systolicBP: number;
  plateletCount: number;
  hemoglobin: number;
  creatinine: number;
  eGFR: number;
  age: number;
  weight: number;
  hasActiveBleed: boolean;
  hasGIBleedHistory: boolean;
  hasICHHistory: boolean;
  hasPriorStroke: boolean;
  hasSevereHepatic: boolean;
  hasAsthma: boolean;
  isOnAnticoagulant: boolean;
  isPregnant: boolean;
  hasThrombocytopenia: boolean;
  stentType: 'none' | 'BMS' | 'DES';
  monthsSinceStent: number;
}

interface ContraindicationResult {
  drug: string;
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  dosing: {
 startDose: string;
 targetDose: string;
 titrationSchedule: string;
  };
  labsRequired: string[];
  labFrequency: string;
}

const AntiplateletContraindicationChecker: React.FC<{ patientData?: PatientContext }> = ({ patientData: ctx }) => {
  const [patientData, setPatientData] = useState<PatientData>({
 systolicBP: ctx?.systolicBP ?? 130,
 plateletCount: ctx?.platelets ?? 220,
 hemoglobin: ctx?.hemoglobin ?? 13.5,
 creatinine: ctx?.creatinine ?? 1.0,
 eGFR: ctx?.eGFR ?? 72,
 age: ctx?.age ?? 64,
 weight: ctx?.weight ?? 82,
 hasActiveBleed: ctx?.activeBleeding ?? false,
 hasGIBleedHistory: ctx?.bleedingHistory ?? false,
 hasICHHistory: false,
 hasPriorStroke: ctx?.priorStroke ?? false,
 hasSevereHepatic: ctx?.liverDisease ?? false,
 hasAsthma: ctx?.asthma ?? false,
 isOnAnticoagulant: ctx?.onAnticoagulant ?? false,
 isPregnant: false,
 hasThrombocytopenia: false,
 stentType: 'DES',
 monthsSinceStent: 3,
  });

  const checkContraindications = (): ContraindicationResult[] => {
 const results: ContraindicationResult[] = [];

 // --- Aspirin Assessment ---
 let aspirinStatus: ContraindicationResult['status'] = 'safe';
 let aspirinLevel: ContraindicationResult['level'] = 'none';
 const aspirinReasons: string[] = [];
 const aspirinAlts: string[] = [];
 const aspirinMon: string[] = ['CBC monitoring', 'Stool guaiac if GI risk', 'Signs of bleeding'];

 if (patientData.hasActiveBleed) {
 aspirinStatus = 'contraindicated'; aspirinLevel = 'absolute';
 aspirinReasons.push('Active bleeding'); aspirinAlts.push('Delay until bleed resolves');
 }
 if (patientData.isPregnant) {
 aspirinStatus = 'contraindicated'; aspirinLevel = 'absolute';
 aspirinReasons.push('Pregnancy (3rd trimester contraindicated)');
 aspirinAlts.push('Consult OB for low-dose ASA if indicated');
 }
 if (patientData.hasGIBleedHistory && aspirinStatus !== 'contraindicated') {
 aspirinStatus = 'caution'; aspirinLevel = 'relative';
 aspirinReasons.push('History of GI bleeding');
 aspirinMon.push('Concurrent PPI therapy recommended');
 aspirinAlts.push('Add PPI prophylaxis');
 }
 if (patientData.hasThrombocytopenia || patientData.plateletCount < 100) {
 if (aspirinStatus !== 'contraindicated') {
 aspirinStatus = 'caution'; aspirinLevel = 'relative';
 }
 aspirinReasons.push('Thrombocytopenia (platelets <100K)');
 aspirinMon.push('Frequent platelet monitoring');
 }

 results.push({
 drug: 'Aspirin',
 status: aspirinStatus, level: aspirinLevel,
 reasons: aspirinReasons, alternatives: aspirinAlts, monitoring: aspirinMon,
 dosing: {
 startDose: '81mg daily (low-dose)',
 targetDose: '81mg daily maintenance',
 titrationSchedule: '325mg loading dose if ACS, then 81mg daily',
 },
 labsRequired: ['CBC', 'Platelet count', 'BMP'],
 labFrequency: aspirinStatus === 'caution' ? 'Weekly for 2 weeks, then monthly' : 'Baseline, then every 3-6 months',
 });

 // --- Clopidogrel (Plavix) Assessment ---
 let clopStatus: ContraindicationResult['status'] = 'safe';
 let clopLevel: ContraindicationResult['level'] = 'none';
 const clopReasons: string[] = [];
 const clopAlts: string[] = [];
 const clopMon: string[] = ['CBC monitoring', 'Signs of bleeding', 'Platelet function if concern'];

 if (patientData.hasActiveBleed) {
 clopStatus = 'contraindicated'; clopLevel = 'absolute';
 clopReasons.push('Active pathological bleeding'); clopAlts.push('Delay until bleed resolves');
 }
 if (patientData.hasSevereHepatic) {
 clopStatus = 'contraindicated'; clopLevel = 'absolute';
 clopReasons.push('Severe hepatic impairment (impairs prodrug activation)');
 clopAlts.push('Consider ticagrelor (no hepatic activation needed)');
 }
 if (patientData.eGFR < 30 && clopStatus !== 'contraindicated') {
 clopStatus = 'caution'; clopLevel = 'relative';
 clopReasons.push('Severe renal impairment (eGFR <30)');
 clopMon.push('Enhanced bleeding surveillance');
 }
 if (patientData.isOnAnticoagulant && clopStatus !== 'contraindicated') {
 clopStatus = 'caution'; clopLevel = 'relative';
 clopReasons.push('Concurrent anticoagulant therapy (triple therapy risk)');
 clopMon.push('Minimize triple therapy duration', 'Consider dropping aspirin early');
 }

 results.push({
 drug: 'Clopidogrel (Plavix)',
 status: clopStatus, level: clopLevel,
 reasons: clopReasons, alternatives: clopAlts, monitoring: clopMon,
 dosing: {
 startDose: '300-600mg loading dose',
 targetDose: '75mg daily maintenance',
 titrationSchedule: 'Load, then 75mg daily; duration per stent type',
 },
 labsRequired: ['CBC', 'Platelet count', 'LFTs', 'Creatinine'],
 labFrequency: clopStatus === 'caution' ? 'Weekly for 4 weeks, then monthly' : 'Baseline, then every 3 months',
 });

 // --- Ticagrelor (Brilinta) Assessment ---
 let ticaStatus: ContraindicationResult['status'] = 'safe';
 let ticaLevel: ContraindicationResult['level'] = 'none';
 const ticaReasons: string[] = [];
 const ticaAlts: string[] = [];
 const ticaMon: string[] = ['CBC monitoring', 'Dyspnea assessment', 'Heart rate (bradycardia risk)', 'Uric acid levels'];

 if (patientData.hasActiveBleed) {
 ticaStatus = 'contraindicated'; ticaLevel = 'absolute';
 ticaReasons.push('Active pathological bleeding'); ticaAlts.push('Delay until bleed resolves');
 }
 if (patientData.hasICHHistory) {
 ticaStatus = 'contraindicated'; ticaLevel = 'absolute';
 ticaReasons.push('History of intracranial hemorrhage');
 ticaAlts.push('Clopidogrel preferred if P2Y12 needed');
 }
 if (patientData.hasSevereHepatic) {
 ticaStatus = 'contraindicated'; ticaLevel = 'absolute';
 ticaReasons.push('Severe hepatic impairment');
 ticaAlts.push('Clopidogrel with dose adjustment');
 }
 if (patientData.hasAsthma && ticaStatus !== 'contraindicated') {
 ticaStatus = 'caution'; ticaLevel = 'relative';
 ticaReasons.push('Asthma/COPD (dyspnea side effect in ~14% of patients)');
 ticaMon.push('Monitor respiratory symptoms closely', 'Dyspnea usually self-limited');
 }
 if (patientData.isOnAnticoagulant && ticaStatus !== 'contraindicated') {
 ticaStatus = 'caution'; ticaLevel = 'relative';
 ticaReasons.push('Concurrent anticoagulant (avoid triple therapy with ticagrelor)');
 ticaAlts.push('Switch to clopidogrel for triple therapy');
 }

 results.push({
 drug: 'Ticagrelor (Brilinta)',
 status: ticaStatus, level: ticaLevel,
 reasons: ticaReasons, alternatives: ticaAlts, monitoring: ticaMon,
 dosing: {
 startDose: '180mg loading dose',
 targetDose: '90mg BID (higher maintenance than clopidogrel)',
 titrationSchedule: 'Load, then 90mg BID x12mo; may step down to 60mg BID',
 },
 labsRequired: ['CBC', 'LFTs', 'Creatinine', 'Uric acid'],
 labFrequency: ticaStatus === 'caution' ? 'Weekly for 4 weeks, then monthly' : 'Baseline, 1 month, then every 3 months',
 });

 // --- Prasugrel (Effient) Assessment ---
 let prasStatus: ContraindicationResult['status'] = 'safe';
 let prasLevel: ContraindicationResult['level'] = 'none';
 const prasReasons: string[] = [];
 const prasAlts: string[] = [];
 const prasMon: string[] = ['CBC monitoring', 'Signs of bleeding', 'Weight-based dosing review'];

 if (patientData.hasActiveBleed) {
 prasStatus = 'contraindicated'; prasLevel = 'absolute';
 prasReasons.push('Active pathological bleeding'); prasAlts.push('Delay until bleed resolves');
 }
 if (patientData.hasPriorStroke) {
 prasStatus = 'contraindicated'; prasLevel = 'absolute';
 prasReasons.push('Prior stroke or TIA (net clinical harm in TRITON-TIMI 38)');
 prasAlts.push('Ticagrelor or clopidogrel preferred');
 }
 if (patientData.age > 75 && prasStatus !== 'contraindicated') {
 prasStatus = 'caution'; prasLevel = 'relative';
 prasReasons.push('Age >75 years (increased bleeding risk, generally not recommended)');
 prasAlts.push('Ticagrelor preferred in elderly');
 prasMon.push('Enhanced bleeding surveillance');
 }
 if (patientData.weight < 60 && prasStatus !== 'contraindicated') {
 prasStatus = 'caution'; prasLevel = 'relative';
 prasReasons.push('Weight <60kg (increased bleeding, consider 5mg maintenance)');
 prasMon.push('Use reduced 5mg maintenance dose');
 }
 if (patientData.hasICHHistory && prasStatus !== 'contraindicated') {
 prasStatus = 'caution'; prasLevel = 'relative';
 prasReasons.push('History of ICH (most potent P2Y12 inhibitor)');
 prasAlts.push('Clopidogrel preferred if ICH history');
 }

 results.push({
 drug: 'Prasugrel (Effient)',
 status: prasStatus, level: prasLevel,
 reasons: prasReasons, alternatives: prasAlts, monitoring: prasMon,
 dosing: {
 startDose: '60mg loading dose',
 targetDose: patientData.weight < 60 ? '5mg daily (weight <60kg)' : '10mg daily',
 titrationSchedule: 'Load at PCI, then daily maintenance; most potent P2Y12 inhibitor',
 },
 labsRequired: ['CBC', 'Platelet count', 'BMP'],
 labFrequency: prasStatus === 'caution' ? 'Weekly for 4 weeks, then biweekly' : 'Baseline, 2 weeks, then every 3 months',
 });

 return results;
  };

  const results = checkContraindications();

  const updatePatientData = (key: keyof PatientData, value: any) => {
 setPatientData(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: ContraindicationResult['status']) => {
 switch (status) {
 case 'contraindicated': return 'text-crimson-800 bg-crimson-100 border-crimson-300';
 case 'caution': return 'text-amber-800 bg-amber-100 border-amber-300';
 case 'monitor': return 'text-porsche-800 bg-porsche-100 border-porsche-300';
 case 'safe': return 'text-green-800 bg-green-100 border-green-300';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getStatusIcon = (status: ContraindicationResult['status']) => {
 switch (status) {
 case 'contraindicated': return <XCircle className="w-5 h-5" />;
 case 'caution': return <AlertTriangle className="w-5 h-5" />;
 case 'monitor': return <Clock className="w-5 h-5" />;
 case 'safe': return <CheckCircle className="w-5 h-5" />;
 default: return <Shield className="w-5 h-5" />;
 }
  };

  const getDrugIcon = (drug: string) => {
 if (drug.includes('Aspirin')) return <Pill className="w-5 h-5" />;
 if (drug.includes('Clopidogrel')) return <Heart className="w-5 h-5" />;
 if (drug.includes('Ticagrelor')) return <Zap className="w-5 h-5" />;
 if (drug.includes('Prasugrel')) return <Activity className="w-5 h-5" />;
 return <Pill className="w-5 h-5" />;
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Shield className="w-8 h-8 text-crimson-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">Antiplatelet Contraindication Checker</h2>
 <p className="text-titanium-600">Evidence-based safety screening for antiplatelet/antithrombotic therapy</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Patient Data Input */}
 <div className="lg:col-span-1 space-y-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <h3 className="font-semibold text-porsche-800 mb-3">Vitals & Labs</h3>
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 {[
 { key: 'systolicBP', label: 'SBP (mmHg)', step: 1 },
 { key: 'plateletCount', label: 'Platelets (K)', step: 1 },
 { key: 'hemoglobin', label: 'Hgb (g/dL)', step: 0.1 },
 { key: 'creatinine', label: 'Cr (mg/dL)', step: 0.1 },
 { key: 'eGFR', label: 'eGFR', step: 1 },
 { key: 'age', label: 'Age', step: 1 },
 { key: 'weight', label: 'Weight (kg)', step: 1 },
 ].map((field) => (
 <div key={field.key}>
 <label className="block text-sm font-medium text-titanium-700 mb-1">{field.label}</label>
 <input
 type="number"
 step={field.step}
 value={patientData[field.key as keyof PatientData] as number}
 onChange={(e) => updatePatientData(field.key as keyof PatientData, field.step < 1 ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
 <h3 className="font-semibold text-amber-800 mb-3">Clinical Conditions</h3>
 <div className="space-y-3">
 {[
 { key: 'hasActiveBleed', label: 'Active bleeding' },
 { key: 'hasGIBleedHistory', label: 'GI bleed history' },
 { key: 'hasICHHistory', label: 'ICH history' },
 { key: 'hasPriorStroke', label: 'Prior stroke/TIA' },
 { key: 'hasSevereHepatic', label: 'Severe hepatic disease' },
 { key: 'hasAsthma', label: 'Asthma/COPD' },
 { key: 'isOnAnticoagulant', label: 'On anticoagulant' },
 { key: 'isPregnant', label: 'Pregnant' },
 { key: 'hasThrombocytopenia', label: 'Thrombocytopenia' },
 ].map((condition) => (
 <label key={condition.key} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={patientData[condition.key as keyof PatientData] as boolean}
 onChange={(e) => updatePatientData(condition.key as keyof PatientData, e.target.checked)}
 className="rounded text-amber-600"
 />
 <span className="text-sm font-medium text-titanium-700">{condition.label}</span>
 </label>
 ))}
 </div>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <h3 className="font-semibold text-titanium-800 mb-3">Stent Information</h3>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Stent Type</label>
 <select
 value={patientData.stentType}
 onChange={(e) => updatePatientData('stentType', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 >
 <option value="none">No Stent</option>
 <option value="BMS">BMS (Bare Metal)</option>
 <option value="DES">DES (Drug-Eluting)</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Months Since Stent</label>
 <input
 type="number"
 value={patientData.monthsSinceStent}
 onChange={(e) => updatePatientData('monthsSinceStent', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Results */}
 <div className="lg:col-span-2 space-y-6">
 <div className="grid grid-cols-2 gap-4">
 {results.map((result) => (
 <div key={result.drug} className={`p-6 rounded-xl border-2 ${getStatusColor(result.status)}`}>
 <div className="flex items-center gap-3 mb-4">
 {getDrugIcon(result.drug)}
 <div className="flex-1">
 <div className="font-bold text-lg">{result.drug}</div>
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
 <div className="text-sm font-semibold mb-2">Concerns:</div>
 <ul className="text-sm space-y-1">
 {result.reasons.map((reason) => (
 <li key={reason} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></div>
 {reason}
 </li>
 ))}
 </ul>
 </div>
 )}

 <div className="space-y-3 text-sm">
 <div><span className="font-semibold">Start:</span> {result.dosing.startDose}</div>
 <div><span className="font-semibold">Target:</span> {result.dosing.targetDose}</div>
 <div><span className="font-semibold">Labs:</span> {result.labFrequency}</div>
 </div>
 </div>
 ))}
 </div>

 {/* Monitoring Summary */}
 <div className="p-6 bg-white rounded-xl border border-titanium-200 shadow-chrome-card-hover">
 <h3 className="text-lg font-semibold text-titanium-900 mb-4">Monitoring Requirements</h3>
 <div className="grid grid-cols-2 gap-6">
 {results.map((result) => (
 <div key={result.drug} className="space-y-3">
 <div className="font-semibold text-titanium-900 flex items-center gap-2">
 {getDrugIcon(result.drug)}
 {result.drug.split(' ')[0]} Monitoring
 </div>
 <ul className="text-sm text-titanium-700 space-y-1">
 {result.monitoring.map((item) => (
 <li key={item} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-titanium-400 rounded-full mt-2 flex-shrink-0"></div>
 {item}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>

 {/* DAPT Duration Guidance */}
 {patientData.stentType !== 'none' && (
 <div className="p-6 bg-porsche-50 border border-porsche-200 rounded-xl">
 <h3 className="text-lg font-semibold text-porsche-800 mb-4">DAPT Duration Guidance</h3>
 <div className="text-sm text-porsche-700 space-y-2">
 <p><span className="font-semibold">Stent Type:</span> {patientData.stentType === 'BMS' ? 'Bare Metal Stent' : 'Drug-Eluting Stent'}</p>
 <p><span className="font-semibold">Months Since Implant:</span> {patientData.monthsSinceStent}</p>
 <p><span className="font-semibold">Minimum DAPT:</span> {patientData.stentType === 'BMS' ? '1 month' : '6-12 months (ACS: 12 months)'}</p>
 {patientData.stentType === 'DES' && patientData.monthsSinceStent < 6 && (
 <div className="mt-2 p-3 bg-crimson-50 border border-crimson-200 rounded-lg text-crimson-700">
 <AlertTriangle className="w-4 h-4 inline mr-1" />
 Premature DAPT discontinuation risk: High risk of stent thrombosis if P2Y12 stopped before 6 months post-DES.
 </div>
 )}
 </div>
 </div>
 )}

 {/* Alternatives */}
 {results.some(r => r.alternatives.length > 0) && (
 <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
 <h3 className="text-lg font-semibold text-amber-800 mb-4">Alternative Therapies</h3>
 <div className="space-y-4">
 {results.filter(r => r.alternatives.length > 0).map((result) => (
 <div key={result.drug}>
 <div className="font-semibold text-amber-800 mb-2">{result.drug} Alternatives:</div>
 <ul className="text-sm text-amber-700 space-y-1">
 {result.alternatives.map((alt) => (
 <li key={alt} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
 {alt}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-sm text-amber-800">
 <strong>Guidelines:</strong> 2021 ACC/AHA Coronary Revascularization Guideline; 2017 ESC Focused Update on DAPT; 2020 ACC Expert Consensus on Antiplatelet Therapy.
 </p>
 </div>
 </div>
  );
};

export default AntiplateletContraindicationChecker;
