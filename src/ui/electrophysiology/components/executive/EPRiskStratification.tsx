import React, { useState } from 'react';
import { demoAction } from '../../../../utils/demoActions';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info, Zap, Shield } from 'lucide-react';

interface CHA2DS2VAScInputs {
  age: number;
  gender: 'male' | 'female';
  chf: boolean;
  hypertension: boolean;
  stroke: boolean;
  vascularDisease: boolean;
  diabetes: boolean;
}

interface HASBLEDInputs {
  hypertension: boolean;
  abnormalRenal: boolean;
  abnormalLiver: boolean;
  stroke: boolean;
  bleeding: boolean;
  labileBP: boolean;
  age65Plus: boolean;
  drugAlcohol: boolean;
}

interface RiskResult {
  cha2ds2vasc: {
 score: number;
 strokeRisk: number;
 riskCategory: 'Low' | 'Moderate' | 'High';
 recommendation: string;
  };
  hasbled: {
 score: number;
 bleedingRisk: string;
 riskCategory: 'Low' | 'Moderate' | 'High';
 recommendation: string;
  };
  overallRecommendation: string;
}

const EPRiskStratification: React.FC = () => {
  const [cha2ds2vascInputs, setCha2ds2vascInputs] = useState<CHA2DS2VAScInputs>({
 age: 65,
 gender: 'male',
 chf: false,
 hypertension: false,
 stroke: false,
 vascularDisease: false,
 diabetes: false
  });

  const [hasbledInputs, setHasbledInputs] = useState<HASBLEDInputs>({
 hypertension: false,
 abnormalRenal: false,
 abnormalLiver: false,
 stroke: false,
 bleeding: false,
 labileBP: false,
 age65Plus: false,
 drugAlcohol: false
  });

  const [selectedScore, setSelectedScore] = useState<'cha2ds2vasc' | 'hasbled' | 'both'>('both');

  const calculateCHA2DS2VASc = (): { score: number; strokeRisk: number; riskCategory: 'Low' | 'Moderate' | 'High'; recommendation: string } => {
 let score = 0;

 // Age scoring
 if (cha2ds2vascInputs.age >= 75) {
 score += 2;
 } else if (cha2ds2vascInputs.age >= 65) {
 score += 1;
 }

 // Gender (female = +1)
 if (cha2ds2vascInputs.gender === 'female') score += 1;

 // Risk factors (+1 each)
 if (cha2ds2vascInputs.chf) score += 1;
 if (cha2ds2vascInputs.hypertension) score += 1;
 if (cha2ds2vascInputs.vascularDisease) score += 1;
 if (cha2ds2vascInputs.diabetes) score += 1;

 // Stroke/TIA (+2)
 if (cha2ds2vascInputs.stroke) score += 2;

 // Stroke risk percentage based on score
 const strokeRiskTable: { [key: number]: number } = {
 0: 0.2, 1: 0.6, 2: 2.2, 3: 3.2, 4: 4.8, 5: 7.2, 6: 9.7, 7: 11.2, 8: 10.8, 9: 12.2
 };

 const strokeRisk = strokeRiskTable[Math.min(score, 9)] || 15;

 let riskCategory: 'Low' | 'Moderate' | 'High';
 let recommendation: string;

 if (score === 0) {
 riskCategory = 'Low';
 recommendation = 'No antithrombotic therapy recommended';
 } else if (score === 1) {
 riskCategory = 'Moderate';
 recommendation = 'Consider oral anticoagulant therapy';
 } else {
 riskCategory = 'High';
 recommendation = 'Oral anticoagulant therapy recommended';
 }

 return { score, strokeRisk, riskCategory, recommendation };
  };

  const calculateHASBLED = (): { score: number; bleedingRisk: string; riskCategory: 'Low' | 'Moderate' | 'High'; recommendation: string } => {
 let score = 0;

 if (hasbledInputs.hypertension) score += 1;
 if (hasbledInputs.abnormalRenal) score += 1;
 if (hasbledInputs.abnormalLiver) score += 1;
 if (hasbledInputs.stroke) score += 1;
 if (hasbledInputs.bleeding) score += 1;
 if (hasbledInputs.labileBP) score += 1;
 if (hasbledInputs.age65Plus) score += 1;
 if (hasbledInputs.drugAlcohol) score += 1;

 let bleedingRisk: string;
 let riskCategory: 'Low' | 'Moderate' | 'High';
 let recommendation: string;

 if (score <= 1) {
 bleedingRisk = '1.02-1.13 bleeds per 100 patient-years';
 riskCategory = 'Low';
 recommendation = 'Anticoagulation can be started safely';
 } else if (score === 2) {
 bleedingRisk = '1.88 bleeds per 100 patient-years';
 riskCategory = 'Moderate';
 recommendation = 'Caution advised, consider correctable risk factors';
 } else {
 bleedingRisk = '3.74+ bleeds per 100 patient-years';
 riskCategory = 'High';
 recommendation = 'Regular review, address modifiable bleeding risks';
 }

 return { score, bleedingRisk, riskCategory, recommendation };
  };

  const getOverallRecommendation = (cha2ds2vasc: any, hasbled: any): string => {
 if (cha2ds2vasc.score === 0) {
 return 'No anticoagulation needed regardless of bleeding risk';
 } else if (cha2ds2vasc.score === 1) {
 return hasbled.score >= 3 
 ? 'Consider anticoagulation with caution - address bleeding risks first'
 : 'Consider anticoagulation - benefits likely outweigh risks';
 } else {
 return hasbled.score >= 3
 ? 'Anticoagulation recommended with intensive monitoring and bleeding risk mitigation'
 : 'Anticoagulation strongly recommended - benefits outweigh bleeding risks';
 }
  };

  const cha2ds2vasc = calculateCHA2DS2VASc();
  const hasbled = calculateHASBLED();
  const overallRecommendation = getOverallRecommendation(cha2ds2vasc, hasbled);

  const updateCHA2DS2VASc = (key: keyof CHA2DS2VAScInputs, value: any) => {
 setCha2ds2vascInputs(prev => ({ ...prev, [key]: value }));
  };

  const updateHASBLED = (key: keyof HASBLEDInputs, value: any) => {
 setHasbledInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string, scoreType: string) => {
 const baseColors = {
 Low: scoreType === 'stroke' ? 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]' : 'text-[#2C4A60] bg-[#C8D4DC] border-[#2C4A60]',
 Moderate: 'text-[#6B7280] bg-[#F0F5FA] border-[#C8D4DC]',
 High: scoreType === 'stroke' ? 'text-red-600 bg-red-50 border-red-200' : 'text-red-600 bg-red-50 border-red-200'
 };
 return baseColors[category as keyof typeof baseColors] || 'text-titanium-600 bg-titanium-50 border-titanium-200';
  };

  return (
 <div className="bg-white rounded-xl shadow-glass border border-titanium-200 p-6">
 <div className="flex items-center gap-3 mb-6">
 <Calculator className="w-8 h-8 text-chrome-500" />
 <div>
 <h2 className="text-2xl font-bold text-titanium-900">EP Risk Stratification</h2>
 <p className="text-titanium-600">CHA₂DS₂-VASc Stroke Risk & HAS-BLED Bleeding Risk Assessment</p>
 </div>
 </div>

 {/* Score Selection */}
 <div className="flex gap-2 mb-6">
 <button
 onClick={() => setSelectedScore('both')}
 className={`px-4 py-2 text-sm rounded-lg transition-colors ${
 selectedScore === 'both' 
 ? 'bg-chrome-600 text-white' 
 : 'bg-titanium-100 text-titanium-600 hover:bg-titanium-200'
 }`}
 >
 Both Scores
 </button>
 <button
 onClick={() => setSelectedScore('cha2ds2vasc')}
 className={`px-4 py-2 text-sm rounded-lg transition-colors ${
 selectedScore === 'cha2ds2vasc' 
 ? 'bg-chrome-600 text-white' 
 : 'bg-titanium-100 text-titanium-600 hover:bg-titanium-200'
 }`}
 >
 CHA₂DS₂-VASc Only
 </button>
 <button
 onClick={() => setSelectedScore('hasbled')}
 className={`px-4 py-2 text-sm rounded-lg transition-colors ${
 selectedScore === 'hasbled' 
 ? 'bg-chrome-600 text-white' 
 : 'bg-titanium-100 text-titanium-600 hover:bg-titanium-200'
 }`}
 >
 HAS-BLED Only
 </button>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 {/* CHA₂DS₂-VASc Section */}
 {(selectedScore === 'both' || selectedScore === 'cha2ds2vasc') && (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <Zap className="w-5 h-5 text-chrome-600" />
 <h3 className="text-lg font-semibold text-titanium-900">CHA₂DS₂-VASc Score</h3>
 </div>

 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Age (years)</label>
 <input
 type="number"
 value={cha2ds2vascInputs.age}
 onChange={(e) => updateCHA2DS2VASc('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500 focus:border-chrome-500"
 min="18"
 max="120"
 />
 <div className="text-xs text-titanium-500 mt-1">
 65-74: +1 point, ≥75: +2 points
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-1">Gender</label>
 <select
 value={cha2ds2vascInputs.gender}
 onChange={(e) => updateCHA2DS2VASc('gender', e.target.value)}
 className="w-full px-3 py-2 text-sm border border-titanium-300 rounded-lg focus:ring-2 focus:ring-chrome-500 focus:border-chrome-500"
 >
 <option value="male">Male</option>
 <option value="female">Female (+1)</option>
 </select>
 </div>

 <div className="space-y-2">
 {[
 { key: 'chf', label: 'Heart Failure (+1)', points: 1 },
 { key: 'hypertension', label: 'Hypertension (+1)', points: 1 },
 { key: 'stroke', label: 'Stroke/TIA (+2)', points: 2 },
 { key: 'vascularDisease', label: 'Vascular Disease (+1)', points: 1 },
 { key: 'diabetes', label: 'Diabetes (+1)', points: 1 }
 ].map((item) => (
 <label 
 key={item.key}
 className="flex items-center space-x-3 p-2 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100"
 onClick={() => updateCHA2DS2VASc(item.key as keyof CHA2DS2VAScInputs, !(cha2ds2vascInputs as any)[item.key])}
 >
 <input
 type="checkbox"
 checked={(cha2ds2vascInputs as any)[item.key]}
 onChange={() => {}}
 className="rounded text-chrome-600"
 />
 <span className="text-sm text-titanium-700">{item.label}</span>
 </label>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* HAS-BLED Section */}
 {(selectedScore === 'both' || selectedScore === 'hasbled') && (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <Shield className="w-5 h-5 text-red-600" />
 <h3 className="text-lg font-semibold text-titanium-900">HAS-BLED Score</h3>
 </div>

 <div className="space-y-2">
 {[
 { key: 'hypertension', label: 'Hypertension (+1)' },
 { key: 'abnormalRenal', label: 'Abnormal Renal Function (+1)' },
 { key: 'abnormalLiver', label: 'Abnormal Liver Function (+1)' },
 { key: 'stroke', label: 'Stroke History (+1)' },
 { key: 'bleeding', label: 'Bleeding History (+1)' },
 { key: 'labileBP', label: 'Labile BP (+1)' },
 { key: 'age65Plus', label: 'Age >65 (+1)' },
 { key: 'drugAlcohol', label: 'Drugs/Alcohol (+1)' }
 ].map((item) => (
 <label 
 key={item.key}
 className="flex items-center space-x-3 p-2 bg-titanium-50 rounded-lg cursor-pointer hover:bg-titanium-100"
 onClick={() => updateHASBLED(item.key as keyof HASBLEDInputs, !(hasbledInputs as any)[item.key])}
 >
 <input
 type="checkbox"
 checked={(hasbledInputs as any)[item.key]}
 onChange={() => {}}
 className="rounded text-red-600"
 />
 <span className="text-sm text-titanium-700">{item.label}</span>
 </label>
 ))}
 </div>
 </div>
 )}

 {/* Results Section */}
 <div className="space-y-4">
 <h3 className="text-lg font-semibold text-titanium-900 flex items-center gap-2">
 <Heart className="w-5 h-5 text-[#2C4A60]" />
 Risk Assessment Results
 </h3>

 {/* CHA₂DS₂-VASc Results */}
 {(selectedScore === 'both' || selectedScore === 'cha2ds2vasc') && (
 <div 
 className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all ${getRiskColor(cha2ds2vasc.riskCategory, 'stroke')}`}
 onClick={demoAction()}
 >
 <div className="flex items-center gap-2 mb-2">
 <Zap className="w-5 h-5" />
 <div className="font-bold">Stroke Risk - {cha2ds2vasc.riskCategory}</div>
 </div>
 <div className="text-sm opacity-90 mb-2">Score: {cha2ds2vasc.score}</div>
 <div className="text-lg font-semibold">{cha2ds2vasc.strokeRisk}%/year</div>
 <div className="text-sm mt-2 opacity-90">{cha2ds2vasc.recommendation}</div>
 </div>
 )}

 {/* HAS-BLED Results */}
 {(selectedScore === 'both' || selectedScore === 'hasbled') && (
 <div 
 className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all ${getRiskColor(hasbled.riskCategory, 'bleeding')}`}
 onClick={demoAction()}
 >
 <div className="flex items-center gap-2 mb-2">
 <Shield className="w-5 h-5" />
 <div className="font-bold">Bleeding Risk - {hasbled.riskCategory}</div>
 </div>
 <div className="text-sm opacity-90 mb-2">Score: {hasbled.score}</div>
 <div className="text-sm font-medium">{hasbled.bleedingRisk}</div>
 <div className="text-sm mt-2 opacity-90">{hasbled.recommendation}</div>
 </div>
 )}

 {/* Overall Recommendation */}
 {selectedScore === 'both' && (
 <div className="p-4 bg-chrome-50 border border-chrome-200 rounded-lg">
 <div className="flex items-start gap-2">
 <Info className="w-5 h-5 text-chrome-600 mt-0.5 flex-shrink-0" />
 <div className="text-sm text-chrome-800">
 <div className="font-semibold mb-1">Overall Recommendation</div>
 <p>{overallRecommendation}</p>
 </div>
 </div>
 </div>
 )}

 {/* Risk Score Tables */}
 <div className="space-y-3">
 {(selectedScore === 'both' || selectedScore === 'cha2ds2vasc') && (
 <div className="p-3 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">CHA₂DS₂-VASc Categories</div>
 <div className="space-y-1 text-xs">
 <div>• Score 0: Low risk (0.2%/year)</div>
 <div>• Score 1: Moderate risk (0.6%/year)</div>
 <div>• Score ≥2: High risk (≥2.2%/year)</div>
 </div>
 </div>
 </div>
 )}

 {(selectedScore === 'both' || selectedScore === 'hasbled') && (
 <div className="p-3 bg-titanium-50 border border-titanium-200 rounded-lg">
 <div className="text-sm text-titanium-700">
 <div className="font-semibold mb-2">HAS-BLED Categories</div>
 <div className="space-y-1 text-xs">
 <div>• Score 0-1: Low bleeding risk</div>
 <div>• Score 2: Moderate bleeding risk</div>
 <div>• Score ≥3: High bleeding risk</div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
  );
};

export default EPRiskStratification;