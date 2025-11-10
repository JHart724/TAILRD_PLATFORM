import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { peripheralCareTeamConfig } from '../config/careTeamConfig';

const PeripheralCareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={peripheralCareTeamConfig} />
  );
};

export default PeripheralCareTeamView;