import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface CHA2DS2VAScProps {
  age: number;
  sex: 'male' | 'female';
  hasCHF: boolean;
  hasHypertension: boolean;
  hasStrokeHistory: boolean;
  hasVascularDisease: boolean;
  hasDiabetes: boolean;
}

interface RiskData {
  score: number;
  riskPercentage: number;
}

const CHA2DS2VAScCalculator: React.FC<CHA2DS2VAScProps> = ({
  age,
  sex,
  hasCHF,
  hasHypertension,
  hasStrokeHistory,
  hasVascularDisease,
  hasDiabetes,
}) => {
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
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        CHA₂DS₂-VASc Score
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {score}
          </div>
          <div className="text-sm text-gray-600">Score</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {riskPercentage}%
          </div>
          <div className="text-sm text-gray-600">Annual Stroke Risk</div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm text-gray-600 mr-2">Risk Level:</span>
        <span className={`font-semibold ${color}`}>{level}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Risk Factors Contributing to Score:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            {age >= 75 && <li>Age ≥75 years (+2 points)</li>}
            {age >= 65 && age < 75 && <li>Age 65-74 years (+1 point)</li>}
            {sex === 'female' && <li>Female sex (+1 point)</li>}
            {hasCHF && <li>Congestive heart failure (+1 point)</li>}
            {hasHypertension && <li>Hypertension (+1 point)</li>}
            {hasStrokeHistory && <li>Stroke/TIA history (+2 points)</li>}
            {hasVascularDisease && <li>Vascular disease (+1 point)</li>}
            {hasDiabetes && <li>Diabetes (+1 point)</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CHA2DS2VAScCalculator;