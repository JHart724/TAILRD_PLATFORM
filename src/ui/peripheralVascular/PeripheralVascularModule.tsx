import React from 'react';
import { Navigation, Users, BarChart3, Activity } from 'lucide-react';
import ModuleLayout, { ModuleConfig } from '../../components/shared/ModuleLayout';
import PeripheralExecutiveView from './views/PeripheralExecutiveView';
import PeripheralServiceLineView from './views/PeripheralServiceLineView';
import PeripheralCareTeamView from './views/PeripheralCareTeamView';

const PeripheralVascularModule: React.FC = () => {
  const moduleConfig: ModuleConfig = {
    name: 'Peripheral Vascular',
    description: 'Comprehensive PAD and limb salvage programs',
    icon: Navigation,
    color: 'text-teal-600',
    patientCount: '2,494',
    views: [
      {
        id: 'executive',
        label: 'Executive Dashboard',
        icon: BarChart3,
        description: 'PAD program metrics and strategic insights',
        requiredRole: 'executive',
      },
      {
        id: 'service-line',
        label: 'Service Line Analytics',
        icon: Activity,
        description: 'Endovascular and surgical outcomes',
        requiredRole: 'service-line',
      },
      {
        id: 'care-team',
        label: 'Care Team Operations',
        icon: Users,
        description: 'Limb salvage and wound care coordination',
        requiredRole: 'care-team',
      },
    ],
    components: {
      'executive': PeripheralExecutiveView,
      'service-line': PeripheralServiceLineView,
      'care-team': PeripheralCareTeamView,
    },
  };

  return <ModuleLayout config={moduleConfig} />;
};

export default PeripheralVascularModule;