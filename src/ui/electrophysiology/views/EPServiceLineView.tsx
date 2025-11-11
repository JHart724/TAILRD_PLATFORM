import React, { useState } from 'react';
import { Zap, Target, Grid3X3, BarChart3, Users, Activity, Heart, Shield, Network, Brain, Award, DollarSign, FileText } from 'lucide-react';
import ExportButton from '../../../components/shared/ExportButton';

// Import EP components
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

import { electrophysiologyServiceLineConfig } from '../config/serviceLineConfig';

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

type EPServiceLineTab = 
  | 'analytics'
  | 'heatmap' 
  | 'procedures'
  | 'providers'
  | 'arrhythmia'
  | 'laac-risk'
  | 'patient-details'
  | 'safety'
  | 'device-network'
  | 'network'
  | 'clinical-support'
  | 'automated-support'
  | 'quality'
  | 'roi-calculator'
  | 'reporting';

const EPServiceLineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EPServiceLineTab>('analytics');

  const tabs = [
    { id: 'analytics', label: 'EP Analytics', icon: Target, description: 'Comprehensive electrophysiology analytics dashboard' },
    { id: 'heatmap', label: 'Patient Risk Heatmap', icon: Grid3X3, description: 'EP patient risk visualization matrix' },
    { id: 'procedures', label: 'Procedure Analytics', icon: BarChart3, description: 'AFib ablation, LAAC, and device procedure metrics' },
    { id: 'providers', label: 'Provider Performance', icon: Users, description: 'Electrophysiologist performance metrics and outcomes' },
    { id: 'arrhythmia', label: 'Arrhythmia Management', icon: Activity, description: 'Comprehensive arrhythmia treatment optimization' },
    { id: 'laac-risk', label: 'LAAC Risk Dashboard', icon: Heart, description: 'Left atrial appendage closure risk assessment' },
    { id: 'patient-details', label: 'Patient Detail Panel', icon: Users, description: 'Individual patient EP assessment and tracking' },
    { id: 'safety', label: 'Safety Screening', icon: Shield, description: 'Anticoagulation safety and contraindication screening' },
    { id: 'device-network', label: 'Device Network', icon: Network, description: 'EP device utilization and network analysis' },
    { id: 'network', label: 'Care Team Network', icon: Network, description: 'EP care team collaboration and referral patterns' },
    { id: 'clinical-support', label: 'Clinical Decision Support', icon: Brain, description: 'AI-powered EP clinical decision support tools' },
    { id: 'automated-support', label: 'Automated Support', icon: Zap, description: 'Automated EP clinical support and recommendations' },
    { id: 'quality', label: 'Quality Metrics', icon: Award, description: 'EP quality indicators and outcome measures' },
    { id: 'roi-calculator', label: 'ROI Calculator', icon: DollarSign, description: 'EP program financial impact and ROI calculator' },
    { id: 'reporting', label: 'Automated Reports', icon: FileText, description: 'Scheduled reporting and data exports' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics': return <ElectrophysiologyAnalytics />;
      case 'heatmap': return <PatientRiskHeatmap />;
      case 'procedures': return <EPProcedureAnalytics />;
      case 'providers': return <EPProviderPerformance />;
      case 'arrhythmia': return <ArrhythmiaManagement />;
      case 'laac-risk': return <LAACRiskDashboard />;
      case 'patient-details': return <PatientDetailPanel patient={{
        id: '001',
        name: 'Demo Patient',
        mrn: 'MRN123456',
        age: 65,
        gender: 'M',
        rhythm: 'AFib',
        device: 'ICD',
        lastEP: '2024-01-15',
        nextAppt: '2024-03-15',
        riskLevel: 'medium',
        alerts: ['Device check due'],
        provider: 'Dr. Smith',
        priority: 'medium',
        actionItems: []
      }} onClose={() => {}} />;
      case 'safety': return <AnticoagulationSafetyChecker />;
      case 'device-network': return <EPDeviceNetworkVisualization />;
      case 'network': return <CareTeamNetworkGraph />;
      case 'clinical-support': return <EPClinicalDecisionSupport />;
      case 'automated-support': return <EPAutomatedClinicalSupport />;
      case 'quality': return <EPQualityMetrics />;
      case 'roi-calculator': return <EPROICalculator />;
      case 'reporting': return <AutomatedReportingSystem />;
      default: return <ElectrophysiologyAnalytics />;
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
                Electrophysiology Service Line Analytics
              </h1>
              <p className="text-lg text-steel-600 font-medium">
                Advanced EP analytics for procedures, devices, and clinical outcomes
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ExportButton 
                data={electrophysiologyServiceLineConfig.exportData?.providers || { 
                  filename: 'ep-service-line-export',
                  title: 'Electrophysiology Service Line Report',
                  headers: ['Metric', 'Value'],
                  rows: [['AFib Ablations', '1,234'], ['LAAC Procedures', '456']]
                }}
                variant="outline"
                size="sm"
                className="shadow-lg hover:shadow-xl transition-all duration-300"
              />
              <div className="p-4 rounded-2xl bg-medical-green-50 border border-medical-green-200 shadow-lg">
                <Zap className="w-8 h-8 text-medical-green-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Grid layout for 15 tabs */}
        <div className="retina-card bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-8 2xl:grid-cols-15 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EPServiceLineTab)}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-green-50 border-medical-green-200 text-medical-green-600 shadow-lg scale-105'
                      : 'bg-white/60 border-white/40 text-steel-600 hover:bg-white/80 hover:scale-105 hover:shadow-lg'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-medical-green-600' : 'text-steel-600 group-hover:text-steel-800'}`} />
                    <span className={`text-sm font-semibold ${isActive ? 'text-medical-green-600' : 'text-steel-600 group-hover:text-steel-800'}`}>
                      {tab.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-medical-green-400/20 to-medical-green-500/20 rounded-xl opacity-50" />
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

export default EPServiceLineView;