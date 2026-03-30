import React, { useState } from 'react';
import { Calculator, Heart, Activity, AlertTriangle, Target, Route } from 'lucide-react';
import { PatientContext } from '../../../types/shared';

interface SYNTAXInputs {
  dominance: 'right' | 'left' | 'codominant';
  lmStenosis: number;
  ladProximalStenosis: number;
  ladMidStenosis: number;
  ladDistalStenosis: number;
  lcxStenosis: number;
  rcaStenosis: number;
  rcaPdaStenosis: number;
  rcaPlvStenosis: number;
  d1Stenosis: number;
  d2Stenosis: number;
  om1Stenosis: number;
  om2Stenosis: number;
  im1Stenosis: number;
  im2Stenosis: number;
  numTotalOcclusions: number;
  trifurcation: boolean;
  aortaOstial: boolean;
  severeTortuosity: boolean;
  lengthOver20mm: boolean;
  heavyCalcification: boolean;
  thrombus: boolean;
  diffuseDisease: boolean;
}

interface SYNTAXIIClinicalInputs {
  age: number;
  sex: 'male' | 'female';
  creatinineClearance: number;
  lvef: number;
  hasCOPD: boolean;
  hasPVD: boolean;
  hasULMCA: boolean;
}

interface SYNTAXResult {
  score: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  revascularizationStrategy: string;
  cabgRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
  pciRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
  interpretation: string;
  recommendations: string[];
}

interface SYNTAXIIResult {
  pciMortality: number;
  cabgMortality: number;
  recommendedStrategy: 'PCI' | 'CABG' | 'Either';
  treatmentBenefit: number;
  strategyRationale: string;
}

type ScoreMode = 'syntax-i' | 'syntax-ii';

const SYNTAXScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<SYNTAXInputs>({
 dominance: 'right',
 lmStenosis: 0,
 ladProximalStenosis: 80,
 ladMidStenosis: 0,
 ladDistalStenosis: 0,
 lcxStenosis: 75,
 rcaStenosis: 90,
 rcaPdaStenosis: 0,
 rcaPlvStenosis: 0,
 d1Stenosis: 0,
 d2Stenosis: 0,
 om1Stenosis: 70,
 om2Stenosis: 0,
 im1Stenosis: 0,
 im2Stenosis: 0,
 numTotalOcclusions: 1,
 trifurcation: true,
 aortaOstial: false,
 severeTortuosity: false,
 lengthOver20mm: true,
 heavyCalcification: false,
 thrombus: false,
 diffuseDisease: false
  });

  const [clinicalInputs, setClinicalInputs] = useState<SYNTAXIIClinicalInputs>({
 age: patientData?.age ?? 65,
 sex: patientData?.gender ?? 'male',
 creatinineClearance: patientData?.eGFR ?? 80,
 lvef: patientData?.lvef ?? 50,
 hasCOPD: patientData?.copd ?? false,
 hasPVD: patientData?.pvd ?? false,
 hasULMCA: false
  });

  const [scoreMode, setScoreMode] = useState<ScoreMode>('syntax-i');

  const calculateSYNTAX = (): SYNTAXResult => {
 let score = 0;

 // Dominance scoring
 const domScore = inputs.dominance === 'left' ? 1 : 0;

 // Number of segments involved
 let segmentCount = 0;
 const stenosisInputs = [
 inputs.lmStenosis, inputs.ladProximalStenosis, inputs.ladMidStenosis,
 inputs.ladDistalStenosis, inputs.lcxStenosis, inputs.rcaStenosis,
 inputs.rcaPdaStenosis, inputs.rcaPlvStenosis, inputs.d1Stenosis,
 inputs.d2Stenosis, inputs.om1Stenosis, inputs.om2Stenosis,
 inputs.im1Stenosis, inputs.im2Stenosis
 ];

 stenosisInputs.forEach(stenosis => {
 if (stenosis >= 50) segmentCount++;
 });

 // Segment-specific scoring
 if (inputs.lmStenosis >= 50) score += 5; // Left main
 if (inputs.ladProximalStenosis >= 50) score += 3.5; // LAD proximal
 if (inputs.ladMidStenosis >= 50) score += 2.5; // LAD mid
 if (inputs.ladDistalStenosis >= 50) score += 1; // LAD distal
 if (inputs.lcxStenosis >= 50) score += 2.5; // LCX
 if (inputs.rcaStenosis >= 50) score += (inputs.dominance === 'right' ? 3.5 : 1); // RCA
 if (inputs.rcaPdaStenosis >= 50) score += 1; // RCA PDA
 if (inputs.rcaPlvStenosis >= 50) score += 0.5; // RCA PLV
 if (inputs.d1Stenosis >= 50) score += 1; // Diagonal 1
 if (inputs.d2Stenosis >= 50) score += 0.5; // Diagonal 2
 if (inputs.om1Stenosis >= 50) score += 1; // OM1
 if (inputs.om2Stenosis >= 50) score += 0.5; // OM2
 if (inputs.im1Stenosis >= 50) score += 1; // IM1
 if (inputs.im2Stenosis >= 50) score += 0.5; // IM2

 // Total occlusion scoring
 score += inputs.numTotalOcclusions * 5;

 // Morphological features
 if (inputs.trifurcation) score += 3;
 if (inputs.aortaOstial) score += 3;
 if (inputs.severeTortuosity) score += 2;
 if (inputs.lengthOver20mm) score += 2;
 if (inputs.heavyCalcification) score += 2;
 if (inputs.thrombus) score += 1;
 if (inputs.diffuseDisease) score += 1;

 // Round to nearest 0.5
 score = Math.round(score * 2) / 2;

 // Risk stratification
 let riskCategory: 'Low' | 'Intermediate' | 'High';
 let cabgRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
 let pciRecommendation: 'Preferred' | 'Reasonable' | 'Not Recommended';
 let revascularizationStrategy: string;
 let interpretation: string;
 let recommendations: string[];

 if (score <= 22) {
 riskCategory = 'Low';
 cabgRecommendation = 'Reasonable';
 pciRecommendation = 'Preferred';
 revascularizationStrategy = 'PCI and CABG equivalent outcomes';
 interpretation = 'Low complexity coronary disease. PCI and CABG have similar outcomes.';
 recommendations = [
 'Either PCI or CABG appropriate',
 'Consider patient preferences and comorbidities',
 'Single-stage PCI often feasible',
 'Heart Team discussion recommended'
 ];
 } else if (score <= 32) {
 riskCategory = 'Intermediate';
 cabgRecommendation = 'Reasonable';
 pciRecommendation = 'Reasonable';
 revascularizationStrategy = 'Heart Team approach recommended';
 interpretation = 'Intermediate complexity. Careful consideration of revascularization strategy required.';
 recommendations = [
 'Mandatory Heart Team evaluation',
 'Consider staged PCI approach',
 'CABG may offer mortality benefit',
 'Assess clinical comorbidities with SYNTAX II'
 ];
 } else {
 riskCategory = 'High';
 cabgRecommendation = 'Preferred';
 pciRecommendation = 'Not Recommended';
 revascularizationStrategy = 'CABG preferred';
 interpretation = 'High complexity coronary disease. CABG preferred over PCI.';
 recommendations = [
 'CABG strongly preferred',
 'PCI associated with higher mortality',
 'Complete revascularization goal',
 'Consider intra-aortic balloon pump support'
 ];
 }

 return {
 score,
 riskCategory,
 revascularizationStrategy,
 cabgRecommendation,
 pciRecommendation,
 interpretation,
 recommendations
 };
  };

  const calculateSYNTAXII = (anatomicalScore: number): SYNTAXIIResult => {
 const { age, sex, creatinineClearance, lvef, hasCOPD, hasPVD, hasULMCA } = clinicalInputs;
 const isFemale = sex === 'female';

 // SYNTAX II PCI 4-Year Mortality
 const pciMortality =
 anatomicalScore * 0.15 +
 age * 0.08 +
 (isFemale ? 2.0 : 0) +
 (creatinineClearance < 60 ? 4.5 : creatinineClearance < 90 ? 1.5 : 0) +
 (lvef < 30 ? 8.0 : lvef < 50 ? 3.5 : 0) +
 (hasCOPD ? 3.0 : 0) +
 (hasPVD ? 2.5 : 0) +
 (hasULMCA ? 2.0 : 0);

 // SYNTAX II CABG 4-Year Mortality
 const cabgMortality =
 anatomicalScore * 0.05 +
 age * 0.12 +
 (isFemale ? 1.5 : 0) +
 (creatinineClearance < 60 ? 5.0 : creatinineClearance < 90 ? 2.0 : 0) +
 (lvef < 30 ? 6.0 : lvef < 50 ? 2.5 : 0) +
 (hasCOPD ? 4.0 : 0) +
 (hasPVD ? 1.5 : 0) +
 (hasULMCA ? 0.5 : 0);

 const difference = Math.abs(pciMortality - cabgMortality);
 const treatmentBenefit = Math.round(difference * 10) / 10;

 let recommendedStrategy: 'PCI' | 'CABG' | 'Either';
 let strategyRationale: string;

 if (difference <= 2.0) {
 recommendedStrategy = 'Either';
 strategyRationale = `PCI and CABG have comparable predicted mortality (within ${treatmentBenefit}%). Either strategy is acceptable. Decision should incorporate patient preference and Heart Team consensus.`;
 } else if (pciMortality < cabgMortality) {
 recommendedStrategy = 'PCI';
 strategyRationale = `PCI is associated with ${treatmentBenefit}% lower predicted 4-year mortality. Anatomical and clinical profile favors percutaneous approach.`;
 } else {
 recommendedStrategy = 'CABG';
 strategyRationale = `CABG is associated with ${treatmentBenefit}% lower predicted 4-year mortality. Anatomical and clinical profile favors surgical revascularization.`;
 }

 return {
 pciMortality: Math.round(pciMortality * 10) / 10,
 cabgMortality: Math.round(cabgMortality * 10) / 10,
 recommendedStrategy,
 treatmentBenefit,
 strategyRationale
 };
  };

  const result = calculateSYNTAX();
  const syntaxIIResult = calculateSYNTAXII(result.score);

  const updateInput = (key: keyof SYNTAXInputs, value: any) => {
 setInputs(prev => ({ ...prev, [key]: value }));
  };

  const updateClinicalInput = (key: keyof SYNTAXIIClinicalInputs, value: any) => {
 setClinicalInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-[#2C4A60] bg-[#f0f5fa] border-[#C8D4DC]';
 case 'Intermediate': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getRecommendationColor = (rec: string) => {
 switch (rec) {
 case 'Preferred': return 'text-[#2C4A60] bg-[#f0f5fa] border-[#C8D4DC]';
 case 'Reasonable': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 case 'Not Recommended': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  const getStrategyColor = (strategy: 'PCI' | 'CABG' | 'Either') => {
 switch (strategy) {
 case 'PCI': return 'text-[#2C4A60] bg-[#f0f5fa] border-[#C8D4DC]';
 case 'CABG': return 'text-porsche-700 bg-porsche-50 border-porsche-300';
 case 'Either': return 'text-crimson-700 bg-crimson-50 border-crimson-200';
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Calculator className="w-8 h-8 text-medical-red-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">SYNTAX Score Calculator</h2>
 <p className="text-titanium-600">Coronary Lesion Complexity Assessment</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Input Section */}
 <div className="lg:col-span-2 space-y-6">
 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <h3 className="font-semibold text-porsche-800 mb-3 flex items-center gap-2">
 <Heart className="w-5 h-5" />
 Coronary Dominance
 </h3>
 <select
 value={inputs.dominance}
 onChange={(e) => updateInput('dominance', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 >
 <option value="right">Right dominance</option>
 <option value="left">Left dominance</option>
 <option value="codominant">Codominant</option>
 </select>
 </div>

 <div className="p-4 bg-medical-red-50 border border-medical-red-200 rounded-lg">
 <h3 className="font-semibold text-medical-red-800 mb-3 flex items-center gap-2">
 <Activity className="w-5 h-5" />
 Stenosis Severity (%) - Major Vessels
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Left Main</label>
 <input
 type="number"
 value={inputs.lmStenosis}
 onChange={(e) => updateInput('lmStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">LAD Proximal</label>
 <input
 type="number"
 value={inputs.ladProximalStenosis}
 onChange={(e) => updateInput('ladProximalStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">LAD Mid</label>
 <input
 type="number"
 value={inputs.ladMidStenosis}
 onChange={(e) => updateInput('ladMidStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">LAD Distal</label>
 <input
 type="number"
 value={inputs.ladDistalStenosis}
 onChange={(e) => updateInput('ladDistalStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">LCX</label>
 <input
 type="number"
 value={inputs.lcxStenosis}
 onChange={(e) => updateInput('lcxStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">RCA</label>
 <input
 type="number"
 value={inputs.rcaStenosis}
 onChange={(e) => updateInput('rcaStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-medical-red-500"
 min="0"
 max="100"
 />
 </div>
 </div>
 </div>

 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <h3 className="font-semibold text-crimson-700 mb-3">Side Branch Stenosis (%)</h3>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">D1</label>
 <input
 type="number"
 value={inputs.d1Stenosis}
 onChange={(e) => updateInput('d1Stenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-crimson-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">OM1</label>
 <input
 type="number"
 value={inputs.om1Stenosis}
 onChange={(e) => updateInput('om1Stenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-crimson-500"
 min="0"
 max="100"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">PDA</label>
 <input
 type="number"
 value={inputs.rcaPdaStenosis}
 onChange={(e) => updateInput('rcaPdaStenosis', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-crimson-500"
 min="0"
 max="100"
 />
 </div>
 </div>
 </div>

 <div className="p-4 bg-arterial-50 border border-arterial-200 rounded-lg">
 <h3 className="font-semibold text-arterial-800 mb-3">Lesion Characteristics</h3>
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Total Occlusions</label>
 <input
 type="number"
 value={inputs.numTotalOcclusions}
 onChange={(e) => updateInput('numTotalOcclusions', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-arterial-500"
 min="0"
 max="10"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.trifurcation}
 onChange={(e) => updateInput('trifurcation', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Trifurcation</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.aortaOstial}
 onChange={(e) => updateInput('aortaOstial', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Aorto-ostial</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.severeTortuosity}
 onChange={(e) => updateInput('severeTortuosity', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Severe tortuosity</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.lengthOver20mm}
 onChange={(e) => updateInput('lengthOver20mm', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Length {'>'}20mm</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.heavyCalcification}
 onChange={(e) => updateInput('heavyCalcification', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Heavy calcification</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={inputs.thrombus}
 onChange={(e) => updateInput('thrombus', e.target.checked)}
 className="rounded text-arterial-600"
 />
 <span className="text-sm font-medium text-titanium-700">Thrombus</span>
 </label>
 </div>
 </div>
 </div>

 {/* SYNTAX II Clinical Variables Section */}
 <div className="p-4 bg-chrome-50 border border-chrome-200 rounded-lg">
 <h3 className="font-semibold text-chrome-800 mb-3 flex items-center gap-2">
 <Target className="w-5 h-5" />
 SYNTAX II Clinical Variables
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Age (years)</label>
 <input
 type="number"
 value={clinicalInputs.age}
 onChange={(e) => updateClinicalInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 min="18"
 max="120"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Sex</label>
 <select
 value={clinicalInputs.sex}
 onChange={(e) => updateClinicalInput('sex', e.target.value)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 >
 <option value="male">Male</option>
 <option value="female">Female</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Creatinine Clearance (mL/min)</label>
 <input
 type="number"
 value={clinicalInputs.creatinineClearance}
 onChange={(e) => updateClinicalInput('creatinineClearance', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 min="0"
 max="200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">LVEF (%)</label>
 <input
 type="number"
 value={clinicalInputs.lvef}
 onChange={(e) => updateClinicalInput('lvef', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500"
 min="5"
 max="80"
 />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4 mt-4">
 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={clinicalInputs.hasCOPD}
 onChange={(e) => updateClinicalInput('hasCOPD', e.target.checked)}
 className="rounded text-chrome-600"
 />
 <span className="text-sm font-medium text-titanium-700">COPD</span>
 </label>
 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={clinicalInputs.hasPVD}
 onChange={(e) => updateClinicalInput('hasPVD', e.target.checked)}
 className="rounded text-chrome-600"
 />
 <span className="text-sm font-medium text-titanium-700">PVD</span>
 </label>
 <label className="flex items-center space-x-3 p-3 bg-white rounded-lg cursor-pointer">
 <input
 type="checkbox"
 checked={clinicalInputs.hasULMCA}
 onChange={(e) => updateClinicalInput('hasULMCA', e.target.checked)}
 className="rounded text-chrome-600"
 />
 <span className="text-sm font-medium text-titanium-700">Unprotected LMCA</span>
 </label>
 </div>
 </div>
 </div>

 {/* Results Section */}
 <div className="space-y-6">
 {/* Score Mode Toggle */}
 <div className="flex rounded-lg border border-titanium-300 overflow-hidden">
 <button
 onClick={() => setScoreMode('syntax-i')}
 className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
 scoreMode === 'syntax-i'
 ? 'bg-medical-red-600 text-white'
 : 'bg-titanium-50 text-titanium-600 hover:bg-titanium-100'
 }`}
 >
 SYNTAX I
 </button>
 <button
 onClick={() => setScoreMode('syntax-ii')}
 className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
 scoreMode === 'syntax-ii'
 ? 'bg-chrome-600 text-white'
 : 'bg-titanium-50 text-titanium-600 hover:bg-titanium-100'
 }`}
 >
 SYNTAX II
 </button>
 </div>

 {/* Anatomical Score (always shown) */}
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.riskCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Target className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">{result.riskCategory} Complexity</div>
 <div className="text-sm opacity-80">Anatomical SYNTAX Score: {result.score}</div>
 </div>
 </div>
 </div>

 {/* SYNTAX I Results */}
 {scoreMode === 'syntax-i' && (
 <>
 <div className="space-y-4">
 <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(result.pciRecommendation)}`}>
 <div className="font-semibold mb-1">PCI Recommendation</div>
 <div className="text-lg font-bold">{result.pciRecommendation}</div>
 </div>

 <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(result.cabgRecommendation)}`}>
 <div className="font-semibold mb-1">CABG Recommendation</div>
 <div className="text-lg font-bold">{result.cabgRecommendation}</div>
 </div>
 </div>

 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Route className="w-5 h-5 text-porsche-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-porsche-800">
 <div className="font-semibold mb-1">Strategy</div>
 <p>{result.revascularizationStrategy}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="flex items-start gap-2">
 <AlertTriangle className="w-5 h-5 text-titanium-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-1">Clinical Interpretation</div>
 <p>{result.interpretation}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-[#f0f5fa] border border-[#C8D4DC] rounded-lg">
 <div className="font-semibold text-[#2C4A60] mb-2">Management Recommendations</div>
 <ul className="space-y-1 text-sm text-[#2C4A60]">
 {result.recommendations.map((rec) => (
 <li key={rec} className="flex items-start gap-1">
 <div className="w-1 h-1 bg-[#2C4A60] rounded-full mt-2 flex-shrink-0"></div>
 {rec}
 </li>
 ))}
 </ul>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">SYNTAX Score Categories</div>
 <div className="space-y-1 text-xs">
 <div>Low: 0-22 points (PCI/CABG equivalent)</div>
 <div>Intermediate: 23-32 points (Heart Team decision)</div>
 <div>High: 33+ points (CABG preferred)</div>
 </div>
 </div>
 </div>
 </>
 )}

 {/* SYNTAX II Results */}
 {scoreMode === 'syntax-ii' && (
 <>
 <div className="p-5 bg-chrome-50 border-2 border-chrome-200 rounded-xl space-y-4">
 <div className="font-bold text-chrome-900 text-base">SYNTAX II Predicted 4-Year Mortality</div>

 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-white rounded-lg border border-chrome-100">
 <div className="text-xs text-titanium-500 mb-1">PCI 4-Year Mortality</div>
 <div className="text-2xl font-bold text-medical-red-600">{syntaxIIResult.pciMortality}%</div>
 </div>
 <div className="p-3 bg-white rounded-lg border border-chrome-100">
 <div className="text-xs text-titanium-500 mb-1">CABG 4-Year Mortality</div>
 <div className="text-2xl font-bold text-porsche-700">{syntaxIIResult.cabgMortality}%</div>
 </div>
 </div>

 <div className={`p-4 rounded-lg border-2 ${getStrategyColor(syntaxIIResult.recommendedStrategy)}`}>
 <div className="text-xs font-medium opacity-80 mb-1">Recommended Strategy</div>
 <div className="text-xl font-bold">
 {syntaxIIResult.recommendedStrategy === 'Either'
 ? 'Either PCI or CABG'
 : syntaxIIResult.recommendedStrategy}
 </div>
 </div>

 <div className="p-3 bg-white rounded-lg border border-chrome-100">
 <div className="text-xs text-titanium-500 mb-1">Treatment Benefit (Absolute Difference)</div>
 <div className="text-lg font-bold text-titanium-800">{syntaxIIResult.treatmentBenefit}%</div>
 </div>
 </div>

 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Route className="w-5 h-5 text-porsche-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-porsche-800">
 <div className="font-semibold mb-1">Strategy Rationale</div>
 <p>{syntaxIIResult.strategyRationale}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">Clinical Variables Summary</div>
 <div className="space-y-1 text-xs">
 <div>Age: {clinicalInputs.age} years | Sex: {clinicalInputs.sex === 'male' ? 'Male' : 'Female'}</div>
 <div>CrCl: {clinicalInputs.creatinineClearance} mL/min | LVEF: {clinicalInputs.lvef}%</div>
 <div>
 Comorbidities:{' '}
 {[
 clinicalInputs.hasCOPD && 'COPD',
 clinicalInputs.hasPVD && 'PVD',
 clinicalInputs.hasULMCA && 'ULMCA'
 ]
 .filter(Boolean)
 .join(', ') || 'None'}
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">SYNTAX II Interpretation</div>
 <div className="space-y-1 text-xs">
 <div>SYNTAX II integrates anatomical complexity (SYNTAX I) with clinical comorbidities to produce individualized treatment recommendations comparing PCI vs CABG.</div>
 <div className="mt-1">Difference within 2%: Either strategy acceptable</div>
 <div>Difference {'>'}2%: Strategy with lower predicted mortality is preferred</div>
 </div>
 </div>
 </div>
 </>
 )}

 {/* References */}
 <div className="mt-6 bg-[#F0F5FA] border border-[#C8D4DC] rounded-xl p-4">
 <p className="text-sm text-[#6B7280]">
 <strong>References:</strong> SYNTAX Trial (5-year), SYNTAX II Trial, 2021 ACC/AHA Coronary Revascularization Guideline. SYNTAX II incorporates both anatomical complexity and clinical variables for individualized treatment recommendations.
 </p>
 </div>

 {/* Disclaimer */}
 <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
 <p className="text-xs text-red-800">
 <strong>Disclaimer:</strong> This calculator is for informational and educational purposes only. Risk scores should be interpreted by qualified healthcare providers in the context of individual patient characteristics. Heart Team discussion is recommended for all complex coronary disease.
 </p>
 </div>
 </div>
 </div>
 </div>
  );
};

export default SYNTAXScoreCalculator;
