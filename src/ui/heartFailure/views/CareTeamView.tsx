import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { heartFailureCareTeamConfig } from '../config/careTeamConfig';

const CareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={heartFailureCareTeamConfig} />
  );
};

export default CareTeamView;