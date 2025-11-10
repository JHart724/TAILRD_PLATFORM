import React from 'react';
import { Activity, Network, Target, Users, Calculator, Shield, BarChart3, Award, Grid3X3, FileText, Heart, Zap } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing Coronary Service Line components
import PCINetworkVisualization from '../components/PCINetworkVisualization';
import GRACEScoreCalculator from '../components/GRACEScoreCalculator';
import TIMIScoreCalculator from '../components/TIMIScoreCalculator';
import SYNTAXScoreCalculator from '../components/SYNTAXScoreCalculator';
import CoronarySafetyScreening from '../components/CoronarySafetyScreening';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

// Coronary Intervention Analytics Dashboard
const CoronaryInterventionAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">PCI Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">2,847</div>
        <div className="text-sm text-green-600">+8.4% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">CABG Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">456</div>
        <div className="text-sm text-green-600">+3.2% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Primary PCI (STEMI)</h4>
        <div className="text-2xl font-bold text-steel-900">387</div>
        <div className="text-sm text-green-600">+12.1% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Complex PCI</h4>
        <div className="text-2xl font-bold text-steel-900">892</div>
        <div className="text-sm text-green-600">+15.7% vs last quarter</div>
      </div>
    </div>
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-blue-600" />
        Coronary Intervention Service Line Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive analytics for PCI and CABG procedures including lesion complexity assessment, device utilization, SYNTAX scoring, and operator performance metrics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">PCI Excellence</h4>
          <p className="text-sm text-steel-600">Advanced percutaneous coronary intervention with complex lesion management and optimal outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">CABG Optimization</h4>
          <p className="text-sm text-steel-600">Surgical revascularization analytics with graft patency tracking and long-term outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">STEMI Pathways</h4>
          <p className="text-sm text-steel-600">Primary PCI door-to-balloon optimization and emergency cardiac care coordination</p>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const CoronaryProviderScorecard: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-blue-600" />
        Coronary Intervention Provider Performance
      </h3>
      <p className="text-steel-600 mb-6">Individual interventional cardiologist and cardiac surgeon performance metrics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Interventional Cardiologists</h4>
          <p className="text-sm text-steel-600">PCI case volumes, success rates, complication tracking, and lesion complexity metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Cardiac Surgeons</h4>
          <p className="text-sm text-steel-600">CABG outcomes, graft utilization, operative mortality, and surgical complexity assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Combined Risk Calculators
const CoronaryRiskCalculators: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-blue-600" />
        Coronary Risk Assessment Tools
      </h3>
      <p className="text-steel-600 mb-6">Integrated risk calculators for coronary intervention planning and decision-making.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">GRACE Score</h4>
          <p className="text-sm text-steel-600">Global Registry of Acute Coronary Events risk stratification calculator</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TIMI Score</h4>
          <p className="text-sm text-steel-600">Thrombolysis in Myocardial Infarction risk assessment tool</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">SYNTAX Score</h4>
          <p className="text-sm text-steel-600">Lesion complexity assessment for PCI vs CABG decision-making</p>
        </div>
      </div>
    </div>
  </div>
);

// PCI Procedure Analytics
const PCIProcedureAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-blue-600" />
        PCI Procedure Analytics
      </h3>
      <p className="text-steel-600 mb-6">Detailed analytics for percutaneous coronary intervention procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Utilization</h4>
          <p className="text-sm text-steel-600">Stent types, balloon usage, atherectomy devices, and guidewire analytics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Lesion Complexity</h4>
          <p className="text-sm text-steel-600">Complex lesion tracking, chronic total occlusions, and bifurcation interventions</p>
        </div>
      </div>
    </div>
  </div>
);

// CABG Analytics
const CABGAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-medical-blue-600" />
        CABG Surgical Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive coronary artery bypass graft surgery analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Graft Performance</h4>
          <p className="text-sm text-steel-600">Arterial vs venous graft utilization, patency rates, and long-term outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Surgical Complexity</h4>
          <p className="text-sm text-steel-600">Multi-vessel disease, redo operations, and high-risk patient management</p>
        </div>
      </div>
    </div>
  </div>
);

// STEMI Pathways
const STEMIPathways: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-medical-blue-600" />
        STEMI Care Pathways
      </h3>
      <p className="text-steel-600 mb-6">ST-elevation myocardial infarction emergency care optimization and door-to-balloon analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Primary PCI Metrics</h4>
          <p className="text-sm text-steel-600">Door-to-balloon times, first medical contact metrics, and emergency activation protocols</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Regional Transfer Network</h4>
          <p className="text-sm text-steel-600">Spoke hospital coordination, transfer times, and regional STEMI network optimization</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const CoronaryQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-blue-600" />
        Coronary Intervention Quality Metrics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive quality indicators for coronary intervention programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">PCI Quality Measures</h4>
          <p className="text-sm text-steel-600">Appropriate use criteria, success rates, and procedural complications</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">CABG Quality Indicators</h4>
          <p className="text-sm text-steel-600">STS risk-adjusted mortality, readmission rates, and surgical site infections</p>
        </div>
        <div className="bg-gradient-to-br from-medical-blue-50 to-medical-blue-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Registry Compliance</h4>
          <p className="text-sm text-steel-600">CathPCI Registry, STS database, and ACC-NCDR participation metrics</p>
        </div>
      </div>
    </div>
  </div>
);

