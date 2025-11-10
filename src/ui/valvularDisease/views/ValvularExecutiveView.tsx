import React from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { valvularDiseaseConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';

const ValvularExecutiveView: React.FC = () => {
  // Sample ZIP code data for valve disease gaps
  const valvularZipData = [
    { zipCode: "10001", patientCount: 38, riskScore: 7.9, riskLevel: "High" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10002", patientCount: 32, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10003", patientCount: 25, riskScore: 5.1, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10009", patientCount: 29, riskScore: 6.4, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10010", patientCount: 22, riskScore: 4.0, riskLevel: "Low" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10011", patientCount: 20, riskScore: 3.6, riskLevel: "Low" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10012", patientCount: 35, riskScore: 7.2, riskLevel: "High" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10013", patientCount: 26, riskScore: 5.5, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10014", patientCount: 31, riskScore: 5.9, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10016", patientCount: 24, riskScore: 4.3, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10017", patientCount: 21, riskScore: 3.8, riskLevel: "Low" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10018", patientCount: 28, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10019", patientCount: 23, riskScore: 4.5, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10021", patientCount: 17, riskScore: 2.9, riskLevel: "Low" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10022", patientCount: 19, riskScore: 3.4, riskLevel: "Low" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10023", patientCount: 30, riskScore: 6.1, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10024", patientCount: 25, riskScore: 4.8, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10025", patientCount: 27, riskScore: 5.7, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10026", patientCount: 37, riskScore: 7.5, riskLevel: "High" as const, conditionType: "Valve Disease Gap" },
    { zipCode: "10027", patientCount: 33, riskScore: 6.9, riskLevel: "Medium" as const, conditionType: "Valve Disease Gap" }
  ];

  const handleZipClick = (zipCode: string) => {
    console.log(`Drilling down to valve disease gap patients for ZIP ${zipCode}`);
    // TODO: Navigate to patient list view filtered by ZIP code
  };

  // Generate export data
  const generateExportData = (): ExportData => {
    return {
      filename: 'valvular-disease-executive-report',
      title: 'Valvular Disease Executive Dashboard',
      headers: ['Metric', 'Value', 'Target', 'Variance'],
      rows: [
        ['Total Revenue Opportunity', valvularDiseaseConfig.kpiData.totalOpportunity, '$58M', '-$6.3M'],
        ['Patient Population', valvularDiseaseConfig.kpiData.totalPatients, '1,500', '-158'],
        ['Optimal Therapy Rate', valvularDiseaseConfig.kpiData.gdmtOptimization, '85%', '-14%'],
        ['Avg Revenue per Patient', valvularDiseaseConfig.kpiData.avgRoi, '$42,000', '-$3,500'],
        ['Current CMI', valvularDiseaseConfig.drgMetrics.currentCMI, '2.35', '-0.23'],
        ['Documentation Rate', valvularDiseaseConfig.drgMetrics.documentationRate, '95%', '-3.6%'],
        ['Average LOS', valvularDiseaseConfig.drgMetrics.avgLOS, '6.2 days', '+0.6 days'],
      ],
      metadata: {
        reportDate: new Date().toISOString(),
        module: 'Valvular Disease',
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
              Financial performance and population health insights for Valvular Disease • SAVR • Mitral Interventions • Aortic Valve Procedures
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
            title="Valve Disease Care Gap Geographic Distribution"
            data={valvularZipData}
            onZipClick={handleZipClick}
            centerLat={40.7589}
            centerLng={-73.9851}
            zoom={12}
          />
        </div>

        {/* Base Executive View - Consolidated Component */}
        <BaseExecutiveView config={valvularDiseaseConfig} />
      </div>
    </div>
  );
};

export default ValvularExecutiveView;