import React, { useState } from 'react';
import { Calculator, Heart, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MAGGICInputs {
  age: number;
  gender: 'male' | 'female';
  ef: number;
  nyhaClass: 1 | 2 | 3 | 4;
  creatinine: number;
  diabetes: boolean;
  copd: boolean;
  hfDuration: number; // months
  systolicBP: number;
  bmi: number;
  smoker: boolean;
  aceiOrArb: boolean;
  betaBlocker: boolean;
}

interface MAGGICResult {
  score: number;
  oneYearMortality: number;
  threeYearMortality: number;
  riskCategory: 'Low' | 'Intermediate' | 'High' | 'Very High';
  interpretation: string;
}

const MAGGICScoreCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<MAGGICInputs>({
    age: 65,
    gender: 'male',
    ef: 35,
    nyhaClass: 2,
    creatinine: 1.2,
    diabetes: false,
    copd: false,
    hfDuration: 12,
    systolicBP: 120,
    bmi: 25,
    smoker: false,
    aceiOrArb: true,
    betaBlocker: true
  });

  const calculateMAGGIC = (): MAGGICResult => {
    let score = 0;

    // Age (continuous)
    if (inputs.age >= 70) score += (inputs.age - 70) * 0.625;
    
    // Gender (male = +1.5)
    if (inputs.gender === 'male') score += 1.5;

    // Ejection Fraction (continuous, inverted)
    if (inputs.ef < 45) score += (45 - inputs.ef) * 0.115;

    // NYHA Class
    if (inputs.nyhaClass === 3) score += 2.0;
    if (inputs.nyhaClass === 4) score += 3.5;

    // Creatinine (if >1.4 mg/dL)
    if (inputs.creatinine > 1.4) score += (inputs.creatinine - 1.4) * 1.2;

    // Diabetes
    if (inputs.diabetes) score += 1.7;

    // COPD
    if (inputs.copd) score += 1.4;

    // Heart failure duration (if >18 months)
    if (inputs.hfDuration > 18) score += 0.9;

    // Systolic BP (if <120 mmHg)
    if (inputs.systolicBP < 120) score += (120 - inputs.systolicBP) * 0.035;

    // BMI (if <30)
    if (inputs.bmi < 30) score += (30 - inputs.bmi) * 0.045;

    // Current smoker
    if (inputs.smoker) score += 1.1;

    // ACE inhibitor/ARB (protective)
    if (inputs.aceiOrArb) score -= 1.2;

    // Beta-blocker (protective)
    if (inputs.betaBlocker) score -= 0.8;

    // Convert to mortality risk
    const oneYearMortality = Math.min(95, Math.max(0.1, 1 / (1 + Math.exp(-(-2.34 + 0.184 * score))) * 100));
    const threeYearMortality = Math.min(95, Math.max(0.2, 1 / (1 + Math.exp(-(-1.15 + 0.171 * score))) * 100));

    let riskCategory: 'Low' | 'Intermediate' | 'High' | 'Very High';
    let interpretation: string;

    if (oneYearMortality < 10) {
      riskCategory = 'Low';
      interpretation = 'Low risk of 1-year mortality. Continue guideline-directed medical therapy.';
    } else if (oneYearMortality < 20) {
      riskCategory = 'Intermediate';
      interpretation = 'Intermediate risk. Optimize GDMT and consider advanced therapies.';
    } else if (oneYearMortality < 40) {
      riskCategory = 'High';
      interpretation = 'High risk. Consider advanced heart failure therapies and specialist referral.';
    } else {
      riskCategory = 'Very High';
      interpretation = 'Very high risk. Urgent consideration for advanced therapies, transplant evaluation.';
    }

    return {
      score: Math.round(score * 10) / 10,
      oneYearMortality: Math.round(oneYearMortality * 10) / 10,
      threeYearMortality: Math.round(threeYearMortality * 10) / 10,
      riskCategory,
      interpretation
    };
  };

  const result = calculateMAGGIC();

  const updateInput = (key: keyof MAGGICInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Low': return 'text-medical-green-600 bg-medical-green-50 border-medical-green-200';
      case 'Intermediate': return 'text-medical-amber-600 bg-medical-amber-50 border-medical-amber-200';
      case 'High': return 'text-medical-red-600 bg-medical-red-50 border-medical-red-200';
      case 'Very High': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-8 h-8 text-medical-blue-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">MAGGIC Score Calculator</h2>
          <p className="text-steel-600">Meta-Analysis Global Group in Chronic Heart Failure Risk Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Age (years)</label>
              <input
                type="number"
                value={inputs.age}
                onChange={(e) => updateInput('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="18"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Gender</label>
              <select
                value={inputs.gender}
                onChange={(e) => updateInput('gender', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Ejection Fraction (%)</label>
              <input
                type="number"
                value={inputs.ef}
                onChange={(e) => updateInput('ef', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="10"
                max="80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">NYHA Class</label>
              <select
                value={inputs.nyhaClass}
                onChange={(e) => updateInput('nyhaClass', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
              >
                <option value={1}>I</option>
                <option value={2}>II</option>
                <option value={3}>III</option>
                <option value={4}>IV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Creatinine (mg/dL)</label>
              <input
                type="number"
                step="0.1"
                value={inputs.creatinine}
                onChange={(e) => updateInput('creatinine', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="0.5"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={inputs.systolicBP}
                onChange={(e) => updateInput('systolicBP', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="60"
                max="250"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">BMI (kg/m²)</label>
              <input
                type="number"
                step="0.1"
                value={inputs.bmi}
                onChange={(e) => updateInput('bmi', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="10"
                max="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">HF Duration (months)</label>
              <input
                type="number"
                value={inputs.hfDuration}
                onChange={(e) => updateInput('hfDuration', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-medical-blue-500"
                min="0"
                max="600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.diabetes}
                onChange={(e) => updateInput('diabetes', e.target.checked)}
                className="rounded text-medical-blue-600"
              />
              <span className="text-sm font-medium text-steel-700">Diabetes Mellitus</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.copd}
                onChange={(e) => updateInput('copd', e.target.checked)}
                className="rounded text-medical-blue-600"
              />
              <span className="text-sm font-medium text-steel-700">COPD</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-steel-50 rounded-lg cursor-pointer hover:bg-steel-100">
              <input
                type="checkbox"
                checked={inputs.smoker}
                onChange={(e) => updateInput('smoker', e.target.checked)}
                className="rounded text-medical-blue-600"
              />
              <span className="text-sm font-medium text-steel-700">Current Smoker</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-medical-green-50 rounded-lg cursor-pointer hover:bg-medical-green-100">
              <input
                type="checkbox"
                checked={inputs.aceiOrArb}
                onChange={(e) => updateInput('aceiOrArb', e.target.checked)}
                className="rounded text-medical-green-600"
              />
              <span className="text-sm font-medium text-steel-700">ACE-I/ARB/ARNi</span>
            </label>

            <label className="flex items-center space-x-3 p-3 bg-medical-green-50 rounded-lg cursor-pointer hover:bg-medical-green-100">
              <input
                type="checkbox"
                checked={inputs.betaBlocker}
                onChange={(e) => updateInput('betaBlocker', e.target.checked)}
                className="rounded text-medical-green-600"
              />
              <span className="text-sm font-medium text-steel-700">Beta-Blocker</span>
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
                <div className="text-sm opacity-80">MAGGIC Score: {result.score}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm opacity-80">1-Year Mortality</div>
                <div className="text-2xl font-bold">{result.oneYearMortality}%</div>
              </div>
              
              <div>
                <div className="text-sm opacity-80">3-Year Mortality</div>
                <div className="text-xl font-semibold">{result.threeYearMortality}%</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-medical-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-medical-blue-800">
                <div className="font-semibold mb-1">Clinical Interpretation</div>
                <p>{result.interpretation}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-steel-50 border border-steel-200 rounded-lg">
            <div className="text-sm text-steel-700">
              <div className="font-semibold mb-2">Risk Categories</div>
              <div className="space-y-1 text-xs">
                <div>• Low: &lt;10% 1-year mortality</div>
                <div>• Intermediate: 10-20% 1-year mortality</div>
                <div>• High: 20-40% 1-year mortality</div>
                <div>• Very High: &gt;40% 1-year mortality</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MAGGICScoreCalculator;