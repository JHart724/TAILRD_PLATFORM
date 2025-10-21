import React from 'react';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import ExecutiveKPICard from '../components/executive/ExecutiveKPICard';
import FinancialROIWaterfall from '../components/executive/FinancialROIWaterfall';
import GeographicHeatMap from '../components/executive/GeographicHeatMap';
import ROIWaterfall from '../components/ROIWaterfall';
import BenchmarksPanel from '../components/BenchmarksPanel';
import ProjectedVsRealizedChart from '../components/ProjectedVsRealizedChart';
import OpportunityHeatmap from '../components/OpportunityHeatmap';
import DRGOptimizationAlert from '../../../components/shared/DRGOptimizationAlert';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';

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

  // Heart Failure DRG 291-293 Optimization Opportunities
  const hfDRGOpportunities: DRGOpportunity[] = [
    {
      currentDRG: '293',
      currentDRGDescription: 'Heart Failure & Shock w/o CC/MCC',
      potentialDRG: '291',
      potentialDRGDescription: 'Heart Failure & Shock w MCC',
      revenueImpact: 8420,
      documentationNeeded: ['Acute kidney injury documentation', 'Malnutrition severity', 'Respiratory failure'],
      confidence: 92,
      timeframe: '3 days',
      priority: 'high',
      patientName: 'Johnson, Mary',
      mrn: 'MRN-HF-15892'
    },
    {
      currentDRG: '292',
      currentDRGDescription: 'Heart Failure & Shock w CC',
      potentialDRG: '291',
      potentialDRGDescription: 'Heart Failure & Shock w MCC',
      revenueImpact: 6180,
      documentationNeeded: ['Chronic kidney disease stage', 'Diabetes complications', 'COPD exacerbation'],
      confidence: 85,
      timeframe: '2 days',
      priority: 'high',
      patientName: 'Chen, Robert',
      mrn: 'MRN-HF-15743'
    },
    {
      currentDRG: '293',
      currentDRGDescription: 'Heart Failure & Shock w/o CC/MCC',
      potentialDRG: '292',
      potentialDRGDescription: 'Heart Failure & Shock w CC',
      revenueImpact: 4250,
      documentationNeeded: ['Hypertensive heart disease', 'Diabetes documentation', 'CAD complexity'],
      confidence: 78,
      timeframe: '5 days',
      priority: 'medium',
      patientName: 'Rodriguez, Anna',
      mrn: 'MRN-HF-15621'
    },
    {
      currentDRG: '293',
      currentDRGDescription: 'Heart Failure & Shock w/o CC/MCC',
      potentialDRG: '291',
      potentialDRGDescription: 'Heart Failure & Shock w MCC',
      revenueImpact: 7890,
      documentationNeeded: ['Acute on chronic kidney disease', 'Electrolyte imbalance severity', 'Anemia documentation'],
      confidence: 88,
      timeframe: '1 day',
      priority: 'high',
      patientName: 'Williams, David',
      mrn: 'MRN-HF-16012'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-steel-900 mb-2 font-sf">
            Executive Dashboard
          </h1>
          <p className="text-lg text-steel-600">
            Financial performance and population health insights for HF service line • DRG 291-293 Analytics
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

        {/* DRG 291-293 Optimization Opportunities */}
        <DRGOptimizationAlert 
          opportunities={hfDRGOpportunities}
          title="Heart Failure DRG Optimization (291-293)"
          maxVisible={3}
          showPatientInfo={true}
        />

        {/* Financial ROI Waterfall - New Enhanced Component */}
        <FinancialROIWaterfall />

        {/* Geographic Heat Map - New Component */}
        <GeographicHeatMap />

        {/* DRG Financial Performance Analytics */}
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-green-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Heart Failure DRG Financial Performance</h3>
            <p className="text-sm text-steel-600">DRG 291-293 revenue analysis and case mix optimization</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* DRG 291 Performance */}
              <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-lg p-4 border border-medical-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-green-600" />
                  <div>
                    <div className="font-semibold text-medical-green-900">DRG 291 (w MCC)</div>
                    <div className="text-2xl font-bold text-medical-green-800">$47,250</div>
                  </div>
                </div>
                <div className="text-sm text-medical-green-700 mb-2">
                  Average reimbursement • 156 cases YTD
                </div>
                <div className="text-sm text-medical-green-600">
                  +$8.2K above national average
                </div>
              </div>

              {/* DRG 292 Performance */}
              <div className="bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-lg p-4 border border-medical-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-amber-600" />
                  <div>
                    <div className="font-semibold text-medical-amber-900">DRG 292 (w CC)</div>
                    <div className="text-2xl font-bold text-medical-amber-800">$32,180</div>
                  </div>
                </div>
                <div className="text-sm text-medical-amber-700 mb-2">
                  Average reimbursement • 342 cases YTD
                </div>
                <div className="text-sm text-medical-amber-600">
                  +$2.1K above national average
                </div>
              </div>

              {/* DRG 293 Performance */}
              <div className="bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg p-4 border border-medical-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-blue-600" />
                  <div>
                    <div className="font-semibold text-medical-blue-900">DRG 293 (w/o CC/MCC)</div>
                    <div className="text-2xl font-bold text-medical-blue-800">$18,420</div>
                  </div>
                </div>
                <div className="text-sm text-medical-blue-700 mb-2">
                  Average reimbursement • 249 cases YTD
                </div>
                <div className="text-sm text-medical-blue-600">
                  -$1.8K below national average
                </div>
              </div>
            </div>

            {/* Case Mix Index Performance */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-steel-900 mb-4">Heart Failure Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">1.68</div>
                  <div className="text-sm text-steel-600">Current CMI</div>
                  <div className="text-xs text-medical-green-600">+0.12 vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-green-700">+$127K</div>
                  <div className="text-sm text-steel-600">Monthly Opportunity</div>
                  <div className="text-xs text-steel-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-amber-700">87.2%</div>
                  <div className="text-sm text-steel-600">Documentation Rate</div>
                  <div className="text-xs text-steel-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">4.2 days</div>
                  <div className="text-sm text-steel-600">Avg LOS</div>
                  <div className="text-xs text-medical-green-600">-0.8 days vs benchmark</div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
