import React, { useState, useEffect } from 'react';
import { Heart, AlertTriangle, CheckCircle, Info, BookOpen } from 'lucide-react';

interface GRACEInputs {
  age: number;
  heartRate: number;
  systolicBP: number;
  creatinine: number;
  cardiacArrest: boolean;
  stElevation: boolean;
  elevatedMarkers: boolean;
  killipClass: number;
}

interface GRACERisk {
  score: number;
  riskCategory: 'Low' | 'Intermediate' | 'High';
  mortalityRisk: string;
  color: string;
  interpretation: string;
  recommendations: string[];
}

const GRACEScoreCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<GRACEInputs>({
 age: 65,
 heartRate: 80,
 systolicBP: 140,
 creatinine: 1.0,
 cardiacArrest: false,
 stElevation: false,
 elevatedMarkers: false,
 killipClass: 1
  });

  const [result, setResult] = useState<GRACERisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const calculateGRACE = (inputs: GRACEInputs): GRACERisk => {
 let score = 0;

 // Age scoring
 if (inputs.age < 30) score += 0;
 else if (inputs.age < 40) score += 8;
 else if (inputs.age < 50) score += 25;
 else if (inputs.age < 60) score += 41;
 else if (inputs.age < 70) score += 58;
 else if (inputs.age < 80) score += 75;
 else score += 91;

 // Heart rate scoring
 if (inputs.heartRate < 50) score += 0;
 else if (inputs.heartRate < 70) score += 3;
 else if (inputs.heartRate < 90) score += 9;
 else if (inputs.heartRate < 110) score += 15;
 else if (inputs.heartRate < 150) score += 24;
 else if (inputs.heartRate < 200) score += 38;
 else score += 46;

 // Systolic BP scoring  
 if (inputs.systolicBP < 80) score += 58;
 else if (inputs.systolicBP < 100) score += 53;
 else if (inputs.systolicBP < 120) score += 43;
 else if (inputs.systolicBP < 140) score += 34;
 else if (inputs.systolicBP < 160) score += 24;
 else if (inputs.systolicBP < 200) score += 10;
 else score += 0;

 // Creatinine scoring
 if (inputs.creatinine < 0.4) score += 1;
 else if (inputs.creatinine < 0.8) score += 4;
 else if (inputs.creatinine < 1.2) score += 7;
 else if (inputs.creatinine < 1.6) score += 10;
 else if (inputs.creatinine < 2.0) score += 13;
 else if (inputs.creatinine < 4.0) score += 21;
 else score += 28;

 // Killip class
 if (inputs.killipClass === 1) score += 0;
 else if (inputs.killipClass === 2) score += 20;
 else if (inputs.killipClass === 3) score += 39;
 else score += 59;

 // Cardiac arrest at admission
 if (inputs.cardiacArrest) score += 39;

 // ST segment deviation
 if (inputs.stElevation) score += 28;

 // Elevated cardiac markers
 if (inputs.elevatedMarkers) score += 14;

 // Risk categorization
 let riskCategory: 'Low' | 'Intermediate' | 'High';
 let mortalityRisk: string;
 let color: string;
 let interpretation: string;
 let recommendations: string[];

 if (score <= 108) {
 riskCategory = 'Low';
 mortalityRisk = '< 1%';
 color = 'chrome-blue';
 interpretation = 'Low risk of in-hospital mortality. Conservative management appropriate.';
 recommendations = [
 'Conservative medical management',
 'Dual antiplatelet therapy',
 'Consider early discharge',
 'Outpatient cardiology follow-up'
 ];
 } else if (score <= 140) {
 riskCategory = 'Intermediate';
 mortalityRisk = '1-3%';
 color = 'crimson';
 interpretation = 'Intermediate risk of in-hospital mortality. Consider early invasive strategy.';
 recommendations = [
 'Early invasive strategy within 24-72 hours',
 'Dual antiplatelet therapy + anticoagulation',
 'Cardiology consultation',
 'Monitor for complications'
 ];
 } else {
 riskCategory = 'High';
 mortalityRisk = '> 3%';
 color = 'medical-red';
 interpretation = 'High risk of in-hospital mortality. Urgent invasive management indicated.';
 recommendations = [
 'Urgent invasive strategy within 24 hours',
 'Intensive antiplatelet/anticoagulation',
 'Immediate cardiology consultation',
 'Consider mechanical support if indicated'
 ];
 }

 return {
 score,
 riskCategory,
 mortalityRisk,
 color,
 interpretation,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateGRACE(inputs));
  }, [inputs]);

  const updateInput = (field: keyof GRACEInputs, value: any) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="retina-card p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-medical-red-100 rounded-xl flex items-center justify-center">
 <Heart className="w-6 h-6 text-medical-red-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">GRACE Score Calculator</h3>
 <p className="text-titanium-600">Acute Coronary Syndrome Risk Assessment</p>
 </div>
 </div>
 <button
 onClick={() => setShowGuidelines(!showGuidelines)}
 className="flex items-center gap-2 px-4 py-2 bg-titanium-100 hover:bg-titanium-200 rounded-lg transition-colors"
 >
 <BookOpen className="w-4 h-4" />
 Guidelines
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Input Form */}
 <div className="lg:col-span-2">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Clinical Parameters</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 {/* Age */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Age (years)
 </label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="18"
 max="100"
 />
 </div>

 {/* Heart Rate */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Heart Rate (bpm)
 </label>
 <input
 type="number"
 value={inputs.heartRate}
 onChange={(e) => updateInput('heartRate', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="30"
 max="250"
 />
 </div>

 {/* Systolic BP */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Systolic BP (mmHg)
 </label>
 <input
 type="number"
 value={inputs.systolicBP}
 onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="60"
 max="250"
 />
 </div>

 {/* Creatinine */}
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Creatinine (mg/dL)
 </label>
 <input
 type="number"
 value={inputs.creatinine}
 onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="0.1"
 max="10"
 step="0.1"
 />
 </div>

 {/* Killip Class */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-titanium-700 mb-2">
 Killip Class
 </label>
 <select
 value={inputs.killipClass}
 onChange={(e) => updateInput('killipClass', parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 >
 <option value={1}>Class I - No heart failure</option>
 <option value={2}>Class II - Mild heart failure (rales, S3)</option>
 <option value={3}>Class III - Pulmonary edema</option>
 <option value={4}>Class IV - Cardiogenic shock</option>
 </select>
 </div>
 </div>

 {/* Checkboxes */}
 <div className="space-y-3">
 <div className="flex items-center">
 <input
 type="checkbox"
 id="cardiacArrest"
 checked={inputs.cardiacArrest}
 onChange={(e) => updateInput('cardiacArrest', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="cardiacArrest" className="ml-2 text-sm text-titanium-700">
 Cardiac arrest at admission
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="stElevation"
 checked={inputs.stElevation}
 onChange={(e) => updateInput('stElevation', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="stElevation" className="ml-2 text-sm text-titanium-700">
 ST segment elevation or depression
 </label>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="elevatedMarkers"
 checked={inputs.elevatedMarkers}
 onChange={(e) => updateInput('elevatedMarkers', e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor="elevatedMarkers" className="ml-2 text-sm text-titanium-700">
 Elevated cardiac biomarkers
 </label>
 </div>
 </div>
 </div>

 {/* Results Panel */}
 <div>
 {result && (
 <div className="space-y-4">
 {/* Score Display */}
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.score}
 </div>
 <div className="text-sm font-medium text-titanium-600">GRACE Score</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.riskCategory === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.riskCategory === 'Intermediate' && <Info className="w-4 h-4" />}
 {result.riskCategory === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.riskCategory} Risk
 </div>
 <div className="text-sm text-titanium-600 mt-2">
 {result.mortalityRisk} in-hospital mortality
 </div>
 </div>
 </div>

 {/* Interpretation */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Interpretation</h5>
 <p className="text-sm text-titanium-700">{result.interpretation}</p>
 </div>

 {/* Recommendations */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Management Recommendations</h5>
 <div className="space-y-2">
 {result.recommendations.map((rec, index) => (
 <div key={rec} className="flex items-start gap-2">
 <div className={`w-2 h-2 rounded-full bg-${result.color}-500 flex-shrink-0 mt-1.5`}></div>
 <span className="text-sm text-titanium-700">{rec}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Guidelines Modal */}
 {showGuidelines && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-xl font-bold text-titanium-900">GRACE Score Guidelines</h4>
 <button
 onClick={() => setShowGuidelines(false)}
 className="p-2 hover:bg-titanium-100 rounded-lg"
 >
 ×
 </button>
 </div>
 
 <div className="space-y-4">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Stratification</h5>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between p-2 bg-green-50 rounded">
 <span>Low Risk (≤108)</span>
 <span className="font-semibold text-green-600">&lt;1% mortality</span>
 </div>
 <div className="flex justify-between p-2 bg-chrome-50 rounded">
 <span>Intermediate Risk (109-140)</span>
 <span className="font-semibold text-amber-600">1-3% mortality</span>
 </div>
 <div className="flex justify-between p-2 bg-red-50 rounded">
 <span>High Risk (&gt;140)</span>
 <span className="font-semibold text-red-700">&gt;3% mortality</span>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Applications</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Validated for NSTEMI and unstable angina</li>
 <li>• Guides timing of invasive strategy</li>
 <li>• Risk assessment for bleeding vs. ischemic benefit</li>
 <li>• Quality metric for appropriate care</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">References</h5>
 <div className="text-sm text-titanium-700">
 <p>2020 ESC Guidelines for the management of acute coronary syndromes in patients presenting without persistent ST-segment elevation</p>
 <p className="mt-1">2014 AHA/ACC Guideline for the Management of Patients with Non-ST-Elevation Acute Coronary Syndromes</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
  );
};

export default GRACEScoreCalculator;