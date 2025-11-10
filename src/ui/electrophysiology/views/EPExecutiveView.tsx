import React from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { electrophysiologyConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';

const EPExecutiveView: React.FC = () => {
  // Sample ZIP code data for AF burden clusters
  const epZipData = [
    { zipCode: "10001", patientCount: 46, riskScore: 8.1, riskLevel: "High" as const, conditionType: "AF Burden" },
    { zipCode: "10002", patientCount: 41, riskScore: 7.4, riskLevel: "High" as const, conditionType: "AF Burden" },
    { zipCode: "10003", patientCount: 34, riskScore: 5.9, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10009", patientCount: 38, riskScore: 6.7, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10010", patientCount: 31, riskScore: 5.3, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10011", patientCount: 29, riskScore: 4.8, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10012", patientCount: 44, riskScore: 7.8, riskLevel: "High" as const, conditionType: "AF Burden" },
    { zipCode: "10013", patientCount: 35, riskScore: 6.2, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10014", patientCount: 39, riskScore: 6.5, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10016", patientCount: 33, riskScore: 5.6, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10017", patientCount: 28, riskScore: 4.6, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10018", patientCount: 36, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10019", patientCount: 32, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10021", patientCount: 25, riskScore: 4.1, riskLevel: "Low" as const, conditionType: "AF Burden" },
    { zipCode: "10022", patientCount: 27, riskScore: 4.4, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10023", patientCount: 37, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10024", patientCount: 33, riskScore: 5.7, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10025", patientCount: 35, riskScore: 6.0, riskLevel: "Medium" as const, conditionType: "AF Burden" },
    { zipCode: "10026", patientCount: 48, riskScore: 8.4, riskLevel: "High" as const, conditionType: "AF Burden" },
    { zipCode: "10027", patientCount: 42, riskScore: 7.6, riskLevel: "High" as const, conditionType: "AF Burden" }
  ];

  const handleZipClick = (zipCode: string) => {
    console.log(`Drilling down to AF burden patients for ZIP ${zipCode}`);
    // TODO: Navigate to patient list view filtered by ZIP code
  };

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

      {/* Geographic Heat Map */}
      <div className="mb-6">
        <ZipHeatMap
          title="AF Burden Geographic Distribution"
          data={epZipData}
          onZipClick={handleZipClick}
          centerLat={40.7589}
          centerLng={-73.9851}
          zoom={12}
        />
      </div>

      {/* Base Executive View - Consolidated Component */}
      <BaseExecutiveView config={electrophysiologyConfig} />
    </div>
  );
};

export default EPExecutiveView;