import React from 'react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import { coronaryInterventionConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import { ExportData } from '../../../utils/dataExport';
import ZipHeatMap from '../../../components/shared/ZipHeatMap';

const CoronaryExecutiveView: React.FC = () => {
  // Sample ZIP code data for high-risk CAD/diabetes + chest pain distribution
  const coronaryZipData = [
    { zipCode: "10001", patientCount: 58, riskScore: 8.9, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10002", patientCount: 51, riskScore: 8.1, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10003", patientCount: 42, riskScore: 6.4, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10009", patientCount: 45, riskScore: 7.3, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10010", patientCount: 39, riskScore: 6.0, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10011", patientCount: 36, riskScore: 5.4, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10012", patientCount: 54, riskScore: 8.5, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10013", patientCount: 43, riskScore: 6.8, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10014", patientCount: 47, riskScore: 7.2, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10016", patientCount: 40, riskScore: 6.1, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10017", patientCount: 35, riskScore: 5.3, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10018", patientCount: 44, riskScore: 7.0, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10019", patientCount: 38, riskScore: 5.8, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10021", patientCount: 31, riskScore: 4.5, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10022", patientCount: 33, riskScore: 4.9, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10023", patientCount: 46, riskScore: 7.4, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10024", patientCount: 41, riskScore: 6.3, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10025", patientCount: 43, riskScore: 6.7, riskLevel: "Medium" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10026", patientCount: 55, riskScore: 8.7, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" },
    { zipCode: "10027", patientCount: 50, riskScore: 7.9, riskLevel: "High" as const, conditionType: "High-Risk CAD/DM + Chest Pain" }
  ];

  const handleZipClick = (zipCode: string) => {
    console.log(`Drilling down to high-risk CAD/DM + chest pain patients for ZIP ${zipCode}`);
    // TODO: Navigate to patient list view filtered by ZIP code
  };

  // Generate export data
  const generateExportData = (): ExportData => {
    return {
      filename: 'coronary-intervention-executive-report',
      title: 'Coronary Intervention Executive Dashboard',
      headers: ['Metric', 'Value', 'Target', 'Variance'],
      rows: [
        ['Total Revenue Opportunity', coronaryInterventionConfig.kpiData.totalOpportunity, '$95M', '-$5.6M'],
        ['Patient Population', coronaryInterventionConfig.kpiData.totalPatients, '3,000', '-153'],
        ['Procedural Success Rate', coronaryInterventionConfig.kpiData.gdmtOptimization, '96%', '-2%'],
        ['Avg Revenue per Patient', coronaryInterventionConfig.kpiData.avgRoi, '$33,000', '-$1,600'],
        ['Current CMI', coronaryInterventionConfig.drgMetrics.currentCMI, '3.10', '-0.16'],
        ['Documentation Rate', coronaryInterventionConfig.drgMetrics.documentationRate, '96%', '-2.2%'],
        ['Average LOS', coronaryInterventionConfig.drgMetrics.avgLOS, '3.2 days', '-0.4 days'],
      ],
      metadata: {
        reportDate: new Date().toISOString(),
        module: 'Coronary Intervention',
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
              Financial performance and population health insights for Coronary Intervention • PCI Analytics • STEMI/NSTEMI Outcomes • Stent Optimization
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
            title="High-Risk CAD/DM + Chest Pain Geographic Distribution"
            data={coronaryZipData}
            onZipClick={handleZipClick}
            centerLat={40.7589}
            centerLng={-73.9851}
            zoom={12}
          />
        </div>

        {/* Base Executive View - Consolidated Component */}
        <BaseExecutiveView config={coronaryInterventionConfig} />
      </div>
    </div>
  );
};

export default CoronaryExecutiveView;