import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { coronaryCareTeamConfig } from '../config/careTeamConfig';

const CoronaryCareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={coronaryCareTeamConfig} />
  );
};

export default CoronaryCareTeamView;