import React, { useState } from 'react';
import { Activity, Target, Grid3X3, Users, Calculator, MapPin, BarChart3, Heart, Shield, Network, Award, FileText } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';

// Import Peripheral Vascular components
import PADReportingSystem from '../components/PADReportingSystem';
import PVWoundCareNetworkVisualization from '../components/PVWoundCareNetworkVisualization';
import WIfIClassification from '../components/WIfIClassification';
import LimbSalvageScreening from '../components/LimbSalvageScreening';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';

import { peripheralVascularServiceLineConfig } from '../config/serviceLineConfig';

// Peripheral Vascular Analytics Dashboard
const PeripheralVascularAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">PAD Interventions</h4>
        <div className="text-2xl font-bold text-steel-900">1,456</div>
        <div className="text-sm text-green-600">+11.2% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Limb Salvage Cases</h4>
        <div className="text-2xl font-bold text-steel-900">287</div>
        <div className="text-sm text-green-600">+18.4% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">CLI Revascularizations</h4>
        <div className="text-2xl font-bold text-steel-900">392</div>
        <div className="text-sm text-green-600">+15.7% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Wound Healing Rate</h4>
        <div className="text-2xl font-bold text-steel-900">78.3%</div>
        <div className="text-sm text-green-600">+4.1% vs last quarter</div>
      </div>
    </div>
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-purple-600" />
        Peripheral Vascular Service Line Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive peripheral arterial disease (PAD) analytics including endovascular interventions, surgical bypass, wound care coordination, and limb salvage outcomes.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">PAD Excellence</h4>
          <p className="text-sm text-steel-600">Advanced endovascular interventions with optimal patency rates and limb preservation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Limb Salvage Program</h4>
          <p className="text-sm text-steel-600">Comprehensive critical limb ischemia management with multidisciplinary care coordination</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Wound Care Network</h4>
          <p className="text-sm text-steel-600">Integrated wound care specialists, podiatrists, and vascular surgeons collaboration</p>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const PeripheralVascularProviderScorecard: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-purple-600" />
        Peripheral Vascular Provider Performance
      </h3>
      <p className="text-steel-600 mb-6">Individual vascular surgeon and interventionalist performance metrics for PAD procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Vascular Surgeons</h4>
          <p className="text-sm text-steel-600">Bypass patency rates, surgical outcomes, and limb salvage success metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Interventionalists</h4>
          <p className="text-sm text-steel-600">Endovascular success rates, vessel patency, and technical success tracking</p>
        </div>
      </div>
    </div>
  </div>
);

// PAD Risk Calculators
const PADRiskCalculators: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-purple-600" />
        PAD Risk Assessment Tools
      </h3>
      <p className="text-steel-600 mb-6">Integrated risk calculators for peripheral arterial disease intervention planning.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">WIfI Classification</h4>
          <p className="text-sm text-steel-600">Wound, Ischemia, and foot Infection classification system for limb threat assessment</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">ABI Calculator</h4>
          <p className="text-sm text-steel-600">Ankle-brachial index assessment and interpretation for PAD diagnosis</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">GLASS Classification</h4>
          <p className="text-sm text-steel-600">Global Limb Anatomic Staging System for comprehensive lesion assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Intervention Analytics
const PADInterventionAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-purple-600" />
        PAD Intervention Analytics
      </h3>
      <p className="text-steel-600 mb-6">Detailed analytics for peripheral arterial disease interventions and procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Endovascular Procedures</h4>
          <p className="text-sm text-steel-600">Balloon angioplasty, stenting, atherectomy, and drug-coated device utilization</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Surgical Procedures</h4>
          <p className="text-sm text-steel-600">Bypass grafting, endarterectomy, and hybrid procedure analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// CLI Management
const CLIManagement: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-purple-600" />
        Critical Limb Ischemia Management
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive CLI patient management and limb salvage program analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Limb Salvage Outcomes</h4>
          <p className="text-sm text-steel-600">Amputation-free survival, wound healing rates, and functional outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Revascularization Success</h4>
          <p className="text-sm text-steel-600">Technical success, patency rates, and clinical improvement metrics</p>
        </div>
      </div>
    </div>
  </div>
);

