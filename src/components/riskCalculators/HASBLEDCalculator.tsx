import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface HASBLEDProps {
  hasHypertension: boolean;
  hasAbnormalRenalLiverFunction: boolean;
  hasStrokeHistory: boolean;
  hasBleedingHistory: boolean;
  hasLabileINR: boolean;
  isElderly: boolean; // >65 years
  takesDrugsAlcohol: boolean;
}

interface BleedingRiskData {
  score: number;
  riskLevel: string;
  riskDescription: string;
  annualBleedingRisk: string;
}

const HASBLEDCalculator: React.FC<HASBLEDProps> = ({
  hasHypertension,
  hasAbnormalRenalLiverFunction,
  hasStrokeHistory,
  hasBleedingHistory,
  hasLabileINR,
  isElderly,
  takesDrugsAlcohol,
}) => {
  if (!featureFlags.riskCalculators.hasbled) {
    return null;
  }

  const calculateScore = (): BleedingRiskData => {
    let score = 0;

    // H - Hypertension
    if (hasHypertension) score += 1;

    // A - Abnormal renal/liver function
    if (hasAbnormalRenalLiverFunction) score += 1;

    // S - Stroke
    if (hasStrokeHistory) score += 1;

    // B - Bleeding history or predisposition
    if (hasBleedingHistory) score += 1;

    // L - Labile INR
    if (hasLabileINR) score += 1;

    // E - Elderly (>65 years)
    if (isElderly) score += 1;

    // D - Drugs/alcohol concomitantly
    if (takesDrugsAlcohol) score += 1;

    // Risk categorization
    let riskLevel: string;
    let riskDescription: string;
    let annualBleedingRisk: string;

    if (score <= 2) {
      riskLevel = 'Low';
      riskDescription = 'Relatively safe for anticoagulation';
      annualBleedingRisk = '1.0-3.5%';
    } else if (score === 3) {
      riskLevel = 'Moderate';
      riskDescription = 'Caution advised with anticoagulation';
      annualBleedingRisk = '3.5-8.5%';
    } else {
      riskLevel = 'High';
      riskDescription = 'High bleeding risk - consider alternatives';
      annualBleedingRisk = '8.5-12.5%';
    }

    return {
      score,
      riskLevel,
      riskDescription,
      annualBleedingRisk,
    };
  };

  const { score, riskLevel, riskDescription, annualBleedingRisk } = calculateScore();

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'Low':
        return 'text-green-600';
      case 'Moderate':
        return 'text-yellow-600';
      case 'High':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskFactors = () => {
    const factors = [];
    if (hasHypertension) factors.push('Hypertension (+1 point)');
    if (hasAbnormalRenalLiverFunction) factors.push('Abnormal renal/liver function (+1 point)');
    if (hasStrokeHistory) factors.push('Stroke history (+1 point)');
    if (hasBleedingHistory) factors.push('Bleeding history or predisposition (+1 point)');
    if (hasLabileINR) factors.push('Labile INR (+1 point)');
    if (isElderly) factors.push('Elderly >65 years (+1 point)');
    if (takesDrugsAlcohol) factors.push('Drugs/alcohol concomitantly (+1 point)');
    return factors;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        HAS-BLED Score
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {score}
          </div>
          <div className="text-sm text-gray-600">Score (0-7)</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {annualBleedingRisk}
          </div>
          <div className="text-sm text-gray-600">Annual Bleeding Risk</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-sm text-gray-600 mr-2">Risk Level:</span>
        <span className={`font-semibold ${getRiskColor(riskLevel)}`}>{riskLevel}</span>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-700 italic">{riskDescription}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-2"><strong>HAS-BLED Risk Factors Contributing to Score:</strong></p>
          {getRiskFactors().length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {getRiskFactors().map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          ) : (
            <p className="text-green-600">No risk factors present (Score: 0)</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Clinical Interpretation:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Score 0-2:</strong> Low bleeding risk - anticoagulation generally safe</li>
            <li><strong>Score 3:</strong> Moderate bleeding risk - use caution and consider modifiable factors</li>
            <li><strong>Score ≥4:</strong> High bleeding risk - consider alternatives to anticoagulation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HASBLEDCalculator;