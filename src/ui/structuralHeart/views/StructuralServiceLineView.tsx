import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { structuralHeartServiceLineConfig } from '../config/serviceLineConfig';

const StructuralServiceLineView: React.FC = () => {
  return (
    <BaseServiceLineView config={structuralHeartServiceLineConfig} />
  );
};

export default StructuralServiceLineView;