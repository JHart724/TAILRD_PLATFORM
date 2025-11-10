import React from 'react';
import { Activity, FileText, Network, Target, Users, Calculator, Shield, BarChart3, Award, Grid3X3, MapPin, Heart } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing Peripheral Vascular Service Line components
import PADReportingSystem from '../components/PADReportingSystem';
import PVWoundCareNetworkVisualization from '../components/PVWoundCareNetworkVisualization';
import WIfIClassification from '../components/WIfIClassification';
import LimbSalvageScreening from '../components/LimbSalvageScreening';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

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

// Peripheral Vascular Service Line Tab Configuration
const peripheralVascularTabs: ServiceLineTabConfig[] = [
  {
    id: 'analytics',
    label: 'PAD Analytics',
    icon: Target,
    description: 'Comprehensive peripheral arterial disease analytics dashboard'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'PAD patient risk visualization matrix'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Users,
    description: 'Vascular surgeon and interventionalist performance metrics'
  },
  {
    id: 'calculators',
    label: 'Risk Calculators',
    icon: Calculator,
    description: 'WIfI, ABI, and GLASS classification tools'
  },
  {
    id: 'wifi',
    label: 'WIfI Classification',
    icon: MapPin,
    description: 'Wound, Ischemia, foot Infection assessment tool'
  },
  {
    id: 'interventions',
    label: 'Intervention Analytics',
    icon: BarChart3,
    description: 'Endovascular and surgical PAD procedure metrics'
  },
  {
    id: 'cli-management',
    label: 'CLI Management',
    icon: Heart,
    description: 'Critical limb ischemia and limb salvage analytics'
  },
  {
    id: 'limb-salvage',
    label: 'Limb Salvage',
    icon: Activity,
    description: 'Limb salvage screening and outcome tracking'
  },
  {
    id: 'safety',
    label: 'Safety Screening',
    icon: Shield,
    description: 'Pre-procedural safety assessment and protocols'
  },
  {
    id: 'network',
    label: 'Care Team Network',
    icon: Network,
    description: 'Vascular care team collaboration and referral patterns'
  },
  {
    id: 'wound-care-network',
    label: 'Wound Care Network',
    icon: Network,
    description: 'Wound care coordination and network analysis'
  },
  {
    id: 'quality',
    label: 'Quality Metrics',
    icon: Award,
    description: 'VQI Registry, quality indicators, and outcome measures'
  },
  {
    id: 'reporting',
    label: 'PAD Reporting',
    icon: FileText,
    description: 'Automated PAD reporting and registry submissions'
  }
];

// Export data configurations
const peripheralVascularExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'PAD Volume',
      'Success Rate',
      'Patency Rate',
      'Limb Salvage Rate',
      'Quality Score'
    ],
    rows: [
      ['Dr. Maria Rodriguez', 'Vascular Surgeon', '187', '96.8%', '89.2%', '85.4%', '94.7'],
      ['Dr. James Chen', 'Interventional Radiologist', '234', '97.4%', '91.3%', '82.1%', '95.8'],
      ['Dr. Sarah Wilson', 'Vascular Surgeon', '156', '95.9%', '87.6%', '88.9%', '93.4'],
      ['Dr. Michael Park', 'Interventional Cardiologist', '198', '96.1%', '90.7%', '79.3%', '94.2'],
      ['Dr. Lisa Thompson', 'Vascular Surgeon', '142', '97.2%', '88.4%', '91.2%', '95.1'],
      ['Dr. David Martinez', 'Interventional Radiologist', '167', '95.7%', '89.8%', '83.6%', '93.8']
    ],
    filename: 'peripheral_vascular_provider_performance',
    title: 'Peripheral Vascular Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Peripheral Vascular',
      'Period': 'Q4 2024',
      'Total Procedures': '1,084',
      'Avg Success Rate': '96.5%',
      'Avg Limb Salvage Rate': '85.1%'
    }
  },
  interventions: {
    headers: [
      'Intervention Type',
      'Volume',
      'Technical Success',
      'Patency at 12 months',
      'Complication Rate',
      'Cost per Case'
    ],
    rows: [
      ['Balloon Angioplasty', '456', '97.8%', '76.4%', '2.1%', '$8,234'],
      ['Stent Placement', '387', '98.2%', '84.7%', '3.2%', '$12,567'],
      ['Atherectomy', '189', '96.3%', '81.2%', '4.1%', '$15,891'],
      ['Drug-Coated Balloon', '234', '97.1%', '88.9%', '2.8%', '$11,234'],
      ['Bypass Surgery', '156', '95.5%', '91.3%', '6.7%', '$28,456'],
      ['Hybrid Procedures', '87', '94.2%', '89.1%', '5.4%', '$22,178']
    ],
    filename: 'peripheral_vascular_intervention_analytics',
    title: 'Peripheral Vascular Intervention Analytics Report',
    metadata: {
      'Report Type': 'Intervention Analytics',
      'Service Line': 'Peripheral Vascular',
      'Total Interventions': '1,509',
      'Overall Technical Success': '96.8%',
      'Avg 12-month Patency': '85.3%'
    }
  }
};

// Peripheral Vascular Service Line Configuration
export const peripheralVascularServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Peripheral Vascular',
  moduleDescription: 'Advanced PAD analytics for interventions, wound care coordination, and limb salvage',
  moduleIcon: Activity,
  primaryColor: 'medical-purple',
  tabs: peripheralVascularTabs,
  tabContent: {
    'analytics': PeripheralVascularAnalytics,
    'heatmap': PatientRiskHeatmap,
    'providers': PeripheralVascularProviderScorecard,
    'calculators': PADRiskCalculators,
    'wifi': WIfIClassification,
    'interventions': PADInterventionAnalytics,
    'cli-management': CLIManagement,
    'limb-salvage': LimbSalvageScreening,
    'safety': PADSafetyScreening,
    'network': CareTeamNetworkGraph,
    'wound-care-network': PVWoundCareNetworkVisualization,
    'quality': PADQualityMetrics,
    'reporting': PADReportingSystem
  },
  exportData: peripheralVascularExportData,
  hasExport: true
};