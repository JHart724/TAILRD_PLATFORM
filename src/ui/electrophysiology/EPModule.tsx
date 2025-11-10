import React from 'react';
import { Zap, Users, BarChart3 } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';

// Import EP views
import EPExecutiveView from './views/EPExecutiveView';
import EPServiceLineView from './views/EPServiceLineView';
import EPCareTeamView from './views/EPCareTeamView';

const EPModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Electrophysiology',
    description: 'Population AFib screening to complex EP procedures across all care settings',
    icon: Zap,
    color: 'text-yellow-600',
    patientCount: '1,247',
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
        icon: Zap,
        description: 'Ablation outcomes, device optimization, and LAAC metrics',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Patient flow and care coordination',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': EPExecutiveView,
      'service-line': EPServiceLineView,
      'care-team': EPCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default EPModule;