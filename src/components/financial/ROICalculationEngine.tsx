import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calculator, Target, Users, Activity, Calendar, Download, RefreshCw } from 'lucide-react';

interface ROIMetric {
  category: string;
  baseline: number;
  improved: number;
  impact: number;
  confidence: number;
  timeframe: '1-month' | '3-month' | '6-month' | '1-year';
}

interface CostSaving {
  description: string;
  annualSaving: number;
  probability: number;
  source: string;
  category: 'direct' | 'indirect' | 'avoided';
}

interface InvestmentCost {
  description: string;
  amount: number;
  recurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-time';
}

const ROICalculationEngine: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1-year' | '3-year' | '5-year'>('3-year');
  const [patientVolume, setPatientVolume] = useState(1247);
  const [gdmtAdherence, setGdmtAdherence] = useState(13.8);
  const [targetAdherence, setTargetAdherence] = useState(25.0);
  const [isCalculating, setIsCalculating] = useState(false);

  const costSavings: CostSaving[] = [
    {
      description: 'Reduced 30-day HF readmissions',
      annualSaving: 2450000,
      probability: 0.85,
      source: 'Clinical outcomes data',
      category: 'direct'
    },
    {
      description: 'Decreased ED visits',
      annualSaving: 890000,
      probability: 0.78,
      source: 'Emergency department utilization',
      category: 'direct'
    },
    {
      description: 'Reduced length of stay',
      annualSaving: 1320000,
      probability: 0.72,
      source: 'Hospitalization efficiency',
      category: 'direct'
    },
    {
      description: 'Medication adherence improvement',
      annualSaving: 567000,
      probability: 0.90,
      source: 'GDMT optimization',
      category: 'indirect'
    },
    {
      description: 'Avoided device therapy complications',
      annualSaving: 780000,
      probability: 0.65,
      source: 'Device optimization',
      category: 'avoided'
    },
    {
      description: 'Physician time efficiency gains',
      annualSaving: 345000,
      probability: 0.82,
      source: 'Workflow optimization',
      category: 'indirect'
    },
    {
      description: 'Reduced specialist consultations',
      annualSaving: 234000,
      probability: 0.75,
      source: 'Care coordination',
      category: 'direct'
    }
  ];

  const investmentCosts: InvestmentCost[] = [
    {
      description: 'TAILRD Platform License',
      amount: 250000,
      recurring: true,
      frequency: 'annual'
    },
    {
      description: 'Implementation & Training',
      amount: 150000,
      recurring: false,
      frequency: 'one-time'
    },
    {
      description: 'Staff Training & Support',
      amount: 75000,
      recurring: true,
      frequency: 'annual'
    },
    {
      description: 'Integration & IT Support',
      amount: 45000,
      recurring: true,
      frequency: 'quarterly'
    },
    {
      description: 'Quality Assurance & Monitoring',
      amount: 35000,
      recurring: true,
      frequency: 'quarterly'
    }
  ];

  const roiMetrics: ROIMetric[] = [
    {
      category: 'GDMT Adherence Rate',
      baseline: gdmtAdherence,
      improved: targetAdherence,
      impact: ((targetAdherence - gdmtAdherence) / gdmtAdherence) * 100,
      confidence: 92,
      timeframe: '6-month'
    },
    {
      category: '30-day Readmission Rate',
      baseline: 18.5,
      improved: 12.8,
      impact: -30.8,
      confidence: 88,
      timeframe: '1-year'
    },
    {
      category: 'Average Length of Stay',
      baseline: 4.2,
      improved: 3.6,
      impact: -14.3,
      confidence: 85,
      timeframe: '6-month'
    },
    {
      category: 'Provider Efficiency Score',
      baseline: 74.2,
      improved: 89.6,
      impact: 20.8,
      confidence: 90,
      timeframe: '3-month'
    },
    {
      category: 'Patient Satisfaction Score',
      baseline: 82.1,
      improved: 91.7,
      impact: 11.7,
      confidence: 79,
      timeframe: '1-year'
    }
  ];

  const calculateROI = useMemo(() => {
    const timeMultiplier = selectedTimeframe === '1-year' ? 1 : selectedTimeframe === '3-year' ? 3 : 5;
    
    // Calculate total annual savings
    const totalAnnualSavings = costSavings.reduce((sum, saving) => {
      return sum + (saving.annualSaving * saving.probability);
    }, 0);

    // Calculate total investment costs
    const oneTimeCosts = investmentCosts
      .filter(cost => !cost.recurring)
      .reduce((sum, cost) => sum + cost.amount, 0);

    const annualRecurringCosts = investmentCosts
      .filter(cost => cost.recurring)
      .reduce((sum, cost) => {
        const annualAmount = cost.frequency === 'monthly' ? cost.amount * 12 :
                           cost.frequency === 'quarterly' ? cost.amount * 4 :
                           cost.amount;
        return sum + annualAmount;
      }, 0);

    const totalCosts = oneTimeCosts + (annualRecurringCosts * timeMultiplier);
    const totalSavings = totalAnnualSavings * timeMultiplier;
    const netBenefit = totalSavings - totalCosts;
    const roiPercentage = ((netBenefit / totalCosts) * 100);
    const paybackPeriod = totalCosts / totalAnnualSavings;

    return {
      totalSavings,
      totalCosts,
      netBenefit,
      roiPercentage,
      paybackPeriod,
      annualSavings: totalAnnualSavings,
      annualCosts: annualRecurringCosts
    };
  }, [selectedTimeframe, costSavings, investmentCosts]);

  const runScenarioAnalysis = async () => {
    setIsCalculating(true);
    // Simulate complex calculations
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsCalculating(false);
  };

  const exportROIReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      timeframe: selectedTimeframe,
      patientVolume,
      gdmtMetrics: {
        current: gdmtAdherence,
        target: targetAdherence,
        improvement: targetAdherence - gdmtAdherence
      },
      financialResults: calculateROI,
      costSavings: costSavings.map(saving => ({
        ...saving,
        probabilityAdjustedSaving: saving.annualSaving * saving.probability
      })),
      investmentCosts,
      roiMetrics,
      summary: {
        recommendedAction: calculateROI.roiPercentage > 200 ? 'Strongly Recommended' : 
                          calculateROI.roiPercentage > 100 ? 'Recommended' : 
                          calculateROI.roiPercentage > 0 ? 'Consider' : 'Reconsider',
        confidenceLevel: 'High',
        keyDrivers: costSavings.sort((a, b) => (b.annualSaving * b.probability) - (a.annualSaving * a.probability)).slice(0, 3)
      }
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi-analysis-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">ROI Calculation Engine</h2>
            <p className="text-steel-600">Comprehensive financial impact modeling for GDMT optimization initiatives</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={runScenarioAnalysis}
              disabled={isCalculating}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isCalculating 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              } transition-colors`}
            >
              <Calculator className="w-4 h-4" />
              {isCalculating ? 'Calculating...' : 'Run Analysis'}
            </button>
            
            <button
              onClick={exportROIReport}
              className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Results Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-sm text-green-700 font-medium">Net ROI</div>
              <div className="text-3xl font-bold text-green-800">{calculateROI.roiPercentage.toFixed(0)}%</div>
            </div>
          </div>
          <div className="text-sm text-green-600">Over {selectedTimeframe}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-sm text-blue-700 font-medium">Net Benefit</div>
              <div className="text-3xl font-bold text-blue-800">${(calculateROI.netBenefit / 1000000).toFixed(1)}M</div>
            </div>
          </div>
          <div className="text-sm text-blue-600">Total savings minus costs</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-sm text-purple-700 font-medium">Payback Period</div>
              <div className="text-3xl font-bold text-purple-800">{calculateROI.paybackPeriod.toFixed(1)} yr</div>
            </div>
          </div>
          <div className="text-sm text-purple-600">Time to recover investment</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-amber-600" />
            <div>
              <div className="text-sm text-amber-700 font-medium">Annual Savings</div>
              <div className="text-3xl font-bold text-amber-800">${(calculateROI.annualSavings / 1000000).toFixed(1)}M</div>
            </div>
          </div>
          <div className="text-sm text-amber-600">Per year potential</div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">Scenario Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Analysis Timeframe</label>
              <select 
                value={selectedTimeframe} 
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              >
                <option value="1-year">1 Year</option>
                <option value="3-year">3 Years</option>
                <option value="5-year">5 Years</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Patient Volume</label>
              <input 
                type="number" 
                value={patientVolume}
                onChange={(e) => setPatientVolume(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Current GDMT Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={gdmtAdherence}
                onChange={(e) => setGdmtAdherence(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Target GDMT Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={targetAdherence}
                onChange={(e) => setTargetAdherence(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Cost Savings Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">Annual Cost Savings</h3>
          
          <div className="space-y-3">
            {costSavings.map((saving, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-steel-900 text-sm">{saving.description}</div>
                  <div className="text-xs text-steel-600">
                    {(saving.probability * 100).toFixed(0)}% confidence • {saving.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ${(saving.annualSaving * saving.probability / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-steel-500">
                    ${(saving.annualSaving / 1000).toFixed(0)}K max
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Costs */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">Investment Costs</h3>
          
          <div className="space-y-3">
            {investmentCosts.map((cost, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-steel-900 text-sm">{cost.description}</div>
                  <div className="text-xs text-steel-600 capitalize">
                    {cost.recurring ? cost.frequency : 'one-time'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">
                    ${(cost.amount / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-3 border-t border-steel-200">
              <div className="flex justify-between">
                <span className="font-medium text-steel-700">Annual Total:</span>
                <span className="font-bold text-red-600">
                  ${(calculateROI.annualCosts / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Metrics */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <h3 className="text-xl font-bold text-steel-900 mb-4">Expected Clinical & Operational Improvements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roiMetrics.map((metric, index) => (
            <div key={index} className="p-4 border border-steel-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-steel-900 text-sm">{metric.category}</span>
                <span className="text-xs text-steel-500">{metric.timeframe}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-steel-700">{metric.baseline}</div>
                  <div className="text-xs text-steel-500">Baseline</div>
                </div>
                
                <div className="flex items-center">
                  {metric.impact > 0 ? 
                    <TrendingUp className="w-4 h-4 text-green-500" /> : 
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  }
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-medical-blue-600">{metric.improved}</div>
                  <div className="text-xs text-steel-500">Target</div>
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-sm font-medium ${metric.impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.impact > 0 ? '+' : ''}{metric.impact.toFixed(1)}%
                </span>
                <span className="text-xs text-steel-500">{metric.confidence}% confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation Summary */}
      <div className="bg-gradient-to-r from-medical-blue-50 to-emerald-50 p-6 rounded-xl border border-medical-blue-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-full">
            <Calculator className="w-8 h-8 text-medical-blue-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-steel-900 mb-2">Investment Recommendation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-steel-600">Recommendation</div>
                <div className="text-lg font-bold text-green-600">
                  {calculateROI.roiPercentage > 200 ? 'Strongly Recommended' : 
                   calculateROI.roiPercentage > 100 ? 'Recommended' : 
                   calculateROI.roiPercentage > 0 ? 'Consider' : 'Reconsider'}
                </div>
              </div>
              <div>
                <div className="text-sm text-steel-600">Risk Level</div>
                <div className="text-lg font-bold text-blue-600">Low-Medium</div>
              </div>
              <div>
                <div className="text-sm text-steel-600">Implementation Priority</div>
                <div className="text-lg font-bold text-purple-600">High</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculationEngine;