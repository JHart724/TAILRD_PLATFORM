import React from 'react';
import { Heart, Target, Grid3X3, Users, Stethoscope, Activity, Calculator, Shield, Network, FileText, BarChart3, Award } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing Valvular Disease components
import ValvePatientHeatmap from '../components/ValvePatientHeatmap';
import ValvularSurgicalNetworkVisualization from '../components/ValvularSurgicalNetworkVisualization';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

// Valvular Disease Analytics Dashboard
const ValvularDiseaseAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Aortic Valve Interventions</h4>
        <div className="text-2xl font-bold text-steel-900">1,247</div>
        <div className="text-sm text-green-600">+12.3% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Mitral Valve Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">892</div>
        <div className="text-sm text-green-600">+8.7% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Tricuspid Interventions</h4>
        <div className="text-2xl font-bold text-steel-900">234</div>
        <div className="text-sm text-green-600">+23.1% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">Valve-in-Valve Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">156</div>
        <div className="text-sm text-green-600">+18.4% vs last quarter</div>
      </div>
    </div>
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-amber-600" />
        Valvular Disease Service Line Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive analytics for aortic, mitral, tricuspid, and pulmonary valve interventions including TAVR, MitraClip, surgical valve replacement, and valve-in-valve procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Aortic Valve Excellence</h4>
          <p className="text-sm text-steel-600">TAVR program optimization with risk-stratified patient selection and outcomes tracking</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Valve Innovation</h4>
          <p className="text-sm text-steel-600">MitraClip, surgical repair, and TMVR program analytics with functional assessment</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Heart Team Coordination</h4>
          <p className="text-sm text-steel-600">Multidisciplinary heart team workflows and surgical vs transcatheter decision support</p>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const ValvularProviderScorecard: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-medical-amber-600" />
        Valvular Disease Provider Performance
      </h3>
      <p className="text-steel-600 mb-6">Individual surgeon and interventionalist performance metrics for valve procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Operators</h4>
          <p className="text-sm text-steel-600">Case volumes, success rates, and complication tracking for transcatheter aortic valve replacement</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Cardiac Surgeons</h4>
          <p className="text-sm text-steel-600">Surgical valve replacement outcomes, repair rates, and operative mortality metrics</p>
        </div>
      </div>
    </div>
  </div>
);

// Valve Decision Support
const ValveDecisionSupport: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-medical-amber-600" />
        Valve Intervention Decision Support
      </h3>
      <p className="text-steel-600 mb-6">Clinical decision support tools for optimal valve intervention selection.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR vs SAVR Selection</h4>
          <p className="text-sm text-steel-600">Risk calculator integration and heart team decision pathways for aortic valve interventions</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Intervention Pathways</h4>
          <p className="text-sm text-steel-600">MitraClip eligibility, surgical repair feasibility, and TMVR candidate assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Risk Calculators
const ValvularRiskCalculators: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-amber-600" />
        Valvular Disease Risk Calculators
      </h3>
      <p className="text-steel-600 mb-6">Integrated risk assessment tools for valve intervention planning.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">STS Risk Calculator</h4>
          <p className="text-sm text-steel-600">Society of Thoracic Surgeons operative risk assessment for valve surgery</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">EuroSCORE II</h4>
          <p className="text-sm text-steel-600">European cardiac surgery risk evaluation system for valve procedures</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Risk Models</h4>
          <p className="text-sm text-steel-600">Specialized risk assessment for transcatheter aortic valve replacement candidates</p>
        </div>
      </div>
    </div>
  </div>
);

// Procedure Analytics
const ValvularProcedureAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-amber-600" />
        Valvular Procedure Analytics
      </h3>
      <p className="text-steel-600 mb-6">Detailed analytics for all valve intervention procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Transcatheter Procedures</h4>
          <p className="text-sm text-steel-600">TAVR, MitraClip, TMVR, and tricuspid intervention analytics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Surgical Procedures</h4>
          <p className="text-sm text-steel-600">Valve replacement, repair, and complex multi-valve surgery analytics</p>
        </div>
      </div>
    </div>
  </div>
);

// Safety Screening
const ValvularSafetyScreening: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-amber-600" />
        Valvular Intervention Safety Screening
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive safety assessments and contraindication screening for valve interventions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Safety Protocols</h4>
          <p className="text-sm text-steel-600">Pre-procedural screening, sizing protocols, and complication prevention</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Surgical Risk Assessment</h4>
          <p className="text-sm text-steel-600">Operative risk evaluation and perioperative safety optimization</p>
        </div>
      </div>
    </div>
  </div>
);

// Quality Metrics
const ValvularQualityMetrics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-amber-600" />
        Valvular Disease Quality Metrics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive quality indicators for valve intervention programs.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Quality Measures</h4>
          <p className="text-sm text-steel-600">30-day mortality, stroke rates, and functional outcomes for TAVR procedures</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Surgical Quality Indicators</h4>
          <p className="text-sm text-steel-600">Operative mortality, reoperation rates, and long-term durability metrics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-amber-50 to-medical-amber-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Registry Compliance</h4>
          <p className="text-sm text-steel-600">STS, TVT Registry, and institutional quality database participation</p>
        </div>
      </div>
    </div>
  </div>
);

