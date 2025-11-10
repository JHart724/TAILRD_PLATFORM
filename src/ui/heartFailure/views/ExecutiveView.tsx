import React from 'react';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import BaseExecutiveView from '../../../components/shared/BaseExecutiveView';
import KPICard from '../../../components/shared/KPICard';
import DRGOptimizationAlert from '../../../components/shared/DRGOptimizationAlert';
import { heartFailureConfig } from '../config/executiveConfig';
import ExportButton from '../../../components/shared/ExportButton';
import FinancialROIWaterfall from '../components/executive/FinancialROIWaterfall';
import GeographicHeatMap from '../components/executive/GeographicHeatMap';
import ROIWaterfall from '../components/ROIWaterfall';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';
import OpportunityHeatmap from '../components/OpportunityHeatmap';
import { ExportData } from '../../../utils/dataExport';

const ExecutiveView: React.FC = () => {
  // Generate export data
  const generateExportData = (): ExportData => {
    return {
      filename: 'heart-failure-executive-report',
      title: 'Heart Failure Executive Dashboard',
      headers: ['Metric', 'Value', 'Target', 'Variance'],
      rows: [
        ['Total Revenue Opportunity', heartFailureConfig.kpiData.totalOpportunity, '$70M', '-$1.2M'],
        ['Patient Population', heartFailureConfig.kpiData.totalPatients, '2,500', '-6'],
        ['GDMT Optimization', heartFailureConfig.kpiData.gdmtOptimization, '50%', '-12%'],
        ['Avg Revenue per Patient', heartFailureConfig.kpiData.avgRoi, '$30,000', '-$2,400'],
        ['Current CMI', heartFailureConfig.drgMetrics.currentCMI, '2.30', '-0.02'],
        ['Documentation Rate', heartFailureConfig.drgMetrics.documentationRate, '95%', '-3.8%'],
        ['Average LOS', heartFailureConfig.drgMetrics.avgLOS, '3.5 days', '+0.3 days'],
      ],
      metadata: {
        reportDate: new Date().toISOString(),
        module: 'Heart Failure',
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
        {/* Export Button - Clean Integration */}
        <div className="flex justify-end mb-6">
          <ExportButton 
            data={generateExportData()}
            variant="outline"
            size="md"
            className="shadow-lg hover:shadow-xl transition-all duration-300"
          />
        </div>

        {/* #1: Strategic KPI Overview - Executive Summary */}
        <div className="grid grid-cols-4 gap-6 relative z-10 mb-6">
          <KPICard
            label="Patient Population"
            value={heartFailureConfig.kpiData.totalPatients}
            subvalue={heartFailureConfig.kpiData.totalPatientsSub}
            icon={Users}
            trend={{
              direction: 'up',
              value: '+10%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Total Revenue Opportunity"
            value={heartFailureConfig.kpiData.totalOpportunity}
            subvalue={heartFailureConfig.kpiData.totalOpportunitySub}
            status="optimal"
            icon={DollarSign}
            trend={{
              direction: 'up',
              value: '+15%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Clinical Quality Optimization"
            value={heartFailureConfig.kpiData.gdmtOptimization}
            subvalue={heartFailureConfig.kpiData.gdmtOptimizationSub}
            status="optimal"
            icon={Target}
            trend={{
              direction: 'up',
              value: '+12%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Revenue per Patient"
            value={heartFailureConfig.kpiData.avgRoi}
            subvalue={heartFailureConfig.kpiData.avgRoiSub}
            status="optimal"
            icon={TrendingUp}
            trend={{
              direction: 'up',
              value: '+18%',
              label: 'vs last quarter',
            }}
          />
        </div>

        {/* #2: Revenue Opportunity Waterfall */}
        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-xl font-bold text-steel-900 mb-1">Revenue Opportunity Waterfall</h3>
            <p className="text-sm text-steel-600">Annual revenue opportunity by intervention category</p>
          </div>
          <div className="p-6">
            <ROIWaterfall data={{
              gdmt_revenue: 2.4,
              devices_revenue: 1.8,
              phenotypes_revenue: 1.2,
              _340b_revenue: 0.8,
              total_revenue: 6.2,
              realized_revenue: 3.1
            }} />
          </div>
        </div>

        {/* #3 & #4: Projected vs Realized Revenue and Benchmarks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 mb-6">
          {/* Projected vs Realized */}
          <div className="retina-card card-web3-hover">
            <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-steel-900 mb-1">Projected vs Realized Revenue</h3>
              <p className="text-sm text-steel-600">Revenue tracking and variance analysis</p>
            </div>
            <div className="p-6">
              <ProjectedVsRealizedChart />
            </div>
          </div>

          {/* Benchmarks Panel */}
          <div className="retina-card card-web3-hover">
            <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-steel-900 mb-1">Performance Benchmarks</h3>
              <p className="text-sm text-steel-600">Industry comparisons and targets</p>
            </div>
            <div className="p-6">
              <BenchmarksPanel />
            </div>
          </div>
        </div>

        {/* #5: Revenue by Facility */}
        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-1">Revenue by Facility</h3>
            <p className="text-sm text-steel-600">Facility-level performance and opportunities</p>
          </div>
          <div className="p-6">
            <OpportunityHeatmap data={[
              { site_id: 'Main Campus', opp_revenue: 45000, rank: 1 },
              { site_id: 'North Clinic', opp_revenue: 36000, rank: 2 },
              { site_id: 'South Campus', opp_revenue: 54000, rank: 1 },
              { site_id: 'East Clinic', opp_revenue: 27000, rank: 3 }
            ]} />
          </div>
        </div>

        {/* #6: Geographic Heat Map */}
        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-1">Geographic Distribution</h3>
            <p className="text-sm text-steel-600">Patient population by region</p>
          </div>
          <div className="p-6">
            <GeographicHeatMap />
          </div>
        </div>

        {/* #7: DRG Information - Immediate Opportunities and Financial Performance */}
        <DRGOptimizationAlert 
          opportunities={heartFailureConfig.drgOpportunities}
          title={`${heartFailureConfig.moduleName} Immediate Revenue Opportunities`}
          maxVisible={3}
          showPatientInfo={true}
        />

        <div className="retina-card card-web3-hover relative z-10 mb-6">
          <div className="px-6 py-4 border-b border-white/30 bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">{heartFailureConfig.drgTitle}</h3>
            <p className="text-sm text-steel-600">{heartFailureConfig.drgDescription}</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {heartFailureConfig.drgPerformanceCards.map((card, index) => (
                <div key={index} className="bg-gradient-to-r from-white/60 to-emerald-50/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-8 h-8 text-medical-green-600" />
                    <div>
                      <div className="font-semibold text-medical-green-900">{card.title}</div>
                      <div className="text-2xl font-bold text-medical-green-800">{card.value}</div>
                    </div>
                  </div>
                  <div className="text-sm text-medical-green-700 mb-2">
                    {card.caseCount}
                  </div>
                  <div className={`text-sm ${card.isPositive ? 'text-medical-green-600' : 'text-medical-red-600'}`}>
                    {card.variance}
                  </div>
                </div>
              ))}
            </div>

            {/* Case Mix Index Performance */}
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg">
              <h4 className="font-semibold text-steel-900 mb-4">{heartFailureConfig.moduleName} Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{heartFailureConfig.drgMetrics.currentCMI}</div>
                  <div className="text-sm text-steel-600">Current CMI</div>
                  <div className="text-xs text-medical-green-600">+0.28 vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-green-700">{heartFailureConfig.drgMetrics.monthlyOpportunity}</div>
                  <div className="text-sm text-steel-600">Monthly Opportunity</div>
                  <div className="text-xs text-steel-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-amber-700">{heartFailureConfig.drgMetrics.documentationRate}</div>
                  <div className="text-sm text-steel-600">Documentation Rate</div>
                  <div className="text-xs text-steel-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">{heartFailureConfig.drgMetrics.avgLOS}</div>
                  <div className="text-sm text-steel-600">Avg LOS</div>
                  <div className="text-xs text-medical-green-600">{heartFailureConfig.drgMetrics.losBenchmark}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExecutiveView;