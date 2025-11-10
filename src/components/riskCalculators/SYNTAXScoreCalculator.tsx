import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface SYNTAXScoreProps {
  dominance: 'right' | 'left' | 'codominant';
  lmStenosis: number; // Left main stenosis percentage
  proxLadStenosis: number; // Proximal LAD stenosis
  midLadStenosis: number; // Mid LAD stenosis
  proxLcxStenosis: number; // Proximal LCX stenosis
  midLcxStenosis: number; // Mid LCX stenosis
  proxRcaStenosis: number; // Proximal RCA stenosis
  midRcaStenosis: number; // Mid RCA stenosis
  hasBifurcationLesions: boolean;
  hasOcclusions: boolean;
  hasTrifurcationLesions: boolean;
  hasCalcification: boolean;
  hasThrombus: boolean;
  hasTortuosity: boolean;
}

interface SYNTAXResult {
  score: number;
  tertile: string;
  complexity: string;
  recommendation: string;
  revascularizationStrategy: string;
}

const SYNTAXScoreCalculator: React.FC<SYNTAXScoreProps> = ({
  dominance,
  lmStenosis,
  proxLadStenosis,
  midLadStenosis,
  proxLcxStenosis,
  midLcxStenosis,
  proxRcaStenosis,
  midRcaStenosis,
  hasBifurcationLesions,
  hasOcclusions,
  hasTrifurcationLesions,
  hasCalcification,
  hasThrombus,
  hasTortuosity,
}) => {
  if (!featureFlags.riskCalculators.syntaxScore) {
    return null;
  }

  const calculateSYNTAXScore = (): SYNTAXResult => {
    let score = 0;

    // Left Main scoring
    if (lmStenosis >= 50) {
      score += 5;
    }

    // LAD system
    if (proxLadStenosis >= 70) {
      score += 3.5;
    }
    if (midLadStenosis >= 70) {
      score += 2.5;
    }

    // LCX system
    if (proxLcxStenosis >= 70) {
      score += 2.5;
    }
    if (midLcxStenosis >= 70) {
      score += 1;
    }

    // RCA system
    if (proxRcaStenosis >= 70) {
      score += dominance === 'right' ? 3 : 1;
    }
    if (midRcaStenosis >= 70) {
      score += dominance === 'right' ? 2 : 1;
    }

    // Lesion complexity modifiers
    if (hasBifurcationLesions) score += 1;
    if (hasOcclusions) score += 5;
    if (hasTrifurcationLesions) score += 3;
    if (hasCalcification) score += 2;
    if (hasThrombus) score += 1;
    if (hasTortuosity) score += 1;

    // Determine tertile and recommendations
    let tertile: string;
    let complexity: string;
    let recommendation: string;
    let revascularizationStrategy: string;

    if (score <= 22) {
      tertile = 'Low';
      complexity = 'Low Complexity';
      recommendation = 'PCI or CABG equivalent outcomes';
      revascularizationStrategy = 'PCI preferred for low surgical risk';
    } else if (score <= 32) {
      tertile = 'Intermediate';
      complexity = 'Intermediate Complexity';
      recommendation = 'Heart team discussion recommended';
      revascularizationStrategy = 'Consider CABG for diabetics';
    } else {
      tertile = 'High';
      complexity = 'High Complexity';
      recommendation = 'CABG preferred over PCI';
      revascularizationStrategy = 'Strong consideration for surgical revascularization';
    }

    return {
      score: Math.round(score * 10) / 10,
      tertile,
      complexity,
      recommendation,
      revascularizationStrategy,
    };
  };

  const { score, tertile, complexity, recommendation, revascularizationStrategy } = calculateSYNTAXScore();

  const getTertileColor = (tertile: string): string => {
    switch (tertile) {
      case 'Low':
        return 'text-green-600';
      case 'Intermediate':
        return 'text-yellow-600';
      case 'High':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getContributingFactors = () => {
    const factors = [];
    if (lmStenosis >= 50) factors.push('Left main stenosis ≥50%');
    if (proxLadStenosis >= 70) factors.push('Proximal LAD stenosis ≥70%');
    if (midLadStenosis >= 70) factors.push('Mid LAD stenosis ≥70%');
    if (proxLcxStenosis >= 70) factors.push('Proximal LCX stenosis ≥70%');
    if (midLcxStenosis >= 70) factors.push('Mid LCX stenosis ≥70%');
    if (proxRcaStenosis >= 70) factors.push('Proximal RCA stenosis ≥70%');
    if (midRcaStenosis >= 70) factors.push('Mid RCA stenosis ≥70%');
    if (hasBifurcationLesions) factors.push('Bifurcation lesions');
    if (hasOcclusions) factors.push('Total occlusions');
    if (hasTrifurcationLesions) factors.push('Trifurcation lesions');
    if (hasCalcification) factors.push('Heavy calcification');
    if (hasThrombus) factors.push('Thrombus present');
    if (hasTortuosity) factors.push('Vessel tortuosity');
    return factors;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        SYNTAX Score
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {score}
          </div>
          <div className="text-sm text-gray-600">SYNTAX Score</div>
        </div>
        
        <div className="text-center">
          <div className={`text-3xl font-bold ${getTertileColor(tertile)} mb-1`}>
            {tertile}
          </div>
          <div className="text-sm text-gray-600">Tertile</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-sm text-gray-600 mr-2">Complexity:</span>
        <span className={`font-semibold ${getTertileColor(tertile)}`}>{complexity}</span>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm">
          <p className="font-medium text-gray-800 mb-2">Clinical Recommendation:</p>
          <p className="text-gray-700 mb-2">{recommendation}</p>
          <p className="text-gray-700 italic">{revascularizationStrategy}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-2"><strong>Contributing Lesion Characteristics:</strong></p>
          {getContributingFactors().length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {getContributingFactors().map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No significant lesions detected</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>SYNTAX Score Tertiles:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Low (≤22):</strong> PCI and CABG show similar outcomes</li>
            <li><strong>Intermediate (23-32):</strong> Heart team discussion recommended</li>
            <li><strong>High (≥33):</strong> CABG preferred over PCI</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SYNTAXScoreCalculator;