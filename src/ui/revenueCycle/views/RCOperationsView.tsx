import React from 'react';
import { Clock, AlertTriangle, TrendingUp, FileX, CheckCircle, Users, DollarSign, Target } from 'lucide-react';
import { revenueCycleData } from '../../../data/claimsData';

const RCOperationsView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Claims Processing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="retina-card p-6 border-l-4 border-l-medical-blue-400 bg-medical-blue-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Claims in Process
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                1,247
              </div>
              <div className="text-sm text-steel-600">Active Claims</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-blue-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <FileX className="w-6 h-6 text-medical-blue-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            <span>-8.2%</span>
            <span className="text-steel-500 font-normal ml-1">vs last month</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-amber-400 bg-medical-amber-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Avg Processing Time
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                3.2
              </div>
              <div className="text-sm text-steel-600">Days</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-amber-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <Clock className="w-6 h-6 text-medical-amber-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            <span>-0.8</span>
            <span className="text-steel-500 font-normal ml-1">days improved</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-green-400 bg-medical-green-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Clean Claim Rate
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                91.4%
              </div>
              <div className="text-sm text-steel-600">First Pass</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-green-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <CheckCircle className="w-6 h-6 text-medical-green-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+2.1%</span>
            <span className="text-steel-500 font-normal ml-1">improvement</span>
          </div>
        </div>

        <div className="retina-card p-6 border-l-4 border-l-medical-red-400 bg-medical-red-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-600 uppercase tracking-wider mb-2">
                Active Denials
              </div>
              <div className="text-3xl font-bold text-steel-900 mb-1 font-sf">
                89
              </div>
              <div className="text-sm text-steel-600">Requiring Action</div>
            </div>
            <div className="ml-4 p-3 rounded-xl bg-gradient-to-br from-white/80 via-medical-red-50/60 to-white/70 backdrop-blur border border-white/30 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-medical-red-600 drop-shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-medical-green-600">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            <span>-12</span>
            <span className="text-steel-500 font-normal ml-1">denials resolved</span>
          </div>
        </div>
      </div>

      {/* Denial Management Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-red-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Active Denial Management</h3>
            <p className="text-sm text-steel-600">High-priority denials requiring immediate action</p>
          </div>
          
          <div className="p-6 space-y-4">
            {[
              {
                claimId: "CLM-2024-15892",
                patientName: "Johnson, M.",
                drg: "291",
                drgDescription: "Heart Failure & Shock w MCC",
                denialReason: "Medical Necessity",
                amount: 47250,
                daysOutstanding: 12,
                priority: "high" as const,
                appealDeadline: "5 days"
              },
              {
                claimId: "CLM-2024-15743",
                patientName: "Chen, L.",
                drg: "246",
                drgDescription: "Percutaneous Cardiovascular Proc w Drug-Eluting Stent",
                denialReason: "Documentation Incomplete",
                amount: 68400,
                daysOutstanding: 8,
                priority: "high" as const,
                appealDeadline: "9 days"
              },
              {
                claimId: "CLM-2024-15621",
                patientName: "Rodriguez, A.",
                drg: "242",
                drgDescription: "Permanent Cardiac Pacemaker Implant",
                denialReason: "Authorization Required",
                amount: 52800,
                daysOutstanding: 15,
                priority: "medium" as const,
                appealDeadline: "2 days"
              }
            ].map((denial, index) => (
              <div key={index} className={`rounded-lg p-4 border ${
                denial.priority === 'high' 
                  ? 'bg-gradient-to-r from-medical-red-50 to-medical-amber-50 border-medical-red-200' 
                  : 'bg-gradient-to-r from-medical-amber-50 to-medical-blue-50 border-medical-amber-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-steel-900">{denial.claimId}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        denial.priority === 'high' 
                          ? 'bg-medical-red-100 text-medical-red-800' 
                          : 'bg-medical-amber-100 text-medical-amber-800'
                      }`}>
                        {denial.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <div className="text-sm font-medium text-steel-800 mb-1">
                      {denial.patientName} • DRG {denial.drg}
                    </div>
                    <div className="text-xs text-steel-600 mb-2">
                      {denial.drgDescription}
                    </div>
                    <div className="text-xs text-medical-red-700 font-medium">
                      Denial: {denial.denialReason}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-steel-900">
                      ${denial.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-steel-500">{denial.daysOutstanding} days outstanding</div>
                    <div className="text-xs text-medical-red-600 font-medium mt-1">
                      Appeal due: {denial.appealDeadline}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-medical-blue-50 rounded-lg p-4 border border-medical-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-medical-blue-900">Total Outstanding Denials</div>
                  <div className="text-sm text-medical-blue-700">Potential revenue at risk</div>
                </div>
                <div className="text-xl font-bold text-medical-blue-800">
                  $1.2M
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claims Processing Workflow */}
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-green-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Claims Processing Pipeline</h3>
            <p className="text-sm text-steel-600">Real-time workflow status and bottlenecks</p>
          </div>
          
          <div className="p-6">
            {[
              {
                stage: "Charge Capture",
                count: 156,
                avgTime: "4.2 hours",
                status: "normal" as const,
                target: "< 6 hours"
              },
              {
                stage: "Coding Review",
                count: 89,
                avgTime: "2.8 hours",
                status: "good" as const,
                target: "< 4 hours"
              },
              {
                stage: "Claims Submission",
                count: 342,
                avgTime: "1.2 hours",
                status: "good" as const,
                target: "< 2 hours"
              },
              {
                stage: "Payer Adjudication",
                count: 567,
                avgTime: "14.7 days",
                status: "warning" as const,
                target: "< 12 days"
              },
              {
                stage: "Payment Posting",
                count: 198,
                avgTime: "6.4 hours",
                status: "warning" as const,
                target: "< 4 hours"
              }
            ].map((stage, index) => (
              <div key={index} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-steel-900">{stage.stage}</div>
                  <div className={`text-sm px-2 py-1 rounded-full font-medium ${
                    stage.status === 'good' ? 'bg-medical-green-100 text-medical-green-800' :
                    stage.status === 'warning' ? 'bg-medical-amber-100 text-medical-amber-800' :
                    'bg-slate-100 text-steel-700'
                  }`}>
                    {stage.count} claims
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm text-steel-600 mb-1">Average Time</div>
                    <div className="text-xl font-bold text-steel-900">{stage.avgTime}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm text-steel-600 mb-1">Target</div>
                    <div className="text-xl font-bold text-steel-900">{stage.target}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-steel-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      stage.status === 'good' ? 'bg-gradient-to-r from-medical-green-400 to-medical-green-600' :
                      stage.status === 'warning' ? 'bg-gradient-to-r from-medical-amber-400 to-medical-amber-600' :
                      'bg-gradient-to-r from-slate-400 to-slate-600'
                    }`}
                    style={{ 
                      width: stage.status === 'good' ? '85%' : 
                             stage.status === 'warning' ? '65%' : '75%' 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Performance Analytics */}
      <div className="retina-card">
        <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-blue-50/40">
          <h3 className="text-lg font-semibold text-steel-900 mb-2">Revenue Cycle Team Performance</h3>
          <p className="text-sm text-steel-600">Individual and team productivity metrics</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-lg p-4 border border-medical-green-200">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-8 h-8 text-medical-green-600" />
                <div>
                  <div className="font-semibold text-medical-green-900">Active Staff</div>
                  <div className="text-2xl font-bold text-medical-green-800">24</div>
                </div>
              </div>
              <div className="text-sm text-medical-green-700">
                3 FTEs above target staffing
              </div>
            </div>

            <div className="bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg p-4 border border-medical-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-8 h-8 text-medical-blue-600" />
                <div>
                  <div className="font-semibold text-medical-blue-900">Productivity Score</div>
                  <div className="text-2xl font-bold text-medical-blue-800">94.2%</div>
                </div>
              </div>
              <div className="text-sm text-medical-blue-700">
                +4.8% above department average
              </div>
            </div>

            <div className="bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-lg p-4 border border-medical-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-8 h-8 text-medical-amber-600" />
                <div>
                  <div className="font-semibold text-medical-amber-900">Revenue per FTE</div>
                  <div className="text-2xl font-bold text-medical-amber-800">$2.4M</div>
                </div>
              </div>
              <div className="text-sm text-medical-amber-700">
                Annual productivity per employee
              </div>
            </div>
          </div>

          {/* Team Member Performance */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-steel-900 mb-4">Top Performers This Month</h4>
            {[
              {
                name: "Sarah Chen",
                role: "Senior Coder",
                claimsProcessed: 287,
                accuracy: 98.2,
                avgTime: "12 min",
                specialization: "Cardiology"
              },
              {
                name: "Michael Rodriguez",
                role: "Denial Specialist",
                claimsProcessed: 156,
                accuracy: 96.8,
                avgTime: "18 min",
                specialization: "Appeals"
              },
              {
                name: "Jennifer Kim",
                role: "CDI Analyst",
                claimsProcessed: 203,
                accuracy: 97.5,
                avgTime: "15 min",
                specialization: "Documentation"
              }
            ].map((performer, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-slate-100 mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-steel-900">{performer.name}</div>
                    <div className="text-sm text-steel-600">{performer.role} • {performer.specialization}</div>
                  </div>
                  <div className="text-lg font-bold text-medical-green-700">
                    {performer.accuracy}% accuracy
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-steel-600">Claims Processed</div>
                    <div className="font-semibold text-steel-900">{performer.claimsProcessed}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Avg Time</div>
                    <div className="font-semibold text-steel-900">{performer.avgTime}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Efficiency</div>
                    <div className="font-semibold text-medical-green-700">+12% above target</div>
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

export default RCOperationsView;