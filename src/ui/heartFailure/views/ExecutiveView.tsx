import React from 'react';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import ExecutiveKPICard from '../components/executive/ExecutiveKPICard';
import FinancialROIWaterfall from '../components/executive/FinancialROIWaterfall';
import GeographicHeatMap from '../components/executive/GeographicHeatMap';
import ROIWaterfall from '../components/ROIWaterfall';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';
import OpportunityHeatmap from '../components/OpportunityHeatmap';

const ExecutiveView: React.FC = () => {
  // Mock data - will be replaced with real API calls
  const kpiData = {
    totalOpportunity: '$34.4M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '1,247',
    totalPatientsSub: 'Heart failure patients',
    gdmtOptimization: '38%',
    gdmtOptimizationSub: 'At quadruple therapy',
    avgRoi: '$27,600',
    avgRoiSub: 'Per patient annually',
  };

  return (
    <div className="min-h-screen bg-liquid-executive liquid-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-steel-900 mb-2 font-sf">
            Executive Dashboard
          </h1>
          <p className="text-lg text-steel-600">
            Financial performance and population health insights for HF service line
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-4 gap-6">
          <ExecutiveKPICard
            label="Total Revenue Opportunity"
            value={kpiData.totalOpportunity}
            subvalue={kpiData.totalOpportunitySub}
            status="optimal"
            icon={DollarSign}
            trend={{
              direction: 'up',
              value: '+12%',
              label: 'vs last quarter',
            }}
          />
          
          <ExecutiveKPICard
            label="Patient Population"
            value={kpiData.totalPatients}
            subvalue={kpiData.totalPatientsSub}
            icon={Users}
            trend={{
              direction: 'up',
              value: '+3%',
              label: 'vs last quarter',
            }}
          />
          
          <ExecutiveKPICard
            label="GDMT Optimization"
            value={kpiData.gdmtOptimization}
            subvalue={kpiData.gdmtOptimizationSub}
            status="warning"
            icon={Target}
            trend={{
              direction: 'up',
              value: '+5%',
              label: 'vs last quarter',
            }}
          />
          
          <ExecutiveKPICard
            label="Avg Revenue per Patient"
            value={kpiData.avgRoi}
            subvalue={kpiData.avgRoiSub}
            status="optimal"
            icon={TrendingUp}
            trend={{
              direction: 'up',
              value: '+8%',
              label: 'vs last quarter',
            }}
          />
        </div>

        {/* Financial ROI Waterfall - New Enhanced Component */}
        <FinancialROIWaterfall />

        {/* Geographic Heat Map - New Component */}
        <GeographicHeatMap />

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* National Benchmarks */}
          <BenchmarksPanel />

          {/* Projected vs Realized */}
          <ProjectedVsRealizedChart />
        </div>

        {/* Opportunity Heatmap */}
        <OpportunityHeatmap data={[
          { site_id: '15213', opp_revenue: 890000, rank: 1 },
          { site_id: '15232', opp_revenue: 675000, rank: 2 },
          { site_id: '15217', opp_revenue: 598000, rank: 3 },
          { site_id: '15206', opp_revenue: 512000, rank: 4 },
          { site_id: '15224', opp_revenue: 345000, rank: 5 }
        ]} />

        {/* Legacy ROI Waterfall (keep for now) */}
        <ROIWaterfall data={{
          gdmt_revenue: 3200000,
          devices_revenue: 8500000,
          phenotypes_revenue: 1800000,
          _340b_revenue: 450000,
          total_revenue: 13950000,
          realized_revenue: 8200000
        }} />
      </div>
    </div>
  );
};

export default ExecutiveView;
