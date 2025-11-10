import React from 'react';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import KPICard from '../../../components/shared/KPICard';
import { DRGOpportunity } from '../../../components/shared/DRGOptimizationAlert';
import DRGOptimizationAlert from '../../../components/shared/DRGOptimizationAlert';

const RCExecutiveView: React.FC = () => {
  // Mock data - will be replaced with real API calls
  const kpiData = {
    totalOpportunity: '$78.5M',
    totalOpportunitySub: 'Annual revenue potential',
    totalPatients: '12,456',
    totalPatientsSub: 'Revenue cycle patients',
    gdmtOptimization: '84%',
    gdmtOptimizationSub: 'Claims accuracy rate',
    avgRoi: '$6,300',
    avgRoiSub: 'Per patient annually',
  };

  // Revenue Cycle DRG Optimization Opportunities
  const revenueCycleDRGOpportunities: DRGOpportunity[] = [
    {
      currentDRG: '470',
      currentDRGDescription: 'Major Joint Replacement or Reattachment of Lower Extremity w/o MCC',
      potentialDRG: '469',
      potentialDRGDescription: 'Major Joint Replacement or Reattachment of Lower Extremity w CC or MCC',
      revenueImpact: 8950,
      documentationNeeded: ['Diabetes complications', 'Obesity documentation', 'Post-operative complications'],
      confidence: 91,
      timeframe: '2 days',
      priority: 'high',
      patientName: 'Smith, Elizabeth',
      mrn: 'MRN-RC-30156'
    },
    {
      currentDRG: '194',
      currentDRGDescription: 'Simple Pneumonia & Pleurisy w/o CC/MCC',
      potentialDRG: '193',
      potentialDRGDescription: 'Simple Pneumonia & Pleurisy w CC',
      revenueImpact: 5240,
      documentationNeeded: ['COPD exacerbation', 'Heart failure documentation', 'Sepsis criteria'],
      confidence: 88,
      timeframe: '1 day',
      priority: 'high',
      patientName: 'Johnson, Michael',
      mrn: 'MRN-RC-30089'
    },
    {
      currentDRG: '690',
      currentDRGDescription: 'Kidney & Urinary Tract Infections w/o MCC',
      potentialDRG: '689',
      potentialDRGDescription: 'Kidney & Urinary Tract Infections w MCC',
      revenueImpact: 6780,
      documentationNeeded: ['Acute kidney injury', 'Diabetes complications', 'Severe sepsis'],
      confidence: 85,
      timeframe: '3 days',
      priority: 'high',
      patientName: 'Williams, Patricia',
      mrn: 'MRN-RC-30234'
    },
    {
      currentDRG: '871',
      currentDRGDescription: 'Septicemia or Severe Sepsis w/o MV >96 Hours w/o MCC',
      potentialDRG: '870',
      potentialDRGDescription: 'Septicemia or Severe Sepsis w/o MV >96 Hours w MCC',
      revenueImpact: 12400,
      documentationNeeded: ['Organ dysfunction', 'Shock documentation', 'ICU level of care'],
      confidence: 93,
      timeframe: '1 day',
      priority: 'high',
      patientName: 'Davis, Robert',
      mrn: 'MRN-RC-30178'
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
            Financial performance and DRG optimization insights for Revenue Cycle • Claims Analytics • CDI Intelligence
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-4 gap-6">
          <KPICard
            label="Total Revenue Opportunity"
            value={kpiData.totalOpportunity}
            subvalue={kpiData.totalOpportunitySub}
            status="optimal"
            icon={DollarSign}
            trend={{
              direction: 'up',
              value: '+16%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Patient Population"
            value={kpiData.totalPatients}
            subvalue={kpiData.totalPatientsSub}
            icon={Users}
            trend={{
              direction: 'up',
              value: '+4%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Claims Accuracy"
            value={kpiData.gdmtOptimization}
            subvalue={kpiData.gdmtOptimizationSub}
            status="optimal"
            icon={Target}
            trend={{
              direction: 'up',
              value: '+7%',
              label: 'vs last quarter',
            }}
          />
          
          <KPICard
            label="Avg Revenue per Patient"
            value={kpiData.avgRoi}
            subvalue={kpiData.avgRoiSub}
            status="optimal"
            icon={TrendingUp}
            trend={{
              direction: 'up',
              value: '+13%',
              label: 'vs last quarter',
            }}
          />
        </div>

        {/* Revenue Cycle DRG Financial Performance Analytics */}
        <div className="retina-card">
          <div className="px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-50/80 to-medical-green-50/40">
            <h3 className="text-lg font-semibold text-steel-900 mb-2">Revenue Cycle DRG Financial Performance</h3>
            <p className="text-sm text-steel-600">Top DRG revenue analysis and case mix optimization</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* High-Impact DRGs Performance */}
              <div className="bg-gradient-to-r from-medical-green-50 to-medical-green-100 rounded-lg p-4 border border-medical-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-green-600" />
                  <div>
                    <div className="font-semibold text-medical-green-900">High-Impact DRGs</div>
                    <div className="text-2xl font-bold text-medical-green-800">$68,420</div>
                  </div>
                </div>
                <div className="text-sm text-medical-green-700 mb-2">
                  Average reimbursement • 2,834 cases YTD
                </div>
                <div className="text-sm text-medical-green-600">
                  +$14.2K above national average
                </div>
              </div>

              {/* Medium-Impact DRGs Performance */}
              <div className="bg-gradient-to-r from-medical-amber-50 to-medical-amber-100 rounded-lg p-4 border border-medical-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-amber-600" />
                  <div>
                    <div className="font-semibold text-medical-amber-900">Medium-Impact DRGs</div>
                    <div className="text-2xl font-bold text-medical-amber-800">$38,190</div>
                  </div>
                </div>
                <div className="text-sm text-medical-amber-700 mb-2">
                  Average reimbursement • 4,567 cases YTD
                </div>
                <div className="text-sm text-medical-amber-600">
                  +$6.8K above national average
                </div>
              </div>

              {/* Low-Impact DRGs Performance */}
              <div className="bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 rounded-lg p-4 border border-medical-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-8 h-8 text-medical-blue-600" />
                  <div>
                    <div className="font-semibold text-medical-blue-900">Low-Impact DRGs</div>
                    <div className="text-2xl font-bold text-medical-blue-800">$18,640</div>
                  </div>
                </div>
                <div className="text-sm text-medical-blue-700 mb-2">
                  Average reimbursement • 5,055 cases YTD
                </div>
                <div className="text-sm text-medical-blue-600">
                  -$2.4K below national average
                </div>
              </div>
            </div>

            {/* Case Mix Index Performance */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-steel-900 mb-4">Revenue Cycle Case Mix Index (CMI) Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">1.89</div>
                  <div className="text-sm text-steel-600">Current CMI</div>
                  <div className="text-xs text-medical-green-600">+0.15 vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-green-700">+$654K</div>
                  <div className="text-sm text-steel-600">Monthly Opportunity</div>
                  <div className="text-xs text-steel-500">From DRG optimization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-amber-700">89.7%</div>
                  <div className="text-sm text-steel-600">Documentation Rate</div>
                  <div className="text-xs text-steel-500">CC/MCC capture</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-steel-900">4.6 days</div>
                  <div className="text-sm text-steel-600">Avg LOS</div>
                  <div className="text-xs text-medical-green-600">-0.4 days vs benchmark</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DRG Optimization Opportunities */}
        <DRGOptimizationAlert 
          opportunities={revenueCycleDRGOpportunities}
          title="Revenue Cycle DRG Optimization Opportunities (Multi-Service)"
          maxVisible={3}
          showPatientInfo={true}
        />
      </div>
    </div>
  );
};

export default RCExecutiveView;