import React from 'react';
import { BarChart3, Users, FlaskConical } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import ResearchExecutiveView from './views/ResearchExecutiveView';
import ResearchServiceLineView from './views/ResearchServiceLineView';
import ResearchCareTeamView from './views/ResearchCareTeamView';

const ResearchModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Clinical Research Assist',
    description: 'Registry pre-population, trial eligibility screening, and research workflow automation',
    icon: FlaskConical,
    color: 'text-titanium-600',
    patientCount: '443',
    views: [
      {
        id: 'executive',
        label: 'Executive Dashboard',
        icon: BarChart3,
        description: 'Research performance metrics',
        requiredRole: 'executive',
      },
      {
        id: 'service-line',
        label: 'Service Line Analytics',
        icon: FlaskConical,
        description: 'Clinical research workbench',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Research case queue',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': ResearchExecutiveView,
      'service-line': ResearchServiceLineView,
      'care-team': ResearchCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default ResearchModule;
