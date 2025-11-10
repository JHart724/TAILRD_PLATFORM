import React from 'react';
import { Zap, Users, Network, Brain, DollarSign, Target, Grid3X3, Activity, Shield, Award, BarChart3, FileText, Heart } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing EP Service Line components
import EPAutomatedClinicalSupport from '../components/EPAutomatedClinicalSupport';
import EPROICalculator from '../components/EPROICalculator';
import EPDeviceNetworkVisualization from '../components/EPDeviceNetworkVisualization';
import EPClinicalDecisionSupport from '../components/EPClinicalDecisionSupport';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';
import LAACRiskDashboard from '../components/LAACRiskDashboard';
import PatientDetailPanel from '../components/PatientDetailPanel';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

// Electrophysiology Analytics Dashboard
const ElectrophysiologyAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">AFib Ablations</h4>
        <div className="text-2xl font-bold text-steel-900">1,234</div>
        <div className="text-sm text-green-600">+14.7% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">LAAC Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">456</div>
        <div className="text-sm text-green-600">+28.3% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Device Implants</h4>
        <div className="text-2xl font-bold text-steel-900">789</div>
        <div className="text-sm text-green-600">+9.2% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Lead Extractions</h4>
        <div className="text-2xl font-bold text-steel-900">123</div>
        <div className="text-sm text-green-600">+6.5% vs last quarter</div>
      </div>
    </div>
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-green-600" />
        Electrophysiology Service Line Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive electrophysiology analytics including AFib ablations, LAAC procedures, device implantations, arrhythmia management, and anticoagulation optimization.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">AFib Excellence</h4>
          <p className="text-sm text-steel-600">Advanced atrial fibrillation management with optimal ablation outcomes and stroke prevention</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Innovation</h4>
          <p className="text-sm text-steel-600">Comprehensive device management including implants, extractions, and remote monitoring</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">LAAC Program</h4>
          <p className="text-sm text-steel-600">Left atrial appendage closure program with comprehensive stroke prevention analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// EP Procedure Analytics
const EPProcedureAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-green-600" />
        EP Procedure Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive electrophysiology procedure performance analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Ablation Procedures</h4>
          <p className="text-sm text-steel-600">AFib, AFL, VT, and SVT ablation success rates, recurrence tracking, and complications</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Procedures</h4>
          <p className="text-sm text-steel-600">Pacemaker, ICD, CRT implants, upgrades, and lead extraction analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// EP Provider Performance
const EPProviderPerformance: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-green-600" />
        EP Provider Performance
      </h3>
      <p className="text-steel-600 mb-6">Individual electrophysiologist performance metrics and outcomes tracking.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Ablation Specialists</h4>
          <p className="text-sm text-steel-600">AFib ablation success rates, procedure times, and complication tracking</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Specialists</h4>
          <p className="text-sm text-steel-600">Device implant success, extraction outcomes, and programming optimization</p>
        </div>
      </div>
    </div>
  </div>
);

// Arrhythmia Management
const ArrhythmiaManagement: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-medical-green-600" />
        Arrhythmia Management Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive arrhythmia management and treatment optimization analytics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">AFib Management</h4>
          <p className="text-sm text-steel-600">Rate vs rhythm control strategies, anticoagulation management, and outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">VT/VF Management</h4>
          <p className="text-sm text-steel-600">Ventricular arrhythmia management, ICD therapy optimization, and ablation outcomes</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const EPQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-green-600" />
        EP Quality Metrics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive quality indicators for electrophysiology programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Ablation Quality</h4>
          <p className="text-sm text-steel-600">Success rates, freedom from arrhythmia, and procedural complications</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Quality</h4>
          <p className="text-sm text-steel-600">Implant success rates, lead performance, and device longevity metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-green-50 to-medical-green-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Stroke Prevention</h4>
          <p className="text-sm text-steel-600">Anticoagulation adherence, LAAC outcomes, and stroke risk reduction</p>
        </div>
      </div>
    </div>
  </div>
);

