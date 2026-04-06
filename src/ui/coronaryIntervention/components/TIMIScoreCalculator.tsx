import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, Timer } from 'lucide-react';
import { PatientContext } from '../../../types/shared';

interface TIMIInputs {
  age: number;
  riskFactors: number; // 0-3+ (HTN, DM, FHx, smoker, hyperlipidemia)
  knownCAD: boolean;
  aspirinUse: boolean;
  severeAngina: boolean; // ≥2 episodes in 24h
  stDeviation: boolean;
  elevatedBiomarkers: boolean;
}

interface TIMIResult {
  score: number;
  fourteenDayRisk: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  interpretation: string;
  recommendations: string[];
  antiplateletTherapy: string;
  invasiveStrategy: string;
}

const TIMIScoreCalculator: React.FC<{ patientData?: PatientContext }> = ({ patientData }) => {
  const [inputs, setInputs] = useState<TIMIInputs>({
 age: patientData?.age ?? 65,
 riskFactors: 2,
 knownCAD: patientData?.cad ?? false,
 aspirinUse: false,
 severeAngina: false,
 stDeviation: false,
 elevatedBiomarkers: true
  });

  const calculateTIMI = (): TIMIResult => {
 let score = 0;

 // Age ≥65 years (1 point)
 if (inputs.age >= 65) score += 1;

 // ≥3 risk factors for CAD (1 point)
 if (inputs.riskFactors >= 3) score += 1;

 // Known CAD (stenosis ≥50%) (1 point)
 if (inputs.knownCAD) score += 1;

 // Aspirin use in prior 7 days (1 point)
 if (inputs.aspirinUse) score += 1;

 // Severe angina (≥2 episodes in 24h) (1 point)
 if (inputs.severeAngina) score += 1;

 // ST deviation ≥0.5mm (1 point)
 if (inputs.stDeviation) score += 1;

 // Elevated cardiac biomarkers (1 point)
 if (inputs.elevatedBiomarkers) score += 1;

 // Calculate 14-day risk of death, MI, or severe recurrent ischemia
 let fourteenDayRisk: number;
 if (score === 0) fourteenDayRisk = 4.7;
 else if (score === 1) fourteenDayRisk = 8.3;
 else if (score === 2) fourteenDayRisk = 13.2;
 else if (score === 3) fourteenDayRisk = 19.9;
 else if (score === 4) fourteenDayRisk = 26.2;
 else if (score === 5) fourteenDayRisk = 40.9;
 else if (score >= 6) fourteenDayRisk = 40.9;
 else fourteenDayRisk = 4.7;

 let riskCategory: 'Low' | 'Intermediate' | 'High';
 let interpretation: string;
 let recommendations: string[];
 let antiplateletTherapy: string;
 let invasiveStrategy: string;

 if (score <= 2) {
 riskCategory = 'Low';
 interpretation = 'Low risk of adverse outcomes. Conservative management appropriate.';
 recommendations = [
 'Medical management with dual antiplatelet therapy',
 'High-intensity statin therapy',
 'Beta-blocker and ACE inhibitor as indicated',
 'Risk factor modification'
 ];
 antiplateletTherapy = 'Aspirin + Clopidogrel';
 invasiveStrategy = 'Conservative management, angiography if clinically indicated';
 } else if (score <= 4) {
 riskCategory = 'Intermediate';
 interpretation = 'Intermediate risk. Consider early invasive strategy.';
 recommendations = [
 'Consider early invasive strategy within 24-72 hours',
 'Dual antiplatelet therapy with potent P2Y12 inhibitor',
 'Anticoagulation during hospitalization',
 'High-intensity statin therapy'
 ];
 antiplateletTherapy = 'Aspirin + Ticagrelor or Prasugrel';
 invasiveStrategy = 'Consider invasive strategy within 24-72 hours';
 } else {
 riskCategory = 'High';
 interpretation = 'High risk. Early invasive strategy recommended.';
 recommendations = [
 'Early invasive strategy within 24 hours',
 'Potent dual antiplatelet therapy',
 'GP IIb/IIIa inhibitor consideration during PCI',
 'Intensive monitoring and management'
 ];
 antiplateletTherapy = 'Aspirin + Ticagrelor (preferred)';
 invasiveStrategy = 'Early invasive strategy within 24 hours';
 }

 return {
 score,
 fourteenDayRisk: Math.round(fourteenDayRisk * 10) / 10,
 riskCategory,
 interpretation,
 recommendations,
 antiplateletTherapy,
 invasiveStrategy
 };
  };

  const result = calculateTIMI();

  const updateInput = (key: keyof TIMIInputs, value: any) => {
 setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
 switch (category) {
 case 'Low': return 'text-green-600 bg-green-50 border-green-100';
 case 'Intermediate': return 'text-crimson-600 bg-crimson-50 border-crimson-200';
 case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
 default: return 'text-titanium-600 bg-titanium-50 border-titanium-200';
 }
  };

  return (
 <div className="metal-card p-8">
 <div className="flex items-center gap-3 mb-6">
 <Calculator className="w-8 h-8 text-crimson-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900 font-sf">TIMI Risk Score</h2>
 <p className="text-titanium-600">For UA/NSTEMI Risk Assessment</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Input Section */}
 <div className="lg:col-span-2 space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500"
 min="18"
 max="120"
 />
 <p className="text-xs text-titanium-600 mt-1">1 point if ≥65 years</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">CAD Risk Factors</label>
 <select
 value={inputs.riskFactors}
 onChange={(e) => updateInput('riskFactors', parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-crimson-500 focus:border-crimson-500"
 >
 <option value={0}>0 risk factors</option>
 <option value={1}>1 risk factor</option>
 <option value={2}>2 risk factors</option>
 <option value={3}>3+ risk factors</option>
 </select>
 <p className="text-xs text-titanium-600 mt-1">HTN, DM, FHx, smoking, hyperlipidemia</p>
 </div>
 </div>

 <div className="space-y-4">
 <div className="text-sm font-medium text-titanium-700 mb-3">Clinical Factors (1 point each)</div>

 <label className="flex items-center space-x-3 p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input
 type="checkbox"
 checked={inputs.knownCAD}
 onChange={(e) => updateInput('knownCAD', e.target.checked)}
 className="rounded text-crimson-600"
 />
 <span className="text-sm font-medium text-titanium-700">Known CAD (stenosis ≥50%)</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input
 type="checkbox"
 checked={inputs.aspirinUse}
 onChange={(e) => updateInput('aspirinUse', e.target.checked)}
 className="rounded text-crimson-600"
 />
 <span className="text-sm font-medium text-titanium-700">Aspirin use in prior 7 days</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100">
 <input
 type="checkbox"
 checked={inputs.severeAngina}
 onChange={(e) => updateInput('severeAngina', e.target.checked)}
 className="rounded text-crimson-600"
 />
 <span className="text-sm font-medium text-titanium-700">Severe angina (≥2 episodes in 24h)</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-medical-red-50 rounded-lg cursor-pointer hover:bg-medical-red-100">
 <input
 type="checkbox"
 checked={inputs.stDeviation}
 onChange={(e) => updateInput('stDeviation', e.target.checked)}
 className="rounded text-medical-red-600"
 />
 <span className="text-sm font-medium text-titanium-700">ST deviation ≥0.5mm</span>
 </label>

 <label className="flex items-center space-x-3 p-3 bg-medical-red-50 rounded-lg cursor-pointer hover:bg-medical-red-100">
 <input
 type="checkbox"
 checked={inputs.elevatedBiomarkers}
 onChange={(e) => updateInput('elevatedBiomarkers', e.target.checked)}
 className="rounded text-medical-red-600"
 />
 <span className="text-sm font-medium text-titanium-700">Elevated cardiac biomarkers</span>
 </label>
 </div>
 </div>

 {/* Results Section */}
 <div className="space-y-6">
 <div className={`p-6 rounded-xl border-2 ${getRiskColor(result.riskCategory)}`}>
 <div className="flex items-center gap-3 mb-4">
 <Heart className="w-6 h-6" />
 <div>
 <div className="font-bold text-lg">{result.riskCategory} Risk</div>
 <div className="text-sm opacity-80">TIMI Score: {result.score}/7</div>
 </div>
 </div>

 <div className="space-y-3">
 <div>
 <div className="text-sm opacity-80">14-Day Event Risk</div>
 <div className="text-2xl font-bold">{result.fourteenDayRisk}%</div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-porsche-50 border border-porsche-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Info className="w-5 h-5 text-porsche-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-porsche-800">
 <div className="font-semibold mb-1">Clinical Interpretation</div>
 <p>{result.interpretation}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-chrome-50 border border-titanium-300 rounded-lg">
 <div className="flex items-start gap-2">
 <CheckCircle className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-teal-700">
 <div className="font-semibold mb-1">Antiplatelet Therapy</div>
 <p>{result.antiplateletTherapy}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-crimson-50 border border-crimson-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Timer className="w-5 h-5 text-crimson-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-crimson-700">
 <div className="font-semibold mb-1">Invasive Strategy</div>
 <p>{result.invasiveStrategy}</p>
 </div>
 </div>
 </div>

 <div className="p-4 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">Risk Categories</div>
 <div className="space-y-1 text-xs">
 <div>• Low: 0-2 points (4.7-13.2% risk)</div>
 <div>• Intermediate: 3-4 points (19.9-26.2% risk)</div>
 <div>• High: 5-7 points (≥40.9% risk)</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default TIMIScoreCalculator;
