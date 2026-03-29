import React, { useState } from 'react';
import { Activity, Target, Grid3X3, Users, Calculator, MapPin, BarChart3, Heart, Shield, Network, Award, FileText, Search } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';

// Import Peripheral Vascular components
import PADReportingSystem from '../components/PADReportingSystem';
import PVWoundCareNetworkVisualization from '../components/PVWoundCareNetworkVisualization';
import WIfIClassification from '../components/WIfIClassification';
import LimbSalvageScreening from '../components/LimbSalvageScreening';
import PVClinicalGapDetectionDashboard from '../components/clinical/PVClinicalGapDetectionDashboard';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';

import { peripheralVascularServiceLineConfig } from '../config/serviceLineConfig';

// Peripheral Vascular Analytics Dashboard
const PeripheralVascularAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">PAD Interventions</h4>
        <div className="text-2xl font-bold text-titanium-900">1,456</div>
        <div className="text-sm text-[#2C4A60]">+11.2% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">Limb Salvage Cases</h4>
        <div className="text-2xl font-bold text-titanium-900">287</div>
        <div className="text-sm text-[#2C4A60]">+18.4% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">CLI Revascularizations</h4>
        <div className="text-2xl font-bold text-titanium-900">392</div>
        <div className="text-sm text-[#2C4A60]">+15.7% vs last quarter</div>
      </div>
      <div className="metal-card p-6">
        <h4 className="text-sm font-medium text-titanium-600 mb-2">Wound Healing Rate</h4>
        <div className="text-2xl font-bold text-titanium-900">78.3%</div>
        <div className="text-sm text-[#2C4A60]">+4.1% vs last quarter</div>
      </div>
    </div>
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-arterial-600" />
        Analytics Overview
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive peripheral arterial disease (PAD) analytics including endovascular interventions, surgical bypass, wound care coordination, and limb salvage outcomes.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">PAD Excellence</h4>
          <p className="text-sm text-titanium-600">Advanced endovascular interventions with optimal patency rates and limb preservation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Limb Salvage Program</h4>
          <p className="text-sm text-titanium-600">Comprehensive critical limb ischemia management with multidisciplinary care coordination</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Wound Care Network</h4>
          <p className="text-sm text-titanium-600">Integrated wound care specialists, podiatrists, and vascular surgeons collaboration</p>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const PeripheralVascularProviderScorecard: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-arterial-600" />
        Peripheral Vascular Provider Performance
      </h3>
      <p className="text-titanium-600 mb-6">Individual vascular surgeon and interventionalist performance metrics for PAD procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Vascular Surgeons</h4>
          <p className="text-sm text-titanium-600">Bypass patency rates, surgical outcomes, and limb salvage success metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Interventionalists</h4>
          <p className="text-sm text-titanium-600">Endovascular success rates, vessel patency, and technical success tracking</p>
        </div>
      </div>
    </div>
  </div>
);

// PAD Risk Calculators
const PADRiskCalculators: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-arterial-600" />
        PAD Risk Assessment Tools
      </h3>
      <p className="text-titanium-600 mb-6">Integrated risk calculators for peripheral arterial disease intervention planning.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">WIfI Classification</h4>
          <p className="text-sm text-titanium-600">Wound, Ischemia, and foot Infection classification system for limb threat assessment</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">ABI Calculator</h4>
          <p className="text-sm text-titanium-600">Ankle-brachial index assessment and interpretation for PAD diagnosis</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">GLASS Classification</h4>
          <p className="text-sm text-titanium-600">Global Limb Anatomic Staging System for comprehensive lesion assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Intervention Analytics
const PADInterventionAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-arterial-600" />
        PAD Intervention Analytics
      </h3>
      <p className="text-titanium-600 mb-6">Detailed analytics for peripheral arterial disease interventions and procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Endovascular Procedures</h4>
          <p className="text-sm text-titanium-600">Balloon angioplasty, stenting, atherectomy, and drug-coated device utilization</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Surgical Procedures</h4>
          <p className="text-sm text-titanium-600">Bypass grafting, endarterectomy, and hybrid procedure analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// CLI Management
const CLIManagement: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-arterial-600" />
        Critical Limb Ischemia Management
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive CLI patient management and limb salvage program analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Limb Salvage Outcomes</h4>
          <p className="text-sm text-titanium-600">Amputation-free survival, wound healing rates, and functional outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Revascularization Success</h4>
          <p className="text-sm text-titanium-600">Technical success, patency rates, and clinical improvement metrics</p>
        </div>
      </div>
    </div>
  </div>
);

