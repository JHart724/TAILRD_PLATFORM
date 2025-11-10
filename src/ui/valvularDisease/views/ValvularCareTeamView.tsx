import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { valvularCareTeamConfig } from '../config/careTeamConfig';

const ValvularCareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={valvularCareTeamConfig} />
  );
};

export default ValvularCareTeamView;