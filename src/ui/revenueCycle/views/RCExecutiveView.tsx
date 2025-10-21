import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Target, BarChart3, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { revenueCycleData } from '../../../data/claimsData';

const RCExecutiveView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="retina-card p-6 border-l-4 border-l-medical-green-400 bg-medical-green-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Net Collection Rate
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                94.2%
              </div>
              <div className="text-sm text-steel-600">YTD Performance</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-green-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <DollarSign className="w-6 h-6 text-medical-green-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+2.3%</span>
            <span className="text-steel-500 font-normal ml-1">vs last year</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-blue-400 bg-medical-blue-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Case Mix Index
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                1.68
              </div>
              <div className="text-sm text-steel-600">Current Month</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-blue-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <BarChart3 className="w-6 h-6 text-medical-blue-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-blue-600">
            <TrendingUp className="w-4 h-4" />
            <span>+0.12</span>
            <span className="text-steel-500 font-normal ml-1">opportunity identified</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-amber-400 bg-medical-amber-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Days in A/R
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                42.3
              </div>
              <div className="text-sm text-steel-600">Average Days</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-amber-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <Clock className="w-6 h-6 text-medical-amber-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            <span>-3.2</span>
            <span className="text-steel-500 font-normal ml-1">days improved</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-red-400 bg-medical-red-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Denial Rate
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                8.7%
              </div>
              <div className="text-sm text-steel-600">Initial Denials</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-red-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <XCircle className="w-6 h-6 text-medical-red-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            <span>-1.4%</span>
            <span className="text-steel-500 font-normal ml-1">reduction</span>
          </div>
        </div>
      </div>

      {/* DRG Optimization Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-green-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">DRG Optimization Opportunities</h3>
            <p className="text-sm text-steel-600">Real-time identification of coding improvements</p>
          </div>
          
          <div className="p-6 space-y-4">
            {revenueCycleData.drgOptimization.potentialUpcoding.map((opportunity, index) => (
              <div key={index} className="bg-gradient-to-r from-medical-green-50 to-medical-blue-50 rounded-lg p-4 border border-medical-green-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-medical-green-800">
                        DRG {opportunity.currentDRG} → {opportunity.potentialDRG}
                      </span>
                      <span className="bg-medical-green-100 text-medical-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        {opportunity.confidence}% Confidence
                      </span>
                    </div>
                    <div className="text-xs text-steel-600 mb-2">
                      Documentation needed: {opportunity.documentationNeeded.join(', ')}
                    </div>
                    <div className="text-xs text-steel-500">
                      Due in {opportunity.timeframe}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-medical-green-700">
                      +${opportunity.revenueImpact.toLocaleString()}
                    </div>
                    <div className="text-xs text-steel-500">Revenue Impact</div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-medical-blue-50 rounded-lg p-4 border border-medical-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-medical-blue-900">Total Monthly Opportunity</div>
                  <div className="text-sm text-medical-blue-700">CMI increase potential: +{revenueCycleData.drgOptimization.cmiOpportunities}</div>
                </div>
                <div className="text-xl font-bold text-medical-blue-800">
                  +$127K
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payer Performance Analysis */}
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-blue-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Payer Performance Analysis</h3>
            <p className="text-sm text-steel-600">Contract performance and reimbursement trends</p>
          </div>
          
          <div className="p-6">
            {revenueCycleData.pricingAnalysis.contractPerformance.map((payer, index) => (
              <div key={index} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-steel-900">{payer.payerName}</div>
                  <div className="text-sm text-steel-600">
                    {payer.totalVolume} claims • ${(payer.totalRevenue / 1000000).toFixed(1)}M revenue
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm text-steel-600 mb-1">Avg Days to Payment</div>
                    <div className="text-xl font-bold text-steel-900">{payer.avgDaysToPayment}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm text-steel-600 mb-1">Denial Rate</div>
                    <div className="text-xl font-bold text-steel-900">
                      {Object.values(payer.denialRates)[0]}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(payer.contractedRates).map(([drg, rate]) => (
                    <div key={drg} className="flex items-center justify-between py-2 border-b border-steel-100 last:border-b-0">
                      <span className="text-sm font-medium text-steel-700">DRG {drg}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-steel-900">
                          ${rate.toLocaleString()}
                        </div>
                        <div className="text-xs text-steel-500">
                          Paid: ${payer.actualPayments[drg]?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Performance Dashboard */}
      <div className="retina-card">
        <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-blue-50/40">
          <h3 className="text-lg font-semibold text-steel-900 mb-2">Financial Performance Dashboard</h3>
          <p className="text-sm text-steel-600">Revenue cycle metrics and trends</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-lg p-4 border border-medical-green-200">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-8 h-8 text-medical-green-600" />
                <div>
                  <div className="font-semibold text-medical-green-900">Clean Claim Rate</div>
                  <div className="text-2xl font-bold text-medical-green-800">91.4%</div>
                </div>
              </div>
              <div className="text-sm text-medical-green-700">
                +2.1% improvement from last quarter
              </div>
            </div>

            <div className="bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg p-4 border border-medical-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-8 h-8 text-medical-blue-600" />
                <div>
                  <div className="font-semibold text-medical-blue-900">First Pass Resolution</div>
                  <div className="text-2xl font-bold text-medical-blue-800">87.2%</div>
                </div>
              </div>
              <div className="text-sm text-medical-blue-700">
                Target: 90% (opportunity: +$45K/month)
              </div>
            </div>

            <div className="bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-lg p-4 border border-medical-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-8 h-8 text-medical-amber-600" />
                <div>
                  <div className="font-semibold text-medical-amber-900">RVU per FTE</div>
                  <div className="text-2xl font-bold text-medical-amber-800">4,567</div>
                </div>
              </div>
              <div className="text-sm text-medical-amber-700">
                +156 RVUs vs benchmark
              </div>
            </div>
          </div>

          {/* Bundled Payment Performance */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-steel-900 mb-4">Bundled Payment Performance</h4>
            {revenueCycleData.pricingAnalysis.bundledPaymentTracking.map((bundle, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-steel-900">{bundle.bundleName}</div>
                  <div className="text-lg font-bold text-medical-green-700">
                    +${bundle.margin.toLocaleString()} margin
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-steel-600">Target Price</div>
                    <div className="font-semibold text-steel-900">${bundle.targetPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Actual Cost</div>
                    <div className="font-semibold text-steel-900">${bundle.actualCost.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Quality Bonuses</div>
                    <div className="font-semibold text-medical-green-700">
                      +${Object.values(bundle.qualityBonuses).reduce((a, b) => a + b, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RCExecutiveView;