// Safety Screening
const PADSafetyScreening: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-arterial-600" />
        PAD Intervention Safety Screening
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive safety assessments and contraindication screening for PAD interventions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Pre-procedural Assessment</h4>
          <p className="text-sm text-titanium-600">Renal function, contrast allergy screening, and bleeding risk evaluation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Complication Prevention</h4>
          <p className="text-sm text-titanium-600">Access site management, embolic protection, and post-procedure monitoring</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const PADQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="metal-card p-8">
      <h3 className="text-lg font-semibold text-titanium-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-arterial-600" />
        PAD Quality Metrics
      </h3>
      <p className="text-titanium-600 mb-6">Comprehensive quality indicators for peripheral vascular intervention programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Intervention Quality</h4>
          <p className="text-sm text-titanium-600">Technical success rates, patency outcomes, and appropriate use metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Limb Salvage Metrics</h4>
          <p className="text-sm text-titanium-600">Amputation rates, wound healing success, and functional preservation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-arterial-50 to-medical-arterial-100 p-6 rounded-lg">
          <h4 className="font-semibold text-titanium-900 mb-2">Registry Compliance</h4>
          <p className="text-sm text-titanium-600">VQI Registry, national database participation, and quality reporting</p>
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
  | 'reporting'
  | 'gap-detection';

interface TabGroup {
  label: string;
  tabs: Array<{ id: string; label: string; icon: React.ElementType; description: string }>;
}

const PeripheralServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PeripheralServiceLineTab>('analytics');

  const handleTabChange = (tab: PeripheralServiceLineTab) => {
    setActiveTab(tab);
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
  };

  const tabGroups: TabGroup[] = [
    {
      label: 'Clinical Analytics',
      tabs: [
        { id: 'analytics', label: 'PAD Analytics', icon: Target, description: 'Comprehensive peripheral arterial disease analytics dashboard' },
        { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'PAD patient risk visualization matrix' },
        { id: 'providers', label: 'Provider Performance', icon: Users, description: 'Vascular surgeon and interventionalist performance metrics' },
        { id: 'calculators', label: 'Clinical Calculators', icon: Calculator, description: 'WIfI, ABI, and GLASS classification tools' },
      ],
    },
    {
      label: 'Clinical Tools',
      tabs: [
        { id: 'wifi', label: 'WIfI Classification', icon: MapPin, description: 'Wound, Ischemia, foot Infection assessment tool' },
        { id: 'interventions', label: 'Intervention Analytics', icon: BarChart3, description: 'Endovascular and surgical PAD procedure metrics' },
        { id: 'cli-management', label: 'CLI Management', icon: Heart, description: 'Critical limb ischemia and limb salvage analytics' },
        { id: 'limb-salvage', label: 'Limb Salvage', icon: Activity, description: 'Limb salvage screening and outcome tracking' },
        { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Pre-procedural safety assessment and protocols' },
      ],
    },
    {
      label: 'Gap & Opportunity',
      tabs: [
        { id: 'gap-detection', label: 'Gap Detection (27-Gap)', icon: Search, description: 'PV clinical gap detection' },
      ],
    },
    {
      label: 'Care Coordination',
      tabs: [
        { id: 'network', label: 'Care Team Network', icon: Network, description: 'Vascular care team collaboration and referral patterns' },
        { id: 'wound-care-network', label: 'Wound Care Network', icon: Network, description: 'Wound care coordination and network analysis' },
      ],
    },
    {
      label: 'Outcomes & Reporting',
      tabs: [
        { id: 'quality', label: 'Quality Metrics', icon: Award, description: 'VQI Registry, quality indicators, and outcome measures' },
        { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Automated PAD reporting and registry submissions' },
      ],
    },
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
      case 'gap-detection': return <PVClinicalGapDetectionDashboard />;
      default: return <PeripheralVascularAnalytics />;
    }
  };

  return (
    <div className="min-h-screen p-6 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EAEFF4 0%, #F2F5F8 50%, #ECF0F4 100%)' }}>

      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Export Action */}
        <div className="flex justify-end">
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
        </div>

        {/* Tab Navigation — Grouped */}
        <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6 shadow-xl">
          {tabGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Section Divider */}
              {groupIdx > 0 && <div className="border-t border-titanium-100 my-4" />}
              <div className="mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-titanium-400">{group.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-2">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as PeripheralServiceLineTab)}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-medical-arterial-50 border-medical-arterial-200 text-medical-arterial-600 shadow-lg scale-105'
                          : 'bg-white border-titanium-200 text-titanium-600 hover:bg-white hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon className={`w-6 h-6 ${isActive ? 'text-medical-arterial-600' : 'text-titanium-600 group-hover:text-titanium-800'}`} />
                        <span className={`text-xs font-semibold text-center leading-tight ${isActive ? 'text-medical-arterial-600' : 'text-titanium-600 group-hover:text-titanium-800'}`}>
                          {tab.label}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-medical-arterial-400/20 to-medical-arterial-500/20 rounded-xl opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
