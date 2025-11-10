import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calculator, Target, Users, Activity, Calendar, Download, RefreshCw, Zap, Heart, Shield, AlertTriangle } from 'lucide-react';

interface EPROIMetric {
  category: string;
  baseline: number;
  improved: number;
  impact: number;
  confidence: number;
  timeframe: '1-month' | '3-month' | '6-month' | '1-year';
  unit: string;
}

interface EPCostSaving {
  description: string;
  annualSaving: number;
  probability: number;
  source: string;
  category: 'procedure-revenue' | 'medication-savings' | 'complication-avoidance' | 'operational-efficiency';
  procedureType?: 'ablation' | 'device-implant' | 'laac' | 'screening';
}

interface EPInvestmentCost {
  description: string;
  amount: number;
  recurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  category: 'technology' | 'training' | 'implementation' | 'maintenance';
}

interface ProcedureVolume {
  type: 'ablation' | 'device-implant' | 'laac' | 'afib-screening';
  currentVolume: number;
  projectedVolume: number;
  averageReimbursement: number;
  averageCost: number;
  successRate: number;
}

const EPROICalculator: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1-year' | '3-year' | '5-year'>('3-year');
  const [afibPopulation, setAfibPopulation] = useState(2850);
  const [currentScreeningRate, setCurrentScreeningRate] = useState(12.5);
  const [targetScreeningRate, setTargetScreeningRate] = useState(35.0);
  const [ablationSuccessRate, setAblationSuccessRate] = useState(75.0);
  const [targetAblationSuccess, setTargetAblationSuccess] = useState(85.0);
  const [isCalculating, setIsCalculating] = useState(false);

  const procedureVolumes: ProcedureVolume[] = [
    {
      type: 'ablation',
      currentVolume: 245,
      projectedVolume: 320,
      averageReimbursement: 45000,
      averageCost: 32000,
      successRate: ablationSuccessRate
    },
    {
      type: 'device-implant',
      currentVolume: 180,
      projectedVolume: 230,
      averageReimbursement: 52000,
      averageCost: 38000,
      successRate: 92.0
    },
    {
      type: 'laac',
      currentVolume: 85,
      projectedVolume: 140,
      averageReimbursement: 38000,
      averageCost: 28000,
      successRate: 94.0
    },
    {
      type: 'afib-screening',
      currentVolume: afibPopulation * (currentScreeningRate / 100),
      projectedVolume: afibPopulation * (targetScreeningRate / 100),
      averageReimbursement: 850,
      averageCost: 320,
      successRate: 88.0
    }
  ];

  const epCostSavings: EPCostSaving[] = [
    {
      description: 'Increased ablation procedure volume with improved success rates',
      annualSaving: 1850000,
      probability: 0.88,
      source: 'Enhanced EP decision support and patient selection',
      category: 'procedure-revenue',
      procedureType: 'ablation'
    },
    {
      description: 'Optimized device selection reducing complications',
      annualSaving: 920000,
      probability: 0.82,
      source: 'AI-guided device optimization',
      category: 'complication-avoidance',
      procedureType: 'device-implant'
    },
    {
      description: 'Reduced anticoagulation costs through AFib rhythm control',
      annualSaving: 1250000,
      probability: 0.75,
      source: 'Successful ablation reducing warfarin/DOAC dependency',
      category: 'medication-savings',
      procedureType: 'ablation'
    },
    {
      description: 'Increased LAAC procedure volume with stroke prevention savings',
      annualSaving: 780000,
      probability: 0.85,
      source: 'Expanded LAAC program with better patient identification',
      category: 'procedure-revenue',
      procedureType: 'laac'
    },
    {
      description: 'AFib population screening program revenue',
      annualSaving: 650000,
      probability: 0.90,
      source: 'Community screening initiatives',
      category: 'procedure-revenue',
      procedureType: 'screening'
    },
    {
      description: 'Avoided stroke costs through LAAC procedures',
      annualSaving: 2100000,
      probability: 0.70,
      source: 'Stroke prevention in high-risk AFib patients',
      category: 'complication-avoidance',
      procedureType: 'laac'
    },
    {
      description: 'Reduced repeat ablation procedures through improved technique',
      annualSaving: 580000,
      probability: 0.78,
      source: 'AI-guided ablation planning and execution',
      category: 'complication-avoidance',
      procedureType: 'ablation'
    },
    {
      description: 'Device implant complication reduction',
      annualSaving: 420000,
      probability: 0.85,
      source: 'Optimized device programming and monitoring',
      category: 'complication-avoidance',
      procedureType: 'device-implant'
    },
    {
      description: 'EP lab efficiency improvements',
      annualSaving: 340000,
      probability: 0.88,
      source: 'Streamlined workflows and decision support',
      category: 'operational-efficiency'
    },
    {
      description: 'Quality bonus payments for EP metrics',
      annualSaving: 280000,
      probability: 0.75,
      source: 'MIPS and value-based care bonuses',
      category: 'procedure-revenue'
    }
  ];

  const epInvestmentCosts: EPInvestmentCost[] = [
    {
      description: 'TAILRD EP Platform License',
      amount: 320000,
      recurring: true,
      frequency: 'annual',
      category: 'technology'
    },
    {
      description: 'EP-Specific Implementation & Training',
      amount: 185000,
      recurring: false,
      frequency: 'one-time',
      category: 'implementation'
    },
    {
      description: 'EP Staff Training & Certification',
      amount: 95000,
      recurring: true,
      frequency: 'annual',
      category: 'training'
    },
    {
      description: 'AFib Screening Program Setup',
      amount: 120000,
      recurring: false,
      frequency: 'one-time',
      category: 'implementation'
    },
    {
      description: 'EP Lab Integration & IT Support',
      amount: 55000,
      recurring: true,
      frequency: 'quarterly',
      category: 'technology'
    },
    {
      description: 'Quality Monitoring & Analytics',
      amount: 42000,
      recurring: true,
      frequency: 'quarterly',
      category: 'maintenance'
    },
    {
      description: 'Community Screening Equipment',
      amount: 75000,
      recurring: false,
      frequency: 'one-time',
      category: 'implementation'
    },
    {
      description: 'EP Decision Support Maintenance',
      amount: 28000,
      recurring: true,
      frequency: 'quarterly',
      category: 'maintenance'
    }
  ];

  const epRoiMetrics: EPROIMetric[] = [
    {
      category: 'AFib Screening Rate',
      baseline: currentScreeningRate,
      improved: targetScreeningRate,
      impact: ((targetScreeningRate - currentScreeningRate) / currentScreeningRate) * 100,
      confidence: 89,
      timeframe: '1-year',
      unit: '%'
    },
    {
      category: 'Ablation Success Rate',
      baseline: ablationSuccessRate,
      improved: targetAblationSuccess,
      impact: ((targetAblationSuccess - ablationSuccessRate) / ablationSuccessRate) * 100,
      confidence: 85,
      timeframe: '6-month',
      unit: '%'
    },
    {
      category: 'LAAC Procedure Volume',
      baseline: 85,
      improved: 140,
      impact: ((140 - 85) / 85) * 100,
      confidence: 92,
      timeframe: '1-year',
      unit: 'procedures'
    },
    {
      category: 'Device Complication Rate',
      baseline: 8.5,
      improved: 5.2,
      impact: -38.8,
      confidence: 88,
      timeframe: '6-month',
      unit: '%'
    },
    {
      category: 'EP Lab Utilization',
      baseline: 72.5,
      improved: 87.3,
      impact: 20.4,
      confidence: 83,
      timeframe: '3-month',
      unit: '%'
    },
    {
      category: 'Anticoagulation Adherence',
      baseline: 65.8,
      improved: 82.4,
      impact: 25.2,
      confidence: 81,
      timeframe: '6-month',
      unit: '%'
    }
  ];

  const calculateEPROI = useMemo(() => {
    const timeMultiplier = selectedTimeframe === '1-year' ? 1 : selectedTimeframe === '3-year' ? 3 : 5;
    
    // Calculate procedure revenue impact
    const procedureRevenue = procedureVolumes.reduce((sum, proc) => {
      const volumeIncrease = proc.projectedVolume - proc.currentVolume;
      const netRevenue = (proc.averageReimbursement - proc.averageCost) * (proc.successRate / 100);
      return sum + (volumeIncrease * netRevenue);
    }, 0);

    // Calculate total annual savings
    const totalAnnualSavings = epCostSavings.reduce((sum, saving) => {
      return sum + (saving.annualSaving * saving.probability);
    }, 0) + procedureRevenue;

    // Calculate total investment costs
    const oneTimeCosts = epInvestmentCosts
      .filter(cost => !cost.recurring)
      .reduce((sum, cost) => sum + cost.amount, 0);

    const annualRecurringCosts = epInvestmentCosts
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

    // Calculate procedure-specific ROI
    const ablationROI = procedureVolumes.find(p => p.type === 'ablation');
    const laacROI = procedureVolumes.find(p => p.type === 'laac');
    const deviceROI = procedureVolumes.find(p => p.type === 'device-implant');

    return {
      totalSavings,
      totalCosts,
      netBenefit,
      roiPercentage,
      paybackPeriod,
      annualSavings: totalAnnualSavings,
      annualCosts: annualRecurringCosts,
      procedureRevenue,
      ablationImpact: ablationROI ? (ablationROI.projectedVolume - ablationROI.currentVolume) * 
                     ((ablationROI.averageReimbursement - ablationROI.averageCost) * (ablationROI.successRate / 100)) : 0,
      laacImpact: laacROI ? (laacROI.projectedVolume - laacROI.currentVolume) * 
                 ((laacROI.averageReimbursement - laacROI.averageCost) * (laacROI.successRate / 100)) : 0,
      deviceImpact: deviceROI ? (deviceROI.projectedVolume - deviceROI.currentVolume) * 
                   ((deviceROI.averageReimbursement - deviceROI.averageCost) * (deviceROI.successRate / 100)) : 0
    };
  }, [selectedTimeframe, epCostSavings, epInvestmentCosts, procedureVolumes, afibPopulation, currentScreeningRate, targetScreeningRate, ablationSuccessRate, targetAblationSuccess]);

  const runEPScenarioAnalysis = async () => {
    setIsCalculating(true);
    // Simulate complex EP calculations
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsCalculating(false);
  };

  const exportEPROIReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      specialty: 'Electrophysiology',
      timeframe: selectedTimeframe,
      patientPopulation: {
        afibPopulation,
        currentScreeningRate,
        targetScreeningRate
      },
      procedureMetrics: {
        ablationSuccessRate,
        targetAblationSuccess,
        procedureVolumes
      },
      financialResults: calculateEPROI,
      costSavings: epCostSavings.map(saving => ({
        ...saving,
        probabilityAdjustedSaving: saving.annualSaving * saving.probability
      })),
      investmentCosts: epInvestmentCosts,
      clinicalMetrics: epRoiMetrics,
      summary: {
        recommendedAction: calculateEPROI.roiPercentage > 200 ? 'Strongly Recommended' : 
                          calculateEPROI.roiPercentage > 100 ? 'Recommended' : 
                          calculateEPROI.roiPercentage > 0 ? 'Consider' : 'Reconsider',
        confidenceLevel: 'High',
        keyDrivers: epCostSavings.sort((a, b) => (b.annualSaving * b.probability) - (a.annualSaving * a.probability)).slice(0, 3),
        strategicPriorities: [
          'Expand AFib screening program',
          'Optimize ablation success rates',
          'Grow LAAC procedure volume',
          'Reduce device complications'
        ]
      }
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ep-roi-analysis-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.json`;
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
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-amber-500" />
              <h2 className="text-3xl font-bold text-steel-900">EP ROI Calculation Engine</h2>
            </div>
            <p className="text-steel-600">Comprehensive financial impact modeling for Electrophysiology procedures and programs</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={runEPScenarioAnalysis}
              disabled={isCalculating}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isCalculating 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              } transition-colors`}
            >
              <Calculator className="w-4 h-4" />
              {isCalculating ? 'Calculating...' : 'Run EP Analysis'}
            </button>
            
            <button
              onClick={exportEPROIReport}
              className="px-4 py-2 bg-medical-green-500 text-white rounded-lg hover:bg-medical-green-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export EP Report
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
              <div className="text-sm text-green-700 font-medium">EP ROI</div>
              <div className="text-3xl font-bold text-green-800">{calculateEPROI.roiPercentage.toFixed(0)}%</div>
            </div>
          </div>
          <div className="text-sm text-green-600">Over {selectedTimeframe}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-sm text-blue-700 font-medium">Net Benefit</div>
              <div className="text-3xl font-bold text-blue-800">${(calculateEPROI.netBenefit / 1000000).toFixed(1)}M</div>
            </div>
          </div>
          <div className="text-sm text-blue-600">Total savings minus costs</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-sm text-purple-700 font-medium">Payback Period</div>
              <div className="text-3xl font-bold text-purple-800">{calculateEPROI.paybackPeriod.toFixed(1)} yr</div>
            </div>
          </div>
          <div className="text-sm text-purple-600">Time to recover investment</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-amber-600" />
            <div>
              <div className="text-sm text-amber-700 font-medium">Annual Savings</div>
              <div className="text-3xl font-bold text-amber-800">${(calculateEPROI.annualSavings / 1000000).toFixed(1)}M</div>
            </div>
          </div>
          <div className="text-sm text-amber-600">Per year potential</div>
        </div>
      </div>

      {/* Procedure-Specific ROI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-sm text-red-700 font-medium">Ablation Revenue Impact</div>
              <div className="text-2xl font-bold text-red-800">${(calculateEPROI.ablationImpact / 1000).toFixed(0)}K</div>
            </div>
          </div>
          <div className="text-sm text-red-600">Annual additional revenue</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="text-sm text-indigo-700 font-medium">LAAC Revenue Impact</div>
              <div className="text-2xl font-bold text-indigo-800">${(calculateEPROI.laacImpact / 1000).toFixed(0)}K</div>
            </div>
          </div>
          <div className="text-sm text-indigo-600">Annual additional revenue</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="text-sm text-emerald-700 font-medium">Device Revenue Impact</div>
              <div className="text-2xl font-bold text-emerald-800">${(calculateEPROI.deviceImpact / 1000).toFixed(0)}K</div>
            </div>
          </div>
          <div className="text-sm text-emerald-600">Annual additional revenue</div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">EP Scenario Parameters</h3>
          
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
              <label className="block text-sm font-medium text-steel-700 mb-2">AFib Population</label>
              <input 
                type="number" 
                value={afibPopulation}
                onChange={(e) => setAfibPopulation(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Current Screening Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={currentScreeningRate}
                onChange={(e) => setCurrentScreeningRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Target Screening Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={targetScreeningRate}
                onChange={(e) => setTargetScreeningRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Current Ablation Success (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={ablationSuccessRate}
                onChange={(e) => setAblationSuccessRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-700 mb-2">Target Ablation Success (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={targetAblationSuccess}
                onChange={(e) => setTargetAblationSuccess(Number(e.target.value))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* EP Cost Savings Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">Annual EP Cost Savings</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {epCostSavings.map((saving, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-steel-900 text-sm">{saving.description}</div>
                  <div className="text-xs text-steel-600 flex items-center gap-2">
                    <span>{(saving.probability * 100).toFixed(0)}% confidence</span>
                    <span>•</span>
                    <span className="capitalize">{saving.category.replace('-', ' ')}</span>
                    {saving.procedureType && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{saving.procedureType.replace('-', ' ')}</span>
                      </>
                    )}
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

        {/* EP Investment Costs */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">EP Investment Costs</h3>
          
          <div className="space-y-3">
            {epInvestmentCosts.map((cost, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-steel-900 text-sm">{cost.description}</div>
                  <div className="text-xs text-steel-600 flex items-center gap-2">
                    <span className="capitalize">{cost.recurring ? cost.frequency : 'one-time'}</span>
                    <span>•</span>
                    <span className="capitalize">{cost.category}</span>
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
                  ${(calculateEPROI.annualCosts / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Procedure Volume Forecasting */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <h3 className="text-xl font-bold text-steel-900 mb-4">EP Procedure Volume & Revenue Forecasting</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {procedureVolumes.map((proc, index) => (
            <div key={index} className="p-4 border border-steel-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {proc.type === 'ablation' && <Zap className="w-5 h-5 text-red-500" />}
                {proc.type === 'device-implant' && <Heart className="w-5 h-5 text-emerald-500" />}
                {proc.type === 'laac' && <Shield className="w-5 h-5 text-indigo-500" />}
                {proc.type === 'afib-screening' && <Activity className="w-5 h-5 text-amber-500" />}
                <span className="font-medium text-steel-900 text-sm capitalize">
                  {proc.type.replace('-', ' ')}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-steel-600">Current Volume:</span>
                  <span className="font-medium">{Math.round(proc.currentVolume)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-steel-600">Projected Volume:</span>
                  <span className="font-medium text-blue-600">{Math.round(proc.projectedVolume)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-steel-600">Success Rate:</span>
                  <span className="font-medium">{proc.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-steel-600">Net Revenue:</span>
                  <span className="font-medium text-green-600">
                    ${((proc.averageReimbursement - proc.averageCost) / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="pt-2 border-t border-steel-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-600">Annual Impact:</span>
                    <span className="font-bold text-green-700">
                      ${(((proc.projectedVolume - proc.currentVolume) * 
                          (proc.averageReimbursement - proc.averageCost) * 
                          (proc.successRate / 100)) / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EP ROI Metrics */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <h3 className="text-xl font-bold text-steel-900 mb-4">Expected EP Clinical & Operational Improvements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {epRoiMetrics.map((metric, index) => (
            <div key={index} className="p-4 border border-steel-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-steel-900 text-sm">{metric.category}</span>
                <span className="text-xs text-steel-500">{metric.timeframe}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-steel-700">
                    {metric.baseline}{metric.unit === '%' ? '%' : ''}
                  </div>
                  <div className="text-xs text-steel-500">Baseline</div>
                </div>
                
                <div className="flex items-center">
                  {metric.impact > 0 ? 
                    <TrendingUp className="w-4 h-4 text-green-500" /> : 
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  }
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-medical-green-600">
                    {metric.improved}{metric.unit === '%' ? '%' : ''}
                  </div>
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

      {/* EP-Specific Recommendation Summary */}
      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-6 rounded-xl border border-amber-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-full">
            <Zap className="w-8 h-8 text-amber-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-steel-900 mb-2">EP Investment Recommendation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-steel-600">Recommendation</div>
                <div className="text-lg font-bold text-green-600">
                  {calculateEPROI.roiPercentage > 200 ? 'Strongly Recommended' : 
                   calculateEPROI.roiPercentage > 100 ? 'Recommended' : 
                   calculateEPROI.roiPercentage > 0 ? 'Consider' : 'Reconsider'}
                </div>
              </div>
              <div>
                <div className="text-sm text-steel-600">Risk Level</div>
                <div className="text-lg font-bold text-blue-600">Low</div>
              </div>
              <div>
                <div className="text-sm text-steel-600">Strategic Priority</div>
                <div className="text-lg font-bold text-purple-600">High</div>
              </div>
              <div>
                <div className="text-sm text-steel-600">Implementation Focus</div>
                <div className="text-lg font-bold text-amber-600">AFib & LAAC</div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-white rounded-lg">
              <div className="text-sm text-steel-600 mb-2">Key Strategic Priorities:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm">Expand AFib screening program</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Optimize ablation success rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm">Grow LAAC procedure volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm">Reduce device complications</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPROICalculator;