import React from 'react';
import { Users, Share, Activity, Award, Calculator, Heart, Target, Grid3X3, Shield, BarChart3, FileText, Network } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing Structural Heart Service Line components
import TAVRAnalyticsDashboard from '../components/TAVRAnalyticsDashboard';
import StructuralReferralNetworkVisualization from '../components/StructuralReferralNetworkVisualization';
import STSRiskCalculator from '../components/STSRiskCalculator';

// Import shared components
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

// Structural Heart Analytics Dashboard
const StructuralHeartAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">TAVR Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">1,287</div>
        <div className="text-sm text-green-600">+18.4% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">MitraClip Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">456</div>
        <div className="text-sm text-green-600">+22.7% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">TMVR Procedures</h4>
        <div className="text-2xl font-bold text-steel-900">89</div>
        <div className="text-sm text-green-600">+45.2% vs last quarter</div>
      </div>
      <div className="retina-card p-6">
        <h4 className="text-sm font-medium text-steel-600 mb-2">PVL Closures</h4>
        <div className="text-2xl font-bold text-steel-900">67</div>
        <div className="text-sm text-green-600">+12.3% vs last quarter</div>
      </div>
    </div>
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-medical-red-600" />
        Structural Heart Service Line Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive analytics for transcatheter structural heart interventions including TAVR, MitraClip, TMVR, tricuspid interventions, and paravalvular leak closures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Excellence</h4>
          <p className="text-sm text-steel-600">World-class transcatheter aortic valve replacement program with comprehensive risk assessment</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Innovation</h4>
          <p className="text-sm text-steel-600">Advanced MitraClip and TMVR programs with edge-to-edge repair and valve replacement</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Heart Team Excellence</h4>
          <p className="text-sm text-steel-600">Multidisciplinary heart team approach for optimal patient selection and outcomes</p>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Candidate Assessment
const StructuralCandidateAssessment: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-red-600" />
        Structural Heart Candidate Assessment
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive candidate assessment for transcatheter structural heart interventions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Candidacy</h4>
          <p className="text-sm text-steel-600">Risk assessment, anatomical evaluation, and heart team decision-making for TAVR candidates</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Interventions</h4>
          <p className="text-sm text-steel-600">MitraClip eligibility, TMVR candidate assessment, and functional evaluation</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Tricuspid Assessment</h4>
          <p className="text-sm text-steel-600">Tricuspid intervention candidacy and transcatheter treatment options</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">PVL Closure</h4>
          <p className="text-sm text-steel-600">Paravalvular leak assessment and transcatheter closure planning</p>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Procedure Analytics
const StructuralProcedureAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-medical-red-600" />
        Structural Heart Procedure Analytics
      </h3>
      <p className="text-steel-600 mb-6">Detailed analytics for all structural heart intervention procedures.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Transcatheter Procedures</h4>
          <p className="text-sm text-steel-600">TAVR, MitraClip, TMVR, tricuspid interventions, and device analytics</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Procedural Complexity</h4>
          <p className="text-sm text-steel-600">High-risk cases, anatomical challenges, and technical complexity assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Outcomes Analytics
const StructuralOutcomesAnalytics: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-medical-red-600" />
        Structural Heart Outcomes Analytics
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive outcomes analysis by risk stratification and procedure type.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Outcomes</h4>
          <p className="text-sm text-steel-600">30-day mortality, stroke rates, paravalvular leak, and functional improvement</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Outcomes</h4>
          <p className="text-sm text-steel-600">MitraClip durability, functional improvement, and quality of life measures</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Risk-Adjusted Results</h4>
          <p className="text-sm text-steel-600">STS risk-adjusted outcomes and benchmark comparisons</p>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Risk Calculators
const StructuralRiskCalculators: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-medical-red-600" />
        Structural Heart Risk Calculators
      </h3>
      <p className="text-steel-600 mb-6">Integrated risk assessment tools for structural heart intervention planning.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">STS Risk Calculator</h4>
          <p className="text-sm text-steel-600">Society of Thoracic Surgeons risk assessment for structural interventions</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">EuroSCORE II</h4>
          <p className="text-sm text-steel-600">European cardiac surgery risk evaluation for valve procedures</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Frailty Assessment</h4>
          <p className="text-sm text-steel-600">Comprehensive frailty evaluation and functional status assessment</p>
        </div>
      </div>
    </div>
  </div>
);

// Provider Performance Scorecard
const StructuralProviderScorecard: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-medical-red-600" />
        Structural Heart Provider Performance
      </h3>
      <p className="text-steel-600 mb-6">Individual interventional cardiologist and cardiac surgeon performance metrics.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">TAVR Operators</h4>
          <p className="text-sm text-steel-600">Case volumes, success rates, complication tracking, and device outcomes</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Mitral Specialists</h4>
          <p className="text-sm text-steel-600">MitraClip outcomes, procedural success, and functional improvement rates</p>
        </div>
      </div>
    </div>
  </div>
);

// Safety Screening
const StructuralSafetyScreening: React.FC = () => (
  <div className="space-y-6">
    <div className="retina-card p-8">
      <h3 className="text-lg font-semibold text-steel-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-medical-red-600" />
        Structural Heart Safety Screening
      </h3>
      <p className="text-steel-600 mb-6">Comprehensive safety assessments and contraindication screening for structural interventions.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Pre-procedural Assessment</h4>
          <p className="text-sm text-steel-600">Anatomical screening, access evaluation, and procedural risk assessment</p>
        </div>
        <div className="bg-gradient-to-br from-medical-red-50 to-medical-red-100 p-6 rounded-lg">
          <h4 className="font-semibold text-steel-900 mb-2">Device Selection</h4>
          <p className="text-sm text-steel-600">Optimal device sizing, anatomical compatibility, and procedural planning</p>
        </div>
      </div>
    </div>
  </div>
);

