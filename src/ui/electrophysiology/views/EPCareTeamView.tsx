import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { electrophysiologyCareTeamConfig } from '../config/careTeamConfig';

const EPCareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={electrophysiologyCareTeamConfig} />
  );
};

export default EPCareTeamView;