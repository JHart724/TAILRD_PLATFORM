import React from 'react';
import { Heart, Users, BarChart3, Activity } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import ValvularExecutiveView from './views/ValvularExecutiveView';
import ValvularServiceLineView from './views/ValvularServiceLineView';
import ValvularCareTeamView from './views/ValvularCareTeamView';

const ValvularDiseaseModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Valvular Disease',
    description: 'Surgical valve repair and replacement program',
    icon: Heart,
    color: 'text-indigo-600',
    patientCount: '1,784',
    views: [
      {
        id: 'executive',
        label: 'Executive Dashboard',
        icon: BarChart3,
        description: 'Valvular program metrics and strategic insights',
        requiredRole: 'executive',
      },
      {
        id: 'service-line',
        label: 'Service Line Analytics',
        icon: Activity,
        description: 'Surgical valve repair, Ross procedure, and complex surgery',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Multidisciplinary valve team coordination',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': ValvularExecutiveView,
      'service-line': ValvularServiceLineView,
      'care-team': ValvularCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default ValvularDiseaseModule;