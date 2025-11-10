import React from 'react';
import { Users, BarChart3, Activity } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import CoronaryExecutiveView from './views/CoronaryExecutiveView';
import CoronaryServiceLineView from './views/CoronaryServiceLineView';
import CoronaryCareTeamView from './views/CoronaryCareTeamView';

const CoronaryInterventionModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Coronary Intervention',
    description: 'Population CAD screening to complex revascularization across PCP-Cardiology-Surgery',
    icon: Activity,
    color: 'text-orange-600',
    patientCount: '3,046',
    views: [
      {
        id: 'executive',
        label: 'Executive Dashboard',
        icon: BarChart3,
        description: 'Financial metrics and strategic insights',
        requiredRole: 'executive',
      },
      {
        id: 'service-line',
        label: 'Service Line Analytics',
        icon: Activity,
        description: 'Complex PCI/CTO, Protected PCI, and surgical outcomes',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Patient flow and acute care coordination',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': CoronaryExecutiveView,
      'service-line': CoronaryServiceLineView,
      'care-team': CoronaryCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default CoronaryInterventionModule;