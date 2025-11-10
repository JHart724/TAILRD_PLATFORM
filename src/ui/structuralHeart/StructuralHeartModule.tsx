import React from 'react';
import { Heart, Users, BarChart3 } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import StructuralExecutiveView from './views/StructuralExecutiveView';
import StructuralServiceLineView from './views/StructuralServiceLineView';
import StructuralCareTeamView from './views/StructuralCareTeamView';

const StructuralHeartModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Structural Heart',
    description: 'Transcatheter procedures, TAVR, and TEER optimization',
    icon: Heart,
    color: 'text-purple-600',
    patientCount: '1,856',
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
        description: 'Transcatheter procedures, TAVR, and TEER optimization',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Patient flow and multidisciplinary coordination',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': StructuralExecutiveView,
      'service-line': StructuralServiceLineView,
      'care-team': StructuralCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default StructuralHeartModule;