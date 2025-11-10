import React from 'react';
import BaseCareTeamView from '../../../components/shared/BaseCareTeamView';
import { structuralCareTeamConfig } from '../config/careTeamConfig';

const StructuralCareTeamView: React.FC = () => {
  return (
    <BaseCareTeamView config={structuralCareTeamConfig} />
  );
};

export default StructuralCareTeamView;