// Electrophysiology Service Line Tab Configuration
const electrophysiologyTabs: ServiceLineTabConfig[] = [
  {
    id: 'analytics',
    label: 'EP Analytics',
    icon: Target,
    description: 'Comprehensive electrophysiology analytics dashboard'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'EP patient risk visualization matrix'
  },
  {
    id: 'procedures',
    label: 'Procedure Analytics',
    icon: BarChart3,
    description: 'AFib ablation, LAAC, and device procedure metrics'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Users,
    description: 'Electrophysiologist performance metrics and outcomes'
  },
  {
    id: 'arrhythmia',
    label: 'Arrhythmia Management',
    icon: Activity,
    description: 'Comprehensive arrhythmia treatment optimization'
  },
  {
    id: 'laac-risk',
    label: 'LAAC Risk Dashboard',
    icon: Heart,
    description: 'Left atrial appendage closure risk assessment'
  },
  {
    id: 'patient-details',
    label: 'Patient Detail Panel',
    icon: Users,
    description: 'Individual patient EP assessment and tracking'
  },
  {
    id: 'safety',
    label: 'Safety Screening',
    icon: Shield,
    description: 'Anticoagulation safety and contraindication screening'
  },
  {
    id: 'device-network',
    label: 'Device Network',
    icon: Network,
    description: 'EP device utilization and network analysis'
  },
  {
    id: 'network',
    label: 'Care Team Network',
    icon: Network,
    description: 'EP care team collaboration and referral patterns'
  },
  {
    id: 'clinical-support',
    label: 'Clinical Decision Support',
    icon: Brain,
    description: 'AI-powered EP clinical decision support tools'
  },
  {
    id: 'automated-support',
    label: 'Automated Support',
    icon: Zap,
    description: 'Automated EP clinical support and recommendations'
  },
  {
    id: 'quality',
    label: 'Quality Metrics',
    icon: Award,
    description: 'EP quality indicators and outcome measures'
  },
  {
    id: 'roi-calculator',
    label: 'ROI Calculator',
    icon: DollarSign,
    description: 'EP program financial impact and ROI calculator'
  },
  {
    id: 'reporting',
    label: 'Automated Reports',
    icon: FileText,
    description: 'Scheduled reporting and data exports'
  }
];

// Export data configurations
const electrophysiologyExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'AFib Ablations',
      'Device Implants',
      'Success Rate',
      'Complication Rate',
      'Quality Score'
    ],
    rows: [
      ['Dr. Michael Rodriguez', 'Electrophysiologist', '187', '234', '94.7%', '2.1%', '96.2'],
      ['Dr. Sarah Chen', 'Electrophysiologist', '203', '189', '96.1%', '1.8%', '97.4'],
      ['Dr. James Wilson', 'Electrophysiologist', '156', '267', '93.2%', '2.4%', '94.8'],
      ['Dr. Lisa Thompson', 'Electrophysiologist', '234', '156', '95.3%', '1.9%', '96.7'],
      ['Dr. David Park', 'Electrophysiologist', '178', '198', '94.1%', '2.2%', '95.1'],
      ['Dr. Amanda Martinez', 'Electrophysiologist', '145', '223', '92.8%', '2.6%', '94.3']
    ],
    filename: 'electrophysiology_provider_performance',
    title: 'Electrophysiology Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Electrophysiology',
      'Period': 'Q4 2024',
      'Total Procedures': '2,370',
      'Avg Success Rate': '94.4%',
      'Avg Quality Score': '95.8'
    }
  },
  procedures: {
    headers: [
      'Procedure Type',
      'Volume',
      'Success Rate',
      'Recurrence Rate',
      'Complication Rate',
      'Cost per Case'
    ],
    rows: [
      ['AFib Ablation', '1,103', '89.7%', '15.2%', '2.1%', '$38,456'],
      ['AFL Ablation', '234', '94.9%', '8.3%', '1.4%', '$28,234'],
      ['VT Ablation', '156', '87.2%', '18.9%', '3.2%', '$45,891'],
      ['SVT Ablation', '189', '96.8%', '5.1%', '0.8%', '$22,567'],
      ['LAAC', '456', '96.1%', 'N/A', '2.8%', '$32,178'],
      ['Device Implant', '1,267', '98.4%', 'N/A', '1.6%', '$18,923']
    ],
    filename: 'electrophysiology_procedure_analytics',
    title: 'Electrophysiology Procedure Analytics Report',
    metadata: {
      'Report Type': 'Procedure Analytics',
      'Service Line': 'Electrophysiology',
      'Total Procedures': '3,405',
      'Overall Success Rate': '93.7%',
      'Overall Complication Rate': '2.0%'
    }
  }
};

// Electrophysiology Service Line Configuration
export const electrophysiologyServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Electrophysiology',
  moduleDescription: 'Advanced EP analytics for procedures, devices, and clinical outcomes',
  moduleIcon: Zap,
  primaryColor: 'medical-green',
  tabs: electrophysiologyTabs,
  tabContent: {
    'analytics': ElectrophysiologyAnalytics,
    'heatmap': PatientRiskHeatmap,
    'procedures': EPProcedureAnalytics,
    'providers': EPProviderPerformance,
    'arrhythmia': ArrhythmiaManagement,
    'laac-risk': LAACRiskDashboard,
    'patient-details': PatientDetailPanel,
    'safety': AnticoagulationSafetyChecker,
    'device-network': EPDeviceNetworkVisualization,
    'network': CareTeamNetworkGraph,
    'clinical-support': EPClinicalDecisionSupport,
    'automated-support': EPAutomatedClinicalSupport,
    'quality': EPQualityMetrics,
    'roi-calculator': EPROICalculator,
    'reporting': AutomatedReportingSystem
  },
  exportData: electrophysiologyExportData,
  hasExport: true
};