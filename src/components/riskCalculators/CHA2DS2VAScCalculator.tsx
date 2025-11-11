import React, { useState, useMemo } from 'react';
import { featureFlags } from '../../config/featureFlags';

interface RiskData {
  score: number;
  riskPercentage: number;
}

const CHA2DS2VAScCalculator: React.FC = () => {
  const [age, setAge] = useState<number>(65);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [hasCHF, setHasCHF] = useState<boolean>(false);
  const [hasHypertension, setHasHypertension] = useState<boolean>(false);
  const [hasStrokeHistory, setHasStrokeHistory] = useState<boolean>(false);
  const [hasVascularDisease, setHasVascularDisease] = useState<boolean>(false);
  const [hasDiabetes, setHasDiabetes] = useState<boolean>(false);

  if (!featureFlags.riskCalculators.cha2ds2vasc) {
    return null;
  }

  const calculateScore = (): RiskData => {
    let score = 0;

    // Age scoring
    if (age >= 75) {
      score += 2;
    } else if (age >= 65) {
      score += 1;
    }

    // Sex (female)
    if (sex === 'female') {
      score += 1;
    }

    // Clinical conditions (1 point each)
    if (hasCHF) score += 1;
    if (hasHypertension) score += 1;
    if (hasVascularDisease) score += 1;
    if (hasDiabetes) score += 1;

    // Stroke history (2 points)
    if (hasStrokeHistory) score += 2;

    // Risk percentage based on score
    const riskMapping: { [key: number]: number } = {
      0: 0.2,
      1: 0.6,
      2: 2.2,
      3: 3.2,
      4: 4.8,
      5: 7.2,
      6: 9.7,
      7: 11.2,
      8: 10.8,
      9: 12.2,
    };

    const riskPercentage = riskMapping[score] || 12.2;

    return { score, riskPercentage };
  };

  const { score, riskPercentage } = calculateScore();

  const getRiskLevel = (score: number): { level: string; color: string } => {
    if (score === 0) return { level: 'Very Low', color: 'text-green-600' };
    if (score === 1) return { level: 'Low', color: 'text-yellow-600' };
    if (score >= 2) return { level: 'High', color: 'text-red-600' };
    return { level: 'Unknown', color: 'text-gray-600' };
  };

  const { level, color } = getRiskLevel(score);

  return (
    <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8 shadow-2xl">
      <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-medical-purple-50 border border-medical-purple-200">
          <svg className="w-6 h-6 text-medical-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        CHA₂DS₂-VASc Stroke Risk Calculator
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-steel-900 mb-4">Patient Information</h4>
          
          {/* Age Input */}
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-2">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-steel-300 rounded-xl focus:ring-2 focus:ring-medical-purple-500 focus:border-medical-purple-500"
              min="0"
              max="120"
            />
          </div>

          {/* Sex Selection */}
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-2">Sex</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSex('male')}
                className={`p-3 rounded-xl border font-medium transition-all ${
                  sex === 'male' 
                    ? 'bg-medical-purple-50 border-medical-purple-200 text-medical-purple-700' 
                    : 'bg-white border-steel-300 text-steel-600 hover:bg-steel-50'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setSex('female')}
                className={`p-3 rounded-xl border font-medium transition-all ${
                  sex === 'female' 
                    ? 'bg-medical-purple-50 border-medical-purple-200 text-medical-purple-700' 
                    : 'bg-white border-steel-300 text-steel-600 hover:bg-steel-50'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* Risk Factors */}
          <div>
            <label className="block text-sm font-medium text-steel-700 mb-3">Risk Factors</label>
            <div className="space-y-3">
              {[
                { key: 'hasCHF', label: 'Congestive Heart Failure', value: hasCHF, setter: setHasCHF },
                { key: 'hasHypertension', label: 'Hypertension', value: hasHypertension, setter: setHasHypertension },
                { key: 'hasStrokeHistory', label: 'Stroke/TIA History', value: hasStrokeHistory, setter: setHasStrokeHistory },
                { key: 'hasVascularDisease', label: 'Vascular Disease', value: hasVascularDisease, setter: setHasVascularDisease },
                { key: 'hasDiabetes', label: 'Diabetes', value: hasDiabetes, setter: setHasDiabetes }
              ].map((factor) => (
                <label key={factor.key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factor.value}
                    onChange={(e) => factor.setter(e.target.checked)}
                    className="w-5 h-5 text-medical-purple-600 border-steel-300 rounded focus:ring-medical-purple-500"
                  />
                  <span className="text-sm text-steel-700">{factor.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-steel-900 mb-4">Risk Assessment</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-xl border border-medical-purple-200">
              <div className="text-4xl font-bold text-medical-purple-700 mb-2">
                {score}
              </div>
              <div className="text-sm font-medium text-medical-purple-600">CHA₂DS₂-VASc Score</div>
            </div>
            
            <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="text-4xl font-bold text-blue-700 mb-2">
                {riskPercentage}%
              </div>
              <div className="text-sm font-medium text-blue-600">Annual Stroke Risk</div>
            </div>
          </div>

          <div className="text-center p-4 rounded-xl bg-gradient-to-r from-steel-50 to-steel-100 border border-steel-200">
            <span className="text-sm text-steel-600 mr-2">Risk Level:</span>
            <span className={`text-lg font-bold ${color}`}>{level}</span>
          </div>

          {/* Risk Factors Summary */}
          <div className="bg-white p-4 rounded-xl border border-steel-200">
            <h5 className="font-semibold text-steel-900 mb-3">Contributing Risk Factors</h5>
            <div className="space-y-2 text-sm">
              {age >= 75 && <div className="flex justify-between"><span>Age ≥75 years</span><span className="font-medium">+2 pts</span></div>}
              {age >= 65 && age < 75 && <div className="flex justify-between"><span>Age 65-74 years</span><span className="font-medium">+1 pt</span></div>}
              {sex === 'female' && <div className="flex justify-between"><span>Female sex</span><span className="font-medium">+1 pt</span></div>}
              {hasCHF && <div className="flex justify-between"><span>Congestive heart failure</span><span className="font-medium">+1 pt</span></div>}
              {hasHypertension && <div className="flex justify-between"><span>Hypertension</span><span className="font-medium">+1 pt</span></div>}
              {hasStrokeHistory && <div className="flex justify-between"><span>Stroke/TIA history</span><span className="font-medium">+2 pts</span></div>}
              {hasVascularDisease && <div className="flex justify-between"><span>Vascular disease</span><span className="font-medium">+1 pt</span></div>}
              {hasDiabetes && <div className="flex justify-between"><span>Diabetes</span><span className="font-medium">+1 pt</span></div>}
              {score === 0 && <div className="text-steel-500 italic">No risk factors identified</div>}
            </div>
          </div>

          {/* Clinical Recommendations */}
          <div className={`p-4 rounded-xl border ${
            score >= 2 ? 'bg-red-50 border-red-200' : 
            score === 1 ? 'bg-amber-50 border-amber-200' : 
            'bg-green-50 border-green-200'
          }`}>
            <h5 className="font-semibold mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Clinical Recommendation
            </h5>
            <p className="text-sm">
              {score >= 2 && "Consider anticoagulation therapy for stroke prevention. Discuss risks and benefits with patient."}
              {score === 1 && "Consider anticoagulation or antiplatelet therapy based on individual risk assessment."}
              {score === 0 && "No anticoagulation indicated. Consider aspirin if additional risk factors present."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CHA2DS2VAScCalculator;