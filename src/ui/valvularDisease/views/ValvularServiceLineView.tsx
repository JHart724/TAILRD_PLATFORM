import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { valvularDiseaseServiceLineConfig } from '../config/serviceLineConfig';

const ValvularServiceLineView: React.FC = () => {
  return (
    <BaseServiceLineView config={valvularDiseaseServiceLineConfig} />
  );
};

export default ValvularServiceLineView;