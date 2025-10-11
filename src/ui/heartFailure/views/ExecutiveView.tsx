import React from 'react';
import ROIWaterfall from '../components/ROIWaterfall';
import OpportunityHeatmap from '../components/OpportunityHeatmap';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';

const ExecutiveView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-slate-600 mt-2">Heart Failure Program Performance & ROI</p>
        </div>
        
        <ROIWaterfall data={{
          gdmt_revenue: 3200000,
          devices_revenue: 8500000,
          phenotypes_revenue: 1800000,
          _340b_revenue: 450000,
          total_revenue: 13950000,
          realized_revenue: 8200000
        }} />
        <BenchmarksPanel />
        <ProjectedVsRealizedChart />
        <OpportunityHeatmap data={[
          { site_id: '15213', opp_revenue: 890000, rank: 1 },
          { site_id: '15232', opp_revenue: 675000, rank: 2 },
          { site_id: '15217', opp_revenue: 598000, rank: 3 },
          { site_id: '15206', opp_revenue: 512000, rank: 4 },
          { site_id: '15224', opp_revenue: 345000, rank: 5 }
        ]} />
      </div>
    </div>
  );
};

export default ExecutiveView;
