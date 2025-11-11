import React, { useState } from 'react';
import { Heart, Users, Calculator, Shield, Activity, Target, BarChart3, FileText, TrendingUp, Scissors, Route, Gauge } from 'lucide-react';

// Import Coronary Intervention components
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';
import PCINetworkVisualization from '../components/PCINetworkVisualization';

type TabId = 'cabg-vs-pci' | 'protected-pci' | 'multi-arterial' | 'on-off-pump' | 'grace' | 'timi' | 'syntax' | 'safety' | 'network' | 'analytics' | 'outcomes' | 'reporting';

const CoronaryServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('cabg-vs-pci');

  const tabs = [
    { id: 'cabg-vs-pci', label: 'CABG vs PCI', icon: Route, description: 'CABG vs PCI decision tool' },
    { id: 'protected-pci', label: 'Protected PCI', icon: Shield, description: 'Protected PCI planner' },
    { id: 'multi-arterial', label: 'Multi-Arterial', icon: Target, description: 'Multi-arterial graft calculator' },
    { id: 'on-off-pump', label: 'On/Off Pump', icon: Activity, description: 'On-pump vs off-pump decision' },
    { id: 'grace', label: 'GRACE Score', icon: Calculator, description: 'GRACE risk calculator' },
    { id: 'timi', label: 'TIMI Score', icon: Gauge, description: 'TIMI risk calculator' },
    { id: 'syntax', label: 'SYNTAX Score', icon: BarChart3, description: 'SYNTAX score calculator' },
    { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Coronary safety screening' },
    { id: 'network', label: 'PCI Network', icon: Users, description: 'PCI referral network' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Advanced coronary analytics' },
    { id: 'outcomes', label: 'Outcomes', icon: TrendingUp, description: 'Procedural outcomes' },
    { id: 'reporting', label: 'Reporting', icon: FileText, description: 'Automated reports' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'grace':
        return <GRACEScoreCalculator />;
      case 'timi':
        return <TIMIScoreCalculator />;
      case 'syntax':
        return <SYNTAXScoreCalculator />;
      case 'safety':
        return <CoronarySafetyScreening />;
      case 'network':
        return <PCINetworkVisualization />;
      case 'cabg-vs-pci':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Route className="w-8 h-8 text-medical-red-600" />
              CABG vs PCI Decision Tool
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-steel-900">Decision Factors</h4>
                <div className="space-y-4">
                  {[
                    { factor: 'SYNTAX Score', cabg: '&gt;32 (High)', pci: '≤22 (Low)', weight: 'Critical' },
                    { factor: 'Number of Vessels', cabg: '3-vessel/LM', pci: '1-2 vessel', weight: 'High' },
                    { factor: 'Diabetes', cabg: 'Preferred', pci: 'Consider', weight: 'High' },
                    { factor: 'Age', cabg: '&lt;80 years', pci: 'Any age', weight: 'Medium' },
                    { factor: 'EF', cabg: '&gt;30%', pci: 'Any EF', weight: 'Medium' }
                  ].map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl border border-steel-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-steel-900">{item.factor}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.weight === 'Critical' ? 'bg-red-100 text-red-700' :
                          item.weight === 'High' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {item.weight}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <div className="text-red-700 font-medium">CABG</div>
                          <div className="text-red-600" dangerouslySetInnerHTML={{__html: item.cabg}}></div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <div className="text-blue-700 font-medium">PCI</div>
                          <div className="text-blue-600" dangerouslySetInnerHTML={{__html: item.pci}}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-steel-900">Outcomes Comparison</h4>
                <div className="bg-white p-6 rounded-xl border border-steel-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-red-600 font-semibold mb-3">CABG</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>30-day mortality</span>
                          <span className="font-medium">2.9%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5-year survival</span>
                          <span className="font-medium">88.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Repeat revascularization</span>
                          <span className="font-medium">9.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stroke</span>
                          <span className="font-medium">2.4%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-semibold mb-3">PCI</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>30-day mortality</span>
                          <span className="font-medium">1.9%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>5-year survival</span>
                          <span className="font-medium">85.9%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Repeat revascularization</span>
                          <span className="font-medium">25.8%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stroke</span>
                          <span className="font-medium">1.6%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'protected-pci':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-medical-green-600" />
              Protected PCI Planner
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { type: 'IABP', cases: 47, success: '92.3%' },
                { type: 'Impella CP', cases: 23, success: '89.7%' },
                { type: 'ECMO', cases: 8, success: '75.0%' }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 rounded-xl bg-green-50 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">{item.cases}</div>
                  <div className="font-semibold text-steel-900">{item.type}</div>
                  <div className="text-sm text-green-600">{item.success} success</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Selection Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>EF &lt;35%</span><span className="text-green-600">✓ Indication</span></div>
                  <div className="flex justify-between"><span>Unprotected LM</span><span className="text-green-600">✓ Indication</span></div>
                  <div className="flex justify-between"><span>Last patent vessel</span><span className="text-green-600">✓ Indication</span></div>
                  <div className="flex justify-between"><span>High SYNTAX score</span><span className="text-amber-600">Consider</span></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4">Device Selection</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900">IABP</div>
                    <div className="text-sm text-blue-600">Stable hemodynamics, planned procedure</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-900">Impella</div>
                    <div className="text-sm text-purple-600">Cardiogenic shock, complex lesions</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="font-medium text-red-900">ECMO</div>
                    <div className="text-sm text-red-600">Severe cardiogenic shock</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'multi-arterial':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-medical-purple-600" />
              Multi-Arterial Graft Calculator
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { graft: 'LIMA-LAD', patency: '95.2%', usage: '98%' },
                { graft: 'RIMA', patency: '91.8%', usage: '67%' },
                { graft: 'Radial', patency: '89.4%', usage: '45%' },
                { graft: 'SVG', patency: '78.3%', usage: '23%' }
              ].map((item, index) => (
                <div key={index} className="text-center p-6 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="text-lg font-bold text-purple-600 mb-1">{item.patency}</div>
                  <div className="font-semibold text-steel-900">{item.graft}</div>
                  <div className="text-sm text-purple-600">Used in {item.usage}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'on-off-pump':
        return (
          <div className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-steel-900 mb-6 flex items-center gap-3">
              <Activity className="w-8 h-8 text-medical-amber-600" />
              On-Pump vs Off-Pump Decision
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4 text-center text-amber-600">On-Pump CABG</h4>
                <div className="space-y-3">
                  <div className="text-green-600 font-medium">Advantages:</div>
                  <ul className="text-sm space-y-1 text-steel-700">
                    <li>• Complete revascularization</li>
                    <li>• Better graft patency</li>
                    <li>• Precise anastomosis</li>
                    <li>• Standard technique</li>
                  </ul>
                  <div className="text-red-600 font-medium mt-3">Disadvantages:</div>
                  <ul className="text-sm space-y-1 text-steel-700">
                    <li>• CPB complications</li>
                    <li>• Neurologic risk</li>
                    <li>• Inflammatory response</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-steel-200">
                <h4 className="font-semibold text-steel-900 mb-4 text-center text-blue-600">Off-Pump CABG</h4>
                <div className="space-y-3">
                  <div className="text-green-600 font-medium">Advantages:</div>
                  <ul className="text-sm space-y-1 text-steel-700">
                    <li>• No CPB</li>
                    <li>• Reduced stroke risk</li>
                    <li>• Less inflammation</li>
                    <li>• Faster recovery</li>
                  </ul>
                  <div className="text-red-600 font-medium mt-3">Disadvantages:</div>
                  <ul className="text-sm space-y-1 text-steel-700">
                    <li>• Technical difficulty</li>
                    <li>• Incomplete revascularization</li>
                    <li>• Learning curve</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <GRACEScoreCalculator />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <header className="retina-card bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/10 to-purple-400/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf">
                Coronary Intervention Service Line Command Center
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced Analytics for CABG, PCI, and Coronary Revascularization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-medical-red-50 border-medical-red-200 border shadow-lg">
                <Heart className="w-8 h-8 text-medical-red-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-red-50 border-medical-red-200 text-medical-red-600 shadow-lg scale-105'
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-medical-red-600' : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-medical-red-600' : 'text-steel-600 group-hover:text-steel-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-medical-red-400/20 to-medical-red-500/20 rounded-xl opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CoronaryServiceLineView;