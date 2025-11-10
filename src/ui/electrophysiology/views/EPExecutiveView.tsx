import React from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { electrophysiologyConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';

const EPExecutiveView: React.FC = () => {
  // Generate export data
  const generateExportData = (): ExportData => {
    return {
      filename: 'electrophysiology-executive-report',
      title: 'Electrophysiology Executive Dashboard',
      headers: ['Metric', 'Value', 'Target', 'Variance'],
      rows: [
        ['Total Revenue Opportunity', electrophysiologyConfig.kpiData.totalOpportunity, '$100M', '-$5.6M'],
        ['Patient Population', electrophysiologyConfig.kpiData.totalPatients, '2,000', '-153'],
        ['Device Optimization', electrophysiologyConfig.kpiData.gdmtOptimization, '90%', '-3%'],
        ['Avg Revenue per Patient', electrophysiologyConfig.kpiData.avgRoi, '$55,000', '-$3,800'],
        ['Current CMI', electrophysiologyConfig.drgMetrics.currentCMI, '3.20', '+0.22'],
        ['Documentation Rate', electrophysiologyConfig.drgMetrics.documentationRate, '96%', '-1.3%'],
        ['Average LOS', electrophysiologyConfig.drgMetrics.avgLOS, '2.5 days', '-0.4 days'],
      ],
      metadata: {
        reportDate: new Date().toISOString(),
        module: 'Electrophysiology',
        dataSource: 'TAILRD Analytics Platform',
        lastUpdated: '2024-01-15T10:30:00Z'
      }
    };
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <header className="mb-8 flex justify-between items-start" role="banner">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf drop-shadow-sm">
            Executive Dashboard
          </h1>
          <p className="text-lg text-steel-600 font-medium">
            Financial performance and population health insights for Electrophysiology • Device Optimization • Ablation Analytics • LAAC Outcomes
          </p>
        </div>
        
        <ExportButton 
          data={generateExportData()}
          variant="outline"
          size="md"
          className="shadow-lg hover:shadow-xl transition-all duration-300"
        />
      </header>

      {/* Base Executive View - Consolidated Component */}
      <BaseExecutiveView config={electrophysiologyConfig} />
    </div>
  );
};

export default EPExecutiveView;