import React from 'react';
import { FileText, AlertTriangle, TrendingUp, Clock, DollarSign, Target, CheckCircle, User } from 'lucide-react';
import { cdiAlerts } from '../../../data/claimsData';

const RCCDIView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* CDI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="retina-card p-6 border-l-4 border-l-medical-blue-400 bg-medical-blue-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                CDI Opportunities
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                {cdiAlerts.length}
              </div>
              <div className="text-sm text-steel-600">Active Alerts</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-blue-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-medical-blue-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-blue-600">
            <TrendingUp className="w-4 h-4" />
            <span>18%</span>
            <span className="text-steel-500 font-normal ml-1">of total admissions</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-green-400 bg-medical-green-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Revenue Impact
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                $127K
              </div>
              <div className="text-sm text-steel-600">Monthly Potential</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-green-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <DollarSign className="w-6 h-6 text-medical-green-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+23%</span>
            <span className="text-steel-500 font-normal ml-1">vs last month</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-amber-400 bg-medical-amber-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Response Rate
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                87.3%
              </div>
              <div className="text-sm text-steel-600">Within 48 Hours</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-amber-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <Clock className="w-6 h-6 text-medical-amber-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+12%</span>
            <span className="text-steel-500 font-normal ml-1">improvement</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-purple-400 bg-medical-purple-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                CMI Impact
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                +0.34
              </div>
              <div className="text-sm text-steel-600">Potential Increase</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-purple-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <Target className="w-6 h-6 text-medical-purple-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-purple-600">
            <TrendingUp className="w-4 h-4" />
            <span>0.52</span>
            <span className="text-steel-500 font-normal ml-1">total opportunity</span>
          </div>
        </div>
      </div>

      {/* High Priority CDI Alerts */}
      <div className="retina-card">
        <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-red-50/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-steel-900 mb-2">High Priority CDI Alerts</h3>
              <p className="text-sm text-steel-600">Documentation opportunities requiring immediate attention</p>
            </div>
            <div className="bg-medical-red-100 text-medical-red-800 px-3 py-1 rounded-full text-sm font-medium">
              {cdiAlerts.filter(alert => alert.priority === 'high').length} High Priority
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-200">
          {cdiAlerts.map((alert, index) => (
            <div key={index} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    alert.priority === 'high' 
                      ? 'bg-medical-red-100 text-medical-red-600'
                      : alert.priority === 'medium'
                      ? 'bg-medical-amber-100 text-medical-amber-600'
                      : 'bg-medical-blue-100 text-medical-blue-600'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-steel-900 mb-1">
                      Patient ID: {alert.patientId}
                    </div>
                    <div className="text-sm text-steel-600 mb-2">
                      Due: {new Date(alert.dueDate).toLocaleDateString()}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alert.priority === 'high'
                        ? 'bg-medical-red-100 text-medical-red-800'
                        : alert.priority === 'medium'
                        ? 'bg-medical-amber-100 text-medical-amber-800'
                        : 'bg-medical-blue-100 text-medical-blue-800'
                    }`}>
                      {alert.priority.toUpperCase()} PRIORITY
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-medical-green-700">
                    +${alert.impactAnalysis.reimbursementImpact.toLocaleString()}
                  </div>
                  <div className="text-sm text-steel-500">Revenue Impact</div>
                  <div className="text-sm text-medical-blue-600 mt-1">
                    CMI: +{alert.impactAnalysis.cmiImpact}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                <div>
                  <div className="text-sm font-semibold text-steel-700 mb-2">Current Diagnoses</div>
                  <div className="space-y-1">
                    {alert.currentDiagnoses.map((diagnosis, diagIndex) => (
                      <div key={diagIndex} className="text-sm text-steel-600 bg-slate-100 px-3 py-1 rounded">
                        {diagnosis}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-semibold text-steel-700 mb-2">Suggested Additions</div>
                  <div className="space-y-1">
                    {alert.suggestedAdditions.map((suggestion, suggIndex) => (
                      <div key={suggIndex} className="text-sm text-medical-green-700 bg-medical-green-100 px-3 py-1 rounded border border-medical-green-200">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm font-semibold text-steel-700 mb-3">Clinical Impact Analysis</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-steel-600">Severity Change</div>
                    <div className="font-semibold text-steel-900">
                      {alert.impactAnalysis.severityChange > 0 ? '+' : ''}{alert.impactAnalysis.severityChange} level
                    </div>
                  </div>
                  <div>
                    <div className="text-steel-600">Mortality Risk</div>
                    <div className="font-semibold text-steel-900">
                      {alert.impactAnalysis.mortalityChange > 0 ? '+' : ''}{alert.impactAnalysis.mortalityChange} level
                    </div>
                  </div>
                  <div>
                    <div className="text-steel-600">Reimbursement</div>
                    <div className="font-semibold text-medical-green-700">
                      +${alert.impactAnalysis.reimbursementImpact.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-steel-600">CMI Impact</div>
                    <div className="font-semibold text-medical-blue-700">
                      +{alert.impactAnalysis.cmiImpact}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-medical-green-600 text-white text-sm rounded-lg hover:bg-medical-green-700 transition-colors font-medium">
                  Accept Suggestions
                </button>
                <button className="px-4 py-2 bg-steel-100 text-steel-700 text-sm rounded-lg hover:bg-steel-200 transition-colors font-medium">
                  Request Physician Review
                </button>
                <button className="px-4 py-2 bg-steel-100 text-steel-700 text-sm rounded-lg hover:bg-steel-200 transition-colors font-medium">
                  Query Provider
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CDI Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-blue-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">CDI Performance by Service Line</h3>
            <p className="text-sm text-steel-600">Documentation improvement opportunities by specialty</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-medical-red-50 to-medical-red-100 rounded-lg border border-medical-red-200">
              <div>
                <div className="font-semibold text-medical-red-900">Cardiovascular</div>
                <div className="text-sm text-medical-red-700">23 opportunities • $67K potential</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-medical-red-800">34%</div>
                <div className="text-xs text-medical-red-600">of total opportunities</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-lg border border-medical-amber-200">
              <div>
                <div className="font-semibold text-medical-amber-900">Respiratory</div>
                <div className="text-sm text-medical-amber-700">18 opportunities • $42K potential</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-medical-amber-800">27%</div>
                <div className="text-xs text-medical-amber-600">of total opportunities</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg border border-medical-blue-200">
              <div>
                <div className="font-semibold text-medical-blue-900">Endocrine</div>
                <div className="text-sm text-medical-blue-700">12 opportunities • $18K potential</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-medical-blue-800">18%</div>
                <div className="text-xs text-medical-blue-600">of total opportunities</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-steel-50 to-steel-100 rounded-lg border border-steel-200">
              <div>
                <div className="font-semibold text-steel-900">Other</div>
                <div className="text-sm text-steel-700">14 opportunities • $24K potential</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-steel-800">21%</div>
                <div className="text-xs text-steel-600">of total opportunities</div>
              </div>
            </div>
          </div>
        </div>

        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-green-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Monthly CDI Impact</h3>
            <p className="text-sm text-steel-600">Revenue recovery and quality improvements</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-lg p-4 border border-medical-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-medical-green-900">Revenue Recovery</div>
                  <CheckCircle className="w-5 h-5 text-medical-green-600" />
                </div>
                <div className="text-2xl font-bold text-medical-green-800 mb-2">$89,450</div>
                <div className="text-sm text-medical-green-700">
                  From 34 resolved alerts this month
                </div>
              </div>

              <div className="bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg p-4 border border-medical-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-medical-blue-900">CMI Improvement</div>
                  <TrendingUp className="w-5 h-5 text-medical-blue-600" />
                </div>
                <div className="text-2xl font-bold text-medical-blue-800 mb-2">+0.23</div>
                <div className="text-sm text-medical-blue-700">
                  Average increase per resolved case
                </div>
              </div>

              <div className="bg-gradient-to-r from-medical-purple-50 to-medical-purple-100 rounded-lg p-4 border border-medical-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-medical-purple-900">Quality Impact</div>
                  <Target className="w-5 h-5 text-medical-purple-600" />
                </div>
                <div className="text-2xl font-bold text-medical-purple-800 mb-2">94.2%</div>
                <div className="text-sm text-medical-purple-700">
                  Risk-adjusted quality score improvement
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-steel-700 mb-3">Key Success Metrics</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-steel-600">Average Response Time</span>
                  <span className="font-semibold text-steel-900">18.3 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Provider Acceptance Rate</span>
                  <span className="font-semibold text-steel-900">87.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Appeal Success Rate</span>
                  <span className="font-semibold text-steel-900">92.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-600">Recurring Issues</span>
                  <span className="font-semibold text-medical-red-700">-34%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RCCDIView;