// Structural Heart Service Line Tab Configuration
const structuralHeartTabs: ServiceLineTabConfig[] = [
  {
    id: 'analytics',
    label: 'Structural Analytics',
    icon: Target,
    description: 'Comprehensive structural heart intervention analytics'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'Structural heart patient risk visualization matrix'
  },
  {
    id: 'candidates',
    label: 'Candidate Assessment',
    icon: Users,
    description: 'TAVR, MitraClip, and structural heart candidate evaluation'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Share,
    description: 'Interventionalist and surgeon performance metrics'
  },
  {
    id: 'calculators',
    label: 'Risk Calculators',
    icon: Calculator,
    description: 'STS, EuroSCORE, and structural heart risk tools'
  },
  {
    id: 'sts-calculator',
    label: 'STS Calculator',
    icon: Calculator,
    description: 'Society of Thoracic Surgeons risk assessment tool'
  },
  {
    id: 'procedure-analytics',
    label: 'Procedure Analytics',
    icon: BarChart3,
    description: 'TAVR, MitraClip, and procedural performance metrics'
  },
  {
    id: 'outcomes',
    label: 'Outcomes Analytics',
    icon: Award,
    description: 'Risk-stratified outcomes and benchmark analysis'
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
    id: 'referral-network',
    label: 'Referral Network',
    icon: Activity,
    description: 'Structural heart referral network and patient flow'
  },
  {
    id: 'tavr-analytics',
    label: 'TAVR Analytics',
    icon: Heart,
    description: 'Specialized TAVR program analytics dashboard'
  },
  {
    id: 'reporting',
    label: 'Automated Reports',
    icon: FileText,
    description: 'Scheduled reporting and registry submissions'
  }
];

// Export data configurations
const structuralHeartExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'TAVR Volume',
      'MitraClip Volume',
      'Success Rate',
      'Complication Rate',
      'Quality Score'
    ],
    rows: [
      ['Dr. Sarah Rodriguez', 'Interventional Cardiologist', '198', '67', '98.5%', '2.1%', '97.8'],
      ['Dr. Michael Chen', 'Cardiac Surgeon', '156', '89', '97.4%', '3.2%', '95.6'],
      ['Dr. Lisa Thompson', 'Interventional Cardiologist', '187', '45', '98.9%', '1.6%', '98.2'],
      ['Dr. James Wilson', 'Cardiac Surgeon', '134', '78', '96.3%', '4.1%', '94.1'],
      ['Dr. Amanda Park', 'Interventional Cardiologist', '167', '52', '97.6%', '2.4%', '96.7'],
      ['Dr. David Martinez', 'Cardiac Surgeon', '123', '61', '95.9%', '3.8%', '94.8']
    ],
    filename: 'structural_heart_provider_performance',
    title: 'Structural Heart Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Structural Heart',
      'Period': 'Q4 2024',
      'Total Procedures': '1,357',
      'Avg Success Rate': '97.4%',
      'Avg Quality Score': '96.2'
    }
  },
  procedures: {
    headers: [
      'Procedure Type',
      'Volume',
      'Technical Success',
      'Device Success',
      '30-Day Mortality',
      'Cost per Case'
    ],
    rows: [
      ['TAVR', '965', '99.2%', '96.8%', '1.8%', '$47,892'],
      ['MitraClip', '392', '97.4%', '89.3%', '2.3%', '$42,156'],
      ['TMVR', '89', '94.4%', '87.6%', '3.4%', '$78,234'],
      ['Tricuspid Intervention', '67', '91.0%', '82.1%', '4.5%', '$52,891'],
      ['PVL Closure', '156', '96.8%', '91.7%', '1.9%', '$28,456'],
      ['LAA Occlusion', '234', '98.3%', '94.4%', '0.8%', '$18,734']
    ],
    filename: 'structural_heart_procedure_analytics',
    title: 'Structural Heart Procedure Analytics Report',
    metadata: {
      'Report Type': 'Procedure Analytics',
      'Service Line': 'Structural Heart',
      'Total Procedures': '1,903',
      'Overall Technical Success': '97.2%',
      'Overall 30-Day Mortality': '2.1%'
    }
  }
};

// Structural Heart Service Line Configuration
export const structuralHeartServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Structural Heart',
  moduleDescription: 'Advanced structural heart analytics for TAVR, MitraClip, and transcatheter interventions',
  moduleIcon: Heart,
  primaryColor: 'medical-red',
  tabs: structuralHeartTabs,
  tabContent: {
    'analytics': StructuralHeartAnalytics,
    'heatmap': PatientRiskHeatmap,
    'candidates': StructuralCandidateAssessment,
    'providers': StructuralProviderScorecard,
    'calculators': StructuralRiskCalculators,
    'sts-calculator': STSRiskCalculator,
    'procedure-analytics': StructuralProcedureAnalytics,
    'outcomes': StructuralOutcomesAnalytics,
    'safety': StructuralSafetyScreening,
    'network': CareTeamNetworkGraph,
    'referral-network': StructuralReferralNetworkVisualization,
    'tavr-analytics': TAVRAnalyticsDashboard,
    'reporting': AutomatedReportingSystem
  },
  exportData: structuralHeartExportData,
  hasExport: true
};