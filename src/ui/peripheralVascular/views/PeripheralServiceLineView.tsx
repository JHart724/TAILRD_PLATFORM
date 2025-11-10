import React from 'react';
import BaseServiceLineView from '../../../components/shared/BaseServiceLineView';
import { peripheralVascularServiceLineConfig } from '../config/serviceLineConfig';

const PeripheralServiceLineView: React.FC = () => {
  return (
    <BaseServiceLineView config={peripheralVascularServiceLineConfig} />
  );
};

export default PeripheralServiceLineView;