// Safety Screening
const PADSafetyScreening: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-purple-600" />
        PAD Intervention Safety Screening
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive safety assessments and contraindication screening for PAD interventions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Pre-procedural Assessment</h4>
          <p className="text-sm text-steel-600">Renal function, contrast allergy screening, and bleeding risk evaluation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Complication Prevention</h4>
          <p className="text-sm text-steel-600">Access site management, embolic protection, and post-procedure monitoring</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const PADQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-purple-600" />
        PAD Quality Metrics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive quality indicators for peripheral vascular intervention programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Intervention Quality</h4>
          <p className="text-sm text-steel-600">Technical success rates, patency outcomes, and appropriate use metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Limb Salvage Metrics</h4>
          <p className="text-sm text-steel-600">Amputation rates, wound healing success, and functional preservation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-purple-50 to-medical-purple-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Registry Compliance</h4>
          <p className="text-sm text-steel-600">VQI Registry, national database participation, and quality reporting</p>
        </div>
      </div>
    </div>
  </div>
);

type PeripheralServiceLineTab = 
  | 'analytics'
  | 'heatmap'
  | 'providers'
  | 'calculators'
  | 'wifi'
  | 'interventions'
  | 'cli-management'
  | 'limb-salvage'
  | 'safety'
  | 'network'
  | 'wound-care-network'
  | 'quality'
  | 'reporting';

const PeripheralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PeripheralServiceLineTab>('analytics');

  const tabs = [
    { id: 'analytics', label: 'PAD Analytics', icon: Target, description: 'Comprehensive peripheral arterial disease analytics dashboard' },
    { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'PAD patient risk visualization matrix' },
    { id: 'providers', label: 'Provider Performance', icon: Users, description: 'Vascular surgeon and interventionalist performance metrics' },
    { id: 'calculators', label: 'Risk Calculators', icon: Calculator, description: 'WIfI, ABI, and GLASS classification tools' },
    { id: 'wifi', label: 'WIfI Classification', icon: MapPin, description: 'Wound, Ischemia, foot Infection assessment tool' },
    { id: 'interventions', label: 'Intervention Analytics', icon: BarChart3, description: 'Endovascular and surgical PAD procedure metrics' },
    { id: 'cli-management', label: 'CLI Management', icon: Heart, description: 'Critical limb ischemia and limb salvage analytics' },
    { id: 'limb-salvage', label: 'Limb Salvage', icon: Activity, description: 'Limb salvage screening and outcome tracking' },
    { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Pre-procedural safety assessment and protocols' },
    { id: 'network', label: 'Care Team Network', icon: Network, description: 'Vascular care team collaboration and referral patterns' },
    { id: 'wound-care-network', label: 'Wound Care Network', icon: Network, description: 'Wound care coordination and network analysis' },
    { id: 'quality', label: 'Quality Metrics', icon: Award, description: 'VQI Registry, quality indicators, and outcome measures' },
    { id: 'reporting', label: 'PAD Reporting', icon: FileText, description: 'Automated PAD reporting and registry submissions' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics': return <PeripheralVascularAnalytics />;
      case 'heatmap': return <PatientRiskHeatmap />;
      case 'providers': return <PeripheralVascularProviderScorecard />;
      case 'calculators': return <PADRiskCalculators />;
      case 'wifi': return <WIfIClassification />;
      case 'interventions': return <PADInterventionAnalytics />;
      case 'cli-management': return <CLIManagement />;
      case 'limb-salvage': return <LimbSalvageScreening />;
      case 'safety': return <PADSafetyScreening />;
      case 'network': return <CareTeamNetworkGraph />;
      case 'wound-care-network': return <PVWoundCareNetworkVisualization />;
      case 'quality': return <PADQualityMetrics />;
      case 'reporting': return <PADReportingSystem />;
      default: return <PeripheralVascularAnalytics />;
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf">
                Peripheral Vascular Service Line Analytics
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced PAD analytics for interventions, wound care coordination, and limb salvage
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ExportButton 
                data={peripheralVascularServiceLineConfig.exportData?.providers || { 
                  filename: 'peripheral-vascular-export',
                  title: 'Peripheral Vascular Service Line Report',
                  headers: ['Metric', 'Value'],
                  rows: [['PAD Interventions', '1,456'], ['Limb Salvage Cases', '287']]
                }}
                variant="outline"
                size="sm"
                className="shadow-lg hover:shadow-xl transition-all duration-300"
              />
              <div className="p-4 rounded-2xl bg-medical-purple-50 border border-medical-purple-200 shadow-lg">
                <Activity className="w-8 h-8 text-medical-purple-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Grid layout for 13 tabs */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-13 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as PeripheralServiceLineTab)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-purple-50 border-medical-purple-200 text-medical-purple-600 shadow-lg scale-105'
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-medical-purple-600' : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-medical-purple-600' : 'text-steel-600 group-hover:text-steel-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-medical-purple-400/20 to-medical-purple-500/20 rounded-xl opacity-50" />
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

export default PeripheralServiceLineView;