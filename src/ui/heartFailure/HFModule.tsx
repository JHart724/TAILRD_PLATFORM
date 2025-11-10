import React from 'react';
import { BarChart3, Users, Heart } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import ExecutiveView from './views/ExecutiveView';
import ServiceLineView from './views/ServiceLineView';
import CareTeamView from './views/CareTeamView';

const HFModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Heart Failure',
    description: 'GDMT optimization and population health management across the continuum',
    icon: Heart,
    color: 'text-red-600',
    patientCount: '2,847',
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
        icon: Heart,
        description: 'GDMT optimization and quality metrics',
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
      'executive': ExecutiveView,
      'service-line': ServiceLineView,
      'care-team': CareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default HFModule;