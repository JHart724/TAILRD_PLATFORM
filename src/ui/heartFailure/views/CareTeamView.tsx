import React, { useState } from 'react';
import { Users, MessageCircle, AlertTriangle, ClipboardList, FileText } from 'lucide-react';

// Import enhanced Phase 4 components
import PatientWorklistEnhanced from '../components/care-team/PatientWorklistEnhanced';
import ReferralTrackerEnhanced from '../components/care-team/ReferralTrackerEnhanced';
import TeamCollaborationPanel from '../components/care-team/TeamCollaborationPanel';
import CareGapAnalyzer from '../components/care-team/CareGapAnalyzer';
import CDIDocumentationPrompt from '../../../components/shared/CDIDocumentationPrompt';
import { CDIAlert } from '../../../components/shared/CDIDocumentationPrompt';

type CareTeamTab = 'patients' | 'referrals' | 'collaboration' | 'gaps' | 'cdi';

const CareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareTeamTab>('patients');

  // Heart Failure CDI Alerts for Care Team
  const hfCDIAlerts: CDIAlert[] = [
    {
      patientId: 'HF-15892',
      patientName: 'Johnson, Mary',
      mrn: 'MRN-HF-15892',
      currentDiagnoses: ['I50.9 - Heart failure, unspecified', 'E11.9 - Type 2 diabetes'],
      suggestedAdditions: ['N18.6 - End stage renal disease', 'E43 - Unspecified severe protein-calorie malnutrition'],
      impactAnalysis: {
        severityChange: 2,
        mortalityChange: 1,
        reimbursementImpact: 8420,
        cmiImpact: 0.45
      },
      priority: 'high',
      dueDate: '2024-10-24',
      physicianName: 'Dr. Martinez',
      currentDRG: '293',
      potentialDRG: '291'
    },
    {
      patientId: 'HF-15743',
      patientName: 'Chen, Robert',
      mrn: 'MRN-HF-15743',
      currentDiagnoses: ['I50.22 - Chronic systolic heart failure', 'I25.10 - Coronary artery disease'],
      suggestedAdditions: ['J44.1 - Chronic obstructive pulmonary disease with acute exacerbation', 'N18.3 - Chronic kidney disease, stage 3'],
      impactAnalysis: {
        severityChange: 1,
        mortalityChange: 1,
        reimbursementImpact: 6180,
        cmiImpact: 0.32
      },
      priority: 'high',
      dueDate: '2024-10-23',
      physicianName: 'Dr. Thompson',
      currentDRG: '292',
      potentialDRG: '291'
    },
    {
      patientId: 'HF-15621',
      patientName: 'Rodriguez, Anna',
      mrn: 'MRN-HF-15621',
      currentDiagnoses: ['I50.9 - Heart failure, unspecified', 'I10 - Essential hypertension'],
      suggestedAdditions: ['I11.0 - Hypertensive heart disease with heart failure', 'E11.22 - Type 2 diabetes with diabetic chronic kidney disease'],
      impactAnalysis: {
        severityChange: 1,
        mortalityChange: 0,
        reimbursementImpact: 4250,
        cmiImpact: 0.18
      },
      priority: 'medium',
      dueDate: '2024-10-26',
      physicianName: 'Dr. Patel',
      currentDRG: '293',
      potentialDRG: '292'
    }
  ];

  const tabs = [
    {
      id: 'patients' as CareTeamTab,
      label: 'Patient Worklist',
      icon: Users,
      description: 'Priority patients with action items',
    },
    {
      id: 'cdi' as CareTeamTab,
      label: 'CDI Alerts',
      icon: FileText,
      description: 'Documentation improvement opportunities',
    },
    {
      id: 'referrals' as CareTeamTab,
      label: 'Referral Management',
      icon: ClipboardList,
      description: 'Specialist referrals and care transitions',
    },
    {
      id: 'collaboration' as CareTeamTab,
      label: 'Team Communication',
      icon: MessageCircle,
      description: 'Real-time team messaging and alerts',
    },
    {
      id: 'gaps' as CareTeamTab,
      label: 'Care Gaps',
      icon: AlertTriangle,
      description: 'Quality improvement opportunities',
    },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientWorklistEnhanced />;
      case 'cdi':
        return <CDIDocumentationPrompt 
          alerts={hfCDIAlerts}
          title="Heart Failure CDI Documentation Alerts"
          maxVisible={4}
          showActions={true}
        />;
      case 'referrals':
        return <ReferralTrackerEnhanced />;
      case 'collaboration':
        return <TeamCollaborationPanel />;
      case 'gaps':
        return <CareGapAnalyzer />;
      default:
        return <PatientWorklistEnhanced />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-medical-liquid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="retina-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-steel-900 mb-2 font-sf">
                Care Team Command Center
              </h1>
              <p className="text-lg text-steel-600">
                Comprehensive care coordination and team collaboration platform
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-medical-blue-100">
                <Users className="w-8 h-8 text-medical-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-5 gap-4">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                  activeTab === tab.id
                    ? 'border-medical-blue-400 bg-medical-blue-50 shadow-retina-3'
                    : 'border-steel-200 hover:border-steel-300 hover:shadow-retina-2 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    activeTab === tab.id ? 'bg-medical-blue-100' : 'bg-steel-100'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      activeTab === tab.id ? 'text-medical-blue-600' : 'text-steel-600'
                    }`} />
                  </div>
                  <span className={`font-semibold ${
                    activeTab === tab.id ? 'text-medical-blue-900' : 'text-steel-900'
                  }`}>
                    {tab.label}
                  </span>
                </div>
                <p className={`text-sm ${
                  activeTab === tab.id ? 'text-medical-blue-700' : 'text-steel-600'
                }`}>
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Component */}
        <div className="transition-all duration-300">
          {renderActiveComponent()}
        </div>
      </div>
    </div>
  );
};

export default CareTeamView;