// Valvular Disease Service Line Tab Configuration
const valvularDiseaseTabs: ServiceLineTabConfig[] = [
  {
    id: 'analytics',
    label: 'Valve Analytics',
    icon: Target,
    description: 'Comprehensive valve intervention analytics dashboard'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'Valve-specific patient risk visualization matrix'
  },
  {
    id: 'valve-heatmap',
    label: 'Valve Patient Matrix',
    icon: Heart,
    description: 'Specialized valve patient assessment heatmap'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Stethoscope,
    description: 'Surgeon and interventionalist performance metrics'
  },
  {
    id: 'decision-support',
    label: 'Decision Support',
    icon: Activity,
    description: 'TAVR vs SAVR and intervention pathway guidance'
  },
  {
    id: 'calculators',
    label: 'Risk Calculators',
    icon: Calculator,
    description: 'STS, EuroSCORE, and valve-specific risk tools'
  },
  {
    id: 'procedures',
    label: 'Procedure Analytics',
    icon: BarChart3,
    description: 'TAVR, MitraClip, and surgical procedure metrics'
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
    description: 'Heart team collaboration and referral patterns'
  },
  {
    id: 'surgical-network',
    label: 'Surgical Network',
    icon: Users,
    description: 'Valve surgery network and collaboration analysis'
  },
  {
    id: 'quality',
    label: 'Quality Metrics',
    icon: Award,
    description: 'TVT Registry, STS database, and quality indicators'
  },
  {
    id: 'reporting',
    label: 'Automated Reports',
    icon: FileText,
    description: 'Scheduled reporting and registry submissions'
  }
];

// Export data configurations
const valvularDiseaseExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'TAVR Volume',
      'Surgical Volume',
      'Complication Rate',
      'Mortality Rate',
      'Quality Score'
    ],
    rows: [
      ['Dr. Robert Chen', 'Interventional Cardiologist', '156', '0', '2.1%', '1.3%', '96.8'],
      ['Dr. Maria Rodriguez', 'Cardiac Surgeon', '0', '187', '3.2%', '2.1%', '94.5'],
      ['Dr. James Wilson', 'Interventional Cardiologist', '142', '0', '1.8%', '0.7%', '97.2'],
      ['Dr. Sarah Thompson', 'Cardiac Surgeon', '0', '203', '2.9%', '1.9%', '95.1'],
      ['Dr. Michael Park', 'Interventional Cardiologist', '134', '0', '2.3%', '1.1%', '96.4'],
      ['Dr. Lisa Martinez', 'Cardiac Surgeon', '0', '178', '3.1%', '2.3%', '94.8']
    ],
    filename: 'valvular_disease_provider_performance',
    title: 'Valvular Disease Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Valvular Disease',
      'Period': 'Q4 2024',
      'Total Procedures': '1,000',
      'Avg Mortality': '1.6%',
      'Avg Quality Score': '95.8'
    }
  },
  procedures: {
    headers: [
      'Procedure Type',
      'Volume',
      'Success Rate',
      'Complication Rate',
      'Avg LOS',
      'Cost per Case'
    ],
    rows: [
      ['TAVR', '432', '98.1%', '4.2%', '2.1 days', '$45,678'],
      ['Surgical AVR', '298', '97.3%', '6.1%', '5.8 days', '$52,341'],
      ['MitraClip', '187', '96.8%', '3.1%', '1.2 days', '$38,234'],
      ['Mitral Valve Surgery', '156', '95.5%', '7.3%', '6.2 days', '$58,912'],
      ['Tricuspid Surgery', '67', '94.2%', '8.1%', '7.1 days', '$61,456'],
      ['Multi-valve Surgery', '43', '91.9%', '12.3%', '9.4 days', '$78,234']
    ],
    filename: 'valvular_disease_procedure_analytics',
    title: 'Valvular Disease Procedure Analytics Report',
    metadata: {
      'Report Type': 'Procedure Analytics',
      'Service Line': 'Valvular Disease',
      'Total Procedures': '1,183',
      'Overall Success Rate': '96.8%',
      'Overall Complication Rate': '5.7%'
    }
  }
};

// Valvular Disease Service Line Configuration
export const valvularDiseaseServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Valvular Disease',
  moduleDescription: 'Comprehensive valve intervention analytics for TAVR, MitraClip, and surgical procedures',
  moduleIcon: Heart,
  primaryColor: 'medical-amber',
  tabs: valvularDiseaseTabs,
  tabContent: {
    'analytics': ValvularDiseaseAnalytics,
    'heatmap': PatientRiskHeatmap,
    'valve-heatmap': ValvePatientHeatmap,
    'providers': ValvularProviderScorecard,
    'decision-support': ValveDecisionSupport,
    'calculators': ValvularRiskCalculators,
    'procedures': ValvularProcedureAnalytics,
    'safety': ValvularSafetyScreening,
    'network': CareTeamNetworkGraph,
    'surgical-network': ValvularSurgicalNetworkVisualization,
    'quality': ValvularQualityMetrics,
    'reporting': AutomatedReportingSystem
  },
  exportData: valvularDiseaseExportData,
  hasExport: true
};