// Coronary Intervention Service Line Tab Configuration
const coronaryTabs: ServiceLineTabConfig[] = [
  {
    id: 'analytics',
    label: 'Coronary Analytics',
    icon: Target,
    description: 'Comprehensive PCI and CABG analytics dashboard'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'Coronary disease risk visualization matrix'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Users,
    description: 'Interventionalist and surgeon performance metrics'
  },
  {
    id: 'calculators',
    label: 'Risk Calculators',
    icon: Calculator,
    description: 'GRACE, TIMI, and SYNTAX score calculators'
  },
  {
    id: 'pci-analytics',
    label: 'PCI Analytics',
    icon: BarChart3,
    description: 'Percutaneous coronary intervention procedure metrics'
  },
  {
    id: 'cabg-analytics',
    label: 'CABG Analytics',
    icon: Heart,
    description: 'Coronary artery bypass graft surgery analytics'
  },
  {
    id: 'stemi-pathways',
    label: 'STEMI Pathways',
    icon: Zap,
    description: 'Primary PCI and emergency cardiac care optimization'
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
    description: 'Coronary care team collaboration and referral patterns'
  },
  {
    id: 'pci-network',
    label: 'PCI Network',
    icon: Activity,
    description: 'PCI network analysis and patient flow visualization'
  },
  {
    id: 'quality',
    label: 'Quality Metrics',
    icon: Award,
    description: 'CathPCI Registry, STS database, and quality indicators'
  },
  {
    id: 'reporting',
    label: 'Automated Reports',
    icon: FileText,
    description: 'Scheduled reporting and registry submissions'
  }
];

// Export data configurations
const coronaryExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'PCI Volume',
      'CABG Volume',
      'Success Rate',
      'Complication Rate',
      'Quality Score'
    ],
    rows: [
      ['Dr. Michael Chen', 'Interventional Cardiologist', '287', '0', '98.2%', '2.1%', '96.8'],
      ['Dr. Sarah Rodriguez', 'Cardiac Surgeon', '0', '156', '97.4%', '3.2%', '95.1'],
      ['Dr. James Wilson', 'Interventional Cardiologist', '312', '0', '97.8%', '1.9%', '97.2'],
      ['Dr. Lisa Thompson', 'Cardiac Surgeon', '0', '189', '96.8%', '2.8%', '94.7'],
      ['Dr. David Park', 'Interventional Cardiologist', '298', '0', '98.1%', '2.3%', '96.4'],
      ['Dr. Amanda Martinez', 'Cardiac Surgeon', '0', '134', '97.0%', '3.1%', '95.3']
    ],
    filename: 'coronary_intervention_provider_performance',
    title: 'Coronary Intervention Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Coronary Intervention',
      'Period': 'Q4 2024',
      'Total Procedures': '1,376',
      'Avg Success Rate': '97.5%',
      'Avg Quality Score': '95.9'
    }
  },
  procedures: {
    headers: [
      'Procedure Type',
      'Volume',
      'Success Rate',
      'Complication Rate',
      'Door-to-Balloon (STEMI)',
      'Cost per Case'
    ],
    rows: [
      ['Primary PCI (STEMI)', '387', '98.7%', '2.1%', '67 min', '$18,234'],
      ['Elective PCI', '1,892', '98.9%', '1.4%', 'N/A', '$15,678'],
      ['Complex PCI', '568', '96.8%', '4.2%', 'N/A', '$23,451'],
      ['CABG (Isolated)', '234', '97.9%', '3.8%', 'N/A', '$42,187'],
      ['CABG + Valve', '67', '95.5%', '6.1%', 'N/A', '$58,923'],
      ['Redo CABG', '23', '93.5%', '8.7%', 'N/A', '$67,234']
    ],
    filename: 'coronary_intervention_procedure_analytics',
    title: 'Coronary Intervention Procedure Analytics Report',
    metadata: {
      'Report Type': 'Procedure Analytics',
      'Service Line': 'Coronary Intervention',
      'Total Procedures': '3,171',
      'Overall Success Rate': '97.8%',
      'Avg Door-to-Balloon': '67 minutes'
    }
  }
};

// Coronary Intervention Service Line Configuration
export const coronaryServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Coronary Intervention',
  moduleDescription: 'Advanced PCI and CABG analytics for procedure optimization and quality improvement',
  moduleIcon: Activity,
  primaryColor: 'medical-blue',
  tabs: coronaryTabs,
  tabContent: {
    'analytics': CoronaryInterventionAnalytics,
    'heatmap': PatientRiskHeatmap,
    'providers': CoronaryProviderScorecard,
    'calculators': CoronaryRiskCalculators,
    'pci-analytics': PCIProcedureAnalytics,
    'cabg-analytics': CABGAnalytics,
    'stemi-pathways': STEMIPathways,
    'safety': CoronarySafetyScreening,
    'network': CareTeamNetworkGraph,
    'pci-network': PCINetworkVisualization,
    'quality': CoronaryQualityMetrics,
    'reporting': AutomatedReportingSystem
  },
  exportData: coronaryExportData,
  hasExport: true
};