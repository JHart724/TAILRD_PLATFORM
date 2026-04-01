import React, { useState, useEffect } from 'react';
import { Droplets, AlertTriangle, CheckCircle, Info, BookOpen } from 'lucide-react';

interface ORBITInputs {
  age: number;
  male: boolean;
  hemoglobin: number;
  hematocrit: number;
  renalInsufficiency: boolean;
  bleedingHistory: boolean;
}

interface ORBITRisk {
  score: number;
  bleedingRisk: 'Low' | 'Medium' | 'High';
  annualBleedingRate: string;
  color: string;
  interpretation: string;
  recommendations: string[];
}

const ORBITBleedingCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<ORBITInputs>({
 age: 70,
 male: true,
 hemoglobin: 13.5,
 hematocrit: 40,
 renalInsufficiency: false,
 bleedingHistory: false
  });

  const [result, setResult] = useState<ORBITRisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const calculateORBIT = (inputs: ORBITInputs): ORBITRisk => {
 let score = 0;

 // Age ≥75 years (2 points)
 if (inputs.age >= 75) score += 2;

 // Reduced hemoglobin/hematocrit
 const reducedHgbHct = inputs.male 
 ? (inputs.hemoglobin < 13 || inputs.hematocrit < 40)
 : (inputs.hemoglobin < 12 || inputs.hematocrit < 36);
 
 if (reducedHgbHct) score += 2;

 // Bleeding history (2 points)
 if (inputs.bleedingHistory) score += 2;

 // Renal insufficiency (1 point)
 if (inputs.renalInsufficiency) score += 1;

 // Treatment with antiplatelets (1 point) - not included in this simplified version

 let bleedingRisk: 'Low' | 'Medium' | 'High';
 let annualBleedingRate: string;
 let color: string;
 let interpretation: string;
 let recommendations: string[];

 if (score <= 2) {
 bleedingRisk = 'Low';
 annualBleedingRate = '2.4% per year';
 color = 'chrome-blue';
 interpretation = 'Low risk of major bleeding with anticoagulation. Benefits likely outweigh risks.';
 recommendations = [
 'Anticoagulation recommended if CHA2DS2-VASc ≥2',
 'Consider DOAC as first-line therapy',
 'Standard monitoring intervals',
 'Patient education on bleeding precautions',
 'Regular follow-up every 3-6 months'
 ];
 } else if (score <= 4) {
 bleedingRisk = 'Medium';
 annualBleedingRate = '4.7% per year';
 color = 'crimson';
 interpretation = 'Moderate bleeding risk. Careful risk-benefit assessment required.';
 recommendations = [
 'Consider bleeding vs. stroke risk ratio',
 'Optimize modifiable bleeding risk factors',
 'Consider DOAC with lower bleeding risk',
 'More frequent monitoring (every 2-3 months)',
 'Patient counseling on bleeding recognition',
 'Consider left atrial appendage occlusion if high stroke risk'
 ];
 } else {
 bleedingRisk = 'High';
 annualBleedingRate = '8.1% per year';
 color = 'medical-red';
 interpretation = 'High bleeding risk. Consider alternatives to anticoagulation or very careful monitoring.';
 recommendations = [
 'Detailed risk-benefit discussion with patient',
 'Consider left atrial appendage occlusion',
 'Optimize all modifiable bleeding risk factors',
 'If anticoagulation chosen: lowest effective dose',
 'Very frequent monitoring (monthly initially)',
 'Consider hematology consultation',
 'Emergency action plan for bleeding'
 ];
 }

 return {
 score,
 bleedingRisk,
 annualBleedingRate,
 color,
 interpretation,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateORBIT(inputs));
  }, [inputs]);

  const updateInput = (field: keyof ORBITInputs, value: any) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="retina-card p-6">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-medical-red-100 rounded-xl flex items-center justify-center">
 <Droplets className="w-6 h-6 text-medical-red-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">ORBIT Bleeding Score</h3>
 <p className="text-titanium-600">Anticoagulation Bleeding Risk Assessment</p>
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
 <div className="lg:col-span-2">
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">ORBIT Risk Factors</h4>
 
 <div className="space-y-6">
 {/* Demographics */}
 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">Demographics</h5>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="18"
 max="100"
 />
 <div className="text-xs text-titanium-600 mt-1">
 ≥75 years = 2 points
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Gender</label>
 <div className="flex items-center space-x-4">
 <div className="flex items-center">
 <input
 type="radio"
 id="male"
 checked={inputs.male}
 onChange={() => updateInput('male', true)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300"
 />
 <label htmlFor="male" className="ml-2 text-sm text-titanium-700">Male</label>
 </div>
 <div className="flex items-center">
 <input
 type="radio"
 id="female"
 checked={!inputs.male}
 onChange={() => updateInput('male', false)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300"
 />
 <label htmlFor="female" className="ml-2 text-sm text-titanium-700">Female</label>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Laboratory Values */}
 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">Laboratory Values</h5>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Hemoglobin (g/dL)</label>
 <input
 type="number"
 value={inputs.hemoglobin}
 onChange={(e) => updateInput('hemoglobin', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="5"
 max="20"
 step="0.1"
 />
 <div className="text-xs text-titanium-600 mt-1">
 Male: &lt;13 g/dL = 2 points<br />
 Female: &lt;12 g/dL = 2 points
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Hematocrit (%)</label>
 <input
 type="number"
 value={inputs.hematocrit}
 onChange={(e) => updateInput('hematocrit', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 min="15"
 max="60"
 step="0.1"
 />
 <div className="text-xs text-titanium-600 mt-1">
 Male: &lt;40% = 2 points<br />
 Female: &lt;36% = 2 points
 </div>
 </div>
 </div>
 </div>

 {/* Clinical History */}
 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">Clinical History</h5>
 <div className="space-y-4">
 <div className="p-4 border border-titanium-200 rounded-xl bg-white">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="bleedingHistory"
 checked={inputs.bleedingHistory}
 onChange={(e) => updateInput('bleedingHistory', e.target.checked)}
 className="h-5 w-5 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded mt-0.5"
 />
 <div>
 <label htmlFor="bleedingHistory" className="text-sm font-medium text-titanium-900 cursor-pointer">
 Bleeding History
 </label>
 <p className="text-xs text-titanium-600 mt-1">
 History of major bleeding or clinically relevant bleeding
 </p>
 </div>
 </div>
 <div className="text-sm font-bold text-titanium-600 bg-titanium-100 px-2 py-1 rounded">
 2 pts
 </div>
 </div>
 </div>

 <div className="p-4 border border-titanium-200 rounded-xl bg-white">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 id="renalInsufficiency"
 checked={inputs.renalInsufficiency}
 onChange={(e) => updateInput('renalInsufficiency', e.target.checked)}
 className="h-5 w-5 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded mt-0.5"
 />
 <div>
 <label htmlFor="renalInsufficiency" className="text-sm font-medium text-titanium-900 cursor-pointer">
 Renal Insufficiency
 </label>
 <p className="text-xs text-titanium-600 mt-1">
 CrCl &lt;60 mL/min or dialysis
 </p>
 </div>
 </div>
 <div className="text-sm font-bold text-titanium-600 bg-titanium-100 px-2 py-1 rounded">
 1 pt
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 bg-titanium-50 rounded-xl">
 <h5 className="font-semibold text-titanium-900 mb-2">ORBIT Components</h5>
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div><strong>O</strong>lder (≥75 years)</div>
 <div><strong>R</strong>educed Hgb/Hct</div>
 <div><strong>B</strong>leeding history</div>
 <div><strong>I</strong>nsufficient kidney function</div>
 <div><strong>T</strong>reatment with antiplatelets*</div>
 <div className="text-xs text-titanium-600 col-span-2 mt-1">*Antiplatelet component not included in this calculator</div>
 </div>
 </div>
 </div>
 </div>

 <div>
 {result && (
 <div className="space-y-4">
 <div className={`p-6 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.color}-600 mb-2`}>
 {result.score}
 </div>
 <div className="text-sm font-medium text-titanium-600">ORBIT Score</div>
 </div>
 
 <div className="text-center">
 <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.bleedingRisk === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.bleedingRisk === 'Medium' && <Info className="w-4 h-4" />}
 {result.bleedingRisk === 'High' && <AlertTriangle className="w-4 h-4" />}
 {result.bleedingRisk} Risk
 </div>
 <div className="text-sm text-titanium-600 mt-2">{result.annualBleedingRate}</div>
 </div>
 </div>

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Interpretation</h5>
 <p className="text-sm text-titanium-700">{result.interpretation}</p>
 </div>

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

 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Factors Present</h5>
 <div className="space-y-1 text-sm">
 {inputs.age >= 75 && (
 <div className="flex justify-between">
 <span>Age ≥75 years</span>
 <span className="font-bold">+2</span>
 </div>
 )}
 {((inputs.male && (inputs.hemoglobin < 13 || inputs.hematocrit < 40)) ||
 (!inputs.male && (inputs.hemoglobin < 12 || inputs.hematocrit < 36))) && (
 <div className="flex justify-between">
 <span>Reduced Hgb/Hct</span>
 <span className="font-bold">+2</span>
 </div>
 )}
 {inputs.bleedingHistory && (
 <div className="flex justify-between">
 <span>Bleeding History</span>
 <span className="font-bold">+2</span>
 </div>
 )}
 {inputs.renalInsufficiency && (
 <div className="flex justify-between">
 <span>Renal Insufficiency</span>
 <span className="font-bold">+1</span>
 </div>
 )}
 {result.score === 0 && (
 <div className="text-titanium-600 italic">No major risk factors present</div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {showGuidelines && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-xl font-bold text-titanium-900">ORBIT Bleeding Score Guidelines</h4>
 <button onClick={() => setShowGuidelines(false)} className="p-2 hover:bg-titanium-100 rounded-lg">×</button>
 </div>
 
 <div className="space-y-4">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Stratification</h5>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between p-2 bg-[#F0F7F4] rounded">
 <span>Low Risk (0-2 points)</span>
 <span className="font-semibold text-[#2C4A60]">2.4%/year bleeding</span>
 </div>
 <div className="flex justify-between p-2 bg-[#F0F5FA] rounded">
 <span>Medium Risk (3-4 points)</span>
 <span className="font-semibold text-[#8B6914]">4.7%/year bleeding</span>
 </div>
 <div className="flex justify-between p-2 bg-red-50 rounded">
 <span>High Risk (5-7 points)</span>
 <span className="font-semibold text-red-700">8.1%/year bleeding</span>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">ORBIT Risk Factors</h5>
 <div className="space-y-2 text-sm">
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">O - Older age (≥75 years): 2 points</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">R - Reduced hemoglobin/hematocrit: 2 points</div>
 <div className="text-xs text-titanium-600">Male: Hgb &lt;13 g/dL or Hct &lt;40%</div>
 <div className="text-xs text-titanium-600">Female: Hgb &lt;12 g/dL or Hct &lt;36%</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">B - Bleeding history: 2 points</div>
 <div className="text-xs text-titanium-600">Prior major bleeding or clinically relevant bleeding</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">I - Insufficient kidney function: 1 point</div>
 <div className="text-xs text-titanium-600">CrCl &lt;60 mL/min or dialysis</div>
 </div>
 <div className="p-2 bg-titanium-50 rounded">
 <div className="font-medium">T - Treatment with antiplatelets: 1 point</div>
 <div className="text-xs text-titanium-600">Concurrent antiplatelet therapy</div>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Applications</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Risk-benefit assessment for AF anticoagulation</li>
 <li>• Guide frequency of monitoring</li>
 <li>• Consider DOAC vs. warfarin selection</li>
 <li>• Identify patients for LAA occlusion</li>
 <li>• Optimize modifiable bleeding risk factors</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Modifiable Risk Factors</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Anemia correction</li>
 <li>• Blood pressure optimization</li>
 <li>• Minimize antiplatelet therapy duration</li>
 <li>• PPI for GI bleeding risk</li>
 <li>• Alcohol moderation</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">References</h5>
 <div className="text-sm text-titanium-700">
 <p>O'Brien EC, et al. The ORBIT bleeding score: a simple bedside score to assess bleeding risk in atrial fibrillation. Eur Heart J. 2015.</p>
 <p className="mt-1">2019 AHA/ACC/HRS AF Guideline</p>
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

export default ORBITBleedingCalculator;