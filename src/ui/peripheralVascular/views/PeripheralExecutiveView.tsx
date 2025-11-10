import React from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { peripheralVascularConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';

const PeripheralExecutiveView: React.FC = () => {
  // Generate export data
  const generateExportData = (): ExportData => {
    return {
      filename: 'peripheral-vascular-executive-report',
      title: 'Peripheral Vascular Executive Dashboard',
      headers: ['Metric', 'Value', 'Target', 'Variance'],
      rows: [
        ['Total Revenue Opportunity', peripheralVascularConfig.kpiData.totalOpportunity, '$48M', '-$5.7M'],
        ['Patient Population', peripheralVascularConfig.kpiData.totalPatients, '2,000', '-153'],
        ['Optimal Therapy Rate', peripheralVascularConfig.kpiData.gdmtOptimization, '75%', '-13%'],
        ['Avg Revenue per Patient', peripheralVascularConfig.kpiData.avgRoi, '$25,000', '-$2,100'],
        ['Current CMI', peripheralVascularConfig.drgMetrics.currentCMI, '1.90', '-0.16'],
        ['Documentation Rate', peripheralVascularConfig.drgMetrics.documentationRate, '92%', '-7.4%'],
        ['Average LOS', peripheralVascularConfig.drgMetrics.avgLOS, '3.5 days', '+0.3 days'],
      ],
      metadata: {
        reportDate: new Date().toISOString(),
        module: 'Peripheral Vascular',
        dataSource: 'TAILRD Analytics Platform',
        lastUpdated: '2024-01-15T10:30:00Z'
      }
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 p-6 relative overflow-hidden">
      {/* Web 3.0 Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <header className="mb-8 flex justify-between items-start" role="banner">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 bg-clip-text text-transparent mb-2 font-sf drop-shadow-sm">
              Executive Dashboard
            </h1>
            <p className="text-lg text-steel-600 font-medium">
              Financial performance and population health insights for Peripheral Vascular • PAD • Critical Limb Ischemia • Limb Salvage Analytics
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
        <BaseExecutiveView config={peripheralVascularConfig} />
      </div>
    </div>
  );
};

export default PeripheralExecutiveView;