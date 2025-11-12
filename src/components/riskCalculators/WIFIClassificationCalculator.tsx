import React from 'react';
import { featureFlags } from '../../config/featureFlags';

interface WIFIClassificationProps {
  woundGrade: 0 | 1 | 2 | 3;
  ischemiaGrade: 0 | 1 | 2 | 3;
  footInfectionGrade: 0 | 1 | 2 | 3;
}

interface WIFIResult {
  wifiStage: 1 | 2 | 3 | 4;
  oneYearAmputationRisk: string;
  revascularizationBenefit: string;
  riskLevel: string;
  clinicalRecommendation: string;
  gradeBreakdown: {
    wound: string;
    ischemia: string;
    footInfection: string;
  };
}

const WIFIClassificationCalculator: React.FC<WIFIClassificationProps> = ({
  woundGrade,
  ischemiaGrade,
  footInfectionGrade,
}) => {
  if (!featureFlags.riskCalculators.wifiClassification) {
    return null;
  }

  const calculateWIFIStage = (): WIFIResult => {
    // WIfI staging based on highest grade among the three categories
    const maxGrade = Math.max(woundGrade, ischemiaGrade, footInfectionGrade);
    
    let wifiStage: 1 | 2 | 3 | 4;
    let oneYearAmputationRisk: string;
    let revascularizationBenefit: string;
    let riskLevel: string;
    let clinicalRecommendation: string;

    // Determine stage based on highest grade
    if (maxGrade === 0) {
      wifiStage = 1;
      oneYearAmputationRisk = '<5%';
      revascularizationBenefit = 'Low';
      riskLevel = 'Very Low';
      clinicalRecommendation = 'Wound care, risk factor modification';
    } else if (maxGrade === 1) {
      wifiStage = 2;
      oneYearAmputationRisk = '5-15%';
      revascularizationBenefit = 'Moderate';
      riskLevel = 'Low';
      clinicalRecommendation = 'Conservative management, consider revascularization if healing delayed';
    } else if (maxGrade === 2) {
      wifiStage = 3;
      oneYearAmputationRisk = '15-40%';
      revascularizationBenefit = 'High';
      riskLevel = 'Moderate';
      clinicalRecommendation = 'Revascularization recommended, aggressive wound care';
    } else {
      wifiStage = 4;
      oneYearAmputationRisk = '>40%';
      revascularizationBenefit = 'Very High';
      riskLevel = 'High';
      clinicalRecommendation = 'Urgent revascularization, consider multidisciplinary approach';
    }

    // Grade descriptions
    const getWoundDescription = (grade: number): string => {
      switch (grade) {
        case 0: return 'No ulcer';
        case 1: return 'Small, shallow ulcer on distal leg/foot';
        case 2: return 'Deeper ulcer with exposed bone/joint or affecting heel';
        case 3: return 'Extensive, deep ulcer involving forefoot and/or midfoot';
        default: return 'Unknown';
      }
    };

    const getIschemiaDescription = (grade: number): string => {
      switch (grade) {
        case 0: return 'ABI ≥0.80, TcPO₂ ≥60 mmHg';
        case 1: return 'ABI 0.60-0.79, TcPO₂ 40-59 mmHg';
        case 2: return 'ABI 0.40-0.59, TcPO₂ 30-39 mmHg';
        case 3: return 'ABI <0.40, TcPO₂ <30 mmHg';
        default: return 'Unknown';
      }
    };

    const getFootInfectionDescription = (grade: number): string => {
      switch (grade) {
        case 0: return 'No symptoms or signs of infection';
        case 1: return 'Local infection involving skin/subcutaneous tissue only';
        case 2: return 'Local infection with erythema >2 cm, lymphangitis, deep tissue involvement';
        case 3: return 'Systemic signs of infection (fever, chills, hypotension, confusion, vomiting, leukocytosis)';
        default: return 'Unknown';
      }
    };

    return {
      wifiStage,
      oneYearAmputationRisk,
      revascularizationBenefit,
      riskLevel,
      clinicalRecommendation,
      gradeBreakdown: {
        wound: getWoundDescription(woundGrade),
        ischemia: getIschemiaDescription(ischemiaGrade),
        footInfection: getFootInfectionDescription(footInfectionGrade),
      },
    };
  };

  const {
    wifiStage,
    oneYearAmputationRisk,
    revascularizationBenefit,
    riskLevel,
    clinicalRecommendation,
    gradeBreakdown,
  } = calculateWIFIStage();

  const getStageColor = (stage: number): string => {
    switch (stage) {
      case 1: return 'text-green-600';
      case 2: return 'text-yellow-600';
      case 3: return 'text-orange-600';
      case 4: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk: string): string => {
    if (risk === 'Very Low') return 'text-green-600';
    if (risk === 'Low') return 'text-yellow-600';
    if (risk === 'Moderate') return 'text-orange-600';
    if (risk === 'High') return 'text-red-600';
    return 'text-gray-600';
  };

  const getBenefitColor = (benefit: string): string => {
    if (benefit === 'Low') return 'text-yellow-600';
    if (benefit === 'Moderate') return 'text-blue-600';
    if (benefit === 'High') return 'text-purple-600';
    if (benefit === 'Very High') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        WIfI Classification
      </h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getStageColor(wifiStage)} mb-1`}>
            {wifiStage}
          </div>
          <div className="text-sm text-gray-600">WIfI Stage</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getRiskColor(riskLevel)} mb-1`}>
            {oneYearAmputationRisk}
          </div>
          <div className="text-sm text-gray-600">1-Year Amputation Risk</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getBenefitColor(revascularizationBenefit)} mb-1`}>
            {revascularizationBenefit}
          </div>
          <div className="text-sm text-gray-600">Revasc Benefit</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-2">
          <div className={`text-lg font-semibold ${getRiskColor(riskLevel)}`}>
            {riskLevel} Risk
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-700 italic">{clinicalRecommendation}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <span className="font-medium text-blue-900">Wound (W)</span>
            <div className="text-xs text-blue-700">Grade {woundGrade}</div>
          </div>
          <div className="text-sm text-blue-800">{gradeBreakdown.wound}</div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <div>
            <span className="font-medium text-red-900">Ischemia (I)</span>
            <div className="text-xs text-red-700">Grade {ischemiaGrade}</div>
          </div>
          <div className="text-sm text-red-800">{gradeBreakdown.ischemia}</div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div>
            <span className="font-medium text-purple-900">foot Infection (fI)</span>
            <div className="text-xs text-purple-700">Grade {footInfectionGrade}</div>
          </div>
          <div className="text-sm text-purple-800">{gradeBreakdown.footInfection}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>WIfI Classification System:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Stage 1:</strong> Very Low risk (&lt;5% amputation risk) - Conservative management</li>
            <li><strong>Stage 2:</strong> Low risk (5-15% amputation risk) - Consider revascularization</li>
            <li><strong>Stage 3:</strong> Moderate risk (15-40% amputation risk) - Revascularization recommended</li>
            <li><strong>Stage 4:</strong> High risk (&gt;40% amputation risk) - Urgent revascularization</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1"><strong>Current Assessment:</strong></p>
          <div className="grid grid-cols-3 gap-2">
            <div>W: {woundGrade}</div>
            <div>I: {ischemiaGrade}</div>
            <div>fI: {footInfectionGrade}</div>
          </div>
          <p className="mt-2">
            <em>WIfI Stage determined by highest grade among W, I, and fI components</em>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WIFIClassificationCalculator;