import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { electrophysiologyServiceLineConfig } from '../config/serviceLineConfig';

const EPServiceLineView: React.FC = () => {

  return (
    <BaseServiceLineView config={electrophysiologyServiceLineConfig} />
  );
};

export default EPServiceLineView;