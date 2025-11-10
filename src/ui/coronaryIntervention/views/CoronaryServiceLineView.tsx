import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { coronaryServiceLineConfig } from '../config/serviceLineConfig';

const CoronaryServiceLineView: React.FC = () => {
  

  return (
    <BaseServiceLineView config={coronaryServiceLineConfig} />
  );
};

export default CoronaryServiceLineView;