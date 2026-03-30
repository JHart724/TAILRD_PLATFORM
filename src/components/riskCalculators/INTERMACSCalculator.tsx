import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, BookOpen, Zap } from 'lucide-react';

interface INTERMACSProfile {
  level: number;
  title: string;
  description: string;
  survival: string;
  urgency: 'Critical' | 'Urgent' | 'Elective';
  color: string;
  recommendations: string[];
  contraindications?: string[];
}

interface INTERMACSInputs {
  currentProfile: number;
  age: number;
  bmi: number;
  creatinine: number;
  bilirubin: number;
  albumin: number;
  sodium: number;
  prealbumin: number;
  plateletCount: number;
  inotropeDependent: boolean;
  mechanicalVentilation: boolean;
  dialysis: boolean;
  pvd: boolean;
  previousSternotomy: boolean;
  psychosocial: boolean;
}

interface INTERMACSRisk {
  profile: INTERMACSProfile;
  riskScore: number;
  riskCategory: 'Low' | 'Intermediate' | 'High' | 'Prohibitive';
  color: string;
  survivelEstimate: string;
  recommendations: string[];
}

const INTERMACSCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<INTERMACSInputs>({
 currentProfile: 3,
 age: 55,
 bmi: 25,
 creatinine: 1.5,
 bilirubin: 1.2,
 albumin: 3.5,
 sodium: 135,
 prealbumin: 18,
 plateletCount: 200,
 inotropeDependent: false,
 mechanicalVentilation: false,
 dialysis: false,
 pvd: false,
 previousSternotomy: false,
 psychosocial: false
  });

  const [result, setResult] = useState<INTERMACSRisk | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const intermicsProfiles: INTERMACSProfile[] = [
 {
 level: 1,
 title: "Critical Cardiogenic Shock",
 description: "Life-threatening hypotension despite rapidly escalating inotropic support, critical organ hypoperfusion, often with mechanical ventilation",
 survival: "<50% at 1 year",
 urgency: 'Critical',
 color: 'medical-red',
 recommendations: [
 'Immediate MCS evaluation (ECMO, Impella)',
 'Urgent LVAD or transplant workup',
 'Critical care management',
 'Family conference regarding prognosis'
 ],
 contraindications: ['Multiorgan failure', 'Fixed pulmonary hypertension', 'Active infection']
 },
 {
 level: 2,
 title: "Progressive Decline",
 description: "Similar to profile 1 but patient has been stabilized with inotropic or temporary MCS support",
 survival: "50-70% at 1 year",
 urgency: 'Critical',
 color: 'medical-red',
 recommendations: [
 'Urgent LVAD evaluation',
 'Transplant evaluation if appropriate',
 'Optimize hemodynamics',
 'Infection control'
 ],
 contraindications: ['Uncontrolled infection', 'Irreversible end-organ dysfunction']
 },
 {
 level: 3,
 title: "Stable on Inotropes",
 description: "Stable on mild-moderate inotropic support but attempts to wean result in symptomatic hypotension",
 survival: "70-80% at 1 year",
 urgency: 'Urgent',
 color: 'crimson',
 recommendations: [
 'LVAD evaluation within 2-4 weeks',
 'Optimize GDMT if tolerated',
 'Nutritional optimization',
 'Psychosocial evaluation'
 ]
 },
 {
 level: 4,
 title: "Resting Symptoms",
 description: "Possible weaning from inotropes but experiencing daily symptoms of congestion at rest or during ADLs",
 survival: "80-85% at 1 year",
 urgency: 'Urgent',
 color: 'crimson',
 recommendations: [
 'LVAD evaluation within 1-2 months',
 'Maximum GDMT optimization',
 'Diuretic optimization',
 'Consider CRT if indicated'
 ]
 },
 {
 level: 5,
 title: "Exertion Intolerant",
 description: "Comfortable at rest, exertion intolerant, unable to carry out any strenuous activity",
 survival: "85-90% at 1 year",
 urgency: 'Elective',
 color: 'crimson',
 recommendations: [
 'LVAD evaluation within 3-6 months',
 'Cardiac rehabilitation',
 'GDMT optimization',
 'Consider transplant evaluation'
 ]
 },
 {
 level: 6,
 title: "Exertion Limited",
 description: "Minor limitation with exertion, comfortable at rest and with ADLs",
 survival: ">90% at 1 year",
 urgency: 'Elective',
 color: 'chrome-blue',
 recommendations: [
 'Continue medical optimization',
 'Monitor for progression',
 'Consider transplant evaluation if young',
 'Lifestyle modifications'
 ]
 },
 {
 level: 7,
 title: "Advanced NYHA III",
 description: "Clinically stable with reasonable level of comfortable activity",
 survival: ">95% at 1 year",
 urgency: 'Elective',
 color: 'chrome-blue',
 recommendations: [
 'Continue GDMT',
 'Regular monitoring',
 'Lifestyle modifications',
 'Consider advanced therapies if progression'
 ]
 }
  ];

  const calculateINTERMACS = (inputs: INTERMACSInputs): INTERMACSRisk => {
 let riskScore = 0;
 const profile = intermicsProfiles.find(p => p.level === inputs.currentProfile) || intermicsProfiles[2];

 // Age risk scoring
 if (inputs.age > 65) riskScore += 2;
 else if (inputs.age > 55) riskScore += 1;

 // BMI scoring
 if (inputs.bmi < 18.5 || inputs.bmi > 35) riskScore += 2;
 else if (inputs.bmi < 20 || inputs.bmi > 30) riskScore += 1;

 // Renal function
 if (inputs.creatinine > 2.0) riskScore += 3;
 else if (inputs.creatinine > 1.5) riskScore += 2;
 else if (inputs.creatinine > 1.2) riskScore += 1;

 // Liver function
 if (inputs.bilirubin > 2.0) riskScore += 2;
 else if (inputs.bilirubin > 1.5) riskScore += 1;

 // Nutrition
 if (inputs.albumin < 3.0) riskScore += 2;
 else if (inputs.albumin < 3.5) riskScore += 1;

 if (inputs.prealbumin < 15) riskScore += 2;
 else if (inputs.prealbumin < 20) riskScore += 1;

 // Electrolytes
 if (inputs.sodium < 130) riskScore += 2;
 else if (inputs.sodium < 135) riskScore += 1;

 // Hematologic
 if (inputs.plateletCount < 100) riskScore += 2;
 else if (inputs.plateletCount < 150) riskScore += 1;

 // Clinical factors
 if (inputs.inotropeDependent) riskScore += 2;
 if (inputs.mechanicalVentilation) riskScore += 4;
 if (inputs.dialysis) riskScore += 3;
 if (inputs.pvd) riskScore += 2;
 if (inputs.previousSternotomy) riskScore += 1;
 if (inputs.psychosocial) riskScore += 2;

 // Risk categorization
 let riskCategory: 'Low' | 'Intermediate' | 'High' | 'Prohibitive';
 let color: string;
 let survivelEstimate: string;
 let recommendations: string[];

 if (riskScore <= 5) {
 riskCategory = 'Low';
 color = 'chrome-blue';
 survivelEstimate = '>85% 2-year survival';
 recommendations = [
 'Excellent LVAD candidate',
 'Consider primary transplant if young',
 'Standard perioperative care',
 'Excellent long-term prognosis'
 ];
 } else if (riskScore <= 10) {
 riskCategory = 'Intermediate';
 color = 'crimson';
 survivelEstimate = '70-85% 2-year survival';
 recommendations = [
 'Good LVAD candidate with optimization',
 'Address modifiable risk factors',
 'Enhanced perioperative monitoring',
 'Consider destination therapy'
 ];
 } else if (riskScore <= 15) {
 riskCategory = 'High';
 color = 'medical-red';
 survivelEstimate = '50-70% 2-year survival';
 recommendations = [
 'High-risk LVAD candidate',
 'Extensive optimization required',
 'Multidisciplinary evaluation',
 'Consider alternative approaches'
 ];
 } else {
 riskCategory = 'Prohibitive';
 color = 'titanium';
 survivelEstimate = '<50% 2-year survival';
 recommendations = [
 'Likely prohibitive surgical risk',
 'Focus on optimization',
 'Consider palliative approaches',
 'Multidisciplinary team discussion'
 ];
 }

 return {
 profile,
 riskScore,
 riskCategory,
 color,
 survivelEstimate,
 recommendations
 };
  };

  useEffect(() => {
 setResult(calculateINTERMACS(inputs));
  }, [inputs]);

  const updateInput = (field: keyof INTERMACSInputs, value: any) => {
 setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
 <div className="retina-card p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-crimson-100 rounded-xl flex items-center justify-center">
 <Zap className="w-6 h-6 text-crimson-600" />
 </div>
 <div>
 <h3 className="text-xl font-bold text-titanium-900 font-sf">INTERMACS Calculator</h3>
 <p className="text-titanium-600">Advanced Heart Failure & MCS Risk Assessment</p>
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
 <div className="lg:col-span-2 space-y-6">
 {/* INTERMACS Profile Selection */}
 <div>
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">INTERMACS Profile</h4>
 <div className="grid grid-cols-1 gap-2">
 {intermicsProfiles.map((profile) => (
 <button
 key={profile.level}
 onClick={() => updateInput('currentProfile', profile.level)}
 className={`p-4 text-left rounded-xl border-2 transition-all ${
 inputs.currentProfile === profile.level
 ? `border-${profile.color}-400 bg-${profile.color}-50`
 : 'border-titanium-200 hover:border-titanium-300'
 }`}
 >
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-lg bg-${profile.color}-100 flex items-center justify-center`}>
 <span className={`text-sm font-bold text-${profile.color}-600`}>
 {profile.level}
 </span>
 </div>
 <div>
 <div className="font-semibold text-titanium-900">{profile.title}</div>
 <div className="text-xs text-titanium-600">{profile.survival}</div>
 </div>
 </div>
 <div className={`px-2 py-1 rounded text-xs font-medium ${
 profile.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
 profile.urgency === 'Urgent' ? 'bg-[#F0F5FA] text-[#6B7280]' :
 'bg-[#C8D4DC] text-[#2C4A60]'
 }`}>
 {profile.urgency}
 </div>
 </div>
 <p className="text-sm text-titanium-700">{profile.description}</p>
 </button>
 ))}
 </div>
 </div>

 {/* Laboratory Values */}
 <div>
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Laboratory Values & Demographics</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Age (years)</label>
 <input
 type="number"
 value={inputs.age}
 onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">BMI (kg/m²)</label>
 <input
 type="number"
 value={inputs.bmi}
 onChange={(e) => updateInput('bmi', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 step="0.1"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Creatinine (mg/dL)</label>
 <input
 type="number"
 value={inputs.creatinine}
 onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 step="0.1"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Total Bilirubin (mg/dL)</label>
 <input
 type="number"
 value={inputs.bilirubin}
 onChange={(e) => updateInput('bilirubin', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 step="0.1"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Albumin (g/dL)</label>
 <input
 type="number"
 value={inputs.albumin}
 onChange={(e) => updateInput('albumin', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 step="0.1"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Sodium (mEq/L)</label>
 <input
 type="number"
 value={inputs.sodium}
 onChange={(e) => updateInput('sodium', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Prealbumin (mg/dL)</label>
 <input
 type="number"
 value={inputs.prealbumin}
 onChange={(e) => updateInput('prealbumin', parseFloat(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 step="0.1"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-titanium-700 mb-2">Platelet Count (×10³)</label>
 <input
 type="number"
 value={inputs.plateletCount}
 onChange={(e) => updateInput('plateletCount', parseInt(e.target.value) || 0)}
 className="w-full px-3 py-2 border border-titanium-300 rounded-lg focus:ring-2 focus:ring-porsche-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>

 {/* Clinical Factors */}
 <div>
 <h4 className="text-lg font-semibold text-titanium-900 mb-4">Clinical Factors</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-3">
 {[
 { key: 'inotropeDependent', label: 'Inotrope dependent' },
 { key: 'mechanicalVentilation', label: 'Mechanical ventilation' },
 { key: 'dialysis', label: 'Dialysis dependent' }
 ].map(({ key, label }) => (
 <div key={key} className="flex items-center">
 <input
 type="checkbox"
 id={key}
 checked={inputs[key as keyof INTERMACSInputs] as boolean}
 onChange={(e) => updateInput(key as keyof INTERMACSInputs, e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor={key} className="ml-2 text-sm text-titanium-700">{label}</label>
 </div>
 ))}
 </div>

 <div className="space-y-3">
 {[
 { key: 'pvd', label: 'Peripheral vascular disease' },
 { key: 'previousSternotomy', label: 'Previous sternotomy' },
 { key: 'psychosocial', label: 'Psychosocial concerns' }
 ].map(({ key, label }) => (
 <div key={key} className="flex items-center">
 <input
 type="checkbox"
 id={key}
 checked={inputs[key as keyof INTERMACSInputs] as boolean}
 onChange={(e) => updateInput(key as keyof INTERMACSInputs, e.target.checked)}
 className="h-4 w-4 text-porsche-600 focus:ring-porsche-500 border-titanium-300 rounded"
 />
 <label htmlFor={key} className="ml-2 text-sm text-titanium-700">{label}</label>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Results Panel */}
 <div>
 {result && (
 <div className="space-y-4">
 {/* Profile Display */}
 <div className={`p-6 rounded-xl border-2 border-${result.profile.color}-200 bg-${result.profile.color}-50`}>
 <div className="text-center mb-4">
 <div className={`text-4xl font-bold text-${result.profile.color}-600 mb-2`}>
 {result.profile.level}
 </div>
 <div className="text-sm font-medium text-titanium-600">INTERMACS Profile</div>
 <div className="text-sm font-bold text-titanium-900 mt-1">
 {result.profile.title}
 </div>
 </div>
 </div>

 {/* Risk Score */}
 <div className={`p-4 rounded-xl border-2 border-${result.color}-200 bg-${result.color}-50`}>
 <div className="text-center">
 <div className={`text-3xl font-bold text-${result.color}-600 mb-1`}>
 {result.riskScore}
 </div>
 <div className="text-sm font-medium text-titanium-600">Risk Score</div>
 <div className={`inline-flex items-center gap-2 px-3 py-1 mt-2 rounded-full bg-${result.color}-200 text-${result.color}-800 font-semibold`}>
 {result.riskCategory === 'Low' && <CheckCircle className="w-4 h-4" />}
 {result.riskCategory === 'Intermediate' && <Info className="w-4 h-4" />}
 {(result.riskCategory === 'High' || result.riskCategory === 'Prohibitive') && <AlertTriangle className="w-4 h-4" />}
 {result.riskCategory}
 </div>
 </div>
 </div>

 {/* Survival Estimate */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-2">Survival Estimate</h5>
 <p className="text-sm text-titanium-700">{result.survivelEstimate}</p>
 </div>

 {/* Recommendations */}
 <div className="p-4 bg-white rounded-xl border border-titanium-200">
 <h5 className="font-semibold text-titanium-900 mb-3">Recommendations</h5>
 <div className="space-y-2">
 {result.recommendations.map((rec, index) => (
 <div key={rec} className="flex items-start gap-2">
 <div className={`w-2 h-2 rounded-full bg-${result.color}-500 flex-shrink-0 mt-1.5`}></div>
 <span className="text-sm text-titanium-700">{rec}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Urgency */}
 <div className={`p-4 rounded-xl border ${
 result.profile.urgency === 'Critical' ? 'border-red-200 bg-red-50' :
 result.profile.urgency === 'Urgent' ? 'border-[#C8D4DC] bg-[#F0F5FA]' :
 'border-[#2C4A60] bg-[#C8D4DC]'
 }`}>
 <div className="flex items-center gap-2 mb-2">
 <Activity className={`w-4 h-4 ${
 result.profile.urgency === 'Critical' ? 'text-red-600' :
 result.profile.urgency === 'Urgent' ? 'text-[#6B7280]' :
 'text-[#2C4A60]'
 }`} />
 <span className="font-semibold text-titanium-900">
 {result.profile.urgency} Intervention
 </span>
 </div>
 <p className="text-sm text-titanium-700">{result.profile.survival}</p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Guidelines Modal */}
 {showGuidelines && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-xl font-bold text-titanium-900">INTERMACS Guidelines</h4>
 <button
 onClick={() => setShowGuidelines(false)}
 className="p-2 hover:bg-titanium-100 rounded-lg"
 >
 ×
 </button>
 </div>
 
 <div className="space-y-6">
 <div>
 <h5 className="font-semibold text-titanium-900 mb-3">INTERMACS Profile Levels</h5>
 <div className="space-y-2 text-sm">
 {intermicsProfiles.map((profile) => (
 <div key={profile.level} className={`p-3 rounded border-l-4 border-${profile.color}-400 bg-${profile.color}-50`}>
 <div className="font-medium">Profile {profile.level}: {profile.title}</div>
 <div className="text-titanium-600 mt-1">{profile.description}</div>
 <div className="text-xs text-titanium-500 mt-1">Expected survival: {profile.survival}</div>
 </div>
 ))}
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Risk Assessment Components</h5>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 <div className="space-y-2">
 <div className="font-medium">Demographic</div>
 <ul className="text-titanium-700 space-y-1 ml-4">
 <li>• Age &gt;55: +1-2 points</li>
 <li>• BMI extremes: +1-2 points</li>
 </ul>
 </div>
 <div className="space-y-2">
 <div className="font-medium">Laboratory</div>
 <ul className="text-titanium-700 space-y-1 ml-4">
 <li>• Creatinine &gt;1.2: +1-3 points</li>
 <li>• Bilirubin &gt;1.5: +1-2 points</li>
 <li>• Albumin &lt;3.5: +1-2 points</li>
 </ul>
 </div>
 <div className="space-y-2">
 <div className="font-medium">Clinical</div>
 <ul className="text-titanium-700 space-y-1 ml-4">
 <li>• Inotrope dependent: +2 points</li>
 <li>• Mechanical ventilation: +4 points</li>
 <li>• Dialysis: +3 points</li>
 </ul>
 </div>
 <div className="space-y-2">
 <div className="font-medium">Contraindications</div>
 <ul className="text-titanium-700 space-y-1 ml-4">
 <li>• Fixed pulmonary hypertension</li>
 <li>• Active malignancy</li>
 <li>• Severe neurologic dysfunction</li>
 </ul>
 </div>
 </div>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">Clinical Applications</h5>
 <ul className="text-sm text-titanium-700 space-y-1">
 <li>• Guides timing of LVAD implantation</li>
 <li>• Risk stratification for outcomes</li>
 <li>• Patient selection for clinical trials</li>
 <li>• Allocation of donor hearts</li>
 <li>• Quality improvement initiatives</li>
 </ul>
 </div>

 <div>
 <h5 className="font-semibold text-titanium-900 mb-2">References</h5>
 <div className="text-sm text-titanium-700">
 <p>Stevenson LW, et al. INTERMACS profiles of advanced heart failure. J Heart Lung Transplant. 2009.</p>
 <p className="mt-1">2013 ACCF/AHA Guideline for the Management of Heart Failure</p>
 <p className="mt-1">ISHLT Guidelines for Mechanical Circulatory Support</p>
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

export default INTERMACSCalculator;