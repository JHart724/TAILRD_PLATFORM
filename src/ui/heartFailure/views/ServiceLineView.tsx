import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { heartFailureServiceLineConfig } from '../config/serviceLineConfig';

const ServiceLineView: React.FC = () => {
  return (
    <BaseServiceLineView config={heartFailureServiceLineConfig} />
  );
};

export default ServiceLineView;
