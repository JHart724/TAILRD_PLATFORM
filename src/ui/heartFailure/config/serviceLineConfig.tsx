import React from 'react';
import { Target, Grid3X3, Stethoscope, BarChart3, Activity, Search, Heart, Network, Users, FileText, Shield } from 'lucide-react';
import { ServiceLineViewConfig } from '../../../components/shared/BaseServiceLineView';
import { ServiceLineTabConfig } from '../../../components/shared/StandardInterfaces';
import { ExportData } from '../../../utils/dataExport';

// Import existing Heart Failure Service Line components
import ProviderScorecard from '../components/service-line/ProviderScorecard';
import GDMTAnalyticsDashboard from '../components/service-line/GDMTAnalyticsDashboard';
import DevicePathwayFunnel from '../components/service-line/DevicePathwayFunnel';
import QualityMetricsDashboard from '../components/service-line/QualityMetricsDashboard';
import HFPhenotypeClassification from '../components/clinical/HFPhenotypeClassification';
import GDMTContraindicationChecker from '../components/clinical/GDMTContraindicationChecker';
import SpecialtyPhenotypesDashboard from '../components/clinical/SpecialtyPhenotypesDashboard';
import AdvancedDeviceTracker from '../components/clinical/AdvancedDeviceTracker';
import HFCareNetworkVisualization from '../components/service-line/HFCareNetworkVisualization';
import PatientRiskHeatmap from '../../../components/visualizations/PatientRiskHeatmap';
import CareTeamNetworkGraph from '../../../components/visualizations/CareTeamNetworkGraph';
import AutomatedReportingSystem from '../../../components/reporting/AutomatedReportingSystem';

// Heart Failure Service Line Tab Configuration
const heartFailureTabs: ServiceLineTabConfig[] = [
  {
    id: 'gdmt',
    label: 'GDMT Analytics',
    icon: Target,
    description: 'Real-time 4-pillar optimization dashboard'
  },
  {
    id: 'heatmap',
    label: 'Patient Risk Heatmap',
    icon: Grid3X3,
    description: 'Interactive risk visualization matrix'
  },
  {
    id: 'providers',
    label: 'Provider Performance',
    icon: Stethoscope,
    description: 'Individual physician metrics and rankings'
  },
  {
    id: 'devices',
    label: 'Device Pathways',
    icon: BarChart3,
    description: 'CRT, ICD, and CardioMEMS funnels'
  },
  {
    id: 'advanced-devices',
    label: 'Advanced Devices',
    icon: Activity,
    description: 'Underutilized high-value interventions'
  },
  {
    id: 'phenotypes',
    label: 'Basic Phenotypes',
    icon: Search,
    description: 'Iron deficiency & sleep apnea assessment'
  },
  {
    id: 'advanced-phenotypes',
    label: 'Specialty Phenotypes',
    icon: Heart,
    description: 'Beyond GDMT: 12 rare HF conditions'
  },
  {
    id: 'safety',
    label: 'Safety Screening',
    icon: Shield,
    description: 'GDMT contraindication checker'
  },
  {
    id: 'network',
    label: 'Care Team Network',
    icon: Network,
    description: 'Provider relationship & patient flow analysis'
  },
  {
    id: 'hf-care-network',
    label: 'HF Care Coordination',
    icon: Heart,
    description: 'Heart failure care pathways & GDMT optimization network'
  },
  {
    id: 'quality',
    label: 'Quality Metrics',
    icon: Users,
    description: 'Core and supplemental quality indicators'
  },
  {
    id: 'reporting',
    label: 'Automated Reports',
    icon: FileText,
    description: 'Scheduled reporting & data exports'
  }
];

// Export data configurations
const heartFailureExportData: Record<string, ExportData> = {
  providers: {
    headers: [
      'Provider Name',
      'Specialty',
      'Patient Volume',
      'GDMT Compliance',
      'Readmission Rate',
      'Quality Score',
      'Performance Tier'
    ],
    rows: [
      ['Dr. Sarah Martinez', 'Heart Failure Specialist', '387', '94.2%', '8.1%', '96.4', 'Tier 1'],
      ['Dr. Michael Chen', 'Cardiologist', '342', '89.7%', '9.2%', '92.1', 'Tier 1'],
      ['Dr. Lisa Thompson', 'Heart Failure Specialist', '298', '91.3%', '7.8%', '94.7', 'Tier 1'],
      ['Dr. James Wilson', 'Cardiologist', '267', '87.4%', '10.1%', '89.2', 'Tier 2'],
      ['Dr. Amanda Rodriguez', 'Heart Failure Specialist', '234', '93.1%', '8.4%', '95.3', 'Tier 1'],
      ['Dr. David Kim', 'Cardiologist', '189', '85.2%', '11.3%', '86.7', 'Tier 2'],
      ['Dr. Jennifer Lopez', 'Heart Failure Specialist', '156', '88.9%', '9.7%', '90.4', 'Tier 2']
    ],
    filename: 'heart_failure_provider_performance',
    title: 'Heart Failure Provider Performance Report',
    metadata: {
      'Report Type': 'Provider Scorecard',
      'Service Line': 'Heart Failure',
      'Period': 'Q4 2024',
      'Total Providers': '7',
      'Total Patients': '1,873',
      'Avg GDMT Compliance': '89.9%'
    }
  },
  gdmt: {
    headers: [
      'GDMT Pillar',
      'Current Rate',
      'Target Rate',
      'Gap',
      'Eligible Patients',
      'Opportunity Value'
    ],
    rows: [
      ['ACE/ARB/ARNI', '94.2%', '95%', '-0.8%', '2,387', '$1.2M'],
      ['Beta Blockers', '91.7%', '95%', '-3.3%', '2,294', '$2.8M'],
      ['MRAs', '78.4%', '85%', '-6.6%', '1,756', '$4.3M'],
      ['SGLT2 Inhibitors', '64.1%', '75%', '-10.9%', '1,892', '$6.7M'],
      ['Diuretics', '89.3%', '90%', '-0.7%', '2,156', '$0.9M'],
      ['Statins', '87.6%', '90%', '-2.4%', '2,034', '$1.8M']
    ],
    filename: 'heart_failure_gdmt_analytics',
    title: 'Heart Failure GDMT Optimization Analysis',
    metadata: {
      'Report Type': 'GDMT Analytics',
      'Service Line': 'Heart Failure',
      'Total Opportunity': '$17.7M',
      'Biggest Gap': 'SGLT2 Inhibitors (-10.9%)',
      'Best Performance': 'ACE/ARB/ARNI (94.2%)'
    }
  }
};

// Heart Failure Service Line Configuration
export const heartFailureServiceLineConfig: ServiceLineViewConfig = {
  moduleName: 'Heart Failure',
  moduleDescription: 'Comprehensive provider performance and GDMT optimization dashboard',
  moduleIcon: Heart,
  primaryColor: 'medical-red',
  tabs: heartFailureTabs,
  tabContent: {
    'gdmt': GDMTAnalyticsDashboard,
    'heatmap': PatientRiskHeatmap,
    'providers': ProviderScorecard,
    'devices': DevicePathwayFunnel,
    'advanced-devices': AdvancedDeviceTracker,
    'phenotypes': HFPhenotypeClassification,
    'advanced-phenotypes': SpecialtyPhenotypesDashboard,
    'safety': GDMTContraindicationChecker,
    'network': CareTeamNetworkGraph,
    'hf-care-network': HFCareNetworkVisualization,
    'quality': QualityMetricsDashboard,
    'reporting': AutomatedReportingSystem
  },
  exportData: heartFailureExportData,
  hasExport: true
};